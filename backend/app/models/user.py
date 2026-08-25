from datetime import datetime
from enum import Enum

from sqlalchemy import Enum as SqlEnum, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class UserRole(str, Enum):
    admin = "admin"                                  # Full platform management
    operations_officer = "operations_officer"        # Validates & approves visitor requests
    pass_officer = "pass_officer"                    # Generates & manages passes
    security_gate_officer = "security_gate_officer"  # Verifies entry/exit via QR
    public_requester = "public_requester"            # Public visitor (no login)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole), default=UserRole.operations_officer)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
