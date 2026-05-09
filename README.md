# 🌌 Cosmos Atlas

> **Live at:** **[cosmos.aguidetocloud.com](https://cosmos.aguidetocloud.com/)**
> **What it is:** the living, interactive map of the A Guide to Cloud cosmos. Click a planet, the camera glides in, the moon reveals, the card slides in. Switch lenses to see relationships, ship dates, or audience views — all from the same data.
> **Three keywords:** lively · highly interactive · bold and ambitious.

## What this is not

A docs page about the cosmos. The atlas IS the cosmos. The visual carries the weight; reading happens on demand.

## How the cosmos is structured

| Body | What it is |
|---|---|
| ☀️ The Sun | The AI co-founder. Invisible. Source of energy. Long-press the centre once per session for an earned reveal. |
| 🌍 Earth | `aguidetocloud.com` — the home (certs, tools, mind maps) |
| 🌑 Moon (Guided) | Earth's moon. Cert prep — affordable practice exams. |
| 🪐 CMD | `cmd.aguidetocloud.com` — Microsoft jargon decoder |
| 🪐 Shift | `shift.aguidetocloud.com` — the AI job-change wire |
| 🪐 Plain AI | `plainai.aguidetocloud.com` — AI in plain English (museum) |
| 🌑 Plain AI Curriculum | Plain AI's moon. Free-forever lessons, voluntary work. |
| 🪐 Agentic | `agents.aguidetocloud.com` — agent cockpit for techies |
| 🪐 Claw | `claw.aguidetocloud.com` — OpenClaw, in plain English |
| ⭐ MCP Star | `mcp.aguidetocloud.com` — the cosmos, machine-readable |
| 🛰 Voyagers | YouTube long videos · YouTube Bites (10–20 min) · LinkedIn (passing comet) |
| ☄ Beacons | Ko-fi Free Stuff (downloads) · Ko-fi Tip Jar (corner beacon) |
| 🪨 Asteroid belt | 6 most-recent blog posts orbiting Earth |

## Lenses (Phase C)

The cosmos is one canvas, four projections. Switch via the **🪐 lens pill** in the bottom-left corner:

| Lens | What it does |
|---|---|
| 🪐 **Cosmos** *(default)* | Solar system — orbits, sun glow, MCP rays |
| 🌟 **Constellation** | Flatten to 2D, position bodies by `connectsTo[]` graph; ALL relationship edges drawn permanently |
| 📅 **Timeline** | Horizontal axis = ship date (oldest left, newest right); vertical jitter prevents overlap |
| 👥 **Audience** | 4 columns: curious / cert prep / techie / job watcher — bodies fly to their primary column |

Lens choice persists in localStorage. 700ms smoothstep transitions between projections. Bodies stay clickable in every lens.

## What the cosmos can do

| Feature | Trigger |
|---|---|
| Open a planet card | Click any body |
| Copy link to current view | Click ↗ next to card-close |
| Search palette | `/` or `⌘K` (Ctrl+K on Windows) |
| Keyboard shortcuts | `?` key or corner button |
| Replay the 3-step intro | `ⓘ` corner button |
| 35-second auto-flythrough | `▶` corner button (Esc to cancel) |
| Filter by audience | Top-right pills: curious / cert prep / techie / job watcher |
| Switch lens | Bottom-left lens pill |
| Sun reveal (once per session) | 1-second long-press at centre |
| Constellation lines on focus | Click any planet — 3 traveling pulses flow to its connections |
| Freshness ripples | Bodies shipped in last 14 days emit soft amber ripples every 6–24s |
| This-week panel | Top-left corner — auto-derived from atlas + freshness data |
| Mini-cosmos widget | `<a class="mini-cosmos" data-current="earth">` + `mini-cosmos.js` |

## Deep-link state

URL parameters are first-class: `?planet=<slug>` opens that planet pre-focused, `?zoom=<n>` and `?pan=<x>,<y>` restore camera position. The card-share button copies the canonical view URL.

## Tech stack

- **Astro 5** (static output) — Astro's natural SSR is the SEO + a11y surface
- **Canvas 2D** + `requestAnimationFrame` — orbits + halos + sun glow + starfield + constellation lines + freshness ripples + card tether (no GSAP, no Three.js, no PixiJS)
- **HTML overlays** for planet logos — SVG inline, crisp at any scale, native pointer events + focus
- **3D tilt projection** — 30° around screen-x-axis, perspective focal 600px
- **Vanilla CSS** with the Deep Cosmos atmosphere tokens (no framework)
- **TypeScript strict** for the canvas controller (~3,300 lines)
- **Self-hosted fonts** via `@fontsource` Latin (Space Grotesk + JetBrains Mono)
- **Direct-upload deploy** to Cloudflare Pages via `deploy.mjs` (BLAKE3 hashes + Pages API)

## Atmosphere — Deep Cosmos

Locked 8 May 2026 with Sush:

| Token | Value |
|---|---|
| Background | `#02030E` (almost-black, cool undertone) |
| HUD chrome | `#F2EDE3` (Apollo-Eno warm white) |
| HUD accent | `#FFB347` (scientific-instrument amber) |
| Display font | Space Grotesk (700 hero, 500 chrome) |
| Mono font | JetBrains Mono (orbital labels, MCP tooltips) |
| Sun | Invisible pulsing glow — earned reveal on 1s long-press |
| Tilt | 30° around screen-x-axis |

Per-planet glow colours inherit from each planet's own atmosphere — see `src/data/atlas.json`.

## Build pipeline

Three build-time data feeds keep the cosmos in sync with reality:

| Script | Output | What it does |
|---|---|---|
| `scripts/freshness.mjs` | `src/data/freshness.json` | Pulls each planet's sitemap.xml `lastmod`, drives freshness ripples |
| `scripts/blog-feed.mjs` | `src/data/blog-feed.json` | Pulls Hugo's `/index.xml`, filters to `/blog/`, takes 6 most-recent posts → blog asteroid belt |
| `scripts/build-images.mjs` | `public/planets/*.{avif,webp}` | Regenerates Earth lotus optimised images |
| `scripts/capture-og.mjs` | `public/og.png` + `public/og/<slug>.png` | Per-state OG screenshots via Playwright (default + each body) |

All four run on `npm run deploy`. Network failures are non-fatal — previous data preserved.

## V1 → V4 timeline

- **V1** (8 May 2026): Phase 0 + 1 + 2 + 11 — atmosphere, data, voice-passed cards, 3D tilt, real planet logos, direct-upload deploy
- **V2** (9 May 2026 morning): UX rework — fullscreen default, MCP relay metaphor, Ko-fi split, lede + Earth pulse, card dim, first-visit coach
- **V3** (9 May 2026 PM): polish + satellite character + corner-pinned bodies + click-routing fixes
- **V4** (9 May 2026 evening): the **major redesign session** — Phase A + B + C + D shipped, ~28 commits, 12+ new behaviours, full lens framework, voyagers + asteroids + tour mode + filter pills + ⌘K palette + mini-cosmos widget. **This is the version live now.**

The full V4 redesign brief, decisions, and shipped state lives at:
- `learning-docs/docs/cosmos/atlas/v4-redesign.md` (if exported from session)
- `~/.copilot/session-state/<session-id>/plan.md`

## What's NOT in V4 (deferred)

- **Phase E — alive cosmos infrastructure** (presence Worker + Durable Object, collective count, activity ripples, CF Analytics heatmap, Ko-fi tip + shop sparkle ticker). Requires CF Worker + Ko-fi webhook + new API token. **Deferred to its own dedicated session.** ~$5/mo or free tier infra.
- **Cross-planet mini-cosmos vendoring** — the widget exists at `/mini-cosmos.js` but distribution to all 7 planet footers is a follow-up cross-planet session.
- **Per-state OG dynamic serving** — pre-rendered files exist at `public/og/<slug>.png`, but dynamic swap based on `?focus=` requires Cloudflare Pages Functions edge integration.
- **iPhone polish** — the QA suite has 4–5 known iPhone-only orbital geometry failures (guided ↔ brainbar collision, guided ↔ earth distance margin). Sush explicitly waived mobile for the V4 redesign cycle. Separate iPhone session pending.
- **AGTC lotus at the cosmic centre** — permanently skipped.
- **3-question router quiz** — permanently skipped (cosmos IS the navigation).
- **Voices block** — permanently skipped (atlas is spatial orientation, not trust-building).
- **Open Laboratory `journal-public.json`** — permanently skipped.
- **Ambient sound** — V5 with proper licensing + opt-in UX.

## Local dev

```bash
npm install
npm run dev
# → http://localhost:4287
```

## QA suite — `scripts/qa-audit.mjs`

> **🔴 BLOCKING RULE:** Run this before EVERY `git push` or `npm run deploy` that touches `cosmos.ts`, `cosmos.css`, `atlas.json`, `PlanetIcon.astro`, or `index.astro`. ALL desktop checks must pass (exit code 0 + `🟢 ALL CHECKS PASS`). If any fail → DO NOT push. Fix first.
>
> **iPhone exception (V4 cycle, 9 May 2026):** Sush waived iPhone failures for the V4 redesign — they pre-exist on production and are scoped to a separate mobile-only session. Desktop checks remain blocking.

A Playwright suite that exercises the cosmos end-to-end. Runs in ~30s, exits 0 only when everything passes. **22+ desktop checks across Phase A through D**:

- Body counts, moon-vs-planet collision, MCP star outside outermost orbit, MCP on-screen
- All 6 planets click → card opens with correct slug
- Card close button + click-outside-to-close + list view toggle + drag pan clamp
- All 5 external channels (youtube · bites · linkedin · kofi-shop · kofi-tip) render + open cards + have target=_blank CTAs
- Ko-fi pair guardrail (both kofi-shop and kofi-tip must coexist)
- HUD declutter (hud-hint + hud-shortcuts strip removed)
- HUD aux buttons (replay-coach, open-shortcuts, start-tour) present
- Card-share copy-link feedback
- `?` shortcuts modal opens via key + button + closes via Esc
- Replay-coach button re-mounts the 3-step coach
- This-week ribbon visible with body names
- Sun reveal triggers on 1.2s long-press at centre
- Blog asteroid belt: 6 anchors render, become visible, have valid href
- Lens pill renders with 4 options
- All 4 lenses apply via `body.dataset.lens` AND bodies stay clickable in each
- Lens choice persists across reload (localStorage)
- ⌘K opens search overlay
- Audience filter pills toggle aria-pressed and dim non-matching bodies
- Tour mode activates, body[data-tour="active"] set, Esc cancels cleanly
- Mini-cosmos widget served at /mini-cosmos.js with correct content-type

```bash
node scripts/qa-audit.mjs                                # local (npm run dev on :4287)
node scripts/qa-audit.mjs https://cosmos.aguidetocloud.com/  # live smoke test
```

### 🔴 Growing-guardrail rule (universal pattern)

> **Every new bug found in production MUST be added as an automated check in `scripts/qa-audit.mjs` BEFORE the fix is deployed. The test suite only grows — never shrinks.**

Pattern: **find bug → write test that catches it → fix bug → verify test now passes → deploy.** Do not delete checks to make the suite "cleaner". The dust-collected checks are the institutional memory of every customer-facing bug we've ever shipped.

**V4 origin (9 May 2026 PM):** during a 4-hour session adding Phase A–D, every new behaviour shipped with a corresponding QA check (HUD aux, share button, shortcuts modal, replay-coach, this-week ribbon, sun reveal, blog belt, all 4 lenses, ⌘K, audience filter, tour mode, mini-cosmos). Two production bugs were caught by Sush during the same session (root pointer-capture intercepting hud-aux clicks, Earth-first-pulse keyframe shifting Earth outside its orbit) — both have explanatory comments in the codebase to prevent regression.

## Deploy

```bash
npm run deploy
# → freshness + blog-feed + build-images + astro build + Cloudflare Pages upload (~30s)
```

Token resolution: `CLOUDFLARE_API_TOKEN` env var → `~/.copilot/secrets/cloudflare-api-token` file.

## Inter-planet contracts

| Contract | Type | Status |
|---|---|---|
| Reads `planets.json` (vendored from Earth's mirrors) | Read-only data feed | ✅ |
| Reads Hugo blog RSS (`/index.xml`) at build time | Read-only data feed | ✅ Phase D |
| Owns `atlas.json` (orbit + card content) | Atlas-private | ✅ |
| `mini-cosmos.js` widget at `/mini-cosmos.js` | Embeddable export | ✅ Built, awaiting cross-planet vendoring |
| Receives back-link from each planet's footer | Brand attribution | ⏳ Cross-planet session pending |
| Atlas in `planets.toml` mirrors | Cosmos-audit guard #4 | ⏳ Cross-planet follow-up |

## Status

🟢 **V4 LIVE** — Phase A + B + C + D shipped 9 May 2026. 26/33 todos done across the V4 redesign cycle. Phase E (alive infrastructure) deferred to a dedicated session.

| Commit | What |
|---|---|
| `0b15e4a` | Polish: dim MCP star at rest |
| `d3a86ec` | Polish: this-week ribbon to top-left vertical stack |
| `7130550` | Phase D — distribution + Bites restored + Earth-pulse bug fix |
| `57bbfc4` | Phase C — lens framework (Cosmos / Constellation / Timeline / Audience) |
| `4beee7a` | Phase B-2 — voyager treatment + blog asteroid belt + card flyby (lite) |
| `88e3eb7` | Phase B-1 — constellation polish + freshness ripples + this-week ribbon + sun heartbeat & reveal |
| `c29a96e` | Phase A — HUD declutter + share button + ? shortcuts modal + replay-coach |
| `658ab59` | V1 — scaffold + data + voice-passed cards |
| `e9e8583` | V1 — real planet logos + 3D tilt + richer cards |
| `f0042bc` | V1 — self-hosted fonts |
| `1be8c63` | V1 — direct-upload deploy.mjs |


