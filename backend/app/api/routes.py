import csv
from datetime import date, datetime, time, timedelta, timezone
from io import StringIO
from pathlib import Path

import jwt
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import enforce_auth_rate_limit
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Crop, Disease, Farm, Notification, RiskAlert, Scan, User, UserPreference, WeatherRecord
from app.schemas import CropIn, FarmIn, FarmPatch, LoginIn, PreferencePatch, RegisterIn
from app.services.ai_service import AIService, AIServiceError
from app.services.image_service import InvalidImageError, prepare_upload, resolve_image_path
from app.services.report_service import create_scan_pdf
from app.services.risk_engine import evaluate_weather_risks
from app.services.weather_service import WeatherUnavailable, current_weather, forecast

router = APIRouter(prefix="/api/v1")
oauth_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
ai_service: AIService | None = None

EDUCATIONAL_DISEASES = [
    ("Tomato___Bacterial_spot", "Bacterial spot", "Xanthomonas spp.",
     "Small, dark, water-soaked spots on leaves and fruit; lesions may develop yellow halos.",
     "Warm, wet weather and splashing water can favor spread; these signs can resemble other problems.",
     "Use clean seed and transplants, avoid working among wet plants, and rotate away from tomato where practical.",
     "Remove badly affected plant debris, reduce leaf wetness, and consult a local extension specialist for confirmation."),
    ("Tomato___Early_blight", "Early blight", "Alternaria solani",
     "Dark leaf lesions may show concentric rings and yellowing around older leaves.",
     "Prolonged leaf wetness and stressed plants can be associated with disease development.",
     "Use crop rotation, maintain airflow, and avoid overhead irrigation when feasible.",
     "Check several leaves and consult an agricultural expert; symptoms alone do not confirm the cause."),
    ("Tomato___Late_blight", "Late blight", "Phytophthora infestans",
     "Irregular water-soaked lesions can enlarge quickly; white growth may occur in humid conditions.",
     "Cool, humid weather is associated with outbreaks, but weather alone is not diagnostic.",
     "Use healthy planting material, monitor local advisories, and avoid prolonged leaf wetness.",
     "Seek prompt local expert advice if suspected, as this can spread rapidly."),
    ("Tomato___Leaf_Mold", "Leaf mold", "Passalora fulva",
     "Pale green or yellow patches may appear on upper leaf surfaces with olive growth underneath.",
     "High humidity and limited airflow are commonly associated with leaf mold.",
     "Improve ventilation and avoid excess leaf wetness.",
     "Inspect leaf undersides and seek expert confirmation before treatment."),
    ("Tomato___Septoria_leaf_spot", "Septoria leaf spot", "Septoria lycopersici",
     "Numerous small circular spots may have pale centers and dark margins, often on lower leaves.",
     "Wet foliage and plant debris can contribute to spread.",
     "Rotate crops, remove infected debris, and water at soil level where practical.",
     "Document symptoms and consult a local extension service for confirmation."),
    ("Tomato___Spider_mites Two-spotted_spider_mite", "Two-spotted spider mite damage", "Tetranychus urticae",
     "Fine stippling, bronzing, and delicate webbing may occur on leaves.",
     "Hot, dry conditions can favor mite populations; look for mites under leaves.",
     "Encourage beneficial insects and avoid unnecessary broad-spectrum pesticide use.",
     "Confirm mites with a close inspection and ask a qualified adviser about locally appropriate controls."),
    ("Tomato___Target_Spot", "Target spot", "Corynespora cassiicola",
     "Brown lesions can develop concentric patterns on leaves and fruit.",
     "Warm, humid conditions and leaf wetness can be associated with disease development.",
     "Improve airflow and reduce leaf wetness; remove crop debris.",
     "Have uncertain symptoms assessed by an agricultural expert."),
    ("Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato yellow leaf curl virus", "",
     "Leaves may curl upward, yellow, and become smaller; plants may be stunted.",
     "Whitefly vectors spread the virus; similar symptoms can have other causes.",
     "Use healthy transplants and monitor whiteflies using locally recommended integrated pest management.",
     "Consult an expert for diagnosis and vector management; do not rely on this image result alone."),
    ("Tomato___Tomato_mosaic_virus", "Tomato mosaic virus", "",
     "Mottled light and dark green leaf patterns and distorted growth may appear.",
     "The virus can spread through contaminated hands, tools, and plant material.",
     "Use clean seed, sanitize tools, and remove infected plants according to local guidance.",
     "Seek expert confirmation and follow local disposal advice."),
    ("Tomato___healthy", "Healthy tomato leaf", "",
     "No disease-associated pattern was identified by the configured classifier.",
     "An image classifier can miss disease and cannot assess the whole plant.",
     "Continue regular scouting and good crop hygiene.",
     "A healthy classification is not a guarantee; check the whole plant and consult an expert if symptoms persist."),
]


