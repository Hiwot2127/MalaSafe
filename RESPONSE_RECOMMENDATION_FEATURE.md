# Response Recommendation Plan - Feature Documentation

## Overview

The Response Recommendation Plan transforms MalaSafe from a **prediction dashboard** into a **decision-support system** by automatically generating practical, rule-based response recommendations for malaria predictions.

---

## Key Characteristics

✅ **Rule-Based** - Deterministic logic, no AI agents or LLMs  
✅ **Transparent** - Every recommendation includes trigger reason  
✅ **Explainable** - Clear logic based on public health best practices  
✅ **Maintainable** - Simple Python rules, easy to update  
✅ **Public Health Oriented** - Based on WHO and Ethiopian MOH guidelines  

---

## Implementation Summary

### Backend (Python/FastAPI)

#### 1. Recommendation Service (`app/services/recommendation_service.py`)
- **RecommendationEngine** class with rule-based logic
- Generates recommendations based on:
  - Risk level (low, moderate, high, very_high)
  - Confidence score
  - Historical trends (rising, declining, stable)
  - Climate anomalies (rainfall, temperature)
  - Outbreak history

#### 2. Database Model (`app/models/response_recommendation.py`)
- **ResponseRecommendation** table with fields:
  - `id`, `prediction_id`, `district_id`
  - `risk_level`, `category`, `recommendation_text`
  - `priority`, `trigger_reason`, `created_at`
- 5 indexes for performance

#### 3. API Routes (`app/routes/recommendations.py`)
- `GET /recommendations/{prediction_id}` - Get recommendations for prediction
- `GET /recommendations/district/{district_id}` - Get district recommendations
- `POST /recommendations/generate/{prediction_id}` - Generate recommendations

#### 4. Database Migration (`alembic/versions/007_add_response_recommendations.py`)
- Creates `response_recommendations` table
- Adds indexes
- Includes rollback support

---

### Frontend (React/TypeScript)

#### 1. TypeScript Types (`src/types/recommendation.ts`)
- `Recommendation` interface
- `RecommendationListResponse` interface
- Priority and category enums
- Color mappings and icons

#### 2. Recommendation Panel (`src/components/recommendations/RecommendationPanel.tsx`)
- Main component for displaying recommendations
- Groups recommendations by category
- Shows priority badges
- Includes trigger reasons (expandable)
- Generate/regenerate functionality
- Loading and error states

#### 3. Recommendation Card (`src/components/recommendations/RecommendationCard.tsx`)
- Compact card for single recommendation
- Used in lists and grids
- Shows category icon and priority

---

## Recommendation Categories

1. **Prevention** 🛡️
   - Mosquito net distribution
   - Indoor residual spraying
   - Larviciding operations
   - Breeding site elimination

2. **Medical Preparedness** 💊
   - ACT medication positioning
   - RDT stock management
   - Mobile health teams
   - Treatment capacity

3. **Surveillance** 🔍
   - Case monitoring frequency
   - Active case detection
   - Data quality verification
   - Epidemiological review

4. **Community Awareness** 📢
   - Health education campaigns
   - Symptom awareness
   - Community mobilization

5. **Logistics** 📦
   - Supply chain management
   - Equipment availability
   - Neighboring district monitoring

6. **Escalation** 🚨
   - Regional notification
   - Rapid response team activation
   - National support requests

---

## Priority Levels

- **Low** (Gray) - Routine activities
- **Medium** (Blue) - Enhanced measures
- **High** (Orange) - Urgent actions
- **Critical** (Red) - Emergency response

---

## Rule Examples

### Risk-Based Rules

**LOW RISK:**
```python
- Continue routine surveillance
- Maintain mosquito net distribution
- Continue community education
```

**MODERATE RISK:**
```python
- Increase weekly monitoring frequency
- Intensify community awareness campaigns
- Review district testing capacity
- Conduct targeted indoor residual spraying
```

**HIGH RISK:**
```python
- Pre-position ACT medications
- Intensify active case detection
- Conduct emergency mosquito-control campaigns
- Ensure adequate supply of RDTs and ACTs
- Notify regional health bureau
```

