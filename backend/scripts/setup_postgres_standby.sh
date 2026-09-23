#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# setup_postgres_standby.sh
#
# Configures the PostgreSQL STANDBY server using pg_basebackup
# and sets up streaming replication from the PRIMARY.
#
# Prerequisites:
#   - PostgreSQL is installed on this server
#   - The PRIMARY server has been configured with setup_postgres_primary.sh
#   - Network connectivity to the PRIMARY server on port 5432
#
# Usage:
#   chmod +x setup_postgres_standby.sh
#   sudo -u postgres ./setup_postgres_standby.sh <primary_ip>
#
# Example:
#   sudo -u postgres ./setup_postgres_standby.sh 192.168.1.100
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <primary_ip>"
    echo "  primary_ip: IP address of the primary server"
    exit 1
fi

PRIMARY_IP="$1"
REPL_USER="repl_user"
REPL_PASSWORD="repl_secure_password_change_me"  # Must match primary
PGDATA="${PGDATA:-/var/lib/postgresql/data}"

echo "====================================="
echo "STANDBY SERVER REPLICATION SETUP"
echo "====================================="
echo "  PGDATA:       $PGDATA"
echo "  Primary IP:   $PRIMARY_IP"
echo "  Repl User:    $REPL_USER"
echo ""
echo "WARNING: This will ERASE the current $PGDATA directory!"
echo ""
read -p "Type 'CONFIRM' to proceed: " CONFIRM
if [ "$CONFIRM" != "CONFIRM" ]; then
    echo "Aborted."
    exit 0
fi

# ── 1. Stop PostgreSQL ────────────────────────────────────────────────
echo ""
echo "[1/4] Stopping PostgreSQL..."
pg_ctl stop -D "$PGDATA" -m fast 2>/dev/null || true

# ── 2. Remove old data ───────────────────────────────────────────────
echo "[2/4] Removing old data directory..."
rm -rf "$PGDATA"/*

# ── 3. Run pg_basebackup ─────────────────────────────────────────────
echo "[3/4] Running pg_basebackup from $PRIMARY_IP..."
export PGPASSWORD="$REPL_PASSWORD"
pg_basebackup \
    -h "$PRIMARY_IP" \
    -p 5432 \
    -U "$REPL_USER" \
    -D "$PGDATA" \
    -Fp \
    -Xs \
    -P \
    -R  # -R creates standby.signal and adds primary_conninfo

unset PGPASSWORD

echo "  pg_basebackup completed."

# ── 4. Verify standby configuration ──────────────────────────────────
echo "[4/4] Verifying standby configuration..."

# Ensure standby.signal exists (created by -R flag)
if [ -f "$PGDATA/standby.signal" ]; then
    echo "  ✓ standby.signal present"
else
    echo "  Creating standby.signal..."
    touch "$PGDATA/standby.signal"
fi

# Verify primary_conninfo in postgresql.auto.conf
if grep -q "primary_conninfo" "$PGDATA/postgresql.auto.conf" 2>/dev/null; then
    echo "  ✓ primary_conninfo configured"
else
    echo "  Adding primary_conninfo..."
    echo "primary_conninfo = 'host=$PRIMARY_IP port=5432 user=$REPL_USER password=$REPL_PASSWORD'" >> "$PGDATA/postgresql.auto.conf"
fi

# Start PostgreSQL
echo ""
echo "Starting PostgreSQL in standby mode..."
pg_ctl start -D "$PGDATA" -l "$PGDATA/logfile"

# Wait and verify
sleep 3
echo ""
echo "Checking recovery status..."
IS_STANDBY=$(psql -d postgres -t -A -c "SELECT pg_is_in_recovery();" 2>/dev/null || echo "error")

if [ "$IS_STANDBY" = "t" ]; then
    echo "  ✓ Server is running in STANDBY mode"
else
    echo "  ✗ Server may not be in standby mode. Check logs: $PGDATA/logfile"
fi

echo ""
echo "====================================="
echo "STANDBY SETUP COMPLETE"
echo "====================================="
echo ""
echo "To verify replication from the PRIMARY, run:"
echo "  psql -d postgres -c 'SELECT * FROM pg_stat_replication;'"
echo ""
echo "To monitor standby WAL receiver, run:"
echo "  psql -d postgres -c 'SELECT * FROM pg_stat_wal_receiver;'"
echo ""
