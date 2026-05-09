// Cosmos Atlas — canvas controller (v3.1: deeper · richer · alive · constellated)
// HTML divs render the SVG planet logos (crisp at any size).
// Canvas renders: nebulae · 3-layer parallax starfield · orbit ellipses (3D-projected) ·
//                 sun corona · MCP rays to live endpoints · body atmospheric rings ·
//                 freshness pulses · constellation lines · sonar pings.
// Pointer events live on the body divs, not on the canvas.
// Honours prefers-reduced-motion, keyboard nav (Esc · r · 0–6), mobile rendering (no auto-fallback).

interface OrbitPlanet { radius: number; ecc: number; tilt: number; speedSec: number; phase: number }
interface OrbitMoon { radius: number; speedSec: number; phase?: number }
interface BodyVisuals { size: number; glowCore: string; glowOuter: string }

interface Card {
  slug: string; name: string; url: string;
  type: string; atmosphere: string; status: string;
  badge?: string; tagline: string;
  audience: string; content: string; founder: string;
  stats?: string[];
  library?: LibraryLink[];   // small "browse the deeper content" link-pills (Wave 1, V5)
  lastShippedAt?: string;   // ISO date — used for freshness pulse
  connectsTo?: string[];    // slugs of related bodies — drawn as constellation lines on focus
}

interface LibraryLink { icon: string; label: string; url: string }

interface Moon extends Card { orbit: OrbitMoon; body: BodyVisuals }
interface Planet extends Card { orbit: OrbitPlanet; body: BodyVisuals; moons?: Moon[] }

interface Sun {
  label: string; subLabel: string; tooltip: string;
  glowCore: string; glowMid?: string; glowOuter: string; glowFar?: string;
  size: number; pulseSec: number;
  rays?: number; rayLength?: number;
}

interface AtmosphereTokens {
  background: string; backgroundEdge: string;
  hud: string; hudMuted: string; hudFaint: string;
  accent: string; accentSoft: string;
  rule: string; ruleStrong: string; shadow: string;
  displayFont: string; monoFont: string;
  tilt?: number;
  focal?: number;
}

interface McpEndpoint { slug: string; name: string; url: string; status: string }
interface McpAnchor { x: number; y: number; size: number; glowCore: string; glowOuter: string }
interface McpPosition { rOrbit: number; thetaDeg: number }
interface McpStar {
  slug: string; name: string; url: string; type: string; atmosphere: string; status: string;
  tagline: string; audience: string; content: string; founder: string;
  stats?: string[]; anchor?: McpAnchor; position?: McpPosition;
  endpoints: McpEndpoint[]; starfield: { x: number; y: number; size: number; twinkleSec: number }[];
  lastShippedAt?: string; connectsTo?: string[];
}

// V3.2 — external channels (YouTubes + Ko-fi). Not planets, not destinations
// inside the cosmos. They sit OUTSIDE the planet orbits and connect to the wider
// world. Two render styles selectable via ?ext= URL param.
// V3.3 — beacon satellites removed; Ko-fi is now a single body whose card has
// two CTAs (downloads + tip) instead of two orbiting satellites in the corner.
interface ExternalCta { label: string; icon?: string; url: string; kind?: 'primary' | 'secondary' }
interface ExternalChannel {
  slug: string; name: string; url: string; type: string;
  tagline: string; audience: string; content: string; founder: string;
  stats?: string[];
  body: { size: number; glowCore: string; glowOuter: string };
  // 'comets' style data
  comet?: { orbitMul: number; speedSec: number; ecc: number; tilt: number; phase: number; tailLen: number };
  beacon?: { x: number; y: number };
  // 'outposts' style data
  outpost?: { thetaDeg: number };
  // V3.3 — card CTAs. Single-CTA channels use ctaLabel/ctaIcon; multi-CTA
  // channels (Ko-fi) provide a `ctas` array.
  ctaLabel?: string;
  ctaIcon?: string;
  ctas?: ExternalCta[];
}

interface DecorativeStar { x: number; y: number; size: number; alpha: number }
interface Nebula { x: number; y: number; size: number; color: string; alpha: number; driftSec: number; phase?: number }

// Generated parallax stars (3 layers); not authored in atlas.json.
interface ParallaxStar {
  x: number; y: number;          // base 0..1 normalised position
  size: number; alpha: number;
  driftPxPerSec: number;         // horizontal drift speed (px / sec)
  layer: 'bg' | 'mid' | 'fg';
  twinklePhase: number;
  twinkleSec: number;
}

interface CosmosData {
  atmosphere: AtmosphereTokens;
  sun: Sun;
  planets: Planet[];
  mcp: McpStar;
  decorativeStars: DecorativeStar[];
  nebulae?: Nebula[];
  external?: { channels: ExternalChannel[] };
  blogPosts?: Array<{ title: string; url: string; pubDate: string | null }>;
}

interface BodyState {
  el: HTMLButtonElement;
  kind: 'planet' | 'moon' | 'star' | 'comet' | 'beacon' | 'outpost';
  slug: string;
  parentSlug?: string;
  ref: Planet | Moon | McpStar | ExternalChannel;
  screenX: number;     // canvas-space (post camera)
  screenY: number;
  baseScreenX: number; // pre-magnetism, for hover lookups
  baseScreenY: number;
  scale: number;
  depth: number;
  intrinsicSize: number;
  glowCore: string;
  glowOuter: string;
}

interface Ping { slug: string; x: number; y: number; startMs: number; size: number }

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;

