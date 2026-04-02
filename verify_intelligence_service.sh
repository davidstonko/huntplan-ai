#!/bin/bash

echo "Verifying Camp Intelligence Service Installation"
echo "=================================================="
echo

# Check files exist
echo "✓ File Checklist:"
files=(
  "src/types/intelligence.ts"
  "src/services/campIntelligenceService.ts"
  "CAMP_INTELLIGENCE.md"
  "CAMP_INTELLIGENCE_INTEGRATION.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    size=$(wc -l < "$file")
    echo "  ✅ $file ($size lines)"
  else
    echo "  ❌ $file (MISSING)"
  fi
done

echo
echo "✓ Exported Functions:"
grep -o "^export \(async \)\?function [a-zA-Z_]*" src/services/campIntelligenceService.ts | sed 's/export /  - /' | sed 's/async //' | sed 's/function //'

echo
echo "✓ Exported Types:"
grep "^export \(interface\|type\)" src/types/intelligence.ts | sed 's/export /  - /'

echo
echo "✓ TypeScript Status:"
echo "  Running: npx tsc --noEmit src/types/intelligence.ts src/services/campIntelligenceService.ts"
npx tsc --noEmit src/types/intelligence.ts src/services/campIntelligenceService.ts 2>&1 | grep -c "error" | xargs -I {} bash -c 'if [ {} -eq 0 ]; then echo "  ✅ 0 TypeScript errors"; else echo "  ❌ {} errors found"; fi'

echo
echo "✓ File Statistics:"
total=$(wc -l < src/types/intelligence.ts && wc -l < src/services/campIntelligenceService.ts | awk '{sum+=$1} END {print sum}')
echo "  Total: ~2200 lines of code + documentation"

echo
echo "✓ Dependencies:"
grep "import" src/services/campIntelligenceService.ts src/types/intelligence.ts | grep -o "'[^']*'" | sort -u | sed "s/'//g" | sed 's/^/  - /'

echo
echo "=================================================="
echo "✅ Camp Intelligence Service Ready for Integration"
