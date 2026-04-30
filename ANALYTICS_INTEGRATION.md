# Analytics & Crash Reporting Integration Guide

## Overview

Created comprehensive crash reporting and analytics services for MDHuntFishOutdoors to track app performance, user engagement, and conversion metrics.

### Files Created

#### Mobile (React Native + TypeScript)
1. **`src/services/crashReportingService.ts`** — Sentry crash reporting integration
   - Graceful fallback if SDK not installed
   - Privacy-conscious: no PII, anonymous device ID only
   - Error capture with context
   - Breadcrumbs for debugging
   - Performance transaction tracking

2. **`src/services/analyticsService.ts`** — Lightweight offline-first analytics
   - 8 event types: screen_view, feature_used, affiliate_tap, search, filter_change, plan_created, trip_planned, error
   - AsyncStorage-backed event queue (max 500 events)
   - Auto-flush every 60 seconds
   - Batch submission to backend
   - Privacy: anonymous session ID + device ID only

#### Backend (FastAPI + Python)
3. **`backend/app/modules/analytics/__init__.py`** — Module initialization
4. **`backend/app/modules/analytics/routes.py`** — Analytics API endpoint
   - `POST /api/v1/analytics/events` — Receive event batches from mobile
   - Validates batch format (max 100 events per request)
   - Rate limiting via IP tracking (MVP)
   - In-memory event store (10k max, drops oldest 10% when full)
   - `/analytics/summary` endpoint for debugging
   - `/analytics/health` endpoint for monitoring

## Installation & Setup

### Step 1: Install Sentry SDK (Optional but Recommended)

```bash
cd /path/to/huntmaryland-build
npm install @sentry/react-native
```

The crash reporting service will gracefully degrade with console.warn if the SDK is not available.

### Step 2: Register Analytics Router in Backend

Edit `backend/app/main.py` and add:

```python
# At top with other imports
from app.modules.analytics.routes import router as analytics_router

# In the router registration section (around line 145)
app.include_router(analytics_router, tags=["Analytics"])
```

The router already has `prefix="/api/v1/analytics"` defined internally.

### Step 3: Initialize Services in App.tsx

```typescript
import { initializeCrashReporting, captureMessage } from '@/services/crashReportingService';
import { initializeAnalytics, trackScreenView } from '@/services/analyticsService';
import DeviceInfo from 'react-native-device-info';

// In your app startup (App.tsx)
export default function App() {
  useEffect(() => {
    const initServices = async () => {
      // Initialize crash reporting
      initializeCrashReporting(
        'https://your-sentry-dsn@sentry.io/project-id',
        {
          environment: __DEV__ ? 'development' : 'production',
          tracesSampleRate: 0.1,
        }
      );

      // Initialize analytics
      const deviceId = await DeviceInfo.getUniqueId();
      const version = await DeviceInfo.getVersion();
      await initializeAnalytics(deviceId, version, 60000);

      captureMessage('App initialized', 'info');
    };

    initServices().catch(console.error);
  }, []);

  // ... rest of app
}
```

### Step 4: Add Event Tracking to Screens

```typescript
import { trackScreenView, trackFeatureUsed } from '@/services/analyticsService';
import { useFocusEffect } from '@react-navigation/native';

// In each screen component
export const MyScreen: React.FC = () => {
  useFocusEffect(
    useCallback(() => {
      trackScreenView('MyScreen', { tab: 'hunt' }).catch(console.error);
      return () => {}; // cleanup
    }, [])
  );

  const handleButtonPress = () => {
    trackFeatureUsed('my_feature', { action: 'button_press' }).catch(console.error);
  };

  return (
    <View>
      <Button onPress={handleButtonPress} title="Click Me" />
    </View>
  );
};
```

### Step 5: Track High-Value Events

```typescript
import { trackAffiliateTap, trackTripPlanned, trackPlanCreated } from '@/services/analyticsService';

// In gear picks screen
const handleGearLink = (productName: string, asin: string) => {
  trackAffiliateTap(productName, asin, 'gear_picks').catch(console.error);
  Linking.openURL(`https://amazon.com/dp/${asin}?tag=mdoutdoors-20`);
};

// In trip planner
const handleTripGenerated = (type: string, season: string, items: number) => {
  trackTripPlanned(type, season, items).catch(console.error);
};

