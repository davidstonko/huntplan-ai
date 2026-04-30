#!/bin/bash
#
# dev_relaunch.sh — kill any stale/suspended Metro, restart it cleanly with
# transform-cache reset, then build + launch the app on iPhone 17 Pro.
#
# Run this from the canonical repo root:
#   ./dev_relaunch.sh
#
# It uses `nohup` + redirected stdout/stderr so Metro doesn't get suspended
# by zsh's SIGTTOU when it tries to write colored output. Metro logs go to
# /tmp/metro.log — `tail -f /tmp/metro.log` to watch them in another tab.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 1 — kill stale Metro processes (8081/8082) + bg jobs"
echo "═══════════════════════════════════════════════════════════════"
# Kill any lingering Metro/Node tied to these ports
for port in 8081 8082; do
  pids=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  killing pids on :$port → $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
done
# Kill any backgrounded Metro from this shell, just in case
pkill -f "react-native start" 2>/dev/null || true
sleep 1
echo "  done."
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 2 — start Metro in the background (detached from TTY)"
echo "═══════════════════════════════════════════════════════════════"
# nohup + </dev/null + > /tmp/metro.log 2>&1 fully detaches Metro from this
# terminal so zsh can't SIGTTOU-suspend it when it writes color codes.
rm -f /tmp/metro.log
nohup npx react-native start --reset-cache </dev/null > /tmp/metro.log 2>&1 &
METRO_PID=$!
echo "  Metro PID: $METRO_PID"
echo "  log: /tmp/metro.log"

# Wait for Metro to be ready (up to 60s)
echo -n "  waiting for 'Dev server ready'…"
for i in $(seq 1 60); do
  if grep -q "Dev server ready\|Welcome to Metro" /tmp/metro.log 2>/dev/null; then
    echo " ✓"
    break
  fi
  sleep 1
  echo -n "."
done

if ! grep -q "Dev server ready\|Welcome to Metro" /tmp/metro.log 2>/dev/null; then
  echo ""
  echo "  ✗ Metro didn't report ready in 60s. Last 30 lines of log:"
  tail -30 /tmp/metro.log || true
  exit 1
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 3 — build + launch app on iPhone 17 Pro simulator"
echo "═══════════════════════════════════════════════════════════════"
npx react-native run-ios --simulator="iPhone 17 Pro"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Done. Metro PID $METRO_PID running in background."
echo "  To watch Metro logs:    tail -f /tmp/metro.log"
echo "  To stop Metro later:    kill $METRO_PID"
echo "═══════════════════════════════════════════════════════════════"
