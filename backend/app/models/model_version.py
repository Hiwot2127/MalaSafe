from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.database import Base


class ModelVersionStatus(str, enum.Enum):
    """Lifecycle of a trained LightGBM artifact bundle."""
    CANDIDATE = "candidate"
    ACTIVE = "active"
    ARCHIVED = "archived"
    ROLLED_BACK = "rolled_back"


class ModelVersion(Base):
    """Registry of LightGBM artifact bundles.

    One row per training run. Exactly one row holds status='active' at any
    time (enforced by a partial unique index in migration 003).
    """

    __tablename__ = "model_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version = Column(String(50), nullable=False, unique=True)
    status = Column(String(20), nullable=False)
    artifacts_path = Column(String(512), nullable=False)
    model_card_json = Column(JSONB, nullable=True)
    risk_thresholds_json = Column(JSONB, nullable=True)
    trained_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    promoted_at = Column(DateTime(timezone=True), nullable=True)
    promoted_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    train_data_window_start = Column(Date, nullable=True)
    train_data_window_end = Column(Date, nullable=True)
    parent_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("model_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes = Column(Text, nullable=True)

    promoted_by = relationship("User", foreign_keys=[promoted_by_user_id])
    parent = relationship("ModelVersion", remote_side=[id])

    __table_args__ = (
        CheckConstraint(
            "status IN ('candidate', 'active', 'archived', 'rolled_back')",
            name='check_model_version_status',
        ),
        Index('ix_model_versions_status', 'status'),
    )

    def __repr__(self):
        return f"<ModelVersion(version={self.version}, status={self.status})>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "version": self.version,
            "status": self.status,
            "artifacts_path": self.artifacts_path,
            "model_card_json": self.model_card_json,
            "risk_thresholds_json": self.risk_thresholds_json,
            "trained_at": self.trained_at.isoformat() if self.trained_at else None,
            "promoted_at": self.promoted_at.isoformat() if self.promoted_at else None,
            "promoted_by_user_id": str(self.promoted_by_user_id) if self.promoted_by_user_id else None,
            "train_data_window_start": self.train_data_window_start.isoformat() if self.train_data_window_start else None,
            "train_data_window_end": self.train_data_window_end.isoformat() if self.train_data_window_end else None,
            "parent_version_id": str(self.parent_version_id) if self.parent_version_id else None,
            "notes": self.notes,
        }
