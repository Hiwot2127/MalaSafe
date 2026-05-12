"""
Example protected routes demonstrating role-based access control.

These are example endpoints showing how to use the authentication system.
Replace with your actual business logic endpoints.
"""

from fastapi import APIRouter, Depends
from app.models.user import User, UserRole
from app.utils.dependencies import (
    get_current_user,
    require_admin,
    require_official,
    require_roles,
)

router = APIRouter(prefix="/examples", tags=["Protected Examples"])


@router.get("/public")
async def public_endpoint():
    """
    Public endpoint - no authentication required.
    
    Anyone can access this endpoint.
    """
    return {
        "message": "This is a public endpoint",
        "authentication": "not required"
    }


@router.get("/authenticated")
async def authenticated_endpoint(current_user: User = Depends(get_current_user)):
    """
    Authenticated endpoint - any logged-in user can access.
    
    Requires valid JWT token.
    """
    return {
        "message": "This is an authenticated endpoint",
        "user": {
            "email": current_user.email,
            "role": current_user.role.value
        }
    }


@router.get("/admin-only")
async def admin_only_endpoint(current_user: User = Depends(require_admin)):
    """
    Admin-only endpoint.
    
    Only users with admin role can access this endpoint.
    """
    return {
        "message": "This is an admin-only endpoint",
        "admin": current_user.email
    }


@router.get("/officials-only")
async def officials_only_endpoint(current_user: User = Depends(require_official)):
    """
    Officials-only endpoint.
    
    Only users with official roles (admin, moh_officer, ephi_officer, regional_officer)
    can access this endpoint. Public users are denied.
    """
    return {
        "message": "This is an officials-only endpoint",
        "official": {
            "email": current_user.email,
            "role": current_user.role.value
        }
    }


@router.get("/moh-ephi-only")
async def moh_ephi_only_endpoint(
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.MOH_OFFICER, UserRole.EPHI_OFFICER)
    )
):
    """
    MOH and EPHI officers only endpoint.
    
    Only users with admin, moh_officer, or ephi_officer roles can access.
    Regional officers and public users are denied.
    """
    return {
        "message": "This endpoint is for MOH and EPHI officers",
        "officer": {
            "email": current_user.email,
            "role": current_user.role.value
        }
    }


@router.get("/regional-officers")
async def regional_officers_endpoint(
    current_user: User = Depends(require_roles(UserRole.REGIONAL_OFFICER, UserRole.ADMIN))
):
    """
    Regional officers endpoint.
    
    Only regional officers and admins can access.
    """
    return {
        "message": "This endpoint is for regional officers",
        "officer": {
            "email": current_user.email,
            "role": current_user.role.value,
            "district": current_user.district_id
        }
    }


@router.get("/my-district-data")
async def my_district_data(current_user: User = Depends(get_current_user)):
    """
    Get data for current user's district.
    
    Example of filtering data based on user's district.
    """
    if not current_user.district_id:
        return {
            "message": "No district assigned to user",
            "data": []
        }
    
    # In real implementation, query database for district-specific data
    return {
        "message": f"Data for district: {current_user.district_id}",
        "district_id": current_user.district_id,
        "user_role": current_user.role.value,
        "data": [
            # Example data - replace with actual database queries
            {"id": 1, "type": "case_report", "district": current_user.district_id},
            {"id": 2, "type": "case_report", "district": current_user.district_id},
        ]
    }
