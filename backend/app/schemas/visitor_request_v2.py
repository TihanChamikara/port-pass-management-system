"""
Enhanced Visitor Request Schemas: Request/response models for public visitor pass submissions.
Includes comprehensive validation and workflow state management.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
import json


class VisitorInformation(BaseModel):
    """Visitor personal information."""
    name: str = Field(..., min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    nic_passport: Optional[str] = Field(None, description="NIC or Passport number")
    organization: Optional[str] = Field(None, max_length=150)
    photo_url: Optional[str] = None


class VisitInformation(BaseModel):
    """Details about the visit."""
    purpose: str = Field(..., min_length=5, max_length=500)
    building_department: Optional[str] = Field(None, max_length=150)
    host_employee_id: Optional[int] = None
    host_employee_name: Optional[str] = None
    entry_time: datetime
    exit_time: datetime
    duration_minutes: int = Field(default=480, ge=15, le=1440)  # 15 min to 24 hours


class AccessInformation(BaseModel):
    """Access requirements."""
    requested_zones: List[str] = Field(..., min_items=1)
    vehicle_number: Optional[str] = Field(None, max_length=50)
    carrying_equipment: bool = False
    equipment_description: Optional[str] = None


class PublicVisitorRequestCreate(BaseModel):
    """
    Complete public visitor pass request form submission.
    This is what external/internal users submit without authentication.
    """
    # Requester Information
    requester_name: str = Field(..., min_length=2, max_length=150)
    requester_email: EmailStr
    requester_phone: Optional[str] = None

    # Visitor Information
    visitor: VisitorInformation

    # Visit Information
    visit: VisitInformation

    # Access Information
    access: AccessInformation

    # Additional
    additional_notes: Optional[str] = Field(None, max_length=2000)
    supporting_docs_urls: Optional[List[str]] = Field(None, description="Uploaded file URLs")

    @model_validator(mode="after")
    def validate_dates(self):
        """Ensure exit time is after entry time."""
        if self.visit.exit_time <= self.visit.entry_time:
            raise ValueError("Exit time must be after entry time")
        return self


class PublicVisitorRequestResponse(BaseModel):
    """Response after successful request submission."""
    id: int
    request_id: str
    status: str
    current_stage: str
    requester_email: str
    visitor_name: str
    visitor_purpose: str
    requested_zones: List[str]
    requested_date: datetime
    requested_end_date: datetime
    created_at: datetime
    submitted_at: Optional[datetime]
    tracking_token: Optional[str] = None  # For status tracking without auth

    class Config:
        from_attributes = True

    @field_validator("requested_zones", mode="before")
    @classmethod
    def parse_zones_json(cls, v):
        """Parse zones from JSON if string."""
        if isinstance(v, str):
            return json.loads(v)
        return v


class PublicRequestStatusTrack(BaseModel):
    """Track request status without authentication."""
    request_id: str = Field(..., description="Request ID (e.g., REQ-20260518-001)")
    requester_email: EmailStr


class PublicRequestStatusResponse(BaseModel):
    """Public status response for request tracking."""
    request_id: str
    status: str  # DRAFT, PENDING_APPROVAL, UNDER_REVIEW, APPROVED, etc.
    status_display: str  # Human-readable status
    current_stage: str
    visitor_name: str
    visitor_purpose: str
    requested_zones: List[str]
    requested_date: datetime
    requested_end_date: datetime
    created_at: datetime
    updated_at: datetime
    operations_comments: Optional[str] = None
    rejection_reason: Optional[str] = None
    pass_issued_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    pass_record_id: Optional[int] = None  # For pass lookup

    class Config:
        from_attributes = True

    @field_validator("requested_zones", mode="before")
    @classmethod
    def parse_zones_json(cls, v):
        """Parse zones from JSON if string."""
        if isinstance(v, str):
            return json.loads(v)
        return v


class RequestValidationError(BaseModel):
    """Validation error details."""
    error_type: str
    message: str
    field: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class RequestValidationResponse(BaseModel):
    """Validation response with errors."""
    is_valid: bool
    errors: List[RequestValidationError] = []


class WorkflowTransitionRequest(BaseModel):
    """Request to transition request state (authenticated users only)."""
    target_state: str
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class WorkflowTransitionResponse(BaseModel):
    """Response after state transition."""
    success: bool
    previous_state: str
    current_state: str
    timestamp: datetime
    message: str


class RequestOperationsApproval(BaseModel):
    """Operations Officer: Approve request with comments."""
    comments: Optional[str] = Field(None, max_length=1000)
    zones_override: Optional[List[str]] = None


class RequestPassIssuing(BaseModel):
    """Pass Officer: Issue pass for approved request."""
    pass_record_id: int
    issued_reason: Optional[str] = None


class RequestCheckIn(BaseModel):
    """Gate Officer: Check visitor in."""
    qr_scan_data: str  # QR code scanned data
    check_in_notes: Optional[str] = None


class RequestCheckOut(BaseModel):
    """Gate Officer: Check visitor out."""
    check_out_notes: Optional[str] = None


class RequestListResponse(BaseModel):
    """Paginated list of visitor requests."""
    items: List[PublicVisitorRequestResponse]
    total: int
    page: int
    page_size: int


class RequestAuditLog(BaseModel):
    """Audit log entry for request workflow."""
    timestamp: datetime
    action: str
    actor_id: Optional[int]
    actor_name: Optional[str]
    actor_role: str
    from_state: str
    to_state: str
    reason: Optional[str]
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class RequestFullDetails(BaseModel):
    """Complete request details with full audit history."""
    id: int
    request_id: str
    status: str
    current_stage: str

    # Requester
    requester_name: str
    requester_email: str
    requester_phone: Optional[str]

    # Visitor
    visitor_name: str
    visitor_email: Optional[str]
    visitor_phone: Optional[str]
    visitor_nic: Optional[str]
    visitor_organization: Optional[str]
    visitor_purpose: str

    # Visit Details
    visit_building_department: Optional[str]
    host_employee_id: Optional[int]
    host_employee_name: Optional[str]
    requested_date: datetime
    requested_end_date: datetime
    expected_duration_minutes: int

    # Access
    requested_zones: List[str]
    vehicle_number: Optional[str]
    carrying_equipment: bool
    equipment_description: Optional[str]

    # Additional
    additional_notes: Optional[str]
    supporting_docs_urls: Optional[List[str]]

    # Timestamps
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]

    # Workflow tracking
    operations_reviewed_at: Optional[datetime]
    operations_comments: Optional[str]
    pass_issued_at: Optional[datetime]
    checked_in_at: Optional[datetime]
    checked_out_at: Optional[datetime]
    rejection_reason: Optional[str]

    # Officers involved
    operations_officer_id: Optional[int]
    pass_officer_id: Optional[int]
    gate_officer_checked_in_id: Optional[int]
    gate_officer_checked_out_id: Optional[int]

    class Config:
        from_attributes = True

    @field_validator("requested_zones", mode="before")
    @classmethod
    def parse_zones_json(cls, v):
        """Parse zones from JSON if string."""
        if isinstance(v, str):
            return json.loads(v)
        return v

    @field_validator("supporting_docs_urls", mode="before")
    @classmethod
    def parse_docs_json(cls, v):
        """Parse docs from JSON if string."""
        if isinstance(v, str):
            return json.loads(v) if v else None
        return v
