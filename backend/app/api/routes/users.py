"""
User Management Routes: Handle user CRUD and role management (Admin only)
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin, require_coordinator
from app.core.security import get_password_hash
from app.models import User, UserRole
from app.models.department import Department
from app.services.audit_service import log_action
from app.models.audit_log import AuditActionType, AuditEntityType
from pydantic import BaseModel


class UserStatusUpdate(BaseModel):
    is_active: bool

router = APIRouter(prefix="/users", tags=["Users"])



class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: UserRole
    department_id: int | None = None
    represented_hod_id: int | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    department_id: int | None = None
    represented_hod_id: int | None = None


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
                department_id=u.department_id,
                represented_hod_id=u.represented_hod_id,
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
        department_id=payload.department_id,
        represented_hod_id=payload.represented_hod_id,
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
        department_id=new_user.department_id,
        represented_hod_id=new_user.represented_hod_id,
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
        department_id=user.department_id,
        represented_hod_id=user.represented_hod_id,
    )


@router.patch("/{user_id}/status", response_model=UserResponse)
def update_status(
    user_id: int,
    is_active: Optional[bool] = Query(None),
    payload: Optional[UserStatusUpdate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
) -> UserResponse:
    """Activate/deactivate user (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    target_status = payload.is_active if payload is not None else is_active
    if target_status is None:
        raise HTTPException(status_code=400, detail="is_active parameter or body is required")

    if current_user.id == user_id and not target_status:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own administrator account")

    user.is_active = target_status

    # Log action
    log_action(
        db,
        current_user,
        AuditActionType.UPDATE,
        AuditEntityType.user,
        f"User status changed: {user.username} - {'activated' if target_status else 'deactivated'}",
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
        department_id=user.department_id,
        represented_hod_id=user.represented_hod_id,
    )


# ============================================================================
# COORDINATOR ASSIGNMENT (Admin only)
# ============================================================================

class CoordinatorAssignment(BaseModel):
    department_id: int
    represented_hod_id: Optional[int] = None


class CoordinatorInfo(BaseModel):
    coordinator_id: int
    coordinator_name: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    represented_hod_id: Optional[int] = None
    represented_hod_name: Optional[str] = None


@router.patch("/{user_id}/coordinator-assignment", response_model=UserResponse)
def update_coordinator_assignment(
    user_id: int,
    payload: CoordinatorAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
) -> UserResponse:
    """
    Admin only: Assign or update a Coordinator's department and represented HOD.
    Enforces one active coordinator per department.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.role != UserRole.department_coordinator:
        raise HTTPException(status_code=400, detail="User is not a Department Coordinator")

    # Enforce: only one active coordinator per department
    existing = (
        db.query(User)
        .filter(
            User.role == UserRole.department_coordinator,
            User.department_id == payload.department_id,
            User.is_active == True,
            User.id != user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Department already has an active coordinator: {existing.full_name} ({existing.username})"
        )

    # Validate department exists
    dept = db.query(Department).filter(Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Validate HOD exists if provided
    if payload.represented_hod_id:
        hod = db.query(User).filter(User.id == payload.represented_hod_id).first()
        if not hod:
            raise HTTPException(status_code=404, detail="Represented HOD user not found")

    old_dept = target_user.department_id
    target_user.department_id = payload.department_id
    target_user.represented_hod_id = payload.represented_hod_id

    log_action(
        db,
        current_user,
        AuditActionType.UPDATE,
        AuditEntityType.user,
        f"Coordinator assignment updated: {target_user.username} → dept_id={payload.department_id}, hod_id={payload.represented_hod_id}",
        entity_id=user_id,
        metadata={
            "username": target_user.username,
            "old_department_id": old_dept,
            "new_department_id": payload.department_id,
            "represented_hod_id": payload.represented_hod_id,
        },
    )

    db.commit()
    db.refresh(target_user)

    return UserResponse(
        id=target_user.id,
        username=target_user.username,
        full_name=target_user.full_name,
        role=target_user.role,
        is_active=target_user.is_active,
        department_id=target_user.department_id,
        represented_hod_id=target_user.represented_hod_id,
    )


@router.get("/coordinator-info", response_model=CoordinatorInfo)
def get_coordinator_info(
    current_user: User = Depends(require_coordinator()),
    db: Session = Depends(get_db),
) -> CoordinatorInfo:
    """
    Returns the authenticated coordinator's department and HOD info.
    Used by the Coordinator Dashboard to display read-only identity.
    """
    dept_name = None
    if current_user.department_id:
        dept = db.query(Department).filter(Department.id == current_user.department_id).first()
        if dept:
            dept_name = dept.name

    hod_name = None
    if current_user.represented_hod_id:
        hod = db.query(User).filter(User.id == current_user.represented_hod_id).first()
        if hod:
            hod_name = hod.full_name

    return CoordinatorInfo(
        coordinator_id=current_user.id,
        coordinator_name=current_user.full_name,
        department_id=current_user.department_id,
        department_name=dept_name,
        represented_hod_id=current_user.represented_hod_id,
        represented_hod_name=hod_name,
    )
