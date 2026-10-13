from datetime import datetime
from pydantic import BaseModel, ConfigDict


class IncidentCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "MEDIUM"
    affected_service: str
    team_id: int | None = None


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    priority: str | None = None
    affected_service: str | None = None


class IncidentAssign(BaseModel):
    assigned_to: int
    reason: str | None = None


class IncidentStatusUpdate(BaseModel):
    status: str
    comment: str | None = None
    resolution_details: str | None = None


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    affected_service: str
    reporter_id: int
    team_id: int | None
    resolution_details: str | None
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)