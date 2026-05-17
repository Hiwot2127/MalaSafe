from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from uuid import UUID


class UploadError(BaseModel):
    """Schema for upload validation error."""
    row: Optional[int] = None
    column: Optional[str] = None
    value: Optional[str] = None
    error: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "row": 5,
                "column": "cases",
                "value": "-10",
                "error": "Value must be >= 0"
            }
        }


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
                "monthly_close_mode": "close"
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
