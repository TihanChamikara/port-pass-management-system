# Port Pass Issuing Management System - Architecture & Upgrade Plan

**Version:** 2.0 (Enterprise Edition)
**Last Updated:** April 30, 2026

---

## 📋 Table of Contents
1. System Architecture
2. Database Schema
3. API Endpoints
4. Frontend Components
5. Backend Services
6. Security & RBAC
7. Audit Logging
8. Alerts & Reporting
9. Implementation Timeline

---

## 1. System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Port 5173)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Single/Group Pass Form │ Dashboard │ Reports Table  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓ (API Calls)
┌─────────────────────────────────────────────────────────────┐
│           FastAPI Backend (Port 8000)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ RBAC Middleware → Route Handlers → Services          │   │
│  │ ├─ Auth Service                                      │   │
│  │ ├─ Pass Service (single/group)                       │   │
│  │ ├─ Alert Service                                     │   │
│  │ ├─ Report Service                                    │   │
│  │ └─ Audit Service                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓ (ORM)
┌─────────────────────────────────────────────────────────────┐
│           Database (SQLite/PostgreSQL)                      │
│  ├─ users (admin/staff/security roles)                      │
│  ├─ passes (single pass records)                            │
│  ├─ pass_groups (group pass parent records)                 │
│  ├─ audit_logs (all actions tracked)                        │
│  └─ alerts (active/overdue status tracking)                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns
- **RBAC**: Role-Based Access Control via middleware
- **Atomic Transactions**: Group + Pass creation as single unit
- **Event-Driven Alerts**: Real-time alert computation
- **Audit Trail**: Immutable audit log for compliance
- **Service Layer**: Business logic separated from routes

---

## 2. Database Schema

### Users Table (Enhanced)
```sql
users:
  id: integer (PK)
  username: string (unique)
  full_name: string
  password_hash: string
  role: enum (admin, staff, security)
  is_active: boolean
  created_at: datetime
  last_login: datetime
```

### Passes Table (Existing - Enhanced)
```sql
passes:
  id: integer (PK)
  sr_no: integer (unique sequence)
  pass_no: string (unique, auto-generated)
  group_id: integer (FK to pass_groups, nullable)
  visitor_name: string
  company_name: string
  nic_number: string (validated)
  contact_number: string (validated)
  zone: enum (Zone 1-4)
  issued_time: datetime
  received_time: datetime (nullable)
  status: enum (active, completed, overdue)
  created_by: integer (FK to users)
  updated_at: datetime
```

### Pass Groups Table (NEW)
```sql
pass_groups:
  id: integer (PK)
  group_id: string (unique, auto-generated)
  requested_by: string (person responsible)
  company_name: string
  zone: enum (Zone 1-4)
  num_visitors: integer
  status: enum (draft, issued, completed)
  created_by: integer (FK to users)
  created_at: datetime
  completed_at: datetime (nullable)
  notes: text
```

### Audit Logs Table (NEW)
```sql
audit_logs:
  id: integer (PK)
  user_id: integer (FK to users)
  action_type: enum (CREATE, UPDATE, DELETE, LOGIN, CHECKOUT)
  entity_type: enum (pass, group, user)
  entity_id: integer
  timestamp: datetime
  metadata: json
  ip_address: string (optional)
  details: text
```

### Alerts Table (NEW)
```sql
alerts:
  id: integer (PK)
  pass_id: integer (FK to passes, nullable)
  group_id: integer (FK to pass_groups, nullable)
  alert_type: enum (overdue, pending_checkout)
  status: enum (active, resolved)
  created_at: datetime
  resolved_at: datetime (nullable)
  triggered_by_hours: integer (default: 4)
```

---

## 3. API Endpoints

### Authentication
```
POST   /api/auth/login               # User login
GET    /api/auth/me                  # Current user profile
POST   /api/auth/logout              # Logout (optional)
POST   /api/auth/refresh             # Refresh token
```

### Single Pass (Existing - Enhanced)
```
POST   /api/passes                   # Create single pass
GET    /api/passes                   # List passes (with filters)
GET    /api/passes/{id}              # Get pass details
PATCH  /api/passes/{id}/checkout     # Mark received time
GET    /api/passes/export/csv        # Export to CSV
```

