#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   ✒️ EXECUTIVE ENACTMENT RECORD — Phase 3 seed gate
   ═══════════════════════════════════════════════════════════════════════════
   Gates the wave-1 action data in db/exec-action-seed.json on three things the
   lane's honesty actually depends on:

     1. SOURCE QUALITY. Every action and every standing must cite a document a
        reader can open. This is not a style rule: "partly blocked in court" is a
        consequential public claim, and the only thing separating it from an
        accusation is the ruling behind it. So the citations are checked against
        the SHIPPED gate (window.PDXExecRecord.sourceOk) and the shipped host
        list, not against a copy of either.

     2. JSON ↔ SQL AGREEMENT. The seed exists twice — as curated JSON for the
        client and as INSERTs in 20260807000000_seed_exec_actions_wave1.sql for
        the database. Two copies of the same citations WILL drift. Every document
        id, every source URL and every issue key in the JSON is required to appear
        in the SQL, so drift fails here instead of shipping a page whose numbers
        disagree with the rows behind them.

     3. THE INVARIANTS, DRIVEN BY THE REAL DATA. execSummary() returns null when
        its buckets do not add up, which means a silent null is indistinguishable
        from "nothing on file". This file therefore asserts the summary is
        non-null AND re-derives the arithmetic independently, rather than trusting
        the guard that would have hidden the failure.

   It also proves the `against` bucket is REACHABLE. With the wave-1 set, no issue
   lands in "acted against it" — every action either matched a stated position or
   had no directional position to check against. That is a fact about this data,
   not a property of the code, and an untested bucket that happens to read 0 is
   indistinguishable from one that can only ever read 0. So a synthetic fixture
   drives an opposing action through the shipped read path and requires the count
   to move.

   Run by `npm test` (scripts/test-*.mjs is globbed). Exits non-zero on failure.
   ═══════════════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => readFileSync(join(ROOT, p), "utf8");
const J = (p) => JSON.parse(R(p));

let fails = 0, checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; console.error("  ✗ " + msg); }
}
function section(t) { console.log("\n" + t); }

const SEED = J("db/exec-action-seed.json");
const TYPES = J("db/exec-action-types.json");
const SUMKEYS = J("db/exec-summary-keys.json");
const ISSUE_KEYS = J("db/issue-keys.json").keys;
const MIGRATION_REL = "netlify/database/migrations/20260807000000_seed_exec_actions_wave1.sql";
const SQL = R(MIGRATION_REL);
const SEED_TEXT = R("db/exec-action-seed.json");

const ACTIONS = (SEED.actions && SEED.actions.trump) || [];
const PRIMARY_HOSTS = TYPES.sourceRule.primaryHosts;
const REJECTED = TYPES.sourceRule.rejectedUrlPatterns.map((p) => new RegExp(p, "i"));
const FORBIDDEN = new RegExp(SUMKEYS.forbidden.pattern, SUMKEYS.forbidden.flags);
const BASES = Object.keys(SEED._sourcingRules.basisValues);
// The Axis B vocabulary, taken from the summary keys rather than restated here, so
// widening the vocabulary is a data change in one file.
const STANDING_TOKENS = Object.values(SUMKEYS.buckets.actions.keys).map((v) => v.token);
const CONTESTED_TOKENS = Object.values(SUMKEYS.buckets.actions.keys)
  .filter((v) => v.contested).map((v) => v.token);

function hostOf(u) { try { return new URL(u).host.toLowerCase(); } catch (e) { return ""; } }

/* ─── the shipped read path, in a sandbox ─────────────────────────────────────
   The real stance data and the real stance resolver are loaded, not stubbed: the
   summary's issue universe is "mapped issues ∪ stated positions", so a stubbed
   stance map would test a denominator the app never uses. politician-stances.js
   provides window.ISSUE_STANCE_DATA, stance-helpers.js provides the
   _polPositionMap feeder consistency.js reads, and exec-record.js is the lane. */
