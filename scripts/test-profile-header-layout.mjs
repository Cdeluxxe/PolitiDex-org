#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-profile-header-layout.mjs — the person letterhead grid, the PDX mark,
// and Word vs Action reaching the letterhead once the record lands
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS SUITE PROVES:
//   1. The PolitiDex mark is in the person letterhead (on the portrait's corner),
//      beside "Bill file" on bill pages, and in the issue drawer's identity row.
//   2. Funding and Activity are one pair (.pdx-pnav-lead) placed beside the
//      photo; Word vs Action is its own line (.pdx-pnav-wva) spanning the grid.
//   3. Word vs Action shows on a file whose existing read publishes a figure —
//      Massie, with his live roll-call record (scripts/fixtures/vr-massie-member.json)
//      — and the pill painted at first open is repainted by the record's own
//      arrival event ('pdx-record-noted'), which a cold /p/ open does fire.
//   4. A file with no reserved figure keeps a hidden slot that the repaint
//      reveals, and a slot that never gets a figure stays hidden.
//   5. The chip content, the "More sections" disclosure and the money chips
//      are unchanged; nothing in the grid can push the page wider on a phone.
//
//   node scripts/test-profile-header-layout.mjs
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
const ruleOf = (sel) => { const a = CSS.indexOf(sel + " {"); return a < 0 ? "" : CSS.slice(a, CSS.indexOf("}", a) + 1); };

ok(typeof W.openModal === "function" && typeof W._pdxNavChips === "function", "the person file booted");

section("1 · the PolitiDex mark");
{
  const html = open("massie");
  const face = html.slice(html.indexOf('<div class="profile-hero-face">'), html.indexOf('<div class="profile-hero-id">'));
  ok(/<span class="pdx-hdr-mark profile-hero-mark"><img src="\/assets\/pdx-mark-192\.png" alt="PolitiDex"/.test(face),
    "the person letterhead carries the PDX mark beside the portrait");
  ok(/\.profile-hero-mark \{[^}]*position: absolute/.test(CSS), "the mark sits on the portrait's corner, out of the flow");
  const bill = R("bill.html");
  ok(/\.pdx-bill-kicker::before \{[^}]*pdx-mark-192\.png/.test(bill), "the bill page draws the mark beside its kicker");
  const cons = R("consistency.js");
  ok(/'\.pdxgap-id::after\{content:"";[^']*pdx-mark-192\.png/.test(cons), "the issue drawer's identity row draws the mark");
}

