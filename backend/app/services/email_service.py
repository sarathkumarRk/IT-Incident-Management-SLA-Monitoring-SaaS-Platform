import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send an email using SMTP.
    Returns True if successful, otherwise False.
    """

    if not to_email:
        logger.warning("Email not sent: recipient email is missing.")
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_EMAIL
    message["To"] = to_email
    message.set_content(body)

    try:
        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=10,
        ) as server:
            server.starttls()
            server.login(
                settings.SMTP_EMAIL,
                settings.SMTP_PASSWORD,
            )
            server.send_message(message)

        logger.info("Email sent successfully to %s", to_email)
        return True

    except (smtplib.SMTPException, OSError) as exc:
        logger.error("Failed to send email: %s", exc)
        return False


def send_incident_assigned_email(
    to_email: str,
    incident_id: int,
    incident_title: str,
) -> bool:
    return send_email(
        to_email,
        f"Incident #{incident_id} Assigned",
        (
            f"Incident #{incident_id} has been assigned to you.\n\n"
            f"Title: {incident_title}\n"
            "Please review and investigate the incident."
        ),
    )


def send_incident_reassigned_email(
    to_email: str,
    incident_id: int,
    incident_title: str,
) -> bool:
    return send_email(
        to_email,
        f"Incident #{incident_id} Reassigned",
        (
            f"Incident #{incident_id} has been reassigned to you.\n\n"
            f"Title: {incident_title}\n"
            "Please review the incident."
        ),
    )


def send_incident_escalated_email(
    to_email: str,
    incident_id: int,
    incident_title: str,
    reason: str = "The incident requires attention.",
) -> bool:
    return send_email(
        to_email,
        f"Incident #{incident_id} Escalated",
        (
            f"Incident #{incident_id} has been escalated.\n\n"
            f"Title: {incident_title}\n"
            f"Reason: {reason}\n"
            "Please review and take the necessary action."
        ),
    )


def send_incident_resolved_email(
    to_email: str,
    incident_id: int,
    incident_title: str,
) -> bool:
    return send_email(
        to_email,
        f"Incident #{incident_id} Resolved",
        (
            f"Incident #{incident_id} has been resolved.\n\n"
            f"Title: {incident_title}\n"
            "Please review and confirm the resolution."
        ),
    )


def send_incident_reopened_email(
    to_email: str,
    incident_id: int,
    incident_title: str,
) -> bool:
    return send_email(
        to_email,
        f"Incident #{incident_id} Reopened",
        (
            f"Incident #{incident_id} has been reopened.\n\n"
            f"Title: {incident_title}\n"
            "Please investigate the issue again."
        ),
    )


def send_sla_breach_email(
    to_email: str,
    incident_id: int,
    incident_title: str,
    breach_type: str = "SLA deadline exceeded",
) -> bool:
    return send_email(
        to_email,
        f"SLA Breach - Incident #{incident_id}",
        (
            f"Incident #{incident_id} has breached its SLA.\n\n"
            f"Title: {incident_title}\n"
            f"Details: {breach_type}\n"
            "Please review the incident and take action."
        ),
    )
