# MalaSafe Docker Architecture

This document explains the Docker architecture and design decisions for MalaSafe.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Docker Host                                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    malasafe-network (bridge)                    │ │
│  │                                                                  │ │
│  │  ┌──────────────┐         ┌──────────────┐                     │ │
│  │  │   Frontend   │────────▶│   Backend    │                     │ │
│  │  │   Next.js    │  HTTP   │   FastAPI    │                     │ │
│  │  │  Port: 3000  │         │  Port: 8000  │                     │ │
│  │  └──────────────┘         └───────┬──────┘                     │ │
│  │                                    │                             │ │
│  │                       ┌────────────┼────────────┐               │ │
│  │                       │            │            │               │ │
│  │                 ┌─────▼────┐  ┌───▼────┐  ┌───▼──────┐        │ │
│  │                 │ Postgres │  │ Redis  │  │  Celery  │        │ │
│  │                 │   DB     │  │ Cache  │  │ Workers  │        │ │
│  │                 │  :5432   │  │ :6379  │  │          │        │ │
│  │                 └──────────┘  └────────┘  └──────────┘        │ │
│  │                                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Docker Volumes                             │ │
│  │  • postgres_data    - Database files                            │ │
│  │  • redis_data       - Redis persistence                         │ │
│  │  • backend_uploads  - CSV uploads                               │ │
│  │  • backend_logs     - Application logs                          │ │
│  │  • backend_models   - ML model files                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔧 Service Details

### 1. Frontend Container

**Image**: Node.js 18 Alpine  
**Purpose**: Serve Next.js web application  
**Exposed Port**: 3000

**Development Mode**:
- Hot reload enabled
- Source code mounted as volume
- node_modules in anonymous volume for performance

**Production Mode**:
- Standalone build (optimized)
- No source code mount
- Minimal image size (~150MB)

**Environment Variables**:
- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `NODE_ENV` - Environment mode

### 2. Backend Container

**Image**: Python 3.11 Slim  
**Purpose**: FastAPI REST API server  
**Exposed Port**: 8000

**Development Mode**:
- Uvicorn with --reload flag
- Source code mounted as volume
- Immediate code changes reflection

**Production Mode**:
- 4 Uvicorn workers
- No source code mount
- Non-root user for security

**Environment Variables**:
- `DATABASE_URL` - PostgreSQL connection (async)
- `DATABASE_URL_SYNC` - PostgreSQL connection (sync for Alembic)
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `SECRET_KEY` - JWT signing key
- `CELERY_BROKER_URL` - Celery message broker
- `CORS_ORIGINS` - Allowed frontend origins

**Startup Sequence**:
1. Wait for PostgreSQL health check
2. Wait for Redis health check
3. Run Alembic migrations
4. Start Uvicorn server

### 3. PostgreSQL Container

**Image**: PostgreSQL 15 Alpine  
**Purpose**: Primary relational database  
**Exposed Port**: 5432 (dev only)

**Configuration**:
- Database: `malasafe`
- User: `malasafe`
- Password: Environment variable

**Data Persistence**:
- Volume: `postgres_data`
- Location: `/var/lib/postgresql/data`

**Health Check**:
- Command: `pg_isready -U malasafe`
- Interval: 10s (dev), 30s (prod)
- Retries: 5 (dev), 3 (prod)

### 4. Redis Container

**Image**: Redis 7 Alpine  
**Purpose**: Cache and message broker  
**Exposed Port**: 6379 (dev only)

**Usage**:
- Database 0: Rate limiting
- Database 1: Celery broker/backend
- Database 2: Application cache

**Data Persistence**:
- Volume: `redis_data`
- Location: `/data`

**Health Check**:
- Command: `redis-cli ping`
- Interval: 10s (dev), 30s (prod)

### 5. Celery Worker Container

**Image**: Same as backend (Python 3.11 Slim)  
**Purpose**: Process background tasks  
**No Exposed Ports**

**Task Queues**:
- `uploads` - CSV processing
- `predictions` - ML predictions
- `climate` - Climate data fetching

**Configuration**:
- Concurrency: 2 (dev), 4 (prod)
- Log level: INFO

**Shared Volumes**:
- `backend_uploads` - Access uploaded files
- `backend_logs` - Write task logs
- `backend_models` - Load ML models

### 6. Celery Beat Container

**Image**: Same as backend (Python 3.11 Slim)  
**Purpose**: Schedule periodic tasks  
**No Exposed Ports**

**Scheduled Tasks**:
- Monthly close processing
- Climate data updates
- Cache cleanup

## 🔗 Network Architecture

### Bridge Network: `malasafe-network`

All services communicate through a Docker bridge network:

**Service Discovery**:
- Services reference each other by service name
- Example: Backend connects to `postgres:5432`, not `localhost:5432`

**Internal Communication**:
```
Frontend → Backend:    http://backend:8000
Backend → Postgres:    postgres:5432
Backend → Redis:       redis:6379
Celery → Redis:        redis:6379
Celery → Postgres:     postgres:5432
```

