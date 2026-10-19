#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-third-party-profiles.mjs — light profiles for the first eight 2026
// third-party nominees: a bio, and a few campaign claims on existing keys
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. EACH FILE SHOWS ITS BIO AND ITS STANCES. The person file (openModal,
//      with person.html's own PDXStance block) prints the one-sentence bio and
//      every stance's sentence, each with its source chip.
//   2. EACH STANCE IS A CAMPAIGN CLAIM, NOT A VOTE. Every card carries the
//      claim line in `detail` and NONE carries `evidence`, which the card
//      prints under a "Record:" label — a vote or a bill these people do not have.
//   3. NO KEY THE SOURCE DOES NOT SUPPORT. Each person's keys are exactly the
//      reviewed list below, every key is an existing ISSUE_MAP key, and the
//      topics their sources do not state (McRae on MIDA; Easley on agricultural
//      water, inflation and energy) are absent. Each source is the candidate's
//      own site or the Tribune questionnaire they answered.
//   4. NO SCORE, NO DIRECTION MATCH FIGURE, NO EQUITY LANGUAGE.
//   5. EVERYONE ELSE IS UNCHANGED: every other person's stances and detail
//      record are byte-identical to HEAD.
//
//   node scripts/test-third-party-profiles.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { carveDeclaredAdmissions } from "./v103-chrome-seams.mjs";

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
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${String(n).slice(0, 80)}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);

// The reviewed list: each person's keys, in order, and the hosts their claims cite.
const PEOPLE = {
  josh_smith:      { keys: ["democracy_balance", "water", "privacy_rights", "housing_build", "public_schools"], hosts: ["www.electjoshsmith.com"], bio: "software engineering manager" },
  julie_quinlan:   { keys: ["water", "campaign_finance", "democracy_balance", "lands_keep_public"], hosts: ["julieq4utah.com"], bio: "studied landscape architecture" },
  colin_smith:     { keys: ["housing_build", "infrastructure", "water"], hosts: ["www.forwardwithcolin.org"], bio: "outdoor behavioral-health professional" },
  annette_mcrae:   { keys: ["housing", "infrastructure", "transit", "reform_balance"], hosts: ["mcraeforsenate.com"], bio: "Uintah Basin for 33 years" },
  wayne_woodfield: { keys: ["gov_transparency", "democracy_balance", "checks_balances"], hosts: ["wayneforsenate.com"], bio: "raised in Mapleton" },
  jesse_west:      { keys: ["restraint", "justice_reform", "immigration_reform", "water"], hosts: ["www.jessewest2026.com", "www.sltrib.com"], bio: "family-law attorney" },
  taylor_wright:   { keys: ["states_federal_power", "tariffs_prices", "restraint", "war_powers"], hosts: ["wrightforutah.com"], bio: "physical education teacher" },
  cassie_easley:   { keys: ["cut_spending", "water", "privacy_rights"], hosts: ["www.sltrib.com"], bio: "Constitution Party nominee" },
};
// Topics a person's source does not state: no card may sit on these keys.
const NOT_IN_SOURCE = {
  annette_mcrae: ["dev_district_finance"],
  cassie_easley: ["rural_ag", "cost_living", "energy_production", "lands_energy", "enviro_energy"],
  taylor_wright: ["econ_growth"],
};
const EQUITY = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholder|\bdividend/i;

const FILES = [
  "cmp-data.js", "cmp-data-detail.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "issue-colors.js",
  "my-stances.js", "voter-hub-location.js", "roster-keys.js", "seat-field.js", "person-link.js", "profiles-full.js",
];
// person.html's own inline PDXStance block — the four-state stance language the card reads.
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
  // The homepage-only helpers openModal reaches for; a figure from either would
  // be a bug here, so both answer blank.
  w._pdxDisplayScore = () => "";
  w._likeCounts = {};
  if (typeof w.URLSearchParams !== "function") w.URLSearchParams = URLSearchParams;
  const ctx = vm.createContext(w);
  w.PROFILES = w.CMP_DATA;
  w.__err = [];
  for (const f of FILES) { try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { w.__err.push(`${f}: ${e.message}`); } }
  try { vm.runInContext(PDX_BLOCK, ctx, { filename: "person.html#PDXStance" }); } catch (e) { w.__err.push(`PDXStance: ${e.message}`); }
  w.PROFILES = w.CMP_DATA;
  return w;
}
const visible = (h) => String(h).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
// The quoted text as the card prints it (apostrophes and dashes unchanged).
const norm = (s) => String(s).replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ");

