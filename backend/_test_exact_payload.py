#!/usr/bin/env python
"""Test the exact data from the latest form submission attempt"""
import json
import urllib.request

# This is the exact data from the last form test attempt
payloads = [
    {
        "description": "With all optional fields as empty strings",
        "payload": {
            "requester_name": "Test User",
            "requester_email": "test@example.com",
            "requester_phone": "",
            "visitor_name": "Visitor",
            "visitor_email": "",
            "visitor_organization": "",
            "visitor_purpose": "Test visit",
            "requested_zones": ["zone_3"],
            "requested_date": "2026-05-20T00:00:00.000Z",
            "requested_end_date": "2026-05-22T00:00:00.000Z",
            "expected_duration_minutes": 480
        }
    },
    {
        "description": "With optional fields as None instead of empty strings",
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
]

url = "http://localhost:8000/api/visitor-requests/submit"
headers = {"Content-Type": "application/json"}

print("=" * 70)
print("TESTING EXACT FORM PAYLOADS")
print("=" * 70)

for test in payloads:
    print(f"\n{test['description']}")
    print("-" * 70)
    
    payload = test['payload']
    print(json.dumps(payload, indent=2))
    
    data = json.dumps(payload).encode()
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            response_data = json.loads(resp.read().decode())
            print(f"\n✓ SUCCESS (HTTP 200)")
            print(f"  Request ID: {response_data.get('request_id')}")
    except urllib.error.HTTPError as e:
        print(f"\n✗ FAILED (HTTP {e.code})")
        try:
            error_response = json.loads(e.read().decode())
            print(f"Error Response: {json.dumps(error_response, indent=2)}")
        except:
            print(f"Raw error: {e.read().decode()}")
    except Exception as e:
        print(f"\n✗ ERROR: {type(e).__name__}: {e}")

print("\n" + "=" * 70)
