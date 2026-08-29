#!/usr/bin/env python
"""Test visitor request submission and debug any errors."""

import json
import requests
from datetime import datetime, timedelta

# Prepare the payload
today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
tomorrow = today + timedelta(days=1)

payload = {
    "requester_name": "Test User",
    "requester_email": "test@example.com",
    "requester_phone": None,
    "visitor_name": "John Visitor",
    "visitor_email": None,
    "visitor_purpose": "Business meeting",
    "visitor_organization": None,
    "requested_zones": ["zone_1"],
    "requested_date": today.isoformat(),
    "requested_end_date": tomorrow.isoformat(),
    "expected_duration_minutes": 480,
}

print("=" * 80)
print("SENDING PAYLOAD TO: http://localhost:8000/api/visitor-requests/submit")
print("=" * 80)
print(json.dumps(payload, indent=2, default=str))
print("=" * 80)

try:
    response = requests.post(
        "http://localhost:8000/api/visitor-requests/submit",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    print(f"\nRESPONSE STATUS: {response.status_code}")
    print(f"RESPONSE HEADERS: {dict(response.headers)}")
    print(f"RESPONSE BODY:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
