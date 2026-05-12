# MalaSafe Authentication System Documentation

## Overview

The MalaSafe backend implements a comprehensive JWT-based authentication system with role-based access control (RBAC) designed specifically for malaria surveillance in Ethiopia.

## User Roles

### Role Hierarchy

```
┌─────────────────────────────────────────────────┐
│                    ADMIN                         │
│  • Full system access                            │
│  • Create official accounts                      │
│  • Manage all users                              │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ MOH_OFFICER  │ │ EPHI_OFFICER │ │REGIONAL_OFF. │
│              │ │              │ │              │
│ • National   │ │ • Research   │ │ • District   │
│   oversight  │ │   & data     │ │   level      │
│ • Policy     │ │ • Analytics  │ │ • Local data │
└──────────────┘ └──────────────┘ └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ PUBLIC_USER  │
              │              │
              │ • Self-reg   │
              │ • Mobile app │
              │ • Reports    │
              └──────────────┘
```

### Role Definitions

| Role | Value | Description | Creation Method |
|------|-------|-------------|-----------------|
| **Admin** | `admin` | System administrators with full access | Admin creates |
| **MOH Officer** | `moh_officer` | Ministry of Health officials | Admin creates |
| **EPHI Officer** | `ephi_officer` | Ethiopian Public Health Institute officials | Admin creates |
| **Regional Officer** | `regional_officer` | District/regional health officers | Admin creates |
| **Public User** | `public_user` | General public users | Self-registration |

## Authentication Flow

### 1. User Registration

#### Public User Registration (Mobile)
```
Mobile App
    │
    ├─► POST /api/v1/mobile/register
    │     {
    │       "email": "user@example.com",
    │       "full_name": "Almaz Tesfaye",
    │       "password": "SecurePass123!",
    │       "district_id": "addis_ababa_bole"
    │     }
    │
    └─► Response: User object (role: public_user)
```

#### Official Account Creation (Admin Only)
```
Admin
    │
    ├─► POST /api/v1/auth/create-official
    │     Headers: Authorization: Bearer <admin_token>
    │     {
    │       "email": "officer@moh.gov.et",
    │       "full_name": "Dr. Abebe Kebede",
    │       "password": "SecurePass123!",
    │       "role": "moh_officer",
    │       "district_id": null
    │     }
    │
    └─► Response: User object (role: moh_officer)
```

### 2. Login Flow

```
User
    │
    ├─► POST /api/v1/auth/login
    │     {
    │       "email": "user@example.com",
    │       "password": "SecurePass123!"
    │     }
    │
    ├─► Verify credentials
    │
    ├─► Generate JWT token
    │     {
    │       "user_id": "uuid",
    │       "email": "user@example.com",
    │       "role": "public_user",
    │       "exp": timestamp,
    │       "iat": timestamp
    │     }
    │
    └─► Response:
          {
            "access_token": "eyJhbGc...",
            "token_type": "bearer",
            "user": { ... }
          }
```

### 3. Protected Request Flow

```
Client
    │
    ├─► Request with Authorization header
    │     Authorization: Bearer <token>
    │
    ├─► Extract and decode JWT
    │
    ├─► Verify token signature
    │
    ├─► Check token expiration
    │
    ├─► Get user from database
    │
    ├─► Check user is active
    │
    ├─► Check user role (if required)
    │
    └─► Process request
```

## API Endpoints

### Authentication Endpoints

#### 1. Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "full_name": "Almaz Tesfaye",
    "role": "public_user",
    "district_id": "addis_ababa_bole",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account inactive

#### 2. Create Official Account (Admin Only)
```http
POST /api/v1/auth/create-official
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "officer@moh.gov.et",
  "full_name": "Dr. Abebe Kebede",
  "password": "SecurePass123!",
  "role": "moh_officer",
  "district_id": null
}
```

**Response (201 Created):**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "email": "officer@moh.gov.et",
  "full_name": "Dr. Abebe Kebede",
  "role": "moh_officer",
  "district_id": null,
  "is_active": true,
  "created_at": "2024-01-15T11:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: User exists, weak password, invalid role
- `403 Forbidden`: Not admin

#### 3. Mobile Registration (Public Users)
```http
POST /api/v1/mobile/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "full_name": "Tigist Haile",
  "password": "MySecurePass123!",
  "district_id": "oromia_jimma"
}
```

**Response (201 Created):**
```json
{
  "id": "789e0123-e89b-12d3-a456-426614174002",
  "email": "newuser@example.com",
  "full_name": "Tigist Haile",
  "role": "public_user",
  "district_id": "oromia_jimma",
  "is_active": true,
  "created_at": "2024-01-15T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: User exists, weak password

#### 4. Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "full_name": "Almaz Tesfaye",
  "role": "public_user",
  "district_id": "addis_ababa_bole",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: Account inactive

## Password Requirements

All passwords must meet the following criteria:

- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one digit (0-9)
- ✅ At least one special character (!@#$%^&*(),.?":{}|<>)

**Valid Examples:**
- `SecurePass123!`
- `MyP@ssw0rd`
- `Admin#2024Pass`

**Invalid Examples:**
- `password` (no uppercase, digit, or special char)
- `PASSWORD123` (no lowercase or special char)
- `Pass123` (too short)

## Role-Based Access Control

### Using Dependencies

#### Any Authenticated User
```python
from app.utils.dependencies import get_current_user

@router.get("/endpoint")
async def endpoint(current_user: User = Depends(get_current_user)):
    # Any authenticated user can access
    pass
```

#### Admin Only
```python
from app.utils.dependencies import require_admin

@router.post("/admin-action")
async def admin_action(current_user: User = Depends(require_admin)):
    # Only admins can access
    pass
```

