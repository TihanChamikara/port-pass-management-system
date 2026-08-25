"""
Visitor Request Schemas: Request/response models for public visitor pass submissions.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.visitor_request import RequestStatus, ApprovalStage


class VisitorRequestCreate(BaseModel):
    """Public requester: Create a new visitor pass request (no auth required)."""
    requester_name: str
    requester_email: EmailStr
    requester_phone: Optional[str] = None
    visitor_name: str
    visitor_email: Optional[EmailStr] = Field(default=None)
    visitor_purpose: str
    visitor_organization: Optional[str] = None
    requested_zones: list[str]  # ["zone_1", "zone_2"]
    requested_date: datetime
    requested_end_date: datetime
    expected_duration_minutes: int = 480

    @field_validator("visitor_email", mode="before")
    @classmethod
    def validate_visitor_email(cls, v):
        """Convert empty string to None for optional email field."""
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @field_validator("visitor_organization", mode="before")
    @classmethod
    def validate_visitor_organization(cls, v):
        """Convert empty string to None for optional field."""
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @field_validator("requester_phone", mode="before")
    @classmethod
    def validate_requester_phone(cls, v):
        """Convert empty string to None for optional phone field."""
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class VisitorRequestResponse(BaseModel):
    """Read-only visitor request response with status."""
    id: int
    request_id: str
    requester_name: str
    requester_email: str
    visitor_name: str
    visitor_purpose: str
    status: RequestStatus
    current_stage: ApprovalStage
    requested_zones: str
    requested_date: datetime
    requested_end_date: datetime
    operations_comments: Optional[str] = None
    pass_issued_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VisitorRequestStatusCheck(BaseModel):
    """Track request by ID (public access, no auth)."""
    request_id: str
    requester_email: str


class VisitorRequestApprovalPayload(BaseModel):
    """Operations Officer: Approve or reject a visitor request."""
    approved: bool
    comments: Optional[str] = None
    requested_zones_override: Optional[list[str]] = None  # Can modify zones during approval


class VisitorRequestListResponse(BaseModel):
    """Paginated list of visitor requests."""
    items: list[VisitorRequestResponse]
    total: int
    page: int
    page_size: int

    class Config:
        from_attributes = True
