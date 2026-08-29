"""
Report Service: Handles reporting, statistics, and data export
"""

from datetime import datetime, date, timedelta
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from app.models import AuditActionType, AuditEntityType, AuditLog, PassRecord, PassGroup, PassStatus, PassGroupStatus, Zone, PassType


def get_daily_report(
    db: Session,
    target_date: date | None = None,
    zone: str | None = None,
    company: str | None = None,
) -> list[dict]:
    """
    Get daily pass statistics.
    
    Args:
        db: Database session
        target_date: Date to report on (defaults to today)
        zone: Optional zone filter
        company: Optional company filter
    
    Returns:
        List of daily statistics
    """
    if not target_date:
        target_date = date.today()

    from datetime import time, timezone
    start = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
    end = datetime.combine(target_date, time.max, tzinfo=timezone.utc)

    query = db.query(PassRecord).filter(
        and_(
            PassRecord.issued_time >= start,
            PassRecord.issued_time <= end,
        )
    )

    if zone:
        query = query.filter(PassRecord.zone == zone)

    if company:
        query = query.filter(PassRecord.company_name.ilike(f"%{company}%"))

    passes = query.all()

    # Calculate statistics
    total = len(passes)
    single_passes = len([p for p in passes if p.group_id is None])
    group_passes = len([p for p in passes if p.group_id is not None])
    completed = len([p for p in passes if p.status == PassStatus.completed])
    active = len([p for p in passes if p.status == PassStatus.active])
    overdue = len([p for p in passes if p.status == PassStatus.overdue])

    return [
        {
            "date": target_date.isoformat(),
            "pass_count": total,
            "single_passes": single_passes,
            "group_passes": group_passes,
            "completed": completed,
            "active": active,
            "overdue": overdue,
        }
    ]


