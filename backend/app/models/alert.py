from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AlertType(str, Enum):
    overdue = "overdue"
    pending_checkout = "pending_checkout"
    unauthorized_access = "unauthorized_access"


class AlertStatus(str, Enum):
    active = "active"
    resolved = "resolved"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    pass_id: Mapped[int | None] = mapped_column(ForeignKey("passes.id"), nullable=True, index=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("pass_groups.id"), nullable=True, index=True)
    alert_type: Mapped[AlertType] = mapped_column(SqlEnum(AlertType), index=True)
    status: Mapped[AlertStatus] = mapped_column(SqlEnum(AlertStatus), default=AlertStatus.active, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    triggered_by_hours: Mapped[int] = mapped_column(Integer, default=4)
