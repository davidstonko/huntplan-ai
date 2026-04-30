"""
AI Planning Engine Router

Handles AI-powered hunting queries using RAG (Retrieval-Augmented Generation).
Searches regulation chunks via full-text search, then generates answers with Claude.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db, engine, async_session, Base
from app.modules.ai_planner.service import generate_ai_response, generate_hunt_plan

router = APIRouter(
    prefix="/ai",
    tags=["ai_planner"],
)


class QueryRequest(BaseModel):
    """Request model for AI planning queries."""
    query: str = Field(..., min_length=2, max_length=2000, description="Natural language hunting question")
    state: str = Field(default="MD", max_length=2, description="State code (currently only MD supported)")
    category: Optional[str] = Field(default=None, description="Filter: season, bag_limit, weapon, land, sunday, license")
    species: Optional[str] = Field(default=None, description="Filter: deer, turkey, waterfowl, bear, etc.")
    conversation_history: Optional[list[dict]] = Field(default=None, description="Previous messages for follow-up context")


class QueryResponse(BaseModel):
    """Response model for AI planning queries."""
    status: str = "ok"
    answer: str
    sources: list[str] = []
    chunks_used: int = 0
    follow_up_suggestions: list[str] = []


@router.post("/query", response_model=QueryResponse)
async def query_ai_planner(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a natural language query to the AI hunting assistant.

    The system searches Maryland hunting regulations using full-text search,
    retrieves relevant chunks, and generates an answer using Claude.

    Examples:
    - "When does deer archery season start?"
    - "Can I hunt on Sundays in Anne Arundel County?"
    - "What's the bag limit for turkey in spring?"
    - "Which WMAs allow bear hunting?"
    """
    try:
        result = await generate_ai_response(
            db=db,
            query=request.query,
            state=request.state,
            category=request.category,
            species=request.species,
            conversation_history=request.conversation_history,
        )

        return QueryResponse(
            status="ok",
            answer=result["answer"],
            sources=result["sources"],
            chunks_used=result["chunks_used"],
            follow_up_suggestions=result["follow_up_suggestions"],
        )

    except ValueError as e:
        # Missing API key or config issue
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI query failed: {str(e)}")


class HuntPlanRequest(BaseModel):
    """Request model for AI hunt plan generation."""
    species: str = Field(..., description="Target species: deer, turkey, waterfowl, bear, small_game")
    weapon: str = Field(..., description="Weapon/method: archery, firearms, muzzleloader, shotgun")
    hunt_date: str = Field(..., description="Planned hunt date (YYYY-MM-DD)")
    county: Optional[str] = Field(default=None, description="Maryland county name")
    land_name: Optional[str] = Field(default=None, description="Specific public land name")
    state: str = Field(default="MD", max_length=2)


class HuntPlanResponse(BaseModel):
    """Response model for AI hunt plan generation."""
    status: str = "ok"
    plan: str
    species: str
    weapon: str
    hunt_date: str
    county: Optional[str] = None
    land_name: Optional[str] = None
    sources: list[str] = []
    chunks_used: int = 0


@router.post("/hunt-plan", response_model=HuntPlanResponse)
async def create_hunt_plan(
    request: HuntPlanRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a comprehensive AI-powered hunt plan.

    Provide species, weapon type, date, and optionally a county or specific
    public land. The AI will search regulations, check season dates,
    and generate a detailed plan with locations, timing, gear, and strategy.

    Examples:
    - {"species": "deer", "weapon": "archery", "hunt_date": "2025-10-15", "county": "Frederick"}
    - {"species": "turkey", "weapon": "shotgun", "hunt_date": "2026-04-20"}
    - {"species": "waterfowl", "weapon": "shotgun", "hunt_date": "2025-12-01", "land_name": "Deal Island WMA"}
    """
    try:
        result = await generate_hunt_plan(
            db=db,
            species=request.species,
            weapon=request.weapon,
            hunt_date=request.hunt_date,
            county=request.county,
            land_name=request.land_name,
            state=request.state,
        )
        return HuntPlanResponse(
            status="ok",
            plan=result["plan"],
            species=result["species"],
            weapon=result["weapon"],
            hunt_date=result["hunt_date"],
            county=result.get("county"),
            land_name=result.get("land_name"),
            sources=result["sources"],
            chunks_used=result["chunks_used"],
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hunt plan generation failed: {str(e)}")


@router.post("/ingest")
async def trigger_ingestion():
    """
    Admin endpoint: Ingest Maryland regulation data into the database.
    Seeds the regulation_chunks table for RAG queries.
    """
    import uuid
    from sqlalchemy import text
    from app.models.rag import RegulationChunk

    # Import the ingestion data
    from scripts.ingest_regulations import (
        build_season_chunks, build_wma_chunks, build_county_chunks,
        build_bag_limit_chunks, build_general_chunks,
    )

    try:
        all_chunks = []
        all_chunks.extend(build_season_chunks())
        all_chunks.extend(build_wma_chunks())
        all_chunks.extend(build_county_chunks())
        all_chunks.extend(build_bag_limit_chunks())
        all_chunks.extend(build_general_chunks())

        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM regulation_chunks WHERE state = 'MD'"))

        async with async_session() as session:
            for chunk_data in all_chunks:
                chunk = RegulationChunk(
                    id=str(uuid.uuid4()),
                    content=chunk_data["content"],
                    title=chunk_data["title"],
                    state="MD",
                    category=chunk_data["category"],
                    species=chunk_data["species"],
                    county=chunk_data["county"],
                    source=chunk_data["source"],
                    extra_data=chunk_data["extra_data"],
                    regulation_year="2025-2026",
                )
                session.add(chunk)
            await session.commit()

        # Update search vectors
        async with engine.begin() as conn:
            await conn.execute(text("""
                UPDATE regulation_chunks
                SET search_vector = to_tsvector('english', title || ' ' || content)
                WHERE state = 'MD'
            """))

        return {
            "status": "ok",
            "chunks_ingested": len(all_chunks),
            "message": f"Successfully ingested {len(all_chunks)} Maryland regulation chunks",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
