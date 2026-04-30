# Universal Links Deployment Checklist

## Pre-Deployment (One-Time Setup)

- [ ] **Get Apple Team ID**
  - Visit: https://developer.apple.com/account/membership/
  - Copy Team ID (format: ABC1D2EF3G)
  - Store securely

- [ ] **Verify GitHub Pages is enabled**
  - Repo settings > Pages
  - Source: main branch or /docs folder
  - Custom domain: davidstonko.github.io (if applicable)

## Code Changes (COMPLETED ✓)

- [x] Created: `apple-app-site-association` (project root)
- [x] Created: `join.html` (project root)
- [x] Created: `ios/HuntPlanAI/HuntPlanAI.entitlements`
- [x] Updated: `src/services/deepLinkService.ts` (query param support)
- [x] Verified: TypeScript compilation (0 errors)
- [x] Verified: URL scheme already in Info.plist

## Configuration (TO DO)

### Step 1: Update AASA with Team ID
```bash
# Edit this file:
# /huntmaryland-build/apple-app-site-association

# Find this line:
"appID": "TEAM_ID.com.davidstonko.huntmaryland",

# Replace TEAM_ID with your actual Team ID:
"appID": "ABC1D2EF3G.com.davidstonko.huntmaryland",
```

- [ ] Replaced TEAM_ID in `apple-app-site-association`
- [ ] Committed changes to git

### Step 2: Publish AASA to GitHub Pages
```bash
# Create directory if it doesn't exist:
mkdir -p docs/.well-known

# Copy AASA file:
cp apple-app-site-association docs/.well-known/

# Push to GitHub:
git add docs/.well-known/apple-app-site-association
git commit -m "feat: add Apple App Site Association for Universal Links"
git push origin main
```

- [ ] Created `docs/.well-known/` directory
- [ ] Copied `apple-app-site-association` to docs
- [ ] Pushed to GitHub
- [ ] **Verify:** Can access at https://davidstonko.github.io/.well-known/apple-app-site-association
  - Should return valid JSON
  - Should have correct TEAM_ID

### Step 3: Publish join.html to GitHub Pages
```bash
# Copy join fallback page:
cp join.html docs/

# Push to GitHub:
git add docs/join.html
git commit -m "feat: add Universal Links fallback page"
git push origin main
```

- [ ] Copied `join.html` to docs/
- [ ] Pushed to GitHub
- [ ] **Verify:** Can access at https://davidstonko.github.io/join.html
  - Should show "Opening MDHuntFishOutdoors..." message

### Step 4: Configure Xcode (Associated Domains Entitlement)

```
1. Open HuntPlanAI.xcodeproj in Xcode
2. Select "HuntPlanAI" target
3. Navigate to "Signing & Capabilities" tab
4. Click "+" button (top-left)
5. Search for: "Associated Domains"
6. Click "Associated Domains" to add
7. In the new section, click "+" under Domains
8. Enter: applinks:davidstonko.github.io
9. Verify Xcode syncs to ios/HuntPlanAI/HuntPlanAI.entitlements
```

- [ ] Opened Xcode project
- [ ] Added "Associated Domains" capability
- [ ] Added domain: `applinks:davidstonko.github.io`
- [ ] Verified `.entitlements` file was updated
- [ ] File shows: `<string>applinks:davidstonko.github.io</string>`

### Step 5: Build and Test

```bash
# Clean and rebuild:
cd /sessions/vibrant-magical-thompson/mnt/huntmaryland-build

# TypeScript check:
npx tsc --noEmit

# Install pods:
cd ios && RCT_NEW_ARCH_ENABLED=0 pod install && cd ..

# Clean derived data:
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Build to device:
npx react-native run-ios --device --configuration Release
```

- [ ] Ran `npx tsc --noEmit` (passed, 0 errors)
- [ ] Ran `pod install` successfully
- [ ] Cleaned DerivedData
- [ ] Built app to iPhone 12+

### Step 6: Test Custom URL Scheme (Before Universal Links)

On iPhone with app installed:

```
1. Open Notes app
2. Type: huntmaryland://join/TEST123
3. Tap the blue link
4. App should open to DeerCampScreen with warning: "Invalid Invite Link"
   (this is expected — TEST123 is not a real camp)
```

