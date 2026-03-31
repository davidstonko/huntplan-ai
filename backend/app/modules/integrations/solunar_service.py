"""
Solunar / Best Hunting Times Service

Calculates predicted deer activity periods based on:
- Moon phase and position (solunar theory)
- Sunrise/sunset (crepuscular activity)
- Weather conditions (barometric pressure, temperature, wind)

Solunar theory: Game animals are most active during moon overhead/underfoot
periods (major) and moonrise/moonset periods (minor). Combined with
dawn/dusk feeding patterns, this gives hunters actionable timing data.

References:
- John Alden Knight's Solunar Tables (1936)
- Mark Drury's deer movement research
"""

import math
from datetime import datetime, date, timedelta, timezone
from typing import Optional


# ─── Moon Phase Calculation ───────────────────────────────────────

def get_moon_phase(dt: date) -> dict:
    """
    Calculate moon phase for a given date.
    Returns phase name, illumination percentage, and phase angle.

    Uses a simplified synodic month calculation.
    Accuracy: ±1 day for phase names, ±5% for illumination.
    """
    # Known new moon: Jan 6, 2000 18:14 UTC
    known_new_moon = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
    synodic_month = 29.53058867  # Average lunar month in days

    target = datetime(dt.year, dt.month, dt.day, 12, 0, tzinfo=timezone.utc)
    diff = (target - known_new_moon).total_seconds() / 86400.0
    cycles = diff / synodic_month
    phase_fraction = cycles % 1.0  # 0=new moon, 0.5=full moon

    # Phase angle (0-360 degrees)
    phase_angle = phase_fraction * 360.0

    # Illumination (simplified cosine model)
    illumination = round((1 - math.cos(2 * math.pi * phase_fraction)) / 2 * 100, 1)

    # Phase name
    if phase_fraction < 0.0625:
        name = "New Moon"
    elif phase_fraction < 0.1875:
        name = "Waxing Crescent"
    elif phase_fraction < 0.3125:
        name = "First Quarter"
    elif phase_fraction < 0.4375:
        name = "Waxing Gibbous"
    elif phase_fraction < 0.5625:
        name = "Full Moon"
    elif phase_fraction < 0.6875:
        name = "Waning Gibbous"
    elif phase_fraction < 0.8125:
        name = "Last Quarter"
    elif phase_fraction < 0.9375:
        name = "Waning Crescent"
    else:
        name = "New Moon"

    return {
        "phase_name": name,
        "illumination_pct": illumination,
        "phase_fraction": round(phase_fraction, 4),
        "phase_angle": round(phase_angle, 1),
    }


# ─── Solunar Period Calculation ──────────────────────────────────

def calculate_solunar_periods(
    dt: date,
    latitude: float,
    longitude: float,
) -> dict:
    """
    Calculate major and minor solunar periods for a given date and location.

    Major periods (~2 hours): Moon directly overhead (transit) or underfoot (anti-transit)
    Minor periods (~1 hour): Moonrise and moonset

    Returns estimated times and a deer activity rating.
    """
    moon = get_moon_phase(dt)

    # Approximate moon transit time
    # Moon crosses meridian ~50 minutes later each day
    known_transit = datetime(2000, 1, 6, 12, 0, tzinfo=timezone.utc)
    days_since = (datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc) - known_transit).days
    transit_offset_hours = (days_since * 50.47 / 60.0) % 24.0  # minutes to hours

    # Approximate local transit time
    lon_offset = longitude / 15.0  # Convert longitude to hours
    local_transit = (12.0 + transit_offset_hours + lon_offset) % 24.0

    # Major periods: overhead (transit) and underfoot (transit + 12h)
    major1_start = local_transit - 1.0  # 2-hour window
    major1_end = local_transit + 1.0
    major2_start = (local_transit + 12.0 - 1.0) % 24.0
    major2_end = (local_transit + 12.0 + 1.0) % 24.0

    # Minor periods: moonrise and moonset (~6h before/after transit)
    minor1_center = (local_transit - 6.2) % 24.0
    minor2_center = (local_transit + 6.2) % 24.0

    # Sunrise/sunset approximation for the location
    sunrise, sunset = _approx_sun_times(dt, latitude, longitude)

    # Calculate overall deer activity rating
    rating = _calculate_activity_rating(moon, dt, sunrise, sunset, major1_start, major2_start)

    return {
        "date": dt.isoformat(),
        "moon": moon,
        "major_periods": [
            {
                "label": "Major 1 (Moon Overhead)",
                "start": _format_time(major1_start),
                "end": _format_time(major1_end),
                "duration_hours": 2.0,
            },
            {
                "label": "Major 2 (Moon Underfoot)",
                "start": _format_time(major2_start),
                "end": _format_time(major2_end),
                "duration_hours": 2.0,
            },
        ],
        "minor_periods": [
            {
                "label": "Minor 1 (Moonrise)",
                "center": _format_time(minor1_center),
                "duration_hours": 1.0,
            },
            {
                "label": "Minor 2 (Moonset)",
                "center": _format_time(minor2_center),
                "duration_hours": 1.0,
            },
        ],
        "sun": {
            "sunrise": _format_time(sunrise),
            "sunset": _format_time(sunset),
            "legal_start": _format_time(sunrise - 0.5),
            "legal_end": _format_time(sunset + 0.5),
        },
        "best_times": _pick_best_times(
            sunrise, sunset, major1_start, major1_end,
            major2_start, major2_end, minor1_center, minor2_center,
        ),
        "rating": rating,
    }


