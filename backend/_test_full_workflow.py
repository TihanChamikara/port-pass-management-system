#!/usr/bin/env python
"""Create new visitor request, then approve it"""

import json
import urllib.request
from datetime import datetime, timezone, timedelta

print("="*60)
print("FULL WORKFLOW: SUBMIT → APPROVE → VERIFY")
print("="*60)

# Step 1: Submit new visitor request (public, no auth)
print("\n[1] Submitting new visitor request...")
today_future = datetime.now(timezone.utc) + timedelta(days=7)
tomorrow_future = today_future + timedelta(days=1)

submit_payload = {
    'requester_name': 'Complete Test Requester',
    'requester_email': 'complete-test@example.com',
    'requester_phone': '+9876543210',
    'visitor': {
        'name': 'Complete Test Visitor',
        'email': None, 'phone': None, 'nic_passport': None,
        'organization': None, 'photo_url': None,
    },
    'visit': {
        'purpose': 'Full workflow test',
        'building_department': None, 'host_employee_id': None,
        'host_employee_name': None,
        'entry_time': today_future.isoformat(),
        'exit_time': tomorrow_future.isoformat(),
        'duration_minutes': 1440,
    },
    'access': {
        'requested_zones': ['zone_1', 'zone_2'],
        'vehicle_number': None, 'carrying_equipment': False,
        'equipment_description': None,
    },
}

submit_url = 'http://localhost:8000/api/visitor-requests/submit'
submit_data = json.dumps(submit_payload).encode()
submit_req = urllib.request.Request(submit_url, data=submit_data, headers={'Content-Type': 'application/json'}, method='POST')

with urllib.request.urlopen(submit_req, timeout=10) as resp:
    submit_result = json.loads(resp.read().decode())
    request_id = submit_result.get('id')
    request_token = submit_result.get('request_id')
    print(f"✓ Request submitted: {request_token}")
    print(f"  ID: {request_id}")

# Step 2: Login as ops officer and approve
print("\n[2] Logging in as operations officer...")
login_payload = {'username': 'ops_officer', 'password': 'OpOfficer@123'}
login_url = 'http://localhost:8000/api/auth/login'
login_data = json.dumps(login_payload).encode()
login_req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'}, method='POST')

with urllib.request.urlopen(login_req, timeout=10) as resp:
    login_result = json.loads(resp.read().decode())
    token = login_result.get('access_token')
    print("✓ Ops Officer logged in")

# Step 3: Verify request is in pending list
print("\n[3] Verifying request in pending list...")
pending_url = 'http://localhost:8000/api/visitor-requests/pending?page=1&page_size=20'
pending_req = urllib.request.Request(pending_url, headers={'Authorization': 'Bearer ' + token}, method='GET')

with urllib.request.urlopen(pending_req, timeout=10) as resp:
    pending_result = json.loads(resp.read().decode())
    found = False
    for item in pending_result.get('items', []):
        if item.get('id') == request_id:
            print(f"✓ Found in pending list (status: {item.get('status')})")
            found = True
            break
    if not found:
        print("✗ Request not found in pending list")
        exit(1)

# Step 4: Approve the request
print("\n[4] Approving the request...")
approve_url = f'http://localhost:8000/api/visitor-requests/{request_id}/approve'
approve_payload = {'comments': 'Complete workflow test approval', 'zones_override': None}
approve_data = json.dumps(approve_payload).encode()
approve_req = urllib.request.Request(
    approve_url,
    data=approve_data,
    headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(approve_req, timeout=10) as resp:
        approve_result = json.loads(resp.read().decode())
        print(f"✓ Approval successful: {approve_result.get('message')}")
except urllib.error.HTTPError as e:
    print(f"✗ Approval failed with status {e.code}")
    try:
        print(json.dumps(json.loads(e.read().decode()), indent=2))
    except:
        pass
    exit(1)

# Step 5: Verify request removed from pending list
print("\n[5] Verifying request removed from pending...")
with urllib.request.urlopen(pending_req, timeout=10) as resp:
    pending_after = json.loads(resp.read().decode())
    still_pending = False
    for item in pending_after.get('items', []):
        if item.get('id') == request_id:
            still_pending = True
            break
    
    if still_pending:
        print("✗ Request still in pending list")
    else:
        print("✓ Request removed from pending list")
        print(f"  Remaining pending: {pending_after.get('total')} requests")

print("\n" + "="*60)
print("✓ FULL WORKFLOW TEST SUCCESSFUL")
print("="*60)
