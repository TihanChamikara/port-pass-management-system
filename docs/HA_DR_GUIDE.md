# High Availability, Backup & Disaster Recovery Guide

## Port Visitor Pass Management System

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Layer 1 — Primary Server](#layer-1--primary-server)
3. [Layer 2 — Standby Server](#layer-2--standby-server)
4. [Layer 3 — Independent Backups](#layer-3--independent-backups)
5. [Failover Procedure](#failover-procedure)
6. [Restore Procedure](#restore-procedure)
7. [Primary Server Repair & Rebuild](#primary-server-repair--rebuild)
8. [Health Monitoring](#health-monitoring)
9. [Disaster Recovery Testing](#disaster-recovery-testing)
10. [Configuration Reference](#configuration-reference)

---

## Architecture Overview

```
OFFICE USERS
      |
      v
  portpass.local
      |
      v
 PRIMARY SERVER                         BACKUP STORAGE
 ┌─────────────────────┐               ┌──────────────────┐
 │  React Frontend     │               │  Daily backups   │
 │  FastAPI Backend    │───scheduled───>│  Weekly backups  │
 │  PostgreSQL PRIMARY │   backups      │  Monthly backups │
 │         │           │               └──────────────────┘
 │         │ WAL       │
 │         │ streaming │
 │         v           │
 └─────────┼───────────┘
           │
           v
  STANDBY SERVER
 ┌─────────────────────┐
 │  React Frontend     │
 │  FastAPI Backend     │
 │  PostgreSQL STANDBY │
 └─────────────────────┘
```

### Key Principles

- **PRIMARY**: Normal production operation
- **STANDBY**: High availability and server-failure recovery (Active-Passive)
- **BACKUPS**: Historical data recovery and protection against accidental deletion/corruption
- **Replication ≠ Backup**: Replication protects against hardware failure; backups protect against data corruption/deletion

---

## Layer 1 — Primary Server

The Primary Server is the active production server hosting:

- React frontend (served via Vite/nginx)
- FastAPI backend (Uvicorn)
- PostgreSQL Primary database

All Office LAN users access the system through:
```
http://portpass.local
```

### Setup

1. Install PostgreSQL, Python, Node.js
2. Configure the application as per normal deployment
3. Set environment variable: `SERVER_ROLE=primary`
4. Run the primary replication setup:
   ```bash
   sudo -u postgres ./scripts/setup_postgres_primary.sh <standby_ip>
   ```

---

## Layer 2 — Standby Server

### Purpose

The Standby Server protects against:
- Primary server hardware failure
- SSD failure
- Operating-system failure
- PostgreSQL failure
- Application-host failure
- Major server software failure

### Setup

1. Install identical versions of PostgreSQL, Python, Node.js
2. Deploy the same React and FastAPI application versions
3. Set environment variable: `SERVER_ROLE=standby`
4. Run the standby replication setup:
   ```bash
   sudo -u postgres ./scripts/setup_postgres_standby.sh <primary_ip>
   ```
5. Verify replication:
   ```bash
   python scripts/failover.py --status
   ```

### Verification

On the **Primary**, check connected standbys:
```sql
SELECT client_addr, state, sent_lsn, write_lsn, replay_lsn,
       write_lag, flush_lag, replay_lag
FROM pg_stat_replication;
```

On the **Standby**, check WAL receiver:
```sql
SELECT status, conninfo, last_msg_receipt_time
FROM pg_stat_wal_receiver;
```

---

## Layer 3 — Independent Backups

### Why Backups Are Separate from Replication

Replication replicates ALL changes, including accidental ones:
```
PRIMARY: 500 records accidentally deleted
     ↓ replication
STANDBY: 500 records also deleted
```

Backups provide point-in-time recovery to restore data before the accident.

### Automated Backups

Use the backup script:
```bash
# Daily backup
python scripts/pg_backup.py

# Weekly backup
python scripts/pg_backup.py --type weekly

# Monthly backup
python scripts/pg_backup.py --type monthly
```

### Scheduling (Linux cron example)

```cron
# Daily backup at 2:00 AM
0 2 * * * cd /opt/portpass/backend && python scripts/pg_backup.py --type daily >> /var/log/portpass-backup.log 2>&1

# Weekly backup every Sunday at 3:00 AM
0 3 * * 0 cd /opt/portpass/backend && python scripts/pg_backup.py --type weekly >> /var/log/portpass-backup.log 2>&1

# Monthly backup on the 1st at 4:00 AM
0 4 1 * * cd /opt/portpass/backend && python scripts/pg_backup.py --type monthly >> /var/log/portpass-backup.log 2>&1
```

### Scheduling (Windows Task Scheduler)

Create scheduled tasks for daily/weekly/monthly backups using:
```cmd
schtasks /create /tn "PortPass Daily Backup" /tr "python C:\portpass\backend\scripts\pg_backup.py --type daily" /sc daily /st 02:00
schtasks /create /tn "PortPass Weekly Backup" /tr "python C:\portpass\backend\scripts\pg_backup.py --type weekly" /sc weekly /d SUN /st 03:00
schtasks /create /tn "PortPass Monthly Backup" /tr "python C:\portpass\backend\scripts\pg_backup.py --type monthly" /sc monthly /d 1 /st 04:00
```

### Retention Policy

| Type    | Default Retention | Configurable Via          |
|---------|-------------------|---------------------------|
| Daily   | 14 backups        | `BACKUP_RETENTION_DAILY`  |
| Weekly  | 8 backups         | `BACKUP_RETENTION_WEEKLY` |
| Monthly | 6 backups         | `BACKUP_RETENTION_MONTHLY`|

### Backup Verification

```bash
# Verify backup integrity
python scripts/pg_backup.py --verify backups/portpass_daily_2026-09-03_020000.dump

# List all backups
python scripts/pg_backup.py --list
```

### Backup Storage

The backup storage **MUST NOT** depend exclusively on the Primary Server's local disk.

Recommended options:
- Network-attached storage (NAS) on the Office LAN
- A separate backup server
- Set `BACKUP_DIR` to a mounted network path

---

## Failover Procedure

> ⚠️ **Manual/Controlled failover only.** Automatic failover is NOT implemented.

### Pre-Requisites

1. Confirm the primary server failure is genuine
2. Ensure the old primary is stopped or fenced (prevent split-brain)
3. Check the latest replication state

### Steps

| Step | Action | Command/Detail |
|------|--------|----------------|
| 1 | Detect primary server failure | Monitoring dashboard or manual check |
| 2 | Confirm failure is genuine | Ping, SSH, service check |
| 3 | Prevent split-brain | Power off / network-fence old primary |
| 4 | Stop/disable failed primary | `pg_ctl stop -D $PGDATA -m fast` |
| 5 | Confirm replication state | `python scripts/failover.py --status` |
| 6 | Promote standby | `python scripts/failover.py --promote` |
| 7 | Start application services | Start FastAPI + React on standby |
| 8 | Redirect hostname | Update DNS/hosts for `portpass.local` |
| 9 | Test authentication | Login with admin account |
| 10 | Test visitor requests | Submit a test visitor request |
| 11 | Test approvals | Approve the test request |
| 12 | Test pass issuing | Issue a test pass |
| 13 | Test QR verification | Verify the test pass QR code |
| 14 | Test gate check-in | Perform a check-in |
| 15 | Test gate check-out | Perform a check-out |
| 16 | Test reporting | Generate a test report |
| 17 | Verify audit logging | Check audit trail for test actions |
| 18 | Announce recovery | Notify users that the system is restored |

### Using the Failover Script

```bash
# On the STANDBY server:
python scripts/failover.py --promote
```

The script will:
1. Verify this server is a standby
2. Require manual confirmation (type 'PROMOTE')
3. Promote PostgreSQL from standby to primary
4. Provide next-steps checklist

### Hostname Redirection

Users must continue using `http://portpass.local`. Update the hostname resolution:

**Option A: DNS Server**
```
portpass.local  →  <standby_server_ip>
```

**Option B: Hosts file** (all client machines)
```
<standby_server_ip>  portpass.local
```

---

## Restore Procedure

### When to Restore

- Accidental data deletion
- Data corruption
- Malicious changes
- Any scenario where replication has propagated unwanted changes

### Steps

1. **Stop affected operations** if necessary
2. **Identify the approximate time** before the unwanted change
3. **Select an appropriate backup**:
   ```bash
   python scripts/pg_backup.py --list
   ```
4. **Restore to a SEPARATE recovery database**:
   ```bash
   python scripts/pg_backup.py --restore backups/portpass_daily_2026-09-01_020000.dump
   ```
   This creates `port_pass_db_recovery` — it NEVER overwrites production.
5. **Verify the required records** in the recovery database:
   ```sql
   psql -d port_pass_db_recovery -c "SELECT count(*) FROM visitor_requests;"
   ```
6. **Determine the correct recovery point**
7. **Restore/recover production data** using an approved procedure (e.g., copy specific tables)
8. **Verify application integrity**
9. **Verify audit logs**
10. **Resume operations**

> ⚠️ **NEVER overwrite the production database blindly during recovery.**

---

## Primary Server Repair & Rebuild

After a failed Primary Server has been repaired:

> ⚠️ **Do NOT immediately return it to Primary.**

### Steps

1. Reinstall/reconfigure the operating system if required
2. Validate OS, application version, PostgreSQL version
3. **Rebuild as a new Standby**:
   ```bash
   python scripts/failover.py --rebuild-standby <current_primary_ip>
   ```
4. Verify replication is healthy:
   ```bash
   python scripts/failover.py --status
   ```
5. Verify application health on the rebuilt server
6. **Keep it as Standby** until planned maintenance
7. Perform failback only during a planned maintenance window

---

## Health Monitoring

### Admin Dashboard

Access the System Health Dashboard at:
```
http://portpass.local → Login as Admin → Administration → System Health
```

The dashboard displays:

| Metric | Values |
|--------|--------|
| Application | ONLINE / OFFLINE |
| Database | ONLINE / OFFLINE |
| Replication | HEALTHY / WARNING / FAILED / NOT_CONFIGURED |
| Replication Delay | X seconds |
| Last Backup | Date/Time |
| Backup Status | SUCCESS / FAILED / NO_BACKUPS |
| Disk Usage | X% (with HEALTHY / WARNING / CRITICAL) |
| Server | ONLINE / DEGRADED / OFFLINE |

### Warning Conditions

The system warns administrators when:

- ❌ Replication stops or lag exceeds thresholds
- ❌ Backup fails or becomes stale (>25 hours)
- ❌ Database becomes unavailable
- ❌ Disk space exceeds warning threshold (default 80%)
- ❌ Disk space exceeds critical threshold (default 90%)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system-health/` | GET | Full system health status |
| `/api/system-health/failover-checklist` | GET | Failover pre-flight checklist |
| `/api/system-health/backups` | GET | List all available backups |

All endpoints require admin authentication.

---

## Disaster Recovery Testing

### Test Checklist

Do NOT claim disaster recovery works merely because the configuration exists. **Actually test:**

- [ ] Primary application failure
- [ ] Primary PostgreSQL failure
- [ ] Primary server shutdown
- [ ] Standby promotion
- [ ] Application startup on standby
- [ ] Stable hostname redirection
- [ ] User reconnection
- [ ] Visitor request creation
- [ ] Approval
- [ ] Pass issuing
- [ ] Gate check-in
- [ ] Gate check-out
- [ ] Reporting
- [ ] Audit logging
- [ ] Backup restoration
- [ ] Recovery of accidentally deleted data

### Test Documentation

For each DR test, document:

| Field | Description |
|-------|-------------|
| Failure Time | When the simulated failure occurred |
| Detection Time | When the failure was detected |
| Recovery Time | When the system was fully operational again |
| Data Loss/Recovery Point | Amount of data loss (if any) |
| Problems Encountered | Issues found during the test |
| Corrective Actions | Steps taken to resolve issues |

> ⚠️ Do NOT mark disaster recovery as PASS until the complete procedure has been successfully tested.

---

## Configuration Reference

All settings can be configured via environment variables or the `.env` file.

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_ROLE` | `primary` | Server role: `primary` or `standby` |
| `STANDBY_HOST` | _(none)_ | IP/hostname of the standby server |
| `PRIMARY_HOST` | _(none)_ | IP/hostname of the primary server |
| `BACKUP_DIR` | `backups` | Path to backup storage directory |
| `BACKUP_RETENTION_DAILY` | `14` | Number of daily backups to retain |
| `BACKUP_RETENTION_WEEKLY` | `8` | Number of weekly backups to retain |
| `BACKUP_RETENTION_MONTHLY` | `6` | Number of monthly backups to retain |
| `BACKUP_DB_HOST` | `127.0.0.1` | PostgreSQL host for backups |
| `BACKUP_DB_PORT` | `5432` | PostgreSQL port for backups |
| `BACKUP_DB_NAME` | `port_pass_db` | Database name to backup |
| `BACKUP_DB_USER` | `postgres` | PostgreSQL user for backups |
| `BACKUP_DB_PASSWORD` | `admin123` | PostgreSQL password for backups |
| `DISK_WARNING_THRESHOLD` | `80` | Disk usage % for warning |
| `DISK_CRITICAL_THRESHOLD` | `90` | Disk usage % for critical |
| `REPLICATION_LAG_WARNING` | `30` | Replication lag (seconds) for warning |
| `REPLICATION_LAG_CRITICAL` | `120` | Replication lag (seconds) for critical |
