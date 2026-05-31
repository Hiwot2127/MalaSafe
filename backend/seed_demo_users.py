"""
Seed demo accounts for local development and capstone demos.

Usage (from backend/ with venv active and DB running):
    python seed_demo_users.py
"""

import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.security import get_password_hash

DEMO_USERS = [
    {
        "email": "admin_malasafe@gmail.com",
        "full_name": "System Admin",
        "password": "admin1234#",
        "role": UserRole.ADMIN,
    },
    {
        "email": "moh@moh.gov.et",
        "full_name": "Dr. Abebe Kebede",
        "password": "MohOfficer123!",
        "role": UserRole.MOH_OFFICER,
    },
    {
        "email": "ephi@ephi.gov.et",
        "full_name": "Dr. Tigist Haile",
        "password": "EphiOfficer123!",
        "role": UserRole.EPHI_OFFICER,
    },
]


def seed() -> None:
    with SessionLocal() as db:
        for spec in DEMO_USERS:
            existing = db.execute(
                select(User).where(User.email == spec["email"])
            ).scalar_one_or_none()
            if existing:
                print(f"Already exists: {spec['email']} ({existing.role.value})")
                continue
            user = User(
                id=uuid.uuid4(),
                email=spec["email"],
                full_name=spec["full_name"],
                password_hash=get_password_hash(spec["password"]),
                role=spec["role"],
                is_active=True,
                force_password_change=False,
            )
            db.add(user)
            db.commit()
            print(f"Created: {spec['email']} — role {spec['role'].value}")


if __name__ == "__main__":
    print("MalaSafe — seeding demo users\n")
    seed()
    print("\nMOH dashboard login:")
    print("  Email:    moh@moh.gov.et")
    print("  Password: MohOfficer123!")
    print("  URL:      http://localhost:3000/login")
