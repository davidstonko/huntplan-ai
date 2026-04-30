# API Reference — MDHuntFishOutdoors Backend

**Base URL:** `https://huntplan-api.onrender.com/api/v1` (or `http://localhost:8000/api/v1` locally)

**Authentication:** All endpoints require a valid JWT token in the `Authorization: Bearer {token}` header, except `/auth/register`.

---

## Authentication (`/auth`)

### Register Device
**POST** `/auth/register`

Register a new anonymous user or retrieve JWT for existing device.

**Request:**
```json
{
  "device_token": "optional-device-id-or-null",
  "handle": "optional-custom-handle-or-null"
}
```

**Response:** `200 OK`
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "handle": "Hunter_a7f3b2",
  "device_token": "generated-or-provided",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Notes:**
- Server generates `device_token` and `handle` if not provided
- Token valid for 30 days
- Same `device_token` always returns same user
- No password required — completely anonymous

---

### Refresh Token
**POST** `/auth/refresh`

Get a new JWT without re-registering.

**Request:**
```json
{
  "access_token": "existing-jwt-token"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "new-jwt-token",
  "token_type": "bearer"
}
```

---

### Get Profile
**GET** `/auth/me`

**Response:** `200 OK`
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "handle": "Hunter_a7f3b2",
  "email": null,
  "experience_level": "intermediate",
  "preferred_species": "Deer",
  "home_county": "Allegany",
  "home_state": "MD",
  "reputation_score": 42,
  "is_verified_hunter": false
}
```

---

### Update Profile
**PATCH** `/auth/me`

**Request:**
```json
{
  "handle": "BuckMaster_2025",
  "email": "hunter@example.com",
  "experience_level": "advanced",
  "preferred_species": "Deer,Turkey",
  "home_county": "Garrett",
  "home_state": "MD"
}
```

**Response:** `200 OK` (same as Get Profile)

---

## Deer Camp (`/deercamp`)

### Create Camp
**POST** `/deercamp/camps`

Create a new collaborative hunting camp.

**Request:**
```json
{
  "name": "Fall 2025 Hunt",
  "center_lat": 39.5,
  "center_lng": -78.5,
  "linked_land_id": "optional-land-id"
}
```

**Response:** `201 Created`
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440000",
  "name": "Fall 2025 Hunt",
  "invite_code": "A7K9M2P5",
  "center_lat": 39.5,
  "center_lng": -78.5
}
```

**Notes:**
- Creator automatically becomes admin
- Invite code is 8-char alphanumeric, auto-generated
- Can be shared with other users to join

---

### List User's Camps
**GET** `/deercamp/camps`

**Response:** `200 OK`
```json
{
  "camps": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440000",
      "name": "Fall 2025 Hunt",
      "invite_code": "A7K9M2P5",
      "member_count": 3,
      "center_lat": 39.5,
      "center_lng": -78.5,
      "created_at": "2026-04-11T15:30:00+00:00"
    }
  ],
  "count": 1
}
```

---

### Get Camp Details
**GET** `/deercamp/camps/{camp_id}`

Full camp data including members, annotations, photos, activity feed.

