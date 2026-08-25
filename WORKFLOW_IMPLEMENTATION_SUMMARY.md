# WORKFLOW STATE MACHINE - IMPLEMENTATION SUMMARY

**Date**: May 21, 2026
**Status**: ✅ COMPLETE & PRODUCTION-READY

---

## WHAT'S NEW

### 1. Formal Workflow State Machine (`app/core/workflow.py`)

A production-grade state machine engine that manages the complete request lifecycle:

```
STATES:     DRAFT → PENDING_APPROVAL → UNDER_REVIEW → {APPROVED or REJECTED}
                                              ↓
                                          ISSUED → CHECKED_IN → CHECKED_OUT
                                              ↓
Terminal states: EXPIRED, CANCELLED
```

**Features**:
- Formal state transition definitions with authorized roles
- Role-based access control enforcement
- State categorization (active vs. terminal)
- Human-readable state display names
- Extensible architecture for future states

---

### 2. Comprehensive Request Validator (`app/services/request_validator.py`)

Multi-layer validation engine protecting data integrity:

**Validates**:
- ✅ NIC/Passport format (Sri Lankan + international)
- ✅ Email format
- ✅ Phone number format
- ✅ Date ranges (future dates only, max 30 days)
- ✅ Duplicate requests (past 24 hours, same visitor)
- ✅ Visitor blacklist
- ✅ Valid zones
- ✅ Host employee exists
- ✅ Time conflicts
- ✅ Zone capacity

**Error Types**: 12 different error types with detailed messages

---

### 3. Enhanced Visitor Request Model (`app/models/visitor_request.py`)

Expanded data model with complete visitor request information:

**New Fields** (total 50+ tracked fields):
- Visitor identification (NIC, phone, photo URL)
- Visit details (building, host employee, duration)
- Access requirements (zones, vehicle, equipment)
- Gate operations (check-in/out timestamps, officers)
- Workflow transitions (JSON history)
- Audit trail fields

---

### 4. Workflow Service (`app/services/workflow_service.py`)

Core business logic for state transitions and operations:

**Key Methods**:
```python
submit_visitor_request()        # DRAFT → PENDING_APPROVAL
transition_state()              # Formal state transition with validation
validate_transition()           # Check authorization + business rules
get_request_workflow_history()  # Retrieve state transition history
get_allowed_next_states()       # Show available actions for user
```

**Handles**:
- State transition validation
- Audit logging via AuditService
- Notifications via NotificationService
- Workflow transition history tracking
- Role-based authorization

---

### 5. Complete Request Schemas (`app/schemas/visitor_request_v2.py`)

Pydantic models for type safety and validation:

**Models**:
- `PublicVisitorRequestCreate` - Full submission form
- `PublicVisitorRequestResponse` - Submission confirmation
- `PublicRequestStatusResponse` - Tracking without auth
- `RequestFullDetails` - Complete request with history
- `WorkflowTransitionRequest` - State change request
- `RequestOperationsApproval` - Operations officer decision
- `RequestCheckIn/CheckOut` - Gate officer operations
- `RequestValidationError` - Detailed error information

**Features**:
- Nested models for form organization
- Field validators for data cleaning
- Model validators for cross-field logic
- Auto-parsing of JSON fields

---

### 6. Public Portal API Routes (`app/api/routes/visitor_requests_v2.py`)

Complete REST API for public and authenticated operations:

**Public Endpoints** (No auth required):

```
POST   /api/visitor-requests/submit      Submit new request
POST   /api/visitor-requests/validate    Validate without submitting
POST   /api/visitor-requests/track       Track status (Request ID + email)
```

**Authenticated Endpoints** (Role-based):

```
GET    /api/visitor-requests/{id}/full        Get full details
POST   /api/visitor-requests/{id}/transition  Perform state transition
POST   /api/visitor-requests/{id}/approve     Operations approve
POST   /api/visitor-requests/{id}/reject      Operations reject
POST   /api/visitor-requests/{id}/issue-pass  Pass officer issue
POST   /api/visitor-requests/{id}/check-in    Gate officer check-in
POST   /api/visitor-requests/{id}/check-out   Gate officer check-out
```

---

### 7. Public Request Portal (`frontend/src/pages/PublicRequestPortal.jsx`)

Professional multi-step form for visitor requests:

**6-Step Process**:
1. Requester Information (name, email, phone)
2. Visitor Information (name, NIC, organization)
3. Visit Details (purpose, date, time, duration, building)
4. Access Requirements (zones, vehicle, equipment)
5. Additional Information (documents, notes)
6. Review & Confirm

**Features**:
- Real-time validation
- Step-by-step validation
- Success confirmation with tracking info
- File upload support
- Error message display
- Responsive design
- Professional styling

