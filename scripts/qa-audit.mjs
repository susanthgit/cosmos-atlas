// Cosmos Atlas QA — verify MCP star position + moon vs planet collision +
// click-to-focus, click-outside-to-close, list view toggle, drag pan limits.
// Usage: node scripts/qa-audit.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] || 'http://localhost:4287/';
mkdirSync('qa-out', { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'iphone', width: 390, height: 844 },
];

let totalFails = 0;

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.log(`[${vp.name}] PAGE ERROR:`, e.message); totalFails++; });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Expected/noise: cloudflareinsights CORS on localhost; "Failed to load" is the same script
    if (text.includes('cloudflareinsights') || text.includes('Failed to load resource')) return;
    console.log(`[${vp.name}] console.error:`, text);
    totalFails++;
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.planet-body', { timeout: 10000 });
  await page.waitForTimeout(800);

  for (const view of ['topdown', 'cosmos']) {
    const btnSelector = `#view-${view}`;
    const btn = await page.$(btnSelector);
    if (btn) { await btn.click(); await page.waitForTimeout(600); }

    const bodies = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.planet-body'));
      return els.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          slug: el.getAttribute('data-slug'),
          kind: el.getAttribute('data-kind'),
          parentSlug: el.getAttribute('data-parent') || null,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
          zIndex: parseInt(getComputedStyle(el).zIndex, 10) || 0,
          opacity: parseFloat(getComputedStyle(el).opacity) || 0,
        };
      });
    });

    const planets = bodies.filter((b) => b.kind === 'planet');
    const moons = bodies.filter((b) => b.kind === 'moon');
    const stars = bodies.filter((b) => b.kind === 'star');

    console.log(`\n=== ${vp.name} / ${view} ===`);
    console.log(`Planets: ${planets.length}, Moons: ${moons.length}, Stars: ${stars.length}`);

    // V3.2 — extended moon collision check: sample 6 timepoints over 18s
    // (one period of the slowest moon) so the audit catches collisions that
    // only happen at certain orbit angles, not just the static snapshot.
    const moonSweepSamples = [];
    for (let s = 0; s < 6; s++) {
      await page.waitForTimeout(2500);
      const sample = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('.planet-body'));
        return els.map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            slug: el.getAttribute('data-slug'),
            kind: el.getAttribute('data-kind'),
            parentSlug: el.getAttribute('data-parent') || null,
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
            w: rect.width,
            h: rect.height,
          };
        });
      });
      moonSweepSamples.push(sample);
    }
    // Aggregate: for each moon vs each non-parent planet, find the WORST distance across all samples
    const sweepReport = new Map();
    for (const sample of moonSweepSamples) {
      const sPlanets = sample.filter((b) => b.kind === 'planet');
      const sMoons = sample.filter((b) => b.kind === 'moon');
      for (const moon of sMoons) {
        for (const other of sPlanets) {
          if (other.slug === moon.parentSlug) continue;
          const d = Math.hypot(moon.cx - other.cx, moon.cy - other.cy);
          const minSafe = (other.w / 2) + (moon.w / 2) + 6;
          const key = `${moon.slug}-vs-${other.slug}`;
          const prev = sweepReport.get(key);
          if (!prev || d < prev.minDist) {
            sweepReport.set(key, { moonSlug: moon.slug, otherSlug: other.slug, minDist: d, minSafe });
          }
        }
      }
    }
    let sweepCollisions = 0;
    for (const [, rec] of sweepReport) {
      if (rec.minDist < rec.minSafe) {
        console.log(`  🔴 sweep: ${rec.moonSlug} OVER ${rec.otherSlug}: minDist=${rec.minDist.toFixed(1)} minSafe=${rec.minSafe.toFixed(1)}`);
        sweepCollisions++;
      }
    }
    if (sweepCollisions > 0) {
      totalFails += sweepCollisions;
    } else {
      console.log(`  ✓ moon-time-sweep: ${sweepReport.size} moon-vs-neighbour pairs sampled across 6 timepoints, no collisions`);
    }

    for (const moon of moons) {
      const parent = planets.find((p) => p.slug === moon.parentSlug);
      if (!parent) continue;
      const dist = Math.hypot(moon.centerX - parent.centerX, moon.centerY - parent.centerY);
      const minSafe = (parent.width / 2) + (moon.width / 2) + 8;
      const ok = dist >= minSafe;
      if (!ok) totalFails++;
      console.log(`  ${moon.slug} vs parent ${parent.slug}: dist=${dist.toFixed(1)} minSafe=${minSafe.toFixed(1)} ${ok ? '✓' : '🔴 TOO CLOSE'}`);
      // V3.2 — also check moon vs OTHER (non-parent) planets.
      // Moon swings on a pixel-fixed orbit around its parent, so on small
      // viewports it can sail OVER adjacent planets. The QA suite samples
      // multiple moon positions across its orbit; we sample with a single
      // worst-case here (current position) — for full coverage extend with
      // an over-time scan in a future grow.
      for (const other of planets) {
        if (other.slug === parent.slug) continue;
        const otherDist = Math.hypot(moon.centerX - other.centerX, moon.centerY - other.centerY);
        const otherMinSafe = (other.width / 2) + (moon.width / 2) + 6;
        const otherOk = otherDist >= otherMinSafe;
        if (!otherOk) {
          console.log(`  🔴 ${moon.slug} OVER neighbour ${other.slug}: dist=${otherDist.toFixed(1)} minSafe=${otherMinSafe.toFixed(1)}`);
          totalFails++;
        }
      }
    }

    const mcp = stars[0];
    if (mcp) {
      const sunX = vp.width / 2;
      const sunY = vp.height / 2;
      const distFromSun = Math.hypot(mcp.centerX - sunX, mcp.centerY - sunY);
      let maxPlanetDist = 0;
      for (const p of planets) {
        const d = Math.hypot(p.centerX - sunX, p.centerY - sunY);
        if (d > maxPlanetDist) maxPlanetDist = d;
      }
      const okOuter = distFromSun >= maxPlanetDist;
      const halfW = mcp.width / 2;
      const halfH = mcp.height / 2;
      const onScreen = mcp.centerX - halfW >= 0 && mcp.centerX + halfW <= vp.width &&
                       mcp.centerY - halfH >= 0 && mcp.centerY + halfH <= vp.height;
      if (!okOuter) totalFails++;
      if (!onScreen) totalFails++;
      console.log(`  MCP star: distFromSun=${distFromSun.toFixed(1)} outerPlanet=${maxPlanetDist.toFixed(1)} ${okOuter ? '✓ OUTSIDE' : '🔴 INSIDE'}`);
      console.log(`  MCP star screen pos: (${mcp.centerX.toFixed(0)}, ${mcp.centerY.toFixed(0)}) ${onScreen ? '✓ ON-SCREEN' : '🔴 CLIPPED'}`);
    }

    await page.screenshot({ path: `qa-out/${vp.name}-${view}.png`, fullPage: false });
  }

  // ── Interaction tests (run only in topdown for speed) ──
  console.log(`\n=== ${vp.name} / interactions ===`);
  const td = await page.$('#view-topdown');
  if (td) { await td.click(); await page.waitForTimeout(500); }

  // Click each planet → card opens with correct slug → close via close-button
  const planetSlugs = ['earth', 'brainbar', 'shift', 'plainai', 'agentic', 'claw'];
  for (const slug of planetSlugs) {
    const target = await page.$(`.planet-body[data-slug="${slug}"]`);
    if (!target) { console.log(`  ${slug}: 🔴 body element missing`); totalFails++; continue; }
    await target.click({ force: true });
    // scheduleUrlWrite() debounces 600ms; wait long enough
    await page.waitForTimeout(800);
    const cardOpen = await page.evaluate(() => {
      const panel = document.querySelector('.card-panel[data-open="true"]');
      if (!panel) return null;
      const params = new URLSearchParams(window.location.search);
      return params.get('planet');
    });
    if (cardOpen === slug) {
      console.log(`  ${slug}: ✓ card opened`);
    } else {
      console.log(`  ${slug}: 🔴 card did not open (got=${cardOpen})`);
      totalFails++;
    }
    // Close via close button (most reliable)
    const closeBtn = await page.$('#card-close');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
    const stillOpen = await page.evaluate(() => !!document.querySelector('.card-panel[data-open="true"]'));
    if (stillOpen) {
      console.log(`  ${slug}: 🔴 card did not close via close button`);
      totalFails++;
    }
  }

  // Test click-outside-to-close once (after opening earth)
  const earthBtn = await page.$('.planet-body[data-slug="earth"]');
  if (earthBtn) {
    await earthBtn.click({ force: true });
    await page.waitForTimeout(700);
    // Find a screen point that hits the cosmos root (no planet, no card, no HUD)
    const target = await page.evaluate(({ vw, vh }) => {
      const candidates = [
        [Math.floor(vw * 0.15), Math.floor(vh * 0.9)],
        [Math.floor(vw * 0.25), Math.floor(vh * 0.85)],
        [Math.floor(vw * 0.5), Math.floor(vh * 0.95)],
        [Math.floor(vw * 0.1), Math.floor(vh * 0.5)],
      ];
      for (const [x, y] of candidates) {
        const el = document.elementFromPoint(x, y);
        if (!el) continue;
        const isProtected = el.closest('.card-panel, .planet-body, .hud-tools, .hud-mast, .hud-attribution');
        // Astro dev-toolbar overlay isn't present in production; skip it during dev
        const isDevTool = el.tagName.startsWith('ASTRO-');
        if (!isProtected && !isDevTool) return { x, y, tag: el.tagName };
      }
      return null;
    }, { vw: vp.width, vh: vp.height });
    if (!target) {
      console.log(`  click-outside-to-close: 🟡 no empty point found in viewport`);
    } else {
      await page.mouse.click(target.x, target.y);
      await page.waitForTimeout(500);
      const closedByOutside = await page.evaluate(() => !document.querySelector('.card-panel[data-open="true"]'));
      if (closedByOutside) {
        console.log(`  click-outside-to-close at (${target.x},${target.y}) hit ${target.tag}: ✓`);
      } else {
        console.log(`  click-outside-to-close at (${target.x},${target.y}) hit ${target.tag}: 🔴 card stayed open`);
        totalFails++;
      }
    }
  }

  // List view toggle
  const listBtn = await page.$('#toggle-list');
  if (listBtn) {
    await listBtn.click();
    await page.waitForTimeout(450);
    const inListView = await page.evaluate(() => document.body.classList.contains('list-view'));
    console.log(`  list view: ${inListView ? '✓ activated' : '🔴 not activated'}`);
    if (!inListView) totalFails++;
    await page.screenshot({ path: `qa-out/${vp.name}-list.png`, fullPage: false });
    // Toggle back off (re-click same button)
    await listBtn.click();
    await page.waitForTimeout(450);
    const stillList = await page.evaluate(() => document.body.classList.contains('list-view'));
    if (stillList) {
      console.log(`  list view: 🔴 did not toggle off`);
      totalFails++;
    } else {
      console.log(`  list view: ✓ toggled off`);
    }
  } else {
    console.log(`  list view: 🔴 toggle button missing (#toggle-list)`);
    totalFails++;
  }

  // Drag-pan limits (desktop only — touch drag on mobile is different)
  if (vp.name === 'desktop') {
    const visibleBefore = await page.evaluate(() => Array.from(document.querySelectorAll('.planet-body'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
      }).length);
    await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(vp.width / 2 + 300 * (i + 1), vp.height / 2);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
    const visibleAfter = await page.evaluate(() => Array.from(document.querySelectorAll('.planet-body'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
      }).length);
    const ok = visibleAfter > 0;
    if (!ok) totalFails++;
    console.log(`  drag pan: ${visibleBefore} visible before → ${visibleAfter} after 3000px drag ${ok ? '✓ clamped' : '🔴 lost all bodies'}`);
    // Reset
    const resetKey = await page.$('kbd:has-text("R")');
    await page.keyboard.press('r');
    await page.waitForTimeout(400);
  }

  await ctx.close();
}

await browser.close();
console.log(`\n${totalFails === 0 ? '🟢 ALL CHECKS PASS' : `🔴 ${totalFails} FAILURE(S)`}`);
console.log('Screenshots written to qa-out/');
process.exit(totalFails === 0 ? 0 : 1);

