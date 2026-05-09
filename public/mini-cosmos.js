// mini-cosmos.js — embeddable mini-atlas widget for the planet footers.
//
// Embed pattern (in any planet's footer HTML):
//   <a class="mini-cosmos" data-current="earth"
//      href="https://cosmos.aguidetocloud.com/?planet=earth"
//      title="Open the cosmos atlas">
//   </a>
//   <script src="https://cosmos.aguidetocloud.com/mini-cosmos.js" defer></script>
//
// The script finds every .mini-cosmos[data-current] anchor on the page and
// mounts a 60×60 canvas inside it: a tiny rotating solar system with the
// current planet highlighted. The whole anchor links to the full atlas.
//
// Self-contained — no external fetch, no canvas framework, no localStorage.
// One IIFE, ~80 LOC. Honours prefers-reduced-motion (no animation, just
// a static still of the cosmos).

(function () {
  'use strict';

  // Hardcoded vendored body data — keep in sync with src/data/atlas.json.
  // Each entry: [slug, orbit-radius (0..1), angle-offset (rad), glow-colour].
  // Radii are normalised so the widget works at any size.
  var BODIES = [
    ['earth',     0.36, 0.0,  '#A5B4FC'],
    ['guided',    0.36, 0.0,  '#E0D7BE'], // moon overlap with earth
    ['brainbar',  0.50, 1.6,  '#86EFAC'],
    ['shift',     0.62, 3.1,  '#FDBA74'],
    ['plainai',   0.74, 4.7,  '#A78BFA'],
    ['curriculum',0.74, 4.7,  '#22C55E'], // moon overlap with plainai
    ['agentic',   0.86, 0.6,  '#7DD3FC'],
    ['claw',      0.92, 2.2,  '#FF6B6B'],
  ];
  var ACCENT = '#FFB347';
  var BG = '#02030E';
  var REDUCED = false;
  try { REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

  function mount(host) {
    var current = host.dataset.current || 'earth';
    var size = parseInt(host.dataset.size || '60', 10);
    if (!Number.isFinite(size) || size < 32) size = 60;
    host.style.display = 'inline-block';
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    host.style.position = 'relative';
    host.setAttribute('aria-label', host.getAttribute('aria-label') || 'Open the cosmos atlas');
    var canvas = document.createElement('canvas');
    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.style.display = 'block';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    var cx = size / 2;
    var cy = size / 2;

    function frame(now) {
      // Sub-frame time scaled so a full rotation takes ~24s.
      var t = REDUCED ? 0 : (now / 24000) * Math.PI * 2;
      ctx.clearRect(0, 0, size, size);

      // Background ink — slightly lighter at centre.
      var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.55);
      bg.addColorStop(0, '#0a0c1f');
      bg.addColorStop(1, BG);
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.49, 0, Math.PI * 2); ctx.fill();

      // Sun — soft amber pulse at centre.
      var pulse = REDUCED ? 0.85 : 0.78 + 0.22 * Math.abs(Math.sin(now / 1800));
      var sunR = size * 0.07;
      var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.32);
      halo.addColorStop(0, 'rgba(255, 233, 196,' + (0.75 * pulse) + ')');
      halo.addColorStop(0.4, 'rgba(255, 216, 154,' + (0.32 * pulse) + ')');
      halo.addColorStop(1, 'rgba(255, 179, 71, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 233, 196,' + (0.95 * pulse) + ')';
      ctx.beginPath(); ctx.arc(cx, cy, sunR, 0, Math.PI * 2); ctx.fill();

      // Bodies — dots on rings.
      for (var i = 0; i < BODIES.length; i++) {
        var b = BODIES[i];
        var slug = b[0]; var rN = b[1]; var phase = b[2]; var color = b[3];
        var r = rN * size * 0.42;
        var angle = phase + t;
        var x = cx + Math.cos(angle) * r;
        var y = cy + Math.sin(angle) * r;
        var isCurrent = slug === current;
        var dotR = isCurrent ? 3.4 : 2.0;
        if (isCurrent) {
          // Highlight the current planet with an amber halo.
          ctx.fillStyle = 'rgba(255, 216, 154, 0.45)';
          ctx.beginPath(); ctx.arc(x, y, dotR + 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2); ctx.fill();
      }

      if (!REDUCED) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function init() {
    var hosts = document.querySelectorAll('.mini-cosmos[data-current]');
    for (var i = 0; i < hosts.length; i++) {
      try { mount(hosts[i]); } catch (e) { console.warn('[mini-cosmos]', e); }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