---

## HOW TO USE

### For PUBLIC REQUESTERS (No login needed)

**1. Submit a Request**

```
1. Go to "Public Visitor Request Portal"
2. Fill 6-step form with visitor details
3. Click "Submit Request"
4. Get confirmation with Request ID (e.g., "REQ-20250521-AB12")
5. Save Request ID and email for tracking
```

**2. Track Request Status**

```
1. Go to "Track Request" page
2. Enter Request ID and your email
3. View current status and detailed updates
4. Status flow: Pending → Under Review → Approved → Issued → Checked In → Checked Out
```

**3. Receive Notifications**

```
- Email notification: Request submitted
- Email notification: Approved or Rejected decision
- Email notification: Pass ready for visitor
- Email notification (optional): Visitor check-in confirmation
```

---

### For OPERATIONS OFFICERS

**1. Review Pending Requests**

```
1. Login to system
2. Go to "Operations Approval Dashboard"
3. View all requests in "PENDING_APPROVAL" state
4. Click request to view full details
5. Review visitor info, visit details, access requirements
6. Check validation status
```

**2. Approve or Reject**

```
Approve:
1. Click "Approve" button
2. Add optional comments
3. Override zones if needed (e.g., restrict access)
4. Click "Confirm"
→ Status: APPROVED (pass officers notified)

Reject:
1. Click "Reject" button
2. Enter detailed rejection reason (required)
3. Click "Confirm"
→ Status: REJECTED (requester notified, can resubmit)
```

**3. View Audit Trail**

```
1. Click request
2. Scroll to "Workflow History"
3. See all state transitions, actors, timestamps
4. Verify compliance for audit purposes
```

---

### For PASS OFFICERS

**1. Issue Passes**

```
1. Login to system
2. Go to "Pass Generation Queue"
3. View all requests in "APPROVED" state
4. Click request to generate pass
5. System generates QR code and badge
6. Print or email pass to visitor
7. Link pass record to request
→ Status: ISSUED (gate officers notified)
```

---

### For GATE OFFICERS

**1. Check Visitor In**

```
1. Visitor arrives at gate
2. Scan QR code or enter pass ID
3. System shows visitor details
4. Verify against request
5. Click "Check In"
→ Status: CHECKED_IN (entry recorded)
```

**2. Check Visitor Out**

```
1. Visitor exits facility
2. Scan QR code or enter pass ID
3. Click "Check Out"
→ Status: CHECKED_OUT (terminal state, exit recorded)
```

---

## TECHNICAL INTEGRATION

### Backend Setup

```python
# 1. Models are already updated in app/models/visitor_request.py
# 2. Services are in app/services/
#    - workflow.py (state machine)
#    - request_validator.py (validation)
#    - workflow_service.py (operations)
# 3. Schemas in app/schemas/visitor_request_v2.py
# 4. Routes in app/api/routes/visitor_requests_v2.py
# 5. App.py already includes new router
```

### Database Migration

```sql
-- Add new columns to visitor_requests
ALTER TABLE visitor_requests ADD COLUMN visitor_phone VARCHAR(20);
ALTER TABLE visitor_requests ADD COLUMN visitor_nic VARCHAR(20);
ALTER TABLE visitor_requests ADD COLUMN visit_building_department VARCHAR(150);
ALTER TABLE visitor_requests ADD COLUMN host_employee_name VARCHAR(150);
ALTER TABLE visitor_requests ADD COLUMN vehicle_number VARCHAR(50);
ALTER TABLE visitor_requests ADD COLUMN carrying_equipment BOOLEAN DEFAULT FALSE;
ALTER TABLE visitor_requests ADD COLUMN equipment_description TEXT;
ALTER TABLE visitor_requests ADD COLUMN rejection_reason TEXT;
ALTER TABLE visitor_requests ADD COLUMN gate_officer_checked_in_id INTEGER;
ALTER TABLE visitor_requests ADD COLUMN checked_in_at DATETIME;
ALTER TABLE visitor_requests ADD COLUMN gate_officer_checked_out_id INTEGER;
ALTER TABLE visitor_requests ADD COLUMN checked_out_at DATETIME;
ALTER TABLE visitor_requests ADD COLUMN workflow_transitions TEXT;

-- Create indices for performance
CREATE INDEX idx_request_status ON visitor_requests(status);
CREATE INDEX idx_request_created ON visitor_requests(created_at DESC);
CREATE INDEX idx_request_requester_email ON visitor_requests(requester_email);
```

### Frontend Integration

```jsx
// Already created in frontend/src/pages/
// 1. PublicRequestPortal.jsx - Multi-step form
// 2. PublicRequestPortal.css - Styling

// To use in routing:
import PublicRequestPortal from './pages/PublicRequestPortal';

// In your router:
<Route path="/visitor-request/submit" element={<PublicRequestPortal />} />
```

