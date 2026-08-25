# API Endpoints

## Auth
- POST /api/auth/login
  - body: { username, password }
  - returns: { access_token, token_type }
- GET /api/auth/me
  - auth: Bearer token
  - returns: current user profile

## Dashboard
- GET /api/dashboard/summary
  - auth: Bearer token
  - returns: today_total, active_total, completed_total, zone_stats[]

## Passes
- POST /api/passes
  - auth: admin/staff
  - body: { pass_no, visitor_name, company_name, nic_number, contact_number, zone }
  - returns: created pass

- GET /api/passes
  - auth: Bearer token
  - query:
    - page, page_size
    - search (name/NIC/pass)
    - zone
    - target_date (YYYY-MM-DD)
    - status (active/completed)
    - sort (asc/desc)
  - returns: paginated pass list

- PATCH /api/passes/{pass_id}/checkout
  - auth: admin/staff
  - body: { received_time? }
  - returns: updated pass with completed status

- GET /api/passes/export/csv
  - auth: Bearer token
  - returns: CSV file download
