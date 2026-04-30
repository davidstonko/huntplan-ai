# Universal Links Deployment Guide

## Overview
This document describes the Universal Links infrastructure for camp invite sharing on MDHuntFishOutdoors.

When a user shares a camp invite URL, tapping it on iOS will:
1. Check if the app is installed
2. Open the app directly to that camp (via Universal Link or custom URL scheme)
3. Fall back to App Store if app not installed

## Files Created

### 1. `apple-app-site-association` (Project Root)
Apple's standard format for declaring which paths are handled by the app.

**Location:** `/huntmaryland-build/apple-app-site-association` (no extension)

**Deployment:** Must be published to:
```
https://davidstonko.github.io/.well-known/apple-app-site-association
```

**Action Required:**
- David must add `TEAM_ID` (Apple Developer Team ID) to the `appID` field
- Example: `7A1B2C3D4E.com.davidstonko.huntmaryland`
- Find Team ID: Apple Developer Account > Membership > Team ID

**Content:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.davidstonko.huntmaryland",  // ← Replace TEAM_ID
        "paths": ["/join", "/join/*", "/invite", "/invite/*"]
      }
    ]
  }
}
```

### 2. `ios/HuntPlanAI/HuntPlanAI.entitlements`
Xcode entitlements file that grants the app permission to handle Universal Links.

**Location:** `/huntmaryland-build/ios/HuntPlanAI/HuntPlanAI.entitlements`

**Content:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:davidstonko.github.io</string>
    </array>
</dict>
</plist>
```

**Action Required:**
- In Xcode: Target > Signing & Capabilities > + Capability > Associated Domains
- Add entry: `applinks:davidstonko.github.io`
- This syncs with the .entitlements file automatically

### 3. `join.html` (Project Root)
Web fallback page that opens the app or directs to App Store.

**Location:** `/huntmaryland-build/join.html`

**Deployment:** Publish to:
```
https://davidstonko.github.io/join.html
```

**Features:**
- Extracts `camp` parameter from URL query string
- Attempts to open app via custom URL scheme: `huntmaryland://join/CAMP_ID`
- Falls back to App Store (Apple ID: 6761347484) if app not installed
- Dark theme matching the app (black background, MD gold accents)
- Responsive design for mobile browsers

**URL Formats Supported:**
- Direct Universal Link: `https://davidstonko.github.io/huntmaryland-site/join?camp=ABC123`
- Custom scheme: `huntmaryland://join?camp=ABC123`

## Modified Files

### `src/services/deepLinkService.ts`
Updated to parse both query parameter and path-based invite code formats.

**Parsing Support:**
- Query params: `?camp=ABC123`
- Path-based: `/join/ABC123`
- Custom scheme with query: `huntmaryland://join?camp=ABC123`
- Custom scheme with path: `huntmaryland://join/ABC123`

**Key Functions:**
- `parseInviteCode(url)` — Extracts invite code from various URL formats
- `handleDeepLink(url, navigation)` — Routes to DeerCampScreen with autoJoin flag
- `initializeDeepLinks(navigation)` — Sets up listeners (call once in App.tsx)
- `shareCampInvite(campName, inviteCode)` — Triggers iOS share sheet

## Existing Config (No Changes Needed)

### `ios/HuntPlanAI/Info.plist`
Already registered the custom URL scheme:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLName</key>
    <string>com.davidstonko.huntmaryland</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>huntmaryland</string>
    </array>
  </dict>
</array>
```

Status: ✓ Already configured

## Deployment Checklist

### 1. Replace TEAM_ID in `apple-app-site-association`
- [ ] Get Apple Team ID from developer account
- [ ] Update `apple-app-site-association` file
- [ ] Commit to git

### 2. Publish AASA to GitHub Pages
- [ ] Copy `apple-app-site-association` → `docs/.well-known/apple-app-site-association`
- [ ] Push to GitHub
- [ ] Verify accessible at: `https://davidstonko.github.io/.well-known/apple-app-site-association`

### 3. Publish fallback HTML
- [ ] Copy `join.html` → `docs/join.html`
- [ ] Push to GitHub
- [ ] Verify accessible at: `https://davidstonko.github.io/join.html`

### 4. Configure Xcode Entitlements
- [ ] Open Xcode project
- [ ] Select target "HuntPlanAI"
- [ ] Go to Signing & Capabilities
- [ ] Click "+"
- [ ] Add "Associated Domains" capability
- [ ] Add entry: `applinks:davidstonko.github.io`
- [ ] Verify Xcode syncs changes to `HuntPlanAI.entitlements`

### 5. Test in Development
- [ ] Build and archive for testing
- [ ] Test custom URL scheme: `huntmaryland://join/TEST123`
- [ ] Test Universal Link (after iOS app is signed with Team ID)

### 6. Build Before App Store Submission
- [ ] Run `npx tsc --noEmit` (should pass)
- [ ] Run `cd ios && pod install`
- [ ] Archive for App Store

## Usage in App

### Sharing a Camp Invite
```typescript
import { shareCampInvite } from '@/services/deepLinkService';

// In DeerCampScreen or similar
const handleShareCamp = async () => {
  await shareCampInvite('My Hunt Camp', 'ABC123DEF456');
};
```

### Handling Incoming Links
Already wired in `App.tsx`:
```typescript
import { initializeDeepLinks } from '@/services/deepLinkService';

useEffect(() => {
  const unsubscribe = initializeDeepLinks(navigation);
  return unsubscribe;
}, [navigation]);
```

## Link Formats

### Share Link Format
```
https://davidstonko.github.io/huntmaryland-site/join?camp=ABC123DEF456
```

### User Journey
1. User in camp list → Share button
2. Triggers `shareCampInvite(campName, inviteCode)`
3. iOS share sheet opens with link
4. Recipient taps link → iOS attempts Universal Link
5. Universal Link opens app → deepLinkService.ts parses → navigates to camp
6. If app not installed → join.html → App Store link

## Apple Documentation

- [Universal Links Developer Guide](https://developer.apple.com/ios/universal-links/)
- [Apple App Site Association Format](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
- [Supporting Associated Domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)

## Troubleshooting

### AASA Not Found
- Verify file at `https://davidstonko.github.io/.well-known/apple-app-site-association`
- Ensure content-type is `application/json`
- Check that GitHub Pages is enabled in repo settings

### Universal Links Not Working
- Verify entitlements file in Xcode
- Ensure Team ID in AASA matches signing certificate
- Test custom URL scheme first: `huntmaryland://join/ABC123`
- Check iPhone logs: Settings > Developer > Universal Links & Handoff

### App Not Launched
- Clear app cache: Settings > General > iPhone Storage > MDHuntFishOutdoors > Offload App
- Reinstall app from App Store
- Test custom scheme fallback

---

**Last Updated:** 2026-04-12
**Status:** Ready for Team ID configuration and GitHub Pages deployment
