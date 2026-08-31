#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-pack-key-version.mjs — the pack key carries the mapping version
// ─────────────────────────────────────────────────────────────────────────────
// /api/voting-record has two mouths and they used to disagree. `/member/:id` is
// a query, so it reflects vr_measure_issues the instant a migration commits.
// `/member/:id/pack` is a Netlify Blobs snapshot on PACK_TTL_MS = 6h, and its
// key used to be `member:<pid>` — a name that says nothing about which mapping
// table built it. Federal wave F4 promoted H.R. 6644 | housing to PRIMARY; the
// live read said isPrimary true, the pack kept serving false for up to six more
// hours, and one boolean is the whole distance between "Thin supports" and "Not
// about this issue" (see test-record-pack-no-downgrade.mjs for why).
//
// The fix is that the key — and therefore the pack URL, and therefore the
// service worker's copy of it — names the mapping table's CONTENTS:
//
//   member:<pid>@m<rowCount>-<md5(row contents)[0..12]>
//   /api/voting-record/member/<pid>/pack/m<rowCount>-<hash12>
//
// A mapping change moves the hash, so the old key is simply never asked for
// again. Nothing is deleted and nothing expires early: the retired pack becomes
// unreachable by name. THIS FILE IS THE "CONFIRM IT MOVED" STEP the ingest
// runbook tells every mapping/promote wave to end with.
//
// WHAT IT HOLDS:
//
//   1. THE FINGERPRINT IS SENSITIVE TO EVERY MUTATION SHAPE A WAVE CAN MAKE.
//      is_primary flip, weight edit, support_meaning flip, rationale edit,
//      insert, delete — each must move the version. A hand-bumped counter would
//      have missed F4 exactly: an UPDATE on an existing row moves no row count
//      and nobody remembers that flipping a flag is a mapping change.
//   2. AND IS INDIFFERENT TO WHAT THE PACK DOES NOT SERVE. source_url is
//      mapping evidence, not pack content; a citation fix must not invalidate
//      825 members' packs.
//   3. THE MAPPING TABLE HAS NO COLUMN THE FINGERPRINT DOES NOT KNOW ABOUT.
//      This is the trap that reopens the bug: add a mapping column, serve it in
//      the pack, forget the fingerprint, and the key stops moving for it.
//   4. THE KEY AND URL SHAPES ARE WHAT THE FUNCTION'S ROUTER ACCEPTS, and the
//      unknown-version sentinel is a legal version segment (or the fallback
//      path 404s instead of serving a pack).
//   5. PACK_TTL_MS IS STILL SIX HOURS. It is roll-call freshness and nothing
//      else. Shortening it is the non-fix this whole design exists to avoid.
//   6. THE CLIENT IS STILL VERSION-BLIND AND ITS GUARD IS STILL THERE.
//      voting-record.js asks for the unversioned URL and gets a 302 — it cannot
//      know the version (fetchPack fires before fetchMember on a cold open, and
//      offline there is no live read at all). The no-downgrade guard is
//      untouched; this change is additive.
//   7. THE SERVICE WORKER IS NETWORK-FIRST FOR PACKS. Stale-while-revalidate is
//      right for an asset whose old copy is merely older, wrong for one whose
//      old copy can be wrong.
//
// Sections 1–3 need NETLIFY_DB_URL and are READ-ONLY: they never mutate. Each
// mutation shape is a CTE named vr_measure_issues that SHADOWS the real table,
// so the fingerprint SQL — extracted verbatim from netlify/lib/vr-pack.ts, and
// therefore unable to drift from what ships — computes over a projection of the
// live rows. Without the URL those sections are skipped and the rest still runs.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ ${msg}\n`); process.exit(1); } };

const PACK_TS = read("netlify/lib/vr-pack.ts");
const FN_MTS = read("netlify/functions/voting-record.mts");
const CLIENT = read("voting-record.js");
const SW = read("sw.js");
const RUNBOOK = read("db/vr-ingest-runbook.md");

// ── The fingerprint SQL, lifted out of the shipping module ───────────────────
// Not retyped. If someone edits the expression in vr-pack.ts, this file tests
// the edited expression; if they move it somewhere this extraction cannot see,
// the test dies here rather than quietly passing on a stale copy.
const mvAt = PACK_TS.indexOf("export async function mappingVersion");
must(mvAt > 0, "netlify/lib/vr-pack.ts no longer exports mappingVersion()");
const sqlAt = PACK_TS.indexOf("sql`", mvAt);
const sqlEnd = PACK_TS.indexOf("`", sqlAt + 4);
must(sqlAt > 0 && sqlEnd > sqlAt, "could not find the fingerprint sql`` template in mappingVersion()");
const FP_SQL = PACK_TS.slice(sqlAt + 4, sqlEnd);
must(/from\s+vr_measure_issues/.test(FP_SQL),
  "the fingerprint no longer reads vr_measure_issues — this test's CTE shadowing is void");

