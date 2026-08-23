#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — PRIMARY-LANE AUDIT (read-only)
// ─────────────────────────────────────────────────────────────────────────────
// THE QUESTION. _recordDirectionIndex() refuses to characterise a (member, issue)
// row once it is deep and one-sided unless at least one judged item was
// primary-mapped (`_RD_MIN_PRIMARY = 1`, suppressed = 'no_primary'). On some issues
// EVERY is_primary row in vr_measure_issues sits on an instrument a member cannot
// hold — an executive order, a proclamation, a memorandum, a court case, or a
// measure with no roll call and no member position at all. On those issues the
// refusal is STRUCTURAL: no amount of member voting can ever clear the floor, so
// more same-way roll calls keep yielding "No clear pattern yet". That is the
// S. 2 / border_security failure mode, and this script finds every other instance
// of it.
//
//   node scripts/vr-audit-primary-lane-aug2026.mjs              # the two deliverables
//   node scripts/vr-audit-primary-lane-aug2026.mjs --issue KEY  # one issue, in full
//   node scripts/vr-audit-primary-lane-aug2026.mjs --json       # machine-readable
//
// Needs NETLIFY_DB_URL. READ-ONLY: this script issues SELECTs and writes no file.
//
// THE DERIVATION IS NOT REIMPLEMENTED HERE
// stance-helpers.js is loaded through the same sandbox the test suite boots and
// _recordDirectionIndex() is CALLED, on item objects shaped exactly as
// netlify/lib/vr-pack.ts packs them. An audit that re-derived "blocked" in its own
// arithmetic would be measuring its own opinion of the floor and would keep
// reporting after the shipped rule moved underneath it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { loadEngine } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argOf = (n) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 ? process.argv[i + 1] || "" : "";
};
const ONE_ISSUE = argOf("issue");
const AS_JSON = process.argv.includes("--json");
const TOP_N = Number(argOf("top") || 10);
// --simulate "S.J.Res. 18:econ_corp_account,S. 1383:voting_access"
// Read-only what-if: flips is_primary on those mappings IN MEMORY ONLY, re-runs the
// shipped derivation, and prints the drift the way the S. 2 migration states it.
const SIM = argOf("simulate");

// ── the shipped engine ───────────────────────────────────────────────────────
const win = loadEngine(ROOT);
const rdIndex = win._recordDirectionIndex;
if (typeof rdIndex !== "function") throw new Error("_recordDirectionIndex unavailable after loadEngine()");
const ISSUE_MAP = win.ISSUE_MAP || {};
const CMP = win.CMP_DATA || {};
const coreOf = typeof win.coreIssueForKey === "function" ? win.coreIssueForKey : () => null;

// ── the floors, as shipped ───────────────────────────────────────────────────
// Three of the five are published on window. _RD_MIN_PRIMARY and _RD_THIN_MIN are
// not, so they are read out of the source text AND confirmed behaviourally below —
// a number quoted from a comment is a claim; a number a synthetic record proves is
// a fact. The audit does not propose lowering any of them.
const SRC = readFileSync(join(ROOT, "stance-helpers.js"), "utf8");
const litOf = (name) => {
  const m = SRC.match(new RegExp(`var ${name}\\s*=\\s*([0-9.\\/ ]+);`));
  if (!m) throw new Error(`${name} not found in stance-helpers.js`);
  return Number(eval(m[1])); // a numeric literal or a ratio, from our own source file
};
const FLOORS = {
  _RD_MIN_JUDGED: win._PDX_RD_MIN_JUDGED,
  _RD_DOMINANCE: win._PDX_RD_DOMINANCE,
  _RD_MEMBER_FLOOR: win._PDX_RD_MEMBER_FLOOR,
  _RD_SPLIT_MIN_JUDGED: win._PDX_RD_SPLIT_MIN_JUDGED,
  _RD_SPLIT_MIN_SIDE: win._PDX_RD_SPLIT_MIN_SIDE,
  _RD_MIN_PRIMARY: litOf("_RD_MIN_PRIMARY"),
  _RD_THIN_MIN: litOf("_RD_THIN_MIN"),
  _RECORD_PROCEDURAL_FACTOR: litOf("_RECORD_PROCEDURAL_FACTOR"),
};

