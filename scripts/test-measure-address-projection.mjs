#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-measure-address-projection.mjs — the projection reads the two loop forms
// ─────────────────────────────────────────────────────────────────────────────
// scripts/vr-measure-addresses.mjs projects the applied migrations into the
// measure × issue pairs the offline stores read: db/bill-docs.json, the
// sitemap's issue files, and the effect-line tests' "is this pair mapped"
// check. It read literal INSERTs and SELECT id INTO bindings, and missed two
// plpgsql forms the migrations also use to insert mappings:
//
//   FOR m IN SELECT id FROM vr_measures WHERE number = '…' AND congress = … LOOP
//     INSERT INTO vr_measure_issues (…) VALUES (m.id, '<key>', …);
//   FOR r IN SELECT * FROM (VALUES ('<number>', <congress>, '<key>', …), …)
//            AS t(num, cg, k, …) LOOP
//     SELECT id INTO mid FROM vr_measures WHERE number = r.num …;
//     INSERT INTO vr_measure_issues (…) VALUES (mid, r.k, …);
//
// So 53 mapped pairs — among them S. 1582 and H.R. 26 × states_federal_power
// and H.R. 6126 (118th) × strong_defense, three with rationales ready for a
// line — were invisible offline. The fence:
//
//   1. THE THREE: S. 1582 (119th) × states_federal_power, H.R. 26 (119th) ×
//      states_federal_power and H.R. 6126 (118th) × strong_defense are projected.
//   2. NO LOSSES: every pair the projection read before (loopForms: false, which
//      is that reading exactly) is still projected, with every address, title,
//      chamber, source and roll-call count unchanged.
//   3. NOTHING INVENTED: the pairs the loop forms add are exactly the 53 listed
//      here, each named — its number and its key — in the migration text.
//   4. THE THREE STAY BLANK: no effect line is written for them in this pass.
//   5. MUTATIONS: each loop form broken, and the m.id reference dropped, loses
//      one of the three, and the checks below catch it.
//
//   node scripts/test-measure-address-projection.mjs

import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { measureAddresses } from "./vr-measure-addresses.mjs";
import { keysAfter } from "./vr-slice-blocks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const THREE = ["S. 1582|119|states_federal_power", "H.R. 26|119|states_federal_power", "H.R. 6126|118|strong_defense"];
// Every pair the two loop forms add, as the migrations insert them and the
// correction passes after them leave them.
const ADDED = [
  "H.Amdt. 242|119|gov_transparency",
  "H.Amdt. 247|119|judicial_check",
  "H.Amdt. 249|119|states_federal_power",
  "H.Amdt. 250|119|states_federal_power",
  "H.Amdt. 261|119|privacy_rights",
  "H.Amdt. 266|119|cut_spending",
  "H.Amdt. 266|119|gov_waste",
  "H.Amdt. 87|119|lgbtq_rights",
  "H.Con.Res. 108|119|war_powers",
  "H.Con.Res. 113|119|national_debt",
  "H.Con.Res. 113|119|strong_defense",
  "H.Con.Res. 89|119|war_powers",
  "H.J.Res. 44|118|gov_regulation",
  "H.R. 1041|119|veterans",
  "H.R. 1181|119|states_federal_power",
  "H.R. 1968|119|health_rural",
  "H.R. 1968|119|immig_fentanyl",
  "H.R. 1|117|campaign_finance",
  "H.R. 1|117|gov_transparency",
  "H.R. 1|117|scotus_reform",
  "H.R. 2670|118|israel_support",
  "H.R. 2670|118|privacy_rights",
  "H.R. 26|119|states_federal_power",
  "H.R. 4|117|states_federal_power",
  "H.R. 5746|117|campaign_finance",
  "H.R. 6126|118|strong_defense",
  "H.R. 6644|119|crypto_cbdc",
  "H.R. 6644|119|permitting_reform",
  "H.R. 6955|119|econ_corp_account",
  "H.R. 6955|119|gov_regulation",
  "H.R. 7217|118|strong_defense",
  "H.R. 7757|119|privacy_rights",
  "H.R. 7757|119|tech_balance",
  "H.R. 7888|118|congress_oversight",
  "H.R. 8034|118|america_first_fp",
  "H.R. 8034|118|strong_defense",
  "H.R. 8281|118|states_federal_power",
  "H.R. 8369|118|power_of_purse",
  "H.R. 8404|117|states_federal_power",
  "H.R. 8595|119|election_security",
  "H.R. 8595|119|voter_id",
  "H.R. 8595|119|voting_access",
  "H.R. 8800|119|israel_support",
  "H.R. 9237|119|health_mental",
  "H.R. 9237|119|health_rural",
  "S. 1582|119|states_federal_power",
  "S. 1605|117|immig_fentanyl",
  "S. 1605|117|israel_support",
  "S. 2296|119|back_police",
  "S. 2296|119|homeless",
  "S. 2296|119|housing_build",
  "S. 2296|119|immig_fentanyl",
  "S. 2296|119|israel_support",
];

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`  · ${t}`);
const pairsOf = (x) => new Set(x.published.flatMap((a) => [...a.issues].map((k) => `${a.number}|${a.sitting}|${k}`)));

