
<style>
    @page {
        size: a4 portrait;
        margin: 2.5cm;
        @frame header_frame {
            -pdf-frame-content: header_content;
            left: 2.5cm; right: 2.5cm; top: 1cm; height: 1.5cm;
        }
        @frame footer_frame {
            -pdf-frame-content: footer_content;
            left: 2.5cm; right: 2.5cm; bottom: 1cm; height: 1cm;
        }
    }
    body {
        font-family: Helvetica, sans-serif;
        font-size: 10pt;
        color: #1E293B;
    }
    h1 {
        color: #0B1F3A;
        font-size: 18pt;
        margin-top: 20pt;
        margin-bottom: 10pt;
        page-break-before: always;
    }
    h1.cover-title {
        font-size: 24pt;
        text-align: center;
        page-break-before: avoid;
        margin-top: 150pt;
    }
    h2 {
        color: #0369A1;
        font-size: 14pt;
        margin-top: 15pt;
        margin-bottom: 8pt;
    }
    h3 {
        color: #0B1F3A;
        font-size: 12pt;
        margin-top: 12pt;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15pt;
    }
    th, td {
        border: 1px solid #CBD5E1;
        padding: 6pt;
        vertical-align: top;
    }
    th {
        background-color: #0B1F3A;
        color: white;
        font-weight: bold;
    }
    tr:nth-child(even) {
        background-color: #F0F4F8;
    }
    .tbc {
        color: #92400E;
        font-weight: bold;
        background-color: #FEF3C7;
        padding: 2px 4px;
        border-radius: 4px;
    }
    .alert {
        border-left: 4px solid #0369A1;
        background-color: #F0F9FF;
        padding: 10pt;
        margin-bottom: 10pt;
    }
    .cover-subtitle {
        font-size: 14pt;
        text-align: center;
        color: #64748B;
        margin-bottom: 50pt;
    }
    .cover-details {
        width: 60%;
        margin: 0 auto;
        margin-top: 50pt;
    }
</style>

<div id="header_content" style="text-align: right; font-size: 8pt; color: #64748B; border-bottom: 1px solid #CBD5E1; padding-bottom: 5px;">
    Port Visitor Pass Management System | Business Analysis & SRS
</div>
<div id="footer_content" style="text-align: center; font-size: 8pt; color: #64748B; border-top: 1px solid #CBD5E1; padding-top: 5px;">
    CONFIDENTIAL | Version 1.0 | 28 August 2026 | Page  of 
</div>

<!-- COVER PAGE -->
<h1 class="cover-title">PORT VISITOR PASS MANAGEMENT SYSTEM</h1>
<div class="cover-subtitle">Business Analysis & System Requirements Specification<br/><b>Client Solution & Functional Specification</b></div>

<table class="cover-details">
    <tr><th>Document Type</th><td>Business Analysis & System Requirements Specification</td></tr>
    <tr><th>Version</th><td>1.0</td></tr>
    <tr><th>Date</th><td>28 August 2026</td></tr>
    <tr><th>Prepared By</th><td>Tihan Liyanage</td></tr>
    <tr><th>Client</th><td>Mr. Shylendra Jeewakarathna</td></tr>
    <tr><th>Confidentiality</th><td>Confidential</td></tr>
</table>



# DOCUMENT CONTROL

<table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Document Title</td><td>Port Visitor Pass Management System</td></tr>
    <tr><td>Document Type</td><td>Business Analysis & System Requirements Specification</td></tr>
    <tr><td>Version</td><td>1.0</td></tr>
    <tr><td>Status</td><td>Final / Ready for Review</td></tr>
    <tr><td>Date</td><td>28 August 2026</td></tr>
    <tr><td>Prepared By</td><td>Tihan Liyanage</td></tr>
    <tr><td>Client</td><td>Mr. Shylendra Jeewakarathna</td></tr>
    <tr><td>Confidentiality</td><td>Confidential</td></tr>
</table>

# VERSION HISTORY