// Behavioural confirmation of the two unpublished floors and of the gate itself.
// A directional key with a real pole is required, so the probe borrows one.
const PROBE_KEY = "border_security";
const probeItem = (isPrimary) => ({
  kind: "vote", position: "yea", date: "2025-01-01", isProcedural: false, advanceInverted: false,
  issues: [{ issueKey: PROBE_KEY, weight: 100, isPrimary, supportMeaning: "yea_supports" }],
});
const probe = (n, primaries) => rdIndex(PROBE_KEY,
  Array.from({ length: n }, (_, i) => probeItem(i < primaries)),
  { memberRecordCount: 999 });
const PROOF = {
  "4 judged, 0 primary, uniform": probe(4, 0),
  "4 judged, 1 primary, uniform": probe(4, 1),
  "3 judged, 0 primary, uniform": probe(3, 0),
};
if (PROOF["4 judged, 0 primary, uniform"].suppressed !== "no_primary")
  throw new Error("the no_primary gate did not fire on a 4-item all-incidental record — audit assumptions are stale");
if (PROOF["4 judged, 1 primary, uniform"].token !== "record_direction")
  throw new Error("a single primary did not unlock a 4-item record — _RD_MIN_PRIMARY is not 1");

// ── live DB ──────────────────────────────────────────────────────────────────
const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const q = async (sql) => (await client.query(sql)).rows;

const measures = new Map((await q(`
  SELECT id, measure_type, congress, chamber, number, title, status, sponsor_id
    FROM vr_measures`)).map((m) => [m.id, m]));
const mapRows = await q(`
  SELECT measure_id, issue_key, weight, is_primary, support_meaning, rationale
    FROM vr_measure_issues`);
const rolls = new Map((await q(`
  SELECT id, measure_id, chamber, congress, session, roll_number, vote_date, question,
         action_type, source_url
    FROM vr_rollcalls`)).map((r) => [r.id, r]));
const votes = await q(`SELECT rollcall_id, politician_id, position FROM vr_member_votes`);
const positions = await q(`
  SELECT measure_id, politician_id, action_type, supports, acted_at, source_url
    FROM vr_positions`);
await client.end();

// ── mappings, filtered and ordered exactly as vr-pack.ts does ────────────────
const ALLOWED = new Set(JSON.parse(readFileSync(join(ROOT, "db", "issue-keys.json"), "utf8")).keys);
const issuesByMeasure = new Map();
const offAllowList = [];
for (const r of mapRows) {
  if (!ALLOWED.has(r.issue_key)) { offAllowList.push(r); continue; }
  const list = issuesByMeasure.get(r.measure_id) || [];
  list.push({
    issueKey: r.issue_key, weight: Number(r.weight), isPrimary: !!r.is_primary,
    supportMeaning: r.support_meaning, rationale: r.rationale || "",
  });
  issuesByMeasure.set(r.measure_id, list);
}
for (const l of issuesByMeasure.values()) {
  l.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight);
}

// ── LANE: can a member hold this instrument at all? ──────────────────────────
// Not a column — there is no `lane` on vr_measures — so it is derived from the two
// ways an item reaches a member's pack in vr-pack.ts: a roll call they voted on, or
// a vr_positions row (co-sponsorship / amicus) in their name. Everything else is
// off the member lane no matter how the mapping is weighted.
//   exec        — executive_order | proclamation | memorandum | executive_action.
//                 The exec lane proper; _stDirRaw returns null for it and members
//                 cast no ballot on it.
//   court       — litigation. A case, not a vote.
//   orphan      — a legislative instrument with no roll call carrying a member vote
//                 and no member position. Reachable in principle, unreachable today.
//   member      — at least one member actually holds it.
const EXEC_TYPES = new Set(["executive_order", "proclamation", "memorandum", "executive_action"]);
const rollcallsByMeasure = new Map();
for (const r of rolls.values()) {
  const l = rollcallsByMeasure.get(r.measure_id) || [];
  l.push(r); rollcallsByMeasure.set(r.measure_id, l);
}
const votedRollcalls = new Set(votes.map((v) => v.rollcall_id));
const measureHasMemberVote = new Set();
for (const v of votes) { const rc = rolls.get(v.rollcall_id); if (rc) measureHasMemberVote.add(rc.measure_id); }
const measureHasPosition = new Set(positions.map((p) => p.measure_id));
function laneOf(measureId) {
  const m = measures.get(measureId);
  if (!m) return "missing";
  if (EXEC_TYPES.has(m.measure_type)) return "exec";
  if (m.measure_type === "litigation" || m.chamber === "court") return "court";
  if (measureHasMemberVote.has(measureId) || measureHasPosition.has(measureId)) return "member";
  return "orphan";
}
const MEMBER_LANE = (l) => l === "member";

