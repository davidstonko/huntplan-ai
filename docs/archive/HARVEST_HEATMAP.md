# Community Harvest Heatmap Feature

## Overview

The Community Harvest Heatmap is a visual overlay on the Map tab that displays the density of deer harvests across Maryland public hunting lands. This feature helps hunters identify productive areas by visualizing where other community members have had success.

## Features

- **Real-time data visualization**: Circles positioned at land center coordinates
- **Dynamic sizing**: Circle radius scales with harvest counts (more harvests = larger circle)
- **Color-coded intensity**:
  - Low (1-5 harvests): Maryland Gold (mdGold) with 50% opacity
  - Medium (6-15 harvests): Amber with 65% opacity
  - High (16+ harvests): Maryland Red (mdRed) with 80% opacity
- **Harvest count labels**: Displayed at zoom level 10+ for precise harvest data
- **Fallback data**: Local mock data ensures functionality even without backend connectivity

## Architecture

### Components

#### `HarvestHeatmap.tsx` (`src/components/map/HarvestHeatmap.tsx`)

A reusable Mapbox layer component that:
- Accepts `visible: boolean` prop to toggle visibility
- Fetches data from backend or falls back to mock data
- Converts harvest data to GeoJSON FeatureCollection
- Renders Mapbox CircleLayer with data-driven styling
- Displays SymbolLayer labels at higher zoom levels

**Props:**
```typescript
interface HarvestHeatmapProps {
  visible: boolean;  // Controls layer visibility
}
```

**Data Structure:**
```typescript
interface HarvestDataPoint {
  landId: string;           // Land identifier
  landName: string;         // Display name
  center: [number, number]; // [lng, lat]
  harvestCount: number;     // Animals harvested
  species: string;          // e.g., 'Deer'
}
```

### Integration in MapScreen

The heatmap is rendered as a Mapbox ShapeSource + CircleLayer pattern, consistent with existing map layers:

1. **State Management**: `showHarvestHeatmap` boolean state
2. **Toggle Button**: "🦌" emoji button in map controls (top-right corner)
3. **Layer Rendering**: Renders after shooting range markers, before search UI
4. **Responsive**: Shows/hides based on button state

## Usage

### For Users

1. Open the Map tab
2. Click the "🦌" button in the top-right controls to toggle the harvest heatmap
3. View circles representing harvest density:
   - **Gold circles** = Low harvest areas (1-5)
   - **Amber circles** = Medium harvest areas (6-15)
   - **Red circles** = High harvest areas (16+)
4. Tap circles at zoom level 10+ to see exact harvest counts
5. Use alongside other filters to find productive lands

### For Developers

#### Adding Custom Harvest Data

To use live backend data instead of mock data:

1. Implement the backend endpoint:
   ```
   GET /api/v1/harvest/community/stats
   Returns: HarvestDataPoint[]
   ```

2. Update `HarvestHeatmap.tsx` to call the API:
   ```typescript
   const response = await api.client.get<HarvestDataPoint[]>('/api/v1/harvest/community/stats');
   setHarvestData(response.data);
   ```

3. The component automatically falls back to mock data on any error

#### Mock Data

The component includes 20 realistic top-performing WMAs in `MOCK_HARVEST_DATA`:
- Green Ridge SF: 45 deer
- Dan's Mountain WMA: 32 deer
- Savage River SF: 28 deer
- Pocomoke SF: 25 deer
- Indian Springs WMA: 22 deer
- (and 15 more)

All coordinates are approximated to actual land centers in Maryland.

## Styling & Theming

All colors use the theme system from `theme/colors.ts`:
- **mdRed**: `#E03C31` — High harvest indicator
- **mdGold**: `#FFD700` — Low harvest indicator
- **amber**: `#D4913D` — Medium harvest indicator
- **mdBlack**: `#1C1C1C` — Label text
- **mdWhite**: `#F5F5DC` — Label halo

Circle rendering uses Mapbox data-driven styling:
```javascript
circleColor: ['get', 'color'],           // Per-feature color
circleRadius: [interpolation],           // Scales with harvest count
circleOpacity: ['get', 'opacity'],       // Per-feature opacity
circleStrokeColor: '#FFFFFF',            // White outline for contrast
circleStrokeWidth: 1.5,                  // Subtle border
```

