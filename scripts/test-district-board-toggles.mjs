#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for THE MANDATE PILL, AND THE TYPE AND TIME TOGGLES
// ─────────────────────────────────────────────────────────────────────────────
// On every board (SD-3, a generated HD-29, the statewide ut-gov, and a document
// with no seat):
//
//   1. EVERY MANDATE ROW, in the table and in the pinned strip, carries the ⚑
//      and the "Mandate" pill; no measure row ever gets the pill.
//   2. THE TOGGLE ROW sits under the search field: Type (All · Topics ·
//      Mandates) and Time (All · Current · Past), All pressed by default.
//   3. TYPE: "Mandates" hides every measure row, its groups and its parents and
//      the pinned issues; "Topics" hides the mandate rows and pinned mandates.
//   4. TIME: "Current" hides measures whose Congress is below the seat's highest
//      (and, on a Utah seat, sessions before its latest year); "Past" keeps only
//      those. A pinned issue with no measure in the chosen time is hidden.
//   5. CLEARING either toggle restores the full list, byte for byte.
//   6. EMPTY RESULTS print the existing no-match line, and nothing is invented.
//   7. THE IN-PLACE FILTER (applyView over the painted band) agrees with a
//      fresh render, row for row.
//   8. Copy, the 100-row read, and the shell.
//
//   node scripts/test-district-board-toggles.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const MOD = R("district-board.js");
const SW = R("sw.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

function boot(seat) {
  const win = makeSandbox();
  if (seat) win.__PDX_DISTRICT_BOARD_SEAT = seat;
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  for (const f of ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"]) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  return win.PDXDistrictBoard;
}

// ── FIXTURES ────────────────────────────────────────────────────────────────
// A federal seat: the 119th is current, the 118th and 117th are past.
const fed = (id, number, title, key, congress) => ({
  kind: "vote", measureId: id, number, title, congress,
  measureIdent: null,
  issues: key ? [{ issueKey: key, weight: 1, isPrimary: false, supportMeaning: "", rationale: null }] : [],
});
const FED = [
  fed(1, "H.R. 1", "Current Housing Act", "housing", 119),
  fed(2, "H.R. 2", "Old Housing Act", "housing", 118),
  fed(3, "S. 3", "Current Water Act", "water", 119),
  fed(4, "S. 4", "Old Schools Act", "public_schools", 117),
  fed(5, "H.R. 5", "Current Unfiled Act", null, 119),
];
// A Utah seat: no Congress on any row, only the general session.
const ut = (id, number, title, key, session) => ({
  kind: "vote", measureId: id, number, title, congress: null,
  measureIdent: { session, billUrl: null, officialTitle: null, readFrom: null, readFromUrl: null },
  issues: key ? [{ issueKey: key, weight: 1, isPrimary: false, supportMeaning: "", rationale: null }] : [],
});
const UT = [
  ut(11, "H.B. 101", "Starter Home Amendments", "housing", "2025GS"),
  ut(12, "H.B. 77", "Older Housing Bill", "housing", "2024GS"),
  ut(13, "S.B. 57", "Public Education Funding", "public_schools", "2023GS"),
  ut(14, "H.B. 208", "Great Salt Lake Watershed", "water", "2025GS"),
];
const ROOMS = [
  { issueKey: "housing", polls: 4, comments: 1 },
  { issueKey: "public_schools", polls: 2, comments: 1 },
  { issueKey: "water", polls: 1, comments: 0 },
];
const MANDATES = [
  { id: 7, title: "Publish every committee vote within 24 hours", category: "Government Transparency", supportCount: 3 },
  { id: 8, title: "Open the redistricting map files", category: "", supportCount: 1 },
];
const FLAG = "⚑";
const PILL = '<span class="pdxdb-mandate-tag pdxdb-mandate-pill">Mandate</span>';

// ── READERS OVER THE RENDERED BAND ──────────────────────────────────────────
const isHidden = (open) => /\shidden(?=[\s>]|$)/.test(open);
const measureRows = (h) => [...h.matchAll(/<tr class="pdxdb-row"([^>]*)>[\s\S]*?<a class="pdxdb-m-link"[^>]*>([^<]*)</g)]
  .map((x) => ({ title: x[2], hidden: isHidden(x[1]), time: (/data-pdxdb-time="([^"]*)"/.exec(x[1]) || [])[1] }));
const groupsOf = (h) => [...h.matchAll(/<details class="pdxdb-group[^"]*" data-pdxdb-group="([^"]*)"([^>]*)>/g)]
  .map((x) => ({ key: x[1], hidden: isHidden(x[2]) }));
const parentsOf = (h) => [...h.matchAll(/<details class="pdxdb-parent" data-pdxdb-parent="([^"]*)"([^>]*)>/g)]
  .map((x) => ({ key: x[1], hidden: isHidden(x[2]) }));
const mandateLis = (h) => [...h.matchAll(/<li class="pdxdb-mandate pdxdb-mandate-c"([^>]*)>([\s\S]*?)<\/li>/g)]
  .map((x) => ({ id: Number((/data-pdxdb-mandate="(\d+)"/.exec(x[1]) || [])[1]), hidden: isHidden(x[1]), body: x[2] }));
const mandateList = (h) => { const m = /<ul class="pdxdb-mandates"([^>]*)>/.exec(h); return m ? { hidden: isHidden(m[1]) } : null; };
const pinsOf = (h) => [...h.matchAll(/<li class="pdxdb-pin pdxdb-pin--(mandate|issue)[^"]*"([^>]*)>([\s\S]*?)<\/li>/g)]
  .map((x) => ({ kind: x[1], hidden: isHidden(x[2]), body: x[3], key: (/data-pdxdb-pin-(?:issue|mandate)="([^"]*)"/.exec(x[2]) || [])[1] }));
const strip = (h) => { const m = /<section class="pdxdb-pinned"([^>]*)>/.exec(h); return m ? { hidden: isHidden(m[1]) } : null; };
const noMatchShown = (h) => !/data-pdxdb-find-none hidden>/.test(h);
const visibleTitles = (h) => measureRows(h).filter((r) => !r.hidden).map((r) => r.title);
const uniq = (a) => [...new Set(a)];

// ── A SMALL DOM, FOR THE IN-PLACE FILTER ────────────────────────────────────
// Enough of Element for applyView(): attributes, hidden, open, classList,
// querySelector(All) over attribute-presence selectors (comma lists), closest.
const VOID = new Set(["input", "br", "img", "meta", "link", "hr"]);
function parseDom(html) {
  const root = mk("root", {});
  const stack = [root];
  const re = /<(\/?)([a-zA-Z0-9]+)((?:\s+[a-zA-Z0-9-:]+(?:="[^"]*")?)*)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, close, tag, attrs, self] = m;
    if (close) {
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const a = {};
    for (const x of attrs.matchAll(/([a-zA-Z0-9-:]+)(?:="([^"]*)")?/g)) a[x[1]] = x[2] == null ? "" : x[2];
    const el = mk(tag, a);
    el.parentNode = stack[stack.length - 1];
    el.parentNode.children.push(el);
    if (!self && !VOID.has(tag)) stack.push(el);
  }
  return root;
}
function mk(tag, attrs) {
  const el = {
    tag, attrs, children: [], parentNode: null,
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
    removeAttribute(k) { delete this.attrs[k]; },
    get hidden() { return this.hasAttribute("hidden"); },
    set hidden(v) { if (v) this.attrs.hidden = ""; else delete this.attrs.hidden; },
    get open() { return this.hasAttribute("open"); },
    set open(v) { if (v) this.attrs.open = ""; else delete this.attrs.open; },
    get classList() {
      const self = this;
      const list = () => String(self.attrs.class || "").split(/\s+/).filter(Boolean);
      return {
        add(c) { const l = list(); if (!l.includes(c)) l.push(c); self.attrs.class = l.join(" "); },
        remove(c) { self.attrs.class = list().filter((x) => x !== c).join(" "); },
        contains(c) { return list().includes(c); },
      };
    },
    querySelectorAll(sel) {
      const tests = sel.split(",").map((s) => s.trim()).map((s) => {
        let mm = /^\[([a-zA-Z0-9-]+)\]$/.exec(s);
        if (mm) return (e) => e.hasAttribute(mm[1]);
        mm = /^\.([a-zA-Z0-9_-]+)$/.exec(s);
        if (mm) return (e) => e.classList.contains(mm[1]);
        throw new Error(`fake DOM: unsupported selector ${s}`);
      });
      const out = [];
      const walk = (n) => { for (const c of n.children) { if (tests.some((t) => t(c))) out.push(c); walk(c); } };
      walk(this);
      return out;
    },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
  };
  return el;
}
// The DOM's verdict, read the same way as the markup's.
function domState(root) {
  const rows = root.querySelectorAll("[data-pdxdb-find]").filter((e) => e.tag === "tr")
    .map((e) => ({ title: (e.children[0] && e.children[0].children[0] ? "" : ""), hidden: e.hidden, find: e.getAttribute("data-pdxdb-find") }));
  return {
    rows: rows.map((r) => `${r.find}|${r.hidden}`),
    groups: root.querySelectorAll("[data-pdxdb-group]").map((e) => `${e.getAttribute("data-pdxdb-group")}|${e.hidden}`),
    parents: root.querySelectorAll("[data-pdxdb-parent]").map((e) => `${e.getAttribute("data-pdxdb-parent")}|${e.hidden}`),
    mandates: root.querySelectorAll("[data-pdxdb-mandate]").map((e) => `${e.getAttribute("data-pdxdb-mandate")}|${e.hidden}`),
    list: root.querySelectorAll("[data-pdxdb-mandates]").map((e) => e.hidden).join(","),
    pins: root.querySelectorAll("[data-pdxdb-pin-mandate],[data-pdxdb-pin-issue]").map((e) => e.hidden).join(","),
    strip: root.querySelectorAll("[data-pdxdb-pinned]").map((e) => e.hidden).join(","),
    none: root.querySelectorAll("[data-pdxdb-find-none]").map((e) => e.hidden).join(","),
    pressed: root.querySelectorAll("[data-pdxdb-tg-type],[data-pdxdb-tg-time]")
      .filter((e) => e.getAttribute("aria-pressed") === "true")
      .map((e) => (e.hasAttribute("data-pdxdb-tg-type") ? "type:" : "time:") + (e.getAttribute("data-pdxdb-tg-type") ?? e.getAttribute("data-pdxdb-tg-time"))).join(","),
  };
}

const SEATS = [["ut-sd-3", UT], ["ut-hd-29", UT], ["ut-gov", FED], ["", FED]];

for (const [seat, ITEMS] of SEATS) {
  const name = seat || "no seat";
  const B = boot(seat);
  B.setQuery(""); B.setCategory(""); B.setType(""); B.setTime("");
  const ALL = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);
  const composer = B.composerBoard();

  // ═══════════════════════════════════════════════════════════════════════════
  section(`1 · ${name}: the ⚑ and the "Mandate" pill on every mandate row, never on a measure`);
  // ═══════════════════════════════════════════════════════════════════════════
  const ml = mandateLis(ALL);
  eq(ml.length, 2, `${name}: two mandate rows in the table`);
  for (const r of ml) {
    ok(r.body.indexOf(FLAG) >= 0 && r.body.indexOf(FLAG) < r.body.indexOf(PILL), `${name}: table mandate ${r.id} has ⚑ then the pill`);
  }
  if (composer) {
    const pm = pinsOf(ALL).filter((p) => p.kind === "mandate");
    eq(pm.length, 2, `${name}: two pinned mandates`);
    for (const p of pm) ok(p.body.indexOf(FLAG) >= 0 && p.body.indexOf(FLAG) < p.body.indexOf(PILL), `${name}: pinned mandate ${p.key} has ⚑ then the pill`);
    eq(ALL.split(PILL).length - 1, 4, `${name}: the pill prints exactly once per mandate row and pin`);
  } else {
    eq(ALL.split(PILL).length - 1, 2, `${name}: the pill prints exactly once per mandate row`);
  }
  const trs = [...ALL.matchAll(/<tr class="pdxdb-row"[\s\S]*?<\/tr>/g)].map((x) => x[0]);
  ok(trs.length >= ITEMS.length && trs.every((t) => !t.includes("pdxdb-mandate-pill") && !t.includes(FLAG)),
    `${name}: no measure row carries the pill or the ⚑`);
  ok(pinsOf(ALL).filter((p) => p.kind === "issue").every((p) => !p.body.includes("pdxdb-mandate-pill")), `${name}: no pinned issue carries the pill`);

  // ═══════════════════════════════════════════════════════════════════════════
  section(`2 · ${name}: the toggle row sits under the search field`);
  // ═══════════════════════════════════════════════════════════════════════════
  const tg = /<div class="pdxdb-toggles"[\s\S]*?<\/span><\/div>/.exec(ALL);
  ok(!!tg, `${name}: the toggle row is printed`);
  const tgh = tg ? tg[0] : "";
  for (const [attr, vals, labels] of [["type", ["", "topics", "mandates"], ["All", "Topics", "Mandates"]], ["time", ["", "current", "past"], ["All", "Current", "Past"]]]) {
    const got = [...tgh.matchAll(new RegExp(`data-pdxdb-tg-${attr}="([^"]*)" aria-pressed="(true|false)">([^<]*)<`, "g"))];
    eq(got.map((g) => g[1]).join("|"), vals.join("|"), `${name}: ${attr} toggles in order`);
    eq(got.map((g) => g[3]).join("|"), labels.join("|"), `${name}: ${attr} toggles read ${labels.join(" · ")}`);
    eq(got.map((g) => g[2]).join("|"), "true|false|false", `${name}: ${attr} defaults to All`);
  }
  const at = { find: ALL.indexOf('class="pdxdb-find"'), tg: ALL.indexOf('class="pdxdb-toggles"') };
  ok(at.find >= 0 && at.tg > at.find, `${name}: the toggles follow the search field`);
  ok(!/<label class="pdxdb-find"[\s\S]*?pdxdb-toggles[\s\S]*?<\/label>/.test(ALL.slice(at.find, at.tg + 30)), `${name}: …outside the search label`);

  // ═══════════════════════════════════════════════════════════════════════════
  section(`3 · ${name}: Type`);
  // ═══════════════════════════════════════════════════════════════════════════
  B.setType("mandates");
  const TM = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);
  ok(measureRows(TM).length && measureRows(TM).every((r) => r.hidden), `${name}: Mandates hides every measure row`);
  ok(groupsOf(TM).every((g) => g.hidden), `${name}: …and every group`);
  ok(parentsOf(TM).every((p) => p.hidden), `${name}: …and every parent header`);
  ok(mandateList(TM) && !mandateList(TM).hidden && mandateLis(TM).every((r) => !r.hidden), `${name}: …and shows every mandate row`);
  if (composer) {
    ok(pinsOf(TM).filter((p) => p.kind === "issue").every((p) => p.hidden), `${name}: Mandates hides the pinned issues`);
    ok(pinsOf(TM).filter((p) => p.kind === "mandate").every((p) => !p.hidden), `${name}: …and keeps the pinned mandates`);
  }
  eq(noMatchShown(TM), false, `${name}: Mandates with mandates on hand is not a no-match`);
  B.setType("topics");
  const TT = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);
  ok(mandateList(TT).hidden && mandateLis(TT).every((r) => r.hidden), `${name}: Topics hides the mandate rows`);
  eq(visibleTitles(TT).length, visibleTitles(ALL).length, `${name}: …and keeps every measure row All showed`);
  if (composer) {
    ok(pinsOf(TT).filter((p) => p.kind === "mandate").every((p) => p.hidden), `${name}: Topics hides the pinned mandates`);
    ok(pinsOf(TT).filter((p) => p.kind === "issue").some((p) => !p.hidden), `${name}: …and keeps the pinned issues`);
  }
  B.setType("");
  eq(B.tableHtml("ok", ITEMS, ROOMS, MANDATES), ALL, `${name}: clearing Type restores the full list, byte for byte`);
  {
    B.setType("mandates");
    const none = B.tableHtml("ok", ITEMS, ROOMS, []);
    eq(noMatchShown(none), true, `${name}: Mandates with no mandate on hand prints the no-match line`);
    B.setType("");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section(`4 · ${name}: Time`);
  // ═══════════════════════════════════════════════════════════════════════════
  const pastTitles = ITEMS === FED ? ["Old Housing Act", "Old Schools Act"] : ["Older Housing Bill", "Public Education Funding"];
  const curTitles = ITEMS.map((i) => i.title).filter((t) => !pastTitles.includes(t));
  B.setTime("current");
  const TC = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);
  eq(uniq(visibleTitles(TC)).sort().join("|"), curTitles.slice().sort().join("|"),
    `${name}: Current keeps only the seat's latest sitting`);
  ok(measureRows(TC).filter((r) => pastTitles.includes(r.title)).every((r) => r.hidden),
    `${name}: Current hides every measure ${ITEMS === FED ? "whose Congress is below 119" : "from before the 2025 session"}`);
  ok(mandateLis(TC).every((r) => !r.hidden), `${name}: open mandates are current`);
  if (composer) {
    const ps = pinsOf(TC).filter((p) => p.kind === "issue");
    const schools = ps.find((p) => p.key === "public_schools");
    ok(!schools || schools.hidden, `${name}: a pinned issue with no current measure is hidden under Current`);
    ok(ps.some((p) => p.key === "housing" && !p.hidden), `${name}: …and one with a current measure stays`);
  }
  B.setTime("past");
  const TP = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);
  eq(uniq(visibleTitles(TP)).sort().join("|"), pastTitles.slice().sort().join("|"), `${name}: Past keeps only the older sittings`);
  ok(mandateList(TP).hidden, `${name}: Past hides the open mandates`);
  if (composer) {
    ok(pinsOf(TP).filter((p) => p.kind === "mandate").every((p) => p.hidden), `${name}: …and the pinned mandates`);
    const water = pinsOf(TP).find((p) => p.key === "water");
    ok(!water || water.hidden, `${name}: a pinned issue with no past measure is hidden under Past`);
  }
  B.setTime("");
  eq(B.tableHtml("ok", ITEMS, ROOMS, MANDATES), ALL, `${name}: clearing Time restores the full list, byte for byte`);
  {
    // Both toggles at once: Mandates + Past is empty, and says so.
    B.setType("mandates"); B.setTime("past");
    const e = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);
    eq(noMatchShown(e), true, `${name}: Mandates + Past is empty and prints the no-match line`);
    if (composer) ok(strip(e) && strip(e).hidden, `${name}: …and the pinned strip, with nothing left in it, is hidden`);
    B.setType(""); B.setTime("");
    eq(B.tableHtml("ok", ITEMS, ROOMS, MANDATES), ALL, `${name}: clearing both restores the full list`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section(`5 · ${name}: the toggles invent no category and keep the counts`);
  // ═══════════════════════════════════════════════════════════════════════════
  for (const [ty, ti] of [["mandates", ""], ["topics", ""], ["", "current"], ["", "past"]]) {
    B.setType(ty); B.setTime(ti);
    const h = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);
    eq(groupsOf(h).map((g) => g.key).join(","), groupsOf(ALL).map((g) => g.key).join(","), `${name} ${ty || ti}: the same groups, only hidden`);
    eq((/data-pdxdb-cat-count="(\d+)"/.exec(h) || [])[1], (/data-pdxdb-cat-count="(\d+)"/.exec(ALL) || [])[1], `${name} ${ty || ti}: the category count is unchanged`);
    eq(measureRows(h).length, measureRows(ALL).length, `${name} ${ty || ti}: every row is still in the markup`);
  }
  B.setType(""); B.setTime("");

  // ═══════════════════════════════════════════════════════════════════════════
  section(`6 · ${name}: the in-place filter agrees with a fresh render`);
  // ═══════════════════════════════════════════════════════════════════════════
  for (const [ty, ti, q] of [["mandates", "", ""], ["topics", "", ""], ["", "current", ""], ["", "past", ""],
                             ["topics", "current", ""], ["mandates", "past", ""], ["", "current", "housing"], ["", "", ""]]) {
    const dom = parseDom(ALL);
    B.setType(ty); B.setTime(ti); B.setQuery(q);
    B._applyView(dom);
    const fresh = parseDom(B.tableHtml("ok", ITEMS, ROOMS, MANDATES));
    const a = domState(dom), b = domState(fresh);
    for (const k of Object.keys(a)) eq(JSON.stringify(a[k]), JSON.stringify(b[k]), `${name} [${ty || "-"}/${ti || "-"}/${q || "-"}]: applyView ${k} matches a fresh render`);
  }
  B.setType(""); B.setTime(""); B.setQuery("");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · a mixed seat: Congress decides on federal rows, the session year on state rows");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot("ut-gov");
  B.setTime("current");
  const h = B.tableHtml("ok", [fed(1, "H.R. 1", "Fed 119", "housing", 119), fed(2, "H.R. 2", "Fed 118", "housing", 118),
    ut(3, "H.B. 3", "State 2025", "water", "2025GS"), ut(4, "H.B. 4", "State 2024", "water", "2024GS"),
    { kind: "vote", measureId: 5, number: "X 5", title: "No sitting", congress: null, measureIdent: null, issues: [] }], [], []);
  eq(uniq(visibleTitles(h)).sort().join("|"), "Fed 119|State 2025", "Current: the highest Congress and the latest session year");
  B.setTime("past");
  const p = B.tableHtml("ok", [fed(1, "H.R. 1", "Fed 119", "housing", 119), fed(2, "H.R. 2", "Fed 118", "housing", 118),
    ut(3, "H.B. 3", "State 2025", "water", "2025GS"), ut(4, "H.B. 4", "State 2024", "water", "2024GS"),
    { kind: "vote", measureId: 5, number: "X 5", title: "No sitting", congress: null, measureIdent: null, issues: [] }], [], []);
  eq(uniq(visibleTitles(p)).sort().join("|"), "Fed 118|State 2024", "Past: the lower Congress and the earlier session");
  B.setTime("");
  const a = B.tableHtml("ok", [{ kind: "vote", measureId: 5, number: "X 5", title: "No sitting", congress: null, measureIdent: null, issues: [] }], [], []);
  ok(visibleTitles(a).includes("No sitting"), "a row that names no sitting shows under All");
  B.setType("bogus"); B.setTime("bogus");
  eq(JSON.stringify([B.view().type, B.view().time]), '["",""]', "an unknown toggle value is All");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · copy, the read, the shell");
// ═════════════════════════════════════════════════════════════════════════════
ok(/\n  var PAGE_SIZE = 100;\n/.test(MOD), "the 100-row read stays");
ok(/pageSize=' \+ PAGE_SIZE|pageSize=100|PAGE_SIZE\)/.test(MOD), "…and is the page the archive is asked for");
{
  const BANNED = /\bstocks?\b|\bshares?\b|\bshareholders?\b|\bequity\b|\binvest(?:or|ors|ment)\b|\bdividends?\b/i;
  const copy = [...MOD.matchAll(/^\s{4}(?:tg\w*|togglesLabel|mandate\w*): '([^']*)'/gm)].map((x) => x[1]).join(" ");
  ok(copy.includes("Topics") && copy.includes("Current"), "the toggle copy was read");
  ok(!BANNED.test(copy), `no equity language in the toggle or mandate copy — ${copy}`);
}
{
  const CSS = R("district-board.css");
  ok(/\.pdxdb-mandate-pill \{[\s\S]*?var\(--pdxdb-mandate/.test(CSS), "the pill wears the mandate gold token");
  ok(/\.pdxdb-toggles \{/.test(CSS) && /\.pdxdb-tg\[aria-pressed="true"\]/.test(CSS), "the toggle row is styled, with a pressed state");
}
{
  const VER = (/const CACHE_VERSION = '(v\d+)';/.exec(SW) || [, ""])[1];
  ok(Number(VER.slice(1)) >= 345, `the shell moved to v345 or later (${VER})`);
  const at = SW.indexOf(`// v345 - `);
  const LOG = at > 0 ? SW.slice(at, SW.indexOf("const CACHE_VERSION", at)) : "";
  ok(/MIGRATION COST: none/.test(LOG), "the v345 entry states no migration");
}

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures.slice(0, 40)) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ district board toggles: all ${passed} assertions passed`);
