"""Monthly close orchestration - read-only routes for the dashboard.

The upload service creates MonthlyClose rows and dispatches the
in-process orchestrator (app.tasks.monthly_close.run) via
asyncio.create_task(). These endpoints let the frontend poll status,
drill into the backtest table, and surface drift findings.

Two admin trigger endpoints also live here:
  * POST /monthly-close/{id}/run - re-run the close pipeline for an
    existing row, e.g. after a crash left it stuck in `pending`.
  * POST /monthly-close/predict-monthly - manually fire the next-month
    forward prediction batch (replaces the old Celery Beat schedule).
"""
from __future__ import annotations

import asyncio
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    BacktestResult,
    DriftFinding,
    MonthlyClose,
    User,
)
from app.utils.dependencies import require_official, require_admin

router = APIRouter(prefix="/monthly-close", tags=["Monthly Close"])


# ── List ───────────────────────────────────────────────────────────────────


@router.get("")
async def list_closes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official),
    status_filter: Optional[str] = Query(None, alias="status"),
    month: Optional[date] = None,
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    q = select(MonthlyClose).order_by(desc(MonthlyClose.created_at)).limit(limit)
    if status_filter:
        q = q.where(MonthlyClose.status == status_filter)
    if month:
        q = q.where(MonthlyClose.month == month)
    rows = (await db.execute(q)).scalars().all()
    return {"items": [r.to_dict() for r in rows]}


# ── Detail ─────────────────────────────────────────────────────────────────


@router.get("/{close_id}")
async def get_close(
    close_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official),
) -> dict:
    close = (
        await db.execute(select(MonthlyClose).where(MonthlyClose.id == close_id))
    ).scalar_one_or_none()
    if close is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MonthlyClose not found")
    return close.to_dict()


# ── Backtest rows ──────────────────────────────────────────────────────────


@router.get("/{close_id}/backtest")
async def get_backtest(
    close_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=2000),
) -> dict:
    close_exists = (
        await db.execute(select(MonthlyClose.id).where(MonthlyClose.id == close_id))
    ).scalar_one_or_none()
    if close_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MonthlyClose not found")

    # Total rows for the close - independent of pagination slice. The client
    # uses this for page-of-N controls.
    total = (
        await db.execute(
            select(func.count())
            .select_from(BacktestResult)
            .where(BacktestResult.monthly_close_id == close_id)
        )
    ).scalar_one()

    rows = (
        await db.execute(
            select(BacktestResult)
            .where(BacktestResult.monthly_close_id == close_id)
            .order_by(desc(BacktestResult.abs_error))
            .offset(skip)
            .limit(limit)
        )
    ).scalars().all()
    return {
        "monthly_close_id": str(close_id),
        "count": int(total),
        "skip": skip,
        "limit": limit,
        "items": [r.to_dict() for r in rows],
    }


# ── Drift findings ─────────────────────────────────────────────────────────


@router.get("/{close_id}/drift")
async def get_drift(
    close_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official),
    severity: Optional[str] = Query(None, regex="^(warn|critical)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> dict:
    close_exists = (
        await db.execute(select(MonthlyClose.id).where(MonthlyClose.id == close_id))
    ).scalar_one_or_none()
    if close_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MonthlyClose not found")

    base = select(DriftFinding).where(DriftFinding.monthly_close_id == close_id)
    count_base = select(func.count()).select_from(DriftFinding).where(
        DriftFinding.monthly_close_id == close_id
    )
    if severity:
        base = base.where(DriftFinding.severity == severity)
        count_base = count_base.where(DriftFinding.severity == severity)

    total = (await db.execute(count_base)).scalar_one()

    rows = (
        await db.execute(
            base.order_by(desc(DriftFinding.z_score)).offset(skip).limit(limit)
        )
    ).scalars().all()
    return {
        "monthly_close_id": str(close_id),
        "count": int(total),
        "skip": skip,
        "limit": limit,
        "items": [r.to_dict() for r in rows],
    }


# ── Admin: re-run an existing close ────────────────────────────────────────


@router.post("/{close_id}/run", status_code=status.HTTP_202_ACCEPTED)
async def trigger_close_run(
    close_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    """Re-dispatch the orchestrator for an existing close row.

    Useful when a crash left a close stuck in `pending`, or when you want
    to re-run after model artifacts changed.
    """
    close = (
        await db.execute(select(MonthlyClose).where(MonthlyClose.id == close_id))
    ).scalar_one_or_none()
    if close is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MonthlyClose not found")

    # Reset terminal states so the orchestrator processes the row.
    if close.status in ("completed", "failed"):
        close.status = "pending"
        close.error = None
        close.completed_at = None
        await db.commit()

    from app.tasks.monthly_close import run as run_close
    asyncio.create_task(run_close(str(close.id)))
    return {"monthly_close_id": str(close.id), "status": "dispatched"}


# -- Admin: monthly forward predictions ---------------------------------------


@router.post("/predict-monthly", status_code=status.HTTP_202_ACCEPTED)
async def trigger_predict_monthly(
    target_month: Optional[str] = Query(
        None,
        description="ISO date of first-of-month (YYYY-MM-DD). Defaults to next calendar month.",
    ),
    current_user: User = Depends(require_admin),
) -> dict:
    """Manually dispatch the monthly batch prediction.

    Replaces the previous Celery Beat schedule. For a recurring run, hit
    this endpoint from system cron or your deploy platform's cron (Vercel
    cron, GitHub Actions, etc.) on the 5th of each month.
    """
    from app.tasks.predict_monthly import run_monthly_predictions

    asyncio.create_task(run_monthly_predictions(target_month=target_month))
    return {"target_month": target_month or "next-month", "status": "dispatched"}
