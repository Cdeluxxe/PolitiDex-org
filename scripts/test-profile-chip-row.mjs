#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-profile-chip-row.mjs — the quick-jump chip row at the top of the file
// ─────────────────────────────────────────────────────────────────────────────
// The chip row (#pdx-profile-nav — By topic, Word vs Action, Record, Evidence,
// Activity …) sits directly under the seat line on every person file, led by two
// fact chips in the same skin: 🗓️ Term and Status.
//
// WHAT THIS SUITE PROVES:
//   1. The row is the element directly after the seat line (.profile-office), on
//      a candidate (Zach Dembo) and on incumbents (Massie, Curtis); it is shown
//      (not hidden), there is exactly one of it, and no plain-text report line.
//   2. Term reads "No formal term yet" for a candidate with no service and
//      "N terms · YYYY–present" for anyone who has served; its hover is the full
//      tenure sentence.
//   3. Status uses the badge-by-the-name's own wording (Incumbent / 2026
//      Candidate …).
//   4. The original chips are unchanged: same labels, same figures as
//      _pdxNavChips, same _pdxNavJump(target) handler, every target on the page.
//   5. The jump still scrolls to its section, found by ID, and an in-flow row is
//      not subtracted as if it were still a sticky bar.
//   6. The CSS no longer hides the row.
//
//   node scripts/test-profile-chip-row.mjs
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
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const FILES = [
  "cmp-data.js", "cmp-data-detail.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "issue-colors.js",
  "my-stances.js", "voter-hub-location.js", "roster-keys.js", "seat-field.js", "person-link.js", "profile-evidence.js",
  "stance-tree.js", "profiles-full.js",
];
const PH = R("person.html");
const PDX_AT = PH.indexOf("// ── PDXStance — shared canonical stance language");
const PDX_BLOCK = PDX_AT < 0 ? "" : PH.slice(PH.lastIndexOf("<script>", PDX_AT) + 8, PH.indexOf("</script>", PDX_AT));
function boot() {
  const w = makeSandbox();
  const by = {};
  const el = (id) => {
    const n = {
      id, innerHTML: "", textContent: "", style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
      appendChild(c) { return c; }, querySelector() { return null; }, querySelectorAll() { return []; },
      insertAdjacentHTML() {}, remove() {}, focus() {}, scrollTo() {}, scrollIntoView() {},
    };
    if (id) by[id] = n;
    return n;
  };
  w.document.getElementById = (id) => by[id] || el(id);
  w.document.createElement = () => el("");
  w.__byId = by;
  w._pdxDisplayScore = () => "";
  w._likeCounts = {};
  if (typeof w.URLSearchParams !== "function") w.URLSearchParams = URLSearchParams;
  w.console = Object.assign({}, console, { log() {}, info() {}, warn() {} });
  w.Date = class extends Date { constructor(...a) { super(...(a.length ? a : ["2026-11-15T12:00:00Z"])); } static now() { return Date.parse("2026-11-15T12:00:00Z"); } };
  w.Math = Object.assign(Object.create(Math), { random: () => 0.5 });
  w.setTimeout = () => 0;
  const ctx = vm.createContext(w);
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { /* page chrome the harness does not carry */ }
  }
  try { vm.runInContext(PDX_BLOCK, ctx, { filename: "person.html#PDXStance" }); } catch (e) {}
  w.PROFILES = w.CMP_DATA;
  return w;
}
const W = boot();
const open = (pid) => {
  W.__byId["modal-content"] && (W.__byId["modal-content"].innerHTML = "");
  try { W.openModal(pid); } catch (e) { /* homepage chrome the harness does not carry */ }
  return String((W.__byId["modal-content"] || {}).innerHTML || "");
};
const visible = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const navOf = (html) => { const a = html.indexOf('<nav id="pdx-profile-nav"'); return a < 0 ? "" : html.slice(a, html.indexOf("</nav>", a) + 6); };
const heroId = (html) => { const a = html.indexOf('<div class="profile-hero-id">'); return a < 0 ? "" : html.slice(a, html.indexOf('<div class="profile-meta">', a)); };
const fact = (nav, k) => {
  const m = new RegExp(`<span class="pdx-pnav-pill pdx-pnav-fact" data-pdxnav-fact="${k}" title="([^"]*)">[\\s\\S]*?<span class="pdx-pnav-label">([^<]*)</span><span class="pdx-pnav-val"[^>]*>([^<]*)</span>`).exec(nav);
  return m ? { title: m[1].replace(/&amp;/g, "&"), label: m[2], value: m[3] } : null;
};
const pill = (nav, target) => {
  const m = new RegExp(`<button type="button" class="pdx-pnav-pill" data-target="${target}"[^>]*>[\\s\\S]*?<span class="pdx-pnav-label">([^<]*)</span>(?:<span class="pdx-pnav-val"[^>]*>([^<]*)</span>)?`).exec(nav);
  return m ? { tag: m[0].slice(0, m[0].indexOf(">") + 1), label: m[1], value: m[2] } : null;
};

