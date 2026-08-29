from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, JSON, Sequence, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base

pass_sr_no_seq = Sequence("passes_sr_no_seq")


class Zone(str, Enum):
    zone_1 = "Zone 1"
    zone_2 = "Zone 2"
    zone_3 = "Zone 3"
    zone_4 = "Zone 4"


class PassType(str, Enum):
    blue = "blue"
    red = "red"
    orange = "orange"
    green = "green"
    purple = "purple"


ZONE_NUMBER_MAP: dict[Zone, int] = {
    Zone.zone_1: 1,
    Zone.zone_2: 2,
    Zone.zone_3: 3,
    Zone.zone_4: 4,
}

PASS_TYPE_ALLOWED_ZONES: dict[PassType, list[int]] = {
    PassType.blue: [1],
    PassType.red: [2],
    PassType.orange: [3],
    PassType.green: [4],
    PassType.purple: [1, 2, 3, 4],
}


def get_allowed_zones(pass_type: PassType) -> list[int]:
    return PASS_TYPE_ALLOWED_ZONES[pass_type]


def get_zone_number(zone: Zone | None) -> int | None:
    if zone is None:
        return None
    return ZONE_NUMBER_MAP[zone]


def check_access(pass_record: "PassRecord", zone: Zone | str | int) -> bool:
    if isinstance(zone, Zone):
        zone_number = get_zone_number(zone)
    elif isinstance(zone, int):
        zone_number = zone
    else:
        zone_number = next((number for enum_zone, number in ZONE_NUMBER_MAP.items() if enum_zone.value == zone), None)

    if zone_number is None:
        return False

    allowed = pass_record.allowed_zones or []
    return zone_number in allowed


class PassStatus(str, Enum):
    pending = "pending"
    active = "active"
    completed = "completed"
    overdue = "overdue"


class PassRecord(Base):
    __tablename__ = "passes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sr_no: Mapped[int] = mapped_column(Integer, pass_sr_no_seq, server_default=pass_sr_no_seq.next_value(), index=True, unique=True)
    pass_no: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("pass_groups.id"), nullable=True, index=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    visitor_name: Mapped[str] = mapped_column(String(150), index=True)
    company_name: Mapped[str] = mapped_column(String(150))
    nic_number: Mapped[str] = mapped_column(String(20), index=True)
    contact_number: Mapped[str] = mapped_column(String(20))
    pass_type: Mapped[PassType] = mapped_column(SqlEnum(PassType), index=True)
    allowed_zones: Mapped[list[int]] = mapped_column(JSON, default=list)
    zone: Mapped[Zone | None] = mapped_column(SqlEnum(Zone), nullable=True, index=True)
    issued_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    received_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[PassStatus] = mapped_column(SqlEnum(PassStatus), default=PassStatus.active, index=True)
    qr_code_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # Base64 encoded QR code image or JSON data
