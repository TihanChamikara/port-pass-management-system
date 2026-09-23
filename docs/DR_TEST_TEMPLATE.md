# Disaster Recovery Test Report

## Test Information

| Field | Value |
|-------|-------|
| **Test Date** | YYYY-MM-DD |
| **Conducted By** | |
| **Test Type** | Failover / Restore / Full DR |
| **Environment** | Production / Staging |

---

## Test Scenario

_Describe the failure scenario being simulated._

---

## Timeline

| Event | Time | Duration |
|-------|------|----------|
| Simulated failure initiated | | |
| Failure detected | | |
| Failover/restore initiated | | |
| Services restored | | |
| Full verification complete | | |
| **Total downtime** | | |

---

## Failover Steps Completed

| # | Step | Status | Notes |
|---|------|--------|-------|
| 1 | Detect primary server failure | ☐ Pass / ☐ Fail | |
| 2 | Confirm failure is genuine | ☐ Pass / ☐ Fail | |
| 3 | Prevent split-brain | ☐ Pass / ☐ Fail | |
| 4 | Stop/disable failed primary | ☐ Pass / ☐ Fail | |
| 5 | Confirm replication state | ☐ Pass / ☐ Fail | |
| 6 | Promote standby to primary | ☐ Pass / ☐ Fail | |
| 7 | Activate application services | ☐ Pass / ☐ Fail | |
| 8 | Redirect hostname | ☐ Pass / ☐ Fail | |
| 9 | Test authentication | ☐ Pass / ☐ Fail | |
| 10 | Test visitor requests | ☐ Pass / ☐ Fail | |
| 11 | Test approval operations | ☐ Pass / ☐ Fail | |
| 12 | Test pass issuing | ☐ Pass / ☐ Fail | |
| 13 | Test QR verification | ☐ Pass / ☐ Fail | |
| 14 | Test gate check-in | ☐ Pass / ☐ Fail | |
| 15 | Test gate check-out | ☐ Pass / ☐ Fail | |
| 16 | Test reporting | ☐ Pass / ☐ Fail | |
| 17 | Verify audit logging | ☐ Pass / ☐ Fail | |
| 18 | Announce system recovery | ☐ Pass / ☐ Fail | |

---

## Data Recovery Assessment

| Metric | Value |
|--------|-------|
| **Recovery Point Objective (RPO)** | |
| **Recovery Time Objective (RTO)** | |
| **Actual Recovery Point** | |
| **Actual Recovery Time** | |
| **Data Loss** | None / Partial / Description |

---

## Problems Encountered

| # | Problem | Severity | Resolution |
|---|---------|----------|------------|
| 1 | | High/Med/Low | |

---

## Corrective Actions

| # | Action | Owner | Deadline | Status |
|---|--------|-------|----------|--------|
| 1 | | | | |

---

## Overall Result

| Result | |
|--------|-|
| **DR Test Outcome** | ☐ PASS / ☐ FAIL |
| **Approved By** | |
| **Date** | |

> **Note:** Do not mark as PASS until the complete procedure has been successfully tested
> and all critical problems have been resolved.
