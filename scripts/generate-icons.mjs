import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const logoPath = join(projectRoot, 'public', 'logo-chefai.png');
const outputDir = join(projectRoot, 'public');

async function generateIcons() {
  try {
    // Check if logo exists
    if (!existsSync(logoPath)) {
      console.error('❌ Logo file not found:', logoPath);
      process.exit(1);
    }

    console.log('🎨 Generating icons from logo...\n');

    const iconSizes = [
      { name: 'apple-icon.png', size: 180 },
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'icon-192x192.png', size: 192 },
      { name: 'icon-512x512.png', size: 512 },
    ];

    for (const { name, size } of iconSizes) {
      await sharp(logoPath)
        .resize(size, size, { 
          fit: 'contain', 
          background: { r: 15, g: 23, b: 42, alpha: 1 } 
        })
        .toFile(join(outputDir, name));
      console.log(`✓ Created ${name} (${size}x${size})`);
    }

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    console.error('\n💡 Alternative: You can manually resize logo-chefai.png to create:');
    console.error('   - apple-icon.png (180x180)');
    console.error('   - apple-touch-icon.png (180x180)');
    console.error('   - icon-192x192.png (192x192)');
    console.error('   - icon-512x512.png (512x512)');
    process.exit(1);
  }
}

generateIcons();