## Data Pipeline

### Backend (Phase 3+)

The harvest endpoint should return anonymized harvest statistics:
```json
[
  {
    "landId": "green-ridge-sf",
    "landName": "Green Ridge State Forest",
    "center": [-78.5234, 39.6543],
    "harvestCount": 45,
    "species": "Deer"
  },
  ...
]
```

Data sources:
- MD DNR harvest reports (seasonal aggregates)
- Community submissions (if user harvest logging is implemented)
- Third-party harvest databases

### Local Fallback

If the backend is unavailable, the component uses `MOCK_HARVEST_DATA` automatically. This ensures the feature always works offline.

## Performance Considerations

- **GeoJSON creation**: O(n) where n = number of lands with harvest data
- **Mapbox rendering**: Optimized for 20-100 points per view
- **Data fetching**: Happens once when heatmap is toggled on
- **Layer visibility**: Toggling is instant (Mapbox layer show/hide)

## Future Enhancements

1. **Real-time updates**: WebSocket or push notifications for live harvest data
2. **Temporal filtering**: Filter by season, month, or day of week
3. **Species-specific heatmaps**: Toggle between Deer, Turkey, Waterfowl, etc.
4. **User contribution**: Allow hunters to log their own harvests (Phase 3+)
5. **Heatmap gradient**: Smooth color interpolation instead of discrete levels
6. **Clustering**: Group points at lower zoom levels for clarity
7. **Trend analysis**: Show year-over-year harvest changes

## Testing

### Manual Testing Checklist

- [ ] Tap 🦌 button to toggle heatmap on/off
- [ ] Verify circles appear at correct land centers
- [ ] Check circle colors match harvest intensity (gold/amber/red)
- [ ] Zoom in to level 10+ to see harvest count labels
- [ ] Verify labels disappear when zooming below level 10
- [ ] Test offline mode (mock data displays)
- [ ] Verify layer renders above ranges but below search results
- [ ] Test with different map styles (satellite/topographic)
- [ ] Verify button highlights when heatmap is active

### Unit Tests (Future)

```typescript
// Test color assignment
const color1 = getHarvestColor(3);    // Should be mdGold with 0.5 opacity
const color16 = getHarvestColor(16);  // Should be mdRed with 0.8 opacity

// Test GeoJSON generation
const geojson = createHarvestGeoJSON(mockData);
expect(geojson.features.length).toBe(mockData.length);
expect(geojson.features[0].geometry.type).toBe('Point');
```

## Accessibility

- **Toggle button**: ARIA switch role, checked state exposed
- **Labels**: Screen reader announces harvest counts at zoom 10+
- **Color contrast**: White outlines ensure circles visible on all backgrounds
- **Keyboard navigation**: Toggle button is keyboard accessible

## Troubleshooting

### Circles not appearing
- Check if `showHarvestHeatmap` state is `true`
- Verify lands data has valid `center` coordinates
- Ensure MapboxGL is initialized
- Check console for fetch errors (will log and fall back to mock data)

### Wrong colors displaying
- Verify `Colors` are imported correctly from `theme/colors.ts`
- Check harvest count thresholds (1-5, 6-15, 16+)
- Ensure GeoJSON features have `color` and `opacity` properties

### Labels not showing
- Labels only display at zoom level 10+; try zooming in
- Check `minZoomLevel={10}` on SymbolLayer
- Verify harvest counts are serializable to text

### Performance issues
- Limit to top N lands if dataset grows (consider clustering)
- Use Mapbox layer filters to reduce rendered features
- Profile with React DevTools to check re-render frequency

## Files Modified

- `src/components/map/HarvestHeatmap.tsx` — New component
- `src/screens/MapScreen.tsx` — Integration (import, state, layer, button)

## Related Documentation

- [MapScreen.tsx](./src/screens/MapScreen.tsx) — Main map interface
- [Map Architecture](./ARCHITECTURE.md#map-layer-system) — Layer system design
- [Colors Theme](./src/theme/colors.ts) — Color palette reference
- [API Service](./src/services/api.ts) — Backend communication

## Version History

- **v1.0.0** (2026-04-02): Initial implementation with mock data and mdGold/amber/mdRed gradient
