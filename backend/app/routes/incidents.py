import asyncio
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, aliased

from app.database import get_db
from app.dependencies import get_current_user
from app.models.incident import Incident
from app.models.incident_assignment import IncidentAssignment
from app.models.incident_attachment import IncidentAttachment
from app.models.incident_status_history import IncidentStatusHistory
from app.models.team import Team
from app.models.user import User
from app.schemas.incident import (
    IncidentCreate,
    IncidentAssign,
    IncidentStatusUpdate,
    IncidentResponse,
)
from app.services.email_service import (
    send_incident_assigned_email,
    send_incident_reassigned_email,
    send_incident_resolved_email,
    send_incident_reopened_email,
)
from app.services.sla_service import create_sla_tracking
from app.services.websocket_service import (
    notify_incident_status,
    notify_incident_assignment,
)
from app.services.attachment_service import upload_attachment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["Incidents"])

ALLOWED_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

ALLOWED_STATUSES = [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "PENDING",
    "RESOLVED",
    "CLOSED",
]

ALLOWED_ROLES = [
    "ADMIN",
    "MANAGER",
    "SUPPORT_AGENT",
    "REPORTER",
]

STATUS_TRANSITIONS = {
    "OPEN": ["ASSIGNED", "CLOSED"],
    "ASSIGNED": ["IN_PROGRESS", "PENDING", "RESOLVED"],
    "IN_PROGRESS": ["PENDING", "RESOLVED"],
    "PENDING": ["IN_PROGRESS", "RESOLVED"],
    "RESOLVED": ["CLOSED", "IN_PROGRESS"],
    "CLOSED": [],
}

MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

ALLOWED_ATTACHMENT_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".doc",
    ".docx",
    ".txt",
    ".csv",
    ".xlsx",
}


def get_latest_assignment(db: Session, incident_id: int):
    return (
        db.query(IncidentAssignment)
        .filter(IncidentAssignment.incident_id == incident_id)
        .order_by(IncidentAssignment.id.desc())
        .first()
    )


def check_incident_access(
    db: Session,
    incident: Incident,
    user: User,
):
    if user.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access incidents",
        )

    if user.role == "REPORTER":
        if incident.reporter_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="You can access only your own incidents",
            )

    elif user.role == "SUPPORT_AGENT":
        assignment = get_latest_assignment(db, incident.id)

        if not assignment or assignment.assigned_to != user.id:
            raise HTTPException(
                status_code=403,
                detail="You can access only incidents assigned to you",
            )


async def safe_send_email(function, *args):
    try:
        await asyncio.to_thread(function, *args)
    except Exception:
        logger.exception("Incident notification email failed")


async def safe_status_notification(
    incident_id: int,
    new_status: str,
    user_ids: list[int],
):
    try:
        await notify_incident_status(
            incident_id,
            new_status,
            user_ids=list(set(user_ids)),
        )
    except Exception:
        logger.exception("Incident status WebSocket notification failed")


async def safe_assignment_notification(
    incident_id: int,
    assigned_to: int,
    user_ids: list[int],
):
    try:
        await notify_incident_assignment(
            incident_id,
            assigned_to,
            user_ids=list(set(user_ids)),
        )
    except Exception:
        logger.exception("Incident assignment WebSocket notification failed")


@router.post(
    "/",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_incident(
    incident_data: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You cannot create incidents",
        )

    priority = incident_data.priority.upper()

    if priority not in ALLOWED_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid incident priority",
        )

    if incident_data.team_id is not None:
        team = db.query(Team).filter(
            Team.id == incident_data.team_id
        ).first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found",
            )

    incident = Incident(
        title=incident_data.title,
        description=incident_data.description,
        category=incident_data.category,
        priority=priority,
        status="OPEN",
        affected_service=incident_data.affected_service,
        reporter_id=current_user.id,
        team_id=incident_data.team_id,
    )

    try:
        db.add(incident)
        db.flush()

        create_sla_tracking(db, incident)

        db.add(
            IncidentStatusHistory(
                incident_id=incident.id,
                changed_by=current_user.id,
                old_status=None,
                new_status="OPEN",
                comment="Incident created",
            )
        )

        db.commit()
        db.refresh(incident)

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to create incident")
        raise HTTPException(
            status_code=500,
            detail="Unable to create incident",
        )

    return incident


