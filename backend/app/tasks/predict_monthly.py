"""Monthly forward prediction task.

For each district with a P-code, generate a prediction for next month. Climate
for the target month is filled using climatological-normals (the predictor's
features.py already falls back to baselines when ClimateData is missing).

This task is idempotent on (district_id, prediction_date) — safe to re-run.

Runs in-process via asyncio. Trigger via the admin endpoint
`POST /monthly-close/predict-monthly` (see app/routes/monthly_close.py) or
schedule it externally (system cron, GitHub Actions, deploy-platform cron).
"""
from __future__ import annotations

from datetime import date


def _next_month(today: date) -> date:
    if today.month == 12:
        return date(today.year + 1, 1, 1)
    return date(today.year, today.month + 1, 1)


async def run_monthly_predictions(target_month: str | None = None) -> dict:
    """Drive an async batch predict for the next calendar month.

    Args:
      target_month: ISO date string (YYYY-MM-DD) of first-of-month; if None,
                    defaults to next calendar month.

    Returns:
      {"target_month": str, "n_districts": int}
    """
    tm = date.fromisoformat(target_month) if target_month else _next_month(date.today())
    n = await _run(tm)
    return {"target_month": tm.isoformat(), "n_districts": n}


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