**Response:** `200 OK`
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440000",
  "name": "Fall 2025 Hunt",
  "invite_code": "A7K9M2P5",
  "center_lat": 39.5,
  "center_lng": -78.5,
  "default_zoom": 13.0,
  "linked_land_id": null,
  "members": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "Hunter_a7f3b2",
      "role": "admin",
      "color": "#C62828",
      "joined_at": "2026-04-11T15:30:00+00:00"
    }
  ],
  "annotations": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440000",
      "type": "waypoint",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "data": {
        "lat": 39.501,
        "lng": -78.501,
        "icon": "pin",
        "label": "Stand A",
        "notes": "NW facing, good during morning"
      },
      "imported_from_plan_id": null,
      "created_at": "2026-04-11T16:00:00+00:00"
    }
  ],
  "photos": [],
  "activity_feed": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "Hunter_a7f3b2",
      "action": "added_waypoint",
      "annotation_id": "750e8400-e29b-41d4-a716-446655440000",
      "photo_id": null,
      "timestamp": "2026-04-11T16:00:00+00:00"
    }
  ]
}
```

---

### Join Camp
**POST** `/deercamp/camps/join`

Join an existing camp using an invite code.

**Request:**
```json
{
  "invite_code": "A7K9M2P5",
  "username": "optional-display-name"
}
```

**Response:** `200 OK`
```json
{
  "message": "Joined camp",
  "camp_id": "650e8400-e29b-41d4-a716-446655440000",
  "camp_name": "Fall 2025 Hunt"
}
```

---

### Leave Camp
**POST** `/deercamp/camps/{camp_id}/leave`

Leave a camp (admin cannot leave, must delete camp).

**Response:** `200 OK`
```json
{
  "message": "Left camp"
}
```

---

### Delete Camp
**DELETE** `/deercamp/camps/{camp_id}`

Delete a camp (admin only). Cascades delete all members, annotations, photos.

**Response:** `204 No Content`

---

### Add Annotation
**POST** `/deercamp/camps/{camp_id}/annotations`

Add a waypoint, route, area, track, or note to the camp map.

**Request:**
```json
{
  "annotation_type": "waypoint",
  "data": {
    "lat": 39.501,
    "lng": -78.501,
    "icon": "pin",
    "label": "Stand A",
    "notes": "NW facing, good during morning"
  },
  "imported_from_plan_id": null
}
```

**Valid Types:**
- `waypoint` — Single point (lat, lng, icon, label, notes)
- `route` — Line between points (points array, label, distanceMeters)
- `area` — Polygon (polygon array, label, areaAcres)
- `track` — GPS recording (points with timestamp, name, duration)
- `note` — Text note (lat, lng, text)

**Response:** `201 Created`
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440000",
  "type": "waypoint",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "data": { ... },
  "created_at": "2026-04-11T16:00:00+00:00"
}
```

---

### Remove Annotation
**DELETE** `/deercamp/camps/{camp_id}/annotations/{annotation_id}`

Remove an annotation (own or admin).

**Response:** `200 OK`
```json
{
  "message": "Annotation removed"
}
```

---

### Add Photo
**POST** `/deercamp/camps/{camp_id}/photos`

Add a geotagged photo to the camp.

**Request:**
```json
{
  "image_key": "photos/550e8400-e29b-41d4-a716-446655440000/buck-oct-2025.jpg",
  "lat": 39.501,
  "lng": -78.501,
  "caption": "Nice 8-point taken at Stand A"
}
```

**Response:** `201 Created`
```json
{
  "id": "900e8400-e29b-41d4-a716-446655440000",
  "image_key": "photos/550e8400-e29b-41d4-a716-446655440000/buck-oct-2025.jpg",
  "lat": 39.501,
  "lng": -78.501,
  "caption": "Nice 8-point taken at Stand A"
}
```

**Notes:**
- `image_key` is S3/R2 key (upload to R2 first via `/photos/upload`)
- EXIF GPS auto-extracted from image, can override with lat/lng

---

### Remove Photo
**DELETE** `/deercamp/camps/{camp_id}/photos/{photo_id}`

Remove a photo (own or admin).

**Response:** `200 OK`

---

### Get Activity Feed
**GET** `/deercamp/camps/{camp_id}/feed?limit=30`

Get recent actions in the camp (default 30, max 100).

**Response:** `200 OK`
```json
{
  "feed": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "Hunter_a7f3b2",
      "action": "added_waypoint",
      "annotation_id": "750e8400-e29b-41d4-a716-446655440000",
      "photo_id": null,
      "timestamp": "2026-04-11T16:00:00+00:00"
    }
  ],
  "count": 1
}
```

**Action Types:**
- `created_camp`, `joined`, `left`, `renamed_camp`
- `added_waypoint`, `added_route`, `added_area`, `added_track`, `added_note`
- `removed_annotation`, `added_photo`, `removed_photo`
- `imported_plan`, `sent_message`

---

### Offline-First Sync
**POST** `/deercamp/camps/{camp_id}/sync`

Sync camp data for offline-first clients. Client sends `last_synced` timestamp, server returns delta.

**Request:**
```json
{
  "last_synced": "2026-04-11T15:00:00+00:00"
}
```

