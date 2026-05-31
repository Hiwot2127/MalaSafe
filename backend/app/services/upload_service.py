"""
Service for handling CSV uploads and data processing.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models import MalariaData, ClimateData, UploadedFile, District, MonthlyClose
from app.utils.csv_parser import MalariaCSVParser, ClimateCSVParser
from app.utils.district_mapper import DistrictMapper
from app.utils.season_generator import SeasonGenerator
from app.config import settings
from app.schemas.upload import (
    UploadPreviewResponse,
    UploadPreviewSummary,
    UploadPreviewRow,
    UploadError,
)
from typing import Any, Tuple, List, Dict, Optional, Set
import asyncio
import hashlib
import pandas as pd
import time
import uuid
from datetime import date, datetime
from loguru import logger


def _now_ms() -> int:
    return int(time.perf_counter() * 1000)


def _stage(name: str, status: str, started_ms: int, *, count: Optional[int] = None,
           detail: Optional[str] = None) -> Dict[str, Any]:
    """Build a StageResult-shaped dict for the response timeline."""
    return {
        "name": name,
        "status": status,
        "count": count,
        "duration_ms": _now_ms() - started_ms,
        "detail": detail,
    }


_PREVIEW_SAMPLE_LIMIT = 50  # rows shown in the modal's Valid tab


def _jsonable(v: Any) -> Any:
    """Convert a pandas/NumPy cell to a JSON-safe scalar for `row_data` payloads."""
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    # Coerce numpy scalars to Python natives.
    if hasattr(v, "item"):
        try:
            return v.item()
        except (ValueError, TypeError):
            pass
    return v if isinstance(v, (str, int, float, bool)) else str(v)


class OrgUnitMapper:
    """Maps DHIS2 `organisationunitid` strings to internal `District.id` UUIDs.

    Embedded inline (rather than in a new util file) to keep this phase's edit
    surface to the 4 files in scope. Will graduate to `app/utils/` once the
    Phase A schema migration adds `District.organisationunitid`.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._loaded = False
        self._by_orgunit: Dict[str, Any] = {}
        self._has_orgunit_column = hasattr(District, "organisationunitid")

    async def load(self) -> None:
        """Load all districts and index by organisationunitid.

        # TODO(phase-a): switch from district_name fallback to
        # districts.organisationunitid once Phase A adds the column.
        """
        if self._loaded:
            return
        result = await self.db.execute(select(District))
        rows = result.scalars().all()
        if self._has_orgunit_column:
            for d in rows:
                ou = getattr(d, "organisationunitid", None)
                if ou:
                    self._by_orgunit[str(ou).strip()] = d.id
        else:
            logger.warning(
                "OrgUnitMapper: District model has no organisationunitid column — "
                "all rows will fail validation until Phase A migration lands."
            )
        self._loaded = True

    async def validate(self, orgunitid: str) -> Tuple[bool, Optional[Any], Optional[str]]:
        """Resolve an orgunitid to (is_valid, district_id, error_msg).

        # TODO(phase-a): fallback path always fails until District.organisationunitid exists.
        """
        await self.load()
        key = (orgunitid or "").strip()
        if not key:
            return False, None, "organisationunitid is empty"
        if not self._has_orgunit_column:
            return False, None, (
                "organisationunitid mapping unavailable: districts table has no "
                "organisationunitid column. Phase A migration required."
            )
        if key in self._by_orgunit:
            return True, self._by_orgunit[key], None
        return False, None, f"Unknown organisationunitid: {key}"


