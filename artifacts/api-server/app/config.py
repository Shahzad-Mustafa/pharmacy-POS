import os
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "RxPOS"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
    ASYNC_DATABASE_URL: str = ""

    SECRET_KEY: str = os.environ.get("SESSION_SECRET", "changeme-replace-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    SENDGRID_API_KEY: str = os.environ.get("SENDGRID_API_KEY", "")
    TWILIO_ACCOUNT_SID: str = os.environ.get("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.environ.get("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_NUMBER: str = os.environ.get("TWILIO_WHATSAPP_NUMBER", "")

    OPENFDA_API_KEY: str = os.environ.get("OPENFDA_API_KEY", "")
    DRUGBANK_API_KEY: str = os.environ.get("DRUGBANK_API_KEY", "")

    AWS_ACCESS_KEY_ID: str = os.environ.get("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.environ.get("AWS_REGION", "us-east-1")

    GOOGLE_VISION_CREDENTIALS_JSON: str = os.environ.get("GOOGLE_VISION_CREDENTIALS_JSON", "")

    CELERY_BROKER_URL: str = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    @field_validator("ASYNC_DATABASE_URL", mode="before")
    @classmethod
    def build_async_url(cls, v: str, info) -> str:
        if v:
            return v
        db_url = info.data.get("DATABASE_URL", "")
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
        from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
        parsed = urlparse(db_url)
        params = parse_qs(parsed.query, keep_blank_values=True)
        params.pop("sslmode", None)
        new_query = urlencode({k: v[0] for k, v in params.items()})
        new_url = urlunparse(parsed._replace(query=new_query))
        return new_url

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
