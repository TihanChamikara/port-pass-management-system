"""
Audit Logs Routes: View audit trail (Admin only for full access)
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.models import AuditLog, User
from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    user_id: int | None = Query(default=None),
    action_type: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin()),
) -> AuditLogListResponse:
    """List audit logs (Admin only)."""
    query = db.query(AuditLog)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    if action_type:
        query = query.filter(AuditLog.action_type == action_type)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    total = query.count()

    items = (
        query.order_by(desc(AuditLog.timestamp))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/user/{user_id}", response_model=list[AuditLogResponse])
def user_activity(
    user_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AuditLogResponse]:
    """Get user activity logs. Users can only view their own, admins can view all."""
    from app.models import UserRole

    # Users can only view their own logs
    if current_user.role != UserRole.admin and current_user.id != user_id:
        return []

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user_id)
        .order_by(desc(AuditLog.timestamp))
        .limit(limit)
        .all()
    )

    return logs
