from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import date


class RiskThresholds(BaseModel):
    """Global percentile cutoffs on the model's predicted case-count
    distribution. Districts are bucketed as low/moderate/high/very_high
    relative to these breakpoints (with per-district overrides applied
    server-side). Exposed on the dashboard so the UI can answer the
    reviewer's "what does ELEVATED mean?" question without hard-coding."""
    p50: float
    p75: float
    p95: float
    notes: Optional[str] = None


class DashboardStats(BaseModel):
    """Dashboard statistics schema."""

    # `model_version` collides with Pydantic v2's `model_*` protected
    # namespace. Disabling the namespace check on this schema keeps the
    # field name aligned with the JSON wire format used by the dashboard
    # client (which already expects `model_version`). The example payload
    # documents the response shape for /docs.
    model_config = {
        "protected_namespaces": (),
        "json_schema_extra": {
            "example": {
                "total_positive": 15420,
                "active_alerts": 12,
                "high_risk_districts": 8,
                "period": "2024-01",
                "period_label": "January 2024",
                "prediction_window_days": 30,
                "methodology": {
                    "total_positive": "Sum of MalariaData.positive for the period, filtered by region if provided.",
                    "active_alerts": "Count of currently-active alerts (any age).",
                    "high_risk_districts": "Distinct districts whose latest prediction in the last N days lands in the HIGH or VERY_HIGH bucket.",
                    "risk_buckets": "Per-district percentile thresholds (p50/p75/p95) on the trained LightGBM model's predicted case-count distribution: low ≤ p50 < moderate ≤ p75 < high ≤ p95 < very_high.",
                },
                "risk_thresholds": {
                    "p50": 38.0,
                    "p75": 208.0,
                    "p95": 1530.25,
                    "notes": "Per-district thresholds override these where the model has enough history.",
                },
                "model_version": "v1.0.0",
                "thresholds_version": "v1.0.0",
            }
        },
    }

    total_positive: int
    active_alerts: int
    high_risk_districts: int
    period: str
    # The next fields exist so the UI can explain *what each KPI counts*
    # without hard-coding magic numbers. The reviewer's complaint on the KPI
    # strip ("what does ELEVATED mean? what window? current or predicted?")
    # is fixed at the API boundary by returning the definitions alongside
    # the numbers.
    period_label: Optional[str] = None
    prediction_window_days: Optional[int] = None
    methodology: Optional[Dict[str, str]] = None
    # Global risk-bucket cutoffs + the model/thresholds package versions that
    # produced the predictions in this dashboard. Lets the UI render
    # "Thresholds v1.0.0" and "p50=38, p75=208, p95=1530" footnotes so the
    # numbers above are auditable.
    risk_thresholds: Optional[RiskThresholds] = None
    model_version: Optional[str] = None
    thresholds_version: Optional[str] = None


class RegionStats(BaseModel):
    """Region-level statistics."""
    region: str
    total_positive: int
    districts_count: int
    high_risk_count: int

    class Config:
        json_schema_extra = {
            "example": {
                "region": "Oromia",
                "total_positive": 5420,
                "districts_count": 15,
                "high_risk_count": 3
            }
        }


class DashboardResponse(BaseModel):
    """Complete dashboard response."""
    summary: DashboardStats
    by_region: List[RegionStats]
    recent_trends: List[Dict]
    
    class Config:
        json_schema_extra = {
            "example": {
                "summary": {
                    "total_positive": 15420,
                    "active_alerts": 12,
                    "high_risk_districts": 8,
                    "period": "2024-01"
                },
                "by_region": [
                    {
                        "region": "Oromia",
                        "total_positive": 5420,
                        "districts_count": 15,
                        "high_risk_count": 3
                    }
                ],
                "recent_trends": []
            }
        }


class TrendDataPoint(BaseModel):
    """Single trend data point."""
    period: str
    positive: int

    class Config:
        json_schema_extra = {
            "example": {
                "period": "2024-01",
                "positive": 1250
            }
        }


class TrendsResponse(BaseModel):
    """Trends analysis response."""
    period_type: str  # weekly, monthly
    data: List[TrendDataPoint]
    total_periods: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "period_type": "monthly",
                "data": [
                    {
                        "period": "2024-01",
                        "positive": 1250
                    }
                ],
                "total_periods": 12
            }
        }


class RiskMapFeature(BaseModel):
    """GeoJSON feature for risk map."""
    type: str = "Feature"
    properties: Dict
    geometry: Optional[Dict] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "Feature",
                "properties": {
                    "district_code": "AA-001",
                    "district_name": "Addis Ababa Bole",
                    "region": "Addis Ababa",
                    "risk_level": "high",
                    "positive": 150,
                    "prediction_score": 0.78,
                    "confidence_score": 0.85
                },
                "geometry": None
            }
        }


class RiskMapResponse(BaseModel):
    """GeoJSON FeatureCollection for risk map."""
    type: str = "FeatureCollection"
    features: List[RiskMapFeature]
    metadata: Dict
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "FeatureCollection",
                "features": [],
                "metadata": {
                    "total_districts": 50,
                    "high_risk": 8,
                    "moderate_risk": 15,
                    "low_risk": 27,
                    "generated_at": "2024-01-15T10:30:00Z"
                }
            }
        }


class PredictionHistoryItem(BaseModel):
    """Single prediction history item."""
    id: str
    prediction_date: date
    risk_level: str
    confidence_score: float
    prediction_score: float
    prediction_reason: Optional[str]
    created_at: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "prediction_date": "2024-01-15",
                "risk_level": "high",
                "confidence_score": 0.85,
                "prediction_score": 0.78,
                "prediction_reason": "High rainfall and temperature conditions",
                "created_at": "2024-01-15T10:30:00Z"
            }
        }


class PredictionHistoryResponse(BaseModel):
    """Prediction history response."""
    district_code: str
    district_name: str
    predictions: List[PredictionHistoryItem]
    total: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "district_code": "AA-001",
                "district_name": "Addis Ababa Bole",
                "predictions": [],
                "total": 10
            }
        }


class AlertItem(BaseModel):
    """Single alert item."""
    id: str
    district_code: str
    district_name: str
    region: str
    risk_level: str
    message: str
    is_active: bool
    created_at: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "district_code": "AA-001",
                "district_name": "Addis Ababa Bole",
                "region": "Addis Ababa",
                "risk_level": "high",
                "message": "High malaria risk detected. Increase prevention measures.",
                "is_active": True,
                "created_at": "2024-01-15T10:30:00Z"
            }
        }


class AlertsResponse(BaseModel):
    """Alerts list response."""
    alerts: List[AlertItem]
    total: int
    active_count: int
    high_risk_count: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "alerts": [],
                "total": 25,
                "active_count": 12,
                "high_risk_count": 5
            }
        }
