"""
Formal Workflow State Machine Engine

Defines the enterprise request lifecycle with state transitions, validation rules,
and authorized actors for each transition.
"""

from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Set, Callable, Any
from dataclasses import dataclass, field


class RequestState(str, Enum):
    """Enterprise workflow states for visitor/pass requests."""
    DRAFT = "draft"                         # Initial unsaved form state
    PENDING_APPROVAL = "pending_approval"   # Awaiting operations officer review
    UNDER_REVIEW = "under_review"           # Being reviewed by operations
    APPROVED = "approved"                   # Approved for pass generation
    REJECTED = "rejected"                   # Rejected by operations officer
    ISSUED = "issued"                       # Pass generated and ready
    CHECKED_IN = "checked_in"               # Visitor scanned QR at entry
    CHECKED_OUT = "checked_out"             # Visitor exited site
    EXPIRED = "expired"                     # Request/pass expired
    CANCELLED = "cancelled"                 # Cancelled by requester or admin


class UserRole(str, Enum):
    """User roles for access control."""
    ADMIN = "admin"
    OPERATIONS_OFFICER = "operations_officer"
    PASS_OFFICER = "pass_officer"
    SECURITY_GATE_OFFICER = "security_gate_officer"
    PUBLIC_REQUESTER = "public_requester"


@dataclass
class StateTransition:
    """Defines allowed transition from one state to another."""
    from_state: RequestState
    to_state: RequestState
    authorized_roles: Set[UserRole]
    requires_validation: Callable[[Any], bool] = field(default=lambda x: True)
    description: str = ""


