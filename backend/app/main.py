from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine
from .routers import router

@asynccontextmanager
async def lifespan(_app):
    if settings.environment.lower() == "production" and (settings.jwt_secret == "dev-only-change-me" or len(settings.jwt_secret) < 32):
        raise RuntimeError("JWT_SECRET debe ser un secreto aleatorio de al menos 32 caracteres en producción")
    # Alembic is the normal production path; this keeps a fresh local SQLite install usable.
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
    yield
app = FastAPI(title="SIGER API", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.environment.lower() == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
app.include_router(router)
