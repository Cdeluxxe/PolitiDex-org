#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — headshot coverage audit for the share / arrival surfaces
// ─────────────────────────────────────────────────────────────────────────────
// Every surface that shows a face reads window._getPhotoUrl(pid) (index.html), which
// resolves in three tiers:
//
//   1. PROFILES[pid].photo    — the live Firestore roster. Runtime only.
//   2. CMP_DATA[pid].photo    — the bundled light roster. Carries no photos today.
//   3. BROWSE_PHOTOS[pid]     — the curated map embedded in index.html. Bundled.
//
// Tier 1 is the one this audit deliberately does NOT count. A shared Official Record
// card is opened cold: the reader taps an image, lands on #record=<pid>~<issue>, and
// the arrival sheet paints before — or entirely without — a Firestore round trip. So
// the face a shared link actually shows is decided by the BUNDLED tiers, and a member
// who only has a Firestore photo still arrives as initials on the first paint. That is
// the gap this audit measures, and it is measurable offline with no network and no key.
//
//   node scripts/audit-photo-coverage.mjs            # coverage report
//   node scripts/audit-photo-coverage.mjs --gaps     # just the missing pids, one per line
//   node scripts/audit-photo-coverage.mjs --urls     # every distinct photo host, counted
//
// Populations, in the order the request asks about them:
//
//   ARRIVAL   — every roster slug in db/vr-member-map.json. The Voting Record ingest
//               attributes a roll call to a member only through that map, so a member
//               absent from it can have no vote-derived Official Record card and no
//               #record= arrival. This set IS the share pool's ceiling.
//   FEDERAL   — CMP_DATA records whose office is a federal one. The high-visibility
//               figures the request asks to prioritise after the share pool.
//   ROSTER    — every CMP_DATA record, for context only.
//
// READ-ONLY. This script never writes and never fetches.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── BROWSE_PHOTOS, parsed out of index.html ─────────────────────────────────
// Same extraction scripts/vr-gen-member-map.mjs uses, so the two agree on what the
// map contains. Values are single-quoted string literals, one entry per line.
export function browsePhotos() {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  const open = html.indexOf("var BROWSE_PHOTOS = {");
  if (open === -1) throw new Error("BROWSE_PHOTOS map not found in index.html");
  const close = html.indexOf("\n    };", open);
  if (close === -1) throw new Error("BROWSE_PHOTOS map is unterminated in index.html");
  const out = {};
  for (const m of html.slice(open, close).matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*'([^']+)'/gm)) {
    out[m[1]] = m[2];
  }
  return out;
}

// ── CMP_DATA, loaded the way the browser loads it ───────────────────────────
export function cmpData() {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx;
  const sandbox = vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, "cmp-data.js"), "utf8"), sandbox, { filename: "cmp-data.js" });
  return ctx.CMP_DATA || ctx.window.CMP_DATA || {};
}

// ── The vote-derived share pool's ceiling ───────────────────────────────────
export function arrivalSlugs() {
  const mm = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
  const byBioguide = new Map();
  for (const [bioguide, slug] of Object.entries(mm.map || {})) byBioguide.set(slug, bioguide);
  return byBioguide; // slug → bioguide
}

// Federal offices, matched on the office string CMP_DATA actually stores.
const FEDERAL_RE = /^(U\.S\. (Representative|Senator|President|Vice President)|Secretary|Attorney General|Administrator|Director|Chair|Ambassador|Surgeon General|Speaker)/i;

// The bundled tier only. Mirrors _getPhotoUrl minus the Firestore tier.
export function bundledPhoto(pid, bp, cmp) {
  const d = cmp[pid];
  if (d && d.photo && String(d.photo).trim()) return String(d.photo);
  if (bp[pid] && String(bp[pid]).trim()) return String(bp[pid]);
  return "";
}

// A value _getPhotoUrl would hand to an <img>. consistency.js's arrival sheet only
// accepts http(s)/root-relative/data: — an emoji or a bare word in the slot is a
// broken frame everywhere else, so it counts as a gap here too.
const URLISH = /^(https?:\/\/|\/|data:image\/)/i;

