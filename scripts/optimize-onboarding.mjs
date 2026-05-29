// One-off: shrink the onboarding illustrations for the app bundle.
// The slides render at most ~380dp wide, so the full-res PNGs (up to 6 MB each)
// are hugely wasteful. Re-encode to WebP at a sane width to cut ~10 MB of app
// size with no visible quality loss. expo-image renders WebP natively.
// Run: node scripts/optimize-onboarding.mjs

import { statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(here, '..', 'assets', 'images');
const MAX_WIDTH = 1280; // covers ~3.3x density at the 380dp display cap
const QUALITY = 82;

for (const n of [1, 2, 3]) {
  const src = join(imagesDir, `bookie-slide-${n}.png`);
  const out = join(imagesDir, `bookie-slide-${n}.webp`);
  const before = statSync(src).size;
  await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out);
  const after = statSync(out).size;
  console.log(
    `bookie-slide-${n}: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`,
  );
}
