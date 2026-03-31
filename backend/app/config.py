"""
HuntPlan AI — Application Configuration

Loads settings from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # App
    app_name: str = "MDHuntFishOutdoors API"
    app_version: str = "3.0.0"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://huntplan:huntplan@localhost:5432/huntplan"
    database_url_sync: str = "postgresql://huntplan:huntplan@localhost:5432/huntplan"

    # Redis (for Celery background tasks)
    redis_url: str = "redis://localhost:6379/0"

    # AI / LLM
    anthropic_api_key: Optional[str] = None
    llm_model: str = "claude-sonnet-4-20250514"

    # Mapbox (for tile serving and geocoding)
    mapbox_access_token: Optional[str] = None

    # External APIs
    openweather_api_key: Optional[str] = None

    # Auth
    secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    access_token_expire_minutes: int = 60 * 24 * 30  # 30 days

    # Data paths
    data_dir: str = "./data"
    state_packs_dir: str = "./data/packs"
    raw_data_dir: str = "./data/raw"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Render/Railway provide postgres:// URLs — SQLAlchemy needs postgresql+asyncpg://
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace(
                "postgres://", "postgresql+asyncpg://", 1
            )
        elif self.database_url.startswith("postgresql://") and "+asyncpg" not in self.database_url:
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )
        # Also build the sync URL
        if "asyncpg" in self.database_url:
            self.database_url_sync = self.database_url.replace("+asyncpg", "")


settings = Settings()
