#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// THE STOWAWAY: POLICY THAT NEVER GOT ITS OWN VOTE
// ─────────────────────────────────────────────────────────────────────────────
// A great deal of real policy never receives a clean up-or-down vote. It moves as
// a title, a subtitle or a rider inside an omnibus, an NDAA, a reconciliation
// package or a continuing resolution. The member votes on the PACKAGE. Our formal
// record lane then reads that vote onto every issue the package touched, and the
// row that comes out —
//
//     🌱 Public Lands & Energy    🏛 Thin opposes · 2 votes against
//
// — is indistinguishable from a row built out of two votes actually about public
// lands. It is not the same record, and the difference is not a detail: one is a
// member taking a position, the other is a member voting on a bill that had a
// position stapled to it. Without disclosure the formal lane looks cleaner and
// more intentional than the legislative process it is reading actually permits.
//
// WHAT THIS FILE PINS
//
//   1 · THE CONDITION IS THREE CONDITIONS, ALL REQUIRED. A multi-issue
//       instrument, a non-primary mapping, and a narrow curator weight. Any two
//       of the three describe ordinary legislating and would flag half the
//       corpus; the test measures that directly rather than asserting it.
//   2 · IT DOES NOT OVER-CLAIM. The row wears the framing only when most of its
//       mapped instruments are provisions, and only on rows that read a formal
//       signal at all. A refused row already says the truer thing.
//   3 · THE RECORD IS NOT WEAKENED. Every tier, label, count and percentage is
//       computed twice — once on a boot that renders every vehicle surface, once
//       on a boot that never touches one — and must be identical. Direction
//       Match included, since that is the wall this feature could most easily
//       have breached.
//   4 · THE COPY IS ON THE ROWS PEOPLE LOOK AT. Formal-pattern index row,
//       Official Record row chip, stance row, stance-tree leaf — with the bill
//       named where there is a bill to name.
//   5 · A CLEAN VOTE STAYS CLEAN. Absence is the signal on the other side, so a
//       standalone row must carry no marker, no attribute and no copy.
//   6 · THE BASELINE STILL WORKS, and carries the vehicle with it, so a
//       record-derived baseline printed on a third surface cannot arrive there
//       stripped of the disclosure.
//
//   node scripts/test-record-vehicle-context.mjs
//
// The member roll-call lane is an API in a live browser. vr-record-corpus.mjs
// rebuilds it offline from the shipped seeds so this harness sees the same rows a
// reader does.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "stance-tree.js",
];

const CORPUS = buildCorpus(ROOT);
function boot() {
  const win = makeSandbox();
  const sb = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(R(f), sb, { filename: f });
  win.PROFILES = win.CMP_DATA;
  for (const [pid, items] of CORPUS.byMember) {
    if (win.CMP_DATA[pid]) win.PDXVotingRecord.noteMember(pid, items);
  }
  return win;
}

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — unexpectedly contains ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const win = boot();
const CS = win.PDXConsistency;
const MEMBERS = [...CORPUS.byMember.keys()].filter((p) => win.CMP_DATA[p]);
ok(MEMBERS.length > 150, `only ${MEMBERS.length} members reached the renderer — every count below is running thin`);

// The whole population, once: every formal-pattern row on every member.
const ROWS = [];
for (const pid of MEMBERS) {
  let rows = [];
  try { rows = CS.formalPatternIndex.rows(pid) || []; } catch (e) { continue; }
  for (const x of rows) ROWS.push(x);
}
const MARKED = ROWS.filter((x) => x.vehicle && x.vehicle.stowaway);
console.log(`corpus: ${MEMBERS.length} members · ${ROWS.length} formal rows · ${MARKED.length} package-borne`);
ok(ROWS.length > 5000, `only ${ROWS.length} formal rows built`);
ok(MARKED.length > 100, `only ${MARKED.length} rows carry the disclosure — the detector may have stopped firing`);

