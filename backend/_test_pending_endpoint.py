"""Test the pending requests endpoint."""
import json
import urllib.request

# Login
login_data = json.dumps({'username': 'ops_officer', 'password': 'OpOfficer@123'}).encode()
login_req = urllib.request.Request('http://localhost:8000/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'}, method='POST')
login_resp = urllib.request.urlopen(login_req)
token = json.loads(login_resp.read().decode()).get('access_token')
print(f"✓ Logged in, token: {token[:30]}...")

# Get pending requests
req = urllib.request.Request('http://localhost:8000/api/visitor-requests/pending', headers={'Authorization': f'Bearer {token}'})
resp = urllib.request.urlopen(req)
pending = json.loads(resp.read().decode())

print(f"✓ Success!")
print(f"  Found {pending.get('total')} pending requests")
print(f"  Page: {pending.get('page')}, Size: {pending.get('page_size')}")
print(f"  Items returned: {len(pending.get('items', []))}")

if pending.get('items'):
    print(f"  First request: {pending['items'][0].get('request_id')}")
