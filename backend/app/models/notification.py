"""
Notification Model: System notifications for approval status, alerts, and events.
"""

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class NotificationType(str, Enum):
    """Notification types for different system events."""
    request_submitted = "request_submitted"                        # Public requester: confirmation
    request_approved_by_ops = "request_approved_by_ops"            # Requester: ops approved
    request_rejected_by_ops = "request_rejected_by_ops"            # Requester: ops rejected
    pass_issued = "pass_issued"                                    # Requester: pass ready
    pass_activated = "pass_activated"                              # Visitor: pass active
    pass_expired = "pass_expired"                                  # Visitor: pass expired
    visitor_checked_in = "visitor_checked_in"                      # Security: visitor entry
    visitor_checked_out = "visitor_checked_out"                    # Security: visitor exit
    zone_capacity_warning = "zone_capacity_warning"                # Admin/Ops: zone near capacity
    zone_capacity_exceeded = "zone_capacity_exceeded"              # Admin/Ops: zone over capacity
    approval_required = "approval_required"                        # Ops Officer: new request
    pass_generation_required = "pass_generation_required"          # Pass Officer: approved request
    request_cancelled = "request_cancelled"                        # All interested: request cancelled
    system_alert = "system_alert"                                  # Admin: system alerts


class NotificationChannel(str, Enum):
    """Delivery channels for notifications."""
    email = "email"
    sms = "sms"
    in_app = "in_app"
    push = "push"


class Notification(Base):
    """Enterprise notification system for all workflow events."""
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Recipient
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))  # None for public requesters
    recipient_email: Mapped[str | None] = mapped_column(String(150))     # For non-users
    recipient_phone: Mapped[str | None] = mapped_column(String(20))      # For SMS

    # Content
    notification_type: Mapped[NotificationType] = mapped_column(SqlEnum(NotificationType), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    action_url: Mapped[str | None] = mapped_column(String(500))  # Link to view/act on notification

    # Context
    related_visitor_request_id: Mapped[int | None] = mapped_column(ForeignKey("visitor_requests.id"))
    related_pass_record_id: Mapped[int | None] = mapped_column(ForeignKey("passes.id"))
    related_audit_log_id: Mapped[int | None] = mapped_column(ForeignKey("audit_logs.id"))

    # Channels & delivery
    channels: Mapped[str] = mapped_column(String(100))  # JSON: ["email", "in_app", "sms"]
    is_read: Mapped[bool] = mapped_column(default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    delivery_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, sent, failed, delivered
