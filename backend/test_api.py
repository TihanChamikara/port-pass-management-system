import urllib.request
import json
import urllib.error
import urllib.parse

def get_token():
    req = urllib.request.Request("http://127.0.0.1:5173/api/auth/login", method="POST")
    req.add_header("Content-Type", "application/json")
    data = json.dumps({"username": "admin", "password": "Admin@123"}).encode("utf-8")
    try:
        resp = urllib.request.urlopen(req, data=data)
        return json.loads(resp.read().decode("utf-8"))["access_token"]
    except urllib.error.HTTPError as e:
        print("Login failed:", e.read().decode("utf-8"))
        return None

def check_pending(token):
    req = urllib.request.Request("http://127.0.0.1:5173/api/visitor-requests/for-pass-generation")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode("utf-8"))
        print("Pending requests:", json.dumps(data, indent=2))
    except urllib.error.HTTPError as e:
        print("Failed to fetch:", e.read().decode("utf-8"))

token = get_token()
check_pending(token)
