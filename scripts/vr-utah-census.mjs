#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — UTAH LEFTOVER CENSUS (read-only)
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS. Every Utah wave has opened by quoting the previous wave's
// leftover list, and a leftover list ages badly: a bill named as "refused for want
// of a mapping" in wave 4 may have been admitted in wave 8, and a member named as
// empty may have gained a row from a session ingested since. Quoting the old list
// is how a wave ends up re-doing work that is already done, or claiming a gap that
// has been closed. So this file rebuilds the list from the artefacts that actually
// ship, every time it is run, and refuses to carry a hand-maintained copy of any
// number it can compute.
//
//   node scripts/vr-utah-census.mjs            # the A–E census
//   node scripts/vr-utah-census.mjs --json     # machine-readable
//   node scripts/vr-utah-census.mjs --section C
//
// THE FIVE QUESTIONS, and where each answer comes from — no answer is typed in:
//   A  roster ids with no readable formal row     shipped seeds → consistency.js
//                                                 formalPatternIndex, same call
//                                                 scripts/vr-utah-fpi.mjs makes
//   B  ids whose votes were parsed and refused    the reviewed name maps' own
//                                                 refusal and coverage ledgers
//   C  2023GS committee: ingested or not          presence of the session's
//                                                 committee seed + mapping seed +
//                                                 the migrations generated from them
//   D  floor sessions on file                     the floor seeds, per session
//   E  bills with a contested act and no issue    the curator decision files'
//      row, by session                            `_refused` piles, both lanes
//
// READ-ONLY. Opens no database, fetches nothing, writes no file, mutates no seed.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
const HAS = (f) => existsSync(join(ROOT, f));
const AS_JSON = process.argv.includes("--json");
const argOf = (n) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] || "" : ""; };
const ONLY = argOf("section").toUpperCase();
const want = (s) => !ONLY || ONLY.includes(s);

const SESSIONS = ["2025GS", "2024GS", "2023GS"];
const suffixed = (base, s) => (s === "2025GS" ? `db/${base}.json` : `db/${base}-${s}.json`);
const FLOOR_SEED = (s) => suffixed("vr-utah-vote-seed", s);
const CMTE_SEED = (s) => suffixed("vr-utah-committee-seed", s);
const MAP_SEED = (s) => `db/vr-utah-committee-mapping-seed-${s}.json`;
const FLOOR_BILLS = (s) => suffixed("vr-utah-bills", s);
const CMTE_BILLS = (s) => `db/vr-utah-committee-bills-${s}.json`;
const FLOOR_MEMBERS = (s) => suffixed("vr-utah-member-map", s);
const CMTE_MEMBERS = (s) => suffixed("vr-utah-committee-map", s);
const MIGRATIONS = "netlify/database/migrations";

// ── the sandbox, exactly as the FPI harness boots it ─────────────────────────
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

