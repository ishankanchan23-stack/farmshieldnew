import pytest

from app.core.config import Settings


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
    monkeypatch.setenv(environment_name, database_url)

    settings = Settings(_env_file=None)

    assert settings.database_url == expected_url
