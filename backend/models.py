"""
Pydantic v2 schemas for HandLingo.

Three groups:
  1. *DB models    — mirror Supabase table rows (used internally).
  2. Roadmap / session response models — what the React frontend receives.
  3. Progress update payloads — the only write path; carries no media data.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Constants — single source of truth for the "unbreakable laws"
# ---------------------------------------------------------------------------

#: Minimum GRU validation confidence required to mark a sublevel completed.
CONFIDENCE_THRESHOLD: float = 0.85


class ProgressStatus(str, Enum):
    LOCKED = "locked"
    ACTIVE = "active"
    COMPLETED = "completed"


# ---------------------------------------------------------------------------
# Database row schemas
# ---------------------------------------------------------------------------


class LevelDB(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    level_id: UUID
    title: str
    order_index: int


class SublevelDB(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sublevel_id: UUID
    level_id: UUID
    sign_target: str
    demo_media_url: str
    required_reps: int = Field(ge=1)
    order_index: int


class UserProgressDB(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    sublevel_id: UUID
    status: ProgressStatus


# ---------------------------------------------------------------------------
# Roadmap / Session response schemas
# ---------------------------------------------------------------------------


class SublevelInRoadmap(BaseModel):
    """Sublevel row enriched with the caller's progress status."""

    sublevel_id: UUID
    sign_target: str
    demo_media_url: str
    required_reps: int
    order_index: int
    status: ProgressStatus


class LevelInRoadmap(BaseModel):
    level_id: UUID
    title: str
    order_index: int
    sublevels: List[SublevelInRoadmap]


class RoadmapResponse(BaseModel):
    user_id: UUID
    levels: List[LevelInRoadmap]


class SublevelSession(BaseModel):
    """
    Lightweight payload returned from GET /sublevel/{id}.
    Contains only what the Learning Room needs to render.
    """

    sublevel_id: UUID
    sign_target: str
    demo_media_url: str
    required_reps: int
    status: ProgressStatus


# ---------------------------------------------------------------------------
# Progress update — write path
# ---------------------------------------------------------------------------


class ProgressUpdateRequest(BaseModel):
    """
    Validation signal sent by the frontend after the user completes the
    required reps locally.

    The payload carries NO video, NO frames, NO landmark arrays — only the
    aggregate result of the on-device GRU inference. Server still enforces
    `confidence_score >= CONFIDENCE_THRESHOLD` and `reps_completed >=
    required_reps`.
    """

    sublevel_id: UUID
    reps_completed: int = Field(
        ge=1,
        description="Reps the user actually completed in this session.",
    )
    confidence_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Aggregated GRU confidence for the completed sequence.",
    )


class ProgressUpdateResponse(BaseModel):
    completed_sublevel_id: UUID
    next_sublevel_id: Optional[UUID] = None
    next_level_id: Optional[UUID] = None
    message: str
