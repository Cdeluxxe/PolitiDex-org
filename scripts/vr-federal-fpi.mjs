#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — FEDERAL FORMAL PATTERN INDEX, MEASURED (read-only)
// ─────────────────────────────────────────────────────────────────────────────
// THE QUESTION, ASKED OF THE FEDERAL LANE THIS TIME. scripts/vr-utah-fpi.mjs
// answers "how many members hold nothing, hold material the engine will not
// characterise, and hold a record that reads" for the Utah state lane, off the
// shipped seeds. The federal lane's record does not live in a seed — it lives in
// the database behind /api/voting-record — so the same triple could not be
// quoted for a federal wave without a harness that reads there. This is that
// harness, and it is a deliberate transcript of the Utah one: same three bands,
// same derivation, same refusal to define a threshold of its own.
//
//   node scripts/vr-federal-fpi.mjs                      # Utah federal set
//   node scripts/vr-federal-fpi.mjs --set touched        # every pid the seed moves
//   node scripts/vr-federal-fpi.mjs --set all            # every pid in the corpus
//   node scripts/vr-federal-fpi.mjs --member lee         # one member, both reads
//   node scripts/vr-federal-fpi.mjs --json               # machine-readable
//   node scripts/vr-federal-fpi.mjs --drift              # per-issue tier changes
//   node scripts/vr-federal-fpi.mjs --set all --chambers # PRIMARY by chamber + Senate unread
//
// "AFTER" INCLUDES ROWS THE DATABASE DOES NOT HOLD YET. The wave's migration is
// applied by the platform at build, and the build cannot be run from here, so the
// after column is produced by projecting BOTH seeds in memory: the vote seed's
// measures, roll calls and member votes, then the mapping seed's issue rows on
// top. See voteOverlay() for why a mapping overlay alone would have reported no
// change at all, and for the guards that keep the projection from doubling a roll
// the database already holds.
//
// BEFORE AND AFTER, WITHOUT APPLYING ANYTHING. "before" is the mapping set the
// database holds right now. "after" is that set OVERLAID with the selected waves'
// mapping seeds (see WAVES) in memory only. Nothing is written:
// this script opens the database with plain SELECTs, and the seed becomes real
// when its migration is applied by the platform, not when this runs. That is
// what makes the table quotable before the deploy rather than after it. A mapping
// seed may also RETRACT a live row; see overlay() for how a removal is projected.
//
// THE DERIVATION IS NOT REIMPLEMENTED HERE. consistency.js is loaded through the
// node:vm sandbox the test suite boots and PDXConsistency.formalPatternIndex is
// CALLED, on item objects shaped exactly the way netlify/lib/vr-pack.ts shapes a
// /api/voting-record response. No floor, bar, tier or weight is read out of a
// comment and no threshold is redefined:
//
//   empty     — the member holds no issue row at all. Nothing formal on file
//               that carries a reviewed mapping.
//   thin      — rows on file, none of them characterised. The engine declines to
//               name a direction on every issue this member touches.
//   readable  — at least one issue the engine will characterise, one way or both.
//
// Requires NETLIFY_DB_URL. READ-ONLY: no INSERT, no UPDATE, no file written.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import pg from "pg";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
// ── WHICH WAVES ARE PROJECTED ────────────────────────────────────────────────
// One entry per federal wave, in the order its migration applies. Each wave is a
// mapping seed (issue rows, and any row it RETRACTS) plus a vote seed (measures,
// roll calls, member votes). A wave whose migration the platform has already
// applied is harmless to leave selected: the overlays skip a roll the database
// already holds by its unique tuple and skip an issue row already on file, so a
// run made after the deploy reports the same numbers as one made before it.
//
// `--waves` narrows the projection, which is how the before/after pair for a NEW
// wave is produced without applying anything:
//
//   node scripts/vr-federal-fpi.mjs --set utah --waves f1        # the record as deployed
//   node scripts/vr-federal-fpi.mjs --set utah --waves f1,f2     # with F2's rows projected
const WAVES = {
  f1: { mapping: "db/vr-federal-mapping-seed-f1.json", votes: "db/vr-federal-depth-vote-seed.json" },
  f2: { mapping: "db/vr-federal-mapping-seed-f2.json", votes: "db/vr-federal-wave-f2-vote-seed.json" },
  f3: { mapping: "db/vr-federal-mapping-seed-f3.json", votes: "db/vr-federal-wave-f3-vote-seed.json" },
};

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
const SET = argOf("set") || "utah";
const WAVE_KEYS = (argOf("waves") || Object.keys(WAVES).join(",")).split(",").map((w) => w.trim()).filter(Boolean);
for (const w of WAVE_KEYS) if (!WAVES[w]) throw new Error(`unknown wave '${w}' — known waves: ${Object.keys(WAVES).join(", ")}`);
// Only files that exist are projected, so a wave whose seeds have been retired
// degrades to "nothing to add" rather than crashing a measurement run.
const SEED_FILES = WAVE_KEYS.map((w) => WAVES[w].mapping).filter((f) => existsSync(join(ROOT, f)));
const VOTE_SEED_FILES = WAVE_KEYS.map((w) => WAVES[w].votes).filter((f) => existsSync(join(ROOT, f)));

