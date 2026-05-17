"""Orchestrator that turns one (year, month) into ClimateData rows.

Stub for Phase 1. Real implementation in Phase 3.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class FetchReport:
    target_month: date
    chirps_rows: int = 0
    era5_rows: int = 0
    imputed_rows: int = 0
    provisional: bool = True
    errors: list[str] = field(default_factory=list)


class ClimateFetchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_month(self, target_month: date, force: bool = False) -> FetchReport:
        """Fetch CHIRPS + ERA5 for the given month, aggregate per woreda,
        impute gaps, upsert into climate_data.

        Idempotent: `final` rows are never overwritten by `provisional` ones.
        `provisional` rows are upgraded when CHIRPS final data publishes.
        """
        raise NotImplementedError("Implemented in Phase 3")
