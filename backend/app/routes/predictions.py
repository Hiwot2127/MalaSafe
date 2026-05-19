"""
Prediction endpoints for malaria risk predictions.
"""

import uuid

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
from app.services.analytics_service import AnalyticsService
from app.ai import get_predictor
from typing import Optional
from datetime import date, datetime, timedelta

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.get(
    "/history/{district_id}",
    response_model=PredictionHistoryResponse,
    summary="Get prediction history for a district",
    responses={404: {"description": "District not found"}},
)
async def get_prediction_history(
    district_id: str = Path(
        ...,
        description="District identifier — either a UUID (`District.id`) or a district code (e.g. `ET050103`)",
    ),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(30, ge=1, le=365, description="Number of predictions to return"),
    start_date: Optional[date] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date filter (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get prediction history for a specific district.

    **Authorization:** Any authenticated user

    **Path parameter:** `district_id` — either a UUID (`District.id`) or a
    human-readable district code (`District.district_code`, e.g. `ET050103`).
    Accepting both makes the endpoint robust to ID drift between the
    `/maps/risk` snapshot and the live `District` table.

    **Returns:** district info, list of predictions (newest first), and the
    total matching the date filter (independent of pagination).
    """
    # Accept either a UUID (District.id) or a human-readable district_code.
    # Try UUID first when the string parses as one; fall back to district_code
    # otherwise (or if the UUID lookup misses). This makes the route resilient
    # to /maps/risk and the live District table drifting out of sync.
    try:
        uuid.UUID(district_id)
        looks_like_uuid = True
    except (ValueError, AttributeError):
        looks_like_uuid = False

    district = None
    if looks_like_uuid:
        district = (
            await db.execute(select(District).where(District.id == district_id))
        ).scalar_one_or_none()

    if district is None:
        district = (
            await db.execute(
                select(District).where(District.district_code == district_id)
            )
        ).scalar_one_or_none()

    if not district:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"District not found: {district_id}",
        )

    # All downstream queries key on the canonical UUID, regardless of what the
    # caller passed.
    district_id = str(district.id)

    # Build query
    query = select(Prediction).where(
        Prediction.district_id == district_id
    )
    
    if start_date:
        query = query.where(Prediction.prediction_date >= start_date)

    if end_date:
        query = query.where(Prediction.prediction_date <= end_date)

    # Total matching this district + date filter so the client can render
    # page-of-N controls without re-issuing the same query.
    count_query = select(func.count()).select_from(
        select(Prediction.id)
        .where(Prediction.district_id == district_id)
        .where(*([Prediction.prediction_date >= start_date] if start_date else []))
        .where(*([Prediction.prediction_date <= end_date] if end_date else []))
        .subquery()
    )
    total = (await db.execute(count_query)).scalar_one()

    query = (
        query.order_by(desc(Prediction.prediction_date), desc(Prediction.created_at))
        .offset(skip)
        .limit(limit)
    )

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
        "total": int(total),
    }


@router.get(
    "/latest",
    summary="Paginated latest prediction per district",
)
async def get_latest_predictions(
    q: Optional[str] = Query(None, description="Case-insensitive substring match on district name"),
    region: Optional[str] = Query(None, description="Filter to a single region by exact name"),
    risk_level: Optional[str] = Query(
        None,
        regex="^(low|moderate|medium|high|very_high)$",
        description="Filter to one risk level",
    ),
    date_filter: Optional[date] = Query(None, description="Anchor date (default: today)"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(25, ge=1, le=200, description="Page size"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Paginated flat list of the latest prediction per district.

    Unlike `/maps/risk` (which returns the full corpus as GeoJSON for the map),
    this endpoint paginates server-side and accepts text + region + risk_level
    filters so the dashboard table can scroll without dragging the whole
    country's worth of predictions over the wire.

    **Authorization:** any authenticated user.

    **Ordering:** very_high → high → moderate/medium → low, then
    `prediction_score` desc. Highest-urgency districts appear first.

    **Returns**
    - `items`: prediction rows for the requested slice
    - `total`: total matching rows (independent of pagination)
    - `skip` / `limit`: echoed back for the client's page math
    """
    service = AnalyticsService(db)
    items, total = await service.get_latest_predictions_page(
        date_filter=date_filter,
        q=q,
        region=region,
        risk_level=risk_level,
        skip=skip,
        limit=limit,
    )
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post(
    "/generate",
    response_model=PredictionResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a prediction for one district",
    responses={404: {"description": "District not found"}},
)
async def generate_prediction(
    payload: GeneratePredictionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(
        UserRole.ADMIN, UserRole.MOH_OFFICER, UserRole.EPHI_OFFICER)),
):
    """Generate (or refresh) a malaria-risk prediction for one district + month.

    **Authorization:** `ADMIN` | `MOH_OFFICER` | `EPHI_OFFICER`.

    Idempotent on `(district_id, target_month)`: if a prediction already exists
    it is returned unchanged. To overwrite existing predictions, use the batch
    endpoint with `force=true`.

    **Request body**
    - `district_id`: District UUID
    - `target_month`: First day of the target month (`YYYY-MM-01`)

    **Notes**
    - `is_warm` is `false` when the model used a cold-start fallback (insufficient
      history for the district); treat the prediction as lower-confidence in that case.
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


@router.post(
    "/generate-batch",
    response_model=BatchGenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue batch prediction for many districts",
)
async def generate_batch(
    payload: BatchGenerateRequest,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MOH_OFFICER)),
):
    """Queue a background batch prediction job for many districts at one target month.

    **Authorization:** `ADMIN` | `MOH_OFFICER`.

    Returns `202 Accepted` immediately — work continues in a background task.
    Results land in the `predictions` table as they complete; poll
    `GET /predictions/history/{district_id}` to see them.

    **Request body**
    - `target_month`: First day of the target month (`YYYY-MM-01`)
    - `district_ids` (optional): list of district UUIDs. If omitted, runs for
      every district that has an `adm3_pcode` set (i.e. every woreda mapped
      to the model).
    - `force` (optional, default `false`): when `true`, overwrites existing
      predictions for the same `(district_id, target_month)`.

    **Response**
    - `queued`: always `true` on success
    - `n_districts`: number of districts the job will process
    """
    if payload.district_ids is None:
        q = select(func.count(District.id)).where(District.adm3_pcode.is_not(None))
        n = (await db.execute(q)).scalar_one()
    else:
        n = len(payload.district_ids)

    background.add_task(_run_batch_predict, payload.target_month, payload.district_ids, payload.force)
    return BatchGenerateResponse(queued=True, target_month=payload.target_month, n_districts=int(n))


async def _run_batch_predict(target_month: date, district_ids, force: bool) -> None:
    """Standalone async worker - opens its own session (BackgroundTasks doesn't
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
