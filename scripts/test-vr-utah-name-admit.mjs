#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-utah-name-admit.mjs — the admit added rows, and moved nothing else
// ─────────────────────────────────────────────────────────────────────────────
// Wave 9 attributed 29 printed forms that three shipped Utah sessions had parsed and
// dropped, because the people behind them were on no PolitiDex roster when the floor
// maps were written. 878 member votes arrived. That is the largest single change to the
// Utah formal lane since the sessions were ingested, and it lands on the ONE surface
// this app leads a person's file with, so the two things worth proving are:
//
//   1. NOBODY WHO WAS NOT ADMITTED MOVED. Not their band, not their per-issue tier, not
//      one verdict token. A pass that admits votes is exactly the kind that can shift a
//      third party's reading sideways — a party-line metric recomputed against a fuller
//      chamber, a "split" that was split only because half the chamber was missing. If
//      that happened, it is a finding, not a rounding difference.
//   2. THE ADMITTED ONLY GAINED. Their files got fuller; no characterisation they
//      already had was lost, and nobody arrived at a WORSE band than they held.
//
// HOW "BEFORE" IS RECONSTRUCTED, WITHOUT GIT AND WITHOUT A CACHED FILE. The admit is
// purely additive: it added member-vote rows for 16 pids and changed nothing else in the
// seeds (a re-seed diff proved zero removals and zero field changes outside the
// `droppedNotOnRoster` disclosure). So the pre-wave lane is the shipped lane with those
// pids' floor votes removed — exact, deterministic, and derived from the artefact under
// test rather than from a copy that could drift out of step with it.
//
// The two lanes are then measured through the SAME booted engine, twice. No threshold is
// reimplemented here: the bands and tiers come from window.PDXConsistency.formalPatternIndex,
// and the characterisation floor stays whatever stance-helpers.js says it is.
//
//   node scripts/test-vr-utah-name-admit.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const fails = [];
const ok = (c, m) => { if (c) passed++; else fails.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const must = (c, m) => { if (!c) { console.error(`\n✗ vr-utah-name-admit: ${m}\n`); process.exit(1); } };
const section = (t) => console.log(`\n   ── ${t}`);

// ── WHAT THIS WAVE CLAIMS ───────────────────────────────────────────────────
// Pinned by hand from the report, not read out of the thing under test, so a
// regenerated map that quietly admits a 30th name fails here instead of moving the goal.
const ADMITTED = {
  "2024GS": { H: { "Birkeland, K.": "kera_birkeland", "Briscoe, J.": "joel_briscoe",
      "Cobb, J.": "james_cobb", "Garner, B.": "brett_garner", "Jimenez, T.": "tim_jimenez",
      "King, Brian S.": "brian_king", "Lesser, R.": "rosemary_lesser", "Lund, S.": "steven_lund",
      "Pulsipher, S.": "susan_pulsipher", "Rohner, J.": "judy_weeks_rohner",
      "Spendlove, R.": "robert_spendlove", "Stenquist, J.": "jeffrey_stenquist",
      "Wheatley, M.": "mark_wheatley" },
    S: { "Buxton, D. G.": "david_buxton" },
    parked: ["Johnson, D.N.", "Judkins, M.", "Lyman, P.", "Kennedy, M."] },
  "2023GS": { H: { "Birkeland, K.": "kera_birkeland", "Cobb, J.": "james_cobb",
      "Garner, B.": "brett_garner", "Jimenez, T.": "tim_jimenez", "King, Brian S.": "brian_king",
      "Kotter, Q.": "quinn_kotter", "Lesser, R.": "rosemary_lesser", "Lund, S.": "steven_lund",
      "Pulsipher, S.": "susan_pulsipher", "Rohner, J.": "judy_weeks_rohner",
      "Spendlove, R.": "robert_spendlove", "Stenquist, J.": "jeffrey_stenquist",
      "Wheatley, M.": "mark_wheatley" },
    S: { "Anderegg, J.": "jacob_anderegg", "Buxton, D. G.": "david_buxton" },
    // "Briscoe, J." fails CLOSED here and nowhere else: the uniqueness rule resolves it,
    // but the 2023GS committee map carries no accepted form for the surname, so the
    // second gate has nothing to agree with. One reviewed path is not two.
    parked: ["Briscoe, J.", "Johnson, D.N.", "Judkins, M.", "Lyman, P.", "Kennedy, M."] },
};
// The four whose files crossed from thin to readable, and the two that did not.
const GAINED_READABLE = ["brett_garner", "jeffrey_stenquist", "quinn_kotter", "rosemary_lesser"];
const STILL_THIN = ["bwilson", "jacob_anderegg"];
// Unchanged by this wave, and pinned so a later pass cannot quietly shrink it.
const STILL_EMPTY = ["emily_buss", "fgibson", "grant_pace", "jackie_larson", "jdraxler",
  "jknotts", "john_arthur", "jwestwood", "leah_hansen", "rob_bishop"];

const ADMITTED_PIDS = new Set(Object.values(ADMITTED).flatMap((s) =>
  [...Object.values(s.H), ...Object.values(s.S)]));

// ── 1. The maps say exactly what this file claims ───────────────────────────
section("The shipped maps record exactly the admissions this wave claims");
for (const [session, want] of Object.entries(ADMITTED)) {
  const map = J(`db/vr-utah-member-map-${session}.json`);
  const got = map._wave9Admitted || {};
  const flat = {};
  for (const house of ["H", "S"]) for (const [p, pid] of Object.entries(want[house])) flat[`${house} ${p}`] = pid;
  eq(JSON.stringify(got, Object.keys(got).sort()), JSON.stringify(flat, Object.keys(flat).sort()),
    `${session}: the map's admitted list is the reviewed one`);
  for (const [k, pid] of Object.entries(flat)) {
    eq(map.chambers[k.slice(0, 1)][k.slice(2)], pid, `${session}: "${k}" is mapped to ${pid}`);
    eq(map.confirmedByDistrict[k.slice(0, 1)][k.slice(2)], false,
      `${session}: "${k}" claims no district confirmation`);
  }
  const parked = new Set(map.unmapped.H.concat(map.unmapped.S).map((u) => u.printed));
  eq([...parked].sort().join(" | "), [...want.parked].sort().join(" | "),
    `${session}: the names still unattributed are the reviewed ones`);
  for (const n of want.parked)
    ok(!(map.chambers.H[n] || map.chambers.S[n]),
      `${session}: the parked name "${n}" holds no roster id`);
}

// ── 2. The lane, before and after, through the shipped engine ───────────────
// Copied structurally from scripts/vr-utah-fpi.mjs so the two harnesses cannot disagree
// about what the lane IS. The only addition is `drop`: a pid set whose floor votes are
// withheld, which is how the pre-wave lane is reconstructed.
const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js",
  "say-vs-do.js", "exec-action-data.js", "exec-record.js", "consistency.js", "voting-record.js",
  "word-action.js", "formal-index.js", "publication-floor.js"];
