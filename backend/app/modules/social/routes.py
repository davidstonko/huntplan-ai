"""
Anonymous Social Network Router

Handles anonymous social features: hunt reports, field observations, tips, and community discussions.
No real names required - users identified by anonymous IDs.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/social",
    tags=["social"],
)


@router.get("/feed")
async def get_social_feed(limit: int = 20, offset: int = 0):
    """
    Get anonymous social feed of recent hunt reports and observations.

    Args:
        limit: Maximum number of feed items to return (default: 20)
        offset: Pagination offset (default: 0)

    Returns:
        Stub response with not_implemented status
    """
    return {
        "status": "not_implemented",
        "module": "social",
        "endpoint": "/feed",
        "params": {
            "limit": limit,
            "offset": offset,
        },
    }