class WorkflowStateMachine:
    """Enterprise workflow state machine with formal transitions and validations."""

    # Define all valid state transitions
    TRANSITIONS = [
        # Initial submission flow
        StateTransition(
            RequestState.DRAFT,
            RequestState.PENDING_APPROVAL,
            {UserRole.PUBLIC_REQUESTER, UserRole.ADMIN},
            description="Public requester submits form"
        ),

        # Operations review flow
        StateTransition(
            RequestState.PENDING_APPROVAL,
            RequestState.UNDER_REVIEW,
            {UserRole.OPERATIONS_OFFICER, UserRole.ADMIN},
            description="Operations officer starts review"
        ),

        StateTransition(
            RequestState.UNDER_REVIEW,
            RequestState.APPROVED,
            {UserRole.OPERATIONS_OFFICER, UserRole.ADMIN},
            description="Operations officer approves request"
        ),

        StateTransition(
            RequestState.UNDER_REVIEW,
            RequestState.REJECTED,
            {UserRole.OPERATIONS_OFFICER, UserRole.ADMIN},
            description="Operations officer rejects request"
        ),

        # Pass generation flow
        StateTransition(
            RequestState.APPROVED,
            RequestState.ISSUED,
            {UserRole.PASS_OFFICER, UserRole.ADMIN},
            description="Pass officer generates and issues pass"
        ),

        # Access verification flow
        StateTransition(
            RequestState.ISSUED,
            RequestState.CHECKED_IN,
            {UserRole.SECURITY_GATE_OFFICER, UserRole.ADMIN},
            description="Visitor scans QR at gate entry"
        ),

        StateTransition(
            RequestState.CHECKED_IN,
            RequestState.CHECKED_OUT,
            {UserRole.SECURITY_GATE_OFFICER, UserRole.ADMIN},
            description="Visitor scans QR at gate exit"
        ),

        # Expiration flow
        StateTransition(
            RequestState.PENDING_APPROVAL,
            RequestState.EXPIRED,
            {UserRole.ADMIN},
            description="Request expires without approval"
        ),

        StateTransition(
            RequestState.ISSUED,
            RequestState.EXPIRED,
            {UserRole.ADMIN},
            description="Pass expires after issuance"
        ),

        # Cancellation flow (from any active state)
        StateTransition(
            RequestState.DRAFT,
            RequestState.CANCELLED,
            {UserRole.PUBLIC_REQUESTER, UserRole.ADMIN},
            description="Requester cancels draft request"
        ),

        StateTransition(
            RequestState.PENDING_APPROVAL,
            RequestState.CANCELLED,
            {UserRole.PUBLIC_REQUESTER, UserRole.ADMIN},
            description="Requester cancels pending request"
        ),

        StateTransition(
            RequestState.UNDER_REVIEW,
            RequestState.CANCELLED,
            {UserRole.ADMIN},
            description="Admin cancels request under review"
        ),

        StateTransition(
            RequestState.APPROVED,
            RequestState.CANCELLED,
            {UserRole.ADMIN},
            description="Admin cancels approved request"
        ),

        StateTransition(
            RequestState.ISSUED,
            RequestState.CANCELLED,
            {UserRole.ADMIN},
            description="Admin cancels issued pass"
        ),

        StateTransition(
            RequestState.CHECKED_IN,
            RequestState.CANCELLED,
            {UserRole.ADMIN},
            description="Admin cancels checked-in request"
        ),
    ]

    # Group states by category for UI/reporting
    TERMINAL_STATES = {
        RequestState.REJECTED,
        RequestState.EXPIRED,
        RequestState.CANCELLED,
        RequestState.CHECKED_OUT,
    }

    ACTIVE_STATES = {
        RequestState.DRAFT,
        RequestState.PENDING_APPROVAL,
        RequestState.UNDER_REVIEW,
        RequestState.APPROVED,
        RequestState.ISSUED,
        RequestState.CHECKED_IN,
    }

    @classmethod
    def get_allowed_transitions(cls, current_state: RequestState) -> Dict[RequestState, StateTransition]:
        """Get all allowed transitions from current state."""
        return {
            t.to_state: t for t in cls.TRANSITIONS
            if t.from_state == current_state
        }

    @classmethod
    def can_transition(
        cls,
        current_state: RequestState,
        next_state: RequestState,
        user_role: UserRole
    ) -> bool:
        """Check if transition is allowed for given user role."""
        transitions = cls.get_allowed_transitions(current_state)
        transition = transitions.get(next_state)
        return transition is not None and user_role in transition.authorized_roles

    @classmethod
    def validate_transition(
        cls,
        current_state: RequestState,
        next_state: RequestState,
        user_role: UserRole,
        validation_context: Optional[Dict[str, Any]] = None
    ) -> tuple[bool, str]:
        """
        Comprehensive transition validation.
        
        Returns: (is_valid, error_message)
        """
        # Check if transition exists
        transitions = cls.get_allowed_transitions(current_state)
        transition = transitions.get(next_state)

        if transition is None:
            return False, f"No valid transition from {current_state} to {next_state}"

        # Check user authorization
        if user_role not in transition.authorized_roles:
            return False, f"User role {user_role} not authorized for this transition"

        # Run custom validation if context provided
        if validation_context and not transition.requires_validation(validation_context):
            return False, f"Validation failed for transition: {transition.description}"

        return True, ""

    @classmethod
    def get_state_display_name(cls, state: RequestState) -> str:
        """Get human-readable state name."""
        display_names = {
            RequestState.DRAFT: "Draft",
            RequestState.PENDING_APPROVAL: "Pending Approval",
            RequestState.UNDER_REVIEW: "Under Review",
            RequestState.APPROVED: "Approved",
            RequestState.REJECTED: "Rejected",
            RequestState.ISSUED: "Pass Issued",
            RequestState.CHECKED_IN: "Checked In",
            RequestState.CHECKED_OUT: "Checked Out",
            RequestState.EXPIRED: "Expired",
            RequestState.CANCELLED: "Cancelled",
        }
        return display_names.get(state, state.value)

    @classmethod
    def is_terminal_state(cls, state: RequestState) -> bool:
        """Check if state is terminal (no further transitions allowed)."""
        return state in cls.TERMINAL_STATES

    @classmethod
    def is_active_state(cls, state: RequestState) -> bool:
        """Check if request is still active."""
        return state in cls.ACTIVE_STATES
