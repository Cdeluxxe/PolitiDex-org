#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-utah-committee-mapping.mjs — WAVE 4: the curator mapping pass, fenced
// ─────────────────────────────────────────────────────────────────────────────
// Wave 3 admitted committee votes only on bills that already had a reviewed issue
// mapping, and reported the rest as a number: 314 bills with a contested
// pass-out-favorably roll call and nowhere to file it. Wave 4 read those bills and
// decided every one of them. The decisions are prose in db/vr-utah-committee-bills-
// {2025GS,2024GS,2023GS}.json — wave 8 did the 2023GS bucket on the same terms —
// and prose is exactly the kind of artefact that rots
// quietly — so this harness fences the six ways it could rot:
//
//   1. ACCOUNTABILITY. Every bill in the refusal bucket is decided, once. No bill
//      is both admitted and refused, no stranger is decided, none is skipped. A
//      bill that LEFT the bucket because another wave reviewed a mapping for it is
//      a documented exit, flagged `leftTheBucket` on its refusal, and an unflagged
//      one still fails.
//   2. NO NEW VOCABULARY. Every admitted key is one of the 121 shipped keys, and
//      the shipped key list is byte-unchanged in count. The pass had a standing
//      instruction to refuse rather than invent, and this is what that looks like
//      as a test.
//   3. ONE PRIMARY, AND SECONDARIES STAY NARROW. Exactly one primary key per
//      bill; every additional key is non-primary AND at or under the shipped
//      narrow-link bar, so a distinct-provision mapping prints as the narrow link
//      it is rather than as a second headline.
//   4. THE REFUSALS ARE WRITTEN, NOT COUNTED. Every refusal carries prose, and
//      every admitted rationale names the document it was read out of using the
//      SAME word as the fetched text kind — an "enrolled text" claim over an
//      introduced bill is a provenance defect even when the mapping is right.
//   5. THE MIGRATIONS CHANGE NOTHING ELSE. The two new pending files insert
//      committee_vote positions and reviewed mappings and nothing else: no
//      rollcall, no member vote, no floor action code, no weight, no threshold.
//   6. THE FLOORS DID NOT MOVE. The Utah formal pattern index is re-measured
//      through the shipped module: the pre-wave triple reads 10 / 20 / 102 on a
//      132-member roster, and the post-wave triple is whatever the shipped tiers
//      say it is — including the one issue that lost its characterisation, which is
//      disclosed here rather than repaired by dropping the committee vote that
//      contradicts it. Tier MEMBERSHIP is checked and not only tier size: the ten
//      empty members are the same ten, nobody loses a readable record, and 13 of
//      wave 6's 16 identity-only roster rows still land on thin — the tier that says
//      "real material, not enough pattern to characterise". The other three are
//      named: wave 8's 2023GS mappings gave kera_birkeland, steven_lund and
//      susan_pulsipher their first characterised issue apiece, so they read now.
//      That is asserted as an EARNED crossing — each held 0 clear issues before and
//      holds at least one after, on strictly more acts — rather than forbidden.
//
//   node scripts/test-vr-utah-committee-mapping.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (cond) return; console.error(`✗ vr-utah-committee-mapping: ${msg}`); process.exit(1); };

const SESSIONS = ["2025GS", "2024GS", "2023GS"];
const DEC = {}, SEED = {};
for (const s of SESSIONS) {
  DEC[s] = J(`db/vr-utah-committee-bills-${s}.json`);
  SEED[s] = J(`db/vr-utah-committee-mapping-seed-${s}.json`);
  must(DEC[s].bills && DEC[s]._refused, `${s}: the decision file has no bills/_refused arrays`);
  must(SEED[s].measures, `${s}: the seed has no measures`);
}
// A SESSION'S MIGRATIONS ARE A LIST, BECAUSE AN APPLIED FILE IS NOT EDITABLE.
// The first version of this harness read one file per session and compared its
// block count to the seed's measure count. That held exactly as long as the seed
// never changed after shipping. It changed: widening the renamed-committee door
// in the ingest recovered four committee acts and 67 positions for 2024GS, which
// grew the seed while 20261007000000 stayed frozen on disk as the record of what
// the database was actually told. So the invariant is restated over the SET: the
// union of a session's migrations is the seed, no single file has to be.
//
// Union, not sum. A delta restates whole measure blocks — that is what makes it
// idempotent — so the same measure and the same position appear in two files. A
// harness that added the counts would read 76 blocks for 64 measures and call it
// drift. It compares distinct measures and distinct positions instead, and it
// checks both directions, so a row that quietly disappeared from the seed after
// being written to the database fails here rather than going unnoticed.
const MIGS = { "2025GS": ["netlify/database/migrations/20261006000000_vr_utah_2025gs_committee_mapping.sql",
                          "netlify/database/migrations/20261016000000_vr_utah_2025gs_committee_mapping_v1_committee_only_bills.sql"],
               "2024GS": ["netlify/database/migrations/20261007000000_vr_utah_2024gs_committee_mapping.sql",
                          "netlify/database/migrations/20261008000000_vr_utah_2024gs_committee_mapping_renamed_committee.sql",
                          "netlify/database/migrations/20261015000000_vr_utah_2024gs_committee_mapping_roster_rows_and_v1_bills.sql"],
               // Wave 8, the same job on the session wave 7 re-verified and left alone.
               "2023GS": ["netlify/database/migrations/20261019000000_vr_utah_2023gs_committee_mapping_v1_committee_only_bills.sql"] };
