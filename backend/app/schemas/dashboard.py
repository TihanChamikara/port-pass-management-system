from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared sub-models
# ---------------------------------------------------------------------------

class ZoneStat(BaseModel):
    zone: str
    total: int
    active: int
    completed: int


class RequestStat(BaseModel):
    label: str
    value: int
    color: str = "#64748b"


class RecentActivity(BaseModel):
    id: int
    request_id: str
    visitor_name: str
    status: str
    created_at: str
    department_name: Optional[str] = None
    visitor_purpose: Optional[str] = None
    rejection_reason: Optional[str] = None
    operations_comments: Optional[str] = None
    rejected_by: Optional[str] = None


# ---------------------------------------------------------------------------
# Admin Dashboard Response (full system view)
# ---------------------------------------------------------------------------

class AdminDashboardResponse(BaseModel):
    role: str = "admin"
    # Pass KPIs
    today_total: int
    active_total: int
    completed_total: int
    # Request KPIs
    total_requests: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    issued_requests: int
    checked_in_count: int
    checked_out_count: int
    # Zone analytics
    zone_stats: List[ZoneStat]
    zone_capacities: Dict[str, int] = Field(default_factory=dict)
    zone_access_distribution: Dict[str, int] = Field(default_factory=dict)
    pass_type_distribution: Dict[str, int] = Field(default_factory=dict)
    # Recent activity
    recent_requests: List[RecentActivity] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Pass Officer Dashboard Response
# ---------------------------------------------------------------------------

class PassOfficerDashboardResponse(BaseModel):
    role: str = "pass_officer"
    # Core KPIs
    approved_awaiting_pass: int       # approved, not yet issued
    passes_issued_today: int
    active_passes: int
    expired_passes: int
    pending_renewals: int
    total_passes_all_time: int
    visitors_on_site: int = 0         # checked_in visitors
    # Charts (new system)
    visitor_category_distribution: Dict[str, int] = Field(default_factory=dict)
    visit_area_distribution: Dict[str, int] = Field(default_factory=dict)
    # Charts (legacy pass colour / zone system)
    pass_type_distribution: Dict[str, int] = Field(default_factory=dict)
    zone_access_distribution: Dict[str, int] = Field(default_factory=dict)
    # Recent
    recent_issued: List[RecentActivity] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Operations Officer Dashboard Response
# ---------------------------------------------------------------------------

class OpsOfficerDashboardResponse(BaseModel):
    role: str = "operations_officer"
    # Core KPIs
    pending_ops_review: int           # pending_approval state
    under_review: int                 # under_review state
    approved_today: int
    rejected_today: int
    total_reviewed_all_time: int
    dept_pending: int                 # pending_department_approval
    # Request breakdown by status
    request_stats: List[RequestStat] = Field(default_factory=list)
    # Recent activity
    recent_requests: List[RecentActivity] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Gate Officer Dashboard Response
# ---------------------------------------------------------------------------

class VipArrival(BaseModel):
    id: int
    request_id: str
    visitor_name: str
    visitor_organization: Optional[str] = None
    vehicle_number: Optional[str] = None
    vip_lmv_access: Optional[str] = None
    status: str
    requested_date: str

class GateOfficerDashboardResponse(BaseModel):
    role: str = "security_gate_officer"
    # Core KPIs
    expected_today: int               # approved/issued for today
    currently_inside: int             # checked_in count
    checked_in_today: int
    checked_out_today: int
    active_passes: int
    denied_entries: int               # rejected by gate
    # Recent activity
    recent_checkins: List[RecentActivity] = Field(default_factory=list)
    recent_checkouts: List[RecentActivity] = Field(default_factory=list)
    vip_arrivals: List[VipArrival] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Department Manager Dashboard Response
# ---------------------------------------------------------------------------

class DeptManagerDashboardResponse(BaseModel):
    role: str = "department_manager"
    department_name: Optional[str] = None
    department_id: Optional[int] = None
    # Core KPIs
    pending_dept_approval: int        # pending_department_approval for this dept
    approved_by_dept: int             # dept-approved requests
    rejected_by_dept: int
    today_requests: int
    total_requests_all_time: int
    # Recent activity
    recent_requests: List[RecentActivity] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Union response (discriminated by role field)
# ---------------------------------------------------------------------------

class DashboardResponse(BaseModel):
    """Legacy response for backward compat (admin-level)."""
    today_total: int
    active_total: int
    completed_total: int
    zone_stats: List[ZoneStat]
    pass_type_distribution: Dict[str, int]
    zone_access_distribution: Dict[str, int]
    zone_capacities: Dict[str, int] = Field(default_factory=dict)
