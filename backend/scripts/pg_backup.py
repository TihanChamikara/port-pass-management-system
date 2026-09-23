"""PostgreSQL Backup Script with configurable retention.

Usage:
    python pg_backup.py                     # Daily backup
    python pg_backup.py --type weekly       # Weekly backup
    python pg_backup.py --type monthly      # Monthly backup
    python pg_backup.py --restore <file>    # Restore from backup
    python pg_backup.py --verify <file>     # Verify backup integrity
    python pg_backup.py --list              # List all backups
    python pg_backup.py --prune             # Clean up old backups per retention

Configuration is read from the application .env or environment variables.
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Configuration (override via environment) ──────────────────────────

DB_HOST = os.getenv("BACKUP_DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("BACKUP_DB_PORT", "5432")
DB_NAME = os.getenv("BACKUP_DB_NAME", "port_pass_db")
DB_USER = os.getenv("BACKUP_DB_USER", "postgres")
DB_PASSWORD = os.getenv("BACKUP_DB_PASSWORD", "admin123")

BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "backups"))

RETENTION_DAILY = int(os.getenv("BACKUP_RETENTION_DAILY", "14"))
RETENTION_WEEKLY = int(os.getenv("BACKUP_RETENTION_WEEKLY", "8"))
RETENTION_MONTHLY = int(os.getenv("BACKUP_RETENTION_MONTHLY", "6"))

LOG_FILE = BACKUP_DIR / "backup.log"


def log(msg: str) -> None:
    timestamp = datetime.now(timezone.utc).isoformat()
    line = f"[{timestamp}] {msg}"
    print(line)
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def run_pg_dump(output_path: Path) -> bool:
    """Run pg_dump and write a custom-format dump."""
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    cmd = [
        "pg_dump",
        "-h", DB_HOST,
        "-p", DB_PORT,
        "-U", DB_USER,
        "-F", "c",  # custom format (compressed, supports pg_restore)
        "-f", str(output_path),
        DB_NAME,
    ]

    log(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if result.returncode != 0:
        log(f"ERROR: pg_dump failed: {result.stderr.strip()}")
        return False

    size_mb = round(output_path.stat().st_size / (1024 * 1024), 2)
    log(f"SUCCESS: Backup created {output_path.name} ({size_mb} MB)")
    return True


def do_backup(backup_type: str = "daily") -> bool:
    """Create a timestamped backup."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    filename = f"portpass_{backup_type}_{timestamp}.dump"
    output_path = BACKUP_DIR / filename

    log(f"Starting {backup_type} backup → {filename}")
    success = run_pg_dump(output_path)

    if success:
        log(f"{backup_type.upper()} backup completed successfully.")
    else:
        log(f"{backup_type.upper()} backup FAILED.")

    return success


def do_verify(filepath: str) -> bool:
    """Verify a backup file's integrity using pg_restore --list."""
    path = Path(filepath)
    if not path.exists():
        log(f"ERROR: File not found: {filepath}")
        return False

    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    cmd = ["pg_restore", "--list", str(path)]
    log(f"Verifying: {path.name}")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if result.returncode != 0:
        log(f"VERIFY FAILED: {result.stderr.strip()}")
        return False

    toc_lines = len(result.stdout.strip().splitlines())
    log(f"VERIFY OK: {path.name} contains {toc_lines} TOC entries")
    return True


def do_restore(filepath: str) -> None:
    """Restore a backup to a SEPARATE recovery database.

    SAFETY: This NEVER overwrites the production database directly.
    It creates/restores into 'port_pass_db_recovery' so the admin
    can inspect it before any production changes.
    """
    path = Path(filepath)
    if not path.exists():
        log(f"ERROR: File not found: {filepath}")
        sys.exit(1)

    recovery_db = f"{DB_NAME}_recovery"
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    # Create recovery database
    log(f"Creating recovery database: {recovery_db}")
    subprocess.run(
        ["createdb", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER, recovery_db],
        env=env, capture_output=True, text=True,
    )

    # Restore into recovery database
    cmd = [
        "pg_restore",
        "-h", DB_HOST,
        "-p", DB_PORT,
        "-U", DB_USER,
        "-d", recovery_db,
        "--clean", "--if-exists",
        str(path),
    ]
    log(f"Restoring {path.name} → {recovery_db}")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if result.returncode != 0:
        log(f"WARNING: pg_restore reported issues: {result.stderr.strip()[:500]}")
    else:
        log(f"Restore completed into database '{recovery_db}'.")

    log("IMPORTANT: Verify the data in the recovery database before touching production.")
    log(f"  Connect: psql -h {DB_HOST} -p {DB_PORT} -U {DB_USER} {recovery_db}")


def do_prune() -> None:
    """Remove old backups based on retention policy."""
    if not BACKUP_DIR.exists():
        log("No backup directory found. Nothing to prune.")
        return

    now = datetime.now(timezone.utc)
    removed = 0

    for f in sorted(BACKUP_DIR.glob("portpass_*.dump")):
        mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
        age_days = (now - mtime).days

        name_lower = f.name.lower()
        if "monthly" in name_lower:
            max_age = RETENTION_MONTHLY * 30
        elif "weekly" in name_lower:
            max_age = RETENTION_WEEKLY * 7
        else:
            max_age = RETENTION_DAILY

        if age_days > max_age:
            log(f"Pruning: {f.name} (age={age_days}d, max={max_age}d)")
            f.unlink()
            removed += 1

    log(f"Pruning complete. Removed {removed} old backup(s).")


def do_list() -> None:
    """List all backup files."""
    if not BACKUP_DIR.exists():
        print("No backup directory found.")
        return

    files = sorted(BACKUP_DIR.glob("portpass_*.dump"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        print("No backups found.")
        return

    print(f"{'Filename':<50} {'Size (MB)':>10} {'Date':>25} {'Type':<10}")
    print("-" * 100)
    for f in files:
        stat = f.stat()
        size_mb = round(stat.st_size / (1024 * 1024), 2)
        dt = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        name_lower = f.name.lower()
        btype = "monthly" if "monthly" in name_lower else "weekly" if "weekly" in name_lower else "daily"
        print(f"{f.name:<50} {size_mb:>10.2f} {dt:>25} {btype:<10}")


def main():
    parser = argparse.ArgumentParser(description="Port Pass DB Backup Manager")
    parser.add_argument("--type", choices=["daily", "weekly", "monthly"], default="daily",
                        help="Backup type (affects naming and retention)")
    parser.add_argument("--restore", metavar="FILE", help="Restore from a backup file into a recovery database")
    parser.add_argument("--verify", metavar="FILE", help="Verify a backup file's integrity")
    parser.add_argument("--list", action="store_true", help="List all available backups")
    parser.add_argument("--prune", action="store_true", help="Remove expired backups per retention policy")
    args = parser.parse_args()

    if args.list:
        do_list()
    elif args.restore:
        do_restore(args.restore)
    elif args.verify:
        success = do_verify(args.verify)
        sys.exit(0 if success else 1)
    elif args.prune:
        do_prune()
    else:
        success = do_backup(args.type)
        # After a successful backup, also prune old ones
        if success:
            do_prune()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