**External Access** (Development):
- Frontend: `localhost:3000`
- Backend: `localhost:8000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

**External Access** (Production):
- Frontend: `localhost:3000` (behind reverse proxy)
- Backend: `localhost:8000` (behind reverse proxy)
- Postgres: Not exposed
- Redis: Not exposed

## 💾 Data Persistence Strategy

### Volumes

**Named Volumes** (managed by Docker):
- `postgres_data` - Database files (critical)
- `redis_data` - Redis persistence (optional)
- `backend_uploads` - User uploads (critical)
- `backend_logs` - Application logs (important)
- `backend_models` - ML models (critical)

**Bind Mounts** (development only):
- `./backend:/app` - Backend source code
- `./frontend:/app` - Frontend source code

### Backup Strategy

**Critical Data**:
1. PostgreSQL database → Daily backups
2. Uploaded files → Daily backups
3. ML models → Version controlled

**Non-Critical Data**:
1. Redis cache → Can be rebuilt
2. Logs → Rotated and archived

## 🔒 Security Architecture

### Development

**Relaxed Security** (for ease of development):
- Default passwords
- Debug mode enabled
- All ports exposed
- Verbose logging

### Production

**Hardened Security**:
- Strong passwords (environment variables)
- Debug mode disabled
- Minimal port exposure
- Non-root users in containers
- Security headers enabled
- Rate limiting active
- CORS restricted to specific domains

### Network Isolation

```
Internet
   │
   ├─▶ Reverse Proxy (Nginx)
   │      │
   │      ├─▶ Frontend Container (3000)
   │      └─▶ Backend Container (8000)
   │             │
   │             ├─▶ PostgreSQL (internal only)
   │             ├─▶ Redis (internal only)
   │             └─▶ Celery Workers (internal only)
```

## 📊 Resource Allocation

### Development

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| Frontend | 0.5 | 512MB | - |
| Backend | 1.0 | 1GB | - |
| PostgreSQL | 0.5 | 512MB | 5GB |
| Redis | 0.25 | 256MB | 1GB |
| Celery Worker | 0.5 | 512MB | - |
| Celery Beat | 0.25 | 256MB | - |
| **Total** | **3.0** | **3GB** | **6GB** |

### Production

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| Frontend | 1.0 | 1GB | - |
| Backend | 2.0 | 2GB | - |
| PostgreSQL | 1.0 | 2GB | 20GB |
| Redis | 0.5 | 512MB | 2GB |
| Celery Worker | 1.0 | 1GB | - |
| Celery Beat | 0.5 | 512MB | - |
| **Total** | **6.0** | **7GB** | **22GB** |

## 🚀 Deployment Strategies

### Development Deployment

```bash
docker compose up --build
```

**Characteristics**:
- Fast iteration
- Hot reload
- Verbose logging
- Easy debugging

### Production Deployment

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Characteristics**:
- Optimized images
- Minimal logging
- Auto-restart policies
- Health checks

### Rolling Updates

```bash
# Update backend without downtime
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
```

### Blue-Green Deployment

```bash
# Start new version
docker compose -f docker-compose.prod.yml up -d --scale backend=2

# Test new version
curl http://localhost:8000/api/v1/health

# Stop old version
docker compose -f docker-compose.prod.yml up -d --scale backend=1
```

## 🔄 Startup Dependencies

### Dependency Graph

```
PostgreSQL ─┐
            ├─▶ Backend ─▶ Frontend
Redis ──────┘      │
                   ├─▶ Celery Worker
                   └─▶ Celery Beat
```

### Health Check Flow

1. **PostgreSQL** starts and becomes healthy (10-30s)
2. **Redis** starts and becomes healthy (5-10s)
3. **Backend** waits for both, runs migrations, starts (20-40s)
4. **Celery Worker** waits for both, starts (10-20s)
5. **Celery Beat** waits for both, starts (10-20s)
6. **Frontend** waits for backend, starts (10-20s)

**Total Startup Time**: 60-120 seconds

## 🎯 Design Decisions

### Why Multi-Stage Builds?

**Benefits**:
- Smaller production images
- Separate dev and prod configurations
- Better layer caching
- Security (no dev tools in prod)

### Why Alpine Images?

**Benefits**:
- Smaller image size (50-70% reduction)
- Faster downloads
- Lower storage costs
- Security (minimal attack surface)

**Trade-offs**:
- Some packages need compilation
- Slightly longer build times

### Why Bridge Network?

**Benefits**:
- Service discovery by name
- Network isolation
- Easy to configure
- Standard Docker practice

### Why Named Volumes?

**Benefits**:
- Managed by Docker
- Persist across container restarts
- Easy to backup
- Platform-independent paths

## 📈 Scaling Considerations

### Horizontal Scaling

**Stateless Services** (can scale):
- Backend API (multiple instances)
- Celery Workers (multiple instances)
- Frontend (multiple instances)

**Stateful Services** (single instance):
- PostgreSQL (requires replication setup)
- Redis (requires cluster setup)
- Celery Beat (only one scheduler)

### Vertical Scaling

Increase resources in `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

## 🔍 Monitoring and Observability

### Health Checks

All services include health checks:
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`
- **Backend**: HTTP GET `/api/v1/health`
- **Frontend**: HTTP GET `/`

### Logging

**Centralized Logging**:
- All containers log to stdout/stderr
- Docker captures logs
- View with `docker compose logs`

**Log Levels**:
- Development: DEBUG
- Production: INFO

### Metrics

**Built-in Metrics**:
- `docker stats` - Resource usage
- `docker compose ps` - Service status
- Health check status

## 🆘 Troubleshooting Guide

### Common Issues

**Issue**: Port already in use  
**Solution**: Change port mapping in docker-compose.yml

**Issue**: Database connection failed  
**Solution**: Wait for health check, check credentials

**Issue**: Out of disk space  
**Solution**: `docker system prune -a --volumes`

**Issue**: Container keeps restarting  
**Solution**: Check logs with `docker compose logs`

## 📚 References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Networking](https://docs.docker.com/network/)

---

**Last Updated**: May 2026  
**MalaSafe Version**: 1.0.0
