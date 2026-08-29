# Port Visitor Pass System Flowcharts

## 1. Document Purpose
This document provides professional software engineering process flowcharts for the Port Visitor Pass Management System. These diagrams are based strictly on the verified requirements from the Business Analysis & System Requirements Specification.

## 2. Flowchart Notation Legend
- **Oval (Terminator)**: Start / End
- **Rectangle (Process)**: Business process or action
- **Diamond (Decision)**: Decision points branching into Yes/No
- **Parallelogram (Input/Output)**: Data entry or output
- **Cylinder (Database)**: Data storage or state persistence
- **Document**: Generated passes or reports

---

## 3. High-Level System Business Process

**Figure 1 — High-Level Visitor Pass Management Process**
"Illustrates the end-to-end business process from request submission to visitor check-out and auditing."

![Figure 1](diagrams/01_high_level_process.png)

---

## 4. Visitor Request Workflow

**Figure 2 — Visitor Request Submission Workflow**
"Illustrates the process through which a requester submits visitor information, undergoes system validation, and enters the applicable approval workflow."

![Figure 2](diagrams/02_visitor_request.png)

---

## 5. Department Approval Workflow

**Figure 3 — Department Manager Approval Workflow**
"Shows the workflow for Department Managers reviewing pending requests and making initial approval decisions."

![Figure 3](diagrams/03_department_approval.png)

---

## 6. Operations / Security Approval Workflow

**Figure 4 — Operations/Security Review Workflow**
"Depicts the final review stage where Operations Officers verify identity profiles and assign routing classifications."

![Figure 4](diagrams/04_operations_review.png)

---

## 7. Pass Issuing Workflow

**Figure 5 — Visitor Pass Issuing Workflow**
"Illustrates the Pass Officer generating secure hashed QR codes for approved requests."

![Figure 5](diagrams/05_pass_issuing.png)

---

## 8. Gate Check-In Workflow

**Figure 6 — Gate Check-In Workflow**
"Shows the Gate Officer scanning passes and validating statuses to permit entry and prevent double check-ins."

![Figure 6](diagrams/06_gate_checkin.png)

---

## 9. Gate Check-Out Workflow

**Figure 7 — Visitor Check-Out Workflow**
"Depicts the process of scanning an active checked-in visitor out of the port facility."

![Figure 7](diagrams/07_gate_checkout.png)

---

## 10. Complete Pass Lifecycle

**Figure 8 — Visitor Pass Lifecycle**
"A state diagram representing the valid status transitions of a visitor request and pass."

![Figure 8](diagrams/08_pass_lifecycle.png)

---

## 11. Group Pass Workflow

**Figure 9 — Group Pass Management Workflow**
"High-level representation of group pass handling, as verified in Pass Officer permissions."

![Figure 9](diagrams/09_group_pass.png)

---

## 12. Report Generation Workflow

**Figure 10 — Reporting Workflow**
"Shows the process of accessing the operational dashboard and querying tabular historical reports."

![Figure 10](diagrams/10_reporting.png)

---

## 13. Audit Trail Workflow

**Figure 11 — Audit Trail / Activity Logging Workflow**
"Illustrates the asynchronous event logging process capturing state changes and transactions."

![Figure 11](diagrams/11_audit.png)

---

## 14. Authentication and Authorization Flow

**Figure 12 — Authentication & RBAC Workflow**
"Depicts JWT-based stateless authentication and subsequent Role-Based Access Control validation."

![Figure 12](diagrams/12_authentication.png)

---

## 15. System Architecture

**Figure 13 — System Architecture**
"High-level technical architecture spanning the React frontend, FastAPI backend, and PostgreSQL database."

![Figure 13](diagrams/13_architecture.png)

---

## 16. Office LAN Deployment

**Figure 14 — Office LAN Deployment Architecture**
"Shows the centralized server deployment accessed by multiple officer clients over the Office LAN."

![Figure 14](diagrams/14_lan_deployment.png)

---

## 17. End-to-End Role Interaction

**Figure 15 — Role-Based End-to-End Process**
"A swimlane diagram clarifying role responsibilities across the entire request lifecycle."

![Figure 15](diagrams/15_role_swimlane.png)

---

## 18. Request State Transition

**Figure 16 — Visitor Request State Transition Diagram**
"A detailed UML state machine detailing state paths from pending_department_approval to checked_out."

![Figure 16](diagrams/16_request_state.png)

---

## 19. Traceability Matrix

| Diagram | Process | Related Requirements |
|---|---|---|
| Figure 1 | High-Level Visitor Pass Management Process | BO-001, BO-002, BO-003 |
| Figure 2 | Visitor Request Submission Workflow | FR-003, AC-003 |
| Figure 3 | Department Manager Approval Workflow | FR-004, AC-002 |
| Figure 4 | Operations/Security Review Workflow | FR-006, BR-001, BR-004 |
| Figure 5 | Visitor Pass Issuing Workflow | BR-001, BR-004 |
| Figure 6 | Gate Check-In Workflow | FR-005, BR-002, AC-004 |
| Figure 7 | Visitor Check-Out Workflow | FR-005, BR-002, AC-004 |
| Figure 8 | Visitor Pass Lifecycle | FR-004 |
| Figure 9 | Group Pass Management Workflow | *Pass Officer Roles* |
| Figure 10 | Reporting Workflow | BO-005, FR-007 |
| Figure 11 | Audit Trail / Activity Logging Workflow | BO-004 |
| Figure 12 | Authentication & RBAC Workflow | FR-001, NFR-001 |
| Figure 13 | System Architecture | Section 18 |
| Figure 14 | Office LAN Deployment Architecture | Section 19 |
| Figure 15 | Role-Based End-to-End Process | Section 6, 15 |
| Figure 16 | Visitor Request State Transition Diagram | FR-004 |

