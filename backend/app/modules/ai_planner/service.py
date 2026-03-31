"""
AI Planner Service — RAG-powered hunting assistant

Retrieves relevant regulation chunks via full-text search,
then generates answers using Google Gemini with retrieved context.

Supports Gemini (primary, free tier) with Anthropic Claude as optional fallback.
"""

import logging
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)

# ─── LLM Client Setup ────────────────────────────────────────────

_gemini_model = None


def get_gemini_model():
    """Lazy-init Google Gemini client."""
    global _gemini_model
    if _gemini_model is None:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not configured")        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        _gemini_model = genai.GenerativeModel(settings.llm_model)
    return _gemini_model


async def _call_gemini(model, prompt: str) -> str:
    """
    Call Gemini API. google-generativeai's generate_content is synchronous,
    so we run it in a thread to avoid blocking the async event loop.
    """
    import asyncio

    def _sync_call():
        response = model.generate_content(prompt)
        return response.text

    return await asyncio.get_event_loop().run_in_executor(None, _sync_call)


SYSTEM_PROMPT = """You are the MDHuntFishOutdoors AI assistant — an expert on Maryland hunting regulations, seasons, public lands, and outdoor recreation.

Your role:
- Answer hunting questions accurately using ONLY the regulation data provided below
- Cite specific sources when available (e.g., "MD DNR Hunter's Guide", "eRegulations Maryland")
- If the provided context doesn't contain enough info to fully answer, say so clearly
- Always end with a brief reminder to verify with MD DNR before hunting
- Be concise but thorough — hunters need actionable answers
- If asked about non-Maryland regulations, note that you currently only cover Maryland- Use plain language, not legal jargon
- Format dates clearly (e.g., "September 6, 2025" not "2025-09-06")

Important: You are NOT providing legal advice. You are providing regulation information to help hunters plan.
"""


async def search_regulation_chunks(
    db: AsyncSession,
    query: str,
    state: str = "MD",
    category: Optional[str] = None,
    species: Optional[str] = None,
    limit: int = 8,
) -> list[dict]:
    """
    Search regulation chunks using PostgreSQL full-text search.

    Uses ts_rank to score results and returns the most relevant chunks.
    """
    # Build the search query with plainto_tsquery for natural language
    sql_parts = [
        """
        SELECT id, title, content, category, species, county, source, extra_data,
               ts_rank(search_vector, plainto_tsquery('english', :query)) AS rank
        FROM regulation_chunks
        WHERE search_vector @@ plainto_tsquery('english', :query)
          AND state = :state
        """    ]
    params = {"query": query, "state": state}

    if category:
        sql_parts.append("AND category = :category")
        params["category"] = category

    if species:
        sql_parts.append("AND species ILIKE :species")
        params["species"] = f"%{species}%"

    sql_parts.append("ORDER BY rank DESC LIMIT :limit")
    params["limit"] = limit

    sql = text("\n".join(sql_parts))
    result = await db.execute(sql, params)
    rows = result.fetchall()

    return [
        {
            "id": row.id,
            "title": row.title,
            "content": row.content,
            "category": row.category,
            "species": row.species,
            "county": row.county,
            "source": row.source,
            "extra_data": row.extra_data if hasattr(row, 'extra_data') else None,
            "rank": float(row.rank),        }
        for row in rows
    ]


async def fallback_search(
    db: AsyncSession,
    query: str,
    state: str = "MD",
    limit: int = 8,
) -> list[dict]:
    """
    Fallback: ILIKE search when full-text search returns no results.
    Catches queries with partial words or unusual phrasing.
    """
    words = query.lower().split()
    # Search for chunks containing any of the query words
    conditions = " OR ".join([f"LOWER(content) LIKE :w{i}" for i in range(len(words))])
    params = {f"w{i}": f"%{w}%" for i, w in enumerate(words)}
    params["state"] = state
    params["limit"] = limit

    sql = text(f"""
        SELECT id, title, content, category, species, county, source, extra_data, 0.1 AS rank
        FROM regulation_chunks
        WHERE state = :state AND ({conditions})
        LIMIT :limit
    """)

    result = await db.execute(sql, params)    rows = result.fetchall()

    return [
        {
            "id": row.id,
            "title": row.title,
            "content": row.content,
            "category": row.category,
            "species": row.species,
            "county": row.county,
            "source": row.source,
            "extra_data": row.extra_data if hasattr(row, 'extra_data') else None,
            "rank": float(row.rank),
        }
        for row in rows
    ]


