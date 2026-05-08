// Compare comets vs outposts modes — desktop + mobile snapshots
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('qa-out/compare', { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const MODES = [
  { name: 'comets', url: 'https://6cd84a89.cosmos-atlas.pages.dev/?ext=comets' },
  { name: 'outposts', url: 'https://6cd84a89.cosmos-atlas.pages.dev/?ext=outposts' },
];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  for (const mode of MODES) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`[${vp.name}/${mode.name}] PAGE ERROR:`, e.message));
    await page.goto(mode.url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.planet-body');
    await page.waitForTimeout(1500); // let comet animation settle visibly
    // Topdown view (default)
    await page.screenshot({ path: `qa-out/compare/${vp.name}-${mode.name}-topdown.png`, fullPage: false });
    // Tilted (cosmos) view
    const cosmosBtn = await page.$('#view-cosmos');
    if (cosmosBtn) {
      await cosmosBtn.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `qa-out/compare/${vp.name}-${mode.name}-tilted.png`, fullPage: false });
    }
    // Body counts
    const counts = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('.planet-body'));
      const byKind = {};
      for (const el of all) {
        const k = el.getAttribute('data-kind') || 'unknown';
        byKind[k] = (byKind[k] || 0) + 1;
      }
      return byKind;
    });
    console.log(`${vp.name} / ${mode.name}: ${JSON.stringify(counts)}`);
    await ctx.close();
  }
}

await browser.close();
console.log('\nScreenshots written to qa-out/compare/');
