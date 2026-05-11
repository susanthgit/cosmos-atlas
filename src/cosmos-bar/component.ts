/**
 * <cosmos-bar> — the cross-planet web component
 * ════════════════════════════════════════════════════════════════════════════
 * Pure runtime, no framework. Defines the custom element, attaches a shadow
 * root, fetches the slim atlas-bar.json from the cosmos origin, renders 8
 * bodies + the relay + the "open the cosmos" CTA. Active-planet dimming via
 * the `active` attribute. Hover tooltips, freshness dots, mobile sheet.
 *
 *   <cosmos-bar active="shift"></cosmos-bar>
 *   <script async src="https://cosmos.aguidetocloud.com/cosmos-bar.js"></script>
 *
 * Brand discipline: never inherits the host page's theme. Always deep-cosmos
 * black + cream + Space Grotesk. Reduced-motion respected.
 *
 * Touched: 9 May 2026 EVE — initial build (cosmos-bar Phase 1).
 */

import { iconSvg, BAR_BODIES, cosmosCompactSvg } from './icons.js';
import type { BarSlug } from './icons.js';

// __INLINE_STYLES__ is replaced at build time with the FULL-block of styles.css.
declare const __INLINE_STYLES__: string;

const COSMOS_HOST = 'https://cosmos.aguidetocloud.com';
const FRESHNESS_DAYS = 14;

// Live counter endpoint — public CORS *, returns {totalUnique}.
// Lives on Earth's worker (single source of truth for cosmos-wide GA4).
const LIVE_COUNTER_URL = 'https://www.aguidetocloud.com/api/stats?realtime=cosmos';
const LIVE_POLL_INTERVAL_MS = 45_000;
const LIVE_HIDE_AFTER_FAILURES = 3;
// Counter is only meaningful when the cosmos has actual aggregate visitors.
// Hide entirely for totals < this threshold to avoid "🟠 1" loneliness signal
// and intermittent flicker (a single visitor going to a new tab drops total to 0).
const LIVE_MIN_VISIBLE = 2;

interface BarBody {
  slug: BarSlug;
  name: string;
  tagline: string;
  url: string;
  lastShippedAt?: string;
  kind: 'planet' | 'moon' | 'relay';
}

interface AtlasBar {
  bodies: BarBody[];
  generatedAt: string;
}

class CosmosBar extends HTMLElement {
  private root: ShadowRoot;
  private data: AtlasBar | null = null;
  private active: string = '';
  private sheetOpen = false;

