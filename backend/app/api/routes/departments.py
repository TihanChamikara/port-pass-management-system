"""
Departments API Routes

Provides the public GET /departments endpoint for loading department list in the visitor request form.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from typing import Optional

from app.api.deps import get_db
from app.models.department import Department

router = APIRouter(prefix="/api/departments", tags=["departments"])


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    manager_name: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


@router.get(
    "",
    response_model=List[DepartmentResponse],
    summary="List departments",
    description="Public endpoint. Returns all active departments for the visitor request form dropdown.",
)
def list_departments(db: Session = Depends(get_db)):
    """Return active departments ordered by name."""
    return (
        db.query(Department)
        .filter(Department.is_active == True)
        .order_by(Department.name)
        .all()
    )
