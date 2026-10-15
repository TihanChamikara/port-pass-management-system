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
            "department_id": payload.department_id,
            "department_name": payload.department_name,
            "additional_notes": payload.additional_notes,
            "supporting_docs_urls": payload.supporting_docs_urls,
            "visitor_category": payload.visitor_category,
            "visitors": payload.visitors,
            "vehicles": payload.vehicles,
            "request_source": payload.request_source,
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

        # 3. Transition directly to PENDING_APPROVAL (ops officer queue).
        #    Department managers are CC'd and can view/comment on it, but it does not block review.
        target_state = RequestState.PENDING_APPROVAL
        transition_reason = (
            f"Request submitted (copied to {payload.department_name} department)"
            if payload.department_id
            else "Request submitted via public portal"
        )
        success, transition_error = WorkflowService.transition_state(
            db=db,
            request=visitor_req,
            target_state=target_state,
            actor=None,  # Public submission
            reason=transition_reason,
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

    # Build a human-readable current stage detail
    dept_name = visitor_req.department_name or "Unknown Department"
    current_stage_detail: Optional[str] = None
    if visitor_req.status.value == "pending_department_approval":
        current_stage_detail = f"Waiting for {dept_name} Manager Approval"
    elif visitor_req.status.value == "pending_approval":
        current_stage_detail = "Waiting for Operations Officer Review"
    elif visitor_req.status.value == "under_review":
        current_stage_detail = "Under Review by Operations Officer"
    elif visitor_req.status.value == "approved":
        current_stage_detail = "Approved — Pass Generation in Progress"
    elif visitor_req.status.value == "issued":
        current_stage_detail = "Pass Issued — Present NIC at Gate"
    elif visitor_req.status.value == "rejected":
        current_stage_detail = "Request Rejected"

    # Rejection metadata
    rejected_by_name: Optional[str] = None
    if visitor_req.rejection_reason and visitor_req.operations_officer_id:
        ops = db.query(User).filter(User.id == visitor_req.operations_officer_id).first()
        if ops:
            rejected_by_name = ops.full_name

    return PublicRequestStatusResponse(
        request_id=visitor_req.request_id,
        status=visitor_req.status.value,
        status_display=current_stage_detail or status_display,
        current_stage=visitor_req.current_stage.value,
        visitor_name=visitor_req.visitor_name,
        visitor_purpose=visitor_req.visitor_purpose,
        department_id=visitor_req.department_id,
        department_name=visitor_req.department_name,
        host_employee_name=visitor_req.host_employee_name,
        requested_zones=json.loads(visitor_req.requested_zones) if visitor_req.requested_zones else [],
        requested_date=visitor_req.requested_date,
        requested_end_date=visitor_req.requested_end_date,
        created_at=visitor_req.created_at,
        updated_at=visitor_req.updated_at,
        operations_comments=visitor_req.operations_comments,
        rejection_reason=visitor_req.rejection_reason,
        rejected_by=rejected_by_name,
        rejected_at=visitor_req.operations_reviewed_at if visitor_req.rejection_reason else None,
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

    # Check permissions (ops officer, pass officer, gate officer, admin can view)
    if current_user.role not in ["admin", "operations_officer", "pass_officer", "security_gate_officer"]:
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
        VisitorRequest.status.in_([RequestStatus.pending_approval, RequestStatus.pending_department_approval])
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

    # Step 1: Handle PENDING_DEPARTMENT_APPROVAL transition to PENDING_APPROVAL first
    current_state = WorkflowService._convert_db_status_to_state(visitor_req.status)
    if current_state == RequestState.PENDING_DEPARTMENT_APPROVAL:
        success, error_msg = WorkflowService.transition_state(
            db=db,
            request=visitor_req,
            target_state=RequestState.PENDING_APPROVAL,
            actor=current_user,
            reason=payload.comments or "Department approval granted by manager",
        )
        if not success:
            raise HTTPException(status_code=400, detail=error_msg)
        return WorkflowTransitionResponse(
            success=True,
            previous_state=current_state.value,
            current_state=visitor_req.status.value,
            timestamp=datetime.utcnow(),
            message="Department approval completed. Request forwarded to Operations."
        )

    # Step 2: If request is in PENDING_APPROVAL, move to UNDER_REVIEW first
    if current_state == RequestState.PENDING_APPROVAL:
        success, error_msg = WorkflowService.transition_state(
            db=db,
            request=visitor_req,
            target_state=RequestState.UNDER_REVIEW,
            actor=current_user,
        )
        if not success:
            raise HTTPException(status_code=400, detail=error_msg)
    
    # Step 3: Transition to APPROVED (or directly to ISSUED if VIP)
    final_target = RequestState.ISSUED if visitor_req.visitor_type == "vip" else RequestState.APPROVED
    success, error_msg = WorkflowService.transition_state(
        db=db,
        request=visitor_req,
        target_state=final_target,
        actor=current_user,
        reason=payload.comments,
    )

    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    # Override zones if provided
    if payload.zones_override:
        visitor_req.requested_zones = json.dumps(payload.zones_override)
        db.commit()

    if final_target == RequestState.ISSUED:
        # Auto-create PassRecord for VIP so they appear in Pass Management and are ready for gate
        from app.models.pass_record import PassRecord, PassType, Zone
        from app.services.pass_service import generate_pass_number
        import json
        
        zone = None
        if visitor_req.requested_zones:
            try:
                zones = json.loads(visitor_req.requested_zones)
                if zones and zones[0] in [z.value for z in Zone]:
                    zone = Zone(zones[0])
            except:
                pass
                
        pass_record = PassRecord(
            pass_no=generate_pass_number(),
            visitor_name=visitor_req.visitor_name,
            company_name=visitor_req.visitor_organization or "VIP Guest",
            nic_number=visitor_req.visitor_nic or "N/A",
            contact_number=visitor_req.visitor_phone or "N/A",
            pass_type=PassType.purple,  # Usually VIP gets purple/all zones
            zone=zone,
            allowed_zones=[1, 2, 3, 4],
            created_by=current_user.id
        )
        db.add(pass_record)
        db.flush()
        
        visitor_req.pass_record_id = pass_record.id
        db.commit()

    return WorkflowTransitionResponse(
        success=True,
        previous_state=current_state.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Request approved. Pass automatically issued for VIP." if visitor_req.visitor_type == "vip" else "Request approved and ready for pass generation"
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

    current_state = WorkflowService._convert_db_status_to_state(visitor_req.status)
    
    # Step 1: Handle PENDING_DEPARTMENT_APPROVAL transition to REJECTED first
    if current_state == RequestState.PENDING_DEPARTMENT_APPROVAL:
        success, error_msg = WorkflowService.transition_state(
            db=db,
            request=visitor_req,
            target_state=RequestState.REJECTED,
            actor=current_user,
            reason=payload.comments or "Rejected by Department Manager",
        )
        if not success:
            raise HTTPException(status_code=400, detail=error_msg)
        return WorkflowTransitionResponse(
            success=True,
            previous_state=current_state.value,
            current_state=visitor_req.status.value,
            timestamp=datetime.utcnow(),
            message="Request rejected by department manager"
        )

    # Step 2: If request is in PENDING_APPROVAL, move to UNDER_REVIEW first
    if current_state == RequestState.PENDING_APPROVAL:
        success, error_msg = WorkflowService.transition_state(
            db=db,
            request=visitor_req,
            target_state=RequestState.UNDER_REVIEW,
            actor=current_user,
        )
        if not success:
            raise HTTPException(status_code=400, detail=error_msg)
    
    # Step 3: Transition to REJECTED
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
    Pass Officer / Ops Officer: Issue pass.
    Transitions APPROVED → ISSUED
    """
    if current_user.role not in ["admin", "pass_officer", "operations_officer"]:
        raise HTTPException(status_code=403, detail="Not authorized to issue passes")

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
    description="Endpoint for approved requests ready to generate passes (filtered by role)",
)
async def get_requests_for_pass_generation(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "pass_officer", "operations_officer"]:
        raise HTTPException(status_code=403, detail="Not authorized to view requests ready for pass generation")

    query = db.query(VisitorRequest).filter(VisitorRequest.status == RequestStatus.approved)
    
    # Pass officers manage normal passes, Operations officers can see all
    if current_user.role == "pass_officer":
        query = query.filter(VisitorRequest.visitor_type != "vip")
    total = query.count()
    items = query.order_by(VisitorRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

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
    if current_user.role not in ["admin", "pass_officer", "operations_officer"]:
        raise HTTPException(status_code=403, detail="Not authorized to issue passes")

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


# ============================================================================
# DEPARTMENT MANAGER ENDPOINTS
# ============================================================================

@router.get(
    "/for-dept-manager",
    summary="List requests for department manager",
    description="Get requests pending department manager approval",
)
async def get_requests_for_dept_manager(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Department Manager: List requests pending approval for their department."""
    if current_user.role not in ["admin", "department_manager"]:
        raise HTTPException(status_code=403, detail="Only department managers can view these requests")

    # Show requests in PENDING_APPROVAL or UNDER_REVIEW status that this department manager hasn't reviewed yet
    query = db.query(VisitorRequest).filter(
        VisitorRequest.status.in_([RequestStatus.pending_approval, RequestStatus.under_review]),
        VisitorRequest.dept_reviewed_at == None
    )
    # If the user has a department_id, filter to their department only (not admin)
    if current_user.role == "department_manager" and current_user.department_id:
        query = query.filter(VisitorRequest.department_id == current_user.department_id)

    total = query.count()
    items = query.order_by(VisitorRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [PublicVisitorRequestResponse.model_validate(item, from_attributes=True) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post(
    "/{request_id}/dept-approve",
    response_model=WorkflowTransitionResponse,
    summary="Department Manager Approve",
    description="Department manager approves and forwards to operations",
)
async def dept_manager_approve(
    request_id: int,
    payload: RequestOperationsApproval,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Department Manager: Approve request, forwarding it to Operations Officer."""
    if current_user.role not in ["admin", "department_manager"]:
        raise HTTPException(status_code=403, detail="Only department managers can approve at this stage")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    if visitor_req.status not in [RequestStatus.pending_approval, RequestStatus.under_review]:
        raise HTTPException(status_code=400, detail=f"Request is not in a pending review state (current: {visitor_req.status.value})")

    # Record department manager action
    visitor_req.dept_manager_id = current_user.id
    visitor_req.dept_reviewed_at = datetime.utcnow()
    visitor_req.dept_comments = f"Accepted: {payload.comments}" if payload.comments else "Accepted by Department Manager"

    db.commit()
    db.refresh(visitor_req)

    # Log action
    from app.services.audit_service import AuditService
    AuditService.log_action(
        db=db,
        action="DEPARTMENT_ACCEPTED",
        entity_type="visitor_request",
        entity_id=visitor_req.id,
        actor_id=current_user.id,
        actor_name=current_user.username,
        description=f"Request {visitor_req.request_id} accepted by department manager",
        metadata={
            "request_id": visitor_req.request_id,
            "comments": visitor_req.dept_comments,
        }
    )

    return WorkflowTransitionResponse(
        success=True,
        previous_state=visitor_req.status.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Request accepted by department manager",
    )


@router.post(
    "/{request_id}/dept-reject",
    response_model=WorkflowTransitionResponse,
    summary="Department Manager Reject",
    description="Department manager rejects the request",
)
async def dept_manager_reject(
    request_id: int,
    payload: RequestOperationsApproval,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Department Manager: Reject the request."""
    if current_user.role not in ["admin", "department_manager"]:
        raise HTTPException(status_code=403, detail="Only department managers can reject at this stage")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    if visitor_req.status not in [RequestStatus.pending_approval, RequestStatus.under_review]:
        raise HTTPException(status_code=400, detail=f"Request is not in a pending review state (current: {visitor_req.status.value})")

    visitor_req.dept_manager_id = current_user.id
    visitor_req.dept_reviewed_at = datetime.utcnow()
    visitor_req.dept_comments = f"Declined: {payload.comments}" if payload.comments else "Declined by Department Manager"

    db.commit()
    db.refresh(visitor_req)

    # Log action
    from app.services.audit_service import AuditService
    AuditService.log_action(
        db=db,
        action="DEPARTMENT_DECLINED",
        entity_type="visitor_request",
        entity_id=visitor_req.id,
        actor_id=current_user.id,
        actor_name=current_user.username,
        description=f"Request {visitor_req.request_id} declined by department manager",
        metadata={
            "request_id": visitor_req.request_id,
            "comments": visitor_req.dept_comments,
        }
    )

    return WorkflowTransitionResponse(
        success=True,
        previous_state=visitor_req.status.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Request declined by department manager",
    )


# ============================================================================
# GATE OFFICER: PASS RETURN
# ============================================================================

@router.post(
    "/{request_id}/return-pass",
    response_model=WorkflowTransitionResponse,
    summary="Record physical pass return (Gate Officer)",
    description="Gate officer marks the physical pass as returned at exit",
)
async def return_pass(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gate Officer: Record that the physical pass was returned."""
    if current_user.role not in ["admin", "security_gate_officer"]:
        raise HTTPException(status_code=403, detail="Only gate officers can record pass returns")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    if visitor_req.status not in [RequestStatus.checked_out]:
        raise HTTPException(status_code=400, detail="Pass can only be returned after visitor has checked out")

    visitor_req.pass_returned = True
    db.commit()

    return WorkflowTransitionResponse(
        success=True,
        previous_state=visitor_req.status.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Physical pass recorded as returned",
    )


# ============================================================================
# SCR / OPERATIONS OFFICER: RECORD CLOSURE & VISITOR TYPE
# ============================================================================

@router.post(
    "/{request_id}/close-record",
    response_model=WorkflowTransitionResponse,
    summary="Close visitor record (SCR/Operations)",
    description="Operations officer formally closes the visitor record after visit completion",
)
async def close_record(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """SCR/Operations Officer: Formally close the visitor record."""
    if current_user.role not in ["admin", "operations_officer"]:
        raise HTTPException(status_code=403, detail="Only operations officers can close records")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    if visitor_req.status not in [RequestStatus.checked_out]:
        raise HTTPException(status_code=400, detail="Record can only be closed after visitor checkout")

    visitor_req.record_closed_by_id = current_user.id
    visitor_req.record_closed_at = datetime.utcnow()
    db.commit()

    return WorkflowTransitionResponse(
        success=True,
        previous_state=visitor_req.status.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message="Visitor record officially closed",
    )


@router.patch(
    "/{request_id}/visitor-type",
    response_model=WorkflowTransitionResponse,
    summary="Set visitor type (Operations Officer)",
    description="Operations officer classifies visitor as Normal or VIP",
)
async def set_visitor_type(
    request_id: int,
    visitor_type: str = Query(..., regex="^(normal|vip)$"),
    vip_lmv_access: Optional[str] = Query(None, regex="^(lmv1|lmv2|both)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Operations Officer: Set visitor classification (Normal/VIP)."""
    if current_user.role not in ["admin", "operations_officer"]:
        raise HTTPException(status_code=403, detail="Only operations officers can classify visitors")

    visitor_req = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()
    if not visitor_req:
        raise HTTPException(status_code=404, detail="Request not found")

    visitor_req.visitor_type = visitor_type
    if visitor_type == "vip":
        visitor_req.vip_lmv_access = vip_lmv_access
    else:
        visitor_req.vip_lmv_access = None
    db.commit()

    return WorkflowTransitionResponse(
        success=True,
        previous_state=visitor_req.status.value,
        current_state=visitor_req.status.value,
        timestamp=datetime.utcnow(),
        message=f"Visitor classified as {visitor_type.upper()}",
    )


# ============================================================================
# SCR MONITORING: ALL REQUESTS
# ============================================================================

@router.get(
    "/all",
    summary="List all requests (SCR/Operations monitoring)",
    description="Get all visitor requests with optional status filter for SCR dashboard",
)
async def list_all_requests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Operations/Admin: View all visitor requests for SCR monitoring."""
    if current_user.role not in ["admin", "operations_officer"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = db.query(VisitorRequest)
    if status_filter:
        try:
            query = query.filter(VisitorRequest.status == RequestStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    total = query.count()
    items = query.order_by(VisitorRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [PublicVisitorRequestResponse.model_validate(item, from_attributes=True) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