// ── the roster, same union the FPI harness uses ──────────────────────────────
const UT_OFFICE = /(Utah State|UT State) (Representative|Senator)|Utah (Senate President|House Speaker)|UT (House|Senate) (Speaker|President)/;
function roster(win) {
  const out = new Set();
  for (const s of SESSIONS) {
    for (const ch of Object.values(J(FLOOR_MEMBERS(s)).chambers || {})) {
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
// Which chamber a roster id sits in, for the House / Senate split the report owes.
function chamberOf(win, pid) {
  for (const s of SESSIONS) {
    const chambers = J(FLOOR_MEMBERS(s)).chambers || {};
    for (const [ch, entries] of Object.entries(chambers)) {
      for (const v of Object.values(entries)) {
        const p = v && typeof v === "object" ? v.politicianId : v;
        if (p === pid) return ch === "H" ? "House" : "Senate";
      }
    }
  }
  const office = ((win.CMP_DATA || {})[pid] || {}).office || "";
  if (/Senat/i.test(office)) return "Senate";
  if (/Represent|House/i.test(office)) return "House";
  return "unknown";
}

// ── the lane, assembled from every shipped Utah feeder ───────────────────────
let midSeq = 0;
const MID = new Map();
const midOf = (k) => { if (!MID.has(k)) MID.set(k, ++midSeq); return MID.get(k); };

function buildLane() {
  const byMember = new Map();
  const push = (pid, it) => { const l = byMember.get(pid) || []; l.push(it); byMember.set(pid, l); };
  const mappingOf = new Map();
  const perSession = new Map(SESSIONS.map((s) => [s, {
    measures: 0, rollcalls: 0, floorVotes: 0, voters: new Set(),
    cmteActs: 0, cmtePositions: 0, mapMeasures: 0, mapActs: 0, mapPositions: 0,
    cmteVoters: new Set(),
  }]));

  for (const s of SESSIONS) {
    const st = perSession.get(s);
    for (const m of J(FLOOR_SEED(s)).measures) {
      const mid = midOf(`${s}|${m.utahBill}`);
      mappingOf.set(`${s}|${m.utahBill}`, m.issues || []);
      st.measures++;
      for (const rc of m.rollcalls || []) {
        if (!rc.sourceUrl) continue;
        st.rollcalls++;
        for (const v of rc.votes || []) {
          st.floorVotes++; st.voters.add(v.politicianId);
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
  const act = (s, m, a, issues, kind) => {
    const mid = midOf(`${s}|${m.utahBill}`);
    const st = perSession.get(s);
    st[kind === "cmte" ? "cmteActs" : "mapActs"]++;
    for (const v of a.votes || []) {
      st[kind === "cmte" ? "cmtePositions" : "mapPositions"]++;
      st.cmteVoters.add(v.politicianId);
      push(v.politicianId, {
        kind: "position", measureId: mid, measureType: "bill", number: m.number,
        title: m.title, chamber: m.chamber, status: m.status || null,
        date: `${a.date}T00:00:00-07:00`,
        action: "committee_vote", actionType: "committee_vote", position: "committee_vote",
        result: null, isParty: null, supports: !!v.supports, isProcedural: false,
        advanceInverted: false, isAmendment: false, parentMeasureId: null,
        rollcallId: null, congress: null, session: null, rollNumber: null, issues,
        source: { url: a.sourceUrl || a.minutesUrl, label: "Utah committee minutes" },
      });
    }
  };
  for (const s of SESSIONS) {
    if (HAS(CMTE_SEED(s))) for (const m of J(CMTE_SEED(s)).measures) {
      for (const a of m.committeeActs || []) act(s, m, a, mappingOf.get(`${s}|${m.utahBill}`) || [], "cmte");
    }
    if (HAS(MAP_SEED(s))) for (const m of J(MAP_SEED(s)).measures) {
      perSession.get(s).mapMeasures++;
      for (const a of m.committeeActs || []) act(s, m, a, m.issues || [], "map");
    }
  }
  for (const l of byMember.values()) l.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return { byMember, perSession };
}

// ── the bands, from the shipped engine ──────────────────────────────────────
function bands(win, lane, ROSTER) {
  const FPI = win.PDXConsistency.formalPatternIndex;
  const per = new Map();
  for (const pid of [...ROSTER].sort()) {
    const items = lane.byMember.get(pid) || [];
    if (!items.length) { per.set(pid, { band: "empty", issues: 0, characterised: 0, acts: 0 }); continue; }
    win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(items)));
    const sh = FPI.shape(pid) || { issues: 0, characterised: 0 };
    per.set(pid, {
      band: !sh.issues ? "empty" : sh.characterised ? "readable" : "thin",
      issues: sh.issues, characterised: sh.characterised, acts: items.length,
    });
  }
  return per;
}

// ── E: the two refusal piles, read out of the curator decision files ────────
function refusals() {
  const out = [];
  const count = (r) => (Array.isArray(r) ? r.length : Object.keys(r || {}).length);
  const entries = (r) => (Array.isArray(r)
    ? r.map((x) => [x.bill, x.why || x.reason || ""])
    : Object.entries(r || {}).map(([k, v]) => [k, typeof v === "string" ? v : (v.why || v.reason || "")]));
  for (const s of SESSIONS) {
    for (const [lane, file] of [["floor", FLOOR_BILLS(s)], ["committee", CMTE_BILLS(s)]]) {
      if (!HAS(file)) continue;
      const j = J(file);
      out.push({
        session: s, lane, file,
        admitted: count(j.bills), refused: count(j._refused),
        bills: entries(j._refused),
      });
    }
  }
  return out;
}

// ── WHY A BILL WAS REFUSED ──────────────────────────────────────────────────
// The point of splitting the pile is to answer one question: which of these could a
// CURATOR pass close under the 121 shipped keys, and which are refused on the merits
// and would need something other than more work? Counting 295 refusals as one number
// answers neither, and the first cut ("no key" vs "two-way") left two thirds of them
// in an "other" bucket that hid the difference between "the vocabulary is short a
// word" and "the text does not point anywhere".
//
// So each refusal is read for the reason its own prose gives, most specific first,
// because a single note often names two — a bill can be both procedural AND outside
// every key, and the binding reason is the one the curator wrote down first.
//
// None of these is a to-do list. `no_shipped_key` is the only bucket a vocabulary
// proposal could ever act on, and even there the six vocab rules apply: a key gets
// proposed when the same fight is refused three or more times, never for one bill.
const CATS = [
  // The text points two ways at once. Not closable by any key, ever.
  ["no_single_direction",
   /two-?way|cuts both ways|both directions|opposite direction|point in opposite|circular|either flank|one direction for|equally well|no net direction|cannot take both|cannot choose|would have to choose|does not settle it|not decidable|depends on which|which provision you weigh|which door you come through|is exactly what the floor was arguing|contradicts its own|restriction and accommodation|simultaneously constrains|runs both ways|trades one right against another|opens one channel|loosening and tightening|in both directions|against itself|one right against/i],
  // Housekeeping: renumbering, code alignment, technical cleanup. There is no position
  // in the instrument to read, so no key is the right key.
  ["procedural_or_technical",
   /too technical|code maintenance|renumbering|purely procedural|operative direction is procedural|technical (?:cleanup|amendment|bill)|conforming amendments only|housekeeping|recodification|no operative change|definitional cleanup|program administration|calendar administration|administration:|administrative (?:cleanup|mechanics)|compensation mechanics|notification procedure|deadlines and (?:duties|procedures)|is administration|no operative policy change|drafting cleanup|procedural amendments|appointment mechanics|definitional split|mechanics(?:[;.,]| only)|no substantive requirement|licensing mechanics|reporting mechanics/i],
  // A study, a report or a data-collection duty. Voting for one is not a position on the
  // subject studied, so there is no direction in the act to map.
  ["study_or_data_only",
   /a study directive|study directive|(?:requires|directs|establishes) (?:a|an) (?:study|report)|data collection with no|study and report|report recommendations|a study of|is a study|only a study|feasibility study/i],
  // A key exists and would fit the SUBJECT, but attaching it would state a position the
  // bill does not take. This is the bucket that protects the keys from becoming labels.
  ["key_would_be_a_label",
   /would be a label|not a reading|would be a stretch|not worth a mapping|would be a guess|is not a position on|would widen the key|outside it|umbrella chip|a different bill|would have to be stretched/i],
  // Two unrelated provisions and neither carries the bill; or an omnibus / governance
  // reorganisation where the vote was on the package, not on any one fight in it.
  ["omnibus_or_hybrid",
   /two unrelated provisions|neither carrying the bill|hybrid|two bills in one|unrelated halves|an omnibus|a large package|omnibus:|governance reorganisation|reorganisation:|the vote was on the (?:package|whole)|large renumbering/i],
  // The provisions genuinely do not say which way they cut. Distinct from a two-way
  // bill: a two-way bill points both ways, this one points nowhere legible, so any
  // mapping would be reading intent into a summary that states none.
  ["text_does_not_say",
   /cannot be read off|do(?:es)? not say|does not state|summary (?:does not|names neither)|cannot support a mapping|the provisions do not|reading intent|whether that (?:narrows or widens|widens or narrows)|entire question, and|one-line summary/i],
  // The vocabulary genuinely has no word for this fight. The only bucket a vocab wave
  // could act on.
  ["no_shipped_key",
   /no shipped key|no key (?:in|covers|reaches|on the list|was invented|exists for)|no shipped issue key|shipped key (?:covers|reaches)|vocabulary has no|no home among|no issue key (?:in|covers)|nothing in the issue key list|inventing one for a single bill|not on the list|no key (?:is|that)/i],
  // A shipped key names the SUBJECT but is scoped to a different question, so it has no
  // direction to give this bill. Distinct from `no_shipped_key`: the word exists, it just
  // does not reach here, and widening it to fit would turn a key into a topic tag.
  ["outside_a_shipped_key",
   /shipped (?:\w+ )?keys? (?:are about|cover|is about|is scoped|are scoped)|no shipped \w+ key has a direction|scoped to|does not reach|is about (?:the )?\w+, not|would widen|outside (?:it|the key|that key)/i],
];
const CAT_NAMES = CATS.map(([n]) => n).concat("unclassified");
const classify = (why) => {
  for (const [name, re] of CATS) if (re.test(why)) return name;
  return "unclassified";
};

// ── the report ──────────────────────────────────────────────────────────────
const lane = buildLane();
const win = boot();
const ROSTER = roster(win);
const PER = bands(win, lane, ROSTER);
const REF = refusals();
const NOTES = HAS("db/vr-utah-empty-file-notes.json") ? J("db/vr-utah-empty-file-notes.json") : { notes: {} };
const MIGS = existsSync(join(ROOT, MIGRATIONS)) ? readdirSync(join(ROOT, MIGRATIONS)).sort() : [];

const noReadable = [...PER.entries()].filter(([, v]) => v.band !== "readable")
  .map(([pid, v]) => ({ pid, ...v, chamber: chamberOf(win, pid), note: !!(NOTES.notes || {})[pid] }))
  .sort((a, b) => (a.band === b.band ? a.pid.localeCompare(b.pid) : a.band === "empty" ? -1 : 1));

const readableByChamber = { House: 0, Senate: 0, unknown: 0 };
const rowsByChamber = { House: 0, Senate: 0, unknown: 0 };
for (const [pid, v] of PER) {
  const ch = chamberOf(win, pid);
  if (v.band === "readable") readableByChamber[ch]++;
  rowsByChamber[ch] += v.issues;
}

const nameRefusals = SESSIONS.map((s) => {
  const floor = J(FLOOR_MEMBERS(s));
  const cmte = HAS(CMTE_MEMBERS(s)) ? J(CMTE_MEMBERS(s)) : {};
  const flat = (v) => (Array.isArray(v) ? v : Object.values(v || {}).flat());
  return {
    session: s,
    floorRefused: flat(floor._refusedNames), floorUnmapped: flat(floor.unmapped),
    cmteRefused: flat(cmte._refusedNames), cmteUnmapped: flat(cmte.unmapped),
  };
});

const cmte2023 = {
  votesSeed: HAS(CMTE_SEED("2023GS")),
  mappingSeed: HAS(MAP_SEED("2023GS")),
  decisionFile: HAS(CMTE_BILLS("2023GS")),
  migrations: MIGS.filter((f) => /2023gs_committee/.test(f)),
};

const out = { A: noReadable, B: nameRefusals, C: cmte2023, D: [...lane.perSession.entries()], E: REF };
if (AS_JSON) { console.log(JSON.stringify(out, (k, v) => (v instanceof Set ? [...v] : v), 2)); process.exit(0); }

const line = (s = "") => console.log(s);
line();
line("  UTAH LEFTOVER CENSUS — rebuilt from shipped seeds and migration files");
line(`  roster ${ROSTER.size} · readable ${[...PER.values()].filter((v) => v.band === "readable").length}` +
     ` · thin ${[...PER.values()].filter((v) => v.band === "thin").length}` +
     ` · empty ${[...PER.values()].filter((v) => v.band === "empty").length}`);
line(`  readable by chamber: House ${readableByChamber.House} · Senate ${readableByChamber.Senate}` +
     (readableByChamber.unknown ? ` · unplaced ${readableByChamber.unknown}` : ""));

if (want("A")) {
  line();
  line(`  A. ROSTER IDS WITH NO READABLE FORMAL ROW — ${noReadable.length}`);
  line("     band     pid                        acts  rows  chamber  reviewed note");
  for (const m of noReadable) {
    line(`     ${m.band.padEnd(8)} ${m.pid.padEnd(26)} ${String(m.acts).padStart(4)} ` +
         `${String(m.issues).padStart(5)}  ${m.chamber.padEnd(7)}  ${m.note ? "yes" : "NO"}`);
  }
}

if (want("B")) {
  line();
  line("  B. VOTES PARSED AND REFUSED — the identity fences");
  for (const n of nameRefusals) {
    line(`     ${n.session}  floor: refused ${n.floorRefused.length} [${n.floorRefused.join(", ") || "—"}]` +
         ` · unmapped ${n.floorUnmapped.length}`);
    line(`             cmte:  refused ${n.cmteRefused.length} [${n.cmteRefused.join(", ") || "—"}]` +
         ` · unmapped ${n.cmteUnmapped.length}`);
  }
  const byLane = {};
  for (const r of REF) for (const [, why] of r.bills) {
    const c = classify(why);
    byLane[c] = (byLane[c] || 0) + 1;
  }
  line("     mapping fence (bills, both lanes, all sessions): " +
    Object.entries(byLane).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
}

if (want("C")) {
  line();
  line("  C. 2023GS COMMITTEE");
  line(`     committee votes seed   ${cmte2023.votesSeed ? "PRESENT " + CMTE_SEED("2023GS") : "ABSENT"}`);
  line(`     curator decision file  ${cmte2023.decisionFile ? "PRESENT " + CMTE_BILLS("2023GS") : "ABSENT"}`);
  line(`     mapping seed           ${cmte2023.mappingSeed ? "PRESENT " + MAP_SEED("2023GS") : "ABSENT"}`);
  for (const m of cmte2023.migrations) line(`     migration              ${m}`);
  line(`     verdict                ${cmte2023.votesSeed && cmte2023.mappingSeed && cmte2023.migrations.length
    ? "INGESTED — no new session scraper is owed" : "NOT INGESTED"}`);
}

if (want("D")) {
  line();
  line("  D. FLOOR SESSIONS ON FILE");
  line("     session  measures  rolls  floor votes  distinct voters  cmte acts  cmte rows  roster ids with 0 acts");
  for (const [s, st] of lane.perSession) {
    const zero = [...ROSTER].filter((p) => !st.voters.has(p) && !st.cmteVoters.has(p)).length;
    line(`     ${s}     ${String(st.measures).padStart(8)} ${String(st.rollcalls).padStart(6)} ` +
         `${String(st.floorVotes).padStart(12)} ${String(st.voters.size).padStart(16)} ` +
         `${String(st.cmteActs + st.mapActs).padStart(10)} ${String(st.cmtePositions + st.mapPositions).padStart(10)} ` +
         `${String(zero).padStart(22)}`);
  }
}

if (want("E")) {
  line();
  line("  E. BILLS WITH A CONTESTED ACT AND NO ISSUE ROW — the refusal piles");
  line("     Only the `no key` column could ever be closed by a curator pass under the");
  line("     121 shipped keys, and only then if the same fight recurs three or more times.");
  line("     Everything else is refused on the merits of the text.");
  line("");
  const HEAD = { no_single_direction: "two-way", procedural_or_technical: "procedural",
    key_would_be_a_label: "label", omnibus_or_hybrid: "omnibus", text_does_not_say: "silent",
    outside_a_shipped_key: "off-key", no_shipped_key: "no key", study_or_data_only: "study",
    unclassified: "unread" };
  line(`     session  lane        admitted  refused  ` +
       CAT_NAMES.map((c) => HEAD[c].padStart(11)).join(""));
  let total = 0;
  const grand = Object.fromEntries(CAT_NAMES.map((c) => [c, 0]));
  for (const r of REF) {
    const c = Object.fromEntries(CAT_NAMES.map((x) => [x, 0]));
    for (const [, why] of r.bills) { const k = classify(why); c[k]++; grand[k]++; }
    total += r.refused;
    line(`     ${r.session}   ${r.lane.padEnd(10)} ${String(r.admitted).padStart(8)} ${String(r.refused).padStart(8)}  ` +
         CAT_NAMES.map((x) => String(c[x]).padStart(11)).join(""));
  }
  line(`     ${"".padEnd(13)}total ${String(REF.reduce((n, r) => n + r.admitted, 0)).padStart(11)} ${String(total).padStart(8)}  ` +
       CAT_NAMES.map((x) => String(grand[x]).padStart(11)).join(""));
  line(`     total refused bills parked: ${total}`);
  if (grand.unclassified)
    line(`     ${grand.unclassified} refusal(s) give a reason this census cannot read — widen CATS rather than round them into a neighbour.`);
}
line();
