# MalaSafe - Quick Start Guide

**Get MalaSafe running in 10 minutes**

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

---

## Step 1: Clone Repository

```bash
git clone https://github.com/your-org/malasafe.git
cd malasafe
```

---

## Step 2: Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Create admin user
python create_admin.py

# Start backend server
uvicorn app.main:app --reload
```

**Backend running at:** http://localhost:8000  
**API Docs:** http://localhost:8000/api/docs

---

## Step 3: Frontend Setup (3 minutes)

```bash
# Open new terminal
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.example .env
# Edit .env if needed (default: http://localhost:8000)

# Start frontend
npm run dev
```

**Frontend running at:** http://localhost:3000

---

## Step 4: Start Background Workers (2 minutes)

```bash
# Open new terminal
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info --queues=uploads,predictions,climate
```

---

## Step 5: Login

1. Open browser: http://localhost:3000
2. Login with:
   - **Email**: admin@malasafe.gov.et
   - **Password**: admin123 (or what you set in create_admin.py)

---

## Optional: Seed Data

```bash
cd backend
venv\Scripts\activate

# Seed districts (1,082 woredas)
python scripts/seed_districts.py

# Seed climate history
python scripts/seed_climate_history.py

# Compute baselines for predictor
python scripts/compute_baselines.py

# Backfill predictions (optional, takes a few minutes)
python scripts/backfill_predictions.py --limit 100
```

---

## Running Tests

### Backend Tests

```bash
cd backend
venv\Scripts\activate
pytest
```

### E2E Tests

```bash
cd frontend

# Install Playwright (first time only)
npm install -D @playwright/test
npx playwright install

# Run E2E tests
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed
```

---

## Common Issues

### Port Already in Use

**Backend (8000):**
```bash
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8000 | xargs kill -9
```

**Frontend (3000):**
```bash
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

### Database Connection Error

1. Ensure PostgreSQL is running
2. Check DATABASE_URL in `.env`
3. Verify database exists: `psql -U postgres -c "CREATE DATABASE malasafe;"`

### Redis Connection Error

1. Ensure Redis is running
2. Check REDIS_HOST and REDIS_PORT in `.env`
3. Start Redis:
   - Windows: `redis-server`
   - Mac: `brew services start redis`
   - Linux: `sudo systemctl start redis`

---

## Quick Commands Reference

### Backend

```bash
# Start server
uvicorn app.main:app --reload

# Run migrations
alembic upgrade head

# Create migration
alembic revision --autogenerate -m "description"

# Run tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html
```

### Frontend

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run E2E tests
npx playwright test

# View test report
npx playwright show-report
```

### Celery

```bash
# Start worker
celery -A app.tasks.celery_app worker --loglevel=info

# Start beat (scheduler)
celery -A app.tasks.celery_app beat --loglevel=info
```

---

## API Endpoints Quick Reference

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard data
- `GET /api/v1/analytics/trends` - Trend data

### Predictions
- `POST /api/v1/predictions/generate` - Generate prediction
- `POST /api/v1/predictions/generate-batch` - Batch predictions

### Uploads
- `POST /api/v1/uploads/malaria/monthly` - Upload malaria data
- `POST /api/v1/uploads/climate` - Upload climate data

### Exports
- `POST /api/v1/exports/district-report/{id}` - Export district PDF
- `POST /api/v1/exports/analytics-summary` - Export analytics PDF

**Full API Docs:** http://localhost:8000/api/docs

---

## Default Credentials

### Admin User
- **Email**: admin@malasafe.gov.et
- **Password**: admin123 (change in production!)

### Test Users (if seeded)
- **MOH**: moh@malasafe.gov.et / moh123
- **EPHI**: ephi@malasafe.gov.et / ephi123
- **Regional**: regional@malasafe.gov.et / regional123
- **District**: district@malasafe.gov.et / district123

---

## Project Structure

```
MalaSafe/
├── backend/          # FastAPI backend
│   ├── app/          # Application code
│   ├── tests/        # Backend tests
│   └── scripts/      # Seed scripts
├── frontend/         # React frontend
│   ├── src/          # Source code
│   └── e2e/          # E2E tests
└── mobile/           # React Native mobile
```

---

## Next Steps

1. ✅ Backend running
2. ✅ Frontend running
3. ✅ Celery worker running
4. ✅ Logged in
5. 📊 Explore dashboard
6. 📤 Upload data
7. 🗺️ View risk map
8. 🤖 Generate predictions
9. 📄 Export PDF reports
10. 🧪 Run tests

---

## Need Help?

- **API Docs**: http://localhost:8000/api/docs
- **README**: See main README.md
- **Deployment**: See backend/DEPLOYMENT_GUIDE.md
- **AI Integration**: See AI_INTEGRATION_NOTES.md
- **E2E Tests**: See frontend/e2e/README.md

---

**Happy coding! 🚀**
