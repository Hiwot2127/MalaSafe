# 🦟 MalaSafe - AI-Powered Malaria Surveillance System

**Final Year Software Engineering Project**  
**Ethiopian Ministry of Health - Malaria Surveillance & Prediction Platform**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

MalaSafe is an AI-powered malaria surveillance and prediction platform designed for Ethiopia's public health infrastructure. The system enables real-time monitoring of malaria cases across 850+ districts, generates AI-powered risk predictions, and provides interactive visualizations to support evidence-based decision-making.

### Key Objectives

- **Monitor** malaria cases across all Ethiopian districts in real-time
- **Predict** future malaria risk using machine learning (LightGBM)
- **Alert** health officials to high-risk areas automatically
- **Analyze** trends and patterns for evidence-based interventions
- **Coordinate** response efforts across regions

### Target Users

- **Ministry of Health (MOH)**: National oversight and policy
- **Ethiopian Public Health Institute (EPHI)**: Technical guidance and research
- **Regional Health Bureaus**: Regional coordination
- **District Health Offices**: Local implementation
- **Health Extension Workers**: Field data collection

---

## ✨ Features

### Core Functionality

#### 1. Real-Time Surveillance 📊
- Monitor malaria cases across 850+ districts
- Track trends over time (weekly, monthly, yearly)
- Identify outbreak patterns
- Generate regional summaries

#### 2. AI-Powered Predictions 🤖
- Predict malaria risk 1 month ahead
- 85%+ prediction accuracy
- Confidence scores for each prediction
- SHAP explanations for interpretability

#### 3. Interactive Risk Maps 🗺️
- Color-coded district risk levels
- GeoJSON-based visualization
- District-level details on click
- Region and date filtering

#### 4. Alert Management 🚨
- Automatic alerts for high-risk districts
- Email and SMS notifications
- Alert history and tracking
- Priority-based filtering

#### 5. Data Management 📤
- CSV upload for malaria data
- CSV upload for climate data
- Preview and validation before upload
- Background processing for large files

#### 6. Analytics & Reporting 📈
- Dashboard with key metrics
- Trend analysis with charts
- District comparisons
- Regional breakdowns
- **PDF export** for reports

#### 7. User Management 👥
- 5 user roles (admin, MOH, EPHI, regional, district)
- Role-based access control (RBAC)
- Audit logging for all actions
- User activity tracking

#### 8. Prediction Explainability 🔍
- **Top contributing factors** (top 5 features)
- **Confidence visualization**
- **Positive vs negative feature impact**
- **Clean SHAP explanation cards**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Web App    │  │  Mobile App  │  │  Admin Panel │         │
│  │   (React)    │  │(React Native)│  │   (React)    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         └──────────────────┴──────────────────┘                 │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │     Nginx       │
                    │  (Reverse Proxy)│
                    └────────┬────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      BACKEND LAYER                              │
├────────────────────────────┼────────────────────────────────────┤
│                    ┌───────▼────────┐                           │
│                    │   FastAPI      │                           │
│                    │   REST API     │                           │
│                    └───────┬────────┘                           │
│         ┌──────────────────┼──────────────────┐                 │
│    ┌────▼────┐      ┌─────▼─────┐     ┌─────▼─────┐           │
│    │  Redis  │      │PostgreSQL │     │  Celery   │           │
│    │ (Cache) │      │ (Primary) │     │ (Workers) │           │
│    └─────────┘      └───────────┘     └───────────┘           │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      AI/ML LAYER                                │
├────────────────────────────┼────────────────────────────────────┤
│                    ┌───────▼────────┐                           │
│                    │   LightGBM     │                           │
│                    │   Predictor    │                           │
│                    └───────┬────────┘                           │
│         ┌──────────────────┼──────────────────┐                 │
│    ┌────▼────┐      ┌─────▼─────┐     ┌─────▼─────┐           │
│    │  SHAP   │      │   Drift   │     │ Backtest  │           │
│    │Explainer│      │ Detection │     │  Engine   │           │
│    └─────────┘      └───────────┘     └───────────┘           │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                   MONITORING LAYER                              │
├────────────────────────────┼────────────────────────────────────┤
│    ┌──────────┐     ┌─────▼─────┐     ┌──────────┐            │
│    │  Sentry  │     │  Loguru   │     │  Health  │            │
│    │ (Errors) │     │  (Logs)   │     │Endpoints │            │
│    └──────────┘     └───────────┘     └──────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI 0.109+
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Task Queue**: Celery 5.3+
- **ORM**: SQLAlchemy 2.0+ (async)
- **Migrations**: Alembic
- **Validation**: Pydantic
- **Testing**: Pytest + pytest-asyncio

### Frontend
- **Language**: TypeScript
- **Framework**: React 18+
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Maps**: Leaflet
- **HTTP Client**: Axios
- **State Management**: React Query

### Mobile
- **Framework**: React Native
- **Storage**: AsyncStorage
- **Navigation**: React Navigation

