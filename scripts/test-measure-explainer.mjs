#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The measure explainer — what this bill/vote did, on one screen
// ─────────────────────────────────────────────────────────────────────────────
// A reader taps a measure in an issue dossier's Official Record column — Schultz
// Tough on Crime → H.B. 208 Criminal Trespass Amendments · 1 advanced — and gets
// a title and a direction chip. What they were asking is one question in three
// parts: what changed, why is it filed under THIS issue, and what did this person
// actually do. The facts to answer it were all already on the page, scattered
// across a roll-up row, a row face, an expanded body and a fold at the bottom,
// with no order and no labels.
//
// What is pinned here is the shape of the answer and the lines it may not cross:
//
//   · SIX SLOTS, ONE ORDER — identity (number + sitting + official title +
//     source), what the text did, why this issue, what this person did, how it
//     reached a vote, and that this row is outside Direction Match. Every one of
//     them read from a field that was already on the wire.
//   · A UTAH BILL HAS A SITTING. `congress` is null on every state roll call by
//     design and on every position of either government, so a state row printed a
//     bare "H.B. 208" — and bill numbers are reused every general session exactly
//     the way federal ones are reused every congress. The session code now travels
//     with the measure and prints as stored ("2023GS"), never prettified into
//     something a reader cannot search for.
//   · THE RATIONALE IS THE CURATOR'S AND IS NOT PARAPHRASED. Slot 2 prints the
//     mapping rationale, clipped on a sentence boundary, and says whose sentence
//     it is. Where no rationale is on file it prints an explicit gap and stops —
//     the one thing this screen may never do is read like a summary nobody wrote.
//   · A COMMITTEE VOTE IS A COMMITTEE VOTE. It routes through the shared act
//     layer, so it can never read "Voted Yea" — and it now states its direction,
//     which it could not before: a position's side lives in the `supports`
//     boolean, not in a Yea/Nay.
//   · NO SCORE, NO PARTY, NO INTENT. No slot prints a weight, a percentage or a
//     per-measure grade; "primary link" and "narrow link" stay words. The copy
//     bans are the menu vocabulary's own list plus the intent words.
//   · SPLIT STAYS SPLIT. Tapping the against measure and the for measure both
//     explain themselves and neither reconciles the other.
//
//   node scripts/test-measure-explainer.mjs
//
// Real shipped modules in a node:vm sandbox with a fake DOM, records seeded the
// way a completed /api/voting-record fetch leaves the cache — including the Utah
// shape, where the roll call carries no congress and the measure carries its own
// session code. No database, no network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Fake DOM ────────────────────────────────────────────────────────────────
const mkEl = () => {
  const cls = new Set();
  const el = {
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "",
    parentNode: null,
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      toggle() {}, contains: (c) => cls.has(c),
    },
    _classes: cls, _attrs: {},
    setAttribute(k, v) { el._attrs[k] = v; },
    getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    focus() {}, scrollIntoView() {},
    addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild(c) { if (c) c.parentNode = el; return c; },
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
    getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
ctx.window._pdxNavJump = () => {};
ctx.window._pdxRevealTarget = () => {};

// ── The roster ──────────────────────────────────────────────────────────────
// SCHULTZ is the acceptance case: a Utah Speaker with a stated position on Tough
// on Crime, so his rows are inside Direction Match. PATTERN has the same record
// and NO stated position anywhere, which is the pattern-only fixture — the sixth
// slot exists for exactly that member and must stay silent for the other one.
const SCHULTZ = "mschultz", PATTERN = "rep_pattern", CHEW = "rep_chew";
const CRIME = "tough_on_crime", WATER = "water_rights", PROP = "property_rights";
ctx.ISSUE_MAP = {
  tough_on_crime: { label: "Tough on Crime" },
  property_rights: { label: "Property Rights" },
  water_rights: { label: "Water Rights" },
};
ctx.ISSUE_STANCE_DATA = {
  [SCHULTZ]: [{ issueKey: CRIME, issueStance: "support" }],
  [CHEW]: [{ issueKey: WATER, issueStance: "support" }],
  // Nothing stated, anywhere. The whole point of this member.
  [PATTERN]: [],
};
ctx.PROFILES = {
  [SCHULTZ]: { name: "Mike Schultz", office: "Utah House of Representatives", state: "Utah", party: "R" },
  [PATTERN]: { name: "Dana Reyes", office: "Utah House of Representatives", state: "Utah", party: "D" },
  [CHEW]: { name: "Phil Chew", office: "Utah House of Representatives", state: "Utah", party: "R" },
};
ctx.CMP_DATA = { [SCHULTZ]: {}, [PATTERN]: {}, [CHEW]: {} };
ctx.window._getPhotoUrl = () => "";

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "voting-record.js", "exec-record.js", "pdx-learn.js", "consistency.js"]) {
  vm.runInContext(readFileSync(join(ROOT, file), "utf8"), sandbox, { filename: file });
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (s, sub, m) => ok(String(s).includes(sub), `${m} — missing ${JSON.stringify(sub)}`);
const hasnt = (s, sub, m) => ok(!String(s).includes(sub), `${m} — should not contain ${JSON.stringify(sub)}`);
const pcts = (s) => (String(s).match(/%/g) || []).length;
// Visible prose only — tags stripped, entities left alone. Some assertions are
// about what a reader is shown and would be answered wrongly by an attribute.
const text = (s) => String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
// One slot of the screen, so a claim about the clip is not answered by the fold.
const between = (s, a, b) => {
  const i = String(s).indexOf(a); if (i < 0) return "";
  const j = String(s).indexOf(b, i);
  return String(s).slice(i, j < 0 ? undefined : j);
};

// ── The five fixtures ───────────────────────────────────────────────────────
// Every one is the shape a completed fetch leaves in the cache. The Utah shape is
// the load-bearing detail: `congress` and `session` are null on the roll call —
// vr_rollcalls stores a year, not a congress, for a state vote — and the SITTING
// arrives on measureIdent, projected from the measure's own external_ids.
const UT2023 = { session: "2023GS", readFrom: "enrolled", readFromUrl: "https://le.utah.gov/~2023/bills/static/HB0208.html" };
const UT2025 = { session: "2025GS", readFrom: "substitute", readFromUrl: "https://le.utah.gov/~2025/bills/static/HB0451.html" };

// ① PRIMARY STANDALONE. H.B. 208, the acceptance case. Primary link on Tough on
//    Crime, a full curator rationale, a floor ballot, and a second key it is only
//    a supporting link on — so the explainer has to name that second key without
//    giving it a headline.
const HB208_RATIONALE =
  "The bill rewrites the criminal trespass statute so that entry onto posted " +
  "agricultural land is a class B misdemeanour on a first offence rather than an " +
  "infraction. Sections 3 and 4 add the posting requirements a landowner must meet " +
  "before the enhanced penalty applies. The mapping rests on the penalty change in " +
  "section 2, which is the operative provision. A fourth sentence exists only so " +
  "that the three-sentence clip has something to leave behind.";
const HB208 = {
  kind: "vote", rollcallId: 975, measureId: 208, number: "H.B. 208",
  date: "2023-02-27T00:00:00.000Z", chamber: "utah house",
  action: "On concurrence in amendments", position: "yea", isProcedural: false,
  title: "Criminal Trespass Amendments",
  congress: null, session: null, rollNumber: 975,
  measureIdent: UT2023,
  source: { url: "https://le.utah.gov/~2023/votes/hv0975.html", label: "Utah Legislature" },
  issues: [
    { issueKey: CRIME, weight: 60, isPrimary: true, supportMeaning: "yea_supports", rationale: HB208_RATIONALE },
    { issueKey: PROP, weight: 50, isPrimary: false, supportMeaning: "yea_supports", rationale: "The posting requirements in sections 3 and 4 are the property-rights link." },
  ],
};

// ② NARROW LINK. A wide public-safety bill this issue holds a thin slice of, and
//    NO rationale on the mapping — the "measures that only have a title" case the
//    gap sentence exists for.
const HB451 = {
  kind: "vote", rollcallId: 611, measureId: 451, number: "H.B. 451",
  date: "2025-03-04", chamber: "utah house",
  action: "On passage", position: "yea", isProcedural: false,
  title: "Public Safety Revisions",
  congress: null, session: null, rollNumber: 611,
  measureIdent: UT2025,
  source: { url: "https://le.utah.gov/~2025/votes/hv0611.html", label: "Utah Legislature" },
  issues: [
    { issueKey: PROP, weight: 90, isPrimary: true, supportMeaning: "yea_supports" },
    { issueKey: CRIME, weight: 30, isPrimary: false, supportMeaning: "yea_supports", rationale: null },
  ],
};

// ③ STOWAWAY. A base-budget bill carrying a corrections provision. Not primary,
//    thin, and multi-issue — which is exactly _rdIsProvision's predicate, so slot
//    5 has to disclose the vehicle without assigning anyone intent for it.
const SB1 = {
  kind: "vote", rollcallId: 220, measureId: 1, number: "S.B. 1",
  date: "2025-01-30", chamber: "utah house",
  action: "On passage", position: "yea", isProcedural: false,
  title: "Public Education Base Budget Appropriations",
  congress: null, session: null, rollNumber: 220,
  measureIdent: { session: "2025GS", readFrom: null, readFromUrl: null },
  source: { url: "https://le.utah.gov/~2025/votes/hv0220.html", label: "Utah Legislature" },
  issues: [
    { issueKey: PROP, weight: 95, isPrimary: true, supportMeaning: "yea_supports" },
    { issueKey: CRIME, weight: 20, isPrimary: false, supportMeaning: "yea_supports", rationale: "One line item funds county jail contracting." },
  ],
};

// ④ COMMITTEE VOTE. A vr_positions row, not a roll call: no ballot, no congress,
//    no session on the act itself, and its side lives in `supports`. It must read
//    "Committee vote" and it must state a direction.
const HB88 = {
  kind: "position", measureId: 88, number: "H.B. 88",
  date: "2025-02-11", chamber: "utah house",
  action: "committee_vote", actionType: "committee_vote", position: "committee_vote",
  supports: true, isProcedural: false,
  title: "Retail Theft Amendments",
  congress: null, session: null, rollNumber: null, rollcallId: null,
  measureIdent: { session: "2025GS", readFrom: "introduced", readFromUrl: "https://le.utah.gov/~2025/bills/static/HB0088.html" },
  source: { url: "https://le.utah.gov/asp/interim/Commit.asp?Year=2025&Com=HSTJUC", label: "Committee minutes" },
  issues: [
    { issueKey: CRIME, weight: 80, isPrimary: true, supportMeaning: "yea_supports", rationale: "The bill raises the aggregation threshold for retail theft charging." },
  ],
};

ctx.PDXVotingRecord._records[SCHULTZ] = [HB208, HB451, SB1, HB88];
// ⑤ PATTERN-ONLY. The same four instruments, on a member with no stated position
//    on anything. Identical record, different standing: on record, outside
//    Direction Match, and the explainer has to say so.
ctx.PDXVotingRecord._records[PATTERN] = [HB208, HB451, SB1, HB88];

// ── The split case ──────────────────────────────────────────────────────────
// One measure this member advanced on Water Rights and one they cut against.
// Neither explainer may reconcile the other into a single direction.
const WATER_FOR = {
  kind: "vote", rollcallId: 300, measureId: 700, number: "H.B. 300",
  date: "2025-02-05", chamber: "utah house",
  action: "On passage", position: "yea", isProcedural: false,
  title: "Water Efficiency Amendments",
  congress: null, session: null, rollNumber: 300,
  measureIdent: { session: "2025GS", readFrom: "enrolled", readFromUrl: "https://le.utah.gov/~2025/bills/static/HB0300.html" },
  source: { url: "https://le.utah.gov/~2025/votes/hv0300.html", label: "Utah Legislature" },
  issues: [{ issueKey: WATER, weight: 85, isPrimary: true, supportMeaning: "yea_supports", rationale: "The bill funds secondary metering, which is the operative provision." }],
};
const WATER_AGAINST = {
  kind: "vote", rollcallId: 301, measureId: 701, number: "H.B. 301",
  date: "2025-02-19", chamber: "utah house",
  action: "On passage", position: "yea", isProcedural: false,
  title: "Water Appropriation Modifications",
  congress: null, session: null, rollNumber: 301,
  measureIdent: { session: "2025GS", readFrom: "enrolled", readFromUrl: "https://le.utah.gov/~2025/bills/static/HB0301.html" },
  source: { url: "https://le.utah.gov/~2025/votes/hv0301.html", label: "Utah Legislature" },
  issues: [{ issueKey: WATER, weight: 85, isPrimary: true, supportMeaning: "yea_opposes", rationale: "The bill relaxes the forfeiture rule for unused rights, which cuts the other way." }],
};
ctx.PDXVotingRecord._records[CHEW] = [WATER_FOR, WATER_AGAINST];

const C = ctx.window.PDXConsistency;
const items = C.dossierItems(SCHULTZ, CRIME);
const at = (num) => items.findIndex((d) => d.ident === num);
const iHB208 = at("H.B. 208"), iHB451 = at("H.B. 451"), iSB1 = at("S.B. 1"), iHB88 = at("H.B. 88");
const X = (idx, pid, key) => C.dossierDetailHtml(pid || SCHULTZ, key || CRIME, idx);

console.log("── 1 · every fixture made it into the dossier");
ok(items.length === 4, `four instruments on Tough on Crime (got ${items.length})`);
for (const [n, i] of [["H.B. 208", iHB208], ["H.B. 451", iHB451], ["S.B. 1", iSB1], ["H.B. 88", iHB88]]) {
  ok(i >= 0, `${n} is listed as its own instrument`);
}

console.log("── 2 · slot 1: a Utah measure knows which session it belongs to");
const x208 = X(iHB208);
has(x208, "H.B. 208", "identity: the chamber-correct bill number leads");
has(x208, "2023GS", "identity: …with the session code beside it, printed as stored");
hasnt(x208, "2023 General Session", "identity: never prettified into a string nobody can search");
has(x208, "Criminal Trespass Amendments", "identity: and the official title");
has(x208, 'class="pdxdos-src"', "identity: the citable source is on the screen");
has(x208, "le.utah.gov/~2023/votes/hv0975.html", "identity: pointing at the roll call already on the row");
has(x208, 'rel="noopener"', "identity: safely");
has(x208, "le.utah.gov/~2023/bills/static/HB0208.html", "identity: and the bill text the mapping was read against");
has(x208, "the enrolled text", "identity: named, so the rationale is a claim about a version");
eq(items[iHB208].session, "2023GS", "data: the session rides on the item, not just in the markup");
eq(items[iHB208].congress, "", "data: …and it did NOT come from a congress, because a Utah roll call has none");
// The federal half is untouched: an ordinal congress still wins its own slot.
eq(
  C.dossierItems(SCHULTZ, CRIME).every((d) => !d.congress),
  true,
  "data: no Utah row invents a congress for itself"
);

console.log("── 3 · slot 2: the curator's sentences, or an explicit gap");
has(x208, "What the text did", "did: the slot is labelled");
has(x208, "rewrites the criminal trespass statute", "did: from the mapping rationale on file");
// The clip is a claim about the SLOT, so it is read from the slot. Asserting it
// against the whole screen would be wrong in the other direction: the paragraph
// in full is supposed to be down in the fold, and is checked for there below.
const slot2 = between(x208, "What the text did", "Why it is on this issue");
has(slot2, "The mapping rests on the penalty change", "did: three sentences of it");
hasnt(slot2, "three-sentence clip has something to leave behind", "did: and only three — clipped on a sentence boundary, not mid-word");
has(x208, "curator", "did: and it says whose sentence this is");
has(x208, 'class="pdxdos-fine"', "did: the paragraph in full stays one fold deeper");
has(x208, "three-sentence clip has something to leave behind", "did: …where the clipped remainder actually is");
// The gap case — a measure with a title, an act, a source and no written account.
const x451 = X(iHB451);
has(x451, 'data-pdxdos-gap="did"', "gap: a measure with only a title says so in the markup");
has(x451, "No curator has written what this text did yet", "gap: in words, out loud");
has(x451, "nothing here is generated to stand in for it", "gap: and refuses to fill the space");
has(x451, "Public Safety Revisions", "gap: while still naming the measure it cannot explain");
hasnt(x451, 'class="pdxdos-fine"', "gap: with no fold, because there is no rationale to fold");

console.log("── 4 · slot 3: how squarely, in words, and the other key by name");
has(x208, "Why it is on this issue", "why: the slot is labelled");
has(x208, "primary link", "why: H.B. 208 is what the bill was about");
has(x208, "Property Rights", "why: the second key is named…");
has(x208, "a supporting link there", "why: …as a supporting link on that issue, not a second headline");
has(x208, "this screen answers for Tough on Crime only", "why: one instrument, one issue, one screen");
has(x451, "narrow link", "why: a thin mapping is called a narrow link");
has(x451, "supporting link", "why: and a non-primary one supporting");
eq(pcts(x208), 0, "why: no percentage anywhere on the primary explainer");
eq(pcts(x451), 0, "why: nor on the narrow one");
eq(pcts(X(iSB1)), 0, "why: nor on the stowaway");
eq(pcts(X(iHB88)), 0, "why: nor on the committee vote");
for (const [n, h] of [["208", x208], ["451", x451], ["S.B. 1", X(iSB1)], ["H.B. 88", X(iHB88)]]) {
  hasnt(h, "weight", `why (${n}): the curator's weight is never printed as a number`);
}

console.log("── 5 · slot 4: the act, the day, the direction on this key");
has(x208, "What this person did", "act: the slot is labelled");
has(x208, "On concurrence in amendments", "act: the question that was actually on the floor");
has(x208, "They voted Yea", "act: and the ballot they cast on it");
has(x208, "on 2023-02-27", "act: on the day it happened");
// Read from the visible prose, not the markup: the vote-key button carries the
// exact wire timestamp on purpose — it is how the row addresses one specific vote
// — and prettifying THAT would break the lookup. What a reader sees is the day.
hasnt(text(x208), "2023-02-27T00:00:00.000Z", "act: a reader is shown the day, not the wire's timestamp");
hasnt(text(x208), "T00:00:00", "act: no stray wire time anywhere in the prose");
has(x208, "advancing", "act: which the mapping reads as advancing this issue");
has(x208, "Tough on Crime", "act: named");

console.log("── 6 · a committee vote is a committee vote, and it has a side");
const x88 = X(iHB88);
has(x88, "Committee vote", "committee: the shared act layer's own label");
hasnt(x88, "Voted Yea", "committee: and never a ballot verb — there was no ballot");
hasnt(x88, "Voted Nay", "committee: nor the other one");
hasnt(x88, "The question on the floor", "committee: a committee is not the floor");
has(x88, "on 2025-02-11", "committee: dated");
has(x88, "advancing", "committee: with the direction its `supports` boolean carries…");
// …and the boolean is genuinely what is being read: flip the mapping's meaning
// and the same true-valued position has to come out the other way, with the
// ballot vocabulary still absent.
const flipped = { ...HB88, issues: [{ ...HB88.issues[0], supportMeaning: "yea_opposes" }] };
ctx.PDXVotingRecord._records[CHEW] = [flipped];
const fItems = C.dossierItems(CHEW, CRIME);
const xFlip = C.dossierDetailHtml(CHEW, CRIME, fItems.findIndex((d) => d.ident === "H.B. 88"));
has(xFlip, "cutting against", "committee: a mapping that reads Yea as opposing flips the direction…");
has(xFlip, "Committee vote", "committee: …and it is still a committee vote, not a ballot");
ctx.PDXVotingRecord._records[CHEW] = [WATER_FOR, WATER_AGAINST];
has(x88, "2025GS", "committee: and a session, which a position has no roll call to carry");
has(x88, "Committee minutes", "committee: sourced to the minutes it came from");

console.log("── 7 · slot 5: how it reached a vote, in the locked vocabulary");
const xSB1 = X(iSB1);
has(xSB1, "How it reached a vote", "process: the slot is labelled");
has(xSB1, "data-pdxdos-proc", "process: and marked in the markup");
has(xSB1, "This issue rode inside it as a provision", "process: the vehicle disclosure, in the shipped words");
has(xSB1, "Public Education Base Budget Appropriations", "process: naming the package it rode in");
hasnt(x208, "data-pdxdos-proc", "process: silent on a clean standalone measure");
hasnt(x208, "rode inside it as a provision", "process: which H.B. 208 is");
// The intent bans, on every explainer this suite renders. The list is the menu
// vocabulary's own, kept in one place so a copy edit meets the rule in the same
// screen — plus the two words the brief names.
const BANNED = [
  "snuck", "sneak", "courage", "courageous", "cowardly", "brave",
  "blocked", "dodged", "ducked", "stonewall", "obstruct", "buried", "shelved",
  "failed to act", "failed to vote", "avoided a vote", "denied a vote",
  "republican", "democrat", "democratic", "gop", "partisan",
  "party loyalty", "party line", "party leadership", "majority leader",
  "minority leader", "the speaker", "leadership decided", "loyalty",
];
const ALL = [x208, x451, xSB1, x88].join("\n").toLowerCase();
for (const w of BANNED) hasnt(ALL, w, `copy ban: "${w}" appears nowhere in an explainer`);
// _menuScan is the shipped scanner for the same list. Running the assembled copy
// through it means a future addition to the ban list covers this surface too.
if (typeof ctx.window._pdxMenuScan === "function") {
  eq(ctx.window._pdxMenuScan(ALL).length, 0, "copy ban: the shipped menu scanner finds nothing either");
}

console.log("── 8 · slot 6: pattern-only says it is outside Direction Match");
const pItems = C.dossierItems(PATTERN, CRIME);
const p208 = C.dossierDetailHtml(PATTERN, CRIME, pItems.findIndex((d) => d.ident === "H.B. 208"));
has(p208, 'data-pdxdos-led="1"', "pattern-only: the row is marked as outside the score");
has(p208, "not in Direction Match", "pattern-only: in the shared ledger words");
has(p208, "no stated position to test", "pattern-only: and says why");
has(p208, "not a score", "pattern-only: so the direction beside it cannot be read as one");
has(p208, "advancing", "pattern-only: the mapped direction is still stated…");
hasnt(x208, 'data-pdxdos-led="1"', "…and a member WITH a stated position gets no such line");
// The same record, both members: nothing about the measure changed, only the
// standing of the comparison.
has(p208, "rewrites the criminal trespass statute", "pattern-only: same measure, same curator sentence");
has(p208, "2023GS", "pattern-only: same session");

console.log("── 9 · the roll-up row is the door, and it is a safe one");
// The Official Record roll-up is what a reader actually taps. Rendering it for
// the four-instrument issue: every measure line carries the door, addressed to a
// real index in the list below it, and nothing interactive is nested inside.
const sheet = C.dossierDriversHtml(SCHULTZ, CRIME);
const drvRows = (sheet.match(/data-pdxdrv-open="(\d+)"/g) || []);
ok(drvRows.length >= 3, `door: every measure in the roll-up is a door (got ${drvRows.length})`);
has(sheet, 'role="button"', "door: reachable without a nested <button>");
has(sheet, 'tabindex="0"', "door: and reachable from a keyboard");
has(sheet, "data-pdxdrv-pid", "door: addressed to a member…");
has(sheet, "data-pdxdrv-key", "door: …and an issue, so it cannot open the wrong sheet");
// The invariant scripts/test-row-tap-dossier.mjs pins for the stance rows, pinned
// again here for the roll-up: an interactive element inside another makes the HTML
// parser close the outer one early, which drops every span after it out of the row.
const doorLis = sheet.match(/<li class="pdxgap-drv-r[^>]*>[\s\S]*?<\/li>/g) || [];
ok(doorLis.length >= 3, `door: the roll-up rows are <li>s (got ${doorLis.length})`);
for (const li of doorLis) {
  hasnt(li, "<button", "door: no <button> nested inside a role=button row");
  hasnt(li, "<a ", "door: no <a> either");
  ok(/^<li class="pdxgap-drv-r[^"]*"[^>]*data-pdxdrv-open=/.test(li),
    "door: the door attribute sits on the row's OUTERMOST element");
}
// Every index a door advertises resolves to an explainer that names that measure.
for (const m of drvRows) {
  const i = Number(m.match(/"(\d+)"/)[1]);
  const body = X(i);
  ok(!!body, `door: index ${i} opens a real explainer`);
  ok(String(body).includes(items[i].ident), `door: …and it is ${items[i].ident}'s own screen`);
}

console.log("── 10 · a split record explains both sides and reconciles neither");
const cItems = C.dossierItems(CHEW, WATER);
const iFor = cItems.findIndex((d) => d.ident === "H.B. 300");
const iAgainst = cItems.findIndex((d) => d.ident === "H.B. 301");
ok(iFor >= 0 && iAgainst >= 0, "split: both measures are listed");
const xFor = X(iFor, CHEW, WATER), xAgainst = X(iAgainst, CHEW, WATER);
has(xFor, "Water Efficiency Amendments", "split: the for-measure explains itself");
has(xFor, "funds secondary metering", "split: with its own rationale");
has(xFor, "advancing", "split: and its own direction");
has(xAgainst, "Water Appropriation Modifications", "split: the against-measure explains itself");
has(xAgainst, "relaxes the forfeiture rule", "split: with its own rationale");
has(xAgainst, "cutting against", "split: and the opposite direction");
hasnt(xFor, "Water Appropriation Modifications", "split: neither screen argues with the other…");
hasnt(xAgainst, "Water Efficiency Amendments", "split: …in either direction");
eq(pcts(xFor) + pcts(xAgainst), 0, "split: and no number appears to resolve it");

console.log("── 11 · the six slots arrive in the reader's order");
const order = ["H.B. 208", "What the text did", "Why it is on this issue", "What this person did"];
let cursor = -1, ordered = true;
for (const s of order) {
  const at2 = x208.indexOf(s);
  if (at2 <= cursor) ordered = false;
  cursor = at2;
}
ok(ordered, `order: identity → what the text did → why this issue → what they did (${order.join(" → ")})`);
ok(x208.indexOf("pdxdos-src") < x208.indexOf("pdxdos-fine"),
  "order: the source a reader checks the claims against comes before the fold");
ok(xSB1.indexOf("How it reached a vote") > xSB1.indexOf("What this person did"),
  "order: process honesty sits after the act it is context for");
ok(p208.indexOf('data-pdxdos-led="1"') > p208.indexOf("What this person did"),
  "order: and the Direction Match note is last of the six");

console.log("── 12 · nothing here invented a nav, a score or a second surface");
hasnt(sheet, "data-pdxc-open", "no new top-level nav: the door opens a row on this sheet");
// The word "score" does appear on this screen — inside the shipped disclosure
// that says there is NO combined score for the document. That sentence is the
// rule, not a breach of it. What is banned is a score of this measure: a number,
// a denominator, or a phrase that grades the bill.
for (const [n, h] of [["208", x208], ["451", x451], ["S.B. 1", xSB1], ["88", x88]]) {
  hasnt(h, "out of 100", `no score (${n}): no denominator`);
  hasnt(h.toLowerCase(), "measure score", `no score (${n}): no per-measure score`);
  hasnt(h.toLowerCase(), "score of", `no score (${n}): nothing is scored "of" anything`);
  hasnt(h.toLowerCase(), "scores ", `no score (${n}): and nothing scores`);
  for (const m of String(h).match(/[^.>]*score[^.<]*/gi) || []) {
    ok(/\bno\b|\bnot\b|separately on each issue/i.test(m),
      `no score (${n}): every mention of a score denies one — ${JSON.stringify(m.trim().slice(0, 70))}`);
  }
}

console.log("── 13 · the federal half of the same screen, with nothing borrowed");
// The same six slots on a congressional row. Its sitting comes from `congress`, as
// it always has; what is new is that the official title and the bill page — both
// already on file from the GPO identity backfill — now reach the screen. And the
// two governments' vocabularies stay on their own rows: a Utah bill never prints an
// ordinal congress, a federal bill never prints a general-session code.
const HJRES = {
  kind: "vote", rollcallId: 4100, measureId: 4100, number: "H.J.Res. 131",
  date: "2025-05-21", chamber: "house",
  action: "On passage", position: "nay", isProcedural: false,
  title: "California waiver resolution",
  congress: 119, session: 1, rollNumber: 131,
  measureIdent: {
    session: null, readFrom: null, readFromUrl: null,
    officialTitle: "Providing for congressional disapproval under chapter 8 of title 5, " +
      "United States Code, of the rule submitted by the Environmental Protection Agency " +
      "relating to a waiver of preemption for California's Advanced Clean Cars II program.",
    billUrl: "https://www.congress.gov/bill/119th-congress/house-joint-resolution/131",
  },
  source: { url: "https://clerk.house.gov/Votes/2025131", label: "Clerk of the House" },
  issues: [{ issueKey: CRIME, weight: 55, isPrimary: true, supportMeaning: "yea_opposes", rationale: "The resolution is read on this issue only for its enforcement provisions." }],
};
ctx.PDXVotingRecord._records[PATTERN] = [HJRES];
const fedItems = C.dossierItems(PATTERN, CRIME);
const xFed = C.dossierDetailHtml(PATTERN, CRIME, fedItems.findIndex((d) => d.ident === "H.J.Res. 131"));
has(xFed, "H.J.Res. 131", "federal: the chamber-correct number");
has(xFed, "119th", "federal: with the congress as its sitting, from the field that has always carried it");
hasnt(xFed, "GS", "federal: and no general-session code, which it has none of");
has(xFed, "Official title", "federal: the official title is labelled…");
has(xFed, "congressional disapproval under chapter 8 of title 5", "federal: …and printed as the GPO prints it");
has(xFed, "California waiver resolution", "federal: alongside the name people use for it");
has(xFed, "The bill ↗", "federal: the bill page is reachable, separately from the roll call");
has(xFed, "congress.gov/bill/119th-congress/house-joint-resolution/131", "federal: pointing at congress.gov");
has(xFed, "clerk.house.gov/Votes/2025131", "federal: while the source link still points at the vote");
hasnt(xFed, "Mapping read from", "federal: and no version claim, because nothing on file records one");
eq(pcts(xFed), 0, "federal: no percentage here either");
// …and the reverse leak. A Utah measure has no ordinal congress and no GPO title,
// so neither may appear on its screen.
for (const [n, h] of [["208", x208], ["451", x451], ["S.B. 1", xSB1], ["88", x88]]) {
  hasnt(h, "119th", `no borrowed glossary (${n}): a Utah bill has no ordinal congress`);
  hasnt(h, "Official title", `no borrowed glossary (${n}): nor a GPO official title`);
  hasnt(h, "congress.gov", `no borrowed glossary (${n}): nor a congress.gov citation`);
}
ctx.PDXVotingRecord._records[PATTERN] = [HB208, HB451, SB1, HB88];

if (failures.length) {
  console.error(`\n✗ measure explainer: ${failures.length} of ${passed + failures.length} assertions failed\n`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(
  `\n✓ measure explainer: all ${passed} assertions passed — six slots, one order, ` +
  `five fixtures (primary · narrow · stowaway · committee vote · pattern-only)`
);
console.log(
  `  🏛️ ${items.length} Utah instrument(s) on ${ctx.ISSUE_MAP[CRIME].label} · ` +
  `${drvRows.length} roll-up door(s) · split record kept split`
);
