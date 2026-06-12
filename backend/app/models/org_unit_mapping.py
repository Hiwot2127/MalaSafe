from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class OrgUnitMapping(Base):
    """Maps a DHIS2 organisation unit id to a District.

    A single woreda (District) can have several DHIS2 reporting units, so the
    relationship is many org units -> one district. This table holds that
    many-to-one mapping; `districts.organisationunitid` only holds one id per
    district and cannot represent the others. Malaria uploads resolve the
    uploaded `organisationunitid` against this table.
    """

    __tablename__ = "org_unit_mappings"

    org_unit_id = Column(String(50), primary_key=True)
    district_id = Column(
        UUID(as_uuid=True),
        ForeignKey("districts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    org_unit_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    district = relationship("District")

    def __repr__(self):
        return f"<OrgUnitMapping(org_unit_id={self.org_unit_id}, district_id={self.district_id})>"
