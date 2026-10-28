from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine
from .routers import router

app = FastAPI(title="SIGER API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

@app.on_event("startup")
def startup():
    # Alembic is the normal production path; this keeps a fresh local SQLite install usable.
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
