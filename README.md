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

**Prerequisites:** Python 3.9+, Node.js 18+, PostgreSQL 14+

**Backend:** `cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --reload`

**Frontend:** `cd frontend && npm install && npm run dev`

**Mobile:** `cd mobile && npm install && npx expo start`

**Login:** admin@malasafe.gov.et / admin123

📖 [Full Setup Guide](QUICKSTART_FULL_STACK.md)

---

## � Technical Details

**Stack:** FastAPI, PostgreSQL, Next.js 14, React Native, LightGBM  
**Database:** 8 tables (users, districts, malaria_data, climate_data, predictions, alerts, uploaded_files, district_environment)  
**API:** 17 endpoints (Auth, Data Upload, Analytics, Predictions, Alerts, Maps)  
**Security:** JWT authentication, bcrypt hashing, role-based access, CORS, input validation

📖 [API Documentation](http://localhost:8000/docs)

---

## 🎯 Status

**Version 1.0.0** 

✅ Backend (17 endpoints) • ✅ Web (7 pages) • ✅ Mobile (6 screens) • ✅ AI/ML (98.2% accuracy) • ✅ Database (1,082 districts)  

---

## 📞 Support

- 📖 [Setup Guide](QUICKSTART_FULL_STACK.md)
- 📖 [API Docs](http://localhost:8000/docs)

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
- 📖 Docs: http://localhost:8000/docs
- 📱 Mobile: Scan QR with Expo Go
