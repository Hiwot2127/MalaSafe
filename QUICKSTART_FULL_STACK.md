# 🚀 MalaSafe Full Stack Quick Start Guide

Complete guide to run the MalaSafe malaria surveillance system (Backend + Frontend).

---

## 📋 Prerequisites

### Required Software
- **Python 3.9+** - Backend runtime
- **Node.js 18+** - Frontend runtime
- **PostgreSQL 14+** - Database
- **Git** - Version control

### Check Installations
```bash
python --version    # Should be 3.9+
node --version      # Should be 18+
npm --version       # Should be 9+
psql --version      # Should be 14+
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
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Configure Environment
```bash
# Copy environment template
copy .env.example .env

# Edit .env with your settings
```

**`.env` Configuration:**
```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/malasafe

# Security
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

**Default Admin Credentials:**
```
Email: admin@malasafe.gov.et
Password: admin123
```

### Start Backend Server
```bash
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the batch script (Windows)
run.bat
```

**Backend should be running at:** http://localhost:8000

**API Documentation:** http://localhost:8000/docs

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

## ✅ Step 4: Verify Installation

### Check Backend
1. Visit http://localhost:8000/docs
2. Should see FastAPI Swagger documentation
3. Try the health check endpoint: http://localhost:8000/health

### Check Frontend
1. Visit http://localhost:3000
2. Should redirect to login page
3. Enter admin credentials:
   - Email: `admin@malasafe.gov.et`
   - Password: `admin123`
4. Should redirect to dashboard

---

## 🧪 Step 5: Test the System

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

---

## 📊 Sample Data (Optional)

### Create Sample Districts
```python
# Run in Python shell
python

from app.database.base import SessionLocal
from app.models.district import District
import uuid

db = SessionLocal()

districts = [
    District(
        id=uuid.uuid4(),
        district_code="AA001",
        district_name="Addis Ketema",
        region="Addis Ababa",
        zone="Addis Ababa"
    ),
    District(
        id=uuid.uuid4(),
        district_code="OR001",
        district_name="Adama",
        region="Oromia",
        zone="East Shewa"
    ),
]

db.add_all(districts)
db.commit()
db.close()
```

### Upload Sample CSV

Create `sample_weekly_malaria.csv`:
```csv
district_code,week,year,cases,deaths
AA001,1,2026,45,2
AA001,2,2026,52,3
OR001,1,2026,78,5
OR001,2,2026,65,4
```

Upload via the frontend Upload page.

---

## 🔍 Troubleshooting

### Backend Issues

**Database Connection Error**
```bash
# Check PostgreSQL is running
# Windows
sc query postgresql-x64-14

# Verify DATABASE_URL in .env
# Test connection
psql -U postgres -d malasafe
```

**Import Errors**
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

**Port Already in Use**
```bash
# Change port in run command
uvicorn app.main:app --reload --port 8001
```

### Frontend Issues

**Module Not Found**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API Connection Error**
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check NEXT_PUBLIC_API_URL in .env.local
```

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## 🛠️ Development Workflow

### Backend Development
```bash
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Database Migrations
```bash
cd backend
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## 📁 Project Structure

```
MalaSafe/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # Entry point
│   │   ├── models/            # SQLAlchemy models
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utilities
│   ├── alembic/               # Database migrations
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment config
│
├── frontend/                   # Next.js Frontend
│   ├── app/                   # Pages and layouts
│   ├── components/            # React components
│   ├── lib/                   # API and utilities
│   ├── types/                 # TypeScript types
│   ├── package.json           # Node dependencies
│   └── .env.local             # Environment config
│
└── README.md                  # Project documentation
```

---

## 🌐 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/create-official` - Create official user (admin only)

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/trends` - Trend analysis

### Uploads
- `POST /api/v1/uploads/malaria` - Upload malaria data
- `POST /api/v1/uploads/climate` - Upload climate data
- `GET /api/v1/uploads/templates/{type}` - Download templates

### Maps
- `GET /api/v1/maps/risk` - Get risk heatmap GeoJSON

### Alerts
- `GET /api/v1/alerts` - Get alerts
- `GET /api/v1/predictions/history/{district_id}` - Prediction history

---

## 🔐 Default Users

### Admin User
```
Email: admin@malasafe.gov.et
Password: admin123
Role: admin
```

**Create additional users via:**
- Backend: `POST /api/v1/auth/create-official` (admin only)
- Mobile: `POST /api/v1/mobile/register` (public users)

---

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/malasafe
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 🚀 Production Deployment

### Backend
```bash
# Install production dependencies
pip install -r requirements.txt

# Set environment to production
ENVIRONMENT=production

# Use production WSGI server
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend
```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 📚 Additional Resources

- **Backend Documentation**: `backend/README.md`
- **Frontend Documentation**: `FRONTEND_COMPLETE.md`
- **API Documentation**: http://localhost:8000/docs
- **Database Models**: `backend/DATABASE_MODELS.md`
- **Authentication Guide**: `backend/AUTH_DOCUMENTATION.md`
- **CSV Upload Guide**: `backend/CSV_UPLOAD_DOCUMENTATION.md`
- **Analytics Guide**: `ANALYTICS_GIS_COMPLETE.md`

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

---

## 🎉 You're Ready!

Your MalaSafe malaria surveillance system is now running!

**Backend:** http://localhost:8000  
**Frontend:** http://localhost:3000  
**API Docs:** http://localhost:8000/docs

**Login with:**
- Email: `admin@malasafe.gov.et`
- Password: `admin123`

---

## 💡 Next Steps

1. **Upload Sample Data** - Test the CSV upload functionality
2. **Explore Analytics** - View trends and statistics
3. **Check Maps** - View risk heatmap
4. **Review Alerts** - Monitor outbreak alerts
5. **Create Users** - Add more official users
6. **Customize** - Adapt to your specific needs

---

**Happy Coding! 🚀**
