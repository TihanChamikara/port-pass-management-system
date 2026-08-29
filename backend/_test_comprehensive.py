#!/usr/bin/env python
"""
Comprehensive test to understand backend validation failure
"""
import json
import urllib.request
import urllib.error
from datetime import datetime

test_cases = [
    {
        "name": "Minimal valid payload - dates from calendar selection",
        "payload": {
            "requester_name": "Test User",
            "requester_email": "test@example.com",
            "visitor_name": "Visitor",
            "visitor_purpose": "Test visit",
            "requested_zones": ["zone_3"],
            "requested_date": "2026-05-20T00:00:00.000Z",
            "requested_end_date": "2026-05-22T00:00:00.000Z",
            "expected_duration_minutes": 480
        }
    },
    {
        "name": "With all optional fields as None (not empty strings)",
        "payload": {
            "requester_name": "Test User",
            "requester_email": "test@example.com",
            "requester_phone": None,
            "visitor_name": "Visitor",
            "visitor_email": None,
            "visitor_organization": None,
            "visitor_purpose": "Test visit",
            "requested_zones": ["zone_3"],
            "requested_date": "2026-05-20T00:00:00.000Z",
            "requested_end_date": "2026-05-22T00:00:00.000Z",
            "expected_duration_minutes": 480
        }
    },
    {
        "name": "Omitting optional fields entirely",
        "payload": {
            "requester_name": "Test User",
            "requester_email": "test@example.com",
            "visitor_name": "Visitor",
            "visitor_purpose": "Test visit",
            "requested_zones": ["zone_3"],
            "requested_date": "2026-05-20T00:00:00.000Z",
            "requested_end_date": "2026-05-22T00:00:00.000Z",
            "expected_duration_minutes": 480
        }
    },
]

url = "http://localhost:8000/api/visitor-requests/submit"
headers = {"Content-Type": "application/json"}

print("\n" + "=" * 80)
print("COMPREHENSIVE BACKEND VALIDATION TEST")
print("=" * 80)

for i, test in enumerate(test_cases, 1):
    print(f"\n[Test {i}] {test['name']}")
    print("-" * 80)
    
    payload = test['payload']
    data = json.dumps(payload).encode()
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            response_data = json.loads(resp.read().decode())
            print(f"✓ SUCCESS (HTTP 200)")
            print(f"  Request ID: {response_data.get('request_id')}")
            print(f"  Status: {response_data.get('status')}")
    except urllib.error.HTTPError as e:
        print(f"✗ FAILED (HTTP {e.code})")
        try:
            error_body = e.read().decode()
            error_response = json.loads(error_body)
            
            # Extract validation errors
            if "detail" in error_response:
                if isinstance(error_response["detail"], list):
                    print(f"  Validation Errors ({len(error_response['detail'])} field(s)):")
                    for err in error_response["detail"]:
                        if isinstance(err, dict):
                            loc = '.'.join(str(x) for x in err.get('loc', []))
                            msg = err.get('msg', 'unknown')
                            typ = err.get('type', 'error')
                            print(f"    - {loc}: {msg} (type: {typ})")
                else:
                    print(f"  Error: {error_response['detail']}")
        except Exception as parse_err:
            print(f"  Error parsing response: {parse_err}")
            print(f"  Raw error: {error_body}")
    except Exception as e:
        print(f"✗ ERROR: {type(e).__name__}: {e}")

print("\n" + "=" * 80)
print("END OF TEST")
print("=" * 80 + "\n")
