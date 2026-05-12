# Authentication System - Quick Start Guide

## 🚀 Get Started in 5 Steps

### Step 1: Setup Database and Run Migrations

```bash
# Activate virtual environment
venv\Scripts\activate

# Create database
createdb malasafe_db

# Run migrations
alembic revision --autogenerate -m "Add user authentication"
alembic upgrade head
```

### Step 2: Create Initial Admin User

```bash
python create_admin.py
```

Follow the prompts:
- Email: `admin@malasafe.gov.et`
- Full Name: `System Administrator`
- Password: (must meet requirements)

### Step 3: Start the Server

```bash
# Using the run script
run.bat

# Or manually
uvicorn app.main:app --reload
```

### Step 4: Test the Authentication System

```bash
python test_auth.py
```

This will test all authentication endpoints automatically.

### Step 5: Access API Documentation

Open your browser:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## 📝 Quick API Reference

### Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@malasafe.gov.et","password":"YourPassword"}'
```

### Create Official (Admin Only)
```bash
curl -X POST "http://localhost:8000/api/v1/auth/create-official" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"officer@moh.gov.et",
    "full_name":"MOH Officer",
    "password":"SecurePass123!",
    "role":"moh_officer"
  }'
```

### Mobile Registration (Public Users)
```bash
curl -X POST "http://localhost:8000/api/v1/mobile/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "full_name":"Public User",
    "password":"UserPass123!",
    "district_id":"addis_ababa"
  }'
```

### Get Current User
```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔐 User Roles

| Role | Value | Who Creates | Access Level |
|------|-------|-------------|--------------|
| Admin | `admin` | Manual/Script | Full access |
| MOH Officer | `moh_officer` | Admin | National data |
| EPHI Officer | `ephi_officer` | Admin | Research data |
| Regional Officer | `regional_officer` | Admin | District data |
| Public User | `public_user` | Self-register | Limited access |

## 🛡️ Password Requirements

- ✅ Minimum 8 characters
- ✅ One uppercase letter
- ✅ One lowercase letter
- ✅ One digit
- ✅ One special character

**Valid Example:** `SecurePass123!`

## 🔧 Using Authentication in Your Code

### Protect Any Endpoint
```python
from app.utils.dependencies import get_current_user
from app.models.user import User

@router.get("/protected")
async def protected_endpoint(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.full_name}"}
```

### Admin Only
```python
from app.utils.dependencies import require_admin

@router.post("/admin-action")
async def admin_action(current_user: User = Depends(require_admin)):
    return {"message": "Admin action performed"}
```

### Specific Roles
```python
from app.utils.dependencies import require_roles
from app.models.user import UserRole

@router.get("/moh-data")
async def moh_data(
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.MOH_OFFICER)
    )
):
    return {"message": "MOH data"}
```

## 📚 Documentation

- **Full Documentation**: `AUTH_DOCUMENTATION.md`
- **API Docs**: http://localhost:8000/api/docs
- **Main README**: `README.md`

## 🐛 Troubleshooting

### "Could not validate credentials"
- Token expired (30 min default)
- Invalid token format
- Check Authorization header: `Bearer <token>`

### "Admin access required"
- User doesn't have admin role
- Check user role in database

### "Password must contain..."
- Password doesn't meet requirements
- See password requirements above

## ✅ Checklist

- [ ] Database created
- [ ] Migrations run
- [ ] Admin user created
- [ ] Server running
- [ ] Test script passed
- [ ] API docs accessible

## 🎯 Next Steps

1. **Create more users** using the admin account
2. **Build your endpoints** using the authentication system
3. **Test with different roles** to verify access control
4. **Integrate with frontend** application

---

**Need Help?** Check `AUTH_DOCUMENTATION.md` for detailed information.
