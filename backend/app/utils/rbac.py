"""
Role-Based Access Control (RBAC) utilities for MalaSafe.

This module defines permissions for each role and provides utilities
for checking access rights across the application.
"""

from enum import Enum
from typing import Set, List
from app.models.user import UserRole


class Permission(str, Enum):
    """System permissions."""
    
    # User Management
    CREATE_USER = "create_user"
    EDIT_USER = "edit_user"
    DELETE_USER = "delete_user"
    VIEW_USERS = "view_users"
    RESET_PASSWORD = "reset_password"
    CHANGE_USER_ROLE = "change_user_role"
    ACTIVATE_DEACTIVATE_USER = "activate_deactivate_user"
    
    # Data Upload
    UPLOAD_MONTHLY_MALARIA = "upload_monthly_malaria"
    UPLOAD_WEEKLY_MALARIA = "upload_weekly_malaria"
    UPLOAD_CLIMATE = "upload_climate"
    VIEW_UPLOAD_METADATA = "view_upload_metadata"
    VIEW_UPLOAD_CONTENTS = "view_upload_contents"
    DOWNLOAD_UPLOADS = "download_uploads"
    DELETE_UPLOADS = "delete_uploads"
    
    # Analytics & Viewing
    VIEW_ANALYTICS = "view_analytics"
    VIEW_MAPS = "view_maps"
    VIEW_PREDICTIONS = "view_predictions"
    VIEW_ALERTS = "view_alerts"
    VIEW_REPORTS = "view_reports"
    
    # System Administration
    VIEW_AUDIT_LOGS = "view_audit_logs"
    VIEW_SECURITY_LOGS = "view_security_logs"
    VIEW_SYSTEM_HEALTH = "view_system_health"
    MANAGE_SYSTEM_SETTINGS = "manage_system_settings"
    
    # Monthly Close
    INITIATE_MONTHLY_CLOSE = "initiate_monthly_close"
    APPROVE_MONTHLY_CLOSE = "approve_monthly_close"
    VIEW_MONTHLY_CLOSE = "view_monthly_close"


# Role-Permission Mapping
ROLE_PERMISSIONS: dict[UserRole, Set[Permission]] = {
    UserRole.ADMIN: {
        # User Management - FULL ACCESS
        Permission.CREATE_USER,
        Permission.EDIT_USER,
        Permission.VIEW_USERS,
        Permission.RESET_PASSWORD,
        Permission.CHANGE_USER_ROLE,
        Permission.ACTIVATE_DEACTIVATE_USER,
        
        # Upload Monitoring - METADATA ONLY (no content access)
        Permission.VIEW_UPLOAD_METADATA,
        
        # System Administration - FULL ACCESS
        Permission.VIEW_AUDIT_LOGS,
        Permission.VIEW_SECURITY_LOGS,
        Permission.VIEW_SYSTEM_HEALTH,
        Permission.MANAGE_SYSTEM_SETTINGS,
        
        # Analytics - READ ONLY
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_MAPS,
        Permission.VIEW_PREDICTIONS,
        Permission.VIEW_ALERTS,
        Permission.VIEW_REPORTS,
        
        # Monthly Close - VIEW ONLY
        Permission.VIEW_MONTHLY_CLOSE,
    },
    
    UserRole.MOH_OFFICER: {
        # Data Upload
        Permission.UPLOAD_MONTHLY_MALARIA,
        Permission.UPLOAD_CLIMATE,
        Permission.VIEW_UPLOAD_METADATA,
        Permission.VIEW_UPLOAD_CONTENTS,
        Permission.DOWNLOAD_UPLOADS,
        
        # Analytics
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_MAPS,
        Permission.VIEW_PREDICTIONS,
        Permission.VIEW_ALERTS,
        Permission.VIEW_REPORTS,
        
        # Monthly Close
        Permission.INITIATE_MONTHLY_CLOSE,
        Permission.APPROVE_MONTHLY_CLOSE,
        Permission.VIEW_MONTHLY_CLOSE,
    },
    
    UserRole.EPHI_OFFICER: {
        # Data Upload
        Permission.UPLOAD_WEEKLY_MALARIA,
        Permission.UPLOAD_CLIMATE,
        Permission.VIEW_UPLOAD_METADATA,
        Permission.VIEW_UPLOAD_CONTENTS,
        Permission.DOWNLOAD_UPLOADS,
        
        # Analytics
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_MAPS,
        Permission.VIEW_PREDICTIONS,
        Permission.VIEW_ALERTS,
        Permission.VIEW_REPORTS,
        
        # Monthly Close - VIEW ONLY
        Permission.VIEW_MONTHLY_CLOSE,
    },
    
    UserRole.REGIONAL_OFFICER: {
        # Analytics - READ ONLY
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_MAPS,
        Permission.VIEW_PREDICTIONS,
        Permission.VIEW_ALERTS,
        Permission.VIEW_REPORTS,
        
        # Monthly Close - VIEW ONLY
        Permission.VIEW_MONTHLY_CLOSE,
    },
    
    UserRole.PUBLIC_USER: {
        # Public mobile app only - no dashboard access
    },
}


def get_role_permissions(role: UserRole) -> Set[Permission]:
    """Get all permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(role: UserRole, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in get_role_permissions(role)


def has_any_permission(role: UserRole, permissions: List[Permission]) -> bool:
    """Check if a role has any of the specified permissions."""
    role_perms = get_role_permissions(role)
    return any(perm in role_perms for perm in permissions)


def has_all_permissions(role: UserRole, permissions: List[Permission]) -> bool:
    """Check if a role has all of the specified permissions."""
    role_perms = get_role_permissions(role)
    return all(perm in role_perms for perm in permissions)


def can_upload_data(role: UserRole) -> bool:
    """Check if role can upload any type of data."""
    return has_any_permission(role, [
        Permission.UPLOAD_MONTHLY_MALARIA,
        Permission.UPLOAD_WEEKLY_MALARIA,
        Permission.UPLOAD_CLIMATE,
    ])


def can_access_admin_panel(role: UserRole) -> bool:
    """Check if role can access admin panel."""
    return role == UserRole.ADMIN


def can_access_dashboard(role: UserRole) -> bool:
    """Check if role can access operational dashboard."""
    return role in [
        UserRole.ADMIN,
        UserRole.MOH_OFFICER,
        UserRole.EPHI_OFFICER,
        UserRole.REGIONAL_OFFICER,
    ]


def can_view_upload_contents(role: UserRole) -> bool:
    """
    Check if role can view actual CSV contents.
    ADMIN can only see metadata, not contents.
    """
    return has_permission(role, Permission.VIEW_UPLOAD_CONTENTS)


def get_default_redirect(role: UserRole) -> str:
    """Get default redirect path after login based on role."""
    if role == UserRole.ADMIN:
        return "/admin"
    elif role in [UserRole.MOH_OFFICER, UserRole.EPHI_OFFICER, UserRole.REGIONAL_OFFICER]:
        return "/dashboard"
    else:
        # PUBLIC_USER should use mobile app
        return "/public"
