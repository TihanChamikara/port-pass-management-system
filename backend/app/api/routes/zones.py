from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import User, UserRole, Zone, ZoneCapacity
from app.schemas.zone_capacity import ZoneCapacityResponse, UpdateZoneCapacityRequest

router = APIRouter(prefix="/zones", tags=["Zones"])


@router.get("/capacities", response_model=list[ZoneCapacityResponse])
def get_zone_capacities(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ZoneCapacityResponse]:
    """Get all zone capacities"""
    capacities = []
    for zone in Zone:
        capacity_record = db.query(ZoneCapacity).filter(ZoneCapacity.zone == zone).first()
        capacity = capacity_record.capacity if capacity_record else 0
        capacities.append(ZoneCapacityResponse(zone=zone.value, capacity=capacity))
    return capacities


@router.patch("/capacities/{zone_name}", response_model=ZoneCapacityResponse)
def update_zone_capacity(
    zone_name: str,
    request: UpdateZoneCapacityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ZoneCapacityResponse:
    """Update zone capacity (admin only)"""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update zone capacities"
        )
    
    # Find matching zone
    zone = None
    for z in Zone:
        if z.value == zone_name:
            zone = z
            break
    
    if zone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zone {zone_name} not found"
        )
    
    # Find or create zone capacity record
    capacity_record = db.query(ZoneCapacity).filter(ZoneCapacity.zone == zone).first()
    if not capacity_record:
        capacity_record = ZoneCapacity(zone=zone, capacity=request.capacity)
        db.add(capacity_record)
    else:
        capacity_record.capacity = request.capacity
    
    db.commit()
    db.refresh(capacity_record)
    
    return ZoneCapacityResponse(zone=capacity_record.zone.value, capacity=capacity_record.capacity)
