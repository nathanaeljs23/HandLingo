"""
Shared dependencies for HandLingo:
  - Supabase JWT validation (ES256 via JWKS, with HS256 fallback) → AuthUser
  - Per-request authenticated Supabase AsyncClient (so PostgREST evaluates RLS
    using the caller's JWT, not the anon key).

A fresh AsyncClient is created per request because supabase-py mutates the
PostgREST auth header in place; sharing a single client across concurrent
requests would race the Authorization header.

Newer Supabase projects issue ES256 (asymmetric ECDSA) tokens. We verify these
via the project's JWKS endpoint. The legacy HS256 path is kept as a fallback
for local/test environments that still use the JWT secret directly.
"""

from __future__ import annotations

import os
from typing import Annotated, Optional

import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError, PyJWKClientError
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

if not (SUPABASE_URL and SUPABASE_ANON_KEY):
    import warnings
    warnings.warn(
        "SUPABASE_URL / SUPABASE_ANON_KEY are not set. "
        "API calls will fail until these env vars are provided."
    )
# SUPABASE_JWT_SECRET is only used for the legacy HS256 fallback path.
# ES256 tokens (issued by all new Supabase projects) are verified via JWKS.

# JWKS client — caches public keys and auto-rotates when kid changes.
_jwks_client: Optional[PyJWKClient] = None

def _get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if _jwks_client is None and SUPABASE_URL:
        _jwks_client = PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")
    return _jwks_client


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
    # Peek at the header to decide which path to take.
    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    alg = header.get("alg", "")

    try:
        if alg == "HS256":
            # Legacy path — verify with the shared secret.
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=SUPABASE_JWT_AUDIENCE,
            )
        else:
            # ES256 (and any future asymmetric alg) — verify via JWKS.
            jwks = _get_jwks_client()
            if jwks is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="JWKS client unavailable — SUPABASE_URL is not set.",
                )
            signing_key = jwks.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
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
    except (PyJWKClientConnectionError, PyJWKClientError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not fetch token signing keys: {exc}",
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
