from datetime import datetime

from pydantic import BaseModel


class DailyReportItem(BaseModel):
    date: str
    pass_count: int
    single_passes: int = 0
    group_passes: int = 0
    completed: int = 0
    active: int = 0
    overdue: int = 0
    # legacy aliases (optional)
    zone: str | None = None
    company: str | None = None


class ZoneWiseReportItem(BaseModel):
    zone: str
    pass_count: int
    group_passes: int = 0
    completed: int = 0
    completion_rate: float = 0.0


class GroupStatsResponse(BaseModel):
    total_groups: int
    completed_groups: int
    draft_groups: int
    issued_groups: int = 0
    total_visitors: int = 0
    avg_visitors_per_group: float
    completion_rate: float


class DashboardStatsResponse(BaseModel):
    active_passes_count: int
    completed_passes_count: int
    overdue_passes_count: int
    active_groups_count: int
    total_visitors_in_groups: int
    zone_distribution: dict[str, int]
    pass_type_distribution: dict[str, int]
    zone_access_distribution: dict[str, int]
    today_pass_count: int
    week_pass_count: int


class PassTypeUsageItem(BaseModel):
    pass_type: str
    pass_count: int
    zone_access_count: int


class AccessViolationItem(BaseModel):
    timestamp: datetime
    pass_no: str | None = None
    pass_type: str | None = None
    requested_zone: str | None = None
    username: str | None = None
    details: str


class ExportReportRequest(BaseModel):
    format: str = "csv"  # csv, excel
    report_type: str  # daily, zone_wise, group_stats
    date_from: str | None = None
    date_to: str | None = None
    zone: str | None = None
    company: str | None = None
