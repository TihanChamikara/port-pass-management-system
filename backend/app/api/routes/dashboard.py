"""
Role-Based Dashboard API

Returns a dashboard payload scoped to the logged-in user's role:
  - admin                  → full system KPIs + charts
  - pass_officer           → pass generation KPIs
  - operations_officer     → request approval KPIs
  - security_gate_officer  → gate activity KPIs
  - department_manager     → department-scoped KPIs
"""

from datetime import date, datetime, time, timezone, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import PassRecord, PassStatus, User, Zone, PassType, ZoneCapacity
from app.models.visitor_request import VisitorRequest, RequestStatus
from app.models.user import UserRole
from app.schemas.dashboard import (
    DashboardResponse,
    ZoneStat,
    AdminDashboardResponse,
    PassOfficerDashboardResponse,
    OpsOfficerDashboardResponse,
    GateOfficerDashboardResponse,
    DeptManagerDashboardResponse,
    RecentActivity,
    RequestStat,
    VipArrival,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _today_utc():
    now = datetime.now(timezone.utc)
    start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    end = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)
    return start, end


def _to_activity(vr: VisitorRequest, db: Session = None) -> RecentActivity:
    rejected_by_name = None
    if db and vr.rejection_reason and vr.operations_officer_id:
        ops = db.query(User).filter(User.id == vr.operations_officer_id).first()
        if ops:
            rejected_by_name = ops.full_name or ops.username

    return RecentActivity(
        id=vr.id,
        request_id=vr.request_id or str(vr.id),
        visitor_name=vr.visitor_name,
        status=vr.status.value if vr.status else "unknown",
        created_at=vr.created_at.isoformat() if vr.created_at else "",
        department_name=vr.department_name,
        visitor_purpose=vr.visitor_purpose,
        rejection_reason=vr.rejection_reason,
        operations_comments=vr.operations_comments,
        rejected_by=rejected_by_name,
    )


# ---------------------------------------------------------------------------
# /summary  — dispatches to role-specific handler
# ---------------------------------------------------------------------------

