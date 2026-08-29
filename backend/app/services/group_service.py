"""
Group Pass Service: Handles group pass creation, visitor management, and completion
"""

from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import AuditActionType, AuditEntityType, PassRecord, PassGroup, PassStatus, PassGroupStatus, PassType, User, UserRole, Zone
from app.schemas.pass_group import PassGroupCreate, PassGroupAddVisitors, VisitorInfo
from app.services.audit_service import log_action
from app.services.pass_classification import derive_allowed_zones, derive_zone
from app.services.pass_service import generate_pass_number


def generate_group_id() -> str:
    """Generate unique group ID: G-YYYYMMDD-XXXXX"""
    from datetime import datetime, timezone

    today = datetime.now(timezone.utc)
    date_str = today.strftime("%Y%m%d")
    prefix = f"G-{date_str}-"

    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        last_group_id = (
            db.query(PassGroup.group_id)
            .filter(PassGroup.group_id.like(f"{prefix}%"))
            .order_by(PassGroup.group_id.desc())
            .first()
        )
        if last_group_id and last_group_id[0]:
            sequence = int(last_group_id[0].split("-")[-1]) + 1
        else:
            sequence = 1
        return f"{prefix}{str(sequence).zfill(5)}"
    finally:
        db.close()


def create_group_pass(
    db: Session,
    group_data: PassGroupCreate,
    current_user: User,
) -> PassGroup:
    """
    Create a group pass record (Step 1).
    
    Args:
        db: Database session
        group_data: Group creation data
        current_user: User creating the group
    
    Returns:
        Created PassGroup
    """
    group_id = generate_group_id()

    new_group = PassGroup(
        group_id=group_id,
        requested_by=group_data.requested_by,
        company_name=group_data.company_name,
        pass_type=group_data.pass_type,
        allowed_zones=derive_allowed_zones(group_data.pass_type),
        zone=group_data.zone.value if group_data.zone else (derive_zone(group_data.pass_type).value if derive_zone(group_data.pass_type) else Zone.zone_1.value),
        num_visitors=group_data.num_visitors,
        status=PassGroupStatus.draft,
        created_by=current_user.id,
        notes=group_data.notes,
    )

    if group_data.pass_type == PassType.purple and current_user.role != UserRole.admin:
        raise ValueError("Only Admin can issue Purple (ALL ACCESS) passes")

    if group_data.zone and group_data.pass_type != PassType.purple:
        expected_zone = derive_zone(group_data.pass_type)
        if current_user.role != UserRole.admin and expected_zone and group_data.zone != expected_zone:
            raise ValueError("Selected zone does not match the chosen pass type")

    db.add(new_group)

    # Log action
    log_action(
        db,
        current_user,
        AuditActionType.CREATE,
        AuditEntityType.pass_group,
        f"Group pass created: {group_id}",
        metadata={
            "group_id": group_id,
            "num_visitors": group_data.num_visitors,
            "zone": group_data.zone,
        },
    )

    db.commit()
    db.refresh(new_group)
    return new_group


def add_visitors_to_group(
    db: Session,
    group_id: int,
    visitors_data: PassGroupAddVisitors,
    current_user: User,
) -> list[PassRecord]:
    """
    Add visitors to a group and create individual pass records (Step 2).
    Performs atomic transaction - if one visitor fails, all are rolled back.
    
    Args:
        db: Database session
        group_id: ID of the group
        visitors_data: List of visitor information
        current_user: User adding visitors
    
    Returns:
        List of created PassRecords
    
    Raises:
        HTTPException: If group not found or already has passes
    """
    group = db.query(PassGroup).filter(PassGroup.id == group_id).first()
    if not group:
        raise ValueError("Group not found")

    if group.status != PassGroupStatus.draft:
        raise ValueError("Can only add visitors to draft groups")

    # Check if visitors already added
    existing_passes = db.query(PassRecord).filter(
        PassRecord.group_id == group_id
    ).count()
    if existing_passes > 0:
        raise ValueError("Visitors already added to this group")

    # Get next serial number
    last_sr_no = db.query(func.max(PassRecord.sr_no)).scalar() or 0

    # Query last pass number sequence for today once, to increment sequentially
    today = datetime.now(timezone.utc)
    date_str = today.strftime("%Y%m%d")
    prefix = f"P-{date_str}-"

    last_pass_no = (
        db.query(PassRecord.pass_no)
        .filter(PassRecord.pass_no.like(f"{prefix}%"))
        .order_by(PassRecord.pass_no.desc())
        .first()
    )
    if last_pass_no and last_pass_no[0]:
        start_sequence = int(last_pass_no[0].split("-")[-1]) + 1
    else:
        start_sequence = 1

    created_passes = []
    try:
        for idx, visitor in enumerate(visitors_data.visitors):
            sr_no = last_sr_no + idx + 1
            seq = start_sequence + idx
            pass_no = f"{prefix}{str(seq).zfill(5)}"

            new_pass = PassRecord(
                sr_no=sr_no,
                pass_no=pass_no,
                group_id=group_id,
                pass_type=group.pass_type,
                allowed_zones=group.allowed_zones,
                visitor_name=visitor.visitor_name,
                company_name=group.company_name,
                nic_number=visitor.nic_number,
                contact_number=visitor.contact_number,
                zone=Zone(group.zone) if group.zone else (derive_zone(group.pass_type) or Zone.zone_1),
                issued_time=datetime.now(timezone.utc),
                status=PassStatus.pending,
                created_by=current_user.id,
            )
            db.add(new_pass)
            created_passes.append(new_pass)

        # Update group status to pending_approval
        group.status = PassGroupStatus.pending_approval

        # Log action
        log_action(
            db,
            current_user,
            AuditActionType.CREATE,
            AuditEntityType.pass_record,
            f"Added {len(created_passes)} visitors to group {group.group_id}",
            entity_id=group_id,
            metadata={
                "group_id": group.group_id,
                "num_visitors": len(created_passes),
                "pass_type": group.pass_type.value,
            },
        )

        db.commit()
        return created_passes

    except Exception as e:
        db.rollback()
        raise e


