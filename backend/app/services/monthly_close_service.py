"""Monthly close orchestrator.

Stub for Phase 1. Implementation lands in Phase 6 (async orchestration).
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession


class MonthlyCloseService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def start_close(self, monthly_close_id: UUID) -> None:
        """Run the closing pipeline for one MonthlyClose row.

        Called from the in-process task `monthly_close.run`. Walks the state
        machine: pending -> climate_fetching -> backtesting ->
        drift_checking -> predicting -> completed.
        """
        raise NotImplementedError("Implemented in Phase 6")
