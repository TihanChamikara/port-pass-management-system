"""
Public Request Portal API Routes

Endpoints for public visitor pass request submission, validation, tracking, and workflow state management.
No authentication required for submission and public tracking.
"""

import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.core.workflow import RequestState, WorkflowStateMachine
from app.models import User, VisitorRequest
from app.models.visitor_request import RequestStatus
from app.schemas.visitor_request_v2 import (
    PublicVisitorRequestCreate,
    PublicVisitorRequestResponse,
    PublicRequestStatusTrack,
    PublicRequestStatusResponse,
    RequestListResponse,
    RequestValidationResponse,
    RequestValidationError,
    RequestFullDetails,
    WorkflowTransitionRequest,
    WorkflowTransitionResponse,
    RequestOperationsApproval,
    RequestPassIssuing,
    RequestCheckIn,
    RequestCheckOut,
)
from app.services.request_validator import PublicRequestValidator, ValidationErrorType
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/api/visitor-requests", tags=["visitor-requests"])


# ============================================================================
# PUBLIC REQUEST SUBMISSION (NO AUTH REQUIRED)
# ============================================================================

@router.post(
    "/submit",
    response_model=PublicVisitorRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit visitor pass request",
    description="Public submission: No authentication required. Submit visitor pass request for approval.",
)
async def submit_visitor_request(
    payload: PublicVisitorRequestCreate,
    db: Session = Depends(get_db),
):
    """
    Submit a new public visitor pass request.

    **Flow:**
    1. Validate all form fields
    2. Check for duplicates, blacklist, time conflicts
    3. Create request in DRAFT state
    4. Transition to PENDING_APPROVAL
    5. Send notifications to operations officers
    6. Return request ID for tracking

    **Validation checks:**
    - NIC/Passport format
    - Phone/email validation
    - Date range validation (future dates only, max 30 days)
    - Duplicate request detection
    - Blacklist check
    - Zone validation
    - Time conflict detection
    """
    try:
        # Extract nested data
        visitor_data = payload.visitor
        visit_data = payload.visit
        access_data = payload.access

        # 1. Comprehensive validation
        is_valid, validation_errors = PublicRequestValidator.validate_public_request(
            db=db,
            visitor_name=visitor_data.name,
            visitor_email=visitor_data.email,
            requester_email=payload.requester_email,
            requested_date=visit_data.entry_time,
            requested_end_date=visit_data.exit_time,
            zones=access_data.requested_zones,
            nic_or_passport=visitor_data.nic_passport,
            phone=visitor_data.phone,
            host_employee_id=visit_data.host_employee_id,
        )

        if not is_valid:
            error_responses = [
                RequestValidationError(
                    error_type=e.error_type.value,
                    message=e.message,
                    field=e.field,
                    details=e.details,
                )
                for e in validation_errors
            ]
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "errors": [e.dict() for e in error_responses],
                    "message": "Request validation failed",
                }
            )

        # 2. Create request in DRAFT state
        request_data = {
            "requester_name": payload.requester_name,
            "requester_email": payload.requester_email,
            "requester_phone": payload.requester_phone,
            "visitor": visitor_data.dict(),
            "visit": visit_data.dict(),
            "access": access_data.dict(),
            "additional_notes": payload.additional_notes,
            "supporting_docs_urls": payload.supporting_docs_urls,
        }

        success, visitor_req, error_msg = WorkflowService.submit_visitor_request(
            db=db,
            request_data=request_data,
            requester_email=payload.requester_email,
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create request: {error_msg}"
            )

        # 3. Transition to PENDING_APPROVAL
        success, transition_error = WorkflowService.transition_state(
            db=db,
            request=visitor_req,
            target_state=RequestState.PENDING_APPROVAL,
            actor=None,  # Public submission
            reason="Request submitted via public portal",
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to submit request: {transition_error}"
            )

        return PublicVisitorRequestResponse.from_orm(visitor_req)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


# ============================================================================
# REQUEST VALIDATION (NO AUTH REQUIRED)
# ============================================================================