// ── items, packed exactly as vr-pack.ts packs them ───────────────────────────
const PROCEDURAL_TYPES = ["procedural", "motion"];
const yeaBlocksMeasure = (qs) => {
  const s = String(qs || "").toLowerCase();
  return s.indexOf("recommit") !== -1 || s.indexOf("to commit") !== -1 || s.indexOf("to table") !== -1;
};
const byMember = new Map();
const push = (pid, it) => { const l = byMember.get(pid) || []; l.push(it); byMember.set(pid, l); };
for (const v of votes) {
  const rc = rolls.get(v.rollcall_id);
  if (!rc || !rc.source_url) continue; // verifiability guard, quoted from vr-pack.ts
  const m = measures.get(rc.measure_id);
  push(v.politician_id, {
    kind: "vote", measureId: rc.measure_id, number: m ? m.number : null, title: m ? m.title : "",
    date: rc.vote_date ? new Date(rc.vote_date).toISOString() : null,
    action: rc.question, actionType: rc.action_type, position: v.position,
    isProcedural: PROCEDURAL_TYPES.includes(rc.action_type),
    advanceInverted: yeaBlocksMeasure(rc.question),
    rollNumber: rc.roll_number, congress: rc.congress, chamber: rc.chamber,
    issues: issuesByMeasure.get(rc.measure_id) || [],
  });
}
for (const p of positions) {
  if (!p.source_url) continue;
  const m = measures.get(p.measure_id);
  push(p.politician_id, {
    kind: "position", measureId: p.measure_id, number: m ? m.number : null, title: m ? m.title : "",
    date: p.acted_at ? new Date(p.acted_at).toISOString() : null,
    action: p.action_type, actionType: p.action_type, position: p.action_type,
    supports: p.supports, isProcedural: false, advanceInverted: false,
    issues: issuesByMeasure.get(p.measure_id) || [],
  });
}
// Newest first — the pack's own ordering, and the ordering the cap would apply.
for (const l of byMember.values()) l.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

// MEMBERS, not officeholders generally: someone who has cast at least one recorded
// vote. A president with exec-lane positions is not blocked by a member floor.
const MEMBERS = [...byMember.keys()].filter((pid) => (byMember.get(pid) || []).some((i) => i.kind === "vote")).sort();

