"""System Health & HA/DR Monitoring endpoints.

Provides real-time status information for the administrator
System-Health Dashboard including application, database,
replication, backup, and disk-usage metrics.
"""

from __future__ import annotations

import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.settings import get_settings
from app.db.database import SessionLocal

router = APIRouter(prefix="/api/system-health", tags=["System Health"])
settings = get_settings()


# ── Response Models ───────────────────────────────────────────────────

class ComponentStatus(BaseModel):
    status: str  # ONLINE / OFFLINE / HEALTHY / WARNING / FAILED / SUCCESS / UNKNOWN
    detail: Optional[str] = None


class ReplicationStatus(BaseModel):
    status: str  # HEALTHY / WARNING / FAILED / NOT_CONFIGURED
    delay_seconds: Optional[float] = None
    detail: Optional[str] = None


class BackupInfo(BaseModel):
    status: str  # SUCCESS / FAILED / NO_BACKUPS
    last_backup_time: Optional[str] = None
    last_backup_file: Optional[str] = None
    total_backups: int = 0
    detail: Optional[str] = None


class DiskInfo(BaseModel):
    status: str  # HEALTHY / WARNING / CRITICAL
    total_gb: float
    used_gb: float
    free_gb: float
    usage_percent: float


class SystemHealthResponse(BaseModel):
    server_role: str
    timestamp: str
    application: ComponentStatus
    database: ComponentStatus
    replication: ReplicationStatus
    backup: BackupInfo
    disk: DiskInfo
    server: ComponentStatus
    warnings: list[str] = []


class FailoverStep(BaseModel):
    step: int
    action: str
    status: str  # PENDING / IN_PROGRESS / DONE / SKIPPED / FAILED
    detail: Optional[str] = None


class FailoverChecklistResponse(BaseModel):
    steps: list[FailoverStep]
    ready: bool


class BackupEntry(BaseModel):
    filename: str
    size_mb: float
    created: str
    backup_type: str  # daily / weekly / monthly


class BackupListResponse(BaseModel):
    backups: list[BackupEntry]
    retention: dict


# ── Helpers ───────────────────────────────────────────────────────────

def _get_db() -> Session:
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise


def _check_database() -> ComponentStatus:
    db = None
    try:
        db = _get_db()
        db.execute(text("SELECT 1"))
        return ComponentStatus(status="ONLINE", detail="Database responding normally")
    except Exception as exc:
        return ComponentStatus(status="OFFLINE", detail=str(exc)[:200])
    finally:
        if db:
            db.close()


def _check_replication() -> ReplicationStatus:
    """Check PostgreSQL streaming replication status.

    On a PRIMARY server we query pg_stat_replication.
    On a STANDBY server we query pg_stat_wal_receiver.
    """
    if settings.server_role == "primary":
        return _check_replication_primary()
    return _check_replication_standby()


def _check_replication_primary() -> ReplicationStatus:
    db = None
    try:
        db = _get_db()
        result = db.execute(text("""
            SELECT client_addr,
                   state,
                   sent_lsn,
                   write_lsn,
                   flush_lsn,
                   replay_lsn,
                   EXTRACT(EPOCH FROM (now() - write_lag))::float AS write_lag_secs
            FROM pg_stat_replication
            LIMIT 1
        """)).fetchone()

        if result is None:
            if settings.standby_host:
                return ReplicationStatus(
                    status="FAILED",
                    detail="Standby configured but no replication connection found",
                )
            return ReplicationStatus(
                status="NOT_CONFIGURED",
                detail="No standby server configured",
            )

        lag = result.write_lag_secs or 0.0
        state = result.state or "unknown"

        if state != "streaming":
            return ReplicationStatus(
                status="WARNING",
                delay_seconds=lag,
                detail=f"Replication state: {state}",
            )

        if lag > settings.replication_lag_critical:
            return ReplicationStatus(
                status="FAILED",
                delay_seconds=lag,
                detail=f"Replication lag {lag:.1f}s exceeds critical threshold ({settings.replication_lag_critical}s)",
            )
        if lag > settings.replication_lag_warning:
            return ReplicationStatus(
                status="WARNING",
                delay_seconds=lag,
                detail=f"Replication lag {lag:.1f}s exceeds warning threshold ({settings.replication_lag_warning}s)",
            )

        return ReplicationStatus(
            status="HEALTHY",
            delay_seconds=lag,
            detail=f"Streaming to {result.client_addr}, lag {lag:.1f}s",
        )
    except Exception as exc:
        return ReplicationStatus(status="FAILED", detail=str(exc)[:200])
    finally:
        if db:
            db.close()