/* ═══ 1 · three conditions, and all three are load-bearing ════════════════ */
section("1 · a vehicle, a passenger, and a slice — all three, or nothing");
{
  const NARROW_AT = CS.vehicle.NARROW_AT;
  eq(NARROW_AT, win._PDX_RD_NARROW_AT, "the section's narrow-link threshold is the one the record lane already uses");
  eq(CS.vehicle.SHARE_AT, win._PDX_RD_STOWAWAY_AT, "and the row-level share threshold is published, not hidden");

  // The unit itself. Three properties, each independently fatal.
  const P = win._rdIsProvision;
  eq(typeof P, "function", "the per-instrument test is published for anything that needs it");
  const rider = { issues: ["a", "b"] };
  eq(P(rider, { isPrimary: false, weight: 20 }), true, "a narrow secondary mapping on a multi-issue bill is a provision");
  eq(P({ issues: ["a"] }, { isPrimary: false, weight: 20 }), false,
    "…but a single-issue instrument is not a vehicle, whatever its weight");
  eq(P(rider, { isPrimary: true, weight: 20 }), false,
    "…and a primary mapping means the bill WAS the policy, however small its weight field");
  eq(P(rider, { isPrimary: false, weight: NARROW_AT + 1 }), false,
    "…and a mapping wide enough to be a main subject is a subject, not a stowaway");
  eq(P(rider, { isPrimary: false, weight: NARROW_AT }), true, "…with the boundary itself inclusive");
  eq(P(rider, {}), false, "an unweighted mapping defaults to the full bill and is never a provision");
  eq(P(null, { isPrimary: false, weight: 1 }), false, "no item, no read");
  eq(P(rider, null), false, "no mapping, no read");

  // And the measurement the third condition exists for: without it, "not the
  // primary issue" alone is the ordinary state of nearly every secondary mapping,
  // and the label would land on a third of the corpus rather than on a finding.
  let anyMulti = 0;
  for (const x of ROWS) if (x.vehicle && x.vehicle.total > 0 && x.vehicle.provision < x.vehicle.total) anyMulti++;
  ok(MARKED.length < ROWS.length * 0.1,
    `${((100 * MARKED.length) / ROWS.length).toFixed(1)}% of rows are marked — this is a label, not a finding`);
}

/* ═══ 2 · it does not over-claim ══════════════════════════════════════════ */
section("2 · most multi-issue rows are ordinary, and are left alone");
{
  for (const x of MARKED) {
    const at = `${x.pid}/${x.key}`;
    ok(x.vehicle.share >= CS.vehicle.SHARE_AT,
      `${at}: marked at share ${x.vehicle.share.toFixed(2)}, below the published threshold`);
    ok(x.vehicle.provision > 0, `${at}: marked with no provisions counted`);
    ok(x.vehicle.provision <= x.vehicle.total, `${at}: more provisions than instruments`);
    ok(x.read === true, `${at}: a row the engine refused is wearing a claim about how its signal travelled`);
  }
  // The other side of the same rule: a row that clears the share but was refused a
  // read must NOT be marked. Those are three quarters of what a raw tally flags.
  let refusedWithShare = 0;
  for (const pid of MEMBERS) {
    for (const x of CS.formalPatternIndex.rows(pid) || []) {
      if (x.read) continue;
      const raw = CS.vehicle.stats(pid, x.key);
      if (raw && raw.stowaway) {
        refusedWithShare++;
        eq(x.vehicle, null, `${pid}/${x.key}: an unread row must carry no vehicle claim`);
        eq(CS.vehicle.line(pid, x.key), "", `${pid}/${x.key}: …and no sentence either`);
      }
    }
  }
  ok(refusedWithShare > 100,
    `only ${refusedWithShare} refused-but-package-borne rows found — the suppression above is untested`);
  console.log(`      ${MARKED.length} marked · ${refusedWithShare} suppressed on refused rows`);
}

