"""
Audit Service: Handles all audit logging for compliance & tracking
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models import AuditLog, AuditActionType, AuditEntityType, User


def log_action(
    db: Session,
    user: User,
    action_type: AuditActionType,
    entity_type: AuditEntityType,
    details: str,
    entity_id: int | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """
    Log an action to the audit trail.
    
    Args:
        db: Database session
        user: User performing the action
        action_type: Type of action (CREATE, UPDATE, DELETE, LOGIN, CHECKOUT)
        entity_type: Type of entity (pass, group, user)
        details: Human-readable description
        entity_id: ID of the entity being acted upon
        metadata: Additional JSON metadata
        ip_address: Client IP address
    
    Returns:
        AuditLog: Created audit log entry
    """
    audit_log = AuditLog(
        username=user.username,
        user_id=user.id,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        event_metadata=metadata,
        ip_address=ip_address,
    )
    db.add(audit_log)
    # Don't commit here - caller should handle transaction
    return audit_log


class AuditService:
    """Service class for audit logging operations."""

    @staticmethod
    def log_action(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        actor_id: Optional[int] = None,
        actor_name: Optional[str] = None,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log an action for audit trail.
        
        Args:
            db: Database session
            action: Action name (e.g., "REQUEST_CREATED", "TRANSITION_TO_APPROVED")
            entity_type: Type of entity (e.g., "visitor_request")
            entity_id: ID of the entity
            actor_id: ID of user performing action (None for public/system actions)
            actor_name: Name of actor (for public users)
            description: Human-readable description
            metadata: Additional context (JSON)
        """
        try:
            # Create audit log entry in a flexible way
            audit_log = AuditLog(
                action_type=action,
                entity_type=entity_type,
                entity_id=entity_id,
                username=actor_name or "system",
                user_id=actor_id,
                details=description,
                event_metadata=metadata or {},
                timestamp=datetime.utcnow(),
            )
            db.add(audit_log)
            db.commit()
        except Exception as e:
            # Log errors but don't fail the main operation
            print(f"Error logging audit: {e}")
            db.rollback()
