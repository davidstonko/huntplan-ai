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
    anthropic_api_key: Optional[str] = None  # Legacy — kept for optional fallback
    gemini_api_key: Optional[str] = None
    llm_model: str = "gemini-2.0-flash"  # Free tier: 15 RPM, 1M tokens/day

    # Mapbox (for tile serving and geocoding)
    mapbox_access_token: Optional[str] = None

    # External APIs
    openweather_api_key: Optional[str] = None

    # Cloudflare R2 / S3 (photo storage)
    r2_account_id: Optional[str] = None
    r2_access_key_id: Optional[str] = None
    r2_secret_access_key: Optional[str] = None
    r2_bucket: str = "huntplan-photos"
    r2_public_url: Optional[str] = None  # Custom domain for public access

    # Push Notifications (APNS)
    apns_key_id: Optional[str] = None
    apns_team_id: Optional[str] = None
    apns_bundle_id: str = "com.davidstonko.huntmaryland"
    apns_key_path: Optional[str] = None  # Path to .p8 key file
    apns_private_key_base64: Optional[str] = None  # Base64-encoded .p8 key (alternative to apns_key_path)
    apns_use_sandbox: bool = True  # True for dev, False for production

    # Auth
    secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    access_token_expire_minutes: int = 60 * 24 * 30  # 30 days
    internal_api_key: Optional[str] = None  # Guard for admin endpoints like /push/send

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
        # Also build the sync URL, before the libpq-only query parameters are
        # stripped: psycopg understands sslmode, asyncpg does not.
        if "asyncpg" in self.database_url:
            self.database_url_sync = self.database_url.replace("+asyncpg", "")

        # Hosted Postgres providers hand out libpq connection strings. Neon's
        # looks like
        #   postgresql://u:p@ep-x.us-east-2.aws.neon.tech/db
        #       ?sslmode=require&channel_binding=require
        # and asyncpg raises
        #   TypeError: connect() got an unexpected keyword argument 'sslmode'
        # because those parameters belong to libpq, not to asyncpg. Translate
        # them instead of making whoever configures the service hand-edit the
        # URL: sslmode -> asyncpg's own `ssl`, and drop the rest.
        if "+asyncpg" in self.database_url and "?" in self.database_url:
            base, _, query = self.database_url.partition("?")
            keep: list[str] = []
            wants_tls = False
            for param in query.split("&"):
                if not param:
                    continue
                name, _, value = param.partition("=")
                name = name.lower()
                if name == "sslmode":
                    # disable/allow/prefer are the only values that do not
                    # require TLS; everything else does.
                    wants_tls = value.lower() not in ("disable", "allow", "prefer")
                elif name in ("channel_binding", "options", "application_name",
                              "connect_timeout", "target_session_attrs",
                              "gssencmode", "sslrootcert", "sslcert", "sslkey"):
                    # libpq-only, or asyncpg wants it as a connect_args kwarg.
                    continue
                else:
                    keep.append(param)
            if wants_tls:
                keep.append("ssl=require")
            self.database_url = base + ("?" + "&".join(keep) if keep else "")


settings = Settings()
