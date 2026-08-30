#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-sitemap-bills.mjs — every advertised bill address opens onto a bill
// ─────────────────────────────────────────────────────────────────────────────
// The sitemap now carries 400-odd /b/<sitting>/<number> addresses, and the whole
// risk of that sits in one word: EXACTLY. /b/ is resolved server-side by
// share-preview.ts, which asks /api/voting-record/measure-ref/:sitting/:number,
// which matches `number` with an equality test. Not a LIKE, not a slug lookup,
// not a normalised comparison. So `/b/119/H.R.%206644` opens H.R. 6644 and
// `/b/119/hr-6644` opens nothing at all — same bill, same intent, and one of
// them is a 404 dressed as an index entry.
//
// That is a failure a human reviewer cannot see. Both strings look like a bill
// address; only the resolver knows which one it will honour. So the rules the
// generator followed are asserted here against the two files that define them —
// voting-record.mts for the resolver and vr-measure-addresses.mjs for the
// enumeration — rather than trusted to hold.
//
// What must stay true:
//
//   1. THE ADDRESS FORM IS THE ROUTER'S FORM. /b/<sitting>/<number>, the number
//      percent-encoded verbatim, nothing slugified, no invented ids, one origin.
//   2. THE RESOLVER STILL WORKS THAT WAY. voting-record.mts matches number
//      exactly and falls back to utahSession for state sittings. If that changes,
//      this test fails before the sitemap starts lying.
//   3. THE FLOOR HELD. Every listed bill has a number, a sitting, a source URL
//      and something to read. Every refused row is absent.
//   4. NOTHING ELSE CAME ALONG. No /vote/ pages, no /locker, and the /p/ and
//      /issue/ sets are untouched by this change.
//   5. ONE FILE, ONE SITEMAP URL. Under the protocol's single-file limits, with
//      robots.txt still pointing at exactly one sitemap.
//
//   node scripts/test-sitemap-bills.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { measureAddresses, billPath } from "./vr-measure-addresses.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ sitemap bills: STALE HARNESS — ${m}`); process.exit(2); };

const ORIGIN = "https://www.politidex.fyi";
const XML = R("sitemap.xml");
const locs = [...XML.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
must(locs.length > 100, `the sitemap parsed (${locs.length} entries)`);
const bills = locs.filter((u) => u.startsWith(ORIGIN + "/b/"));

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The acceptance addresses, and the shape of all the others
// ─────────────────────────────────────────────────────────────────────────────
section("1 · the addresses are the router's addresses");

must(bills.length > 100, `the sitemap carries bill files (${bills.length})`);

// The two named acceptance cases: one federal, one Utah. Both were resolved
// against the live measure-ref endpoint when this was written.
has(XML, `<loc>${ORIGIN}/b/119/H.R.%206644</loc>`,
    "H.R. 6644's address is not in the sitemap — that is the federal case the change exists to fix");
ok(bills.some((u) => u.startsWith(ORIGIN + "/b/2025GS/")),
   "no 2025 Utah general-session bill is advertised — the state half of the archive has no crawl path");

// Every bill URL is three segments on the public origin, and the number segment is
// percent-encoded rather than rewritten. `H.R. 6644` becomes `H.R.%206644`; if
// something here ever decides to slugify it, the segment stops round-tripping.
for (const u of bills) {
  const rest = u.slice((ORIGIN + "/b/").length);
  const parts = rest.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) { ok(false, `${u} is not /b/<sitting>/<number>`); break; }
  const [sitting, number] = parts;
  if (encodeURIComponent(decodeURIComponent(sitting)) !== sitting ||
      encodeURIComponent(decodeURIComponent(number)) !== number) {
    ok(false, `${u} does not round-trip through encodeURIComponent — the resolver would receive a different string`);
    break;
  }
}
ok(bills.every((u) => u.split("/").length === 6), "every bill URL is /b/<sitting>/<number> on the public origin");
ok(!bills.some((u) => /\/b\/[^/]+\/(?:h|s)(?:r|b|res|jres|conres)?-\d/i.test(u)),
   "a bill address is slugified (hr-6644 style) — the resolver matches the printed number exactly, so that address 404s");
