from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from app.config import settings
from app.middleware import setup_cors
from app.middleware.security_headers import setup_security_headers
from app.middleware.rate_limit import setup_rate_limiting
from app.middleware.request_tracing import setup_request_tracing
from app.monitoring.sentry import setup_sentry
from app.monitoring.logging import setup_structured_logging
from app.routes import (
    health_router,
    auth_router,
    admin_router,
    mobile_router,
    uploads_router,
    analytics_router,
    maps_router,
    predictions_router,
    alerts_router,
    monthly_close_router,
    operations_router,
)
from app.routes.exports import router as exports_router
from loguru import logger
import sys

# Initialize Sentry before creating app
setup_sentry()

# Configure structured logging for production
if settings.ENVIRONMENT == "production":
    setup_structured_logging()
else:
    # Development logging (keep existing loguru config)
    logger.remove()
    logger.add(
        sys.stdout,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
        level=settings.LOG_LEVEL,
    )
    logger.add(
        settings.LOG_FILE,
        rotation="500 MB",
        retention="10 days",
        level=settings.LOG_LEVEL,
    )

# OpenAPI tag metadata — shown as section headers in Swagger UI / ReDoc
openapi_tags = [
    {
        "name": "Health",
        "description": "Service liveness and database connectivity probes. Used by load balancers, Render, and monitoring.",
    },
    {
        "name": "Authentication",
        "description": "JWT login, user creation (admin), current-user lookup. Tokens are bearer JWTs issued by `/auth/login`.",
    },
    {
        "name": "Admin",
        "description": "Admin-only routes for user management, upload monitoring, audit logs, and system health. Admins can create/edit users, reset passwords, and view system metrics but CANNOT access raw CSV contents.",
    },
    {
        "name": "Mobile",
        "description": "Public self-registration for end-users via the mobile app. Always creates `public_user` accounts.",
    },
    {
        "name": "Uploads",
        "description": "CSV ingestion for malaria case data and climate data. Includes preview (dry-run) and downloadable templates.",
    },
    {
        "name": "Analytics",
        "description": "Aggregate dashboards and time-series trends for districts and the country as a whole.",
    },
    {
        "name": "GIS Maps",
        "description": "GeoJSON-flavored risk maps for visualisation on a map UI.",
    },
    {
        "name": "Predictions",
        "description": "On-demand malaria risk predictions for one district or all districts, plus per-district prediction history.",
    },
    {
        "name": "Alerts",
        "description": "High-risk prediction alerts surfaced for the current user (filtered by district / role).",
    },
    {
        "name": "Monthly Close",
        "description": "Operational ML pipeline — month-end close runs that produce next-month forecasts, backtest reports, and drift findings.",
    },
    {
        "name": "Operations",
        "description": "System monitoring, health checks, metrics, queue status, and cache management. Admin-only endpoints for operational visibility.",
    },
    {
        "name": "Exports",
        "description": "PDF export functionality for district reports and analytics summaries.",
    },
    {
        "name": "Protected Examples",
        "description": "Reference endpoints illustrating each RBAC pattern (public, authenticated, admin-only, role-scoped).",
    },
]

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Malaria Surveillance and Prediction System API.\n\n"
        "Backend for MalaSafe — ingests malaria case and climate data, runs monthly ML predictions, "
        "produces alerts, and serves analytics + GIS maps to web and mobile clients.\n\n"
        "**Auth:** JWT bearer tokens. Obtain one from `POST /api/v1/auth/login`, then pass "
        "`Authorization: Bearer <token>` on subsequent requests.\n\n"
        "**Base path:** all endpoints live under `/api/v1`. Interactive docs are served from `/api/docs` "
        "(Swagger UI) and `/api/redoc` (ReDoc)."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    openapi_tags=openapi_tags,
    contact={"name": "MalaSafe Team"},
)

# Setup CORS
setup_cors(app)

# Setup security headers
setup_security_headers(app)

# Setup rate limiting
setup_rate_limiting(app)

# Setup request tracing
setup_request_tracing(app)

# Setup response compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/api/docs",
        "health": "/api/v1/health",
    }


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.DEBUG else "An error occurred"
        }
    )


# Include routers with API versioning
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(mobile_router, prefix="/api/v1")
app.include_router(uploads_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(maps_router, prefix="/api/v1")
app.include_router(predictions_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(monthly_close_router, prefix="/api/v1")
app.include_router(operations_router, prefix="/api/v1")
app.include_router(exports_router, prefix="/api/v1")


# Startup event
@app.on_event("startup")
async def startup_event():
    """Execute on application startup."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    # Initialize Redis connection
    try:
        from app.cache.redis_client import get_redis_safe
        redis = await get_redis_safe()
        if redis:
            logger.info("Redis connection initialized")
        else:
            logger.warning("Redis not configured - caching disabled")
    except Exception as e:
        logger.warning(f"Redis initialization failed: {e} - continuing without cache")
    
    logger.info("Application startup complete")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Execute on application shutdown."""
    logger.info("Shutting down application")
    
    # Close Redis connection
    try:
        from app.cache.redis_client import close_redis
        await close_redis()
    except Exception as e:
        logger.error(f"Error closing Redis: {e}")
    
    logger.info("Application shutdown complete")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
