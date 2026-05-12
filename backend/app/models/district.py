from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class District(Base):
    """District model for geographical regions."""
    
    __tablename__ = "districts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    district_code = Column(String(50), unique=True, nullable=False, index=True)
    district_name = Column(String(100), nullable=False, index=True)
    region = Column(String(100), nullable=False, index=True)
    zone = Column(String(100), nullable=True)
    geojson_key = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    malaria_data = relationship("MalariaData", back_populates="district", cascade="all, delete-orphan")
    climate_data = relationship("ClimateData", back_populates="district", cascade="all, delete-orphan")
    environment = relationship("DistrictEnvironment", back_populates="district", uselist=False, cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="district", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="district", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<District(code={self.district_code}, name={self.district_name}, region={self.region})>"
    
    def to_dict(self):
        """Convert district to dictionary."""
        return {
            "id": str(self.id),
            "district_code": self.district_code,
            "district_name": self.district_name,
            "region": self.region,
            "zone": self.zone,
            "geojson_key": self.geojson_key,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
