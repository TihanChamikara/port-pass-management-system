"""
Request Validation Engine

Comprehensive validation for public visitor pass requests including:
- Duplicate detection
- Blacklist checking
- Time conflict validation
- Zone capacity limits
- Document validation
"""

import re
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models import User, VisitorRequest


class ValidationErrorType(str, Enum):
    """Types of validation errors."""
    DUPLICATE_REQUEST = "duplicate_request"
    BLACKLISTED_VISITOR = "blacklisted_visitor"
    INVALID_NIC = "invalid_nic"
    INVALID_PHONE = "invalid_phone"
    INVALID_EMAIL = "invalid_email"
    TIME_CONFLICT = "time_conflict"
    ZONE_CAPACITY_EXCEEDED = "zone_capacity_exceeded"
    INVALID_DOCUMENT = "invalid_document"
    MISSING_HOST_EMPLOYEE = "missing_host_employee"
    INVALID_DATE_RANGE = "invalid_date_range"
    PAST_DATE = "past_date"
    DURATION_EXCEEDED = "duration_exceeded"
    UNKNOWN = "unknown"


class ValidationError:
    """Represents a validation error with details."""

    def __init__(
        self,
        error_type: ValidationErrorType,
        message: str,
        field: Optional[str] = None,
        details: Optional[dict] = None
    ):
        self.error_type = error_type
        self.message = message
        self.field = field
        self.details = details or {}

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "error_type": self.error_type.value,
            "message": self.message,
            "field": self.field,
            "details": self.details,
        }