@router.get("/", response_model=list[IncidentResponse])
def get_incidents(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    incident_status: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
    category: str | None = Query(None),
    assignee_id: int | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You cannot view incidents",
        )

    query = db.query(Incident)

    if current_user.role == "REPORTER":
        query = query.filter(
            Incident.reporter_id == current_user.id
        )

    if current_user.role == "SUPPORT_AGENT":
        latest_ids = (
            db.query(
                IncidentAssignment.incident_id,
                func.max(IncidentAssignment.id).label("latest_id"),
            )
            .group_by(IncidentAssignment.incident_id)
            .subquery()
        )

        CurrentAssignment = aliased(IncidentAssignment)

        query = (
            query
            .join(
                latest_ids,
                latest_ids.c.incident_id == Incident.id,
            )
            .join(
                CurrentAssignment,
                CurrentAssignment.id == latest_ids.c.latest_id,
            )
            .filter(
                CurrentAssignment.assigned_to == current_user.id
            )
        )

    if incident_status:
        incident_status = incident_status.upper()

        if incident_status not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid incident status",
            )

        query = query.filter(Incident.status == incident_status)

    if priority:
        priority = priority.upper()

        if priority not in ALLOWED_PRIORITIES:
            raise HTTPException(
                status_code=400,
                detail="Invalid incident priority",
            )

        query = query.filter(Incident.priority == priority)

    if category:
        query = query.filter(Incident.category == category)

    if assignee_id is not None:
        latest_ids = (
            db.query(
                IncidentAssignment.incident_id,
                func.max(IncidentAssignment.id).label("latest_id"),
            )
            .group_by(IncidentAssignment.incident_id)
            .subquery()
        )

        CurrentAssignment = aliased(IncidentAssignment)

        query = (
            query
            .join(
                latest_ids,
                latest_ids.c.incident_id == Incident.id,
            )
            .join(
                CurrentAssignment,
                CurrentAssignment.id == latest_ids.c.latest_id,
            )
            .filter(
                CurrentAssignment.assigned_to == assignee_id
            )
        )

    if date_from:
        query = query.filter(Incident.created_at >= date_from)

    if date_to:
        query = query.filter(Incident.created_at <= date_to)

    return (
        query
        .order_by(Incident.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    check_incident_access(db, incident, current_user)
    return incident


@router.post(
    "/{incident_id}/attachments",
    status_code=status.HTTP_201_CREATED,
)
def upload_incident_attachment(
    incident_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    check_incident_access(db, incident, current_user)

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="A file must be selected",
        )

    import os

    extension = os.path.splitext(file.filename)[1].lower()

    if extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="File type is not allowed",
        )

    content = file.file.read(MAX_ATTACHMENT_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty",
        )

    if len(content) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File size cannot exceed 10 MB",
        )

    from io import BytesIO

    try:
        upload_result = upload_attachment(
            BytesIO(content),
            folder=f"incident_attachments/{incident_id}",
        )
    except ValueError as exc:
        logger.exception("Cloudinary upload failed")
        raise HTTPException(
            status_code=502,
            detail="Unable to upload attachment to cloud storage",
        ) from exc

    file_url = upload_result.get("url")
    public_id = upload_result.get("public_id")

    if not file_url or not public_id:
        logger.error("Cloudinary returned an incomplete upload result")
        raise HTTPException(
            status_code=502,
            detail="Cloud storage did not return the file details",
        )

    attachment = IncidentAttachment(
        incident_id=incident.id,
        uploaded_by=current_user.id,
        file_name=file.filename,
        file_url=file_url,
        public_id=public_id,
    )

    try:
        db.add(attachment)
        db.commit()
        db.refresh(attachment)

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Failed to save attachment record for incident %s",
            incident_id,
        )
        raise HTTPException(
            status_code=500,
            detail="File uploaded, but attachment details could not be saved",
        )

    return {
        "message": "Incident attachment uploaded successfully",
        "id": attachment.id,
        "incident_id": attachment.incident_id,
        "uploaded_by": attachment.uploaded_by,
        "file_name": attachment.file_name,
        "file_url": attachment.file_url,
        "created_at": attachment.created_at,
    }


@router.patch("/{incident_id}/assign")
async def assign_incident(
    incident_id: int,
    assignment_data: IncidentAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["ADMIN", "MANAGER"]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin or Manager can assign incidents",
        )

    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    if incident.status in ["RESOLVED", "CLOSED"]:
        raise HTTPException(
            status_code=400,
            detail="Resolved or closed incidents cannot be assigned",
        )

    agent = db.query(User).filter(
        User.id == assignment_data.assigned_to
    ).first()

    if not agent or not agent.is_active:
        raise HTTPException(
            status_code=404,
            detail="Active user not found",
        )

    if agent.role != "SUPPORT_AGENT":
        raise HTTPException(
            status_code=400,
            detail="Incident must be assigned to a Support Agent",
        )

    if incident.team_id is not None:
        team = db.query(Team).filter(
            Team.id == incident.team_id
        ).first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Incident team not found",
            )

    previous_assignment = get_latest_assignment(db, incident.id)
    old_status = incident.status

    is_reassignment = (
        previous_assignment is not None
        and previous_assignment.assigned_to != agent.id
    )

    if (
        previous_assignment is not None
        and previous_assignment.assigned_to == agent.id
    ):
        raise HTTPException(
            status_code=400,
            detail="Incident is already assigned to this agent",
        )

    try:
        db.add(
            IncidentAssignment(
                incident_id=incident.id,
                assigned_to=agent.id,
                assigned_by=current_user.id,
                reason=assignment_data.reason,
            )
        )

        incident.status = "ASSIGNED"

        if old_status != incident.status:
            db.add(
                IncidentStatusHistory(
                    incident_id=incident.id,
                    changed_by=current_user.id,
                    old_status=old_status,
                    new_status="ASSIGNED",
                    comment=assignment_data.reason or "Incident assigned",
                )
            )

        db.commit()
        db.refresh(incident)

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to assign incident")
        raise HTTPException(
            status_code=500,
            detail="Unable to assign incident",
        )

    if is_reassignment:
        await safe_send_email(
            send_incident_reassigned_email,
            agent.email,
            incident.id,
            incident.title,
        )
    else:
        await safe_send_email(
            send_incident_assigned_email,
            agent.email,
            incident.id,
            incident.title,
        )

    recipient_ids = [
        agent.id,
        current_user.id,
        incident.reporter_id,
    ]

    if previous_assignment:
        recipient_ids.append(previous_assignment.assigned_to)

    await safe_assignment_notification(
        incident.id,
        agent.id,
        recipient_ids,
    )

    if old_status != "ASSIGNED":
        await safe_status_notification(
            incident.id,
            "ASSIGNED",
            recipient_ids,
        )

    return {
        "message": (
            "Incident reassigned successfully"
            if is_reassignment
            else "Incident assigned successfully"
        ),
        "incident_id": incident.id,
        "assigned_to": agent.id,
        "status": incident.status,
    }


