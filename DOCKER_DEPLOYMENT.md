# MalaSafe Production Deployment Guide

This guide covers deploying MalaSafe to production environments using Docker.

## 🎯 Deployment Options

MalaSafe can be deployed to various platforms:

1. **Cloud VPS** (DigitalOcean, Linode, Vultr) - Recommended for final year projects
2. **Cloud Platforms** (AWS, Google Cloud, Azure) - Enterprise-grade
3. **Platform-as-a-Service** (Render, Railway, Fly.io) - Easiest setup
4. **On-Premises** - For institutional deployment

This guide focuses on **Cloud VPS** deployment as it's most suitable for academic projects.

## 🖥️ Option 1: Cloud VPS Deployment (Recommended)

### Prerequisites

- Ubuntu 22.04 LTS server
- Minimum 2GB RAM, 2 CPU cores, 20GB storage
- Root or sudo access
- Domain name (optional but recommended)

### Step 1: Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Step 2: Setup Firewall

```bash
# Install UFW
apt install ufw -y

# Allow SSH (important!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### Step 3: Clone Repository

```bash
# Create application directory
mkdir -p /opt/malasafe
cd /opt/malasafe

# Clone repository
git clone <your-repository-url> .

# Or upload files via SCP
# scp -r ./MalaSafe root@your-server-ip:/opt/malasafe
```

### Step 4: Configure Environment

```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.docker.example backend/.env.production
cp frontend/.env.docker.example frontend/.env.production

# Generate secure secrets
openssl rand -hex 32  # For SECRET_KEY
openssl rand -hex 16  # For POSTGRES_PASSWORD
openssl rand -hex 16  # For REDIS_PASSWORD
```

Edit `.env`:
```bash
nano .env
```

```env
POSTGRES_DB=malasafe
POSTGRES_USER=malasafe
POSTGRES_PASSWORD=<generated-password>
REDIS_PASSWORD=<generated-password>
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

Edit `backend/.env.production`:
```bash
nano backend/.env.production
```

```env
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<generated-secret-key>
DATABASE_URL=postgresql+asyncpg://malasafe:<postgres-password>@postgres:5432/malasafe
DATABASE_URL_SYNC=postgresql://malasafe:<postgres-password>@postgres:5432/malasafe
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>
CELERY_BROKER_URL=redis://:<redis-password>@redis:6379/1
CELERY_RESULT_BACKEND=redis://:<redis-password>@redis:6379/1
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]
SENTRY_DSN=<your-sentry-dsn>
```

Edit `frontend/.env.production`:
```bash
nano frontend/.env.production
```

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NODE_ENV=production
```

### Step 5: Deploy Application

```bash
# Build and start services
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 6: Setup Reverse Proxy (Nginx)

```bash
# Install Nginx
apt install nginx -y

# Create Nginx configuration
nano /etc/nginx/sites-available/malasafe
```

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/malasafe /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 7: Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain SSL certificates
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Certificates will auto-renew
# Test renewal
certbot renew --dry-run
```

### Step 8: Setup Automatic Backups

```bash
# Create backup script
nano /opt/malasafe/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/malasafe/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker compose -f /opt/malasafe/docker-compose.prod.yml exec -T postgres \
  pg_dump -U malasafe malasafe > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/malasafe/uploads

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /opt/malasafe/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add line:
```
0 2 * * * /opt/malasafe/backup.sh >> /var/log/malasafe-backup.log 2>&1
```

### Step 9: Setup Monitoring

```bash
# Create monitoring script
nano /opt/malasafe/monitor.sh
```

```bash
#!/bin/bash
cd /opt/malasafe

# Check if services are running
if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "Services are down! Restarting..."
    docker compose -f docker-compose.prod.yml up -d
    
    # Send alert (optional)
    # curl -X POST https://your-webhook-url -d "MalaSafe services restarted"
fi
```

```bash
# Make executable
chmod +x /opt/malasafe/monitor.sh

# Add to crontab (every 5 minutes)
crontab -e
```

Add line:
```
*/5 * * * * /opt/malasafe/monitor.sh >> /var/log/malasafe-monitor.log 2>&1
```

### Step 10: Verify Deployment

```bash
# Check all services are healthy
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail=50

# Test endpoints
curl https://api.yourdomain.com/api/v1/health
curl https://yourdomain.com

# Check resource usage
docker stats
```

## 🚀 Option 2: Platform-as-a-Service (Render)

Render provides easy deployment with managed databases.

### Step 1: Prepare Repository

Ensure your repository is on GitHub/GitLab.

### Step 2: Create Render Account

