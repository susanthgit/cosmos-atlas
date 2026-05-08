// scripts/freshness.mjs — fetch each planet's sitemap.xml and write the latest
// lastmod date to src/data/freshness.json. Replaces the manual lastShippedAt
// in atlas.json (cosmos.ts merges this with atlas as a higher-priority signal).
//
// Why: the cosmos atlas pulses bodies whose `lastShippedAt` is within 14 days.
// Manually maintaining that meant Sush had to bump dates every time something
// shipped on a planet. With this script in the build pipeline, the cosmos
// auto-pulses based on real ship signals.
//
// Behaviour:
//   - Fetches https://<host>/sitemap.xml for each unique planet URL.
//   - Parses with a tiny regex (no XML lib — sitemaps are simple urlsets).
//   - Picks the maximum <lastmod> across the whole sitemap.
//   - Writes src/data/freshness.json mapping slug → ISO date.
//   - Network failures are non-fatal: the previous freshness.json is preserved
//     and a warning is logged. Build does not break.
//   - Skips slugs whose URL is missing/empty (e.g. moons without sites).
//
// Usage:
//   node scripts/freshness.mjs            # rebuild from network
//   node scripts/freshness.mjs --offline  # skip network, just rewrite file from existing
//
// Run automatically via `npm run prebuild` (added in package.json).

import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PLANETS_JSON = path.join(ROOT, 'src/data/planets.json');
const ATLAS_JSON = path.join(ROOT, 'src/data/atlas.json');
const OUT = path.join(ROOT, 'src/data/freshness.json');

const TIMEOUT_MS = 8000;
const argv = new Set(process.argv.slice(2));
const OFFLINE = argv.has('--offline');

async function fetchWithTimeout(target, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { 'User-Agent': 'cosmos-atlas-freshness/1.0 (+https://cosmos.aguidetocloud.com/)' },
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function parseLastmodFromSitemap(xml) {
  const dates = [];
  const re = /<lastmod[^>]*>([^<]+)<\/lastmod>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const raw = m[1].trim();
    const d = new Date(raw);
    if (!isNaN(d.getTime())) dates.push(d);
  }
  if (dates.length === 0) return null;
  dates.sort((a, b) => b.getTime() - a.getTime());
  return dates[0];
}

async function getMaxLastmod(siteUrl) {
  // Try /sitemap.xml first; some sites (e.g. Astro) ship sitemap-index.xml
  const host = siteUrl.replace(/\/+$/, '');
  const tries = [`${host}/sitemap.xml`, `${host}/sitemap-index.xml`, `${host}/sitemap_index.xml`];
  for (const target of tries) {
    try {
      const res = await fetchWithTimeout(target, TIMEOUT_MS);
      if (!res.ok) continue;
      const text = await res.text();
      // sitemap-index — recurse into child sitemaps
      if (/<sitemapindex[\s>]/i.test(text)) {
        const childUrls = [...text.matchAll(/<sitemap[^>]*>[\s\S]*?<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
        const childDates = [];
        for (const child of childUrls.slice(0, 10)) {
          try {
            const cr = await fetchWithTimeout(child, TIMEOUT_MS);
            if (!cr.ok) continue;
            const ct = await cr.text();
            const d = parseLastmodFromSitemap(ct);
            if (d) childDates.push(d);
          } catch (_) { /* ignore */ }
        }
        if (childDates.length === 0) continue;
        childDates.sort((a, b) => b.getTime() - a.getTime());
        return { date: childDates[0], source: target };
      }
      const d = parseLastmodFromSitemap(text);
      if (d) return { date: d, source: target };
    } catch (_) { /* try next */ }
  }
  return null;
}

function isoDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const planetsRaw = await fs.readFile(PLANETS_JSON, 'utf8');
  const planets = JSON.parse(planetsRaw);
  const atlasRaw = await fs.readFile(ATLAS_JSON, 'utf8');
  const atlas = JSON.parse(atlasRaw);

  // Read existing freshness if present so we can preserve entries on network failure.
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(OUT, 'utf8'));
  } catch (_) { existing = {}; }

  // Collect (slug, url) pairs from atlas planets/moons + mcp + planet manifest.
  const targets = new Map(); // slug → url
  for (const p of planets.planets ?? []) {
    if (p.slug && p.url) targets.set(p.slug, p.url);
  }
  for (const p of atlas.planets ?? []) {
    if (p.slug && p.url && !targets.has(p.slug)) targets.set(p.slug, p.url);
    for (const moon of p.moons ?? []) {
      if (moon.slug && moon.url && !targets.has(moon.slug)) targets.set(moon.slug, moon.url);
    }
  }
  if (atlas.mcp?.slug && atlas.mcp?.url) targets.set(atlas.mcp.slug, atlas.mcp.url);

  // Group by host so we don't fetch the same sitemap twice (Earth + moon Guided share aguidetocloud.com).
  const byHost = new Map(); // host → { slugs: [], firstUrl }
  for (const [slug, planetUrl] of targets) {
    try {
      const u = new URL(planetUrl);
      const host = `${u.protocol}//${u.host}`;
      if (!byHost.has(host)) byHost.set(host, { slugs: [], firstUrl: planetUrl });
      byHost.get(host).slugs.push(slug);
    } catch (_) { /* skip malformed */ }
  }

  const now = new Date();
  const result = { _generatedAt: now.toISOString(), _source: 'sitemap.xml lastmod', planets: { ...(existing.planets ?? {}) } };

  if (OFFLINE) {
    console.log('🔌 Offline mode — re-writing existing freshness.json without network fetches');
  } else {
    let okCount = 0;
    let failCount = 0;
    for (const [host, info] of byHost) {
      try {
        const found = await getMaxLastmod(host);
        if (!found) {
          console.warn(`⚠️  No lastmod for ${host}: keeping existing data`);
          failCount++;
          continue;
        }
        const dateStr = isoDateOnly(found.date);
        for (const slug of info.slugs) {
          result.planets[slug] = { lastShippedAt: dateStr, source: found.source };
        }
        const ago = Math.max(0, Math.round((now.getTime() - found.date.getTime()) / 86400000));
        console.log(`✓ ${host} → ${dateStr} (${ago}d ago) — applied to: ${info.slugs.join(', ')}`);
        okCount++;
      } catch (err) {
        console.warn(`⚠️  Failed to fetch ${host}: ${err.message ?? err}`);
        failCount++;
      }
    }
    console.log(`\n→ ${okCount} hosts updated · ${failCount} preserved from previous data`);
  }

  await fs.writeFile(OUT, JSON.stringify(result, null, 2) + '\n');
  console.log(`💾 Wrote ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.warn('⚠️  freshness.mjs failed (non-fatal):', err.message ?? err);
  // Exit 0 so the build doesn't break on transient network issues.
  process.exit(0);
});
