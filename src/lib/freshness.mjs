/**
 * Single source of truth for "when did this body last ship?".
 * ════════════════════════════════════════════════════════════════════════════
 * Two surfaces render this: the orbital cosmos (src/pages/index.astro) and the
 * embeddable cosmos-bar feed (scripts/emit-cosmos-bar.mjs). They used to apply
 * different rules to the same field, so the same body could show two different
 * dates on two public surfaces. Both now import this.
 *
 * Rule: NEWEST VALID of (automatic sitemap-derived, manual atlas.json).
 * Automatic does not simply win, because scripts/freshness.mjs deliberately
 * PRESERVES a stale automatic date when a host stops publishing <lastmod> —
 * letting it override would permanently mask a newer hand-bump.
 */

/** @param {unknown} v */
export function isValidDate(v) {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

/**
 * @param {Record<string, { lastShippedAt?: string }> | undefined} autoMap
 * @param {string} slug
 * @param {string | undefined | null} manual
 * @returns {string | null}
 */
export function resolveLastShipped(autoMap, slug, manual) {
  const candidates = [autoMap?.[slug]?.lastShippedAt, manual].filter(isValidDate);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
}
