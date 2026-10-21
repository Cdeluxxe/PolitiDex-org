#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for FIND A TOPIC OR MANDATE READS EVERYDAY WORDS (sw v379)
// ─────────────────────────────────────────────────────────────────────────────
//   1. THE GOVERNOR BOARD: "data centers" and its close variants ("data
//      center", "Data Centres", "datacenters", "AI") open the issue that holds
//      the data-centre measures — or, on a seat with none, print the miss line
//      and the general-room door.
//   2. A PURE MISS prints the existing miss line AND the one new control under
//      it, on a reader board (/voice placeholder) and on a composer board (the
//      general room, "Start a thread about this").
//   3. EXISTING MATCHES (title word, bill number with or without dots, issue
//      label) still work, and the door is hidden whenever anything is shown.
//   4. NOTHING IS INVENTED: an alias never prints a group the seat does not
//      already print, and every alias key is a key in the vocabulary.
//   5. THE IN-PLACE FILTER agrees with a fresh render, door included.
//   6. MUTATIONS — an invented issue, a door removed, a door left hidden, an
//      alias that opens every group — each fail at least one check above.
//   7. Copy, routes and the shell.
//
//   node scripts/test-district-board-find-aliases.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

function boot(seat, src = MOD, composer = false) {
  const win = makeSandbox();
  if (seat) win.__PDX_DISTRICT_BOARD_SEAT = seat;
  if (composer) win.document.getElementById = (id) => (id === "pdx-district-composer" ? {} : null);
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  for (const f of ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"]) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  vm.runInContext(src, ctx, { filename: "district-board.js" });
  return { B: win.PDXDistrictBoard, win };
}

// ── FIXTURES ────────────────────────────────────────────────────────────────
const row = (id, number, title, key) => ({
  kind: "vote", measureId: id, number, title, congress: 119, measureIdent: null,
  issues: key ? [{ issueKey: key, weight: 1, isPrimary: false, supportMeaning: "", rationale: null }] : [],
});
// A governor seat WITH a data-centre issue: the measure's own title never says
// "data center", so only the alias pass can open it.
const GOV_DC = [
  row(1, "H.B. 101", "Starter Home Amendments", "housing"),
  row(2, "S.B. 132", "Large Load Service Amendments", "datacenter_growth"),
  row(3, "S.B. 57", "Public Education Funding", "public_schools"),
  row(4, "H.B. 208", "Great Salt Lake Watershed", "water"),
  row(5, "H.B. 9", "Income Tax Rate Reduction", "lower_taxes"),
  row(6, "H.B. 77", "Unfiled Procedures Act", null),
];
// The same seat with no data-centre measure on it.
const GOV_NODC = GOV_DC.filter((r) => r.measureId !== 2);

// ── READERS OVER THE RENDERED BAND ──────────────────────────────────────────
const isHidden = (open) => /\shidden(?=[\s>]|$)/.test(open);
const groupsOf = (h) => [...h.matchAll(/<details class="pdxdb-group[^"]*" data-pdxdb-group="([^"]*)"([^>]*)>/g)]
  .map((x) => ({ key: x[1], hidden: isHidden(x[2]) }));
const shownGroups = (h) => groupsOf(h).filter((g) => !g.hidden).map((g) => g.key);
const measureRows = (h) => [...h.matchAll(/<tr class="pdxdb-row"([^>]*)>[\s\S]*?<a class="pdxdb-m-link"[^>]*>([^<]*)</g)]
  .map((x) => ({ title: x[2], hidden: isHidden(x[1]) }));
const visibleTitles = (h) => [...new Set(measureRows(h).filter((r) => !r.hidden).map((r) => r.title))];
const noneShown = (h) => /data-pdxdb-find-none(?=[\s>])/.test(h) && !/data-pdxdb-find-none hidden>/.test(h);
const doorOf = (h) => {
  const m = /<p class="pdxdb-find-door" data-pdxdb-find-door=""( hidden)?><a class="pdxdb-find-door-a" href="([^"]*)">([^<]*)<\/a><\/p>/.exec(h);
  return m ? { hidden: !!m[1], href: m[2], text: m[3] } : null;
};
const doorShown = (h) => { const d = doorOf(h); return !!d && !d.hidden; };
// The door sits IMMEDIATELY under the miss line.
const doorUnderMiss = (h) => /data-pdxdb-find-none[^>]*>[^<]*<\/p><p class="pdxdb-find-door"/.test(h);

function render(B, items, q) {
  B.setCategory(""); B.setType(""); B.setTime(""); B.setQuery(q);
  return B.tableHtml("ok", items, [], []);
}