Or `null` for full sync.

**Response:** `200 OK`
```json
{
  "synced_at": "2026-04-11T16:00:00+00:00",
  "members": [ ... ],           # Full member list (always)
  "new_annotations": [ ... ],   # Only since last_synced
  "new_photos": [ ... ],        # Only since last_synced
  "new_activity": [ ... ]       # Only since last_synced
}
```

---

### AI Camp Intelligence
**POST** `/deercamp/camps/{camp_id}/intelligence`

Analyze camp harvest data and get AI-powered recommendations (requires 50+ data points).

**Request:**
```json
{
  "data_point_count": 145,
  "members_count": 4,
  "species_breakdown": { "Deer": 89, "Turkey": 12 },
  "harvest_locations": [
    { "name": "Ridge Stand", "lat": 39.5, "lng": -78.2, "count": 34 }
  ],
  "time_patterns": { "morning": 65, "midday": 10, "evening": 25 },
  "seasonal_data": [
    { "month": "October", "activity": 45 },
    { "month": "November", "activity": 92 }
  ],
  "weapon_stats": {
    "Archery": { "attempts": 45, "harvests": 12 },
    "Firearms": { "attempts": 32, "harvests": 18 }
  },
  "average_harvest_weight": 187.5,
  "average_antler_points": 7.2,
  "top_stands": [
    { "name": "Ridge Stand", "harvests": 34 }
  ]
}
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "summary": "Your camp shows strong November performance with morning preference...",
  "recommendations": [
    "Focus morning sits during peak rutting (Nov 10-20)",
    "Ridge Stand is your strongest producer — prioritize it"
  ],
  "patterns": [
    "78% of harvests occur in morning (5-10am)",
    "November averages 92% activity — peak month"
  ],
  "predicted_best_days": [
    "Nov 12-15 (Full moon + rut peak)",
    "Nov 20-22 (Post-rut transition)"
  ],
  "strategy_suggestion": "Early morning sits at Ridge Stand during November 10-22 window",
  "analyzed_at": "2026-04-11T16:00:00+00:00",
  "data_point_count": 145,
  "members_count": 4,
  "fallback": false
}
```

**Error (Insufficient Data):**
```json
{
  "detail": "Need at least 50 data points to unlock AI insights. Currently at 12."
}
```

---

## WebSocket Real-Time Sync

### Connect to Camp
**ws://host/ws/camps/{camp_id}?token={jwt_token}**

Establish real-time connection to a camp. All connected members see live updates.

**Connection Established:**
```json
{
  "type": "connection_established",
  "camp_id": "650e8400-e29b-41d4-a716-446655440000",
  "online_members": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "Hunter_a7f3b2"
    }
  ]
}
```

### Send Annotation
```json
{
  "type": "annotation_add",
  "data": {
    "annotation_type": "waypoint",
    "data": { "lat": 39.5, "lng": -78.5, "label": "Stand B" }
  }
}
```

### Send Chat Message
```json
{
  "type": "chat_message",
  "message": "Just saw a doe near Stand A!"
}
```

### Receive Annotation Broadcast
```json
{
  "type": "annotation_add",
  "id": "750e8400-e29b-41d4-a716-446655440000",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "username": "Hunter_a7f3b2",
  "data": { ... },
  "created_at": "2026-04-11T16:00:00+00:00"
}
```

### Receive Chat Broadcast
```json
{
  "type": "chat_message",
  "id": "850e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "Hunter_a7f3b2",
  "color": "#C62828",
  "message": "Just saw a doe near Stand A!",
  "created_at": "2026-04-11T16:00:00+00:00"
}
```

---

## Regulations (`/regulations`)

### Get Seasons
**GET** `/regulations/seasons?species=Deer&county=Garrett&weapon=Archery`

Get hunting seasons filtered by species, county, weapon.

**Response:** `200 OK`
```json
{
  "seasons": [
    {
      "species": "Deer",
      "season_name": "Archery",
      "start_date": "2026-09-01",
      "end_date": "2026-12-31",
      "description": "Archery season for deer..."
    }
  ]
}
```

---

### Search Regulations
**POST** `/regulations/search`

Full-text search regulations.

