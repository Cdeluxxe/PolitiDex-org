#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   ✒️ EXECUTIVE ENACTMENT RECORD — seed gate
   ═══════════════════════════════════════════════════════════════════════════
   Gates the curated action data in db/exec-action-seed.json — wave 1 (Phase 3),
   wave 2 and wave 3 — on three things the lane's honesty actually depends on:

     1. SOURCE QUALITY. Every action and every standing must cite a document a
        reader can open. This is not a style rule: "partly blocked in court" is a
        consequential public claim, and the only thing separating it from an
        accusation is the ruling behind it. So the citations are checked against
        the SHIPPED gate (window.PDXExecRecord.sourceOk) and the shipped host
        list, not against a copy of either.

     2. JSON ↔ SQL AGREEMENT. The seed exists twice — as curated JSON for the
        client and as INSERTs in the wave migrations for the database. Two copies
        of the same citations WILL drift. Every document id, every source URL and
        every issue key in the JSON is required to appear in the SQL, so drift
        fails here instead of shipping a page whose numbers disagree with the rows
        behind them. The waves are read as one body of text: an applied migration
        can never be edited, so a backfill lands in a new file and a check that
        cared which file would break on the first one.

     3. THE INVARIANTS, DRIVEN BY THE REAL DATA. execSummary() returns null when
        its buckets do not add up, which means a silent null is indistinguishable
        from "nothing on file". This file therefore asserts the summary is
        non-null AND re-derives the arithmetic independently, rather than trusting
        the guard that would have hidden the failure.

   It also proves the `against` bucket is REACHABLE. With the curated set, no issue
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
// The seed ships as SQL across one migration per wave, and every wave's rows are
// read here as one body of text: an assertion that a citation "appears in the
// migration" must not care which wave wrote it, or the first backfill would have to
// choose between editing an applied migration and failing this suite.
const MIGRATION_RELS = [
  "netlify/database/migrations/20260807000000_seed_exec_actions_wave1.sql",
  "netlify/database/migrations/20260808000000_seed_exec_actions_wave2.sql",
  "netlify/database/migrations/20260824000000_seed_exec_actions_wave3.sql",
  "netlify/database/migrations/20260826000000_seed_exec_actions_wave4.sql",
  "netlify/database/migrations/20260828000000_seed_exec_actions_wave5.sql",
  "netlify/database/migrations/20260829000000_seed_exec_actions_wave6.sql",
  "netlify/database/migrations/20260830000000_seed_exec_actions_wave7.sql",
  "netlify/database/migrations/20260831000000_seed_exec_actions_wave8.sql"
];
const SQL = MIGRATION_RELS.map(R).join("\n");
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

console.log("── ✒️ exec seed: curated actions ─────────────────────────────────");

/* ═════════════════════════════════════════════════════════════════════════════
   1 · SHAPE AND VOCABULARY
   Every token in the seed must already exist in a Phase 1 vocabulary. A seed that
   can introduce its own tokens can introduce an unrendered one, and the lane fails
   open by showing an action with no class rather than closed by refusing it.
   ═══════════════════════════════════════════════════════════════════════════ */
section("1 · shape and vocabulary");
// Pinned, because the point of the count is to notice a wave that silently half
// landed: five from wave 1, EO 14156 from wave 2, eleven from wave 3, ten from wave 4,
// nine from wave 5, four from wave 6.
ok(ACTIONS.length === 56, `the seed carries fifty-six actions — 5 from wave 1, 1 from wave 2, 11 from wave 3, 10 from wave 4, 9 from wave 5, 4 from wave 6, 8 from wave 7, 8 from wave 8 (got ${ACTIONS.length})`);