// ── A SMALL DOM, FOR THE IN-PLACE FILTER ────────────────────────────────────
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
  return {
    tag, attrs, children: [], parentNode: null,
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
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
}
const domState = (root) => ({
  rows: root.querySelectorAll("[data-pdxdb-find]").map((e) => `${e.getAttribute("data-pdxdb-find")}|${e.hidden}`).join(";"),
  groups: root.querySelectorAll("[data-pdxdb-group]").map((e) => `${e.getAttribute("data-pdxdb-group")}|${e.hidden}`).join(";"),
  none: root.querySelectorAll("[data-pdxdb-find-none]").map((e) => e.hidden).join(","),
  door: root.querySelectorAll("[data-pdxdb-find-door]").map((e) => e.hidden).join(","),
});

// ── THE CHECKS, AS ONE FUNCTION SO THE MUTATIONS RUN THE SAME ONES ──────────
const DC_VARIANTS = ["data centers", "data center", "Data Centers", "DATA CENTRES", "data centre",
  "datacenters", "datacenter", "AI", "ai", "A.I.", "artificial intelligence", "data centers in utah"];
const EVERYDAY = { water: "water", taxes: "lower_taxes", schools: "public_schools", housing: "housing" };
const MISSES = ["zzzz", "qwertyuiop", "spaceport"];

function checks(src, label) {
  const local = [];
  const t = (c, m) => { if (!c) local.push(`${label}: ${m}`); };
  const { B } = boot("ut-gov", src);
  const seatKeys = new Set(groupsOf(render(B, GOV_DC, "")).map((g) => g.key));
  const seatKeysNoDc = new Set(groupsOf(render(B, GOV_NODC, "")).map((g) => g.key));

  // 1. Governor, data-centre issue on the seat.
  for (const q of DC_VARIANTS) {
    const h = render(B, GOV_DC, q);
    t(shownGroups(h).includes("datacenter_growth"), `"${q}" opens Data Centers & AI Growth on the Governor board`);
    t(visibleTitles(h).includes("Large Load Service Amendments"), `"${q}" shows the data-centre measure`);
    t(!noneShown(h) && !doorShown(h), `"${q}" is a hit: no miss line and no door`);
    t(groupsOf(h).every((g) => seatKeys.has(g.key)), `"${q}" prints no group the seat does not have`);
  }
  // 1b. Governor, no data-centre measure: the miss and the door.
  for (const q of ["data centers", "data center", "datacenters"]) {
    const h = render(B, GOV_NODC, q);
    t(noneShown(h), `"${q}" with no data-centre issue prints the miss line`);
    t(doorShown(h) && doorUnderMiss(h), `"${q}" with no data-centre issue offers the door under the miss line`);
    t(groupsOf(h).every((g) => seatKeysNoDc.has(g.key)), `"${q}" invents no Data Centers group`);
    t(!/datacenter_/.test(h), `"${q}" prints no data-centre key at all`);
  }
  // Everyday words reach the closest issue already on the board.
  for (const [q, key] of Object.entries(EVERYDAY)) {
    const h = render(B, GOV_DC, q);
    t(shownGroups(h).includes(key), `"${q}" opens ${key}`);
    t(!doorShown(h), `"${q}" is a hit: the door is hidden`);
  }

  // 2. Pure misses, reader board and composer board.
  for (const q of MISSES) {
    const h = render(B, GOV_DC, q);
    t(noneShown(h), `pure miss "${q}" prints the miss line`);
    t(h.includes("No measure in view matches that search."), `pure miss "${q}" keeps the miss sentence`);
    const d = doorOf(h);
    t(!!d && !d.hidden && doorUnderMiss(h), `pure miss "${q}" prints the door under the miss line`);
    t(!!d && d.text === "Talk about it in the general room", `pure miss "${q}" door reads Talk about it in the general room`);
    t(!!d && d.href === "/voice", `pure miss "${q}" on a reader board points at the documented /voice placeholder`);
    t(shownGroups(h).length === 0, `pure miss "${q}" shows no group`);
  }
  {
    const C = boot("ut-sd-3", src, true).B;
    const h = render(C, GOV_DC, "zzzz");
    const d = doorOf(h);
    t(noneShown(h) && !!d && !d.hidden, "a composer board's pure miss prints the line and the door");
    t(!!d && d.href === "#pdx-general-room", "a composer board's door lands in the general room");
    t(!!d && d.text === "Start a thread about this", "a composer board's door reads Start a thread about this");
  }

  // 3. Existing matches.
  for (const [q, title] of [["starter", "Starter Home Amendments"], ["S.B. 57", "Public Education Funding"],
    ["sb57", "Public Education Funding"], ["hb 208", "Great Salt Lake Watershed"], ["unfiled", "Unfiled Procedures Act"]]) {
    const h = render(B, GOV_DC, q);
    t(visibleTitles(h).includes(title), `"${q}" still finds ${title}`);
    t(!noneShown(h) && !doorShown(h), `"${q}" is a hit: no miss line, no door`);
  }
  {
    const h = render(B, GOV_DC, "");
    t(!noneShown(h) && !!doorOf(h) && doorOf(h).hidden, "an empty search hides the miss line and the door");
  }

  // 5. In place agrees with a fresh render.
  for (const q of ["", "data centers", "ai", "zzzz", "water", "sb57"]) {
    B.setCategory(""); B.setType(""); B.setTime(""); B.setQuery("");
    const root = parseDom(B.tableHtml("ok", GOV_DC, [], []));
    B.setQuery(q);
    B._applyView(root);
    const fresh = parseDom(B.tableHtml("ok", GOV_DC, [], []));
    const a = domState(root), b = domState(fresh);
    t(JSON.stringify(a) === JSON.stringify(b), `in place "${q}" agrees with a fresh render`);
  }
  B.setQuery("");
  return local;
}

