#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — UTAH FORMAL PATTERN INDEX, MEASURED (read-only)
// ─────────────────────────────────────────────────────────────────────────────
// THE QUESTION. Every Utah data wave ends with the same three numbers: how many
// members of the Utah lane have NOTHING on file, how many have material the
// pattern engine will not characterise, and how many have a record that reads.
// Waves 1–3 quoted those numbers. Nothing computed them twice the same way,
// because no harness was committed — so this is the harness, and the first thing
// it does is reproduce the wave-3 triple from the shipped seeds before it is
// allowed to say anything about wave 4.
//
//   node scripts/vr-utah-fpi.mjs                 # before / after table
//   node scripts/vr-utah-fpi.mjs --json          # machine-readable
//   node scripts/vr-utah-fpi.mjs --member PID    # one member, both reads
//
// THE DERIVATION IS NOT REIMPLEMENTED HERE. consistency.js is loaded through the
// same node:vm sandbox the test suite boots and PDXConsistency.formalPatternIndex
// is CALLED, on item objects shaped exactly the way voting-record.js caches a
// completed /api/voting-record fetch. No floor, bar, tier or weight is read out
// of a comment and no threshold is redefined: "empty", "thin" and "readable" are
// three counts over the shipped tiers, and that is the whole of this file's
// opinion.
//
//   empty     — the member holds no issue row at all. Nothing formal on file
//               that carries a reviewed mapping.
//   thin      — rows on file, none of them characterised. The engine declines to
//               name a direction on every issue this member touches.
//   readable  — at least one issue the engine will characterise, one way or both.
//
// READ-ONLY. This script opens no database, writes no file and mutates no seed.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

const AS_JSON = process.argv.includes("--json");
const argOf = (n) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] || "" : ""; };
const ONE = argOf("member");

// ── the lane, assembled from the shipped seeds ───────────────────────────────
// THREE FEEDERS, IN THE ORDER THEY SHIPPED.
//   floor      db/vr-utah-vote-seed{,-2024GS,-2023GS}.json — waves 1–2, roll calls
//   committee  db/vr-utah-committee-seed{,-2024GS,-2023GS}.json — waves 3 & 5,
//              committee acts on bills that ALREADY had a reviewed mapping (which
//              is why the wave-3 seed stores only `issueKeys`: the mapping lives on
//              the floor seed's measure for the same bill).
//   mapping    db/vr-utah-committee-mapping-seed-{2025GS,2024GS}.json — wave 4,
//              committee acts on bills that had no mapping until this wave.
const FLOOR = [["2025GS", "db/vr-utah-vote-seed.json"], ["2024GS", "db/vr-utah-vote-seed-2024GS.json"],
               ["2023GS", "db/vr-utah-vote-seed-2023GS.json"]];
const COMMITTEE = [["2025GS", "db/vr-utah-committee-seed.json"], ["2024GS", "db/vr-utah-committee-seed-2024GS.json"],
                   ["2023GS", "db/vr-utah-committee-seed-2023GS.json"]];
const MAPPING = [["2025GS", "db/vr-utah-committee-mapping-seed-2025GS.json"],
                 ["2024GS", "db/vr-utah-committee-mapping-seed-2024GS.json"]];