eq(new Set(bills).size, bills.length, "the sitemap lists the same bill address twice");
// ONE HOST. www is the host Google indexes and the one the apex 301s onto, so a
// bill address on the apex would advertise a redirect as a crawl target. This pin
// read the other way round until the origin moved; it is the same rule either way
// — every /b/ address is on the one origin the sitemap declares.
ok(bills.every((u) => u.startsWith(ORIGIN + "/b/")), "a bill address is on some host other than the indexed origin");

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The resolver still resolves that way
// ─────────────────────────────────────────────────────────────────────────────
section("2 · the resolver behind /b/ still matches on the printed number");

const FN = R("netlify/functions/voting-record.mts");
has(FN, "measure-ref", "voting-record.mts no longer serves measure-ref — /b/ has nothing to resolve against");
// The exact-match test on `number`, and the two sitting lanes: federal congress,
// state external_ids->>'utahSession'. These are the reasons the sitting segment
// can be either a Congress number or a session code.
ok(/eq\(\s*vrMeasures\.number\s*,/.test(FN),
   "getMeasureRef no longer matches vr_measures.number with an equality test — if it slugifies or fuzzes, the sitemap's verbatim numbers may no longer be the canonical form");
has(FN, "utahSession", "the resolver lost its Utah session lane — every /b/2025GS/… address in the sitemap depends on it");
// A row with no source_url is not served, which is why the enumerator refuses one.
has(FN, "sourceUrl", "voting-record.mts no longer filters on sourceUrl — the enumerator's source requirement was mirroring it");

// The client half: bill-detail.js opens by the same identity, and share-links.js
// is what turns the resolved target into the in-app hash.
has(R("share-links.js"), "#bill/", "share-links.js no longer routes a bill target to the #bill/ state");
has(R("netlify.toml"), '"/b/*"', "netlify.toml no longer rewrites /b/* — every address in the sitemap would 404 at the CDN");

// ─────────────────────────────────────────────────────────────────────────────
// 3 · The floor held: listed means openable, refused means absent
// ─────────────────────────────────────────────────────────────────────────────
section("3 · every listed bill clears the floor, every refused one is absent");

const index = measureAddresses(ROOT);
must(index.published.length > 100, `the address index rebuilt from the migrations (${index.published.length})`);

const wanted = index.published.map((a) => ORIGIN + billPath(a));
const extras = bills.filter((u) => wanted.indexOf(u) === -1);
const missing = wanted.filter((u) => bills.indexOf(u) === -1);
eq(extras.length, 0, `the sitemap advertises ${extras.length} bill address(es) the migrations do not support (e.g. ${extras.slice(0, 3).join(", ")})`);
eq(missing.length, 0, `${missing.length} openable bill address(es) are missing from the sitemap (e.g. ${missing.slice(0, 3).join(", ")})`);

// The floor is four requirements, and each one is a way for the address to be a
// dead end: no number or no sitting means there is no address to write, no
// source means measure-ref refuses to serve the row, and nothing to read means
// the address opens onto a stub.
for (const a of index.published) {
  if (a.number && a.sitting && a.source && (a.titled || a.mappings > 0 || a.acts > 0)) continue;
  ok(false, `${billPath(a)} was published without clearing the floor (${JSON.stringify(a.reasons)})`);
  break;
}
ok(index.published.every((a) => a.number && a.sitting && a.source), "every published bill has a number, a sitting and a source URL");
ok(index.published.every((a) => a.titled || a.mappings > 0 || a.acts > 0),
   "a published bill has no title, no issue mapping and no formal act — that address opens onto an empty stub");

// The floor must actually reject. A floor that admits every parsed row is not a
// floor, and the executive orders and litigation rows in these migrations have
// no sitting and therefore no /b/ address at all.
ok(index.refused.length > 0, "the floor refused nothing — every measure row in the migrations cannot possibly carry an address");
for (const r of index.refused) {
  if (r.reasons && r.reasons.length) continue;
  ok(false, `a measure was refused without a stated reason (${r.number || "unnamed"})`);
  break;
}
ok(index.refused.every((r) => r.reasons && r.reasons.length > 0), "every refusal names a reason");
// And no refused row's address leaked into the file by another path.
const leaked = index.refused
  .filter((r) => r.sitting && r.number)
  .map((r) => ORIGIN + billPath(r))
  .filter((u) => bills.indexOf(u) !== -1);
eq(leaked.length, 0, `${leaked.length} refused measure(s) are advertised anyway (e.g. ${leaked.slice(0, 3).join(", ")})`);

// The enumerator reads the repo, never the network or the environment: --check
// has to mean "the committed file matches the repo" for the generator to be
// checkable at all.
const IDX_SRC = R("scripts/vr-measure-addresses.mjs");
ok(!/process\.env/.test(IDX_SRC), "the address enumerator reads the environment — that makes the sitemap build-dependent");
ok(!/\bfetch\s*\(/.test(IDX_SRC), "the address enumerator makes network calls — the generator must stay offline and deterministic");

// ─────────────────────────────────────────────────────────────────────────────
// 4 · Nothing else came along for the ride
// ─────────────────────────────────────────────────────────────────────────────
section("4 · no roll calls, no locker, and the person files are untouched");

ok(!locs.some((u) => u.startsWith(ORIGIN + "/vote/")),
   "the sitemap advertises roll-call pages — that set is not enumerable from the repo, so any list of it is a guess");
ok(!locs.some((u) => u.startsWith(ORIGIN + "/locker")),
   "the sitemap advertises the locker — it is a workspace, not a record");
ok(locs.some((u) => u.startsWith(ORIGIN + "/p/")), "the person files vanished from the sitemap");
ok(locs.some((u) => u.startsWith(ORIGIN + "/issue/")), "the Issue Spotlights vanished from the sitemap");
eq(locs.length, 1 + locs.filter((u) => u !== ORIGIN + "/").length, "the site root is listed exactly once");
// Bills are additive: the file is people + spotlights + bills + root, nothing else.
const unaccounted = locs.filter((u) =>
  u !== ORIGIN + "/" && !u.startsWith(ORIGIN + "/p/") &&
  !u.startsWith(ORIGIN + "/issue/") && !u.startsWith(ORIGIN + "/b/"));
eq(unaccounted.length, 0, `the sitemap carries ${unaccounted.length} address(es) of an unaccounted kind (e.g. ${unaccounted.slice(0, 3).join(", ")})`);

// ─────────────────────────────────────────────────────────────────────────────
// 5 · One file, inside the protocol's limits, one Sitemap: line
// ─────────────────────────────────────────────────────────────────────────────
section("5 · one sitemap, under the single-file limits");

ok(locs.length <= 50000, `the sitemap holds ${locs.length} urls — over the protocol's 50,000-url limit, crawlers discard the file whole`);
const bytes = Buffer.byteLength(XML);
ok(bytes <= 50 * 1024 * 1024, `the sitemap is ${bytes} bytes — over the protocol's 50 MB limit`);
// The generator refuses rather than emitting an over-limit file, and says what
// to do instead. That refusal is the plan; assert it is still in there.
const GEN_SRC = R("scripts/gen-sitemap.mjs");
has(GEN_SRC, "MAX_URLS", "the generator no longer guards the single-sitemap url limit");
has(GEN_SRC, "sitemap index", "the generator no longer records what to do when the file outgrows one sitemap");

const ROBOTS = R("robots.txt");
eq((ROBOTS.match(/^Sitemap:/gim) || []).length, 1, "robots.txt names more or fewer than one sitemap");
has(ROBOTS, `Sitemap: ${ORIGIN}/sitemap.xml`, "robots.txt no longer points at the one sitemap");

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ sitemap bills: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
const sittings = [...new Set(index.published.map((a) => a.sitting))].sort();
console.log(`✓ sitemap bills: ${passed} checks passed`);
console.log(`  ${bills.length} bill addresses across ${sittings.length} sittings (${sittings.join(", ")}), ` +
            `${index.refused.length} refused, ${locs.length}/50000 urls`);