// ── run every (member, issue) pair through the shipped index ─────────────────
const mappedCount = (items) => items.filter((i) => i.issues.length).length;
const perIssue = new Map();
const rowFor = (k) => {
  if (!perIssue.has(k)) perIssue.set(k, {
    key: k, label: (ISSUE_MAP[k] && ISSUE_MAP[k].label) || k, core: coreOf(k),
    inIssueMap: !!ISSUE_MAP[k],
    primaries: [], primaryMember: 0, primaryExec: 0, primaryCourt: 0, primaryOrphan: 0,
    mappings: 0, memberMappings: 0,
    held: 0, judgedDeep: 0, blocked: 0, blockedSplit: 0, readable: 0, direction: 0, uniformThin: 0,
    thin: 0, suppressedOther: 0, blockedPids: [], readablePids: [],
    blockedMeasureSpread: [], blockedProcShare: [], blockedMeasureHits: new Map(),
  });
  return perIssue.get(k);
};
// Mapping inventory first — an issue with primaries but no member yet still belongs
// in the table, and an issue nobody has reached is a different finding from a
// blocked one.
for (const [mid, list] of issuesByMeasure) {
  const lane = laneOf(mid);
  for (const m of list) {
    const row = rowFor(m.issueKey);
    row.mappings++;
    if (MEMBER_LANE(lane)) row.memberMappings++;
    if (!m.isPrimary) continue;
    row.primaries.push({ measureId: mid, lane, ...m, measure: measures.get(mid) || null });
    if (lane === "member") row.primaryMember++;
    else if (lane === "exec") row.primaryExec++;
    else if (lane === "court") row.primaryCourt++;
    else row.primaryOrphan++;
  }
}
const memberIssueRows = [];
// Baseline read per (member, issue), kept so --simulate can diff a hypothetical
// is_primary flip against what ships today. Never written anywhere.
const BASE = new Map();
for (const pid of MEMBERS) {
  const items = byMember.get(pid);
  const held = mappedCount(items);
  const keys = [...new Set(items.flatMap((i) => i.issues.map((m) => m.issueKey)))];
  for (const k of keys) {
    const on = items.filter((i) => i.issues.some((m) => m.issueKey === k));
    const idx = rdIndex(k, on, { memberRecordCount: held });
    BASE.set(pid + "|" + k, { token: idx.token, suppressed: idx.suppressed || null, lead: idx.lead || null });
    const row = rowFor(k);
    row.held++;
    if (idx.judged >= FLOORS._RD_MIN_JUDGED) row.judgedDeep++;
    if (idx.suppressed === "no_primary") {
      row.blocked++; row.blockedPids.push(pid);
      // WHAT THE BLOCKED ROW IS MADE OF. A promote only earns its keep if the rows it
      // unlocks rest on more than one instrument: four roll calls on two bills is a
      // "direction" read off two bills, and the reader cannot tell that from the chip.
      // Counted here so the recommendation can be refused on this ground alone.
      const behind = new Set(on.filter((i) => i.issues.some((m) => m.issueKey === k)).map((i) => i.measureId));
      const proc = on.filter((i) => i.isProcedural).length;
      row.blockedMeasureSpread.push(behind.size);
      row.blockedProcShare.push(on.length ? proc / on.length : 0);
      for (const mid of behind) row.blockedMeasureHits.set(mid, (row.blockedMeasureHits.get(mid) || 0) + 1);
      memberIssueRows.push({ pid, key: k, judged: idx.judged, advances: idx.advances, opposes: idx.opposes, measures: behind.size });
    } else if (idx.token === "record_split" && idx.judged >= FLOORS._RD_SPLIT_MIN_JUDGED &&
               Math.min(idx.advances, idx.opposes) >= FLOORS._RD_SPLIT_MIN_SIDE && idx.primary < FLOORS._RD_MIN_PRIMARY) {
      row.blockedSplit++;                     // counts withheld, but no direction was on offer
    } else if (idx.characterised) {
      row.readable++; row.readablePids.push(pid);
      if (idx.token === "record_direction") row.direction++; else row.uniformThin++;
    } else if (idx.token === "record_thin" || idx.token === "record_none") {
      row.thin++;
      if (idx.suppressed && idx.suppressed !== "no_primary") row.suppressedOther++;
    }
  }
}

// ── who the blocked members are ──────────────────────────────────────────────
// CMP_DATA carries the state's full name ("Utah"), not its postal code.
const stateOf = (pid) => (CMP[pid] && (CMP[pid].state || "")) || "";
const isUtah = (pid) => /utah/i.test(stateOf(pid));
const nameOf = (pid) => (CMP[pid] && CMP[pid].name) || pid;
const officeOf = (pid) => (CMP[pid] && [CMP[pid].office, CMP[pid].district].filter(Boolean).join(" ")) || "";
for (const row of perIssue.values()) {
  const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
  row.medMeasuresBehind = med(row.blockedMeasureSpread);
  row.maxMeasuresBehind = row.blockedMeasureSpread.length ? Math.max(...row.blockedMeasureSpread) : 0;
  row.medProcShare = med(row.blockedProcShare);
  row.blockedUtah = row.blockedPids.filter(isUtah).length;
  row.blockedUtahNames = row.blockedPids.filter(isUtah).map(nameOf);
  row.blockedUnknownPid = row.blockedPids.filter((p) => !CMP[p]).length;
}

// ── the best legislative candidate on a blocked issue ────────────────────────
// Ranked, never chosen: the script surfaces the highest-weight member-lane mappings
// that already exist and how much member evidence each carries. Which of them is
// "the instrument is the issue" is an editorial judgement and is made in prose, not
// by this sort. Procedure, Speaker elections and coverage vehicles are FLAGGED here
// so a reader cannot mistake a high weight for a recommendation.
const PROCEDURE_RE = /\b(speaker|adjourn|previous question|rule providing|providing for consideration|quorum|journal|motion to (recommit|table|proceed|discharge)|point of order|closed rule|structured rule|h\.?res\.?\s*\d+)/i;
const measureVoteCount = new Map();
for (const v of votes) { const rc = rolls.get(v.rollcall_id); if (!rc) continue;
  measureVoteCount.set(rc.measure_id, (measureVoteCount.get(rc.measure_id) || 0) + 1); }
