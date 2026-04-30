#!/bin/bash
echo "=== HuntMaryland iOS Setup Fix v6 ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/mobile" || { echo "ERROR: Cannot find mobile directory"; exit 1; }

# Step 1: Patch codegen for Node 25 compatibility
echo "1. Patching React Native codegen for Node 25 compatibility..."
CODEGEN_FILE="node_modules/@react-native/codegen/lib/parsers/typescript/components/componentsUtils.js"
if [ -f "$CODEGEN_FILE" ]; then
    # Check if already patched
    if grep -q "Codegen Patch" "$CODEGEN_FILE"; then
        echo "   Already patched."
    else
        echo "   Applying patch..."
        # Patch the two throw statements that crash with Node 25
        sed -i.bak 's/throw new Error(`Unknown prop type for "${name}": ${type}`);/console.warn(`[Codegen Patch] Skipping unknown prop: ${name}`); return { type: "StringTypeAnnotation" };/' "$CODEGEN_FILE"
        sed -i.bak 's/throw new Error(`Unknown prop type for "${name}": "${type}"`);/console.warn(`[Codegen Patch] Skipping unknown prop: ${name}`); return { type: "MixedTypeAnnotation" };/' "$CODEGEN_FILE"
        echo "   Patched!"
    fi
else
    echo "   WARNING: Codegen file not found. Run npm install first."
fi
echo ""

# Step 1b: Patch RN CLI to skip Gemfile requirement (CocoaPods via Homebrew)
echo "1b. Patching RN CLI Gemfile requirement..."
INSTALLPODS_FILE="node_modules/@react-native-community/cli-config-apple/build/tools/installPods.js"
if [ -f "$INSTALLPODS_FILE" ]; then
    if grep -q "HuntMaryland Patch" "$INSTALLPODS_FILE"; then
        echo "    Already patched."
    else
        sed -i.bak "s/throw new (_cliTools().CLIError)('Could not find the Gemfile./\/_cliTools().logger.debug('No Gemfile found, skipping bundle install. Using system CocoaPods.'); \/\/ [HuntMaryland Patch] \/\/ throw new (_cliTools().CLIError)('Could not find the Gemfile./" "$INSTALLPODS_FILE"
        echo "    Patched!"
    fi
fi
echo ""

# Step 2: Clean iOS
echo "2. Cleaning iOS build..."
cd ios
rm -rf Pods Podfile.lock build
echo "   Done."
echo ""

# Step 3: Pod install
echo "3. Running pod install..."
export RCT_NEW_ARCH_ENABLED=0
export NO_FLIPPER=1
pod install 2>&1 | tail -60
echo ""

# Step 4: Verify (RN 0.76 split React-Core into multiple pods)
echo "4. Verifying..."
if [ -f "Pods/Manifest.lock" ] && [ -d "Pods/ReactCommon" ]; then
    POD_COUNT=$(find Pods -maxdepth 1 -type d | wc -l | tr -d ' ')
    echo "   SUCCESS! $POD_COUNT pods installed."
    echo "   Workspace: $(ls *.xcworkspace 2>/dev/null)"
    echo ""
    echo "=== READY TO BUILD ==="
    echo "   Run: cd .. && npx react-native run-ios"
else
    echo "   FAILED - Pods not properly installed."
    echo "   Pods contents:"
    ls Pods/ 2>/dev/null | head -20 || echo "   (empty)"
fi
echo ""
echo "=== Done ==="
