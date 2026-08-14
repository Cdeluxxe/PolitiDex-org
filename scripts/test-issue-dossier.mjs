#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The issue dossier — one issue, one assembled place, four levels
// ─────────────────────────────────────────────────────────────────────────────
// Tapping a stance row's issue name now opens the per-issue sheet as a full
// dossier: everything PolitiDex knows about this politician on this issue, in one
// panel, revealed a level at a time. The rules that make that honest rather than
// merely dense are the ones pinned here.
//
//   · L1 is the ASSEMBLED ANSWER and nothing else is open. It reprints the row
//     model's single verdict, names the lane that produced it, states the coverage
//     caveat and says where the issue lands in the profile's pooled score — and it
//     prints NO percentage, because the sheet's one number lives in the header and
//     a second copy of it reads as a second score.
//   · L2 is an ENUMERATION, not L1 again: every instrument on this issue, one row
//     each, collapsed, with the count readable without opening anything.
//   · L3 is MECHANISM, and it does not exist in the document until a reader asks
//     for it — the row bodies ship empty and are filled on first open.
//   · L4 is PROVENANCE: the curation rationale, nested one level further in.
//   · The two lanes are NOT symmetrical. An executive document carries a standing,
//     a curated per-issue sentence and a rationale; a roll call carries its
//     question, its ballot and its source. The congressional rows are reported
//     thin and the sheet says so, rather than padding them to match.
//   · A member's votes arrive after the profile does, so a cold dossier says
//     "Loading the record…" instead of "no record".
//
//   node scripts/test-issue-dossier.mjs
//
// Loads stance-helpers.js + voting-record.js + exec-record.js + pdx-learn.js +
// consistency.js into one node:vm sandbox with a fake DOM, seeds both lanes'
// caches directly (no fetch) and renders the real HTML. No database, no network,
// no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Fake DOM ────────────────────────────────────────────────────────────────
// Same shape as the gap-sheet harness: real enough for _ensureGapSheet, with a
// getElementById the tests can drive so the return-path behaviour can actually be
// exercised rather than only read off the source.
const byId = new Map();
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
    setAttribute(k, v) { el._attrs[k] = v; }, getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
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
const jumped = [];
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
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
ctx.window._pdxNavJump = (t) => jumped.push(t);
ctx.window._pdxRevealTarget = () => {};

// ── Roster: one member (🏛️ lane) and one president (✒️ lane) ────────────────
const MEMBER = "rep_dossier", COLD = "rep_cold", PREZ = "trump";
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
ctx.ISSUE_STANCE_DATA = { [MEMBER]: stances, [COLD]: stances, [PREZ]: stances };
ctx.PROFILES = {
  [MEMBER]: { name: "Marta Solano", office: "U.S. Representative", district: "ID-02", state: "Idaho", party: "R" },
  [COLD]: { name: "Lee Park", office: "U.S. Representative", state: "Ohio", party: "D" },
  [PREZ]: { name: "The President", office: "President of the United States", party: "R" },
};
ctx.CMP_DATA = { [MEMBER]: {}, [COLD]: {}, [PREZ]: {} };
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

// ── Seeds: the 🏛️ lane ──────────────────────────────────────────────────────
// One multi-issue bill and one single-issue bill, seeded the way a completed fetch
// leaves the cache. Both map lower_taxes, so the dossier for that issue must list
// two instruments — which is the whole point of L2: the panel above it quotes at
// most the two decisive ones.
const HR1 = {
  kind: "vote", rollcallId: 11, measureId: 101, number: "H.R. 1", date: "2025-07-03",
  action: "On Passage", position: "yea", isProcedural: false,
  title: "One Big Beautiful Bill Act",
  source: { url: "https://www.congress.gov/roll-call-vote/11", label: "Congress.gov" },
  issues: [
    { issueKey: ISSUE, weight: 100, isPrimary: true, supportMeaning: "yea_supports" },
    { issueKey: "healthcare", weight: 60, isPrimary: false, supportMeaning: "yea_opposes" },
    { issueKey: "border_security", weight: 40, isPrimary: false, supportMeaning: "yea_supports" },
  ],
};
const HR9 = {
  kind: "vote", rollcallId: 9, measureId: 109, number: "H.R. 9", date: "2025-03-11",
  action: "On Passage", position: "nay", isProcedural: false,
  title: "Taxpayer Relief Act",
  source: { url: "https://www.congress.gov/roll-call-vote/9", label: "Congress.gov" },
  issues: [{ issueKey: ISSUE, weight: 90, isPrimary: true, supportMeaning: "yea_supports" }],
};
ctx.PDXVotingRecord._records[MEMBER] = [HR1, HR9];

