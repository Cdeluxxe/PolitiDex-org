#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — push the committed member map into Netlify Blobs
// ─────────────────────────────────────────────────────────────────────────────
// The ingest (netlify/lib/vr-ingest.ts) resolves a Bioguide ID to a roster slug via
// the vr-config / member-map blob, and falls back to the committed db/vr-member-map.json
// when that blob is empty. This script is the OPTIONAL step to load (or refresh) the
// Blobs override — useful when an operator wants to extend or correct the map at
// runtime without a redeploy. If you never run it, the committed seed is used.
//
// Usage (run from the repo root):
//   # Inside a Netlify context (e.g. `netlify dev` shell), zero config:
//   node scripts/vr-load-member-map.mjs
//
//   # Standalone (CI / laptop) — provide site + a personal access token:
//   NETLIFY_SITE_ID=<site-id> NETLIFY_API_TOKEN=<pat> node scripts/vr-load-member-map.mjs
//
// It writes ONLY the { bioguide: slug } object (the shape loadMemberMap expects) and
// prints a count — never any secret. Verify afterward with GET /api/vr-ingest/verify.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getStore } from "@netlify/blobs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = "vr-config";
const KEY = "member-map";

const doc = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
const map = doc.map || {};
const n = Object.keys(map).length;
if (!n) {
  console.error("✗ db/vr-member-map.json has an empty `.map` — run scripts/vr-gen-member-map.mjs first");
  process.exit(1);
}

const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
const store =
  siteID && token
    ? getStore({ name: STORE, siteID, token, consistency: "strong" })
    : getStore(STORE); // zero-config inside a Netlify environment

try {
  await store.setJSON(KEY, map);
  console.log(`✓ pushed ${n} bioguide→slug entries to Blobs store "${STORE}" key "${KEY}"`);
} catch (e) {
  console.error("✗ Blobs write failed:", e?.message || String(e));
  console.error("  If running standalone, set NETLIFY_SITE_ID and NETLIFY_API_TOKEN and retry.");
  process.exit(1);
}
