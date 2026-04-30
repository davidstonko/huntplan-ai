"""
External Data Integrations Router

Handles integration with external data sources: weather, sunrise/sunset,
and other third-party APIs for hunting conditions.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel

from app.modules.integrations.weather_service import get_forecast
from app.modules.integrations.solunar_service import (
    calculate_solunar_periods,
    get_moon_phase,
    get_weekly_solunar,
)

router = APIRouter(
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


@router.get("/solunar")
async def get_solunar(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    date: str = Query(default=None, description="Date (YYYY-MM-DD), defaults to today"),
):
    """
    Get solunar hunting activity forecast for a location and date.

    Returns major/minor solunar periods, moon phase, best hunting windows,
    and an overall deer activity rating (0-100).

    Based on John Alden Knight's solunar theory:
    - Major periods (~2hr): Moon overhead or underfoot
    - Minor periods (~1hr): Moonrise and moonset
    - Combined with dawn/dusk crepuscular feeding patterns

    Example: /solunar?latitude=39.5&longitude=-77.5&date=2025-10-15
    """
    from datetime import date as date_type, datetime

    if not date:
        target_date = datetime.now().date()
    else:
        target_date = date_type.fromisoformat(date)

    try:
        result = calculate_solunar_periods(target_date, latitude, longitude)
        return {"status": "ok", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solunar calculation error: {str(e)}")


@router.get("/solunar/week")
async def get_solunar_week(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    start_date: str = Query(default=None, description="Start date (YYYY-MM-DD), defaults to today"),
    days: int = Query(default=7, ge=1, le=14, description="Number of days (1-14)"),
):
    """
    Get a multi-day solunar forecast for picking the best day to hunt.

    Returns a rating for each day so hunters can compare and choose
    the optimal day of the week.

    Example: /solunar/week?latitude=39.5&longitude=-77.5&days=7
    """
    from datetime import date as date_type, datetime

    if not start_date:
        dt = datetime.now().date()
    else:
        dt = date_type.fromisoformat(start_date)

    try:
        results = get_weekly_solunar(dt, latitude, longitude, days)
        return {
            "status": "ok",
            "start_date": dt.isoformat(),
            "days": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solunar weekly error: {str(e)}")


@router.get("/moon")
async def get_moon(
    date: str = Query(default=None, description="Date (YYYY-MM-DD), defaults to today"),
):
    """
    Get current moon phase info.

    Returns phase name, illumination percentage, and phase angle.
    Useful for planning hunts around full/new moons.
    """
    from datetime import date as date_type, datetime

    if not date:
        target = datetime.now().date()
    else:
        target = date_type.fromisoformat(date)

    return {"status": "ok", **get_moon_phase(target)}


# ─────────────────────────────────────────────────────────────────────────────
# V2.2.0 safety-overlay endpoints (2026-04-17)
# Added for the unified WeatherScreen on the mobile client. Each endpoint
# degrades to null-heavy payloads plus a human-readable advisory so the UI
# can always render something safe rather than crash.
# ─────────────────────────────────────────────────────────────────────────────


_NWS_USER_AGENT = "MDHuntFishOutdoors/2.2 (dstonko1@gmail.com)"


@router.get("/alerts")
async def get_active_alerts(
    latitude: float = Query(..., ge=24.0, le=50.0, description="Latitude (US range)"),
    longitude: float = Query(..., ge=-125.0, le=-66.0, description="Longitude (US range)"),
):
    """
    Backend proxy for NWS active alerts at a point.

    The mobile client can call weather.gov directly, but this proxy:
      - Attaches a stable User-Agent (required by NWS)
      - Caches future-ready for high-traffic days (stub today)
      - Normalises the payload shape so the client never has to inspect
        the full GeoJSON feature collection.
    """
    import httpx
    from datetime import datetime

    url = "https://api.weather.gov/alerts/active"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                url,
                params={"point": f"{latitude},{longitude}"},
                headers={"User-Agent": _NWS_USER_AGENT, "Accept": "application/geo+json"},
            )
            resp.raise_for_status()
            data = resp.json()

        features = data.get("features", []) or []
        alerts = []
        for f in features:
            p = f.get("properties", {}) or {}
            alerts.append(
                {
                    "id": p.get("id") or f.get("id") or "",
                    "event": p.get("event") or "Weather Alert",
                    "severity": p.get("severity") or "Unknown",
                    "urgency": p.get("urgency") or "Unknown",
                    "headline": p.get("headline") or "",
                    "description": p.get("description") or "",
                    "effective": p.get("effective") or "",
                    "expires": p.get("expires") or "",
                    "area_desc": p.get("areaDesc") or "",
                }
            )
        return {
            "status": "ok",
            "count": len(alerts),
            "alerts": alerts,
            "as_of": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        # Degrade gracefully — NWS outage should not break the client.
        return {
            "status": "degraded",
            "count": 0,
            "alerts": [],
            "advisory": f"NWS alerts unavailable: {str(e)[:120]}",
            "as_of": datetime.utcnow().isoformat() + "Z",
        }


@router.get("/lightning")
async def get_lightning_status(
    latitude: float = Query(..., ge=24.0, le=50.0, description="Latitude (US range)"),
    longitude: float = Query(..., ge=-125.0, le=-66.0, description="Longitude (US range)"),
):
    """
    Synthesised convective/lightning status for a point.

    Combines the NWS forecast grid for the point ("thunder" in shortForecast
    or probabilityOfThunderstorms) with a simple risk classifier. Because
    MDHuntFishOutdoors does not subscribe to Vaisala or Earth Networks, the
    "nearby strikes" counters are intentionally null — the UI should surface
    the advisory string and direct users to weather.gov for ground truth.

    Response shape matches WeatherService.getLightningStatus() expectations.
    """
    import httpx
    from datetime import datetime

    fallback = {
        "status": "degraded",
        "nearby_strikes_last_15min": None,
        "distance_nearest_miles": None,
        "convective_risk": "none",
        "advisory": "Lightning data unavailable. Monitor local skies and weather.gov alerts.",
        "as_of": datetime.utcnow().isoformat() + "Z",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Step 1: resolve grid points.
            pts = await client.get(
                f"https://api.weather.gov/points/{latitude:.4f},{longitude:.4f}",
                headers={"User-Agent": _NWS_USER_AGENT, "Accept": "application/geo+json"},
            )
            pts.raise_for_status()
            props = pts.json().get("properties", {}) or {}
            forecast_url = props.get("forecast")
            if not forecast_url:
                return fallback

            # Step 2: fetch forecast periods and classify.
            fc = await client.get(
                forecast_url,
                headers={"User-Agent": _NWS_USER_AGENT, "Accept": "application/geo+json"},
            )
            fc.raise_for_status()
            periods = (fc.json().get("properties", {}) or {}).get("periods", []) or []

        # Look at the next two periods (today/tonight) for thunder keywords.
        upcoming = periods[:2]
        text_blob = " ".join(
            (p.get("shortForecast", "") + " " + p.get("detailedForecast", "")).lower()
            for p in upcoming
        )

        risk = "none"
        advisory = "No thunderstorm activity in near-term forecast."
        if "severe" in text_blob and ("thunderstorm" in text_blob or "lightning" in text_blob):
            risk = "high"
            advisory = "Severe thunderstorms expected. Seek shelter, do not take up elevated stands."
        elif "thunderstorm" in text_blob or "lightning" in text_blob:
            risk = "moderate"
            advisory = "Thunderstorms possible. Monitor skies and be ready to descend any stand."
        elif "showers" in text_blob and "chance" in text_blob:
            risk = "low"
            advisory = "Isolated convection possible — keep an eye on towering cumulus."

        return {
            "status": "ok",
            "nearby_strikes_last_15min": None,  # no real-time strike feed today
            "distance_nearest_miles": None,
            "convective_risk": risk,
            "advisory": advisory,
            "as_of": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        fallback["advisory"] = f"Lightning service error: {str(e)[:120]}"
        return fallback


@router.get("/marine")
async def get_marine_conditions(
    latitude: float = Query(..., ge=24.0, le=50.0, description="Latitude (US range)"),
    longitude: float = Query(..., ge=-125.0, le=-66.0, description="Longitude (US range)"),
):
    """
    Synthesised marine/water-safety snapshot for a point.

    Pulls the nearest NOAA CO-OPS water-level station for tide stage and
    the NWS marine forecast string for wave height / small-craft advisory
    detection. Returns null fields when a particular source fails so the
    client can render partial data.

    Response shape matches WeatherService.getMarineConditions() expectations.
    """
    import httpx
    import re
    from datetime import datetime

    fallback = {
        "status": "degraded",
        "wave_height_ft": None,
        "water_temp_f": None,
        "wind_speed_mph": None,
        "wind_direction": None,
        "tide_stage": "unknown",
        "next_tide_time": None,
        "next_tide_type": None,
        "small_craft_advisory": False,
        "advisory": "Marine data unavailable. Check weather.gov marine forecast before heading out.",
        "as_of": datetime.utcnow().isoformat() + "Z",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            # --- NWS marine-ish forecast (reuse the normal grid; tidal
            #     forecasts aren't always available inland). ---
            pts = await client.get(
                f"https://api.weather.gov/points/{latitude:.4f},{longitude:.4f}",
                headers={"User-Agent": _NWS_USER_AGENT, "Accept": "application/geo+json"},
            )
            pts.raise_for_status()
            props = pts.json().get("properties", {}) or {}
            forecast_url = props.get("forecast")

            forecast_blob = ""
            wind_speed_mph = None
            wind_direction = None
            if forecast_url:
                fc = await client.get(
                    forecast_url,
                    headers={"User-Agent": _NWS_USER_AGENT, "Accept": "application/geo+json"},
                )
                if fc.status_code == 200:
                    periods = (fc.json().get("properties", {}) or {}).get("periods", []) or []
                    if periods:
                        first = periods[0]
                        forecast_blob = (
                            first.get("shortForecast", "")
                            + " "
                            + first.get("detailedForecast", "")
                        ).lower()
                        # windSpeed e.g. "10 to 15 mph"
                        ws = first.get("windSpeed") or ""
                        m = re.search(r"(\d+)", ws)
                        if m:
                            wind_speed_mph = int(m.group(1))
                        wind_direction = first.get("windDirection") or None

            # --- Wave height from forecast prose (rough heuristic). ---
            wave_height_ft = None
            wave_match = re.search(r"(?:waves|seas)[^\d]*(\d+)[^\d]*(?:to\s*(\d+))?\s*(?:ft|feet)", forecast_blob)
            if wave_match:
                lo = int(wave_match.group(1))
                hi = int(wave_match.group(2)) if wave_match.group(2) else lo
                wave_height_ft = round((lo + hi) / 2.0, 1)

            small_craft = "small craft advisory" in forecast_blob

            # --- Try NOAA CO-OPS for water temp + tide. The stations API
            #     is finicky; failures here degrade to nulls. ---
            water_temp_f = None
            tide_stage = "unknown"
            next_tide_time = None
            next_tide_type = None
            try:
                today = datetime.utcnow().strftime("%Y%m%d")
                # Water temp: use product=water_temperature at the nearest
                # station within a small radius. We use NOAA's proximity
                # search via the Metadata API.
                meta = await client.get(
                    "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json",
                    params={"type": "waterlevels"},
                )
                if meta.status_code == 200:
                    stations = meta.json().get("stations", []) or []
                    # Find the nearest station by simple Euclidean distance
                    # on lat/lon (good enough for MD bay/coast).
                    nearest = None
                    nearest_d = 1e9
                    for st in stations:
                        slat = st.get("lat")
                        slon = st.get("lng")
                        if slat is None or slon is None:
                            continue
                        d = (slat - latitude) ** 2 + (slon - longitude) ** 2
                        if d < nearest_d:
                            nearest_d = d
                            nearest = st
                    if nearest and nearest_d < 2.0:  # ~ < 1.5 deg, be generous
                        sid = nearest.get("id") or nearest.get("stationId")
                        if sid:
                            # Predicted high/low tides for today
                            tide_resp = await client.get(
                                "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
                                params={
                                    "station": sid,
                                    "product": "predictions",
                                    "datum": "MLLW",
                                    "interval": "hilo",
                                    "units": "english",
                                    "time_zone": "lst_ldt",
                                    "begin_date": today,
                                    "range": 24,
                                    "format": "json",
                                },
                            )
                            if tide_resp.status_code == 200:
                                preds = tide_resp.json().get("predictions", []) or []
                                now = datetime.utcnow()
                                future = [
                                    p
                                    for p in preds
                                    if p.get("t") and p.get("t") > now.strftime("%Y-%m-%d %H:%M")
                                ]
                                if future:
                                    nxt = future[0]
                                    next_tide_time = nxt.get("t")
                                    next_tide_type = (
                                        "high" if nxt.get("type") == "H" else "low"
                                    )
                                    # Rough stage inference
                                    tide_stage = (
                                        "rising" if next_tide_type == "high" else "falling"
                                    )

                            # Water temp (not all stations have it)
                            wt_resp = await client.get(
                                "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
                                params={
                                    "station": sid,
                                    "product": "water_temperature",
                                    "units": "english",
                                    "time_zone": "lst_ldt",
                                    "date": "latest",
                                    "format": "json",
                                },
                            )
                            if wt_resp.status_code == 200:
                                wt = wt_resp.json().get("data", []) or []
                                if wt:
                                    try:
                                        water_temp_f = round(float(wt[-1].get("v")), 1)
                                    except (TypeError, ValueError):
                                        pass
            except Exception:
                # CO-OPS failures are silent — the client has null defaults.
                pass

            advisory_parts = []
            if small_craft:
                advisory_parts.append("Small Craft Advisory in effect — stay close to shore.")
            if wave_height_ft and wave_height_ft >= 3:
                advisory_parts.append(f"Waves ~{wave_height_ft} ft — rough ride in small boats.")
            if wind_speed_mph and wind_speed_mph >= 20:
                advisory_parts.append(
                    f"Wind {wind_speed_mph} mph {wind_direction or ''} — expect heavy chop."
                )
            if not advisory_parts:
                advisory_parts.append("Conditions look manageable — always verify on weather.gov.")

            return {
                "status": "ok",
                "wave_height_ft": wave_height_ft,
                "water_temp_f": water_temp_f,
                "wind_speed_mph": wind_speed_mph,
                "wind_direction": wind_direction,
                "tide_stage": tide_stage,
                "next_tide_time": next_tide_time,
                "next_tide_type": next_tide_type,
                "small_craft_advisory": small_craft,
                "advisory": " ".join(advisory_parts),
                "as_of": datetime.utcnow().isoformat() + "Z",
            }
    except Exception as e:
        fallback["advisory"] = f"Marine service error: {str(e)[:120]}"
        return fallback


# ─────────────────────────────────────────────────────────────────────────────
# Fish-specific endpoints (Track 4, V2.3)
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/fish/tide-station/{station_id}")
async def get_tide_station_predictions(
    station_id: str = Path(..., description="NOAA station ID (e.g. '8575512')"),
):
    """
    NOAA CO-OPS tide predictions for a single station.

    Returns high and low tide predictions for the next 24 hours,
    plus current tide state (rising/falling). Cached for 60 seconds
    to avoid hammering NOAA API.

    Example: /fish/tide-station/8575512
    """
    import httpx
    from datetime import datetime

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Fetch 24 hours of predictions (interval=hilo = high+low only)
            today = datetime.utcnow().strftime("%Y%m%d")
            resp = await client.get(
                "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
                params={
                    "station": station_id,
                    "product": "predictions",
                    "datum": "MLLW",
                    "interval": "hilo",
                    "units": "english",
                    "time_zone": "lst_ldt",
                    "begin_date": today,
                    "range": 24,
                    "format": "json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        preds = data.get("predictions", []) or []
        now = datetime.utcnow()

        highs = []
        lows = []
        for p in preds:
            t_str = p.get("t")
            v = p.get("v")
            tide_type = p.get("type")

            if not t_str or v is None:
                continue

            try:
                height_ft = float(v)
            except (ValueError, TypeError):
                continue

            if tide_type == "H":
                highs.append({"time": t_str, "height_ft": height_ft})
            elif tide_type == "L":
                lows.append({"time": t_str, "height_ft": height_ft})

        # Infer current state: if the last recorded tide was high, we're falling
        current_state = "unknown"
        if preds:
            last = preds[-1]
            if last.get("type") == "H":
                current_state = "falling"
            elif last.get("type") == "L":
                current_state = "rising"

        return {
            "status": "ok",
            "station_id": station_id,
            "high": highs,
            "low": lows,
            "now": {
                "state": current_state,
                "as_of": now.isoformat() + "Z",
            },
        }
    except Exception as e:
        return {
            "status": "unavailable",
            "station_id": station_id,
            "high": [],
            "low": [],
            "now": {
                "state": "unknown",
                "error": str(e)[:120],
            },
        }


class RampRoutingRequest(BaseModel):
    """Request body for POST /fish/ramp-routing."""

    site_id: str
    site_name: str
    site_lat: Optional[float] = None
    site_lng: Optional[float] = None
    parking_lat: Optional[float] = None
    parking_lng: Optional[float] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None


@router.post("/fish/ramp-routing")
async def get_ramp_routing(req: RampRoutingRequest):
    origin_lat = req.origin_lat
    origin_lng = req.origin_lng
    site_id = req.site_id
    site_lat = req.site_lat
    site_lng = req.site_lng
    parking_lat = req.parking_lat
    parking_lng = req.parking_lng
    site_name = req.site_name
    """
    Generate Apple Maps and Google Maps URLs for navigation to a boat ramp.

    If parkingLat/parkingLng are provided, the maps destination is the parking lot.
    Otherwise, the site marker is used. The optional origin_lat/origin_lng sets
    the starting point (else the user's current location is used by the maps app).

    Returns primaryUrl (Apple Maps) and secondaryUrl (Google Maps).

    Example: POST /fish/ramp-routing
      origin_lat=39.045, origin_lng=-76.641,
      site_id=angler_005,
      site_lat=39.050, site_lng=-76.640,
      parking_lat=39.051, parking_lng=-76.641,
      site_name=Patuxent River Access
    """
    from urllib.parse import quote

    # Determine destination (parking > site)
    dest_lat = parking_lat if parking_lat is not None else site_lat
    dest_lng = parking_lng if parking_lng is not None else site_lng
    dest_name = f"Boat ramp: {site_name}"

    # Build Apple Maps URL (scheme: maps://), including URL-encoded site name
    # so screen readers / map pins get a human-readable label.
    encoded_name = quote(site_name, safe="")
    apple_maps_url = f"http://maps.apple.com/?daddr={dest_lat},{dest_lng}&q={encoded_name}"
    if origin_lat is not None and origin_lng is not None:
        apple_maps_url = (
            f"http://maps.apple.com/?saddr={origin_lat},{origin_lng}"
            f"&daddr={dest_lat},{dest_lng}&q={encoded_name}"
        )
    apple_maps_url += f"&dirflg=d"  # d = driving

    # Build Google Maps URL
    google_maps_url = (
        f"https://www.google.com/maps/dir/?api=1&destination={dest_lat},{dest_lng}"
        f"&destination_place_id={encoded_name}"
    )
    if origin_lat is not None and origin_lng is not None:
        google_maps_url += f"&origin={origin_lat},{origin_lng}"

    return {
        "status": "ok",
        "primaryUrl": apple_maps_url,
        "secondaryUrl": google_maps_url,
        "label": dest_name,
        "destination": {
            "lat": dest_lat,
            "lng": dest_lng,
            "name": site_name,
        },
    }
