from pydantic import BaseModel


class ZoneCapacityResponse(BaseModel):
    zone: str
    capacity: int

    class Config:
        from_attributes = True


class UpdateZoneCapacityRequest(BaseModel):
    capacity: int
