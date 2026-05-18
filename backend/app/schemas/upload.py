from pydantic import BaseModel
from typing import Any, List, Optional, Dict
from datetime import datetime
from uuid import UUID


class UploadError(BaseModel):
    """Schema for upload validation error."""
    row: Optional[int] = None
    column: Optional[str] = None
    value: Optional[str] = None
    error: str
    row_data: Optional[Dict[str, Any]] = None  # Original row payload, for surfacing in the preview modal.

    class Config:
        json_schema_extra = {
            "example": {
                "row": 5,
                "column": "cases",
                "value": "-10",
                "error": "Value must be >= 0"
            }
        }


class StageResult(BaseModel):
    """One step of the upload pipeline (used to drive the frontend timeline)."""
    name: str  # e.g. 'parse', 'validate', 'insert', 'dispatch_close'
    status: str  # 'ok' | 'skipped' | 'failed'
    count: Optional[int] = None  # how many rows the step touched
    duration_ms: Optional[int] = None
    detail: Optional[str] = None  # human-readable note


class UploadResponse(BaseModel):
    """Schema for upload response."""
    success: bool
    message: str
    records_processed: int = 0
    records_created: int = 0
    records_skipped: int = 0
    errors: List[UploadError] = []
    file_id: Optional[UUID] = None
    monthly_close_id: Optional[UUID] = None  # Set when monthly upload dispatches the closing pipeline.
    monthly_close_mode: Optional[str] = None  # 'close' (<=2 months) or 'backfill' (>2 months).
    stages: List[StageResult] = []  # Pipeline timeline; frontend renders as a vertical stepper.

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Successfully uploaded 45 records",
                "records_processed": 50,
                "records_created": 45,
                "records_skipped": 5,
                "errors": [],
                "file_id": "123e4567-e89b-12d3-a456-426614174000",
                "monthly_close_id": "abc12345-e89b-12d3-a456-426614174001",
                "monthly_close_mode": "close",
                "stages": [
                    {"name": "parse", "status": "ok", "count": 50, "duration_ms": 12},
                    {"name": "validate", "status": "ok", "count": 50, "duration_ms": 34, "detail": "45 valid, 5 skipped"},
                    {"name": "insert", "status": "ok", "count": 45, "duration_ms": 210},
                    {"name": "dispatch_close", "status": "ok", "detail": "close mode, 1 month"}
                ]
            }
        }


class UploadPreviewSummary(BaseModel):
    """Roll-up counts shown above the preview tabs."""
    total_rows: int
    valid_rows: int
    skipped_rows: int  # rows rejected by validation
    duplicate_rows: int  # rows that match an existing DB record
    distinct_months: List[str] = []  # ISO YYYY-MM strings (monthly uploads only)
    predicted_mode: Optional[str] = None  # 'close' | 'backfill', based on distinct_months count


class UploadPreviewRow(BaseModel):
    """One parsed row as it will appear in the preview modal."""
    row_number: int  # CSV line number (header = 1, first data row = 2)
    data: Dict[str, Any]  # the raw row as a dict (header -> value)


class UploadPreviewResponse(BaseModel):
    """Dry-run response - no rows are written to the DB."""
    summary: UploadPreviewSummary
    valid_sample: List[UploadPreviewRow] = []  # first ~50 valid rows, for the table preview
    invalid_rows: List[UploadError] = []  # all invalid rows with reasons
    duplicate_rows: List[UploadError] = []  # all duplicate rows
    file_errors: List[UploadError] = []  # file-level problems that block any import

    class Config:
        json_schema_extra = {
            "example": {
                "summary": {
                    "total_rows": 50,
                    "valid_rows": 45,
                    "skipped_rows": 3,
                    "duplicate_rows": 2,
                    "distinct_months": ["2026-03"],
                    "predicted_mode": "close"
                },
                "valid_sample": [],
                "invalid_rows": [],
                "duplicate_rows": [],
                "file_errors": []
            }
        }


class UploadValidationResponse(BaseModel):
    """Schema for upload validation response (before saving)."""
    valid: bool
    message: str
    total_rows: int
    valid_rows: int
    errors: List[UploadError]
    
    class Config:
        json_schema_extra = {
            "example": {
                "valid": False,
                "message": "Found 3 validation errors",
                "total_rows": 50,
                "valid_rows": 47,
                "errors": [
                    {
                        "row": 5,
                        "column": "cases",
                        "value": "-10",
                        "error": "Value must be >= 0"
                    }
                ]
            }
        }
