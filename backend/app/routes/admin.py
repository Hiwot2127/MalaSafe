"""Admin-only routes for user management and system administration."""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.models.uploaded_file import UploadedFile
from app.utils.dependencies import require_admin
from app.utils.security import get_password_hash, validate_password_strength
from app.utils.rbac import Permission, has_permission
from app.services.audit_service import AuditService
from pydantic import BaseModel, EmailStr, Field, validator
from loguru import logger

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============================================================================
# SCHEMAS
# ============================================================================

class CreateUserRequest(BaseModel):
    """Schema for creating a new user (admin only)."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole
    district_id: Optional[str] = None
    generate_password: bool = True
    password: Optional[str] = None
    
    @validator('role')
    def validate_role(cls, v):
        if v == UserRole.PUBLIC_USER:
            raise ValueError("Cannot create public users through admin panel")
        return v
    
    @validator('password')
    def validate_password(cls, v, values):
        if not values.get('generate_password') and not v:
            raise ValueError("Password required when generate_password is False")
        return v


class UpdateUserRequest(BaseModel):
    """Schema for updating user information."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    district_id: Optional[str] = None
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    """Schema for password reset."""
    new_password: str = Field(..., min_length=8)
    require_change_on_login: bool = True


class UserListResponse(BaseModel):
    """Response schema for user list."""
    id: UUID
    email: str
    full_name: str
    role: UserRole
    district_id: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UploadMetadataResponse(BaseModel):
    """Upload metadata for admin monitoring (NO CSV CONTENTS)."""
    id: UUID
    filename: str
    upload_type: str
    uploaded_by_email: str
    uploaded_at: datetime
    status: str
    record_count: Optional[int]
    error_count: Optional[int]
    file_size_bytes: Optional[int]
    
    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    """Audit log response."""
    id: UUID
    actor_email: Optional[str]
    actor_role: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    description: str
    timestamp: datetime
    ip_address: Optional[str]
    status: str
    
    class Config:
        from_attributes = True


class SystemHealthResponse(BaseModel):
    """System health metrics."""
    total_users: int
    active_users: int
    total_uploads: int
    uploads_last_24h: int
    failed_logins_last_24h: int
    database_status: str


# ============================================================================
# USER MANAGEMENT
# ============================================================================

