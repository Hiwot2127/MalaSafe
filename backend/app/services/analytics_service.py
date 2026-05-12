"""
Analytics service for malaria surveillance data.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from app.models import MalariaData, District, Prediction, Alert, ClimateData
from typing import Dict, List, Optional, Tuple
from datetime import datetime, date, timedelta
from loguru import logger


class AnalyticsService:
    """Service for analytics and aggregations."""
    
    def __init__(self, db: AsyncSession):
        """
        Initialize analytics service.
        
        Args:
            db: Database session
        """
        self.db = db
    
    async def get_dashboard_stats(
        self, 
        year: Optional[int] = None, 
        month: Optional[int] = None,
        region: Optional[str] = None
    ) -> Dict:
        """
        Get dashboard statistics.
        
        Args:
            year: Filter by year (default: current year)
            month: Filter by month (optional)
            region: Filter by region (optional)
            
        Returns:
            Dictionary with dashboard statistics
        """
        if year is None:
            year = datetime.now().year
        
        # Build base query
        query = select(
            func.sum(MalariaData.cases).label('total_cases'),
            func.sum(MalariaData.deaths).label('total_deaths'),
            func.count(func.distinct(MalariaData.district_id)).label('districts_count')
        ).where(MalariaData.year == year)
        
        if month:
            query = query.where(MalariaData.month == month)
        
        if region:
            query = query.join(District).where(District.region == region)
        
        result = await self.db.execute(query)
        stats = result.first()
        
        total_cases = stats.total_cases or 0
        total_deaths = stats.total_deaths or 0
        
        # Calculate case fatality rate
        cfr = (total_deaths / total_cases * 100) if total_cases > 0 else 0.0
        
        # Get active alerts count
        alert_query = select(func.count(Alert.id)).where(Alert.is_active == True)
        if region:
            alert_query = alert_query.join(District).where(District.region == region)
        
        alert_result = await self.db.execute(alert_query)
        active_alerts = alert_result.scalar() or 0
        
        # Get high risk districts count
        high_risk_query = select(func.count(func.distinct(Prediction.district_id))).where(
            Prediction.risk_level.in_(['high', 'very_high']),
            Prediction.prediction_date >= date.today() - timedelta(days=30)
        )
        if region:
            high_risk_query = high_risk_query.join(District).where(District.region == region)
        
        high_risk_result = await self.db.execute(high_risk_query)
        high_risk_districts = high_risk_result.scalar() or 0
        
        period = f"{year}-{month:02d}" if month else str(year)
        
        return {
            "total_cases": int(total_cases),
            "total_deaths": int(total_deaths),
            "active_alerts": int(active_alerts),
            "high_risk_districts": int(high_risk_districts),
            "case_fatality_rate": round(cfr, 2),
            "period": period
        }
    
    async def get_region_stats(
        self, 
        year: Optional[int] = None, 
        month: Optional[int] = None
    ) -> List[Dict]:
        """
        Get statistics by region.
        
        Args:
            year: Filter by year (default: current year)
            month: Filter by month (optional)
            
        Returns:
            List of region statistics
        """
        if year is None:
            year = datetime.now().year
        
        # Build query
        query = select(
            District.region,
            func.sum(MalariaData.cases).label('total_cases'),
            func.sum(MalariaData.deaths).label('total_deaths'),
            func.count(func.distinct(District.id)).label('districts_count')
        ).join(
            MalariaData, District.id == MalariaData.district_id
        ).where(
            MalariaData.year == year
        ).group_by(
            District.region
        ).order_by(
            desc('total_cases')
        )
        
        if month:
            query = query.where(MalariaData.month == month)
        
        result = await self.db.execute(query)
        regions = result.all()
        
        # Get high risk counts per region
        region_stats = []
        for region_data in regions:
            # Get high risk count for this region
            high_risk_query = select(
                func.count(func.distinct(Prediction.district_id))
            ).join(
                District, Prediction.district_id == District.id
            ).where(
                District.region == region_data.region,
                Prediction.risk_level.in_(['high', 'very_high']),
                Prediction.prediction_date >= date.today() - timedelta(days=30)
            )
            
            high_risk_result = await self.db.execute(high_risk_query)
            high_risk_count = high_risk_result.scalar() or 0
            
            region_stats.append({
                "region": region_data.region,
                "total_cases": int(region_data.total_cases or 0),
                "total_deaths": int(region_data.total_deaths or 0),
                "districts_count": int(region_data.districts_count or 0),
                "high_risk_count": int(high_risk_count)
            })
        
        return region_stats
    
    async def get_trends(
        self,
        period_type: str = "monthly",
        year: Optional[int] = None,
        limit: int = 12,
        region: Optional[str] = None
    ) -> Tuple[str, List[Dict], int]:
        """
        Get trend data.
        
        Args:
            period_type: 'weekly' or 'monthly'
            year: Filter by year (default: current year)
            limit: Number of periods to return
            region: Filter by region (optional)
            
        Returns:
            Tuple of (period_type, data, total_periods)
        """
        if year is None:
            year = datetime.now().year
        
        if period_type == "weekly":
            # Weekly trends
            query = select(
                MalariaData.week,
                MalariaData.year,
                func.sum(MalariaData.cases).label('cases'),
                func.sum(MalariaData.deaths).label('deaths')
            ).where(
                MalariaData.week.isnot(None),
                MalariaData.year == year
            ).group_by(
                MalariaData.week,
                MalariaData.year
            ).order_by(
                MalariaData.year.desc(),
                MalariaData.week.desc()
            ).limit(limit)
            
            if region:
                query = query.join(District).where(District.region == region)
            
            result = await self.db.execute(query)
            rows = result.all()
            
            data = []
            for row in reversed(rows):  # Reverse to get chronological order
                cases = int(row.cases or 0)
                deaths = int(row.deaths or 0)
                cfr = (deaths / cases * 100) if cases > 0 else 0.0
                
                data.append({
                    "period": f"{row.year}-W{row.week:02d}",
                    "cases": cases,
                    "deaths": deaths,
                    "case_fatality_rate": round(cfr, 2)
                })
            
        else:  # monthly
            # Monthly trends
            query = select(
                MalariaData.month,
                MalariaData.year,
                func.sum(MalariaData.cases).label('cases'),
                func.sum(MalariaData.deaths).label('deaths')
            ).where(
                MalariaData.year == year
            ).group_by(
                MalariaData.month,
                MalariaData.year
            ).order_by(
                MalariaData.year.desc(),
                MalariaData.month.desc()
            ).limit(limit)
            
            if region:
                query = query.join(District).where(District.region == region)
            
            result = await self.db.execute(query)
            rows = result.all()
            
            data = []
            for row in reversed(rows):  # Reverse to get chronological order
                cases = int(row.cases or 0)
                deaths = int(row.deaths or 0)
                cfr = (deaths / cases * 100) if cases > 0 else 0.0
                
                data.append({
                    "period": f"{row.year}-{row.month:02d}",
                    "cases": cases,
                    "deaths": deaths,
                    "case_fatality_rate": round(cfr, 2)
                })
        
        return period_type, data, len(data)
    
    async def get_risk_map_data(
        self,
        date_filter: Optional[date] = None
    ) -> Tuple[List[Dict], Dict]:
        """
        Get risk map data for GIS visualization.
        
        Args:
            date_filter: Filter predictions by date (default: today)
            
        Returns:
            Tuple of (features, metadata)
        """
        if date_filter is None:
            date_filter = date.today()
        
        # Get latest prediction for each district
        subquery = select(
            Prediction.district_id,
            func.max(Prediction.created_at).label('max_created')
        ).where(
            Prediction.prediction_date <= date_filter
        ).group_by(
            Prediction.district_id
        ).subquery()
        
        query = select(
            District.district_code,
            District.district_name,
            District.region,
            District.geojson_key,
            Prediction.risk_level,
            Prediction.confidence_score,
            Prediction.prediction_score,
            Prediction.prediction_reason,
            func.coalesce(
                select(func.sum(MalariaData.cases))
                .where(
                    MalariaData.district_id == District.id,
                    MalariaData.year == date_filter.year,
                    MalariaData.month == date_filter.month
                )
                .scalar_subquery(),
                0
            ).label('recent_cases'),
            func.coalesce(
                select(func.sum(MalariaData.deaths))
                .where(
                    MalariaData.district_id == District.id,
                    MalariaData.year == date_filter.year,
                    MalariaData.month == date_filter.month
                )
                .scalar_subquery(),
                0
            ).label('recent_deaths')
        ).join(
            subquery,
            and_(
                Prediction.district_id == subquery.c.district_id,
                Prediction.created_at == subquery.c.max_created
            )
        ).join(
            District,
            Prediction.district_id == District.id
        ).order_by(
            District.region,
            District.district_name
        )
        
        result = await self.db.execute(query)
        rows = result.all()
        
        # Build features
        features = []
        risk_counts = {"low": 0, "moderate": 0, "high": 0, "very_high": 0}
        
        for row in rows:
            risk_counts[row.risk_level] = risk_counts.get(row.risk_level, 0) + 1
            
            features.append({
                "type": "Feature",
                "properties": {
                    "district_code": row.district_code,
                    "district_name": row.district_name,
                    "region": row.region,
                    "geojson_key": row.geojson_key,
                    "risk_level": row.risk_level,
                    "confidence_score": float(row.confidence_score),
                    "prediction_score": float(row.prediction_score),
                    "prediction_reason": row.prediction_reason,
                    "recent_cases": int(row.recent_cases),
                    "recent_deaths": int(row.recent_deaths)
                },
                "geometry": None  # GeoJSON geometry will be matched client-side using geojson_key
            })
        
        metadata = {
            "total_districts": len(features),
            "high_risk": risk_counts.get("high", 0) + risk_counts.get("very_high", 0),
            "moderate_risk": risk_counts.get("moderate", 0),
            "low_risk": risk_counts.get("low", 0),
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "date_filter": date_filter.isoformat()
        }
        
        return features, metadata
