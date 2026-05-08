// Cosmos Atlas — canvas controller (v2: 3D tilted view + HTML body overlays)
// HTML divs render the SVG planet logos (crisp at any size).
// Canvas renders: starfield, decorative stars, orbit ellipses (3D-projected),
//                 sun glow, body halos under each planet.
// Pointer events live on the body divs, not on the canvas.
// Honours prefers-reduced-motion, keyboard nav, mobile layout.

interface OrbitPlanet { radius: number; ecc: number; tilt: number; speedSec: number; phase: number }
interface OrbitMoon { radius: number; speedSec: number; phase?: number }
interface BodyVisuals { size: number; glowCore: string; glowOuter: string }

interface Card {
  slug: string; name: string; url: string;
  type: string; atmosphere: string; status: string;
  badge?: string; tagline: string;
  audience: string; content: string; founder: string;
  stats?: string[];
}

interface Moon extends Card { orbit: OrbitMoon; body: BodyVisuals }
interface Planet extends Card { orbit: OrbitPlanet; body: BodyVisuals; moons?: Moon[] }

interface Sun {
  label: string; subLabel: string; tooltip: string;
  glowCore: string; glowOuter: string; size: number; pulseSec: number;
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
interface McpStar {
  slug: string; name: string; url: string; type: string; atmosphere: string; status: string;
  tagline: string; audience: string; content: string; founder: string;
  stats?: string[]; anchor?: McpAnchor;
  endpoints: McpEndpoint[]; starfield: { x: number; y: number; size: number; twinkleSec: number }[];
}

interface DecorativeStar { x: number; y: number; size: number; alpha: number }

interface CosmosData {
  atmosphere: AtmosphereTokens;
  sun: Sun;
  planets: Planet[];
  mcp: McpStar;
  decorativeStars: DecorativeStar[];
}

interface BodyState {
  el: HTMLButtonElement;
  kind: 'planet' | 'moon' | 'star';
  slug: string;
  parentSlug?: string;
  ref: Planet | Moon | McpStar;
  screenX: number;
  screenY: number;
  scale: number;
  depth: number;
  intrinsicSize: number;
  glowCore: string;
  glowOuter: string;
}

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

