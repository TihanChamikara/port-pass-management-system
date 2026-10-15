"""
External-user authentication — signup & login (email + password).
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.api.deps import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from app.models.user import User, UserRole
from app.schemas.external_auth import ExternalSignup, ExternalLogin, Token, ExternalUserOut

router = APIRouter()


@router.post("/signup", response_model=ExternalUserOut, status_code=status.HTTP_201_CREATED)
def external_signup(
    body: ExternalSignup,
    db: Session = Depends(get_db),
):
    # Check if email already registered (wait, User model doesn't have an email field by default! Let's check models/user.py)
    # Wait, the User model in the real code:
    #     username: Mapped[str]
    #     full_name: Mapped[str]
    #     password_hash: Mapped[str]
    #     role: Mapped[UserRole]
    #     department_id: Mapped[int | None]
    #     is_active: Mapped[bool]
    # IT DOES NOT HAVE AN EMAIL FIELD. We have to use username as email, or something!
    
    # Let's use username as email.
    
    result = db.query(User).filter(User.username == body.email).first()
    if result:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please sign in.",
        )

    user = User(
        username=body.email,
        full_name=body.full_name,
        password_hash=get_password_hash(body.password),
        role=UserRole.public_requester, # public_requester is the correct role from UserRole
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def external_login(
    body: ExternalLogin,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == body.email).first()
    
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support.",
        )
    if user.role != UserRole.public_requester:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This login is for external users only. Staff should use the staff login.",
        )
    token = create_access_token(
        subject=user.username,
        # Let's just use the default expiration since we removed ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return {"access_token": token, "token_type": "bearer"}
