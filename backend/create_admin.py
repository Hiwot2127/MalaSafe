"""
Script to create the initial admin user.

Run this script once after setting up the database to create the first admin account.

Usage:
    python create_admin.py
"""

import asyncio
import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.utils import get_password_hash, validate_password_strength
import uuid
from sqlalchemy import select


async def create_admin():
    """Create the initial admin user."""
    
    print("=" * 60)
    print("MalaSafe - Create Initial Admin User")
    print("=" * 60)
    print()
    
    # Get admin details
    email = input("Enter admin email [admin@malasafe.gov.et]: ").strip()
    if not email:
        email = "admin@malasafe.gov.et"
    
    full_name = input("Enter admin full name [System Administrator]: ").strip()
    if not full_name:
        full_name = "System Administrator"
    
    # Get password with validation
    while True:
        password = input("Enter admin password: ").strip()
        if not password:
            print("❌ Password cannot be empty")
            continue
        
        is_valid, error_message = validate_password_strength(password)
        if not is_valid:
            print(f"❌ {error_message}")
            print("\nPassword requirements:")
            print("  • At least 8 characters")
            print("  • At least one uppercase letter")
            print("  • At least one lowercase letter")
            print("  • At least one digit")
            print("  • At least one special character")
            print()
            continue
        
        confirm_password = input("Confirm password: ").strip()
        if password != confirm_password:
            print("❌ Passwords do not match")
            continue
        
        break
    
    print()
    print("Creating admin user...")
    
    try:
        async with AsyncSessionLocal() as db:
            # Check if admin already exists
            result = await db.execute(select(User).where(User.email == email))
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"❌ User with email {email} already exists")
                return
            
            # Create admin user
            admin = User(
                id=uuid.uuid4(),
                email=email,
                full_name=full_name,
                password_hash=get_password_hash(password),
                role=UserRole.ADMIN,
                district_id=None,
                is_active=True
            )
            
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
            
            print()
            print("✅ Admin user created successfully!")
            print()
            print("Admin Details:")
            print(f"  ID: {admin.id}")
            print(f"  Email: {admin.email}")
            print(f"  Full Name: {admin.full_name}")
            print(f"  Role: {admin.role.value}")
            print()
            print("You can now login with these credentials.")
            
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    try:
        asyncio.run(create_admin())
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