<table>
    <tr><th>Version</th><th>Date</th><th>Author</th><th>Description</th></tr>
    <tr><td>1.0</td><td>28 August 2026</td><td>Tihan Liyanage</td><td>Initial formal document generated from verified system architecture.</td></tr>
</table>

<!-- Note: xhtml2pdf TOC is slightly tricky via Markdown, relying on standard PDF bookmarks -->

# 1. EXECUTIVE SUMMARY

The **Port Visitor Pass Management System (PORT PASS PRO)** is an enterprise-grade web application designed to automate, secure, and streamline the end-to-end lifecycle of visitor access within a port environment. 

The system solves the operational problem of manual, fragmented visitor processing by providing a centralized platform where public visitors can request access, internal departments can approve visits, and security personnel can issue and monitor secure QR-coded passes. By implementing a strict state-machine workflow (Draft → Department Approval → Operations Review → Issued → Checked In/Out), the system ensures full accountability, eliminates unauthorized access, and maintains a comprehensive digital audit trail of all operational events. It is designed to be deployed securely on an office Local Area Network (LAN).

# 2. BUSINESS CONTEXT

Port environments require strict visitor access control to ensure safety, security, and compliance. The business context involves multiple operational layers:
*   **Public/External Access:** Visitors needing entry must submit formalized requests.
*   **Department Sponsorship:** Internal employees (hosts) or Department Managers must validate the business need for the visit.
*   **Operations & Security:** Central operations officers must verify identity (NIC/Passport) and background before authorizing access.
*   **Gate Control:** Physical entry points require fast, accurate verification (via QR scanning) to prevent bottlenecks while maintaining security.
*   **Auditability:** Management requires real-time visibility into who is currently on-site and historical records of all movements.

# 3. BUSINESS PROBLEM

**Verified Existing Problems (Addressed by System):**
*   Manual visitor processing and decentralized records.
*   Delayed inter-departmental approvals.
*   Difficulty tracking the real-time status of active passes (who is currently on-site).
*   Weak traceability of who approved a pass and when.
*   Lack of operational visibility into daily gate traffic.

**<span class="tbc">TBC — Existing manual process requires client confirmation to baseline exact time/cost savings.</span>**

# 4. BUSINESS OBJECTIVES

*   **BO-001:** Centralize all visitor requests into a single digital platform.
*   **BO-002:** Standardize the multi-tier approval workflow (Department → Operations).
*   **BO-003:** Improve gate monitoring via real-time QR code scanning and status validation.
*   **BO-004:** Maintain a secure, immutable audit trail of all system actions.
*   **BO-005:** Provide real-time reporting and analytics on visitor traffic and zone capacity.

# 5. STAKEHOLDER ANALYSIS

<table>
    <tr><th>Stakeholder</th><th>Role</th><th>Responsibilities</th><th>System Interaction</th></tr>
    <tr><td>Admin</td><td>System Administrator</td><td>Manages users, zones, capacities, and oversees system health.</td><td>Full access to all modules, logs, and settings.</td></tr>
    <tr><td>Department Manager</td><td>Department Approver</td><td>Validates business need for visits addressed to their department.</td><td>Department Approvals Queue.</td></tr>
    <tr><td>Operations Officer</td><td>Security/Ops Reviewer</td><td>Performs final validation, assigns visitor classifications (Normal/VIP), handles rejections.</td><td>Operations Approval Queue, Passes.</td></tr>
    <tr><td>Pass Officer</td><td>Pass Issuer</td><td>Generates physical/digital passes with QR codes.</td><td>Pass Issuing, Pass Management, Group Passes.</td></tr>
    <tr><td>Gate Officer</td><td>Access Controller</td><td>Scans passes at physical gates, logs check-ins and check-outs.</td><td>Gate Control Module.</td></tr>
    <tr><td>Public Visitor</td><td>Requester</td><td>Submits requests for entry.</td><td>Public Visitor Request Portal.</td></tr>
</table>

