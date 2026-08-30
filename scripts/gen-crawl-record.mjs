#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-crawl-record.mjs — the formal-pattern lines a person address may print
//                        before a single byte of JavaScript has run
// ─────────────────────────────────────────────────────────────────────────────
// WHAT PHASE A LEFT UNFINISHED
//
// /p/<pid> already serves its own document: an <h1> with the name, the office,
// the place, and a sentence saying what the page is (see personCrawlBlock in
// netlify/edge-functions/share-preview.ts). That was enough to stop 757 person
// addresses being byte-identical copies of the homepage, and it is not enough to
// tell one of them from another. Strip the name out of Mike Lee's block and John
// Curtis's block and they are the same paragraph. A crawler reading the body has
// learned that PolitiDex holds a file on a person, not what is in it.
//
// So the block gets the FORMAL RECORD's shape as well — up to six pattern lines,
// in the profile brief's own words, from the profile brief's own rows.
//
// WHY THIS IS A BUILD STEP AND NOT AN EDGE FETCH
//
// The pattern lines are read off the roll-call and committee record, which lives
// in the database behind /api/voting-record. Fetching that on the anonymous first
// byte would put a database round trip in front of every crawl of every person
// address — on the one request that has no session, no cache warmth and no user
// waiting to forgive it. The edge handler therefore does not call the API at all
// (test-person-crawl-block.mjs poisons `fetch` and asserts zero calls on that
// path), and this script supplies the same words offline instead.
//
// THERE IS NO SECOND PATTERN ENGINE HERE, and that is the whole design.
// consistency.js, stance-helpers.js, alignment-tool.js and word-action.js are
// loaded into a node:vm sandbox and CALLED. The rows come from
// PDXConsistency.formalPatternIndex.shape() — the exact accessor briefBodyHtml()
// reads — and from PDXConsistency.execRecordSummary.shape() on an executive file,
// in the same precedence briefHeroHtml() asks in (exec lane first, because
// _stDirRaw() returns null for every exec row by design and the roll-call shape
// would report a president as "0 read"). Not one tier, floor, count, threshold or
// verb is decided in this file. It selects and it flattens; it does not derive.
//
// WHERE THE RECORD COMES FROM
//
//   federal   scripts/vr-record-corpus.mjs — the shipped db/vr-*seed*.json roll
//             calls, packed in netlify/functions/voting-record.mts's own item
//             shape.
//   Utah      the three shipped Utah feeders, in the order they shipped. A
//             transcript of scripts/vr-utah-fpi.mjs's buildLane(), the same way
//             scripts/vr-shape-buckets.mjs carries one — same seeds, same
//             verifiability guard (no sourceUrl, no act).
//   executive exec-action-data.js, which is already a committed client bundle and
//             needs no lane at all.
//
// IT IS A PROJECTION, NOT THE DATABASE — the same honest caveat vr-record-corpus
// ships with. Rows the ingest declined, corrections cut after a seed, and anything
// written straight to the live tables are not here. What that costs is a person
// whose snapshot is thinner than their live file, and the failure mode of that is
// a missing line rather than a wrong one. What it must never cost is a line the
// live file would not print, which is why nothing here is padded, defaulted or
// filled in: a pid the engines read nothing for gets NO ENTRY, and an address with
// no entry prints no section.
//
// WHAT THE OUTPUT MAY AND MAY NOT CARRY
//
//   p  the pattern label — "Strongly supports" / "Mostly opposes" / "Split" and
//      nothing else. Read off the tier, never composed.
//   i  the issue label, including its emoji, exactly as the chip prints it.
//   c  the two side counts as ONE STRING in the engine's own phrase ("5 advanced ·
//      0 against"), and only where the brief already prints them — `counts` when
//      the chip carries the tally, else `sideCounts`, which is precisely what
//      shapeTallyHtml() does on the live row. Absent where the brief shows none.
//
// No percentage. No ratio. No Direction Match figure, no Word-vs-Action number, no
// "Accountability Score", no with/against-party tally, no party letter, no total,
// no denominator, and no arithmetic over any of the above. Six ordinal facts about
// one person's own record, in the vocabulary the record lane already publishes.
//
// USAGE
//   node scripts/gen-crawl-record.mjs             # what it found, as a report
//   node scripts/gen-crawl-record.mjs --member lee
// It writes nothing on its own: scripts/gen-share-index.mjs imports
// buildCrawlRecord() and bakes the table into db/share-index.json, so the snapshot
// cannot drift out of step with the index the edge reads it from.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

