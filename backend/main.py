import os
import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from backend.config import BASE_DIR, DEBUG
from backend.services.db_service import DBService
from backend.routes import (
    scrape_router,
    paper_router,
    trend_router,
    topic_router,
    saved_router,
    export_router,
    brief_router,
    recommendation_router,
    settings_router
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app")

app = FastAPI(
    title="Research Paper Trend Tracker",
    description="Automated preprint harvesting, trend analysis, and Gemini-powered research intelligence platform.",
    version="1.0.0"
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(scrape_router)
app.include_router(paper_router)
app.include_router(trend_router)
app.include_router(topic_router)
app.include_router(saved_router)
app.include_router(export_router)
app.include_router(brief_router)
app.include_router(recommendation_router)
app.include_router(settings_router)

# Health check
@app.get("/api/health", summary="Application health check")
def health_check():
    return {"status": "ok", "service": "Research Paper Trend Tracker"}

# Initialize DB on startup
@app.on_event("startup")
def on_startup():
    logger.info("Initializing database...")
    db = DBService()
    db.init_db()
    logger.info("Database initialized successfully.")

# Mount frontend build if available
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(request: Request, full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {
            "message": "Research Paper Trend Tracker Backend is running.",
            "api_docs": "/docs",
            "status": "ready"
        }