### Group Passes (NEW)
```
POST   /api/pass-groups              # Create group (Step 1)
POST   /api/pass-groups/{id}/visitors  # Add visitors (Step 2)
GET    /api/pass-groups              # List groups
GET    /api/pass-groups/{id}         # Get group details
GET    /api/pass-groups/{id}/passes  # Get group's passes
PATCH  /api/pass-groups/{id}/complete # Mark group complete
DELETE /api/pass-groups/{id}/visitors/{visitor_id} # Remove visitor
```

### Alerts & Dashboard (NEW)
```
GET    /api/alerts/active            # Get active alerts
GET    /api/alerts/stats             # Dashboard stats
PATCH  /api/alerts/{id}/resolve      # Mark alert resolved
GET    /api/passes/status/summary    # Status summary (active/completed/overdue)
```

### Reporting (NEW)
```
GET    /api/reports/daily            # Daily pass count
GET    /api/reports/zone-wise        # Zone-wise usage
GET    /api/reports/group-stats      # Group vs single stats
GET    /api/reports/export           # Export reports (CSV/Excel)
GET    /api/audit-logs               # Audit trail (admin only)
```

### User Management (NEW - Admin Only)
```
GET    /api/users                    # List users
POST   /api/users                    # Create user
PATCH  /api/users/{id}/role          # Update role
PATCH  /api/users/{id}/status        # Activate/deactivate
```

---

## 4. Frontend Components

### Pages
```
src/pages/
  ├─ PassIssuingPage.jsx         # Main form (single/group toggle)
  ├─ PassListPage.jsx            # View all passes
  ├─ GroupPassPage.jsx           # Group pass management
  ├─ DashboardPage.jsx           # Alerts & stats (enhanced)
  ├─ ReportsPage.jsx             # Reports & export
  ├─ AuditLogsPage.jsx           # Audit trail (admin only)
  └─ UserManagementPage.jsx      # User/role management (admin only)
```

### Components
```
src/components/
  ├─ PassForm/
  │  ├─ SinglePassForm.jsx        # Single pass form
  │  ├─ GroupPassForm.jsx         # Group pass creation
  │  └─ VisitorTable.jsx          # Dynamic visitor entry table
  ├─ Alerts/
  │  ├─ AlertBanner.jsx           # Top-level alert banner
  │  ├─ AlertWidget.jsx           # Dashboard alert card
  │  └─ OverdueList.jsx           # Overdue passes list
  ├─ Reports/
  │  ├─ DailyReport.jsx
  │  ├─ ZoneWiseReport.jsx
  │  └─ ExportButtons.jsx
  ├─ Tables/
  │  ├─ PassTable.jsx             # Enhanced pass table
  │  └─ GroupTable.jsx            # Group pass table
  └─ Common/
     ├─ RoleProtectedRoute.jsx     # RBAC-based route
     └─ LoadingSpinner.jsx
```

### Stores (Zustand)
```
src/features/
  ├─ pass/
  │  ├─ passStore.js              # Pass state & actions
  │  └─ passApi.js                # API calls
  ├─ group/
  │  ├─ groupStore.js             # Group pass state
  │  └─ groupApi.js               # Group API calls
  ├─ alerts/
  │  ├─ alertStore.js             # Alert state
  │  └─ alertApi.js               # Alert API calls
  ├─ reports/
  │  ├─ reportStore.js
  │  └─ reportApi.js
  └─ auth/
     └─ authStore.js              # Already exists, enhance with role
```

---

## 5. Backend Services

### Service Layer (`app/services/`)
```
pass_service.py
├─ create_single_pass(pass_data)     # Issue single pass
├─ get_pass(pass_id)
├─ list_passes(filters)
├─ mark_checkout(pass_id, received_time)
├─ export_passes_csv()

group_service.py
├─ create_group(group_data)          # Create group (Step 1)
├─ add_visitors(group_id, visitors)  # Add visitors (Step 2)
├─ get_group(group_id)
├─ list_groups(filters)
├─ complete_group(group_id)          # Mark complete
├─ remove_visitor(group_id, visitor_id)
├─ get_group_passes(group_id)

alert_service.py
├─ check_overdue_passes()            # Check for overdue passes (cron job)
├─ create_alert(pass_id, alert_type)
├─ get_active_alerts()
├─ resolve_alert(alert_id)
├─ get_dashboard_stats()             # Stats summary

audit_service.py
├─ log_action(user, action, entity, metadata)  # Log all actions
├─ get_audit_logs(filters)
├─ get_user_activity(user_id)

report_service.py
├─ get_daily_report(date, zone)
├─ get_zone_wise_report(date_range)
├─ get_group_stats(date_range)
├─ export_report(format, filters)
```

