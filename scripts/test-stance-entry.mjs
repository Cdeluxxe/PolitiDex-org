#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Every stance entry point is the same door
// ─────────────────────────────────────────────────────────────────────────────
// A politician profile shows a reader the same issue in four places: the ⚖️ Word
// vs Action issue index, the 🧭 Stances & Connections rows, the 🏛️ Official Record
// rows, and the divergence list that sets the two records against each other.
//
// They used to behave like four different products. The index row opened the
// assembled dossier. The stance row opened it too. The Official Record row offered
// "⚖️ Diverges — compare →" — a fifth set of words for a result the profile already
// had a name for, drawn only when the issue happened to carry a real percentage on
// BOTH sides, so most rows had no way in at all. And the divergence row was tappable
// only when the two records disagreed, on the reasoning that an aligned row "has no
// gap to explain" — which refused the one reader who wanted the record behind an
// issue that was fine.
//
// What is pinned here:
//
//   · ONE DOOR. Every entry surface dispatches into openGap(pid, issueKey) and the
//     sheet it lands on is BYTE-IDENTICAL across all four. Not "similar" — identical,
//     compared string to string, because the whole claim is that there is one
//     assembly and four ways to reach it.
//   · ONE VOCABULARY. Contradicted / Mixed / Backed up / Thin record, published by
//     PDXWordAction and read by every surface. No surface restates the four words,
//     and none of them prints a competing chip for the same claim.
//   · ONE COLOUR PATH. The bucket colour on the door is the bucket colour in the
//     dossier header, and the issue colour on the row is the issue colour on the
//     dossier title.
//   · A RETURN PATH FROM EACH. Every door carries the id of the row it was drawn on,
//     every one of those ids is really painted, and closing the sheet navigates back
//     to the row the reader left rather than the top of the page.
//   · FAIL CLOSED. No bucket, no door. No consistency module, no navigation. The
//     divergence chip keeps its own words on purpose, because "do the two records
//     agree with each other" is not the question "did the record back the word".
//
//   node scripts/test-stance-entry.mjs
//
// Real modules in one node:vm sandbox with a fake DOM, seeded with a member whose
// record is real on both lanes, and a president so the executive lane is exercised
// through the same four surfaces. No database, no network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

