from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.config import settings
from datetime import datetime

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Service liveness probe")
async def health_check():
    """Return basic service status and metadata.

    Use this as a lightweight liveness check (load balancers, Render health checks,
    uptime monitors). Does **not** touch the database — for that, use `/health/db`.

    **Response fields**
    - `status`: always `"healthy"` if the process is up
    - `app_name`, `version`, `environment`: from settings
    - `timestamp`: server UTC time, ISO 8601

    **Auth:** none required.
    """
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/db", summary="Service + database liveness probe")
async def database_health_check(db: AsyncSession = Depends(get_db)):
    """Return service status **and** verify database connectivity.

    Runs a trivial `SELECT 1` against the configured Postgres database.
    Returns `status: "unhealthy"` (still HTTP 200) with the error message
    if the DB query fails — clients should check the `status` field, not
    just the HTTP code.

    **Auth:** none required.
    """
    try:
        # Test database connection
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        
        return {
            "status": "healthy",
            "database": "connected",
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }
