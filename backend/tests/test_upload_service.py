"""
Unit tests for UploadService.
"""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from app.models import ClimateData, MalariaData
from app.services.upload_service import UploadService


@pytest.mark.unit
@pytest.mark.asyncio
class TestUploadServiceClimate:
    async def test_process_climate_upload_success(
        self,
        db_session,
        test_moh_user,
        test_district,
        valid_climate_csv,
    ):
        service = UploadService(db_session, str(test_moh_user.id))

        success, message, processed, created, skipped, errors, file_id, *_rest = (
            await service.process_climate_upload(valid_climate_csv, "climate.csv")
        )

        assert success is True
        assert created == 1
        assert processed == 1
        assert file_id is not None
        assert "Successfully uploaded" in message

        rows = (await db_session.execute(select(ClimateData))).scalars().all()
        assert len(rows) == 1
        assert rows[0].rainfall == pytest.approx(145.2)

    async def test_process_climate_upload_invalid_district(
        self,
        db_session,
        test_moh_user,
    ):
        service = UploadService(db_session, str(test_moh_user.id))
        csv_bytes = (
            b"district_code,date,rainfall,temperature\n"
            b"INVALID_CODE,2024-08-01,100.0,25.0\n"
        )

        success, _message, _processed, created, _skipped, errors, *_rest = (
            await service.process_climate_upload(csv_bytes, "climate.csv")
        )

        assert success is False
        assert created == 0
        assert len(errors) == 1
        assert "Invalid district code" in errors[0]["error"]

    async def test_process_climate_upload_rejects_missing_columns(
        self,
        db_session,
        test_moh_user,
        invalid_climate_csv,
    ):
        service = UploadService(db_session, str(test_moh_user.id))

        success, message, processed, created, *_rest = await service.process_climate_upload(
            invalid_climate_csv,
            "bad.csv",
        )

        assert success is False
        assert created == 0
        assert processed == 0
        assert "CSV validation failed" in message


@pytest.mark.unit
@pytest.mark.asyncio
class TestUploadServiceMalaria:
    async def test_dry_run_validate_monthly_parses_valid_csv(
        self,
        db_session,
        test_moh_user,
        valid_malaria_csv,
    ):
        service = UploadService(db_session, str(test_moh_user.id))
        preview = await service.dry_run_validate_monthly(valid_malaria_csv, "malaria.csv")

        assert preview.summary.total_rows == 1
        assert preview.summary.valid_rows == 0  # org-unit mapping unavailable in test schema
        assert preview.summary.skipped_rows >= 1

    async def test_dry_run_rejects_invalid_file(self, db_session, test_moh_user):
        service = UploadService(db_session, str(test_moh_user.id))
        preview = await service.dry_run_validate_monthly(b"not,a,csv\n1,2", "bad.csv")

        assert preview.summary.total_rows == 0
        assert len(preview.file_errors) >= 1

    async def test_process_monthly_malaria_upload_with_mocked_orgunit(
        self,
        db_session,
        test_moh_user,
        test_district,
        valid_malaria_csv,
    ):
        service = UploadService(db_session, str(test_moh_user.id))
        service.orgunit_mapper.validate = AsyncMock(
            return_value=(True, test_district.id, None)
        )
        service.orgunit_mapper._loaded = True
        service.orgunit_mapper._has_orgunit_column = True

        success, message, processed, created, skipped, errors, file_id, *_rest = (
            await service.process_monthly_malaria_upload(valid_malaria_csv, "malaria.csv")
        )

        assert processed == 1
        assert created == 1
        assert file_id is not None
        assert "Successfully uploaded" in message

        rows = (await db_session.execute(select(MalariaData))).scalars().all()
        assert len(rows) == 1
        assert rows[0].positive == 25
        assert rows[0].district_id == test_district.id
