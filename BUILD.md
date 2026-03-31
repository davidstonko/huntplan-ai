# BUILD.md — MDHuntFishOutdoors Complete Build & Deploy Pipeline

This document covers the end-to-end build, archive, and App Store submission process for MDHuntFishOutdoors. Follow these steps to take the codebase from development to App Store release.

---

## Prerequisites

### System Requirements
- **macOS**: 12.0 or later (Ventura+ recommended)
- **Xcode**: 15.0 or later
- **Node.js**: 18+ (tested with Node 22 and 25)
- **CocoaPods**: Latest stable version

### Install CocoaPods (if not present)
```bash
sudo gem install cocoapods
```

### Required Credentials & Configuration
- **Apple Developer Program membership** (purchased and active)
- **Team ID**: `BAFL96ZCUU`
- **Apple ID**: 6761347484
- **Bundle ID**: `com.davidstonko.huntmaryland` (do NOT change — registered with Apple)
- **Mapbox access token**: Set in `.env` as `MAPBOX_ACCESS_TOKEN`
  ```bash
  echo "MAPBOX_ACCESS_TOKEN=your_token_here" > .env
  ```

### Critical Path Note
The build directory path **MUST NOT CONTAIN SPACES**. React Native's Hermes compiler fails on spaces. Use `/Users/davidstonko/Documents/huntmaryland-build` (verified, no spaces).

---

## Local Development Setup

### Initial Clone & Install
```bash
git clone [your-repo-url]
cd huntplan-ai/mobile
npm install
cd ios && pod install && cd ..
```

### Run on iOS Simulator
```bash
npx react-native run-ios
```

### Troubleshooting Local Dev

**Metro bundler port conflict (port 8081 in use):**
```bash
lsof -ti:8081 | xargs kill -9
npx react-native start --reset-cache
```

**White screen after clean install:**
1. Kill all Metro processes
2. Restart bundler with cache reset:
```bash
npx react-native start --reset-cache
```
3. Rebuild: `npx react-native run-ios`

**Pod installation fails:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

---

## TypeScript Validation (Hard Requirement)

**Always run before archiving:**
```bash
npx tsc --noEmit
```

**Must return exactly 0 errors.** TypeScript failures block archive submission. If errors appear:
1. Fix all reported issues
2. Re-run `npx tsc --noEmit` to confirm 0 errors
3. Only then proceed to build

---

## iOS Build Pipeline

### Step 1: Copy Source to Build Directory

The build directory must have **NO SPACES** in its path (Hermes requirement).

```bash
# Ensure build directory exists and is clean
mkdir -p /Users/davidstonko/Documents/huntmaryland-build
rm -rf /Users/davidstonko/Documents/huntmaryland-build/src
cp -R mobile/src /Users/davidstonko/Documents/huntmaryland-build/
```

Verify:
```bash
ls -la /Users/davidstonko/Documents/huntmaryland-build/src
```

### Step 2: Verify Pod Configuration

Before `pod install`, ensure the Podfile disables New Architecture (Node 25 compatibility):

**File: `ios/Podfile`**
```ruby
post_install do |installer|
  # ... existing code ...

  # CRITICAL: Disable new architecture (Node 25 codegen crash)
  ENV['RCT_NEW_ARCH_ENABLED'] = '0'
end
```

### Step 3: Pod Install

```bash
cd ios
pod deintegrate  # Clean slate if switching configs or stale state
rm -rf Pods Podfile.lock build
pod install
cd ..
```

**Expected output**: "Pod installation complete! There are X dependencies from the Podfile and the resolved dependencies in Podfile.lock."

### Step 4: Clean DerivedData

This is critical when transitioning between build configs or after pod changes:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/HuntPlanAI-*
```

**Why**: Xcode caches old headers and build artifacts. Stale cached files cause "module map not found" and "folly/dynamic.h not found" errors.

### Step 5: Archive (Two Methods)

#### Method A: Xcode GUI (Recommended for Debugging)
```bash
open ios/HuntPlanAI.xcworkspace
```
- Select the **Any iOS Device (arm64)** destination (NOT a simulator)
- Product → Archive
- Wait for build to complete

#### Method B: Command Line
```bash
xcodebuild -workspace ios/HuntPlanAI.xcworkspace \
  -scheme HuntPlanAI \
  -configuration Release \
  -archivePath build/HuntPlanAI.xcarchive \
  archive
