import asyncio
import uuid
from sqlalchemy import select
from app.database.base import AsyncSessionLocal

# Models
from app.models.district import District
from app.models.malaria_data import MalariaData
from app.models.alert import Alert

async def seed():
    print("🌱 Starting Final Data Seed for MalaSafe Cloud...")
    async with AsyncSessionLocal() as db:
        
        # 1. Check if districts already exist to avoid "Unique Constraint" errors
        result = await db.execute(select(District))
        existing_districts = result.scalars().all()
        
        if not existing_districts:
            print("Creating new districts...")
            districts_info = [
                {"name": "Bole", "region": "Addis Ababa", "code": "AA-01"},
                {"name": "Arada", "region": "Addis Ababa", "code": "AA-02"},
                {"name": "Adama", "region": "Oromia", "code": "OR-01"},
                {"name": "Bahir Dar", "region": "Amhara", "code": "AM-01"},
                {"name": "Hawassa", "region": "Sidama", "code": "SI-01"}
            ]
            for d in districts_info:
                new_d = District(
                    district_code=d["code"],
                    district_name=d["name"],
                    region=d["region"]
                )
                db.add(new_d)
            await db.commit()
            # Refresh list
            result = await db.execute(select(District))
            existing_districts = result.scalars().all()
        else:
            print(f"Found {len(existing_districts)} existing districts.")

        # 2. Add Malaria Data for multiple years to ensure filters catch it
        print("Adding malaria case records for 2024, 2025, and 2026...")
        for d in existing_districts:
            for yr in [2024, 2025, 2026]: # Add 3 years of data
                case_entry = MalariaData(
                    district_id=d.id,
                    source_type="file_upload",
                    week=1,
                    month=1,
                    year=yr,
                    cases=500,
                    deaths=10
                )
                db.add(case_entry)
        
        # 3. Add Alerts (List for your Alerts Tab)
        # Note: risk_level MUST be lowercase: 'low', 'moderate', 'high', 'very_high'
        print("Creating system alerts...")
        alert1 = Alert(
            district_id=existing_districts[0].id,
            risk_level="high",
            message="EMERGENCY: AI model detected a 40% spike in predicted cases in this district.",
            is_active=True
        )
        
        alert2 = Alert(
            district_id=existing_districts[1].id,
            risk_level="moderate",
            message="WARNING: Rising humidity levels increasing mosquito breeding probability.",
            is_active=True
        )
        
        db.add(alert1)
        db.add(alert2)

        await db.commit()
        print("✅ SUCCESS: Cloud Database populated!")
        print("🌟 ACTION: Restart your uvicorn server and pull-to-refresh your iPhone app!")

if __name__ == "__main__":
    asyncio.run(seed())