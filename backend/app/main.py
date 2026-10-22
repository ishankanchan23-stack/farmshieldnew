import logging
from contextlib import asynccontextmanager
from urllib.parse import unquote

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.engine import make_url

from app.api import routes
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import Disease
from app.services.ai_service import AIService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("farmshield")


def _safe_error_message(exc: Exception) -> str:
    message = str(exc)
    if settings.database_url:
        database_url = make_url(settings.database_url)
        message = message.replace(
            settings.database_url,
            database_url.render_as_string(hide_password=True),
        )
        if database_url.password:
            for password in {database_url.password, unquote(database_url.password)}:
                message = message.replace(password, "[REDACTED]")
    if settings.secret_key:
        message = message.replace(settings.secret_key, "[REDACTED]")
    return message


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            for record in routes.EDUCATIONAL_DISEASES:
                crop, class_id, name, scientific, symptoms, conditions, prevention, next_steps, *source_info = record
                source = source_info[0] if source_info else "University of California Statewide IPM Program; educational summary"
                disease = db.get(Disease, class_id)
                if disease is None:
                    disease = Disease(id=class_id)
                    db.add(disease)
                disease.crop = crop
                disease.name = name
                disease.scientific_name = scientific
                disease.symptoms = symptoms
                disease.associated_conditions = conditions
                disease.prevention = prevention
                disease.next_steps = next_steps
                disease.source = source
            db.commit()
    except Exception as exc:
        logger.error(
            "Database initialization failed (error_type=%s): %s",
            type(exc).__name__,
            _safe_error_message(exc),
        )
        raise RuntimeError(
            "Database initialization failed; check the server log and persistent database configuration."
        ) from None
    routes.ai_service = AIService()
    logger.info("Application ready; AI status=%s", routes.ai_service.status)
    yield


app = FastAPI(
    title="FarmShield AI API",
    description="Farmer-focused crop health decision support. Image classification results depend on explicitly configured model weights.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled request error method=%s path=%s error_type=%s detail=%s",
        request.method,
        request.url.path,
        type(exc).__name__,
        _safe_error_message(exc),
    )
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})


app.include_router(routes.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "farmshield-api"}
