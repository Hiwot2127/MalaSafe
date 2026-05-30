# MalaSafe Docker Setup Guide

This guide explains how to run MalaSafe using Docker for both development and production environments.

## 📋 Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository
- **Minimum System Requirements**:
  - 4GB RAM
  - 10GB free disk space
  - 2 CPU cores

## 🏗️ Architecture Overview

MalaSafe uses a multi-container Docker architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        MalaSafe Stack                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Frontend   │─────▶│   Backend    │                     │
│  │  (Next.js)   │      │  (FastAPI)   │                     │
│  │  Port: 3000  │      │  Port: 8000  │                     │
│  └──────────────┘      └───────┬──────┘                     │
│                                 │                             │
│                    ┌────────────┼────────────┐               │
│                    │            │            │               │
│              ┌─────▼────┐  ┌───▼────┐  ┌───▼──────┐        │
│              │ Postgres │  │ Redis  │  │  Celery  │        │
│              │  (DB)    │  │(Cache) │  │ Workers  │        │
│              └──────────┘  └────────┘  └──────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Services

1. **Frontend** - Next.js web application (Port 3000)
2. **Backend** - FastAPI REST API (Port 8000)
3. **PostgreSQL** - Primary database (Port 5432)
4. **Redis** - Cache and message broker (Port 6379)
5. **Celery Worker** - Background task processor
6. **Celery Beat** - Periodic task scheduler

## 🚀 Quick Start (Development)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MalaSafe
```

### 2. Start All Services

```bash
docker compose up --build
```

This single command will:
- Build all Docker images
- Start all services
- Run database migrations
- Enable hot reload for development

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000/api/v1/health

### 4. Stop All Services

```bash
# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (clean slate)
docker compose down -v
```

## 🔧 Development Workflow

### Hot Reload

Both frontend and backend support hot reload in development mode:

- **Backend**: Edit files in `backend/` - uvicorn will auto-reload
- **Frontend**: Edit files in `frontend/` - Next.js will auto-reload

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f celery-worker
```

### Run Database Migrations

```bash
# Migrations run automatically on startup, but you can run manually:
docker compose exec backend alembic upgrade head

# Create a new migration
docker compose exec backend alembic revision --autogenerate -m "description"
```

### Access Database

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U malasafe -d malasafe

# Run SQL queries
docker compose exec postgres psql -U malasafe -d malasafe -c "SELECT COUNT(*) FROM users;"
```

### Access Redis

```bash
# Connect to Redis CLI
docker compose exec redis redis-cli

# Check cache keys
docker compose exec redis redis-cli KEYS "*"
```

### Execute Backend Commands

```bash
# Open backend shell
docker compose exec backend sh

# Run Python scripts
docker compose exec backend python -m app.scripts.seed_data

# Run tests
docker compose exec backend pytest
```

### Restart Individual Services

```bash
# Restart backend only
docker compose restart backend

# Rebuild and restart backend
docker compose up -d --build backend
```

## 🏭 Production Deployment

### 1. Prepare Environment Files

```bash
# Root environment (database credentials)
cp .env.example .env

# Backend environment
cp backend/.env.docker.example backend/.env.production

# Frontend environment
cp frontend/.env.docker.example frontend/.env.production
```

### 2. Configure Environment Variables

Edit `.env`:
```bash
POSTGRES_PASSWORD=your-secure-password
REDIS_PASSWORD=your-redis-password
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
```

Edit `backend/.env.production`:
```bash
SECRET_KEY=your-super-secret-jwt-key
DATABASE_URL=postgresql+asyncpg://malasafe:your-secure-password@postgres:5432/malasafe
CELERY_BROKER_URL=redis://:your-redis-password@redis:6379/1
SENTRY_DSN=your-sentry-dsn
CORS_ORIGINS=["https://your-domain.com"]
```

Edit `frontend/.env.production`:
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
```

### 3. Deploy with Production Compose

```bash
# Build and start in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker-compose.prod.yml ps
```

### 4. Verify Deployment

```bash
# Check backend health
curl http://localhost:8000/api/v1/health

# Check frontend
curl http://localhost:3000
```

### 5. Production Management

