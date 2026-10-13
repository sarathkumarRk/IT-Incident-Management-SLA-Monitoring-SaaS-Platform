from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SLAPolicyCreate(BaseModel):
    priority: str
    first_response_minutes: int
    resolution_minutes: int
    exclude_pending_time: bool = False


class SLAPolicyResponse(BaseModel):
    id: int
    priority: str
    first_response_minutes: int
    resolution_minutes: int
    exclude_pending_time: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SLATrackingResponse(BaseModel):
    id: int
    incident_id: int
    policy_id: int
    first_response_deadline: datetime
    resolution_deadline: datetime
    first_responded_at: datetime | None
    resolved_at: datetime | None
    response_breached: bool
    resolution_breached: bool

    model_config = ConfigDict(from_attributes=True)