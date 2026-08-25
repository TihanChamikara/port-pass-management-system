from pydantic import BaseModel, Field


class ZoneStat(BaseModel):
    zone: str
    total: int
    active: int
    completed: int


class DashboardResponse(BaseModel):
    today_total: int
    active_total: int
    completed_total: int
    zone_stats: list[ZoneStat]
    pass_type_distribution: dict[str, int]
    zone_access_distribution: dict[str, int]
    zone_capacities: dict[str, int] = Field(default_factory=dict)
