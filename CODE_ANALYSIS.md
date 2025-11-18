# MealSnap Code Analysis & Automated Scanning Guide

## Overview
This document provides a comprehensive analysis of the MealSnap codebase structure, common issues to watch for, and automated scanning tools setup.

---

## 📁 Project Structure

```
mealsnap/
├── app/
│   ├── api/                    # API routes
│   │   ├── scan-pantry/        # Image → Ingredients (OpenAI GPT-4 Vision)
│   │   ├── generate-recipes/   # Ingredients → Recipes (OpenAI GPT-4o)
│   │   ├── save-email/         # Email capture (Vercel KV)
│   │   ├── track-scan/         # Analytics tracking
│   │   ├── track-recipe-generation/  # Recipe analytics
│   │   ├── track-ingredient/   # Manual ingredient tracking
│   │   ├── admin/              # Admin endpoints (password protected)
│   │   └── waitlist-count/     # Public waitlist stats
│   ├── admin/                  # Admin dashboard page
│   ├── waitlist/               # Public waitlist page
│   ├── page.tsx                # Main app component (2035 lines)
│   ├── layout.tsx              # Root layout (Analytics, PWA)
│   └── globals.css             # Global styles, CSS variables
├── components/
│   ├── ui/                     # shadcn/ui components
│   └── mealsnap-logo.tsx       # Logo component
├── public/
│   ├── manifest.json           # PWA manifest
│   └── *.svg, *.png            # Icons
├── .eslintrc.json              # ESLint config
├── tsconfig.json               # TypeScript config
└── next.config.mjs             # Next.js config

```

---

## 🔍 Common Issues to Scan For

### 1. **State Management Issues**
**Location**: `app/page.tsx`

**Common Problems:**
- ❌ State updates that don't trigger re-renders
- ❌ Missing dependencies in `useEffect` hooks
- ❌ Race conditions in async state updates
- ❌ `localStorage` accessed before `window` check

**Scan Commands:**
```bash
# Check for useEffect dependencies
grep -n "useEffect" app/page.tsx | grep -v "//"
grep -n "localStorage" app/page.tsx | grep -v "typeof window"

# Check for missing state initialization
grep -n "useState" app/page.tsx | grep "undefined"
```

**Auto-fix Checklist:**
- [ ] All `useEffect` hooks have correct dependencies
- [ ] All `localStorage` access wrapped in `typeof window !== 'undefined'`
- [ ] State updates are batched where appropriate
- [ ] No infinite loops in `useEffect`

---

### 2. **Type Safety Issues**
**Location**: All `.tsx` and `.ts` files

**Common Problems:**
- ❌ Use of `any` type
- ❌ Missing type definitions
- ❌ Incorrect type assertions
- ❌ Props not properly typed

**Scan Commands:**
```bash
# Find all 'any' types
grep -rn ":\s*any" app/ --include="*.ts" --include="*.tsx"

# TypeScript errors
npm run lint
npx tsc --noEmit

# Find untyped functions
grep -rn "function.*\(\)" app/ | grep -v ":" | grep -v "=>"
```

**Auto-fix Checklist:**
- [ ] All API responses typed
- [ ] All component props have interfaces
- [ ] No `any` types (use `unknown` if needed)
- [ ] Type assertions are safe

---

### 3. **API Route Security**
**Location**: `app/api/**/*.ts`

**Common Problems:**
- ❌ Missing input validation
- ❌ No rate limiting
- ❌ Request body size not limited
- ❌ API keys exposed in responses
- ❌ No error handling

**Scan Commands:**
```bash
# Check for missing validation
grep -rn "req.json()" app/api/ | grep -v "await req.json()"

# Check for exposed secrets
grep -rn "process.env" app/api/ | grep -v "!$"

# Check for missing size limits
grep -rn "content-length" app/api/

# Check for missing error handling
grep -rn "async function" app/api/ | while read line; do
  file=$(echo $line | cut -d: -f1)
  func=$(echo $line | cut -d: -f2)
  # Check if function has try/catch
  grep -A 50 "$func" "$file" | grep -q "try\|catch" || echo "$line: Missing try/catch"
done
```

**Security Checklist:**
- [ ] All inputs validated (length, format, type)
- [ ] Request body size limited (10MB for images, 1MB for JSON)
- [ ] API keys never logged or returned
- [ ] Errors don't leak sensitive info
- [ ] Admin routes protected with authentication
- [ ] CORS configured correctly

---

### 4. **Performance Issues**
**Location**: `app/page.tsx`, API routes

**Common Problems:**
- ❌ Large re-renders on every state change
- ❌ Images not optimized
- ❌ Missing memoization
- ❌ Inefficient array operations
- ❌ Large bundle size

