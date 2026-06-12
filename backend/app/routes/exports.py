"""
Export Routes
PDF export endpoints for reports
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional
from datetime import datetime, timedelta

from app.database.base import get_db
from app.models.user import User
from app.models.district import District
from app.models.prediction import Prediction
from app.models.malaria_data import MalariaData
from app.utils.dependencies import get_current_user
from app.services.pdf_export_service import PDFExportService

router = APIRouter(prefix="/exports", tags=["exports"])


@router.post("/district-report/{district_id}")
async def export_district_report(
    district_id: UUID,
    months: int = 12,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export district prediction report as PDF
    
    - **district_id**: UUID of the district
    - **months**: Number of months to include (default: 12)
    """
    
    # Get district information
    district_result = await db.execute(
        select(District).where(District.id == district_id)
    )
    district = district_result.scalar_one_or_none()
    
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    
    district_data = {
        "name": district.district_name,
        "code": district.adm3_pcode or "N/A",
        "region": district.region or "N/A"
    }
    
    # Get predictions for the district
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    predictions_result = await db.execute(
        select(Prediction)
        .where(Prediction.district_id == district_id)
        .where(Prediction.created_at >= cutoff_date)
        .order_by(Prediction.prediction_date.desc())
        .limit(months)
    )
    predictions = predictions_result.scalars().all()
    
    predictions_data = [
        {
            "prediction_date": pred.prediction_date.isoformat(),
            "risk_level": pred.risk_level,
            "prediction_score": pred.prediction_score,
            "confidence_score": pred.confidence_score,
            "prediction_reason": pred.prediction_reason,
            "factors": pred.prediction_factors or [],
            "is_warm": not (pred.prediction_reason or "").lower().startswith("cold-start"),
        }
        for pred in predictions
    ]
    
    # Generate PDF
    pdf_buffer = PDFExportService.generate_district_prediction_report(
        district_data=district_data,
        predictions=predictions_data
    )
    
    # Return as streaming response
    filename = f"malasafe_district_{district.district_name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/analytics-summary")
async def export_analytics_summary(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export analytics summary report as PDF
    
    - **days**: Number of days to include in the report (default: 30)
    """
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Calculate cutoff year and month
    cutoff_year = cutoff_date.year
    cutoff_month = cutoff_date.month
    
    # Get summary statistics
    from sqlalchemy import func, or_, and_
    
    # Total positive cases (filter by year/month instead of date)
    total_positive_result = await db.execute(
        select(func.sum(MalariaData.positive))
        .where(
            or_(
                MalariaData.year > cutoff_year,
                and_(
                    MalariaData.year == cutoff_year,
                    MalariaData.month >= cutoff_month
                )
            )
        )
    )
    total_positive = total_positive_result.scalar() or 0
    
    # Total districts
    total_districts_result = await db.execute(
        select(func.count(func.distinct(District.id)))
    )
    total_districts = total_districts_result.scalar() or 0
    
    # High risk districts (from recent predictions)
    high_risk_result = await db.execute(
        select(func.count(func.distinct(Prediction.district_id)))
        .where(Prediction.created_at >= cutoff_date)
        .where(Prediction.risk_level.in_(["high", "very_high"]))
    )
    high_risk_districts = high_risk_result.scalar() or 0
    
    summary_data = {
        "total_positive": int(total_positive),
        "active_alerts": high_risk_districts,  # Simplified
        "high_risk_districts": high_risk_districts,
        "total_districts": total_districts,
        "period": f"Last {days} days"
    }
    
    # Get regional breakdown
    regional_result = await db.execute(
        select(
            District.region,
            func.sum(MalariaData.positive).label("total_cases"),
            func.count(func.distinct(MalariaData.district_id)).label("district_count")
        )
        .join(MalariaData, District.id == MalariaData.district_id)
        .where(
            or_(
                MalariaData.year > cutoff_year,
                and_(
                    MalariaData.year == cutoff_year,
                    MalariaData.month >= cutoff_month
                )
            )
        )
        .group_by(District.region)
        .order_by(func.sum(MalariaData.positive).desc())
    )
    
    regional_data = [
        {
            "region": row.region or "Unknown",
            "total_cases": int(row.total_cases or 0),
            "district_count": int(row.district_count or 0),
            "avg_cases": float(row.total_cases or 0) / float(row.district_count or 1)
        }
        for row in regional_result.all()
    ]
    
    # Get trends (monthly aggregation since we don't have a date field)
    from sqlalchemy import extract
    trends_result = await db.execute(
        select(
            MalariaData.year,
            MalariaData.month,
            func.sum(MalariaData.positive).label("total_cases")
        )
        .where(
            or_(
                MalariaData.year > cutoff_year,
                and_(
                    MalariaData.year == cutoff_year,
                    MalariaData.month >= cutoff_month
                )
            )
        )
        .group_by(MalariaData.year, MalariaData.month)
        .order_by(MalariaData.year.desc(), MalariaData.month.desc())
    )
    
    trends_list = trends_result.all()
    trends_data = []
    for i, row in enumerate(trends_list):
        current_cases = int(row.total_cases or 0)
        prev_cases = int(trends_list[i + 1].total_cases or 0) if i + 1 < len(trends_list) else current_cases
        change_pct = ((current_cases - prev_cases) / prev_cases * 100) if prev_cases > 0 else 0
        
        trends_data.append({
            "period": f"{row.year}-{row.month:02d}",
            "total_cases": current_cases,
            "change_percentage": change_pct
        })
    
    # Generate PDF
    pdf_buffer = PDFExportService.generate_analytics_summary(
        summary_data=summary_data,
        trends_data=trends_data,
        regional_data=regional_data
    )
    
    # Return as streaming response
    filename = f"malasafe_analytics_summary_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
