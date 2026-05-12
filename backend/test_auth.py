"""
Script to test the authentication system.

This script tests all authentication endpoints to verify the system is working correctly.

Usage:
    python test_auth.py
"""

import requests
import json
from typing import Optional

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
MOBILE_URL = "http://localhost:8000/api/v1/mobile"


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'


def print_success(message: str):
    """Print success message in green."""
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")


def print_error(message: str):
    """Print error message in red."""
    print(f"{Colors.RED}❌ {message}{Colors.END}")


def print_info(message: str):
    """Print info message in blue."""
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")


def print_warning(message: str):
    """Print warning message in yellow."""
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")


def print_section(title: str):
    """Print section header."""
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_login(email: str, password: str) -> Optional[dict]:
    """Test login endpoint."""
    print_info(f"Testing login for: {email}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password}
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Login successful")
            print(f"   Token: {data['access_token'][:50]}...")
            print(f"   User: {data['user']['full_name']} ({data['user']['role']})")
            return data
        else:
            print_error(f"Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Login error: {e}")
        return None


def test_mobile_register(email: str, full_name: str, password: str, district_id: str = None) -> bool:
    """Test mobile registration endpoint."""
    print_info(f"Testing mobile registration for: {email}")
    
    try:
        data = {
            "email": email,
            "full_name": full_name,
            "password": password,
            "district_id": district_id
        }
        
        response = requests.post(f"{MOBILE_URL}/register", json=data)
        
        if response.status_code == 201:
            user = response.json()
            print_success("Mobile registration successful")
            print(f"   User ID: {user['id']}")
            print(f"   Email: {user['email']}")
            print(f"   Role: {user['role']}")
            return True
        else:
            print_error(f"Mobile registration failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Mobile registration error: {e}")
        return False


def test_create_official(token: str, email: str, full_name: str, password: str, role: str) -> bool:
    """Test create official endpoint."""
    print_info(f"Testing create official for: {email} (role: {role})")
    
    try:
        data = {
            "email": email,
            "full_name": full_name,
            "password": password,
            "role": role,
            "district_id": None
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{BASE_URL}/auth/create-official",
            json=data,
            headers=headers
        )
        
        if response.status_code == 201:
            user = response.json()
            print_success("Official account created successfully")
            print(f"   User ID: {user['id']}")
            print(f"   Email: {user['email']}")
            print(f"   Role: {user['role']}")
            return True
        else:
            print_error(f"Create official failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Create official error: {e}")
        return False


def test_get_current_user(token: str) -> bool:
    """Test get current user endpoint."""
    print_info("Testing get current user")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        
        if response.status_code == 200:
            user = response.json()
            print_success("Get current user successful")
            print(f"   Email: {user['email']}")
            print(f"   Full Name: {user['full_name']}")
            print(f"   Role: {user['role']}")
            return True
        else:
            print_error(f"Get current user failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Get current user error: {e}")
        return False


def test_unauthorized_access() -> bool:
    """Test that unauthorized access is properly blocked."""
    print_info("Testing unauthorized access protection")
    
    try:
        # Try to access protected endpoint without token
        response = requests.get(f"{BASE_URL}/auth/me")
        
        if response.status_code == 403:
            print_success("Unauthorized access properly blocked")
            return True
        else:
            print_error(f"Unexpected response: {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Unauthorized access test error: {e}")
        return False


def test_invalid_token() -> bool:
    """Test that invalid tokens are rejected."""
    print_info("Testing invalid token rejection")
    
    try:
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        
        if response.status_code == 401:
            print_success("Invalid token properly rejected")
            return True
        else:
            print_error(f"Unexpected response: {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Invalid token test error: {e}")
        return False


def main():
    """Run all authentication tests."""
    print()
    print("=" * 60)
    print("  MalaSafe Authentication System Test")
    print("=" * 60)
    print()
    print_warning("Make sure the backend server is running on http://localhost:8000")
    print()
    
    # Test 1: Health check
    print_section("Test 1: Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print_success("Backend server is running")
        else:
            print_error("Backend server health check failed")
            return
    except Exception as e:
        print_error(f"Cannot connect to backend server: {e}")
        return
    
    # Test 2: Unauthorized access
    print_section("Test 2: Security - Unauthorized Access")
    test_unauthorized_access()
    test_invalid_token()
    
    # Test 3: Admin login
    print_section("Test 3: Admin Login")
    print_info("Please enter admin credentials")
    admin_email = input("Admin email [admin@malasafe.gov.et]: ").strip() or "admin@malasafe.gov.et"
    admin_password = input("Admin password: ").strip()
    
    if not admin_password:
        print_error("Password is required")
        return
    
    admin_login = test_login(admin_email, admin_password)
    if not admin_login:
        print_error("Admin login failed. Cannot continue tests.")
        return
    
    admin_token = admin_login["access_token"]
    
    # Test 4: Get current user
    print_section("Test 4: Get Current User")
    test_get_current_user(admin_token)
    
    # Test 5: Create official accounts
    print_section("Test 5: Create Official Accounts")
    
    officials = [
        ("moh@test.malasafe.gov.et", "MOH Test Officer", "MOHPass123!", "moh_officer"),
        ("ephi@test.malasafe.gov.et", "EPHI Test Officer", "EPHIPass123!", "ephi_officer"),
        ("regional@test.malasafe.gov.et", "Regional Test Officer", "RegionalPass123!", "regional_officer"),
    ]
    
    for email, name, password, role in officials:
        test_create_official(admin_token, email, name, password, role)
    
    # Test 6: Mobile registration
    print_section("Test 6: Mobile Registration (Public Users)")
    test_mobile_register(
        "publicuser@test.com",
        "Test Public User",
        "PublicPass123!",
        "addis_ababa_bole"
    )
    
    # Test 7: Login with different roles
    print_section("Test 7: Login with Different Roles")
    
    for email, _, password, role in officials:
        login_result = test_login(email, password)
        if login_result:
            test_get_current_user(login_result["access_token"])
    
    # Test 8: Public user login
    test_login("publicuser@test.com", "PublicPass123!")
    
    # Summary
    print_section("Test Summary")
    print_success("All authentication tests completed!")
    print()
    print("Next steps:")
    print("  1. Check the API documentation at http://localhost:8000/api/docs")
    print("  2. Review AUTH_DOCUMENTATION.md for detailed information")
    print("  3. Start building your application endpoints")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTests cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
