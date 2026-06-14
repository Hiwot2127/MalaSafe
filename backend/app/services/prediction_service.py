"""Prediction service: bridges the LightGBM predictor and the predictions table.

Responsibilities:
  - load the (district, history, climate_history) bundle the predictor needs
  - call the predictor
  - upsert the Prediction row (unique on (district_id, prediction_date))
  - raise an Alert row when risk is high/very_high (best-effort, swallows errors
    so a transient alert-side failure never blocks the prediction itself)
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import MalariaPredictor, PredictionResult
from app.models import District, MalariaData, ClimateData, Prediction
from app.models.alert import Alert as AlertModel


HISTORY_WINDOW_MONTHS = 6
DEFAULT_TESTS_HINT = 200  # used only if no history & no regional median is available


class PredictionService:
    def __init__(self, db: AsyncSession, predictor: MalariaPredictor):
        self.db = db
        self.predictor = predictor

    # ----- one-shot ---------------------------------------------------------
    async def generate_one(self, district_id: UUID, target_month: date,
                            force: bool = False) -> Prediction:
        """Generate prediction for a single district with input validation."""
        # Validate inputs
        if not district_id:
            raise ValueError("district_id cannot be None or empty")
        
        if not target_month:
            raise ValueError("target_month cannot be None")
        
        # Validate target_month is not too far in the past or future
        from datetime import datetime
        current_date = datetime.now().date()
        months_diff = (target_month.year - current_date.year) * 12 + (target_month.month - current_date.month)
        
        if months_diff < -12:
            raise ValueError(f"target_month {target_month} is more than 12 months in the past")
        
        if months_diff > 12:
            raise ValueError(f"target_month {target_month} is more than 12 months in the future")
        
        district = await self._load_district(district_id)
        history = await self._load_malaria_history(district_id, target_month)
        climate = await self._load_climate_history(district_id, target_month)
        tests_hint = self._compute_tests_hint(history)

        existing = await self._existing_prediction(district_id, target_month)
        if existing and not force:
            return existing

        result: PredictionResult = self.predictor.predict_one(
            district=district,
            target_month=target_month,
            malaria_history=history,
            climate_history=climate,
            tests_hint=tests_hint,
            ec_month_name=None,  # not strictly required; ec_month feature is optional
        )

        return await self._persist(district, result, replace_existing=force)

    # ----- batch (called from background task) ------------------------------
    async def generate_batch(self, target_month: date,
                              district_ids: Optional[list[UUID]] = None,
                              force: bool = False) -> int:
        if district_ids is None:
            q = select(District.id).where(District.adm3_pcode.is_not(None))
            district_ids = [row[0] for row in (await self.db.execute(q)).all()]
        n = 0
        for did in district_ids:
            try:
                await self.generate_one(did, target_month, force=force)
                n += 1
            except Exception as e:
                # log + continue; one bad district shouldn't halt the whole batch
                import logging
                logging.getLogger("prediction_service").warning(
                    f"failed for district {did} @ {target_month}: {e}")
        return n

    # ----- internals --------------------------------------------------------
    async def _load_district(self, district_id: UUID) -> District:
        result = await self.db.execute(select(District).where(District.id == district_id))
        d = result.scalar_one_or_none()
        if d is None:
            raise ValueError(f"district {district_id} not found")
        return d

    async def _load_malaria_history(self, district_id: UUID, target_month: date) -> list[MalariaData]:
        # last HISTORY_WINDOW_MONTHS months strictly before target_month
        start_y, start_m = target_month.year, target_month.month
        # compute (year, month) for HISTORY_WINDOW_MONTHS ago
        for _ in range(HISTORY_WINDOW_MONTHS):
            start_m -= 1
            if start_m == 0:
                start_m = 12
                start_y -= 1
        q = (select(MalariaData)
             .where(and_(MalariaData.district_id == district_id,
                          # rows with (year, month) in [(start_y,start_m), target_month - 1m]
                          # SQL idiom: year * 100 + month is monotone for our range
                          (MalariaData.year * 100 + MalariaData.month) >= start_y * 100 + start_m,
                          (MalariaData.year * 100 + MalariaData.month) < target_month.year * 100 + target_month.month))
             .order_by(MalariaData.year, MalariaData.month))
        rows = (await self.db.execute(q)).scalars().all()
        return list(rows)

    async def _load_climate_history(self, district_id: UUID, target_month: date) -> list[ClimateData]:
        # last HISTORY_WINDOW_MONTHS months INCLUDING target_month itself
        # so the feature builder can pick up current-month values too.
        start_y, start_m = target_month.year, target_month.month
        for _ in range(HISTORY_WINDOW_MONTHS):
            start_m -= 1
            if start_m == 0:
                start_m = 12
                start_y -= 1
        start = date(start_y, start_m, 1)
        # exclusive upper bound: first day of (target_month + 1)
        if target_month.month == 12:
            end = date(target_month.year + 1, 1, 1)
        else:
            end = date(target_month.year, target_month.month + 1, 1)
        q = (select(ClimateData)
             .where(and_(ClimateData.district_id == district_id,
                          ClimateData.date >= start,
                          ClimateData.date < end))
             .order_by(ClimateData.date))
        rows = (await self.db.execute(q)).scalars().all()
        return list(rows)

    def _compute_tests_hint(self, history: list[MalariaData]) -> float:
        """Median of last 3 months' Tests, falling back to default.
        
        Returns a validated positive value clamped to reasonable bounds.
        """
        if not history:
            return float(DEFAULT_TESTS_HINT)
        
        recent = history[-3:]
        vals = [float(getattr(m, "tests", 0) or 0) for m in recent]
        vals = [v for v in vals if v > 0]
        
        if vals:
            result = float(sorted(vals)[len(vals) // 2])
            # Clamp to reasonable bounds: minimum 1, maximum 100,000
            return max(min(result, 100000.0), 1.0)
        
        # malaria_data has no Tests column in current schema -> use cases as a hint
        cases = [float(m.positive) for m in recent if m.positive]
        if cases:
            result = max(sum(cases) / len(cases) * 5.0, 50.0)  # rough TPR=20% proxy
            # Clamp to reasonable bounds
            return max(min(result, 100000.0), 1.0)
        
        return float(DEFAULT_TESTS_HINT)

    async def _existing_prediction(self, district_id: UUID, target_month: date) -> Optional[Prediction]:
        q = select(Prediction).where(
            and_(Prediction.district_id == district_id,
                 Prediction.prediction_date == target_month))
        return (await self.db.execute(q)).scalar_one_or_none()

    async def _persist(self, district: District, result: PredictionResult,
                        replace_existing: bool) -> Prediction:
        existing = await self._existing_prediction(district.id, result.target_month)
        if existing:
            if replace_existing:
                existing.risk_level = result.risk_level
                existing.prediction_score = result.prediction_score
                existing.confidence_score = result.confidence_score
                existing.prediction_reason = result.prediction_reason
                await self.db.flush()
                pred = existing
            else:
                return existing
        else:
            pred = Prediction(
                district_id=district.id,
                risk_level=result.risk_level,
                prediction_score=result.prediction_score,
                confidence_score=result.confidence_score,
                prediction_reason=result.prediction_reason,
                prediction_date=result.target_month,
            )
            self.db.add(pred)
            try:
                await self.db.flush()
            except IntegrityError:
                # race condition w/ uq_predictions_district_date - re-fetch and return
                await self.db.rollback()
                return await self._existing_prediction(district.id, result.target_month)

        # Best-effort alert management: create/update for high risk, close for low risk
        try:
            # Check for existing active alert for this district
            existing_alert_q = select(AlertModel).where(
                and_(
                    AlertModel.district_id == district.id,
                    AlertModel.is_active == True
                )
            ).order_by(AlertModel.created_at.desc())
            existing_alert = (await self.db.execute(existing_alert_q)).scalar_one_or_none()
            
            if result.risk_level in ("high", "very_high"):
                # High risk: create or update alert
                message = (f"Predicted {result.risk_level} malaria risk for "
                          f"{result.target_month.isoformat()}: "
                          f"{result.prediction_score:.0f} cases expected. "
                          f"{result.prediction_reason or ''}")
                
                if existing_alert:
                    # Update existing alert if risk level changed or message is significantly different
                    if existing_alert.risk_level != result.risk_level:
                        existing_alert.risk_level = result.risk_level
                        existing_alert.message = message
                        await self.db.flush()
                else:
                    # Create new alert
                    alert = AlertModel(
                        district_id=district.id,
                        risk_level=result.risk_level,
                        message=message,
                        is_active=True,
                    )
                    self.db.add(alert)
                    await self.db.flush()
            else:
                # Low/moderate risk: close any existing active alerts
                if existing_alert:
                    existing_alert.is_active = False
                    existing_alert.resolved_at = date.today()
                    await self.db.flush()
                    
        except Exception:
            import logging
            logging.getLogger("prediction_service").warning(
                f"alert management failed for district {district.id}; continuing")

        return pred
