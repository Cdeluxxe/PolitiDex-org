#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-file-candidacy-line.mjs — the person file says which other office
// a sitting officeholder is running for
// ─────────────────────────────────────────────────────────────────────────────
// Every person in window.CMP_CANDIDACIES (cmp-data.js) holds one office and is
// the 2026 nominee for another. Their file opened on the office held and said
// nothing about the race. profiles-full.js's _pdxCandidacyLine() now prints one
// line under the office line, read from that table and nothing else.
//
// WHAT THIS SUITE PROVES:
//   1. Paxton's file says Running for U.S. Senate, Donalds's Running for
//      Governor, and every other candidacy's file names its own race.
//   2. The office held is still the file's label, and the file never calls them
//      the holder of the office they are running for.
//   3. A file with no candidacy prints no race line, and is byte-identical to
//      the same file booted with no candidacy table at all.
//   4. The line sits in the hero, beside the office line, before anything else.
//   5. No equity language; the shell moved for the changed precached files.
//
//   node scripts/test-person-file-candidacy-line.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const REC = JSON.parse(R("db/roster-cross-office-candidacies-2026-oct.json"));
const TABLE_AT = "/* Sitting officeholders who are 2026 nominees for a different office";
const FILES = [
  "cmp-data.js", "cmp-data-detail.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "issue-colors.js",
  "my-stances.js", "voter-hub-location.js", "roster-keys.js", "seat-field.js", "person-link.js", "profile-evidence.js", "profiles-full.js",
];
const PH = R("person.html");
const PDX_AT = PH.indexOf("// ── PDXStance — shared canonical stance language");
const PDX_BLOCK = PDX_AT < 0 ? "" : PH.slice(PH.lastIndexOf("<script>", PDX_AT) + 8, PH.indexOf("</script>", PDX_AT));
function boot(withoutTable) {
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
  w.Date = class extends Date { constructor(...a) { super(...(a.length ? a : ["2026-10-22T12:00:00Z"])); } static now() { return Date.parse("2026-10-22T12:00:00Z"); } };
  w.Math = Object.assign(Object.create(Math), { random: () => 0.5 });
  const ctx = vm.createContext(w);
  for (const f of FILES) {
    let src = R(f);
    if (withoutTable && f === "cmp-data.js") src = src.slice(0, src.indexOf(TABLE_AT));
    try { vm.runInContext(src, ctx, { filename: f }); } catch (e) { /* page chrome the harness does not carry */ }
  }
  try { vm.runInContext(PDX_BLOCK, ctx, { filename: "person.html#PDXStance" }); } catch (e) {}
  w.PROFILES = w.CMP_DATA;
  return w;
}
const W = boot(false), W0 = boot(true);
const open = (w, pid) => {
  w.__byId["modal-content"] && (w.__byId["modal-content"].innerHTML = "");
  try { w.openModal(pid); } catch (e) { /* homepage chrome the harness does not carry */ }
  return String((w.__byId["modal-content"] || {}).innerHTML || "");
};
const visible = (h) => String(h).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&middot;|·/g, "·").replace(/\s+/g, " ");
const lineOf = (html) => { const m = /<div class="profile-running"[^>]*>([\s\S]*?)<\/div>/.exec(html); return m ? visible(m[1]).trim() : null; };
const hero = (html) => { const a = html.indexOf('<div class="profile-hero-id">'); return a < 0 ? "" : html.slice(a, html.indexOf('<div class="profile-meta">', a)); };
const CY = W.CMP_CANDIDACIES || {};
ok(typeof W.openModal === "function" && typeof W._pdxCandidacyLine === "function", "the person file booted with the candidacy line");