export function mountCosmos(data: CosmosData): void {
  const root = document.getElementById('cosmos-root') as HTMLElement | null;
  const canvas = document.getElementById('cosmos-canvas') as HTMLCanvasElement | null;
  const cardPanel = document.getElementById('card-panel') as HTMLElement | null;
  const cardBody = document.getElementById('card-body') as HTMLElement | null;
  const cardClose = document.getElementById('card-close') as HTMLButtonElement | null;
  const cardShare = document.getElementById('card-share') as HTMLButtonElement | null;
  const planetLabel = document.getElementById('planet-label') as HTMLElement | null;
  const toggleList = document.getElementById('toggle-list') as HTMLButtonElement | null;
  const bodiesRoot = document.getElementById('bodies') as HTMLElement | null;

  if (!root || !canvas || !cardPanel || !cardBody || !cardClose || !planetLabel || !toggleList || !bodiesRoot) {
    console.warn('[cosmos] Missing required DOM nodes; static fallback remains visible.');
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    console.warn('[cosmos] Canvas 2D unavailable; static fallback remains visible.');
    return;
  }

  root.dataset.js = 'ready';
  canvas.removeAttribute('aria-hidden');
  canvas.setAttribute('role', 'presentation');

  // Tilt is mutable so drag-rotate can adjust it (P1 #10).
  let currentTilt = (data.atmosphere.tilt ?? 30) * DEG;
  // FOCAL is mobile-aware: narrower viewports get a higher focal length so
  // depth compression stays gentle and inner planets don't crush near the sun.
  const FOCAL_DESKTOP = data.atmosphere.focal ?? 600;
  const FOCAL_NARROW = 1100;
  let FOCAL = FOCAL_DESKTOP;
  let cosTilt = Math.cos(currentTilt);
  let sinTilt = Math.sin(currentTilt);
  function setTilt(rad: number): void {
    currentTilt = rad;
    cosTilt = Math.cos(currentTilt);
    sinTilt = Math.sin(currentTilt);
  }
  const TILT_MIN = 0;
  const TILT_MAX = 80 * DEG;
  // V3.4.1 — Side view removed per Sush. Only topdown exists now. Manual
  // drag-to-tilt is still available but there's no preset toggle.

  // V2.2 — view mode locked to 'topdown' (V3.4.1). Kept as a constant rather
  // than a variable so any future expansion (multi-view) has a clean
  // re-introduction point. localStorage and URL params are ignored — topdown
  // is the only experience.
  const viewMode: 'topdown' = 'topdown';
  let targetTiltRad = 0;
  setTilt(0);
  function applyViewMode(_mode: 'topdown', _persist = true): void {
    // No-op: topdown is the only view. Kept to preserve the call signature
    // for any internal callers (e.g., focus reset) without behavioural change.
    targetTiltRad = 0;
  }
  document.body.dataset.viewMode = viewMode;

  const planetBySlug = new Map<string, Planet>();
  const moonBySlug = new Map<string, { moon: Moon; parent: Planet }>();
  for (const p of data.planets) {
    planetBySlug.set(p.slug, p);
    for (const m of p.moons ?? []) moonBySlug.set(m.slug, { moon: m, parent: p });
  }

  // V3.2 — external channels (YouTubes + Ko-fi). Read render style from URL param.
  // 'comets' (default) — long-form & bites = comets with tails on outer elliptical
  //   orbits; ko-fi = fixed-position beacon at canvas corner with double pulse.
  // 'outposts' — all three channels sit at fixed positions on a single outer ring,
  //   each with a transmission pulse.
  // Style is a SUSH visual choice — the data + voice + cards are identical.
  const externalChannels = data.external?.channels ?? [];
  const channelBySlug = new Map<string, ExternalChannel>();
  for (const c of externalChannels) channelBySlug.set(c.slug, c);
  const externalStyle: 'comets' | 'outposts' = (() => {
    try {
      const v = new URLSearchParams(window.location.search).get('ext');
      return v === 'outposts' ? 'outposts' : 'comets';
    } catch (_) { return 'comets'; }
  })();
  document.body.dataset.externalStyle = externalStyle;

  const bodies: BodyState[] = [];
  const bodyButtons = bodiesRoot.querySelectorAll<HTMLButtonElement>('.planet-body');
  for (const btn of Array.from(bodyButtons)) {
    const slug = btn.dataset.slug ?? '';
    const kind = btn.dataset.kind as BodyState['kind'] | 'external';
    if (kind === 'planet') {
      const ref = planetBySlug.get(slug);
      if (!ref) continue;
      bodies.push({
        el: btn, kind, slug, ref,
        screenX: 0, screenY: 0, baseScreenX: 0, baseScreenY: 0, scale: 1, depth: 0,
        intrinsicSize: ref.body.size,
        glowCore: ref.body.glowCore,
        glowOuter: ref.body.glowOuter,
      });
    } else if (kind === 'moon') {
      const rec = moonBySlug.get(slug);
      if (!rec) continue;
      bodies.push({
        el: btn, kind, slug, parentSlug: btn.dataset.parent, ref: rec.moon,
        screenX: 0, screenY: 0, baseScreenX: 0, baseScreenY: 0, scale: 1, depth: 0,
        intrinsicSize: rec.moon.body.size,
        glowCore: rec.moon.body.glowCore,
        glowOuter: rec.moon.body.glowOuter,
      });
    } else if (kind === 'star') {
      const anchor = data.mcp.anchor;
      bodies.push({
        el: btn, kind, slug: data.mcp.slug, ref: data.mcp,
        screenX: 0, screenY: 0, baseScreenX: 0, baseScreenY: 0, scale: 1, depth: 0,
        intrinsicSize: anchor?.size ?? 24,
        glowCore: anchor?.glowCore ?? '#FFD89A',
        glowOuter: anchor?.glowOuter ?? '#FFB347',
      });
    } else if (kind === 'comet' || kind === 'beacon' || kind === 'outpost' || kind === 'external') {
      const ref = channelBySlug.get(slug);
      if (!ref) continue;
      // V3.2 — body kind is decided by render style (URL param ?ext=).
      // 'outposts' style: all three channels are outposts.
      // 'comets' style: channel.comet → comet, channel.beacon → beacon.
      let resolvedKind: BodyState['kind'];
      if (externalStyle === 'outposts') {
        resolvedKind = 'outpost';
      } else if (ref.beacon) {
        resolvedKind = 'beacon';
      } else if (ref.comet) {
        resolvedKind = 'comet';
      } else {
        resolvedKind = 'outpost';
      }
      btn.dataset.kind = resolvedKind;
      bodies.push({
        el: btn, kind: resolvedKind, slug, ref,
        screenX: 0, screenY: 0, baseScreenX: 0, baseScreenY: 0, scale: 1, depth: 0,
        intrinsicSize: ref.body.size,
        glowCore: ref.body.glowCore,
        glowOuter: ref.body.glowOuter,
      });
    }
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cw = window.innerWidth;
  let ch = window.innerHeight;
  let cx = cw / 2;
  let cy = ch / 2;
  let scaleFactor = 1;
  let mobileMode = false;
  let narrowMode = false; // very narrow phones — extra-tight layout

  let hoveredSlug: string | null = null;
  let focusedSlug: string | null = null;
  let lastFocusBeforeOpen: HTMLElement | null = null;
  let listViewActive = false;

  // Phase C — lens framework. Single canvas, four projections.
  // Cosmos is the canonical default; the other three are lenses summoned
  // via the corner pill. Each lens has a `computeLensPosition(body)` that
  // returns target {x, y} in canvas-space. applyLensProjection() runs
  // AFTER updateBodyPositions() — it lerps from the snapshot taken at
  // lens-change to the lens target over LENS_TRANSITION_MS, then locks.
  // Cosmos lens is special: when lens is 'cosmos' AND not transitioning,
  // applyLensProjection returns early so orbital motion + magnetism stay.
  type Lens = 'cosmos' | 'constellation' | 'timeline' | 'audience';
  let currentLens: Lens = 'cosmos';
  let lensTransitionMs = -1; // -1 = not transitioning
  const LENS_TRANSITION_MS = 700;
  const lensSnapshotPositions = new Map<string, { x: number; y: number }>();
  // Persist last-chosen lens so a refresh keeps the user's view.
  try {
    const stored = window.localStorage.getItem('cosmosLens');
    if (stored === 'cosmos' || stored === 'constellation' || stored === 'timeline' || stored === 'audience') {
      currentLens = stored;
    }
  } catch (_) { /* */ }

  let cameraTargetX = 0;
  let cameraTargetY = 0;
  let cameraTargetZoom = 1;
  let cameraX = 0;
  let cameraY = 0;
  // V3 #2 — Cinematic warp-in. When a planet is opened/closed the camera lerp
  // is briefly boosted and bodies pick up a soft motion blur via CSS filter.
  // Skipped on reduced-motion.
  let warpStartMs = 0;
  const WARP_DURATION_MS = 280;
  let cameraZoom = 1;
  // User-controlled pan + zoom (P1 #10)
  let userPanX = 0;
  let userPanY = 0;
  // V3.x — clamp user pan so the cosmos centre (sun at world 0,0) stays
  // within ~60% of the viewport at any zoom. Prevents infinite-drag where
  // the entire system disappears off-screen. Sush asked for this after a
  // 3000px drag rendered all 9 bodies invisible.
  function clampUserPan(): void {
    const limX = (cw * 0.6) / Math.max(0.5, cameraZoom);
    const limY = (ch * 0.6) / Math.max(0.5, cameraZoom);
    if (userPanX > limX) userPanX = limX;
    else if (userPanX < -limX) userPanX = -limX;
    if (userPanY > limY) userPanY = limY;
    else if (userPanY < -limY) userPanY = -limY;
  }
  let userZoomMul = 1;
  const ZOOM_MIN = 0.55;
  const ZOOM_MAX = 2.4;

  // V3 #6 — Shareable URL state. Parse known params on init; write back on changes (debounced).
  // ?planet=earth · ?zoom=1.6 · ?pan=120,40 · ?view=side|topdown (legacy 'cosmos' = 'side')
  const initialQS = new URLSearchParams(window.location.search);
  const initialPlanetParam = initialQS.get('planet');
  const initialZoomParam = parseFloat(initialQS.get('zoom') ?? '');
  const initialPanParam = (initialQS.get('pan') ?? '').split(',').map((n) => parseFloat(n));
  const initialViewParam = initialQS.get('view');
  if (Number.isFinite(initialZoomParam)) {
    userZoomMul = clamp(initialZoomParam, ZOOM_MIN, ZOOM_MAX);
  }
  if (initialPanParam.length === 2 && initialPanParam.every(Number.isFinite)) {
    userPanX = clamp(initialPanParam[0]!, -2000, 2000);
    userPanY = clamp(initialPanParam[1]!, -2000, 2000);
    clampUserPan();
  }
  if (initialViewParam === 'side' || initialViewParam === 'cosmos' || initialViewParam === 'topdown') {
    // V3.4.1 — Side view dropped. URL param is parsed for backward compat but
    // ignored — topdown is the only mode now.
    targetTiltRad = 0;
    setTilt(0);
    document.body.dataset.viewMode = 'topdown';
  }

  let urlWriteScheduled = 0;
  function scheduleUrlWrite(): void {
    if (urlWriteScheduled) return;
    urlWriteScheduled = window.setTimeout(() => {
      urlWriteScheduled = 0;
      try {
        const qs = new URLSearchParams(window.location.search);
        // Clean slate for the keys we own; preserve unrelated keys (e.g. ?intro=skip).
        if (focusedSlug) qs.set('planet', focusedSlug); else qs.delete('planet');
        if (Math.abs(userZoomMul - 1) > 0.01) qs.set('zoom', userZoomMul.toFixed(2)); else qs.delete('zoom');
        if (Math.abs(userPanX) > 2 || Math.abs(userPanY) > 2) {
          qs.set('pan', `${Math.round(userPanX)},${Math.round(userPanY)}`);
        } else {
          qs.delete('pan');
        }
        // URL convention: V3.4.1 dropped the view= param entirely (only
        // topdown exists now). Any legacy view param will be ignored on next
        // page load. We always omit it from URLs we write.
        qs.delete('view');
        const next = qs.toString();
        const url = next ? `${window.location.pathname}?${next}` : window.location.pathname;
        window.history.replaceState(null, '', url);
      } catch (_) { /* ignore */ }
    }, 600);
  }

  // Cursor tracking for magnetism (P1 #11)
  let cursorX = -9999;
  let cursorY = -9999;
  let cursorActive = false;

  // V2.1 #3 — Idle camera drift. After IDLE_THRESHOLD_MS of no input, the camera
  // performs a slow Ken-Burns drift around the orbital plane. Resets on any input.
  let lastInteractionMs = performance.now();
  const IDLE_THRESHOLD_MS = 30_000;
  function markInteraction(): void {
    lastInteractionMs = performance.now();
    // V3.5 — Earth first-touch pulse stops on first user interaction.
    // Uses a closure flag set inside the mountCosmos body (see Earth pulse
    // activation block near the end of mount).
    if (earthFirstPulseActive) {
      earthFirstPulseActive = false;
      const earthBody = document.querySelector('.planet-body[data-slug="earth"]') as HTMLElement | null;
      if (earthBody) earthBody.removeAttribute('data-first-pulse');
    }
  }

  // V3.5 — Earth first-touch pulse state. Activated on mount if Earth body
  // exists and reduced-motion is off. Cleared on first markInteraction.
  let earthFirstPulseActive = false;

  // V2.1 #2 — Freshness pulse. Bodies whose lastShippedAt is within FRESHNESS_DAYS
  // wear a subtle pulsing ring (different cadence + colour from the focus ring).
  const FRESHNESS_DAYS = 14;
  const NOW_MS = Date.now();
  function freshnessFor(slug: string): number {
    // Returns 0 if not fresh, else fraction (0..1] of how recent — closer to 1 = newer.
    let iso: string | undefined;
    const p = planetBySlug.get(slug);
    if (p) iso = p.lastShippedAt;
    else {
      const moon = moonBySlug.get(slug);
      if (moon) iso = moon.moon.lastShippedAt;
      else if (slug === data.mcp.slug) iso = (data.mcp as unknown as Card).lastShippedAt;
    }
    if (!iso) return 0;
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return 0;
    const ageDays = (NOW_MS - t) / 86_400_000;
    if (ageDays < 0 || ageDays > FRESHNESS_DAYS) return 0;
    return 1 - ageDays / FRESHNESS_DAYS;
  }

  // V3.4 — Sparkle marker for recently-shipped bodies. Replaces the deleted
  // freshness pulse with a quiet, static ✦ glyph in the top-right corner.
  for (const b of bodies) {
    if (b.kind === 'star') continue;
    const fresh = freshnessFor(b.slug);
    if (fresh <= 0) continue;
    b.el.dataset.fresh = 'true';
    if (!b.el.querySelector('.planet-body__fresh')) {
      const span = document.createElement('span');
      span.className = 'planet-body__fresh';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = '✦';
      span.title = 'Recently shipped';
      b.el.appendChild(span);
    }
  }

  // Sonar pings (P1 #12)
  const pings: Ping[] = [];
  const PING_DURATION_MS = 1200;

  // Ignition intro (P1 #8). Skipped on reduced-motion or repeat visits.
  const introSkipKey = 'cosmosIntroSeen.v1';
  const introSkipQS = new URLSearchParams(window.location.search).get('intro') === 'skip';
  const introReplayQS = new URLSearchParams(window.location.search).get('intro') === '1';
  // V3 #3 — OG mode (?og=1): pin the cosmos to a known phase, hide HUD, freeze
  // bodies in the most photogenic composition. Used by scripts/capture-og.mjs.
  const ogMode = new URLSearchParams(window.location.search).get('og') === '1';
  let introActive = !ogMode && !reducedMotion && !introSkipQS && (introReplayQS || !window.localStorage.getItem(introSkipKey));
  const introStartMs = performance.now();
  const INTRO_DURATION_MS = 2400;
  function introProgress(now: number): { sun: number; orbits: number; bodies: number; done: boolean } {
    if (!introActive) return { sun: 1, orbits: 1, bodies: 1, done: true };
    const t = now - introStartMs;
    const sun = clamp01(t / 900);
    const orbits = clamp01((t - 700) / 1100);
    const bodies = clamp01((t - 1500) / 800);
    const done = t >= INTRO_DURATION_MS;
    return { sun, orbits, bodies, done };
  }

  // Generate the 3-layer parallax starfield (P1 #6)
  const parallaxStars = generateParallaxStars();
  function generateParallaxStars(): ParallaxStar[] {
    const out: ParallaxStar[] = [];
    let seed = 0xC05A05; // deterministic
    function rand(): number {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }
    // Background — many tiny stars, slow drift
    for (let i = 0; i < 80; i++) {
      out.push({
        x: rand(), y: rand(),
        size: 0.3 + rand() * 0.4,
        alpha: 0.35 + rand() * 0.25,
        driftPxPerSec: 1.6 + rand() * 0.8,
        layer: 'bg',
        twinklePhase: rand() * TWO_PI,
        twinkleSec: 5 + rand() * 5,
      });
    }
    // Mid — medium stars, mid drift
    for (let i = 0; i < 38; i++) {
      out.push({
        x: rand(), y: rand(),
        size: 0.6 + rand() * 0.7,
        alpha: 0.45 + rand() * 0.3,
        driftPxPerSec: 5 + rand() * 2,
        layer: 'mid',
        twinklePhase: rand() * TWO_PI,
        twinkleSec: 3.5 + rand() * 3,
      });
    }
    // Foreground — fewer larger stars, faster drift
    for (let i = 0; i < 14; i++) {
      out.push({
        x: rand(), y: rand(),
        size: 1.0 + rand() * 1.0,
        alpha: 0.55 + rand() * 0.3,
        driftPxPerSec: 12 + rand() * 6,
        layer: 'fg',
        twinklePhase: rand() * TWO_PI,
        twinkleSec: 2.5 + rand() * 2,
      });
    }
    return out;
  }

  function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }

  const startTime = performance.now();
  let lastFrame = startTime;

  // Simulation time for orbits — pauses while user is interacting (hover or card open)
  // so clicks aren't fiddly. Twinkles and sun pulse keep running on raw realT.
  let simT = 0;
  let lastSimSampleRealT = 0;
  // V3 #3 — In OG capture mode pin simT to a chosen "photogenic" phase so
  // every capture is bit-identical. Tuned to spread the bodies nicely.
  const OG_SIM_T = 12.6;

  function getRealT(): number { return (performance.now() - startTime) / 1000; }

  function updateSimTime(): void {
    if (ogMode) { simT = OG_SIM_T; return; }
    const realT = getRealT();
    const shouldPause = !reducedMotion && (hoveredSlug !== null || focusedSlug !== null);
    if (!shouldPause) simT += realT - lastSimSampleRealT;
    lastSimSampleRealT = realT;
  }

  function resize(): void {
    cw = window.innerWidth;
    ch = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = cw / 2;
    cy = ch / 2;

    const outermost = Math.max(...data.planets.map((p) => p.orbit.radius));
    mobileMode = cw < 720;
    narrowMode = cw < 480;
    // V3.2 — on narrow phones, fit the SECOND-outermost orbit (Agentic) inside
    // the viewport so inner planets get more screen-pixel-per-orbit-unit. This
    // means the OUTERMOST planet (Claw) clips at the viewport edge — acceptable
    // tradeoff for cleaner moon-vs-neighbour separation. On desktop everything
    // still fits.
    let fittingOutermost = outermost;
    if (narrowMode && data.planets.length >= 2) {
      const sortedByRadius = [...data.planets].sort((a, b) => a.orbit.radius - b.orbit.radius);
      fittingOutermost = sortedByRadius[sortedByRadius.length - 2]!.orbit.radius;
    }
    // Mobile gets gentler depth compression so inner planets don't cluster.
    FOCAL = narrowMode ? FOCAL_NARROW : FOCAL_DESKTOP;
    // Tighter margins on phones so the outermost orbit still fits.
    // Desktop margin reduced from 110 → 32 (May 2026) so the cosmos uses
    // almost the full viewport. HUD chips live in absolute corners and
    // aren't affected. MCP star self-clamps to viewport edge so 32 is safe.
    const margin = narrowMode ? 22 : mobileMode ? 36 : 32;
    const desiredVHalf = (ch / 2 - margin) / cosTilt;
    const desiredHHalf = (cw / 2 - margin);
    scaleFactor = Math.min(desiredHHalf / fittingOutermost, desiredVHalf / fittingOutermost, 1);
    // Slight breathing room on small viewports so bodies don't touch edges.
    if (mobileMode) scaleFactor = Math.min(scaleFactor, 0.94);
    if (narrowMode) scaleFactor = Math.min(scaleFactor, 0.82);
  }

  function project(xp: number, yp: number): { x: number; y: number; scale: number; depth: number } {
    const yRot = yp * cosTilt;
    const zRot = yp * sinTilt;
    // V2.2 — clamp scale so front bodies don't balloon (Claw fix). Back bodies
    // can still get small (down to 0.5×) for depth feel; front capped at 1.45×.
    const rawScale = FOCAL / (FOCAL + zRot);
    const scale = clamp(rawScale, 0.5, 1.45);
    return { x: xp * scale, y: yRot * scale, scale, depth: zRot };
  }

  function planetOrbitPos(p: Planet, t: number): { x: number; y: number } {
    const angle = reducedMotion
      ? p.orbit.phase * DEG
      : (t / p.orbit.speedSec) * TWO_PI + p.orbit.phase * DEG;
    const r = p.orbit.radius * scaleFactor;
    const xp = r * Math.cos(angle);
    const yp = r * Math.sin(angle) * (1 - p.orbit.ecc);
    const tilt2d = p.orbit.tilt * DEG;
    const cosT = Math.cos(tilt2d);
    const sinT = Math.sin(tilt2d);
    return { x: xp * cosT - yp * sinT, y: xp * sinT + yp * cosT };
  }

  function moonOrbitPos(parentX: number, parentY: number, m: Moon, t: number): { x: number; y: number } {
    const phase = (m.orbit.phase ?? 0) * DEG;
    const angle = reducedMotion ? phase : (t / m.orbit.speedSec) * TWO_PI + phase;
    // V3.2 — moon orbit is viewport-width aware. Full declared radius on desktop
    // (cw >= 720); shrinks linearly toward 50% on phones so moons sit close to
    // their parent and don't sail over adjacent planet orbits.
    const moonScale = (cw >= 720) ? 1.0 : Math.max(0.5, cw / 720);
    const r = m.orbit.radius * moonScale;
    return { x: parentX + r * Math.cos(angle), y: parentY + r * Math.sin(angle) };
  }

  function clear(): void { ctx.clearRect(0, 0, cw, ch); }

  // V2.2 — galactic horizon band. Long elliptical glow at the orbital tilt suggesting
  // a tilted plane in space. Multi-stop horizontal gradient with vertical fade via
  // a wide stretched radial gradient. Anchors the canvas as a 3D plane, not a black box.
  function drawGalacticHorizon(): void {
    if (viewMode === 'topdown') return;
    const tiltStrength = sinTilt;
    if (tiltStrength < 0.02) return;
    const yMid = cy + cameraY * cameraZoom;
    const xMid = cx + cameraX * cameraZoom;
    // Band height grows with tilt — flatter horizon when tilt is gentler.
    const bandH = ch * (0.20 + 0.40 * tiltStrength);
    const bandW = cw * 1.6;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    // 3 stacked stretched radial gradients to build a multi-coloured horizon.
    // V2.3 — alpha multipliers scale with sinTilt so band gets bolder at higher tilts.
    const layers: Array<[string, string, number, number]> = [
      ['rgba(180, 130, 255, 1)', 'rgba(40, 24, 96, 0)', 0.18 + 0.34 * sinTilt, 0.85],
      ['rgba(120, 180, 255, 1)', 'rgba(20, 40, 80, 0)', 0.14 + 0.26 * sinTilt, 0.65],
      ['rgba(255, 200, 130, 1)', 'rgba(120, 70, 30, 0)', 0.28 + 0.42 * sinTilt, 0.32],
    ];
    for (const [coreColor, edgeColor, alphaScale, widthMul] of layers) {
      ctx.save();
      ctx.translate(xMid, yMid);
      ctx.scale((bandW / bandH) * widthMul, 1); // stretch X
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, bandH / 2);
      const core = coreColor.replace('1)', `${alphaScale})`);
      grad.addColorStop(0, core);
      grad.addColorStop(0.4, coreColor.replace('1)', `${alphaScale * 0.45})`));
      grad.addColorStop(1, edgeColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, bandH / 2, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // P1 #7 — Volumetric nebula gas. Huge soft radial gradients drifting across canvas.
  function drawNebulae(): void {
    const t = getRealT();
    const nebulae = data.nebulae ?? [];
    if (nebulae.length === 0) return;
    ctx.globalCompositeOperation = 'screen';
    for (const n of nebulae) {
      const phase = n.phase ?? 0;
      const driftPct = reducedMotion ? 0 : ((t / n.driftSec + phase) % 1);
      // Drift slowly along a sine path — feels like gas, not a slide.
      const driftX = Math.cos(driftPct * TWO_PI) * 0.06;
      const driftY = Math.sin(driftPct * TWO_PI) * 0.04;
      const x = (n.x + driftX) * cw;
      const y = (n.y + driftY) * ch;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, n.size);
      grad.addColorStop(0, withAlpha(n.color, n.alpha));
      grad.addColorStop(0.6, withAlpha(n.color, n.alpha * 0.35));
      grad.addColorStop(1, withAlpha(n.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, n.size, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // P1 #6 — multi-layer parallax starfield. Each layer drifts at its own speed.
  // V3.x #15 — the deepest 'bg' layer now rotates slowly around the canvas
  // centre (one full turn ≈ 8.7 min) instead of drifting horizontally. Gives
  // the cosmos a "constellation drift / Earth-rotation" feel without touching
  // the mid/fg parallax. ogMode pins angle to 0 for deterministic OG capture.
  const BG_ROT_RAD_PER_SEC = 0.012;
  function drawParallaxStars(): void {
    const t = getRealT();
    const bgRotAngle = reducedMotion || ogMode ? 0 : t * BG_ROT_RAD_PER_SEC;
    const cosBg = Math.cos(bgRotAngle);
    const sinBg = Math.sin(bgRotAngle);
    for (const s of parallaxStars) {
      let xs: number;
      let ys: number;
      if (s.layer === 'bg') {
        // Rotate base position around canvas centre. No linear drift — rotation IS the motion.
        const bx = s.x * cw - cx;
        const by = s.y * ch - cy;
        xs = cx + bx * cosBg - by * sinBg;
        ys = cy + bx * sinBg + by * cosBg;
      } else {
        const driftSec = reducedMotion ? 0 : (s.driftPxPerSec * t);
        xs = (s.x * cw + driftSec) % cw;
        if (xs < 0) xs += cw;
        ys = s.y * ch;
      }
      const twinkle = reducedMotion ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(t * (TWO_PI / s.twinkleSec) + s.twinklePhase));
      ctx.fillStyle = data.atmosphere.hud;
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.beginPath();
      ctx.arc(xs, ys, s.size, 0, TWO_PI);
      ctx.fill();
      // Tiny halo around foreground stars only.
      if (s.layer === 'fg') {
        const halo = ctx.createRadialGradient(xs, ys, 0, xs, ys, s.size * 4);
        halo.addColorStop(0, withAlpha(data.atmosphere.hud, 0.18 * twinkle));
        halo.addColorStop(1, withAlpha(data.atmosphere.hud, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(xs, ys, s.size * 4, 0, TWO_PI);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawMcpStarfield(): void {
    // V2.3 — cluster of little stars now follows the MCP star around (since the star
    // is in cosmos world space). When `position` is unset (legacy), fall back to canvas frac.
    const star = bodies.find((b) => b.kind === 'star');
    const t = getRealT();
    const useStarRelative = !!data.mcp.position && !!star;
    const clusterR = star ? star.intrinsicSize * star.scale * cameraZoom * 6.5 : 0;
    for (const s of data.mcp.starfield) {
      let x: number, y: number;
      if (useStarRelative && star) {
        const offX = (s.x - 0.5) * clusterR * 2;
        const offY = (s.y - 0.5) * clusterR * 2;
        x = star.baseScreenX + offX;
        y = star.baseScreenY + offY;
      } else {
        x = s.x * cw;
        y = s.y * ch;
      }
      const twinkle = reducedMotion ? 0.8 : 0.55 + 0.45 * Math.abs(Math.sin(t * (TWO_PI / s.twinkleSec)));
      const halo = ctx.createRadialGradient(x, y, 0, x, y, s.size * 6);
      halo.addColorStop(0, withAlpha(data.atmosphere.accentSoft, 0.5 * twinkle));
      halo.addColorStop(1, withAlpha(data.atmosphere.accentSoft, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, s.size * 6, 0, TWO_PI);
      ctx.fill();
      ctx.fillStyle = data.atmosphere.accentSoft;
      ctx.globalAlpha = 0.7 * twinkle;
      ctx.beginPath();
      ctx.arc(x, y, s.size + 0.2, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // P0 #2 — Bigger sun with multi-stop corona, optional rays during pulse, ignition fade-in.
  // Phase B — added idle heartbeat (1Hz layer that ramps in after 8s of no
  // interaction) AND a one-shot reveal flare on long-press at the centre.
  // The invisible-sun philosophy is preserved: nothing renders that wasn't
  // there before; both signals only fire when the cosmos is at-rest or
  // explicitly summoned.
  let sunRevealStart: number | null = null;
  let sunRevealedThisSession = false;
  let sunHoldTimer: number | null = null;
  let sunHoldStartXY: { x: number; y: number } | null = null;
  const SUN_HOLD_MS = 1000;
  const sunRevealEl = document.getElementById('sun-reveal') as HTMLElement | null;
  function fireSunRevealFlare(): void {
    sunRevealStart = performance.now();
  }
  function trySunReveal(): void {
    if (sunRevealedThisSession) return;
    sunRevealedThisSession = true;
    fireSunRevealFlare();
    if (sunRevealEl) {
      sunRevealEl.dataset.visible = 'true';
      window.setTimeout(() => {
        if (sunRevealEl) sunRevealEl.dataset.visible = 'false';
      }, 4500);
    }
  }
  function cancelSunHold(): void {
    if (sunHoldTimer !== null) {
      window.clearTimeout(sunHoldTimer);
      sunHoldTimer = null;
    }
    sunHoldStartXY = null;
  }
  function maybeStartSunHold(clientX: number, clientY: number): void {
    if (sunRevealedThisSession || focusedSlug) return;
    const sunX = cx + cameraX * cameraZoom;
    const sunY = cy + cameraY * cameraZoom;
    const sunR = data.sun.size * cameraZoom * 1.8;
    if (Math.hypot(clientX - sunX, clientY - sunY) > sunR) return;
    cancelSunHold();
    sunHoldStartXY = { x: clientX, y: clientY };
    sunHoldTimer = window.setTimeout(() => {
      sunHoldTimer = null;
      if (sunHoldStartXY !== null) {
        trySunReveal();
        sunHoldStartXY = null;
      }
    }, SUN_HOLD_MS);
  }
  function drawSun(introSun: number): void {
    if (introSun <= 0) return;
    const t = getRealT();
    const idleMs = performance.now() - lastInteractionMs;
    const idleRamp = !reducedMotion && !focusedSlug && idleMs > 8000
      ? Math.min(1, (idleMs - 8000) / 4000)
      : 0;
    // 1Hz heartbeat layered on top of the slow corona pulse. Subtle: ramps
    // up over 4s once the cosmos has been still for 8s. Disappears the
    // moment the user interacts (markInteraction resets lastInteractionMs).
    const heartbeat = idleRamp * 0.16 * Math.abs(Math.sin(t * TWO_PI));
    const pulseBase = reducedMotion ? 0.85 : 0.78 + 0.22 * Math.abs(Math.sin(t * (TWO_PI / data.sun.pulseSec)));
    const pulse = Math.min(1.05, pulseBase + heartbeat);
    const igniteEase = introSun * introSun * (3 - 2 * introSun); // smoothstep
    const x = cx + cameraX * cameraZoom;
    const y = cy + cameraY * cameraZoom;
    const r = data.sun.size * cameraZoom * (0.7 + 0.3 * igniteEase);
    // V3.4 — halo multiplier 5.4 → 3.8. Previous extent engulfed Earth's orbit
    // at common scaleFactors; tighter halo lets the inner planet breathe.
    const haloR = r * 3.8;
    // Faint rays — 8 long soft amber spokes when pulse peaks. Adds "star" feel.
    if (!reducedMotion && data.sun.rays && pulse > 0.85) {
      const rayCount = data.sun.rays;
      const rayLen = r * (data.sun.rayLength ?? 5);
      const rayAlpha = (pulse - 0.85) * 0.9 * igniteEase;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.04); // slow rotation
      for (let i = 0; i < rayCount; i++) {
        const a = (i / rayCount) * TWO_PI;
        const rg = ctx.createLinearGradient(0, 0, Math.cos(a) * rayLen, Math.sin(a) * rayLen);
        rg.addColorStop(0, withAlpha(data.sun.glowCore, rayAlpha));
        rg.addColorStop(1, withAlpha(data.sun.glowOuter, 0));
        ctx.strokeStyle = rg;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * rayLen, Math.sin(a) * rayLen);
        ctx.stroke();
      }
      ctx.restore();
    }
    // 4-stop corona: hot core → mid halo → outer falloff → far amber dust.
    const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    halo.addColorStop(0, withAlpha(data.sun.glowCore, 0.55 * pulse * igniteEase));
    halo.addColorStop(0.18, withAlpha(data.sun.glowMid ?? data.sun.glowCore, 0.32 * pulse * igniteEase));
    halo.addColorStop(0.45, withAlpha(data.sun.glowOuter, 0.16 * pulse * igniteEase));
    halo.addColorStop(0.78, withAlpha(data.sun.glowFar ?? data.sun.glowOuter, 0.06 * pulse * igniteEase));
    halo.addColorStop(1, withAlpha(data.sun.glowOuter, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, TWO_PI);
    ctx.fill();
    // Hot core
    const core = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
    core.addColorStop(0, withAlpha(data.sun.glowCore, pulse * igniteEase));
    core.addColorStop(0.6, withAlpha(data.sun.glowCore, 0.35 * pulse * igniteEase));
    core.addColorStop(1, withAlpha(data.sun.glowCore, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8, 0, TWO_PI);
    ctx.fill();

    // Phase B — earned-reveal flare. One-shot expanding amber corona drawn
    // on top of the regular sun once `sunRevealStart` is set. Lasts 1.8s
    // then auto-clears. Triggered by long-press (1s hold) near the centre.
    if (sunRevealStart !== null) {
      const revealMs = performance.now() - sunRevealStart;
      if (revealMs >= 1800) {
        sunRevealStart = null;
      } else {
        const tt = revealMs / 1800;
        const eased = 1 - Math.pow(1 - tt, 3);
        const flareAlpha = (1 - tt) * 0.7;
        const flareR = haloR * (1 + eased * 0.85);
        const flareGrad = ctx.createRadialGradient(x, y, 0, x, y, flareR);
        flareGrad.addColorStop(0, withAlpha(data.sun.glowCore, flareAlpha * 0.85));
        flareGrad.addColorStop(0.35, withAlpha(data.sun.glowMid ?? data.sun.glowCore, flareAlpha * 0.55));
        flareGrad.addColorStop(0.7, withAlpha(data.sun.glowOuter, flareAlpha * 0.2));
        flareGrad.addColorStop(1, withAlpha(data.sun.glowOuter, 0));
        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.arc(x, y, flareR, 0, TWO_PI);
        ctx.fill();
        // Bright thin ring at leading edge of the expansion
        ctx.strokeStyle = withAlpha(data.sun.glowCore, flareAlpha * 0.6);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, flareR * 0.95, 0, TWO_PI);
        ctx.stroke();
      }
    }
  }

  // V2.2 — sun god rays. Long soft radial light shafts emanating from sun, additive.
  // Always present (not pulse-gated like the inner ray spokes), faint and slowly rotating.
  // V2.3 — alpha fades with tilt so they're prominent in cosmos but quiet in top-down.
  function drawSunGodRays(introSun: number): void {
    if (introSun <= 0 || reducedMotion) return;
    const t = getRealT();
    const x = cx + cameraX * cameraZoom;
    const y = cy + cameraY * cameraZoom;
    const r = data.sun.size * cameraZoom;
    const igniteEase = introSun * introSun * (3 - 2 * introSun);
    const tiltMul = 0.45 + 0.55 * sinTilt; // fades to 45% in topdown, full at high tilt
    const RAY_COUNT = 14;
    const rayLen = r * 11;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(x, y);
    ctx.rotate(t * 0.012);
    for (let i = 0; i < RAY_COUNT; i++) {
      const a = (i / RAY_COUNT) * TWO_PI;
      const lenMul = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.1));
      const L = rayLen * lenMul;
      const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L);
      const baseAlpha = 0.045 * igniteEase * tiltMul;
      grad.addColorStop(0, withAlpha(data.sun.glowMid ?? data.sun.glowCore, baseAlpha));
      grad.addColorStop(0.4, withAlpha(data.sun.glowOuter, baseAlpha * 0.6));
      grad.addColorStop(1, withAlpha(data.sun.glowOuter, 0));
      ctx.strokeStyle = grad;
      ctx.lineWidth = r * 1.4 * lenMul;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
      ctx.stroke();
    }
    ctx.restore();
  }

  // V2.3 — top-down galactic ring backdrop. Adds richness to the otherwise austere
  // overhead view: a faint multi-stop ring around the sun at the orbital radii zone.
  function drawTopdownGalacticRing(): void {
    if (viewMode !== 'topdown') return;
    const sunX = cx + cameraX * cameraZoom;
    const sunY = cy + cameraY * cameraZoom;
    const innerR = 80 * scaleFactor * cameraZoom;
    const outerR = 1100 * scaleFactor * cameraZoom;
    if (outerR < innerR + 10) return;
    const grad = ctx.createRadialGradient(sunX, sunY, innerR, sunX, sunY, outerR);
    grad.addColorStop(0,    'rgba(80, 60, 160, 0)');
    grad.addColorStop(0.30, 'rgba(80, 60, 160, 0.06)');
    grad.addColorStop(0.45, 'rgba(120, 180, 255, 0.10)');
    grad.addColorStop(0.55, 'rgba(180, 130, 255, 0.13)');
    grad.addColorStop(0.65, 'rgba(120, 180, 255, 0.10)');
    grad.addColorStop(0.85, 'rgba(80, 60, 160, 0.05)');
    grad.addColorStop(1,    'rgba(80, 60, 160, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, outerR, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  // V2.2 — body shadow plate. Faint elliptical shadow under each body (squashed by tilt cos).
  // V2.3 — shadow direction is physically-correct: cast AWAY from the sun (+ slight
  // downward bias so it still reads as "on the floor"). Auto-disappears in top-down.
  function drawBodyShadows(introBodies: number): void {
    if (introBodies <= 0 || viewMode === 'topdown') return;
    const flatness = cosTilt;
    if (flatness < 0.05) return;
    const sunSX = cx + cameraX * cameraZoom;
    const sunSY = cy + cameraY * cameraZoom;
    for (const b of bodies) {
      if (b.kind === 'star') continue;
      const isFocused = focusedSlug === b.slug;
      const isHovered = hoveredSlug === b.slug;
      const dim = (focusedSlug !== null && !isFocused) || (hoveredSlug !== null && !isHovered);
      if (dim) continue;
      const r = b.intrinsicSize * b.scale * cameraZoom;
      const shadowR = r * 1.5;
      const shadowH = shadowR * (0.18 + 0.32 * sinTilt);
      // Cast AWAY from sun. + small downward bias so it still feels grounded.
      const dx = b.screenX - sunSX;
      const dy = b.screenY - sunSY;
      const d = Math.hypot(dx, dy) || 1;
      const offMagnitude = r * 0.85;
      const offX = (dx / d) * offMagnitude;
      const offY = (dy / d) * offMagnitude + r * 0.25;
      const x = b.screenX + offX;
      const y = b.screenY + offY;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, shadowR);
      grad.addColorStop(0, `rgba(0, 0, 0, ${0.42 * introBodies})`);
      grad.addColorStop(0.6, `rgba(0, 0, 0, ${0.18 * introBodies})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, shadowH / shadowR);
      ctx.beginPath();
      ctx.arc(0, 0, shadowR, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  // V3.5 — MCP relay flow lines.
  //   PLANNED endpoints  → faint static dashed grey line (no animation).
  //   LIVE    endpoints  → drawn as animated dots flowing planet → MCP in
  //                        drawMcpStream() below. drawMcpRays leaves them alone
  //                        so the dots have a clean stage.
  // The slugMap maps MCP endpoint slugs (e.g. brainbar-mcp) to planet slugs.
  function drawMcpRays(introBodies: number): void {
    if (introBodies <= 0) return;
    const star = bodies.find((b) => b.kind === 'star');
    if (!star) return;
    const slugMap: Record<string, string> = {
      'brainbar-mcp': 'brainbar',
      'agentic-mcp': 'agentic',
      'earth-mcp': 'earth',
      'plainai-mcp': 'plainai',
      'shift-mcp': 'shift',
      'claw-mcp': 'claw',
    };
    ctx.save();
    ctx.lineWidth = 0.7;
    ctx.setLineDash([2, 8]);
    for (const ep of data.mcp.endpoints) {
      if (ep.status !== 'planned') continue;
      const targetSlug = slugMap[ep.slug];
      if (!targetSlug) continue;
      const target = bodies.find((b) => b.slug === targetSlug);
      if (!target) continue;
      const alpha = 0.14 * introBodies;
      ctx.strokeStyle = withAlpha(data.atmosphere.hudMuted, alpha);
      ctx.beginPath();
      ctx.moveTo(star.screenX, star.screenY);
      ctx.lineTo(target.screenX, target.screenY);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // P1 #8 ignition — orbits draw progressively from a starting angle.
  // V2.2 — depth gradient: front of orbit (z<0, closer to viewer) brighter than back.
  function drawOrbits(introOrbits: number): void {
    if (introOrbits <= 0) return;
    ctx.lineWidth = 1;
    const SAMPLES = 96;
    for (const p of data.planets) {
      const isFocused = focusedSlug === p.slug;
      const isHovered = hoveredSlug === p.slug;
      const moonOfFocus = focusedSlug && (p.moons ?? []).some((m) => m.slug === focusedSlug);
      const moonOfHover = hoveredSlug && (p.moons ?? []).some((m) => m.slug === hoveredSlug);
      const dimByFocus = focusedSlug !== null && !isFocused && !moonOfFocus;
      const dimByHover = hoveredSlug !== null && !isHovered && !moonOfHover;
      const dim = dimByFocus || dimByHover;
      const r = p.orbit.radius * scaleFactor;
      const tilt2d = p.orbit.tilt * DEG;
      const cosT2 = Math.cos(tilt2d);
      const sinT2 = Math.sin(tilt2d);
      const baseAlpha = isFocused ? 0.70 : isHovered ? 0.40 : (dim ? 0.04 : 0.16);
      const colour = isFocused ? data.atmosphere.accent : data.atmosphere.hud;
      const drawTo = Math.floor(SAMPLES * introOrbits);
      // Per-sample line drawing so we can vary alpha by depth.
      // Depth normalised: -1 (front, near viewer) → 1 (back, behind sun).
      let prevX = 0, prevY = 0, prevDepth = 0;
      for (let i = 0; i <= drawTo; i++) {
        const a = (i / SAMPLES) * TWO_PI;
        const xp0 = r * Math.cos(a);
        const yp0 = r * Math.sin(a) * (1 - p.orbit.ecc);
        const xp = xp0 * cosT2 - yp0 * sinT2;
        const yp = xp0 * sinT2 + yp0 * cosT2;
        const proj = project(xp, yp);
        const xs = cx + (proj.x + cameraX) * cameraZoom;
        const ys = cy + (proj.y + cameraY) * cameraZoom;
        const depthN = sinTilt > 0.01 ? proj.depth / (r * sinTilt + 1) : 0; // -1..1
        // Front (depth<0) brightens; back (depth>0) fades.
        const depthMul = sinTilt > 0.01 ? clamp(0.45 - depthN * 0.55, 0.1, 1) : 1;
        if (i > 0) {
          const segAlpha = baseAlpha * introOrbits * depthMul;
          ctx.strokeStyle = withAlpha(colour, segAlpha);
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(xs, ys);
          ctx.stroke();
        }
        prevX = xs; prevY = ys; prevDepth = depthN;
      }
      void prevDepth;
    }
  }

  // V3.4 — slow comet-style sweep along each orbit. A single tapered head
  // sweeps once every ~14s per orbit (offset per planet so they don't sync).
  // Subtle enough to ignore, alive enough to suggest a living system.
  function drawOrbitSweep(introOrbits: number): void {
    if (introOrbits <= 0 || reducedMotion) return;
    const t = getRealT();
    const SEG = 9;
    for (const p of data.planets) {
      const periodSec = 14 + (p.slug.charCodeAt(0) % 7) * 0.6;
      const phase = (t / periodSec) % 1;
      const a0 = phase * TWO_PI;
      const segArc = TWO_PI * 0.07;
      const r = p.orbit.radius * scaleFactor;
      const tilt2d = p.orbit.tilt * DEG;
      const cosT2 = Math.cos(tilt2d);
      const sinT2 = Math.sin(tilt2d);
      let prevX = 0, prevY = 0;
      for (let i = 0; i <= SEG; i++) {
        const a = a0 + (i / SEG) * segArc;
        const xp0 = r * Math.cos(a);
        const yp0 = r * Math.sin(a) * (1 - p.orbit.ecc);
        const xp = xp0 * cosT2 - yp0 * sinT2;
        const yp = xp0 * sinT2 + yp0 * cosT2;
        const proj = project(xp, yp);
        const xs = cx + (proj.x + cameraX) * cameraZoom;
        const ys = cy + (proj.y + cameraY) * cameraZoom;
        if (i > 0) {
          // Fade head→tail (peak in middle, fade at both ends)
          const fade = Math.sin((i / SEG) * Math.PI);
          const alpha = fade * 0.42 * introOrbits;
          ctx.strokeStyle = withAlpha(data.atmosphere.accentSoft, alpha);
          ctx.lineWidth = 0.6 + fade * 1.2;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(xs, ys);
          ctx.stroke();
        }
        prevX = xs; prevY = ys;
      }
    }
  }

  // V3.2 — external channel decorations:
  //   • Comet tails — stretched gradient pointing AWAY from the sun (broadcasting outward)
  //   • Beacon double-pulse — Ko-fi pulses both outward (assets) and inward (support coming back)
  //   • Outpost transmission ring — concentric rings pulsing outward from each outpost
  function drawExternalDecorations(introBodies: number): void {
    if (introBodies <= 0) return;
    if (ogMode) return;
    const t = getRealT();
    const sunX = cx + cameraX * cameraZoom;
    const sunY = cy + cameraY * cameraZoom;
    for (const b of bodies) {
      const isHovered = hoveredSlug === b.slug;
      const isFocused = focusedSlug === b.slug;
      const dim = (focusedSlug !== null && !isFocused) || (hoveredSlug !== null && !isHovered);
      const alpha = (dim ? 0.32 : 1) * introBodies;
      const x = b.screenX;
      const y = b.screenY;
      const r = b.intrinsicSize * b.scale * cameraZoom;

      if (b.kind === 'comet') {
        // V3.2 — comets are bodies orbiting on the outer ring. The tail concept
        // was tested and rejected — Sush preferred just the orbiting play-button.
        // The natural body halo (drawBodyHalo) gives them visual presence; no
        // additional tail/streak is rendered here.
      } else if (b.kind === 'beacon') {
        // Double pulse — outward (assets going out) AND inward (support coming back).
        // Two concentric rings, opposite phases.
        if (reducedMotion) continue;
        const periodSec = 4;
        const phaseOut = ((t / periodSec) % 1);          // 0..1 outward expansion
        const phaseIn = (((t + periodSec / 2) / periodSec) % 1); // 0..1 inward contraction (offset)
        const baseRadius = r * 1.4;
        const maxOut = r * 4.5;
        // Outward ring
        const outR = baseRadius + (maxOut - baseRadius) * phaseOut;
        const outA = (1 - phaseOut) * 0.55 * alpha;
        if (outA > 0.01) {
          ctx.strokeStyle = withAlpha(b.glowOuter, outA);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(x, y, outR, 0, TWO_PI);
          ctx.stroke();
        }
        // Inward ring (a softer reciprocal — energy returning)
        const inR = baseRadius + (maxOut - baseRadius) * (1 - phaseIn);
        const inA = (1 - (1 - phaseIn)) * 0.4 * alpha; // peaks as the ring contracts in
        if (inA > 0.01) {
          ctx.strokeStyle = withAlpha(b.glowCore, inA);
          ctx.lineWidth = 1.0;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(x, y, inR, 0, TWO_PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (b.kind === 'outpost') {
        // Transmission ring — single ring expanding outward and fading.
        if (reducedMotion) continue;
        const periodSec = 3.5;
        const phase = ((t / periodSec) % 1);
        const baseRadius = r * 1.3;
        const maxRadius = r * 4.0;
        const ringR = baseRadius + (maxRadius - baseRadius) * phase;
        const ringA = (1 - phase) * 0.55 * alpha;
        if (ringA > 0.01) {
          ctx.strokeStyle = withAlpha(b.glowOuter, ringA);
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(x, y, ringR, 0, TWO_PI);
          ctx.stroke();
        }
      }
    }
  }

  function drawBodyHalo(b: BodyState, introBodies: number): void {
    if (introBodies <= 0) return;
    const isHovered = hoveredSlug === b.slug;
    const isFocused = focusedSlug === b.slug;
    const dim = (focusedSlug !== null && !isFocused) || (hoveredSlug !== null && !isHovered);
    const alpha = (dim ? 0.28 : 1) * introBodies;
    const r = b.intrinsicSize * b.scale * cameraZoom;
    // V2.3 — MCP star gets a much bigger halo than planets so it reads as a star, not a body.
    // Phase D polish (Sush 9 May 2026): MCP halo dimmed substantially — was
    // brighter than the Sun and over-attentioned. Multipliers and rest
    // alphas reduced. Hover/focus still brightens MCP normally.
    const baseMult = b.kind === 'star' ? 2.8 : 2.2;
    const hotMult = b.kind === 'star' ? 4.5 : 3.2;
    const haloR = r * (isHovered || isFocused ? hotMult : baseMult);
    const x = b.screenX;
    const y = b.screenY;
    // V2.3 — MCP star always pulses (not gated on hover) so it draws the eye.
    // Phase D polish: pulse range narrowed (was 0.85+0.35 → now 0.92+0.18) so
    // the star breathes without throbbing at the user.
    let starPulseMul = 1;
    if (b.kind === 'star' && !reducedMotion) {
      const t = getRealT();
      starPulseMul = 0.92 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.4));
    }
    // V3.3 — quieter halo at rest (was 0.55→0.20). Restless cosmos was visually
    // noisy because every body shouted; planets at rest now whisper, hover/focus
    // brings them up. Star keeps its full glow because it IS the loud thing.
    // Phase D polish: star rest alphas dropped to planet level (0.28/0.10) so
    // it stops competing with the Sun. Hover/focus still gives full glow.
    const restG = b.kind === 'star' ? 0.28 : 0.34;
    const restM = b.kind === 'star' ? 0.10 : 0.12;
    const hotG = b.kind === 'star' ? 0.55 : 0.55;
    const hotM = b.kind === 'star' ? 0.22 : 0.22;
    const g = (isHovered || isFocused) ? hotG : restG;
    const m = (isHovered || isFocused) ? hotM : restM;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    halo.addColorStop(0, withAlpha(b.glowOuter, g * alpha * starPulseMul));
    halo.addColorStop(0.4, withAlpha(b.glowOuter, m * alpha * starPulseMul));
    halo.addColorStop(1, withAlpha(b.glowOuter, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, TWO_PI);
    ctx.fill();
    // V3.3.1 — Inner atmospheric ring (the "spherical" ring) is ALWAYS-ON for
    // planets and moons only. Sush wants every planet/moon to feel volumetric;
    // this thin ring gives them a sphere-like edge. At rest it's subtle; on
    // hover/focus it brightens with a gentle breath, doubling as the click
    // indicator. The previous OUTER pulsing ring (was at r*2.1+) has been
    // removed — the brighter halo + brighter inner ring is enough on focus.
    // External bodies (comets, beacons, outposts) skip this ring because their
    // satellite/icon shapes aren't spherical — they get the halo gradient only.
    const isSphereLike = b.kind === 'planet' || b.kind === 'moon';
    if (isSphereLike) {
      const t = reducedMotion ? 0 : getRealT();
      const breathing = (isHovered || isFocused) && !reducedMotion;
      const periodSec = isFocused ? 3.2 : 2.0;
      const breath = breathing ? (0.5 + 0.5 * Math.sin((t / periodSec) * TWO_PI)) : 0;
      const restAlpha = 0.32;
      const peakAlpha = isFocused ? 0.90 : (isHovered ? 0.58 : restAlpha);
      const ringAlpha = (breathing
        ? (restAlpha + (peakAlpha - restAlpha) * breath)
        : restAlpha) * alpha;
      ctx.strokeStyle = withAlpha(b.glowOuter, ringAlpha);
      ctx.lineWidth = isFocused ? 1.5 : 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.05, 0, TWO_PI);
      ctx.stroke();
    }
    // V3.3.1 — Focus indicator for non-sphere bodies (satellites/beacons): a
    // soft breathing ring that appears only on hover/focus. Keeps the click
    // affordance without forcing them into a sphere shape.
    if (!isSphereLike && b.kind !== 'star' && (isHovered || isFocused)) {
      const t = reducedMotion ? 0 : getRealT();
      const periodSec = isFocused ? 3.2 : 2.0;
      const breath = 0.5 + 0.5 * Math.sin((t / periodSec) * TWO_PI);
      const baseA = isFocused ? 0.50 : 0.28;
      const peakA = isFocused ? 0.85 : 0.50;
      const focusAlpha = (baseA + (peakA - baseA) * breath) * alpha;
      ctx.strokeStyle = withAlpha(b.glowOuter, focusAlpha);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.6, 0, TWO_PI);
      ctx.stroke();
    }
    // V3.3.1 — outer focus pulse ring (was r*2.1→2.25 sin-wave) DELETED.
    // Sush feedback 9 May 2026 PM: too noisy when colliding with neighbour
    // bodies' halos. The inner atmospheric ring (above) now handles both the
    // spherical-shape job AND the focus indicator role for planets/moons.
  }

  // P1 #12 — sonar ping ring expanding from a body, dissipates over PING_DURATION_MS.
  function drawPings(now: number): void {
    if (reducedMotion) return;
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i];
      if (!p) continue;
      const t = (now - p.startMs) / PING_DURATION_MS;
      if (t >= 1) { pings.splice(i, 1); continue; }
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const radius = p.size * (1 + eased * 5.2);
      const alpha = (1 - t) * 0.5;
      ctx.strokeStyle = withAlpha(data.atmosphere.accentSoft, alpha);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TWO_PI);
      ctx.stroke();
    }
  }

  // V3.3.2 — freshness pulse REMOVED (was the always-on outer amber ring at
  // r*1.32→1.55 around bodies with recent lastShippedAt). Sush feedback 9 May
  // 2026 PM: this was the "outer pulsating ring" still visible after V3.3.1
  // around earth/moon/plainai/shift etc. The metadata still lives in the
  // card meta block (lastShippedAt date), no need for an always-on ring.
  // Phase B (9 May 2026 PM) — REPLACED with eventful ripples instead of an
  // always-on ring. Each fresh body emits a single outward ripple every
  // 6-24s (newer = more frequent), each ripple lasts ~2.4s. Skipped while
  // any card is open so it never competes with focus state. Bodies are
  // phase-offset by slug hash so the cosmos never pulses in unison.
  function drawFreshnessPulses(_now: number, introBodies: number): void {
    if (reducedMotion) return;
    if (focusedSlug) return;
    if (introBodies <= 0.4) return;
    const t = getRealT();
    const RIPPLE_DURATION = 2.4;
    for (const b of bodies) {
      if (b.kind === 'star') continue; // sun has its own corona
      const fresh = freshnessFor(b.slug);
      if (fresh <= 0) continue;
      const period = 6 + (1 - fresh) * 18; // 6s newest → 24s edge of 14-day window
      const phase = slugToPhase(b.slug, period);
      const cycleT = (((t + phase) % period) + period) % period;
      if (cycleT >= RIPPLE_DURATION) continue;
      const tt = cycleT / RIPPLE_DURATION;
      const eased = 1 - Math.pow(1 - tt, 2.4); // ease-out
      const baseR = Math.max(b.intrinsicSize * b.scale * 0.5, 14);
      const radius = baseR * (1 + eased * 4.2);
      const alpha = (1 - tt) * 0.42 * fresh * introBodies;
      if (alpha < 0.01) continue;
      ctx.strokeStyle = withAlpha(data.atmosphere.accent, alpha);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(b.screenX, b.screenY, radius, 0, TWO_PI);
      ctx.stroke();
    }
  }

  function slugToPhase(slug: string, period: number): number {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (Math.imul(h, 31) + slug.charCodeAt(i)) | 0;
    return ((Math.abs(h) % 1000) / 1000) * period;
  }

  // V2.1 #6 — constellation lines from focused body to its connectsTo[] siblings.
  // Faint dashed lines that fade in/out with focus.
  // Phase B — bumped visibility (alpha 0.30→0.55, width 1→1.5) AND added 3
  // traveling pulses per line to make the relationship feel alive. Pulses
  // flow outward from the focused body toward each sibling, telegraphing
  // "this is what this planet connects to."
  // Phase C — when the constellation LENS is active, every connectsTo[]
  // edge is drawn at all times (not just on focus). The traveling pulses
  // are skipped in that mode to avoid visual overload.
  let constellationFade = 0; // 0..1, eased toward target each frame
  function drawConstellationLines(introBodies: number, deltaSec: number): void {
    const inConstellationLens = currentLens === 'constellation';
    const target = inConstellationLens || focusedSlug ? 1 : 0;
    const lerp = reducedMotion ? 1 : Math.min(1, deltaSec * 3.2);
    constellationFade += (target - constellationFade) * lerp;
    if (constellationFade < 0.02 || introBodies <= 0) return;
    if (inConstellationLens) {
      drawAllConstellationEdges(introBodies);
      return;
    }
    const focused = focusedSlug ? bodies.find((b) => b.slug === focusedSlug) : null;
    if (!focused) return;
    const refSlug = focused.slug;
    let connects: string[] = [];
    if (refSlug === data.mcp.slug) {
      connects = (data.mcp as unknown as Card).connectsTo ?? [];
    } else {
      const p = planetBySlug.get(refSlug);
      const moonRec = moonBySlug.get(refSlug);
      connects = p?.connectsTo ?? moonRec?.moon.connectsTo ?? [];
    }
    if (connects.length === 0) return;
    const t = getRealT();
    for (const slug of connects) {
      const other = bodies.find((b) => b.slug === slug);
      if (!other) continue;
      const dx = other.screenX - focused.screenX;
      const dy = other.screenY - focused.screenY;

      // 1. Dashed gradient line (the static relationship trace).
      const baseAlpha = 0.55 * constellationFade * introBodies;
      const grad = ctx.createLinearGradient(focused.screenX, focused.screenY, other.screenX, other.screenY);
      grad.addColorStop(0, withAlpha(focused.glowOuter, baseAlpha));
      grad.addColorStop(0.5, withAlpha(data.atmosphere.accentSoft, baseAlpha * 1.05));
      grad.addColorStop(1, withAlpha(other.glowOuter, baseAlpha));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 7]);
      ctx.lineDashOffset = -t * 14;
      ctx.beginPath();
      ctx.moveTo(focused.screenX, focused.screenY);
      ctx.lineTo(other.screenX, other.screenY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Traveling pulses (3 dots, staggered, flowing outward). reduced-motion
      //    keeps the line but skips the pulse animation.
      if (reducedMotion) continue;
      const pulseSpeed = 0.32; // ~3.1s per full traverse
      for (let i = 0; i < 3; i++) {
        const phase = ((t * pulseSpeed + i / 3) % 1 + 1) % 1; // 0..1
        const px = focused.screenX + dx * phase;
        const py = focused.screenY + dy * phase;
        // Fade in at start, fade out at end so pulses don't pop on/off the bodies.
        const boundaryFade = Math.min(phase * 5, (1 - phase) * 5, 1);
        const pulseAlpha = constellationFade * introBodies * 0.95 * boundaryFade;
        if (pulseAlpha < 0.04) continue;
        // Soft halo
        ctx.fillStyle = withAlpha(data.atmosphere.accentSoft, pulseAlpha * 0.35);
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, TWO_PI);
        ctx.fill();
        // Bright core
        ctx.fillStyle = withAlpha(data.atmosphere.accentSoft, pulseAlpha);
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, TWO_PI);
        ctx.fill();
      }
    }
  }

  // Phase C — constellation-lens edge renderer. Walks every body, draws
  // each unique connectsTo[] edge once, faintly. No traveling pulses
  // (would be too busy with all edges visible at once).
  function drawAllConstellationEdges(introBodies: number): void {
    const drawn = new Set<string>();
    const t = getRealT();
    for (const a of bodies) {
      let connects: string[] = [];
      if (a.slug === data.mcp.slug) connects = (data.mcp as unknown as Card).connectsTo ?? [];
      else {
        const p = planetBySlug.get(a.slug);
        const moonRec = moonBySlug.get(a.slug);
        connects = p?.connectsTo ?? moonRec?.moon.connectsTo ?? [];
      }
      if (connects.length === 0) continue;
      for (const slug of connects) {
        const key = a.slug < slug ? `${a.slug}-${slug}` : `${slug}-${a.slug}`;
        if (drawn.has(key)) continue;
        drawn.add(key);
        const other = bodies.find((b) => b.slug === slug);
        if (!other) continue;
        const baseAlpha = 0.34 * constellationFade * introBodies;
        const grad = ctx.createLinearGradient(a.screenX, a.screenY, other.screenX, other.screenY);
        grad.addColorStop(0, withAlpha(a.glowOuter, baseAlpha));
        grad.addColorStop(0.5, withAlpha(data.atmosphere.accentSoft, baseAlpha * 1.0));
        grad.addColorStop(1, withAlpha(other.glowOuter, baseAlpha));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([2, 6]);
        ctx.lineDashOffset = -t * 10;
        ctx.beginPath();
        ctx.moveTo(a.screenX, a.screenY);
        ctx.lineTo(other.screenX, other.screenY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // V3.x #14 — Planetary atmosphere blur. When the user focuses a planet and
  // the camera zooms in, render a soft vignette using the focused body's
  // atmosphere palette filling the viewport edges. Centre stays clear so the
  // focused body — anchored at canvas centre by the focus glide — remains
  // sharp. Intensity ramps with cameraZoom so the focus glide naturally
  // builds the effect; further pinch/wheel zoom intensifies it.
  function drawAtmosphereBlur(): void {
    if (ogMode || !focusedSlug) return;
    const body = bodies.find((b) => b.slug === focusedSlug);
    if (!body) return;
    const intensity = clamp01((cameraZoom - 1) / 1.5);
    if (intensity <= 0) return;
    const motionMul = reducedMotion ? 0.5 : 1;
    const alpha = 0.22 * intensity * motionMul;
    if (alpha <= 0.002) return;
    const innerR = Math.min(cw, ch) * 0.22;
    const outerR = Math.max(cw, ch) * 0.85;
    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grad.addColorStop(0, withAlpha(body.glowOuter, 0));
    grad.addColorStop(0.5, withAlpha(body.glowOuter, alpha * 0.4));
    grad.addColorStop(1, withAlpha(body.glowOuter, alpha));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }

  function drawHud(): void {
    if (ogMode) return;
    ctx.fillStyle = withAlpha(data.atmosphere.hudFaint, 1);
    ctx.font = `500 11px ${data.atmosphere.monoFont}`;
    ctx.textBaseline = 'bottom';
    const planetCount = data.planets.length;
    const moonCount = data.planets.reduce((acc, p) => acc + (p.moons?.length ?? 0), 0);
    ctx.fillText(`${planetCount} planets · ${moonCount} moons · 1 star`, 24, ch - 24);
  }

  function updateBodyPositions(): void {
    const t = simT;
    const planetOP = new Map<string, { x: number; y: number }>();
    for (const p of data.planets) planetOP.set(p.slug, planetOrbitPos(p, t));

    for (const b of bodies) {
      if (b.kind === 'planet') {
        const op = planetOP.get(b.slug);
        if (!op) continue;
        const proj = project(op.x, op.y);
        b.baseScreenX = cx + (proj.x + cameraX) * cameraZoom;
        b.baseScreenY = cy + (proj.y + cameraY) * cameraZoom;
        b.scale = proj.scale;
        b.depth = proj.depth;
      } else if (b.kind === 'moon' && b.parentSlug) {
        const parentOP = planetOP.get(b.parentSlug);
        if (!parentOP) continue;
        const moon = b.ref as Moon;
        const op = moonOrbitPos(parentOP.x, parentOP.y, moon, t);
        const proj = project(op.x, op.y);
        b.baseScreenX = cx + (proj.x + cameraX) * cameraZoom;
        b.baseScreenY = cy + (proj.y + cameraY) * cameraZoom;
        b.scale = proj.scale;
        b.depth = proj.depth;
      } else if (b.kind === 'star') {
        // V2.3 — MCP star is part of the cosmos: project from world coords (rOrbit + thetaDeg)
        // through the same tilt + camera transform as planets. Falls back to anchor (canvas-fixed)
        // if no position is set.
        // V3.1 — clamp rOrbit so MCP star ALWAYS sits outside the outermost planet orbit
        // (1.35× outermost). Earlier the declared rOrbit (820) put it INSIDE Claw's 1100 orbit,
        // visually reading as just-another-planet. A star should be unambiguously beyond.
        // V3.1 — also clamp the final projected screen position so the MCP star stays inside
        // the viewport on small screens (where outermost*1.35 may project off-screen).
        // The clamp keeps the star at the edge of the viewport instead of scaling it
        // back into the orbit area, preserving the "outside the orbits" reading.
        const pos = data.mcp.position;
        if (pos) {
          const outermost = Math.max(...data.planets.map((p) => p.orbit.radius));
          const minStarOrbit = outermost * 1.35;
          const effectiveOrbit = Math.max(pos.rOrbit, minStarOrbit);
          const r = effectiveOrbit * scaleFactor;
          const ang = pos.thetaDeg * DEG;
          const xp = r * Math.cos(ang);
          const yp = r * Math.sin(ang);
          const proj = project(xp, yp);
          let sx = cx + (proj.x + cameraX) * cameraZoom;
          let sy = cy + (proj.y + cameraY) * cameraZoom;
          // Edge clamp — keep star fully on-screen with a body-radius margin.
          const starRadius = b.intrinsicSize * proj.scale * cameraZoom;
          const edgeMargin = starRadius + 12;
          sx = clamp(sx, edgeMargin, cw - edgeMargin);
          sy = clamp(sy, edgeMargin, ch - edgeMargin);
          b.baseScreenX = sx;
          b.baseScreenY = sy;
          b.scale = proj.scale;
          b.depth = proj.depth;
        } else {
          const anchor = data.mcp.anchor;
          b.baseScreenX = (anchor?.x ?? 0.86) * cw;
          b.baseScreenY = (anchor?.y ?? 0.18) * ch;
          b.scale = 1;
          b.depth = -800;
        }
      } else if (b.kind === 'comet') {
        // V3.2 — comets orbit on elliptical paths just outside the outermost planet.
        // World-space orbit, projected through the same tilt+camera as planets.
        // V3.3 — extra bottom-edge clamp so the comet doesn't sit under the HUD
        // hint + attribution chrome (which receive pointer events too). 60px
        // reserves room for "HOVER · CLICK..." hint and "by A Guide to Cloud".
        const ch_ref = b.ref as ExternalChannel;
        const cdef = ch_ref.comet;
        if (!cdef) continue;
        const outermost = Math.max(...data.planets.map((p) => p.orbit.radius));
        const radius = outermost * cdef.orbitMul * scaleFactor;
        const angle = reducedMotion
          ? cdef.phase * DEG
          : (t / cdef.speedSec) * TWO_PI + cdef.phase * DEG;
        const xp0 = radius * Math.cos(angle);
        const yp0 = radius * Math.sin(angle) * (1 - cdef.ecc);
        const tilt2d = cdef.tilt * DEG;
        const cosT2 = Math.cos(tilt2d);
        const sinT2 = Math.sin(tilt2d);
        const xp = xp0 * cosT2 - yp0 * sinT2;
        const yp = xp0 * sinT2 + yp0 * cosT2;
        const proj = project(xp, yp);
        let sx = cx + (proj.x + cameraX) * cameraZoom;
        let sy = cy + (proj.y + cameraY) * cameraZoom;
        const cometRadius = b.intrinsicSize * proj.scale * cameraZoom;
        const edgeMargin = cometRadius + 12;
        const bottomMargin = cometRadius + 60; // V3.3 — clear the HUD hint/attrib
        sx = clamp(sx, edgeMargin, cw - edgeMargin);
        sy = clamp(sy, edgeMargin, ch - bottomMargin);
        b.baseScreenX = sx;
        b.baseScreenY = sy;
        b.scale = proj.scale;
        b.depth = proj.depth;
      } else if (b.kind === 'beacon') {
        // V3.2 — Ko-fi beacon: fixed canvas-fraction position. Doesn't orbit, doesn't
        // scale with planets. Always at the same corner of the cosmos canvas.
        const ch_ref = b.ref as ExternalChannel;
        const beacon = ch_ref.beacon ?? { x: 0.92, y: 0.88 };
        b.baseScreenX = beacon.x * cw;
        b.baseScreenY = beacon.y * ch;
        b.scale = 1;
        b.depth = -800;
      } else if (b.kind === 'outpost') {
        // V3.2 — outposts on a fixed ring just outside the outermost planet orbit.
        // Each outpost has a thetaDeg position; rOrbit is shared (1.22× outermost).
        const ch_ref = b.ref as ExternalChannel;
        const op = ch_ref.outpost;
        if (!op) continue;
        const outermost = Math.max(...data.planets.map((p) => p.orbit.radius));
        const radius = outermost * 1.22 * scaleFactor;
        const ang = op.thetaDeg * DEG;
        const xp = radius * Math.cos(ang);
        const yp = radius * Math.sin(ang);
        const proj = project(xp, yp);
        let sx = cx + (proj.x + cameraX) * cameraZoom;
        let sy = cy + (proj.y + cameraY) * cameraZoom;
        const opRadius = b.intrinsicSize * proj.scale * cameraZoom;
        const edgeMargin = opRadius + 12;
        sx = clamp(sx, edgeMargin, cw - edgeMargin);
        sy = clamp(sy, edgeMargin, ch - edgeMargin);
        b.baseScreenX = sx;
        b.baseScreenY = sy;
        b.scale = proj.scale;
        b.depth = proj.depth;
      }
      // P1 #11 — cursor magnetism: bodies lean toward cursor within 180px.
      let mx = 0, my = 0;
      if (cursorActive && !reducedMotion && b.kind !== 'star' && b.kind !== 'beacon' && b.kind !== 'outpost') {
        const dx = cursorX - b.baseScreenX;
        const dy = cursorY - b.baseScreenY;
        const dist = Math.hypot(dx, dy);
        const RANGE = 180;
        if (dist > 0.0001 && dist < RANGE) {
          const pull = (1 - dist / RANGE);
          // softer easing; stronger on hover for tactile feedback
          const strength = 8 * pull * pull * (hoveredSlug === b.slug ? 1.6 : 1);
          mx = (dx / dist) * strength;
          my = (dy / dist) * strength;
        }
      }
      b.screenX = b.baseScreenX + mx;
      b.screenY = b.baseScreenY + my;
    }
  }

  // V3.2 — viewport-aware body scaling. On big screens (>= 720px wide) bodies
  // render at full intrinsic size. On phones (< 720px) bodies shrink linearly
  // toward 50% on tiny viewports so 6 planets + moons don't overlap each other.
  // Tied to viewport WIDTH (not scaleFactor) so desktop with bigger outermost
  // orbits doesn't accidentally shrink bodies.
  function bodyVpScale(): number {
    if (cw >= 720) return 1.0;
    return Math.max(0.5, cw / 720);
  }

  // ─────────── Phase C — lens projection layer ───────────
  // Each lens function returns canvas-space {x, y} for a body. The lens
  // dispatcher runs after updateBodyPositions(); for non-cosmos lenses we
  // override baseScreenX/Y and screenX/Y, disabling magnetism. Transitions
  // are smoothstep-eased over LENS_TRANSITION_MS.
  function setLens(name: Lens): void {
    if (name === currentLens) return;
    // Snapshot CURRENT screen positions so the transition starts where the
    // user is looking, not where the math says it should be.
    for (const b of bodies) {
      lensSnapshotPositions.set(b.slug, { x: b.baseScreenX, y: b.baseScreenY });
    }
    currentLens = name;
    lensTransitionMs = 0;
    try { window.localStorage.setItem('cosmosLens', name); } catch (_) { /* */ }
    document.body.dataset.lens = name;
    // Closing the card makes the lens transition feel cleaner — a card
    // anchored to a planet's old orbital position would slide oddly.
    if (focusedSlug && name !== 'cosmos') closeCard();
    if (name !== 'cosmos') {
      // Reset user pan/zoom — lens layouts are calibrated to cw/ch directly.
      userPanX = 0;
      userPanY = 0;
      userZoomMul = 1;
    }
  }

  // Constellation: manually-placed, relationship-driven star map. Earth as
  // the social hub (3 connections), Agentic↔Claw as the technical pair,
  // moons clustered with parents, MCP at top, voyagers at the corners.
  function computeConstellationPosition(b: BodyState): { x: number; y: number } | null {
    const cx2 = cw / 2;
    const cy2 = ch / 2;
    const r = Math.min(cw, ch) * 0.30;
    switch (b.slug) {
      case 'earth':       return { x: cx2,                  y: cy2                   };
      case 'brainbar':    return { x: cx2 - r,              y: cy2 - r * 0.55        };
      case 'plainai':     return { x: cx2 - r * 1.15,       y: cy2 + r * 0.5         };
      case 'shift':       return { x: cx2 + r * 1.05,       y: cy2 - r * 0.65        };
      case 'agentic':     return { x: cx2 + r * 0.85,       y: cy2 + r * 0.55        };
      case 'claw':        return { x: cx2 + r * 1.4,        y: cy2 + r * 0.85        };
      case 'guided':      return { x: cx2 + 70,             y: cy2 + 60              };
      case 'curriculum':  return { x: cx2 - r * 1.15 - 60,  y: cy2 + r * 0.5 + 60    };
      case 'mcp':         return { x: cx2,                  y: Math.max(80, ch * 0.13) };
      case 'youtube':     return { x: cw - 90,              y: 110                   };
      case 'linkedin':    return { x: 110,                  y: 110                   };
      case 'kofi-shop':   return { x: cw - 90,              y: ch - 110              };
      case 'kofi-tip':    return { x: 110,                  y: ch - 110              };
      default:            return null;
    }
  }

  // Timeline: horizontal axis = time (oldest left, newest right). Bodies
  // staggered vertically so dates within a few days don't pile up.
  function getBodyShipDate(slug: string): number | null {
    const p = planetBySlug.get(slug);
    if (p) return p.lastShippedAt ? Date.parse(p.lastShippedAt) : null;
    const moonRec = moonBySlug.get(slug);
    if (moonRec) return moonRec.moon.lastShippedAt ? Date.parse(moonRec.moon.lastShippedAt) : null;
    if (slug === data.mcp.slug) {
      const iso = (data.mcp as unknown as Card).lastShippedAt;
      return iso ? Date.parse(iso) : null;
    }
    return null;
  }
  let _timelineRange: { minT: number; maxT: number } | null = null;
  function getTimelineRange(): { minT: number; maxT: number } {
    if (_timelineRange) return _timelineRange;
    const dates: number[] = [];
    for (const b of bodies) {
      const t = getBodyShipDate(b.slug);
      if (t !== null && Number.isFinite(t)) dates.push(t);
    }
    if (dates.length === 0) {
      _timelineRange = { minT: Date.now() - 30 * 86_400_000, maxT: Date.now() };
    } else {
      const minT = Math.min(...dates);
      const maxT = Math.max(Date.now(), Math.max(...dates));
      _timelineRange = { minT, maxT };
    }
    return _timelineRange;
  }
  function computeTimelinePosition(b: BodyState): { x: number; y: number } | null {
    const t = getBodyShipDate(b.slug);
    if (t === null || !Number.isFinite(t)) {
      // No ship date — park off-screen left at faded position.
      return { x: -120, y: -120 };
    }
    const { minT, maxT } = getTimelineRange();
    const padX = 140;
    const usableW = cw - padX * 2;
    const range = Math.max(1, maxT - minT);
    const xPos = padX + ((t - minT) / range) * usableW;
    // Vertical jitter — stable per body, prevents pileups.
    const idx = bodies.findIndex((bb) => bb.slug === b.slug);
    const yBase = ch * 0.5;
    const stack = (idx % 5) - 2; // -2..2
    const yJitter = stack * 80;
    return { x: xPos, y: yBase + yJitter };
  }

  // Audience: 4 columns. Each body has ONE primary audience (the one it
  // most cleanly serves). Earth + MCP + YouTube serve multiple but are
  // placed in their PRIMARY column to keep the layout legible.
  type Audience = 'curious' | 'cert-prep' | 'techie' | 'job-watcher';
  const AUDIENCE_MAP: Record<string, Audience> = {
    earth: 'curious',
    guided: 'cert-prep',
    brainbar: 'curious',
    shift: 'job-watcher',
    plainai: 'curious',
    curriculum: 'curious',
    agentic: 'techie',
    claw: 'techie',
    mcp: 'techie',
    youtube: 'curious',
    linkedin: 'job-watcher',
    'kofi-shop': 'curious',
    'kofi-tip': 'curious',
  };
  const AUDIENCE_COL: Record<Audience, number> = {
    'curious': 0,
    'cert-prep': 1,
    'techie': 2,
    'job-watcher': 3,
  };
  function computeAudiencePosition(b: BodyState): { x: number; y: number } | null {
    const audience = AUDIENCE_MAP[b.slug];
    if (!audience) return null;
    const colIdx = AUDIENCE_COL[audience];
    const colWidth = cw / 4;
    const x = colIdx * colWidth + colWidth / 2;
    const sameCol = bodies.filter((bb) => AUDIENCE_MAP[bb.slug] === audience).map((bb) => bb.slug);
    const myIndex = sameCol.indexOf(b.slug);
    const totalInCol = sameCol.length;
    const yStart = ch * 0.22;
    const yEnd = ch * 0.84;
    const ySpan = yEnd - yStart;
    const ySpacing = ySpan / Math.max(1, totalInCol);
    const y = yStart + myIndex * ySpacing + ySpacing / 2;
    return { x, y };
  }

  function computeLensTarget(b: BodyState): { x: number; y: number } | null {
    if (currentLens === 'cosmos') return null; // no override
    if (currentLens === 'constellation') return computeConstellationPosition(b);
    if (currentLens === 'timeline') return computeTimelinePosition(b);
    if (currentLens === 'audience') return computeAudiencePosition(b);
    return null;
  }

  function applyLensProjection(deltaMs: number): void {
    // Tick transition timer
    if (lensTransitionMs >= 0) {
      lensTransitionMs += deltaMs;
      if (lensTransitionMs >= LENS_TRANSITION_MS) lensTransitionMs = -1;
    }
    const inTransition = lensTransitionMs >= 0;
    // Cosmos lens at rest — orbital positions stand. No override.
    if (currentLens === 'cosmos' && !inTransition) return;
    const transitionProgress = inTransition ? Math.min(1, lensTransitionMs / LENS_TRANSITION_MS) : 1;
    const eased = transitionProgress * transitionProgress * (3 - 2 * transitionProgress);
    for (const b of bodies) {
      const target = computeLensTarget(b);
      if (!target) {
        // No target (e.g. cosmos lens during transition out) — let the
        // existing baseScreenX/Y stand; we lerp from snapshot to that.
        if (inTransition) {
          const snap = lensSnapshotPositions.get(b.slug);
          if (snap) {
            const tx = b.baseScreenX;
            const ty = b.baseScreenY;
            b.baseScreenX = snap.x + (tx - snap.x) * eased;
            b.baseScreenY = snap.y + (ty - snap.y) * eased;
            b.screenX = b.baseScreenX;
            b.screenY = b.baseScreenY;
          }
        }
        continue;
      }
      if (inTransition) {
        const snap = lensSnapshotPositions.get(b.slug) ?? { x: b.baseScreenX, y: b.baseScreenY };
        b.baseScreenX = snap.x + (target.x - snap.x) * eased;
        b.baseScreenY = snap.y + (target.y - snap.y) * eased;
      } else {
        b.baseScreenX = target.x;
        b.baseScreenY = target.y;
      }
      // Magnetism is disabled in non-cosmos lenses — bodies are placed,
      // not orbiting, so the cursor pull would feel unnatural.
      b.screenX = b.baseScreenX;
      b.screenY = b.baseScreenY;
    }
  }

  function applyBodyTransforms(introBodies: number): void {
    const vp = bodyVpScale();
    const sorted = [...bodies].sort((a, b) => a.depth - b.depth);
    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i];
      if (!b) continue;
      const isHovered = hoveredSlug === b.slug;
      const isFocused = focusedSlug === b.slug;
      const dim = (focusedSlug !== null && !isFocused) || (hoveredSlug !== null && !isHovered);
      let scale = b.scale * cameraZoom * vp;
      if (isHovered) scale *= 1.12;
      if (isFocused) scale *= 1.35;
      // P1 #5 — depth-based opacity falloff for stronger 3D feel.
      // Bodies behind the sun (depth > 0) are slightly dimmer + cooler.
      const depthFade = b.kind === 'star' ? 1 : clamp(1 - (b.depth / 1200), 0.55, 1);
      const opacity = (dim ? 0.4 : 1) * depthFade * introBodies;
      // Cool tint on far bodies via filter — suggests atmospheric perspective.
      const cool = b.kind === 'star' ? 0 : clamp((b.depth + 200) / 1400, 0, 0.4);
      // V3.4 — fade body when its screen position lands inside the sun's
      // bright glow. Stops Earth + Brainbar AI from rendering as a smudge on
      // the sun's disc when their orbit phase puts them behind the sun in
      // side view. Applies to non-star bodies only.
      let sunOcclusionFade = 1;
      if (b.kind === 'planet' || b.kind === 'moon') {
        const sunDist = Math.hypot(b.screenX - cx, b.screenY - cy);
        // Match drawSun's haloR: data.sun.size * cameraZoom * (0.85 avg) * 3.8
        const sunHaloR = data.sun.size * cameraZoom * 3.2;
        if (sunDist < sunHaloR && sunHaloR > 0) {
          const ratio = sunDist / sunHaloR;
          sunOcclusionFade = clamp(0.15 + 0.85 * Math.pow(ratio, 1.5), 0.15, 1);
        }
      }
      const finalOpacity = opacity * sunOcclusionFade;
      b.el.style.transform = `translate3d(${b.screenX}px, ${b.screenY}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      b.el.style.opacity = String(finalOpacity);
      b.el.style.zIndex = String(100 + i);
      b.el.style.filter = cool > 0 ? `saturate(${(1 - cool * 0.4).toFixed(2)}) brightness(${(1 - cool * 0.25).toFixed(2)})` : '';
      // V3.4 — expose body's identity hue as a CSS custom property so the
      // ::after sphere-shading pseudo-element can pick it up. Each planet/moon
      // gets its own coloured aura matching the body data, helping the body
      // read as a 3D sphere with directional light from the sun (top-left).
      b.el.style.setProperty('--body-hue', b.glowOuter);
      b.el.style.setProperty('--body-hue-core', b.glowCore);
      b.el.dataset.hovered = isHovered ? 'true' : 'false';
      b.el.dataset.focused = isFocused ? 'true' : 'false';
      b.el.dataset.dim = dim ? 'true' : 'false';
    }
    applyBlogBelt(introBodies);
  }

  // Phase B-2 — blog asteroid belt around Earth. Each anchor element
  // (rendered by index.astro from blog-feed.json) gets positioned every
  // frame at a different angular offset around Earth. Slow rotation, fades
  // out when a card is open (keeps focus state clean).
  // Phase D polish (Sush 9 May 2026): bumped padding 36→52 so dots have
  // breathing room from Earth's icon; rotation slowed 0.045→0.028 rad/sec
  // so dots are easier to track visually.
  const blogAsteroids = Array.from(document.querySelectorAll<HTMLElement>('.blog-asteroid'));
  const BLOG_ORBIT_PADDING = 52; // px outside Earth's body
  const BLOG_ROT_SPEED = 0.028;  // radians per second — very slow, trackable
  function applyBlogBelt(introBodies: number): void {
    if (blogAsteroids.length === 0) return;
    const earth = bodies.find((b) => b.slug === 'earth');
    if (!earth) {
      for (const a of blogAsteroids) a.style.opacity = '0';
      return;
    }
    const t = getRealT();
    const baseAngle = t * BLOG_ROT_SPEED;
    const earthRadius = earth.intrinsicSize * earth.scale * cameraZoom * 0.5;
    const orbitR = earthRadius + BLOG_ORBIT_PADDING;
    const visible = focusedSlug === null && introBodies > 0.6;
    for (let i = 0; i < blogAsteroids.length; i++) {
      const el = blogAsteroids[i]!;
      const angle = baseAngle + (i / blogAsteroids.length) * TWO_PI;
      const x = earth.screenX + Math.cos(angle) * orbitR;
      const y = earth.screenY + Math.sin(angle) * orbitR;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      el.style.opacity = visible ? String(0.85 * introBodies) : '0';
      el.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }

  function updateCamera(deltaSec: number): void {
    if (focusedSlug) {
      const target = bodies.find((b) => b.slug === focusedSlug);
      if (target) {
        const t = simT;
        if (target.kind === 'planet') {
          const p = target.ref as Planet;
          const op = planetOrbitPos(p, t);
          cameraTargetX = -op.x + userPanX;
          cameraTargetY = -op.y * cosTilt + userPanY;
        } else if (target.kind === 'moon' && target.parentSlug) {
          const parent = planetBySlug.get(target.parentSlug);
          if (parent) {
            const parentOP = planetOrbitPos(parent, t);
            const op = moonOrbitPos(parentOP.x, parentOP.y, target.ref as Moon, t);
            cameraTargetX = -op.x + userPanX;
            cameraTargetY = -op.y * cosTilt + userPanY;
          }
        } else if (target.kind === 'star') {
          cameraTargetX = userPanX;
          cameraTargetY = userPanY;
        }
        cameraTargetZoom = (mobileMode ? 1.5 : 1.85) * userZoomMul;
      }
    } else {
      // V2.1 #3 — idle camera drift. After IDLE_THRESHOLD_MS of no input, gently drift.
      let driftX = 0;
      let driftY = 0;
      let driftZoom = 0;
      if (!reducedMotion && cameraZoom > 0.01) {
        const idleMs = performance.now() - lastInteractionMs;
        if (idleMs > IDLE_THRESHOLD_MS) {
          const ramp = clamp01((idleMs - IDLE_THRESHOLD_MS) / 4000); // ease in over 4s
          const phase = (performance.now() - lastInteractionMs - IDLE_THRESHOLD_MS) / 1000;
          driftX = Math.sin(phase * 0.18) * 90 * ramp;
          driftY = Math.cos(phase * 0.14) * 50 * ramp;
          driftZoom = Math.sin(phase * 0.11) * 0.06 * ramp;
        }
      }
      cameraTargetX = userPanX + driftX;
      cameraTargetY = userPanY + driftY;
      cameraTargetZoom = userZoomMul + driftZoom;
    }
    const baseLerp = reducedMotion ? 1 : Math.min(1, deltaSec * 4.5);
    // V3 #2 — Camera lerp boost during warp window. Pulls the camera toward target faster
    // for the first WARP_DURATION_MS, then eases back to normal.
    let lerp = baseLerp;
    if (!reducedMotion && warpStartMs > 0) {
      const wt = performance.now() - warpStartMs;
      if (wt < WARP_DURATION_MS) {
        const wp = wt / WARP_DURATION_MS; // 0 → 1
        // Boost peaks early then decays (sin curve from 1.0 → ~3.5 → 1.0)
        const boost = 1 + 2.5 * Math.sin(wp * Math.PI);
        lerp = Math.min(1, baseLerp * boost);
      } else {
        warpStartMs = 0;
      }
    }
    cameraX += (cameraTargetX - cameraX) * lerp;
    cameraY += (cameraTargetY - cameraY) * lerp;
    cameraZoom += (cameraTargetZoom - cameraZoom) * lerp;
  }

  function frame(now: number): void {
    const deltaSec = (now - lastFrame) / 1000;
    lastFrame = now;
    // V2.2 — tilt lerps toward target whenever they differ (cosmos ↔ topdown toggle).
    if (Math.abs(currentTilt - targetTiltRad) > 0.0005) {
      // V3.4 — slower, more cinematic tilt lerp (was 3.6, now 1.6) for the
      // smooth view-switch animation between topdown and side. Sush wants the
      // transition to feel like a camera tilt, not a snap.
      const tiltLerp = reducedMotion ? 1 : Math.min(1, deltaSec * 1.6);
      setTilt(currentTilt + (targetTiltRad - currentTilt) * tiltLerp);
    } else if (currentTilt !== targetTiltRad) {
      setTilt(targetTiltRad);
    }
    updateSimTime();
    updateCamera(deltaSec);
    updateBodyPositions();
    applyLensProjection(deltaSec * 1000);
    const intro = introProgress(now);
    if (intro.done) introActive = false;
    applyBodyTransforms(intro.bodies);
    clear();
    // Phase C — non-cosmos lenses suppress the orbital chrome (orbit
    // ellipses, MCP rays, sun god-rays). Bodies + halos + freshness
    // ripples + constellation lines remain across lenses.
    const isCosmosLens = currentLens === 'cosmos';
    drawGalacticHorizon();
    drawTopdownGalacticRing();
    drawNebulae();
    drawParallaxStars();
    drawMcpStarfield();
    if (isCosmosLens) {
      drawOrbits(intro.orbits);
      drawOrbitSweep(intro.orbits);
    }
    drawSun(intro.sun);
    if (isCosmosLens) {
      drawSunGodRays(intro.sun);
      drawMcpRays(intro.bodies);
    }
    drawConstellationLines(intro.bodies, deltaSec);
    if (isCosmosLens) {
      drawMcpStream(intro.bodies);
      drawMcpOutwardPulse(intro.bodies);
    }
    drawBodyShadows(intro.bodies);
    if (isCosmosLens) drawExternalDecorations(intro.bodies);
    const sorted = [...bodies].sort((a, b) => a.depth - b.depth);
    for (const b of sorted) drawBodyHalo(b, intro.bodies);
    drawFreshnessPulses(now, intro.bodies);
    drawCardTether(deltaSec);
    drawCardParticles(now);
    drawPings(now);
    if (isCosmosLens) drawAtmosphereBlur();
    drawHud();
    if (hoveredSlug) updateHoverLabel();
    requestAnimationFrame(frame);
  }

  function updateHoverLabel(): void {
    if (!hoveredSlug) {
      planetLabel.dataset.visible = 'false';
      return;
    }
    const b = bodies.find((bb) => bb.slug === hoveredSlug);
    if (!b) {
      planetLabel.dataset.visible = 'false';
      return;
    }
    const ref = b.ref as Card;
    const offset = b.intrinsicSize * b.scale * cameraZoom + 14;
    planetLabel.style.transform = `translate(${b.screenX}px, ${b.screenY - offset}px) translate(-50%, -100%)`;
    planetLabel.textContent = `${ref.name} · ${ref.tagline}`;
    planetLabel.dataset.visible = 'true';
  }

  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => {
      switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return c;
      }
    });
  }

  function getSourceIconHtml(slug: string): string {
    const el = bodiesRoot!.querySelector<HTMLElement>(`.planet-body[data-slug="${slug}"] .planet-body__icon`);
    return el ? el.innerHTML : '';
  }

  function renderStatsHtml(stats?: string[]): string {
    if (!stats || stats.length === 0) return '';
    return `<ul class="card-stats" role="list">${stats.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`;
  }

  // Wave 1 (V5) — small "browse the deeper content" pills inside a planet card.
  // Surfaces breadth (e.g. Earth's 56 tools, 66 mind maps, 9 cert paths) without
  // adding visual noise to the cosmos. Each pill is a real <a> linking to the
  // existing planet's section page; opens in a new tab so the cosmos stays open.
  function renderLibraryHtml(library: LibraryLink[] | undefined): string {
    if (!library || library.length === 0) return '';
    const pills = library.map((l) => `
      <a class="card-library-pill"
         href="${escapeHtml(l.url)}"
         target="_blank"
         rel="noopener"
         data-library-pill="1">
        <span class="card-library-pill__icon" aria-hidden="true">${escapeHtml(l.icon)}</span>
        <span class="card-library-pill__label">${escapeHtml(l.label)}</span>
        <span class="card-library-pill__arrow" aria-hidden="true">↗</span>
      </a>`).join('');
    return `
      <div class="card-section card-library" data-library="1">
        <span class="card-section-label">Browse the library</span>
        <div class="card-library__pills" role="list">${pills}</div>
      </div>
    `;
  }

  function getGlowForSlug(slug: string): string {
    if (slug === data.mcp.slug) return data.mcp.anchor?.glowCore ?? '#FFD89A';
    const p = planetBySlug.get(slug);
    if (p) return p.body.glowCore;
    const moonRec = moonBySlug.get(slug);
    if (moonRec) return moonRec.moon.body.glowCore;
    const channel = channelBySlug.get(slug);
    if (channel) return channel.body.glowCore;
    return '#F2EDE3';
  }

  function renderCardHtml(card: Card, _kind: 'planet' | 'moon' | 'star', moons: Moon[]): string {
    const badge = card.badge ? `<span class="card-firewall">${escapeHtml(card.badge)}</span>` : '';
    const iconHtml = getSourceIconHtml(card.slug);
    const heroGlow = getGlowForSlug(card.slug);
    const heroGlowDeep = getDeepGlowForSlug(card.slug);
    const freshStamp = renderFreshStamp(card.lastShippedAt);
    const moonsHtml = moons.length === 0 ? '' : `
      <div class="card-moons">
        <span class="card-moons-label">Moon${moons.length > 1 ? 's' : ''}</span>
        ${moons.map((m) => {
          const moonIcon = getSourceIconHtml(m.slug);
          return `
            <article class="moon">
              <div class="moon-head">
                <span class="moon-icon" aria-hidden="true">${moonIcon}</span>
                <h4 class="moon-name">${escapeHtml(m.name)}</h4>
              </div>
              ${m.badge ? `<span class="moon-firewall">${escapeHtml(m.badge)}</span>` : ''}
              <p class="moon-tagline">${escapeHtml(m.tagline)}</p>
              <p class="moon-text">${escapeHtml(m.content)}</p>
              ${renderStatsHtml(m.stats)}
              <p class="moon-text moon-text--founder">"${escapeHtml(m.founder)}"</p>
              <a class="moon-cta" href="${escapeHtml(m.url)}" rel="noopener">Visit ${escapeHtml(m.name)}</a>
            </article>
          `;
        }).join('')}
      </div>
    `;
    // V2.1 #1 — card portrait. Atmosphere palette gradient, mini parallax stars,
    // slowly rotating planet body. Replaces the flat 80px logo on flat halo.
    return `
      ${badge}
      <div class="card-portrait" style="--card-glow: ${heroGlow}; --card-glow-deep: ${heroGlowDeep};" aria-hidden="true">
        <div class="card-portrait__sky">
          <span class="card-portrait__star" style="--x: 18%; --y: 22%; --d: 0s;"></span>
          <span class="card-portrait__star" style="--x: 76%; --y: 38%; --d: 1.4s;"></span>
          <span class="card-portrait__star" style="--x: 42%; --y: 78%; --d: 2.6s;"></span>
          <span class="card-portrait__star" style="--x: 88%; --y: 14%; --d: 0.7s;"></span>
          <span class="card-portrait__star" style="--x: 12%; --y: 58%; --d: 3.1s;"></span>
          <span class="card-portrait__star" style="--x: 64%; --y: 88%; --d: 1.9s;"></span>
        </div>
        <div class="card-portrait__atmosphere"></div>
        <div class="card-portrait__body">
          <div class="card-portrait__icon">${iconHtml}</div>
        </div>
        ${freshStamp}
      </div>
      <div class="card-meta">
        <div class="card-badges">
          <span class="card-badge card-badge--type">${escapeHtml(card.type)}</span>
          <span class="card-badge">${escapeHtml(card.atmosphere)}</span>
          <span class="card-badge card-badge--status">${escapeHtml(card.status)}</span>
        </div>
        <h2 class="card-name" id="card-name" tabindex="-1">${escapeHtml(card.name)}</h2>
        <p class="card-tagline">${escapeHtml(card.tagline)}</p>
      </div>
      ${renderStatsHtml(card.stats)}
      <div class="card-section">
        <span class="card-section-label">Who it's for</span>
        <p class="card-section-text">${escapeHtml(card.audience)}</p>
      </div>
      <div class="card-section">
        <span class="card-section-label">What you'll find</span>
        <p class="card-section-text">${escapeHtml(card.content)}</p>
      </div>
      <div class="card-section">
        <span class="card-section-label">Founder note</span>
        <p class="card-section-text card-founder">"${escapeHtml(card.founder)}"</p>
      </div>
      ${renderLibraryHtml(card.library)}
      <div class="card-cta-row">
        <a class="card-cta" href="${escapeHtml(card.url)}" rel="noopener">Visit ${escapeHtml(card.name)}</a>
      </div>
      ${moonsHtml}
    `;
  }

  // V2.1 #1 helper — get the deeper outer-glow tone for the card portrait gradient.
  function getDeepGlowForSlug(slug: string): string {
    if (slug === data.mcp.slug) return data.mcp.anchor?.glowOuter ?? '#FFB347';
    const p = planetBySlug.get(slug);
    if (p) return p.body.glowOuter;
    const moonRec = moonBySlug.get(slug);
    if (moonRec) return moonRec.moon.body.glowOuter;
    const channel = channelBySlug.get(slug);
    if (channel) return channel.body.glowOuter;
    return '#FFB347';
  }

  // V2.1 #2 helper — small typewriter "FRESH" stamp on the portrait if shipped recently.
  function renderFreshStamp(iso: string | undefined): string {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return '';
    const ageDays = (Date.now() - t) / 86_400_000;
    if (ageDays < 0 || ageDays > FRESHNESS_DAYS) return '';
    let label = 'fresh';
    if (ageDays < 1) label = 'shipped today';
    else if (ageDays < 2) label = 'shipped yesterday';
    else label = `shipped ${Math.round(ageDays)} days ago`;
    return `<span class="card-portrait__stamp" aria-hidden="true">${escapeHtml(label)}</span>`;
  }

  function renderMcpExtras(mcp: McpStar): string {
    return `
      <div class="card-section">
        <span class="card-section-label">Endpoints</span>
        <ul class="card-mcp-endpoints" role="list">
          ${mcp.endpoints.map((e) => `
            <li>
              <span class="name">${escapeHtml(e.name)}</span>
              <span class="${e.status === 'live' ? 'status-live' : 'status-planned'}">${escapeHtml(e.status)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // V3.3 — external channels (long-form, bites, kofi) get their own card render.
  // Same shell as planet cards, different CTA logic:
  //   • Single-CTA: rendered as primary "Open <name> ↗"
  //   • Multi-CTA (Ko-fi): primary download + secondary tip
  // The hint badge "↗ external" makes it clear this opens a new tab.
  function renderExternalCardHtml(ch: ExternalChannel): string {
    const iconHtml = getSourceIconHtml(ch.slug);
    const heroGlow = ch.body.glowCore;
    const heroGlowDeep = ch.body.glowOuter;
    const ctaRowHtml = (() => {
      if (ch.ctas && ch.ctas.length > 0) {
        return `<div class="card-cta-row card-cta-row--multi">${ch.ctas.map((c, i) => `
          <a class="card-cta ${i === 0 ? '' : 'card-cta--secondary'}"
             href="${escapeHtml(c.url)}"
             target="_blank"
             rel="noopener noreferrer">${escapeHtml(c.icon ?? '')} ${escapeHtml(c.label)}</a>
        `).join('')}</div>`;
      }
      const label = ch.ctaLabel ?? `Open ${ch.name}`;
      const icon = ch.ctaIcon ?? '↗';
      return `
        <div class="card-cta-row">
          <a class="card-cta"
             href="${escapeHtml(ch.url)}"
             target="_blank"
             rel="noopener noreferrer">${escapeHtml(label)} ${escapeHtml(icon)}</a>
        </div>
      `;
    })();
    return `
      <div class="card-portrait" style="--card-glow: ${heroGlow}; --card-glow-deep: ${heroGlowDeep};" aria-hidden="true">
        <div class="card-portrait__sky">
          <span class="card-portrait__star" style="--x: 18%; --y: 22%; --d: 0s;"></span>
          <span class="card-portrait__star" style="--x: 76%; --y: 38%; --d: 1.4s;"></span>
          <span class="card-portrait__star" style="--x: 42%; --y: 78%; --d: 2.6s;"></span>
          <span class="card-portrait__star" style="--x: 88%; --y: 14%; --d: 0.7s;"></span>
        </div>
        <div class="card-portrait__atmosphere"></div>
        <div class="card-portrait__body">
          <div class="card-portrait__icon">${iconHtml}</div>
        </div>
      </div>
      <div class="card-meta">
        <div class="card-badges">
          <span class="card-badge card-badge--type">${escapeHtml(ch.type)}</span>
          <span class="card-badge card-badge--external">↗ opens in new tab</span>
        </div>
        <h2 class="card-name" id="card-name" tabindex="-1">${escapeHtml(ch.name)}</h2>
        <p class="card-tagline">${escapeHtml(ch.tagline)}</p>
      </div>
      ${renderStatsHtml(ch.stats)}
      <div class="card-section">
        <span class="card-section-label">Who it's for</span>
        <p class="card-section-text">${escapeHtml(ch.audience)}</p>
      </div>
      <div class="card-section">
        <span class="card-section-label">What you'll find</span>
        <p class="card-section-text">${escapeHtml(ch.content)}</p>
      </div>
      <div class="card-section">
        <span class="card-section-label">Founder note</span>
        <p class="card-section-text card-founder">"${escapeHtml(ch.founder)}"</p>
      </div>
      ${ctaRowHtml}
    `;
  }

  function renderCard(slug: string): void {
    if (slug === data.mcp.slug) {
      const mcpAsCard = data.mcp as unknown as Card;
      cardBody.innerHTML = renderCardHtml(mcpAsCard, 'star', []) + renderMcpExtras(data.mcp);
    } else {
      const planet = planetBySlug.get(slug);
      const moonRec = moonBySlug.get(slug);
      const channel = channelBySlug.get(slug);
      if (planet) {
        cardBody.innerHTML = renderCardHtml(planet, 'planet', planet.moons ?? []);
      } else if (moonRec) {
        cardBody.innerHTML = renderCardHtml(moonRec.moon, 'moon', []);
      } else if (channel) {
        // V3.3 — external channels render through the same card shell, but with
        // their own CTA logic (single-CTA for YouTubes; two-CTA for Ko-fi).
        cardBody.innerHTML = renderExternalCardHtml(channel);
      }
    }
    cardPanel.dataset.open = 'true';
    cardPanel.removeAttribute('aria-hidden');
    const heading = cardBody.querySelector<HTMLElement>('#card-name');
    heading?.focus();
  }

  // V3.5 — MCP live data streams. Dots flow PLANET → MCP relay (data being
  // ingested), reinforcing that MCP collects from each live planet rather than
  // broadcasts to them. Planned endpoints are handled by drawMcpRays as faint
  // static dashed lines. Three dots per live path with phase offsets, on a
  // gentle quadratic curve so multiple paths read distinctly.
  function drawMcpStream(introBodies: number): void {
    if (introBodies <= 0 || reducedMotion) return;
    const star = bodies.find((b) => b.kind === 'star');
    if (!star) return;
    const slugMap: Record<string, string> = {
      'brainbar-mcp': 'brainbar',
      'agentic-mcp': 'agentic',
      'earth-mcp': 'earth',
      'plainai-mcp': 'plainai',
      'shift-mcp': 'shift',
      'claw-mcp': 'claw',
    };
    const t = getRealT();
    const PERIOD_SEC = 2.4;
    const N_DOTS = 3;
    const isMcpFocused = focusedSlug === data.mcp.slug;
    const dotColor = data.mcp.anchor?.glowCore ?? '#FFE6B0';
    const guideColor = data.mcp.anchor?.glowOuter ?? '#FFB347';

    ctx.save();
    for (const ep of data.mcp.endpoints) {
      if (ep.status !== 'live') continue;
      const targetSlug = slugMap[ep.slug];
      if (!targetSlug) continue;
      const target = bodies.find((b) => b.slug === targetSlug);
      if (!target) continue;

      const dx = star.screenX - target.screenX;
      const dy = star.screenY - target.screenY;
      const dist = Math.hypot(dx, dy);
      if (dist < 50) continue;
      // Curve control point — perpendicular offset so paths fan out
      const mx = (target.screenX + star.screenX) / 2;
      const my = (target.screenY + star.screenY) / 2;
      const offsetMag = Math.min(50, dist * 0.14);
      const px = -dy / dist * offsetMag;
      const py = dx / dist * offsetMag;
      const ctrlX = mx + px;
      const ctrlY = my + py;

      // Faint guide path under the dots so the route is visible at rest
      // Phase D polish: guide line + dots dimmed at rest (Sush 9 May).
      const guideAlpha = (isMcpFocused ? 0.16 : 0.04) * introBodies;
      ctx.strokeStyle = withAlpha(guideColor, guideAlpha);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(target.screenX, target.screenY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, star.screenX, star.screenY);
      ctx.stroke();

      // Animated dots along the same path. tt=0 is at planet, tt=1 is at star.
      for (let i = 0; i < N_DOTS; i++) {
        const phase = i / N_DOTS;
        const tt = ((t / PERIOD_SEC) + phase) % 1;
        const u = 1 - tt;
        const x = u * u * target.screenX + 2 * u * tt * ctrlX + tt * tt * star.screenX;
        const y = u * u * target.screenY + 2 * u * tt * ctrlY + tt * tt * star.screenY;
        const fadeIn = Math.min(1, tt * 8);
        const fadeOut = Math.min(1, (1 - tt) * 8);
        const dotAlpha = (isMcpFocused ? 0.95 : 0.32) * Math.min(fadeIn, fadeOut) * introBodies;
        ctx.fillStyle = withAlpha(dotColor, dotAlpha);
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, TWO_PI);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // V3.5 — MCP outward signal pulse. Concentric rings expand from the relay
  // toward the nearest viewport edge, signalling "outside agents can read this"
  // — the bridge between the cosmos and the wider world. Three rings on
  // staggered phases. Capped at viewport edge + 80px so it never bursts off
  // weird angles.
  function drawMcpOutwardPulse(introBodies: number): void {
    if (introBodies <= 0 || reducedMotion) return;
    const star = bodies.find((b) => b.kind === 'star');
    if (!star) return;
    const t = getRealT();
    const PERIOD_SEC = 4.0;
    const N_RINGS = 3;
    const distLeft = star.screenX;
    const distRight = cw - star.screenX;
    const distTop = star.screenY;
    const distBottom = ch - star.screenY;
    const edgeDist = Math.min(distLeft, distRight, distTop, distBottom);
    const maxR = Math.max(60, edgeDist + 80);
    const minR = star.intrinsicSize * star.scale * cameraZoom * 1.6;
    if (maxR <= minR) return;
    const isMcpFocused = focusedSlug === data.mcp.slug;
    // Phase D polish: outward pulse rest alpha dropped from 0.20 to 0.06
    // (Sush feedback: MCP was over-bright). Focus state retains 0.32.
    const baseAlpha = (isMcpFocused ? 0.32 : 0.06) * introBodies;
    const ringColor = data.mcp.anchor?.glowCore ?? '#FFE6B0';
    ctx.save();
    for (let i = 0; i < N_RINGS; i++) {
      const phase = i / N_RINGS;
      const tt = ((t / PERIOD_SEC) + phase) % 1;
      const r = minR + (maxR - minR) * tt;
      const alpha = (1 - tt) * baseAlpha;
      if (alpha <= 0.01) continue;
      ctx.strokeStyle = withAlpha(ringColor, alpha);
      ctx.lineWidth = 1.0 + (1 - tt) * 0.8;
      ctx.beginPath();
      ctx.arc(star.screenX, star.screenY, r, 0, TWO_PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  // V3.4 — Card-open particle trail. Visual reinforcement that the card came
  // from THIS body. On click, emit a small cluster of particles from the body's
  // screen position toward the card panel's centre, fading as they arrive.
  interface CardParticle {
    fromX: number; fromY: number;
    toX: number; toY: number;
    startMs: number;
    color: string;
    size: number;
  }
  const cardParticles: CardParticle[] = [];
  function emitCardParticles(slug: string): void {
    if (reducedMotion) return;
    const body = bodies.find((b) => b.slug === slug);
    if (!body) return;
    const cardEl = document.querySelector('.card-panel') as HTMLElement | null;
    if (!cardEl) return;
    const cardRect = cardEl.getBoundingClientRect();
    if (cardRect.width === 0) return;
    const toX = cardRect.left + cardRect.width / 2;
    const toY = cardRect.top + cardRect.height * 0.35;
    const now = performance.now();
    const color = body.glowOuter ?? '#FFFFFF';
    // Phase B-2 — card flyby (lite): bumped from 10 to 18 particles with
    // longer streamline + brighter cores. Combined with the tether drawn
    // in drawCardTether below, the card visually arrives FROM the focused
    // body rather than just sliding in from the side.
    const count = 18;
    for (let i = 0; i < count; i++) {
      cardParticles.push({
        fromX: body.screenX + (Math.random() - 0.5) * 14,
        fromY: body.screenY + (Math.random() - 0.5) * 14,
        toX: toX + (Math.random() - 0.5) * 18,
        toY: toY + (Math.random() - 0.5) * 18,
        startMs: now + i * 24,
        color,
        size: 1.8 + Math.random() * 1.6,
      });
    }
  }
  function drawCardParticles(now: number): void {
    if (cardParticles.length === 0) return;
    const dur = 900;
    for (let i = cardParticles.length - 1; i >= 0; i--) {
      const p = cardParticles[i]!;
      const tt = (now - p.startMs) / dur;
      if (tt >= 1) { cardParticles.splice(i, 1); continue; }
      if (tt < 0) continue;
      const eased = tt * tt * (3 - 2 * tt); // smoothstep
      const x = p.fromX + (p.toX - p.fromX) * eased;
      const y = p.fromY + (p.toY - p.fromY) * eased;
      const alpha = (1 - tt) * 0.95;
      // Soft halo behind the bright core — gives the streaming particle real glow.
      ctx.fillStyle = withAlpha(p.color, alpha * 0.32);
      ctx.beginPath();
      ctx.arc(x, y, p.size * 2.4, 0, TWO_PI);
      ctx.fill();
      // Bright core
      ctx.fillStyle = withAlpha(p.color, alpha);
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, TWO_PI);
      ctx.fill();
    }
  }

  // Phase B-2 — persistent tether between focused body and card panel.
  // While a card is open, a thin animated gradient thread connects the
  // focused planet to the card's left edge — visually anchoring "this
  // card belongs to that body" beyond the initial particle burst. Honours
  // reduced-motion (drawn but no dash animation).
  let cardTetherFade = 0;
  function drawCardTether(deltaSec: number): void {
    const target = focusedSlug ? 1 : 0;
    const lerp = reducedMotion ? 1 : Math.min(1, deltaSec * 4);
    cardTetherFade += (target - cardTetherFade) * lerp;
    if (cardTetherFade < 0.04 || !focusedSlug) return;
    const body = bodies.find((b) => b.slug === focusedSlug);
    if (!body) return;
    const cardEl = document.querySelector('.card-panel') as HTMLElement | null;
    if (!cardEl) return;
    const cardRect = cardEl.getBoundingClientRect();
    if (cardRect.width === 0) return;
    // Anchor at left-middle of card panel (the panel slides in from right).
    const toX = cardRect.left + 6;
    const toY = cardRect.top + cardRect.height * 0.42;
    const t = getRealT();
    const baseAlpha = 0.32 * cardTetherFade;
    const grad = ctx.createLinearGradient(body.screenX, body.screenY, toX, toY);
    grad.addColorStop(0, withAlpha(body.glowOuter, baseAlpha * 1.1));
    grad.addColorStop(0.5, withAlpha(data.atmosphere.accentSoft, baseAlpha));
    grad.addColorStop(1, withAlpha(data.atmosphere.accentSoft, baseAlpha * 0.55));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 6]);
    ctx.lineDashOffset = -t * 18;
    ctx.beginPath();
    ctx.moveTo(body.screenX, body.screenY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function openSlug(slug: string): void {
    if (focusedSlug === slug) return;
    lastFocusBeforeOpen = (document.activeElement as HTMLElement) ?? null;
    focusedSlug = slug;
    root.dataset.state = 'focused';
    // V3.5 — card-open dim: fade canvas-stage to 30% so the card reads cleanly.
    root.dataset.cardOpen = 'true';
    // V3.6 — expose the current card's slug on the panel for both audit checks
    // and possible per-slug CSS targeting. Set BEFORE renderCard so the audit
    // can read it as soon as data-open flips to true.
    cardPanel.dataset.slug = slug;
    if (!reducedMotion) {
      warpStartMs = performance.now();
      root.dataset.warp = 'in';
      window.setTimeout(() => {
        if (root.dataset.warp === 'in') delete root.dataset.warp;
      }, WARP_DURATION_MS);
    }
    renderCard(slug);
    // V3.4 — Card-open particle trail flies from the clicked body to the card
    // panel, reinforcing "this card came from THAT thing". Wait one frame for
    // card panel layout so we have its actual rect.
    if (!reducedMotion) {
      window.requestAnimationFrame(() => emitCardParticles(slug));
    }
    scheduleUrlWrite();
  }

  function closeCard(): void {
    if (!focusedSlug) return;
    focusedSlug = null;
    cardPanel.dataset.open = 'false';
    cardPanel.setAttribute('aria-hidden', 'true');
    root.dataset.state = hoveredSlug ? 'hovering' : 'idle';
    // V3.5 — restore canvas brightness when the card closes.
    delete root.dataset.cardOpen;
    // V3.6 — clear the card's tracked slug.
    delete cardPanel.dataset.slug;
    if (!reducedMotion) {
      warpStartMs = performance.now();
      root.dataset.warp = 'out';
      window.setTimeout(() => {
        if (root.dataset.warp === 'out') delete root.dataset.warp;
      }, WARP_DURATION_MS);
    }
    if (lastFocusBeforeOpen && document.body.contains(lastFocusBeforeOpen)) {
      lastFocusBeforeOpen.focus();
    }
    lastFocusBeforeOpen = null;
    scheduleUrlWrite();
  }

  for (const b of bodies) {
    b.el.addEventListener('mouseenter', () => {
      hoveredSlug = b.slug;
      root.dataset.state = focusedSlug ? 'focused' : 'hovering';
      markInteraction();
      updateHoverLabel();
      if (!reducedMotion) {
        pings.push({ slug: b.slug, x: b.screenX, y: b.screenY, startMs: performance.now(), size: b.intrinsicSize * b.scale * cameraZoom * 1.2 });
      }
    });
    b.el.addEventListener('mouseleave', () => {
      if (hoveredSlug === b.slug) hoveredSlug = null;
      root.dataset.state = focusedSlug ? 'focused' : 'idle';
      updateHoverLabel();
    });
    b.el.addEventListener('focus', () => {
      hoveredSlug = b.slug;
      root.dataset.state = focusedSlug ? 'focused' : 'hovering';
      markInteraction();
      updateHoverLabel();
    });
    b.el.addEventListener('blur', () => {
      if (hoveredSlug === b.slug) hoveredSlug = null;
      updateHoverLabel();
    });
    b.el.addEventListener('click', (e) => {
      e.preventDefault();
      markInteraction();
      // V3.4 — Click priority: planets win over moons when both overlap the
      // click point. Without this, a moon (e.g. Curriculum) visually in front
      // of a non-parent planet (e.g. Shift) eats the click. Hit-test ourselves
      // and re-route to the planet if the click lands on one.
      let routedSlug = b.slug;
      if (b.kind === 'moon') {
        const rect = b.el.getBoundingClientRect();
        const ccx = rect.left + rect.width / 2;
        const ccy = rect.top + rect.height / 2;
        for (const other of bodies) {
          if (other.kind !== 'planet' || other.slug === b.parentSlug) continue;
          const r2 = other.el.getBoundingClientRect();
          if (r2.width === 0) continue;
          const ocx = r2.left + r2.width / 2;
          const ocy = r2.top + r2.height / 2;
          const dist = Math.hypot(ccx - ocx, ccy - ocy);
          // Generous radius — about 0.6 of the average body radius
          const maxDist = (rect.width + r2.width) * 0.42;
          if (dist < maxDist) {
            routedSlug = other.slug;
            break;
          }
        }
      }
      // V3.3 — external channels (long-form, bites, kofi) now open a card panel
      // just like planets do. The card has a single "Visit" CTA, or for Ko-fi
      // two CTAs (browse downloads + drop a tip). Previously they navigated
      // straight to a new tab — that pulled visitors out of the cosmos before
      // they understood what each one is.
      openSlug(routedSlug);
    });
  }

  cardClose.addEventListener('click', () => { markInteraction(); closeCard(); });

  // Phase A — copy-link share button. The deep-link state is already kept in
  // the URL (?planet=<slug>&zoom=&pan=), so window.location.href is the
  // canonical "this view" URL. We just need a one-click copy affordance.
  if (cardShare) {
    cardShare.addEventListener('click', async () => {
      markInteraction();
      const url = window.location.href;
      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          copied = true;
        }
      } catch (_) { /* fall through to fallback */ }
      if (!copied) {
        // Fallback for non-secure contexts (older browsers / file:// dev).
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { copied = document.execCommand('copy'); } catch (_) { /* */ }
        document.body.removeChild(ta);
      }
      cardShare.dataset.copied = copied ? 'true' : 'error';
      const labelEl = cardShare.querySelector('.card-share__label') as HTMLElement | null;
      const originalLabel = labelEl?.textContent ?? 'copy link';
      if (labelEl) labelEl.textContent = copied ? 'copied ✓' : 'copy failed';
      window.setTimeout(() => {
        delete cardShare.dataset.copied;
        if (labelEl) labelEl.textContent = originalLabel;
      }, 1800);
    });
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && focusedSlug) {
      e.preventDefault();
      markInteraction();
      closeCard();
      return;
    }
    // V2.1 #4 — keyboard 1–6 focus a planet (atlas order); 0 focuses MCP star.
    // Skip if the user is typing into a field.
    const ae = document.activeElement as HTMLElement | null;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      const planet = data.planets[idx];
      if (planet) {
        e.preventDefault();
        markInteraction();
        openSlug(planet.slug);
      }
    } else if (e.key === '0') {
      e.preventDefault();
      markInteraction();
      openSlug(data.mcp.slug);
    }
  });

  toggleList.addEventListener('click', () => {
    listViewActive = !listViewActive;
    toggleList.setAttribute('aria-pressed', String(listViewActive));
    document.body.classList.toggle('list-view', listViewActive);
    document.documentElement.classList.toggle('list-view', listViewActive);
    if (listViewActive) {
      if (focusedSlug) closeCard();
      // Release any in-flight drag/pinch + reset cursor state so handlers don't
      // hold the page hostage while user is reading the list.
      activePointers.clear();
      pinchStartDist = 0;
      dragging = false;
      cursorActive = false;
      cursorX = -9999;
      cursorY = -9999;
      window.scrollTo({ top: 0, behavior: 'auto' });
      toggleList.textContent = '🌌 Cosmos view';
      toggleList.setAttribute('aria-label', 'Tap to return to the interactive cosmos');
    } else {
      toggleList.textContent = '📋 List view';
      toggleList.setAttribute('aria-label', 'Tap to read the planet list view');
    }
  });

  // V3.4.1 — view-mode toggle removed (only topdown exists). syncViewToggle
  // kept as a no-op so existing call sites don't break.
  function syncViewToggle(): void { /* no-op: topdown is the only view */ }
  syncViewToggle();

  // P1 #11 — track cursor for magnetism + reset on leave.
  root.addEventListener('pointermove', (e: PointerEvent) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
    cursorActive = true;
    markInteraction();
  });
  root.addEventListener('pointerleave', () => {
    cursorActive = false;
    cursorX = -9999;
    cursorY = -9999;
  });

  // P1 #10 — wheel zoom (clamped) + click-drag pan + drag-up/down rotates orbital tilt.
  root.addEventListener('wheel', (e: WheelEvent) => {
    if (listViewActive) return; // let the page scroll naturally
    if (focusedSlug) return; // don't fight the focus glide
    e.preventDefault();
    markInteraction();
    const factor = Math.exp(-e.deltaY * 0.0018);
    userZoomMul = clamp(userZoomMul * factor, ZOOM_MIN, ZOOM_MAX);
    scheduleUrlWrite();
  }, { passive: false });

  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartPanX = 0;
  let dragStartPanY = 0;
  let dragStartTilt = currentTilt;
  let dragMoved = false;
  // Pinch tracking for touch zoom.
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  root.addEventListener('pointerdown', (e: PointerEvent) => {
    if (listViewActive) return; // let the page scroll naturally
    const target = e.target as HTMLElement;
    // V3.x — click-outside-to-close. If a card is open and the user taps any
    // empty canvas area (not the card panel, not a planet body, not HUD chrome,
    // not the first-visit coach), close the card. Sush asked for this — the
    // close button alone meant dismissing felt fiddly, especially on mobile.
    if (focusedSlug && !target.closest('.card-panel, .planet-body, .hud-tools, .hud-mast, .hud-attribution, .hud-aux, .lens-pill, .audience-filter, .cosmos-coach, .cosmos-shortcuts')) {
      markInteraction();
      closeCard();
      return;
    }
    // Ignore clicks on planet bodies — those have their own click handlers.
    // V3.6 — also ignore clicks on the first-visit coach. Without this,
    // root.setPointerCapture() stole click events from coach buttons (next,
    // back, skip) so they never advanced. Found by Sush in V3.5.
    // Phase A — also ignore .hud-aux (replay-coach + open-shortcuts buttons)
    // and .cosmos-shortcuts modal. Without this, root pointer-capture stole
    // their clicks the same way it stole coach clicks. Caught by qa-audit
    // Phase A checks.
    if (target.closest('.planet-body, .card-panel, .hud-tools, .hud-mast, .hud-aux, .lens-pill, .audience-filter, .cosmos-coach, .cosmos-shortcuts')) return;
    markInteraction();
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 1) {
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartPanX = userPanX;
      dragStartPanY = userPanY;
      dragStartTilt = currentTilt;
      dragMoved = false;
      root.setPointerCapture(e.pointerId);
      // Phase B — sun reveal: if the user lands their pointer near the
      // invisible Sun and stays still for 1s, we trigger the one-shot
      // reveal flare + tooltip. Drag still works in parallel — any
      // movement >6px cancels the pending hold.
      maybeStartSunHold(e.clientX, e.clientY);
    } else if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      pinchStartDist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      pinchStartZoom = userZoomMul;
      dragging = false;
    }
  });
  root.addEventListener('pointermove', (e: PointerEvent) => {
    if (listViewActive) return;
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      if (pinchStartDist > 0) {
        userZoomMul = clamp(pinchStartZoom * (dist / pinchStartDist), ZOOM_MIN, ZOOM_MAX);
      }
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
    // Phase B — cancel pending sun-reveal hold the moment the pointer moves
    // >6px from where it started. Keeps drag and reveal mutually exclusive.
    if (sunHoldStartXY !== null) {
      const moved = Math.hypot(e.clientX - sunHoldStartXY.x, e.clientY - sunHoldStartXY.y);
      if (moved > 6) cancelSunHold();
    }
    // Shift+drag rotates orbital tilt; plain drag pans.
    if (e.shiftKey) {
      const tiltDelta = -dy * 0.004;
      setTilt(clamp(dragStartTilt + tiltDelta, TILT_MIN, TILT_MAX));
    } else {
      userPanX = dragStartPanX + dx / cameraZoom;
      userPanY = dragStartPanY + dy / cameraZoom;
      clampUserPan();
    }
  });
  function endPointer(e: PointerEvent): void {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) {
      pinchStartDist = 0;
    }
    if (activePointers.size === 0) {
      dragging = false;
      try { root.releasePointerCapture(e.pointerId); } catch (_) { /* */ }
    }
    // Phase B — any pointer up cancels a pending sun hold (must hold the
    // pointer for the full 1s without releasing).
    cancelSunHold();
    // Persist final pan/zoom into the URL after the gesture settles.
    scheduleUrlWrite();
  }
  root.addEventListener('pointerup', endPointer);
  root.addEventListener('pointercancel', endPointer);

  // V3.4 — Search overlay opened with '/'. Type to filter all bodies (planets,
  // moons, externals, MCP). Enter or click selects → opens that body's card.
  // Esc closes. Keyboard arrow nav for power users.
  const searchOverlay = document.createElement('div');
  searchOverlay.className = 'cosmos-search';
  searchOverlay.setAttribute('role', 'dialog');
  searchOverlay.setAttribute('aria-label', 'Search bodies');
  searchOverlay.dataset.open = 'false';
  searchOverlay.innerHTML = `
    <div class="cosmos-search__panel">
      <input type="text" class="cosmos-search__input" placeholder="Search planets, moons, channels…" aria-label="Search" />
      <ul class="cosmos-search__list" role="listbox"></ul>
      <div class="cosmos-search__hint">Esc · close · ↑↓ · navigate · ⏎ · open</div>
    </div>
  `;
  document.body.appendChild(searchOverlay);
  const searchInput = searchOverlay.querySelector('.cosmos-search__input') as HTMLInputElement;
  const searchList = searchOverlay.querySelector('.cosmos-search__list') as HTMLUListElement;
  type SearchEntry = { slug: string; name: string; kind: string };
  const searchEntries: SearchEntry[] = [];
  for (const p of data.planets) {
    searchEntries.push({ slug: p.slug, name: p.tagline ? `${p.slug} — ${p.tagline}` : p.slug, kind: 'planet' });
    for (const m of p.moons ?? []) {
      searchEntries.push({ slug: m.slug, name: m.name ?? m.slug, kind: 'moon' });
    }
  }
  searchEntries.push({ slug: data.mcp.slug, name: data.mcp.name ?? 'MCP', kind: 'star' });
  for (const c of externalChannels) {
    searchEntries.push({ slug: c.slug, name: c.name, kind: 'external' });
  }
  let searchSelection = 0;
  function renderSearchList(filter: string): void {
    const f = filter.trim().toLowerCase();
    const matches = f ? searchEntries.filter((e) => e.slug.includes(f) || e.name.toLowerCase().includes(f)) : searchEntries;
    searchList.innerHTML = '';
    matches.forEach((e, i) => {
      const li = document.createElement('li');
      li.className = 'cosmos-search__item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === searchSelection));
      li.dataset.slug = e.slug;
      li.innerHTML = `<span>${e.name}</span><span class="cosmos-search__item-kind">${e.kind}</span>`;
      li.addEventListener('click', () => {
        closeSearch();
        openSlug(e.slug);
      });
      searchList.appendChild(li);
    });
  }
  function openSearch(): void {
    searchOverlay.dataset.open = 'true';
    searchInput.value = '';
    searchSelection = 0;
    renderSearchList('');
    searchInput.focus();
  }
  function closeSearch(): void {
    searchOverlay.dataset.open = 'false';
    searchInput.blur();
  }
  searchInput.addEventListener('input', () => {
    searchSelection = 0;
    renderSearchList(searchInput.value);
  });
  searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
    const items = Array.from(searchList.querySelectorAll('.cosmos-search__item')) as HTMLLIElement[];
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchSelection = Math.min(searchSelection + 1, items.length - 1);
      items.forEach((el, i) => el.setAttribute('aria-selected', String(i === searchSelection)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchSelection = Math.max(searchSelection - 1, 0);
      items.forEach((el, i) => el.setAttribute('aria-selected', String(i === searchSelection)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = items[searchSelection];
      const slug = sel?.dataset.slug;
      if (slug) {
        closeSearch();
        openSlug(slug);
      }
    }
  });
  searchOverlay.addEventListener('click', (e: MouseEvent) => {
    if (e.target === searchOverlay) closeSearch();
  });
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Phase D — open search via "/" OR Cmd/Ctrl-K (industry-standard
    // command palette shortcut). Any of the three triggers the same
    // overlay, so it's familiar across muscle-memory styles.
    const isSlash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
    const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
    if (!isSlash && !isCmdK) return;
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    openSearch();
  });

  // Phase A — shortcuts modal. Linear-style overlay shown on `?` key OR when
  // the corner ⓘ/? buttons are clicked. Mirrors the cosmos-search overlay
  // pattern: dynamic creation, dialog role, Esc + click-outside to close.
  const shortcutsOverlay = document.createElement('div');
  shortcutsOverlay.className = 'cosmos-shortcuts';
  shortcutsOverlay.setAttribute('role', 'dialog');
  shortcutsOverlay.setAttribute('aria-label', 'Keyboard shortcuts');
  shortcutsOverlay.dataset.open = 'false';
  shortcutsOverlay.innerHTML = `
    <div class="cosmos-shortcuts__panel">
      <header class="cosmos-shortcuts__head">
        <h2 class="cosmos-shortcuts__title">Keyboard shortcuts</h2>
        <button type="button" class="cosmos-shortcuts__close" aria-label="Close">×</button>
      </header>
      <div class="cosmos-shortcuts__body">
        <section>
          <h3>Navigate</h3>
          <ul>
            <li><kbd>1</kbd>–<kbd>9</kbd><span>focus a planet</span></li>
            <li><kbd>0</kbd><span>focus the MCP star</span></li>
            <li><kbd>Esc</kbd><span>close card</span></li>
          </ul>
        </section>
        <section>
          <h3>View</h3>
          <ul>
            <li><kbd>drag</kbd><span>pan the cosmos</span></li>
            <li><kbd>⇧</kbd>+<kbd>drag</kbd><span>tilt the orbital plane</span></li>
            <li><kbd>wheel</kbd><span>zoom in / out</span></li>
            <li><kbd>R</kbd><span>reset zoom + pan</span></li>
          </ul>
        </section>
        <section>
          <h3>Search &amp; help</h3>
          <ul>
            <li><kbd>/</kbd> · <kbd>⌘</kbd>+<kbd>K</kbd><span>open search</span></li>
            <li><kbd>?</kbd><span>this menu</span></li>
          </ul>
        </section>
      </div>
      <footer class="cosmos-shortcuts__foot">Esc to close</footer>
    </div>
  `;
  document.body.appendChild(shortcutsOverlay);
  const shortcutsClose = shortcutsOverlay.querySelector('.cosmos-shortcuts__close') as HTMLButtonElement;
  function openShortcuts(): void {
    shortcutsOverlay.dataset.open = 'true';
    shortcutsClose.focus();
  }
  function closeShortcuts(): void {
    shortcutsOverlay.dataset.open = 'false';
  }
  shortcutsClose.addEventListener('click', closeShortcuts);
  shortcutsOverlay.addEventListener('click', (e: MouseEvent) => {
    if (e.target === shortcutsOverlay) closeShortcuts();
  });
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (shortcutsOverlay.dataset.open === 'true' && e.key === 'Escape') {
      e.preventDefault();
      closeShortcuts();
      return;
    }
    if (e.key !== '?') return;
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    openShortcuts();
  });
  // Wire the corner ? button (also shown next to ⓘ replay button).
  const openShortcutsBtn = document.getElementById('open-shortcuts') as HTMLButtonElement | null;
  openShortcutsBtn?.addEventListener('click', () => { markInteraction(); openShortcuts(); });

  // Phase D — audience filter pills. Multi-select; OR semantics; clears
  // the dim when nothing selected. Bodies are tagged with their primary
  // audience via the same AUDIENCE_MAP used by the audience LENS in Phase C.
  const audienceFilterRoot = document.getElementById('audience-filter') as HTMLElement | null;
  const audienceFilterClear = document.getElementById('audience-filter-clear') as HTMLButtonElement | null;
  const activeAudiences = new Set<string>();
  function applyAudienceFilter(): void {
    const anyActive = activeAudiences.size > 0;
    if (audienceFilterClear) audienceFilterClear.hidden = !anyActive;
    for (const b of bodies) {
      const audience = AUDIENCE_MAP[b.slug];
      const matches = !anyActive || (audience !== undefined && activeAudiences.has(audience));
      if (matches) {
        delete b.el.dataset.audienceDim;
      } else {
        b.el.dataset.audienceDim = 'true';
      }
    }
  }
  if (audienceFilterRoot) {
    const pills = audienceFilterRoot.querySelectorAll<HTMLButtonElement>('.audience-filter__pill');
    pills.forEach((p) => {
      p.addEventListener('click', () => {
        markInteraction();
        const aud = p.dataset.audience;
        if (!aud) return;
        if (activeAudiences.has(aud)) activeAudiences.delete(aud);
        else activeAudiences.add(aud);
        p.setAttribute('aria-pressed', String(activeAudiences.has(aud)));
        applyAudienceFilter();
      });
    });
    audienceFilterClear?.addEventListener('click', () => {
      markInteraction();
      activeAudiences.clear();
      pills.forEach((p) => p.setAttribute('aria-pressed', 'false'));
      applyAudienceFilter();
    });
  }

  // Phase D — tour mode. 35-second auto-flythrough of the 7 main bodies.
  // openSlug() is called for each stop in turn with 5s per stop. User
  // interrupts: Esc, manual click on a different body, or clicking the
  // tour button again (which becomes a "stop" while active).
  const TOUR_STOPS: string[] = ['earth', 'brainbar', 'plainai', 'shift', 'agentic', 'claw', data.mcp.slug];
  const TOUR_PER_STOP_MS = 5000;
  let tourActive = false;
  let tourIndex = 0;
  let tourTimer: number | null = null;
  const startTourBtn = document.getElementById('start-tour') as HTMLButtonElement | null;
  function advanceTour(): void {
    if (!tourActive) return;
    if (tourIndex >= TOUR_STOPS.length) {
      stopTour(true);
      return;
    }
    const slug = TOUR_STOPS[tourIndex];
    if (slug) openSlug(slug);
    tourTimer = window.setTimeout(() => {
      tourIndex++;
      advanceTour();
    }, TOUR_PER_STOP_MS);
  }
  function startTour(): void {
    if (tourActive) return;
    tourActive = true;
    document.body.dataset.tour = 'active';
    if (startTourBtn) {
      startTourBtn.textContent = '■';
      startTourBtn.setAttribute('aria-label', 'Stop the cosmos tour');
      startTourBtn.title = 'Stop the tour';
    }
    tourIndex = 0;
    advanceTour();
  }
  function stopTour(naturalEnd = false): void {
    if (!tourActive) return;
    tourActive = false;
    delete document.body.dataset.tour;
    if (tourTimer !== null) { window.clearTimeout(tourTimer); tourTimer = null; }
    if (startTourBtn) {
      startTourBtn.textContent = '▶';
      startTourBtn.setAttribute('aria-label', 'Start the cosmos tour');
      startTourBtn.title = 'Watch the cosmos (35s tour)';
    }
    if (focusedSlug && naturalEnd) closeCard();
  }
  startTourBtn?.addEventListener('click', () => {
    markInteraction();
    if (tourActive) stopTour(false);
    else startTour();
  });
  // Esc cancels tour without closing-then-reopening cards weirdly.
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && tourActive) {
      stopTour(false);
    }
  });

  // Reset zoom + pan with key 'r' for keyboard users.
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'r' || e.key === 'R') {
      if (document.activeElement && (document.activeElement as HTMLElement).tagName === 'INPUT') return;
      markInteraction();
      userPanX = 0;
      userPanY = 0;
      userZoomMul = 1;
      // V3.4 — R no longer changes view mode; it just resets zoom + pan.
      // Previous behaviour forced 'cosmos' which fights user view preference.
      syncViewToggle();
      scheduleUrlWrite();
    }
  });

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize, { passive: true });

  resize();
  bodiesRoot.style.opacity = '0';

  // P0 #1 — Mobile renders the cosmos. No auto-fallback.
  // The list view is always available via the HUD button for users who prefer it,
  // but the cosmos must work on phones — that's where most of Plain AI's audience is.

  // V3 #7 — Mobile gesture hint. Show on first mobile visit only.
  // Auto-dismiss after 3.6s OR on first user interaction (touch/click/scroll).
  const gestureHintEl = document.getElementById('gesture-hint') as HTMLElement | null;
  const gestureHintKey = 'cosmosGestureHint.v1';
  function maybeShowGestureHint(): void {
    if (!gestureHintEl) return;
    if (window.innerWidth >= 720) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let alreadySeen = false;
    try { alreadySeen = !!window.localStorage.getItem(gestureHintKey); } catch (_) { /* */ }
    if (alreadySeen) return;
    if (listViewActive) return;
    const showAt = introActive ? INTRO_DURATION_MS + 320 : 480;
    window.setTimeout(() => {
      if (!gestureHintEl || listViewActive || focusedSlug) return;
      gestureHintEl.dataset.visible = 'true';
      gestureHintEl.setAttribute('aria-hidden', 'false');
      const dismiss = (): void => {
        if (!gestureHintEl) return;
        gestureHintEl.dataset.visible = 'false';
        gestureHintEl.setAttribute('aria-hidden', 'true');
        try { window.localStorage.setItem(gestureHintKey, '1'); } catch (_) { /* */ }
        gestureHintEl.removeEventListener('click', dismiss);
        document.removeEventListener('touchstart', firstTouch, true);
      };
      const firstTouch = (): void => { dismiss(); };
      gestureHintEl.addEventListener('click', dismiss);
      document.addEventListener('touchstart', firstTouch, { capture: true, once: true });
      window.setTimeout(dismiss, 3600);
    }, showAt);
  }
  maybeShowGestureHint();

  // V3.5 — Lede + Earth first-touch pulse + first-visit coach.
  // Coach is the boss: if it's going to show (no localStorage flag), the
  // lede is removed so they don't compete. Returning visitors see only the
  // lede, briefly, then nothing. First-time visitors see only the coach.
  // Both honour prefers-reduced-motion.
  const COACH_FLAG = 'cosmosCoachSeen';
  let coachWillShow = false;
  try {
    coachWillShow = !window.localStorage.getItem(COACH_FLAG) && !reducedMotion;
  } catch (_) {
    // No storage access — fall back to "show lede, skip coach" for safety.
    coachWillShow = false;
  }

  // Earth first-touch pulse: activate now (cleared by markInteraction).
  if (!reducedMotion) {
    const earthBody = bodiesRoot.querySelector('.planet-body[data-slug="earth"]') as HTMLElement | null;
    if (earthBody) {
      earthBody.dataset.firstPulse = 'true';
      earthFirstPulseActive = true;
    }
  }

  // Lede: shown only when the coach is NOT going to. Auto-fade at ~6.5s.
  const ledeEl = document.getElementById('cosmos-lede') as HTMLElement | null;
  if (ledeEl) {
    if (coachWillShow) {
      ledeEl.remove();
    } else {
      window.setTimeout(() => { ledeEl.dataset.visible = 'true'; }, 240);
      window.setTimeout(() => { ledeEl.dataset.visible = 'false'; }, 6500);
      window.setTimeout(() => { ledeEl.remove(); }, 7300);
    }
  }

  // First-visit coach: 3 steps with skip + back + next.
  // Phase A — added replay-coach button: clicking ⓘ in the HUD re-runs the
  // coach (clears the seen-flag and re-mounts). Returning visitors finally
  // have a way back to the orientation tour.
  const coachEl = document.getElementById('cosmos-coach') as HTMLElement | null;
  const coachSkipBtn = document.getElementById('coach-skip') as HTMLButtonElement | null;
  const coachBackBtn = document.getElementById('coach-back') as HTMLButtonElement | null;
  const coachNextBtn = document.getElementById('coach-next') as HTMLButtonElement | null;
  const replayCoachBtn = document.getElementById('replay-coach') as HTMLButtonElement | null;

  // Phase B — this-week ribbon. Auto-derived from atlas data: every body
  // whose lastShippedAt is within the last 7 days appears in the ribbon,
  // newest first, capped at 4 with "+N more" overflow. If nothing's fresh,
  // remove the element entirely (no apologetic "nothing this week"). Fades
  // in shortly after mount; sits below the lede slot.
  const thisWeekRibbon = document.getElementById('this-week-ribbon') as HTMLElement | null;
  if (thisWeekRibbon) {
    const SEVEN_DAYS_MS = 7 * 86_400_000;
    const recent: Array<{ name: string; ageMs: number }> = [];
    const nowMs = Date.now();
    const tryAdd = (name: string | undefined, iso: string | undefined): void => {
      if (!name || !iso) return;
      const t = Date.parse(iso);
      if (!Number.isFinite(t)) return;
      const ageMs = nowMs - t;
      if (ageMs < 0 || ageMs > SEVEN_DAYS_MS) return;
      recent.push({ name, ageMs });
    };
    for (const p of data.planets) {
      tryAdd(p.name, p.lastShippedAt);
      for (const m of (p.moons ?? [])) tryAdd(m.name, m.lastShippedAt);
    }
    tryAdd(data.mcp.name ?? 'MCP Relay', (data.mcp as unknown as Card).lastShippedAt);
    if (recent.length === 0) {
      thisWeekRibbon.remove();
    } else {
      recent.sort((a, b) => a.ageMs - b.ageMs);
      const named = recent.slice(0, 4).map((r) => r.name);
      const overflow = recent.length > 4 ? ` +${recent.length - 4} more` : '';
      const namesHtml = named.map((n) => `<span class="this-week-ribbon__name">${escapeHtml(n)}</span>`).join('<span class="this-week-ribbon__sep" aria-hidden="true">·</span>');
      thisWeekRibbon.innerHTML = `<span class="this-week-ribbon__label">this week</span><span class="this-week-ribbon__divider" aria-hidden="true"></span>${namesHtml}${overflow ? `<span class="this-week-ribbon__overflow">${escapeHtml(overflow)}</span>` : ''}`;
      window.setTimeout(() => { thisWeekRibbon.dataset.visible = 'true'; }, 1400);
    }
  }

  // Wave 1 (V5) — welcome-back bloom. Returning visitors gently notice what's
  // shipped since their last visit. localStorage.cosmosLastVisit holds the
  // ISO timestamp of the previous visit. Bodies with lastShippedAt strictly
  // after that timestamp get data-bloom="1" for ~6s on a small stagger.
  // First-time visitors see nothing (no localStorage value) — we just record
  // "now" so future visits can compare. URL ?lastVisit=<isoDate> overrides
  // the stored value (used by the QA suite to verify the bloom works).
  (function welcomeBackBloom(): void {
    if (reducedMotion) return;
    const url = new URL(window.location.href);
    const urlOverride = url.searchParams.get('lastVisit');
    let lastVisitIso: string | null = urlOverride ?? null;
    if (!lastVisitIso) {
      try { lastVisitIso = window.localStorage.getItem('cosmosLastVisit'); }
      catch { lastVisitIso = null; }
    }
    const writeNow = (): void => {
      try { window.localStorage.setItem('cosmosLastVisit', new Date().toISOString()); }
      catch { /* private mode etc. — silent */ }
    };
    if (!lastVisitIso) { writeNow(); return; }
    const lastVisitMs = Date.parse(lastVisitIso);
    if (!Number.isFinite(lastVisitMs)) { writeNow(); return; }
    const fresh: Array<{ slug: string; ageMs: number }> = [];
    const consider = (slug: string | undefined, iso: string | undefined): void => {
      if (!slug || !iso) return;
      const t = Date.parse(iso);
      if (!Number.isFinite(t)) return;
      if (t <= lastVisitMs) return;
      fresh.push({ slug, ageMs: Date.now() - t });
    };
    for (const p of data.planets) {
      consider(p.slug, p.lastShippedAt);
      for (const m of (p.moons ?? [])) consider(m.slug, m.lastShippedAt);
    }
    if (fresh.length === 0) { writeNow(); return; }
    fresh.sort((a, b) => a.ageMs - b.ageMs);
    fresh.forEach((f, i) => {
      const el = bodiesRoot!.querySelector<HTMLElement>(`.planet-body[data-slug="${f.slug}"]`);
      if (!el) return;
      window.setTimeout(() => {
        el.dataset.bloom = '1';
        window.setTimeout(() => { delete el.dataset.bloom; }, 6000);
      }, 1600 + i * 220);
    });
    window.setTimeout(writeNow, 8200);
  })();

  function bindCoachInteractions(el: HTMLElement): void {
    const skipBtn = el.querySelector('#coach-skip') as HTMLButtonElement | null;
    const backBtn = el.querySelector('#coach-back') as HTMLButtonElement | null;
    const nextBtn = el.querySelector('#coach-next') as HTMLButtonElement | null;
    const setStep = (n: number): void => {
      const clamped = Math.max(0, Math.min(2, n));
      el.dataset.step = String(clamped);
      if (backBtn) backBtn.style.visibility = clamped === 0 ? 'hidden' : 'visible';
      if (nextBtn) nextBtn.textContent = clamped === 2 ? 'done' : 'next →';
    };
    const dismiss = (): void => {
      el.dataset.visible = 'false';
      try { window.localStorage.setItem(COACH_FLAG, '1'); } catch (_) { /* noop */ }
      window.setTimeout(() => { el.remove(); }, 600);
    };
    setStep(0);
    window.setTimeout(() => { el.dataset.visible = 'true'; }, 60);
    skipBtn?.addEventListener('click', dismiss);
    backBtn?.addEventListener('click', () => {
      const cur = parseInt(el.dataset.step ?? '0', 10);
      setStep(cur - 1);
    });
    nextBtn?.addEventListener('click', () => {
      const cur = parseInt(el.dataset.step ?? '0', 10);
      if (cur >= 2) dismiss();
      else setStep(cur + 1);
    });
  }

  if (coachEl) {
    if (!coachWillShow) {
      coachEl.remove();
    } else {
      const setStep = (n: number): void => {
        const clamped = Math.max(0, Math.min(2, n));
        coachEl.dataset.step = String(clamped);
        if (coachBackBtn) coachBackBtn.style.visibility = clamped === 0 ? 'hidden' : 'visible';
        if (coachNextBtn) coachNextBtn.textContent = clamped === 2 ? 'done' : 'next →';
      };
      const dismiss = (): void => {
        coachEl.dataset.visible = 'false';
        try { window.localStorage.setItem(COACH_FLAG, '1'); } catch (_) { /* noop */ }
        window.setTimeout(() => { coachEl.remove(); }, 600);
      };
      setStep(0);
      window.setTimeout(() => { coachEl.dataset.visible = 'true'; }, 1200);
      coachSkipBtn?.addEventListener('click', dismiss);
      coachBackBtn?.addEventListener('click', () => {
        const cur = parseInt(coachEl.dataset.step ?? '0', 10);
        setStep(cur - 1);
      });
      coachNextBtn?.addEventListener('click', () => {
        const cur = parseInt(coachEl.dataset.step ?? '0', 10);
        if (cur >= 2) dismiss();
        else setStep(cur + 1);
      });
    }
  }

  // Phase A — replay-coach button. Always available, even after the first
  // visit. Clicking re-mounts the same coach markup we removed (or hid) so
  // returning visitors can re-orient any time.
  replayCoachBtn?.addEventListener('click', () => {
    markInteraction();
    try { window.localStorage.removeItem(COACH_FLAG); } catch (_) { /* noop */ }
    const existing = document.getElementById('cosmos-coach') as HTMLElement | null;
    const fresh = document.createElement('div');
    fresh.className = 'cosmos-coach';
    fresh.id = 'cosmos-coach';
    fresh.dataset.step = '0';
    fresh.dataset.visible = 'false';
    fresh.setAttribute('role', 'dialog');
    fresh.setAttribute('aria-labelledby', 'coach-title-0');
    fresh.setAttribute('aria-modal', 'false');
    fresh.innerHTML = `
      <button class="cosmos-coach__skip" id="coach-skip" type="button" aria-label="Skip the intro">Skip</button>
      <div class="cosmos-coach__step cosmos-coach__step--0">
        <span class="cosmos-coach__title" id="coach-title-0">a quick tour · 1 of 3</span>
        <p class="cosmos-coach__body">this is the cosmos — a living map of <strong>A Guide to Cloud</strong>. each planet is a different audience.</p>
      </div>
      <div class="cosmos-coach__step cosmos-coach__step--1">
        <span class="cosmos-coach__title" id="coach-title-1">the source · 2 of 3</span>
        <p class="cosmos-coach__body">the glow at the centre is the <strong>Sun</strong> — the AI co-founder. invisible by design.</p>
      </div>
      <div class="cosmos-coach__step cosmos-coach__step--2">
        <span class="cosmos-coach__title" id="coach-title-2">how to roam · 3 of 3</span>
        <p class="cosmos-coach__body"><strong>Earth</strong> is the home. tap it to start. drag to pan · wheel to zoom · tap any planet.</p>
      </div>
      <div class="cosmos-coach__nav">
        <span class="cosmos-coach__dots" aria-hidden="true">
          <span class="cosmos-coach__dot"></span>
          <span class="cosmos-coach__dot"></span>
          <span class="cosmos-coach__dot"></span>
        </span>
        <button class="cosmos-coach__btn" id="coach-back" type="button">← back</button>
        <button class="cosmos-coach__btn cosmos-coach__btn--primary" id="coach-next" type="button">next →</button>
      </div>
    `;
    if (existing) existing.replaceWith(fresh);
    else {
      const hud = document.querySelector('.hud') as HTMLElement | null;
      hud?.appendChild(fresh);
    }
    bindCoachInteractions(fresh);
  });

  // Phase C — lens pill wiring. Toggle the menu open/closed; click an
  // option to call setLens(). Mirror the persisted localStorage value into
  // the UI so a refresh keeps the user's chosen lens.
  const lensPill = document.getElementById('lens-pill') as HTMLElement | null;
  const lensPillToggle = document.getElementById('lens-pill-toggle') as HTMLButtonElement | null;
  if (lensPill && lensPillToggle) {
    document.body.dataset.lens = currentLens;
    lensPill.dataset.lens = currentLens;
    const lensIcon: Record<Lens, string> = {
      cosmos: '🪐', constellation: '🌟', timeline: '📅', audience: '👥',
    };
    const lensLabel: Record<Lens, string> = {
      cosmos: 'Cosmos', constellation: 'Constellation', timeline: 'Timeline', audience: 'Audience',
    };
    function syncLensPill(): void {
      if (!lensPill || !lensPillToggle) return;
      lensPill.dataset.lens = currentLens;
      const iconEl = lensPillToggle.querySelector('.lens-pill__icon') as HTMLElement | null;
      const labelEl = lensPillToggle.querySelector('.lens-pill__label') as HTMLElement | null;
      if (iconEl) iconEl.textContent = lensIcon[currentLens];
      if (labelEl) labelEl.textContent = lensLabel[currentLens];
      // Mark the chosen option as current.
      const options = lensPill.querySelectorAll<HTMLButtonElement>('.lens-pill__option');
      options.forEach((opt) => {
        opt.dataset.current = opt.dataset.lens === currentLens ? 'true' : 'false';
      });
        // Update the lens-legend caption to match.
        const legendLabel = document.getElementById('lens-legend-label') as HTMLElement | null;
        const legendSub = document.getElementById('lens-legend-sub') as HTMLElement | null;
        const subText: Record<Lens, string> = {
          cosmos: 'solar system',
          constellation: 'relationships',
          timeline: 'by ship date',
          audience: 'by who it\'s for',
        };
        if (legendLabel) legendLabel.textContent = lensLabel[currentLens].toLowerCase();
        if (legendSub) legendSub.textContent = subText[currentLens];
      }
    syncLensPill();
    lensPillToggle.addEventListener('click', () => {
      markInteraction();
      const open = lensPill.dataset.open === 'true';
      lensPill.dataset.open = open ? 'false' : 'true';
      lensPillToggle.setAttribute('aria-expanded', String(!open));
    });
    const lensOptions = lensPill.querySelectorAll<HTMLButtonElement>('.lens-pill__option');
    lensOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        markInteraction();
        const name = opt.dataset.lens as Lens | undefined;
        if (!name) return;
        setLens(name);
        syncLensPill();
        lensPill.dataset.open = 'false';
        lensPillToggle.setAttribute('aria-expanded', 'false');
      });
    });
    // Click-outside to close the menu (uses pointerdown to align with
    // existing root pointer-capture; .lens-pill is added to ignore lists).
    document.addEventListener('click', (e: MouseEvent) => {
      if (!lensPill || lensPill.dataset.open !== 'true') return;
      const target = e.target as HTMLElement;
      if (!target.closest('.lens-pill')) {
        lensPill.dataset.open = 'false';
        lensPillToggle.setAttribute('aria-expanded', 'false');
      }
    });
    // If we restored a non-cosmos lens from localStorage, kick off a
    // transition to it on mount so the bodies fly into position.
    if (currentLens !== 'cosmos') {
      // Use a slight delay so the intro can settle first.
      window.setTimeout(() => {
        const restored = currentLens;
        currentLens = 'cosmos'; // reset so setLens() snapshots from cosmos
        setLens(restored);
        syncLensPill();
      }, introActive ? INTRO_DURATION_MS + 240 : 320);
    }
  }

  requestAnimationFrame((now) => {
    lastFrame = now;
    updateBodyPositions();
    applyBodyTransforms(introActive ? 0 : 1);
    bodiesRoot.style.transition = 'opacity 480ms ease-out';
    bodiesRoot.style.opacity = '1';
    if (introActive) {
      // Mark intro as seen 100ms after it completes so a refresh during intro doesn't skip.
      window.setTimeout(() => {
        try { window.localStorage.setItem(introSkipKey, '1'); } catch (_) { /* */ }
      }, INTRO_DURATION_MS + 200);
    }
    // V3 #6 — If ?planet=<slug> in URL, open the matching card after intro settles.
    if (initialPlanetParam) {
      const validSlug = planetBySlug.has(initialPlanetParam)
        || moonBySlug.has(initialPlanetParam)
        || initialPlanetParam === data.mcp.slug;
      if (validSlug) {
        const openDelay = introActive ? INTRO_DURATION_MS + 220 : 380;
        window.setTimeout(() => {
          // listViewActive cancels the auto-open (user may have toggled list view fast).
          if (!listViewActive && !focusedSlug) openSlug(initialPlanetParam);
        }, openDelay);
      }
    }
    // Sync the initial view toggle (URL view= param may have overridden stored mode).
    syncViewToggle();
    requestAnimationFrame(frame);
  });
}

function withAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('rgba')) return hex;
  if (hex.startsWith('rgb(')) return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
