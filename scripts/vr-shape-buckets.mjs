#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — THE SHAPE'S TAIL, DECOMPOSED (read-only)
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS ANSWERS. formalPatternIndex.shape() used to publish its tail as one
// integer, `thinN`, and record-card.js printed that integer as "N too thin to
// characterise". The integer merged two unlike populations:
//
//   • issues where the BROWSE lane publishes a side in as many words — the
//     dossier one click from the card reads "Thin supports" / "Thin opposes" /
//     "Split" — which is not "too thin to characterise", and
//   • issues with no published side anywhere, which is.
//
// shape() now publishes the tail as three disjoint counts (readThinN,
// readOtherN, thinN) plus their sum (tailN, which is what the old field was).
// This harness prints the before/after decomposition for one member and checks
// the four identities the split has to satisfy:
//
//   1. readThinN + readOtherN + thinN === tailN            — disjoint, complete
//   2. tailN === the merged bucket recomputed from the same rows
//                                                          — nothing left the tail
//   3. issues / read / judged / strongN / splitN / characterised are the merged
//      bucket's own, unchanged                             — no promotion
//   4. readThinN === the number of THIN sides the stance tree prints for the
//      same person                                         — the card and the
//      tree agree about which issues have a thin side on file
//
// and then reads the actual record card and asserts that the "too thin to
// characterise" number on it is `thinN` and nothing wider.
//
// THE DERIVATION IS NOT REIMPLEMENTED. consistency.js, stance-tree.js and
// record-card.js are loaded through the node:vm sandbox the test suite boots and
// CALLED. No floor, tier or threshold is read out of a comment, and the "before"
// column is arithmetic over the SAME rows this run produced — not a git checkout
// — so the comparison stays reproducible after the change is committed.
//
//   node scripts/vr-shape-buckets.mjs                            # the default pair
//   node scripts/vr-shape-buckets.mjs --member massie            # one federal file
//   node scripts/vr-shape-buckets.mjs --member ray_ward --lane utah
//   node scripts/vr-shape-buckets.mjs --json
//
// The federal lane needs NETLIFY_DB_URL and reads the record as DEPLOYED (live
// rows, no wave projected — scripts/vr-federal-fpi.mjs is the harness for that).
// The Utah lane reads the shipped seeds and needs nothing.
// READ-ONLY: plain SELECTs, no INSERT, no UPDATE, no file written.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import pg from "pg";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
// record-card.js and stance-tree.js join the usual list: this harness checks the
// card's printed tally, so the card has to be in the sandbox.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "stance-tree.js", "record-card.js", "profile-spine.js", "profiles-full.js",
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
const LANE = argOf("lane");

