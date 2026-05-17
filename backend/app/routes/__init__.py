from .health import router as health_router
from .auth import router as auth_router
from .mobile import router as mobile_router
from .uploads import router as uploads_router
from .analytics import router as analytics_router
from .maps import router as maps_router
from .predictions import router as predictions_router
from .alerts import router as alerts_router
from .monthly_close import router as monthly_close_router

__all__ = [
    "health_router",
    "auth_router",
    "mobile_router",
    "uploads_router",
    "analytics_router",
    "maps_router",
    "predictions_router",
    "alerts_router",
    "monthly_close_router",
]
