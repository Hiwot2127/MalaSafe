"""Orchestrator that turns one (year, month) into ClimateData rows.

End-to-end pipeline:
    1. download CHIRPS GeoTIFF for the month
    2. download ERA5-Land monthly-means NetCDF for the month
    3. run zonal stats against the bundled woreda shapefile
    4. join against the District table on adm3_pcode
    5. hierarchically impute missing cells
    6. upsert into climate_data with is_provisional + data_source semantics

Idempotent: re-running for the same month is safe. Final (non-provisional)
rows are never overwritten by a provisional fetch; provisional rows are
upgraded in place when the final raster lands.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.models import ClimateData, District

from . import chirps_client, era5_client, zonal_stats
from .imputer import impute_missing


@dataclass
class FetchReport:
    target_month: date
    chirps_rows: int = 0
    era5_rows: int = 0
    imputed_rows: int = 0
    upserted_rows: int = 0
    provisional: bool = True
    errors: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "target_month": self.target_month.isoformat(),
            "chirps_rows": self.chirps_rows,
            "era5_rows": self.era5_rows,
            "imputed_rows": self.imputed_rows,
            "upserted_rows": self.upserted_rows,
            "provisional": self.provisional,
            "errors": self.errors,
        }


class ClimateFetchService:
    """Fetch + aggregate one calendar month of climate data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_month(self, target_month: date, force: bool = False) -> FetchReport:
        """Fetch CHIRPS + ERA5 for the given month, aggregate per woreda,
        impute gaps, upsert into climate_data.

        ``force=True`` re-downloads even if the cached raster exists. Useful
        when CHIRPS publishes the final replacement for an earlier
        provisional fetch.
        """
        if target_month.day != 1:
            target_month = target_month.replace(day=1)

        report = FetchReport(
            target_month=target_month,
            provisional=chirps_client.is_provisional(target_month),
        )

        shp_path = Path(settings.SHAPEFILE_PATH)
        if not shp_path.exists():
            report.errors.append(f"shapefile missing at {shp_path}")
            logger.error(report.errors[-1])
            return report

        cache_root = Path(settings.RASTER_CACHE_DIR)
        chirps_dir = cache_root / "chirps"
        era5_dir = cache_root / "era5"

        # Run blocking IO (downloads + GDAL/raster reads) in a worker thread
        # so the orchestrator's event loop stays responsive.
        loop = asyncio.get_running_loop()
        try:
            chirps_tif = await loop.run_in_executor(
                None, chirps_client.download_month,
                target_month.year, target_month.month, chirps_dir,
            )
        except FileNotFoundError as exc:
            report.errors.append(f"CHIRPS not yet published: {exc}")
            logger.warning(report.errors[-1])
            chirps_tif = None
        except Exception as exc:
            report.errors.append(f"CHIRPS fetch failed: {exc}")
            logger.error(report.errors[-1])
            chirps_tif = None

        try:
            era5_nc = await loop.run_in_executor(
                None, era5_client.download_month,
                target_month.year, target_month.month, era5_dir,
            )
        except Exception as exc:
            report.errors.append(f"ERA5 fetch failed: {exc}")
            logger.error(report.errors[-1])
            era5_nc = None

        chirps_by_pcode: dict[str, float | None] = {}
        era5_by_pcode: dict[str, dict[str, float | None]] = {}

        if chirps_tif is not None:
            chirps_by_pcode = await loop.run_in_executor(
                None, zonal_stats.aggregate_chirps, chirps_tif, shp_path,
            )
            report.chirps_rows = sum(1 for v in chirps_by_pcode.values() if v is not None)

        if era5_nc is not None:
            era5_by_pcode = await loop.run_in_executor(
                None, zonal_stats.aggregate_era5,
                era5_nc, shp_path, target_month.year, target_month.month,
            )
            report.era5_rows = sum(1 for v in era5_by_pcode.values() if v["temperature"] is not None)

        # Build one row per district we have an adm3_pcode for.
        districts = (
            await self.db.execute(
                select(District).where(District.adm3_pcode.is_not(None))
            )
        ).scalars().all()
        rows = self._build_rows(districts, chirps_by_pcode, era5_by_pcode, target_month, report)

        # Impute holes in-memory before the upsert.
        rows = impute_missing(rows)
        report.imputed_rows = sum(
            1 for r in rows if r.get("data_source", "").startswith("imputed")
        )

        # Upsert with the "final never overwritten by provisional" rule.
        report.upserted_rows = await self._upsert(rows)
        return report

    # ------------------------------------------------------------------ helpers

    def _build_rows(
        self,
        districts: list[District],
        chirps: dict[str, float | None],
        era5: dict[str, dict[str, float | None]],
        target_month: date,
        report: FetchReport,
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for d in districts:
            pcode = d.adm3_pcode
            era_vals = era5.get(pcode, {}) if pcode else {}
            rain = chirps.get(pcode) if pcode else None
            temp = era_vals.get("temperature")
            data_source = (
                "chirps_era5"
                if rain is not None and temp is not None
                else "chirps"
                if rain is not None
                else "era5"
                if temp is not None
                else None  # imputer will fill + set data_source
            )
            rows.append({
                "district_id": d.id,
                "adm3_pcode": pcode,
                "region": d.region,
                "zone": d.zone,
                "date": target_month,
                "rainfall": rain,
                "temperature": temp,
                "min_temp": era_vals.get("min_temp"),
                "max_temp": era_vals.get("max_temp"),
                "humidity": era_vals.get("humidity"),
                "season": _season_for(target_month.month),
                "is_provisional": report.provisional,
                "data_source": data_source,
            })
        return rows

    async def _upsert(self, rows: list[dict[str, Any]]) -> int:
        """Upsert into climate_data with provisional/final precedence.

        Rule: a provisional fetch never overwrites a final row; a final fetch
        always upgrades a provisional row. Matches the offline pipeline's
        intent and the migration's table-level constraints.
        """
        if not rows:
            return 0

        # Map our internal data_source names to the values allowed by the
        # check constraint on climate_data.data_source.
        allowed = {"chirps", "era5", "manual_upload", "imputed_hierarchical", "imputed_baseline"}
        payload: list[dict[str, Any]] = []
        for r in rows:
            ds = r.get("data_source") or "imputed_baseline"
            # Combine into one bucket understood by the constraint. We
            # collapse "chirps_era5" -> "chirps" so the rainfall provenance
            # wins; temperature provenance is implicit when ERA5 succeeds.
            if ds == "chirps_era5":
                ds = "chirps"
            if ds not in allowed:
                ds = "imputed_baseline"
            payload.append({
                "district_id": r["district_id"],
                "rainfall": r.get("rainfall"),
                "temperature": r.get("temperature"),
                "min_temp": r.get("min_temp"),
                "max_temp": r.get("max_temp"),
                "humidity": r.get("humidity"),
                "season": r.get("season"),
                "date": r["date"],
                "is_provisional": r["is_provisional"],
                "data_source": ds,
            })

        stmt = pg_insert(ClimateData).values(payload)
        # On (district_id, date) conflict: only update when the incoming row
        # is final (not provisional) OR the existing row is provisional.
        # This implements the offline pipeline's "final never overwritten"
        # rule directly in SQL - no race window.
        excluded = stmt.excluded
        stmt = stmt.on_conflict_do_update(
            constraint="uq_climate_data_district_date",
            set_={
                "rainfall": excluded.rainfall,
                "temperature": excluded.temperature,
                "min_temp": excluded.min_temp,
                "max_temp": excluded.max_temp,
                "humidity": excluded.humidity,
                "season": excluded.season,
                "is_provisional": excluded.is_provisional,
                "data_source": excluded.data_source,
            },
            where=(
                (excluded.is_provisional.is_(False))
                | (ClimateData.is_provisional.is_(True))
            ),
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        # rowcount on ON CONFLICT covers both inserts and updates.
        return int(result.rowcount or 0)


def _season_for(month: int) -> str:
    """Ethiopian season label aligned with the malaria predictor's feature set."""
    if month in (6, 7, 8, 9):
        return "kiremt"
    if month in (10, 11, 12, 1):
        return "bega"
    return "belg"
