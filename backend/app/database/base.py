from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import create_engine
from app.config import settings

# 1. Async engine for FastAPI (Neon needs 'ssl')
async_connect_args = {"ssl": True} if settings.ENVIRONMENT == "production" else {}
async_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

async_engine = create_async_engine(
    async_url,
    connect_args=async_connect_args,
    echo=settings.DEBUG,
    # Connection pool configuration for production stability
    pool_size=20,              # Base connection pool size
    max_overflow=40,           # Additional connections when pool is exhausted
    pool_timeout=30,           # Seconds to wait for connection from pool
    pool_pre_ping=True,        # Validate connections before using them
    pool_recycle=3600,         # Recycle connections after 1 hour
)

# 2. Sync engine for scripts and migrations
sync_url = settings.DATABASE_URL_SYNC
if settings.ENVIRONMENT == "production" and "?sslmode=" not in sync_url:
    sync_url += "?sslmode=require"

sync_engine = create_engine(
    sync_url,
    echo=settings.DEBUG,
    # Connection pool configuration for sync operations
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_pre_ping=True,
    pool_recycle=3600,
)

# Async session factory
AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine,
)

Base = declarative_base()

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()