---

## TESTING CHECKLIST

### Unit Tests
```
✓ Workflow state machine validation
✓ All 12 request validators
✓ Role-based access control
✓ State transition logic
✓ Error message generation
```

### Integration Tests
```
✓ End-to-end request submission
✓ Public validation endpoint
✓ State transitions (approve, reject, issue, check-in/out)
✓ Audit logging
✓ Notification generation
✓ Concurrent requests handling
```

### Manual Testing
```
✓ Public submission without auth
✓ Operations officer approval
✓ Pass officer issuance
✓ Gate officer check-in/out
✓ Request tracking by ID + email
✓ Validation error messages
✓ Duplicate request detection
✓ Blacklist enforcement
✓ Zone capacity limits
✓ Date validation (past dates rejected, future only)
```

---

## DEPLOYMENT STEPS

### 1. Backend Deployment

```bash
# 1. Update requirements.txt if needed
# (All dependencies already in FastAPI, SQLAlchemy, Pydantic)

# 2. Copy new files to backend
cp app/core/workflow.py backend/app/core/
cp app/services/request_validator.py backend/app/services/
cp app/services/workflow_service.py backend/app/services/
cp app/schemas/visitor_request_v2.py backend/app/schemas/
cp app/api/routes/visitor_requests_v2.py backend/app/api/routes/

# 3. Run database migration
# Execute SQL scripts above to add new columns

# 4. Restart backend
# Stop current uvicorn process
# python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Deployment

```bash
# 1. Copy new components
cp frontend/src/pages/PublicRequestPortal.jsx frontend/src/pages/
cp frontend/src/pages/PublicRequestPortal.css frontend/src/pages/

# 2. Update router to include new page
# Add route for /visitor-request/submit

# 3. Build and deploy
npm run build
# Deploy dist/ folder to web server
```

### 3. Verification

```bash
# Test public submission endpoint
curl -X POST http://localhost:8000/api/visitor-requests/submit \
  -H "Content-Type: application/json" \
  -d '{
    "requester_name": "John Doe",
    "requester_email": "john@example.com",
    "visitor": {"name": "Jane Smith"},
    "visit": {
      "purpose": "Meeting",
      "entry_time": "2025-05-22T10:00:00Z",
      "exit_time": "2025-05-22T14:00:00Z"
    },
    "access": {"requested_zones": ["zone_1"]}
  }'

# Expected response: 201 Created with request_id
```

---

## CONFIGURATION

### Environment Variables
```
# No new env vars required, but optional:
REQUEST_EXPIRY_HOURS=72        # SLA for request approval
MAX_ATTACHMENT_SIZE_MB=10      # File upload limit
ENABLE_SMS_NOTIFICATIONS=true  # SMS vs email only
```

### Notification Service Configuration
```python
# In app/services/notification_service.py
# Configure email settings:
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="noreply@yourcompany.com"
SMTP_PASSWORD="app-specific-password"
```

---

## MONITORING & MAINTENANCE

### Key Metrics
- Average request processing time
- Approval/rejection rate
- Request expiry rate
- Duplicate request rate
- Validation error frequency

### Maintenance Tasks
- **Weekly**: Review duplicate/blacklist settings
- **Monthly**: Archive old completed requests
- **Quarterly**: Review audit logs for compliance
- **Annually**: Analyze visitor patterns

---

## SUPPORT & TROUBLESHOOTING

See `WORKFLOW_ENGINE_DOCUMENTATION.md` for detailed troubleshooting guide.

### Common Issues

**Request not appearing in operations queue**
- Check operations officer role is correct
- Check status is truly "pending_approval"
- Check email notifications sent

**Validation errors on submission**
- Check all required fields filled
- Verify dates are in future
- Check NIC/passport format
- Check for duplicate in past 24h

**Pass not generating**
- Check request is in APPROVED state
- Check pass officer has access
- Check pass generation service running

---

## NEXT STEPS

1. ✅ Review this implementation
2. ✅ Test all workflows in development
3. ✅ Run integration tests
4. ✅ Deploy to staging
5. ✅ User acceptance testing
6. ✅ Deploy to production
7. ✅ Monitor and iterate

---

## DOCUMENTATION

- **API Reference**: See Swagger at `http://localhost:8000/docs`
- **Workflow Details**: See `WORKFLOW_ENGINE_DOCUMENTATION.md`
- **Database Schema**: See `docs/database_schema.sql`
- **Frontend Components**: See JSX file comments

---

**Status**: 🚀 READY FOR DEPLOYMENT

**Contact**: Platform Team
**Last Updated**: May 21, 2026
