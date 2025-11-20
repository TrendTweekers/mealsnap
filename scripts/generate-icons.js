const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../public/logo-chefai.png');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.error('Logo file not found:', logoPath);
      process.exit(1);
    }

    console.log('Generating icons from logo...');

    // Generate apple-icon.png (180x180)
    await sharp(logoPath)
      .resize(180, 180, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .toFile(path.join(outputDir, 'apple-icon.png'));
    console.log('✓ Created apple-icon.png (180x180)');

    // Generate apple-touch-icon.png (180x180) - same as apple-icon
    await sharp(logoPath)
      .resize(180, 180, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('✓ Created apple-touch-icon.png (180x180)');

    // Generate icon-192x192.png
    await sharp(logoPath)
      .resize(192, 192, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .toFile(path.join(outputDir, 'icon-192x192.png'));
    console.log('✓ Created icon-192x192.png');

    // Generate icon-512x512.png
    await sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .toFile(path.join(outputDir, 'icon-512x512.png'));
    console.log('✓ Created icon-512x512.png');

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
