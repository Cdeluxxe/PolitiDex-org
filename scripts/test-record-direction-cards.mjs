#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the RECORD-DIRECTION SHARE CARD in receipt-cards.js
// ─────────────────────────────────────────────────────────────────────────────
// Every other card in receipt-cards.js is a comparison: a stated position on one
// side, a formal action on the other, and a verdict about the distance between
// them. This one is not. It has ONE side — what the member's own formal record
// did on an issue — and it exists for the rows where nothing was ever said, so
// there is no comparison available to make and none may be implied.
//
// That makes the interesting failures different from the ones the say-vs-do
// harness gates. A record-direction card is wrong if it:
//
//   1. reads as a STANCE — "supports", "opposes", "backed it up", a stated
//      position printed or implied, a position created where none exists;
//   2. reads as a SECOND SCORE — a percentage, a share, a proportion, anything
//      that could sit beside ⚖️ Direction Match and look like a rival figure;
//   3. borrows a SAID-VS-DID verdict token (Backed up / Contradicted) for a
//      comparison that never happened;
//   4. is built where the profile row itself would decline to characterise the
//      record — thin, split, below the coverage floor, or on a key with no
//      support pole. The card's eligibility is the ROW's eligibility, and the
//      test for that is that the card feed and _recordDirectionIndex agree
//      without a second copy of the thresholds living here;
//   5. costs the say-vs-do cards anything — one extra card, one fewer card, one
//      different reason, or one point of Direction Match.
//
//   node scripts/test-record-direction-cards.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["stance-helpers.js", "consistency.js", "say-vs-do.js",
               "voting-record.js", "receipt-cards.js"];
const SRC_FILES = FILES.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]);

// ── Fixtures ─────────────────────────────────────────────────────────────────
// One member with no stated positions and a deep record, built so that every
// gate in _recordDirectionIndex is exercised by a real issue rather than by a
// stub: a dominant split, a uniform run, a two-vote uniform run, a three-vote
// mix, a lone vote, an even split, a `*_balance` key, a no-pole key, and one
// issue where a stated position exists and the say-vs-do lane owns the row.
const LABELS = {
  climate_action:       "🌍 Climate Action",
  school_choice:        "🎓 School Choice",
  lower_taxes:          "🧾 Lower Taxes",
  national_debt:        "💰 National Debt",
  border_security:      "🛂 Border Security",
  gov_regulation:       "📋 Government Regulation",
  immigration:          "🛬 Immigration Levels",
  gun_rights:           "🔫 Gun Rights",
  rights_safety_balance:"⚖️ Rights + Common-Sense Safety",
  war_powers:           "⚔️ Congress and War Powers",
  healthcare:           "🏥 Health Care",
};

const SPLIT_KEY   = "climate_action";        // 8 judged, 6 advance / 2 cut against
const UNIFORM_KEY = "school_choice";         // 5 judged, all advance
const THIN_UNI    = "lower_taxes";           // 2 judged, both advance
const MIXED3      = "national_debt";         // 3 judged, 2/1 — under the depth floor
const SOLO        = "border_security";       // 1 judged
const EVEN_SPLIT  = "gov_regulation";        // 6 judged, 3/3 — no dominant side
const SHORT_SPLIT = "immigration";           // 4 judged, 2/2 — a split, under the
                                             //   depth at which counts are stated
const LOPSIDED    = "gun_rights";            // 6 judged, 5 procedural / 1 full —
                                             //   split by weight, one item a side
const BALANCE_KEY = "rights_safety_balance"; // suppressed: no pole to advance
const NO_POLE_KEY = "war_powers";            // suppressed: contested authority
const SPOKEN_KEY  = "healthcare";            // a stated position exists

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
  ...many(5, LOPSIDED, "yea", { procedural: true }),
  ...many(1, LOPSIDED, "nay"),
  ...many(4, BALANCE_KEY, "yea"),
  ...many(5, NO_POLE_KEY, "yea"),
  ...many(5, SPOKEN_KEY, "yea"),
];
// Under the coverage floor: five mapped records is our sampling, not their
// conduct, however one-sided those five happen to look.
const THIN_RECORDS = many(5, UNIFORM_KEY, "yea");
// The say-vs-do lane, untouched by any of this — a stated position with a record
// that lines up behind it.
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

// `withRecordDirection: false` removes the index the whole feed hangs off, which
// is the cleanest available "this slice was never shipped" control: no card can
// be built, and everything else in the four files runs exactly as before.
function boot(withRecordDirection) {
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
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  ctx.ISSUE_MAP = ctx.window.ISSUE_MAP = Object.fromEntries(
    Object.entries(LABELS).map(([k, label]) => [k, { label }]));
  ctx.ISSUE_STANCE_DATA = ctx.window.ISSUE_STANCE_DATA = JSON.parse(JSON.stringify(STANCES));
  ctx.PROFILES = ctx.window.PROFILES = JSON.parse(JSON.stringify(PROFILES));

  const sandbox = vm.createContext(ctx);
  for (const [f, src] of SRC_FILES) vm.runInContext(src, sandbox, { filename: f });

  // The record layer, stubbed at the one method every read goes through.
  ctx.window.PDXVotingRecord.memberRecords = (pid) => RECORD_STORE[pid] || null;
  ctx.window.PDXVotingRecord.fetchMember = (pid) =>
    Promise.resolve({ items: RECORD_STORE[pid] || [] });
  ctx.window.PDXVotingRecord.noteMember = () => {};

  if (!withRecordDirection) ctx.window._recordDirectionIndex = undefined;
  return ctx;
}

