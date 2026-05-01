#!/bin/bash
#
# pre_build_check.sh — Pre-flight checks before any iOS build, archive, or
# pod install. Catches a class of bugs that previously cost a full build
# round-trip to surface.
#
# Run from the repo root:
#   bash scripts/pre_build_check.sh
#
# Exits 0 when safe to proceed, non-zero with a clear error message when not.
#
# Why this exists
# ---------------
# 2026-04-30 build session caught two pre-bundle issues that wasted ~20
# minutes each:
#
#   (a) Node 25 + RN 0.76 codegen crash. Documented in
#       memory/build_issues.md. We force a Node version check here so
#       you find out BEFORE pod install instead of mid-pod-install.
#
#   (b) Stale babel plugin path. babel.config.js referenced
#       `@nozbe/watermelondb/babel-plugin` which no longer ships in
#       watermelondb 0.28. Cached metro bundles tolerated this for
#       weeks; the first --reset-cache rebundle blew up after 60s of
#       waiting. We now actively resolve every plugin/preset declared
#       in babel.config.js so missing modules surface in <5s.
#
# Add new checks here when you find another class of pre-build bug. The
# gate is run-fast, fail-loud — every check should complete in seconds.
#
# 2026-04-30 (V2.4 audit, second session): script was lost in the
# git-history rewrite that scrubbed the Mapbox token. Recreated from
# memory entry `pre_submit_audit_2026_04_30.md`.
#
# IMPORTANT: This script does not modify state. It only reads.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

echo "Pre-build checks for MDHuntFishOutdoors V$(node -p "require('./package.json').version" 2>/dev/null || echo '?')"
echo "Working dir: $ROOT"
echo ""

# ── 1. Canonical-repo lock ────────────────────────────────────────
# huntmaryland-build is the canonical folder name. After the iCloud
# disaster on 2026-04-30 we moved the project from ~/Documents/ to
# ~/Code/ but the FOLDER NAME stayed huntmaryland-build, so this
# check still works.
EXPECTED_DIR_NAME="huntmaryland-build"
ACTUAL_DIR_NAME="$(basename "$ROOT")"
if [ "$ACTUAL_DIR_NAME" != "$EXPECTED_DIR_NAME" ]; then
  red "✗ Wrong working directory: expected '$EXPECTED_DIR_NAME', got '$ACTUAL_DIR_NAME'"
  red "  See CLAUDE.md for canonical-repo guidance."
  exit 1
fi
green "✓ Working in canonical repo: $ACTUAL_DIR_NAME"

# ── 2. Node version ───────────────────────────────────────────────
NODE_VER=$(node --version 2>/dev/null || echo "missing")
case "$NODE_VER" in
  v18.*|v20.*|v22.*)
    green "✓ Node $NODE_VER (LTS)"
    ;;
  v25.*|v23.*|v24.*)
    red "✗ Node $NODE_VER is NOT LTS — RN 0.76 codegen crashes on this version"
    red "  Fix: brew install node@20 && brew unlink node && brew link node@20 --force --overwrite && hash -r"
    exit 1
    ;;
  missing)
    red "✗ Node not installed or not on PATH"
    exit 1
    ;;
  *)
    yellow "⚠ Node $NODE_VER untested with RN 0.76 — may work, may not"
    ;;
esac

# ── 3. .env exists with required keys ─────────────────────────────
if [ ! -f .env ]; then
  red "✗ .env missing — copy .env.example to .env and fill in"
  exit 1
fi
if ! grep -q '^MAPBOX_ACCESS_TOKEN=pk\.' .env; then
  red "✗ .env: MAPBOX_ACCESS_TOKEN missing or not a pk.* public token"
  exit 1
fi
green "✓ .env configured (MAPBOX_ACCESS_TOKEN present)"

# ── 4. node_modules exists ────────────────────────────────────────
if [ ! -d node_modules ]; then
  red "✗ node_modules missing — run: npm install"
  exit 1
fi
green "✓ node_modules present"

# ── 5. Every babel plugin / preset resolves ───────────────────────
node <<'NODE_SCRIPT'
const path = require('path');
const cfg = require(path.resolve('./babel.config.js'));
const targets = [];
for (const p of (cfg.presets || [])) targets.push({ kind: 'preset', spec: p });
for (const p of (cfg.plugins || [])) targets.push({ kind: 'plugin', spec: p });

const fail = [];
for (const { kind, spec } of targets) {
  const name = Array.isArray(spec) ? spec[0] : spec;
  if (typeof name !== 'string') continue;
  const target = name.replace(/^module:/, '');
  try {
    require.resolve(target, { paths: [process.cwd()] });
  } catch {
    fail.push({ kind, name });
  }
}
if (fail.length) {
  for (const f of fail) {
    console.error(`[31m✗ babel ${f.kind} not resolvable: ${f.name}[0m`);
  }
  console.error(`  Either remove from babel.config.js or install the package.`);
  process.exit(1);
}
console.log(`[32m✓ All ${targets.length} babel presets/plugins resolve[0m`);
NODE_SCRIPT

# ── 6. TypeScript clean ───────────────────────────────────────────
if ! npx tsc --noEmit 2>&1 > /tmp/.tsc_log; then
  red "✗ TypeScript errors:"
  cat /tmp/.tsc_log
  rm -f /tmp/.tsc_log
  exit 1
fi
rm -f /tmp/.tsc_log
green "✓ TypeScript: 0 errors"

# ── 7. Bundle smoke test ──────────────────────────────────────────
echo "  Running bundle smoke test (~30-60s)..."
if ! npx react-native bundle \
       --platform ios \
       --dev false \
       --entry-file index.js \
       --bundle-output /tmp/.preflight-bundle.js \
       --reset-cache \
       > /tmp/.bundle_log 2>&1; then
  red "✗ Bundle smoke test FAILED. First 30 lines of error:"
  head -30 /tmp/.bundle_log
  rm -f /tmp/.bundle_log /tmp/.preflight-bundle.js
  exit 1
fi
BUNDLE_BYTES=$(wc -c < /tmp/.preflight-bundle.js | tr -d ' ')
rm -f /tmp/.bundle_log /tmp/.preflight-bundle.js
green "✓ Bundle smoke test passed (${BUNDLE_BYTES} bytes)"

# ── 8. Mapbox token actually inlined into the bundle ──────────────
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/.preflight-bundle.js \
  > /dev/null 2>&1
TOKEN_PREFIX=$(grep -o '^MAPBOX_ACCESS_TOKEN=pk\.[A-Za-z0-9]\{16\}' .env | cut -d= -f2)
if grep -q "$TOKEN_PREFIX" /tmp/.preflight-bundle.js; then
  green "✓ Mapbox token inlined into bundle (dotenv plugin working)"
else
  red "✗ Mapbox token NOT found in bundle — react-native-dotenv may not be running"
  rm -f /tmp/.preflight-bundle.js
  exit 1
fi
rm -f /tmp/.preflight-bundle.js

echo ""
green "All pre-build checks passed. Safe to:"
echo "    cd ios && rm -rf Pods Podfile.lock && RCT_NEW_ARCH_ENABLED=0 pod install"
echo "    open ios/HuntPlanAI.xcworkspace"
