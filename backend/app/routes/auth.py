from fastapi import APIRouter, Depends, HTTPException, status, Request
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
    create_access_token,
)
from app.utils.dependencies import (
    get_current_user,
    require_admin,
)
from app.services.audit_service import AuditService
from loguru import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Log in and receive a JWT bearer token",
    responses={
        401: {"description": "Incorrect email or password"},
        403: {"description": "Account is inactive"},
    },
)
async def login(
    credentials: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Login endpoint for all users.
    
    **Request Body:**
    - email: User's email address
    - password: User's password
    
    **Returns:**
    - access_token: JWT token for authentication
    - token_type: "bearer"
    - user: User information
    
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
    
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"Failed login attempt for email: {credentials.email}")
        # Audit log for failed login
        await AuditService.log_login_attempt(
            db=db,
            email=credentials.email,
            success=False,
            reason="Invalid credentials",
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"Login attempt for inactive user: {credentials.email}")
        # Audit log for inactive user login attempt
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
    
    # Create access token
    access_token = create_access_token(
        data={
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
    )
    
    # Audit log for successful login
    await AuditService.log_login_attempt(
        db=db,
        email=credentials.email,
        success=True,
        request=request
    )
    
    logger.info(f"Successful login for user: {user.email} (role: {user.role.value})")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
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
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    logger.info(
        f"Admin {current_user.email} created new {official_data.role.value} account: {new_user.email}"
    )
    
    return new_user


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
