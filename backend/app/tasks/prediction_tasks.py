"""
Celery tasks for AI prediction generation.

Handles batch prediction operations asynchronously with retries and error handling.
"""

from celery import Task
from app.tasks.celery_app import celery_app
from app.database.base import AsyncSessionLocal
from app.services.prediction_service import PredictionService
from app.ai import get_predictor
from loguru import logger
from datetime import date
from typing import Optional, List
import asyncio


class DatabaseTask(Task):
    """Base task with database session management."""
    
    def __call__(self, *args, **kwargs):
        """Execute task with async support."""
        return asyncio.run(self.run_async(*args, **kwargs))
    
    async def run_async(self, *args, **kwargs):
        """Override this method in subclasses."""
        raise NotImplementedError


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="app.tasks.prediction_tasks.generate_batch_predictions",
    max_retries=3,
    default_retry_delay=120,  # Retry after 2 minutes
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=900,  # Max 15 minutes between retries
    retry_jitter=True,
)
async def generate_batch_predictions(
    self,
    target_month: str,  # ISO format date string
    district_ids: Optional[List[str]] = None,
    force: bool = False
):
    """
    Generate predictions for multiple districts asynchronously.
    
    Args:
        target_month: Target month as ISO date string (YYYY-MM-DD)
        district_ids: List of district IDs (None = all districts)
        force: Whether to overwrite existing predictions
        
    Returns:
        Batch result dictionary
        
    Raises:
        Exception: If batch prediction fails after retries
    """
    target_date = date.fromisoformat(target_month)
    logger.info(
        f"Generating batch predictions for {target_date} "
        f"(districts: {len(district_ids) if district_ids else 'all'}, force: {force})"
    )
    
    try:
        async with AsyncSessionLocal() as db:
            predictor = get_predictor()
            prediction_service = PredictionService(db, predictor)
            
            # Generate batch predictions
            results = await prediction_service.generate_batch(
                target_month=target_date,
                district_ids=district_ids,
                force=force
            )
            
            await db.commit()
            
            logger.info(
                f"Batch predictions completed for {target_date}: "
                f"{results['created']} created, {results['skipped']} skipped, "
                f"{results['failed']} failed"
            )
            
            return results
            
    except Exception as e:
        logger.error(f"Batch prediction failed for {target_date}: {e}")
        
        # Retry if not max retries
        if self.request.retries < self.max_retries:
            logger.info(
                f"Retrying batch prediction for {target_date} "
                f"(attempt {self.request.retries + 1})"
            )
            raise self.retry(exc=e)
        
        # Max retries reached
        logger.error(
            f"Batch prediction failed after {self.max_retries} retries: {target_date}"
        )
        raise


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="app.tasks.prediction_tasks.generate_single_prediction",
    max_retries=2,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
async def generate_single_prediction(
    self,
    district_id: str,
    target_month: str  # ISO format date string
):
    """
    Generate prediction for a single district asynchronously.
    
    Args:
        district_id: District ID
        target_month: Target month as ISO date string (YYYY-MM-DD)
        
    Returns:
        Prediction result dictionary
        
    Raises:
        Exception: If prediction fails after retries
    """
    target_date = date.fromisoformat(target_month)
    logger.info(f"Generating prediction for district {district_id}, month {target_date}")
    
    try:
        async with AsyncSessionLocal() as db:
            predictor = get_predictor()
            prediction_service = PredictionService(db, predictor)
            
            # Generate prediction
            prediction = await prediction_service.generate_one(
                district_id=district_id,
                target_month=target_date
            )
            
            await db.commit()
            
            result = {
                "id": str(prediction.id),
                "district_id": str(prediction.district_id),
                "prediction_date": prediction.prediction_date.isoformat(),
                "risk_level": prediction.risk_level,
                "prediction_score": float(prediction.prediction_score),
                "confidence_score": float(prediction.confidence_score),
                "prediction_reason": prediction.prediction_reason,
            }
            
            logger.info(
                f"Prediction generated for district {district_id}: "
                f"risk={prediction.risk_level}, score={prediction.prediction_score:.2f}"
            )
            
            return result
            
    except Exception as e:
        logger.error(f"Prediction failed for district {district_id}: {e}")
        
        # Retry if not max retries
        if self.request.retries < self.max_retries:
            logger.info(
                f"Retrying prediction for district {district_id} "
                f"(attempt {self.request.retries + 1})"
            )
            raise self.retry(exc=e)
        
        # Max retries reached
        logger.error(
            f"Prediction failed after {self.max_retries} retries: district {district_id}"
        )
        raise


@celery_app.task(
    name="app.tasks.prediction_tasks.cleanup_old_predictions",
    max_retries=1,
)
def cleanup_old_predictions(days_to_keep: int = 365):
    """
    Clean up old predictions (maintenance task).
    
    Args:
        days_to_keep: Number of days to keep predictions (default: 365)
        
    Returns:
        Number of predictions deleted
    """
    logger.info(f"Cleaning up predictions older than {days_to_keep} days")
    
    # TODO: Implement cleanup logic
    # This would delete predictions older than X days
    # Keep this as a placeholder for now
    
    return 0
