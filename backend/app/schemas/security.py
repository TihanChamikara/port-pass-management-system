from pydantic import BaseModel

from app.models.pass_record import Zone


class AccessValidationRequest(BaseModel):
    pass_no: str
    zone: Zone


class AccessValidationResponse(BaseModel):
    access_granted: bool
    message: str