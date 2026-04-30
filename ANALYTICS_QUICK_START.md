# Analytics & Crash Reporting — Quick Start

**TL;DR:** Created 2 TypeScript services + 1 Python backend module for crash reporting and analytics tracking.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/services/crashReportingService.ts` | 530 | Sentry integration with fallback |
| `src/services/analyticsService.ts` | 540 | Offline-first event analytics |
| `backend/app/modules/analytics/__init__.py` | 10 | Module init |
| `backend/app/modules/analytics/routes.py` | 250 | FastAPI endpoint + validation |
| `ANALYTICS_INTEGRATION.md` | 500+ | Complete setup guide |
| `ANALYTICS_USAGE_EXAMPLES.md` | 650+ | Real-world code examples |

## 1-Minute Integration

### Mobile (App.tsx)

```typescript
import { initializeCrashReporting, setUserContext } from '@/services/crashReportingService';
import { initializeAnalytics } from '@/services/analyticsService';
import DeviceInfo from 'react-native-device-info';

useEffect(() => {
  const init = async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    initializeCrashReporting('https://your-sentry-dsn@sentry.io/...');
    setUserContext(deviceId);
    await initializeAnalytics(deviceId, '2.1.0');
  };
  init();
}, []);
```

### Backend (app/main.py, line ~145)

```python
from app.modules.analytics.routes import router as analytics_router

# Add to router registration section:
app.include_router(analytics_router, tags=["Analytics"])
```

### Track Events

```typescript
// Screen view
import { trackScreenView } from '@/services/analyticsService';

useFocusEffect(useCallback(() => {
  trackScreenView('MapScreen').catch(console.error);
  return () => {};
}, []));

// Feature usage
import { trackFeatureUsed } from '@/services/analyticsService';

trackFeatureUsed('trip_planner', { season: 'summer' }).catch(console.error);

// Affiliate conversions (HIGH VALUE)
import { trackAffiliateTap } from '@/services/analyticsService';

trackAffiliateTap('Gobstopper Decoy', 'B0D1X2Y3Z4', 'decoys').catch(console.error);
```

## API Endpoint

**POST /api/v1/analytics/events**

Receive batched events from mobile app. Returns `{ success: true, events_received: N }`.

**Max:** 100 events per batch  
**Rate:** Limited per IP (MVP)  
**Store:** In-memory (10k max)

## 8 Event Types

1. **screen_view** — Navigation tracking
2. **feature_used** — Feature engagement
3. **affiliate_tap** — Product link clicks (conversion tracking)
4. **search** — Search queries + result count
5. **filter_change** — Map/list filtering
6. **plan_created** — Hunt/fish/camping plans
7. **trip_planned** — Trip planner usage
8. **error** — Non-fatal errors

## Privacy

✓ Anonymous only (device ID + session ID)  
✓ No PII, no location, no personal data  
✓ Events queued locally if offline  
✓ Auto-flush every 60 seconds  

## Testing

```bash
# Check if backend is running
curl http://localhost:8000/api/v1/analytics/health

# See event summary
curl http://localhost:8000/api/v1/analytics/summary

# Manually flush (from app)
import { flushEvents } from '@/services/analyticsService';
await flushEvents();
```

## Setup Checklist

- [ ] `npm install @sentry/react-native`
- [ ] Initialize in App.tsx (see above)
- [ ] Add analytics router to backend/main.py
- [ ] Track events in screens/features (see ANALYTICS_USAGE_EXAMPLES.md)
- [ ] Test: curl /api/v1/analytics/health
- [ ] Deploy backend to Render
- [ ] Build and test mobile app

## Support

- **Setup questions?** → Read ANALYTICS_INTEGRATION.md
- **Code examples?** → See ANALYTICS_USAGE_EXAMPLES.md
- **API details?** → Check ANALYTICS_INTEGRATION.md under "API Specification"
- **Troubleshooting?** → See ANALYTICS_INTEGRATION.md under "Common Issues"

---

**Status:** Ready to integrate  
**TypeScript:** Strict mode ✓  
**Python:** Type hints ✓  
**Tests:** See documentation
