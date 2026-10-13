from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class IncidentStatusHistory(Base):
    __tablename__ = "incident_status_history"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(
        Integer, ForeignKey("incidents.id"), nullable=False, index=True
    )
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    comment = Column(Text, nullable=True)
    changed_at = Column(DateTime, server_default=func.now())

    incident = relationship("Incident", back_populates="status_history")
    changed_by_user = relationship("User", back_populates="status_changes")