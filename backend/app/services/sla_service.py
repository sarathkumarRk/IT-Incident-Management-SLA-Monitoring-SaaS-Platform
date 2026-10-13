from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.sla_policy import SLAPolicy
from app.models.sla_tracking import SLATracking
from app.models.incident_status_history import IncidentStatusHistory


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_pending_duration(
    db: Session,
    incident,
    now: datetime | None = None,
) -> timedelta:
    now = now or get_utc_now()

    histories = (
        db.query(IncidentStatusHistory)
        .filter(IncidentStatusHistory.incident_id == incident.id)
        .order_by(
            IncidentStatusHistory.changed_at.asc(),
            IncidentStatusHistory.id.asc(),
        )
        .all()
    )

    pending_start = None
    total_pending = timedelta()

    for history in histories:
        changed_at = history.changed_at

        if changed_at is None:
            continue

        if history.new_status == "PENDING" and pending_start is None:
            pending_start = changed_at

        if history.old_status == "PENDING" and pending_start is not None:
            if changed_at >= pending_start:
                total_pending += changed_at - pending_start

            pending_start = None

    if incident.status == "PENDING" and pending_start is not None:
        if now >= pending_start:
            total_pending += now - pending_start

    return total_pending


def get_effective_deadlines(
    db: Session,
    incident,
    tracking: SLATracking,
    now: datetime | None = None,
) -> dict:
    now = now or get_utc_now()

    response_deadline = tracking.first_response_deadline
    resolution_deadline = tracking.resolution_deadline

    policy = tracking.policy

    if policy and policy.exclude_pending_time:
        pending_duration = get_pending_duration(
            db=db,
            incident=incident,
            now=now,
        )

        response_deadline += pending_duration
        resolution_deadline += pending_duration

    return {
        "first_response_deadline": response_deadline,
        "resolution_deadline": resolution_deadline,
    }


def get_sla_remaining_time(
    db: Session,
    incident,
    tracking: SLATracking,
    now: datetime | None = None,
) -> dict:
    now = now or get_utc_now()

    deadlines = get_effective_deadlines(
        db=db,
        incident=incident,
        tracking=tracking,
        now=now,
    )

    response_remaining = (
        deadlines["first_response_deadline"] - now
    ).total_seconds()

    resolution_remaining = (
        deadlines["resolution_deadline"] - now
    ).total_seconds()

    return {
        "first_response_remaining_seconds": (
            max(0, int(response_remaining))
            if tracking.first_responded_at is None
            else 0
        ),
        "resolution_remaining_seconds": (
            max(0, int(resolution_remaining))
            if tracking.resolved_at is None
            else 0
        ),
        "first_response_deadline": deadlines["first_response_deadline"],
        "resolution_deadline": deadlines["resolution_deadline"],
        "response_breached": tracking.response_breached
        or (
            tracking.first_responded_at is None
            and response_remaining <= 0
        ),
        "resolution_breached": tracking.resolution_breached
        or (
            tracking.resolved_at is None
            and resolution_remaining <= 0
        ),
    }


def create_sla_tracking(
    db: Session,
    incident,
) -> SLATracking | None:
    """
    Create SLA tracking for an incident using its priority.

    The incident must be flushed before calling this function.
    The caller is responsible for committing the transaction.
    """

    existing_tracking = (
        db.query(SLATracking)
        .filter(SLATracking.incident_id == incident.id)
        .first()
    )

    if existing_tracking:
        return existing_tracking

    policy = (
        db.query(SLAPolicy)
        .filter(
            SLAPolicy.priority == incident.priority.upper(),
            SLAPolicy.is_active.is_(True),
        )
        .first()
    )

    if policy is None:
        return None

    now = get_utc_now()

    tracking = SLATracking(
        incident_id=incident.id,
        policy_id=policy.id,
        first_response_deadline=now
        + timedelta(minutes=policy.first_response_minutes),
        resolution_deadline=now
        + timedelta(minutes=policy.resolution_minutes),
        first_responded_at=None,
        resolved_at=None,
        response_breached=False,
        resolution_breached=False,
    )

    db.add(tracking)
    db.flush()

    return tracking

