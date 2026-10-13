from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False)
    escalated_at = Column(DateTime, server_default=func.now())

    incident = relationship("Incident", back_populates="escalation_logs")
    manager = relationship("User", foreign_keys=[manager_id])