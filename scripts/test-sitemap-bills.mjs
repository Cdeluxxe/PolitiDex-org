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
import vm from "node:vm";
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
// Bills are additive: the file is people + spotlights + bills + issue files + root,
// nothing else. THE FOURTH KIND IS NAMED, NOT WAIVED. /i/<key> is the issue file —
// what a key covers and who has a formal record on it — and the issue-file doors
// pass (v133) started advertising it because the issue title on a person's file
// became a link to it. The point of this check is that nothing arrives in the
// sitemap unexamined, so the kind is listed here and examined below: every /i/
// address has to be a bare key in the vocabulary's own spelling, listed once, and
// carrying either a boundary on file or a measure mapped to it — a key with
// neither would open onto a definition that does not exist and a record of nobody.
const issueFiles = locs.filter((u) => u.startsWith(ORIGIN + "/i/"));
// THE FIFTH KIND IS NAMED, NOT WAIVED, on the same terms. /d/<seatKey> is the
// district file — who sits in the seat, the seat's one live question, its
// verified neighbours' takes and the issue rooms under them — and District Voice
// opening on one Utah seat is what put it in the sitemap. It is advertised only
// where the generator can prove BOTH halves out of the repo: the seat is in the
// district file's own shipped allow-list, and the seat key has a row in the
// district table the migrations seed. A key missing either half opens onto a page
// with no seat, no poll and no member, which is a refusal dressed as an index
// entry — the same standing rule the /i/ half applies above. Asserted below.
const districtFiles = locs.filter((u) => u.startsWith(ORIGIN + "/d/"));
const unaccounted = locs.filter((u) =>
  u !== ORIGIN + "/" && !u.startsWith(ORIGIN + "/p/") &&
  !u.startsWith(ORIGIN + "/issue/") && !u.startsWith(ORIGIN + "/b/") &&
  !u.startsWith(ORIGIN + "/i/") && !u.startsWith(ORIGIN + "/d/"));
eq(unaccounted.length, 0, `the sitemap carries ${unaccounted.length} address(es) of an unaccounted kind (e.g. ${unaccounted.slice(0, 3).join(", ")})`);

ok(issueFiles.length > 0, "the issue files vanished from the sitemap");
const ifKeys = issueFiles.map((u) => u.slice((ORIGIN + "/i/").length));
const misshaped = ifKeys.filter((k) => !/^[a-z0-9_]+$/.test(k));
eq(misshaped.length, 0,
  `${misshaped.length} issue-file address(es) are not a bare key (e.g. ${misshaped.slice(0, 3).join(", ")}) — ` +
  `/i/ is resolved by the key, so a slug, an escape or a query string opens nothing`);
const dupIf = ifKeys.filter((k, i) => ifKeys.indexOf(k) !== i);
eq(dupIf.length, 0, `${dupIf.length} issue file(s) are listed more than once (e.g. ${dupIf.slice(0, 3).join(", ")})`);
// The two things that make a key worth advertising, read out of the repo: a
// boundary transcribed into issue-scope.js, or a mapping in the migrations.
// THE SCOPE TABLE IS RUN, NOT SCANNED. Six of its keys — the three data-center
// keys and the three tariff keys — were argued as FAMILIES and get their entry
// stamped on by a loop at the bottom of the module rather than typed out at the
// top, so a regular expression over the source misses exactly the keys whose
// treatment was most deliberate. The generator boots the module for the same
// reason; so does this. The module is an IIFE that hangs one object off window
// and returns early if it is already there.
const SCOPE_KEYS = (() => {
  const win = { location: { pathname: "/" } };
  win.window = win;
  vm.runInNewContext(R("issue-scope.js"), win, { filename: "issue-scope.js" });
  const S = (win.PDXIssueScope || {}).SCOPE || {};
  return new Set(Object.keys(S));
})();
const MAPPED = new Set(index.issueKeys || []);
must(SCOPE_KEYS.size > 10 && MAPPED.size > 10,
  `the two sources for an issue file parsed (${SCOPE_KEYS.size} bounded keys, ${MAPPED.size} mapped keys)`);
const hollow = ifKeys.filter((k) => !SCOPE_KEYS.has(k) && !MAPPED.has(k));
eq(hollow.length, 0,
  `${hollow.length} issue file(s) are advertised with neither a boundary on file nor a measure mapped to them ` +
  `(e.g. ${hollow.slice(0, 3).join(", ")}) — that address opens onto an empty definition and a record of nobody`);
console.log(`      ${issueFiles.length} issue files advertised, every one bounded or mapped`);

// ── the district addresses, read out of the two files that decide them ───────
// Nothing here reads the network or the database: the allow-list is a literal in
// district-file.js and the seat rows are literals in the migration that created
// the district table, which is what makes "advertised" checkable at build time.
{
  const SHIPPED = (() => {
    const m = /var\s+SHIPPED\s*=\s*\{([^}]*)\}/.exec(R("district-file.js"));
    if (!m) return null;
    return new Set([...m[1].matchAll(/['"]([a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*)['"]/g)]
      .map((x) => x[1]));
  })();
  must(SHIPPED && SHIPPED.size > 0,
    "district-file.js no longer carries a SHIPPED allow-list this file can read");
  const SEATED = (() => {
    const sql = R("netlify/database/migrations/20261029000000_create_dd_district_discussion_tables/migration.sql");
    return new Set([...sql.matchAll(/\(\s*'([a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*)'\s*,/g)]
      .map((x) => x[1]));
  })();
  must(SEATED.size > 0, "the district table's migration no longer seeds a seat row this file can read");

  const keys = districtFiles.map((u) => u.slice((ORIGIN + "/d/").length));
  const dupD = keys.filter((k, i) => keys.indexOf(k) !== i);
  eq(dupD.length, 0, `${dupD.length} district file(s) are listed more than once (e.g. ${dupD.slice(0, 3).join(", ")})`);
  // The canonical spelling, and only it. ut-hd-68 is an accepted alias that
  // normalises to ut-statehouse-68; advertising the alias would publish two
  // addresses for one seat and invite a crawler to treat them as two districts.
  const aliased = keys.filter((k) => !/^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/.test(k));
  eq(aliased.length, 0,
    `${aliased.length} district address(es) are not the canonical seat key (e.g. ${aliased.slice(0, 3).join(", ")}) — ` +
    `/d/ resolves an alias by normalising it, so advertising one publishes a second address for one seat`);
  const unshippedD = keys.filter((k) => !SHIPPED.has(k));
  eq(unshippedD.length, 0,
    `${unshippedD.length} district file(s) are advertised for a seat the district file does not ship ` +
    `(e.g. ${unshippedD.slice(0, 3).join(", ")}) — that address opens onto a page the app will not paint`);
  const unseated = keys.filter((k) => !SEATED.has(k));
  eq(unseated.length, 0,
    `${unseated.length} district file(s) are advertised for a seat with no row in the district table ` +
    `(e.g. ${unseated.slice(0, 3).join(", ")}) — no seat, no poll and no member is a refusal, not an index entry`);
  // AND NO VOICE ADDRESS PER PERSON. District Voice lives inside the district
  // file; a per-member Voice URL would be a second address for one record.
  const voiceUrls = locs.filter((u) => /\/(voice|neighbors|neighbours)\b/.test(u));
  eq(voiceUrls.length, 0,
    `${voiceUrls.length} address(es) advertise District Voice on their own (e.g. ${voiceUrls.slice(0, 3).join(", ")}) — ` +
    `Voice is a block inside /d/<seatKey>, not a page of its own`);
  console.log(`      ${districtFiles.length} district file(s) advertised, every one shipped and seated`);
}

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