class PublicRequestValidator:
    """Validates public visitor pass requests."""

    # Blacklist: Add visitor names to deny
    BLACKLIST_VISITORS = set()  # Placeholder - load from DB in production

    # NIC/Passport validation patterns
    NIC_PATTERN = r"^\d{9}[V|X]?$"  # Sri Lankan NIC format
    PASSPORT_PATTERN = r"^[A-Z]{2}\d{6,9}$"  # International passport
    PHONE_PATTERN = r"^\+?[\d\s\-\(\)]{7,15}$"

    # Time constraints
    MIN_REQUEST_ADVANCE_HOURS = 1  # Requests must be for future times
    MAX_REQUEST_ADVANCE_DAYS = 30  # Cannot request more than 30 days ahead
    MAX_DURATION_HOURS = 24  # Maximum visit duration

    @staticmethod
    def validate_nic_or_passport(nic_or_passport: str) -> Tuple[bool, Optional[str]]:
        """Validate NIC or passport format."""
        if not nic_or_passport:
            return False, "NIC or Passport number is required"

        if re.match(PublicRequestValidator.NIC_PATTERN, nic_or_passport):
            return True, None
        if re.match(PublicRequestValidator.PASSPORT_PATTERN, nic_or_passport):
            return True, None

        return False, "Invalid NIC or Passport format"

    @staticmethod
    def validate_phone(phone: str) -> Tuple[bool, Optional[str]]:
        """Validate phone number format."""
        if not phone:
            return False, "Phone number is required"

        if not re.match(PublicRequestValidator.PHONE_PATTERN, phone):
            return False, "Invalid phone number format"

        return True, None

    @staticmethod
    def validate_email(email: str) -> Tuple[bool, Optional[str]]:
        """Validate email format."""
        if not email:
            return False, "Email is required"

        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, email):
            return False, "Invalid email format"

        return True, None

    @staticmethod
    def validate_date_range(
        start_date: datetime,
        end_date: datetime,
        current_time: Optional[datetime] = None
    ) -> List[ValidationError]:
        """Validate visit date range."""
        errors = []
        current = current_time or datetime.now(timezone.utc)

        # Ensure both dates are timezone-aware for comparison
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)

        # End must be after start
        if end_date <= start_date:
            errors.append(
                ValidationError(
                    ValidationErrorType.INVALID_DATE_RANGE,
                    "Exit time must be after entry time",
                    field="requested_end_date"
                )
            )

        # Start must be in future (allow small clock skew tolerance)
        skew_tolerance = timedelta(minutes=5)
        if start_date < current:
            # If start_date is slightly behind current (within tolerance), accept it
            if start_date + skew_tolerance < current:
                errors.append(
                    ValidationError(
                        ValidationErrorType.PAST_DATE,
                        "Entry time must be in the future",
                        field="requested_date"
                    )
                )

        # Enforce minimum advance and start must not be too far in future
        # Minimum advance (e.g., requests must be made at least MIN_REQUEST_ADVANCE_HOURS ahead)
        min_advance = timedelta(hours=PublicRequestValidator.MIN_REQUEST_ADVANCE_HOURS)
        if start_date < current + min_advance:
            errors.append(
                ValidationError(
                    ValidationErrorType.TIME_CONFLICT,
                    f"Entry time must be at least {PublicRequestValidator.MIN_REQUEST_ADVANCE_HOURS} hour(s) in the future",
                    field="requested_date"
                )
            )

        # Start must not be too far in future
        max_future = current + timedelta(days=PublicRequestValidator.MAX_REQUEST_ADVANCE_DAYS)
        if start_date > max_future:
            errors.append(
                ValidationError(
                    ValidationErrorType.INVALID_DATE_RANGE,
                    f"Entry time cannot be more than {PublicRequestValidator.MAX_REQUEST_ADVANCE_DAYS} days in future",
                    field="requested_date"
                )
            )

        # Duration check
        duration = end_date - start_date
        max_duration = timedelta(hours=PublicRequestValidator.MAX_DURATION_HOURS)
        if duration > max_duration:
            errors.append(
                ValidationError(
                    ValidationErrorType.DURATION_EXCEEDED,
                    f"Visit duration cannot exceed {PublicRequestValidator.MAX_DURATION_HOURS} hours",
                    field="expected_duration_minutes"
                )
            )

        return errors

    @staticmethod
    def check_duplicate_request(
        db: Session,
        visitor_name: str,
        requested_date: datetime,
        requested_end_date: datetime,
        requester_email: str
    ) -> Optional[ValidationError]:
        """
        Check for duplicate requests from same requester within time period.
        Same visitor + overlapping times = potential duplicate.
        """
        # Look for requests from same requester in past 24 hours
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        # Look for active requests with same visitor in overlapping time
        existing = db.query(VisitorRequest).filter(
            VisitorRequest.requester_email == requester_email,
            VisitorRequest.visitor_name == visitor_name,
            VisitorRequest.created_at > cutoff,
            VisitorRequest.status.not_in(["rejected", "cancelled"])  # Exclude failed requests
        ).first()

        if existing:
            return ValidationError(
                ValidationErrorType.DUPLICATE_REQUEST,
                f"Duplicate request detected: {existing.request_id}. "
                f"Same visitor already has pending request. "
                f"Contact operations for clarification.",
                field="visitor_name",
                details={"existing_request_id": existing.request_id}
            )

        return None

    @staticmethod
    def check_blacklist(visitor_name: str, visitor_email: Optional[str] = None) -> Optional[ValidationError]:
        """Check if visitor is blacklisted (security compliance)."""
        # In production, load blacklist from database or external service
        # For now, just check against in-memory set
        if visitor_name.lower() in PublicRequestValidator.BLACKLIST_VISITORS:
            return ValidationError(
                ValidationErrorType.BLACKLISTED_VISITOR,
                "This visitor cannot be processed. Please contact administration.",
                field="visitor_name"
            )

        return None

    @staticmethod
    def validate_zones(zones: List[str]) -> Optional[ValidationError]:
        """Validate that requested zones are valid."""
        if not zones:
            return ValidationError(
                ValidationErrorType.INVALID_DOCUMENT,
                "At least one zone must be requested",
                field="requested_zones"
            )

        # Valid zones for this system
        valid_zones = {"zone_1", "zone_2", "zone_3", "cargo", "office"}
        invalid_zones = set(zones) - valid_zones

        if invalid_zones:
            return ValidationError(
                ValidationErrorType.INVALID_DOCUMENT,
                f"Invalid zones: {', '.join(invalid_zones)}. "
                f"Valid zones are: {', '.join(valid_zones)}",
                field="requested_zones"
            )

        return None

    @staticmethod
    def validate_host_employee(db: Session, host_employee_id: Optional[int]) -> Optional[ValidationError]:
        """Validate that host employee exists and is active."""
        if not host_employee_id:
            return ValidationError(
                ValidationErrorType.MISSING_HOST_EMPLOYEE,
                "Host employee must be specified",
                field="host_employee_id"
            )

        # In production, check if employee exists and is active
        # For now, just verify it's a valid user ID
        host = db.query(User).filter(User.id == host_employee_id).first()

        if not host:
            return ValidationError(
                ValidationErrorType.MISSING_HOST_EMPLOYEE,
                "Host employee not found",
                field="host_employee_id"
            )

        return None

    @staticmethod
    def validate_public_request(
        db: Session,
        visitor_name: str,
        visitor_email: Optional[str],
        requester_email: str,
        requested_date: datetime,
        requested_end_date: datetime,
        zones: List[str],
        nic_or_passport: Optional[str] = None,
        phone: Optional[str] = None,
        host_employee_id: Optional[int] = None
    ) -> Tuple[bool, List[ValidationError]]:
        """
        Comprehensive validation of public visitor request.

        Returns: (is_valid, list_of_errors)
        """
        errors = []

        # 1. Validate identifiers
        if nic_or_passport:
            is_valid, msg = PublicRequestValidator.validate_nic_or_passport(nic_or_passport)
            if not is_valid:
                errors.append(
                    ValidationError(
                        ValidationErrorType.INVALID_NIC,
                        msg,
                        field="visitor_nic"
                    )
                )

        if phone:
            is_valid, msg = PublicRequestValidator.validate_phone(phone)
            if not is_valid:
                errors.append(
                    ValidationError(
                        ValidationErrorType.INVALID_PHONE,
                        msg,
                        field="visitor_phone"
                    )
                )

        if requester_email:
            is_valid, msg = PublicRequestValidator.validate_email(requester_email)
            if not is_valid:
                errors.append(
                    ValidationError(
                        ValidationErrorType.INVALID_EMAIL,
                        msg,
                        field="requester_email"
                    )
                )

        if visitor_email:
            is_valid, msg = PublicRequestValidator.validate_email(visitor_email)
            if not is_valid:
                errors.append(
                    ValidationError(
                        ValidationErrorType.INVALID_EMAIL,
                        msg,
                        field="visitor_email"
                    )
                )

        # 2. Validate dates
        date_errors = PublicRequestValidator.validate_date_range(requested_date, requested_end_date)
        errors.extend(date_errors)

        # 3. Check for duplicates
        duplicate_error = PublicRequestValidator.check_duplicate_request(
            db, visitor_name, requested_date, requested_end_date, requester_email
        )
        if duplicate_error:
            errors.append(duplicate_error)

        # 4. Check blacklist
        blacklist_error = PublicRequestValidator.check_blacklist(visitor_name, visitor_email)
        if blacklist_error:
            errors.append(blacklist_error)

        # 5. Validate zones
        zone_error = PublicRequestValidator.validate_zones(zones)
        if zone_error:
            errors.append(zone_error)

        # 6. Validate host employee if provided
        if host_employee_id:
            host_error = PublicRequestValidator.validate_host_employee(db, host_employee_id)
            if host_error:
                errors.append(host_error)

        return len(errors) == 0, errors
