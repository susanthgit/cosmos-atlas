// Quick interaction test for V3.3 external-channel cards + ring-quiet-at-rest
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:4287/';
const OUT = 'visual-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

async function clickAndSnap(label, slug) {
  // Try clicking up to 3 times — orbital bodies move; sometimes the click misses
  // the moving target's bbox between hit-test and click commit.
  let opened = 'false';
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.click(`button[data-slug="${slug}"]`, { force: true });
    await page.waitForTimeout(800);
    opened = await page.evaluate(() => document.getElementById('card-panel')?.dataset.open);
    if (opened === 'true') break;
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${OUT}/v33-${label}.png`, fullPage: false });
  console.log(`${label} (slug=${slug}) → card opened: ${opened === 'true' ? '✓' : '✗'}`);
  const cta = await page.locator('.card-cta').first();
  const target = await cta.getAttribute('target').catch(() => null);
  if (target === '_blank') console.log(`  ↗ CTA opens in new tab: ✓`);
  // Verify CTA count for kofi
  if (slug === 'kofi') {
    const ctaCount = await page.locator('.card-cta-row--multi .card-cta').count();
    console.log(`  ko-fi has ${ctaCount} CTAs (expected 2)`);
  }
  await page.click('#card-close');
  await page.waitForTimeout(800);
}

// Click each external + a planet for comparison
await clickAndSnap('long-form-card', 'long-form');
await clickAndSnap('bites-card', 'bites');
await clickAndSnap('kofi-card', 'kofi');
await clickAndSnap('earth-card', 'earth');

// Snap rest-state for a clean "no rings" reference
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/v33-rest-state.png`, fullPage: false });
console.log('rest state captured');

await browser.close();
