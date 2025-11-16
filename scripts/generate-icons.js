// Simple script to generate icons from SVG
// Run: node scripts/generate-icons.js

const fs = require('fs')
const path = require('path')

// Check if sharp is available
let sharp
try {
  sharp = require('sharp')
} catch (e) {
  console.error('❌ Sharp not installed. Run: npm install sharp')
  console.log('📦 Installing sharp...')
  const { execSync } = require('child_process')
  try {
    execSync('npm install sharp', { stdio: 'inherit' })
    sharp = require('sharp')
    console.log('✅ Sharp installed!')
  } catch (err) {
    console.error('❌ Failed to install sharp. Please run: npm install sharp')
    process.exit(1)
  }
}

const svgPath = path.join(__dirname, '../icons/snapledger-icon.svg')
const appDir = path.join(__dirname, '../app')
const publicDir = path.join(__dirname, '../public')

// Ensure directories exist
if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true })
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgPath)
    
    // Generate app/icon.png (512x512 for Next.js App Router)
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(appDir, 'icon.png'))
    console.log('✅ Generated app/icon.png (512x512)')

    // Generate app/apple-icon.png (180x180 for Apple)
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(appDir, 'apple-icon.png'))
    console.log('✅ Generated app/apple-icon.png (180x180)')

    // Generate public icons for PWA
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192x192.png'))
    console.log('✅ Generated public/icon-192x192.png')

    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'))
    console.log('✅ Generated public/icon-512x512.png')

    console.log('\n🎉 All icons generated successfully!')
  } catch (error) {
    console.error('❌ Error generating icons:', error)
    process.exit(1)
  }
}

generateIcons()

