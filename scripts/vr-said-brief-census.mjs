#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — THE EMPTY-FORMAL CENSUS: WHO THE SAID BRIEF OWNS (read-only)
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS. word-action.js's ✒️ SAID brief leads a file with what a person
// SAID when the formal lane holds nothing readable. That gate is one predicate
// (PDXWordAction.saidLeadApplies), and nobody had ever asked it of the whole
// roster at once — so three questions had no answer: which files it owns today,
// which files it OUGHT to own and does not, and which files it must never own
// because the emptiness is an artefact of the index rather than a fact about the
// person.
//
// THE DEFINITION, TAKEN FROM THE GATE AND NOT REDEFINED HERE:
//   empty  =  formalPatternIndex.shape(pid) has no read, no judged and no
//             characterised acts, asked AFTER the member payload is an array —
//             i.e. the lane was asked and answered. That is the same positive-
//             knowledge gate saidLead() takes, and this file calls the shipped
//             predicate rather than re-implementing it.
//
// WHAT IT COUNTS, AND FROM WHAT — no number below is typed in:
//   the lane        the shipped Utah seeds (floor + committee + reviewed
//                   mapping), assembled exactly as scripts/vr-utah-census.mjs
//                   assembles them, then filed through PDXVotingRecord.noteMember
//   the shape       PDXConsistency.formalPatternIndex.shape(pid)
//   cited stance n  PDXWordAction.saidRowSet(pid).cited — the same count that
//                   earns the brief: a position with a source URL
//   SAID brief y/n  PDXWordAction.saidLeadApplies(pid, person) — the live gate
//   the federal     vr_member_votes / vr_measure_issues in the branch database,
//   pack            read with plain SELECTs. A federal id with a pack is the one
//                   class this census must not call empty: the Utah index covers
//                   one lane and cannot speak for a federal member.
//
// READ-ONLY. No INSERT, no UPDATE, no migration, no seed touched, no card added,
// no act type invented. Every classification is a documentation status, never a
// verdict on a person.
//
//   node scripts/vr-said-brief-census.mjs             # the A–E census
//   node scripts/vr-said-brief-census.mjs --json      # machine-readable
//   node scripts/vr-said-brief-census.mjs --class C   # one class
//   node scripts/vr-said-brief-census.mjs --no-db     # skip the federal pack read
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
const HAS = (f) => existsSync(join(ROOT, f));
const AS_JSON = process.argv.includes("--json");
const NO_DB = process.argv.includes("--no-db");
const argOf = (n) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] || "" : ""; };
const ONLY = argOf("class").toUpperCase();

const SESSIONS = ["2025GS", "2024GS", "2023GS"];
const suffixed = (base, s) => (s === "2025GS" ? `db/${base}.json` : `db/${base}-${s}.json`);
const FLOOR_SEED = (s) => suffixed("vr-utah-vote-seed", s);
const CMTE_SEED = (s) => suffixed("vr-utah-committee-seed", s);
const MAP_SEED = (s) => `db/vr-utah-committee-mapping-seed-${s}.json`;
const FLOOR_MEMBERS = (s) => suffixed("vr-utah-member-map", s);

