#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// RECORD DIRECTION ON THE DECISION SURFACES
// ─────────────────────────────────────────────────────────────────────────────
// The record-direction finding shipped onto the profile issue row and the share
// card. Neither is where a ballot is decided. The compare table, the issue-choice
// cards and the ballot breakdown are, and on all three a member with a dense
// mapped record and no sourced stance rendered the same grey blank as a member
// with nothing on file at all — same pixels, opposite facts.
//
// This harness gates the presentation pass that carries the EXISTING finding onto
// those three surfaces. The interesting failures are not "is the clause right" —
// test-record-direction.mjs and test-record-direction-cards.mjs own that. They
// are the ways a display slot stops being a display slot:
//
//   1. it speaks somewhere the profile row would NOT, or stays silent somewhere
//      the row would speak. The gate must be the row's gate, read off the row's
//      own index rather than re-stated here;
//   2. it collapses the three empty states back into one. "no record on file",
//      "a record is on file and may not be characterised", and the clause itself
//      are three different facts and a voter comparing two names needs to be able
//      to tell which one they are looking at;
//   3. it outranks or displaces a SCORED said-vs-did result;
//   4. it becomes ordinal — a sort key, a filter key, a bucket, a percentage, or
//      an input to Direction Match / Consistency Score;
//   5. it drifts in vocabulary, because a surface wrote the sentence itself
//      instead of asking the one function that words it.
//
//   node scripts/test-record-direction-surfaces.mjs
//
// No database, no network, no browser. Exit code 1 on a failed assertion, 2 when
// a probe target has moved and a contract can no longer be checked at all.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["pdx-learn.js", "stance-helpers.js", "consistency.js", "say-vs-do.js",
               "voting-record.js", "receipt-cards.js"];
const SRC = Object.fromEntries(FILES.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
const SURFACE_SRC = Object.fromEntries(
  ["compare-table.js", "issue-compare.js", "ballot-breakdown.js", "app.css", "issue-compare.css"]
    .map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
const CODE = {};

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} missing)`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} unexpectedly present)`);

// A stale probe is not a pass. If the function, branch or attribute a contract is
// pinned to has been renamed, this harness cannot say anything about the contract,
// and saying nothing quietly is the failure mode the whole file exists to avoid.
function must(cond, what) {
  if (!cond) {
    console.error(
      "✗ record-direction surfaces harness is STALE — a contract cannot be verified:\n  " + what +
      "\n\n  This is not a passing state. Restore the probe target, or update this\n" +
      "  harness AND re-check the display-only rule it describes."
    );
    process.exit(2);
  }
}
// Structural probes read a COMMENT-BLANKED copy of each file, offsets preserved.
// Two reasons: an apostrophe in a prose comment ("don't hide in the detail text")
// would open a string for the brace scanner and run it off the end of the
// function, and a rule of the form "this function never mentions X" is only worth
// anything when a comment ABOUT X cannot satisfy it. Regex literals are tracked
// too, because `.replace(/"/g, '&quot;')` in the compare cell would otherwise open
// a string on the quote inside the pattern.
function blankComments(s) {
  let out = "", i = 0;
  const n = s.length;
  let prev = "";                                // last significant code char
  const REGEX_OK = "(,=:[!&|?{};+-~*%<>^\n";
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && s[i] !== "\n") { out += " "; i++; }
      continue;
    }
    if (c === "/" && d === "*") {
      out += "  "; i += 2;
      while (i < n && !(s[i] === "*" && s[i + 1] === "/")) { out += (s[i] === "\n" ? "\n" : " "); i++; }
      if (i < n) { out += "  "; i += 2; }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      out += c; i++;
      while (i < n) {
        if (s[i] === "\\") { out += s[i] + (s[i + 1] || ""); i += 2; continue; }
        out += s[i];
        if (s[i] === c) { i++; break; }
        i++;
      }
      prev = c;
      continue;
    }
    if (c === "/" && REGEX_OK.indexOf(prev) !== -1) {
      // A regex literal, blanked to spaces with its offsets preserved. Blanked and
      // not merely "tracked": the brace scanner below has no regex mode, so a
      // pattern like `.replace(/"/g, '&quot;')` left intact opens a string on the
      // quote inside it and runs the scan off the end of the function. That is a
      // silent probe failure — the body comes back short, the contract goes
      // unchecked, and the harness still says it passed.
      out += c; i++;
      let inClass = false;
      while (i < n) {
        if (s[i] === "\\") { out += "  "; i += 2; continue; }
        if (s[i] === "[") inClass = true;
        else if (s[i] === "]") inClass = false;
        if (s[i] === "/" && !inClass) { out += "/"; i++; break; }
        if (s[i] === "\n") { out += "\n"; i++; break; }
        out += " "; i++;
      }
      prev = "/";
      continue;
    }
    out += c; i++;
    if (!/\s/.test(c)) prev = c;
  }
  return out;
}
function braceScan(src, head, label, file) {
  const open = src.indexOf("{", head);
  must(open !== -1, `${label} in ${file} has no body`);
  let depth = 0, i = open, inStr = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  must(depth === 0, `could not brace-scan ${label} in ${file}`);
  return src.slice(head, i);
}
function fnBody(file, head, label) {
  const src = CODE[file];
  must(!!src, `${file} could not be read`);
  const at = src.indexOf(head);
  must(at !== -1, `${file} no longer contains ${JSON.stringify(head)} — ${label}`);
  const body = braceScan(src, at, label, file);
  must(body.length > 40 && body.length < 6000,
    `the brace scan of ${label} in ${file} returned ${body.length} chars — the probe has lost its target`);
  return body;
}

for (const f of ["compare-table.js", "issue-compare.js", "ballot-breakdown.js"]) {
  CODE[f] = blankComments(SURFACE_SRC[f]);
}
for (const f of ["consistency.js", "voting-record.js"]) CODE[f] = blankComments(SRC[f]);

// ── Fixtures ─────────────────────────────────────────────────────────────────
// Deliberately the same shape as test-record-direction-cards.mjs: one member deep
// enough to clear the coverage floor, with an issue for each state the slot can
// land in, plus a member whose whole record is below the floor and a member whose
// stated position was actually scored against their votes.
const LABELS = {
  climate_action:       "🌍 Climate Action",
  school_choice:        "🎓 School Choice",
  lower_taxes:          "🧾 Lower Taxes",
  national_debt:        "💰 National Debt",
  border_security:      "🛂 Border Security",
  gov_regulation:       "📋 Government Regulation",
  immigration:          "🛬 Immigration Levels",
  rights_safety_balance:"⚖️ Rights + Common-Sense Safety",
  war_powers:           "⚔️ Congress and War Powers",
  healthcare:           "🏥 Health Care",
  space_program:        "🚀 Space Program",
};