const A = boot(true);   // the slice as shipped
const B = boot(false);  // the same four files with the record-direction feed dark

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} missing from ${JSON.stringify(String(hay))})`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} unexpectedly present)`);

const RC = A.window.PDXReceiptCards;
ok(!!RC, "export: window.PDXReceiptCards exists");
if (!RC) { console.error("✖ PDXReceiptCards not exported — cannot continue"); process.exit(1); }

// ══ 0. THE FEED IS REACHABLE AND NAMED ═══════════════════════════════════════
for (const fn of ["recordDirection", "recordDirectionCardsFor", "publicRecordDirectionCardsFor",
                  "recordDirectionCandidates", "recordDirectionAudit"]) {
  ok(typeof RC[fn] === "function", `export: PDXReceiptCards.${fn} is present`);
}
eq(RC.RECORD_DIRECTION_ORIGIN, "record_direction", "export: the origin token is exposed");
ok(!!RC.RECORD_DIRECTION_VERDICT, "export: the record-direction stamp is exposed");

// The stamp is not a verdict, so its key may not collide with one — a collision
// would let a record-direction card inherit say-vs-do styling and vocabulary.
{
  const key = RC.RECORD_DIRECTION_VERDICT.key;
  const C = A.window.PDXConsistency;
  ok(!(C.VERDICTS && C.VERDICTS[key]),
    "wall: the record-direction key is not a say-vs-do verdict key");
  const saydoKeys = Object.keys(C.VERDICTS || {});
  ok(saydoKeys.length > 0, "wall: the say-vs-do verdict table was found to compare against");
  for (const k of saydoKeys) {
    ok(String((C.VERDICTS[k] || {}).label || "").toLowerCase() !==
       String(RC.RECORD_DIRECTION_VERDICT.label || "").toLowerCase(),
      `wall: the record-direction label is not the ${k} verdict's label`);
  }
}

const rdAudit = RC.recordDirectionAudit("recrep");
const rdRow = (issueKey) => rdAudit.find((r) => r.issueKey === issueKey) || null;
const rdReason = (issueKey) => { const r = rdRow(issueKey); return r ? r.reason : "(no candidate)"; };
const rdEligible = (issueKey) => { const r = rdRow(issueKey); return !!(r && r.eligible); };

// ══ 1. THE TWO WORKED EXAMPLES ═══════════════════════════════════════════════

// ── Uniform ───────────────────────────────────────────────────────────────────
// "On [issue], [Name]'s recorded votes all advanced it (N)." One count, no
// second side asserted, no lean claimed on top of the run.
const uniform = RC.recordDirection("recrep", UNIFORM_KEY);
ok(!!uniform, "uniform: a deep no-stance row builds a record-direction card");
if (uniform) {
  eq(uniform.origin, "record_direction", "uniform: the card is on the record-direction feed");
  eq(uniform.headline,
    "On School Choice, Rep. Record Member’s recorded votes all advanced it (5).",
    "uniform: the headline is the counted finding in the uniform form");
  eq(uniform.recordDirection.judged, 5, "uniform: five judged records behind it");
  eq(uniform.recordDirection.advances, 5, "uniform: all five advanced it");
  eq(uniform.recordDirection.opposes, 0, "uniform: none cut against it");
  eq(uniform.recordDirection.uniform, true, "uniform: the card knows the record is one-sided");
  eq(uniform.recordDirection.token, "record_direction",
    "uniform: the row token behind it is the characterised one");
  eq(uniform.sides, undefined, "uniform: a one-sided record gets no both-sides block");
  eq(uniform.didLine, "All 5 recorded votes advanced it",
    "uniform: the short form is the count, not the one cited measure");
  ok(!!uniform.measureNumber, "uniform: one strongest citable example is named");
  ok(!!uniform.verifyUrl, "uniform: the example carries an address a reader could open");
  eq(uniform.hash, "#record=recrep~school_choice",
    "uniform: the card links back to the politician × issue Official Record");
}

