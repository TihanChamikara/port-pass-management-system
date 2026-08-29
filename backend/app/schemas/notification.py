"""
Notification Schemas: Request/response models for notifications.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.notification import NotificationType, NotificationChannel


class NotificationCreate(BaseModel):
    """System service: Create a notification."""
    user_id: Optional[int] = None
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    notification_type: NotificationType
    title: str
    message: str
    action_url: Optional[str] = None
    related_visitor_request_id: Optional[int] = None
    related_pass_record_id: Optional[int] = None
    channels: list[NotificationChannel] = ["in_app"]


class NotificationResponse(BaseModel):
    """Read-only notification response."""
    id: int
    notification_type: NotificationType
    title: str
    message: str
    action_url: Optional[str] = None
    is_read: bool
    created_at: datetime
    sent_at: Optional[datetime] = None
    delivery_status: str

    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    """Mark notification as read."""
    is_read: bool = True


class NotificationListResponse(BaseModel):
    """Paginated list of notifications."""
    items: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int

    class Config:
        from_attributes = True