/* TERM SCOPE IS REAL, and this is the assertion that keeps it real.
   This line used to read `a.term === EX.currentTerm("trump")`, which was true of
   every row for six waves and was therefore enforcing the defect wave 7 exists to
   fix: while every action carried the current term, actionsFor(pid, 'all_time') and
   actionsFor(pid, '47') returned the same set, the term filter separated nothing,
   and the profile placed second-term effort next to first-term results. So the rule
   is inverted. A term must be a term — a bare numeral this lane can filter on — and
   the file must contain BOTH the current term and at least one earlier one, or the
   filter is untested by the data it filters. */
const TERMS = new Set(ACTIONS.map((a) => String(a.term || "")));
for (const a of ACTIONS) ok(/^\d{2}$/.test(String(a.term || "")), `${a.documentId || "(no documentId)"}: term "${a.term}" is an ordinal term number`);
ok(TERMS.has(EX.currentTerm("trump")), `the seed carries actions from the current term (${EX.currentTerm("trump")})`);
ok(TERMS.size > 1, `the seed carries more than one term, or the term filter is dead data (terms: ${[...TERMS].join(", ")})`);
const priorTerm = ACTIONS.filter((a) => String(a.term) !== EX.currentTerm("trump"));
ok(priorTerm.length >= 8, `at least eight actions predate the current term (got ${priorTerm.length})`);
// And the filter is exercised, not merely fed: the two scopes must disagree.
const SCOPE_ALL = EX.actionsFor("trump", { allTerms: true });
const SCOPE_CUR = EX.actionsFor("trump", {});
ok(SCOPE_ALL.kept.length > SCOPE_CUR.kept.length,
  `all_time keeps more actions than the current term — the term scope separates the record (${SCOPE_ALL.kept.length} vs ${SCOPE_CUR.kept.length})`);
