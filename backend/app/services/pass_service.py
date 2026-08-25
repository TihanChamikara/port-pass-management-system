"""
Pass Service: Handles single pass creation, retrieval, and checkout
"""

from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import AuditActionType, AuditEntityType, PassRecord, PassStatus, PassType, User, UserRole, Zone
from app.services.pass_classification import derive_allowed_zones, derive_zone
from app.schemas.pass_record import PassCreate
from app.services.audit_service import log_action


def generate_pass_number() -> str:
    """Generate unique pass number: P-YYYYMMDD-XXXXX"""
    from datetime import datetime, timezone

    today = datetime.now(timezone.utc)
    date_str = today.strftime("%Y%m%d")
    prefix = f"P-{date_str}-"

    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        last_pass_no = (
            db.query(PassRecord.pass_no)
            .filter(PassRecord.pass_no.like(f"{prefix}%"))
            .order_by(PassRecord.pass_no.desc())
            .first()
        )
        if last_pass_no and last_pass_no[0]:
            sequence = int(last_pass_no[0].split("-")[-1]) + 1
        else:
            sequence = 1
        return f"{prefix}{str(sequence).zfill(5)}"
    finally:
        db.close()


def create_single_pass(
    db: Session,
    pass_data: PassCreate,
    current_user: User,
) -> PassRecord:
    """
    Create a single pass record.
    
    Args:
        db: Database session
        pass_data: Pass creation data
        current_user: User creating the pass
    
    Returns:
        Created PassRecord
    """
    # Format pass number: just the numeric part (3 digits)
    if pass_data.pass_no:
        numeric_part = str(pass_data.pass_no).zfill(3)
        pass_no = numeric_part
    else:
        # Auto-generate pass number
        pass_no = generate_pass_number()

    # Get next serial number
    last_sr_no = db.query(func.max(PassRecord.sr_no)).scalar() or 0

    if pass_data.pass_type == PassType.purple and current_user.role != UserRole.admin:
        raise ValueError("Only Admin can issue Purple (ALL ACCESS) passes")

    allowed_zones = derive_allowed_zones(pass_data.pass_type)
    zone = pass_data.zone or derive_zone(pass_data.pass_type) or Zone.zone_1
    if pass_data.pass_type != PassType.purple and zone is None:
        zone = derive_zone(pass_data.pass_type)

    if pass_data.zone and pass_data.pass_type != PassType.purple:
        expected_zone = derive_zone(pass_data.pass_type)
        if current_user.role != UserRole.admin and expected_zone and pass_data.zone != expected_zone:
            raise ValueError("Selected zone does not match the chosen pass type")

    # Create pass record
    new_pass = PassRecord(
        sr_no=last_sr_no + 1,
        pass_no=pass_no,
        pass_type=pass_data.pass_type,
        allowed_zones=allowed_zones,
        visitor_name=pass_data.visitor_name,
        company_name=pass_data.company_name,
        nic_number=pass_data.nic_number,
        contact_number=pass_data.contact_number,
        zone=zone,
        issued_time=datetime.now(timezone.utc),
        status=PassStatus.active,
        created_by=current_user.id,
    )

    db.add(new_pass)

    # Log action
    log_action(
        db,
        current_user,
        AuditActionType.CREATE,
        AuditEntityType.pass_record,
        f"Single pass created: {pass_no}",
        metadata={
            "pass_no": pass_no,
            "visitor_name": pass_data.visitor_name,
            "pass_type": pass_data.pass_type.value,
            "allowed_zones": allowed_zones,
        },
    )

    db.commit()
    db.refresh(new_pass)
    return new_pass


def mark_pass_checkout(
    db: Session,
    pass_id: int,
    current_user: User,
    received_time: datetime | None = None,
) -> PassRecord | None:
    """
    Mark a pass as received/checked out.
    
    Args:
        db: Database session
        pass_id: ID of pass to checkout
        current_user: User performing checkout
        received_time: Time of receipt (defaults to now)
    
    Returns:
        Updated PassRecord or None if not found
    """
    pass_record = db.query(PassRecord).filter(PassRecord.id == pass_id).first()
    if not pass_record:
        return None

    received_time = received_time or datetime.now(timezone.utc)
    pass_record.received_time = received_time
    pass_record.status = PassStatus.completed

    # Auto-resolve alerts for this pass
    from app.services.alert_service import auto_resolve_pass_alerts
    auto_resolve_pass_alerts(db, pass_id)

    # Log action
    log_action(
        db,
        current_user,
        AuditActionType.CHECKOUT,
        AuditEntityType.pass_record,
        f"Pass {pass_record.pass_no} checked out",
        entity_id=pass_id,
        metadata={
            "pass_no": pass_record.pass_no,
            "received_time": received_time.isoformat(),
        },
    )

    db.commit()
    db.refresh(pass_record)
    return pass_record
