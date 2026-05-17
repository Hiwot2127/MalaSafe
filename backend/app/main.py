from fastapi import FastAPI
from fastapi.responses import JSONResponse
from app.config import settings
from app.middleware import setup_cors
from app.routes import (
    health_router,
    auth_router,
    mobile_router,
    uploads_router,
    analytics_router,
    maps_router,
    predictions_router,
    alerts_router,
    monthly_close_router,
)
from loguru import logger
import sys

# Configure logging
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

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Malaria Surveillance and Prediction System API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Setup CORS
setup_cors(app)


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
app.include_router(mobile_router, prefix="/api/v1")
app.include_router(uploads_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(maps_router, prefix="/api/v1")
app.include_router(predictions_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(monthly_close_router, prefix="/api/v1")


# Startup event
@app.on_event("startup")
async def startup_event():
    """Execute on application startup."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info("Application startup complete")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Execute on application shutdown."""
    logger.info("Shutting down application")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