ok(SCOPE_ALL.kept.length - SCOPE_CUR.kept.length === priorTerm.length,
  `every prior-term action survives the source gate and is reachable in the all-time scope (gap ${SCOPE_ALL.kept.length - SCOPE_CUR.kept.length}, prior-term rows ${priorTerm.length})`);

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
    // only in this file's documentation block, where nobody does. pending_litigation
    // is exempted from THIS wording and held to its own, below: a row whose whole
    // subject is a challenge cannot honestly say it says nothing about one.
    if (s.basis !== "court_ruling" && s.basis !== "pending_litigation") {
      ok(/(not (a statement about|the outcome of)|says nothing about) any challenge/i.test(s.note),
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
    // pending_litigation is the weakest basis in the vocabulary and the only one that
    // reports an unresolved state, so it carries the tightest guard. It must cite a
    // court document (a complaint is still a court filing, not a press account), name
    // the court the challenge sits in, and state IN THE NOTE that no court has
    // resolved it. That last one is the whole disclosure: without it the row reads as
    // an accusation with a citation attached, which is the failure mode this basis
    // exists to avoid.
    if (s.basis === "pending_litigation") {
      ok(/courtlistener\.com|uscourts\.gov|supremecourt\.gov/i.test(hostOf(s.sourceUrl)),
        `${at}: a pending_litigation basis cites a court document (${hostOf(s.sourceUrl)})`);
      ok(/court|circuit|judge/i.test(s.authority),
        `${at}: a pending_litigation basis names the court the challenge is pending in`);
      ok(/\bno (court|ruling)\b/i.test(s.note) && /\bruling\b/i.test(s.note),
        `${at}: a pending_litigation standing states in its note that no ruling resolves it`);
      ok(s.status === "challenged_unverified",
        `${at}: pending_litigation supports only challenged_unverified, never a ruling token`);
    }
    // A contested standing is exactly the claim that needs a source behind it, and
    // the source depends on WHO acted. Three-way rather than two-way, because two
    // ways was wrong: it required a court_ruling for every contested token except
    // challenged_unverified, and `rescinded` is contested but is never a court's
    // doing — it is a later President revoking an earlier President's order, which
    // the Federal Register's disposition record is the authoritative register of.
    // Under the old rule a real revocation could only be filed by naming a court
    // that never ruled, so wave 7 could not have filed one at all. The split keeps
    // each claim tied to the record that can establish it: a court ACTED needs the
    // court's own ruling; a court has NOT acted needs the filing that shows the
    // challenge is live; an order was REVOKED needs the register entry, and must
    // name the revoking instrument rather than a court.
    if (CONTESTED_TOKENS.includes(s.status)) {
      const wantBasis = s.status === "challenged_unverified" ? "pending_litigation"
        : s.status === "rescinded" ? "register_disposition"
        : "court_ruling";
      ok(s.basis === wantBasis, `${at}: a ${s.status} standing rests on ${wantBasis}`);
      if (s.status === "rescinded") {
        // The revoking instrument, by number and date. "Revoked" with no named
        // revoker is the same unfalsifiable claim as "a court" with no named court.
        ok(/executive order \d+|proclamation \d+|public law \d+-\d+/i.test(s.authority),
          `${at}: a rescinded standing names the instrument that revoked it`);
        ok(!/court|circuit|justice|judge/i.test(s.authority),
          `${at}: a rescinded standing does not name a court — revocation is a presidential act`);
        ok(/federalregister\.gov/i.test(hostOf(s.sourceUrl)),
          `${at}: a rescinded standing cites the register's disposition record (${hostOf(s.sourceUrl)})`);
        // Quoted, not paraphrased. The disposition note is one line and the whole
        // claim rests on it, so it goes in the note where a reader can check it.
        ok(/revoked by:/i.test(s.note),
          `${at}: a rescinded standing quotes the register's own 'Revoked by:' disposition note`);
      } else {
        ok(/court|circuit|justice|judge/i.test(s.authority), `${at}: a contested standing names a court`);
      }
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

// One document per row is the rule; "one row per issue" was never the rule. Two
// actions now lead on energy_production, and that is the dedupe WORKING rather than
// failing: EO 14154 and EO 14156 are two separate documents signed the same day, and
// they carry different standings. What must never come back is the folded card — one
// row describing both — so the check is on identity, not on the issue.
const energyPrimary = ACTIONS.filter((a) => (a.issues || []).some((m) => m.isPrimary && m.issueKey === "energy_production"));
const energyIds = energyPrimary.map((a) => a.documentId);
ok(new Set(energyIds).size === energyIds.length,
  `each energy-leading action is its own document (${energyIds.join(", ")})`);
const eo14154 = ACTIONS.find((a) => a.executiveOrderNumber === 14154);
const eo14156 = ACTIONS.find((a) => a.executiveOrderNumber === 14156);
ok(!!eo14154 && !!eo14156, "EO 14154 and EO 14156 are both on file");
ok(eo14154.documentId !== eo14156.documentId && eo14154.sourceUrl !== eo14156.sourceUrl &&
   eo14154.frCitation !== eo14156.frCitation && eo14154.frDocumentNumber !== eo14156.frDocumentNumber,
  "EO 14156 is not folded into the EO 14154 row — separate id, source, citation and document number");
// The proof the split was necessary, asserted rather than argued: a single folded row
// would have had to publish one standing for two documents, and these two do not
// share one. If they ever converge this check goes quiet on its own; it fails only if
// someone merges the rows back together.
ok(eo14154.status.length >= 1 && eo14156.status.length >= 1, "both energy orders carry a standing log");
ok(EX.standingOf(eo14154) !== EX.standingOf(eo14156),
  `the two energy orders resolve to different standings (${EX.standingOf(eo14154)} / ${EX.standingOf(eo14156)})`);

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
/* TWO SUMMARIES, AND THE DIFFERENCE IS THE POINT. `sum` is the default scope, which
   is the current term — it is what the profile renders, so the label, the tip and
   the standing clause are checked against it. `sumAll` is the all-terms scope, and
   from wave 7 on it is the only one whose arithmetic can be reconciled against the
   whole file: eight of the forty-eight rows are Term 45 and the current-term scope
   is supposed to exclude them. Before wave 7 these two objects were identical and
   the distinction below would have been untestable. */
const sumAll = EX.summary("trump", { allTerms: true });
ok(!!sum, "execSummary returns a summary (a null here means an invariant failed)");
ok(!!sumAll, "execSummary returns an all-terms summary");
if (sum && sumAll) {
  const A = sum.issues, B = sum.actions, C = sumAll.byClass;
  const BA = sumAll.actions;
  ok(A.aligned + A.against + A.bothWays + A.noActionFound + A.noStance === A.total,
    "Axis A buckets sum to the issue total");
  // Summed from the vocabulary's own bucket keys rather than a hand-written list, so
  // widening Axis B cannot leave this check silently summing the old vocabulary.
  const bKeys = Object.keys(SUMKEYS.buckets.actions.keys);
  ok(bKeys.reduce((n, k) => n + (B[k] || 0), 0) === B.total,
    `Axis B buckets sum to the action total (${bKeys.length} buckets)`);
  ok(bKeys.reduce((n, k) => n + (BA[k] || 0), 0) === BA.total,
    `Axis B buckets sum to the action total in the all-terms scope too (${bKeys.length} buckets)`);
  ok(C.signed_law + C.vetoed_law + C.executive_order + C.directive === ACTIONS.length,
    "class counts sum to the actions on file");
  ok(BA.total + sumAll.unstatedStanding === ACTIONS.length, "every action is either given a standing or disclosed as lacking one");
  // The two totals are different units. Asserting they are unequal here is not a
  // style point: it means any renderer that reads one for the other produces a
  // visibly wrong number rather than a plausible one.
  ok(SUMKEYS.buckets.issues.unit !== SUMKEYS.buckets.actions.unit,
    `Axis A counts ${SUMKEYS.buckets.issues.unit}s and Axis B counts ${SUMKEYS.buckets.actions.unit}s`);

  ok(sum.score === null, "summary score is null");
  ok(C.signed_law === 7 && C.executive_order === 36 && C.directive === 10 && C.vetoed_law === 3,
    `class split is 7 laws + 36 orders + 10 directives + 3 vetoes (got ${C.signed_law}+${C.executive_order}+${C.directive}+${C.vetoed_law})`);
  // The veto class existed in the vocabulary for six waves with no row using it.
  // Pinned so a later edit cannot quietly empty it again: an unexercised class is a
  // pipeline nobody has proven works.
  ok(C.vetoed_law > 0, "the vetoed_law class is exercised by real data, not only declared in the vocabulary");

  // "Upgrade or hold" — verified as an outcome, not a promise. Every item in every
  // wave cleared the source gate, and every one carries a citable standing.
  ok(sum.dropped === 0, `no action was held back for a weak source (dropped ${sum.dropped})`);
  ok(sum.unstatedStanding === 0, `every action has a cited standing (uncited ${sum.unstatedStanding})`);
  ok(sumAll.dropped === 0, `no prior-term action was held back for a weak source either (dropped ${sumAll.dropped})`);
  ok(sumAll.unstatedStanding === 0, `every prior-term action has a cited standing (uncited ${sumAll.unstatedStanding})`);

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

  /* ALL-TERMS SCOPE. This assertion used to read `all.actions.total === B.total`,
     with a comment explaining that everything on file was term 47 so the two scopes
     agreed. That agreement was the defect. The scopes must now disagree by exactly
     the number of prior-term rows, and the rescinded standings the first term
     contributes must be visible in the wider scope and only there. */
  ok(sumAll.actions.total - B.total === priorTerm.length,
    `the all-terms scope sees every prior-term action and the current-term scope sees none of them (${sumAll.actions.total} vs ${B.total}, ${priorTerm.length} prior-term rows)`);
  ok(sumAll.actions.rescinded === 4 && B.rescinded === 0,
    `the four revoked orders are reachable in the all-terms scope only (all ${sumAll.actions.rescinded}, current ${B.rescinded})`);
  ok(sum.allTimeTotal === ACTIONS.length, "the all-time total counts every sourced action");
  ok(sum.allTimeTotal > B.total,
    "the current-term summary discloses a larger all-time figure rather than presenting its own total as the whole record");
}

// Per-issue reads: score is null on every one, and the primary issue of each action
// resolves to a verdict token with the action attached. The scope is chosen per row —
// a Term 45 document is by design NOT reachable in the current-term scope, so asking
// for it there and calling the absence a failure would be testing the filter backwards.
for (const a of ACTIONS) {
  const primary = (a.issues || []).find((m) => m.isPrimary);
  const scope = String(a.term) === EX.currentTerm("trump") ? {} : { allTerms: true };
  const res = EX.issue("trump", primary.issueKey, scope);
  ok(res.score === null, `${primary.issueKey}: per-issue score is null`);
  ok(res.actions.some((x) => x.documentId === a.documentId), `${primary.issueKey}: ${a.documentId} is attached to its primary issue`);
  ok(res.token !== "no_record", `${primary.issueKey}: resolves to a verdict, not an empty record`);
  if (scope.allTerms) {
    ok(!EX.issue("trump", primary.issueKey, {}).actions.some((x) => x.documentId === a.documentId),
      `${primary.issueKey}: ${a.documentId} is a prior-term document and does not leak into the current-term scope`);
  }
}
/* A VETO INVERTS, AND THIS IS THE ASSERTION THAT SAYS SO IN BOTH DIRECTIONS.
   The mapping on a veto row states what the VETOED MEASURE would have done, because
   that is what the column means in the congressional lane it shares. The lane must
   report the opposite — the act blocked the measure. Getting this backwards is not a
   loud failure: it silently files a veto of a resolution terminating the border
   emergency as an action AGAINST border security, which reads as balance and is the
   flattering error, not the obvious one. Both readings are therefore pinned: the
   mapping the seed carries, and the direction the lane reports off it. */
{
  const vetoes = ACTIONS.filter((a) => a.actionClass === "vetoed_law");
  ok(vetoes.length === 3, `three vetoes are on file to check the inversion against (got ${vetoes.length})`);
  for (const v of vetoes) {
    for (const m of v.issues || []) {
      const flipped = EX.issueDirection(v, m);
      ok(flipped && flipped !== m.direction,
        `${v.documentId}/${m.issueKey}: a blocking class must invert its mapping (mapped ${m.direction}, reported ${flipped})`);
    }
  }
  // A non-blocking class must NOT invert, or the fix would be a new bug pointing the
  // other way.
  for (const a of ACTIONS.filter((x) => x.actionClass !== "vetoed_law")) {
    for (const m of a.issues || []) {
      ok(EX.issueDirection(a, m) === m.direction,
        `${a.documentId}/${m.issueKey}: a non-blocking class reports its mapping unchanged`);
    }
  }
  // The worked example, end to end. H.J. Res. 46 would have terminated the border
  // emergency — mapped 'opposes' — and the veto kept it, so the lane reads it as
  // advancing border_security, the same way EO 13767 does. Two documents, one
  // direction: the issue must NOT read "both ways" off them.
  const hj = ACTIONS.find((a) => a.documentId === "H.J. Res. 46 (116th Congress)");
  const hjMap = hj.issues.find((m) => m.issueKey === "border_security");
  ok(hjMap.direction === "opposes", "H.J. Res. 46's mapping describes the resolution, which cut against border_security");
  ok(EX.issueDirection(hj, hjMap) === "advances", "the veto of it is read as advancing border_security");
  const bsAll = EX.issue("trump", "border_security", { allTerms: true });
  ok(bsAll.actions.every((x) => x.direction === "advances"),
    `every border_security action across all terms runs one way (got ${bsAll.actions.map((x) => x.direction).join(",")})`);
  ok(bsAll.token === "acted_on_it",
    `border_security does not read as acted-both-ways off documents pointing the same way (got ${bsAll.token})`);
  const shown = bsAll.actions.find((x) => x.documentId === "H.J. Res. 46 (116th Congress)");
  ok(shown.inverted === true && shown.mappedDirection === "opposes",
    "the per-issue read shows its work: the mapped direction and the inversion are both carried");
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

// (a) `against`. The issue is CHOSEN FROM THE DATA rather than named. This check was
// originally written against crypto_cbdc, which was a stated 'support' with nothing
// on file; wave 3 gave that issue two real advancing actions, which would have turned
// the fixture into a `bothWays` case while the assertion still said `against`. A
// hardcoded key does not fail when the data moves under it — it quietly starts
// proving something else.
//
// Wave 8 moved the data again, and further than that: it filled the LAST stated
// `support` position that had nothing on file (immigration_reform), so the pool this
// check used to draw from is now empty. That is the milestone, not a defect — every
// position this figure states in support is now testable against a document. But it
// means the fixture can no longer be built by APPENDING to the real seed, because
// there is no longer an issue for which appending is the first action.
//
// So the fixture now STRIPS instead. It picks a stated `support` issue, removes every
// real action touching it, confirms the issue falls to `said_not_done` in that
// stripped pool, and then adds the opposing fixture to the same pool. The proof is
// unchanged and its force is unchanged — an opposing action on a stated support
// position must land in `against` and must leave `noActionFound` — and the baseline it
// is measured against is the stripped pool rather than the shipped one. `baseline`
// above stays on the real seed, because (b) and the teardown check still need it.
const positionMap = ctx.window._polPositionMap("trump", ctx.window.CMP_DATA.trump) || {};
const strippedPool = (key) => ACTIONS.filter((a) => !(a.issues || []).some((m) => m.issueKey === key));
const noActionKey = Object.keys(positionMap).sort().find((k) => {
  if (positionMap[k].stance !== "support") return false;
  setActions(strippedPool(k));
  return EX.issue("trump", k).token === "said_not_done";
});
ok(!!noActionKey, "a stated 'support' position reads said_not_done once its actions are stripped, to drive the against fixture");
const POOL = noActionKey ? strippedPool(noActionKey) : ACTIONS;
setActions(POOL);
const strippedBase = EX.summary("trump");
setActions([...POOL, fixture(noActionKey, "opposes")]);
const vsAgainst = EX.summary("trump");
ok(!!vsAgainst, "the summary survives an action that cuts against a stated position");
if (vsAgainst && strippedBase) {
  ok(vsAgainst.issues.against === strippedBase.issues.against + 1,
    `an opposing action lands in against (${noActionKey}: ${strippedBase.issues.against} → ${vsAgainst.issues.against})`);
  ok(vsAgainst.issues.noActionFound === strippedBase.issues.noActionFound - 1,
    "the issue leaves coverage when an action for it arrives");
  ok(new RegExp("acted against it on " + vsAgainst.issues.against).test(vsAgainst.label),
    "the label reports the opposing action in words");
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
// Compared against the baseline taken before the first fixture, not against hard
// zeros. The real seed DOES carry an `against` issue now — H.R. 1 tested against the
// stated commitment to reduce the debt — and pinning zero here would quietly demand
// that the seed never contain a contradiction.
ok(restored.unstatedStanding === baseline.unstatedStanding &&
   restored.issues.against === baseline.issues.against &&
   restored.issues.bothWays === baseline.issues.bothWays,
  "fixtures torn down; the real seed is unchanged");

/* ─── result ──────────────────────────────────────────────────────────────── */
console.log("");
if (fails) {
  console.error(`✗ exec seed: ${fails} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`✓ exec seed: ${checks} checks passed — ${ACTIONS.length} actions, ${ACTIONS.reduce((n, a) => n + (a.status || []).length, 0)} cited standings, JSON ⇄ SQL in agreement`);