// ── Seeds: the ✒️ lane ──────────────────────────────────────────────────────
// An order that advances the issue and is in force; a signed law that also touches
// two other issues on a narrow link and carries a curation rationale (L4's only
// content); and one document with NO citable standing, which the lane must hold
// back from the score and the dossier must still list, with its reason.
const SRC = "https://www.federalregister.gov/documents/2025/1";
const inForce = [{ status: "in_force", effectiveAt: "2025-02-01", sourceUrl: SRC, sourceLabel: "Federal Register" }];
ctx.EXEC_ACTIONS = {
  trump: [
    {
      actionClass: "executive_order", term: "47", documentId: "EO 14001",
      title: "Order on Federal Tax Withholding", actedAt: "2025-01-30",
      sourceUrl: SRC, sourceLabel: "Federal Register", status: inForce,
      issues: [{
        issueKey: ISSUE, direction: "advances", weight: 100, isPrimary: true,
        plain: "The order lowered federal withholding rates for the current year.",
        rationale: "Section 3(b) directs Treasury to revise the withholding tables, which is the operative provision this mapping rests on.",
      }],
    },
    {
      actionClass: "signed_law", term: "47", documentId: "Pub. L. 119-2",
      title: "Broad Reconciliation Act", actedAt: "2025-04-12",
      sourceUrl: SRC, sourceLabel: "Federal Register", status: inForce,
      issues: [
        { issueKey: ISSUE, direction: "advances", weight: 20, isPrimary: false, plain: "One title of the act trimmed a bracket." },
        { issueKey: "healthcare", direction: "opposes", weight: 70, isPrimary: true },
        { issueKey: "border_security", direction: "advances", weight: 50, isPrimary: false },
      ],
    },
    {
      actionClass: "directive", term: "47", documentId: "Memo 9",
      title: "Directive With No Confirmed Standing", actedAt: "2025-05-05",
      sourceUrl: SRC, sourceLabel: "Federal Register", status: [],
      issues: [{ issueKey: ISSUE, direction: "advances", weight: 100, isPrimary: true }],
    },
  ],
};

const C = ctx.window.PDXConsistency;

// ── 0. The dossier is reachable as its own pieces ───────────────────────────
for (const fn of ["dossierItems", "dossierSummaryHtml", "dossierRecordsHtml", "dossierDetailHtml", "dossierStepHtml"]) {
  ok(typeof C[fn] === "function", `api: ${fn} is exported so each level can be checked on its own terms`);
}

// ── 1. L2's data: one entry per instrument, both lanes ──────────────────────
const mItems = C.dossierItems(MEMBER, ISSUE);
ok(mItems.length >= 2, `L2 data: the member's two bills on this issue are both listed (got ${mItems.length})`);
ok(mItems.every((d) => d.lane === "record"), "L2 data: a member's instruments are all on the 🏛️ lane");
const idents = mItems.map((d) => d.ident);
ok(idents.includes("H.R. 1") && idents.includes("H.R. 9"),
  `L2 data: each bill is named by its number (got ${JSON.stringify(idents)})`);
ok(mItems.some((d) => d.multi), "L2 data: the multi-issue bill is flagged as one");
ok(mItems.every((d) => !!d.url), "L2 data: every congressional row keeps its source");
ok(mItems.every((d) => d.standing === null && !d.plain),
  "L2 data: a roll call carries no standing and no curated sentence — and none is invented");