// ── THE DENOMINATOR ─────────────────────────────────────────────────────────
// "empty" is a count of PEOPLE, so it needs a roster, and the roster cannot be
// "whoever turned up in a seed" — that definition can never report an empty
// member, which is precisely the population the number exists to disclose. It is
// the union of two lists that already ship:
//   • every politicianId in a reviewed Utah member map (db/vr-utah-member-map*),
//     which is the set the roll-call attribution pass resolved, and
//   • every CMP_DATA profile whose office names a seat in the Utah Legislature,
//     which catches leadership titles ("Utah Senate President", "UT House
//     Speaker") that carry no chamber word and members whose seat predates the
//     earliest session on file.
// Nobody is added or removed here to make a number move.
const UT_OFFICE = /(Utah State|UT State) (Representative|Senator)|Utah (Senate President|House Speaker)|UT (House|Senate) (Speaker|President)/;
function roster(win) {
  const out = new Set();
  for (const f of ["db/vr-utah-member-map.json", "db/vr-utah-member-map-2024GS.json",
                   "db/vr-utah-member-map-2023GS.json"]) {
    const d = J(f);
    for (const ch of Object.values(d.chambers || {})) {
      for (const v of Object.values(ch)) {
        const pid = v && typeof v === "object" ? v.politicianId : v;
        if (pid) out.add(pid);
      }
    }
  }
  const D = win.CMP_DATA || {};
  for (const pid of Object.keys(D)) if (D[pid] && UT_OFFICE.test(D[pid].office || "")) out.add(pid);
  return out;
}

let midSeq = 0;
const MID = new Map();
const midOf = (k) => { if (!MID.has(k)) MID.set(k, ++midSeq); return MID.get(k); };

function buildLane({ withWave4 }) {
  const byMember = new Map();
  const push = (pid, it) => { const l = byMember.get(pid) || []; l.push(it); byMember.set(pid, l); };
  const mappingOf = new Map();   // session|bill -> issues, from the floor seed
  const stats = { floorVotes: 0, committeeActs: 0, wave4Acts: 0, measures: 0 };

  for (const [session, f] of FLOOR) {
    for (const m of J(f).measures) {
      const mid = midOf(`${session}|${m.utahBill}`);
      mappingOf.set(`${session}|${m.utahBill}`, m.issues || []);
      stats.measures++;
      for (const rc of m.rollcalls || []) {
        if (!rc.sourceUrl) continue;                       // verifiability guard
        for (const v of rc.votes || []) {
          stats.floorVotes++;
          push(v.politicianId, {
            kind: "vote", measureId: mid, measureType: m.measureType || "bill",
            number: m.number, title: m.title, chamber: rc.chamber, status: m.status,
            date: rc.voteDate, action: rc.question, actionType: rc.actionType,
            position: v.position, result: rc.result, isParty: null, supports: null,
            isProcedural: rc.actionType === "procedural" || rc.actionType === "motion",
            advanceInverted: false, isAmendment: false, parentMeasureId: null,
            rollcallId: `${mid}:${rc.chamber}:${rc.rollNumber}`, congress: null,
            session: rc.session, rollNumber: rc.rollNumber, issues: m.issues || [],
            source: { url: rc.sourceUrl, label: rc.sourceLabel || "Utah State Legislature" },
          });
        }
      }
    }
  }
  const act = (session, m, a, issues, tag) => {
    const mid = midOf(`${session}|${m.utahBill}`);
    for (const v of a.votes || []) {
      if (v.supersededByFloorVote) { /* still packed: the engine drops it itself */ }
      stats[tag]++;
      push(v.politicianId, {
        kind: "position", measureId: mid, measureType: "bill", number: m.number,
        title: m.title, chamber: m.chamber, status: m.status || null,
        date: `${a.date}T00:00:00-07:00`,
        action: "committee_vote", actionType: "committee_vote", position: "committee_vote",
        result: null, isParty: null, supports: !!v.supports, isProcedural: false,
        advanceInverted: false, isAmendment: false, parentMeasureId: null,
        rollcallId: null, congress: null, session: null, rollNumber: null,
        issues,
        source: { url: a.sourceUrl || a.minutesUrl, label: "Utah committee minutes" },
      });
    }
  };
  for (const [session, f] of COMMITTEE) {
    for (const m of J(f).measures) {
      const issues = mappingOf.get(`${session}|${m.utahBill}`) || [];
      for (const a of m.committeeActs || []) act(session, m, a, issues, "committeeActs");
    }
  }
  if (withWave4) {
    for (const [session, f] of MAPPING) {
      if (!existsSync(join(ROOT, f))) continue;
      for (const m of J(f).measures) {
        stats.measures++;
        for (const a of m.committeeActs || []) act(session, m, a, m.issues || [], "wave4Acts");
      }
    }
  }
  for (const l of byMember.values()) l.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return { byMember, stats };
}