function boot() {
  const sb = makeSandbox();
  const ctx = vm.createContext(sb);
  for (const f of FILES) {
    if (!existsSync(join(ROOT, f))) continue;
    new vm.Script(R(f), { filename: f }).runInContext(ctx);
  }
  return sb.window || sb;
}
const FLOOR = [["2025GS", "db/vr-utah-vote-seed.json"], ["2024GS", "db/vr-utah-vote-seed-2024GS.json"],
               ["2023GS", "db/vr-utah-vote-seed-2023GS.json"]];
const COMMITTEE = [["2025GS", "db/vr-utah-committee-seed.json"], ["2024GS", "db/vr-utah-committee-seed-2024GS.json"],
                   ["2023GS", "db/vr-utah-committee-seed-2023GS.json"]];
const MAPPING = ["2025GS", "2024GS", "2023GS"].map((s) => [s, `db/vr-utah-committee-mapping-seed-${s}.json`]);
const UT_OFFICE = /(Utah State|UT State) (Representative|Senator)|Utah (Senate President|House Speaker)|UT (House|Senate) (Speaker|President)/;

let midSeq = 0;
const MID = new Map();
const midOf = (k) => { if (!MID.has(k)) MID.set(k, ++midSeq); return MID.get(k); };

function buildLane(drop) {
  const byMember = new Map();
  const push = (pid, it) => { const l = byMember.get(pid) || []; l.push(it); byMember.set(pid, l); };
  const mappingOf = new Map();
  let withheld = 0;
  for (const [session, f] of FLOOR) {
    for (const m of J(f).measures) {
      const mid = midOf(`${session}|${m.utahBill}`);
      mappingOf.set(`${session}|${m.utahBill}`, m.issues || []);
      for (const rc of m.rollcalls || []) {
        if (!rc.sourceUrl) continue;
        for (const v of rc.votes || []) {
          if (drop.has(v.politicianId)) { withheld++; continue; }
          push(v.politicianId, { kind: "vote", measureId: mid, measureType: m.measureType || "bill",
            number: m.number, title: m.title, chamber: rc.chamber, status: m.status,
            date: rc.voteDate, action: rc.question, actionType: rc.actionType,
            position: v.position, result: rc.result, isParty: null, supports: null,
            isProcedural: rc.actionType === "procedural" || rc.actionType === "motion",
            advanceInverted: false, isAmendment: false, parentMeasureId: null,
            rollcallId: `${mid}:${rc.chamber}:${rc.rollNumber}`, congress: null,
            session: rc.session, rollNumber: rc.rollNumber, issues: m.issues || [],
            source: { url: rc.sourceUrl, label: rc.sourceLabel || "Utah State Legislature" } });
        }
      }
    }
  }
  const act = (session, m, a, issues) => {
    const mid = midOf(`${session}|${m.utahBill}`);
    for (const v of a.votes || []) push(v.politicianId, { kind: "position", measureId: mid,
      measureType: "bill", number: m.number, title: m.title, chamber: m.chamber,
      status: m.status || null, date: `${a.date}T00:00:00-07:00`, action: "committee_vote",
      actionType: "committee_vote", position: "committee_vote", result: null, isParty: null,
      supports: !!v.supports, isProcedural: false, advanceInverted: false, isAmendment: false,
      parentMeasureId: null, rollcallId: null, congress: null, session: null, rollNumber: null,
      issues, source: { url: a.sourceUrl || a.minutesUrl, label: "Utah committee minutes" } });
  };
  for (const [session, f] of COMMITTEE)
    for (const m of J(f).measures)
      for (const a of m.committeeActs || []) act(session, m, a, mappingOf.get(`${session}|${m.utahBill}`) || []);
  for (const [session, f] of MAPPING) {
    if (!existsSync(join(ROOT, f))) continue;
    for (const m of J(f).measures) for (const a of m.committeeActs || []) act(session, m, a, m.issues || []);
  }
  for (const l of byMember.values()) l.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return { byMember, withheld };
}

