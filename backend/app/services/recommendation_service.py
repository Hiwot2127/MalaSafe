"""
Response Recommendation Service
Rule-based recommendation engine for malaria response planning
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prediction import Prediction
from app.models.malaria_data import MalariaData
from app.models.climate_data import ClimateData
from app.models.district import District


class RecommendationRule:
    """Single recommendation rule"""
    def __init__(
        self,
        category: str,
        text: str,
        priority: str,
        trigger_reason: str
    ):
        self.category = category
        self.text = text
        self.priority = priority
        self.trigger_reason = trigger_reason


class RecommendationEngine:
    """Rule-based recommendation engine for malaria response"""
    
    # Recommendation categories
    PREVENTION = "Prevention"
    MEDICAL = "Medical Preparedness"
    SURVEILLANCE = "Surveillance"
    COMMUNITY = "Community Awareness"
    LOGISTICS = "Logistics"
    ESCALATION = "Escalation"
    
    # Priority levels
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    
    @staticmethod
    async def generate_recommendations(
        db: AsyncSession,
        prediction: Prediction,
        district: District
    ) -> List[RecommendationRule]:
        """
        Generate recommendations based on prediction and district context
        
        Args:
            db: Database session
            prediction: Prediction object
            district: District object
            
        Returns:
            List of RecommendationRule objects
        """
        recommendations = []
        
        # Extract prediction attributes
        risk_level = prediction.risk_level
        confidence = prediction.confidence_score
        predicted_cases = prediction.prediction_score
        
        # Get historical context
        historical_context = await RecommendationEngine._get_historical_context(
            db, district.id, prediction.prediction_date
        )
        
        # Get climate context
        climate_context = await RecommendationEngine._get_climate_context(
            db, district.id, prediction.prediction_date
        )
        
        # Apply risk-based rules
        recommendations.extend(
            RecommendationEngine._apply_risk_rules(risk_level, predicted_cases)
        )
        
        # Apply confidence-based rules
        recommendations.extend(
            RecommendationEngine._apply_confidence_rules(confidence)
        )
        
        # Apply trend-based rules
        recommendations.extend(
            RecommendationEngine._apply_trend_rules(historical_context)
        )
        
        # Apply climate-based rules
        recommendations.extend(
            RecommendationEngine._apply_climate_rules(climate_context)
        )
        
        # Apply outbreak history rules
        recommendations.extend(
            RecommendationEngine._apply_outbreak_rules(historical_context)
        )
        
        return recommendations
    
    @staticmethod
    def _apply_risk_rules(risk_level: str, predicted_cases: float) -> List[RecommendationRule]:
        """Apply rules based on risk level"""
        rules = []
        
        if risk_level == "low":
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Continue routine malaria surveillance activities",
                priority=RecommendationEngine.LOW,
                trigger_reason=f"Risk level is LOW with {predicted_cases:.0f} predicted cases"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.PREVENTION,
                text="Maintain mosquito net distribution programs",
                priority=RecommendationEngine.LOW,
                trigger_reason="Baseline prevention measures for low-risk period"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.COMMUNITY,
                text="Continue community education on malaria prevention",
                priority=RecommendationEngine.LOW,
                trigger_reason="Ongoing awareness during low-risk period"
            ))
        
        elif risk_level == "moderate":
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Increase weekly monitoring and case reporting frequency",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason=f"Risk level is MODERATE with {predicted_cases:.0f} predicted cases"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.COMMUNITY,
                text="Intensify community awareness campaigns on malaria symptoms",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason="Moderate risk requires enhanced community engagement"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.MEDICAL,
                text="Review district testing capacity and RDT stock levels",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason="Ensure diagnostic readiness for moderate risk period"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.PREVENTION,
                text="Conduct targeted indoor residual spraying in high-risk kebeles",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason="Proactive vector control for moderate risk"
            ))
        
        elif risk_level == "high":
            rules.append(RecommendationRule(
                category=RecommendationEngine.MEDICAL,
                text="Pre-position ACT (Artemisinin-based Combination Therapy) medications",
                priority=RecommendationEngine.HIGH,
                trigger_reason=f"Risk level is HIGH with {predicted_cases:.0f} predicted cases"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Intensify active case detection and contact tracing",
                priority=RecommendationEngine.HIGH,
                trigger_reason="High risk requires enhanced surveillance"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.PREVENTION,
                text="Conduct emergency mosquito-control campaigns (IRS and larviciding)",
                priority=RecommendationEngine.HIGH,
                trigger_reason="Urgent vector control needed for high risk"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.LOGISTICS,
                text="Ensure adequate supply of RDTs, ACTs, and mosquito nets",
                priority=RecommendationEngine.HIGH,
                trigger_reason="High case load requires supply chain readiness"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.ESCALATION,
                text="Notify regional health bureau of elevated risk status",
                priority=RecommendationEngine.HIGH,
                trigger_reason="Regional coordination needed for high-risk district"
            ))
        
        elif risk_level == "very_high":
            rules.append(RecommendationRule(
                category=RecommendationEngine.ESCALATION,
                text="Activate district rapid response team immediately",
                priority=RecommendationEngine.CRITICAL,
                trigger_reason=f"Risk level is VERY HIGH with {predicted_cases:.0f} predicted cases"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.ESCALATION,
                text="Request regional and national support for outbreak response",
                priority=RecommendationEngine.CRITICAL,
                trigger_reason="Very high risk requires multi-level coordination"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.MEDICAL,
                text="Deploy mobile health teams to affected kebeles",
                priority=RecommendationEngine.CRITICAL,
                trigger_reason="Critical case load requires mobile response capacity"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Implement daily case reporting and real-time monitoring",
                priority=RecommendationEngine.CRITICAL,
                trigger_reason="Very high risk requires real-time surveillance"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.PREVENTION,
                text="Execute emergency mass distribution of LLINs (Long-Lasting Insecticidal Nets)",
                priority=RecommendationEngine.CRITICAL,
                trigger_reason="Urgent prevention measures for very high risk"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.COMMUNITY,
                text="Conduct emergency community mobilization and health education",
                priority=RecommendationEngine.CRITICAL,
                trigger_reason="Critical risk requires immediate community engagement"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.LOGISTICS,
                text="Monitor neighboring districts for potential spillover transmission",
                priority=RecommendationEngine.HIGH,
                trigger_reason="Very high risk in one district may affect neighbors"
            ))
        
        return rules
    
    @staticmethod
    def _apply_confidence_rules(confidence: float) -> List[RecommendationRule]:
        """Apply rules based on prediction confidence"""
        rules = []
        
        if confidence < 0.5:
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Conduct manual epidemiological review and field verification",
                priority=RecommendationEngine.HIGH,
                trigger_reason=f"Low prediction confidence ({confidence:.2f}) requires expert validation"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Verify data quality and completeness for this district",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason="Low confidence may indicate data quality issues"
            ))
        elif confidence < 0.7:
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Increase monitoring frequency to validate prediction accuracy",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason=f"Moderate confidence ({confidence:.2f}) warrants closer monitoring"
            ))
        
        return rules
    
    @staticmethod
    def _apply_trend_rules(historical_context: Dict[str, Any]) -> List[RecommendationRule]:
        """Apply rules based on historical trends"""
        rules = []
        
        trend = historical_context.get("trend", "stable")
        trend_percentage = historical_context.get("trend_percentage", 0)
        
        if trend == "rising" and trend_percentage > 20:
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Investigate causes of rising case trend (environmental, behavioral, or vector factors)",
                priority=RecommendationEngine.HIGH,
                trigger_reason=f"Cases rising by {trend_percentage:.1f}% - requires investigation"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.ESCALATION,
                text="Alert regional epidemiology team of upward trend",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason="Significant upward trend requires regional awareness"
            ))
        elif trend == "rising" and trend_percentage > 10:
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Increase weekly case monitoring to track trend progression",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason=f"Cases rising by {trend_percentage:.1f}% - monitor closely"
            ))
        
        if trend == "declining" and trend_percentage < -20:
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Maintain current interventions - declining trend observed",
                priority=RecommendationEngine.LOW,
                trigger_reason=f"Cases declining by {abs(trend_percentage):.1f}% - positive trend"
            ))
        
        return rules
    
    @staticmethod
    def _apply_climate_rules(climate_context: Dict[str, Any]) -> List[RecommendationRule]:
        """Apply rules based on climate conditions"""
        rules = []
        
        rainfall_anomaly = climate_context.get("rainfall_anomaly", 0)
        temperature_anomaly = climate_context.get("temperature_anomaly", 0)
        
        if rainfall_anomaly > 50:  # 50% above normal
            rules.append(RecommendationRule(
                category=RecommendationEngine.PREVENTION,
                text="Intensify mosquito breeding site elimination (standing water removal)",
                priority=RecommendationEngine.HIGH,
                trigger_reason=f"Rainfall {rainfall_anomaly:.0f}% above seasonal baseline - increased breeding sites"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.PREVENTION,
                text="Conduct larviciding operations in water collection areas",
                priority=RecommendationEngine.HIGH,
                trigger_reason="Heavy rainfall creates favorable mosquito breeding conditions"
            ))
        elif rainfall_anomaly > 25:
            rules.append(RecommendationRule(
                category=RecommendationEngine.PREVENTION,
                text="Increase vector-control operations due to above-normal rainfall",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason=f"Rainfall {rainfall_anomaly:.0f}% above normal - monitor breeding sites"
            ))
        
        if temperature_anomaly > 2:  # 2°C above normal
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Monitor for accelerated parasite development due to elevated temperatures",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason=f"Temperature {temperature_anomaly:.1f}°C above normal - affects transmission"
            ))
        
        return rules
    
    @staticmethod
    def _apply_outbreak_rules(historical_context: Dict[str, Any]) -> List[RecommendationRule]:
        """Apply rules based on outbreak history"""
        rules = []
        
        had_recent_outbreak = historical_context.get("had_recent_outbreak", False)
        months_since_outbreak = historical_context.get("months_since_outbreak", 999)
        
        if had_recent_outbreak and months_since_outbreak < 6:
            rules.append(RecommendationRule(
                category=RecommendationEngine.SURVEILLANCE,
                text="Maintain heightened surveillance - recent outbreak history",
                priority=RecommendationEngine.HIGH,
                trigger_reason=f"Outbreak occurred {months_since_outbreak} months ago - risk of recurrence"
            ))
            rules.append(RecommendationRule(
                category=RecommendationEngine.MEDICAL,
                text="Ensure treatment protocols are followed to prevent drug resistance",
                priority=RecommendationEngine.MEDIUM,
                trigger_reason="Post-outbreak period requires treatment quality assurance"
            ))
        
        return rules
    
    @staticmethod
    async def _get_historical_context(
        db: AsyncSession,
        district_id: str,
        prediction_date: datetime
    ) -> Dict[str, Any]:
        """Get historical context for the district with defensive error handling"""
        
        # Default safe values if data is unavailable
        default_context = {
            "trend": "stable",
            "trend_percentage": 0,
            "recent_cases": 0,
            "previous_cases": 0,
            "had_recent_outbreak": False,
            "months_since_outbreak": 999
        }
        
        try:
            # Get last 3 months of data
            three_months_ago = prediction_date - timedelta(days=90)
            six_months_ago = prediction_date - timedelta(days=180)
            
            # Recent cases (last 3 months)
            recent_result = await db.execute(
                select(func.sum(MalariaData.positive_cases))
                .where(
                    and_(
                        MalariaData.district_id == district_id,
                        MalariaData.date >= three_months_ago,
                        MalariaData.date < prediction_date
                    )
                )
            )
            recent_cases = int(recent_result.scalar() or 0)
            
            # Previous period cases (3-6 months ago)
            previous_result = await db.execute(
                select(func.sum(MalariaData.positive_cases))
                .where(
                    and_(
                        MalariaData.district_id == district_id,
                        MalariaData.date >= six_months_ago,
                        MalariaData.date < three_months_ago
                    )
                )
            )
            previous_cases = int(previous_result.scalar() or 0)
            
            # Calculate trend with safe division
            trend = "stable"
            trend_percentage = 0
            if previous_cases > 0:
                trend_percentage = ((recent_cases - previous_cases) / previous_cases) * 100
                if trend_percentage > 10:
                    trend = "rising"
                elif trend_percentage < -10:
                    trend = "declining"
            
            # Check for recent outbreak (>200 cases in a month in last 6 months)
            outbreak_result = await db.execute(
                select(
                    func.max(MalariaData.positive_cases),
                    func.max(MalariaData.date)
                )
                .where(
                    and_(
                        MalariaData.district_id == district_id,
                        MalariaData.date >= six_months_ago,
                        MalariaData.date < prediction_date
                    )
                )
            )
            outbreak_data = outbreak_result.first()
            max_cases = int(outbreak_data[0]) if outbreak_data and outbreak_data[0] else 0
            max_date = outbreak_data[1] if outbreak_data and len(outbreak_data) > 1 else None
            
            had_recent_outbreak = max_cases > 200
            months_since_outbreak = 999
            if had_recent_outbreak and max_date:
                months_since_outbreak = max((prediction_date - max_date).days // 30, 0)
            
            return {
                "trend": trend,
                "trend_percentage": trend_percentage,
                "recent_cases": recent_cases,
                "previous_cases": previous_cases,
                "had_recent_outbreak": had_recent_outbreak,
                "months_since_outbreak": months_since_outbreak
            }
            
        except Exception as e:
            import logging
            logging.getLogger("recommendation_service").error(
                f"Failed to fetch historical context for district {district_id}: {e}"
            )
            return default_context
    
    @staticmethod
    async def _get_climate_context(
        db: AsyncSession,
        district_id: str,
        prediction_date: datetime
    ) -> Dict[str, Any]:
        """Get climate context for the district with defensive error handling"""
        
        # Default safe values if data is unavailable
        default_context = {
            "rainfall_anomaly": 0,
            "temperature_anomaly": 0,
            "recent_rainfall": 0,
            "recent_temperature": 0
        }
        
        try:
            # Get recent climate data (last month)
            one_month_ago = prediction_date - timedelta(days=30)
            
            recent_climate_result = await db.execute(
                select(
                    func.avg(ClimateData.rainfall),
                    func.avg(ClimateData.temperature)
                )
                .where(
                    and_(
                        ClimateData.district_id == district_id,
                        ClimateData.date >= one_month_ago,
                        ClimateData.date < prediction_date
                    )
                )
            )
            recent_climate = recent_climate_result.first()
            
            # Validate data exists and is not None
            if not recent_climate or (recent_climate[0] is None and recent_climate[1] is None):
                import logging
                logging.getLogger("recommendation_service").warning(
                    f"No climate data found for district {district_id} - using defaults"
                )
                return default_context
            
            recent_rainfall = float(recent_climate[0]) if recent_climate[0] is not None else 0
            recent_temp = float(recent_climate[1]) if recent_climate[1] is not None else 0
            
            # Get historical baseline (same month, previous years)
            # Simplified: use fixed baselines for demo
            baseline_rainfall = 100  # mm
            baseline_temp = 25  # °C
            
            # Calculate anomalies with safe division
            rainfall_anomaly = 0
            if baseline_rainfall > 0 and recent_rainfall > 0:
                rainfall_anomaly = ((recent_rainfall - baseline_rainfall) / baseline_rainfall * 100)
            
            temperature_anomaly = recent_temp - baseline_temp
            
            return {
                "rainfall_anomaly": rainfall_anomaly,
                "temperature_anomaly": temperature_anomaly,
                "recent_rainfall": recent_rainfall,
                "recent_temperature": recent_temp
            }
            
        except Exception as e:
            import logging
            logging.getLogger("recommendation_service").error(
                f"Failed to fetch climate context for district {district_id}: {e}"
            )
            return default_context
