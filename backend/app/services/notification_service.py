"""
Notification Service: Send and manage notifications for all workflow events.
"""

import json
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Notification, NotificationType, NotificationChannel, User
from app.schemas.notification import NotificationCreate


def create_notification(db: Session, payload: NotificationCreate) -> Notification:
    """
    Create a notification for a user or email recipient.
    """
    channels_str = json.dumps([c.value for c in payload.channels])

    notif = Notification(
        user_id=payload.user_id,
        recipient_email=payload.recipient_email,
        recipient_phone=payload.recipient_phone,
        notification_type=payload.notification_type,
        title=payload.title,
        message=payload.message,
        action_url=payload.action_url,
        related_visitor_request_id=payload.related_visitor_request_id,
        related_pass_record_id=payload.related_pass_record_id,
        channels=channels_str,
        delivery_status="pending",
    )

    db.add(notif)
    db.commit()
    db.refresh(notif)

    # TODO: Integrate email service (send via SMTP)
    # TODO: Integrate SMS service (send via Twilio/etc)
    # TODO: Mark as sent after delivery

    return notif


def get_user_notifications(
    db: Session,
    user_id: int,
    page: int = 1,
    page_size: int = 20,
    unread_only: bool = False
) -> tuple[list[Notification], int, int]:
    """
    Get notifications for a user (logged-in staff).
    Returns: (notifications, total, unread_count)
    """
    query = db.query(Notification).filter(Notification.user_id == user_id)

    unread_count = query.filter(Notification.is_read == False).count()

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    items = query.order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return items, total, unread_count


def mark_notification_as_read(db: Session, notification_id: int, user_id: int) -> Notification:
    """Mark a notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()

    if not notif:
        raise Exception("Notification not found")

    notif.is_read = True
    notif.read_at = datetime.utcnow()

    db.commit()
    db.refresh(notif)

    return notif


def mark_all_as_read(db: Session, user_id: int) -> int:
    """Mark all notifications as read for a user."""
    count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})

    db.commit()
    return count


def delete_notification(db: Session, notification_id: int, user_id: int) -> None:
    """Delete a notification."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()

    if notif:
        db.delete(notif)
        db.commit()


def send_notification_to_role(
    db: Session,
    role: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    related_visitor_request_id: Optional[int] = None,
    channels: list[NotificationChannel] = None,
) -> list[Notification]:
    """
    Send notification to all users with a specific role.
    Used for approval requests, capacity warnings, etc.
    """
    if channels is None:
        channels = [NotificationChannel.in_app]

    from app.models import UserRole
    users = db.query(User).filter(User.role == role).all()

    notifications = []
    for user in users:
        payload = NotificationCreate(
            user_id=user.id,
            notification_type=notification_type,
            title=title,
            message=message,
            action_url=action_url,
            related_visitor_request_id=related_visitor_request_id,
            channels=channels,
        )
        notif = create_notification(db, payload)
        notifications.append(notif)

    return notifications


class NotificationService:
    """Service class for sending workflow notifications."""

    @staticmethod
    def notify_operations_team(
        db: Session,
        subject: str,
        request_id: str,
        visitor_name: str,
        visit_date: datetime,
    ) -> None:
        """Notify operations team of new pending request."""
        print(f"[NOTIFICATION] Operations team: {subject}")

    @staticmethod
    def notify_requester(
        db: Session,
        requester_email: str,
        subject: str,
        request_id: str,
        message: str,
    ) -> None:
        """Notify requester of request status."""
        print(f"[NOTIFICATION] Requester ({requester_email}): {subject} - {message}")

    @staticmethod
    def notify_pass_officers(
        db: Session,
        subject: str,
        request_id: str,
        visitor_name: str,
    ) -> None:
        """Notify pass officers of approved request."""
        print(f"[NOTIFICATION] Pass officers: {subject}")

    @staticmethod
    def notify_gate_officers(
        db: Session,
        subject: str,
        request_id: str,
        visitor_name: str,
        visit_date: datetime,
    ) -> None:
        """Notify gate officers of issued pass."""
        print(f"[NOTIFICATION] Gate officers: {subject}")
