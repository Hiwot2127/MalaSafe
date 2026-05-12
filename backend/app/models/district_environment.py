from sqlalchemy import Column, Float, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class DistrictEnvironment(Base):
    """District environmental characteristics model."""
    
    __tablename__ = "district_environment"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    district_id = Column(UUID(as_uuid=True), ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    altitude = Column(Float, nullable=True)  # in meters above sea level
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    district = relationship("District", back_populates="environment")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('altitude >= -500 AND altitude <= 9000', name='check_valid_altitude'),
    )
    
    def __repr__(self):
        return f"<DistrictEnvironment(district_id={self.district_id}, altitude={self.altitude})>"
    
    def to_dict(self):
        """Convert district environment to dictionary."""
        return {
            "id": str(self.id),
            "district_id": str(self.district_id),
            "altitude": self.altitude,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
