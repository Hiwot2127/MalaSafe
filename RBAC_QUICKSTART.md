# RBAC Quick Start Guide

Get the MalaSafe RBAC system up and running in 5 minutes.

## Prerequisites

- PostgreSQL running on localhost:5432
- Python 3.9+ with virtual environment
- Node.js 18+ with npm
- Database `malasafe_db` created

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Activate virtual environment (if not already active)
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Run database migrations
alembic upgrade head

# This creates the audit_logs table and updates schema
```

## Step 2: Create Admin User (1 minute)

### Option A: Using Python Script

Create `backend/create_admin.py`:

```python
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.user import User, UserRole
from app.utils.security import get_password_hash
import uuid

async def create_admin():
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:password@localhost:5432/malasafe_db"
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if admin exists
        from sqlalchemy import select
        result = await session.execute(
            select(User).where(User.email == "admin@moh.gov.et")
        )
        if result.scalar_one_or_none():
            print("Admin user already exists!")
            return
        
        # Create admin
        admin = User(
            id=uuid.uuid4(),
            email="admin@moh.gov.et",
            full_name="System Administrator",
            password_hash=get_password_hash("Admin@123"),
            role=UserRole.ADMIN,
            is_active=True
        )
        session.add(admin)
        await session.commit()
        print("✅ Admin user created!")
        print("Email: admin@moh.gov.et")
        print("Password: Admin@123")

if __name__ == "__main__":
    asyncio.run(create_admin())
```

Run it:
```bash
python create_admin.py
```

### Option B: Using SQL

```sql
-- Connect to database
psql -U postgres -d malasafe_db

-- Create admin user
INSERT INTO users (id, email, full_name, password_hash, role, is_active, created_at)
VALUES (
  gen_random_uuid(),
  'admin@moh.gov.et',
  'System Administrator',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztpFxkeqClrC',
  'admin',
  true,
  NOW()
);
```

Password hash above is for: `Admin@123`

## Step 3: Start Backend (30 seconds)

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

Test it:
```bash
curl http://localhost:8000/api/v1/health
```

## Step 4: Start Frontend (30 seconds)

```bash
# New terminal
cd frontend

# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

You should see:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

## Step 5: Test the System (1 minute)

### 1. Login as Admin

1. Open browser: http://localhost:3000/login
2. Enter credentials:
   - Email: `admin@moh.gov.et`
   - Password: `Admin@123`
3. Click "Sign in"
4. You should be redirected to `/admin`

### 2. Create Test Users

1. Navigate to "Users" in sidebar
2. Click "Create User"
3. Create MOH Officer:
   - Email: `moh.officer@moh.gov.et`
   - Full Name: `Dr. Abebe Kebede`
   - Role: `MOH Officer`
   - Click "Create"
4. Note the generated password
5. Repeat for other roles

### 3. Test Role-Based Access

1. Logout (user menu → Logout)
2. Login as MOH Officer
3. You should be redirected to `/dashboard`
4. Try to access `/admin` → Should redirect back to `/dashboard`

## Verify Installation

### Check Backend

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Login test
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@moh.gov.et","password":"Admin@123"}'

# Should return JWT token and user info
```

### Check Frontend

1. ✅ Login page loads
2. ✅ Can login as admin
3. ✅ Redirected to `/admin`
4. ✅ Admin sidebar visible
5. ✅ Can access user management

### Check Database

```sql
-- Check users table
SELECT email, role, is_active FROM users;

-- Check audit logs
SELECT action, actor_email, description, timestamp 
FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 10;
```

## Common Issues

### Issue: "Connection refused" on backend

**Solution**: Check PostgreSQL is running
```bash
# Windows
services.msc → PostgreSQL

# Linux
sudo systemctl status postgresql

# Mac
brew services list
```

### Issue: "Module not found" errors

**Solution**: Install dependencies
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Issue: "Table does not exist"

**Solution**: Run migrations
```bash
cd backend
alembic upgrade head
```

### Issue: Can't login

**Solution**: Check admin user exists
```sql
SELECT * FROM users WHERE email = 'admin@moh.gov.et';
```

If not found, recreate using Step 2.

### Issue: Frontend shows "API connection error"

**Solution**: Check `.env.local` file
```bash
cd frontend
cat .env.local

# Should contain:
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Next Steps

### 1. Create More Users

Use admin panel to create:
- MOH Officers (monthly malaria upload)
- EPHI Officers (weekly malaria upload)
- Regional Officers (read-only)

### 2. Test Each Role

Login as each role and verify:
- Correct dashboard access
- Correct sidebar items
- Correct permissions

### 3. Check Audit Logs

```bash
# Via API
curl http://localhost:8000/api/v1/admin/audit-logs \
  -H "Authorization: Bearer <admin-token>"

# Via Database
psql -U postgres -d malasafe_db
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20;
```

### 4. Implement Remaining Pages

- Upload monitoring (`/admin/upload-monitoring`)
- Audit logs UI (`/admin/audit-logs`)
- System health (`/admin/system-health`)
- Settings (`/admin/settings`)

## Test Credentials

After setup, you'll have:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | admin@moh.gov.et | Admin@123 | /admin |
| MOH Officer | (create via admin) | (generated) | /dashboard |
| EPHI Officer | (create via admin) | (generated) | /dashboard |
| Regional Officer | (create via admin) | (generated) | /dashboard |

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Architecture Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─ /login ──────────────┐
       │                       │
       ├─ /admin ──────────────┤ Role-based
       │   └─ Admin Only       │ Redirect
       │                       │
       └─ /dashboard ──────────┤
           └─ Operational      │
               Users           │
                              │
┌─────────────────────────────┴──┐
│      Next.js Frontend          │
│  - RBAC route guards           │
│  - Dynamic navigation          │
│  - Role-based UI               │
└────────────┬───────────────────┘
             │ HTTP + JWT
┌────────────┴───────────────────┐
│      FastAPI Backend           │
│  - JWT authentication          │
│  - Permission enforcement      │
│  - Audit logging               │
└────────────┬───────────────────┘
             │
┌────────────┴───────────────────┐
│      PostgreSQL Database       │
│  - users                       │
│  - audit_logs                  │
│  - malaria_data                │
│  - ...                         │
└────────────────────────────────┘
```

## Success Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Can login as admin
- [ ] Admin redirected to `/admin`
- [ ] Can create new users
- [ ] Audit logs being created
- [ ] Role-based navigation working

## Getting Help

1. Check `RBAC_ARCHITECTURE.md` for detailed docs
2. Check `RBAC_IMPLEMENTATION_SUMMARY.md` for implementation details
3. Review inline code comments
4. Check API docs at `/api/docs`

## Production Deployment

Before deploying to production:

1. ✅ Change `SECRET_KEY` in `.env`
2. ✅ Use strong admin password
3. ✅ Enable HTTPS
4. ✅ Set up proper CORS origins
5. ✅ Configure production database
6. ✅ Set up email service for password resets
7. ✅ Enable rate limiting
8. ✅ Set up monitoring and alerts

---

**Time to Complete**: ~5 minutes
**Difficulty**: Easy
**Status**: Ready to use
