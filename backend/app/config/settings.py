from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache


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
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
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
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
