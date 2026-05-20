"""3-sigma drift / anomaly detection for a closed month.

For each (district, metric), pull a baseline window - the same calendar
month in each of the prior 3 years - and z-score the observed value
against that baseline. Anomalies above |z| >= 2 are persisted as
DriftFinding rows; |z| >= 3 is marked `critical`.

Metrics covered:
  cases     - from malaria_data
  rainfall  - from climate_data
  temp      - climate_data.temperature
  humidity  - climate_data.humidity

The orchestrator rolls the critical count into MonthlyClose.stats_json
and (Phase 6+) may trigger a retrain when critical findings exceed
settings.DRIFT_RETRAIN_THRESHOLD on consecutive closes.
"""
from __future__ import annotations

import math
import statistics
from datetime import date
from typing import Optional
from uuid import UUID, uuid4

from loguru import logger
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DriftFinding, MalariaData, ClimateData


BASELINE_YEARS = 3  # same calendar month for the prior 3 years
WARN_Z = 2.0
CRITICAL_Z = 3.0


class DriftService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate(self, monthly_close_id: UUID, month: date) -> list[DriftFinding]:
        """Compute z-scores per (district, metric), persist DriftFinding rows.

        Returns the list of inserted findings (already flushed)."""

        # Idempotent re-run: wipe prior findings for this close.
        await self.db.execute(
            delete(DriftFinding).where(DriftFinding.monthly_close_id == monthly_close_id)
        )

        findings: list[DriftFinding] = []

        # --- positive (from malaria_data) --------------------------------
        positive_now = await self._malaria_observed(month)
        positive_baseline = await self._malaria_baseline(month)
        findings.extend(self._score(
            monthly_close_id, month, "positive", positive_now, positive_baseline,
        ))

        # --- climate metrics (from climate_data) -------------------------
        climate_now = await self._climate_observed(month)
        climate_baseline = await self._climate_baseline(month)
        for col, label in (
            ("rainfall", "rainfall"),
            ("temperature", "temp"),
            ("humidity", "humidity"),
        ):
            observed = {d: row[col] for d, row in climate_now.items() if row.get(col) is not None}
            baseline = {
                d: [row[col] for row in rows if row.get(col) is not None]
                for d, rows in climate_baseline.items()
            }
            findings.extend(self._score(monthly_close_id, month, label, observed, baseline))

        for f in findings:
            self.db.add(f)
        await self.db.commit()

        n_crit = sum(1 for f in findings if f.severity == "critical")
        logger.info(
            f"DriftService.evaluate: {len(findings)} findings ({n_crit} critical) "
            f"for monthly_close={monthly_close_id} month={month.isoformat()}"
        )
        return findings

    # ---- scoring ----------------------------------------------------------
    def _score(
        self,
        monthly_close_id: UUID,
        month: date,
        metric: str,
        observed: dict[UUID, float],
        baseline: dict[UUID, list[float]],
    ) -> list[DriftFinding]:
        out: list[DriftFinding] = []
        for district_id, value in observed.items():
            samples = baseline.get(district_id, [])
            if len(samples) < 2:
                continue
            mean = statistics.fmean(samples)
            std = statistics.pstdev(samples)
            if std == 0 or math.isnan(std):
                continue
            z = (float(value) - mean) / std
            abs_z = abs(z)
            if abs_z < WARN_Z:
                continue
            severity = "critical" if abs_z >= CRITICAL_Z else "warn"
            out.append(DriftFinding(
                id=uuid4(),
                monthly_close_id=monthly_close_id,
                district_id=district_id,
                metric=metric,
                observed_value=float(value),
                baseline_mean=mean,
                baseline_std=std,
                z_score=z,
                severity=severity,
            ))
        return out

    # ---- loaders ----------------------------------------------------------
    async def _malaria_observed(self, month: date) -> dict[UUID, float]:
        rows = (
            await self.db.execute(
                select(MalariaData.district_id, MalariaData.positive).where(and_(
                    MalariaData.year == month.year,
                    MalariaData.month == month.month,
                    MalariaData.week.is_(None),
                ))
            )
        ).all()
        return {r[0]: float(r[1]) for r in rows}

    async def _malaria_baseline(self, month: date) -> dict[UUID, list[float]]:
        baseline_years = [month.year - i for i in range(1, BASELINE_YEARS + 1)]
        rows = (
            await self.db.execute(
                select(MalariaData.district_id, MalariaData.positive).where(and_(
                    MalariaData.year.in_(baseline_years),
                    MalariaData.month == month.month,
                    MalariaData.week.is_(None),
                ))
            )
        ).all()
        baseline: dict[UUID, list[float]] = {}
        for did, value in rows:
            baseline.setdefault(did, []).append(float(value))
        return baseline

    async def _climate_observed(self, month: date) -> dict[UUID, dict[str, Optional[float]]]:
        first = month.replace(day=1)
        rows = (
            await self.db.execute(
                select(
                    ClimateData.district_id,
                    ClimateData.rainfall,
                    ClimateData.temperature,
                    ClimateData.humidity,
                ).where(and_(
                    ClimateData.date >= first,
                    ClimateData.date < _next_month(first),
                ))
            )
        ).all()
        # If multiple rows per district per month (shouldn't be - unique constraint
        # is on district_id+date), average them.
        agg: dict[UUID, dict[str, list[float]]] = {}
        for did, rain, temp, hum in rows:
            slot = agg.setdefault(did, {"rainfall": [], "temperature": [], "humidity": []})
            if rain is not None: slot["rainfall"].append(float(rain))
            if temp is not None: slot["temperature"].append(float(temp))
            if hum is not None: slot["humidity"].append(float(hum))
        out: dict[UUID, dict[str, Optional[float]]] = {}
        for did, slots in agg.items():
            out[did] = {k: (statistics.fmean(v) if v else None) for k, v in slots.items()}
        return out

    async def _climate_baseline(self, month: date) -> dict[UUID, list[dict[str, float]]]:
        baseline: dict[UUID, list[dict[str, float]]] = {}
        for yr in (month.year - i for i in range(1, BASELINE_YEARS + 1)):
            first = month.replace(year=yr, day=1)
            rows = (
                await self.db.execute(
                    select(
                        ClimateData.district_id,
                        ClimateData.rainfall,
                        ClimateData.temperature,
                        ClimateData.humidity,
                    ).where(and_(
                        ClimateData.date >= first,
                        ClimateData.date < _next_month(first),
                    ))
                )
            ).all()
            for did, rain, temp, hum in rows:
                baseline.setdefault(did, []).append({
                    "rainfall": float(rain) if rain is not None else None,
                    "temperature": float(temp) if temp is not None else None,
                    "humidity": float(hum) if hum is not None else None,
                })
        return baseline


def _next_month(d: date) -> date:
    if d.month == 12:
        return d.replace(year=d.year + 1, month=1, day=1)
    return d.replace(month=d.month + 1, day=1)
