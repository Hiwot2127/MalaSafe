"""Monthly close orchestration — read-only routes for the dashboard.

The upload service creates MonthlyClose rows and dispatches the Celery
orchestrator (app.tasks.monthly_close.run). These endpoints let the
frontend poll status, drill into the backtest table, and surface drift
findings.

A single admin trigger endpoint also lets ops re-run the pipeline for an
existing close row — useful for replaying after a Celery worker outage,
without re-uploading the CSV.
"""
from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select, desc
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
    limit: int = Query(500, ge=1, le=2000),
) -> dict:
    close_exists = (
        await db.execute(select(MonthlyClose.id).where(MonthlyClose.id == close_id))
    ).scalar_one_or_none()
    if close_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MonthlyClose not found")

    rows = (
        await db.execute(
            select(BacktestResult)
            .where(BacktestResult.monthly_close_id == close_id)
            .order_by(desc(BacktestResult.abs_error))
            .limit(limit)
        )
    ).scalars().all()
    return {
        "monthly_close_id": str(close_id),
        "count": len(rows),
        "items": [r.to_dict() for r in rows],
    }


# ── Drift findings ─────────────────────────────────────────────────────────


@router.get("/{close_id}/drift")
async def get_drift(
    close_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_official),
    severity: Optional[str] = Query(None, regex="^(warn|critical)$"),
) -> dict:
    close_exists = (
        await db.execute(select(MonthlyClose.id).where(MonthlyClose.id == close_id))
    ).scalar_one_or_none()
    if close_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MonthlyClose not found")

    q = (
        select(DriftFinding)
        .where(DriftFinding.monthly_close_id == close_id)
        .order_by(desc(DriftFinding.z_score))
    )
    if severity:
        q = q.where(DriftFinding.severity == severity)
    rows = (await db.execute(q)).scalars().all()
    return {
        "monthly_close_id": str(close_id),
        "count": len(rows),
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

    Useful when a Celery outage left a close stuck in `pending`, or when
    you want to re-run after model artifacts changed.
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

    from app.tasks.celery_app import celery_app
    try:
        celery_app.send_task("app.tasks.monthly_close.run", args=[str(close.id)])
    except Exception as exc:
        logger.warning(f"Celery dispatch failed for {close.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not dispatch close run: {exc}",
        )
    return {"monthly_close_id": str(close.id), "status": "dispatched"}