const ctx = { console, JSON, Math, Date, setTimeout, clearTimeout };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
const sandbox = vm.createContext(ctx);
for (const f of ["politician-stances.js", "stance-helpers.js", "exec-record.js"]) {
  vm.runInContext(R(f), sandbox, { filename: f });
}
const EX = ctx.window.PDXExecRecord;
ctx.window.CMP_DATA = { trump: { name: "Donald Trump" } };
const setActions = (list) => { ctx.window.EXEC_ACTIONS = { trump: list }; };
setActions(ACTIONS);

console.log("── ✒️ exec seed: wave-1 actions ──────────────────────────────────");

/* ═════════════════════════════════════════════════════════════════════════════
   1 · SHAPE AND VOCABULARY
   Every token in the seed must already exist in a Phase 1 vocabulary. A seed that
   can introduce its own tokens can introduce an unrendered one, and the lane fails
   open by showing an action with no class rather than closed by refusing it.
   ═══════════════════════════════════════════════════════════════════════════ */
section("1 · shape and vocabulary");
ok(ACTIONS.length === 5, `wave-1 seeds five actions (got ${ACTIONS.length})`);

const seenDocIds = new Set(), seenTitles = new Set(), seenFrDocs = new Set();
for (const a of ACTIONS) {
  const id = a.documentId || "(no documentId)";
  ok(!!a.documentId, `${id}: has a documentId`);
  ok(!seenDocIds.has(a.documentId), `${id}: documentId is unique`);
  seenDocIds.add(a.documentId);
  ok(!seenTitles.has(a.title), `${id}: title is unique`);
  seenTitles.add(a.title);

  ok(!!TYPES.actionClasses[a.actionClass], `${id}: actionClass "${a.actionClass}" is in exec-action-types.json`);
  ok(!!EX.CLASSES[a.actionClass], `${id}: actionClass is renderable by the shipped lane`);
  ok(a.term === EX.currentTerm("trump"), `${id}: term "${a.term}" is the current term`);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(a.actedAt || ""), `${id}: actedAt is an ISO date`);

  // Class-specific identity. An order without its Federal Register citation, or a
  // law without its bill identity, cannot be resolved back to a document.
  if (a.actionClass === "executive_order") {
    ok(Number.isInteger(a.executiveOrderNumber), `${id}: carries an EO number`);
    ok(/^\d+ FR \d+$/.test(a.frCitation || ""), `${id}: carries an FR citation (${a.frCitation})`);
    ok(/^\d{4}-\d{5}$/.test(a.frDocumentNumber || ""), `${id}: carries an FR document number`);
    ok(!seenFrDocs.has(a.frDocumentNumber), `${id}: FR document number is unique — one row per document`);
    seenFrDocs.add(a.frDocumentNumber);
    ok(String(a.executiveOrderNumber) === a.documentId.replace(/\D+/g, ""),
      `${id}: documentId and executiveOrderNumber agree`);
    // Published on or after signing — the reverse would mean the citation belongs
    // to a different document.
    ok(Date.parse(a.publishedAt) >= Date.parse(a.actedAt), `${id}: publishedAt is not before actedAt`);
  } else if (a.actionClass === "signed_law") {
    ok(!!a.measureNumber, `${id}: carries the bill number it was enacted from`);
    ok(Number.isInteger(a.congress), `${id}: carries a congress number`);
    ok(["house", "senate"].includes(a.chamber), `${id}: carries the originating chamber`);
    ok(/^Public Law \d+-\d+$/.test(a.documentId), `${id}: documentId is a Public Law citation`);
  }

  // Issue mappings.
  const maps = a.issues || [];
  ok(maps.length > 0, `${id}: maps at least one issue`);
  const primaries = maps.filter((m) => m.isPrimary);
  ok(primaries.length === 1, `${id}: exactly one primary issue (got ${primaries.length})`);
  const seenIssues = new Set();
  for (const m of maps) {
    ok(ISSUE_KEYS.includes(m.issueKey), `${id}: issueKey "${m.issueKey}" is in db/issue-keys.json`);
    ok(!seenIssues.has(m.issueKey), `${id}: issue "${m.issueKey}" mapped once`);
    seenIssues.add(m.issueKey);
    ok(!!TYPES.issueDirections[m.direction], `${id}/${m.issueKey}: direction "${m.direction}" is in the vocabulary`);
    ok(Number.isInteger(m.weight) && m.weight > 0 && m.weight <= 100, `${id}/${m.issueKey}: weight in 1..100`);
    ok(typeof m.rationale === "string" && m.rationale.trim().length > 20,
      `${id}/${m.issueKey}: rationale explains the mapping`);
  }
  ok(primaries.length === 1 && primaries[0].weight === Math.max(...maps.map((m) => m.weight)),
    `${id}: the primary issue carries the highest weight`);
}