// ── THE DENOMINATOR ─────────────────────────────────────────────────────────
// "empty" is a count of PEOPLE, so it needs a roster, and the roster cannot be
// "whoever turned up with a vote" — that definition can never report an empty
// member, which is the population the number exists to disclose. Same two-list
// union the Utah harness uses, with the federal equivalents of each list:
//   • every slug in the reviewed federal member map (db/vr-member-map.json)
//     whose annotated state is UT — the set the bioguide→roster pass resolved,
//     which is why maloy and owens are in the table even though CMP_DATA files
//     them under a bare "District 2"/"District 4" state string; and
//   • every CMP_DATA profile whose office names a federal seat and whose office
//     or state names Utah, which catches a former member ("Former U.S. Rep")
//     whose bioguide never entered the map.
// Nobody is added or removed here to make a number move.
const FED_OFFICE = /U\.?S\.?\s*(Senator|Representative|Rep\b|House|Senate)/i;
function utahFederal(win) {
  const out = new Set();
  const mm = J("db/vr-member-map.json");
  for (const v of Object.values(mm.members || {})) {
    if (v && v.slug && String(v.state || "").toUpperCase() === "UT") out.add(v.slug);
  }
  const D = win.CMP_DATA || {};
  for (const pid of Object.keys(D)) {
    const d = D[pid] || {};
    const o = String(d.office || ""), s = String(d.state || "");
    if (FED_OFFICE.test(o) && /\bUtah\b|\bUT\b/i.test(`${o} ${s}`)) out.add(pid);
  }
  // A candidate for a federal seat is not a member of the delegation and holds no
  // roll call by definition; counting one as "empty" would report a hole that is
  // not a hole. They are excluded by office, not by name.
  for (const pid of [...out]) {
    const o = String((D[pid] || {}).office || "");
    if (/Candidate/i.test(o)) out.delete(pid);
  }
  return out;
}

// ── the lane, read from the database ────────────────────────────────────────
// The SELECTs and the item shape are a transcript of netlify/lib/vr-pack.ts's
// buildMemberPack: same joins, same verifiability guard (an unsourced roll call
// is never emitted), same procedural/inversion flags. A shape that drifted from
// the pack would measure a record no reader ever sees.
const PROCEDURAL_TYPES = new Set(["procedural", "motion"]);
function yeaBlocksMeasure(question) {
  const q = String(question || "").toLowerCase();
  return q.indexOf("recommit") !== -1 || q.indexOf("to commit") !== -1 || q.indexOf("to table") !== -1;
}

async function readLane(pids) {
  const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const q = async (s, p) => (await client.query(s, p)).rows;
  const votes = await q(`
    select mv.politician_id pid, mv.position, mv.is_party,
           m.id measure_id, m.measure_type, m.number, m.title, m.parent_id, m.status,
           rc.id rollcall_id, rc.chamber, rc.congress, rc.session, rc.roll_number,
           rc.vote_date, rc.question, rc.action_type, rc.result,
           rc.source_url, rc.source_label
      from vr_member_votes mv
      join vr_rollcalls rc on rc.id = mv.rollcall_id
      join vr_measures m on m.id = rc.measure_id
     where mv.politician_id = any($1)
     order by rc.vote_date desc`, [pids]);
  const pos = await q(`
    select p.politician_id pid, p.action_type, p.supports, p.acted_at, p.source_url,
           m.id measure_id, m.measure_type, m.number, m.title, m.parent_id, m.status,
           m.chamber, m.source_label
      from vr_positions p
      join vr_measures m on m.id = p.measure_id
     where p.politician_id = any($1)`, [pids]);
  const issues = await q(`select measure_id, issue_key, weight, is_primary, support_meaning, rationale from vr_measure_issues`);
  const measures = await q(`select id, congress, chamber, measure_type, number, title, status from vr_measures`);
  await client.end();
  return { votes, pos, issues, measures };
}

