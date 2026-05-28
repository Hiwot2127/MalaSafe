# MalaSafe - Demo Quick Reference Card

**For Final Presentation - Keep This Handy!**

---

## 🚀 Quick Start Commands

### Backend
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```
**URL**: http://localhost:8000

### Frontend
```bash
cd frontend
npm run dev
```
**URL**: http://localhost:3000

### Celery (if needed)
```bash
cd backend
celery -A app.tasks.celery_app worker --loglevel=info
```

---

## 🔑 Demo Credentials

**Admin User:**
- Email: `admin@malasafe.gov.et`
- Password: `admin123`

**MOH User:**
- Email: `moh@malasafe.gov.et`
- Password: `moh123`

---

## 📋 Demo Scenario (8-10 minutes)

### 1. Login & Dashboard (1 min)
- Navigate to http://localhost:3000
- Login as admin
- Show dashboard summary cards
- Point out: "15,000+ cases, 12 active alerts, 8 high-risk districts"

### 2. Risk Map (1.5 min)
- Click "Map" in navigation
- Show color-coded districts
- Click on a high-risk district (red/orange)
- Show popup with district details
- Filter by region (optional)

### 3. Data Upload (1.5 min)
- Click "Upload Data"
- Select pre-prepared CSV file
- Click "Preview"
- Show validation results
- Click "Upload"
- Show success message

### 4. Predictions & SHAP (2 min)
- Click "Predictions"
- Click on a high-risk prediction
- Show prediction details:
  - Risk level: HIGH
  - Predicted cases: 250
  - Confidence: 85%
- Scroll to SHAP explanation
- Point out top 5 contributing factors

### 5. **Response Recommendations** (2 min) ⭐ NEW FEATURE
- Scroll to "Recommended Response Plan"
- Point out priority badge: "HIGH" or "CRITICAL"
- Show categories:
  - Prevention 🛡️
  - Medical Preparedness 💊
  - Surveillance 🔍
  - Escalation 🚨
- Expand "Why this recommendation?"
- Highlight: "Every recommendation is explainable"
- **Key Message**: "From prediction to action in one click"

### 6. PDF Export (1 min)
- Click "Export Report"
- Show PDF download
- Open PDF briefly
- Show professional formatting

### 7. E2E Tests (1 min) (Optional)
- Open terminal
- Run: `npx playwright test --headed`
- Show tests passing

---

## 🎯 Key Talking Points

### Problem Statement
"Malaria is a major public health challenge in Ethiopia. Current surveillance systems are reactive. We need predictive, proactive tools."

### Solution
"MalaSafe uses AI to predict malaria risk 1 month ahead with 85% accuracy, and **automatically generates response recommendations** to guide health officials."

### Technical Highlights
- **Full-Stack**: React, FastAPI, PostgreSQL, Redis, Celery
- **AI/ML**: LightGBM with SHAP explanations
- **Security**: Cookie auth, rate limiting, RBAC
- **Performance**: 10x faster queries, 80% cache hit rate
- **Testing**: 80%+ coverage, E2E tests
- **NEW**: Rule-based decision support system

### Innovation
"We transform predictions into actions. Not just 'what will happen' but 'what should we do'."

### Impact
"Enables proactive malaria control for 850+ districts, potentially saving thousands of lives."

---

## 🎬 Demo Flow Diagram

```
Login → Dashboard → Map → Upload → Predictions → 
SHAP Explanation → **Response Recommendations** → PDF Export
```

---

## 💡 If Something Goes Wrong

### Backend not starting
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000
# Kill process if needed
taskkill /PID <PID> /F
```

### Frontend not starting
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000
# Kill process if needed
taskkill /PID <PID> /F
```

### Database connection error
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
```

### No recommendations showing
```bash
# Generate recommendations via API
curl -X POST http://localhost:8000/api/v1/recommendations/generate/{prediction_id} \
  -H "Authorization: Bearer $TOKEN"
```

### Use backup video
- Have a pre-recorded video ready
- Show video if live demo fails
- Explain what would have happened

---

## 📊 Key Statistics to Mention

