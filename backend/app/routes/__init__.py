from .health import router as health_router
from .auth import router as auth_router
from .mobile import router as mobile_router
from .uploads import router as uploads_router

__all__ = ["health_router", "auth_router", "mobile_router", "uploads_router"]
