"""
Operations dashboard endpoints for system monitoring and health checks.

Provides internal admin APIs for:
- System health
- Queue status
- Upload metrics
- Prediction metrics
- Error tracking
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from app.database import get_db
from app.models import User, UploadedFile, Prediction, AuditLog
from app.models.user import UserRole
from app.utils.dependencies import require_roles
from app.cache.redis_client import get_redis_safe
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import psutil
from loguru import logger

router = APIRouter(prefix="/operations", tags=["Operations"])


@router.get(
    "/health",
    summary="System health check",
    responses={200: {"description": "System healthy"}, 503: {"description": "System unhealthy"}},
)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Comprehensive system health check.
    
    **Authorization:** Public (no auth required)
    
    **Checks:**
    - Database connectivity
    - Redis connectivity
    - System resources (CPU, memory, disk)
    
    **Returns:**
    - status: "healthy" or "unhealthy"
    - checks: Individual check results
    - timestamp: Current server time
    """
    checks = {}
    overall_healthy = True
    
    # Database check
    try:
        await db.execute(select(1))
        checks["database"] = {"status": "healthy", "message": "Connected"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "message": str(e)}
        overall_healthy = False
    
    # Redis check
    try:
        redis = await get_redis_safe()
        if redis:
            await redis.ping()
            checks["redis"] = {"status": "healthy", "message": "Connected"}
        else:
            checks["redis"] = {"status": "degraded", "message": "Not configured"}
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "message": str(e)}
        # Redis is optional, don't mark overall as unhealthy
    
    # System resources
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        checks["system"] = {
            "status": "healthy",
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent,
        }
        
        # Warn if resources are high
        if cpu_percent > 90 or memory.percent > 90 or disk.percent > 90:
            checks["system"]["status"] = "degraded"
            checks["system"]["message"] = "High resource usage"
            
    except Exception as e:
        checks["system"] = {"status": "unknown", "message": str(e)}
    
    status_code = status.HTTP_200_OK if overall_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return {
        "status": "healthy" if overall_healthy else "unhealthy",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get(
    "/metrics",
    summary="System metrics and statistics",
)
async def get_metrics(
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MOH_OFFICER)),
    db: AsyncSession = Depends(get_db)
):
    """
    Get system metrics and statistics.
    
    **Authorization:** Admin or MOH Officer
    
    **Returns:**
    - uploads: Upload statistics
    - predictions: Prediction statistics
    - users: User statistics
    - system: System resource usage
    """
    # Upload metrics (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    
    upload_stats = await db.execute(
        select(
            func.count(UploadedFile.id).label("total"),
            func.sum(func.case((UploadedFile.status == "completed", 1), else_=0)).label("completed"),
            func.sum(func.case((UploadedFile.status == "failed", 1), else_=0)).label("failed"),
        ).where(UploadedFile.uploaded_at >= yesterday)
    )
    upload_row = upload_stats.first()
    
    # Prediction metrics (last 24 hours)
    prediction_stats = await db.execute(
        select(
            func.count(Prediction.id).label("total"),
            func.avg(Prediction.confidence_score).label("avg_confidence"),
        ).where(Prediction.created_at >= yesterday)
    )
    prediction_row = prediction_stats.first()
    
    # User metrics
    user_stats = await db.execute(
        select(
            func.count(User.id).label("total"),
            func.sum(func.case((User.is_active == True, 1), else_=0)).label("active"),
        )
    )
    user_row = user_stats.first()
    
    # System resources
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        "uploads": {
            "last_24h": {
                "total": int(upload_row.total or 0),
                "completed": int(upload_row.completed or 0),
                "failed": int(upload_row.failed or 0),
                "success_rate": (
                    round(upload_row.completed / upload_row.total * 100, 2)
                    if upload_row.total and upload_row.total > 0
                    else 0
                ),
            }
        },
        "predictions": {
            "last_24h": {
                "total": int(prediction_row.total or 0),
                "avg_confidence": (
                    round(float(prediction_row.avg_confidence), 2)
                    if prediction_row.avg_confidence
                    else 0
                ),
            }
        },
        "users": {
            "total": int(user_row.total or 0),
            "active": int(user_row.active or 0),
        },
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_percent": disk.percent,
            "disk_free_gb": round(disk.free / (1024**3), 2),
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get(
    "/queue-status",
    summary="Background task queue status",
)
async def get_queue_status(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Get Celery queue status.
    
    **Authorization:** Admin only
    
    **Returns:**
    - Queue statistics
    - Active tasks
    - Pending tasks
    """
    try:
        from app.tasks.celery_app import celery_app
        
        # Get Celery inspector
        inspector = celery_app.control.inspect()
        
        # Get active tasks
        active = inspector.active()
        
        # Get scheduled tasks
        scheduled = inspector.scheduled()
        
        # Get registered tasks
        registered = inspector.registered()
        
        return {
            "active_tasks": active or {},
            "scheduled_tasks": scheduled or {},
            "registered_tasks": registered or {},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
    except Exception as e:
        logger.error(f"Failed to get queue status: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Queue status unavailable: {str(e)}"
        )


@router.get(
    "/recent-errors",
    summary="Recent system errors",
)
async def get_recent_errors(
    limit: int = 50,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent system errors from audit logs.
    
    **Authorization:** Admin only
    
    **Query Parameters:**
    - limit: Number of errors to return (default: 50, max: 200)
    
    **Returns:**
    - List of recent errors with context
    """
    if limit > 200:
        limit = 200
    
    # Get recent failed uploads
    failed_uploads = await db.execute(
        select(UploadedFile)
        .where(UploadedFile.status == "failed")
        .order_by(desc(UploadedFile.uploaded_at))
        .limit(limit)
    )
    
    errors = []
    for upload in failed_uploads.scalars():
        errors.append({
            "type": "upload_failed",
            "timestamp": upload.uploaded_at.isoformat() + "Z" if upload.uploaded_at else None,
            "details": {
                "file_id": str(upload.id),
                "filename": upload.filename,
                "user_id": str(upload.uploaded_by),
            }
        })
    
    return {
        "errors": errors[:limit],
        "total": len(errors),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post(
    "/cache/invalidate",
    summary="Invalidate cache",
)
async def invalidate_cache(
    pattern: Optional[str] = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Invalidate cache keys matching a pattern.
    
    **Authorization:** Admin only
    
    **Query Parameters:**
    - pattern: Redis key pattern (e.g., "dashboard:*"). If not provided, invalidates all cache.
    
    **Returns:**
    - Success message
    """
    try:
        from app.cache.decorators import invalidate_cache as invalidate, invalidate_all
        
        if pattern:
            await invalidate(pattern)
            message = f"Cache invalidated for pattern: {pattern}"
        else:
            await invalidate_all()
            message = "All cache invalidated"
        
        logger.info(f"Cache invalidation requested by {current_user.email}: {message}")
        
        return {
            "success": True,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
    except Exception as e:
        logger.error(f"Cache invalidation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cache invalidation failed: {str(e)}"
        )