```bash
# Stop services
docker compose -f docker-compose.prod.yml down

# Update and restart
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build

# View resource usage
docker stats
```

## 📦 Docker Images

### Image Sizes (Approximate)

- **Backend**: ~500MB (Python 3.11 + dependencies)
- **Frontend**: ~150MB (Node.js + Next.js build)
- **PostgreSQL**: ~230MB (Official Alpine image)
- **Redis**: ~30MB (Official Alpine image)

### Multi-Stage Builds

Both backend and frontend use multi-stage builds for optimization:

- **Development stage**: Includes dev dependencies, hot reload
- **Production stage**: Minimal dependencies, optimized for size and security

## 🔒 Security Considerations

### Development

- Uses default passwords (fine for local development)
- Debug mode enabled
- All ports exposed to host

### Production

- **Change all default passwords**
- **Generate secure SECRET_KEY**: `openssl rand -hex 32`
- **Enable HTTPS** with reverse proxy (nginx/Caddy)
- **Restrict CORS origins** to your domain
- **Configure Sentry** for error tracking
- **Use Docker secrets** for sensitive data (advanced)

## 🗂️ Data Persistence

### Volumes

Docker volumes persist data across container restarts:

- `postgres_data` - Database files
- `redis_data` - Redis persistence
- `backend_uploads` - Uploaded CSV files
- `backend_logs` - Application logs
- `backend_models` - ML model files

### Backup Database

```bash
# Create backup
docker compose exec postgres pg_dump -U malasafe malasafe > backup.sql

# Restore backup
docker compose exec -T postgres psql -U malasafe malasafe < backup.sql
```

### Clear All Data

```bash
# WARNING: This deletes all data
docker compose down -v
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead of 3000
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres
```

### Backend Won't Start

```bash
# Check backend logs
docker compose logs backend

# Common issues:
# 1. Database not ready - wait a few seconds
# 2. Migration failed - check migration files
# 3. Missing environment variables - check .env files
```

### Celery Worker Not Processing Tasks

```bash
# Check worker logs
docker compose logs celery-worker

# Check Redis connection
docker compose exec celery-worker redis-cli -h redis ping

# Restart worker
docker compose restart celery-worker
```

### Frontend Build Failed

```bash
# Check frontend logs
docker compose logs frontend

# Clear node_modules and rebuild
docker compose down
docker compose up --build frontend
```

### Out of Disk Space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything (careful!)
docker system prune -a --volumes
```

## 📊 Monitoring

### Health Checks

All services include health checks:

```bash
# Check service health
docker compose ps

# Services should show "healthy" status
```

### Resource Usage

```bash
# Real-time resource monitoring
docker stats

# Check specific container
docker stats malasafe-backend
```

### Logs

```bash
# Follow all logs
docker compose logs -f

# Filter by service
docker compose logs -f backend celery-worker

# Last 100 lines
docker compose logs --tail=100 backend
```

## 🔄 Updates and Maintenance

### Update Dependencies

```bash
# Backend
docker compose exec backend pip install -r requirements.txt

# Frontend
docker compose exec frontend npm install
```

### Rebuild After Code Changes

```bash
# Rebuild specific service
docker compose up -d --build backend

# Rebuild all services
docker compose up -d --build
```

### Database Migrations

```bash
# Create migration
docker compose exec backend alembic revision --autogenerate -m "add new table"

# Apply migration
docker compose exec backend alembic upgrade head

# Rollback migration
docker compose exec backend alembic downgrade -1
```

## 🎓 For Examiners/Supervisors

To quickly demo the project:

```bash
# 1. Clone repository
git clone <repository-url>
cd MalaSafe

# 2. Start everything
docker compose up --build

# 3. Wait 30-60 seconds for services to start

# 4. Open browser
# - Frontend: http://localhost:3000
# - API Docs: http://localhost:8000/api/docs
```

That's it! No manual installation of Python, Node.js, PostgreSQL, or Redis required.

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker compose logs -f`
2. Verify environment variables are set correctly
3. Ensure Docker and Docker Compose are up to date
4. Try a clean rebuild: `docker compose down -v && docker compose up --build`

---

**Last Updated**: May 2026  
**MalaSafe Version**: 1.0.0
