/* cosmos-bar.js — single-file web component, served at https://cosmos.aguidetocloud.com/cosmos-bar.js
   Source: cosmos-atlas/src/cosmos-bar/component.ts
   Generated: 2026-05-11T21:06:20.646Z */
"use strict";(()=>{var f=Object.defineProperty;var m=(l,s,e)=>s in l?f(l,s,{enumerable:!0,configurable:!0,writable:!0,value:e}):l[s]=e;var a=(l,s,e)=>m(l,typeof s!="symbol"?s+"":s,e);var g=["earth","guided","brainbar","shift","plainai","curriculum","agentic","claw"],y="https://cosmos.aguidetocloud.com";function o(l,s="bar"){switch(l){case"earth":return`<img src="${y}/planets/earth-lotus.webp" width="24" height="24" alt="" loading="lazy" decoding="async" />`;case"guided":return`<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
        <mask id="cb-${s}-guided-mask">
          <rect width="32" height="32" fill="white"/>
          <circle cx="20" cy="13" r="11" fill="black"/>
        </mask>
        <circle cx="16" cy="16" r="13" fill="#E0D7BE" mask="url(#cb-${s}-guided-mask)"/>
      </svg>`;case"brainbar":return`<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        <text x="6" y="16" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700" fill="#86EFAC">$</text>
        <line x1="14" y1="14" x2="20" y2="14" stroke="#86EFAC" stroke-width="2.2" stroke-linecap="round">
          <animate attributeName="opacity" values="1;0" keyTimes="0;0.5" dur="1.2s" repeatCount="indefinite" calcMode="discrete"/>
        </line>
      </svg>`;case"shift":return`<svg viewBox="0 0 60 60" width="24" height="24" aria-hidden="true" focusable="false">
        <circle cx="30" cy="30" r="27" fill="none" stroke="#FDBA74" stroke-width="2.5"/>
        <circle cx="30" cy="30" r="22" fill="none" stroke="#FDBA74" stroke-width="1" opacity=".55"/>
        <path d="M 30 30 L 42.6 11.6 A 22 22 0 0 1 52 30 Z" fill="#E25822" opacity=".28">
          <animate attributeName="opacity" values=".18;.32;.18" dur="3s" repeatCount="indefinite"/>
        </path>
        <line x1="30" y1="30" x2="46" y2="14" stroke="#E25822" stroke-width="2.6" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" values="-3 30 30;3 30 30;-3 30 30" dur="4s" repeatCount="indefinite"/>
        </line>
        <circle cx="30" cy="30" r="3.2" fill="#FDBA74"/>
      </svg>`;case"plainai":return`<svg viewBox="0 0 38 30" width="30" height="24" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="cb-${s}-plainai-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#67E8F9"/>
            <stop offset="50%" stop-color="#A78BFA"/>
            <stop offset="100%" stop-color="#F472B6"/>
          </linearGradient>
        </defs>
        <path d="M4 3 a3 3 0 0 1 3-3 h24 a3 3 0 0 1 3 3 v15 a3 3 0 0 1 -3 3 h-15 l-6 5 v-5 h-3 a3 3 0 0 1 -3 -3 z" fill="url(#cb-${s}-plainai-grad)"/>
        <text x="19" y="11.5" text-anchor="middle" dominant-baseline="middle" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="800" fill="white" letter-spacing="-0.04em">AI</text>
      </svg>`;case"curriculum":return`<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="cb-${s}-curriculum-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#BBF7D0"/>
            <stop offset="100%" stop-color="#22C55E"/>
          </linearGradient>
        </defs>
        <path d="M16 28 V14" stroke="#86EFAC" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M16 18 C12 18 8 16 7 12 C12 12 16 14 16 18 Z" fill="url(#cb-${s}-curriculum-grad)"/>
        <path d="M16 16 C20 16 24 14 25 10 C20 10 16 12 16 16 Z" fill="url(#cb-${s}-curriculum-grad)"/>
        <circle cx="16" cy="14" r="1.4" fill="#16A34A"/>
      </svg>`;case"agentic":return`<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="11" fill="#0EA5E9" opacity="0.12"/>
        <circle cx="16" cy="16" r="7" fill="#0EA5E9" opacity="0.22"/>
        <circle cx="16" cy="16" r="4" fill="#7DD3FC">
          <animate attributeName="opacity" values="1;0.55;1" dur="2.4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="16" cy="16" r="1.6" fill="#F2EDE3"/>
      </svg>`;case"claw":return`<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        <path d="M7 4 L4 4 L4 20 L7 20" stroke="#F2EDE3" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M17 4 L20 4 L20 20 L17 20" stroke="#F2EDE3" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <g stroke="#FF2626" stroke-width="2" stroke-linecap="round" fill="none">
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8.5" y1="9.5" x2="15.5" y2="14.5"/>
          <line x1="15.5" y1="9.5" x2="8.5" y2="14.5"/>
        </g>
      </svg>`;case"mcp":return`<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" focusable="false">
        <ellipse cx="16" cy="17" rx="14" ry="11" fill="#FFB347" opacity="0.10"/>
        <line x1="16" y1="22" x2="16" y2="14" stroke="#C9C2B4" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M 4 12 Q 16 -2 28 12 L 25 14 Q 16 6 7 14 Z" fill="#FFD89A" stroke="#FFB347" stroke-width="0.9" stroke-linejoin="round"/>
        <circle cx="16" cy="9" r="1.3" fill="#FFFFFF" opacity="0.95">
          <animate attributeName="r" values="1.0;1.6;1.0" dur="1.8s" repeatCount="indefinite"/>
        </circle>
      </svg>`;case"cosmos":return`<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        <path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z" fill="#FFD89A" opacity="0.9">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3.4s" repeatCount="indefinite"/>
        </path>
      </svg>`}}function u(){return`<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
    <path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z" fill="#F2EDE3" opacity="0.85">
      <animate attributeName="opacity" values="0.6;0.95;0.6" dur="3.4s" repeatCount="indefinite"/>
    </path>
  </svg>`}var c="https://cosmos.aguidetocloud.com",b=14,w="https://www.aguidetocloud.com/api/stats?realtime=cosmos",L=45e3,E=3,S=2,d=class extends HTMLElement{constructor(){super();a(this,"root");a(this,"data",null);a(this,"active","");a(this,"sheetOpen",!1);a(this,"liveTimer",null);a(this,"liveAbort",null);a(this,"liveFailures",0);a(this,"liveStarted",!1);a(this,"onDocClick",e=>{if(!this.sheetOpen)return;e.composedPath().includes(this)||this.setSheet(!1)});a(this,"onKey",e=>{e.key==="Escape"&&this.sheetOpen&&this.setSheet(!1)});this.root=this.attachShadow({mode:"open"})}static get observedAttributes(){return["active"]}attributeChangedCallback(e,t,i){e==="active"&&(this.active=(i||"").trim().toLowerCase(),this.data&&this.render())}async connectedCallback(){this.active=(this.getAttribute("active")||"").trim().toLowerCase(),this.root.innerHTML=`<style>:host {\r
  all: initial;\r
  display: block;\r
  position: sticky;\r
  top: 0;\r
  z-index: 100;\r
  height: var(--cosmos-bar-h, 36px);\r
  width: 100%;\r
  background: #02030E;\r
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06);\r
  font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;\r
  color: #F2EDE3;\r
  /* layout-only containment \u2014 paint containment would trap the fixed-position\r
     mobile sheet inside the 36px host. */\r
  contain: layout;\r
  color-scheme: dark;\r
}\r
@media (max-width: 640px) { :host { --cosmos-bar-h: 32px; } }\r
\r
* { box-sizing: border-box; }\r
\r
.bar {\r
  display: flex;\r
  align-items: center;\r
  height: 100%;\r
  padding: 0 20px;\r
  gap: 22px;\r
}\r
\r
.bodies {\r
  display: flex;\r
  align-items: center;\r
  gap: 22px;\r
  flex: 1 1 auto;\r
  min-width: 0;\r
}\r
\r
.spacer { flex: 1 1 auto; }\r
\r
.tail {\r
  display: flex;\r
  align-items: center;\r
  gap: 16px;\r
  flex: 0 0 auto;\r
}\r
\r
/* Hairline divider between cosmos identity and sibling planets */\r
.divider {\r
  display: inline-block;\r
  width: 1px;\r
  height: 18px;\r
  background: rgba(255, 255, 255, 0.14);\r
  flex: 0 0 auto;\r
}\r
\r
/* Body chip \u2014 clickable icon slot */\r
.body {\r
  position: relative;\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  width: 28px;\r
  height: 28px;\r
  border-radius: 6px;\r
  text-decoration: none;\r
  color: inherit;\r
  transition: transform 180ms ease-out, opacity 180ms ease-out, background-color 180ms ease-out;\r
  flex: 0 0 auto;\r
}\r
.body:hover {\r
  background: rgba(255, 255, 255, 0.06);\r
  transform: translateY(-1px);\r
}\r
.body:focus-visible {\r
  outline: 2px solid #FFB347;\r
  outline-offset: 2px;\r
}\r
.body[aria-current="true"] {\r
  opacity: 0.5;\r
}\r
.body[aria-current="true"]::after {\r
  content: "";\r
  position: absolute;\r
  bottom: -2px;\r
  left: 50%;\r
  transform: translateX(-50%);\r
  width: 4px;\r
  height: 4px;\r
  border-radius: 50%;\r
  background: #F2EDE3;\r
}\r
\r
/* Cosmos home anchor \u2014 subtle warm accent so it reads as parent, not sibling.\r
   Same width/height as a body so spacing matches; just a soft amber tint. */\r
.body--cosmos {\r
  background: rgba(255, 179, 71, 0.06);\r
}\r
.body--cosmos:hover {\r
  background: rgba(255, 179, 71, 0.16);\r
}\r
\r
/* Freshness dot \u2014 appears top-right of the icon if shipped < 14 days ago */\r
.body[data-fresh="1"]::before {\r
  content: "";\r
  position: absolute;\r
  top: 0;\r
  right: 0;\r
  width: 5px;\r
  height: 5px;\r
  border-radius: 50%;\r
  background: #FFB347;\r
  box-shadow: 0 0 4px rgba(255, 179, 71, 0.6);\r
  animation: cb-fresh 2.4s ease-in-out infinite;\r
}\r
@keyframes cb-fresh {\r
  0%, 100% { opacity: 0.55; transform: scale(1); }\r
  50%      { opacity: 1; transform: scale(1.15); }\r
}\r
\r
/* SVG / IMG inside .body */\r
.body svg, .body img { display: block; pointer-events: none; }\r
\r
/* Tail \u2014 MCP relay (small + dim) */\r
.relay {\r
  position: relative;\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  width: 24px;\r
  height: 24px;\r
  opacity: 0.55;\r
  text-decoration: none;\r
  transition: opacity 180ms ease-out;\r
}\r
.relay:hover { opacity: 1; }\r
.relay:focus-visible { outline: 2px solid #FFB347; outline-offset: 2px; }\r
\r
/* Live cosmos counter pill \u2014 public vitality signal.\r
   Added 12 May 2026 (cosmos-wide intelligence v1). Shows the cosmos-wide\r
   total of active users in real time. No per-planet breakdown here \u2014\r
   that's gated and lives in the Command Centre Cosmos tab. */\r
.live-pill {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 5px;\r
  padding: 0 9px;\r
  height: 22px;\r
  border-radius: 999px;\r
  background: rgba(255, 179, 71, 0.10);\r
  border: 1px solid rgba(255, 179, 71, 0.20);\r
  color: #F2EDE3;\r
  font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;\r
  font-size: 11px;\r
  font-weight: 600;\r
  font-variant-numeric: tabular-nums;\r
  letter-spacing: 0.01em;\r
  line-height: 1;\r
  text-decoration: none;\r
  transition: background 150ms ease-out, border-color 150ms ease-out, transform 150ms ease-out;\r
  cursor: default;\r
}\r
.live-pill:hover {\r
  background: rgba(255, 179, 71, 0.16);\r
  border-color: rgba(255, 179, 71, 0.32);\r
}\r
.live-pill:focus-visible { outline: 2px solid #FFB347; outline-offset: 2px; }\r
.live-pill[data-state="hidden"] { display: none; }\r
.live-pill[data-state="loading"] { opacity: 0.45; }\r
.live-pill-dot {\r
  width: 6px;\r
  height: 6px;\r
  border-radius: 50%;\r
  background: #FFB347;\r
  flex: 0 0 auto;\r
  animation: live-pulse 2.4s ease-in-out infinite;\r
}\r
.live-pill-num { white-space: nowrap; }\r
.live-pill-label { opacity: 0.78; font-weight: 500; }\r
@keyframes live-pulse {\r
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 179, 71, 0.55); opacity: 1; }\r
  50%      { box-shadow: 0 0 0 4px rgba(255, 179, 71, 0); opacity: 0.55; }\r
}\r
@media (max-width: 640px) {\r
  .live-pill { padding: 0 7px; height: 20px; font-size: 10.5px; gap: 4px; }\r
  .live-pill-label { display: none; }\r
  .live-pill-dot { width: 5px; height: 5px; }\r
}\r
@media (prefers-reduced-motion: reduce) {\r
  .live-pill-dot { animation: none; }\r
}\r
\r
/* Tooltip \u2014 the hover tagline */\r
.tip {\r
  position: absolute;\r
  top: calc(100% + 8px);\r
  left: 50%;\r
  transform: translateX(-50%) translateY(-4px);\r
  padding: 6px 10px;\r
  background: rgba(2, 3, 14, 0.95);\r
  color: #F2EDE3;\r
  border: 1px solid rgba(255, 255, 255, 0.12);\r
  border-radius: 6px;\r
  font-size: 12px;\r
  line-height: 1.3;\r
  white-space: nowrap;\r
  pointer-events: none;\r
  opacity: 0;\r
  transition: opacity 180ms ease-out, transform 180ms ease-out;\r
  z-index: 101;\r
  max-width: 280px;\r
}\r
.body:hover .tip,\r
.body:focus-visible .tip {\r
  opacity: 1;\r
  transform: translateX(-50%) translateY(0);\r
  transition-delay: 200ms;\r
}\r
.tip::before {\r
  content: "";\r
  position: absolute;\r
  top: -4px;\r
  left: 50%;\r
  transform: translateX(-50%) rotate(45deg);\r
  width: 8px;\r
  height: 8px;\r
  background: rgba(2, 3, 14, 0.95);\r
  border-left: 1px solid rgba(255, 255, 255, 0.12);\r
  border-top: 1px solid rgba(255, 255, 255, 0.12);\r
}\r
\r
/* Mobile mode \u2014 collapse to a single \u2726 launcher + the cosmos CTA */\r
.mobile-launch {\r
  display: none;\r
  align-items: center;\r
  justify-content: center;\r
  width: 28px;\r
  height: 28px;\r
  border: 0;\r
  background: transparent;\r
  color: #F2EDE3;\r
  cursor: pointer;\r
  font-size: 16px;\r
  padding: 0;\r
}\r
.mobile-launch:focus-visible { outline: 2px solid #FFB347; outline-offset: 2px; }\r
\r
@media (max-width: 640px) {\r
  .bar { gap: 8px; padding: 0 14px; }\r
  .bodies { display: none; }\r
  .divider { display: none; }\r
  .mobile-launch { display: inline-flex; }\r
  .relay { width: 20px; height: 20px; }\r
}\r
\r
/* Sheet row variant \u2014 cosmos parent gets the same warm accent as the desktop body */\r
.sheet-row--cosmos {\r
  background: rgba(255, 179, 71, 0.04);\r
}\r
.sheet-row--cosmos:hover {\r
  background: rgba(255, 179, 71, 0.12);\r
}\r
\r
/* Mobile sheet \u2014 slide-down panel with all bodies + taglines */\r
.sheet {\r
  position: fixed;\r
  top: var(--cosmos-bar-h, 32px);\r
  left: 0;\r
  right: 0;\r
  background: #02030E;\r
  border-top: 1px solid rgba(255, 255, 255, 0.08);\r
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\r
  padding: 12px 16px 16px;\r
  transform: translateY(-110%);\r
  transition: transform 220ms ease-out;\r
  z-index: 99;\r
  max-height: calc(100vh - var(--cosmos-bar-h, 32px));\r
  overflow-y: auto;\r
}\r
.sheet[data-open="1"] { transform: translateY(0); }\r
\r
.sheet-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  padding: 10px 8px;\r
  border-radius: 6px;\r
  text-decoration: none;\r
  color: #F2EDE3;\r
  transition: background-color 180ms ease-out;\r
}\r
.sheet-row:hover, .sheet-row:focus-visible { background: rgba(255, 255, 255, 0.05); outline: none; }\r
.sheet-row[aria-current="true"] { opacity: 0.55; }\r
.sheet-row .icon-slot {\r
  position: relative;\r
  width: 28px; height: 28px;\r
  display: inline-flex; align-items: center; justify-content: center;\r
  flex: 0 0 auto;\r
}\r
.sheet-row .label { font-size: 14px; font-weight: 600; }\r
.sheet-row .tagline { font-size: 12px; color: #A39B8A; margin-top: 2px; }\r
.sheet-row .text { display: flex; flex-direction: column; min-width: 0; }\r
\r
.sheet-divider {\r
  height: 1px;\r
  background: rgba(255, 255, 255, 0.08);\r
  margin: 8px 0;\r
}\r
\r
/* Reduced motion \u2014 kill all transitions + SVG animations */\r
@media (prefers-reduced-motion: reduce) {\r
  .body, .relay, .tip, .sheet, .body[data-fresh="1"]::before {\r
    transition: none !important;\r
    animation: none !important;\r
  }\r
  /* Disable inline SVG <animate> elements within shadow DOM */\r
  :host ::part(svg-animate) { display: none; }\r
}</style><div class="bar"><div class="bodies" aria-busy="true"></div></div>`;try{let e=await this.fetchAtlas();this.data=e,this.render()}catch(e){console.warn("[cosmos-bar] failed to load atlas-bar.json",e),this.renderFallback()}}async fetchAtlas(){let e=(this.getAttribute("data-host")||"").trim(),t=c;e==="self"?t=window.location.origin:e&&(t=e.replace(/\/$/,""));let i=`${t}/atlas-bar.json`,r=await fetch(i,{credentials:"omit",cache:"force-cache"});if(!r.ok)throw new Error(`atlas-bar.json HTTP ${r.status}`);return await r.json()}isFresh(e){if(!e.lastShippedAt)return!1;let t=Date.parse(e.lastShippedAt);if(Number.isNaN(t))return!1;let i=(Date.now()-t)/(1e3*60*60*24);return i>=0&&i<=b}bodyHtml(e){let t=e.slug===this.active,i=this.isFresh(e),r=this.escape(e.tagline||e.name),h=this.escape(`${e.name}${e.tagline?" \u2014 "+e.tagline:""}`);return`<a class="body"
        href="${this.escapeUrl(e.url)}"
        data-slug="${this.escape(e.slug)}"
        ${t?'aria-current="true"':""}
        ${i?'data-fresh="1"':""}
        aria-label="${h}"
        title="">${o(e.slug,"bar")}<span class="tip">${r}</span></a>`}sheetRowHtml(e){let t=e.slug===this.active,i=this.isFresh(e);return`<a class="sheet-row" href="${this.escapeUrl(e.url)}" data-slug="${this.escape(e.slug)}" ${t?'aria-current="true"':""}>
        <span class="icon-slot" ${i?'data-fresh="1"':""}>${o(e.slug,"sheet")}</span>
        <span class="text">
          <span class="label">${this.escape(e.name)}</span>
          ${e.tagline?`<span class="tagline">${this.escape(e.tagline)}</span>`:""}
        </span>
      </a>`}render(){if(!this.data)return;let e=this.data.bodies.filter(n=>n.kind!=="relay"),t=this.data.bodies.find(n=>n.kind==="relay"),i=e.map(n=>this.bodyHtml(n)).join(""),r=e.map(n=>this.sheetRowHtml(n)).join(""),h=this.active==="cosmos",p=`<a class="body body--cosmos"
        href="${c}/"
        data-slug="cosmos"
        ${h?'aria-current="true"':""}
        aria-label="Open the cosmos portal"
        title="">${o("cosmos","home")}<span class="tip">open the cosmos portal</span></a>`,v='<span class="divider" aria-hidden="true"></span>';this.root.innerHTML=`<style>:host {\r
  all: initial;\r
  display: block;\r
  position: sticky;\r
  top: 0;\r
  z-index: 100;\r
  height: var(--cosmos-bar-h, 36px);\r
  width: 100%;\r
  background: #02030E;\r
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06);\r
  font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;\r
  color: #F2EDE3;\r
  /* layout-only containment \u2014 paint containment would trap the fixed-position\r
     mobile sheet inside the 36px host. */\r
  contain: layout;\r
  color-scheme: dark;\r
}\r
@media (max-width: 640px) { :host { --cosmos-bar-h: 32px; } }\r
\r
* { box-sizing: border-box; }\r
\r
.bar {\r
  display: flex;\r
  align-items: center;\r
  height: 100%;\r
  padding: 0 20px;\r
  gap: 22px;\r
}\r
\r
.bodies {\r
  display: flex;\r
  align-items: center;\r
  gap: 22px;\r
  flex: 1 1 auto;\r
  min-width: 0;\r
}\r
\r
.spacer { flex: 1 1 auto; }\r
\r
.tail {\r
  display: flex;\r
  align-items: center;\r
  gap: 16px;\r
  flex: 0 0 auto;\r
}\r
\r
/* Hairline divider between cosmos identity and sibling planets */\r
.divider {\r
  display: inline-block;\r
  width: 1px;\r
  height: 18px;\r
  background: rgba(255, 255, 255, 0.14);\r
  flex: 0 0 auto;\r
}\r
\r
/* Body chip \u2014 clickable icon slot */\r
.body {\r
  position: relative;\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  width: 28px;\r
  height: 28px;\r
  border-radius: 6px;\r
  text-decoration: none;\r
  color: inherit;\r
  transition: transform 180ms ease-out, opacity 180ms ease-out, background-color 180ms ease-out;\r
  flex: 0 0 auto;\r
}\r
.body:hover {\r
  background: rgba(255, 255, 255, 0.06);\r
  transform: translateY(-1px);\r
}\r
.body:focus-visible {\r
  outline: 2px solid #FFB347;\r
  outline-offset: 2px;\r
}\r
.body[aria-current="true"] {\r
  opacity: 0.5;\r
}\r
.body[aria-current="true"]::after {\r
  content: "";\r
  position: absolute;\r
  bottom: -2px;\r
  left: 50%;\r
  transform: translateX(-50%);\r
  width: 4px;\r
  height: 4px;\r
  border-radius: 50%;\r
  background: #F2EDE3;\r
}\r
\r
/* Cosmos home anchor \u2014 subtle warm accent so it reads as parent, not sibling.\r
   Same width/height as a body so spacing matches; just a soft amber tint. */\r
.body--cosmos {\r
  background: rgba(255, 179, 71, 0.06);\r
}\r
.body--cosmos:hover {\r
  background: rgba(255, 179, 71, 0.16);\r
}\r
\r
/* Freshness dot \u2014 appears top-right of the icon if shipped < 14 days ago */\r
.body[data-fresh="1"]::before {\r
  content: "";\r
  position: absolute;\r
  top: 0;\r
  right: 0;\r
  width: 5px;\r
  height: 5px;\r
  border-radius: 50%;\r
  background: #FFB347;\r
  box-shadow: 0 0 4px rgba(255, 179, 71, 0.6);\r
  animation: cb-fresh 2.4s ease-in-out infinite;\r
}\r
@keyframes cb-fresh {\r
  0%, 100% { opacity: 0.55; transform: scale(1); }\r
  50%      { opacity: 1; transform: scale(1.15); }\r
}\r
\r
/* SVG / IMG inside .body */\r
.body svg, .body img { display: block; pointer-events: none; }\r
\r
/* Tail \u2014 MCP relay (small + dim) */\r
.relay {\r
  position: relative;\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  width: 24px;\r
  height: 24px;\r
  opacity: 0.55;\r
  text-decoration: none;\r
  transition: opacity 180ms ease-out;\r
}\r
.relay:hover { opacity: 1; }\r
.relay:focus-visible { outline: 2px solid #FFB347; outline-offset: 2px; }\r
\r
/* Live cosmos counter pill \u2014 public vitality signal.\r
   Added 12 May 2026 (cosmos-wide intelligence v1). Shows the cosmos-wide\r
   total of active users in real time. No per-planet breakdown here \u2014\r
   that's gated and lives in the Command Centre Cosmos tab. */\r
.live-pill {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 5px;\r
  padding: 0 9px;\r
  height: 22px;\r
  border-radius: 999px;\r
  background: rgba(255, 179, 71, 0.10);\r
  border: 1px solid rgba(255, 179, 71, 0.20);\r
  color: #F2EDE3;\r
  font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;\r
  font-size: 11px;\r
  font-weight: 600;\r
  font-variant-numeric: tabular-nums;\r
  letter-spacing: 0.01em;\r
  line-height: 1;\r
  text-decoration: none;\r
  transition: background 150ms ease-out, border-color 150ms ease-out, transform 150ms ease-out;\r
  cursor: default;\r
}\r
.live-pill:hover {\r
  background: rgba(255, 179, 71, 0.16);\r
  border-color: rgba(255, 179, 71, 0.32);\r
}\r
.live-pill:focus-visible { outline: 2px solid #FFB347; outline-offset: 2px; }\r
.live-pill[data-state="hidden"] { display: none; }\r
.live-pill[data-state="loading"] { opacity: 0.45; }\r
.live-pill-dot {\r
  width: 6px;\r
  height: 6px;\r
  border-radius: 50%;\r
  background: #FFB347;\r
  flex: 0 0 auto;\r
  animation: live-pulse 2.4s ease-in-out infinite;\r
}\r
.live-pill-num { white-space: nowrap; }\r
.live-pill-label { opacity: 0.78; font-weight: 500; }\r
@keyframes live-pulse {\r
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 179, 71, 0.55); opacity: 1; }\r
  50%      { box-shadow: 0 0 0 4px rgba(255, 179, 71, 0); opacity: 0.55; }\r
}\r
@media (max-width: 640px) {\r
  .live-pill { padding: 0 7px; height: 20px; font-size: 10.5px; gap: 4px; }\r
  .live-pill-label { display: none; }\r
  .live-pill-dot { width: 5px; height: 5px; }\r
}\r
@media (prefers-reduced-motion: reduce) {\r
  .live-pill-dot { animation: none; }\r
}\r
\r
/* Tooltip \u2014 the hover tagline */\r
.tip {\r
  position: absolute;\r
  top: calc(100% + 8px);\r
  left: 50%;\r
  transform: translateX(-50%) translateY(-4px);\r
  padding: 6px 10px;\r
  background: rgba(2, 3, 14, 0.95);\r
  color: #F2EDE3;\r
  border: 1px solid rgba(255, 255, 255, 0.12);\r
  border-radius: 6px;\r
  font-size: 12px;\r
  line-height: 1.3;\r
  white-space: nowrap;\r
  pointer-events: none;\r
  opacity: 0;\r
  transition: opacity 180ms ease-out, transform 180ms ease-out;\r
  z-index: 101;\r
  max-width: 280px;\r
}\r
.body:hover .tip,\r
.body:focus-visible .tip {\r
  opacity: 1;\r
  transform: translateX(-50%) translateY(0);\r
  transition-delay: 200ms;\r
}\r
.tip::before {\r
  content: "";\r
  position: absolute;\r
  top: -4px;\r
  left: 50%;\r
  transform: translateX(-50%) rotate(45deg);\r
  width: 8px;\r
  height: 8px;\r
  background: rgba(2, 3, 14, 0.95);\r
  border-left: 1px solid rgba(255, 255, 255, 0.12);\r
  border-top: 1px solid rgba(255, 255, 255, 0.12);\r
}\r
\r
/* Mobile mode \u2014 collapse to a single \u2726 launcher + the cosmos CTA */\r
.mobile-launch {\r
  display: none;\r
  align-items: center;\r
  justify-content: center;\r
  width: 28px;\r
  height: 28px;\r
  border: 0;\r
  background: transparent;\r
  color: #F2EDE3;\r
  cursor: pointer;\r
  font-size: 16px;\r
  padding: 0;\r
}\r
.mobile-launch:focus-visible { outline: 2px solid #FFB347; outline-offset: 2px; }\r
\r
@media (max-width: 640px) {\r
  .bar { gap: 8px; padding: 0 14px; }\r
  .bodies { display: none; }\r
  .divider { display: none; }\r
  .mobile-launch { display: inline-flex; }\r
  .relay { width: 20px; height: 20px; }\r
}\r
\r
/* Sheet row variant \u2014 cosmos parent gets the same warm accent as the desktop body */\r
.sheet-row--cosmos {\r
  background: rgba(255, 179, 71, 0.04);\r
}\r
.sheet-row--cosmos:hover {\r
  background: rgba(255, 179, 71, 0.12);\r
}\r
\r
/* Mobile sheet \u2014 slide-down panel with all bodies + taglines */\r
.sheet {\r
  position: fixed;\r
  top: var(--cosmos-bar-h, 32px);\r
  left: 0;\r
  right: 0;\r
  background: #02030E;\r
  border-top: 1px solid rgba(255, 255, 255, 0.08);\r
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\r
  padding: 12px 16px 16px;\r
  transform: translateY(-110%);\r
  transition: transform 220ms ease-out;\r
  z-index: 99;\r
  max-height: calc(100vh - var(--cosmos-bar-h, 32px));\r
  overflow-y: auto;\r
}\r
.sheet[data-open="1"] { transform: translateY(0); }\r
\r
.sheet-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  padding: 10px 8px;\r
  border-radius: 6px;\r
  text-decoration: none;\r
  color: #F2EDE3;\r
  transition: background-color 180ms ease-out;\r
}\r
.sheet-row:hover, .sheet-row:focus-visible { background: rgba(255, 255, 255, 0.05); outline: none; }\r
.sheet-row[aria-current="true"] { opacity: 0.55; }\r
.sheet-row .icon-slot {\r
  position: relative;\r
  width: 28px; height: 28px;\r
  display: inline-flex; align-items: center; justify-content: center;\r
  flex: 0 0 auto;\r
}\r
.sheet-row .label { font-size: 14px; font-weight: 600; }\r
.sheet-row .tagline { font-size: 12px; color: #A39B8A; margin-top: 2px; }\r
.sheet-row .text { display: flex; flex-direction: column; min-width: 0; }\r
\r
.sheet-divider {\r
  height: 1px;\r
  background: rgba(255, 255, 255, 0.08);\r
  margin: 8px 0;\r
}\r
\r
/* Reduced motion \u2014 kill all transitions + SVG animations */\r
@media (prefers-reduced-motion: reduce) {\r
  .body, .relay, .tip, .sheet, .body[data-fresh="1"]::before {\r
    transition: none !important;\r
    animation: none !important;\r
  }\r
  /* Disable inline SVG <animate> elements within shadow DOM */\r
  :host ::part(svg-animate) { display: none; }\r
}</style>
      <div class="bar">
        <button class="mobile-launch" type="button" aria-label="Open the cosmos menu" aria-expanded="${this.sheetOpen}">${u()}</button>
        <div class="bodies" role="navigation" aria-label="Cosmos">${p}${v}${i}</div>
        <div class="spacer" aria-hidden="true"></div>
        <div class="tail">
          <a class="live-pill"
              href="${c}/"
              data-state="loading"
              aria-label="Live: people currently in the cosmos"
              title="Live count across the cosmos">
            <span class="live-pill-dot" aria-hidden="true"></span>
            <span class="live-pill-num">\xB7</span>
            <span class="live-pill-label">in cosmos</span>
          </a>
          ${t?`<a class="relay" href="${this.escapeUrl(t.url)}" aria-label="${this.escape(t.name+" \u2014 "+(t.tagline||""))}" title="${this.escape(t.name)}">${o("mcp","relay")}</a>`:""}
        </div>
      </div>
      <div class="sheet" data-open="${this.sheetOpen?"1":"0"}" role="dialog" aria-label="Cosmos planets" aria-hidden="${!this.sheetOpen}">
        <a class="sheet-row sheet-row--cosmos" href="${c}/" ${h?'aria-current="true"':""}><span class="icon-slot">${o("cosmos","sheet-cosmos")}</span><span class="text"><span class="label">Open the cosmos portal</span><span class="tagline">cosmos.aguidetocloud.com</span></span></a>
        <div class="sheet-divider" aria-hidden="true"></div>
        ${r}
        ${t?`<div class="sheet-divider" aria-hidden="true"></div><a class="sheet-row" href="${this.escapeUrl(t.url)}"><span class="icon-slot">${o("mcp","sheet-relay")}</span><span class="text"><span class="label">${this.escape(t.name)}</span>${t.tagline?`<span class="tagline">${this.escape(t.tagline)}</span>`:""}</span></a>`:""}
      </div>`,this.wire(),this.liveStarted||(this.startLiveCounter(),this.liveStarted=!0)}startLiveCounter(){this.fetchLiveCount(),this.liveTimer&&clearInterval(this.liveTimer),this.liveTimer=setInterval(()=>{this.fetchLiveCount()},L)}async fetchLiveCount(){if(this.liveAbort)try{this.liveAbort.abort()}catch{}let e=new AbortController;this.liveAbort=e;try{let t=await fetch(w,{credentials:"omit",signal:e.signal});if(!t.ok)throw new Error(`HTTP ${t.status}`);let i=await t.json(),r=typeof i?.totalUnique=="number"?i.totalUnique:0;this.liveFailures=0,this.updateLivePill(r)}catch(t){t?.name==="AbortError"||(this.liveFailures++,this.liveFailures>=E&&this.hideLivePill())}}updateLivePill(e){let t=this.root.querySelector(".live-pill");if(!t)return;if(e<S){t.setAttribute("data-state","hidden");return}t.setAttribute("data-state","live"),t.setAttribute("aria-label",`${e} people currently in the cosmos`);let i=t.querySelector(".live-pill-num");i&&(i.textContent=String(e))}hideLivePill(){let e=this.root.querySelector(".live-pill");e&&e.setAttribute("data-state","hidden")}stopLiveCounter(){if(this.liveTimer&&(clearInterval(this.liveTimer),this.liveTimer=null),this.liveAbort){try{this.liveAbort.abort()}catch{}this.liveAbort=null}}renderFallback(){this.root.innerHTML=`<style>:host {\r
  all: initial;\r
  display: block;\r
  position: sticky;\r
  top: 0;\r
  z-index: 100;\r
  height: var(--cosmos-bar-h, 36px);\r
  width: 100%;\r
  background: #02030E;\r
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06);\r
  font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;\r
  color: #F2EDE3;\r
  /* layout-only containment \u2014 paint containment would trap the fixed-position\r
     mobile sheet inside the 36px host. */\r
  contain: layout;\r
  color-scheme: dark;\r
}\r
@media (max-width: 640px) { :host { --cosmos-bar-h: 32px; } }\r
\r
* { box-sizing: border-box; }\r
\r
.bar {\r
  display: flex;\r
  align-items: center;\r
  height: 100%;\r
  padding: 0 20px;\r
  gap: 22px;\r
}\r
\r
.bodies {\r
  display: flex;\r
  align-items: center;\r
  gap: 22px;\r
  flex: 1 1 auto;\r
  min-width: 0;\r
}\r
\r
.spacer { flex: 1 1 auto; }\r
\r
.tail {\r
  display: flex;\r
  align-items: center;\r
  gap: 16px;\r
  flex: 0 0 auto;\r
}\r
\r
/* Hairline divider between cosmos identity and sibling planets */\r
.divider {\r
  display: inline-block;\r
  width: 1px;\r
  height: 18px;\r
  background: rgba(255, 255, 255, 0.14);\r
  flex: 0 0 auto;\r
}\r
\r
/* Body chip \u2014 clickable icon slot */\r
.body {\r
  position: relative;\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  width: 28px;\r
  height: 28px;\r
  border-radius: 6px;\r
  text-decoration: none;\r
  color: inherit;\r
  transition: transform 180ms ease-out, opacity 180ms ease-out, background-color 180ms ease-out;\r
  flex: 0 0 auto;\r
}\r
.body:hover {\r
  background: rgba(255, 255, 255, 0.06);\r
  transform: translateY(-1px);\r
}\r
.body:focus-visible {\r
  outline: 2px solid #FFB347;\r
  outline-offset: 2px;\r
}\r
.body[aria-current="true"] {\r
  opacity: 0.5;\r
}\r
.body[aria-current="true"]::after {\r
  content: "";\r
  position: absolute;\r
  bottom: -2px;\r
  left: 50%;\r
  transform: translateX(-50%);\r
  width: 4px;\r
  height: 4px;\r
  border-radius: 50%;\r
  background: #F2EDE3;\r
}\r
\r
/* Cosmos home anchor \u2014 subtle warm accent so it reads as parent, not sibling.\r
   Same width/height as a body so spacing matches; just a soft amber tint. */\r
.body--cosmos {\r
  background: rgba(255, 179, 71, 0.06);\r
}\r
.body--cosmos:hover {\r
  background: rgba(255, 179, 71, 0.16);\r
}\r
\r
/* Freshness dot \u2014 appears top-right of the icon if shipped < 14 days ago */\r
.body[data-fresh="1"]::before {\r
  content: "";\r
  position: absolute;\r
  top: 0;\r
  right: 0;\r
  width: 5px;\r
  height: 5px;\r
  border-radius: 50%;\r
  background: #FFB347;\r
  box-shadow: 0 0 4px rgba(255, 179, 71, 0.6);\r
  animation: cb-fresh 2.4s ease-in-out infinite;\r
}\r
@keyframes cb-fresh {\r
  0%, 100% { opacity: 0.55; transform: scale(1); }\r
  50%      { opacity: 1; transform: scale(1.15); }\r
}\r
\r
/* SVG / IMG inside .body */\r
.body svg, .body img { display: block; pointer-events: none; }\r
\r
/* Tail \u2014 MCP relay (small + dim) */\r
.relay {\r
  position: relative;\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  width: 24px;\r
  height: 24px;\r
  opacity: 0.55;\r
  text-decoration: none;\r
  transition: opacity 180ms ease-out;\r
}\r
.relay:hover { opacity: 1; }\r
.relay:focus-visible { outline: 2px solid #FFB347; outline-offset: 2px; }\r
\r
/* Live cosmos counter pill \u2014 public vitality signal.\r
   Added 12 May 2026 (cosmos-wide intelligence v1). Shows the cosmos-wide\r
   total of active users in real time. No per-planet breakdown here \u2014\r
   that's gated and lives in the Command Centre Cosmos tab. */\r
.live-pill {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 5px;\r
  padding: 0 9px;\r
  height: 22px;\r
  border-radius: 999px;\r
  background: rgba(255, 179, 71, 0.10);\r
  border: 1px solid rgba(255, 179, 71, 0.20);\r
  color: #F2EDE3;\r
  font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;\r
  font-size: 11px;\r
  font-weight: 600;\r
  font-variant-numeric: tabular-nums;\r
  letter-spacing: 0.01em;\r
  line-height: 1;\r
  text-decoration: none;\r
  transition: background 150ms ease-out, border-color 150ms ease-out, transform 150ms ease-out;\r
  cursor: default;\r
}\r
.live-pill:hover {\r
  background: rgba(255, 179, 71, 0.16);\r
  border-color: rgba(255, 179, 71, 0.32);\r
}\r
.live-pill:focus-visible { outline: 2px solid #FFB347; outline-offset: 2px; }\r
.live-pill[data-state="hidden"] { display: none; }\r
.live-pill[data-state="loading"] { opacity: 0.45; }\r
.live-pill-dot {\r
  width: 6px;\r
  height: 6px;\r
  border-radius: 50%;\r
  background: #FFB347;\r
  flex: 0 0 auto;\r
  animation: live-pulse 2.4s ease-in-out infinite;\r
}\r
.live-pill-num { white-space: nowrap; }\r
.live-pill-label { opacity: 0.78; font-weight: 500; }\r
@keyframes live-pulse {\r
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 179, 71, 0.55); opacity: 1; }\r
  50%      { box-shadow: 0 0 0 4px rgba(255, 179, 71, 0); opacity: 0.55; }\r
}\r
@media (max-width: 640px) {\r
  .live-pill { padding: 0 7px; height: 20px; font-size: 10.5px; gap: 4px; }\r
  .live-pill-label { display: none; }\r
  .live-pill-dot { width: 5px; height: 5px; }\r
}\r
@media (prefers-reduced-motion: reduce) {\r
  .live-pill-dot { animation: none; }\r
}\r
\r
/* Tooltip \u2014 the hover tagline */\r
.tip {\r
  position: absolute;\r
  top: calc(100% + 8px);\r
  left: 50%;\r
  transform: translateX(-50%) translateY(-4px);\r
  padding: 6px 10px;\r
  background: rgba(2, 3, 14, 0.95);\r
  color: #F2EDE3;\r
  border: 1px solid rgba(255, 255, 255, 0.12);\r
  border-radius: 6px;\r
  font-size: 12px;\r
  line-height: 1.3;\r
  white-space: nowrap;\r
  pointer-events: none;\r
  opacity: 0;\r
  transition: opacity 180ms ease-out, transform 180ms ease-out;\r
  z-index: 101;\r
  max-width: 280px;\r
}\r
.body:hover .tip,\r
.body:focus-visible .tip {\r
  opacity: 1;\r
  transform: translateX(-50%) translateY(0);\r
  transition-delay: 200ms;\r
}\r
.tip::before {\r
  content: "";\r
  position: absolute;\r
  top: -4px;\r
  left: 50%;\r
  transform: translateX(-50%) rotate(45deg);\r
  width: 8px;\r
  height: 8px;\r
  background: rgba(2, 3, 14, 0.95);\r
  border-left: 1px solid rgba(255, 255, 255, 0.12);\r
  border-top: 1px solid rgba(255, 255, 255, 0.12);\r
}\r
\r
/* Mobile mode \u2014 collapse to a single \u2726 launcher + the cosmos CTA */\r
.mobile-launch {\r
  display: none;\r
  align-items: center;\r
  justify-content: center;\r
  width: 28px;\r
  height: 28px;\r
  border: 0;\r
  background: transparent;\r
  color: #F2EDE3;\r
  cursor: pointer;\r
  font-size: 16px;\r
  padding: 0;\r
}\r
.mobile-launch:focus-visible { outline: 2px solid #FFB347; outline-offset: 2px; }\r
\r
@media (max-width: 640px) {\r
  .bar { gap: 8px; padding: 0 14px; }\r
  .bodies { display: none; }\r
  .divider { display: none; }\r
  .mobile-launch { display: inline-flex; }\r
  .relay { width: 20px; height: 20px; }\r
}\r
\r
/* Sheet row variant \u2014 cosmos parent gets the same warm accent as the desktop body */\r
.sheet-row--cosmos {\r
  background: rgba(255, 179, 71, 0.04);\r
}\r
.sheet-row--cosmos:hover {\r
  background: rgba(255, 179, 71, 0.12);\r
}\r
\r
/* Mobile sheet \u2014 slide-down panel with all bodies + taglines */\r
.sheet {\r
  position: fixed;\r
  top: var(--cosmos-bar-h, 32px);\r
  left: 0;\r
  right: 0;\r
  background: #02030E;\r
  border-top: 1px solid rgba(255, 255, 255, 0.08);\r
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\r
  padding: 12px 16px 16px;\r
  transform: translateY(-110%);\r
  transition: transform 220ms ease-out;\r
  z-index: 99;\r
  max-height: calc(100vh - var(--cosmos-bar-h, 32px));\r
  overflow-y: auto;\r
}\r
.sheet[data-open="1"] { transform: translateY(0); }\r
\r
.sheet-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  padding: 10px 8px;\r
  border-radius: 6px;\r
  text-decoration: none;\r
  color: #F2EDE3;\r
  transition: background-color 180ms ease-out;\r
}\r
.sheet-row:hover, .sheet-row:focus-visible { background: rgba(255, 255, 255, 0.05); outline: none; }\r
.sheet-row[aria-current="true"] { opacity: 0.55; }\r
.sheet-row .icon-slot {\r
  position: relative;\r
  width: 28px; height: 28px;\r
  display: inline-flex; align-items: center; justify-content: center;\r
  flex: 0 0 auto;\r
}\r
.sheet-row .label { font-size: 14px; font-weight: 600; }\r
.sheet-row .tagline { font-size: 12px; color: #A39B8A; margin-top: 2px; }\r
.sheet-row .text { display: flex; flex-direction: column; min-width: 0; }\r
\r
.sheet-divider {\r
  height: 1px;\r
  background: rgba(255, 255, 255, 0.08);\r
  margin: 8px 0;\r
}\r
\r
/* Reduced motion \u2014 kill all transitions + SVG animations */\r
@media (prefers-reduced-motion: reduce) {\r
  .body, .relay, .tip, .sheet, .body[data-fresh="1"]::before {\r
    transition: none !important;\r
    animation: none !important;\r
  }\r
  /* Disable inline SVG <animate> elements within shadow DOM */\r
  :host ::part(svg-animate) { display: none; }\r
}</style>
      <div class="bar">
        <a class="body body--cosmos" href="${c}/" aria-label="Open the cosmos portal">${o("cosmos","home")}<span class="tip">open the cosmos portal</span></a>
        <div class="spacer" aria-hidden="true"></div>
      </div>`}wire(){let e=this.root.querySelector(".mobile-launch"),t=this.root.querySelector(".sheet");e&&t&&(e.addEventListener("click",i=>{i.stopPropagation(),this.toggleSheet()}),t.querySelectorAll("a").forEach(i=>i.addEventListener("click",()=>this.setSheet(!1)))),document.addEventListener("click",this.onDocClick),document.addEventListener("keydown",this.onKey)}toggleSheet(){this.setSheet(!this.sheetOpen)}setSheet(e){this.sheetOpen=e;let t=this.root.querySelector(".sheet"),i=this.root.querySelector(".mobile-launch");t&&(t.setAttribute("data-open",e?"1":"0"),t.setAttribute("aria-hidden",e?"false":"true")),i&&i.setAttribute("aria-expanded",String(e))}disconnectedCallback(){document.removeEventListener("click",this.onDocClick),document.removeEventListener("keydown",this.onKey),this.stopLiveCounter()}escape(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}escapeUrl(e){let t=String(e||"").trim();return/^(https?:|mailto:|\/[^/])/.test(t)||t==="/"||t===""?this.escape(t):""}};customElements.get("cosmos-bar")||customElements.define("cosmos-bar",d);})();