def _calculate_activity_rating(
    moon: dict, dt: date, sunrise: float, sunset: float,
    major1_start: float, major2_start: float,
) -> dict:
    """
    Rate overall deer activity potential (0-100 scale).

    Factors:
    - Moon phase: Full/new moons increase movement (higher score)
    - Solunar alignment with dawn/dusk: Major period overlapping legal hours = bonus
    - Day of week: Weekday = less hunting pressure = slightly better
    """
    score = 50  # Baseline

    # Moon phase factor (full and new moons are best)
    phase_frac = moon["phase_fraction"]
    dist_from_peak = min(abs(phase_frac - 0.0), abs(phase_frac - 0.5), abs(phase_frac - 1.0))
    moon_bonus = int((1 - dist_from_peak * 4) * 20)
    score += max(0, moon_bonus)

    # Solunar overlap with dawn/dusk
    for major_time in [major1_start, major2_start]:
        if abs(major_time - sunrise) < 2.0 or abs(major_time - sunset) < 2.0:
            score += 15
            break

    # Daylight duration factor
    daylight_hours = sunset - sunrise
    if daylight_hours < 10:
        score += 5

    # Day of week
    if dt.weekday() < 5:
        score += 3

    score = max(0, min(100, score))

    if score >= 80:
        label = "Excellent"
    elif score >= 65:
        label = "Good"
    elif score >= 45:
        label = "Fair"
    else:
        label = "Poor"

    return {
        "score": score,
        "label": label,
        "factors": {
            "moon_phase": moon["phase_name"],
            "illumination": moon["illumination_pct"],
            "solunar_dawn_overlap": abs(major1_start - sunrise) < 2.0 or abs(major2_start - sunrise) < 2.0,
            "solunar_dusk_overlap": abs(major1_start - sunset) < 2.0 or abs(major2_start - sunset) < 2.0,
        },
    }


def _pick_best_times(
    sunrise: float, sunset: float,
    major1_start: float, major1_end: float,
    major2_start: float, major2_end: float,
    minor1_center: float, minor2_center: float,
) -> list[dict]:
    """
    Pick the best hunting windows that fall within legal shooting hours.
    """
    legal_start = sunrise - 0.5
    legal_end = sunset + 0.5

    windows = []

    windows.append({
        "window": "Dawn Feed",
        "start": _format_time(legal_start),
        "end": _format_time(sunrise + 1.5),
        "priority": "high",
        "reason": "Peak crepuscular feeding activity at first light",
    })

    windows.append({
        "window": "Dusk Feed",
        "start": _format_time(sunset - 1.5),
        "end": _format_time(legal_end),
        "priority": "high",
        "reason": "Evening feeding movement before dark",
    })

    for label, start, end in [
        ("Solunar Major", major1_start, major1_end),
        ("Solunar Major", major2_start, major2_end),
    ]:
        if legal_start <= start <= legal_end or legal_start <= end <= legal_end:
            windows.append({
                "window": label,
                "start": _format_time(max(start, legal_start)),
                "end": _format_time(min(end, legal_end)),
                "priority": "medium",
                "reason": "Moon overhead/underfoot — predicted peak movement",
            })

    for label, center in [
        ("Solunar Minor", minor1_center),
        ("Solunar Minor", minor2_center),
    ]:
        if legal_start <= center <= legal_end:
            windows.append({
                "window": label,
                "start": _format_time(center - 0.5),
                "end": _format_time(center + 0.5),
                "priority": "low",
                "reason": "Moonrise/moonset — minor activity period",
            })

    windows.append({
        "window": "Midday Lull",
        "start": _format_time(10.5),
        "end": _format_time(14.0),
        "priority": "low",
        "reason": "Typically low movement — good time to adjust strategy or move stands",
    })

    return windows


# ─── Solar Calculations ──────────────────────────────────────────

def _approx_sun_times(dt: date, latitude: float, longitude: float) -> tuple[float, float]:
    """
    Approximate sunrise and sunset times (decimal hours, local solar time).
    Simplified calculation — accurate to ±15 minutes for mid-latitudes.
    """
    n = dt.timetuple().tm_yday

    declination = 23.45 * math.sin(math.radians(360 / 365 * (n + 284)))
    decl_rad = math.radians(declination)
    lat_rad = math.radians(latitude)

    cos_hour = -math.tan(lat_rad) * math.tan(decl_rad)
    cos_hour = max(-1, min(1, cos_hour))
    hour_angle = math.degrees(math.acos(cos_hour))

    solar_noon = 12.0 - longitude / 15.0 + 5.0  # UTC offset for ET

    sunrise = solar_noon - hour_angle / 15.0
    sunset = solar_noon + hour_angle / 15.0

    return (sunrise, sunset)


def _format_time(decimal_hours: float) -> str:
    """Convert decimal hours to HH:MM format."""
    h = decimal_hours % 24
    hours = int(h)
    minutes = int((h - hours) * 60)
    return f"{hours:02d}:{minutes:02d}"


# ─── Multi-day Forecast ──────────────────────────────────────────

def get_weekly_solunar(
    start_date: date,
    latitude: float,
    longitude: float,
    days: int = 7,
) -> list[dict]:
    """
    Generate solunar data for multiple days.
    Useful for planning which day of the week to hunt.
    """
    results = []
    for i in range(days):
        dt = start_date + timedelta(days=i)
        data = calculate_solunar_periods(dt, latitude, longitude)
        results.append({
            "date": dt.isoformat(),
            "day_of_week": dt.strftime("%A"),
            "rating": data["rating"],
            "moon_phase": data["moon"]["phase_name"],
            "illumination": data["moon"]["illumination_pct"],
            "best_times_count": len([w for w in data["best_times"] if w["priority"] in ("high", "medium")]),
        })
    return results
