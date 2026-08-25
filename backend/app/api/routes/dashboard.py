from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import PassRecord, PassStatus, User, Zone, PassType, ZoneCapacity
from app.schemas.dashboard import DashboardResponse, ZoneStat
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardResponse)
def summary(
    date_from: str | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: str | None = Query(default=None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardResponse:
    now = datetime.now(timezone.utc)

    if date_from:
        try:
            start_date = date.fromisoformat(date_from)
        except ValueError:
            start_date = now.date()
    else:
        start_date = now.date()

    if date_to:
        try:
            end_date = date.fromisoformat(date_to)
        except ValueError:
            end_date = start_date
    else:
        end_date = start_date

    if end_date < start_date:
        start_date, end_date = end_date, start_date

    start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    end = datetime.combine(end_date, time.max, tzinfo=timezone.utc)

    filtered_passes = db.query(PassRecord).filter(and_(PassRecord.issued_time >= start, PassRecord.issued_time <= end))

    today_total = filtered_passes.count()

    active_total = filtered_passes.filter(PassRecord.status == PassStatus.active).count()
    completed_total = filtered_passes.filter(PassRecord.status == PassStatus.completed).count()

    zone_stats: list[ZoneStat] = []
    zone_capacities_dict = {}
    
    for zone in Zone:
        zone_query = filtered_passes.filter(PassRecord.zone == zone)
        total = zone_query.count()
        active = zone_query.filter(PassRecord.status == PassStatus.active).count()
        completed = zone_query.filter(PassRecord.status == PassStatus.completed).count()
        zone_stats.append(ZoneStat(zone=zone.value, total=total, active=active, completed=completed))
        
        # Fetch zone capacity
        zone_capacity_record = db.query(ZoneCapacity).filter(ZoneCapacity.zone == zone).first()
        zone_capacities_dict[zone.value] = zone_capacity_record.capacity if zone_capacity_record else 0

    pass_type_distribution = {
        pass_type.value: filtered_passes.filter(PassRecord.pass_type == pass_type).count()
        for pass_type in PassType
    }

    zone_access_distribution = {
        zone.value: filtered_passes.filter(PassRecord.zone == zone).count()
        for zone in Zone
    }

    return DashboardResponse(
        today_total=today_total,
        active_total=active_total,
        completed_total=completed_total,
        zone_stats=zone_stats,
        zone_capacities=zone_capacities_dict,
        pass_type_distribution=pass_type_distribution,
        zone_access_distribution=zone_access_distribution,
    )