**Scan Commands:**
```bash
# Check bundle size
npm run build
# Look for large chunks in .next/analyze

# Find expensive operations
grep -rn "\.map\|\.filter\|\.reduce" app/page.tsx | wc -l

# Check for missing React.memo
grep -rn "export default function" app/ | grep -v "React.memo"

# Find large images
find public -type f -name "*.jpg" -o -name "*.png" | xargs ls -lh | awk '$5 > 500000 {print}'
```

**Performance Checklist:**
- [ ] Images compressed (< 500KB)
- [ ] Large components memoized
- [ ] Expensive calculations memoized with `useMemo`
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lazy loading for non-critical components

---

### 5. **Accessibility Issues**
**Location**: All components

**Common Problems:**
- ❌ Missing `aria-label` on icons
- ❌ Keyboard navigation not working
- ❌ Color contrast too low
- ❌ Missing focus indicators
- ❌ Semantic HTML misuse

**Scan Commands:**
```bash
# Find buttons without aria-label
grep -rn "<button" app/ | grep -v "aria-label\|aria-labelledby"

# Find images without alt
grep -rn "<img" app/ | grep -v "alt="

# Check for proper semantic HTML
grep -rn "<div.*onClick" app/ | grep -v "role="
```

**A11y Checklist:**
- [ ] All interactive elements keyboard accessible
- [ ] All images have `alt` text
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Focus indicators visible
- [ ] ARIA labels on icon-only buttons
- [ ] Semantic HTML used correctly

---

### 6. **Mobile/Responsive Issues**
**Location**: All components

**Common Problems:**
- ❌ Touch targets < 44x44px
- ❌ Missing safe area padding
- ❌ Horizontal scrolling
- ❌ Text too small on mobile
- ❌ Modal doesn't close on backdrop tap

**Scan Commands:**
```bash
# Check touch targets
grep -rn "w-\[.*\]\|h-\[.*\]" app/ | grep -E "w-\[[0-3]|h-\[[0-3]"

# Check for missing responsive classes
grep -rn "className.*w-" app/page.tsx | grep -v "md:\|sm:\|lg:\|xl:"

# Check safe area usage
grep -rn "pb-20\|pb-safe\|safe-area" app/
```

**Mobile Checklist:**
- [ ] All touch targets ≥ 44x44px
- [ ] Safe area padding on iPhone
- [ ] No horizontal scrolling
- [ ] Text readable without zoom
- [ ] Modals close on backdrop tap
- [ ] Bottom nav doesn't overlap content

---

### 7. **Error Handling**
**Location**: All files

**Common Problems:**
- ❌ Unhandled promise rejections
- ❌ Missing try/catch blocks
- ❌ Generic error messages
- ❌ Errors not logged to analytics

**Scan Commands:**
```bash
# Find unhandled promises
grep -rn "await\|\.then\|\.catch" app/ | while read line; do
  if ! echo "$line" | grep -q "try\|catch"; then
    echo "$line: Potential unhandled promise"
  fi
done

# Find missing error boundaries
grep -rn "ErrorBoundary\|componentDidCatch" app/

# Check error logging
grep -rn "catch.*{" app/ | grep -v "console.error\|console.warn"
```

**Error Handling Checklist:**
- [ ] All async operations have try/catch
- [ ] Errors logged to analytics (Plausible)
- [ ] User-friendly error messages
- [ ] Error boundaries for React errors
- [ ] Network errors handled gracefully

---

### 8. **PWA/Offline Issues**
**Location**: `app/layout.tsx`, `public/manifest.json`

**Common Problems:**
- ❌ Missing service worker
- ❌ Icons not optimized
- ❌ Manifest incorrect
- ❌ Not installable

**Scan Commands:**
```bash
# Check manifest validity
cat public/manifest.json | jq .

# Check for required icons
ls -la public/ | grep -E "icon-192|icon-512|apple-touch-icon"

# Check for service worker
find . -name "*service-worker*" -o -name "*sw.js"
```

**PWA Checklist:**
- [ ] Manifest valid and complete
- [ ] Icons exist (192x192, 512x512, 180x180)
- [ ] Theme color matches app
- [ ] Display mode set to "standalone"
- [ ] Works offline (or graceful degradation)

---

## 🤖 Automated Scanning Scripts

### Quick Health Check Script
Create `scripts/health-check.sh`:

```bash
#!/bin/bash
echo "🔍 MealSnap Health Check"
echo "========================"

echo ""
echo "1. TypeScript Errors:"
npx tsc --noEmit 2>&1 | head -20

echo ""
echo "2. ESLint Errors:"
npm run lint 2>&1 | head -20

echo ""
echo "3. Build Test:"
npm run build 2>&1 | tail -10

echo ""
echo "4. Security Issues:"
grep -rn "process.env\." app/api/ | grep -v "!" | head -5

echo ""
echo "5. Type Safety:"
grep -rn ":\s*any" app/ --include="*.ts" --include="*.tsx" | wc -l | xargs echo "  'any' types found:"

echo ""
echo "✅ Health check complete!"
```

