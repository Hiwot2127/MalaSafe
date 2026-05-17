"""
CSV parsing utilities for malaria and climate data uploads.
"""

import pandas as pd
from typing import Dict, List, Tuple, Optional
from io import StringIO
import re


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
    """Parser for malaria data CSV files."""
    
    REQUIRED_COLUMNS_WEEKLY = ['district_code', 'week', 'year', 'cases', 'deaths']
    REQUIRED_COLUMNS_MONTHLY = ['district_code', 'month', 'year', 'cases', 'deaths']
    OPTIONAL_COLUMNS_MONTHLY = ['tests']  # If present, must be numeric >= 0. Powers the exposure offset; absent = fall back to cases*5 proxy.
    
    @classmethod
    def parse_weekly_data(cls, file_content: bytes) -> Tuple[Optional[pd.DataFrame], List[Dict], List[Dict]]:
        """
        Parse weekly malaria data CSV.

        Returns:
            Tuple of (DataFrame, file_errors, row_errors).

            - file_errors: file-level problems that reject the whole upload
              (unparseable CSV, empty file, missing required columns).
            - row_errors: per-row problems. Those rows should be skipped but
              the rest of the file still imports.
        """
        row_errors: List[Dict] = []

        # Read CSV
        try:
            df = cls.read_csv_file(file_content)
        except ValueError as e:
            return None, [{"error": str(e)}], []

        df = cls.remove_empty_rows(df)
        if df.empty:
            return None, [{"error": "CSV file is empty"}], []

        df = cls.normalize_column_names(df)

        missing_columns = cls.validate_required_columns(df, cls.REQUIRED_COLUMNS_WEEKLY)
        if missing_columns:
            return None, [{"error": f"Missing required columns: {', '.join(missing_columns)}"}], []

        # Per-row validations (don't reject the whole file).
        row_errors.extend(cls.validate_required_values(df, cls.REQUIRED_COLUMNS_WEEKLY))
        row_errors.extend(cls.validate_numeric_column(df, 'week', min_value=1, max_value=53))
        row_errors.extend(cls.validate_numeric_column(df, 'year', min_value=2000, max_value=2100))
        row_errors.extend(cls.validate_numeric_column(df, 'cases', min_value=0))
        row_errors.extend(cls.validate_numeric_column(df, 'deaths', min_value=0))

        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                cases = float(row['cases'])
                deaths = float(row['deaths'])
                if deaths > cases:
                    row_errors.append({
                        "row": row_num,
                        "column": "deaths",
                        "value": str(deaths),
                        "error": f"Deaths ({deaths}) cannot exceed cases ({cases})"
                    })
            except (ValueError, TypeError):
                pass  # already caught by numeric validation

        return df, [], row_errors

    @classmethod
    def parse_monthly_data(cls, file_content: bytes) -> Tuple[Optional[pd.DataFrame], List[Dict], List[Dict]]:
        """
        Parse monthly malaria data CSV.

        Returns:
            Tuple of (DataFrame, file_errors, row_errors). See parse_weekly_data
            for the two-tier error contract.
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

        row_errors.extend(cls.validate_required_values(df, cls.REQUIRED_COLUMNS_MONTHLY))
        row_errors.extend(cls.validate_numeric_column(df, 'month', min_value=1, max_value=12))
        row_errors.extend(cls.validate_numeric_column(df, 'year', min_value=2000, max_value=2100))
        row_errors.extend(cls.validate_numeric_column(df, 'cases', min_value=0))
        row_errors.extend(cls.validate_numeric_column(df, 'deaths', min_value=0))

        # Optional `tests` column — validate only if present.
        if 'tests' in df.columns:
            row_errors.extend(cls.validate_numeric_column(df, 'tests', min_value=0))

        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                cases = float(row['cases'])
                deaths = float(row['deaths'])
                if deaths > cases:
                    row_errors.append({
                        "row": row_num,
                        "column": "deaths",
                        "value": str(deaths),
                        "error": f"Deaths ({deaths}) cannot exceed cases ({cases})"
                    })
            except (ValueError, TypeError):
                pass

        return df, [], row_errors


class ClimateCSVParser(CSVParser):
    """Parser for climate data CSV files."""

    REQUIRED_COLUMNS = ['district_code', 'date', 'rainfall', 'temperature']

    @classmethod
    def parse_climate_data(cls, file_content: bytes) -> Tuple[Optional[pd.DataFrame], List[Dict], List[Dict]]:
        """
        Parse climate data CSV.

        Returns:
            Tuple of (DataFrame, file_errors, row_errors). See
            `MalariaCSVParser.parse_weekly_data` for the two-tier contract.
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