def complete_group(
    db: Session,
    group_id: int,
    current_user: User,
) -> PassGroup | None:
    """
    Mark a group as completed when all passes are checked out.
    
    Args:
        db: Database session
        group_id: ID of group to complete
        current_user: User completing the group
    
    Returns:
        Updated PassGroup or None if not found
    """
    group = db.query(PassGroup).filter(PassGroup.id == group_id).first()
    if not group:
        return None

    # Check if all passes are completed
    active_passes = db.query(PassRecord).filter(
        PassRecord.group_id == group_id,
        PassRecord.status != PassStatus.completed,
    ).count()

    if active_passes > 0:
        raise ValueError("Cannot complete group while passes are still active")

    group.status = PassGroupStatus.completed
    group.completed_at = datetime.now(timezone.utc)

    # Log action
    log_action(
        db,
        current_user,
        AuditActionType.UPDATE,
        AuditEntityType.pass_group,
        f"Group {group.group_id} marked as completed",
        entity_id=group_id,
    )

    db.commit()
    db.refresh(group)
    return group


def remove_visitor_from_group(
    db: Session,
    group_id: int,
    pass_id: int,
    current_user: User,
) -> PassRecord | None:
    """
    Remove a visitor from a group (delete the pass).
    Only allowed if group is still in draft status.
    
    Args:
        db: Database session
        group_id: ID of group
        pass_id: ID of pass to remove
        current_user: User removing visitor
    
    Returns:
        Deleted PassRecord or None if not found
    """
    pass_record = db.query(PassRecord).filter(
        PassRecord.id == pass_id,
        PassRecord.group_id == group_id,
    ).first()

    if not pass_record:
        return None

    group = db.query(PassGroup).filter(PassGroup.id == group_id).first()
    if group and group.status != PassGroupStatus.draft:
        raise ValueError("Can only remove visitors from draft groups")

    # Log action
    log_action(
        db,
        current_user,
        AuditActionType.DELETE,
        AuditEntityType.pass_record,
        f"Visitor {pass_record.visitor_name} removed from group {group.group_id}",
        entity_id=pass_id,
        metadata={
            "pass_no": pass_record.pass_no,
            "visitor_name": pass_record.visitor_name,
        },
    )

    db.delete(pass_record)
    db.commit()
    return pass_record


def get_group_passes(db: Session, group_id: int) -> list[PassRecord]:
    """Get all passes for a group."""
    return db.query(PassRecord).filter(
        PassRecord.group_id == group_id
    ).order_by(PassRecord.sr_no).all()


def approve_group(
    db: Session,
    group_id: int,
    current_user: User,
) -> PassGroup | None:
    """Approve group pass request and activate all passes."""
    group = db.query(PassGroup).filter(PassGroup.id == group_id).first()
    if not group:
        return None

    if group.status != PassGroupStatus.pending_approval:
        raise ValueError("Group pass request is not pending approval")

    group.status = PassGroupStatus.issued

    # Activate all passes in this group
    passes = get_group_passes(db, group_id)
    for p in passes:
        p.status = PassStatus.active

    log_action(
        db,
        current_user,
        AuditActionType.UPDATE,
        AuditEntityType.pass_group,
        f"Group pass approved: {group.group_id}",
        entity_id=group_id,
        metadata={"group_id": group.group_id, "num_visitors": len(passes)},
    )

    db.commit()
    db.refresh(group)
    return group


def reject_group(
    db: Session,
    group_id: int,
    current_user: User,
) -> PassGroup | None:
    """Reject group pass request and delete draft passes."""
    group = db.query(PassGroup).filter(PassGroup.id == group_id).first()
    if not group:
        return None

    if group.status != PassGroupStatus.pending_approval:
        raise ValueError("Group pass request is not pending approval")

    group.status = PassGroupStatus.rejected

    # Delete the pending passes created for this group
    passes = get_group_passes(db, group_id)
    for p in passes:
        db.delete(p)

    log_action(
        db,
        current_user,
        AuditActionType.UPDATE,
        AuditEntityType.pass_group,
        f"Group pass rejected: {group.group_id}",
        entity_id=group_id,
        metadata={"group_id": group.group_id, "num_visitors": len(passes)},
    )

    db.commit()
    db.refresh(group)
    return group
