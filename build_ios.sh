#!/bin/bash
echo "=== HuntMaryland iOS Build ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/mobile/ios" || { echo "ERROR: Cannot find ios directory"; exit 1; }

# Check pods are installed
if [ ! -f "Pods/Manifest.lock" ]; then
    echo "ERROR: Pods not installed. Run fix_ios.sh first."
    exit 1
fi

echo "1. Starting Metro bundler in background..."
cd "$SCRIPT_DIR/mobile"
npx react-native start --port 8081 &
METRO_PID=$!
echo "   Metro PID: $METRO_PID"
sleep 3
echo ""

echo "2. Booting iOS Simulator..."
# Find an available iPhone simulator
SIM_ID=$(xcrun simctl list devices available | grep "iPhone" | head -1 | grep -oE '[0-9A-F-]{36}')
if [ -z "$SIM_ID" ]; then
    echo "   No iPhone simulator found. Creating one..."
    SIM_ID=$(xcrun simctl create "iPhone 16" com.apple.CoreSimulator.SimDeviceType.iPhone-16 2>/dev/null)
fi
echo "   Simulator ID: $SIM_ID"
xcrun simctl boot "$SIM_ID" 2>/dev/null
open -a Simulator
echo ""

echo "3. Building app with xcodebuild (this takes a few minutes on first build)..."
cd "$SCRIPT_DIR/mobile/ios"

export RCT_NEW_ARCH_ENABLED=0

xcodebuild \
    -workspace HuntPlanAI.xcworkspace \
    -scheme HuntPlanAI \
    -sdk iphonesimulator \
    -configuration Debug \
    -destination "id=$SIM_ID" \
    -derivedDataPath build \
    build 2>&1 | tee /tmp/huntmaryland_build.log | grep -E "^(Build |error:|warning:.*error|CompileC |Ld |✗|===)"

BUILD_EXIT=$?
echo ""

if [ $BUILD_EXIT -eq 0 ]; then
    echo "4. Installing app on simulator..."
    APP_PATH=$(find build -name "HuntPlanAI.app" -path "*/Debug-iphonesimulator/*" | head -1)
    if [ -n "$APP_PATH" ]; then
        xcrun simctl install "$SIM_ID" "$APP_PATH"
        echo "5. Launching app..."
        xcrun simctl launch "$SIM_ID" com.huntplanai.app
        echo ""
        echo "=== SUCCESS! HuntMaryland is running in the simulator ==="
        echo "   Metro bundler running on port 8081 (PID: $METRO_PID)"
        echo "   Press Ctrl+C to stop Metro when done"
    else
        echo "   ERROR: Could not find built .app bundle"
        echo "   Check build log: /tmp/huntmaryland_build.log"
    fi
else
    echo "BUILD FAILED. Check log: /tmp/huntmaryland_build.log"
    echo "Last 30 lines of errors:"
    grep -i "error:" /tmp/huntmaryland_build.log | tail -30
    kill $METRO_PID 2>/dev/null
fi
