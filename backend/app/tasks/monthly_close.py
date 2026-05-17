"""Monthly close orchestration Celery task.

Phase 2 stub: registers the task and accepts dispatches so the upload service
can `.delay()` without crashing. The real state-machine implementation lands
in Phase 6 (climate fetch -> backtest -> drift -> predict -> finalize).

A MonthlyClose row created by the upload service today stays in `pending`
status until Phase 6 wires up the orchestrator. A future Phase 6 deploy can
sweep up pending rows via `process_pending_closes()` (see TODO below).
"""
from __future__ import annotations

import asyncio
from uuid import UUID

from loguru import logger

from app.tasks.celery_app import celery_app


@celery_app.task(
    name="app.tasks.monthly_close.run",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def run(self, monthly_close_id: str) -> dict:
    """Run the closing pipeline for one MonthlyClose row.

    Phase 6 will replace the body with a Celery chain that walks the state
    machine:
        pending -> climate_fetching -> backtesting -> drift_checking ->
        predicting -> completed
    """
    try:
        close_id = UUID(monthly_close_id)
    except (TypeError, ValueError):
        logger.error(f"monthly_close.run received invalid id: {monthly_close_id!r}")
        return {"monthly_close_id": monthly_close_id, "status": "invalid_id"}

    logger.info(
        f"monthly_close.run dispatched for {close_id}. "
        "Phase 2 stub — orchestration lands in Phase 6. "
        "Row will stay in `pending` status until then."
    )
    return {"monthly_close_id": str(close_id), "status": "stub_phase_2"}


@celery_app.task(name="app.tasks.monthly_close.retrain", bind=True)
def retrain(self, reason: str = "manual") -> dict:
    """Phase 5 stub. Trains a new candidate LightGBM model.

    Dispatched by:
      - backfill-mode uploads (immediately, since backtest is skipped)
      - quarterly beat schedule (Phase 5)
      - drift-triggered orchestrator (Phase 6)
    """
    logger.info(f"monthly_close.retrain dispatched (reason={reason}). Phase 5 will implement.")
    return {"reason": reason, "status": "stub_phase_5"}