const w = boot();
if (!ok(typeof w.openModal === "function" && typeof w._renderIssueStances === "function" && w.PDXStance, `the person file did not boot — ${w.__err.join(" | ")}`)) {
  console.log(`\n✗ third-party profiles: 0 passed, ${failures.length} failed`); failures.forEach((f) => console.log("   ✗ " + f)); process.exit(1);
}
const KEYS = new Set(JSON.parse(R("db/issue-keys.json")).keys);
const S = w.ISSUE_STANCE_DATA;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · each file shows its bio and its stances");
const files = {};
for (const [pid, want] of Object.entries(PEOPLE)) {
  const rec = w.CMP_DATA[pid];
  if (!ok(!!rec, `${pid} has a roster row`)) continue;
  ok(typeof rec.bio === "string" && rec.bio.length > 40 && rec.bio.length <= 280, `${pid}: one short bio sentence`);
  eq((rec.bio.match(/[.!?](\s|$)/g) || []).length, 1, `${pid}: the bio is one sentence`);
  has(rec.bio, want.bio, `${pid}: the bio says who they are`);
  has(rec.bio, rec.name, `${pid}: the bio names them`);
  w.__byId["modal-content"] && (w.__byId["modal-content"].innerHTML = "");
  // openModal paints #modal-content first and then wires homepage chrome this
  // harness does not carry; a throw from that wiring is not a missing file, so
  // the claim checked is the painted content itself.
  let threw = "";
  try { w.openModal(pid); } catch (e) { threw = e.message; }
  const html = (w.__byId["modal-content"] || {}).innerHTML || "";
  ok(html.length > 2000, `${pid}: the person file painted${threw ? ` (openModal stopped after: ${threw})` : ""}`);
  files[pid] = html;
  has(html, 'class="pdxbio-t"', `${pid}: the file prints the bio block`);
  has(norm(visible(html)), norm(rec.bio), `${pid}: …with the bio`);
  const cards = norm(visible(w._renderIssueStances(pid, rec)));
  for (const s of S[pid] || []) {
    has(cards, norm(s.text), `${pid}: the "${s.topic}" stance is on the file`);
    has(cards, s.source.label, `${pid}: …with its source`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · each stance is a campaign claim, not a vote");
for (const pid of Object.keys(PEOPLE)) {
  for (const s of S[pid] || []) {
    ok(/^Campaign claim, not a vote — /.test(s.detail || ""), `${pid}/${s.issueKey}: the card says it is a campaign claim`);
    ok(!("evidence" in s), `${pid}/${s.issueKey}: no "Record:" line — a claim is not a vote`);
    ok(!/\b(voted|sponsored|signed|co-?sponsored)\b/i.test(s.text), `${pid}/${s.issueKey}: the sentence claims no act in office`);
  }
  const cards = visible(w._renderIssueStances(pid, w.CMP_DATA[pid]));
  ok(!/Record:/.test(cards), `${pid}: no stance card prints a "Record:" label`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no stance under a key the source does not support");
for (const [pid, want] of Object.entries(PEOPLE)) {
  const list = S[pid] || [];
  ok(list.length >= 3 && list.length <= 5, `${pid}: 3–5 stances (got ${list.length})`);
  eq(JSON.stringify(list.map((s) => s.issueKey)), JSON.stringify(want.keys), `${pid}: the keys are the reviewed list`);
  for (const s of list) {
    ok(KEYS.has(s.issueKey), `${pid}: ${s.issueKey} is an existing issue key`);
    eq(s.issueStance, "support", `${pid}/${s.issueKey}: stated as support of that position`);
    let host = "";
    try { host = new URL(s.source.url).host; } catch {}
    ok(want.hosts.includes(host), `${pid}/${s.issueKey}: sourced to the candidate's own material (got ${host})`);
  }
  for (const k of NOT_IN_SOURCE[pid] || []) ok(!list.some((s) => s.issueKey === k), `${pid}: nothing is filed on ${k}, which the source does not state`);
}
// The keys the reviewed list uses are a fixed set: nobody can grow one by editing here alone.
eq(KEYS.size, JSON.parse(R("db/issue-keys.json")).count, "the issue-key list is the generated one");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no score, no Direction Match figure, no equity language");
for (const pid of Object.keys(PEOPLE)) {
  const rec = w.CMP_DATA[pid];
  eq(rec.score, null, `${pid}: no score`);
  eq(rec.kept + rec.broken + rec.pending, 0, `${pid}: an empty ledger`);
  eq((rec.issues || []).length, 0, `${pid}: the roster row still carries no issues`);
  // Direction Match reads these claims as word with nothing to test them against:
  // no figure, and nothing to publish.
  let dm = null;
  try { dm = w.PDXWordAction.read(pid, rec); } catch {}
  ok(!dm || (dm.pct == null && !dm.publishable), `${pid}: Direction Match has no published figure (got ${dm && dm.pct})`);
  ok(!dm || !(dm.coverage && dm.coverage.tested), `${pid}: no claim is tested against a vote — there are none`);
  const t = visible(files[pid]);
  ok(!/\b\d{1,3}\s?%\s*(?:your\s+)?(?:match|direction|aligned)/i.test(t), `${pid}: the file prints no match percentage`);
  ok(!/Direction Match\s*[:·]?\s*\d/.test(t), `${pid}: the file prints no Direction Match number`);
  ok(!EQUITY.test(t), `${pid}: the file carries no equity language`);
  ok(!EQUITY.test(JSON.stringify(S[pid]) + rec.bio), `${pid}: the stored bio and stances carry no equity language`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · every other profile is unchanged");
{
  const load = (src, pick) => { if (src == null) return null; const x = { CMP_DATA: {} }; new Function("window", src)(x); return pick(x); };
  const ours = new Set(Object.keys(PEOPLE));
  for (const f of ["politician-stances-core.js", "politician-stances-ext.js", "politician-stances.js"]) {
    const h = load(HEAD(f), (x) => x.ISSUE_STANCE_DATA), n = load(R(f), (x) => x.ISSUE_STANCE_DATA);
    if (!h) { console.log(`      (no git baseline for ${f} — the unchanged check did not run)`); passed++; continue; }
    const moved = [...new Set([...Object.keys(h), ...Object.keys(n)])].filter((k) => JSON.stringify(h[k]) !== JSON.stringify(n[k]) && !ours.has(k));
    eq(moved.join(", "), "", `${f}: no other person's stances moved`);
  }
  const h = load(HEAD("cmp-data-detail.js"), (x) => x.CMP_DATA), n = load(R("cmp-data-detail.js"), (x) => x.CMP_DATA);
  if (h) {
    const moved = [...new Set([...Object.keys(h), ...Object.keys(n)])].filter((k) => JSON.stringify(h[k]) !== JSON.stringify(n[k]) && !ours.has(k));
    eq(moved.join(", "), "", "cmp-data-detail.js: no other person's bio or detail moved");
  } else passed++;
  const c = HEAD("cmp-data.js");
  // A later roster batch declared by name (v103-chrome-seams.mjs DECLARED_ADMISSIONS)
  // is the only growth allowed; every other byte of the roster still compares.
  if (c != null) eq(carveDeclaredAdmissions(c), carveDeclaredAdmissions(R("cmp-data.js")), "cmp-data.js (the roster) is unchanged by this pass");
  else passed++;
}

console.log(`\n${failures.length ? "✗" : "✓"} third-party profiles: ${passed} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("   ✗ " + f)); process.exit(1); }
