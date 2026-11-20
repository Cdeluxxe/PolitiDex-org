#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wva-scored-set.mjs — one scored set behind the header, the summary
// buckets, the detailed lists and the outside-the-score line
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS SUITE PROVES, on Massie with his live roll-call record
// (scripts/fixtures/vr-massie-member.json):
//   1. The PolitiDex mark is in the person letterhead's top-left corner and not
//      on the portrait.
//   2. The header Word vs Action pill — its percentage and its "N of M" count —
//      is the summary buckets' own arithmetic: N is Contradicted + Mixed +
//      Backed up, and the percentage is (Backed up + ½ Mixed) ÷ N.
//   3. Every summary count (the shape strip, the tally, the switcher tabs) is
//      the number of issues listed under that bucket, and every row listed under
//      a bucket speaks for that bucket: Contradicted, Mixed and Backed up rows
//      carry that word and their Direction Match figure; Not enough on file and
//      Record only rows carry their pile's name and no figure.
//   4. The "Outside the score" line is absent under every row that shows a
//      Direction Match figure and a Contradicted, Mixed or Backed up word, and
//      present under every other row.
//   5. Record only: the summary count is exactly the number of issues in the
//      Record only list, and every Record only disclosure on the page (Key Issue
//      Stances, Related issues) holds exactly the number its summary shows.
//   6. The tension-first block holds exactly the issues the Contradicted and
//      Mixed buckets hold.
//
//   node scripts/test-wva-scored-set.mjs
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
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const FILES = [
  "cmp-data.js", "cmp-data-detail.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "issue-colors.js",
  "my-stances.js", "voter-hub-location.js", "roster-keys.js", "seat-field.js", "person-link.js", "profile-evidence.js",
  "stance-tree.js", "related-issues.js", "profiles-full.js",
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
  w.addEventListener = () => {};
  w.dispatchEvent = () => true;
  const ctx = vm.createContext(w);
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { /* page chrome the harness does not carry */ }
  }
  try { vm.runInContext(PDX_BLOCK, ctx, { filename: "person.html#PDXStance" }); } catch (e) {}
  w.PROFILES = w.CMP_DATA;
  return w;
}
const W = boot();
const PID = "massie";
const fx = JSON.parse(R("scripts/fixtures/vr-massie-member.json"));
W.PDXVotingRecord._liveRead[PID] = true;
W.PDXVotingRecord.noteMember(PID, fx.items, "live");
const open = (pid) => {
  W.__byId["modal-content"] && (W.__byId["modal-content"].innerHTML = "");
  try { W.openModal(pid); } catch (e) { /* homepage chrome the harness does not carry */ }
  return String((W.__byId["modal-content"] || {}).innerHTML || "");
};
const WA = W.PDXWordAction;
const P = W.CMP_DATA[PID];
ok(WA && typeof WA.outcomeBuckets === "function" && typeof W.openModal === "function", "the person file booted");

const RESULT = ["contradicts", "mixed", "consistent"];
const SHORT = { contradicts: "Contradicted", mixed: "Mixed", consistent: "Backed up", limited: "Not enough on file", record: "Record only" };
const b = WA.outcomeBuckets(PID);
const n = (t) => ((b && b.buckets[t]) || []).length;
const keysOf = (t) => ((b && b.buckets[t]) || []).map((r) => r.key);

section("1 · the PolitiDex mark");
{
  const html = open(PID);
  const hero = html.slice(html.indexOf('<div class="profile-hero">'), html.indexOf('<div class="profile-hero-face">'));
  const face = html.slice(html.indexOf('<div class="profile-hero-face">'), html.indexOf('<div class="profile-hero-id">'));
  ok(/<span class="pdx-hdr-mark profile-hero-mark"><img src="\/assets\/pdx-mark-192\.png"/.test(hero), "the mark opens the letterhead, ahead of the portrait");
  ok(face.length > 0 && !/pdx-mark-192|pdx-hdr-mark/.test(face), "the portrait carries no mark");
  const CSS = R("app.css");
  ok(/\.profile-hero-mark \{[^}]*position: absolute; top: 0; left: 0;/.test(CSS), "the mark is pinned to the letterhead's top-left corner");
}

section("2 · the header pill is the buckets' own arithmetic");
{
  ok(!!b && b.judged > 0, "Massie's record fills the result buckets");
  const judged = RESULT.reduce((s, t) => s + n(t), 0);
  eq(b.judged, judged, "the tested count is Contradicted + Mixed + Backed up");
  const wa = WA.read(PID, P);
  ok(wa.publishable && typeof wa.pct === "number", "the read publishes a figure");
  eq(wa.coverage.tested, judged, "the read is taken over the issues in the three result buckets");
  eq(wa.pct, Math.round(100 * (n("consistent") + 0.5 * n("mixed")) / judged), "the percentage is (Backed up + ½ Mixed) ÷ tested");
  const chip = W._pdxNavChips(PID, null).wordaction;
  const band = wa.pct >= 95 ? "Backed up" : wa.pct >= 65 ? "Mixed" : "Contradicted";
  eq(chip && chip.value, `${wa.pct}% · ${band}`, "the header pill prints that percentage and its 95 / 65 word");
  ok(chip && new RegExp(`tested on ${judged} of `).test(chip.note || ""), `the header pill's count is the ${judged} tested issues (${chip && chip.note})`);
}

