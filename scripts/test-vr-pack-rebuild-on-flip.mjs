#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-pack-rebuild-on-flip.mjs — the pack rebuilds on a mapping change, and
// refuses to cache at all when it cannot name the mapping
// ─────────────────────────────────────────────────────────────────────────────
// The sibling file test-vr-pack-key-version.mjs pins the SHAPES: that the key
// carries a fingerprint, that the fingerprint moves for every mutation a wave can
// make, that the Function routes the versioned URL, that the runbook says so. It
// does all of that against source text and the live table, and it never once runs
// getMemberPack. This file runs it.
//
// THE ACCEPTANCE IT ANSWERS, in the words of the report: after a fixture that
// flips one isPrimary, getMemberPack returns the new flag on the NEXT read,
// without waiting out PACK_TTL_MS — and a twin boot of the stance tree and the
// dossier on that member/issue agree about what they read.
//
// F4's promotion of H.R. 6644 | housing to PRIMARY is the flip, because it is the
// one that actually shipped wrong: live SQL said true, the six-hour blob said
// false, and one boolean was the whole distance between "Thin supports" and "Not
// about this issue" on the deploy where a reader met it.
//
// HOW REAL THIS IS. netlify/lib/vr-pack.ts is transpiled and EXECUTED here — the
// shipping mappingVersion(), packKey(), getCachedPack(), writeMemberPack() and
// buildMemberPack(), not a paraphrase of them. getMemberPack is lifted out of
// netlify/functions/voting-record.mts by brace-matching its own source text and
// executed too, so an edit to the read path is tested by this file the same day.
// Three things are substituted, and only these three:
//
//   • @netlify/blobs   → a Map with the same four-method surface. There is no blob
//                        store in a test process, and the point of interest is
//                        which KEY is read and written, which a Map records
//                        faithfully. Every write is counted, so "did not persist"
//                        is an assertion and not a hope.
//   • the drizzle db   → a chain-shaped stub over fixture rows derived from the
//                        SHIPPED record corpus (scripts/vr-record-corpus.mjs), so
//                        the pack the builder returns is a real pack of a real
//                        member and the client half below can boot on it.
//   • vr-corrections   → a no-op overlay. Corrections have their own file.
//
// The fingerprint query is answered from the fixture mapping table using the
// column list PARSED OUT of the shipping SQL, so a field added to the fingerprint
// is a field this file starts hashing without being told.
//
//   node scripts/test-vr-pack-rebuild-on-flip.mjs
//
// Needs no database and no network.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" is still printed`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ ${msg}\n`); process.exit(1); } };

const MEASURE = "H.R. 6644";
const KEY = "housing";
const PAIR = [["curtis", "Thin supports", "support"], ["lee", "Thin opposes", "oppose"]];
const NOT_ABOUT = "Not about this issue";

// ═════════════════════════════════════════════════════════════════════════════
// The fixture database
// ═════════════════════════════════════════════════════════════════════════════
// Vote rows and mapping rows reconstructed from the corpus items, which is the
// direction the real ones ran: the corpus is what the ingest wrote and the pack
// builder reads. `mapping` is mutable — flipping a row in it is the whole event
// this file is about.
const { byMember } = buildCorpus(ROOT);
must(byMember.size > 100, `too few members in the corpus to build a fixture (${byMember.size})`);