- [ ] Custom URL scheme works
- [ ] App opens and parses invite code correctly

### Step 7: Test Universal Links (After AASA Published)

On iPhone with app installed:

```
1. Tap link: https://davidstonko.github.io/huntmaryland-site/join?camp=TEST123
2. App should open directly (no Safari redirect)
3. DeerCampScreen shows warning: "Invalid Invite Link"
4. Check Settings > Developer > Universal Links & Handoff to verify
```

- [ ] Universal Link opens app directly
- [ ] AASA validation passed
- [ ] Invite code parsed correctly

### Step 8: Test Fallback Page (If App Not Installed)

On iPhone WITHOUT app installed:

```
1. Tap link: https://davidstonko.github.io/join.html?camp=TEST123
2. Safari shows fallback page with "Opening MDHuntFishOutdoors..."
3. After 1.5 seconds, shows "Get MDHuntFishOutdoors" button
4. Tap button → opens App Store page
```

- [ ] Fallback page loads
- [ ] Timeout triggers correctly
- [ ] App Store link works

### Step 9: Test Real Camp Sharing

When testing with actual camp data:

```
1. In app: DeerCampScreen > Camp menu > Share
2. Tap camp name, then Share button
3. iOS share sheet opens
4. Copy link (format: https://davidstonko.github.io/huntmaryland-site/join/ABC123DEF456)
5. Share via Messages, Email, etc.
6. On recipient's iPhone: Tap link
7. App opens to camp details with autoJoin=true
8. Member can accept/decline invite
```

- [ ] Share button triggers shareCampInvite()
- [ ] Link format is correct
- [ ] Recipient can open camp invite
- [ ] autoJoin flow works

### Step 10: Archive for App Store

```bash
# Final verification:
npx tsc --noEmit

# Create archive:
# In Xcode: Product > Archive
# Or: xcodebuild -workspace ios/HuntPlanAI.xcworkspace \
#                 -scheme HuntPlanAI \
#                 -configuration Release \
#                 -destination generic/platform=iOS \
#                 -archivePath build/HuntPlanAI.xcarchive \
#                 archive
```

- [ ] Final TypeScript check passed
- [ ] Archive created successfully
- [ ] Ready for App Store submission

## Troubleshooting Checklist

### Universal Links Not Working?

- [ ] AASA file published to `.well-known/` directory
- [ ] AASA content-type is `application/json`
- [ ] TEAM_ID in AASA matches signing certificate
- [ ] Domain in entitlements matches AASA domain
- [ ] App signed with provisioning profile containing Team ID
- [ ] Cleared app cache: Settings > General > iPhone Storage > Offload
- [ ] Reinstalled app from App Store (or fresh build)
- [ ] Checked logs: Settings > Developer > Universal Links & Handoff

### Custom URL Scheme Not Working?

- [ ] URL scheme registered in Info.plist ✓ (already configured)
- [ ] Bundle ID matches: com.davidstonko.huntmaryland
- [ ] Tested with Notes app or link in Messages
- [ ] App is installed on device

### Fallback Page Not Showing?

- [ ] join.html published to GitHub Pages root
- [ ] Can access at https://davidstonko.github.io/join.html
- [ ] JavaScript enabled in Safari
- [ ] Timeout set to 1500ms (may need adjustment for slower networks)

### App Store Link Not Working?

- [ ] Apple ID correct: 6761347484
- [ ] URL format: https://apps.apple.com/app/id6761347484
- [ ] Tested on device without app installed

## Reference Files

- `apple-app-site-association` — AASA JSON file (needs TEAM_ID)
- `join.html` — Fallback web page (ready to deploy)
- `ios/HuntPlanAI/HuntPlanAI.entitlements` — Xcode entitlements (ready)
- `src/services/deepLinkService.ts` — Deep link handler (updated)
- `UNIVERSAL_LINKS_SETUP.md` — Full technical documentation
- `DEPLOYMENT_SUMMARY.txt` — Summary of all changes

## Questions?

Refer to Apple's official documentation:
- [Enabling Universal Links](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
- [Universal Links Implementation Guide](https://developer.apple.com/ios/universal-links/)

---

**Status:** Ready for deployment
**Last Updated:** 2026-04-12
**Next Step:** Replace TEAM_ID and push to GitHub Pages
