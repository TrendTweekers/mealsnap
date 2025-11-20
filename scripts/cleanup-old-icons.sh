#!/bin/bash
# Clean up old icon files that are no longer needed

cd "$(dirname "$0")/../public" || exit 1

echo "🧹 Cleaning up old icon files..."

# List of old icons to remove
OLD_ICONS=(
  "favicon.svg"
  "icon.svg"
  "icon-maskable.png"
  "icon-dark-32x32.png"
  "icon-light-32x32.png"
  "icon-192.png"
  "icon-512.png"
)

# Remove old icons
for icon in "${OLD_ICONS[@]}"; do
  if [ -f "$icon" ]; then
    rm "$icon"
    echo "✓ Removed $icon"
  else
    echo "  $icon not found (already removed)"
  fi
done

echo "✅ Cleanup complete!"

