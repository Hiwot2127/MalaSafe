"""
Pytest configuration and reusable fixtures for MalaSafe backend tests.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.ai.predictor import PredictionResult
from app.config import settings
from app.database.base import Base, get_db
from app.main import app
from app.models import ClimateData, District, MalariaData, MonthlyClose, Prediction, UploadedFile
from app.models.user import User, UserRole
from app.utils.security import get_password_hash


def _resolve_test_database_url() -> str:
    """Build a dedicated test database URL from env or settings."""
    explicit = os.getenv("TEST_DATABASE_URL")
    if explicit:
        return explicit
    base = settings.DATABASE_URL
    if base.rsplit("/", 1)[-1]:
        return base.rsplit("/", 1)[0] + "/malasafe_test"
    return base + "_test"


TEST_DATABASE_URL = _resolve_test_database_url()

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Session / settings fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def test_settings(request: pytest.FixtureRequest):
    """Disable side effects during tests unless explicitly marked."""
    original_rate_limit = settings.RATE_LIMIT_ENABLED
    original_monthly_close = settings.MONTHLY_CLOSE_ENABLED

    if "rate_limit" not in request.keywords:
        settings.RATE_LIMIT_ENABLED = False
    settings.MONTHLY_CLOSE_ENABLED = False

    yield

    settings.RATE_LIMIT_ENABLED = original_rate_limit
    settings.MONTHLY_CLOSE_ENABLED = original_monthly_close


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------


async def _create_user(
    db_session: AsyncSession,
    *,
    email: str,
    password: str,
    role: UserRole,
    full_name: str | None = None,
    force_password_change: bool = False,
) -> User:
    user = User(
        id=uuid.uuid4(),
        email=email,
        full_name=full_name or email.split("@")[0].title(),
        password_hash=get_password_hash(password),
        role=role,
        is_active=True,
        force_password_change=force_password_change,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_admin_user(db_session: AsyncSession) -> User:
    return await _create_user(
        db_session,
        email="admin@test.com",
        password="Admin123!",
        role=UserRole.ADMIN,
        full_name="Test Admin",
    )


@pytest.fixture
async def test_moh_user(db_session: AsyncSession) -> User:
    return await _create_user(
        db_session,
        email="moh@test.com",
        password="Moh12345!",
        role=UserRole.MOH_OFFICER,
        full_name="Test MOH Officer",
    )


@pytest.fixture
async def test_ephi_user(db_session: AsyncSession) -> User:
    return await _create_user(
        db_session,
        email="ephi@test.com",
        password="Ephi12345!",
        role=UserRole.EPHI_OFFICER,
        full_name="Test EPHI Officer",
    )


@pytest.fixture
async def test_public_user(db_session: AsyncSession) -> User:
    return await _create_user(
        db_session,
        email="public@test.com",
        password="Public123!",
        role=UserRole.PUBLIC_USER,
        full_name="Test Public User",
    )


@pytest.fixture
async def test_forced_password_user(db_session: AsyncSession) -> User:
    return await _create_user(
        db_session,
        email="forced@test.com",
        password="Forced123!",
        role=UserRole.MOH_OFFICER,
        full_name="Forced Password User",
        force_password_change=True,
    )


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------


async def login_and_get_token(client: AsyncClient, email: str, password: str) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
async def admin_token(client: AsyncClient, test_admin_user: User) -> str:
    return await login_and_get_token(client, "admin@test.com", "Admin123!")


@pytest.fixture
async def moh_token(client: AsyncClient, test_moh_user: User) -> str:
    return await login_and_get_token(client, "moh@test.com", "Moh12345!")


@pytest.fixture
async def ephi_token(client: AsyncClient, test_ephi_user: User) -> str:
    return await login_and_get_token(client, "ephi@test.com", "Ephi12345!")


@pytest.fixture
async def public_token(client: AsyncClient, test_public_user: User) -> str:
    return await login_and_get_token(client, "public@test.com", "Public123!")


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def moh_headers(moh_token: str) -> dict:
    return {"Authorization": f"Bearer {moh_token}"}


@pytest.fixture
def ephi_headers(ephi_token: str) -> dict:
    return {"Authorization": f"Bearer {ephi_token}"}


@pytest.fixture
def public_headers(public_token: str) -> dict:
    return {"Authorization": f"Bearer {public_token}"}


# ---------------------------------------------------------------------------
# Domain fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def test_district(db_session: AsyncSession) -> District:
    district = District(
        id=uuid.uuid4(),
        district_code="ET010101",
        district_name="Test Woreda",
        region="Amhara",
        zone="North Wollo",
        adm3_pcode="ET010101",
        latitude=11.5,
        longitude=39.2,
        elevation_m=2100.0,
    )
    db_session.add(district)
    await db_session.commit()
    await db_session.refresh(district)
    return district


@pytest.fixture
async def malaria_history(
    db_session: AsyncSession,
    test_district: District,
    test_moh_user: User,
) -> list[MalariaData]:
    """Six months of malaria history for prediction tests."""
    records: list[MalariaData] = []
    for month in range(1, 7):
        record = MalariaData(
            district_id=test_district.id,
            source_type="test_fixture",
            month=month,
            year=2024,
            positive=40 + month * 8,
            tests=400 + month * 20,
            travel=month,
            uploaded_by=test_moh_user.id,
        )
        db_session.add(record)
        records.append(record)
    await db_session.commit()
    for record in records:
        await db_session.refresh(record)
    return records


@pytest.fixture
async def climate_history(
    db_session: AsyncSession,
    test_district: District,
) -> list[ClimateData]:
    records: list[ClimateData] = []
    for month in range(1, 8):
        record = ClimateData(
            district_id=test_district.id,
            rainfall=80.0 + month * 5,
            temperature=22.0 + month * 0.5,
            date=date(2024, month, 1),
            season="kiremt" if month in (6, 7, 8, 9) else "bega",
            data_source="manual_upload",
            is_provisional=False,
        )
        db_session.add(record)
        records.append(record)
    await db_session.commit()
    for record in records:
        await db_session.refresh(record)
    return records


@pytest.fixture
async def test_prediction(
    db_session: AsyncSession,
    test_district: District,
) -> Prediction:
    prediction = Prediction(
        district_id=test_district.id,
        risk_level="high",
        prediction_score=180.0,
        confidence_score=0.82,
        prediction_reason="Elevated recent cases in test fixture",
        prediction_date=date(2024, 7, 1),
    )
    db_session.add(prediction)
    await db_session.commit()
    await db_session.refresh(prediction)
    return prediction


@pytest.fixture
async def uploaded_file_record(
    db_session: AsyncSession,
    test_moh_user: User,
) -> UploadedFile:
    record = UploadedFile(
        file_name="fixture_upload.csv",
        upload_type="climate_data",
        uploaded_by=test_moh_user.id,
        row_count=1,
    )
    db_session.add(record)
    await db_session.commit()
    await db_session.refresh(record)
    return record


@pytest.fixture
async def monthly_close_record(
    db_session: AsyncSession,
    uploaded_file_record: UploadedFile,
    test_moh_user: User,
) -> MonthlyClose:
    close = MonthlyClose(
        month=date(2024, 6, 1),
        uploaded_file_id=uploaded_file_record.id,
        triggered_by_user_id=test_moh_user.id,
        mode="close",
        status="completed",
        idempotency_key=f"test-close-{uuid.uuid4()}",
        completed_at=datetime.now(timezone.utc),
        stats_json={"predictions_generated": 1},
    )
    db_session.add(close)
    await db_session.commit()
    await db_session.refresh(close)
    return close


# ---------------------------------------------------------------------------
# CSV / ML fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def valid_climate_csv() -> bytes:
    content = (
        "district_code,date,rainfall,temperature\n"
        "ET010101,2024-08-01,145.2,24.8\n"
    )
    return content.encode("utf-8")


@pytest.fixture
def invalid_climate_csv() -> bytes:
    return b"district_code,date\nET010101,2024-08-01\n"


@pytest.fixture
def valid_malaria_csv() -> bytes:
    return (
        "organisationunitid,Eth_Month_Year,Positive,Tests,Travel\n"
        "TEST_ORG_UNIT,Ginbot 2016,25,300,2\n"
    ).encode("utf-8")


@pytest.fixture
def mock_predictor():
    """Lightweight stand-in for the LightGBM predictor in unit tests."""
    predictor = MagicMock()

    def _predict_one(**kwargs):
        target_month = kwargs.get("target_month", date(2024, 7, 1))
        return PredictionResult(
            risk_level="high",
            prediction_score=165.0,
            confidence_score=0.79,
            prediction_reason="Fixture predictor: elevated cases and rainfall",
            is_warm=True,
            target_month=target_month,
        )

    predictor.predict_one.side_effect = _predict_one
    return predictor


@pytest.fixture
def low_risk_predictor():
    predictor = MagicMock()

    def _predict_one(**kwargs):
        target_month = kwargs.get("target_month", date(2024, 7, 1))
        return PredictionResult(
            risk_level="low",
            prediction_score=12.0,
            confidence_score=0.91,
            prediction_reason="Fixture predictor: low risk period",
            is_warm=True,
            target_month=target_month,
        )

    predictor.predict_one.side_effect = _predict_one
    return predictor
