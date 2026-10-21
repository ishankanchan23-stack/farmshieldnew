import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./farmshield-test-bootstrap.db")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Disease
from app.api.routes import EDUCATIONAL_DISEASES

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def client():
    from app.core import rate_limit
    rate_limit._attempts.clear()
    Base.metadata.create_all(test_engine)
    with TestSession() as db:
        for record in EDUCATIONAL_DISEASES:
            crop, class_id, name, scientific, symptoms, conditions, prevention, next_steps, *source_info = record
            source = source_info[0] if source_info else "University of California Statewide IPM Program; educational summary"
            db.add(Disease(id=class_id, crop=crop, name=name, scientific_name=scientific, symptoms=symptoms,
                           associated_conditions=conditions, prevention=prevention, next_steps=next_steps, source=source))
        db.commit()

    def override_db():
        with TestSession() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(test_engine)


@pytest.fixture
def auth_headers(client):
    response = client.post("/api/v1/auth/register", json={
        "name": "Test Farmer", "email": "farmer@example.com", "password": "safe-password-123",
    })
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
