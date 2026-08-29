"""Test VIP and LMV access endpoints."""
import json
import sys
import urllib.request

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')

def get_token(username, password):
    login_data = json.dumps({'username': username, 'password': password}).encode()
    login_req = urllib.request.Request('http://localhost:8000/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'}, method='POST')
    login_resp = urllib.request.urlopen(login_req)
    return json.loads(login_resp.read().decode()).get('access_token')

try:
    ops_token = get_token('ops_officer', 'OpOfficer@123')
    gate_token = get_token('gate_officer', 'GateOfficer@123')
    print("OK: Logged in as ops_officer and gate_officer")

    # Get pending requests
    req = urllib.request.Request('http://localhost:8000/api/visitor-requests/pending', headers={'Authorization': f'Bearer {ops_token}'})
    resp = urllib.request.urlopen(req)
    pending = json.loads(resp.read().decode())
    
    if not pending.get('items'):
        print("ERROR: No pending requests found to test with.")
        sys.exit(1)
        
    target_request = pending['items'][0]
    req_id = target_request['id']
    print(f"OK: Testing with Request DB ID: {req_id}, Public ID: {target_request['request_id']}")

    # 1. Update to VIP with LMV2
    patch_req = urllib.request.Request(
        f'http://localhost:8000/api/visitor-requests/{req_id}/visitor-type?visitor_type=vip&vip_lmv_access=lmv2',
        headers={'Authorization': f'Bearer {ops_token}'},
        method='PATCH'
    )
    patch_resp = urllib.request.urlopen(patch_req)
    print("OK: Classification patched successfully")

    # 2. Get full details as gate_officer to verify serialization and role authorization
    full_req = urllib.request.Request(
        f'http://localhost:8000/api/visitor-requests/{req_id}/full',
        headers={'Authorization': f'Bearer {gate_token}'}
    )
    full_resp = urllib.request.urlopen(full_req)
    details = json.loads(full_resp.read().decode())
    
    print(f"OK: Fetched details as gate_officer. visitor_type={details.get('visitor_type')}, vip_lmv_access={details.get('vip_lmv_access')}")
    
    if details.get('visitor_type') != 'vip' or details.get('vip_lmv_access') != 'lmv2':
        print(f"ERROR: Expected visitor_type='vip' and vip_lmv_access='lmv2', got {details.get('visitor_type')} and {details.get('vip_lmv_access')}")
        sys.exit(1)
    
    # 2b. Verify it shows up in gate_officer dashboard
    dash_req = urllib.request.Request(
        'http://localhost:8000/api/dashboard/summary',
        headers={'Authorization': f'Bearer {gate_token}'}
    )
    dash_resp = urllib.request.urlopen(dash_req)
    dash_data = json.loads(dash_resp.read().decode())
    
    vip_arrivals = dash_data.get('vip_arrivals', [])
    print(f"OK: Fetched gate officer dashboard. Found {len(vip_arrivals)} VIP arrivals.")
    
    found_in_dash = False
    for item in vip_arrivals:
        if item.get('id') == req_id:
            found_in_dash = True
            print(f"OK: Verified test request {req_id} is present in gate_officer dashboard vip_arrivals!")
            break
            
    if not found_in_dash:
        print(f"ERROR: Test request {req_id} not found in gate_officer dashboard vip_arrivals: {vip_arrivals}")
        sys.exit(1)

    print("SUCCESS: VIP and LMV routing successfully saved, serialized, and passed to Gate Officer dashboard!")

    # 3. Clean up: Revert back to normal
    revert_req = urllib.request.Request(
        f'http://localhost:8000/api/visitor-requests/{req_id}/visitor-type?visitor_type=normal',
        headers={'Authorization': f'Bearer {ops_token}'},
        method='PATCH'
    )
    urllib.request.urlopen(revert_req)
    
    # Check details again to verify vip_lmv_access is cleared
    full_resp = urllib.request.urlopen(full_req)
    details_after = json.loads(full_resp.read().decode())
    print(f"OK: Cleaned up. visitor_type={details_after.get('visitor_type')}, vip_lmv_access={details_after.get('vip_lmv_access')}")
    
    if details_after.get('visitor_type') != 'normal' or details_after.get('vip_lmv_access') is not None:
        print("ERROR: Failed to clean up properly.")
        sys.exit(1)
    else:
        print("SUCCESS: Cleanup complete. Test passed!")

except Exception as e:
    print(f"ERROR: Exception occurred: {e}")
    sys.exit(1)