async def generate_ai_response(
    db: AsyncSession,
    query: str,
    state: str = "MD",
    category: Optional[str] = None,
    species: Optional[str] = None,
    conversation_history: Optional[list[dict]] = None,
) -> dict:
    """
    Full RAG pipeline: search → retrieve → generate.

    Returns a structured response with answer text, sources, and suggestions.    """
    # Step 1: Retrieve relevant chunks
    chunks = await search_regulation_chunks(db, query, state, category, species)

    # Fallback if full-text search found nothing
    if not chunks:
        chunks = await fallback_search(db, query, state)

    # Step 2: Build context from retrieved chunks
    if chunks:
        context_parts = []
        sources = set()
        for i, chunk in enumerate(chunks, 1):
            context_parts.append(f"[{i}] {chunk['title']}\n{chunk['content']}")
            if chunk.get("source"):
                sources.add(chunk["source"])

        context_text = "\n\n---\n\n".join(context_parts)
        sources_list = list(sources)
    else:
        context_text = "No specific regulation data found for this query."
        sources_list = []

    # Step 3: Build messages for Claude
    messages = []

    # Include conversation history if provided (for follow-up questions)
    if conversation_history:
        for msg in conversation_history[-6:]:  # Last 3 exchanges max
            messages.append({                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

    # Current query with context
    user_message = f"""Based on the following Maryland hunting regulation data, please answer the user's question.

REGULATION DATA:
{context_text}

USER QUESTION: {query}"""

    messages.append({"role": "user", "content": user_message})

    # Step 4: Call Gemini
    try:
        model = get_gemini_model()

        # Gemini uses a single prompt with system instruction baked in
        full_prompt = f"{SYSTEM_PROMPT}\n\n---\n\n{user_message}"

        response = await _call_gemini(model, full_prompt)
        answer_text = response

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        # Graceful fallback: return the raw chunks as a formatted answer
        if chunks:
            answer_text = "I'm having trouble generating a response right now, but here's what I found:\n\n"            for chunk in chunks[:3]:
                answer_text += f"**{chunk['title']}**\n{chunk['content']}\n\n"
            answer_text += "\n⚠️ Always verify with MD DNR before hunting."
        else:
            answer_text = (
                "I couldn't find specific regulation data for your question. "
                "Please try rephrasing, or check the MD DNR website at "
                "dnr.maryland.gov for the latest information."
            )
        sources_list = []

    # Step 5: Generate follow-up suggestions based on category
    follow_ups = _generate_follow_ups(query, chunks)

    return {
        "answer": answer_text,
        "sources": sources_list,
        "chunks_used": len(chunks),
        "follow_up_suggestions": follow_ups,
    }


HUNT_PLAN_SYSTEM_PROMPT = """You are the MDHuntFishOutdoors AI Hunt Planner — an expert at creating personalized hunting plans for Maryland hunters.

Given a hunter's target species, preferred weapon, planned date, and location (county or specific public land), generate a detailed hunt plan.

Your plan MUST include ALL of these sections:
1. **Overview** — Quick summary of the hunt (species, method, location, date)
2. **Legal Check** — Confirm the season is open for this date, weapon, and species. List any restrictions.
3. **Recommended Locations** — Suggest 2-3 specific public lands/WMAs near the requested area, with brief notes on why each is good.4. **Timing** — Legal shooting hours for the date, plus recommended arrival time (usually 45-60 min before shooting light).
5. **Gear Checklist** — Essential gear for this specific hunt type and conditions.
6. **Strategy Tips** — 3-4 actionable hunting strategy tips for this species/weapon/time of year.
7. **Safety Reminders** — Key safety points relevant to the method (tree stand safety, blaze orange, etc.)
8. **Regulations Summary** — Bag limits, reporting requirements, any special rules.

Format the output in clean markdown. Be specific to Maryland — use real land names, real dates, real regulations.

IMPORTANT: You are providing PLANNING information, not legal advice. Always remind the hunter to verify with MD DNR.
Use ONLY the regulation data provided below. If data is missing, say so — don't guess.
"""


async def generate_hunt_plan(
    db: AsyncSession,
    species: str,
    weapon: str,
    hunt_date: str,
    county: Optional[str] = None,
    land_name: Optional[str] = None,
    state: str = "MD",
) -> dict:
    """
    Generate a comprehensive AI-powered hunt plan.

    Retrieves all relevant regulation chunks (seasons, lands, bag limits, county rules)
    and asks Claude to synthesize a full hunt plan.
    """
    # Build a comprehensive search query
    search_terms = f"{species} {weapon} season {county or ''} {land_name or ''} hunting Maryland"
    # Retrieve regulation chunks across multiple categories
    season_chunks = await search_regulation_chunks(db, f"{species} season {weapon}", state, category="season", species=species, limit=4)
    land_chunks = await search_regulation_chunks(db, f"{land_name or county or 'public land'} hunting", state, category="land", limit=4)
    bag_chunks = await search_regulation_chunks(db, f"{species} bag limit", state, category="bag_limit", species=species, limit=3)
    county_chunks = await search_regulation_chunks(db, f"{county or 'Maryland'} county hunting rules", state, category="county", limit=3)
    general_chunks = await search_regulation_chunks(db, f"hunting safety {weapon} regulations", state, category="general", limit=2)

    # Combine all chunks, deduplicate by ID
    all_chunks = []
    seen_ids = set()
    for chunk in season_chunks + land_chunks + bag_chunks + county_chunks + general_chunks:
        if chunk["id"] not in seen_ids:
            all_chunks.append(chunk)
            seen_ids.add(chunk["id"])

    # Fallback if nothing found
    if not all_chunks:
        all_chunks = await fallback_search(db, search_terms, state, limit=10)

    # Build context
    if all_chunks:
        context_parts = []
        sources = set()
        for i, chunk in enumerate(all_chunks, 1):
            context_parts.append(f"[{i}] {chunk['title']}\n{chunk['content']}")
            if chunk.get("source"):
                sources.add(chunk["source"])
        context_text = "\n\n---\n\n".join(context_parts)
        sources_list = list(sources)    else:
        context_text = "Limited regulation data available."
        sources_list = []

    # Build the user message
    user_message = f"""Generate a detailed hunt plan with the following parameters:

HUNT DETAILS:
- Species: {species}
- Weapon/Method: {weapon}
- Planned Date: {hunt_date}
- County: {county or 'Not specified'}
- Specific Land: {land_name or 'Not specified — recommend locations'}
- State: Maryland

MARYLAND REGULATION DATA:
{context_text}

Please generate a complete hunt plan following the format in your instructions."""

    # Call Gemini
    try:
        model = get_gemini_model()
        full_prompt = f"{HUNT_PLAN_SYSTEM_PROMPT}\n\n---\n\n{user_message}"
        plan_text = await _call_gemini(model, full_prompt)
    except Exception as e:
        logger.error(f"Gemini API error in hunt plan generation: {e}")
        # Fallback: return a structured but simpler plan from chunks
        plan_text = _build_fallback_plan(species, weapon, hunt_date, county, all_chunks)        sources_list = []

    return {
        "plan": plan_text,
        "species": species,
        "weapon": weapon,
        "hunt_date": hunt_date,
        "county": county,
        "land_name": land_name,
        "sources": sources_list,
        "chunks_used": len(all_chunks),
    }


def _build_fallback_plan(
    species: str, weapon: str, hunt_date: str,
    county: Optional[str], chunks: list[dict],
) -> str:
    """Build a basic plan from raw chunks when Claude API is unavailable."""
    plan = f"# Hunt Plan: {species.title()} — {weapon.title()}\n\n"
    plan += f"**Date:** {hunt_date}\n"
    if county:
        plan += f"**County:** {county}\n"
    plan += "\n---\n\n"

    if chunks:
        plan += "## Regulation Information\n\n"
        for chunk in chunks[:6]:
            plan += f"### {chunk['title']}\n{chunk['content']}\n\n"    else:
        plan += "No specific regulation data found. Please check MD DNR at dnr.maryland.gov.\n\n"

    plan += "\n---\n\n"
    plan += "*This is a simplified plan generated without AI assistance. "
    plan += "Always verify all regulations with MD DNR before hunting.*\n"
    return plan


def _generate_follow_ups(query: str, chunks: list[dict]) -> list[str]:
    """Generate contextual follow-up suggestions based on the query and results."""
    q = query.lower()
    suggestions = []

    if "deer" in q or "buck" in q or "doe" in q:
        suggestions.extend([
            "What are the antler restrictions in my county?",
            "When is muzzleloader season?",
            "What's the bag limit for antlerless deer?",
        ])
    elif "turkey" in q:
        suggestions.extend([
            "What's the spring turkey bag limit?",
            "Can I use a rifle for turkey?",
            "Which WMAs are good for turkey?",
        ])
    elif "waterfowl" in q or "duck" in q or "goose" in q:
        suggestions.extend([
            "Do I need a federal duck stamp?",            "What's the daily bag limit for geese?",
            "When does waterfowl season open?",
        ])
    elif "sunday" in q:
        suggestions.extend([
            "Which counties allow Sunday hunting?",
            "Can I hunt on Sundays during archery season?",
            "Are there any public lands open Sundays?",
        ])
    else:
        suggestions.extend([
            "When is deer season in Maryland?",
            "What weapons are legal for hunting?",
            "Which public lands are near me?",
        ])

    return suggestions[:3]