**Request:**
```json
{
  "query": "antler restrictions",
  "county": "optional",
  "limit": 10
}
```

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": "950e8400-e29b-41d4-a716-446655440000",
      "title": "Antler Restrictions — WMA",
      "content": "Minimum 2 points on one side...",
      "category": "Deer",
      "source": "eRegulations MD 2025"
    }
  ],
  "count": 1
}
```

---

## Lands (`/lands`)

### Search Public Hunting Lands
**GET** `/lands/search?land_type=WMA&species=Deer&weapon=Firearms`

Filter public hunting lands by type, species, weapon, access.

**Response:** `200 OK`
```json
{
  "lands": [
    {
      "id": "md-wma-001",
      "name": "Big Run WMA",
      "land_type": "WMA",
      "acres": 3245,
      "county": "Garrett",
      "lat": 39.5,
      "lng": -78.5,
      "species": ["Deer", "Turkey", "Waterfowl"],
      "weapons": ["Archery", "Firearms"],
      "has_parking": true,
      "sunday_hunting": true,
      "map_url": "https://..."
    }
  ],
  "count": 1
}
```

---

### Get Land Details
**GET** `/lands/{land_id}`

Full land details with parking, contacts, access notes.

**Response:** `200 OK`
```json
{
  "id": "md-wma-001",
  "name": "Big Run WMA",
  "description": "Large WMA in western Maryland...",
  "land_type": "WMA",
  "acres": 3245,
  "county": "Garrett",
  "manager": "Maryland DNR Wildlife & Heritage Service",
  "manager_phone": "(410) 260-8567",
  "manager_email": "dnr.wildlife@maryland.gov",
  "parking": [
    {
      "name": "Lot A",
      "lat": 39.5,
      "lng": -78.5,
      "spaces": 20
    }
  ],
  "access_notes": "No vehicles on trails. Camping allowed with permit.",
  "map_url": "https://dnr.maryland.gov/...",
  "regulations": [ ... ]
}
```

---

## Photos (`/photos`)

### Get Presigned Upload URL
**POST** `/photos/upload`

Get a presigned URL for direct upload to Cloudflare R2.

**Request:**
```json
{
  "filename": "buck-oct-2025.jpg",
  "content_type": "image/jpeg"
}
```

**Response:** `200 OK`
```json
{
  "upload_url": "https://cdn.huntplan.app/upload?token=...",
  "image_key": "photos/550e8400-e29b-41d4-a716-446655440000/buck-oct-2025.jpg",
  "thumbnail_key": "photos/550e8400-e29b-41d4-a716-446655440000/buck-oct-2025-thumb.jpg"
}
```

**Usage:**
1. Get presigned URL
2. Upload file to `upload_url` (PUT)
3. Use `image_key` when creating annotation/photo in camp

---

## Notifications (`/notifications`)

### Register Device Token
**POST** `/notifications/tokens/register`

Register for push notifications.

**Request:**
```json
{
  "platform": "ios",
  "token": "abc123def456..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Token registered"
}
```

---

### Get Preferences
**GET** `/notifications/preferences`

Get notification preferences.

**Response:** `200 OK`
```json
{
  "season_alerts": true,
  "camp_activity": true,
  "regulation_changes": true,
  "weather_alerts": false
}
```

---

### Update Preferences
**PATCH** `/notifications/preferences`

**Request:**
```json
{
  "weather_alerts": true
}
```

**Response:** `200 OK` (same as Get Preferences)

---

## Error Responses

All errors follow standard HTTP status codes:

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Invalid JSON or malformed UUID |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Not a member of camp or admin required |
| 404 | Not Found | Camp/annotation/photo doesn't exist |
| 500 | Internal Server Error | Database error or unhandled exception |

**Error Response Format:**
```json
{
  "detail": "Only admins can delete camps"
}
```

---

## Rate Limiting

Currently not enforced by backend (Cloudflare handles at edge).

Plan:
- 1000 requests/hour per IP for public endpoints
- 10000 requests/hour per authenticated user for private endpoints

---

## Versioning

API version in base URL: `/api/v1`

Breaking changes will increment to `/api/v2` (not planned until Phase 4+).

---

Generated: 2026-04-11