section("2 · Funding + Activity beside the photo, Word vs Action on the next line");
for (const pid of ["massie", "curtis", "zach_dembo"]) {
  const html = open(pid);
  const nav = navOf(html);
  const lead = block(nav, "pdx-pnav-lead");
  const wva = block(nav, "pdx-pnav-wva");
  ok(!/pdxsec-wordaction/.test(lead), `${pid}: Word vs Action is not in the Funding / Activity pair`);
  ok(!lead || /data-target="pdxsec-(funding|activity)"/.test(lead), `${pid}: the pair holds Funding and/or Activity`);
  ok(/data-target="pdxsec-wordaction"/.test(wva), `${pid}: Word vs Action has its own line`);
  const order = [nav.indexOf('class="pdx-pnav-lead"'), nav.indexOf('class="pdx-pnav-wva"'), nav.indexOf('class="pdx-pnav-more"')].filter((n) => n >= 0);
  ok(order.every((n, i) => !i || n > order[i - 1]), `${pid}: pair, then Word vs Action, then More sections`);
  ok(/<summary class="pdx-pnav-more-sum">More sections/.test(nav), `${pid}: the More sections disclosure is still there`);
  ok(!/<details class="pdx-pnav-more" open/.test(nav), `${pid}: and still closed`);
}
{
  const nav = navOf(open("massie"));
  const lead = block(nav, "pdx-pnav-lead");
  ok(/data-target="pdxsec-activity"/.test(lead), "massie: Activity sits in the pair beside the photo");
}
ok(/\.profile-hero \{[^}]*display: grid/.test(CSS), "the letterhead is a grid");
ok(/\.profile-hero-face \{ grid-column: 1; grid-row: 1 \/ span 4;/.test(CSS), "the photo spans the rows beside it");
ok(/\.profile-hero-id > \.pdx-pnav > \.pdx-pnav-lead \{\s*grid-column: 2; grid-row: 4;/.test(CSS), "the pair sits in the column beside the photo");
ok(/\.pdx-pnav-lead \{[^}]*flex-wrap: nowrap/.test(CSS.slice(CSS.indexOf("THE LETTERHEAD AS ONE GRID"))), "the pair stays side by side");
ok(/\.profile-hero-id > \.pdx-pnav > \.pdx-pnav-wva \{ grid-column: 1 \/ -1;/.test(CSS), "Word vs Action spans the letterhead");
ok(/\.pdx-pnav-wva > \.pdx-pnav-pill \{[^}]*width: 100%/.test(CSS), "the Word vs Action pill fills its line");
ok(/\.profile-hero-id > \.pdx-pnav > \.pdx-pnav-more \{ grid-column: 1 \/ -1; grid-row: 6;/.test(CSS), "More sections sits below, full width");
ok(/\.profile-hero-id > \.profile-meta \{ grid-row: 8;/.test(CSS), "the money chips stay below the disclosure");

section("3 · Word vs Action reaches the letterhead on Massie's real record");
{
  const fx = JSON.parse(R("scripts/fixtures/vr-massie-member.json"));
  // Capture listeners and run timers on demand, so the event path is real.
  const listeners = W.__listeners;
  const timers = [];
  W.__deliver = true;
  W.setTimeout = (fn) => { timers.push(fn); return timers.length; };
  const flush = () => { while (timers.length) { try { timers.shift()(); } catch (e) {} } };

  const before = W._pdxNavChips("massie", null).wordaction;
  ok(before && before.pending, `before the record lands the pill is pending (${before && before.value})`);

  // A minimal rail: the one live pill the repaint writes through.
  const attrs = { "data-pdxnav-live": "wordaction", "data-pdxnav-label": "Word vs Action", "data-target": "pdxsec-wordaction" };
  const val = { textContent: before.value, style: {} };
  const btn = {
    getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); },
    removeAttribute: (k) => { delete attrs[k]; }, hasAttribute: (k) => k in attrs,
    querySelector: (s) => (s === ".pdx-pnav-val" ? val : null),
  };
  attrs["data-pdxnav-pending"] = "1";
  const nav = {
    getAttribute: (k) => (k === "data-pdxnav-pid" ? "massie" : null),
    querySelectorAll: (s) => (s === "[data-pdxnav-live]" ? [btn] : []), querySelector: () => null,
  };
  W.__byId["pdx-profile-nav"] = nav;
  try { W._pdxInitProfileNav(); } catch (e) {}
  flush();
  ok((listeners["pdx-record-noted"] || []).length > 0, "the rail listens for the record's own arrival");

  W.PDXVotingRecord._liveRead.massie = true;
  W.PDXVotingRecord.noteMember("massie", fx.items, "live");   // dispatches pdx-record-noted
  flush();
  const after = W._pdxNavChips("massie", null).wordaction;
  ok(after && /^\d+% · (Backed up|Mixed|Contradicted)$/.test(after.value), `the existing read publishes a figure (${after && after.value})`);
  const wa = W.PDXWordAction.read("massie", W.CMP_DATA.massie);
  ok(wa.publishable && wa.pct !== null, "the engine's own floors are cleared — no rule was loosened");
  const band = wa.pct >= 95 ? "Backed up" : wa.pct >= 65 ? "Mixed" : "Contradicted";
  ok(after.value === `${wa.pct}% · ${band}`, "the verdict word follows the 95 / 65 ladder");
  ok(val.textContent === after.value, `the letterhead pill was repainted by the arrival (${val.textContent})`);
  ok(!("data-pdxnav-pending" in attrs), "and no longer reads as pending");

  section("4 · the reserved slot");
  // A slot built before the engine had a figure: hidden, no value.
  const sAttrs = { "data-pdxnav-live": "wordaction", "data-pdxnav-label": "Word vs Action", "data-pdxnav-slot": "1", hidden: "" };
  let created = null;
  const txt = { appendChild: (c) => { created = c; return c; } };
  const slot = {
    getAttribute: (k) => (k in sAttrs ? sAttrs[k] : null), setAttribute: (k, v) => { sAttrs[k] = String(v); },
    removeAttribute: (k) => { delete sAttrs[k]; }, hasAttribute: (k) => k in sAttrs,
    querySelector: (s) => (s === ".pdx-pnav-val" ? created : s === ".pdx-pnav-txt" ? txt : null),
  };
  W.document.createElement = () => ({ className: "", textContent: "", style: {} });
  nav.querySelectorAll = (s) => (s === "[data-pdxnav-live]" ? [slot] : []);
  W._pdxNavLive("massie");
  ok(!("hidden" in sAttrs), "a slot whose read now has a figure is shown");
  ok(created && created.className === "pdx-pnav-val" && created.textContent === after.value, "and carries the same figure");
  // A person with no word at all: no chip, so the slot stays hidden.
  const none = Object.keys(W.CMP_DATA).find((k) => { try { return !W._pdxNavChips(k, null).wordaction; } catch (e) { return false; } });
  if (ok(!!none, "the roster has a file with no Word vs Action read")) {
    const nAttrs = { "data-pdxnav-live": "wordaction", "data-pdxnav-slot": "1", hidden: "" };
    const nslot = { getAttribute: (k) => (k in nAttrs ? nAttrs[k] : null), setAttribute() {}, removeAttribute: (k) => { delete nAttrs[k]; },
      hasAttribute: (k) => k in nAttrs, querySelector: () => null };
    nav.getAttribute = (k) => (k === "data-pdxnav-pid" ? none : null);
    nav.querySelectorAll = () => [nslot];
    W._pdxNavLive(none);
    ok("hidden" in nAttrs, `${none}: no figure, so the slot stays hidden and the pill is omitted`);
  }
  ok(/\.pdx-pnav-pill\[hidden\] \{ display: none !important; \}/.test(CSS), "a hidden slot takes no space");
  const PF = R("profiles-full.js");
  ok(/data-target="pdxsec-wordaction" hidden /.test(PF), "the letterhead reserves the slot when the first read has no figure");
}

section("5 · nothing pushes a phone wider");
{
  const grid = CSS.slice(CSS.indexOf("THE LETTERHEAD AS ONE GRID"));
  ok(/grid-template-columns: 132px minmax\(0, 1fr\) auto;/.test(grid), "desktop: the text column can shrink to fit");
  ok(/@media \(max-width: 480px\) \{\s*\.profile-hero \{\s*grid-template-columns: 96px minmax\(0, 1fr\);/.test(grid), "phone: photo plus a shrinkable column, no third track");
  ok(/\.pdx-pnav-lead > \.pdx-pnav-pill \{ flex: 0 1 auto; min-width: 0; white-space: normal; \}/.test(grid), "the pair's pills may shrink and wrap their figure");
  ok(/\.pdx-pnav-wva > \.pdx-pnav-pill \{[^}]*min-width: 0; white-space: normal;/.test(grid), "the Word vs Action pill wraps rather than overflowing");
  ok(/\.profile-hero-id > \* \{ grid-column: 1 \/ -1; min-width: 0; \}/.test(grid), "every other letterhead row is full width and shrinkable");
  ok(!/\.profile-hero-mark \{[^}]*(left|top): -/.test(grid), "the mark is drawn inside the portrait, never past its edge");
}

console.log("");
if (failures.length) {
  console.error(`✗ profile header layout: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`✓ profile header layout: all ${passed} assertions passed`);
