# MalaSafe RBAC Architecture

## Overview

This document describes the Role-Based Access Control (RBAC) architecture implemented in MalaSafe. The system uses a comprehensive permission-based approach with separate admin and operational dashboards.

## Architecture Principles

1. **Separation of Concerns**: Admin functions are completely separate from operational functions
2. **Backend Enforcement**: All permissions are enforced at the API level
3. **Frontend Visibility**: UI elements are hidden/shown based on permissions (for UX only)
4. **Audit Logging**: All security-sensitive operations are logged
5. **Least Privilege**: Users only have access to what they need

## Roles

### 1. ADMIN
**Purpose**: System governance and security management

**Can Do**:
- Create, edit, and manage user accounts
- Reset passwords and change roles
- Activate/deactivate accounts
- View upload metadata (filename, uploader, date, counts)
- View audit logs and security logs
- View system health metrics
- Manage system settings

**Cannot Do**:
- Upload malaria/climate data
- View raw CSV contents
- Download uploaded CSV files
- Modify surveillance data

**Default Redirect**: `/admin`

### 2. MOH_OFFICER (Ministry of Health Officer)
**Purpose**: Monthly malaria data management

**Can Do**:
- Upload monthly malaria data
- Upload climate data
- View and download uploaded files
- View analytics, maps, predictions, alerts
- Initiate and approve monthly close operations

**Cannot Do**:
- Access admin panel
- Create users
- Upload weekly malaria data

**Default Redirect**: `/dashboard`

### 3. EPHI_OFFICER (Ethiopian Public Health Institute Officer)
**Purpose**: Weekly malaria data management

**Can Do**:
- Upload weekly malaria data
- Upload climate data
- View and download uploaded files
- View analytics, maps, predictions, alerts

**Cannot Do**:
- Access admin panel
- Create users
- Upload monthly malaria data
- Approve monthly close

**Default Redirect**: `/dashboard`

### 4. REGIONAL_OFFICER
**Purpose**: Read-only surveillance monitoring

**Can Do**:
- View analytics, maps, predictions, alerts
- View reports

**Cannot Do**:
- Upload any data
- Access admin panel
- Create users
- Modify any data

**Default Redirect**: `/dashboard`

### 5. PUBLIC_USER
**Purpose**: Mobile app access only

**Can Do**:
- Use public mobile app
- View public risk levels
- View public alerts

**Cannot Do**:
- Access web dashboard
- Access admin panel
- Upload data

**Default Redirect**: `/public` (mobile app)

## Directory Structure

```
backend/
├── app/
│   ├── models/
│   │   └── audit_log.py          # Audit log model
│   ├── routes/
│   │   ├── admin.py              # Admin-only routes
│   │   └── auth.py               # Authentication with audit logging
│   ├── services/
│   │   └── audit_service.py      # Audit logging service
│   └── utils/
│       ├── rbac.py               # Permission definitions
│       ├── dependencies.py       # Auth dependencies
│       └── security.py           # Password & JWT utilities

frontend/
├── app/
│   ├── (admin)/                  # Admin dashboard
│   │   ├── layout.tsx            # Admin layout with route guard
│   │   └── admin/
│   │       ├── page.tsx          # Admin home
│   │       ├── users/            # User management
│   │       ├── audit-logs/       # Audit logs
│   │       └── system-health/    # System health
│   ├── (dashboard)/              # Operational dashboard
│   │   ├── layout.tsx            # Dashboard layout
│   │   └── dashboard/
│   │       ├── analytics/
│   │       ├── maps/
│   │       ├── predictions/
│   │       ├── alerts/
│   │       └── upload/
│   │           ├── monthly/      # MOH_OFFICER only
│   │           ├── weekly/       # EPHI_OFFICER only
│   │           └── climate/      # MOH & EPHI
│   └── (auth)/
│       └── login/                # Login with role-based redirect
├── components/
│   ├── admin/
│   │   ├── admin-sidebar.tsx     # Admin navigation
│   │   └── admin-header.tsx      # Admin header
│   └── dashboard/
│       ├── dashboard-sidebar.tsx # Operational navigation
│       └── dashboard-header.tsx  # Dashboard header
└── lib/
    └── rbac/
        ├── permissions.ts        # Permission definitions
        ├── navigation.ts         # Navigation configuration
        └── route-guard.ts        # Route protection
```

