"""
Schemas for upload EDA (Exploratory Data Analysis).
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class DistributionBucket(BaseModel):
    """Single bucket in a histogram distribution."""
    min_value: float
    max_value: float
    count: int
    percentage: float


class DistributionData(BaseModel):
    """Distribution data for a numeric column."""
    column_name: str
    buckets: List[DistributionBucket]
    total_values: int


class OutlierInfo(BaseModel):
    """Information about a detected outlier."""
    row_number: int
    column: str
    value: float
    mean: float
    std_dev: float
    z_score: float
    reason: str
    context: Optional[Dict[str, Any]] = None  # Additional row context


class StatsSummary(BaseModel):
    """Summary statistics for uploaded data."""
    total_rows: int
    valid_rows: int
    invalid_rows: int
    
    # Date range
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    unique_periods: int = 0
    
    # District coverage
    unique_districts: int
    districts_list: List[str]
    missing_districts: List[str] = []
    
    # Cases statistics
    total_positive: int
    avg_positive: float
    median_positive: float
    min_positive: int
    max_positive: int
    std_positive: float
    
    # Tests statistics
    total_tests: int
    avg_tests: float
    median_tests: float
    test_positivity_rate: float
    
    # Travel statistics (optional)
    total_travel: Optional[int] = None
    avg_travel: Optional[float] = None
    travel_completeness: Optional[float] = None  # % of rows with travel data


class CompletenessInfo(BaseModel):
    """Data completeness information."""
    column: str
    total_rows: int
    non_empty_rows: int
    completeness_pct: float
    missing_will_default: bool = False
    default_value: Optional[Any] = None


class HistoricalComparison(BaseModel):
    """Comparison with historical data."""
    current_total_cases: int
    previous_total_cases: Optional[int] = None
    change_absolute: Optional[int] = None
    change_percent: Optional[float] = None
    comparison_period: Optional[str] = None
    status: str  # "within_range", "above_average", "below_average", "no_comparison"
    message: str


class UploadEDAResponse(BaseModel):
    """Enhanced upload preview with EDA insights."""
    # Existing preview data
    summary: Dict[str, Any]  # From UploadPreviewSummary
    sample_valid: List[Dict[str, Any]]
    invalid: List[Dict[str, Any]]
    duplicates: List[Dict[str, Any]]
    
    # New EDA data
    stats: StatsSummary
    distributions: List[DistributionData]
    outliers: List[OutlierInfo]
    completeness: List[CompletenessInfo]
    historical_comparison: HistoricalComparison
