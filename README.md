# 🌌 Cosmos Atlas

> **Live at:** **[cosmos.aguidetocloud.com](https://cosmos.aguidetocloud.com/)** *(deployed 8 May 2026)*
> **What it is:** the bold, lively, interactive map of the A Guide to Cloud cosmos. A living solar system. Click a planet, the camera glides in, the moon reveals, the card slides in.
> **Three keywords:** lively · highly interactive · bold and ambitious.

## What this is not

A docs page about the cosmos. The atlas IS the cosmos. The visual carries the weight; reading happens on demand.

## How the cosmos is structured

| Body | What it is |
|---|---|
| ☀️ The Sun | The AI co-founder. Invisible. Source of energy. Doesn't show up on any planet's surface. |
| 🌍 Earth | `aguidetocloud.com` — the home (certs, tools, mind maps) |
| 🌑 Moon (Guided) | Earth's moon. Cert prep — affordable practice exams. |
| 🪐 CMD | `cmd.aguidetocloud.com` — Microsoft jargon decoder |
| 🪐 Shift | `shift.aguidetocloud.com` — the AI job-change wire |
| 🪐 Plain AI | `plainai.aguidetocloud.com` — AI in plain English (museum) |
| 🌑 Plain AI Curriculum | Plain AI's moon. Free-forever lessons, voluntary work. |
| 🪐 Agentic | `agents.aguidetocloud.com` — agent cockpit for techies |
| 🪐 Claw | `claw.aguidetocloud.com` — OpenClaw, in plain English |
| ⭐ MCP Star | `mcp.aguidetocloud.com` — the cosmos, machine-readable |

## Tech stack

- **Astro 5** (static output) — Astro's natural SSR is the SEO + a11y surface
- **Canvas 2D** + `requestAnimationFrame` — orbits + halos + sun glow + starfield (no GSAP, no Three.js, no PixiJS)
- **HTML overlays** for planet logos — SVG inline, crisp at any scale, native pointer events + focus
- **3D tilt projection** — 38° around screen-x-axis, perspective focal 900px
- **Vanilla CSS** with the Deep Cosmos atmosphere tokens (no framework)
- **TypeScript strict** for the canvas controller
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
| Sun | Invisible pulsing glow — no glyph, no label |
| Tilt | 38° around screen-x-axis |

Per-planet glow colours inherit from each planet's own atmosphere — see `src/data/atlas.json`.

## What's in v1

- Static Astro shell + semantic HTML default render (SEO + a11y for free)
- Canvas-driven 3D-tilted solar system with real planet logos orbiting
- Cards with logo + glow halo + stats chips + voice-passed copy (≤100 words)
- 🌱 free forever badge at TOP of Plain AI / Curriculum cards (constitutional firewall)
- `prefers-reduced-motion` honoured (orbits stop)
- Keyboard navigation (Tab through bodies, Enter opens, Esc closes)
- Mobile-friendly (smaller orbits, card-from-bottom, list-view toggle)
- ~175 KB total transferred (under 250 KB budget)

## What's NOT in v1 (deferred to v2)

See [v2 roadmap](https://github.com/susanthgit/cosmos-atlas/tree/main/docs/v2-roadmap.md) (or in learning-docs: `docs/cosmos/atlas/v2-roadmap.md`).

Permanently skipped (don't re-litigate):
- 3-question router quiz (cosmos IS the navigation)
- Voices block (atlas is spatial orientation, not trust-building)
- Open Laboratory `journal-public.json`
- AGTC lotus at the cosmic centre

Deferred for follow-up:
- Cosmos atlas brand mark (Phase 4b owns)
- Real OG image (1200×630 cosmos screenshot)
- Atlas in `planets.toml` mirrors (cosmos-audit guard #4 — needs cross-planet session)
- Cross-link from each planet's footer (Phase 12)
- Ambient sound (v2 with proper licensing + opt-in UX)
- Per-planet "what's been updated" pulse

## Local dev

```bash
npm install
npm run dev
# → http://localhost:4287
```

## Deploy

```bash
npm run deploy
# → builds + uploads to Cloudflare Pages → live in ~30s
```

Token resolution: `CLOUDFLARE_API_TOKEN` env var → `~/.copilot/secrets/cloudflare-api-token` file.

Full playbook: `learning-docs/docs/cosmos/atlas/deploy-playbook.md`.

## Inter-planet contracts

| Contract | Type | Status |
|---|---|---|
| Reads `planets.json` (vendored from Earth's mirrors) | Read-only data feed | ✅ |
| Owns `atlas.json` (orbit + card content) | Atlas-private | ✅ |
| Receives back-link from each planet's footer | Brand attribution | ⏳ Phase 12 |
| Atlas in `planets.toml` mirrors | Cosmos-audit guard #4 | ⏳ Cross-planet follow-up |

## Status

🟢 **LIVE** — Phase 0 (atmosphere) + Phase 1 (data + cards) + Phase 2 (logos + 3D + richer cards) + Phase 11 (deploy) all shipped 8 May 2026.

| Commit | What |
|---|---|
| `658ab59` | Phase 0 + 1 — scaffold + data + voice-passed cards |
| `e9e8583` | Phase 2 — real planet logos + 3D tilt + richer cards |
| `f0042bc` | Self-hosted fonts via @fontsource |
| `1be8c63` | Direct-upload deploy.mjs |

Vision brief: `learning-docs/docs/cosmos/atlas/vision.md`
v1 shipped: `learning-docs/docs/cosmos/atlas/v1-shipped.md`
v2 roadmap: `learning-docs/docs/cosmos/atlas/v2-roadmap.md`
Deploy playbook: `learning-docs/docs/cosmos/atlas/deploy-playbook.md`

