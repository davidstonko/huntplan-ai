# Deer Camp Intelligence — AI Analysis Endpoint

## Overview

The Camp Intelligence endpoint ("AI Learns Your Deer Camp") analyzes aggregated hunting data from a shared deer camp and returns intelligent insights and strategic recommendations via Gemini LLM.

**Endpoint:** `POST /api/v1/deercamp/camps/{camp_id}/intelligence`

## Purpose

Hunters accumulate valuable data throughout seasons — harvest locations, timing patterns, weapon effectiveness, seasonal trends. The Camp Intelligence endpoint transforms this raw data into actionable hunting strategy through AI analysis.

## Tier Gating

**Minimum requirement:** 50 data points to unlock AI insights.

If a camp has fewer than 50 data points, the endpoint returns a 403 Forbidden response with a message indicating how many more data points are needed.

```
{
  "detail": "Need at least 50 data points to unlock AI insights. Currently at 23."
}
```

This prevents generating generic AI analysis from insufficient data.

## Request Format

```json
{
  "data_point_count": 145,
  "members_count": 4,
  "species_breakdown": {
    "Deer": 89,
    "Turkey": 12
  },
  "harvest_locations": [
    {
      "name": "Ridge Stand",
      "lat": 39.5,
      "lng": -78.2,
      "count": 34
    },
    {
      "name": "Creek Bottom",
      "lat": 39.45,
      "lng": -78.15,
      "count": 28
    }
  ],
  "time_patterns": {
    "morning": 65,
    "midday": 10,
    "evening": 25
  },
  "seasonal_data": [
    {
      "month": "October",
      "activity": 45
    },
    {
      "month": "November",
      "activity": 92
    }
  ],
  "weapon_stats": {
    "Archery": {
      "attempts": 45,
      "harvests": 12
    },
    "Firearms": {
      "attempts": 32,
      "harvests": 18
    }
  },
  "average_harvest_weight": 187.5,
  "average_antler_points": 7.2,
  "top_stands": [
    {
      "name": "Ridge Stand",
      "harvests": 34
    },
    {
      "name": "Creek Bottom",
      "harvests": 28
    }
  ],
  "camp_bounds": {
    "north": 39.6,
    "south": 39.4,
    "east": -78.0,
    "west": -78.4
  }
}
```

### Field Descriptions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `data_point_count` | int | Yes | Total records analyzed (must be >= 50) |
| `members_count` | int | Yes | Number of hunters in camp |
| `species_breakdown` | dict | Yes | Species names → harvest counts |
| `harvest_locations` | array | No | Specific location + coordinates + count |
| `time_patterns` | dict | Yes | Time of day → percentage (morning/midday/evening) |
| `seasonal_data` | array | No | Month → activity percentage (0-100) |
| `weapon_stats` | dict | Yes | Weapon type → {attempts, harvests} |
| `average_harvest_weight` | float | No | Average weight in lbs |
| `average_antler_points` | float | No | Average antler points |
| `top_stands` | array | No | Best-performing stands with harvest counts |
| `camp_bounds` | object | No | Geographic bounds (north, south, east, west) |

## Response Format

### Success Response (200 OK)

```json
{
  "status": "ok",
  "summary": "Your camp has recorded 145 data points from 4 members, primarily focused on whitetail hunting. This dataset provides a solid foundation for identifying seasonal and location-based patterns.",
  "recommendations": [
    "Morning hunts show strong success (65%). Continue prioritizing early-morning sits in high-activity areas.",
    "Archery shows the highest success rate (26.7%). Invest in quality equipment and practice for your preferred method.",
    "'Ridge Stand' is your camp's hottest location (34 harvests). Protect this location from over-hunting and maintain quality stand management.",
    "Peak activity occurs in November. Schedule vacation time and concentrate hunters during this period.",
    "With 4 hunters on your team, focus on rotation strategy to prevent stand burnout."
  ],
  "patterns": [
    "Whitetail deer dominates the harvest (89 records), but secondary species offer diversification opportunities.",
    "Harvest success is concentrated in specific areas ('Ridge Stand' accounts for 37% of activity). This suggests strong microhabitat preference.",
    "Clear time-of-day preference: morning hunting is 65% of activity.",
    "Average harvest weight of 187.5 lbs indicates healthy deer population and good land management."
  ],
  "predicted_best_days": [
    "Late October/Early November (Pre-rut peak activity)",
    "Mid-November (Peak rut period, highest movement)",
    "December 1-15 (Secondary rut, cold weather increases activity)",
    "Weekdays during peak season (higher success than weekends)"
  ],
  "strategy_suggestion": "With 4 hunters on your team, focus on rotation strategy to prevent stand burnout. Prioritize pressure management at high-success locations like 'Ridge Stand' — rotate hunters to maintain deer comfort. Concentrate your best hunters during the peak season (November). Verify all hunting regulations with Maryland DNR before the season.",
  "analyzed_at": "2026-04-02T18:32:45.123456+00:00",
  "data_point_count": 145,
  "members_count": 4,
  "fallback": false
}
```

