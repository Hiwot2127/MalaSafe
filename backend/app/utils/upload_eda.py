"""
Upload EDA utilities for data quality analysis.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from app.schemas.upload_eda import (
    DistributionBucket,
    DistributionData,
    OutlierInfo,
    StatsSummary,
    CompletenessInfo,
)


def _jsonable(v: Any) -> Any:
    """Convert a pandas/NumPy cell to a JSON-safe scalar for `row_data` payloads."""
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    # Coerce numpy scalars to Python natives.
    if hasattr(v, "item"):
        try:
            return v.item()
        except (ValueError, TypeError):
            pass
    return v if isinstance(v, (str, int, float, bool)) else str(v)


def calculate_statistics(df: pd.DataFrame) -> StatsSummary:
    """
    Calculate summary statistics for uploaded malaria data.
    
    Args:
        df: Validated dataframe with malaria data
        
    Returns:
        StatsSummary with comprehensive statistics
    """
    # Basic counts
    total_rows = len(df)
    
    # District info
    if 'district_code' in df.columns:
        unique_districts = df['district_code'].nunique()
        districts_list = sorted(df['district_code'].unique().tolist())
    else:
        unique_districts = 0
        districts_list = []
    
    # Date range (from Eth_Month_Year if available)
    unique_periods = df['Eth_Month_Year'].nunique() if 'Eth_Month_Year' in df.columns else 0
    
    # Cases statistics
    total_positive = int(df['Positive'].sum())
    avg_positive = float(df['Positive'].mean())
    median_positive = float(df['Positive'].median())
    min_positive = int(df['Positive'].min())
    max_positive = int(df['Positive'].max())
    std_positive = float(df['Positive'].std())
    
    # Tests statistics
    total_tests = int(df['Tests'].sum())
    avg_tests = float(df['Tests'].mean())
    median_tests = float(df['Tests'].median())
    
    # Test positivity rate
    test_positivity_rate = (total_positive / total_tests * 100) if total_tests > 0 else 0.0
    
    # Travel statistics (optional column)
    if 'Travel' in df.columns:
        travel_series = pd.to_numeric(df['Travel'], errors='coerce')
        total_travel = int(travel_series.sum())
        avg_travel = float(travel_series.mean())
        travel_completeness = float((~travel_series.isna()).sum() / len(df) * 100)
    else:
        total_travel = None
        avg_travel = None
        travel_completeness = None
    
    return StatsSummary(
        total_rows=total_rows,
        valid_rows=total_rows,  # This will be updated by caller if needed
        invalid_rows=0,  # This will be updated by caller if needed
        unique_periods=unique_periods,
        unique_districts=unique_districts,
        districts_list=districts_list,
        missing_districts=[],  # Will be filled by caller comparing with DB
        total_positive=total_positive,
        avg_positive=avg_positive,
        median_positive=median_positive,
        min_positive=min_positive,
        max_positive=max_positive,
        std_positive=std_positive,
        total_tests=total_tests,
        avg_tests=avg_tests,
        median_tests=median_tests,
        test_positivity_rate=test_positivity_rate,
        total_travel=total_travel,
        avg_travel=avg_travel,
        travel_completeness=travel_completeness,
    )


def create_distribution(df: pd.DataFrame, column: str, bins: int = 10) -> DistributionData:
    """
    Create histogram distribution for a numeric column.
    
    Args:
        df: Dataframe
        column: Column name
        bins: Number of histogram bins
        
    Returns:
        DistributionData with buckets
    """
    if column not in df.columns:
        return DistributionData(
            column_name=column,
            buckets=[],
            total_values=0
        )
    
    values = pd.to_numeric(df[column], errors='coerce').dropna()
    
    if len(values) == 0:
        return DistributionData(
            column_name=column,
            buckets=[],
            total_values=0
        )
    
    # Create histogram
    counts, bin_edges = np.histogram(values, bins=bins)
    
    # Build buckets
    buckets = []
    total = len(values)
    
    for i in range(len(counts)):
        bucket = DistributionBucket(
            min_value=float(bin_edges[i]),
            max_value=float(bin_edges[i + 1]),
            count=int(counts[i]),
            percentage=float(counts[i] / total * 100) if total > 0 else 0.0
        )
        buckets.append(bucket)
    
    return DistributionData(
        column_name=column,
        buckets=buckets,
        total_values=total
    )


def detect_outliers(
    df: pd.DataFrame, 
    columns: List[str], 
    z_threshold: float = 3.0
) -> List[OutlierInfo]:
    """
    Detect outliers using Z-score method.
    
    Args:
        df: Dataframe
        columns: Columns to check for outliers
        z_threshold: Z-score threshold (default: 3.0 = 3 standard deviations)
        
    Returns:
        List of outlier information
    """
    outliers = []
    
    for column in columns:
        if column not in df.columns:
            continue
        
        values = pd.to_numeric(df[column], errors='coerce')
        
        # Calculate mean and std dev
        mean = values.mean()
        std = values.std()
        
        if std == 0:  # No variation
            continue
        
        # Calculate Z-scores
        z_scores = np.abs((values - mean) / std)
        
        # Find outliers
        outlier_mask = z_scores > z_threshold
        outlier_indices = df[outlier_mask].index.tolist()
        
        for idx in outlier_indices[:20]:  # Limit to first 20 outliers per column
            value = float(values.iloc[idx])
            z_score = float(z_scores.iloc[idx])
            
            # Get row context
            context = {}
            if 'district_code' in df.columns:
                context['district_code'] = str(df.loc[idx, 'district_code'])
            if 'Eth_Month_Year' in df.columns:
                context['period'] = str(df.loc[idx, 'Eth_Month_Year'])
            
            # Create reason message
            if value > mean:
                reason = f"{value:.0f} is {z_score:.1f} SD above mean ({mean:.1f})"
            else:
                reason = f"{value:.0f} is {z_score:.1f} SD below mean ({mean:.1f})"
            
            outlier = OutlierInfo(
                row_number=int(idx) + 2,  # +2 because: 0-indexed + header row
                column=column,
                value=value,
                mean=float(mean),
                std_dev=float(std),
                z_score=z_score,
                reason=reason,
                context=context
            )
            outliers.append(outlier)
    
    # Sort by Z-score (most extreme first)
    outliers.sort(key=lambda x: abs(x.z_score), reverse=True)
    
    return outliers[:10]  # Return top 10 most extreme outliers


def check_completeness(df: pd.DataFrame, columns: Dict[str, Any]) -> List[CompletenessInfo]:
    """
    Check data completeness for specified columns.
    
    Args:
        df: Dataframe
        columns: Dict mapping column names to default values
        
    Returns:
        List of completeness information
    """
    completeness_list = []
    total_rows = len(df)
    
    for column, default_value in columns.items():
        if column not in df.columns:
            continue
        
        non_empty = df[column].notna().sum()
        completeness_pct = (non_empty / total_rows * 100) if total_rows > 0 else 0.0
        
        info = CompletenessInfo(
            column=column,
            total_rows=total_rows,
            non_empty_rows=int(non_empty),
            completeness_pct=float(completeness_pct),
            missing_will_default=default_value is not None,
            default_value=default_value
        )
        completeness_list.append(info)
    
    return completeness_list


def detect_data_quality_issues(df: pd.DataFrame) -> List[OutlierInfo]:
    """
    Detect data quality issues beyond statistical outliers.
    
    Args:
        df: Dataframe
        
    Returns:
        List of data quality issues as OutlierInfo
    """
    issues = []
    
    # Check for tests = 0 but positive > 0
    if 'Tests' in df.columns and 'Positive' in df.columns:
        zero_tests_mask = (df['Tests'] == 0) & (df['Positive'] > 0)
        for idx in df[zero_tests_mask].index[:5]:  # First 5 issues
            issue = OutlierInfo(
                row_number=int(idx) + 2,
                column='Tests',
                value=0.0,
                mean=0.0,
                std_dev=0.0,
                z_score=0.0,
                reason=f"0 tests but {int(df.loc[idx, 'Positive'])} positive cases (data entry error?)",
                context={
                    'positive': int(df.loc[idx, 'Positive']),
                    'district_code': str(df.loc[idx, 'district_code']) if 'district_code' in df.columns else None
                }
            )
            issues.append(issue)
    
    # Check for positive > tests (impossible)
    if 'Tests' in df.columns and 'Positive' in df.columns:
        impossible_mask = df['Positive'] > df['Tests']
        for idx in df[impossible_mask].index[:5]:
            issue = OutlierInfo(
                row_number=int(idx) + 2,
                column='Positive',
                value=float(df.loc[idx, 'Positive']),
                mean=0.0,
                std_dev=0.0,
                z_score=0.0,
                reason=f"Positive ({int(df.loc[idx, 'Positive'])}) exceeds Tests ({int(df.loc[idx, 'Tests'])}) - impossible",
                context={
                    'positive': int(df.loc[idx, 'Positive']),
                    'tests': int(df.loc[idx, 'Tests'])
                }
            )
            issues.append(issue)
    
    return issues
