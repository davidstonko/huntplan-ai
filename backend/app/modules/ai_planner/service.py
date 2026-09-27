"""
AI Planner Service — RAG-powered hunting assistant

Retrieves relevant regulation chunks via full-text search,
then generates answers using LLM with retrieved context.

Supports Anthropic Claude (primary, if ANTHROPIC_API_KEY set), Google Gemini (fallback),
and template-based responses (final fallback).
"""

import logging
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)

# ─── LLM Client Setup ────────────────────────────────────────────

_anthropic_client = None
_gemini_model = None


def get_anthropic_client():
    """Lazy-init Anthropic Claude client."""
    global _anthropic_client
    if _anthropic_client is None:
        if not settings.anthropic_api_key:
            return None
        from anthropic import Anthropic
        _anthropic_client = Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


def get_gemini_model():
    """Lazy-init Google Gemini client.

    Uses google-genai, the current SDK. The previous google-generativeai
    package is formally deprecated (its own PyPI page is titled
    "[Deprecated] Google AI Python SDK"), was last released in December 2025,
    and does not reach the Gemini 3.x models. Returns a client rather than a
    model object; the model name is passed per call instead of bound at
    construction, so llm_model can change by environment variable.
    """
    global _gemini_model
    if _gemini_model is None:
        if not settings.gemini_api_key:
            return None
        from google import genai
        _gemini_model = genai.Client(api_key=settings.gemini_api_key)
    return _gemini_model


async def _call_claude(client, system_prompt: str, user_message: str) -> str:
    """
    Call Claude API. Since httpx is async-first but Anthropic SDK is sync,
    run it in a thread to avoid blocking the async event loop.
    """
    import asyncio

    def _sync_call():
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=2048,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        if not response.content:
            raise ValueError("Empty response from Claude API")
        return response.content[0].text

    return await asyncio.get_event_loop().run_in_executor(None, _sync_call)


async def _call_gemini(client, prompt: str) -> str:
    """
    Call Gemini API. google-genai's generate_content is synchronous, so we run
    it in a thread to avoid blocking the async event loop.
    """
    import asyncio

    def _sync_call():
        response = client.models.generate_content(
            model=settings.llm_model,
            contents=prompt,
        )
        text = response.text
        if not text:
            # A blocked or empty candidate returns None rather than raising,
            # which would otherwise surface as a blank answer in the app.
            raise ValueError("Empty response from Gemini API")
        return text

    return await asyncio.get_event_loop().run_in_executor(None, _sync_call)


# Species a hunter can name in a question, mapped to the value stored in
# regulation_chunks.species. Keys are matched as whole words, longest first,
# so "white-tailed deer" wins over "deer" and "snow goose" over "goose".
_SPECIES_ALIASES = {
    "white-tailed deer": "White-tailed Deer",
    "whitetail": "White-tailed Deer",
    "deer": "White-tailed Deer",
    "doe": "White-tailed Deer",
    "buck": "White-tailed Deer",
    "antlerless": "White-tailed Deer",
    "antlered": "White-tailed Deer",
    "turkey": "Wild Turkey",
    "gobbler": "Wild Turkey",
    "black bear": "Black Bear",
    "bear": "Black Bear",
    "squirrel": "Squirrel",
    "rabbit": "Rabbit",
    "cottontail": "Rabbit",
    "pheasant": "Pheasant",
    "grouse": "Ruffed Grouse",
    "quail": "Bobwhite Quail",
    "bobwhite": "Bobwhite Quail",
    "dove": "Mourning Dove",
    "woodcock": "Woodcock",
    "goose": "Waterfowl",
    "geese": "Waterfowl",
    "duck": "Waterfowl",
    "ducks": "Waterfowl",
    "teal": "Waterfowl",
    "waterfowl": "Waterfowl",
}


def _species_in_query(query: str) -> Optional[str]:
    """The species a question is about, or None."""
    import re

    q = query.lower()
    for alias in sorted(_SPECIES_ALIASES, key=len, reverse=True):
        if re.search(rf"\b{re.escape(alias)}\b", q):
            return _SPECIES_ALIASES[alias]
    return None


