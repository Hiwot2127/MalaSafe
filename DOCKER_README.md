# 🐳 MalaSafe Docker Quick Reference

Quick reference guide for common Docker operations with MalaSafe.

## 🚀 Quick Start

```bash
# Start everything (development)
docker compose up --build

# Start in background
docker compose up -d --build

# Stop everything
docker compose down

# Stop and remove all data
docker compose down -v
```

## 📋 Common Commands

### Service Management

```bash
# Start specific service
docker compose up backend

# Restart service
docker compose restart backend

# Stop service
docker compose stop backend

# Remove service
docker compose rm backend

# Rebuild service
docker compose up -d --build backend
```

### Logs

```bash
# View all logs
docker compose logs

# Follow logs (live)
docker compose logs -f

# Specific service logs
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend

# Logs since timestamp
docker compose logs --since 2024-01-01T00:00:00
```

### Service Status

```bash
# List running services
docker compose ps

# List all services (including stopped)
docker compose ps -a

# Service resource usage
docker stats
```

### Execute Commands

```bash
# Backend shell
docker compose exec backend sh

# Run Python command
docker compose exec backend python -m app.scripts.seed_data

# Run tests
docker compose exec backend pytest

# Database shell
docker compose exec postgres psql -U malasafe -d malasafe

# Redis CLI
docker compose exec redis redis-cli
```

### Database Operations

```bash
# Run migrations
docker compose exec backend alembic upgrade head

# Create migration
docker compose exec backend alembic revision --autogenerate -m "description"

# Rollback migration
docker compose exec backend alembic downgrade -1

# Backup database
docker compose exec postgres pg_dump -U malasafe malasafe > backup.sql

# Restore database
docker compose exec -T postgres psql -U malasafe malasafe < backup.sql

# Connect to database
docker compose exec postgres psql -U malasafe -d malasafe
```

### Redis Operations

```bash
# Connect to Redis
docker compose exec redis redis-cli

# List all keys
docker compose exec redis redis-cli KEYS "*"

# Clear cache
docker compose exec redis redis-cli FLUSHDB

# Get key value
docker compose exec redis redis-cli GET "key_name"
```

### Celery Operations

```bash
# View worker logs
docker compose logs -f celery-worker

# Restart worker
docker compose restart celery-worker

# Check worker status
docker compose exec celery-worker celery -A app.tasks.celery_app inspect active

# Purge all tasks
docker compose exec celery-worker celery -A app.tasks.celery_app purge
```

## 🏭 Production Commands

```bash
# Start production stack
docker compose -f docker-compose.prod.yml up -d --build

# View production logs
docker compose -f docker-compose.prod.yml logs -f

# Stop production stack
docker compose -f docker-compose.prod.yml down

# Update production
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build

# Backup production database
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U malasafe malasafe > backup_$(date +%Y%m%d).sql
```

## 🧹 Cleanup Commands

```bash
# Remove stopped containers
docker compose down

# Remove containers and volumes
docker compose down -v

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything (careful!)
docker system prune -a --volumes

# Remove specific volume
docker volume rm malasafe_postgres_data
```

## 🔍 Debugging

```bash
# Check service health
docker compose ps

# Inspect service
docker compose inspect backend

# View service configuration
docker compose config

# Check resource usage
docker stats

# View container processes
docker compose top

# Check network
docker network ls
docker network inspect malasafe_malasafe-network
```

## 📦 Image Management

```bash
# List images
docker images

# Remove image
docker rmi malasafe-backend

# Pull latest images
docker compose pull

# Build without cache
docker compose build --no-cache

# Tag image
docker tag malasafe-backend:latest malasafe-backend:v1.0.0
```

## 🔐 Security

```bash
# Scan image for vulnerabilities
docker scan malasafe-backend

# Check image layers
docker history malasafe-backend

# Inspect image
docker inspect malasafe-backend
```

## 📊 Monitoring

```bash
# Real-time stats
docker stats

# Container events
docker events

# System info
docker info

# Disk usage
docker system df
```

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :8000

# Change port in docker-compose.yml
ports:
  - "8001:8000"
```

### Service Won't Start

```bash
# Check logs
docker compose logs backend

# Check health
docker compose ps

# Restart service
docker compose restart backend

# Rebuild service
docker compose up -d --build backend
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres

# Wait for PostgreSQL to be ready
docker compose exec backend sh -c "until pg_isready -h postgres -U malasafe; do sleep 1; done"
```

### Out of Disk Space

```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes

# Remove specific volumes
docker volume ls
docker volume rm <volume_name>
```

### Container Keeps Restarting

```bash
# Check logs
docker compose logs --tail=100 backend

# Check exit code
docker compose ps

# Disable restart
docker compose up --no-deps backend
```

## 🎯 Development Workflow

```bash
# 1. Start services
docker compose up -d

# 2. Watch logs
docker compose logs -f backend

# 3. Make code changes (hot reload enabled)

# 4. Run migrations if needed
docker compose exec backend alembic upgrade head

# 5. Run tests
docker compose exec backend pytest

# 6. Stop services
docker compose down
```

## 📚 Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
# Docker Compose shortcuts
alias dc='docker compose'
alias dcu='docker compose up'
alias dcd='docker compose down'
alias dcl='docker compose logs -f'
alias dcp='docker compose ps'
alias dcr='docker compose restart'

# MalaSafe specific
alias ms-start='docker compose up -d'
alias ms-stop='docker compose down'
alias ms-logs='docker compose logs -f'
alias ms-backend='docker compose exec backend sh'
alias ms-db='docker compose exec postgres psql -U malasafe -d malasafe'
alias ms-migrate='docker compose exec backend alembic upgrade head'
```

## 🔗 Quick Links

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000/api/v1/health

## 📖 Full Documentation

- [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Complete setup guide
- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) - Production deployment guide
- [README.md](./README.md) - Project overview

---

**Tip**: Use `docker compose logs -f` to watch logs in real-time while developing!
