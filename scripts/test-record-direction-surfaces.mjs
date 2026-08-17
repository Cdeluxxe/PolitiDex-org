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
      out += c; i++;                            // a regex literal, opaque
      let inClass = false;
      while (i < n) {
        if (s[i] === "\\") { out += s[i] + (s[i + 1] || ""); i += 2; continue; }
        if (s[i] === "[") inClass = true;
        else if (s[i] === "]") inClass = false;
        out += s[i];
        if (s[i] === "/" && !inClass) { i++; break; }
        if (s[i] === "\n") { i++; break; }
        i++;
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
  thinrec: { name: "Rep. Thin Member",   office: "U.S. House", district: "TX-08", state: "TX", party: "R" },
  saydorep:{ name: "Rep. Said Member",   office: "U.S. House", district: "TX-09", state: "TX", party: "D" },
  coldrep: { name: "Rep. Cold Member",   office: "U.S. House", district: "TX-10", state: "TX", party: "D" },
};
const RECORD_STORE = { recrep: REC_RECORDS, thinrec: THIN_RECORDS, saydorep: SAYDO_RECORDS };

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
    location: { hash: "", origin: "https://politidex.fyi", pathname: "/" },
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
  has(s.text.toLowerCase(), "too thin to characterise", `thin: ${why} says why in the token's words`);
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

// ══ 3. A SCORED RESULT WINS ══════════════════════════════════════════════════
// The compare cell's ordering lives in the hydrator, because the hydrator is the
// thing holding the verdict. Driven for real against a stub DOM: one cell on an
// issue the said-vs-did lane scored, one on an issue it did not.
{
  const scoredKey = SPOKEN_KEY, unscoredKey = UNIFORM_KEY;
  const ov = PC.officialRecord("recrep", scoredKey);
  must(!!ov, "PDXConsistency.officialRecord returned nothing for the scored fixture");
  eq(ov.token, "consistent", "scored: the fixture issue really is scored by the said-vs-did lane");
  eq(PC.officialRecord("recrep", unscoredKey).token, "limited",
    "scored: and the other issue really is not");
  // Non-vacuous: the slot WOULD have something to say on the scored issue.
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
  eq(els[0].innerHTML, "",
    "hydrate: the cell on a SCORED issue is left exactly as it was painted");
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
// The scored-wins table is the said-vs-did verdict table, not a private list that
// could fall behind it.
{
  const body = fnBody("voting-record.js", "var _RD_SCORED =", "the hydrator's scored-verdict table");
  for (const k of ["consistent", "contradicts", "mixed", "flag"]) {
    has(body, k, `scored: the hydrator defers to the ${k} verdict`);
    ok(!!(PC.VERDICTS && PC.VERDICTS[k]), `scored: ${k} is a live said-vs-did verdict`);
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
  const body = fnBody("issue-compare.js", "function rankScore(", "the issue-choice ranking function");
  for (const term of ["recordDirection", "recordDirHtml", "_pdxRecordDirection", "rdir",
                      "advanced it", "record_direction"]) {
    lacks(body, term, `ordinal: rankScore() does not mention ${JSON.stringify(term)}`);
  }
  // …and the ranking function still exists to be checked, on the shape it always
  // read. Run it: a dense-record card and a bare card must tie.
  const fn = vm.runInNewContext("(" + body.replace(/^function rankScore/, "function") + ")", { Math });
  const bare = { cons: { state: "no_record" } };
  const dense = { cons: { state: "no_record" } };
  eq(fn(bare), 0, "ordinal: a card with no scored record ranks 0");
  eq(fn(dense), fn(bare),
    "ordinal: and a dense unscored record ranks identically — the slot changes what it says, not where it sits");
  ok(fn({ cons: { uni: { token: "consistent", record: { total: 4 } } } }) > fn(bare),
    "ordinal: while a genuinely scored card still outranks both");

  // The bucketing axis is the stated position, and nothing below reassigns it.
  const bucketAt = src.indexOf("BUCKET_META");
  must(bucketAt !== -1, "issue-compare.js no longer defines BUCKET_META — the bucketing axis moved");
  // Every call site of the record-direction slot in this file, enumerated: two
  // empty branches of the readout and nothing else.
  const calls = src.split("recordDirHtml(").length - 1;
  eq(calls, 3, "ordinal: recordDirHtml is defined once and called exactly twice");
  const readout = fnBody("issue-compare.js", "function consReadout(", "the issue-choice readout");
  eq(readout.split("recordDirHtml(r)").length - 1, 2,
    "ordinal: both call sites are inside the readout — the display path only");
  const sortish = src.match(/\.sort\([^)]*\)/g) || [];
  for (const m of sortish) {
    lacks(m, "rdir", "ordinal: no sort comparator mentions the record-direction slot");
    lacks(m, "recordDirection", "ordinal: no sort comparator reads the record-direction slot");
  }
}
// The compare table's own agreement maths never sees it either: the slot is
// written into a placeholder span AFTER paint, and the maths reads iss.cells.
{
  const cell = fnBody("compare-table.js", "function _cmpIssueCell(", "the compare issue cell");
  has(cell, "data-vrdir", "compare: the empty cell carries a record-direction placeholder");
  has(cell, "cmp-issue-rdir", "compare: on the cell's own hook class");
  lacks(cell, "sort", "compare: and the cell sorts nothing");
  const src = CODE["compare-table.js"];
  has(src, "_pdxHydrateRecordDirection", "compare: the table asks the hydrator to fill them in");
  const sortish = src.match(/\.sort\([^)]*\)/g) || [];
  for (const m of sortish) {
    lacks(m, "vrdir", "compare: no sort comparator reads the placeholder");
    lacks(m, "recordDirection", "compare: no sort comparator reads the slot");
  }
  has(SURFACE_SRC["app.css"], ".cmp-issue-rdir", "compare: the placeholder has styling of its own");
  has(SURFACE_SRC["issue-compare.css"], ".ic-rdir", "issue-choice: and so does the readout slot");
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
  ok(/if\s*\(!scored\s*&&\s*rdirLine\)\s*return\s+rdirLine;/.test(line),
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
  // The judged-lane vocabulary and the record-direction line are mutually
  // exclusive: no row can carry both a Say-vs-Do verdict and a record-direction
  // clause, which is what "no judged-lane verdict tokens on a pure
  // record-direction row" means in markup.
  ok(/rdir\s*=\s*scored\s*\?\s*''\s*:/.test(line),
    "ballot: a scored row builds no record-direction slot at all");
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failed, ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error("  ✖ " + f);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`✔ record-direction decision surfaces: ${passed} checks passed`);