// ── the federal lane, as deployed ───────────────────────────────────────────
// A transcript of scripts/vr-federal-fpi.mjs's readLane()/itemsFor() narrowed to
// one member: same joins, same verifiability guard (an unsourced roll call is
// never emitted), same procedural/inversion flags, same item shape as
// netlify/lib/vr-pack.ts. A shape that drifted from the pack would measure a
// record no reader ever sees.
const PROCEDURAL_TYPES = new Set(["procedural", "motion"]);
const yeaBlocksMeasure = (q) => {
  const s = String(q || "").toLowerCase();
  return s.indexOf("recommit") !== -1 || s.indexOf("to commit") !== -1 || s.indexOf("to table") !== -1;
};
async function federalItems(pid) {
  const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const q = async (s, p) => (await client.query(s, p)).rows;
  const votes = await q(`
    select mv.position, mv.is_party,
           m.id measure_id, m.measure_type, m.number, m.title, m.parent_id, m.status,
           rc.id rollcall_id, rc.chamber, rc.congress, rc.session, rc.roll_number,
           rc.vote_date, rc.question, rc.action_type, rc.result, rc.source_url, rc.source_label
      from vr_member_votes mv
      join vr_rollcalls rc on rc.id = mv.rollcall_id
      join vr_measures m on m.id = rc.measure_id
     where mv.politician_id = $1
     order by rc.vote_date desc`, [pid]);
  const pos = await q(`
    select p.action_type, p.supports, p.acted_at, p.source_url,
           m.id measure_id, m.measure_type, m.number, m.title, m.parent_id, m.status,
           m.chamber, m.source_label
      from vr_positions p
      join vr_measures m on m.id = p.measure_id
     where p.politician_id = $1`, [pid]);
  const issues = await q(`select measure_id, issue_key, weight, is_primary, support_meaning, rationale
                            from vr_measure_issues`);
  await client.end();
  const byMeasure = new Map();
  for (const r of issues) {
    const l = byMeasure.get(r.measure_id) || [];
    l.push({ issueKey: r.issue_key, weight: Number(r.weight), isPrimary: !!r.is_primary,
      supportMeaning: r.support_meaning, rationale: r.rationale || null });
    byMeasure.set(r.measure_id, l);
  }
  for (const l of byMeasure.values()) l.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight);
  const items = [];
  for (const v of votes) {
    if (!v.source_url) continue;
    items.push({
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
    items.push({
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
  items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return items;
}

// ── the Utah lane, from the shipped seeds ───────────────────────────────────
// A transcript of scripts/vr-utah-fpi.mjs's buildLane(), same three feeders in
// the same order, filtered to one member at the push.
const FLOOR = [["2025GS", "db/vr-utah-vote-seed.json"], ["2024GS", "db/vr-utah-vote-seed-2024GS.json"],
               ["2023GS", "db/vr-utah-vote-seed-2023GS.json"]];
const COMMITTEE = [["2025GS", "db/vr-utah-committee-seed.json"], ["2024GS", "db/vr-utah-committee-seed-2024GS.json"],
                   ["2023GS", "db/vr-utah-committee-seed-2023GS.json"]];
const MAPPING = [["2025GS", "db/vr-utah-committee-mapping-seed-2025GS.json"],
                 ["2024GS", "db/vr-utah-committee-mapping-seed-2024GS.json"]];
function utahItems(pid) {
  let seq = 0; const MID = new Map();
  const midOf = (k) => { if (!MID.has(k)) MID.set(k, ++seq); return MID.get(k); };
  const items = [];
  const mappingOf = new Map();
  for (const [session, f] of FLOOR) {
    for (const m of J(f).measures) {
      const mid = midOf(`${session}|${m.utahBill}`);
      mappingOf.set(`${session}|${m.utahBill}`, m.issues || []);
      for (const rc of m.rollcalls || []) {
        if (!rc.sourceUrl) continue;
        for (const v of rc.votes || []) {
          if (v.politicianId !== pid) continue;
          items.push({
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
      if (v.politicianId !== pid) continue;
      items.push({
        kind: "position", measureId: mid, measureType: "bill", number: m.number,
        title: m.title, chamber: m.chamber, status: m.status || null,
        date: `${a.date}T00:00:00-07:00`,
        action: "committee_vote", actionType: "committee_vote", position: "committee_vote",
        result: null, isParty: null, supports: !!v.supports, isProcedural: false,
        advanceInverted: false, isAmendment: false, parentMeasureId: null,
        rollcallId: null, congress: null, session: null, rollNumber: null,
        issues, source: { url: a.sourceUrl || a.minutesUrl, label: "Utah committee minutes" },
      });
    }
  };
  for (const [session, f] of COMMITTEE) {
    for (const m of J(f).measures) {
      const issues = mappingOf.get(`${session}|${m.utahBill}`) || [];
      for (const a of m.committeeActs || []) act(session, m, a, issues);
    }
  }
  for (const [session, f] of MAPPING) {
    if (!existsSync(join(ROOT, f))) continue;
    for (const m of J(f).measures) for (const a of m.committeeActs || []) act(session, m, a, m.issues || []);
  }
  items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return items;
}

// ── the read ────────────────────────────────────────────────────────────────
// THE "BEFORE" COLUMN IS ARITHMETIC OVER THE SAME ROWS, not a second checkout.
// The merged bucket was `rows.length - strong/mostly - split`, so it can be
// recomputed from rows() exactly as the old shape() computed it — which is also
// identity 2's whole point: if the recomputation and `tailN` ever disagree, a row
// left the tail, and a row leaving the tail is the regression this pass is not
// allowed to cause.
const CHAR = { strong: 1, mostly: 1 };
function read(win, pid, items) {
  const FPI = win.PDXConsistency.formalPatternIndex;
  win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(items)));
  const rows = FPI.rows(pid) || [];
  const sh = FPI.shape(pid) || {};
  const oldThinN = rows.filter((x) => !CHAR[x.tier] && x.tier !== "split").length;
  // The tree's own thin sides, off stance-tree.js's projection of
  // recordPattern.display() — the browse read, which is the thing the dossier
  // prints and therefore the thing the card must not contradict.
  const leaves = (win.PDXStanceTree && win.PDXStanceTree.leaves) ? (win.PDXStanceTree.leaves(pid) || []) : [];
  const treeThin = leaves.filter((lf) => lf.record && lf.record.tier === "thin");
  // And the card's own line, read as text rather than described.
  let cardLine = "", cardThinN = null;
  try {
    const m = win.PDXRecordCard.read(pid, {});
    const ls = (m && m.formal && m.formal.lines) || [];
    cardLine = ls.find((s) => /too thin to characterise|read thin|side on file/.test(s)) || "";
    const hit = /(\d+) too thin to characterise/.exec(cardLine);
    cardThinN = hit ? Number(hit[1]) : 0;
  } catch (e) { cardLine = `<card read failed: ${e && e.message}>`; }
  return { rows, sh, oldThinN, treeThin, cardLine, cardThinN, acts: items.length };
}

let bad = 0;
const out = [];
function report(label, pid, r) {
  const { sh, oldThinN, treeThin } = r;
  const fail = (msg) => { bad++; out.push({ pid, fail: msg }); if (!AS_JSON) console.log(`    ✗ ${msg}`); };
  const pass = (msg) => { if (!AS_JSON) console.log(`    ✓ ${msg}`); };
  if (!AS_JSON) {
    console.log(`\n${label} — ${pid}  (${r.acts} formal act(s) on file, ${sh.issues} issue row(s))`);
    console.log(`  before   ${String(sh.strongN).padStart(3)} one way · ${String(sh.splitN).padStart(3)} both ways · ` +
      `${String(oldThinN).padStart(3)} "too thin to characterise"`);
    console.log(`  after    ${String(sh.strongN).padStart(3)} one way · ${String(sh.splitN).padStart(3)} both ways · ` +
      `${String(sh.readThinN).padStart(3)} read thin · ${String(sh.readOtherN).padStart(3)} other side on file · ` +
      `${String(sh.thinN).padStart(3)} "too thin to characterise"   (tail ${sh.tailN})`);
    console.log(`  card     ${r.cardLine || "<no bucket line>"}`);
  }
  const sum = sh.readThinN + sh.readOtherN + sh.thinN;
  sum === sh.tailN ? pass("the three tail buckets are disjoint and sum to tailN")
                   : fail(`readThinN+readOtherN+thinN (${sum}) ≠ tailN (${sh.tailN})`);
  sh.tailN === oldThinN ? pass(`the tail is the same size it was (${oldThinN}) — nothing was promoted out of it`)
                        : fail(`tailN (${sh.tailN}) ≠ the merged bucket (${oldThinN}): a row left the tail`);
  sh.characterised === sh.strongN + sh.splitN
    ? pass("characterised is still strong/mostly plus split")
    : fail(`characterised (${sh.characterised}) ≠ strongN+splitN (${sh.strongN + sh.splitN})`);
  sh.strongN + sh.splitN + sh.tailN === sh.issues
    ? pass("every issue row is in exactly one bucket")
    : fail(`buckets (${sh.strongN + sh.splitN + sh.tailN}) ≠ issue rows (${sh.issues})`);
  // THE ACCEPTANCE, ON THIS FILE. The number of read-thin rows the card counts is
  // the number of thin sides the tree prints. Not "close to" and not "at least".
  sh.readThinN === treeThin.length
    ? pass(`read-thin rows (${sh.readThinN}) = thin sides on the tree (${treeThin.length})`)
    : fail(`read-thin rows (${sh.readThinN}) ≠ thin sides on the tree (${treeThin.length}): ` +
      `[${treeThin.map((l) => l.key).sort().join(", ")}]`);
  r.cardThinN === sh.thinN
    ? pass(`the card's "too thin to characterise" tally is thinN (${sh.thinN})`)
    : fail(`the card says "${r.cardThinN} too thin to characterise" but thinN is ${sh.thinN}`);
  // …and no issue the tree calls thin may be inside that tally, which is the
  // acceptance stated the other way round and worth failing on separately: an
  // implementation that got the count right by coincidence still fails here.
  const thinKeys = new Set(treeThin.map((l) => l.key));
  const leaked = r.rows.filter((x) => thinKeys.has(x.key) && !CHAR[x.tier] && x.tier !== "split" &&
    x.tier !== "thin" && !(x.displayTier || "")).map((x) => x.key);
  leaked.length ? fail(`issue(s) the tree reads as thin landed in the card's "too thin" tally: ${leaked.join(", ")}`)
                : pass("no issue the tree reads as thin is inside the card's \"too thin\" tally");
  out.push({ pid, label, acts: r.acts, issues: sh.issues,
    before: { strongN: sh.strongN, splitN: sh.splitN, thinN: oldThinN },
    after: { strongN: sh.strongN, splitN: sh.splitN, readThinN: sh.readThinN,
             readOtherN: sh.readOtherN, thinN: sh.thinN, tailN: sh.tailN },
    treeThin: treeThin.length, cardLine: r.cardLine });
}

// ── run ─────────────────────────────────────────────────────────────────────
// The default pair is one deep federal file and one deep Utah file, which is the
// pair the change was reported on. --member overrides it.
const DEFAULTS = [{ lane: "federal", pid: "kennedy_john" }, { lane: "utah", pid: "" }];
function deepestUtah(win) {
  // "Deep" is not asserted, it is measured: the Utah member holding the most
  // formal acts in the shipped seeds. Picking by name would make the report a
  // fact about the name.
  const roster = new Set();
  for (const f of ["db/vr-utah-member-map.json", "db/vr-utah-member-map-2024GS.json",
                   "db/vr-utah-member-map-2023GS.json"]) {
    for (const ch of Object.values(J(f).chambers || {})) {
      for (const v of Object.values(ch)) {
        const pid = v && typeof v === "object" ? v.politicianId : v;
        if (pid) roster.add(pid);
      }
    }
  }
  let best = "", n = -1;
  for (const pid of [...roster].sort()) {
    const c = utahItems(pid).length;
    if (c > n) { n = c; best = pid; }
  }
  return best;
}

const targets = ONE ? [{ lane: LANE || "federal", pid: ONE }] : DEFAULTS;
for (const t of targets) {
  const win = boot();
  let pid = t.pid;
  if (t.lane === "utah" && !pid) pid = deepestUtah(win);
  let items = [];
  if (t.lane === "utah") items = utahItems(pid);
  else {
    if (!process.env.NETLIFY_DB_URL) { console.log(`\nfederal — ${pid}: NETLIFY_DB_URL not set, skipped`); continue; }
    items = await federalItems(pid);
  }
  if (!items.length) { console.log(`\n${t.lane} — ${pid}: no formal acts on file, nothing to decompose`); continue; }
  report(t.lane === "utah" ? "Utah state lane (shipped seeds)" : "federal lane (database, as deployed)", pid,
    read(win, pid, items));
}

if (AS_JSON) console.log(JSON.stringify({ ok: !bad, results: out }, null, 2));
else console.log(`\n${bad ? `${bad} check(s) FAILED` : "all checks passed"}`);
process.exit(bad ? 1 : 0);