### Pre-commit Hook
Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# TypeScript check
npx tsc --noEmit || exit 1

# ESLint check
npm run lint || exit 1

# Find critical issues
if grep -rn ":\s*any" app/ --include="*.ts" --include="*.tsx" | head -5; then
  echo "⚠️  Warning: Found 'any' types"
fi

echo "✅ Pre-commit checks passed!"
```

---

## 📊 Code Metrics

### Current Stats (as of latest commit)
- **Total Lines**: ~2035 (app/page.tsx)
- **Components**: 12+ (StickyHeader, MobileMenu, BottomNav, InstallPrompt, etc.)
- **API Routes**: 8+
- **State Variables**: 15+
- **Type Definitions**: 3 main types (Recipe, ShoppingItem, View)

### Complexity Indicators
- **High**: `app/page.tsx` (monolithic component - consider splitting)
- **Medium**: API routes (good separation)
- **Low**: Utility components, styles

### Recommendations
1. **Split `app/page.tsx`** into smaller components:
   - `HomeView.tsx`
   - `IngredientsView.tsx`
   - `RecipesView.tsx`
   - `FavoritesView.tsx`
   - `components/mobile/MobileMenu.tsx`
   - `components/mobile/BottomNav.tsx`

2. **Add React Context** for shared state:
   - `UserContext` (plan, scanCount)
   - `RecipeContext` (recipes, favorites)

3. **Extract custom hooks**:
   - `useScanLimit.ts`
   - `useFavorites.ts`
   - `useAnalytics.ts`

---

## 🛠️ Setup Automated Scanning

### 1. Install Dependencies
```bash
npm install --save-dev \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-react-hooks \
  husky \
  lint-staged
```

### 2. Update `package.json`
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "health-check": "bash scripts/health-check.sh"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### 3. Setup Husky (Git Hooks)
```bash
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/pre-push "npm run type-check && npm run lint"
```

### 4. GitHub Actions (CI/CD)
Create `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run build
```

---

## 🔒 Security Scanning

### Automated Security Checks
```bash
# Install security scanner
npm install --save-dev npm-audit-resolver

# Run security audit
npm audit

# Check for vulnerable dependencies
npm audit fix --dry-run

# Scan for secrets (use git-secrets)
brew install git-secrets
git secrets --register-aws
git secrets --scan
```

### Common Security Issues
1. **API Keys in Code**: Always use environment variables
2. **XSS Vulnerabilities**: Sanitize user inputs
3. **CSRF Protection**: Use Next.js built-in CSRF
4. **Rate Limiting**: Implement on API routes
5. **SQL Injection**: N/A (using KV store)

---

## 📈 Monitoring & Analytics

### Plausible Events to Track
- `Scan Completed`
- `Recipe Generated`
- `Favorite Added`
- `Share Recipe`
- `Install Prompt Clicked`
- `Upgrade to Pro`

### Performance Monitoring
- Use Vercel Analytics (already integrated)
- Monitor API response times
- Track image upload sizes
- Monitor bundle size

---

## ✅ Pre-Launch Checklist

Run this before every deployment:

```bash
# 1. Type safety
npm run type-check

# 2. Linting
npm run lint

# 3. Build test
npm run build

# 4. Security audit
npm audit

# 5. Manual checks
- [ ] Test on iPhone Safari
- [ ] Test camera permissions
- [ ] Test PWA install
- [ ] Test all modals
- [ ] Test bottom nav
- [ ] Test favorites
- [ ] Test share functionality
- [ ] Test email capture
- [ ] Test admin page (password)
- [ ] Test error states
```

---

## 🚨 Critical Issues to Fix Immediately

If any of these are found, fix before deploying:

1. ❌ API route without input validation
2. ❌ `any` type in API responses
3. ❌ Missing error handling in async functions
4. ❌ Hardcoded API keys
5. ❌ Missing `localStorage` safety checks
6. ❌ Touch targets < 44px
7. ❌ Missing `aria-label` on interactive elements
8. ❌ Unhandled promise rejections

---

## 📝 Notes

- **Last Updated**: 2024-12-19
- **Maintainer**: Development Team
- **Review Frequency**: Before each release

---

## 🔗 Useful Commands

```bash
# Full health check
npm run health-check

# Fix all auto-fixable issues
npm run lint:fix

# Type check only
npm run type-check

# Build for production
npm run build

# Start dev server
npm run dev
```

