# WatermelonDB Module

This directory contains the complete WatermelonDB database layer for offline-first persistence in MDHuntFishOutdoors.

## Quick Start

### Accessing the Database in a Component

```typescript
import { useDatabase } from '@nozbe/watermelondb/react';
import { HuntPlanModel } from '@/db/models';

export const MyComponent = () => {
  const database = useDatabase();

  // Fetch all hunt plans
  const plans = await database.get<HuntPlanModel>('hunt_plans').query().fetch();

  // Create a new plan
  const newPlan = await database.write(async () => {
    return await database.get<HuntPlanModel>('hunt_plans').create((plan) => {
      plan.name = 'My Hunt';
      plan.color = '#FF6B6B';
      plan.visible = true;
      plan.createdAt = new Date();
      plan.updatedAt = new Date();
    });
  });

  return <View>{/* ... */}</View>;
};
```

### Using Observables for Reactive Queries

```typescript
import { withObservables } from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { HuntPlanModel } from '@/db/models';

const enhance = withObservables(['database'], ({ database }) => ({
  plans$: database.get<HuntPlanModel>('hunt_plans')
    .query(Q.where('visible', true))
    .observeWithColumns(['updated_at']),
}));

export const PlanListComponent = enhance(({ plans$ }) => {
  return (
    <View>
      <Observable stream={plans$}>
        {(plans) => (
          <FlatList
            data={plans}
            renderItem={({ item }) => <PlanItem plan={item} />}
          />
        )}
      </Observable>
    </View>
  );
});
```

## File Structure

```
src/db/
├── schema.ts                  # WatermelonDB schema with 10 tables
├── index.ts                   # Database initialization & exports
├── DatabaseProvider.tsx       # React context provider
├── models/
│   ├── index.ts               # Model exports
│   ├── HuntPlanModel.ts       # Hunt plans
│   ├── WaypointModel.ts       # Waypoints
│   ├── RouteModel.ts          # Routes
│   ├── DrawnAreaModel.ts      # Drawn areas
│   ├── RecordedTrackModel.ts  # GPS tracks
│   ├── DeerCampModel.ts       # Camps
│   ├── CampMemberModel.ts     # Camp members
│   ├── SharedAnnotationModel.ts # Shared annotations
│   ├── CampPhotoModel.ts      # Photos
│   └── ActivityFeedModel.ts   # Activity logs
└── README.md                  # This file
```

## Models Overview

### Hunt Planning Models

#### HuntPlanModel
Represents a hunt planning session with optional parking location and notes.

**Fields:**
- `name: string` — Plan name
- `color: string` — Color hex code
- `visible: boolean` — Visibility toggle
- `parkingLat?: number` — Parking latitude
- `parkingLng?: number` — Parking longitude
- `parkingLabel?: string` — Parking location name
- `notes?: string` — Plan notes
- `createdAt: Date` — Creation timestamp
- `updatedAt: Date` — Last update timestamp

**Relations:**
- `waypoints` — Has many waypoints
- `routes` — Has many routes
- `drawnAreas` — Has many drawn areas

#### WaypointModel
A single map marker within a hunt plan.

**Fields:**
- `planId: string` — Reference to parent plan
- `label: string` — Marker label
- `lat: number` — Latitude
- `lng: number` — Longitude
- `icon?: string` — Icon identifier
- `createdAt: Date` — Creation timestamp

#### RouteModel
A polyline with ordered points.

**Fields:**
- `planId: string` — Reference to parent plan
- `label: string` — Route label
- `pointsJson: string` — JSON-serialized [{ lat, lng }]
- `color?: string` — Color hex code
- `createdAt: Date` — Creation timestamp

**Helper Methods:**
- `get points()` — Parses JSON points
- `setPoints(points)` — Serializes points to JSON

#### DrawnAreaModel
A polygonal area annotation.

**Fields:**
- `planId: string` — Reference to parent plan
- `label: string` — Area label
- `pointsJson: string` — JSON-serialized polygon
- `color?: string` — Color hex code
- `createdAt: Date` — Creation timestamp

**Helper Methods:**
- `get points()` — Parses JSON points
- `setPoints(points)` — Serializes points to JSON

#### RecordedTrackModel
A GPS-recorded track with distance and elevation metrics.

**Fields:**
- `name: string` — Track name
- `pointsJson: string` — JSON-serialized track points
- `distanceMeters: number` — Total distance
- `durationSeconds: number` — Total duration
- `elevationGain?: number` — Elevation gained
- `elevationLoss?: number` — Elevation lost
- `visible: boolean` — Visibility toggle
- `createdAt: Date` — Creation timestamp

