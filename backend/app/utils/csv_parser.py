"""
CSV parsing utilities for malaria and climate data uploads.
"""

import pandas as pd
from typing import Dict, List, Tuple, Optional
from io import StringIO
import re

from app.utils.eth_calendar import eth_month_year_to_gregorian


class CSVParser:
    """Base CSV parser with common validation methods."""
    
    @staticmethod
    def read_csv_file(file_content: bytes) -> pd.DataFrame:
        """
        Read CSV file content into pandas DataFrame.
        
        Args:
            file_content: Raw bytes from uploaded file
            
        Returns:
            pandas DataFrame
            
        Raises:
            ValueError: If file cannot be parsed
        """
        try:
            # Try UTF-8 first
            content = file_content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                # Fallback to latin-1
                content = file_content.decode('latin-1')
            except Exception as e:
                raise ValueError(f"Unable to decode file: {str(e)}")
        
        try:
            df = pd.read_csv(StringIO(content))
            return df
        except Exception as e:
            raise ValueError(f"Unable to parse CSV file: {str(e)}")
    
    @staticmethod
    def validate_required_columns(df: pd.DataFrame, required_columns: List[str]) -> List[str]:
        """
        Validate that all required columns are present.
        
        Args:
            df: DataFrame to validate
            required_columns: List of required column names
            
        Returns:
            List of missing columns (empty if all present)
        """
        df_columns = [col.strip().lower() for col in df.columns]
        required_lower = [col.strip().lower() for col in required_columns]
        
        missing = [col for col in required_lower if col not in df_columns]
        return missing
    
    @staticmethod
    def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize column names (lowercase, strip whitespace).
        
        Args:
            df: DataFrame to normalize
            
        Returns:
            DataFrame with normalized column names
        """
        df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
        return df
    
    @staticmethod
    def validate_numeric_column(df: pd.DataFrame, column: str, min_value: Optional[float] = None, 
                                max_value: Optional[float] = None) -> List[Dict]:
        """
        Validate numeric column values.
        
        Args:
            df: DataFrame to validate
            column: Column name to validate
            min_value: Minimum allowed value (optional)
            max_value: Maximum allowed value (optional)
            
        Returns:
            List of validation errors
        """
        errors = []
        
        for idx, value in df[column].items():
            row_num = idx + 2  # +2 because pandas is 0-indexed and CSV has header
            
            # Check if value is numeric
            try:
                numeric_value = float(value)
            except (ValueError, TypeError):
                errors.append({
                    "row": row_num,
                    "column": column,
                    "value": str(value),
                    "error": f"Value must be numeric"
                })
                continue
            
            # Check min value
            if min_value is not None and numeric_value < min_value:
                errors.append({
                    "row": row_num,
                    "column": column,
                    "value": str(value),
                    "error": f"Value must be >= {min_value}"
                })
            
            # Check max value
            if max_value is not None and numeric_value > max_value:
                errors.append({
                    "row": row_num,
                    "column": column,
                    "value": str(value),
                    "error": f"Value must be <= {max_value}"
                })
        
        return errors
    
    @staticmethod
    def validate_required_values(df: pd.DataFrame, columns: List[str]) -> List[Dict]:
        """
        Validate that required columns have no empty values.
        
        Args:
            df: DataFrame to validate
            columns: List of column names to check
            
        Returns:
            List of validation errors
        """
        errors = []
        
        for column in columns:
            if column not in df.columns:
                continue
            
            null_rows = df[df[column].isna() | (df[column] == '')]
            
            for idx in null_rows.index:
                row_num = idx + 2
                errors.append({
                    "row": row_num,
                    "column": column,
                    "value": "empty",
                    "error": f"Required field cannot be empty"
                })
        
        return errors
    
    @staticmethod
    def remove_empty_rows(df: pd.DataFrame) -> pd.DataFrame:
        """
        Remove rows where all values are empty.
        
        Args:
            df: DataFrame to clean
            
        Returns:
            Cleaned DataFrame
        """
        return df.dropna(how='all')


class MalariaCSVParser(CSVParser):
    """Parser for malaria data CSV files. Monthly-only - weekly was removed."""

    # New schema: monthly rows keyed by either DHIS2 org unit OR district code.
    REQUIRED_COLUMNS_MONTHLY = ['eth_month_year', 'positive', 'tests']
    OPTIONAL_COLUMNS_MONTHLY = ['travel']  # Optional, defaults to 0 when absent/blank.
    IDENTIFIER_COLUMNS = ['organisationunitid', 'district_code']

    @classmethod
    def parse_monthly_data(cls, file_content: bytes) -> Tuple[Optional[pd.DataFrame], List[Dict], List[Dict]]:
        """
        Parse monthly malaria data CSV (new schema).

        Required columns: `Eth_Month_Year`, `Positive`, `Tests`, plus at least one
        identifier column: `organisationunitid` or `district_code`.
        Optional column: `Travel` (defaults to 0). All other columns are ignored.

        Returns:
            Tuple of (DataFrame, file_errors, row_errors).

            On success the DataFrame has columns: `organisationunitid`,
            `district_code`, `month`, `year`, `positive`, `tests`, `travel`.
            The original facility-row
            grain is preserved — aggregation to woreda-month happens later in
            `upload_service`.

            - file_errors: file-level problems that reject the whole upload
              (unparseable CSV, empty file, missing required columns).
            - row_errors: per-row problems. Those rows should be skipped but
              the rest of the file still imports.
        """
        row_errors: List[Dict] = []

        try:
            df = cls.read_csv_file(file_content)
        except ValueError as e:
            return None, [{"error": str(e)}], []

        df = cls.remove_empty_rows(df)
        if df.empty:
            return None, [{"error": "CSV file is empty"}], []

        df = cls.normalize_column_names(df)

        missing_columns = cls.validate_required_columns(df, cls.REQUIRED_COLUMNS_MONTHLY)
        if missing_columns:
            return None, [{"error": f"Missing required columns: {', '.join(missing_columns)}"}], []

        if not any(col in df.columns for col in cls.IDENTIFIER_COLUMNS):
            return None, [{
                "error": "Missing required identifier column: include organisationunitid or district_code"
            }], []

        required_value_cols = list(cls.REQUIRED_COLUMNS_MONTHLY)
        if 'organisationunitid' in df.columns:
            required_value_cols.append('organisationunitid')
        elif 'district_code' in df.columns:
            required_value_cols.append('district_code')

        row_errors.extend(cls.validate_required_values(df, required_value_cols))
        row_errors.extend(cls.validate_numeric_column(df, 'positive', min_value=0))
        row_errors.extend(cls.validate_numeric_column(df, 'tests', min_value=0))

        has_travel = 'travel' in df.columns
        if has_travel:
            # Numeric check only on non-null travel cells; missing values are
            # legitimate (defaulted to 0 below) and shouldn't surface as errors.
            travel_mask = df['travel'].notna() & (df['travel'].astype(str).str.strip() != '')
            if travel_mask.any():
                row_errors.extend(
                    cls.validate_numeric_column(df.loc[travel_mask], 'travel', min_value=0)
                )

        # Rows already flagged for empty required fields — skip them in the
        # per-row EC conversion so we don't double-report.
        bad_rows = {int(e["row"]) for e in row_errors if "row" in e}

        # Build the parsed output dataframe row-by-row so each EC label gets a
        # clean conversion and bad labels are reported with row/column context.
        parsed_rows: List[Dict] = []
        for idx, row in df.iterrows():
            row_num = idx + 2
            if row_num in bad_rows:
                # Still emit a placeholder so downstream row-index lookups
                # behave; upload_service skips these via the bad_rows set.
                parsed_rows.append({
                    "organisationunitid": str(row.get('organisationunitid', '')).strip(),
                    "district_code": str(row.get('district_code', '')).strip().upper(),
                    "month": None, "year": None,
                    "positive": None, "tests": None, "travel": None,
                })
                continue

            label = row.get('eth_month_year')
            try:
                g_month, g_year = eth_month_year_to_gregorian(label)
            except ValueError as e:
                row_errors.append({
                    "row": row_num,
                    "column": "eth_month_year",
                    "value": "" if label is None else str(label),
                    "error": str(e),
                })
                parsed_rows.append({
                    "organisationunitid": str(row.get('organisationunitid', '')).strip(),
                    "district_code": str(row.get('district_code', '')).strip().upper(),
                    "month": None, "year": None,
                    "positive": None, "tests": None, "travel": None,
                })
                continue

            travel_raw = row.get('travel') if has_travel else 0
            parsed_rows.append({
                "organisationunitid": str(row.get('organisationunitid', '')).strip(),
                "district_code": str(row.get('district_code', '')).strip().upper(),
                "month": g_month,
                "year": g_year,
                "positive": row['positive'],
                "tests": row['tests'],
                "travel": travel_raw if has_travel else 0,
            })

        out = pd.DataFrame(parsed_rows, index=df.index)
        out['positive'] = pd.to_numeric(out['positive'], errors='coerce')
        out['tests'] = pd.to_numeric(out['tests'], errors='coerce')
        out['travel'] = pd.to_numeric(out['travel'], errors='coerce').fillna(0)

        return out, [], row_errors


class ClimateCSVParser(CSVParser):
    """Parser for climate data CSV files."""

    REQUIRED_COLUMNS = ['district_code', 'date', 'rainfall', 'temperature']

    @classmethod
    def parse_climate_data(cls, file_content: bytes) -> Tuple[Optional[pd.DataFrame], List[Dict], List[Dict]]:
        """
        Parse climate data CSV.

        Returns:
            Tuple of (DataFrame, file_errors, row_errors). See
            `MalariaCSVParser.parse_monthly_data` for the two-tier contract.
        """
        row_errors: List[Dict] = []

        try:
            df = cls.read_csv_file(file_content)
        except ValueError as e:
            return None, [{"error": str(e)}], []

        df = cls.remove_empty_rows(df)
        if df.empty:
            return None, [{"error": "CSV file is empty"}], []

        df = cls.normalize_column_names(df)

        missing_columns = cls.validate_required_columns(df, cls.REQUIRED_COLUMNS)
        if missing_columns:
            return None, [{"error": f"Missing required columns: {', '.join(missing_columns)}"}], []

        row_errors.extend(cls.validate_required_values(df, cls.REQUIRED_COLUMNS))
        row_errors.extend(cls.validate_numeric_column(df, 'rainfall', min_value=0))
        row_errors.extend(cls.validate_numeric_column(df, 'temperature', min_value=-50, max_value=60))

        for idx, value in df['date'].items():
            row_num = idx + 2
            try:
                pd.to_datetime(value)
            except Exception:
                row_errors.append({
                    "row": row_num,
                    "column": "date",
                    "value": str(value),
                    "error": "Invalid date format. Use YYYY-MM-DD"
                })

        return df, [], row_errors
