import csv
import io
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, asc, desc, func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin_or_staff, require_roles
from app.models import AuditLog, PassRecord, PassStatus, User, UserRole, Zone
from app.schemas.pass_record import PassCheckout, PassCreate, PassListResponse, PassResponse

router = APIRouter(prefix="/passes", tags=["Passes"])


@router.post("", response_model=PassResponse)
def issue_pass(
    payload: PassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff()),
) -> PassResponse:
    existing = db.query(PassRecord).filter(PassRecord.pass_no == payload.pass_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Pass number already exists")

    from app.models.pass_record import pass_sr_no_seq
    next_sr_no = db.scalar(pass_sr_no_seq) or 1
    new_record = PassRecord(
        sr_no=next_sr_no,
        pass_no=payload.pass_no,
        visitor_name=payload.visitor_name,
        company_name=payload.company_name,
        nic_number=payload.nic_number,
        contact_number=payload.contact_number,
        zone=payload.zone,
        issued_time=datetime.now(timezone.utc),
        status=PassStatus.active,
    )
    db.add(new_record)
    db.add(AuditLog(username=current_user.username, action="issue_pass", details=f"Pass No: {payload.pass_no}"))
    db.commit()
    db.refresh(new_record)
    return new_record


@router.get("", response_model=PassListResponse)
def list_passes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    zone: Zone | None = Query(default=None),
    target_date: date | None = Query(default=None),
    status: PassStatus | None = Query(default=None),
    sort: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PassListResponse:
    from app.models.visitor_request import VisitorRequest

    query = db.query(PassRecord)
    
    if _.role == "pass_officer":
        query = query.outerjoin(VisitorRequest, VisitorRequest.pass_record_id == PassRecord.id)
        query = query.filter(or_(VisitorRequest.visitor_type != "vip", VisitorRequest.id == None))

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PassRecord.visitor_name.ilike(term),
                PassRecord.nic_number.ilike(term),
                PassRecord.pass_no.ilike(term),
            )
        )

    if zone:
        query = query.filter(PassRecord.zone == zone)

    if target_date:
        start = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(target_date, time.max, tzinfo=timezone.utc)
        query = query.filter(and_(PassRecord.issued_time >= start, PassRecord.issued_time <= end))

    if status:
        query = query.filter(PassRecord.status == status)

    total = query.count()

    query = query.order_by(asc(PassRecord.issued_time) if sort == "asc" else desc(PassRecord.issued_time))

    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return PassListResponse(items=items, total=total, page=page, page_size=page_size)


@router.patch("/{pass_id}/checkout", response_model=PassResponse)
def checkout_pass(
    pass_id: int,
    payload: PassCheckout,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff()),
) -> PassResponse:
    record = db.query(PassRecord).filter(PassRecord.id == pass_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Pass record not found")

    if record.status == PassStatus.completed:
        return record

    record.received_time = payload.received_time or datetime.now(timezone.utc)
    record.status = PassStatus.completed
    db.add(AuditLog(username=current_user.username, action="checkout_pass", details=f"Pass No: {record.pass_no}"))
    db.commit()
    db.refresh(record)
    return record


@router.get("/export/csv")
def export_passes_csv(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> StreamingResponse:
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
