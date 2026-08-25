# Enterprise Workflow State Machine - Complete Documentation

## Executive Summary

This document describes the formal workflow state machine implementation for the visitor pass management system. It provides a production-grade workflow engine with:

- **10 Distinct States**: DRAFT → PENDING_APPROVAL → UNDER_REVIEW → APPROVED → ISSUED → CHECKED_IN → CHECKED_OUT (or terminal states: REJECTED, EXPIRED, CANCELLED)
- **Formal State Transitions**: Only authorized roles can perform specific transitions
- **Comprehensive Validation**: Multi-layer validation for duplicate detection, blacklist checking, time conflicts, zone capacity
- **Audit Logging**: Complete trail of all state changes and actor information
- **Notifications**: Automatic notifications at each workflow milestone
- **Public Portal**: No-auth visitor request submission with tracking

---

## REQUEST LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISITOR PASS REQUEST LIFECYCLE                │
└─────────────────────────────────────────────────────────────────┘

        Public Submission
               ▼
         [DRAFT STATE]
               │
               │ submit_request()
               ▼
    [PENDING_APPROVAL STATE]  ◄─── Awaiting Operations Review
               │
               │ operations_start_review()
               ▼
      [UNDER_REVIEW STATE]   ◄─── Operations Officer Reviewing
               │
        ┌──────┴──────┐
        │             │
   approve()       reject()
        │             │
        ▼             ▼
   [APPROVED]    [REJECTED] ◄─── TERMINAL STATE
        │
        │ pass_officer_issue()
        ▼
    [ISSUED STATE]  ◄─── Pass Generated, Ready for Visitor
        │
        │ gate_officer_check_in()
        ▼
  [CHECKED_IN STATE]  ◄─── Visitor at Gate
        │
        │ gate_officer_check_out()
        ▼
 [CHECKED_OUT STATE]  ◄─── TERMINAL STATE (Success)