# 6. USER ROLES AND RESPONSIBILITIES

**1. Administrator (`admin`)**
*   **Purpose:** Overall system governance.
*   **Permissions:** Unrestricted access across the platform, including Audit Logs and User Management.

**2. Department Manager (`department_manager`)**
*   **Purpose:** First-line approval.
*   **Permissions:** Can view and approve/reject requests targeted at their specific department. 

**3. Operations Officer (`operations_officer`)**
*   **Purpose:** Security vetting.
*   **Permissions:** Reviews department-approved requests, assigns VIP/LMV status, provides final approval.

**4. Pass Officer (`pass_officer`)**
*   **Purpose:** Issuance.
*   **Permissions:** Generates passes, handles group passes, prints/distributes QR codes.

**5. Security Gate Officer (`security_gate_officer`)**
*   **Purpose:** Physical security enforcement.
*   **Permissions:** Can search passes, view visitor profiles, and trigger check-in/check-out events.

# 7. AS-IS PROCESS

**<span class="tbc">TBC — Existing manual process requires client confirmation. Currently assumed to be paper-based or email-driven logbooks lacking real-time centralization.</span>**

# 8. TO-BE PROCESS

**System-Enabled Workflow:**
1.  **Request:** Public visitor submits request via portal. (Status: `pending_department_approval`)
2.  **Department Approval:** Manager approves. (Status: `pending_approval`)
3.  **Operations Review:** Ops Officer verifies NIC and assigns zones/VIP status. (Status: `approved`)
4.  **Pass Issuing:** Pass Officer generates QR pass. (Status: `issued`)
5.  **Gate Check-In:** Visitor arrives, Gate Officer scans QR. (Status: `checked_in`)
6.  **Gate Check-Out:** Visitor leaves, Gate Officer logs exit. (Status: `checked_out`)

# 9. BUSINESS PROCESS WORKFLOWS

### 9.1 Visitor Request
External users submit forms containing personal details, NIC/Passport, host employee, department, vehicle registration, and equipment details.
### 9.2 Department Approval
Managers view a filtered queue of requests targeting their department. They can approve (forward to Ops) or reject (terminate workflow).
### 9.3 Operations Approval
Officers review detailed identity profiles, assign classifications (e.g., VIP, LMV1/LMV2 routing), and provide final clearance.
### 9.4 Pass Issuing
Authorized officers generate secure passes containing hashed QR data and exact zone access arrays.
### 9.5 Visitor Check-In / 9.6 Check-Out
Gate officers use lookup or scanners to retrieve visitor profiles. The system strictly prevents check-in of unissued passes or check-out of visitors not checked in.
### 9.7 Audit Trail
Every state change, login, and data modification is asynchronously recorded in the `audit_logs` table.

# 10. FUNCTIONAL REQUIREMENTS

<table>
    <tr><th>ID</th><th>Requirement</th><th>Priority</th><th>Role</th><th>Acceptance Criteria</th></tr>
    <tr><td>FR-001</td><td>User Authentication</td><td>High</td><td>All Internal</td><td>Valid credentials yield a JWT token; invalid are rejected.</td></tr>
    <tr><td>FR-002</td><td>Role-Based Access</td><td>High</td><td>All Internal</td><td>Users cannot access UI routes or APIs outside their assigned `UserRole`.</td></tr>
    <tr><td>FR-003</td><td>Public Request Submission</td><td>High</td><td>Public</td><td>Unauthenticated users can submit a request and receive a tracking ID.</td></tr>
    <tr><td>FR-004</td><td>Workflow State Enforcement</td><td>High</td><td>System</td><td>A pass cannot bypass the `pending_approval` state to become `issued` directly.</td></tr>
    <tr><td>FR-005</td><td>QR Code Verification</td><td>High</td><td>Gate Officer</td><td>Scanning a valid QR code retrieves the current visitor profile and status.</td></tr>
    <tr><td>FR-006</td><td>VIP & LMV Routing</td><td>Medium</td><td>Ops Officer</td><td>Ops can classify a visitor as VIP and specify LMV gate routing (LMV1/LMV2/Both).</td></tr>
    <tr><td>FR-007</td><td>Zone Capacity Tracking</td><td>Medium</td><td>System</td><td>The dashboard must reflect current active visitors against predefined zone capacities.</td></tr>
