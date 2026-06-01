# MalaSafe — Project Spec (LLM Brief)

> AI-powered integrated early warning and decision-support system for malaria surveillance and risk prediction in Ethiopia.
> Source: Addis Ababa Science & Technology University thesis, Jan 2026. Compressed for LLM handoff.

---

## 1. One-line pitch

A web + mobile platform that fuses weekly malaria case data, climate data, and geographic data into AI-driven risk predictions, explainable outbreak alerts, and role-based dashboards for Ethiopia's public-health stakeholders — from national EPHI/MoH down to kebele-level Health Extension Workers and the public.

## 2. Problem

Existing Ethiopian malaria surveillance (DHIS2, ePHEM) is:
- **Reactive** — reports past cases, no forecasting.
- **Siloed** — case data not fused with climate/GIS.
- **Slow** — data crawls up administrative tiers before reaching decision-makers.
- **Inaccessible** — institutional only; no mobile-first / offline access for HEWs or the public.
- **Not predictive** — no early-warning, no resource-allocation guidance.

Context: Ethiopia had 7.3M+ malaria cases and 1000+ deaths in 2024. ~68% of the population lives in malaria-endemic zones. Two seasonal peaks (Sep–Dec, Feb–May).

## 3. Users (Actors)

| Role | Platform | Primary Job |
|------|----------|-------------|
| System Administrator | Web | Manage users, roles, risk thresholds, audit logs |
| EPHI Officer | Web | Upload weekly surveillance data, validate, generate predictions |
| MoH Officer | Web | View national dashboards, plan interventions |
| Regional/Zonal Health Officer | Web | Regional drill-down, resource allocation |
| Health Extension Worker (HEW) | Mobile | Field data entry (offline-first), receive outbreak alerts |
| Public User (community / traveler) | Mobile | Check location risk, get prevention tips, find clinics |

## 4. Core capabilities

### Web (institutional)
- Role-based auth (RBAC) with audit logs.
- Weekly surveillance data upload + validation workflow (validate → correct → approve → version).
- Real-time dashboards: case counts, trends, predicted outbreak zones.
- GIS heatmaps with hierarchical drill-down: **National → Region → Zone → District (Woreda) → Kebele**.
- AI risk prediction (Low/Medium/High) with **explainability** (e.g., "high rainfall + rising weekly trend").
- Early-warning detection of abnormal increases; auto alerts via SMS + in-app + dashboard.
- Resource-allocation decision support (meds, IRS spraying campaigns, workforce).
- Report export (PDF/CSV/Excel). Configurable risk thresholds.

### Mobile (field + public)
- HEW offline-first case entry; auto-sync when network returns.
- Outbreak push notifications + SMS for HEWs.
- Public: location-based risk, destination risk checker (pre-travel), weekly trend view, prevention checklist, symptom self-checker (non-diagnostic), GPS-based nearby health facilities, saved locations for monitoring.

## 5. Architecture

