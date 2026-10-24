from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.pass_record import PassStatus, PassType, Zone, get_allowed_zones, get_zone_number
from app.services.validators import is_valid_phone_number, is_valid_sri_lankan_nic


class PassBase(BaseModel):
    pass_no: str | int | None = Field(default=None, description="Numeric pass number")
    visitor_name: str = Field(min_length=2, max_length=150)
    company_name: str = Field(min_length=2, max_length=150)
    nic_number: str
    contact_number: str
    pass_type: PassType
    zone: Zone | None = None


class PassCreate(PassBase):
    nic_number: str = Field(min_length=10, max_length=12)
    contact_number: str = Field(min_length=10, max_length=13)

    @field_validator("zone")
    @classmethod
    def normalize_zone(cls, value: Zone | None, info):
        if value is None:
            return value
        pass_type = info.data.get("pass_type")
        if pass_type and get_allowed_zones(pass_type) != [1, 2, 3, 4]:
            expected = get_allowed_zones(pass_type)
            zone_number = get_zone_number(value)
            if zone_number not in expected:
                raise ValueError("Selected zone does not match the chosen pass type.")
        return value

    @field_validator("nic_number")
    @classmethod
    def validate_nic(cls, value: str) -> str:
        if not is_valid_sri_lankan_nic(value):
            raise ValueError("Invalid NIC. Use old format (123456789V) or new format (200012345678).")
        return value.upper()

    @field_validator("contact_number")
    @classmethod
    def validate_contact(cls, value: str) -> str:
        if not is_valid_phone_number(value):
            raise ValueError("Invalid phone number. Use 0XXXXXXXXX or +94XXXXXXXXX.")
        return value


class PassCheckout(BaseModel):
    received_time: datetime | None = None


class PassResponse(PassBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sr_no: int
    group_id: int | None = None
    created_by: int | None = None
    pass_type: PassType | None = None
    zone: Zone | None = None
    allowed_zones: list[int] = Field(default_factory=list)
    issued_time: datetime
    received_time: datetime | None
    status: PassStatus
    visitor_type: str | None = None
    visitor_category: str | None = None
    visit_area: list[str] = Field(default_factory=list)


class PassListResponse(BaseModel):
    items: list[PassResponse]
    total: int
    page: int
    page_size: int