</table>

# 11. MODULE-WISE REQUIREMENTS

### Dashboard
*   **Purpose:** High-level operational overview.
*   **Outputs:** KPIs (Awaiting Issue, Currently Inside), Zone Capacity gauges, Daily Volume charts.

### Visitor Requests (Public)
*   **Purpose:** Data entry portal for visitors.
*   **Validation:** Sri Lankan NIC format (9 digits + V/X or 12 digits), Phone formats.

### Operations Approval
*   **Purpose:** Final vetting stage.
*   **Inputs:** Department-approved requests.
*   **Outputs:** Approved or Rejected state, VIP flags.

### Gate Control
*   **Purpose:** Live gate operations.
*   **Processing:** Checks current status. Prevents double-entry (checking in someone already checked in).

### Audit Trail
*   **Purpose:** Security compliance.
*   **Processing:** Read-only ledger of actions (CREATE, UPDATE, DELETE, LOGIN, CHECK_IN).

# 12. DATA REQUIREMENTS

<table>
    <tr><th>Entity</th><th>Purpose</th><th>Key Information</th></tr>
    <tr><td>users</td><td>System accounts</td><td>Username, Password Hash, Role, Department_ID</td></tr>
    <tr><td>visitor_requests</td><td>Tracks the request lifecycle</td><td>Requester details, NIC, Status, Workflow Timestamps</td></tr>
    <tr><td>passes</td><td>Active/Historical passes</td><td>Pass No (QR), Zone array, Pass Type, Status</td></tr>
    <tr><td>departments</td><td>Organizational units</td><td>Name, Manager Name</td></tr>
    <tr><td>audit_logs</td><td>Security ledger</td><td>Action, Entity, User_ID, Timestamp, IP Address (Future)</td></tr>
    <tr><td>zone_capacities</td><td>Occupancy limits</td><td>Zone ID, Max Capacity</td></tr>
</table>

# 13. BUSINESS RULES

*   **BR-001:** A request must be approved by both a Department Manager and an Operations Officer before a pass can be issued.
*   **BR-002:** A visitor cannot be checked out if they have not been checked in.
*   **BR-003:** VIP visitors must be explicitly assigned LMV gate routing.
*   **BR-004:** Pass Officers cannot approve requests; Operations Officers cannot issue passes (Segregation of Duties).

# 14. VALIDATION RULES

*   **Identity:** NIC must match Sri Lankan format (e.g. 199012345678 or 901234567V).
*   **Dates:** `requested_end_date` must be strictly greater than `requested_date`.
*   **State Machine:** Check-in requires status `issued`. Check-out requires status `checked_in`.

# 15. ROLE AND ACCESS CONTROL MATRIX

<table>
    <tr><th>Function</th><th>Admin</th><th>Dept Manager</th><th>Ops Officer</th><th>Pass Officer</th><th>Gate Officer</th></tr>
    <tr><td>Dashboard</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
    <tr><td>Dept Approvals</td><td>✓</td><td>✓</td><td></td><td></td><td></td></tr>
    <tr><td>Ops Approvals</td><td>✓</td><td></td><td>✓</td><td></td><td></td></tr>
    <tr><td>Issue Passes</td><td>✓</td><td></td><td></td><td>✓</td><td></td></tr>
    <tr><td>Pass Management</td><td>✓</td><td></td><td></td><td>✓</td><td></td></tr>
    <tr><td>Gate Control</td><td>✓</td><td></td><td></td><td></td><td>✓</td></tr>
    <tr><td>Reports & Audit</td><td>✓</td><td></td><td></td><td></td><td></td></tr>
</table>

