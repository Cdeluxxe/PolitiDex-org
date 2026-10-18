#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-topic-colors.mjs — bill-panel topic chips in the issue's own colour,
// and a short line under each topic by default
// ─────────────────────────────────────────────────────────────────────────────
// The bill panel's "Every topic this act touches" rows and its bottom "Explore
// these issues" chips printed every topic in the same neutral ink, while the same
// keys carry their issue colour on a person-file drawer, the stance tree and the
// Spotlights. And each topic row printed its whole stored rationale inline — on
// H.R. 22, a paragraph of quoted statute under "Whose Rule Governs".
//
// What must stay true, on H.R. 1 and H.R. 22, booted with bill.html's own scripts
// (and again with receipt-cards.js, the reader-copy scrubber the front page
// carries, which is what lets a rationale print at all):
//
//   1. THE DRAWER'S COLOUR. Every topic chip in both sections carries exactly the
//      treatment a person-file drawer gives the same key: the `pdxc-ic` class and
//      PDXIssueColors.styleFor(key) inline — and a key that is not a core issue
//      gets neither. consistency.js's _icSkin is pinned to that spelling.
//   2. LABELS, ORDER AND LINKS UNCHANGED. Same labels, same order, same
//      data-issue doors in both sections as with the colour module absent.
//   3. THE SHORT LINE BY DEFAULT. Under each topic the visible text is the
//      effect line the bill's own page prints for that pair (≤140 characters),
//      or nothing where none is on file.
//   4. THE LONGER TEXT BEHIND "More". A stored rationale is inside a closed
//      <details> whose summary says "More"; it is never visible by default.
//   5. MUTATIONS ARE CAUGHT. A bill-detail.js that drops the colour class, or
//      one that ships the longer text open, fails 1 or 4.
//
//   node scripts/test-bill-topic-colors.mjs
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

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ bill topic colors: STALE HARNESS — ${m}`); process.exit(2); };

const ORIGIN = "https://politidex.fyi";
const BILL_HTML = R("bill.html");
const BD_SRC = R("bill-detail.js");
const OFFICIAL = R("bill-official.json");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const EFFECTS = JSON.parse(OFFICIAL).effects || {};
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const plain = (h) => unescape(String(h).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const escAttr = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const DOC_SCRIPTS = [...BILL_HTML.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
must(DOC_SCRIPTS.includes("bill-detail.js") && DOC_SCRIPTS.includes("issue-colors.js") && DOC_SCRIPTS.includes("issue-map.js"),
  "bill.html loads the panel, the issue vocabulary and the colour module");

// The person-file drawer's colour treatment, read from its own source: the class
// it adds and the style it prints. If this moves, the comparison below is stale.
const CONS = R("consistency.js");
const ICSKIN = CONS.slice(CONS.indexOf("function _icSkin(key)"), CONS.indexOf("function _icSkin(key)") + 700);
must(/return \{ style: IC\.styleFor\(key\), cls: on \? ' pdxc-ic' : '', on: on \};/.test(ICSKIN),
  "consistency.js's _icSkin still gives a drawer chip ' pdxc-ic' and IC.styleFor(key)");

// H.R. 22's "Whose Rule Governs" row, with the rationale the migration stored.
const MIG = R("netlify/database/migrations/20261123000000_vr_save_act_hr22_sponsors_and_state_rule.sql");
const HR22_STATE = (/VALUES \(m_id, 'states_federal_power', 45, false,\s*'yea_opposes', '((?:[^']|'')+)'/.exec(MIG) || [])[1];
must(HR22_STATE && HR22_STATE.length > 300, "the migration holds H.R. 22's long states_federal_power rationale");
const LONG = HR22_STATE.replace(/''/g, "'");

const BILLS = [
  { key: "119|H.R. 1", id: 1001, number: "H.R. 1", title: "One Big Beautiful Bill Act" },
  { key: "119|H.R. 22", id: 1022, number: "H.R. 22", title: "SAVE Act" },
];
for (const b of BILLS) {
  must(DOCS[b.key] && (DOCS[b.key].m || []).length >= 4, `${b.key} has a bill document with its topics`);
  b.keys = DOCS[b.key].m.map((x) => x.k).filter(Boolean);
  must(EFFECTS[b.key], `bill-official.json carries ${b.key}'s effect lines`);
}

