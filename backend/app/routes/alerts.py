"""
Alert endpoints for malaria risk alerts.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.database import get_db
from app.models import User, Alert, District
from app.utils.dependencies import get_current_user
from app.schemas.analytics import AlertsResponse, AlertItem
from typing import Optional

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=AlertsResponse)
async def get_alerts(
    active_only: bool = Query(True, description="Show only active alerts"),
    risk_level: Optional[str] = Query(None, regex="^(low|moderate|high|very_high)$", description="Filter by risk level"),
    region: Optional[str] = Query(None, description="Filter by region"),
    district_code: Optional[str] = Query(None, description="Filter by district code"),
    q: Optional[str] = Query(None, description="Case-insensitive substring match on district name"),
    limit: int = Query(50, ge=1, le=500, description="Number of alerts to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get malaria risk alerts.
    
    **Authorization:** Any authenticated user
    
    **Query Parameters:**
    - active_only: Show only active alerts (default: true)
    - risk_level: Filter by risk level (low, moderate, high, very_high)
    - region: Filter by region name
    - district_code: Filter by district code
    - limit: Number of alerts to return (1-500, default: 50)
    - offset: Offset for pagination (default: 0)
    
    **Returns:**
    - List of alerts with district information
    - Total count
    - Active count
    - High risk count
    
    **Example Response:**
    ```json
    {
      "alerts": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "district_code": "AA-001",
          "district_name": "Addis Ababa Bole",
          "region": "Addis Ababa",
          "risk_level": "high",
          "message": "High malaria risk detected. Increase prevention measures.",
          "is_active": true,
          "created_at": "2024-01-15T10:30:00Z"
        }
      ],
      "total": 25,
      "active_count": 12,
      "high_risk_count": 5
    }
    ```
    """
    # Build base query
    query = select(
        Alert,
        District.district_code,
        District.district_name,
        District.region
    ).join(
        District, Alert.district_id == District.id
    )
    
    # Apply filters
    if active_only:
        query = query.where(Alert.is_active == True)
    
    if risk_level:
        query = query.where(Alert.risk_level == risk_level)
    
    if region:
        query = query.where(District.region == region)
    
    if district_code:
        query = query.where(District.district_code == district_code)

    if q:
        # Strip trims user whitespace so trailing-space typeahead doesn't kill the query.
        query = query.where(District.district_name.ilike(f"%{q.strip()}%"))

    # Order by created_at descending (newest first)
    query = query.order_by(desc(Alert.created_at))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    query = query.limit(limit).offset(offset)
    
    result = await db.execute(query)
    rows = result.all()
    
    # Format alerts
    alerts = []
    for row in rows:
        alert = row[0]
        alerts.append({
            "id": str(alert.id),
            "district_code": row.district_code,
            "district_name": row.district_name,
            "region": row.region,
            "risk_level": alert.risk_level,
            "message": alert.message,
            "is_active": alert.is_active,
            "created_at": alert.created_at.isoformat() + "Z" if alert.created_at else None
        })
    
    # Get active count
    active_query = select(func.count(Alert.id)).where(Alert.is_active == True)
    if region:
        active_query = active_query.join(District).where(District.region == region)
    if district_code:
        active_query = active_query.join(District).where(District.district_code == district_code)
    
    active_result = await db.execute(active_query)
    active_count = active_result.scalar() or 0
    
    # Get high risk count
    high_risk_query = select(func.count(Alert.id)).where(
        Alert.is_active == True,
        Alert.risk_level.in_(['high', 'very_high'])
    )
    if region:
        high_risk_query = high_risk_query.join(District).where(District.region == region)
    if district_code:
        high_risk_query = high_risk_query.join(District).where(District.district_code == district_code)
    
    high_risk_result = await db.execute(high_risk_query)
    high_risk_count = high_risk_result.scalar() or 0
    
    return {
        "alerts": alerts,
        "total": int(total),
        "active_count": int(active_count),
        "high_risk_count": int(high_risk_count)
    }


# Import func for count queries
from sqlalchemy import func