function shapes(win, lane, ROSTER) {
  const FPI = win.PDXConsistency.formalPatternIndex;
  const out = new Map();
  for (const pid of [...ROSTER].sort()) {
    const items = lane.byMember.get(pid) || [];
    if (!items.length) { out.set(pid, { band: "empty", acts: 0, rows: [] }); continue; }
    win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(items)));
    const sh = FPI.shape(pid) || { issues: 0, characterised: 0, strongN: 0, splitN: 0, thinN: 0 };
    const rows = (FPI.rows(pid) || []).map((r) => `${r.key}:${r.tier}`).sort();
    out.set(pid, { band: !sh.issues ? "empty" : sh.characterised ? "readable" : "thin",
      acts: items.length, issues: sh.issues, characterised: sh.characterised,
      strongN: sh.strongN, splitN: sh.splitN, thinN: sh.thinN, rows });
  }
  return out;
}

const winPre = boot(), winPost = boot();
const ROSTER = new Set();
for (const f of ["db/vr-utah-member-map.json", "db/vr-utah-member-map-2024GS.json",
                 "db/vr-utah-member-map-2023GS.json"])
  for (const ch of Object.values(J(f).chambers || {}))
    for (const v of Object.values(ch)) { const p = v && typeof v === "object" ? v.politicianId : v; if (p) ROSTER.add(p); }