  // Live counter state (added 12 May 2026 — Phase A1 of cosmos intelligence).
  // Lifecycle-safe: ONE interval per element lifetime; AbortController per fetch;
  // partial DOM updates (no full re-render); auto-hide after 3 consecutive fails.
  private liveTimer: ReturnType<typeof setInterval> | null = null;
  private liveAbort: AbortController | null = null;
  private liveFailures = 0;
  private liveStarted = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['active'];
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'active') {
      this.active = (value || '').trim().toLowerCase();
      if (this.data) this.render();
    }
  }

  async connectedCallback() {
    this.active = (this.getAttribute('active') || '').trim().toLowerCase();
    // Paint a minimal scaffold immediately (in case fetch is slow).
    this.root.innerHTML = `<style>${__INLINE_STYLES__}</style><div class="bar"><div class="bodies" aria-busy="true"></div></div>`;

    try {
      const data = await this.fetchAtlas();
      this.data = data;
      this.render();
    } catch (err) {
      // Graceful degradation — keep the placeholder strip + a fallback link.
      console.warn('[cosmos-bar] failed to load atlas-bar.json', err);
      this.renderFallback();
    }
  }

  private async fetchAtlas(): Promise<AtlasBar> {
    // Allow host override via data-host attribute (used for local dev / preview).
    // data-host="self" → use window.location.origin
    // data-host="https://staging.example.com" → use that
    // (no attribute) → production COSMOS_HOST
    const hostAttr = (this.getAttribute('data-host') || '').trim();
    let host = COSMOS_HOST;
    if (hostAttr === 'self') host = window.location.origin;
    else if (hostAttr) host = hostAttr.replace(/\/$/, '');
    const url = `${host}/atlas-bar.json`;
    const res = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
    if (!res.ok) throw new Error(`atlas-bar.json HTTP ${res.status}`);
    return (await res.json()) as AtlasBar;
  }

  private isFresh(b: BarBody): boolean {
    if (!b.lastShippedAt) return false;
    const t = Date.parse(b.lastShippedAt);
    if (Number.isNaN(t)) return false;
    const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= FRESHNESS_DAYS;
  }

  private bodyHtml(b: BarBody): string {
    const isActive = b.slug === this.active;
    const fresh = this.isFresh(b);
    const tip = this.escape(b.tagline || b.name);
    const aria = this.escape(`${b.name}${b.tagline ? ' — ' + b.tagline : ''}`);
    return `<a class="body"
        href="${this.escapeUrl(b.url)}"
        data-slug="${this.escape(b.slug)}"
        ${isActive ? 'aria-current="true"' : ''}
        ${fresh ? 'data-fresh="1"' : ''}
        aria-label="${aria}"
        title="">${iconSvg(b.slug as BarSlug, 'bar')}<span class="tip">${tip}</span></a>`;
  }

  private sheetRowHtml(b: BarBody): string {
    const isActive = b.slug === this.active;
    const fresh = this.isFresh(b);
    return `<a class="sheet-row" href="${this.escapeUrl(b.url)}" data-slug="${this.escape(b.slug)}" ${isActive ? 'aria-current="true"' : ''}>
        <span class="icon-slot" ${fresh ? 'data-fresh="1"' : ''}>${iconSvg(b.slug as BarSlug, 'sheet')}</span>
        <span class="text">
          <span class="label">${this.escape(b.name)}</span>
          ${b.tagline ? `<span class="tagline">${this.escape(b.tagline)}</span>` : ''}
        </span>
      </a>`;
  }

  private render() {
    if (!this.data) return;
    const bodies = this.data.bodies.filter((b) => b.kind !== 'relay');
    const relay = this.data.bodies.find((b) => b.kind === 'relay');

    const desktopBodies = bodies.map((b) => this.bodyHtml(b)).join('');
    const sheetRows = bodies.map((b) => this.sheetRowHtml(b)).join('');

    // Cosmos home anchor — leads the bar. Same shape as a body so spacing + hover
    // behave identically. Distinct via the .body--cosmos modifier (subtle accent).
    // 10 May 2026 — also honours active="cosmos" (when the bar lives on the
    // cosmos atlas itself), getting the same aria-current dimming as any
    // other "you are here" planet.
    const cosmosIsActive = this.active === 'cosmos';
    const cosmosBody = `<a class="body body--cosmos"
        href="${COSMOS_HOST}/"
        data-slug="cosmos"
        ${cosmosIsActive ? 'aria-current="true"' : ''}
        aria-label="Open the cosmos portal"
        title="">${iconSvg('cosmos', 'home')}<span class="tip">open the cosmos portal</span></a>`;
    // Hairline divider between cosmos identity and sibling planets.
    const divider = `<span class="divider" aria-hidden="true"></span>`;

    this.root.innerHTML = `<style>${__INLINE_STYLES__}</style>
      <div class="bar">
        <button class="mobile-launch" type="button" aria-label="Open the cosmos menu" aria-expanded="${this.sheetOpen}">${cosmosCompactSvg()}</button>
        <div class="bodies" role="navigation" aria-label="Cosmos">${cosmosBody}${divider}${desktopBodies}</div>
        <div class="spacer" aria-hidden="true"></div>
        <div class="tail">
          <a class="live-pill"
              href="${COSMOS_HOST}/"
              data-state="loading"
              aria-label="Live: people currently in the cosmos"
              title="Live count across the cosmos">
            <span class="live-pill-dot" aria-hidden="true"></span>
            <span class="live-pill-num">·</span>
            <span class="live-pill-label">in cosmos</span>
          </a>
          ${
            relay
              ? `<a class="relay" href="${this.escapeUrl(relay.url)}" aria-label="${this.escape(relay.name + ' — ' + (relay.tagline || ''))}" title="${this.escape(relay.name)}">${iconSvg('mcp', 'relay')}</a>`
              : ''
          }
        </div>
      </div>
      <div class="sheet" data-open="${this.sheetOpen ? '1' : '0'}" role="dialog" aria-label="Cosmos planets" aria-hidden="${!this.sheetOpen}">
        <a class="sheet-row sheet-row--cosmos" href="${COSMOS_HOST}/" ${cosmosIsActive ? 'aria-current="true"' : ''}><span class="icon-slot">${iconSvg('cosmos', 'sheet-cosmos')}</span><span class="text"><span class="label">Open the cosmos portal</span><span class="tagline">cosmos.aguidetocloud.com</span></span></a>
        <div class="sheet-divider" aria-hidden="true"></div>
        ${sheetRows}
        ${
          relay
            ? `<div class="sheet-divider" aria-hidden="true"></div><a class="sheet-row" href="${this.escapeUrl(relay.url)}"><span class="icon-slot">${iconSvg('mcp', 'sheet-relay')}</span><span class="text"><span class="label">${this.escape(relay.name)}</span>${relay.tagline ? `<span class="tagline">${this.escape(relay.tagline)}</span>` : ''}</span></a>`
            : ''
        }
      </div>`;

    this.wire();
    // Start live-counter polling once on first successful render. Re-renders
    // (e.g. on active-attribute change) must NOT restart it — that would leak
    // intervals + listeners.
    if (!this.liveStarted) {
      this.liveStarted = true;
      this.startLiveCounter();
    }
  }

  // ── Live counter lifecycle ─────────────────────────────────────────
  //
  // Public surface — fetches /api/stats?realtime=cosmos from Earth's worker
  // (CORS *). No auth header sent; returns {totalUnique}. Hides entirely
  // when total < LIVE_MIN_VISIBLE or after LIVE_HIDE_AFTER_FAILURES failures.
  // Per-planet breakdown is GATED and lives in Command Centre, not here.
  private startLiveCounter() {
    // Fire once immediately, then on the cadence. Single interval per lifetime.
    void this.fetchLiveCount();
    if (this.liveTimer) clearInterval(this.liveTimer);
    this.liveTimer = setInterval(() => { void this.fetchLiveCount(); }, LIVE_POLL_INTERVAL_MS);
  }

  private async fetchLiveCount() {
    // Abort any in-flight fetch (e.g. when poll fires while previous is hanging).
    if (this.liveAbort) {
      try { this.liveAbort.abort(); } catch (_) { /* no-op */ }
    }
    const ctl = new AbortController();
    this.liveAbort = ctl;
    try {
      const res = await fetch(LIVE_COUNTER_URL, {
        credentials: 'omit',
        cache: 'no-store',
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { totalUnique?: number; error?: string };
      const n = typeof data?.totalUnique === 'number' ? data.totalUnique : 0;
      this.liveFailures = 0;
      this.updateLivePill(n);
    } catch (e) {
      // AbortError is expected when we pre-empt — do NOT count as failure.
      const aborted = (e as { name?: string })?.name === 'AbortError';
      if (!aborted) {
        this.liveFailures++;
        if (this.liveFailures >= LIVE_HIDE_AFTER_FAILURES) this.hideLivePill();
      }
    }
  }

  private updateLivePill(total: number) {
    const pill = this.root.querySelector('.live-pill') as HTMLElement | null;
    if (!pill) return;
    if (total < LIVE_MIN_VISIBLE) {
      pill.setAttribute('data-state', 'hidden');
      return;
    }
    pill.setAttribute('data-state', 'live');
    pill.setAttribute('aria-label', `${total} people currently in the cosmos`);
    const num = pill.querySelector('.live-pill-num') as HTMLElement | null;
    if (num) num.textContent = String(total);
  }

  private hideLivePill() {
    const pill = this.root.querySelector('.live-pill') as HTMLElement | null;
    if (pill) pill.setAttribute('data-state', 'hidden');
  }

  private stopLiveCounter() {
    if (this.liveTimer) { clearInterval(this.liveTimer); this.liveTimer = null; }
    if (this.liveAbort) { try { this.liveAbort.abort(); } catch (_) { /* no-op */ } this.liveAbort = null; }
  }

  private renderFallback() {
    this.root.innerHTML = `<style>${__INLINE_STYLES__}</style>
      <div class="bar">
        <a class="body body--cosmos" href="${COSMOS_HOST}/" aria-label="Open the cosmos portal">${iconSvg('cosmos', 'home')}<span class="tip">open the cosmos portal</span></a>
        <div class="spacer" aria-hidden="true"></div>
      </div>`;
  }

  private wire() {
    const launch = this.root.querySelector('.mobile-launch') as HTMLButtonElement | null;
    const sheet = this.root.querySelector('.sheet') as HTMLDivElement | null;
    if (launch && sheet) {
      launch.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSheet();
      });
      // Close sheet on link tap inside.
      sheet.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => this.setSheet(false))
      );
    }
    // Close on outside click + Esc.
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onKey);
  }

  private onDocClick = (e: MouseEvent) => {
    if (!this.sheetOpen) return;
    const path = e.composedPath();
    if (!path.includes(this)) this.setSheet(false);
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.sheetOpen) this.setSheet(false);
  };

  private toggleSheet() {
    this.setSheet(!this.sheetOpen);
  }

  private setSheet(open: boolean) {
    this.sheetOpen = open;
    const sheet = this.root.querySelector('.sheet') as HTMLDivElement | null;
    const launch = this.root.querySelector('.mobile-launch') as HTMLButtonElement | null;
    if (sheet) {
      sheet.setAttribute('data-open', open ? '1' : '0');
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    if (launch) launch.setAttribute('aria-expanded', String(open));
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onKey);
    this.stopLiveCounter();
  }

  private escape(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  private escapeUrl(s: string): string {
    // Allow only http(s) absolute, mailto, and root-relative paths. Otherwise empty.
    const url = String(s || '').trim();
    if (/^(https?:|mailto:|\/[^/])/.test(url) || url === '/' || url === '') return this.escape(url);
    return '';
  }
}

// Register exactly once.
if (!customElements.get('cosmos-bar')) {
  customElements.define('cosmos-bar', CosmosBar);
}

// Export for testability + dynamic registration paths.
export { CosmosBar, BAR_BODIES };
