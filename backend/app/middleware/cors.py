from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from loguru import logger


def setup_cors(app):
    """Configure CORS middleware with production-grade settings."""
    
    # Log CORS configuration for debugging
    logger.info(f"CORS Origins: {settings.CORS_ORIGINS}")
    logger.info(f"CORS Credentials: {settings.CORS_ALLOW_CREDENTIALS}")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
        max_age=settings.CORS_MAX_AGE,
    )