## Permission System

### Backend Permissions (Python Enum)

```python
class Permission(str, Enum):
    # User Management
    CREATE_USER = "create_user"
    EDIT_USER = "edit_user"
    RESET_PASSWORD = "reset_password"
    
    # Data Upload
    UPLOAD_MONTHLY_MALARIA = "upload_monthly_malaria"
    UPLOAD_WEEKLY_MALARIA = "upload_weekly_malaria"
    UPLOAD_CLIMATE = "upload_climate"
    VIEW_UPLOAD_METADATA = "view_upload_metadata"
    VIEW_UPLOAD_CONTENTS = "view_upload_contents"
    
    # Analytics
    VIEW_ANALYTICS = "view_analytics"
    VIEW_MAPS = "view_maps"
    VIEW_PREDICTIONS = "view_predictions"
    VIEW_ALERTS = "view_alerts"
    
    # System Administration
    VIEW_AUDIT_LOGS = "view_audit_logs"
    VIEW_SYSTEM_HEALTH = "view_system_health"
```

### Frontend Permissions (TypeScript Enum)

Mirrors backend permissions for consistency.

## Authentication Flow

```
1. User enters credentials
   ↓
2. POST /api/v1/auth/login
   ↓
3. Backend validates credentials
   ↓
4. Audit log created (success/failure)
   ↓
5. JWT token generated with user_id, email, role
   ↓
6. Frontend stores token + user in localStorage
   ↓
7. Redirect based on role:
   - ADMIN → /admin
   - MOH/EPHI/REGIONAL → /dashboard
   - PUBLIC_USER → /public
```

## Route Protection

### Backend (FastAPI Dependencies)

```python
# Require specific role
@router.get("/admin/users", dependencies=[Depends(require_admin)])
async def list_users():
    ...

# Require any of multiple roles
@router.post("/upload", dependencies=[Depends(require_roles(
    UserRole.MOH_OFFICER,
    UserRole.EPHI_OFFICER
))])
async def upload_data():
    ...
```

### Frontend (Next.js Middleware)

```typescript
// Layout-level protection
useEffect(() => {
  if (!user) {
    router.push('/login?next=/admin');
  } else if (!canAccessAdminPanel(user.role)) {
    router.push('/dashboard');
  }
}, [user]);
```

## Navigation System

### Dynamic Sidebar Generation

Navigation items are filtered based on user permissions:

```typescript
const navigation = filterNavigation(ADMIN_NAVIGATION, user.role);
```

Each nav item can specify required permissions:

```typescript
{
  label: 'Upload Monthly',
  href: '/dashboard/upload/monthly',
  icon: FileUp,
  requiredPermissions: [Permission.UPLOAD_MONTHLY_MALARIA],
}
```

## Audit Logging

### Logged Events

- **Authentication**: Login success/failure, logout
- **User Management**: Create, edit, delete, role change, activation
- **Password Operations**: Reset, change
- **Data Operations**: Upload, delete, modify
- **System Changes**: Settings changes, configuration updates

### Audit Log Structure

```typescript
{
  id: UUID,
  actor_id: UUID,           // Who performed the action
  actor_email: string,
  actor_role: string,
  action: string,           // e.g., "user_created", "login_success"
  resource_type: string,    // e.g., "user", "upload", "system"
  resource_id: string,      // ID of affected resource
  description: string,      // Human-readable description
  metadata: JSON,           // Additional context
  timestamp: DateTime,
  ip_address: string,
  user_agent: string,
  status: string,           // "success", "failure", "warning"
}
```

## Security Best Practices

### 1. Backend Enforcement
- All permissions checked at API level
- Frontend hiding is for UX only, not security
- JWT tokens validated on every request

### 2. Password Security
- Bcrypt hashing with salt
- Minimum 8 characters
- Must include: uppercase, lowercase, digit, special character
- Temporary passwords generated securely

### 3. Audit Trail
- All security-sensitive operations logged
- Logs include IP address and user agent
- Failed login attempts tracked

