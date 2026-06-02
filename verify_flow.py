import urllib.request
import json
import random
import string

BASE_URL = "http://localhost:8000/api/v1"

def print_step(msg):
    print(f"\n[{'='*50}]")
    print(f"[STEP] {msg}")
    print(f"[{'='*50}]")

def post_json(url, payload, headers=None):
    data = json.dumps(payload).encode('utf-8')
    req_headers = {'Content-Type': 'application/json'}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=req_headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
        
def get_json(url, headers=None):
    req_headers = {}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers, method='GET')
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def main():
    # 1. Login as Admin
    print_step("Logging in as Admin")
    login_payload = {
        "email": "admin_malasafe@gmail.com",
        "password": "admin1234#"
    }
    status, resp = post_json(f"{BASE_URL}/auth/login", login_payload)
    if status != 200:
        print(f"Admin login failed: {resp}")
        return
    
    admin_token = resp["access_token"]
    print(f"Success! Admin Token: {admin_token[:20]}...")
    
    # 2. Create MOH account
    print_step("Creating new MOH Account")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Generate random email to avoid collision
    suffix = "".join(random.choices(string.ascii_lowercase, k=4))
    new_moh_email = f"moh_official_{suffix}@moh.gov.et"
    new_password = "MohOfficer123!_new"
    
    create_payload = {
        "email": new_moh_email,
        "full_name": f"Dr. New Official {suffix}",
        "password": new_password,
        "role": "moh_officer",
        "district_id": None
    }
    
    status, resp = post_json(f"{BASE_URL}/auth/create-official", create_payload, headers=headers)
    if status != 201:
        print(f"Failed to create MOH account: {resp}")
        return
    
    print(f"Success! Created MOH account: {new_moh_email}")
    
    # 3. Login as new MOH account
    print_step("Logging in as new MOH Account")
    moh_login_payload = {
        "email": new_moh_email,
        "password": new_password
    }
    status, resp = post_json(f"{BASE_URL}/auth/login", moh_login_payload)
    if status != 200:
        print(f"MOH login failed: {resp}")
        return
    
    moh_token = resp["access_token"]
    print(f"Success! MOH Token: {moh_token[:20]}...")
    
    # 4. Access an endpoint to verify everything works
    print_step("Fetching user profile to verify token works")
    headers = {"Authorization": f"Bearer {moh_token}"}
    status, resp = get_json(f"{BASE_URL}/auth/me", headers=headers)
    if status != 200:
        print(f"Failed to fetch profile: {resp}")
        return
    
    print(f"Success! Profile fetched:")
    print(json.dumps(resp, indent=2))
    print("\n✅ All steps completed successfully! The backend is working perfectly.")

if __name__ == "__main__":
    main()
