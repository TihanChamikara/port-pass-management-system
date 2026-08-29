import json
import urllib.request
from datetime import datetime, timedelta

# Simulate what the browser sends
today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
tomorrow = today + timedelta(days=1)

# This is what the frontend sends (based on the PublicVisitorRequestPage.jsx code)
payload = {
    "requester_name": "Alice Cooper",
    "requester_email": "alice@example.com",
    "requester_phone": None,  # Optional field not filled
    "visitor_name": "Bob Smith",
    "visitor_email": None,  # Optional field not filled
    "visitor_purpose": "Testing the form",
    "visitor_organization": None,  # Optional field not filled
    "requested_zones": ["zone_1"],  # Selected Zone 1
    "requested_date": today.isoformat() + ".000Z",  # Correct ISO format
    "requested_end_date": tomorrow.isoformat() + ".000Z",
    "expected_duration_minutes": 480,
}

print("Testing with exact browser-like payload")
print("Payload:")
print(json.dumps(payload, indent=2))

url = "http://localhost:8000/api/visitor-requests/submit"
data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        print("\nSUCCESS!")
        print("Status:", response.status)
        body = response.read().decode()
        result = json.loads(body)
        print("Request ID:", result.get('request_id'))
except urllib.error.HTTPError as e:
    print("\nERROR!")
    print("Status:", e.code)
    try:
        err_body = json.loads(e.read().decode())
        print("Error details:")
        print(json.dumps(err_body, indent=2))
    except:
        print("Error body:", e.read().decode())
except Exception as e:
    print("\nEXCEPTION!")
    print(f"{type(e).__name__}: {e}")
