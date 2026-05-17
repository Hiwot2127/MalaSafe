"""
Prediction endpoints for malaria risk predictions.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, Path, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from app.database import get_db
from app.models import User, Prediction, District
from app.models.user import UserRole
from app.utils.dependencies import get_current_user, require_roles
from app.schemas.analytics import PredictionHistoryResponse, PredictionHistoryItem
from app.schemas.predictions import (
    GeneratePredictionRequest,
    PredictionResultResponse,
    BatchGenerateRequest,
    BatchGenerateResponse,
)
from app.services.prediction_service import PredictionService
from app.ai import get_predictor
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


@router.post("/generate", response_model=PredictionResultResponse, status_code=status.HTTP_201_CREATED)
async def generate_prediction(
    payload: GeneratePredictionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(
        UserRole.ADMIN, UserRole.MOH_OFFICER, UserRole.EPHI_OFFICER)),
):
    """Generate (or refresh) a malaria-risk prediction for one district + month.

    Authorization: ADMIN | MOH_OFFICER | EPHI_OFFICER.

    The endpoint is idempotent on (district_id, target_month): if a prediction
    already exists, the existing row is returned. Pass `force=true` via the
    batch endpoint to overwrite.
    """
    svc = PredictionService(db, get_predictor())
    try:
        pred = await svc.generate_one(payload.district_id, payload.target_month)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    # Fetch district info for the response
    drow = (await db.execute(select(District).where(District.id == pred.district_id))).scalar_one()
    return PredictionResultResponse(
        id=str(pred.id),
        district_id=str(pred.district_id),
        district_code=drow.district_code,
        district_name=drow.district_name,
        prediction_date=pred.prediction_date,
        risk_level=pred.risk_level,
        prediction_score=float(pred.prediction_score),
        confidence_score=float(pred.confidence_score),
        prediction_reason=pred.prediction_reason,
        is_warm=(pred.prediction_reason or "").lower().startswith("cold-start") is False,
        created_at=pred.created_at.isoformat() + "Z" if pred.created_at else None,
    )


@router.post("/generate-batch", response_model=BatchGenerateResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_batch(
    payload: BatchGenerateRequest,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MOH_OFFICER)),
):
    """Queue a background batch prediction for many districts at one month.

    Authorization: ADMIN | MOH_OFFICER.

    When `district_ids` is omitted, generates for every district where
    `adm3_pcode` is set (i.e. every woreda mapped to the model). Returns 202
    immediately; results land in the `predictions` table as the worker writes
    them. Use `GET /predictions/history/{district_id}` to poll.
    """
    if payload.district_ids is None:
        q = select(func.count(District.id)).where(District.adm3_pcode.is_not(None))
        n = (await db.execute(q)).scalar_one()
    else:
        n = len(payload.district_ids)

    background.add_task(_run_batch_predict, payload.target_month, payload.district_ids, payload.force)
    return BatchGenerateResponse(queued=True, target_month=payload.target_month, n_districts=int(n))


async def _run_batch_predict(target_month: date, district_ids, force: bool) -> None:
    """Standalone async worker — opens its own session (BackgroundTasks doesn't
    keep the request session alive)."""
    from app.database.base import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as session:
            svc = PredictionService(session, get_predictor())
            await svc.generate_batch(target_month, district_ids, force=force)
            await session.commit()
    except Exception as e:
        import logging
        logging.getLogger("predictions").error(f"batch predict failed: {e}")
