"""
HandLingo API — FastAPI entry point.

  uvicorn main:app --host 0.0.0.0 --port 8000

Environment variables (see .env.example):
  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET,
  SUPABASE_JWT_AUDIENCE (default: "authenticated"),
  CORS_ALLOWED_ORIGINS (comma-separated).

Hard rule: there is NO file-upload route on this server. The frontend runs
MediaPipe + GRU locally and sends only validation signals.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers import progress, roadmap

# ---------------------------------------------------------------------------
# CORS — restricted to the React frontend(s).
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

# In production set CORS_ALLOWED_ORIGINS to your real domain.


# ---------------------------------------------------------------------------
# Lifespan — placeholder for future warmups (e.g. read-through cache for the
# essentially-static Levels / Sublevels tables).
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="HandLingo API",
    version="0.1.0",
    description=(
        "Backend for HandLingo — a gamified ISL learning platform. "
        "Validates progression signals only; never accepts video uploads."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(roadmap.router)
app.include_router(progress.router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    """Liveness probe."""
    return {"status": "ok"}