@router.get("/summary")
def summary(
    date_from: str | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: str | None = Query(default=None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    role = current_user.role

    if role == UserRole.admin:
        return _admin_dashboard(db, date_from, date_to)
    elif role == UserRole.pass_officer:
        return _pass_officer_dashboard(db, date_from, date_to)
    elif role == UserRole.operations_officer:
        return _ops_officer_dashboard(db, date_from, date_to)
    elif role == UserRole.security_gate_officer:
        return _gate_officer_dashboard(db, date_from, date_to)
    elif role == UserRole.department_manager:
        return _dept_manager_dashboard(db, current_user, date_from, date_to)
    else:
        # Fallback: empty shell
        return {"role": role.value if hasattr(role, 'value') else str(role), "message": "No dashboard data for this role."}


# ---------------------------------------------------------------------------
# Admin dashboard
# ---------------------------------------------------------------------------

def _admin_dashboard(db: Session, date_from: str | None, date_to: str | None) -> AdminDashboardResponse:
    now = datetime.now(timezone.utc)

    start_date = date.fromisoformat(date_from) if date_from else now.date()
    end_date = date.fromisoformat(date_to) if date_to else start_date
    if end_date < start_date:
        start_date, end_date = end_date, start_date

    start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    end = datetime.combine(end_date, time.max, tzinfo=timezone.utc)

    # Pass statistics
    filtered_passes = db.query(PassRecord).filter(
        and_(PassRecord.issued_time >= start, PassRecord.issued_time <= end)
    )
    today_total = filtered_passes.count()
    active_total = db.query(PassRecord).filter(PassRecord.status == PassStatus.active).count()
    completed_total = filtered_passes.filter(PassRecord.status == PassStatus.completed).count()

    # Request statistics (all time)
    all_requests = db.query(VisitorRequest)
    total_requests = all_requests.count()
    pending_requests = all_requests.filter(
        VisitorRequest.status.in_([RequestStatus.pending_approval, RequestStatus.pending_department_approval, RequestStatus.under_review])
    ).count()
    approved_requests = all_requests.filter(
        VisitorRequest.status == RequestStatus.approved
    ).count()
    rejected_requests = all_requests.filter(VisitorRequest.status == RequestStatus.rejected).count()
    issued_requests = all_requests.filter(VisitorRequest.status == RequestStatus.issued).count()
    checked_in_count = all_requests.filter(VisitorRequest.status == RequestStatus.checked_in).count()
    checked_out_count = all_requests.filter(VisitorRequest.status == RequestStatus.checked_out).count()

    # Zone stats
    zone_stats = []
    zone_capacities_dict = {}
    zone_access_dist = {}
    for zone in Zone:
        zq = filtered_passes.filter(PassRecord.zone == zone)
        total = zq.count()
        active = zq.filter(PassRecord.status == PassStatus.active).count()
        completed = zq.filter(PassRecord.status == PassStatus.completed).count()
        zone_stats.append(ZoneStat(zone=zone.value, total=total, active=active, completed=completed))
        cap_rec = db.query(ZoneCapacity).filter(ZoneCapacity.zone == zone).first()
        zone_capacities_dict[zone.value] = cap_rec.capacity if cap_rec else 0
        zone_access_dist[zone.value] = total

    pass_type_dist = {
        pt.value: filtered_passes.filter(PassRecord.pass_type == pt).count()
        for pt in PassType
    }

    recent_requests = (
        db.query(VisitorRequest)
        .order_by(VisitorRequest.created_at.desc())
        .limit(10)
        .all()
    )

    return AdminDashboardResponse(
        role="admin",
        today_total=today_total,
        active_total=active_total,
        completed_total=completed_total,
        total_requests=total_requests,
        pending_requests=pending_requests,
        approved_requests=approved_requests,
        rejected_requests=rejected_requests,
        issued_requests=issued_requests,
        checked_in_count=checked_in_count,
        checked_out_count=checked_out_count,
        zone_stats=zone_stats,
        zone_capacities=zone_capacities_dict,
        zone_access_distribution=zone_access_dist,
        pass_type_distribution=pass_type_dist,
        recent_requests=[_to_activity(r, db) for r in recent_requests],
    )


# ---------------------------------------------------------------------------
# Pass Officer dashboard
# ---------------------------------------------------------------------------

def _parse_dates(date_from: str | None, date_to: str | None):
    now = datetime.now(timezone.utc)
    start_date = date.fromisoformat(date_from) if date_from else now.date()
    end_date = date.fromisoformat(date_to) if date_to else start_date
    if end_date < start_date:
        start_date, end_date = end_date, start_date
    return datetime.combine(start_date, time.min, tzinfo=timezone.utc), datetime.combine(end_date, time.max, tzinfo=timezone.utc)

def _pass_officer_dashboard(db: Session, date_from: str | None, date_to: str | None) -> PassOfficerDashboardResponse:
    today_start, today_end = _parse_dates(date_from, date_to)

    approved_awaiting = db.query(VisitorRequest).filter(
        VisitorRequest.status == RequestStatus.approved
    ).count()

    passes_today = db.query(PassRecord).filter(
        and_(PassRecord.issued_time >= today_start, PassRecord.issued_time <= today_end)
    ).count()

    active_passes = db.query(PassRecord).filter(PassRecord.status == PassStatus.active).count()

    expired_passes = db.query(PassRecord).filter(PassRecord.status == PassStatus.overdue).count()

    pending_renewals = 0  # Extend later if renewal workflow exists

    total_passes = db.query(PassRecord).count()

    pass_type_dist = {
        pt.value: db.query(PassRecord).filter(PassRecord.pass_type == pt).count()
        for pt in PassType
    }
    zone_dist = {
        zone.value: db.query(PassRecord).filter(PassRecord.zone == zone).count()
        for zone in Zone
    }

    recent_issued = (
        db.query(VisitorRequest)
        .filter(VisitorRequest.status.in_([RequestStatus.issued, RequestStatus.checked_in, RequestStatus.checked_out]))
        .order_by(VisitorRequest.updated_at.desc())
        .limit(8)
        .all()
    )

    return PassOfficerDashboardResponse(
        role="pass_officer",
        approved_awaiting_pass=approved_awaiting,
        passes_issued_today=passes_today,
        active_passes=active_passes,
        expired_passes=expired_passes,
        pending_renewals=pending_renewals,
        total_passes_all_time=total_passes,
        pass_type_distribution=pass_type_dist,
        zone_access_distribution=zone_dist,
        recent_issued=[_to_activity(r, db) for r in recent_issued],
    )


# ---------------------------------------------------------------------------
# Operations Officer dashboard
# ---------------------------------------------------------------------------

def _ops_officer_dashboard(db: Session, date_from: str | None, date_to: str | None) -> OpsOfficerDashboardResponse:
    today_start, today_end = _parse_dates(date_from, date_to)

    pending_ops = db.query(VisitorRequest).filter(
        VisitorRequest.status == RequestStatus.pending_approval
    ).count()

    under_review = db.query(VisitorRequest).filter(
        VisitorRequest.status == RequestStatus.under_review
    ).count()

    dept_pending = db.query(VisitorRequest).filter(
        VisitorRequest.status == RequestStatus.pending_department_approval
    ).count()

    approved_today = db.query(VisitorRequest).filter(
        and_(
            VisitorRequest.status.in_([
                RequestStatus.approved, 
                RequestStatus.issued, 
                RequestStatus.checked_in, 
                RequestStatus.checked_out
            ]),
            VisitorRequest.operations_reviewed_at >= today_start,
            VisitorRequest.operations_reviewed_at <= today_end,
        )
    ).count()

    rejected_today = db.query(VisitorRequest).filter(
        and_(
            VisitorRequest.status == RequestStatus.rejected,
            VisitorRequest.operations_reviewed_at >= today_start,
            VisitorRequest.operations_reviewed_at <= today_end,
        )
    ).count()

    total_reviewed = db.query(VisitorRequest).filter(
        VisitorRequest.operations_reviewed_at.isnot(None)
    ).count()

    request_stats = [
        RequestStat(label="Pending Ops Review", value=pending_ops, color="#f59e0b"),
        RequestStat(label="Under Review", value=under_review, color="#3b82f6"),
        RequestStat(label="Dept. Pending", value=dept_pending, color="#8b5cf6"),
        RequestStat(label="Approved Today", value=approved_today, color="#10b981"),
        RequestStat(label="Rejected Today", value=rejected_today, color="#ef4444"),
    ]

    recent_requests = (
        db.query(VisitorRequest)
        .filter(
            VisitorRequest.status.in_([
                RequestStatus.pending_approval,
                RequestStatus.under_review,
                RequestStatus.pending_department_approval,
                RequestStatus.approved,
                RequestStatus.rejected,
            ])
        )
        .order_by(VisitorRequest.created_at.desc())
        .limit(10)
        .all()
    )

    return OpsOfficerDashboardResponse(
        role="operations_officer",
        pending_ops_review=pending_ops,
        under_review=under_review,
        approved_today=approved_today,
        rejected_today=rejected_today,
        total_reviewed_all_time=total_reviewed,
        dept_pending=dept_pending,
        request_stats=request_stats,
        recent_requests=[_to_activity(r, db) for r in recent_requests],
    )


# ---------------------------------------------------------------------------
# Gate Officer dashboard
# ---------------------------------------------------------------------------

def _gate_officer_dashboard(db: Session, date_from: str | None, date_to: str | None) -> GateOfficerDashboardResponse:
    today_start, today_end = _parse_dates(date_from, date_to)

    expected_today = db.query(VisitorRequest).filter(
        and_(
            VisitorRequest.status.in_([RequestStatus.approved, RequestStatus.issued, RequestStatus.checked_in, RequestStatus.checked_out]),
            VisitorRequest.requested_date >= today_start,
            VisitorRequest.requested_date <= today_end,
        )
    ).count()

    currently_inside = db.query(VisitorRequest).filter(
        VisitorRequest.status == RequestStatus.checked_in
    ).count()

    checked_in_today = db.query(VisitorRequest).filter(
        and_(
            VisitorRequest.status.in_([RequestStatus.checked_in, RequestStatus.checked_out]),
            VisitorRequest.checked_in_at >= today_start,
            VisitorRequest.checked_in_at <= today_end,
        )
    ).count()

    checked_out_today = db.query(VisitorRequest).filter(
        and_(
            VisitorRequest.checked_out_at.isnot(None),
            VisitorRequest.checked_out_at >= today_start,
            VisitorRequest.checked_out_at <= today_end,
        )
    ).count()

    active_passes = db.query(PassRecord).filter(PassRecord.status == PassStatus.active).count()

    denied_entries = db.query(VisitorRequest).filter(
        VisitorRequest.status == RequestStatus.rejected
    ).count()

    recent_checkins = (
        db.query(VisitorRequest)
        .filter(VisitorRequest.checked_in_at.isnot(None))
        .order_by(VisitorRequest.checked_in_at.desc())
        .limit(8)
        .all()
    )

    recent_checkouts = (
        db.query(VisitorRequest)
        .filter(VisitorRequest.checked_out_at.isnot(None))
        .order_by(VisitorRequest.checked_out_at.desc())
        .limit(8)
        .all()
    )

    vip_requests = (
        db.query(VisitorRequest)
        .filter(
            and_(
                VisitorRequest.visitor_type == "vip",
                VisitorRequest.status.in_([
                    RequestStatus.approved,
                    RequestStatus.issued,
                    RequestStatus.checked_in
                ]),
                or_(
                    and_(
                        VisitorRequest.requested_date <= today_end,
                        VisitorRequest.requested_end_date >= today_start,
                    ),
                    and_(
                        VisitorRequest.requested_date >= today_start,
                        VisitorRequest.requested_date <= today_end,
                    ),
                ),
            )
        )
        .order_by(VisitorRequest.requested_date.asc())
        .all()
    )

    vip_arrivals_list = [
        VipArrival(
            id=r.id,
            request_id=r.request_id,
            visitor_name=r.visitor_name,
            visitor_organization=r.visitor_organization,
            vehicle_number=r.vehicle_number,
            vip_lmv_access=r.vip_lmv_access,
            status=r.status.value,
            requested_date=r.requested_date.isoformat()
        )
        for r in vip_requests
    ]

    return GateOfficerDashboardResponse(
        role="security_gate_officer",
        expected_today=expected_today,
        currently_inside=currently_inside,
        checked_in_today=checked_in_today,
        checked_out_today=checked_out_today,
        active_passes=active_passes,
        denied_entries=denied_entries,
        recent_checkins=[_to_activity(r, db) for r in recent_checkins],
        recent_checkouts=[_to_activity(r, db) for r in recent_checkouts],
        vip_arrivals=vip_arrivals_list,
    )


# ---------------------------------------------------------------------------
# Department Manager dashboard
# ---------------------------------------------------------------------------

def _dept_manager_dashboard(db: Session, current_user: User, date_from: str | None, date_to: str | None) -> DeptManagerDashboardResponse:
    today_start, today_end = _parse_dates(date_from, date_to)
    dept_id = current_user.department_id

    base_q = db.query(VisitorRequest)
    if dept_id:
        base_q = base_q.filter(VisitorRequest.department_id == dept_id)

    pending_dept = base_q.filter(
        VisitorRequest.status.in_([RequestStatus.pending_approval, RequestStatus.pending_department_approval, RequestStatus.under_review]),
        VisitorRequest.dept_reviewed_at == None
    ).count()

    approved_by_dept = base_q.filter(
        VisitorRequest.dept_reviewed_at.isnot(None),
        or_(
            VisitorRequest.dept_comments.like("Accepted:%"),
            and_(
                or_(
                    VisitorRequest.dept_comments.is_(None),
                    ~VisitorRequest.dept_comments.like("Declined:%")
                ),
                or_(
                    VisitorRequest.status != RequestStatus.rejected,
                    VisitorRequest.operations_officer_id.isnot(None)
                )
            )
        )
    ).count()

    rejected_by_dept = base_q.filter(
        VisitorRequest.dept_reviewed_at.isnot(None),
        or_(
            VisitorRequest.dept_comments.like("Declined:%"),
            and_(
                or_(
                    VisitorRequest.dept_comments.is_(None),
                    ~VisitorRequest.dept_comments.like("Accepted:%")
                ),
                VisitorRequest.status == RequestStatus.rejected,
                VisitorRequest.operations_officer_id.is_(None)
            )
        )
    ).count()

    today_requests = base_q.filter(
        and_(
            VisitorRequest.created_at >= today_start,
            VisitorRequest.created_at <= today_end,
        )
    ).count()

    total_requests_all_time = base_q.count()

    recent = (
        base_q.order_by(VisitorRequest.created_at.desc()).limit(10).all()
    )

    # Fetch department name if available
    dept_name = None
    if dept_id:
        from app.models.department import Department
        dept = db.query(Department).filter(Department.id == dept_id).first()
        if dept:
            dept_name = dept.name

    return DeptManagerDashboardResponse(
        role="department_manager",
        department_name=dept_name,
        department_id=dept_id,
        pending_dept_approval=pending_dept,
        approved_by_dept=approved_by_dept,
        rejected_by_dept=rejected_by_dept,
        today_requests=today_requests,
        total_requests_all_time=total_requests_all_time,
        recent_requests=[_to_activity(r, db) for r in recent],
    )


# ---------------------------------------------------------------------------
# Zone capacity update (admin only)
# ---------------------------------------------------------------------------

@router.get("/legacy-summary", response_model=DashboardResponse)
def legacy_summary(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardResponse:
    """Backward-compatible endpoint for the old dashboard schema."""
    now = datetime.now(timezone.utc)
    start_date = date.fromisoformat(date_from) if date_from else now.date()
    end_date = date.fromisoformat(date_to) if date_to else start_date
    if end_date < start_date:
        start_date, end_date = end_date, start_date
    start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    end = datetime.combine(end_date, time.max, tzinfo=timezone.utc)

    fp = db.query(PassRecord).filter(and_(PassRecord.issued_time >= start, PassRecord.issued_time <= end))
    today_total = fp.count()
    active_total = fp.filter(PassRecord.status == PassStatus.active).count()
    completed_total = fp.filter(PassRecord.status == PassStatus.completed).count()

    zone_stats = []
    zone_caps = {}
    for zone in Zone:
        zq = fp.filter(PassRecord.zone == zone)
        zone_stats.append(ZoneStat(zone=zone.value, total=zq.count(),
                                   active=zq.filter(PassRecord.status == PassStatus.active).count(),
                                   completed=zq.filter(PassRecord.status == PassStatus.completed).count()))
        cap = db.query(ZoneCapacity).filter(ZoneCapacity.zone == zone).first()
        zone_caps[zone.value] = cap.capacity if cap else 0

    pt_dist = {pt.value: fp.filter(PassRecord.pass_type == pt).count() for pt in PassType}
    za_dist = {zone.value: fp.filter(PassRecord.zone == zone).count() for zone in Zone}

    return DashboardResponse(
        today_total=today_total,
        active_total=active_total,
        completed_total=completed_total,
        zone_stats=zone_stats,
        pass_type_distribution=pt_dist,
        zone_access_distribution=za_dist,
        zone_capacities=zone_caps,
    )
