from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema with common attributes."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "admin@malasafe.gov.et",
                "password": "SecurePassword123!"
            }
        }


class CreateOfficialRequest(UserBase):
    """Schema for creating official accounts (admin only)."""
    password: str = Field(..., min_length=8, max_length=100)
    role: UserRole = Field(..., description="Role for the official")
    district_id: Optional[str] = Field(None, max_length=50)
    
    @validator('role')
    def validate_role(cls, v):
        """Ensure only official roles can be assigned."""
        if v == UserRole.PUBLIC_USER:
            raise ValueError("Cannot create public user through this endpoint")
        return v
    
    @validator('district_id')
    def validate_district_id(cls, v, values):
        """Require district_id for regional officers."""
        if 'role' in values and values['role'] == UserRole.REGIONAL_OFFICER:
            if not v:
                raise ValueError("district_id is required for regional officers")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "officer@moh.gov.et",
                "full_name": "Dr. Abebe Kebede",
                "password": "SecurePassword123!",
                "role": "moh_officer",
                "district_id": None
            }
        }


class MobileRegisterRequest(UserBase):
    """Schema for public user self-registration (mobile only)."""
    password: str = Field(..., min_length=8, max_length=100)
    district_id: Optional[str] = Field(None, max_length=50, description="User's district")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "full_name": "Almaz Tesfaye",
                "password": "MySecurePass123!",
                "district_id": "addis_ababa_bole"
            }
        }


class UserResponse(UserBase):
    """Schema for user response (without sensitive data)."""
    id: UUID
    role: UserRole
    district_id: Optional[str]
    is_active: bool
    force_password_change: bool = False
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    status: Optional[str] = "active"
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "admin@malasafe.gov.et",
                "full_name": "Admin User",
                "role": "admin",
                "district_id": None,
                "is_active": True,
                "force_password_change": False,
                "last_login_at": "2024-01-15T10:30:00Z",
                "last_login_ip": "192.168.1.1",
                "status": "active",
                "created_at": "2024-01-15T10:30:00Z"
            }
        }


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    force_password_change: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "force_password_change": False,
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "admin@malasafe.gov.et",
                    "full_name": "Admin User",
                    "role": "admin",
                    "district_id": None,
                    "is_active": True,
                    "created_at": "2024-01-15T10:30:00Z"
                }
            }
        }


class TokenData(BaseModel):
    """Schema for token payload data."""
    user_id: str  # UUID as string
    email: str
    role: str