// ── THE VOTE OVERLAY ────────────────────────────────────────────────────────
// A MAPPING OVERLAY ALONE CANNOT MEASURE THIS WAVE. The mapping seed's rows hang
// off measures, and three of wave F1's four measures do not exist in the database
// yet — their migration is applied by the platform at build, and the build cannot
// be run from here. Without this, overlay() correctly ignores every row it cannot
// attach and the "after" column reads identical to "before": not a finding, an
// artefact of the read order.
//
// So the vote seed is projected too, in memory and read-only: the measures it
// creates, the roll calls it publishes and the member votes it attributes, shaped
// exactly the way readLane() shapes the same rows out of Postgres. Synthetic
// measure ids are NEGATIVE, so they cannot collide with a serial the database
// issued, and a roll the database ALREADY holds is skipped by (chamber, congress,
// session, roll_number) — the tuple vr_rollcalls is unique on — so an already-live
// roll's real rows are never doubled by their own seed copy.
//
// This is a projection of what the migrations write, not a substitute for them. The
// numbers it produces are honest about one thing only: what the record WILL read
// like once the selected waves' migrations are applied —
// 20261009000000_vr_federal_formal_depth_f1.sql for f1 and
// 20261011000000_vr_federal_wave_f2.sql for f2.
function voteOverlay(lane, pids) {
  if (!VOTE_SEED_FILES.length) return { lane, addedRolls: 0, addedVotes: 0, addedMeasures: 0, skippedRolls: 0 };
  // Waves are projected in order, so a later wave that attributes a roll an
  // earlier wave already published sees it as live and skips it, exactly as it
  // would after both migrations had applied.
  const seed = { votes: VOTE_SEED_FILES.flatMap((f) => J(f).votes || []) };
  const want = new Set(pids);
  const liveRoll = new Set(lane.votes.map((v) => `${v.chamber}|${v.congress}|${v.session}|${v.roll_number}`));
  const byNumber = new Map();
  for (const m of lane.measures) byNumber.set(`${m.congress}|${String(m.number).trim().toLowerCase()}`, m);
  const measures = lane.measures.slice();
  const votes = lane.votes.slice();
  let nextId = -1;
  const addedMeasures = new Map();
  let addedRolls = 0, addedVotes = 0, skippedRolls = 0;
  const resolve = (m) => {
    const k = `${m.congress}|${String(m.number).trim().toLowerCase()}`;
    const live = byNumber.get(k);
    if (live) return live;
    if (addedMeasures.has(k)) return addedMeasures.get(k);
    const c = m.create || {};   // F2-style explicit creation block; F1 seeds carry the fields flat
    const row = { id: nextId--, congress: m.congress, chamber: m.chamber, measure_type: m.measureType,
      number: m.number, title: c.title || m.title || m.number, status: c.status || "pending",
      parent_id: null, synthetic: true };
    addedMeasures.set(k, row);
    measures.push(row);
    return row;
  };
  for (const v of seed.votes || []) {
    const rk = `${v.chamber}|${v.congress}|${v.session}|${v.rollNumber}`;
    if (liveRoll.has(rk)) { skippedRolls++; continue; }   // already in the database, or already projected
    liveRoll.add(rk);
    const m = resolve(v.measure);
    // parent_id, resolved only if the parent is itself in the corpus. An amendment
    // whose parent cannot be found is filed with a null parent here rather than a
    // guessed one; the migration RAISES on the same condition rather than filing it.
    if (m.synthetic && v.measure.parent) {
      const p = byNumber.get(`${v.measure.parent.congress}|${String(v.measure.parent.number).trim().toLowerCase()}`);
      if (p) m.parent_id = p.id;
    }
    addedRolls++;
    const rcId = nextId--;
    for (const mv of v.memberVotes || []) {
      if (!want.has(mv.politicianId)) continue;
      addedVotes++;
      votes.push({ pid: mv.politicianId, position: mv.position, is_party: mv.isParty,
        measure_id: m.id, measure_type: m.measureType, number: m.number, title: m.title,
        parent_id: m.parent_id ?? null, status: m.status,
        rollcall_id: rcId, chamber: v.chamber, congress: v.congress, session: v.session,
        roll_number: v.rollNumber, vote_date: v.voteDate, question: v.question,
        action_type: v.actionType, result: v.result,
        source_url: v.sourceUrl, source_label: v.sourceLabel });
    }
  }
  votes.sort((a, b) => String(b.vote_date || "").localeCompare(String(a.vote_date || "")));
  return { lane: { ...lane, votes, measures }, addedRolls, addedVotes,
    addedMeasures: addedMeasures.size, skippedRolls };
}

// The overlay. A seed row names a measure by (congress, number) — the pair the
// runbook treats as a measure's identity — and carries the four judgements the
// drafting bench refuses to make. Rows still carrying UNDECIDED are IGNORED by
// the overlay rather than counted as mappings: an unanswered draft must not move
// a published number.
function overlay(issues, measures) {
  if (!SEED_FILES.length) return { rows: issues.slice(), added: 0, skipped: 0, retracted: 0 };
  const seeds = SEED_FILES.map(J);
  const seed = { measures: seeds.flatMap((x) => x.measures || []), retractions: seeds.flatMap((x) => x.retractions || []) };
  const byKey = new Map();
  for (const m of measures) byKey.set(`${m.congress}|${String(m.number).trim().toLowerCase()}`, m.id);
  const rows = issues.slice();
  // ALREADY LIVE IS NOT ADDED AGAIN. Once the wave's migration is applied the
  // seed's rows exist in vr_measure_issues, and pushing them a second time would
  // count one mapping twice — inflating the row totals in a run made AFTER the
  // deploy. A row already on file for the same (measure, key) is left alone: the
  // live rationale is the first writer's (runbook rule 21), and this harness
  // writes nothing anyway.
  const live = new Set(issues.map((r) => `${r.measure_id}|${r.issue_key}`));
  let added = 0, skipped = 0;
  for (const m of seed.measures || []) {
    const mid = byKey.get(`${m.congress}|${String(m.number).trim().toLowerCase()}`);
    if (!mid) { skipped++; continue; }
    for (const i of m.issues || []) {
      if (!i || i.decision === "UNDECIDED" || !i.supportMeaning) { skipped++; continue; }
      if (live.has(`${mid}|${i.issueKey}`)) { skipped++; continue; }
      rows.push({ measure_id: mid, issue_key: i.issueKey, weight: i.weight,
        is_primary: !!i.isPrimary, support_meaning: i.supportMeaning, rationale: i.rationale || null });
      added++;
    }
  }
  // RETRACTIONS. A wave may also REMOVE a live row — the mirror of adding one, and
  // the only way the after column can honestly show a mapping going away. Runbook
  // rule 21 governs: the live rationale is the first writer's, so a retraction has
  // to carry its own argument in the seed, and rule 32 is why they exist at all —
  // when a key's scope note narrows, a mapping left behind keeps publishing.
  // Projected here so the FPI table shows what the DELETE costs before the deploy,
  // and matched on the same (congress, number, issue_key) identity the migration
  // uses. A retraction that matches nothing is COUNTED, not silently dropped: after
  // the migration applies there is nothing left to remove, which is the expected
  // steady state and must not read as a projection failure.
  let retracted = 0, retractionsAlreadyGone = 0;
  for (const r of seed.retractions || []) {
    const mid = byKey.get(`${r.congress}|${String(r.number).trim().toLowerCase()}`);
    const at = mid == null ? -1 : rows.findIndex((x) => x.measure_id === mid && x.issue_key === r.issueKey);
    if (at === -1) { retractionsAlreadyGone++; continue; }
    rows.splice(at, 1);
    retracted++;
  }
  return { rows, added, skipped, retracted, retractionsAlreadyGone };
}