// ── Split ────────────────────────────────────────────────────────────────────
// "On [issue], [Name] has N recorded votes — X advanced it, Y cut against it."
// Both sides counted, and — because both sides have something citable — one
// named, dated, sourced example on each.
const split = RC.recordDirection("recrep", SPLIT_KEY);
ok(!!split, "split: a dominant-but-two-sided row builds a record-direction card");
if (split) {
  eq(split.headline,
    "On Climate Action, Rep. Record Member has 8 recorded votes — 6 advanced it, 2 cut against it.",
    "split: the headline is the counted finding in the two-sided form");
  eq(split.recordDirection.judged, 8, "split: eight judged records behind it");
  eq(split.recordDirection.advances, 6, "split: six advanced it");
  eq(split.recordDirection.opposes, 2, "split: two cut against it");
  eq(split.recordDirection.uniform, false, "split: the card knows the record ran both ways");
  ok(!!split.sides, "split: both sides of the record are shown");
  if (split.sides) {
    eq(split.sides.counts.with, 6, "split: the advanced-it count is the index's count");
    eq(split.sides.counts.against, 2, "split: the cut-against-it count is the index's count");
    eq(split.sides.with.head, "ADVANCED IT", "split: the advancing example is labelled by effect");
    eq(split.sides.against.head, "CUT AGAINST IT", "split: the cutting example is labelled by effect");
    ok(!!split.sides.with.url && !!split.sides.against.url,
      "split: each cited example carries its own address");
    ok(split.sides.with.number !== split.sides.against.number,
      "split: the two examples are two different measures");
  }
  eq(split.measureNumbers && split.measureNumbers.length, 2,
    "split: the card names both measures it cites");
  eq(split.didLine, "8 recorded votes — 6 advanced it, 2 cut against it",
    "split: the short form carries both counts");
  eq(split.hash, "#record=recrep~climate_action",
    "split: the card links back to the politician × issue Official Record");
}

// The two-vote uniform run is the third shape the row model characterises, and
// the card feed follows the row rather than inventing a depth rule of its own.
const thinUniform = RC.recordDirection("recrep", THIN_UNI);
ok(!!thinUniform, "thin-uniform: a two-vote uniform run builds, because the row characterises it");
if (thinUniform) {
  eq(thinUniform.recordDirection.token, "record_uniform_thin",
    "thin-uniform: it is built on the row's uniform-run token, not on record_direction");
  eq(thinUniform.recordDirection.judged, 2, "thin-uniform: two judged records behind it");
}

// ── Ran both ways ────────────────────────────────────────────────────────────
// The fourth shape, and the one this move exists for. A record with no dominant
// side used to leave the app as nothing at all: the row shrugged and the card
// feed refused it, because the feed asked whether a direction could be named.
// Now it asks a weaker question — may these two counts be stated? — and a record
// deep enough with both sides material answers yes without ever answering the
// first. So the card says how many, and which way each, and stops.
const bothWays = RC.recordDirection("recrep", EVEN_SPLIT);
ok(!!bothWays, "both-ways: a deep even record builds a record-direction card");
if (bothWays) {
  eq(bothWays.origin, "record_direction", "both-ways: the card is on the record-direction feed");
  eq(bothWays.recordDirection.token, "record_split_deep",
    "both-ways: it is built on the row's deep-split token");
  eq(bothWays.recordDirection.split, true, "both-ways: the card knows it is a split");
  eq(bothWays.recordDirection.counted, true, "both-ways: …that may state its counts");
  eq(bothWays.recordDirection.characterised, false,
    "both-ways: …and characterises no direction");
  eq(bothWays.recordDirection.lead, null, "both-ways: no side leads");
  eq(bothWays.recordDirection.uniform, false, "both-ways: the record is not one-sided");
  // The counts, which are the entire finding.
  eq(bothWays.recordDirection.judged, 6, "both-ways: six judged records behind it");
  eq(bothWays.recordDirection.advances, 3, "both-ways: three advanced it");
  eq(bothWays.recordDirection.opposes, 3, "both-ways: three cut against it");
  eq(bothWays.headline,
    "On Government Regulation, Rep. Record Member’s record ran both ways — 6 recorded votes: 3 advanced it, 3 cut against it.",
    "both-ways: the headline states the total and each side, and claims nothing else");
  eq(bothWays.didLine, "6 recorded votes, both ways — 3 advanced it, 3 cut against it",
    "both-ways: the short form carries the total and both counts");
  has(bothWays.headline, "ran both ways",
    "both-ways: the headline says on its face that the record went two directions");
  // Labelled as a record that ran both ways — not as a direction, and not as a
  // verdict borrowed from the say-vs-do lane.
  eq(bothWays.recordLabel, "WHAT THE RECORD DID — BOTH WAYS",
    "both-ways: the record half is labelled as a two-way record");
  eq(bothWays.verdict && bothWays.verdict.label, RC.RECORD_DIRECTION_SPLIT_LABEL,
    "both-ways: the stamp reads as a record that ran both ways");
  eq(bothWays.verdict && bothWays.verdict.key, "record_direction",
    "both-ways: …on the record-direction verdict key, not a new one");
  eq(bothWays.stampKicker, "RECORD DIRECTION",
    "both-ways: the kicker still discloses the lane");
  // Both sides shown, each with its own citable example — and the right example
  // under the right heading, which is the one thing a null lead could have got
  // silently backwards.
  ok(!!bothWays.sides, "both-ways: both sides of the record are shown");
  if (bothWays.sides) {
    eq(bothWays.sides.counts.with, 3, "both-ways: the advanced-it count is the index's count");
    eq(bothWays.sides.counts.against, 3, "both-ways: the cut-against-it count is the index's count");
    eq(bothWays.sides.with.head, "ADVANCED IT", "both-ways: the advancing example is labelled by effect");
    eq(bothWays.sides.against.head, "CUT AGAINST IT", "both-ways: the cutting example is labelled by effect");
    ok(!!bothWays.sides.with.url && !!bothWays.sides.against.url,
      "both-ways: each cited example carries its own address");
    ok(bothWays.sides.with.number !== bothWays.sides.against.number,
      "both-ways: the two examples are two different measures");
    const advIds = new Set(REC_RECORDS.filter(
      (r) => r.issues[0].issueKey === EVEN_SPLIT && r.position === "yea").map((r) => r.number));
    ok(advIds.has(bothWays.sides.with.number),
      "both-ways: the example under ADVANCED IT is one of the records that advanced it");
    ok(!advIds.has(bothWays.sides.against.number),
      "both-ways: and the example under CUT AGAINST IT is not");
  }
  eq(bothWays.measureNumbers && bothWays.measureNumbers.length, 2,
    "both-ways: the card names both measures it cites");
  eq(bothWays.hash, "#record=recrep~gov_regulation",
    "both-ways: the card links back to the politician × issue Official Record");
  // No direction leaks in through the back door.
  const bwText = RC.guards.rdComposed(bothWays);
  ok(!/\b(?:mostly|mainly|largely|leans?|tends?|on\s+balance|overall|more\s+often)\b/i.test(bwText),
    "both-ways: nothing in the copy characterises the split as leaning either way");
  ok(!/\brecord\s+(?:advanced|cut\s+against)\s+it\b/i.test(bwText),
    "both-ways: and the record itself is never said to have done one of the two");
}

