from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import date


class DashboardStats(BaseModel):
    """Dashboard statistics schema."""
    total_cases: int
    total_deaths: int
    active_alerts: int
    high_risk_districts: int
    case_fatality_rate: float
    period: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_cases": 15420,
                "total_deaths": 523,
                "active_alerts": 12,
                "high_risk_districts": 8,
                "case_fatality_rate": 3.39,
                "period": "2024-01"
            }
        }


class RegionStats(BaseModel):
    """Region-level statistics."""
    region: str
    total_cases: int
    total_deaths: int
    districts_count: int
    high_risk_count: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "region": "Oromia",
                "total_cases": 5420,
                "total_deaths": 180,
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
                    "total_cases": 15420,
                    "total_deaths": 523,
                    "active_alerts": 12,
                    "high_risk_districts": 8,
                    "case_fatality_rate": 3.39,
                    "period": "2024-01"
                },
                "by_region": [
                    {
                        "region": "Oromia",
                        "total_cases": 5420,
                        "total_deaths": 180,
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
    cases: int
    deaths: int
    case_fatality_rate: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "period": "2024-01",
                "cases": 1250,
                "deaths": 42,
                "case_fatality_rate": 3.36
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
                        "cases": 1250,
                        "deaths": 42,
                        "case_fatality_rate": 3.36
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
                    "cases": 150,
                    "deaths": 5,
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
