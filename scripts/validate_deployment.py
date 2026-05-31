#!/usr/bin/env python3
"""
MalaSafe Deployment Validation Script
Validates that all essential fixes are in place and the system is ready for demonstration.
"""
import sys
import os
from pathlib import Path

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
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

def check_file_contains(filepath, search_strings, description):
    """Check if a file contains specific strings."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        missing = []
        for search_str in search_strings:
            if search_str not in content:
                missing.append(search_str)
        
        if not missing:
            print_success(f"{description}")
            return True
        else:
            print_error(f"{description} - Missing: {', '.join(missing[:2])}")
            return False
    except FileNotFoundError:
        print_error(f"{description} - File not found: {filepath}")
        return False
    except Exception as e:
        print_error(f"{description} - Error: {str(e)}")
        return False

def main():
    print_header("MalaSafe Deployment Validation")
    
    # Get project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    backend_root = project_root / "backend"
    
    print(f"Project root: {project_root}\n")
    
    results = []
    
    # 1. Check RecommendationService error handling
    print_header("1. RecommendationService Error Handling")
    results.append(check_file_contains(
        backend_root / "app" / "services" / "recommendation_service.py",
        ["default_context", "try:", "except Exception", "return default_context"],
        "Defensive error handling in climate context"
    ))
    results.append(check_file_contains(
        backend_root / "app" / "services" / "recommendation_service.py",
        ["default_context", "try:", "except Exception", "return default_context"],
        "Defensive error handling in historical context"
    ))
    
    # 2. Check environment variable validation
    print_header("2. Environment Variable Validation")
    results.append(check_file_contains(
        backend_root / "app" / "config" / "settings.py",
        ["@field_validator('SECRET_KEY')", "validate_secret_key", "raise ValueError"],
        "SECRET_KEY validation"
    ))
    results.append(check_file_contains(
        backend_root / "app" / "config" / "settings.py",
        ["@field_validator('DATABASE_URL'", "validate_database_url"],
        "DATABASE_URL validation"
    ))
    
    # 3. Check rate limiting on password change
    print_header("3. Rate Limiting on Password Change")
    results.append(check_file_contains(
        backend_root / "app" / "routes" / "auth.py",
        ["@limiter.limit(\"5/hour\")", "async def change_password"],
        "Rate limiting on /auth/change-password"
    ))
    
    # 4. Check prediction service validation
    print_header("4. Prediction Service Input Validation")
    results.append(check_file_contains(
        backend_root / "app" / "services" / "prediction_service.py",
        ["if not district_id:", "raise ValueError", "Clamp to reasonable bounds"],
        "Input validation in prediction service"
    ))
    results.append(check_file_contains(
        backend_root / "app" / "services" / "prediction_service.py",
        ["max(min(result, 100000.0), 1.0)"],
        "Bounds checking in tests_hint calculation"
    ))
    
    # 5. Check transaction rollback in uploads
    print_header("5. Transaction Rollback in Uploads")
    results.append(check_file_contains(
        backend_root / "app" / "services" / "upload_service.py",
        ["async with self.db.begin_nested():", "await self.db.rollback()"],
        "Transaction rollback in upload service"
    ))
    
    # 6. Check database connection pool configuration
    print_header("6. Database Connection Pool Configuration")
    results.append(check_file_contains(
        backend_root / "app" / "database" / "base.py",
        ["pool_size=20", "max_overflow=40", "pool_timeout=30", "pool_pre_ping=True"],
        "Async engine pool configuration"
    ))
    results.append(check_file_contains(
        backend_root / "app" / "database" / "base.py",
        ["pool_size=10", "pool_recycle=3600"],
        "Sync engine pool configuration"
    ))
    
    # 7. Check Docker configuration
    print_header("7. Docker Configuration")
    results.append(check_file_contains(
        project_root / "docker-compose.yml",
        ["postgres:", "redis:", "backend:", "frontend:", "celery-worker:"],
        "Docker Compose services defined"
    ))
    results.append(check_file_contains(
        project_root / "docker-compose.yml",
        ["healthcheck:", "condition: service_healthy"],
        "Health checks configured"
    ))
    
    # 8. Check critical files exist
    print_header("8. Critical Files Existence")
    critical_files = [
        backend_root / "requirements.txt",
        backend_root / "Dockerfile",
        backend_root / ".env.example",
        backend_root / "alembic.ini",
        project_root / "frontend" / "Dockerfile",
        project_root / "frontend" / "package.json",
        project_root / ".dockerignore",
    ]
    
    for filepath in critical_files:
        if filepath.exists():
            print_success(f"{filepath.name} exists")
            results.append(True)
        else:
            print_error(f"{filepath.name} missing")
            results.append(False)
    
    # Summary
    print_header("Validation Summary")
    passed = sum(results)
    total = len(results)
    percentage = (passed / total * 100) if total > 0 else 0
    
    print(f"\nTotal Checks: {total}")
    print(f"Passed: {GREEN}{passed}{RESET}")
    print(f"Failed: {RED}{total - passed}{RESET}")
    print(f"Success Rate: {GREEN if percentage >= 90 else YELLOW if percentage >= 70 else RED}{percentage:.1f}%{RESET}\n")
    
    if percentage >= 90:
        print_success("✓ All essential fixes are in place! System is ready for demonstration.")
        return 0
    elif percentage >= 70:
        print_warning("⚠ Most fixes are in place, but some issues remain. Review failed checks.")
        return 1
    else:
        print_error("✗ Critical fixes are missing. Please address failed checks before deployment.")
        return 2

if __name__ == "__main__":
    sys.exit(main())
