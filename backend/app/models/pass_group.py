from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models.pass_record import PassType


class PassGroupStatus(str, Enum):
    draft = "draft"
    issued = "issued"
    completed = "completed"


class PassGroup(Base):
    __tablename__ = "pass_groups"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    group_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    requested_by: Mapped[str] = mapped_column(String(150))
    company_name: Mapped[str] = mapped_column(String(150))
    pass_type: Mapped[PassType] = mapped_column(SqlEnum(PassType), index=True)
    allowed_zones: Mapped[list[int]] = mapped_column(JSON, default=list)
    zone: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    num_visitors: Mapped[int] = mapped_column(Integer)
    status: Mapped[PassGroupStatus] = mapped_column(SqlEnum(PassGroupStatus), default=PassGroupStatus.draft, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