// ── measure ─────────────────────────────────────────────────────────────────
function measure(win, lane, ROSTER) {
  const FPI = win.PDXConsistency.formalPatternIndex;
  const out = { empty: 0, thin: 0, readable: 0, members: 0, withRecord: 0,
    rows: 0, strongN: 0, splitN: 0, thinN: 0, per: new Map() };
  for (const pid of [...ROSTER].sort()) {
    const items = lane.byMember.get(pid) || [];
    out.members++;
    if (!items.length) { out.empty++; out.per.set(pid, { band: "empty", issues: 0, strongN: 0, splitN: 0, thinN: 0, characterised: 0, acts: 0 }); continue; }
    out.withRecord++;
    win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(items)));
    const sh = FPI.shape(pid) || { issues: 0, characterised: 0, strongN: 0, splitN: 0, thinN: 0 };
    const band = !sh.issues ? "empty" : sh.characterised ? "readable" : "thin";
    out[band]++;
    out.rows += sh.issues; out.strongN += sh.strongN; out.splitN += sh.splitN; out.thinN += sh.thinN;
    out.per.set(pid, { band, issues: sh.issues, strongN: sh.strongN, splitN: sh.splitN, thinN: sh.thinN,
      characterised: sh.characterised, acts: items.length });
  }
  // A pid that voted but is on nobody's roster would be a silent omission from the
  // table, so it is a hard error rather than a rounding difference.
  const strangers = [...lane.byMember.keys()].filter((p) => !ROSTER.has(p));
  if (strangers.length) throw new Error(`lane carries ${strangers.length} pid(s) off the Utah roster: ${strangers.join(", ")}`);
  return out;
}

const before = buildLane({ withWave4: false });
const after = buildLane({ withWave4: true });
const winB = boot(), winA = boot();
const ROSTER = roster(winB);
const B = measure(winB, before, ROSTER), A = measure(winA, after, ROSTER);

// ── report ──────────────────────────────────────────────────────────────────
const drift = [];
for (const pid of A.per.keys()) {
  const b = B.per.get(pid) || { band: "(absent)", issues: 0, strongN: 0, splitN: 0, thinN: 0, acts: 0 };
  const a = A.per.get(pid);
  if (b.band !== a.band || b.strongN !== a.strongN || b.splitN !== a.splitN || b.issues !== a.issues)
    drift.push({ pid, from: b, to: a });
}
const weakened = drift.filter((d) =>
  (d.from.band === "readable" && d.to.band !== "readable") || d.to.strongN < d.from.strongN);
const split = drift.filter((d) => d.to.splitN > d.from.splitN);

// ── per-issue drift, for the members whose shape moved ──────────────────────
// A shape count says a member lost a clear issue; it does not say WHICH issue or
// what it became. Wave 4's own instruction is that a thin row splitting is an
// allowed outcome to be reported rather than repaired by dropping the committee
// vote that contradicts the floor run, and a report cannot honour that without
// naming the row.
function issueDrift(pids) {
  const out = [];
  const tierOf = (win, lane, pid) => {
    const items = lane.byMember.get(pid) || [];
    if (!items.length) return new Map();
    win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(items)));
    const m = new Map();
    for (const r of win.PDXConsistency.formalPatternIndex.rows(pid) || []) m.set(r.key, r.tier);
    return m;
  };
  for (const pid of pids) {
    const b = tierOf(winB, before, pid), a = tierOf(winA, after, pid);
    for (const k of new Set([...b.keys(), ...a.keys()])) {
      const from = b.get(k) || "(absent)", to = a.get(k) || "(absent)";
      if (from !== to) out.push({ pid, key: k, from, to });
    }
  }
  return out;
}
const MOVED = drift.map((d) => d.pid);
const DRIFT_ROWS = issueDrift(MOVED);
const LOST = DRIFT_ROWS.filter((r) => (r.from === "strong" || r.from === "mostly") && r.to !== "strong" && r.to !== "mostly");
const NEWSPLIT = DRIFT_ROWS.filter((r) => r.to === "split" && r.from !== "split");
const NEWREAD = DRIFT_ROWS.filter((r) => r.from === "(absent)" || r.from === "unread");