# 16. NON-FUNCTIONAL REQUIREMENTS

*   **NFR-001 Security:** Passwords must be hashed using bcrypt. APIs must be protected by JWT (JSON Web Tokens).
*   **NFR-002 Performance:** The Gate Control lookup must return visitor details in under 1 second.
*   **NFR-003 Usability:** The system must use a responsive CSS grid layout to support tablets used by gate officers.

# 17. MULTI-USER AND CONCURRENT ACCESS

The system is designed for concurrent multi-user environments. 
**Recommended LAN server architecture:**
```text
Dell Server PC (10.170.82.8)
        |
        +-- FastAPI (Port 8000)
        |
        +-- PostgreSQL (Port 5432)
        |
        +-- Vite Static Assets (Port 5173)
        |
       Office LAN (Wi-Fi/Ethernet)
        |
  +-----+-----+-----+
  |           |     |
 HR PC     Ops PC  Gate Tablet
```
The architecture uses PostgreSQL with SQLAlchemy connection pooling, ensuring transaction safety when multiple officers process requests simultaneously.

# 18. SYSTEM ARCHITECTURE

*   **Frontend:** React 18 Single Page Application, Vite, Ant Design & Material UI components, Zustand for state management.
*   **Backend:** FastAPI (Python 3), Uvicorn ASGI server.
*   **Database:** PostgreSQL 18.
*   **Communication:** RESTful JSON APIs secured via JWT in Authorization headers.

# 19. DEPLOYMENT ARCHITECTURE

**CURRENT / IMPLEMENTED:**
The system is deployed on a central office PC. 
*   **Network:** LAN deployment accessible via `http://10.170.82.8:5173`.
*   **Firewall:** Windows Firewall rules explicitly allow inbound TCP on 5173 (Frontend) and 8000 (Backend).
*   **Startup:** Managed via batch scripts (`start_all.bat`).

# 20. SECURITY REQUIREMENTS

**Currently Implemented:**
*   JWT-based stateless authentication (token expires in 480 minutes).
*   Bcrypt password hashing.
*   CORS configured for network access.
*   SQLAlchemy ORM prevents SQL injection.
*   Strict RBAC enforcement on API endpoints.

**<span class="tbc">RECOMMENDED Before Public Internet Production:</span>**
*   Implement HTTPS/TLS via Nginx reverse proxy.
*   Implement rate limiting to prevent brute force.

# 21. REPORTING AND ANALYTICS

*   **Dashboard KPIs:** Live counts of pending requests, active passes, and visitors currently on-site.
*   **Zone Analytics:** Visual pie charts detailing occupancy across physical zones.
*   **Tabular Reports:** Paginated, filterable tables for historical pass data and audit logs.

# 22. AUDIT AND TRACEABILITY

The system maintains an immutable `audit_logs` table. Every significant state change (login, approval, check-in) generates a log containing the `user_id`, `action`, `entity_type`, and a UTC timestamp, ensuring full non-repudiation of officer actions.

# 23. USER EXPERIENCE

The UI provides a "Command Center" aesthetic with dark-mode optimized colors (Deep Navy, Cyan). Modals utilize clean CSS Grid layouts for equal-width data presentation. Empty states, skeleton loaders, and pulsing status dots provide continuous user feedback.

# 24. ASSUMPTIONS

*   **ASM-001:** The server PC (Dell) remains powered on during operational hours.
*   **ASM-002:** The office LAN provides stable connectivity to gate areas.
*   **<span class="tbc">ASM-003: Client operational policies align with the system's strict sequential workflow. (TBC)</span>**

# 25. CONSTRAINTS

*   **Network Dependency:** Gate tablets must be connected to the office Wi-Fi network `10.170.82.8`.
*   **Database:** Requires PostgreSQL; SQLite was deprecated for concurrency reasons.

# 26. RISKS