@router.post(
    "/validate",
    response_model=RequestValidationResponse,
    summary="Validate request data",
    description="Validate visitor request data without submitting",
)
async def validate_request_data(
    payload: PublicVisitorRequestCreate,
    db: Session = Depends(get_db),
):
    """
    Validate request data without submitting.
    Useful for frontend validation before final submission.
    """
    visitor_data = payload.visitor
    visit_data = payload.visit
    access_data = payload.access

    is_valid, validation_errors = PublicRequestValidator.validate_public_request(
        db=db,
        visitor_name=visitor_data.name,
        visitor_email=visitor_data.email,
        requester_email=payload.requester_email,
        requested_date=visit_data.entry_time,
        requested_end_date=visit_data.exit_time,
        zones=access_data.requested_zones,
        nic_or_passport=visitor_data.nic_passport,
        phone=visitor_data.phone,
        host_employee_id=visit_data.host_employee_id,
    )

    errors = [
        RequestValidationError(
            error_type=e.error_type.value,
            message=e.message,
            field=e.field,
            details=e.details,
        )
        for e in validation_errors
    ]

    return RequestValidationResponse(is_valid=is_valid, errors=errors)


# ============================================================================
# REQUEST TRACKING (NO AUTH REQUIRED)
# ============================================================================

@router.post(
    "/track",
    response_model=PublicRequestStatusResponse,
    summary="Track request status",
    description="Check status of submitted request using Request ID and email",
)
async def track_request_status(
    payload: PublicRequestStatusTrack,
    db: Session = Depends(get_db),
):
    """
    Public tracking: No authentication required.
    Track request status using Request ID and requester email.
    """
    visitor_req = db.query(VisitorRequest).filter(
        VisitorRequest.request_id == payload.request_id,
        VisitorRequest.requester_email == payload.requester_email,
    ).first()

    if not visitor_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    # Map status to display name
    status_display = WorkflowStateMachine.get_state_display_name(
        WorkflowService._convert_db_status_to_state(visitor_req.status)
    )

    return PublicRequestStatusResponse(
        request_id=visitor_req.request_id,
        status=visitor_req.status.value,
        status_display=status_display,
        current_stage=visitor_req.current_stage.value,
        visitor_name=visitor_req.visitor_name,
        visitor_purpose=visitor_req.visitor_purpose,
        requested_zones=json.loads(visitor_req.requested_zones) if visitor_req.requested_zones else [],
        requested_date=visitor_req.requested_date,
        requested_end_date=visitor_req.requested_end_date,
        created_at=visitor_req.created_at,
        updated_at=visitor_req.updated_at,
        operations_comments=visitor_req.operations_comments,
        rejection_reason=visitor_req.rejection_reason,
        pass_issued_at=visitor_req.pass_issued_at,
        checked_in_at=visitor_req.checked_in_at,
        checked_out_at=visitor_req.checked_out_at,
        pass_record_id=visitor_req.pass_record_id,
    )


# ============================================================================
# AUTHENTICATED WORKFLOW OPERATIONS
# ============================================================================

