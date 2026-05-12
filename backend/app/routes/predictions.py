"""
Prediction endpoints for malaria risk predictions.
"""

from fastapi import APIRouter, Depends, Path, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.database import get_db
from app.models import User, Prediction, District
from app.utils.dependencies import get_current_user
from app.schemas.analytics import PredictionHistoryResponse, PredictionHistoryItem
from typing import Optional
from datetime import date, datetime, timedelta

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.get("/history/{district_id}", response_model=PredictionHistoryResponse)
async def get_prediction_history(
    district_id: str = Path(..., description="District ID (UUID)"),
    limit: int = Query(30, ge=1, le=365, description="Number of predictions to return"),
    start_date: Optional[date] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date filter (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get prediction history for a specific district.
    
    **Authorization:** Any authenticated user
    
    **Path Parameters:**
    - district_id: District UUID
    
    **Query Parameters:**
    - limit: Number of predictions to return (1-365, default: 30)
    - start_date: Start date filter (YYYY-MM-DD, optional)
    - end_date: End date filter (YYYY-MM-DD, optional)
    
    **Returns:**
    - District information
    - List of predictions (newest first)
    - Total count
    
    **Example Response:**
    ```json
    {
      "district_code": "AA-001",
      "district_name": "Addis Ababa Bole",
      "predictions": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "prediction_date": "2024-01-15",
          "risk_level": "high",
          "confidence_score": 0.85,
          "prediction_score": 0.78,
          "prediction_reason": "High rainfall and temperature conditions",
          "created_at": "2024-01-15T10:30:00Z"
        }
      ],
      "total": 30
    }
    ```
    """
    # Get district info
    district_result = await db.execute(
        select(District).where(District.id == district_id)
    )
    district = district_result.scalar_one_or_none()
    
    if not district:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"District not found: {district_id}"
        )
    
    # Build query
    query = select(Prediction).where(
        Prediction.district_id == district_id
    )
    
    if start_date:
        query = query.where(Prediction.prediction_date >= start_date)
    
    if end_date:
        query = query.where(Prediction.prediction_date <= end_date)
    
    query = query.order_by(desc(Prediction.prediction_date), desc(Prediction.created_at)).limit(limit)
    
    result = await db.execute(query)
    predictions = result.scalars().all()
    
    # Format response
    prediction_items = []
    for pred in predictions:
        prediction_items.append({
            "id": str(pred.id),
            "prediction_date": pred.prediction_date,
            "risk_level": pred.risk_level,
            "confidence_score": float(pred.confidence_score),
            "prediction_score": float(pred.prediction_score),
            "prediction_reason": pred.prediction_reason,
            "created_at": pred.created_at.isoformat() + "Z" if pred.created_at else None
        })
    
    return {
        "district_code": district.district_code,
        "district_name": district.district_name,
        "predictions": prediction_items,
        "total": len(prediction_items)
    }
