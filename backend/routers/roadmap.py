"""
Content retrieval routes.

  GET /roadmap            — full roadmap with the caller's progress overlay.
  GET /sublevel/{id}      — single Learning Room session payload.

All queries run as the caller (RLS-enforced); no service-role escalation.
"""

from __future__ import annotations

from typing import Annotated, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import AsyncClient

from dependencies import AuthUser, get_current_user, get_supabase_for_user
from models import (
    LevelInRoadmap,
    ProgressStatus,
    RoadmapResponse,
    SublevelInRoadmap,
    SublevelSession,
)

router = APIRouter(tags=["content"])


# ---------------------------------------------------------------------------
# GET /roadmap
# ---------------------------------------------------------------------------


@router.get("/roadmap", response_model=RoadmapResponse)
async def get_roadmap(
    user: Annotated[AuthUser, Depends(get_current_user)],
    db: Annotated[AsyncClient, Depends(get_supabase_for_user)],
) -> RoadmapResponse:
    """
    Return every Level + its Sublevels, joined with the caller's UserProgress.
    Sublevels with no UserProgress row default to `locked`.

    Three lean queries beat a single complex join here because:
      * Levels and Sublevels are essentially static reference data.
      * UserProgress is small (one row per attempted sublevel).
      * It keeps each PostgREST roundtrip well under the 1 s budget.
    """

    levels_resp = (
        await db.table("levels")
        .select("level_id, title, order_index")
        .order("order_index")
        .execute()
    )
    sublevels_resp = (
        await db.table("sublevels")
        .select(
            "sublevel_id, level_id, sign_target, demo_media_url, "
            "required_reps, order_index"
        )
        .order("order_index")
        .execute()
    )
    progress_resp = (
        await db.table("user_progress")
        .select("sublevel_id, status")
        .eq("user_id", user.user_id)
        .execute()
    )

    progress_map: Dict[str, str] = {
        row["sublevel_id"]: row["status"] for row in (progress_resp.data or [])
    }

    # Seed the very first sublevel as active for brand-new users.
    if not progress_map and sublevels_resp.data:
        # Ensure the public.users row exists (trigger may not have fired for older accounts).
        await (
            db.table("users")
            .upsert({"user_id": user.user_id}, on_conflict="user_id")
            .execute()
        )
        level_order_map = {str(lv["level_id"]): lv["order_index"] for lv in (levels_resp.data or [])}
        first_sub = sorted(
            sublevels_resp.data,
            key=lambda s: (level_order_map.get(str(s["level_id"]), 9999), s["order_index"]),
        )[0]
        first_id = str(first_sub["sublevel_id"])
        await (
            db.table("user_progress")
            .upsert(
                {"user_id": user.user_id, "sublevel_id": first_id, "status": "active"},
                on_conflict="user_id,sublevel_id",
            )
            .execute()
        )
        progress_map[first_id] = "active"

    sublevels_by_level: Dict[str, List[SublevelInRoadmap]] = {}
    for s in sublevels_resp.data or []:
        sublevels_by_level.setdefault(str(s["level_id"]), []).append(
            SublevelInRoadmap(
                sublevel_id=s["sublevel_id"],
                sign_target=s["sign_target"],
                demo_media_url=s["demo_media_url"],
                required_reps=s["required_reps"],
                order_index=s["order_index"],
                status=ProgressStatus(
                    progress_map.get(s["sublevel_id"], ProgressStatus.LOCKED.value)
                ),
            )
        )

    levels = [
        LevelInRoadmap(
            level_id=lv["level_id"],
            title=lv["title"],
            order_index=lv["order_index"],
            sublevels=sublevels_by_level.get(str(lv["level_id"]), []),
        )
        for lv in (levels_resp.data or [])
    ]

    return RoadmapResponse(user_id=user.user_id, levels=levels)


# ---------------------------------------------------------------------------
# GET /sublevel/{sublevel_id}
# ---------------------------------------------------------------------------


@router.get("/sublevel/{sublevel_id}", response_model=SublevelSession)
async def get_sublevel(
    sublevel_id: UUID,
    user: Annotated[AuthUser, Depends(get_current_user)],
    db: Annotated[AsyncClient, Depends(get_supabase_for_user)],
) -> SublevelSession:
    """Payload for the Learning Room — sign target, demo media, required reps."""

    sublevel_id_str = str(sublevel_id)

    # postgrest-py 2.x: maybe_single().execute() returns None when no row exists.
    sub_resp = (
        await db.table("sublevels")
        .select(
            "sublevel_id, sign_target, demo_media_url, required_reps, "
            "use_case, sentence_examples, cultural_note, "
            "quiz_question, quiz_options, quiz_answer_index"
        )
        .eq("sublevel_id", sublevel_id_str)
        .maybe_single()
        .execute()
    )
    if sub_resp is None or not sub_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sublevel not found.",
        )

    progress_resp = (
        await db.table("user_progress")
        .select("status")
        .eq("user_id", user.user_id)
        .eq("sublevel_id", sublevel_id_str)
        .maybe_single()
        .execute()
    )
    prog_data = progress_resp.data if progress_resp is not None else None
    current_status = ProgressStatus(
        (prog_data or {}).get("status", ProgressStatus.LOCKED.value)
    )

    if current_status == ProgressStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This sublevel is locked. Complete the previous one first.",
        )

    d = sub_resp.data
    sentence_examples = None
    if d.get("sentence_examples"):
        from models import SentenceExample
        sentence_examples = [SentenceExample(**ex) for ex in d["sentence_examples"]]

    return SublevelSession(
        sublevel_id=d["sublevel_id"],
        sign_target=d["sign_target"],
        demo_media_url=d["demo_media_url"],
        required_reps=d["required_reps"],
        status=current_status,
        use_case=d.get("use_case"),
        sentence_examples=sentence_examples,
        cultural_note=d.get("cultural_note"),
        quiz_question=d.get("quiz_question"),
        quiz_options=d.get("quiz_options"),
        quiz_answer_index=d.get("quiz_answer_index"),
    )
