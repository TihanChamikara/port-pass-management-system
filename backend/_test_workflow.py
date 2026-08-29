#!/usr/bin/env python
"""Test approval workflow and check request status after approval"""

import json
import urllib.request

print("="*60)
print("VISITOR REQUEST APPROVAL TEST")
print("="*60)

# Login as ops_officer
login_payload = {'username': 'ops_officer', 'password': 'OpOfficer@123'}
login_url = 'http://localhost:8000/api/auth/login'
login_data = json.dumps(login_payload).encode()
login_req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'}, method='POST')

with urllib.request.urlopen(login_req, timeout=10) as resp:
    login_result = json.loads(resp.read().decode())
    token = login_result.get('access_token')
    print("✓ Ops Officer logged in")
    
    # Get pending requests
    pending_url = 'http://localhost:8000/api/visitor-requests/pending?page=1&page_size=20'
    pending_req = urllib.request.Request(pending_url, headers={'Authorization': 'Bearer ' + token}, method='GET')
    
    with urllib.request.urlopen(pending_req, timeout=10) as resp:
        pending_result = json.loads(resp.read().decode())
        items = pending_result.get('items', [])
        
        # Find Alice's request
        alice_req = None
        for item in items:
            if 'Alice' in item.get('visitor_name', ''):
                alice_req = item
                break
        
        if not alice_req:
            print("✗ Alice's request not found")
            exit(1)
        
        request_id = alice_req.get('id')
        print(f"✓ Found Alice's request (ID: {request_id})")
        
        # Approve the request
        approve_url = f'http://localhost:8000/api/visitor-requests/{request_id}/approve'
        approve_payload = {'comments': 'Test approval', 'zones_override': None}
        approve_data = json.dumps(approve_payload).encode()
        approve_req = urllib.request.Request(
            approve_url,
            data=approve_data,
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
            method='POST'
        )
        
        try:
            with urllib.request.urlopen(approve_req, timeout=10) as resp:
                approve_result = json.loads(resp.read().decode())
                print(f"\n✓ Approval response received:")
                print(json.dumps(approve_result, indent=2))
                
                # Check pending list again - request should be gone
                print("\nChecking pending list after approval...")
                with urllib.request.urlopen(pending_req, timeout=10) as resp:
                    pending_after = json.loads(resp.read().decode())
                    items_after = pending_after.get('items', [])
                    
                    alice_still_pending = False
                    for item in items_after:
                        if item.get('id') == request_id:
                            alice_still_pending = True
                            break
                    
                    if alice_still_pending:
                        print("✗ Request still in pending list after approval")
                    else:
                        print("✓ Request removed from pending list")
                        print(f"  Remaining pending: {pending_after.get('total')} requests")
                        
        except urllib.error.HTTPError as e:
            print(f"\n✗ Approval failed with status {e.code}")
            try:
                error_body = json.loads(e.read().decode())
                print(json.dumps(error_body, indent=2))
            except:
                print(e.read().decode())
