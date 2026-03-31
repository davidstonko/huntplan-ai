"""
Weather Service — NOAA Weather.gov API integration

Free, no API key required. Provides forecasts, wind, temperature,
and hunting-relevant conditions for any US location.

Flow: lat/lng → Weather.gov /points → get forecast URL → fetch forecast
"""

import httpx
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Weather.gov requires a User-Agent identifying the application
HEADERS = {
    "User-Agent": "(MDHuntFishOutdoors, dstonko1@gmail.com)",
    "Accept": "application/geo+json",
}

BASE_URL = "https://api.weather.gov"


async def get_forecast(lat: float, lng: float) -> dict:
    """
    Get 7-day forecast for a location.

    Weather.gov API flow:
    1. GET /points/{lat},{lng} → returns forecast URLs
    2. GET the forecastUrl → returns detailed 7-day forecast
    """
    async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
        # Step 1: Get the grid point and forecast URL
        points_url = f"{BASE_URL}/points/{lat:.4f},{lng:.4f}"
        points_resp = await client.get(points_url)
        points_resp.raise_for_status()
        points_data = points_resp.json()

        properties = points_data.get("properties", {})
        forecast_url = properties.get("forecast")
        forecast_hourly_url = properties.get("forecastHourly")
        station_url = properties.get("observationStations")

        if not forecast_url:
            raise ValueError("No forecast URL returned for this location")

        # Step 2: Get the 7-day forecast
        forecast_resp = await client.get(forecast_url)
        forecast_resp.raise_for_status()
        forecast_data = forecast_resp.json()

        periods = forecast_data.get("properties", {}).get("periods", [])

        # Step 3: Get current conditions from nearest station
        current_conditions = None
        if station_url:
            try:
                current_conditions = await _get_current_conditions(client, station_url)
            except Exception as e:
                logger.warning(f"Failed to get current conditions: {e}")

        # Step 4: Parse and format for hunters
        forecast_periods = []
        for period in periods[:14]:  # 7 days (day + night)
            forecast_periods.append({
                "name": period.get("name"),
                "start_time": period.get("startTime"),
                "end_time": period.get("endTime"),
                "is_daytime": period.get("isDaytime"),
                "temperature": period.get("temperature"),
                "temperature_unit": period.get("temperatureUnit"),
                "wind_speed": period.get("windSpeed"),
                "wind_direction": period.get("windDirection"),
                "short_forecast": period.get("shortForecast"),
                "detailed_forecast": period.get("detailedForecast"),
                "precipitation_probability": period.get("probabilityOfPrecipitation", {}).get("value"),
                "humidity": period.get("relativeHumidity", {}).get("value"),
            })

        # Step 5: Calculate hunting-relevant data
        hunting_data = _calculate_hunting_conditions(forecast_periods, current_conditions)

        return {
            "location": {
                "latitude": lat,
                "longitude": lng,
                "city": properties.get("relativeLocation", {}).get("properties", {}).get("city"),
                "state": properties.get("relativeLocation", {}).get("properties", {}).get("state"),
                "county": properties.get("county", "").split("/")[-1] if properties.get("county") else None,
            },
            "current": current_conditions,
            "forecast": forecast_periods,
            "hunting_conditions": hunting_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }


