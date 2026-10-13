from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="REPORTER")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    reported_incidents = relationship(
        "Incident", back_populates="reporter",
        foreign_keys="Incident.reporter_id"
    )
    assignments = relationship(
        "IncidentAssignment", back_populates="assignee",
        foreign_keys="IncidentAssignment.assigned_to"
    )
    comments = relationship("IncidentComment", back_populates="user")
    attachments = relationship("IncidentAttachment", back_populates="uploader")
    status_changes = relationship(
        "IncidentStatusHistory", back_populates="changed_by_user"
    )
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")