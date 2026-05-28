"""Pydantic schemas for prediction generation endpoints."""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class FeatureContribution(BaseModel):
    """Individual feature contribution to prediction"""
    feature_name: str
    display_name: str
    value: float
    impact: float  # SHAP value
    impact_percentage: float  # Percentage of total impact
    direction: str  # "positive" or "negative"


class PredictionExplanation(BaseModel):
    """Enhanced prediction explanation with SHAP details"""
    summary: str  # Human-readable summary
    top_factors: List[FeatureContribution]  # Top 5 contributing features
    confidence_level: str  # "high", "medium", "low"
    confidence_score: float
    total_positive_impact: float
    total_negative_impact: float


class GeneratePredictionRequest(BaseModel):
    district_id: UUID
    target_month: date = Field(..., description="First-of-month Gregorian date, e.g. 2025-08-01")

    class Config:
        json_schema_extra = {
            "example": {
                "district_id": "123e4567-e89b-12d3-a456-426614174000",
                "target_month": "2025-08-01",
            }
        }


class PredictionResultResponse(BaseModel):
    id: str
    district_id: str
    district_code: Optional[str] = None
    district_name: Optional[str] = None
    prediction_date: date
    risk_level: str
    prediction_score: float
    confidence_score: float
    prediction_reason: Optional[str]
    explanation: Optional[PredictionExplanation] = None  # Enhanced explanation
    is_warm: bool
    created_at: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "abc123",
                "district_id": "uuid-here",
                "district_code": "ET010101",
                "district_name": "Tahtay Adiyabo",
                "prediction_date": "2025-08-01",
                "risk_level": "high",
                "prediction_score": 412.5,
                "confidence_score": 0.78,
                "prediction_reason": "elevated cases last month; heavy rain 3 months ago; located in Tigray",
                "explanation": {
                    "summary": "High risk predicted due to recent case increases and favorable climate conditions",
                    "top_factors": [
                        {
                            "feature_name": "lag_1_cases",
                            "display_name": "Cases Last Month",
                            "value": 385.0,
                            "impact": 45.2,
                            "impact_percentage": 35.0,
                            "direction": "positive"
                        }
                    ],
                    "confidence_level": "high",
                    "confidence_score": 0.78,
                    "total_positive_impact": 95.5,
                    "total_negative_impact": -12.3
                },
                "is_warm": True,
                "created_at": "2026-05-17T00:00:00Z",
            }
        }


class BatchGenerateRequest(BaseModel):
    target_month: date
    district_ids: Optional[List[UUID]] = Field(default=None,
        description="If omitted, generates for all districts with adm3_pcode set.")
    force: bool = Field(default=False,
        description="If true, overwrite existing predictions for (district, month).")

    class Config:
        json_schema_extra = {
            "example": {"target_month": "2025-08-01", "force": False}
        }


class BatchGenerateResponse(BaseModel):
    queued: bool
    target_month: date
    n_districts: int

    class Config:
        json_schema_extra = {
            "example": {"queued": True, "target_month": "2025-08-01", "n_districts": 1082}
        }