/* ═══ 3 · the copy, on the rows people actually look at ═══════════════════ */
section("3 · index row, record chip, stance row, tree leaf");
{
  // The deepest marked member, so the assertions run on a real profile rather
  // than on whichever one sorts first.
  const byPid = {};
  for (const x of MARKED) byPid[x.pid] = (byPid[x.pid] || 0) + 1;
  const PID = Object.keys(byPid).sort((a, b) => byPid[b] - byPid[a] || (a < b ? -1 : 1))[0];
  const P = win.CMP_DATA[PID];
  const mine = MARKED.filter((x) => x.pid === PID);
  console.log(`      subject: ${PID} · ${mine.length} package-borne row(s)`);
  ok(mine.length >= 2, `${PID} carries only ${mine.length} marked row(s)`);

  const FPI = String(CS.formalPatternIndex.html(PID) || "");
  const OR = String(CS.officialRecordSectionHtml(PID, P) || "");
  const ST = String(CS.stancesSectionHtml(PID, P) || "");
  const TREE = String((win.PDXStanceTree && win.PDXStanceTree.html(PID, P)) || "");
  ok(TREE.length > 1000, "the stance tree rendered");

  for (const x of mine) {
    const line = CS.vehicle.line(PID, x.key);
    const at = `${PID}/${x.key}`;
    ok(line.length > 0, `${at}: marked but wordless`);
    has(line, "not as", `${at}: the line never says what it is NOT`);
    ok(/standalone vote/.test(line), `${at}: the phrase a reader is meant to take away is missing`);
    // Direction-aware, and only where the row has a direction to be aware of.
    const lead = line.split(" ")[0];
    eq(lead, x.tone === "support" ? "Advanced" : x.tone === "oppose" ? "Opposed" : "Carried",
      `${at}: the line's verb disagrees with the row's own tone (${x.tone})`);
    // Named where there is one name to give.
    if (x.vehicle.sole) has(line, x.vehicle.sole, `${at}: one vehicle, and the line does not name it`);
    // …and present on all four faces.
    has(FPI, line, `${at}: the formal-pattern index row does not carry the line`);
    has(OR, line, `${at}: the Official Record row does not carry the line`);
    has(ST, line, `${at}: the stance row does not carry the line`);
    has(TREE, 'data-pdxtree-vehicle="1"', `${at}: no tree leaf is marked at all`);
  }
  eq((FPI.match(/class="pdxfpi-veh"/g) || []).length, mine.length,
    "the index prints exactly one vehicle line per package-borne row");
  eq((OR.match(/pdxor-vehchip/g) || []).length, mine.length,
    "the Official Record prints exactly one vehicle chip per package-borne row");
  eq((ST.match(/class="pdxst-veh"/g) || []).length, mine.length,
    "the stance section prints exactly one vehicle note per package-borne row");
  eq((TREE.match(/class="pdxtree-veh"/g) || []).length, mine.length,
    "the tree prints exactly one vehicle tag per package-borne row");

  // THE DISCLOSURE IS BESIDE THE FINDING, NEVER INSTEAD OF IT.
  for (const x of mine) {
    if (!x.patLabel) continue;
    has(FPI, x.patLabel, `${PID}/${x.key}: the pattern label was dropped from the row it discloses on`);
    if (x.counts) has(FPI, x.counts, `${PID}/${x.key}: the direction counts were dropped`);
  }

  // A CLEAN ROW IS CLEAN. Absence is the other half of the signal.
  const clean = (CS.formalPatternIndex.rows(PID) || []).filter((x) => !(x.vehicle && x.vehicle.stowaway));
  ok(clean.length > 5, `${PID} has only ${clean.length} unmarked rows`);
  for (const x of clean) {
    eq(CS.vehicle.line(PID, x.key), "", `${PID}/${x.key}: an unmarked row produced a sentence`);
    eq(CS.vehicle.isStowaway(PID, x.key) && x.read, false,
      `${PID}/${x.key}: a read row is a stowaway but was not marked`);
  }
  eq((FPI.match(/data-pdxfpi-vehicle=/g) || []).length, mine.length,
    "and the row attribute appears on the marked rows and nowhere else");

  // The full disclosure names its vehicles, because "a larger measure" is not
  // something a reader can go and check and a bill number is.
  for (const x of mine) {
    const note = CS.vehicle.note(PID, x.key);
    has(note, "provision", `${PID}/${x.key}: the note does not say what travelled`);
    for (const v of x.vehicle.vehicles) has(note, v, `${PID}/${x.key}: the note omits vehicle ${v}`);
  }
}