<table>
    <tr><th>ID</th><th>Risk</th><th>Impact</th><th>Probability</th><th>Mitigation</th></tr>
    <tr><td>R-01</td><td>Server PC goes offline</td><td>High</td><td>Medium</td><td>Ensure dedicated power/UPS for the server PC.</td></tr>
    <tr><td>R-02</td><td>Wi-Fi dead zones at gates</td><td>High</td><td>Medium</td><td>Deploy Wi-Fi extenders at physical gate locations.</td></tr>
</table>

# 27. DEPENDENCIES

*   PostgreSQL running on port 5432.
*   Windows Firewall configured to allow ports 5173 and 8000.
*   Modern web browsers (Chrome, Edge, Firefox) on client devices.

# 28. TESTING AND QUALITY ASSURANCE

**Tested:**
*   End-to-end SQLite to PostgreSQL data migration.
*   Concurrent multi-user session isolation.
*   UI Alignment across all detail modals (Ops, Dept, Gate).
*   Role-based route protection.

**<span class="tbc">Not Yet Verified:</span>**
*   Physical QR code scanner hardware integration (currently supports manual ID entry as fallback).

# 29. PRODUCTION READINESS

**Current Readiness: HIGH**
The system is functionally complete and successfully deployed on the LAN environment. There are no blocking software bugs.
**Operational Prerequisites:** Staff training and distribution of the LAN URL and initial credentials.

# 30. ACCEPTANCE CRITERIA

*   **AC-001:** Users can only log in with valid credentials and are routed to their role-specific dashboard.
*   **AC-002:** A department manager can only see requests targeting their specific department ID.
*   **AC-003:** The system correctly formats Sri Lankan NICs and displays validation errors for incorrect lengths.
*   **AC-004:** The Gate Control dashboard accurately toggles a pass status between `checked_in` and `checked_out`.

# 31. REQUIREMENTS TRACEABILITY MATRIX

`BO-001 (Centralize) → FR-003 (Public Request) → VisitorRequest Module → AC-003 (NIC Validation)`<br/>
`BO-004 (Audit) → FR-007 (Action Logging) → AuditLogs Module → AC-005 (Log generation on approval)`

# 32. FUTURE ENHANCEMENTS

**Future / Proposed:**
*   Email/SMS notifications to visitors upon pass approval.
*   Active Directory / LDAP integration for internal employee logins.
*   Automated ID/Passport OCR scanning at the gate.

# 33. BUSINESS BENEFITS

*   **Operational Efficiency:** Eliminates physical paper trails and inter-office phone calls for approvals.
*   **Security:** Cryptographically secure QR codes prevent forgery.
*   **Accountability:** Every approval and gate scan is permanently linked to a specific officer.
*   **Real-time Visibility:** Management instantly knows exact on-site visitor counts during emergencies.

# 34. IMPLEMENTATION ROADMAP

1.  **Phase 1:** PostgreSQL Migration & LAN Deployment Setup (Completed)
2.  **Phase 2:** Enterprise UI Redesign (Completed)
3.  **Phase 3:** Staff Training & Credentials Handoff
4.  **Phase 4:** Parallel Run (Digital + Manual)
5.  **Phase 5:** Full Production Launch

# 35. TRAINING REQUIREMENTS

*   **Gate Officers:** Require training on scanning passes and interpreting the "VIP LMV Routing" banners.
*   **Department Managers:** Require instruction on accessing their queue via browser and adding approval notes.

# 36. SUPPORT AND MAINTENANCE

Recommended daily backups of the `port_pass_db` PostgreSQL database using `pg_dump`. Server OS requires standard security patching.

# 37. GLOSSARY

*   **RBAC:** Role-Based Access Control.
*   **JWT:** JSON Web Token used for secure sessions.
*   **LMV:** Light Motor Vehicle (Gate routing parameter).
*   **QR:** Quick Response code containing hashed validation data.

# 38. APPENDICES

*   **Appendix A:** Database Schema (Refer to SQLAlchemy models)
*   **Appendix B:** Office LAN Setup Guide (Refer to `deploy_lan.bat`)