const xItems = C.dossierItems(PREZ, ISSUE);
eq(xItems.length, 3, "L2 data: all three executive documents on this issue are listed");
const scored = xItems.filter((d) => !d.held), heldItems = xItems.filter((d) => d.held);
eq(scored.length, 2, "L2 data: two of them are scorable");
eq(heldItems.length, 1, "L2 data: and the one with no citable standing is listed, not dropped");
eq(heldItems[0].held, "no_standing", "L2 data: with the reason the lane actually held it for");
ok(heldItems[0].heldWhy.length > 40, "L2 data: and that reason is a sentence, not a code");
ok(scored.every((d) => d.standing && d.standing.label), "L2 data: every scored executive item carries its standing");
const eo = scored.find((d) => d.ident === "EO 14001");
const law = scored.find((d) => d.ident === "Pub. L. 119-2");
ok(eo && law, "L2 data: both documents are named by their document id");
eq(eo.effect, "advances", "L2 data: direction on THIS issue comes off the mapping");
eq(eo.primary, true, "L2 data: the order is this issue's primary link");
eq(eo.narrow, false, "L2 data: at full weight it is not a narrow link");
eq(law.primary, false, "L2 data: the omnibus law is a supporting link here");
eq(law.narrow, true, "L2 data: and at weight 20 it is a narrow one");
ok(eo.plain.length > 0, "L2 data: the ✒️ lane's curated per-issue sentence is carried");

// ── 2. L1 — the assembled answer, and the only level open ──────────────────
const l1 = C.dossierSummaryHtml(MEMBER, ISSUE);
has(l1, 'class="pdxdos"', "L1: renders as the dossier summary block");
has(l1, ">They said<", "L1: leads with what they said");
has(l1, ">The record<", "L1: then what the record concluded");
has(l1, 'class="pdxdos-lane"', "L1: and names the lane that decided it");
has(l1, "Decided by the formal record", "L1: which for a member with votes is the formal record");
has(l1, "judged", "L1: with the depth behind that decision");
has(l1, 'class="pdxdos-score"', "L1: and says where this issue lands in the profile score");
has(l1, "pooled", "L1: naming the profile's headline as the POOLED figure, not this issue");
eq(pcts(l1), 0, "L1: prints no percentage — the sheet has exactly one number and it is in the header");
hasnt(l1, "pdxdos-recs", "L1: the record list is a separate level, not nested inside the summary");
// The jump into ⚖️ Word vs Action is offered only when that section is actually on
// the page. A shared #record= arrival has no profile behind it.
hasnt(l1, 'data-pdxst-go="wa"',
  "L1: with no profile mounted, the score jump is withheld rather than pointing at nothing");
byId.set("pdxsec-wordaction", mkEl());
has(C.dossierSummaryHtml(MEMBER, ISSUE), 'data-pdxst-go="wa"',
  "L1: and offered the moment that section exists");
byId.delete("pdxsec-wordaction");

const xl1 = C.dossierSummaryHtml(PREZ, ISSUE);
has(xl1, "Decided by the formal record", "L1: the ✒️ lane is a formal record too");
has(xl1, "action", "L1: counted in actions, because a president casts no votes");
hasnt(xl1, "judged votes", "L1: and never in votes");
eq(pcts(xl1), 0, "L1: no percentage on the executive lane either");

// ── 3. L2 — the enumeration, collapsed, with its count readable closed ──────
const recs = C.dossierRecordsHtml(MEMBER, ISSUE);
has(recs, '<details class="pdxdos-recs">', "L2: the group is a <details>…");
hasnt(recs, '<details class="pdxdos-recs" open', "L2: …and it is closed by default");
has(recs, "on this issue", "L2: the summary says how many instruments are behind the issue");
has(recs, "votes on this issue", "L2: in the member lane's noun");
has(recs, '<details class="pdxdos-rec" data-pdxdos-i="0"', "L2: one row per instrument, indexed");
has(recs, "H.R. 1", "L2: naming the bill");
has(recs, "H.R. 9", "L2: including the one the panel above never quotes");
has(recs, 'class="pdxdos-rec-vd"', "L2: each row carries its own verdict");
has(recs, "🧩 3 issues", "L2: and flags a multi-issue instrument as one");
eq(pcts(recs), 0, "L2: still no percentage — a per-item weight printed as a number reads as a second score");
// The lane asymmetry, stated rather than papered over.
has(recs, 'class="pdxdos-note"', "L2: the 🏛️ lane says outright that its rows are thinner");
has(recs, "nothing has been added to make them look the same",
  "L2: refusing to pad a roll call up to executive depth, in as many words");

