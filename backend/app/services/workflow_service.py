"""
Workflow Service: Manages state transitions, validation, audit logging, and notifications.

Core business logic for the formal workflow state machine.
"""

import json
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.core.workflow import WorkflowStateMachine, RequestState, UserRole
from app.models import VisitorRequest, User, AuditLog
from app.models.visitor_request import RequestStatus, ApprovalStage
from app.services.request_validator import PublicRequestValidator, ValidationError
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


class WorkflowService:
    """Manages formal workflow state machine for visitor requests."""

    @staticmethod
    def _get_user_role(user: User) -> UserRole:
        """Map database user role to workflow UserRole."""
        role_map = {
            "admin": UserRole.ADMIN,
            "operations_officer": UserRole.OPERATIONS_OFFICER,
            "pass_officer": UserRole.PASS_OFFICER,
            "security_gate_officer": UserRole.SECURITY_GATE_OFFICER,
            "public_requester": UserRole.PUBLIC_REQUESTER,
            "department_manager": UserRole.DEPARTMENT_MANAGER,
        }
        return role_map.get(user.role, UserRole.PUBLIC_REQUESTER)

    @staticmethod
    def _convert_db_status_to_state(status: RequestStatus) -> RequestState:
        """Convert database RequestStatus to workflow RequestState."""
        status_map = {
            RequestStatus.draft: RequestState.DRAFT,
            RequestStatus.pending_department_approval: RequestState.PENDING_DEPARTMENT_APPROVAL,
            RequestStatus.pending_approval: RequestState.PENDING_APPROVAL,
            RequestStatus.under_review: RequestState.UNDER_REVIEW,
            RequestStatus.approved: RequestState.APPROVED,
            RequestStatus.rejected: RequestState.REJECTED,
            RequestStatus.issued: RequestState.ISSUED,
            RequestStatus.checked_in: RequestState.CHECKED_IN,
            RequestStatus.checked_out: RequestState.CHECKED_OUT,
            RequestStatus.expired: RequestState.EXPIRED,
            RequestStatus.cancelled: RequestState.CANCELLED,
        }
        return status_map.get(status, RequestState.DRAFT)

    @staticmethod
    def _convert_state_to_db_status(state: RequestState) -> RequestStatus:
        """Convert workflow RequestState to database RequestStatus."""
        state_map = {
            RequestState.DRAFT: RequestStatus.draft,
            RequestState.PENDING_DEPARTMENT_APPROVAL: RequestStatus.pending_department_approval,
            RequestState.PENDING_APPROVAL: RequestStatus.pending_approval,
            RequestState.UNDER_REVIEW: RequestStatus.under_review,
            RequestState.APPROVED: RequestStatus.approved,
            RequestState.REJECTED: RequestStatus.rejected,
            RequestState.ISSUED: RequestStatus.issued,
            RequestState.CHECKED_IN: RequestStatus.checked_in,
            RequestState.CHECKED_OUT: RequestStatus.checked_out,
            RequestState.EXPIRED: RequestStatus.expired,
            RequestState.CANCELLED: RequestStatus.cancelled,
        }
        return state_map[state]

    @staticmethod
    def submit_visitor_request(
        db: Session,
        request_data: Dict[str, Any],
        requester_email: str,
        validation_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, VisitorRequest, Optional[str]]:
        """
        Create a new visitor request in DRAFT state.
        Perform comprehensive validation before transition to PENDING_APPROVAL.

        Returns: (success, request, error_message)
        """
        try:
            # Generate request ID
            request_id = WorkflowService._generate_request_id()

            # Prepare request data
            zones_json = json.dumps(request_data.get("access", {}).get("requested_zones", []))

            visitor_req = VisitorRequest(
                request_id=request_id,
                requester_name=request_data.get("requester_name"),
                requester_email=request_data.get("requester_email"),
                requester_phone=request_data.get("requester_phone"),
                visitor_name=request_data.get("visitor", {}).get("name"),
                visitor_email=request_data.get("visitor", {}).get("email"),
                visitor_phone=request_data.get("visitor", {}).get("phone"),
                visitor_nic=request_data.get("visitor", {}).get("nic_passport"),
                visitor_organization=request_data.get("visitor", {}).get("organization"),
                visitor_photo_url=request_data.get("visitor", {}).get("photo_url"),
                visitor_purpose=request_data.get("visit", {}).get("purpose"),
                visit_building_department=request_data.get("visit", {}).get("building_department"),
                department_id=request_data.get("department_id"),
                department_name=request_data.get("department_name"),
                host_employee_id=request_data.get("visit", {}).get("host_employee_id"),
                host_employee_name=request_data.get("visit", {}).get("host_employee_name"),
                requested_date=request_data.get("visit", {}).get("entry_time"),
                requested_end_date=request_data.get("visit", {}).get("exit_time"),
                expected_duration_minutes=request_data.get("visit", {}).get("duration_minutes", 480),
                requested_zones=zones_json,
                vehicle_number=request_data.get("access", {}).get("vehicle_number"),
                carrying_equipment=request_data.get("access", {}).get("carrying_equipment", False),
                equipment_description=request_data.get("access", {}).get("equipment_description"),
                additional_notes=request_data.get("additional_notes"),
                supporting_docs_urls=json.dumps(request_data.get("supporting_docs_urls", [])) if request_data.get("supporting_docs_urls") else None,
                status=RequestStatus.draft,
                current_stage=ApprovalStage.initial_submission,
                created_at=datetime.utcnow(),
            )

            db.add(visitor_req)
            db.commit()
            db.refresh(visitor_req)

            # Log creation
            AuditService.log_action(
                db=db,
                action="REQUEST_CREATED",
                entity_type="visitor_request",
                entity_id=visitor_req.id,
                actor_id=None,  # Public submission
                actor_name=request_data.get("requester_name"),
                description=f"Visitor request {request_id} created",
                metadata={"request_id": request_id, "visitor_name": visitor_req.visitor_name}
            )

            return True, visitor_req, None

        except Exception as e:
            db.rollback()
            return False, None, str(e)

    @staticmethod
    def transition_state(
        db: Session,
        request: VisitorRequest,
        target_state: RequestState,
        actor: Optional[User] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Perform formal state transition with full validation and audit.

        Returns: (success, error_message)
        """
        current_state = WorkflowService._convert_db_status_to_state(request.status)
        actor_role = WorkflowService._get_user_role(actor) if actor else UserRole.PUBLIC_REQUESTER

        # Validate transition
        is_valid, error_msg = WorkflowStateMachine.validate_transition(
            current_state=current_state,
            next_state=target_state,
            user_role=actor_role,
            validation_context=metadata
        )

        if not is_valid:
            return False, error_msg

        # Perform state-specific actions
        try:
            previous_status = request.status

            if target_state == RequestState.PENDING_DEPARTMENT_APPROVAL:
                request.status = RequestStatus.pending_department_approval
                request.current_stage = ApprovalStage.department_approval
                request.submitted_at = datetime.utcnow()

            elif target_state == RequestState.PENDING_APPROVAL:
                request.status = RequestStatus.pending_approval
                request.current_stage = ApprovalStage.operations_validation
                request.submitted_at = datetime.utcnow()

            elif target_state == RequestState.UNDER_REVIEW:
                request.status = RequestStatus.under_review
                request.operations_officer_id = actor.id if actor else None

            elif target_state == RequestState.APPROVED:
                request.status = RequestStatus.approved
                request.operations_reviewed_at = datetime.utcnow()
                request.operations_approved = True
                request.operations_comments = reason

            elif target_state == RequestState.REJECTED:
                request.status = RequestStatus.rejected
                request.operations_reviewed_at = datetime.utcnow()
                request.operations_approved = False
                request.rejection_reason = reason
                request.operations_comments = reason

            elif target_state == RequestState.ISSUED:
                request.status = RequestStatus.issued
                request.pass_issued_at = datetime.utcnow()
                request.pass_officer_id = actor.id if actor else None

            elif target_state == RequestState.CHECKED_IN:
                request.status = RequestStatus.checked_in
                request.checked_in_at = datetime.utcnow()
                request.gate_officer_checked_in_id = actor.id if actor else None

            elif target_state == RequestState.CHECKED_OUT:
                request.status = RequestStatus.checked_out
                request.checked_out_at = datetime.utcnow()
                request.gate_officer_checked_out_id = actor.id if actor else None

            elif target_state == RequestState.EXPIRED:
                request.status = RequestStatus.expired

            elif target_state == RequestState.CANCELLED:
                request.status = RequestStatus.cancelled

            request.updated_at = datetime.utcnow()

            # Record transition history
            WorkflowService._record_transition(
                db=db,
                request=request,
                from_state=previous_status,
                to_state=request.status,
                actor=actor,
                reason=reason
            )

            db.commit()
            db.refresh(request)

            # Send notifications
            WorkflowService._send_transition_notifications(
                db=db,
                request=request,
                target_state=target_state,
                actor=actor,
                reason=reason
            )

            # Log transition
            AuditService.log_action(
                db=db,
                action=f"TRANSITION_TO_{target_state.value.upper()}",
                entity_type="visitor_request",
                entity_id=request.id,
                actor_id=actor.id if actor else None,
                actor_name=actor.username if actor else None,
                description=f"Request {request.request_id} transitioned to {target_state.value}",
                metadata={
                    "request_id": request.request_id,
                    "previous_state": previous_status.value,
                    "new_state": request.status.value,
                    "reason": reason,
                }
            )

            return True, None

        except Exception as e:
            db.rollback()
            return False, str(e)

    @staticmethod
    @staticmethod
    def _record_transition(
        db: Session,
        request: VisitorRequest,
        from_state: RequestStatus,
        to_state: RequestStatus,
        actor: Optional[User],
        reason: Optional[str]
    ) -> None:
        """Record state transition in workflow history."""
        transition_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "from_state": from_state.value,
            "to_state": to_state.value,
            "actor_id": actor.id if actor else None,
            "actor_name": actor.username if actor else "system",
            "actor_role": actor.role if actor else "system",
            "reason": reason,
        }

        if request.workflow_transitions:
            try:
                transitions = json.loads(request.workflow_transitions)
                # Ensure transitions is a list (handle case where it was stored as a dict)
                if isinstance(transitions, dict):
                    transitions = [transitions]
            except (json.JSONDecodeError, TypeError):
                transitions = []
        else:
            transitions = []

        transitions.append(transition_record)
        request.workflow_transitions = json.dumps(transitions)

    @staticmethod
    def _send_transition_notifications(
        db: Session,
        request: VisitorRequest,
        target_state: RequestState,
        actor: Optional[User],
        reason: Optional[str]
    ) -> None:
        """Send appropriate notifications based on state transition."""
        try:
            if target_state == RequestState.PENDING_APPROVAL:
                # Notify operations officers
                NotificationService.notify_operations_team(
                    db=db,
                    subject=f"New visitor request pending approval: {request.request_id}",
                    request_id=request.request_id,
                    visitor_name=request.visitor_name,
                    visit_date=request.requested_date,
                )
                # Notify requester
                NotificationService.notify_requester(
                    db=db,
                    requester_email=request.requester_email,
                    subject="Your visitor pass request has been submitted",
                    request_id=request.request_id,
                    message=f"Request ID: {request.request_id}\nStatus: Pending Approval\nExpected timeframe: 24-48 hours"
                )

            elif target_state == RequestState.APPROVED:
                # Notify pass officers
                NotificationService.notify_pass_officers(
                    db=db,
                    subject=f"Request approved, ready for pass generation: {request.request_id}",
                    request_id=request.request_id,
                    visitor_name=request.visitor_name,
                )
                # Notify requester
                NotificationService.notify_requester(
                    db=db,
                    requester_email=request.requester_email,
                    subject="Your visitor request has been approved",
                    request_id=request.request_id,
                    message=f"Your request {request.request_id} has been approved. Pass generation in progress."
                )

            elif target_state == RequestState.REJECTED:
                # Notify requester with rejection reason
                NotificationService.notify_requester(
                    db=db,
                    requester_email=request.requester_email,
                    subject="Your visitor request has been rejected",
                    request_id=request.request_id,
                    message=f"Your request {request.request_id} was rejected.\nReason: {reason}"
                )

                # Notify admins and relatable department manager
                try:
                    from app.schemas.notification import NotificationCreate
                    from app.models.notification import NotificationType, NotificationChannel
                    from app.services.notification_service import create_notification
                    from app.models import User

                    actor_name = actor.username if actor else "Operations Officer"
                    title = f"Visitor Request Rejected: {request.request_id}"
                    message = f"Visitor request {request.request_id} for {request.visitor_name} was rejected by {actor_name}. Reason: {reason or 'No reason provided'}"

                    # Notify all admins
                    admins = db.query(User).filter(User.role == "admin").all()
                    for admin in admins:
                        try:
                            create_notification(
                                db=db,
                                payload=NotificationCreate(
                                    user_id=admin.id,
                                    notification_type=NotificationType.request_rejected_by_ops,
                                    title=title,
                                    message=message,
                                    related_visitor_request_id=request.id,
                                    channels=[NotificationChannel.in_app]
                                )
                            )
                        except Exception as ne:
                            print(f"Error notifying admin {admin.id}: {ne}")

                    # Notify relatable department managers
                    if request.department_id:
                        dept_managers = db.query(User).filter(
                            User.role == "department_manager",
                            User.department_id == request.department_id
                        ).all()
                        for mgr in dept_managers:
                            try:
                                create_notification(
                                    db=db,
                                    payload=NotificationCreate(
                                        user_id=mgr.id,
                                        notification_type=NotificationType.request_rejected_by_ops,
                                        title=title,
                                        message=message,
                                        related_visitor_request_id=request.id,
                                        channels=[NotificationChannel.in_app]
                                    )
                                )
                            except Exception as ne:
                                print(f"Error notifying department manager {mgr.id}: {ne}")
                    # Print to console for delivery tracking / verification
                    print(f"[NOTIFICATION] Admin: {title} - {message}")
                    if request.department_id:
                        print(f"[NOTIFICATION] Department Manager ({request.department_name}): {title} - {message}")
                except Exception as ex:
                    print(f"Error executing staff rejection notifications: {ex}")

            elif target_state == RequestState.ISSUED:
                # Notify gate officers and requester
                NotificationService.notify_gate_officers(
                    db=db,
                    subject=f"New pass issued, visitor arriving: {request.visitor_name}",
                    request_id=request.request_id,
                    visitor_name=request.visitor_name,
                    visit_date=request.requested_date,
                )
                NotificationService.notify_requester(
                    db=db,
                    requester_email=request.requester_email,
                    subject="Your visitor pass is ready",
                    request_id=request.request_id,
                    message=f"Pass has been issued for visitor {request.visitor_name}"
                )

        except Exception as e:
            # Log notification error but don't fail the transition
            print(f"Error sending transition notifications: {e}")

    @staticmethod
    def _generate_request_id() -> str:
        """Generate human-readable request ID: REQ-YYYYMMDD-XXXX."""
        import secrets
        now = datetime.utcnow()
        date_str = now.strftime("%Y%m%d")
        rand_str = secrets.token_hex(2).upper()
        return f"REQ-{date_str}-{rand_str}"

    @staticmethod
    def get_request_workflow_history(request: VisitorRequest) -> List[Dict[str, Any]]:
        """Get state transition history for a request."""
        if not request.workflow_transitions:
            return []
        return json.loads(request.workflow_transitions)

    @staticmethod
    def get_allowed_next_states(request: VisitorRequest, actor: Optional[User] = None) -> List[Dict[str, str]]:
        """Get list of allowed state transitions for current state and actor."""
        current_state = WorkflowService._convert_db_status_to_state(request.status)
        actor_role = WorkflowService._get_user_role(actor) if actor else UserRole.PUBLIC_REQUESTER

        transitions = WorkflowStateMachine.get_allowed_transitions(current_state)
        allowed = []

        for next_state, transition in transitions.items():
            if actor_role in transition.authorized_roles:
                allowed.append({
                    "state": next_state.value,
                    "display_name": WorkflowStateMachine.get_state_display_name(next_state),
                    "description": transition.description
                })

        return allowed