  const TILT = (data.atmosphere.tilt ?? 38) * DEG;
  const FOCAL = data.atmosphere.focal ?? 900;
  const cosTilt = Math.cos(TILT);
  const sinTilt = Math.sin(TILT);

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
        screenX: 0, screenY: 0, scale: 1, depth: 0,
        intrinsicSize: ref.body.size,
        glowCore: ref.body.glowCore,
        glowOuter: ref.body.glowOuter,
      });
    } else if (kind === 'moon') {
      const rec = moonBySlug.get(slug);
      if (!rec) continue;
      bodies.push({
        el: btn, kind, slug, parentSlug: btn.dataset.parent, ref: rec.moon,
        screenX: 0, screenY: 0, scale: 1, depth: 0,
        intrinsicSize: rec.moon.body.size,
        glowCore: rec.moon.body.glowCore,
        glowOuter: rec.moon.body.glowOuter,
      });
    } else if (kind === 'star') {
      const anchor = data.mcp.anchor;
      bodies.push({
        el: btn, kind, slug: data.mcp.slug, ref: data.mcp,
        screenX: 0, screenY: 0, scale: 1, depth: 0,
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

  let hoveredSlug: string | null = null;
  let focusedSlug: string | null = null;
  let lastFocusBeforeOpen: HTMLElement | null = null;
  let listViewActive = false;

  let cameraTargetX = 0;
  let cameraTargetY = 0;
  let cameraTargetZoom = 1;
  let cameraX = 0;
  let cameraY = 0;
  let cameraZoom = 1;

  const startTime = performance.now();
  let lastFrame = startTime;

  // Simulation time for orbits — pauses while user is interacting (hover or card open)
  // so clicks aren't fiddly. Twinkles and sun pulse keep running on raw realT.
  let simT = 0;
  let lastSimSampleRealT = 0;

  function getRealT(): number { return (performance.now() - startTime) / 1000; }

  function updateSimTime(): void {
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
    const margin = mobileMode ? 50 : 110;
    const desiredVHalf = (ch / 2 - margin) / cosTilt;
    const desiredHHalf = (cw / 2 - margin);
    scaleFactor = Math.min(desiredHHalf / outermost, desiredVHalf / outermost, 1);
    if (mobileMode) scaleFactor = Math.min(scaleFactor, 0.92);
  }

  function project(xp: number, yp: number): { x: number; y: number; scale: number; depth: number } {
    const yRot = yp * cosTilt;
    const zRot = yp * sinTilt;
    const scale = FOCAL / (FOCAL + zRot);
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

  function drawStarfield(): void {
    const t = getRealT();
    for (const s of data.decorativeStars) {
      const x = s.x * cw;
      const y = s.y * ch;
      const twinkle = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(t * 0.6 + s.x * 17 + s.y * 23);
      ctx.fillStyle = data.atmosphere.hud;
      ctx.globalAlpha = s.alpha * twinkle * 0.55;
      ctx.beginPath();
      ctx.arc(x, y, s.size, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMcpStarfield(): void {
    const t = getRealT();
    for (const s of data.mcp.starfield) {
      const x = s.x * cw;
      const y = s.y * ch;
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

  function drawSun(): void {
    const t = getRealT();
    const pulse = reducedMotion ? 0.85 : 0.78 + 0.22 * Math.abs(Math.sin(t * (TWO_PI / data.sun.pulseSec)));
    const x = cx + cameraX * cameraZoom;
    const y = cy + cameraY * cameraZoom;
    const r = data.sun.size * cameraZoom;
    const haloR = r * 5;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    halo.addColorStop(0, withAlpha(data.sun.glowOuter, 0.42 * pulse));
    halo.addColorStop(0.4, withAlpha(data.sun.glowOuter, 0.12 * pulse));
    halo.addColorStop(1, withAlpha(data.sun.glowOuter, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, TWO_PI);
    ctx.fill();
    const core = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    core.addColorStop(0, withAlpha(data.sun.glowCore, pulse));
    core.addColorStop(1, withAlpha(data.sun.glowCore, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, TWO_PI);
    ctx.fill();
  }

  function drawOrbits(): void {
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
      ctx.strokeStyle = isFocused
        ? withAlpha(data.atmosphere.accent, 0.6)
        : isHovered
          ? withAlpha(data.atmosphere.hud, 0.36)
          : withAlpha(data.atmosphere.hud, dim ? 0.04 : 0.12);
      ctx.beginPath();
      for (let i = 0; i <= SAMPLES; i++) {
        const a = (i / SAMPLES) * TWO_PI;
        const xp0 = r * Math.cos(a);
        const yp0 = r * Math.sin(a) * (1 - p.orbit.ecc);
        const xp = xp0 * cosT2 - yp0 * sinT2;
        const yp = xp0 * sinT2 + yp0 * cosT2;
        const proj = project(xp, yp);
        const xs = cx + (proj.x + cameraX) * cameraZoom;
        const ys = cy + (proj.y + cameraY) * cameraZoom;
        if (i === 0) ctx.moveTo(xs, ys);
        else ctx.lineTo(xs, ys);
      }
      ctx.stroke();
    }
  }

  function drawBodyHalo(b: BodyState): void {
    const isHovered = hoveredSlug === b.slug;
    const isFocused = focusedSlug === b.slug;
    const dim = (focusedSlug !== null && !isFocused) || (hoveredSlug !== null && !isHovered);
    const alpha = dim ? 0.28 : 1;
    const r = b.intrinsicSize * b.scale * cameraZoom;
    // Tighter halo radius — was 4.4 / 3.0, now 3.2 / 2.2 to reduce bleed between planets.
    // Star gets a slightly smaller halo so it doesn't compete with neighbouring planets.
    const baseMult = b.kind === 'star' ? 1.8 : 2.2;
    const hotMult = b.kind === 'star' ? 2.6 : 3.2;
    const haloR = r * (isHovered || isFocused ? hotMult : baseMult);
    const x = b.screenX;
    const y = b.screenY;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    halo.addColorStop(0, withAlpha(b.glowOuter, 0.55 * alpha));
    halo.addColorStop(0.4, withAlpha(b.glowOuter, 0.20 * alpha));
    halo.addColorStop(1, withAlpha(b.glowOuter, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, TWO_PI);
    ctx.fill();
    if (isHovered || isFocused) {
      ctx.strokeStyle = withAlpha(data.atmosphere.accent, isFocused ? 0.95 : 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, TWO_PI);
      ctx.stroke();
    }
  }

  function drawHud(): void {
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
        b.screenX = cx + (proj.x + cameraX) * cameraZoom;
        b.screenY = cy + (proj.y + cameraY) * cameraZoom;
        b.scale = proj.scale;
        b.depth = proj.depth;
      } else if (b.kind === 'moon' && b.parentSlug) {
        const parentOP = planetOP.get(b.parentSlug);
        if (!parentOP) continue;
        const moon = b.ref as Moon;
        const op = moonOrbitPos(parentOP.x, parentOP.y, moon, t);
        const proj = project(op.x, op.y);
        b.screenX = cx + (proj.x + cameraX) * cameraZoom;
        b.screenY = cy + (proj.y + cameraY) * cameraZoom;
        b.scale = proj.scale;
        b.depth = proj.depth;
      } else if (b.kind === 'star') {
        const anchor = data.mcp.anchor;
        b.screenX = (anchor?.x ?? 0.86) * cw;
        b.screenY = (anchor?.y ?? 0.18) * ch;
        b.scale = 1;
        b.depth = -800;
      }
    }
  }

  function applyBodyTransforms(): void {
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
      const opacity = dim ? 0.42 : 1;
      b.el.style.transform = `translate3d(${b.screenX}px, ${b.screenY}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      b.el.style.opacity = String(opacity);
      b.el.style.zIndex = String(100 + i);
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
          cameraTargetX = -op.x;
          cameraTargetY = -op.y * cosTilt;
        } else if (target.kind === 'moon' && target.parentSlug) {
          const parent = planetBySlug.get(target.parentSlug);
          if (parent) {
            const parentOP = planetOrbitPos(parent, t);
            const op = moonOrbitPos(parentOP.x, parentOP.y, target.ref as Moon, t);
            cameraTargetX = -op.x;
            cameraTargetY = -op.y * cosTilt;
          }
        } else if (target.kind === 'star') {
          cameraTargetX = 0;
          cameraTargetY = 0;
        }
        cameraTargetZoom = mobileMode ? 1.5 : 1.85;
      }
    } else {
      cameraTargetX = 0;
      cameraTargetY = 0;
      cameraTargetZoom = 1;
    }
    const lerp = reducedMotion ? 1 : Math.min(1, deltaSec * 4.5);
    cameraX += (cameraTargetX - cameraX) * lerp;
    cameraY += (cameraTargetY - cameraY) * lerp;
    cameraZoom += (cameraTargetZoom - cameraZoom) * lerp;
  }

  function frame(now: number): void {
    const deltaSec = (now - lastFrame) / 1000;
    lastFrame = now;
    updateSimTime();
    updateCamera(deltaSec);
    updateBodyPositions();
    applyBodyTransforms();
    clear();
    drawStarfield();
    drawMcpStarfield();
    drawOrbits();
    drawSun();
    const sorted = [...bodies].sort((a, b) => a.depth - b.depth);
    for (const b of sorted) drawBodyHalo(b);
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
    return `
      ${badge}
      <div class="card-hero" style="--card-glow: ${heroGlow};">
        <div class="card-hero-icon">${iconHtml}</div>
        <div class="card-hero-text">
          <div class="card-badges">
            <span class="card-badge card-badge--type">${escapeHtml(card.type)}</span>
            <span class="card-badge">${escapeHtml(card.atmosphere)}</span>
            <span class="card-badge card-badge--status">${escapeHtml(card.status)}</span>
          </div>
          <h2 class="card-name" id="card-name" tabindex="-1">${escapeHtml(card.name)}</h2>
          <p class="card-tagline">${escapeHtml(card.tagline)}</p>
        </div>
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
    renderCard(slug);
  }

  function closeCard(): void {
    if (!focusedSlug) return;
    focusedSlug = null;
    cardPanel.dataset.open = 'false';
    cardPanel.setAttribute('aria-hidden', 'true');
    root.dataset.state = hoveredSlug ? 'hovering' : 'idle';
    if (lastFocusBeforeOpen && document.body.contains(lastFocusBeforeOpen)) {
      lastFocusBeforeOpen.focus();
    }
    lastFocusBeforeOpen = null;
  }

  for (const b of bodies) {
    b.el.addEventListener('mouseenter', () => {
      hoveredSlug = b.slug;
      root.dataset.state = focusedSlug ? 'focused' : 'hovering';
      updateHoverLabel();
    });
    b.el.addEventListener('mouseleave', () => {
      if (hoveredSlug === b.slug) hoveredSlug = null;
      root.dataset.state = focusedSlug ? 'focused' : 'idle';
      updateHoverLabel();
    });
    b.el.addEventListener('focus', () => {
      hoveredSlug = b.slug;
      root.dataset.state = focusedSlug ? 'focused' : 'hovering';
      updateHoverLabel();
    });
    b.el.addEventListener('blur', () => {
      if (hoveredSlug === b.slug) hoveredSlug = null;
      updateHoverLabel();
    });
    b.el.addEventListener('click', (e) => {
      e.preventDefault();
      openSlug(b.slug);
    });
  }

  cardClose.addEventListener('click', () => closeCard());

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && focusedSlug) {
      e.preventDefault();
      closeCard();
    }
  });

  toggleList.addEventListener('click', () => {
    listViewActive = !listViewActive;
    toggleList.setAttribute('aria-pressed', String(listViewActive));
    document.body.classList.toggle('list-view', listViewActive);
    if (listViewActive) {
      if (focusedSlug) closeCard();
      window.scrollTo({ top: 0, behavior: 'auto' });
      toggleList.textContent = '🌌 Cosmos view';
      toggleList.setAttribute('aria-label', 'Tap to return to the interactive cosmos');
    } else {
      toggleList.textContent = '📋 List view';
      toggleList.setAttribute('aria-label', 'Tap to read the planet list view');
    }
  });

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize, { passive: true });

  resize();
  bodiesRoot.style.opacity = '0';

  // Auto-fall back to list view on small mobile portrait — the canvas is too cramped
  // for 6 planets + 2 moons + 1 star. List view is the honest fallback per cosmos-philosophy.
  // Users can manually switch back to the cosmos via the HUD button.
  if (window.innerWidth < 600) {
    toggleList.click();
  }

  requestAnimationFrame((now) => {
    lastFrame = now;
    updateBodyPositions();
    applyBodyTransforms();
    bodiesRoot.style.transition = 'opacity 480ms ease-out';
    bodiesRoot.style.opacity = '1';
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
