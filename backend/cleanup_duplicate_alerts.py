"""Cleanup script to remove duplicate alerts and keep only the most recent one per district.

Run this once to clean up the database after fixing the alert duplication bug.

Usage:
    python cleanup_duplicate_alerts.py
"""
import asyncio
from datetime import datetime
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config.settings import settings
from app.models.alert import Alert


async def cleanup_duplicate_alerts():
    """Remove duplicate alerts, keeping only the most recent active alert per district."""
    
    # Create database connection
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("🔍 Finding duplicate alerts...")
        
        # Find districts with multiple active alerts
        district_alert_counts = await db.execute(
            select(
                Alert.district_id,
                func.count(Alert.id).label('alert_count')
            )
            .where(Alert.is_active == True)
            .group_by(Alert.district_id)
            .having(func.count(Alert.id) > 1)
        )
        
        duplicates = district_alert_counts.all()
        print(f"📊 Found {len(duplicates)} districts with duplicate alerts")
        
        total_removed = 0
        
        for district_id, count in duplicates:
            # Get all alerts for this district, ordered by creation date (newest first)
            alerts = await db.execute(
                select(Alert)
                .where(and_(
                    Alert.district_id == district_id,
                    Alert.is_active == True
                ))
                .order_by(Alert.created_at.desc())
            )
            alerts_list = list(alerts.scalars().all())
            
            # Keep the most recent, deactivate the rest
            if len(alerts_list) > 1:
                most_recent = alerts_list[0]
                to_deactivate = alerts_list[1:]
                
                print(f"  District {district_id}: Keeping alert {most_recent.id}, deactivating {len(to_deactivate)} duplicates")
                
                for alert in to_deactivate:
                    alert.is_active = False
                    alert.resolved_at = datetime.now().date()
                    total_removed += 1
        
        # Commit all changes
        await db.commit()
        
        print(f"\n✅ Cleanup complete!")
        print(f"   - Deactivated {total_removed} duplicate alerts")
        print(f"   - Kept the most recent alert for each district")
        
        # Show final stats
        total_active = await db.execute(
            select(func.count(Alert.id)).where(Alert.is_active == True)
        )
        active_count = total_active.scalar()
        
        total_inactive = await db.execute(
            select(func.count(Alert.id)).where(Alert.is_active == False)
        )
        inactive_count = total_inactive.scalar()
        
        print(f"\n📈 Final alert counts:")
        print(f"   - Active alerts: {active_count}")
        print(f"   - Inactive alerts: {inactive_count}")
    
    await engine.dispose()


if __name__ == "__main__":
    print("🧹 Starting duplicate alert cleanup...")
    print("=" * 60)
    asyncio.run(cleanup_duplicate_alerts())
    print("=" * 60)
    print("Done!")