---

## 6. Security & RBAC

### Role Definitions
```
Admin:
  - Full system access
  - Manage users & roles
  - View all audit logs
  - Issue/manage all passes

Staff:
  - Issue passes (single/group)
  - View own passes
  - Basic reporting
  - View own actions in audit log

Security:
  - Check-in/check-out only
  - Mark received_time
  - View current passes
  - Cannot issue new passes
```

### Middleware
```python
# app/api/middleware/rbac.py
def require_roles(allowed_roles):
    # Dependency to protect routes
    # Returns current user if authorized
    
def require_admin():
    # Shorthand for admin-only routes
    
def require_role_or_own(allowed_roles):
    # Allow access if role matches OR user owns resource
```

### JWT Payload Enhancement
```json
{
  "sub": "user_id",
  "username": "username",
  "role": "admin|staff|security",
  "exp": 1234567890
}
```

---

## 7. Audit Logging

### Actions Tracked
```
CREATE:
  - Pass created
  - Group created
  - User created

UPDATE:
  - Pass received_time marked
  - Group completed
  - User role changed
  - User activated/deactivated

DELETE:
  - Visitor removed from group
  - Pass deleted (rare)

LOGIN:
  - User login successful
  - User login failed (attempted)
```

### Audit Log Storage
```python
{
  "user_id": 5,
  "action_type": "CREATE",
  "entity_type": "pass",
  "entity_id": 102,
  "timestamp": "2026-04-30T10:30:00Z",
  "metadata": {
    "pass_no": "P-20260430-001",
    "visitor_name": "John Doe",
    "zone": "Zone 1"
  },
  "details": "Single pass created"
}
```

---

## 8. Alerts & Reporting System

### Alert Logic

#### Overdue Pass Alert
```
Trigger: If pass.status == 'active' AND 
         (NOW - pass.issued_time) > X hours AND 
         pass.received_time IS NULL

Action:
  - Create alert record
  - Mark pass.status = 'overdue'
  - Highlight RED in UI
  - Show in dashboard

Resolution:
  - Mark received_time → auto resolve alert
```

#### Live Status Indicators
```
Active (Yellow):
  - issued_time set
  - received_time NULL
  - age < X hours

Overdue (Red):
  - issued_time set
  - received_time NULL
  - age > X hours

Completed (Green):
  - received_time set
```

### Dashboard Stats
```
{
  "active_passes_count": 45,
  "completed_passes_count": 128,
  "overdue_passes_count": 3,
  "active_groups_count": 5,
  "total_visitors_in_groups": 23,
  "zone_distribution": {
    "Zone 1": 30,
    "Zone 2": 25,
    "Zone 3": 20,
    "Zone 4": 18
  },
  "today_pass_count": 45,
  "week_pass_count": 280
}
```

### Reports Available
```
1. Daily Pass Count
   - By date
   - By zone
   - By company
   - Breakdown: single vs group

2. Zone-wise Usage
   - Passes per zone
   - Trend over time
   - Peak hours

3. Group Statistics
   - Groups created
   - Average visitors per group
   - Group completion rate

4. Audit Trail
   - All actions with timestamps
   - User activity
   - Pass lifecycle tracking
```

---

## 9. Implementation Timeline

### Phase 1: Backend Foundation (2-3 days)
- [ ] Enhance user model + create security role
- [ ] Create pass_groups, audit_logs, alerts tables
- [ ] Create schemas for validation
- [ ] Implement RBAC middleware
- [ ] Create audit service & logging

### Phase 2: Core Business Logic (3-4 days)
- [ ] Implement group pass service
- [ ] Implement alert service
- [ ] Implement report service
- [ ] Create pass service enhancements
- [ ] Add transaction handling

### Phase 3: API Endpoints (2-3 days)
- [ ] Create group pass endpoints
- [ ] Create alert endpoints
- [ ] Create report endpoints
- [ ] Create user management endpoints
- [ ] Enhance auth endpoints