// ── the sandbox, exactly as scripts/test-said-brief-word-first.mjs boots it ──
// The member payload LANDS EMPTY for everyone the lane does not seed: an array
// with nothing in it, which is what memberRecords() documents and what the API
// answers for a candidate or a state legislator whose roll calls are not
// ingested. That is the frame the gate is entitled to act on, and the frame this
// census is defined on.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "formal-index.js", "issue-colors.js", "consistency.js",
  "voting-record.js", "word-action.js", "stance-tree.js", "profile-spine.js",
];
function boot() {
  const win = makeSandbox();
  const ls = {};
  const store = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(ls, k) ? ls[k] : null),
    setItem: (k, v) => { ls[k] = String(v); },
    removeItem: (k) => { delete ls[k]; },
  };
  win.localStorage = store; win.sessionStorage = store;
  win.auth = { currentUser: null }; win.performance = { now: () => 0 };
  const rec = {};
  win.PDXVotingRecord = {
    memberRecords: (pid) => rec[pid] || [],
    fetchMember: () => {}, noteMember: (pid, rows) => { rec[pid] = rows; },
  };
  const sandbox = vm.createContext(win);
  win.__err = [];
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { win.__err.push(`${f}: ${e.message}`); }
  }
  const VR = win.PDXVotingRecord || {};
  const note = typeof VR.noteMember === "function" ? VR.noteMember.bind(VR) : (pid, rows) => { rec[pid] = rows; };
  VR.fetchMember = () => {};
  VR.noteMember = (pid, rows) => { rec[pid] = rows; note(pid, rows); };
  VR.memberRecords = (pid) => rec[pid] || [];
  win.PDXVotingRecord = VR;
  win.PROFILES = win.CMP_DATA;
  return win;
}

