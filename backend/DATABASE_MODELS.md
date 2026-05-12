# MalaSafe Database Models Documentation

## Overview

Complete SQLAlchemy models for the malaria surveillance system with proper relationships, constraints, and indexes.

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐
│   Users     │
│             │
│ id (PK)     │
│ email       │
│ role        │
│ district_id │
└──────┬──────┘
       │
       │ uploaded_by (FK)
       │
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌─────────────┐              ┌─────────────┐
│MalariaData  │              │UploadedFiles│
│             │              │             │
│ id (PK)     │              │ id (PK)     │
│ district_id │              │ file_name   │
│ cases       │              │ upload_type │
│ deaths      │              │ uploaded_by │
└──────┬──────┘              └─────────────┘
       │
       │ district_id (FK)
       │
       ▼
┌─────────────┐
│  Districts  │◄──────────────────┐
│             │                   │
│ id (PK)     │                   │
│ code (UQ)   │                   │
│ name        │                   │
│ region      │                   │
└──────┬──────┘                   │
       │                          │
       │ district_id (FK)         │
       │                          │
       ├──────────────────────────┤
       │                          │
       ▼                          │
┌─────────────┐                   │
│ClimateData  │                   │
│             │                   │
│ id (PK)     │                   │
│ district_id │                   │
│ rainfall    │                   │
│ temperature │                   │
│ date        │                   │
└─────────────┘                   │
       │                          │
       ▼                          │
┌─────────────┐                   │
│District     │                   │
│Environment  │                   │
│             │                   │
│ id (PK)     │                   │
│ district_id │                   │
│ altitude    │                   │
└─────────────┘                   │
       │                          │
       ▼                          │
┌─────────────┐                   │
│ Predictions │                   │
│             │                   │
│ id (PK)     │                   │
│ district_id │───────────────────┘
│ risk_level  │
│ confidence  │
│ pred_date   │
└─────────────┘
       │
       ▼
┌─────────────┐
│   Alerts    │
│             │
│ id (PK)     │
│ district_id │
│ risk_level  │
│ message     │
│ is_active   │
└─────────────┘
```

## Table Definitions

### 1. Users Table

**Purpose:** Store user accounts with role-based access control

```python
class User(Base):
    __tablename__ = "users"
    
    id = UUID (PK)
    full_name = String
    email = String (UNIQUE)
    password_hash = String
    role = Enum (admin, moh_officer, ephi_officer, regional_officer, public_user)
    district_id = String (nullable)
    is_active = Boolean
    created_at = DateTime
    updated_at = DateTime
```

**Indexes:**
- `ix_users_id` - Primary key index
- `ix_users_email` - Email lookup
- `ix_users_role` - Role-based queries

**Constraints:**
- Unique email
- Role must be valid enum value

### 2. Districts Table

**Purpose:** Store geographical district information

```python
class District(Base):
    __tablename__ = "districts"
    
    id = UUID (PK)
    district_code = String(50) (UNIQUE)
    district_name = String(100)
    region = String(100)
    zone = String(100) (nullable)
    geojson_key = String(100) (nullable)
    created_at = DateTime
```

**Indexes:**
- `ix_districts_id` - Primary key index
- `ix_districts_code` - District code lookup
- `ix_districts_name` - Name search
- `ix_districts_region` - Region filtering

**Constraints:**
- Unique district_code

**Relationships:**
- One-to-many with MalariaData
- One-to-many with ClimateData
- One-to-one with DistrictEnvironment
- One-to-many with Predictions
- One-to-many with Alerts

### 3. Malaria Data Table

**Purpose:** Store malaria case and death statistics

```python
class MalariaData(Base):
    __tablename__ = "malaria_data"
    
    id = UUID (PK)
    district_id = UUID (FK -> districts.id)
    source_type = String(50)
    week = Integer (nullable)
    month = Integer
    year = Integer
    cases = Integer (default=0)
    deaths = Integer (default=0)
    uploaded_by = UUID (FK -> users.id)
    created_at = DateTime
```

**Indexes:**
- `ix_malaria_data_id` - Primary key
- `ix_malaria_data_district_id` - District filtering
- `ix_malaria_data_source_type` - Source filtering
- `ix_malaria_data_month` - Month filtering
- `ix_malaria_data_year` - Year filtering
- `idx_malaria_district_year_month` - Composite for time-series queries
- `idx_malaria_year_month` - National time-series

**Constraints:**
- `cases >= 0`
- `deaths >= 0`
- `deaths <= cases`
- `week >= 1 AND week <= 53`
- `month >= 1 AND month <= 12`
- `year >= 2000 AND year <= 2100`
- Foreign key to districts (CASCADE delete)
- Foreign key to users (SET NULL on delete)

**Relationships:**
- Many-to-one with District
- Many-to-one with User (uploader)

### 4. Climate Data Table

**Purpose:** Store environmental climate data

```python
class ClimateData(Base):
    __tablename__ = "climate_data"
    
    id = UUID (PK)
    district_id = UUID (FK -> districts.id)
    rainfall = Float (nullable)
    temperature = Float (nullable)
    season = String(50) (nullable)
    date = Date
    created_at = DateTime
