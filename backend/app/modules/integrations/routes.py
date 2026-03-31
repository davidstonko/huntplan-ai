"""
External Data Integrations Router

Handles integration with external data sources: weather, forecasts, and other third-party APIs.
Currently stubbed for future expansion.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/integrations",
    tags=["integrations"],
)


@router.get("/weather")
async def get_weather(latitude: float, longitude: float, days: int = 7):
    """
    Get weather forecast for a hunting location.

    Args:
        latitude: Location latitude
        longitude: Location longitude
        days: Number of forecast days to return (default: 7)

    Returns:
        Stub response with not_implemented status
    """
    return {
        "status": "not_implemented",
        "module": "integrations",
        "endpoint": "/weather",
        "params": {
            "latitude": latitude,
            "longitude": longitude,
            "days": days,
        },
    }
