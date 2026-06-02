#!/usr/bin/env python3
"""Quick frontend connectivity test"""
import requests
import sys

def test_frontend():
    """Test if frontend is responding"""
    print("Testing Frontend at http://localhost:3000...")
    
    try:
        # Test root
        response = requests.get("http://localhost:3000", timeout=5)
        print(f"✓ Frontend root: {response.status_code}")
        
        # Test dashboard (will redirect if not authenticated, but should respond)
        response = requests.get("http://localhost:3000/dashboard", timeout=5, allow_redirects=False)
        print(f"✓ Frontend /dashboard: {response.status_code}")
        
        # Test login page
        response = requests.get("http://localhost:3000/login", timeout=5)
        print(f"✓ Frontend /login: {response.status_code}")
        
        print("\n✓ Frontend is responding!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("✗ Frontend not responding - connection error")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_backend():
    """Test if backend is responding"""
    print("\nTesting Backend at http://localhost:8000...")
    
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        print(f"✓ Backend health: {response.status_code}")
        print(f"  Response: {response.json()}")
        
        # Test API root
        response = requests.get("http://localhost:8000/api/v1/", timeout=5)
        print(f"✓ Backend API root: {response.status_code}")
        
        print("\n✓ Backend is responding!")
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    frontend_ok = test_frontend()
    backend_ok = test_backend()
    
    if frontend_ok and backend_ok:
        print("\n✓✓✓ All systems operational!")
        sys.exit(0)
    else:
        print("\n✗✗✗ Some systems not responding")
        sys.exit(1)
