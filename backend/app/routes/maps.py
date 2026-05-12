"""
GIS and mapping endpoints for malaria surveillance.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.utils.dependencies import get_current_user
from app.schemas.analytics import RiskMapResponse, RiskMapFeature
from app.services.analytics_service import AnalyticsService
from typing import Optional
from datetime import date, datetime

router = APIRouter(prefix="/maps", tags=["GIS Maps"])


@router.get("/risk", response_model=RiskMapResponse)
async def get_risk_map(
    date_filter: Optional[date] = Query(None, description="Filter by prediction date (default: today)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get risk heatmap data for GIS visualization.
    
    **Authorization:** Any authenticated user
    
    **Query Parameters:**
    - date_filter: Filter by prediction date (YYYY-MM-DD, default: today)
    
    **Returns:**
    - GeoJSON FeatureCollection with risk data
    - Features include district properties and risk levels
    - Metadata with risk distribution
    
    **GeoJSON Structure:**
    - type: "FeatureCollection"
    - features: Array of Feature objects
    - metadata: Risk distribution and generation info
    
    **Feature Properties:**
    - district_code: District code for GeoJSON matching
    - district_name: District name
    - region: Region name
    - geojson_key: Key for matching with GeoJSON file
    - risk_level: low, moderate, high, very_high
    - confidence_score: Prediction confidence (0-1)
    - prediction_score: Model prediction score
    - recent_cases: Cases in current month
    - recent_deaths: Deaths in current month
    
    **Usage with Leaflet:**
    ```javascript
    // Fetch risk data
    const riskData = await fetch('/api/v1/maps/risk').then(r => r.json());
    
    // Load GeoJSON boundaries
    const boundaries = await fetch('/geojson/ethiopia_districts.json').then(r => r.json());
    
    // Match and style
    boundaries.features.forEach(feature => {
      const riskFeature = riskData.features.find(
        f => f.properties.geojson_key === feature.properties.key
      );
      if (riskFeature) {
        feature.properties = {...feature.properties, ...riskFeature.properties};
      }
    });
    
    // Add to map with styling
    L.geoJSON(boundaries, {
      style: feature => ({
        fillColor: getRiskColor(feature.properties.risk_level),
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
      })
    }).addTo(map);
    ```
    
    **Example Response:**
    ```json
    {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {
            "district_code": "AA-001",
            "district_name": "Addis Ababa Bole",
            "region": "Addis Ababa",
            "geojson_key": "addis_ababa_bole",
            "risk_level": "high",
            "confidence_score": 0.85,
            "prediction_score": 0.78,
            "recent_cases": 150,
            "recent_deaths": 5
          },
          "geometry": null
        }
      ],
      "metadata": {
        "total_districts": 50,
        "high_risk": 8,
        "moderate_risk": 15,
        "low_risk": 27,
        "generated_at": "2024-01-15T10:30:00Z",
        "date_filter": "2024-01-15"
      }
    }
    ```
    """
    service = AnalyticsService(db)
    
    features, metadata = await service.get_risk_map_data(date_filter)
    
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": metadata
    }
