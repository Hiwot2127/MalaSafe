# Response Recommendation - Integration Guide

**Quick guide to integrate the Response Recommendation feature into your MalaSafe deployment**

---

## Step 1: Database Migration

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate  # Windows

# Run migration
alembic upgrade head

# Verify table created
psql -U postgres -d malasafe -c "\d response_recommendations"
```

**Expected output:**
```
Table "public.response_recommendations"
Column              | Type      | Nullable
--------------------+-----------+----------
id                  | uuid      | not null
prediction_id       | uuid      | not null
district_id         | uuid      | not null
risk_level          | varchar   | not null
category            | varchar   | not null
recommendation_text | text      | not null
priority            | varchar   | not null
trigger_reason      | text      |
created_at          | timestamp | not null
```

---

## Step 2: Test API Endpoints

### Start Backend

```bash
cd backend
uvicorn app.main:app --reload
```

### Test with Swagger UI

1. Open: http://localhost:8000/api/docs
2. Navigate to **Recommendations** section
3. Try endpoints:
   - `POST /api/v1/recommendations/generate/{prediction_id}`
   - `GET /api/v1/recommendations/{prediction_id}`

### Test with cURL

```bash
# Login first
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@malasafe.gov.et","password":"admin123"}' \
  | jq -r '.access_token')

# Generate recommendations
curl -X POST http://localhost:8000/api/v1/recommendations/generate/{prediction_id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'

# Get recommendations
curl http://localhost:8000/api/v1/recommendations/{prediction_id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Step 3: Frontend Integration

### Option A: Add to Prediction Detail Page

```tsx
// src/pages/PredictionDetail.tsx
import RecommendationPanel from '@/components/recommendations/RecommendationPanel';

function PredictionDetailPage() {
  const { predictionId } = useParams();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1>Prediction Details</h1>
      
      {/* Existing prediction details */}
      <PredictionInfo predictionId={predictionId} />
      
      {/* SHAP Explanation */}
      <ShapExplanation predictionId={predictionId} />
      
      {/* NEW: Response Recommendations */}
      <div className="mt-8">
        <RecommendationPanel predictionId={predictionId} />
      </div>
    </div>
  );
}
```

### Option B: Add to Dashboard (High-Priority Recommendations)

```tsx
// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import RecommendationCard from '@/components/recommendations/RecommendationCard';
import axios from 'axios';

function Dashboard() {
  const [recommendations, setRecommendations] = useState([]);
  
  useEffect(() => {
    // Fetch recent high-priority recommendations
    axios.get('/api/v1/recommendations/recent?priority=high&limit=5')
      .then(res => setRecommendations(res.data.recommendations));
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Existing dashboard content */}
      
      {/* High-Priority Recommendations Widget */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">High-Priority Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map(rec => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4: Generate Recommendations for Existing Predictions

### Manual Generation (via API)

```python
# scripts/generate_recommendations_batch.py
import asyncio
import sys
sys.path.append('.')

from sqlalchemy import select
from app.database.base import AsyncSessionLocal
from app.models.prediction import Prediction
from app.models.district import District
from app.services.recommendation_service import RecommendationEngine
from app.models.response_recommendation import ResponseRecommendation
from datetime import datetime

async def generate_all_recommendations():
    """Generate recommendations for all predictions"""
    async with AsyncSessionLocal() as db:
        # Get all predictions without recommendations
        result = await db.execute(
            select(Prediction)
            .outerjoin(ResponseRecommendation)
            .where(ResponseRecommendation.id.is_(None))
            .limit(100)  # Process in batches
        )
        predictions = result.scalars().all()
        
        print(f"Found {len(predictions)} predictions without recommendations")
        
        for i, prediction in enumerate(predictions, 1):
            print(f"Processing {i}/{len(predictions)}: {prediction.id}")
            
            # Get district
            district_result = await db.execute(
                select(District).where(District.id == prediction.district_id)
            )
            district = district_result.scalar_one_or_none()
            
            if not district:
                print(f"  Skipping - district not found")
                continue
            
            # Generate recommendations
            rules = await RecommendationEngine.generate_recommendations(
                db=db,
                prediction=prediction,
                district=district
            )
            
            # Save to database
            for rule in rules:
                rec = ResponseRecommendation(
                    prediction_id=prediction.id,
                    district_id=prediction.district_id,
                    risk_level=prediction.risk_level,
                    category=rule.category,
                    recommendation_text=rule.text,
                    priority=rule.priority,
                    trigger_reason=rule.trigger_reason,
                    created_at=datetime.utcnow()
                )
                db.add(rec)
            
            await db.commit()
            print(f"  Generated {len(rules)} recommendations")

if __name__ == "__main__":
    asyncio.run(generate_all_recommendations())
```

Run the script:
```bash
cd backend
python scripts/generate_recommendations_batch.py
```

---

## Step 5: Verify Integration

### Check Database

```sql
-- Count recommendations
SELECT COUNT(*) FROM response_recommendations;

-- Recommendations by priority
SELECT priority, COUNT(*) 
FROM response_recommendations 
GROUP BY priority 
ORDER BY 
  CASE priority 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    WHEN 'low' THEN 4 
  END;

-- Recommendations by category
SELECT category, COUNT(*) 
FROM response_recommendations 
GROUP BY category 
ORDER BY COUNT(*) DESC;

-- Recent recommendations
SELECT 
  rr.category,
  rr.priority,
  rr.recommendation_text,
  d.name as district_name,
  rr.created_at
