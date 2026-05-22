import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.user import User

async def check():
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.email == "admin@malasafe.gov.et"))
        user = result.scalar_one_or_none()
        if user:
            print("USER EXISTS. Hash:", user.password_hash)
        else:
            print("USER DOES NOT EXIST")

asyncio.run(check())
