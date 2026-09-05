#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-pack-live-twin-boot.mjs — the pack lane is a no-op on the live path
// ─────────────────────────────────────────────────────────────────────────────
// The versioned pack key closes the server-side hole: `member:<id>@<mapping
// fingerprint>` in the blob store, a 302 from /pack to /pack/<version>, a miss on
// any version but the current one, and a rebuild on the next read. netlify/lib/
// vr-pack.ts owns it, scripts/test-vr-pack-key-version.mjs proves the fingerprint
// is sensitive to every mutation shape, and scripts/test-vr-pack-rebuild-on-flip.mjs
// runs the shipping read path over a flipped is_primary.
//
// What none of those can prove is the thing a reader actually experiences, which
// is not a key but a screen. Two paths reach a device with no request the server
// can answer: OFFLINE, where the service worker hands over the newest pack it
// holds for that member whatever version it is, and FIRST PAINT, where a pack
// warm-up can resolve before the live read it was fired alongside. On both of
// those the pack lane is engaged and the version machinery is not consulted at
// all. scripts/test-record-pack-no-downgrade.mjs holds the guard that decides
// them, one fixture pair at a time.
//
// THIS FILE HOLDS THE CONSEQUENCE, AS A TWIN BOOT. Two engines boot from the same
// shipped files over the same record corpus. One of them never sees a pack. The
// other has a maximally stale pack — every `isPrimary` flipped off, which is the
// exact shape of the F4 regression and the one field that used to decide between
// "Thin supports" and "Not about this issue" — pushed at it in every arrival order
// the two offline paths can produce. Then every formal tier, every Direction Match
// read, every Word-vs-Action ledger and every formal-pattern shape is compared
// member for member. They must be identical. A pack that changed one of them is a
// six-hour-old photograph filed as this morning's record.
//
// WHY THE TWIN IS NOT HEAD-AGAINST-TREE. The usual twin boot in this repo pins a
// pass against the commit before it. The pack lane is already shipped, so that
// comparison would be a tautology today and would say nothing tomorrow. The twin
// that carries a claim is pack-lane-engaged against pack-lane-absent: it fails if
// the guard ever stops holding, whoever edits it and whenever.
//
//   node scripts/test-vr-pack-live-twin-boot.mjs
//
// Real shipped modules in a node:vm sandbox over the shipped record corpus. No
// database and no network: the pack payloads are built from the corpus itself.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); return !!cond; };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ ${msg}\n`); process.exit(1); } };

const boot = () => {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.URLSearchParams = URLSearchParams;
  win.console = { log() {}, warn() {}, error() {} };
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
};

// The two generations. Fingerprints, not counters — the client is documented as
// refusing on DIFFERENCE and never on order, so these are deliberately not
// sortable against each other.
const GEN_LIVE = "m941-8ad2f19c04be";
const GEN_PACK = "m940-da41abc2f46d";

const { byMember } = buildCorpus(ROOT);
must(byMember.size > 100, `too few members in the corpus to sweep (${byMember.size})`);

// A pack of the retired mapping: the same acts, with every PRIMARY flag dropped.
// Deep-copied, because a pack the client refuses must not be able to reach the
// live rows through a shared object either — a guard that returns false while the
// caller already handed over the same array is not a guard.
let flipped = 0;
const stalePack = (recs) => {
  const out = JSON.parse(JSON.stringify(recs || []));
  for (const it of out) {
    for (const m of (it.issues || [])) {
      if (m && m.isPrimary) { m.isPrimary = false; flipped++; }
    }
  }
  return out;
};
// …and wrapped as the PAYLOAD the two shipped callers actually hand over, so the
// generation is DERIVED here the way they derive it — fetchPack reads
// `self._payloadGen(data)` and the section's offline fallback reads
// `PDXVotingRecord._payloadGen(data)`. A test that passed the generation in by
// hand would still pass if a pack stopped declaring one, which is the shape of
// bypass this lane is most exposed to: `pack: true` is the only thing that makes a
// payload a pack, and a pack that names no generation must read as the sentinel
// rather than as a live answer.
const STALE = new Map();
for (const [pid, recs] of byMember) {
  STALE.set(pid, { pack: true, mappingVersion: GEN_PACK, items: stalePack(recs) });
}
must(flipped > 100, `the stale pack differs from the live rows in only ${flipped} flags`);
const LIVE_PAYLOAD = { mappingVersion: GEN_LIVE, items: [] };