async def _ensure_species_coverage(
    db: AsyncSession,
    query: str,
    state: str,
    chunks: list[dict],
    species_filter: Optional[str],
) -> list[dict]:
    """Guarantee the named species' season and bag-limit rows are present.

    Relevance ranking alone is not enough here. Asked "Can I hunt deer with a
    bow in Frederick County today?", the ranker returned Frederick County
    Hunting Rules, then WMAs in other counties — all plausibly relevant, none
    stating a deer season date. The model then correctly reported that it had
    no deer season information, which is a useless answer to the single most
    common question this app gets.

    Season dates and bag limits are the facts a hunting question almost always
    turns on, so when the query names a species we fetch those rows directly
    rather than hoping they rank. Appended, not prepended: whatever the ranker
    judged most relevant stays first.
    """
    if species_filter:
        return chunks

    species = _species_in_query(query)
    if not species:
        return chunks

    have = {c["id"] for c in chunks}
    have_categories = {c.get("category") for c in chunks if c.get("species") == species}

    added: list[dict] = []
    for category, limit in (("season", 4), ("bag_limit", 2)):
        if category in have_categories:
            continue
        # Rank within the species/category slice by the same OR query the
        # main search uses, so "deer with a bow" surfaces the archery
        # segments rather than whatever sorts first alphabetically. Falls
        # back to chronological order when the question has no usable terms.
        terms = _query_terms(query)
        params = {
            "state": state,
            "category": category,
            "species": f"%{species}%",
            "limit": limit,
        }
        if terms:
            params["orq"] = " | ".join(terms)
            rank_expr = "ts_rank(search_vector, to_tsquery('english', :orq))"
            order_by = f"{rank_expr} DESC, title"
        else:
            rank_expr = "0.5"
            order_by = "title"
        sql = text(
            f"""
            SELECT id, title, content, category, species, county, source, extra_data,
                   GREATEST({rank_expr}, 0.5) AS rank
            FROM regulation_chunks
            WHERE state = :state AND category = :category AND species ILIKE :species
            ORDER BY {order_by}
            LIMIT :limit
            """
        )
        result = await db.execute(sql, params)
        for row in result.fetchall():
            if row.id in have:
                continue
            have.add(row.id)
            added.append(
                {
                    "id": row.id,
                    "title": row.title,
                    "content": row.content,
                    "category": row.category,
                    "species": row.species,
                    "county": row.county,
                    "source": row.source,
                    "extra_data": row.extra_data if hasattr(row, "extra_data") else None,
                    "rank": float(row.rank),
                }
            )

    return chunks + added


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

    if not rows:
        # plainto_tsquery ANDs every lexeme, so a natural-sounding question
        # ("Can I hunt deer with a bow in Frederick County today?") demands
        # deer AND bow AND frederick AND today in ONE chunk, which nothing
        # satisfies. Before this tier existed the miss fell through to an
        # unordered ILIKE scan and the planner answered a deer question with
        # squirrel and grouse seasons. Retry as OR, ranked, so the chunk
        # matching the most terms wins.
        rows = await _or_search(db, query, state, category, species, limit)

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


# Words that carry no signal in a hunting question. Dropping them keeps the
# OR tier from ranking on "can", "the" or "today".
_NOISE_WORDS = frozenset("""
a an and are as at be by can could do does for from had has have how i if in
is it its may me my of on or should that the their there they this to too was
what when where which who will with would you your today now
""".split())


def _query_terms(query: str) -> list[str]:
    """Alphanumeric, meaningful terms from a natural-language question.

    Sanitized to [a-z0-9] so the result is safe to hand to to_tsquery as a
    bound parameter — tsquery has its own operator syntax and a stray '&',
    '!' or ':' would be parsed rather than searched.
    """
    import re

    terms = []
    for raw in re.split(r"[^A-Za-z0-9]+", query.lower()):
        if len(raw) > 1 and raw not in _NOISE_WORDS and raw not in terms:
            terms.append(raw)
    return terms


async def _or_search(
    db: AsyncSession,
    query: str,
    state: str,
    category: Optional[str],
    species: Optional[str],
    limit: int,
):
    """Ranked OR search, used when the strict AND search matches nothing."""
    terms = _query_terms(query)
    if not terms:
        return []

    or_query = " | ".join(terms)
    sql_parts = [
        """
        SELECT id, title, content, category, species, county, source, extra_data,
               ts_rank(search_vector, to_tsquery('english', :orq)) AS rank
        FROM regulation_chunks
        WHERE search_vector @@ to_tsquery('english', :orq)
          AND state = :state
        """
    ]
    params = {"orq": or_query, "state": state, "limit": limit}
    if category:
        sql_parts.append("AND category = :category")
        params["category"] = category
    if species:
        sql_parts.append("AND species ILIKE :species")
        params["species"] = f"%{species}%"
    sql_parts.append("ORDER BY rank DESC LIMIT :limit")

    result = await db.execute(text("\n".join(sql_parts)), params)
    return result.fetchall()