ok(typeof W.openModal === "function" && typeof W._pdxNavChips === "function", "the person file booted with the chip row");

const CASES = [
  { pid: "zach_dembo", kind: "candidate, no service", term: "No formal term yet", status: "2026 Candidate" },
  { pid: "massie", kind: "incumbent, U.S. House", term: /^\d+ terms · 2012–present$/, status: "Incumbent" },
  { pid: "curtis", kind: "incumbent, U.S. Senate", term: "1 term · 2025–present", status: "Incumbent" },
];

section("1 · the row sits directly under the seat line");
for (const c of CASES) {
  const html = open(c.pid);
  const h = heroId(html);
  const nav = navOf(html);
  if (!ok(!!nav, `${c.pid} (${c.kind}): the file prints the chip row`)) continue;
  const seatAt = h.indexOf('class="profile-office"');
  ok(seatAt > 0, `${c.pid}: the seat line is present`);
  const seatEnd = h.indexOf("</div>", seatAt) + 6;
  const navAt = h.indexOf('<nav id="pdx-profile-nav"');
  ok(navAt > seatEnd && h.slice(seatEnd, navAt).replace(/<!--[\s\S]*?-->/g, "").trim() === "",
    `${c.pid}: the chip row is the next element after the seat line`);
  eq((html.match(/id="pdx-profile-nav"/g) || []).length, 1, `${c.pid}: one chip row, not a copy`);
  ok(!/<nav id="pdx-profile-nav"[^>]*\shidden[\s>]/.test(html), `${c.pid}: the row is shown, not hidden`);
  ok(html.indexOf('class="profile-report"') < 0, `${c.pid}: no plain-text report line`);
  console.log(`      ${c.pid}: ${visible(nav)}`);
}

section("2 · Term and Status chips, same skin, correct wording");
for (const c of CASES) {
  const nav = navOf(open(c.pid));
  const t = fact(nav, "term"), s = fact(nav, "status");
  if (!ok(!!t, `${c.pid}: a Term chip`) || !ok(!!s, `${c.pid}: a Status chip`)) continue;
  eq(t.label, "Term", `${c.pid}: Term chip label`);
  if (typeof c.term === "string") eq(t.value, c.term, `${c.pid}: Term chip value`);
  else ok(c.term.test(t.value), `${c.pid}: Term chip reads "${t.value}"`);
  const ten = W._pdxTenure(W.CMP_DATA[c.pid]);
  if (ten) eq(t.title, ten.text, `${c.pid}: Term hover is the full tenure sentence`);
  else ok(/not yet served/.test(t.title), `${c.pid}: Term hover says no term is on file (${t.title})`);
  eq(s.label, "Status", `${c.pid}: Status chip label`);
  eq(s.value, c.status, `${c.pid}: Status chip wording`);
  eq(s.value, W.PDXStatus.label(W.CMP_DATA[c.pid]), `${c.pid}: Status chip = the badge-by-the-name's wording`);
  ok(nav.indexOf('data-pdxnav-fact="term"') < nav.indexOf('data-pdxnav-fact="status"') &&
     nav.indexOf('data-pdxnav-fact="status"') < nav.indexOf("<button"), `${c.pid}: Term, then Status, lead the row`);
  ok(!/data-pdxnav-fact="[^"]*"[^>]*data-target/.test(nav), `${c.pid}: the fact chips jump nowhere`);
}