async def _get_current_conditions(client: httpx.AsyncClient, station_url: str) -> Optional[dict]:
    """Get current weather from the nearest observation station."""
    # Get nearest station
    stations_resp = await client.get(station_url)
    stations_resp.raise_for_status()
    stations = stations_resp.json().get("features", [])

    if not stations:
        return None

    station_id = stations[0]["properties"]["stationIdentifier"]

    # Get latest observation
    obs_url = f"{BASE_URL}/stations/{station_id}/observations/latest"
    obs_resp = await client.get(obs_url)
    obs_resp.raise_for_status()
    obs = obs_resp.json().get("properties", {})

    def safe_value(field):
        """Extract value from Weather.gov measurement object."""
        if isinstance(field, dict):
            return field.get("value")
        return field

    temp_c = safe_value(obs.get("temperature"))
    temp_f = round(temp_c * 9 / 5 + 32, 1) if temp_c is not None else None

    wind_ms = safe_value(obs.get("windSpeed"))
    wind_mph = round(wind_ms * 2.237, 1) if wind_ms is not None else None

    gust_ms = safe_value(obs.get("windGust"))
    gust_mph = round(gust_ms * 2.237, 1) if gust_ms is not None else None

    return {
        "temperature_f": temp_f,
        "humidity": safe_value(obs.get("relativeHumidity")),
        "wind_speed_mph": wind_mph,
        "wind_gust_mph": gust_mph,
        "wind_direction_degrees": safe_value(obs.get("windDirection")),
        "wind_direction": _degrees_to_cardinal(safe_value(obs.get("windDirection"))),
        "barometric_pressure_mb": round(safe_value(obs.get("barometricPressure", {})) / 100, 1) if safe_value(obs.get("barometricPressure")) else None,
        "visibility_miles": round(safe_value(obs.get("visibility", {})) / 1609.34, 1) if safe_value(obs.get("visibility")) else None,
        "description": obs.get("textDescription"),
        "observed_at": obs.get("timestamp"),
    }


def _degrees_to_cardinal(degrees: Optional[float]) -> Optional[str]:
    """Convert wind direction degrees to cardinal direction."""
    if degrees is None:
        return None
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = round(degrees / 22.5) % 16
    return dirs[idx]


def _calculate_hunting_conditions(periods: list[dict], current: Optional[dict]) -> dict:
    """
    Calculate hunting-relevant conditions.

    Hunters care about: wind speed/direction (scent management),
    temperature (deer movement), barometric pressure (animal activity),
    precipitation (visibility, tracking), and moon phase.
    """
    conditions = {}

    # Today's hunting assessment
    today = periods[0] if periods else None
    if today:
        temp = today.get("temperature")
        wind = today.get("wind_speed", "")

        # Parse wind speed (e.g., "5 to 10 mph" → take max)
        wind_mph = 0
        if wind:
            import re
            nums = re.findall(r'\d+', str(wind))
            if nums:
                wind_mph = max(int(n) for n in nums)

        # Deer activity assessment
        if temp is not None:
            if 30 <= temp <= 50:
                conditions["deer_activity"] = "High — ideal cold-weather movement"
            elif 50 < temp <= 65:
                conditions["deer_activity"] = "Moderate — comfortable temperatures"
            elif temp > 65:
                conditions["deer_activity"] = "Low — warm temperatures reduce daytime movement"
            else:
                conditions["deer_activity"] = "Moderate — very cold, deer may bed early"

        # Wind assessment for scent management
        if wind_mph <= 5:
            conditions["wind_assessment"] = "Calm — scent will hang, thermals dominate. Play thermals carefully."
        elif wind_mph <= 12:
            conditions["wind_assessment"] = "Light — good hunting wind. Plan stand placement downwind of approach trails."
        elif wind_mph <= 20:
            conditions["wind_assessment"] = "Moderate — deer may bed in sheltered areas. Good for scent dispersal."
        else:
            conditions["wind_assessment"] = "Strong — deer movement will be reduced. Consider hunting sheltered hollows."

        # Overall hunting rating
        precip = today.get("precipitation_probability") or 0
        rating = "Good"
        if wind_mph > 20:
            rating = "Fair"
        if precip > 60:
            rating = "Fair" if rating == "Good" else "Poor"
        if temp and 30 <= temp <= 55 and wind_mph <= 15 and precip < 30:
            rating = "Excellent"
        conditions["overall_rating"] = rating
        conditions["short_summary"] = today.get("short_forecast", "")

    # Barometric pressure trend (if current conditions available)
    if current and current.get("barometric_pressure_mb"):
        pressure = current["barometric_pressure_mb"]
        if pressure > 1020:
            conditions["pressure_trend"] = "High pressure — stable conditions, good deer movement"
        elif pressure > 1010:
            conditions["pressure_trend"] = "Normal pressure — typical activity levels"
        else:
            conditions["pressure_trend"] = "Low/falling pressure — storm approaching, deer may feed heavily before front"

    return conditions
