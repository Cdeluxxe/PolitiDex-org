#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-lyman-letterhead-warm.mjs — the letterhead does not change its mind when
// the roster warms
// ─────────────────────────────────────────────────────────────────────────────
// THE LIVE DEFECT THIS PINS
//
// /p/lyman first-painted correctly. The SAID brief: the eyebrow, the honest line
// under it, and coloured rows carrying seven sourced positions. Then "Loading the
// latest roster…" resolved, the file re-rendered, and the same address became a
// different page — courthouse/eagle art, "CURRENT CANDIDATE", "No formal pattern
// on file yet", the chips gone. Nothing about the person had changed in those two
// frames. Pace, Larson, Chew and Lee did not flip; lyman did.
//
// TWO IDENTITIES, AND A GATE THAT ONLY KNEW ONE OF THEM
//
// The cards are filed under `phil_lyman`. The address, the roster row and the
// member payload are all `lyman`. Every other surface in this app crosses that
// gap the same way — stance-helpers._resolveStanceList hops id → explicit alias →
// slug of the display name → alias of that slug, and publication-floor.js copies
// those four hops verbatim so the sitemap cannot disagree with the file. The SAID
// gate took none of them: it asked issueRows(pid) with the raw address, and
// issueRows resolves stances off CMP_DATA[pid].name and never off the person
// object it was handed. So on any warm frame where the roster row has not landed
// or its name is still blank, the cited count fell to zero and the brief was
// refused for a file whose cards never moved.
//
// AND A SECOND OPINION THAT COULD NOT TELL AN ACT FROM A CRUMB
//
// The gate also asked briefEmptyLegal — the door that guards the EMPTY-FILE
// PARAGRAPH ("nothing we hold for them is a vote or a formal action", printed
// beside a nav chip counting records). That door refuses on the raw payload count
// and on the chip's count, which is right for that paragraph and wrong for this
// letterhead: noteMember landing ONE inert row — a curated narrative the
// official-actions feeder mapped to an issue, a sponsorship the record lane
// routes to the executive lane, a backfill crumb — took both counts off zero and
// slammed a door the person's record had nothing to do with.
//
// THE RULES THIS HARNESS HOLDS
//
//   1. COLD IS SAID. /p/lyman boots on the word-first letterhead, in full
//      furniture, with no percentage on it.
//   2. AN EMPTY PAYLOAD IS STILL SAID. noteMember(lyman, []) is the API
//      answering "nothing on file", which is the answer this block exists for.
//   3. AN INERT ROW IS STILL SAID. One unread row, one deferred read, one
//      unmapped narrative, one backfill crumb — none of them is a formal term,
//      and none of them may flip the letterhead.
//   4. A REAL ACT STILL FLIPS IT. A roll call with a side flips it because
//      saidNoTerm weighs the act; a roll call the issue mapping never reached
//      flips it too, because SAID_NOTE denies roll calls and that denial has to
//      be true. Neither refusal is re-derived in this harness: the first is the
//      formal pattern index's own shape, the second is the record lane's own
//      test — a ballot in `position`, or an act the act layer can class — asked
//      of the whole payload through the gate's published predicate. The ballot
//      vocabulary that test reads is pinned to consistency.js's _BALLOTS at
//      source by scripts/test-said-brief-word-first.mjs, because the engine
//      keeps that table private and a copy nobody compares is a copy that
//      drifts.
//   5. THE WARM FRAME IS THE SAME FRAME. A Firestore document merging in, a
//      blanked roster name, a missing roster row, a person object carrying
//      nothing but an id — every shape the warm path can hand the gate still
//      lands on phil_lyman's cards and still reads SAID. INCLUDING THE FRAME WITH
//      NO DISPLAY NAME ANYWHERE ON IT (section 5b): the slug hop has nothing to
//      slug when the roster name is blank, the roster row is missing, or the name
//      has only reached the merged document, and the alias tables — read
//      backwards, the way they are actually written — carry the resolution with
//      no name at all.
//   6. THE PHOTO CROSSES THE SAME GAP. A headshot filed under either key
//      resolves on the other, and a photo that already resolved is unchanged —
//      so the eagle is never painted over a loaded face.
//   7. NOBODY ELSE MOVED. chew_h68 keeps its record-first letterhead through a
//      noteMember, and so does lee.
//   8. NO SECOND ROSTER ROW, NO INVENTED ACT. The warm simulation mints no
//      CMP_DATA record for phil_lyman, the roster count is unchanged, the
//      payload holds exactly what was noted, and the index judges nothing.
//
//   node scripts/test-lyman-letterhead-warm.mjs
//
// No database, no network: every source of truth here is a committed file.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const hasNot = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ lyman letterhead: STALE HARNESS — ${m}`); process.exit(2); };

const PID = "lyman";
const CARD_KEY = "phil_lyman";

// The engine, in load order, exactly as index.html serves it. The same list the
// SAID harness boots, because the question here is what the SHIPPED gate answers
// and not what a paraphrase of it would.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "formal-index.js", "issue-colors.js", "consistency.js", "voting-record.js",
  "word-action.js", "stance-tree.js", "profile-spine.js",
  // profile-evidence.js publishes PDX_PROFILE_ALIAS — the table that says
  // phil_lyman and lyman are one person — and index.html serves it as a PLAIN
  // script, so it has run before any deferred module here even parses. It is in
  // this list because the hop chain reads that table, and a sandbox without it
  // would pass the nameless frames for the wrong reason.
  "profile-evidence.js",
];

