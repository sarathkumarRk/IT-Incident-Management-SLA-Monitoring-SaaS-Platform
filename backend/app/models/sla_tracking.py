from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SLATracking(Base):
    __tablename__ = "sla_tracking"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(
        Integer, ForeignKey("incidents.id"), unique=True, nullable=False
    )
    policy_id = Column(Integer, ForeignKey("sla_policies.id"), nullable=False)

    first_response_deadline = Column(DateTime, nullable=False)
    resolution_deadline = Column(DateTime, nullable=False)
    first_responded_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    response_breached = Column(Boolean, default=False, nullable=False)
    resolution_breached = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    incident = relationship("Incident", back_populates="sla_tracking")
    policy = relationship("SLAPolicy", back_populates="tracking_records")