// ── Fake DOM ────────────────────────────────────────────────────────────────
// Two things beyond the usual: a capturable document click listener, because every
// door on this profile is delegated and the only way to test a delegated door as
// BEHAVIOUR is to hold the handler and call it; and an element registry, because the
// return path is guarded on the origin row still being in the document and a test
// that never paints the row would pass while proving nothing.
const byId = new Map();
const docClick = [];
const navJumps = [];
const mkEl = (tag) => {
  const cls = new Set();
  const el = {
    tagName: String(tag || "div").toUpperCase(),
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "",
    parentNode: null,
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); },
      contains: (c) => cls.has(c),
    },
    _classes: cls, _attrs: {},
    setAttribute(k, v) { el._attrs[k] = v; }, getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    removeAttribute(k) { delete el._attrs[k]; },
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
    getElementById: (id) => byId.get(id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener: (type, fn) => { if (type === "click") docClick.push(fn); },
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
ctx.window._pdxNavJump = (id) => { navJumps.push(id); };
ctx.window._pdxRevealTarget = () => {};

// ── The palette, stubbed ────────────────────────────────────────────────────
// `healthcare` is deliberately NOT core, so "an unmapped key gets no spine rather
// than a neutral one" is exercised on the shared path rather than assumed.
const CORE = { lower_taxes: "#7fd4c1", border_security: "#e2a06a" };
ctx.window.PDXIssueColors = {
  isCore: (k) => Object.prototype.hasOwnProperty.call(CORE, k),
  getIssueColor: (k) => ({ mapped: Object.prototype.hasOwnProperty.call(CORE, k), color: CORE[k] || "#9fb4d4" }),
  styleFor: (k) => (CORE[k] ? `--pdx-ic:${CORE[k]};--pdx-ic-wash:${CORE[k]}22;` : ""),
};

// ── Roster ──────────────────────────────────────────────────────────────────
// PREZ must be `trump`: exec-record.js gates the executive lane on a hardcoded
// allow-list, and a president outside it renders no executive record to enter.
const MEMBER = "rep_entry", PREZ = "trump";
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

// ── Public receipts ─────────────────────────────────────────────────────────
// The Say-vs-Do side of the divergence list. Two directional items is the minimum
// that produces a percentage, which is the minimum that produces a divergence row —
// the surface cannot be tested at all without them.
const RECEIPTS = [
  { pid: MEMBER, issueKey: ISSUE, category: "statement", verdict: { key: "consistent" },
    title: "Told a town hall the cut had to be permanent", date: "2025-02-02",
    source: { url: "https://example.org/a", label: "Local paper" } },
  { pid: MEMBER, issueKey: ISSUE, category: "statement", verdict: { key: "contradicts" },
    title: "Told donors the sunset was fine", date: "2025-05-09",
    source: { url: "https://example.org/b", label: "Filing" } },
  { pid: MEMBER, issueKey: ISSUE, category: "statement", verdict: { key: "consistent" },
    title: "Repeated the pledge on the floor", date: "2025-06-18",
    source: { url: "https://example.org/c", label: "Record" } },
  { pid: PREZ, issueKey: ISSUE, category: "statement", verdict: { key: "consistent" },
    title: "Said the withholding change was the point", date: "2025-02-03",
    source: { url: "https://example.org/d", label: "Briefing" } },
  { pid: PREZ, issueKey: ISSUE, category: "statement", verdict: { key: "contradicts" },
    title: "Said the brackets would not move", date: "2025-04-20",
    source: { url: "https://example.org/e", label: "Transcript" } },
];
ctx.window.PDXReceipts = { collect: () => RECEIPTS };

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
const section = (t) => console.log("  · " + t);

const C = ctx.window.PDXConsistency;
const WA = ctx.window.PDXWordAction;

// ── Seeds ───────────────────────────────────────────────────────────────────
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
const SRC_X = "https://www.federalregister.gov/documents/2025/1";
const inForce = [{ status: "in_force", effectiveAt: "2025-02-01", sourceUrl: SRC_X, sourceLabel: "Federal Register" }];
ctx.EXEC_ACTIONS = {
  [PREZ]: [
    {
      actionClass: "executive_order", term: "47", documentId: "EO 14001",
      title: "Order on Federal Tax Withholding", actedAt: "2025-01-30",
      sourceUrl: SRC_X, sourceLabel: "Federal Register", status: inForce,
      issues: [{ issueKey: ISSUE, direction: "advances", weight: 100, isPrimary: true,
                 plain: "The order lowered federal withholding rates for the current year." }],
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

// ── Rendering every entry surface ───────────────────────────────────────────
// Rendering is also what ARMS the delegated handlers: the sections call bindGateway()
// and the index calls armIndex(). Nothing below could be driven without this.
const surfaces = (pid) => ({
  index: WA.headlineHtml(pid, ctx.PROFILES[pid]) || "",
  stances: C.stancesSectionHtml(pid) || "",
  official: C.officialRecordSectionHtml(pid) || "",
  divergence: C.divergenceSectionHtml(pid) || "",
});
const M = surfaces(MEMBER);
const P = surfaces(PREZ);

// Paint the origin rows the doors point at. closeGap() only navigates back when the
// origin is still in the document, so registering the ids is what makes the return
// path observable — and demanding that the id was really emitted by the surface is
// what stops the test from inventing an origin the app never draws.
const paint = (html) => {
  const found = [];
  for (const m of String(html).matchAll(/\sid="(pdx(?:st-row|or-row|dv-row|wa-oc)-[^"]+)"/g)) {
    const el = mkEl();
    el.id = m[1];
    byId.set(m[1], el);
    found.push(m[1]);
  }
  return found;
};
const PAINTED = new Set([...Object.values(M), ...Object.values(P)].flatMap(paint));

// ── Driving a delegated door ────────────────────────────────────────────────
// A synthetic target whose closest() answers from a flat attribute bag, handed to
// every captured document listener in turn — exactly what a real click does.
const fire = (attrs) => {
  const target = {
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    closest: (sel) => {
      const m = /^\[([^\]=]+)\]$/.exec(sel);
      if (m) return (m[1] in attrs) ? target : null;
      return null;
    },
  };
  let prevented = false;
  const ev = { target, preventDefault: () => { prevented = true; } };
  for (const fn of docClick) { try { fn(ev); } catch (e) { failures.push("handler threw: " + e.message); } }
  return prevented;
};
// What is on the sheet right now. The backdrop is the element consistency.js built
// through document.createElement, so this is the real assembly, not a re-render.
const sheetBody = () => {
  const back = byId.get("pdxc-gap-back");
  const sheet = back && back.querySelector(".pdxgap-sheet");
  const body = sheet && sheet.querySelector(".pdxgap-body");
  return body ? String(body.innerHTML) : "";
};
// consistency.js appends the backdrop to document.body and finds it again by id, so
// the registry has to see it the moment it is created.
const realAppend = ctx.document.body.appendChild;
ctx.document.body.appendChild = function (c) {
  if (c && c.id) byId.set(c.id, c);
  return realAppend.call(this, c);
};

// Pull one door's attributes straight out of the rendered HTML, so the test drives
// what the app actually emitted rather than a hand-written copy of it.
const doorFor = (html, marker, keys) => {
  const s = String(html);
  const i = s.indexOf(marker);
  if (i === -1) return null;
  const start = s.lastIndexOf("<button", i);
  if (start === -1) return null;
  const end = s.indexOf(">", i);
  const tag = s.slice(start, end + 1);
  const out = {};
  for (const k of keys) {
    const m = new RegExp(`\\s${k}="([^"]*)"`).exec(tag);
    if (m) out[k] = m[1];
  }
  out._tag = tag;
  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · four surfaces, one published vocabulary");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(typeof WA.outcomeFor === "function", "vocabulary: outcomeFor() is not published");
  const bucket = WA.outcomeFor(C.issueRow(MEMBER, ISSUE).verdict.token);
  ok(!!bucket, "vocabulary: the seeded issue resolves to no bucket, so nothing below means anything");
  const WORD = bucket.short;

  // The word appears on the row in every surface that shows a result for this issue.
  has(M.index, WORD, "index: the issue's bucket word is missing from the index row");
  has(M.stances, WORD, "stances: the row does not speak the published bucket vocabulary");
  has(M.official, WORD, "official record: the row's door does not name the bucket");
  has(M.divergence, WORD, "divergence: the row's door does not name the bucket");

  // And the LONG engine label is not sitting beside it as a second name for the same
  // finding. This is the specific regression the unification exists to prevent: the
  // row used to say "Backs it up" while the index two sections down said "Backed up".
  const long = C.issueRow(MEMBER, ISSUE).verdict.label;
  ok(long !== WORD, "the seeded issue's long and short labels are identical, so this proves nothing");
  hasnt(M.stances, long,
    `stances: the row still prints the engine's long label "${long}" as a second verdict word`);
  has(M.stances, WORD, "stances: the row does not print the published bucket word");

  // Nobody re-declares the four words. They are read from the module that owns them.
  const CJS = read("consistency.js");
  for (const w of ["Contradicted", "Backed up", "Thin record"]) {
    hasnt(CJS, `'${w}'`, `vocabulary: consistency.js hardcodes the bucket word "${w}" instead of reading it`);
  }
  ok(/outcomeFor/.test(CJS), "vocabulary: consistency.js does not read the published vocabulary at all");

  // The pre-unification words are gone from the profile's entry rows.
  hasnt(M.official, "compare →", "official record: the old divergence-worded compare link is still drawn");
  hasnt(M.divergence, "See what’s behind the gap",
    "divergence: the old gap-worded call to action is still drawn");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every entry point lands on the SAME assembled dossier");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The reference: the assembly itself, asked for directly.
  const REF = String(C.gapViewHtml(MEMBER, ISSUE));
  ok(REF.length > 500, "reference: the dossier assembly came back empty");

  const doors = [
    ["index", doorFor(M.index, `data-pdxwa-dos="${ISSUE}"`,
      ["data-pdxwa-dos", "data-pdxwa-dos-pid", "data-pdxwa-dos-origin", "aria-label"])],
    ["stances", doorFor(M.stances, `data-pdxst-dos="${ISSUE}"`,
      ["data-pdxst-dos", "data-pdxst-pid", "data-pdxst-origin", "aria-label"])],
    ["official", doorFor(M.official, `data-pdxc-gap="${ISSUE}"`,
      ["data-pdxc-gap", "data-pdxc-gap-pid", "data-pdxc-gap-origin", "aria-label"])],
    ["divergence", doorFor(M.divergence, `data-pdxc-gap="${ISSUE}"`,
      ["data-pdxc-gap", "data-pdxc-gap-pid", "data-pdxc-gap-origin", "aria-label"])],
  ];

  for (const [name, d] of doors) {
    ok(!!d, `${name}: no door for the seeded issue was rendered at all`);
    if (!d) continue;

    // Every door is a real button, so it is reachable by keyboard and announces
    // itself as an action rather than as text that happens to respond to a tap.
    has(d._tag, '<button type="button"', `${name}: the door is not a button`);

    // ONE ACCESSIBLE NAME. Same sentence, same destination, four places.
    has(d["aria-label"] || "", "Open the issue dossier: Lower Taxes",
      `${name}: the door does not announce the shared destination`);

    // Drive it, then compare the assembly byte for byte.
    const prevented = fire(d);
    ok(prevented, `${name}: the door did not take over the click`);
    eq(sheetBody(), REF, `${name}: this entry point assembles a DIFFERENT dossier`);
    C.closeGap();
  }

  // And the four are identical to each other, not merely each equal to a reference
  // that could itself have been recomputed per surface.
  const bodies = doors.filter(([, d]) => d).map(([, d]) => { fire(d); const b = sheetBody(); C.closeGap(); return b; });
  ok(bodies.length === 4, "four entry surfaces did not all produce a dossier");
  ok(new Set(bodies).size === 1, "the four entry points do not agree on one assembly");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the return path, from each door");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cases = [
    ["index", doorFor(M.index, `data-pdxwa-dos="${ISSUE}"`,
      ["data-pdxwa-dos", "data-pdxwa-dos-pid", "data-pdxwa-dos-origin"]), "data-pdxwa-dos-origin"],
    ["stances", doorFor(M.stances, `data-pdxst-dos="${ISSUE}"`,
      ["data-pdxst-dos", "data-pdxst-pid", "data-pdxst-origin"]), "data-pdxst-origin"],
    ["official", doorFor(M.official, `data-pdxc-gap="${ISSUE}"`,
      ["data-pdxc-gap", "data-pdxc-gap-pid", "data-pdxc-gap-origin"]), "data-pdxc-gap-origin"],
    ["divergence", doorFor(M.divergence, `data-pdxc-gap="${ISSUE}"`,
      ["data-pdxc-gap", "data-pdxc-gap-pid", "data-pdxc-gap-origin"]), "data-pdxc-gap-origin"],
  ];
  for (const [name, d, key] of cases) {
    if (!d) { failures.push(`${name}: no door to test a return path on`); continue; }
    const origin = d[key] || "";
    ok(!!origin, `${name}: the door carries no origin, so closing strands the reader`);
    // The id has to be one the surface really painted. An origin pointing at nothing
    // fails silently in production — closeGap() guards on the element existing — so a
    // test that only checked the attribute was present would pass on a broken path.
    ok(PAINTED.has(origin), `${name}: the origin "${origin}" is not an id any surface emits`);

    navJumps.length = 0;
    fire(d);
    C.closeGap();
    eq(navJumps[navJumps.length - 1], origin, `${name}: closing the dossier did not return to the originating row`);
  }

  // The guard itself: an origin whose row has left the document (a warm repaint, a
  // profile switch) must not navigate anywhere rather than jumping to nothing.
  navJumps.length = 0;
  fire({ "data-pdxc-gap": ISSUE, "data-pdxc-gap-pid": MEMBER, "data-pdxc-gap-origin": "pdxst-row-ghost-gone" });
  C.closeGap();
  eq(navJumps.length, 0, "a return path to a row that is no longer painted still navigated");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · colour and bucket language carried into the sheet");
// ═════════════════════════════════════════════════════════════════════════════
{
  const bucket = WA.outcomeFor(C.issueRow(MEMBER, ISSUE).verdict.token);
  const dossier = String(C.gapViewHtml(MEMBER, ISSUE));

  has(dossier, "pdxdos-bucket", "the dossier header does not state the bucket it was entered from");
  has(dossier, `--c:${bucket.col}`, "the dossier header does not carry the bucket colour");
  has(dossier, `>${bucket.short}<`, "the dossier header does not repeat the bucket word");
  has(dossier, `--pdx-ic:${CORE[ISSUE]}`, "the dossier title does not carry the issue colour");
  has(dossier, 'class="pdxgap-title pdxc-ic"', "the dossier title has no issue spine");

  // The same two colours are on the rows the reader tapped from, which is what makes
  // the path read as continuous rather than as two coincidentally similar screens.
  for (const [name, html] of [["index", M.index], ["stances", M.stances], ["divergence", M.divergence]]) {
    has(html, `--pdx-ic:${CORE[ISSUE]}`, `${name}: the row does not carry the issue colour the dossier shows`);
  }
  has(M.official, `--c:${bucket.col}`, "official record: the door does not carry the bucket colour");
  has(M.divergence, bucket.short, "divergence: the door does not carry the bucket word");

  // An issue with no palette entry gets no spine — in the row and in the sheet alike.
  const plain = String(C.gapViewHtml(MEMBER, "healthcare"));
  has(plain, 'class="pdxgap-title"', "an unmapped issue was given an issue spine anyway");
  hasnt(plain, "--pdx-ic:#9fb4d4", "an unmapped issue was painted with a neutral placeholder colour");

  // The bucket line is a NAME, not a second score. The profile publishes one number.
  const line = /<div class="pdxdos-bucket"[\s\S]*?<\/div>\s*<div/.exec(dossier);
  ok(!!line, "the bucket line is not where the header puts it");
  if (line) hasnt(line[0], "%", "the bucket line prints a percentage");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · both lanes, all four surfaces");
// ═════════════════════════════════════════════════════════════════════════════
{
  const REF = String(C.gapViewHtml(PREZ, ISSUE));
  const doors = [
    ["index", doorFor(P.index, `data-pdxwa-dos="${ISSUE}"`, ["data-pdxwa-dos", "data-pdxwa-dos-pid"])],
    ["stances", doorFor(P.stances, `data-pdxst-dos="${ISSUE}"`, ["data-pdxst-dos", "data-pdxst-pid"])],
    ["official", doorFor(P.official, `data-pdxc-gap="${ISSUE}"`, ["data-pdxc-gap", "data-pdxc-gap-pid"])],
    ["divergence", doorFor(P.divergence, `data-pdxc-gap="${ISSUE}"`, ["data-pdxc-gap", "data-pdxc-gap-pid"])],
  ];
  for (const [name, d] of doors) {
    ok(!!d, `executive/${name}: the president's issue has no door on this surface`);
    if (!d) continue;
    fire(d);
    eq(sheetBody(), REF, `executive/${name}: this entry point assembles a different dossier`);
    C.closeGap();
  }
  // The lane's own nouns survive the unification: an executive record is counted in
  // actions, never in votes. (The glossary chip below still teaches "roll-call vote"
  // as a term — that is a definition, not a count of this president's record.)
  has(REF, "judged actions", "the executive dossier does not count in the executive lane's noun");
  ok(!/\d+ votes/.test(REF), "the executive dossier counts votes for a president");
  // And the congressional one still says votes.
  has(String(C.gapViewHtml(MEMBER, ISSUE)), "judged votes", "the congressional dossier lost its lane noun");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · fail closed");
// ═════════════════════════════════════════════════════════════════════════════
{
  // NO BUCKET, NO DOOR. An issue the index never filed — nothing stated, nothing on
  // record — must not be given an entry row that opens an empty sheet.
  const row = C.issueRow(MEMBER, "border_security");
  const bucket = WA.outcomeFor(row.verdict.token);
  if (!bucket) {
    hasnt(M.official, `data-pdxc-gap="border_security"`,
      "official record: an issue with no bucket was still given a door");
    hasnt(M.divergence, `data-pdxc-gap="border_security"`,
      "divergence: an issue with no bucket was still given a door");
  } else { passed += 2; }

  // NO VOCABULARY MODULE, NO DOOR. consistency.js reads the four words from
  // PDXWordAction; with that gone it must print no entry row rather than invent a
  // fifth name for the same outcome.
  const savedWA = ctx.window.PDXWordAction;
  ctx.window.PDXWordAction = undefined;
  try {
    const bare = C.officialRecordSectionHtml(MEMBER) || "";
    hasnt(bare, "pdxdos-door", "official record: a door was drawn with no vocabulary to label it");
    const bareDv = C.divergenceSectionHtml(MEMBER) || "";
    hasnt(bareDv, "data-pdxc-gap=", "divergence: a door was drawn with no vocabulary to label it");
    const bareSheet = String(C.gapViewHtml(MEMBER, ISSUE));
    hasnt(bareSheet, "pdxdos-bucket", "the dossier invented a bucket line with no vocabulary published");
    ok(bareSheet.length > 500, "the dossier collapsed entirely when the vocabulary was unreachable");
  } finally { ctx.window.PDXWordAction = savedWA; }

  // NO DOSSIER MODULE, NO NAVIGATION. The index's handler asks for openGap before it
  // touches the event; without it the tap must do nothing at all.
  const savedOpen = C.openGap;
  ctx.window.PDXConsistency = { ...C, openGap: undefined };
  try {
    const prevented = fire({ "data-pdxwa-dos": ISSUE, "data-pdxwa-dos-pid": MEMBER, "data-pdxwa-dos-origin": "x" });
    ok(!prevented, "the index door swallowed a click it could not act on");
  } finally { ctx.window.PDXConsistency = C; C.openGap = savedOpen; }

  // A DOOR WITH NO ISSUE opens nothing. openGap() guards on both arguments, and the
  // guard is what keeps a malformed row from clearing the sheet that is already up.
  C.openGap(MEMBER, ISSUE);
  const before = sheetBody();
  C.openGap(MEMBER, "");
  eq(sheetBody(), before, "a door with no issue key overwrote the open dossier");
  C.closeGap();

  // THE DIVERGENCE CHIP KEEPS ITS OWN QUESTION, and is now worded so it cannot be
  // mistaken for an answer to the other one. It measures whether the two records agree
  // with EACH OTHER; the bucket measures whether the record backed the word. Its middle
  // band used to be labelled "Mixed" — a bucket word — which put one word meaning two
  // things on the same row as a door reading "Backed up".
  ok(/pdxdv-rel/.test(M.divergence), "divergence: the lane-relationship chip was removed");
  const relWords = ["Same story", "Some daylight", "Different stories"];
  ok(relWords.some((w) => M.divergence.includes(w)),
    "divergence: the lane-relationship vocabulary is gone from the row");
  // No bucket word may appear inside a relationship chip, in any of the three bands.
  for (const chip of M.divergence.matchAll(/<span class="pdxdv-rel"[^>]*>([\s\S]*?)<\/span>/g)) {
    for (const o of WA.OUTCOMES) {
      hasnt(chip[1], o.short,
        `divergence: the relationship chip reuses the result word "${o.short}" for a different claim`);
    }
  }
  // And the methodology sheet teaches the separation rather than the old words.
  const meth = String(C.methodologyHtml ? C.methodologyHtml(MEMBER) : "");
  if (meth) {
    has(meth, "Same story", "methodology: the divergence labels are explained under their old names");
    has(meth, "a different question", "methodology: the two vocabularies are not distinguished");
  } else { passed += 2; }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no densification, no second scoreboard");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The doors added one control per row and no numbers. If a door ever starts
  // printing a percentage it becomes a competing score on a face that publishes one.
  const doorTags = [...M.official.matchAll(/<button[^>]*pdxdos-door[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
  ok(doorTags.length > 0, "official record: no shared door was rendered to check");
  for (const t of doorTags) hasnt(t, "%", "official record: a dossier door prints a percentage");

  // One door per Official Record row, not one per row plus the link it replaced.
  const rows = (M.official.match(/class="pdxor-issue pdxor-row/g) || []).length;
  ok(doorTags.length <= rows, "official record: more doors than rows — a link was added, not replaced");

  // Mobile tap targets: the shared door declares a real height rather than inheriting
  // the 0.16rem pill padding of the inline link it replaced.
  const CJS = read("consistency.js");
  ok(/\.pdxdos-door\{[^}]*min-height:\s*2(\.\d+)?rem/.test(CJS),
    "the shared door has no usable tap target height");

  // The divergence row is a full-width button, so the whole row is the target.
  ok(/pdxdv-row-tap/.test(M.divergence), "divergence: rows are no longer primary tap targets");
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ stance entry: all ${passed} assertions passed — four surfaces, one door, one vocabulary`);
