from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AuditActionType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    CHECKOUT = "CHECKOUT"
    VALIDATE_ACCESS = "VALIDATE_ACCESS"
    ASSIGN_TYPE = "ASSIGN_TYPE"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"


class AuditEntityType(str, Enum):
    pass_record = "pass_record"
    pass_group = "pass_group"
    user = "user"
    access_check = "access_check"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    username: Mapped[str] = mapped_column(String(100), index=True)
    action_type: Mapped[AuditActionType] = mapped_column(SqlEnum(AuditActionType), index=True)
    entity_type: Mapped[AuditEntityType] = mapped_column(SqlEnum(AuditEntityType), index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    details: Mapped[str] = mapped_column(Text, default="")
    event_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
