// Cosmos Atlas — canvas controller
// The bold, lively, interactive heart of the atlas.
// Honours prefers-reduced-motion, keyboard nav, mobile layout.

interface OrbitPlanet { radius: number; ecc: number; tilt: number; speedSec: number; phase: number }
interface OrbitMoon { radius: number; speedSec: number; phase?: number }
interface Body { size: number; glowCore: string; glowOuter: string }

interface Card {
  slug: string; name: string; url: string;
  type: string; atmosphere: string; status: string;
  badge?: string; tagline: string;
  audience: string; content: string; founder: string;
}

interface Moon extends Card { orbit: OrbitMoon; body: Body }
interface Planet extends Card { orbit: OrbitPlanet; body: Body; moons?: Moon[] }

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
}

interface McpEndpoint { slug: string; name: string; url: string; status: string }
interface McpStar { slug: string; name: string; url: string; type: string; atmosphere: string; status: string;
  tagline: string; audience: string; content: string; founder: string;
  endpoints: McpEndpoint[]; starfield: { x: number; y: number; size: number; twinkleSec: number }[] }

interface DecorativeStar { x: number; y: number; size: number; alpha: number }

interface CosmosData {
  atmosphere: AtmosphereTokens;
  sun: Sun;
  planets: Planet[];
  mcp: McpStar;
  decorativeStars: DecorativeStar[];
}

interface PositionedBody {
  kind: 'planet' | 'moon' | 'mcp-star';
  slug: string;
  parentSlug?: string;
  x: number;
  y: number;
  size: number;
  glowCore: string;
  glowOuter: string;
  alpha: number;
  ref: Planet | Moon | McpStar;
  hitR: number;
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

  if (!root || !canvas || !cardPanel || !cardBody || !cardClose || !planetLabel || !toggleList) {
    console.warn('[cosmos] Missing required DOM nodes; static fallback remains visible.');
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    console.warn('[cosmos] Canvas 2D unavailable; static fallback remains visible.');
    return;
  }

