"""
Visitor Request Service: Business logic for multi-stage approval workflow.
"""

import json
import secrets
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import VisitorRequest, RequestStatus, ApprovalStage, User, PassRecord, UserRole
from app.schemas.visitor_request import VisitorRequestCreate, VisitorRequestApprovalPayload


def generate_request_id() -> str:
    """Generate human-readable request ID: REQ-YYYYMMDD-XXXX."""
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    rand_str = secrets.token_hex(2).upper()
    return f"REQ-{date_str}-{rand_str}"


def create_visitor_request(db: Session, payload: VisitorRequestCreate) -> VisitorRequest:
    """
    Public requester: Submit a new visitor pass request.
    Initial status: submitted → pending_operations_review
    """
    request_id = generate_request_id()
    zones_json = json.dumps(payload.requested_zones)

    visitor_req = VisitorRequest(
        request_id=request_id,
        requester_name=payload.requester_name,
        requester_email=payload.requester_email,
        requester_phone=payload.requester_phone,
        visitor_name=payload.visitor_name,
        visitor_email=payload.visitor_email,
        visitor_purpose=payload.visitor_purpose,
        visitor_organization=payload.visitor_organization,
        requested_zones=zones_json,
        requested_date=payload.requested_date,
        requested_end_date=payload.requested_end_date,
        expected_duration_minutes=payload.expected_duration_minutes,
        status=RequestStatus.submitted,
        current_stage=ApprovalStage.initial_submission,
        submitted_at=datetime.utcnow(),
    )

    db.add(visitor_req)
    db.commit()
    db.refresh(visitor_req)

    # TODO: Send notification to requester: "Request submitted successfully"
    # TODO: Send notification to operations officers: "New request awaiting review"

    return visitor_req


def list_pending_requests(db: Session, page: int = 1, page_size: int = 20) -> tuple[list[VisitorRequest], int]:
    """Operations Officer: List pending requests awaiting their approval."""
    query = db.query(VisitorRequest).filter(
        VisitorRequest.status == RequestStatus.pending_operations_review
    )
    total = query.count()
    items = query.order_by(VisitorRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_request_by_id(db: Session, request_id: str, requester_email: str) -> VisitorRequest:
    """
    Public requester: Track request status using request_id + email (no auth).
    """
    req = db.query(VisitorRequest).filter(
        VisitorRequest.request_id == request_id,
        VisitorRequest.requester_email == requester_email
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    return req


def approve_or_reject_request(
    db: Session,
    request_id: int,
    operations_officer: User,
    payload: VisitorRequestApprovalPayload
) -> VisitorRequest:
    """
    Operations Officer: Approve or reject a visitor request.
    Transitions request through approval workflow.
    """
    req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != RequestStatus.pending_operations_review:
        raise HTTPException(status_code=400, detail=f"Request already processed: {req.status}")

    # Record approval decision
    req.operations_officer_id = operations_officer.id
    req.operations_reviewed_at = datetime.utcnow()
    req.operations_comments = payload.comments
    req.operations_approved = payload.approved

    if payload.approved:
        # Approve: move to pass generation stage
        req.status = RequestStatus.operations_approved
        req.current_stage = ApprovalStage.pass_generation
        # TODO: Send notification to requester: "Your request approved by operations"
        # TODO: Send notification to pass officers: "Ready for pass generation"
    else:
        # Reject: final status
        req.status = RequestStatus.operations_rejected
        req.current_stage = ApprovalStage.initial_submission
        # TODO: Send notification to requester: "Your request was rejected"

    # Override zones if specified
    if payload.requested_zones_override:
        req.requested_zones = json.dumps(payload.requested_zones_override)

    db.commit()
    db.refresh(req)

    return req


def get_requests_ready_for_pass_generation(db: Session, page: int = 1, page_size: int = 20) -> tuple[list[VisitorRequest], int]:
    """Pass Officer: List requests ready for pass generation."""
    query = db.query(VisitorRequest).filter(
        VisitorRequest.status == RequestStatus.operations_approved
    )
    total = query.count()
    items = query.order_by(VisitorRequest.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def mark_pass_issued(
    db: Session,
    request_id: int,
    pass_officer: User,
    pass_record_id: int
) -> VisitorRequest:
    """
    Pass Officer: Mark pass as issued (after generating QR/badge).
    """
    req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != RequestStatus.operations_approved:
        raise HTTPException(status_code=400, detail=f"Request cannot have pass issued: {req.status}")

    req.status = RequestStatus.pass_issued
    req.current_stage = ApprovalStage.access_verification
    req.pass_officer_id = pass_officer.id
    req.pass_issued_at = datetime.utcnow()
    req.pass_record_id = pass_record_id

    db.commit()
    db.refresh(req)

    # TODO: Send notification to requester: "Your pass is ready"
    # TODO: Send notification to gate officers: "New visitor pass ready"

    return req


def get_request_status(db: Session, request_id: int) -> dict:
    """Get detailed status of a visitor request."""
    req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    return {
        "request_id": req.request_id,
        "status": req.status.value,
        "current_stage": req.current_stage.value,
        "visitor_name": req.visitor_name,
        "requested_date": req.requested_date,
        "operations_comments": req.operations_comments,
        "pass_issued_at": req.pass_issued_at,
        "created_at": req.created_at,
    }