@router.get(
    "/users",
    response_model=List[UserListResponse],
    summary="List all users",
    dependencies=[Depends(require_admin)]
)
async def list_users(
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    List all users in the system.
    
    **Authorization:** Admin only
    
    **Query Parameters:**
    - role: Filter by user role
    - is_active: Filter by active status
    """
    query = select(User).order_by(desc(User.created_at))
    
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users


@router.post(
    "/users",
    response_model=UserListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    dependencies=[Depends(require_admin)]
)
async def create_user(
    user_data: CreateUserRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new user account.
    
    **Authorization:** Admin only
    
    **Request Body:**
    - email: Institutional email (e.g., @moh.gov.et, @ephi.gov.et)
    - full_name: User's full name
    - role: User role (admin, moh_officer, ephi_officer, regional_officer)
    - district_id: Required for regional_officer
    - generate_password: Auto-generate secure password (default: true)
    - password: Manual password (if generate_password is false)
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Generate or validate password
    if user_data.generate_password:
        import secrets
        import string
        # Generate secure random password
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(16))
        # Ensure it meets requirements
        password = "Admin" + password + "123!"
    else:
        password = user_data.password
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
    
    # Create user
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=get_password_hash(password),
        role=user_data.role,
        district_id=user_data.district_id,
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Audit log
    await AuditService.log_user_created(db, current_user, new_user, request)
    
    logger.info(f"Admin {current_user.email} created user {new_user.email} with role {new_user.role.value}")
    
    # TODO: Send email with temporary password
    
    return new_user


@router.get(
    "/users/{user_id}",
    response_model=UserListResponse,
    summary="Get user details",
    dependencies=[Depends(require_admin)]
)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get detailed information about a specific user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.patch(
    "/users/{user_id}",
    response_model=UserListResponse,
    summary="Update user",
    dependencies=[Depends(require_admin)]
)
async def update_user(
    user_id: UUID,
    user_data: UpdateUserRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update user information.
    
    **Authorization:** Admin only
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Track changes for audit
    changes = {}
    
    if user_data.full_name is not None:
        changes['full_name'] = {'old': user.full_name, 'new': user_data.full_name}
        user.full_name = user_data.full_name
    
    if user_data.email is not None and user_data.email != user.email:
        # Check if new email already exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        changes['email'] = {'old': user.email, 'new': user_data.email}
        user.email = user_data.email
    
    if user_data.role is not None and user_data.role != user.role:
        old_role = user.role.value
        changes['role'] = {'old': old_role, 'new': user_data.role.value}
        user.role = user_data.role
        await AuditService.log_role_change(db, current_user, user, old_role, user_data.role.value, request)
    
    if user_data.district_id is not None:
        changes['district_id'] = {'old': user.district_id, 'new': user_data.district_id}
        user.district_id = user_data.district_id
    
    if user_data.is_active is not None and user_data.is_active != user.is_active:
        changes['is_active'] = {'old': user.is_active, 'new': user_data.is_active}
        user.is_active = user_data.is_active
        await AuditService.log_user_activation_change(db, current_user, user, user_data.is_active, request)
    
    await db.commit()
    await db.refresh(user)
    
    if changes:
        await AuditService.log_user_updated(db, current_user, user, changes, request)
    
    logger.info(f"Admin {current_user.email} updated user {user.email}")
    
    return user


@router.post(
    "/users/{user_id}/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset user password",
    dependencies=[Depends(require_admin)]
)
async def reset_user_password(
    user_id: UUID,
    reset_data: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Reset a user's password.
    
    **Authorization:** Admin only
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate new password
    is_valid, error_msg = validate_password_strength(reset_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Update password
    user.password_hash = get_password_hash(reset_data.new_password)
    await db.commit()
    
    # Audit log
    await AuditService.log_password_reset(db, current_user, user, request)
    
    logger.info(f"Admin {current_user.email} reset password for user {user.email}")
    
    return {"message": "Password reset successfully"}


# ============================================================================
# UPLOAD MONITORING (METADATA ONLY - NO CSV CONTENTS)
# ============================================================================

@router.get(
    "/uploads",
    response_model=List[UploadMetadataResponse],
    summary="View upload metadata",
    dependencies=[Depends(require_admin)]
)
async def list_upload_metadata(
    upload_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    View upload metadata (filename, uploader, date, counts).
    
    **IMPORTANT:** Admin can ONLY see metadata, NOT actual CSV contents.
    
    **Authorization:** Admin only
    """
    query = select(UploadedFile).order_by(desc(UploadedFile.uploaded_at)).limit(limit)
    
    if upload_type:
        query = query.where(UploadedFile.upload_type == upload_type)
    
    result = await db.execute(query)
    uploads = result.scalars().all()
    
    # Return metadata only - no file contents
    return [
        UploadMetadataResponse(
            id=upload.id,
            filename=upload.filename,
            upload_type=upload.upload_type,
            uploaded_by_email=upload.uploaded_by.email if upload.uploaded_by else "Unknown",
            uploaded_at=upload.uploaded_at,
            status=upload.status,
            record_count=upload.record_count,
            error_count=upload.error_count,
            file_size_bytes=upload.file_size_bytes,
        )
        for upload in uploads
    ]


# ============================================================================
# AUDIT LOGS
# ============================================================================

@router.get(
    "/audit-logs",
    response_model=List[AuditLogResponse],
    summary="View audit logs",
    dependencies=[Depends(require_admin)]
)
async def list_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    View system audit logs.
    
    **Authorization:** Admin only
    """
    query = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
    
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return logs


# ============================================================================
# SYSTEM HEALTH
# ============================================================================

@router.get(
    "/system-health",
    response_model=SystemHealthResponse,
    summary="View system health metrics",
    dependencies=[Depends(require_admin)]
)
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get system health metrics.
    
    **Authorization:** Admin only
    """
    from datetime import timedelta
    
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar()
    
    # Active users
    active_users_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    active_users = active_users_result.scalar()
    
    # Total uploads
    total_uploads_result = await db.execute(select(func.count(UploadedFile.id)))
    total_uploads = total_uploads_result.scalar()
    
    # Uploads last 24h
    yesterday = datetime.utcnow() - timedelta(days=1)
    uploads_24h_result = await db.execute(
        select(func.count(UploadedFile.id)).where(UploadedFile.uploaded_at >= yesterday)
    )
    uploads_last_24h = uploads_24h_result.scalar()
    
    # Failed logins last 24h
    failed_logins_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.action == "login_failure",
            AuditLog.timestamp >= yesterday
        )
    )
    failed_logins_last_24h = failed_logins_result.scalar()
    
    return SystemHealthResponse(
        total_users=total_users,
        active_users=active_users,
        total_uploads=total_uploads,
        uploads_last_24h=uploads_last_24h,
        failed_logins_last_24h=failed_logins_last_24h,
        database_status="healthy"
    )
