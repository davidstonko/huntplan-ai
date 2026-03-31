"""
HuntPlan AI — Authentication Routes

Anonymous-first auth endpoints:
  POST /register  — register device, get JWT
  POST /refresh   — refresh an existing JWT
  GET  /me        — get current user profile
  PATCH /me       — update profile (handle, email, preferences)
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.modules.auth.service import register_device, refresh_token, generate_device_token
from app.modules.auth.dependencies import get_current_user


router = APIRouter()


# --- Request / Response models ---

class RegisterRequest(BaseModel):
    device_token: Optional[str] = None  # If None, server generates one
    handle: Optional[str] = None        # If None, server generates one

class RegisterResponse(BaseModel):
    user_id: str
    handle: str
    device_token: str
    access_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    access_token: str

class ProfileResponse(BaseModel):
    user_id: str
    handle: str
    email: Optional[str] = None
    experience_level: Optional[str] = None
    preferred_species: Optional[str] = None
    home_county: Optional[str] = None
    home_state: Optional[str] = None
    reputation_score: int = 0
    is_verified_hunter: bool = False

class UpdateProfileRequest(BaseModel):
    handle: Optional[str] = None
    email: Optional[str] = None
    experience_level: Optional[str] = None
    preferred_species: Optional[str] = None
    home_county: Optional[str] = None
    home_state: Optional[str] = None


# --- Endpoints ---

@router.post("/register", response_model=RegisterResponse)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new anonymous user or re-authenticate an existing device.
    Called automatically on first app launch.
    """
    device_token = request.device_token or generate_device_token()

    user, jwt_token = await register_device(db, device_token, request.handle)

    return RegisterResponse(
        user_id=str(user.id),
        handle=user.handle,
        device_token=user.device_token,
        access_token=jwt_token,
    )


@router.post("/refresh")
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh an access token. Returns a new JWT."""
    from app.modules.auth.service import decode_access_token

    user_id = decode_access_token(request.access_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    new_token = await refresh_token(db, user_id)
    if not new_token:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return {"access_token": new_token, "token_type": "bearer"}


@router.get("/me", response_model=ProfileResponse)
async def get_profile(user: User = Depends(get_current_user)):
    """Get the current user's profile."""
    return ProfileResponse(
        user_id=str(user.id),
        handle=user.handle,
        email=user.email,
        experience_level=user.experience_level,
        preferred_species=user.preferred_species,
        home_county=user.home_county,
        home_state=user.home_state,
        reputation_score=user.reputation_score,
        is_verified_hunter=user.is_verified_hunter,
    )


@router.patch("/me", response_model=ProfileResponse)
async def update_profile(
    updates: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile fields."""
    update_data = updates.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    await db.flush()

    return ProfileResponse(
        user_id=str(user.id),
        handle=user.handle,
        email=user.email,
        experience_level=user.experience_level,
        preferred_species=user.preferred_species,
        home_county=user.home_county,
        home_state=user.home_state,
        reputation_score=user.reputation_score,
        is_verified_hunter=user.is_verified_hunter,
    )