// Every row has a rationale: the real one on H.R. 22's state-rule row, a long
// stored-style sentence on the rest, and none on one row per bill so the
// "nothing stored" case is in the fixture too.
function fixture(b) {
  return {
    measure: { id: b.id, number: b.number, congress: 119, chamber: "house", status: "passed_house", title: b.title },
    issues: b.keys.map((k, i) => ({
      issueKey: k,
      supportMeaning: i % 3 === 2 ? "yea_opposes" : "yea_supports",
      rationale: k === "states_federal_power" ? LONG
        : i === 1 ? ""
        : `Section ${i + 2} of ${b.number} is the provision that reaches this topic, and the stored note on it runs well past the length a short line can carry under a row on a phone.`,
    })),
    rollcalls: [], positions: [], provisions: [], actions: [],
  };
}

async function panel(b, { scripts = DOC_SCRIPTS, bd = BD_SRC, scrubber = false } = {}) {
  const win = makeSandbox();
  win.__PDX_BILL_DOC = true;
  const p = "/b/119/" + encodeURIComponent(b.number);
  win.location = { href: ORIGIN + p, pathname: p, search: "", hash: "", origin: ORIGIN };
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  win.fetch = (u) => String(u) === "/bill-official.json"
    ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(OFFICIAL)) })
    : Promise.reject(new Error("offline"));
  const ctx = vm.createContext(win);
  const list = scrubber ? [...scripts, "receipt-cards.js"] : scripts;
  for (const f of list) {
    if (!f) continue;
    vm.runInContext(f === "bill-detail.js" ? bd : R(f), ctx, { filename: f });
  }
  const data = fixture(b);
  win.PDXBills = { get: () => Promise.resolve(data), list: () => Promise.resolve({ items: [] }), listSync: () => ({ items: [] }), isFollowed: () => false };
  // Twice: the first open starts the official table on its way, the second is
  // the warm render every later open is.
  for (let pass = 0; pass < 2; pass++) {
    win.PDXBillDetail.open(data.measure.id);
    for (let i = 0; i < 40; i++) await Promise.resolve();
  }
  return { html: capture.innerHTML, win };
}

// The two chip sections, as [key, class, style, label] rows.
const rowChips = (h) => [...h.matchAll(/<button type="button" class="(bd-omni-issue bd-omni-link[^"]*)"([^>]*)>([\s\S]*?)<\/button>/g)]
  .map((m) => ({ key: (/data-issue="([^"]+)"/.exec(m[2]) || [])[1], cls: m[1], style: (/ style="([^"]*)"/.exec(m[2]) || [])[1] || "", label: plain(m[3]) }));
const exploreChips = (h) => [...h.matchAll(/<button type="button" class="(bd-person bd-issuejump[^"]*)"([^>]*)>([\s\S]*?)<\/button>/g)]
  .map((m) => ({ key: (/data-issue="([^"]+)"/.exec(m[2]) || [])[1], cls: m[1], style: (/ style="([^"]*)"/.exec(m[2]) || [])[1] || "", label: plain(m[3]) }));
const rowsOf = (h) => [...h.matchAll(/<div class="bd-omni-row[^"]*"[^>]*>([\s\S]*?)(?=<div class="bd-omni-row|<\/div><\/div><\/section>)/g)].map((m) => m[1]);

