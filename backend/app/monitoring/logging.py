"""Structured JSON logging configuration."""

import logging
import sys
from pythonjsonlogger import jsonlogger
from app.config import settings


def setup_structured_logging():
    """Configure structured JSON logging for production."""
    
    # Configure JSON formatter
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(name)s %(levelname)s %(message)s",
        timestamp=True,
    )
    handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(settings.LOG_LEVEL)
    
    # Also configure uvicorn loggers
    for logger_name in ["uvicorn", "uvicorn.access", "uvicorn.error"]:
        logger = logging.getLogger(logger_name)
        logger.handlers = [handler]
        logger.setLevel(settings.LOG_LEVEL)
    
    return root_logger
