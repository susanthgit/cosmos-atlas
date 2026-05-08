// Final V3 verification audit — exercises every shipped V3 feature.
// Run against http://localhost:4287/ with cosmos dev server up.
import { chromium, devices } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const BASE = 'http://localhost:4287/';
const OUT = 'C:/Users/ssutheesh/.copilot/session-state/4e5d136c-5feb-4697-b7da-de50e65bffb3/files/screens-after';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const log = (...a) => console.log(...a);

async function snap(label, deviceCfg, target = BASE, actions = async () => {}) {
  const ctx = await browser.newContext(deviceCfg);
  const page = await ctx.newPage();
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Filter out Cloudflare Web Analytics beacon CORS errors — these only
    // happen against localhost (the beacon's CORS allowlist is the production
    // hostname). Not a regression, just dev-only noise.
    if (text.includes('cloudflareinsights.com')) return;
    errors.push(`[${label}] ${text}`); console.log(`[${label} ERR]`, text);
  });
  page.on('pageerror', e => { errors.push(`[${label}] ${e.message}`); console.log(`[${label} PAGEERROR]`, e.message); });
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await actions(page);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: false, timeout: 60000 });
  log(`✓ ${label}`);
  await ctx.close();
}

// 1 — mobile cosmos default
await snap('01-mobile-cosmos', { ...devices['iPhone 13'] }, BASE, async (page) => {
  await page.evaluate(() => localStorage.setItem('cosmos:intro:v1:seen', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
});

// 2 — mobile list-view chrome OK
await snap('02-mobile-list', { ...devices['iPhone 13'] }, BASE, async (page) => {
  await page.click('#toggle-list');
  await page.waitForTimeout(400);
});

// 3 — mobile list scrolls via touchscreen
await snap('03-mobile-list-scrolled', { ...devices['iPhone 13'] }, BASE, async (page) => {
  await page.click('#toggle-list');
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    let y = 0;
    while (y < 1500) {
      window.scrollBy(0, 100);
      y += 100;
      await new Promise(r => setTimeout(r, 16));
    }
  });
  await page.waitForTimeout(300);
  const sy = await page.evaluate(() => window.scrollY);
  log(`   mobile list scrollY = ${sy} (was 0 before fix; should now be > 800)`);
  if (sy < 200) errors.push(`MOBILE LIST SCROLL FAILED — scrollY=${sy}`);
});

// 4 — desktop list scrolls via wheel
await snap('04-desktop-list-scrolled', { viewport: { width: 1280, height: 800 } }, BASE, async (page) => {
  await page.click('#toggle-list');
  await page.waitForTimeout(400);
  await page.mouse.wheel(0, 1800);
  await page.waitForTimeout(500);
  const sy = await page.evaluate(() => window.scrollY);
  log(`   desktop list scrollY = ${sy} (was 0 before; should be > 1000)`);
  if (sy < 200) errors.push(`DESKTOP LIST SCROLL FAILED — scrollY=${sy}`);
});

// 5 — gesture hint shows on mobile first visit
await snap('05-mobile-gesture-hint', { ...devices['iPhone 13'] }, BASE, async (page) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3300);
});

// 6 — desktop cosmos default (chrome positioned right)
await snap('06-desktop-cosmos', { viewport: { width: 1280, height: 800 } }, BASE, async (page) => {
  await page.evaluate(() => localStorage.setItem('cosmos:intro:v1:seen', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
});

// 7 — URL state round-trip: ?planet=earth&zoom=1.5&view=topdown
await snap('07-url-roundtrip', { viewport: { width: 1280, height: 800 } }, `${BASE}?planet=earth&zoom=1.5&view=topdown&intro=skip`, async (page) => {
  await page.waitForTimeout(2000);
  const state = await page.evaluate(() => ({
    panelOpen: document.querySelector('#card-panel')?.getAttribute('data-open') === 'true',
    cardName: document.querySelector('#card-name')?.textContent || '',
    bodyMode: document.body.dataset.viewMode || '',
    url: window.location.search,
  }));
  log(`   URL roundtrip:`, JSON.stringify(state));
  if (!state.panelOpen) errors.push(`URL ?planet=earth did NOT open card`);
  if (state.bodyMode !== 'topdown') errors.push(`URL ?view=topdown did NOT apply (got ${state.bodyMode})`);
});

// 8 — warp-in visible when card opens
await snap('08-warp-on-open', { viewport: { width: 1280, height: 800 } }, BASE, async (page) => {
  await page.evaluate(() => localStorage.setItem('cosmos:intro:v1:seen', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  // Planets orbit so element-is-stable fails — click via JS dispatch
  await page.evaluate(() => {
    const el = document.querySelector('.planet-body[data-slug="earth"]');
    if (el) el.click();
  });
  await page.waitForTimeout(80); // mid-warp
  const warp = await page.evaluate(() => document.querySelector('#cosmos-root')?.getAttribute('data-warp'));
  log(`   warp attribute = ${warp} (should be 'in' mid-animation)`);
  if (warp !== 'in') errors.push(`WARP did not fire on planet open (data-warp=${warp})`);
});

// 9 — favicon resolves OK
await snap('09-favicon-check', { viewport: { width: 800, height: 200 } }, `${BASE}favicon.svg`, async (page) => {
  await page.waitForTimeout(400);
});

// 10 — tablet list view
await snap('10-tablet-list', { ...devices['iPad Mini'] }, BASE, async (page) => {
  await page.click('#toggle-list');
  await page.waitForTimeout(400);
});

await browser.close();

log('\n--- AUDIT SUMMARY ---');
if (errors.length === 0) {
  log('🟢 ALL CHECKS PASSED');
} else {
  log(`🔴 ${errors.length} ERRORS:`);
  errors.forEach(e => log('  -', e));
}
log(`\nScreens: ${OUT}`);
process.exit(errors.length > 0 ? 1 : 0);
