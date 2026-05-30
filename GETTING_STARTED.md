# 🚀 MalaSafe - Getting Started

Quick guide to get MalaSafe running on your machine in under 5 minutes.

## Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Git**
- **4GB RAM** minimum
- **10GB free disk space**

## Installation

### 1. Install Docker

**Windows/Mac**:
- Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Install and start Docker Desktop
- Verify: `docker --version` and `docker compose version`

**Linux**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 2. Clone Repository

```bash
git clone <repository-url>
cd MalaSafe
```

### 3. Start Application

```bash
docker compose up --build
```

**Wait 60-120 seconds** for all services to start.

## Access the Application

Once all services are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000/api/v1/health

## Default Credentials

**Admin User**:
- Email: `admin@malasafe.com`
- Password: `admin123`

**MOH User**:
- Email: `moh@malasafe.com`
- Password: `moh123`

**District User**:
- Email: `district@malasafe.com`
- Password: `district123`

> ⚠️ **Note**: These are development credentials. Change them in production!

## Quick Tour

### 1. Login
- Go to http://localhost:3000
- Login with admin credentials
- You'll see the dashboard

### 2. View Dashboard
- See malaria statistics
- View recent predictions
- Check active alerts

### 3. Upload Data
- Click "Upload Data" in sidebar
- Download CSV template
- Upload malaria case data
- Preview and confirm

### 4. View Risk Map
- Click "Risk Map" in sidebar
- See color-coded districts
- Click districts for details
- Filter by risk level

### 5. Generate Predictions
- Click "Predictions" in sidebar
- Click "Generate Prediction"
- Select district and date
- View prediction with SHAP explanation

### 6. View Recommendations
- After generating prediction
- Click "View Recommendations"
- See actionable response plan
- Organized by category and priority

### 7. Export Reports
- Go to Analytics
- Click "Export PDF"
- Download district report

## Common Commands

### Start Application
```bash
docker compose up
```

### Start in Background
```bash
docker compose up -d
```

### Stop Application
```bash
docker compose down
```

### View Logs
```bash
docker compose logs -f
```

### Restart Service
```bash
docker compose restart backend
```

### Clean Restart
```bash
docker compose down -v
docker compose up --build
```

## Troubleshooting

### Port Already in Use

**Error**: `port is already allocated`

**Solution**: Change port in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Use 3001 instead of 3000
```

### Services Not Starting

**Check logs**:
```bash
docker compose logs backend
docker compose logs postgres
```

**Common issues**:
1. Docker not running → Start Docker Desktop
2. Not enough memory → Increase Docker memory limit
3. Port conflicts → Change ports in docker-compose.yml

### Database Connection Failed

**Wait for services**:
```bash
# Services take 60-120 seconds to start
# Check status:
docker compose ps
```

**Restart if needed**:
```bash
docker compose restart backend
```

### Out of Disk Space

**Clean up Docker**:
```bash
docker system prune -a --volumes
```

## Project Structure

```
MalaSafe/
├── backend/          # FastAPI backend
├── frontend/         # Next.js frontend
├── mobile/           # React Native mobile app
├── docker-compose.yml    # Development setup
└── DOCKER_SETUP.md      # Detailed documentation
```

## Key Features

✅ **Dashboard** - Real-time malaria statistics  
✅ **Risk Maps** - Interactive district-level maps  
✅ **Predictions** - AI-powered malaria risk forecasting  
✅ **SHAP Explanations** - Understand prediction factors  
✅ **Recommendations** - Actionable response plans  
✅ **PDF Export** - Generate district reports  
✅ **Alerts** - High-risk notifications  
✅ **Multi-User** - Admin, MOH, District roles  

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Backend**: FastAPI, Python, SQLAlchemy
- **Database**: PostgreSQL
- **Cache**: Redis
- **Background Tasks**: Celery
- **AI/ML**: LightGBM, SHAP
- **Deployment**: Docker, Docker Compose

## Documentation

- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Complete Docker guide
- **[DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)** - Production deployment
- **[DOCKER_README.md](./DOCKER_README.md)** - Quick command reference
- **[DOCKER_ARCHITECTURE.md](./DOCKER_ARCHITECTURE.md)** - Architecture details
- **[API_REFERENCE.md](./backend/API_REFERENCE.md)** - API documentation
- **[README.md](./README.md)** - Project overview

## Development Workflow

### 1. Start Services
```bash
docker compose up -d
```

### 2. Watch Logs
```bash
docker compose logs -f backend
```

### 3. Make Changes
- Edit files in `backend/` or `frontend/`
- Changes auto-reload (hot reload enabled)

### 4. Run Tests
```bash
# Backend tests
docker compose exec backend pytest

# E2E tests
cd frontend
npm run test:e2e
```

### 5. Stop Services
```bash
docker compose down
```

## Production Deployment

For production deployment, see [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md).

Quick production start:
```bash
# Configure environment
cp .env.example .env
cp backend/.env.docker.example backend/.env.production
cp frontend/.env.docker.example frontend/.env.production

# Edit with secure credentials
nano .env
nano backend/.env.production
nano frontend/.env.production

# Deploy
docker compose -f docker-compose.prod.yml up -d --build
```

## Getting Help

### Check Logs
```bash
docker compose logs -f
```

### Check Service Status
```bash
docker compose ps
```

### Restart Everything
```bash
docker compose down
docker compose up --build
```

### Clean Slate
```bash
docker compose down -v  # ⚠️ Deletes all data
docker compose up --build
```

## Next Steps

1. ✅ Start the application
2. ✅ Login and explore features
3. ✅ Upload sample data
4. ✅ Generate predictions
5. ✅ View recommendations
6. ✅ Export reports
7. 📖 Read [DOCKER_SETUP.md](./DOCKER_SETUP.md) for details
8. 🚀 Deploy to production (see [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md))

## Support

For issues or questions:
1. Check logs: `docker compose logs -f`
2. Check documentation in `DOCKER_SETUP.md`
3. Verify Docker is running: `docker ps`
4. Try clean restart: `docker compose down -v && docker compose up --build`

---

**Ready to start?** Run `docker compose up --build` and visit http://localhost:3000

**Questions?** Check [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed documentation.

**Last Updated**: May 30, 2026  
**MalaSafe Version**: 1.0.0