FROM response_recommendations rr
JOIN districts d ON rr.district_id = d.id
ORDER BY rr.created_at DESC
LIMIT 10;
```

### Test Frontend

1. Start frontend: `npm run dev`
2. Navigate to a prediction detail page
3. Verify RecommendationPanel displays
4. Click "Generate Recommendations" if not present
5. Verify recommendations grouped by category
6. Verify priority badges display correctly
7. Expand "Why this recommendation?" to see trigger reasons

---

## Step 6: Performance Optimization (Optional)

### Add Caching

```python
# app/routes/recommendations.py
from app.cache.decorators import cached

@router.get("/{prediction_id}", response_model=RecommendationListResponse)
@cached(ttl=300)  # Cache for 5 minutes
async def get_recommendations_for_prediction(...):
    # ... existing code
```

### Add Background Generation

```python
# app/tasks/recommendation_tasks.py
from celery import shared_task
from app.services.recommendation_service import RecommendationEngine

@shared_task
def generate_recommendations_task(prediction_id: str):
    """Generate recommendations in background"""
    # ... implementation
```

---

## Step 7: Testing

### Backend Tests

```python
# tests/test_recommendations.py
import pytest
from app.services.recommendation_service import RecommendationEngine

@pytest.mark.asyncio
async def test_generate_recommendations_high_risk(db_session):
    """Test recommendation generation for high risk"""
    prediction = create_test_prediction(risk_level="high")
    district = create_test_district()
    
    rules = await RecommendationEngine.generate_recommendations(
        db=db_session,
        prediction=prediction,
        district=district
    )
    
    assert len(rules) > 0
    assert any(r.priority == "high" for r in rules)
    assert any("ACT" in r.text for r in rules)

@pytest.mark.asyncio
async def test_recommendations_api_endpoint(client, auth_headers):
    """Test GET recommendations endpoint"""
    response = await client.get(
        f"/api/v1/recommendations/{prediction_id}",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert data["total"] > 0
```

Run tests:
```bash
cd backend
pytest tests/test_recommendations.py -v
```

### Frontend Tests

```typescript
// tests/RecommendationPanel.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import RecommendationPanel from '@/components/recommendations/RecommendationPanel';

test('renders recommendations grouped by category', async () => {
  render(<RecommendationPanel predictionId="test-id" />);
  
  await waitFor(() => {
    expect(screen.getByText('Prevention')).toBeInTheDocument();
    expect(screen.getByText('Medical Preparedness')).toBeInTheDocument();
  });
});

test('displays priority badges correctly', async () => {
  render(<RecommendationPanel predictionId="test-id" />);
  
  await waitFor(() => {
    const highBadge = screen.getByText('High');
    expect(highBadge).toHaveClass('bg-orange-100');
  });
});
```

---

## Troubleshooting

### Issue: Migration fails

**Solution:**
```bash
# Check current migration version
alembic current

# If stuck, downgrade and upgrade
alembic downgrade -1
alembic upgrade head
```

### Issue: No recommendations generated

**Check:**
1. Prediction exists: `SELECT * FROM predictions WHERE id = 'uuid';`
2. District exists: `SELECT * FROM districts WHERE id = 'uuid';`
3. User has correct role (admin/MOH/EPHI)
4. Check backend logs for errors

### Issue: Frontend not displaying recommendations

**Check:**
1. API endpoint returns data (test with cURL)
2. CORS configured correctly
3. Authentication token valid
4. Browser console for errors
5. Network tab for failed requests

### Issue: Recommendations seem incorrect

**Review:**
1. Prediction risk level and confidence
2. Historical data availability
3. Climate data availability
4. Rule logic in `recommendation_service.py`

---

## Customization

### Add Custom Rules

Edit `backend/app/services/recommendation_service.py`:

```python
@staticmethod
def _apply_custom_rules(context: Dict[str, Any]) -> List[RecommendationRule]:
    """Add your custom rules here"""
    rules = []
    
    # Example: Special rule for specific region
    if context.get("region") == "Tigray":
        rules.append(RecommendationRule(
            category=RecommendationEngine.PREVENTION,
            text="Coordinate with regional conflict-affected area protocols",
            priority=RecommendationEngine.HIGH,
            trigger_reason="District in conflict-affected region"
        ))
    
    return rules
```

### Customize UI Colors

Edit `frontend/src/types/recommendation.ts`:

```typescript
export const PRIORITY_COLORS: Record<RecommendationPriority, string> = {
  low: 'bg-green-100 text-green-800',      // Changed from gray
  medium: 'bg-yellow-100 text-yellow-800',  // Changed from blue
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};
```

---

## Production Checklist

- [ ] Database migration applied
- [ ] API endpoints tested
- [ ] Frontend components integrated
- [ ] Recommendations generated for existing predictions
- [ ] RBAC verified (only admin/MOH/EPHI can generate)
- [ ] Performance acceptable (<500ms for generation)
- [ ] Error handling tested
- [ ] Documentation updated
- [ ] Team trained on feature usage

---

## Support

For issues or questions:
1. Check `RESPONSE_RECOMMENDATION_FEATURE.md` for detailed documentation
2. Review API docs at http://localhost:8000/api/docs
3. Check backend logs for errors
4. Test with Swagger UI first

---

**Integration Status**: ✅ Ready for deployment

**Last Updated**: May 28, 2026
