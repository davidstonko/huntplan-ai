# iOS Entitlements & Universal Links Setup

## Status: COMPLETE

### Files Created
- `mobile/ios/HuntPlanAI/HuntPlanAI.entitlements` — XML plist with `com.apple.developer.associated-domains` key

### Files Modified
- `mobile/ios/HuntPlanAI.xcodeproj/project.pbxproj`
  - Added `CODE_SIGN_ENTITLEMENTS = HuntPlanAI/HuntPlanAI.entitlements` to Debug build configuration
  - Added `CODE_SIGN_ENTITLEMENTS = HuntPlanAI/HuntPlanAI.entitlements` to Release build configuration
  - Added file reference `13B07FB91A68108700A75B9A` in PBXFileReference section
  - Added reference to HuntPlanAI group in PBXGroup children

### Info.plist
- Verified: Custom URL scheme `mdhuntfish` is present under CFBundleURLSchemes

## Apple App Site Association (AASA)

The deep-link router (`mobile/src/services/deepLinkRouter.ts`) handles:
1. Custom scheme: `mdhuntfish://` (already wired via Info.plist)
2. Universal Links: `https://mdhuntfishoutdoors.com/i/{code}` (now enabled via entitlements)

### AASA File Configuration

You must upload the Apple App Site Association JSON to your domain hosting (huntmaryland-site repo).

**Endpoint:** `https://mdhuntfishoutdoors.com/.well-known/apple-app-site-association`

**File Format:** JSON (NOT plist)

**Required JSON Payload:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.davidstonko.huntmaryland",
        "paths": ["/i/*"]
      }
    ]
  }
}
```

**Replace `TEAMID`** with your Apple Developer Team ID (found in Apple Developer Portal > Team ID or Xcode Signing & Capabilities).

### Deployment Checklist

- [ ] Obtain Apple Developer Team ID from https://developer.apple.com/account
- [ ] Replace `TEAMID` placeholder in the JSON above
- [ ] Upload JSON to `.well-known/apple-app-site-association` on mdhuntfishoutdoors.com
- [ ] Verify endpoint returns 200 OK and valid JSON:
  ```bash
  curl -i https://mdhuntfishoutdoors.com/.well-known/apple-app-site-association
  ```
- [ ] Build & sign the app (Xcode will validate the entitlements and AASA on App Store Connect)
- [ ] Test on physical device: tap a link like `https://mdhuntfishoutdoors.com/i/hunt123` → should open app

### Notes

- Universal Links require HTTPS; HTTP will not work
- AASA file is cached by iOS for ~1 week; test on a fresh install for immediate validation
- Entitlements are already wired in the Xcode project; no manual Signing & Capabilities UI clicks needed
- Bundle ID `com.davidstonko.huntmaryland` is LOCKED on App Store (ID 6761347484)
