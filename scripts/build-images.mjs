// scripts/build-images.mjs — one-shot AVIF generator for planet imagery.
//
// Why: AVIF compresses photographic / dithered alpha PNGs roughly 30-50% smaller
// than WebP at the same visual quality. Earth's lotus glyph is the only raster
// asset in this atlas (every other planet is inline SVG), so this is a focused
// optimisation.
//
// Usage:
//   node scripts/build-images.mjs
//
// Behaviour:
//   - Reads each entry in TARGETS, regenerates the .avif sibling next to the
//     source. Re-runnable. Idempotent.
//   - Logs before/after byte counts so you can see the win.
//   - No-op if sharp can't decode the source (logged, not fatal).
//
// Wired into `npm run prebuild` so production deploys always have fresh AVIFs.

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  { src: 'public/planets/earth-lotus.webp', avif: 'public/planets/earth-lotus.avif', quality: 70, effort: 9 },
];

async function fileSize(p) {
  try { return (await fs.stat(p)).size; } catch { return null; }
}

async function buildOne(entry) {
  const srcAbs = path.join(ROOT, entry.src);
  const outAbs = path.join(ROOT, entry.avif);
  const srcSize = await fileSize(srcAbs);
  if (srcSize === null) {
    console.warn(`⚠️  Source missing: ${entry.src}`);
    return;
  }
  try {
    await sharp(srcAbs)
      .avif({ quality: entry.quality, effort: entry.effort, chromaSubsampling: '4:4:4' })
      .toFile(outAbs);
    const outSize = await fileSize(outAbs);
    const saved = srcSize - outSize;
    const pct = Math.round((saved / srcSize) * 100);
    console.log(`✓ ${entry.avif} — ${srcSize} → ${outSize} bytes (saved ${saved} · ${pct}%)`);
  } catch (err) {
    console.warn(`⚠️  Failed to encode ${entry.src}: ${err.message ?? err}`);
  }
}

for (const t of TARGETS) await buildOne(t);