Additional Terminal States:
- EXPIRED: Auto-transition if request not approved in time
- CANCELLED: Can be cancelled from active states by requester or admin
```

---

## REQUEST STATES

### 1. DRAFT
- **Description**: Initial state, form is being filled out (not yet submitted)
- **Actor**: Public requester
- **Actions**:
  - Fill visitor information
  - Submit to PENDING_APPROVAL
  - Cancel request
- **Data Captured**:
  - Requester information (name, email, phone)
  - Visitor information (name, NIC, phone, organization, photo)
  - Visit details (purpose, date, time, duration, building)
  - Access requirements (zones, vehicle, equipment)
  - Supporting documents

### 2. PENDING_APPROVAL
- **Description**: Submitted and awaiting operations officer review
- **Actor**: Operations Officer (required action)
- **Triggers**:
  - Email notification to all operations officers
  - SMS notification (optional)
- **Actions**:
  - Start review (→ UNDER_REVIEW)
  - View request details
  - Request additional information from requester
- **Data Locked**: Visitor information (cannot be changed without admin override)

### 3. UNDER_REVIEW
- **Description**: Operations officer is actively reviewing the request
- **Actor**: Operations Officer
- **Validation During Review**:
  - Duplicate request check
  - Visitor blacklist check
  - Time conflict check
  - Zone capacity check
  - Document validation
- **Actions**:
  - Approve (→ APPROVED)
  - Reject with reason (→ REJECTED)
  - Request clarification from requester
  - Override zones if needed
- **Audit Trail Recorded**: All review comments and decisions

### 4. APPROVED
- **Description**: Request approved by operations, ready for pass generation
- **Actor**: Pass Officer (required action)
- **Triggers**:
  - Email notification to all pass officers
  - Appears in pass generation queue
  - SMS notification (optional)
- **Data Locked**: Request details finalized
- **Actions**:
  - Issue pass (→ ISSUED)
  - Request information from operations if needed

### 5. ISSUED
- **Description**: Pass has been generated with QR code and badge
- **Actor**: Gate Officer (monitoring)
- **Triggers**:
  - Email notification to gate officers with visitor details
  - Pass available for scanning
  - Public notification to requester
- **Actions**:
  - Check visitor in (→ CHECKED_IN)
  - Can cancel if visitor doesn't show up
- **Data Immutable**: Pass details cannot be changed

### 6. CHECKED_IN
- **Description**: Visitor scanned QR code at gate, confirmed entry
- **Actor**: Security Gate Officer
- **Triggers**:
  - Entry recorded in audit log
  - Visitor tracked in system
- **Actions**:
  - Check visitor out (→ CHECKED_OUT)
  - Emergency cancel if needed
- **Tracking Active**: Real-time duration tracking

### 7. CHECKED_OUT
- **Description**: Visitor exited, request complete
- **Status**: TERMINAL STATE (Success)
- **Actor**: Security Gate Officer
- **Triggers**:
  - Exit recorded in audit log
  - Duration calculated
  - Request archived
- **Data Archived**: Request frozen for compliance/audit

### 8. REJECTED
- **Status**: TERMINAL STATE (Failed)
- **Reason**: Operations officer rejected the request
- **Triggers**:
  - Email notification to requester with rejection reason
  - Requester can resubmit new request
- **Data Archived**: Stored for audit trail

### 9. EXPIRED
- **Status**: TERMINAL STATE (Timeout)
- **Condition**: Request not approved within SLA timeframe
- **Default SLA**: 72 hours from submission
- **Auto-Transition**: System cron job expires old requests
- **Triggers**:
  - Email notification to requester: "Your request has expired"
  - Requester can resubmit

### 10. CANCELLED
- **Status**: TERMINAL STATE (Cancelled)
- **Can be triggered by**:
  - Requester (from DRAFT, PENDING_APPROVAL)
  - Admin (from any active state)
- **Reasons recorded**: Why was it cancelled?
- **Data Archived**: For compliance

---

## ROLE-BASED ACCESS CONTROL

### PUBLIC_REQUESTER
- **Permissions**:
  - Submit new request (DRAFT → PENDING_APPROVAL)
  - View own request status (tracking page)
  - Cancel own request (if not already approved)
  - Receive notifications
- **Restrictions**:
  - Cannot edit request after submission
  - Cannot access admin/operations features
  - Cannot view other requests

### OPERATIONS_OFFICER
- **Permissions**:
  - View all pending requests (PENDING_APPROVAL state)
  - Start review (PENDING_APPROVAL → UNDER_REVIEW)
  - Approve request (UNDER_REVIEW → APPROVED)
  - Reject request with reason (UNDER_REVIEW → REJECTED)
  - Override zones during approval
  - Request clarification from requester
  - View request history and audit trail
  - Comment on requests
- **Responsibilities**:
  - Verify visitor legitimacy
  - Check for conflicts/duplicates
  - Validate access requirements
  - Ensure compliance with policies
  - Make approval/rejection decision

### PASS_OFFICER
- **Permissions**:
  - View approved requests (APPROVED state)
  - Issue pass (APPROVED → ISSUED)
  - Generate QR code and badge
  - Link pass record to request
  - View request details
- **Restrictions**:
  - Cannot approve/reject requests
  - Cannot manage users or access policies

### SECURITY_GATE_OFFICER
- **Permissions**:
  - View active passes (ISSUED state)
  - Check visitor in (ISSUED → CHECKED_IN)
  - Check visitor out (CHECKED_IN → CHECKED_OUT)
  - Scan QR codes
  - View visitor details
  - Record entry/exit notes
- **Restrictions**:
  - Cannot approve requests
  - Cannot issue passes
  - Cannot manage zones or policies

### ADMIN
- **Permissions**:
  - All operations from all roles
  - Override any state transition
  - Manage workflows, states, and transitions
  - Configure SLAs and policies
  - Access all audit logs
  - Manage user roles and permissions
  - System configuration and monitoring

---

## VALIDATION ENGINE

### 1. Duplicate Request Detection
```
Check: Same requester + same visitor + overlapping dates in past 24 hours
Result: DUPLICATE_REQUEST error
```

### 2. Blacklist Check
```
Check: Visitor name in security blacklist
Result: BLACKLISTED_VISITOR error
Action: Escalate to security team
```

### 3. NIC/Passport Validation
```
Formats:
- Sri Lankan NIC: 9 digits + V/X (e.g., 123456789V)
- Passport: 2 letters + 6-9 digits (e.g., AA123456)
Result: INVALID_NIC error if format fails
```

### 4. Date/Time Validation
```
Rules:
- Entry time must be in future (≥ now)
- Entry time must be ≤ 30 days from now
- Exit time must be after entry time
- Duration ≤ 24 hours
Result: Multiple INVALID_DATE_RANGE errors if failed
```

### 5. Zone Validation
```
Valid zones: zone_1, zone_2, zone_3, cargo, office
Check: All requested zones are valid
Result: INVALID_DOCUMENT error if zone invalid
```

### 6. Time Conflict Check
```
Check: No overlapping approved passes for same visitor
Check: Zone capacity not exceeded for requested time
Result: TIME_CONFLICT or ZONE_CAPACITY_EXCEEDED error
```

### 7. Email/Phone Validation
```
Email: Standard regex pattern validation
Phone: 7-15 digits, spaces, dashes, parentheses allowed
Result: INVALID_EMAIL or INVALID_PHONE error
```

### 8. Host Employee Validation
```
Check: If host_employee_id provided, verify exists in system
Result: MISSING_HOST_EMPLOYEE error if not found
```

---

## AUDIT LOGGING

Every state transition is logged with:

```json
{
  "timestamp": "2025-05-21T10:30:00Z",
  "action": "TRANSITION_TO_UNDER_REVIEW",
  "entity_type": "visitor_request",
  "entity_id": 123,
  "request_id": "REQ-20250521-AB12",
  "actor_id": 5,
  "actor_name": "john_ops",
  "actor_role": "operations_officer",
  "previous_state": "pending_approval",
  "new_state": "under_review",
  "reason": "Starting review process",
  "metadata": {
    "visitor_name": "Jane Smith",
    "zones": ["zone_1", "zone_2"]
  }
}
```

### Audit Trail Preserved For:
- GDPR compliance (2+ years)
- Security investigations
- Audit reports
- Performance analysis
- Dispute resolution

---

## NOTIFICATIONS

### 1. Public Submission (DRAFT → PENDING_APPROVAL)
**Recipients**: Operations team, Requester
**Content**:
- Request ID: REQ-20250521-AB12
- Visitor: Jane Smith
- Visit: May 22, 2025, 10:00-14:00
- Zones: Zone 1, Zone 2
**Channel**: Email, SMS

### 2. Approval Decision (UNDER_REVIEW → APPROVED or REJECTED)
**Recipients**: Requester
**Approved Content**:
- "Your request has been approved"
- Expected pass generation timeline
**Rejected Content**:
- "Your request was rejected"
- Rejection reason
- How to resubmit

### 3. Pass Issued (APPROVED → ISSUED)
**Recipients**: Gate officers, Requester
**Content**:
- QR code image
- Pass details
- Visitor arrival instructions
**Channel**: Email, SMS

### 4. Entry/Exit (CHECKED_IN / CHECKED_OUT)
**Recipients**: Operations team (optional)
**Content**:
- Visitor entry/exit confirmation
- Duration in facility

---

## API ENDPOINTS

### Public Endpoints (No Auth Required)

```
POST /api/visitor-requests/submit
  Body: PublicVisitorRequestCreate
  Response: PublicVisitorRequestResponse
  Description: Submit new visitor pass request