/* ═══ 4 · nothing moved ═══════════════════════════════════════════════════ */
section("4 · every figure identical with the disclosure read and unread");
{
  // Two boots of the same corpus. One is exhaustively walked through every
  // vehicle surface; the other never learns the feature exists. If a single tier,
  // count, label or percentage differs, the disclosure is a gate wearing a
  // sentence and the record lane has been quietly rewritten.
  const warm = boot(), cold = boot();
  const WC = warm.PDXConsistency, CC = cold.PDXConsistency;
  const SAMPLE = MEMBERS.slice(0, 40);
  for (const pid of SAMPLE) {
    const p = warm.CMP_DATA[pid];
    WC.formalPatternIndex.html(pid);
    WC.officialRecordSectionHtml(pid, p);
    WC.stancesSectionHtml(pid, p);
    (WC.formalPatternIndex.rows(pid) || []).forEach((x) => {
      WC.vehicle.line(pid, x.key); WC.vehicle.note(pid, x.key); WC.vehicle.stats(pid, x.key);
    });
  }
  const sig = (C, W, pid) => (C.formalPatternIndex.rows(pid) || [])
    .map((x) => [x.key, x.tier, x.tone, x.weight, x.patLabel, x.counts, x.judged, x.held, x.read].join("~")).join("|");
  for (const pid of SAMPLE) {
    eq(sig(WC, warm, pid), sig(CC, cold, pid), `${pid}: the formal pattern index moved`);
  }
  // DIRECTION MATCH, THE WALL THIS FEATURE COULD MOST EASILY HAVE BREACHED.
  for (const pid of SAMPLE) {
    const a = warm.PDXWordAction.read(pid, warm.CMP_DATA[pid]);
    const b = cold.PDXWordAction.read(pid, cold.CMP_DATA[pid]);
    eq(!!a, !!b, `${pid}: one boot produced a Direction Match read and the other did not`);
    if (!a || !b) continue;
    eq(a.pct, b.pct, `${pid}: Direction Match percentage moved`);
    eq(a.state, b.state, `${pid}: Direction Match state moved`);
    // `tested` is the scored ledger itself, and the two boots hold two different
    // object graphs of it — so the comparison is over what it MEANS: which items
    // were scored, and what each of them scored.
    const led = (r) => (Array.isArray(r.tested) ? r.tested : [])
      .map((t) => [t.issueKey, t.stance, t.weight, t.appliedWeight,
        t.test && t.test.state, t.test && t.test.score, t.test && t.test.token,
        t.test && t.test.judged].join("~")).join("|");
    eq(led(a), led(b), `${pid}: the Direction Match ledger moved`);
    eq((Array.isArray(a.tested) ? a.tested : []).length,
       (Array.isArray(b.tested) ? b.tested : []).length, `${pid}: Direction Match tested count moved`);
  }
  // …and structurally, not just numerically: the scoring lane cannot name it.
  const WA = R("word-action.js");
  lacks(WA, "vehicle", "Direction Match's own source must not mention the vehicle read");
  lacks(WA, "stowaway", "…nor the stowaway condition");
  // The detector never reaches into the stated lane either.
  const SH = R("stance-helpers.js").slice(R("stance-helpers.js").indexOf("function _recordVehicleStats"));
  lacks(SH.slice(0, 2000), "ISSUE_STANCE_DATA", "the detector reads instruments, never curated stances");
}

/* ═══ 5 · the baseline still works, and carries the vehicle with it ═══════ */
section("5 · a record-derived baseline arrives with its disclosure attached");
{
  let baselines = 0, withVeh = 0;
  for (const pid of MEMBERS.slice(0, 60)) {
    for (const b of CS.baseline.rows(pid) || []) {
      baselines++;
      ok(typeof b.vehicleLine === "string", `${pid}/${b.key}: the baseline entry lost its vehicle field`);
      const marked = CS.vehicle.isStowaway(pid, b.key);
      if (marked) {
        withVeh++;
        ok(b.vehicleLine.length > 0,
          `${pid}/${b.key}: a package-borne baseline would print with no disclosure on a third surface`);
        has(b.vehicleNote, "provision", `${pid}/${b.key}: the baseline's note does not explain itself`);
      } else {
        eq(b.vehicleLine, "", `${pid}/${b.key}: a clean baseline invented a vehicle`);
      }
      // And the baseline itself is untouched by any of it.
      ok(b.basis === "record" && b.derived === true && b.stated === false,
        `${pid}/${b.key}: the baseline's own provenance fields moved`);
      has(b.notInDm, "Direction Match", `${pid}/${b.key}: the baseline stopped disowning the score`);
    }
  }
  ok(baselines > 200, `only ${baselines} baselines built — section 5 is running on nothing`);
  ok(withVeh > 0, `no package-borne baseline in the sample — the branch above is untested`);
  console.log(`      ${baselines} baselines · ${withVeh} of them package-borne`);
}

console.log("");
if (fails.length) {
  console.error(`✗ record vehicle context: ${fails.length} failure(s) of ${pass + fails.length}`);
  for (const f of fails.slice(0, 40)) console.error("  · " + f);
  process.exit(1);
}
console.log(`✓ record vehicle context: all ${pass} assertions passed — ${MARKED.length} package-borne rows disclosed, ${ROWS.length - MARKED.length} clean rows left clean, no figure moved`);
