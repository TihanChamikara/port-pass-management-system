"""
Department Model: Represents organisational departments that visitor requests can be routed to.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Department(Base):
    """Organisational department — visitor requests are routed to the matching department manager."""
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(500))
    manager_name: Mapped[str | None] = mapped_column(String(150))   # Display name of the manager
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
