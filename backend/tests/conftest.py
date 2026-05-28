"""
Pytest configuration and fixtures for MalaSafe backend tests.
"""

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.main import app
from app.database.base import Base, get_db
from app.models.user import User, UserRole
from app.utils.security import get_password_hash
from app.config import settings
import uuid

# Test database URL (use separate test database)
TEST_DATABASE_URL = settings.DATABASE_URL.replace("/malasafe", "/malasafe_test")

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,  # No connection pooling for tests
    echo=False,
)

# Create test session maker
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a fresh database session for each test.
    
    Creates all tables before the test and drops them after.
    """
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with TestSessionLocal() as session:
        yield session
    
    # Drop all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create an async HTTP client for testing API endpoints.
    
    Overrides the get_db dependency to use the test database.
    """
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
async def test_admin_user(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        full_name="Test Admin",
        password_hash=get_password_hash("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_moh_user(db_session: AsyncSession) -> User:
    """Create a test MOH officer user."""
    user = User(
        id=uuid.uuid4(),
        email="moh@test.com",
        full_name="Test MOH Officer",
        password_hash=get_password_hash("moh123"),
        role=UserRole.MOH_OFFICER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_public_user(db_session: AsyncSession) -> User:
    """Create a test public user."""
    user = User(
        id=uuid.uuid4(),
        email="public@test.com",
        full_name="Test Public User",
        password_hash=get_password_hash("public123"),
        role=UserRole.PUBLIC_USER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_token(client: AsyncClient, test_admin_user: User) -> str:
    """Get authentication token for admin user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
async def moh_token(client: AsyncClient, test_moh_user: User) -> str:
    """Get authentication token for MOH officer."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "moh@test.com", "password": "moh123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
async def public_token(client: AsyncClient, test_public_user: User) -> str:
    """Get authentication token for public user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "public@test.com", "password": "public123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    """Get authorization headers for admin user."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def moh_headers(moh_token: str) -> dict:
    """Get authorization headers for MOH officer."""
    return {"Authorization": f"Bearer {moh_token}"}


@pytest.fixture
def public_headers(public_token: str) -> dict:
    """Get authorization headers for public user."""
    return {"Authorization": f"Bearer {public_token}"}
