#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The issue index — four result buckets, every row a door into the dossier
// ─────────────────────────────────────────────────────────────────────────────
// ⚖️ Word vs Action's issue-by-issue breakdown used to be one stack: the two sharp
// buckets open, everything else behind a single "Show N more issues" fold. That
// revealed the other outcomes only partially — a reader could not tell nine clean
// issues from three clean and six untested without opening something — and a fold
// is where reading stops, so the buckets that reached it were, in practice, the
// buckets nobody saw. And the rows went nowhere: they were text.
//
// It is now an index. What that has to mean, and what is pinned here:
//
//   · FOUR DISTINCT BUCKETS, all of them on the face. Every live outcome gets a
//     counted chip in the switcher and a panel of its own. Nothing behind a lid.
//   · THE COVERAGE PILE IS NOT A RESULT. "Not enough record yet" is listed,
//     counted and reachable like the others, drawn quieter, ordered last, and
//     never the bucket the index opens on while real results exist.
//   · EVERY ROW IS THE TAP TARGET — the button IS the row, not a chevron inside
//     it — and it opens the SAME assembled dossier the stance rows open, carrying
//     its own id as the origin so the trip back lands on the line it left.
//   · THE PATH IS CONTINUOUS. The dossier header repeats the bucket's word, in
//     the bucket's colour, under a title carrying the issue's colour. One
//     vocabulary, owned by PDXWordAction, read by consistency.js — never restated.
//   · NO SECOND SCOREBOARD. A profile has exactly one score and it is the
//     Direction Match above this block. The index may print a percentage only as a
//     PER-ISSUE figure on the row that owns it, inside .pdxwa-oc-pct and carrying
//     its own scope label; nothing else in the index prints one, the shape strip
//     prints none at all, and the denominator is said once, in words, at the foot.
//   · FAIL CLOSED. No consistency module, no navigation. No bucket for a verdict,
//     no bucket line — rather than a fifth word invented for the same four
//     outcomes.
//
//   node scripts/test-issue-index.mjs
//
// Loads the real modules into one node:vm sandbox with a fake DOM. The row model
// is stubbed for the presentation checks — the index is presentation, and stubbing
// it is what lets all four buckets exist at once — and left real for the lane and
// dossier-continuity checks. No database, no network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