const RACE = { "ken_paxton": "U.S. Senate", "donalds": "Governor", "blackburn": "Governor", "mike_mcguire": "U.S. House (CA-1)", "winnie_brinks": "Lieutenant Governor" };
const SEATED = (race) => new RegExp(`\\b(?:holds|holding|sitting member of|current|incumbent)\\b[^.]{0,40}\\b${race.replace(/[.()]/g, "\\$&")}`, "i");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · each file names its own race");
// ═════════════════════════════════════════════════════════════════════════════
for (const r of REC.rows) {
  const html = open(W, r.pid);
  const race = r.office.replace(/ Candidate(?= \(|$)/, "");
  const line = lineOf(html);
  if (!ok(!!line, `${r.pid}: the file prints a race line`)) continue;
  ok(line.indexOf(`Running for ${race}`) >= 0, `${r.pid}: "Running for ${race}" (${line})`);
  if (RACE[r.pid]) eq(race, RACE[r.pid], `${r.pid}: the race is ${RACE[r.pid]}`);
  ok(line.indexOf(CY[r.pid].state) >= 0, `${r.pid}: the line names ${CY[r.pid].state}`);
  ok(Object.keys(CY).filter((p) => p !== r.pid).every((p) => html.indexOf(`data-pdx-candidacy="${p}"`) < 0), `${r.pid}: no other person's candidacy on the file`);

  // 2 · the office held is the label; never the holder of the race
  const h = hero(html);
  ok(h.indexOf(`<div class="profile-eyebrow">${W.CMP_DATA[r.pid].office}</div>`) >= 0, `${r.pid}: the label is still the office held (${W.CMP_DATA[r.pid].office})`);
  ok(!SEATED(race).test(visible(html)), `${r.pid}: never described as holding ${race}`);
  eq(W.CMP_DATA[r.pid].office, (W0.CMP_DATA[r.pid] || {}).office, `${r.pid}: the roster row is untouched`);

  // 4 · in the hero, right after the office line
  const at = h.indexOf('class="profile-running"');
  ok(at > h.indexOf('class="profile-name"'), `${r.pid}: the race line sits under the name`);
  ok(at > 0 && (h.indexOf('class="profile-tenure"') < 0 || at < h.indexOf('class="profile-tenure"')), `${r.pid}: before the tenure line`);
}
for (const p of ["ken_paxton", "donalds"]) ok(!!lineOf(open(W, p)), `${p}: the required case is covered`);
ok(REC.rows.filter((r) => !["ken_paxton", "donalds"].includes(r.pid)).length >= 2, "at least two other cases are covered");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no candidacy, no line, and the same file as before");
// ═════════════════════════════════════════════════════════════════════════════
const W1 = boot(false);
for (const pid of ["cruz", "john_cornyn", "ron_desantis", "greg_abbott", "maloy", "james_talarico", "angela_prilliman", "peter_crosby"]) {
  if (!ok(!!W.CMP_DATA[pid] && !CY[pid], `${pid}: on the roster, with no candidacy`)) continue;
  const html = open(W, pid);
  eq(lineOf(html), null, `${pid}: no race line`);
  // W1 and W0 are fresh boots opening the same files in the same order, so the
  // per-page mount counters agree and any byte that differs is the table's.
  eq(open(W1, pid), open(W0, pid), `${pid}: the file is byte-identical to one booted with no candidacy table`);
}
eq(W._pdxCandidacyLine("nobody_at_all"), "", "an unknown id prints nothing");
eq(W0._pdxCandidacyLine("ken_paxton"), "", "with no table, nobody gets a line");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no equity language; the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
const EQUITY = /\bequity\b|earn (?:a|your) share|\bshareholders?\b|\bdividends?\b|\bcrowdfund|\bform c\b/i;
const PF = R("profiles-full.js");
const fnSrc = PF.slice(PF.indexOf("window._pdxCandidacyLine"), PF.indexOf("};", PF.indexOf("window._pdxCandidacyLine")));
ok(fnSrc.length > 100 && !EQUITY.test(fnSrc), "the line's source carries no equity language");
const v = (s) => +((String(s).match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0);
const hs = HEAD("sw.js"), hp = HEAD("profiles-full.js");
if (hs && hp && hp.indexOf("_pdxCandidacyLine") < 0) {
  eq(v(R("sw.js")), v(hs) + 1, "profiles-full.js and app.css are precached and changed, so the shell moved one version");
}
ok(/'\/profiles-full\.js'/.test(R("sw.js")) && /'\/app\.css'/.test(R("sw.js")), "profiles-full.js and app.css are on the precache");

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ person-file candidacy line: all ${passed} assertions passed`);
