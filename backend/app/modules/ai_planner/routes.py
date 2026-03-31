"""
AI Planning Engine Router

Handles AI-powered hunting plan queries, recommendations, and intelligent trip planning.
Leverages RAG with regulations, land data, and historical hunt patterns.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(
    prefix="/ai",
    tags=["ai_planner"],
)


class QueryRequest(BaseModel):
    """Request model for AI planning queries"""
    query: str
    location: dict = None
    filters: dict = None


@router.post("/query")
async def query_ai_planner(request: QueryRequest):
    """
    Submit a natural language query to the AI planning engine.

    Args:
        request: Query request containing user's hunting question/intent

    Returns:
        Stub response with not_implemented status
    """
    return {
        "status": "not_implemented",
        "module": "ai_planner",
        "endpoint": "/query",
        "query": request.query,
    }
