# Icon Regeneration Plan

## Summary of Changes

### 1. **Generate All Icon Sizes from `/public/apple-icon.png`**
   - Source: `public/apple-icon.png` (already exists)
   - Generate: 32x32, 64x64, 128x128, 180x180, 192x192, 256x256, 384x384, 512x512, 1024x1024

### 2. **Update `manifest.json`**
   - Keep ONLY: 192x192, 512x512, maskable 1024x1024
   - Remove any extra entries

### 3. **Clean Up `app/layout.tsx`**
   - Use `/favicon.png` (32x32)
   - Use `/apple-touch-icon.png` (180x180)
   - Use `/icon-192x192.png` (192x192)
   - Use `/icon-512x512.png` (512x512)
   - Remove all old references

### 4. **Remove Old Icons**
   - `favicon.svg`
   - `icon.svg`
   - `icon-maskable.png`
   - `icon-dark-32x32.png`
   - `icon-light-32x32.png`
   - `icon-192.png`
   - `icon-512.png`
   - Any duplicate copies

### 5. **Update Theme Colors**
   - Match ChefAI brand colors (teal/green)

---

## Files to Update

1. `public/manifest.json` - Clean icon list
2. `app/layout.tsx` - Updated favicon/apple-touch-icon references
3. Remove old icon files from `public/`

---

## Icon Generation (Manual)

Since Sharp isn't working in WSL, use one of these:

**Option 1: Online Tool**
- Go to https://squoosh.app/
- Upload `apple-icon.png`
- Resize to each size
- Download and save to `public/`

**Option 2: ImageMagick (if available)**
```bash
convert apple-icon.png -resize 32x32 favicon.png
convert apple-icon.png -resize 64x64 icon-64x64.png
convert apple-icon.png -resize 128x128 icon-128x128.png
convert apple-icon.png -resize 180x180 apple-touch-icon.png
convert apple-icon.png -resize 192x192 icon-192x192.png
convert apple-icon.png -resize 256x256 icon-256x256.png
convert apple-icon.png -resize 384x384 icon-384x384.png
convert apple-icon.png -resize 512x512 icon-512x512.png
convert apple-icon.png -resize 1024x1024 maskable-icon.png
```