// ══ 2. IT IS A RECORD CARD, NOT A STANCE CARD ════════════════════════════════
const built = [uniform, split, thinUniform, bothWays].filter(Boolean);
ok(built.length === 4, "cards: all four worked examples built");

for (const card of built) {
  const where = card.issueKey;
  // No stance is printed, and none is created.
  eq(card.said, null, `stance: ${where} — the card carries no SAID half at all`);
  eq(card.saidLabel, "", `stance: ${where} — and no label for the half that is not there`);
  eq(card.saidNote, "", `stance: ${where} — and no undated-stance caveat for a stance that does not exist`);
  // The disclosure travels on the pixels.
  eq(card.stampKicker, "RECORD DIRECTION",
    `stance: ${where} — the stamp says record direction, not VERDICT`);
  eq(card.recordLabel,
    card.recordDirection && card.recordDirection.split
      ? "WHAT THE RECORD DID — BOTH WAYS" : "WHAT THE RECORD DID",
    `stance: ${where} — the record half is labelled as the record`);
  eq(card.recordNote, RC.guards.rdNote,
    `stance: ${where} — the disclosure is the fixed one, verbatim`);
  has(card.recordNote, "No stated position on file",
    `stance: ${where} — the card says on its face that nothing was said`);
  has(card.recordNote, "not a stated stance and not a score",
    `stance: ${where} — and that it is neither a stance nor a score`);

  const text = RC.guards.rdComposed(card);
  // ── Hard wall: no percentage, no share, no proportion ──────────────────────
  // Asked of the PRINTED card — quoted measure titles and curated rationale
  // included — because a share beside a count is a second score whichever hand
  // wrote it.
  const printed = RC.guards.rdPrinted(card);
  has(printed, card.headline, `no-%: ${where} — the printed text includes what the card composes`);
  if (card.facts) has(printed, card.facts, `no-%: ${where} — and the quoted material it carries`);
  ok(!RC.guards.rdProportionRe.test(printed), `no-%: ${where} — no proportion anywhere on the card`);
  lacks(printed, "%", `no-%: ${where} — no percent sign anywhere on the card`);
  ok(!/\bpercent\b/i.test(printed), `no-%: ${where} — no spelled-out percent`);
  ok(!/\d+\s*out\s+of\s+\d/i.test(printed), `no-%: ${where} — no "N out of M" share`);
  // ── Hard wall: record vocabulary only ──────────────────────────────────────
  ok(!RC.guards.rdStanceWordRe.test(text), `copy: ${where} — no stance vocabulary`);
  ok(!RC.guards.rdSaydoTokenRe.test(text), `copy: ${where} — no said-vs-did verdict token`);
  for (const banned of ["supports", "opposes", "backed it up", "says one thing", "Backed up", "Contradicted"]) {
    ok(!new RegExp(banned.replace(/ /g, "\\s+"), "i").test(text),
      `copy: ${where} — "${banned}" never appears`);
  }
  // ── And the vocabulary it DOES use ────────────────────────────────────────
  ok(/advanced it/i.test(text), `copy: ${where} — the record vocabulary is "advanced it"`);
  ok(/recorded votes?|formal actions?/i.test(text),
    `copy: ${where} — the countable is recorded votes / formal actions`);
  // ── Hard wall: no party framing, no public-lane item ───────────────────────
  ok(!/\b(?:party\s+lines?|caucus|crossed\s+the\s+aisle|bipartisan|broke\s+with\s+(?:their|his|her|the)\s+party)\b/i.test(text),
    `copy: ${where} — no party framing`);
  eq(card.impact, "record", `lane: ${where} — the card is on the formal-record lane`);
  ok(card.instrument && (card.instrument.key === "vote" || card.instrument.key === "record"),
    `lane: ${where} — the card counts formal instruments only`);
  // Public: it actually clears the same public gate every other card clears.
  eq(RC.guards.rdPublicBlock(card), "", `public: ${where} — the record-direction gate passes`);
}