```

**Indexes:**
- `ix_climate_data_id` - Primary key
- `ix_climate_data_district_id` - District filtering
- `ix_climate_data_season` - Season filtering
- `ix_climate_data_date` - Date filtering
- `idx_climate_district_date` - Composite for time-series

**Constraints:**
- `rainfall >= 0`
- `temperature >= -50 AND temperature <= 60`
- Foreign key to districts (CASCADE delete)

**Relationships:**
- Many-to-one with District

### 5. District Environment Table

**Purpose:** Store static environmental characteristics

```python
class DistrictEnvironment(Base):
    __tablename__ = "district_environment"
    
    id = UUID (PK)
    district_id = UUID (FK -> districts.id, UNIQUE)
    altitude = Float (nullable)
    created_at = DateTime
```

**Indexes:**
- `ix_district_environment_id` - Primary key
- `ix_district_environment_district_id` - District lookup

**Constraints:**
- `altitude >= -500 AND altitude <= 9000`
- Unique district_id (one-to-one relationship)
- Foreign key to districts (CASCADE delete)

**Relationships:**
- One-to-one with District

### 6. Predictions Table

**Purpose:** Store ML model predictions

```python
class Prediction(Base):
    __tablename__ = "predictions"
    
    id = UUID (PK)
    district_id = UUID (FK -> districts.id)
    risk_level = String(20)  # low, moderate, high, very_high
    confidence_score = Float  # 0.0 to 1.0
    prediction_score = Float
    prediction_reason = Text (nullable)
    prediction_date = Date
    created_at = DateTime
```

**Indexes:**
- `ix_predictions_id` - Primary key
- `ix_predictions_district_id` - District filtering
- `ix_predictions_risk_level` - Risk filtering
- `ix_predictions_prediction_date` - Date filtering
- `ix_predictions_created_at` - Creation time
- `idx_prediction_district_date` - Composite for queries
- `idx_prediction_date_risk` - Risk analysis over time

**Constraints:**
- `confidence_score >= 0 AND confidence_score <= 1`
- `risk_level IN ('low', 'moderate', 'high', 'very_high')`
- Foreign key to districts (CASCADE delete)

**Relationships:**
- Many-to-one with District

### 7. Alerts Table

**Purpose:** Store active malaria risk alerts

```python
class Alert(Base):
    __tablename__ = "alerts"
    
    id = UUID (PK)
    district_id = UUID (FK -> districts.id)
    risk_level = String(20)  # low, moderate, high, very_high
    message = Text
    is_active = Boolean (default=True)
    created_at = DateTime
```

**Indexes:**
- `ix_alerts_id` - Primary key
- `ix_alerts_district_id` - District filtering
- `ix_alerts_risk_level` - Risk filtering
- `ix_alerts_is_active` - Active alerts
- `ix_alerts_created_at` - Creation time
- `idx_alert_district_active` - Active alerts by district
- `idx_alert_active_created` - Recent active alerts

**Constraints:**
- `risk_level IN ('low', 'moderate', 'high', 'very_high')`
- Foreign key to districts (CASCADE delete)

**Relationships:**
- Many-to-one with District

### 8. Uploaded Files Table

**Purpose:** Track file uploads for audit

```python
class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id = UUID (PK)
    file_name = String(255)
    upload_type = String(50)  # malaria_data, climate_data, bulk_import
    uploaded_by = UUID (FK -> users.id)
    created_at = DateTime
```

**Indexes:**
- `ix_uploaded_files_id` - Primary key
- `ix_uploaded_files_upload_type` - Type filtering
- `ix_uploaded_files_uploaded_by` - User filtering
- `ix_uploaded_files_created_at` - Time filtering
- `idx_uploaded_file_type_date` - Type and time
- `idx_uploaded_file_uploader_date` - User and time

**Constraints:**
- Foreign key to users (SET NULL on delete)

**Relationships:**
- Many-to-one with User (uploader)

## Common Query Patterns

### 1. Get Malaria Data for District by Time Period

```python
from sqlalchemy import select
from app.models import MalariaData

# Get data for specific district and year
query = select(MalariaData).where(
    MalariaData.district_id == district_id,
    MalariaData.year == 2024
).order_by(MalariaData.month)

# Uses index: idx_malaria_district_year_month
```

### 2. Get Latest Predictions for All Districts

```python
from sqlalchemy import select, func
from app.models import Prediction

# Get most recent prediction per district
subquery = select(
    Prediction.district_id,
    func.max(Prediction.created_at).label('max_date')
).group_by(Prediction.district_id).subquery()

query = select(Prediction).join(
    subquery,
    (Prediction.district_id == subquery.c.district_id) &
    (Prediction.created_at == subquery.c.max_date)
)

