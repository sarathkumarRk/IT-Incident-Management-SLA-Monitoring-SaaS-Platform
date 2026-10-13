from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class IncidentAssignment(Base):
    __tablename__ = "incident_assignments"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(
        Integer, ForeignKey("incidents.id"), nullable=False, index=True
    )
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)
    assigned_at = Column(DateTime, server_default=func.now())

    incident = relationship("Incident", back_populates="assignments")
    assignee = relationship(
        "User", back_populates="assignments",
        foreign_keys=[assigned_to]
    )
    assigner = relationship("User", foreign_keys=[assigned_by])