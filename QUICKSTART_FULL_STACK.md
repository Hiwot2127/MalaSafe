# 🚀 MalaSafe Full Stack Quick Start Guide

Complete guide to run the MalaSafe malaria surveillance system (Backend + Frontend + Mobile + AI/ML).

---

## 📋 Prerequisites

### Required Software
- **Python 3.9+** - Backend runtime
- **Node.js 18+** - Frontend runtime
- **PostgreSQL 14+** - Database
- **Git** - Version control

### Check Installations
```bash
python --version  # Should be 3.9+
node --version    # Should be 18+
psql --version    # Should be 14+
```

---

## 🗄️ Step 1: Database Setup

### Create PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE malasafe;

# Create user (optional)
CREATE USER malasafe_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE malasafe TO malasafe_user;

# Exit
\q
```

---

## 🔧 Step 2: Backend Setup

### Navigate to Backend
```bash
cd backend
```

### Create Virtual Environment
```bash
# macOS / Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Configure Environment
```bash
# macOS / Linux
cp .env.example .env

# Windows
copy .env.example .env

# Edit .env with your settings
```

**`.env` Configuration:**
```env
# Database — async DSN used by the app at runtime
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/malasafe

# Sync DSN used by Alembic for migrations
DATABASE_URL_SYNC=postgresql://postgres:your_password@localhost:5432/malasafe

# Security — generate with: openssl rand -hex 32
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Environment
ENVIRONMENT=development
```

### Initialize Database
```bash
# Run Alembic migrations
alembic upgrade head

# Or use setup script
python setup_database.py
```

### Create Admin User
```bash
python create_admin.py
```

`create_admin.py` is interactive — it prompts for email and password and
enforces password strength (8+ chars, upper, lower, digit, special). Pick a
strong password at the prompt; there is no hardcoded default.

### Start Backend Server
```bash
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the batch script (Windows)
run.bat
```

**Backend should be running at:** http://localhost:8000

**API Documentation:** http://localhost:8000/api/docs

---

## 🎨 Step 3: Frontend Setup

### Open New Terminal

### Navigate to Frontend
```bash
cd frontend
```

### Install Dependencies
```bash
npm install
```

### Configure Environment
```bash
# Copy environment template
copy .env.local.example .env.local

# Edit .env.local
```

**`.env.local` Configuration:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Start Frontend Server
```bash
npm run dev
```

**Frontend should be running at:** http://localhost:3000

---

## 📱 Step 4: Mobile App Setup (Optional)

### Open New Terminal

### Navigate to Mobile
```bash
cd mobile
```

### Install Dependencies
```bash
npm install
```

### Configure API URL
Edit `mobile/services/api.js` and update the BASE_URL:
```javascript
const BASE_URL = 'http://localhost:8000/api/v1';
// For physical device, use your computer's IP:
// const BASE_URL = 'http://192.168.1.x:8000/api/v1';
```

### Start Expo Development Server
```bash
npx expo start
```

### Run on Device/Simulator
- **Android:** Press `a` or scan QR with Expo Go app
- **iOS:** Press `i` or scan QR with Camera app
- **Web:** Press `w` (limited functionality)

**Mobile app should be running on your device via Expo Go**

---

## 🤖 Step 5: AI/ML System Setup (Optional)

No extra infrastructure required — no Redis, no Celery, no message broker.
The monthly prediction pipeline runs in-process via `asyncio.create_task`
when CSV uploads land, and ad-hoc / scheduled runs are triggered by hitting
the API directly.

### Seed Initial Data
```bash
cd backend
python scripts/seed_districts.py          # Load 1,082 districts
python scripts/seed_climate_history.py    # Load 48,000+ climate records
python scripts/seed_malaria_history.py    # Load historical malaria data
python scripts/compute_baselines.py       # Compute district baselines
python scripts/backfill_predictions.py    # Generate initial predictions
```

### Trigger the monthly prediction batch

Manually (any time), with a valid admin JWT:

```bash
curl -X POST http://localhost:8000/api/v1/monthly-close/predict-monthly \
  -H "Authorization: Bearer $ADMIN_JWT"
```

For production, schedule the same call from external cron — Render Cron
Jobs or a GitHub Actions workflow on the 5th of each month — instead of
running a worker process. There is no embedded scheduler.

**The pipeline will:**
- Generate next-month predictions for every mapped district
- Create outbreak alerts for high-risk districts
- Update risk classifications

📖 [AI System Details](AI_INTEGRATION_NOTES.md)

---

## ✅ Step 6: Verify Installation

### Check Backend
1. Visit http://localhost:8000/api/docs
2. Should see FastAPI Swagger documentation
3. Try the health check endpoint: http://localhost:8000/health

### Check Frontend
1. Visit http://localhost:3000
2. Should redirect to login page
3. Log in with the email + password you set in `create_admin.py`
4. Should redirect to dashboard

### Check Mobile (if installed)
1. Open Expo Go app on your device
2. Scan QR code from terminal
3. App should load with dashboard
4. View risk data and maps

---