// ── the harvest ─────────────────────────────────────────────────────────────
// Everything the record lane publishes about a member, as one string. Whatever a
// pack could plausibly move is in here: the scoped overalls (which is where a tier
// lives), the Word-vs-Action ledger, and the formal-pattern shape the dossier and
// the desk both read their band off.
const readOf = (win, pid, scopes) => {
  const parts = [];
  for (const sc of scopes) {
    try { parts.push(JSON.stringify(win.PDXConsistency.scopedOverall(sc, pid))); }
    catch (e) { parts.push("throw:" + sc); }
  }
  try { parts.push(JSON.stringify(win.PDXWordAction.read(pid))); } catch (e) { parts.push("throw:wva"); }
  try { parts.push(JSON.stringify(win.PDXConsistency.formalPatternIndex.shape(pid))); }
  catch (e) { parts.push("throw:fpi"); }
  return parts.join("|");
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the control twin: a device that never saw a pack");
// ═════════════════════════════════════════════════════════════════════════════
const A = boot();
must(A.PDXConsistency && typeof A.PDXConsistency.scopedOverall === "function", "consistency.js did not boot");
must(A.PDXWordAction && typeof A.PDXWordAction.read === "function", "word-action.js did not boot");
const SCOPES = Object.keys(A.PDXConsistency.SCOPES || {});
must(SCOPES.length > 0, "PDXConsistency.SCOPES is empty");
for (const [pid, recs] of byMember) {
  try { A.PDXVotingRecord.noteMember(pid, recs); } catch (e) {}
}
const CONTROL = new Map();
for (const pid of byMember.keys()) CONTROL.set(pid, readOf(A, pid, SCOPES));
{
  let nonEmpty = 0;
  for (const v of CONTROL.values()) if (v && v.indexOf("null|") !== 0) nonEmpty++;
  ok(nonEmpty > 100, `the control twin published almost nothing to compare (${nonEmpty} members)`);
  console.log(`      ${CONTROL.size} members · ${SCOPES.length} scopes · ${flipped} PRIMARY flags dropped in the pack`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · first paint: the live read has been seen, so the stale pack is refused");
// ═════════════════════════════════════════════════════════════════════════════
// The arrival order a warm device produces. The live read lands and stamps its
// generation; the fire-and-forget pack warm-up resolves a moment later, of the
// generation it was built from. It must not seed, before or after the live rows
// are filed, and the same-generation case must not be a way back in either —
// once a live read owns the row, provenance decides on its own.
const B = boot();
let refusedBefore = 0, refusedAfter = 0, refusedSameGen = 0, leaked = 0, declared = 0;
for (const [pid, recs] of byMember) {
  const VR = B.PDXVotingRecord;
  const pk = STALE.get(pid);
  const gen = VR._payloadGen(pk);
  if (gen === GEN_PACK) declared++;
  VR._noteLiveGen(pid, LIVE_PAYLOAD);
  if (VR.noteMember(pid, pk.items, gen) === false) refusedBefore++;
  if (VR._packMaySeed(pid, gen) === false) refusedAfter++;
  try { VR.noteMember(pid, recs); } catch (e) {}
  if (VR.noteMember(pid, pk.items, gen) === false) leaked++;
  if (VR.noteMember(pid, pk.items, GEN_LIVE) === false) refusedSameGen++;
}
eq(declared, byMember.size,
  "a pack payload did not declare its own generation — _payloadGen read it as a live answer, which is the guard bypassed rather than passed");
eq(refusedBefore, byMember.size, "a stale pack seeded a row whose live generation was already on file");
eq(refusedAfter, byMember.size, "fetchPack would have warmed a row the live read had already claimed");
eq(leaked, byMember.size, "a stale pack was filed over live rows");
eq(refusedSameGen, byMember.size, "a pack of the SAME generation overwrote live rows — provenance stopped deciding");
{
  const drift = [];
  for (const pid of byMember.keys()) {
    if (readOf(B, pid, SCOPES) !== CONTROL.get(pid)) drift.push(pid);
  }
  eq(drift.length, 0,
    `${drift.length} member read(s) moved on the first-paint order: ${drift.slice(0, 6).join(" ")}`);
  console.log(`      ${refusedBefore} refusals before the live rows · ${leaked} after · ${refusedSameGen} on the same generation`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · offline first: the pack answers, then the live read takes the row back");
// ═════════════════════════════════════════════════════════════════════════════
// The other order, and the one the request names: offline, or a first paint whose
// pack resolved first, the pack IS the answer and has to seed — nothing else is
// coming. What must not survive is the pack surviving the live read. So the stale
// pack seeds an empty slot, the row is checked to be honestly the pack's, the live
// read then arrives, and the harvest has to land back on the control.
const C = boot();
let seeded = 0, filedAsPack = 0, tookOver = 0, refusedAgain = 0;
for (const [pid] of byMember) {
  const VR = C.PDXVotingRecord;
  const pk = STALE.get(pid);
  if (VR.noteMember(pid, pk.items, VR._payloadGen(pk)) !== false) seeded++;
  if (VR.recordGeneration(pid) === GEN_PACK) filedAsPack++;
}
eq(seeded, byMember.size, "the offline reader was refused the only answer available");
eq(filedAsPack, byMember.size, "an offline row is not filed under the pack's own generation — it reads as live");
{
  // …and while it stands, it IS the retired mapping. Not a forgery: the point of
  // the generation on the row is that the app can say what it is holding.
  let differs = 0;
  for (const pid of byMember.keys()) if (readOf(C, pid, SCOPES) !== CONTROL.get(pid)) differs++;
  ok(differs > 0,
    "the stale pack read identically to the live rows, so this twin proves nothing — the fixture stopped being stale");
  console.log(`      ${seeded} offline seeds accepted · ${differs} of them read differently from the live record`);
}
for (const [pid, recs] of byMember) {
  const VR = C.PDXVotingRecord;
  const pk = STALE.get(pid);
  if (VR.noteMember(pid, recs) !== false) tookOver++;
  VR._noteLiveGen(pid, LIVE_PAYLOAD);
  if (VR.noteMember(pid, pk.items, VR._payloadGen(pk)) === false) refusedAgain++;
}
eq(tookOver, byMember.size, "a live payload was refused — the live read is the mapping table and may always be filed");
eq(refusedAgain, byMember.size, "the pack came back after the live read had taken the row");
{
  const drift = [];
  for (const pid of byMember.keys()) {
    if (readOf(C, pid, SCOPES) !== CONTROL.get(pid)) drift.push(pid);
  }
  eq(drift.length, 0,
    `${drift.length} member read(s) kept the offline pack's mapping after the live read landed: ${drift.slice(0, 6).join(" ")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the reported pair, on the surface the report was filed against");
// ═════════════════════════════════════════════════════════════════════════════
// The twin above compares indexes. This compares the sentence a reader sees, on
// /p/curtis · housing and /p/lee · housing — the two rows the live smoke named —
// across all three twins. The dossier read is computed when the reader clicks,
// which is why it was the surface that showed the downgrade in the first place.
{
  const PAIR = ["curtis", "lee"];
  const KEYS = Object.keys(A.ISSUE_MAP || {});
  must(KEYS.length > 0, "ISSUE_MAP is empty, so no dossier read can be asked for");
  let compared = 0;
  const drift = [];
  for (const pid of PAIR) {
    if (!A.CMP_DATA[pid]) continue;
    for (const k of KEYS) {
      const a = JSON.stringify(A.PDXConsistency.dossierRead(pid, k));
      compared++;
      for (const [name, win] of [["first paint", B], ["offline then live", C]]) {
        if (JSON.stringify(win.PDXConsistency.dossierRead(pid, k)) !== a) drift.push(`${pid}/${k} (${name})`);
      }
    }
  }
  ok(compared > 0, "neither reported member is in this corpus, so the pair proves nothing");
  eq(drift.slice(0, 6).join(" | "), "",
    `${drift.length} dossier read(s) on the reported pair differ from the live-only device`);
  console.log(`      ${compared} dossier read(s) per twin on curtis + lee; none moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("");
if (failures.length) {
  console.error(`✗ vr-pack live twin boot: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ vr-pack live twin boot: the versioned pack lane moves no formal read on the live path — ${passed} assertions passed\n`);
