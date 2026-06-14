"""Check alert distribution across districts."""
import asyncio
from sqlalchemy import select, func
from app.database.base import AsyncSessionLocal
from app.models import District, Alert


async def check_distribution():
    async with AsyncSessionLocal() as db:
        # Total districts
        dist_count = await db.execute(select(func.count(District.id)))
        total_districts = dist_count.scalar()
        print(f"Total districts: {total_districts}")
        
        # Active alerts by risk level
        alert_by_risk = await db.execute(
            select(Alert.risk_level, func.count(Alert.id))
            .where(Alert.is_active == True)
            .group_by(Alert.risk_level)
        )
        print("\nActive alerts by risk level:")
        for risk, count in alert_by_risk:
            print(f"  {risk}: {count}")
        
        # Total active alerts
        active_total = await db.execute(
            select(func.count(Alert.id)).where(Alert.is_active == True)
        )
        print(f"\nTotal active alerts: {active_total.scalar()}")
        
        # Districts with no active alerts
        districts_with_alerts = await db.execute(
            select(func.count(func.distinct(Alert.district_id)))
            .where(Alert.is_active == True)
        )
        districts_with_active = districts_with_alerts.scalar()
        print(f"Districts with active alerts: {districts_with_active}")
        print(f"Districts without active alerts: {total_districts - districts_with_active}")


if __name__ == "__main__":
    asyncio.run(check_distribution())
