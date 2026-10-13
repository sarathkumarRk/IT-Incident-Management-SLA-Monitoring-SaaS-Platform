import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, admin_required
from app.models.user import User
from app.models.incident import Incident
from app.models.sla_policy import SLAPolicy
from app.models.sla_tracking import SLATracking
from app.schemas.sla import SLAPolicyCreate, SLAPolicyResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/sla",
    tags=["SLA Monitoring"],
)

ALLOWED_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


# 1. View all SLA policies
@router.get("/policies", response_model=list[SLAPolicyResponse])
def get_sla_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(SLAPolicy)
        .filter(SLAPolicy.is_active.is_(True))
        .order_by(SLAPolicy.id.asc())
        .all()
    )


# 2. Create an SLA policy (Admin only)
@router.post("/policies", response_model=SLAPolicyResponse, status_code=201)
def create_sla_policy(
    policy_data: SLAPolicyCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    priority = policy_data.priority.upper()

    if priority not in ALLOWED_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Priority must be CRITICAL, HIGH, MEDIUM, or LOW",
        )

    if (
        policy_data.first_response_minutes <= 0
        or policy_data.resolution_minutes <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail="SLA time targets must be greater than zero",
        )

    existing_policy = (
        db.query(SLAPolicy)
        .filter(SLAPolicy.priority == priority)
        .first()
    )

    if existing_policy:
        raise HTTPException(
            status_code=409,
            detail="An SLA policy already exists for this priority",
        )

    policy = SLAPolicy(
        priority=priority,
        first_response_minutes=policy_data.first_response_minutes,
        resolution_minutes=policy_data.resolution_minutes,
        exclude_pending_time=policy_data.exclude_pending_time,
        is_active=True,
    )

    try:
        db.add(policy)
        db.commit()
        db.refresh(policy)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to create SLA policy")
        raise HTTPException(
            status_code=500,
            detail="Unable to create SLA policy",
        )

    return policy


# 3. Update an SLA policy (Admin only)
@router.patch("/policies/{policy_id}", response_model=SLAPolicyResponse)
def update_sla_policy(
    policy_id: int,
    policy_data: SLAPolicyCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    policy = (
        db.query(SLAPolicy)
        .filter(SLAPolicy.id == policy_id)
        .first()
    )

    if not policy:
        raise HTTPException(
            status_code=404,
            detail="SLA policy not found",
        )

    priority = policy_data.priority.upper()

    if priority not in ALLOWED_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid priority",
        )

    if (
        policy_data.first_response_minutes <= 0
        or policy_data.resolution_minutes <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail="SLA time targets must be greater than zero",
        )

    duplicate = (
        db.query(SLAPolicy)
        .filter(
            SLAPolicy.priority == priority,
            SLAPolicy.id != policy_id,
        )
        .first()
    )

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Another policy already exists for this priority",
        )

    policy.priority = priority
    policy.first_response_minutes = policy_data.first_response_minutes
    policy.resolution_minutes = policy_data.resolution_minutes
    policy.exclude_pending_time = policy_data.exclude_pending_time

    try:
        db.commit()
        db.refresh(policy)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to update SLA policy")
        raise HTTPException(
            status_code=500,
            detail="Unable to update SLA policy",
        )

    return policy


# 4. View SLA breaches (Admin and Manager)
@router.get("/breaches")
def get_sla_breaches(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["ADMIN", "MANAGER"]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin or Manager can view SLA breaches",
        )

    query = (
        db.query(SLATracking, Incident)
        .join(Incident, Incident.id == SLATracking.incident_id)
        .filter(
            (SLATracking.response_breached.is_(True))
            | (SLATracking.resolution_breached.is_(True))
        )
        .order_by(Incident.created_at.desc())
    )

    results = (
        query
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return [
        {
            "incident_id": incident.id,
            "title": incident.title,
            "priority": incident.priority,
            "status": incident.status,
            "response_breached": tracking.response_breached,
            "resolution_breached": tracking.resolution_breached,
            "first_response_deadline": tracking.first_response_deadline,
            "resolution_deadline": tracking.resolution_deadline,
        }
        for tracking, incident in results
    ]
