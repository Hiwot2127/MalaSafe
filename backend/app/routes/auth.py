from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas import (
    LoginRequest,
    CreateOfficialRequest,
    MobileRegisterRequest,
    UserResponse,
    Token,
)
from app.utils import (
    verify_password,
    get_password_hash,
    validate_password_strength,
)
from app.utils.jwt import create_access_token, create_refresh_token
from app.utils.dependencies import (
    get_current_user,
    require_admin,
)
from app.services.audit_service import AuditService
from app.middleware.rate_limit import limiter
from jose import jwt, JWTError
from app.config import settings
from loguru import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Log in and receive a JWT bearer token",
    responses={
        401: {"description": "Incorrect email or password"},
        403: {"description": "Account is inactive or locked"},
    },
)
@limiter.limit("5/minute")  # Rate limit: 5 attempts per minute
async def login(
    request: Request,
    credentials: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Login endpoint for all users with HttpOnly cookie support and security features.
    
    **Security Features:**
    - Account lockout after 5 failed attempts (15 minutes)
    - Last login tracking (timestamp and IP)
    - Force password change for new users
    
    **Request Body:**
    - email: User's email address
    - password: User's password
    
    **Returns:**
    - access_token: JWT token for authentication
    - token_type: "bearer"
    - user: User information
    - force_password_change: Boolean indicating if password change required
    
    **Cookies Set:**
    - session_token: HttpOnly access token (30 min)
    - refresh_token: HttpOnly refresh token (7 days)
    - user_role: User role for frontend middleware
    
    **Example:**
    ```json
    {
        "email": "admin@malasafe.gov.et",
        "password": "SecurePassword123!"
    }
    ```
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    # Get client IP address
    client_ip = request.client.host if request.client else "unknown"
    
    if not user:
        logger.warning(f"Failed login attempt for non-existent email: {credentials.email}")
        await AuditService.log_login_attempt(
            db=db,
            email=credentials.email,
            success=False,
            reason="User not found",
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is locked
    if user.is_locked():
        logger.warning(f"Login attempt for locked account: {credentials.email}")
        await AuditService.log_login_attempt(
            db=db,
            email=credentials.email,
            success=False,
            reason="Account locked",
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is locked due to multiple failed login attempts. Please try again later."
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        logger.warning(f"Failed login attempt for email: {credentials.email}")
        
        # Increment failed login attempts
        user.increment_failed_login()
        await db.commit()
        
        # Audit log for failed login
        await AuditService.log_login_attempt(
            db=db,
            email=credentials.email,
            success=False,
            reason="Invalid password",
            request=request
        )
        
        # Check if account is now locked
        if user.is_locked():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been locked due to multiple failed login attempts. Please try again in 15 minutes."
            )
        
        remaining_attempts = 5 - user.failed_login_attempts
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect email or password. {remaining_attempts} attempts remaining before account lockout.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is active
    if not user.is_active:
        logger.warning(f"Login attempt for inactive user: {credentials.email}")
        await AuditService.log_login_attempt(
            db=db,
            email=credentials.email,
            success=False,
            reason="Account inactive",
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Successful login - reset failed attempts and update last login
    user.reset_failed_login()
    user.update_last_login(client_ip)
    await db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
    )
    
    # Create refresh token
    refresh_token = create_refresh_token(
        data={"user_id": str(user.id)}
    )
    
    # Set HttpOnly cookies
    response.set_cookie(
        key="session_token",
        value=access_token,
        httponly=True,
        secure=True,  # HTTPS only in production
        samesite="lax",  # CSRF protection
        max_age=1800,  # 30 minutes
        path="/",
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=604800,  # 7 days
        path="/api/v1/auth/refresh",  # Only sent to refresh endpoint
    )
    
    # Also set user_role for frontend middleware
    response.set_cookie(
        key="user_role",
        value=user.role.value,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=1800,
    )
    
    # Audit log for successful login
    await AuditService.log_login_attempt(
        db=db,
        email=credentials.email,
        success=True,
        request=request
    )
    
    logger.info(f"Successful login for user: {user.email} (role: {user.role.value}) from IP: {client_ip}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "force_password_change": user.force_password_change
    }


@router.post(
    "/create-official",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
    summary="Create an official account (admin only)",
    responses={
        400: {"description": "Email already exists or password too weak"},
        403: {"description": "Caller is not an admin"},
    },
)
async def create_official(
    official_data: CreateOfficialRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create official accounts (Admin only).
    
    **Authorization:** Admin role required
    
    **Request Body:**
    - email: Official's email address
    - full_name: Official's full name
    - password: Initial password (must be strong)
    - role: One of: admin, moh_officer, ephi_officer, regional_officer
    - district_id: Required for regional_officer, optional for others
    
    **Returns:**
    - User information (without password)
    
    **Example:**
    ```json
    {
        "email": "officer@moh.gov.et",
        "full_name": "Dr. Abebe Kebede",
        "password": "SecurePassword123!",
        "role": "moh_officer",
        "district_id": null
    }
    ```
    """
    # Validate password strength
    is_valid, error_message = validate_password_strength(official_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == official_data.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new official user
    hashed_password = get_password_hash(official_data.password)
    new_user = User(
        email=official_data.email,
        full_name=official_data.full_name,
        password_hash=hashed_password,
        role=official_data.role,
        district_id=official_data.district_id,
        is_active=True,
        force_password_change=True  # New users must change password on first login
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    logger.info(
        f"Admin {current_user.email} created new {official_data.role.value} account: {new_user.email} (force password change enabled)"
    )
    
    return new_user


@router.post(
    "/refresh",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token using refresh token",
    responses={
        401: {"description": "Invalid or expired refresh token"},
    },
)
async def refresh_token(
    request: Request,
    response: Response,
    refresh_token: str = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using the refresh token from HttpOnly cookie.
    
    **Cookies Required:**
    - refresh_token: HttpOnly refresh token
    
    **Returns:**
    - New access_token
    - token_type: "bearer"
    - user: User information
    
    **Cookies Set:**
    - session_token: New HttpOnly access token (30 min)
    - refresh_token: New HttpOnly refresh token (7 days) - token rotation
    - user_role: User role for frontend middleware
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Decode refresh token
    try:
        payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create new tokens (token rotation for security)
    new_access_token = create_access_token(
        data={
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
    )
    
    new_refresh_token = create_refresh_token(
        data={"user_id": str(user.id)}
    )
    
    # Set new HttpOnly cookies
    response.set_cookie(
        key="session_token",
        value=new_access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=1800,  # 30 minutes
        path="/",
    )
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=604800,  # 7 days
        path="/api/v1/auth/refresh",
    )
    
    response.set_cookie(
        key="user_role",
        value=user.role.value,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=1800,
    )
    
    logger.info(f"Token refreshed for user: {user.email}")
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log out and clear authentication cookies",
)
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user)
):
    """
    Logout endpoint - clears all authentication cookies.
    
    **Authorization:** Valid JWT token required
    
    **Returns:**
    - Success message
    
    **Cookies Cleared:**
    - session_token
    - refresh_token
    - user_role
    """
    # Clear all auth cookies by setting them to expire immediately
    response.delete_cookie(key="session_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth/refresh")
    response.delete_cookie(key="user_role", path="/")
    
    logger.info(f"User logged out: {current_user.email}")
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse, summary="Get the authenticated user's profile")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.
    
    **Authorization:** Valid JWT token required
    
    **Returns:**
    - User information (without password)
    
    **Example Response:**
    ```json
    {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "admin@malasafe.gov.et",
        "full_name": "Admin User",
        "role": "admin",
        "district_id": null,
        "is_active": true,
        "created_at": "2024-01-15T10:30:00Z"
    }
    ```
    """
    return current_user


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change user password",
    responses={
        400: {"description": "Invalid current password or weak new password"},
    },
)
async def change_password(
    request: Request,
    password_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change password for the authenticated user.
    
    **Authorization:** Valid JWT token required
    
    **Request Body:**
    - current_password: User's current password
    - new_password: New password (must be strong)
    
    **Returns:**
    - Success message
    - force_password_change: Boolean (will be false after successful change)
    
    **Example:**
    ```json
    {
        "current_password": "OldPassword123!",
        "new_password": "NewSecurePassword456!"
    }
    ```
    """
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both current_password and new_password are required"
        )
    
    # Verify current password
    if not verify_password(current_password, current_user.password_hash):
        logger.warning(f"Failed password change attempt for user: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password strength
    is_valid, error_message = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    # Check if new password is same as current
    if verify_password(new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Update password and clear force_password_change flag
    current_user.password_hash = get_password_hash(new_password)
    current_user.force_password_change = False
    await db.commit()
    
    logger.info(f"Password changed successfully for user: {current_user.email}")
    
    return {
        "message": "Password changed successfully",
        "force_password_change": False
    }