function itemsFor(lane, issueRows) {
  const byMeasure = new Map();
  for (const r of issueRows) {
    const l = byMeasure.get(r.measure_id) || [];
    l.push({ issueKey: r.issue_key, weight: Number(r.weight), isPrimary: !!r.is_primary,
      supportMeaning: r.support_meaning, rationale: r.rationale || null });
    byMeasure.set(r.measure_id, l);
  }
  for (const l of byMeasure.values()) l.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight);
  const byMember = new Map();
  const push = (pid, it) => { const l = byMember.get(pid) || []; l.push(it); byMember.set(pid, l); };
  const stats = { votes: 0, positions: 0 };
  for (const v of lane.votes) {
    if (!v.source_url) continue;                            // verifiability guard
    stats.votes++;
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
  for (const p of lane.pos) {
    if (!p.source_url) continue;
    stats.positions++;
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
  for (const l of byMember.values()) l.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return { byMember, stats };
}

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
    out.per.set(pid, { band, issues: sh.issues, strongN: sh.strongN, splitN: sh.splitN,
      thinN: sh.thinN, characterised: sh.characterised, acts: items.length });
  }
  return out;
}

// ── run ─────────────────────────────────────────────────────────────────────
const winB = boot(), winA = boot();
const UT = utahFederal(winB);

// The pid set the table is over. `touched` is computed from the seed rather than
// listed by hand, so it cannot fall out of step with what the wave maps.
async function resolveSet() {
  if (SET === "utah") return [...UT];
  const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const all = (await client.query(`select distinct politician_id from vr_member_votes`)).rows.map((r) => r.politician_id);
  if (SET === "all") { await client.end(); return all; }
  const pairs = SEED_FILES.flatMap((f) => {
    const x = J(f);
    return [...(x.measures || []), ...(x.retractions || [])].map((m) => [m.congress, String(m.number).trim()]);
  });
  const touched = new Set(UT);
  // Every member the selected waves ATTRIBUTE, not only the ones the database
  // already holds. Most of a wave's measures are not in the corpus yet, so a
  // database-only definition of "touched" would silently shrink to the Utah set
  // plus whoever voted on the already-live rolls — and would report a national
  // pass as a Utah-sized one.
  for (const f of VOTE_SEED_FILES) {
    for (const v of J(f).votes || []) {
      for (const mv of v.memberVotes || []) touched.add(mv.politicianId);
    }
  }
  for (const [congress, number] of pairs) {
    const rows = (await client.query(`
      select distinct mv.politician_id pid from vr_member_votes mv
        join vr_rollcalls rc on rc.id = mv.rollcall_id
        join vr_measures m on m.id = rc.measure_id
       where m.congress = $1 and lower(trim(m.number)) = lower($2)`, [congress, number])).rows;
    for (const r of rows) touched.add(r.pid);
  }
  await client.end();
  return [...touched];
}

const PIDS = await resolveSet();
const lane = await readLane([...new Set([...PIDS, ...UT])]);
// "before" is the database as it stands. "after" is the database PLUS the wave's
// unapplied rows, projected in memory — the vote seed first, so the mapping seed
// has measures to attach to.
const V = voteOverlay(lane, [...new Set([...PIDS, ...UT])]);
const O = overlay(V.lane.issues, V.lane.measures);
const before = itemsFor(lane, lane.issues);
const after = itemsFor(V.lane, O.rows);
const ROSTER = new Set(PIDS);
const B = measure(winB, before, ROSTER), A = measure(winA, after, ROSTER);

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

function issueDrift(pids) {
  const out = [];
  const tierOf = (win, l, pid) => {
    const items = l.byMember.get(pid) || [];
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
// ── DID ANY ROW STOP BEING CHARACTERISED? ───────────────────────────────────
// The tier lists below are derived from _fpiShape's counters, which is the right
// view for "is this member's brief readable". It is the WRONG view for the one
// promise a densification wave has to keep — that no row the engine used to
// characterise stops being characterised — because a tier can move between two
// read states and a counter can net out. So the promise is checked directly on
// the row model's own `read` flag, over EVERY pid in the set rather than only the
// ones whose shape counters moved, and set-wise rather than by arithmetic.
//
// A wave that retracts a mapping (see overlay()) is exactly the case this exists
// for: subtracting an act can take a row below the judged floor, and the loss
// would be invisible in a table where the same member gained a row elsewhere.
function readSets(win, l, pids) {
  const out = new Map();
  for (const pid of pids) {
    const items = l.byMember.get(pid) || [];
    if (!items.length) { out.set(pid, new Set()); continue; }
    win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(items)));
    const keys = new Map();
    for (const r of win.PDXConsistency.formalPatternIndex.rows(pid) || []) if (r.read) keys.set(r.key, r.tier || "?");
    out.set(pid, keys);
  }
  return out;
}
const ALL_PIDS = [...ROSTER].sort();
const READ_B = readSets(winB, before, ALL_PIDS), READ_A = readSets(winA, after, ALL_PIDS);
const LOST_READS = [];
for (const pid of ALL_PIDS) {
  const b = READ_B.get(pid) || new Map(), a = READ_A.get(pid) || new Map();
  for (const [k, tier] of b) if (!a.has(k)) LOST_READS.push({ pid, key: k, wasTier: tier });
}
const GAINED_READS = [];
for (const pid of ALL_PIDS) {
  const b = READ_B.get(pid) || new Map(), a = READ_A.get(pid) || new Map();
  for (const [k, tier] of a) if (!b.has(k)) GAINED_READS.push({ pid, key: k, nowTier: tier });
}

