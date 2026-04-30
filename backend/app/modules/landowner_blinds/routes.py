"""
Landowner Blind Sites API routes.

Endpoints for managing user favorites and notes on MD DNR landowner blind sites.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.models.user import User
from app.models.landowner_blinds import LandownerBlindFavorite
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

router = APIRouter(prefix="/api/v1/landowner-blinds", tags=["landowner_blinds"])


class LandownerBlindFavoriteCreate(BaseModel):
    blind_id: str
    notes: Optional[str] = None


class LandownerBlindFavoriteUpdate(BaseModel):
    notes: Optional[str] = None


class LandownerBlindFavoriteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    blind_id: str
    notes: Optional[str]
    created_at: str


@router.post("/{blind_id}/favorite")
async def favorite_blind(
    blind_id: str,
    body: Optional[LandownerBlindFavoriteCreate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LandownerBlindFavoriteResponse:
    """
    Add a blind site to user's favorites.
    
    Args:
        blind_id: DNR feature OBJECTID
        body: Optional notes
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Created favorite record
    """
    # Check if already favorited
    existing = db.query(LandownerBlindFavorite).filter(
        LandownerBlindFavorite.user_id == current_user.id,
        LandownerBlindFavorite.blind_id == blind_id,
    ).first()
    
    if existing:
        # Update notes if provided
        if body and body.notes:
            existing.notes = body.notes
            db.commit()
        return LandownerBlindFavoriteResponse.from_orm(existing)
    
    # Create new favorite
    notes = body.notes if body else None
    favorite = LandownerBlindFavorite(
        user_id=current_user.id,
        blind_id=blind_id,
        notes=notes,
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    
    return LandownerBlindFavoriteResponse.from_orm(favorite)


@router.delete("/{blind_id}/favorite")
async def unfavorite_blind(
    blind_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Remove a blind site from user's favorites.
    
    Args:
        blind_id: DNR feature OBJECTID
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Success message
    """
    favorite = db.query(LandownerBlindFavorite).filter(
        LandownerBlindFavorite.user_id == current_user.id,
        LandownerBlindFavorite.blind_id == blind_id,
    ).first()
    
    if not favorite:
        raise HTTPException(status_code=404, detail="Blind favorite not found")
    
    db.delete(favorite)
    db.commit()
    
    return {"message": "Unfavorited"}


@router.get("/favorites")
async def list_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[LandownerBlindFavoriteResponse]:
    """
    Get current user's favorited blind sites.
    
    Args:
        db: Database session
        current_user: Authenticated user
        
    Returns:
        List of favorites
    """
    favorites = db.query(LandownerBlindFavorite).filter(
        LandownerBlindFavorite.user_id == current_user.id,
    ).all()
    
    return [LandownerBlindFavoriteResponse.from_orm(f) for f in favorites]
