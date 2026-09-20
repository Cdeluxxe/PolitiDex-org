#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the WHOLE-PERSON WORDS-VS-FORMAL-RECORD SHARE CARD
// ─────────────────────────────────────────────────────────────────────────────
// Every other share card in this app is about ONE thing — one vote, one issue's
// record, one stated position against one formal action. This one is about a
// PERSON: how many of their stated positions their own formal record backed, how
// many it cut against, how many it split on. That makes its failure modes
// different from every harness beside it, because the card's claim is arithmetic
// over a population of issues rather than a judgement about a single row.
//
// A words-vs-record card is wrong if it:
//
//   1. COUNTS SOMETHING IT SHOULD NOT. A stated position with no pole ("mixed"),
//      an issue with no directional pole at all, a thin 1–3 vote lean, a record
//      with no readable pattern, or an issue where nothing was ever said. Each of
//      those is excluded for its own reason and the reasons are not
//      interchangeable — a card that counted any of them would be reporting our
//      coverage as their conduct.
//   2. INVENTS A SIDE. A directional tier whose tone is neither support nor
//      oppose has no side to compare, and guessing one is the whole thing this
//      card must not do.
//   3. SHIPS ON TOO FEW ISSUES. Under the floor there is no card — not a card
//      with a smaller number on it. Three comparable issues is three issues, not
//      a pattern in a person.
//   4. PRINTS A SECOND SCORE. A percentage, a proportion, an "agreement rate" —
//      anything that could sit beside ⚖️ Direction Match and be read as a rival
//      figure for the same person.
//   5. MOVES DIRECTION MATCH, or writes a pattern tier into a position map. The
//      lane is three reads and no writes; the proof is that every score, row and
//      tally is byte-identical with the lane dark.
//   6. FRAMES A RECORD AS PARTY BEHAVIOUR, anywhere on the card or in the text
//      that travels with it.
//   7. DISAGREES WITH THE FORMAL PATTERN INDEX. The card and that index read the
//      same two engine functions; if they can disagree about a member's pattern
//      on an issue, one of them is a second scoring engine.
//   8. LANDS THE READER ON THE WRONG SURFACE. `#wordrecord=<pid>` is a
//      whole-person address and must not resolve to a single-issue dossier.
//
//   node scripts/test-word-record-card.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["share-links.js", "stance-helpers.js", "consistency.js", "say-vs-do.js",
               "voting-record.js", "receipt-cards.js"];
const SRC_FILES = FILES.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]);

// ── Fixtures ─────────────────────────────────────────────────────────────────
// Three members, each built so that every branch of the comparable-issue rule is
// exercised by a real (position, record) pair rather than by a stub.
const LABELS = {
  climate_action:        "🌍 Climate Action",
  school_choice:         "🎓 School Choice",
  lower_taxes:           "🧾 Lower Taxes",
  national_debt:         "💰 National Debt",
  border_security:       "🛂 Border Security",
  gov_regulation:        "📋 Government Regulation",
  immigration:           "🛬 Immigration Levels",
  gun_rights:            "🔫 Gun Rights",
  rights_safety_balance: "⚖️ Rights + Common-Sense Safety",
  war_powers:            "⚔️ Congress and War Powers",
  healthcare:            "🏥 Health Care",
};

const BACKED_STRONG = "climate_action";        // says supports · 5 advance, 0 against
const AGAINST_STRONG = "school_choice";        // says supports · 0 advance, 5 against
const BACKED_OPPOSE  = "lower_taxes";          // says opposes  · 0 advance, 5 against
const BACKED_MOSTLY  = "national_debt";        // says supports · 4 advance, 1 against
const SPLIT_DEEP     = "border_security";      // says supports · 3 / 3, deep split
const THIN_LEAN      = "gov_regulation";       // says supports · 2 advance — thin
const MIXED_SAID     = "immigration";          // says "mixed" — no pole to compare
const NO_PATTERN     = "gun_rights";           // says supports · 3 judged, 2/1 — unread
const BALANCE_KEY    = "rights_safety_balance";// no pole on the ISSUE
const NO_POLE_KEY    = "war_powers";           // no pole on the ISSUE
const UNSPOKEN       = "healthcare";           // a record, nothing ever said

