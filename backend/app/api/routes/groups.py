"""
Group Pass Routes: Handle group pass creation, management, and retrieval
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin_or_staff, require_group_pass_issuer
from app.models import PassGroup, PassRecord, User
from app.schemas.pass_group import (
    PassGroupAddVisitors,
    PassGroupCreate,
    PassGroupDetailResponse,
    PassGroupListResponse,
    PassGroupResponse,
)
from app.services import group_service
from app.services.audit_service import log_action
from app.models.audit_log import AuditActionType, AuditEntityType

router = APIRouter(prefix="/pass-groups", tags=["Group Passes"])


@router.post("", response_model=PassGroupResponse)
def create_group(
    payload: PassGroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_group_pass_issuer()),
) -> PassGroupResponse:
    """Create a new group pass (Step 1)."""
    group = group_service.create_group_pass(db, payload, current_user)
    return group


@router.post("/{group_id}/visitors", response_model=list[dict])
def add_visitors(
    group_id: int,
    payload: PassGroupAddVisitors,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_group_pass_issuer()),
) -> list[dict]:
    """Add visitors to a group (Step 2). Creates individual passes."""
    try:
        passes = group_service.add_visitors_to_group(db, group_id, payload, current_user)
        return [
            {
                "id": p.id,
                "pass_no": p.pass_no,
                "visitor_name": p.visitor_name,
                "nic_number": p.nic_number,
            }
            for p in passes
        ]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=PassGroupListResponse)
def list_groups(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    zone: str | None = Query(default=None),
    sort: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PassGroupListResponse:
    """List all group passes with filtering and pagination."""
    query = db.query(PassGroup)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PassGroup.group_id.ilike(term),
                PassGroup.requested_by.ilike(term),
                PassGroup.company_name.ilike(term),
            )
        )

    if status:
        query = query.filter(PassGroup.status == status)

    if zone:
        query = query.filter(PassGroup.zone == zone)

    total = query.count()

    # Apply sorting
    sort_column = desc(PassGroup.created_at) if sort == "desc" else PassGroup.created_at
    items = (
        query.order_by(sort_column)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PassGroupListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{group_id}", response_model=PassGroupDetailResponse)
def get_group_detail(
    group_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PassGroupDetailResponse:
    """Get detailed information about a group including all passes."""
    group = db.query(PassGroup).filter(PassGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get passes for this group
    passes = group_service.get_group_passes(db, group_id)

    return PassGroupDetailResponse(
        id=group.id,
        group_id=group.group_id,
        requested_by=group.requested_by,
        company_name=group.company_name,
        pass_type=group.pass_type,
        allowed_zones=group.allowed_zones,
        zone=group.zone,
        num_visitors=group.num_visitors,
        status=group.status,
        created_by=group.created_by,
        created_at=group.created_at,
        completed_at=group.completed_at,
        notes=group.notes,
        passes=[
            {
                "id": p.id,
                "pass_no": p.pass_no,
                "visitor_name": p.visitor_name,
                "nic_number": p.nic_number,
                "status": p.status,
                "issued_time": p.issued_time,
                "received_time": p.received_time,
            }
            for p in passes
        ],
    )


@router.patch("/{group_id}/complete", response_model=PassGroupResponse)
def complete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_group_pass_issuer()),
) -> PassGroupResponse:
    """Mark a group as completed."""
    try:
        group = group_service.complete_group(db, group_id, current_user)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        return group
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{group_id}/visitors/{pass_id}", response_model=dict)
def remove_visitor(
    group_id: int,
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_group_pass_issuer()),
) -> dict:
    """Remove a visitor from a group (only if group is still in draft)."""
    try:
        pass_record = group_service.remove_visitor_from_group(
            db, group_id, pass_id, current_user
        )
        if not pass_record:
            raise HTTPException(status_code=404, detail="Pass not found")
        return {"message": f"Visitor {pass_record.visitor_name} removed from group"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{group_id}/approve", response_model=PassGroupResponse)
def approve_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_group_pass_issuer()),
) -> PassGroupResponse:
    """Approve a group pass request."""
    try:
        group = group_service.approve_group(db, group_id, current_user)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        return group
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{group_id}/reject", response_model=PassGroupResponse)
def reject_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_group_pass_issuer()),
) -> PassGroupResponse:
    """Reject a group pass request."""
    try:
        group = group_service.reject_group(db, group_id, current_user)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        return group
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

