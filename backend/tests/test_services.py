import json
import asyncio
from contextlib import nullcontext
from types import SimpleNamespace
from io import BytesIO

import pytest
from PIL import Image

from app.services.ai_service import AIService, AIServiceError, _read_labels
from app.services.image_service import InvalidImageError, prepare_upload
from app.services.risk_engine import evaluate_weather_risks
from app.services.weather_service import WeatherUnavailable, current_weather


def test_image_rejects_invalid_and_small_content():
    with pytest.raises(InvalidImageError):
        prepare_upload(b"not an image")
    buffer = BytesIO()
    Image.new("RGB", (10, 10)).save(buffer, format="JPEG")
    with pytest.raises(InvalidImageError):
        prepare_upload(buffer.getvalue())


def test_missing_model_is_honestly_unavailable(monkeypatch):
    from app.services import ai_service
    monkeypatch.setattr(ai_service.settings, "model_path", "missing-weights.pt")
    service = AIService()
    result = service.analyze(Image.new("RGB", (224, 224)))
    assert result["status"] == "unavailable"
    assert result["predicted_class"] is None
    assert "weights were not found" in result["warning"]


def test_class_mapping_validation(tmp_path):
    labels = tmp_path / "labels.json"
    labels.write_text(json.dumps({"0": "a", "1": "b"}), encoding="utf-8")
    assert _read_labels(labels) == ["a", "b"]
    labels.write_text(json.dumps({"0": "a", "2": "b"}), encoding="utf-8")
    with pytest.raises(AIServiceError):
        _read_labels(labels)


def test_malformed_model_output_is_rejected():
    service = AIService()
    class Tensor:
        ndim = 1
        shape = (2,)

    service.model = lambda _tensor: Tensor()
    service.labels = ["Tomato___a", "Tomato___b"]
    service.status = "ready"
    service._torch = SimpleNamespace(Tensor=Tensor, inference_mode=nullcontext)
    service._transforms = SimpleNamespace(
        Compose=lambda _steps: lambda _image: SimpleNamespace(unsqueeze=lambda _axis: object()),
        Resize=lambda _size: object(), CenterCrop=lambda _size: object(), ToTensor=lambda: object(),
        Normalize=lambda **_kwargs: object(),
    )
    with pytest.raises(AIServiceError, match="Model output must"):
        service.analyze(Image.new("RGB", (224, 224)))


def test_valid_inference_returns_top_class_and_uncertainty_metadata():
    class Value:
        def __init__(self, value):
            self.value = value

        def item(self):
            return self.value

    class Logits:
        ndim = 2
        shape = (1, 2)

        def __getitem__(self, _key):
            return self

    torch_stub = SimpleNamespace(
        Tensor=Logits,
        inference_mode=nullcontext,
        softmax=lambda _logits, dim: ["probabilities"],
        max=lambda _probabilities, dim: (Value(0.82), Value(1)),
    )
    service = AIService()
    service.model = lambda _tensor: Logits()
    service.labels = ["Tomato___healthy", "Tomato___Early_blight"]
    service.status = "ready"
    service._torch = torch_stub
    service._transforms = SimpleNamespace(
        Compose=lambda _steps: lambda _image: SimpleNamespace(unsqueeze=lambda _axis: object()),
        Resize=lambda _size: object(), CenterCrop=lambda _size: object(), ToTensor=lambda: object(),
        Normalize=lambda **_kwargs: object(),
    )
    result = service.analyze(Image.new("RGB", (224, 224)))
    assert result["predicted_class"] == "Tomato___Early_blight"
    assert result["confidence"] == pytest.approx(0.82)
    assert result["status"] == "classified"


def test_classifier_uses_only_labels_for_the_selected_crop():
    class Logits:
        ndim = 2
        shape = (1, 3)

        def __getitem__(self, _key):
            return self

    class Probabilities:
        def __getitem__(self, _index):
            return self

    class Value:
        def __init__(self, value):
            self.value = value

        def item(self):
            return self.value

    service = AIService()
    service.model = lambda _tensor: Logits()
    service.labels = ["Tomato___Early_blight", "Mango___Anthracnose", "Mango___Powdery_mildew"]
    service.status = "ready"
    service._torch = SimpleNamespace(
        Tensor=Logits,
        inference_mode=nullcontext,
        softmax=lambda _logits, dim: [Probabilities()],
        max=lambda _probabilities, dim: (Value(0.91), Value(1)),
    )
    service._transforms = SimpleNamespace(
        Compose=lambda _steps: lambda _image: SimpleNamespace(unsqueeze=lambda _axis: object()),
        Resize=lambda _size: object(), CenterCrop=lambda _size: object(), ToTensor=lambda: object(),
        Normalize=lambda **_kwargs: object(),
    )

    result = service.analyze(Image.new("RGB", (224, 224)), "Mango")

    assert result["predicted_class"] == "Mango___Powdery_mildew"
    assert result["confidence"] == pytest.approx(0.91)


def test_classifier_reports_crop_without_configured_labels_as_unavailable():
    service = AIService()
    service.model = lambda _tensor: None
    service.labels = ["Tomato___healthy"]
    service.status = "ready"

    result = service.analyze(Image.new("RGB", (224, 224)), "Chili")

    assert result["status"] == "unavailable"
    assert result["predicted_class"] is None
    assert "No validated Chili image-classification model" in result["warning"]


def test_risk_engine_does_not_make_unsupported_claims():
    assert evaluate_weather_risks({"temperature_c": 30, "humidity_pct": 90}) == []


def test_risk_engine_explains_a_configured_sourced_rule(tmp_path, monkeypatch):
    from app.services import risk_engine
    rules_path = tmp_path / "rules.json"
    rules_path.write_text(json.dumps([{
        "crop": "Tomato",
        "title": "Potential advisory",
        "conditions": [["humidity_pct", ">=", 80]],
        "source": "Verified local extension bulletin",
    }]), encoding="utf-8")
    monkeypatch.setattr(risk_engine.settings, "risk_rules_path", rules_path)
    result = evaluate_weather_risks({"humidity_pct": 85})
    assert result[0]["source"] == "Verified local extension bulletin"
    assert "humidity_pct 85 >= 80" in result[0]["explanation"]
    assert "not a disease diagnosis" in result[0]["explanation"]


def test_weather_missing_key_is_explicit(monkeypatch):
    from app.services import weather_service
    monkeypatch.setattr(weather_service.settings, "openweather_api_key", "")
    with pytest.raises(WeatherUnavailable, match="not configured"):
        asyncio.run(current_weather(18.5, 73.8))