const MOVED = drift.map((d) => d.pid);
const DRIFT_ROWS = issueDrift(MOVED);
const LOST = DRIFT_ROWS.filter((r) => (r.from === "strong" || r.from === "mostly") && r.to !== "strong" && r.to !== "mostly");
const NEWSPLIT = DRIFT_ROWS.filter((r) => r.to === "split" && r.from !== "split");
const NEWREAD = DRIFT_ROWS.filter((r) => r.from === "(absent)" || r.from === "unread");

// ── WHY A ROW IS UNREAD ─────────────────────────────────────────────────────
// The band table says how many rows the engine declined to characterise. It does
// not say WHY, and the five refusals consistency.js distinguishes are five
// different pieces of work — one of them ("No side to read on this issue") is not
// work at all but a property of the key, and one ("Not about this issue") is a
// mapping that should probably not have been made. A densification pass aimed at
// the wrong bucket adds rows and moves nothing, so the reasons are counted.
function whyRows(win, l, pids) {
  const out = [];
  for (const pid of pids) {
    const items = l.byMember.get(pid) || [];
    if (!items.length) continue;
    win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(items)));
    for (const r of win.PDXConsistency.formalPatternIndex.rows(pid) || []) {
      if (r.read) continue;
      out.push({ pid, key: r.key, why: (r.why && r.why.id) || "(none)" });
    }
  }
  return out;
}
function whyTable(rows) {
  const tally = new Map();
  for (const r of rows) tally.set(r.why, (tally.get(r.why) || 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1]);
}

// ── WHICH CHAMBER, AND WHERE THE PRIMARY INSTRUMENTS ARE ────────────────────
// F2 closed a hole in the numbers and left one in the WRITING: it added three
// Senate rolls on two keys, and every other key a senator touches still had zero
// Senate instrument mapped at PRIMARY weight. A senator's brief on such a key is
// built entirely out of omnibus vehicles and stowaway secondaries, so the engine
// either declines to read it (`vehicle_only`, `incidental`) or reads it off a
// measure that is not about the issue. The band table cannot show that, because a
// row is a row whichever chamber's instrument produced it. So the census below is
// per (issue key, chamber), and it is the table a Senate densification wave has to
// be picked off rather than off a candidate list carried over from the last pass.
//
// "PRIMARY in chamber C" means: at least one measure carrying this key with
// `is_primary` true, on which a member of chamber C has a ROLL CALL vote in the
// corpus. Roll calls only, not positions — a cosponsorship is not a floor act and
// a wave aimed at readability cannot be measured on one. The count is of distinct
// MEASURES, not rows: two rolls on one bill are one instrument.
const MEMBER_CHAMBER = (() => {
  const out = new Map();
  for (const v of Object.values(J("db/vr-member-map.json").members || {})) {
    if (v && v.slug && v.chamber) out.set(v.slug, String(v.chamber).toLowerCase());
  }
  return out;
})();

function chamberPrimary(lane, issueRows) {
  const rollChambers = new Map();
  for (const v of lane.votes) {
    if (!v.source_url) continue;                            // same verifiability guard as itemsFor
    const s = rollChambers.get(v.measure_id) || new Set();
    s.add(String(v.chamber));
    rollChambers.set(v.measure_id, s);
  }
  const label = new Map();
  for (const m of lane.measures) label.set(m.id, String(m.number).trim());
  const per = new Map();
  const slot = (k) => {
    let e = per.get(k);
    if (!e) { e = { primary: { senate: new Set(), house: new Set() }, any: { senate: new Set(), house: new Set() } }; per.set(k, e); }
    return e;
  };
  for (const r of issueRows) {
    const chs = rollChambers.get(r.measure_id);
    if (!chs) continue;
    const e = slot(r.issue_key);
    const name = label.get(r.measure_id) || String(r.measure_id);
    for (const c of chs) {
      if (!e.any[c]) continue;                              // a third chamber would be a data error, not a bucket
      e.any[c].add(name);
      if (r.is_primary) e.primary[c].add(name);
    }
  }
  return per;
}

// ── THE OUTCOME COLUMN ──────────────────────────────────────────────────────
// The census table's last column is the wave's DECISION on the key, and it lives
// here rather than in prose so the before table and the after table are generated
// from one source. A key with no entry prints "—", which is the honest reading for
// most of the vocabulary: not examined this wave. Every entry a wave writes here
// is either SHIPPED (a Senate PRIMARY instrument landed), REFUSED (an instrument
// was found and declined, with the reason), or BLOCKED (no admissible instrument
// exists yet, and the note names the bill that would unblock it).
const F3_OUTCOME = {
  broadband:        { verdict: "SHIPPED",  note: "S.J.Res. 7 — first broadband PRIMARY in either chamber" },
  lands_preserve:   { verdict: "SHIPPED",  note: "H.J.Res. 140 — first Senate-reachable lands_preserve PRIMARY" },
  lands_energy:     { verdict: "SHIPPED",  note: "H.J.Res. 140 mirror secondary; measured +8/-1, disclosed" },
  gov_regulation:   { verdict: "REFUSED",  note: "process secondary on both CRAs: gains 0 rows, costs 2 (rule 30 wall)" },
  energy_production:{ verdict: "REFUSED",  note: "no hydrocarbon programme in PLO 7917; cousin of lands_energy" },
  water:            { verdict: "REFUSED",  note: "scope note is demand-side; this is a land-protection act" },
  climate_action:   { verdict: "REFUSED",  note: "no emissions provision in the disapproved order" },
  public_schools:   { verdict: "REFUSED",  note: "E-Rate hotspots are off-premises access, not district money" },
  rural_ag:         { verdict: "REFUSED",  note: "keyword collision on 'rural broadband' / 'grazing' only" },
  health_rural:     { verdict: "BLOCKED",  note: "only Baldwin Amdt. 1693, a deficit-neutral reserve fund (rule 31)" },
  free_speech:      { verdict: "BLOCKED",  note: "S. 146 passed by unanimous consent; zero rolls to attribute" },
  econ_smallbiz:    { verdict: "BLOCKED",  note: "only Scott FL Amdt. 3113, 15-81, below rule 11's one-tenth bar" },
  econ_workers:     { verdict: "BLOCKED",  note: "H.R. 5408 received in the Senate, never voted" },
  scotus_reform:    { verdict: "BLOCKED",  note: "no Senate instrument of any kind in the 119th" },
  tax_middle_class: { verdict: "BLOCKED",  note: "every Senate act is inside a reconciliation vehicle" },
};

