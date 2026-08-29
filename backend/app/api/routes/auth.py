from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import create_access_token, verify_password
from app.models import AuditActionType, AuditEntityType, AuditLog, User
from app.schemas.auth import LoginRequest, TokenResponse, UserMeResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    db.add(
        AuditLog(
            user_id=user.id,
            username=user.username,
            action_type=AuditActionType.LOGIN,
            entity_type=AuditEntityType.user,
            entity_id=user.id,
            details="User logged in",
            event_metadata={"role": user.role.value},
        )
    )
    db.commit()

    token = create_access_token(subject=user.username)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserMeResponse)
def me(current_user: User = Depends(get_current_user)) -> UserMeResponse:
    return UserMeResponse(
        id=current_user.id,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
    )
