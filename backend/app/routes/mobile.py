from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas import MobileRegisterRequest, UserResponse
from app.utils import (
    get_password_hash,
    validate_password_strength,
)
from loguru import logger

router = APIRouter(prefix="/mobile", tags=["Mobile"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Public self-registration (creates public_user)",
    responses={400: {"description": "Email already exists or password too weak"}},
)
async def mobile_register(
    user_data: MobileRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Public user self-registration (Mobile app only).
    
    This endpoint allows public users to create their own accounts.
    Only public_user role can be created through this endpoint.
    
    **Request Body:**
    - email: User's email address
    - full_name: User's full name
    - password: Password (must be strong)
    - district_id: Optional district identifier
    
    **Returns:**
    - User information (without password)
    
    **Example:**
    ```json
    {
        "email": "user@example.com",
        "full_name": "Almaz Tesfaye",
        "password": "MySecurePass123!",
        "district_id": "addis_ababa_bole"
    }
    ```
    
    **Password Requirements:**
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    # Validate password strength
    is_valid, error_message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new public user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=hashed_password,
        role=UserRole.PUBLIC_USER,  # Always public user for self-registration
        district_id=user_data.district_id,
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    logger.info(f"New public user registered: {new_user.email}")
    
    return new_user
