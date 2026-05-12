# MalaSafe Backend Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Web Browser, Mobile App, External Services)               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Layer (Routes)                       │  │
│  │  • /api/v1/health  • /api/v1/auth  • /api/v1/...    │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │           Middleware Layer                            │  │
│  │  • CORS  • Authentication  • Logging  • Error        │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │           Service Layer (Business Logic)              │  │
│  │  • User Service  • Prediction Service  • ...         │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │           Data Layer (Models & Schemas)               │  │
│  │  • SQLAlchemy Models  • Pydantic Schemas             │  │
│  └────────────────────┬─────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │PostgreSQL│    │  Redis  │    │AI Models│
    │ Database │    │  Cache  │    │  (ML)   │
    └─────────┘    └─────────┘    └─────────┘
```

## 📂 Directory Structure Explained

### `/app` - Main Application Directory

#### `main.py` - Application Entry Point
- FastAPI app initialization
- Middleware configuration
- Router registration
- Startup/shutdown events
- Global exception handlers

#### `/config` - Configuration Management
```python
settings.py          # Pydantic settings from environment
__init__.py         # Export settings instance
```
**Purpose**: Centralized configuration using environment variables

#### `/database` - Database Layer
```python
base.py             # SQLAlchemy engine, session, Base class
__init__.py         # Export database utilities
```
**Features**:
- Async engine for FastAPI
- Sync engine for Alembic
- Session factory
- Dependency injection for DB sessions

#### `/models` - SQLAlchemy ORM Models
```python
user.py             # User model (example)
__init__.py         # Export all models
```
**Purpose**: Database table definitions and relationships

#### `/schemas` - Pydantic Schemas
```python
user.py             # User validation schemas
__init__.py         # Export all schemas
```
**Purpose**: Request/response validation and serialization

#### `/routes` - API Endpoints
```python
health.py           # Health check endpoints
auth.py             # Authentication endpoints
__init__.py         # Export all routers
```
**Purpose**: HTTP endpoint definitions and routing

#### `/services` - Business Logic
```python
# Add service classes here
user_service.py     # User-related business logic
prediction_service.py  # ML prediction logic
```
**Purpose**: Reusable business logic separated from routes

#### `/middleware` - Custom Middleware
```python
cors.py             # CORS configuration
__init__.py         # Export middleware setup
```
**Purpose**: Request/response processing pipeline

#### `/utils` - Utility Functions
```python
security.py         # JWT and password utilities
__init__.py         # Export utilities
```
**Purpose**: Reusable helper functions

#### `/ai` - Machine Learning
```python
# Add ML models and prediction logic
models.py           # ML model loading and inference
preprocessing.py    # Data preprocessing
```
**Purpose**: AI/ML functionality for malaria prediction

### `/alembic` - Database Migrations

```
env.py              # Alembic environment configuration
script.py.mako      # Migration template
versions/           # Migration files (auto-generated)
```

## 🔄 Request Flow

### 1. Authentication Flow
```
Client
  │
  ├─► POST /api/v1/auth/register
  │     │
  │     ├─► Pydantic validates UserCreate schema
  │     ├─► Check if user exists (database query)
  │     ├─► Hash password (bcrypt)
  │     ├─► Create user in database
  │     └─► Return UserResponse
  │
  ├─► POST /api/v1/auth/login
  │     │
  │     ├─► Validate credentials
  │     ├─► Verify password hash
  │     ├─► Generate JWT tokens (access + refresh)
  │     └─► Return Token response
  │
  └─► GET /api/v1/auth/me (with Bearer token)
        │
        ├─► Extract token from Authorization header
        ├─► Decode and verify JWT
        ├─► Get user from database
        └─► Return UserResponse
```

### 2. Protected Endpoint Flow
```
Client Request with JWT
        │
        ▼
  CORS Middleware
        │
        ▼
  OAuth2 Token Extraction
        │
        ▼
  JWT Verification (utils/security.py)
        │
        ▼
  Get User from DB (get_current_user)
        │
        ▼
  Route Handler
        │
        ▼
  Service Layer (business logic)
        │
        ▼
  Database Operations
        │
        ▼
  Pydantic Response Schema
        │
        ▼
  JSON Response to Client
