"""
Celery tasks for CSV upload processing.

Handles heavy upload operations asynchronously with retries and error handling.
"""

from celery import Task
from app.tasks.celery_app import celery_app
from app.database.base import AsyncSessionLocal
from app.services.upload_service import UploadService
from loguru import logger
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
    name="app.tasks.upload_tasks.process_malaria_upload",
    max_retries=3,
    default_retry_delay=60,  # Retry after 1 minute
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,  # Max 10 minutes between retries
    retry_jitter=True,
)
async def process_malaria_upload(
    self,
    file_content: bytes,
    filename: str,
    user_id: str
):
    """
    Process malaria CSV upload asynchronously.
    
    Args:
        file_content: CSV file content as bytes
        filename: Original filename
        user_id: User ID who uploaded the file
        
    Returns:
        Upload result dictionary
        
    Raises:
        Exception: If upload processing fails after retries
    """
    logger.info(f"Processing malaria upload: {filename} (user: {user_id})")
    
    try:
        async with AsyncSessionLocal() as db:
            upload_service = UploadService(db, user_id)
            
            (success, message, processed, created, skipped, errors, file_id,
             monthly_close_id, monthly_close_mode, stages) = \
                await upload_service.process_monthly_malaria_upload(file_content, filename)
            
            await db.commit()
            
            result = {
                "success": success,
                "message": message,
                "records_processed": processed,
                "records_created": created,
                "records_skipped": skipped,
                "errors": errors,
                "file_id": file_id,
                "monthly_close_id": monthly_close_id,
                "monthly_close_mode": monthly_close_mode,
                "stages": stages,
            }
            
            logger.info(
                f"Malaria upload completed: {filename} "
                f"(processed: {processed}, created: {created}, skipped: {skipped})"
            )
            
            return result
            
    except Exception as e:
        logger.error(f"Malaria upload failed: {filename} - {e}")
        
        # Retry if not max retries
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying malaria upload: {filename} (attempt {self.request.retries + 1})")
            raise self.retry(exc=e)
        
        # Max retries reached
        logger.error(f"Malaria upload failed after {self.max_retries} retries: {filename}")
        raise


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="app.tasks.upload_tasks.process_climate_upload",
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
async def process_climate_upload(
    self,
    file_content: bytes,
    filename: str,
    user_id: str
):
    """
    Process climate CSV upload asynchronously.
    
    Args:
        file_content: CSV file content as bytes
        filename: Original filename
        user_id: User ID who uploaded the file
        
    Returns:
        Upload result dictionary
        
    Raises:
        Exception: If upload processing fails after retries
    """
    logger.info(f"Processing climate upload: {filename} (user: {user_id})")
    
    try:
        async with AsyncSessionLocal() as db:
            upload_service = UploadService(db, user_id)
            
            (success, message, processed, created, skipped, errors, file_id,
             monthly_close_id, monthly_close_mode, stages) = \
                await upload_service.process_climate_upload(file_content, filename)
            
            await db.commit()
            
            result = {
                "success": success,
                "message": message,
                "records_processed": processed,
                "records_created": created,
                "records_skipped": skipped,
                "errors": errors,
                "file_id": file_id,
                "monthly_close_id": monthly_close_id,
                "monthly_close_mode": monthly_close_mode,
                "stages": stages,
            }
            
            logger.info(
                f"Climate upload completed: {filename} "
                f"(processed: {processed}, created: {created}, skipped: {skipped})"
            )
            
            return result
            
    except Exception as e:
        logger.error(f"Climate upload failed: {filename} - {e}")
        
        # Retry if not max retries
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying climate upload: {filename} (attempt {self.request.retries + 1})")
            raise self.retry(exc=e)
        
        # Max retries reached
        logger.error(f"Climate upload failed after {self.max_retries} retries: {filename}")
        raise


@celery_app.task(
    name="app.tasks.upload_tasks.validate_upload",
    max_retries=1,
)
def validate_upload(file_content: bytes, filename: str, upload_type: str):
    """
    Validate upload file before processing (fast pre-check).
    
    Args:
        file_content: CSV file content as bytes
        filename: Original filename
        upload_type: "malaria" or "climate"
        
    Returns:
        Validation result dictionary
    """
    logger.info(f"Validating {upload_type} upload: {filename}")
    
    # Basic validation
    if not filename.endswith('.csv'):
        return {
            "valid": False,
            "error": "Only CSV files are allowed"
        }
    
    if len(file_content) == 0:
        return {
            "valid": False,
            "error": "File is empty"
        }
    
    if len(file_content) > 50 * 1024 * 1024:  # 50 MB limit
        return {
            "valid": False,
            "error": "File too large (max 50 MB)"
        }
    
    return {
        "valid": True,
        "size": len(file_content)
    }
