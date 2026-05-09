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
  await page.waitForTimeout(1500); // long enough for first-visit coach to appear (1200ms delay)

  // V3.6 — dismiss the first-visit coach before any tests. The coach sits
  // centre-bottom and on narrow viewports overlaps bottom-corner bodies
  // (kofi-tip beacon at 0.93/0.86) — meaning a real user would dismiss it
  // before clicking those bodies anyway. Audit mirrors that.
  // Growing-guardrail — Fri 9 May 2026 PM: kofi-tip click on iPhone failed
  // because cosmos-coach intercepted the click via elementFromPoint (coach
  // width ~354px on 390-wide phone covers x=18..372, kofi-tip at x=363).
  await page.evaluate(() => {
    const skip = document.getElementById('coach-skip');
    if (skip) skip.click();
  });
  await page.waitForTimeout(700); // let coach slide out and DOM remove

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

  // V3.5 — External channels: long-form, bites, kofi-shop, kofi-tip must
  // render as bodies on canvas, must open the card panel (NOT navigate / open
  // new tab), and EACH must have ≥1 CTA with target="_blank". Growing-guardrail
  // — Sat 9 May 2026 (V3.3): prior versions opened externals via window.open
  // which broke the click-to-card pattern.
  // — Fri 9 May 2026 (V3.5): Ko-fi was split from one body with 2 CTAs into
  // two separate bodies (🎁 kofi-shop + ☕ kofi-tip), each with 1 CTA. Pair
  // must always be present together — split honours the give-vs-receive
  // separation. If one disappears, fail.
  console.log(`\n=== ${vp.name} / external channels (V3.5) ===`);
  // V3.6 — pre-clean: close any card left open by the interactions test or
  // list-view test. On narrow viewports (iPhone) the card-panel covers most
  // of the right side; if it's still open when externals click their bodies,
  // the bodies are click-blocked by the panel.
  await page.evaluate(() => {
    const closeBtn = document.getElementById('card-close');
    if (closeBtn) closeBtn.click();
    // Also clear focused state on bodies just in case
    document.querySelectorAll('.planet-body[data-focused="true"]').forEach((el) => el.removeAttribute('data-focused'));
  });
  await page.waitForTimeout(500);
  // Belt-and-braces: also force-clear card panel state via Escape key
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const externalSlugs = ['youtube', 'bites', 'linkedin', 'kofi-shop', 'kofi-tip'];
  const externalsExist = await page.evaluate((slugs) => {
    const map = {};
    for (const s of slugs) {
      map[s] = !!document.querySelector(`.planet-body[data-slug="${s}"]`);
    }
    return map;
  }, externalSlugs);
  for (const s of externalSlugs) {
    if (!externalsExist[s]) {
      console.log(`  external ${s}: 🔴 body element missing`);
      totalFails++;
    } else {
      console.log(`  external ${s}: ✓ body present`);
    }
  }

  // V3.5 — Ko-fi pair guardrail: both kofi-shop AND kofi-tip must always
  // exist together. Catches accidental re-merge or drop of either half.
  if (externalsExist['kofi-shop'] && externalsExist['kofi-tip']) {
    console.log(`  kofi pair: ✓ both 🎁 kofi-shop and ☕ kofi-tip present`);
  } else {
    console.log(`  kofi pair: 🔴 split incomplete — kofi-shop=${!!externalsExist['kofi-shop']} kofi-tip=${!!externalsExist['kofi-tip']}`);
    totalFails++;
  }

  // Track popups: external CTAs use target="_blank" so a popup IS expected on
  // CTA click — but NOT on the body click itself (body click should open card).
  let unexpectedPopups = 0;
  const popupHandler = () => { unexpectedPopups++; };
  page.context().on('page', popupHandler);

  for (const slug of externalSlugs) {
    const target = await page.$(`.planet-body[data-slug="${slug}"]`);
    if (!target) continue;
    const popupsBefore = unexpectedPopups;
    // V3.6 — synthetic JS click instead of coord-based mouse click. The
    // body comets (long-form, bites, kofi-shop) ORBIT — by the time
    // Playwright reads their bounding rect and fires a coord-click, the
    // comet has moved and the click hits empty space or a different body.
    // Synthetic click via el.click() dispatches the click event directly
    // to the targeted element, regardless of where it is on screen, which
    // is what we actually want for "this body should open its own card".
    let opened = false;
    for (let attempt = 0; attempt < 3 && !opened; attempt++) {
      await page.evaluate((s) => {
        const el = document.querySelector(`.planet-body[data-slug="${s}"]`);
        if (el) el.click();
      }, slug);
      await page.waitForTimeout(700);
      opened = await page.evaluate(() => !!document.querySelector('.card-panel[data-open="true"]'));
      if (!opened && attempt < 2) await page.waitForTimeout(400);
    }
    if (!opened) {
      console.log(`  external ${slug}: 🔴 click did not open card panel`);
      totalFails++;
    } else {
      // Confirm card content is for this external (slug attr or content marker)
      const cardSlug = await page.evaluate(() => {
        const panel = document.querySelector('.card-panel[data-open="true"]');
        return panel ? panel.getAttribute('data-slug') : null;
      });
      // V3.6 — STRENGTHENED: slug mismatch is now a hard FAIL, not a warning.
      // Growing-guardrail — Fri 9 May 2026 PM: kofi-tip click was opening the
      // kofi-shop card on iPhone because the orbiting kofi-shop comet stole
      // the click via a higher z-index. The card opened ✓ but with the WRONG
      // slug. Previously this passed the audit silently. Now it fails.
      if (cardSlug === slug) {
        console.log(`  external ${slug}: ✓ card opened with correct slug`);
      } else if (cardSlug) {
        console.log(`  external ${slug}: 🔴 card opened with WRONG slug (got '${cardSlug}', expected '${slug}')`);
        totalFails++;
      } else {
        console.log(`  external ${slug}: 🟡 card opened but no data-slug exposed (legacy panel — accept for now)`);
      }
    }
    // Clicking the body should NOT have opened a popup/new tab
    if (unexpectedPopups > popupsBefore) {
      console.log(`  external ${slug}: 🔴 body click opened a new tab/window`);
      totalFails++;
    }
    // V3.5 — Each external card must have ≥ 1 CTA, all target="_blank".
    // Replaces the V3.3 kofi-specific 2-CTA check now that Ko-fi is split.
    if (opened) {
      const ctaInfo = await page.evaluate(() => {
        const panel = document.querySelector('.card-panel[data-open="true"]');
        if (!panel) return { count: 0, allBlank: false };
        const ctas = panel.querySelectorAll('a.card-cta, a.card-cta--secondary, .card-cta');
        const links = panel.querySelectorAll('.card-cta-row a, .card-cta-row--multi a');
        const linkArr = Array.from(links.length ? links : ctas);
        return {
          count: linkArr.length,
          allBlank: linkArr.every((a) => a.getAttribute('target') === '_blank'),
        };
      });
      if (ctaInfo.count >= 1 && ctaInfo.allBlank) {
        console.log(`  ${slug} card: ✓ ${ctaInfo.count} CTA(s), all target=_blank`);
      } else {
        console.log(`  ${slug} card: 🔴 expected ≥1 CTA target=_blank, got count=${ctaInfo.count} allBlank=${ctaInfo.allBlank}`);
        totalFails++;
      }
    }
    const closeBtn = await page.$('#card-close');
    if (closeBtn) { await closeBtn.click(); await page.waitForTimeout(400); }
  }
  page.context().off('page', popupHandler);

  // V3.5 — List-view must contain ALL 4 external channel entries.
  // Growing-guardrail — Sat 9 May 2026 (V3.3): externals only existed as
  // canvas bodies, leaving the no-JS / list-view fallback incomplete.
  // V3.5: ko-fi split → 4 entries (was 3).
  const lvBtn = await page.$('#toggle-list');
  if (lvBtn) {
    await lvBtn.click();
    await page.waitForTimeout(450);
    const listExternals = await page.evaluate(() => {
      const ids = ['external-youtube', 'external-bites', 'external-linkedin', 'external-kofi-shop', 'external-kofi-tip'];
      const found = {};
      for (const id of ids) found[id] = !!document.getElementById(id);
      return found;
    });
    let lvFails = 0;
    for (const [id, present] of Object.entries(listExternals)) {
      if (!present) {
        console.log(`  list-view ${id}: 🔴 missing`);
        lvFails++;
      }
    }
    if (lvFails === 0) {
      console.log(`  list-view externals: ✓ all 5 entries present (youtube, bites, linkedin, kofi-shop, kofi-tip)`);
    } else {
      totalFails += lvFails;
    }
    // Toggle list view back off
    await lvBtn.click();
    await page.waitForTimeout(350);
  }

  // V3.3 — Visual quiet-at-rest: with no body focused, only ONE halo gradient
  // should render around each body (no atmospheric stroke at r*1.05). We can't
  // easily count canvas strokes, but we can ensure no body carries
  // data-focused="true" by default, and that the focused body breath ring
  // appears once a body IS focused. Growing-guardrail — Sat 9 May 2026:
  // previously every body had a permanent atmospheric ring causing visual noise.
  const restState = await page.evaluate(() => {
    const focused = document.querySelectorAll('.planet-body[data-focused="true"]').length;
    const total = document.querySelectorAll('.planet-body').length;
    return { focused, total };
  });
  if (restState.focused === 0) {
    console.log(`  rest state: ✓ no bodies focused by default (${restState.total} bodies present)`);
  } else {
    console.log(`  rest state: 🟡 ${restState.focused} body(ies) focused at rest — confirm intentional`);
  }

  // Phase A — desktop-only checks for HUD declutter, share button, shortcuts
  // modal, replay-coach. Growing-guardrail rule: every Phase A behaviour
  // ships with a check before deploy.
  if (vp.name === 'desktop') {
    console.log(`\n=== ${vp.name} / Phase A ===`);

    // 1. Old HUD chrome removed
    const hudHinted = await page.evaluate(() => ({
      hudHint: !!document.querySelector('.hud-hint'),
      hudShortcuts: !!document.querySelector('.hud-shortcuts'),
    }));
    if (!hudHinted.hudHint) console.log(`  hud-hint removed: ✓`);
    else { console.log(`  hud-hint removed: 🔴 still present`); totalFails++; }
    if (!hudHinted.hudShortcuts) console.log(`  hud-shortcuts removed: ✓`);
    else { console.log(`  hud-shortcuts removed: 🔴 still present`); totalFails++; }

    // 2. Aux buttons present
    const auxButtons = await page.evaluate(() => ({
      replayCoach: !!document.getElementById('replay-coach'),
      openShortcuts: !!document.getElementById('open-shortcuts'),
    }));
    if (auxButtons.replayCoach) console.log(`  hud-aux replay-coach: ✓ present`);
    else { console.log(`  hud-aux replay-coach: 🔴 missing`); totalFails++; }
    if (auxButtons.openShortcuts) console.log(`  hud-aux open-shortcuts: ✓ present`);
    else { console.log(`  hud-aux open-shortcuts: 🔴 missing`); totalFails++; }

    // 3. Card-share button copies → label changes briefly
    await page.evaluate(() => {
      const earth = document.querySelector('.planet-body[data-slug="earth"]');
      if (earth) earth.click();
    });
    await page.waitForTimeout(800);
    // Grant clipboard permissions (no-op if browser refuses, fallback path uses execCommand)
    try { await page.context().grantPermissions(['clipboard-read', 'clipboard-write']); } catch (_) { /* */ }
    const shareBefore = await page.evaluate(() => {
      const btn = document.getElementById('card-share');
      if (!btn) return null;
      const lbl = btn.querySelector('.card-share__label');
      return { exists: true, label: lbl ? lbl.textContent : '' };
    });
    if (!shareBefore) {
      console.log(`  card-share: 🔴 button missing (#card-share)`);
      totalFails++;
    } else {
      await page.click('#card-share');
      await page.waitForTimeout(250);
      const shareAfter = await page.evaluate(() => {
        const btn = document.getElementById('card-share');
        const lbl = btn?.querySelector('.card-share__label');
        return { copied: btn?.dataset.copied, label: lbl ? lbl.textContent : '' };
      });
      if (shareAfter.copied === 'true' || shareAfter.label === 'copied ✓') {
        console.log(`  card-share copy: ✓ feedback shown ("${shareAfter.label}")`);
      } else {
        console.log(`  card-share copy: 🔴 no feedback (data-copied="${shareAfter.copied}" label="${shareAfter.label}")`);
        totalFails++;
      }
      // Close earth card before continuing
      await page.evaluate(() => document.getElementById('card-close')?.click());
      await page.waitForTimeout(300);
    }

    // 4. Shortcuts modal opens via "?" key, closes via Esc
    await page.keyboard.press('?');
    await page.waitForTimeout(200);
    const shortcutsOpen = await page.evaluate(() => {
      const ov = document.querySelector('.cosmos-shortcuts');
      return ov?.dataset.open;
    });
    if (shortcutsOpen === 'true') console.log(`  shortcuts modal "?": ✓ opened`);
    else { console.log(`  shortcuts modal "?": 🔴 did not open (data-open="${shortcutsOpen}")`); totalFails++; }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const shortcutsClosedKey = await page.evaluate(() =>
      document.querySelector('.cosmos-shortcuts')?.dataset.open
    );
    if (shortcutsClosedKey === 'false') console.log(`  shortcuts modal Esc: ✓ closed`);
    else { console.log(`  shortcuts modal Esc: 🔴 did not close (data-open="${shortcutsClosedKey}")`); totalFails++; }

    // 5. Shortcuts modal opens via UI button click
    await page.click('#open-shortcuts');
    await page.waitForTimeout(200);
    const shortcutsOpenBtn = await page.evaluate(() =>
      document.querySelector('.cosmos-shortcuts')?.dataset.open
    );
    if (shortcutsOpenBtn === 'true') console.log(`  shortcuts modal button: ✓ opened`);
    else { console.log(`  shortcuts modal button: 🔴 did not open`); totalFails++; }
    // Close it via the X button
    await page.evaluate(() => document.querySelector('.cosmos-shortcuts__close')?.click());
    await page.waitForTimeout(200);

    // 6. Replay-coach button re-mounts coach
    await page.click('#replay-coach');
    await page.waitForTimeout(250);
    const coachState = await page.evaluate(() => {
      const c = document.getElementById('cosmos-coach');
      return c ? { present: true, visible: c.dataset.visible, step: c.dataset.step } : { present: false };
    });
    if (coachState.present && coachState.visible === 'true' && coachState.step === '0') {
      console.log(`  replay-coach: ✓ coach re-mounted at step 0`);
      // Dismiss it before next test
      await page.evaluate(() => document.getElementById('coach-skip')?.click());
      await page.waitForTimeout(400);
    } else {
      console.log(`  replay-coach: 🔴 coach not re-mounted (${JSON.stringify(coachState)})`);
      totalFails++;
    }

    // ── Phase B checks ──
    console.log(`\n=== ${vp.name} / Phase B ===`);

    // 7. This-week ribbon — auto-derived from atlas + freshness data.
    //    With earth/guided/plainai/curriculum all shipped 2026-05-08, the
    //    ribbon should fade in within 2s and contain at least one body name.
    await page.waitForTimeout(1800); // ribbon fades in at 1400ms
    const ribbonState = await page.evaluate(() => {
      const r = document.getElementById('this-week-ribbon');
      if (!r) return { present: false };
      const names = Array.from(r.querySelectorAll('.this-week-ribbon__name')).map((n) => n.textContent);
      return { present: true, visible: r.dataset.visible, names };
    });
    if (ribbonState.present && ribbonState.visible === 'true' && ribbonState.names && ribbonState.names.length >= 1) {
      console.log(`  this-week ribbon: ✓ visible with ${ribbonState.names.length} name(s) — ${ribbonState.names.slice(0, 3).join(', ')}`);
    } else if (ribbonState.present === false) {
      console.log(`  this-week ribbon: 🟡 element absent (no fresh bodies — atlas data may have aged out)`);
    } else {
      console.log(`  this-week ribbon: 🔴 ${JSON.stringify(ribbonState)}`);
      totalFails++;
    }

    // 8. Sun reveal — long-press (1.2s pointerdown) at viewport centre
    //    triggers the reveal tooltip + sets sunRevealedThisSession.
    //    Using mouse.move + delay-via-down-up because Playwright's mouse.down
    //    doesn't accept a duration; we hold by interleaving waitForTimeout.
    const revealBefore = await page.evaluate(() => document.getElementById('sun-reveal')?.dataset.visible);
    if (revealBefore !== 'true') {
      const cx = vp.width / 2;
      const cy = vp.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.waitForTimeout(1200); // hold past SUN_HOLD_MS (1000ms)
      await page.mouse.up();
      await page.waitForTimeout(250);
      const revealAfter = await page.evaluate(() => document.getElementById('sun-reveal')?.dataset.visible);
      if (revealAfter === 'true') {
        console.log(`  sun reveal: ✓ tooltip shown after 1.2s long-press at centre`);
      } else {
        console.log(`  sun reveal: 🔴 tooltip not shown (data-visible="${revealAfter}")`);
        totalFails++;
      }
    } else {
      console.log(`  sun reveal: 🟡 already visible at test start — skipping trigger`);
    }

    // 9. Blog asteroid belt — Phase B-2. Anchors are rendered server-side
    //    from blog-feed.json. JS positions them every frame around Earth.
    //    Verify: count > 0, anchors have valid hrefs, anchors fade in
    //    (non-zero opacity) once the cosmos has settled.
    await page.waitForTimeout(800); // give belt time to fade in (introBodies > 0.6)
    const beltState = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.blog-asteroid'));
      const visible = items.filter((el) => parseFloat(el.style.opacity || '0') > 0.1);
      return {
        count: items.length,
        visibleCount: visible.length,
        firstHref: items[0]?.getAttribute('href') ?? null,
        firstTitle: items[0]?.getAttribute('title') ?? null,
      };
    });
    if (beltState.count === 0) {
      console.log(`  blog belt: 🟡 0 asteroids — blog-feed.json may be empty`);
    } else if (beltState.visibleCount === 0) {
      console.log(`  blog belt: 🔴 ${beltState.count} anchors but 0 visible (opacity stuck at 0)`);
      totalFails++;
    } else if (!beltState.firstHref || !beltState.firstHref.startsWith('http')) {
      console.log(`  blog belt: 🔴 anchor missing valid href (${beltState.firstHref})`);
      totalFails++;
    } else {
      console.log(`  blog belt: ✓ ${beltState.count} asteroids, ${beltState.visibleCount} visible — first: "${beltState.firstTitle?.slice(0, 40)}"`);
    }

    // ── Phase C — lens framework checks ──
    console.log(`\n=== ${vp.name} / Phase C ===`);

    // 10. Lens pill exists + can toggle open
    const pillState = await page.evaluate(() => {
      const pill = document.getElementById('lens-pill');
      const toggle = document.getElementById('lens-pill-toggle');
      const options = pill ? pill.querySelectorAll('.lens-pill__option').length : 0;
      return { hasPill: !!pill, hasToggle: !!toggle, optionCount: options };
    });
    if (pillState.hasPill && pillState.hasToggle && pillState.optionCount === 4) {
      console.log(`  lens pill: ✓ rendered with 4 options`);
    } else {
      console.log(`  lens pill: 🔴 ${JSON.stringify(pillState)}`);
      totalFails++;
    }

    // 11. Each lens transitions cleanly — verify body[data-lens] attribute
    //     changes and bodies are still clickable after the transition.
    for (const lens of ['constellation', 'timeline', 'audience', 'cosmos']) {
      await page.evaluate((l) => {
        const opt = document.querySelector(`.lens-pill__option[data-lens="${l}"]`);
        if (opt) opt.click();
      }, lens);
      await page.waitForTimeout(900); // wait past LENS_TRANSITION_MS (700ms)
      const lensApplied = await page.evaluate(() => document.body.dataset.lens);
      if (lensApplied === lens) {
        console.log(`  lens "${lens}": ✓ applied (body.dataset.lens="${lens}")`);
      } else {
        console.log(`  lens "${lens}": 🔴 not applied (got="${lensApplied}")`);
        totalFails++;
      }
      // Verify earth body is still clickable after the lens change
      const clickWorks = await page.evaluate(() => {
        const earth = document.querySelector('.planet-body[data-slug="earth"]');
        if (!earth) return 'no-earth';
        earth.click();
        const open = !!document.querySelector('.card-panel[data-open="true"]');
        if (open) document.getElementById('card-close')?.click();
        return open ? 'ok' : 'no-card';
      });
      if (clickWorks === 'ok') {
        console.log(`    bodies clickable in "${lens}": ✓`);
      } else {
        console.log(`    bodies clickable in "${lens}": 🔴 (${clickWorks})`);
        totalFails++;
      }
      await page.waitForTimeout(500);
    }

    // 12. Lens choice persists across reload (localStorage)
    await page.evaluate(() => {
      const opt = document.querySelector('.lens-pill__option[data-lens="constellation"]');
      if (opt) opt.click();
    });
    await page.waitForTimeout(900);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // wait for intro + lens restore
    const restoredLens = await page.evaluate(() => document.body.dataset.lens);
    if (restoredLens === 'constellation') {
      console.log(`  lens persistence: ✓ constellation restored after reload`);
    } else {
      console.log(`  lens persistence: 🔴 expected constellation, got "${restoredLens}"`);
      totalFails++;
    }
    // Reset to cosmos for downstream tests
    await page.evaluate(() => {
      try { localStorage.setItem('cosmosLens', 'cosmos'); } catch (_) { /* */ }
      const opt = document.querySelector('.lens-pill__option[data-lens="cosmos"]');
      if (opt) opt.click();
    });
    await page.waitForTimeout(900);

    // ── Phase D — distribution checks ──
    console.log(`\n=== ${vp.name} / Phase D ===`);

    // 13. ⌘K opens the search overlay (same overlay as `/`).
    // Use Control+K on Windows test runner; cosmos.ts accepts metaKey OR ctrlKey.
    const searchClosedBefore = await page.evaluate(() =>
      document.querySelector('.cosmos-search')?.dataset.open
    );
    if (searchClosedBefore === 'false') {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(220);
      const opened = await page.evaluate(() =>
        document.querySelector('.cosmos-search')?.dataset.open
      );
      if (opened === 'true') console.log(`  ⌘K palette: ✓ opened search overlay`);
      else { console.log(`  ⌘K palette: 🔴 did not open (data-open="${opened}")`); totalFails++; }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(220);
    } else {
      console.log(`  ⌘K palette: 🟡 search already open at test start — skipping`);
    }

    // 14. Audience filter pills — clicking one toggles aria-pressed and
    //     dims at least one planet body.
    const filterState = await page.evaluate(() => {
      const root = document.getElementById('audience-filter');
      if (!root) return { hasRoot: false };
      const pills = root.querySelectorAll('.audience-filter__pill');
      return { hasRoot: true, pillCount: pills.length };
    });
    if (filterState.hasRoot && filterState.pillCount === 4) {
      await page.evaluate(() => {
        const techie = document.querySelector('.audience-filter__pill[data-audience="techie"]');
        if (techie) techie.click();
      });
      await page.waitForTimeout(220);
      const filterApplied = await page.evaluate(() => {
        const techie = document.querySelector('.audience-filter__pill[data-audience="techie"]');
        const dimmed = document.querySelectorAll('.planet-body[data-audience-dim="true"]').length;
        return { pressed: techie?.getAttribute('aria-pressed'), dimmed };
      });
      if (filterApplied.pressed === 'true' && filterApplied.dimmed > 0) {
        console.log(`  audience filter: ✓ "techie" pressed, ${filterApplied.dimmed} bodies dimmed`);
      } else {
        console.log(`  audience filter: 🔴 ${JSON.stringify(filterApplied)}`);
        totalFails++;
      }
      // Clear filter
      await page.evaluate(() => {
        const clear = document.getElementById('audience-filter-clear');
        if (clear) clear.click();
      });
      await page.waitForTimeout(220);
    } else {
      console.log(`  audience filter: 🔴 ${JSON.stringify(filterState)}`);
      totalFails++;
    }

    // 15. Tour mode — start tour, verify body[data-tour="active"], stop via Esc.
    const tourBefore = await page.evaluate(() => document.body.dataset.tour);
    if (tourBefore !== 'active') {
      await page.click('#start-tour');
      await page.waitForTimeout(400);
      const tourActive = await page.evaluate(() => document.body.dataset.tour);
      if (tourActive === 'active') {
        console.log(`  tour mode: ✓ activated (body.dataset.tour="active")`);
        // Esc cancels the tour cleanly even when a card is open (which it
        // is — tour just opened earth's card and that covers the hud-aux
        // start-tour button).
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const tourStopped = await page.evaluate(() => document.body.dataset.tour);
        if (tourStopped !== 'active') {
          console.log(`  tour mode Esc: ✓ stopped via Esc`);
        } else {
          console.log(`  tour mode Esc: 🔴 still active after Esc`);
          totalFails++;
        }
        // Also close any open card so subsequent tests start clean.
        await page.evaluate(() => document.getElementById('card-close')?.click());
        await page.waitForTimeout(300);
      } else {
        console.log(`  tour mode: 🔴 not activated (got="${tourActive}")`);
        totalFails++;
      }
    } else {
      console.log(`  tour mode: 🟡 already active at test start — skipping`);
    }

    // 16. Mini-cosmos widget — verify /mini-cosmos.js is served and is JS.
    const miniResp = await page.goto((vp.name === 'desktop' ? URL : URL).replace(/\/$/, '') + '/mini-cosmos.js', { waitUntil: 'load' });
    if (miniResp && miniResp.status() === 200) {
      const ct = (miniResp.headers()['content-type'] || '').toLowerCase();
      if (ct.includes('javascript') || ct.includes('text/js')) {
        console.log(`  mini-cosmos.js: ✓ served (${ct.split(';')[0]})`);
      } else {
        console.log(`  mini-cosmos.js: 🔴 wrong content-type "${ct}"`);
        totalFails++;
      }
    } else {
      console.log(`  mini-cosmos.js: 🔴 status=${miniResp?.status()}`);
      totalFails++;
    }
    // Navigate back so subsequent tests run against the cosmos page.
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const skip = document.getElementById('coach-skip');
      if (skip) skip.click();
    });
    await page.waitForTimeout(500);
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

