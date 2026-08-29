#!/usr/bin/env python
"""Test visitor request submission directly against the API"""
import json
import urllib.request
from datetime import datetime, timedelta

# Get dates
today = datetime.now()
start_date = today.replace(day=25, hour=0, minute=0, second=0, microsecond=0)
end_date = today.replace(day=27, hour=23, minute=59, second=59, microsecond=0)

# Prepare payload
payload = {
    "requester_name": "Sarah Johnson",
    "requester_email": "sarah@example.com",
    "requester_phone": "",  # Empty string to test the validator
    "visitor_name": "David Wilson",
    "visitor_email": "",  # Empty string to test the validator
    "visitor_organization": "",  # Empty string to test the validator
    "visitor_purpose": "Equipment inspection and maintenance",
    "requested_zones": ["zone_3"],
    "requested_date": start_date.isoformat(),
    "requested_end_date": end_date.isoformat(),
    "expected_duration_minutes": 480
}

print("=" * 60)
print("VISITOR REQUEST SUBMISSION TEST")
print("=" * 60)
print("\nPayload:")
print(json.dumps(payload, indent=2, default=str))

# Make request
url = "http://localhost:8000/api/visitor-requests/submit"
headers = {
    "Content-Type": "application/json"
}
data = json.dumps(payload).encode()

try:
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        response_data = json.loads(resp.read().decode())
        print("\n✓ SUCCESS (HTTP 200)")
        print(f"Response: {json.dumps(response_data, indent=2)}")
        print(f"\nRequest ID: {response_data.get('request_id')}")
except urllib.error.HTTPError as e:
    print(f"\n✗ ERROR (HTTP {e.code})")
    try:
        error_data = json.loads(e.read().decode())
        print(f"Error Response: {json.dumps(error_data, indent=2)}")
    except:
        print(f"Error Body: {e.read().decode()}")
except Exception as e:
    print(f"\n✗ ERROR: {type(e).__name__}: {e}")