section("the shipped module");
const base = checks(MOD, "shipped");
for (const f of base) failures.push(f);
ok(base.length === 0, "the shipped module passes every find-alias check");

// 4. Every alias key is a vocabulary key; the table is static and shared.
section("the alias table");
{
  const { B, win } = boot("ut-gov");
  const keys = Object.keys(B.FIND_ALIASES || {});
  ok(keys.length > 0, "FIND_ALIASES is published");
  for (const k of keys) ok(!!(win.ISSUE_MAP && win.ISSUE_MAP[k]), `alias key ${k} is a key in the vocabulary`);
  const dc = B._aliasKeys("data centers");
  ok(!!dc.datacenter_growth, `"data centers" names datacenter_growth`);
  ok(!B._aliasKeys("maintain").datacenter_growth, `"maintain" does not read as "ai" (whole words only)`);
  ok(Object.keys(B._aliasKeys("")).length === 0, "an empty query names no issue");
}

// 6. Mutations.
section("mutations");
const mutate = (name, from, to) => {
  ok(MOD.includes(from), `mutation ${name}: anchor present`);
  const fails = checks(MOD.replace(from, to), name);
  ok(fails.length > 0, `mutation "${name}" is caught`);
};
// Invents an issue: an aliased key the seat has no measure for gets a group.
mutate("invent an issue",
  "    var groups = [];\n    for (var g = 0; g < keys.length; g++) {",
  "    var groups = [];\n    var ak = aliasKeys(_view.q); for (var ik in ak) if (keys.indexOf(ik) === -1 && issueLabel(ik)) groups.push({ key: ik, label: issueLabel(ik), rows: [] });\n    for (var g = 0; g < keys.length; g++) {");
mutate("drop the door", "      generalDoorHtml(anyShown(G, mrows, pins)),", "      '',");
mutate("door always hidden", "'<p class=\"pdxdb-find-door\" data-pdxdb-find-door=\"\"' + (hidden ? ' hidden' : '')",
  "'<p class=\"pdxdb-find-door\" data-pdxdb-find-door=\"\"' + ' hidden'");
mutate("in-place door never shown", "if (door) door.hidden = any;", "if (door) door.hidden = true;");
mutate("alias opens every group", "return !!key && Object.prototype.hasOwnProperty.call(aliasKeys(q), key);", "return !!key && !!q;");
mutate("alias pass removed", "(matches(findText(item), q) || aliasOpens(key, q))", "matches(findText(item), q)");

// 7. Copy, routes, shell.
section("copy, routes and the shell");
{
  const { B } = boot("ut-gov");
  const newCopy = [B.COPY.findDoor, B.COPY.findDoorThread].join(" ");
  ok(!/equity|stock|share|membership|member|premium|subscri/i.test(newCopy), "the door copy carries no equity, stock, membership or premium language");
  const utahRows = (T) => Object.keys(T).filter((k) => /^ut-/.test(k)).map((k) => [k, T[k]]);
  let headBoards = null;
  try {
    const head = execFileSync("git", ["show", "HEAD:district-board.js"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    headBoards = JSON.stringify(utahRows(boot("ut-gov", head).B.BOARDS));
  } catch (e) { headBoards = null; }
  // Utah's rows are pinned; other states' U.S. House and Senate rows may follow them.
  if (headBoards) ok(headBoards === JSON.stringify(utahRows(B.BOARDS)), "the board table and its routes are unchanged");
  ok(/const CACHE_VERSION = 'v(\d+)'/.test(SW) && Number(/const CACHE_VERSION = 'v(\d+)'/.exec(SW)[1]) >= 379, "the shell is at v379 or later");
  ok(SW.includes("// v379 - FIND A TOPIC OR MANDATE READS EVERYDAY WORDS."), "the worker carries the v379 note");
}

if (failures.length) {
  console.error(`\n   ✗ district board find aliases: ${failures.length} failed, ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error("     - " + f);
  process.exit(1);
}
console.log(`\n   ✓ district board find aliases: all ${passed} assertions passed`);
