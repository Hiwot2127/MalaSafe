from sqlalchemy import Column, String, Float, Text, Date, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.database import Base


class RiskLevel(str, enum.Enum):
    """Risk level enumeration."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"


class Prediction(Base):
    """Malaria risk prediction model."""
    
    __tablename__ = "predictions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    district_id = Column(UUID(as_uuid=True), ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_level = Column(String(20), nullable=False, index=True)  # low, moderate, high, very_high
    confidence_score = Column(Float, nullable=False)  # 0.0 to 1.0
    prediction_score = Column(Float, nullable=False)  # Model's raw prediction score
    q10 = Column(Float, nullable=True)  # 10th percentile bound from quantile booster (lower CI)
    q90 = Column(Float, nullable=True)  # 90th percentile bound from quantile booster (upper CI)
    prediction_reason = Column(Text, nullable=True)  # Explanation of prediction
    prediction_date = Column(Date, nullable=False, index=True)  # Date for which prediction is made
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    district = relationship("District", back_populates="predictions")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('confidence_score >= 0 AND confidence_score <= 1', name='check_valid_confidence'),
        CheckConstraint("risk_level IN ('low', 'moderate', 'high', 'very_high')", name='check_valid_risk_level'),
        # Composite index for common queries
        Index('idx_prediction_district_date', 'district_id', 'prediction_date'),
        Index('idx_prediction_date_risk', 'prediction_date', 'risk_level'),
    )
    
    def __repr__(self):
        return f"<Prediction(district_id={self.district_id}, date={self.prediction_date}, risk={self.risk_level})>"
    
    def to_dict(self):
        """Convert prediction to dictionary."""
        return {
            "id": str(self.id),
            "district_id": str(self.district_id),
            "risk_level": self.risk_level,
            "confidence_score": self.confidence_score,
            "prediction_score": self.prediction_score,
            "q10": self.q10,
            "q90": self.q90,
            "prediction_reason": self.prediction_reason,
            "prediction_date": self.prediction_date.isoformat() if self.prediction_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