function boot() {
  const win = makeSandbox();
  const ls = {};
  const store = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(ls, k) ? ls[k] : null),
    setItem: (k, v) => { ls[k] = String(v); },
    removeItem: (k) => { delete ls[k]; },
  };
  win.localStorage = store;
  win.sessionStorage = store;
  win.auth = { currentUser: null };
  win.performance = { now: () => 0 };
  // THE PAYLOAD LANDED, AND FOR EVERYONE THE FIXTURE DOES NOT SEED IT LANDED
  // EMPTY — an ARRAY with nothing in it, which is what memberRecords documents
  // and what the API answers for a candidate whose roll calls are not ingested.
  // Deliberately not `{}`: an object with no length is not a payload, and
  // saidLanded refuses it. That refusal is a separate rule and is not this file's.
  const rec = {};
  win.PDXVotingRecord = {
    memberRecords: (pid) => rec[pid] || [],
    fetchMember: () => {},
    noteMember: (pid, rows) => { rec[pid] = rows; },
  };
  const sandbox = vm.createContext(win);
  win.__err = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { win.__err.push(`${f}: ${e.message}`); }
  }
  // voting-record.js publishes its own namespace at load, replacing the stub. Its
  // noteMember is what files rows where every reader downstream looks for them, so
  // it is kept and only the fetching entry point is pinned — nothing in this
  // sandbox goes looking for a network.
  const VR = win.PDXVotingRecord || {};
  const note = typeof VR.noteMember === "function" ? VR.noteMember.bind(VR) : (pid, rows) => { rec[pid] = rows; };
  VR.fetchMember = () => {};
  VR.noteMember = (pid, rows) => { rec[pid] = rows; note(pid, rows); };
  VR.memberRecords = (pid) => rec[pid] || [];
  win.PDXVotingRecord = VR;
  win.__rec = rec;
  return win;
}

// The one signal the app has that a derivation's inputs moved. Every cache in
// stance-helpers, consistency and word-action stores the epoch it was computed
// under; a warm frame that does not bump it is reading yesterday's answer, so the
// harness bumps it exactly where firebase-boot.js and voting-record.js do.
const changed = (w) => { if (typeof w.PDXDataChanged === "function") w.PDXDataChanged(); };

const W = boot();
must(W.__err.length === 0, `the engine did not load cleanly: ${W.__err.join(" | ")}`);

const WA = W.PDXWordAction;
const CS = W.PDXConsistency;
const SP = W.PDXProfileSpine;
const CMP = W.CMP_DATA || {};

must(WA && CS && SP, "word-action.js / consistency.js / profile-spine.js no longer publish their namespaces");
must(typeof WA.saidLeadApplies === "function", "PDXWordAction.saidLeadApplies is gone — the gate cannot be asked");
must(typeof WA.saidRowSet === "function", "PDXWordAction.saidRowSet is gone — the cards have no accessor");
must(typeof WA.saidNoTerm === "function", "PDXWordAction.saidNoTerm is gone — the acts test cannot be asked");
must(typeof WA.saidEmptyLegal === "function",
  "PDXWordAction.saidEmptyLegal is gone — this lane's own door is not published, so the fix cannot be asserted against the served module");
must(typeof WA.saidStanceId === "function",
  "PDXWordAction.saidStanceId is gone — the hop chain has no accessor");
must(typeof WA.heroHtml === "function", "PDXWordAction.heroHtml is gone — the letterhead cannot be rendered");
must(CS.formalPatternIndex && typeof CS.formalPatternIndex.shape === "function",
  "PDXConsistency.formalPatternIndex.shape is gone");
must(typeof WA.saidPayloadHasAct === "function",
  "PDXWordAction.saidPayloadHasAct is gone — the payload predicate this lane's door asks is not published, so the fix cannot be asserted against the served module");
must(CMP[PID], "lyman is no longer in cmp-data.js — the subject of this report is gone");
must(!CMP[CARD_KEY], "cmp-data.js has grown a phil_lyman roster row — this report is about ONE roster row, and rule 8 is void");

const CARDS = (W.ISSUE_STANCE_DATA || {})[CARD_KEY] || [];
const CITED = CARDS.filter((c) => c && c.source && c.source.url).length;
must(CITED >= 2, `phil_lyman's cited cards are gone (${CITED}) — every rule below would pass vacuously`);
must(!(W.ISSUE_STANCE_DATA || {})[PID],
  "ISSUE_STANCE_DATA has grown a `lyman` key — the two-identity case this file pins no longer exists");

const person = (w, pid) => Object.assign({ id: pid }, (w.CMP_DATA || {})[pid]);

console.log("lyman letterhead / roster warm");

// ── the rows the warm path can land ─────────────────────────────────────────
// Each one is a real shape from the member endpoint, and NOT ONE OF THEM IS A
// FORMAL TERM. They are the four ways the payload can be non-empty while the
// person still has no roll call and no signed act on file.
let seq = 0;
const ISSUE = "lands_local";
// A curated narrative the official-actions feeder mapped to an issue. kind
// 'position', no ballot cast, and an actionType the record lane's act table has
// no weight for — which is precisely why recordLaneFor() routes it to the
// executive lane, where no pattern read runs.
const narrative = (issueKey) => ({
  kind: "position", rollcallId: null, measureId: 7000 + ++seq,
  number: "H.B. " + seq, date: "2025-02-0" + ((seq % 9) + 1),
  action: "Discussed", position: "statement", isProcedural: false,
  title: "A measure " + seq,
  issues: issueKey ? [{ issueKey, weight: 100, isPrimary: true }] : [],
  source: { url: "https://le.utah.gov/x" + seq, label: "Utah Legislature" },
});
// The same crumb with nothing mapped at all — the backfill row that reaches the
// tab and reaches no issue row.
const unmapped = () => narrative(null);
// A ballot, with a side, mapped. This one IS a formal term and must flip.
const ballot = (issueKey) => {
  seq++;
  return {
    kind: "vote", rollcallId: 9000 + seq, measureId: 9500 + seq,
    number: "S. " + (100 + seq), date: "2025-03-0" + ((seq % 9) + 1),
    action: "On Passage", position: "yea", isProcedural: false, title: "Measure " + seq,
    issues: issueKey ? [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }] : [],
    source: { url: "https://www.congress.gov/roll-call-vote/" + (9000 + seq), label: "Congress.gov" },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
section("1 · cold boot — /p/lyman leads with what they said");
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(WA.saidLeadApplies(PID, person(W, PID)), "lyman: the SAID gate does not fire on a cold boot");
  const set = WA.saidRowSet(PID, person(W, PID));
  eq(set.cited, CITED, "lyman: the gate does not count phil_lyman's cited cards through the roster id");
  const hero = WA.heroHtml(PID, person(W, PID));
  has(hero, "pdxwa-brief-said", "lyman: the cold letterhead is not the SAID brief");
  has(hero, WA.SAID_EYEBROW, "lyman: the eyebrow is not the reviewed sentence");
  has(hero, WA.SAID_NOTE, "lyman: the honest line under the list is missing");
  hasNot(hero, "%", "lyman: a percentage reached a letterhead with one half of Word vs Action");
  hasNot(hero, "No formal pattern on file yet", "lyman: the record-first absence is on the cold letterhead");
  ok(SP.twoJobsWordFirst(PID, person(W, PID)),
    "lyman: the two-jobs explainer still calls the record the main view on a cold boot");
  // The payload landed empty, which is the state every rule below starts from.
  eq((W.PDXVotingRecord.memberRecords(PID) || []).length, 0,
    "the cold fixture already holds a member record — rule 2 would prove nothing");
}