// The shipped modules the shape is read out of, in the order index.html loads
// them. This is the engine harness the test suite boots, minus the DOM-heavy
// profile builders nothing here calls.
const ENGINE_FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  ...Array.from({ length: 15 }, (_, i) => `state-senate-stances-w${i + 2}.js`),
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
];

// ── The Utah lane, from the shipped seeds ────────────────────────────────────
// THREE FEEDERS, IN THE ORDER THEY SHIPPED — a transcript of
// scripts/vr-utah-fpi.mjs's buildLane(), which is the harness that owns this
// assembly. Kept literal rather than clever: if a wave adds a feeder there, it
// belongs here too, and a Utah member's snapshot silently shrinking is the way
// that omission would show up.
const UT_FLOOR = [
  ["2025GS", "db/vr-utah-vote-seed.json"],
  ["2024GS", "db/vr-utah-vote-seed-2024GS.json"],
  ["2023GS", "db/vr-utah-vote-seed-2023GS.json"],
];
const UT_COMMITTEE = [
  ["2025GS", "db/vr-utah-committee-seed.json"],
  ["2024GS", "db/vr-utah-committee-seed-2024GS.json"],
  ["2023GS", "db/vr-utah-committee-seed-2023GS.json"],
];
const UT_MAPPING = [
  ["2025GS", "db/vr-utah-committee-mapping-seed-2025GS.json"],
  ["2024GS", "db/vr-utah-committee-mapping-seed-2024GS.json"],
  ["2023GS", "db/vr-utah-committee-mapping-seed-2023GS.json"],
];

