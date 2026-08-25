"""
User Management Routes: Handle user CRUD and role management (Admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.core.security import get_password_hash
from app.models import User, UserRole
from app.services.audit_service import log_action
from app.models.audit_log import AuditActionType, AuditEntityType
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["Users"])


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: UserRole


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: UserRole
    is_active: bool


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int


@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin()),
) -> UserListResponse:
    """List all users (Admin only)."""
    query = db.query(User)
    total = query.count()

    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return UserListResponse(
        items=[
            UserResponse(
                id=u.id,
                username=u.username,
                full_name=u.full_name,
                role=u.role,
                is_active=u.is_active,
            )
            for u in users
        ],
        total=total,
    )


@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
) -> UserResponse:
    """Create a new user (Admin only)."""
    # Check if user exists
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=payload.username,
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
    )

    db.add(new_user)

    # Log action
    log_action(
        db,
        current_user,
        AuditActionType.CREATE,
        AuditEntityType.user,
        f"User created: {payload.username} ({payload.role.value})",
        metadata={
            "username": payload.username,
            "role": payload.role.value,
        },
    )

    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active,
    )


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_role(
    user_id: int,
    new_role: UserRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
) -> UserResponse:
    """Update user role (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    user.role = new_role

    # Log action
    log_action(
        db,
        current_user,
        AuditActionType.UPDATE,
        AuditEntityType.user,
        f"User role changed: {user.username} from {old_role.value} to {new_role.value}",
        entity_id=user_id,
        metadata={
            "username": user.username,
            "old_role": old_role.value,
            "new_role": new_role.value,
        },
    )

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
    )


@router.patch("/{user_id}/status", response_model=UserResponse)
def update_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
) -> UserResponse:
    """Activate/deactivate user (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = is_active

    # Log action
    log_action(
        db,
        current_user,
        AuditActionType.UPDATE,
        AuditEntityType.user,
        f"User status changed: {user.username} - {'activated' if is_active else 'deactivated'}",
        entity_id=user_id,
    )

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
    )
