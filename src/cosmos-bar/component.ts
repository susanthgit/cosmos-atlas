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
