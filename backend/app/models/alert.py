from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class Alert(Base):
    """Alert model for malaria risk notifications."""
    
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    district_id = Column(UUID(as_uuid=True), ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_level = Column(String(20), nullable=False, index=True)  # low, moderate, high, very_high
    message = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    district = relationship("District", back_populates="alerts")
    
    # Constraints
    __table_args__ = (
        CheckConstraint("risk_level IN ('low', 'moderate', 'high', 'very_high')", name='check_alert_valid_risk_level'),
        # Composite index for common queries
        Index('idx_alert_district_active', 'district_id', 'is_active'),
        Index('idx_alert_active_created', 'is_active', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Alert(district_id={self.district_id}, risk={self.risk_level}, active={self.is_active})>"
    
    def to_dict(self):
        """Convert alert to dictionary."""
        return {
            "id": str(self.id),
            "district_id": str(self.district_id),
            "risk_level": self.risk_level,
            "message": self.message,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