for (const s of SESSIONS) for (const f of MIGS[s]) must(existsSync(join(ROOT, f)), `${s}: ${f} is missing`);
const SQL = {};
for (const s of SESSIONS) SQL[s] = MIGS[s].map((f) => R(f)).join("\n");

// Parse the executable shape of a session's migrations into { measures, positions,
// mappings } sets, keyed the way Postgres keys them, so restatement collapses.
function sqlRows(session) {
  const measures = new Map(), positions = new Set(), mappings = new Set();
  for (const f of MIGS[session]) {
    const text = R(f);
    const blocks = text.split(/^DO \$\$$/m).slice(1);
    for (const b of blocks) {
      // The trailing VERIFICATION block is not a measure block — it names no bill,
      // writes nothing and only counts what the measure blocks above it wrote. It is
      // skipped here and fenced separately in section 5, which asserts it is read-only.
      if (/^DECLARE n_pos integer;/m.test(b)) continue;
      const num = /number = '([^']+)'/.exec(b), ch = /chamber = '([^']+)'/.exec(b);
      must(num && ch, `${session}: a DO block in ${f} does not select its measure by number and chamber`);
      const key = `${ch[1]}|${num[1]}`;
      measures.set(key, (measures.get(key) || 0) + 1);
      for (const m of b.matchAll(/\(m_id, '([a-z0-9_]+)', 'committee_vote', (?:true|false), '([^']+)'/g)) {
        positions.add(`${key}|${m[1]}|${m[2]}`);
      }
      for (const m of b.matchAll(/WHERE measure_id = m_id AND issue_key = '([a-z0-9_.:-]+)'/g)) {
        mappings.add(`${key}|${m[1]}`);
      }
    }
  }
  return { measures, positions, mappings };
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every bill in the bucket is decided, exactly once");
// ═════════════════════════════════════════════════════════════════════════════
// The bucket is not restated here: it is recomputed by the shipped ingest, so a
// bill that leaves or joins the bucket breaks this test instead of being silently
// dropped from the pass.
{
  const out = execFileSync(process.execPath,
    [join(ROOT, "scripts/vr-utah-committee-mapping.mjs"), "--verify", "--session", "2025GS"],
    { cwd: ROOT, encoding: "utf8" }) +
    execFileSync(process.execPath,
    [join(ROOT, "scripts/vr-utah-committee-mapping.mjs"), "--verify", "--session", "2024GS"],
    { cwd: ROOT, encoding: "utf8" }) +
    execFileSync(process.execPath,
    [join(ROOT, "scripts/vr-utah-committee-mapping.mjs"), "--verify", "--session", "2023GS"],
    { cwd: ROOT, encoding: "utf8" });
  has(out, "2025GS: bucket 170 · admitted 78 · refused 95 · unaccounted 0",
    "2025GS: the whole 170-bill bucket is decided, with nothing unaccounted");
  has(out, "2024GS: bucket 140 · admitted 66 · refused 75 · unaccounted 0",
    "2024GS: the whole 140-bill bucket is decided, with nothing unaccounted");
  has(out, "2023GS: bucket 135 · admitted 68 · refused 67 · unaccounted 0",
    "2023GS: the whole 135-bill bucket is decided, with nothing unaccounted");
  // THE BUCKET SHRANK WHILE THE ADMITTED COUNT GREW, AND THAT IS DISCLOSED RATHER
  // THAN QUIET. The bucket is "bills with a committee vote and NO reviewed issue
  // mapping", so vocabulary wave V1 reviewing a mapping for four of them moved them
  // out of this lane and into the formal one. Their refusals stay on the record —
  // this lane really did decline to map them — flagged `leftTheBucket: true`, which
  // is what tells --verify a documented exit from silent drift. An unflagged one is
  // still a failure, and a flag on a bill the bucket still holds is a failure the
  // other way.
  has(out, "LEFT THE BUCKET, IN WRITING: SB0026, SB0316, SB0336",
    "2025GS: the three bills V1 mapped out of the bucket are named, not dropped");
  has(out, "LEFT THE BUCKET, IN WRITING: HB0348",
    "2024GS: … and so is 2024's one");
  // 2023GS has no exits: no wave reviewed a key for any of its 135 while the pass
  // ran, so an exit line for it would be the invention this section exists to catch.
  // The suffix rides on the same line as the summary, so the LINE is what is read.
  {
    const line = out.split("\n").find((l) => l.startsWith("2023GS: bucket")) || "";
    lacks(line, "LEFT THE BUCKET", "2023GS: no bill claims an exit nobody granted");
  }
  lacks(out, "NOT IN BUCKET", "no session names a bill it cannot account for");
  lacks(out, "FLAGGED BUT STILL IN BUCKET",
    "no refusal claims an exit the recomputed bucket contradicts");
  for (const s of SESSIONS) {
    const a = JSON.parse(execFileSync(process.execPath,
      [join(ROOT, "scripts/vr-utah-committee-mapping.mjs"), "--verify", "--session", s, "--json"],
      { cwd: ROOT, encoding: "utf8" }));
    eq(a.mislabelled.length, 0, `${s}: no leftTheBucket flag sits on a bill still in the bucket`);
    for (const b of a.leftBucket) {
      const r = DEC[s]._refused.find((x) => x.bill === b);
      ok(r && /vocab-wave-V1|vocabulary wave V1/.test(String(r.why)),
        `${s}: ${b}'s refusal says which wave took it out of this lane`);
      ok(!DEC[s].bills.some((x) => x.bill === b),
        `${s}: ${b} is not also admitted here — one lane maps a bill, not two`);
      ok(!SEED[s].measures.some((m) => m.utahBill === b),
        `${s}: ${b} carries no measure in this lane's seed`);
    }
    has(String(DEC[s]._leftTheBucket || ""), "leftTheBucket",
      `${s}: the decision file explains the flag in its own words`);
  }
  lacks(out, "unaccounted 1", "no session leaves a bill undecided");

  for (const s of SESSIONS) {
    const adm = DEC[s].bills.map((b) => b.bill), ref = DEC[s]._refused.map((b) => b.bill);
    eq(new Set(adm).size, adm.length, `${s}: no bill is admitted twice`);
    eq(new Set(ref).size, ref.length, `${s}: no bill is refused twice`);
    eq(adm.filter((b) => ref.includes(b)).length, 0, `${s}: no bill is both admitted and refused`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no key was invented for this pass");
// ═════════════════════════════════════════════════════════════════════════════
{
  const shipped = J("db/issue-keys.json");
  // 118 while wave 4 shipped, 121 now. The three are sound_money,
  // tobacco_nicotine and dev_district_finance, and they were reviewed and shipped
  // by vocabulary wave V1 (20261010000000) — not by this lane, which is exactly
  // what this section exists to establish. The pin moves when a reviewed wave adds
  // a key and never because a mapping pass wanted one.
  eq(shipped.count, 121, "the shipped issue vocabulary is 121 keys, the three V1 added included");
  for (const k of ["sound_money", "tobacco_nicotine", "dev_district_finance"]) {
    ok(shipped.keys.includes(k), `${k} is a shipped key, reviewed by V1 rather than invented here`);
  }
  eq(shipped.keys.length, shipped.count, "…and the list matches its own count");
  const allowed = new Set(shipped.keys);
  for (const s of SESSIONS) {
    const off = DEC[s].bills.flatMap((b) => b.issues.filter((i) => !allowed.has(i.issueKey)).map((i) => `${b.bill}:${i.issueKey}`));
    eq(off.length, 0, `${s}: every admitted key is a shipped key${off.length ? ` (${off.join(", ")})` : ""}`);
  }
  // The refusals are the other half of the same claim: a documented no-home bill is
  // refused in writing rather than parked on the nearest key.
  const homeless = DEC["2024GS"]._refused.find((r) => r.bill === "HB0198");
  ok(homeless && /no home|has no home/i.test(homeless.why),
    "a bill with a clear direction and no covering key is refused, and says so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one primary per bill, and additional keys stay narrow");
// ═════════════════════════════════════════════════════════════════════════════
{
  const win = boot();
  const NARROW = win._PDX_RD_NARROW_AT;
  must(typeof NARROW === "number", "the narrow-mapping bar is no longer published on window");
  for (const s of SESSIONS) {
    let secondaries = 0, overNarrow = [], badPrimary = [], badWeight = [], dup = [];
    for (const b of DEC[s].bills) {
      const prim = b.issues.filter((i) => i.isPrimary);
      if (prim.length !== 1) badPrimary.push(`${b.bill}:${prim.length}`);
      if (new Set(b.issues.map((i) => i.issueKey)).size !== b.issues.length) dup.push(b.bill);
      for (const i of b.issues) {
        if (!Number.isInteger(i.weight) || i.weight < 1 || i.weight > 100) badWeight.push(`${b.bill}:${i.weight}`);
        if (!i.isPrimary) { secondaries++; if (i.weight > NARROW) overNarrow.push(`${b.bill}:${i.issueKey}@${i.weight}`); }
        ok(i.supportMeaning === "yea_supports" || i.supportMeaning === "yea_opposes",
          `${s} ${b.bill} ${i.issueKey}: the direction is one of the two the engine reads`);
        ok(String(i.rationale || "").trim().length >= 80,
          `${s} ${b.bill} ${i.issueKey}: the mapping is defended in prose, not asserted`);
      }
    }
    eq(badPrimary.length, 0, `${s}: exactly one primary key per admitted bill${badPrimary.length ? ` (${badPrimary.join(", ")})` : ""}`);
    eq(dup.length, 0, `${s}: no bill carries the same key twice`);
    eq(badWeight.length, 0, `${s}: every weight is an integer 1–100`);
    eq(overNarrow.length, 0, `${s}: every additional key sits at or under the narrow-link bar of ${NARROW}${overNarrow.length ? ` (${overNarrow.join(", ")})` : ""}`);
    ok(secondaries === 0 || secondaries < DEC[s].bills.length / 4,
      `${s}: additional keys are the exception (${secondaries} across ${DEC[s].bills.length} bills), not the pattern`);
  }
  // Two-way bills stay refused, on the same standard the earlier waves set.
  for (const [s, bill] of [["2025GS", "SB0197"], ["2024GS", "HB0166"]]) {
    const r = DEC[s]._refused.find((x) => x.bill === bill);
    ok(r, `${s} ${bill}: the two-way bill is on the refusal list`);
    ok(r && r.why.length >= 40, `${s} ${bill}: …and the refusal is written out`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the refusals are prose, and the provenance is the fetched document");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ORD = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh"];
  const label = (kind) => kind === "enrolled" ? "Enrolled text"
    : kind === "introduced" ? "Introduced text"
    : `${ORD[Number(/^substitute_(\d)$/.exec(kind)[1])]} substitute text`;
  const LEAD = /^(Enrolled text|Introduced text|Substitute text|(?:First|Second|Third|Fourth|Fifth|Sixth) substitute(?: text)?)/;
  for (const s of SESSIONS) {
    const short = DEC[s]._refused.filter((r) => String(r.why || "").trim().length < 40);
    eq(short.length, 0, `${s}: every refusal states why, at length${short.length ? ` (${short.map((r) => r.bill).join(", ")})` : ""}`);
    const kind = new Map(SEED[s].measures.map((m) => [m.utahBill, m.textKind]));
    const wrong = [];
    for (const m of SEED[s].measures) {
      for (const i of m.issues) {
        const lead = LEAD.exec(i.rationale);
        if (!lead) continue;                       // a secondary key referring back to "the same text"
        if (lead[1] !== label(kind.get(m.utahBill))) wrong.push(`${m.utahBill}: says "${lead[1]}", read ${kind.get(m.utahBill)}`);
      }
    }
    eq(wrong.length, 0, `${s}: every rationale names the document it was actually read out of${wrong.length ? ` (${wrong.slice(0, 4).join("; ")})` : ""}`);
  }
  // The seed refuses to ship a mapping whose text was never readable, and says so
  // when an admitted bill's committee act did not survive the shipped fences.
  eq(SEED["2024GS"].counts.admittedButNoActSurvived, SEED["2024GS"].admittedButNoActSurvived.length,
    "2024GS: the count of admitted-but-actless bills equals the list of them");
  // THE FENCE-BILL CONTRACT IS "ATTACHED OR NAMED", NOT "SOME MUST STILL FAIL".
  // This assertion used to require the list to be non-empty, on the reasoning that
  // three 2024 bills failed the committee-name check and a silent drop would be
  // worse than a disclosed one. That reasoning was right about the disclosure and
  // wrong about the direction: it made a passing test out of a bug. H.B. 137,
  // H.B. 267 and H.B. 463 were not unconfirmable — the ingest's second door
  // compared a stopword-stripped committee key against a haystack that still had
  // its stopwords, so "House Business, Labor, and Commerce" could never match
  // "HOUSE BUSINESS AND LABOR" no matter what the PDF said. Date, motion sentence
  // and printed tally had matched all along. With the door widened, the list is
  // empty, and the requirement is the one the brief actually states: a bill is
  // either attached with its confirmation intact, or still on this list with a
  // reason. Never neither.
  for (const s of SESSIONS) {
    const seeded = new Set(SEED[s].measures.map((m) => m.utahBill));
    const stranded = SEED[s].admittedButNoActSurvived || [];
    for (const b of stranded) {
      ok(!seeded.has(b), `${s}: ${b} is named as actless rather than shipped half-attached`);
    }
    const admitted = DEC[s].bills.map((b) => b.bill);
    const lost = admitted.filter((b) => !seeded.has(b) && !stranded.includes(b));
    eq(lost.length, 0, `${s}: every admitted bill is either seeded or named as actless` +
      (lost.length ? ` (${lost.slice(0, 5).join(", ")})` : ""));
  }
  // The three published-PDF fence bills specifically: each one is attached, and the
  // act it is attached by still carries all four halves of the confirmation.
  {
    const FENCE = ["HB0137", "HB0267", "HB0463"];
    const byBill = new Map(SEED["2024GS"].measures.map((m) => [m.utahBill, m]));
    for (const b of FENCE) {
      const m = byBill.get(b);
      ok(!!m, `2024GS: ${b} has a measure — the renamed-committee door no longer refuses it`);
      if (!m) continue;
      ok(m.committeeActs.length > 0, `2024GS: ${b} carries at least one committee act`);
      for (const a of m.committeeActs) {
        ok(/^2024-\d\d-\d\d$/.test(a.date), `2024GS: ${b} act keeps its minutes date (${a.date})`);
        ok(/moved to pass/.test(a.motion), `2024GS: ${b} act keeps its motion sentence`);
        ok(Number.isInteger(a.printedTotals.yea) && Number.isInteger(a.printedTotals.nay),
          `2024GS: ${b} act keeps its printed tally`);
        ok(a.printedTotals.nay > 0, `2024GS: ${b} act is still a contested vote`);
        ok(/\.pdf$/i.test(String(a.sourceUrl)) || /minutes/i.test(String(a.sourceUrl)),
          `2024GS: ${b} act still cites the published minutes it was confirmed against`);
        ok(a.votes.length > 0, `2024GS: ${b} act names its voters`);
      }
    }
  }
  for (const s of SESSIONS) {
    eq(SEED[s].counts.supersededByFloorVote, 0,
      `${s}: no wave-4 position is superseded — these bills have no admitted floor roll, and the seed says so plainly`);
    eq(SEED[s].counts.positions, SEED[s].counts.notOnAnyFloorRoll,
      `${s}: every position is the member's only act on that bill`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the migrations add mappings and committee positions, and nothing else");
// ═════════════════════════════════════════════════════════════════════════════
{
  const applied = "20260928000000_pdx_notification_follow_categories";
  const names = readdirSync(join(ROOT, "netlify/database/migrations")).sort();
  for (const s of SESSIONS) {
    for (const f of MIGS[s]) {
      const stamp = f.split("/").pop();
      ok(stamp > applied, `${s}: ${stamp} is stamped after the last applied migration`);
      ok(names.includes(stamp), `${s}: ${stamp} is on disk under its own stamp`);
    }
    const stamps = MIGS[s].map((f) => f.split("/").pop());
    eq(stamps.length, new Set(stamps).size, `${s}: no migration is listed twice`);
    eq(stamps.join(","), [...stamps].sort().join(","),
      `${s}: the migrations are listed in the order Postgres will apply them`);
  }
  for (const s of SESSIONS) {
    const sql = SQL[s];
    const rows = sqlRows(s);
    const blocks = (sql.match(/DO \$\$/g) || []).length;
    eq(blocks, (sql.match(/END \$\$;/g) || []).length, `${s}: every DO block is closed`);
    // A VERIFICATION block is a DO block that writes nothing and selects no measure
    // — it counts what the file just wrote and raises if the number is wrong. It is
    // told apart by its own DECLARE line rather than by position, and it is excluded
    // from the per-measure block arithmetic below because it has no measure. Its own
    // fence is the read-only assertion further down: it may not contain a write.
    const guards = (sql.match(/^DECLARE n_pos integer;/gm) || []).length;
    const measureBlocks = blocks - guards;
    eq(rows.measures.size, SEED[s].measures.length,
      `${s}: the migrations name exactly the seed's ${SEED[s].measures.length} measures between them`);
    for (const m of SEED[s].measures) {
      ok(rows.measures.has(`${m.chamber}|${m.number}`),
        `${s}: ${m.utahBill} · ${m.number} has a block in some migration`);
    }
    // A restated measure is expected; a measure restated in a file that also has to
    // be the ONLY writer of a brand-new bill is not distinguishable here, so what is
    // asserted is the weaker true thing: every block re-selects before it inserts.
    eq((sql.match(/SELECT id INTO m_id FROM vr_measures/g) || []).length, measureBlocks,
      `${s}: every block finds its measure before writing anything`);
    eq((sql.match(/IF m_id IS NULL THEN/g) || []).length, measureBlocks,
      `${s}: …and only inserts the measure when it is genuinely absent`);
    // The wave-3 act type and weight are quoted, never redefined.
    const other = sql.match(/, '((?!committee_vote)[a-z_]+)', (?:true|false), '\d{4}-/g) || [];
    eq(other.length, 0, `${s}: no inserted position carries an action type other than committee_vote`);
    eq(rows.positions.size, SEED[s].counts.positions,
      `${s}: the migrations insert exactly the seed's ${SEED[s].counts.positions} distinct positions`);
    {
      const want = new Set();
      for (const m of SEED[s].measures) {
        for (const a of m.committeeActs) {
          for (const v of a.votes) want.add(`${m.chamber}|${m.number}|${v.politicianId}|${a.date}T00:00:00-07:00`);
        }
      }
      const missing = [...want].filter((k) => !rows.positions.has(k));
      const extra = [...rows.positions].filter((k) => !want.has(k));
      eq(missing.length, 0, `${s}: every seeded position is written by some migration` +
        (missing.length ? ` (missing ${missing.slice(0, 3).join(", ")})` : ""));
      eq(extra.length, 0, `${s}: no migration writes a position the seed does not hold` +
        (extra.length ? ` (extra ${extra.slice(0, 3).join(", ")})` : ""));
    }
    // No floor lane is touched: no roll call, no member vote, no action code. Read
    // off the EXECUTABLE text only — the header prose is required to discuss
    // vr_rollcalls and the 0.60 act weight in order to say it changes neither, and a
    // fence that cannot tell a comment from a statement would forbid the disclosure.
    //
    // A VERIFICATION block is held to a stricter rule and therefore read separately.
    // The fence's own words are "the file never WRITES vr_rollcalls", and a guard
    // that counts `FROM vr_rollcalls` to prove the count is zero is the assertion,
    // not the breach — reading a table to prove it is untouched is the opposite of
    // touching it. So the guard is cut out of the write fence and given a harder
    // one: it may contain no write statement of any kind.
    const wholeStmts = sql.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
    const guardBlocks = wholeStmts.match(/DO \$\$\nDECLARE n_pos integer;[\s\S]*?\nEND \$\$;/g) || [];
    eq(guardBlocks.length, guards,
      `${s}: every VERIFICATION block was located for the read-only check`);
    for (const g of guardBlocks) {
      for (const w of ["INSERT", "UPDATE", "DELETE", "ALTER", "DROP", "CREATE"]) {
        lacks(g, w, `${s}: the VERIFICATION block only counts — it never runs ${w}`);
      }
    }
    const stmts = guardBlocks.reduce((t, g) => t.split(g).join("\n"), wholeStmts);
    for (const t of ["vr_rollcalls", "vr_member_votes"]) lacks(stmts, t, `${s}: the file never writes ${t}`);
    lacks(stmts, "ALTER TABLE", `${s}: the file alters no table`);
    lacks(stmts, "DROP ", `${s}: the file drops nothing`);
    lacks(stmts, "UPDATE vr_", `${s}: the file updates no existing row`);
    has(sql, "NO FLOOR VOTES", `${s}: …and the header says so in the file itself`);
    has(sql, "ON CONFLICT", `${s}: the position inserts are idempotent`);
    has(sql, "IF NOT EXISTS (SELECT 1 FROM vr_measure_issues", `${s}: a mapping is written once`);
    // Weight and label live in stance-helpers, not here.
    lacks(stmts, "0.60", `${s}: the act weight is quoted in the header and never restated as SQL`);
    eq(rows.mappings.size, SEED[s].counts.issueMappings,
      `${s}: the migrations write exactly the seed's ${SEED[s].counts.issueMappings} reviewed mappings`);
  }
  // THIS LANE STILL ADDS NOTHING TO THE FLOOR SEED. The pin was 54/42 while wave 4
  // shipped and is 58/46 now: vocabulary wave V1 reviewed four mappings straight
  // onto floor-seed measures — which is how those four bills left this lane's
  // bucket — and every one of them carries its own primary. The point of the pin is
  // unchanged: a committee-mapping pass must not be able to write a floor mapping,
  // so the delta is checked to be exactly V1's four and nothing else.
  const floor = J("db/vr-utah-vote-seed.json");
  const mappings = floor.measures.reduce((n, m) => n + (m.issues || []).length, 0);
  const primaries = floor.measures.reduce((n, m) => n + (m.issues || []).filter((i) => i.isPrimary).length, 0);
  eq(mappings, 58, "the wave-1/2 floor seed holds 58 mappings — V1's four, and nothing this lane wrote");
  eq(primaries, 46, "…and 46 primaries, one per bill V1 mapped");
  const V1KEYS = new Set(["sound_money", "tobacco_nicotine", "dev_district_finance"]);
  const onFloor = floor.measures.flatMap((m) => (m.issues || [])
    .filter((i) => V1KEYS.has(i.issueKey)).map((i) => `${m.utahBill}:${i.issueKey}`));
  eq(onFloor.length, mappings - 54,
    `the floor seed grew by exactly the V1-key mappings (${onFloor.join(", ")})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the floors did not move, measured through the shipped index");
// ═════════════════════════════════════════════════════════════════════════════
{
  const out = execFileSync(process.execPath, [join(ROOT, "scripts/vr-utah-fpi.mjs"), "--json"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const M = JSON.parse(out);
  // THE PRE-WAVE TRIPLE IS THE CONTROL. Waves 1–3 published 10 / 4 / 102, and a
  // harness that cannot reproduce the number it is diffing against is measuring
  // something else.
  eq(M.before.empty, 10, "before: 10 members on the Utah roster hold nothing formal");
  eq(M.before.readable, 102, "before: 102 members have a record that reads");
  // 4 while wave 4 shipped, 20 now, and the 16 are named rather than absorbed. Wave
  // 6 added 16 identity-only rows to cmp-data.js for legislators who cast recorded
  // committee votes in 2023 and 2024 and had no roster record at all, so the
  // denominator grew from 116 to 132. Every one of them lands on THIN, which is the
  // honest tier for them: they hold real committee positions and not enough of a
  // pattern for the engine to characterise. None of them lands on EMPTY, so no row
  // was added that carries nothing, and none of them lands on READABLE, so no
  // identity row bought a characterisation it did not earn.
  eq(M.before.thin, 20, "before: 20 members hold material the engine will not characterise");
  eq(M.before.members, 132, "the roster denominator is the same 132 either way");
  eq(M.after.members, M.before.members, "wave 4 added no member to the roster");
  {
    const ROWS6 = ["jacob_anderegg", "kera_birkeland", "joel_briscoe", "david_buxton", "james_cobb",
      "brett_garner", "tim_jimenez", "brian_king", "quinn_kotter", "rosemary_lesser", "steven_lund",
      "susan_pulsipher", "judy_weeks_rohner", "robert_spendlove", "jeffrey_stenquist", "mark_wheatley"];
    eq(ROWS6.length, 16, "the 16 wave-6 identity rows are enumerated, not counted from a total");
    // THREE OF THE SIXTEEN CROSSED INTO READABLE, AND THAT IS THE FINDING, NOT A
    // FAILURE. This assertion used to require all 16 to be thin in BOTH states, and
    // that held while the mapping lane covered 2025GS and 2024GS only. Wave 8 mapped
    // the 2023GS off-lane bucket, and kera_birkeland, steven_lund and susan_pulsipher
    // each picked up enough committee acts on mapped bills for the SHIPPED tier rule
    // to characterise one or two issues for them. No floor moved to allow it: the
    // rule, the 0.60 committee weight and the coverage bar are the ones wave 3 and
    // wave 4 shipped, and the index is still the shipped module.
    //
    // The fence is kept where it belongs. Its purpose was never "an identity row may
    // never read" — it was "no identity row buys a characterisation it did not earn".
    // So the three are NAMED, and what they earned is asserted: each holds at least
    // one CLEAR issue after the wave and held none before. The other thirteen must
    // still be thin in both states, and nobody may land on empty.
    const CROSSED = ["kera_birkeland", "steven_lund", "susan_pulsipher"];
    for (const w of ["before", "after"]) {
      const bands = M[w].bands;
      must(bands && Array.isArray(bands.thin), "the index does not report band membership");
      const expectThin = w === "before" ? ROWS6 : ROWS6.filter((p) => !CROSSED.includes(p));
      const notThin = expectThin.filter((p) => !bands.thin.includes(p));
      eq(notThin.length, 0, `${w}: every wave-6 identity row that has not been named as crossing ` +
        `is thin, not empty and not readable (${notThin.join(", ")})`);
      const onEmpty = ROWS6.filter((p) => bands.empty.includes(p));
      eq(onEmpty.length, 0, `${w}: no identity row sits on empty (${onEmpty.join(", ")})`);
    }
    for (const pid of CROSSED) {
      ok(M.before.bands.thin.includes(pid), `${pid}: was thin before the mapping lane reached 2023GS`);
      ok(M.after.bands.readable.includes(pid), `${pid}: reads after it, which is why it is named here`);
      // What it EARNED, read off the same index one member at a time. The pair of
      // JSON objects `--member` prints is the shipped derivation's own answer.
      const per = execFileSync(process.execPath,
        [join(ROOT, "scripts/vr-utah-fpi.mjs"), "--member", pid],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      const pair = per.match(/\{[^}]*\}/g) || [];
      must(pair.length === 2, `${pid}: the index did not print a before/after pair`);
      const b = JSON.parse(pair[0]), a = JSON.parse(pair[1]);
      eq(b.characterised, 0, `${pid}: earned its first characterised issue in this wave, not before`);
      ok(a.characterised >= 1, `${pid}: …and holds at least one clear issue afterwards (${a.characterised})`);
      ok(a.acts > b.acts, `${pid}: on more acts than it held before (${b.acts} → ${a.acts})`);
      eq(a.splitN, b.splitN, `${pid}: crossed on a clear issue, not by splitting an old one`);
    }
    // AND THE TIERS DID NOT JUST HOLD THEIR SIZE — THEY HELD THEIR MEMBERSHIP. The
    // ten empty members are the same ten, so nothing fell into the tier that means
    // "nothing on file", which is the collapse this check exists to rule out.
    eq(M.after.bands.empty.join(","), M.before.bands.empty.join(","),
      "nobody entered or left the empty tier when wave 4's positions were added");
    const lostRead = M.before.bands.readable.filter((p) => !M.after.bands.readable.includes(p));
    eq(lostRead.length, 0, `no member lost a readable record (${lostRead.join(", ")})`);
  }
  eq(M.after.empty, 10, "after: wave 4 reached nobody who had nothing — committee votes only reach sitting members who already voted");
  ok(M.after.readable >= M.before.readable,
    `after: no member lost a readable record (${M.before.readable} → ${M.after.readable})`);
  eq(M.after.readable, 106, "after: the readable tier is 106 — 102 from waves 1–3, plus 4 the mapping lane earned");
  eq(M.after.thin, 16, "after: 16 members still hold material the engine will not characterise");
  ok(M.after.rows > M.before.rows,
    `the index deepened: ${M.before.rows} → ${M.after.rows} issue rows`);
  eq(M.after.lane.wave4Acts > 0, true, "the after lane actually carries the wave-4 positions");
  eq(M.before.lane.wave4Acts, 0, "…and the before lane carries none of them");
  // TIER WEAKENING IS DISCLOSED, NOT REPAIRED. A committee vote that runs against a
  // member's floor run on the same issue is allowed to turn a one-sided read into a
  // split. The instruction for this wave was to report that, and the fence is that
  // the harness can still name every such row.
  ok(Array.isArray(M.lost), "the harness reports which issues lost their characterisation");
  // THE BOUND HAS MOVED TWICE, AND BOTH REASONS ARE WRITTEN DOWN RATHER THAN
  // QUIETLY EDITED. It was 3 when wave 4 shipped. It went to 6 when the
  // renamed-committee door in the ingest was widened, which recovered four committee
  // acts and 67 positions that had been failing on a string comparison; three of
  // those real votes run against their member's floor run on healthcare, so three
  // more rows read as splits. It is 12 now because wave 8 mapped the 2023GS off-lane
  // bucket: the row-level weakenings went 5 → 12, and the seven new ones are
  // andrew_stoddard/gun_rights, joseph_elison/edu_parental,
  // karen_m_peterson/edu_parental, nelson_abbott/tough_on_crime,
  // nthurston/privacy_rights, r_neil_walter/edu_parental and rshipp/water.
  //
  // Every one is a member whose 2023 committee vote runs against their own floor run
  // on the same key, and every one lands on `split` — which is the wave-4 doctrine
  // working rather than leaking. A committee vote is allowed to turn a one-sided
  // read into a split; what is not allowed is for such a row to stop being nameable.
  // The bound exists to catch a flood, not to protect a number, and it is raised
  // here with the seven names attached rather than with a larger number and no list.
  ok(M.lost.length <= 12,
    `wave 8 weakened at most a handful of rows (${M.lost.length}: ${M.lost.map((r) => `${r.pid}/${r.key} ${r.from}→${r.to}`).join(", ")})`);
  // AND THE SPLITS ARE SPLITS, NOT DISAPPEARANCES. Three of the twelve fell from
  // `strong`, the strongest read the engine gives, so the drop is checked to land on
  // a tier that still says something rather than on "too thin to read".
  eq(M.lost.filter((r) => r.to === "thin").length, 0,
    `no weakened row fell out of characterisation altogether (${M.lost.filter((r) => r.to === "thin").map((r) => `${r.pid}/${r.key}`).join(", ")})`);
  for (const r of M.lost) ok(r.to === "split" || r.to === "thin",
    `${r.pid}/${r.key}: a weakened row landed on a real tier (${r.to}), not on a refusal`);
  ok(M.newlySplit.length >= M.lost.length,
    "every row that lost its characterisation did so by becoming a split, which is a finding");
}

function boot() {
  const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js",
    "say-vs-do.js", "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "consistency.js",
    "voting-record.js", "word-action.js", "profile-spine.js", "profiles-full.js"];
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

console.log(`\n${failures.length ? "✗" : "✓"} vr-utah-committee-mapping: ${passed} assertion(s) passed, ${failures.length} failed`);
for (const f of failures) console.error(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
