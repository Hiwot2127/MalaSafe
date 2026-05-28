"""
Response Recommendation Model
Stores generated response recommendations for predictions
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database.base import Base


class ResponseRecommendation(Base):
    """Response recommendation for malaria prediction"""
    
    __tablename__ = "response_recommendations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prediction_id = Column(UUID(as_uuid=True), ForeignKey("predictions.id"), nullable=False)
    district_id = Column(UUID(as_uuid=True), ForeignKey("districts.id"), nullable=False)
    
    # Recommendation details
    risk_level = Column(String(50), nullable=False)  # low, moderate, high, very_high
    category = Column(String(100), nullable=False)  # Prevention, Medical, Surveillance, etc.
    recommendation_text = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False)  # low, medium, high, critical
    trigger_reason = Column(Text, nullable=True)  # Why this recommendation was generated
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    prediction = relationship("Prediction", back_populates="recommendations")
    district = relationship("District")
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_response_rec_prediction", "prediction_id"),
        Index("idx_response_rec_district", "district_id"),
        Index("idx_response_rec_priority", "priority"),
        Index("idx_response_rec_category", "category"),
        Index("idx_response_rec_created", "created_at"),
    )
    
    def __repr__(self):
        return f"<ResponseRecommendation(id={self.id}, category={self.category}, priority={self.priority})>"
