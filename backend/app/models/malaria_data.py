from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class MalariaData(Base):
    """Malaria case data model."""
    
    __tablename__ = "malaria_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    district_id = Column(UUID(as_uuid=True), ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False, index=True)  # e.g., 'manual', 'file_upload', 'api'
    week = Column(Integer, nullable=True)
    month = Column(Integer, nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    cases = Column(Integer, nullable=False, default=0)
    deaths = Column(Integer, nullable=False, default=0)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    district = relationship("District", back_populates="malaria_data")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    
    # Constraints
    __table_args__ = (
        CheckConstraint('cases >= 0', name='check_cases_non_negative'),
        CheckConstraint('deaths >= 0', name='check_deaths_non_negative'),
        CheckConstraint('deaths <= cases', name='check_deaths_not_exceed_cases'),
        CheckConstraint('week >= 1 AND week <= 53', name='check_valid_week'),
        CheckConstraint('month >= 1 AND month <= 12', name='check_valid_month'),
        CheckConstraint('year >= 2000 AND year <= 2100', name='check_valid_year'),
        # Composite index for common queries
        Index('idx_malaria_district_year_month', 'district_id', 'year', 'month'),
        Index('idx_malaria_year_month', 'year', 'month'),
    )
    
    def __repr__(self):
        return f"<MalariaData(district_id={self.district_id}, year={self.year}, month={self.month}, cases={self.cases})>"
    
    def to_dict(self):
        """Convert malaria data to dictionary."""
        return {
            "id": str(self.id),
            "district_id": str(self.district_id),
            "source_type": self.source_type,
            "week": self.week,
            "month": self.month,
            "year": self.year,
            "cases": self.cases,
            "deaths": self.deaths,
            "uploaded_by": str(self.uploaded_by) if self.uploaded_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
