from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin_or_security
from app.models import AuditActionType, AuditEntityType, AuditLog, PassRecord, User, Zone, check_access
from app.schemas.security import AccessValidationRequest, AccessValidationResponse

router = APIRouter(tags=["Security"])


@router.post("/validate-access")
def validate_access(
    payload: AccessValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_security()),
) -> AccessValidationResponse:
    record = db.query(PassRecord).filter(PassRecord.pass_no == payload.pass_no).first()
    if not record:
        return AccessValidationResponse(access_granted=False, message="Pass not found")

    granted = check_access(record, payload.zone)
    details = f"Access {'granted' if granted else 'denied'} for pass {payload.pass_no} in {payload.zone.value}"

    db.add(
        AuditLog(
            user_id=current_user.id,
            username=current_user.username,
            action_type=AuditActionType.VALIDATE_ACCESS,
            entity_type=AuditEntityType.access_check,
            entity_id=record.id,
            details=details,
            event_metadata={
                    "pass_no": payload.pass_no,
                "pass_type": record.pass_type.value,
                    "requested_zone": payload.zone.value,
                "access_granted": granted,
            },
        )
    )

    if not granted:
        db.add(
            AuditLog(
                user_id=current_user.id,
                username=current_user.username,
                action_type=AuditActionType.UNAUTHORIZED_ACCESS,
                entity_type=AuditEntityType.access_check,
                entity_id=record.id,
                details=details,
                event_metadata={
                    "pass_no": payload.pass_no,
                    "pass_type": record.pass_type.value,
                    "requested_zone": payload.zone.value,
                },
            )
        )

    db.commit()

    return AccessValidationResponse(access_granted=granted, message="Access granted" if granted else "Access denied")