function candidatesFor(key) {
  const out = [];
  for (const [mid, list] of issuesByMeasure) {
    const m = list.find((x) => x.issueKey === key);
    if (!m || m.isPrimary) continue;
    const lane = laneOf(mid);
    if (!MEMBER_LANE(lane)) continue;
    const meas = measures.get(mid);
    const rcs = rollcallsByMeasure.get(mid) || [];
    const subst = rcs.filter((r) => !PROCEDURAL_TYPES.includes(r.action_type));
    out.push({
      measureId: mid, number: meas ? meas.number : null, title: meas ? meas.title : "",
      type: meas ? meas.measure_type : "", congress: meas ? meas.congress : null,
      status: meas ? meas.status : "", weight: m.weight, supportMeaning: m.supportMeaning,
      rationale: m.rationale || "", mappingCount: list.length,
      rollcalls: rcs.length, substantiveRollcalls: subst.length,
      memberVotes: measureVoteCount.get(mid) || 0,
      // the three shapes the brief refuses outright
      looksProcedural: rcs.length > 0 && subst.length === 0 ||
        PROCEDURE_RE.test(String(meas ? meas.title : "")),
      isAmendment: (meas ? meas.measure_type : "") === "amendment",
      omnibusBreadth: list.length,
    });
  }
  return out.sort((a, b) => b.weight - a.weight || b.memberVotes - a.memberVotes);
}

// ── output ───────────────────────────────────────────────────────────────────
const rows = [...perIssue.values()]
  .filter((r) => (ONE_ISSUE ? r.key === ONE_ISSUE : true))
  .sort((a, b) => b.blocked - a.blocked || b.judgedDeep - a.judgedDeep || a.key.localeCompare(b.key));

