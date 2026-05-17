"""Predicted-vs-actual backtest for a closed month.

Stub for Phase 1. Real implementation in Phase 4.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class BacktestSummary:
    monthly_close_id: UUID
    n_districts: int
    mae: float
    mape: float | None
    interval_coverage_pct: float | None


class BacktestService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self, monthly_close_id: UUID, month: date) -> BacktestSummary:
        """For each (district, month) with both an actual row and an existing
        prediction, compute abs_error, pct_error, within_q10_q90; persist a
        BacktestResult row; roll up MAE / MAPE / interval coverage.
        """
        raise NotImplementedError("Implemented in Phase 4")

    async def run_for_version(
        self, model_version_id: UUID, months: list[date]
    ) -> BacktestSummary:
        """Backtest a candidate model against actuals for the given months,
        for retrain-promotion comparison.
        """
        raise NotImplementedError("Implemented in Phase 5")