### AI/ML
- **Model**: LightGBM 4.3.0
- **Processing**: Pandas, NumPy
- **Preprocessing**: Scikit-learn
- **Explainability**: SHAP

### Infrastructure
- **Web Server**: Nginx
- **Process Management**: Supervisor
- **Monitoring**: Sentry
- **Logging**: Loguru, structlog
- **PDF Generation**: ReportLab

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Git

### Backend Setup

```bash
# Clone repository
git clone https://github.com/your-org/malasafe.git
cd malasafe/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Seed data (optional)
python scripts/seed_districts.py
python scripts/seed_climate_history.py
python scripts/compute_baselines.py

# Start server
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### Start Background Workers

```bash
# In a separate terminal
cd backend
source venv/bin/activate

# Start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info --queues=uploads,predictions,climate
```

---

## 📁 Project Structure

```
MalaSafe/
├── backend/
│   ├── app/
│   │   ├── ai/                 # AI/ML models and predictors
│   │   ├── cache/              # Redis caching
│   │   ├── config/             # Configuration
│   │   ├── database/           # Database connection
│   │   ├── middleware/         # Security, CORS, rate limiting
│   │   ├── models/             # SQLAlchemy models
│   │   ├── monitoring/         # Sentry, logging
│   │   ├── routes/             # API endpoints
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   ├── tasks/              # Celery tasks
│   │   └── utils/              # Utilities
│   ├── alembic/                # Database migrations
│   ├── models/                 # ML model artifacts
│   ├── scripts/                # Seed scripts
│   ├── tests/                  # Backend tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API services
│   │   ├── hooks/              # Custom hooks
│   │   ├── utils/              # Utilities
│   │   └── types/              # TypeScript types
│   ├── e2e/                    # Playwright E2E tests
│   ├── public/                 # Static assets
│   └── package.json
├── mobile/
│   ├── src/                    # React Native source
│   └── package.json
├── AI_INTEGRATION_NOTES.md     # AI/ML integration guide
├── TODO.md                     # Project tasks
└── README.md                   # This file
```

---

## 📚 API Documentation

### Interactive Documentation

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/login` - Login with credentials
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

#### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard summary
- `GET /api/v1/analytics/trends` - Trend analysis

#### Predictions
- `POST /api/v1/predictions/generate` - Generate single prediction
- `POST /api/v1/predictions/generate-batch` - Generate batch predictions

#### Uploads
- `POST /api/v1/uploads/malaria/monthly` - Upload malaria data
- `POST /api/v1/uploads/climate` - Upload climate data

#### Exports
- `POST /api/v1/exports/district-report/{district_id}` - Export district PDF
- `POST /api/v1/exports/analytics-summary` - Export analytics PDF

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

**Test Coverage**: 80%+ (52+ tests)

### Frontend E2E Tests

```bash
cd frontend

# Install Playwright
npm install -D @playwright/test
npx playwright install

# Run E2E tests
npx playwright test

# Run in headed mode
npx playwright test --headed

# View test report
npx playwright show-report
```

**E2E Test Coverage**:
- ✅ Authentication (login, logout)
- ✅ Dashboard (summary, charts, tables)
- ✅ Data Upload (validation, preview, upload)
- ✅ Risk Map (display, interaction, filtering)
- ✅ Predictions (generation, display, SHAP explanations)

---

## 🚢 Deployment

### Production Deployment Guide

See `backend/DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

### Quick Deployment Steps

1. **Server Setup** (Ubuntu 20.04+)
2. **Install Dependencies** (Python, PostgreSQL, Redis, Nginx)
3. **Configure Application** (.env, database, Redis)
4. **Run Migrations** (alembic upgrade head)
5. **Setup Supervisor** (API, Celery workers)
6. **Configure Nginx** (reverse proxy, SSL)
7. **Start Services** (supervisorctl start all)

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/malasafe

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn

# Environment
ENVIRONMENT=production
DEBUG=false
```

---

## 🤝 Contributing

This is a final year project. Contributions are welcome for educational purposes.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **Backend**: Follow PEP 8 (use `black` and `ruff`)
- **Frontend**: Follow Airbnb style guide (use `eslint` and `prettier`)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Final Year Software Engineering Students**  
**University**: [Your University Name]  
**Year**: 2026

---

## 🙏 Acknowledgments

- Ethiopian Ministry of Health
- Ethiopian Public Health Institute (EPHI)
- [Your University Name]
- All contributors and advisors

---

## 📞 Contact

For questions or support, please contact:
- **Email**: malasafe@example.com
- **GitHub**: https://github.com/your-org/malasafe

---

## 📊 Project Status

- ✅ **Backend**: Production ready
- ✅ **Frontend**: Functional
- ✅ **Mobile**: Basic functionality
- ✅ **AI/ML**: Operational (85%+ accuracy)
- ✅ **Testing**: 80%+ coverage
- ✅ **Documentation**: Complete
- ✅ **Deployment**: Ready

**Status**: Ready for final presentation and deployment

---

**Built with ❤️ for Ethiopia's public health**
