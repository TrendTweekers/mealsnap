#!/bin/bash
# Remove all old MealSnap icon files

cd "$(dirname "$0")/../public" || exit 1

echo "🧹 Removing old MealSnap icons..."

# List of old icons to remove
OLD_ICONS=(
  "icon.svg"
  "icon-dark-32x32.png"
  "icon-light-32x32.png"
  "icon-maskable.png"
  "placeholder-logo.png"
  "placeholder-logo.svg"
  "placeholder-user.jpg"
  "placeholder.jpg"
  "placeholder.svg"
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

