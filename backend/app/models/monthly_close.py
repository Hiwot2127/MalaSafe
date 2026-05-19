from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.database import Base


class MonthlyCloseMode(str, enum.Enum):
    """Routing modes for monthly close orchestration."""
    CLOSE = "close"
    BACKFILL = "backfill"


class MonthlyCloseStatus(str, enum.Enum):
    """Async orchestration state machine."""
    PENDING = "pending"
    CLIMATE_FETCHING = "climate_fetching"
    BACKTESTING = "backtesting"
    DRIFT_CHECKING = "drift_checking"
    PREDICTING = "predicting"
    COMPLETED = "completed"
    FAILED = "failed"


class MonthlyClose(Base):
    """One row per monthly upload that triggers the closing pipeline."""

    __tablename__ = "monthly_closes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    month = Column(Date, nullable=False, index=True)
    uploaded_file_id = Column(
        UUID(as_uuid=True),
        ForeignKey("uploaded_files.id", ondelete="SET NULL"),
        nullable=True,
    )
    triggered_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    mode = Column(String(20), nullable=False)
    status = Column(String(30), nullable=False, default='pending')
    idempotency_key = Column(String(128), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(Text, nullable=True)
    stats_json = Column(JSONB, nullable=True)

    uploaded_file = relationship("UploadedFile", foreign_keys=[uploaded_file_id])
    triggered_by = relationship("User", foreign_keys=[triggered_by_user_id])
    backtest_results = relationship("BacktestResult", back_populates="monthly_close", cascade="all, delete-orphan")
    drift_findings = relationship("DriftFinding", back_populates="monthly_close", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "mode IN ('close', 'backfill')",
            name='check_monthly_close_mode',
        ),
        CheckConstraint(
            "status IN ('pending', 'climate_fetching', 'backtesting', 'drift_checking', "
            "'predicting', 'completed', 'failed')",
            name='check_monthly_close_status',
        ),
        Index('ix_monthly_closes_status', 'status'),
    )

    def __repr__(self):
        return f"<MonthlyClose(month={self.month}, mode={self.mode}, status={self.status})>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "month": self.month.isoformat() if self.month else None,
            "uploaded_file_id": str(self.uploaded_file_id) if self.uploaded_file_id else None,
            "triggered_by_user_id": str(self.triggered_by_user_id) if self.triggered_by_user_id else None,
            "mode": self.mode,
            "status": self.status,
            "idempotency_key": self.idempotency_key,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
            "stats_json": self.stats_json,
        }
