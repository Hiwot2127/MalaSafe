"""3-sigma drift / anomaly detection on monthly close.

Stub for Phase 1. Real implementation in Phase 4.
"""
from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DriftFinding


class DriftService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate(self, monthly_close_id: UUID, month: date) -> list[DriftFinding]:
        """Per (district, metric), pull a same-month-prior-3-years baseline,
        compute z-score against the observed value, persist DriftFinding rows
        for |z| >= 2 (warn) or >= 3 (critical).

        Metrics: cases (MalariaData), rainfall / temp / humidity (ClimateData).
        """
        raise NotImplementedError("Implemented in Phase 4")