// ── Fake DOM ────────────────────────────────────────────────────────────────
// Enough for the gap sheet to mount, plus a capturable document click listener:
// the switcher and the row tap are delegated, so the only way to test them as
// BEHAVIOUR rather than as source text is to hold the handler and call it.
const byId = new Map();
const docClick = [];
const mkEl = () => {
  const cls = new Set();
  const el = {
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "",
    parentNode: null,
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); },
      contains: (c) => cls.has(c),
    },
    _classes: cls, _attrs: {},
    setAttribute(k, v) { el._attrs[k] = v; }, getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    focus() {}, scrollIntoView() {},
    addEventListener() {}, removeEventListener() {}, remove() {},
    // Registering the id here is what makes document.getElementById() real, and it
    // has to be: the gap sheet finds its own backdrop by id, and a lookup that
    // always answers null hides both a sheet that never mounted and one that
    // mounted twice.
    appendChild(c) {
      if (c) { c.parentNode = el; if (c.id) byId.set(c.id, c); }
      return c;
    },
    removeChild(c) {
      if (c) { c.parentNode = null; if (c.id && byId.get(c.id) === c) byId.delete(c.id); }
      return c;
    },
    querySelector: (sel) => el._kids[sel] || null,
    querySelectorAll: () => [],
    _kids: {},
  };
  return el;
};
const newEl = () => {
  const back = mkEl(), sheet = mkEl(), body = mkEl();
  sheet.parentNode = back;
  back._kids[".pdxgap-sheet"] = sheet;
  sheet._kids[".pdxgap-body"] = body;
  return back;
};
const ctx = {
  console, JSON, Math, Date, setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN,
  encodeURIComponent, decodeURIComponent,
  requestAnimationFrame: (f) => setTimeout(f, 0), fetch: () => new Promise(() => {}),
  location: { href: "/", search: "", hash: "" }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: {
    readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
    createElement: newEl, createTextNode: mkEl,
    getElementById: (id) => byId.get(id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener: (type, fn) => { if (type === "click") docClick.push(fn); },
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
ctx.window._pdxNavJump = () => {};
ctx.window._pdxRevealTarget = () => {};

// ── The palette, stubbed ────────────────────────────────────────────────────
// Real enough to answer the two questions both surfaces ask it: is this a core
// issue, and what does it paint. `healthcare` is deliberately NOT core, so the
// "an unmapped key gets no spine rather than a neutral one" rule is exercised.
const CORE = { lower_taxes: "#7fd4c1", border_security: "#e2a06a" };
ctx.window.PDXIssueColors = {
  isCore: (k) => Object.prototype.hasOwnProperty.call(CORE, k),
  getIssueColor: (k) => ({ mapped: Object.prototype.hasOwnProperty.call(CORE, k), color: CORE[k] || "#9fb4d4" }),
  styleFor: (k) => (CORE[k] ? `--pdx-ic:${CORE[k]};--pdx-ic-wash:${CORE[k]}22;` : ""),
};

// ── Roster ──────────────────────────────────────────────────────────────────
const MEMBER = "rep_index", PREZ = "trump";
const ISSUE = "lower_taxes";
ctx.ISSUE_MAP = {
  lower_taxes: { label: "Lower Taxes" },
  healthcare: { label: "Health Care" },
  border_security: { label: "Border Security" },
};
const stances = [
  { issueKey: ISSUE, issueStance: "support" },
  { issueKey: "healthcare", issueStance: "support" },
  { issueKey: "border_security", issueStance: "support" },
];
ctx.ISSUE_STANCE_DATA = { [MEMBER]: stances, [PREZ]: stances };
ctx.PROFILES = {
  [MEMBER]: { name: "Marta Solano", office: "U.S. Representative", district: "ID-02", state: "Idaho", party: "R" },
  [PREZ]: { name: "The President", office: "President of the United States", party: "R" },
};
ctx.CMP_DATA = { [MEMBER]: {}, [PREZ]: {} };
ctx.window._getPhotoUrl = () => "";

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "voting-record.js", "exec-record.js", "pdx-learn.js",
                    "consistency.js", "word-action.js"]) {
  vm.runInContext(read(file), sandbox, { filename: file });
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (s, sub, m) => ok(String(s).includes(sub), `${m} — missing ${JSON.stringify(sub)}`);
const hasnt = (s, sub, m) => ok(!String(s).includes(sub), `${m} — should not contain ${JSON.stringify(sub)}`);

const C = ctx.window.PDXConsistency;
const WA = ctx.window.PDXWordAction;

// ── Seeds ───────────────────────────────────────────────────────────────────
// A congressional record with two bills on the tax issue, so the 🏛️ lane's noun
// ("votes") is real rather than asserted off a stub.
const SRC_C = { url: "https://www.congress.gov/roll-call-vote/11", label: "Congress.gov" };
ctx.PDXVotingRecord._records[MEMBER] = [
  {
    kind: "vote", rollcallId: 11, measureId: 101, number: "H.R. 1", date: "2025-07-03",
    action: "On Passage", position: "yea", isProcedural: false,
    title: "One Big Beautiful Bill Act", source: SRC_C,
    issues: [{ issueKey: ISSUE, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  },
  {
    kind: "vote", rollcallId: 9, measureId: 109, number: "H.R. 9", date: "2025-03-11",
    action: "On Passage", position: "yea", isProcedural: false,
    title: "Taxpayer Relief Act", source: SRC_C,
    issues: [{ issueKey: ISSUE, weight: 90, isPrimary: true, supportMeaning: "yea_supports" }],
  },
];
// An executive record on the same issue, so the ✒️ lane's noun ("executive
// actions") is real too.
const SRC_X = "https://www.federalregister.gov/documents/2025/1";
const inForce = [{ status: "in_force", effectiveAt: "2025-02-01", sourceUrl: SRC_X, sourceLabel: "Federal Register" }];
ctx.EXEC_ACTIONS = {
  [PREZ]: [
    {
      actionClass: "executive_order", term: "47", documentId: "EO 14001",
      title: "Order on Federal Tax Withholding", actedAt: "2025-01-30",
      sourceUrl: SRC_X, sourceLabel: "Federal Register", status: inForce,
      issues: [{
        issueKey: ISSUE, direction: "advances", weight: 100, isPrimary: true,
        plain: "The order lowered federal withholding rates for the current year.",
      }],
    },
    {
      actionClass: "signed_law", term: "47", documentId: "Pub. L. 119-2",
      title: "Broad Reconciliation Act", actedAt: "2025-04-12",
      sourceUrl: SRC_X, sourceLabel: "Federal Register", status: inForce,
      issues: [{ issueKey: ISSUE, direction: "advances", weight: 80, isPrimary: true,
                 plain: "One title of the act trimmed a bracket." }],
    },
  ],
};

// ── A driveable index ───────────────────────────────────────────────────────
// The row model, stubbed, so all four buckets exist at once on one figure —
// which no single real seed produces and which is exactly the case the switcher
// is for. Everything the index reads off a row is present; nothing is invented.
const stubRow = (key, label, token, over = {}) => ({
  pid: MEMBER, key, label, tier: 1, category: "econ", categoryLabel: "Economy",
  stance: { key, label: "Cut taxes", direction: "support", text: "said a thing", source: "" },
  lane: "record", tested: true, scored: true, testability: "high",
  actions: { count: 2, lane: "record", judged: 2 },
  verdict: { token, label: token, cls: "x", ico: "•", color: "#fff", score: null, basis: "action" },
  public: { token: "no_record", count: 0, judged: false },
  evidence: { count: 2, actions: 2, public: 0, total: 2, strength: "documented", sources: [] },
  setAside: null, weights: {}, ov: {},
  ...over,
});
const ROWS = [
  stubRow("lower_taxes", "Lower Taxes", "contradicts"),
  stubRow("healthcare", "Health Care", "mixed"),
  stubRow("border_security", "Border Security", "consistent"),
  stubRow("guns", "Gun Rights", "consistent"),
  stubRow("energy", "Energy", "limited"),
];
const realIssueRows = C.issueRows, realRank = C.rankIssueRows;
const withRows = (rows) => {
  C.issueRows = () => rows;
  C.rankIssueRows = (rs) => rs;
  try { return WA.headlineHtml(MEMBER, ctx.PROFILES[MEMBER]); }
  finally { C.issueRows = realIssueRows; C.rankIssueRows = realRank; }
};
// The index block only. Bounded at BOTH ends: the panels that follow it on the
// card carry the score's own percentage, and an unbounded slice would quietly
// hand every "no second scoreboard" assertion below a string that contains the
// first scoreboard.
const ocOf = (html) => {
  const s = String(html);
  const i = s.indexOf('<div class="pdxwa-oc"');
  if (i === -1) return "";
  const f = s.indexOf('class="pdxwa-oc-foot"', i);
  if (f === -1) return "";
  const e = s.indexOf("</div>", s.indexOf("</p>", f));
  return s.slice(i, e === -1 ? s.length : e + 6);
};
const IDX = ocOf(withRows(ROWS));

// ═════════════════════════════════════════════════════════════════════════════
// 0. One vocabulary, published once
// ═════════════════════════════════════════════════════════════════════════════
// The dossier header has to name the bucket a row was filed under. It reads that
// name from here. If this stops being published, the header silently drops the
// continuity line — which looks exactly like a design choice rather than a break.
ok(Array.isArray(WA.OUTCOMES) && WA.OUTCOMES.length === 4,
  "vocabulary: PDXWordAction no longer publishes the four result buckets");
ok(typeof WA.outcomeFor === "function", "vocabulary: outcomeFor() is not published");
for (const [tok, short] of [["contradicts", "Contradicted"], ["mixed", "Mixed"],
                            ["consistent", "Backed up"], ["limited", "Thin record"]]) {
  const o = WA.outcomeFor(tok);
  ok(o && o.short === short, `vocabulary: "${tok}" no longer resolves to the short name "${short}"`);
  ok(o && /^#[0-9a-f]{6}$/i.test(o.col), `vocabulary: "${tok}" has no colour for the index and the dossier to share`);
  ok(o && typeof o.sub === "string" && o.sub.length > 15,
     `vocabulary: "${tok}" has no one-clause explanation, so the bucket heading is a label with no meaning`);
}
eq(WA.outcomeFor("pending"), null,
  "vocabulary: a verdict that was never in the index resolves to a bucket anyway — that is how a\n" +
  "    loading row acquires a result");
ok(WA.outcomeFor("limited").secondary === true,
  "vocabulary: the coverage bucket is not marked secondary, so nothing downstream can draw it quieter");

// ═════════════════════════════════════════════════════════════════════════════
// 1. Four distinct buckets, nothing behind a fold
// ═════════════════════════════════════════════════════════════════════════════
ok(IDX.length > 0, "index: the issue index did not render — every assertion below is vacuous");
hasnt(IDX, "PDXSP:lid", "index: a bucket is still behind a spine lid");
hasnt(IDX, "<select", "index: the bucket switcher is a dropdown — three of the four counts would be\n" +
  "    hidden behind a tap, which is the partial reveal this replaced");
eq((IDX.match(/data-pdxwa-oc-panel="/g) || []).length, 4,
  "index: the four outcomes are not four distinct panels");
eq((IDX.match(/data-pdxwa-seg="/g) || []).length, 4,
  "index: the switcher does not offer one chip per live bucket");
has(IDX, 'role="tablist"', "index: the switcher is not announced as a set of choices");
eq((IDX.match(/role="tabpanel"/g) || []).length, 4, "index: the bucket panels are not announced as panels");
// Counts are on the chips, so the shape of the record is legible without opening
// anything — which is the entire reason the fold went.
has(IDX, '<span class="pdxwa-oc-tab-n">2</span>', "index: a chip does not carry its own count");
for (const label of ["Says one thing, does another", "Mixed", "Backed it up", "Not enough record yet"]) {
  has(IDX, label, `index: the bucket heading "${label}" is missing`);
}
for (const short of ["Contradicted", "Mixed", "Backed up", "Thin record"]) {
  has(IDX, short, `index: the switcher does not print the short bucket name "${short}"`);
}
// Each panel says what its bucket MEANS, once, under the heading.
has(IDX, "The record pushes back on what they said.", "index: the contradicted bucket does not say what it means");
has(IDX, "Coverage, not a result.", "index: the thin bucket does not say that it is not a finding");

// One selection, and it is the sharpest live outcome.
eq((IDX.match(/aria-selected="true"/g) || []).length, 1, "index: not exactly one bucket is selected");
eq((IDX.match(/class="pdxwa-oc-grp is-on/g) || []).length, 1, "index: not exactly one panel is open on first paint");
ok(/data-pdxwa-seg="contradicts"[\s\S]{0,240}?aria-selected="true"/.test(IDX),
  "index: the index does not open on the sharpest bucket on file");

// The coverage pile: present, counted, reachable, quieter, last, never selected.
ok(/data-pdxwa-seg="limited"[\s\S]{0,240}?aria-selected="false"/.test(IDX),
  "index: the coverage bucket is selected while real results exist");
has(IDX, "pdxwa-oc-tab-2nd", "index: the coverage chip is not marked secondary");
has(IDX, "pdxwa-oc-grp-2nd", "index: the coverage panel is not marked secondary");
ok(IDX.lastIndexOf('data-pdxwa-oc-panel="limited"') > IDX.lastIndexOf('data-pdxwa-oc-panel="consistent"'),
  "index: the coverage bucket is not ordered last, so it sits between two sets of findings");

// ═════════════════════════════════════════════════════════════════════════════
// 1b. Four buckets AT ZERO, too
// ═════════════════════════════════════════════════════════════════════════════
// A bucket with no rows in it used to be filtered out of the switcher entirely, so
// a member whose record contradicted nothing rendered an index with no Contradicted
// chip at all. That reads as "this bucket does not exist here" when the honest and
// far more informative statement is "Contradicted: 0". The empty bucket is the whole
// point of the index: it is the reader's evidence that the check was run and came
// back clean, and without it a clean record is indistinguishable from an unchecked
// one. So all four render always, zeros drawn quieter but never dropped.
const CLEAN = ocOf(withRows([
  stubRow("border_security", "Border Security", "consistent"),
  stubRow("guns", "Gun Rights", "consistent"),
  stubRow("energy", "Energy", "limited"),
]));
ok(CLEAN.length > 0, "zero: the clean-record index did not render — the assertions below are vacuous");
eq((CLEAN.match(/data-pdxwa-seg="/g) || []).length, 4,
  "zero: a clean record drops chips instead of showing them at zero");
eq((CLEAN.match(/data-pdxwa-oc-panel="/g) || []).length, 4,
  "zero: a clean record drops whole panels, so the check that was run leaves no trace");
for (const tok of ["contradicts", "mixed", "consistent", "limited"]) {
  has(CLEAN, 'data-pdxwa-seg="' + tok + '"', `zero: the "${tok}" chip vanished on a clean record`);
}
has(CLEAN, "Contradicted", "zero: the word Contradicted is absent from a record that contradicted nothing");
ok(/data-pdxwa-seg="contradicts"[\s\S]{0,300}?pdxwa-oc-tab-n">0</.test(CLEAN),
  "zero: the empty Contradicted chip does not carry its 0");
// Quieter, not hidden — and an empty panel says so in words rather than reading as
// a panel that failed to load.
has(CLEAN, "pdxwa-oc-tab is-zero", "zero: an empty chip is not drawn any quieter than a populated one");
has(CLEAN, "pdxwa-oc-empty", "zero: an empty panel renders blank instead of stating that nothing landed there");
has(CLEAN, "None. No issue in this index landed here",
  "zero: the empty panel does not say plainly that the bucket is empty");
has(CLEAN, "3 issues checked", "zero: the empty panel does not state how much record was checked to get there");
// Selection still has to land somewhere a reader can read.
eq((CLEAN.match(/aria-selected="true"/g) || []).length, 1,
  "zero: a clean record does not select exactly one bucket");
ok(/data-pdxwa-seg="consistent"[\s\S]{0,300}?aria-selected="true"/.test(CLEAN),
  "zero: the index opens on an empty bucket while a populated one exists");

// ═════════════════════════════════════════════════════════════════════════════
// 2. One SCORE, and the row figures that are not it
// ═════════════════════════════════════════════════════════════════════════════
// The profile has ONE score and it is the Direction Match above this block.
//
// This section used to say the index prints no percentage at all, which was the
// cheapest way to guarantee that and, on a phone, too expensive: a bucket holds
// every issue that landed in it, and with a word alone a row that matched on
// eleven instruments of twelve and a row that scraped through are the same green
// line. The rule is now the narrower true one — a percentage in the index is
// allowed if, and only if, it is a PER-ISSUE figure that says so:
//
//   · it sits inside a .pdxwa-oc-pct block, on the row it belongs to;
//   · that block carries its own scope label (.pdxwa-oc-pct-l — "this issue");
//   · nothing outside those blocks prints a percentage anywhere in the index.
//
// The shape strip above and the dossier's bucket line below stay at zero
// percentages — see the gateway and continuity sections. The strip is a gateway,
// not a measurement, and the bucket line says where a finding was filed.
const pctContract = (html, where) => {
  const text = (h) => h.replace(/<[^>]+>/g, " ");
  const all = (text(html).match(/%/g) || []).length;
  const scoped = (html.match(/class="pdxwa-oc-pct-v">[^<]*%/g) || []).length;
  eq(all, scoped,
    where + ": a percentage is printed outside a row's own per-issue figure — there is exactly\n" +
    "    one score on a profile, and it is not in this index");
  eq((html.match(/class="pdxwa-oc-pct"/g) || []).length,
     (html.match(/class="pdxwa-oc-pct-l"/g) || []).length,
    where + ": a per-issue figure rendered without its scope label — an unqualified number on a\n" +
    "    row is exactly how a reader comes to believe the profile has two scores");
  return scoped;
};
pctContract(IDX, "index");
// ...and the denominator is still recoverable, in words, once.
has(IDX, "5 issues in this index", "index: the index does not state how many issues it covers");
has(IDX, "4 with a result on the record", "index: the index does not separate judged issues from coverage");
has(IDX, "1 stated but not testable yet", "index: the untestable rows are folded into the judged count");
// The headline is still the headline: the section's own metric name appears above
// the index. The index may name the metric only where it is bound to one issue —
// inside a row's figure, or in the row's own title/aria text, which always says
// "on this issue alone". Never as free-standing text in the index body.
const head = String(withRows(ROWS));
ok(head.indexOf("Direction match") !== -1 || head.indexOf("Direction Match") !== -1,
  "hierarchy: the profile-level metric no longer names itself above the index");
hasnt(IDX.replace(/<[^>]+>/g, " "), "Direction match",
  "hierarchy: the index restates the profile-level metric as visible body text, which makes it\n" +
  "    read as a second scoreboard rather than as a breakdown of the first");

// ═════════════════════════════════════════════════════════════════════════════
// 3. The row is the door
// ═════════════════════════════════════════════════════════════════════════════
eq((IDX.match(/<button type="button" class="pdxwa-oc-row/g) || []).length, 5,
  "rows: the rows are not buttons — the row itself is the primary tap target");
eq((IDX.match(/data-pdxwa-dos="/g) || []).length, 5, "rows: a row does not name the issue it opens");
eq((IDX.match(/data-pdxwa-dos-pid="/g) || []).length, 5, "rows: a row does not name whose dossier it opens");
eq((IDX.match(/data-pdxwa-dos-origin="pdxwa-oc-/g) || []).length, 5,
  "rows: a row does not carry its own id as the origin, so closing the dossier cannot return the\n" +
  "    reader to the line they left");
has(IDX, 'aria-label="Open the issue dossier: Lower Taxes — Contradicted · they said: Cut taxes"',
  "rows: the control does not say what it opens, in the index's own words");
// Compact: issue, said direction, result cue, markers. The deep explanation is one
// tap down, and a row that explains itself is a row nobody taps.
has(IDX, '<span class="pdxwa-oc-issue">Lower Taxes</span>', "rows: the issue name is not on the row");
has(IDX, '<span class="pdxwa-oc-said">Cut taxes</span>', "rows: the stated direction is not on the row");
has(IDX, 'class="pdxwa-oc-cue"', "rows: the row carries no short result cue of its own");
has(IDX, "2 receipts", "rows: the row does not report the depth behind its result");
hasnt(IDX, "set aside", "rows: the counter-evidence prose is back on the row — that is dossier depth, and it\n" +
  "    is what made these rows wrap to three lines");
// The issue's own colour rides the row, and it is the colour the dossier will
// repeat. `healthcare` is not a core issue in this fixture and must get no spine.
ok(/data-pdxwa-dos="lower_taxes"[\s\S]{0,400}?--pdx-ic:#7fd4c1/.test(IDX) ||
   /--pdx-ic:#7fd4c1[\s\S]{0,400}?data-pdxwa-dos="lower_taxes"/.test(IDX),
  "rows: the issue colour is not on the row, so nothing carries into the dossier header");
ok(!/data-pdxwa-dos="healthcare"[^>]*pdxwa-ic/.test(IDX),
  "rows: an unmapped issue is painted as if it resolved to a colour");

// ═════════════════════════════════════════════════════════════════════════════
// 4. The switcher actually switches
// ═════════════════════════════════════════════════════════════════════════════
// Behaviour, not source text: the handler is delegated on the document, so it is
// held and called with a synthetic event. Selection is presentational — it moves
// `.is-on` and the aria state and touches nothing else — so it can never disagree
// with what the record says, only with which part of it is on screen.
ok(docClick.length > 0, "switcher: nothing bound a delegated click handler, so no row and no chip is live");
const fire = (target) => { docClick.forEach((h) => h({ target, preventDefault() {} })); };

const mkTab = (tok, on) => {
  const el = mkEl();
  el._attrs = { "data-pdxwa-seg": tok, "data-pdxwa-seg-uid": "u1" };
  if (on) el._classes.add("is-on");
  el.setAttribute("aria-selected", on ? "true" : "false");
  return el;
};
const mkPane = (tok, on) => {
  const el = mkEl();
  el._attrs = { "data-pdxwa-oc-panel": tok };
  if (on) el._classes.add("is-on");
  return el;
};
const TABS = [mkTab("contradicts", true), mkTab("mixed", false), mkTab("consistent", false), mkTab("limited", false)];
const PANES = [mkPane("contradicts", true), mkPane("mixed", false), mkPane("consistent", false), mkPane("limited", false)];
const root = mkEl();
root.querySelectorAll = (sel) => (sel.indexOf("data-pdxwa-seg-uid") !== -1 ? TABS : PANES);
TABS.forEach((t) => { t.closest = (sel) => (sel === ".pdxwa-oc" ? root : (sel === "[data-pdxwa-seg]" ? t : null)); });

fire({ closest: (sel) => (sel === "[data-pdxwa-seg]" ? TABS[2] : null) });
eq(TABS.filter((t) => t._classes.has("is-on")).map((t) => t.getAttribute("data-pdxwa-seg")).join(","), "consistent",
  "switcher: tapping a chip does not move the selection to it");
eq(TABS.filter((t) => t.getAttribute("aria-selected") === "true").length, 1,
  "switcher: more or fewer than one chip reports itself selected after a tap");
eq(PANES.filter((p) => p._classes.has("is-on")).map((p) => p.getAttribute("data-pdxwa-oc-panel")).join(","), "consistent",
  "switcher: the panels did not follow the chip");
// And it is reversible — a switcher you can only move forwards is a filter.
fire({ closest: (sel) => (sel === "[data-pdxwa-seg]" ? TABS[3] : null) });
eq(PANES.filter((p) => p._classes.has("is-on")).map((p) => p.getAttribute("data-pdxwa-oc-panel")).join(","), "limited",
  "switcher: the coverage bucket cannot be reached from the switcher");

// ═════════════════════════════════════════════════════════════════════════════
// 4b. The shape strip is the way IN — not a picture above the lists
// ═════════════════════════════════════════════════════════════════════════════
// "The shape behind the average" used to be a read-only bar with four counts
// under it, sitting a screen above four competing bucket lists. A reader who saw
// "3 contradicted" and wanted those three had to scroll past the basis, the top
// rows and the switcher, then find the right chip. The counts and the bar
// segments are now the same control set as the switcher chips, pointed at the
// same panels: the summary is the navigator and the index is the one list it
// opens. This section holds that contract — in the markup, and in the handler.
const compOf = (html) => {
  const s = String(html);
  const i = s.indexOf('<div class="pdxwa-comp"');
  if (i === -1) return "";
  const f = s.indexOf("pdxwa-comp-fine", i);
  if (f === -1) return "";
  const e = s.indexOf("</div>", s.indexOf("</p>", f));
  return s.slice(i, e === -1 ? s.length : e + 6);
};
const CLEAN_ROWS = [
  stubRow("border_security", "Border Security", "consistent"),
  stubRow("guns", "Gun Rights", "consistent"),
  stubRow("energy", "Energy", "limited"),
];
const STRIP = compOf(withRows(ROWS));
const CLEAN_STRIP = compOf(withRows(CLEAN_ROWS));
ok(STRIP.length > 0, "gateway: the shape strip did not render — every assertion below is vacuous");

// ── The uid contract ────────────────────────────────────────────────────────
// The strip is rendered by one function and the index by another. They agree on
// which index the strip drives through ocUid(pid) alone — no plumbing, no state,
// no lookup that can come back empty. If that derivation ever drifts, the counts
// become buttons that address an element which is not on the page, which is a
// dead control that looks alive.
const UID = (/<div class="pdxwa-oc" id="([^"]+)"/.exec(IDX) || [])[1] || "";
ok(UID.length > 0, "gateway: the index has no id, so nothing above it can address its panels");
eq((STRIP.match(new RegExp('data-pdxwa-seg-uid="' + UID + '"', "g")) || []).length,
   (STRIP.match(/data-pdxwa-seg-uid="/g) || []).length,
   "gateway: a control in the strip points at an index id that is not the index below it");
for (const tok of ["contradicts", "mixed", "consistent", "limited"]) {
  has(STRIP, 'data-pdxwa-seg="' + tok + '"', `gateway: the strip has no control for the "${tok}" bucket`);
  has(STRIP, 'aria-controls="' + UID + "-p-" + tok + '"',
    `gateway: the "${tok}" count does not name the panel it opens`);
  has(IDX, 'id="' + UID + "-p-" + tok + '"',
    `gateway: the panel the "${tok}" count points at does not exist in the index`);
}

// ── Every count is a button, including the zeroes ───────────────────────────
eq((STRIP.match(/<button type="button" class="pdxwa-comp-b/g) || []).length, 4,
  "gateway: the four totals are not four controls — a count a reader cannot tap is the picture\n" +
  "    this replaced");
eq((CLEAN_STRIP.match(/<button type="button" class="pdxwa-comp-b/g) || []).length, 4,
  "gateway: a clean record drops the empty buckets from the strip, so a reader cannot open\n" +
  "    \"Contradicted: 0\" and read the honest empty state behind it");
ok(!/disabled/.test(CLEAN_STRIP),
  "gateway: an empty bucket's count is disabled — the panel behind it says \"None. No issue in\n" +
  "    this index landed here\", and that sentence is the answer a reader came for");
has(CLEAN_STRIP, "pdxwa-comp-i is-zero", "gateway: a bucket at zero is not drawn any quieter than a finding");
has(STRIP, "Opens that list of issues below.",
  "gateway: the counts do not say what tapping them does, so a screen reader meets four bare numbers");
has(STRIP, "Tap a count", "gateway: nothing on the strip tells a reader the counts are controls");
// The bar is a second, pointer-only route to the same four lists — it must not be
// a second set of stops on the keyboard, or a reader tabs the same four
// destinations twice.
eq((STRIP.match(/class="pdxwa-comp-seg/g) || []).length, 4,
  "gateway: the bar does not draw one segment per populated bucket");
eq((STRIP.match(/class="pdxwa-comp-seg[^>]*tabindex="-1"[^>]*aria-hidden="true"/g) || []).length, 4,
  "gateway: a bar segment is in the tab order or the accessibility tree — the counts below are the\n" +
  "    same four destinations, named");
eq((CLEAN_STRIP.match(/class="pdxwa-comp-seg/g) || []).length, 2,
  "gateway: the bar draws a segment for a bucket with no width, which is an invisible control");
// Still not a scoreboard: the gateway prints counts, never a rate.
eq((STRIP.replace(/<[^>]+>/g, " ").match(/%/g) || []).length, 0,
  "gateway: the shape strip prints a percentage — there is exactly one score on a profile");

// ── One bucket open, and both surfaces say the same one ─────────────────────
eq((STRIP.match(/aria-pressed="true"/g) || []).length, 1,
  "gateway: the strip has no single open bucket, or claims more than one");
ok(/data-pdxwa-seg="contradicts"[^>]*data-pdxwa-gate="count"[^>]*aria-pressed="true"/.test(STRIP),
  "gateway: the strip does not open on the same bucket the index below it opened on");
ok(/data-pdxwa-seg="consistent"[^>]*data-pdxwa-gate="count"[^>]*aria-pressed="true"/.test(CLEAN_STRIP),
  "gateway: on a clean record the strip and the index disagree about which bucket is open");
ok(!/data-pdxwa-seg="limited"[^>]*data-pdxwa-gate="count"[^>]*aria-pressed="true"/.test(CLEAN_STRIP),
  "gateway: the strip opens on the coverage pile while real results exist — coverage is not a finding");

// ── The flat view: kept, and demoted to one control ─────────────────────────
has(IDX, 'data-pdxwa-oc-all="' + UID + '"',
  "gateway: the all-in-one-list view has no control of its own, so the only way back to it would be\n" +
  "    a layout that shows every bucket at once — which is what the gateway replaced");
has(IDX, "See the full breakdown", "gateway: the flat view does not say what it offers");
has(IDX, "Back to one bucket at a time", "gateway: the flat view cannot be left by the control that entered it");

// ── Behaviour: a tap on a count moves the strip, the chips and the panels ───
// The whole gateway is one delegated handler and one shared mover, so it is
// driven here rather than read: three control sets that agree in the markup and
// drift the moment anything is tapped would be the worst version of this.
const gTab = (tok, on) => {
  const el = mkEl();
  el._attrs = { "data-pdxwa-seg": tok, "data-pdxwa-seg-uid": UID };
  if (on) el._classes.add("is-on");
  el.setAttribute("aria-selected", on ? "true" : "false");
  return el;
};
const gCount = (tok, on, gate = "count") => {
  const el = mkEl();
  el._attrs = { "data-pdxwa-seg": tok, "data-pdxwa-seg-uid": UID, "data-pdxwa-gate": gate };
  if (on) el._classes.add("is-on");
  el.setAttribute("aria-pressed", on ? "true" : "false");
  return el;
};
const gPane = (tok, on) => {
  const el = mkEl();
  el._attrs = { "data-pdxwa-oc-panel": tok };
  if (on) el._classes.add("is-on");
  return el;
};
const G_TOKENS = ["contradicts", "mixed", "consistent", "limited"];
const G_CHIPS = G_TOKENS.map((t) => gTab(t, t === "contradicts"));
const G_COUNTS = G_TOKENS.map((t) => gCount(t, t === "contradicts"));
const G_SEGS = G_TOKENS.map((t) => gCount(t, t === "contradicts", "bar"));
const G_PANES = G_TOKENS.map((t) => gPane(t, t === "contradicts"));
let scrolled = 0;
const gIdx = mkEl();
gIdx.scrollIntoView = () => { scrolled += 1; };
gIdx._classes.add("pdxwa-oc");
// The section wrapper, which is the ONE ancestor the strip and the index share.
const gSection = mkEl();
gSection._kids[".pdxwa-oc"] = gIdx;
gSection.querySelectorAll = (sel) =>
  (sel.indexOf("data-pdxwa-seg-uid") !== -1 ? G_CHIPS.concat(G_COUNTS, G_SEGS) : G_PANES);
[...G_CHIPS, ...G_COUNTS, ...G_SEGS].forEach((el) => {
  el.closest = (sel) => (sel === "[data-pdxwa]" ? gSection : (sel === "[data-pdxwa-seg]" ? el : null));
});
const openTok = () => G_PANES.filter((p) => p._classes.has("is-on"))
  .map((p) => p.getAttribute("data-pdxwa-oc-panel")).join(",");
const tapSeg = (el) => fire({ closest: (sel) => (sel === "[data-pdxwa-seg]" ? el : null) });

tapSeg(G_COUNTS[1]);
eq(openTok(), "mixed", "gateway: tapping a total in the summary does not open that bucket's list");
eq(G_COUNTS.filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.getAttribute("data-pdxwa-seg")).join(","),
   "mixed", "gateway: the strip does not mark the bucket it just opened, or marks two");
eq(G_CHIPS.filter((c) => c.getAttribute("aria-selected") === "true").map((c) => c.getAttribute("data-pdxwa-seg")).join(","),
   "mixed", "gateway: the index's own chips did not follow the summary, so the two surfaces now\n" +
   "    disagree about which bucket the reader is in");
eq(G_CHIPS.filter((c) => c.getAttribute("aria-pressed") !== null).length, 0,
  "gateway: a tab was told it is \"pressed\" — a tab reports aria-selected, and mixing the two\n" +
  "    breaks the role it was given");
eq(G_COUNTS.filter((c) => c.getAttribute("aria-selected") !== null).length, 0,
  "gateway: a plain toggle button was told it is \"selected\", which says nothing to a screen reader");
eq(scrolled, 1, "gateway: a tap in the summary does not bring the list it opened into view — on a phone\n" +
  "    the index is a screen below the strip, so the reader is left looking at the bar");

// The bar is the same gateway by another route.
tapSeg(G_SEGS[3]);
eq(openTok(), "limited", "gateway: tapping a segment of the bar does not open that bucket's list");
eq(G_COUNTS.filter((c) => c._classes.has("is-on")).map((c) => c.getAttribute("data-pdxwa-seg")).join(","),
   "limited", "gateway: the bar and the counts do not move together");
eq(scrolled, 2, "gateway: a tap on the bar does not scroll the list into view");

// One bucket is ALWAYS open — re-tapping the open one re-focuses it rather than
// collapsing the section into nothing. Chosen deliberately for the phone: a
// collapse leaves a reader on a bare strip with no list under it and no
// indication that anything is meant to be there.
tapSeg(G_COUNTS[3]);
eq(openTok(), "limited", "gateway: re-tapping the open bucket closed it — the index is never empty, one bucket\n" +
  "    is always on screen");
eq(scrolled, 3, "gateway: re-tapping the open bucket does not return the reader to its list");

// An empty bucket opens too, onto the sentence that says it is empty.
tapSeg(G_COUNTS[0]);
eq(openTok(), "contradicts", "gateway: an empty bucket cannot be opened from the summary");
const cleanIdx = ocOf(withRows(CLEAN_ROWS));
const cPanel = cleanIdx.slice(cleanIdx.indexOf('data-pdxwa-oc-panel="contradicts"'),
                              cleanIdx.indexOf('data-pdxwa-oc-panel="mixed"'));
has(cPanel, "None. No issue in this index landed here",
  "gateway: opening a bucket at zero lands on a blank panel rather than on the honest empty state");

// A chip inside the index switches without scrolling — it is already on screen,
// and yanking the page under a reader who tapped a control they can see is worse
// than not moving at all.
const scrollMark = scrolled;
tapSeg(G_CHIPS[2]);
eq(openTok(), "consistent", "gateway: the index's own chips stopped switching once the strip could");
eq(scrolled, scrollMark, "gateway: tapping a chip inside the index scrolls the index — only the summary above\n" +
  "    it has a distance to close");

// ── Flat mode is a mode, and picking a bucket leaves it ─────────────────────
const allBtn = mkEl();
allBtn._attrs = { "data-pdxwa-oc-all": UID };
allBtn.setAttribute("aria-pressed", "false");
allBtn.closest = (sel) => (sel === "[data-pdxwa-oc-all]" ? allBtn : (sel === ".pdxwa-oc" ? gIdx : null));
const tapAll = () => fire({ closest: (sel) => (sel === "[data-pdxwa-oc-all]" ? allBtn : null) });
tapAll();
ok(gIdx._classes.has("is-flat"), "gateway: the full-breakdown control does not open the all-in-one-list view");
eq(allBtn.getAttribute("aria-pressed"), "true", "gateway: the flat-view control does not report that it is on");
eq(openTok(), "consistent", "gateway: entering the flat view threw away the bucket the reader had open, so\n" +
  "    leaving it again cannot put them back");
tapAll();
ok(!gIdx._classes.has("is-flat"), "gateway: the flat view cannot be left — a mode with no way out is a trap");
eq(allBtn.getAttribute("aria-pressed"), "false", "gateway: the flat-view control still reports itself on after being turned off");
tapAll();
tapSeg(G_COUNTS[1]);
ok(!gIdx._classes.has("is-flat"), "gateway: picking one bucket left four lists on screen under a control that names\n" +
  "    one — picking a bucket means picking a bucket");
eq(openTok(), "mixed", "gateway: leaving the flat view by picking a bucket did not open that bucket");

// ── And the focused list is still a set of doors ────────────────────────────
// The point of the gateway is what it lands on. A reader who taps "Backed up" in
// the summary must be able to tap an issue in the list that appears and get the
// same assembled dossier every other surface opens.
const gwOpened = [];
const gwRealOpen = C.openGap;
C.openGap = (pid, key, opts) => { gwOpened.push({ pid, key, opts }); return true; };
tapSeg(G_COUNTS[2]);
const gwRow = mkEl();
gwRow._attrs = {
  "data-pdxwa-dos": "border_security",
  "data-pdxwa-dos-pid": MEMBER,
  "data-pdxwa-dos-origin": "pdxwa-oc-" + MEMBER + "-border_security",
};
fire({ closest: (sel) => (sel === "[data-pdxwa-dos]" ? gwRow : null) });
eq(gwOpened.length, 1, "gateway: a row in the bucket the summary opened does not open the dossier");
eq(gwOpened[0].key, "border_security", "gateway: the row in the focused list opened the wrong issue");
eq(gwOpened[0].opts.origin, "pdxwa-oc-" + MEMBER + "-border_security",
  "gateway: the row in the focused list does not hand over its own id, so closing the dossier\n" +
  "    cannot return the reader to the bucket they were browsing");
C.openGap = gwRealOpen;
// ...and the rows that list is made of are the ones filed under that bucket.
const consPanel = IDX.slice(IDX.indexOf('data-pdxwa-oc-panel="consistent"'),
                            IDX.indexOf('data-pdxwa-oc-panel="limited"'));
has(consPanel, 'data-pdxwa-dos="border_security"', "gateway: the backed-up bucket does not contain its own rows");
has(consPanel, 'data-pdxwa-dos="guns"', "gateway: a row filed under backed up is missing from that bucket's list");
hasnt(consPanel, 'data-pdxwa-dos="lower_taxes"', "gateway: a contradicted row is listed under backed up");

// ── One list at every width ─────────────────────────────────────────────────
// The old desktop layout turned the four panels into a two-column board, which
// made the selection an emphasis rather than a filter and left a reader comparing
// columns to find one issue. The stylesheet is asserted directly because there is
// no width in this DOM to render at.
const CSS = read("word-action.css");
ok(!/\.pdxwa-oc-panels\s*\{[^}]*grid/.test(CSS),
  "gateway: the bucket panels are still laid out as a grid at some width — the summary opens ONE\n" +
  "    list, and a board of four is what it replaced");
ok(!/\.pdxwa-oc-grp-2nd\s*\{[^}]*grid-column/.test(CSS),
  "gateway: the coverage panel still claims a row of its own in a panel grid that no longer exists");
ok(/\.pdxwa-oc-grp\s*\{[^}]*display:\s*none/.test(CSS) && /\.pdxwa-oc-grp\.is-on\s*\{[^}]*display:\s*block/.test(CSS),
  "gateway: the panels are not hidden-except-one by default, so every width shows every bucket");
ok(/\.pdxwa-oc\.is-flat\s+\.pdxwa-oc-grp\s*\{[^}]*display:\s*block/.test(CSS),
  "gateway: the flat class reveals nothing, so the full-breakdown control is a no-op");
ok(/\.pdxwa-comp-b\s*\{[^}]*min-height:\s*2\.75rem/.test(CSS),
  "gateway: the counts are controls without a 44px tap target, on the surface most likely to be read\n" +
  "    on a phone");
ok(/\.pdxwa-oc-all\s*\{[^}]*min-height:\s*2\.75rem/.test(CSS),
  "gateway: the full-breakdown control has no 44px tap target");

// ═════════════════════════════════════════════════════════════════════════════
// 5. The tap opens the assembled dossier, and remembers where it came from
// ═════════════════════════════════════════════════════════════════════════════
const opened = [];
const realOpen = C.openGap;
C.openGap = (pid, key, opts) => { opened.push({ pid, key, opts }); };
const mkRow = (key) => {
  const el = mkEl();
  el._attrs = {
    "data-pdxwa-dos": key,
    "data-pdxwa-dos-pid": MEMBER,
    "data-pdxwa-dos-origin": "pdxwa-oc-" + MEMBER + "-" + key,
  };
  return el;
};
fire({ closest: (sel) => (sel === "[data-pdxwa-dos]" ? mkRow("border_security") : null) });
eq(opened.length, 1, "tap: the row did not open anything");
eq(opened[0].pid, MEMBER, "tap: the dossier opened on the wrong politician");
eq(opened[0].key, "border_security", "tap: the dossier opened on the wrong issue");
eq(opened[0].opts.arrival, false,
  "tap: the sheet opened in arrival mode — that is the shared-card landing state, and it suppresses\n" +
  "    the return path a reader coming from the index needs");
eq(opened[0].opts.origin, "pdxwa-oc-" + MEMBER + "-border_security",
  "tap: the origin row was not handed to the dossier, so closing it cannot return the reader");
// That origin has to be the id the index actually printed, or the return lands nowhere.
has(IDX, 'id="pdxwa-oc-' + MEMBER + '-border_security"',
  "tap: the id the row hands over as its origin is not the id the row was given");

// Fail closed: no consistency module, no navigation — and no thrown error that
// would take the rest of the page's click handling down with it.
C.openGap = undefined;
const before = opened.length;
let threw = null;
try { fire({ closest: (sel) => (sel === "[data-pdxwa-dos]" ? mkRow("healthcare") : null) }); }
catch (e) { threw = e; }
eq(threw, null, "tap: a missing dossier entry point throws out of the delegated handler");
eq(opened.length, before, "tap: something navigated without an entry point to navigate with");

// ── FAIL CLOSED IS NOT THE SAME AS SWALLOW ──────────────────────────────────
// The regression this guards: the handler called preventDefault() and THEN tried
// to open. When the open could not happen — module half-loaded, sheet detached,
// assembly throwing — the tap was consumed and nothing at all happened. A row
// that looks like a control and eats taps in silence is the worst of both. The
// default may only be consumed once a sheet is confirmed up.
const fireP = (target) => {
  let prevented = false;
  docClick.forEach((h) => h({ target, preventDefault() { prevented = true; } }));
  return prevented;
};
const rowTarget = (key) => ({ closest: (sel) => (sel === "[data-pdxwa-dos]" ? mkRow(key) : null) });

C.openGap = undefined;
eq(fireP(rowTarget("healthcare")), false,
  "tap: the row consumed the tap with no dossier entry point to open — the reader gets neither a\n" +
  "    sheet nor the browser's own default, which is a dead control");

C.openGap = () => { throw new Error("assembly blew up"); };
let threw2 = null;
let preventedOnThrow = null;
try { preventedOnThrow = fireP(rowTarget("healthcare")); } catch (e) { threw2 = e; }
eq(threw2, null, "tap: a dossier that throws takes the delegated handler down with it");
eq(preventedOnThrow, false, "tap: the tap was consumed by an open that threw");

C.openGap = () => false;
eq(fireP(rowTarget("healthcare")), false,
  "tap: openGap reported that no sheet went up and the tap was consumed anyway");

C.openGap = () => true;
eq(fireP(rowTarget("healthcare")), true,
  "tap: a confirmed open did not consume the default, so the row's own click still runs after it");

// A module too old to report anything is read as a success — that is what this
// path did before, and a silent downgrade to "never opened" would be worse than
// the bug being fixed.
C.openGap = () => undefined;
eq(fireP(rowTarget("healthcare")), true,
  "tap: an entry point that reports nothing is treated as a failure, so every older build of the\n" +
  "    consistency module stops consuming its own taps");
C.openGap = realOpen;

// ── AND THE REAL ONE OPENS, ON EVERY BUCKET ─────────────────────────────────
// Not a stub: PDXConsistency's own openGap, against the real seeded record. Both
// of the buckets the live report named — Mixed and Backed up — plus the sharp one,
// because the failure being guarded was per-row and not per-bucket.
for (const [key, why] of [["lower_taxes", "Contradicted"], ["healthcare", "Mixed"], ["border_security", "Backed up"]]) {
  const wentUp = C.openGap(MEMBER, key, { arrival: false, origin: "pdxwa-oc-" + MEMBER + "-" + key });
  ok(wentUp === true, `tap: openGap did not put a sheet on screen for a ${why} row`);
  const backEl = ctx.document.getElementById("pdxc-gap-back") || null;
  const bodyEl = backEl && backEl.querySelector(".pdxgap-sheet") &&
    backEl.querySelector(".pdxgap-sheet").querySelector(".pdxgap-body");
  ok(bodyEl && String(bodyEl.innerHTML).length > 50,
    `tap: the ${why} row's sheet opened empty, which on screen is indistinguishable from a dead tap`);
  C.closeGap();
}

// THE DOSSIER MAY FAIL; THE DOOR MAY NOT. The sheet is assembled out of a dozen
// independent readers, and on live data any one of them can throw where it never
// does on the bundled seed. When one does, the sheet still opens and says so in
// words — naming the person and the issue, and putting the failure on us rather
// than on their record — instead of opening blank or not opening at all.
const realOmni = ctx.window._pdxRecordOmnibusStats;
ctx.window._pdxRecordOmnibusStats = () => { throw new Error("provenance reader unavailable"); };
let fellBack = null;
try { fellBack = C.openGap(MEMBER, "border_security", { arrival: false }); }
catch (e) { fellBack = e; }
finally { ctx.window._pdxRecordOmnibusStats = realOmni; }
ok(fellBack === true, "tap: a dossier whose assembly throws does not open at all — the tap is consumed and\n" +
  "    the reader is given nothing and no reason");
const fbBack = ctx.document.getElementById("pdxc-gap-back");
const fbBody = fbBack && fbBack.querySelector(".pdxgap-sheet").querySelector(".pdxgap-body");
const fbHtml = String((fbBody && fbBody.innerHTML) || "");
has(fbHtml, "could not assemble",
  "tap: the fallback sheet does not say plainly that the dossier could not be built");
has(fbHtml, "Border Security",
  "tap: the fallback sheet does not name the issue the reader tapped, so the tap looks unheard");
has(fbHtml, "fault on our side",
  "tap: the fallback sheet lets our own failure read as a finding about their record");
has(fbHtml, "pdxgap-next",
  "tap: the fallback sheet is a dead end — it drops the exits every other dossier carries");
C.closeGap();

// ── THE SHEET SURVIVES ITS OWN BACKDROP BEING REMOVED ───────────────────────
// The sheet is cached on first build and lives on <body>, so it survives the warm
// repaint of the section that opened it. It does NOT survive the body being
// rebuilt — and a detached node accepts innerHTML and `hidden = false` in perfect
// silence, so the failure is invisible at the point of use and reads as a dead tap.
const liveBack = ctx.document.getElementById("pdxc-gap-back");
if (liveBack) liveBack.parentNode = null;      // detached, exactly as a rebuild leaves it
const afterDetach = C.openGap(MEMBER, "healthcare", { arrival: false });
ok(afterDetach === true, "tap: with the backdrop detached the dossier reports success anyway, which is how a\n" +
  "    dead tap survives every test that only checks the return value");
const rebuilt = ctx.document.getElementById("pdxc-gap-back");
ok(rebuilt && rebuilt.parentNode,
  "tap: a detached sheet was reused instead of rebuilt, so nothing the reader tapped appears on screen");
C.closeGap();

C.openGap = realOpen;

// ═════════════════════════════════════════════════════════════════════════════
// 6. Index bucket → issue dossier: the colour and the word travel
// ═════════════════════════════════════════════════════════════════════════════
// The claim being tested is continuity, so it is checked at the seam: the sheet
// consistency.js builds for the same (pid, issue) the index row points at.
const sheet = C.gapViewHtml(MEMBER, ISSUE);
has(sheet, 'class="pdxdos-bucket"', "continuity: the dossier header does not say which bucket this row was filed under");
has(sheet, ">In the issue index<", "continuity: the header names a bucket without saying where that bucket is");
// The word and the colour are the index's, read from the index's own module.
const bucket = WA.outcomeFor(C.issueRow(MEMBER, ISSUE).verdict.token);
ok(bucket, "continuity: this fixture's row has no bucket, so the assertions below are vacuous");
has(sheet, ">" + bucket.short + "<", "continuity: the header does not repeat the index's word for this result");
has(sheet, "--c:" + bucket.col, "continuity: the header does not repeat the index's colour for this result");
has(sheet, bucket.sub, "continuity: the header names the bucket without saying what the bucket means");
// The issue's colour is on the title, which is the other cue the row carried.
has(sheet, 'class="pdxgap-title pdxc-ic"', "continuity: the issue colour does not reach the dossier title");
has(sheet, "--pdx-ic:#7fd4c1", "continuity: the title carries the wrong issue colour, or none");
// An unmapped issue gets NO spine rather than a neutral one that looks like a
// colour that failed.
const plainSheet = C.gapViewHtml(MEMBER, "healthcare");
has(plainSheet, 'class="pdxgap-title"', "continuity: an unmapped issue's title lost its plain form");
hasnt(plainSheet, 'class="pdxgap-title pdxc-ic"', "continuity: an unmapped issue is painted as if it resolved");
// The bucket line is a NAME, not a number. The sheet's one number is in its header
// hero and nowhere else.
const bLine = sheet.slice(sheet.indexOf('class="pdxdos-bucket"'), sheet.indexOf('class="pdxgap-meta"'));
eq((bLine.replace(/<[^>]+>/g, " ").match(/%/g) || []).length, 0,
  "continuity: the bucket line prints a percentage — it says where a finding was filed, not how big it is");

// Fail closed: with the index module absent there is no vocabulary to borrow, and
// the header prints nothing rather than inventing a fifth word for four outcomes.
const savedWA = ctx.window.PDXWordAction;
ctx.window.PDXWordAction = undefined;
const orphan = C.gapViewHtml(MEMBER, ISSUE);
hasnt(orphan, "pdxdos-bucket", "continuity: the header invents bucket language with no index module to read it from");
has(orphan, 'class="pdxgap-title pdxc-ic"', "continuity: the issue colour is lost when the index module is absent —\n" +
  "    the palette is not the index's to take away");
ctx.window.PDXWordAction = savedWA;

// ═════════════════════════════════════════════════════════════════════════════
// 7. Both lanes reach the index, in their own nouns
// ═════════════════════════════════════════════════════════════════════════════
// The row prints what tested it, and a president casts no votes. Driven through
// the REAL row model on both sides, because the lane is the one thing a stub
// cannot honestly assert.
const memberIdx = ocOf(WA.headlineHtml(MEMBER, ctx.PROFILES[MEMBER]));
ok(memberIdx.length > 0, "lanes: the congressional index did not render");
has(memberIdx, "votes", "lanes: a member's rows do not count votes");
hasnt(memberIdx, "executive action", "lanes: a member's rows count executive actions");
has(memberIdx, 'data-pdxwa-dos="' + ISSUE + '"', "lanes: the congressional rows are not clickable");

const prezIdx = ocOf(WA.headlineHtml(PREZ, ctx.PROFILES[PREZ]));
ok(prezIdx.length > 0, "lanes: the executive index did not render");
has(prezIdx, "executive action", "lanes: a president's rows do not count executive actions");
ok(!/\b\d+ votes?\b/.test(prezIdx), "lanes: a president's rows count votes — they cast none");
has(prezIdx, 'data-pdxwa-dos="' + ISSUE + '"', "lanes: the executive rows are not clickable");
eq((prezIdx.replace(/<[^>]+>/g, " ").match(/%/g) || []).length,
   pctContract(prezIdx, "lanes"),
  "lanes: the executive index prints a percentage that is not a scoped per-issue figure");
// And the positive half, on real rows rather than stubs: the figure is actually
// reaching the face. Without this the contract above is satisfied by an index that
// prints no percentage at all, which is the state this pass changed.
ok((prezIdx.match(/class="pdxwa-oc-pct"/g) || []).length > 0,
  "lanes: no row carries its own Direction Match figure — the bucket word gives the direction\n" +
  "    of a finding and nothing on the face gives its degree");

// ═════════════════════════════════════════════════════════════════════════════
// 8. Thin and untested rows fail closed
// ═════════════════════════════════════════════════════════════════════════════
// A row with nothing stated is coverage of OUR map, not a finding about them, and
// it must not enter the index at all — it would inflate the denominator the foot
// line reports.
const silent = ocOf(withRows([stubRow("energy", "Energy", "limited", { stance: { key: "energy", label: null, text: "" } })]));
eq(silent, "", "thin: an issue they have never spoken on is listed as a result, which pads the index\n" +
  "    with silence and inflates its stated denominator");
// A row whose verdict is still loading has no bucket, so it is not filed under one.
const loading = ocOf(withRows([
  stubRow("lower_taxes", "Lower Taxes", "consistent"),
  stubRow("healthcare", "Health Care", "pending", { tested: false, scored: false }),
]));
has(loading, "1 issues in this index".replace("1 issues", "1 issue"),
  "thin: a row still waiting on its record is counted as a result");
hasnt(loading, 'data-pdxwa-dos="healthcare"', "thin: a row with no verdict yet is given a door into a dossier\n" +
  "    that has nothing to show");
// A single-item row is listed under its result and marked, never quietly promoted.
const thinRow = ocOf(withRows([stubRow("lower_taxes", "Lower Taxes", "consistent", {
  actions: { count: 1, lane: "record", judged: 1 },
  evidence: { count: 1, actions: 1, public: 0, total: 1, strength: "thin", sources: [] },
})]));
has(thinRow, "Thin evidence", "thin: a row resting on one sourced item is not marked as thin");
has(thinRow, "pdxwa-oc-row-thin", "thin: the thin row is not drawn differently from a documented one");

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ issue index: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`✓ issue index: all ${passed} assertions passed — four buckets, every row a door, one vocabulary`);
