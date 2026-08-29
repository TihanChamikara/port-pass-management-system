from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.audit_log import AuditActionType, AuditEntityType


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    user_id: int | None = None
    action_type: AuditActionType
    entity_type: AuditEntityType
    entity_id: int | None
    timestamp: datetime
    metadata: dict | None = Field(default=None, alias="event_metadata")
    details: str
    ip_address: str | None


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