const fixture = { voteRows: [], mapping: [], failFingerprint: false };
{
  const seen = new Map(); // measureId|issueKey → mapping row, so a shared bill maps once
  let mid = 0;
  for (const [pid] of PAIR) {
    for (const it of byMember.get(pid) || []) {
      if (it.kind !== "vote") continue;
      fixture.voteRows.push({
        politicianId: pid,
        measureId: it.measureId,
        measureType: it.measureType,
        number: it.number,
        title: it.title,
        parentId: it.parentMeasureId ?? null,
        status: it.status ?? "",
        rollcallId: it.rollcallId ?? null,
        chamber: it.chamber,
        congress: it.congress ?? null,
        session: it.session ?? null,
        rollNumber: it.rollNumber ?? null,
        voteDate: it.date,
        question: it.action,
        actionType: it.actionType,
        result: it.result,
        rcSourceUrl: (it.source && it.source.url) || null,
        rcSourceLabel: (it.source && it.source.label) || null,
        externalIds: null,
        position: it.position,
        isParty: it.isParty,
      });
      for (const m of it.issues || []) {
        const k = `${it.measureId}|${m.issueKey}`;
        if (seen.has(k)) continue;
        const row = {
          id: ++mid,
          measureId: it.measureId,
          issueKey: m.issueKey,
          weight: m.weight,
          isPrimary: !!m.isPrimary,
          supportMeaning: m.supportMeaning,
          rationale: m.rationale ?? null,
          sourceUrl: "https://example.invalid/mapping",
        };
        seen.set(k, row);
        fixture.mapping.push(row);
      }
    }
  }
}
const housingRow = fixture.mapping.find(
  (r) => r.measureId.indexOf(MEASURE) === 0 && r.issueKey === KEY
);
must(!!housingRow, `the corpus has no ${MEASURE} | ${KEY} mapping to flip`);
must(housingRow.isPrimary === true,
  `${MEASURE} | ${KEY} is not PRIMARY in the corpus — the fixture has nothing to flip back to`);

// ── the fingerprint, over the fixture, using the shipping column list ────────
const PACK_TS = read("netlify/lib/vr-pack.ts");
const FN_MTS = read("netlify/functions/voting-record.mts");

const mvAt = PACK_TS.indexOf("export async function mappingVersion");
must(mvAt > 0, "netlify/lib/vr-pack.ts no longer exports mappingVersion()");
const sqlAt = PACK_TS.indexOf("sql`", mvAt);
const FP_SQL = PACK_TS.slice(sqlAt + 4, PACK_TS.indexOf("`", sqlAt + 4));
const aggAt = FP_SQL.indexOf("string_agg(");
must(aggAt > 0, "the fingerprint is no longer a string_agg — this file's hash mirror is void");
// Column names in the order the shipping expression concatenates them. Anything
// that is not a bare snake_case identifier (md5, string_agg, coalesce, order, by,
// id) is dropped by the filter below.
const NOISE = new Set(["string_agg", "coalesce", "order", "by", "id", "md5", "as", "h"]);
const FP_COLS = [...new Set(
  (FP_SQL.slice(aggAt, FP_SQL.indexOf("from", aggAt)).match(/[a-z_]{3,}/g) || [])
    .filter((w) => !NOISE.has(w))
)];
must(FP_COLS.length >= 6,
  `parsed only ${FP_COLS.length} fingerprint columns out of the shipping SQL (${FP_COLS})`);
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const fingerprint = () => {
  const rows = [...fixture.mapping].sort((a, b) => a.id - b.id);
  const cells = rows.map((r) =>
    FP_COLS.map((c) => {
      const v = r[camel(c)];
      return v === null || v === undefined ? "" : String(v);
    }).join(":")
  );
  const h = rows.length
    ? createHash("md5").update(cells.join(",")).digest("hex")
    : "empty";
  return { n: rows.length, h };
};

// ═════════════════════════════════════════════════════════════════════════════
// The shipping module, executed
// ═════════════════════════════════════════════════════════════════════════════
const blobs = new Map();
const writes = [];   // every key writeMemberPack has ever persisted, in order
const reads = [];    // every key getCachedPack has ever asked for, in order
const deletes = [];
const fakeStore = {
  async get(key, opts) {
    reads.push(key);
    const v = blobs.get(key);
    if (v === undefined) return null;
    return opts && opts.type === "json" ? JSON.parse(v) : v;
  },
  async setJSON(key, val) { writes.push(key); blobs.set(key, JSON.stringify(val)); },
  async set(key, val) { writes.push(key); blobs.set(key, String(val)); },
  async delete(key) { deletes.push(key); blobs.delete(key); },
};

// A drizzle-shaped chain that ignores the predicates and answers by TABLE. What
// is being tested is the pack's own arithmetic over rows, not drizzle's SQL.
const table = (name) =>
  new Proxy({ __table: name }, {
    get: (t, k) => (k === "__table" ? name : { table: name, column: String(k) }),
  });
