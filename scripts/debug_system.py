#!/usr/bin/env python3
"""
MalaSafe System Debugging Script
Comprehensive system check for frontend routes, backend connectivity, and Docker setup
"""
import sys
import subprocess
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
CYAN = '\033[96m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}{text:^80}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")

def print_error(text):
    print(f"{RED}✗ {text}{RESET}")

def print_warning(text):
    print(f"{YELLOW}⚠ {text}{RESET}")

def print_info(text):
    print(f"{CYAN}ℹ {text}{RESET}")

def run_command(cmd: List[str], cwd: Path = None) -> Tuple[bool, str]:
    """Run a command and return success status and output"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return False, "Command timed out"
    except Exception as e:
        return False, str(e)

def check_docker_running() -> bool:
    """Check if Docker is running"""
    success, output = run_command(['docker', 'info'])
    return success

def check_docker_compose_services() -> Dict[str, str]:
    """Check status of Docker Compose services"""
    success, output = run_command(['docker', 'compose', 'ps', '--format', 'json'])
    if not success:
        return {}
    
    services = {}
    try:
        # Parse JSON output
        for line in output.strip().split('\n'):
            if line:
                service = json.loads(line)
                services[service['Service']] = service['State']
    except:
        pass
    
    return services

def check_backend_health() -> bool:
    """Check if backend is responding"""
    try:
        import requests
        response = requests.get('http://localhost:8000/api/v1/health', timeout=5)
        return response.status_code == 200
    except:
        return False

def check_frontend_running() -> bool:
    """Check if frontend is responding"""
    try:
        import requests
        response = requests.get('http://localhost:3000', timeout=5)
        return response.status_code == 200
    except:
        return False

def check_frontend_routes() -> List[Tuple[str, bool, str]]:
    """Check if frontend routes exist"""
    project_root = Path(__file__).parent.parent
    frontend_app = project_root / 'frontend' / 'app'
    
    # Expected routes for MOH Officer
    expected_routes = [
        ('(dashboard)/dashboard/page.tsx', '/dashboard', 'Main dashboard'),
        ('(dashboard)/dashboard/upload/page.tsx', '/dashboard/upload', 'Upload page'),
        ('(dashboard)/dashboard/analytics/page.tsx', '/dashboard/analytics', 'Analytics'),
        ('(dashboard)/dashboard/maps/page.tsx', '/dashboard/maps', 'Maps'),
        ('(dashboard)/dashboard/predictions/page.tsx', '/dashboard/predictions', 'Predictions'),
        ('(dashboard)/dashboard/alerts/page.tsx', '/dashboard/alerts', 'Alerts'),
        ('(dashboard)/dashboard/reports/page.tsx', '/dashboard/reports', 'Reports'),
        ('(dashboard)/dashboard/monthly-close/page.tsx', '/dashboard/monthly-close', 'Monthly Close'),
        ('(auth)/login/page.tsx', '/login', 'Login'),
        ('(auth)/change-password/page.tsx', '/change-password', 'Change Password'),
    ]
    
    results = []
    for file_path, route, description in expected_routes:
        full_path = frontend_app / file_path
        exists = full_path.exists()
        results.append((route, exists, description))
    
    return results

def check_backend_routes() -> List[Tuple[str, bool, str]]:
    """Check if backend routes are registered"""
    project_root = Path(__file__).parent.parent
    main_py = project_root / 'backend' / 'app' / 'main.py'
    
    if not main_py.exists():
        return []
    
    content = main_py.read_text()
    
    # Expected route registrations
    expected_routes = [
        ('health_router', '/api/v1/health', 'Health check'),
        ('auth_router', '/api/v1/auth', 'Authentication'),
        ('admin_router', '/api/v1/admin', 'Admin'),
        ('uploads_router', '/api/v1/uploads', 'Uploads'),
        ('analytics_router', '/api/v1/analytics', 'Analytics'),
        ('maps_router', '/api/v1/maps', 'Maps'),
        ('predictions_router', '/api/v1/predictions', 'Predictions'),
        ('alerts_router', '/api/v1/alerts', 'Alerts'),
        ('monthly_close_router', '/api/v1/monthly-close', 'Monthly Close'),
        ('operations_router', '/api/v1/operations', 'Operations'),
        ('exports_router', '/api/v1/exports', 'Exports'),
        ('recommendations_router', '/api/v1/recommendations', 'Recommendations'),
    ]
    
    results = []
    for router_name, route, description in expected_routes:
        registered = router_name in content and f'include_router({router_name}' in content
        results.append((route, registered, description))
    
    return results

def check_navigation_config() -> List[Tuple[str, bool, str]]:
    """Check navigation configuration"""
    project_root = Path(__file__).parent.parent
    nav_file = project_root / 'frontend' / 'lib' / 'rbac' / 'navigation.ts'
    
    if not nav_file.exists():
        return []
    
    content = nav_file.read_text()
    
    # Check for MOH Officer navigation items
    expected_items = [
        ('/dashboard', 'Dashboard'),
        ('/dashboard/upload', 'Upload'),
        ('/dashboard/analytics', 'Analytics'),
        ('/dashboard/maps', 'Maps'),
        ('/dashboard/predictions', 'Predictions'),
        ('/dashboard/alerts', 'Alerts'),
        ('/dashboard/reports', 'Reports'),
        ('/dashboard/monthly-close', 'Monthly Close'),
    ]
    
    results = []
    for route, description in expected_items:
        # Check if route is in navigation config
        exists = f"'{route}'" in content or f'"{route}"' in content
        results.append((route, exists, description))
    
    return results

def main():
    print_header("MalaSafe System Debugging")
    
    # Check if requests is installed
    try:
        import requests
    except ImportError:
        print_warning("requests library not installed. Installing...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'requests'], check=True)
        import requests
    
    # 1. Docker Status
    print_header("1. Docker Status")
    if check_docker_running():
        print_success("Docker is running")
        
        # Check services
        services = check_docker_compose_services()
        if services:
            print_info(f"Found {len(services)} services:")
            for service, state in services.items():
                if state == 'running':
                    print_success(f"  {service}: {state}")
                else:
                    print_error(f"  {service}: {state}")
        else:
            print_warning("No Docker Compose services found. Run: docker compose up")
    else:
        print_error("Docker is not running or not installed")
        print_info("Start Docker Desktop and try again")
    
    # 2. Backend Health
    print_header("2. Backend Health")
    if check_backend_health():
        print_success("Backend is responding at http://localhost:8000")
        
        # Check specific endpoints
        endpoints = [
            '/api/v1/health',
            '/api/v1/health/db',
            '/api/docs',
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(f'http://localhost:8000{endpoint}', timeout=5)
                if response.status_code == 200:
                    print_success(f"  {endpoint}: OK")
                else:
                    print_warning(f"  {endpoint}: {response.status_code}")
            except:
                print_error(f"  {endpoint}: Failed")
    else:
        print_error("Backend is not responding")
        print_info("Check if backend container is running: docker compose logs backend")
    
    # 3. Frontend Status
    print_header("3. Frontend Status")
    if check_frontend_running():
        print_success("Frontend is responding at http://localhost:3000")
    else:
        print_error("Frontend is not responding")
        print_info("Check if frontend container is running: docker compose logs frontend")
    
    # 4. Frontend Routes
    print_header("4. Frontend Routes")
    routes = check_frontend_routes()
    missing_routes = []
    for route, exists, description in routes:
        if exists:
            print_success(f"{route} - {description}")
        else:
            print_error(f"{route} - {description} (MISSING)")
            missing_routes.append(route)
    
    if missing_routes:
        print_warning(f"\n{len(missing_routes)} routes are missing!")
        print_info("These routes need to be created in frontend/app/")
    
    # 5. Backend Routes
    print_header("5. Backend Routes")
    backend_routes = check_backend_routes()
    missing_backend = []
    for route, registered, description in backend_routes:
        if registered:
            print_success(f"{route} - {description}")
        else:
            print_error(f"{route} - {description} (NOT REGISTERED)")
            missing_backend.append(route)
    
    if missing_backend:
        print_warning(f"\n{len(missing_backend)} backend routes are not registered!")
        print_info("Check backend/app/main.py for router registration")
    
    # 6. Navigation Configuration
    print_header("6. Navigation Configuration")
    nav_items = check_navigation_config()
    missing_nav = []
    for route, exists, description in nav_items:
        if exists:
            print_success(f"{route} - {description}")
        else:
            print_error(f"{route} - {description} (NOT IN NAV)")
            missing_nav.append(route)
    
    if missing_nav:
        print_warning(f"\n{len(missing_nav)} navigation items are missing!")
        print_info("Check frontend/lib/rbac/navigation.ts")
    
    # 7. Summary
    print_header("Summary")
    
    total_checks = len(routes) + len(backend_routes) + len(nav_items) + 3
    passed_checks = (
        sum(1 for _, exists, _ in routes if exists) +
        sum(1 for _, registered, _ in backend_routes if registered) +
        sum(1 for _, exists, _ in nav_items if exists) +
        (1 if check_docker_running() else 0) +
        (1 if check_backend_health() else 0) +
        (1 if check_frontend_running() else 0)
    )
    
    percentage = (passed_checks / total_checks * 100) if total_checks > 0 else 0
    
    print(f"Total Checks: {total_checks}")
    print(f"Passed: {GREEN}{passed_checks}{RESET}")
    print(f"Failed: {RED}{total_checks - passed_checks}{RESET}")
    print(f"Success Rate: {GREEN if percentage >= 90 else YELLOW if percentage >= 70 else RED}{percentage:.1f}%{RESET}\n")
    
    # 8. Recommendations
    if percentage < 100:
        print_header("Recommendations")
        
        if not check_docker_running():
            print_info("1. Start Docker Desktop")
            print_info("2. Run: docker compose up --build")
        
        if missing_routes:
            print_info("3. Create missing frontend routes:")
            for route in missing_routes[:3]:
                print(f"   - {route}")
        
        if missing_backend:
            print_info("4. Register missing backend routes in main.py")
        
        if missing_nav:
            print_info("5. Update navigation configuration")
    else:
        print_success("All checks passed! System is ready for demonstration.")
    
    # 9. Quick Commands
    print_header("Quick Commands")
    print("Start system:     docker compose up --build")
    print("View logs:        docker compose logs -f backend")
    print("Restart service:  docker compose restart backend")
    print("Stop system:      docker compose down")
    print("Clean restart:    docker compose down -v && docker compose up --build")
    print("\nBackend API:      http://localhost:8000/api/docs")
    print("Frontend:         http://localhost:3000")
    print("Login:            admin_malasafe@gmail.com / admin1234#")
    
    return 0 if percentage >= 90 else 1

if __name__ == "__main__":
    sys.exit(main())