# Uses indexes: ix_predictions_district_id, ix_predictions_created_at
```

### 3. Get Active Alerts for Region

```python
from sqlalchemy import select
from app.models import Alert, District

query = select(Alert).join(District).where(
    District.region == 'Oromia',
    Alert.is_active == True
).order_by(Alert.created_at.desc())

# Uses indexes: idx_alert_district_active, ix_districts_region
```

### 4. Get Climate Data with Malaria Cases

```python
from sqlalchemy import select
from app.models import ClimateData, MalariaData, District

query = select(
    District.district_name,
    ClimateData.date,
    ClimateData.rainfall,
    ClimateData.temperature,
    MalariaData.cases
).join(
    ClimateData, District.id == ClimateData.district_id
).join(
    MalariaData,
    (District.id == MalariaData.district_id) &
    (func.extract('year', ClimateData.date) == MalariaData.year) &
    (func.extract('month', ClimateData.date) == MalariaData.month)
)

# Uses indexes: idx_climate_district_date, idx_malaria_district_year_month
```

## Model Methods

### District Model

```python
district = District(
    district_code="AA-001",
    district_name="Addis Ababa Bole",
    region="Addis Ababa"
)

# Convert to dictionary
district_dict = district.to_dict()
```

### MalariaData Model

```python
data = MalariaData(
    district_id=district_id,
    source_type="manual",
    month=1,
    year=2024,
    cases=150,
    deaths=5,
    uploaded_by=user_id
)

# Convert to dictionary
data_dict = data.to_dict()
```

## Migration Commands

### Create Migration

```bash
# After modifying models
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migration

```bash
# Apply all pending migrations
alembic upgrade head

# Apply specific migration
alembic upgrade <revision_id>
```

### Rollback Migration

```bash
# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade <revision_id>
```

### View Migration History

```bash
# Show all migrations
alembic history

# Show current revision
alembic current
```

## Database Initialization

### 1. Create Database

```bash
createdb malasafe_db
```

### 2. Run Migrations

```bash
cd backend
venv\Scripts\activate
alembic upgrade head
```

### 3. Verify Tables

```sql
-- Connect to database
psql -d malasafe_db

-- List all tables
\dt

-- Describe a table
\d users
\d districts
\d malaria_data
```

## Performance Considerations

### Indexes

All tables have appropriate indexes for:
- Primary key lookups
- Foreign key relationships
- Common filter columns
- Composite indexes for complex queries

### Constraints

- Check constraints validate data at database level
- Foreign keys maintain referential integrity
- Unique constraints prevent duplicates
- Cascade deletes maintain data consistency

### Relationships

- Lazy loading by default (use `joinedload` for eager loading)
- Cascade deletes configured appropriately
- Back-populates for bidirectional relationships

## Best Practices

### 1. Use Relationships

```python
# Good - uses relationship
district = await db.get(District, district_id)
malaria_data = district.malaria_data

# Avoid - manual joins when relationship exists
```

### 2. Use Indexes

```python
# Queries that use indexes are fast
query = select(MalariaData).where(
    MalariaData.district_id == district_id,  # indexed
    MalariaData.year == 2024,                # indexed
    MalariaData.month == 1                   # indexed
)
```

### 3. Use to_dict() Methods

```python
# Convert model to JSON-serializable dict
district_dict = district.to_dict()
return JSONResponse(content=district_dict)
```

### 4. Handle Cascades

```python
# Deleting a district cascades to related data
await db.delete(district)
await db.commit()
# All malaria_data, climate_data, etc. are also deleted
```

## Testing Models

```python
import pytest
from app.models import District, MalariaData

@pytest.mark.asyncio
async def test_create_district(db_session):
    district = District(
        district_code="TEST-001",
        district_name="Test District",
        region="Test Region"
    )
    db_session.add(district)
    await db_session.commit()
    
    assert district.id is not None
    assert district.district_code == "TEST-001"

@pytest.mark.asyncio
async def test_malaria_data_constraints(db_session):
    # Test that deaths cannot exceed cases
    with pytest.raises(IntegrityError):
        data = MalariaData(
            district_id=district_id,
            month=1,
            year=2024,
            cases=10,
            deaths=20  # Invalid: deaths > cases
        )
        db_session.add(data)
        await db_session.commit()
```

---

## Summary

✅ **8 Tables Created**
- Users (authentication)
- Districts (geography)
- MalariaData (case statistics)
- ClimateData (environmental factors)
- DistrictEnvironment (static characteristics)
- Predictions (ML predictions)
- Alerts (notifications)
- UploadedFiles (audit trail)

✅ **Features**
- UUID primary keys
- Proper relationships
- Comprehensive indexes
- Data validation constraints
- Cascade deletes
- Timestamp tracking
- to_dict() methods

✅ **Ready for Use**
- Run migrations
- Start building endpoints
- Query with confidence

**Next Steps:**
1. Run `alembic upgrade head`
2. Create Pydantic schemas for API
3. Build CRUD endpoints
4. Add business logic
