#!/usr/bin/env node
/**
 * Producer → consumer contract test for the freshness pipeline.
 * ════════════════════════════════════════════════════════════════════════════
 * Why this exists: scripts/freshness.mjs ran clean for four months while
 * scripts/emit-cosmos-bar.mjs never opened its output, so the cosmos bar showed
 * hand-bumped dates and every freshness dot was dead. A green producer proves
 * nothing if nobody reads it.
 *
 * A first version of this test was itself inert: it tolerated a missing or
 * empty freshness.json, so it went green in exactly the pre-fix state. It now
 * asserts the producer actually PRODUCED before checking that the consumer
 * consumed.
 *
 * Deterministic and offline — it only inspects artifacts already on disk, so it
 * is safe to run in prebuild/deploy. Run AFTER emit-cosmos-bar.mjs.
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLastShipped, isValidDate } from '../src/lib/freshness.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// freshness.mjs preserves existing entries on network failure, and the file is
// committed, so this is a floor the pipeline must always clear — offline and in
// CI included.
const MIN_AUTO_BODIES = 4;

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const readJson = async (rel) => JSON.parse(await readFile(resolve(root, rel), 'utf-8'));

const bar = await readJson('public/atlas-bar.json');
const atlas = await readJson('src/data/atlas.json');

// T0 — the producer must have produced. An absent or empty freshness.json IS
// the pre-fix failure state, so it must never be tolerated here.
let freshness = null;
try {
  freshness = await readJson('src/data/freshness.json');
} catch (err) {
  failures.push(
    err?.code === 'ENOENT'
      ? 'src/data/freshness.json is missing — the producer must run before the bar is emitted (`npm run freshness`)'
      : `src/data/freshness.json is unreadable: ${err.message ?? err}`
  );
}
const auto = freshness?.planets ?? {};

if (freshness) {
  check(
    Object.keys(auto).length >= MIN_AUTO_BODIES,
    `freshness.json has ${Object.keys(auto).length} bodies, expected >= ${MIN_AUTO_BODIES} — an empty map silently degrades every check below into "manual only", which is the bug this file guards`
  );
  check(
    isValidDate(freshness._generatedAt) && Date.parse(freshness._generatedAt) < Date.now() + 86400000,
    `freshness.json _generatedAt is missing, unparseable or in the future: ${freshness._generatedAt}`
  );
}

// Manual dates, keyed by slug, from the canonical atlas source.
const manual = {};
for (const p of atlas.planets ?? []) {
  if (p.slug) manual[p.slug] = p.lastShippedAt;
  for (const m of p.moons ?? []) if (m.slug) manual[m.slug] = m.lastShippedAt;
}
if (atlas.mcp?.slug) manual[atlas.mcp.slug] = atlas.mcp.lastShippedAt;

check(Array.isArray(bar.bodies) && bar.bodies.length > 0, 'atlas-bar.json has no bodies');

// T1 — the bar must equal the SHARED precedence rule applied to real data.
// Importing resolveLastShipped rather than re-implementing it means this also
// fails if the emitter stops calling the shared resolver.
let autoWinsSomewhere = false;
for (const b of bar.bodies) {
  const expected = resolveLastShipped(auto, b.slug, manual[b.slug]);
  const actual = b.lastShippedAt ?? null;
  check(
    actual === expected,
    `${b.slug}: bar has ${actual}, expected ${expected} (auto=${auto[b.slug]?.lastShippedAt ?? '—'}, manual=${manual[b.slug] ?? '—'})`
  );
  if (isValidDate(auto[b.slug]?.lastShippedAt)
      && actual === auto[b.slug].lastShippedAt
      && actual !== manual[b.slug]) autoWinsSomewhere = true;
}

// T1b — at least one body's displayed date must come from the automatic feed
// and differ from its manual one. Without this, a bar that ignores
// freshness.json entirely still passes whenever the manual dates happen to be
// newer — precisely how this rotted unnoticed for four months.
check(
  autoWinsSomewhere,
  'no body takes its date from freshness.json — the bar may not be consuming the producer at all'
);

// T2 — every automatic entry must record the host and URL path it was measured
// from, and bodies sharing a host must have DISTINCT scopes. Without per-body
// scoping, siblings (earth+guided, plainai+curriculum) inherit the host-wide
// max and a quiet body looks as fresh as a busy one — a false positive on a
// public widget (Rule #19).
const byHost = new Map();
for (const [slug, entry] of Object.entries(auto)) {
  check(isValidDate(entry.lastShippedAt), `${slug}: freshness entry has no valid lastShippedAt`);
  check(
    typeof entry.scope === 'string' && entry.scope.startsWith('/'),
    `${slug}: freshness entry has no scope path — host-wide misattribution may have returned`
  );
  check(typeof entry.host === 'string' && entry.host.length > 0, `${slug}: freshness entry has no host`);
  if (!byHost.has(entry.host)) byHost.set(entry.host, []);
  byHost.get(entry.host).push({ slug, scope: entry.scope });
}
for (const [host, members] of byHost) {
  if (members.length < 2) continue;
  const scopes = new Set(members.map((m) => m.scope));
  check(
    scopes.size === members.length,
    `${host}: ${members.length} bodies share only ${scopes.size} distinct scope(s) (${members.map((m) => `${m.slug}=${m.scope}`).join(', ')}) — they are inheriting one host-wide date`
  );
}

// T3 — nothing may claim to have shipped in the future.
const tomorrow = Date.now() + 86400000;
for (const b of bar.bodies) {
  check(!isValidDate(b.lastShippedAt) || Date.parse(b.lastShippedAt) < tomorrow,
    `${b.slug}: lastShippedAt ${b.lastShippedAt} is in the future`);
}

if (failures.length) {
  console.error(`\n❌ freshness contract FAILED — ${failures.length} problem(s):`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`✓ freshness contract OK — ${bar.bodies.length} bodies, ${Object.keys(auto).length} auto-dated`);
