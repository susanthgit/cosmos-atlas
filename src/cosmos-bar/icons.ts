/**
 * Cosmos Bar — icon set
 * ════════════════════════════════════════════════════════════════════════════
 * Slim 9-icon SVG library for the cross-planet bar. Each function returns an
 * SVG string sized to fit a 24px slot (mobile 20px). Animations are inline
 * (per-element <animate>) so they survive shadow-DOM and need no JS to start.
 *
 * 8 destination bodies + the relay + the cosmos glyph for the "open" CTA.
 *
 * SOURCE OF TRUTH: lifted directly from src/components/PlanetIcon.astro — the
 * canonical full-cosmos icons. Voyagers (youtube/bites/linkedin/kofi) are NOT
 * here on purpose — they live in each planet's footer, never in the cosmos bar.
 *
 * Earth uses a remote <img> reference to the lotus asset hosted on the cosmos
 * origin — same pixel-perfect lotus the cosmos portal shows.
 *
 * Touched: 9 May 2026 EVE — initial build (cosmos-bar Phase 1).
 */

export type BarSlug =
  | 'earth'
  | 'guided'
  | 'brainbar'
  | 'shift'
  | 'plainai'
  | 'curriculum'
  | 'agentic'
  | 'claw'
  | 'mcp'
  | 'cosmos';

export const BAR_BODIES: BarSlug[] = [
  'earth',
  'guided',
  'brainbar',
  'shift',
  'plainai',
  'curriculum',
  'agentic',
  'claw',
];

const COSMOS_HOST = 'https://cosmos.aguidetocloud.com';

/**
 * Returns the inner markup for a body's icon (24px viewport implied).
 * The caller wraps in a flex slot.
 *
 * `scope` keeps SVG <defs> ids unique when the bar is rendered multiple times
 * (rare — only one bar per page — but cheap insurance).
 */