// The counts on the card are the index's counts, never recounted off the one or
// two examples the card happens to be able to cite.
if (split) {
  eq(split.recordDirection.advances + split.recordDirection.opposes,
     split.recordDirection.judged, "counts: the two sides add up to the judged record");
  ok(split.recordDirection.judged > (split.measureNumbers || []).length,
    "counts: the card counts more records than it cites, and says so");
  has(split.countsNote, "Counts cover every judged recorded vote",
    "counts: the card states that the counts cover the whole judged record");
}

// The tripwires are real — fed a card that breaks each wall, the gate refuses.
{
  const bad = (mutate) => {
    const c = JSON.parse(JSON.stringify(uniform));
    mutate(c);
    return RC.guards.rdPublicBlock(c);
  };
  ok(!!bad((c) => { c.headline = "On 🎓 School Choice, 80% of the record advanced it."; }),
    "tripwire: a percentage in the headline stops the card");
  ok(!!bad((c) => { c.didLine = "4 out of 5 advanced it"; }),
    "tripwire: an N-out-of-M share stops the card");
  ok(!!bad((c) => { c.headline = "Rep. Record Member supports school choice."; }),
    "tripwire: stance vocabulary stops the card");
  ok(!!bad((c) => { c.verdict = { label: "Backed up", key: "consistent" }; }),
    "tripwire: a said-vs-did verdict token stops the card");
  // Every LIVE say-vs-do verdict label, read off the table the app renders from,
  // so a renamed verdict cannot become sayable here without this failing.
  {
    const V = A.window.PDXConsistency.VERDICTS;
    for (const k of ["consistent", "contradicts", "mixed", "flag"]) {
      const label = V[k] && V[k].label;
      ok(!!label, `tripwire: the ${k} verdict label was found`);
      if (!label) continue;
      ok(!!bad((c) => { c.didLine = label; }),
        `tripwire: printing the live "${label}" verdict stops the card`);
      ok(!!RC.guards.rdBorrowedVerdict("… " + label + " …"),
        `tripwire: the borrowed-verdict check names "${label}"`);
    }
    // And it does not refuse the card for the condition it is built under.
    eq(RC.guards.rdBorrowedVerdict("No stated stance"), "",
      "tripwire: the honest no-stated-stance wording is not treated as a borrowed verdict");
  }
  ok(!!bad((c) => { c.countsNote = "They broke with their party on this."; }),
    "tripwire: party framing stops the card");
  ok(!!bad((c) => { c.said = { text: "I have always backed school choice.", word: "supports" }; }),
    "tripwire: a stated position appearing on the card stops it");
  ok(!!bad((c) => { c.recordDirection.opposes = 3; }),
    "tripwire: counts that do not add up to the judged record stop the card");
  ok(!!bad((c) => { c.recordDirection.characterised = false; }),
    "tripwire: a card not backed by a characterised row stops");
  ok(!!bad((c) => { c.recordNote = "This is what the record did."; }),
    "tripwire: a softened no-stated-position disclosure stops the card");
  ok(!!bad((c) => { c.recordNote = ""; }),
    "tripwire: a missing disclosure stops the card");
  ok(!!bad((c) => { c.recordDirection.acts = true; c.headline = "Voted Yea on passage."; }),
    "tripwire: vote wording over a record that is not all votes stops the card");

  // ── The two surfaces ──────────────────────────────────────────────────────
  // The vocabulary walls are asked of the sentences this file WRITES. The
  // measure title and the curated rationale are quoted, cleared at the item
  // level by the citation, identity and source guards, and printed under
  // exactly that clearance on every say-vs-do card — so a bill named the
  // Taxpayer Support Act is not this card claiming anybody supports anything.
  ok(!bad((c) => {
    c.facts = "Support for the measure was the question; the ranking member " +
      "called the vote a contradiction of the committee's own report.";
  }), "surfaces: quoted material carrying stance and verdict words does not block the card");
  // The issue's own curated NAME is the heading the reader is already under.
  ok(!bad((c) => {
    c.issue = { key: "israel_support", label: "Support for Israel" };
    c.headline = "On Support for Israel, Rep. Record Member’s recorded votes all advanced it (5).";
  }), "surfaces: the curated issue name in the headline does not block the card");
  // But the same words in copy this file composed still stop it — neutralising
  // the label must not neutralise the sentence around it.
  ok(!!bad((c) => {
    c.issue = { key: "israel_support", label: "Support for Israel" };
    c.headline = "On Support for Israel, Rep. Record Member supports Support for Israel.";
  }), "surfaces: stance vocabulary beside the issue name still stops the card");
  // The percentage wall is the one asked of everything a reader can SEE.
  ok(!!bad((c) => { c.facts = "The measure passed with 63 percent of the chamber."; }),
    "tripwire: a percentage in quoted material stops the card");
  ok(!!bad((c) => { c.factParts = ["", "A 75% cut to the program."]; }),
    "tripwire: a percent sign in a quoted fact part stops the card");
  if (split) {
    const badSplit = (mutate) => {
      const c = JSON.parse(JSON.stringify(split));
      mutate(c);
      return RC.guards.rdPublicBlock(c);
    };
    ok(!!badSplit((c) => { c.sides.with.title = "Cutting 40% of the program"; }),
      "tripwire: a percentage in a cited example's title stops the split card");
    ok(!badSplit((c) => { c.sides.with.title = "The Taxpayer Support Act of 2025"; }),
      "surfaces: a cited example's quoted title may carry a stance word");
  }
  // ── The both-ways card's own walls ─────────────────────────────────────────
  // A split card states two counts and nothing else. The three ways it could
  // quietly become a direction card are all refusals, not warnings.
  if (bothWays) {
    const badBoth = (mutate) => {
      const c = JSON.parse(JSON.stringify(bothWays));
      mutate(c);
      return RC.guards.rdPublicBlock(c);
    };
    eq(badBoth(() => {}), "",
      "tripwire: the untouched both-ways card clears the gate");
    ok(!!badBoth((c) => { c.recordDirection.characterised = true; }),
      "tripwire: a split card claiming its row characterised a direction stops");
    ok(!!badBoth((c) => { c.recordDirection.lead = "advances"; }),
      "tripwire: a split card naming a leading side stops");
    ok(!!badBoth((c) => { c.recordDirection.opposes = 0; c.recordDirection.judged = 3; }),
      "tripwire: a split card with only one side on it stops");
    ok(!!badBoth((c) => { c.recordDirection.counted = false; }),
      "tripwire: a card not backed by a counted row stops");
    ok(!!badBoth((c) => {
      c.headline = "On Government Regulation, Rep. Record Member’s record advanced it 50% of the time.";
    }), "tripwire: a percentage on the both-ways card stops it");
    ok(!!badBoth((c) => {
      c.headline = "On Government Regulation, Rep. Record Member supports government regulation.";
    }), "tripwire: an inferred stance on the both-ways card stops it");
    ok(!!badBoth((c) => { c.didLine = "Mixed record"; }),
      "tripwire: a borrowed say-vs-do verdict on the both-ways card stops it");
  }
}