function problems(full, legacy) {
  const bad = [];
  const P = pairsOf(full), L = pairsOf(legacy);
  for (const p of THREE) if (!P.has(p)) bad.push(`${p}: not projected`);
  for (const p of L) if (!P.has(p)) bad.push(`${p}: projected before and lost`);
  const added = [...P].filter((p) => !L.has(p)).sort();
  const want = [...ADDED].sort();
  for (const p of want) if (!P.has(p)) bad.push(`${p}: a loop-form mapping is not projected`);
  for (const p of added) if (!want.includes(p)) bad.push(`${p}: projected by the loop forms but not a listed mapping`);
  return bad;
}

const full = measureAddresses(ROOT);
const legacy = measureAddresses(ROOT, { loopForms: false });

section("1–3 · the three, no losses, nothing invented");
{
  const bad = problems(full, legacy);
  for (const b of bad) ok(false, b);
  ok(bad.length === 0, "the projection reads the loop forms exactly");
  ok(ADDED.length === 53 && new Set(ADDED).size === 53, `${ADDED.length} listed loop-form pairs — the fix surfaced 53`);
  for (const p of THREE) ok(ADDED.includes(p), `${p}: one of the listed loop-form pairs`);
  // Addresses and everything they carry besides the issue set are unchanged.
  const L = new Map(legacy.published.map((r) => [`${r.sitting}|${r.number}`, r]));
  ok(full.published.length === legacy.published.length, `${full.published.length} addresses now, ${legacy.published.length} before`);
  for (const r of full.published) {
    const o = L.get(`${r.sitting}|${r.number}`);
    ok(!!o, `${r.sitting}|${r.number}: an address the projection did not publish before`);
    if (!o) continue;
    ok(o.title === r.title && o.chamber === r.chamber && o.source === r.source && o.acts === r.acts,
      `${r.sitting}|${r.number}: the address's identity or roll-call count moved`);
  }
  ok(full.refused.length === legacy.refused.length, "the refused list did not change");
  ok(full.stats.unresolvedCorrections.length === 0, "every mapping correction still replays");
  // Each added pair is named in the migrations: its number and its key.
  const dir = join(ROOT, "netlify", "database", "migrations");
  const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(join(dir, f), "utf8"));
  for (const p of ADDED) {
    const [n, , k] = p.split("|");
    ok(sql.some((s) => s.includes(`'${n}'`) && s.includes(`'${k}'`)), `${p}: no migration names this number and key`);
  }
}

section("4 · the three stay blank in this pass");
{
  // The projection pass wrote no line; blank rows slice 8 (v368) later wrote
  // the three in a block of its own, held by scripts/test-blank-rows-slice8.mjs.
  // Outside a later slice's block each stays blank.
  const src = R("consistency.js");
  const a = src.indexOf("var _DOS_EFFECT = {");
  const E = vm.runInNewContext("(" + src.slice(a + "var _DOS_EFFECT = ".length, src.indexOf("\n  };", a) + 4) + ")");
  const later = keysAfter(src, "_DOS_EFFECT", 367);
  for (const p of THREE) ok(!(p in E) || later.has(p), `${p}: an effect line was written in the projection pass`);
}

section("5 · mutations");
{
  const base = R("scripts/vr-measure-addresses.mjs");
  const MUT = [
    { name: "the VALUES-loop form ignored", edit: (s) => s.replace("if (loopForms) valuesLoop(", "if (false) valuesLoop("),
      expect: /S\. 1582\|119\|states_federal_power: not projected/ },
    { name: "the VALUES table read with its comments in place", edit: (s) => s.replace("comment would otherwise be read as SQL.\n  const src = uncomment(raw);", "comment would otherwise be read as SQL.\n  const src = raw;"),
      expect: /H\.R\. 26\|119\|states_federal_power: not projected/ },
    { name: "the FOR … IN SELECT id loop not bound", edit: (s) => s.replace("        if (!loopForms) continue;\n        const w = whereKey(m[7] || \"\");", "        continue;\n        const w = whereKey(m[7] || \"\");"),
      expect: /H\.R\. 6126\|118\|strong_defense: not projected/ },
    { name: "the m.id reference dropped", edit: (s) => s.replace("else if (loopForms && /^[a-zA-Z_][a-zA-Z_0-9]*\\.id$/i.test(ref))", "else if (false)"),
      expect: /H\.R\. 6126\|118\|strong_defense: not projected/ },
  ];
  const tmp = mkdtempSync(join(tmpdir(), "pdx-proj-"));
  try {
    let i = 0;
    for (const m of MUT) {
      const src = m.edit(base);
      if (src === base) { ok(false, `mutation "${m.name}": anchor not found`); continue; }
      const f = join(tmp, `mut${i++}.mjs`);
      writeFileSync(f, src);
      const mod = await import(pathToFileURL(f).href);
      const bad = problems(mod.measureAddresses(ROOT), legacy);
      const caught = bad.some((b) => m.expect.test(b));
      console.log(`    mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
      ok(caught, `mutation "${m.name}" survived`);
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

if (failures.length) {
  for (const f of failures.slice(0, 40)) console.error("  ✗ " + f);
  console.error(`\n✗ measure-address projection: ${failures.length} failure(s), ${passed} passed`);
  process.exit(1);
}
console.log(`\n   ${pairsOf(legacy).size} pairs before · ${pairsOf(full).size} now · ${ADDED.length} surfaced by the loop forms, none lost`);
console.log(`✓ measure-address projection: all ${passed} assertions passed`);