// ─────────────────────────────────────────────────────────────────────────────
section("2 · noteMember(lyman, []) — an empty answer is still an answer");
// ─────────────────────────────────────────────────────────────────────────────
{
  const w = boot();
  must(w.__err.length === 0, `the empty-payload sandbox did not load: ${w.__err.join(" | ")}`);
  const A = w.PDXWordAction;
  must(A.saidLeadApplies(PID, person(w, PID)), "the empty-payload fixture does not start on SAID");
  w.PDXVotingRecord.noteMember(PID, []);
  changed(w);
  ok(A.saidLeadApplies(PID, person(w, PID)),
    "lyman: an empty member payload flipped the letterhead off the word lane");
  eq(A.saidRowSet(PID, person(w, PID)).cited, CITED,
    "lyman: the cited cards were lost when the empty payload landed");
  has(A.heroHtml(PID, person(w, PID)), "pdxwa-brief-said",
    "lyman: the letterhead re-rendered off the SAID brief on an empty payload");
  ok(A.saidNoTerm(PID), "lyman: saidNoTerm refuses an empty payload");
  ok(A.saidEmptyLegal(PID), "lyman: this lane's door closed on an empty payload");
}

// ─────────────────────────────────────────────────────────────────────────────
section("3 · one inert row — a crumb is not a term");
// ─────────────────────────────────────────────────────────────────────────────
// THE REPORTED FLIP, REPRODUCED FOUR WAYS. Each sandbox is fresh, because the
// question is what a reader sees on the frame after noteMember and not what the
// gate remembers from the frame before.
{
  const cases = [
    ["one unread row mapped to an issue", () => [narrative(ISSUE)]],
    ["one row the issue mapping never reached", () => [unmapped()]],
    ["a backfill pack of three narratives", () => [narrative(ISSUE), narrative(ISSUE), unmapped()]],
  ];
  for (const [label, rows] of cases) {
    const w = boot();
    must(w.__err.length === 0, `the inert-row sandbox did not load: ${w.__err.join(" | ")}`);
    const A = w.PDXWordAction;
    const F = w.PDXConsistency.formalPatternIndex;
    must(A.saidLeadApplies(PID, person(w, PID)), `${label}: the fixture does not start on SAID`);
    const payload = rows();
    w.PDXVotingRecord.noteMember(PID, payload);
    changed(w);
    eq((w.PDXVotingRecord.memberRecords(PID) || []).length, payload.length,
      `${label}: the payload is not on file, so nothing was tested`);
    ok(!A.saidPayloadHasAct(PID),
      `${label}: the door reads a roll call or a signed act in a payload that holds neither`);
    ok(A.saidNoTerm(PID),
      `${label}: saidNoTerm reads a formal term into a payload with no act on it`);
    ok(A.saidEmptyLegal(PID),
      `${label}: this lane's door slammed on a payload holding no roll call and no signed act`);
    ok(A.saidLeadApplies(PID, person(w, PID)),
      `${label}: the letterhead flipped off the word lane after noteMember`);
    const hero = A.heroHtml(PID, person(w, PID));
    has(hero, "pdxwa-brief-said", `${label}: the letterhead re-rendered as record-first`);
    has(hero, w.PDXWordAction.SAID_NOTE, `${label}: the honest line is gone from the warm letterhead`);
    hasNot(hero, "No formal pattern on file yet",
      `${label}: the record-first absence replaced the word lane`);
    hasNot(hero, "issue on the formal record",
      `${label}: the depth line printed its zeroes over a file with no formal term`);
    hasNot(hero, "%", `${label}: a percentage reached the warm letterhead`);
    ok(SP.twoJobsWordFirst && w.PDXProfileSpine.twoJobsWordFirst(PID, person(w, PID)),
      `${label}: the two-jobs explainer handed the main view back to the record`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section("4 · and the row that must flip it");
// ─────────────────────────────────────────────────────────────────────────────
// THE OTHER HALF OF THE RULE, AND THE HALF THAT KEEPS SAID_NOTE HONEST. The note
// under the list makes exactly one claim about the formal record — "No roll call
// or signed act on file" — so a payload holding either may not print it. Two
// shapes prove it, and they are refused by two different readers on purpose:
// a mapped ballot is weighed by the index, so saidNoTerm refuses it; an UNMAPPED
// ballot is on no row of the index at all, and only the payload's own predicate
// can see it.
{
  const w = boot();
  must(w.__err.length === 0, `the ballot sandbox did not load: ${w.__err.join(" | ")}`);
  const A = w.PDXWordAction;
  const F = w.PDXConsistency.formalPatternIndex;
  must(A.saidLeadApplies(PID, person(w, PID)), "the ballot fixture does not start on SAID");
  w.PDXVotingRecord.noteMember(PID, [ballot(ISSUE)]);
  changed(w);
  ok(A.saidPayloadHasAct(PID), "a roll call in the payload is not read as a formal act");
  ok(!A.saidEmptyLegal(PID), "this lane's door stayed open over a roll call on file");
  ok(!A.saidLeadApplies(PID, person(w, PID)),
    "the word-first letterhead printed 'no roll call or signed act on file' over a roll call");
}
{
  const w = boot();
  const A = w.PDXWordAction;
  const F = w.PDXConsistency.formalPatternIndex;
  must(A.saidLeadApplies(PID, person(w, PID)), "the unmapped-ballot fixture does not start on SAID");
  w.PDXVotingRecord.noteMember(PID, [ballot(null)]);
  changed(w);
  // The index cannot see it — that is the whole point of asking the payload.
  eq((F.shape(PID) || {}).issues, 0,
    "an unmapped roll call reached the formal pattern index — this counterfactual proves nothing");
  ok(A.saidPayloadHasAct(PID), "an unmapped roll call is invisible to the payload predicate too");
  ok(!A.saidLeadApplies(PID, person(w, PID)),
    "a roll call the issue mapping never reached passed under a letterhead that denies roll calls");
}
{
  // A RECORDED ABSENCE IS STILL A ROLL CALL. They were at the vote; the ledger
  // says how. "No roll call on file" is false about it.
  const w = boot();
  const A = w.PDXWordAction;
  const absent = Object.assign(ballot(ISSUE), { position: "not voting" });
  w.PDXVotingRecord.noteMember(PID, [absent]);
  changed(w);
  ok(!A.saidLeadApplies(PID, person(w, PID)),
    "a recorded absence on a roll call was treated as no roll call at all");
}

// ─────────────────────────────────────────────────────────────────────────────
section("5 · the warm frame — every shape the merge can hand the gate");
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE WARM PATH ACTUALLY DOES. profiles-full.js's _pdxColdOpen.merge
// re-runs openModal with a person assembled from the Firestore document and the
// roster row; firebase-boot.js merges the lazy-full document over PROFILES[id]
// and never lets a blank overwrite a curated field. The gate is re-asked with
// whatever that assembly produced — and the four shapes below are the ones it
// can produce while the roster row is still arriving.
{
  const w = boot();
  must(w.__err.length === 0, `the warm sandbox did not load: ${w.__err.join(" | ")}`);
  const A = w.PDXWordAction;

  // (a) THE FIRESTORE STUB, MERGED. The document the roster warm brings in, over
  // the roster row, with the identity fields _pdxColdOpen.merge restores.
  const doc = {
    id: PID, bio: "Utah legislator and 2026 candidate.",
    name: CMP[PID].name, office: CMP[PID].office, state: CMP[PID].state,
    district: CMP[PID].district, party: CMP[PID].party, icon: CMP[PID].icon,
  };
  w.PROFILES = w.PROFILES || {};
  w.PROFILES[PID] = Object.assign({}, w.CMP_DATA[PID], doc);
  w.PDXVotingRecord.noteMember(PID, [narrative(ISSUE)]);
  changed(w);
  ok(A.saidLeadApplies(PID, w.PROFILES[PID]),
    "lyman: the merged Firestore person fails the gate the roster row passed");
  eq(A.saidRowSet(PID, w.PROFILES[PID]).cited, CITED,
    "lyman: the merged person loses the cited cards");

  // (b) THE RAW ROSTER ID, WITH NOTHING ON IT. "Warm must not pass a raw roster
  // id that can't see the cards" — and now it cannot, because the hop chain does
  // not need the person object to have a name when the roster still has one.
  ok(A.saidLeadApplies(PID, { id: PID }),
    "lyman: a bare roster id fails the gate — the warm path may hand it exactly this");
  eq(A.saidRowSet(PID, { id: PID }).cited, CITED,
    "lyman: a bare roster id counts no cited cards");

  // (c) THE ROSTER NAME HAS NOT LANDED. The frame where CMP_DATA[pid] exists and
  // its name is blank — the one that dropped the cited count to zero. The person
  // object carries the name here, and it is read AHEAD of the roster for that
  // reason.
  const w2 = boot();
  const A2 = w2.PDXWordAction;
  w2.CMP_DATA[PID] = Object.assign({}, w2.CMP_DATA[PID], { name: "" });
  changed(w2);
  eq(A2.saidStanceId(PID, { id: PID, name: CMP[PID].name }), CARD_KEY,
    "lyman: the hop chain does not reach phil_lyman off the person object's name");
  eq(A2.saidRowSet(PID, { id: PID, name: CMP[PID].name }).cited, CITED,
    "lyman: a blanked roster name loses the cited cards the person object could still reach");
  ok(A2.saidLeadApplies(PID, { id: PID, name: CMP[PID].name }),
    "lyman: a blanked roster name flipped the letterhead");

  // (d) THE ROSTER ROW IS NOT THERE AT ALL. The first frame of a cold arrival
  // that has to render before the roster resolves.
  const w3 = boot();
  const A3 = w3.PDXWordAction;
  delete w3.CMP_DATA[PID];
  changed(w3);
  eq(A3.saidStanceId(PID, { id: PID, name: CMP[PID].name }), CARD_KEY,
    "lyman: the hop chain needs a roster row it may not have yet");
  ok(A3.saidLeadApplies(PID, { id: PID, name: CMP[PID].name }),
    "lyman: no roster row means no letterhead, even with the cards in hand");
}
{
  // THE HOP IS A RESOLUTION, NOT A GUESS. An id with no list, no alias and no
  // matching name slug resolves to itself and reads nothing — the gate may not
  // invent a set of cards for somebody who has none.
  eq(WA.saidStanceId("no_such_person_at_all", { name: "No Such Person At All" }),
    "no_such_person_at_all", "the hop chain invented a stance key for an unknown id");
  eq(WA.saidRowSet("no_such_person_at_all", { name: "No Such Person At All" }).cited, 0,
    "the hop chain found cited cards for an unknown id");
  ok(!WA.saidLeadApplies("no_such_person_at_all", { id: "no_such_person_at_all" }),
    "the gate fired for an id with no cards");
  eq(WA.saidStanceId(PID, null), CARD_KEY,
    "lyman: the hop chain cannot resolve without a person object, which the record-first callers do not pass");
  // …AND IT DOES NOT MOVE A FILE THAT ALREADY RESOLVED. An id whose cards are
  // filed under the id itself must resolve to the id, not to a name slug.
  const direct = Object.keys(W.ISSUE_STANCE_DATA || {})
    .filter((k) => CMP[k] && (W.ISSUE_STANCE_DATA[k] || []).length).slice(0, 25);
  must(direct.length > 5, "no id in the roster carries its own stance list — the no-op case is untested");
  for (const id of direct) {
    eq(WA.saidStanceId(id, person(W, id)), id,
      `${id}: the hop chain moved a file whose cards are already under its own id`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section("5b · the frame with no display name on it");
// ─────────────────────────────────────────────────────────────────────────────
// THE FRAME THAT WAS STILL FLIPPING. Section 5 hands the gate a person object OR
// a roster row that carries the display name, and the slug hop — the publication
// floor's own hop — needs one of those two to be true. The warm path can make
// both false at once, and does:
//
//   · bindHero repaints with the person object captured at MOUNT, which on a cold
//     /p/lyman arrival is a bare { id } assembled before the roster answered;
//   · firebase-boot.js's merge will not let a blank document field overwrite a
//     curated one, so a roster row can sit in memory with `name` empty;
//   · the merged Firestore document lands in PROFILES before CMP_DATA has a row
//     at all, so on that frame the only copy of the name is one the slug hop was
//     not reading.
//
// In each of those the cited count fell to zero and /p/lyman re-rendered
// record-first empty over seven sourced positions — the reported defect, one
// frame later than the pass that fixed the named-frame version of it. The hop now
// reads the merged profile's name as well as the roster's, and then falls through
// to the alias tables read BACKWARDS (PDX_PROFILE_ALIAS is written phil_lyman →
// lyman, and the id in hand is the roster id), which needs no display name at all.
// Every case below is re-asked AFTER a noteMember, because a warm frame with no
// name is a warm frame that has just been handed a payload.
{
  const NAMELESS = { id: PID };
  const frames = [
    ["the roster name has not landed and the person object has none", (w) => {
      w.CMP_DATA[PID] = Object.assign({}, w.CMP_DATA[PID], { name: "" });
    }],
    ["there is no roster row and no name anywhere", (w) => {
      delete w.CMP_DATA[PID];
    }],
    ["the name is only in the merged Firestore document", (w) => {
      w.CMP_DATA[PID] = Object.assign({}, w.CMP_DATA[PID], { name: "" });
      w.PROFILES = w.PROFILES || {};
      w.PROFILES[PID] = { id: PID, name: CMP[PID].name, bio: "Utah legislator and 2026 candidate." };
    }],
  ];
  for (const [label, frame] of frames) {
    const w = boot();
    must(w.__err.length === 0, `${label}: the sandbox did not load: ${w.__err.join(" | ")}`);
    const A = w.PDXWordAction;
    frame(w);
    w.PDXVotingRecord.noteMember(PID, [narrative(ISSUE)]);
    changed(w);
    eq(A.saidStanceId(PID, NAMELESS), CARD_KEY,
      `${label}: the hop chain cannot reach phil_lyman`);
    eq(A.saidRowSet(PID, NAMELESS).cited, CITED,
      `${label}: the cited cards are lost, which is what flips the letterhead`);
    ok(A.saidNoTerm(PID), `${label}: saidNoTerm read a formal term into an inert row`);
    ok(A.saidLeadApplies(PID, NAMELESS),
      `${label}: the letterhead flipped off the word lane`);
    const hero = A.heroHtml(PID, NAMELESS);
    has(hero, "pdxwa-brief-said", `${label}: the letterhead re-rendered as record-first`);
    has(hero, A.SAID_NOTE, `${label}: the honest line is gone from the warm letterhead`);
    hasNot(hero, "No formal pattern on file yet",
      `${label}: the record-first absence replaced the word lane`);
    hasNot(hero, "%", `${label}: a percentage reached the warm letterhead`);
    ok(w.PDXProfileSpine.twoJobsWordFirst(PID, NAMELESS),
      `${label}: the two-jobs explainer handed the main view back to the record`);
    // ONE FILE, ONE COUNT. The evidence locker's absent-term band prints the
    // letterhead's own cited total, so it is asked on the same frame with the
    // same object: two surfaces disagreeing about one file is the same class of
    // defect as the flip itself.
    eq((w.PDXWordAction.saidRowSet(PID, NAMELESS) || {}).cited, CITED,
      `${label}: the open-gaps band would print a different total than the brief`);
  }
}
{
  // AND THE BACKWARD HOP INVENTS NOTHING. It resolves only to a key that already
  // carries a non-empty stance list, and only after the direct read, the forward
  // alias and every name slug have come back empty.
  const A = WA;
  const S = W.ISSUE_STANCE_DATA || {};
  eq(A.saidStanceId("no_such_person_at_all", { id: "no_such_person_at_all" }),
    "no_such_person_at_all", "the backward hop invented a stance key for a nameless unknown id");
  ok(!A.saidLeadApplies("no_such_person_at_all", { id: "no_such_person_at_all" }),
    "the gate fired for a nameless id with no cards");
  // EVERY BRIDGED KEY IN THE SHIPPED TABLES, SWEPT. For each roster id the alias
  // tables point at, the hop must return either the id itself or a key with cards
  // on it — never a key this repo holds nothing under, and never a key the tables
  // have not declared to be the same person.
  const tables = [W.STANCE_ALIASES, W.PDX_PROFILE_ALIAS, W.PDX_PID_ALIASES].filter(Boolean);
  must(tables.length === 3,
    "one of the three alias tables is no longer published — the sweep would pass vacuously");
  let bridged = 0;
  for (const tbl of tables) {
    for (const from of Object.keys(tbl)) {
      const to = tbl[from];
      if (!to || typeof to !== "string") continue;
      bridged++;
      const got = A.saidStanceId(to, { id: to });
      if (got === to) continue;
      ok((S[got] || []).length > 0,
        `${to}: the hop chain resolved to ${got}, which carries no stance cards`);
      // Declared the same person by one of the two things the chain is allowed to
      // read: a slug of a display name this repo files under that id, or an alias
      // table entry in either direction.
      const slug = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const declared = got === from ||
        slug((CMP[to] || {}).name) === got ||
        slug(((W.PROFILES || {})[to] || {}).name) === got ||
        tables.some((t) => t[got] === to || t[to] === got);
      ok(declared,
        `${to}: the hop chain resolved to ${got}, which nothing in this repo declares to be the same person`);
    }
  }
  must(bridged > 20, `the bridged-key sweep covered ${bridged} entries — too few to mean anything`);
  // AND THE FULL NO-OP SWEEP. Every roster id whose cards are filed under its own
  // id resolves to itself, with no person object in hand — the state the nameless
  // frame puts every other file in too.
  const own = Object.keys(S).filter((k) => CMP[k] && (S[k] || []).length);
  must(own.length > 100, `only ${own.length} roster ids carry their own cards — the no-op sweep is thin`);
  const moved = own.filter((id) => A.saidStanceId(id, { id: id }) !== id);
  eq(moved.length, 0,
    `the hop chain moved ${moved.slice(0, 5).join(", ")} — a file whose cards are already under its own id`);
  console.log(`      ${own.length} own-key files and ${bridged} bridged keys swept; none moved`);
}

// ─────────────────────────────────────────────────────────────────────────────
section("6 · the photo crosses the same gap");
// ─────────────────────────────────────────────────────────────────────────────
// _getPhotoUrl IS THE ONLY READER OF A HEADSHOT. The full profile hero, the
// quick-view modal and every card go through it, so a photo it cannot resolve is
// a photo no surface shows — profiles-full.js falls through to
// `<div class="ph-fallback">${p.icon}</div>`, which on lyman is the eagle in the
// report. The three functions are lifted out of the shipped IIFE rather than
// re-typed, so this asserts the served code.
{
  const SRC = R("ballot-breakdown.js");
  const liftFn = (name) => {
    const decl = `function ${name}(`;
    const start = SRC.indexOf(decl);
    must(start !== -1, `ballot-breakdown.js no longer declares ${name}() — the photo hop cannot be read`);
    const from = SRC.indexOf("{", SRC.indexOf(")", start));
    let depth = 0, end = -1;
    for (let i = from; i < SRC.length; i++) {
      if (SRC[i] === "{") depth++;
      else if (SRC[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    must(end !== -1, `${name}(): unbalanced braces`);
    return SRC.slice(start, end + 1);
  };
  const code = ["_photoSlug", "_photoUnder", "_photoKeys", "_getPhotoUrl"].map(liftFn).join("\n");

  const mk = (over) => {
    const ctx = {
      console, JSON, Object, String, Math,
      PROFILES: {}, CMP_DATA: {}, BROWSE_PHOTOS: {},
      PDX_PROFILE_ALIAS: { [CARD_KEY]: PID }, STANCE_ALIASES: {}, PDX_PID_ALIASES: {},
    };
    Object.assign(ctx, over || {});
    ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
    vm.runInContext(code + "\n;", vm.createContext(ctx), { filename: "photo-hop" });
    return ctx;
  };

  const FACE = "https://example.org/faces/phil-lyman.jpg";
  const ROSTER_ROW = { name: "Phil Lyman", icon: "🦅" };

  // (a) A FIRESTORE PHOTO FILED UNDER THE CARD KEY. This is the report: the
  // document lands under phil_lyman, the address is lyman, and the hero painted
  // the eagle over it.
  {
    const c = mk({ CMP_DATA: { [PID]: ROSTER_ROW }, PROFILES: { [CARD_KEY]: { photo: FACE } } });
    eq(c._getPhotoUrl(PID), FACE,
      "lyman: a Firestore photo filed under phil_lyman does not resolve on the roster id — the eagle is painted over a loaded headshot");
  }
  // (b) A CURATED BROWSE_PHOTOS ENTRY UNDER THE CARD KEY. chew_h68's precedent
  // fix, generalised: the entry may be filed under either key.
  {
    const c = mk({ CMP_DATA: { [PID]: ROSTER_ROW }, BROWSE_PHOTOS: { [CARD_KEY]: FACE } });
    eq(c._getPhotoUrl(PID), FACE, "lyman: a BROWSE_PHOTOS entry under phil_lyman does not resolve on the roster id");
  }
  // (c) THE ALIAS TABLE, WITHOUT A NAME TO SLUG. PDX_PROFILE_ALIAS is written
  // pointing AT the roster id, so the useful direction is the reverse one.
  {
    const c = mk({ CMP_DATA: { [PID]: { icon: "🦅" } }, BROWSE_PHOTOS: { [CARD_KEY]: FACE } });
    eq(c._getPhotoUrl(PID), FACE,
      "lyman: the reverse alias hop does not reach phil_lyman when no display name is on hand");
  }
  // (d) AND THE OTHER DIRECTION, because either spelling can be the address.
  {
    const c = mk({ CMP_DATA: { [PID]: ROSTER_ROW }, BROWSE_PHOTOS: { [PID]: FACE } });
    eq(c._getPhotoUrl(CARD_KEY), FACE, "phil_lyman: a photo on the roster id does not resolve on the card key");
  }
  // (e) NOTHING THAT RESOLVES TODAY RESOLVES DIFFERENTLY. The pid is always
  // tried first, through all three tiers, in the order it always had.
  {
    const own = "https://example.org/faces/own.jpg";
    const c = mk({
      CMP_DATA: { [PID]: Object.assign({ photo: "https://example.org/faces/static.jpg" }, ROSTER_ROW) },
      PROFILES: { [PID]: { photo: own } },
      BROWSE_PHOTOS: { [PID]: "https://example.org/faces/browse.jpg", [CARD_KEY]: FACE },
    });
    eq(c._getPhotoUrl(PID), own,
      "the live PROFILES photo on the pid itself lost its priority to a hop");
  }
  {
    const stat = "https://example.org/faces/static.jpg";
    const c = mk({
      CMP_DATA: { [PID]: Object.assign({ photo: stat }, ROSTER_ROW) },
      BROWSE_PHOTOS: { [PID]: "https://example.org/faces/browse.jpg", [CARD_KEY]: FACE },
    });
    eq(c._getPhotoUrl(PID), stat, "the bundled CMP_DATA photo lost its priority to a hop");
  }
  // (f) AND IT INVENTS NOTHING. No photo anywhere is still no photo — the icon
  // fallback is correct where there is no face to show, and this hop may not
  // manufacture a URL to avoid it.
  {
    const c = mk({ CMP_DATA: { [PID]: ROSTER_ROW } });
    eq(c._getPhotoUrl(PID), "", "a photo was invented for a person who has none");
    eq(c._getPhotoUrl(""), "", "an empty pid resolved to a photo");
    eq(c._getPhotoUrl("no_such_person_at_all"), "", "an unknown id resolved to a photo");
  }
  // (g) A BLANK IS NOT A PHOTO, at either key. The merge writes '' for a field a
  // document does not carry, and '' may not shadow a real face further down.
  {
    const c = mk({
      CMP_DATA: { [PID]: Object.assign({ photo: "   " }, ROSTER_ROW) },
      PROFILES: { [PID]: { photo: "" } },
      BROWSE_PHOTOS: { [CARD_KEY]: FACE },
    });
    eq(c._getPhotoUrl(PID), FACE, "a blank photo field shadowed a real headshot one hop away");
  }
  // (h) AND THE SHIPPED TABLES DO NOT REGRESS. Every roster id that resolves a
  // photo today still resolves the same one.
  {
    const BP = (() => {
      const ctx = { console, JSON, Object, String, Math, document: {}, window: null };
      ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
      try { vm.runInContext(R("compare-hub.js"), vm.createContext(ctx), { filename: "compare-hub.js" }); }
      catch (e) { /* the file wants a DOM; BROWSE_PHOTOS is published before it needs one */ }
      return ctx.BROWSE_PHOTOS || null;
    })();
    must(BP && Object.keys(BP).length > 50,
      "compare-hub.js no longer publishes BROWSE_PHOTOS on window — the regression sweep has no table");
    const c = mk({ CMP_DATA: CMP, BROWSE_PHOTOS: BP, PDX_PROFILE_ALIAS: W.PDX_PROFILE_ALIAS || {} });
    let swept = 0, moved = [];
    for (const id of Object.keys(BP)) {
      const url = c._getPhotoUrl(id);
      swept++;
      if (url !== BP[id]) moved.push(id);
    }
    eq(moved.length, 0, `the hop chain changed which photo ${moved.slice(0, 5).join(", ")} resolves to`);
    ok(swept > 50, "the photo regression sweep covered nothing");
    console.log(`      ${swept} shipped headshots swept; none moved`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section("7 · nobody else moved");
// ─────────────────────────────────────────────────────────────────────────────
// THE TWO FILES WHOSE LETTERHEAD IS THE RECORD, ASKED THROUGH THE SAME SEAM.
// chew_h68 is 118 measures in the shipped static index and zero rows in the
// pattern index — the file whose letterhead rests entirely on the formalHasRecord
// veto this lane's door keeps. lee has roll calls. Both are re-asked AFTER a
// noteMember, because that is the frame lyman flipped on.
{
  for (const pid of ["chew_h68", "lee"]) {
    must(CMP[pid], `${pid} is no longer in cmp-data.js — a control subject is gone`);
  }
  const w = boot();
  must(w.__err.length === 0, `the control sandbox did not load: ${w.__err.join(" | ")}`);
  const A = w.PDXWordAction;
  const F = w.PDXConsistency.formalPatternIndex;

  ok(!A.saidLeadApplies("chew_h68", person(w, "chew_h68")),
    "chew_h68: the word-first letterhead fired over 118 measures in the shipped index");
  w.PDXVotingRecord.noteMember("chew_h68", [narrative(ISSUE)]);
  changed(w);
  ok(!A.saidLeadApplies("chew_h68", person(w, "chew_h68")),
    "chew_h68: the letterhead went word-first after a noteMember");
  ok(!A.saidEmptyLegal("chew_h68"),
    "chew_h68: the SAID door opened over the shipped static index — that veto is what keeps this letterhead");
  ok(!w.PDXProfileSpine.twoJobsWordFirst("chew_h68", person(w, "chew_h68")),
    "chew_h68: the two-jobs explainer went word-first over a real record");

  const rolls = [
    ballot("lands_local"), ballot("lands_local"), ballot("lands_local"),
    ballot("lands_local"), ballot("lands_local"), ballot("lands_local"),
    ballot("lands_local"), ballot("lands_local"),
  ];
  w.PDXVotingRecord.noteMember("lee", rolls);
  changed(w);
  must((F.shape("lee") || {}).read >= 1,
    "the seeded roll calls did not reach lee's pattern index — this control would pass for the wrong reason");
  ok(!A.saidNoTerm("lee"), "lee: saidNoTerm reads no formal term over eight roll calls");
  ok(!A.saidLeadApplies("lee", person(w, "lee")),
    "lee: the letterhead went word-first over eight roll calls");
  ok(!w.PDXProfileSpine.twoJobsWordFirst("lee", person(w, "lee")),
    "lee: the two-jobs explainer went word-first over eight roll calls");

  // AND THE REST OF THE EMPTY-LANE CLASS DID NOT MOVE EITHER. Pace and Larson are
  // named in the report as files that did NOT flip; Bishop is a third of the same
  // class, added because two controls cannot tell a fix from a coincidence. All
  // three are asked after the same noteMember lyman gets.
  for (const pid of ["grant_pace", "jackie_larson", "rob_bishop"]) {
    must(CMP[pid], `${pid} is no longer in cmp-data.js — a named control is gone`);
    w.PDXVotingRecord.noteMember(pid, [narrative(ISSUE)]);
    changed(w);
    ok(A.saidLeadApplies(pid, person(w, pid)),
      `${pid}: this class of file led with its words before the pass, and this pass flipped them`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section("8 · no second roster row, no invented act");
// ─────────────────────────────────────────────────────────────────────────────
{
  const w = boot();
  must(w.__err.length === 0, `the accounting sandbox did not load: ${w.__err.join(" | ")}`);
  const A = w.PDXWordAction;
  const F = w.PDXConsistency.formalPatternIndex;
  const before = Object.keys(w.CMP_DATA).length;

  w.PROFILES = w.PROFILES || {};
  w.PROFILES[PID] = Object.assign({}, w.CMP_DATA[PID], { bio: "…" });
  const payload = [narrative(ISSUE)];
  w.PDXVotingRecord.noteMember(PID, payload);
  changed(w);
  // The gate is asked through every accessor a warm repaint uses, because a
  // read that mints a row is a read that mints it at the seam.
  A.saidLeadApplies(PID, w.PROFILES[PID]);
  A.saidRowSet(PID, w.PROFILES[PID]);
  A.saidStanceId(PID, w.PROFILES[PID]);
  A.heroHtml(PID, w.PROFILES[PID]);
  w.PDXProfileSpine.twoJobsWordFirst(PID, w.PROFILES[PID]);

  eq(Object.keys(w.CMP_DATA).length, before, "the roster grew a row while the letterhead was rendered");
  eq(w.CMP_DATA[CARD_KEY], undefined, "a phil_lyman roster row was minted — one person, one roster row");
  eq(w.PROFILES[CARD_KEY], undefined, "a phil_lyman profile document was minted");

  eq((w.PDXVotingRecord.memberRecords(PID) || []).length, payload.length,
    "the payload gained or lost rows while the letterhead was rendered");
  eq((w.PDXVotingRecord.memberRecords(CARD_KEY) || []).length, 0,
    "member records were filed under the card key — the hop resolves CARDS, never a record");
  const sh = F.shape(PID) || {};
  eq(sh.judged || 0, 0, "an act was judged on a file with no act on it");
  eq(sh.characterised || 0, 0, "a record was characterised on a file with no act on it");
  // The brief says what it counted and counts nothing else: the rows it prints
  // are the cited cards, and there is no figure anywhere on it.
  const set = A.saidRowSet(PID, w.PROFILES[PID]);
  eq(set.cited, CITED, "the brief counts a number of cited cards the stance file does not hold");
  ok(set.rows.length === set.cited, "the brief drew a row it did not count");
  hasNot(A.heroHtml(PID, w.PROFILES[PID]), "%", "a percentage reached the warm letterhead");
}
{
  // AND THE GUARD THAT KEEPS IT THAT WAY IS NOT THIS FILE'S TO ADD. The roster
  // warm already refuses to mint a CMP_DATA record for a bridged key —
  // firebase-boot.js asks PDXRetiredPid before it files a lazy-full document
  // under a new id, which is the fix chew_h68 shipped with. phil_lyman rides that
  // same bridge, so the correct amount of new code for "do not create a second
  // roster row" is none, and what this pass owes is the PROOF: the bridge is
  // declared, the guard is still asked at the mint site, and both spellings
  // resolve to the one address.
  const ctx = {
    console, JSON, Object, String, Math, Date, Array, setTimeout() {},
    document: {
      createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }),
      addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
      getElementById: () => null, head: { appendChild() {} }, body: { appendChild() {} },
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener() {}, location: { href: "", pathname: "/", search: "" },
    navigator: { userAgent: "" },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  const c = vm.createContext(ctx);
  for (const f of ["cmp-data.js", "profile-evidence.js"]) {
    try { vm.runInContext(R(f), c, { filename: f }); }
    catch (e) { must(false, `${f} does not load for the bridge check: ${e.message}`); }
  }
  must(typeof ctx.PDXProfilePid === "function" && typeof ctx.PDXRetiredPid === "function",
    "PDXProfilePid / PDXRetiredPid are gone — the guard against a second roster row has no accessor");
  eq((ctx.PDX_PROFILE_ALIAS || {})[CARD_KEY], PID,
    "PDX_PROFILE_ALIAS no longer bridges phil_lyman to lyman — the two keys are two people again");
  eq(ctx.PDXProfilePid(CARD_KEY), PID, "phil_lyman does not resolve to the one address");
  eq(ctx.PDXProfilePid(PID), PID, "lyman no longer resolves to itself");
  eq(ctx.PDXRetiredPid(CARD_KEY), true, "phil_lyman is not read as a bridged key — the roster warm would mint a row for it");
  eq(ctx.PDXRetiredPid(PID), false, "lyman is read as a bridged key — its own document would be refused");

  // The guard, at the site that mints roster rows. Asserted against the source
  // because it is a branch no sandbox here can reach without a Firestore.
  const FB = R("firebase-boot.js");
  const mint = FB.slice(Math.max(0, FB.indexOf("_pdxMergeRosterRecord") - 1200),
                        FB.indexOf("_pdxMergeRosterRecord") + 1600);
  has(mint, "PDXRetiredPid",
    "firebase-boot.js no longer asks PDXRetiredPid where it files a roster record — a bridged key would open as its own file");
}

// ─────────────────────────────────────────────────────────────────────────────
// results
// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ lyman letterhead: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ lyman letterhead: ${passed} checks passed`);
