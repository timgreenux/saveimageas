const fs = require('fs')
const path = require('path')

const imagesDir = path.join(__dirname, '../images')
const publicImagesDir = path.join(__dirname, '../public/images')
const manifestPath = path.join(publicImagesDir, 'manifest.json')

const IMAGE_EXT = /\.(gif|jpe?g|png|webp|bmp|svg|ico)$/i

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(publicImagesDir, { recursive: true })
  fs.writeFileSync(manifestPath, JSON.stringify({ images: [] }, null, 2))
  process.exit(0)
}

fs.mkdirSync(publicImagesDir, { recursive: true })

const files = fs.readdirSync(imagesDir).filter((f) => IMAGE_EXT.test(f))
for (const f of files) {
  const src = path.join(imagesDir, f)
  const dest = path.join(publicImagesDir, f)
  if (fs.statSync(src).isFile()) fs.copyFileSync(src, dest)
}

const images = files.map((name) => ({
  id: name,
  name,
  url: `/images/${name}`,
}))

fs.writeFileSync(manifestPath, JSON.stringify({ images }, null, 2))
console.log('Generated images manifest with', images.length, 'images')
