"""
External Data Integrations Router

Handles integration with external data sources: weather, sunrise/sunset,
and other third-party APIs for hunting conditions.
"""

from fastapi import APIRouter, HTTPException, Query

from app.modules.integrations.weather_service import get_forecast

router = APIRouter(
    prefix="/integrations",
    tags=["integrations"],
)


@router.get("/weather")
async def get_weather(
    latitude: float = Query(..., ge=24.0, le=50.0, description="Latitude (US range)"),
    longitude: float = Query(..., ge=-125.0, le=-66.0, description="Longitude (US range)"),
):
    """
    Get weather forecast and hunting conditions for a location.

    Uses the free NOAA Weather.gov API (no key required).
    Returns current conditions, 7-day forecast, and hunting-specific
    assessments (deer activity, wind/scent management, pressure trends).

    Example: /weather?latitude=39.5&longitude=-77.5
    """
    try:
        result = await get_forecast(latitude, longitude)
        return {
            "status": "ok",
            **result,
        }
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Weather service error: {str(e)}",
        )


@router.get("/sunrise-sunset")
async def get_sunrise_sunset(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    date: str = Query(default=None, description="Date (YYYY-MM-DD), defaults to today"),
):
    """
    Get sunrise/sunset and legal shooting hours for a location.

    Maryland legal shooting hours: 30 min before sunrise to 30 min after sunset
    (migratory birds: 30 min before sunrise to sunset).
    """
    import httpx
    from datetime import datetime, timedelta

    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.sunrise-sunset.org/json",
                params={
                    "lat": latitude,
                    "lng": longitude,
                    "date": date,
                    "formatted": 0,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", {})
        sunrise_str = results.get("sunrise")
        sunset_str = results.get("sunset")

        if sunrise_str and sunset_str:
            sunrise = datetime.fromisoformat(sunrise_str.replace("Z", "+00:00"))
            sunset = datetime.fromisoformat(sunset_str.replace("Z", "+00:00"))

            # Legal shooting hours (Maryland)
            legal_start = sunrise - timedelta(minutes=30)
            legal_end = sunset + timedelta(minutes=30)
            legal_end_migratory = sunset  # No +30 for migratory birds

            return {
                "status": "ok",
                "date": date,
                "sunrise": sunrise.isoformat(),
                "sunset": sunset.isoformat(),
                "civil_twilight_begin": results.get("civil_twilight_begin"),
                "civil_twilight_end": results.get("civil_twilight_end"),
                "day_length_hours": results.get("day_length", 0) / 3600 if results.get("day_length") else None,
                "legal_shooting_hours": {
                    "start": legal_start.isoformat(),
                    "end": legal_end.isoformat(),
                    "note": "Maryland: 30 min before sunrise to 30 min after sunset",
                },
                "migratory_bird_hours": {
                    "start": legal_start.isoformat(),
                    "end": legal_end_migratory.isoformat(),
                    "note": "Migratory birds: 30 min before sunrise to sunset (no +30 after)",
                },
            }
        else:
            raise ValueError("No sunrise/sunset data returned")

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Sunrise/sunset service error: {str(e)}",
        )
