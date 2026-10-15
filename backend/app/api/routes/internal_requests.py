"""
Internal Visitor Request Routes: Department Coordinator submits internal visitor requests.

Security model:
- Identity (department, HOD) is ALWAYS derived from the authenticated Coordinator account.
- Client-supplied department_id / hod_id values are IGNORED.
- Only users with role DEPARTMENT_COORDINATOR (or ADMIN) can access these endpoints.
"""

import json
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_coordinator
from app.models import User, VisitorRequest
from app.models.department import Department
from app.models.visitor_request import RequestStatus, ApprovalStage
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/internal-visitor-requests", tags=["internal-requests"])


class InternalVisitorRequestCreate(BaseModel):
    """Payload for Coordinator-submitted internal visitor request.
    Does NOT accept department_id, hod_id or requester identity — these come from auth."""
    # Visitor info
    visitor_name: str
    visitor_nic: Optional[str] = None
    visitor_phone: Optional[str] = None
    visitor_organization: Optional[str] = None
    visitor_purpose: str
    visitor_category: Optional[str] = None
    visitor_email: Optional[str] = None

    # Visit details
    requested_date: datetime        # Entry time
    requested_end_date: datetime    # Exit time
    expected_duration_minutes: int = 480
    visit_building_department: Optional[str] = None

    # Access
    requested_zones: List[str]
    vehicle_number: Optional[str] = None
    carrying_equipment: bool = False
    equipment_description: Optional[str] = None

    # Multi-visitor / vehicle lists
    visitors: Optional[List[Dict[str, Any]]] = None
    vehicles: Optional[List[Dict[str, Any]]] = None

    # Extras
    host_name: Optional[str] = None
    additional_notes: Optional[str] = None


def _generate_request_id() -> str:
    """Generate a human-readable unique request ID like REQ-20261004-001."""
    from random import randint
    date_str = datetime.utcnow().strftime("%Y%m%d")
    seq = randint(1000, 9999)
    return f"REQ-{date_str}-{seq}"


@router.post(
    "/submit",
    status_code=status.HTTP_201_CREATED,
    summary="Submit internal visitor request (Coordinator only)",
    description="Creates an internal visitor request. Identity is derived from the authenticated Coordinator account — client cannot override department or HOD.",
)
async def submit_internal_visitor_request(
    payload: InternalVisitorRequestCreate,
    current_user: User = Depends(require_coordinator()),
    db: Session = Depends(get_db),
):
    """
    Department Coordinator submits an internal visitor request.

    Security:
    - department_id = current_user.department_id  (server-assigned, not from payload)
    - represented_hod_id = current_user.represented_hod_id  (server-assigned)
    - requester_name = current_user.full_name

    The request goes directly to PENDING_APPROVAL (SCR/Ops queue) — no HOD approval step.
    """
    # --- Security: derive identity from the authenticated account ---
    dept_id = current_user.department_id
    hod_id = current_user.represented_hod_id

    if not dept_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your coordinator account is not assigned to a department. Please contact an Administrator.",
        )

    # Look up department name
    dept = db.query(Department).filter(Department.id == dept_id).first()
    dept_name = dept.name if dept else None

    # Look up represented HOD name
    hod_name = None
    if hod_id:
        hod_user = db.query(User).filter(User.id == hod_id).first()
        if hod_user:
            hod_name = hod_user.full_name

    # Build visitor request
    request_id = _generate_request_id()

    visitor_req = VisitorRequest(
        request_id=request_id,
        # Requester identity — ALWAYS from authenticated user
        requester_name=current_user.full_name,
        requester_email=current_user.username,  # coordinator has no separate email field
        requester_phone=None,
        # Department & HOD — ALWAYS from authenticated account
        department_id=dept_id,
        department_name=dept_name,
        host_employee_id=hod_id,
        host_employee_name=payload.host_name or hod_name,
        # Visitor info
        visitor_name=payload.visitor_name,
        visitor_nic=payload.visitor_nic,
        visitor_phone=payload.visitor_phone,
        visitor_organization=payload.visitor_organization,
        visitor_purpose=payload.visitor_purpose,
        visitor_category=payload.visitor_category,
        visitor_email=payload.visitor_email,
        # Visit details
        requested_date=payload.requested_date,
        requested_end_date=payload.requested_end_date,
        expected_duration_minutes=payload.expected_duration_minutes,
        visit_building_department=payload.visit_building_department,
        # Access
        requested_zones=json.dumps(payload.requested_zones),
        vehicle_number=payload.vehicle_number,
        carrying_equipment=payload.carrying_equipment,
        equipment_description=payload.equipment_description,
        # Multi-person lists
        visitors_json=json.dumps(payload.visitors) if payload.visitors else None,
        vehicles_json=json.dumps(payload.vehicles) if payload.vehicles else None,
        # Metadata
        additional_notes=payload.additional_notes,
        request_source="internal",
        # Workflow state — DIRECTLY to pending_approval (no HOD step)
        status=RequestStatus.pending_approval,
        current_stage=ApprovalStage.operations_validation,
        submitted_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )

    db.add(visitor_req)
    db.commit()
    db.refresh(visitor_req)

    response_data = {
        "id": visitor_req.id,
        "request_id": visitor_req.request_id,
        "status": visitor_req.status.value,
        "requester_name": visitor_req.requester_name,
        "department_id": visitor_req.department_id,
        "department_name": visitor_req.department_name,
        "represented_hod_name": hod_name,
        "visitor_name": visitor_req.visitor_name,
        "visitor_purpose": visitor_req.visitor_purpose,
        "requested_date": visitor_req.requested_date.isoformat(),
        "requested_end_date": visitor_req.requested_end_date.isoformat(),
        "requested_zones": payload.requested_zones,
        "created_at": visitor_req.created_at.isoformat(),
    }

    # Audit log
    AuditService.log_action(
        db=db,
        action="REQUEST_CREATED",
        entity_type="visitor_request",
        entity_id=response_data["id"],
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        description=(
            f"Internal visitor request {request_id} created by coordinator "
            f"{current_user.username} for dept={dept_name}, HOD={hod_name}"
        ),
        metadata={
            "request_id": request_id,
            "coordinator_id": current_user.id,
            "coordinator_username": current_user.username,
            "department_id": dept_id,
            "department_name": dept_name,
            "represented_hod_id": hod_id,
            "represented_hod_name": hod_name,
            "visitor_name": payload.visitor_name,
        },
    )

    return response_data


@router.get(
    "/my-requests",
    summary="List coordinator's own internal requests",
    description="Lists all internal visitor requests created by the authenticated Coordinator.",
)
async def list_my_requests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_coordinator()),
    db: Session = Depends(get_db),
):
    """Return all internal requests submitted by this coordinator."""
    query = db.query(VisitorRequest).filter(
        VisitorRequest.request_source == "internal",
        VisitorRequest.department_id == current_user.department_id,
        VisitorRequest.requester_name == current_user.full_name,
    )
    total = query.count()
    items = (
        query.order_by(VisitorRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [
            {
                "id": r.id,
                "request_id": r.request_id,
                "status": r.status.value,
                "visitor_name": r.visitor_name,
                "visitor_purpose": r.visitor_purpose,
                "department_name": r.department_name,
                "requested_date": r.requested_date.isoformat() if r.requested_date else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "requested_zones": json.loads(r.requested_zones) if r.requested_zones else [],
            }
            for r in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
