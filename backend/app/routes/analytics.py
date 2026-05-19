"""
Analytics endpoints for malaria surveillance data.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.utils.dependencies import get_current_user
from app.schemas.analytics import (
    DashboardResponse,
    DashboardStats,
    RegionStats,
    TrendsResponse,
    TrendDataPoint
)
from app.services.analytics_service import AnalyticsService
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="Get dashboard summary + per-region breakdown",
)
async def get_dashboard(
    year: Optional[int] = Query(None, description="Filter by year (default: current year)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month (1-12)"),
    region: Optional[str] = Query(None, description="Filter by region"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard statistics and analytics.
    
    **Authorization:** Any authenticated user
    
    **Query Parameters:**
    - year: Filter by year (default: current year)
    - month: Filter by month 1-12 (optional)
    - region: Filter by region name (optional)
    
    **Returns:**
    - Summary statistics (cases, deaths, alerts, CFR)
    - Statistics by region
    - Recent trends
    
    **Example Response:**
    ```json
    {
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
    ```
    """
    service = AnalyticsService(db)
    
    # Get summary stats
    summary = await service.get_dashboard_stats(year, month, region)
    
    # Get region stats (only if not filtering by specific region)
    if region is None:
        by_region = await service.get_region_stats(year, month)
    else:
        by_region = []
    
    # Get recent trends (last 6 months)
    _, recent_trends, _ = await service.get_trends(
        period_type="monthly",
        year=year,
        limit=6,
        region=region
    )
    
    return {
        "summary": summary,
        "by_region": by_region,
        "recent_trends": recent_trends
    }


@router.get(
    "/trends",
    response_model=TrendsResponse,
    summary="Get weekly or monthly trend series",
)
async def get_trends(
    period_type: str = Query("monthly", regex="^(weekly|monthly)$", description="Period type: weekly or monthly"),
    year: Optional[int] = Query(None, description="Filter by year (default: current year)"),
    limit: int = Query(12, ge=1, le=52, description="Number of periods to return"),
    region: Optional[str] = Query(None, description="Filter by region"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get trend analysis data.
    
    **Authorization:** Any authenticated user
    
    **Query Parameters:**
    - period_type: 'weekly' or 'monthly' (default: monthly)
    - year: Filter by year (default: current year)
    - limit: Number of periods to return (1-52, default: 12)
    - region: Filter by region name (optional)
    
    **Returns:**
    - Period type
    - Trend data points (period, cases, deaths, CFR)
    - Total periods
    
    **Example Response:**
    ```json
    {
      "period_type": "monthly",
      "data": [
        {
          "period": "2024-01",
          "cases": 1250,
          "deaths": 42,
          "case_fatality_rate": 3.36
        },
        {
          "period": "2024-02",
          "cases": 1380,
          "deaths": 48,
          "case_fatality_rate": 3.48
        }
      ],
      "total_periods": 12
    }
    ```
    """
    service = AnalyticsService(db)
    
    period_type, data, total = await service.get_trends(
        period_type=period_type,
        year=year,
        limit=limit,
        region=region
    )
    
    return {
        "period_type": period_type,
        "data": data,
        "total_periods": total
    }
