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
from typing import Tuple, List, Dict, Optional
import hashlib
import pandas as pd
import uuid
from datetime import date, datetime
from loguru import logger


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
        self.district_mapper = DistrictMapper(db)
    
    async def process_weekly_malaria_upload(
        self,
        file_content: bytes,
        filename: str
    ) -> Tuple[bool, str, int, int, int, List[Dict], Optional[str], Optional[str], Optional[str]]:
        """
        Process weekly malaria data upload.

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            Tuple of (success, message, processed, created, skipped, errors, file_id,
                     monthly_close_id, monthly_close_mode).
            Weekly uploads never dispatch the monthly close pipeline, so the last
            two are always None.
        """
        # Parse CSV
        df, parse_errors = MalariaCSVParser.parse_weekly_data(file_content)

        if df is None or parse_errors:
            return False, "CSV validation failed", 0, 0, 0, parse_errors, None, None, None
        
        # Load districts
        await self.district_mapper.load_districts()
        
        # Validate district codes and collect data
        records_to_create = []
        validation_errors = []
        skipped_count = 0
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            district_code = str(row['district_code']).strip()
            
            # Validate district
            is_valid, district_id, error_msg = await self.district_mapper.validate_district_code(district_code)
            
            if not is_valid:
                validation_errors.append({
                    "row": row_num,
                    "column": "district_code",
                    "value": district_code,
                    "error": error_msg
                })
                skipped_count += 1
                continue
            
            # Check for duplicates
            week = int(row['week'])
            year = int(row['year'])
            
            existing = await self.db.execute(
                select(MalariaData).where(
                    and_(
                        MalariaData.district_id == district_id,
                        MalariaData.week == week,
                        MalariaData.year == year
                    )
                )
            )
            
            if existing.scalar_one_or_none():
                validation_errors.append({
                    "row": row_num,
                    "column": "duplicate",
                    "value": f"{district_code}, Week {week}, {year}",
                    "error": "Duplicate record already exists"
                })
                skipped_count += 1
                continue
            
            # Prepare record
            records_to_create.append({
                "district_id": district_id,
                "source_type": "file_upload",
                "week": week,
                "month": None,  # Weekly data doesn't have month
                "year": year,
                "cases": int(row['cases']),
                "deaths": int(row['deaths']),
                "uploaded_by": self.user_id
            })
        
        # Save records
        created_count = 0
        if records_to_create:
            for record_data in records_to_create:
                record = MalariaData(**record_data)
                self.db.add(record)
                created_count += 1
            
            await self.db.commit()
        
        # Save file metadata
        file_id = await self._save_file_metadata(filename, "malaria_weekly", row_count=len(df))

        success = len(validation_errors) == 0
        message = f"Successfully uploaded {created_count} records" if success else f"Uploaded {created_count} records with {len(validation_errors)} errors"

        return success, message, len(df), created_count, skipped_count, validation_errors, str(file_id), None, None

    async def process_monthly_malaria_upload(
        self,
        file_content: bytes,
        filename: str
    ) -> Tuple[bool, str, int, int, int, List[Dict], Optional[str], Optional[str], Optional[str]]:
        """
        Process monthly malaria data upload.

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            Tuple of (success, message, processed, created, skipped, errors, file_id,
                     monthly_close_id, monthly_close_mode).
            When settings.MONTHLY_CLOSE_ENABLED is True, the upload also creates a
            MonthlyClose row and dispatches the closing pipeline; mode is 'close'
            for <= MONTHLY_CLOSE_MAX_MONTHS distinct months, otherwise 'backfill'.
        """
        # Parse CSV
        df, parse_errors = MalariaCSVParser.parse_monthly_data(file_content)

        if df is None or parse_errors:
            return False, "CSV validation failed", 0, 0, 0, parse_errors, None, None, None

        has_tests = 'tests' in df.columns
        
        # Load districts
        await self.district_mapper.load_districts()
        
        # Validate district codes and collect data
        records_to_create = []
        validation_errors = []
        skipped_count = 0
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            district_code = str(row['district_code']).strip()
            
            # Validate district
            is_valid, district_id, error_msg = await self.district_mapper.validate_district_code(district_code)
            
            if not is_valid:
                validation_errors.append({
                    "row": row_num,
                    "column": "district_code",
                    "value": district_code,
                    "error": error_msg
                })
                skipped_count += 1
                continue
            
            # Check for duplicates
            month = int(row['month'])
            year = int(row['year'])
            
            existing = await self.db.execute(
                select(MalariaData).where(
                    and_(
                        MalariaData.district_id == district_id,
                        MalariaData.month == month,
                        MalariaData.year == year,
                        MalariaData.week.is_(None)  # Monthly records have no week
                    )
                )
            )
            
            if existing.scalar_one_or_none():
                validation_errors.append({
                    "row": row_num,
                    "column": "duplicate",
                    "value": f"{district_code}, {month}/{year}",
                    "error": "Duplicate record already exists"
                })
                skipped_count += 1
                continue
            
            # Optional `tests` column — closes model card caveat #6 when officers report it.
            tests_value: Optional[int] = None
            if has_tests:
                raw_tests = row.get('tests')
                if pd.notna(raw_tests):
                    try:
                        tests_value = int(float(raw_tests))
                    except (ValueError, TypeError):
                        tests_value = None

            # Prepare record
            records_to_create.append({
                "district_id": district_id,
                "source_type": "file_upload",
                "week": None,
                "month": month,
                "year": year,
                "cases": int(row['cases']),
                "deaths": int(row['deaths']),
                "tests": tests_value,
                "uploaded_by": self.user_id
            })

        # Save records
        created_count = 0
        if records_to_create:
            for record_data in records_to_create:
                record = MalariaData(**record_data)
                self.db.add(record)
                created_count += 1

            await self.db.commit()

        # Branch hints for downstream orchestration: distinct (year, month) pairs.
        distinct_months: List[Tuple[int, int]] = sorted(
            {(int(r['year']), int(r['month'])) for _, r in df.iterrows()}
        )
        month_span = len(distinct_months)

        # Save file metadata with branch hints stamped on it.
        file_id = await self._save_file_metadata(
            filename, "malaria_monthly", row_count=len(df), month_span=month_span
        )

        # Dispatch the monthly close pipeline if enabled. Failures here must not
        # roll back the malaria_data inserts — the rows are valuable on their own.
        monthly_close_id: Optional[str] = None
        monthly_close_mode: Optional[str] = None
        if settings.MONTHLY_CLOSE_ENABLED and created_count > 0:
            try:
                monthly_close_id, monthly_close_mode = await self._dispatch_monthly_close(
                    uploaded_file_id=file_id,
                    distinct_months=distinct_months,
                )
            except Exception as exc:  # pragma: no cover — best-effort dispatch
                logger.warning(
                    f"Monthly close dispatch failed for file {file_id}: {exc}. "
                    "Malaria rows landed; close pipeline will need manual replay."
                )

        success = len(validation_errors) == 0
        message = f"Successfully uploaded {created_count} records" if success else f"Uploaded {created_count} records with {len(validation_errors)} errors"

        return success, message, len(df), created_count, skipped_count, validation_errors, str(file_id), monthly_close_id, monthly_close_mode
    
    async def process_climate_upload(
        self,
        file_content: bytes,
        filename: str
    ) -> Tuple[bool, str, int, int, int, List[Dict], Optional[str], Optional[str], Optional[str]]:
        """
        Process climate data upload.

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            Tuple of (success, message, processed, created, skipped, errors, file_id,
                     monthly_close_id, monthly_close_mode).
            Climate uploads never dispatch the monthly close pipeline, so the last
            two are always None.
        """
        # Parse CSV
        df, parse_errors = ClimateCSVParser.parse_climate_data(file_content)

        if df is None or parse_errors:
            return False, "CSV validation failed", 0, 0, 0, parse_errors, None, None, None
        
        # Load districts
        await self.district_mapper.load_districts()
        
        # Validate district codes and collect data
        records_to_create = []
        validation_errors = []
        skipped_count = 0
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            district_code = str(row['district_code']).strip()
            
            # Validate district
            is_valid, district_id, error_msg = await self.district_mapper.validate_district_code(district_code)
            
            if not is_valid:
                validation_errors.append({
                    "row": row_num,
                    "column": "district_code",
                    "value": district_code,
                    "error": error_msg
                })
                skipped_count += 1
                continue
            
            # Parse date
            try:
                date_value = pd.to_datetime(row['date']).date()
            except Exception as e:
                validation_errors.append({
                    "row": row_num,
                    "column": "date",
                    "value": str(row['date']),
                    "error": f"Invalid date format: {str(e)}"
                })
                skipped_count += 1
                continue
            
            # Generate season
            season = SeasonGenerator.get_season_from_date(date_value)
            
            # Check for duplicates
            existing = await self.db.execute(
                select(ClimateData).where(
                    and_(
                        ClimateData.district_id == district_id,
                        ClimateData.date == date_value
                    )
                )
            )
            
            if existing.scalar_one_or_none():
                validation_errors.append({
                    "row": row_num,
                    "column": "duplicate",
                    "value": f"{district_code}, {date_value}",
                    "error": "Duplicate record already exists"
                })
                skipped_count += 1
                continue
            
            # Prepare record
            records_to_create.append({
                "district_id": district_id,
                "rainfall": float(row['rainfall']),
                "temperature": float(row['temperature']),
                "season": season,
                "date": date_value
            })
        
        # Save records
        created_count = 0
        if records_to_create:
            for record_data in records_to_create:
                record = ClimateData(**record_data)
                self.db.add(record)
                created_count += 1
            
            await self.db.commit()
        
        # Save file metadata
        file_id = await self._save_file_metadata(filename, "climate_data", row_count=len(df))

        success = len(validation_errors) == 0
        message = f"Successfully uploaded {created_count} records" if success else f"Uploaded {created_count} records with {len(validation_errors)} errors"

        return success, message, len(df), created_count, skipped_count, validation_errors, str(file_id), None, None

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
            (monthly_close_id_str, mode_str) — both None on hard failure.
        """
        if not distinct_months:
            return None, None

        # Pick the mode + "month" anchor (latest month in the upload — the
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

        # Dispatch the orchestrator. Lazy import keeps the Celery task graph
        # decoupled from the request path (and the task module is a Phase 2
        # stub today; Phase 6 fills it in).
        try:
            from app.tasks.celery_app import celery_app
            task_name = (
                "app.tasks.monthly_close.run"
                if mode == "close"
                else "app.tasks.monthly_close.retrain"
            )
            args = [str(close.id)] if mode == "close" else []
            kwargs = {} if mode == "close" else {"reason": "backfill"}
            celery_app.send_task(task_name, args=args, kwargs=kwargs)
            logger.info(
                f"Dispatched {task_name} for MonthlyClose {close.id} "
                f"(mode={mode}, month={anchor_date}, span={len(distinct_months)})"
            )
        except Exception as exc:  # pragma: no cover — broker may be down in dev
            logger.warning(
                f"MonthlyClose {close.id} created but Celery dispatch failed: {exc}. "
                "Row stays in `pending`; a future sweep will pick it up."
            )

        return str(close.id), mode
