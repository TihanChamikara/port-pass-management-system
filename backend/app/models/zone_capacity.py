from sqlalchemy import Integer, Enum as SqlEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models import Zone


class ZoneCapacity(Base):
    __tablename__ = "zone_capacities"
    __table_args__ = (UniqueConstraint("zone", name="zone_capacity_unique"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    zone: Mapped[Zone] = mapped_column(SqlEnum(Zone), unique=True, index=True)
    capacity: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<ZoneCapacity zone={self.zone.value} capacity={self.capacity}>"
