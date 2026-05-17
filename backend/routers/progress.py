"""
Progress write path.

  POST /progress/update — Mark a sublevel completed and unlock the next one.

Server-side enforcement of the *unbreakable laws*:
  * GRU confidence must be >= CONFIDENCE_THRESHOLD (0.85).
  * Reps completed must meet the sublevel's `required_reps`.
  * RLS scopes every write to the authenticated user.
  * No video/frames/landmarks ever cross this boundary.
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import AsyncClient

from dependencies import AuthUser, get_current_user, get_supabase_for_user
from models import (
    CONFIDENCE_THRESHOLD,
    ProgressStatus,
    ProgressUpdateRequest,
    ProgressUpdateResponse,
)

router = APIRouter(prefix="/progress", tags=["progress"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _upsert_progress(
    db: AsyncClient,
    user_id: str,
    sublevel_id: str,
    new_status: ProgressStatus,
) -> None:
    """Idempotent UserProgress write — never demotes a completed sublevel."""
    await (
        db.table("user_progress")
        .upsert(
            {
                "user_id": user_id,
                "sublevel_id": sublevel_id,
                "status": new_status.value,
            },
            on_conflict="user_id,sublevel_id",
        )
        .execute()
    )


async def _next_sublevel_in_level(
    db: AsyncClient, level_id: str, current_order: int
) -> Optional[dict]:
    """Find the next sublevel by `order_index` within the same level."""
    resp = (
        await db.table("sublevels")
        .select("sublevel_id, level_id, order_index")
        .eq("level_id", level_id)
        .gt("order_index", current_order)
        .order("order_index")
        .limit(1)
        .execute()
    )
    return resp.data[0] if resp.data else None


async def _first_sublevel_of_next_level(
    db: AsyncClient, current_level_order: int
) -> tuple[Optional[str], Optional[str]]:
    """Return (next_level_id, next_sublevel_id) or (None, None) at the end."""
    next_level = (
        await db.table("levels")
        .select("level_id")
        .gt("order_index", current_level_order)
        .order("order_index")
        .limit(1)
        .execute()
    )
    if not next_level.data:
        return None, None

    next_level_id = next_level.data[0]["level_id"]
    first_sub = (
        await db.table("sublevels")
        .select("sublevel_id")
        .eq("level_id", next_level_id)
        .order("order_index")
        .limit(1)
        .execute()
    )
    next_sub_id = first_sub.data[0]["sublevel_id"] if first_sub.data else None
    return next_level_id, next_sub_id


# ---------------------------------------------------------------------------
# POST /progress/update
# ---------------------------------------------------------------------------


@router.post(
    "/update",
    response_model=ProgressUpdateResponse,
    status_code=status.HTTP_200_OK,
)
async def update_progress(
    payload: ProgressUpdateRequest,
    user: Annotated[AuthUser, Depends(get_current_user)],
    db: Annotated[AsyncClient, Depends(get_supabase_for_user)],
) -> ProgressUpdateResponse:
    """
    Apply a validated progression signal:

      1. Enforce confidence threshold (>= 85%).
      2. Verify sublevel exists & reps are sufficient.
      3. Mark the current sublevel as completed (RLS-scoped upsert).
      4. Unlock the next sublevel in the same level — or the first sublevel
         of the next level when this level is finished.
      5. Bump `users.current_level` when crossing a level boundary.
    """

    # 1. Confidence gate — the unbreakable law.
    if payload.confidence_score < CONFIDENCE_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Validation confidence {payload.confidence_score:.2%} is below "
                f"the required {CONFIDENCE_THRESHOLD:.0%} threshold."
            ),
        )

    sublevel_id_str = str(payload.sublevel_id)

    # 2. Load the current sublevel (RLS will hide it if not visible to user).
    # postgrest-py 2.x: maybe_single().execute() returns None when no row exists.
    current_sub_resp = (
        await db.table("sublevels")
        .select("sublevel_id, level_id, order_index, required_reps")
        .eq("sublevel_id", sublevel_id_str)
        .maybe_single()
        .execute()
    )
    if current_sub_resp is None or not current_sub_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sublevel not found.",
        )
    current_sub = current_sub_resp.data

    if payload.reps_completed < current_sub["required_reps"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Only {payload.reps_completed} reps completed; "
                f"{current_sub['required_reps']} required."
            ),
        )

    # 3. Mark the current sublevel completed.
    await _upsert_progress(
        db, user.user_id, sublevel_id_str, ProgressStatus.COMPLETED
    )

    # 4. Try unlocking the next sublevel in the same level.
    next_in_level = await _next_sublevel_in_level(
        db, current_sub["level_id"], current_sub["order_index"]
    )

    next_sublevel_id: Optional[str] = None
    next_level_id: Optional[str] = None

    if next_in_level:
        next_sublevel_id = next_in_level["sublevel_id"]
        await _upsert_progress(
            db, user.user_id, next_sublevel_id, ProgressStatus.ACTIVE
        )
        message = "Sublevel completed — next sublevel unlocked."
    else:
        # 5. Level finished — bridge to the next level if one exists.
        current_level_resp = (
            await db.table("levels")
            .select("order_index")
            .eq("level_id", current_sub["level_id"])
            .maybe_single()
            .execute()
        )
        level_data = current_level_resp.data if current_level_resp is not None else None
        current_level_order = (level_data or {}).get("order_index", 0)

        next_level_id, next_sublevel_id = await _first_sublevel_of_next_level(
            db, current_level_order
        )

        if next_level_id and next_sublevel_id:
            await _upsert_progress(
                db, user.user_id, next_sublevel_id, ProgressStatus.ACTIVE
            )
            await (
                db.table("users")
                .update({"current_level": next_level_id})
                .eq("user_id", user.user_id)
                .execute()
            )
            message = "Level completed — next level unlocked."
        else:
            message = "Congratulations — you have completed the entire roadmap!"

    return ProgressUpdateResponse(
        completed_sublevel_id=payload.sublevel_id,
        next_sublevel_id=next_sublevel_id,
        next_level_id=next_level_id,
        message=message,
    )
