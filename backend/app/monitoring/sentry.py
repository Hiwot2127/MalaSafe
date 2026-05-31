"""Sentry error tracking integration."""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from app.config import settings
from loguru import logger


def setup_sentry():
    """Initialize Sentry error tracking."""
    if not settings.SENTRY_DSN:
        logger.warning("Sentry DSN not configured - error tracking disabled")
        return
    
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            AsyncioIntegration(),
        ],
        # Send PII (user info) for better debugging
        send_default_pii=True,
        # Attach stack locals for better debugging
        attach_stacktrace=True,
        # Release tracking
        release=f"malasafe-backend@{settings.APP_VERSION}",
    )
    
    logger.info(f"Sentry initialized for environment: {settings.SENTRY_ENVIRONMENT}")
