# MalaSafe Backend API

Production-ready FastAPI backend for malaria surveillance and prediction system.

## Tech Stack

- **FastAPI** - Modern, fast web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM with async support
- **Alembic** - Database migrations
- **Pydantic** - Data validation
- **JWT** - Authentication
- **Celery** - Background tasks
- **Pandas & Scikit-learn** - AI/ML capabilities

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config/              # Configuration and settings
│   ├── database/            # Database connection and session
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic
│   ├── ai/                  # ML models and predictions
│   ├── middleware/          # Custom middleware
│   └── utils/               # Utility functions
├── alembic/                 # Database migrations
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Setup Instructions

### 1. Prerequisites

- Python 3.10 or higher
- PostgreSQL 14 or higher
- Redis (for background tasks)

### 2. Clone and Navigate

```bash
cd backend
```

### 3. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment

```bash
# Copy the example environment file
copy .env.example .env

# Edit .env with your configuration
# Update DATABASE_URL, SECRET_KEY, etc.
```

### 6. Setup Database

```bash
# Create PostgreSQL database
createdb malasafe_db

# Or using psql
psql -U postgres
CREATE DATABASE malasafe_db;
\q
```

### 7. Run Migrations

```bash
# Initialize Alembic (already done)
# alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### 8. Create Required Directories

```bash
mkdir logs
mkdir uploads
mkdir models
```

## Running the Application

### Development Mode

```bash
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the main.py script
python app/main.py
```

### Production Mode

```bash
# Using uvicorn with workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Or using gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## API Documentation

Once the server is running, access:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

## Available Endpoints

### Health Check
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/db` - Health check with database connectivity

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user info (requires authentication)

## Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# View current revision
alembic current
```

## Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Run with coverage
pytest --cov=app tests/
```

## Environment Variables

Key environment variables (see `.env.example` for full list):

- `DATABASE_URL` - PostgreSQL connection string (async)
- `DATABASE_URL_SYNC` - PostgreSQL connection string (sync, for migrations)
- `SECRET_KEY` - JWT secret key (generate with `openssl rand -hex 32`)
- `DEBUG` - Enable debug mode (True/False)
- `CORS_ORIGINS` - Allowed CORS origins

## Security Notes

1. **Change SECRET_KEY** in production (generate with `openssl rand -hex 32`)
2. **Use strong passwords** for database and admin accounts
3. **Enable HTTPS** in production
4. **Configure CORS** properly for your frontend domain
5. **Keep dependencies updated** regularly

## Background Tasks

To run Celery workers for background tasks:

```bash
# Start Celery worker
celery -A app.tasks worker --loglevel=info

# Start Celery beat (for scheduled tasks)
celery -A app.tasks beat --loglevel=info
```

## Monitoring

- Logs are stored in `logs/app.log`
- Configure log rotation in `app/main.py`
- Use tools like Sentry for error tracking in production

## Development Tips

1. Use `--reload` flag during development for auto-reload
2. Check API docs at `/api/docs` for interactive testing
3. Use Alembic for all database schema changes
4. Follow the clean architecture pattern
5. Write tests for new features

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### Migration Issues
- Check alembic/env.py imports all models
- Verify DATABASE_URL_SYNC is correct
- Try `alembic downgrade -1` then `alembic upgrade head`

### Import Errors
- Ensure virtual environment is activated
- Verify all dependencies are installed
- Check Python path configuration

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Update documentation
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please contact [your-email@example.com]