section("3 · summary counts = the issues listed under each bucket");
const sec = String(WA.sectionHtml(PID, P) || "");
const panels = {};
for (const m of sec.matchAll(/data-pdxwa-oc-panel="(\w+)"([\s\S]*?)<\/section>/g)) panels[m[1]] = m[2];
{
  ok(sec.length > 0 && Object.keys(panels).length === 5, "the section renders all five bucket lists");
  for (const t of Object.keys(SHORT)) {
    const body = panels[t] || "";
    const lis = body.match(/<li class="pdxwa-oc-li"[\s\S]*?<\/li>/g) || [];
    eq(lis.map((li) => /data-pdxwa-issue="(\w+)"/.exec(li)[1]), keysOf(t), `${SHORT[t]}: the list holds exactly the bucket's issues`);
    const tabs = [...sec.matchAll(new RegExp(`data-pdxwa-seg="${t}"[^>]*><span class="pdxwa-(?:tally|comp|oc-tab)-n">(\\d+)<`, "g"))].map((m) => +m[1]);
    ok(tabs.length >= 3 && tabs.every((x) => x === lis.length), `${SHORT[t]}: every summary count reads ${lis.length} (${tabs.join(", ")})`);
    lis.forEach((li) => {
      const k = /data-pdxwa-issue="(\w+)"/.exec(li)[1];
      const cue = (/<span class="pdxwa-oc-cue"[^>]*>([^<]*)<\/span>/.exec(li) || [])[1];
      eq(cue, SHORT[t], `${SHORT[t]} · ${k}: the row speaks for the bucket it is listed under`);
      const hasPct = /class="pdxwa-oc-pct-v"/.test(li);
      if (RESULT.includes(t)) ok(hasPct, `${SHORT[t]} · ${k}: a result row carries its Direction Match figure`);
      else ok(!hasPct, `${SHORT[t]} · ${k}: a row outside the tested set prints no Direction Match figure`);
    });
  }
  const shown = Object.keys(panels).filter((t) => /class="pdxwa-oc-pct-v"/.test(panels[t]));
  ok(shown.every((t) => RESULT.includes(t)), "a Direction Match figure appears only in the three result buckets");
  const labelled = (sec.match(/<span class="pdxwa-oc-cue"[^>]*>(Contradicted|Mixed|Backed up)<\/span>/g) || []).length;
  eq(labelled, b.judged, "the number of rows labelled Contradicted, Mixed or Backed up is the header's tested count");
}

section("4 · \"Outside the score\" only where there is no Direction Match result");
{
  let scored = 0, unscored = 0;
  for (const t of Object.keys(panels)) {
    for (const li of panels[t].match(/<li class="pdxwa-oc-li"[\s\S]*?<\/li>/g) || []) {
      const k = /data-pdxwa-issue="(\w+)"/.exec(li)[1];
      const isScored = /class="pdxwa-oc-pct-v"/.test(li) && /<span class="pdxwa-oc-cue"[^>]*>(Contradicted|Mixed|Backed up)<\/span>/.test(li);
      const hasPub = /class="pdxwa-oc-pub[ "]/.test(li) || /Outside the score/.test(li) || /Not in Direction Match/.test(li);
      if (isScored) { scored++; ok(!hasPub, `${k}: the outside-the-score block sits under a scored issue`); }
      else { unscored++; ok(hasPub, `${k}: an issue with no Direction Match result lost its outside-the-score line`); }
    }
  }
  eq(scored, b.judged, "every tested issue was checked");
  ok(unscored > 0, "the unscored rows were checked too");
}

section("5 · Record only — the count is the list");
{
  const rec = (panels.record || "").match(/<li class="pdxwa-oc-li"/g) || [];
  ok(n("record") > 0, "Massie has record-only issues");
  eq(rec.length, n("record"), "the Record only list holds the summary's count");
  eq(b.formal, n("record"), "the record-only population is the Record only bucket");
  ok((sec.match(new RegExp(`Record only: ${n("record")} issue`, "g")) || []).length >= 1, "the summary names that count");
  // Every collapsed Record only disclosure on the page holds what its summary says.
  const kis = String(W._renderIssueStances(PID, P) || "");
  for (const m of kis.matchAll(/<details class="stance-cat stance-ro"[\s\S]*?stance-cat-n">(\d+)<\/span><\/summary>([\s\S]*?)<\/details>/g)) {
    eq((m[2].match(/class="stance-card[ "]/g) || []).length, +m[1], "Key Issue Stances: the Record only disclosure holds its count");
  }
  const RI = W.PDXRelatedIssues;
  const ris = RI ? String(RI.sectionHtml(PID, P) || "") : "";
  for (const m of ris.matchAll(/<details class="pdxri-ro"[^>]*><summary class="pdxri-ro-s">[^<]*<span class="pdxri-ro-n">(\d+)<\/span><\/summary>([\s\S]*?)<\/details>/g)) {
    eq((m[2].match(/<li class="pdxri-group"/g) || []).length, +m[1], "Related issues: the Record only disclosure holds its count");
  }
}

section("6 · the tension block is the Contradicted and Mixed buckets");
{
  const kis = String(W._renderIssueStances(PID, P) || "");
  const a = kis.indexOf('data-kis-block="tension"');
  ok(a >= 0, "Key Issue Stances leads with the tension block");
  const tb = kis.slice(a, kis.indexOf("data-kis-family", a));
  const got = [...new Set([...tb.matchAll(/data-ev-issue="(\w+)"/g)].map((m) => m[1]))].sort();
  const want = keysOf("contradicts").concat(keysOf("mixed")).sort();
  eq(got, want, "the tension block holds exactly the issues filed Contradicted or Mixed");
  const RI = W.PDXRelatedIssues;
  const tok = RI.wvaTokens(PID);
  keysOf("limited").forEach((k) => eq(RI.tensionOf(PID, k, { stated: true, dir: "support", item: { rec: "against" }, tokens: tok }), null,
    `${k}: an issue filed Not enough on file is not read as tension from its own row`));
}

console.log("");
if (failures.length) {
  console.error(`✗ word vs action scored set: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`✓ word vs action scored set: all ${passed} assertions passed`);
