// Visual review script — takes screenshots for me to study
// the current cosmos visual state in detail.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:4287/';
const OUT = 'visual-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shoot(label, vp, fn) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  if (fn) await fn(page);
  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: false });
  console.log(`✓ ${label}`);
  await ctx.close();
}

// 1) Desktop topdown — default
await shoot('01-desktop-topdown', { width: 1440, height: 900 });

// 2) Desktop side view
await shoot('02-desktop-side', { width: 1440, height: 900 }, async (p) => {
  await p.click('#view-side');
  await p.waitForTimeout(2000);
});

// 3) Desktop topdown — focused on Earth (force click — orbits move)
await shoot('03-desktop-earth-focus', { width: 1440, height: 900 }, async (p) => {
  await p.click('button[data-slug="earth"]', { force: true });
  await p.waitForTimeout(1500);
});

// 4) Mobile topdown
await shoot('04-mobile-topdown', { width: 390, height: 844 });

// 5) Mobile side
await shoot('05-mobile-side', { width: 390, height: 844 }, async (p) => {
  await p.click('#view-side');
  await p.waitForTimeout(2000);
});

// 6) Desktop list view
await shoot('06-desktop-listview', { width: 1440, height: 900 }, async (p) => {
  await p.click('#toggle-list');
  await p.waitForTimeout(1000);
});

// 7) Zoomed in on Earth+Brainbar+Plain AI to see ring clutter
await shoot('07-rings-clutter', { width: 1440, height: 900 }, async (p) => {
  // mouse-wheel zoom in to make rings more visible
  await p.evaluate(() => {
    const c = document.querySelector('.canvas-stage');
    if (c) {
      c.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, bubbles: true }));
    }
  });
  await p.waitForTimeout(2000);
});

// 8) Mobile bottom-right Ko-fi area
await shoot('08-mobile-kofi', { width: 390, height: 844 }, async (p) => {
  await p.waitForTimeout(2000);
});

await browser.close();
console.log(`\n✓ Screenshots written to ${OUT}/`);
