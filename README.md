# MalaSafe — Malaria Surveillance & Prediction (Concise)

MalaSafe is a production-oriented malaria surveillance and forecasting platform built for Ethiopia's public health ecosystem. This repository contains the backend (FastAPI), frontend (Next.js), and mobile application sources, plus Docker orchestration for local development and production deployment.

Key entrypoints:
- Frontend: `frontend/`
- Backend: `backend/`
- Mobile app: `mobile/`
- Docker compose: `docker-compose.yml`, `docker-compose.prod.yml`

For detailed guides and archived documentation see: `docs/README_INDEX.md` (new)

Quick start (recommended):
```bash
git clone <repo>
cd MalaSafe
cp .env.example .env
docker compose up --build
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (API docs: `/api/docs`)

If you want me to finalize the cleanup by archiving or deleting duplicate README files across the repo (e.g. many DOCKER_*.md, FINAL_*.md), confirm and I'll move them into `docs/archived/` and keep `docs/README_INDEX.md` as the single index.

---

## License

MIT — see `LICENSE`

# 1. Set up production environment variables
cp .env.example .env
# Edit .env with production values

# 2. Build production images
docker compose -f docker-compose.prod.yml build

# 3. Start production services
docker compose -f docker-compose.prod.yml up -d

# 4. Run migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 5. Create admin user
docker compose -f docker-compose.prod.yml exec backend python create_admin.py

# 6. Verify deployment
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8000/api/v1/health
```

### Environment Variables

#### Backend (.env)
```env
# Application
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<generate-with-secrets.token_urlsafe(64)>

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/malasafe
DATABASE_URL_SYNC=postgresql://user:pass@postgres:5432/malasafe

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<secure-password>

# Celery
CELERY_BROKER_URL=redis://:password@redis:6379/1
CELERY_RESULT_BACKEND=redis://:password@redis:6379/1

# Sentry (optional)
SENTRY_DSN=<your-sentry-dsn>

# CORS
CORS_ORIGINS=["https://yourdomain.com"]
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NODE_ENV=production
```

### Production Checklist

- [ ] Change `SECRET_KEY` to secure random value
- [ ] Set `ENVIRONMENT=production`
- [ ] Configure production database
- [ ] Set `REDIS_PASSWORD`
- [ ] Configure `SENTRY_DSN`
- [ ] Update `CORS_ORIGINS`
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Set up monitoring alerts
- [ ] Change default admin password
- [ ] Test complete workflow

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v

# Run specific test
pytest tests/test_auth.py::test_login_success -v
```

**Test Coverage:**
- Authentication & Authorization
- User Management
- Upload Processing
- Prediction Generation
- Caching Layer
- Analytics Endpoints
- Operations Dashboard

### Frontend E2E Tests

```bash
cd frontend

# Run E2E tests
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

**E2E Test Coverage:**
- Login/Logout flows
- Dashboard display
- Data upload
- Map interactions
- Prediction generation
- Recommendation display

### Manual Testing

See the documentation index `docs/README_INDEX.md` for the manual testing checklist and archived testing notes.

---

### Development Guidelines

1. **Code Style**
   - Backend: Follow PEP 8, use type hints
   - Frontend: Follow Airbnb style guide, use TypeScript
   - Write descriptive commit messages

2. **Testing**
   - Write tests for new features
   - Maintain >80% code coverage
   - Run tests before committing

3. **Documentation**
   - Update README for new features
   - Add docstrings to functions
   - Update API documentation

4. **Pull Requests**
   - Create feature branch from `main`
   - Write clear PR description
   - Link related issues
   - Ensure CI passes

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📊 Project Statistics

- **Lines of Code:** ~50,000+
- **Backend Tests:** 52+
- **E2E Tests:** 20+
- **API Endpoints:** 40+
- **Database Tables:** 15+
- **Docker Services:** 6
- **Supported Districts:** 1,082
- **Supported Languages:** 4 (English, Amharic, Oromo, Tigrinya)

---

<div align="center">

**Built with ❤️ for Ethiopia's Public Health**

[⬆ Back to Top](#malasafe---malaria-surveillance--prediction-system)

</div>
