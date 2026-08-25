from fastapi import FastAPI
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.routes import alerts, audit_logs, auth, dashboard, groups, passes_v2, reports, security, users, zones, visitor_requests_v2, notifications
from app.core.security import get_password_hash
from app.core.settings import get_settings
from app.db.database import Base, SessionLocal, engine
from app.db.compat import ensure_passes_schema, ensure_users_schema
from app.models import User, UserRole, Zone, ZoneCapacity

settings = get_settings()
app = FastAPI(title=settings.app_name)

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
                    password_hash=get_password_hash("OpOfficer@123"),
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

        db.commit()
    finally:
        db.close()
