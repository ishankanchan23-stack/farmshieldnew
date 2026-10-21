from io import BytesIO

from PIL import Image
import pytest


def test_auth_validation_and_me(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.post("/api/v1/auth/register", json={
        "name": "A", "email": "not-an-email", "password": "short",
    }).status_code == 422
    response = client.post("/api/v1/auth/register", json={
        "name": "Farmer", "email": "user@example.com", "password": "secure-pass-123",
    })
    assert response.status_code == 201
    assert client.post("/api/v1/auth/register", json={
        "name": "Another Farmer", "email": "USER@example.com", "password": "secure-pass-123",
    }).status_code == 409
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {response.json()['access_token']}"}).json()["email"] == "user@example.com"
    assert client.post("/api/v1/auth/login", json={"email": "user@example.com", "password": "wrong-password"}).status_code == 401


def test_logout_invalidates_access_token(client, auth_headers):
    assert client.post("/api/v1/auth/logout", headers=auth_headers).status_code == 204
    assert client.get("/api/v1/auth/me", headers=auth_headers).status_code == 401


def test_farm_crud_and_user_isolation(client):
    headers = client.post("/api/v1/auth/register", json={"name": "One Farmer", "email": "one@example.com", "password": "secure-pass-123"}).json()
    other = client.post("/api/v1/auth/register", json={"name": "Other Farmer", "email": "two@example.com", "password": "secure-pass-123"}).json()
    first_headers = {"Authorization": f"Bearer {headers['access_token']}"}
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    assert client.post("/api/v1/farms", headers=first_headers, json={"name": "Invalid Latitude", "latitude": 90.1, "longitude": 0}).status_code == 422
    assert client.post("/api/v1/farms", headers=first_headers, json={"name": "Invalid Longitude", "latitude": 0, "longitude": 180.1}).status_code == 422
    farm = client.post("/api/v1/farms", headers=first_headers, json={"name": "North Field", "location": "Pune", "latitude": 18.52, "longitude": 73.85}).json()
    saved_farm = client.get(f"/api/v1/farms/{farm['id']}", headers=first_headers).json()
    assert saved_farm["latitude"] == 18.52
    assert saved_farm["longitude"] == 73.85
    assert client.get(f"/api/v1/farms/{farm['id']}", headers=other_headers).status_code == 404
    assert client.patch(f"/api/v1/farms/{farm['id']}", headers=first_headers, json={"name": "Updated Field"}).json()["name"] == "Updated Field"
    crop = client.post("/api/v1/crops", headers=first_headers, json={"farm_id": farm["id"], "name": "Tomato", "variety": "Local"} )
    assert crop.status_code == 201
    mango = client.post("/api/v1/crops", headers=first_headers, json={"farm_id": farm["id"], "name": "Mango"})
    chili = client.post("/api/v1/crops", headers=first_headers, json={"farm_id": farm["id"], "name": "Chili"})
    assert mango.status_code == 201 and chili.status_code == 201
    crop_records = client.get("/api/v1/crops", headers=first_headers).json()
    assert next(item for item in crop_records if item["name"] == "Tomato")["variety"] == "Local"
    assert {item["name"] for item in crop_records} >= {"Tomato", "Mango", "Chili"}
    assert client.post("/api/v1/crops", headers=other_headers, json={"farm_id": farm["id"], "name": "Tomato"}).status_code == 404
    assert client.delete(f"/api/v1/farms/{farm['id']}", headers=first_headers).status_code == 204


def test_scan_invalid_image_and_demo_mode(client, auth_headers, monkeypatch, tmp_path):
    from app.services import image_service
    from app.api import routes

    monkeypatch.setattr(image_service.settings, "upload_dir", tmp_path)
    rejected = client.post("/api/v1/scans/analyze", headers=auth_headers, files={"file": ("bad.jpg", b"not an image", "image/jpeg")})
    assert rejected.status_code == 422

    image = Image.new("RGB", (128, 128), "green")
    encoded = BytesIO()
    image.save(encoded, format="JPEG")
    response = client.post("/api/v1/scans/analyze", headers=auth_headers, files={"file": ("leaf.jpg", encoded.getvalue(), "image/jpeg")})
    assert response.status_code == 201
    result = response.json()
    assert result["status"] == "unavailable"
    assert result["predicted_class"] is None
    assert "demo mode is active" in result["warning"]
    assert client.get("/api/v1/scans", headers=auth_headers).json()["total"] == 1
    assert client.get(result["image_url"], headers=auth_headers).status_code == 200
    assert client.get("/api/v1/notifications", headers=auth_headers).json()[0]["title"] == "AI model unavailable"


@pytest.mark.parametrize("crop", ["Mango", "Chili"])
def test_non_tomato_scan_is_saved_without_a_false_prediction(client, auth_headers, monkeypatch, tmp_path, crop):
    from app.services import image_service
    monkeypatch.setattr(image_service.settings, "upload_dir", tmp_path)
    image_data = BytesIO()
    Image.new("RGB", (128, 128), "green").save(image_data, format="JPEG")

    response = client.post(
        f"/api/v1/scans/analyze?crop={crop}",
        headers=auth_headers,
        files={"file": ("leaf.jpg", image_data.getvalue(), "image/jpeg")},
    )

    assert response.status_code == 201
    result = response.json()
    assert result["crop"] == crop
    assert result["status"] == "unavailable"
    assert result["predicted_class"] is None
    assert f"No validated {crop} image-classification model" in result["warning"]


def test_disease_library_and_analytics(client, auth_headers):
    diseases = client.get("/api/v1/diseases?search=early").json()
    assert len(diseases) == 1 and diseases[0]["educational_only"] is True
    assert client.get("/api/v1/analytics/overview", headers=auth_headers).json()["total_scans"] == 0
    assert client.get("/api/v1/diseases/missing").status_code == 404
    mango_diseases = client.get("/api/v1/diseases?crop=Mango").json()
    assert {disease["crop"] for disease in mango_diseases} == {"Mango"}
    assert len(mango_diseases) == 2
    chili_diseases = client.get("/api/v1/diseases?crop=Chili").json()
    assert {disease["crop"] for disease in chili_diseases} == {"Chili"}
    assert len(chili_diseases) == 2


def test_csv_and_pdf_exports(client, auth_headers, monkeypatch, tmp_path):
    from app.services import image_service
    monkeypatch.setattr(image_service.settings, "upload_dir", tmp_path)
    stream = BytesIO()
    Image.new("RGB", (100, 100), "green").save(stream, format="JPEG")
    scan = client.post("/api/v1/scans/analyze", headers=auth_headers, files={"file": ("leaf.jpg", stream.getvalue(), "image/jpeg")}).json()
    pdf = client.get(f"/api/v1/reports/scans/{scan['id']}/pdf", headers=auth_headers)
    csv = client.get("/api/v1/reports/scans.csv", headers=auth_headers)
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    assert csv.status_code == 200 and b"scan_id" in csv.content