## 🧪 Step 7: Test the System

### Test Authentication
1. Login with admin credentials
2. Verify redirect to dashboard
3. Check user info in header
4. Test logout

### Test Dashboard
1. View statistics cards
2. Check if data loads (may be empty initially)

### Test Upload
1. Navigate to Upload page
2. Download a template
3. Fill with sample data
4. Upload the CSV
5. Verify success message

### Test Analytics
1. Navigate to Analytics page
2. Toggle between weekly/monthly
3. View trends table

### Test Maps
1. Navigate to Maps page
2. View district list
3. Filter by region

### Test Alerts
1. Navigate to Alerts page
2. View alert list
3. Filter by status and risk level

### Test Predictions (after seeding + backfill from Step 5)
1. Navigate to Analytics page
2. View prediction charts
3. Check confidence intervals
4. Review risk classifications

---

## � Troubleshootingt

### Backend Issues
- **Database Connection Error**: Check PostgreSQL is running and verify DATABASE_URL in .env
- **Import Errors**: `pip install -r requirements.txt --force-reinstall`
- **Port Already in Use**: Change port with `uvicorn app.main:app --reload --port 8001`

### Frontend Issues
- **Module Not Found**: `rm -rf node_modules package-lock.json && npm install`
- **API Connection Error**: Verify backend is running at http://localhost:8000/health
- **Build Errors**: `rm -rf .next && npm run dev`

### Mobile Issues
- **Expo Connection Error**: Ensure device and computer are on same network
- **API Not Reachable**: Use computer's IP address instead of localhost in api.js

---

## 🛠️ Development Workflow

**Backend (macOS / Linux):** `cd backend && source venv/bin/activate && uvicorn app.main:app --reload`

**Backend (Windows):** `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload`

**Frontend:** `cd frontend && npm run dev`

**Mobile:** `cd mobile && npx expo start`

**Database Migrations:**
```bash
cd backend
alembic revision --autogenerate -m "description"  # Create migration
alembic upgrade head                                # Apply migrations
alembic downgrade -1                                # Rollback
```

---

## 📁 Project Structure

```
MalaSafe/
├── backend/          # FastAPI Backend (app/, models/, routes/, services/)
├── frontend/         # Next.js Frontend (app/, components/, lib/, types/)
├── mobile/           # React Native Mobile (app/, components/, services/)
└── README.md
```

---

## 🌐 API Endpoints

**Auth:** Login, Get user, Create official, Register  
**Analytics:** Dashboard stats, Trends  
**Uploads:** Upload malaria/climate data, Download templates  
**Maps:** Risk heatmap GeoJSON  
**Alerts:** Get/Create alerts  
**Predictions:** Generate prediction, Prediction history  
**Mobile:** Register, Risk dashboard

📖 Full API docs at http://localhost:8000/api/docs

---

## 🔐 Users

**First admin:** created interactively by `python create_admin.py` — pick a
strong password at the prompt (8+ chars, upper, lower, digit, special).

Create additional users via:
- Officials: `POST /api/v1/auth/create-official` (admin only)
- Public: `POST /api/v1/mobile/register`

---

## 📝 Environment Variables

**Backend (.env):**
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/malasafe
DATABASE_URL_SYNC=postgresql://user:pass@localhost:5432/malasafe
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:3000
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Mobile (services/api.js):**
```javascript
const BASE_URL = 'http://localhost:8000/api/v1';
```

---

## 🚀 Production Deployment

**Backend:** `pip install -r requirements.txt && gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker`

**Frontend:** `npm run build && npm start`

Set `ENVIRONMENT=production` in backend .env

---

## 📚 Additional Resources

- **API Docs**: http://localhost:8000/api/docs
- **AI Integration**: `AI_INTEGRATION_NOTES.md`
- **Backend README**: `backend/README.md`
- **Mobile README**: `mobile/README.md`

---

## ✅ Quick Checklist

- [ ] PostgreSQL installed and running
- [ ] Python 3.9+ installed
- [ ] Node.js 18+ installed
- [ ] Database created
- [ ] Backend dependencies installed
- [ ] Backend .env configured
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Backend server running (port 8000)
- [ ] Frontend dependencies installed
- [ ] Frontend .env.local configured
- [ ] Frontend server running (port 3000)
- [ ] Login successful
- [ ] Dashboard loads
- [ ] (Optional) Mobile app running on device
- [ ] (Optional) AI/ML system seeded and backfilled

---

## 🎉 You're Ready!

Your MalaSafe malaria surveillance system is now running!

**Backend:** http://localhost:8000  
**Frontend:** http://localhost:3000  
**Mobile:** Expo Go app on your device  
**API Docs:** http://localhost:8000/api/docs

**Login with:** the admin email + password you set when running
`python create_admin.py`.

---

## 💡 Next Steps

1. Upload sample data via CSV upload
2. Explore analytics and trends
3. View risk heatmap
4. Test mobile app on device
5. Trigger a monthly prediction batch via `/api/v1/monthly-close/predict-monthly`
6. Create additional users


