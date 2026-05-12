# ✅ MalaSafe Database Models - Complete

## 🎉 What Was Built

Complete SQLAlchemy models and Alembic migrations for the malaria surveillance system with proper relationships, constraints, and indexes.

## 📊 Database Schema

### Tables Created (8 Total)

1. **users** - User authentication and authorization
2. **districts** - Geographical district information
3. **malaria_data** - Malaria case and death statistics
4. **climate_data** - Environmental climate data
5. **district_environment** - Static environmental characteristics
6. **predictions** - ML model predictions
7. **alerts** - Active malaria risk alerts
8. **uploaded_files** - File upload audit trail

## 📁 Files Created

### Models
- ✅ `app/models/user.py` - User model (already existed, updated)
- ✅ `app/models/district.py` - District model
- ✅ `app/models/malaria_data.py` - Malaria data model
- ✅ `app/models/climate_data.py` - Climate data model
- ✅ `app/models/district_environment.py` - Environment model
- ✅ `app/models/prediction.py` - Prediction model
- ✅ `app/models/alert.py` - Alert model
- ✅ `app/models/uploaded_file.py` - File tracking model
- ✅ `app/models/__init__.py` - Updated exports

### Migrations
- ✅ `alembic/versions/001_add_malaria_surveillance_models.py` - Complete migration

### Scripts
- ✅ `setup_database.py` - Database initialization script

### Documentation
- ✅ `DATABASE_MODELS.md` - Complete model documentation

## 🎯 Features Implemented

### ✅ Proper Relationships
- One-to-many: District → MalariaData, ClimateData, Predictions, Alerts
- One-to-one: District → DistrictEnvironment
- Many-to-one: MalariaData → User (uploader)
- Foreign keys with CASCADE and SET NULL

### ✅ Comprehensive Indexes
- Primary key indexes on all tables
- Foreign key indexes for joins
- Composite indexes for common queries
- Date/time indexes for time-series queries

### ✅ Data Validation Constraints
- Check constraints for valid ranges
- Unique constraints for codes/emails
- Non-negative values for counts
- Valid date ranges
- Risk level enumerations

### ✅ UUID Primary Keys
- All tables use UUID for primary keys
- Better for distributed systems
- No sequential ID leakage

### ✅ Timestamps
- `created_at` on all tables
- `updated_at` on users table
- Automatic timestamp generation

### ✅ Helper Methods
- `to_dict()` methods for JSON serialization
- `__repr__()` for debugging
- Relationship helpers

## 📋 Table Details