def get_ai_service() -> AIService:
    if ai_service is None:
        raise HTTPException(status_code=503, detail="AI service is initializing.")
    return ai_service


def current_user(token: str = Depends(oauth_scheme), db: Session = Depends(get_db)) -> User:
    try:
        user_id, token_version = decode_access_token(token)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token.", headers={"WWW-Authenticate": "Bearer"}) from exc
    user = db.get(User, user_id)
    if user is None or user.token_version != token_version:
        raise HTTPException(status_code=401, detail="Invalid or expired access token.", headers={"WWW-Authenticate": "Bearer"})
    return user


def _farm_or_404(db: Session, user: User, farm_id: str) -> Farm:
    farm = db.scalar(select(Farm).where(Farm.id == farm_id, Farm.owner_id == user.id))
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found.")
    return farm


def _scan_or_404(db: Session, user: User, scan_id: str) -> Scan:
    scan = db.scalar(select(Scan).where(Scan.id == scan_id, Scan.user_id == user.id))
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return scan


def _disease_for_scan(db: Session, scan: Scan) -> Disease | None:
    return db.get(Disease, scan.predicted_class) if scan.predicted_class else None


def _disease_payload(disease: Disease | None) -> dict | None:
    if disease is None:
        return None
    return {
        "id": disease.id, "crop": disease.crop, "name": disease.name,
        "scientific_name": disease.scientific_name, "symptoms": disease.symptoms,
        "associated_conditions": disease.associated_conditions, "prevention": disease.prevention,
        "next_steps": disease.next_steps, "source": disease.source,
        "educational_only": True,
    }


def _scan_payload(db: Session, scan: Scan) -> dict:
    created_at = scan.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return {
        "id": scan.id, "farm_id": scan.farm_id, "crop": scan.crop,
        "predicted_class": scan.predicted_class, "confidence": scan.confidence,
        "status": scan.status, "model_name": scan.model_name,
        "warning": scan.warning, "image_url": f"/api/v1/scans/{scan.id}/image",
        "created_at": created_at, "disease": _disease_payload(_disease_for_scan(db, scan)),
    }


@router.post("/auth/register", status_code=201, dependencies=[Depends(enforce_auth_rate_limit)])
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    db.add(UserPreference(user_id=user.id))
    db.commit()
    return {"access_token": create_access_token(user.id, user.token_version), "token_type": "bearer", "user": {"id": user.id, "email": user.email, "name": user.name}}


@router.post("/auth/login", dependencies=[Depends(enforce_auth_rate_limit)])
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return {"access_token": create_access_token(user.id, user.token_version), "token_type": "bearer", "user": {"id": user.id, "email": user.email, "name": user.name}}


@router.post("/auth/logout", status_code=204)
def logout(db: Session = Depends(get_db), user: User = Depends(current_user)):
    user.token_version += 1
    db.commit()
    return Response(status_code=204)


