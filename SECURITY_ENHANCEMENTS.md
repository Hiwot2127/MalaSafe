# MalaSafe Security Enhancements

## Overview

Comprehensive security features added to MalaSafe to enhance authentication, user management, and system monitoring.

---

## 🔐 Security Features Implemented

### 1. Force Password Change

**Purpose**: Ensure new users set their own secure password on first login.

**Implementation**:
- Added `force_password_change` boolean field to User model
- New users created by admin automatically have `force_password_change=true`
- Login response includes `force_password_change` flag
- Frontend should redirect to Change Password page if flag is true
- User cannot access dashboard until password is changed
- Flag is cleared after successful password update

**Database Field**:
```python
force_password_change = Column(Boolean, default=False)
```

**API Endpoints**:
- `POST /api/v1/auth/login` - Returns `force_password_change` in response
- `POST /api/v1/auth/change-password` - Changes password and clears flag

**Example Flow**:
1. Admin creates new user → `force_password_change=true`
2. User logs in → Response includes `"force_password_change": true`
3. Frontend redirects to Change Password page
4. User changes password → `force_password_change=false`
5. User can now access dashboard

---

### 2. Account Lockout

**Purpose**: Prevent brute force attacks by locking accounts after multiple failed login attempts.

**Implementation**:
- Track failed login attempts in `failed_login_attempts` field
- After 5 failed attempts, lock account for 15 minutes
- Set `account_locked_until` timestamp
- Return appropriate error message with remaining attempts
- Reset counter on successful login
- Admin can manually unlock accounts

**Database Fields**:
```python
failed_login_attempts = Column(Integer, default=0)
account_locked_until = Column(DateTime(timezone=True), nullable=True)
```

**Lockout Logic**:
- Attempt 1-4: Show remaining attempts
- Attempt 5: Lock account for 15 minutes
- Locked: Return 403 Forbidden with lockout message
- Successful login: Reset counter to 0

**User Model Methods**:
```python
def is_locked(self) -> bool
def lock_account(self, minutes: int = 15)
def unlock_account()
def increment_failed_login()
def reset_failed_login()
```

**API Endpoints**:
- `POST /api/v1/auth/login` - Implements lockout logic
- `POST /api/v1/admin/users/{user_id}/unlock` - Admin unlock

**Error Messages**:
- Failed login: "Incorrect email or password. X attempts remaining before account lockout."
- Account locked: "Account has been locked due to multiple failed login attempts. Please try again in 15 minutes."

---

### 3. Last Login Tracking

**Purpose**: Monitor user activity and detect suspicious login patterns.

**Implementation**:
- Track last login timestamp in `last_login_at`
- Track last login IP address in `last_login_ip`
- Update on every successful login
- Display in Admin User Management table
- Can be used for security auditing

**Database Fields**:
```python
last_login_at = Column(DateTime(timezone=True), nullable=True)
last_login_ip = Column(String, nullable=True)
```

**User Model Method**:
```python
def update_last_login(self, ip_address: str):
    self.last_login_at = datetime.utcnow()
    self.last_login_ip = ip_address
```

**Usage**:
```python
# Get client IP
client_ip = request.client.host if request.client else "unknown"

# Update on successful login
user.update_last_login(client_ip)
await db.commit()
```

---

### 4. User Status Indicators

**Purpose**: Provide clear visual indication of user account status.

**Implementation**:
- Added `status` property to User model
- Returns one of: "active", "inactive", "locked", "password_reset_required"
- Based on multiple factors: is_active, account_locked_until, force_password_change
- Display as badges in frontend

**Status Logic**:
```python
@property
def status(self) -> str:
    if not self.is_active:
        return "inactive"
    if self.is_locked():
        return "locked"
    if self.force_password_change:
        return "password_reset_required"
    return "active"
```

**Status Badges** (Frontend):
- **Active**: Green badge - Normal operation
- **Inactive**: Gray badge - Account disabled
- **Locked**: Red badge - Locked due to failed attempts
- **Password Reset Required**: Yellow badge - Must change password

---

### 5. Admin Dashboard Summary

**Purpose**: Provide comprehensive overview of system status and user metrics.

