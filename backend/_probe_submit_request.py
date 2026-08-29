import json
import urllib.request
import urllib.error
import datetime

url = 'http://127.0.0.1:8000/api/visitor-requests/submit'

# Choose entry time 2 hours in the future (local time)
entry = datetime.datetime.utcnow() + datetime.timedelta(hours=2)
exit = entry + datetime.timedelta(hours=2)

unique = int(datetime.datetime.utcnow().timestamp())

payload = {
    "requester_name": "Probe Tester",
    "requester_email": "probe@example.com",
    "visitor": {
        "name": "Probe Visitor Fixed",
        "email": "visitor@example.com",
        "phone": "+15551234567",
        "nic_passport": None,
        "organization": "Probe Org",
        "photo_url": None
    },
    "visit": {
        "purpose": "Testing submission",
        "entry_time": entry.replace(microsecond=0).isoformat() + 'Z',
        "exit_time": exit.replace(microsecond=0).isoformat() + 'Z',
        "duration_minutes": 120
    },
    "access": {
        "requested_zones": ["office"],
        "vehicle_number": None,
        "carrying_equipment": False,
        "equipment_description": None
    },
    "additional_notes": "Probe",
    "supporting_docs_urls": []
}

data = json.dumps(payload).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method='POST')

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print('STATUS', resp.status)
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print('STATUS', e.code)
    try:
        body = e.read().decode()
        print('BODY', body)
    except Exception:
        pass
except Exception as e:
    print(type(e).__name__, e)