// ── CLI ─────────────────────────────────────────────────────────────────────
// Everything below runs only when this file is invoked directly. The exports above
// are imported by scripts/test-photo-coverage.mjs, which must not inherit a report
// printed to stdout or a process.exit().
const DIRECT = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!DIRECT) { /* imported as a module — nothing else to do */ } else {

const bp = browsePhotos();
const cmp = cmpData();
const arrivals = arrivalSlugs();

const args = process.argv.slice(2);

// ── --urls: every host the curated map depends on ───────────────────────────
if (args.includes("--urls")) {
  const hosts = new Map();
  for (const url of Object.values(bp)) {
    const h = (String(url).split("/")[2] || "(malformed)").toLowerCase();
    hosts.set(h, (hosts.get(h) || 0) + 1);
  }
  for (const [h, n] of [...hosts].sort((a, b) => b[1] - a[1])) {
    console.log(String(n).padStart(4) + "  " + h);
  }
  process.exit(0);
}

// ── Coverage per population ─────────────────────────────────────────────────
const rows = [];
const check = (label, pids) => {
  const have = [], missing = [], malformed = [];
  for (const pid of pids) {
    const url = bundledPhoto(pid, bp, cmp);
    if (!url) missing.push(pid);
    else if (!URLISH.test(url)) malformed.push(pid + " → " + url);
    else have.push(pid);
  }
  rows.push({ label, total: pids.length, have: have.length, missing, malformed });
};

check("ARRIVAL pool (vr-member-map slugs)", [...arrivals.keys()].sort());
check("FEDERAL roster (CMP_DATA)",
  Object.keys(cmp).filter((p) => FEDERAL_RE.test(String((cmp[p] && cmp[p].office) || ""))).sort());
check("FULL roster (CMP_DATA)", Object.keys(cmp).sort());

// ── --gaps: machine-readable, arrival pool first ────────────────────────────
if (args.includes("--gaps")) {
  for (const r of rows) {
    for (const pid of r.missing) {
      const bio = arrivals.get(pid);
      console.log([pid, r.label.split(" ")[0], bio || "-", (cmp[pid] && cmp[pid].name) || "?"].join("\t"));
    }
    if (r.label.startsWith("ARRIVAL")) break; // the pool that matters for share links
  }
  process.exit(0);
}

console.log("PolitiDex headshot coverage — bundled tiers only (CMP_DATA → BROWSE_PHOTOS)");
console.log("A Firestore-only photo does not count: a cold #record= arrival paints before it lands.\n");
console.log(`BROWSE_PHOTOS entries: ${Object.keys(bp).length}   CMP_DATA records: ${Object.keys(cmp).length}\n`);

let arrivalGaps = [];
for (const r of rows) {
  const pct = r.total ? Math.round((100 * r.have) / r.total) : 0;
  console.log(`${r.label}`);
  console.log(`  ${r.have}/${r.total} resolve a bundled photo  (${pct}%)`);
  if (r.malformed.length) {
    console.log(`  ⚠ ${r.malformed.length} value(s) are not a usable image URL:`);
    for (const m of r.malformed) console.log("      " + m);
  }
  if (r.label.startsWith("ARRIVAL")) {
    arrivalGaps = r.missing;
    if (r.missing.length) {
      console.log(`  ✖ ${r.missing.length} would arrive on initials:`);
      for (const pid of r.missing) {
        const d = cmp[pid] || {};
        console.log(`      ${pid.padEnd(20)} ${(d.name || "(not in CMP_DATA)").padEnd(24)} ` +
          `${(d.office || "").padEnd(20)} bioguide ${arrivals.get(pid) || "-"}`);
      }
    }
  } else if (r.missing.length) {
    console.log(`  · ${r.missing.length} without a bundled photo (initials fallback)`);
  }
  console.log("");
}

// The arrival pool is the one with a hard requirement: a shared link must not open
// on initials, because the share image itself showed a face.
if (arrivalGaps.length) {
  console.log(`RESULT: ${arrivalGaps.length} member(s) in the share/arrival pool have no bundled photo.`);
  process.exitCode = 0; // a report, not a gate — scripts/test-photo-coverage.mjs is the gate
} else {
  console.log("RESULT: every member in the share/arrival pool resolves a bundled photo.");
}

} // end DIRECT
