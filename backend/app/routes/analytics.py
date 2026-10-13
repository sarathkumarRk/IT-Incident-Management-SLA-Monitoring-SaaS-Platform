import logging
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.incident import Incident
from app.models.incident_assignment import IncidentAssignment
from app.models.sla_tracking import SLATracking
from app.schemas.analytics import AnalyticsOverview, AgentPerformance

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Reports and Analytics"],
)


def check_analytics_access(user: User):
    if user.role not in ["ADMIN", "MANAGER"]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin and Manager can view analytics",
        )


# 1. Analytics overview
@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_analytics_access(current_user)

    total_open = (
        db.query(func.count(Incident.id))
        .filter(
            Incident.status.in_(
                ["OPEN", "ASSIGNED", "IN_PROGRESS", "PENDING"]
            )
        )
        .scalar()
        or 0
    )

    total_resolved = (
        db.query(func.count(Incident.id))
        .filter(Incident.status == "RESOLVED")
        .scalar()
        or 0
    )

    total_critical = (
        db.query(func.count(Incident.id))
        .filter(Incident.priority == "CRITICAL")
        .scalar()
        or 0
    )

    total_breached = (
        db.query(func.count(SLATracking.id))
        .filter(
            (SLATracking.response_breached.is_(True))
            | (SLATracking.resolution_breached.is_(True))
        )
        .scalar()
        or 0
    )

    total_sla_records = (
        db.query(func.count(SLATracking.id))
        .scalar()
        or 0
    )

    compliant_sla_records = (
        db.query(func.count(SLATracking.id))
        .filter(
            SLATracking.response_breached.is_(False),
            SLATracking.resolution_breached.is_(False),
        )
        .scalar()
        or 0
    )

    compliance_percentage = (
        round(compliant_sla_records / total_sla_records * 100, 2)
        if total_sla_records
        else 0.0
    )

    # Average first-response time in seconds
    average_response_seconds = (
        db.query(
            func.avg(
                func.timestampdiff(
                    text("SECOND"),
                    SLATracking.created_at,
                    SLATracking.first_responded_at,
                )
            )
        )
        .filter(SLATracking.first_responded_at.isnot(None))
        .scalar()
    )

    # Average resolution time in seconds
    average_resolution_seconds = (
        db.query(
            func.avg(
                func.timestampdiff(
                    text("SECOND"),
                    Incident.created_at,
                    SLATracking.resolved_at,
                )
            )
        )
        .join(
            SLATracking,
            SLATracking.incident_id == Incident.id,
        )
        .filter(SLATracking.resolved_at.isnot(None))
        .scalar()
    )

    return AnalyticsOverview(
        total_open_incidents=total_open,
        total_resolved_incidents=total_resolved,
        total_critical_incidents=total_critical,
        total_breached_slas=total_breached,
        sla_compliance_percentage=compliance_percentage,
        average_first_response_minutes=round(
            float(average_response_seconds or 0) / 60, 2
        ),
        average_resolution_minutes=round(
            float(average_resolution_seconds or 0) / 60, 2
        ),
    )


# 2. Agent performance report
@router.get(
    "/agent-performance",
    response_model=list[AgentPerformance],
)
def get_agent_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_analytics_access(current_user)

    # Get the latest assignment for each incident
    latest_assignment_ids = (
        db.query(
            IncidentAssignment.incident_id,
            func.max(IncidentAssignment.id).label("latest_id"),
        )
        .group_by(IncidentAssignment.incident_id)
        .subquery()
    )

    latest_assignments = (
        db.query(IncidentAssignment)
        .join(
            latest_assignment_ids,
            IncidentAssignment.id == latest_assignment_ids.c.latest_id,
        )
        .subquery()
    )

    assigned_to = latest_assignments.c.assigned_to
    incident_id = latest_assignments.c.incident_id

    assigned_count = func.count(incident_id)

    resolved_count = func.sum(
        case(
            (Incident.status == "RESOLVED", 1),
            else_=0,
        )
    )

    average_resolution_seconds = func.avg(
        func.timestampdiff(
            text("SECOND"),
            Incident.created_at,
            SLATracking.resolved_at,
        )
    )

    results = (
        db.query(
            User.id.label("agent_id"),
            User.name.label("agent_name"),
            assigned_count.label("assigned_incidents"),
            resolved_count.label("resolved_incidents"),
            average_resolution_seconds.label("average_resolution_seconds"),
        )
        .join(latest_assignments, assigned_to == User.id)
        .join(Incident, Incident.id == incident_id)
        .outerjoin(
            SLATracking,
            SLATracking.incident_id == Incident.id,
        )
        .filter(User.role == "SUPPORT_AGENT")
        .group_by(User.id, User.name)
        .all()
    )

    return [
        AgentPerformance(
            agent_id=row.agent_id,
            agent_name=row.agent_name,
            assigned_incidents=row.assigned_incidents or 0,
            resolved_incidents=int(row.resolved_incidents or 0),
            average_resolution_minutes=round(
                float(row.average_resolution_seconds or 0) / 60, 2
            ),
        )
        for row in results
    ]


# 3. Incidents grouped by priority
@router.get("/by-priority")
def get_incidents_by_priority(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_analytics_access(current_user)

    results = (
        db.query(
            Incident.priority.label("priority"),
            func.count(Incident.id).label("total"),
        )
        .group_by(Incident.priority)
        .order_by(Incident.priority)
        .all()
    )

    return [
        {
            "priority": row.priority,
            "total": row.total,
        }
        for row in results
    ]


# 4. Incidents grouped by category
@router.get("/by-category")
def get_incidents_by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_analytics_access(current_user)

    results = (
        db.query(
            Incident.category.label("category"),
            func.count(Incident.id).label("total"),
        )
        .group_by(Incident.category)
        .order_by(Incident.category)
        .all()
    )

    return [
        {
            "category": row.category,
            "total": row.total,
        }
        for row in results
    ]


# 5. Daily or weekly incident trends
@router.get("/trends")
def get_incident_trends(
    period: str = Query(
        default="daily",
        pattern="^(daily|weekly)$",
    ),
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_analytics_access(current_user)

    today = date.today()
    start_date = today - timedelta(days=days - 1)

    if period == "weekly":
        start_date -= timedelta(days=start_date.weekday())

        end_date = today

        group_expression = func.date_format(
            Incident.created_at,
            "%x-%v",
        )
    else:
        end_date = today
        group_expression = func.date(Incident.created_at)

    start_datetime = datetime.combine(start_date, time.min)
    end_datetime = datetime.combine(
        end_date + timedelta(days=1),
        time.min,
    )

    results = (
        db.query(
            group_expression.label("period"),
            func.count(Incident.id).label("total_incidents"),
            func.sum(
                case(
                    (Incident.status == "RESOLVED", 1),
                    else_=0,
                )
            ).label("resolved_incidents"),
            func.sum(
                case(
                    (
                        Incident.status.in_(
                            ["OPEN", "ASSIGNED", "IN_PROGRESS", "PENDING"]
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("open_incidents"),
        )
        .filter(
            Incident.created_at >= start_datetime,
            Incident.created_at < end_datetime,
        )
        .group_by(group_expression)
        .order_by(group_expression)
        .all()
    )

    return {
        "period": period,
        "days": days,
        "data": [
            {
                "period": str(row.period),
                "total_incidents": row.total_incidents or 0,
                "resolved_incidents": int(row.resolved_incidents or 0),
                "open_incidents": int(row.open_incidents or 0),
            }
            for row in results
        ],
    }


