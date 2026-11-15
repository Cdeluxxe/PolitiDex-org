#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-profile-report-line.mjs — the report-card line under the seat
// ─────────────────────────────────────────────────────────────────────────────
// Every person file prints one plain line directly under the seat line:
//   "12 stances · 0 actions · No formal term yet · 11 evidence · Updated Nov 15"
//
// WHAT THIS SUITE PROVES:
//   1. The line sits in the hero directly under the seat (.profile-office), on a
//      candidate with no term (Zach Dembo) and on incumbents with term years.
//   2. Its counts are the counts the old chip row printed: stances = the 🌳 By
//      topic chip, evidence = the 🔗 Evidence chip.
//   3. A candidate with no service reads "No formal term yet" and "0 actions";
//      an incumbent reads "N terms · YYYY–present".
//   4. The old chip row is hidden (markup + CSS) and the tenure pill is gone, so
//      no figure is printed twice; status is not repeated in the line.
//   5. Plain text with middle dots — no chip classes — and no equity wording.
//
//   node scripts/test-profile-report-line.mjs
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
const visible = (h) => String(h).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const lineOf = (html) => { const m = /<div class="profile-report"[^>]*>([\s\S]*?)<\/div>/.exec(html); return m ? m[1] : null; };
const hero = (html) => { const a = html.indexOf('<div class="profile-hero-id">'); return a < 0 ? "" : html.slice(a, html.indexOf('<div class="profile-meta">', a)); };

ok(typeof W.openModal === "function" && typeof W._pdxReportLine === "function", "the person file booted with the report line");

// Each case: the file, and what its term segment must say.
const CASES = [
  { pid: "zach_dembo", kind: "candidate, no term", term: "No formal term yet" },
  { pid: "massie", kind: "incumbent, U.S. House", term: /^\d+ terms? · 2012–present$/ },
  { pid: "curtis", kind: "incumbent, U.S. Senate", term: "1 term · 2025–present" },
];

section("1 · the line sits directly under the seat");
for (const c of CASES) {
  const html = open(c.pid);
  const h = hero(html);
  const line = lineOf(html);
  if (!ok(!!line, `${c.pid} (${c.kind}): the file prints a report line`)) continue;
  const seatEnd = h.indexOf("</div>", h.indexOf('class="profile-office"'));
  const at = h.indexOf('class="profile-report"');
  ok(h.indexOf('class="profile-office"') > 0, `${c.pid}: the seat line is present`);
  ok(at > seatEnd && h.slice(seatEnd + 6, at).replace(/<!--[\s\S]*?-->/g, "").trim() === "<div", `${c.pid}: the report line is the next element after the seat line`);
  ok(h.indexOf('class="profile-tenure"') < 0, `${c.pid}: the tenure pill no longer repeats the term`);
  console.log(`      ${c.pid}: ${visible(line)}`);
}

section("2 · the counts are the old chips' counts");
for (const c of CASES) {
  const html = open(c.pid);
  const line = lineOf(html) || "";
  const chips = W._pdxNavChips(c.pid, null);
  const f = W._pdxReportFields(c.pid, null);
  const seg = (k) => { const m = new RegExp(`data-pr="${k}"[^>]*>([^<]*)<`).exec(line); return m ? m[1] : null; };
  const topicN = chips.topics ? parseInt(chips.topics.value, 10) : 0;
  const evN = chips.evidence ? parseInt(chips.evidence.value, 10) : 0;
  eq(f.stances, topicN, `${c.pid}: stances match the By topic chip`);
  eq(f.evidence, evN, `${c.pid}: evidence matches the Evidence chip`);
  eq(seg("stances"), `${topicN} stance${topicN === 1 ? "" : "s"}`, `${c.pid}: stances segment text`);
  eq(seg("evidence"), `${evN} evidence`, `${c.pid}: evidence segment text`);
  const term = seg("term");
  if (typeof c.term === "string") eq(term, c.term, `${c.pid}: term segment`);
  else ok(c.term.test(term || ""), `${c.pid}: term segment reads "${term}"`);
  // Order: stances · actions · term · evidence · updated
  const order = ["stances", "actions", "term", "evidence", "updated"].map((k) => line.indexOf(`data-pr="${k}"`)).filter((i) => i >= 0);
  ok(order.every((v, i) => i === 0 || v > order[i - 1]), `${c.pid}: segments are in order`);
  ok(!/Candidate|Incumbent|Former/.test(visible(line)), `${c.pid}: status is not repeated in the line`);
}

section("3 · a candidate with nothing on file still reads cleanly");
{
  // Every action source has answered with nothing: the roll-call cache holds an
  // empty record and the bills table lists no bill.
  W.PDXVotingRecord.noteMember("zach_dembo", [], "");
  const f = W._pdxReportFields("zach_dembo", null);
  const inner = W._pdxReportLineInner("zach_dembo", null);
  const txt = visible(inner);
  ok(/^\d+ stances? · /.test(txt), `reads from the stance count: ${txt}`);
  ok(/ · No formal term yet · /.test(txt), "no term reads as No formal term yet");
  ok(!/undefined|NaN|null/.test(txt), "no stray placeholders");
  ok(!/ · · /.test(txt) && !/^ ·| · $/.test(txt), "no empty segments between dots");
  console.log("      zach_dembo, settled: " + txt);
  ok(!f.actionsPending, "the actions segment settles once every source has answered");
  ok(/ · 0 actions · /.test(txt), "no actions reads as 0 actions");
}

section("3b · an incumbent's actions are the roll-call records on file");
{
  const recs = [1, 2, 3].map((i) => ({ kind: "vote", measureId: "m" + i, number: "H.R. " + i, issues: [] }));
  W.PDXVotingRecord.noteMember("massie", recs, "");
  const mc = W._pdxRecordMappedCounts("massie");
  const f = W._pdxReportFields("massie", null);
  ok(!f.actionsPending, "the actions segment settles once the record is in");
  eq(f.actions, mc ? mc.total : -1, "actions = the Votes chip's record count (no bills table in this harness)");
  const txt = visible(W._pdxReportLineInner("massie", null));
  console.log("      massie, settled: " + txt);
  ok(new RegExp(` · ${f.actions} actions? · \\d+ terms? · 2012–present · `).test(txt), "actions then the term with years");
}

section("4 · the old chip row is gone from view");
{
  const html = open("massie");
  ok(/<nav id="pdx-profile-nav" class="pdx-pnav" hidden /.test(html), "the chip row is emitted hidden");
  const CSS = R("app.css");
  ok(/#pdx-profile-nav\.pdx-pnav, \.pdx-pnav\[hidden\] \{ display: none !important; \}/.test(CSS), "app.css hides the chip row");
  ok(/\.profile-report \{/.test(CSS), "the line has its plain-text style");
}

section("5 · plain text, no chips, no equity wording");
{
  const line = lineOf(open("zach_dembo")) || "";
  ok(!/pdx-pnav|pill|chip|badge/.test(line), "no chip classes inside the line");
  ok(/<span class="pr-dot" aria-hidden="true"> · <\/span>/.test(line), "segments are joined by middle dots");
  const SRC = R("profiles-full.js");
  const blk = SRC.slice(SRC.indexOf("// ── THE REPORT-CARD LINE"), SRC.indexOf("// THE REPAINT. Same event"));
  ok(blk.length > 0 && !/equity|utah-first|utah first/i.test(blk), "no equity or Utah-first wording");
}

console.log("");
if (failures.length) {
  console.log(`✗ profile report line: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ profile report line: all ${passed} assertions passed`);
