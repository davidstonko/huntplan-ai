"""
External Data Integrations Router

Handles integration with external data sources: weather, sunrise/sunset, solunar,
and other third-party APIs for hunting conditions.
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta

from app.modules.integrations.weather_service import get_forecast
from app.modules.integrations.solunar_service import calculate_solunar_periods

router = APIRouter()


@router.get("/weather")
async def get_weather(
    latitude: float = Query(..., ge=24.0, le=50.0, description="Latitude (US range)"),
    longitude: float = Query(..., ge=-125.0, le=-66.0, description="Longitude (US range)"),
    lat: float = Query(None, description="Alternative param name for latitude"),
    lon: float = Query(None, description="Alternative param name for longitude"),
):
    """
    Get weather forecast and hunting conditions for a location.

    Uses the free NOAA Weather.gov API (no key required).
    Returns current conditions, 7-day forecast, and hunting-specific
    assessments (deer activity, wind/scent management, pressure trends).

    Example: /weather?latitude=39.5&longitude=-77.5
    or: /weather?lat=39.5&lon=-77.5
    """
    # Accept both parameter names
    query_lat = lat if lat is not None else latitude
    query_lon = lon if lon is not None else longitude
    
    try:
        result = await get_forecast(query_lat, query_lon)
        return {
            "status": "ok",
            **result,
        }
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Weather service error: {str(e)}",
        )


@router.get("/solunar")
async def get_solunar(
    latitude: float = Query(None, description="Latitude"),
    longitude: float = Query(None, description="Longitude"),
    lat: float = Query(None, description="Alternative param name for latitude"),
    lon: float = Query(None, description="Alternative param name for longitude"),
    lng: float = Query(None, description="Alternative param name for longitude"),
    date: str = Query(None, description="Date (YYYY-MM-DD), defaults to today"),
):
    """
    Get solunar times for optimal hunting conditions.
    
    Solunar tables show peak activity times based on moon phase and position.
    Highly accurate for predicting deer and fish activity.
    
    Example: /solunar?lat=39.045&lng=-76.641&date=2026-04-01
    """
    # Accept multiple parameter name variations
    query_lat = lat if lat is not None else (latitude if latitude is not None else None)
    query_lon = lng if lng is not None else (lon if lon is not None else longitude)
    
    if query_lat is None or query_lon is None:
        raise HTTPException(
            status_code=400,
            detail="latitude/lat and longitude/lon/lng parameters are required"
        )
    
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        from datetime import date as date_type
        query_date = datetime.strptime(date, "%Y-%m-%d").date() if isinstance(date, str) else date
        result = calculate_solunar_periods(query_date, query_lat, query_lon)
        return {
            "status": "ok",
            **result,
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Solunar service error: {str(e)}",
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
