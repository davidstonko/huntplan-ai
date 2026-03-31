"""
AI Planner Service — RAG-powered hunting assistant

Retrieves relevant regulation chunks via full-text search,
then generates answers using Claude with retrieved context.
"""

import logging
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from anthropic import AsyncAnthropic

from app.config import settings

logger = logging.getLogger(__name__)

# Initialize Anthropic client
_client: Optional[AsyncAnthropic] = None


def get_anthropic_client() -> AsyncAnthropic:
    """Lazy-init Anthropic client."""
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


SYSTEM_PROMPT = """You are the MDHuntFishOutdoors AI assistant — an expert on Maryland hunting regulations, seasons, public lands, and outdoor recreation.

Your role:
- Answer hunting questions accurately using ONLY the regulation data provided below
- Cite specific sources when available (e.g., "MD DNR Hunter's Guide", "eRegulations Maryland")
- If the provided context doesn't contain enough info to fully answer, say so clearly
- Always end with a brief reminder to verify with MD DNR before hunting
- Be concise but thorough — hunters need actionable answers
- If asked about non-Maryland regulations, note that you currently only cover Maryland
- Use plain language, not legal jargon
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
        """
    ]
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
            "rank": float(row.rank),
        }
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

    Returns a structured response with answer text, sources, and suggestions.
    """
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
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

    # Current query with context
    user_message = f"""Based on the following Maryland hunting regulation data, please answer the user's question.

REGULATION DATA:
{context_text}

USER QUESTION: {query}"""

    messages.append({"role": "user", "content": user_message})

    # Step 4: Call Claude
    try:
        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.llm_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        answer_text = response.content[0].text

    except Exception as e:
        logger.error(f"Claude API error: {e}")
        # Graceful fallback: return the raw chunks as a formatted answer
        if chunks:
            answer_text = "I'm having trouble generating a response right now, but here's what I found:\n\n"
            for chunk in chunks[:3]:
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
            "Do I need a federal duck stamp?",
            "What's the daily bag limit for geese?",
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
