from sqlalchemy import select

from app.core.security import verify_password
from app.models import User
from conftest import TestSession


def test_registration_persists_hashed_password_and_login_succeeds(client):
    password = "secure-password-123"
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Farmer", "email": "persist@example.com", "password": password},
    )

    assert response.status_code == 201
    assert "password_hash" not in response.json()["user"]

    with TestSession() as db:
        user = db.scalar(select(User).where(User.email == "persist@example.com"))
        assert user is not None
        assert user.password_hash != password
        assert verify_password(password, user.password_hash)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "persist@example.com", "password": password},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["email"] == "persist@example.com"
