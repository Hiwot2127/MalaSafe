from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache
from pydantic import field_validator, ValidationError


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "MalaSafe API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Validators for critical settings
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Validate SECRET_KEY is secure and appropriate for environment."""
        if not v:
            raise ValueError('SECRET_KEY must be set')
        
        # Get environment from values dict
        environment = info.data.get('ENVIRONMENT', 'production')
        
        # In production, ensure it's not the default dev key
        if environment == 'production':
            if v == 'dev-secret-key-change-in-production':
                raise ValueError(
                    'SECRET_KEY must be changed from default value in production. '
                    'Generate a secure key with: python -c "import secrets; print(secrets.token_urlsafe(64))"'
                )
            if len(v) < 32:
                raise ValueError(
                    'SECRET_KEY must be at least 32 characters in production. '
                    'Current length: {}'.format(len(v))
                )
        
        return v
    
    @field_validator('DATABASE_URL', 'DATABASE_URL_SYNC')
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate DATABASE_URL is properly formatted."""
        if not v:
            raise ValueError('DATABASE_URL must be set')
        
        if not v.startswith(('postgresql://', 'postgresql+asyncpg://')):
            raise ValueError(
                'DATABASE_URL must start with postgresql:// or postgresql+asyncpg://. '
                'Got: {}'.format(v[:20] + '...')
            )
        
        return v
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB_CACHE: int = 2
    REDIS_DB_RATE_LIMIT: int = 0
    REDIS_DB_CELERY: int = 1
    
    # Sentry
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "production"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    
    # Celery
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    
    # Caching
    CACHE_ENABLED: bool = True
    CACHE_DEFAULT_TTL: int = 300
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    CORS_ALLOW_HEADERS: List[str] = ["Content-Type", "Authorization"]
    CORS_MAX_AGE: int = 600
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "./uploads"
    
    # AI Model
    MODEL_PATH: str = "./models"
    MODEL_VERSION: str = "1.0.0"

    # Monthly Close pipeline. ON by default. Orchestration runs in-process
    # via asyncio.create_task() from the upload service. Set to false to
    # skip dispatch entirely (closes will sit in `pending`).
    MONTHLY_CLOSE_ENABLED: bool = True
    # Distinct (year, month) tuples above this count switch the upload from
    # "close" mode (backtest + drift + re-predict) to "backfill" mode (skip
    # backtest/drift, dispatch retrain).
    MONTHLY_CLOSE_MAX_MONTHS: int = 2
    # Floor for treating an upload as an "official monthly close batch".
    # Below this many distinct districts the upload is assumed to be a
    # partial / template / ad-hoc ingest, and the close pipeline (which
    # re-predicts every district in the country, ~1,082 rows) is skipped.
    # The CSV rows still land in malaria_data — only the model refresh
    # is gated. Set to 0 to always dispatch (legacy behaviour).
    MONTHLY_CLOSE_MIN_DISTRICTS: int = 50

    # Phase 4 - climate fetch pipeline. Paths default to bundled assets; the
    # Copernicus CDS credentials are read from ~/.cdsapirc by the cdsapi
    # client, so URL/KEY env vars stay optional (only set them in deploys
    # where the rc file isn't present).
    SHAPEFILE_PATH: str = "./data/shapefiles/eth_woreda/eth_admbnda_adm3_csa_bofedb_2021.shp"
    RASTER_CACHE_DIR: str = "./data/cache/raw_rasters"
    CDSAPI_URL: Optional[str] = None
    CDSAPI_KEY: Optional[str] = None
    # CHIRPS publishes "preliminary" almost immediately; the "final" raster
    # lands ~90 days after the target month. Rows fetched within this window
    # are flagged is_provisional=true and will be upgraded on a later fetch.
    CHIRPS_PROVISIONAL_DAYS: int = 90
    
    # Email (optional)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/app.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance with validation."""
    try:
        return Settings()
    except ValidationError as e:
        # Print validation errors clearly for debugging
        print("\n" + "="*80)
        print("CONFIGURATION ERROR: Invalid environment variables detected")
        print("="*80)
        for error in e.errors():
            field = " -> ".join(str(loc) for loc in error['loc'])
            print(f"\n❌ {field}:")
            print(f"   {error['msg']}")
        print("\n" + "="*80)
        print("Please check your .env file and ensure all required variables are set correctly.")
        print("="*80 + "\n")
        raise


settings = get_settings()