```

**Success indicator**: "Archive Successful" message in Xcode or `exit code 0` from xcodebuild.

### Step 6: Export for App Store

Create or update `ExportOptions.plist` in the project root:

**File: `ExportOptions.plist`**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>destination</key>
    <string>upload</string>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>BAFL96ZCUU</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
```

Run export:
```bash
xcodebuild -exportArchive \
  -archivePath build/HuntPlanAI.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist
```

**Success**: `build/export/HuntPlanAI.ipa` created. This is the final app binary for submission.

### Step 7: Version Management

Versions are defined in `ios/HuntPlanAI.xcodeproj/project.pbxproj`:

**MARKETING_VERSION** (user-facing version):
```
MARKETING_VERSION = 1.0.0  # Semantic versioning (1.0.0, 1.0.1, 1.1.0, 2.0.0, etc.)
```

**CURRENT_PROJECT_VERSION** (build number):
```
CURRENT_PROJECT_VERSION = 1  # Increment by 1 for each App Store submission
```

For each new submission:
1. Update `CURRENT_PROJECT_VERSION` (build number) — always increment
2. Update `MARKETING_VERSION` only for user-facing version changes
3. Example progression:
   - V1 launch: 1.0.0, build 1
   - Bug fix: 1.0.1, build 2
   - Feature release: 1.1.0, build 3

---

## App Store Connect Submission

### Access App Store Connect
1. Navigate to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in with Apple ID
3. Select **MDHuntFishOutdoors** (Apple ID: 6761347484)

### Pre-Submission Checklist

Before clicking "Add for Review", verify all required fields:

#### 1. App Information
- **Primary Category**: Sports
- **Secondary Category** (optional): Lifestyle
- **Content Rights**: "Yes, we own or have rights to all content used in the app."
- **Age Ratings**: Provide accurate ratings (see below)

#### 2. Age Ratings Questionnaire
Fill out the required questions. For MDHuntFishOutdoors:
- **Weapons**: Infrequent/Mild (hunting references in regulations)
- **Hunting/Fishing**: Yes (core app purpose)
- **Realistic Violence**: None
- **All other categories**: None or No

**Expected rating**: 4+ or 9+ (varies by store region; Apple will assign automatically)

#### 3. Pricing and Availability
- **Price Tier**: Free (Tier 0)
- **Available in**: All 175 countries (default; customize per region if needed)
- **App Clips**: Not applicable