@router.patch("/{incident_id}/status")
async def update_incident_status(
    incident_id: int,
    status_data: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_status = status_data.status.upper()

    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid incident status",
        )

    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    check_incident_access(db, incident, current_user)
    latest_assignment = get_latest_assignment(db, incident.id)

    if current_user.role == "REPORTER":
        if not (
            incident.status == "RESOLVED"
            and new_status == "IN_PROGRESS"
        ):
            raise HTTPException(
                status_code=403,
                detail="Reporters can only reopen their resolved incidents",
            )

    elif current_user.role == "SUPPORT_AGENT":
        if (
            not latest_assignment
            or latest_assignment.assigned_to != current_user.id
        ):
            raise HTTPException(
                status_code=403,
                detail="Only the assigned agent can update this incident",
            )

    elif current_user.role not in ["ADMIN", "MANAGER"]:
        raise HTTPException(
            status_code=403,
            detail="You cannot update this incident",
        )

    old_status = incident.status

    if old_status == new_status:
        raise HTTPException(
            status_code=400,
            detail="Incident already has this status",
        )

    if new_status not in STATUS_TRANSITIONS.get(old_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change incident status from {old_status} to {new_status}",
        )

    if new_status == "RESOLVED" and not status_data.resolution_details:
        raise HTTPException(
            status_code=400,
            detail="Resolution details are required",
        )

    try:
        incident.status = new_status

        if new_status == "RESOLVED":
            incident.resolution_details = status_data.resolution_details

        db.add(
            IncidentStatusHistory(
                incident_id=incident.id,
                changed_by=current_user.id,
                old_status=old_status,
                new_status=new_status,
                comment=status_data.comment,
            )
        )

        db.commit()
        db.refresh(incident)

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to update incident status")
        raise HTTPException(
            status_code=500,
            detail="Unable to update incident status",
        )

    recipient_ids = [incident.reporter_id, current_user.id]

    if latest_assignment:
        recipient_ids.append(latest_assignment.assigned_to)

    if new_status == "RESOLVED":
        await safe_send_email(
            send_incident_resolved_email,
            incident.reporter.email,
            incident.id,
            incident.title,
        )

    elif old_status == "RESOLVED" and new_status == "IN_PROGRESS":
        await safe_send_email(
            send_incident_reopened_email,
            incident.reporter.email,
            incident.id,
            incident.title,
        )

        if latest_assignment:
            await safe_send_email(
                send_incident_reopened_email,
                latest_assignment.assignee.email,
                incident.id,
                incident.title,
            )

    await safe_status_notification(
        incident.id,
        new_status,
        recipient_ids,
    )

    return {
        "message": "Incident status updated successfully",
        "incident_id": incident.id,
        "old_status": old_status,
        "new_status": new_status,
        "resolution_details": incident.resolution_details,
    }


@router.get("/{incident_id}/timeline")
def get_incident_timeline(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    check_incident_access(db, incident, current_user)

    status_history = (
        db.query(IncidentStatusHistory)
        .filter(IncidentStatusHistory.incident_id == incident_id)
        .all()
    )

    assignments = (
        db.query(IncidentAssignment)
        .filter(IncidentAssignment.incident_id == incident_id)
        .all()
    )

    timeline = []

    for item in status_history:
        timeline.append({
            "type": "STATUS_CHANGE",
            "old_status": item.old_status,
            "new_status": item.new_status,
            "changed_by": item.changed_by,
            "comment": item.comment,
            "created_at": item.changed_at,
        })

    for item in assignments:
        timeline.append({
            "type": "ASSIGNMENT",
            "assigned_to": item.assigned_to,
            "assigned_by": item.assigned_by,
            "reason": item.reason,
            "created_at": item.assigned_at,
        })

    timeline.sort(
        key=lambda item: item["created_at"] or datetime.min
    )

    return {
        "incident_id": incident.id,
        "timeline": timeline,
    }