  // Mark JS ready — static fallback hides via CSS
  root.dataset.js = 'ready';
  canvas.removeAttribute('aria-hidden');
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'Cosmos Atlas — a living solar system. Use Tab to cycle through planets, Enter to open a planet card, Escape to close.');
  canvas.setAttribute('tabindex', '0');

  // ───── State ─────
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cw = window.innerWidth;
  let ch = window.innerHeight;
  let cx = cw / 2;
  let cy = ch / 2;
  let scaleFactor = 1;          // ratio applied to orbit radii based on viewport
  let mobileMode = false;

  let mouseX = -9999;
  let mouseY = -9999;
  let mouseInside = false;

  let hoveredSlug: string | null = null;
  let focusedSlug: string | null = null;
  let lastFocusBeforeOpen: HTMLElement | null = null;
  let focusKeyboardIndex = -1;       // index in keyboardOrder when navigating via Tab
  let listViewActive = false;

  // Smooth camera. In overview: target = origin (0,0). In focused: target = focused planet's local position.
  let cameraTargetX = 0;
  let cameraTargetY = 0;
  let cameraTargetScale = 1;
  let cameraX = 0;
  let cameraY = 0;
  let cameraScale = 1;

  let startTime = performance.now();
  let lastFrame = startTime;

  // Slugs in tab order (innermost first)
  const keyboardOrder: string[] = [];
  for (const p of data.planets) {
    keyboardOrder.push(p.slug);
    for (const moon of p.moons ?? []) keyboardOrder.push(moon.slug);
  }
  keyboardOrder.push(data.mcp.slug);

  // Quick lookup for a body by slug
  const planetBySlug = new Map<string, Planet>();
  const moonBySlug = new Map<string, { moon: Moon; parent: Planet }>();
  for (const p of data.planets) {
    planetBySlug.set(p.slug, p);
    for (const moon of p.moons ?? []) moonBySlug.set(moon.slug, { moon, parent: p });
  }

  // ───── Sizing / DPR ─────
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

    // Compute scale factor so the outermost orbit fits with comfortable margin
    const outermost = Math.max(...data.planets.map((p) => p.orbit.radius));
    const margin = mobileMode ? 28 : 80;
    const desiredHalfMin = Math.min(cw, ch) / 2 - margin;
    scaleFactor = desiredHalfMin / outermost;
    if (scaleFactor > 1) scaleFactor = 1;

    mobileMode = cw < 720;
    if (mobileMode) scaleFactor = Math.min(scaleFactor, 0.85);
  }

  // ───── Orbit math ─────
  function planetPosition(p: Planet, t: number): { x: number; y: number } {
    const angle = reducedMotion
      ? p.orbit.phase * DEG
      : (t / p.orbit.speedSec) * TWO_PI + p.orbit.phase * DEG;
    const r = p.orbit.radius * scaleFactor;
    const xr = r * Math.cos(angle);
    const yr = r * Math.sin(angle) * (1 - p.orbit.ecc);
    const tilt = p.orbit.tilt * DEG;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    return {
      x: xr * cosT - yr * sinT,
      y: xr * sinT + yr * cosT,
    };
  }

  function moonPosition(parentX: number, parentY: number, m: Moon, t: number): { x: number; y: number } {
    const phase = (m.orbit.phase ?? 0) * DEG;
    const angle = reducedMotion ? phase : (t / m.orbit.speedSec) * TWO_PI + phase;
    const r = m.orbit.radius * scaleFactor;
    return {
      x: parentX + r * Math.cos(angle),
      y: parentY + r * Math.sin(angle),
    };
  }

  // ───── Drawing ─────
  function clear(): void {
    ctx.clearRect(0, 0, cw, ch);
  }

  function drawStarfield(): void {
    // Slight twinkle on the small decorative stars; static under prefers-reduced-motion
    const t = (performance.now() - startTime) / 1000;
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

  function drawMcpStars(): void {
    const t = (performance.now() - startTime) / 1000;
    for (const s of data.mcp.starfield) {
      const x = s.x * cw;
      const y = s.y * ch;
      const twinkle = reducedMotion ? 0.8 : 0.55 + 0.45 * Math.abs(Math.sin(t * (TWO_PI / s.twinkleSec)));
      ctx.fillStyle = data.atmosphere.accentSoft;
      ctx.globalAlpha = 0.7 * twinkle;
      ctx.beginPath();
      ctx.arc(x, y, s.size + 0.2, 0, TWO_PI);
      ctx.fill();
      // Soft halo
      const grad = ctx.createRadialGradient(x, y, 0, x, y, s.size * 5);
      grad.addColorStop(0, withAlpha(data.atmosphere.accentSoft, 0.45 * twinkle));
      grad.addColorStop(1, withAlpha(data.atmosphere.accentSoft, 0));
      ctx.fillStyle = grad;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, s.size * 5, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSun(): void {
    const t = (performance.now() - startTime) / 1000;
    const pulse = reducedMotion ? 0.85 : 0.78 + 0.22 * Math.abs(Math.sin(t * (TWO_PI / data.sun.pulseSec)));
    const x = cx + cameraX;
    const y = cy + cameraY;
    const r = data.sun.size * cameraScale;
    // Outer halo
    const haloR = r * 6;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    halo.addColorStop(0, withAlpha(data.sun.glowOuter, 0.5 * pulse));
    halo.addColorStop(0.45, withAlpha(data.sun.glowOuter, 0.18 * pulse));
    halo.addColorStop(1, withAlpha(data.sun.glowOuter, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, TWO_PI);
    ctx.fill();
    // Core
    const core = ctx.createRadialGradient(x, y, 0, x, y, r * 1.4);
    core.addColorStop(0, withAlpha(data.sun.glowCore, 0.95 * pulse));
    core.addColorStop(1, withAlpha(data.sun.glowCore, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.4, 0, TWO_PI);
    ctx.fill();
  }

  function drawOrbits(): void {
    ctx.lineWidth = 1;
    for (const p of data.planets) {
      const r = p.orbit.radius * scaleFactor * cameraScale;
      const tilt = p.orbit.tilt * DEG;
      const ecc = p.orbit.ecc;
      const isFocused = focusedSlug === p.slug;
      const isHovered = hoveredSlug === p.slug;
      ctx.save();
      ctx.translate(cx + cameraX, cy + cameraY);
      ctx.rotate(tilt);
      ctx.strokeStyle = isFocused
        ? withAlpha(data.atmosphere.accent, 0.55)
        : isHovered
          ? withAlpha(data.atmosphere.hud, 0.32)
          : withAlpha(data.atmosphere.hud, 0.10);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * (1 - ecc), 0, 0, TWO_PI);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBody(b: PositionedBody): void {
    const x = cx + cameraX + b.x * cameraScale;
    const y = cy + cameraY + b.y * cameraScale;
    const r = b.size * cameraScale;
    const isHovered = hoveredSlug === b.slug;
    const isFocused = focusedSlug === b.slug;
    const dim = focusedSlug !== null && !isFocused;
    const alpha = dim ? 0.32 : 1;
    // Outer glow
    const haloR = r * (isHovered || isFocused ? 4.2 : 3);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    halo.addColorStop(0, withAlpha(b.glowOuter, 0.55 * alpha));
    halo.addColorStop(0.4, withAlpha(b.glowOuter, 0.22 * alpha));
    halo.addColorStop(1, withAlpha(b.glowOuter, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, TWO_PI);
    ctx.fill();
    // Core gradient
    const core = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    core.addColorStop(0, withAlpha(b.glowCore, alpha));
    core.addColorStop(1, withAlpha(b.glowOuter, alpha));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fill();
    // Hover ring
    if (isHovered || isFocused) {
      ctx.strokeStyle = withAlpha(data.atmosphere.accent, isFocused ? 0.95 : 0.75);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.7, 0, TWO_PI);
      ctx.stroke();
    }
    // Update hit metadata for hit-testing
    b.hitR = Math.max(r * 1.7, 18);
  }

  function drawHud(): void {
    // Bottom-left: number of planets
    ctx.fillStyle = withAlpha(data.atmosphere.hudFaint, 1);
    ctx.font = `500 11px ${data.atmosphere.monoFont}`;
    ctx.textBaseline = 'bottom';
    const planetCount = data.planets.length;
    const moonCount = data.planets.reduce((acc, p) => acc + (p.moons?.length ?? 0), 0);
    const txt = `${planetCount} planets · ${moonCount} moons · 1 star`;
    ctx.fillText(txt, 24, ch - 24);
  }

  // ───── Frame loop ─────
  let positioned: PositionedBody[] = [];
  let mcpPositioned: PositionedBody | null = null;

  function buildPositioned(): void {
    const t = (performance.now() - startTime) / 1000;
    positioned = [];
    for (const p of data.planets) {
      const pos = planetPosition(p, t);
      positioned.push({
        kind: 'planet',
        slug: p.slug,
        x: pos.x,
        y: pos.y,
        size: p.body.size,
        glowCore: p.body.glowCore,
        glowOuter: p.body.glowOuter,
        alpha: 1,
        ref: p,
        hitR: p.body.size * 1.7,
      });
      for (const moon of p.moons ?? []) {
        const mpos = moonPosition(pos.x, pos.y, moon, t);
        positioned.push({
          kind: 'moon',
          slug: moon.slug,
          parentSlug: p.slug,
          x: mpos.x,
          y: mpos.y,
          size: moon.body.size,
          glowCore: moon.body.glowCore,
          glowOuter: moon.body.glowOuter,
          alpha: 1,
          ref: moon,
          hitR: moon.body.size * 1.7,
        });
      }
    }
    // MCP star pinned to a fixed canvas-space spot in the upper area
    mcpPositioned = null;
  }

  function updateCamera(deltaSec: number): void {
    if (focusedSlug) {
      // Target the focused body's position
      const target = positioned.find((b) => b.slug === focusedSlug);
      if (target) {
        cameraTargetX = -target.x * cameraTargetScale;
        cameraTargetY = -target.y * cameraTargetScale;
      }
    } else {
      cameraTargetX = 0;
      cameraTargetY = 0;
      cameraTargetScale = 1;
    }
    const lerp = reducedMotion ? 1 : Math.min(1, deltaSec * 4.5);
    cameraX += (cameraTargetX - cameraX) * lerp;
    cameraY += (cameraTargetY - cameraY) * lerp;
    cameraScale += (cameraTargetScale - cameraScale) * lerp;
  }

  function frame(now: number): void {
    const deltaSec = (now - lastFrame) / 1000;
    lastFrame = now;
    buildPositioned();
    updateCamera(deltaSec);
    clear();
    drawStarfield();
    drawMcpStars();
    drawOrbits();
    drawSun();
    for (const b of positioned) drawBody(b);
    drawHud();
    if (mouseInside) updateHover();
    requestAnimationFrame(frame);
  }

  // ───── Hit testing ─────
  function getBodyAt(px: number, py: number): PositionedBody | null {
    let best: PositionedBody | null = null;
    let bestD = Infinity;
    for (const b of positioned) {
      const bx = cx + cameraX + b.x * cameraScale;
      const by = cy + cameraY + b.y * cameraScale;
      const dx = px - bx;
      const dy = py - by;
      const d = Math.sqrt(dx * dx + dy * dy);
      const hitR = Math.max(b.hitR * cameraScale, 22);
      if (d < hitR && d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  function updateHover(): void {
    const body = getBodyAt(mouseX, mouseY);
    const newSlug = body?.slug ?? null;
    if (newSlug !== hoveredSlug) {
      hoveredSlug = newSlug;
      canvas.style.cursor = body ? 'pointer' : 'default';
      root.dataset.state = body ? 'hovering' : focusedSlug ? 'focused' : 'idle';
    }
    if (body) {
      const ref = body.ref as Card;
      const bx = cx + cameraX + body.x * cameraScale;
      const by = cy + cameraY + body.y * cameraScale;
      planetLabel.style.transform = `translate(${bx}px, ${by - body.size * cameraScale - 8}px) translate(-50%, -100%)`;
      planetLabel.textContent = `${ref.name} · ${ref.tagline}`;
      planetLabel.dataset.visible = 'true';
    } else {
      planetLabel.dataset.visible = 'false';
    }
  }

  // ───── Card render ─────
  function renderPlanetCard(slug: string): void {
    const planet = planetBySlug.get(slug);
    const moonRecord = moonBySlug.get(slug);
    if (planet) {
      cardBody.innerHTML = renderCardHtml(planet, planet.moons ?? []);
    } else if (moonRecord) {
      cardBody.innerHTML = renderCardHtml(moonRecord.moon, []);
    } else if (slug === data.mcp.slug) {
      cardBody.innerHTML = renderMcpCardHtml(data.mcp);
    }
    cardPanel.dataset.open = 'true';
    cardPanel.removeAttribute('aria-hidden');
    // Move focus to card name for screen readers
    const heading = cardBody.querySelector('#card-name') as HTMLElement | null;
    heading?.focus();
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

  function renderCardHtml(card: Card & { moons?: Moon[] }, moons: Moon[]): string {
    const badge = card.badge ? `<span class="card-firewall">${escapeHtml(card.badge)}</span>` : '';
    const moonsHtml = moons.length === 0 ? '' : `
      <div class="card-moons">
        <span class="card-moons-label">Moon${moons.length > 1 ? 's' : ''}</span>
        ${moons.map((m) => `
          <article class="moon">
            ${m.badge ? `<span class="moon-firewall">${escapeHtml(m.badge)}</span>` : ''}
            <h4 class="moon-name">${escapeHtml(m.name)}</h4>
            <p class="moon-tagline">${escapeHtml(m.tagline)}</p>
            <p class="moon-text">${escapeHtml(m.content)}</p>
            <p class="moon-text moon-text--founder">"${escapeHtml(m.founder)}"</p>
            <a class="moon-cta" href="${escapeHtml(m.url)}" rel="noopener">Visit ${escapeHtml(m.name)}</a>
          </article>
        `).join('')}
      </div>
    `;
    return `
      ${badge}
      <div class="card-badges">
        <span class="card-badge card-badge--type">${escapeHtml(card.type)}</span>
        <span class="card-badge">${escapeHtml(card.atmosphere)}</span>
        <span class="card-badge card-badge--status">${escapeHtml(card.status)}</span>
      </div>
      <h2 class="card-name" id="card-name" tabindex="-1">${escapeHtml(card.name)}</h2>
      <p class="card-tagline">${escapeHtml(card.tagline)}</p>
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

  function renderMcpCardHtml(mcp: McpStar): string {
    const endpointsHtml = mcp.endpoints.map((e) => `
      <li>
        <span class="name">${escapeHtml(e.name)}</span>
        <span class="${e.status === 'live' ? 'status-live' : 'status-planned'}">${escapeHtml(e.status)}</span>
      </li>
    `).join('');
    return `
      <div class="card-badges">
        <span class="card-badge card-badge--type">${escapeHtml(mcp.type)}</span>
        <span class="card-badge">${escapeHtml(mcp.atmosphere)}</span>
        <span class="card-badge card-badge--status">${escapeHtml(mcp.status)}</span>
      </div>
      <h2 class="card-name" id="card-name" tabindex="-1">${escapeHtml(mcp.name)}</h2>
      <p class="card-tagline">${escapeHtml(mcp.tagline)}</p>
      <div class="card-section">
        <span class="card-section-label">Who it's for</span>
        <p class="card-section-text">${escapeHtml(mcp.audience)}</p>
      </div>
      <div class="card-section">
        <span class="card-section-label">What it does</span>
        <p class="card-section-text">${escapeHtml(mcp.content)}</p>
      </div>
      <div class="card-section">
        <span class="card-section-label">Founder note</span>
        <p class="card-section-text card-founder">"${escapeHtml(mcp.founder)}"</p>
      </div>
      <div class="card-section">
        <span class="card-section-label">Endpoints</span>
        <ul class="static-mcp-endpoints" role="list">${endpointsHtml}</ul>
      </div>
      <div class="card-cta-row">
        <a class="card-cta" href="${escapeHtml(mcp.url)}" rel="noopener">Visit ${escapeHtml(mcp.name)}</a>
      </div>
    `;
  }

  // ───── Open / close ─────
  function openSlug(slug: string): void {
    if (focusedSlug === slug) return;
    lastFocusBeforeOpen = (document.activeElement as HTMLElement) ?? canvas;
    focusedSlug = slug;
    cameraTargetScale = mobileMode ? 1.4 : 1.8;
    root.dataset.state = 'focused';
    renderPlanetCard(slug);
  }

  function closePlanet(): void {
    if (!focusedSlug) return;
    focusedSlug = null;
    cameraTargetScale = 1;
    cardPanel.dataset.open = 'false';
    cardPanel.setAttribute('aria-hidden', 'true');
    root.dataset.state = hoveredSlug ? 'hovering' : 'idle';
    if (lastFocusBeforeOpen) {
      lastFocusBeforeOpen.focus();
      lastFocusBeforeOpen = null;
    } else {
      canvas.focus();
    }
  }

  // ───── Mouse / touch ─────
  function onPointerMove(e: PointerEvent): void {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseInside = true;
  }
  function onPointerLeave(): void {
    mouseInside = false;
    hoveredSlug = null;
    planetLabel.dataset.visible = 'false';
    canvas.style.cursor = 'default';
  }
  function onClick(e: MouseEvent): void {
    const body = getBodyAt(e.clientX, e.clientY);
    if (body) {
      openSlug(body.slug);
    } else if (focusedSlug) {
      closePlanet();
    }
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('click', onClick);

  // ───── Keyboard nav ─────
  canvas.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusKeyboardIndex = (focusKeyboardIndex + 1) % keyboardOrder.length;
      const slug = keyboardOrder[focusKeyboardIndex];
      if (slug) hoveredSlug = slug;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusKeyboardIndex = (focusKeyboardIndex - 1 + keyboardOrder.length) % keyboardOrder.length;
      const slug = keyboardOrder[focusKeyboardIndex];
      if (slug) hoveredSlug = slug;
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (hoveredSlug) {
        e.preventDefault();
        openSlug(hoveredSlug);
      }
    } else if (e.key === 'Escape') {
      if (focusedSlug) {
        e.preventDefault();
        closePlanet();
      }
    }
  });

  cardClose.addEventListener('click', () => closePlanet());

  // Click outside the card panel (on canvas) to close
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && focusedSlug) {
      closePlanet();
    }
  });

  // ───── List view toggle ─────
  toggleList.addEventListener('click', () => {
    listViewActive = !listViewActive;
    toggleList.setAttribute('aria-pressed', String(listViewActive));
    document.body.classList.toggle('list-view', listViewActive);
    if (listViewActive) {
      // Close any open card so the list shows cleanly
      if (focusedSlug) closePlanet();
      window.scrollTo({ top: 0, behavior: 'auto' });
      toggleList.textContent = '🌌 Cosmos view';
      toggleList.setAttribute('aria-label', 'Tap to return to the interactive cosmos');
    } else {
      toggleList.textContent = '📋 List view';
      toggleList.setAttribute('aria-label', 'Tap to read the planet list view');
    }
  });

  // ───── Resize ─────
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize, { passive: true });

  // ───── Boot ─────
  resize();
  buildPositioned();
  requestAnimationFrame(frame);
}

// Helper — convert hex (#RRGGBB) to rgba string with alpha
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
