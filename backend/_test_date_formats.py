#!/usr/bin/env python
"""Test to verify that the frontend fix will work with the backend API"""
import json
import urllib.request
from datetime import datetime

test_cases = [
    {
        "name": "ISO string dates (what Dayjs.$d.toISOString() produces)",
        "payload": {
            "requester_name": "Test",
            "requester_email": "test@example.com",
            "requester_phone": "",
            "visitor_name": "Visitor",
            "visitor_email": "",
            "visitor_organization": "",
            "visitor_purpose": "Test",
            "requested_zones": ["zone_3"],
            "requested_date": "2026-05-20T00:00:00.000Z",  # ISO format
            "requested_end_date": "2026-05-22T00:00:00.000Z",  # ISO format
            "expected_duration_minutes": 480
        }
    },
    {
        "name": "Date-only strings",
        "payload": {
            "requester_name": "Test",
            "requester_email": "test@example.com",
            "requester_phone": "",
            "visitor_name": "Visitor",
            "visitor_email": "",
            "visitor_organization": "",
            "visitor_purpose": "Test",
            "requested_zones": ["zone_3"],
            "requested_date": "2026-05-20",  # Date-only
            "requested_end_date": "2026-05-22",  # Date-only
            "expected_duration_minutes": 480
        }
    },
    {
        "name": "ISO string with +00:00 offset",
        "payload": {
            "requester_name": "Test",
            "requester_email": "test@example.com",
            "requester_phone": "",
            "visitor_name": "Visitor",
            "visitor_email": "",
            "visitor_organization": "",
            "visitor_purpose": "Test",
            "requested_zones": ["zone_3"],
            "requested_date": "2026-05-20T00:00:00+00:00",  # ISO with +00:00
            "requested_end_date": "2026-05-22T00:00:00+00:00",  # ISO with +00:00
            "expected_duration_minutes": 480
        }
    }
]

url = "http://localhost:8000/api/visitor-requests/submit"
headers = {"Content-Type": "application/json"}

print("=" * 70)
print("TESTING VARIOUS DATE FORMATS AGAINST BACKEND API")
print("=" * 70)

for i, test in enumerate(test_cases, 1):
    print(f"\nTest {i}: {test['name']}")
    print("-" * 70)
    
    payload = test['payload']
    print(f"Date values: {payload['requested_date']} to {payload['requested_end_date']}")
    
    data = json.dumps(payload).encode()
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            response_data = json.loads(resp.read().decode())
            print(f"✓ SUCCESS (HTTP 200)")
            print(f"  Request ID: {response_data.get('request_id')}")
    except urllib.error.HTTPError as e:
        print(f"✗ FAILED (HTTP {e.code})")
        try:
            error_response = json.loads(e.read().decode())
            if "detail" in error_response and isinstance(error_response["detail"], list):
                for err in error_response["detail"]:
                    if isinstance(err, dict):
                        print(f"  - {err.get('loc', 'unknown')}: {err.get('msg', 'unknown')}")
        except:
            pass
    except Exception as e:
        print(f"✗ ERROR: {e}")

print("\n" + "=" * 70)
print("Test completed")