**VERY HIGH RISK:**
```python
- Activate district rapid response team
- Request regional and national support
- Deploy mobile health teams
- Implement daily case reporting
- Execute emergency mass LLIN distribution
- Conduct emergency community mobilization
- Monitor neighboring districts
```

### Confidence-Based Rules

**Low Confidence (<0.5):**
```python
- Conduct manual epidemiological review
- Verify data quality and completeness
```

**Moderate Confidence (0.5-0.7):**
```python
- Increase monitoring frequency to validate prediction
```

### Trend-Based Rules

**Rising Trend (>20%):**
```python
- Investigate causes of rising trend
- Alert regional epidemiology team
```

**Rising Trend (>10%):**
```python
- Increase weekly case monitoring
```

### Climate-Based Rules

**High Rainfall Anomaly (>50% above normal):**
```python
- Intensify breeding site elimination
- Conduct larviciding operations
```

**Moderate Rainfall Anomaly (>25%):**
```python
- Increase vector-control operations
```

**Temperature Anomaly (>2°C):**
```python
- Monitor for accelerated parasite development
```

### Outbreak History Rules

**Recent Outbreak (<6 months):**
```python
- Maintain heightened surveillance
- Ensure treatment protocols followed
```

---

## API Usage Examples

### Get Recommendations for Prediction

```bash
GET /api/v1/recommendations/{prediction_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "recommendations": [
    {
      "id": "uuid",
      "prediction_id": "uuid",
      "district_id": "uuid",
      "risk_level": "high",
      "category": "Medical Preparedness",
      "recommendation_text": "Pre-position ACT medications",
      "priority": "high",
      "trigger_reason": "Risk level is HIGH with 250 predicted cases",
      "created_at": "2026-05-28T10:00:00Z"
    }
  ],
  "total": 12,
  "prediction_info": {
    "risk_level": "high",
    "confidence_score": 0.85,
    "prediction_score": 250.5,
    "prediction_date": "2026-06-01",
    "district_name": "Addis Ababa",
    "district_code": "ET010101"
  }
}
```

### Generate Recommendations

```bash
POST /api/v1/recommendations/generate/{prediction_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "prediction_id": "uuid",
  "recommendations_count": 12,
  "message": "Successfully generated 12 recommendations"
}
```

---

## UI Integration

### Prediction Detail Page

Add the RecommendationPanel component to the prediction detail page:

```tsx
import RecommendationPanel from '@/components/recommendations/RecommendationPanel';

function PredictionDetailPage({ predictionId }) {
  return (
    <div className="space-y-6">
      {/* Existing prediction details */}
      <PredictionDetails prediction={prediction} />
      
      {/* SHAP Explanation */}
      <ShapExplanation prediction={prediction} />
      
      {/* NEW: Response Recommendations */}
      <RecommendationPanel predictionId={predictionId} />
    </div>
  );
}
```

### Dashboard Widget (Optional)

Show recent high-priority recommendations:

```tsx
import RecommendationCard from '@/components/recommendations/RecommendationCard';

function DashboardRecommendations() {
  const { data } = useRecentRecommendations({ priority: 'high', limit: 5 });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data?.recommendations.map(rec => (
        <RecommendationCard key={rec.id} recommendation={rec} />
      ))}
    </div>
  );
}
```

---

## Database Schema

```sql
CREATE TABLE response_recommendations (
    id UUID PRIMARY KEY,
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    district_id UUID NOT NULL REFERENCES districts(id),
    risk_level VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    recommendation_text TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL,
    trigger_reason TEXT,
    created_at TIMESTAMP NOT NULL,
    
    -- Indexes
    INDEX idx_response_rec_prediction (prediction_id),
    INDEX idx_response_rec_district (district_id),
    INDEX idx_response_rec_priority (priority),
    INDEX idx_response_rec_category (category),
    INDEX idx_response_rec_created (created_at)
);
```

---

## Testing

### Backend Tests

```python
# Test recommendation generation
def test_generate_recommendations_high_risk():
    prediction = create_prediction(risk_level="high", confidence=0.85)
    recommendations = RecommendationEngine.generate_recommendations(
        db, prediction, district
    )
    
    assert len(recommendations) > 0
    assert any(r.priority == "high" for r in recommendations)
    assert any(r.category == "Medical Preparedness" for r in recommendations)

# Test API endpoint
async def test_get_recommendations_endpoint(client, auth_token):
    response = await client.get(
        f"/api/v1/recommendations/{prediction_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    assert "recommendations" in response.json()
```

