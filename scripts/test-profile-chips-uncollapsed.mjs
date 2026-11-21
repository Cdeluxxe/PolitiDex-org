#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-profile-chips-uncollapsed.mjs — the letterhead section chips are always
// visible, and the Full Report chip and its stance-record modal are gone
// ─────────────────────────────────────────────────────────────────────────────
//   1. By topic, Evidence, Record, Positions and Flashpoints (plus Term
//      and Status) render as plain chips — no "More sections" disclosure.
//   2. No Full Report chip, and nothing on the person file opens the
//      "Full Record on the Issues" overlay; the overlay itself is removed.
//   3. Word vs Action keeps the compact chip size, not a full-width banner.
//   4. No new routes or gates.
//
//   node scripts/test-profile-chips-uncollapsed.mjs
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
  w.Date = class extends Date { constructor(...a) { super(...(a.length ? a : ["2026-11-20T12:00:00Z"])); } static now() { return Date.parse("2026-11-20T12:00:00Z"); } };
  w.setTimeout = () => 0;
  // Listeners are captured from the start (the rail binds once, at first open);
  // events are delivered only once section 3 turns delivery on.
  w.__listeners = {};
  w.__deliver = false;
  w.addEventListener = (t, fn) => { (w.__listeners[t] = w.__listeners[t] || []).push(fn); };
  w.dispatchEvent = (ev) => { if (w.__deliver) (w.__listeners[ev.type] || []).forEach((fn) => { try { fn(ev); } catch (e) {} }); return true; };
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
const navOf = (html) => { const a = html.indexOf('<nav id="pdx-profile-nav"'); return a < 0 ? "" : html.slice(a, html.indexOf("</nav>", a) + 6); };
const block = (html, cls) => {
  const a = html.indexOf(`<div class="${cls}">`);
  if (a < 0) return "";
  let depth = 0, i = a;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = a;
  let m;
  while ((m = re.exec(html))) { depth += m[0] === "</div>" ? -1 : 1; if (!depth) { i = m.index + 6; break; } }
  return html.slice(a, i);
};
const CSS = R("app.css");
const PF = R("profiles-full.js");
const SH = R("stance-helpers.js");

ok(typeof W.openModal === "function" && typeof W._pdxNavChips === "function", "the person file booted");

const labelsOf = (html) => (html.match(/<span class="pdx-pnav-label">([^<]+)<\/span>/g) || []).map((m) => m.replace(/<[^>]+>/g, ""));
const SECTION_TARGETS = {
  "By topic": "pdxsec-stancetree", Evidence: "pdxsec-evidence", Positions: "pdxsec-positions",
  Record: "pdxsec-official-record", Flashpoints: "pdxsec-controversies", "The record": "pdxsec-standout",
};

section("1 · the sections are always-visible chips, no collapse control");
for (const pid of ["massie", "curtis", "zach_dembo"]) {
  const html = open(pid);
  const nav = navOf(html);
  ok(nav.length > 0, `${pid}: the chip row rendered`);
  ok(!/<details|<summary|pdx-pnav-more|More sections/i.test(nav), `${pid}: no "More sections" disclosure or collapse control`);
  const track = block(nav, "pdx-pnav-track");
  ok(track.length > 0, `${pid}: the section chips sit directly in the chip row`);
  ok(!/\shidden[\s>]/.test(track.replace(/data-pdxnav-slot="1"[^>]*/g, "")), `${pid}: no section chip is hidden`);
  // Every section chip uses the same pill skin as the lead chips.
  const pills = track.match(/<button type="button" class="[^"]*"/g) || [];
  ok(pills.length >= 2 && pills.every((b) => /class="pdx-pnav-pill"/.test(b)), `${pid}: every section chip is a standard .pdx-pnav-pill`);
}
{
  const nav = navOf(open("massie"));
  const track = block(nav, "pdx-pnav-track");
  const labels = labelsOf(track);
  for (const want of ["By topic", "Positions", "Evidence", "Record"]) ok(labels.indexOf(want) >= 0, `massie: ${want} is a visible chip (got ${labels.join(", ")})`);
}
// Source-level: every chip the rail can push renders into the plain track.
ok(!/pdx-pnav-more/.test(PF), "profiles-full.js no longer builds a More sections disclosure");
ok(/'<div class="pdx-pnav-track">' \+ _navFactsHtml \+ _navRest\.map\(_navPillHtml\)\.join\(''\) \+ '<\/div>'/.test(PF),
  "Term, Status and every other section chip render straight into the track");
