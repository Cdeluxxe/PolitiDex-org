#!/usr/bin/env node
/**
 * test-eye-record-first.mjs — the formal file beats a name stub
 * ─────────────────────────────────────────────────────────────────────────────
 * THE REPORT. The All-Seeing Eye's formal lane still answered a name query with
 * whichever row scored best as PROSE. A PROFILES stub with a photo, an office
 * string and a paragraph of bio would sit above the person holding the voting
 * file; so would a thin roster row; so would a member whose name the query only
 * brushed. The second Chew was already folded away (that is
 * scripts/test-eye-one-person-per-office.mjs), and this is the defect underneath
 * it: the empty file talks first.
 *
 * The reason was one boolean. The lane partitioned people on "does the pattern
 * index hold a row for this pid", and that reads FALSE for two very different
 * people — the stub with nothing on file, and the member whose lane simply has
 * not landed yet. Both fell into the same half, and inside that half relevance
 * decided, so a bio that happened to contain the query outranked a hundred and
 * twenty-five sourced acts.
 *
 * What this file pins:
 *
 *   1. THE FIXTURES ARE THE REPORTED PILE. The stub really is in PROFILES, it
 *      really is searchable by a term the roster row does not contain, it really
 *      has no formal record, and the person it competes with really does have a
 *      shipped formal index. None of this is hypothesised.
 *   2. ONE ROW PER PERSON, STILL. "chew" answers with one row, at chew_h68, and
 *      no retired id reaches the markup.
 *   3. THE RECORD LEADS. The record-holder is above the stub for every query
 *      that reaches both — the same-surname case and the identical-name case.
 *   4. AND THE NAME STILL DECIDES WHEN THE RECORD DOES NOT. "mike lee" answers
 *      with Mike Lee, not with the three Utah legislators called Mike whose
 *      shipped index happens to be warmer than his federal one. Depth orders
 *      people the query does not distinguish; it never outvotes the name.
 *   5. THE ROW SAYS WHAT IS ON FILE. Office + "N acts · M issues", or "record
 *      still landing" while the lane has not answered — which is a different
 *      sentence from "nothing on file" and is spelled differently.
 *   6. AT MOST ONE FIGURE, AND ONLY WHEN IT IS READY. The old badge chain (an
 *      outcome word, else a Say-vs-Do verdict, else a coverage chip) is gone. A
 *      percentage is printed only when PDXWordAction.figure() says the tested
 *      set stopped growing, and it is printed with its denominator — the same
 *      rule the homepage card took after it flashed 88% over five tested and
 *      settled to 72% over fifteen.
 *   7. A CITATION IS A DESTINATION. "S. 129" used to rank as prose: the digits
 *      landed in eight legislators' haystacks and the measures group renders
 *      last, so the measure sat ninth and Enter opened a person nobody had asked
 *      about. A query that IS a citation now leads the lane with that measure.
 *   8. NOTHING ON THE DO-NOT LIST MOVED. score() and rank() are byte-identical
 *      with the previous revision, the ordering reads no party letter, no
 *      percentage and no dollar, and rotating every party letter in the roster
 *      moves nothing.
 *   9. THE GUARDS ARE LOAD-BEARING. Every claim above is re-run against a
 *      mutated fixture and required to FAIL, so a green run cannot be a green
 *      no-op.
 *  10. IT SHIPS, and a twin boot leaves every Direction Match read and every
 *      formal tier byte-identical.
 *
 * Real shipped modules in a node:vm sandbox, the real roster, the real alias
 * table, the real shipped formal index, the real bills index.
 *
 *   node scripts/test-eye-record-first.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", "HEAD:" + f], { cwd: ROOT, encoding: "utf8" }); }
  catch { return null; }
};
const EYE_SRC = R("all-seeing-eye.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ eye record first: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

// The person the report named, and the id the alias table retired.
const PID = "chew_h68";
const RETIRED = "scott_chew";
// The federal senator the Tests line names, and the deep Utah file that shares
// his surname. Both are real shipped roster rows.
const LEE = "lee";

// ── fixture 1: the same-surname stub ────────────────────────────────────────
// A PROFILES-only document: a name, an office, a state, a paragraph of bio and
// nothing on file anywhere. It is NOT an aliased id, so nothing folds it — it is
// a row of its own, exactly like the thin candidate rows production carries, and
// it is searchable by "chew" and by a phrase the canonical roster row does not
// contain.
const STUB_ID = "marvin_chew_stub";
const STUB = {
  name: "Marvin Chew",
  office: "Candidate",
  state: "Utah",
  bio: "Uinta Basin rancher, first-time candidate, and no relation to the sitting representative.",
};

// ── fixture 2: the identical-name stub ──────────────────────────────────────
// The harder half of the same defect. "mike lee" names this document as exactly
// as it names the senator's, so relevance cannot tell them apart and the exact-
// name key cannot either: the ONLY thing that separates them is that one of them
// has a formal record.
const TWIN_ID = "mike_lee_county_stub";
const TWIN = {
  name: "Mike Lee",
  office: "County Commissioner",
  state: "Utah",
  bio: "Two-term county commissioner. Not the senator.",
};

// ── fixture 3: two measures, one federal and one Utah ───────────────────────
// H.R. 6644 is the measure scripts/test-eye-warming.mjs drives, and H.B. 400 is
// the Utah shape the desk's own bill door names. Neither is in the shipped
// inline index, which is the point: the live measures list is where the record's
// measures actually come from.
const LIVE_BILLS = [
  {
    id: 9001, number: "H.B. 400", title: "Water Rights Amendments",
    shortTitle: "Water Rights Amendments", measureType: "bill", chamber: "house",
    status: "enacted", primaryIssue: "water_rights", issueKeys: ["water_rights"],
    externalIds: { utahSession: "2025GS" }, keywords: "water rights utah shares",
  },
  {
    id: 9002, number: "H.R. 6644", title: "Federal Lands Transparency Act",
    shortTitle: "Federal Lands Transparency Act", measureType: "bill", chamber: "house",
    congress: 118, status: "introduced", primaryIssue: "lands_energy",
    issueKeys: ["lands_energy"], keywords: "federal lands disclosure",
  },
  // AND A SECOND MEASURE NUMBERED 400, in the other chamber. A bare "400" now
  // names two documents, so it names neither — which is the case the promotion
  // rule has to refuse, and it cannot be tested without a real collision.
  {
    id: 9003, number: "S. 400", title: "Public Lands Access Act",
    shortTitle: "Public Lands Access Act", measureType: "bill", chamber: "senate",
    congress: 118, status: "introduced", primaryIssue: "lands_energy",
    issueKeys: ["lands_energy"], keywords: "public lands access",
  },
];

// ── boot ────────────────────────────────────────────────────────────────────
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false,
    _attrs: {}, _li: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c) => (set.has(c) ? set.delete(c) : set.add(c)), contains: (c) => set.has(c),
    },
    setAttribute(k, v) { n._attrs[k] = String(v); },
    getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {},
    addEventListener(t, f) { (n._li[t] = n._li[t] || []).push(f); },
    removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    contains: () => true, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 44, bottom: 44, right: 320 }),
  };
  return n;
}
function resStub(i) {
  const n = stubNode();
  n.setAttribute("data-i", String(i));
  return n;
}

// profile-evidence.js and person-link.js are the identity spine; formal-index.js
// is the SHIPPED formal record, which is the only source that can answer "does
// this pid hold a file" on the first keystroke of a cold load; bills-index.js is
// the inline measures paint hint the citation queries read.
const SPINE = ["profile-evidence.js", "person-link.js"];
const EXTRAS = ["pdx-issue-family.js", "issue-colors.js", "formal-index.js", "bills-index.js"];

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  const files = [...ENGINE_FILES, ...EXTRAS].concat(opts.noSpine ? [] : SPINE);
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });

  let roster = win.CMP_DATA;
  if (opts.party) {
    // Same people, same offices, every party letter rotated.
    const rot = { R: "D", D: "I", I: "R" };
    const swapped = {};
    for (const [id, rec] of Object.entries(win.CMP_DATA || {})) {
      const p = String((rec && rec.party) || "").trim().charAt(0).toUpperCase();
      swapped[id] = { ...rec, party: rot[p] || rec.party };
    }
    win.CMP_DATA = swapped;
    roster = swapped;
  }
  const extraProfiles = {};
  if (!opts.noStub) extraProfiles[STUB_ID] = STUB;
  if (!opts.noTwin) extraProfiles[TWIN_ID] = TWIN;
  win.PROFILES = Object.assign({}, roster, extraProfiles);
  win.PDXSpotlight = { list: () => [], registry: {} };
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  if (!opts.noBills) win.__pdxEyeBillsLive = LIVE_BILLS.concat(win.PDX_BILLS_INDEX || []);
  // A stub has a photo in production — that is most of what it has — so the
  // fixture gives it one. "A pid with a formal index outranks a pid with only a
  // photo or bio" is not a claim about a missing image.
  win._getPhotoUrl = (id) => `/img/${id}.jpg`;

  // Every way out of the panel, recorded.
  const opened = [];
  win.PDXPerson = { open: (pid, o) => { opened.push("person:" + pid + (o && o.section ? "#" + o.section : "")); return true; } };
  win.showProfile = (id) => { opened.push("showProfile:" + id); };
  win.openModal = (id) => { opened.push("openModal:" + id); };
  win.PDXIssueView = { open: (k) => { opened.push("issue:" + k); } };
  win.PDXBills = { open: (n) => { opened.push("bill:" + n); return true; } };

  vm.runInContext(opts.src || EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");

  // THE GROUP CAP IS SIX, so a query like "mike lee" — which reaches thirty
  // legislators called Mike — paints six people and a "See more" button. The
  // ordering under test is the whole ranked list, not its first six, so the
  // harness keeps the nodes the panel binds its own handlers to and can press
  // that button the way a reader does.
  let lastMore = [];
  panel.querySelectorAll = (sel) => {
    const s = String(sel);
    if (s.indexOf("pdx-eye-more") >= 0) {
      lastMore = [...String(panel.innerHTML).matchAll(/class="pdx-eye-more" data-more="([^"]+)"/g)]
        .map((m) => { const n = stubNode(); n.className = "pdx-eye-more"; n.setAttribute("data-more", m[1]); return n; });
      return lastMore;
    }
    if (s.indexOf("pdx-eye-res") < 0) return [];
    return [...String(panel.innerHTML).matchAll(/class="pdx-eye-res[^"]*"[^>]*data-i="(\d+)"/g)]
      .map((m) => resStub(Number(m[1])));
  };
  const fire = (type, ev) => { (input._li[type] || []).forEach((f) => f(ev)); };

  return {
    win, panel, input, eye, opened,
    lane(m) { return win.PDXEye.lane(m); },
    search(q) {
      eye.classList.add("is-open");
      input.value = q;
      win.PDXEye.rebuild();
      win.PDXEye.render(q);
      return panel.innerHTML || "";
    },
    // The same query with its people group opened, which is what a reader sees
    // after one tap on "See more". Order is unchanged by expanding; only the
    // number of rows painted changes.
    searchAll(q) {
      this.search(q);
      const btn = lastMore.filter((n) => n.getAttribute("data-more") === "pol")[0];
      if (btn) (btn._li.click || []).forEach((f) => f({ stopPropagation() {} }));
      return panel.innerHTML || "";
    },
    enterRowAt(n) {
      fire("focus", {});
      for (let i = 0; i < n; i++) fire("keydown", { key: "ArrowDown", preventDefault() {}, shiftKey: false });
      opened.length = 0;
      fire("keydown", { key: "Enter", preventDefault() {}, shiftKey: false });
      return opened.slice();
    },
  };
}

// ── readers over the rendered markup ────────────────────────────────────────
// The person rows in the order they are painted, which is the order a reader
// arrows through and the order `flat` hands to Enter.
const POL_IDS = (h) =>
  [...String(h).matchAll(/class="pdx-eye-item[^"]*"[^>]*?data-kind="(?:pol|judge)" data-id="([^"]*)"/g)]
    .map((m) => m[1]);
// Every result row, any kind, in paint order.
const ALL_ROWS = (h) => String(h).split('<div class="pdx-eye-res"').slice(1).map((chunk) => {
  const m = /data-kind="([^"]+)"(?:\s+data-(?:id|key|slug|number)="([^"]*)")?/.exec(chunk);
  return m ? { kind: m[1], id: m[2] || "" } : { kind: "", id: "" };
});
// One person row's whole markup, so the sub-line and the badge slot can be read
// without the rest of the panel bleeding into the assertion.
function polRowOf(h, pid) {
  const parts = String(h).split('<div class="pdx-eye-res"');
  for (const p of parts) {
    if (p.includes(`data-kind="pol" data-id="${pid}"`)) return p;
  }
  return "";
}
const subOf = (row) => {
  const m = /class="pdx-eye-sub">([\s\S]*?)<\/span>/.exec(String(row));
  return m ? m[1] : "";
};
const rankOf = (list, id) => list.indexOf(id);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the fixtures are the reported pile, not a hypothesis");
// ═════════════════════════════════════════════════════════════════════════════
const probe = boot();
{
  const W = probe.win;
  const ALIAS = W.PDX_PROFILE_ALIAS || {};
  must(ALIAS[RETIRED] === PID, `the alias table no longer folds ${RETIRED} into ${PID}`);
  must(W.CMP_DATA[PID], `the roster has no row for ${PID}`);
  must(W.CMP_DATA[LEE], `the roster has no row for ${LEE}`);
  must(!W.CMP_DATA[STUB_ID] && W.PROFILES[STUB_ID], "the same-surname stub is not a PROFILES-only row");
  must(!W.CMP_DATA[TWIN_ID] && W.PROFILES[TWIN_ID], "the identical-name stub is not a PROFILES-only row");
  must(!ALIAS[STUB_ID] && !ALIAS[TWIN_ID],
    "a stub fixture is an aliased id, so it would be folded away and prove nothing");

  // THE SHIPPED FORMAL INDEX IS THE COLD-LOAD ANSWER, and the person the report
  // named is deep in it. If this ever goes to zero the whole file is vacuous.
  const FI = W.PDXFormalIndex;
  must(FI && typeof FI.acts === "function", "formal-index.js did not publish PDXFormalIndex.acts()");
  const chewActs = FI.acts(PID) || 0;
  must(chewActs > 50, `${PID} holds ${chewActs} sourced acts in the shipped index — the deep-file case is vacuous`);
  must((FI.acts(STUB_ID) || 0) === 0, "the stub has acts in the shipped formal index");
  must((FI.acts(TWIN_ID) || 0) === 0, "the identical-name stub has acts in the shipped formal index");

  // AND THE PATTERN INDEX AGREES ABOUT THE STUBS: nothing on file, from either
  // source, which is exactly the state a photo-and-bio row is in.
  const F = W.PDXConsistency.formalPatternIndex;
  must(F && typeof F.shape === "function", "PDXConsistency.formalPatternIndex.shape is unavailable");
  for (const sid of [STUB_ID, TWIN_ID]) {
    const shp = F.shape(sid) || {};
    must(!shp.judged && !shp.issues, `${sid} holds a formal pattern row, so it is not a stub`);
  }

  // THE STUB IS FINDABLE, and by a term the canonical roster row does not carry.
  // A fixture nobody can search for cannot outrank anybody.
  const h = probe.search("chew");
  must(POL_IDS(h).indexOf(STUB_ID) >= 0, "the same-surname stub does not answer 'chew' at all");
  const twinH = probe.searchAll("mike lee");
  must(POL_IDS(twinH).indexOf(TWIN_ID) >= 0, "the identical-name stub does not answer 'mike lee' at all");
  console.log(`      ${PID}: ${chewActs} sourced acts · 2 photo-and-bio stubs, 0 acts, both findable`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one row per person, still");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  const ALIAS = B.win.PDX_PROFILE_ALIAS || {};
  for (const q of ["chew", "scott chew", "uinta basin"]) {
    const h = B.search(q);
    const rows = POL_IDS(h);
    must(rows.length > 0, `the eye answered ${JSON.stringify(q)} with nobody`);
    const chews = rows.filter((id) => id === PID || ALIAS[id] === PID);
    eq(chews.length, 1, `${JSON.stringify(q)}: HD-68 got ${chews.length} rows — one office, one person, one row`);
    eq(chews[0], PID, `${JSON.stringify(q)}: the surviving HD-68 row is not the canonical pid`);
    const leaked = Object.keys(ALIAS).filter((k) => h.includes(k));
    eq(leaked.join(", "), "", `${JSON.stringify(q)}: a retired id reached the markup`);
  }
  console.log("      chew · scott chew · uinta basin — one chew_h68 row each, no retired id");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the record leads, and the name still decides");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");

  // THE SAME-SURNAME CASE. Both rows answer "chew"; one of them has a hundred
  // and twenty-five sourced acts and the other has a photo and a paragraph.
  const h = B.search("chew");
  const rows = POL_IDS(h);
  ok(rankOf(rows, PID) >= 0, "the deep file does not answer 'chew'");
  ok(rankOf(rows, STUB_ID) >= 0, "the stub does not answer 'chew' — the comparison is vacuous");
  ok(rankOf(rows, PID) < rankOf(rows, STUB_ID),
    `'chew' listed the photo-and-bio stub above the voting file (${rows.join(", ")})`);

  // THE IDENTICAL-NAME CASE. The exact-name key cannot separate these two, so
  // the record has to.
  for (const q of ["lee", "mike lee"]) {
    const lh = B.searchAll(q);
    const lrows = POL_IDS(lh);
    ok(rankOf(lrows, LEE) >= 0, `${JSON.stringify(q)}: the senator's own row is missing`);
    ok(rankOf(lrows, TWIN_ID) >= 0, `${JSON.stringify(q)}: the identical-name stub is missing`);
    ok(rankOf(lrows, LEE) < rankOf(lrows, TWIN_ID),
      `${JSON.stringify(q)}: a photo-and-bio stub called "Mike Lee" outranked the senator (${lrows.slice(0, 6).join(", ")})`);
  }

  // AND THE NAME OUTRANKS DEPTH. "mike lee" reaches three Utah legislators
  // called Mike whose shipped index is warmer than the senator's federal record.
  // Ordering on depth first put all three above him, which is the reported bug
  // wearing the other coat: a cold file losing to a warm one.
  const mh = B.search("mike lee");
  const mrows = POL_IDS(mh);
  eq(mrows[0], LEE,
    `"mike lee" led with ${JSON.stringify(mrows[0])} — the person the query names comes first (${mrows.slice(0, 6).join(", ")})`);

  // THE OFFICE KEY, in its own right: a query naming an office narrows to it
  // without a new score. Both Chews match "chew"; only one is a Candidate.
  const oh = B.search("chew candidate");
  const orows = POL_IDS(oh);
  if (orows.length > 1) {
    ok(rankOf(orows, STUB_ID) >= 0, "'chew candidate' does not reach the row whose office it names");
  }
  console.log("      chew → the file over the stub · lee / mike lee → the senator over an identical name");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the row says what is on file");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  const h = B.search("chew");
  const deep = polRowOf(h, PID);
  const stub = polRowOf(h, STUB_ID);
  must(deep && stub, "one of the two rows this section reads was not painted");

  // THE DEEP FILE COUNTS IN THE RECORD'S OWN UNITS, beside the office it holds.
  const deepSub = subOf(deep);
  const acts = B.win.PDXFormalIndex.acts(PID) || 0;
  has(deepSub, "Representative", "the deep row stopped naming the office it holds");
  has(deepSub, `${acts} acts`, "the deep row does not count the acts on its file");
  ok(/\d+ acts/.test(deepSub), "the deep row's record clause is not a count of acts");
  no(deepSub, "record still landing", "the row with a file on it says its record is still landing");

  // AND A ROW WHOSE LANE HAS NOT ANSWERED SAYS SO. "Nothing found" and "nothing
  // loaded" are different answers, and the stub's lane genuinely has not spoken:
  // there is no formal row, no shipped index entry and no reviewed empty note.
  has(subOf(stub), "record still landing",
    "the row with no record and no answer from its lane made no statement about either");
  no(subOf(stub), "acts", "the row with nothing on file counted acts anyway");

  // NOT A PERCENTAGE, NOT A PARTY SORT, NOT A DOLLAR. The row copy is a count.
  no(deepSub, "%", "the person row's sub-line prints a percentage");
  console.log(`      ${acts} acts on the file · "record still landing" on the stub`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · at most one figure, and only when it is ready");
// ═════════════════════════════════════════════════════════════════════════════
// WHAT WAS WRONG. The row's badge slot was a chain: PDXWordAction.searchBadgeHTML
// (an outcome word, else the formal-inventory chip), else PDXReceipts.rowBadge (a
// Say-vs-Do verdict), else PDXCoverage.badgeHTML. Three modules could answer for
// one slot, none of them gated on the tested set having settled — the same shape
// as the homepage card that printed 88% over five tested and then 72% over
// fifteen. One figure now, from one owner, and only when that owner says ready.
{
  const B = boot();
  B.lane("formal");
  const WA = B.win.PDXWordAction;
  must(WA && typeof WA.figure === "function", "PDXWordAction.figure is unavailable — there is no owner to gate on");

  // THE WARMING FIGURE IS NOT PRINTED. Everything about this object is populated
  // except that its tested set is still growing.
  B.win.PDXWordAction = Object.assign({}, WA, {
    figure: () => ({ pid: PID, pct: 88, tested: 5, eligible: 21, fraction: "5 of 21 tested",
      token: "backs", verdict: "Backs it up", shows: true, warming: true, ready: false }),
  });
  const warm = B.search("chew");
  no(warm, "88%", "a warming Word-vs-Action percentage reached a search row");
  no(warm, "5 of 21 tested", "a warming tested set reached a search row");

  // THE READY FIGURE IS PRINTED — ONCE, with its denominator beside it.
  B.win.PDXWordAction = Object.assign({}, WA, {
    figure: () => ({ pid: PID, pct: 72, tested: 15, eligible: 21, fraction: "15 of 21 tested",
      token: "backs", verdict: "Backs it up", shows: true, warming: false, ready: true }),
  });
  const ready = B.search("chew");
  const chip = (String(ready).match(/class="pdx-eye-wva"/g) || []).length;
  const rows = POL_IDS(ready).length;
  eq(chip, rows, `${chip} figure chip(s) across ${rows} person row(s) — the ready figure is one per row`);
  has(ready, "72%", "the ready figure was withheld");
  has(ready, "15 of 21 tested", "the figure was printed without the tested set it is over");
  // The chip's own tooltip repeats the figure in prose, which is why this counts
  // the printed one — the text node between the tag and the tested set — rather
  // than every occurrence of the digits.
  eq((String(ready).match(/>72%</g) || []).length, rows,
    "the row prints the percentage more than once — that is the second WVA the report named");

  // AND NO SECOND OPINION IN THE SAME SLOT. Whatever the other three modules
  // would have said, the row does not ask them while a figure is being printed.
  no(ready, "pdxwa-eye-badge", "the retired search badge is still painted on a person row");
  no(ready, "svd-eye-badge", "a Say-vs-Do verdict is still painted on a person row");
  no(ready, "Still documenting", "a coverage chip is painted beside a figure");
  no(ready, "Not yet documented", "a coverage chip is painted beside a figure");

  // THE CHAIN IS GONE FROM THE SOURCE TOO, not merely unreachable in this boot.
  // Read past the comments: the panel still NAMES both of the retired badge
  // builders where it explains why one figure replaced them.
  const LIVE_SRC = EYE_SRC.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  no(LIVE_SRC, "searchBadgeHTML", "the panel still calls PDXWordAction.searchBadgeHTML");
  no(LIVE_SRC, "recordBadgeHTML", "the panel still calls PDXWordAction.recordBadgeHTML");
  no(LIVE_SRC, "PDXReceipts.rowBadge", "the panel still calls PDXReceipts.rowBadge for a person row");
  console.log("      warming → nothing · ready → one 72% chip, over 15 of 21 tested");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a citation is a destination, not a search term");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  // The four shapes the report and the record name, plus the dotless spelling a
  // phone keyboard produces and a bare number that reaches exactly one measure.
  const CITES = [
    ["H.B. 400", "H.B. 400"],
    ["hb400", "H.B. 400"],
    ["H.R. 6644", "H.R. 6644"],
    ["6644", "H.R. 6644"],
    ["S. 129", "S. 129"],
    ["H.R. 1", "H.R. 1"],
    ["H.J.Res. 88", "H.J.Res. 88"],
  ];
  for (const [q, num] of CITES) {
    const h = B.search(q);
    const rows = ALL_ROWS(h);
    must(rows.length > 0, `the eye answered the citation ${JSON.stringify(q)} with nothing at all`);
    eq(rows[0].kind, "bill", `${JSON.stringify(q)}: the lane led with a ${rows[0].kind} row instead of the measure`);
    eq(rows[0].id, num, `${JSON.stringify(q)}: the lane led with ${JSON.stringify(rows[0].id)} rather than the measure named`);
    // And Enter opens it, through the bills module's own door.
    eq(B.enterRowAt(0).join(","), `bill:${num}`,
      `${JSON.stringify(q)}: Enter opened something other than the measure the query named`);
  }

  // "S. 129" IS THE REPORTED CASE. The digits reach a pile of legislators, and
  // before this pass eight of them ranked above the measure.
  const sh = B.search("S. 129");
  const pol = ALL_ROWS(sh).findIndex((r) => r.kind === "pol");
  const bill = ALL_ROWS(sh).findIndex((r) => r.kind === "bill");
  ok(pol < 0 || bill < pol, "'S. 129' still ranks a person above the measure it names");

  // A PHRASE WITH A CITATION IN IT IS PROSE. The reader is asking a question, not
  // naming a document, and the ranking keeps its answer.
  const prose = B.search("who voted for H.R. 1");
  const proseRows = ALL_ROWS(prose);
  if (proseRows.length) {
    ok(!(proseRows[0].kind === "bill" && proseRows[0].id === "H.R. 1") || proseRows.length === 1,
      "a prose question was treated as a citation");
  }

  // AGAINST THE PREVIOUS REVISION, because "leads the lane" is only a claim if
  // it used to be false somewhere. The same boot, the same fixtures, the panel
  // as it shipped before this pass.
  const headEye = HEAD("all-seeing-eye.js");
  must(headEye, "the previous revision is unreachable, so the citation lead has nothing to be measured against");
  const prev = boot({ src: headEye });
  prev.lane("formal");
  const asRows = (h) => ALL_ROWS(h).map((r) => r.kind + ":" + r.id).join(" | ");
  const moved = CITES.filter(([q, num]) => {
    const first = ALL_ROWS(prev.search(q))[0];
    return !first || first.kind !== "bill" || first.id !== num;
  }).map(([q]) => q);
  ok(moved.length > 0,
    "every citation already led its lane before this pass, so the promotion above proves nothing");

  // AND AN AMBIGUOUS BARE NUMBER IS NOT A CITATION. Two measures are numbered
  // 400, so a reader typing "400" has named neither: the lane keeps the answer
  // relevance gave it, unchanged from the previous revision, and only a number
  // exactly one document carries — "6644" above — is a destination.
  const mrows = ALL_ROWS(B.search("400"));
  must(mrows.filter((r) => r.kind === "bill" && /\b400$/.test(r.id)).length > 1,
    "the fixture no longer holds two measures numbered 400, so ambiguity is untested");
  eq(asRows(B.search("400")), asRows(prev.search("400")),
    "a bare number naming two measures reordered the lane as though it named one");
  console.log(`      promotion is load-bearing for ${moved.length} of ${CITES.length} shapes (${moved.join(", ")})`);

  // A CITATION THE RECORD DOES NOT HOLD CHANGES NOTHING. No promotion, no empty
  // group, no claim that the measure exists.
  const absent = B.search("H.R. 999999");
  ok(!String(absent).includes("H.R. 999999") || ALL_ROWS(absent).every((r) => r.kind !== "bill"),
    "a citation with no measure behind it painted a measure row anyway");

  // AND THE PUBLIC LANE IS UNTOUCHED: it prints no measures at all, so a
  // citation cannot reorder it.
  B.lane("public");
  const pub = B.search("H.B. 400");
  eq(ALL_ROWS(pub).filter((r) => r.kind === "bill").length, 0,
    "the public lane painted a measure row for a citation");
  console.log(`      ${CITES.length} citation shapes lead their lane · prose stays prose · a shared "400" is not a citation`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · nothing on the do-not list moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headEye7 = HEAD("all-seeing-eye.js");
  must(headEye7, "the previous revision is unreachable, so 'no new score' has nothing to measure against");
  const grab = (src, sig) => (src.match(new RegExp("function " + sig + "[\\s\\S]*?\\n    \\}")) || [""])[0];
  // RELEVANCE DID NOT MOVE. What a query matches, and how strongly, is score()'s
  // and rank()'s business; this pass only changed how ties are broken.
  for (const sig of ["score\\(", "rank\\("]) {
    const a = grab(headEye7, sig), b = grab(EYE_SRC, sig);
    must(a.length > 0, `the previous revision has no ${sig.replace("\\(", "()")} to compare`);
    eq(b, a, `${sig.replace("\\(", "()")} changed — this pass re-orders ties, it does not re-score matches`);
  }
  // THE ORDERING READS THE RECORD AND NOTHING ELSE.
  const ordering = ["recordFirst\\(", "hasRecord\\(", "depthTier\\(", "exactNameRank\\(", "officeHit\\(", "recordDepth\\("]
    .map((s) => grab(EYE_SRC, s)).join("\n");
  must(ordering.trim().length > 0, "the formal lane has no record-first ordering to audit");
  for (const banned of ["party", "pct", "wva", "WordAction", "finance", "raised", "donor", "money", "Math.random"]) {
    no(ordering, banned, `the ordering reads ${JSON.stringify(banned)} — it may order on the record only`);
  }
  // NO PARTY SORT, PROVED BY MUTATION rather than by reading the comparator.
  const plain = boot(), rot = boot({ party: true });
  for (const mode of ["formal", "public"]) {
    plain.lane(mode); rot.lane(mode);
    for (const q of ["chew", "lee", "mike lee", "schultz", "uinta basin"]) {
      eq(POL_IDS(rot.search(q)).join("|"), POL_IDS(plain.search(q)).join("|"),
        `${mode}/${q}: the order moved when every party letter was rotated`);
    }
  }
  // AND NONE OF THE SURFACES THIS PASS WAS TOLD TO LEAVE ALONE ARE TOUCHED.
  const CODE = EYE_SRC.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  for (const banned of ["DistrictVoice", "PDX_DISTRICT_VOICE", "PACK_TTL", "packTtl"]) {
    no(CODE, banned, `the panel reaches into ${JSON.stringify(banned)}, which is out of scope for this pass`);
  }
  console.log("      score/rank byte-identical · the ordering reads only the record · party rotation rejected");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the guards are load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
// Each claim above is re-run against a fixture that removes what it depends on,
// and is required to FAIL. Without this a passing run could be a passing no-op.
{
  // WITHOUT THE STUB there is no pile, so section 3 has nothing to order.
  const noStub = boot({ noStub: true, noTwin: true });
  noStub.lane("formal");
  eq(POL_IDS(noStub.search("chew")).filter((id) => id === STUB_ID || id === TWIN_ID).join(","), "",
    "a boot that installs no stub still printed one — the fixtures are not what orders these rows");

  // WITHOUT THE SHIPPED FORMAL INDEX the deep file has no cold-load record, so
  // the row must fall back to the honest sentence rather than invent a count.
  const noIdx = boot();
  noIdx.win.PDXFormalIndex = undefined;
  noIdx.win.PDXConsistency = Object.assign({}, noIdx.win.PDXConsistency, {
    formalPatternIndex: { count: () => 0, shape: () => null, rows: () => [] },
  });
  noIdx.lane("formal");
  const blind = polRowOf(noIdx.search("chew"), PID);
  ok(blind.length > 0, "the panel stopped finding the person when the record sources went away");
  has(subOf(blind), "record still landing",
    "with every record source removed the row still claimed a count");

  // WITHOUT THE MEASURES the citation cannot lead, and the panel must not
  // pretend it did.
  const noBills = boot({ noBills: true });
  noBills.win.PDX_BILLS_INDEX = [];
  noBills.lane("formal");
  const dry = ALL_ROWS(noBills.search("H.B. 400"));
  eq(dry.filter((r) => r.kind === "bill" && r.id === "H.B. 400").length, 0,
    "a boot with no measures loaded still painted the measure the citation named");
  // AND THE ORDERING ITSELF IS LOAD-BEARING. Run section 3's own comparisons
  // against the panel as it shipped before this pass: at least one of them has
  // to come out wrong there, or the report described something that was already
  // fixed and this file is ceremony.
  const headEye8 = HEAD("all-seeing-eye.js");
  must(headEye8, "the previous revision is unreachable, so the ordering has nothing to be measured against");
  const was = boot({ src: headEye8 });
  was.lane("formal");
  const wrongThen = [];
  const chewRows = POL_IDS(was.search("chew"));
  if (rankOf(chewRows, PID) > rankOf(chewRows, STUB_ID)) wrongThen.push("chew: stub over the file");
  for (const q of ["lee", "mike lee"]) {
    const r = POL_IDS(was.searchAll(q));
    if (rankOf(r, LEE) > rankOf(r, TWIN_ID)) wrongThen.push(`${q}: an identical-name stub over the senator`);
  }
  if (POL_IDS(was.search("mike lee"))[0] !== LEE) wrongThen.push('mike lee: led with someone else');
  ok(wrongThen.length > 0,
    "the previous revision already ordered every one of these queries correctly, so section 3 asserts nothing");
  console.log("      no stub → no pile · no index → no count · no measures → no measure row");
  console.log(`      the previous revision got ${wrongThen.length} of these wrong (${wrongThen.join("; ")})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · it ships");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  const v = Number(String((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0));
  ok(v >= 144,
    `sw.js CACHE_VERSION is v${v || "?"} — the panel and the document both changed, and a warm device would keep ` +
    "serving the copy that ranks a bio above a voting file");
  has(SW, "const RUNTIME_CACHE = `politidex-runtime-${CACHE_VERSION}`",
    "the runtime cache name no longer carries CACHE_VERSION, so a bump does not drop the stale panel");
  // The one figure a row may print has styles, and they carry its denominator.
  const DOC = R("index.html");
  has(DOC, ".pdx-eye-wva{", "the figure chip the row paints has no styles");
  has(DOC, ".pdx-eye-wva-n{", "the tested set beside the figure has no styles");
  console.log(`      CACHE_VERSION v${v} · the figure chip is styled`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · twin boot — Direction Match and every formal tier are untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  const corpus = buildCorpus(ROOT);
  must(corpus && corpus.byMember && corpus.byMember.size > 300,
    `the record corpus loaded ${corpus && corpus.byMember ? corpus.byMember.size : 0} members`);
  function engine(files) {
    const win = makeSandbox();
    win.history = { replaceState() {}, pushState() {} };
    const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
    input.tagName = "TEXTAREA";
    const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
    win.document.getElementById = (id) => ids[id] || null;
    const ctx = vm.createContext(win);
    for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
    win.PROFILES = Object.assign({}, win.CMP_DATA, { [STUB_ID]: STUB, [TWIN_ID]: TWIN });
    win.PDXSpotlight = { list: () => [], registry: {} };
    win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
    win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
    for (const [pid, recs] of corpus.byMember) {
      try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* no record surface here */ }
    }
    return win;
  }
  const BASE = [...ENGINE_FILES, ...EXTRAS, "voting-record.js"];
  const bare = engine(BASE);
  const withEye = engine([...BASE, ...SPINE, "all-seeing-eye.js"]);
  must(bare.PDXConsistency && typeof bare.PDXConsistency.scopedOverall === "function",
    "consistency.js did not boot in the bare twin");
  must(withEye.PDXEye, "all-seeing-eye.js did not boot in the loaded twin");

  const scopes = Object.keys(bare.PDXConsistency.SCOPES || {});
  must(scopes.length > 0, "PDXConsistency.SCOPES is empty");
  const drift = [];
  let swept = 0;
  for (const [pid] of corpus.byMember) {
    swept++;
    for (const sc of scopes) {
      const a = JSON.stringify(bare.PDXConsistency.scopedOverall(sc, pid));
      if (JSON.stringify(withEye.PDXConsistency.scopedOverall(sc, pid)) !== a) drift.push(`${pid}/${sc}`);
    }
    const t = JSON.stringify(bare.PDXConsistency.formalPatternIndex.shape(pid));
    if (JSON.stringify(withEye.PDXConsistency.formalPatternIndex.shape(pid)) !== t) drift.push(`${pid}/formal`);
    const w = JSON.stringify(bare.PDXWordAction.read(pid));
    if (JSON.stringify(withEye.PDXWordAction.read(pid)) !== w) drift.push(`${pid}/ledger`);
  }
  ok(swept > 300, `the twin boot only swept ${swept} files`);
  eq(drift.slice(0, 8).join(" | "), "",
    `${drift.length} Direction Match read(s) / formal tier(s) moved — this pass orders rows and must move none`);

  // AND THE COLD PANEL STILL ANSWERS, with no identity spine on the page.
  const cold = boot({ noSpine: true });
  cold.lane("formal");
  const ch = cold.search("chew");
  ok(POL_IDS(ch).length > 0, "with no identity spine loaded the panel stopped finding people — it must fail open");
  console.log(`      ${swept} files × ${scopes.length} scopes swept in 2 boots; no read moved; cold panel answers`);
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ eye record first: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ eye record first: the formal file leads, the name still decides, a citation opens its measure — ${passed} assertions passed\n`);