export function iconSvg(slug: BarSlug, scope = 'bar'): string {
  switch (slug) {
    case 'earth':
      // Lotus image lives on the cosmos origin. <img> is cross-origin friendly.
      return `<img src="${COSMOS_HOST}/planets/earth-lotus.webp" width="24" height="24" alt="" loading="lazy" decoding="async" />`;

    case 'guided':
      // Indigo crescent — Earth's moon. Mask cuts a crescent from a soft disk.
      return `<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
        <mask id="cb-${scope}-guided-mask">
          <rect width="32" height="32" fill="white"/>
          <circle cx="20" cy="13" r="11" fill="black"/>
        </mask>
        <circle cx="16" cy="16" r="13" fill="#E0D7BE" mask="url(#cb-${scope}-guided-mask)"/>
      </svg>`;

    case 'brainbar':
      // Terminal $_ with blinking cursor.
      return `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        <text x="6" y="16" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700" fill="#86EFAC">$</text>
        <line x1="14" y1="14" x2="20" y2="14" stroke="#86EFAC" stroke-width="2.2" stroke-linecap="round">
          <animate attributeName="opacity" values="1;0" keyTimes="0;0.5" dur="1.2s" repeatCount="indefinite" calcMode="discrete"/>
        </line>
      </svg>`;

    case 'shift':
      // Clock face with rotating red needle (the AI job-change wire).
      return `<svg viewBox="0 0 60 60" width="24" height="24" aria-hidden="true" focusable="false">
        <circle cx="30" cy="30" r="27" fill="none" stroke="#FDBA74" stroke-width="2.5"/>
        <circle cx="30" cy="30" r="22" fill="none" stroke="#FDBA74" stroke-width="1" opacity=".55"/>
        <path d="M 30 30 L 42.6 11.6 A 22 22 0 0 1 52 30 Z" fill="#E25822" opacity=".28">
          <animate attributeName="opacity" values=".18;.32;.18" dur="3s" repeatCount="indefinite"/>
        </path>
        <line x1="30" y1="30" x2="46" y2="14" stroke="#E25822" stroke-width="2.6" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" values="-3 30 30;3 30 30;-3 30 30" dur="4s" repeatCount="indefinite"/>
        </line>
        <circle cx="30" cy="30" r="3.2" fill="#FDBA74"/>
      </svg>`;

    case 'plainai':
      // Speech-bubble-as-chip with gradient AI text.
      return `<svg viewBox="0 0 38 30" width="30" height="24" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="cb-${scope}-plainai-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#67E8F9"/>
            <stop offset="50%" stop-color="#A78BFA"/>
            <stop offset="100%" stop-color="#F472B6"/>
          </linearGradient>
        </defs>
        <path d="M4 3 a3 3 0 0 1 3-3 h24 a3 3 0 0 1 3 3 v15 a3 3 0 0 1 -3 3 h-15 l-6 5 v-5 h-3 a3 3 0 0 1 -3 -3 z" fill="url(#cb-${scope}-plainai-grad)"/>
        <text x="19" y="11.5" text-anchor="middle" dominant-baseline="middle" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="800" fill="white" letter-spacing="-0.04em">AI</text>
      </svg>`;

    case 'curriculum':
      // Plain AI's moon — sapling with leaves.
      return `<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="cb-${scope}-curriculum-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#BBF7D0"/>
            <stop offset="100%" stop-color="#22C55E"/>
          </linearGradient>
        </defs>
        <path d="M16 28 V14" stroke="#86EFAC" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M16 18 C12 18 8 16 7 12 C12 12 16 14 16 18 Z" fill="url(#cb-${scope}-curriculum-grad)"/>
        <path d="M16 16 C20 16 24 14 25 10 C20 10 16 12 16 16 Z" fill="url(#cb-${scope}-curriculum-grad)"/>
        <circle cx="16" cy="14" r="1.4" fill="#16A34A"/>
      </svg>`;

    case 'agentic':
      // Cyan pulsing signal LED (cockpit register).
      return `<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="11" fill="#0EA5E9" opacity="0.12"/>
        <circle cx="16" cy="16" r="7" fill="#0EA5E9" opacity="0.22"/>
        <circle cx="16" cy="16" r="4" fill="#7DD3FC">
          <animate attributeName="opacity" values="1;0.55;1" dur="2.4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="16" cy="16" r="1.6" fill="#F2EDE3"/>
      </svg>`;

    case 'claw':
      // Bracket Mark [*] — the study reference.
      return `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        <path d="M7 4 L4 4 L4 20 L7 20" stroke="#F2EDE3" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M17 4 L20 4 L20 20 L17 20" stroke="#F2EDE3" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <g stroke="#FF2626" stroke-width="2" stroke-linecap="round" fill="none">
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8.5" y1="9.5" x2="15.5" y2="14.5"/>
          <line x1="15.5" y1="9.5" x2="8.5" y2="14.5"/>
        </g>
      </svg>`;

    case 'mcp':
      // The relay dish — small + dim treatment for the bar (right end).
      return `<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" focusable="false">
        <ellipse cx="16" cy="17" rx="14" ry="11" fill="#FFB347" opacity="0.10"/>
        <line x1="16" y1="22" x2="16" y2="14" stroke="#C9C2B4" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M 4 12 Q 16 -2 28 12 L 25 14 Q 16 6 7 14 Z" fill="#FFD89A" stroke="#FFB347" stroke-width="0.9" stroke-linejoin="round"/>
        <circle cx="16" cy="9" r="1.3" fill="#FFFFFF" opacity="0.95">
          <animate attributeName="r" values="1.0;1.6;1.0" dur="1.8s" repeatCount="indefinite"/>
        </circle>
      </svg>`;

    case 'cosmos':
      // The cosmos glyph — a gentle 4-pointed star (✦). Used as the leading
      // body in the bar, the mobile launcher, and the mobile sheet first row.
      // Renders at 24px in body slots, 14px in compact slots (launcher button).
      return `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        <path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z" fill="#FFD89A" opacity="0.9">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3.4s" repeatCount="indefinite"/>
        </path>
      </svg>`;
  }
}

/**
 * Compact 14px cosmos glyph for the mobile launcher button. Same shape, smaller box.
 */
export function cosmosCompactSvg(): string {
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
    <path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z" fill="#F2EDE3" opacity="0.85">
      <animate attributeName="opacity" values="0.6;0.95;0.6" dur="3.4s" repeatCount="indefinite"/>
    </path>
  </svg>`;
}
