import pytest

from app import main
from app.core.config import Settings, settings as app_settings, validate_deployment_settings


@pytest.mark.parametrize(
    ("environment_name", "database_url", "expected_url"),
    [
        ("DATABASE_URL", "postgres://db.example/farmshield", "postgresql+psycopg://db.example/farmshield"),
        ("POSTGRES_URL_NON_POOLING", "postgresql://db.example/farmshield", "postgresql+psycopg://db.example/farmshield"),
        ("POSTGRES_URL", "postgresql+psycopg://db.example/farmshield", "postgresql+psycopg://db.example/farmshield"),
    ],
)
def test_settings_accept_postgres_environment_urls(
    monkeypatch: pytest.MonkeyPatch,
    environment_name: str,
    database_url: str,
    expected_url: str,
) -> None:
    for name in ("DATABASE_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.setenv(environment_name, database_url)

    settings = Settings(_env_file=None)

    assert settings.database_url == expected_url


def test_vercel_rejects_local_sqlite_database(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("POSTGRES_URL_NON_POOLING", raising=False)
    monkeypatch.delenv("POSTGRES_URL", raising=False)
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("SECRET_KEY", "a-production-secret-key-long-enough")

    settings = Settings(_env_file=None)

    with pytest.raises(RuntimeError, match="persistent PostgreSQL"):
        validate_deployment_settings(settings)


def test_vercel_requires_non_default_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("POSTGRES_URL_NON_POOLING", raising=False)
    monkeypatch.delenv("POSTGRES_URL", raising=False)
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("POSTGRES_URL", "postgres://db.example/farmshield")
    monkeypatch.delenv("SECRET_KEY", raising=False)

    settings = Settings(_env_file=None)

    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        validate_deployment_settings(settings)


def test_error_logging_redacts_database_and_signing_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = "postgresql+psycopg://farmer:database-secret@db.example/farmshield"
    signing_secret = "jwt-signing-secret"
    monkeypatch.setattr(app_settings, "database_url", database_url)
    monkeypatch.setattr(app_settings, "secret_key", signing_secret)

    safe_message = main._safe_error_message(
        RuntimeError(f"Connection failed for {database_url}; secret={signing_secret}")
    )

    assert "database-secret" not in safe_message
    assert "jwt-signing-secret" not in safe_message
    assert "farmer:***@db.example" in safe_message