const TABLES = {
  vrMeasureIssues: table("vr_measure_issues"),
  vrMeasures: table("vr_measures"),
  vrMemberVotes: table("vr_member_votes"),
  vrPositions: table("vr_positions"),
  vrRollcalls: table("vr_rollcalls"),
};
let queryFor = null; // set per call so `where` can filter by member
const rowsForTable = (name) => {
  if (name === "vr_measure_issues") return fixture.mapping.map((r) => ({ ...r }));
  if (name === "vr_member_votes")
    return fixture.voteRows.filter((r) => r.politicianId === queryFor).map((r) => ({ ...r }));
  if (name === "vr_positions") return [];
  return [];
};
const builder = () => {
  const b = {
    _t: null,
    select() { return b; },
    from(t) { b._t = t && t.__table; return b; },
    innerJoin() { return b; },
    leftJoin() { return b; },
    where() { return b; },
    orderBy() { return b; },
    limit() { return b; },
    then(res, rej) { return Promise.resolve(rowsForTable(b._t)).then(res, rej); },
  };
  return b;
};
const fakeDb = {
  select(...a) { return builder().select(...a); },
  async execute(q) {
    const text = String((q && q.__text) || "");
    if (text.indexOf("vr_measure_issues") < 0)
      throw new Error(`unexpected db.execute in this fixture: ${text.slice(0, 80)}`);
    // "The mapping table could not be read." The only way to reach the sentinel,
    // and the reason section 3 exists.
    if (fixture.failFingerprint) throw new Error("relation vr_measure_issues does not exist");
    const { n, h } = fingerprint();
    return [{ n, h }];
  },
};

const requireShim = (spec) => {
  if (spec === "@netlify/blobs") return { getStore: () => fakeStore };
  if (spec === "drizzle-orm")
    return {
      sql: (strings, ...vals) => ({ __text: strings.join(" ") , vals }),
      and: (...a) => ({ and: a }), eq: (...a) => ({ eq: a }),
      desc: (a) => ({ desc: a }), inArray: (...a) => ({ inArray: a }),
    };
  if (spec.endsWith("db/index.js")) return { db: fakeDb };
  if (spec.endsWith("db/schema.js")) return TABLES;
  if (spec.endsWith("issue-keys.json")) return JSON.parse(read("db/issue-keys.json"));
  if (spec.endsWith("vr-corrections.js"))
    return { loadCorrections: async () => new Map(), applyCorrections: (rows) => rows };
  throw new Error(`vr-pack.ts imported something this harness does not stub: ${spec}`);
};

const loadPackModule = () => {
  const js = esbuild.transformSync(PACK_TS, {
    loader: "ts", format: "cjs", target: "es2022", sourcefile: "vr-pack.ts",
  }).code;
  const mod = { exports: {} };
  vm.runInThisContext(
    `(function (exports, require, module) {${js}\n})`,
    { filename: "vr-pack.ts" }
  )(mod.exports, requireShim, mod);
  return mod.exports;
};
const PACK = loadPackModule();
for (const name of ["mappingVersion", "packKey", "getCachedPack", "writeMemberPack",
                    "buildMemberPack", "resetMappingVersionMemo", "MAPPING_VERSION_UNKNOWN"])
  must(PACK[name] !== undefined, `netlify/lib/vr-pack.ts no longer exports ${name}`);

// ── getMemberPack, lifted out of the Function by brace matching ──────────────
const PACK_TTL_MS = Number(
  new Function("return " + (FN_MTS.match(/const PACK_TTL_MS = ([^;]+);/) || [])[1])()
);
must(PACK_TTL_MS > 0, "could not read PACK_TTL_MS out of netlify/functions/voting-record.mts");
const gmpAt = FN_MTS.indexOf("async function getMemberPack(");
must(gmpAt > 0, "netlify/functions/voting-record.mts no longer defines getMemberPack()");
let depth = 0, gmpEnd = -1, started = false;
for (let i = FN_MTS.indexOf("{", gmpAt); i < FN_MTS.length; i++) {
  const c = FN_MTS[i];
  if (c === "{") { depth++; started = true; }
  else if (c === "}") { depth--; if (started && depth === 0) { gmpEnd = i + 1; break; } }
}
must(gmpEnd > gmpAt, "could not brace-match the end of getMemberPack()");
const GMP_SRC = FN_MTS.slice(gmpAt, gmpEnd);
const makeGetMemberPack = (deps) => {
  const js = esbuild.transformSync(GMP_SRC, {
    loader: "ts", format: "cjs", target: "es2022", sourcefile: "getMemberPack.ts",
  }).code;
  const keys = Object.keys(deps);
  return vm.runInThisContext(
    `(function (${keys.join(", ")}) {${js}\nreturn getMemberPack; })`,
    { filename: "getMemberPack.ts" }
  )(...keys.map((k) => deps[k]));
};
const getMemberPack = makeGetMemberPack({
  PACK_TTL_MS,
  mappingVersion: PACK.mappingVersion,
  getCachedPack: PACK.getCachedPack,
  writeMemberPack: PACK.writeMemberPack,
  MAPPING_VERSION_UNKNOWN: PACK.MAPPING_VERSION_UNKNOWN,
});

