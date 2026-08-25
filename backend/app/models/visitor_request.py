"""
Visitor Request Model: Tracks public visitor pass requests through formal workflow state machine.
"""

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, func, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class RequestStatus(str, Enum):
    """Public requester request status: formal workflow state machine."""
    draft = "draft"                           # Initial unsaved form state
    pending_approval = "pending_approval"     # Awaiting operations officer review
    under_review = "under_review"             # Being reviewed by operations
    approved = "approved"                     # Approved for pass generation
    rejected = "rejected"                     # Rejected by operations officer
    issued = "issued"                         # Pass generated and ready
    checked_in = "checked_in"                 # Visitor scanned QR at entry
    checked_out = "checked_out"               # Visitor exited site
    expired = "expired"                       # Request/pass expired
    cancelled = "cancelled"                   # Cancelled by requester or admin


class ApprovalStage(str, Enum):
    """Approval workflow stages."""
    initial_submission = "initial_submission"
    operations_validation = "operations_validation"
    pass_generation = "pass_generation"
    access_verification = "access_verification"


class VisitorRequest(Base):
    """Public visitor pass request with formal workflow state machine tracking."""
    __tablename__ = "visitor_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    request_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # Human-readable ID (e.g., "REQ-20260518-001")

    # ============================================================================
    # REQUESTER INFORMATION (Public, no login required)
    # ============================================================================
    requester_name: Mapped[str] = mapped_column(String(150))
    requester_email: Mapped[str] = mapped_column(String(150), index=True)
    requester_phone: Mapped[str | None] = mapped_column(String(20))

    # ============================================================================
    # VISITOR INFORMATION
    # ============================================================================
    visitor_name: Mapped[str] = mapped_column(String(150), index=True)
    visitor_email: Mapped[str | None] = mapped_column(String(150))
    visitor_phone: Mapped[str | None] = mapped_column(String(20))
    visitor_nic: Mapped[str | None] = mapped_column(String(20))  # NIC or Passport
    visitor_organization: Mapped[str | None] = mapped_column(String(150))
    visitor_photo_url: Mapped[str | None] = mapped_column(Text)  # S3/CDN URL for visitor photo
    visitor_purpose: Mapped[str] = mapped_column(String(500))  # Purpose of visit

    # ============================================================================
    # VISIT INFORMATION
    # ============================================================================
    visit_building_department: Mapped[str | None] = mapped_column(String(150))  # Building or department to visit
    host_employee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))  # Internal employee to meet
    host_employee_name: Mapped[str | None] = mapped_column(String(150))  # For reference if not in system

    requested_date: Mapped[datetime] = mapped_column(DateTime)  # Visit entry date/time
    requested_end_date: Mapped[datetime] = mapped_column(DateTime)  # Visit exit date/time
    expected_duration_minutes: Mapped[int] = mapped_column(default=480)  # Default 8 hours

    # ============================================================================
    # ACCESS INFORMATION
    # ============================================================================
    requested_zones: Mapped[str] = mapped_column(Text)  # JSON list: ["zone_1", "zone_2", ...]
    vehicle_number: Mapped[str | None] = mapped_column(String(50))  # Vehicle registration plate
    carrying_equipment: Mapped[bool] = mapped_column(default=False)  # Is visitor bringing equipment?
    equipment_description: Mapped[str | None] = mapped_column(Text)  # Description of equipment if any

    # ============================================================================
    # ADDITIONAL INFORMATION
    # ============================================================================
    additional_notes: Mapped[str | None] = mapped_column(Text)  # Comments/special instructions
    supporting_docs_urls: Mapped[str | None] = mapped_column(Text)  # JSON list of uploaded file URLs

    # ============================================================================
    # WORKFLOW STATE & TRANSITIONS
    # ============================================================================
    status: Mapped[RequestStatus] = mapped_column(
        SqlEnum(RequestStatus),
        default=RequestStatus.draft,
        index=True
    )
    current_stage: Mapped[ApprovalStage] = mapped_column(
        SqlEnum(ApprovalStage),
        default=ApprovalStage.initial_submission
    )

    # ============================================================================
    # APPROVAL AUDIT TRAIL
    # ============================================================================
    # Operations Officer Review
    operations_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    operations_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    operations_comments: Mapped[str | None] = mapped_column(Text)
    operations_approved: Mapped[bool] = mapped_column(default=False)
    rejection_reason: Mapped[str | None] = mapped_column(Text)  # If rejected

    # Pass Officer Issuance
    pass_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    pass_issued_at: Mapped[datetime | None] = mapped_column(DateTime)
    pass_record_id: Mapped[int | None] = mapped_column(ForeignKey("passes.id"))

    # Gate Officer Check-in/out
    gate_officer_checked_in_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime)
    gate_officer_checked_out_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    checked_out_at: Mapped[datetime | None] = mapped_column(DateTime)

    # ============================================================================
    # SYSTEM TRACKING
    # ============================================================================
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)

    # State transition history (JSON)
    workflow_transitions: Mapped[str | None] = mapped_column(Text)  # JSON array of {state, timestamp, actor, reason}