// ── 4. Laziness — L3 does not exist until it is asked for ──────────────────
has(recs, 'data-pdxdos-body="1"></div>', "L3: every row body ships EMPTY");
eq((recs.match(/data-pdxdos-body="1"><\/div>/g) || []).length,
  (recs.match(/data-pdxdos-i="/g) || []).length,
  "L3: every single row's body is empty, not just the first");
hasnt(recs, "pdxdos-src", "L3: no source block is rendered until a row is opened");
hasnt(recs, "pdxgap-om", "L3: nor the related-issues block");
hasnt(recs, "pdxdos-fine", "L4: nor the rationale");
// Every row carries what the click handler needs to build its own body later.
has(recs, 'data-pdxdos-pid="' + MEMBER + '"', "L3: each row knows whose record it belongs to");
has(recs, 'data-pdxdos-key="' + ISSUE + '"', "L3: and which issue, so the body is rebuilt statelessly");

// ── 5. L3 — mechanism, on demand, in each lane's own terms ─────────────────
const mIdx = mItems.findIndex((d) => d.ident === "H.R. 1");
const mDetail = C.dossierDetailHtml(MEMBER, ISSUE, mIdx);
has(mDetail, "The question on the floor", "L3 🏛️: a roll call's mechanism IS its question");
has(mDetail, "On Passage", "L3 🏛️: named");
has(mDetail, "primary link", "L3 🏛️: how much of the bill this issue's link rests on, in words");
has(mDetail, 'class="pdxdos-src"', "L3 🏛️: the primary source is always offered");
has(mDetail, "congress.gov", "L3 🏛️: pointing at the roll call itself");
has(mDetail, 'rel="noopener"', "L3 🏛️: safely");
has(mDetail, "pdxgap-om", "L3 🏛️: and what else the same instrument touched");
has(mDetail, "one vote, 3 issues", "L3 🏛️: in the congressional lane's noun");
has(mDetail, "Health Care", "L3 🏛️: naming the sibling issues");
eq(pcts(mDetail), 0, "L3 🏛️: no percentage");
hasnt(mDetail, "pdxdos-fine", "L4 🏛️: a roll call has no curation rationale, and none is manufactured");

const xIdx = xItems.findIndex((d) => d.ident === "EO 14001");
const xDetail = C.dossierDetailHtml(PREZ, ISSUE, xIdx);
has(xDetail, "Signed Executive Order", "L3 ✒️: an executive document's mechanism is the power used");
has(xDetail, "on its own authority", "L3 ✒️: and whether that power was the office's alone");
has(xDetail, "Where it stands today", "L3 ✒️: standing is stated");
has(xDetail, "In force", "L3 ✒️: with the lane's own standing label");
has(xDetail, "advances", "L3 ✒️: alongside which way the document cut on THIS issue");
has(xDetail, "withholding", "L3 ✒️: and the curated sentence explaining why it counts here");
has(xDetail, 'class="pdxdos-fine"', "L4 ✒️: the rationale is one level further in…");
has(xDetail, "Section 3(b)", "L4 ✒️: …and it is the receipt, quoted");
ok(xDetail.indexOf("pdxdos-src") < xDetail.indexOf("pdxdos-fine"),
  "L4 ✒️: nested BELOW the source, so the deepest level is the last thing reached");
eq(pcts(xDetail), 0, "L3 ✒️: no percentage");

const lawIdx = xItems.findIndex((d) => d.ident === "Pub. L. 119-2");
const lawDetail = C.dossierDetailHtml(PREZ, ISSUE, lawIdx);
has(lawDetail, "narrow link", "L3 ✒️: a thin mapping is called a narrow link, the ✒️ section's own word");
has(lawDetail, "supporting link", "L3 ✒️: and a non-primary mapping is called supporting");
has(lawDetail, "one law, 3 issues", "L3 ✒️: the multi-issue block speaks of laws, never of votes");
hasnt(lawDetail, "one vote", "L3 ✒️: a signature is not a vote, and the copy never says it is");
const heldIdx = xItems.findIndex((d) => d.held);
const heldDetail = C.dossierDetailHtml(PREZ, ISSUE, heldIdx);
has(heldDetail, "where this stands today is not verified", "L3 ✒️: a held document explains what disqualified it");
has(heldDetail, 'class="pdxdos-src"', "L3 ✒️: and still links its source — held is not hidden");
// Out of range fails closed rather than throwing at a reader.
eq(C.dossierDetailHtml(MEMBER, ISSUE, 99), "", "L3: an index that no longer exists renders nothing");

// ── 6. Cold state — a member whose votes have not landed yet ───────────────
const cold = C.dossierRecordsHtml(COLD, ISSUE);
has(cold, "Loading the record", "cold: a pre-warm dossier says the record is still arriving…");
hasnt(cold, "No qualifying", "cold: …and never that there is none");
has(cold, 'class="pdxdos-empty"', "cold: as an honest empty state rather than an empty list");
eq(pcts(cold), 0, "cold: with no number attached to it");

// ── 7. The stance row's primary tap ────────────────────────────────────────
const section = C.stancesSectionHtml(MEMBER);
has(section, 'class="pdxst-lbl pdxst-open"', "tap: the issue name is the row's primary control");
has(section, 'data-pdxst-dos="' + ISSUE + '"', "tap: carrying the issue it opens");
has(section, 'data-pdxst-pid="' + MEMBER + '"', "tap: and whose record");
has(section, 'data-pdxst-origin="pdxst-row-' + MEMBER + "-" + ISSUE + '"',
  "tap: and the row id to return to, so closing the dossier is not a trip to the top of the page");
has(section, "Open the issue dossier", "tap: with an accessible name that says what it opens");
// The row keeps every jump it had — the dossier is additive.
has(section, 'data-pdxst-go="wa"', "tap: the row's existing connections are untouched");
// …and the profile body is still a stance list, not an issue database: no L2/L3
// markup is emitted into the profile itself.
hasnt(section, "pdxdos-rec", "profile: the record list lives in the dossier, not in the profile body");
hasnt(section, "pdxdos-recs", "profile: the profile body was not turned into an issue database");

// ── 8. Stepping sideways between issues ────────────────────────────────────
const step = C.dossierStepHtml(MEMBER, ISSUE);
has(step, 'class="pdxdos-step"', "step: the dossier offers the neighbouring issues");
has(step, "data-pdxc-gap=", "step: reusing the sheet's own open route rather than a second one");
has(step, 'data-pdxc-gap-pid="' + MEMBER + '"', "step: for this member");
ok(/Next issue|Previous issue/.test(step), "step: labelled by direction");
eq(pcts(step), 0, "step: and carries no score of its own");
ok(!step.includes('data-pdxc-gap="' + ISSUE + '"'), "step: never pointing back at the issue already open");

// ── 9. The assembled sheet ─────────────────────────────────────────────────
// All four levels arrive together, in order, and the sheet still ends with the
// existing next-step row and footer.
const sheet = C.gapViewHtml(MEMBER, ISSUE);
has(sheet, 'class="pdxdos"', "sheet: L1 is in the sheet");
has(sheet, "pdxdos-recs", "sheet: L2 is in the sheet");
has(sheet, "pdxdos-step", "sheet: so is the issue stepper");
// The header leads with the issue and its result; the identity strip sits under
// them, above the assembled answer. A reader arriving from a stance row already
// knows who this is — what they are waiting on is what the record said.
ok(sheet.indexOf('class="pdxgap-title') < sheet.indexOf('class="pdxgap-id"'),
  "sheet: issue first — the title leads, not the identity slab");
ok(sheet.indexOf('class="pdxgap-id"') < sheet.indexOf('class="pdxdos"'),
  "sheet: identity is still in the header, above the assembled answer — moved, not dropped");
const sidesAt = sheet.indexOf('class="pdxgap-sides');
ok(sidesAt > 0 && sheet.indexOf('class="pdxdos"') < sidesAt,
  "sheet: then the assembled answer, above the two record panels");
ok(sidesAt > 0 && sidesAt < sheet.indexOf("pdxdos-recs"),
  "sheet: then the full enumeration, below the panels it was drawn from");
ok(sheet.indexOf("pdxdos-recs") < sheet.indexOf("pdxdos-step"),
  "sheet: and the sideways step last, after this issue is exhausted");
has(sheet, "Where to next", "sheet: the existing next-step row survives");
hasnt(sheet, "One side only",
  "sheet: the old 'nothing to compare' opener is gone — the row model always has an answer");

// ── 10. The return path ────────────────────────────────────────────────────
// Behavioural, not a source grep: open with an origin, close, and check the app
// actually navigated back to that row.
const ORIGIN = "pdxst-row-" + MEMBER + "-" + ISSUE;
byId.set(ORIGIN, mkEl());
jumped.length = 0;
C.openGap(MEMBER, ISSUE, { arrival: false, origin: ORIGIN });
C.closeGap();
ok(jumped.includes(ORIGIN), `return: closing the dossier goes back to the originating row (jumped ${JSON.stringify(jumped)})`);
// Stepping to another issue keeps that return path: the reader still came from one row.
jumped.length = 0;
C.openGap(MEMBER, ISSUE, { arrival: false, origin: ORIGIN });
C.openGap(MEMBER, "healthcare");
C.closeGap();
ok(jumped.includes(ORIGIN), "return: a sideways step preserves the way back to the row they started on");
// An arrival has no profile behind it and must not try to navigate one.
jumped.length = 0;
C.openGap(MEMBER, ISSUE, { arrival: true, origin: ORIGIN });
C.closeGap();
eq(jumped.length, 0, "return: a shared-link arrival has no row to return to, and does not invent one");
byId.delete(ORIGIN);

// ── 11. Source contracts ───────────────────────────────────────────────────
const cs = readFileSync(join(ROOT, "consistency.js"), "utf8");
has(cs, "Issue dossier: ", "distinctness: the sheet names itself per open…");
has(cs, "_issueLabel(issueKey)", "distinctness: …with the issue and the person, so it is never confused with the 🔍 issue view");
// One scoring system. The dossier reads verdicts and scores; it computes none.
hasnt(cs, "dossierScore", "no second score: the dossier mints no score of its own");
ok(/_dosItems[\s\S]{0,3000}_orItemVerdict/.test(cs),
  "no second score: item verdicts come from the shared summariser, not from the dossier");
// The narrow-link threshold is read from the ✒️ section, never copied.
ok(/function _dosNarrowAt[\s\S]{0,300}PDXExecRecordUI/.test(cs),
  "one threshold: the narrow-link cutoff is read from the ✒️ section that owns it");
const ui = readFileSync(join(ROOT, "exec-record-ui.js"), "utf8");
has(ui, "NARROW_AT: NARROW_AT", "one threshold: and that section publishes it");
// L3 mounts without stealing the <details> toggle.
ok(/data-pdxdos-i\]'\);\s*\n\s*if \(dos\) _dosMount\(dos\);/.test(cs),
  "laziness: the mount handler neither preventDefaults nor returns — the native toggle still owns the row");
// The warm repaint reaches an open dossier.
ok(/_gapOpen && String\(_gapOpen\.pid\) === String\(pid\)/.test(cs),
  "cold: a warm event repaints the dossier that is open for that member");

if (failures.length) {
  console.error("✗ issue dossier: " + failures.length + " failure(s)");
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log("✓ issue dossier: all " + passed + " assertions passed — one issue, one assembled place, four levels");
console.log("  🏛️ " + mItems.length + " congressional instrument(s) · ✒️ " + xItems.length +
  " executive document(s) (" + heldItems.length + " held) · L2/L3/L4 mounted on demand");
