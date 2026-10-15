from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from PIL import Image, ImageFilter, ImageOps, ImageStat, UnidentifiedImageError

from app.core.config import settings

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class InvalidImageError(ValueError):
    pass


@dataclass
class PreparedImage:
    image: Image.Image
    filename: str
    warning: str


def prepare_upload(data: bytes) -> PreparedImage:
    if not data:
        raise InvalidImageError("The uploaded file is empty.")
    try:
        with Image.open(BytesIO(data)) as source:
            if source.format not in ALLOWED_FORMATS:
                raise InvalidImageError("Upload a JPEG, PNG, or WEBP image.")
            if source.width < 32 or source.height < 32:
                raise InvalidImageError("Image dimensions are too small. Use an image at least 32 x 32 pixels.")
            if source.width * source.height > 25_000_000:
                raise InvalidImageError("Image dimensions are too large.")
            image = ImageOps.exif_transpose(source).convert("RGB")
            warning = _quality_warning(image)
            if min(image.size) < 160:
                warning = _join_warning(warning, "Image is small; capture a close, well-lit leaf photo for more reliable analysis.")
            path = settings.upload_dir
            path.mkdir(parents=True, exist_ok=True)
            filename = f"{uuid4().hex}.jpg"
            image.save(path / filename, format="JPEG", quality=90, optimize=True)
            return PreparedImage(image=image.copy(), filename=filename, warning=warning)
    except UnidentifiedImageError as exc:
        raise InvalidImageError("The file could not be read as a supported image.") from exc


def _quality_warning(image: Image.Image) -> str:
    brightness = ImageStat.Stat(image.convert("L")).mean[0]
    edges = image.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_variance = ImageStat.Stat(edges).var[0]
    if brightness < 35:
        return "Image appears very dark; use more even natural light."
    if brightness > 230:
        return "Image appears overexposed; avoid direct glare and bright reflections."
    if edge_variance < 18:
        return "Image may be out of focus or low contrast; retake with the leaf in sharp focus."
    return ""


def _join_warning(first: str, second: str) -> str:
    return "; ".join(part for part in (first, second) if part)


def resolve_image_path(filename: str) -> Path:
    safe_name = Path(filename).name
    if safe_name != filename:
        raise ValueError("Invalid image reference")
    return settings.upload_dir / safe_name
