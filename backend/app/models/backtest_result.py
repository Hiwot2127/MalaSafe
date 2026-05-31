from sqlalchemy import Boolean, Column, String, Float, Integer, Date, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class BacktestResult(Base):
    """Predicted-vs-actual for one district within one monthly close.

    Populated by BacktestService after a monthly upload lands. Stores the
    interval bounds (q10/q90) snapshot so calibration coverage stays
    reproducible even if the prediction row changes later.
    """

    __tablename__ = "backtest_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    monthly_close_id = Column(
        UUID(as_uuid=True),
        ForeignKey("monthly_closes.id", ondelete="CASCADE"),
        nullable=False,
    )
    model_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("model_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    district_id = Column(
        UUID(as_uuid=True),
        ForeignKey("districts.id", ondelete="CASCADE"),
        nullable=False,
    )
    month = Column(Date, nullable=False)
    actual_positive = Column(Integer, nullable=False)
    predicted_positive = Column(Float, nullable=False)
    predicted_risk = Column(String(20), nullable=True)
    q10 = Column(Float, nullable=True)
    q90 = Column(Float, nullable=True)
    abs_error = Column(Float, nullable=False)
    pct_error = Column(Float, nullable=True)
    within_q10_q90 = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    monthly_close = relationship("MonthlyClose", back_populates="backtest_results")
    model_version = relationship("ModelVersion", foreign_keys=[model_version_id])
    district = relationship("District", foreign_keys=[district_id])

    __table_args__ = (
        UniqueConstraint('monthly_close_id', 'district_id', name='uq_backtest_close_district'),
        Index('ix_backtest_model_month', 'model_version_id', 'month'),
    )

    def __repr__(self):
        return (
            f"<BacktestResult(district_id={self.district_id}, month={self.month}, "
            f"actual={self.actual_positive}, predicted={self.predicted_positive:.1f})>"
        )

    def to_dict(self):
        return {
            "id": str(self.id),
            "monthly_close_id": str(self.monthly_close_id),
            "model_version_id": str(self.model_version_id) if self.model_version_id else None,
            "district_id": str(self.district_id),
            "month": self.month.isoformat() if self.month else None,
            "actual_positive": self.actual_positive,
            "predicted_positive": self.predicted_positive,
            "predicted_risk": self.predicted_risk,
            "q10": self.q10,
            "q90": self.q90,
            "abs_error": self.abs_error,
            "pct_error": self.pct_error,
            "within_q10_q90": self.within_q10_q90,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
