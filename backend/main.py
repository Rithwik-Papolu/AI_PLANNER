"""
AI PLANNER – Intelligent Personal Planning and Decision-Making Agent
FastAPI Backend Gateway
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import create_tables, engine, SessionLocal
from backend.models import UserPreferences, Task
from backend.routes import (
    tasks,
    preferences,
    history,
    timetable,
    chat,
    voice,
    analytics,
    reminders
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai_planner")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables are created
    logger.info("Initializing SQLite database tables...")
    create_tables()

    # Seed initial user preferences if empty
    db = SessionLocal()
    try:
        prefs = db.query(UserPreferences).first()
        if not prefs:
            logger.info("Creating default user preferences...")
            db.add(UserPreferences(
                user_name="Rithwik",
                working_start="09:00",
                working_end="18:00",
                lunch_start="13:00",
                lunch_duration_minutes=60,
                break_minutes=15,
                timezone="Asia/Kolkata",
                daily_available_minutes=480,
                preferred_planning_style="balanced",
                default_task_duration=30,
                wake_word_enabled=True,
                wake_word="Hey Planner",
                ai_model="llama3.2"
            ))
            db.commit()
    finally:
        db.close()

    yield

    # Shutdown
    logger.info("Shutting down AI Planner backend gateway.")


app = FastAPI(
    title="AI PLANNER – Intelligent Personal Planning Agent",
    description="Full-stack AI-powered personal planning, decision-making, and timetable optimization API.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(tasks.router)
app.include_router(preferences.router)
app.include_router(history.router)
app.include_router(timetable.router)
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(analytics.router)
app.include_router(reminders.router)


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response

# Base directory paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "database": "sqlite_connected"
    }

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        target = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/", tags=["Health"])
    def root():
        return {
            "status": "online",
            "service": "AI PLANNER Gateway",
            "version": "1.0.0",
            "message": "Welcome to AI Planner – Intelligent Personal Planning and Decision-Making Agent."
        }