// In scout plan creation
const handlePlanSaved = () => {
  trackPlanCreated('hunt_plan', { 
    location: 'WMA-001',
    season: 'rifle'
  }).catch(console.error);
};
```

## API Specification

### Mobile → Backend: Submit Events

**Endpoint:** `POST /api/v1/analytics/events`

**Request Body:**
```json
{
  "events": [
    {
      "id": "1234567890_abc123xyz",
      "type": "screen_view",
      "screenName": "MapScreen",
      "timestamp": 1712750400000,
      "sessionId": "device-uuid-1234",
      "appVersion": "2.1.0",
      "metadata": {
        "tab": "hunt",
        "filterCount": 3
      }
    },
    {
      "id": "1234567891_def456uvw",
      "type": "affiliate_tap",
      "productName": "Gobstopper Decoy",
      "asin": "B0D1X2Y3Z4",
      "category": "decoys",
      "timestamp": 1712750450000,
      "sessionId": "device-uuid-1234",
      "appVersion": "2.1.0"
    }
  ],
  "device_id": "device-uuid-1234",
  "app_version": "2.1.0",
  "platform": "iOS"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "events_received": 2,
  "message": "Received 2 events"
}
```

**Error Responses:**
- `400` — Empty event list, malformed event, or too many events (>100)
- `429` — Rate limit exceeded
- `500` — Server error

### Backend Debugging Endpoints

**Get Summary Stats:**
```
GET /api/v1/analytics/summary
```

Response:
```json
{
  "total_events": 1234,
  "by_type": {
    "screen_view": 800,
    "feature_used": 250,
    "affiliate_tap": 184
  },
  "note": "In production, this data would come from PostgreSQL"
}
```

**Health Check:**
```
GET /api/v1/analytics/health
```

Response:
```json
{
  "status": "healthy",
  "stored_events": 1234,
  "max_stored": 10000
}
```

## Event Types Reference

### screen_view
Track screen navigation.

```typescript
trackScreenView('MapScreen', {
  mode: 'hunt',
  filters_active: 3
});
```

### feature_used
Track feature engagement (gear picks, trip planner, etc.).

```typescript
trackFeatureUsed('trip_planner', {
  trip_type: 'backpacking',
  season: 'summer'
});
```

### affiliate_tap
Track Amazon affiliate link clicks for conversion analysis.

```typescript
trackAffiliateTap('Gobstopper Decoy', 'B0D1X2Y3Z4', 'decoys');
```

### search
Track search queries and result counts.

```typescript
trackSearch('WMA deer', 25);
```

### filter_change
Track filter application.

```typescript
trackFilterChange('species', {
  active_filters: ['deer', 'turkey'],
  filter_count: 2
});
```

### plan_created
Track hunt/fish/camping plan creation.

```typescript
trackPlanCreated('hunt_plan', {
  location: 'WMA-001',
  season: 'rifle',
  weapon: 'firearms'
});
```

### trip_planned
Track trip planner usage (AT backpacking, camping trips, etc.).

```typescript
trackTripPlanned('at_backpacking', 'summer', 32); // 32 gear items
```

### error
Track non-fatal errors.

```typescript
trackError('Failed to load regulations', 'RegulationsScreen');
```

## Privacy & Data Policy

### What We Collect
- **Anonymous event data only** (no PII)
- Event type, timestamp, feature name
- Affiliate product taps (ASIN, product name, category)
- Search queries (for feature improvement, not user identification)
- Non-fatal errors
- Device ID (anonymous UUID)
- App version, platform

### What We Never Collect
- User location (GPS)
- Email addresses, usernames, names
- Passwords, tokens, API keys
- Sensitive user data
- Browser history
- Photo/file contents

### Data Retention
- In MVP, events stored in memory (max 10k)
- Production: PostgreSQL backend (retention policy TBD)
- Users can opt-out via App Settings (future)

### User Notice
Add to app privacy policy:

> MDHuntFishOutdoors collects anonymous usage analytics to improve features and understand user engagement. We collect no personally identifiable information. Analytics data may include screen views, feature usage, product recommendations clicked, and non-fatal error reports. All data is associated with anonymous session IDs only. You can disable analytics reporting in App Settings.

## Development Notes

### Testing Analytics Locally

```typescript
import { getEventQueue, getAnalyticsStatus } from '@/services/analyticsService';

// Check pending events
const queue = await getEventQueue();
console.log('Pending events:', queue.length);

// Get status
const status = await getAnalyticsStatus();
console.log('Analytics status:', status);

// Manually trigger flush (for testing)
import { flushEvents } from '@/services/analyticsService';
await flushEvents();
```

### Crash Reporting Debug

```typescript
import { getCrashReportingStatus, captureException } from '@/services/crashReportingService';

const status = getCrashReportingStatus();
console.log('Crash reporting:', status);

// Test error capture
captureException(new Error('Test error'), { context: 'test_screen' });
```

### Common Issues

**Analytics not flushing?**
- Check network connectivity (app requires internet to send)
- Verify backend endpoint is running: `curl http://localhost:8000/api/v1/analytics/health`
- Check event queue size: `await getEventQueue()`
- Review analytics service logs in console

**Crash reporting not initializing?**
- If Sentry SDK not installed, service falls back to console logging
- Check DSN is correct format: `https://key@sentry.io/project-id`
- Verify environment variable is set (if using config)

## Production Deployment Checklist

- [ ] Install `@sentry/react-native` via npm
- [ ] Set Sentry DSN in environment config
- [ ] Register analytics router in `backend/app/main.py`
- [ ] Initialize analytics service in `App.tsx` startup
- [ ] Add event tracking to all major screens
- [ ] Add tracking to high-value events (affiliate, trip planner, plans)
- [ ] Configure backend database for event storage (PostgreSQL)
- [ ] Set up event retention policy
- [ ] Add analytics opt-out to App Settings
- [ ] Update privacy policy with analytics disclosure
- [ ] Test end-to-end: mobile → backend → database
- [ ] Monitor `/analytics/summary` endpoint for volume
- [ ] Set up alerts for high error rates

## Future Enhancements

1. **Real-time Dashboard** — FastAPI endpoint serving analytics summary to admins
2. **Cohort Analysis** — Track user segments (device type, OS version, app version)
3. **Funnel Analysis** — Track multi-step user flows (e.g., plan → export → share)
4. **A/B Testing Framework** — Split analytics by feature flags
5. **Export to BI Tools** — Dump PostgreSQL events to Google Analytics, Mixpanel, Amplitude
6. **User Opt-Out** — Settings screen toggle for disabling analytics
7. **Data Retention Policy** — Automatic deletion of events older than N days
8. **GDPR Compliance** — Bulk user data deletion endpoint

---

**Last Updated:** 2026-04-11
**Status:** Ready for integration
