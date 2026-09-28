#!/usr/bin/env node
/**
 * test-big-picture-filters.mjs — the act's view control is a filter, not a rank
 * ─────────────────────────────────────────────────────────────────────────────
 * H.R. 1 is mapped to fourteen topics. Counted by topic category, it is split
 * across two main categories (on-axis) and reaches into several others
 * (off-axis). That axis is a useful thing to slice on — a reader who wants the
 * bill's main categories should be able to see them — and a dangerous thing to
 * display, because rows marked "the main ones" can turn the rest into footnotes.
 * The panel's answer is a view control whose entire implementation is one
 * attribute and two CSS rules. This file is the QA on that answer: it does not
 * take the implementation's word for any of it.
 *
 * What it proves, against the shipped bill-detail.js and the shipped stylesheet
 * that file injects at runtime:
 *
 *   1. DEFAULT IS EVERYTHING. The markup ships `data-bd-view="all"`, and "all" is
 *      a value no hiding rule matches — so the default face is the whole act, and
 *      an unknown or missing value is the whole act too.
 *   2. NOTHING ELSE HIDES A ROW. The stylesheet is parsed and every declaration
 *      that could remove a topic from view — display, visibility, opacity, height
 *      caps, line clamps, nth-child — is checked against the ledger's selectors.
 *      Exactly two rules may hide a topic row, and both are keyed to the button
 *      the reader just pressed.
 *   3. IT FAILS OPEN. The buttons are the only thing that writes the attribute, so
 *      with scripting unavailable every row stays on screen permanently.
 *   4. THE SLICES ARE SUBSETS. Fourteen in All; on and off are disjoint, both
 *      non-empty, and together exactly the fourteen. Pressing back to All restores
 *      all fourteen — verified by driving the shipped click handler, not by
 *      reasoning about it.
 *   5. THE FILTER TOUCHES NOTHING ELSE. Clicking rebuilds no row, writes no
 *      innerHTML, calls no scoring engine, reorders nothing, and mutates not one
 *      field of the data it was handed.
 *   6. THE LABELS DESCRIBE, THEY DO NOT RANK. No slice is called secondary,
 *      supporting, lesser or minor, on the buttons or anywhere on the default
 *      face, and each slice states its own size.
 *   7. THE CONTROL EARNS ITS PLACE. It is drawn only when both slices would have
 *      something in them: never over a one-row list, never over an act whose
 *      mappings all sit in one category, never over one tied across every
 *      category it touches (a split with nothing off-axis).
 *
 *   node scripts/test-big-picture-filters.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "bill-detail.js"), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);
const die = (msg) => { console.error(`✗ big-picture filters: ${msg}`); process.exit(1); };

// ── the fixture: H.R. 1 exactly as the Voting Record API hands it over ────────
const SEED = JSON.parse(readFileSync(join(ROOT, "db/exec-action-seed.json"), "utf8"));
const HR1 = SEED.actions.trump.find((a) => a.documentId === "Public Law 119-21");
if (!HR1 || !HR1.issues || HR1.issues.length < 9) die("the H.R. 1 seed is missing or too small to slice");
const ISSUES = HR1.issues.map((m) => ({
  issueKey: m.issueKey,
  supportMeaning: m.direction === "opposes" ? "yea_opposes" : "yea_supports",
  weight: m.weight,
  rationale: m.rationale || "",
}));
const N = ISSUES.length;
// The expected axis, counted here from the category table rather than taken from
// the panel: each key's core category (coreIssueForKey), the category with the
// most keys wins, and a tie puts every tied category on-axis.
function expectAxis(win, issues) {
  const cat = {}, count = {};
  for (const i of issues) {
    if (cat[i.issueKey]) continue;
    const core = win.coreIssueForKey(i.issueKey);
    cat[i.issueKey] = core && core.key ? core.key : "issue:" + i.issueKey;
    count[cat[i.issueKey]] = (count[cat[i.issueKey]] || 0) + 1;
  }
  const top = Math.max(0, ...Object.values(count));
  return (k) => (cat[k] ? (count[cat[k]] === top ? "on" : "off") : "");
}
const MEASURE = {
  id: 1, number: "H.R. 1", congress: 119, chamber: "house", status: "enacted",
  title: "One Big Beautiful Bill Act",
  summary: "Reconciliation vehicle carrying tax, health, nutrition, immigration and energy provisions.",
  source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/1", label: "Congress.gov" },
};

// ── boot the shipped panel, keeping the stylesheet and the click handlers ─────
// The panel injects its CSS through a <style> element and wires its behaviour
// through delegated listeners on the overlay it creates. Both are captured here
// so the filter can be tested as a browser would run it: real rules, real
// handler, real attribute writes.
function boot() {
  const win = makeSandbox();
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  const clicks = [];
  let css = "";
  const mk = win.document.createElement;
  win.document.createElement = (tag) => {
    const el = mk(tag);
    if (tag === "style") Object.defineProperty(el, "textContent", { set(v) { css = v; }, get() { return css; }, configurable: true });
    el.addEventListener = (type, fn) => { if (type === "click") clicks.push(fn); };
    return el;
  };
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "receipt-cards.js", "bill-detail.js"]) {
    vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  if (!win.PDXBillDetail || typeof win.PDXBillDetail.open !== "function") die("PDXBillDetail.open() is unavailable");
  return { win, capture, clicks, css: () => css };
}

async function render(b, data) {
  b.win.PDXBills = {
    get: () => Promise.resolve(data),
    list: () => Promise.resolve({ items: [] }),
    listSync: () => ({ items: [] }),
    isFollowed: () => false,
  };
  b.win.PDXBillDetail.open(1);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  return b.capture.innerHTML;
}

const DATA = { measure: MEASURE, issues: ISSUES, rollcalls: [], positions: [], provisions: [], actions: [] };
const BEFORE = JSON.stringify(DATA);
const B = boot();
if (typeof B.win.coreIssueForKey !== "function") die("coreIssueForKey is unavailable — the axis cannot be counted");
const AXIS = expectAxis(B.win, ISSUES);
const MAIN_N = ISSUES.filter((i) => AXIS(i.issueKey) === "on").length;
const OTHER_N = N - MAIN_N;
const HTML = await render(B, DATA);
const CSS = B.css();
if (!HTML || HTML.length < 1500) die(`the act face rendered ${HTML.length} characters — nothing below can be trusted`);
if (!CSS || CSS.length < 1500) die("the panel's stylesheet was never captured — the hiding rules cannot be audited");

console.log(`\n🔎 big-picture filters — H.R. 1: ${N} topics, ${MAIN_N} on-axis, ${OTHER_N} off-axis`);
ok(MAIN_N > 0 && OTHER_N > 0, `fixture drift: H.R. 1 no longer splits into two non-empty lanes (${MAIN_N}/${OTHER_N})`);

// ── read the ledger back off the markup ───────────────────────────────────────
const LIST_OPEN = HTML.match(/<div class="bd-omni-list"([^>]*)>/);
if (!LIST_OPEN) die("the topic list element is not in the markup");
const ROWS = [...HTML.matchAll(/<div class="bd-omni-row[^"]*" data-bd-lane="(on|off)">[\s\S]*?data-issue="([^"]+)"/g)]
  .map((m) => ({ lane: m[1], key: m[2] }));
if (ROWS.length !== N) die(`read ${ROWS.length} ledger rows off the markup, expected ${N}`);

// ── a tiny CSS engine, so the visible set is computed and not assumed ─────────
// Every rule in the shipped sheet is parsed. A rule counts as HIDING when its
// declaration block would take a row out of the flow or cut the list short. The
// two the filter installs are then read for what they actually say — which view
// value hides which lane — rather than being hard-coded here, so a future rule
// that hides a lane under "all" would be caught by the same parse that finds the
// legitimate ones.
const RULES = [...CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)]
  .map((m) => ({ sel: m[1].trim().replace(/^\s*\n?/, ""), decl: m[2] }))
  .filter((r) => r.sel && !r.sel.startsWith("@"));
const HIDES = /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?!\.)|max-height\s*:|line-clamp\s*:|content-visibility\s*:\s*hidden/;
const rowRules = RULES.filter((r) => /\.bd-omni-row|\.bd-omni-list|\.bd-omni-head|\.bd-omni-why|\.bd-issuejump/.test(r.sel));
const hidingRowRules = rowRules.filter((r) => HIDES.test(r.decl));
const FILTER_RULE = /^\.bd-omni-list\[data-bd-view="([a-z]+)"\]\s+\.bd-omni-row\[data-bd-lane="(on|off)"\]$/;
const parsedFilter = hidingRowRules.map((r) => r.sel.match(FILTER_RULE)).filter(Boolean)
  .map((m) => ({ view: m[1], lane: m[2] }));
const hidden = (view, lane) => parsedFilter.some((p) => p.view === view && p.lane === lane);
const visible = (view) => ROWS.filter((r) => !hidden(view, r.lane));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the default is every topic, and it is the shipped attribute");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(LIST_OPEN[1], 'data-bd-view="all"', "the topic list does not ship in the all-topics state");
  eq((HTML.match(/data-bd-view="[a-z]*"/g) || []).length, 1,
    "more than one element carries the view attribute — the visible state must live in exactly one place");
  ok(!/data-bd-view="(on|off)"/.test(HTML),
    "the act face opens with a slice already applied");
  eq(visible("all").length, N, `All topics shows ${N} of ${N} rows`);
  const pressed = [...HTML.matchAll(/data-bd-view-set="([a-z]+)" aria-pressed="true"/g)].map((m) => m[1]);
  eq(JSON.stringify(pressed), JSON.stringify(["all"]), "the pressed button on arrival is not All topics");
  // The lead sentence and the button agree with the row count, so no control on
  // the face promises a different-sized act than the one below it.
  has(HTML, `${N} topics mapped`, "the face does not state the full topic count anywhere");
  has(HTML, `All topics (${N})`, "the All button does not state the full topic count");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no CSS hides a topic row except the active filter");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(rowRules.length > 0, "no rule in the sheet addresses the ledger at all — the CSS capture is wrong");
  eq(hidingRowRules.length, 2,
    `exactly two rules may hide a topic row; the sheet has ${hidingRowRules.length}: ` +
    hidingRowRules.map((r) => r.sel).join(" / "));
  eq(parsedFilter.length, 2,
    "a rule hides a ledger row without being the view filter: " +
    hidingRowRules.map((r) => r.sel).join(" / "));
  // Neither of them fires in the default state, which is what makes "all" all.
  ok(!parsedFilter.some((p) => p.view === "all"),
    "a hiding rule is keyed to the all-topics view, so the default face is not the whole act");
  ok(parsedFilter.some((p) => p.view === "on" && p.lane === "off"), "the on-axis slice does not hide the off-axis lane");
  ok(parsedFilter.some((p) => p.view === "off" && p.lane === "on"), "the off-axis slice does not hide the on-axis lane");
  // Every row's lane is the axis counted from the category table, not a flag.
  for (const r of ROWS) eq(r.lane, AXIS(r.key), `${r.key} carries the wrong lane`);
  // Nothing truncates the list by position or by height, which is the other way
  // a topic disappears without anyone deciding to remove it.
  ok(!rowRules.some((r) => /nth-child|nth-of-type|:not\(/.test(r.sel)),
    "a positional selector addresses the ledger — that hides topics by where they landed, not by what they are");
  ok(!RULES.some((r) => /\.bd-omni-list/.test(r.sel) && /overflow\s*:\s*hidden|max-height/.test(r.decl)),
    "the topic list is height-capped, so the tail of a long act is cut off rather than filtered");
  ok(!RULES.some((r) => /\.bd-issuejump|\.bd-lite-chips/.test(r.sel) && HIDES.test(r.decl)),
    "the jump chips can be hidden by CSS, which would shrink the act's index behind the reader's back");
  // The filter's reach is the list and nothing else: every lane key in the whole
  // panel is on a ledger row.
  eq((HTML.match(/data-bd-lane="/g) || []).length, N,
    "something outside the topic ledger carries a lane key, so a slice could hide part of another section");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · it fails open — no script, no hidden rows");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The shipped value is "all", and nothing but a click writes the attribute, so
  // a reader without JavaScript is permanently in the all-topics state.
  eq(visible("all").length, N, "the state the markup ships in shows every row");
  eq(visible("").length, N, "an empty view value hides rows instead of falling back to all");
  eq(visible("garbage").length, N, "an unrecognised view value hides rows instead of falling back to all");
  eq(visible(null).length, N, "a missing view attribute hides rows instead of falling back to all");
  const writes = [...SRC.matchAll(/setAttribute\('data-bd-view'/g)].length;
  eq(writes, 1, "more than one code path writes the view attribute");
  ok(/function setOmniView/.test(SRC) && SRC.indexOf("setAttribute('data-bd-view'") > SRC.indexOf("function setOmniView"),
    "the one write does not live in the click handler, so something else can pre-apply a slice");
  // No timer, no storage, no URL parameter can arrive later and slice the list.
  const fn = SRC.slice(SRC.indexOf("function setOmniView"), SRC.indexOf("function openIssue"));
  ok(!/localStorage|sessionStorage|location|setTimeout/.test(fn),
    "the filter reads something outside the click, so the default could be restored as a remembered slice");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the slices are subsets, and All comes back");
// ═════════════════════════════════════════════════════════════════════════════
{
  const all = visible("all").map((r) => r.key);
  const main = visible("on").map((r) => r.key);
  const other = visible("off").map((r) => r.key);
  eq(main.length, MAIN_N, "the on-axis slice does not show exactly the on-axis mappings");
  eq(other.length, OTHER_N, "the off-axis slice does not show exactly the off-axis mappings");
  ok(main.every((k) => AXIS(k) === "on"), "the on-axis slice shows an off-axis topic");
  ok(other.every((k) => AXIS(k) === "off"), "the off-axis slice shows an on-axis topic");
  eq(main.length + other.length, N, "the two slices do not add up to the act");
  ok(main.every((k) => all.includes(k)), "the main slice contains a topic the full list does not");
  ok(other.every((k) => all.includes(k)), "the other slice contains a topic the full list does not");
  ok(!main.some((k) => other.includes(k)), "a topic appears in both slices");
  eq(JSON.stringify([...main, ...other].sort()), JSON.stringify([...all].sort()),
    "slicing the act loses or duplicates a topic");
  // Order inside a slice is the order of the full list, so a slice is a view of
  // the same index rather than a second, differently-argued one.
  eq(JSON.stringify(main), JSON.stringify(all.filter((k) => main.includes(k))),
    "the main slice reorders the rows it keeps");
  eq(JSON.stringify(other), JSON.stringify(all.filter((k) => other.includes(k))),
    "the other slice reorders the rows it keeps");
  // Now drive the shipped handler. This is the round trip the brief asks for:
  // all → main → other → all, with the counts recomputed from the real CSS each
  // time and the row elements never touched.
  const rowNodes = ROWS.map((r) => {
    const attrs = { "data-bd-lane": r.lane };
    return { key: r.key, getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); }, attrs };
  });
  let listWrites = 0;
  const listAttrs = { "data-bd-view": "all" };
  const list = {
    getAttribute: (k) => (k in listAttrs ? listAttrs[k] : null),
    setAttribute: (k, v) => { listAttrs[k] = String(v); },
    get innerHTML() { return "<rows>"; },
    set innerHTML(_v) { listWrites++; },
  };
  const btnAttrs = [
    { "data-bd-view-set": "all", "aria-pressed": "true" },
    { "data-bd-view-set": "on", "aria-pressed": "false" },
    { "data-bd-view-set": "off", "aria-pressed": "false" },
  ];
  const wrap = {
    querySelector: (sel) => (sel === ".bd-omni-list" ? list : null),
    querySelectorAll: (sel) => (sel === "[data-bd-view-set]" ? btns : []),
  };
  const btns = btnAttrs.map((a) => ({
    getAttribute: (k) => (k in a ? a[k] : null),
    setAttribute: (k, v) => { a[k] = String(v); },
    hasAttribute: (k) => k in a,
    closest: (sel) => (sel === ".bd-omni-view" ? wrap : (sel === "[data-bd-view-set]" ? null : null)),
  }));
  // The delegated listener resolves the button off the event target, so each fake
  // button answers closest() for its own selector too.
  btns.forEach((b) => {
    const own = b.closest;
    b.closest = (sel) => (sel === "[data-bd-view-set]" ? b : own(sel));
  });
  ok(B.clicks.length >= 1, "the panel registered no click handler — the filter cannot be driven");
  const press = (i) => { for (const h of B.clicks) h({ target: btns[i] }); };
  let calls = 0;
  const realBreakdown = B.win._measureComponentBreakdown;
  B.win._measureComponentBreakdown = function () { calls++; return realBreakdown.apply(this, arguments); };
  const snapRows = JSON.stringify(rowNodes.map((r) => r.attrs));

  press(1);
  eq(list.getAttribute("data-bd-view"), "on", "pressing the on-axis slice did not set the view");
  eq(visible(list.getAttribute("data-bd-view")).length, MAIN_N, `the on-axis slice shows ${MAIN_N} rows`);
  eq(btnAttrs.map((a) => a["aria-pressed"]).join(","), "false,true,false", "the pressed state did not follow the click");

  press(2);
  eq(list.getAttribute("data-bd-view"), "off", "pressing the off-axis slice did not set the view");
  eq(visible(list.getAttribute("data-bd-view")).length, OTHER_N, `the off-axis slice shows ${OTHER_N} rows`);

  press(0);
  eq(list.getAttribute("data-bd-view"), "all", "pressing All topics did not restore the full view");
  eq(visible(list.getAttribute("data-bd-view")).length, N, `switching back restores all ${N} rows`);
  eq(btnAttrs.map((a) => a["aria-pressed"]).join(","), "true,false,false", "All topics is not the pressed button again");

  eq(listWrites, 0, "the filter rewrote the list's contents — rows have to survive a slice, not be regenerated");
  eq(JSON.stringify(rowNodes.map((r) => r.attrs)), snapRows, "the filter changed the rows themselves");
  eq(calls, 0, "the filter called the scoring engine — a view control may not recompute anything");
  B.win._measureComponentBreakdown = realBreakdown;
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · slicing changes nothing but what is on screen");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(JSON.stringify(DATA), BEFORE,
    "rendering the act mutated the data it was handed — the mappings must come back out untouched");
  ok(ISSUES.every((i) => !("isPrimary" in i)), "the render wrote a retired isPrimary flag onto the mappings");
  // The filter's whole implementation, read as source: attribute writes only.
  const fn = SRC.slice(SRC.indexOf("function setOmniView"), SRC.indexOf("function openIssue"));
  ok(!/innerHTML|appendChild|removeChild|\.remove\(\)|insertAdjacentHTML/.test(fn),
    "the filter builds or removes DOM instead of flipping one attribute");
  ok(!/sort\(|slice\(|filter\(|map\(/.test(fn), "the filter reorders or rebuilds the list");
  ok(!/_measureComponentBreakdown|weight|score|rank|isPrimary/.test(fn),
    "the filter reads the scoring inputs — it is supposed to know nothing but which button was pressed");
  // Dossier completeness: everything the reader can still reach is untouched by a
  // slice, because it lives outside the list the attribute governs.
  const listStart = HTML.indexOf('<div class="bd-omni-list"');
  const listEnd = HTML.indexOf('</section>', listStart);
  const inList = HTML.slice(listStart, listEnd);
  const outList = HTML.slice(0, listStart) + HTML.slice(listEnd);
  eq((outList.match(/class="bd-person bd-issuejump"/g) || []).length, N,
    "the jump chips are not all outside the filtered list, so a slice would shrink the act's index too");
  eq((inList.match(/data-bd-lane=/g) || []).length, N, "the lane keys are not confined to the ledger rows");
  for (const m of ISSUES) {
    has(HTML, `data-issue="${m.issueKey}"`, `${m.issueKey} is not reachable from the act face`);
  }
  // Every row is in the document in every state — hidden is not deleted, so the
  // page's text, its search, and its share all still carry the whole act.
  eq(ROWS.length, N, "the document does not hold every row regardless of the slice on screen");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the labels describe the slices, they do not rank them");
// ═════════════════════════════════════════════════════════════════════════════
{
  const labels = [...HTML.matchAll(/data-bd-view-set="([a-z]+)" aria-pressed="(?:true|false)">([^<]*)</g)]
    .map((m) => ({ key: m[1], text: m[2] }));
  eq(labels.length, 3, "the view control does not offer exactly All topics and its two slices");
  for (const l of labels) {
    ok(!/primar|secondar|support|minor|major|lesser|footnote|merely|only\b|junk|filler/i.test(l.text),
      `the ${l.key} button ranks its slice instead of describing it: ${JSON.stringify(l.text)}`);
    ok(/\(\d+\)$/.test(l.text), `the ${l.key} button does not say how many topics are in it: ${JSON.stringify(l.text)}`);
  }
  const count = (k) => Number((labels.find((l) => l.key === k).text.match(/\((\d+)\)$/) || [])[1]);
  eq(count("all"), N, "the All button's count is not the act's topic count");
  eq(count("on"), MAIN_N, "the on-axis button's count is not the size of the slice it shows");
  eq(count("off"), OTHER_N, "the off-axis button's count is not the size of the slice it shows");
  eq(count("on") + count("off"), count("all"), "the two slice counts do not add up to the whole");
  // The default face — what a reader sees before pressing anything — carries no
  // vocabulary that would tell them part of the act does not count.
  for (const w of ["Primary issue", "Secondary", "secondary", "Supporting only", "supporting only",
                   "lesser", "Lesser", "footnote", "side issue", "minor provision", "just a", "merely"]) {
    hasNot(HTML, w, `the act face calls part of the act ${JSON.stringify(w)}`);
  }
  hasNot(HTML, "bd-omni-primary", "the primary badge is back on the ledger row");
  // Neither lane is styled as the loud one: the two lane values get no colour,
  // weight or border of their own anywhere in the sheet.
  const laneStyled = RULES.filter((r) => /data-bd-lane/.test(r.sel) && !FILTER_RULE.test(r.sel));
  eq(laneStyled.length, 0,
    "the lane key is being styled, which paints a rank the copy refuses to say: " + laneStyled.map((r) => r.sel).join(" / "));
  // And no party anywhere near the topic ledger.
  ok(!/Republican|Democrat|\bGOP\b|party-line/i.test(inSection(HTML)),
    "party framing appears on the act's topic face");
}
function inSection(html) {
  const s = html.indexOf("Every topic this act touches");
  const e = html.indexOf("</section>", s);
  return s < 0 ? "" : html.slice(s, e);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the control is drawn only when both slices would hold something");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Fixtures built by category, not by flag: one category only (all on-axis);
  // one key from each of several categories (a tie, so every key is on-axis and
  // nothing is off); two keys in one category plus one elsewhere (2 on, 1 off).
  const byCat = {};
  for (const i of ISSUES) { const c = B.win.coreIssueForKey(i.issueKey).key; (byCat[c] = byCat[c] || []).push(i); }
  const bigCat = Object.values(byCat).find((l) => l.length >= 2);
  const oneEach = Object.values(byCat).map((l) => l[0]);
  const lone = Object.values(byCat).find((l) => l !== bigCat)[0];
  ok(bigCat && oneEach.length >= 3 && lone, "fixture drift: H.R. 1 no longer spans enough categories to build the cases");
  const cases = [
    { name: "a mixed act", issues: ISSUES, filter: true, rows: N },
    { name: "an act whose every mapping sits in one category", issues: bigCat, filter: false, rows: bigCat.length },
    { name: "an act tied across every category it touches", issues: oneEach, filter: false, rows: oneEach.length },
    { name: "a single-topic act", issues: [ISSUES[0]], filter: false, rows: 1 },
    { name: "a three-topic act, two in one category and one elsewhere", issues: [bigCat[0], bigCat[1], lone], filter: true, rows: 3 },
  ];
  for (const c of cases) {
    const b = boot();
    const html = await render(b, { ...DATA, issues: c.issues });
    eq(html.includes("bd-viewfilter"), c.filter,
      c.filter ? `${c.name} should offer the view control` : `${c.name} should not offer a view control`);
    eq((html.match(/class="bd-omni-row/g) || []).length, c.rows, `${c.name} did not render every one of its topics`);
    has(html, 'data-bd-view="all"', `${c.name} does not ship in the all-topics state`);
    ok(!/data-bd-view="(on|off)"/.test(html), `${c.name} ships with a slice applied`);
    if (!c.filter) hasNot(html, "data-bd-view-set", `${c.name} drew slice buttons with nothing to slice`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · no other act surface ships a pre-applied slice");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The ledger is not the only place an act's topics are printed. Wherever else
  // they are, the rule is the same: the whole list, in the shared order, with no
  // lane hidden and no flag promoted. These surfaces have no view control at all,
  // which is the simplest way to satisfy it — this guards that they stay that way
  // rather than growing a filter that ships pre-applied.
  const decomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const f of ["digital-library.js", "all-seeing-eye.js", "spotlight-hub.js", "profiles-full.js", "exec-record-ui.js"]) {
    const src = decomment(readFileSync(join(ROOT, f), "utf8"));
    ok(!/data-bd-view="(?:on|off)"|data-bd-lane="(?:on|off)"/.test(src),
      `${f} carries the ledger's lane markup without the ledger's guarantees`);
    // The flag may be read — membership fixes and internal floors legitimately do —
    // but it may not become a word the reader sees, and it may not order a list.
    ok(!/>\s*(primary|supporting|secondary)\s*</i.test(src),
      `${f} prints a rank word where a topic's label belongs`);
    ok(!/(primary|supporting|secondary)\s+(issue|topic|provision)/i.test(src),
      `${f} names one of a document's topics as the ranked one`);
    const sortsByFlag = src.split("\n").filter((l) => /\bsort\(/.test(l) && /isPrimary|primaryIssue/.test(l));
    eq(sortsByFlag.length, 0,
      `${f} sorts a topic list by the curated flag: ${sortsByFlag.map((l) => l.trim().slice(0, 80)).join(" / ")}`);
  }
  // The one surface that does have a control keeps it in one file, so there is
  // exactly one implementation to audit.
  const others = ["digital-library.js", "all-seeing-eye.js", "spotlight-hub.js", "profiles-full.js", "exec-record-ui.js"]
    .filter((f) => readFileSync(join(ROOT, f), "utf8").includes("bd-viewfilter"));
  eq(others.length, 0, `the act view control has a second implementation in ${others.join(", ")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ big-picture filters: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ big-picture filters: all ${passed} assertions passed — ${N} topics by default, ${MAIN_N}+${OTHER_N} on demand, nothing hidden that the reader did not hide\n`);