**Implementation**:
- New endpoint: `GET /api/v1/admin/dashboard-summary`
- Returns key metrics for admin dashboard
- Real-time data from database

**Metrics Included**:
1. **Total Users**: All users in system
2. **Active Users**: Users with is_active=true and not locked
3. **Inactive Users**: Users with is_active=false
4. **Locked Users**: Users currently locked due to failed login attempts
5. **Password Reset Required**: Users with force_password_change=true
6. **Monthly Uploads**: Uploads in current month
7. **Predictions Generated**: Total predictions
8. **Active Alerts**: Unresolved alerts
9. **Failed Login Attempts**: Failed logins in last 24 hours

**API Endpoint**:
```
GET /api/v1/admin/dashboard-summary
```

**Response Example**:
```json
{
  "total_users": 150,
  "active_users": 142,
  "inactive_users": 5,
  "locked_users": 3,
  "password_reset_required": 8,
  "monthly_uploads": 45,
  "predictions_generated": 1250,
  "active_alerts": 12,
  "failed_login_attempts": 23
}
```

---

### 6. Enhanced User Management

**Purpose**: Provide admins with comprehensive user management capabilities.

**Implementation**:
- Updated user list to include security fields
- Added unlock account endpoint
- Enhanced password reset with force change option
- Display last login information

**User List Response** (Enhanced):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "moh_officer",
  "district_id": null,
  "is_active": true,
  "force_password_change": false,
  "failed_login_attempts": 0,
  "account_locked_until": null,
  "last_login_at": "2024-01-15T10:30:00Z",
  "last_login_ip": "192.168.1.1",
  "status": "active",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**New Admin Endpoints**:
- `POST /api/v1/admin/users/{user_id}/unlock` - Unlock locked account
- `GET /api/v1/admin/dashboard-summary` - Get dashboard metrics

---

## 📊 Database Migration

**Migration File**: `008_add_user_security_fields.py`

**Changes**:
- Add `force_password_change` (Boolean, default=false)
- Add `failed_login_attempts` (Integer, default=0)
- Add `account_locked_until` (DateTime, nullable)
- Add `last_login_at` (DateTime, nullable)
- Add `last_login_ip` (String, nullable)
- Add indexes for performance

**Run Migration**:
```bash
# Development
docker compose exec backend alembic upgrade head

# Production
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## 🔒 Security Best Practices

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

### Account Lockout Policy
- 5 failed attempts trigger lockout
- 15-minute lockout duration
- Admin can manually unlock
- Counter resets on successful login

### Session Management
- Access tokens expire in 30 minutes
- Refresh tokens expire in 7 days
- HttpOnly cookies for security
- Token rotation on refresh

### Audit Logging
- All login attempts logged
- Failed logins tracked
- Account unlocks logged
- Password resets logged

---

## 🎨 Frontend Integration

### 1. Login Flow

```typescript
// Login request
const response = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

// Check if password change required
if (response.data.force_password_change) {
  // Redirect to change password page
  router.push('/change-password');
} else {
  // Redirect to dashboard
  router.push('/dashboard');
}
```

### 2. Change Password Page

```typescript
// Change password request
const response = await api.post('/auth/change-password', {
  current_password: 'oldPassword',
  new_password: 'newSecurePassword123!'
});

// After successful change, redirect to dashboard
if (response.data.force_password_change === false) {
  router.push('/dashboard');
}
```

### 3. Admin Dashboard

```typescript
// Fetch dashboard summary
const summary = await api.get('/admin/dashboard-summary');

