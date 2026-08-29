#!/usr/bin/env python
"""
Test visitor request submission with the OLD, "flat" payload structure.
This simulates the data that the frontend is likely sending, which will
cause a validation error with the modern backend API.

This script is expected to FAIL with a 422 Unprocessable Entity error.
"""

import json
import urllib.request
from datetime import datetime, timezone, timedelta

print("="*60)
print("TESTING OLD (INCORRECT) BROWSER PAYLOAD")
print("="*60)

entry_time = datetime.now(timezone.utc) + timedelta(days=3)
exit_time = entry_time + timedelta(hours=8)

# This is the old, "flat" payload structure that the frontend is likely sending.
# The backend now expects a nested structure, so this will fail.
payload = {
    'requester_name': 'Old Payload Requester',
    'requester_email': 'old-payload@example.com',
    'visitor_name': 'Old Payload Visitor',
    'visitor_purpose': 'Testing the old, flat payload structure',
    'requested_zones': ['zone_1'],
    'requested_date': entry_time.isoformat(),
    'requested_end_date': exit_time.isoformat(),
}

print("\nSending Incorrect Payload:")
print(json.dumps(payload, indent=2))

submit_url = 'http://localhost:8000/api/visitor-requests/submit'
submit_data = json.dumps(payload).encode('utf-8')
submit_req = urllib.request.Request(submit_url, data=submit_data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(submit_req, timeout=10) as resp:
        print(f"\n✓ UNEXPECTED SUCCESS (HTTP {resp.status})")
except urllib.error.HTTPError as e:
    print(f"\n✓ EXPECTED FAILURE (HTTP {e.code})")
    print(f"  This confirms the backend is rejecting the old data format.")
    print(f"  Error Response: {e.read().decode()}")