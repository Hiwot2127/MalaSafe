from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class UploadedFile(Base):
    """Uploaded file tracking model."""
    
    __tablename__ = "uploaded_files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    file_name = Column(String(255), nullable=False)
    upload_type = Column(String(50), nullable=False, index=True)  # e.g., 'malaria_data', 'climate_data', 'bulk_import'
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    uploader = relationship("User", foreign_keys=[uploaded_by])
    
    # Indexes
    __table_args__ = (
        Index('idx_uploaded_file_type_date', 'upload_type', 'created_at'),
        Index('idx_uploaded_file_uploader_date', 'uploaded_by', 'created_at'),
    )
    
    def __repr__(self):
        return f"<UploadedFile(name={self.file_name}, type={self.upload_type})>"
    
    def to_dict(self):
        """Convert uploaded file to dictionary."""
        return {
            "id": str(self.id),
            "file_name": self.file_name,
            "upload_type": self.upload_type,
            "uploaded_by": str(self.uploaded_by) if self.uploaded_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