/* ═════════════════════════════════════════════════════════════════════════════
   2 · SOURCE QUALITY — the fail-closed rule, applied to the shipped data
   ═══════════════════════════════════════════════════════════════════════════ */
section("2 · source quality");

// whitehouse.gov is allowed by the Phase 1 rule as a LABELLED SECONDARY link only.
// Nothing in wave 1 needed one, so its total absence is asserted: if a later pass
// adds one, this line is where the decision gets made deliberately rather than by
// a copy-paste from curated marketing copy. Matched as a URL, not as a word — both
// files state the absence in prose, and a word-match would fail on its own
// documentation.
const urlsIn = (text) => new Set(text.match(/https?:\/\/[^\s"')]+/g) || []);
const SEED_URLS = urlsIn(SEED_TEXT);
ok(![...SEED_URLS].some((u) => /whitehouse\.gov/i.test(u)), "no whitehouse.gov URL anywhere in the seed");
ok(![...urlsIn(SQL)].some((u) => /whitehouse\.gov/i.test(u)), "no whitehouse.gov URL anywhere in the migration");
ok(!SEED_TEXT.includes("%"), "no percent sign anywhere in the seed — the no-score rule is structural");

for (const a of ACTIONS) {
  const id = a.documentId;
  ok(EX.sourceOk(a.sourceUrl), `${id}: sourceUrl passes the shipped sourceOk gate`);
  ok(PRIMARY_HOSTS.includes(hostOf(a.sourceUrl)), `${id}: sourceUrl host "${hostOf(a.sourceUrl)}" is a primary host`);
  ok(!!(a.sourceLabel || "").trim(), `${id}: carries a sourceLabel`);
  for (const re of REJECTED) ok(!re.test(a.sourceUrl), `${id}: sourceUrl is not a ${re.source} match`);

  // The source of record must match the CLASS. A signed law cited to the Federal
  // Register, or an order cited to congress.gov, would pass every generic check
  // above while citing the wrong kind of document entirely.
  const expected = TYPES.actionClasses[a.actionClass].sourceHosts;
  ok(expected.includes(hostOf(a.sourceUrl)),
    `${id}: cited to the source of record for a ${a.actionClass} (${expected.join(" / ")})`);

  // ── STANDING ─────────────────────────────────────────────────────────────
  // Every standing carries its own citation. An action with NO standing row is
  // legitimate (exec-record.js routes it to unstatedStanding and discloses it);
  // an action with a standing row and no ruling behind it is not.
  const statuses = a.status || [];
  const seenStatusKeys = new Set();
  for (const s of statuses) {
    const at = `${id}@${s.effectiveAt}`;
    ok(STANDING_TOKENS.includes(s.status), `${at}: status "${s.status}" is in the Axis B vocabulary`);
    ok(!!EX.STANDING[s.status], `${at}: status is renderable by the shipped lane`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(s.effectiveAt || ""), `${at}: effectiveAt is an ISO date`);
    ok(Date.parse(s.effectiveAt) >= Date.parse(a.actedAt), `${at}: standing is not dated before the action`);
    ok(!seenStatusKeys.has(s.status + s.effectiveAt), `${at}: one row per status change`);
    seenStatusKeys.add(s.status + s.effectiveAt);

    ok(EX.sourceOk(s.sourceUrl), `${at}: standing sourceUrl passes the shipped gate`);
    ok(PRIMARY_HOSTS.includes(hostOf(s.sourceUrl)), `${at}: standing cited to a primary host (${hostOf(s.sourceUrl)})`);
    ok(!!(s.sourceLabel || "").trim(), `${at}: standing carries a sourceLabel`);
    // "Never 'a court' — an unnamed authority is not a citation."
    ok((s.authority || "").trim().length > 8, `${at}: standing names its authority`);
    ok((s.note || "").trim().length > 30, `${at}: standing says what happened`);
    ok(BASES.includes(s.basis), `${at}: basis "${s.basis}" is a declared basis value`);

    // THE LIMIT DISCLOSURE. Only court_ruling can support a claim about litigation.
    // Any weaker basis must say so IN ITS OWN NOTE, where a reader sees it — not
    // only in this file's documentation block, where nobody does.
    if (s.basis !== "court_ruling") {
      ok(/not (a statement about|the outcome of) any challenge/i.test(s.note),
        `${at}: a ${s.basis} standing discloses that it says nothing about any challenge`);
    }
    // And the symmetric guard, which is the one that matters. Without it, a standing
    // could escape the disclosure above simply by relabelling its basis
    // `court_ruling` — the strongest claim in the vocabulary would become the easiest
    // to assert. So claiming a ruling requires citing one: a named court, and a
    // document served by a court rather than by the register.
    if (s.basis === "court_ruling") {
      ok(/court|circuit|justice|judge/i.test(s.authority),
        `${at}: a court_ruling basis names the court that ruled`);
      ok(/courtlistener\.com|uscourts\.gov|supremecourt\.gov/i.test(hostOf(s.sourceUrl)),
        `${at}: a court_ruling basis cites a court document, not a register entry (${hostOf(s.sourceUrl)})`);
    }
    // A contested standing is exactly the claim that needs a ruling behind it.
    if (CONTESTED_TOKENS.includes(s.status)) {
      ok(s.basis === "court_ruling", `${at}: a contested standing rests on a ruling`);
      ok(/court|circuit|justice|judge/i.test(s.authority), `${at}: a contested standing names a court`);
    }
    // The human-readable case page, where one is carried alongside the opinion PDF.
    if (s.caseUrl) {
      ok(EX.sourceOk(s.caseUrl), `${at}: caseUrl passes the shipped gate`);
      ok(PRIMARY_HOSTS.includes(hostOf(s.caseUrl)), `${at}: caseUrl is on a primary host`);
    }
  }
}

/* Vote language on an EER surface. `rationale` and `note` are rendered strings, and
   the congressional lane's own curated rationales say things like "a yea vote cuts
   against expanding healthcare access" — carrying one across verbatim is the single
   most likely way vote language reaches this lane. Scoped to seed prose only,
   because `consistent` / `mixed` are legitimate tokens elsewhere in the app. */
section("3 · no vote language, no grades on rendered seed prose");
for (const a of ACTIONS) {
  const prose = [
    ...(a.issues || []).map((m) => [`${a.documentId}/${m.issueKey} rationale`, m.rationale]),
    ...(a.status || []).map((s) => [`${a.documentId}@${s.effectiveAt} note`, s.note])
  ];
  for (const [where, text] of prose) {
    const hit = String(text).match(FORBIDDEN);
    ok(!hit, `${where}: no forbidden vocabulary${hit ? ` (matched "${hit[0]}")` : ""}`);
  }
}

/* ═════════════════════════════════════════════════════════════════════════════
   4 · ONE DOCUMENT PER ROW — the dedupe, held in place
   The curated spotlight data carried the day-one energy order twice under a single
   headline that also folded in a second, separate order (EO 14156). Removing the
   duplicate is only half the fix; this is the half that keeps it removed.
   ═══════════════════════════════════════════════════════════════════════════ */
section("4 · one document per row (energy dedupe)");
const SPOTLIGHT = R("acct-spotlight-data.js");
const DUP_HEADLINE = "Declared a national energy emergency to expand production";
const dupCount = SPOTLIGHT.split(DUP_HEADLINE).length - 1;
ok(dupCount <= 1, `curated spotlight carries the day-one energy headline at most once (found ${dupCount})`);

const energyPrimary = ACTIONS.filter((a) => (a.issues || []).some((m) => m.isPrimary && m.issueKey === "energy_production"));
ok(energyPrimary.length === 1, `exactly one action leads on energy_production (got ${energyPrimary.length})`);
// EO 14156 is a wave-2 candidate: it is deliberately NOT here, and if it arrives it
// must arrive as its own row with its own standing rather than inside this one.
ok(!ACTIONS.some((a) => a.executiveOrderNumber === 14156), "EO 14156 is not folded into the EO 14154 row");

/* ═════════════════════════════════════════════════════════════════════════════
   5 · JSON ↔ SQL AGREEMENT
   ═══════════════════════════════════════════════════════════════════════════ */
section("5 · the migration matches the seed");

// Migration ordering. The platform refuses a pending migration whose version sorts
// before the applied maximum, and this repo hand-picks versions ahead of the calendar
// — so the version has to be chosen, not inherited from `drizzle-kit generate`.
// What holds permanently is DEPENDENCY order: this seed inserts into
// vr_exec_action_status, so it must sort after the migration that creates it. (An
// assertion that this seed is the NEWEST migration in the tree would be true today
// and false the moment any unrelated migration lands, so it is deliberately not made
// here; scripts/test-exec-vocab.mjs holds the same chain from the other end.)
const MIG_DIR = join(ROOT, "netlify/database/migrations");
const migEntries = readdirSync(MIG_DIR);
const versionOf = (f) => (f.match(/^(\d+)/) || [])[1] || "";
const seedVersion = versionOf("20260807000000_seed_exec_actions_wave1.sql");
const versions = migEntries.map(versionOf).filter(Boolean);
ok(new Set(versions).size === versions.length, "no two migrations share a version prefix");
const standingLog = migEntries.find((f) => /_create_vr_exec_action_status$/.test(f));
ok(!!standingLog && versionOf(standingLog) < seedVersion,
  `this seed sorts after the migration that creates vr_exec_action_status (${standingLog})`);
ok(statSync(join(MIG_DIR, "20260807000000_seed_exec_actions_wave1.sql")).isFile(),
  "seeds ship as a bare .sql — no schema change, so no drizzle snapshot to chain");

// Destructive statements, with `--` comments stripped first: the header of that file
// discusses DROP and TRUNCATE by name in prose, and a scan that cannot tell prose
// from SQL would fail on its own documentation.
const SQL_CODE = SQL.replace(/^\s*--.*$/gm, "");
for (const re of [/\bDROP\b/i, /\bTRUNCATE\b/i, /\bDELETE\s+FROM\b/i, /\bALTER\s+TABLE\b/i, /\bUPDATE\s+\w+\s+SET\b/i]) {
  ok(!re.test(SQL_CODE), `migration contains no ${re.source} statement — additive only`);
}
ok(/ON CONFLICT \(measure_id, issue_key\) DO NOTHING/.test(SQL_CODE), "issue rows are idempotent");
ok(/ON CONFLICT \(measure_id, politician_id, action_type\) DO NOTHING/.test(SQL_CODE), "position rows are idempotent");
ok((SQL_CODE.match(/WHERE NOT EXISTS \(SELECT 1 FROM vr_exec_action_status/g) || []).length ===
   ACTIONS.reduce((n, a) => n + (a.status || []).length, 0),
  "every standing row is guarded by an existence check");

// Every citation and every issue key in the JSON appears in the SQL.
for (const a of ACTIONS) {
  const id = a.documentId;
  ok(SQL.includes(id), `${id}: document id appears in the migration`);
  ok(SQL_CODE.includes(a.sourceUrl), `${id}: source of record appears in the migration`);
  ok(SQL_CODE.includes(a.actedAt), `${id}: action date appears in the migration`);
  if (a.frCitation) ok(SQL.includes(a.frCitation), `${id}: FR citation appears in the migration`);
  for (const m of a.issues || []) {
    ok(new RegExp(`'${m.issueKey}'`).test(SQL_CODE), `${id}/${m.issueKey}: issue row is in the migration`);
  }
  for (const s of a.status || []) {
    ok(SQL_CODE.includes(s.sourceUrl), `${id}@${s.effectiveAt}: standing citation appears in the migration`);
    ok(SQL_CODE.includes(s.effectiveAt), `${id}@${s.effectiveAt}: standing date appears in the migration`);
  }
}
// Direction agreement, spot-checked where it matters most: the four H.R. 1 mappings
// that cut AGAINST an issue. If the SQL quietly recorded them as yea_supports, a
// signed omnibus would read as a clean win in the 🏛️ lane and a mixed one here.
const hr1 = ACTIONS.find((a) => a.documentId === "Public Law 119-21");
const hr1Opposes = (hr1.issues || []).filter((m) => m.direction === "opposes").map((m) => m.issueKey);
ok(hr1Opposes.length === 4, `H.R. 1 carries four opposing mappings (${hr1Opposes.join(", ")})`);
for (const k of hr1Opposes) {
  ok(new RegExp(`'${k}',\\s*\\d+,\\s*(?:true|false),\\s*'yea_opposes'`).test(SQL_CODE),
    `H.R. 1/${k}: recorded as yea_opposes in the migration`);
}
// Every source_url the migration writes must still be openable and not an index.
for (const u of new Set(SQL_CODE.match(/https:\/\/[^\s')]+/g) || [])) {
  ok(/^https:\/\//.test(u), `migration URL is https: ${u}`);
  for (const re of REJECTED) ok(!re.test(u), `migration URL is not a directory index or fact sheet: ${u}`);
}

/* ═════════════════════════════════════════════════════════════════════════════
   6 · THE INVARIANTS, DRIVEN BY THE REAL SEED
   execSummary() returns null when its buckets disagree. That is the right failure
   mode for the app and the wrong one for a test: a null is indistinguishable from
   "nothing on file". So the arithmetic is re-derived here.
   ═══════════════════════════════════════════════════════════════════════════ */
section("6 · read-path invariants on the real seed");
const sum = EX.summary("trump");
ok(!!sum, "execSummary returns a summary (a null here means an invariant failed)");
if (sum) {
  const A = sum.issues, B = sum.actions, C = sum.byClass;
  ok(A.aligned + A.against + A.bothWays + A.noActionFound + A.noStance === A.total,
    "Axis A buckets sum to the issue total");
  ok(B.inForce + B.partlyBlocked + B.blocked + B.struckDown + B.rescinded + B.superseded + B.expired === B.total,
    "Axis B buckets sum to the action total");
  ok(C.signed_law + C.vetoed_law + C.executive_order + C.directive === ACTIONS.length,
    "class counts sum to the actions on file");
  ok(B.total + sum.unstatedStanding === ACTIONS.length, "every action is either given a standing or disclosed as lacking one");
  // The two totals are different units. Asserting they are unequal here is not a
  // style point: it means any renderer that reads one for the other produces a
  // visibly wrong number rather than a plausible one.
  ok(SUMKEYS.buckets.issues.unit !== SUMKEYS.buckets.actions.unit,
    `Axis A counts ${SUMKEYS.buckets.issues.unit}s and Axis B counts ${SUMKEYS.buckets.actions.unit}s`);

  ok(sum.score === null, "summary score is null");
  ok(C.signed_law === 2 && C.executive_order === 3, `class split is 2 laws + 3 orders (got ${C.signed_law}+${C.executive_order})`);

  // "Upgrade or hold" — verified as an outcome, not a promise. Every wave-1 item
  // cleared the source gate, and every one carries a citable standing.
  ok(sum.dropped === 0, `no wave-1 action was held back for a weak source (dropped ${sum.dropped})`);
  ok(sum.unstatedStanding === 0, `every wave-1 action has a cited standing (uncited ${sum.unstatedStanding})`);

  // Axis B is doing real work: EO 14248 is partly blocked, so the standing clause is
  // sticky and `contested` must be true.
  ok(B.partlyBlocked === 1, `one action is partly blocked (got ${B.partlyBlocked})`);
  ok(sum.contested === true, "the summary reports the record as contested");
  ok(/Standing: /.test(sum.label), "the standing clause is present in the label whenever anything is contested");

  // The framing leads. Not a disclaimer underneath the numbers — the first clause.
  ok(sum.label.startsWith(EX.FRAMING), `the label leads with "${EX.FRAMING}"`);
  ok(!sum.label.includes("%"), "the label carries no percent sign");
  const labHit = sum.label.match(FORBIDDEN);
  ok(!labHit, `the generated label uses no forbidden vocabulary${labHit ? ` (matched "${labHit[0]}")` : ""}`);
  const tip = EX.summaryTip(sum);
  ok(!tip.includes("%"), "the tip carries no percent sign");
  const tipHit = tip.match(FORBIDDEN);
  ok(!tipHit, `the tip uses no forbidden vocabulary${tipHit ? ` (matched "${tipHit[0]}")` : ""}`);

  // noActionFound is coverage, and it is nonzero here — so the disclosure that it is
  // coverage rather than a finding must actually be shown.
  ok(A.noActionFound > 0, "issues with a stated position and no action on file are counted");
  ok(/coverage, not a finding/.test(tip), "the tip says in words that no-action-found is coverage");

  // All-terms scope. Everything in wave 1 is term 47, so the two scopes agree — and
  // the tip must not then claim a larger all-time figure.
  const all = EX.summary("trump", { allTerms: true });
  ok(!!all && all.actions.total === B.total, "the all-terms scope sees the same five actions");
  ok(sum.allTimeTotal === ACTIONS.length, "the all-time total counts every sourced action");
}

// Per-issue reads: score is null on every one, and the primary issue of each action
// resolves to a verdict token with the action attached.
for (const a of ACTIONS) {
  const primary = (a.issues || []).find((m) => m.isPrimary);
  const res = EX.issue("trump", primary.issueKey);
  ok(res.score === null, `${primary.issueKey}: per-issue score is null`);
  ok(res.actions.some((x) => x.documentId === a.documentId), `${primary.issueKey}: ${a.documentId} is attached to its primary issue`);
  ok(res.token !== "no_record", `${primary.issueKey}: resolves to a verdict, not an empty record`);
}
// EO 14248 is the worked example: three rulings, and the current standing is the
// latest of them — which is the whole reason the log is append-only.
const eo14248 = ACTIONS.find((a) => a.executiveOrderNumber === 14248);
ok(eo14248.status.length === 3, `EO 14248 carries three standing rows (got ${eo14248.status.length})`);
ok(EX.standingOf(eo14248) === "partly_blocked", "EO 14248's current standing is the latest ruling on file");
ok(new Set(eo14248.status.map((s) => s.sourceUrl)).size === 3, "each of the three rulings carries its own citation");

/* ═════════════════════════════════════════════════════════════════════════════
   7 · THE NEGATIVE BUCKETS ARE REACHABLE
   Wave 1 puts nothing in `against` and nothing in `bothWays`. That is a true fact
   about this data — every action either advances an issue the figure says they
   support, or cuts against one they say they oppose, and the second of those is
   alignment, not opposition. But a bucket reading 0 because nothing landed in it is
   indistinguishable from one reading 0 because nothing CAN, and the second would
   make this lane a scoreboard with extra steps. These two fixtures prove which it
   is. Both are synthetic, both are torn down, and the teardown is asserted.
   ═══════════════════════════════════════════════════════════════════════════ */
section("7 · the negative buckets are reachable, not decorative");
const baseline = EX.summary("trump");
const fixture = (issueKey, direction, status) => ({
  actionClass: "executive_order",
  documentId: "TEST — synthetic fixture, not real data",
  title: "Synthetic fixture action",
  actedAt: "2025-06-01", term: "47",
  sourceUrl: "https://www.federalregister.gov/documents/2025/06/01/2025-99999/synthetic-fixture",
  sourceLabel: "Fixture",
  issues: [{ issueKey, direction, isPrimary: true, weight: 100, rationale: "Fixture." }],
  status: status || []
});

// (a) `against`. crypto_cbdc is a stated 'support' with no wave-1 action, so it sits
// in noActionFound today. One opposing action must move it to `against` — and must
// NOT be folded into coverage, which is the failure mode decision 5 forbids in the
// other direction.
setActions([...ACTIONS, fixture("crypto_cbdc", "opposes")]);
const vsAgainst = EX.summary("trump");
ok(!!vsAgainst, "the summary survives an action that cuts against a stated position");
if (vsAgainst && baseline) {
  ok(vsAgainst.issues.against === baseline.issues.against + 1,
    `an opposing action lands in against (${baseline.issues.against} → ${vsAgainst.issues.against})`);
  ok(vsAgainst.issues.noActionFound === baseline.issues.noActionFound - 1,
    "the issue leaves coverage when an action for it arrives");
  ok(/acted against it on 1/.test(vsAgainst.label), "the label reports the opposing action in words");
  // No citable standing on this fixture, so it must be DISCLOSED rather than assumed.
  ok(vsAgainst.unstatedStanding === 1, "an action with no citable standing is disclosed, not assumed in force");
  ok(/no confirmed standing on file/.test(vsAgainst.label), "the label discloses the uncited standing");
}

// (b) `bothWays`. deportations already has two advancing actions; one opposing action
// on the same issue must read as both directions rather than resolving to whichever
// side has more behind it. This is the check that a count never becomes a majority.
setActions([...ACTIONS, fixture("deportations", "opposes")]);
const vsBoth = EX.summary("trump");
if (vsBoth && baseline) {
  ok(vsBoth.issues.bothWays === baseline.issues.bothWays + 1,
    `advancing and opposing actions on one issue read as both ways (${baseline.issues.bothWays} → ${vsBoth.issues.bothWays})`);
  ok(vsBoth.issues.aligned === baseline.issues.aligned - 1,
    "the issue leaves aligned rather than staying there on a count of two-against-one");
}

setActions(ACTIONS); // teardown — every later read is back on the real seed
const restored = EX.summary("trump");
ok(restored.unstatedStanding === 0 && restored.issues.against === 0 && restored.issues.bothWays === 0,
  "fixtures torn down; the real seed is unchanged");

/* ─── result ──────────────────────────────────────────────────────────────── */
console.log("");
if (fails) {
  console.error(`✗ exec seed: ${fails} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`✓ exec seed: ${checks} checks passed — 5 actions, ${ACTIONS.reduce((n, a) => n + (a.status || []).length, 0)} cited standings, JSON ⇄ SQL in agreement`);
