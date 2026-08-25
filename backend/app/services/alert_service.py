"""
Alert Service: Handles alert creation, resolution, and status checking
"""

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models import Alert, AlertType, AlertStatus, PassRecord, PassStatus, PassGroup, PassGroupStatus


def check_and_create_overdue_alerts(
    db: Session,
    threshold_hours: int = 4,
) -> list[Alert]:
    """
    Check for passes that have been active for > threshold_hours without checkout.
    Create alerts for new overdue passes.
    
    Args:
        db: Database session
        threshold_hours: Hours after which to mark pass as overdue
    
    Returns:
        List of newly created alerts
    """
    now = datetime.now(timezone.utc)
    threshold = now - timedelta(hours=threshold_hours)

    # Find active passes that have been issued before threshold time and not yet checked out
    overdue_passes = db.query(PassRecord).filter(
        and_(
            PassRecord.status == PassStatus.active,
            PassRecord.received_time.is_(None),
            PassRecord.issued_time < threshold,
        )
    ).all()

    new_alerts = []

    for pass_record in overdue_passes:
        # Check if alert already exists
        existing_alert = db.query(Alert).filter(
            and_(
                Alert.pass_id == pass_record.id,
                Alert.alert_type == AlertType.overdue,
                Alert.status == AlertStatus.active,
            )
        ).first()

        if not existing_alert:
            # Create new alert
            alert = Alert(
                pass_id=pass_record.id,
                alert_type=AlertType.overdue,
                status=AlertStatus.active,
                triggered_by_hours=threshold_hours,
            )
            db.add(alert)
            new_alerts.append(alert)

            # Update pass status to overdue
            pass_record.status = PassStatus.overdue

    db.commit()
    return new_alerts


def resolve_alert(db: Session, alert_id: int) -> Alert | None:
    """
    Mark an alert as resolved.
    
    Args:
        db: Database session
        alert_id: ID of alert to resolve
    
    Returns:
        Updated Alert or None if not found
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.status = AlertStatus.resolved
        alert.resolved_at = datetime.now(timezone.utc)
        db.commit()
    return alert


def auto_resolve_pass_alerts(db: Session, pass_id: int) -> list[Alert]:
    """
    Automatically resolve all active alerts for a pass when it's checked out.
    
    Args:
        db: Database session
        pass_id: ID of pass being checked out
    
    Returns:
        List of resolved alerts
    """
    alerts = db.query(Alert).filter(
        and_(
            Alert.pass_id == pass_id,
            Alert.status == AlertStatus.active,
        )
    ).all()

    for alert in alerts:
        alert.status = AlertStatus.resolved
        alert.resolved_at = datetime.now(timezone.utc)

    if alerts:
        db.commit()

    return alerts


def get_active_alerts(db: Session, limit: int = 100) -> list[Alert]:
    """Get all active alerts."""
    return db.query(Alert).filter(Alert.status == AlertStatus.active).limit(limit).all()


def get_dashboard_stats(db: Session) -> dict:
    """
    Get dashboard statistics for alerts and pass status.
    
    Returns:
        Dictionary with stats
    """
    from sqlalchemy import func
    from datetime import date

    # Count passes by status
    active_count = db.query(func.count(PassRecord.id)).filter(
        PassRecord.status == PassStatus.active
    ).scalar() or 0

    completed_count = db.query(func.count(PassRecord.id)).filter(
        PassRecord.status == PassStatus.completed
    ).scalar() or 0

    overdue_count = db.query(func.count(PassRecord.id)).filter(
        PassRecord.status == PassStatus.overdue
    ).scalar() or 0

    # Count groups
    active_groups = db.query(func.count(PassGroup.id)).filter(
        PassGroup.status == PassGroupStatus.issued
    ).scalar() or 0

    total_visitors_in_groups = db.query(func.sum(PassGroup.num_visitors)).filter(
        PassGroup.status == PassGroupStatus.issued
    ).scalar() or 0

    # Zone distribution
    zone_dist = db.query(
        PassRecord.zone,
        func.count(PassRecord.id)
    ).group_by(PassRecord.zone).all()

    zone_distribution = {zone: count for zone, count in zone_dist}

    # Today's count
    today = date.today()
    from app.models.pass_record import PassRecord as PR
    from sqlalchemy import func
    today_count = db.query(func.count(PR.id)).filter(
        func.date(PR.issued_time) == today
    ).scalar() or 0

    # Week count
    week_start = today - timedelta(days=7)
    week_count = db.query(func.count(PR.id)).filter(
        func.date(PR.issued_time) >= week_start
    ).scalar() or 0

    return {
        "active_passes_count": active_count,
        "completed_passes_count": completed_count,
        "overdue_passes_count": overdue_count,
        "active_groups_count": active_groups,
        "total_visitors_in_groups": total_visitors_in_groups,
        "zone_distribution": zone_distribution,
        "today_pass_count": today_count,
        "week_pass_count": week_count,
    }
