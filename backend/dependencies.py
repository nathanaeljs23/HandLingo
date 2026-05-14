"""
Shared dependencies for HandLingo:
  - Supabase JWT validation (HS256) → AuthUser
  - Per-request authenticated Supabase AsyncClient (so PostgREST evaluates RLS
    using the caller's JWT, not the anon key).

A fresh AsyncClient is created per request because supabase-py mutates the
PostgREST auth header in place; sharing a single client across concurrent
requests would race the Authorization header.
"""

from __future__ import annotations

import os
from typing import Annotated, Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel
from supabase import AsyncClient, acreate_client

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_JWT_SECRET: str = os.environ.get("SUPABASE_JWT_SECRET", "")
SUPABASE_JWT_AUDIENCE: str = os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated")

if not (SUPABASE_URL and SUPABASE_ANON_KEY and SUPABASE_JWT_SECRET):
    # Fail fast at import time in production; tests can monkeypatch env first.
    # We only warn here so that `pytest --collect-only` etc. still works.
    import warnings

    warnings.warn(
        "SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_JWT_SECRET are not all set. "
        "API calls will fail until these env vars are provided."
    )


# ---------------------------------------------------------------------------
# Identity model
# ---------------------------------------------------------------------------


class AuthUser(BaseModel):
    """Authenticated principal extracted from a verified Supabase JWT."""

    user_id: str
    email: Optional[str] = None
    role: str = "authenticated"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization.split(" ", 1)[1].strip()


def _decode_supabase_jwt(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=SUPABASE_JWT_AUDIENCE,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
) -> AuthUser:
    """Validate the Supabase JWT on the request and return the caller."""
    token = _extract_bearer_token(authorization)
    payload = _decode_supabase_jwt(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing a subject (sub).",
        )

    return AuthUser(
        user_id=user_id,
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
    )


async def get_supabase_for_user(
    authorization: Annotated[Optional[str], Header()] = None,
) -> AsyncClient:
    """
    Return an authenticated Supabase AsyncClient for the current request.

    The user's JWT is forwarded to PostgREST so that all SELECT / INSERT /
    UPDATE statements are evaluated under Row Level Security as that user.
    Never use the service role key for user-facing operations.
    """
    token = _extract_bearer_token(authorization)
    # Verify the token before opening a DB session.
    _decode_supabase_jwt(token)

    client: AsyncClient = await acreate_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    client.postgrest.auth(token)
    return client