let seq = 0;
const pad = (n) => String(n).padStart(2, "0");
const mkVote = (issueKey, position, opts) => {
  opts = opts || {};
  seq++;
  const id = 2000 + seq;
  return {
    kind: "vote", measureId: id, congress: 119, session: 1, rollNumber: 200 + seq,
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

// THE WORKED EXAMPLE. 5 comparable issues (3 backed, 1 against, 1 split), plus
// one thin lean, one unreadable record, one "mixed" position, two no-pole issues
// and one issue with a record and nothing said — every exclusion route, once.
const WR_RECORDS = [
  ...many(5, BACKED_STRONG, "yea"),
  ...many(5, AGAINST_STRONG, "nay"),
  ...many(5, BACKED_OPPOSE, "nay"),
  ...many(4, BACKED_MOSTLY, "yea"),
  ...many(1, BACKED_MOSTLY, "nay"),
  ...many(3, SPLIT_DEEP, "yea"),
  ...many(3, SPLIT_DEEP, "nay"),
  ...many(2, THIN_LEAN, "yea"),
  ...many(5, MIXED_SAID, "yea"),
  ...many(2, NO_PATTERN, "yea"),
  ...many(1, NO_PATTERN, "nay"),
  ...many(4, BALANCE_KEY, "yea"),
  ...many(5, NO_POLE_KEY, "yea"),
  ...many(5, UNSPOKEN, "yea"),
];

// THE FAIL-CLOSED CONTROL. Two comparable issues and a deep record on a third
// nobody has stated a position on — over the member coverage floor, under the
// comparable-issue floor. There is no card at all here.
const FEW_RECORDS = [
  ...many(5, BACKED_STRONG, "yea"),
  ...many(5, AGAINST_STRONG, "nay"),
  ...many(5, UNSPOKEN, "yea"),
];

// THE THIN CONTROL. Three real comparable issues and three thin leans. If a thin
// lean could enter the headline totals this member would have six and would ship
// a card; the floor is four, so the card's existence is the assertion.
const LEAN_RECORDS = [
  ...many(5, BACKED_STRONG, "yea"),
  ...many(5, AGAINST_STRONG, "nay"),
  ...many(3, SPLIT_DEEP, "yea"),
  ...many(3, SPLIT_DEEP, "nay"),
  ...many(2, BACKED_OPPOSE, "nay"),
  ...many(2, BACKED_MOSTLY, "yea"),
  ...many(2, THIN_LEAN, "yea"),
];

// A stated position sourced to the very roll call it would be compared against.
// It stays in the counts and may never be the example line.
const CIRCULAR_URL = "https://clerk.house.gov/Votes/2025999";

const STANCES = {
  wrrep: [
    { issueKey: BACKED_STRONG, issueStance: "support", topic: "Climate",
      text: "Federal clean-energy investment has to keep going." },
    { issueKey: AGAINST_STRONG, issueStance: "support", topic: "Schools",
      text: "Parents should be able to choose the school that fits their child." },
    { issueKey: BACKED_OPPOSE, issueStance: "oppose", topic: "Taxes",
      text: "Another round of top-bracket tax cuts is the wrong priority." },
    { issueKey: BACKED_MOSTLY, issueStance: "support", topic: "Debt",
      text: "Bringing the deficit down has to be part of every budget." },
    { issueKey: SPLIT_DEEP, issueStance: "support", topic: "Border",
      text: "The border needs more agents and better technology." },
    { issueKey: THIN_LEAN, issueStance: "support", topic: "Regulation",
      text: "Small businesses need relief from federal paperwork." },
    { issueKey: MIXED_SAID, issueStance: "mixed", topic: "Immigration",
      text: "There are good arguments on both sides of the levels question." },
    { issueKey: NO_PATTERN, issueStance: "support", topic: "Guns",
      text: "Lawful ownership is a constitutional right." },
    { issueKey: BALANCE_KEY, issueStance: "support", topic: "Rights",
      text: "Rights and safety are not in conflict." },
    { issueKey: NO_POLE_KEY, issueStance: "support", topic: "War powers",
      text: "Congress should vote before troops are committed." },
  ],
  fewrep: [
    { issueKey: BACKED_STRONG, issueStance: "support", topic: "Climate",
      text: "Clean-energy investment has to keep going." },
    { issueKey: AGAINST_STRONG, issueStance: "support", topic: "Schools",
      text: "Parents should be able to choose their child's school." },
  ],
  leanrep: [
    { issueKey: BACKED_STRONG, issueStance: "support", topic: "Climate",
      text: "Clean-energy investment has to keep going." },
    { issueKey: AGAINST_STRONG, issueStance: "support", topic: "Schools",
      text: "Parents should be able to choose their child's school." },
    { issueKey: SPLIT_DEEP, issueStance: "support", topic: "Border",
      text: "The border needs more agents and better technology." },
    { issueKey: BACKED_OPPOSE, issueStance: "oppose", topic: "Taxes",
      text: "Another round of top-bracket tax cuts is the wrong priority." },
    { issueKey: BACKED_MOSTLY, issueStance: "support", topic: "Debt",
      text: "Bringing the deficit down has to be part of every budget." },
    { issueKey: THIN_LEAN, issueStance: "support", topic: "Regulation",
      text: "Small businesses need relief from federal paperwork." },
  ],
  circrep: [
    // The gap row's position is sourced to a roll-call page: comparing it to the
    // record is comparing the record to itself.
    { issueKey: AGAINST_STRONG, issueStance: "support", topic: "Schools",
      text: "Parents should be able to choose their child's school.",
      source: { url: CIRCULAR_URL, label: "U.S. House Clerk" } },
    { issueKey: BACKED_STRONG, issueStance: "support", topic: "Climate",
      text: "Clean-energy investment has to keep going." },
    { issueKey: BACKED_OPPOSE, issueStance: "oppose", topic: "Taxes",
      text: "Another round of top-bracket tax cuts is the wrong priority." },
    { issueKey: BACKED_MOSTLY, issueStance: "support", topic: "Debt",
      text: "Bringing the deficit down has to be part of every budget." },
    { issueKey: SPLIT_DEEP, issueStance: "support", topic: "Border",
      text: "The border needs more agents and better technology." },
  ],
};

const PROFILES = {
  wrrep:   { name: "Rep. Word Member",     office: "U.S. House", district: "TX-11", state: "TX", party: "R" },
  fewrep:  { name: "Rep. Few Member",      office: "U.S. House", district: "TX-12", state: "TX", party: "D" },
  leanrep: { name: "Rep. Lean Member",     office: "U.S. House", district: "TX-13", state: "TX", party: "R" },
  circrep: { name: "Rep. Circular Member", office: "U.S. House", district: "TX-14", state: "TX", party: "D" },
};
const RECORD_STORE = {
  wrrep: WR_RECORDS, fewrep: FEW_RECORDS, leanrep: LEAN_RECORDS, circrep: WR_RECORDS,
};

// ── Sandbox ──────────────────────────────────────────────────────────────────
const noopEl = () => ({
  style: {}, textContent: "", hidden: false, className: "", innerHTML: "",
  classList: { add() {}, remove() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, appendChild() {}, removeChild() {},
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, focus() {}, scrollIntoView() {},
  closest: () => null, insertAdjacentHTML() {}, remove() {},
});

// `withLane: false` removes the pattern engine the whole lane hangs off, which is
// the cleanest available "this slice was never shipped" control: no words-vs-record
// card can be built, and every other read in the six files runs exactly as before.
function boot(withLane) {
  const timers = [];
  const ctx = {
    console,
    document: {
      readyState: "complete",
      head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
    },
    location: { hash: "", search: "", origin: "https://politidex.fyi", pathname: "/",
                href: "https://politidex.fyi/" },
    history: { replaceState() {}, state: null },
    navigator: {},
    URLSearchParams,
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent, URL,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  ctx._timers = timers;
  ctx.ISSUE_MAP = ctx.window.ISSUE_MAP = Object.fromEntries(
    Object.entries(LABELS).map(([k, label]) => [k, { label }]));
  ctx.ISSUE_STANCE_DATA = ctx.window.ISSUE_STANCE_DATA = JSON.parse(JSON.stringify(STANCES));
  ctx.PROFILES = ctx.window.PROFILES = JSON.parse(JSON.stringify(PROFILES));

  const sandbox = vm.createContext(ctx);
  for (const [f, src] of SRC_FILES) vm.runInContext(src, sandbox, { filename: f });

  ctx.window.PDXVotingRecord.memberRecords = (pid) => RECORD_STORE[pid] || null;
  ctx.window.PDXVotingRecord.fetchMember = (pid) =>
    Promise.resolve({ items: RECORD_STORE[pid] || [] });
  ctx.window.PDXVotingRecord.noteMember = () => {};

  if (!withLane) ctx.window._recordPatternTier = undefined;
  return ctx;
}

const A = boot(true);    // the lane as shipped
const B = boot(false);   // the same six files with the lane dark

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} missing from ${JSON.stringify(String(hay))})`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} unexpectedly present)`);
const section = (t) => { if (process.env.VERBOSE) console.log("\n" + t); };

const RC = A.window.PDXReceiptCards;
ok(!!RC, "export: window.PDXReceiptCards exists");
if (!RC) { console.error("✖ PDXReceiptCards not exported — cannot continue"); process.exit(1); }

// ══ 0. THE LANE IS REACHABLE AND NAMED ═══════════════════════════════════════
section("0. the lane is named");
for (const fn of ["wordRecord", "wordRecordCard", "wordRecordRows", "wordRecordTally",
                  "wordRecordAudit", "handleWordRecordHash"]) {
  ok(typeof RC[fn] === "function", `export: PDXReceiptCards.${fn} is present`);
}
eq(RC.WORD_RECORD_ORIGIN, "word_record_pattern", "export: the origin token is exposed");
eq(RC.WORD_RECORD_MIN_COMPARABLE, 4, "export: the comparable-issue floor is 4");

// The stamp is not a say-vs-do verdict, so its key and label may not collide with
// one — a collision would let a whole-person tally inherit single-vote styling
// and single-vote vocabulary.
{
  const C = A.window.PDXConsistency;
  const key = RC.WORD_RECORD_VERDICT.key;
  ok(!(C.VERDICTS && C.VERDICTS[key]), "wall: the words-vs-record key is not a say-vs-do verdict key");
  eq(key === RC.RECORD_DIRECTION_VERDICT.key, false,
    "wall: the words-vs-record key is not the record-direction key either");
  for (const k of Object.keys(C.VERDICTS || {})) {
    ok(String((C.VERDICTS[k] || {}).label || "").toLowerCase() !==
       String(RC.WORD_RECORD_VERDICT.label || "").toLowerCase(),
      `wall: the words-vs-record label is not the ${k} verdict's label`);
  }
}

// ══ 1. THE COMPARABLE-ISSUE RULE, ROW BY ROW ═════════════════════════════════
section("1. the comparable-issue rule");
const rows = RC.wordRecordRows("wrrep");
const row = (k) => rows.find((r) => r.key === k) || null;
const shapeOf = (k) => { const r = row(k); return r ? r.shape : "(no row)"; };

eq(shapeOf(BACKED_STRONG), "backed",
  "backed: says supports, record strongly advances → backed by the record");
eq(shapeOf(BACKED_OPPOSE), "backed",
  "backed: says opposes, record strongly cuts against → backed by the record");
eq(shapeOf(BACKED_MOSTLY), "backed",
  "backed: says supports, record mostly advances → backed by the record");
eq(shapeOf(AGAINST_STRONG), "against",
  "against: says supports, record strongly cuts against → cut the other way");
eq(shapeOf(SPLIT_DEEP), "split",
  "split: says supports, record ran both ways → split");
eq(shapeOf(THIN_LEAN), "thin",
  "thin: a 2-vote lean is a row, but its own shape — never backed/against/split");
eq(shapeOf(NO_PATTERN), "unread",
  "unread: 3 judged with no readable pattern is neither a match nor a mismatch");
eq(row(MIXED_SAID), null,
  "excluded: a stated position of “mixed” names no side, so there is nothing to compare");
eq(row(BALANCE_KEY), null,
  "excluded: an issue with no directional pole gets no row at all");
eq(row(NO_POLE_KEY), null,
  "excluded: a contested-authority key gets no row at all");
eq(row(UNSPOKEN), null,
  "excluded: a record with nothing ever said is not a comparison");

// The tiers behind the shapes are the pattern engine's own words, not this lane's.
eq(row(BACKED_STRONG).tier, "strong", "tier: a uniform run reads Strongly");
eq(row(BACKED_MOSTLY).tier, "mostly", "tier: a dominant-but-two-sided run reads Mostly");
eq(row(SPLIT_DEEP).tier, "split", "tier: a non-dominant deep run reads Split");
eq(row(AGAINST_STRONG).patLabel, "Strongly opposes",
  "tier: the label is the engine's, verbatim");

// ══ 2. THE TALLY, AND WHAT IT LEAVES OUT ═════════════════════════════════════
section("2. the tally");
const tally = RC.wordRecordTally("wrrep");
eq(tally.backed, 3, "tally: three positions backed by the record");
eq(tally.against, 1, "tally: one position the record cut against");
eq(tally.split, 1, "tally: one position the record split on");
eq(tally.compared, 5, "tally: five comparable issues — the three counts and nothing else");
eq(tally.backed + tally.against + tally.split, tally.compared,
  "tally: the three counts add up to the issues compared");
eq(tally.thin, 1, "tally: the thin lean is counted separately, for the disclosure");
eq(tally.unread, 1, "tally: the unreadable record is counted separately too");

// ══ 3. THE CARD ══════════════════════════════════════════════════════════════
section("3. the card");
const card = RC.wordRecord("wrrep");
ok(!!card, "card: a member with five comparable issues gets a card");
if (card) {
  eq(card.origin, "word_record_pattern", "card: it is on the words-vs-record lane");
  eq(card.verdict.key, "word_record", "card: it carries its own stamp key");
  eq(card.stampKicker, "RECORD CHECK", "card: “VERDICT” is the wrong kicker over a tally");
  eq(card.name, "Rep. Word Member", "card: the headline identity is the member");
  has(card.sub, "U.S. House", "card: the office is named under the name");
  eq(card.headline, "Compared 5 stated positions to the voting pattern",
    "card: the headline states what was compared and how many");
  eq(card.tally.backed, 3, "card: ✓ 3 backed by the record");
  eq(card.tally.against, 1, "card: ✕ 1 cut the other way");
  eq(card.tally.split, 1, "card: ◑ 1 split");
  eq(card.tally.backedLabel, "backed by the record", "card: the ✓ row says what it counts");
  eq(card.tally.againstLabel, "cut the other way", "card: the ✕ row says what it counts");
  eq(card.tally.splitLabel, "split", "card: the ◑ row says what it counts");

  // NO SINGLE-ISSUE FURNITURE. A measure block, an issue chip or a stated
  // position on a card whose finding covers five issues would narrow its own
  // claim to whichever row happened to be picked.
  eq(card.said, null, "card: no single stated position — there are five");
  eq(card.issue, null, "card: no issue chip — the card covers every comparable issue");
  eq(card.facts, "", "card: no measure block — the card cites no single measure");
  eq(card.measureNumber, undefined, "card: no measure number is carried");
  eq(card.date, "", "card: no single date — the finding is not one act");

  // NO PARTY FRAMING, anywhere, including the monogram ring.
  eq(card.party, null, "card: no party chip — this is a fact about a person, not a party");

  // THE DISCLOSURE, VERBATIM.
  eq(card.footNote,
    "Formal record only. Not Direction Match. Pattern is what the votes did, " +
    "not a quoted speech.",
    "card: the footer disclosure is the required sentence, exactly");
  eq(card.footNote, RC.WORD_RECORD_NOTE, "card: and it is the exported constant");

  // THE EXCLUSION NOTE. A sentence, never a fourth tally row.
  has(card.tally.note, "too little record to read",
    "card: the thin issues are disclosed in words");
  has(card.tally.note, "no clear pattern yet",
    "card: the unreadable issues are disclosed too");
  lacks(card.tally.note, "%", "card: the exclusion note is not a rate");

  // THE ONE EXAMPLE. A gap exists, so the gap leads.
  ok(!!card.tally.example, "example: an honest discrepancy exists, so one is shown");
  eq(card.tally.example.lead, "Biggest gap", "example: the discrepancy is named as one");
  eq(card.tally.example.text,
    "School Choice — says supports, record strongly opposes",
    "example: the two halves, each in its own vocabulary");
  eq(card.tally.example.key, AGAINST_STRONG, "example: it is the row the counts came from");

  // THE ADDRESSES.
  eq(card.hash, "#wordrecord=wrrep",
    "card: it links back to this member's whole-person record, not to one issue");
  eq(card.source.url, "https://politidex.fyi/?wordrecord=wrrep",
    "card: the source is the member's record page in server-visible form");
  ok(!!card.verifyUrl && card.verifyUrl.length <= 96,
    "card: the footer address is printable at the card's width");
  has(card.method, "politidex.fyi/#methodology", "card: how it was judged is on the card");
}

// ══ 4. NO SECOND SCORE, ANYWHERE A READER CAN SEE ════════════════════════════
section("4. no second score");
if (card) {
  const printed = RC.guards.wrComposed(card);
  const PROP = RC.guards.rdProportionRe;
  eq(PROP.test(printed), false, "wall: nothing on the card reads as a proportion");
  eq(RC.guards.partyFrameRe.test(printed), false, "wall: nothing on the card frames a party");
  lacks(printed, "%", "wall: no percentage on the card");
  for (const word of ["agreement rate", "consistency score", "out of"]) {
    lacks(String(printed).toLowerCase(), word, `wall: the card does not print “${word}”`);
  }
  // The renderer takes three tally rows and no fourth: the excluded issues are a
  // sentence, and a fourth counted row would file our coverage gap as one of
  // their positions.
  eq(typeof card.tally.thinLabel, "undefined",
    "wall: the excluded issues have no tally row of their own");
}

// ══ 5. THE TEXT HALF OF THE SHARE ════════════════════════════════════════════
// The caption and the short post are what arrives when the image is collapsed —
// a paste, a quote-post, a group chat. They carry the same claim or they are not
// the same share.
section("5. the caption and the post");
if (card) {
  const R = A.window.PDXReceipts;
  const cap = R._caption(card);
  has(cap, "OFFICIAL RECORD", "caption: it is marked as a formal-record artefact");
  has(cap, "Rep. Word Member", "caption: the member is named");
  has(cap, "Words vs formal record", "caption: the card's own title leads");
  has(cap, "Compared 5 stated positions", "caption: the denominator travels");
  has(cap, "3 backed by the record", "caption: the ✓ count travels");
  has(cap, "1 cut the other way", "caption: the ✕ count travels");
  has(cap, "1 split", "caption: the ◑ count travels");
  has(cap, "Not Direction Match", "caption: the disclosure travels with the counts");
  has(cap, "Biggest gap: School Choice", "caption: the one example travels");
  has(cap, "wordrecord=wrrep", "caption: the deep link reopens this member's record");
  lacks(cap, "Said: ", "caption: no single stated position is quoted");
  lacks(cap, "Verdict:", "caption: “verdict” is the wrong noun over a tally");
  eq(RC.guards.rdProportionRe.test(cap), false, "caption: no proportion in the pasted text");
  eq(RC.guards.partyFrameRe.test(cap), false, "caption: no party framing in the pasted text");

  const post = R._tweetText(card);
  ok(post.length <= 280, `post: it fits the short-post limit (was ${post.length})`);
  has(post, "Words vs formal record", "post: the card's own title leads");
  has(post, "3 backed", "post: the ✓ count survives the limit");
  has(post, "1 cut against", "post: the ✕ count survives the limit");
  has(post, "1 split", "post: the ◑ count survives the limit");
  has(post, "not Direction Match", "post: the disclosure survives the limit");
  has(post, "wordrecord=wrrep", "post: the deep link survives the limit");
  lacks(post, "Said:", "post: there is no single quote to pair a record against");
  lacks(post, "Did:", "post: and no single act to pair a quote against");
  eq(RC.guards.rdProportionRe.test(post), false, "post: no proportion in the short post");
}

// ══ 6. FAIL CLOSED ═══════════════════════════════════════════════════════════
section("6. fail closed");
{
  const t = RC.wordRecordTally("fewrep");
  eq(t.compared, 2, "floor: the control member has two comparable issues");
  eq(RC.wordRecordCard("fewrep"), null,
    "floor: under four comparable issues there is no card — not a smaller card");
  eq(RC.wordRecord("fewrep"), null, "floor: and nothing for the public read to offer");
  const audit = RC.wordRecordAudit("fewrep");
  eq(audit.built, false, "floor: the audit reports no card was built");
  has(audit.reason, "the floor is 4", "floor: and says which floor refused it");
}

// ══ 7. NO THIN IN THE HEADLINE TOTALS ════════════════════════════════════════
// The strongest available form of this assertion: a member whose comparable count
// reaches the floor ONLY if thin leans are counted. The absence of a card is the
// proof, because nothing else about this member is different.
section("7. thin never enters the headline");
{
  const t = RC.wordRecordTally("leanrep");
  eq(t.compared, 3, "thin: three readable patterns behind stated positions");
  eq(t.thin, 3, "thin: three more issues are 2-vote leans");
  eq(t.compared + t.thin >= 4, true, "thin: counting them WOULD clear the floor");
  eq(RC.wordRecordCard("leanrep"), null,
    "thin: so the card does not exist — a thin lean cannot make a headline total");
  // And on the member who does ship a card, no counted row is a thin one.
  if (card) {
    const counted = (card.rows || []).filter((r) => r.shape !== "thin" && r.shape !== "unread");
    eq(counted.length, card.tally.compared, "thin: every counted row is a readable pattern");
    for (const r of counted) {
      ok(["strong", "mostly", "split"].includes(r.tier),
        `thin: the ${r.key} row is Strongly / Mostly / Split, not thin (${r.tier})`);
    }
  }
}

// ══ 8. THE GATE CATCHES WHAT IT CLAIMS TO ════════════════════════════════════
// Asked of hand-damaged copies of a real card, so the checks are behavioural
// rather than a reading of the source.
section("8. the public gate");
if (card) {
  const clone = () => JSON.parse(JSON.stringify(card));
  const blocked = (mut, label) => {
    const c = clone(); mut(c);
    const why = RC.guards.wrPublicBlock(c);
    ok(!!why, `gate: ${label} (got ${JSON.stringify(why)})`);
  };
  eq(RC.guards.wrPublicBlock(card), "", "gate: the real card passes");
  blocked((c) => { c.footNote = "Formal record only."; },
    "a softened disclosure is refused");
  blocked((c) => { c.tally.compared = 3; }, "a card under the floor is refused");
  blocked((c) => { c.tally.backed = 9; }, "counts that do not add up are refused");
  blocked((c) => { c.rows.push({ key: THIN_LEAN, label: "x", shape: "backed", stance: "support", tier: "thin", judged: 2 }); },
    "a thin row promoted into the counts is refused");
  blocked((c) => { c.said = { text: "something", word: "Supports" }; },
    "a single stated position on a whole-person card is refused");
  blocked((c) => { c.issue = { label: "Climate Action" }; },
    "an issue chip on a whole-person card is refused");
  blocked((c) => { c.headline = "Backed the record 60% of the time"; },
    "a percentage anywhere a reader can see is refused");
  blocked((c) => { c.tally.note = "Broke with their party on 2 issues."; },
    "party framing is refused");
  blocked((c) => { c.tally.example = { lead: "Biggest gap", text: "x", shape: "split", key: SPLIT_DEEP }; },
    "a split as the example is refused");
  blocked((c) => { c.rows[0].stance = "mixed"; },
    "a counted row whose stated position names no side is refused");
}

// ══ 9. THE EXAMPLE LINE ══════════════════════════════════════════════════════
section("9. the example line");
{
  // A circular row — the position is sourced to a roll-call page — stays in the
  // counts and never becomes the example. The next-best gap is shown instead, or
  // the strongest agreement when there is no other gap.
  const c = RC.wordRecord("circrep");
  ok(!!c, "circular: the member still ships a card");
  if (c) {
    eq(c.tally.against, 1, "circular: the circular row is still COUNTED — dropping it would shrink a total nobody can audit");
    ok(!c.tally.example || c.tally.example.key !== AGAINST_STRONG,
      "circular: but it is never the example line");
    if (c.tally.example) {
      eq(c.tally.example.lead, "Strongest agreement",
        "circular: with no citable gap left, the card shows its strongest agreement instead");
    }
  }
  const circRow = RC.wordRecordRows("circrep").find((r) => r.key === AGAINST_STRONG);
  eq(RC.guards.wrCircular("circrep", circRow), true,
    "circular: a position sourced to a roll-call page is detected");
  const plainRow = RC.wordRecordRows("wrrep").find((r) => r.key === AGAINST_STRONG);
  eq(RC.guards.wrCircular("wrrep", plainRow), false,
    "circular: an ordinary sourced position is not");
  eq(RC.guards.wrCircular("wrrep", { saidText: "Voted for H.R. 5376 last June.", saidSource: "" }), true,
    "circular: a “position” that names a measure is a vote wearing a stance's clothes");
}

// ══ 10. THE SCORE PATH IS UNTOUCHED ══════════════════════════════════════════
// The whole lane is three reads. The proof is that every score, row and tally is
// byte-identical with the lane dark — and that reading the lane hard does not
// move them either.
section("10. the score path");
{
  const CA = A.window.PDXConsistency, CB = B.window.PDXConsistency;
  eq(CB.formalPatternIndex && typeof CB.formalPatternIndex.rows, "function",
    "control: the control boot still has the row model");
  eq(B.window.PDXReceiptCards.wordRecord("wrrep"), null,
    "control: with the pattern engine dark, no words-vs-record card exists");

  for (const pid of ["wrrep", "fewrep", "leanrep"]) {
    const before = JSON.stringify({
      official: CA.officialRecord(pid), saydo: CA.sayVsDo(pid),
      tally: CA.verdictTally(pid), rows: CA.issueRows(pid).map((r) => [r.key, r.direction]),
    });
    // Read the lane hard: cards, tallies, rows, audits, captions.
    RC.wordRecord(pid); RC.wordRecordTally(pid); RC.wordRecordRows(pid);
    RC.wordRecordAudit(pid); RC.wordRecordCard(pid);
    const after = JSON.stringify({
      official: CA.officialRecord(pid), saydo: CA.sayVsDo(pid),
      tally: CA.verdictTally(pid), rows: CA.issueRows(pid).map((r) => [r.key, r.direction]),
    });
    eq(after, before, `score: reading the lane does not move anything for ${pid}`);
    const control = JSON.stringify({
      official: CB.officialRecord(pid), saydo: CB.sayVsDo(pid),
      tally: CB.verdictTally(pid), rows: CB.issueRows(pid).map((r) => [r.key, r.direction]),
    });
    eq(after, control, `score: ${pid} scores identically with the lane dark`);
  }

  // NOTHING IS WRITTEN INTO THE POSITION MAP. The map is memoised and handed back
  // by reference, so a lane that wrote a tier into it would corrupt Direction
  // Match for every later reader.
  const pmBefore = JSON.stringify(A.window._polPositionMap("wrrep", PROFILES.wrrep));
  RC.wordRecord("wrrep"); RC.wordRecordRows("wrrep");
  const pmAfter = JSON.stringify(A.window._polPositionMap("wrrep", PROFILES.wrrep));
  eq(pmAfter, pmBefore, "wall: no pattern tier is written into the position map");
  for (const [k, v] of Object.entries(JSON.parse(pmAfter))) {
    ok(["support", "oppose", "mixed"].includes(v.stance),
      `wall: ${k} still holds a stated position, not a pattern label (${v.stance})`);
    eq(typeof v.tier, "undefined", `wall: ${k} carries no tier field`);
  }

  // And the say-vs-do card feed is unchanged: this lane adds no card to it and
  // removes none.
  eq(JSON.stringify(RC.publicCardsFor("wrrep").map((c) => c.issueKey)),
     JSON.stringify(B.window.PDXReceiptCards.publicCardsFor("wrrep").map((c) => c.issueKey)),
    "score: the say-vs-do card feed is identical with the lane dark");
}

// ══ 11. THE CARD AND THE FORMAL PATTERN INDEX AGREE ══════════════════════════
// They read the same two engine functions. If they can disagree about a member's
// pattern on an issue, one of them is a second scoring engine.
section("11. agreement with the formal pattern index");
{
  const fpi = A.window.PDXConsistency.formalPatternIndex.rows("wrrep") || [];
  ok(fpi.length > 0, "index: the formal pattern index has rows for this member");
  const byKey = {};
  fpi.forEach((r) => { byKey[r.key] = r; });
  // Where the index READ a pattern, the two must be the same pattern, word for
  // word — that is the anti-second-engine check and it is unchanged.
  //
  // Where the index REFUSED, the two must refuse together. They part company only
  // on wording: the index asks _fpiUnreadWhy which of the unreadable cases this is
  // and prints that, while the card prints the pattern engine's own one-size
  // refusal. A more specific sentence about the same non-answer is not a second
  // opinion about the record; claiming a direction the other one does not would
  // be, and that is what is asserted here.
  //
  // AND THERE IS NOW A THIRD CASE. The index publishes a `deferred` row when the
  // pattern engine will not characterise a record but the browse lane already
  // does — a shallow both-ways record, for instance, which the engine leaves at
  // `none` and the browse lane prints as a Split with its two counts. Those rows
  // are QUOTED, not characterised: the index carries the browse lane's words so
  // that no judged act goes unread anywhere a reader can see one, and marks them
  // so that nothing which counts can pick them up.
  //   THIS CARD IS SOMETHING THAT COUNTS. Its tally has a `split` column, and a
  // split it accepted would be a comparable issue in the arithmetic — so letting
  // a deferred split in would count a 2–1 as a split and quietly lower
  // _RD_SPLIT_MIN_JUDGED for the headline number. The card therefore stays on the
  // pattern engine, refuses the row, and the two surfaces are asserted to disagree
  // in the one direction that is safe: the index may print more than the card, the
  // card may never print a side the index does not hold.
  let checked = 0, refused = 0, quoted = 0;
  for (const r of rows) {
    const f = byKey[r.key];
    if (!f) continue;
    if (f.read && f.deferred) {
      quoted++;
      eq(r.shape, "unread",
        `index: the ${r.key} row is a browse-lane quote and the card must not read it`);
      eq(r.tier, "none", `index: …and the card's refusal is the engine's own none tier`);
      ok(!f.said, `index: …and a quoted row is never a counted comparison on ${r.key}`);
    } else if (f.read) {
      checked++;
      eq(r.tier, f.tier, `index: the ${r.key} pattern tier matches the index row`);
      eq(r.patLabel, f.patLabel, `index: the ${r.key} pattern label matches the index row`);
      const claims = ["backed", "against", "thin"].includes(r.shape);
      eq(claims, !!f.directional,
        `index: the ${r.key} card and index disagree about whether a side was read`);
    } else {
      refused++;
      eq(r.shape, "unread",
        `index: the ${r.key} index refused the row but the card claims a reading`);
      eq(r.tier, "none", `index: …and the card's refusal is the engine's own none tier`);
      ok(!!(f.why && f.why.id),
        `index: …and the index's refusal on ${r.key} names which case it is`);
    }
  }
  ok(checked >= 5, `index: at least five read rows were compared (was ${checked})`);
  ok(refused + quoted >= 1,
    `index: no row the card refuses was compared (was ${refused + quoted})`);
}

// ══ 12. ARRIVAL ══════════════════════════════════════════════════════════════
// The round trip on the real router: the card's own hash in, this member's
// formal-pattern surface out — and never a single-issue dossier.
section("12. arrival");
{
  const L = A.window.PDXShareLinks;
  ok(!!L, "arrival: share-links is loaded");
  eq(L.wordrecord("wrrep"), "https://politidex.fyi/?wordrecord=wrrep",
    "arrival: the server-visible form is a member address with no issue");
  eq(L.wordrecord("a~b"), "https://politidex.fyi/?wordrecord=a~b",
    "arrival: the builder encodes whatever it is given");
  // A query with an issue segment is a single-issue address wearing the wrong
  // param name, and opens nothing.
  eq(A.window.PDXReceipts.linkFor(card, "", { canonical: true }),
    "https://politidex.fyi/?wordrecord=wrrep",
    "arrival: the card's own share link is the whole-person address, not /?receipt=");

  // The router. handleWordRecordHash opens the profile and then the Full Stance
  // Record overlay, which is where the formal-pattern index lives.
  const opened = [];
  A.window.location.hash = "#wordrecord=wrrep";
  A.window.showProfile = (pid) => opened.push(["profile", pid]);
  A.window._pdxOpenStanceRecord = (pid) => opened.push(["record", pid]);
  A.window.PDXConsistency.openGap = (pid, iss) => opened.push(["gap", pid, iss]);
  A._timers.length = 0;
  RC.handleWordRecordHash();
  A._timers.splice(0).forEach((fn) => { try { fn(); } catch (e) {} });
  ok(opened.some((o) => o[0] === "profile" && o[1] === "wrrep"),
    "arrival: the member's profile is opened");
  ok(opened.some((o) => o[0] === "record" && o[1] === "wrrep"),
    "arrival: and their formal-pattern surface on top of it");
  ok(!opened.some((o) => o[0] === "gap"),
    "arrival: never a single-issue dossier — the card named no issue");

  // The single-issue router must not answer this hash, and this one must not
  // answer the single-issue hash.
  opened.length = 0;
  RC.handleHash();
  eq(opened.length, 0, "arrival: #wordrecord= is not matched by the #record= router");
  A.window.location.hash = "#record=wrrep~climate_action";
  A._timers.length = 0;
  RC.handleWordRecordHash();
  A._timers.splice(0).forEach((fn) => { try { fn(); } catch (e) {} });
  eq(opened.length, 0, "arrival: #record= is not matched by the #wordrecord= router");
  A.window.location.hash = "";
}

// ══ 13. THE SHARE AFFORDANCE ═════════════════════════════════════════════════
// A whole-person slot resolves to the whole-person card and to nothing else: a
// reader who taps a control promising a count across their positions must never
// be handed one vote instead.
section("13. the affordance");
{
  const html = RC.buttonHtml({ pid: "wrrep", whole: true, block: true });
  has(html, 'data-pdxrc-whole="1"', "affordance: the slot marks itself whole-person");
  has(html, 'data-pid="wrrep"', "affordance: and carries the member");
  lacks(html, "data-issue", "affordance: and no issue, because the card names none");
  has(html, "data-pdxrc-pending", "affordance: it arrives pending, like every other slot");
  has(html, "hidden", "affordance: and hidden until a card is known to exist");

  const btn = (attrs) => ({ getAttribute: (k) => (k in attrs ? attrs[k] : null) });
  const whole = RC.guards ? null : null;   // (guards holds no button reader — read via cardForButton)
  // cardForButton is not exported; the behaviour is asserted through the two
  // reads it delegates to, which is what a whole slot and an issue slot resolve
  // to respectively.
  eq(RC.wordRecord("wrrep") && RC.wordRecord("wrrep").origin, "word_record_pattern",
    "affordance: a whole slot resolves to the words-vs-record card");
  eq(RC.wordRecord("fewrep"), null,
    "affordance: and to nothing at all when the member is under the floor — the button is removed");
  void whole; void btn;
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✖ ${failures.length} failure(s) (${passed} passed):\n`);
  failures.forEach((f) => console.error("  • " + f));
  process.exit(1);
}
console.log(`✓ words-vs-formal-record share card: ${passed} checks passed`);
