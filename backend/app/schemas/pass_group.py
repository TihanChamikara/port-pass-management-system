from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.pass_group import PassGroupStatus
from app.models.pass_record import PassType, Zone


class VisitorInfo(BaseModel):
    """Visitor information for group passes"""

    visitor_name: str = Field(min_length=2, max_length=150)
    nic_number: str = Field(min_length=10, max_length=12)
    contact_number: str = Field(min_length=10, max_length=13)


class PassGroupCreate(BaseModel):
    """Create pass group (Step 1)"""

    requested_by: str = Field(min_length=2, max_length=150)
    company_name: str = Field(min_length=2, max_length=150)
    pass_type: PassType
    zone: Zone | None = None
    num_visitors: int = Field(ge=1, le=100)
    notes: str | None = None


class PassGroupAddVisitors(BaseModel):
    """Add visitors to group (Step 2)"""

    visitors: list[VisitorInfo] = Field(min_items=1, max_items=100)


class PassGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: str
    requested_by: str
    company_name: str
    pass_type: PassType
    allowed_zones: list[int]
    zone: Zone | None
    num_visitors: int
    status: PassGroupStatus
    created_by: int
    created_at: datetime
    completed_at: datetime | None
    notes: str | None


class PassGroupListResponse(BaseModel):
    items: list[PassGroupResponse]
    total: int
    page: int
    page_size: int


class PassGroupDetailResponse(PassGroupResponse):
    """Group details with associated passes"""

    passes: list = Field(default_factory=list)