// ── the lane, assembled from every shipped Utah feeder ───────────────────────
let midSeq = 0;
const MID = new Map();
const midOf = (k) => { if (!MID.has(k)) MID.set(k, ++midSeq); return MID.get(k); };
function buildLane() {
  const byMember = new Map();
  const push = (pid, it) => { const l = byMember.get(pid) || []; l.push(it); byMember.set(pid, l); };
  const mappingOf = new Map();
  for (const s of SESSIONS) {
    for (const m of J(FLOOR_SEED(s)).measures) {
      const mid = midOf(`${s}|${m.utahBill}`);
      mappingOf.set(`${s}|${m.utahBill}`, m.issues || []);
      for (const rc of m.rollcalls || []) {
        if (!rc.sourceUrl) continue;
        for (const v of rc.votes || []) push(v.politicianId, {
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
  const act = (s, m, a, issues) => {
    const mid = midOf(`${s}|${m.utahBill}`);
    for (const v of a.votes || []) push(v.politicianId, {
      kind: "position", measureId: mid, measureType: "bill", number: m.number,
      title: m.title, chamber: m.chamber, status: m.status || null,
      date: `${a.date}T00:00:00-07:00`,
      action: "committee_vote", actionType: "committee_vote", position: "committee_vote",
      result: null, isParty: null, supports: !!v.supports, isProcedural: false,
      advanceInverted: false, isAmendment: false, parentMeasureId: null,
      rollcallId: null, congress: null, session: null, rollNumber: null, issues,
      source: { url: a.sourceUrl || a.minutesUrl, label: "Utah committee minutes" },
    });
  };
  for (const s of SESSIONS) {
    if (HAS(CMTE_SEED(s))) for (const m of J(CMTE_SEED(s)).measures) {
      for (const a of m.committeeActs || []) act(s, m, a, mappingOf.get(`${s}|${m.utahBill}`) || []);
    }
    if (HAS(MAP_SEED(s))) for (const m of J(MAP_SEED(s)).measures) {
      for (const a of m.committeeActs || []) act(s, m, a, m.issues || []);
    }
  }
  for (const l of byMember.values()) l.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return byMember;
}

// ── the scope: the Utah roster, floor and off-floor alike ────────────────────
// The Utah FLOOR roster (the three member maps) is the set vr-utah-census.mjs
// bands, and it is not the set the SAID brief can own: the brief is defined by an
// empty formal lane, not by an office, so a county commissioner, an auditor and a
// challenger are all in scope. So the scope is the floor roster UNION every
// CMP_DATA row whose office or seat line names Utah.
const UT_SEAT = /utah|^UT |\bUT District\b|\bUT-\d/i;
function scope(win) {
  const out = new Map();  // pid -> why it is in scope
  for (const s of SESSIONS) {
    for (const ch of Object.values(J(FLOOR_MEMBERS(s)).chambers || {})) {
      for (const v of Object.values(ch)) {
        const pid = v && typeof v === "object" ? v.politicianId : v;
        if (pid) out.set(pid, "floor_member_map");
      }
    }
  }
  const D = win.CMP_DATA || {};
  for (const pid of Object.keys(D)) {
    const p = D[pid] || {};
    if (out.has(pid)) continue;
    if (UT_SEAT.test(p.office || "") || UT_SEAT.test(p.state || "")) out.set(pid, "utah_roster_row");
  }
  return out;
}

// ── the pack the Utah index cannot see, read from the branch database ───────
// THE UTAH INDEX COVERS ONE LANE. A federal member's formal record does not live
// in a Utah seed — it lives behind /api/voting-record — so a census built only
// from the Utah feeders calls Mike Lee empty, and the gate, asked in that
// sandbox, says the SAID brief owns his file. Both are artefacts of the read, and
// publishing either as a finding about him would be the exact error the word-first
// pass was written to avoid. So every scope id is also asked of the database, the
// rows are shaped the way netlify/lib/vr-pack.ts shapes an API response (and
// scripts/vr-federal-fpi.mjs shapes the same rows out of Postgres), and the gate
// is asked a SECOND time over the pack that actually lands in a browser. That
// second answer is the one reported as "live".
//
// READ-ONLY: three plain SELECTs. Nothing is written and no vote is ingested.
const PROCEDURAL_TYPES = new Set(["procedural", "motion"]);       // vr-federal-fpi.mjs
const yeaBlocksMeasure = (q) => {
  const s = String(q || "").toLowerCase();
  return s.indexOf("recommit") !== -1 || s.indexOf("to commit") !== -1 || s.indexOf("to table") !== -1;
};
async function livePacks(pids) {
  if (NO_DB || !process.env.NETLIFY_DB_URL) return null;
  const pg = (await import("pg")).default;
  const c = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = async (sql, p) => (await c.query(sql, p)).rows;
  const votes = await q(`
    select mv.politician_id pid, mv.position, mv.is_party,
           m.id measure_id, m.measure_type, m.number, m.title, m.parent_id, m.status,
           rc.id rollcall_id, rc.chamber, rc.congress, rc.session, rc.roll_number,
           rc.vote_date, rc.question, rc.action_type, rc.result,
           rc.source_url, rc.source_label
      from vr_member_votes mv
      join vr_rollcalls rc on rc.id = mv.rollcall_id
      join vr_measures m on m.id = rc.measure_id
     where mv.politician_id = any($1::text[])
     order by rc.vote_date desc`, [pids]);
  const pos = await q(`
    select p.politician_id pid, p.action_type, p.supports, p.acted_at, p.source_url,
           m.id measure_id, m.measure_type, m.number, m.title, m.parent_id, m.status,
           m.chamber, m.source_label
      from vr_positions p
      join vr_measures m on m.id = p.measure_id
     where p.politician_id = any($1::text[])`, [pids]);
  const issueRows = await q(`select measure_id, issue_key, weight, is_primary, support_meaning
                               from vr_measure_issues`);
  await c.end();

  const byMeasure = new Map();
  for (const r of issueRows) {
    const l = byMeasure.get(r.measure_id) || [];
    l.push({ issueKey: r.issue_key, weight: Number(r.weight), isPrimary: !!r.is_primary,
             supportMeaning: r.support_meaning, rationale: null });
    byMeasure.set(r.measure_id, l);
  }
  for (const l of byMeasure.values()) l.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight);

  const out = new Map();
  const push = (pid, it) => { const l = out.get(pid) || []; l.push(it); out.set(pid, l); };
  for (const v of votes) {
    if (!v.source_url) continue;                                  // verifiability guard
    push(v.pid, {
      kind: "vote", measureId: v.measure_id, measureType: v.measure_type, number: v.number,
      title: v.title, chamber: v.chamber, status: v.status,
      date: v.vote_date ? new Date(v.vote_date).toISOString() : null,
      action: v.question, actionType: v.action_type, position: v.position, result: v.result,
      isParty: v.is_party, supports: null,
      isProcedural: PROCEDURAL_TYPES.has(v.action_type),
      advanceInverted: yeaBlocksMeasure(v.question),
      isAmendment: v.measure_type === "amendment", parentMeasureId: v.parent_id ?? null,
      rollcallId: v.rollcall_id, congress: v.congress ?? null, session: v.session ?? null,
      rollNumber: v.roll_number ?? null, issues: byMeasure.get(v.measure_id) || [],
      source: { url: v.source_url, label: v.source_label },
    });
  }
  for (const p of pos) {
    if (!p.source_url) continue;
    push(p.pid, {
      kind: "position", measureId: p.measure_id, measureType: p.measure_type, number: p.number,
      title: p.title, chamber: p.chamber, status: p.status,
      date: p.acted_at ? new Date(p.acted_at).toISOString() : null,
      action: p.action_type, actionType: p.action_type, position: p.action_type, result: null,
      isParty: null, supports: p.supports, isProcedural: false, advanceInverted: false,
      isAmendment: p.measure_type === "amendment", parentMeasureId: p.parent_id ?? null,
      rollcallId: null, congress: null, session: null, rollNumber: null,
      issues: byMeasure.get(p.measure_id) || [],
      source: { url: p.source_url, label: p.source_label ?? null },
    });
  }
  for (const l of out.values()) l.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return out;
}

// ── classification ──────────────────────────────────────────────────────────
// FIVE DOCUMENTATION STATUSES, and no sixth is invented for an awkward case. The
// vocabulary is db/vr-utah-empty-file-notes.json's, widened by the two classes
// that file never had to name (a non-floor office, and a federal pack).
const FEDERAL_OFFICE = /^(U\.S\.|US) (Senator|Representative|House|Senate)/i;
const CANDIDATE_OFFICE = /Candidate|Nominee/i;
const FORMER_OFFICE = /^Former\b/i;
const FLOOR_OFFICE = /Utah State (Representative|Senator)|Utah (Senate President|House Speaker)/i;
function classify(pid, p, ctx) {
  const office = String(p.office || "");
  const note = ctx.notes[pid] || null;
  // E FIRST, AND ON THE PACK RATHER THAN THE OFFICE STRING. A file the database
  // holds acts for is not empty, whatever the Utah index can see of it, and that
  // has to outrank every label below — including a "Former" prefix, which is a
  // tenure fact and not a statement about the record.
  if (ctx.pack && (ctx.pack.get(pid) || []).length) return FORMER_OFFICE.test(office) ? "E/D" : "E";
  if (FEDERAL_OFFICE.test(office) && !CANDIDATE_OFFICE.test(office)) return "E";
  if (ctx.identity.has(pid)) return "D";
  if (note && note.reason === "left_before") return "D";
  if (FORMER_OFFICE.test(office)) return "D";
  if (CANDIDATE_OFFICE.test(office)) return "A";
  if (note && note.reason === "seated_after") return "B";
  if (note && note.reason === "candidate_only") return "A";
  if (FLOOR_OFFICE.test(office)) {
    // A sitting floor member with an empty lane and no reviewed note is either
    // seated after the sessions on file or held no admitted vote; the roster's
    // own termStart is the only fact here that can tell them apart.
    const ts = String(p.termStart || "");
    if (/^20(2[6-9]|[3-9])/.test(ts)) return "B";
    return "B?";
  }
  return "C";
}
// The identity pile, from the reviewed findings already in the repo — the alias
// table's retirements and scripts/UTAH-LAUNCH-CLEANUP-TRACKER.md's three
// roster records that name somebody else's district.
function identityPile() {
  const out = new Map();
  const A = HAS("db/vr-pid-aliases.json") ? J("db/vr-pid-aliases.json") : { aliases: {} };
  for (const [from, to] of Object.entries(A.aliases || {})) out.set(from, `retired id → ${to}`);
  for (const [pid, why] of [
    ["fgibson", "roster row reads District 60 — Grant Pace's seat"],
    ["jknotts", "name looks like a garbled John Knotwell; row reads District 65 — Doug Welton's seat"],
    ["jdraxler", "roster row reads District 3; left the Legislature in 2017"],
  ]) out.set(pid, why);
  return out;
}

// ── the run ─────────────────────────────────────────────────────────────────
const win = boot();
if (win.__err.length) { console.error("engine did not load cleanly:", win.__err.join(" | ")); process.exit(2); }
const CS = win.PDXConsistency, WA = win.PDXWordAction, D = win.CMP_DATA || {};
for (const [k, v] of [["PDXConsistency.formalPatternIndex.shape", CS && CS.formalPatternIndex && CS.formalPatternIndex.shape],
                      ["PDXWordAction.saidLeadApplies", WA && WA.saidLeadApplies],
                      ["PDXWordAction.saidRowSet", WA && WA.saidRowSet]]) {
  if (typeof v !== "function") { console.error(`STALE HARNESS — ${k} is gone`); process.exit(2); }
}

const lane = buildLane();
const SCOPE = scope(win);
const notes = (HAS("db/vr-utah-empty-file-notes.json") ? J("db/vr-utah-empty-file-notes.json") : { notes: {} }).notes || {};
const identity = identityPile();
const pack = await livePacks([...new Set([...SCOPE.keys(), ...Object.keys(D)])]);

const SEAT_DISTRICT = /(?:District|Dist\.?|Precinct|UT-)\s*([0-9]+[A-Za-z]?)|\bAt-Large[^,)]*/i;
const districtOf = (p) => {
  if (p.district) return String(p.district);
  const m = SEAT_DISTRICT.exec(String(p.state || "") + " " + String(p.office || ""));
  return m ? (m[1] ? m[1] : m[0].trim()) : "";
};

const rows = [];
for (const pid of [...SCOPE.keys()].sort()) {
  const p = Object.assign({ id: pid }, D[pid] || {});
  const person = D[pid] ? p : null;
  const items = lane.get(pid) || [];

  // ── READ ONE: the Utah index, which is what "Utah first" means ────────────
  win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(items)));
  const sh = CS.formalPatternIndex.shape(pid) || {};
  const readable = (sh.read || 0) + (sh.judged || 0) + (sh.characterised || 0);
  const set = WA.saidRowSet(pid) || { cited: 0, stated: 0 };
  const said = !!WA.saidLeadApplies(pid, person);

  // ── READ TWO: the pack a browser actually receives ────────────────────────
  // Same gate, same person, the payload the API answers with. Where the two
  // reads disagree, the disagreement IS the finding: the file is not empty and
  // the Utah index is the only thing that thought it was.
  const live = pack ? (pack.get(pid) || []) : null;
  let liveShape = null, liveSaid = said, liveReadable = readable;
  if (live && live.length) {
    win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(live)));
    liveShape = CS.formalPatternIndex.shape(pid) || {};
    liveReadable = (liveShape.read || 0) + (liveShape.judged || 0) + (liveShape.characterised || 0);
    liveSaid = !!WA.saidLeadApplies(pid, person);
    win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(items)));   // put the Utah read back
  }

  rows.push({
    pid, why: SCOPE.get(pid), onRoster: !!D[pid],
    name: p.name || "", office: p.office || "", seat: p.state || "", district: districtOf(p),
    party: p.party || "", termStart: p.termStart || "", termEnd: p.termEnd || "",
    laneActs: items.length, read: sh.read || 0, judged: sh.judged || 0,
    characterised: sh.characterised || 0, issues: sh.issues || 0, readable,
    cited: set.cited || 0, stated: set.stated || 0, said,
    indexActs: (win.PDXFormalIndex && win.PDXFormalIndex.acts(pid)) || 0,
    note: notes[pid] ? notes[pid].reason : "",
    packActs: live ? live.length : 0,
    liveIssues: liveShape ? (liveShape.issues || 0) : (sh.issues || 0),
    liveReadable, liveSaid,
    identity: identity.get(pid) || "",
  });
}
for (const r of rows) {
  r.empty = r.readable === 0;
  r.liveEmpty = r.liveReadable === 0;
  r.class = r.empty ? classify(r.pid, D[r.pid] || {}, { notes, identity, pack }) : "—";
}

