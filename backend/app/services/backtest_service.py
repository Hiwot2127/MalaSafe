"""Predicted-vs-actual backtest for a closed month.

Runs after a monthly malaria upload. For every district that has both
(a) an actual MalariaData row for the closed month and (b) a Prediction row
already in the DB for that month (made before the upload landed), this
service computes the per-district error and persists a BacktestResult row.

Roll-up MAE / MAPE / interval coverage is written to
`MonthlyClose.stats_json["backtest"]` by the orchestrator.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID, uuid4

from loguru import logger
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BacktestResult, MalariaData, Prediction, ModelVersion


@dataclass
class BacktestSummary:
    monthly_close_id: UUID
    n_districts: int
    mae: Optional[float]
    mape: Optional[float]
    interval_coverage_pct: Optional[float]


class BacktestService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self, monthly_close_id: UUID, month: date) -> BacktestSummary:
        """Compute per-district error for the closed month, persist results,
        return a summary roll-up.

        Re-running for the same `monthly_close_id` is safe — existing rows are
        wiped first so the result reflects the latest predictions on disk.
        """
        # Wipe prior results for idempotent re-runs.
        await self.db.execute(
            delete(BacktestResult).where(BacktestResult.monthly_close_id == monthly_close_id)
        )

        active_version_id = await self._active_model_version_id()

        # Pull actuals + predictions in one round-trip. Monthly rows have
        # week IS NULL by convention.
        rows = (
            await self.db.execute(
                select(MalariaData, Prediction)
                .join(Prediction, Prediction.district_id == MalariaData.district_id)
                .where(and_(
                    MalariaData.year == month.year,
                    MalariaData.month == month.month,
                    MalariaData.week.is_(None),
                    Prediction.prediction_date == month,
                ))
            )
        ).all()

        if not rows:
            logger.info(
                f"BacktestService.run: no overlapping (actual, prediction) pairs "
                f"for monthly_close={monthly_close_id} month={month.isoformat()}"
            )
            await self.db.commit()
            return BacktestSummary(
                monthly_close_id=monthly_close_id, n_districts=0,
                mae=None, mape=None, interval_coverage_pct=None,
            )

        abs_errors: list[float] = []
        pct_errors: list[float] = []
        interval_hits: list[bool] = []

        for actual, pred in rows:
            abs_err = abs(float(actual.cases) - float(pred.prediction_score))
            pct_err: Optional[float] = None
            if actual.cases > 0:
                pct_err = abs_err / float(actual.cases) * 100.0
                pct_errors.append(pct_err)
            abs_errors.append(abs_err)

            within_q10_q90: Optional[bool] = None
            if pred.q10 is not None and pred.q90 is not None:
                within_q10_q90 = pred.q10 <= float(actual.cases) <= pred.q90
                interval_hits.append(within_q10_q90)

            self.db.add(BacktestResult(
                id=uuid4(),
                monthly_close_id=monthly_close_id,
                model_version_id=active_version_id,
                district_id=actual.district_id,
                month=month,
                actual_cases=int(actual.cases),
                predicted_cases=float(pred.prediction_score),
                predicted_risk=pred.risk_level,
                q10=pred.q10,
                q90=pred.q90,
                abs_error=abs_err,
                pct_error=pct_err,
                within_q10_q90=within_q10_q90,
            ))

        await self.db.commit()

        mae = sum(abs_errors) / len(abs_errors) if abs_errors else None
        mape = sum(pct_errors) / len(pct_errors) if pct_errors else None
        coverage = (
            sum(1 for h in interval_hits if h) / len(interval_hits) * 100.0
            if interval_hits else None
        )

        logger.info(
            f"BacktestService.run: {len(rows)} districts scored for {month.isoformat()}; "
            f"MAE={mae:.2f}" + (f" MAPE={mape:.1f}%" if mape is not None else "") +
            (f" interval_coverage={coverage:.1f}%" if coverage is not None else "")
        )

        return BacktestSummary(
            monthly_close_id=monthly_close_id,
            n_districts=len(rows),
            mae=mae,
            mape=mape,
            interval_coverage_pct=coverage,
        )

    async def run_for_version(
        self, model_version_id: UUID, months: list[date]
    ) -> BacktestSummary:
        """Backtest a candidate model against actuals for the given months,
        for retrain-promotion comparison. Phase 6 will fully implement this."""
        raise NotImplementedError("Implemented in Phase 6")

    async def _active_model_version_id(self) -> Optional[UUID]:
        row = (
            await self.db.execute(
                select(ModelVersion.id).where(ModelVersion.status == "active").limit(1)
            )
        ).scalar_one_or_none()
        return row
