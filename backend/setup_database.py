"""
Script to setup the database with initial data.

This script:
1. Creates all tables (runs migrations)
2. Creates initial admin user
3. Optionally loads sample districts

Usage:
    python setup_database.py
"""

import asyncio
import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal, async_engine, Base
from app.models import User, UserRole, District
from app.utils import get_password_hash, validate_password_strength
import uuid
from sqlalchemy import select


async def create_tables():
    """Create all database tables."""
    print("Creating database tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully!")


async def create_admin_user():
    """Create the initial admin user."""
    print("\n" + "=" * 60)
    print("Create Initial Admin User")
    print("=" * 60)
    
    email = input("Enter admin email [admin@malasafe.gov.et]: ").strip()
    if not email:
        email = "admin@malasafe.gov.et"
    
    full_name = input("Enter admin full name [Abebe Kebede]: ").strip()
    if not full_name:
        full_name = "Abebe Kebede"
    
    while True:
        password = input("Enter admin password: ").strip()
        if not password:
            print("❌ Password cannot be empty")
            continue
        
        is_valid, error_message = validate_password_strength(password)
        if not is_valid:
            print(f"❌ {error_message}")
            continue
        
        confirm_password = input("Confirm password: ").strip()
        if password != confirm_password:
            print("❌ Passwords do not match")
            continue
        
        break
    
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"❌ User with email {email} already exists")
            return False
        
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
        
        print("\n✅ Admin user created successfully!")
        print(f"   Email: {admin.email}")
        print(f"   Role: {admin.role.value}")
        return True


async def load_sample_districts():
    """Load sample Ethiopian districts."""
    print("\n" + "=" * 60)
    print("Load Sample Districts")
    print("=" * 60)
    
    load = input("Load sample districts? (y/n) [n]: ").strip().lower()
    if load != 'y':
        print("Skipping sample districts...")
        return
    
    sample_districts = [
        {
            "district_code": "AA-001",
            "district_name": "Addis Ababa Bole",
            "region": "Addis Ababa",
            "zone": None
        },
        {
            "district_code": "OR-001",
            "district_name": "Jimma",
            "region": "Oromia",
            "zone": "Jimma Zone"
        },
        {
            "district_code": "AM-001",
            "district_name": "Bahir Dar",
            "region": "Amhara",
            "zone": "West Gojjam"
        },
        {
            "district_code": "TG-001",
            "district_name": "Mekelle",
            "region": "Tigray",
            "zone": "Mekelle Special Zone"
        },
        {
            "district_code": "SO-001",
            "district_name": "Jijiga",
            "region": "Somali",
            "zone": "Fafan Zone"
        },
        {
            "district_code": "SN-001",
            "district_name": "Hawassa",
            "region": "SNNPR",
            "zone": "Sidama Zone"
        },
        {
            "district_code": "GA-001",
            "district_name": "Gambela",
            "region": "Gambela",
            "zone": None
        },
        {
            "district_code": "BE-001",
            "district_name": "Assosa",
            "region": "Benishangul-Gumuz",
            "zone": "Assosa Zone"
        },
        {
            "district_code": "HA-001",
            "district_name": "Harar",
            "region": "Harari",
            "zone": None
        },
        {
            "district_code": "DD-001",
            "district_name": "Dire Dawa",
            "region": "Dire Dawa",
            "zone": None
        },
    ]
    
    async with AsyncSessionLocal() as db:
        created_count = 0
        
        for district_data in sample_districts:
            # Check if district already exists
            result = await db.execute(
                select(District).where(District.district_code == district_data["district_code"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"⚠️  District {district_data['district_code']} already exists, skipping...")
                continue
            
            district = District(
                id=uuid.uuid4(),
                **district_data
            )
            db.add(district)
            created_count += 1
            print(f"✅ Created district: {district_data['district_name']} ({district_data['district_code']})")
        
        await db.commit()
        print(f"\n✅ Created {created_count} districts")


async def main():
    """Main setup function."""
    print("\n" + "=" * 60)
    print("MalaSafe Database Setup")
    print("=" * 60)
    print()
    
    try:
        # Step 1: Create tables
        await create_tables()
        
        # Step 2: Create admin user
        await create_admin_user()
        
        # Step 3: Load sample districts
        await load_sample_districts()
        
        print("\n" + "=" * 60)
        print("✅ Database Setup Complete!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("  1. Start the server: run.bat")
        print("  2. Access API docs: http://localhost:8000/api/docs")
        print("  3. Login with admin credentials")
        print()
        
    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nSetup cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