function buildUtahLane(ROOT) {
  const J = (f) => JSON.parse(readFileSync(join(ROOT, f), "utf8"));
  let seq = 0;
  const MID = new Map();
  const midOf = (k) => { if (!MID.has(k)) MID.set(k, ++seq); return MID.get(k); };
  const byMember = new Map();
  const push = (pid, it) => { if (!pid) return; const l = byMember.get(pid) || []; l.push(it); byMember.set(pid, l); };
  const mappingOf = new Map(); // session|bill → issues, from the floor seed

  for (const [session, f] of UT_FLOOR) {
    for (const m of J(f).measures) {
      const mid = midOf(`${session}|${m.utahBill}`);
      mappingOf.set(`${session}|${m.utahBill}`, m.issues || []);
      for (const rc of m.rollcalls || []) {
        if (!rc.sourceUrl) continue; // verifiability guard: an act nobody can follow is not a citation
        for (const v of rc.votes || []) {
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
  const act = (session, m, a, issues) => {
    const mid = midOf(`${session}|${m.utahBill}`);
    for (const v of a.votes || []) {
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
  for (const [session, f] of UT_COMMITTEE) {
    for (const m of J(f).measures) {
      const issues = mappingOf.get(`${session}|${m.utahBill}`) || [];
      for (const a of m.committeeActs || []) act(session, m, a, issues);
    }
  }
  for (const [session, f] of UT_MAPPING) {
    if (!existsSync(join(ROOT, f))) continue;
    for (const m of J(f).measures) for (const a of m.committeeActs || []) act(session, m, a, m.issues || []);
  }
  for (const l of byMember.values()) l.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return byMember;
}

// ── The cap, and the order ───────────────────────────────────────────────────
// The brief lists up to four one-sided patterns and then up to three splits
// (_FPI_TOPS_CAP / _FPI_SPLITS_CAP in consistency.js). The block takes them in
// that same order and stops at six, so the strongest one-sided reads always lead
// and a split is never dropped in favour of a fifth one-sided row that the brief
// itself would not have listed.
const LINE_CAP = 6;

// One shape row, flattened to the three strings the block prints. The tally is
// read exactly as shapeTallyHtml() reads it on the live row: the chip's own
// `counts` where the chip carries them, else `sideCounts` — which is the field
// that exists so a split whose margin the publication rule withheld from the chip
// still shows its two integers. Where neither is on file, nothing is printed; the
// live brief says "no count on file yet" there and that is a sentence about our
// data, not a pattern line about a person.
function flatten(row) {
  const p = String((row && row.patLabel) || "").trim();
  const i = String((row && row.label) || "").trim();
  if (!p || !i) return null;
  const c = String((row && (row.counts || row.sideCounts)) || "").trim();
  const out = { p, i };
  if (c) out.c = c;
  return out;
}

// The rows the profile brief would list for this person, in the brief's order.
//
// EXEC LANE FIRST, for the reason briefHeroHtml() puts it first: consistency.js's
// _stDirRaw() declines every executive row by design, so a president reaches the
// roll-call shape as "37 issues · 0 read" — three counts that are true about the
// roll-call engine and false about the person. execRecordSummary.pick() publishes
// whether it is the surface in play, so that is the question asked here rather
// than a guess from the office string.
function rowsFor(win, pid) {
  const C = win.PDXConsistency;
  if (!C) return [];
  const XS = C.execRecordSummary;
  if (XS && typeof XS.pick === "function" && typeof XS.shape === "function") {
    let picked = null;
    try { picked = XS.pick(pid); } catch { picked = null; }
    if (picked && picked.on) {
      let sh = null;
      try { sh = XS.shape(pid); } catch { sh = null; }
      return sh ? (sh.tops || []).concat(sh.splits || []) : [];
    }
  }
  const FPI = C.formalPatternIndex;
  if (!FPI || typeof FPI.shape !== "function") return [];
  let sh = null;
  try { sh = FPI.shape(pid); } catch { sh = null; }
  return sh ? (sh.tops || []).concat(sh.splits || []) : [];
}

export function buildCrawlRecord(ROOT) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ENGINE_FILES) {
    vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  // profiles-full.js is not in the sandbox, so PROFILES (the Firestore half of the
  // roster) is stood up from the bundled roster exactly as every engine harness in
  // scripts/ does it.
  win.PROFILES = win.CMP_DATA;
  if (!win.PDXConsistency || typeof win.PDXConsistency.formalPatternIndex?.shape !== "function") {
    throw new Error("PDXConsistency.formalPatternIndex.shape() unavailable — the engines did not load");
  }
  if (!win.PDXVotingRecord || typeof win.PDXVotingRecord.noteMember !== "function") {
    throw new Error("PDXVotingRecord.noteMember() unavailable — the record lane cannot be seeded");
  }

  // The record, seeded the way a completed /api/voting-record fetch leaves the
  // cache. Federal and Utah are concatenated rather than merged: they are disjoint
  // populations, and a pid that somehow appeared in both would be one person whose
  // two lanes are both theirs.
  const federal = buildCorpus(ROOT);
  const utah = buildUtahLane(ROOT);
  const lane = new Map();
  for (const [pid, items] of federal.byMember) lane.set(pid, items.slice());
  for (const [pid, items] of utah) lane.set(pid, (lane.get(pid) || []).concat(items));
  for (const [pid, items] of lane) {
    try { win.PDXVotingRecord.noteMember(pid, items); } catch { /* one member's pack is not the run */ }
  }

  const roster = win.CMP_DATA || {};
  const out = {};
  const stats = { roster: 0, withLines: 0, lines: 0, laneMembers: lane.size, offRoster: [] };
  for (const pid of Object.keys(roster).sort()) {
    if (!roster[pid] || !roster[pid].name) continue;
    stats.roster++;
    const lines = rowsFor(win, pid).map(flatten).filter(Boolean).slice(0, LINE_CAP);
    // FAIL CLOSED. No readable row is no section — never a "no pattern" line,
    // which would print our curation gap as a finding about the person.
    if (!lines.length) continue;
    out[pid] = lines;
    stats.withLines++;
    stats.lines += lines.length;
  }
  for (const pid of lane.keys()) if (!roster[pid]) stats.offRoster.push(pid);
  return { personRecord: out, stats };
}

// ── Standalone report ────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith("gen-crawl-record.mjs")) {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
  const one = process.argv.includes("--member") ? process.argv[process.argv.indexOf("--member") + 1] : "";
  const { personRecord, stats } = buildCrawlRecord(ROOT);
  if (one) {
    const lines = personRecord[one];
    console.log(lines
      ? `${one}\n` + lines.map((l) => `  · ${l.p} · ${l.i}${l.c ? ` · ${l.c}` : ""}`).join("\n")
      : `${one} — no readable formal pattern in the offline snapshot; the block prints no record section`);
  } else {
    console.log(
      `formal-pattern snapshot — ${stats.withLines} of ${stats.roster} roster records carry lines ` +
        `(${stats.lines} lines; ${stats.laneMembers} members had a record to read)`
    );
    if (stats.offRoster.length) {
      console.log(`  ${stats.offRoster.length} seeded pid(s) are on no roster record and were skipped: ${stats.offRoster.join(", ")}`);
    }
  }
}