if (AS_JSON) {
  console.log(JSON.stringify({
    floors: FLOORS, proof: PROOF,
    corpus: { measures: measures.size, mappings: mapRows.length, offAllowList: offAllowList.length,
              rollcalls: rolls.size, memberVotes: votes.length, positions: positions.length, members: MEMBERS.length },
    issues: rows.map((r) => ({ ...r, blockedMeasureHits: [...r.blockedMeasureHits], primaries: r.primaries.map((p) => ({ ...p, measure: undefined })),
                               candidates: r.blocked ? candidatesFor(r.key).slice(0, 8) : [] })),
  }, null, 2));
} else {
  const pad = (s, n) => String(s == null ? "" : s).padEnd(n).slice(0, n);
  const num = (s, n) => String(s == null ? "" : s).padStart(n);
  console.log("── FLOORS, AS SHIPPED (not proposed for change) ─────────────────────────");
  for (const [k, v] of Object.entries(FLOORS)) console.log(`  ${pad(k, 28)} ${v}`);
  console.log("  behavioural proof:");
  for (const [k, v] of Object.entries(PROOF)) console.log(`    ${pad(k, 32)} → ${v.token}${v.suppressed ? " / " + v.suppressed : ""}`);
  console.log("\n── CORPUS ───────────────────────────────────────────────────────────────");
  console.log(`  ${measures.size} measures · ${mapRows.length} mappings (${offAllowList.length} off the allow-list, dropped)`);
  console.log(`  ${rolls.size} roll calls (${votedRollcalls.size} with member votes) · ${votes.length} member votes · ${positions.length} positions`);
  console.log(`  ${MEMBERS.length} members hold at least one recorded vote`);
  console.log("\n── ISSUE → PRIMARIES BY LANE → MEMBERS BLOCKED ──────────────────────────");
  console.log(`  ${pad("issue key", 26)}${num("prim", 5)}${num("leg", 5)}${num("exec", 5)}${num("crt", 4)}${num("orph", 5)}${num("held", 6)}${num("deep", 6)}${num("BLKD", 6)}${num("dir", 5)}${num("run", 5)}${num("UT", 4)}  core`);
  for (const r of rows) {
    if (!ONE_ISSUE && !r.blocked && !r.primaries.length && !r.held) continue;
    console.log(`  ${pad(r.key, 26)}${num(r.primaries.length, 5)}${num(r.primaryMember, 5)}${num(r.primaryExec, 5)}${num(r.primaryCourt, 4)}${num(r.primaryOrphan, 5)}${num(r.held, 6)}${num(r.judgedDeep, 6)}${num(r.blocked, 6)}${num(r.direction, 5)}${num(r.uniformThin, 5)}${num(r.blockedUtah, 4)}  ${r.core ? r.core.label || r.core.id || "" : (r.inIssueMap ? "—" : "NOT IN ISSUE_MAP")}`);
  }
  const blockedRows = rows.filter((r) => r.blocked > 0);
  console.log(`\n  ${blockedRows.length} issues block at least one member; ${blockedRows.reduce((n, r) => n + r.blocked, 0)} (member, issue) rows refused for want of a primary.`);

  console.log("\n── TOP BLOCKED ISSUES, IN FULL ──────────────────────────────────────────");
  for (const r of (ONE_ISSUE ? rows : blockedRows.slice(0, TOP_N))) {
    console.log(`\n▌ ${r.key} — ${r.label}`);
    console.log(`  blocked ${r.blocked} members (${r.blockedUtah} UT${r.blockedUtahNames && r.blockedUtahNames.length ? ": " + r.blockedUtahNames.join(", ") : ""}) · readable ${r.readable} (${r.direction} direction, ${r.uniformThin} uniform-thin run) · deep rows ${r.judgedDeep} · split counts withheld ${r.blockedSplit}`);
    console.log(`  evidence behind a blocked row: ${r.medMeasuresBehind} distinct measures (median; max ${r.maxMeasuresBehind}) · ${Math.round(r.medProcShare * 100)}% procedural (median)`);
    const hits = [...r.blockedMeasureHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([mid, n]) => `${(measures.get(mid) || {}).number || "#" + mid}×${n}`);
    if (hits.length) console.log(`  instruments carrying the blocked rows: ${hits.join(", ")}`);
    console.log(`  primaries: ${r.primaries.length} total — ${r.primaryMember} member-lane, ${r.primaryExec} exec, ${r.primaryCourt} court, ${r.primaryOrphan} orphan`);
    for (const p of r.primaries) {
      const m = p.measure || {};
      console.log(`    · [${pad(p.lane, 6)}] #${p.measureId} ${pad(m.number || m.measure_type || "?", 16)} w${num(p.weight, 3)} ${p.supportMeaning}`);
      console.log(`        ${String(m.title || "").slice(0, 110)}`);
      if (p.rationale) console.log(`        “${p.rationale.slice(0, 180)}${p.rationale.length > 180 ? "…" : ""}”`);
    }
    const cands = candidatesFor(r.key).slice(0, ONE_ISSUE ? 40 : 6);
    console.log(`  highest-weight NON-primary member-lane mappings already on file:`);
    if (!cands.length) console.log("    (none — nothing on the member lane carries this key)");
    for (const c of cands) {
      const flags = [c.looksProcedural ? "PROCEDURE" : "", c.isAmendment ? "amendment" : "",
                     c.omnibusBreadth >= 6 ? `omnibus:${c.omnibusBreadth}keys` : ""].filter(Boolean).join(" ");
      console.log(`    · w${num(c.weight, 3)} ${pad(c.number || "?", 16)} ${pad(c.type, 11)} rc:${num(c.substantiveRollcalls, 2)}/${c.rollcalls} votes:${num(c.memberVotes, 5)} ${flags}`);
      console.log(`        ${String(c.title || "").slice(0, 110)}`);
      if (c.rationale) console.log(`        “${c.rationale.slice(0, 200)}${c.rationale.length > 200 ? "…" : ""}”`);
    }
    const sample = r.blockedPids.slice(0, 6).map((p) => `${nameOf(p)}${stateOf(p) ? " (" + stateOf(p) + ")" : ""}`);
    if (sample.length) console.log(`  blocked, e.g.: ${sample.join(", ")}${r.blocked > sample.length ? ` … +${r.blocked - sample.length}` : ""}`);
  }
}


