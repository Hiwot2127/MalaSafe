"""Monthly forward prediction task.

For each district with a P-code, generate a prediction for next month. Climate
for the target month is filled using climatological-normals (the predictor's
features.py already falls back to baselines when ClimateData is missing).

This task is idempotent on (district_id, prediction_date) -- safe to re-run.
"""
from __future__ import annotations

import asyncio
from datetime import date, timedelta

from app.tasks.celery_app import celery_app


def _next_month(today: date) -> date:
    if today.month == 12:
        return date(today.year + 1, 1, 1)
    return date(today.year, today.month + 1, 1)


@celery_app.task(name="app.tasks.predict_monthly.run_monthly_predictions",
                  bind=True, max_retries=2, default_retry_delay=600)
def run_monthly_predictions(self, target_month: str | None = None) -> dict:
    """Synchronous Celery wrapper that drives an async batch predict.

    Args:
      target_month: ISO date string (YYYY-MM-DD) of first-of-month; if None,
                    defaults to next calendar month.

    Returns:
      {"target_month": str, "n_districts": int}
    """
    tm = date.fromisoformat(target_month) if target_month else _next_month(date.today())
    try:
        n = asyncio.run(_run(tm))
        return {"target_month": tm.isoformat(), "n_districts": n}
    except Exception as exc:
        raise self.retry(exc=exc)


async def _run(target_month: date) -> int:
    from sqlalchemy import select
    from app.database.base import AsyncSessionLocal
    from app.models import District
    from app.services.prediction_service import PredictionService
    from app.ai import get_predictor

    predictor = get_predictor()
    async with AsyncSessionLocal() as session:
        q = select(District).where(District.adm3_pcode.is_not(None))
        district_ids = [d.id for d in (await session.execute(q)).scalars().all()]
        svc = PredictionService(session, predictor)
        n = await svc.generate_batch(target_month, district_ids, force=False)
        await session.commit()
        return n
