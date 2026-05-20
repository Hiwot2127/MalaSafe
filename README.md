# 🦟 MalaSafe - Malaria Surveillance & Prediction System

A comprehensive malaria surveillance system for Ethiopia with **AI-powered predictions**, real-time monitoring, and public awareness tools for health officials and citizens.

---

## 🎯 Overview

### 🌐 Web Application — Malaria Surveillance & Analytics Platform
A secure AI-powered malaria surveillance web platform designed for **EPHI, MOH, and regional health officials** to monitor, analyze, and predict malaria outbreaks across districts in Ethiopia. The system supports malaria and climate data uploads, district-level GIS heatmaps, outbreak risk prediction with explainable AI insights, analytics dashboards, and alert management to support data-driven public health decision-making.

### 📱 Mobile Application — Public Malaria Awareness App
A mobile application built for the **general public** to access real-time malaria risk information, outbreak alerts, prevention guidance, and travel risk assessments. The app provides district-level malaria risk visualization, push notifications, trend monitoring, and offline access to recently fetched risk data to improve public awareness and preventive action.

---

## 🚀 Quick Start

**Prerequisites:** Python 3.10+, Node.js 18+, PostgreSQL 14+

**Backend (macOS / Linux):**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # edit DATABASE_URL + DATABASE_URL_SYNC + SECRET_KEY
alembic upgrade head
python create_admin.py     # interactive — pick a strong password
uvicorn app.main:app --reload
```

**Backend (Windows):** same steps; use `venv\Scripts\activate` and `copy` instead of `cp`.

**Frontend:** `cd frontend && npm install && npm run dev`

**Mobile:** `cd mobile && npm install && npx expo start`

**Login:** use the admin email + password you set in `create_admin.py`.

📖 [Full Setup Guide](QUICKSTART_FULL_STACK.md)

---

## Technical Details

**Stack:** FastAPI, PostgreSQL, Next.js 16 + React 19, React Native (Expo), LightGBM
**Database:** 12 tables (users, districts, malaria_data, climate_data, district_environment, predictions, alerts, uploaded_files, model_versions, monthly_close, backtest_results, drift_findings) — see [backend/DATABASE_MODELS.md](backend/DATABASE_MODELS.md)
**API:** 10 routers under `/api/v1` (Health, Auth, Mobile, Uploads, Analytics, Maps, Predictions, Alerts, Monthly Close, Examples) — see [backend/API_REFERENCE.md](backend/API_REFERENCE.md)
**Background work:** in-process via `asyncio.create_task`; scheduled by external cron hitting `/api/v1/monthly-close/predict-monthly`. No Redis, no Celery.
**Security:** JWT authentication, bcrypt hashing, role-based access, CORS, input validation

📖 [API Documentation](http://localhost:8000/api/docs)

---

## 🎯 Status

**Version 1.0.0** 

✅ Backend (17 endpoints) • ✅ Web (7 pages) • ✅ Mobile (6 screens) • ✅ AI/ML (98.2% accuracy) • ✅ Database (1,082 districts)  

---

## Support

- [Setup Guide](QUICKSTART_FULL_STACK.md)
- [API Docs](http://localhost:8000/api/docs)
- [Backend README](backend/README.md)
- [Architecture](backend/ARCHITECTURE.md)
- [AI Integration Notes](AI_INTEGRATION_NOTES.md)

---

## 📝 License

MIT License - See [LICENSE](LICENSE) file

---

**MalaSafe - Protecting Ethiopia from Malaria** 🦟🛡️

**Version 1.0.0** 

---

**Access Points:**
- 🖥️ Web: http://localhost:3000
- ⚙️ API: http://localhost:8000
- 📖 Docs: http://localhost:8000/api/docs
- 📱 Mobile: Scan QR with Expo Go
