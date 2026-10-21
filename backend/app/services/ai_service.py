import json
from pathlib import Path
from typing import Any

from PIL import Image

from app.core.config import settings


class AIServiceError(RuntimeError):
    pass


class AIService:
    """Loads a configured torchvision classifier once; missing weights stay explicitly unavailable."""

    def __init__(self) -> None:
        self.model: Any = None
        self.labels: list[str] = []
        self.status = "unavailable"
        self.detail = "AI model unavailable — demo mode is active."
        self._torch: Any = None
        self._transforms: Any = None
        self._load()

    def _load(self) -> None:
        if not settings.model_path:
            return
        weights = Path(settings.model_path)
        if not weights.is_file():
            self.detail = "AI model unavailable — demo mode is active. Configured model weights were not found."
            return
        labels_path = settings.model_labels_path
        try:
            self.labels = _read_labels(labels_path)
            import torch
            from torchvision import models, transforms

            architectures = {
                "resnet18": models.resnet18,
                "mobilenet_v3_small": models.mobilenet_v3_small,
            }
            if settings.model_arch not in architectures:
                raise AIServiceError(f"Unsupported model architecture: {settings.model_arch}")
            self._torch = torch
            self._transforms = transforms
            if settings.model_arch == "resnet18":
                model = models.resnet18(weights=None)
                model.fc = torch.nn.Linear(model.fc.in_features, len(self.labels))
            else:
                model = models.mobilenet_v3_small(weights=None)
                model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, len(self.labels))
            checkpoint = torch.load(weights, map_location="cpu", weights_only=True)
            state = checkpoint.get("state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
            if not isinstance(state, dict):
                raise AIServiceError("Model checkpoint must contain a state dictionary.")
            model.load_state_dict(state, strict=True)
            model.eval()
            self.model = model
            self.status = "ready"
            self.detail = ""
        except (ImportError, OSError, RuntimeError, ValueError, KeyError, TypeError, AIServiceError) as exc:
            self.model = None
            self.status = "error"
            self.detail = f"Configured model could not be loaded: {exc}"

    def analyze(self, image: Image.Image, crop: str = "Tomato") -> dict[str, Any]:
        if self.model is None:
            return {
                "status": "unavailable" if self.status == "unavailable" else "error",
                "predicted_class": None,
                "confidence": None,
                "model_name": "unavailable",
                "warning": self.detail if crop == "Tomato" else f"No validated {crop} image-classification model is configured. {self.detail}",
            }
        class_indices = [index for index, label in enumerate(self.labels) if label.startswith(f"{crop}___")]
        if not class_indices:
            return {
                "status": "unavailable",
                "predicted_class": None,
                "confidence": None,
                "model_name": "unavailable",
                "warning": f"No validated {crop} image-classification model is configured.",
            }
        try:
            transform = self._transforms.Compose(
                [
                    self._transforms.Resize(256),
                    self._transforms.CenterCrop(224),
                    self._transforms.ToTensor(),
                    self._transforms.Normalize(
                        mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225],
                    ),
                ]
            )
            with self._torch.inference_mode():
                logits = self.model(transform(image).unsqueeze(0))
                if not isinstance(logits, self._torch.Tensor) or logits.ndim != 2 or logits.shape[0] != 1:
                    raise AIServiceError("Model output must be a [1, class_count] tensor.")
                if logits.shape[1] != len(self.labels):
                    raise AIServiceError("Model output count does not match the configured class labels.")
                crop_logits = logits[:, class_indices]
                probabilities = self._torch.softmax(crop_logits, dim=1)[0]
                confidence, index = self._torch.max(probabilities, dim=0)
                score = float(confidence.item())
                label = self.labels[class_indices[int(index.item())]]
            uncertain = score < settings.confidence_threshold
            return {
                "status": "uncertain" if uncertain else "classified",
                "predicted_class": label,
                "confidence": score,
                "model_name": f"{settings.model_arch}:{settings.model_version}",
                "warning": "Uncertain — expert verification recommended." if uncertain else "",
            }
        except AIServiceError:
            raise
        except (RuntimeError, ValueError, TypeError, IndexError, AttributeError) as exc:
            raise AIServiceError(f"Inference failed: {exc}") from exc


def _read_labels(path: Path) -> list[str]:
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
    if isinstance(data, list) and all(isinstance(label, str) for label in data):
        labels = data
    elif isinstance(data, dict):
        try:
            labels = [data[str(index)] for index in range(len(data))]
        except (KeyError, TypeError) as exc:
            raise AIServiceError("Class mapping must use continuous zero-based index keys.") from exc
        if not all(isinstance(label, str) for label in labels):
            raise AIServiceError("Class labels must be strings.")
    else:
        raise AIServiceError("Class mapping must be a JSON list or index-to-label object.")
    if not labels or len(set(labels)) != len(labels):
        raise AIServiceError("Class mapping must contain unique, non-empty labels.")
    return labels
