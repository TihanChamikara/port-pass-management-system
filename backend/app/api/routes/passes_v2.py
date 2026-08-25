"""
Pass Routes: Enhanced with new services and RBAC
"""

import csv
import io
import logging
import traceback
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, asc, desc, func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin_or_staff
from app.models import PassRecord, PassStatus, PassType, User, Zone
from app.schemas.pass_record import PassCheckout, PassCreate, PassListResponse, PassResponse
from app.services import pass_service

router = APIRouter(prefix="/passes", tags=["Passes"])
logger = logging.getLogger(__name__)


def _serialize_pass(record: PassRecord) -> PassResponse:
    return PassResponse.model_validate(record, from_attributes=True)


def _log_and_raise_500(error: Exception, current_user: User | None = None) -> None:
    logger.exception("Pass listing failed", exc_info=error)
    if current_user:
        logger.error("Pass list user=%s role=%s", current_user.username, current_user.role.value)
    raise HTTPException(status_code=500, detail="Unable to load pass records at this time")


@router.post("", response_model=PassResponse)
def issue_pass(
    payload: PassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff()),
) -> PassResponse:
    """Create a new single pass."""
    return pass_service.create_single_pass(db, payload, current_user)


@router.get("", response_model=PassListResponse)
def list_passes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    pass_type: PassType | None = Query(default=None),
    access_level: str | None = Query(default=None),
    zone: Zone | None = Query(default=None),
    target_date: date | None = Query(default=None),
    status: PassStatus | None = Query(default=None),
    sort: str = Query(default="desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PassListResponse:
    """List all passes with filtering and pagination."""
    logger.info(
        "Listing passes page=%s page_size=%s search=%s pass_type=%s access_level=%s zone=%s target_date=%s status=%s sort=%s user=%s",
        page,
        page_size,
        search,
        pass_type.value if pass_type else None,
        access_level,
        zone.value if zone else None,
        target_date.isoformat() if target_date else None,
        status.value if status else None,
        sort,
        current_user.username,
    )

    try:
        if sort not in {"asc", "desc"}:
            raise HTTPException(status_code=400, detail='sort must be "asc" or "desc"')

        if access_level not in {None, "single", "all"}:
            raise HTTPException(status_code=400, detail='access_level must be "single" or "all"')

        query = db.query(PassRecord)

        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    PassRecord.visitor_name.ilike(term),
                    PassRecord.nic_number.ilike(term),
                    PassRecord.pass_no.ilike(term),
                )
            )

        if pass_type:
            query = query.filter(PassRecord.pass_type == pass_type)

        if zone:
            query = query.filter(PassRecord.zone == zone)

        if target_date:
            start = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
            end = datetime.combine(target_date, time.max, tzinfo=timezone.utc)
            query = query.filter(and_(PassRecord.issued_time >= start, PassRecord.issued_time <= end))

        if status:
            query = query.filter(PassRecord.status == status)

        if sort == "desc":
            query = query.order_by(PassRecord.issued_time.desc())
        else:
            query = query.order_by(PassRecord.issued_time.asc())

        rows = query.all()

        if access_level == "single":
            rows = [record for record in rows if len(record.allowed_zones or []) == 1]
        elif access_level == "all":
            rows = [record for record in rows if len(record.allowed_zones or []) > 1]

        total = len(rows)
        start_index = (page - 1) * page_size
        items = [_serialize_pass(record) for record in rows[start_index : start_index + page_size]]
        return PassListResponse(items=items, total=total, page=page, page_size=page_size)
    except HTTPException:
        raise
    except Exception as error:
        _log_and_raise_500(error, current_user)


@router.get("/{pass_id}", response_model=PassResponse)
def get_pass(
    pass_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PassResponse:
    """Get detailed information about a specific pass."""
    pass_record = db.query(PassRecord).filter(PassRecord.id == pass_id).first()
    if not pass_record:
        raise HTTPException(status_code=404, detail="Pass not found")
    return _serialize_pass(pass_record)


@router.patch("/{pass_id}/checkout", response_model=PassResponse)
def checkout_pass(
    pass_id: int,
    payload: PassCheckout,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff()),
) -> PassResponse:
    """Mark a pass as received/checked out."""
    record = pass_service.mark_pass_checkout(db, pass_id, current_user, payload.received_time)
    if not record:
        raise HTTPException(status_code=404, detail="Pass record not found")
    return _serialize_pass(record)


@router.get("/export/csv")
def export_passes_csv(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StreamingResponse:
    """Export all passes to CSV."""
    records = db.query(PassRecord).order_by(desc(PassRecord.issued_time)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "SR No",
            "Pass No",
            "Visitor Name",
            "Company Name",
            "NIC Number",
            "Contact Number",
            "Zone",
            "Issued Time",
            "Received Time",
            "Status",
        ]
    )

    for record in records:
        writer.writerow(
            [
                record.sr_no,
                record.pass_no,
                record.visitor_name,
                record.company_name,
                record.nic_number,
                record.contact_number,
                record.zone.value,
                record.issued_time.isoformat(),
                record.received_time.isoformat() if record.received_time else "",
                record.status.value,
            ]
        )

    output.seek(0)
    headers = {"Content-Disposition": "attachment; filename=passes_export.csv"}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)
