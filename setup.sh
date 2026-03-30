#!/bin/bash
# ──────────────────────────────────────────────────────────────
# HuntPlan AI — Mobile App Setup Script
# Run this once to initialize the React Native project.
# ──────────────────────────────────────────────────────────────
set -e

echo ""
echo "============================================"
echo "  HuntPlan AI — Mobile Setup"
echo "============================================"
echo ""

# ── Check prerequisites ──
echo "[1/6] Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js not found. Install it from https://nodejs.org/ (v18+)"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js v18+ required. You have $(node -v)"
  exit 1
fi
echo "  Node.js: $(node -v) ✓"

if ! command -v npx &> /dev/null; then
  echo "ERROR: npx not found. It should come with Node.js."
  exit 1
fi
echo "  npx: available ✓"

if ! command -v xcodebuild &> /dev/null; then
  echo "WARNING: Xcode not found. You'll need it to build for iOS."
  echo "  Install from the Mac App Store."
fi

if ! command -v pod &> /dev/null; then
  echo "WARNING: CocoaPods not found. Installing..."
  sudo gem install cocoapods
fi
echo "  CocoaPods: $(pod --version 2>/dev/null || echo 'will install') ✓"

# ── Install npm dependencies ──
echo ""
echo "[2/6] Installing npm dependencies..."
npm install

# ── Initialize React Native native projects if they don't exist ──
if [ ! -d "ios" ]; then
  echo ""
  echo "[3/6] Generating iOS native project..."
  # Use react-native's built-in template generation
  npx react-native init HuntPlanAI --directory /tmp/huntplan-rn-init --skip-install 2>/dev/null || true
  if [ -d "/tmp/huntplan-rn-init/ios" ]; then
    cp -r /tmp/huntplan-rn-init/ios ./ios
    rm -rf /tmp/huntplan-rn-init
    echo "  iOS project generated ✓"
  else
    echo "  Generating iOS project with eject..."
    npx react-native eject 2>/dev/null || true
  fi
else
  echo ""
  echo "[3/6] iOS project already exists ✓"
fi

# ── Configure Mapbox token ──
echo ""
echo "[4/6] Mapbox configuration..."
echo ""
echo "  ┌─────────────────────────────────────────────────┐"
echo "  │  You need a free Mapbox access token.           │"
echo "  │  Get one at: https://account.mapbox.com/        │"
echo "  │                                                 │"
echo "  │  Then edit:                                     │"
echo "  │  src/screens/MapScreen.tsx                      │"
echo "  │  Replace 'YOUR_MAPBOX_TOKEN' with your token.   │"
echo "  └─────────────────────────────────────────────────┘"
echo ""

# ── Install CocoaPods ──
echo "[5/6] Installing iOS CocoaPods..."
if [ -d "ios" ]; then
  cd ios
  pod install --repo-update || pod install
  cd ..
  echo "  CocoaPods installed ✓"
else
  echo "  Skipped (no ios directory)"
fi

# ── Summary ──
echo ""
echo "[6/6] Setup complete!"
echo ""
echo "============================================"
echo "  NEXT STEPS:"
echo "============================================"
echo ""
echo "  1. Get a Mapbox token from https://account.mapbox.com/"
echo "     Edit src/screens/MapScreen.tsx and replace YOUR_MAPBOX_TOKEN"
echo ""
echo "  2. Make sure your Docker backend is running:"
echo "     cd ../  &&  docker compose up -d"
echo ""
echo "  3. Start the Metro bundler:"
echo "     npx react-native start"
echo ""
echo "  4. In another terminal, build for iOS:"
echo "     npx react-native run-ios"
echo ""
echo "     Or open ios/HuntPlanAI.xcworkspace in Xcode"
echo "     and press Cmd+R to build and run."
echo ""
echo "  5. For real device testing, update the API_BASE_URL"
echo "     in src/services/api.ts to your Mac's LAN IP"
echo "     (e.g., http://192.168.1.100:8000)"
echo ""
echo "============================================"
echo "  Happy Hunting! 🦌"
echo "============================================"
echo ""