// One request, through the real handler. `version` is what the client's redirect
// would have landed on; null means it asked the unversioned URL.
const request = async (pid, version) => {
  PACK.resetMappingVersionMemo();
  const url = `https://politidex.fyi/api/voting-record/member/${pid}/pack` +
    (version ? `/${version}` : "");
  const res = await getMemberPack(pid, new Request(url), version);
  const body = res.status === 200 ? await res.json() : null;
  return { res, body, status: res.status, location: res.headers.get("location") };
};
const flagIn = (pack) => {
  for (const it of (pack && pack.items) || []) {
    if (String(it.number || "").trim() !== MEASURE) continue;
    for (const m of it.issues || []) if (m && m.issueKey === KEY) return !!m.isPrimary;
  }
  return null;
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the flipped flag arrives on the next read, TTL untouched");
// ═════════════════════════════════════════════════════════════════════════════
// The pre-F4 world: housing is mapped but not PRIMARY, and a pack is built and
// cached under that mapping's version.
housingRow.isPrimary = false;
PACK.resetMappingVersionMemo();
const V_BEFORE = await PACK.mappingVersion();
ok(/^m[0-9]+-[0-9a-f]{12}$/.test(V_BEFORE), `the pre-flip version is well formed (${V_BEFORE})`);

queryFor = "curtis";
const stalePack = await PACK.writeMemberPack("curtis", undefined, V_BEFORE);
eq(flagIn(stalePack), false, "the pre-flip pack carries isPrimary false — the shipped defect");
eq(writes[writes.length - 1], PACK.packKey("curtis", V_BEFORE),
  "and was persisted under the pre-flip version's key");
const staleAge = Date.now() - new Date(stalePack.generatedAt).getTime();
ok(staleAge < PACK_TTL_MS / 100,
  `the cached pack is minutes-fresh by TTL (${staleAge}ms of ${PACK_TTL_MS}ms) — ` +
  "everything below therefore happens with the TTL nowhere near expiry");

// THE PROMOTE. One UPDATE, one boolean, nothing else — F4's own shape.
housingRow.isPrimary = true;
PACK.resetMappingVersionMemo();
const V_AFTER = await PACK.mappingVersion();
ok(V_AFTER !== V_BEFORE, `the flip moved the mapping version (${V_BEFORE} → ${V_AFTER})`);
eq(V_AFTER.split("-")[0], V_BEFORE.split("-")[0],
  "the row count did not move — which is why a hand-bumped counter would have missed this");
console.log(`      one is_primary flip: ${V_BEFORE} → ${V_AFTER}`);

// The unversioned URL the client asks for, and the hop it is sent on.
const redirect = await request("curtis", null);
eq(redirect.status, 302, "the unversioned pack URL redirects");
eq(redirect.location, `/api/voting-record/member/curtis/pack/${V_AFTER}`,
  "to the version the mapping table now fingerprints to");
eq(redirect.res.headers.get("cache-control"), "no-store",
  "and the hop itself is never cached");

const readsBefore = reads.length;
const after = await request("curtis", V_AFTER);
eq(after.status, 200, "the versioned URL serves a pack");
eq(flagIn(after.body), true,
  "THE ACCEPTANCE: the next read carries the flipped isPrimary — no TTL wait");
eq(after.body.mappingVersion, V_AFTER, "and says which mapping it was built from");
ok(reads.slice(readsBefore).includes(PACK.packKey("curtis", V_AFTER)),
  "the read asked for the new version's key");
ok(!reads.slice(readsBefore).includes(PACK.packKey("curtis", V_BEFORE)),
  "and never looked under the old one");
ok(writes.includes(PACK.packKey("curtis", V_AFTER)),
  "the rebuilt pack was persisted under the new key");

section("   · the old blob is retired, not deleted");
eq(deletes.length, 0, "no request deleted a blob — retirement is by unreachable key");
const kept = await PACK.getCachedPack("curtis", V_BEFORE);
ok(!!kept, "the pre-flip blob is still in the store, still readable by its own key");
eq(flagIn(kept), false, "unchanged — nothing rewrote history to make the old pack agree");

section("   · and the TTL, alone, would not have saved this");
// The non-vacuity check. Put the stale body under the CURRENT key — which is what
// an unversioned key `member:<pid>@pack` amounts to — and the same handler serves
// it, because six hours have not passed. The version in the key is the only thing
// doing the work here.
blobs.set(PACK.packKey("curtis", V_AFTER), JSON.stringify(stalePack));
const unversioned = await request("curtis", V_AFTER);
eq(flagIn(unversioned.body), false,
  "with the stale body under the live key the handler serves it — the six-hour hole, reproduced");
blobs.delete(PACK.packKey("curtis", V_AFTER));

// ═════════════════════════════════════════════════════════════════════════════
section("2 · twin boot: the tree and the dossier read the rebuilt pack alike");
// ═════════════════════════════════════════════════════════════════════════════
// The server half above ends with a pack in hand. This is what a device does with
// it: seed it as the member's record and ask the two surfaces that disagreed on
// the reported deploy. They are asked about the same member and the same issue,
// from one set of items, and the answers must match each other and the label the
// live read publishes.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];
const boot = () => {
  const win = makeSandbox();
  win.console = { log() {}, warn() {}, error() {} };
  const ctx = vm.createContext(win);
  win.URLSearchParams = URLSearchParams;
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(read(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
};

const packs = {};
for (const [pid] of PAIR) {
  queryFor = pid;
  const r = await request(pid, V_AFTER);
  packs[pid] = r.body;
  eq(flagIn(packs[pid]), true, `${pid}: the rebuilt pack carries the promotion`);
}

const win = boot();
for (const [pid] of PAIR) win.PDXVotingRecord.noteMember(pid, packs[pid].items);
const CS = win.PDXConsistency;
for (const [pid, want, side] of PAIR) {
  const row = (CS.issueRows(pid) || []).find((r) => r && r.key === KEY);
  ok(!!row, `${pid}: no ${KEY} row on the profile at all`);
  if (!row) continue;
  const tree = CS.recordPattern.display(row) || null;
  const dos = CS.dossierRead(pid, KEY);
  const html = CS.gapViewHtml(pid, KEY) || "";
  eq(tree && tree.label, want, `${pid}: the tree's Record slot`);
  eq(tree && tree.tone, side, `${pid}: the tree's side`);
  eq(dos.state, "reads", `${pid}: the dossier reads the record rather than refusing it`);
  eq(dos.label, want, `${pid}: the dossier's label is the tree's label`);
  eq(dos.tier, tree && tree.tier, `${pid}: at the tree's tier`);
  no(html, NOT_ABOUT, `${pid}: the sheet does not print the reported refusal`);
  console.log(`      ${pid}: tree "${tree.label}" · dossier "${dos.label}" · agree`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · fail closed: an unnameable mapping is served, never cached");
// ═════════════════════════════════════════════════════════════════════════════
// mappingVersion() cannot reach vr_measure_issues. It returns its sentinel, which
// is a legal URL segment (so a database blip does not 404 a reader) and an
// UNCACHEABLE key: nothing may be read under it and nothing may be written under
// it. A hit would be the unversioned blob the whole scheme exists to prevent —
// and worse than the F4 one, because the builder reads the same table that just
// failed, so a pack built in this window can carry no mapping at all.
const UNKNOWN = PACK.MAPPING_VERSION_UNKNOWN;
fixture.failFingerprint = true;
PACK.resetMappingVersionMemo();
eq(await PACK.mappingVersion(), UNKNOWN, "an unreadable mapping table yields the sentinel");

// Somebody's poisoned blob, sitting at the sentinel key. It must never be served.
const poisoned = { ...stalePack, generatedAt: new Date().toISOString(), poisoned: true };
blobs.set(PACK.packKey("curtis", UNKNOWN), JSON.stringify(poisoned));
// Compared by identity, not printed: a pack body in a failure message is 60 KB of
// rationale prose, and the only fact wanted here is hit-or-miss.
ok((await PACK.getCachedPack("curtis", UNKNOWN)) === null,
  "getCachedPack HIT under the sentinel — a blob sitting at that key was served");

queryFor = "curtis";
const writesBefore = writes.length;
const deletesBefore = deletes.length;
const blind = await request("curtis", UNKNOWN);
eq(blind.status, 200, "the reader still gets a pack — failing closed is not failing to answer");
ok(!blind.body.poisoned, "and it is NOT the blob that was sitting under the sentinel key");
eq(blind.body.mappingVersion, UNKNOWN, "it is stamped with the sentinel, so it cannot pass as versioned");
eq(writes.length, writesBefore, "nothing was persisted under the sentinel key");
eq(deletes.length, deletesBefore, "and nothing was deleted to achieve that");
eq(blind.res.headers.get("cache-control"), "no-store",
  "no shared cache may keep a body whose mapping nobody can name");
eq(blind.res.headers.get("x-pdx-mapping-version"), UNKNOWN,
  "the response says so out loud, which is what the service worker reads");

// Repeat reads keep missing — the sentinel is a permanent miss, not a warm-up.
const readsAt = reads.length;
await request("curtis", UNKNOWN);
eq(writes.length, writesBefore, "a second blind read still writes nothing");
eq(reads.length, readsAt,
  "and does not even ask the store — the sentinel is refused before the blob layer, " +
  "so no amount of repetition can turn it into a hit");

section("   · the known-version blobs are untouched by the blind window");
const survivor = await PACK.getCachedPack("curtis", V_BEFORE);
ok(!!survivor, "the pre-flip pack is still there — the offline fallback survives a DB blip");
fixture.failFingerprint = false;
PACK.resetMappingVersionMemo();
eq(await PACK.mappingVersion(), V_AFTER,
  "and the version comes straight back when the table does — the sentinel is not sticky");
queryFor = "curtis";
const recovered = await request("curtis", V_AFTER);
eq(flagIn(recovered.body), true, "the recovered read serves the promoted mapping again");
eq(recovered.res.headers.get("cache-control"), "public, max-age=300",
  "and a named version is shared-cacheable again");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the service worker will not cache a pack of no known mapping");
// ═════════════════════════════════════════════════════════════════════════════
// The Cache API ignores `no-store`, so the refusal above has to be spelled again
// in sw.js — and it matters more there than in any shared cache, because
// prunePacks would drop this member's good versioned entry in favour of it.
const SW = read("sw.js");
const swHas = (needle, msg) => ok(SW.indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
swHas(`const VR_PACK_UNKNOWN = '${UNKNOWN}'`, "sw.js knows the Function's sentinel by value");
swHas("if (!isUnknownPackVersion(res, finalUrl))",
  "handleVrPack guards the cache write on the version being nameable");
swHas("x-pdx-mapping-version", "and reads it from the header the Function sends");
const guard = SW.slice(SW.indexOf("function isUnknownPackVersion"), SW.indexOf("async function handleVrPack"));
ok(/VR_PACK_RE\.exec\(p\)/.test(guard),
  "the guard also reads the version out of the URL, so a header-stripping proxy cannot defeat it");
const put = SW.slice(SW.indexOf("if (!isUnknownPackVersion"), SW.indexOf("const cached = await newestCachedPack"));
ok(put.indexOf("cache.put") > 0 && put.indexOf("prunePacks") > 0,
  "both the put and the prune are inside the guard — a prune outside it would delete the good entry");

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n  ✗ ${failures.length} failure(s):\n`);
  for (const f of failures) console.error(`    • ${f}`);
  console.error(`\n  ${passed} passed, ${failures.length} failed\n`);
  process.exit(1);
}
console.log(`\n   ${passed} checks passed`);
console.log("✓ vr-pack-rebuild-on-flip: a promote lands on the next read, and an unnameable mapping is never cached\n");
