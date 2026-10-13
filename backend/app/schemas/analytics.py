from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    total_open_incidents: int
    total_resolved_incidents: int
    total_critical_incidents: int
    total_breached_slas: int
    sla_compliance_percentage: float
    average_first_response_minutes: float
    average_resolution_minutes: float


class AgentPerformance(BaseModel):
    agent_id: int
    agent_name: str
    assigned_incidents: int
    resolved_incidents: int
    average_resolution_minutes: float