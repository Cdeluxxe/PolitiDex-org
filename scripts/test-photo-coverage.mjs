#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — the share / arrival pool must never open on initials
// ─────────────────────────────────────────────────────────────────────────────
// An Official Record share card is an image with a real face on it. The reader
// taps it, lands on #record=<pid>~<issue>, and the arrival sheet paints before —
// or entirely without — a Firestore round trip. If that member's only photo lives
// in Firestore, the shared card showed a face and the page it opens shows a
// party-tinted medallion instead. Same person, two different faces, one of them
// no face at all.
//
// So every member who can be the subject of a vote-derived Official Record card
// must resolve a photo from the BUNDLED tiers alone (CMP_DATA → BROWSE_PHOTOS).
// That pool is exactly the slug set of db/vr-member-map.json, because the Voting
// Record ingest attributes a roll call to a member only through that map.
//
// This test fails when someone widens the member map without adding a face, and
// when a curated photo value stops being a usable image URL. It deliberately does
// NOT assert a floor for the wider roster — initials are the honest fallback there
// and pretending otherwise would just invite invented photos.
//
//   node scripts/test-photo-coverage.mjs
//
// READ-ONLY, offline. No network, no key.
// ─────────────────────────────────────────────────────────────────────────────

import { browsePhotos, cmpData, arrivalSlugs, bundledPhoto, pageSource } from "./audit-photo-coverage.mjs";

let pass = 0;
const fails = [];
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };

const bp = browsePhotos();
const cmp = cmpData();
const arrivals = arrivalSlugs(); // slug → bioguide

// consistency.js's arrival sheet accepts only these forms in the photo slot; an
// emoji or a bare word there is a broken frame, not a photo.
const URLISH = /^(https?:\/\/|\/|data:image\/)/i;

// ── The map itself parsed at all ─────────────────────────────────────────────
ok(Object.keys(bp).length > 300, `BROWSE_PHOTOS parsed only ${Object.keys(bp).length} entries — did the map's shape change?`);
ok(arrivals.size > 0, "db/vr-member-map.json yielded no slugs");

// ── Every arrival-pool member resolves a bundled photo ──────────────────────
const noFace = [];
for (const slug of [...arrivals.keys()].sort()) {
  const url = bundledPhoto(slug, bp, cmp);
  if (!url) noFace.push(`${slug} (bioguide ${arrivals.get(slug)})`);
  else ok(URLISH.test(url), `${slug}: photo value is not a usable image URL — ${url}`);
}
ok(noFace.length === 0,
  `${noFace.length} member(s) in the share/arrival pool have no bundled photo, so a shared ` +
  `#record= link opens on initials after showing a face:\n      ` + noFace.join("\n      "));

// ── Every curated value is a usable image URL, pool or not ──────────────────
const malformed = Object.entries(bp).filter(([, v]) => !URLISH.test(String(v)));
ok(malformed.length === 0,
  `BROWSE_PHOTOS holds ${malformed.length} value(s) that are not an image URL: ` +
  malformed.map(([k]) => k).join(", "));

// ── No duplicate keys ───────────────────────────────────────────────────────
// browsePhotos() returns an object, so a duplicate key would silently win and
// quietly replace a curated photo. Count the source lines instead — reading the
// same page source browsePhotos() parses, so the two cannot disagree about where
// the map lives. (It moved from an inline block in index.html into compare-hub.js
// during the first-paint pass; pageSource() spans the document and the scripts it
// loads, so neither this check nor the parse cares which file it sits in.)
const html = pageSource();
const open = html.indexOf("var BROWSE_PHOTOS = {");
const body = html.slice(open, html.indexOf("\n    };", open));
const seen = new Set(); const dups = [];
for (const m of body.matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*'/gm)) {
  if (seen.has(m[1])) dups.push(m[1]); else seen.add(m[1]);
}
ok(dups.length === 0, `BROWSE_PHOTOS declares ${dups.length} duplicate key(s), so a curated photo is being overwritten: ${dups.join(", ")}`);
ok(seen.size === Object.keys(bp).length,
  `line-scan found ${seen.size} keys but the parsed map has ${Object.keys(bp).length}`);

// ── Hosts stay on the trusted, already-used set ─────────────────────────────
// Not a style rule — a new host is a new availability and a new trust dependency
// for faces on an accountability app. Widen this list deliberately, not by accident.
const ALLOWED = new Set([
  "raw.githubusercontent.com",   // unitedstates/images — official congressional portraits
  "upload.wikimedia.org",        // Wikimedia Commons, hashed thumb form (legacy)
  "commons.wikimedia.org",       // Wikimedia Commons, hash-independent Special:FilePath
  "bioguide.congress.gov",       // official Bioguide portraits
  "le.utah.gov",                 // official Utah legislature portraits
  "insurance.utah.gov",          // official Utah agency portrait
]);
const strayHosts = new Map();
for (const [k, v] of Object.entries(bp)) {
  if (!/^https?:\/\//i.test(String(v))) continue; // root-relative/data: handled above
  const h = (String(v).split("/")[2] || "").toLowerCase();
  if (!ALLOWED.has(h)) strayHosts.set(h, [...(strayHosts.get(h) || []), k]);
}
ok(strayHosts.size === 0,
  `BROWSE_PHOTOS points at ${strayHosts.size} host(s) outside the trusted set: ` +
  [...strayHosts].map(([h, ks]) => `${h} (${ks.slice(0, 4).join(", ")})`).join("; "));

// ── Report ──────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`✗ photo coverage: ${fails.length} failure(s), ${pass} passed\n`);
  for (const f of fails) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ ${pass} assertions passed — share/arrival pool photo coverage ` +
  `(${arrivals.size}/${arrivals.size} bundled faces, ${Object.keys(bp).length} curated entries)`);