@router.get("/auth/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email, "name": user.name}


@router.get("/farms")
def list_farms(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.scalars(select(Farm).where(Farm.owner_id == user.id).order_by(Farm.created_at.desc())).all()


@router.post("/farms", status_code=201)
def create_farm(body: FarmIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    farm = Farm(owner_id=user.id, **body.model_dump())
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm


@router.get("/farms/{farm_id}")
def get_farm(farm_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    farm = _farm_or_404(db, user, farm_id)
    return {**FarmIn(name=farm.name, location=farm.location, latitude=farm.latitude, longitude=farm.longitude).model_dump(), "id": farm.id,
            "crops": [{"id": crop.id, "name": crop.name, "variety": crop.variety} for crop in farm.crops],
            "scan_count": db.scalar(select(func.count(Scan.id)).where(Scan.farm_id == farm.id)) or 0}


@router.patch("/farms/{farm_id}")
def update_farm(farm_id: str, body: FarmPatch, db: Session = Depends(get_db), user: User = Depends(current_user)):
    farm = _farm_or_404(db, user, farm_id)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(farm, key, value)
    db.commit()
    db.refresh(farm)
    return farm


@router.delete("/farms/{farm_id}", status_code=204)
def delete_farm(farm_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    farm = _farm_or_404(db, user, farm_id)
    db.delete(farm)
    db.commit()
    return Response(status_code=204)


@router.get("/crops")
def list_crops(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [
        {"id": crop.id, "farm_id": crop.farm_id, "name": crop.name, "variety": crop.variety, "farm_name": farm_name}
        for crop, farm_name in db.execute(select(Crop, Farm.name).join(Farm).where(Farm.owner_id == user.id)).all()
    ]


@router.post("/crops", status_code=201)
def create_crop(body: CropIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _farm_or_404(db, user, body.farm_id)
    crop = Crop(**body.model_dump())
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop


@router.post("/scans/analyze", status_code=201)
async def analyze_scan(
    file: UploadFile = File(...),
    farm_id: str | None = None,
    crop: str = Query(default="Tomato", min_length=2, max_length=80),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    classifier: AIService = Depends(get_ai_service),
):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WEBP image.")
    if crop.strip().casefold() != "tomato":
        raise HTTPException(status_code=422, detail="The configured image-classification pipeline currently supports tomato only.")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Image exceeds the {settings.max_upload_mb} MB upload limit.")
    farm = _farm_or_404(db, user, farm_id) if farm_id else None
    try:
        prepared = prepare_upload(data)
    except InvalidImageError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    try:
        result = classifier.analyze(prepared.image)
    except AIServiceError as exc:
        result = {"status": "error", "predicted_class": None, "confidence": None, "model_name": "unavailable", "warning": str(exc)}
    warning = "; ".join(part for part in (prepared.warning, result["warning"]) if part)
    scan = Scan(
        user_id=user.id, farm_id=farm.id if farm else None, image_path=prepared.filename,
        crop=crop.strip(), predicted_class=result["predicted_class"], confidence=result["confidence"],
        status=result["status"], model_name=result["model_name"], warning=warning,
    )
    db.add(scan)
    if scan.status in {"uncertain", "unavailable", "error"}:
        db.add(Notification(
            owner_id=user.id,
            title="Scan needs a careful review" if scan.status == "uncertain" else "AI model unavailable",
            body=scan.warning or "No genuine prediction was generated for this image.",
        ))
    db.commit()
    db.refresh(scan)
    return _scan_payload(db, scan)


@router.get("/scans")
def list_scans(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    crop: str | None = None,
    disease: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    stmt = select(Scan).where(Scan.user_id == user.id)
    if crop:
        stmt = stmt.where(Scan.crop.ilike(f"%{crop}%"))
    if disease:
        stmt = stmt.where(Scan.predicted_class.ilike(f"%{disease}%"))
    if start_date:
        stmt = stmt.where(Scan.created_at >= datetime.combine(start_date, time.min, timezone.utc))
    if end_date:
        stmt = stmt.where(Scan.created_at < datetime.combine(end_date + timedelta(days=1), time.min, timezone.utc))
    if search:
        stmt = stmt.where((Scan.crop.ilike(f"%{search}%")) | (Scan.predicted_class.ilike(f"%{search}%")))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    scans = db.scalars(stmt.order_by(Scan.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [_scan_payload(db, scan) for scan in scans], "total": total, "page": page, "page_size": page_size}


@router.get("/scans/{scan_id}")
def get_scan(scan_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return _scan_payload(db, _scan_or_404(db, user, scan_id))


@router.get("/scans/{scan_id}/image")
def get_scan_image(scan_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    scan = _scan_or_404(db, user, scan_id)
    path = resolve_image_path(scan.image_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Scan image is no longer available.")
    return Response(path.read_bytes(), media_type="image/jpeg", headers={"Cache-Control": "private, no-store"})


@router.delete("/scans/{scan_id}", status_code=204)
def delete_scan(scan_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    scan = _scan_or_404(db, user, scan_id)
    image_path = resolve_image_path(scan.image_path)
    db.delete(scan)
    db.commit()
    image_path.unlink(missing_ok=True)
    return Response(status_code=204)


@router.get("/diseases")
def list_diseases(search: str | None = Query(default=None, max_length=100), crop: str | None = None, db: Session = Depends(get_db)):
    stmt = select(Disease)
    if crop:
        stmt = stmt.where(Disease.crop.ilike(f"%{crop}%"))
    if search:
        stmt = stmt.where((Disease.name.ilike(f"%{search}%")) | (Disease.symptoms.ilike(f"%{search}%")))
    return [_disease_payload(disease) for disease in db.scalars(stmt.order_by(Disease.name)).all()]


@router.get("/diseases/{disease_id}")
def get_disease(disease_id: str, db: Session = Depends(get_db)):
    disease = db.get(Disease, disease_id)
    if disease is None:
        raise HTTPException(status_code=404, detail="Disease information not found.")
    return _disease_payload(disease)


def _weather_coordinates(db: Session, user: User, farm_id: str | None, latitude: float | None, longitude: float | None):
    if farm_id:
        farm = _farm_or_404(db, user, farm_id)
        latitude, longitude = farm.latitude, farm.longitude
    if latitude is None or longitude is None:
        raise HTTPException(status_code=422, detail="Provide a farm with coordinates or latitude and longitude.")
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise HTTPException(status_code=422, detail="Coordinates are outside valid ranges.")
    return latitude, longitude


@router.get("/weather/current")
async def weather_current(
    farm_id: str | None = None, latitude: float | None = None, longitude: float | None = None,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    latitude, longitude = _weather_coordinates(db, user, farm_id, latitude, longitude)
    try:
        weather = await current_weather(latitude, longitude)
        farm = db.get(Farm, farm_id) if farm_id else None
        db.add(WeatherRecord(
            owner_id=user.id,
            farm_id=farm.id if farm else None,
            location=weather["location"],
            source=weather["source"],
            temperature_c=weather["temperature_c"],
            humidity_pct=weather["humidity_pct"],
            rainfall_mm=weather["rainfall_mm"],
            wind_mps=weather["wind_mps"],
            condition=weather["condition"],
            observed_at=datetime.fromtimestamp(weather["observed_at"], timezone.utc),
        ))
        db.commit()
        return weather
    except WeatherUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/weather/forecast")
async def weather_forecast(
    farm_id: str | None = None, latitude: float | None = None, longitude: float | None = None,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    latitude, longitude = _weather_coordinates(db, user, farm_id, latitude, longitude)
    try:
        return await forecast(latitude, longitude)
    except WeatherUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/weather/risks")
async def weather_risks(
    farm_id: str | None = None, latitude: float | None = None, longitude: float | None = None,
    crop: str = "Tomato", db: Session = Depends(get_db), user: User = Depends(current_user),
):
    latitude, longitude = _weather_coordinates(db, user, farm_id, latitude, longitude)
    try:
        weather = await current_weather(latitude, longitude)
    except WeatherUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    farm = db.get(Farm, farm_id) if farm_id else None
    db.add(WeatherRecord(
        owner_id=user.id, farm_id=farm.id if farm else None,
        location=weather["location"], source=weather["source"],
        temperature_c=weather["temperature_c"], humidity_pct=weather["humidity_pct"],
        rainfall_mm=weather["rainfall_mm"], wind_mps=weather["wind_mps"],
        condition=weather["condition"], observed_at=datetime.fromtimestamp(weather["observed_at"], timezone.utc),
    ))
    try:
        alerts = evaluate_weather_risks(weather, crop)
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Weather risk rules are misconfigured; no risk assessment is available.") from exc
    farm = db.get(Farm, farm_id) if farm_id else None
    for alert in alerts:
        db.add(RiskAlert(
            owner_id=user.id, farm_id=farm.id if farm else None,
            title=alert["title"], explanation=alert["explanation"], source=alert["source"],
        ))
    db.commit()
    return {"observations": weather, "alerts": alerts, "message": "No validated crop-specific risk rules are configured." if not alerts else None}


@router.get("/analytics/overview")
def analytics_overview(db: Session = Depends(get_db), user: User = Depends(current_user)):
    scans = db.scalars(select(Scan).where(Scan.user_id == user.id)).all()
    return {
        "total_scans": len(scans),
        "healthy": sum(scan.predicted_class == "Tomato___healthy" for scan in scans),
        "disease_detections": sum(scan.status == "classified" and scan.predicted_class != "Tomato___healthy" for scan in scans),
        "uncertain": sum(scan.status == "uncertain" for scan in scans),
        "unavailable": sum(scan.status in {"unavailable", "error"} for scan in scans),
        "crop_distribution": _distribution(scan.crop for scan in scans),
        "disease_distribution": _distribution(scan.predicted_class for scan in scans if scan.predicted_class),
        "recent_scans": [_scan_payload(db, scan) for scan in sorted(scans, key=lambda item: item.created_at, reverse=True)[:5]],
    }


@router.get("/analytics/trends")
def analytics_trends(period: str = Query(default="monthly", pattern="^(weekly|monthly)$"), db: Session = Depends(get_db), user: User = Depends(current_user)):
    days = 7 if period == "weekly" else 30
    since = datetime.now(timezone.utc) - timedelta(days=days)
    scans = db.scalars(select(Scan).where(Scan.user_id == user.id, Scan.created_at >= since)).all()
    grouped: dict[str, int] = {}
    for scan in scans:
        key = scan.created_at.strftime("%Y-%m-%d" if period == "weekly" else "%Y-%m")
        grouped[key] = grouped.get(key, 0) + 1
    return {"period": period, "days": days, "items": [{"date": key, "scans": grouped[key]} for key in sorted(grouped)]}


@router.get("/analytics/diseases")
def analytics_diseases(db: Session = Depends(get_db), user: User = Depends(current_user)):
    scans = db.scalars(select(Scan).where(Scan.user_id == user.id, Scan.predicted_class.is_not(None))).all()
    return {"items": _distribution(scan.predicted_class for scan in scans), "total_classified": len(scans)}


def _distribution(values):
    counts: dict[str, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    return [{"name": name, "count": count} for name, count in sorted(counts.items())]


@router.get("/reports/scans/{scan_id}/pdf")
def scan_pdf(scan_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    scan = _scan_or_404(db, user, scan_id)
    farm = db.get(Farm, scan.farm_id) if scan.farm_id else None
    path = resolve_image_path(scan.image_path)
    weather_record = None
    if scan.farm_id:
        weather_record = db.scalar(
            select(WeatherRecord)
            .where(
                WeatherRecord.owner_id == user.id,
                WeatherRecord.farm_id == scan.farm_id,
                WeatherRecord.observed_at <= scan.created_at,
                WeatherRecord.observed_at >= scan.created_at - timedelta(hours=24),
            )
            .order_by(WeatherRecord.observed_at.desc())
            .limit(1)
        )
    weather = {
        "source": weather_record.source,
        "observed_at": weather_record.observed_at.isoformat(),
        "temperature_c": weather_record.temperature_c,
        "humidity_pct": weather_record.humidity_pct,
        "rainfall_mm": weather_record.rainfall_mm,
        "condition": weather_record.condition,
    } if weather_record else None
    report = create_scan_pdf(scan, farm.name if farm else None, path, _disease_payload(_disease_for_scan(db, scan)), weather)
    return Response(report, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="farmshield-scan-{scan.id[:8]}.pdf"'})


@router.get("/reports/scans.csv")
def scans_csv(db: Session = Depends(get_db), user: User = Depends(current_user)):
    scans = db.scalars(select(Scan).where(Scan.user_id == user.id).order_by(Scan.created_at.desc())).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["scan_id", "created_at_utc", "farm_id", "crop", "predicted_class", "confidence", "status", "model"])
    for scan in scans:
        created_at = scan.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        writer.writerow([scan.id, created_at.isoformat(), scan.farm_id or "", scan.crop, scan.predicted_class or "", scan.confidence if scan.confidence is not None else "", scan.status, scan.model_name])
    return Response("\ufeff" + output.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": 'attachment; filename="farmshield-scans.csv"'})


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), user: User = Depends(current_user)):
    items = db.scalars(select(Notification).where(Notification.owner_id == user.id).order_by(Notification.created_at.desc())).all()
    return [{"id": item.id, "title": item.title, "body": item.body, "read": item.read, "created_at": item.created_at} for item in items]


@router.patch("/notifications/{notification_id}/read")
def read_notification(notification_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    item = db.scalar(select(Notification).where(Notification.id == notification_id, Notification.owner_id == user.id))
    if item is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    item.read = True
    db.commit()
    return {"id": item.id, "read": item.read}


@router.get("/settings")
def settings_get(db: Session = Depends(get_db), user: User = Depends(current_user)):
    preference = db.scalar(select(UserPreference).where(UserPreference.user_id == user.id))
    if preference is None:
        preference = UserPreference(user_id=user.id)
        db.add(preference)
        db.commit()
        db.refresh(preference)
    return {"language": preference.language, "theme": preference.theme, "units": preference.units, "name": user.name, "email": user.email}


@router.patch("/settings")
def settings_patch(body: PreferencePatch, db: Session = Depends(get_db), user: User = Depends(current_user)):
    preference = db.scalar(select(UserPreference).where(UserPreference.user_id == user.id))
    if preference is None:
        preference = UserPreference(user_id=user.id)
        db.add(preference)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(preference, key, value)
    db.commit()
    return {"language": preference.language, "theme": preference.theme, "units": preference.units}
