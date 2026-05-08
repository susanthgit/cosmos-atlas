// scripts/capture-og.mjs — Playwright-driven screenshot for the cosmos OG image.
// Takes a 1200×630 capture of the cosmos at a deterministic "peak composition"
// moment and writes it to public/og.png. Used as the OpenGraph + Twitter card.
//
// Why deterministic:
//   - Run with ?og=1 so the page enters a special static "OG mode": skips intro,
//     pins simT to a known phase, hides HUD chrome, freezes camera. This makes
//     re-captures stable across builds.
//
// Usage:
//   node scripts/capture-og.mjs              # use a local dev server (must be running)
//   node scripts/capture-og.mjs --serve      # spin up a temp astro preview server first
//   node scripts/capture-og.mjs --url=https://cosmos.aguidetocloud.com/  # capture live
//
// Run before deploy to refresh the OG image.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public/og.png');

const argv = process.argv.slice(2);
const SERVE = argv.includes('--serve');
const urlArg = argv.find((a) => a.startsWith('--url='));
const baseUrl = urlArg ? urlArg.replace('--url=', '') : 'http://localhost:4287/';

let serverProcess = null;
async function maybeStartServer() {
  if (!SERVE) return;
  console.log('🚀 Spinning up astro preview server...');
  // Build first, then preview (preview serves dist/)
  await new Promise((resolve, reject) => {
    const build = spawn('node', ['./node_modules/astro/astro.js', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
    build.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`astro build exited ${code}`)));
  });
  serverProcess = spawn('node', ['./node_modules/astro/astro.js', 'preview', '--port', '4288'], { cwd: ROOT, stdio: 'pipe', shell: true });
  // Wait for "Local" log line
  await new Promise((resolve) => {
    serverProcess.stdout.on('data', (d) => {
      if (d.toString().includes('Local')) resolve();
    });
    setTimeout(resolve, 6000);
  });
  console.log('  preview ready at :4288');
}

async function capture() {
  const target = SERVE ? 'http://localhost:4288/?og=1&intro=skip' : `${baseUrl.replace(/\/$/, '')}/?og=1&intro=skip`;
  console.log(`📸 Capturing ${target}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.warn('[og err]', m.text()); });

  await page.goto(target, { waitUntil: 'networkidle' });
  // Wait for canvas to mount + settle a few frames.
  await page.waitForFunction(() => document.querySelector('#cosmos-root')?.getAttribute('data-js') === 'ready', { timeout: 10000 });
  await page.waitForTimeout(1200);

  // Ensure the gesture hint, HUD shortcuts, and any planet label aren't visible.
  await page.evaluate(() => {
    const hide = ['#gesture-hint', '.hud-shortcuts', '.hud-mast', '.hud-tools', '.hud-attribution', '.hud-hint', '.planet-label', '#card-panel', 'astro-dev-toolbar', 'astro-dev-overlay'];
    for (const sel of hide) {
      document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
    }
  });
  await page.waitForTimeout(220);

  await page.screenshot({ path: OUT, type: 'png', fullPage: false });
  console.log(`💾 Wrote ${path.relative(ROOT, OUT)} (1200×630 @2x)`);

  await ctx.close();
  await browser.close();
  if (serverProcess) {
    try { serverProcess.kill(); } catch (_) { /* */ }
  }
}

(async () => {
  try {
    await maybeStartServer();
    await capture();
  } catch (err) {
    console.warn('⚠️  capture-og.mjs failed (non-fatal):', err.message ?? err);
    if (serverProcess) { try { serverProcess.kill(); } catch (_) { /* */ } }
    process.exit(0); // don't break the build
  }
})();