def _check_replication_standby() -> ReplicationStatus:
    db = None
    try:
        db = _get_db()
        result = db.execute(text("""
            SELECT status,
                   conninfo,
                   EXTRACT(EPOCH FROM (now() - last_msg_receipt_time))::float AS lag_secs
            FROM pg_stat_wal_receiver
            LIMIT 1
        """)).fetchone()

        if result is None:
            return ReplicationStatus(
                status="FAILED",
                detail="WAL receiver not running on standby",
            )

        lag = result.lag_secs or 0.0
        if result.status == "streaming":
            return ReplicationStatus(
                status="HEALTHY",
                delay_seconds=lag,
                detail=f"Receiving WAL stream, last message {lag:.1f}s ago",
            )
        return ReplicationStatus(
            status="WARNING",
            delay_seconds=lag,
            detail=f"WAL receiver status: {result.status}",
        )
    except Exception as exc:
        return ReplicationStatus(status="FAILED", detail=str(exc)[:200])
    finally:
        if db:
            db.close()


def _check_backups() -> BackupInfo:
    backup_dir = Path(settings.backup_dir)
    if not backup_dir.exists():
        return BackupInfo(
            status="NO_BACKUPS",
            detail=f"Backup directory {backup_dir} does not exist",
        )

    backup_files = sorted(backup_dir.glob("*.dump"), key=lambda f: f.stat().st_mtime, reverse=True)
    backup_files += sorted(backup_dir.glob("*.sql.gz"), key=lambda f: f.stat().st_mtime, reverse=True)
    backup_files = sorted(backup_files, key=lambda f: f.stat().st_mtime, reverse=True)

    if not backup_files:
        return BackupInfo(
            status="NO_BACKUPS",
            total_backups=0,
            detail="No backup files found in backup directory",
        )

    latest = backup_files[0]
    mtime = datetime.fromtimestamp(latest.stat().st_mtime, tz=timezone.utc)
    age_hours = (datetime.now(timezone.utc) - mtime).total_seconds() / 3600

    status = "SUCCESS" if age_hours < 25 else "FAILED"  # stale if > 25h
    detail = f"Latest backup is {age_hours:.1f} hours old" if status == "FAILED" else "Backup is current"

    return BackupInfo(
        status=status,
        last_backup_time=mtime.isoformat(),
        last_backup_file=latest.name,
        total_backups=len(backup_files),
        detail=detail,
    )


def _check_disk() -> DiskInfo:
    try:
        usage = shutil.disk_usage("/" if os.name != "nt" else "C:\\")
        total_gb = round(usage.total / (1024 ** 3), 2)
        used_gb = round(usage.used / (1024 ** 3), 2)
        free_gb = round(usage.free / (1024 ** 3), 2)
        pct = round((usage.used / usage.total) * 100, 1)

        if pct >= settings.disk_critical_threshold:
            status = "CRITICAL"
        elif pct >= settings.disk_warning_threshold:
            status = "WARNING"
        else:
            status = "HEALTHY"

        return DiskInfo(
            status=status,
            total_gb=total_gb,
            used_gb=used_gb,
            free_gb=free_gb,
            usage_percent=pct,
        )
    except Exception:
        return DiskInfo(
            status="UNKNOWN",
            total_gb=0,
            used_gb=0,
            free_gb=0,
            usage_percent=0,
        )


# ── Routes ────────────────────────────────────────────────────────────

