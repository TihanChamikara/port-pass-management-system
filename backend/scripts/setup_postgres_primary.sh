#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# setup_postgres_primary.sh
#
# Configures the PostgreSQL PRIMARY server for WAL streaming replication.
#
# Prerequisites:
#   - PostgreSQL is installed and running
#   - You have superuser access to the database
#   - You know the STANDBY server's IP address
#
# Usage:
#   chmod +x setup_postgres_primary.sh
#   sudo -u postgres ./setup_postgres_primary.sh <standby_ip>
#
# Example:
#   sudo -u postgres ./setup_postgres_primary.sh 192.168.1.101
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <standby_ip>"
    echo "  standby_ip: IP address of the standby server"
    exit 1
fi

STANDBY_IP="$1"
REPL_USER="repl_user"
REPL_PASSWORD="repl_secure_password_change_me"

# Locate config files
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
PG_CONF="$PGDATA/postgresql.conf"
HBA_CONF="$PGDATA/pg_hba.conf"

echo "====================================="
echo "PRIMARY SERVER REPLICATION SETUP"
echo "====================================="
echo "  PGDATA:      $PGDATA"
echo "  Standby IP:  $STANDBY_IP"
echo "  Repl User:   $REPL_USER"
echo ""

# ── 1. Create replication user ────────────────────────────────────────
echo "[1/4] Creating replication user..."
psql -d postgres -c "DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$REPL_USER') THEN
        CREATE ROLE $REPL_USER WITH REPLICATION LOGIN PASSWORD '$REPL_PASSWORD';
        RAISE NOTICE 'Created replication user: $REPL_USER';
    ELSE
        RAISE NOTICE 'Replication user $REPL_USER already exists';
    END IF;
END
\$\$;"

# ── 2. Configure postgresql.conf ──────────────────────────────────────
echo "[2/4] Configuring postgresql.conf..."

# Ensure WAL level is 'replica'
if grep -q "^wal_level" "$PG_CONF"; then
    sed -i "s/^wal_level.*/wal_level = replica/" "$PG_CONF"
else
    echo "wal_level = replica" >> "$PG_CONF"
fi

# Allow replication connections
if grep -q "^max_wal_senders" "$PG_CONF"; then
    sed -i "s/^max_wal_senders.*/max_wal_senders = 10/" "$PG_CONF"
else
    echo "max_wal_senders = 10" >> "$PG_CONF"
fi

# Keep enough WAL segments
if grep -q "^wal_keep_size" "$PG_CONF"; then
    sed -i "s/^wal_keep_size.*/wal_keep_size = '1GB'/" "$PG_CONF"
else
    echo "wal_keep_size = '1GB'" >> "$PG_CONF"
fi

# Listen on all interfaces
if grep -q "^listen_addresses" "$PG_CONF"; then
    sed -i "s/^listen_addresses.*/listen_addresses = '*'/" "$PG_CONF"
else
    echo "listen_addresses = '*'" >> "$PG_CONF"
fi

# ── 3. Configure pg_hba.conf ──────────────────────────────────────────
echo "[3/4] Configuring pg_hba.conf..."

HBA_ENTRY="host    replication     $REPL_USER     $STANDBY_IP/32     md5"
if ! grep -qF "$REPL_USER" "$HBA_CONF"; then
    echo "$HBA_ENTRY" >> "$HBA_CONF"
    echo "  Added replication entry for $STANDBY_IP"
else
    echo "  Replication entry for $REPL_USER already exists"
fi

# ── 4. Reload configuration ──────────────────────────────────────────
echo "[4/4] Reloading PostgreSQL configuration..."
psql -d postgres -c "SELECT pg_reload_conf();"

echo ""
echo "====================================="
echo "PRIMARY SETUP COMPLETE"
echo "====================================="
echo ""
echo "IMPORTANT:"
echo "  1. Note the replication password: $REPL_PASSWORD"
echo "  2. Change it to a secure password in production"
echo "  3. If wal_level was changed, a PostgreSQL RESTART is required"
echo "  4. Now set up the standby server using setup_postgres_standby.sh"
echo ""