// What is wrong with one panel, as a list, so the mutations can be shown to fail it.
function colourProblems(html, win, b) {
  const out = [];
  const IC = win.PDXIssueColors;
  const drawer = (k) => (IC.isCore(k) ? { cls: " pdxc-ic", style: IC.styleFor(k) } : { cls: "", style: "" });
  const rows = rowChips(html), explore = exploreChips(html);
  if (rows.length !== b.keys.length) out.push(`${b.number}: ${rows.length} topic rows for ${b.keys.length} keys`);
  if (explore.length !== b.keys.length) out.push(`${b.number}: ${explore.length} explore chips for ${b.keys.length} keys`);
  let coloured = 0;
  for (const [where, chips, base] of [["topic row", rows, "bd-omni-issue bd-omni-link"], ["explore chip", explore, "bd-person bd-issuejump"]]) {
    for (const c of chips) {
      const want = drawer(c.key);
      if (c.cls !== base + want.cls) out.push(`${b.number} ${where} ${c.key}: class "${c.cls}", the drawer's is "${base + want.cls}"`);
      if (unescape(c.style) !== want.style) out.push(`${b.number} ${where} ${c.key}: style differs from the drawer's`);
      if (want.cls) coloured++;
    }
  }
  if (!coloured) out.push(`${b.number}: no chip resolved to a core issue — the colour check proved nothing`);
  return out;
}
function textProblems(html, b, { scrubber }) {
  const out = [];
  const rows = rowsOf(html);
  if (rows.length !== b.keys.length) out.push(`${b.number}: ${rows.length} rows read for ${b.keys.length} keys`);
  for (const r of rows) {
    const key = (/data-issue="([^"]+)"/.exec(r) || [])[1];
    const want = (EFFECTS[b.key] || {})[key] || "";
    const eff = (/<div class="bd-omni-eff" data-bd-eff-for="([^"]+)">([^<]*)<\/div>/.exec(r) || []);
    if (eff[1] !== key) out.push(`${b.number} ${key}: no short-line slot of its own`);
    if (unescape(eff[2] || "") !== want) out.push(`${b.number} ${key}: default line ${JSON.stringify(unescape(eff[2] || ""))}, the page's is ${JSON.stringify(want)}`);
    if (want.length > 140) out.push(`${b.number} ${key}: the short line is ${want.length} characters`);
    // Everything visible by default: the row with any <details> body removed.
    const shut = r.replace(/<details\b(?![^>]*\bopen\b)[^>]*>\s*<summary[^>]*>[\s\S]*?<\/summary>[\s\S]*?<\/details>/g, "");
    if (/bd-omni-why/.test(shut)) out.push(`${b.number} ${key}: the longer text is visible by default`);
    const more = /<details class="bd-omni-more" data-bd-more><summary class="bd-omni-more-sum">More<\/summary><div class="bd-omni-why">([^<]*)<\/div><\/details>/.exec(r);
    if (scrubber && key !== b.keys[1] && !more) out.push(`${b.number} ${key}: a stored rationale has no "More" control`);
    if (more && !plain(more[1])) out.push(`${b.number} ${key}: "More" opens onto nothing`);
    if (!scrubber && more) out.push(`${b.number} ${key}: with no scrubber a rationale reached the row`);
    if (key === b.keys[1] && more) out.push(`${b.number} ${key}: a row with no stored rationale grew a "More"`);
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every topic chip wears the person-file drawer's colour");
// ═════════════════════════════════════════════════════════════════════════════
const BOOTS = {};
for (const b of BILLS) {
  for (const scrubber of [false, true]) {
    const r = await panel(b, { scrubber });
    must(r.html.includes(b.number), `${b.number} panel rendered`);
    BOOTS[b.number + (scrubber ? "+s" : "")] = r;
    const probs = colourProblems(r.html, r.win, b);
    eq(probs, [], `${b.number}${scrubber ? " (with the scrubber)" : ""}: colour`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · labels, order and doors are what they were");
// ═════════════════════════════════════════════════════════════════════════════
for (const b of BILLS) {
  const plainBoot = await panel(b, { scripts: DOC_SCRIPTS.filter((f) => f !== "issue-colors.js") });
  const coloured = BOOTS[b.number].html;
  for (const [name, fn] of [["topic rows", rowChips], ["explore chips", exploreChips]]) {
    eq(fn(coloured).map((c) => [c.key, c.label]), fn(plainBoot.html).map((c) => [c.key, c.label]),
      `${b.number} ${name}: labels, order and doors match the uncoloured panel`);
    ok(fn(plainBoot.html).every((c) => !/pdxc-ic/.test(c.cls) && !c.style), `${b.number} ${name}: with no colour module there is no colour class`);
  }
  ok(!/pdxc-ic/.test(coloured.replace(/<button type="button" class="(?:bd-omni-issue bd-omni-link|bd-person bd-issuejump)[^"]*"/g, "")
    .replace(/<button type="button" class="bd-omni-issue[^"]*"/g, "")),
    `${b.number}: the colour class reached something other than a topic chip`);
  ok(/A Yea (?:advances|cuts against) this/.test(coloured), `${b.number}: the direction chips are still on the rows`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the short line by default, the longer text behind More");
// ═════════════════════════════════════════════════════════════════════════════
for (const b of BILLS) {
  for (const scrubber of [false, true]) {
    eq(textProblems(BOOTS[b.number + (scrubber ? "+s" : "")].html, b, { scrubber }), [],
      `${b.number}${scrubber ? " (with the scrubber)" : ""}: default text`);
  }
}
{
  const h = BOOTS["H.R. 22+s"].html;
  const row = rowsOf(h).find((r) => r.includes('data-issue="states_federal_power"')) || "";
  must(row, "H.R. 22's Whose Rule Governs row rendered");
  const shown = (/<div class="bd-omni-eff"[^>]*>([^<]*)</.exec(row) || [])[1] || "";
  eq(unescape(shown), EFFECTS["119|H.R. 22"].states_federal_power, "H.R. 22 · Whose Rule Governs: the visible line is the page's short line");
  ok(!/<details[^>]*\bopen\b/.test(row), "H.R. 22 · Whose Rule Governs: the long block ships closed");
  ok(plain((/<div class="bd-omni-why">([^<]*)</.exec(row) || [])[1] || "").includes("documentary proof of United States citizenship"),
    "H.R. 22 · Whose Rule Governs: expanding More reveals the stored text");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
{
  const b = BILLS[1];
  const noColour = BD_SRC.replace("return style ? { style: style, cls: ' pdxc-ic', on: true }", "return style ? { style: style, cls: '', on: true }");
  must(noColour !== BD_SRC, "the colour-class mutation found its target");
  const r1 = await panel(b, { bd: noColour });
  ok(colourProblems(r1.html, r1.win, b).length > 0, "a bill-detail.js that drops the colour class passes the colour check");

  const noStyle = BD_SRC.replace(`function icAttr(sk) { return sk && sk.style ? ' data-ic="on" style="' + escAttr(sk.style) + '"' : ''; }`, "function icAttr(sk) { return ''; }");
  must(noStyle !== BD_SRC, "the colour-style mutation found its target");
  const r2 = await panel(b, { bd: noStyle });
  ok(colourProblems(r2.html, r2.win, b).length > 0, "a bill-detail.js that drops the colour style passes the colour check");

  const openLong = BD_SRC.replace(`'<details class="bd-omni-more" data-bd-more><summary`, `'<details class="bd-omni-more" data-bd-more open><summary`);
  must(openLong !== BD_SRC, "the open-by-default mutation found its target");
  const r3 = await panel(b, { bd: openLong, scrubber: true });
  ok(textProblems(r3.html, b, { scrubber: true }).length > 0, "a bill-detail.js that ships the longer text open passes the text check");

  const inline = BD_SRC.replace(
    `(why && why !== line\n          ? '<details class="bd-omni-more" data-bd-more><summary class="bd-omni-more-sum">More</summary><div class="bd-omni-why">' + esc(why) + '</div></details>'\n          : '')`,
    `(why ? '<div class="bd-omni-why">' + esc(why) + '</div>' : '')`);
  must(inline !== BD_SRC, "the inline-paragraph mutation found its target");
  const r4 = await panel(b, { bd: inline, scrubber: true });
  ok(textProblems(r4.html, b, { scrubber: true }).length > 0, "a bill-detail.js that prints the paragraph inline passes the text check");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  ok(SW.includes("  '/bill.html',"), "sw: the bill page's shell, bill.html, is a precached shell asset");
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(SW) || [])[1]);
  ok(ver >= 401, `sw: CACHE_VERSION moved for the changed panel (v${ver})`);
}

if (failures.length) {
  console.error(`\n✗ bill topic colors: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`\n✓ bill topic colors: ${passed} checks passed — H.R. 1 and H.R. 22 chips wear the drawer's colour; short lines by default, the rest behind More`);
