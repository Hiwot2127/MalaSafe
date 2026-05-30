import uuid
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.security import get_password_hash
from sqlalchemy import select

def seed():
    with SessionLocal() as db:
        result = db.execute(select(User).where(User.email == "admin_malasafe@gmail.com"))
        user = result.scalar_one_or_none()
        if not user:
            try:
                admin = User(
                    id=uuid.uuid4(),
                    email="admin_malasafe@gmail.com",
                    full_name="System Admin",
                    password_hash=get_password_hash("admin1234#"),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                db.add(admin)
                db.commit()
                print("Created admin user.")
            except Exception as e:
                print(f"Failed to create: {e}")
        else:
            print("Admin user already exists.")

if __name__ == "__main__":
    seed()
