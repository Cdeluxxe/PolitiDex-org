#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-related-issues.mjs — linked issue pairs on a person file (batch 1)
// ─────────────────────────────────────────────────────────────────────────────
// related-issues.js prints one line per linked pair on which a person has a
// published direction (supports / opposes) on BOTH sides, and nothing else.
//
//   1. OPPOSING: supports one side, opposes the other → the pair and both words.
//   2. ALIGNING: both support or both oppose → the pair and both words.
//   3. INCOMPLETE: one side missing (or mixed) on every pair → '' (no section).
//   4. CLOSED LIST: exactly the four batch-1 pairs, labels matching ISSUE_MAP,
//      and a person with directions on every other key gets nothing.
//   5. NO VERDICT: no %, score, grade or "contradiction" in the markup.
//   6. NOTHING ELSE MOVED: the real stance map is read, not written; the hook in
//      profiles-full.js is a guarded call inside the explore stage; drawers and
//      scoring files are not touched by the hook; the module is on every page
//      that loads profiles-full.js and is precached with a bumped shell.
//
//   node scripts/test-related-issues.mjs
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
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n      got:  ${JSON.stringify(a)}\n      want: ${JSON.stringify(b)}`);

function boot(posMaps) {
  const win = makeSandbox();
  win._polPositionMap = (pid) => posMaps[pid] || {};
  const ctx = vm.createContext(win);
  vm.runInContext(R("related-issues.js"), ctx, { filename: "related-issues.js" });
  return win;
}
const st = (s) => ({ stance: s, text: "fixture" });
const strip = (h) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const FIX = {
  conflict: { water: st("support"), datacenter_water: st("oppose") },
  align:    { lands_preserve: st("support"), lands_energy: st("support") },
  alignNo:  { lands_preserve: st("oppose"), energy_production: st("oppose") },
  oneSide:  { water: st("support"), lands_preserve: st("oppose") },
  mixed:    { water: st("mixed"), datacenter_water: st("support"), lands_preserve: st("support"), lands_energy: st("mixed") },
  none:     {},
  outside:  { abortion: st("support"), guns: st("oppose"), housing: st("support"), climate: st("oppose"),
              water: st("support"), climate_action: st("support") },
  all:      { water: st("support"), datacenter_water: st("oppose"), lands_preserve: st("support"),
              lands_energy: st("support"), energy_production: st("oppose") },
};
const W = boot(FIX);
const RI = W.PDXRelatedIssues;
ok(RI && typeof RI.sectionHtml === "function", "module exports sectionHtml");

// 1. opposing
{
  const h = RI.sectionHtml("conflict", {});
  ok(h.includes("Related issues"), "conflict: section heading present");
  ok(strip(h).includes("Water Conservation: supports · Data Centers & Water: opposes"),
     "conflict: prints both directions side by side — " + strip(h));
  eq((h.match(/class="pdxri-pair"/g) || []).length, 1, "conflict: exactly one pair line");
  ok(h.includes('data-pdxri-rel="conflict"'), "conflict: carries conflict relation as data only");
}
// 2. aligning
{
  const h = RI.sectionHtml("align", {});
  ok(strip(h).includes("Protect Public Lands: supports · Energy & Resource Development: supports"),
     "align: both support — " + strip(h));
  ok(h.includes('data-pdxri-rel="align"'), "align: carries align relation");
  const h2 = RI.sectionHtml("alignNo", {});
  ok(strip(h2).includes("Protect Public Lands: opposes · Expand Domestic Energy Production: opposes"),
     "align: both oppose — " + strip(h2));
}
// 3. incomplete → nothing
eq(RI.sectionHtml("oneSide", {}), "", "one side of every pair: section omitted");
eq(RI.sectionHtml("mixed", {}), "", "mixed is not a published direction: section omitted");
eq(RI.sectionHtml("none", {}), "", "no positions: section omitted");
eq(RI.sectionHtml("nobody", {}), "", "unknown pid: section omitted");
{
  const bare = boot({}); delete bare._polPositionMap;
  eq(bare.PDXRelatedIssues.sectionHtml("conflict", {}), "", "no stance map on page: section omitted");
}

// 4. closed list
{
  const P = RI.PAIRS.map((p) => p.a.key + "|" + p.b.key);
  eq(JSON.stringify(P), JSON.stringify([
    "water|datacenter_water", "lands_preserve|lands_energy",
    "lands_preserve|energy_production", "water|energy_production",
  ]), "exactly the four batch-1 pairs, in order");
  eq(RI.sectionHtml("outside", {}), "", "directions on keys outside the pairs print nothing");
  const all = RI.pairsFor("all", {});
  eq(all.length, 4, "a person with every side filled gets all four and no more");
  eq(all.map((r) => RI.lineText(r)).join("\n"), [
    "Water Conservation: supports · Data Centers & Water: opposes",
    "Protect Public Lands: supports · Energy & Resource Development: supports",
    "Protect Public Lands: supports · Expand Domestic Energy Production: opposes",
    "Water Conservation: supports · Expand Domestic Energy Production: opposes",
  ].join("\n"), "the four lines, as specified");
  // Labels are the shared taxonomy's own labels, emoji stripped.
  const im = makeSandbox();
  vm.runInContext(R("issue-map.js"), vm.createContext(im), { filename: "issue-map.js" });
  const IM = im.ISSUE_MAP || {};
  RI.PAIRS.forEach((p) => [p.a, p.b].forEach((s) => {
    const lab = IM[s.key] && String(IM[s.key].label).replace(/^[^A-Za-z]+/, "").trim();
    eq(lab, s.label, `label for ${s.key} matches ISSUE_MAP`);
  }));
}

// 5. no verdict vocabulary
{
  const h = RI.sectionHtml("all", {});
  ok(!/%|score|grade|contradict|match|inconsisten|consistent/i.test(strip(h)),
     "no score, grade, percentage or contradiction wording: " + strip(h));
}

// 6. real data — read-only, and the real stance map yields lines in the vocabulary
{
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ["politician-stances-core.js", "politician-stances-ext.js", ...Array.from({length:16},(_, i)=> i ? `state-senate-stances-w${i+1}.js` : "state-senate-stances.js"), "stance-helpers.js", "related-issues.js"]) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { failures.push(`load ${f}: ${e.message}`); }
  }
  const SD = win.ISSUE_STANCE_DATA || vm.runInContext("typeof ISSUE_STANCE_DATA!=='undefined'?ISSUE_STANCE_DATA:null", ctx);
  ok(SD && typeof win._polPositionMap === "function", "real stance corpus and position map load");
  if (SD && typeof win._polPositionMap === "function") {
    const before = JSON.stringify(SD);
    let shown = 0, conflict = 0, align = 0, bad = 0;
    for (const pid of Object.keys(SD)) {
      const rows = win.PDXRelatedIssues.pairsFor(pid, { name: "" });
      const pm = win._polPositionMap(pid, { name: "" });
      const h = win.PDXRelatedIssues.sectionHtml(pid, { name: "" });
      if (!rows.length) { if (h !== "") bad++; continue; }
      shown++;
      rows.forEach((r) => {
        if (r.relation === "align") align++; else conflict++;
        if (pm[r.a.key].stance !== r.a.dir || pm[r.b.key].stance !== r.b.dir) bad++;
        if (!/^[A-Za-z &]+: (supports|opposes) · [A-Za-z &]+: (supports|opposes)$/.test(win.PDXRelatedIssues.lineText(r))) bad++;
      });
    }
    eq(bad, 0, "every real line reads the published stance and the fixed vocabulary");
    ok(shown > 0, "at least one real person file carries a complete pair");
    eq(JSON.stringify(SD), before, "stance corpus is not mutated");
    console.log(`   real corpus: ${shown} files with a pair · ${align} aligned · ${conflict} opposite`);
  }
}

// 7. wiring
{
  const pf = R("profiles-full.js");
  const i = pf.indexOf("window.PDXRelatedIssues.sectionHtml(id, p)");
  ok(i > 0, "profiles-full.js calls the section");
  const before = pf.lastIndexOf("<!--PDXSP:", i);
  ok(pf.slice(before, before + 20).startsWith("<!--PDXSP:explore-->"), "section sits in the explore stage, after the topic tree");
  ok(/typeof window\.PDXRelatedIssues\.sectionHtml === 'function'/.test(pf), "the call is guarded");
  for (const page of ["index.html", "person.html", "ballot.html"]) {
    ok(R(page).includes('<script defer src="/related-issues.js"></script>'), `${page} loads related-issues.js`);
  }
  const sw = R("sw.js");
  ok(sw.includes("'/related-issues.js',"), "related-issues.js is precached");
  const v = Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]);
  ok(v >= 496, "shell version bumped");
  const mod = R("related-issues.js");
  ok(!/PDXConsistency|_issueVerdict|directionMatch|_DOS_EFFECT/.test(mod.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")),
     "module reads no scoring or effect engine");
}

if (failures.length) {
  console.error(`\n✗ related-issues: ${failures.length} failure(s)\n  - ` + failures.join("\n  - "));
  process.exit(1);
}
console.log(`✓ related-issues: all ${passed} assertions passed`);
