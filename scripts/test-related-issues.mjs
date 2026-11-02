#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-related-issues.mjs — linked issue pairs on a person file (batches 1–6)
// ─────────────────────────────────────────────────────────────────────────────
// related-issues.js prints one line per linked pair on which a person has a
// published direction (supports / opposes) on BOTH sides, and nothing else.
//
//   1. OPPOSING: supports one side, opposes the other → the pair and both words.
//   2. ALIGNING: both support or both oppose → the pair and both words.
//   3. INCOMPLETE: one side missing (or mixed) on every pair → '' (no section).
//   4. CLOSED LIST: exactly fifty-four pairs (4 + 4 + 4 + 3 + 2 + 37), labels matching ISSUE_MAP,
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
  oneSide:  { water: st("support"), lands_energy: st("oppose") },
  mixed:    { water: st("mixed"), datacenter_water: st("support"), lands_preserve: st("support"), lands_energy: st("mixed") },
  none:     {},
  outside:  { abortion: st("support"), guns: st("oppose"), housing: st("support"), climate: st("oppose"),
              water: st("support"), climate_action: st("support") },
  all17:    { water: st("support"), datacenter_water: st("oppose"), lands_preserve: st("support"),
              lands_energy: st("support"), energy_production: st("oppose"),
              healthcare: st("support"), cut_spending: st("oppose"), social_security: st("support"),
              national_debt: st("support"), gov_regulation: st("oppose"), enviro_balance: st("support"),
              israel_support: st("support"), restraint: st("support"), strong_defense: st("support"),
              war_powers: st("oppose"), iran_policy: st("oppose"), ukraine_policy: st("support"),
              school_choice: st("support"), public_schools: st("oppose"), edu_parental: st("support"),
              housing: st("support"), housing_build: st("support"),
              gun_rights: st("support"), gun_safety: st("oppose"),
              tough_on_crime: st("support"), justice_reform: st("support") },
  // batch 2
  b2conflict: { healthcare: st("support"), cut_spending: st("oppose") },
  b2align:    { social_security: st("support"), national_debt: st("support") },
  b2alignNo:  { gov_regulation: st("oppose"), enviro_balance: st("oppose") },
  b2oneSide:  { healthcare: st("support"), social_security: st("oppose"), gov_regulation: st("support"),
                cut_spending: st("mixed"), national_debt: st("mixed"), enviro_balance: st("mixed") },
  b2plusB1:   { healthcare: st("support"), water: st("support"), datacenter_water: st("support") },
  // batch 3
  b3conflict: { strong_defense: st("support"), war_powers: st("oppose") },
  b3align:    { israel_support: st("support"), restraint: st("support") },
  b3alignNo:  { ukraine_policy: st("oppose"), strong_defense: st("oppose") },
  b3oneSide:  { israel_support: st("support"), iran_policy: st("oppose"), strong_defense: st("mixed"),
                restraint: st("mixed"), war_powers: st("mixed") },
  b3plusB2:   { israel_support: st("support"), ukraine_policy: st("support"),
                healthcare: st("support"), cut_spending: st("oppose") },
  // batch 4
  b4conflict: { school_choice: st("support"), public_schools: st("oppose") },
  b4align:    { housing: st("support"), housing_build: st("support") },
  b4alignNo:  { edu_parental: st("oppose"), public_schools: st("oppose") },
  b4oneSide:  { school_choice: st("support"), edu_parental: st("mixed"), housing: st("support"),
                public_schools: st("mixed"), housing_build: st("mixed") },
  b4plusB3:   { school_choice: st("support"), housing_build: st("oppose"),
                strong_defense: st("support"), war_powers: st("oppose") },
  // batch 5
  b5conflict: { gun_rights: st("support"), gun_safety: st("oppose") },
  b5align:    { tough_on_crime: st("support"), justice_reform: st("support") },
  b5alignNo:  { gun_rights: st("oppose"), gun_safety: st("oppose") },
  b5oneSide:  { gun_rights: st("support"), justice_reform: st("oppose"), gun_safety: st("mixed"),
                tough_on_crime: st("mixed"), gun_balance: st("support"), veterans: st("support") },
  b5plusB4:   { gun_rights: st("support"), tough_on_crime: st("oppose"),
                housing: st("support"), housing_build: st("oppose") },
  // the deferred due-process pairs: no Due Process key exists, and middle-position
  // keys (immig_balance, gun_balance …) are in no pair
  border:     { border_security: st("support"), deportations: st("support"), immig_balance: st("oppose"),
                gun_balance: st("support"), gov_balance: st("oppose"), foreign_balance: st("support") },
  // batch 6
  b6conflict: { deportations: st("support"), immigration_reform: st("oppose") },
  b6align:    { back_police: st("support"), tough_on_crime: st("support") },
  b6alignNo:  { voter_id: st("oppose"), voting_access: st("oppose") },
  b6oneSide:  { climate_action: st("support"), lower_taxes: st("support"), pro_life: st("support"),
                tariffs_prices: st("mixed"), checks_balances: st("mixed"), privacy_rights: st("mixed"),
                restraint: st("mixed"), gov_services: st("mixed") },
  b6plusB5:   { pro_life: st("support"), gun_rights: st("support"), gun_safety: st("oppose") },
};
FIX.all = Object.assign({}, FIX.all17, {
  gov_regulation: st("oppose"), lands_keep_public: st("support"), lands_local: st("oppose"),
  permitting_reform: st("oppose"), climate_action: st("support"),
  datacenter_growth: st("support"), datacenter_power: st("support"),
  lower_taxes: st("support"), gov_services: st("support"),
  tariffs_growth: st("support"), tariffs_prices: st("oppose"), tariffs_china: st("support"),
  tariffs_authority: st("support"), checks_balances: st("support"),
  econ_growth: st("support"), econ_corp_account: st("oppose"), healthcare_market: st("oppose"),
  deportations: st("support"), immigration_reform: st("oppose"), border_security: st("support"),
  back_police: st("support"), cannabis_reform: st("oppose"),
  pro_life: st("support"), pro_choice: st("oppose"), religious_liberty: st("support"), lgbtq_rights: st("oppose"),
  voter_id: st("support"), voting_access: st("oppose"), election_integrity: st("support"), election_security: st("support"),
  america_first: st("support"), america_first_fp: st("support"),
  power_of_purse: st("support"), judicial_check: st("oppose"),
  tech_innovation: st("support"), privacy_rights: st("support"),
});
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
// 2b. batch 2 opposing / aligning
{
  const h = RI.sectionHtml("b2conflict", {});
  ok(h.includes("Related issues"), "b2 conflict: section heading present");
  ok(strip(h).includes("Expand Healthcare Access: supports · Cut Federal Spending & Reduce Debt: opposes"),
     "b2 conflict: both directions — " + strip(h));
  eq((h.match(/class="pdxri-pair"/g) || []).length, 1, "b2 conflict: exactly one pair line");
  ok(h.includes('data-pdxri-rel="conflict"'), "b2 conflict: conflict relation as data");
  const h2 = RI.sectionHtml("b2align", {});
  ok(strip(h2).includes("Protect Social Security & Medicare: supports · Tackle the National Debt: supports"),
     "b2 align: both support — " + strip(h2));
  ok(h2.includes('data-pdxri-rel="align"'), "b2 align: align relation");
  const h3 = RI.sectionHtml("b2alignNo", {});
  ok(strip(h3).includes("Cut Federal Red Tape: opposes · Practical Stewardship: opposes"),
     "b2 align: both oppose — " + strip(h3));
  eq(RI.sectionHtml("b2oneSide", {}), "", "b2: one side missing or mixed on every pair: section omitted");
  const rows = RI.pairsFor("b2plusB1", {});
  eq(rows.map((r) => r.a.key + "|" + r.b.key).join(","), "water|datacenter_water",
     "b2: incomplete batch-2 pairs drop out while a complete batch-1 pair still prints");
}
// 2c. batch 3 opposing / aligning / incomplete
{
  const h = RI.sectionHtml("b3conflict", {});
  ok(h.includes("Related issues"), "b3 conflict: section heading present");
  ok(strip(h).includes("Peace Through Strength: supports · Congress and War Powers: opposes"),
     "b3 conflict: both directions — " + strip(h));
  eq((h.match(/class="pdxri-pair"/g) || []).length, 1, "b3 conflict: exactly one pair line");
  ok(h.includes('data-pdxri-rel="conflict"'), "b3 conflict: conflict relation as data");
  const h2 = RI.sectionHtml("b3align", {});
  ok(strip(h2).includes("Support for Israel: supports · Diplomacy & Restraint: supports"),
     "b3 align: both support — " + strip(h2));
  ok(h2.includes('data-pdxri-rel="align"'), "b3 align: align relation");
  const h3 = RI.sectionHtml("b3alignNo", {});
  ok(strip(h3).includes("Ukraine: opposes · Peace Through Strength: opposes"),
     "b3 align: both oppose — " + strip(h3));
  eq(RI.sectionHtml("b3oneSide", {}), "", "b3: one side missing or mixed on every pair: section omitted");
  const rows = RI.pairsFor("b3plusB2", {});
  eq(rows.map((r) => r.a.key + "|" + r.b.key).join(","), "healthcare|cut_spending",
     "b3: incomplete batch-3 pairs drop out while a complete batch-2 pair still prints");
  eq(RI.sectionHtml("border", {}), "", "deferred due-process pairs and middle-position keys are in no pair");
}
// 2d. batch 4 opposing / aligning / incomplete
{
  const h = RI.sectionHtml("b4conflict", {});
  ok(h.includes("Related issues"), "b4 conflict: section heading present");
  ok(strip(h).includes("School Choice & Education Freedom: supports · Invest in Public Schools: opposes"),
     "b4 conflict: both directions — " + strip(h));
  eq((h.match(/class="pdxri-pair"/g) || []).length, 1, "b4 conflict: exactly one pair line");
  ok(h.includes('data-pdxri-rel="conflict"'), "b4 conflict: conflict relation as data");
  const h2 = RI.sectionHtml("b4align", {});
  ok(strip(h2).includes("Housing Affordability: supports · Build More Housing: supports"),
     "b4 align: both support — " + strip(h2));
  ok(h2.includes('data-pdxri-rel="align"'), "b4 align: align relation");
  const h3 = RI.sectionHtml("b4alignNo", {});
  ok(strip(h3).includes("Parental Rights in Schools: opposes · Invest in Public Schools: opposes"),
     "b4 align: both oppose — " + strip(h3));
  eq(RI.sectionHtml("b4oneSide", {}), "", "b4: one side missing or mixed on every pair: section omitted");
  const rows = RI.pairsFor("b4plusB3", {});
  eq(rows.map((r) => r.a.key + "|" + r.b.key).join(","), "strong_defense|war_powers",
     "b4: incomplete batch-4 pairs drop out while a complete batch-3 pair still prints");
}
// 2e. batch 5 opposing / aligning / incomplete
{
  const h = RI.sectionHtml("b5conflict", {});
  ok(h.includes("Related issues"), "b5 conflict: section heading present");
  ok(strip(h).includes("Protect Gun Rights: supports · Stronger Gun Safety Laws: opposes"),
     "b5 conflict: both directions — " + strip(h));
  eq((h.match(/class="pdxri-pair"/g) || []).length, 1, "b5 conflict: exactly one pair line");
  ok(h.includes('data-pdxri-rel="conflict"'), "b5 conflict: conflict relation as data");
  const h2 = RI.sectionHtml("b5align", {});
  ok(strip(h2).includes("Tough on Crime: supports · Criminal Justice Reform: supports"),
     "b5 align: both support — " + strip(h2));
  ok(h2.includes('data-pdxri-rel="align"'), "b5 align: align relation");
  const h3 = RI.sectionHtml("b5alignNo", {});
  ok(strip(h3).includes("Protect Gun Rights: opposes · Stronger Gun Safety Laws: opposes"),
     "b5 align: both oppose — " + strip(h3));
  eq(RI.sectionHtml("b5oneSide", {}), "", "b5: one side missing or mixed on every pair: section omitted");
  const rows = RI.pairsFor("b5plusB4", {});
  eq(rows.map((r) => r.a.key + "|" + r.b.key).join(","), "housing|housing_build",
     "b5: incomplete batch-5 pairs drop out while a complete batch-4 pair still prints");
}
// 2f. batch 6 opposing / aligning / incomplete
{
  const h = RI.sectionHtml("b6conflict", {});
  ok(h.includes("Related issues"), "b6 conflict: section heading present");
  ok(strip(h).includes("Mass Deportations & Border Security: supports · Pathways to Citizenship: opposes"),
     "b6 conflict: both directions — " + strip(h));
  eq((h.match(/class="pdxri-pair"/g) || []).length, 1, "b6 conflict: exactly one pair line");
  ok(h.includes('data-pdxri-rel="conflict"'), "b6 conflict: conflict relation as data");
  const h2 = RI.sectionHtml("b6align", {});
  ok(strip(h2).includes("Back Law Enforcement: supports · Tough on Crime: supports"),
     "b6 align: both support — " + strip(h2));
  eq((h2.match(/class="pdxri-pair"/g) || []).length, 1, "b6 align: exactly one pair line");
  ok(h2.includes('data-pdxri-rel="align"'), "b6 align: align relation");
  const h3 = RI.sectionHtml("b6alignNo", {});
  ok(strip(h3).includes("Voter ID & Election Integrity: opposes · Expand Voting Access: opposes"),
     "b6 align: both oppose — " + strip(h3));
  eq(RI.sectionHtml("b6oneSide", {}), "", "b6: one side missing or mixed on every new pair: section omitted");
  const rows = RI.pairsFor("b6plusB5", {});
  eq(rows.map((r) => r.a.key + "|" + r.b.key).join(","), "gun_rights|gun_safety",
     "b6: incomplete batch-6 pairs drop out while a complete batch-5 pair still prints");
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
    "healthcare|cut_spending", "social_security|national_debt",
    "gov_regulation|enviro_balance", "healthcare|national_debt",
    "israel_support|restraint", "strong_defense|war_powers",
    "iran_policy|restraint", "ukraine_policy|strong_defense",
    "school_choice|public_schools", "edu_parental|public_schools", "housing|housing_build",
    "gun_rights|gun_safety", "tough_on_crime|justice_reform",
    "lands_preserve|gov_regulation", "water|lands_preserve", "lands_keep_public|lands_local",
    "lands_preserve|permitting_reform", "climate_action|energy_production", "climate_action|gov_regulation",
    "datacenter_growth|datacenter_water", "datacenter_growth|datacenter_power",
    "lower_taxes|national_debt", "lower_taxes|gov_services", "cut_spending|gov_services",
    "social_security|cut_spending", "strong_defense|cut_spending",
    "tariffs_growth|tariffs_prices", "tariffs_china|tariffs_prices", "tariffs_authority|checks_balances",
    "econ_growth|econ_corp_account", "healthcare_market|healthcare",
    "deportations|immigration_reform", "border_security|immigration_reform",
    "back_police|justice_reform", "back_police|tough_on_crime", "cannabis_reform|tough_on_crime",
    "pro_life|pro_choice", "religious_liberty|lgbtq_rights",
    "voter_id|voting_access", "election_integrity|voting_access", "election_security|voting_access",
    "strong_defense|restraint", "america_first|restraint",
    "america_first_fp|ukraine_policy", "america_first_fp|israel_support",
    "war_powers|checks_balances", "power_of_purse|checks_balances", "judicial_check|checks_balances",
    "tech_innovation|privacy_rights", "school_choice|edu_parental",
  ]), "exactly fifty-four pairs: batches 1 through 6, in order");
  eq(RI.PAIRS.length, 54, "exactly fifty-four pairs in total");
  // no pair twice, in either order, and no key paired with itself
  const seen = new Set(RI.PAIRS.map((p) => [p.a.key, p.b.key].sort().join("|")));
  eq(seen.size, 54, "no pair is listed twice");
  ok(RI.PAIRS.every((p) => p.a.key !== p.b.key), "no key is paired with itself");
  ok(RI.PAIRS.slice(17).every((p) => !/_balance$/.test(p.a.key) && !/_balance$/.test(p.b.key)), "no middle-position key is in a new pair");
  // the seventeen shipped pairs still print, alone, from the original fixture
  const old = RI.pairsFor("all17", {});
  eq(old.slice(0, 17).map((r) => r.a.key + "|" + r.b.key).join(","),
     RI.PAIRS.slice(0, 17).map((p) => p.a.key + "|" + p.b.key).join(","), "the seventeen shipped pairs, first and in order");
  eq(RI.sectionHtml("outside", {}), "", "directions on keys outside the pairs print nothing");
  const all = RI.pairsFor("all", {});
  eq(all.length, 54, "a person with every side filled gets all fifty-four and no more");
  eq(all.map((r) => RI.lineText(r)).join("\n"), [
    "Water Conservation: supports · Data Centers & Water: opposes",
    "Protect Public Lands: supports · Energy & Resource Development: supports",
    "Protect Public Lands: supports · Expand Domestic Energy Production: opposes",
    "Water Conservation: supports · Expand Domestic Energy Production: opposes",
    "Expand Healthcare Access: supports · Cut Federal Spending & Reduce Debt: opposes",
    "Protect Social Security & Medicare: supports · Tackle the National Debt: supports",
    "Cut Federal Red Tape: opposes · Practical Stewardship: supports",
    "Expand Healthcare Access: supports · Tackle the National Debt: supports",
    "Support for Israel: supports · Diplomacy & Restraint: supports",
    "Peace Through Strength: supports · Congress and War Powers: opposes",
    "Iran: opposes · Diplomacy & Restraint: supports",
    "Ukraine: supports · Peace Through Strength: supports",
    "School Choice & Education Freedom: supports · Invest in Public Schools: opposes",
    "Parental Rights in Schools: supports · Invest in Public Schools: opposes",
    "Housing Affordability: supports · Build More Housing: supports",
    "Protect Gun Rights: supports · Stronger Gun Safety Laws: opposes",
    "Tough on Crime: supports · Criminal Justice Reform: supports",
    "Protect Public Lands: supports · Cut Federal Red Tape: opposes",
    "Water Conservation: supports · Protect Public Lands: supports",
    "Keep Public Lands Public: supports · Local Land Control: opposes",
    "Protect Public Lands: supports · Faster Permits & Reviews: opposes",
    "Climate Action & Clean Energy: supports · Expand Domestic Energy Production: opposes",
    "Climate Action & Clean Energy: supports · Cut Federal Red Tape: opposes",
    "Data Centers & AI Growth: supports · Data Centers & Water: opposes",
    "Data Centers & AI Growth: supports · Data Centers, Power & Ratepayers: supports",
    "Cut Income & Business Taxes: supports · Tackle the National Debt: supports",
    "Cut Income & Business Taxes: supports · Invest in Public Services: supports",
    "Cut Federal Spending & Reduce Debt: opposes · Invest in Public Services: supports",
    "Protect Social Security & Medicare: supports · Cut Federal Spending & Reduce Debt: opposes",
    "Peace Through Strength: supports · Cut Federal Spending & Reduce Debt: opposes",
    "Tariffs & American Industry: supports · Tariffs & Household Prices: opposes",
    "Tariffs on China & Unfair Trade: supports · Tariffs & Household Prices: opposes",
    "Tariffs & Trade Authority: supports · Congress as a Check on the Executive: supports",
    "Pro-Growth Deregulation: supports · Corporate Accountability: opposes",
    "Market-Based Healthcare: opposes · Expand Healthcare Access: supports",
    "Mass Deportations & Border Security: supports · Pathways to Citizenship: opposes",
    "Strong Border & Enforcement: supports · Pathways to Citizenship: opposes",
    "Back Law Enforcement: supports · Criminal Justice Reform: supports",
    "Back Law Enforcement: supports · Tough on Crime: supports",
    "Cannabis Reform: opposes · Tough on Crime: supports",
    "Pro-Life Protections: supports · Protect Reproductive Rights: opposes",
    "Religious Liberty Focus: supports · Protect LGBTQ+ Rights: opposes",
    "Voter ID & Election Integrity: supports · Expand Voting Access: opposes",
    "Election Integrity: supports · Expand Voting Access: opposes",
    "Election Security & Ballot Safeguards: supports · Expand Voting Access: opposes",
    "Peace Through Strength: supports · Diplomacy & Restraint: supports",
    "America First: supports · Diplomacy & Restraint: supports",
    "America First Foreign Aid & Commitments: supports · Ukraine: supports",
    "America First Foreign Aid & Commitments: supports · Support for Israel: supports",
    "Congress and War Powers: opposes · Congress as a Check on the Executive: supports",
    "Power of the Purse: supports · Congress as a Check on the Executive: supports",
    "Court Orders on the Executive: opposes · Congress as a Check on the Executive: supports",
    "Innovation & Light Rules: supports · Privacy & Big-Tech Accountability: supports",
    "School Choice & Education Freedom: supports · Parental Rights in Schools: supports",
  ].join("\n"), "the fifty-four lines, as specified");
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
        if (!/^[A-Za-z &,+\-]+: (supports|opposes) · [A-Za-z &,+\-]+: (supports|opposes)$/.test(win.PDXRelatedIssues.lineText(r))) bad++;
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
  ok(v >= 501, "shell version bumped for batch 6");
  const mod = R("related-issues.js");
  ok(!/PDXConsistency|_issueVerdict|directionMatch|_DOS_EFFECT/.test(mod.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")),
     "module reads no scoring or effect engine");
}

if (failures.length) {
  console.error(`\n✗ related-issues: ${failures.length} failure(s)\n  - ` + failures.join("\n  - "));
  process.exit(1);
}
console.log(`✓ related-issues: all ${passed} assertions passed`);
