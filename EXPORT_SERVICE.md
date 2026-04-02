# Export Service Documentation

## Overview

The `exportService` provides on-device GPX/KML/CSV export functionality for Scout plans, recorded tracks, and Deer Camp collaborative maps. All exports are generated locally on the device — no server upload required.

**File Location:** `src/services/exportService.ts`

## Supported Formats

### GPX 1.1 (GPS eXchange Format)
- **Standard:** Open standard for GPS data exchange
- **Use Cases:** Import into OnX, Garmin BaseCamp, Google Earth, mapping apps
- **Supported Elements:**
  - Waypoints (`<wpt>`) — locations with metadata
  - Routes (`<rte>`) — sequences of waypoints
  - Tracks (`<trk>`) — recorded GPS paths with timestamps and elevation
- **Coordinate Format:** lat/lon with 6 decimal places (~10cm precision)
- **Elevation:** Included for recorded tracks (meters)
- **Timestamps:** ISO 8601 format (UTC)

### KML 2.2 (Keyhole Markup Language)
- **Standard:** OGC standard used by Google Earth, Google Maps
- **Use Cases:** Share with collaborators, Google Earth visualization
- **Supported Elements:**
  - Points (`<Point>`) — waypoints
  - LineStrings (`<LineString>`) — routes and tracks
  - Polygons (`<Polygon>`) — drawn areas (closed rings)
- **Styling:** Color-coded by plan or member
- **Coordinate Format:** lon,lat,altitude (KML standard)

### CSV (Comma-Separated Values)
- **Use Cases:** Harvest logs, activity summaries, spreadsheet import
- **Fields:** Species, date, weapon, county, land name, antler points, weight, game check #
- **Escaping:** Proper CSV quoting for fields with commas or quotes

## Core Functions

### Hunt Plan Export

```typescript
export function planToGPX(plan: HuntPlan): string
```
Converts a hunt plan to GPX 1.1 XML. Includes:
- Parking point (if set)
- All waypoints with icon types
- All routes with distance metadata
- All areas as closed route polygons

```typescript
export function planToKML(plan: HuntPlan): string
```
Converts a hunt plan to KML 2.2 XML. Includes:
- Parking point with green marker
- Waypoints as color-coded Placemarks
- Routes as LineStrings with plan color
- Areas as Polygons with fill opacity

### GPS Track Export

```typescript
export function trackToGPX(track: RecordedTrack): string
```
Converts a recorded GPS track to GPX 1.1 with:
- Track segment (`<trkseg>`) containing all points
- Elevation data (if available)
- ISO timestamps for each point
- Total distance and duration in metadata

```typescript
export function trackToKML(track: RecordedTrack): string
```
Converts a recorded GPS track to KML 2.2 with:
- Single Placemark with LineString geometry
- Color-coded red for visibility
- Elevation data in coordinates

### Deer Camp Export

```typescript
export async function shareCamp(camp: DeerCamp, format: 'gpx' | 'kml'): Promise<void>
```
Exports an entire Deer Camp (all shared annotations) to GPX or KML. Includes:
- Waypoints from all members (color-coded)
- Routes from all members
- Areas from all members
- Tracks from all members
- Metadata showing member contributions

```typescript
export function campToGPX(camp: DeerCamp): string
export function campToKML(camp: DeerCamp): string
```
Lower-level functions for generating camp XML without sharing.

### Harvest Log Export

```typescript
export function harvestsToCSV(harvests: HarvestEntry[]): string
```
Converts harvest log entries to CSV. Input shape:
```typescript
interface HarvestEntry {
  species: string;
  date: string;
  weapon: string;
  county: string;
  landName?: string;
  antlerPoints?: number;
  weight?: number;
  gameCheckNumber?: string;
}
```

## Share Functions

All share functions use React Native's `Share` API with fallback support:

```typescript
export async function sharePlan(plan: HuntPlan, format: 'gpx' | 'kml'): Promise<void>
export async function shareTrack(track: RecordedTrack, format: 'gpx' | 'kml'): Promise<void>
export async function shareCamp(camp: DeerCamp, format: 'gpx' | 'kml'): Promise<void>
```

### Share Flow
1. Generate XML content based on format
2. Create filename with sanitized plan/track/camp name
3. Call `Share.share()` to open iOS share sheet
4. User selects destination (Mail, Files, AirDrop, Cloud storage, etc.)
5. File is transferred with appropriate extension (.gpx or .kml)

### Error Handling
- User cancellation is handled silently
- Network/system errors are caught and alerted to user
- Files are generated on-device — no server dependency

## UI Integration

### Scout Screen (PlanSidebar)

The `PlanSidebar` component has been updated with export buttons:

**Plan Actions:**
- Edit
- Export to Camp (existing)
- **Export** → Choose GPX or KML
- Delete

**Track Actions:**
- Export to Camp (existing)
- **Export** → Choose GPX or KML
- Delete

```typescript
// Usage in PlanSidebar.tsx
<TouchableOpacity
  style={styles.actionButton}
  disabled={exportingId === plan.id}
  onPress={() => {
    Alert.alert('Export Plan', 'Choose format:', [
      { text: 'GPX', onPress: () => handleExportPlan(plan, 'gpx') },
      { text: 'KML', onPress: () => handleExportPlan(plan, 'kml') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }}
>
  {exportingId === plan.id ? (
    <ActivityIndicator size="small" color={Colors.sage} />
  ) : (
    <Text style={styles.actionText}>Export</Text>
  )}
</TouchableOpacity>
```

