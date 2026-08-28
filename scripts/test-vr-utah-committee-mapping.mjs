#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-utah-committee-mapping.mjs — WAVE 4: the curator mapping pass, fenced
// ─────────────────────────────────────────────────────────────────────────────
// Wave 3 admitted committee votes only on bills that already had a reviewed issue
// mapping, and reported the rest as a number: 314 bills with a contested
// pass-out-favorably roll call and nowhere to file it. Wave 4 read those bills and
// decided every one of them. The decisions are prose in db/vr-utah-committee-bills-
// {2025GS,2024GS}.json, and prose is exactly the kind of artefact that rots
// quietly — so this harness fences the six ways it could rot:
//
//   1. ACCOUNTABILITY. Every bill in the refusal bucket is decided, once. No bill
//      is both admitted and refused, no stranger is decided, none is skipped.
//   2. NO NEW VOCABULARY. Every admitted key is one of the 118 shipped keys, and
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
//      through the shipped module: the pre-wave triple still reads 10 / 4 / 102,
//      and the post-wave triple is whatever the shipped tiers say it is — including
//      the one issue that lost its characterisation, which is disclosed here
//      rather than repaired by dropping the committee vote that contradicts it.
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

const SESSIONS = ["2025GS", "2024GS"];
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
const MIGS = { "2025GS": ["netlify/database/migrations/20261006000000_vr_utah_2025gs_committee_mapping.sql"],
               "2024GS": ["netlify/database/migrations/20261007000000_vr_utah_2024gs_committee_mapping.sql",
                          "netlify/database/migrations/20261008000000_vr_utah_2024gs_committee_mapping_renamed_committee.sql"] };
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
    { cwd: ROOT, encoding: "utf8" });
  has(out, "2025GS: bucket 173 · admitted 76 · refused 97 · unaccounted 0",
    "2025GS: the whole 173-bill bucket is decided, with nothing unaccounted");
  has(out, "2024GS: bucket 141 · admitted 64 · refused 77 · unaccounted 0",
    "2024GS: the whole 141-bill bucket is decided, with nothing unaccounted");
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
  eq(shipped.count, 118, "the shipped issue vocabulary is still 118 keys");
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
    eq(rows.measures.size, SEED[s].measures.length,
      `${s}: the migrations name exactly the seed's ${SEED[s].measures.length} measures between them`);
    for (const m of SEED[s].measures) {
      ok(rows.measures.has(`${m.chamber}|${m.number}`),
        `${s}: ${m.utahBill} · ${m.number} has a block in some migration`);
    }
    // A restated measure is expected; a measure restated in a file that also has to
    // be the ONLY writer of a brand-new bill is not distinguishable here, so what is
    // asserted is the weaker true thing: every block re-selects before it inserts.
    eq((sql.match(/SELECT id INTO m_id FROM vr_measures/g) || []).length, blocks,
      `${s}: every block finds its measure before writing anything`);
    eq((sql.match(/IF m_id IS NULL THEN/g) || []).length, blocks,
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
    const stmts = sql.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
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
  // The wave-1/2 seed family is untouched, so the shipped 54/42 assertions elsewhere
  // in this suite still describe the same file.
  const floor = J("db/vr-utah-vote-seed.json");
  const mappings = floor.measures.reduce((n, m) => n + (m.issues || []).length, 0);
  const primaries = floor.measures.reduce((n, m) => n + (m.issues || []).filter((i) => i.isPrimary).length, 0);
  eq(mappings, 54, "wave 4 added no mapping to the wave-1/2 floor seed");
  eq(primaries, 42, "…and no primary either");
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
  eq(M.before.thin, 4, "before: 4 members hold material the engine will not characterise");
  eq(M.before.readable, 102, "before: 102 members have a record that reads");
  eq(M.before.members, 116, "the roster denominator is the same 116 either way");
  eq(M.after.members, M.before.members, "wave 4 added no member to the roster");
  eq(M.after.empty, 10, "after: wave 4 reached nobody who had nothing — committee votes only reach sitting members who already voted");
  ok(M.after.readable >= M.before.readable,
    `after: no member lost a readable record (${M.before.readable} → ${M.after.readable})`);
  ok(M.after.rows > M.before.rows,
    `the index deepened: ${M.before.rows} → ${M.after.rows} issue rows`);
  eq(M.after.lane.wave4Acts > 0, true, "the after lane actually carries the wave-4 positions");
  eq(M.before.lane.wave4Acts, 0, "…and the before lane carries none of them");
  // TIER WEAKENING IS DISCLOSED, NOT REPAIRED. A committee vote that runs against a
  // member's floor run on the same issue is allowed to turn a one-sided read into a
  // split. The instruction for this wave was to report that, and the fence is that
  // the harness can still name every such row.
  ok(Array.isArray(M.lost), "the harness reports which issues lost their characterisation");
  // The bound was 3 while wave 4 shipped, and it is 6 now, for one reason that is
  // worth writing down rather than quietly editing: the renamed-committee door in
  // the ingest was widened, which recovered four committee acts and 67 positions
  // that had been failing on a string comparison. Real votes arrived, and three of
  // them run against their member's floor run on healthcare, so three more rows
  // read as splits. That is the wave-4 doctrine working, not leaking — a committee
  // vote is allowed to turn a one-sided read into a split, and the fence is that
  // every such row is still named below and still lands on a real tier. The bound
  // exists to catch a flood, not to protect a number.
  ok(M.lost.length <= 6,
    `wave 4 weakened at most a handful of rows (${M.lost.length}: ${M.lost.map((r) => `${r.pid}/${r.key} ${r.from}→${r.to}`).join(", ")})`);
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