**Pattern:** Layered, service-oriented, API-based.

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation: Web App (React)  |  Mobile App (Flutter)      │
├─────────────────────────────────────────────────────────────┤
│ Application Service Layer (FastAPI)                         │
│   auth · RBAC · validation · workflow orchestration         │
├─────────────────────────────────────────────────────────────┤
│ Analytics & Prediction Layer                                │
│   rule-based + statistical models · SHAP explainability     │
├─────────────────────────────────────────────────────────────┤
│ Data Management Layer (PostgreSQL + PostGIS)                │
│   surveillance · climate · geo · predictions · alerts · logs│
├─────────────────────────────────────────────────────────────┤
│ External Integration: climate APIs · GIS · SMS gateway      │
└─────────────────────────────────────────────────────────────┘
```

**Subsystems:** User Management & Security · Data Collection & Validation · Analysis & Prediction · Visualization & Reporting · Alerting & Notification · Decision Support · External Integration.

## 6. Tech stack

| Layer | Tech |
|-------|------|
| Backend | **Python + FastAPI**, REST APIs, JWT auth |
| ML / AI | **scikit-learn**, pandas, NumPy, **SHAP** (explainability) |
| Web frontend | **React.js**, Chart.js / Recharts, **Leaflet.js** (GIS) |
| Mobile | **Flutter** (Android primary), **Hive** (offline local store) |
| Database | **PostgreSQL + PostGIS** (geospatial) |
| Notifications | Push (FCM-style) + SMS gateway |
| Tooling | Git/GitHub, Postman, VS Code |

**Branding:** Product name is **MalaSafe**. Tagline used in mockups: "Empowering national malaria surveillance through data-driven decision support and real-time analytics."

## 7. Data model (entities)

- **Role** (id, name, description)
- **User** (id, name, email, phone, password_hash, status, role_id)
- **Geographic_Location** (id, name, level, parent_location_id) — recursive hierarchy
- **Surveillance_Data** (id, week_number, year, confirmed_cases, suspected_cases, plasmodium_type, status, version, location_id, reported_by)
- **Climate_Data** (id, week_number, year, rainfall, temperature, humidity, vegetation_index, location_id)
- **Risk_Prediction** (id, week_number, year, risk_level, risk_score, explanation, location_id)
- **Alert** (id, alert_type, severity, message, location_id, prediction_id)
- **Notification** (id, delivery_method, status, sent_at, user_id, alert_id)
- **Audit_Log** (id, action, timestamp, ip_address, user_id)

Relationships: User→Role (n:1); Location self-references for hierarchy; Surveillance/Climate/Risk_Prediction tie to Location; Risk_Prediction → Alert → Notification; Audit logs track all user actions.

## 8. AI / ML — data, training, prediction (the part we're building)

### 8.1 Data sources (training + inference inputs)

| Stream | Source | Granularity | Notes |
|--------|--------|-------------|-------|
| Malaria surveillance | EPHI / MoH (DHIS2, ePHEM); weekly aggregates from health facilities + HEWs | per kebele/woreda, per ISO week | confirmed + suspected cases, plasmodium type, version-controlled |
| Climate | Public climate APIs (rainfall, temperature, humidity, vegetation index) | per location, per week | synthetic data acceptable for v1 (thesis used it) |
| Geographic | Spatial / GIS layers, admin boundary hierarchy (Region→Zone→Woreda→Kebele), endemicity class | per location | PostGIS-backed |
| Historical alerts + outcomes | System's own `Alert` + `Risk_Prediction` tables | per prediction | used to evaluate alert effectiveness over time (feedback loop) |

**Training corpus for v1 (thesis baseline):** anonymized historical malaria surveillance datasets from EPHI + synthetic climate data (rainfall/temperature) simulating various outbreak scenarios.

### 8.2 v1 model — rule-based + statistical (this is what we're shipping first)

Per `(location, week)` tuple, compute:

**Features (4 core indicators):**
1. Previous malaria case counts (lag values, e.g., t-1, t-2, t-4)
2. Week-over-week trend delta (Δ cases, % change)
3. Seasonal rainfall pattern (current week rainfall vs seasonal baseline)
4. Geographic endemicity classification (categorical: high / moderate / low endemic zone)

**Scoring:** Weighted threshold model → `risk_score` (float) → bucketed into **Low / Medium / High** via configurable thresholds (admin-tunable, not hard-coded — see FR-WEB-07).

**Explainability:** Each `Risk_Prediction` stores a structured `explanation` payload of contributing factors with directional weights. UI surfaces them like:
- Rainfall (past 14d): +40.1%
- Vector density: +28.4%
- Past weekly trends: +12.0%
- Bed net distribution: −4.5% (protective)

Style is SHAP-like even though v1 doesn't run SHAP — rule weights are exposed as if they were feature contributions, so the UI contract is forward-compatible with a real SHAP model.

### 8.3 Data pipeline (must exist before training is meaningful)

```
HEW mobile (Hive offline) ──► sync ──┐
EPHI batch upload (CSV/XLSX) ────────┤
                                     ▼
              Validation (completeness, conflict detection, version)
                                     ▼
              EPHI officer approval (reject / fix / approve)
                                     ▼
              Canonical Surveillance_Data table (versioned)
                                     ▼
              Join w/ Climate_Data + Geographic_Location (PostGIS)
                                     ▼
              Feature builder → Prediction engine → Risk_Prediction
                                     ▼
              Threshold check → Alert → Notification (push/SMS)