async def fallback_search(
    db: AsyncSession,
    query: str,
    state: str = "MD",
    limit: int = 8,
) -> list[dict]:
    """
    Fallback: ILIKE search when full-text search returns no results.

    Ranked by how many of the query's terms a chunk actually contains. This
    had no ORDER BY at all, so Postgres returned whatever rows it reached
    first — which is how a question about deer archery came back answered
    with squirrel and grouse seasons once the chunk set changed.
    """
    words = _query_terms(query) or query.lower().split()
    conditions = " OR ".join([f"LOWER(title || ' ' || content) LIKE :w{i}" for i in range(len(words))])
    # One point per matched term, so the most relevant chunk sorts first.
    score = " + ".join(
        [f"(CASE WHEN LOWER(title || ' ' || content) LIKE :w{i} THEN 1 ELSE 0 END)"
         for i in range(len(words))]
    )
    params = {f"w{i}": f"%{w}%" for i, w in enumerate(words)}
    params["state"] = state
    params["limit"] = limit

    sql = text(f"""
        SELECT id, title, content, category, species, county, source, extra_data,
               ({score})::float / {len(words)} AS rank
        FROM regulation_chunks
        WHERE state = :state AND ({conditions})
        ORDER BY rank DESC
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


RETRIEVAL_UNAVAILABLE_NOTE = (
    "Note: regulation retrieval was unavailable (database offline), so this "
    "answer was generated from general knowledge only. Verify with MD DNR "
    "at dnr.maryland.gov before hunting."
)


def _llm_configured() -> bool:
    return bool(settings.anthropic_api_key or settings.gemini_api_key)


async def generate_ai_response(
    db: Optional[AsyncSession],
    query: str,
    state: str = "MD",
    category: Optional[str] = None,
    species: Optional[str] = None,
    conversation_history: Optional[list[dict]] = None,
) -> dict:
    """
    Full RAG pipeline: search → retrieve → generate.

    Tries Claude first (if ANTHROPIC_API_KEY set), falls back to Gemini,
    then falls back to template-based response.

    Degraded mode (2026-09): ``db`` may be ``None`` (see get_db_optional) or
    the search may raise if Postgres is unreachable. In that case we skip
    retrieval, answer from the LLM alone, and prepend an explicit note.
    With no LLM configured either, raise ValueError -> route returns 503.
    """
    chunks: list[dict] = []
    retrieval_unavailable = db is None
    if db is not None:
        try:
            chunks = await search_regulation_chunks(db, query, state, category, species)
            if not chunks:
                chunks = await fallback_search(db, query, state)
            chunks = await _ensure_species_coverage(db, query, state, chunks, species)
        except Exception as e:  # connection refused / table missing / etc.
            logger.warning("Regulation retrieval failed, degrading to LLM-only: %s", e)
            retrieval_unavailable = True
            chunks = []

    if retrieval_unavailable and not _llm_configured():
        raise ValueError(
            "Database unavailable and no LLM API key configured — "
            "cannot answer regulation queries right now."
        )

    if chunks:
        context_parts = []
        sources = set()
        for i, chunk in enumerate(chunks, 1):
            context_parts.append(f"[{i}] {chunk['title']}\n{chunk['content']}")
            if chunk.get("source"):
                sources.add(chunk["source"])
        context_text = "\n\n---\n\n".join(context_parts)
        sources_list = list(sources)
    elif retrieval_unavailable:
        context_text = (
            "REGULATION DATABASE UNAVAILABLE. Answer from general knowledge of "
            "Maryland hunting regulations, clearly flag uncertainty, and tell "
            "the user to verify with MD DNR."
        )
        sources_list = []
    else:
        context_text = "No specific regulation data found for this query."
        sources_list = []

    user_message = f"""Based on the following Maryland hunting regulation data, please answer the user's question.

REGULATION DATA:
{context_text}

USER QUESTION: {query}"""

    answer_text = None
    api_error = None

    # Try Claude first
    try:
        claude_client = get_anthropic_client()
        if claude_client:
            logger.info("Attempting Claude API")
            answer_text = await _call_claude(claude_client, SYSTEM_PROMPT, user_message)
            logger.info("Claude API succeeded")
    except Exception as e:
        api_error = f"Claude API error: {e}"
        logger.warning(api_error)

    # Fall back to Gemini if Claude failed or not configured
    if answer_text is None:
        try:
            model = get_gemini_model()
            if model:
                logger.info("Attempting Gemini API (Claude not available or failed)")
                full_prompt = f"{SYSTEM_PROMPT}\n\n---\n\n{user_message}"
                answer_text = await _call_gemini(model, full_prompt)
                logger.info("Gemini API succeeded")
        except Exception as e:
            api_error = f"Gemini API error: {e}"
            logger.warning(api_error)

    # Fall back to template if both APIs failed
    if answer_text is None:
        logger.error(f"All LLM APIs failed. {api_error}")
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

    if retrieval_unavailable:
        # Same response schema; the note lives inside `answer`.
        answer_text = f"{RETRIEVAL_UNAVAILABLE_NOTE}\n\n{answer_text}"

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
3. **Recommended Locations** — Suggest 2-3 specific public lands/WMAs near the requested area, with brief notes on why each is good.
4. **Timing** — Legal shooting hours for the date, plus recommended arrival time (usually 45-60 min before shooting light).
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

    Tries Claude first (if ANTHROPIC_API_KEY set), falls back to Gemini,
    then falls back to template-based plan.
    """
    search_terms = f"{species} {weapon} season {county or ''} {land_name or ''} hunting Maryland"

    season_chunks = await search_regulation_chunks(db, f"{species} season {weapon}", state, category="season", species=species, limit=4)
    land_chunks = await search_regulation_chunks(db, f"{land_name or county or 'public land'} hunting", state, category="land", limit=4)
    bag_chunks = await search_regulation_chunks(db, f"{species} bag limit", state, category="bag_limit", species=species, limit=3)
    county_chunks = await search_regulation_chunks(db, f"{county or 'Maryland'} county hunting rules", state, category="county", limit=3)
    general_chunks = await search_regulation_chunks(db, f"hunting safety {weapon} regulations", state, category="general", limit=2)

    all_chunks = []
    seen_ids = set()
    for chunk in season_chunks + land_chunks + bag_chunks + county_chunks + general_chunks:
        if chunk["id"] not in seen_ids:
            all_chunks.append(chunk)
            seen_ids.add(chunk["id"])

    if not all_chunks:
        all_chunks = await fallback_search(db, search_terms, state, limit=10)

    if all_chunks:
        context_parts = []
        sources = set()
        for i, chunk in enumerate(all_chunks, 1):
            context_parts.append(f"[{i}] {chunk['title']}\n{chunk['content']}")
            if chunk.get("source"):
                sources.add(chunk["source"])
        context_text = "\n\n---\n\n".join(context_parts)
        sources_list = list(sources)
    else:
        context_text = "Limited regulation data available."
        sources_list = []

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

    plan_text = None
    api_error = None

    # Try Claude first
    try:
        claude_client = get_anthropic_client()
        if claude_client:
            logger.info("Attempting Claude API for hunt plan generation")
            plan_text = await _call_claude(claude_client, HUNT_PLAN_SYSTEM_PROMPT, user_message)
            logger.info("Claude API succeeded for hunt plan")
    except Exception as e:
        api_error = f"Claude API error: {e}"
        logger.warning(api_error)

    # Fall back to Gemini if Claude failed or not configured
    if plan_text is None:
        try:
            model = get_gemini_model()
            if model:
                logger.info("Attempting Gemini API for hunt plan (Claude not available or failed)")
                full_prompt = f"{HUNT_PLAN_SYSTEM_PROMPT}\n\n---\n\n{user_message}"
                plan_text = await _call_gemini(model, full_prompt)
                logger.info("Gemini API succeeded for hunt plan")
        except Exception as e:
            api_error = f"Gemini API error: {e}"
            logger.warning(api_error)

    # Fall back to template if both APIs failed
    if plan_text is None:
        logger.error(f"All LLM APIs failed for hunt plan. {api_error}")
        plan_text = _build_fallback_plan(species, weapon, hunt_date, county, all_chunks)
        sources_list = []

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
    """Build a basic plan from raw chunks when API is unavailable."""
    plan = f"# Hunt Plan: {species.title()} — {weapon.title()}\n\n"
    plan += f"**Date:** {hunt_date}\n"
    if county:
        plan += f"**County:** {county}\n"
    plan += "\n---\n\n"

    if chunks:
        plan += "## Regulation Information\n\n"
        for chunk in chunks[:6]:
            plan += f"### {chunk['title']}\n{chunk['content']}\n\n"
    else:
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