POST /api/visitor-requests/validate
  Body: PublicVisitorRequestCreate
  Response: RequestValidationResponse
  Description: Validate request without submitting

POST /api/visitor-requests/track
  Body: PublicRequestStatusTrack
  Response: PublicRequestStatusResponse
  Description: Track request status using Request ID + email
```

### Authenticated Endpoints (Require Login)

```
GET /api/visitor-requests/{request_id}/full
  Auth: ADMIN, OPERATIONS_OFFICER, PASS_OFFICER
  Response: RequestFullDetails
  Description: Get complete request with audit history

POST /api/visitor-requests/{request_id}/transition
  Auth: Any authenticated user (role-based)
  Body: WorkflowTransitionRequest
  Response: WorkflowTransitionResponse
  Description: Perform state transition

POST /api/visitor-requests/{request_id}/approve
  Auth: ADMIN, OPERATIONS_OFFICER
  Body: RequestOperationsApproval
  Response: WorkflowTransitionResponse
  Description: Approve request for pass generation

POST /api/visitor-requests/{request_id}/reject
  Auth: ADMIN, OPERATIONS_OFFICER
  Body: Query param: reason (string)
  Response: WorkflowTransitionResponse
  Description: Reject request with reason

POST /api/visitor-requests/{request_id}/issue-pass
  Auth: ADMIN, PASS_OFFICER
  Body: RequestPassIssuing
  Response: WorkflowTransitionResponse
  Description: Issue pass after approval

POST /api/visitor-requests/{request_id}/check-in
  Auth: ADMIN, SECURITY_GATE_OFFICER
  Body: RequestCheckIn
  Response: WorkflowTransitionResponse
  Description: Record visitor entry

POST /api/visitor-requests/{request_id}/check-out
  Auth: ADMIN, SECURITY_GATE_OFFICER
  Body: RequestCheckOut
  Response: WorkflowTransitionResponse
  Description: Record visitor exit
```

---

## DATABASE SCHEMA

### visitor_requests Table

```sql
-- Core ID and status
id (PRIMARY KEY)
request_id (UNIQUE) - "REQ-20250521-AB12"
status - Enum: draft, pending_approval, under_review, approved, rejected, issued, checked_in, checked_out, expired, cancelled
current_stage - Enum: initial_submission, operations_validation, pass_generation, access_verification

-- Requester Info
requester_name
requester_email
requester_phone

-- Visitor Info
visitor_name
visitor_email
visitor_phone
visitor_nic
visitor_organization
visitor_photo_url
visitor_purpose