def get_zone_wise_report(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    """
    Get zone-wise pass statistics.
    
    Args:
        db: Database session
        date_from: Start date (defaults to 7 days ago)
        date_to: End date (defaults to today)
    
    Returns:
        List of zone statistics
    """
    if not date_to:
        date_to = date.today()

    if not date_from:
        date_from = date_to - timedelta(days=7)

    from datetime import time, timezone
    start = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
    end = datetime.combine(date_to, time.max, tzinfo=timezone.utc)

    zones = [Zone.zone_1, Zone.zone_2, Zone.zone_3, Zone.zone_4]
    results = []

    for zone in zones:
        query = db.query(PassRecord).filter(
            and_(
                PassRecord.zone == zone,
                PassRecord.issued_time >= start,
                PassRecord.issued_time <= end,
            )
        )

        total = query.count()
        completed = query.filter(PassRecord.status == PassStatus.completed).count()
        completion_rate = (completed / total * 100) if total > 0 else 0

        group_passes = query.filter(PassRecord.group_id.isnot(None)).count()

        results.append(
            {
                "zone": zone.value,
                "pass_count": total,
                "group_passes": group_passes,
                "completed": completed,
                "completion_rate": round(completion_rate, 2),
            }
        )

    return results


def get_group_statistics(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    """
    Get group pass statistics.
    
    Args:
        db: Database session
        date_from: Start date (defaults to 7 days ago)
        date_to: End date (defaults to today)
    
    Returns:
        Dictionary with group statistics
    """
    if not date_to:
        date_to = date.today()

    if not date_from:
        date_from = date_to - timedelta(days=7)

    from datetime import time, timezone
    start = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
    end = datetime.combine(date_to, time.max, tzinfo=timezone.utc)

    groups = db.query(PassGroup).filter(
        and_(
            PassGroup.created_at >= start,
            PassGroup.created_at <= end,
        )
    ).all()

    total_groups = len(groups)
    completed_groups = len([g for g in groups if g.status == PassGroupStatus.completed])
    draft_groups = len([g for g in groups if g.status == PassGroupStatus.draft])

    total_visitors = sum(g.num_visitors for g in groups)
    avg_visitors = total_visitors / total_groups if total_groups > 0 else 0
    completion_rate = (completed_groups / total_groups * 100) if total_groups > 0 else 0

    return {
        "total_groups": total_groups,
        "completed_groups": completed_groups,
        "draft_groups": draft_groups,
        "issued_groups": total_groups - draft_groups - completed_groups,
        "total_visitors": total_visitors,
        "avg_visitors_per_group": round(avg_visitors, 2),
        "completion_rate": round(completion_rate, 2),
    }


def get_pass_type_usage(db: Session) -> list[dict]:
    records = db.query(PassRecord).all()
    results = []
    for pass_type in PassType:
        matching = [record for record in records if record.pass_type == pass_type]
        results.append(
            {
                "pass_type": pass_type.value,
                "pass_count": len(matching),
                "zone_access_count": sum(len(record.allowed_zones or []) for record in matching),
            }
        )
    return results


def get_access_violations(db: Session) -> list[dict]:
    violations = (
        db.query(AuditLog)
        .filter(
            and_(
                AuditLog.action_type == AuditActionType.UNAUTHORIZED_ACCESS,
                AuditLog.entity_type == AuditEntityType.access_check,
            )
        )
        .order_by(AuditLog.timestamp.desc())
        .all()
    )
    return [
        {
            "timestamp": item.timestamp,
            "pass_no": (item.event_metadata or {}).get("pass_no"),
            "pass_type": (item.event_metadata or {}).get("pass_type"),
            "requested_zone": (item.event_metadata or {}).get("requested_zone"),
            "username": item.username,
            "details": item.details,
        }
        for item in violations
    ]


def get_dashboard_pass_type_stats(db: Session) -> dict:
    records = db.query(PassRecord).all()
    pass_type_distribution = {pass_type.value: sum(1 for record in records if record.pass_type == pass_type) for pass_type in PassType}
    zone_access_distribution = {
        "Zone 1": sum(1 for record in records if 1 in (record.allowed_zones or [])),
        "Zone 2": sum(1 for record in records if 2 in (record.allowed_zones or [])),
        "Zone 3": sum(1 for record in records if 3 in (record.allowed_zones or [])),
        "Zone 4": sum(1 for record in records if 4 in (record.allowed_zones or [])),
    }
    return {
        "pass_type_distribution": pass_type_distribution,
        "zone_access_distribution": zone_access_distribution,
    }


def export_to_csv(
    db: Session,
    report_type: str,
    date_from: date | None = None,
    date_to: date | None = None,
    zone: str | None = None,
) -> str:
    """
    Export report data to CSV format.
    
    Args:
        db: Database session
        report_type: 'daily', 'zone_wise', or 'group_stats'
        date_from: Start date
        date_to: End date
        zone: Optional zone filter
    
    Returns:
        CSV string
    """
    import csv
    import io

    output = io.StringIO()

    if report_type == "daily":
        data = get_daily_report(db, date_to, zone)
        writer = csv.DictWriter(
            output,
            fieldnames=["date", "pass_count", "single_passes", "group_passes", "completed", "active", "overdue"],
        )
        writer.writeheader()
        writer.writerows(data)

    elif report_type == "zone_wise":
        data = get_zone_wise_report(db, date_from, date_to)
        writer = csv.DictWriter(
            output,
            fieldnames=["zone", "pass_count", "group_passes", "completed", "completion_rate"],
        )
        writer.writeheader()
        writer.writerows(data)

    elif report_type == "group_stats":
        data = [get_group_statistics(db, date_from, date_to)]
        writer = csv.DictWriter(
            output,
            fieldnames=["total_groups", "completed_groups", "draft_groups", "issued_groups", "total_visitors", "avg_visitors_per_group", "completion_rate"],
        )
        writer.writeheader()
        writer.writerows(data)

    return output.getvalue()