const SPLIT_KEY   = "climate_action";        // 8 judged, 6 advance / 2 cut against
const UNIFORM_KEY = "school_choice";         // 5 judged, all advance
const THIN_UNI    = "lower_taxes";           // 2 judged, both advance
const MIXED3      = "national_debt";         // 3 judged, 2/1 — under the depth floor
const SOLO        = "border_security";       // 1 judged
const EVEN_SPLIT  = "gov_regulation";        // 6 judged, 3/3 — counted, uncharacterised
const SHORT_SPLIT = "immigration";           // 4 judged, 2/2 — under the counting depth
const BALANCE_KEY = "rights_safety_balance"; // suppressed: no pole to advance
const NO_POLE_KEY = "war_powers";            // suppressed: contested authority
const SPOKEN_KEY  = "healthcare";            // a stated position, scored consistent
const NO_REC_KEY  = "space_program";         // nothing on file at all

let seq = 0;
const pad = (n) => String(n).padStart(2, "0");
const mkVote = (issueKey, position, opts) => {
  opts = opts || {};
  seq++;
  const id = 1000 + seq;
  return {
    kind: "vote", measureId: id, congress: 119, session: 1, rollNumber: 100 + seq,
    measureType: "bill", number: "H.R. " + id,
    title: "Measure " + seq + " Act", chamber: "house", result: "Passed",
    date: "2025-" + pad((seq % 11) + 1) + "-" + pad((seq % 27) + 1),
    action: "On Passage", position: position, isProcedural: !!opts.procedural,
    source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/" + id,
              label: "Congress.gov" },
    issues: [{
      issueKey: issueKey,
      weight: opts.weight == null ? 100 : opts.weight,
      isPrimary: opts.primary !== false,
      supportMeaning: "yea_supports",
      rationale: "Directly changes the federal policy this issue tracks.",
    }],
  };
};
const many = (n, issueKey, position, opts) =>
  Array.from({ length: n }, () => mkVote(issueKey, position, opts));

const REC_RECORDS = [
  ...many(6, SPLIT_KEY, "yea"),
  ...many(2, SPLIT_KEY, "nay", { weight: 60 }),
  ...many(5, UNIFORM_KEY, "yea"),
  ...many(2, THIN_UNI, "yea"),
  ...many(2, MIXED3, "yea"),
  ...many(1, MIXED3, "nay"),
  ...many(1, SOLO, "yea"),
  ...many(3, EVEN_SPLIT, "yea"),
  ...many(3, EVEN_SPLIT, "nay"),
  ...many(2, SHORT_SPLIT, "yea"),
  ...many(2, SHORT_SPLIT, "nay"),
  ...many(4, BALANCE_KEY, "yea"),
  ...many(5, NO_POLE_KEY, "yea"),
  ...many(5, SPOKEN_KEY, "yea"),
];
const THIN_RECORDS = many(5, UNIFORM_KEY, "yea");   // below the member coverage floor
const SAYDO_RECORDS = many(3, THIN_UNI, "yea");

const STANCES = {
  recrep: [
    { issueKey: SPOKEN_KEY, issueStance: "support", topic: "Health Care",
      text: "Medicaid coverage in this district must be protected." },
  ],
  saydorep: [
    { issueKey: THIN_UNI, issueStance: "support", topic: "Taxes",
      text: "Every bracket should keep more of what it earns." },
  ],
};
const PROFILES = {
  recrep:  { name: "Rep. Record Member", office: "U.S. House", district: "TX-07", state: "TX", party: "R" },
  recrep2: { name: "Rep. Second Record",  office: "U.S. House", district: "TX-11", state: "TX", party: "D" },
  thinrec: { name: "Rep. Thin Member",   office: "U.S. House", district: "TX-08", state: "TX", party: "R" },
  saydorep:{ name: "Rep. Said Member",   office: "U.S. House", district: "TX-09", state: "TX", party: "D" },
  coldrep: { name: "Rep. Cold Member",   office: "U.S. House", district: "TX-10", state: "TX", party: "D" },
};
const RECORD_STORE = { recrep: REC_RECORDS, recrep2: REC_RECORDS, thinrec: THIN_RECORDS, saydorep: SAYDO_RECORDS };

