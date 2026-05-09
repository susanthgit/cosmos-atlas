// scripts/blog-feed.mjs — fetch the latest blog posts from Hugo's RSS
// (https://www.aguidetocloud.com/index.xml) and write the most recent N
// to src/data/blog-feed.json. Runs at build time, baked into the static
// bundle. No client-side fetch (avoids CORS, no extra runtime cost).
//
// Cosmos Atlas reads this file at runtime to render a small asteroid belt
// of dots around Earth — each dot is one recent blog post. Click → opens
// that post.
//
// Network failure is non-fatal: previous blog-feed.json is preserved and a
// warning is logged.

import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/blog-feed.json');
const FEED_URL = 'https://www.aguidetocloud.com/index.xml';
const KEEP_LAST_N = 6;
const TIMEOUT_MS = 8000;

async function fetchWithTimeout(target, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { 'User-Agent': 'cosmos-atlas-blog-feed/1.0 (+https://cosmos.aguidetocloud.com/)' },
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function parseRss(xml) {
  const items = [];
  // Match <item>...</item> blocks. Hugo RSS keeps things flat (no namespaces).
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const pub = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    const guid = (block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) || [])[1] || '';
    if (!title || !link) continue;
    // Hugo's root index.xml mixes blog + mind-maps + tools — filter to /blog/ only.
    // The cosmos blog asteroid belt is specifically the long-form blog,
    // not mind-maps (those are part of Earth's content already).
    if (!/\/blog\//i.test(link)) continue;
    const d = new Date(pub.trim());
    items.push({
      title: title.trim(),
      url: link.trim(),
      pubDate: !isNaN(d.getTime()) ? d.toISOString() : null,
      guid: guid.trim(),
    });
  }
  return items;
}

async function preservePrevious(reason) {
  try {
    const existing = await fs.readFile(OUT, 'utf-8');
    console.warn(`[blog-feed] ${reason} — keeping existing data`);
    return JSON.parse(existing);
  } catch {
    console.warn(`[blog-feed] ${reason} — no previous data, writing empty list`);
    return { _generatedAt: new Date().toISOString(), _source: FEED_URL, posts: [] };
  }
}

async function main() {
  let payload;
  try {
    const res = await fetchWithTimeout(FEED_URL, TIMEOUT_MS);
    if (!res.ok) {
      payload = await preservePrevious(`HTTP ${res.status} on ${FEED_URL}`);
    } else {
      const xml = await res.text();
      const all = parseRss(xml);
      // RSS is typically newest-first; sort defensively by pubDate desc.
      all.sort((a, b) => {
        const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
        const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
        return tb - ta;
      });
      const posts = all.slice(0, KEEP_LAST_N).map((p) => ({
        title: p.title,
        url: p.url,
        pubDate: p.pubDate,
      }));
      payload = {
        _generatedAt: new Date().toISOString(),
        _source: FEED_URL,
        posts,
      };
    }
  } catch (err) {
    payload = await preservePrevious(`fetch failed (${err.message ?? err})`);
  }

  await fs.writeFile(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  const count = (payload.posts ?? []).length;
  console.log(`💾 Wrote ${path.relative(ROOT, OUT)} (${count} post${count === 1 ? '' : 's'})`);
}

main().catch((err) => {
  console.error('[blog-feed] fatal:', err);
  // Don't break the build; ensure an empty file exists so Astro's import works.
  fs.writeFile(OUT, JSON.stringify({ _generatedAt: new Date().toISOString(), _source: FEED_URL, posts: [] }, null, 2) + '\n')
    .catch(() => {})
    .finally(() => process.exit(0));
});