const empties = rows.filter((r) => r.empty);
const out = {
  scope: { pids: rows.length, empty: empties.length, dbRead: !!pack },
  rows: ONLY ? empties.filter((r) => r.class.startsWith(ONLY)) : rows,
  flags: {
    // The two call-outs the census owes, computed rather than asserted.
    leadsWithRecordEmptyBriefDespiteWords: empties
      .filter((r) => /^[ABC]/.test(r.class) && r.cited >= 1 && !r.liveSaid)
      .map((r) => ({ pid: r.pid, cls: r.class, cited: r.cited, indexActs: r.indexActs, packActs: r.packActs })),
    identityProblemWithSaidBrief: empties
      .filter((r) => /^D/.test(r.class) && r.liveSaid)
      .map((r) => ({ pid: r.pid, name: r.name, office: r.office, cited: r.cited, identity: r.identity })),
    emptyOnlyToTheUtahIndex: empties
      .filter((r) => !r.liveEmpty)
      .map((r) => ({ pid: r.pid, office: r.office, packActs: r.packActs, liveIssues: r.liveIssues,
                     saidInUtahRead: r.said, saidLive: r.liveSaid })),
    saidBriefLive: empties.filter((r) => r.liveSaid).length,
    wordPassCandidates: empties
      .filter((r) => !/^[DE]/.test(r.class) && r.cited === 0 && r.onRoster && r.liveEmpty)
      .map((r) => ({ pid: r.pid, name: r.name, office: r.office, seat: r.seat, stated: r.stated })),
  },
};
if (AS_JSON) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }

const pad = (s, n) => String(s == null ? "" : s).slice(0, n).padEnd(n);
console.log();
console.log(`  SAID-BRIEF CENSUS — ${rows.length} Utah-scope roster ids · ${empties.length} empty formal lane` +
  (pack ? " · federal pack read from the branch DB" : " · no DB read"));
console.log();
console.log("  cls  pid                     office                          seat                  cited  live  laneActs idx  pack");
for (const r of (ONLY ? empties.filter((x) => x.class.startsWith(ONLY)) : empties)) {
  console.log(`  ${pad(r.class, 4)} ${pad(r.pid, 23)} ${pad(r.office, 31)} ${pad(r.seat, 21)} ` +
    `${String(r.cited).padStart(5)}  ${r.liveSaid ? "y   " : "n   "} ${String(r.laneActs).padStart(8)} ${String(r.indexActs).padStart(4)} ${String(r.packActs).padStart(5)}`);
}
console.log();
console.log(`  FLAG · A/B/C with cited ≥ 1 still on the record-empty brief: ${out.flags.leadsWithRecordEmptyBriefDespiteWords.length}`);
for (const f of out.flags.leadsWithRecordEmptyBriefDespiteWords) console.log(`         ${f.pid} (${f.cls}) cited ${f.cited}, index acts ${f.indexActs}, pack acts ${f.packActs}`);
console.log(`  FLAG · D (identity) already holding a SAID brief: ${out.flags.identityProblemWithSaidBrief.length}`);
for (const f of out.flags.identityProblemWithSaidBrief) console.log(`         ${f.pid} cited ${f.cited} — ${f.identity}`);
console.log(`  FLAG · empty to the Utah index, NOT empty live: ${out.flags.emptyOnlyToTheUtahIndex.length}`);
for (const f of out.flags.emptyOnlyToTheUtahIndex) console.log(`         ${f.pid} — ${f.packActs} pack acts, ${f.liveIssues} issue rows · SAID in the Utah read ${f.saidInUtahRead ? "y" : "n"} → live ${f.saidLive ? "y" : "n"}`);
console.log(`  SAID brief live on ${out.flags.saidBriefLive} of ${empties.length} files the Utah index calls empty`);
console.log(`  zero-formal / zero-cited, on the roster, not D or E: ${out.flags.wordPassCandidates.length}`);
console.log();