// ── Sandbox ──────────────────────────────────────────────────────────────────
const noopEl = () => ({
  style: {}, textContent: "", hidden: false, className: "", innerHTML: "",
  classList: { add() {}, remove() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, appendChild() {}, removeChild() {},
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, focus() {}, scrollIntoView() {},
  closest: () => null, insertAdjacentHTML() {}, remove() {},
});

function boot(opts) {
  opts = opts || {};
  const ctx = {
    console,
    document: {
      readyState: "complete",
      head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
    },
    location: { hash: "", origin: "https://www.politidex.fyi", pathname: "/" },
    navigator: {},
    setTimeout: (fn) => { if (typeof fn === "function") fn(); return 0; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  ctx.ISSUE_MAP = ctx.window.ISSUE_MAP = Object.fromEntries(
    Object.entries(LABELS).map(([k, label]) => [k, { label }]));
  ctx.ISSUE_STANCE_DATA = ctx.window.ISSUE_STANCE_DATA = JSON.parse(JSON.stringify(STANCES));
  ctx.PROFILES = ctx.window.PROFILES = JSON.parse(JSON.stringify(PROFILES));
  // positionStance() reads _polPositionMap(pid, CMP_DATA[pid]), so without the
  // compare store there is no stated position anywhere and the said-vs-did lane
  // could never score — which would make "a scored result wins" vacuous.
  ctx.CMP_DATA = ctx.window.CMP_DATA = JSON.parse(JSON.stringify(PROFILES));

  const sandbox = vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(SRC[f], sandbox, { filename: f });

  ctx.window.PDXVotingRecord.memberRecords = (pid) => RECORD_STORE[pid] || null;
  ctx.window.PDXVotingRecord.fetchMember = (pid) =>
    Promise.resolve({ items: RECORD_STORE[pid] || [] });
  ctx.window.PDXVotingRecord.noteMember = () => {};
  ctx.fetched = [];
  ctx.window.PDXVotingRecord.fetchCompare = (pids) => {
    ctx.fetched.push((pids || []).slice());
    return Promise.resolve({});
  };
  // The control: the slot removed, everything else in the six files identical.
  // "Display only" is only a claim if the app scores the same with it gone.
  if (opts.dark) delete ctx.window.PDXConsistency.recordDirection;
  return ctx;
}

const A = boot();
const B = boot({ dark: true });

const PC = A.window.PDXConsistency;
const RC = A.window.PDXReceiptCards;
must(!!PC, "window.PDXConsistency is not exported");
must(!!RC, "window.PDXReceiptCards is not exported");
must(!!PC.recordDirection, "PDXConsistency.recordDirection is not exported — the shared slot is gone");
// The thin token's own label, read from the engine so the copy pins below cannot
// drift from it in either direction.
const THIN_LABEL = ((A.window._PDX_RD_TOKENS || {}).record_thin || {}).label || "";
must(!!THIN_LABEL, "_PDX_RD_TOKENS.record_thin.label is not published");
must(!/too thin to characterise/i.test(THIN_LABEL),
  "the thin token still carries the retired blanket refusal");

const slot = (pid, key, o) => PC.recordDirection.slot(pid, key, o);
const html = (pid, key, o) => PC.recordDirection.for(pid, key, o);
const idx = (pid, key) => A.window._pdxRecordDirection(pid, key, { label: LABELS[key] });

// ══ 0. THE SHARED SLOT IS REACHABLE, AND IT IS THE ONLY THING SURFACES CALL ═══
for (const fn of ["slot", "html", "for"]) {
  ok(typeof PC.recordDirection[fn] === "function",
    `export: PDXConsistency.recordDirection.${fn} is present`);
}
for (const k of ["NOTE", "NOTE_SAID", "NOTE_THIN"]) {
  ok(typeof PC.recordDirection[k] === "string" && PC.recordDirection[k].length > 20,
    `export: the ${k} disclosure is exported as real prose`);
}
// The three disclosures are three different sentences. Collapsing any two would
// re-flatten an empty state the reader is meant to be able to tell apart.
ok(PC.recordDirection.NOTE !== PC.recordDirection.NOTE_SAID,
  "export: the no-stated-position disclosure differs from the unjudged-stance one");
ok(PC.recordDirection.NOTE !== PC.recordDirection.NOTE_THIN,
  "export: …and from the too-thin one");

// The compare cell's disclosure is the share card's disclosure, verbatim. Two
// copies exist because receipt-cards.js compares its own copy byte-for-byte in
// its own tripwire and may not be refactored; this is the pin that stops them
// drifting into two different promises about the same finding.
eq(PC.recordDirection.NOTE, RC.guards.rdNote,
  "disclosure: the slot's fixed note is the share card's fixed note, verbatim");
has(PC.recordDirection.NOTE, "No stated position on file",
  "disclosure: it says on its face that nothing was said");
has(PC.recordDirection.NOTE, "not a stated stance and not a score",
  "disclosure: and that it is neither a stance nor a score");

// ══ 1. THE THREE EMPTY STATES ════════════════════════════════════════════════
// One grey blank used to mean all three of these. A voter comparing two names has
// to be able to tell which one is in front of them.

// ── 'speaks' ─────────────────────────────────────────────────────────────────
{
  const s = slot("recrep", UNIFORM_KEY);
  ok(!!s, "speaks: a deep one-way record with no stated stance fills the slot");
  eq(s && s.state, "speaks", "speaks: …in the speaking state");
  eq(s && s.token, "record_direction", "speaks: on the row's characterised token");
  has(s.text, "5 votes on file", "speaks: the inventory count leads");
  has(s.text, "advanced it", "speaks: and the record vocabulary states the direction");
  eq(s.clause, idx("recrep", UNIFORM_KEY).clause,
    "speaks: the clause is the index's clause, not a re-worded copy");
  eq(s.note, RC.guards.rdNote, "speaks: the fixed no-stated-position disclosure travels with it");
  eq(s.judged, 5, "speaks: five judged records behind it");
  eq(s.total, 5, "speaks: five instruments on file");
}
// A deep split speaks too — it is counted but not characterised, and the sentence
// it prints is the row's own "ran both ways" with both counts.
{
  const s = slot("recrep", EVEN_SPLIT);
  eq(s && s.state, "speaks", "split: a deep even record still fills the slot");
  eq(s && s.token, "record_split_deep", "split: on the row's deep-split token");
  eq(s && s.characterised, false, "split: characterising nothing");
  eq(s && s.counted, true, "split: while permitted to state its counts");
  eq(s && s.lead, null, "split: and naming no leading side");
  // The clause is two counts and nothing else; "ran both ways" is the long form
  // the tooltip and the accessible name carry.
  has(s.text, "3 advanced it", "split: the advancing count is stated");
  has(s.text, "3 cut against it", "split: and so is the cutting count");
  has(s.summary, "ran both ways", "split: the long form says the record went two directions");
  has(s.aria, "ran both ways", "split: and the accessible name carries it");
  ok(!/\b(?:mostly|mainly|largely|leans?|on\s+balance|overall)\b/i.test(s.text),
    "split: nothing in the slot characterises the split as leaning");
}
// A shallow split is counted-nothing: the row says "ran both ways" and prints no
// numbers, and the slot prints exactly what the row prints.
{
  const s = slot("recrep", SHORT_SPLIT);
  eq(s && s.token, "record_split", "shallow split: the row's uncounted split token");
  eq(s && s.state, "speaks", "shallow split: the row still has a sentence, so the slot speaks");
  eq(s && s.counted, false, "shallow split: …which may not state its counts");
  ok(!/\d+\s+advanced it/i.test(s.clause) && !/\d+\s+cut against it/i.test(s.clause),
    "shallow split: and the clause states no side counts");
}

// ── 'thin' ───────────────────────────────────────────────────────────────────
// A record IS on file. The count is honest; the direction is withheld, and the
// reason is the token's own words rather than a second sentence invented here.
for (const [key, why] of [[MIXED3, "a 3-vote 2-1 record"], [SOLO, "a single vote"]]) {
  const s = slot("recrep", key);
  eq(s && s.state, "thin", `thin: ${why} lands in the thin state`);
  eq(s && s.clause, "", `thin: ${why} states no direction`);
  ok(s.total > 0, `thin: ${why} still reports that something is on file`);
  has(s.text, s.total + " vote", `thin: ${why} prints the count it does have`);
  // THE TOKEN'S OWN WORDS, READ OFF THE TOKEN. The label was "Too thin to
  // characterise" and is now "Thin read, not a deep pattern" — a depth read rather
  // than a blanket refusal, because these same rows carry a Thin chip one click
  // away. Asserted against _PDX_RD_TOKENS rather than a literal so this pin tests
  // that the slot quotes the token, which is the property, and not which sentence
  // the token currently holds.
  has(s.text.toLowerCase(), THIN_LABEL.toLowerCase(), `thin: ${why} says why in the token's words`);
  ok(!/too thin to characterise/i.test(s.text),
    `thin: ${why} does not print the retired blanket refusal`);
  eq(s.note, PC.recordDirection.NOTE_THIN, `thin: ${why} carries the too-thin disclosure`);
}
// Suppressions are thin, not empty — the votes exist and are not being hidden,
// they are being declined. Coverage floor, balance key and no-pole key all land
// here, and the slot never re-implements any of the three rules.
for (const [pid, key, reason] of [
  ["thinrec", UNIFORM_KEY, "coverage_floor"],
  ["recrep", BALANCE_KEY, "balance_key"],
  ["recrep", NO_POLE_KEY, "no_pole"],
]) {
  eq(idx(pid, key).suppressed, reason,
    `suppression: ${key} on ${pid} is refused by the ${reason} rule`);
  const s = slot(pid, key);
  eq(s && s.state, "thin", `suppression: …so the slot reports a record on file, uncharacterised`);
  eq(s && s.suppressed, reason, `suppression: …and carries the rule's own name`);
  eq(s && s.clause, "", `suppression: …with no direction stated`);
}

// ── 'none' ───────────────────────────────────────────────────────────────────
{
  const s = slot("recrep", NO_REC_KEY);
  eq(s && s.state, "none", "none: an issue with nothing mapped lands in the empty state");
  eq(s && s.total, 0, "none: nothing on file");
  eq(s && s.clause, "", "none: nothing stated");
  has(s.text, "No record on file", "none: and it says so plainly");
  ok(!/\btoo thin\b/i.test(s.text),
    "none: without borrowing the too-thin wording, which would claim a record exists");
}
// The three states are three different strings on the face of the cell.
{
  const three = [html("recrep", UNIFORM_KEY), html("recrep", MIXED3), html("recrep", NO_REC_KEY)];
  ok(new Set(three).size === 3, "states: the three empty states render three different cells");
  has(three[0], "is-speaks", "states: the speaking cell is class-marked");
  has(three[1], "is-thin", "states: the thin cell is class-marked");
  has(three[2], "is-none", "states: the empty cell is class-marked");
}

// ── Cold: nothing warm yet ───────────────────────────────────────────────────
// The one state that must NOT be an assertion. Before the batched /compare call
// lands there is no record layer to read, and "no record on file" would be a
// guess. The slot returns null and the surface keeps whatever it already had.
{
  eq(A.window.PDXVotingRecord.memberRecords("coldrep"), null,
    "cold: the fixture member genuinely has nothing warm");
  eq(slot("coldrep", UNIFORM_KEY), null, "cold: the slot declines to say anything");
  eq(html("coldrep", UNIFORM_KEY), "", "cold: and renders nothing at all");
  eq(slot("", UNIFORM_KEY), null, "cold: no pid, no slot");
  eq(slot("recrep", ""), null, "cold: no issue, no slot");
}

// ══ 2. THE GATE IS THE PROFILE ROW'S GATE ════════════════════════════════════
// The requirement is that a decision surface speaks wherever the profile row
// would. The row's gate lives in _stDirIndex and is `!idx.clause` — nothing else.
// Pinned structurally first (so a changed gate cannot pass silently), then
// behaviourally across every fixture issue.
{
  const body = fnBody("consistency.js", "function _stDirIndex(", "the profile row's gate");
  has(body, "!idx.clause", "gate: the profile row still gates on an empty clause and nothing else");
  const slotBody = fnBody("consistency.js", "function _rdSlot(", "the shared decision-surface slot");
  has(slotBody, "!!idx.clause", "gate: and the shared slot gates on exactly the same thing");
  lacks(slotBody, "idx.characterised &&", "gate: the slot does not narrow the row's gate to characterised rows");
  // Also: no threshold is re-declared here. The engine owns the numbers.
  for (const n of ["_PDX_RD_MIN_JUDGED", "_PDX_RD_DOMINANCE", "_PDX_RD_MEMBER_FLOOR",
                   "_PDX_RD_SPLIT_MIN_JUDGED", "_PDX_RD_SPLIT_MIN_SIDE"]) {
    ok(typeof A.window[n] === "number", `gate: the engine still exports ${n}`);
    lacks(slotBody, n, `gate: the slot does not re-read ${n} — thresholds stay in the engine`);
  }
}
{
  let spoke = 0, silent = 0;
  for (const key of Object.keys(LABELS)) {
    const i = idx("recrep", key);
    const s = slot("recrep", key);
    ok(!!s, `parity: ${key} — the slot answers`);
    if (!s) continue;
    eq(s.state === "speaks", !!i.clause,
      `parity: ${key} — the slot speaks exactly when the row would`);
    eq(s.token, i.token, `parity: ${key} — on the row's own token`);
    eq(s.judged, i.judged || 0, `parity: ${key} — with the row's own judged count`);
    eq(s.total, i.total || 0, `parity: ${key} — and the row's own inventory count`);
    if (i.clause) spoke++; else silent++;
  }
  ok(spoke >= 4, "parity: the comparison covers several speaking issues");
  ok(silent >= 4, "parity: and several the row declines to characterise");
}

// ══ 3. THE RECORD LEADS — A VERDICT NO LONGER SUPPRESSES IT ══════════════════
// This section used to be called "A SCORED RESULT WINS", and it pinned the
// opposite contract: the hydrator skipped any cell whose pair the said-vs-did
// lane had already scored, on the reasoning that the verdict was the answer and a
// record clause beside it would be a second one.
//
// It is not a second answer. The verdict says whether somebody's votes matched
// something they SAID; the clause says what the votes DID, and it is the fact the
// verdict is derived from. Suppressing it meant that on exactly the pairs we know
// most about, the comparison grid printed a judgement and no record, while the
// pairs we know least about got the record — the product's own priority, upside
// down, on the surface where people actually choose.
//
// So the contract now runs the other way and is pinned the other way: every
// placeholder is filled, scored or not. Driven for real against a stub DOM: one
// cell on an issue the said-vs-did lane scored, one on an issue it did not, one
// with nothing on file, and two malformed markers.
{
  const scoredKey = SPOKEN_KEY, unscoredKey = UNIFORM_KEY;
  const ov = PC.officialRecord("recrep", scoredKey);
  must(!!ov, "PDXConsistency.officialRecord returned nothing for the scored fixture");
  eq(ov.token, "consistent", "scored: the fixture issue really is scored by the said-vs-did lane");
  eq(PC.officialRecord("recrep", unscoredKey).token, "limited",
    "scored: and the other issue really is not");
  // Non-vacuous in the other direction now: the scored issue is the one whose
  // cell used to come back blank, so a filled cell there is the whole finding.
  const wouldSay = slot("recrep", scoredKey);
  eq(wouldSay && wouldSay.state, "speaks",
    "scored: the record on the scored issue would otherwise fill the slot");
  eq(wouldSay && wouldSay.said, true,
    "scored: and the slot knows a position was stated there");
  eq(wouldSay && wouldSay.note, PC.recordDirection.NOTE_SAID,
    "scored: so its disclosure is the stated-but-unjudged one, not the nothing-said one");

  const mkEl = (dir, compact) => {
    const attrs = {};
    if (dir != null) attrs["data-vrdir"] = dir;
    if (compact) attrs["data-vrdir-compact"] = "1";
    return {
      innerHTML: "", attrs,
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      setAttribute: (k, v) => { attrs[k] = v; },
    };
  };
  const els = [
    mkEl("recrep|" + scoredKey, true),
    mkEl("recrep|" + unscoredKey, true),
    mkEl("recrep|" + NO_REC_KEY, true),
    mkEl("recrep"),          // malformed — one half of the pair missing
    mkEl("|" + UNIFORM_KEY), // malformed — no pid
  ];
  const scope = { querySelectorAll: () => els.filter((e) => !("data-vrdone" in e.attrs)) };

  must(typeof A.window._pdxHydrateRecordDirection === "function",
    "voting-record.js no longer exports window._pdxHydrateRecordDirection");
  A.fetched.length = 0;
  A.window._pdxHydrateRecordDirection(scope);
  await new Promise((r) => setTimeout(r, 0));

  eq(A.fetched.length, 1, "hydrate: the record layer is warmed in one batched call");
  eq((A.fetched[0] || []).join(","), "recrep", "hydrate: for exactly the members on screen");
  ok(els[0].innerHTML.length > 0,
    "hydrate: the cell on a SCORED issue is filled in too — the verdict no longer suppresses the record");
  has(els[0].innerHTML, "advanced it",
    "hydrate: and it is filled with what the record DID, not with the verdict");
  lacks(els[0].innerHTML, "Backs it up",
    "hydrate: an integrity verdict does not reach the comparison cell");
  ok(els[1].innerHTML.length > 0, "hydrate: the cell on an unscored issue is filled in");
  has(els[1].innerHTML, "advanced it", "hydrate: with the record-direction clause");
  has(els[2].innerHTML, "No record on file", "hydrate: and an empty issue says so explicitly");
  eq(els[3].innerHTML, "", "hydrate: a malformed marker writes nothing");
  eq(els[4].innerHTML, "", "hydrate: a marker with no member writes nothing");
  for (const e of els) eq(e.attrs["data-vrdone"], "1", "hydrate: every marker is retired once");

  // Idempotent: a second pass over the same subtree neither refetches nor rewrites.
  A.fetched.length = 0;
  const before = els.map((e) => e.innerHTML).join("␟");
  A.window._pdxHydrateRecordDirection(scope);
  await new Promise((r) => setTimeout(r, 0));
  eq(A.fetched.length, 0, "hydrate: a second pass fetches nothing");
  eq(els.map((e) => e.innerHTML).join("␟"), before, "hydrate: and rewrites nothing");
}
// …and structurally, not just behaviourally: the hydrator no longer holds a
// verdict table at all, and no longer asks the said-vs-did lane anything. A
// suppression list that merely stopped being consulted would drift back into use.
{
  const vr = CODE["voting-record.js"];
  lacks(vr, "_RD_SCORED",
    "scored: voting-record.js no longer keeps a verdict-suppression table");
  const body = fnBody("voting-record.js", "window._pdxHydrateRecordDirection =", "the hydrator");
  lacks(body, "officialRecord",
    "scored: and the hydrator does not consult the verdict lane before printing the record");
  has(body, "PC.recordDirection.for",
    "scored: it fills every placeholder through the one shared slot");
  // The verdicts it used to defer to are still live — they simply live elsewhere.
  for (const k of ["consistent", "contradicts", "mixed", "flag"]) {
    ok(!!(PC.VERDICTS && PC.VERDICTS[k]),
      `scored: ${k} is still a live said-vs-did verdict on the profile`);
  }
}

// ══ 4. NOT ORDINAL: NOT A SORT KEY, NOT A FILTER KEY, NOT A BUCKET ═══════════
// The slot returns display text and nothing comparable. The shape itself carries
// no score, and the one surface that ranks cards is pinned both ways: its ranking
// function may not mention the finding, and two records that differ only in
// record-direction must rank identically.
{
  const s = slot("recrep", UNIFORM_KEY);
  for (const k of ["pct", "score", "rank", "weight", "percent", "share", "rate"]) {
    ok(!(k in s), `ordinal: the slot shape carries no "${k}"`);
  }
  ok(typeof s.text === "string" && typeof s.state === "string",
    "ordinal: what it carries is text and a state");
}
{
  const src = CODE["issue-compare.js"];

  // The issue-choice grid used to rank cards inside each bucket with rankScore():
  // consistency verdict first, vote count as the tie-break. Both inputs are gone —
  // a verdict because an integrity judgement has no place on a comparison surface,
  // a vote count because it measures OUR coverage and ordering on it tells a
  // reader the best-documented person is the best person. Pinned as an absence, so
  // it cannot quietly return.
  lacks(src, "rankScore",
    "ordinal: issue-compare.js no longer ranks cards by verdict-and-vote-count");
  lacks(src, "consReadout",
    "ordinal: and it no longer renders an integrity verdict in the grid at all");
  for (const term of ["Backs it up", "Says one thing", "votes another", "Mixed record"]) {
    lacks(src, term, `grid: no integrity verdict label reaches the grid (${JSON.stringify(term)})`);
  }

  // What replaced it: a fixed literal group order and an A–Z sort inside it.
  const groupsAt = src.indexOf("RECORD_GROUPS");
  must(groupsAt !== -1,
    "issue-compare.js no longer defines RECORD_GROUPS — the grouping axis moved and cannot be checked");
  const decl = src.slice(groupsAt, src.indexOf(";", groupsAt) + 1);
  ok(/RECORD_GROUPS\s*=\s*\[\s*'speaks',\s*'thin',\s*'none',\s*'unread'\s*\]/.test(decl),
    "ordinal: the group order is a literal in source, not a tally");
  for (const term of ["judged", "held", "total", "pct", "score", "count"]) {
    lacks(decl, term, `ordinal: the group order is not derived from ${JSON.stringify(term)}`);
  }
  // The weak states are named separately and are not folded into the readable one.
  const metaAt = src.indexOf("RECORD_GROUP_META");
  must(metaAt !== -1, "issue-compare.js no longer defines RECORD_GROUP_META — the group copy moved");
  const meta = SURFACE_SRC["issue-compare.js"].slice(
    SURFACE_SRC["issue-compare.js"].indexOf("RECORD_GROUP_META"));
  for (const phrase of ["Too thin to read a direction", "No formal record on file yet",
                        "Record not readable here yet"]) {
    has(meta, phrase, `honest: the weak states keep their own words (${JSON.stringify(phrase)})`);
  }

  // Which group a card lands in reads the slot's STATE WORD and nothing else, and
  // a cold slot goes to 'unread' — never to 'none', which would be a claim.
  const grp = fnBody("issue-compare.js", "function recordGroup(", "the issue-choice grouping function");
  has(grp, "rd.state", "ordinal: the group is the slot's state word");
  has(grp, "'unread'", "honest: a slot we have not read yet is 'unread'");
  for (const term of ["judged", "held", "total", "pct", "sort", "score"]) {
    lacks(grp, term, `ordinal: recordGroup() does not read ${JSON.stringify(term)}`);
  }
  // …and the sort inside a group is the name, full stop.
  const byName = fnBody("issue-compare.js", "function byName(", "the issue-choice card sort");
  has(byName, "localeCompare", "ordinal: cards sort A–Z inside a group");
  for (const term of ["rd", "judged", "held", "total", "pct", "cons", "record"]) {
    lacks(byName, term, `ordinal: byName() does not read ${JSON.stringify(term)}`);
  }

  // BUCKET_META survives as the SECONDARY line's vocabulary — the stated position
  // still needs its canonical label — but it is no longer the grouping axis.
  const bucketAt = src.indexOf("BUCKET_META");
  must(bucketAt !== -1,
    "issue-compare.js no longer defines BUCKET_META — the stated-position vocabulary moved");

  // The record slot is now asked on every card rather than in two empty branches:
  // defined once, called once, from the lane that leads the card.
  const calls = src.split("recordDirHtml(").length - 1;
  eq(calls, 2, "lead: recordDirHtml is defined once and called exactly once");
  const lane = fnBody("issue-compare.js", "function recordLaneHtml(", "the issue-choice record lane");
  has(lane, "recordDirHtml(r)", "lead: the record lane is where it is called");
  has(lane, "r.warm", "honest: a cold card says it is still looking, not that nothing is on file");
  const card = fnBody("issue-compare.js", "function card(", "the issue-choice card");
  ok(card.indexOf("recordLaneHtml(r)") !== -1 && card.indexOf("ic-said-lane") !== -1,
    "lead: the card renders both lanes");
  ok(card.indexOf("What their record did") < card.indexOf("Stated position"),
    "lead: and the record heading is emitted before the stated-position heading");

  const sortish = src.match(/\.sort\([^)]*\)/g) || [];
  for (const m of sortish) {
    lacks(m, "rdir", "ordinal: no sort comparator mentions the record-direction slot");
    lacks(m, "recordDirection", "ordinal: no sort comparator reads the record-direction slot");
    lacks(m, "rankScore", "ordinal: no sort comparator ranks by verdict any more");
  }
}
// The compare table's own agreement maths never sees it either: the slot is
// written into a placeholder span AFTER paint, and the maths reads iss.cells.
{
  const cell = fnBody("compare-table.js", "function _cmpIssueCell(", "the compare issue cell");
  has(cell, "data-vrdir", "compare: every cell carries a record-direction placeholder");
  has(cell, "cmp-issue-rdir", "compare: on the cell's own hook class");
  lacks(cell, "sort", "compare: and the cell sorts nothing");
  // THE RECORD LEADS THE CELL. The placeholder used to trail the stated-position
  // pill and appear only where there was no pill at all. It is now emitted first,
  // on every cell, with the stated position as a labelled second line beneath it.
  ok(cell.indexOf("rdir") < cell.indexOf("saidHtml"),
    "lead: the record placeholder is built before the stated-position line");
  ok(cell.includes("${rdir}${saidHtml}") || cell.includes("rdir + saidHtml"),
    "lead: and the cell emits the record above the stated position");
  has(cell, "cmp-issue-saidlbl", "lead: the demoted stated position is labelled as one");
  has(cell, "Stated position", "lead: in the profile's own words");
  for (const term of ["Backs it up", "Says one thing", "kept", "broken", "Direction Match"]) {
    lacks(cell, term, `grid: no integrity verdict reaches the compare cell (${JSON.stringify(term)})`);
  }
  const src = CODE["compare-table.js"];
  has(src, "_pdxHydrateRecordDirection", "compare: the table asks the hydrator to fill them in");
  // WARMED WHEN THE LINEUP OPENS, not as a last-resort rebuild of an empty grid.
  const warm = fnBody("compare-table.js", "function _cmpWarmRecords(", "the compare record prefetch");
  has(warm, "fetchCompare", "warm: the batched record call is made up front");
  const open = fnBody("compare-table.js", "function openCompare(", "the compare overlay opener");
  has(open, "_cmpWarmRecords", "warm: and openCompare() fires it before the table is built");
  const sortish = src.match(/\.sort\([^)]*\)/g) || [];
  for (const m of sortish) {
    lacks(m, "vrdir", "compare: no sort comparator reads the placeholder");
    lacks(m, "recordDirection", "compare: no sort comparator reads the slot");
  }
  has(SURFACE_SRC["app.css"], ".cmp-issue-rdir", "compare: the placeholder has styling of its own");
  has(SURFACE_SRC["app.css"], ".cmp-issue-said", "compare: and so does the demoted stated position");
  has(SURFACE_SRC["app.css"], ".cmp-issue-rdfloor", "compare: and the row-level floor note");
  has(SURFACE_SRC["issue-compare.css"], ".ic-rdir", "issue-choice: and so does the readout slot");
  has(SURFACE_SRC["issue-compare.css"], ".ic-rec-lane", "issue-choice: and the card's record lane");
  has(SURFACE_SRC["issue-compare.css"], ".ic-said-lane", "issue-choice: and its stated-position lane");
}

// ══ 5. NO SCORE PATH MOVES ═══════════════════════════════════════════════════
// Sandbox B is the same six files with the shared slot deleted, so no surface can
// reach it. Read after every slot in sandbox A has been built and every cell
// hydrated, so a slot that wrote through to the score would show up here.
{
  const CB = B.window.PDXConsistency;
  const snap = (C) => {
    const out = {};
    for (const pid of ["recrep", "thinrec", "saydorep"]) {
      out[pid + "|official"] = C.officialRecord(pid);
      out[pid + "|saydo"] = C.sayVsDo(pid);
      out[pid + "|overall"] = C.overallVerdict(pid);
      for (const key of Object.keys(LABELS)) {
        out[pid + "|official|" + key] = C.officialRecord(pid, key);
        out[pid + "|saydo|" + key] = C.sayVsDo(pid, key);
      }
    }
    return JSON.stringify(out);
  };
  const a = snap(PC), b = snap(CB);
  ok(a.length > 100, "score: the Direction Match snapshot is non-empty");
  eq(a, b, "score: Direction Match is identical with the decision-surface slot live");
  eq(snap(PC), a, "score: and reading the slot twice leaves it where it was");

  // The stance store is untouched: no surface invents an official position.
  eq(JSON.stringify(A.window.ISSUE_STANCE_DATA), JSON.stringify(STANCES),
    "score: filling every slot mutates no stance data");
  eq((A.window.ISSUE_STANCE_DATA.recrep || []).map((s) => s.issueKey).join(","), SPOKEN_KEY,
    "score: the member still holds exactly the one position they stated");

  // And the share cards — the other consumer of the same finding — are identical.
  const RCB = B.window.PDXReceiptCards;
  for (const pid of ["recrep", "thinrec", "saydorep"]) {
    eq(JSON.stringify(RC.cardsFor(pid)), JSON.stringify(RCB.cardsFor(pid)),
      `score: ${pid} — the say-vs-do cards are identical`);
    eq(JSON.stringify(RC.recordDirectionCardsFor(pid)), JSON.stringify(RCB.recordDirectionCardsFor(pid)),
      `score: ${pid} — and the record-direction cards are identical`);
  }
}
// No alignment or consistency maths is touched by name anywhere in the pass.
{
  for (const f of ["compare-table.js", "issue-compare.js", "ballot-breakdown.js"]) {
    const src = CODE[f];
    const bad = (src.match(/_calcConsistencyScore\s*=[^=]/g) || []).length;
    eq(bad, 0, `score: ${f} does not redefine _calcConsistencyScore`);
  }
  const bb = CODE["ballot-breakdown.js"];
  const dir = fnBody("ballot-breakdown.js", "function _kraqRecordDir(", "the ballot card's record slot");
  for (const term of ["score", "bucket", "overall", "bd."]) {
    lacks(dir, term, `score: the ballot slot does not touch ${JSON.stringify(term)}`);
  }
  has(bb, "_calcAlignmentBreakdown", "score: the ballot view still scores through _calcAlignmentBreakdown");
}

// ══ 6. VOCABULARY: RECORD WORDS ONLY, ON EVERY SURFACE ═══════════════════════
// Asked of the rendered markup, tooltip and accessible name together, because a
// wall that only holds in the visible text is not a wall.
{
  const RENDERED = [];
  for (const key of Object.keys(LABELS)) {
    for (const pid of ["recrep", "thinrec"]) {
      const s = slot(pid, key);
      if (!s) continue;
      RENDERED.push([pid + "/" + key, html(pid, key), s]);
      RENDERED.push([pid + "/" + key + " (compact)", html(pid, key, { compact: true }), s]);
    }
  }
  ok(RENDERED.length > 20, "vocab: there is a real corpus of rendered slots to check");
  for (const [where, out, s] of RENDERED) {
    // The sentences THIS pass composes, separated from the fixed disclosure. The
    // disclosure says "No stated position on file", which is the honest thing to
    // say and is also, necessarily, the words "stated position" — it is pinned
    // verbatim to the share card's note above and gated there. The walls below are
    // asked of the copy the slot actually writes.
    const composed = [s.text, s.clause, s.summary].join(" ␟ ");
    // ── No percentage, no share, no proportion ───────────────────────────────
    lacks(out, "%", `no-%: ${where} — no percent sign`);
    ok(!/\bpercent\b/i.test(out), `no-%: ${where} — no spelled-out percent`);
    ok(!/\d+\s*out\s+of\s+\d/i.test(out), `no-%: ${where} — no "N out of M" share`);
    ok(!RC.guards.rdProportionRe.test(out), `no-%: ${where} — no proportion of any kind`);
    // ── No stance vocabulary, no borrowed said-vs-did verdict ────────────────
    ok(!RC.guards.rdStanceWordRe.test(composed), `copy: ${where} — no stance vocabulary`);
    ok(!RC.guards.rdSaydoTokenRe.test(composed), `copy: ${where} — no said-vs-did verdict token`);
    for (const k of ["consistent", "contradicts", "mixed", "flag"]) {
      const label = PC.VERDICTS[k] && PC.VERDICTS[k].label;
      must(!!label, `the live ${k} verdict label could not be read to compare against`);
      lacks(out, label, `copy: ${where} — the live "${label}" verdict never appears`);
    }
    // ── No party framing ────────────────────────────────────────────────────
    ok(!/\b(?:party\s+lines?|caucus|crossed\s+the\s+aisle|bipartisan|broke\s+with\s+(?:their|his|her|the)\s+party)\b/i.test(out),
      `copy: ${where} — no party framing`);
    for (const p of ["Republican", "Democrat", "GOP", "(R)", "(D)"]) {
      lacks(out, p, `copy: ${where} — no party label`);
    }
    // ── No public-lane blending ─────────────────────────────────────────────
    lacks(out, "Public-record match", `lane: ${where} — no public-lane verdict`);
    ok(!/\b(?:poll|approval|endorse|social\s+media|statement\s+match)\b/i.test(out),
      `lane: ${where} — nothing from the public lane`);
    eq(s.lane === "exec", false, `lane: ${where} — the exec lane never reaches this slot`);
    // ── The accessible name always carries the disclosure ────────────────────
    has(out, 'aria-label="', `a11y: ${where} — the slot has an accessible name`);
    if (s.note) has(s.aria, s.note, `a11y: ${where} — the disclosure is in the accessible name`);
  }
  // ── And the words it DOES use, plus the teaching control on them ───────────
  const speaking = RENDERED.filter(([, , s]) => s.state === "speaks");
  ok(speaking.length > 3, "vocab: several speaking slots to check the vocabulary of");
  for (const [where, out] of speaking) {
    ok(/advanced it|cut against it|ran both ways/.test(out),
      `vocab: ${where} — the vocabulary is the record's own`);
    ok(/\bvotes?\b/.test(out), `vocab: ${where} — the countable is votes`);
    has(out, 'data-pdx-term=', `teach: ${where} — the phrase carries its glossary control`);
    ok(/data-pdx-term="(?:recorddirection|ranbothways)"/.test(out),
      `teach: ${where} — on the record-direction or ran-both-ways entry`);
  }
  // The glossary entries those controls point at actually exist, so no surface
  // ships a dotted underline that opens nothing.
  const L = A.window.PDXLearn;
  must(!!(L && typeof L.term === "function"), "pdx-learn.js no longer exports PDXLearn.term");
  for (const k of ["recorddirection", "ranbothways"]) {
    has(L.term(k, "advanced it"), "data-pdx-term", `teach: the ${k} glossary entry is live`);
  }
  // compact drops the printed disclosure and nothing else — it must never drop it
  // from the tooltip or the accessible name.
  {
    const full = html("recrep", UNIFORM_KEY);
    const tight = html("recrep", UNIFORM_KEY, { compact: true });
    has(full, "pdx-rdir-note", "compact: the full slot prints the disclosure");
    lacks(tight, "pdx-rdir-note", "compact: the tight slot does not");
    has(tight, RC.guards.rdNote.slice(0, 40).replace(/&/g, "&amp;"),
      "compact: but the disclosure is still in the tooltip and the accessible name");
  }
}

// ══ 7. THE BALLOT CARD ═══════════════════════════════════════════════════════
// The ballot row had two silent shapes: an issue with no stated position returned
// '' outright, and an issue with a record but nothing judged printed a count under
// a "Say-vs-Do" heading naming a comparison that never happened. Both are now the
// record's own line — and the scored path is untouched.
{
  const line = fnBody("ballot-breakdown.js", "function _kraqRecordLine(", "the ballot record line");
  has(line, "_kraqRecordDir(it)", "ballot: the line asks the shared slot");
  has(line, "_KRAQ_SCORED", "ballot: gated on whether the say-vs-do lane reached a verdict");
  ok(/if\s*\(!scored\)\s*return\s+rdirLine;/.test(line),
    "ballot: an unscored record replaces the Say-vs-Do count rather than sitting beside it");
  ok(/return rdirLine;/.test(line),
    "ballot: and the previously silent branch now returns the slot");
  lacks(line, "return '';", "ballot: no branch returns an unconditional blank any more");
  const dir = fnBody("ballot-breakdown.js", "function _kraqRecordDir(", "the ballot card's record slot");
  has(dir, "PC.recordDirection.for", "ballot: through the shared slot, not a local re-wording");
  has(dir, "it.key", "ballot: on the row's own issue");
  const scored = fnBody("ballot-breakdown.js", "var _KRAQ_SCORED =", "the ballot scored-verdict table");
  for (const k of ["consistent", "contradicts", "mixed"]) {
    has(scored, k, `ballot: the ${k} verdict wins outright`);
  }
  // THE ORDER, NOT THE EXCLUSION. A scored row used to build no record slot at
  // all (`rdir = scored ? '' : ...`), so on the issues where the file is richest
  // the ballot card printed a judgement and no record. Both now print — the record
  // first, the Say-vs-Do verdict underneath it, never merged into one line.
  ok(/rdir\s*=\s*_kraqRecordDir\(it\);/.test(line),
    "ballot: the record slot is built on every row, scored or not");
  lacks(line, "scored ? '' :", "ballot: a verdict no longer suppresses the record");
  const scoredReturn = line.slice(line.lastIndexOf("return rdirLine"));
  ok(scoredReturn.indexOf("rdirLine") < scoredReturn.indexOf("Say-vs-Do"),
    "ballot: and on a scored row the record line is emitted above the verdict");
}

// ══ 8. TWO THIN CELLS ARE NOT A COMPARISON ═══════════════════════════════════
// Putting the record first solves one dishonesty and opens another: a row of cells
// each reading "3 votes on file — thin read, not a deep pattern" has the same shape,
// weight and visual promise as a row where two records ran plainly opposite ways,
// and the reader's eye takes the ROW as the finding. The floor below is the shared
// answer both grids use. What it must do is say so; what it must NOT do is touch
// a single cell.
{
  must(typeof PC.recordDirection.compare === "function",
    "PDXConsistency.recordDirection.compare is not exported — the comparison floor is gone");
  must(typeof PC.recordDirection.compareHtml === "function",
    "PDXConsistency.recordDirection.compareHtml is not exported");
  const RD = PC.recordDirection;
  eq(RD.CMP_FLOOR, 2, "floor: a comparison needs two readable records");

  const stateOf = (pid, key) => { const x = slot(pid, key); return x ? x.state : "cold"; };
  // The fixtures really do land in the states this section depends on.
  eq(stateOf("recrep", UNIFORM_KEY), "speaks", "floor: the deep member's record speaks here");
  eq(stateOf("recrep2", UNIFORM_KEY), "speaks", "floor: and so does the second deep member's");
  eq(stateOf("recrep", NO_REC_KEY), "none", "floor: an issue with nothing on file says none");
  eq(stateOf("coldrep", UNIFORM_KEY), "cold", "floor: an unfetched member is cold, not empty");

  // Two readable records → a comparison, and no note at all.
  const both = RD.compare(["recrep", "recrep2"], UNIFORM_KEY);
  eq(both.speaks, 2, "floor: two readable records are counted");
  eq(both.comparable, true, "floor: which clears the floor");
  eq(both.note, "", "floor: so nothing is said about the row");
  eq(RD.compareHtml(both), "", "floor: and nothing is rendered");

  // One readable record → named as exactly that, not as an empty row.
  const one = RD.compare(["recrep", "thinrec"], UNIFORM_KEY);
  eq(one.speaks, 1, "floor: one readable record is counted as one");
  eq(one.comparable, false, "floor: which does not clear the floor");
  eq(one.note, RD.CMP_ONE, "floor: and the copy says so specifically");
  has(RD.compareHtml(one), "not enough to compare yet", "floor: rendered in the row's own words");

  // No readable record → the general sentence.
  const none = RD.compare(["recrep", "recrep2"], NO_REC_KEY);
  eq(none.speaks, 0, "floor: no readable record is counted as none");
  eq(none.note, RD.CMP_NONE, "floor: and gets the general sentence");
  eq(none.note, "Not enough on file to compare yet", "floor: which is the product's own wording");

  // A COLD ROW CLAIMS NOTHING. Mid-fetch is not an absence, and a half-loaded row
  // that announced "not enough on file" would be asserting something it has not
  // looked at.
  const cold = RD.compare(["recrep", "coldrep"], UNIFORM_KEY);
  eq(cold.cold, 1, "floor: an unfetched member is counted as cold");
  eq(cold.note, "", "floor: and a cold row says nothing yet");
  eq(RD.compareHtml(cold), "", "floor: rendering nothing at all");

  // IT MAY NOT WEAKEN A CELL. Every slot in a sub-floor row still says exactly
  // what it said before the row was read, word for word.
  for (const [pid, key] of [["recrep", UNIFORM_KEY], ["thinrec", UNIFORM_KEY], ["recrep", NO_REC_KEY]]) {
    const before = html(pid, key);
    RD.compare(["recrep", "thinrec"], key);
    eq(html(pid, key), before, `floor: reading the row leaves ${pid}/${key} untouched`);
  }
  // …and the three weak states stay distinguishable from each other in the markup.
  const speaksHtml = html("recrep", UNIFORM_KEY);
  const thinHtml = html("thinrec", UNIFORM_KEY);
  const noneHtml = html("recrep", NO_REC_KEY);
  ok(speaksHtml !== thinHtml && thinHtml !== noneHtml && speaksHtml !== noneHtml,
    "honest: speaks, thin and none render as three different things");
  has(noneHtml, "No record on file", "honest: an empty record says it is empty");
  lacks(thinHtml, "No record on file", "honest: and a thin record is not called empty");

  // NOT ORDINAL. The shape is counts of states — never a share, a score or a rank.
  for (const k of ["pct", "score", "rank", "weight", "percent", "share", "rate"]) {
    ok(!(k in both), `floor: the row shape carries no "${k}"`);
  }

  // Both grids mount it, and neither sorts on it.
  const ct = CODE["compare-table.js"], ic = CODE["issue-compare.js"];
  has(ct, "data-cmp-rdfloor", "floor: the compare table mounts the note on the row label");
  const paint = fnBody("compare-table.js", "function _cmpPaintCompareFloor(", "the compare floor painter");
  has(paint, "RD.compare", "floor: through the shared primitive, not a local re-count");
  has(ic, "RD.compare(show", "floor: and the issue-choice grid asks it for the whole field");
  for (const m of [...(ct.match(/\.sort\([^)]*\)/g) || []), ...(ic.match(/\.sort\([^)]*\)/g) || [])]) {
    lacks(m, "compare(", "floor: no sort comparator reads the row floor");
    lacks(m, "comparable", "floor: and none reads its verdict");
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failed, ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error("  ✖ " + f);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`✔ record-direction decision surfaces: ${passed} checks passed`);