@router.get("/", response_model=SystemHealthResponse)
def get_system_health(current_user=Depends(require_admin())):
    """Aggregate system-health dashboard data (admin only)."""
    app_status = ComponentStatus(status="ONLINE", detail="Application is running")
    db_status = _check_database()
    repl_status = _check_replication()
    backup_status = _check_backups()
    disk_status = _check_disk()

    server_status = ComponentStatus(
        status="ONLINE" if db_status.status == "ONLINE" else "DEGRADED",
        detail="All services operational" if db_status.status == "ONLINE" else "Database issue detected",
    )

    warnings: list[str] = []
    if repl_status.status in ("WARNING", "FAILED"):
        warnings.append(f"Replication: {repl_status.detail}")
    if backup_status.status in ("FAILED", "NO_BACKUPS"):
        warnings.append(f"Backup: {backup_status.detail}")
    if db_status.status == "OFFLINE":
        warnings.append(f"Database: {db_status.detail}")
    if disk_status.status in ("WARNING", "CRITICAL"):
        warnings.append(f"Disk: {disk_status.usage_percent}% used")

    return SystemHealthResponse(
        server_role=settings.server_role,
        timestamp=datetime.now(timezone.utc).isoformat(),
        application=app_status,
        database=db_status,
        replication=repl_status,
        backup=backup_status,
        disk=disk_status,
        server=server_status,
        warnings=warnings,
    )


@router.get("/failover-checklist", response_model=FailoverChecklistResponse)
def get_failover_checklist(current_user=Depends(require_admin())):
    """Return the manual failover checklist with pre-flight checks."""
    db_ok = _check_database().status == "ONLINE"
    repl = _check_replication()
    repl_ok = repl.status in ("HEALTHY", "WARNING")

    steps = [
        FailoverStep(step=1, action="Detect primary server failure",
                     status="DONE" if not db_ok else "PENDING",
                     detail="Primary is currently ONLINE" if db_ok else "Primary appears DOWN"),
        FailoverStep(step=2, action="Confirm failure is genuine",
                     status="PENDING", detail="Manual confirmation required"),
        FailoverStep(step=3, action="Prevent split-brain conditions",
                     status="PENDING", detail="Ensure old primary is fully stopped or fenced"),
        FailoverStep(step=4, action="Stop/disable failed primary",
                     status="PENDING", detail="Manual action required"),
        FailoverStep(step=5, action="Confirm latest replication state",
                     status="DONE" if repl_ok else "PENDING",
                     detail=repl.detail or "Check replication lag"),
        FailoverStep(step=6, action="Promote PostgreSQL Standby to Primary",
                     status="PENDING", detail="Run: pg_ctl promote -D $PGDATA"),
        FailoverStep(step=7, action="Activate application services on standby",
                     status="PENDING", detail="Start FastAPI + React on standby server"),
        FailoverStep(step=8, action="Redirect hostname to standby server",
                     status="PENDING", detail="Update DNS/hosts for portpass.local"),
        FailoverStep(step=9, action="Test authentication", status="PENDING"),
        FailoverStep(step=10, action="Test visitor request operations", status="PENDING"),
        FailoverStep(step=11, action="Test approval operations", status="PENDING"),
        FailoverStep(step=12, action="Test pass issuing", status="PENDING"),
        FailoverStep(step=13, action="Test QR verification", status="PENDING"),
        FailoverStep(step=14, action="Test gate check-in", status="PENDING"),
        FailoverStep(step=15, action="Test gate check-out", status="PENDING"),
        FailoverStep(step=16, action="Test reporting", status="PENDING"),
        FailoverStep(step=17, action="Verify audit logging", status="PENDING"),
        FailoverStep(step=18, action="Announce system recovery", status="PENDING"),
    ]

    all_auto_done = db_ok is False and repl_ok  # minimal auto-check
    return FailoverChecklistResponse(steps=steps, ready=all_auto_done)


@router.get("/backups", response_model=BackupListResponse)
def list_backups(current_user=Depends(require_admin())):
    """List all available backups with metadata."""
    backup_dir = Path(settings.backup_dir)
    entries: list[BackupEntry] = []

    if backup_dir.exists():
        for f in sorted(backup_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if f.suffix in (".dump", ".gz"):
                stat = f.stat()
                # Determine backup type from filename convention
                name_lower = f.name.lower()
                if "monthly" in name_lower:
                    btype = "monthly"
                elif "weekly" in name_lower:
                    btype = "weekly"
                else:
                    btype = "daily"

                entries.append(BackupEntry(
                    filename=f.name,
                    size_mb=round(stat.st_size / (1024 * 1024), 2),
                    created=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                    backup_type=btype,
                ))

    return BackupListResponse(
        backups=entries,
        retention={
            "daily": settings.backup_retention_daily,
            "weekly": settings.backup_retention_weekly,
            "monthly": settings.backup_retention_monthly,
        },
    )