// ── ONE ROW, BEFORE AND AFTER ───────────────────────────────────────────────
// The band table and the drift list say a row's tier moved; neither says what the
// engine was looking at when it moved. This prints the row model itself for one
// (member, issue) pair on both sides — tier, read flag, refusal reason, the act
// counts and the acts — which is the only way to tell a real densification from a
// mapping that changed the arithmetic on a key it was not aiming at.
//
//   node scripts/vr-federal-fpi.mjs --row curtis:gov_regulation
if (argOf("row")) {
  const [rpid, rkeyName] = argOf("row").split(":");
  const dump = (win, l, label) => {
    const items = l.byMember.get(rpid) || [];
    win.PDXVotingRecord.noteMember(rpid, JSON.parse(JSON.stringify(items)));
    const row = (win.PDXConsistency.formalPatternIndex.rows(rpid) || []).find((r) => r.key === rkeyName);
    console.log(`\n  ${label} — ${rpid} / ${rkeyName}`);
    if (!row) { console.log("    (no row on the index)"); return; }
    console.log(`    tier=${row.tier} read=${!!row.read} judged=${row.judged} why=${(row.why && row.why.id) || "-"}`);
    console.log(`    counts=${JSON.stringify(row.counts)}`);
    const acts = items.filter((it) => (it.issues || []).some((i) => i.issueKey === rkeyName));
    for (const a of acts) {
      const mine = (a.issues || []).find((i) => i.issueKey === rkeyName);
      console.log(`      ${String(a.number).padEnd(14)} ${String(a.actionType).padEnd(11)} ${String(a.position).padEnd(5)}`
        + ` w${mine.weight}${mine.isPrimary ? " PRIMARY" : "        "} ${mine.supportMeaning}`
        + `  ${a.isProcedural ? "procedural" : "substantive"}${a.advanceInverted ? " inverted" : ""}`);
    }
  };
  dump(winB, before, "BEFORE");
  dump(winA, after, "AFTER");
  console.log("");
} else if (process.argv.includes("--chambers")) {
  // PRIMARY-BY-CHAMBER, plus the Senate side of the unread-reason census, in one
  // table. Run it with `--set all`: on the Utah set the PRIMARY counts would be
  // limited to instruments a Utah member happened to vote on, which reads as a
  // national gap when it is a roster artefact.
  const senPids = [...ROSTER].filter((p) => MEMBER_CHAMBER.get(p) === "senate").sort();
  const CP_B = chamberPrimary(lane, lane.issues), CP_A = chamberPrimary(V.lane, O.rows);
  const bRows = whyRows(winB, before, senPids), aRows = whyRows(winA, after, senPids);
  const bucket = (rows) => {
    const m = new Map();
    for (const r of rows) {
      const e = m.get(r.key) || { vehicle_only: 0, incidental: 0, other: 0, total: 0 };
      e[r.why === "vehicle_only" || r.why === "incidental" ? r.why : "other"]++;
      e.total++;
      m.set(r.key, e);
    }
    return m;
  };
  const UB = bucket(bRows), UA = bucket(aRows);
  const keys = [...new Set([...CP_B.keys(), ...CP_A.keys(), ...UB.keys(), ...UA.keys(), ...Object.keys(F3_OUTCOME)])];
  const sp = (m, k) => ((m.get(k) || {}).primary || {});
  const rank = (k) => {
    const u = UB.get(k) || { vehicle_only: 0, incidental: 0, total: 0 };
    const s0 = (sp(CP_B, k).senate || new Set()).size;
    return [s0 === 0 ? 0 : 1, -(u.vehicle_only * 2 + u.incidental), -u.total];
  };
  keys.sort((a, b) => {
    const x = rank(a), y = rank(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return a.localeCompare(b);
  });
  console.log(`\n  PRIMARY BY CHAMBER — set "${SET}" — waves ${WAVE_KEYS.join("+")} — ${senPids.length} senators on the roster\n`);
  console.log(`  key                        SenP  SenP'  HouP  Sen unread (vehicle/incid/other)   outcome`);
  for (const k of keys) {
    const b = (sp(CP_B, k).senate || new Set()).size, a = (sp(CP_A, k).senate || new Set()).size;
    const h = (sp(CP_B, k).house || new Set()).size;
    const u = UB.get(k) || { vehicle_only: 0, incidental: 0, other: 0, total: 0 };
    const u2 = UA.get(k) || { vehicle_only: 0, incidental: 0, other: 0, total: 0 };
    const d = u2.total - u.total;
    const o = F3_OUTCOME[k];
    if (!o && !u.total && !a && !h) continue;               // nothing recorded either way: not a row of this table
    console.log(`  ${k.padEnd(26)} ${String(b).padStart(4)} ${String(a === b ? "" : "→" + a).padStart(6)}`
      + ` ${String(h).padStart(5)}   ${String(u.vehicle_only).padStart(3)} /${String(u.incidental).padStart(4)} /${String(u.other).padStart(5)}`
      + `  ${String(u.total).padStart(3)} rows${d ? ` → ${u2.total} (${d > 0 ? "+" + d : d})` : "        "}`
      + `   ${o ? o.verdict + " · " + o.note : "—"}`);
  }
  const senP0 = keys.filter((k) => !(sp(CP_B, k).senate || new Set()).size);
  const senP0A = keys.filter((k) => !(sp(CP_A, k).senate || new Set()).size);
  console.log(`\n  keys with a Senate PRIMARY instrument: before ${keys.length - senP0.length} of ${keys.length}   after ${keys.length - senP0A.length} of ${keys.length}`);
  console.log(`  Senate unread rows over ${senPids.length} senators: before ${bRows.length}   after ${aRows.length}   (${aRows.length - bRows.length})`);
  const tb = whyTable(bRows), ta = new Map(whyTable(aRows));
  for (const [id, n] of tb) console.log(`    ${id.padEnd(22)} ${String(n).padStart(5)} → ${String(ta.get(id) || 0).padStart(5)}`);
  for (const [id, n] of ta) if (!tb.some((x) => x[0] === id)) console.log(`    ${id.padEnd(22)} ${String(0).padStart(5)} → ${String(n).padStart(5)}`);
  console.log("");
} else if (process.argv.includes("--why")) {
  const sorted = [...ROSTER].sort();
  const bRows = whyRows(winB, before, sorted), aRows = whyRows(winA, after, sorted);
  const b = whyTable(bRows), a = whyTable(aRows);
  const am = new Map(a);
  console.log(`\n  WHY UNREAD — set "${SET}" — waves ${WAVE_KEYS.join("+")}\n`);
  console.log(`    ${"reason".padEnd(22)} before   after   delta`);
  for (const [id, n] of b) {
    const after2 = am.get(id) || 0;
    console.log(`    ${id.padEnd(22)} ${String(n).padStart(6)} ${String(after2).padStart(7)} ${String(after2 - n).padStart(7)}`);
    am.delete(id);
  }
  for (const [id, n] of am) console.log(`    ${id.padEnd(22)} ${String(0).padStart(6)} ${String(n).padStart(7)} ${String(n).padStart(7)}`);
  // WHICH KEYS, NOT JUST HOW MANY. A reason total says how much work of that kind
  // exists; only the key list says where to aim it. "vehicle_only" and
  // "mixed_thin" are the two buckets a densification pass can actually move —
  // one wants a standalone instrument on the issue, the other wants a weightier
  // one — so their keys are named, most-blocked first, with the members behind
  // each. "no_side" and "incidental" are printed too, and are NOT work: the first
  // is a property of the key and the second usually means a mapping was too
  // generous in the first place.
  // WHICH KEY MOVED, AND WHICH WAY. The reason totals above say a wave traded 95
  // vehicle_only rows for 77 incidental ones; they do not say that the trade
  // happened on DIFFERENT KEYS, which is the only version of the sentence a reader
  // can check. Every (key, reason) pair whose count changed is printed with its
  // delta, so a wave's stowaway cost — the secondary rows that ride along on a
  // measure whose primary is what the wave was after — is visible per key instead
  // of buried in an aggregate.
  const pairKey = (r) => `${r.key}\u0000${r.why}`;
  const pairs = new Map();
  for (const r of bRows) { const e = pairs.get(pairKey(r)) || { key: r.key, why: r.why, b: 0, a: 0 }; e.b++; pairs.set(pairKey(r), e); }
  for (const r of aRows) { const e = pairs.get(pairKey(r)) || { key: r.key, why: r.why, b: 0, a: 0 }; e.a++; pairs.set(pairKey(r), e); }
  const moved = [...pairs.values()].filter((e) => e.a !== e.b).sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b) || x.key.localeCompare(y.key));
  if (moved.length) {
    console.log(`\n    (key, reason) pairs whose count changed: ${moved.length}`);
    console.log(`      ${"issue key".padEnd(26)} ${"reason".padEnd(16)} before  after  delta`);
    for (const e of moved) {
      console.log(`      ${e.key.padEnd(26)} ${e.why.padEnd(16)} ${String(e.b).padStart(6)} ${String(e.a).padStart(6)} ${String(e.a - e.b > 0 ? "+" + (e.a - e.b) : e.a - e.b).padStart(6)}`);
    }
  }

  const AIM = ["vehicle_only", "mixed_thin", "incidental", "no_side", "no_side_taken"];
  for (const bucket of AIM) {
    const rows = aRows.filter((r) => r.why === bucket);
    if (!rows.length) continue;
    const byKey = new Map();
    for (const r of rows) { const l = byKey.get(r.key) || []; l.push(r.pid); byKey.set(r.key, l); }
    console.log(`\n    ${bucket} — ${byKey.size} distinct issue keys over ${rows.length} rows`);
    for (const [k, pids] of [...byKey].sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0])))
      console.log(`      ${k.padEnd(26)} ${String(pids.length).padStart(2)}  ${pids.sort().join(" ")}`);
  }
  console.log("");
} else if (process.argv.includes("--drift")) {
  console.log(`\n  per-issue tier changes across ${MOVED.length} members: ${DRIFT_ROWS.length}\n`);
  const show = (t, rows) => { console.log(`  ${t} (${rows.length})`); for (const r of rows.slice(0, 60)) console.log(`    ${r.pid.padEnd(26)} ${r.key.padEnd(26)} ${r.from} → ${r.to}`); };
  console.log(`  rows that STOPPED being characterised, checked on the read flag over all ${ALL_PIDS.length} pids: ${LOST_READS.length}`
    + (LOST_READS.length ? `\n${LOST_READS.slice(0, 60).map((r) => `    ${r.pid.padEnd(26)} ${r.key} (was ${r.wasTier})`).join("\n")}` : ""));
  console.log(`  rows that STARTED being characterised: ${GAINED_READS.length}\n`);
  show("characterisation lost", LOST);
  show("newly split", NEWSPLIT);
  show("newly on the index", NEWREAD.slice(0, 40));
  console.log("");
} else if (AS_JSON) {
  const strip = (m) => ({ empty: m.empty, thin: m.thin, readable: m.readable, members: m.members,
    withRecord: m.withRecord, rows: m.rows, strongN: m.strongN, splitN: m.splitN, thinN: m.thinN });
  console.log(JSON.stringify({ set: SET, waves: WAVE_KEYS,
    seed: { added: O.added, skipped: O.skipped, retracted: O.retracted, retractionsAlreadyGone: O.retractionsAlreadyGone },
    voteSeed: { measures: V.addedMeasures, rolls: V.addedRolls, memberVotes: V.addedVotes, rollsAlreadyLive: V.skippedRolls },
    before: { ...strip(B), lane: before.stats }, after: { ...strip(A), lane: after.stats },
    drift, weakened: weakened.map((d) => d.pid), newSplits: split.map((d) => d.pid),
    issueDrift: DRIFT_ROWS, lost: LOST, newlySplit: NEWSPLIT,
    lostReads: LOST_READS, gainedReads: GAINED_READS,
    per: Object.fromEntries([...A.per].map(([p, a]) => [p, { before: B.per.get(p), after: a }])) }, null, 1));
} else if (ONE) {
  console.log(`${ONE}\n  before  ${JSON.stringify(B.per.get(ONE))}\n  after   ${JSON.stringify(A.per.get(ONE))}`);
} else {
  const row = (lbl, m, st) => console.log(
    `  ${lbl.padEnd(8)} ${String(m.empty).padStart(5)} ${String(m.thin).padStart(5)} ${String(m.readable).padStart(9)}` +
    `   │ ${String(m.members).padStart(4)} on roster, ${String(m.withRecord).padStart(4)} with a record · ${String(m.rows).padStart(5)} issue rows · ` +
    `${m.strongN} clear / ${m.splitN} split / ${m.thinN} unread   │ ${st.votes} votes + ${st.positions} positions`);
  console.log(`\n  FEDERAL FORMAL PATTERN INDEX — set "${SET}" — waves ${WAVE_KEYS.join("+")} — shipped tiers, no floor moved\n`);
  console.log(`           empty  thin  readable`);
  row("before", B, before.stats);
  row("after", A, after.stats);
  console.log(`\n  delta    ${String(A.empty - B.empty).padStart(5)} ${String(A.thin - B.thin).padStart(5)} ${String(A.readable - B.readable).padStart(9)}`);
  console.log(`\n  seed rows overlaid: ${O.added}   ignored (undecided, refused, or already live): ${O.skipped}`
    + `   retracted: ${O.retracted}${O.retractionsAlreadyGone ? ` (${O.retractionsAlreadyGone} already gone)` : ""}`);
  console.log(`  vote seed projected: ${V.addedMeasures} measures, ${V.addedRolls} roll calls, ${V.addedVotes} member votes on this set`
    + `${V.skippedRolls ? `   (${V.skippedRolls} roll(s) already in the database, left alone)` : ""}`);
  console.log(`  members whose shape moved: ${drift.length}`);
  console.log(`  rows that stopped being characterised (read → unread, any key, any member): ${LOST_READS.length}`
    + (LOST_READS.length ? ` — ${LOST_READS.slice(0, 12).map((r) => `${r.pid}/${r.key}`).join(", ")}` : ""));
  console.log(`  rows that started being characterised: ${GAINED_READS.length}`);
  console.log(`  tier weakening (readable→not, or fewer clear issues): ${weakened.length}` +
    (weakened.length ? ` — ${weakened.map((d) => `${d.pid} ${d.from.band}/${d.from.strongN}→${d.to.band}/${d.to.strongN}`).join(", ")}` : ""));
  console.log(`  members gaining a split row: ${split.length}` +
    (split.length ? ` — ${split.slice(0, 20).map((d) => `${d.pid} ${d.from.splitN}→${d.to.splitN}`).join(", ")}` : ""));
  if (SET === "utah") {
    console.log("\n  per member (before → after)");
    for (const pid of [...ROSTER].sort()) {
      const b = B.per.get(pid), a = A.per.get(pid);
      console.log(`    ${pid.padEnd(12)} ${String(b.band).padEnd(8)} ${String(b.issues).padStart(3)} rows ${String(b.strongN).padStart(3)} clear ${String(b.splitN).padStart(2)} split ${String(b.thinN).padStart(3)} unread   →   ` +
        `${String(a.band).padEnd(8)} ${String(a.issues).padStart(3)} rows ${String(a.strongN).padStart(3)} clear ${String(a.splitN).padStart(2)} split ${String(a.thinN).padStart(3)} unread   (${a.acts} acts)`);
    }
  }
  console.log("");
}
