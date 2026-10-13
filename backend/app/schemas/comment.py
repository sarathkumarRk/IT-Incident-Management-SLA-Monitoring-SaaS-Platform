from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CommentCreate(BaseModel):
    comment: str
    is_internal: bool = False


class CommentResponse(BaseModel):
    id: int
    incident_id: int
    user_id: int
    comment: str
    is_internal: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)