for (const [label, target] of Object.entries(SECTION_TARGETS)) {
  ok(PF.indexOf(`'${target}'`) >= 0, `the rail still carries the ${label} chip (${target})`);
}
ok(!/\.pdx-pnav-more/.test(CSS), "app.css carries no disclosure styling");
ok(/\.profile-hero-id > \.pdx-pnav > \.pdx-pnav-track \{ grid-column: 1 \/ -1; grid-row: 6;/.test(CSS), "the chips take the letterhead row the disclosure had");
ok(/\.profile-hero-id > \.pdx-pnav \.pdx-pnav-pill \{\s*min-height: 30px;/.test(CSS), "section chips share the compact letterhead pill size");

section("2 · the Full Report chip and the full stance modal are gone");
for (const pid of ["massie", "curtis", "zach_dembo"]) {
  const html = open(pid);
  ok(!/Full Report|All Stances/.test(navOf(html)), `${pid}: no Full Report chip`);
  ok(!/pdx-pnav-action/.test(html), `${pid}: no action pill`);
  ok(!/_pdxOpenStanceRecord/.test(html), `${pid}: nothing on the person file opens the stance record modal`);
  ok(!/pdx-fsr-btn|pdx-fsr-mini|pdx-fsr-teaser/.test(html), `${pid}: no "View full record" button, mini link or teaser`);
  ok(!/Full Record on the Issues|class="fsrec"/i.test(html), `${pid}: no "Full Record on the Issues" overlay body`);
}
ok(typeof W._pdxOpenStanceRecord === "undefined", "window._pdxOpenStanceRecord is not defined on the person file");
ok(typeof W._pdxStanceRecordBody === "undefined", "the overlay body builder is gone");
ok(typeof W._pdxStanceRecordMiniLink === "undefined", "the stance record mini link is gone");
ok(!/action: 'stance'|_pdxOpenStanceRecord\s*=|_pdxStanceRecordBody|Full Record on the Issues/.test(PF), "profiles-full.js has no stance modal");
ok(!/_pdxStanceRecordMiniLink\s*=/.test(SH), "stance-helpers.js no longer builds the mini link");
for (const f of ["person.html", "index.html"]) {
  ok(R(f).indexOf('id="pdx-record-overlay"') < 0, `${f}: the overlay element is removed`);
}
ok(!/\.pdx-pnav-action/.test(CSS), "app.css carries no Full Report chip styling");

section("3 · Word vs Action stays the compact chip");
{
  const nav = navOf(open("massie"));
  const wva = block(nav, "pdx-pnav-wva");
  ok(/class="pdx-pnav-pill" data-target="pdxsec-wordaction"/.test(wva), "massie: Word vs Action is a standard pill");
  const grid = CSS.slice(CSS.indexOf("THE LETTERHEAD AS ONE GRID"));
  ok(!/\.pdx-pnav-wva > \.pdx-pnav-pill \{[^}]*width: 100%/.test(grid), "the pill is not stretched to the letterhead width");
  ok(!/\.pdx-pnav-wva \.pdx-pnav-val \{[^}]*font-size: 1\.12rem/.test(grid), "the figure is not set in the larger banner face");
  ok(/\.pdx-pnav-wva > \.pdx-pnav-pill \{ flex: 0 1 auto; min-width: 0; white-space: normal; \}/.test(grid), "it is sized like the Funding / Activity chips");
}

section("4 · no new routes or gates");
{
  ok(!/\/record\//.test(R("netlify.toml")), "netlify.toml adds no record route");
  ok(!/#record\//.test(PF), "the #record/<id> deep-link handler is retired, not replaced by a route");
}

console.log("");
if (failures.length) {
  console.error(`✗ profile chips uncollapsed: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`✓ profile chips uncollapsed: all ${passed} assertions passed`);