@router.get(
    "/{request_id}/full",
    response_model=RequestFullDetails,
    summary="Get full request details",
    description="Get complete request details with full audit history (authenticated users only)",
)
async def get_request_full_details(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get complete request details with audit history."""
    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()

    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check permissions (ops officer, pass officer, admin can view)
    if current_user.role not in ["admin", "operations_officer", "pass_officer"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")

    return RequestFullDetails.from_orm(visitor_req)


@router.get(
    "/pending",
    summary="List pending requests for operations officers",
    description="Get requests awaiting operations officer approval (authenticated users only)",
)
async def list_pending_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List requests in PENDING_APPROVAL state for operations officer review."""
    # Check authorization: only ops officers and admins can view pending requests
    if current_user.role not in ["admin", "operations_officer"]:
        raise HTTPException(status_code=403, detail="Not authorized to view pending requests")

    # Query pending requests
    query = db.query(VisitorRequest).filter(
        VisitorRequest.status == RequestStatus.pending_approval
    )
    total = query.count()
    items = query.order_by(VisitorRequest.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return {
        "items": [PublicVisitorRequestResponse.from_orm(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post(
    "/{request_id}/transition",
    response_model=WorkflowTransitionResponse,
    summary="Transition request state",
    description="Perform formal state transition (authenticated users only)",
)
async def transition_request_state(
    request_id: int,
    payload: WorkflowTransitionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Perform state transition with full validation.
    Must have appropriate role for target state transition.
    """
    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()

    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    try:
        target_state = RequestState(payload.target_state)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid state: {payload.target_state}")

    # Perform transition
    success, error_msg = WorkflowService.transition_state(
        db=db,
        request=visitor_req,
        target_state=target_state,
        actor=current_user,
        reason=payload.reason,
        metadata=payload.metadata,
    )

    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    return WorkflowTransitionResponse(
        success=True,
        previous_state=WorkflowService._convert_db_status_to_state(visitor_req.status).value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message=f"Transitioned to {visitor_req.status.value}"
    )


@router.post(
    "/{request_id}/approve",
    response_model=WorkflowTransitionResponse,
    summary="Approve request (Operations Officer)",
    description="Approve visitor request for pass generation",
)
async def approve_request(
    request_id: int,
    payload: RequestOperationsApproval,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Operations Officer: Approve request.
    Handles transitions: PENDING_APPROVAL → UNDER_REVIEW → APPROVED
    """
    if current_user.role not in ["admin", "operations_officer"]:
        raise HTTPException(status_code=403, detail="Only operations officers can approve requests")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Step 1: If request is in PENDING_APPROVAL, move to UNDER_REVIEW first
    current_state = WorkflowService._convert_db_status_to_state(visitor_req.status)
    if current_state == RequestState.PENDING_APPROVAL:
        success, error_msg = WorkflowService.transition_state(
            db=db,
            request=visitor_req,
            target_state=RequestState.UNDER_REVIEW,
            actor=current_user,
        )
        if not success:
            raise HTTPException(status_code=400, detail=error_msg)
    
    # Step 2: Transition to APPROVED
    success, error_msg = WorkflowService.transition_state(
        db=db,
        request=visitor_req,
        target_state=RequestState.APPROVED,
        actor=current_user,
        reason=payload.comments,
    )

    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    # Override zones if provided
    if payload.zones_override:
        visitor_req.requested_zones = json.dumps(payload.zones_override)
        db.commit()

    return WorkflowTransitionResponse(
        success=True,
        previous_state=current_state.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Request approved and ready for pass generation"
    )


@router.post(
    "/{request_id}/reject",
    response_model=WorkflowTransitionResponse,
    summary="Reject request (Operations Officer)",
    description="Reject visitor request",
)
async def reject_request(
    request_id: int,
    payload: RequestOperationsApproval,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Operations Officer: Reject request.
    Handles transitions: PENDING_APPROVAL → UNDER_REVIEW → REJECTED
    """
    if current_user.role not in ["admin", "operations_officer"]:
        raise HTTPException(status_code=403, detail="Only operations officers can reject requests")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Step 1: If request is in PENDING_APPROVAL, move to UNDER_REVIEW first
    current_state = WorkflowService._convert_db_status_to_state(visitor_req.status)
    if current_state == RequestState.PENDING_APPROVAL:
        success, error_msg = WorkflowService.transition_state(
            db=db,
            request=visitor_req,
            target_state=RequestState.UNDER_REVIEW,
            actor=current_user,
        )
        if not success:
            raise HTTPException(status_code=400, detail=error_msg)
    
    # Step 2: Transition to REJECTED
    success, error_msg = WorkflowService.transition_state(
        db=db,
        request=visitor_req,
        target_state=RequestState.REJECTED,
        actor=current_user,
        reason=payload.comments or "No reason provided",
    )

    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    return WorkflowTransitionResponse(
        success=True,
        previous_state=current_state.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Request rejected"
    )


@router.post(
    "/{request_id}/issue-pass",
    response_model=WorkflowTransitionResponse,
    summary="Issue pass (Pass Officer)",
    description="Issue pass after request approval",
)
async def issue_pass(
    request_id: int,
    payload: RequestPassIssuing,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Pass Officer: Issue pass.
    Transitions APPROVED → ISSUED
    """
    if current_user.role not in ["admin", "pass_officer"]:
        raise HTTPException(status_code=403, detail="Only pass officers can issue passes")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Transition to ISSUED
    success, error_msg = WorkflowService.transition_state(
        db=db,
        request=visitor_req,
        target_state=RequestState.ISSUED,
        actor=current_user,
        reason=payload.issued_reason,
        metadata={"pass_record_id": payload.pass_record_id}
    )

    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    # Link pass record
    visitor_req.pass_record_id = payload.pass_record_id
    db.commit()

    return WorkflowTransitionResponse(
        success=True,
        previous_state=RequestStatus.approved.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Pass issued"
    )


@router.get(
    "/for-pass-generation",
    response_model=RequestListResponse,
    summary="List requests ready for pass generation",
    description="Pass officer endpoint for approved requests ready to generate passes",
)
async def get_requests_for_pass_generation(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "pass_officer"]:
        raise HTTPException(status_code=403, detail="Only pass officers can view requests ready for pass generation")

    query = db.query(VisitorRequest).filter(VisitorRequest.status == RequestStatus.approved)
    total = query.count()
    items = query.order_by(VisitorRequest.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()

    return RequestListResponse(
        items=[PublicVisitorRequestResponse.model_validate(item, from_attributes=True) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/{request_id}/mark-pass-issued",
    response_model=PublicVisitorRequestResponse,
    summary="Mark pass as issued (compatibility alias)",
    description="Compatibility endpoint for the frontend pass generation page",
)
async def mark_pass_issued_compat(
    request_id: int,
    pass_record_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "pass_officer"]:
        raise HTTPException(status_code=403, detail="Only pass officers can issue passes")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    success, error_msg = WorkflowService.transition_state(
        db=db,
        request=visitor_req,
        target_state=RequestState.ISSUED,
        actor=current_user,
        reason="Pass generated",
        metadata={"pass_record_id": pass_record_id},
    )

    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    visitor_req.pass_record_id = pass_record_id
    db.commit()
    db.refresh(visitor_req)
    return PublicVisitorRequestResponse.model_validate(visitor_req, from_attributes=True)


@router.post(
    "/{request_id}/check-in",
    response_model=WorkflowTransitionResponse,
    summary="Check visitor in (Gate Officer)",
    description="Record visitor entry scan",
)
async def check_in_visitor(
    request_id: int,
    payload: RequestCheckIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gate Officer: Check visitor in."""
    if current_user.role not in ["admin", "security_gate_officer"]:
        raise HTTPException(status_code=403, detail="Only gate officers can check in visitors")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Transition to CHECKED_IN
    success, error_msg = WorkflowService.transition_state(
        db=db,
        request=visitor_req,
        target_state=RequestState.CHECKED_IN,
        actor=current_user,
        reason=payload.check_in_notes,
    )

    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    return WorkflowTransitionResponse(
        success=True,
        previous_state=RequestStatus.issued.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Visitor checked in"
    )


@router.post(
    "/{request_id}/check-out",
    response_model=WorkflowTransitionResponse,
    summary="Check visitor out (Gate Officer)",
    description="Record visitor exit scan",
)
async def check_out_visitor(
    request_id: int,
    payload: RequestCheckOut,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gate Officer: Check visitor out."""
    if current_user.role not in ["admin", "security_gate_officer"]:
        raise HTTPException(status_code=403, detail="Only gate officers can check out visitors")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Transition to CHECKED_OUT
    success, error_msg = WorkflowService.transition_state(
        db=db,
        request=visitor_req,
        target_state=RequestState.CHECKED_OUT,
        actor=current_user,
        reason=payload.check_out_notes,
    )

    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    return WorkflowTransitionResponse(
        success=True,
        previous_state=RequestStatus.checked_in.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Visitor checked out"
    )
