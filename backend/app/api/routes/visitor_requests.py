"""
Visitor Request Routes: Public submission + multi-stage approval workflow.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import User, UserRole
from app.schemas.visitor_request import (
    VisitorRequestCreate,
    VisitorRequestResponse,
    VisitorRequestStatusCheck,
    VisitorRequestApprovalPayload,
    VisitorRequestListResponse,
)
from app.services import visitor_request_service
from app.services.audit_service import log_action
from app.models.audit_log import AuditActionType, AuditEntityType

router = APIRouter(prefix="/visitor-requests", tags=["Visitor Requests"])


@router.post("/submit", response_model=VisitorRequestResponse)
def submit_visitor_request(
    payload: VisitorRequestCreate,
    db: Session = Depends(get_db),
) -> VisitorRequestResponse:
    """
    PUBLIC ENDPOINT (no auth required): Public requester submits a visitor pass request.
    Returns: Request ID for tracking status.
    """
    req = visitor_request_service.create_visitor_request(db, payload)
    return VisitorRequestResponse.model_validate(req, from_attributes=True)


@router.post("/track", response_model=VisitorRequestResponse)
def track_request_status(
    payload: VisitorRequestStatusCheck,
    db: Session = Depends(get_db),
) -> VisitorRequestResponse:
    """
    PUBLIC ENDPOINT (no auth required): Track request status using request_id + requester email.
    """
    req = visitor_request_service.get_request_by_id(db, payload.request_id, payload.requester_email)
    return VisitorRequestResponse.model_validate(req, from_attributes=True)


@router.get("/pending", response_model=VisitorRequestListResponse)
def list_pending_requests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisitorRequestListResponse:
    """
    OPERATIONS OFFICER: List visitor requests pending their approval.
    Role check: operations_officer or admin.
    """
    if current_user.role not in (UserRole.operations_officer, UserRole.admin):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    items, total = visitor_request_service.list_pending_requests(db, page, page_size)

    return VisitorRequestListResponse(
        items=[VisitorRequestResponse.model_validate(item, from_attributes=True) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{request_id}/approve-or-reject", response_model=VisitorRequestResponse)
def approve_or_reject_request(
    request_id: int,
    payload: VisitorRequestApprovalPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisitorRequestResponse:
    """
    OPERATIONS OFFICER: Approve or reject a visitor request.
    Moves request to pass generation stage if approved.
    """
    if current_user.role not in (UserRole.operations_officer, UserRole.admin):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    req = visitor_request_service.approve_or_reject_request(
        db, request_id, current_user, payload
    )

    # Audit log
    log_action(
        db,
        current_user.id,
        AuditActionType.update,
        AuditEntityType.request,
        request_id,
        f"Request {'approved' if payload.approved else 'rejected'} by operations officer",
    )

    return VisitorRequestResponse.model_validate(req, from_attributes=True)


@router.get("/for-pass-generation", response_model=VisitorRequestListResponse)
def get_requests_for_pass_generation(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisitorRequestListResponse:
    """
    PASS OFFICER: List approved requests ready for pass generation.
    Role check: pass_officer or admin.
    """
    if current_user.role not in (UserRole.pass_officer, UserRole.admin):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    items, total = visitor_request_service.get_requests_ready_for_pass_generation(db, page, page_size)

    return VisitorRequestListResponse(
        items=[VisitorRequestResponse.model_validate(item, from_attributes=True) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{request_id}/mark-pass-issued", response_model=VisitorRequestResponse)
def mark_pass_issued(
    request_id: int,
    pass_record_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisitorRequestResponse:
    """
    PASS OFFICER: Mark pass as issued (QR badge generated).
    Links visitor request to pass record.
    """
    if current_user.role not in (UserRole.pass_officer, UserRole.admin):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    req = visitor_request_service.mark_pass_issued(db, request_id, current_user, pass_record_id)

    # Audit log
    log_action(
        db,
        current_user.id,
        AuditActionType.create,
        AuditEntityType.pass_record,
        pass_record_id,
        f"Pass issued for visitor request {request_id}",
    )

    return VisitorRequestResponse.model_validate(req, from_attributes=True)
