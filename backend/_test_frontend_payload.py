#!/usr/bin/env python
"""Test the exact payload being sent from the frontend"""
import json
import urllib.request
from datetime import datetime

# Dates in ISO format
start_date = "2026-05-25T00:00:00Z"  # ISO format
end_date = "2026-05-27T00:00:00Z"    # ISO format

# This is what the frontend would send
payload = {
    "requester_name": "Sarah",
    "requester_email": "s@example.com",
    "requester_phone": "",  # Empty string from form
    "visitor_name": "David",
    "visitor_email": "",  # Empty string from form
    "visitor_organization": "",  # Empty string from form
    "visitor_purpose": "Test",
    "requested_zones": ["zone_3"],
    "requested_date": start_date,
    "requested_end_date": end_date,
    "expected_duration_minutes": 480
}

print("=" * 70)
print("TESTING FRONTEND EXACT PAYLOAD")
print("=" * 70)
print("\nPayload being tested:")
print(json.dumps(payload, indent=2))

url = "http://localhost:8000/api/visitor-requests/submit"
headers = {"Content-Type": "application/json"}
data = json.dumps(payload).encode()

try:
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        response_data = json.loads(resp.read().decode())
        print("\n✓ SUCCESS (HTTP 200)")
        print(f"Response: {json.dumps(response_data, indent=2)}")
except urllib.error.HTTPError as e:
    print(f"\n✗ ERROR (HTTP {e.code})")
    try:
        error_response = json.loads(e.read().decode())
        print(f"Error Response: {json.dumps(error_response, indent=2)}")
        
        # Extract detail array
        if "detail" in error_response and isinstance(error_response["detail"], list):
            print("\nValidation Errors:")
            for err in error_response["detail"]:
                if isinstance(err, dict):
                    print(f"  - Field: {err.get('loc', 'unknown')}")
                    print(f"    Message: {err.get('msg', 'unknown')}")
                    print(f"    Type: {err.get('type', 'unknown')}")
                else:
                    print(f"  - {err}")
    except Exception as parse_err:
        print(f"Could not parse error: {parse_err}")
        print(f"Raw response: {e.read().decode()}")
except Exception as e:
    print(f"\n✗ ERROR: {type(e).__name__}: {e}")