#### Officials Only (Not Public Users)
```python
from app.utils.dependencies import require_official

@router.get("/official-data")
async def official_data(current_user: User = Depends(require_official)):
    # Any official (admin, moh, ephi, regional) can access
    pass
```

#### Specific Roles
```python
from app.utils.dependencies import require_roles
from app.models.user import UserRole

@router.get("/moh-only")
async def moh_only(
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.MOH_OFFICER)
    )
):
    # Only admins and MOH officers can access
    pass
```

### Access Control Matrix

| Endpoint | Public | Regional | EPHI | MOH | Admin |
|----------|--------|----------|------|-----|-------|
| Login | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mobile Register | ✅ | ❌ | ❌ | ❌ | ❌ |
| Get Current User | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Official | ❌ | ❌ | ❌ | ❌ | ✅ |
| View All Reports | ❌ | ✅ | ✅ | ✅ | ✅ |
| District Reports | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| System Config | ❌ | ❌ | ❌ | ❌ | ✅ |

## JWT Token Structure

### Token Payload
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "role": "public_user",
  "exp": 1705329000,
  "iat": 1705327200,
  "type": "access"
}
```

### Token Configuration
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Expiration**: 30 minutes (configurable)
- **Secret Key**: Stored in environment variable

## Security Features

### 1. Password Security
- ✅ Bcrypt hashing with automatic salt
- ✅ Password strength validation
- ✅ No plain text password storage
- ✅ Constant-time password comparison

### 2. Token Security
- ✅ JWT with signature verification
- ✅ Token expiration
- ✅ Secure secret key storage
- ✅ Bearer token authentication

### 3. Access Control
- ✅ Role-based permissions
- ✅ Active user check
- ✅ District-level data isolation
- ✅ Admin-only operations

### 4. Input Validation
- ✅ Email format validation
- ✅ Password strength requirements
- ✅ Role validation
- ✅ District ID validation for regional officers

## Testing the Authentication System

### 1. Create Admin User (Manual - First Time)

You'll need to manually create the first admin user in the database:

```python
# Run this script once to create initial admin
import asyncio
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.utils import get_password_hash
import uuid

async def create_admin():
    async with AsyncSessionLocal() as db:
        admin = User(
            id=uuid.uuid4(),
            email="admin@malasafe.gov.et",
            full_name="System Administrator",
            password_hash=get_password_hash("Admin@2024!"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print(f"Admin created: {admin.email}")

asyncio.run(create_admin())
```

### 2. Test Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@malasafe.gov.et",
    "password": "Admin@2024!"
  }'
```

### 3. Test Create Official
```bash
# Save the token from login response
TOKEN="your_access_token_here"

curl -X POST "http://localhost:8000/api/v1/auth/create-official" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "moh@example.com",
    "full_name": "MOH Officer",
    "password": "Officer@2024!",
    "role": "moh_officer"
  }'
```

### 4. Test Mobile Registration
```bash
curl -X POST "http://localhost:8000/api/v1/mobile/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "full_name": "Public User",
    "password": "User@2024!",
    "district_id": "addis_ababa"
  }'
```

### 5. Test Get Current User
```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "detail": "User with this email already exists"
}
```

#### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

#### 403 Forbidden
```json
{
  "detail": "Admin access required"
}
```

#### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "password"],
      "msg": "Password must contain at least one uppercase letter",
      "type": "value_error"
    }
  ]
}
```

## Best Practices

### For Frontend Developers

1. **Store Token Securely**
   - Use secure storage (not localStorage for sensitive apps)
   - Clear token on logout
   - Handle token expiration

2. **Include Token in Requests**
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```

3. **Handle Authentication Errors**
   - 401: Redirect to login
   - 403: Show "Access Denied" message
   - Token expired: Refresh or re-login

4. **Role-Based UI**
   - Show/hide features based on user role
   - Disable actions user can't perform

### For Backend Developers

1. **Always Use Dependencies**
   ```python
   # Good
   async def endpoint(user: User = Depends(get_current_user)):
       pass
   
   # Bad - manual token handling
   async def endpoint(token: str):
       pass
   ```

2. **Check Roles Appropriately**
   ```python
   # Use built-in dependencies
   Depends(require_admin)
   Depends(require_official)
   Depends(require_roles(UserRole.MOH_OFFICER))
   ```

3. **Filter Data by District**
   ```python
   if current_user.role == UserRole.REGIONAL_OFFICER:
       query = query.filter(Report.district_id == current_user.district_id)
   ```

4. **Log Security Events**
   ```python
   logger.warning(f"Failed login attempt: {email}")
   logger.info(f"Admin created new user: {new_user.email}")
   ```

## Troubleshooting

### "Could not validate credentials"
- Check token is included in Authorization header
- Verify token hasn't expired (30 min default)
- Ensure SECRET_KEY matches between token creation and validation

### "User account is inactive"
- User's `is_active` field is False
- Admin needs to activate the account

### "Access denied. Required roles: [...]"
- User doesn't have required role
- Check user's role in database
- Verify correct dependency is used

### "Password must contain..."
- Password doesn't meet strength requirements
- Review password requirements section

## Migration Guide

### Creating Initial Migration

```bash
# After setting up database
alembic revision --autogenerate -m "Add user authentication"
alembic upgrade head
```

### Database Schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    full_name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    role VARCHAR NOT NULL,  -- enum: admin, moh_officer, etc.
    district_id VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_district ON users(district_id);
```

---

## Support

For questions or issues with the authentication system:
1. Check this documentation
2. Review API docs at `/api/docs`
3. Check application logs
4. Contact the development team

**Last Updated:** January 2024