- **850+ districts** monitored
- **85%+ prediction accuracy**
- **80%+ test coverage**
- **10x faster** queries with indexes
- **80-90% cache hit rate**
- **15,000+ lines of code**
- **6 months** development time
- **Full-stack** implementation

---

## 🎤 Presentation Structure (15-20 min)

1. **Introduction** (2 min)
   - Problem statement
   - Project objectives

2. **System Overview** (3 min)
   - Architecture diagram
   - Technology stack
   - Key features

3. **Live Demo** (8-10 min)
   - Follow demo scenario above
   - **Emphasize Response Recommendations**

4. **Technical Highlights** (3 min)
   - AI/ML model
   - Backend architecture
   - Testing

5. **Results & Impact** (2 min)
   - Performance metrics
   - Potential impact

6. **Q&A** (5-10 min)

---

## ❓ Anticipated Questions & Answers

**Q: Why LightGBM?**
A: Fast, accurate, handles tabular data well. 85%+ accuracy with <100ms latency.

**Q: How do you handle missing data?**
A: Data quality monitoring, climatological normals for missing climate data, cold-start model for new districts.

**Q: What about data security?**
A: Cookie auth with HttpOnly/Secure flags, rate limiting, RBAC, input sanitization, HTTPS.

**Q: How scalable is it?**
A: Designed for 850+ districts. Redis caching, database indexes, connection pooling, background tasks.

**Q: How accurate are predictions?**
A: 85%+ accuracy, MAE of 65.7 cases. We provide confidence scores and SHAP explanations.

**Q: What about the recommendations?**
A: Rule-based, not AI-generated. Based on WHO and Ethiopian MOH guidelines. Every recommendation includes trigger reason for transparency.

**Q: Can recommendations be customized?**
A: Yes, rules are in Python code, easy to modify. Can add custom rules for specific regions or conditions.

---

## 🎯 Key Messages

1. **Real-World Problem**: Addresses actual public health challenge
2. **AI-Powered**: 85%+ accurate predictions
3. **Decision Support**: Transforms predictions into actions
4. **Production-Ready**: Security, testing, performance
5. **Full-Stack**: Backend, frontend, mobile, AI/ML
6. **Explainable**: SHAP + trigger reasons
7. **Scalable**: 850+ districts
8. **Impact**: Potentially saves lives

---

## 🌟 Highlight the NEW Feature

**Before**: "Here's a prediction: HIGH RISK, 250 cases"  
**After**: "Here's what you should do: Pre-position ACT medications, intensify surveillance, notify regional bureau"

**Transformation**: Dashboard → Decision Support System

---

## 📸 Screenshots to Show (if needed)

1. Dashboard with summary cards
2. Risk map with color-coded districts
3. Prediction with SHAP explanation
4. **Response Recommendations panel** ⭐
5. PDF export sample
6. E2E test results

---

## ⏱️ Time Management

- **Total**: 15-20 minutes
- **Demo**: 8-10 minutes (most important)
- **Technical**: 3 minutes
- **Q&A**: 5-10 minutes

**Practice the demo 5+ times!**

---

## ✅ Pre-Presentation Checklist

- [ ] Backend running
- [ ] Frontend running
- [ ] Database seeded with demo data
- [ ] Test user accounts created
- [ ] Sample CSV file prepared
- [ ] Predictions generated
- [ ] **Recommendations generated**
- [ ] Laptop fully charged
- [ ] Backup video ready
- [ ] Slides ready
- [ ] Demo practiced 5+ times
- [ ] Questions prepared
- [ ] Confident and ready!

---

## 🎉 Final Tips

1. **Breathe** - You've built something amazing
2. **Smile** - Show enthusiasm for your project
3. **Speak clearly** - Explain technical terms
4. **Make eye contact** - Engage with audience
5. **Handle failures gracefully** - Use backup video if needed
6. **Emphasize impact** - This can save lives
7. **Be proud** - You've earned this moment

---

**You've got this! 🚀**

**Good luck with your presentation!**

---

**Last Updated**: May 28, 2026  
**Project Status**: 98% Complete - READY FOR PRESENTATION