section("3 · the original chips are unchanged and still jump");
const ORIGINAL = [
  { target: "pdxsec-stancetree", label: "By topic", live: "topics" },
  { target: "pdxsec-wordaction", label: "Word vs Action", live: "wordaction" },
  { target: "pdxsec-official-record", label: "Record", live: "record" },
  { target: "pdxsec-evidence", label: "Evidence", live: "evidence" },
  { target: "pdxsec-activity", label: "Activity" },
];
for (const c of CASES) {
  const html = open(c.pid);
  const nav = navOf(html);
  const chips = W._pdxNavChips(c.pid, null);
  let seen = 0;
  for (const o of ORIGINAL) {
    const p = pill(nav, o.target);
    if (!p) continue;
    seen++;
    eq(p.label, o.label, `${c.pid}: ${o.target} chip label`);
    if (o.live) eq(p.value, chips[o.live] && chips[o.live].value, `${c.pid}: ${o.label} chip figure is the _pdxNavChips figure`);
    ok(p.tag.indexOf(`onclick="window._pdxNavJump && window._pdxNavJump('${o.target}', this)"`) > 0, `${c.pid}: ${o.label} chip jumps to #${o.target}`);
    ok(html.indexOf(`id="${o.target}"`) >= 0 || (W.PDXProfileSpine && W.PDXProfileSpine.hasTarget && W.PDXProfileSpine.hasTarget(o.target)),
      `${c.pid}: ${o.label}'s destination #${o.target} is on the page`);
  }
  ok(seen >= 3, `${c.pid}: the original jump chips are present (${seen})`);
}
{
  const nav = navOf(open("massie"));
  for (const o of ORIGINAL) ok(!!pill(nav, o.target), `massie: carries the ${o.label} chip`);
}

section("4 · the jump scrolls to the section by ID");
{
  // The scroller, the target section and the row — the row in the flow, as it
  // now is in the letterhead.
  let scrolled = null;
  const body = { scrollTop: 500, getBoundingClientRect: () => ({ top: 100 }), scrollTo(o) { scrolled = o; },
    addEventListener() {}, removeEventListener() {} };
  const target = { isConnected: true, parentElement: null, tagName: "DIV", getBoundingClientRect: () => ({ top: 900 }) };
  const nav = { offsetHeight: 60, getAttribute: () => "massie" };
  W.__byId["modal-body"] = body;
  W.__byId["pdxsec-evidence"] = target;
  W.__byId["pdx-profile-nav"] = nav;
  let pos = "static";
  W.getComputedStyle = (n) => (n === nav ? { position: pos } : {});
  eq(W._pdxNavStickyH(), 0, "an in-flow row covers nothing");
  W._pdxNavJump("pdxsec-evidence", null);
  eq(scrolled && scrolled.top, 500 + 900 - 100 - 12, "the Evidence chip scrolls #modal-body to #pdxsec-evidence");
  pos = "sticky";
  eq(W._pdxNavStickyH(), 60, "a pinned row would still be subtracted");
  delete W.getComputedStyle;
  eq(W._pdxNavStickyH(), 60, "no style information: the old offset stands");
}

section("5 · the CSS shows the row in the letterhead");
{
  const CSS = R("app.css");
  ok(!/#pdx-profile-nav\.pdx-pnav[^{]*\{\s*display:\s*none/.test(CSS) && !/\.pdx-pnav\[hidden\]/.test(CSS), "app.css no longer hides the chip row");
  ok(/\.profile-hero-id > \.pdx-pnav \{[^}]*position: static/.test(CSS), "the row is in the flow under the seat line");
  ok(/\.pdx-pnav-pill\.pdx-pnav-fact/.test(CSS), "the fact chips share the pill skin");
}

console.log("");
if (failures.length) {
  console.log(`✗ profile chip row: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ profile chip row: all ${passed} assertions passed`);