```

## 🔐 Security Architecture

### Authentication & Authorization
```
┌─────────────────────────────────────────┐
│         JWT Token Structure              │
├─────────────────────────────────────────┤
│ Header:                                  │
│   - Algorithm: HS256                     │
│   - Type: JWT                            │
├─────────────────────────────────────────┤
│ Payload:                                 │
│   - sub: user_id                         │
│   - username: username                   │
│   - exp: expiration_timestamp            │
│   - type: "access" or "refresh"          │
├─────────────────────────────────────────┤
│ Signature:                               │
│   - HMACSHA256(header + payload, secret) │
└─────────────────────────────────────────┘
```

### Password Security
- **Hashing**: bcrypt with automatic salt
- **Rounds**: Default bcrypt rounds (secure)
- **Storage**: Only hashed passwords in database
- **Verification**: Constant-time comparison

## 🗄️ Database Architecture

### Connection Management
```
┌──────────────────────────────────────┐
│      Application Layer                │
├──────────────────────────────────────┤
│  Async Operations (FastAPI)          │
│    ↓                                  │
│  AsyncSessionLocal                    │
│    ↓                                  │
│  async_engine (asyncpg)               │
│    ↓                                  │
│  PostgreSQL Database                  │
├──────────────────────────────────────┤
│  Sync Operations (Alembic)            │
│    ↓                                  │
│  SessionLocal                         │
│    ↓                                  │
│  sync_engine (psycopg2)               │
│    ↓                                  │
│  PostgreSQL Database                  │
└──────────────────────────────────────┘
```

### Connection Pool Settings
- **Pool Size**: 10 connections
- **Max Overflow**: 20 additional connections
- **Pre-ping**: Enabled (connection health check)
- **Echo**: Enabled in DEBUG mode

## 🚀 Deployment Architecture

### Development
```
Developer Machine
    │
    ├─► FastAPI (uvicorn --reload)
    ├─► PostgreSQL (local)
    └─► Redis (local)
```

### Production
```
Load Balancer
    │
    ├─► FastAPI Instance 1 (gunicorn + uvicorn workers)
    ├─► FastAPI Instance 2 (gunicorn + uvicorn workers)
    └─► FastAPI Instance N (gunicorn + uvicorn workers)
         │
         ├─► PostgreSQL (managed service)
         ├─► Redis (managed service)
         └─► Object Storage (for uploads)
```

## 📊 Data Flow Patterns

### CRUD Operations
```python
# Create
route → service → model → database → response

# Read
route → service → database query → model → schema → response

# Update
route → service → database query → update model → commit → response

# Delete
route → service → database query → delete → commit → response
```

### AI Prediction Flow
```
Client Request (symptoms, location, etc.)
    │
    ▼
API Endpoint (/api/v1/predict)
    │
    ▼
Validation (Pydantic Schema)
    │
    ▼
Prediction Service
    │
    ├─► Load ML Model (from /models)
    ├─► Preprocess Input Data
    ├─► Run Prediction
    └─► Post-process Results
    │
    ▼
Store Prediction (Database)
    │
    ▼
Return Response (Pydantic Schema)
```

## 🔧 Configuration Management

### Environment-Based Settings
```
.env (local development)
    ↓
Settings Class (Pydantic)
    ↓
Cached Instance (lru_cache)
    ↓
Used Throughout Application
```

### Configuration Hierarchy
1. Environment variables (.env file)
2. Default values (in Settings class)
3. Runtime overrides (if needed)

## 📈 Scalability Considerations

### Horizontal Scaling
- Stateless application design
- JWT tokens (no server-side sessions)
- Database connection pooling
- Redis for shared state (if needed)

### Vertical Scaling
- Async operations for I/O
- Connection pooling
- Efficient database queries
- Caching strategies

### Performance Optimization
- Database indexes on frequently queried fields
- Lazy loading for relationships
- Pagination for large datasets
- Background tasks for heavy operations (Celery)

## 🧪 Testing Strategy

### Unit Tests
- Test individual functions
- Mock database calls
- Test business logic in services

### Integration Tests
- Test API endpoints
- Test database operations
- Test authentication flow

### End-to-End Tests
- Test complete user flows
- Test with real database (test DB)
- Test error scenarios

## 📝 Code Organization Principles

### Separation of Concerns
- **Routes**: HTTP handling only
- **Services**: Business logic
- **Models**: Data structure
- **Schemas**: Validation
- **Utils**: Reusable functions

### Dependency Injection
- Database sessions via `Depends(get_db)`
- Current user via `Depends(get_current_user)`
- Settings via `Depends(get_settings)`

### Type Safety
- Type hints throughout
- Pydantic for runtime validation
- SQLAlchemy for database types

## 🎯 Best Practices Implemented

1. **Clean Architecture**: Clear separation of layers
2. **Async/Await**: Non-blocking I/O operations
3. **Type Hints**: Better IDE support and type checking
4. **Pydantic Validation**: Automatic request/response validation
5. **Environment Config**: 12-factor app methodology
6. **Database Migrations**: Version-controlled schema changes
7. **Security**: JWT, password hashing, CORS
8. **Logging**: Structured logging with Loguru
9. **Error Handling**: Global exception handlers
10. **API Versioning**: Future-proof API design

---

This architecture provides a solid foundation for building a scalable, maintainable, and secure malaria surveillance and prediction system.
