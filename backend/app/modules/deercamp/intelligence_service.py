"""
Deer Camp Intelligence Service — AI analysis of camp hunting data.

Analyzes aggregated camp data (harvest patterns, locations, timing, etc.)
and returns intelligent hunting insights via Gemini LLM.
Includes fallback rule-based analysis if LLM is unavailable.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from app.config import settings
from app.modules.ai_planner.service import get_gemini_model, _call_gemini

logger = logging.getLogger(__name__)


def build_camp_intelligence_system_prompt() -> str:
    """Build the system prompt for camp intelligence analysis."""
    return """You are an expert whitetail deer hunting analyst specializing in Maryland hunting data.

You analyze aggregated hunting camp statistics to provide actionable insights and strategies.

Your analysis should:
1. Identify patterns in successful harvest locations and times
2. Recognize seasonal trends and activity fluctuations
3. Evaluate weapon effectiveness and method success rates
4. Recommend optimal hunting windows based on historical data and Maryland rut calendar
5. Suggest strategic improvements based on what's working and what isn't

Be specific to Maryland hunting conditions. Reference actual location names and data points.
Always emphasize the importance of verifying regulations with Maryland DNR.
Keep recommendations practical and actionable for the next hunting season."""


async def generate_camp_intelligence(camp_data: dict) -> dict:
    """
    Generate AI-powered intelligence analysis for a deer camp.

    Args:
        camp_data: Dictionary with keys:
            - data_point_count: int
            - members_count: int
            - species_breakdown: dict (e.g., {"Deer": 45, "Turkey": 12})
            - harvest_locations: list of dicts with name, lat, lng, count
            - time_patterns: dict (e.g., {"morning": 65, "midday": 15, "evening": 20})
            - seasonal_data: list of dicts with month and activity percentage
            - weapon_stats: dict (e.g., {"Archery": {"attempts": 20, "harvests": 5}})
            - average_harvest_weight: Optional[float]
            - average_antler_points: Optional[float]
            - top_stands: Optional[list] of dicts with name and harvests
            - camp_bounds: Optional[dict] with north, south, east, west

    Returns:
        dict with keys: summary, recommendations, patterns, predicted_best_days,
                       strategy_suggestion, analyzed_at, fallback (if LLM failed)
    """
    # Validate tier requirement: need at least 50 data points for AI analysis
    if camp_data.get("data_point_count", 0) < 50:
        return {
            "status": "insufficient_data",
            "data_point_count": camp_data.get("data_point_count", 0),
            "required_count": 50,
            "message": f"Need at least 50 data points to unlock AI insights. Currently at {camp_data.get('data_point_count', 0)}.",
        }

    # Build the prompt
    prompt = _build_intelligence_prompt(camp_data)

    # Try Gemini API
    try:
        model = get_gemini_model()
        if model:
            logger.info("Attempting Gemini API for camp intelligence analysis")
            response_text = await _call_gemini(model, prompt)
            logger.info("Gemini API succeeded for camp intelligence")
            return _parse_intelligence_response(response_text, camp_data)
    except Exception as e:
        api_error = f"Gemini API error: {e}"
        logger.warning(api_error)

    # Fallback: rule-based analysis
    logger.warning("Using fallback rule-based camp intelligence analysis")
    return _build_fallback_intelligence(camp_data)


def _build_intelligence_prompt(camp_data: dict) -> str:
    """Build the full prompt for Gemini intelligence analysis."""
    system_prompt = build_camp_intelligence_system_prompt()

    # Format the camp statistics into readable sections
    species_str = ", ".join([f"{s}: {c}" for s, c in camp_data.get("species_breakdown", {}).items()])
    weapon_str = _format_weapon_stats(camp_data.get("weapon_stats", {}))
    locations_str = _format_locations(camp_data.get("harvest_locations", []))
    seasonal_str = _format_seasonal_data(camp_data.get("seasonal_data", []))
    time_pattern_str = _format_time_patterns(camp_data.get("time_patterns", {}))
    top_stands_str = _format_top_stands(camp_data.get("top_stands", []))

    user_message = f"""Analyze the following deer camp hunting data and provide strategic insights.

