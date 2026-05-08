// deploy.mjs — Direct upload to Cloudflare Pages for cosmos-atlas
//
// Adapted from plainai/deploy.mjs (same pattern). Implements Cloudflare's Pages
// direct-upload API end-to-end:
//   1. Get upload JWT
//   2. Hash every file in dist/ with BLAKE3 (matches wrangler's algorithm)
//   3. Check which assets are missing on Cloudflare
//   4. Upload missing assets in batches
//   5. Create a production deployment
//
// Why direct-upload instead of `wrangler pages deploy`?
//   wrangler depends on workerd, which has no Windows ARM64 binary at the time
//   this was written (May 2026). Direct API calls work on every platform.
//
// Usage:
//   npm run deploy
//
// Requires:
//   - @noble/hashes installed (saved as devDep)
//   - Either CLOUDFLARE_API_TOKEN env var (CI) OR
//     a token at ~/.copilot/secrets/cloudflare-api-token (local dev)

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { blake3 } from '@noble/hashes/blake3.js';

const ACCOUNT_ID = 'd42846fe2c29daf890ec57877fda5e04';
const PROJECT_NAME = 'cosmos-atlas';
const BRANCH = process.argv[2] || 'main';
const DIST = './dist';

const CF_API = 'https://api.cloudflare.com/client/v4';
const TOKEN_PATH = path.join(os.homedir(), '.copilot', 'secrets', 'cloudflare-api-token');

const cfToken = (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN
  ? (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN)
  : (await fs.readFile(TOKEN_PATH, 'utf8'))).trim();

const SPECIAL = new Set(['_headers', '_redirects', '_routes.json', '_worker.js']);

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  ico: 'image/x-icon',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml',
};

async function cf(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${cfToken}`,
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!data.success) {
    console.error(`CF API failed: ${url}\n`, JSON.stringify(data, null, 2));
    throw new Error(`CF API failed: ${data.errors?.[0]?.message || res.status}`);
  }
  return data.result;
}

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full, base)));
    } else if (entry.isFile()) {
      const rel = path.relative(base, full).replace(/\\/g, '/');
      out.push({ rel, full });
    }
  }
  return out;
}

console.log(`📦 Bundling ${DIST}/...`);
const allFiles = await walk(DIST);
console.log(`  ${allFiles.length} files`);

const specialFiles = [];
const assetFiles = [];
for (const f of allFiles) {
  if (SPECIAL.has(f.rel)) specialFiles.push(f);
  else assetFiles.push(f);
}
console.log(`  ${assetFiles.length} assets · ${specialFiles.length} special (${specialFiles.map(s => s.rel).join(', ') || 'none'})`);

console.log(`🔢 Hashing assets...`);
const assets = await Promise.all(assetFiles.map(async f => {
  const content = await fs.readFile(f.full);
  const base64 = content.toString('base64');
  const ext = path.extname(f.rel).slice(1).toLowerCase();
  const hashInput = base64 + ext;
  const hashBytes = blake3(new TextEncoder().encode(hashInput));
  const hashHex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = hashHex.slice(0, 32);
  return {
    rel: '/' + f.rel,
    hash,
    base64,
    contentType: CONTENT_TYPES[ext] || 'application/octet-stream',
  };
}));
console.log(`  ${assets.length} assets hashed`);

console.log(`🔑 Getting upload JWT...`);
const jwtRes = await cf(`${CF_API}/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/upload-token`);
const jwt = jwtRes.jwt;
console.log(`  got JWT (${jwt.length} chars)`);

console.log(`🔍 Checking which assets Cloudflare already has...`);
const allHashes = assets.map(a => a.hash);
const missingRes = await fetch(`${CF_API}/pages/assets/check-missing`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ hashes: allHashes }),
});
const missingData = await missingRes.json();
if (!missingData.success) {
  console.error('check-missing failed:', JSON.stringify(missingData, null, 2));
  process.exit(1);
}
const missing = new Set(missingData.result);
console.log(`  ${missing.size} of ${assets.length} need uploading (${assets.length - missing.size} cached)`);

const toUpload = assets.filter(a => missing.has(a.hash));
const BATCH_SIZE = 20;
let uploaded = 0;
for (let i = 0; i < toUpload.length; i += BATCH_SIZE) {
  const batch = toUpload.slice(i, i + BATCH_SIZE);
  const payload = batch.map(a => ({
    key: a.hash,
    value: a.base64,
    metadata: { contentType: a.contentType },
    base64: true,
  }));
  const res = await fetch(`${CF_API}/pages/assets/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    console.error('upload batch failed:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
  uploaded += batch.length;
  process.stdout.write(`\r  uploaded ${uploaded} / ${toUpload.length}`);
}
console.log(toUpload.length > 0 ? '' : '  (nothing to upload)');

const manifest = Object.fromEntries(assets.map(a => [a.rel, a.hash]));

console.log(`🚀 Creating deployment...`);
const form = new FormData();
form.append('manifest', JSON.stringify(manifest));
form.append('branch', BRANCH);
for (const sf of specialFiles) {
  const content = await fs.readFile(sf.full);
  form.append(sf.rel, new Blob([content]), sf.rel);
}
const deployRes = await fetch(`${CF_API}/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${cfToken}` },
  body: form,
});
const deployData = await deployRes.json();
if (!deployData.success) {
  console.error('deployment failed:', JSON.stringify(deployData, null, 2));
  process.exit(1);
}
const dep = deployData.result;
console.log(`  ✓ deployment ${dep.id.slice(0, 8)} created`);
console.log(`  url:        ${dep.url}`);
console.log(`  aliases:    ${(dep.aliases || []).join(', ') || '(none)'}`);
console.log(`  stage:      ${dep.latest_stage?.name || '?'}`);
console.log(`\n🌍 Live at: ${dep.url}`);
