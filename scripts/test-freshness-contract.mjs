#!/usr/bin/env node
/**
 * Producer → consumer contract test for the freshness pipeline.
 * ════════════════════════════════════════════════════════════════════════════
 * Why this exists: scripts/freshness.mjs ran clean for four months while
 * scripts/emit-cosmos-bar.mjs never opened its output, so the cosmos bar showed
 * hand-bumped dates and every freshness dot was dead. A green producer proves
 * nothing if nobody reads it.
 *
 * Deterministic and offline — it only inspects artifacts already on disk, so it
 * is safe to run in prebuild/deploy. Run AFTER emit-cosmos-bar.mjs.
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const readJson = async (rel) => JSON.parse(await readFile(resolve(root, rel), 'utf-8'));

const bar = await readJson('public/atlas-bar.json');
const atlas = await readJson('src/data/atlas.json');

let freshness = { planets: {} };
try {
  freshness = await readJson('src/data/freshness.json');
} catch (err) {
  if (err?.code !== 'ENOENT') throw err;
}
const auto = freshness.planets ?? {};

// Manual dates, keyed by slug, from the canonical atlas source.
const manual = {};
for (const p of atlas.planets ?? []) {
  if (p.slug) manual[p.slug] = p.lastShippedAt;
  for (const m of p.moons ?? []) if (m.slug) manual[m.slug] = m.lastShippedAt;
}
if (atlas.mcp?.slug) manual[atlas.mcp.slug] = atlas.mcp.lastShippedAt;

const valid = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const newest = (...vs) => {
  const ok = vs.filter(valid);
  return ok.length ? ok.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a)) : null;
};

check(Array.isArray(bar.bodies) && bar.bodies.length > 0, 'atlas-bar.json has no bodies');

// T1 — the bar must equal newest(auto, manual). This is what proves the bar
// actually consumes freshness.json rather than reading atlas.json alone.
for (const b of bar.bodies) {
  const expected = newest(auto[b.slug]?.lastShippedAt, manual[b.slug]);
  const actual = b.lastShippedAt ?? null;
  check(
    actual === expected,
    `${b.slug}: bar has ${actual}, expected ${expected} (auto=${auto[b.slug]?.lastShippedAt ?? '—'}, manual=${manual[b.slug] ?? '—'})`
  );
}

// T2 — every automatic entry must record the URL path it was measured from.
// Without per-body scoping, bodies sharing a host (earth+guided, plainai+
// curriculum) inherit the host-wide max and a quiet body looks as fresh as a
// busy sibling. That is a false positive on a public widget — Rule #19.
for (const [slug, entry] of Object.entries(auto)) {
  check(
    typeof entry.scope === 'string' && entry.scope.startsWith('/'),
    `${slug}: freshness.json entry has no scope path — host-wide misattribution may have returned`
  );
}

// T3 — nothing may claim to have shipped in the future.
const tomorrow = Date.now() + 86400000;
for (const b of bar.bodies) {
  check(!valid(b.lastShippedAt) || Date.parse(b.lastShippedAt) < tomorrow,
    `${b.slug}: lastShippedAt ${b.lastShippedAt} is in the future`);
}

if (failures.length) {
  console.error(`\n❌ freshness contract FAILED — ${failures.length} problem(s):`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`✓ freshness contract OK — ${bar.bodies.length} bodies, ${Object.keys(auto).length} auto-dated`);
