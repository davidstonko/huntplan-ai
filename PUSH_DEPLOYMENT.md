# Push Notification Deployment Guide (V2.3+)

This document describes how to configure server-initiated push notifications via Apple Push Notification Service (APNS) for the MDHuntFishOutdoors app.

## Architecture

**Mobile (iOS):** `pushService.ts` requests APNS permissions, obtains the device token, and registers it with the backend via `/push/register`. Fallback: notifee local scheduling.

**Backend:** Device tokens stored in `device_tokens` table. Admin endpoint `/push/send` dispatches via APNS HTTP/2 (aioapns library). Gracefully degrades to logging if APNS credentials missing.

**Graceful Degradation:** If APNS env vars not set, tokens still register (for offline queueing), but delivery is logged only. Mobile notifee fallback always available.

---

## Step 1: Generate APNS Authentication Key

1. **Log in to Apple Developer Portal:** https://developer.apple.com
2. **Navigate to Certificates, Identifiers & Profiles** > **Keys** (left sidebar)
3. **Click "+" to create a new key**
4. **Enable "Apple Push Notifications service (APNs)"** checkbox
5. **Click "Continue"**
6. **Click "Register"**
7. **Download the `.p8` file** — save locally as `AuthKey_XXXXX.p8` (where `XXXXX` is the Key ID)
8. **Note your Key ID** (visible in portal) and **Team ID** (top-right corner of Apple Developer account)

Example: Key ID = `ABCDEF1234`, Team ID = `1A2B3C4D5E`

---

## Step 2: Base64-Encode the `.p8` Key for Render

The APNS private key must be provided to Render as a base64-encoded environment variable (to avoid whitespace/newline issues).

**On your local machine:**

```bash
# Base64-encode the key
base64 -i AuthKey_XXXXX.p8 -o apns_key_base64.txt

# Verify the output (should be single line)
cat apns_key_base64.txt | head -c 50
```

**Copy the entire base64-encoded content** (single line) to use in the next step.

---

## Step 3: Configure Render Environment Variables

1. **Log in to Render:** https://render.com
2. **Navigate to the huntplan-api service**
3. **Click "Environment"** in the sidebar
4. **Add or update the following environment variables:**

```
APNS_KEY_ID=ABCDEF1234
APNS_TEAM_ID=1A2B3C4D5E
APNS_BUNDLE_ID=com.davidstonko.huntmaryland
APNS_PRIVATE_KEY_BASE64=<paste entire base64-encoded .p8 here>
APNS_USE_SANDBOX=true
INTERNAL_API_KEY=<random secure key, e.g., uuid or 32-char random string>
```

**Notes:**
- `APNS_USE_SANDBOX=true` for TestFlight; `false` for App Store production
- `INTERNAL_API_KEY` guards the `/push/send` admin endpoint (use a strong random value)
- Do NOT include `APNS_KEY_PATH` (not needed with base64 encoding)

5. **Click "Save"** and wait for deployment (~1 min)

---

## Step 4: Verify Backend Configuration

**Once Render redeployment completes:**

```bash
# Check health endpoint
curl https://huntplan-api.onrender.com/api/v1/push/health

# Expected response:
# {
#   "status": "ok",
#   "apns_configured": true,
#   "active_tokens": 0,
#   "message": "APNS configured and ready"
# }
```

If `apns_configured` is `false`, check that all 4 env vars are set correctly.

---

## Step 5: Build and Test on TestFlight

1. **Ensure mobile `Info.plist` includes** (added in V2.3):
   ```xml
   <key>UIBackgroundModes</key>
   <array>
     <string>remote-notification</string>
   </array>
   ```

2. **Build and upload to TestFlight:**
   ```bash
   cd mobile
   npx eas build --platform ios --profile preview
   ```

3. **Install on TestFlight device** and launch the app

4. **Verify registration:**
   ```bash
   # Query backend for active tokens (requires INTERNAL_API_KEY)
   curl -H "Authorization: Bearer <YOUR_INTERNAL_API_KEY>" \
     https://huntplan-api.onrender.com/api/v1/push/admin/tokens
   
   # Should show your device token
   ```

---

## Step 6: Send a Test Notification

**From your local machine or Render terminal:**

```bash
curl -X POST \
  -H "Authorization: Bearer <YOUR_INTERNAL_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "all_ios": true,
    "title": "Test Notification",
    "body": "Push system is working!",
    "data": {"type": "test"}
  }' \
  https://huntplan-api.onrender.com/api/v1/push/send

# Expected response:
# {
#   "sent_count": 1,
#   "failed_count": 0,
#   "tokens_targeted": 1,
#   "message": "Sent 1/1 notifications"
# }
```

**On the TestFlight device:** You should see the notification arrive.

---

## Step 7: Switch to Production

When ready for App Store release:

1. **Update APNS_USE_SANDBOX to false** in Render environment
2. **Rebuild and submit to App Store**
3. **Monitor Sentry for APNS errors** (invalid token, topic mismatch, etc.)

---

## Troubleshooting

### Notification not delivered but backend shows "sent"

