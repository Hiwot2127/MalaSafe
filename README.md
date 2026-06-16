# <div align="center">🦟 MalaSafe: Malaria Surveillance & Prediction Platform</div>

<div align="center">
  
  [![Supported Regions](https://img.shields.io/badge/Coverage-12%20Regions%20•%201%2C082%20Woredas-00bcd4?style=for-the-badge&logo=maplibre)](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/district.py)
  [![Supported Languages](https://img.shields.io/badge/Languages-4%20(EN%20%7C%20AM%20%7C%20OM%20%7C%20TI)-4caf50?style=for-the-badge)](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/frontend/app/page.tsx)
  [![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Next.js%20%7C%20Expo-ff5722?style=for-the-badge)](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/docker-compose.yml)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

</div>

---

<p align="center">
  <strong>MalaSafe</strong> is a production-grade, end-to-end malaria surveillance and forecasting platform built specifically for Ethiopia's public health ecosystem. The platform serves the <strong>Ethiopian Public Health Institute (EPHI)</strong> and the <strong>Ministry of Health (MOH)</strong> to predict malaria outbreaks, model regional transmission risk, automate climate data ingestion, and coordinate rapid clinical/preventative responses.
</p>

---

## 📌 Table of Contents
* [📂 Project Directory Structure](#-project-directory-structure)
* [🏗️ System Architecture Overview](#️-system-architecture-overview)
* [🔮 Machine Learning & Forecasting Engine](#-machine-learning--forecasting-engine)
* [🔄 Ingestion & Month-End Close Pipeline](#-ingestion--month-end-close-pipeline)
* [🗄️ Database Schema & Models](#️-database-schema--models)
* [🔐 Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
* [⚙️ Environment Settings & Configuration](#️-environment-settings--configuration)
* [🚀 Getting Started](#-getting-started)
* [🧪 Testing & Verification](#-testing--verification)
* [📊 Automated Action Plans & Reporting](#-automated-action-plans--reporting)
* [🔒 Hardening & Security Features](#-hardening--security-features)

---

## 📂 Project Directory Structure

```
MalaSafe/
├── backend/                       # FastAPI Server Applications
│   ├── alembic/                   # Database migrations
│   ├── app/                       # Main application package
│   │   ├── ai/                    # LightGBM predictors, feature engineering, and phrasebook
│   │   ├── cache/                 # Redis cache managers
│   │   ├── config/                # Application settings
│   │   ├── database/              # DB connection setup
│   │   ├── middleware/            # Rate limiting, security headers, CORS, request tracing
│   │   ├── models/                # SQLAlchemy database models
│   │   ├── monitoring/            # Sentry & structured logging
│   │   ├── routes/                # Endpoint handlers grouped by tag
│   │   ├── schemas/               # Pydantic schemas for validation
│   │   ├── services/              # Core business logic (analytics, audit, recommendation, ingestion)
│   │   └── tasks/                 # Celery workers & periodic schedules
│   └── tests/                     # Pytest unit & integration tests
├── frontend/                      # Next.js Web Dashboard
│   ├── app/                       # Next.js App Router (dashboard, admin panel, auth, landing)
│   ├── components/                # Reusable UI & dashboard components
│   ├── lib/                       # API clients, translations, helper functions
│   └── tests/                     # Playwright E2E tests
├── mobile/                        # Expo React Native App
│   ├── app/                       # Expo Router paths (tabs, symptom checker, traveler logs)
│   ├── components/                # Mobile widgets & views
│   └── services/                  # Axios API client & database helpers
└── docker-compose.yml             # Multi-container local orchestration
```

---

## 🏗️ System Architecture Overview

MalaSafe is designed with a modern, microservice-inspired architecture that leverages independent service boundaries:

```mermaid
graph TB
    %% Styling definitions
    classDef client fill:#e0f7fa,stroke:#00acc1,stroke-width:2px;
    classDef backend fill:#e8f5e9,stroke:#4caf50,stroke-width:2px;
    classDef database fill:#fff3e0,stroke:#ffb74d,stroke-width:2px;
    classDef worker fill:#f3e5f5,stroke:#ab47bc,stroke-width:2px;
    classDef external fill:#eceff1,stroke:#607d8b,stroke-width:1px,stroke-dasharray: 5, 5;

    subgraph Client Tier
        Web["💻 Web Dashboard (Next.js)"]:::client
        Mobile["📱 Mobile Client (Expo)"]:::client
    end

    subgraph Application Server
        API["⚡ FastAPI Backend"]:::backend
    end

    subgraph Task & Cache Layer
        Celery["🕒 Celery Workers & Beat"]:::worker
        Redis["📦 Redis Cache / Broker"]:::database
    end

    subgraph Persistent Storage
        DB[("🗄️ PostgreSQL (AsyncPG)")]:::database
    end

    subgraph External Data Sources
        External["🌐 Copernicus API / CHIRPS"]:::external
        Zonal["📏 Zonal Stats Engine"]:::worker
    end

    Web -->|HTTPS / JSON / Auth| API
    Mobile -->|HTTPS / JSON / Auth| API
    
    API -->|Async Tasks / Events| Celery
    Celery <-->|Broker & Results| Redis
    API <-->|State & Cache| Redis
    
    API <-->|ORM / AsyncPG| DB
    Celery <-->|ORM / AsyncPG| DB
    
    Celery -->|Satellite Ingestion| External
    Celery -->|Woreda Shapefiles| Zonal
```

### 🔹 [Backend API](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/main.py)
*   **FastAPI & Python 3.10+**: Asynchronous request processing via SQLAlchemy and `asyncpg`.
*   **Production Hardened**: Integrated caching and rate-limiting using **Redis** and **slowapi**.
*   **Structured Telemetry**: Contextual structured logging via `structlog` and automated crash tracking via `Sentry`.
*   **Background Worker**: Task queues and periodic background scheduling via **Celery** (backed by Redis).

### 🔹 [Frontend Dashboard](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/frontend/app/page.tsx)
*   **Next.js (App Router)**: Fast Server-Side Rendering (SSR) optimized for dashboard display.
*   **Tailwind CSS**: Modern, visually premium interface featuring curated dark/light color schemes.
*   **Next.js Proxying**: Dynamic API routing configured in [next.config.js](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/frontend/next.config.js) forwarding browser endpoints seamlessly to the backend container.

### 🔹 [Mobile Client](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/mobile/app/_layout.tsx)
*   **React Native & Expo Router**: Single-codebase mobile client for public self-registration.
*   **Traveler Profiles & Offline Cache**: Incorporates geolocation-based risk warnings and locally persisted AsyncStorage configurations.

---

## 🔮 Machine Learning & Forecasting Engine

The ML pipeline is located in [backend/app/ai/](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/ai/) and leverages multiple LightGBM boosters.

### 📋 LightGBM Predictor Stack

| Booster Model | Target Utility | Features Used |
| :--- | :--- | :--- |
| **`lightgbm_main.txt`** | Main point forecasts | AR Lags, rolling climate averages, elevation, coordinates |
| **`lightgbm_q10.txt`** | 10th percentile bounds | Log-scale case indices (used for interval confidence) |
| **`lightgbm_q90.txt`** | 90th percentile bounds | Log-scale case indices (used for interval confidence) |
| **`lightgbm_coldstart.txt`** | Low-history woredas | Regional coordinates, elevation, raw climatological data |

### 🛠️ Feature Engineering Pipeline
The feature extraction engine ([features.py](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/ai/features.py)) compiles multiple databases into ML-ready matrices:
*   **Autoregressive Lags**: Positive case metrics, total tests, and case positivity rates lagged at 1, 2, and 3-month periods.
*   **Climate & Anomalies**: Computes difference scores comparing monthly readings against pre-computed baselines ([regional_baselines.json](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/ai/features.py)).
*   **Spatial & Geography**: Latitude, longitude, elevation, and highland indicators (above 2000m).
*   **Temporal Cycles**: Sine and Cosine transformations of the Gregorian calendar month to map seasonal vectors.

### 🧩 Explainable AI (XAI)
Using LightGBM's native `pred_contrib=True` feature, MalaSafe extracts the top SHAP values for each inference run. These mathematical weights are automatically mapped in [phrasebook.py](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/ai/phrasebook.py) to render natural language explanations for health officials:

> [!TIP]
> **Example Output:**
> *"High risk predicted for this woreda, driven by: an unusually hot month (+1.4°C), above-average cumulative rainfall (+45mm) in the past 60 days, and high historical cases."*

---

## 🔄 Ingestion & Month-End Close Pipeline

MalaSafe leverages a transactional, asynchronous pipeline ([upload_service.py](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/services/upload_service.py)) to process batch uploads:

### 🛡️ CSV Validation and Facility Aggregation
1.  **DHIS2 Organization Mapping**: The system uses [OrgUnitMapper](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/services/upload_service.py#L65) to map incoming facility-level strings (`organisationunitid`) to internal Woreda UUIDs (`District.id`) using many-to-one maps loaded from `org_unit_mappings`. It falls back to direct `district_code` parsing if needed.
2.  **Granularity Rollup**: Facility-level records are grouped and rolled up to a consolidated **woreda-month** grain (calculating total positive cases, tests, and travel history).
3.  **Atomic Operations**: Batch insertions execute inside explicit nested transactions (`self.db.begin_nested()`). Any parsing error triggers an instant rollback to maintain database integrity.
4.  **Dry-Run Previews**: A dedicated preview path (`dry_run_validate_monthly`) parses and returns the counts of valid, skipped, and duplicate records to the UI *before* any records write to the persistent storage.

### 🏁 State Machine Orchestration
When a monthly file ingestion finishes, if it matches the minimum district threshold `MONTHLY_CLOSE_MIN_DISTRICTS` (default: 50) and monthly close is enabled, the backend triggers an asynchronous task runner ([monthly_close.py](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/tasks/monthly_close.py)):

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> climate_fetching : Start
    climate_fetching --> backtesting : Fetch CHIRPS & ERA5-Land Zonal Mean
    backtesting --> drift_checking : Calculate MAE / MAPE
    drift_checking --> predicting : KS Feature Drift Analysis
    predicting --> completed : Run Batch Predictions
    completed --> [*]

    state climate_fetching {
        [*] --> DownloadRasters
        DownloadRasters --> AggregateZonalStats
    }
```

*   **pending**: Ingestion triggers close and inserts close metadata.
*   **climate_fetching**: Celery triggers raw raster downloads (CHIRPS HTTP Rainfall and ERA5-Land NetCDF temperature maps). The zonal stats engine aggregates raw cell grids against Ethiopia's boundary shapefiles to compute exact climate parameters per woreda polygon.
*   **backtesting**: Evaluates model quality on historical datasets, saving errors to `backtest_results`.
*   **drift_checking**: Runs a Kolmogorov-Smirnov (KS) test to evaluate feature distribution changes (drift findings) compared to original training inputs.
*   **predicting**: Auto-generates predictions for the next month across all 1,082 districts, caching metrics to Redis.

---

## 🗄️ Database Schema & Models

SQLAlchemy models define the system state in [backend/app/models/](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/):

```mermaid
erDiagram
    User {
        UUID id PK
        string full_name
        string email
        string password_hash
        string role
        string district_id
        boolean is_active
    }
    District {
        string id PK "UUID"
        string district_code UK
        string district_name
        string region
        string zone
        float latitude
        float longitude
        float elevation_m
    }
    MalariaData {
        integer id PK
        string district_id FK
        integer year
        integer month
        integer positive
        integer tests
        integer travel
    }
    ClimateData {
        integer id PK
        string district_id FK
        float rainfall
        float temperature
        date date
    }
    Prediction {
        UUID id PK
        string district_id FK
        date prediction_date
        string risk_level
        float prediction_score
        float confidence_score
        string prediction_reason
        json prediction_factors
    }
    MonthlyClose {
        UUID id PK
        date month
        string status
        string mode
        string idempotency_key
    }
    
    District ||--o{ MalariaData : has
    District ||--o{ ClimateData : has
    District ||--o{ Prediction : has
    User ||--o{ MonthlyClose : triggers
```

*   📄 **[User](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/user.py)**: Handles profiles, roles, locked periods, and attempts.
*   📄 **[District](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/district.py)**: Stores geographical parameters, populations, and CSA spatial codes.
*   📄 **[MalariaData](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/malaria_data.py)**: Consolidated monthly malaria cases.
*   📄 **[ClimateData](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/climate_data.py)**: Records observed environmental grids (Rainfall, Temp).
*   📄 **[Prediction](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/prediction.py)**: Outbreak forecast values and SHAP contribution factors.
*   📄 **[Alert](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/alert.py)**: Risk warnings scoped to specific roles and territories.
*   📄 **[MonthlyClose](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/monthly_close.py)**: Logs tracking the monthly close pipeline state.
*   📄 **[BacktestResult](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/backtest_result.py)**: Stores historical error checks (MAE/MAPE).
*   📄 **[DriftFinding](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/drift_finding.py)**: Kolmogorov-Smirnov test tracking for feature drift.
*   📄 **[AuditLog](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/models/audit_log.py)**: Records user mutations, settings updates, and imports.

---

## 🔐 Role-Based Access Control (RBAC)

Scoped endpoints secure user interactions:

*   👤 **`admin`**: Full systems access (health telemetry, audit streams, user CRUD, trigger close reruns).
*   👤 **`moh_officer`**: CSV uploads, triggers close pipeline, launches batch prediction jobs.
*   👤 **`ephi_officer`**: Views GIS risk tables, creates predictions, reads drift alerts, exports PDF reports.
*   👤 **`regional_officer`**: Restricts dashboard data and alerts to their assigned district.
*   👤 **`public_user`**: Expo mobile access, reviews prevention guidelines, checks traveler logs, and views warning alerts.

---

## ⚙️ Environment Settings & Configuration

The application is configured using Pydantic settings ([settings.py](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/config/settings.py)).

### 🔹 Root & Backend Environment Variables (`.env`)

| Variable | Description | Default / Dev Value |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Target deployment mode (`development` or `production`) | `production` |
| `DEBUG` | Enables hot reload and verbose output | `False` |
| `DATABASE_URL` | Asyncpg DB URL | `postgresql+asyncpg://user:pass@postgres/db` |
| `SECRET_KEY` | Cryptographic key for JWT hashing | *Required (Min 32 characters in prod)* |
| `REDIS_HOST` | Hostname for Redis cache and rate limiting | `redis` |
| `CELERY_BROKER_URL` | Redis broker endpoint for tasks | `redis://redis:6379/1` |
| `MONTHLY_CLOSE_MIN_DISTRICTS`| Threshold of districts required to trigger pipeline | `50` |
| `SHAPEFILE_PATH` | Boundary shapefile for climate zonal statistics | `./data/shapefiles/eth_woreda/` |

### 🔹 Frontend Environment Variables (`.env.local`)

| Variable | Description | Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Public entrypoint URL for backend communication | `/api/v1` (Proxied in Dev via next.config) |

---

## 🚀 Getting Started

### 🐳 Run using Docker Compose (Recommended)

1.  Clone the repository and copy the environment template:
    ```bash
    git clone <repo-url> MalaSafe
    cd MalaSafe
    cp .env.example .env
    ```
2.  Start the complete stack:
    ```bash
    docker compose up --build
    ```
3.  Access the applications:
    *   **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
    *   **FastAPI API Docs:** [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
    *   **Redis Database:** `localhost:6379`
    *   **Postgres Database:** `localhost:5432` (Auth parameters: `POSTGRES_DB=malasafe`, `POSTGRES_USER=malasafe`, `POSTGRES_PASSWORD=malasafe_dev_password`).

> [!IMPORTANT]
> During initial launch, the database migrations are automatically updated, and seed scripts ([seed_all.py](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/scripts/seed_all.py)) run automatically to prep the environment with mock indicators.

---

## 🧪 Testing & Verification

### 🧪 Backend Test Suite
FastAPI and ML predictions are tested using `pytest` and `pytest-asyncio`:
```bash
cd backend
# Run test suite
pytest tests/ -v

# Run with HTML coverage report
pytest tests/ --cov=app --cov-report=html
```

### 🧪 Frontend E2E Test Suite
The UI flows are verified using Playwright:
```bash
cd frontend
npm install
npm run test:e2e
```

---

## 📊 Automated Action Plans & Reporting

### ⚡ Rule-Based Recommendation Engine
The response engine ([recommendation_service.py](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/services/recommendation_service.py)) triggers clinical response action items:
*   **Risk Level Trigger (`very_high`)**: Recommends "Activate district rapid response team immediately" and "Request regional and national support for outbreak response."
*   **Rainfall Anomaly Trigger (>50%)**: Recommends "Intensify mosquito breeding site elimination (standing water removal)" and "Conduct larviciding operations in water collection areas."
*   **Confidence Trigger (<0.5)**: Recommends "Conduct manual epidemiological review and field verification."

### 📄 ReportLab PDF Builder
Reports are compiled into printable A4 reports:
*   **District Prediction Reports**: Renders target monthly forecasts, point case estimates, confidence intervals, model metrics, and action items.
*   **Analytics Summary Reports**: Compiles total cases, active warnings, and regional tables.

---

## 🔒 Hardening & Security Features

*   **Custom Rate Limiting**: Managed via `slowapi` Redis middleware.
*   **Security Headers**: Built-in protection headers configured in [security_headers.py](file:///c:/Users/hp/Desktop/Capstone%202026/MalaSafe/backend/app/middleware/security_headers.py) (X-Frame-Options, CSP, HSTS).
*   **Audit Logs**: Access records track updates to users, database configurations, and uploads.
*   **Token Security**: Uses short-lived (30-minute) JWT tokens, with secure HTTP-only cookies in production.