CAMP STATISTICS:
- Total Data Points: {camp_data.get('data_point_count', 0)}
- Team Members: {camp_data.get('members_count', 0)}
- Species Breakdown: {species_str}

HARVEST LOCATIONS:
{locations_str}

TIME OF DAY PATTERNS:
{time_pattern_str}

SEASONAL ACTIVITY:
{seasonal_str}

WEAPON EFFECTIVENESS:
{weapon_str}

TOP STANDS/AREAS:
{top_stands_str}

HARVEST STATISTICS:
- Average Harvest Weight: {camp_data.get('average_harvest_weight') or 'Not recorded'} lbs
- Average Antler Points: {camp_data.get('average_antler_points') or 'Not recorded'}

Based on this data, please provide:

1. **Summary** (2-3 sentences) — What this camp's data tells us about hunting success patterns
2. **Key Patterns** (2-3 bullet points) — Notable trends or surprising findings
3. **Recommendations** (3-5 actionable items) — Specific strategies to improve success next season
4. **Best Hunting Days** (3-4 dates/timeframes) — Predicted optimal hunting windows for the next month based on MD rut calendar and historical data
5. **Overall Strategy** (3-4 sentences) — Camp-wide strategic recommendation for next season

Always end with: "Verify all hunting regulations with Maryland DNR before the next season."
Format the response clearly with bold headers for each section."""

    return f"{system_prompt}\n\n---\n\n{user_message}"


def _format_weapon_stats(weapon_stats: dict) -> str:
    """Format weapon statistics for display."""
    if not weapon_stats:
        return "No weapon data available"

    lines = []
    for weapon, stats in weapon_stats.items():
        attempts = stats.get("attempts", 0)
        harvests = stats.get("harvests", 0)
        success_rate = (harvests / attempts * 100) if attempts > 0 else 0
        lines.append(f"- {weapon}: {harvests} harvests / {attempts} attempts ({success_rate:.1f}% success rate)")
    return "\n".join(lines)


def _format_locations(locations: list) -> str:
    """Format harvest locations for display."""
    if not locations:
        return "No location data available"

    lines = []
    for loc in locations:
        name = loc.get("name", "Unknown")
        count = loc.get("count", 0)
        lat = loc.get("lat", 0)
        lng = loc.get("lng", 0)
        lines.append(f"- {name}: {count} harvests (Lat: {lat:.2f}, Lon: {lng:.2f})")
    return "\n".join(lines)


def _format_seasonal_data(seasonal: list) -> str:
    """Format seasonal activity data for display."""
    if not seasonal:
        return "No seasonal data available"

    lines = []
    for month_data in seasonal:
        month = month_data.get("month", "Unknown")
        activity = month_data.get("activity", 0)
        lines.append(f"- {month}: {activity}% activity")
    return "\n".join(lines)


def _format_time_patterns(time_patterns: dict) -> str:
    """Format time-of-day patterns for display."""
    if not time_patterns:
        return "No time pattern data available"

    lines = []
    for period, pct in time_patterns.items():
        lines.append(f"- {period.title()}: {pct}%")
    return "\n".join(lines)


def _format_top_stands(top_stands: list) -> str:
    """Format top stands/areas for display."""
    if not top_stands:
        return "No stand data available"

    lines = []
    for stand in top_stands:
        name = stand.get("name", "Unknown")
        harvests = stand.get("harvests", 0)
        lines.append(f"- {name}: {harvests} harvests")
    return "\n".join(lines)


def _parse_intelligence_response(response_text: str, camp_data: dict) -> dict:
    """Parse Gemini response into structured intelligence output."""
    # Gemini returns formatted text; we'll extract sections
    # This is a simple parser that looks for bold headers

    sections = {
        "summary": "",
        "patterns": [],
        "recommendations": [],
        "predicted_best_days": [],
        "strategy_suggestion": "",
    }

    # Split by common headers (both Markdown bold and plain)
    lines = response_text.split("\n")
    current_section = None
    buffer = []

    for line in lines:
        line_lower = line.lower()

        # Detect section headers
        if "**summary**" in line_lower or "summary:" in line_lower:
            if buffer and current_section:
                sections[current_section] = "\n".join(buffer).strip()
            current_section = "summary"
            buffer = []
        elif "**pattern**" in line_lower or "pattern:" in line_lower:
            if buffer and current_section:
                sections[current_section] = "\n".join(buffer).strip()
            current_section = "patterns"
            buffer = []
        elif "**recommendation**" in line_lower or "recommendation:" in line_lower:
            if buffer and current_section:
                if current_section == "patterns":
                    sections[current_section] = [x.strip().lstrip("- •") for x in buffer if x.strip()]
                else:
                    sections[current_section] = "\n".join(buffer).strip()
            current_section = "recommendations"
            buffer = []
        elif "**best**" in line_lower or "hunting day" in line_lower or "optimal" in line_lower:
            if buffer and current_section:
                if current_section == "recommendations":
                    sections[current_section] = [x.strip().lstrip("- •") for x in buffer if x.strip()]
                else:
                    sections[current_section] = "\n".join(buffer).strip()
            current_section = "predicted_best_days"
            buffer = []
        elif "**strateg**" in line_lower or "overall" in line_lower:
            if buffer and current_section:
                if current_section == "predicted_best_days":
                    sections[current_section] = [x.strip().lstrip("- •") for x in buffer if x.strip()]
                else:
                    sections[current_section] = "\n".join(buffer).strip()
            current_section = "strategy_suggestion"
            buffer = []
        elif current_section:
            buffer.append(line)

    # Flush last section
    if buffer and current_section:
        if current_section in ["patterns", "recommendations", "predicted_best_days"]:
            sections[current_section] = [x.strip().lstrip("- •") for x in buffer if x.strip()]
        else:
            sections[current_section] = "\n".join(buffer).strip()

    # Clean up text
    for key in sections:
        if isinstance(sections[key], str):
            sections[key] = sections[key].replace("**", "").strip()

    # Ensure we have lists for expected list fields
    for key in ["patterns", "recommendations", "predicted_best_days"]:
        if isinstance(sections[key], str):
            sections[key] = [x.strip() for x in sections[key].split("\n") if x.strip() and not x.startswith("**")]

    # Fallback: if parsing failed, use raw response
    if not sections["summary"]:
        sections["summary"] = response_text[:200] + "..."
        sections["recommendations"] = ["See full analysis below"]
        sections["patterns"] = ["See full analysis below"]

    sections["analyzed_at"] = datetime.now(timezone.utc).isoformat()
    sections["data_point_count"] = camp_data.get("data_point_count", 0)
    sections["members_count"] = camp_data.get("members_count", 0)

    return sections


def _build_fallback_intelligence(camp_data: dict) -> dict:
    """Build rule-based intelligence analysis when API is unavailable."""
    summary = _generate_fallback_summary(camp_data)
    recommendations = _generate_fallback_recommendations(camp_data)
    patterns = _generate_fallback_patterns(camp_data)
    best_days = _generate_fallback_best_days(camp_data)
    strategy = _generate_fallback_strategy(camp_data)

    return {
        "summary": summary,
        "recommendations": recommendations,
        "patterns": patterns,
        "predicted_best_days": best_days,
        "strategy_suggestion": strategy,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "data_point_count": camp_data.get("data_point_count", 0),
        "members_count": camp_data.get("members_count", 0),
        "fallback": True,
    }


def _generate_fallback_summary(camp_data: dict) -> str:
    """Generate a summary based on basic statistics."""
    count = camp_data.get("data_point_count", 0)
    members = camp_data.get("members_count", 0)
    species = list(camp_data.get("species_breakdown", {}).keys())[0] if camp_data.get("species_breakdown") else "game"

    return f"Your camp has recorded {count} data points from {members} members, primarily focused on {species} hunting. This dataset provides a solid foundation for identifying seasonal and location-based patterns."


def _generate_fallback_recommendations(camp_data: dict) -> list:
    """Generate recommendations based on data patterns."""
    recs = []

    time_patterns = camp_data.get("time_patterns", {})
    morning_pct = time_patterns.get("morning", 0)
    evening_pct = time_patterns.get("evening", 0)

    if morning_pct > 60:
        recs.append("Morning hunts show strong success (60%+). Continue prioritizing early-morning sits in high-activity areas.")
    elif evening_pct > 60:
        recs.append("Evening hunts are most productive. Focus resources on afternoon and evening hunting sessions.")
    else:
        recs.append("Harvest success is distributed throughout the day. Maintain flexibility in hunting windows.")

    weapon_stats = camp_data.get("weapon_stats", {})
    best_weapon = None
    best_rate = 0
    for weapon, stats in weapon_stats.items():
        attempts = stats.get("attempts", 0)
        harvests = stats.get("harvests", 0)
        if attempts > 0:
            rate = harvests / attempts
            if rate > best_rate:
                best_rate = rate
                best_weapon = weapon

    if best_weapon and best_rate > 0:
        recs.append(f"{best_weapon} shows the highest success rate ({best_rate*100:.0f}%). Invest in quality equipment and practice for your preferred method.")

    top_stands = camp_data.get("top_stands", [])
    if top_stands and len(top_stands) > 0:
        top = top_stands[0]
        recs.append(f"'{top.get('name')}' is your camp's hottest location ({top.get('harvests')} harvests). Protect this location from over-hunting and maintain quality stand management.")

    seasonal = camp_data.get("seasonal_data", [])
    if seasonal:
        peak_month = max(seasonal, key=lambda x: x.get("activity", 0))
        recs.append(f"Peak activity occurs in {peak_month.get('month')}. Schedule vacation time and concentrate hunters during this period.")

    return recs[:5]  # Return up to 5 recommendations


def _generate_fallback_patterns(camp_data: dict) -> list:
    """Generate pattern observations from data."""
    patterns = []

    species = camp_data.get("species_breakdown", {})
    if len(species) > 1:
        dominant = max(species, key=species.get)
        patterns.append(f"Whitetail deer dominates the harvest ({species.get(dominant, 0)} records), but secondary species offer diversification opportunities.")

    harvest_locs = camp_data.get("harvest_locations", [])
    if harvest_locs:
        top_loc = max(harvest_locs, key=lambda x: x.get("count", 0))
        concentration = top_loc.get("count", 0) / sum(l.get("count", 0) for l in harvest_locs) if harvest_locs else 0
        if concentration > 0.4:
            patterns.append(f"Harvest success is concentrated in specific areas ('{top_loc.get('name')}' accounts for {concentration*100:.0f}%). This suggests strong microhabitat preference.")

    time_patterns = camp_data.get("time_patterns", {})
    if time_patterns:
        total = sum(time_patterns.values())
        if total > 0:
            morning = time_patterns.get("morning", 0) / total
            evening = time_patterns.get("evening", 0) / total
            if abs(morning - evening) > 0.2:
                patterns.append(f"Clear time-of-day preference: {'morning' if morning > evening else 'evening'} hunting is {max(morning, evening)*100:.0f}% of activity.")

    weight = camp_data.get("average_harvest_weight")
    if weight and weight > 200:
        patterns.append(f"Average harvest weight of {weight:.0f} lbs indicates healthy deer population and good land management.")

    return patterns


def _generate_fallback_best_days(camp_data: dict) -> list:
    """Generate predicted best hunting days (placeholders for MD rut calendar)."""
    # In a real scenario, cross-reference with MD rut calendar dates
    return [
        "Late October/Early November (Pre-rut peak activity)",
        "Mid-November (Peak rut period, highest movement)",
        "December 1-15 (Secondary rut, cold weather increases activity)",
        "Weekdays during peak season (higher success than weekends)",
    ]


def _generate_fallback_strategy(camp_data: dict) -> str:
    """Generate overall camp strategy recommendation."""
    members = camp_data.get("members_count", 0)
    top_stands = camp_data.get("top_stands", [])

    strategy = f"With {members} hunters on your team, focus on rotation strategy to prevent stand burnout. "

    if top_stands:
        strategy += f"Prioritize pressure management at high-success locations like '{top_stands[0].get('name')}' — rotate hunters to maintain deer comfort. "

    season_data = camp_data.get("seasonal_data", [])
    if season_data:
        peak = max(season_data, key=lambda x: x.get("activity", 0))
        strategy += f"Concentrate your best hunters during the peak season ({peak.get('month')}). "

    strategy += "Verify all hunting regulations with Maryland DNR before the season."

    return strategy