```

Validation rules (FR-WEB-02 + Data Integrity NFR):
- Completeness: required fields present per row.
- Consistency: confirmed ≤ suspected; plasmodium type ∈ {falciparum, vivax, mixed, other}.
- Referential: location_id exists in hierarchy.
- Versioning: validated rows are immutable; corrections create a new version.

### 8.4 Libraries (Python)

- **scikit-learn** — model interface, even for rule-based v1 (wrap as `BaseEstimator` so swap-in is trivial).
- **pandas / NumPy** — feature engineering, time-series alignment.
- **SHAP** — explainability layer (rule weights for v1, real SHAP values once a tree model lands).
- **PostGIS via SQLAlchemy / asyncpg** — spatial queries for GIS-aware features.

### 8.5 v2+ roadmap (thesis explicitly recommends)

- **Tree ensembles** with SHAP: Random Forest, XGBoost (literature precedent — Awe et al., 2025, malaria diagnosis).
- **Hybrid time-series + NN**: ARIMA-GRU (Kamana & Zhao, 2023, demonstrated higher accuracy when external shocks distort linear trends — useful for COVID-style disruptions or Anopheles stephensi invasion).
- **EPIDEMIA-style climate-informed early warning** as a benchmark — it's the closest existing system to MalaSafe but is regionally piloted, not nationwide.
- Trigger condition: deep learning models become viable once **10+ years of clean historical data** is available (current EPHI archive is the gating factor).

### 8.6 Evaluation strategy

| Metric | Target | How measured |
|--------|--------|--------------|
| High-risk identification accuracy | ≥ 89% (thesis benchmark) | Backtested against historical outbreaks; "did the model flag known high-risk weeks?" |
| Explanation correctness | Qualitative — health officials accept reasoning | UAT with EPHI/MoH officers |
| Alert effectiveness | Tracked over time | `Alert` history table: did flagged outbreaks materialize? (precision/recall on retrospective data) |
| Prediction latency | "Reasonable for real-time decision support" | Time from data ingest → Risk_Prediction row |
| Heatmap render | < 5s on 3G/4G | Frontend perf test |

### 8.7 Known constraints (carry these into training design)

- **Data quality varies by region** — some woredas have sparse/late reporting. Feature builder must handle missingness (impute vs drop vs flag).
- **No fine-grained climate data** in some areas — fall back to woreda-level averages.
- **Class imbalance** — most location-weeks are Low risk. Outbreak weeks are rare → use stratified sampling, threshold tuning, possibly SMOTE for tree models.
- **Concept drift** — Anopheles stephensi is expanding urban malaria; insecticide resistance is rising; HRP2/3 deletions affect RDT-based reporting. Re-train cadence + monitoring of feature distributions are required, not optional.
- **Explainability is non-negotiable** — health officials must trust the output. Black-box models without SHAP/equivalent will be rejected at UAT.

## 9. Non-functional targets

- Dashboard / GIS load: **< 3s** on normal network, **< 5s** on 3G/4G.
- Offline → online sync: automatic on reconnect, **100% data integrity**, conflict resolution.
- SMS / push alert delivery: **within ~60s** of high-risk detection.
- 24/7 availability except announced maintenance; backup + recovery.
- HTTPS/TLS in transit, hashed credentials at rest, JWT sessions, RBAC enforced at DB + app layers.
- Scalable: add regions, kebeles, new diseases (dengue, yellow fever) without architectural rewrite.

## 10. Key user flows

**HEW field flow:** Login → select role → enter case (offline OK) → save locally (Hive) → auto-sync to FastAPI when online → EPHI officer validates → enters AI pipeline.

**EPHI flow:** Login → upload weekly batch (CSV/Excel, drag-drop validation center) → review conflicts → approve → trigger prediction → view dashboard with heatmap + explainable prediction panel → generate intervention plan → export report.

**Public user flow:** Login → location-based risk card on home → destination risk checker before travel → prevention checklist → nearby clinic via GPS → save locations for live monitoring.

**Alert flow:** Prediction crosses high-risk threshold for a woreda → event-driven trigger → push to all registered HEWs in that area + dashboard alert for zonal/regional officers + SMS fallback for offline users.

## 11. Scope boundaries (explicit non-goals)

- Not a clinical diagnosis tool — symptom checker is guidance only.
- Does not replace DHIS2/ePHEM — complements them; full HMIS API integration is future work.
- v1 uses rule-based + statistical AI, not deep learning (data constraints).
- Nationwide deployment, long-term ops evaluation, and policy adoption are out of scope (future research).

## 12. Validated test outcomes (from thesis)

| Test | Result |
|------|--------|
| RBAC enforcement (HEW vs Admin) | Pass |
| Offline entry → sync, no duplicates | Pass |
| AI flags "High Risk" from 30% rainfall surge | Pass |
| Risk heatmap renders w/ tooltips | Pass |
| SMS/push within 15s of trigger | Pass |
| Dashboard renders 10k+ records in 3.8s | Pass |
| Explainability shows "Rainfall" as key factor | Pass |
| GPS nearby clinic lookup | Pass |

## 13. Stakeholders mentioned

- **EPHI** (Ethiopian Public Health Institute) — primary data owner
- **MoH** (Ministry of Health) — policy + intervention
- **Regional / Zonal Health Offices**
- **Health Extension Workers (HEWs)** — last-mile rural workforce
- **General public + travelers**

---

**Use this brief as the canonical context for any follow-up LLM work on MalaSafe** (planning, code generation, design review, etc.). The original 79-page thesis lives at `temp/An_AI_Powered_Integrated_Early_Warning_and_Decision_Support_System.pdf`.