// The version string recipe, also lifted: `m${count}-${hash.slice(0, 12)}`.
const recipe = (PACK_TS.slice(mvAt, mvAt + 2000).match(/value = `([^`]+)`/) || [])[1] || "";
const version = (n, h) => `m${n}-${String(h).slice(0, 12)}`;

section("the version recipe is count + truncated content hash");
has(recipe, "m$", "the version is prefixed m");
has(recipe, "slice(0, 12)", "the hash is truncated to 12 hex chars");
has(FP_SQL, "md5(string_agg(", "the fingerprint is an md5 over the aggregated rows");
has(FP_SQL, "order by id", "the aggregation is ordered, so the hash is stable across plans");
has(FP_SQL, "'empty'", "an empty mapping table still yields a version");
// The six fields the pack actually serves per issue, and the row count. Nothing
// else. Every one of these is asserted individually against the DB in section 1.
for (const col of ["measure_id", "issue_key", "weight", "is_primary", "support_meaning", "rationale"])
  has(FP_SQL, col, `the fingerprint covers ${col}`);
ok(FP_SQL.indexOf("source_url") < 0,
  "the fingerprint must NOT cover source_url — mapping evidence is not pack content");

// ── Sections 1–3: the live table ─────────────────────────────────────────────
const DB = process.env.NETLIFY_DB_URL;
let liveVersion = null;

if (!DB) {
  section("live fingerprint — SKIPPED (NETLIFY_DB_URL is not set)");
  console.log("      static shapes below still run; a wave must run this WITH the URL set");
} else {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // A projection of the live rows, never a write. `vr_measure_issues` as a CTE
    // name shadows the table for the unqualified reference inside FP_SQL; the
    // projection itself reads public.vr_measure_issues, which is the real thing.
    const fingerprint = async (projection) => {
      const r = await client.query(`with vr_measure_issues as (${projection}) ${FP_SQL}`);
      const row = r.rows[0];
      return { n: Number(row.n), h: String(row.h), v: version(Number(row.n), row.h) };
    };

    // The mapping columns, from the database rather than from schema.ts, so a
    // column added by a migration that never reached the model still trips it.
    const cols = (await client.query(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'vr_measure_issues'
        order by ordinal_position`
    )).rows.map((r) => r.column_name);
    must(cols.length > 0, "vr_measure_issues does not exist in this database");
    const list = cols.join(", ");
    const covered = ["measure_id", "issue_key", "weight", "is_primary", "support_meaning", "rationale"];
    // id identifies the row and orders the aggregate; source_url is deliberately out.
    const exempt = ["id", "source_url"];
    const unknown = cols.filter((c) => !covered.includes(c) && !exempt.includes(c));

    section("3. every mapping column is either fingerprinted or deliberately exempt");
    eq(unknown.join(", "), "",
      `vr_measure_issues has a column the fingerprint does not know about (${list}) — ` +
      "if the pack serves it, add it to mappingVersion(); if not, exempt it here on purpose");

    const base = await fingerprint("select * from public.vr_measure_issues");
    liveVersion = base.v;
    const minId = "(select min(id) from public.vr_measure_issues)";
    const proj = (expr) => `select ${cols.map((c) => expr[c] || c).join(", ")} from public.vr_measure_issues`;
    const touch = (col, sqlExpr) => proj({ [col]: `(case when id = ${minId} then ${sqlExpr} else ${col} end) as ${col}` });

    section("1. every mutation shape a mapping wave can make moves the version");
    const shapes = [
      ["is_primary flip (F4's own shape)", touch("is_primary", "not is_primary")],
      ["weight edit", touch("weight", "case when weight = 100 then 80 else 100 end")],
      ["support_meaning flip", touch("support_meaning",
        "case when support_meaning = 'yea_supports' then 'yea_opposes' else 'yea_supports' end")],
      ["rationale edit", touch("rationale", "coalesce(rationale, '') || ' (reworded)'")],
      ["insert (a promote adding a row)",
        `select * from public.vr_measure_issues union all ` +
        `select 2000000000 as id, ${cols.slice(1).map((c) => c === "issue_key" ? "issue_key || '-sim' as issue_key" : c).join(", ")} ` +
        `from public.vr_measure_issues where id = ${minId}`],
      ["delete (a mapping withdrawn)", `select * from public.vr_measure_issues where id <> ${minId}`],
    ];
    for (const [label, projection] of shapes) {
      const got = await fingerprint(projection);
      ok(got.v !== base.v, `${label} must move the version (still ${base.v})`);
      ok(/^m[0-9]+-[0-9a-f]{12}$/.test(got.v), `${label} yields a well-formed version (${got.v})`);
    }
    // Both halves of the version must be live, not just the hash: a wave that
    // only inserts is caught by the count too, and one that only edits is not.
    const inserted = await fingerprint(shapes[4][1]);
    eq(inserted.n, base.n + 1, "an inserted row moves the count half of the version");
    const flipped = await fingerprint(shapes[0][1]);
    eq(flipped.n, base.n, "a flag flip moves only the hash half — which is why a counter would miss it");

    section("2. and is indifferent to what the pack does not serve");
    const citation = await fingerprint(touch("source_url", "'https://example.invalid/fix'"));
    eq(citation.v, base.v, "a source_url fix must NOT invalidate every member's pack");

    console.log(`\n      current mapping version: ${base.v}  (${base.n} rows in vr_measure_issues)`);
    console.log(`      pack key:  member:<pid>@${base.v}`);
    console.log(`      pack URL:  /api/voting-record/member/<pid>/pack/${base.v}`);
    console.log("      a wave that changed mapping rows must not print the version it started at");
  } finally {
    await client.end();
  }
}

