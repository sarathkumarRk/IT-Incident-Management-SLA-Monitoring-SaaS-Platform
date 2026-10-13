import logging
from datetime import timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.incident import Incident
from app.models.sla_tracking import SLATracking
from app.models.escalation_log import EscalationLog
from app.models.notification import Notification
from app.models.user import User
from app.models.incident_assignment import IncidentAssignment
from app.services.email_service import send_sla_breach_email
from app.services.sla_service import (
    get_utc_now,
    get_effective_deadlines,
)

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

APPROACHING_DEADLINE_MINUTES = 15


def get_designated_manager(db: Session):
    return (
        db.query(User)
        .filter(
            User.role == "MANAGER",
            User.is_active.is_(True),
        )
        .order_by(User.id.asc())
        .first()
    )


def get_latest_assignee_id(db: Session, incident_id: int):
    return (
        db.query(IncidentAssignment.assigned_to)
        .filter(IncidentAssignment.incident_id == incident_id)
        .order_by(IncidentAssignment.id.desc())
        .scalar()
    )


def create_notification_once(
    db: Session,
    user_id: int,
    incident_id: int,
    title: str,
    message: str,
) -> bool:
    existing = (
        db.query(Notification.id)
        .filter(
            Notification.user_id == user_id,
            Notification.incident_id == incident_id,
            Notification.title == title,
        )
        .first()
    )

    if existing:
        return False

    db.add(
        Notification(
            user_id=user_id,
            incident_id=incident_id,
            title=title,
            message=message,
            is_read=False,
        )
    )

    return True


def create_escalation_once(
    db: Session,
    incident: Incident,
    manager: User | None,
    reason: str,
) -> bool:
    existing = (
        db.query(EscalationLog.id)
        .filter(
            EscalationLog.incident_id == incident.id,
            EscalationLog.reason == reason,
        )
        .first()
    )

    if existing:
        return False

    db.add(
        EscalationLog(
            incident_id=incident.id,
            manager_id=manager.id if manager else None,
            reason=reason,
            status="PENDING",
        )
    )

    return True


def check_sla_breaches(db: Session) -> dict:
    now = get_utc_now()

    records = (
        db.query(SLATracking, Incident)
        .join(Incident, Incident.id == SLATracking.incident_id)
        .filter(Incident.status.notin_(["RESOLVED", "CLOSED"]))
        .all()
    )

    manager = get_designated_manager(db)

    response_breaches = 0
    resolution_breaches = 0
    approaching_alerts = 0
    escalations_created = 0
    emails_sent = 0

    try:
        for tracking, incident in records:
            deadlines = get_effective_deadlines(
                db=db,
                incident=incident,
                tracking=tracking,
                now=now,
            )

            response_deadline = deadlines["first_response_deadline"]
            resolution_deadline = deadlines["resolution_deadline"]

            response_reason = (
                f"First-response SLA breached for incident #{incident.id}"
            )

            resolution_reason = (
                f"Resolution SLA breached for incident #{incident.id}"
            )

            new_breach_reasons = []

            if (
                tracking.first_responded_at is None
                and not tracking.response_breached
                and response_deadline <= now
            ):
                tracking.response_breached = True
                response_breaches += 1
                new_breach_reasons.append(response_reason)

            if (
                tracking.resolved_at is None
                and not tracking.resolution_breached
                and resolution_deadline <= now
            ):
                tracking.resolution_breached = True
                resolution_breaches += 1
                new_breach_reasons.append(resolution_reason)

            # Notify the manager when a deadline is approaching.
            if manager:
                approaching_deadlines = []

                if (
                    tracking.first_responded_at is None
                    and now < response_deadline
                    and response_deadline - now
                    <= timedelta(minutes=APPROACHING_DEADLINE_MINUTES)
                    and not tracking.response_breached
                ):
                    approaching_deadlines.append(
                        ("First Response", response_deadline)
                    )

                if (
                    tracking.resolved_at is None
                    and now < resolution_deadline
                    and resolution_deadline - now
                    <= timedelta(minutes=APPROACHING_DEADLINE_MINUTES)
                    and not tracking.resolution_breached
                ):
                    approaching_deadlines.append(
                        ("Resolution", resolution_deadline)
                    )

                for deadline_type, deadline in approaching_deadlines:
                    title = (
                        f"SLA Deadline Approaching - "
                        f"{deadline_type} - Incident #{incident.id}"
                    )

                    message = (
                        f"Incident #{incident.id} ({incident.title}) is "
                        f"approaching its {deadline_type.lower()} SLA deadline. "
                        f"Deadline: {deadline.isoformat()}."
                    )

                    if create_notification_once(
                        db=db,
                        user_id=manager.id,
                        incident_id=incident.id,
                        title=title,
                        message=message,
                    ):
                        approaching_alerts += 1

            # Create escalation records and notify the manager for new breaches.
            for reason in new_breach_reasons:
                created = create_escalation_once(
                    db=db,
                    incident=incident,
                    manager=manager,
                    reason=reason,
                )

                if not created:
                    continue

                escalations_created += 1

                if manager:
                    create_notification_once(
                        db=db,
                        user_id=manager.id,
                        incident_id=incident.id,
                        title=f"SLA Breach - Incident #{incident.id}",
                        message=(
                            f"{incident.title}: {reason}. "
                            "Please review and take action."
                        ),
                    )

                    if manager.email:
                        try:
                            if send_sla_breach_email(
                                to_email=manager.email,
                                incident_id=incident.id,
                                incident_title=incident.title,
                                breach_type=reason,
                            ):
                                emails_sent += 1
                            else:
                                logger.warning(
                                    "SLA email failed for incident %s",
                                    incident.id,
                                )
                        except Exception:
                            logger.exception(
                                "SLA email failed for incident %s",
                                incident.id,
                            )
                else:
                    logger.warning(
                        "No active manager available for incident %s",
                        incident.id,
                    )

            # Notify the latest assigned agent about a new breach.
            if new_breach_reasons:
                assignee_id = get_latest_assignee_id(
                    db,
                    incident.id,
                )

                if assignee_id:
                    create_notification_once(
                        db=db,
                        user_id=assignee_id,
                        incident_id=incident.id,
                        title=f"SLA Breach - Incident #{incident.id}",
                        message=(
                            f"{incident.title}: "
                            f"{'; '.join(new_breach_reasons)}."
                        ),
                    )

        db.commit()

    except Exception:
        db.rollback()
        logger.exception("Failed to process SLA monitoring records")
        raise

    result = {
        "checked_records": len(records),
        "response_breaches": response_breaches,
        "resolution_breaches": resolution_breaches,
        "approaching_alerts": approaching_alerts,
        "escalations_created": escalations_created,
        "emails_sent": emails_sent,
    }

    logger.info("SLA check completed: %s", result)

    return result


def run_sla_check():
    db = SessionLocal()

    try:
        check_sla_breaches(db)
    except Exception:
        db.rollback()
        logger.exception("SLA background check failed")
    finally:
        db.close()


def start_sla_scheduler():
    if scheduler.running:
        return

    scheduler.add_job(
        run_sla_check,
        trigger="interval",
        minutes=1,
        id="sla_breach_check",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()
    logger.info("SLA scheduler started")


def stop_sla_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("SLA scheduler stopped")
