from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    secret_key: str = "development-only-change-me"
    database_url: str = Field(
        default="sqlite:///./farmshield.db",
        validation_alias=AliasChoices("DATABASE_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL"),
    )
    access_token_minutes: int = 60
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
    upload_dir: Path = Path("uploads")
    max_upload_mb: int = 8
    model_path: str = ""
    model_labels_path: Path = Path("app/data/tomato_classes.json")
    model_arch: str = "resnet18"
    model_version: str = "custom-plantvillage"
    confidence_threshold: float = 0.65
    risk_rules_path: Path = Path("app/data/weather_risk_rules.json")
    openweather_api_key: str = ""
    weather_cache_seconds: int = 600

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("confidence_threshold")
    @classmethod
    def validate_threshold(cls, value: float) -> float:
        if not 0 < value <= 1:
            raise ValueError("CONFIDENCE_THRESHOLD must be greater than 0 and at most 1")
        return value

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @model_validator(mode="after")
    def validate_production_secret(self) -> "Settings":
        if self.app_env.lower() == "production" and (
            self.secret_key == "development-only-change-me" or len(self.secret_key) < 32
        ):
            raise ValueError("Production requires a SECRET_KEY with at least 32 characters.")
        return self

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
