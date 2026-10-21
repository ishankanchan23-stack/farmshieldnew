import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import routes
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import Disease
from app.services.ai_service import AIService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("farmshield")


@asynccontextmanager
async def lifespan(_app: FastAPI):
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
    logger.exception("Unhandled request error: %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})


app.include_router(routes.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "farmshield-api"}
