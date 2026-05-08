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
  lastShippedAt?: string;   // ISO date — used for freshness pulse
  connectsTo?: string[];    // slugs of related bodies — drawn as constellation lines on focus
}

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
}

interface BodyState {
  el: HTMLButtonElement;
  kind: 'planet' | 'moon' | 'star';
  slug: string;
  parentSlug?: string;
  ref: Planet | Moon | McpStar;
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
  const TILT_MAX = 58 * DEG;
  const COSMOS_TILT_RAD = (data.atmosphere.tilt ?? 30) * DEG;

  // V2.2 — view mode: 'cosmos' (tilted) ↔ 'topdown' (overhead). Tilt lerps to target.
  const viewModeKey = 'cosmosViewMode.v1';
  const storedMode = window.localStorage.getItem(viewModeKey);
  let viewMode: 'cosmos' | 'topdown' = storedMode === 'topdown' ? 'topdown' : 'cosmos';
  let targetTiltRad = viewMode === 'topdown' ? 0 : COSMOS_TILT_RAD;
  if (viewMode === 'topdown') setTilt(0);
  function applyViewMode(mode: 'cosmos' | 'topdown', persist = true): void {
    viewMode = mode;
    targetTiltRad = mode === 'topdown' ? 0 : COSMOS_TILT_RAD;
    if (persist) {
      try { window.localStorage.setItem(viewModeKey, mode); } catch (_) { /* */ }
    }
    document.body.dataset.viewMode = mode;
    scheduleUrlWrite();
  }
  document.body.dataset.viewMode = viewMode;

  const planetBySlug = new Map<string, Planet>();
  const moonBySlug = new Map<string, { moon: Moon; parent: Planet }>();
  for (const p of data.planets) {
    planetBySlug.set(p.slug, p);
    for (const m of p.moons ?? []) moonBySlug.set(m.slug, { moon: m, parent: p });
  }