// ══ 3. ELIGIBILITY IS THE ROW'S ELIGIBILITY ══════════════════════════════════
// Each case below is refused by the SAME rule that stops the profile row from
// characterising it. Nothing here re-states a threshold; the assertion is that
// the card feed's answer and _recordDirectionIndex's answer are the same answer.
const idx = (pid, issueKey) => A.window._pdxRecordDirection(pid, issueKey, { label: LABELS[issueKey] });

for (const key of Object.keys(LABELS)) {
  const i = idx("recrep", key);
  const row = rdRow(key);
  ok(!!row, `eligibility: ${key} appears in the record-direction audit`);
  if (!row) continue;
  eq(row.token, i.token, `eligibility: ${key} — the card feed reads the row's own token`);
  eq(row.characterised, !!i.characterised,
    `eligibility: ${key} — and the row's own characterised flag`);
  eq(row.counted, !!i.counted,
    `eligibility: ${key} — and the row's own counted flag`);
  eq(row.judged, i.judged, `eligibility: ${key} — and the row's own judged count`);
  eq(row.advances, i.advances, `eligibility: ${key} — and the row's own advanced-it count`);
  eq(row.opposes, i.opposes, `eligibility: ${key} — and the row's own cut-against-it count`);
  // The whole rule, in one line: a card exists exactly where the row may state
  // its counts AND no stated position owns the row. `counted`, not
  // `characterised` — a deep split has no direction to characterise and two
  // real numbers to state, and the card reports the second.
  const wantCard = !!i.counted && key !== SPOKEN_KEY;
  eq(!!RC.recordDirection("recrep", key), wantCard,
    `eligibility: ${key} — a card exists iff the row may state its counts and nothing was said`);
  // And the weaker flag never smuggles in the stronger claim.
  if (i.counted && !i.characterised) {
    eq(i.lead, null, `eligibility: ${key} — a counted split names no leading side`);
  }
}

eq(idx("recrep", MIXED3).token, "record_thin", "eligibility: a 3-vote 2-1 record is thin");
ok(!rdEligible(MIXED3), "eligibility: …so it gets no card");
has(rdReason(MIXED3), "too thin to characterise", "eligibility: and the audit says why");

eq(idx("recrep", SOLO).token, "record_thin", "eligibility: a single vote is thin");
ok(!rdEligible(SOLO), "eligibility: …so it gets no card");

// ── The split publish bar ────────────────────────────────────────────────────
// Deep enough, both sides material: the counts ship. One tier short on either
// axis: they do not, and the row keeps the sentence it always had.
eq(idx("recrep", EVEN_SPLIT).token, "record_split_deep",
  "eligibility: an even six-item record is a split deep enough to state its counts");
eq(idx("recrep", EVEN_SPLIT).characterised, false,
  "eligibility: …and still characterises no direction");
