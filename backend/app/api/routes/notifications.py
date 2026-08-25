"""
Notification Routes: System notifications for workflow events.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationMarkRead,
)
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationListResponse:
    """
    Get notifications for current user.
    Supports filtering to unread only.
    """
    items, total, unread_count = notification_service.get_user_notifications(
        db, current_user.id, page, page_size, unread_only
    )

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(item, from_attributes=True) for item in items],
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_as_read(
    notification_id: int,
    payload: NotificationMarkRead,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    """
    Mark a notification as read/unread.
    """
    try:
        notif = notification_service.mark_notification_as_read(db, notification_id, current_user.id)
        return NotificationResponse.model_validate(notif, from_attributes=True)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/mark-all-read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Mark all notifications as read for current user.
    """
    count = notification_service.mark_all_as_read(db, current_user.id)
    return {"marked_read": count}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Delete a notification.
    """
    notification_service.delete_notification(db, notification_id, current_user.id)
    return {"deleted": True}
