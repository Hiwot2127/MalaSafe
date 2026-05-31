from sqlalchemy import Column, String, Float, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.database import Base


class DriftMetric(str, enum.Enum):
    """The variables drift detection runs against."""
    POSITIVE = "positive"
    RAINFALL = "rainfall"
    TEMP = "temp"
    HUMIDITY = "humidity"


class DriftSeverity(str, enum.Enum):
    """Z-score severity bands."""
    WARN = "warn"        # |z| >= 2
    CRITICAL = "critical"  # |z| >= 3


class DriftFinding(Base):
    """A 3-sigma anomaly detected for one (district, metric) in a close."""

    __tablename__ = "drift_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    monthly_close_id = Column(
        UUID(as_uuid=True),
        ForeignKey("monthly_closes.id", ondelete="CASCADE"),
        nullable=False,
    )
    district_id = Column(
        UUID(as_uuid=True),
        ForeignKey("districts.id", ondelete="CASCADE"),
        nullable=False,
    )
    metric = Column(String(30), nullable=False)
    observed_value = Column(Float, nullable=False)
    baseline_mean = Column(Float, nullable=False)
    baseline_std = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    severity = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    monthly_close = relationship("MonthlyClose", back_populates="drift_findings")
    district = relationship("District", foreign_keys=[district_id])

    __table_args__ = (
        CheckConstraint(
            "metric IN ('positive', 'rainfall', 'temp', 'humidity')",
            name='check_drift_metric',
        ),
        CheckConstraint(
            "severity IN ('warn', 'critical')",
            name='check_drift_severity',
        ),
        Index('ix_drift_close_severity', 'monthly_close_id', 'severity'),
    )

    def __repr__(self):
        return (
            f"<DriftFinding(district_id={self.district_id}, metric={self.metric}, "
            f"z={self.z_score:.2f}, severity={self.severity})>"
        )

    def to_dict(self):
        return {
            "id": str(self.id),
            "monthly_close_id": str(self.monthly_close_id),
            "district_id": str(self.district_id),
            "metric": self.metric,
            "observed_value": self.observed_value,
            "baseline_mean": self.baseline_mean,
            "baseline_std": self.baseline_std,
            "z_score": self.z_score,
            "severity": self.severity,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