const D = winPost.CMP_DATA || {};
for (const pid of Object.keys(D)) if (UT_OFFICE.test((D[pid] || {}).office || "")) ROSTER.add(pid);
must(ROSTER.size === 132, `the Utah roster is ${ROSTER.size}, not the 132 this wave was measured against`);

const lanePre = buildLane(ADMITTED_PIDS);
const lanePost = buildLane(new Set());
must(lanePre.withheld === 878,
  `withholding the admitted pids removed ${lanePre.withheld} floor votes, not the 878 this wave added`);
const PRE = shapes(winPre, lanePre, ROSTER);
const POST = shapes(winPost, lanePost, ROSTER);

// ── 3. Nobody who was not admitted moved, at all ────────────────────────────
section("Every member this wave did not touch is byte-identical, band and tier");
let untouched = 0;
for (const pid of ROSTER) {
  if (ADMITTED_PIDS.has(pid)) continue;
  untouched++;
  const a = PRE.get(pid), b = POST.get(pid);
  eq(JSON.stringify(b), JSON.stringify(a),
    `${pid}: shape and every per-issue tier are unchanged by the admit`);
}
must(untouched > 100, `only ${untouched} members were checked for drift, which proves too little`);
console.log(`      ${untouched} untouched members, every band, tier and verdict identical`);

// ── 4. The admitted only gained ─────────────────────────────────────────────
// The direction of travel matters more than the size. A member arriving at a WORSE band
// after gaining acts would mean the wave published something that reads as a downgrade,
// and a characterisation disappearing would mean it was resting on a partial chamber.
section("The admitted members gained and lost nothing");
const RANK = { empty: 0, thin: 1, readable: 2 };
for (const pid of [...ADMITTED_PIDS].sort()) {
  const a = PRE.get(pid), b = POST.get(pid);
  ok(b.acts > a.acts, `${pid}: gained acts (${a.acts} → ${b.acts})`);
  ok(RANK[b.band] >= RANK[a.band], `${pid}: band did not weaken (${a.band} → ${b.band})`);
  ok(b.issues >= a.issues, `${pid}: issue rows did not shrink (${a.issues} → ${b.issues})`);
  ok(b.characterised >= a.characterised,
    `${pid}: no characterisation was lost (${a.characterised} → ${b.characterised})`);
}
for (const pid of GAINED_READABLE) {
  eq(PRE.get(pid).band, "thin", `${pid}: was thin before the admit`);
  eq(POST.get(pid).band, "readable", `${pid}: is readable after it`);
  ok(POST.get(pid).characterised >= 1, `${pid}: carries at least one characterised issue`);
}

// ── 5. The bands the wave did NOT close are still honest ────────────────────
// A file with acts and no characterised issue is not "being built" — it is a file whose
// issues have not reached the characterisation floor, and that floor was not lowered to
// make it read better. Both surviving thin files are pinned by name so a later pass
// cannot make them disappear by relaxing the threshold instead of admitting more acts.
section("The bands this wave could not close are still disclosed, not hidden");
const nowThin = [...POST].filter(([, v]) => v.band === "thin").map(([p]) => p).sort();
const nowEmpty = [...POST].filter(([, v]) => v.band === "empty").map(([p]) => p).sort();
eq(nowThin.join(", "), STILL_THIN.join(", "), "the surviving thin files are the reviewed two");
eq(nowEmpty.join(", "), STILL_EMPTY.join(", "), "the empty set is unchanged by this wave");
const FLOOR_N = winPost._PDX_RD_MIN_JUDGED;
must(typeof FLOOR_N === "number", "the characterisation floor is not published, so no-floor-moved is unprovable");
eq(FLOOR_N, 4, "the characterisation floor is still four judged acts — the admit lowered no bar");
for (const pid of STILL_THIN) {
  const s = POST.get(pid);
  ok(s.acts > 0, `${pid}: is thin with ${s.acts} acts on file, not empty`);
  eq(s.characterised, 0, `${pid}: is thin because nothing reached the floor, not because rows are missing`);
}
// And every empty file still carries its reviewed sentence, so nothing crossed into
// "empty with no explanation" while the wave was moving rows around.
const NOTES = J("db/vr-utah-empty-file-notes.json").notes || {};
for (const pid of nowEmpty)
  ok(String((NOTES[pid] || {}).note || "").length > 40,
    `${pid}: an empty file still carries its reviewed one-line why`);

