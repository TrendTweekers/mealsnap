#!/bin/bash

echo "🔍 MealSnap Health Check"
echo "========================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules not found. Run 'npm install' first."
  exit 1
fi

echo ""
echo "1. TypeScript Errors:"
echo "--------------------"
npx tsc --noEmit 2>&1 | head -30 || echo "✅ No TypeScript errors found"

echo ""
echo "2. ESLint Errors:"
echo "-----------------"
npm run lint 2>&1 | head -30 || echo "✅ No ESLint errors found"

echo ""
echo "3. Build Test:"
echo "-------------"
npm run build 2>&1 | tail -15 || echo "❌ Build failed"

echo ""
echo "4. Security Issues (API Keys):"
echo "------------------------------"
grep -rn "process.env\." app/api/ 2>/dev/null | grep -v "!" | head -5 || echo "✅ No exposed env vars found"

echo ""
echo "5. Type Safety:"
echo "--------------"
ANY_COUNT=$(grep -rn ":\s*any" app/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | xargs)
echo "  'any' types found: $ANY_COUNT"
if [ "$ANY_COUNT" -gt 0 ]; then
  echo "  ⚠️  Warning: Consider replacing 'any' with proper types"
fi

echo ""
echo "6. Missing Error Handling:"
echo "-------------------------"
MISSING_CATCH=$(grep -rn "async function\|await" app/api/ --include="*.ts" 2>/dev/null | grep -v "try\|catch" | wc -l | xargs)
echo "  Potential unhandled async operations: $MISSING_CATCH"

echo ""
echo "7. Accessibility Issues:"
echo "-----------------------"
NO_ALT=$(grep -rn "<img" app/ --include="*.tsx" 2>/dev/null | grep -v "alt=" | wc -l | xargs)
echo "  Images without alt text: $NO_ALT"

NO_ARIA=$(grep -rn "<button" app/ --include="*.tsx" 2>/dev/null | grep -v "aria-label\|aria-labelledby\|text" | wc -l | xargs)
echo "  Icon buttons without aria-label: $NO_ARIA"

echo ""
echo "8. Mobile Touch Targets:"
echo "-----------------------"
SMALL_TARGETS=$(grep -rn "w-\[.*\]\|h-\[.*\]" app/ --include="*.tsx" 2>/dev/null | grep -E "w-\[[0-3]|h-\[[0-3]" | wc -l | xargs)
echo "  Touch targets < 44px: $SMALL_TARGETS"

echo ""
echo "✅ Health check complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'npm run lint:fix' to auto-fix linting issues"
echo "  - Run 'npm run type-check' for detailed TypeScript errors"
echo "  - Review CODE_ANALYSIS.md for detailed scanning guide"