ok(rdEligible(EVEN_SPLIT), "eligibility: a deep split gets a card — the counts are the finding");

eq(idx("recrep", SHORT_SPLIT).token, "record_split",
  "eligibility: a four-item split is under the counting depth");
ok(!rdEligible(SHORT_SPLIT), "eligibility: …so it gets no card");
has(rdReason(SHORT_SPLIT), "ran both ways", "eligibility: and the audit names the split");

eq(idx("recrep", LOPSIDED).judged, 6, "eligibility: the lopsided record is six deep");
eq(idx("recrep", LOPSIDED).opposes, 1, "eligibility: …with one item on the minority side");
eq(idx("recrep", LOPSIDED).token, "record_split",
  "eligibility: …which is an exception, not a side");
ok(!rdEligible(LOPSIDED), "eligibility: …so a one-item side ships no both-ways card");

eq(idx("recrep", BALANCE_KEY).suppressed, "balance_key",
  "eligibility: a *_balance key has no pole to advance");
ok(!rdEligible(BALANCE_KEY), "eligibility: …so it gets no card");
has(rdReason(BALANCE_KEY), "balance_key", "eligibility: and the audit names the suppression");

eq(idx("recrep", NO_POLE_KEY).suppressed, "no_pole",
  "eligibility: a contested-authority key has no pole to advance");
ok(!rdEligible(NO_POLE_KEY), "eligibility: …so it gets no card");
has(rdReason(NO_POLE_KEY), "no_pole", "eligibility: and the audit names the suppression");

// The coverage floor is the wall against OUR sampling being read as THEIR
// conduct — five one-sided votes is not a direction if five is all we hold.
{
  const i = idx("thinrec", UNIFORM_KEY);
  eq(i.judged, 5, "coverage: the thin member's five votes are all judged");
  eq(i.suppressed, "coverage_floor", "coverage: and the row refuses them on the coverage floor");
  eq(RC.recordDirectionCardsFor("thinrec").length, 0,
    "coverage: a member below the record floor gets no record-direction card");
  const rows = RC.recordDirectionAudit("thinrec");
  ok(rows.length > 0 && rows.every((r) => !r.eligible),
    "coverage: every candidate on that member is refused");
  has(rows[0].reason, "coverage_floor", "coverage: and the audit names the floor");
}

// A stated position is the say-vs-do lane's row. This feed does not go near it,
// however deep and however one-sided the record on it happens to be.
{
  const i = idx("recrep", SPOKEN_KEY);
  eq(i.characterised, true, "lane: the spoken issue's record WOULD characterise");
  ok(!rdEligible(SPOKEN_KEY), "lane: …and still gets no record-direction card");
  has(rdReason(SPOKEN_KEY), "a stated position exists",
    "lane: because the row belongs to the say-vs-do cards");
  eq(RC.recordDirection("recrep", SPOKEN_KEY), null,
    "lane: the public read refuses it too");
}

// ══ 4. NO STANCE IS CREATED ══════════════════════════════════════════════════
// Building every card on the member may not add, edit or imply a position — not
// in the stance store, not in the row model, not on the card.
{
  const before = JSON.stringify(A.window.ISSUE_STANCE_DATA);
  const cards = RC.recordDirectionCardsFor("recrep");
  ok(cards.length >= 3, "stance: the feed builds cards to check against");
  eq(JSON.stringify(A.window.ISSUE_STANCE_DATA), before,
    "stance: building record-direction cards mutates no stance data");
  const keys = (A.window.ISSUE_STANCE_DATA.recrep || []).map((s) => s.issueKey);
  eq(keys.join(","), SPOKEN_KEY,
    "stance: the member still holds exactly the one position they actually stated");
  for (const c of cards) {
    ok(c.issueKey !== SPOKEN_KEY, "stance: no card is built on the issue that has a position");
    eq(c.said, null, `stance: ${c.issueKey} card asserts no position`);
  }
  // And the row model still reports no stated position on those issues.
  const C = A.window.PDXConsistency;
  for (const c of cards) {
    const v = C.sayVsDo("recrep", c.issueKey);
    ok(!v || !v.said || !String(v.said.text || "").trim(),
      `stance: ${c.issueKey} still has no stated position in the say-vs-do lane`);
  }
}

// ══ 5. THE SAY-VS-DO CARDS AND DIRECTION MATCH ARE UNTOUCHED ═════════════════
// Sandbox B is the same four files with the record-direction index removed, so
// no record-direction card can exist there. Everything else must be identical
// byte for byte — that is the whole claim of "no effect".
const RCB = B.window.PDXReceiptCards;
eq(RCB.recordDirectionCardsFor("recrep").length, 0,
  "control: with the index dark, no record-direction card is built");

