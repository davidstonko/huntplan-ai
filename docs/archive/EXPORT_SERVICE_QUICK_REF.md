# Export Service - Quick Reference Card

## Installation & Setup

No additional packages needed. Service uses:
- React Native's built-in `Share` API
- Native TypeScript (no external XML libraries)

## Core Functions

### Hunt Plan Export
```typescript
import { sharePlan } from './services/exportService';

// Share plan as GPX or KML
await sharePlan(plan, 'gpx');  // Opens iOS share sheet
await sharePlan(plan, 'kml');
```

### GPS Track Export
```typescript
import { shareTrack } from './services/exportService';

await shareTrack(track, 'gpx');
await shareTrack(track, 'kml');
```

### Deer Camp Export
```typescript
import { shareCamp } from './services/exportService';

await shareCamp(camp, 'gpx');
await shareCamp(camp, 'kml');
```

### Generate Without Sharing
```typescript
import { planToGPX, planToKML, trackToGPX, trackToKML, campToGPX, campToKML } from './services/exportService';

const gpxString = planToGPX(plan);
const kmlString = planToKML(plan);
// Use strings for further processing (email, copy to clipboard, etc.)
```

### Harvest Log CSV
```typescript
import { harvestsToCSV } from './services/exportService';

const csv = harvestsToCSV([
  {
    species: 'White-tailed Deer',
    date: '2025-11-15',
    weapon: 'Rifle',
    county: 'Washington',
    antlerPoints: 8,
    weight: 185,
  },
]);
// csv = "Species,Date,Weapon,County,...\nWhite-tailed Deer,2025-11-15,Rifle,Washington,..."
```

## UI Integration Patterns

### With Alert Format Selection
```typescript
const handleExport = async (item, exportFn) => {
  Alert.alert('Export Format', 'Choose format:', [
    { text: 'GPX', onPress: () => exportFn(item, 'gpx') },
    { text: 'KML', onPress: () => exportFn(item, 'kml') },
    { text: 'Cancel', style: 'cancel' },
  ]);
};
```

### With Loading State
```typescript
const [exporting, setExporting] = useState(false);

const handleExport = async (plan, format) => {
  try {
    setExporting(true);
    await sharePlan(plan, format);
    Alert.alert('Success', `Plan exported as ${format.toUpperCase()}`);
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setExporting(false);
  }
};
```

## What Gets Exported

### Hunt Plans
- Parking point location
- All waypoints with icons and labels
- All routes with distances
- All areas (polygons)
- Plan metadata (name, notes, creation date)

### GPS Tracks
- All recorded points with coordinates
- Elevation data (if available)
- Timestamps (UTC, ISO 8601)
- Total distance and duration
- Track metadata (name, date)

### Deer Camps
- All member waypoints with their colors
- All member routes and areas
- All member GPS tracks
- Photos (location pins)
- Activity feed metadata

## File Format Details

### GPX 1.1
- **File Extension:** `.gpx`
- **Compatible With:** OnX Maps, Garmin, Google Earth, most GIS software
- **Coordinate Format:** lat/lon, 6 decimal places
- **Elevation:** Included for tracks (meters)
- **Timestamps:** ISO 8601 (UTC)

### KML 2.2
- **File Extension:** `.kml`
- **Compatible With:** Google Earth, Google Maps, most mapping apps
- **Coordinate Format:** lon,lat,altitude (KML standard)
- **Styling:** Color-coded per plan/member
- **Features:** Placemarks, LineStrings, Polygons with OGC styling

### CSV
- **File Extension:** `.csv`
- **Standard:** RFC 4180
- **Escaping:** Proper quoting for special characters
- **Use:** Import into Excel, spreadsheets, databases

## Error Handling

All share functions handle errors gracefully:
```typescript
try {
  await sharePlan(plan, 'gpx');
} catch (error) {
  if (error.message.includes('dismissal')) {
    // User cancelled share sheet — OK
  } else {
    // Real error occurred
    Alert.alert('Export Failed', error.message);
  }
}
```

## Performance Tips

- Export generation takes <100ms
- No network calls (fully local)
- String generation is memory-efficient
- Safe for multiple concurrent exports
- No impact on app performance

## Coordinate Precision

- **6 decimal places** = ~10cm accuracy at equator
- **Good for:** Hunting, scouting, land boundaries
- **Not suitable for:** Survey-grade work (need 8+ decimals)

## Filename Sanitization

Filenames are automatically sanitized:
- Invalid characters replaced with underscores
- Length limited to 50 characters
- Example: "Green Ridge 2026 Plan" → "Green_Ridge_2026_Plan.gpx"

## Special Characters

All XML special characters are properly escaped:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&apos;`

CSV fields with commas/quotes are automatically quoted.

## Use Cases

### Scouting Workflow
1. Create hunt plan in Scout tab
2. Record waypoints (stands, water crossings)
3. Record GPS track while scouting
4. Export track as GPX → Share via email to self
5. Import GPX into OnX for future reference

### Team Collaboration
1. Create Deer Camp
2. Invite team members
3. Each member adds waypoints/tracks
4. Export camp as GPX → Share with group
5. Everyone imports into their GPS device

### Record Keeping
1. Create plan for each hunting location
2. Export as KML → Save in cloud storage
3. Build searchable library of past locations
4. Track patterns over seasons

### Data Analysis
1. Collect harvest data (species, weapon, location)
2. Export as CSV → Import into Excel
3. Analyze seasonal patterns, success rates

## Troubleshooting

**Q: File not appearing in Mail?**
A: iOS share sheet streams content. Some apps require file extension metadata (future enhancement).

**Q: Coordinates look wrong?**
A: Verify WGS84 (EPSG:4326) is selected in receiving app.

**Q: CSV has extra quotes?**
A: This is correct RFC 4180 behavior. Spreadsheet apps will display properly.

**Q: Special characters showing as symbols?**
A: XML entities are rendering correctly. Apps will interpret them automatically.

## Related Files

- **Service:** `src/services/exportService.ts`
- **Documentation:** `EXPORT_SERVICE.md`
- **UI Components:**
  - `src/components/scout/PlanSidebar.tsx`
  - `src/screens/DeerCampScreen.tsx`
- **Types:**
  - `src/types/scout.ts`
  - `src/types/deercamp.ts`

---

**Version:** 1.0
**Last Updated:** 2026-04-02
**Status:** Production Ready
