#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The Official Record face — the count is the list, and thin rows teach the case
// ─────────────────────────────────────────────────────────────────────────────
// Two trust failures on the dossier face, pinned so they cannot come back.
//
// A · COUNT HONESTY. The face carries three numbers: L1's judged count, L2's
//   "N listed here", and the depth line's "N votes on record". They came from
//   three different reads and only the first two were ever checked against each
//   other. Whatever any of them claims, a reader has to be able to OPEN that many
//   instruments — or be told, on the face, how many they cannot reach and why.
//
//   The root cause of the mismatch was _orProofPicks' dedupe key. It exists for
//   one collision (the summary's two representative votes are also members of the
//   full item list) and it was built from five OPTIONAL identifier fields. Sibling
//   records with blank ids — same measure, same day, same question — hashed
//   identically and all but the first were dropped, while the engine summary went
//   on counting every one. Six judged, one listed, and L1 promised the other five
//   would "arrive with this member's full roll-call record" when they had already
//   arrived and been thrown away.
//
// B · MECHANISM ON THIN ROWS. A contradicted verdict resting on ONE vote has no
//   pattern to carry the argument, so the row has to make the case itself: what
//   they SAID, what the instrument DID, and WHY the second cuts against the first.
//   Before this the face printed the act, the link and the chip — every fact true,
//   the comparison nowhere. A deep record is left alone: repeating the stated
//   position on all twelve rows is noise, and L1 already says it once.
//
//   node scripts/test-record-face-honesty.mjs
//
// Loads the real modules into a node:vm sandbox with a fake DOM, seeds the vote
// cache directly and renders the real HTML. No database, no network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const mkEl = () => {
  const cls = new Set();
  const el = {
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "", parentNode: null,
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), toggle() {}, contains: (c) => cls.has(c) },
    _classes: cls, _attrs: {},
    setAttribute(k, v) { el._attrs[k] = v; }, getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    focus() {}, scrollIntoView() {}, addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild(c) { if (c) c.parentNode = el; return c; },
    querySelector: (s) => el._kids[s] || null, querySelectorAll: () => [], _kids: {},
  };
  return el;
};
const newEl = () => {
  const back = mkEl(), sheet = mkEl(), body = mkEl();
  sheet.parentNode = back; back._kids[".pdxgap-sheet"] = sheet; sheet._kids[".pdxgap-body"] = body;
  return back;
};
const ctx = {
  console, JSON, Math, Date, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN,
  encodeURIComponent, decodeURIComponent,
  requestAnimationFrame: (f) => setTimeout(f, 0), fetch: () => new Promise(() => {}),
  location: { href: "/", search: "", hash: "" }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: {
    readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
    createElement: newEl, createTextNode: mkEl, getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
ctx.window._pdxNavJump = () => {}; ctx.window._pdxRevealTarget = () => {};

// ── Roster ──────────────────────────────────────────────────────────────────
// THIN is the shape the brief names: one roll call, a stated position it cuts
// against, a Contradicted verdict. DEEP is the control — twelve votes the same
// way, where the pattern carries the argument and the teaching lines must stay
// off. COLLIDE is the count-honesty regression: six distinct records that share
// every field the old dedupe key hashed on.
const THIN = "rep_thin", DEEP = "rep_deep", COLLIDE = "rep_collide", ALIGNED = "rep_aligned";
const MIXED = "rep_mixed", OMNI = "rep_omni";
const ISSUE = "voting_rights";
const SAID = "I support secure, accessible elections that every eligible voter can trust.";
ctx.ISSUE_MAP = {
  voting_rights: { label: "Secure & Accessible Voting" },
  lower_taxes: { label: "Lower Taxes" },
  healthcare: { label: "Health Care" },
};
// As it appears in rendered HTML — the ampersand is escaped on the way out, and an
// assertion written against the raw label would be silently checking nothing.
const LABEL_HTML = "Secure &amp; Accessible Voting";
const stances = [
  { issueKey: ISSUE, issueStance: "support", text: SAID },
  { issueKey: "lower_taxes", issueStance: "support" },
  { issueKey: "healthcare", issueStance: "support" },
];
ctx.ISSUE_STANCE_DATA = {}; ctx.PROFILES = {}; ctx.CMP_DATA = {};
for (const pid of [THIN, DEEP, COLLIDE, ALIGNED, MIXED, OMNI]) {
  ctx.ISSUE_STANCE_DATA[pid] = stances;
  ctx.PROFILES[pid] = { name: "Member " + pid, office: "U.S. Representative", state: "Utah", party: "R" };
  ctx.CMP_DATA[pid] = {};
}
ctx.window._getPhotoUrl = () => "";

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "voting-record.js", "exec-record.js", "pdx-learn.js", "consistency.js"]) {
  vm.runInContext(readFileSync(join(ROOT, file), "utf8"), sandbox, { filename: file });
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (s, sub, m) => ok(String(s).includes(sub), `${m}\n    missing ${JSON.stringify(sub)}`);
const hasnt = (s, sub, m) => ok(!String(s).includes(sub), `${m}\n    should not contain ${JSON.stringify(sub)}`);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ record face: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const src = { url: "https://www.congress.gov/roll-call-vote/1", label: "Congress.gov" };
const supports = [{ issueKey: ISSUE, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }];
const opposes = [{ issueKey: ISSUE, weight: 100, isPrimary: true, supportMeaning: "yea_opposes" }];

// Scalise-shaped: one Yea on a question where a Yea counts AGAINST the issue.
ctx.PDXVotingRecord._records[THIN] = [{
  kind: "vote", rollcallId: 7, measureId: 77, number: "H.Res. 1", date: "2021-01-06",
  action: "On Objection", position: "yea", isProcedural: false,
  title: "Objection to certifying the 2020 electoral count",
  source: src, issues: opposes,
}];
// Twelve votes, all with the stated position.
ctx.PDXVotingRecord._records[DEEP] = Array.from({ length: 12 }, (_, i) => ({
  kind: "vote", rollcallId: 200 + i, measureId: 300 + i, number: "H.R. " + (10 + i),
  date: "2025-0" + ((i % 9) + 1) + "-14", action: "On Passage", position: "yea",
  isProcedural: false, title: "Voting Access Act " + (i + 1), source: src, issues: supports,
}));
// Six sibling divisions of one measure, voted the same day on the same question,
// arriving with no roll-call or measure id — the exact collision the old key hashed
// flat. Three each way, so the row is genuinely Mixed and every one is judged.
ctx.PDXVotingRecord._records[COLLIDE] = Array.from({ length: 6 }, (_, i) => ({
  kind: "vote", rollcallId: "", measureId: "", number: "H.R. 4", date: "2025-05-01",
  action: "On Passage", position: i < 3 ? "yea" : "nay", isProcedural: false,
  title: "Voting Access Act, division " + (i + 1), source: src, issues: supports,
}));
// One vote, WITH the stated position: thin, but backed up rather than contradicted.
ctx.PDXVotingRecord._records[ALIGNED] = [{
  kind: "vote", rollcallId: 8, measureId: 88, number: "H.R. 14", date: "2025-04-02",
  action: "On Passage", position: "yea", isProcedural: false,
  title: "Voting Access Act", source: src, issues: supports,
}];
// Two votes, one each way — thin AND mixed, which is the second verdict the brief
// puts in scope and the only shape where the same row has to say both things.
ctx.PDXVotingRecord._records[MIXED] = [
  {
    kind: "vote", rollcallId: 21, measureId: 121, number: "H.R. 21", date: "2025-06-04",
    action: "On Passage", position: "yea", isProcedural: false,
    title: "Voting Access Act", source: src, issues: supports,
  },
  {
    kind: "vote", rollcallId: 22, measureId: 122, number: "H.R. 22", date: "2025-06-11",
    action: "On Passage", position: "nay", isProcedural: false,
    title: "Ballot Integrity Act", source: src, issues: supports,
  },
];
// One vote, mapped to three issues, contradicting the stated position on this one:
// a thin contradicted row that ALSO carries the multi-issue disclosure, which is the
// one control on this face that names a count of something other than instruments.
ctx.PDXVotingRecord._records[OMNI] = [{
  kind: "vote", rollcallId: 31, measureId: 131, number: "H.R. 31", date: "2025-07-09",
  action: "On Passage", position: "yea", isProcedural: false,
  title: "Consolidated Appropriations and Election Administration Act",
  source: src,
  issues: [
    { issueKey: ISSUE, weight: 100, isPrimary: true, supportMeaning: "yea_opposes" },
    { issueKey: "lower_taxes", weight: 80, isPrimary: false, supportMeaning: "yea_supports" },
    { issueKey: "healthcare", weight: 40, isPrimary: false, supportMeaning: "yea_opposes" },
  ],
}];

const C = ctx.window.PDXConsistency;
must(C && typeof C.dossierRecordsHtml === "function" && typeof C.dossierCoverage === "function" &&
     typeof C.dossierSummaryHtml === "function" && typeof C.dossierItems === "function",
  "PDXConsistency no longer exports the dossier face — nothing below is being rendered");
const rowsIn = (html) => (String(html).match(/class="pdxdos-rec" data-pdxdos-i=/g) || []).length;
const headCount = (html) => Number((String(html).match(/🏛️<\/span> (\d+) /) || [])[1]);
const CS = readFileSync(join(ROOT, "consistency.js"), "utf8");

// ═══════════════════════════════════════════════════════════════════════════
// A · THE COUNT IS THE LIST
// ═══════════════════════════════════════════════════════════════════════════

// ── A1. The collision that produced the mismatch ───────────────────────────
// Every one of the six is reachable. This is the regression: with the old
// five-field key this listed ONE row and the face claimed six.
{
  const items = C.dossierItems(COLLIDE, ISSUE);
  const cov = C.dossierCoverage(COLLIDE, ISSUE);
  const recs = C.dossierRecordsHtml(COLLIDE, ISSUE);
  must(cov.judged === 6,
    `the collision fixture is not judging all six records (judged ${cov.judged}) — the count ` +
    "honesty assertions below would pass on a fixture that never reproduced the bug");
  eq(items.length, 6,
    "collision: six records that share every identifier field are six instruments, not one —\n" +
    "    a dedupe built for the summary's two representative picks must not eat sibling records");
  eq(rowsIn(recs), 6, "collision: and the expander opens onto all six");
  eq(cov.missing, 0,
    "collision: with nothing dropped there is no gap left to disclose — the count reconciles\n" +
    "    at the source rather than being papered over with a 'the rest arrive later' notice");
  hasnt(recs, "pdxdos-gap",
    "collision: so the face must NOT print the loading disclosure, which would now be a false\n" +
    "    promise — those records are already here");
  // The enumeration on the closed summary names one entry per row, so the count is
  // auditable without opening anything.
  const listed = (recs.match(/class="pdxdos-recs-list">([^<]*)</) || [])[1] || "";
  eq(listed.split(" · ").length, 6, "collision: the closed enumeration names all six too");
}

// ── A2. Every face: claimed = reachable ────────────────────────────────────
// The general contract, checked across all four shapes rather than on the one
// that broke. L1's judged count, L2's headline and the row count are one number
// or the difference is disclosed on the face.
for (const pid of [THIN, DEEP, COLLIDE, ALIGNED, MIXED, OMNI]) {
  const cov = C.dossierCoverage(pid, ISSUE);
  const recs = C.dossierRecordsHtml(pid, ISSUE);
  const l1 = C.dossierSummaryHtml(pid, ISSUE);
  eq(headCount(recs), rowsIn(recs),
    `${pid}: the number on the closed summary is the number of rows it opens onto`);
  eq(cov.listed, rowsIn(recs), `${pid}: and dossierCoverage counts the same rows`);
  if (cov.missing) {
    has(recs, "pdxdos-gap", `${pid}: an unreachable judged item is disclosed, never silently dropped`);
  } else {
    // No gap → L1 must say outright that everything judged is reachable, in a
    // sentence that survives the singular.
    const claim = cov.judged === 1 ? "It is listed below" : "All " + cov.judged + " are listed below";
    has(l1, claim, `${pid}: L1 states that all ${cov.judged} judged item(s) are reachable`);
  }
}

// ── A3. "All 1 are listed below" is not a sentence ─────────────────────────
// The singular lands on exactly the rows this pass is about — a contradicted
// verdict resting on one vote — so it is the one a reader is most likely to meet.
{
  const l1 = C.dossierSummaryHtml(THIN, ISSUE);
  has(l1, "1 judged vote on this issue", "L1 thin: the judged count is singular in its own clause");
  has(l1, "It is listed below", "L1 thin: and the reachability claim reads as English");
  hasnt(l1, "All 1 are", "L1 thin: not 'All 1 are listed below', which is a plural with a 1 dropped in");
  hasnt(C.dossierSummaryHtml(DEEP, ISSUE), "It is listed below",
    "L1 deep: and the plural is untouched where it is correct");
}

// ── A4. The depth line reconciles on the dossier face ──────────────────────
// "N votes on record" is a third count, read from _rowEvidenceCount rather than
// from the coverage reconciliation. On a stance row that is a claim about a record
// the reader is not looking at. Inside the dossier it sits a finger's width above
// the list, so it reads as a claim ABOUT the list and has to reconcile with it.
{
  const l1 = C.dossierSummaryHtml(DEEP, ISSUE);
  has(l1, "12 votes on record · all of them listed below",
    "L1 depth: the dossier's depth line says the record it names is the record below it");
  has(C.dossierSummaryHtml(THIN, ISSUE), "1 vote on record · all of it listed below",
    "L1 depth: singular included, because that is the row that most needs to be believed");
}
{
  // And where it genuinely cannot reach them, it names BOTH numbers rather than
  // printing the bigger one alone. Reproduced the way it happens in the app: the
  // engine summary is warm and the per-issue item detail has not landed.
  const real = ctx.window._pdxRecordIssueItems;
  ctx.window._pdxRecordIssueItems = () => null;
  const cov = C.dossierCoverage(DEEP, ISSUE);
  const l1 = C.dossierSummaryHtml(DEEP, ISSUE);
  const recs = C.dossierRecordsHtml(DEEP, ISSUE);
  must(cov.missing > 0,
    "the cold-items fixture no longer produces a short list — the no-silent-truncation " +
    "assertions below would be vacuous");
  has(l1, cov.listed + " of 12 votes on record open below",
    "L1 gap: the depth line names what is reachable AND what is on file, in that order");
  hasnt(l1, "all of them listed below",
    "L1 gap: and drops the reconciled claim rather than printing it beside a short list");
  has(recs, "pdxdos-gap", "L2 gap: the list says how many are missing…");
  has(recs, "Nothing has been dropped", "L2 gap: …and that they are still counted in the verdict");
  eq(headCount(recs), rowsIn(recs), "L2 gap: the headline is still the row count, not the judged count");
  ctx.window._pdxRecordIssueItems = real;
}

// ═══════════════════════════════════════════════════════════════════════════
// B · THIN CONTRADICTED ROWS TEACH THE COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

// ── B1. Said / did / why, on the face of the row ───────────────────────────
{
  const recs = C.dossierRecordsHtml(THIN, ISSUE);
  const row = recs.slice(recs.indexOf('data-pdxdos-i="0"'));
  must(row.length > 0 && row !== recs, "the thin dossier rendered no instrument row to read");
  has(row, "They said:", "thin: SAID — the stated position is on the row, not only once at L1");
  has(row, SAID.slice(0, 40),
    "thin: and it is their own sourced words rather than a paraphrase of them");
  has(row, "What it did:", "thin: DID — in plain language, assembled from the question and the ballot");
  has(row, "Voted Yea on the question", "thin: naming the ballot and what it was cast on");
  ok(row.includes("Why it counts here:") || row.includes("How it was linked:"),
    "thin: WHY IT COUNTS — the link to this issue is stated, in whichever voice it was written");
  has(row, "Said versus did:",
    "thin: and the comparison itself is a line, not something the reader has to perform");
  has(row, "they said they support " + LABEL_HTML,
    "thin: the comparison names the stated direction…");
  has(row, "pushed the other way",
    "thin: …and that this instrument went against it — which is the whole finding");
  has(row, "That gap is what this row records as “Says one thing, does another”",
    "thin: tied to the verdict chip's own words, so the sentence and the chip cannot disagree");
  ok(!/they said they supports/.test(row),
    "thin: 'they said they supports' — the clause takes the bare stem, not third-person singular");
}

// ── B2. The comparison is REPORTED, not invented ───────────────────────────
// The direction it asserts is read off the mapping and the ballot. Flip the ballot
// and the sentence flips with it; nothing here is a stored opinion about the vote.
{
  const aligned = C.dossierRecordsHtml(ALIGNED, ISSUE);
  const arow = aligned.slice(aligned.indexOf('data-pdxdos-i="0"'));
  const cov = C.dossierCoverage(ALIGNED, ISSUE);
  must(cov.judged === 1, "the aligned fixture is not a one-vote row — B2 would not be comparing like with like");
  hasnt(arow, "Said versus did:",
    "aligned: a row that BACKS UP the stated position is not a contradicted or mixed row, so the\n" +
    "    teaching beats stay off it — the brief scopes them to the rows that need explaining");
  hasnt(arow, "They said:", "aligned: including the stated-position line");
}
{
  // A Mixed row IS in scope, and there the same machinery has to say "the same way"
  // on the votes that align and "the other way" on the ones that do not — the row is
  // mixed precisely because both happen, and that is the thing a verdict word alone
  // cannot tell a reader.
  const r = C.issueRow(MIXED, ISSUE);
  const cov = C.dossierCoverage(MIXED, ISSUE);
  must(r.verdict.token === "mixed" && cov.judged === 2,
    `the mixed fixture reads ${r.verdict.token} on ${cov.judged} judged item(s), not mixed on 2 — ` +
    "the mixed-row scope below would be untested");
  const recs = C.dossierRecordsHtml(MIXED, ISSUE);
  has(recs, "They said:", "mixed: a thin mixed row carries the stated position too");
  has(recs, "pushed the same way", "mixed: the vote that aligned says so in the same words");
  has(recs, "pushed the other way", "mixed: and the one that cut the other way says that");
  has(recs, "That match is what this row records as",
    "mixed: an aligned item's closer reads as a match, not as a gap");
}

// ── B3. A deep record is left alone ────────────────────────────────────────
// Twelve rows each repeating the stated position verbatim is noise a reader learns
// to skip, and the pattern is its own explanation at that depth.
{
  const recs = C.dossierRecordsHtml(DEEP, ISSUE);
  eq(rowsIn(recs), 12, "deep: the fixture really is twelve rows deep");
  hasnt(recs, "They said:", "deep: so the stated position is not reprinted on every one of them");
  hasnt(recs, "Said versus did:", "deep: nor the comparison the pattern already makes");
  has(recs, "What it did:", "deep: the three machine-assembled lines are unchanged");
  has(recs, "Which way it cut:", "deep: including the one that produces the chip");
}

// ── B4. Both lanes, one gate ───────────────────────────────────────────────
// The face is shared between the congressional and executive lanes, so the teaching
// beats key off the ROW (verdict + judged depth) and the item's own recorded
// direction — never off which lane it came from.
{
  must(/function _dosTeach\(/.test(CS), "_dosTeach was renamed — the lane-neutrality check below is reading nothing");
  const gate = CS.slice(CS.indexOf("function _dosTeach("), CS.indexOf("function _dosSaidLine("));
  hasnt(gate, "'record'", "gate: the teaching decision does not branch on the congressional lane");
  hasnt(gate, "'exec'", "gate: nor on the executive one");
  has(gate, "_DOS_TEACH_TOKENS", "gate: it keys off the row's verdict…");
  has(gate, "_DOS_TEACH_MAX", "gate: …and how many items were judged behind it");
  // The direction the comparison asserts comes from fields that exist on both lanes.
  must(/function _dosItemDir\(/.test(CS), "_dosItemDir was renamed");
  const dir = CS.slice(CS.indexOf("function _dosItemDir("), CS.indexOf("var _DOS_STANCE_VERB"));
  has(dir, "d.effect", "direction: the executive lane's recorded effect is read, not re-derived");
  has(dir, "d.support", "direction: and the congressional lane's support meaning");
  has(dir, "return ''", "direction: with an honest empty where the file establishes neither");
}

// ── B5. The multi-issue disclosure counts readings, and opens onto all of them ─
// The one control on this face that names a count of something OTHER than
// instruments: "🧩 3 issues" and "See all 3 readings" are claims about how many ways
// one document was read, and the brief's rule is that they may not run ahead of what
// the trail actually lists. Untested until now, and it sits on exactly the row shape
// section B is about — a thin contradicted row that is also an omnibus.
{
  must(typeof C.instrumentTrail === "function" && typeof C.instrumentTrailHtml === "function",
    "PDXConsistency no longer exports the instrument trail — the disclosure count is unchecked");
  const items = C.dossierItems(OMNI, ISSUE);
  const cov = C.dossierCoverage(OMNI, ISSUE);
  must(items.length === 1 && items[0].multi,
    "the omnibus fixture is not a single multi-issue row — B5 is checking nothing");
  const recs = C.dossierRecordsHtml(OMNI, ISSUE);
  const n = items[0].item.issues.length;
  eq(n, 3, "omnibus: the fixture maps three issues");
  has(recs, "🧩 " + n + " issues", "omnibus: the chip names how many issues the document was read on");
  has(recs, "See all " + n + " readings", "omnibus: and the control offers exactly that many");
  has(recs, "mapped to " + n + " issues and is judged separately on each",
    "omnibus: the disclosure stays, in words rather than as a bare count");
  // The trail behind the control. Every named reading has to be a row a reader can
  // see, including the ones whose own issue has no open record — those say so on their
  // face rather than being dropped, which is what keeps the count from running ahead
  // of the list.
  const trail = C.instrumentTrail(OMNI, ISSUE, 0);
  must(!!trail, "the omnibus row builds no trail — the count assertions below would be vacuous");
  eq(trail.count, n, "omnibus: the trail's own count is the number of mapped issues");
  eq(trail.rows.length, n,
    "omnibus: and it carries one row per reading the control promised — a multi-issue\n" +
    "    disclosure may not claim more readings than it can show");
  const html = C.instrumentTrailHtml(OMNI, ISSUE, 0);
  eq((html.match(/data-pdxins-k="/g) || []).length, n,
    "omnibus: the rendered trail opens onto all of them, not a subset");
  ok(trail.rows.every((r) => r.listed || r.held || r.heldWhy !== undefined),
    "omnibus: a reading with no open row on its own issue is still a row here");
  // Thin AND contradicted, so the teaching beats are on it too — the multi-issue
  // caveat does not displace them.
  ok(cov.judged >= 1 && cov.judged <= 3, "omnibus: the row is thin, so section B applies to it");
  has(recs, "They said:", "omnibus: the stated position is on the row…");
  has(recs, "Said versus did:", "omnibus: …and so is the comparison, beside the 🧩 caveat");
}

// ═══════════════════════════════════════════════════════════════════════════
// C · NOTHING HERE MOVED A SCORE
// ═══════════════════════════════════════════════════════════════════════════
// Presentation only. The verdicts, the judged counts and the pooled inputs read the
// same before and after, and the face still prints exactly one percentage — the
// profile's, in the header, never a second one per issue.
for (const pid of [THIN, DEEP, COLLIDE, ALIGNED, MIXED, OMNI]) {
  const r = C.issueRow(pid, ISSUE);
  const l1 = C.dossierSummaryHtml(pid, ISSUE);
  ok(typeof r.verdict.token === "string" && r.verdict.token.length > 0,
    `${pid}: the row still resolves exactly one verdict`);
  eq(r.actions.judged, C.dossierCoverage(pid, ISSUE).judged,
    `${pid}: the count the score divides by is the count the face reconciles against`);
  eq((l1.match(/%/g) || []).length, 0,
    `${pid}: L1 prints no percentage — the sheet's one number lives in the header`);
}
// The teaching lines are additive strings on the row model and touch nothing the
// engine reads. Pinned at the source: the mechanism builder returns them alongside
// the existing slots and does not write to the item.
{
  must(/function _dosMechanism\(/.test(CS), "_dosMechanism was renamed");
  const mech = CS.slice(CS.indexOf("function _dosMechanism("));
  const body = mech.slice(0, mech.indexOf("\n  }"));
  has(body, "said: _dosSaidLine", "mechanism: the said beat is a returned string…");
  has(body, "gap: _dosGapLine", "mechanism: …and so is the comparison");
  hasnt(body, "d.verdict =", "mechanism: nothing on this path assigns a verdict");
  hasnt(body, "weight", "mechanism: or touches a weight");
}

if (failures.length) {
  console.error("✗ record face honesty: " + failures.length + " failure(s)");
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log("✓ record face honesty: all " + passed + " assertions passed — the count is the list, " +
  "and thin contradicted rows say what was claimed, what was done and why the two do not match");
