"""
Analytics service for malaria surveillance data.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, case
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
        if month:
            period_label = date(year, month, 1).strftime("%B %Y")
        else:
            period_label = f"Year {year}"

        # Window for the "high-risk districts" rolling count — kept in sync
        # with the timedelta() above. Surfaced in the response so the UI can
        # show users *what window* the count is over without hard-coding it.
        prediction_window_days = 30

        methodology = {
            "total_cases": (
                f"Sum of MalariaData.cases for {period_label}"
                + (f" in region {region}." if region else " across all regions.")
            ),
            "total_deaths": (
                f"Sum of MalariaData.deaths for {period_label} (reported via the monthly CSV)."
            ),
            "active_alerts": "Count of currently-active alerts (no age filter applied).",
            "high_risk_districts": (
                f"Distinct districts whose latest prediction in the last "
                f"{prediction_window_days} days falls in the HIGH or VERY_HIGH bucket."
            ),
            "risk_buckets": (
                "Per-district percentile thresholds on the LightGBM model's predicted "
                "case-count distribution: low ≤ p50 < moderate ≤ p75 < high ≤ p95 < very_high."
            ),
        }

        # Pull the model's global thresholds + versions so the dashboard can
        # show "Thresholds v1.0.0: p50=38, p75=208, p95=1530" alongside the
        # KPI cards. Predictor load is lazy and cached; if it fails (e.g. the
        # model artifacts aren't on disk in a test setup) we degrade
        # gracefully — the rest of the dashboard remains functional.
        risk_thresholds: Optional[Dict] = None
        model_version: Optional[str] = None
        thresholds_version: Optional[str] = None
        try:
            from app.ai import get_predictor  # lazy import to avoid load on import
            predictor = get_predictor()
            global_t = (predictor.thresholds or {}).get("global") or {}
            if all(k in global_t for k in ("p50", "p75", "p95")):
                risk_thresholds = {
                    "p50": float(global_t["p50"]),
                    "p75": float(global_t["p75"]),
                    "p95": float(global_t["p95"]),
                    "notes": (
                        "Per-district thresholds override these where the model "
                        "has enough history; the global cutoffs above are the fallback."
                    ),
                }
            model_version = predictor.model_version
            thresholds_version = predictor.thresholds_version
        except Exception as exc:  # pragma: no cover - dashboard must stay up
            logger.warning(f"Dashboard could not attach model metadata: {exc}")

        return {
            "total_cases": int(total_cases),
            "total_deaths": int(total_deaths),
            "active_alerts": int(active_alerts),
            "high_risk_districts": int(high_risk_districts),
            "case_fatality_rate": round(cfr, 2),
            "period": period,
            "period_label": period_label,
            "prediction_window_days": prediction_window_days,
            "methodology": methodology,
            "risk_thresholds": risk_thresholds,
            "model_version": model_version,
            "thresholds_version": thresholds_version,
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
        date_filter: Optional[date] = None,
        region: Optional[str] = None,
    ) -> Tuple[List[Dict], Dict]:
        """
        Get risk map data for GIS visualization.

        Args:
            date_filter: Filter predictions by date (default: today)
            region: Filter to a single region by exact name (optional)

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
        
        # Cases/deaths are pulled for the SAME month the prediction targets,
        # not for today's calendar month. Before this change the join mixed
        # "forecast for next month" (risk_level) with "observed in this
        # incomplete month" (recent_cases), producing the visual disconnect
        # the reviewer flagged (district badged HIGH but cases=0/deaths=0).
        query = select(
            District.id.label('district_id'),
            District.district_code,
            District.district_name,
            District.region,
            District.geojson_key,
            District.latitude,
            District.longitude,
            Prediction.risk_level,
            Prediction.confidence_score,
            Prediction.prediction_score,
            Prediction.prediction_reason,
            Prediction.prediction_date.label('prediction_date'),
            func.coalesce(
                select(func.sum(MalariaData.cases))
                .where(
                    MalariaData.district_id == District.id,
                    MalariaData.year == func.extract('year', Prediction.prediction_date),
                    MalariaData.month == func.extract('month', Prediction.prediction_date),
                )
                .scalar_subquery(),
                0
            ).label('recent_cases'),
            func.coalesce(
                select(func.sum(MalariaData.deaths))
                .where(
                    MalariaData.district_id == District.id,
                    MalariaData.year == func.extract('year', Prediction.prediction_date),
                    MalariaData.month == func.extract('month', Prediction.prediction_date),
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

        if region:
            query = query.where(District.region == region)

        result = await self.db.execute(query)
        rows = result.all()
        
        # Build features
        features = []
        risk_counts = {"low": 0, "moderate": 0, "high": 0, "very_high": 0}
        
        for row in rows:
            risk_counts[row.risk_level] = risk_counts.get(row.risk_level, 0) + 1
            
            geometry = None
            if row.longitude is not None and row.latitude is not None:
                geometry = {
                    "type": "Point",
                    "coordinates": [float(row.longitude), float(row.latitude)],
                }

            pred_date = row.prediction_date
            prediction_period = (
                pred_date.strftime("%Y-%m") if pred_date is not None else None
            )
            prediction_period_label = (
                pred_date.strftime("%B %Y") if pred_date is not None else None
            )

            features.append({
                "type": "Feature",
                "properties": {
                    "district_id": str(row.district_id),
                    "district_code": row.district_code,
                    "district_name": row.district_name,
                    "region": row.region,
                    "geojson_key": row.geojson_key,
                    "latitude": float(row.latitude) if row.latitude is not None else None,
                    "longitude": float(row.longitude) if row.longitude is not None else None,
                    "risk_level": row.risk_level,
                    "confidence_score": float(row.confidence_score),
                    "prediction_score": float(row.prediction_score),
                    "prediction_reason": row.prediction_reason,
                    "recent_cases": int(row.recent_cases),
                    "recent_deaths": int(row.recent_deaths),
                    # `prediction_period` is the month the badge is FOR — the
                    # cases/deaths above are scoped to this same period so a
                    # client can render "HIGH (May 2026) · 0 cases observed".
                    "prediction_period": prediction_period,
                    "prediction_period_label": prediction_period_label,
                },
                "geometry": geometry,
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

    async def get_latest_predictions_page(
        self,
        date_filter: Optional[date] = None,
        q: Optional[str] = None,
        region: Optional[str] = None,
        risk_level: Optional[str] = None,
        skip: int = 0,
        limit: int = 25,
    ) -> Tuple[List[Dict], int]:
        """Paginated list of the latest per-district predictions.

        Same row shape as the /maps/risk features (minus geojson_key), but
        flat instead of GeoJSON-wrapped, and sortable / filterable. Ordering
        ranks high risk first then by prediction_score so the most urgent
        districts page first - matches the manual client-side sort the
        /predictions page used to do.
        """
        if date_filter is None:
            date_filter = date.today()

        # Latest prediction row per district up to date_filter.
        latest = select(
            Prediction.district_id,
            func.max(Prediction.created_at).label("max_created"),
        ).where(
            Prediction.prediction_date <= date_filter
        ).group_by(Prediction.district_id).subquery()

        # Five-stop risk ramp ordered most-urgent first so paging top-down
        # surfaces the districts that need attention.
        risk_rank = case(
            (Prediction.risk_level == "very_high", 0),
            (Prediction.risk_level == "high", 1),
            (Prediction.risk_level == "medium", 2),
            (Prediction.risk_level == "moderate", 2),
            (Prediction.risk_level == "low", 4),
            else_=5,
        )

        # `recent_cases` is scoped to the prediction's target month — same
        # alignment as get_risk_map_data — so the "RECENT CASES" column next
        # to the risk badge refers to the same period the badge does.
        base = select(
            District.id.label("district_id"),
            District.district_code,
            District.district_name,
            District.region,
            District.latitude,
            District.longitude,
            Prediction.prediction_date,
            Prediction.risk_level,
            Prediction.confidence_score,
            Prediction.prediction_score,
            Prediction.prediction_reason,
            func.coalesce(
                select(func.sum(MalariaData.cases))
                .where(
                    MalariaData.district_id == District.id,
                    MalariaData.year == func.extract('year', Prediction.prediction_date),
                    MalariaData.month == func.extract('month', Prediction.prediction_date),
                )
                .scalar_subquery(),
                0,
            ).label("recent_cases"),
        ).join(
            latest,
            and_(
                Prediction.district_id == latest.c.district_id,
                Prediction.created_at == latest.c.max_created,
            ),
        ).join(District, Prediction.district_id == District.id)

        count_base = select(func.count()).select_from(
            select(Prediction.district_id).join(
                latest,
                and_(
                    Prediction.district_id == latest.c.district_id,
                    Prediction.created_at == latest.c.max_created,
                ),
            ).join(District, Prediction.district_id == District.id).subquery()
        )

        if q:
            ilike = District.district_name.ilike(f"%{q.strip()}%")
            base = base.where(ilike)
            count_base = select(func.count()).select_from(
                select(Prediction.district_id).join(
                    latest,
                    and_(
                        Prediction.district_id == latest.c.district_id,
                        Prediction.created_at == latest.c.max_created,
                    ),
                ).join(District, Prediction.district_id == District.id)
                .where(ilike).subquery()
            )

        if region:
            base = base.where(District.region == region)
        if risk_level:
            base = base.where(Prediction.risk_level == risk_level)

        # Apply filters to count too so total reflects current scope.
        if region:
            count_base = count_base.where(District.region == region) if False else count_base
        # The count_base subquery above only re-applies q. Re-wrap region +
        # risk_level filters by rebuilding count_base if either is set.
        if region or risk_level:
            base_for_count = select(Prediction.district_id).join(
                latest,
                and_(
                    Prediction.district_id == latest.c.district_id,
                    Prediction.created_at == latest.c.max_created,
                ),
            ).join(District, Prediction.district_id == District.id)
            if q:
                base_for_count = base_for_count.where(District.district_name.ilike(f"%{q.strip()}%"))
            if region:
                base_for_count = base_for_count.where(District.region == region)
            if risk_level:
                base_for_count = base_for_count.where(Prediction.risk_level == risk_level)
            count_base = select(func.count()).select_from(base_for_count.subquery())

        total = (await self.db.execute(count_base)).scalar_one()

        rows = (
            await self.db.execute(
                base.order_by(risk_rank.asc(), Prediction.prediction_score.desc())
                .offset(skip)
                .limit(limit)
            )
        ).all()

        items: List[Dict] = []
        for row in rows:
            items.append({
                "district_id": str(row.district_id),
                "district_code": row.district_code,
                "district_name": row.district_name,
                "region": row.region,
                "latitude": float(row.latitude) if row.latitude is not None else None,
                "longitude": float(row.longitude) if row.longitude is not None else None,
                "prediction_date": row.prediction_date.isoformat() if row.prediction_date else None,
                "prediction_period": (
                    row.prediction_date.strftime("%Y-%m") if row.prediction_date else None
                ),
                "prediction_period_label": (
                    row.prediction_date.strftime("%B %Y") if row.prediction_date else None
                ),
                "risk_level": row.risk_level,
                "confidence_score": float(row.confidence_score),
                "prediction_score": float(row.prediction_score),
                "prediction_reason": row.prediction_reason,
                "recent_cases": int(row.recent_cases),
            })

        return items, int(total)