### Insufficient Data Response (403 Forbidden)

```json
{
  "detail": "Need at least 50 data points to unlock AI insights. Currently at 23."
}
```

### Fallback Response (when LLM unavailable)

Response includes all fields as above, but `fallback: true`. This means:
- AI recommendations are generated from rule-based logic, not Gemini
- Analysis is still useful but not as nuanced
- Includes a disclaimer in response

## Field Details

### Summary
A 2-3 sentence overview of the camp's hunting patterns based on data scope and primary focus.

### Recommendations
3-5 specific, actionable items for improving next season:
- Timing strategies (morning/evening focus)
- Weapon/method effectiveness
- Location management
- Seasonal concentration
- Team rotation strategy

### Patterns
2-3 notable observations from the data:
- Species dominance
- Geographic concentration
- Time-of-day preference
- Harvest quality indicators

### Predicted Best Days
3-4 forecasted optimal hunting windows:
- Consider Maryland rut calendar
- Seasonal peaks
- Historical data
- Weekday vs. weekend trends

### Strategy Suggestion
Overall camp-wide strategy (3-4 sentences) considering:
- Team size and coordination
- High-success location management
- Seasonal timing
- Regulatory reminders

## AI Processing

### Gemini LLM Integration

1. System prompt establishes expert analyst role
2. Camp data formatted into readable context
3. Gemini 2.0 Flash generates detailed analysis
4. Response parsed into structured fields

### Fallback Logic

If Gemini API fails:
1. Rule-based recommendations generated from weapon stats, time patterns, seasonal data
2. Pattern detection based on simple statistical analysis
3. Generic strategy suggestions from team size and data
4. Response marked with `fallback: true`

Example fallback triggers:
- `GEMINI_API_KEY` not configured
- API rate limit exceeded (15 RPM free tier)
- Network error
- Timeout

## Integration with Mobile

The mobile app should:

1. **Aggregate camp data** as members log harvests, tracks, and annotations
2. **Calculate statistics** locally or via a helper endpoint
3. **Call this endpoint** when user requests "AI Learns Camp"
4. **Display results** in a UI panel with expandable sections:
   - Summary card
   - Collapsible recommendations list
   - Patterns section
   - Best days widget
   - Strategy card

## Examples

### Minimal Request (meets tier requirement)

```bash
curl -X POST "http://localhost:8000/api/v1/deercamp/camps/12345678-1234-1234-1234-123456789abc/intelligence" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "data_point_count": 50,
    "members_count": 1,
    "species_breakdown": {"Deer": 50},
    "time_patterns": {"morning": 70, "midday": 10, "evening": 20},
    "seasonal_data": [],
    "weapon_stats": {"Archery": {"attempts": 25, "harvests": 5}},
    "top_stands": []
  }'
```

### Rich Request (full data)

```bash
curl -X POST "http://localhost:8000/api/v1/deercamp/camps/12345678-1234-1234-1234-123456789abc/intelligence" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d @camp_data.json
```

Where `camp_data.json` is the full request payload shown in the Request Format section above.

## Error Handling

| Status Code | Scenario | Example |
|------------|----------|---------|
| 200 | Successful analysis | See "Success Response" above |
| 403 | Insufficient data | < 50 data points |
| 403 | Not camp member | User not in camp |
| 422 | Validation error | Missing required fields |
| 500 | Server error | Database/API failure |

## Performance Notes

- Gemini 2.0 Flash is free tier (15 RPM, 1M tokens/day)
- Analysis typically takes 2-5 seconds
- Fallback rule-based analysis is instant
- No database writes — read-only operation
- Caching not implemented (each call is fresh analysis)

## Future Enhancements

1. **Caching** — Cache analysis for 24 hours to reduce API calls
2. **Trend tracking** — Compare year-over-year patterns
3. **Predictive modeling** — ML-based harvest forecasts
4. **Peer comparison** — Benchmark against regional averages
5. **Mobile export** — Generate PDF/image shareable reports
6. **WebSocket updates** — Real-time analysis as data updates
7. **Multi-state support** — Adapt recommendations for VA, PA, etc.

## Related Endpoints

- `POST /api/v1/deercamp/camps` — Create camp
- `GET /api/v1/deercamp/camps/{camp_id}` — Fetch camp details
- `POST /api/v1/deercamp/camps/{camp_id}/annotations` — Add data points
- `GET /api/v1/deercamp/camps/{camp_id}/feed` — Activity feed

## Security & Privacy

- **Authentication required** — Only camp members can request analysis
- **No data export** — Analysis results not stored in database
- **No third-party sharing** — Gemini API only receives aggregated stats, no personal data
- **Regulatory disclaimer** — Always reminds user to verify with MD DNR
