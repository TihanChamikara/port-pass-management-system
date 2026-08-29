import json
import urllib.request
import urllib.error

url = "http://127.0.0.1:8000/api/users"
data = json.dumps({
    "username": "test_user_123",
    "full_name": "Test User",
    "password": "Password123!",
    "role": "staff",
}).encode()
headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc3Nzg3MDYwNH0.7-zifllvFmd0DcNN8A0R2GCsmmwITiC5iX2K5DbuRfI",
    "Content-Type": "application/json",
}
req = urllib.request.Request(url, data=data, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print("STATUS", resp.status)
        print("BODY", resp.read().decode())
except urllib.error.HTTPError as e:
    print("HTTPError", e.code)
    try:
        print(e.read().decode())
    except Exception:
        pass
except Exception as e:
    print(type(e).__name__)
    print(e)
