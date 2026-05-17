"""Celery app factory + beat schedule.

Run worker:  celery -A app.tasks.celery_app worker --loglevel=info
Run beat:    celery -A app.tasks.celery_app beat --loglevel=info

Both need Redis at settings.REDIS_URL (defaults to redis://localhost:6379/0).
"""
from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "malasafe",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.predict_monthly"],
)

celery_app.conf.update(
    timezone="Africa/Addis_Ababa",
    enable_utc=False,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Run on the 5th of every month at 02:00 Addis Ababa time. The model expects
# ~2-3 month publication lag for ERA5-Land, so cumulative climate to date should
# be confidently available by the 5th.
celery_app.conf.beat_schedule = {
    "predict-next-month": {
        "task": "app.tasks.predict_monthly.run_monthly_predictions",
        "schedule": crontab(day_of_month=5, hour=2, minute=0),
    },
}