  const bodies: BodyState[] = [];
  const bodyButtons = bodiesRoot.querySelectorAll<HTMLButtonElement>('.planet-body');
  for (const btn of Array.from(bodyButtons)) {
    const slug = btn.dataset.slug ?? '';
    const kind = btn.dataset.kind as 'planet' | 'moon' | 'star';
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
  let userZoomMul = 1;
  const ZOOM_MIN = 0.55;
  const ZOOM_MAX = 2.4;

  // V3 #6 — Shareable URL state. Parse known params on init; write back on changes (debounced).
  // ?planet=earth · ?zoom=1.6 · ?pan=120,40 · ?view=cosmos|topdown
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
  }
  if (initialViewParam === 'cosmos' || initialViewParam === 'topdown') {
    // override stored mode without persisting (URL wins per visit)
    viewMode = initialViewParam;
    targetTiltRad = viewMode === 'topdown' ? 0 : COSMOS_TILT_RAD;
    if (viewMode === 'topdown') setTilt(0);
    document.body.dataset.viewMode = viewMode;
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
        if (viewMode === 'topdown') qs.set('view', 'topdown'); else qs.delete('view');
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
  }

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
    // Mobile gets gentler depth compression so inner planets don't cluster.
    FOCAL = narrowMode ? FOCAL_NARROW : FOCAL_DESKTOP;
    // Tighter margins on phones so the outermost orbit still fits.
    const margin = narrowMode ? 22 : mobileMode ? 36 : 110;
    const desiredVHalf = (ch / 2 - margin) / cosTilt;
    const desiredHHalf = (cw / 2 - margin);
    scaleFactor = Math.min(desiredHHalf / outermost, desiredVHalf / outermost, 1);
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
    const r = m.orbit.radius * scaleFactor;
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
  function drawParallaxStars(): void {
    const t = getRealT();
    for (const s of parallaxStars) {
      const driftSec = reducedMotion ? 0 : (s.driftPxPerSec * t);
      let xs = (s.x * cw + driftSec) % cw;
      if (xs < 0) xs += cw;
      const ys = s.y * ch;
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
  function drawSun(introSun: number): void {
    if (introSun <= 0) return;
    const t = getRealT();
    const pulse = reducedMotion ? 0.85 : 0.78 + 0.22 * Math.abs(Math.sin(t * (TWO_PI / data.sun.pulseSec)));
    const igniteEase = introSun * introSun * (3 - 2 * introSun); // smoothstep
    const x = cx + cameraX * cameraZoom;
    const y = cy + cameraY * cameraZoom;
    const r = data.sun.size * cameraZoom * (0.7 + 0.3 * igniteEase);
    const haloR = r * 5.4;
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

  // P0 #3 — MCP star light rays to LIVE endpoints. Animated dashed lines.
  function drawMcpRays(introBodies: number): void {
    if (introBodies <= 0) return;
    const t = getRealT();
    const star = bodies.find((b) => b.kind === 'star');
    if (!star) return;
    const isMcpFocused = focusedSlug === data.mcp.slug;
    const isMcpHovered = hoveredSlug === data.mcp.slug;
    // Map endpoint slug → planet slug. Endpoint 'brainbar-mcp' → planet 'brainbar' etc.
    const slugMap: Record<string, string> = {
      'brainbar-mcp': 'brainbar',
      'agentic-mcp': 'agentic',
      'earth-mcp': 'earth',
      'plainai-mcp': 'plainai',
      'shift-mcp': 'shift',
      'claw-mcp': 'claw',
    };
    for (const ep of data.mcp.endpoints) {
      if (ep.status !== 'live') continue;
      const targetSlug = slugMap[ep.slug];
      if (!targetSlug) continue;
      const target = bodies.find((b) => b.slug === targetSlug);
      if (!target) continue;
      const baseAlpha = isMcpFocused ? 0.55 : isMcpHovered ? 0.40 : 0.18;
      const alpha = baseAlpha * introBodies;
      const grad = ctx.createLinearGradient(star.screenX, star.screenY, target.screenX, target.screenY);
      grad.addColorStop(0, withAlpha(data.mcp.anchor?.glowCore ?? '#FFD89A', alpha));
      grad.addColorStop(1, withAlpha(target.glowOuter, alpha * 0.5));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 9]);
      ctx.lineDashOffset = -t * 22;
      ctx.beginPath();
      ctx.moveTo(star.screenX, star.screenY);
      ctx.lineTo(target.screenX, target.screenY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
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

  function drawBodyHalo(b: BodyState, introBodies: number): void {
    if (introBodies <= 0) return;
    const isHovered = hoveredSlug === b.slug;
    const isFocused = focusedSlug === b.slug;
    const dim = (focusedSlug !== null && !isFocused) || (hoveredSlug !== null && !isHovered);
    const alpha = (dim ? 0.28 : 1) * introBodies;
    const r = b.intrinsicSize * b.scale * cameraZoom;
    // V2.3 — MCP star gets a much bigger halo than planets so it reads as a star, not a body.
    const baseMult = b.kind === 'star' ? 4.4 : 2.2;
    const hotMult = b.kind === 'star' ? 6.0 : 3.2;
    const haloR = r * (isHovered || isFocused ? hotMult : baseMult);
    const x = b.screenX;
    const y = b.screenY;
    // V2.3 — MCP star always pulses (not gated on hover) so it draws the eye.
    let starPulseMul = 1;
    if (b.kind === 'star' && !reducedMotion) {
      const t = getRealT();
      starPulseMul = 0.85 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.4));
    }
    const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    halo.addColorStop(0, withAlpha(b.glowOuter, 0.55 * alpha * starPulseMul));
    halo.addColorStop(0.4, withAlpha(b.glowOuter, 0.20 * alpha * starPulseMul));
    halo.addColorStop(1, withAlpha(b.glowOuter, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, TWO_PI);
    ctx.fill();
    // P1 #4 — soft atmospheric ring just outside the body, in its own glow colour.
    // Reads as "this body has an atmosphere", without obscuring the brand logo.
    if (!dim && b.kind !== 'star') {
      ctx.strokeStyle = withAlpha(b.glowOuter, 0.35 * alpha);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.05, 0, TWO_PI);
      ctx.stroke();
    }
    // V2.3 — MCP star: always-on second halo ring so it reads as a beacon, not a planet.
    if (b.kind === 'star' && !dim) {
      ctx.strokeStyle = withAlpha(b.glowCore, 0.6 * alpha * starPulseMul);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.7, 0, TWO_PI);
      ctx.stroke();
    }
    if (isHovered || isFocused) {
      ctx.strokeStyle = withAlpha(data.atmosphere.accent, isFocused ? 0.95 : 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, TWO_PI);
      ctx.stroke();
    }
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

  // V2.1 #2 — freshness pulse. Subtle pulsing ring around bodies that shipped recently.
  // Different cadence (4.6s) and colour (soft amber) from the focus ring.
  function drawFreshnessPulses(now: number, introBodies: number): void {
    if (introBodies <= 0 || reducedMotion) return;
    const t = now / 1000;
    for (const b of bodies) {
      if (b.kind === 'star') continue;
      const fresh = freshnessFor(b.slug);
      if (fresh <= 0) continue;
      const isHovered = hoveredSlug === b.slug;
      const isFocused = focusedSlug === b.slug;
      const dim = (focusedSlug !== null && !isFocused) || (hoveredSlug !== null && !isHovered);
      if (dim) continue;
      const r = b.intrinsicSize * b.scale * cameraZoom;
      // Pulse oscillates between 1.32× and 1.55× with sin wave; amplitude decays with age.
      const phase = (t / 4.6) * TWO_PI + (b.slug.charCodeAt(0) * 0.13);
      const pulse = 0.5 + 0.5 * Math.sin(phase);
      const ringR = r * (1.32 + pulse * 0.23);
      const baseAlpha = 0.22 + 0.36 * pulse;
      const alpha = baseAlpha * fresh * introBodies;
      ctx.strokeStyle = withAlpha(data.atmosphere.accentSoft, alpha);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(b.screenX, b.screenY, ringR, 0, TWO_PI);
      ctx.stroke();
    }
  }

  // V2.1 #6 — constellation lines from focused body to its connectsTo[] siblings.
  // Faint dashed lines that fade in/out with focus.
  let constellationFade = 0; // 0..1, eased toward target each frame
  function drawConstellationLines(introBodies: number, deltaSec: number): void {
    const target = focusedSlug ? 1 : 0;
    const lerp = reducedMotion ? 1 : Math.min(1, deltaSec * 3.2);
    constellationFade += (target - constellationFade) * lerp;
    if (constellationFade < 0.02 || introBodies <= 0) return;
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
      const baseAlpha = 0.30 * constellationFade * introBodies;
      const grad = ctx.createLinearGradient(focused.screenX, focused.screenY, other.screenX, other.screenY);
      grad.addColorStop(0, withAlpha(focused.glowOuter, baseAlpha));
      grad.addColorStop(0.5, withAlpha(data.atmosphere.accentSoft, baseAlpha * 1.1));
      grad.addColorStop(1, withAlpha(other.glowOuter, baseAlpha));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 7]);
      ctx.lineDashOffset = -t * 14;
      ctx.beginPath();
      ctx.moveTo(focused.screenX, focused.screenY);
      ctx.lineTo(other.screenX, other.screenY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
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
        const pos = data.mcp.position;
        if (pos) {
          const r = pos.rOrbit * scaleFactor;
          const ang = pos.thetaDeg * DEG;
          const xp = r * Math.cos(ang);
          const yp = r * Math.sin(ang);
          const proj = project(xp, yp);
          b.baseScreenX = cx + (proj.x + cameraX) * cameraZoom;
          b.baseScreenY = cy + (proj.y + cameraY) * cameraZoom;
          b.scale = proj.scale;
          b.depth = proj.depth;
        } else {
          const anchor = data.mcp.anchor;
          b.baseScreenX = (anchor?.x ?? 0.86) * cw;
          b.baseScreenY = (anchor?.y ?? 0.18) * ch;
          b.scale = 1;
          b.depth = -800;
        }
      }
      // P1 #11 — cursor magnetism: bodies lean toward cursor within 180px.
      let mx = 0, my = 0;
      if (cursorActive && !reducedMotion && b.kind !== 'star') {
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

  function applyBodyTransforms(introBodies: number): void {
    const sorted = [...bodies].sort((a, b) => a.depth - b.depth);
    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i];
      if (!b) continue;
      const isHovered = hoveredSlug === b.slug;
      const isFocused = focusedSlug === b.slug;
      const dim = (focusedSlug !== null && !isFocused) || (hoveredSlug !== null && !isHovered);
      let scale = b.scale * cameraZoom;
      if (isHovered) scale *= 1.12;
      if (isFocused) scale *= 1.35;
      // P1 #5 — depth-based opacity falloff for stronger 3D feel.
      // Bodies behind the sun (depth > 0) are slightly dimmer + cooler.
      const depthFade = b.kind === 'star' ? 1 : clamp(1 - (b.depth / 1200), 0.55, 1);
      const opacity = (dim ? 0.4 : 1) * depthFade * introBodies;
      // Cool tint on far bodies via filter — suggests atmospheric perspective.
      const cool = b.kind === 'star' ? 0 : clamp((b.depth + 200) / 1400, 0, 0.4);
      b.el.style.transform = `translate3d(${b.screenX}px, ${b.screenY}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      b.el.style.opacity = String(opacity);
      b.el.style.zIndex = String(100 + i);
      b.el.style.filter = cool > 0 ? `saturate(${(1 - cool * 0.4).toFixed(2)}) brightness(${(1 - cool * 0.25).toFixed(2)})` : '';
      b.el.dataset.hovered = isHovered ? 'true' : 'false';
      b.el.dataset.focused = isFocused ? 'true' : 'false';
      b.el.dataset.dim = dim ? 'true' : 'false';
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
      const tiltLerp = reducedMotion ? 1 : Math.min(1, deltaSec * 3.6);
      setTilt(currentTilt + (targetTiltRad - currentTilt) * tiltLerp);
    } else if (currentTilt !== targetTiltRad) {
      setTilt(targetTiltRad);
    }
    updateSimTime();
    updateCamera(deltaSec);
    updateBodyPositions();
    const intro = introProgress(now);
    if (intro.done) introActive = false;
    applyBodyTransforms(intro.bodies);
    clear();
    drawGalacticHorizon();
    drawTopdownGalacticRing();
    drawNebulae();
    drawParallaxStars();
    drawMcpStarfield();
    drawOrbits(intro.orbits);
    drawSun(intro.sun);
    drawSunGodRays(intro.sun);
    drawMcpRays(intro.bodies);
    drawConstellationLines(intro.bodies, deltaSec);
    drawBodyShadows(intro.bodies);
    const sorted = [...bodies].sort((a, b) => a.depth - b.depth);
    for (const b of sorted) drawBodyHalo(b, intro.bodies);
    drawFreshnessPulses(now, intro.bodies);
    drawPings(now);
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

  function getGlowForSlug(slug: string): string {
    if (slug === data.mcp.slug) return data.mcp.anchor?.glowCore ?? '#FFD89A';
    const p = planetBySlug.get(slug);
    if (p) return p.body.glowCore;
    const moonRec = moonBySlug.get(slug);
    if (moonRec) return moonRec.moon.body.glowCore;
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

  function renderCard(slug: string): void {
    if (slug === data.mcp.slug) {
      const mcpAsCard = data.mcp as unknown as Card;
      cardBody.innerHTML = renderCardHtml(mcpAsCard, 'star', []) + renderMcpExtras(data.mcp);
    } else {
      const planet = planetBySlug.get(slug);
      const moonRec = moonBySlug.get(slug);
      if (planet) {
        cardBody.innerHTML = renderCardHtml(planet, 'planet', planet.moons ?? []);
      } else if (moonRec) {
        cardBody.innerHTML = renderCardHtml(moonRec.moon, 'moon', []);
      }
    }
    cardPanel.dataset.open = 'true';
    cardPanel.removeAttribute('aria-hidden');
    const heading = cardBody.querySelector<HTMLElement>('#card-name');
    heading?.focus();
  }

  function openSlug(slug: string): void {
    if (focusedSlug === slug) return;
    lastFocusBeforeOpen = (document.activeElement as HTMLElement) ?? null;
    focusedSlug = slug;
    root.dataset.state = 'focused';
    if (!reducedMotion) {
      warpStartMs = performance.now();
      root.dataset.warp = 'in';
      window.setTimeout(() => {
        if (root.dataset.warp === 'in') delete root.dataset.warp;
      }, WARP_DURATION_MS);
    }
    renderCard(slug);
    scheduleUrlWrite();
  }

  function closeCard(): void {
    if (!focusedSlug) return;
    focusedSlug = null;
    cardPanel.dataset.open = 'false';
    cardPanel.setAttribute('aria-hidden', 'true');
    root.dataset.state = hoveredSlug ? 'hovering' : 'idle';
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
      openSlug(b.slug);
    });
  }

  cardClose.addEventListener('click', () => { markInteraction(); closeCard(); });

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

  // V2.2 — view-mode toggle (cosmos ↔ topdown).
  const viewCosmosBtn = document.getElementById('view-cosmos') as HTMLButtonElement | null;
  const viewTopdownBtn = document.getElementById('view-topdown') as HTMLButtonElement | null;
  function syncViewToggle(): void {
    if (viewCosmosBtn) viewCosmosBtn.setAttribute('aria-pressed', String(viewMode === 'cosmos'));
    if (viewTopdownBtn) viewTopdownBtn.setAttribute('aria-pressed', String(viewMode === 'topdown'));
  }
  syncViewToggle();
  if (viewCosmosBtn) {
    viewCosmosBtn.addEventListener('click', () => {
      markInteraction();
      applyViewMode('cosmos');
      syncViewToggle();
    });
  }
  if (viewTopdownBtn) {
    viewTopdownBtn.addEventListener('click', () => {
      markInteraction();
      applyViewMode('topdown');
      syncViewToggle();
    });
  }

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
    // Ignore clicks on planet bodies — those have their own click handlers.
    if ((e.target as HTMLElement).closest('.planet-body, .card-panel, .hud-tools, .hud-mast')) return;
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
    // Shift+drag rotates orbital tilt; plain drag pans.
    if (e.shiftKey) {
      const tiltDelta = -dy * 0.004;
      setTilt(clamp(dragStartTilt + tiltDelta, TILT_MIN, TILT_MAX));
    } else {
      userPanX = dragStartPanX + dx / cameraZoom;
      userPanY = dragStartPanY + dy / cameraZoom;
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
    // Persist final pan/zoom into the URL after the gesture settles.
    scheduleUrlWrite();
  }
  root.addEventListener('pointerup', endPointer);
  root.addEventListener('pointercancel', endPointer);

  // Reset zoom + pan with key 'r' for keyboard users.
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'r' || e.key === 'R') {
      if (document.activeElement && (document.activeElement as HTMLElement).tagName === 'INPUT') return;
      markInteraction();
      userPanX = 0;
      userPanY = 0;
      userZoomMul = 1;
      applyViewMode('cosmos');
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