// Display metrics
<DashboardCard title="Total Users" value={summary.total_users} />
<DashboardCard title="Active Users" value={summary.active_users} />
<DashboardCard title="Locked Users" value={summary.locked_users} />
<DashboardCard title="Password Resets" value={summary.password_reset_required} />
```

### 4. User Status Badges

```typescript
function UserStatusBadge({ status }: { status: string }) {
  const badges = {
    active: { color: 'green', text: 'Active' },
    inactive: { color: 'gray', text: 'Inactive' },
    locked: { color: 'red', text: 'Locked' },
    password_reset_required: { color: 'yellow', text: 'Password Reset Required' }
  };
  
  const badge = badges[status];
  return <Badge color={badge.color}>{badge.text}</Badge>;
}
```

### 5. User Management Table

```typescript
// Display last login info
<Table>
  <TableRow>
    <TableCell>{user.email}</TableCell>
    <TableCell><UserStatusBadge status={user.status} /></TableCell>
    <TableCell>{formatDate(user.last_login_at)}</TableCell>
    <TableCell>{user.last_login_ip}</TableCell>
    <TableCell>
      {user.status === 'locked' && (
        <Button onClick={() => unlockAccount(user.id)}>
          Unlock
        </Button>
      )}
    </TableCell>
  </TableRow>
</Table>
```

---

## 🧪 Testing

### Test Scenarios

1. **Force Password Change**
   - Create new user as admin
   - Login with new user
   - Verify force_password_change=true
   - Change password
   - Verify force_password_change=false

2. **Account Lockout**
   - Attempt login with wrong password 5 times
   - Verify account is locked
   - Wait 15 minutes or admin unlock
   - Verify can login again

3. **Last Login Tracking**
   - Login successfully
   - Check last_login_at is updated
   - Check last_login_ip is recorded

4. **Dashboard Summary**
   - Create various users with different statuses
   - Call dashboard-summary endpoint
   - Verify counts are accurate

---

## 📝 API Documentation

All endpoints are documented in Swagger UI:
- **Development**: http://localhost:8000/api/docs
- **Production**: https://api.your-domain.com/api/docs

### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login with lockout protection | Public |
| POST | `/auth/change-password` | Change password | User |
| GET | `/auth/me` | Get current user info | User |
| GET | `/admin/dashboard-summary` | Get dashboard metrics | Admin |
| GET | `/admin/users` | List all users | Admin |
| POST | `/admin/users/{id}/unlock` | Unlock account | Admin |
| POST | `/admin/users/{id}/reset-password` | Reset password | Admin |

---

## 🔄 Upgrade Path

### For Existing Deployments

1. **Backup Database**:
   ```bash
   docker compose exec postgres pg_dump -U malasafe malasafe > backup.sql
   ```

2. **Pull Latest Code**:
   ```bash
   git pull origin main
   ```

3. **Run Migration**:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

4. **Restart Services**:
   ```bash
   docker compose restart backend
   ```

5. **Verify**:
   - Check API docs for new endpoints
   - Test login with existing users
   - Verify dashboard summary works

---

## 🎯 Benefits

### Security
- ✅ Protection against brute force attacks
- ✅ Forced password changes for new users
- ✅ Activity tracking for auditing
- ✅ Clear account status visibility

### User Experience
- ✅ Clear error messages with remaining attempts
- ✅ Automatic lockout prevents account compromise
- ✅ Admin can quickly unlock legitimate users
- ✅ Status badges provide instant feedback

### Administration
- ✅ Comprehensive dashboard metrics
- ✅ Easy user management
- ✅ Security monitoring capabilities
- ✅ Audit trail for compliance

---

## 📊 Monitoring

### Metrics to Watch

1. **Failed Login Attempts**: Spike may indicate attack
2. **Locked Accounts**: High number may indicate issues
3. **Password Resets**: Track forced changes
4. **Last Login**: Identify inactive accounts

### Alerts to Configure

- Failed login attempts > 50 in 1 hour
- Locked accounts > 10
- No admin login in 7 days
- Unusual login patterns (time/location)

---

## 🚀 Future Enhancements

### Potential Additions

1. **Two-Factor Authentication (2FA)**
   - SMS or authenticator app
   - Required for admin accounts

2. **Password History**
   - Prevent reuse of last 5 passwords
   - Track password change dates

3. **Session Management**
   - View active sessions
   - Revoke specific sessions
   - Force logout all devices

4. **Advanced Monitoring**
   - Login location tracking
   - Unusual activity detection
   - Email notifications for security events

5. **Password Expiry**
   - Force password change every 90 days
   - Configurable per role

---

## 📚 References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

---

**Last Updated**: May 30, 2026  
**MalaSafe Version**: 1.0.0  
**Migration**: 008_add_user_security_fields.py
