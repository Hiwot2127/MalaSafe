"""Audit log model for tracking security-sensitive operations."""

from sqlalchemy import Column, String, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base


class AuditLog(Base):
    """
    Audit log for tracking all security-sensitive operations.
    
    Tracks:
    - User creation/modification
    - Password resets
    - Login attempts (success/failure)
    - Role changes
    - Data uploads
    - Permission changes
    - System configuration changes
    """
    
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Who performed the action
    actor_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Null for system actions
    actor_email = Column(String, nullable=True)
    actor_role = Column(String, nullable=True)
    
    # What action was performed
    action = Column(String, nullable=False, index=True)  # e.g., "user_created", "login_success"
    resource_type = Column(String, nullable=False, index=True)  # e.g., "user", "upload", "system"
    resource_id = Column(String, nullable=True, index=True)  # ID of affected resource
    
    # Details
    description = Column(Text, nullable=False)
    
    # FIXED: Renamed 'metadata' to 'extra_info' because 'metadata' is a reserved SQLAlchemy word
    extra_info = Column(JSON, nullable=True)  # Additional context (IP, user agent, etc.)
    
    # When
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Request context
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Result
    status = Column(String, nullable=False)  # "success", "failure", "warning"
    
    def __repr__(self):
        return f"<AuditLog(action={self.action}, actor={self.actor_email}, timestamp={self.timestamp})>"