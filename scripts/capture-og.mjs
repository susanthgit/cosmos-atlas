// scripts/capture-og.mjs — Playwright-driven screenshot for the cosmos OG image.
// Takes 1200×630 captures of the cosmos at deterministic "peak composition"
// moments and writes:
//   - public/og.png (the default share preview)
//   - public/og/<slug>.png for each focused body (Phase D)
//
// Why deterministic:
//   - Run with ?og=1 so the page enters a special static "OG mode": skips intro,
//     pins simT to a known phase, hides HUD chrome, freezes camera. This makes
//     re-captures stable across builds.
//   - Per-state captures use ?og=1&focus=<slug> so the focused planet is
//     centred in the frame.
//
// Usage:
//   node scripts/capture-og.mjs              # default + per-state, dev server (must be running)
//   node scripts/capture-og.mjs --serve      # spin up a temp astro preview server first
//   node scripts/capture-og.mjs --url=https://cosmos.aguidetocloud.com/  # capture live
//   node scripts/capture-og.mjs --default-only  # only the default og.png, skip per-state
//
// Run on deploy via the npm "deploy" script.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DEFAULT = path.join(ROOT, 'public/og.png');
const OUT_DIR = path.join(ROOT, 'public/og');

const argv = process.argv.slice(2);
const SERVE = argv.includes('--serve');
const DEFAULT_ONLY = argv.includes('--default-only');
const urlArg = argv.find((a) => a.startsWith('--url='));
const baseUrl = urlArg ? urlArg.replace('--url=', '') : 'http://localhost:4287/';

// Bodies to capture per-state OG images for. Mirrors atlas.json planets +
// MCP star + the 5 external channels. Moons (guided, curriculum) and the
// blog asteroid belt are not captured — their parent's OG is sufficient.
const FOCUS_SLUGS = [
  'earth', 'brainbar', 'shift', 'plainai', 'agentic', 'claw',
  'mcp',
  'youtube', 'bites', 'linkedin', 'kofi-shop', 'kofi-tip',
];

let serverProcess = null;
async function maybeStartServer() {
  if (!SERVE) return;
  console.log('🚀 Spinning up astro preview server...');
  await new Promise((resolve, reject) => {
    const build = spawn('node', ['./node_modules/astro/astro.js', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
    build.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`astro build exited ${code}`)));
  });
  serverProcess = spawn('node', ['./node_modules/astro/astro.js', 'preview', '--port', '4288'], { cwd: ROOT, stdio: 'pipe', shell: true });
  await new Promise((resolve) => {
    serverProcess.stdout.on('data', (d) => {
      if (d.toString().includes('Local')) resolve();
    });
    setTimeout(resolve, 6000);
  });
  console.log('  preview ready at :4288');
}

async function captureOne(page, target, outPath) {
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#cosmos-root')?.getAttribute('data-js') === 'ready', { timeout: 10000 });
  await page.waitForTimeout(1200);
  // Hide HUD chrome that shouldn't appear in the OG image. Defensive list —
  // any element added later that would clutter the OG should be added here.
  await page.evaluate(() => {
    const hide = [
      '#gesture-hint', '.hud-shortcuts', '.hud-mast', '.hud-tools',
      '.hud-attribution', '.hud-hint', '.hud-aux', '.lens-pill',
      '.this-week-ribbon', '.cosmos-coach',
      '.cosmos-shortcuts', '.lens-legend', '.lens-audience-cols',
      '.planet-label', '#card-panel',
      'astro-dev-toolbar', 'astro-dev-overlay',
    ];
    for (const sel of hide) {
      document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
    }
  });
  await page.waitForTimeout(220);
  await page.screenshot({ path: outPath, type: 'png', fullPage: false });
  console.log(`💾 ${path.relative(ROOT, outPath)}`);
}

async function capture() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const root = SERVE ? 'http://localhost:4288' : baseUrl.replace(/\/$/, '');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.warn('[og err]', m.text()); });

  // 1. Default OG (no focus) — public/og.png
  console.log(`📸 Default capture`);
  await captureOne(page, `${root}/?og=1&intro=skip`, OUT_DEFAULT);

  // 2. Per-state OG for each body — public/og/<slug>.png
  if (!DEFAULT_ONLY) {
    for (const slug of FOCUS_SLUGS) {
      console.log(`📸 Focus: ${slug}`);
      const out = path.join(OUT_DIR, `${slug}.png`);
      try {
        await captureOne(page, `${root}/?og=1&intro=skip&planet=${slug}`, out);
      } catch (err) {
        console.warn(`  ⚠️  ${slug} failed:`, err.message ?? err);
      }
    }
  }

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