-- Visit Details
visit_building_department
host_employee_id (FK: users)
host_employee_name
requested_date
requested_end_date
expected_duration_minutes

-- Access Requirements
requested_zones (JSON: ["zone_1", "zone_2"])
vehicle_number
carrying_equipment (BOOLEAN)
equipment_description

-- Additional
additional_notes
supporting_docs_urls (JSON: ["url1", "url2"])

-- Approval Trail
operations_officer_id (FK: users)
operations_reviewed_at
operations_comments
operations_approved (BOOLEAN)
rejection_reason

-- Pass Issuance
pass_officer_id (FK: users)
pass_issued_at
pass_record_id (FK: passes)

-- Gate Operations
gate_officer_checked_in_id (FK: users)
checked_in_at
gate_officer_checked_out_id (FK: users)
checked_out_at

-- System
created_at
updated_at
submitted_at
workflow_transitions (JSON: transaction history)
```

---

## DEPLOYMENT CHECKLIST

### Backend Setup
- [ ] Create `app/core/workflow.py` - Workflow state machine
- [ ] Create `app/services/request_validator.py` - Validation engine
- [ ] Create `app/services/workflow_service.py` - Workflow operations
- [ ] Create `app/schemas/visitor_request_v2.py` - Request/response models
- [ ] Create `app/api/routes/visitor_requests_v2.py` - API endpoints
- [ ] Update `app/models/visitor_request.py` - Enhanced model
- [ ] Update `app/main.py` - Include new routes
- [ ] Migrate database: Add new columns to visitor_requests table

### Frontend Setup
- [ ] Create `src/pages/PublicRequestPortal.jsx` - Multi-step form
- [ ] Create `src/pages/PublicRequestPortal.css` - Styling
- [ ] Create `src/pages/RequestTrackingPage.jsx` - Status tracking
- [ ] Create `src/pages/OperationsApprovalPage.jsx` - Operations dashboard
- [ ] Update router to include new pages
- [ ] Update API client with new endpoints

### Testing
- [ ] Unit tests: Workflow state machine validation
- [ ] Unit tests: Request validation (all validators)
- [ ] Integration tests: End-to-end request submission
- [ ] Integration tests: State transitions
- [ ] Load testing: Concurrent requests
- [ ] Security testing: RBAC enforcement
- [ ] Audit trail testing: All transitions logged

### Deployment
- [ ] Database migrations applied
- [ ] Backend tests passing
- [ ] Frontend tests passing
- [ ] Environment variables configured
- [ ] SMTP/Notification service configured
- [ ] AWS S3/file uploads configured
- [ ] Monitoring/alerting enabled
- [ ] Backup strategy in place

---

## TROUBLESHOOTING

### Issue: Request stuck in PENDING_APPROVAL
**Cause**: No operations officers have reviewed it
**Solution**: 
1. Check if operations officers exist and have correct role
2. Check email notifications are being sent
3. Manually escalate or reassign

### Issue: Validation error: "Duplicate request detected"
**Cause**: Same visitor/requester requested in past 24 hours
**Solution**:
1. Check if duplicate is actually in system
2. Admin can approve both if legitimate
3. Update duplicate detection window if needed

### Issue: Zone capacity exceeded
**Cause**: Too many visitors requested for same zone/time
**Solution**:
1. Change requested time/date
2. Request different zones
3. Admin can override if approved

### Issue: Pass not appearing after approval
**Cause**: Pass officer hasn't issued pass yet
**Solution**:
1. Check pass officer has access to approved requests
2. Manually trigger pass issuance
3. Check pass generation service is running

---

## PERFORMANCE OPTIMIZATION

### Database Indices
```sql
CREATE INDEX idx_request_status ON visitor_requests(status);
CREATE INDEX idx_request_created ON visitor_requests(created_at DESC);
CREATE INDEX idx_request_visitor_date ON visitor_requests(visitor_name, requested_date);
CREATE INDEX idx_request_requester_email ON visitor_requests(requester_email);
```

### Query Optimization
- Use pagination (20 items per page default)
- Cache validation rules and blacklist
- Use connection pooling (SQLAlchemy)
- Archive old requests to archive table annually

---

## Future Enhancements

1. **Machine Learning**: Automatic risk scoring for requests
2. **SMS Notifications**: Two-way SMS communication
3. **Mobile App**: Native app for gate officers
4. **Visitor Analytics**: Dashboard showing visitor patterns
5. **Integration**: LDAP/Active Directory for host employee lookup
6. **Biometric**: Fingerprint/facial recognition at gate
7. **Multi-language**: Internationalization support
8. **AI Chatbot**: Support agent for requester questions

