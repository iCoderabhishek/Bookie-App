// One-shot rasterizer for the Bookie SVG mark.
// Reads scripts/*.svg, writes assets/images/*.png at the sizes Expo needs.
// Run: npm run build:icons

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const svgIn = (name) => readFileSync(join(here, name));
const pngOut = (name) => join(root, 'assets', 'images', name);

const targets = [
  { svg: 'icon.svg', png: 'icon.png', size: 1024 },
  { svg: 'icon-foreground.svg', png: 'android-icon-foreground.png', size: 1024 },
  { svg: 'icon-background.svg', png: 'android-icon-background.png', size: 1024 },
  { svg: 'icon-monochrome.svg', png: 'android-icon-monochrome.png', size: 1024 },
  { svg: 'splash.svg', png: 'splash-icon.png', size: 1024 },
  { svg: 'icon.svg', png: 'favicon.png', size: 196 },
];

for (const t of targets) {
  await sharp(svgIn(t.svg), { density: 384 })
    .resize(t.size, t.size)
    .png({ compressionLevel: 9 })
    .toFile(pngOut(t.png));
  console.log(`wrote ${t.png} (${t.size}x${t.size})`);
}