### Phase 4: Frontend Components (3-4 days)
- [ ] Create single/group pass form
- [ ] Create dynamic visitor table
- [ ] Create alert components
- [ ] Create report components
- [ ] Enhance dashboard

### Phase 5: Integration & Testing (2-3 days)
- [ ] Connect frontend to new APIs
- [ ] Test group pass workflow
- [ ] Test alert system
- [ ] Test RBAC
- [ ] Performance optimization

### Phase 6: Deployment (1 day)
- [ ] Database migration
- [ ] Environment setup
- [ ] Production testing
- [ ] Documentation

---

## 10. Key Features Summary

✅ **Single Pass Mode**
  - Fast single visitor pass issuing
  - Auto-generated pass numbers
  - Real-time validation

✅ **Group Pass Mode**
  - Multi-step form (info → visitors)
  - Dynamic visitor entry table
  - Bulk paste from Excel
  - Atomic transaction handling

✅ **Enterprise Features**
  - Role-based access control (Admin/Staff/Security)
  - Complete audit trail
  - Alert system (overdue detection)
  - Advanced reporting & exports
  - Dashboard with live statistics

✅ **Performance**
  - Minimal UI lag
  - Keyboard navigation
  - Auto-save capability
  - Pagination & filtering

✅ **Security**
  - JWT authentication
  - Role-based middleware
  - Input validation
  - SQL injection protection (SQLAlchemy ORM)
  - Immutable audit logs

---

## 11. File Structure

```
backend/
├─ app/
│  ├─ api/
│  │  ├─ middleware/
│  │  │  ├─ rbac.py               ← NEW
│  │  │  └─ auth.py
│  │  ├─ routes/
│  │  │  ├─ auth.py               (enhanced)
│  │  │  ├─ passes.py             (enhanced)
│  │  │  ├─ groups.py             ← NEW
│  │  │  ├─ alerts.py             ← NEW
│  │  │  ├─ reports.py            ← NEW
│  │  │  └─ users.py              ← NEW
│  │  └─ deps.py                  (enhanced)
│  ├─ models/
│  │  ├─ user.py                  (enhanced)
│  │  ├─ pass_record.py           (enhanced)
│  │  ├─ pass_group.py            ← NEW
│  │  ├─ audit_log.py             ← NEW
│  │  └─ alert.py                 ← NEW
│  ├─ schemas/
│  │  ├─ pass_record.py           (enhanced)
│  │  ├─ pass_group.py            ← NEW
│  │  ├─ audit_log.py             ← NEW
│  │  └─ report.py                ← NEW
│  ├─ services/
│  │  ├─ pass_service.py          ← NEW
│  │  ├─ group_service.py         ← NEW
│  │  ├─ alert_service.py         ← NEW
│  │  ├─ audit_service.py         ← NEW
│  │  ├─ report_service.py        ← NEW
│  │  └─ validators.py            (existing)
│  ├─ core/
│  │  ├─ security.py              (existing)
│  │  └─ settings.py              (existing)
│  ├─ db/
│  │  └─ database.py              (existing)
│  └─ main.py                     (enhanced)

frontend/
├─ src/
│  ├─ pages/
│  │  ├─ PassIssuingPage.jsx      ← NEW
│  │  ├─ GroupPassPage.jsx        ← NEW
│  │  ├─ ReportsPage.jsx          ← NEW
│  │  ├─ AuditLogsPage.jsx        ← NEW
│  │  ├─ DashboardPage.jsx        (enhanced)
│  │  └─ PassesPage.jsx           (existing)
│  ├─ components/
│  │  ├─ PassForm/                ← NEW folder
│  │  ├─ Alerts/                  ← NEW folder
│  │  ├─ Reports/                 ← NEW folder
│  │  └─ RoleProtectedRoute.jsx   ← NEW
│  └─ features/
│     ├─ pass/                    (enhanced)
│     ├─ group/                   ← NEW folder
│     ├─ alerts/                  ← NEW folder
│     └─ reports/                 ← NEW folder
```

---

**Next Steps:**
1. Start with Phase 1 (Database models & RBAC)
2. Implement in order: Models → Schemas → Services → Routes → Components
3. Test each phase before moving to next
4. Use atomic transactions for data integrity
5. Monitor performance with large datasets

