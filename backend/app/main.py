import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.connection import engine, Base
from app.database.seed import seed_database
from app.api.health import router as health_router
from app.api.design import router as design_router
from app.api.templates import router as templates_router
from app.api.patterns import router as patterns_router
from app.api.inventory import router as inventory_router
from app.api.analytics import router as analytics_router
from app.api.master_data import router as master_data_router
from app.api.ai_assistant import router as ai_router

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
GENERATED_DIR = os.path.join(BASE_DIR, "generated")
MOCKUPS_DIR = os.path.join(BASE_DIR, "templates", "mockups")
STORAGE_DIR = os.path.join(BASE_DIR, "storage")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)
os.makedirs(MOCKUPS_DIR, exist_ok=True)
os.makedirs(STORAGE_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Seed
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield

app = FastAPI(
    title="Apparel Print Studio API",
    description="Production-grade local backend for generic apparel design, calibration, blending, and print-ready PNG generation.",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Directories
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")
app.mount("/mockups", StaticFiles(directory=MOCKUPS_DIR), name="mockups")
app.mount("/storage", StaticFiles(directory=STORAGE_DIR), name="storage")

# Include Routers
app.include_router(health_router, prefix="/api")
app.include_router(design_router, prefix="/api")
app.include_router(templates_router, prefix="/api")
app.include_router(patterns_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(master_data_router, prefix="/api")
app.include_router(ai_router, prefix="/api")

@app.get("/")
def root():
    return {
        "app": "Apparel Print Studio API",
        "version": "2.0.0",
        "status": "online",
        "health": "/api/health",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