### 4. Data Access Control
- Admin can ONLY see upload metadata
- Admin CANNOT access raw CSV contents
- Upload contents only visible to uploaders and operational roles

### 5. Session Management
- JWT tokens with expiration
- Tokens stored in localStorage and httpOnly cookies
- Automatic logout on token expiration

## API Endpoints

### Admin Routes (`/api/v1/admin/*`)

```
GET    /admin/users                    # List all users
POST   /admin/users                    # Create user
GET    /admin/users/{id}               # Get user details
PATCH  /admin/users/{id}               # Update user
POST   /admin/users/{id}/reset-password # Reset password

GET    /admin/uploads                  # View upload metadata (NO CONTENTS)
GET    /admin/audit-logs               # View audit logs
GET    /admin/system-health            # System health metrics
```

### Authentication Routes (`/api/v1/auth/*`)

```
POST   /auth/login                     # Login (all users)
GET    /auth/me                        # Get current user
POST   /auth/create-official           # Create official (admin only)
```

## User Creation Flow

### Admin Creates User

1. Admin fills form with:
   - Full name
   - Institutional email (@moh.gov.et, @ephi.gov.et, etc.)
   - Role
   - District (if regional officer)

2. System generates secure temporary password

3. User receives email with credentials

4. On first login, user must change password

5. Audit log created

### Email Domains

**Use real institutional emails**:
- `@moh.gov.et` - Ministry of Health
- `@ephi.gov.et` - Ethiopian Public Health Institute
- Regional bureau emails

**Do NOT use**:
- `@malasafe.gov.et` (fake domain)

## Testing the System

### 1. Create Test Users

```bash
# Run backend
cd backend
python -m uvicorn app.main:app --reload

# Create admin user (via database or initial migration)
# Then use admin to create other users via API
```

### 2. Test Role-Based Access

```bash
# Login as ADMIN
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@moh.gov.et","password":"Admin@123"}'

# Try to access admin endpoint (should succeed)
curl http://localhost:8000/api/v1/admin/users \
  -H "Authorization: Bearer <token>"

# Login as MOH_OFFICER
# Try to access admin endpoint (should fail with 403)
```

### 3. Test Frontend Navigation

1. Login as ADMIN → Should see admin sidebar
2. Login as MOH_OFFICER → Should see dashboard with monthly upload
3. Login as EPHI_OFFICER → Should see dashboard with weekly upload
4. Login as REGIONAL_OFFICER → Should see dashboard without uploads

## Migration Guide

### Running Migrations

```bash
cd backend

# Create migration
alembic revision -m "add audit logs"

# Run migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Initial Admin User

Create via SQL or migration:

```sql
INSERT INTO users (id, email, full_name, password_hash, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin@moh.gov.et',
  'System Administrator',
  '$2b$12$...', -- bcrypt hash of 'Admin@123'
  'admin',
  true
);
```

## Troubleshooting

### Issue: User can't access page after login

**Check**:
1. User role in database
2. JWT token contains correct role
3. Route protection in layout.tsx
4. Navigation permissions

### Issue: Admin can see CSV contents

**Fix**: Ensure admin routes only return metadata, not file contents.

### Issue: Audit logs not created

**Check**:
1. AuditService imported in route
2. Database migration run
3. Request object passed to audit service

## Future Enhancements

1. **Multi-Factor Authentication**: Add 2FA for admin accounts
2. **IP Whitelisting**: Restrict admin access to specific IPs
3. **Session Management**: Track active sessions, force logout
4. **Permission Groups**: Create custom permission groups
5. **Delegation**: Allow admins to delegate specific permissions
6. **Audit Log Export**: Export logs for compliance
7. **Real-time Notifications**: Alert on suspicious activity

## Compliance

This RBAC system supports:
- **GDPR**: Audit trails, data access control
- **HIPAA**: Healthcare data protection (if applicable)
- **SOC 2**: Access control, audit logging
- **ISO 27001**: Information security management

## Support

For questions or issues:
- Backend: Check `backend/app/routes/admin.py`
- Frontend: Check `frontend/lib/rbac/`
- Documentation: This file

---

**Last Updated**: January 2024
**Version**: 1.0.0
