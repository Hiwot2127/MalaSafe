from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from datetime import datetime, timedelta
from app.database import Base


class UserRole(str, enum.Enum):
    """User roles for role-based access control."""
    ADMIN = "admin"
    MOH_OFFICER = "moh_officer"
    EPHI_OFFICER = "ephi_officer"
    REGIONAL_OFFICER = "regional_officer"
    PUBLIC_USER = "public_user"


class User(Base):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(
        SQLEnum(UserRole, values_callable=lambda enum_cls: [member.value for member in enum_cls]),
        nullable=False,
        default=UserRole.PUBLIC_USER,
    )
    district_id = Column(String, nullable=True)  # For regional/district officers
    is_active = Column(Boolean, default=True)
    
    # Security fields
    force_password_change = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    account_locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
    
    def has_role(self, *roles: UserRole) -> bool:
        """Check if user has any of the specified roles."""
        return self.role in roles
    
    def is_admin(self) -> bool:
        """Check if user is an admin."""
        return self.role == UserRole.ADMIN
    
    def is_official(self) -> bool:
        """Check if user is any type of official (not public user)."""
        return self.role in [
            UserRole.ADMIN,
            UserRole.MOH_OFFICER,
            UserRole.EPHI_OFFICER,
            UserRole.REGIONAL_OFFICER
        ]
    
    def is_locked(self) -> bool:
        """Check if account is currently locked."""
        if self.account_locked_until is None:
            return False
        # Handle both aware and naive datetimes
        now = datetime.utcnow()
        if self.account_locked_until.tzinfo is not None and now.tzinfo is None:
            # account_locked_until is aware, now is naive - make now aware
            from datetime import timezone
            now = now.replace(tzinfo=timezone.utc)
        elif self.account_locked_until.tzinfo is None and now.tzinfo is not None:
            # account_locked_until is naive, now is aware - make account_locked_until aware
            from datetime import timezone
            account_locked_until = self.account_locked_until.replace(tzinfo=timezone.utc)
            return now < account_locked_until
        return now < self.account_locked_until
    
    def lock_account(self, minutes: int = 15):
        """Lock account for specified minutes."""
        self.account_locked_until = datetime.utcnow() + timedelta(minutes=minutes)
        self.failed_login_attempts = 0
    
    def unlock_account(self):
        """Unlock account."""
        self.account_locked_until = None
        self.failed_login_attempts = 0
    
    def increment_failed_login(self):
        """Increment failed login attempts and lock if threshold reached."""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.lock_account(15)
    
    def reset_failed_login(self):
        """Reset failed login attempts on successful login."""
        self.failed_login_attempts = 0
        self.account_locked_until = None
    
    def update_last_login(self, ip_address: str):
        """Update last login timestamp and IP."""
        self.last_login_at = datetime.utcnow()
        self.last_login_ip = ip_address
    
    @property
    def status(self) -> str:
        """Get user status."""
        if not self.is_active:
            return "inactive"
        if self.is_locked():
            return "locked"
        if self.force_password_change:
            return "password_reset_required"
        return "active"
