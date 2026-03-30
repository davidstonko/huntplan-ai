# HuntMaryland — iOS Build Guide

## Prerequisites
- macOS with **full Xcode** installed from the App Store (not just Command Line Tools)
- After installing Xcode: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
- Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Node.js: `brew install node` (codegen is patched for Node 25 compat)
- CocoaPods: `brew install cocoapods`

## Quick Build

```bash
# 1. Install dependencies
cd mobile
npm install --legacy-peer-deps

# 2. Install iOS pods (old architecture)
cd ios
RCT_NEW_ARCH_ENABLED=0 NO_FLIPPER=1 pod install
cd ..

# 3. Run on iOS Simulator
npx react-native run-ios
```

## Automated Fix Script

If pod install fails, run from the project root:
```bash
bash fix_ios.sh
```

This script patches the codegen, cleans build artifacts, and re-runs pod install.

## Known Issues

### Node 25 + React Native 0.76 Codegen Crash
**Symptom:** `Error: Unknown prop type for "accessibilityContainerViewIsModal": "undefined"`
**Cause:** React Native 0.76's TypeScript codegen doesn't work with Node 25.
**Fix:** The fix script patches `componentsUtils.js` in node_modules to handle unknown types gracefully. The Podfile also sets `RCT_NEW_ARCH_ENABLED=0`.

### Xcode Required (not just Command Line Tools)
**Symptom:** `xcrun: error: SDK "iphoneos" cannot be located`
**Fix:** Install full Xcode from the Mac App Store, then run:
`sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

### @rnmapbox/maps Version
**Important:** Pinned to 10.1.35. Versions 10.3+ require New Architecture which is disabled for Node 25 compatibility.

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # 7 screens (Map, Regs, Plan, Chat, Social, Donate, Profile)
│   ├── components/       # Reusable UI components
│   ├── services/         # API client, location, weather
│   ├── navigation/       # React Navigation setup (6 tabs)
│   ├── hooks/            # Custom hooks
│   └── theme/            # Woodland camo color palette
├── ios/                  # Xcode project (bundle: HuntPlanAI — rename to HuntMaryland in next version)
├── package.json
└── BUILD_GUIDE.md        # This file
```

## App Name
The app is called **HuntMaryland**. The Xcode project and bundle ID still reference "HuntPlanAI" and will be updated in the next version.

## Mapbox Token
The Mapbox token is hardcoded in `MapScreen.tsx`. For production, move to environment variables.
