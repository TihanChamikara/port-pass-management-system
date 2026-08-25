#!/usr/bin/env python
"""Verify visitor request submission appears in pending list"""

import json
import urllib.request

# Login as ops_officer
login_payload = {'username': 'ops_officer', 'password': 'OpOfficer@123'}
login_url = 'http://localhost:8000/api/auth/login'
login_data = json.dumps(login_payload).encode()
login_req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(login_req, timeout=10) as resp:
        login_result = json.loads(resp.read().decode())
        token = login_result.get('access_token')
        print('Login successful')
        
        # Get pending requests
        pending_url = 'http://localhost:8000/api/visitor-requests/pending?page=1&page_size=20'
        pending_req = urllib.request.Request(pending_url, headers={'Authorization': 'Bearer ' + token}, method='GET')
        
        with urllib.request.urlopen(pending_req, timeout=10) as resp:
            pending_result = json.loads(resp.read().decode())
            print('Pending requests total:', pending_result.get('total'))
            items = pending_result.get('items', [])
            print('\nLast 5 requests:')
            for item in items[-5:]:
                print(f"  - {item.get('request_id')}: {item.get('visitor_name')} ({item.get('status')})")
            
            # Look for our test request
            alice_reqs = [item for item in items if 'Alice' in item.get('visitor_name', '')]
            if alice_reqs:
                print('\nFound Alice Johnson request:')
                for req in alice_reqs:
                    print(f"  ID: {req.get('request_id')}")
                    print(f"  Status: {req.get('status')}")
                    print(f"  Purpose: {req.get('visitor_purpose')}")
                    print(f"  Zones: {req.get('requested_zones')}")
            else:
                print('\nAlice Johnson request not found in pending list')
                
except urllib.error.HTTPError as e:
    print(f'HTTP Error {e.code}')
    try:
        print('Response:', e.read().decode())
    except:
        pass
except Exception as e:
    print(f'Error: {type(e).__name__}: {e}')
