"""
HuntPlan AI — Authentication Service

Anonymous-first auth: device token on first launch creates an account.
JWT tokens for session management. Optional email for recovery.
"""

import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User


ALGORITHM = "HS256"


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token for a user."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """Decode a JWT and return the user_id, or None if invalid."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def generate_device_token() -> str:
    """Generate a unique device token for anonymous registration."""
    return secrets.token_urlsafe(48)


def generate_handle() -> str:
    """Generate a random anonymous handle like 'Hunter_a7f3b2'."""
    suffix = secrets.token_hex(3)
    return f"Hunter_{suffix}"


def generate_invite_code() -> str:
    """Generate a short invite code for deer camps."""
    return secrets.token_urlsafe(8)[:8].upper()


async def register_device(db: AsyncSession, device_token: str, handle: Optional[str] = None) -> tuple[User, str]:
    """
    Register a new anonymous user by device token.
    Returns (user, jwt_token).
    """
    # Check if device already registered
    result = await db.execute(
        select(User).where(User.device_token == device_token)
    )
    existing = result.scalar_one_or_none()

    if existing:
        token = create_access_token(str(existing.id))
        return existing, token

    # Create new anonymous user
    user = User(
        handle=handle or generate_handle(),
        device_token=device_token,
    )
    db.add(user)
    await db.flush()

    token = create_access_token(str(user.id))
    return user, token


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    """Fetch a user by their UUID."""
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        return None

    result = await db.execute(select(User).where(User.id == uid))
    return result.scalar_one_or_none()


async def refresh_token(db: AsyncSession, user_id: str) -> Optional[str]:
    """Issue a new JWT for an existing user."""
    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        return None
    return create_access_token(str(user.id))