// ── --simulate: measured drift of a hypothetical promote ─────────────────────
// Nothing is written. The flip happens on a copy of each item's `issues` array and
// the shipped _recordDirectionIndex() is re-run over it, so the numbers below are
// what the engine would actually do — not an estimate of what it might do.
if (SIM) {
  const targets = SIM.split(",").map((t) => t.trim()).filter(Boolean).map((t) => {
    const i = t.lastIndexOf(":");
    return { number: t.slice(0, i).trim(), key: t.slice(i + 1).trim() };
  });
  const flips = new Set();
  console.log("\n── SIMULATED PROMOTE (in memory; nothing written) ───────────────────────");
  for (const t of targets) {
    const hits = [...measures.values()].filter((m) => m.number === t.number);
    if (!hits.length) { console.log(`  !! no measure numbered ${t.number}`); continue; }
    for (const m of hits) {
      const map = (issuesByMeasure.get(m.id) || []).find((x) => x.issueKey === t.key);
      if (!map) { console.log(`  !! #${m.id} ${t.number} carries no ${t.key} mapping`); continue; }
      if (map.isPrimary) { console.log(`  -- #${m.id} ${t.number} ${t.key} is already primary`); continue; }
      flips.add(m.id + "|" + t.key);
      console.log(`  flip  #${m.id} ${t.number.padEnd(16)} ${t.key.padEnd(20)} w${map.weight} ${map.supportMeaning} → is_primary = true`);
    }
  }
  // Sweep EVERY issue key, not just the ones named. The index is computed per key so a
  // flip cannot mathematically reach another key — but "cannot" is a claim, and the
  // point of a drift section is to measure it. Non-target keys print only if they move.
  const targetKeys = new Set(targets.map((t) => t.key));
  const allKeys = [...perIssue.keys()].sort();
  let collateral = 0;
  for (const k of allKeys) {
    let gained = 0, lostRead = 0, changedDir = 0, toAdvance = 0, toOppose = 0, stillBlocked = 0, splitOpened = 0;
    const gainedUtah = [];
    for (const pid of MEMBERS) {
      const before = BASE.get(pid + "|" + k);
      if (!before) continue;
      const items = byMember.get(pid);
      const held = mappedCount(items);
      const on = items.filter((i) => i.issues.some((m) => m.issueKey === k)).map((i) => ({
        ...i,
        issues: i.issues.map((m) => (flips.has(i.measureId + "|" + m.issueKey) ? { ...m, isPrimary: true } : m)),
      }));
      const after = rdIndex(k, on, { memberRecordCount: held });
      const wasRead = before.token === "record_direction" || before.token === "record_uniform_thin";
      const nowRead = after.token === "record_direction" || after.token === "record_uniform_thin";
      if (before.suppressed === "no_primary" && after.suppressed === "no_primary") stillBlocked++;
      if (!wasRead && nowRead) {
        gained++;
        if (after.lead === "opposes") toOppose++; else toAdvance++;
        if (isUtah(pid)) gainedUtah.push(nameOf(pid));
      }
      if (wasRead && !nowRead) lostRead++;
      // record_split (counts withheld) → record_split_deep (counts shown) is the same
      // flag doing the same work on a mixed record; counted separately because it is
      // not a direction, it is a disclosure.
      if (before.token === "record_split" && after.token === "record_split_deep") splitOpened++;
      if (wasRead && nowRead && before.lead !== after.lead) changedDir++;
    }
    const moved = gained || lostRead || changedDir || splitOpened;
    if (!targetKeys.has(k)) {
      if (moved) { collateral++; console.log(`  !! COLLATERAL ${k}: +${gained} direction · ${lostRead} lost · ${changedDir} flipped · ${splitOpened} split opened`); }
      continue;
    }
    console.log(`  ${k}: +${gained} members gain a direction (${toAdvance} advanced-side, ${toOppose} opposed-side) · ` +
                `${lostRead} lose a read · ${changedDir} change direction · ${splitOpened} split counts open up · ${stillBlocked} still no_primary` +
                (gainedUtah.length ? ` · UT gained: ${gainedUtah.join(", ")}` : ""));
  }
  console.log(`  swept ${allKeys.length} issue keys · ${collateral} non-target keys moved` +
              (collateral ? "  ← INVESTIGATE" : "  (none, as the per-key index requires)"));
}
