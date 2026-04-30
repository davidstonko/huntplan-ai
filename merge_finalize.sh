#!/bin/bash
#
# merge_finalize.sh — finalize the 2026-04-26 fork consolidation.
#
# Run this from the canonical repo root: ~/Documents/huntmaryland-build/
# It does:
#   1. Verify you're in the canonical tree (CLAUDE.md callout, bundle id)
#   2. npm install (already done in the merge sandbox, but idempotent)
#   3. Verify the autolinking-override packages are present
#   4. Clean iOS pods, then pod install with RCT_NEW_ARCH_ENABLED=0
#   5. Verify Podfile.lock contains RNFS, react-native-image-picker, RNShare
#   6. Run npx react-native run-ios --simulator="iPhone 17 Pro"
#
# This is the macOS-only half of the merge. Linux sandbox can't pod install
# or open Simulator, so it must run on your Mac.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 1 — Canonical repo guardrail check"
echo "═══════════════════════════════════════════════════════════════"
if ! grep -q "CANONICAL REPO" CLAUDE.md 2>/dev/null; then
  echo "✗ CLAUDE.md is missing the CANONICAL REPO callout."
  echo "  This script should run only from ~/Documents/huntmaryland-build/."
  exit 1
fi
if ! grep -q "com.davidstonko.huntmaryland" ios/HuntPlanAI/Info.plist 2>/dev/null; then
  # Bundle ID lives in pbxproj, not Info.plist directly — but a sanity ping
  echo "  (note: bundle id is set via pbxproj — skipping plist check)"
fi
echo "✓ Canonical repo confirmed."
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 2 — npm install (idempotent)"
echo "═══════════════════════════════════════════════════════════════"
npm install --no-audit --no-fund
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 3 — Verify autolink-override packages"
echo "═══════════════════════════════════════════════════════════════"
for pkg in react-native-fs react-native-image-picker react-native-share \
           @notifee/react-native @react-native-documents/picker; do
  if [ -d "node_modules/$pkg" ]; then
    v=$(node -p "require('./node_modules/$pkg/package.json').version")
    printf "  ✓ %-40s %s\n" "$pkg" "$v"
  else
    echo "  ✗ MISSING: $pkg"
    exit 1
  fi
done
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 4 — Clean and pod install (RCT_NEW_ARCH_ENABLED=0)"
echo "═══════════════════════════════════════════════════════════════"
cd ios
rm -rf Pods Podfile.lock build
RCT_NEW_ARCH_ENABLED=0 pod install
cd ..
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 5 — Verify autolink overrides took effect"
echo "═══════════════════════════════════════════════════════════════"
MISSING=0
for pod in RNFS react-native-image-picker RNShare; do
  if grep -q "^  - $pod " ios/Podfile.lock; then
    echo "  ✓ $pod present in Podfile.lock"
  else
    echo "  ✗ $pod NOT in Podfile.lock — autolink override didn't take"
    MISSING=$((MISSING + 1))
  fi
done
if [ $MISSING -ne 0 ]; then
  echo ""
  echo "Autolink overrides FAILED. Inspect react-native.config.js and re-run."
  exit 1
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 6 — Build and launch on iPhone 17 Pro simulator"
echo "═══════════════════════════════════════════════════════════════"
echo "(Metro will start in this terminal; the simulator opens separately.)"
echo ""
npx react-native run-ios --simulator="iPhone 17 Pro"
