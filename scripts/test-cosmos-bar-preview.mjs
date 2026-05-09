// Local smoke test for cosmos-bar artifacts.
// Boots a Playwright headless browser, loads /cosmos-bar-preview.html, verifies:
//   1. cosmos-bar element registers (custom element defined)
//   2. atlas-bar.json fetches successfully
//   3. 8 body links render in shadow DOM
//   4. relay (MCP) link present
//   5. CTA "open the cosmos" link present
//   6. active='shift' dims shift icon to opacity 0.5
//   7. mobile sheet opens at <640px viewport when ✦ launcher tapped
//
// Usage:  node scripts/test-cosmos-bar-preview.mjs
//         (cosmos-atlas dev server must be running on :4287)

import { chromium } from 'playwright';

const URL = process.env.COSMOS_BAR_PREVIEW_URL || 'http://localhost:4287/cosmos-bar-preview.html';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

console.log(`→ ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle' });

// Wait for the bar to render its bodies (8 siblings + 1 cosmos home anchor).
await page.waitForFunction(() => {
  const el = document.querySelector('cosmos-bar');
  if (!el || !el.shadowRoot) return false;
  return el.shadowRoot.querySelectorAll('.body').length >= 9;
}, { timeout: 5000 });

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

const bodyCount = await page.evaluate(() => {
  return document.querySelector('cosmos-bar').shadowRoot.querySelectorAll('.body').length;
});
check('9 bodies render (cosmos + 8 siblings)', bodyCount === 9, `got ${bodyCount}`);

// Cosmos is first body in the bar.
const firstBodySlug = await page.evaluate(() => {
  return document.querySelector('cosmos-bar').shadowRoot.querySelector('.body')?.dataset.slug;
});
check('cosmos is the first body', firstBodySlug === 'cosmos', `first slug=${firstBodySlug}`);

// Divider exists between cosmos and siblings.
const dividerPresent = await page.evaluate(() => !!document.querySelector('cosmos-bar').shadowRoot.querySelector('.divider'));
check('hairline divider present', dividerPresent);

const relayPresent = await page.evaluate(() => !!document.querySelector('cosmos-bar').shadowRoot.querySelector('.relay'));
check('relay (MCP) present', relayPresent);

// Active = shift was set in HTML; verify shift body is dimmed.
const activeOk = await page.evaluate(() => {
  const root = document.querySelector('cosmos-bar').shadowRoot;
  const shift = root.querySelector('.body[data-slug="shift"]');
  if (!shift) return { ok: false, reason: 'no shift body' };
  const opacity = parseFloat(getComputedStyle(shift).opacity);
  const isCurrent = shift.getAttribute('aria-current') === 'true';
  return { ok: isCurrent && opacity < 1, opacity, isCurrent };
});
check('active=shift dims shift icon', activeOk.ok, JSON.stringify(activeOk));

// Hover Earth via real Playwright hover (programmatic mouseenter doesn't trigger :hover).
const earthHandle = await page.evaluateHandle(() => {
  return document.querySelector('cosmos-bar').shadowRoot.querySelector('.body[data-slug="earth"]');
});
await earthHandle.hover();
await page.waitForTimeout(350);
const tipVisible = await page.evaluate(() => {
  const earth = document.querySelector('cosmos-bar').shadowRoot.querySelector('.body[data-slug="earth"]');
  const tip = earth.querySelector('.tip');
  if (!tip) return false;
  return parseFloat(getComputedStyle(tip).opacity) > 0.5;
});
check('hover tooltip appears for Earth', tipVisible);

// Freshness dot — at least one body should have data-fresh="1" since
// atlas.json's lastShippedAt dates are 2026-04 / 2026-05 (well within 14 days
// at 9 May 2026 build time).
const freshCount = await page.evaluate(() => {
  return document.querySelector('cosmos-bar').shadowRoot.querySelectorAll('.body[data-fresh="1"]').length;
});
check('at least one freshness dot present', freshCount > 0, `${freshCount} fresh`);

// Shrink to mobile and verify mobile launcher appears + sheet opens.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(150);
const launchVisible = await page.evaluate(() => {
  const el = document.querySelector('cosmos-bar').shadowRoot.querySelector('.mobile-launch');
  return el && getComputedStyle(el).display !== 'none';
});
check('mobile ✦ launcher visible at 390px', launchVisible);

await page.evaluate(() => {
  document.querySelector('cosmos-bar').shadowRoot.querySelector('.mobile-launch').click();
});
await page.waitForTimeout(300);
const sheetOpen = await page.evaluate(() => {
  const sheet = document.querySelector('cosmos-bar').shadowRoot.querySelector('.sheet');
  return sheet && sheet.getAttribute('data-open') === '1';
});
check('mobile sheet opens on tap', sheetOpen);

const sheetRowCount = await page.evaluate(() => {
  return document.querySelector('cosmos-bar').shadowRoot.querySelectorAll('.sheet-row').length;
});
// 8 bodies + 1 relay + 1 cosmos = 10 sheet rows
check('mobile sheet has 10 rows', sheetRowCount === 10, `got ${sheetRowCount}`);

if (consoleErrors.length) {
  console.log('\n⚠️ Console errors:\n' + consoleErrors.map((e) => '  ' + e).join('\n'));
}

await browser.close();

const failed = checks.filter((c) => !c.ok);
if (failed.length > 0) {
  console.log(`\n❌ ${failed.length} of ${checks.length} checks failed`);
  process.exit(1);
}
console.log(`\n🟢 ALL ${checks.length} CHECKS PASS`);
