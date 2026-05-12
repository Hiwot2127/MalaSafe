from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class ClimateData(Base):
    """Climate data model for environmental factors."""
    
    __tablename__ = "climate_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    district_id = Column(UUID(as_uuid=True), ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, index=True)
    rainfall = Column(Float, nullable=True)  # in mm
    temperature = Column(Float, nullable=True)  # in Celsius
    season = Column(String(50), nullable=True, index=True)  # e.g., 'dry', 'wet', 'kiremt', 'bega', 'belg'
    date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    district = relationship("District", back_populates="climate_data")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('rainfall >= 0', name='check_rainfall_non_negative'),
        CheckConstraint('temperature >= -50 AND temperature <= 60', name='check_valid_temperature'),
        # Composite index for common queries
        Index('idx_climate_district_date', 'district_id', 'date'),
        Index('idx_climate_date', 'date'),
    )
    
    def __repr__(self):
        return f"<ClimateData(district_id={self.district_id}, date={self.date}, rainfall={self.rainfall}, temp={self.temperature})>"
    
    def to_dict(self):
        """Convert climate data to dictionary."""
        return {
            "id": str(self.id),
            "district_id": str(self.district_id),
            "rainfall": self.rainfall,
            "temperature": self.temperature,
            "season": self.season,
            "date": self.date.isoformat() if self.date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
