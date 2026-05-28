"""
Celery application configuration for background tasks.

Provides reliable task queue for:
- Heavy CSV uploads
- Batch predictions
- Climate data fetching
- Monthly close orchestration
"""

from celery import Celery
from app.config import settings
from loguru import logger

# Create Celery app
celery_app = Celery(
    "malasafe",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.upload_tasks",
        "app.tasks.prediction_tasks",
        "app.tasks.climate_tasks",
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task execution
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Addis_Ababa",
    enable_utc=True,
    
    # Task routing
    task_routes={
        "app.tasks.upload_tasks.*": {"queue": "uploads"},
        "app.tasks.prediction_tasks.*": {"queue": "predictions"},
        "app.tasks.climate_tasks.*": {"queue": "climate"},
    },
    
    # Task time limits
    task_time_limit=3600,  # 1 hour hard limit
    task_soft_time_limit=3300,  # 55 minutes soft limit
    
    # Task retries
    task_acks_late=True,  # Acknowledge after task completes
    task_reject_on_worker_lost=True,  # Requeue if worker dies
    
    # Result backend
    result_expires=86400,  # Results expire after 24 hours
    result_extended=True,  # Store task args/kwargs
    
    # Worker configuration
    worker_prefetch_multiplier=1,  # One task at a time (for heavy tasks)
    worker_max_tasks_per_child=100,  # Restart worker after 100 tasks (prevent memory leaks)
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Beat schedule (for periodic tasks)
    beat_schedule={
        # Example: Daily cleanup of old results
        "cleanup-old-results": {
            "task": "app.tasks.maintenance_tasks.cleanup_old_results",
            "schedule": 86400.0,  # Every 24 hours
        },
    },
)


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task to test Celery setup."""
    logger.info(f"Request: {self.request!r}")
    return "Celery is working!"


# Task event handlers
@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Setup periodic tasks after Celery is configured."""
    logger.info("Celery periodic tasks configured")


@celery_app.on_after_finalize.connect
def setup_task_routes(sender, **kwargs):
    """Setup task routes after Celery is finalized."""
    logger.info("Celery task routes configured")