#### 4. Screenshots & App Preview Video
**Screenshots** (Required):
- Quantity: 5+ per device type
- Dimensions: 1284 x 2778 px (6.5" iPhone Pro Max)
- Content: Show key features—map, filters, AI, Scout tab, Deer Camp, regulations
- Capture from iPhone 15 Pro Max simulator, then resize with `sips`:
  ```bash
  sips -Z 1284 2778 screenshot.png --out screenshot_resized.png
  ```

**App Preview Video** (Optional but recommended):
- Duration: 15–30 seconds
- Demonstrates core workflows (open app, view map, toggle filters, chat AI)
- Upload as .mov or .mp4

#### 5. Description
Keep it concise and benefit-focused:

**Example:**
```
MDHuntFishOutdoors consolidates Maryland's hunting regulations, public
lands, harvest data, and seasonal information in one free app—so you
don't have to search across multiple state websites.

Features:
• Interactive map of 192+ public hunting lands and shooting ranges
• Regulations for deer, turkey, waterfowl, and more
• AI assistant for hunting planning and questions
• Scout tab: Create hunt plans with GPS tracking and annotations
• Deer Camp: Collaborative maps with your hunting group
• Community forums for local knowledge and gear trading

Plan your next hunt smarter.
```

#### 6. Keywords
Up to 30 characters per keyword (max 5):
- hunting
- maryland
- dnr
- regulations
- outdoors

#### 7. Support & Marketing URLs
- **Support URL**: https://davidstonko.github.io/huntmaryland-site/
- **Marketing URL** (optional): https://davidstonko.github.io/huntmaryland-site/

#### 8. Privacy Policy
- **Privacy Policy URL**: https://davidstonko.github.io/huntmaryland-site/privacy.html
- **Required fields in policy**:
  - What personal data you collect
  - How you use it
  - User rights (access, deletion, etc.)

#### 9. App Privacy Details (Data & Privacy)
Fill out the privacy questionnaire in App Store Connect:

**Data Collection**:
- **Location Data**: "Precise Location" → "App Functionality" → "Not linked to user identity" → "No tracking"
- **User ID** (if username enabled): "User ID" → "User ID + Contact Info" → "Not linked" → "No tracking"
- All other categories: "We do not collect this data"

**Data Sharing**:
- Select "None" (data not shared with third parties in V1)

**Data Retention**:
- "Data is deleted when uninstall app" (or specify retention period)

#### 10. Export Compliance
- **ITAR or Encryption**: "None of the algorithms or technologies mentioned above are used in this app."
- Mapbox maps and standard location services don't trigger encryption requirements

#### 11. App Review Information
- **Contact Email**: Your Apple ID email
- **Demo Account** (if needed): Provide test username/password if app has authentication
- **Notes for Reviewer**:
  ```
  This is a free app consolidating Maryland hunting regulations and
  public lands data from the MD DNR. No login required for core features.
  Scout and Deer Camp tabs store data locally on device.
  ```

---

## Build Issues & Solutions

### "Module map file not found" (50+ errors during compile)

**Cause**: Stale Xcode DerivedData caching old header references

**Fix**:
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/HuntPlanAI-*
cd ios
pod install
cd ..
# Re-archive
```

### "Build input file cannot be found" (ReactCodegen error)

**Cause**: `ios/build/` folder deleted or pod install didn't regenerate codegen files

**Fix**:
```bash
cd ios
rm -rf build
pod install
cd ..
xcodebuild clean -workspace ios/HuntPlanAI.xcworkspace -scheme HuntPlanAI
# Re-archive
```

### "folly/dynamic.h file not found" (100+ header errors)

**Cause**: Pod headers not properly linked after pod deintegration

**Fix**:
```bash
cd ios
pod deintegrate
rm -rf Pods Podfile.lock build
pod install
cd ..
rm -rf ~/Library/Developer/Xcode/DerivedData/HuntPlanAI-*
# Re-archive
```

### ITMS-90683: Missing NSLocationAlwaysAndWhenInUseUsageDescription

**Cause**: Info.plist missing required location permission string

**Fix**:
```bash
/usr/libexec/PlistBuddy -c "Add :NSLocationAlwaysAndWhenInUseUsageDescription string 'MDHuntFishOutdoors uses your location to show nearby public lands, track your routes in the field, and help you navigate to trailheads and parking areas.'" ios/HuntPlanAI/Info.plist
```

Verify:
```bash
/usr/libexec/PlistBuddy -c "Print :NSLocationAlwaysAndWhenInUseUsageDescription" ios/HuntPlanAI/Info.plist
```

### White screen or app crashes immediately after install

**Cause**: Metro bundler stale cache or module resolution issues

**Fix**:
```bash
# Kill all Node/Metro processes
pkill -f "node"
pkill -f "Metro"

# Clear Metro cache
npx react-native start --reset-cache

# In another terminal, rebuild
npx react-native run-ios --verbose

# If still white screen, check logs
npx react-native log-ios
```

### "Could not find the following native modules" during pod install

**Cause**: Xcode not seeing package.json dependencies

**Fix**:
```bash
npm install
cd ios
pod repo update  # Update CocoaPods specs
pod install
cd ..
```

### Archive fails with "No signing identity found"

**Cause**: Apple Developer signing certificate expired or not installed

**Fix**:
1. Open Xcode Preferences → Accounts
2. Select your Apple ID → View Details
3. Click "Download" next to iOS Development certificate
4. Close and reopen Xcode
5. Try archive again

---

## Full Build Workflow (Copy-Paste Ready)

Use this consolidated script for a clean, repeatable build:

```bash
#!/bin/bash
set -e

BUILD_DIR="/Users/davidstonko/Documents/huntmaryland-build"
REPO_ROOT="$(pwd)"

echo "=== MDHuntFishOutdoors Build Pipeline ==="
echo ""

# Step 1: TypeScript validation
echo "[1/7] Validating TypeScript..."
npx tsc --noEmit
echo "✓ TypeScript: 0 errors"
echo ""

# Step 2: Copy source
echo "[2/7] Copying source to build directory..."
rm -rf "$BUILD_DIR/src"
cp -R mobile/src "$BUILD_DIR/"
echo "✓ Source copied to $BUILD_DIR/src"
echo ""

# Step 3: Pod install
echo "[3/7] Installing CocoaPods dependencies..."
cd ios
rm -rf Pods Podfile.lock build
pod install
cd "$REPO_ROOT"
echo "✓ CocoaPods installed"
echo ""

# Step 4: Clean DerivedData
echo "[4/7] Cleaning Xcode DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/HuntPlanAI-*
echo "✓ DerivedData cleaned"
echo ""

# Step 5: Archive
echo "[5/7] Creating archive..."
xcodebuild -workspace ios/HuntPlanAI.xcworkspace \
  -scheme HuntPlanAI \
  -configuration Release \
  -archivePath build/HuntPlanAI.xcarchive \
  archive
echo "✓ Archive created"
echo ""

# Step 6: Export
echo "[6/7] Exporting for App Store..."
xcodebuild -exportArchive \
  -archivePath build/HuntPlanAI.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist
echo "✓ IPA exported to build/export/HuntPlanAI.ipa"
echo ""

# Step 7: Summary
echo "[7/7] Build complete!"
echo ""
echo "Next steps:"
echo "1. Open App Store Connect: https://appstoreconnect.apple.com"
echo "2. Go to MDHuntFishOutdoors (Apple ID: 6761347484)"
echo "3. Select \"+ Versions\" or \"Edit In-App Purchases\""
echo "4. Upload build: TestFlight → iOS Builds → Select IPA"
echo "5. Review all metadata, screenshots, age ratings"
echo "6. Click \"Add for Review\" and submit"
echo ""
echo "Build artifact: $REPO_ROOT/build/export/HuntPlanAI.ipa"
```

Save as `build.sh`, then run:
```bash
chmod +x build.sh
./build.sh
```

---

## File Locations Reference

| File / Directory | Purpose | Path |
|---|---|---|
| Build directory | Archive + export | `/Users/davidstonko/Documents/huntmaryland-build` |
| Workspace | Xcode project | `ios/HuntPlanAI.xcworkspace` |
| Info.plist | App metadata | `ios/HuntPlanAI/Info.plist` |
| Project settings | Version + bundle ID | `ios/HuntPlanAI.xcodeproj/project.pbxproj` |
| Podfile | Dependency config | `ios/Podfile` |
| ExportOptions | Archive export config | `ExportOptions.plist` (root) |
| Source code | Mobile app logic | `mobile/src/` |
| .env | API tokens | `.env` (root, add MAPBOX_ACCESS_TOKEN) |

---

## Environment Variables

Create `.env` in the project root:

```bash
MAPBOX_ACCESS_TOKEN=pk_eyJ1IjoiZGF2aWRzdG9ua28iLCJhIjoiY20yOTBxeThnMDAwdzJ0cXZ2M29yaXo5ZCJ9...
```

This token is used by Mapbox GL Native for map rendering. Verify it works by running a local dev build first.

---

## Deployment Timeline

**Typical App Store review**: 24–48 hours

**Version progression example**:
- **v1.0.0** (Build 1): Initial launch — Hunting MVP
- **v1.0.1** (Build 2): Bug fixes — If review rejected
- **v1.1.0** (Build 3): Minor features — UI polish
- **v2.0.0** (Build 4): Scout + Deer Camp (major feature)
- **v2.1.0** (Build 5+): Fishing module, phase releases

Always increment `CURRENT_PROJECT_VERSION` (build number) for every submission, even if `MARKETING_VERSION` doesn't change.

---

## Post-Launch Monitoring

After App Store approval:

1. **Check app page** — Navigate to Apple App Store → MDHuntFishOutdoors → verify all screenshots, description, rating
2. **Monitor crashes** — App Store Connect → TestFlight → Crashes tab
3. **Read reviews** — Respond to user feedback and report bugs
4. **Prepare next version** — Plan Phase 4 (Fishing) work based on user feedback

---

## Questions & Support

For build failures not covered here:
1. Check `build_issues.md` in the project root
2. Review `MEMORY.md` for architecture context
3. Consult Xcode logs: `~/Library/Logs/DiagnosticsReports/`

---

**Last Updated**: 2026-03-30
**Tested With**: Xcode 15.2, Node 25, CocoaPods 1.14, React Native 0.76
