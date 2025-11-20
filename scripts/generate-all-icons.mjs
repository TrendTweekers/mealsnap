import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const sourceIcon = join(projectRoot, 'public', 'apple-icon.png');
const outputDir = join(projectRoot, 'public');

// Icon sizes to generate
const iconSizes = [
  { name: 'favicon.png', size: 32 },
  { name: 'icon-64x64.png', size: 64 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-256x256.png', size: 256 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'maskable-icon.png', size: 1024 },
];

// Old icons to remove
const oldIconsToRemove = [
  'favicon.svg',
  'icon.svg',
  'icon-maskable.png',
  'icon-dark-32x32.png',
  'icon-light-32x32.png',
  'icon-192.png',
  'icon-512.png',
  'apple-icon (1).png',
  'icon-192x192 (1).png',
  'icon-512x512 (1).png',
];

async function generateIcons() {
  try {
    // Check if source exists
    if (!existsSync(sourceIcon)) {
      console.error('❌ Source icon not found:', sourceIcon);
      process.exit(1);
    }

    console.log('🎨 Generating PWA icons from apple-icon.png...\n');

    // Generate all icon sizes
    for (const { name, size } of iconSizes) {
      await sharp(sourceIcon)
        .resize(size, size, { 
          fit: 'contain', 
          background: { r: 15, g: 23, b: 42, alpha: 1 } 
        })
        .toFile(join(outputDir, name));
      console.log(`✓ Generated ${name} (${size}x${size})`);
    }

    // Remove old icons
    console.log('\n🧹 Removing old icons...');
    for (const oldIcon of oldIconsToRemove) {
      const oldPath = join(outputDir, oldIcon);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
          console.log(`✓ Removed ${oldIcon}`);
        } catch (err) {
          console.warn(`⚠ Could not remove ${oldIcon}:`, err.message);
        }
      }
    }

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