**Helper Methods:**
- `get points()` — Parses JSON points
- `setPoints(points)` — Serializes points to JSON
- `get durationFormatted()` — "3h 25m" format
- `get speedMph()` — Calculated speed

### Deer Camp Models

#### DeerCampModel
A collaborative camp shared between hunting partners.

**Fields:**
- `name: string` — Camp name
- `createdBy: string` — Creator user ID
- `linkedLandId?: string` — Linked public land ID
- `centerLat: number` — Map center latitude
- `centerLng: number` — Map center longitude
- `defaultZoom: number` — Default zoom level
- `inviteCode?: string` — Invite code for sharing
- `createdAt: Date` — Creation timestamp
- `updatedAt: Date` — Last update timestamp

**Relations:**
- `members` — Has many camp members
- `annotations` — Has many shared annotations
- `photos` — Has many photos
- `activityFeed` — Has many feed entries

#### CampMemberModel
A user membership in a camp.

**Fields:**
- `campId: string` — Reference to camp
- `userId: string` — User ID
- `username: string` — Username
- `role: string` — "admin" or "member"
- `color: string` — Member color (hex or theme key)
- `joinedAt: Date` — Join timestamp

#### SharedAnnotationModel
Polymorphic annotation (waypoint, route, area, or track) shared in a camp.

**Fields:**
- `campId: string` — Reference to camp
- `annotationType: string` — "waypoint" | "route" | "area" | "track"
- `createdBy: string` — Creator user ID
- `dataJson: string` — Full annotation payload
- `importedFromPlanId?: string` — Plan ID if imported
- `createdAt: Date` — Creation timestamp

**Helper Methods:**
- `get data()` — Parses JSON payload
- `setData(data)` — Serializes payload to JSON

#### CampPhotoModel
A geotagged photo in a camp.

**Fields:**
- `campId: string` — Reference to camp
- `uploadedBy: string` — Uploader user ID
- `username: string` — Uploader username
- `uri: string` — Photo file URI
- `thumbnailUri?: string` — Thumbnail URI
- `lat: number` — Latitude
- `lng: number` — Longitude
- `caption?: string` — Photo caption
- `createdAt: Date` — Upload timestamp

#### ActivityFeedModel
An activity log entry in a camp.

**Fields:**
- `campId: string` — Reference to camp
- `userId: string` — User ID
- `username: string` — Username
- `action: string` — Action type (e.g., "added_waypoint", "uploaded_photo")
- `annotationId?: string` — Referenced annotation
- `photoId?: string` — Referenced photo
- `createdAt: Date` — Timestamp

**Helper Methods:**
- `get actionLabel()` — Human-readable action label

## Common Queries

### Fetch All Hunt Plans
```typescript
const plans = await database.get<HuntPlanModel>('hunt_plans').query().fetch();
```

### Fetch Visible Plans Only
```typescript
import { Q } from '@nozbe/watermelondb';

const plans = await database.get<HuntPlanModel>('hunt_plans')
  .query(Q.where('visible', true))
  .fetch();
```

### Fetch Plan with Relations
```typescript
const plan = await database.get<HuntPlanModel>('hunt_plans')
  .find(planId);

const waypoints = await plan.waypoints.fetch();
const routes = await plan.routes.fetch();
```

### Create and Update
```typescript
// Create
const plan = await database.write(async () => {
  return await database.get<HuntPlanModel>('hunt_plans').create((p) => {
    p.name = 'Spring Hunt';
    p.color = '#FF6B6B';
    p.createdAt = new Date();
    p.updatedAt = new Date();
  });
});

// Update
await database.write(async () => {
  await plan.update((p) => {
    p.name = 'Updated Name';
    p.updatedAt = new Date();
  });
});
```

### Delete
```typescript
await database.write(async () => {
  await plan.destroyPermanently();
});
```

## Performance Tips

1. **Use Observables for Lists** — Automatic re-renders on changes
2. **Eager Load Relations** — Load related records in the same query
3. **Batch Writes** — Group multiple operations in a single `database.write()`
4. **Query Filters** — Use `Q` to reduce fetched records
5. **Pagination** — Use `.query().skip(offset).take(limit)` for large lists

## Offline-First Strategy

- **All data is stored locally** in SQLite
- **No network required** for basic features
- **Backend sync** happens in Phase 3+
- **Conflict resolution** uses last-write-wins + sync service logic
- **Data is cleared only on app uninstall**

## Future Enhancements

- Real-time sync with backend (Phase 3)
- GPX/KML export from recorded tracks
- Photo thumbnail generation and caching
- Indexed full-text search on plan notes
- Archive/restore camp functionality

---

**Last Updated:** 2026-04-01
**Status:** Production Ready
