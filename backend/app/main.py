from fastapi import FastAPI, Request
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging

from app.api.routes import alerts, audit_logs, auth, dashboard, departments, groups, passes_v2, reports, security, users, zones, visitor_requests_v2, notifications
from app.core.security import get_password_hash
from app.core.settings import get_settings
from app.db.database import Base, SessionLocal, engine
from app.db.compat import ensure_passes_schema, ensure_users_schema, ensure_visitor_requests_schema
from app.models import User, UserRole, Zone, ZoneCapacity, Department

settings = get_settings()
app = FastAPI(title=settings.app_name)

logger = logging.getLogger("uvicorn.error")

from fastapi.encoders import jsonable_encoder

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    logger.error(f"Validation error for {request.url.path}: {exc.errors()}")
    logger.error(f"Request body: {body.decode('utf-8', errors='replace')}")
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())}
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(passes_v2.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(security.router, prefix="/api")
app.include_router(audit_logs.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(zones.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
# app.include_router(visitor_requests.router, prefix="/api")  # DEPRECATED: Use visitor_requests_v2 instead
app.include_router(visitor_requests_v2.router)  # NEW: Formal workflow state machine routes with public endpoints
app.include_router(notifications.router, prefix="/api")
app.include_router(departments.router)  # Public: GET /api/departments



@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/time")
def server_time() -> dict[str, str]:
    """Return server UTC time for client synchronization."""
    # Return ISO 8601 UTC string with Z suffix
    now = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    return {"server_time": now}


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_users_schema(engine)
    ensure_passes_schema(engine)
    ensure_visitor_requests_schema(engine)
    seed_departments()  # Must run before seed_users so dept_id FKs can be resolved
    seed_users()


def seed_users() -> None:
    db: Session = SessionLocal()
    try:
        # Admin: Full platform management
        if not db.query(User).filter(User.username == "admin").first():
            db.add(
                User(
                    username="admin",
                    full_name="System Administrator",
                    password_hash=get_password_hash("Admin@123"),
                    role=UserRole.admin,
                )
            )

        # Operations Officer: Validates & approves visitor requests
        if not db.query(User).filter(User.username == "ops_officer").first():
            db.add(
                User(
                    username="ops_officer",
                    full_name="Operations Officer",
                    password_hash=get_password_hash("OpsOfficer@123"),
                    role=UserRole.operations_officer,
                )
            )

        # Pass Officer: Generates & manages passes
        if not db.query(User).filter(User.username == "pass_officer").first():
            db.add(
                User(
                    username="pass_officer",
                    full_name="Pass Officer",
                    password_hash=get_password_hash("PassOfficer@123"),
                    role=UserRole.pass_officer,
                )
            )

        # Security Gate Officer: Verifies entry/exit via QR
        if not db.query(User).filter(User.username == "gate_officer").first():
            db.add(
                User(
                    username="gate_officer",
                    full_name="Security Gate Officer",
                    password_hash=get_password_hash("GateOfficer@123"),
                    role=UserRole.security_gate_officer,
                )
            )

        # Seed zone capacities with default values
        default_capacities = {
            Zone.zone_1: 75,
            Zone.zone_2: 78,
            Zone.zone_3: 79,
            Zone.zone_4: 50,
        }
        
        for zone, capacity in default_capacities.items():
            if not db.query(ZoneCapacity).filter(ZoneCapacity.zone == zone).first():
                db.add(ZoneCapacity(zone=zone, capacity=capacity))

        # Seed department manager accounts (one per department)
        dept_manager_accounts = [
            {"username": "dm_hr",         "full_name": "HR & Admin Manager",          "dept_name": "HR & Administration"},
            {"username": "dm_commercial", "full_name": "Commercial Manager",          "dept_name": "Commercial & Marketing"},
            {"username": "dm_it",         "full_name": "IT Manager",                  "dept_name": "IT"},
            {"username": "dm_engineering","full_name": "Engineering Manager",         "dept_name": "Engineering"},
            {"username": "dm_operations", "full_name": "Operations Manager",          "dept_name": "Operations"},
            {"username": "dm_security",   "full_name": "Security Manager",            "dept_name": "Security"},
            {"username": "dm_project",    "full_name": "Project Manager",             "dept_name": "Project Team"},
            {"username": "dm_hse",        "full_name": "HSE Manager",                 "dept_name": "HSE Department"},
            {"username": "dm_techno",     "full_name": "Techno Commercial Manager",   "dept_name": "Techno Commercial"},
            {"username": "dm_finance",    "full_name": "Finance Manager",             "dept_name": "Finance"},
        ]
        for dm in dept_manager_accounts:
            if not db.query(User).filter(User.username == dm["username"]).first():
                dept = db.query(Department).filter(Department.name == dm["dept_name"]).first()
                db.add(User(
                    username=dm["username"],
                    full_name=dm["full_name"],
                    password_hash=get_password_hash("DeptManager@123"),
                    role=UserRole.department_manager,
                    department_id=dept.id if dept else None,
                ))

        db.commit()
    finally:
        db.close()


def seed_departments() -> None:
    """Seed the departments table with the required departments on startup."""
    db = SessionLocal()
    try:
        default_departments = [
            {"name": "HR & Administration",   "manager_name": "HR Manager"},
            {"name": "Commercial & Marketing", "manager_name": "Commercial Manager"},
            {"name": "IT",                     "manager_name": "IT Manager"},
            {"name": "Engineering",            "manager_name": "Engineering Manager"},
            {"name": "Operations",             "manager_name": "Operations Manager"},
            {"name": "Security",               "manager_name": "Security Manager"},
            {"name": "Project Team",           "manager_name": "Project Manager"},
            {"name": "HSE Department",         "manager_name": "HSE Manager"},
            {"name": "Techno Commercial",      "manager_name": "Techno Commercial Manager"},
            {"name": "Finance",                "manager_name": "Finance Manager"},
        ]
        for dept_data in default_departments:
            if not db.query(Department).filter(Department.name == dept_data["name"]).first():
                db.add(Department(**dept_data))
        db.commit()
    finally:
        db.close()
