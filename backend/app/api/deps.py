from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db_session
from app.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_db(db: Session = Depends(get_db_session)) -> Session:
    return db


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    username = decode_access_token(token)
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been deactivated. Please contact an administrator.",
        )
    return user


def require_roles(roles: list[UserRole]):
    def _role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges")
        return current_user

    return _role_checker


def require_admin() -> callable:
    return require_roles([UserRole.admin])


def require_admin_or_staff() -> callable:
    return require_roles([UserRole.admin, UserRole.operations_officer, UserRole.pass_officer])


def require_group_pass_issuer() -> callable:
    """Authorized to issue group passes: Department Managers & Admins."""
    return require_roles([UserRole.admin, UserRole.department_manager])


def require_admin_or_security() -> callable:
    return require_roles([UserRole.admin, UserRole.security_gate_officer])


# Enterprise role-based access control (per spec)
def require_operations_officer() -> callable:
    """Operations Officer: Validates & approves visitor requests."""
    return require_roles([UserRole.operations_officer, UserRole.admin])


def require_pass_officer() -> callable:
    """Pass Officer: Generates & manages passes."""
    return require_roles([UserRole.pass_officer, UserRole.admin])


def require_security_gate_officer() -> callable:
    """Security Gate Officer: Verifies entry/exit via QR."""
    return require_roles([UserRole.security_gate_officer, UserRole.admin])


def require_staff_role() -> callable:
    """Any staff role (operations, pass, or security gate officer, or admin)."""
    return require_roles([
        UserRole.admin,
        UserRole.operations_officer,
        UserRole.pass_officer,
        UserRole.security_gate_officer,
    ])


def require_coordinator() -> callable:
    """Department Coordinator: Submits internal visitor requests on behalf of their department."""
    return require_roles([UserRole.department_coordinator, UserRole.admin])