// ── 6. The counted record on the surface matches the lane ───────────────────
// formal-index.js is generated from these same seeds and is what publication-floor.js
// reads to decide whether a file with acts on it may be greeted as "still being built".
// If it were regenerated without the admit — or not regenerated at all — a member could
// gain 65 acts and still be met with the unfinished-record copy, which is the exact lie
// the index was added to stop. So the shipped count is compared against the POST lane,
// and against the PRE lane it must NOT match.
section("The shipped formal index counts the admitted acts, not the pre-admit ones");
const FI = winPost.PDXFormalIndex;
must(FI && typeof FI.acts === "function", "formal-index.js did not load its acts() reader");
// The generator's own staleness check is the authority on whether the committed index
// still matches the seeds. It is asserted here because THIS wave found the index reading
// two of the three mapping seeds — 607 sourced acts across 87 members were live in the
// FPI harness and absent from the count the publication floor reads. A regenerated index
// is the only thing that makes the count equalities below meaningful.
{
  const r = spawnSync("node", [join(ROOT, "scripts/gen-formal-index.mjs"), "--check"],
    { cwd: ROOT, encoding: "utf8" });
  eq(r.status, 0, `formal-index.js is current with the shipped seeds${r.status ? ` — ${String(r.stderr || r.stdout).trim().split("\n")[0]}` : ""}`);
}
for (const pid of [...ADMITTED_PIDS].sort()) {
  const shipped = FI.acts(pid);
  eq(shipped, POST.get(pid).acts, `${pid}: the shipped index count equals the seeded lane`);
  ok(shipped > PRE.get(pid).acts,
    `${pid}: the shipped index was regenerated after the admit (${PRE.get(pid).acts} → ${shipped})`);
  ok(FI.has(pid), `${pid}: the shipped index no longer reads as an empty file`);
  eq(FI.emptyNote(pid), null, `${pid}: carries no empty-file note, because the file is not empty`);
}
// The ten that ARE empty must still hand back their reviewed sentence from the surface
// itself, not merely from the JSON the generator reads.
for (const pid of nowEmpty) {
  eq(FI.acts(pid), 0, `${pid}: the shipped index agrees the file is empty`);
  const n = FI.emptyNote(pid);
  ok(n && String(n.note).length > 40, `${pid}: the surface hands back a reviewed one-line why`);
  ok(n && /^[a-z_]+$/.test(String(n.reason)), `${pid}: the why carries a machine-readable reason`);
}
// And the members nobody touched keep the count they shipped with.
let sameCount = 0;
for (const pid of ROSTER) {
  if (ADMITTED_PIDS.has(pid)) continue;
  if (FI.acts(pid) === PRE.get(pid).acts) sameCount++;
}
eq(sameCount, untouched, "every untouched member's shipped act count is the pre-admit one");

if (fails.length) {
  console.error(`\n✗ vr-utah-name-admit: ${fails.length} failure(s)`);
  for (const f of fails.slice(0, 25)) console.error(`   • ${f}`);
  process.exit(1);
}
console.log(`\n   ${passed} checks passed`);
console.log("✓ vr-utah-name-admit: 878 votes arrived, 29 names were reviewed, nobody else moved");