Sign up at [render.com](https://render.com)

### Step 3: Create PostgreSQL Database

1. Click "New +" → "PostgreSQL"
2. Name: `malasafe-db`
3. Plan: Free or Starter
4. Create Database
5. Copy the "Internal Database URL"

### Step 4: Create Redis Instance

1. Click "New +" → "Redis"
2. Name: `malasafe-redis`
3. Plan: Free or Starter
4. Create Redis
5. Copy the "Internal Redis URL"

### Step 5: Deploy Backend

1. Click "New +" → "Web Service"
2. Connect your repository
3. Configure:
   - **Name**: `malasafe-backend`
   - **Environment**: Docker
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Build Context**: `backend`
   - **Plan**: Starter or higher

4. Add Environment Variables:
   ```
   ENVIRONMENT=production
   DEBUG=false
   SECRET_KEY=<generate-with-openssl>
   DATABASE_URL=<postgres-internal-url>
   DATABASE_URL_SYNC=<postgres-internal-url-without-asyncpg>
   REDIS_HOST=<redis-internal-host>
   REDIS_PORT=6379
   CELERY_BROKER_URL=<redis-internal-url>
   CORS_ORIGINS=["https://your-frontend.onrender.com"]
   ```

5. Deploy

### Step 6: Deploy Frontend

1. Click "New +" → "Web Service"
2. Connect your repository
3. Configure:
   - **Name**: `malasafe-frontend`
   - **Environment**: Docker
   - **Dockerfile Path**: `frontend/Dockerfile`
   - **Docker Build Context**: `frontend`
   - **Plan**: Starter or higher

4. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://malasafe-backend.onrender.com/api/v1
   NODE_ENV=production
   ```

5. Deploy

### Step 7: Deploy Celery Worker

1. Click "New +" → "Background Worker"
2. Connect your repository
3. Configure:
   - **Name**: `malasafe-celery`
   - **Environment**: Docker
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Command**: `celery -A app.tasks.celery_app worker --loglevel=info`

4. Use same environment variables as backend

5. Deploy

## 📊 Post-Deployment Checklist

- [ ] All services are running and healthy
- [ ] Database migrations completed successfully
- [ ] Frontend loads and connects to backend
- [ ] API documentation accessible
- [ ] SSL certificates installed and working
- [ ] CORS configured correctly
- [ ] Backups scheduled and tested
- [ ] Monitoring alerts configured
- [ ] Logs are being collected
- [ ] Resource usage is acceptable
- [ ] Security headers are present
- [ ] Rate limiting is working

## 🔒 Security Hardening

### 1. Change Default Passwords

```bash
# Never use default passwords in production
# Generate strong passwords for:
# - PostgreSQL
# - Redis
# - JWT Secret Key
```

### 2. Restrict Database Access

```bash
# In docker-compose.prod.yml, remove port exposure
# postgres:
#   ports:
#     - "5432:5432"  # REMOVE THIS LINE
```

### 3. Enable Sentry

Sign up at [sentry.io](https://sentry.io) and add DSN to backend environment.

### 4. Configure CORS Properly

Only allow your actual domain:
```python
CORS_ORIGINS=["https://yourdomain.com"]
```

### 5. Use Environment-Specific Secrets

Never commit `.env` files to Git. Use platform secret management.

## 🔄 Updates and Maintenance

### Update Application

```bash
cd /opt/malasafe

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### Database Migrations

```bash
# Run migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Rollback

```bash
# Rollback to previous version
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml up -d --build
```

## 📈 Scaling Considerations

### Horizontal Scaling

```yaml
# In docker-compose.prod.yml
celery-worker:
  deploy:
    replicas: 3  # Run 3 worker instances
```

### Vertical Scaling

Increase server resources (RAM, CPU) as needed.

### Database Optimization

- Enable connection pooling (already configured)
- Add indexes for frequently queried fields
- Regular VACUUM and ANALYZE

### Caching Strategy

- Redis caching is already implemented
- Adjust TTL values based on data freshness needs

## 🐛 Troubleshooting Production Issues

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs <service-name>

# Check resource usage
docker stats

# Restart service
docker compose -f docker-compose.prod.yml restart <service-name>
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker compose -f docker-compose.prod.yml logs postgres

# Verify credentials
docker compose -f docker-compose.prod.yml exec backend env | grep DATABASE
```

### High Memory Usage

```bash
# Check memory usage
free -h
docker stats

# Restart services to free memory
docker compose -f docker-compose.prod.yml restart
```

### SSL Certificate Issues

```bash
# Renew certificates
certbot renew

# Check certificate status
certbot certificates
```

## 📞 Support and Resources

- **Docker Documentation**: https://docs.docker.com
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment/
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **PostgreSQL Tuning**: https://pgtune.leopard.in.ua/

---

**Last Updated**: May 2026  
**MalaSafe Version**: 1.0.0
