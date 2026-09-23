"""Manual Failover Procedure Script.

This script guides an administrator through the controlled failover
procedure for the Port Visitor Pass Management System.

Usage:
    python failover.py --promote       # Promote standby to primary
    python failover.py --status        # Check current replication status
    python failover.py --rebuild-standby <host>  # Rebuild a repaired server as standby

IMPORTANT:
    - This is a MANUAL/CONTROLLED failover tool.
    - Automatic failover is NOT implemented.
    - Always confirm the failure is genuine before promoting.
    - Never promote while the old primary might still be accepting writes (split-brain).
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime, timezone


DB_HOST = os.getenv("BACKUP_DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("BACKUP_DB_PORT", "5432")
DB_USER = os.getenv("BACKUP_DB_USER", "postgres")
DB_PASSWORD = os.getenv("BACKUP_DB_PASSWORD", "admin123")
PGDATA = os.getenv("PGDATA", "/var/lib/postgresql/data")


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    print(f"[{ts}] {msg}")


def check_is_standby() -> bool:
    """Return True if the local PostgreSQL is in recovery (standby) mode."""
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD
    result = subprocess.run(
        ["psql", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
         "-d", "postgres", "-t", "-A", "-c", "SELECT pg_is_in_recovery();"],
        env=env, capture_output=True, text=True,
    )
    return result.stdout.strip() == "t"


def check_replication_status() -> None:
    """Print the current replication status."""
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    log("Checking local recovery state...")
    is_standby = check_is_standby()
    log(f"  In recovery (standby) mode: {is_standby}")

    if not is_standby:
        log("This server is PRIMARY. Checking for connected standbys...")
        result = subprocess.run(
            ["psql", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
             "-d", "postgres", "-c",
             "SELECT client_addr, state, sent_lsn, write_lsn, replay_lsn, "
             "write_lag, flush_lag, replay_lag FROM pg_stat_replication;"],
            env=env, capture_output=True, text=True,
        )
        print(result.stdout)
    else:
        log("This server is STANDBY. Checking WAL receiver...")
        result = subprocess.run(
            ["psql", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
             "-d", "postgres", "-c",
             "SELECT status, conninfo, last_msg_receipt_time FROM pg_stat_wal_receiver;"],
            env=env, capture_output=True, text=True,
        )
        print(result.stdout)


def promote_standby() -> None:
    """Promote the local PostgreSQL standby to primary."""
    log("=" * 60)
    log("FAILOVER PROMOTION PROCEDURE")
    log("=" * 60)

    # Step 1: Verify we ARE a standby
    if not check_is_standby():
        log("ERROR: This server is NOT a standby. Cannot promote.")
        log("       Promotion can only be run on the STANDBY server.")
        sys.exit(1)

    # Step 2: Confirmation
    log("")
    log("PRE-FLIGHT CHECKS:")
    log("  1. Have you confirmed the primary server has FAILED?")
    log("  2. Have you ensured the primary is STOPPED or FENCED?")
    log("  3. Is the replication lag acceptable?")
    log("")

    response = input("Type 'PROMOTE' to proceed with failover: ").strip()
    if response != "PROMOTE":
        log("Aborted. No changes made.")
        sys.exit(0)

    # Step 3: Promote
    log("Promoting standby to primary...")
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    # Try pg_ctl promote first (most reliable)
    result = subprocess.run(
        ["pg_ctl", "promote", "-D", PGDATA],
        env=env, capture_output=True, text=True,
    )

    if result.returncode == 0:
        log("SUCCESS: PostgreSQL standby promoted to primary.")
    else:
        # Fallback: use SQL function (PostgreSQL 12+)
        log("pg_ctl promote failed, trying SQL promotion...")
        result = subprocess.run(
            ["psql", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
             "-d", "postgres", "-c", "SELECT pg_promote();"],
            env=env, capture_output=True, text=True,
        )
        if result.returncode == 0:
            log("SUCCESS: PostgreSQL standby promoted via pg_promote().")
        else:
            log(f"ERROR: Promotion failed: {result.stderr.strip()}")
            sys.exit(1)

    # Step 4: Verify promotion
    log("Verifying promotion...")
    if not check_is_standby():
        log("CONFIRMED: Server is now PRIMARY.")
    else:
        log("WARNING: Server still appears to be in recovery mode.")

    log("")
    log("NEXT STEPS:")
    log("  1. Start/verify the FastAPI backend on this server")
    log("  2. Start/verify the React frontend on this server")
    log("  3. Update DNS/hosts: portpass.local → this server's IP")
    log("  4. Test authentication, visitor requests, approvals, passes")
    log("  5. Test gate check-in, check-out, reporting, audit logs")
    log("  6. Announce system recovery to users")


def rebuild_standby(primary_host: str) -> None:
    """Rebuild the current server as a standby syncing from the given primary."""
    log("=" * 60)
    log("REBUILD AS STANDBY")
    log("=" * 60)
    log(f"  Primary host: {primary_host}")
    log("")
    log("This will:")
    log(f"  1. Run pg_basebackup from {primary_host}")
    log("  2. Configure this server as a streaming replica")
    log("  3. Start PostgreSQL in standby mode")
    log("")
    log("WARNING: This will ERASE the local PostgreSQL data directory!")
    log("")

    response = input("Type 'REBUILD' to proceed: ").strip()
    if response != "REBUILD":
        log("Aborted. No changes made.")
        sys.exit(0)

    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    # Stop local PostgreSQL
    log("Stopping local PostgreSQL...")
    subprocess.run(["pg_ctl", "stop", "-D", PGDATA, "-m", "fast"], env=env, capture_output=True)

    # Run pg_basebackup
    log(f"Running pg_basebackup from {primary_host}...")
    result = subprocess.run(
        ["pg_basebackup", "-h", primary_host, "-p", DB_PORT,
         "-U", DB_USER, "-D", PGDATA, "-Fp", "-Xs", "-P", "-R"],
        env=env, capture_output=True, text=True,
    )

    if result.returncode != 0:
        log(f"ERROR: pg_basebackup failed: {result.stderr.strip()}")
        sys.exit(1)

    log("pg_basebackup completed. Starting PostgreSQL...")
    subprocess.run(["pg_ctl", "start", "-D", PGDATA, "-l", f"{PGDATA}/logfile"], env=env)

    log("")
    log("Standby rebuild complete. Verify replication with: python failover.py --status")


def main():
    parser = argparse.ArgumentParser(description="Port Pass System — Manual Failover Tool")
    parser.add_argument("--promote", action="store_true",
                        help="Promote the local standby to primary")
    parser.add_argument("--status", action="store_true",
                        help="Check current replication status")
    parser.add_argument("--rebuild-standby", metavar="PRIMARY_HOST",
                        help="Rebuild this server as standby from the given primary host")
    args = parser.parse_args()

    if args.promote:
        promote_standby()
    elif args.rebuild_standby:
        rebuild_standby(args.rebuild_standby)
    elif args.status:
        check_replication_status()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
