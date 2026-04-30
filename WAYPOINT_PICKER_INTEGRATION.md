# WaypointPicker Integration Guide

## Overview

The new **WaypointPicker** component (`src/components/scout/WaypointPicker.tsx`) replaces the old horizontal emoji scroll with a professional, organized interface for selecting from 60+ waypoint types.

## Features

✓ **12 category tabs** with horizontal scroll (Deer, Turkey, Bear, Predator, Small Game, Waterfowl, Sika, Hunt Events, Setup, Habitat, Access, General)
✓ **3-column type grid** showing all waypoints in the selected category with icons and labels
✓ **Photo button** (placeholder for react-native-image-picker integration)
✓ **Notes field** with 300-character limit
✓ **Auto-captured timestamp** (ISO format)
✓ **Share to Deer Camp toggle** (shown when plan is linked to a camp)
✓ **TypeScript strict mode** — no `any`, fully typed
✓ **Dark theme** with MD colors (gold, black, tan)
✓ **Scrollable content** for small devices

## Component API

```typescript
export interface WaypointPickerResult {
  type: HuntWaypointType;        // Selected waypoint type (e.g., 'stand', 'buck', 'scrape')
  notes: string;                  // User notes (may be empty)
  photoUri?: string;              // Photo URI (optional, not yet captured)
  observedAt: string;             // ISO timestamp (auto-filled at open time)
  sharedToCamp: boolean;          // True if user wants to share to linked camp
}

interface WaypointPickerProps {
  visible: boolean;               // Controls modal visibility
  onConfirm: (config: WaypointPickerResult) => void;  // Called when "Place on Map" is pressed
  onCancel: () => void;           // Called when modal is dismissed
  linkedCampId?: string;          // If provided, shows "Share to Deer Camp" toggle
}
```

## Usage in ScoutScreen

```tsx
import { WaypointPicker, WaypointPickerResult } from '../components/scout/WaypointPicker';

export default function ScoutScreen() {
  const [waypointPickerVisible, setWaypointPickerVisible] = useState(false);

  const handleOpenWaypointPicker = () => {
    setWaypointPickerVisible(true);
  };

  const handleWaypointConfirm = (result: WaypointPickerResult) => {
    // Create waypoint with selected type and metadata
    const newWaypoint = {
      id: uuid(),
      type: result.type,
      label: getWaypointLabel(result.type),
      lat: mapCenter.latitude,  // User will have tapped map
      lng: mapCenter.longitude,
      notes: result.notes,
      photoUri: result.photoUri,
      observedAt: result.observedAt,
      sharedToCamp: result.sharedToCamp,
      createdAt: new Date().toISOString(),
    };

    // Add to current plan's waypoints
    addWaypointToPlan(activePlanId, newWaypoint);
    setWaypointPickerVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Map and other UI */}

      {/* Render picker as modal overlay */}
      <WaypointPicker
        visible={waypointPickerVisible}
        onConfirm={handleWaypointConfirm}
        onCancel={() => setWaypointPickerVisible(false)}
        linkedCampId={activePlanDeerCampId}  // If plan is linked to a camp
      />

      {/* Toolbar button to trigger picker */}
      <TouchableOpacity
        style={styles.addWaypointButton}
        onPress={handleOpenWaypointPicker}
      >
        <Text style={styles.buttonText}>+ Add Waypoint</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Integration Checklist

- [ ] Import `WaypointPicker` and `WaypointPickerResult` in ScoutScreen
- [ ] Add `waypointPickerVisible` state
- [ ] Render `<WaypointPicker />` as a modal overlay
- [ ] Connect "Place on Map" confirmation to waypoint creation logic
- [ ] Replace old emoji picker horizontal scroll with new picker
- [ ] Test with 60+ waypoint types across all 12 categories
- [ ] Test photo capture placeholder (Phase 6: integrate react-native-image-picker)
- [ ] Test "Share to Deer Camp" toggle behavior
- [ ] Verify TypeScript compilation: `npx tsc --noEmit` (0 errors)

## Styling

All colors imported from `theme/colors.ts`:
- **Background:** `Colors.surface`
- **Primary text:** `Colors.textPrimary` (fawn #D4B896)
- **Secondary text:** `Colors.textSecondary` (sand)
- **Category active color:** Per-category color from `WAYPOINT_CATEGORIES`
- **Selected type border:** `Colors.mdGold` (#FFD700)
- **"Place on Map" button:** `Colors.mdGold` background + `Colors.mdBlack` text

## Icon System

Uses the glyph-based `WaypointIcon` component from `src/components/icons/WaypointIcons.tsx`:

```tsx
<WaypointIcon
  iconKey={item.iconKey}      // From registry (e.g., 'tree_stand', 'buck')
  size={40}                   // Size in pixels
  color={item.color}          // From WAYPOINT_CATEGORIES or entry
  backgroundColor={Colors.surface}
  showBorder={isSelected}     // MD gold border when selected
/>
```

Each of the 60+ waypoint types has a unique icon key and color mapping in `HUNT_WAYPOINT_REGISTRY`.

## Photo Capture (Phase 6)

Currently shows a placeholder alert. Next phase will integrate:

```tsx
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const handleAddPhoto = async () => {
  const result = await launchImageLibrary({ mediaType: 'photo' });
  if (result.assets && result.assets[0]) {
    setPhotoUri(result.assets[0].uri);
  }
};
```

## Notes

- Waypoint types are defined in `src/types/huntWaypoints.ts` (60+ types across 12 categories)
- Categories automatically filtered to active ones via `getActiveCategories()`
- Component state resets after each confirmation
- Type selection required before "Place on Map" button is enabled
- All exports named and typed for strict mode compliance

## Files

- **Component:** `src/components/scout/WaypointPicker.tsx` (563 lines)
- **Types:** `src/types/huntWaypoints.ts` (315 lines, registry + helpers)
- **Icons:** `src/components/icons/WaypointIcons.tsx` (207 lines, glyph system)
- **Colors:** `src/theme/colors.ts` (118 lines, dark theme palette)

---

**Status:** Phase 5C — Ready for ScoutScreen integration and app-wide testing.