for (const pid of ["recrep", "thinrec", "saydorep"]) {
  eq(JSON.stringify(RC.audit(pid)), JSON.stringify(RCB.audit(pid)),
    `unchanged: ${pid} — the say-vs-do audit is identical with the feed live`);
  eq(JSON.stringify(RC.cardsFor(pid)), JSON.stringify(RCB.cardsFor(pid)),
    `unchanged: ${pid} — the say-vs-do cards are identical`);
  eq(JSON.stringify(RC.publicCardsFor(pid)), JSON.stringify(RCB.publicCardsFor(pid)),
    `unchanged: ${pid} — the public say-vs-do cards are identical`);
  eq(JSON.stringify(RC.publicAudit(pid)), JSON.stringify(RCB.publicAudit(pid)),
    `unchanged: ${pid} — the public share audit is identical`);
}
// Non-vacuously: there ARE say-vs-do cards in the comparison.
{
  const saydo = RC.cardsFor("saydorep");
  ok(saydo.length > 0, "unchanged: the comparison includes real say-vs-do cards");
  for (const pid of ["recrep", "thinrec", "saydorep"]) {
    for (const c of RC.cardsFor(pid)) {
      ok(c.origin !== "record_direction",
        `wall: no record-direction card ever enters cardsFor(${pid})`);
    }
    for (const c of RC.publicCardsFor(pid)) {
      ok(c.origin !== "record_direction",
        `wall: no record-direction card ever enters publicCardsFor(${pid})`);
    }
    for (const r of RC.audit(pid)) {
      ok(r.want !== "record_direction",
        `wall: no record-direction candidate ever enters audit(${pid})`);
    }
  }
}

// ── Direction Match ──────────────────────────────────────────────────────────
// Read AFTER every record-direction card in sandbox A has been built, so a card
// that quietly wrote through to the score would show up here.
{
  const CA = A.window.PDXConsistency, CB = B.window.PDXConsistency;
  const snap = (C) => {
    const out = {};
    for (const pid of ["recrep", "thinrec", "saydorep"]) {
      out[pid + "|official"] = CA === C || true ? C.officialRecord(pid) : null;
      out[pid + "|saydo"] = C.sayVsDo(pid);
      out[pid + "|overall"] = C.overallVerdict(pid);
      for (const key of Object.keys(LABELS)) {
        out[pid + "|official|" + key] = C.officialRecord(pid, key);
        out[pid + "|saydo|" + key] = C.sayVsDo(pid, key);
      }
    }
    return JSON.stringify(out);
  };
  const a = snap(CA), b = snap(CB);
  ok(a.length > 100, "score: the Direction Match snapshot is non-empty");
  eq(a, b, "score: Direction Match does not move when the record-direction feed is live");

  // And the score is the same before and after the cards are built, in the same
  // sandbox — the feed is a pure read.
  const again = snap(CA);
  eq(again, a, "score: reading the feed twice leaves the score where it was");
}

// ══ 6. ARRIVAL ═══════════════════════════════════════════════════════════════
// The shared link opens the same politician × issue Official Record the card is
// a picture of. Driven through the real router against a spied-on openGap, so
// this is behaviour rather than two files agreeing in prose.
{
  const C = A.window.PDXConsistency;
  eq(typeof RC.handleHash, "function", "arrival: the hash router is exposed");
  const realOpen = C.openGap;
  const realHash = A.location.hash;
  const calls = [];
  try {
    C.openGap = function (pid, issue, opts) { calls.push([pid, issue, opts]); };
    for (const card of built) {
      const m = String(card.hash || "").match(/^#record=([^~&]+)~([^&]+)$/);
      ok(!!m, `arrival: the ${card.issueKey} card carries a pid~issue record hash`);
      if (!m) continue;
      calls.length = 0;
      A.location.hash = card.hash;
      RC.handleHash();
      eq(calls.length, 1, `arrival: following ${card.hash} opens exactly one view`);
      eq((calls[0] || [])[0], m[1], "arrival: on the same member the card is about");
      eq((calls[0] || [])[1], m[2], "arrival: on the same issue the card is about");
      eq(decodeURIComponent(m[1]), card.pid, "arrival: and that member is the card's member");
      eq(decodeURIComponent(m[2]), card.issueKey, "arrival: and that issue is the card's issue");
    }
  } finally {
    C.openGap = realOpen;
    A.location.hash = realHash;
  }
  // The footer address a reader would type instead of tapping.
  if (split) {
    has(split.source.url, "record=recrep~climate_action",
      "arrival: the split card's footer address is the same issue record");
    has(split.source.label, "Official record",
      "arrival: and it says so in words");
  }
}

// ══ 7. THE RENDERER TREATS IT AS A RECORD CARD ═══════════════════════════════
// say-vs-do.js draws every card in this app. The record-direction card must
// arrive there labelled as the record, not as a say-vs-do verdict.
{
  const SV = A.window.PDXSayVsDo || A.window.PDXReceipts;
  ok(!!SV, "render: the share module is loaded");
  const css = readFileSync(join(ROOT, "say-vs-do.css"), "utf8");
  has(css, "pdxrc-v-record-direction",
    "render: the record-direction control has an accent of its own, not a verdict's");
  const js = readFileSync(join(ROOT, "say-vs-do.js"), "utf8");
  has(js, "record_direction", "render: the renderer knows the record-direction origin");
  has(js, "OFFICIAL RECORD", "render: and badges it as the Official Record, not SAY vs. DO");
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failed, ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error("  ✖ " + f);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`✔ record-direction share cards: ${passed} checks passed`);