class UploadService:
    """Service for processing CSV uploads."""
    
    def __init__(self, db: AsyncSession, user_id: str):
        """
        Initialize upload service.
        
        Args:
            db: Database session
            user_id: ID of user performing upload
        """
        self.db = db
        self.user_id = user_id
        # Climate uploads still use the legacy code-based DistrictMapper.
        self.district_mapper = DistrictMapper(db)
        # Malaria monthly uploads use the new DHIS2 org-unit mapper.
        self.orgunit_mapper = OrgUnitMapper(db)
    
    async def _validate_monthly_rows(
        self,
        df: pd.DataFrame,
        row_errors: List[Dict],
    ) -> Tuple[List[Dict], List[Dict], List[Dict], int]:
        """Aggregate monthly rows to woreda-month, run org-unit + dup checks.

        Shared between the real upload path and the dry-run preview path so both
        produce identical outcomes.

        Returns:
            (records_to_create, validation_errors_excluding_dups, duplicate_errors,
             skipped_count)
        """
        await self.orgunit_mapper.load()

        bad_rows: Set[int] = {int(e["row"]) for e in row_errors if "row" in e}
        validation_errors: List[Dict] = list(row_errors)
        duplicate_errors: List[Dict] = []
        records_to_create: List[Dict] = []
        # Each bad parser row contributes one skipped record (pre-aggregation count).
        skipped_count = len(bad_rows)

        # Drop bad rows (NaN month/year) before aggregating so they don't
        # contaminate the (orgunitid, year, month) groups.
        if bad_rows:
            keep_mask = ~df.index.to_series().add(2).isin(bad_rows)
            clean_df = df.loc[keep_mask]
        else:
            clean_df = df
        clean_df = clean_df.dropna(subset=['organisationunitid', 'month', 'year'])

        if clean_df.empty:
            return records_to_create, validation_errors, duplicate_errors, skipped_count

        # Aggregate facility rows to woreda-month grain (mirrors
        # scripts/seed_malaria_history.py's rollup behaviour).
        agg = (
            clean_df
            .assign(
                organisationunitid=clean_df['organisationunitid'].astype(str).str.strip(),
                month=clean_df['month'].astype(int),
                year=clean_df['year'].astype(int),
            )
            .groupby(['organisationunitid', 'year', 'month'], as_index=False)
            .agg(positive=('positive', 'sum'),
                 tests=('tests', 'sum'),
                 travel=('travel', 'sum'))
        )

        for _, row in agg.iterrows():
            orgunitid = str(row['organisationunitid']).strip()
            month = int(row['month'])
            year = int(row['year'])

            is_valid, district_id, error_msg = await self.orgunit_mapper.validate(orgunitid)
            if not is_valid:
                validation_errors.append({
                    "row": 0,  # aggregated row — original row index no longer applies
                    "column": "organisationunitid",
                    "value": orgunitid,
                    "error": error_msg,
                    "row_data": {
                        "organisationunitid": orgunitid,
                        "month": month,
                        "year": year,
                    },
                })
                skipped_count += 1
                continue

            existing = await self.db.execute(
                select(MalariaData).where(and_(
                    MalariaData.district_id == district_id,
                    MalariaData.month == month,
                    MalariaData.year == year,
                    MalariaData.week.is_(None),
                ))
            )
            if existing.scalar_one_or_none():
                duplicate_errors.append({
                    "row": 0,
                    "column": "duplicate",
                    "value": f"{orgunitid}, {month}/{year}",
                    "error": "Duplicate record already exists",
                    "row_data": {
                        "organisationunitid": orgunitid,
                        "month": month,
                        "year": year,
                    },
                })
                skipped_count += 1
                continue

            records_to_create.append({
                "district_id": district_id,
                "source_type": "file_upload",
                "week": None,
                "month": month,
                "year": year,
                "positive": int(row['positive']),
                "tests": int(row['tests']),
                "travel": int(row['travel']),
                "uploaded_by": self.user_id,
            })

        return records_to_create, validation_errors, duplicate_errors, skipped_count

    async def process_monthly_malaria_upload(
        self,
        file_content: bytes,
        filename: str
    ) -> Tuple[bool, str, int, int, int, List[Dict], Optional[str], Optional[str], Optional[str], List[Dict]]:
        """
        Process monthly malaria data upload.

        Returns:
            10-tuple: (success, message, processed, created, skipped, errors, file_id,
                       monthly_close_id, monthly_close_mode, stages).
            When settings.MONTHLY_CLOSE_ENABLED is True, also creates a MonthlyClose
            row and dispatches the closing pipeline; mode is 'close' for
            <= MONTHLY_CLOSE_MAX_MONTHS distinct months, otherwise 'backfill'.
        """
        stages: List[Dict[str, Any]] = []

        # Parse CSV
        t0 = _now_ms()
        df, file_errors, row_errors = MalariaCSVParser.parse_monthly_data(file_content)
        if df is None or file_errors:
            stages.append(_stage("parse", "failed", t0,
                                 detail=file_errors[0].get("error") if file_errors else "empty"))
            return False, "CSV validation failed", 0, 0, 0, file_errors, None, None, None, stages
        stages.append(_stage("parse", "ok", t0, count=len(df)))

        # Validate + collect rows (shared with dry_run_validate_monthly).
        t_validate = _now_ms()
        records_to_create, validation_errors, duplicate_errors, skipped_count = \
            await self._validate_monthly_rows(df, row_errors)
        validation_errors = validation_errors + duplicate_errors
        stages.append(_stage(
            "validate", "ok", t_validate, count=len(df),
            detail=f"{len(records_to_create)} valid, {skipped_count} skipped"
        ))

        # Save records with transaction rollback on failure
        t_insert = _now_ms()
        created_count = 0
        if records_to_create:
            try:
                # Use explicit transaction for atomic insert
                async with self.db.begin_nested():
                    for record_data in records_to_create:
                        record = MalariaData(**record_data)
                        self.db.add(record)
                        created_count += 1
                    # Commit the nested transaction
                    await self.db.flush()
                # Commit the outer transaction
                await self.db.commit()
            except Exception as e:
                # Rollback on any error
                await self.db.rollback()
                logger.error(f"Failed to insert malaria records: {e}")
                stages.append(_stage("insert", "failed", t_insert, detail=str(e)))
                return False, f"Database insert failed: {str(e)}", len(df), 0, skipped_count, validation_errors, None, None, None, stages
        stages.append(_stage("insert", "ok", t_insert, count=created_count))

        # Branch hints for downstream orchestration: distinct (year, month) pairs.
        # Drop rows the parser couldn't resolve (NaN month/year) before deriving spans.
        df_resolved = df.dropna(subset=['month', 'year'])
        distinct_months: List[Tuple[int, int]] = sorted(
            {(int(r['year']), int(r['month'])) for _, r in df_resolved.iterrows()}
        )
        month_span = len(distinct_months)
        # Distinct DHIS2 org units in the upload — used to gate whether this
        # upload counts as an "official monthly close batch" worth running
        # the country-wide forecast refresh against.
        distinct_districts = {
            str(r['organisationunitid']).strip()
            for _, r in df_resolved.iterrows()
            if r.get('organisationunitid') is not None
        }
        district_span = len(distinct_districts)

        # Save file metadata with branch hints stamped on it.
        file_id = await self._save_file_metadata(
            filename, "malaria_monthly", row_count=len(df), month_span=month_span
        )

        # Dispatch the monthly close pipeline if enabled. Failures here must not
        # roll back the malaria_data inserts - the rows are valuable on their own.
        #
        # Also gate on `district_span >= MONTHLY_CLOSE_MIN_DISTRICTS`: a tiny
        # upload (template CSV, single-district fix-up) shouldn't kick off a
        # full ~1,082-district re-prediction. Without this gate, uploading the
        # 4-row template wipes the visible recent-cases column for every other
        # district (their predictions get rewritten on stale features and the
        # UI shows 0 cases for the new prediction period — see Issue 3 in the
        # plan).
        t_dispatch = _now_ms()
        monthly_close_id: Optional[str] = None
        monthly_close_mode: Optional[str] = None
        if settings.MONTHLY_CLOSE_ENABLED and created_count > 0 and district_span >= settings.MONTHLY_CLOSE_MIN_DISTRICTS:
            try:
                monthly_close_id, monthly_close_mode = await self._dispatch_monthly_close(
                    uploaded_file_id=file_id,
                    distinct_months=distinct_months,
                )
                stages.append(_stage(
                    "dispatch_close", "ok", t_dispatch,
                    detail=f"{monthly_close_mode} mode, {month_span} month(s), {district_span} districts"
                ))
            except Exception as exc:  # pragma: no cover - best-effort dispatch
                logger.warning(
                    f"Monthly close dispatch failed for file {file_id}: {exc}. "
                    "Malaria rows landed; close pipeline will need manual replay."
                )
                stages.append(_stage("dispatch_close", "failed", t_dispatch, detail=str(exc)))
        else:
            if not settings.MONTHLY_CLOSE_ENABLED:
                skip_reason = "MONTHLY_CLOSE_ENABLED is off"
            elif created_count == 0:
                skip_reason = "no rows created"
            else:
                skip_reason = (
                    f"only {district_span} district(s) in upload (< "
                    f"{settings.MONTHLY_CLOSE_MIN_DISTRICTS} required for full close); "
                    "rows landed, model refresh skipped"
                )
                logger.info(
                    f"Skipping monthly close dispatch: {skip_reason} "
                    f"(file_id={file_id})"
                )
            stages.append(_stage(
                "dispatch_close", "skipped", t_dispatch,
                detail=skip_reason,
            ))

        success = len(validation_errors) == 0
        message = (
            f"Successfully uploaded {created_count} records" if success
            else f"Uploaded {created_count} records with {len(validation_errors)} errors"
        )

        return (
            success, message, len(df), created_count, skipped_count,
            validation_errors, str(file_id), monthly_close_id, monthly_close_mode, stages,
        )

    async def dry_run_validate_monthly(
        self,
        file_content: bytes,
        filename: str,
    ) -> UploadPreviewResponse:
        """Validate a monthly malaria CSV without writing anything.

        Powers `POST /uploads/malaria/monthly/preview` - the modal preview shows
        exactly what would happen if the user clicked Confirm.
        """
        df, file_errors, row_errors = MalariaCSVParser.parse_monthly_data(file_content)
        if df is None or file_errors:
            return UploadPreviewResponse(
                summary=UploadPreviewSummary(
                    total_rows=0, valid_rows=0, skipped_rows=0, duplicate_rows=0,
                    distinct_months=[], predicted_mode=None,
                ),
                file_errors=[UploadError(**e) for e in file_errors],
            )

        records_to_create, validation_errors, duplicate_errors, skipped_count = \
            await self._validate_monthly_rows(df, row_errors)

        # Drop unresolved rows before deriving distinct months (parser NaN-fills bad rows).
        df_resolved = df.dropna(subset=['month', 'year'])
        distinct_months: List[Tuple[int, int]] = sorted(
            {(int(r['year']), int(r['month'])) for _, r in df_resolved.iterrows()}
        )
        month_strs = [f"{y:04d}-{m:02d}" for (y, m) in distinct_months]
        predicted_mode = "close" if len(distinct_months) <= settings.MONTHLY_CLOSE_MAX_MONTHS else "backfill"

        # Build valid_sample (first N valid rows) from the records_to_create list.
        # Reconstruct minimal display dicts; we don't expose internal district_id UUIDs.
        valid_sample: List[UploadPreviewRow] = []
        for rec in records_to_create[:_PREVIEW_SAMPLE_LIMIT]:
            valid_sample.append(UploadPreviewRow(
                row_number=0,  # row index isn't preserved at this stage; UI doesn't need it for the Valid tab
                data={
                    "month": rec["month"],
                    "year": rec["year"],
                    "positive": rec["positive"],
                    "tests": rec["tests"],
                    "travel": rec["travel"],
                },
            ))

        return UploadPreviewResponse(
            summary=UploadPreviewSummary(
                total_rows=int(len(df)),
                valid_rows=len(records_to_create),
                skipped_rows=skipped_count - len(duplicate_errors),
                duplicate_rows=len(duplicate_errors),
                distinct_months=month_strs,
                predicted_mode=predicted_mode,
            ),
            valid_sample=valid_sample,
            invalid_rows=[UploadError(**e) for e in validation_errors],
            duplicate_rows=[UploadError(**e) for e in duplicate_errors],
            file_errors=[],
        )
    
    async def process_climate_upload(
        self,
        file_content: bytes,
        filename: str
    ) -> Tuple[bool, str, int, int, int, List[Dict], Optional[str], Optional[str], Optional[str], List[Dict]]:
        """
        Process climate data upload.

        Returns:
            10-tuple: (success, message, processed, created, skipped, errors, file_id,
                       monthly_close_id, monthly_close_mode, stages).
            Climate uploads never dispatch the monthly close pipeline; the close
            slots are always None. `stages` carries the pipeline timeline.
        """
        stages: List[Dict[str, Any]] = []

        # Parse CSV
        t0 = _now_ms()
        df, file_errors, row_errors = ClimateCSVParser.parse_climate_data(file_content)
        if df is None or file_errors:
            stages.append(_stage("parse", "failed", t0,
                                 detail=file_errors[0].get("error") if file_errors else "empty"))
            return False, "CSV validation failed", 0, 0, 0, file_errors, None, None, None, stages
        stages.append(_stage("parse", "ok", t0, count=len(df)))

        # Load districts
        await self.district_mapper.load_districts()

        # Validate + collect rows. Rows already flagged by the parser are skipped.
        t_validate = _now_ms()
        bad_rows: Set[int] = {int(e["row"]) for e in row_errors if "row" in e}
        validation_errors: List[Dict] = list(row_errors)
        records_to_create: List[Dict] = []
        skipped_count = len(bad_rows)

        for idx, row in df.iterrows():
            row_num = idx + 2
            if row_num in bad_rows:
                continue
            district_code = str(row['district_code']).strip()

            is_valid, district_id, error_msg = await self.district_mapper.validate_district_code(district_code)
            if not is_valid:
                validation_errors.append({
                    "row": row_num, "column": "district_code",
                    "value": district_code, "error": error_msg,
                })
                skipped_count += 1
                continue

            try:
                date_value = pd.to_datetime(row['date']).date()
            except Exception as e:
                validation_errors.append({
                    "row": row_num, "column": "date",
                    "value": str(row['date']),
                    "error": f"Invalid date format: {str(e)}",
                })
                skipped_count += 1
                continue

            season = SeasonGenerator.get_season_from_date(date_value)

            existing = await self.db.execute(
                select(ClimateData).where(and_(
                    ClimateData.district_id == district_id,
                    ClimateData.date == date_value,
                ))
            )
            if existing.scalar_one_or_none():
                validation_errors.append({
                    "row": row_num, "column": "duplicate",
                    "value": f"{district_code}, {date_value}",
                    "error": "Duplicate record already exists",
                })
                skipped_count += 1
                continue

            records_to_create.append({
                "district_id": district_id,
                "rainfall": float(row['rainfall']),
                "temperature": float(row['temperature']),
                "season": season,
                "date": date_value,
            })
        stages.append(_stage(
            "validate", "ok", t_validate, count=len(df),
            detail=f"{len(records_to_create)} valid, {skipped_count} skipped",
        ))

        # Save records
        t_insert = _now_ms()
        created_count = 0
        if records_to_create:
            for record_data in records_to_create:
                record = ClimateData(**record_data)
                self.db.add(record)
                created_count += 1
            await self.db.commit()
        stages.append(_stage("insert", "ok", t_insert, count=created_count))

        # Save file metadata
        file_id = await self._save_file_metadata(filename, "climate_data", row_count=len(df))

        success = len(validation_errors) == 0
        message = (
            f"Successfully uploaded {created_count} records" if success
            else f"Uploaded {created_count} records with {len(validation_errors)} errors"
        )

        return (
            success, message, len(df), created_count, skipped_count,
            validation_errors, str(file_id), None, None, stages,
        )

    async def _save_file_metadata(
        self,
        filename: str,
        upload_type: str,
        *,
        row_count: Optional[int] = None,
        month_span: Optional[int] = None,
    ) -> uuid.UUID:
        """
        Save uploaded file metadata.

        Args:
            filename: Original filename
            upload_type: Type of upload
            row_count: Parsed row count (for orchestration branching).
            month_span: Distinct (year, month) tuples in the upload.

        Returns:
            File ID
        """
        file_record = UploadedFile(
            file_name=filename,
            upload_type=upload_type,
            row_count=row_count,
            month_span=month_span,
            uploaded_by=self.user_id
        )

        self.db.add(file_record)
        await self.db.commit()
        await self.db.refresh(file_record)

        logger.info(f"Saved file metadata: {filename} ({upload_type}) by user {self.user_id}")

        return file_record.id

    async def _dispatch_monthly_close(
        self,
        *,
        uploaded_file_id: uuid.UUID,
        distinct_months: List[Tuple[int, int]],
    ) -> Tuple[Optional[str], Optional[str]]:
        """Create a MonthlyClose row and dispatch the closing pipeline.

        Idempotent on (uploaded_file_id, distinct_months). If a row with the
        same idempotency_key already exists and is not in a terminal failure
        state, returns the existing id without re-dispatching.

        Returns:
            (monthly_close_id_str, mode_str) - both None on hard failure.
        """
        if not distinct_months:
            return None, None

        # Pick the mode + "month" anchor (latest month in the upload - the
        # close run is "about" that month for backtest + next-prediction).
        mode = "close" if len(distinct_months) <= settings.MONTHLY_CLOSE_MAX_MONTHS else "backfill"
        anchor_year, anchor_month = distinct_months[-1]
        anchor_date = date(anchor_year, anchor_month, 1)

        # Idempotency key: derive from upload + months. Same upload retried
        # by the worker won't double-create a close row.
        months_csv = ",".join(f"{y:04d}-{m:02d}" for (y, m) in distinct_months)
        idem_key = hashlib.sha256(f"{uploaded_file_id}:{months_csv}".encode("utf-8")).hexdigest()

        existing_q = await self.db.execute(
            select(MonthlyClose).where(MonthlyClose.idempotency_key == idem_key)
        )
        existing = existing_q.scalar_one_or_none()
        if existing is not None and existing.status != "failed":
            logger.info(
                f"Monthly close already exists for idem_key={idem_key[:12]}…: "
                f"returning {existing.id} (status={existing.status})"
            )
            return str(existing.id), existing.mode

        close = MonthlyClose(
            month=anchor_date,
            uploaded_file_id=uploaded_file_id,
            triggered_by_user_id=uuid.UUID(self.user_id) if self.user_id else None,
            mode=mode,
            status="pending",
            idempotency_key=idem_key,
        )
        self.db.add(close)
        await self.db.commit()
        await self.db.refresh(close)

        # In-process orchestration via asyncio.create_task — the route has
        # already returned by the time the pipeline starts running, and
        # climate fetch is IO-bound so it won't starve the request loop.
        # Both modes go through monthly_close.run, which delegates to
        # _orchestrate; the backfill branch in there marks the close
        # complete + dispatches the retrain stub.
        from app.tasks.monthly_close import run as run_close
        asyncio.create_task(run_close(str(close.id)))
        logger.info(
            f"MonthlyClose {close.id} dispatched in-process "
            f"(mode={mode}, month={anchor_date}, span={len(distinct_months)})."
        )

        return str(close.id), mode
