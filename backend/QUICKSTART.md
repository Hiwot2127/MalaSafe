# MalaSafe Backend - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Run Setup Script
```bash
setup.bat
```
This will:
- Create a virtual environment
- Install all dependencies
- Create necessary directories
- Copy .env.example to .env

### Step 2: Configure Environment
Edit `.env` file and update:
```env
# Generate a secret key with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-generated-secret-key-here

# Update with your PostgreSQL credentials
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/malasafe_db
DATABASE_URL_SYNC=postgresql://postgres:yourpassword@localhost:5432/malasafe_db
```

### Step 3: Create Database
```bash
# Using createdb command
createdb malasafe_db

# OR using psql
psql -U postgres
CREATE DATABASE malasafe_db;
\q
```

### Step 4: Run Migrations
```bash
# Activate virtual environment
venv\Scripts\activate

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### Step 5: Start the Server
```bash
# Option 1: Use the run script
run.bat

# Option 2: Manual start
venv\Scripts\activate
uvicorn app.main:app --reload
```

### Step 6: Test the API
Open your browser and visit:
- **API Docs**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000/api/v1/health

## 📝 Quick Test

### Register a User
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"username\":\"testuser\",\"password\":\"testpass123\",\"full_name\":\"Test User\"}"
```

### Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123"
```

### Get Current User (with token)
```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## 🔧 Common Commands

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1

# View history
alembic history
```

### Development
```bash
# Start with auto-reload
uvicorn app.main:app --reload

# Start on different port
uvicorn app.main:app --reload --port 8080

# View logs
type logs\app.log
```

## 🐛 Troubleshooting

### "ModuleNotFoundError"
```bash
# Make sure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### "Database connection failed"
- Check PostgreSQL is running: `pg_ctl status`
- Verify DATABASE_URL in .env
- Ensure database exists: `psql -l`

### "Alembic can't find models"
- Check `alembic/env.py` imports all models
- Verify `app/models/__init__.py` exports all models

## 📚 Next Steps

1. **Add More Models**: Create models in `app/models/`
2. **Add Routes**: Create endpoints in `app/routes/`
3. **Add Business Logic**: Implement services in `app/services/`
4. **Add AI Models**: Implement ML logic in `app/ai/`
5. **Add Tests**: Create tests in `tests/`

## 🔐 Security Checklist

- [ ] Change SECRET_KEY in .env
- [ ] Use strong database password
- [ ] Update CORS_ORIGINS for your frontend
- [ ] Enable HTTPS in production
- [ ] Set DEBUG=False in production
- [ ] Use environment-specific .env files

## 📖 Documentation

- Full README: `README.md`
- API Docs: http://localhost:8000/api/docs
- Alembic Guide: `alembic/README`

## 💡 Tips

- Use `--reload` flag only in development
- Check logs in `logs/app.log` for debugging
- Use interactive API docs at `/api/docs` for testing
- Keep dependencies updated: `pip list --outdated`

---

**Need Help?** Check the full README.md or contact the development team.