if (process.argv.includes("--drift")) {
  console.log(`\n  per-issue tier changes across ${MOVED.length} members: ${DRIFT_ROWS.length}\n`);
  const show = (t, rows) => { console.log(`  ${t} (${rows.length})`); for (const r of rows.slice(0, 40)) console.log(`    ${r.pid.padEnd(26)} ${r.key.padEnd(24)} ${r.from} → ${r.to}`); };
  show("characterisation lost", LOST);
  show("newly split", NEWSPLIT);
  show("newly on the index", NEWREAD.slice(0, 25));
  console.log("");
  process.exit(0);
}

if (AS_JSON) {
  const strip = (m) => ({ empty: m.empty, thin: m.thin, readable: m.readable, members: m.members,
    rows: m.rows, strongN: m.strongN, splitN: m.splitN, thinN: m.thinN });
  // WHO IS IN EACH TIER, NOT JUST HOW MANY. A tier count can hold still while two
  // members swap places, so the counts alone cannot show that nobody's record got
  // worse. The band lists are what make "no tier collapse" checkable: a harness can
  // diff the membership of a tier and not only its size.
  const bands = (m) => {
    const out = { empty: [], thin: [], readable: [] };
    for (const [pid, r] of m.per) out[r.band].push(pid);
    return out;
  };
  console.log(JSON.stringify({ before: { ...strip(B), lane: before.stats, bands: bands(B) },
    after: { ...strip(A), lane: after.stats, bands: bands(A) },
    drift, weakened: weakened.map((d) => d.pid), newSplits: split.map((d) => d.pid),
    issueDrift: DRIFT_ROWS, lost: LOST, newlySplit: NEWSPLIT }, null, 1));
} else if (ONE) {
  const b = B.per.get(ONE), a = A.per.get(ONE);
  console.log(`${ONE}\n  before  ${JSON.stringify(b)}\n  after   ${JSON.stringify(a)}`);
} else {
  const row = (lbl, m, lane) => console.log(
    `  ${lbl.padEnd(8)} ${String(m.empty).padStart(5)} ${String(m.thin).padStart(5)} ${String(m.readable).padStart(9)}` +
    `   │ ${String(m.members).padStart(4)} on roster, ${String(m.withRecord).padStart(3)} with a record · ${String(m.rows).padStart(5)} issue rows · ` +
    `${m.strongN} clear / ${m.splitN} split / ${m.thinN} unread   │ ` +
    `${lane.floorVotes} floor + ${lane.committeeActs} cmte + ${lane.wave4Acts} wave-4 positions`);
  console.log("\n  UTAH FORMAL PATTERN INDEX — shipped tiers, no floor moved\n");
  console.log(`           empty  thin  readable`);
  row("before", B, before.stats);
  row("after", A, after.stats);
  console.log(`\n  delta    ${String(A.empty - B.empty).padStart(5)} ${String(A.thin - B.thin).padStart(5)} ${String(A.readable - B.readable).padStart(9)}`);
  console.log(`\n  members whose shape moved: ${drift.length}`);
  console.log(`  tier weakening (readable→not, or fewer clear issues): ${weakened.length}` +
    (weakened.length ? ` — ${weakened.map((d) => `${d.pid} ${d.from.band}/${d.from.strongN}→${d.to.band}/${d.to.strongN}`).join(", ")}` : ""));
  console.log(`  members gaining a split row: ${split.length}` +
    (split.length ? ` — ${split.map((d) => `${d.pid} ${d.from.splitN}→${d.to.splitN}`).join(", ")}` : ""));
  console.log("");
}