// ── 4. Key and URL shapes, against the router that has to accept them ────────
section("4. the key and URL shapes are the ones the Function routes");
const keyBody = (PACK_TS.match(/export function packKey\([^)]*\)[^{]*\{\s*return\s*`([^`]+)`/) || [])[1] || "";
eq(keyBody, "member:${politicianId}@${mv}", "packKey composes member:<pid>@<mv>");
ok(/export function packKey\(\s*politicianId: string,\s*mv: string\s*\)/.test(PACK_TS),
  "packKey requires the mapping version — it cannot be called without one");
ok(/export async function getCachedPack\(\s*politicianId: string,\s*mv: string\s*\)/.test(PACK_TS),
  "getCachedPack requires the mapping version — reading a pack without naming one is unwritable");
// Every in-tree reader must actually pass one, or the requirement is decorative.
for (const f of ["netlify/lib/vr-pack.ts", "netlify/functions/voting-record.mts", "netlify/lib/vr-ingest.ts"]) {
  const src = read(f);
  for (const call of src.match(/getCachedPack\([^)]*\)/g) || [])
    ok(/,/.test(call.slice(call.indexOf("("))), `${f}: ${call} passes a mapping version`);
}

const sentinel = (PACK_TS.match(/MAPPING_VERSION_UNKNOWN = "([^"]+)"/) || [])[1] || "";
const reSrc = (FN_MTS.match(/const PACK_VERSION_RE = \/([^\n]+?)\/;/) || [])[1] || "";
must(reSrc, "voting-record.mts no longer declares PACK_VERSION_RE");
const PACK_VERSION_RE = new RegExp(reSrc);
const sample = liveVersion || "m825-1beb2b0fb077";
ok(PACK_VERSION_RE.test(sample), `the router accepts a real version segment (${sample})`);
ok(PACK_VERSION_RE.test(sentinel),
  `the unknown-version sentinel "${sentinel}" must be a legal segment, or a DB blip 404s instead of serving a pack`);

// ── AND THE SENTINEL IS AN UNCACHEABLE KEY ─────────────────────────────────
// Legal to route is not the same as safe to store under. A version that could not
// be read names no mapping, so a blob under it is precisely the unversioned blob
// this whole scheme exists to make unreachable — and a worse one than F4's, since
// buildMemberPack reads the same table that just failed and may produce a pack
// with no issue tags at all. So the sentinel is refused on BOTH sides of the blob
// layer and in the HTTP cache too, in four places, each pinned here. What they do
// rather than what they say is exercised in test-vr-pack-rebuild-on-flip.mjs.
ok(/if \(mv === MAPPING_VERSION_UNKNOWN\) return null;/.test(PACK_TS),
  "getCachedPack must MISS under the sentinel rather than risk hitting a blob nobody can date");
ok(/if \(version !== MAPPING_VERSION_UNKNOWN\) \{[\s\S]{0,200}setJSON\(packKey/.test(PACK_TS),
  "writeMemberPack must not persist under the sentinel — the blob it would leave could never be validated");
ok(/versionKnown \? "public, max-age=300" : "no-store"/.test(FN_MTS),
  "a sentinel-versioned response must be no-store, or a shared cache keeps what the blob store refused");
ok(SW.indexOf("isUnknownPackVersion") > 0 && /if \(!isUnknownPackVersion\(/.test(SW),
  "sw.js must skip its own cache write for a sentinel-versioned pack — the Cache API ignores no-store");
ok(SW.indexOf(`VR_PACK_UNKNOWN = '${sentinel}'`) > 0,
  `sw.js must know the sentinel by the value the library defines ("${sentinel}")`);
for (const junk of ["", "latest", "../secrets", "m825-1beb2b0fb077/x", "m825 1beb", "M825-abc"])
  ok(!PACK_VERSION_RE.test(junk), `the router rejects ${JSON.stringify(junk)}`);
// Both URL forms: the unversioned one the client asks for, and the versioned one
// it is sent to. The optional group is what makes the 302 target routable.
const routeSrc = (FN_MTS.match(/path\.match\(\/(\^\\\/member[^\n]*?)\/\)/) || [])[1] || "";
must(routeSrc, "could not find the /pack route regex in voting-record.mts");
const ROUTE = new RegExp(routeSrc.replace(/\\\//g, "/"));
const m1 = ROUTE.exec("/member/curtis/pack");
const m2 = ROUTE.exec(`/member/curtis/pack/${sample}`);
ok(!!m1 && !m1[2], "the unversioned /pack URL still routes, with no version captured");
ok(!!m2 && m2[2] === sample, "the versioned /pack/<mv> URL routes and captures the version");
ok(!ROUTE.test("/member/curtis/pack/a/b"), "a two-segment version does not route");

section("the redirect, not the client, owns the version");
has(FN_MTS, "status: 302", "an unversioned (or wrong-versioned) request redirects");
has(FN_MTS, '"cache-control": "no-store"', "the redirect itself is never cached");
ok(/location,[\s\S]{0,200}x-pdx-mapping-version/.test(FN_MTS) || FN_MTS.indexOf("x-pdx-mapping-version") > 0,
  "the current version is observable on the wire");
ok(/if \(requestedVersion !== mv\)/.test(FN_MTS),
  "any version other than the current one is redirected, not served");
const memo = Number((PACK_TS.match(/MAPPING_VERSION_MEMO_MS = (\d+)/) || [])[1] || 0);
ok(memo > 0 && memo <= 60000,
  `the mapping-version memo is seconds, not minutes (${memo}ms) — a long memo trades the six-hour hole for a smaller one of the same kind`);

// …and the wave that MOVED the version must not write its eager packs under the
// one it read before moving it. Nothing stale could be served either way — the
// read path recomputes and misses — but every write in that loop would be wasted
// and every reader would pay the lazy rebuild the loop exists to spare them.
const INGEST = read("netlify/lib/vr-ingest.ts");
const resetAt = INGEST.indexOf("resetMappingVersionMemo()");
const eagerAt = INGEST.indexOf("await writeMemberPack(pid)");
ok(resetAt > 0, "the ingest must drop the mapping-version memo after its mapping upserts");
ok(eagerAt > 0, "the ingest no longer refreshes packs eagerly at all");
ok(resetAt > 0 && eagerAt > 0 && resetAt < eagerAt,
  "the memo is dropped BEFORE the eager pack writes, or they land on the pre-wave key");

// ── 5. The TTL is not the fix ────────────────────────────────────────────────
section("5. PACK_TTL_MS is roll-call freshness and stays six hours");
const ttl = (FN_MTS.match(/PACK_TTL_MS = ([^;]+);/) || [])[1] || "";
eq(ttl.trim(), "6 * 60 * 60 * 1000", "PACK_TTL_MS is unchanged — mapping staleness is fixed by the key, not the clock");

// ── 6. The client compares generations ──────────────────────────────────────
// Behaviour is proved by test-record-pack-no-downgrade.mjs, which boots the real
// file. What is pinned here is the shape of the client's half of the scheme —
// including the one thing it must NOT do.
section("6. voting-record.js knows the generation and refuses a mismatch");
has(CLIENT, "_packMaySeed", "the no-downgrade guard is still present");
has(CLIENT, "_liveRead", "the live-read claim it stands on is still present");
has(CLIENT, "'/member/' + encodeURIComponent(id) + '/pack'",
  "fetchPack still asks for the unversioned URL — the server tells it the version by redirect");

// The generation reaches the client in the BODY, not only the header. It has to:
// index.html copies the live payload into sessionStorage, the Cache API replays it,
// and a 304 carries no body at all — a header-only channel would be lost at each
// of those, and the one moment the comparison matters is a first paint served from
// one of them.
has(CLIENT, "data.mappingVersion",
  "the client reads the generation out of the payload body, which survives the session copy");
has(CLIENT, "_noteLiveGen", "the live read files the generation it reported");
has(CLIENT, "_packMayApply", "and a pack is asked whether it may apply over it");
has(CLIENT, "recordGeneration", "…with the answer readable, so a test can see the provenance");

// THE RULE IS "DIFFERENT", NOT "OLDER", and this is the assertion that keeps it
// that way. A generation is m<rows>-<md5 prefix>: two of them do not sort, and a
// client that ranked them would be inventing an order the server never promised.
const guard = CLIENT.slice(CLIENT.indexOf("_packMayApply: function"),
  CLIENT.indexOf("_packMaySeed: function"));
must(guard.length > 0, "_packMayApply is not where this test expects it");
has(guard, "live !== gen", "the comparison is inequality — the generations are compared, not ranked");
ok(!/[<>]/.test(guard.replace(/\/\/.*$/gm, "")),
  "the guard does not order two generations — a fingerprint has no older and newer");

// The seed that has no server in front of it. When the service worker answers the
// pack from its own cache there is no request, no redirect and no header; the only
// thing standing between an old mapping and the reader is this call passing the
// pack's own generation in.
has(CLIENT, "noteMember(job.id, _state.items, PDXVotingRecord._payloadGen(data))",
  "the offline seed declares the generation it is seeding from");
const noteFn = CLIENT.slice(CLIENT.indexOf("noteMember: function"),
  CLIENT.indexOf("memberRecords: function"));
must(noteFn.length > 0, "noteMember is not where this test expects it");
has(noteFn, "!this._packMayApply(key, src)) return false",
  "and noteMember itself refuses — the guard is at the till, not only at the door");
has(noteFn, "src !== this._LIVE_GEN",
  "while a live payload is never refused, whatever a pack left behind");

// Both mouths of the API stamp it, so the two halves are comparing the same thing.
for (const [name, src] of [["/member/:id", FN_MTS], ["the pack", PACK_TS]])
  has(src, "mappingVersion", `${name} reports the generation it was built from`);
// ── 7. The service worker ────────────────────────────────────────────────────
section("7. the service worker is network-first for packs");
has(SW, "VR_PACK_RE", "packs have their own route in the fetch handler");
has(SW, "handleVrPack", "and their own handler");
const h = SW.slice(SW.indexOf("async function handleVrPack"), SW.indexOf("async function cachedPackKeys"));
must(h.length > 0, "handleVrPack is not where this test expects it");
ok(h.indexOf("await fetch(req)") < h.indexOf("newestCachedPack"),
  "the network is tried before the cache — a cached pack may be WRONG, not merely old");
has(h, "res.url", "the entry is keyed by the URL the redirect landed on, not the one requested");
has(SW, "async function prunePacks", "superseded versions are swept as hygiene");
ok(/^\/api\/voting-record\/member\/([^/]+)\/pack/.test("/api/voting-record/member/curtis/pack"),
  "the SW route matches the unversioned form (pre-upgrade cache entries)");
const swRe = new RegExp((SW.match(/VR_PACK_RE = \/([^\n]+?)\/;/) || [])[1].replace(/\\\//g, "/"));
ok(swRe.test(`/api/voting-record/member/curtis/pack/${sample}`), "and the versioned form");

// ── The runbook sentence ─────────────────────────────────────────────────────
section("the wave checklist carries the sentence");
has(RUNBOOK, "pack key must change", "the ingest runbook says it, in as many words");
has(RUNBOOK, "test-vr-pack-key-version.mjs", "and names this file as the confirmation step");

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n  test-vr-pack-key-version — ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures.slice(0, 20)) console.error(`   ✗ ${f}`);
  if (failures.length > 20) console.error(`   … and ${failures.length - 20} more`);
  process.exit(1);
}
console.log(`\n   ${passed} checks passed`);
console.log("✓ vr-pack-key-version: a mapping change renames the pack; the TTL never had to move");
