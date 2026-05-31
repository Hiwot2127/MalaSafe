"""
Response Recommendations Routes
API endpoints for malaria response recommendations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from uuid import UUID

from app.database.base import get_db
from app.models.user import User, UserRole
from app.models.prediction import Prediction
from app.models.district import District
from app.models.response_recommendation import ResponseRecommendation
from app.utils.dependencies import get_current_user
from app.services.recommendation_service import RecommendationEngine
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


# Pydantic schemas
class RecommendationResponse(BaseModel):
    """Response schema for a single recommendation"""
    id: str
    prediction_id: str
    district_id: str
    risk_level: str
    category: str
    recommendation_text: str
    priority: str
    trigger_reason: str | None
    created_at: str
    
    class Config:
        from_attributes = True


class RecommendationListResponse(BaseModel):
    """Response schema for list of recommendations"""
    recommendations: List[RecommendationResponse]
    total: int
    prediction_info: dict | None = None


class GenerateRecommendationsRequest(BaseModel):
    """Request schema for generating recommendations"""
    force: bool = False  # Force regeneration even if recommendations exist


class GenerateRecommendationsResponse(BaseModel):
    """Response schema for generation result"""
    success: bool
    prediction_id: str
    recommendations_count: int
    message: str


@router.get("/{prediction_id}", response_model=RecommendationListResponse)
async def get_recommendations_for_prediction(
    prediction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all recommendations for a specific prediction
    
    - **prediction_id**: UUID of the prediction
    
    Returns list of recommendations with prediction context
    """
    
    # Get prediction
    prediction_result = await db.execute(
        select(Prediction).where(Prediction.id == prediction_id)
    )
    prediction = prediction_result.scalar_one_or_none()
    
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    # Get recommendations
    recommendations_result = await db.execute(
        select(ResponseRecommendation)
        .where(ResponseRecommendation.prediction_id == prediction_id)
        .order_by(
            ResponseRecommendation.priority.desc(),
            ResponseRecommendation.category
        )
    )
    recommendations = recommendations_result.scalars().all()
    
    # Get district info
    district_result = await db.execute(
        select(District).where(District.id == prediction.district_id)
    )
    district = district_result.scalar_one_or_none()
    
    return RecommendationListResponse(
        recommendations=[
            RecommendationResponse(
                id=str(rec.id),
                prediction_id=str(rec.prediction_id),
                district_id=str(rec.district_id),
                risk_level=rec.risk_level,
                category=rec.category,
                recommendation_text=rec.recommendation_text,
                priority=rec.priority,
                trigger_reason=rec.trigger_reason,
                created_at=rec.created_at.isoformat()
            )
            for rec in recommendations
        ],
        total=len(recommendations),
        prediction_info={
            "risk_level": prediction.risk_level,
            "confidence_score": prediction.confidence_score,
            "prediction_score": prediction.prediction_score,
            "prediction_date": prediction.prediction_date.isoformat(),
            "district_name": district.district_name if district else "Unknown",
            "district_code": district.adm3_pcode if district else None
        }
    )


@router.get("/district/{district_id}", response_model=RecommendationListResponse)
async def get_recommendations_for_district(
    district_id: UUID,
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent recommendations for a specific district
    
    - **district_id**: UUID of the district
    - **limit**: Maximum number of recommendations to return (default: 50, max: 100)
    
    Returns list of recent recommendations for the district
    """
    
    # Get district
    district_result = await db.execute(
        select(District).where(District.id == district_id)
    )
    district = district_result.scalar_one_or_none()
    
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    
    # Get recommendations
    recommendations_result = await db.execute(
        select(ResponseRecommendation)
        .where(ResponseRecommendation.district_id == district_id)
        .order_by(ResponseRecommendation.created_at.desc())
        .limit(limit)
    )
    recommendations = recommendations_result.scalars().all()
    
    return RecommendationListResponse(
        recommendations=[
            RecommendationResponse(
                id=str(rec.id),
                prediction_id=str(rec.prediction_id),
                district_id=str(rec.district_id),
                risk_level=rec.risk_level,
                category=rec.category,
                recommendation_text=rec.recommendation_text,
                priority=rec.priority,
                trigger_reason=rec.trigger_reason,
                created_at=rec.created_at.isoformat()
            )
            for rec in recommendations
        ],
        total=len(recommendations),
        prediction_info={
            "district_name": district.district_name,
            "district_code": district.adm3_pcode,
            "region": district.region
        }
    )


@router.post("/generate/{prediction_id}", response_model=GenerateRecommendationsResponse)
async def generate_recommendations(
    prediction_id: UUID,
    request: GenerateRecommendationsRequest = GenerateRecommendationsRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate response recommendations for a prediction
    
    - **prediction_id**: UUID of the prediction
    - **force**: Force regeneration even if recommendations exist
    
    Requires: admin, MOH, or EPHI role
    """
    
    # Check authorization
    if current_user.role not in (UserRole.ADMIN, UserRole.MOH_OFFICER, UserRole.EPHI_OFFICER):
        raise HTTPException(
            status_code=403,
            detail="Only admin, MOH, and EPHI users can generate recommendations"
        )
    
    # Get prediction
    prediction_result = await db.execute(
        select(Prediction).where(Prediction.id == prediction_id)
    )
    prediction = prediction_result.scalar_one_or_none()
    
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    # Get district
    district_result = await db.execute(
        select(District).where(District.id == prediction.district_id)
    )
    district = district_result.scalar_one_or_none()
    
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    
    # Check if recommendations already exist
    existing_result = await db.execute(
        select(ResponseRecommendation)
        .where(ResponseRecommendation.prediction_id == prediction_id)
    )
    existing_recommendations = existing_result.scalars().all()
    
    if existing_recommendations and not request.force:
        return GenerateRecommendationsResponse(
            success=True,
            prediction_id=str(prediction_id),
            recommendations_count=len(existing_recommendations),
            message="Recommendations already exist. Use force=true to regenerate."
        )
    
    # Delete existing recommendations if force=true
    if existing_recommendations and request.force:
        for rec in existing_recommendations:
            await db.delete(rec)
        await db.commit()
    
    # Generate recommendations
    recommendation_rules = await RecommendationEngine.generate_recommendations(
        db=db,
        prediction=prediction,
        district=district
    )
    
    # Save recommendations to database
    saved_recommendations = []
    for rule in recommendation_rules:
        recommendation = ResponseRecommendation(
            prediction_id=prediction.id,
            district_id=prediction.district_id,
            risk_level=prediction.risk_level,
            category=rule.category,
            recommendation_text=rule.text,
            priority=rule.priority,
            trigger_reason=rule.trigger_reason,
            created_at=datetime.utcnow()
        )
        db.add(recommendation)
        saved_recommendations.append(recommendation)
    
    await db.commit()
    
    return GenerateRecommendationsResponse(
        success=True,
        prediction_id=str(prediction_id),
        recommendations_count=len(saved_recommendations),
        message=f"Successfully generated {len(saved_recommendations)} recommendations"
    )
