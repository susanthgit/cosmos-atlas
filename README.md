# 🌌 Cosmos Atlas

> **Live at:** `cosmos.aguidetocloud.com` *(pre-deploy as of 8 May 2026)*
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
- **Canvas 2D** + `requestAnimationFrame` — orbits, hover, click-to-zoom (no GSAP, no Three.js, no PixiJS in v1)
- **Vanilla CSS** with the Deep Cosmos atmosphere tokens (no framework)
- **TypeScript strict** for the canvas controller

## Atmosphere — Deep Cosmos

Locked 8 May 2026 with Sush:

| Token | Value |
|---|---|
| Background | `#02030E` (almost-black, cool undertone) |
| HUD chrome | `#F2EDE3` (Apollo-Eno warm white) |
| HUD accent | `#FFB347` (scientific-instrument amber) |
| Display font | Space Grotesk (700 hero, 500 chrome) |
| Mono font | JetBrains Mono (orbital labels, MCP tooltips) |

Per-planet glow colours inherit from each planet's own atmosphere (Earth indigo, Plain AI cyan, etc.) — see `src/data/atlas.json`.

## What's in v1

- Static Astro shell + semantic HTML default render (SEO + a11y for free)
- Canvas-driven solar system with orbits, hover, click-to-zoom, card slide-in
- Cards per vision §6 (≤100 words each, voice-passed)
- 🌱 free forever badge at TOP of Plain AI / Curriculum cards (constitutional firewall)
- `prefers-reduced-motion` honoured (orbits stop)
- Keyboard navigation (Tab through orbit-distance order)
- Mobile-friendly (smaller orbits, "tap for list" fallback in HUD if perf tanks)

## What's NOT in v1 (deferred to v2)

- Ambient sound (Eno-Apollo style — needs licensing + opt-in UX)
- 3-question router quiz (cosmos IS the navigation; no quiz on top)
- Voices block (atlas is spatial orientation, not trust-building)
- Open Laboratory journal-public.json (another data contract — add when needed)
- Cross-link from each planet's footer back to the atlas (deferred until parallel voice/logo/nav/parity sessions land)

## Local dev

```bash
npm install
npm run dev
# → http://localhost:4287
```

## Inter-planet contracts

| Contract | Type | Status |
|---|---|---|
| Reads `planets.json` (vendored from Earth's mirrors) | Read-only data feed | ✅ |
| Owns `atlas.json` (orbit + card content) | Atlas-private | ✅ |
| Receives back-link from each planet's footer | Brand attribution | ⏳ Deferred — only after voice/logo/nav parity work lands |

## Status

Phase 0 (atmosphere lock) ✅ · Phase 1 (scaffold + data shape + voice-passed cards) — this commit.

Vision brief: `C:\ssClawy\learning-docs\docs\cosmos\atlas\vision.md`