### Deer Camp Screen

The `DeerCampScreen` camp list cards now include export buttons:

**Camp Actions:**
- Tap to open camp map (existing)
- Long-press to delete (existing)
- **Export** → Choose GPX or KML (new)

```typescript
// Usage in DeerCampScreen.tsx
<View style={styles.campCardActions}>
  <TouchableOpacity
    style={styles.campActionBtn}
    disabled={exportingCampId === camp.id}
    onPress={() => {
      Alert.alert('Export Camp', 'Choose format:', [
        { text: 'GPX', onPress: () => handleExportCamp(camp, 'gpx') },
        { text: 'KML', onPress: () => handleExportCamp(camp, 'kml') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }}
  >
    {exportingCampId === camp.id ? (
      <ActivityIndicator size="small" color={Colors.sage} />
    ) : (
      <Text style={styles.campActionText}>Export</Text>
    )}
  </TouchableOpacity>
</View>
```

## Implementation Details

### Coordinate Handling
- **GPX:** Uses WGS84 (EPSG:4326) — lat/lon
- **KML:** Uses WGS84 with lon-first order (KML standard)
- **Precision:** 6 decimal places (~10cm accuracy)

### XML Generation
- All values are properly escaped (`&`, `<`, `>`, `"`, `'`)
- No external XML libraries required
- Template strings with proper indentation for readability
- UTF-8 encoding declared in XML header

### File Naming
```typescript
function sanitizeFilename(name: string): string
```
- Removes/replaces invalid filename characters
- Limits to 50 characters
- Example: "Green Ridge Plan" → "Green_Ridge_Plan.gpx"

### Metadata Preservation
- Plan/track names, descriptions, notes
- Waypoint labels and icon types
- Route styles (solid/dashed/dotted) stored in description
- Area acreage included
- Member colors for camp annotations
- Timestamps for all data points

## Testing

Comprehensive test suite in `src/__tests__/exportService.test.ts`:
- XML structure validation
- Coordinate formatting
- Special character escaping
- CSV field quoting
- Camp annotation export

Run tests:
```bash
npm test -- exportService
```

## Examples

### Exporting a Hunt Plan as GPX
```typescript
const plan = plans[0];
await sharePlan(plan, 'gpx');
// iOS share sheet opens with filename "Plan_Name.gpx"
// User can email, AirDrop, save to Files, etc.
```

### Exporting a GPS Track as KML
```typescript
const track = tracks[0];
await shareTrack(track, 'kml');
// Track opens in Google Earth on another device
```

### Exporting a Deer Camp Collaboratively
```typescript
const camp = camps[0];
await shareCamp(camp, 'gpx');
// All member annotations are included
// Shared collaboratively via email/cloud
```

### Generating CSV Programmatically
```typescript
const harvests = [
  {
    species: 'White-tailed Deer',
    date: '2025-11-15',
    weapon: 'Rifle',
    county: 'Washington',
    antlerPoints: 8,
  },
];

const csv = harvestsToCSV(harvests);
// csv = "Species,Date,Weapon,County,Land Name,Antler Points,Weight (lbs),Game Check #
// White-tailed Deer,2025-11-15,Rifle,Washington,,8,,"
```

## Performance

- **Generation Time:** <100ms for typical plans/tracks
- **Memory:** Strings generated in-memory (no disk I/O until share)
- **Size Limitation:** No limit on number of annotations
- **Device Storage:** Only required during share operation

## Dependencies

- React Native built-in: `Share` API
- No external XML libraries
- No server/backend required
- Works fully offline

## Future Enhancements

Phase 3+:
- Direct file write to Documents via `react-native-fs` (if needed for email)
- WebSocket sync of GPX/KML exports to server
- Community format sharing (standardized camp exports)
- Batch export (multiple plans/camps as ZIP)
- Custom map layer imports from user GPX files

## Troubleshooting

### "Share API Not Available" Error
- Ensure `Share` is imported from `react-native`
- iOS 13+ required (baseline for app)

### File Not Appearing in Mail/Files App
- This is expected behavior — `Share.share()` streams content
- Files are temporary unless user saves them
- Some apps may require specific MIME types (future enhancement)

### Coordinate Precision Loss
- All coordinates are stored and exported with 6 decimal places
- Sufficient for 10cm precision (hunting use case)
- No coordinate transformation needed (WGS84 used throughout)

### Special Characters in Names
- Automatically escaped in XML (`&`, `<`, `>`, `"`, `'`)
- CSV fields quoted if they contain special characters
- Filenames sanitized to remove invalid characters

## Related Files

- **Service:** `src/services/exportService.ts`
- **Components:**
  - `src/components/scout/PlanSidebar.tsx` — Export UI for plans/tracks
  - `src/screens/DeerCampScreen.tsx` — Export UI for camps
- **Tests:** `src/__tests__/exportService.test.ts`
- **Types:**
  - `src/types/scout.ts` — HuntPlan, RecordedTrack
  - `src/types/deercamp.ts` — DeerCamp, SharedAnnotation

---

**Last Updated:** 2026-04-02
**Status:** V2 Complete, Phase 3+ Enhanced
