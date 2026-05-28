# 🚀 MalaSafe Backend - Production Deployment Guide

**Version**: 2.0  
**Date**: May 28, 2026  
**Status**: Phase 1 & 2 Complete

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Deployment](#production-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Redis Setup](#redis-setup)
7. [Celery Setup](#celery-setup)
8. [Monitoring Setup](#monitoring-setup)
9. [Security Checklist](#security-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Python 3.11+
- PostgreSQL 14+
- Redis 7+
- pip (Python package manager)

### Optional Software
- Docker & Docker Compose (for containerized deployment)
- Sentry account (for error tracking)
- Flower (for Celery monitoring)

---

## Local Development Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd MalaSafe/backend
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Setup Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your local configuration:
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/malasafe

# Security
SECRET_KEY=your-secret-key-here-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis (optional for development)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Celery (optional for development)
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Environment
ENVIRONMENT=development
DEBUG=true
```

### 5. Setup Database
```bash
# Create database
createdb malasafe

# Run migrations
alembic upgrade head

# Seed data (if available)
python scripts/seed_data.py
```

### 6. Start Redis (Optional)
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
redis-server
```

### 7. Start Application
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 8. Start Celery Worker (Optional)
```bash
# In a separate terminal
celery -A app.tasks.celery_app worker --loglevel=info --queues=uploads,predictions,climate
```

### 9. Verify Installation
- API: http://localhost:8000
- Docs: http://localhost:8000/api/docs
- Health: http://localhost:8000/api/v1/operations/health

---

## Production Deployment

### Architecture Overview
```
┌─────────────────┐
│   Load Balancer │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ API 1 │ │ API 2 │  (FastAPI instances)
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
    ┌────▼────────┐
    │  PostgreSQL │
    └─────────────┘
         │
    ┌────▼────┐
    │  Redis  │
    └────┬────┘
         │
    ┌────▼────────┐
    │   Celery    │
    │   Workers   │
    └─────────────┘
```

### 1. Server Requirements

**Minimum (Small Deployment)**
- CPU: 2 cores
- RAM: 4 GB
- Disk: 50 GB SSD
- Network: 100 Mbps

**Recommended (Production)**
- CPU: 4+ cores
- RAM: 8+ GB
- Disk: 100+ GB SSD
- Network: 1 Gbps

### 2. Install System Dependencies
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv python3-pip postgresql-14 redis-server nginx supervisor

# RHEL/CentOS
sudo yum install -y python311 python311-pip postgresql14-server redis nginx supervisor
```

### 3. Setup Application User
```bash
sudo useradd -m -s /bin/bash malasafe
sudo su - malasafe
```

### 4. Deploy Application
```bash
# Clone repository
git clone <repository-url> /home/malasafe/app
cd /home/malasafe/app/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn  # Production WSGI server
```

### 5. Configure Environment
```bash
cp .env.example .env
nano .env
```

Production `.env`:
```env
# Database
DATABASE_URL=postgresql+asyncpg://malasafe:STRONG_PASSWORD@localhost:5432/malasafe_prod

# Security
SECRET_KEY=GENERATE_STRONG_SECRET_KEY_MIN_32_CHARS
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=["https://malasafe.gov.et","https://app.malasafe.gov.et"]

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=STRONG_REDIS_PASSWORD

# Celery
CELERY_BROKER_URL=redis://:STRONG_REDIS_PASSWORD@localhost:6379/1
CELERY_RESULT_BACKEND=redis://:STRONG_REDIS_PASSWORD@localhost:6379/2

# Sentry (Error Tracking)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production

# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
```

### 6. Setup Database
```bash
# Create production database
sudo -u postgres psql
CREATE DATABASE malasafe_prod;
CREATE USER malasafe WITH PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE malasafe_prod TO malasafe;
\q

# Run migrations
alembic upgrade head
```

### 7. Setup Supervisor (Process Management)

Create `/etc/supervisor/conf.d/malasafe-api.conf`:
```ini
[program:malasafe-api]
command=/home/malasafe/app/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
directory=/home/malasafe/app/backend
user=malasafe
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/malasafe/api.log
environment=PATH="/home/malasafe/app/backend/venv/bin"
```

Create `/etc/supervisor/conf.d/malasafe-celery.conf`:
```ini
[program:malasafe-celery]
command=/home/malasafe/app/backend/venv/bin/celery -A app.tasks.celery_app worker --loglevel=info --queues=uploads,predictions,climate --concurrency=4
directory=/home/malasafe/app/backend
user=malasafe
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/malasafe/celery.log
environment=PATH="/home/malasafe/app/backend/venv/bin"
```

Create `/etc/supervisor/conf.d/malasafe-celery-beat.conf`:
```ini
[program:malasafe-celery-beat]
command=/home/malasafe/app/backend/venv/bin/celery -A app.tasks.celery_app beat --loglevel=info
directory=/home/malasafe/app/backend
user=malasafe
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/malasafe/celery-beat.log
environment=PATH="/home/malasafe/app/backend/venv/bin"
```

Start services:
```bash
sudo mkdir -p /var/log/malasafe
sudo chown malasafe:malasafe /var/log/malasafe
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start malasafe-api malasafe-celery malasafe-celery-beat
```

### 8. Setup Nginx (Reverse Proxy)

Create `/etc/nginx/sites-available/malasafe`:
```nginx
upstream malasafe_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.malasafe.gov.et;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.malasafe.gov.et;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.malasafe.gov.et/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.malasafe.gov.et/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers (additional to app headers)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Client body size (for file uploads)
    client_max_body_size 50M;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    location / {
        proxy_pass http://malasafe_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint (no auth required)
    location /api/v1/operations/health {
        proxy_pass http://malasafe_backend;
        access_log off;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/malasafe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Setup SSL Certificate (Let's Encrypt)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.malasafe.gov.et
```

---

## Environment Configuration

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SECRET_KEY` | JWT signing key (min 32 chars) | `your-secret-key-here` |
| `ENVIRONMENT` | Environment name | `production` |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `SENTRY_DSN` | Sentry error tracking DSN | None |
| `CORS_ORIGINS` | Allowed CORS origins | `["*"]` |
| `LOG_LEVEL` | Logging level | `INFO` |

---

## Database Setup

### Production Database Configuration
```sql
-- Create database
CREATE DATABASE malasafe_prod;

-- Create user
CREATE USER malasafe WITH PASSWORD 'STRONG_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE malasafe_prod TO malasafe;

-- Enable extensions
\c malasafe_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- For GIS features
```

### Backup Strategy
```bash
# Daily backup
pg_dump -U malasafe malasafe_prod | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20260528.sql.gz | psql -U malasafe malasafe_prod
```

---

## Redis Setup

### Production Redis Configuration

Edit `/etc/redis/redis.conf`:
```conf
# Bind to localhost only
bind 127.0.0.1

# Require password
requirepass STRONG_REDIS_PASSWORD

# Persistence
save 900 1
save 300 10
save 60 10000

# Max memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

Restart Redis:
```bash
sudo systemctl restart redis-server
```

---

## Celery Setup

### Worker Configuration

**Concurrency**: Number of worker processes
- Small deployment: 2-4 workers
- Medium deployment: 4-8 workers
- Large deployment: 8-16 workers

**Queues**:
- `uploads`: CSV upload processing
- `predictions`: AI prediction generation
- `climate`: Climate data fetching

### Monitoring with Flower
```bash
# Install Flower
pip install flower

# Start Flower
celery -A app.tasks.celery_app flower --port=5555 --basic_auth=admin:STRONG_PASSWORD

# Access at http://localhost:5555
```

---

## Monitoring Setup

### 1. Sentry (Error Tracking)
1. Create account at https://sentry.io
2. Create new project
3. Copy DSN
4. Add to `.env`: `SENTRY_DSN=https://...@sentry.io/...`

### 2. Health Checks
```bash
# API health
curl https://api.malasafe.gov.et/api/v1/operations/health

# Expected response
{
  "status": "healthy",
  "checks": {
    "database": {"status": "healthy"},
    "redis": {"status": "healthy"},
    "system": {"status": "healthy"}
  }
}
```

### 3. Metrics Endpoint
```bash
# System metrics (requires auth)
curl -H "Authorization: Bearer <token>" \
  https://api.malasafe.gov.et/api/v1/operations/metrics
```

### 4. Log Monitoring
```bash
# API logs
tail -f /var/log/malasafe/api.log

# Celery logs
tail -f /var/log/malasafe/celery.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Security Checklist

### Pre-Deployment
- [ ] Change default `SECRET_KEY`
- [ ] Set strong database password
- [ ] Set strong Redis password
- [ ] Configure CORS origins (no wildcards)
- [ ] Enable HTTPS/SSL
- [ ] Set `DEBUG=false`
- [ ] Set `ENVIRONMENT=production`
- [ ] Configure Sentry DSN
- [ ] Review rate limiting settings
- [ ] Enable firewall (UFW/iptables)

### Post-Deployment
- [ ] Test authentication endpoints
- [ ] Test rate limiting
- [ ] Verify security headers
- [ ] Test CORS configuration
- [ ] Verify SSL certificate
- [ ] Test health check endpoint
- [ ] Monitor error logs
- [ ] Setup automated backups
- [ ] Document admin credentials
- [ ] Setup monitoring alerts

---

## Troubleshooting

### API Won't Start
```bash
# Check logs
sudo supervisorctl tail -f malasafe-api

# Common issues:
# 1. Database connection failed
#    - Verify DATABASE_URL
#    - Check PostgreSQL is running
#    - Test connection: psql $DATABASE_URL

# 2. Redis connection failed
#    - Verify REDIS_HOST and REDIS_PORT
#    - Check Redis is running: redis-cli ping
#    - Check Redis password

# 3. Port already in use
#    - Check: sudo lsof -i :8000
#    - Kill process: sudo kill <PID>
```

### Celery Tasks Not Processing
```bash
# Check Celery worker logs
sudo supervisorctl tail -f malasafe-celery

# Check Redis connection
redis-cli -a STRONG_REDIS_PASSWORD ping

# Check queue status
celery -A app.tasks.celery_app inspect active

# Restart Celery
sudo supervisorctl restart malasafe-celery
```

### High Memory Usage
```bash
# Check system resources
htop

# Check PostgreSQL connections
psql -U malasafe -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis memory
redis-cli -a STRONG_REDIS_PASSWORD info memory

# Restart services if needed
sudo supervisorctl restart malasafe-api malasafe-celery
```

### Database Migration Failed
```bash
# Check current version
alembic current

# Check migration history
alembic history

# Rollback one version
alembic downgrade -1

# Upgrade to latest
alembic upgrade head

# If stuck, check alembic_version table
psql -U malasafe malasafe_prod -c "SELECT * FROM alembic_version;"
```

---

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: `/backend/docs/`
- API Docs: https://api.malasafe.gov.et/api/docs

---

**Last Updated**: May 28, 2026  
**Version**: 2.0