**Likely causes:**
- Device token is stale (deleted or revoked by iOS)
- APNS environment mismatch (sandbox token used with production, or vice versa)

**Fix:** Uninstall and reinstall the app; re-register device token.

---

### APNS endpoint returns "Invalid Token"

**Likely cause:** Token encoding or whitespace issue

**Fix:**
- Verify base64 key is single line (no newlines)
- Verify token is valid hex string (64 chars, lowercase)
- Check Sentry logs for exact APNS error code

---

### APNS endpoint returns "BadDeviceToken"

**Likely cause:** Token format invalid or for wrong app bundle ID

**Fix:**
- Ensure `APNS_BUNDLE_ID=com.davidstonko.huntmaryland` (locked, do not change)
- Device token must be uppercase hex from iOS deviceTokenData

---

### APNS endpoint returns "TopicDisallowed"

**Likely cause:** App bundle ID does not match the APNS certificate/key

**Fix:**
- Verify certificate in Apple Developer portal is for `com.davidstonko.huntmaryland`
- Regenerate .p8 key if using wrong app ID

---

### Backend `/push/health` shows apns_configured=false

**Likely cause:** One or more env vars missing

**Fix:**
- Double-check all 4 required vars in Render environment:
  - `APNS_KEY_ID`
  - `APNS_TEAM_ID`
  - `APNS_BUNDLE_ID`
  - `APNS_PRIVATE_KEY_BASE64`
- Re-save and redeploy

---

## API Reference

### POST /push/register
Register a device token (auth-optional).

**Request:**
```json
{
  "token": "abc123...",
  "platform": "ios",
  "environment": "development",
  "app_version": "3.0.0"
}
```

**Response:**
```json
{
  "id": "uuid",
  "token": "abc123...",
  "platform": "ios",
  "environment": "development",
  "app_version": "3.0.0",
  "created_at": "2026-04-20T...",
  "is_active": true
}
```

---

### POST /push/unregister
Unregister a device token (auth-optional).

**Request:**
```json
{
  "token": "abc123..."
}
```

**Response:** 204 No Content

---

### POST /push/send (Admin-only)
Send a push notification to device(s).

**Headers:**
```
Authorization: Bearer <INTERNAL_API_KEY>
Content-Type: application/json
```

**Request:**
```json
{
  "all_ios": true,
  "title": "Title",
  "body": "Body",
  "data": {"key": "value"}
}
```

Or:
```json
{
  "token_ids": ["id1", "id2"],
  "title": "Title",
  "body": "Body",
  "data": {"key": "value"}
}
```

**Response:**
```json
{
  "sent_count": 1,
  "failed_count": 0,
  "tokens_targeted": 1,
  "message": "Sent 1/1 notifications"
}
```

---

### GET /push/admin/tokens (Admin-only)
List all active device tokens.

**Headers:**
```
Authorization: Bearer <INTERNAL_API_KEY>
```

**Response:**
```json
{
  "total_tokens": 10,
  "active_tokens": 10,
  "ios_tokens": 9,
  "android_tokens": 1,
  "development_tokens": 5,
  "production_tokens": 5,
  "tokens": [
    {"id": "uuid", "token": "abc123...", "platform": "ios", ...}
  ]
}
```

---

### GET /push/health
Check push subsystem health (no auth required).

**Response:**
```json
{
  "status": "ok",
  "apns_configured": true,
  "active_tokens": 42,
  "message": "APNS configured and ready"
}
```

---

## Code Examples

### Mobile: Register Device on App Launch

In `App.tsx` or equivalent bootstrap:

```typescript
import * as pushService from './src/services/pushService';

async function initPushNotifications() {
  const pushEnabled = await getPreference('pushEnabled');
  if (!pushEnabled) return;

  const success = await pushService.registerDevice({
    userId: currentUser?.id,
    appVersion: APP_VERSION,
    environment: isDev ? 'development' : 'production',
  });

  if (!success) {
    console.warn('Push registration failed; local notifications only');
  }
}
```

### Backend: Scheduled Season Alerts

In a background job (e.g., APScheduler):

```python
async def fire_season_opening_alert():
    db: AsyncSession = ...
    await send_push_to_many(
        device_tokens=await get_all_ios_tokens(db),
        title="Deer Season Opens",
        body="Maryland firearms deer season opens today!",
        data={"type": "season_alert", "species": "deer"},
    )
```

---

## Monitoring & Logging

- **Sentry:** All APNS errors logged with error codes (InvalidToken, BadDeviceToken, etc.)
- **Render logs:** Check runtime logs for push dispatch details
- **AsyncStorage:** Mobile logs token registration state locally for offline queueing

---

## Future Enhancements

- Multi-state support (VA, PA, etc.)
- Localization (push titles/bodies per user language)
- Category-based preferences (season alerts, camp activity, weather, regulations)
- Webhook ingestion for third-party alerts (NOAA, NWS, etc.)

---

## References

- [Apple Push Notification service (APNs)](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server)
- [aioapns Python Library](https://github.com/Fatal1ty/aioapns)
- [React Native PushNotificationIOS](https://github.com/react-native-community/push-notification-ios)