### Frontend Tests

```typescript
// Test RecommendationPanel rendering
test('renders recommendations grouped by category', () => {
  render(<RecommendationPanel predictionId="test-id" />);
  
  expect(screen.getByText('Prevention')).toBeInTheDocument();
  expect(screen.getByText('Medical Preparedness')).toBeInTheDocument();
});

// Test priority badges
test('displays correct priority badge colors', () => {
  const recommendation = {
    priority: 'high',
    // ... other fields
  };
  
  render(<RecommendationCard recommendation={recommendation} />);
  
  const badge = screen.getByText('High');
  expect(badge).toHaveClass('bg-orange-100');
});
```

---

## Deployment Checklist

- [ ] Run database migration: `alembic upgrade head`
- [ ] Verify new table created: `response_recommendations`
- [ ] Test API endpoints with Swagger UI
- [ ] Deploy frontend with new components
- [ ] Generate recommendations for existing predictions
- [ ] Monitor performance (recommendation generation time)
- [ ] Verify RBAC (only admin/MOH/EPHI can generate)

---

## Performance Considerations

1. **Caching**: Recommendations are stored in database, not regenerated on every view
2. **Indexes**: 5 indexes for fast queries
3. **Pagination**: District endpoint supports limit parameter
4. **Lazy Loading**: Frontend loads recommendations on demand
5. **Background Generation**: Can be integrated with Celery for batch generation

---

## Future Enhancements (Optional)

1. **Recommendation Templates**: Allow admins to customize recommendation text
2. **Action Tracking**: Track which recommendations were implemented
3. **Effectiveness Metrics**: Measure impact of recommendations
4. **Multi-Language**: Translate recommendations to Amharic, Oromo, etc.
5. **PDF Export**: Include recommendations in district reports
6. **Email Notifications**: Send high-priority recommendations via email

---

## Maintenance

### Adding New Rules

To add a new recommendation rule, edit `recommendation_service.py`:

```python
@staticmethod
def _apply_custom_rules(context: Dict[str, Any]) -> List[RecommendationRule]:
    """Apply custom rules"""
    rules = []
    
    if context.get("custom_condition"):
        rules.append(RecommendationRule(
            category=RecommendationEngine.PREVENTION,
            text="Your custom recommendation text",
            priority=RecommendationEngine.MEDIUM,
            trigger_reason="Explanation of why this was triggered"
        ))
    
    return rules
```

### Updating Categories

To add a new category:

1. Update `RecommendationEngine` class constants
2. Update `RecommendationCategory` type in TypeScript
3. Add icon to `CATEGORY_ICONS` mapping
4. Update documentation

---

## Academic Value

This feature demonstrates:

1. **Software Engineering**: Clean architecture, separation of concerns
2. **Domain Knowledge**: Public health best practices
3. **Rule-Based Systems**: Deterministic decision-making
4. **API Design**: RESTful endpoints with proper RBAC
5. **Frontend Development**: React components with TypeScript
6. **Database Design**: Proper schema with indexes
7. **Testing**: Unit and integration tests
8. **Documentation**: Comprehensive technical documentation

---

## Presentation Points

1. **Problem**: Predictions alone don't tell health workers what to do
2. **Solution**: Automatic, rule-based response recommendations
3. **Approach**: Transparent, explainable, maintainable rules
4. **Impact**: Transforms system from "what will happen" to "what should we do"
5. **Demo**: Show prediction → recommendations → trigger reasons
6. **Technical**: Clean code, proper architecture, comprehensive testing

---

## Summary

The Response Recommendation Plan feature:

✅ Generates practical, actionable recommendations  
✅ Based on public health best practices  
✅ Transparent and explainable (every recommendation has a reason)  
✅ Rule-based (no AI agents or LLMs)  
✅ Well-integrated with existing prediction system  
✅ Production-ready with proper testing  
✅ Excellent demo value for final presentation  

**Status**: ✅ Implementation Complete

---

**Last Updated**: May 28, 2026  
**Feature Version**: 1.0
