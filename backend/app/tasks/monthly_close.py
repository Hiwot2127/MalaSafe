"""Monthly close orchestration Celery task.

Walks the MonthlyClose state machine:
    pending -> climate_fetching -> backtesting -> drift_checking ->
    predicting -> completed

Climate fetch is currently a no-op stub (Phase 4 wires up Copernicus CDS +
CHIRPS). Backtest, drift, and re-prediction run for real against the data
already in the DB — uploaded actuals plus existing predictions and climate.

Backfill-mode closes skip backtest + drift and immediately enqueue a
retrain task (also a stub today; Phase 6).
"""
from __future__ import annotations

import asyncio
from datetime import date, datetime, timezone
from uuid import UUID

from loguru import logger
from sqlalchemy import select

from app.tasks.celery_app import celery_app


@celery_app.task(
    name="app.tasks.monthly_close.run",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def run(self, monthly_close_id: str) -> dict:
    """Run the closing pipeline for one MonthlyClose row.

    Called by the upload service after a small (<=2 month) monthly malaria
    upload lands. Sync wrapper around the async orchestrator so Celery can
    own retries.
    """
    try:
        close_id = UUID(monthly_close_id)
    except (TypeError, ValueError):
        logger.error(f"monthly_close.run received invalid id: {monthly_close_id!r}")
        return {"monthly_close_id": monthly_close_id, "status": "invalid_id"}

    try:
        return asyncio.run(_orchestrate(close_id))
    except Exception as exc:
        logger.exception(f"monthly_close.run failed for {close_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.monthly_close.retrain", bind=True)
def retrain(self, reason: str = "manual") -> dict:
    """Phase 6 stub. Trains a new candidate LightGBM model.

    Dispatched by:
      - backfill-mode uploads (immediately, since backtest is skipped)
      - quarterly beat schedule (Phase 6)
      - drift-triggered orchestrator (Phase 6)
    """
    logger.info(f"monthly_close.retrain dispatched (reason={reason}). Phase 6 will implement.")
    return {"reason": reason, "status": "stub_phase_6"}


# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------


async def _orchestrate(close_id: UUID) -> dict:
    """Drive a single MonthlyClose through the state machine."""
    from app.database.base import AsyncSessionLocal
    from app.models import MonthlyClose, District
    from app.services.backtest_service import BacktestService
    from app.services.drift_service import DriftService
    from app.services.prediction_service import PredictionService
    from app.ai import get_predictor

    async with AsyncSessionLocal() as db:
        close = (
            await db.execute(select(MonthlyClose).where(MonthlyClose.id == close_id))
        ).scalar_one_or_none()

        if close is None:
            logger.warning(f"_orchestrate: MonthlyClose {close_id} not found")
            return {"monthly_close_id": str(close_id), "status": "not_found"}
        if close.status == "completed":
            return {"monthly_close_id": str(close_id), "status": "already_completed"}

        anchor = close.month  # date, first-of-month
        logger.info(
            f"_orchestrate: starting close={close.id} mode={close.mode} month={anchor.isoformat()}"
        )

        # Backfill mode: skip backtest + drift; dispatch retrain.
        if close.mode == "backfill":
            close.status = "completed"
            close.completed_at = datetime.now(timezone.utc)
            close.stats_json = {"mode": "backfill", "note": "backtest + drift skipped; retrain dispatched"}
            await db.commit()
            try:
                celery_app.send_task(
                    "app.tasks.monthly_close.retrain",
                    args=[], kwargs={"reason": "backfill"},
                )
            except Exception as exc:
                logger.warning(f"retrain dispatch failed for close={close.id}: {exc}")
            return {"monthly_close_id": str(close.id), "status": "backfill_completed"}

        # Close mode: full pipeline.
        try:
            await _set_status(db, close, "climate_fetching")
            # Fetch real climate for the just-uploaded month so the next
            # prediction reads observed CHIRPS rainfall + ERA5 temperature
            # instead of falling back to climatological normals.
            from app.services.climate.climate_fetch_service import ClimateFetchService

            try:
                fetch_report = await ClimateFetchService(db).fetch_month(anchor)
                climate_note = fetch_report.as_dict()
            except Exception as exc:
                logger.warning(f"climate_fetching failed for close={close.id}: {exc}")
                climate_note = {"status": "failed", "error": str(exc)}

            await _set_status(db, close, "backtesting")
            backtest = await BacktestService(db).run(close.id, anchor)

            await _set_status(db, close, "drift_checking")
            drift_findings = await DriftService(db).evaluate(close.id, anchor)
            n_critical = sum(1 for f in drift_findings if f.severity == "critical")

            await _set_status(db, close, "predicting")
            target_month = _next_month(anchor)
            predictor = get_predictor()
            district_ids = [
                row[0]
                for row in (
                    await db.execute(
                        select(District.id).where(District.adm3_pcode.is_not(None))
                    )
                ).all()
            ]
            n_pred = await PredictionService(db, predictor).generate_batch(
                target_month, district_ids, force=True,
            )

            # Finalize
            close.status = "completed"
            close.completed_at = datetime.now(timezone.utc)
            close.stats_json = {
                "climate_fetch": climate_note,
                "backtest": {
                    "n_districts": backtest.n_districts,
                    "mae": backtest.mae,
                    "mape": backtest.mape,
                    "interval_coverage_pct": backtest.interval_coverage_pct,
                },
                "drift": {
                    "n_findings": len(drift_findings),
                    "n_critical": n_critical,
                },
                "predictions": {
                    "target_month": target_month.isoformat(),
                    "n_predictions": n_pred,
                },
            }
            await db.commit()
            logger.info(
                f"_orchestrate: completed close={close.id} backtest_n={backtest.n_districts} "
                f"drift_critical={n_critical} next_predictions={n_pred}"
            )
            return {"monthly_close_id": str(close.id), "status": "completed"}

        except Exception as exc:
            logger.exception(f"_orchestrate: failed close={close.id}: {exc}")
            close.status = "failed"
            close.error = str(exc)[:1000]
            close.completed_at = datetime.now(timezone.utc)
            await db.commit()
            raise


async def _set_status(db, close, status: str) -> None:
    close.status = status
    await db.commit()


def _next_month(d: date) -> date:
    if d.month == 12:
        return date(d.year + 1, 1, 1)
    return date(d.year, d.month + 1, 1)
