from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    priority = Column(String(20), nullable=False, default="MEDIUM")
    status = Column(String(30), nullable=False, default="OPEN")
    affected_service = Column(String(150), nullable=False)

    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)

    resolution_details = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_incidents_status_priority", "status", "priority"),
    )

    reporter = relationship(
        "User", back_populates="reported_incidents",
        foreign_keys=[reporter_id]
    )
    team = relationship("Team", back_populates="incidents")
    assignments = relationship("IncidentAssignment", back_populates="incident")
    comments = relationship("IncidentComment", back_populates="incident")
    attachments = relationship("IncidentAttachment", back_populates="incident")
    status_history = relationship(
        "IncidentStatusHistory", back_populates="incident"
    )
    sla_tracking = relationship(
        "SLATracking", back_populates="incident", uselist=False
    )
    escalation_logs = relationship("EscalationLog", back_populates="incident")
    notifications = relationship("Notification", back_populates="incident")
    audit_logs = relationship("AuditLog", back_populates="incident")