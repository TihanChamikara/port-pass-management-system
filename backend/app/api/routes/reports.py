"""
Reports Routes: Handle reporting, statistics, and data export
"""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin_or_staff
from app.models import User
from app.services import report_service
from app.schemas.report import (
    DailyReportItem,
    AccessViolationItem,
    PassTypeUsageItem,
    ZoneWiseReportItem,
    GroupStatsResponse,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/daily", response_model=list[DailyReportItem])
def daily_report(
    date_str: str | None = Query(default=None),
    zone: str | None = Query(default=None),
    company: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_staff()),
) -> list[DailyReportItem]:
    """Get daily pass statistics."""
    target_date = None
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    return report_service.get_daily_report(db, target_date, zone, company)


@router.get("/zone-wise", response_model=list[ZoneWiseReportItem])
def zone_wise_report(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_staff()),
) -> list[ZoneWiseReportItem]:
    """Get zone-wise pass statistics."""
    date_from_obj = None
    date_to_obj = None

    if date_from:
        try:
            date_from_obj = date.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")

    if date_to:
        try:
            date_to_obj = date.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")

    return report_service.get_zone_wise_report(db, date_from_obj, date_to_obj)


@router.get("/group-stats", response_model=GroupStatsResponse)
def group_stats(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_staff()),
) -> GroupStatsResponse:
    """Get group pass statistics."""
    date_from_obj = None
    date_to_obj = None

    if date_from:
        try:
            date_from_obj = date.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")

    if date_to:
        try:
            date_to_obj = date.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")

    stats = report_service.get_group_statistics(db, date_from_obj, date_to_obj)
    return GroupStatsResponse(**stats)


@router.get("/export")
def export_report(
    report_type: str = Query(..., description="daily, zone_wise, or group_stats"),
    format: str = Query(default="csv", description="csv or excel"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    zone: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_staff()),
):
    """Export report data."""
    if report_type not in ["daily", "zone_wise", "group_stats"]:
        raise HTTPException(status_code=400, detail="Invalid report_type")

    if format not in ["csv", "excel"]:
        raise HTTPException(status_code=400, detail="Invalid format. Use csv or excel")

    date_from_obj = None
    date_to_obj = None

    if date_from:
        try:
            date_from_obj = date.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format")

    if date_to:
        try:
            date_to_obj = date.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format")

    # For now, only support CSV
    csv_data = report_service.export_to_csv(
        db, report_type, date_from_obj, date_to_obj, zone
    )

    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=report_{report_type}_{date_to_obj or 'all'}.csv"},
    )


@router.get("/pass-types", response_model=list[PassTypeUsageItem])
def pass_type_usage(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_staff()),
) -> list[PassTypeUsageItem]:
    return [PassTypeUsageItem(**item) for item in report_service.get_pass_type_usage(db)]


@router.get("/access-violations", response_model=list[AccessViolationItem])
def access_violations(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_staff()),
) -> list[AccessViolationItem]:
    return [AccessViolationItem(**item) for item in report_service.get_access_violations(db)]
