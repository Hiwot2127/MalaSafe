"""Admin-only routes for user management and system administration."""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import random
import secrets
import string

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
    force_password_change: bool
    failed_login_attempts: int
    account_locked_until: Optional[datetime]
    last_login_at: Optional[datetime]
    last_login_ip: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class CreateUserResponse(UserListResponse):
    """Response schema for creating a user with an optional temporary password."""
    temporary_password: Optional[str] = None


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
    response_model=CreateUserResponse,
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
    
    def generate_temporary_password() -> str:
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        characters = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%^&*"),
        ]
        characters.extend(secrets.choice(alphabet) for _ in range(16))
        random.SystemRandom().shuffle(characters)
        return "".join(characters)

    # Generate or validate password
    if user_data.generate_password:
        password = generate_temporary_password()
        temporary_password = password
    else:
        password = user_data.password
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        temporary_password = None
    
    # Create user
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=get_password_hash(password),
        role=user_data.role,
        district_id=user_data.district_id,
        is_active=True,
        force_password_change=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Audit log
    await AuditService.log_user_created(db, current_user, new_user, request)
    
    logger.info(f"Admin {current_user.email} created user {new_user.email} with role {new_user.role.value}")
    
    # TODO: Send email with temporary password
    
    return {
        "id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "district_id": new_user.district_id,
        "is_active": new_user.is_active,
        "force_password_change": new_user.force_password_change,
        "failed_login_attempts": new_user.failed_login_attempts,
        "account_locked_until": new_user.account_locked_until,
        "last_login_at": new_user.last_login_at,
        "last_login_ip": new_user.last_login_ip,
        "status": new_user.status,
        "created_at": new_user.created_at,
        "temporary_password": temporary_password,
    }


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
    
    # Set force password change if requested
    if reset_data.require_change_on_login:
        user.force_password_change = True
    
    await db.commit()
    
    # Audit log
    await AuditService.log_password_reset(db, current_user, user, request)
    
    logger.info(f"Admin {current_user.email} reset password for user {user.email}")
    
    return {"message": "Password reset successfully", "force_password_change": user.force_password_change}


@router.post(
    "/users/{user_id}/unlock",
    status_code=status.HTTP_200_OK,
    summary="Unlock user account",
    dependencies=[Depends(require_admin)]
)
async def unlock_user_account(
    user_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Unlock a user account that was locked due to failed login attempts.
    
    **Authorization:** Admin only
    
    **Returns:**
    - Success message
    - User status
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_locked():
        return {"message": "Account is not locked", "status": user.status}
    
    # Unlock account
    user.unlock_account()
    await db.commit()
    
    # Audit log
    await AuditService.log_action(
        db=db,
        actor=current_user,
        action="unlock_account",
        resource_type="user",
        resource_id=str(user.id),
        description=f"Admin unlocked account for {user.email}",
        request=request,
        status="success"
    )
    
    logger.info(f"Admin {current_user.email} unlocked account for user {user.email}")
    
    return {"message": "Account unlocked successfully", "status": user.status}


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
    from sqlalchemy.orm import selectinload
    
    query = select(UploadedFile).options(selectinload(UploadedFile.uploader)).order_by(desc(UploadedFile.created_at)).limit(limit)
    
    if upload_type:
        query = query.where(UploadedFile.upload_type == upload_type)
    
    result = await db.execute(query)
    uploads = result.scalars().all()
    
    # Return metadata only - no file contents
    return [
        UploadMetadataResponse(
            id=upload.id,
            filename=upload.file_name,
            upload_type=upload.upload_type,
            uploaded_by_email=upload.uploader.email if upload.uploader else "Unknown",
            uploaded_at=upload.created_at,
            status="completed",
            record_count=upload.row_count,
            error_count=None,
            file_size_bytes=None,
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

class DashboardSummaryResponse(BaseModel):
    """Dashboard summary with key metrics."""
    total_users: int
    active_users: int
    inactive_users: int
    locked_users: int
    password_reset_required: int
    monthly_uploads: int
    predictions_generated: int
    active_alerts: int
    failed_login_attempts: int
    
    class Config:
        from_attributes = True


@router.get(
    "/dashboard-summary",
    response_model=DashboardSummaryResponse,
    summary="Get admin dashboard summary",
    dependencies=[Depends(require_admin)]
)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get comprehensive dashboard summary with key metrics.
    
    **Authorization:** Admin only
    
    **Returns:**
    - Total Users: All users in system
    - Active Users: Users with is_active=true and not locked
    - Inactive Users: Users with is_active=false
    - Locked Users: Users currently locked due to failed login attempts
    - Password Reset Required: Users with force_password_change=true
    - Monthly Uploads: Uploads in current month
    - Predictions Generated: Total predictions
    - Active Alerts: Unresolved alerts
    - Failed Login Attempts: Failed logins in last 24 hours
    """
    from datetime import timedelta
    from app.models.prediction import Prediction
    from app.models.alert import Alert
    
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar()
    
    # Active users (is_active=true and not locked)
    active_users_result = await db.execute(
        select(func.count(User.id)).where(
            User.is_active == True,
            (User.account_locked_until == None) | (User.account_locked_until < datetime.utcnow())
        )
    )
    active_users = active_users_result.scalar()
    
    # Inactive users
    inactive_users_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == False)
    )
    inactive_users = inactive_users_result.scalar()
    
    # Locked users
    locked_users_result = await db.execute(
        select(func.count(User.id)).where(
            User.account_locked_until != None,
            User.account_locked_until > datetime.utcnow()
        )
    )
    locked_users = locked_users_result.scalar()
    
    # Password reset required
    password_reset_result = await db.execute(
        select(func.count(User.id)).where(User.force_password_change == True)
    )
    password_reset_required = password_reset_result.scalar()
    
    # Monthly uploads (current month)
    first_day_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_uploads_result = await db.execute(
        select(func.count(UploadedFile.id)).where(
            UploadedFile.created_at >= first_day_of_month
        )
    )
    monthly_uploads = monthly_uploads_result.scalar()
    
    # Predictions generated (total)
    predictions_result = await db.execute(select(func.count(Prediction.id)))
    predictions_generated = predictions_result.scalar()
    
    # Active alerts (unresolved)
    active_alerts_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.is_resolved == False)
    )
    active_alerts = active_alerts_result.scalar()
    
    # Failed login attempts (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    failed_logins_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.action == "login_failure",
            AuditLog.timestamp >= yesterday
        )
    )
    failed_login_attempts = failed_logins_result.scalar()
    
    return DashboardSummaryResponse(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        locked_users=locked_users,
        password_reset_required=password_reset_required,
        monthly_uploads=monthly_uploads,
        predictions_generated=predictions_generated,
        active_alerts=active_alerts,
        failed_login_attempts=failed_login_attempts
    )


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
        select(func.count(UploadedFile.id)).where(UploadedFile.created_at >= yesterday)
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