### 1. Districts
```sql
CREATE TABLE districts (
    id UUID PRIMARY KEY,
    district_code VARCHAR(50) UNIQUE NOT NULL,
    district_name VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    zone VARCHAR(100),
    geojson_key VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes:** id, district_code, district_name, region

### 2. Malaria Data
```sql
CREATE TABLE malaria_data (
    id UUID PRIMARY KEY,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    week INTEGER,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    cases INTEGER NOT NULL DEFAULT 0,
    deaths INTEGER NOT NULL DEFAULT 0,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    
    CHECK (cases >= 0),
    CHECK (deaths >= 0),
    CHECK (deaths <= cases),
    CHECK (week >= 1 AND week <= 53),
    CHECK (month >= 1 AND month <= 12),
    CHECK (year >= 2000 AND year <= 2100)
);
```

**Indexes:** id, district_id, source_type, month, year, uploaded_by, created_at, (district_id, year, month), (year, month)

### 3. Climate Data
```sql
CREATE TABLE climate_data (
    id UUID PRIMARY KEY,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    rainfall FLOAT,
    temperature FLOAT,
    season VARCHAR(50),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    
    CHECK (rainfall >= 0),
    CHECK (temperature >= -50 AND temperature <= 60)
);
```

**Indexes:** id, district_id, season, date, (district_id, date)

### 4. District Environment
```sql
CREATE TABLE district_environment (
    id UUID PRIMARY KEY,
    district_id UUID UNIQUE REFERENCES districts(id) ON DELETE CASCADE,
    altitude FLOAT,
    created_at TIMESTAMP WITH TIME ZONE,
    
    CHECK (altitude >= -500 AND altitude <= 9000)
);
```

**Indexes:** id, district_id

### 5. Predictions
```sql
CREATE TABLE predictions (
    id UUID PRIMARY KEY,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    risk_level VARCHAR(20) NOT NULL,
    confidence_score FLOAT NOT NULL,
    prediction_score FLOAT NOT NULL,
    prediction_reason TEXT,
    prediction_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
    CHECK (risk_level IN ('low', 'moderate', 'high', 'very_high'))
);
```

**Indexes:** id, district_id, risk_level, prediction_date, created_at, (district_id, prediction_date), (prediction_date, risk_level)

### 6. Alerts
```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    risk_level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE,
    
    CHECK (risk_level IN ('low', 'moderate', 'high', 'very_high'))
);
```

**Indexes:** id, district_id, risk_level, is_active, created_at, (district_id, is_active), (is_active, created_at)

### 7. Uploaded Files
```sql
CREATE TABLE uploaded_files (
    id UUID PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    upload_type VARCHAR(50) NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes:** id, upload_type, uploaded_by, created_at, (upload_type, created_at), (uploaded_by, created_at)

## 🚀 Quick Start

### Step 1: Setup Database

```bash
# Create PostgreSQL database
createdb malasafe_db

# Or using psql
psql -U postgres
CREATE DATABASE malasafe_db;
\q
```

### Step 2: Run Setup Script

```bash
cd backend
venv\Scripts\activate
python setup_database.py
```

This will:
- Create all tables
- Create admin user
- Optionally load sample districts

### Step 3: Verify Tables

```bash
# Connect to database
psql -d malasafe_db

# List all tables
\dt

# Describe a table
\d districts
\d malaria_data
```

### Step 4: Start Building

```python
from app.models import District, MalariaData
from app.database import get_db

# Create a district
district = District(
    district_code="AA-001",
    district_name="Addis Ababa Bole",
    region="Addis Ababa"
)
db.add(district)
await db.commit()

# Add malaria data
data = MalariaData(
    district_id=district.id,
    source_type="manual",
    month=1,
    year=2024,
    cases=150,
    deaths=5
)
db.add(data)
await db.commit()
```

## 💻 Usage Examples

### Query with Relationships

```python
from sqlalchemy import select
from app.models import District

# Get district with all related data
result = await db.execute(
    select(District)
    .options(
        joinedload(District.malaria_data),
        joinedload(District.climate_data),
        joinedload(District.environment)
    )
    .where(District.district_code == "AA-001")
)
district = result.scalar_one_or_none()

# Access related data
for data in district.malaria_data:
    print(f"Cases: {data.cases}, Deaths: {data.deaths}")
```

### Time-Series Query

```python
from sqlalchemy import select, func
from app.models import MalariaData

# Get monthly cases for 2024
query = select(
    MalariaData.month,
    func.sum(MalariaData.cases).label('total_cases'),
    func.sum(MalariaData.deaths).label('total_deaths')
).where(
    MalariaData.year == 2024
).group_by(
    MalariaData.month
).order_by(
    MalariaData.month
)

result = await db.execute(query)
monthly_data = result.all()
```

### Get Latest Predictions

```python
from sqlalchemy import select
from app.models import Prediction, District

# Get latest prediction per district
query = select(Prediction).join(District).where(
    Prediction.prediction_date == func.current_date()
).order_by(
    District.region,
    District.district_name
)

predictions = await db.execute(query)
```

### Active Alerts

```python
from sqlalchemy import select
from app.models import Alert, District

# Get all active high-risk alerts
query = select(Alert, District).join(District).where(
    Alert.is_active == True,
    Alert.risk_level.in_(['high', 'very_high'])
).order_by(
    Alert.created_at.desc()
)

alerts = await db.execute(query)
```

## 🔧 Migration Commands

### Apply Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Apply specific migration
alembic upgrade 001_malaria_models
```

### Rollback Migrations

```bash
# Rollback one migration
alembic downgrade -1

# Rollback all
alembic downgrade base
```

### View Migration Status

```bash
# Show current revision
alembic current

# Show migration history
alembic history

# Show pending migrations
alembic history --verbose
```

## 📊 Entity Relationships

```
Users ──┬─── uploaded_by ──→ MalariaData
        └─── uploaded_by ──→ UploadedFiles

Districts ──┬─── district_id ──→ MalariaData
            ├─── district_id ──→ ClimateData
            ├─── district_id ──→ DistrictEnvironment (1:1)
            ├─── district_id ──→ Predictions
            └─── district_id ──→ Alerts
```

## ✅ What's Working

- ✅ All 8 tables defined with SQLAlchemy
- ✅ Complete Alembic migration ready
- ✅ Proper relationships configured
- ✅ Comprehensive indexes for performance
- ✅ Data validation constraints
- ✅ UUID primary keys
- ✅ Timestamp tracking
- ✅ Helper methods (to_dict, __repr__)
- ✅ Cascade deletes configured
- ✅ Foreign key constraints
- ✅ Setup script included
- ✅ Complete documentation

## 🎯 Next Steps

### Immediate
1. ✅ Run `python setup_database.py`
2. ✅ Verify tables created
3. ✅ Create admin user
4. ✅ Load sample districts

### Development
1. **Create Pydantic Schemas** - For API validation
2. **Build CRUD Endpoints** - For each model
3. **Add Business Logic** - In services layer
4. **Implement ML Models** - For predictions
5. **Add Data Import** - CSV/Excel upload

### Production
1. **Add Indexes** - Based on query patterns
2. **Optimize Queries** - Use EXPLAIN ANALYZE
3. **Add Caching** - Redis for frequent queries
4. **Setup Backups** - Regular database backups
5. **Monitor Performance** - Query performance tracking

## 📚 Documentation

- **DATABASE_MODELS.md** - Complete model reference
- **Inline Comments** - In model files
- **Migration File** - Documented SQL
- **This File** - Setup guide

## 🐛 Troubleshooting

### "Table already exists"
```bash
# Drop all tables and recreate
psql -d malasafe_db
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q

# Run setup again
python setup_database.py
```

### "Foreign key constraint violation"
- Ensure parent records exist before creating child records
- Check cascade delete configuration

### "Check constraint violation"
- Verify data meets constraint requirements
- Check model constraints in code

## 🎉 Success!

Your database models are **production-ready** with:

- ✅ Normalized schema design
- ✅ Proper relationships
- ✅ Performance indexes
- ✅ Data validation
- ✅ Complete documentation
- ✅ Easy setup process

**You can now build your API endpoints with confidence!** 🚀

---

**Need Help?**
- Check `DATABASE_MODELS.md` for detailed documentation
- Review model files for examples
- Test queries in `psql` console
