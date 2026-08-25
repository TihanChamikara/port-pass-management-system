"""
Alert Routes: Handle alert management and status checking
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin_or_security
from app.models import Alert, User
from app.schemas.report import DashboardStatsResponse
from app.services.alert_service import (
    check_and_create_overdue_alerts,
    get_active_alerts,
    get_dashboard_stats,
    resolve_alert,
)

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.post("/check-overdue")
def check_overdue(
    threshold_hours: int = Query(default=4, ge=1),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_security()),
) -> dict:
    """Check for overdue passes and create alerts."""
    new_alerts = check_and_create_overdue_alerts(db, threshold_hours)
    return {
        "new_alerts_created": len(new_alerts),
        "alerts": [
            {
                "id": a.id,
                "pass_id": a.pass_id,
                "alert_type": a.alert_type,
            }
            for a in new_alerts
        ],
    }


@router.get("/active")
def get_active(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[dict]:
    """Get all active alerts."""
    alerts = get_active_alerts(db)
    return [
        {
            "id": a.id,
            "pass_id": a.pass_id,
            "group_id": a.group_id,
            "alert_type": a.alert_type.value,
            "status": a.status.value,
            "created_at": a.created_at,
        }
        for a in alerts
    ]


@router.patch("/{alert_id}/resolve")
def resolve(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Resolve an alert."""
    alert = resolve_alert(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {
        "id": alert.id,
        "status": alert.status.value,
        "resolved_at": alert.resolved_at,
    }


@router.get("/stats", response_model=DashboardStatsResponse)
def dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardStatsResponse:
    """Get dashboard statistics."""
    stats = get_dashboard_stats(db)
    return DashboardStatsResponse(**stats)
