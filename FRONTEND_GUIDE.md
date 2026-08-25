"""
Frontend Implementation Guide - Step by Step
"""

# PART 1: FOLDER STRUCTURE TO CREATE

## src/components/PassForm/
- SinglePassForm.jsx
- GroupPassForm.jsx  
- VisitorTable.jsx (Dynamic editable table)
- PassFormDialog.jsx (Modal wrapper)

## src/components/Alerts/
- AlertBanner.jsx (Top-level alert display)
- OverdueList.jsx (Overdue passes widget)

## src/components/Reports/
- DailyReport.jsx
- ZoneWiseReport.jsx
- ExportButtons.jsx

## src/pages/
- PassIssuingPage.jsx (NEW - main form page)
- GroupPassPage.jsx (NEW - group management)
- ReportsPage.jsx (NEW - reporting dashboard)
- AuditLogsPage.jsx (NEW - audit trail)

## src/features/
- pass/ (enhanced)
- group/ (NEW folder)
  - groupStore.js
  - groupApi.js
- alerts/ (NEW folder)
  - alertStore.js
  - alertApi.js
- reports/ (NEW folder)
  - reportStore.js
  - reportApi.js

# PART 2: IMPLEMENTATION STRATEGY

1. Create Zustand stores for state management
2. Create API client functions
3. Create form components
4. Create table components
5. Create dashboard/alert components
6. Connect everything in pages

# PART 3: KEY FEATURES

## Single Pass Form
- Auto-generated pass number
- Real-time NIC/phone validation
- Auto-fill company on selection
- One-click submit
- Auto-save option

## Group Pass Form (2-Step)
### Step 1: Group Info
- Requested by
- Company
- Zone
- Number of visitors

### Step 2: Add Visitors
- Dynamic table with Add/Remove rows
- Bulk paste from Excel
- Keyboard navigation (Tab to next row, Enter to submit)
- Auto-validation on each row

## Dashboard
- Active passes count (Yellow)
- Completed passes count (Green)
- Overdue passes count (Red)
- Active groups count
- Zone distribution chart
- Today's pass count

## Alerts
- Real-time overdue detection (runs every 5 min)
- Red banner for overdue passes
- Click to view overdue list
- Auto-mark resolved on checkout

# PART 4: API INTEGRATION FLOW

Frontend → Zustand Store → API Client → Backend Routes → Services → Database

Example Flow for Group Pass:
1. User fills form (Step 1) → Store dispatch
2. POST /api/pass-groups → Create group
3. User adds visitors (Step 2) → Table update
4. POST /api/pass-groups/{id}/visitors → Create all passes
5. GET /api/pass-groups/{id} → Fetch group with passes
6. Display success with pass numbers

# PART 5: KEYBOARD SHORTCUTS & UX

Single Pass:
- Tab: Move between fields
- Enter: Submit form (if valid)
- Escape: Close modal

Group Pass (Table):
- Tab: Next cell
- Shift+Tab: Previous cell
- Enter: Next row or submit
- Delete: Remove row
- Ctrl+V: Paste from Excel (smart parsing)

