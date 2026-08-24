#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-hr1-citation-integrity.mjs — every visible H.R. 1 topic rests on operative text
// ─────────────────────────────────────────────────────────────────────────────
// The bill face shows all fourteen of H.R. 1's issue mappings, unfolded and unranked.
// That default is only honest if the rows underneath are citable, and six of the
// fourteen had no provision row at all — including cut_spending, whose rationale names
// the SNAP work-requirement change BY NAME while the SNAP row carried a NULL issue key.
//
// 20260923000000_vr_hr1_citation_integrity.sql closes that. This file guards the shape
// of the fix, not just its existence:
//
//   1. COVERAGE MOVED, AND THE COMMITTED AUDIT SAYS THE SAME THING THE SQL DOES.
//      Numbers are replayed from the migration corpus, then compared against
//      db/vr-hr1-citation-audit.json. A hand-edited audit file fails here.
//   2. THE SNAP ROW IS KEYED AND ANCHORED. No key was invented for it; it took the key
//      whose rationale already depended on it.
//   3. national_debt IS RE-CITED, NOT PROMOTED. It rests on Sec. 72001 rather than a CBO
//      projection, and the statement names no scoring column — not weight, not
//      is_primary, not support_meaning.
//   4. ONE OWNER PER PROVISION. Three provisions are claimed by two keys each. The pass
//      adds ZERO duplicate rows for them; the second reading is a display note whose
//      topic resolves to a real label in the shipped taxonomy.
//   5. NOTHING WAS RENAMED AND NO OWNER MOVED. Provision labels are load-bearing —
//      the distributional-impact rows resolve provision_id BY LABEL.
//   6. NO SEED MIRROR IS NEEDED, AND THAT CONDITION IS PINNED RATHER THAN ASSUMED.
//   7. NO SCORE CAN DRIFT, BY CONSTRUCTION. vr_measure_provisions has no scoring reader,
//      and every H.R. 1 weight / is_primary / support_meaning is byte-identical.
//   8. THE RESIDUAL IS RECORDED, NOT PAPERED OVER.
//
//   node scripts/test-hr1-citation-integrity.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { auditHr1Citations, issueLabels, THIS_PASS } from "./vr-audit-hr1-citations.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const deep = (a, b, msg) => eq(JSON.stringify(a), JSON.stringify(b), msg);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${String(needle).slice(0, 70)}…" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);

const MIG = R(`netlify/database/migrations/${THIS_PASS}`);
const SQL = MIG.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n").trim();
const AUDIT = JSON.parse(R("db/vr-hr1-citation-audit.json"));
const SEED = JSON.parse(R("db/vr-issue-seed.json"));
const LABELS = issueLabels();
const REPORT = auditHr1Citations();

const PLAW = "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm";
// The six keys the audit named as unbacked, and the three provisions two keys each claim.
const SIX = ["cut_spending", "deportations", "energy_production", "family_support", "lands_energy", "lower_taxes"];
const SHARED = [
  { provision: "Permanent 2017 tax cuts", owner: "tax_middle_class", second: "lower_taxes" },
  { provision: "Child tax credit increase", owner: "family_support", second: "lower_taxes" },
  { provision: "Medicaid spending cut", owner: "healthcare", second: "cut_spending" },
  { provision: "Border & immigration enforcement", owner: "border_security", second: "deportations" },
  { provision: "Onshore oil and gas leasing", owner: "lands_energy", second: "energy_production" },
];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · coverage moved, and the committed audit agrees with the SQL");
// ═════════════════════════════════════════════════════════════════════════════
// The audit JSON is a build artifact of the corpus. Regenerating it must be a no-op.
deep(AUDIT, REPORT, "db/vr-hr1-citation-audit.json is out of date with the migration corpus — run scripts/vr-audit-hr1-citations.mjs --write");

eq(REPORT.pass, THIS_PASS, "the audit is not measuring this pass");
eq(REPORT.before.mappings, 14, "H.R. 1 no longer has fourteen mappings — the whole premise of the full-ledger view moved");
eq(REPORT.after.mappings, 14, "the citation pass changed how many topics H.R. 1 claims; it may only change how they are cited");
eq(REPORT.before.mappingsWithProvisionRow, 8, "the before-state coverage count moved");
deep(REPORT.before.mappingsWithoutProvisionRow, SIX, "the six unbacked mappings the audit named are not the six the corpus shows");
deep(REPORT.before.provisionsWithoutIssueKey, ["SNAP food-aid changes"], "the before-state should have exactly one keyless provision");

eq(REPORT.after.mappingsCited, 14, "not every H.R. 1 topic is citable to a provision after the pass");
deep(REPORT.after.mappingsStillUncited, [], "a mapping is still visible on the bill face with nothing operative behind it");
deep(REPORT.after.provisionsWithoutIssueKey, [], "a provision row still carries no issue key");
eq(REPORT.after.provisions, REPORT.before.provisions + 2,
  "the pass should add exactly two provision rows — the child tax credit and the leasing anchor");
// Owner-backed and co-read-backed are different strengths of citation and are counted apart.
eq(REPORT.after.mappingsWithProvisionRow, 11, "the count of mappings that OWN a provision row moved");
deep(REPORT.after.mappingsOwningNoProvision.slice().sort(), ["deportations", "energy_production", "lower_taxes"],
  "the keys carried by a co-read note rather than an owned row are not the three expected");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the SNAP row is keyed and anchored, and no key was invented for it");
// ═════════════════════════════════════════════════════════════════════════════
const snap = REPORT.ownership.find((o) => o.label === "SNAP food-aid changes");
ok(!!snap, "the SNAP provision is gone from the corpus");
eq(snap.owner, "cut_spending", "SNAP took a key other than the one whose rationale already depended on it");
eq(snap.anchor, "Sec. 10102", "the SNAP row is not anchored to the operative section");
eq(snap.source, PLAW, "the SNAP row is not sourced to the enacted text");
eq(snap.supportMeaning, "yea_supports", "read against cut_spending, a yea advances the spending cut");
has(SQL, "Modifications to SNAP work requirements for able-bodied adults",
  "the SNAP row does not quote the section heading it claims");

// The key it took must already exist — this pass may not mint a taxonomy key.
const KEYS = new Set(JSON.parse(R("db/issue-keys.json")).keys || []);
ok(KEYS.has("cut_spending"), "cut_spending is not a live issue key");
const minted = [...SQL.matchAll(/issue_key\s*=?\s*,?\s*'([a-z0-9_]+)'/g)].map((m) => m[1])
  .concat([...SQL.matchAll(/'([a-z0-9_]+)',\s*'yea_(?:supports|opposes)'/g)].map((m) => m[1]))
  .filter((k) => !KEYS.has(k));
deep([...new Set(minted)], [], "the migration names an issue key that is not in db/issue-keys.json");
const namedKeys = new Set([...SQL.matchAll(/issue_key\s*=\s*'([a-z0-9_]+)'/g)].map((m) => m[1])
  .concat([...SQL.matchAll(/'([a-z0-9_]+)',\s*'yea_(?:supports|opposes)'/g)].map((m) => m[1])));
ok(namedKeys.size >= 3, `the issue-key probe found only ${namedKeys.size} keys in the migration — the pattern stopped matching`);

// And the rationale that depends on SNAP is still the one that claims it.
const RAT19 = R("netlify/database/migrations/20260919000000_vr_rollcall_mapping_rationale_effect_language.sql");
has(RAT19, "work-requirement age from 55 to 65",
  "the cut_spending rationale no longer names the SNAP change — if that claim moved, this provision's owner should be revisited");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · national_debt is re-cited, not promoted");
// ═════════════════════════════════════════════════════════════════════════════
const ndB = REPORT.before.nationalDebtCitation;
const ndA = REPORT.after.nationalDebtCitation;
ok(ndB.citesCbo, "the before-state national_debt mapping was supposed to rest on the CBO projection");
eq(ndB.anchor, null, "the before-state national_debt rationale should name no operative section");
eq(ndA.anchor, "Sec. 72001", "national_debt is not anchored to the debt-limit section");
eq(ndA.sourceUrl, PLAW, "national_debt is not sourced to the enacted text");
ok(!ndA.citesCbo, "national_debt is still sourced to the CBO projection alone");
has(SQL, "Modification of limitation on the public debt",
  "the national_debt rationale does not quote the operative heading");
// The projection is demoted, not deleted — it still corroborates and is still cited
// on the provision that is actually about a projection.
has(SQL, "Congressional Budget Office", "the CBO projection was dropped rather than demoted to corroboration");
const deficit = REPORT.ownership.find((o) => o.label === "Deficit impact");
ok(/cbo\.gov/.test(String(deficit.source)), "the Deficit impact provision no longer carries the CBO citation");
// The debt-limit provision the rationale points at must exist and be anchored.
const debtProv = REPORT.ownership.find((o) => o.label === "Debt-limit increase");
eq(debtProv.anchor, "Sec. 72001", "the Debt-limit provision the rationale cites is not itself anchored");
eq(debtProv.owner, "national_debt", "the Debt-limit provision changed owner");

// CITATION ONLY: the one statement on the scoring table names two text columns and no more.
const issueUpdates = SQL.split(/(?=UPDATE\s+vr_measure_issues)/i).filter((s) => /^UPDATE\s+vr_measure_issues/i.test(s));
eq(issueUpdates.length, 1, "the pass touches vr_measure_issues more than once");
const setBlock = issueUpdates[0].split(/\sWHERE\s/i)[0];
for (const col of ["weight", "is_primary", "support_meaning", "issue_key ="]) {
  lacks(setBlock, col, `the national_debt statement assigns ${col.trim()} — this pass is citation only`);
}
has(setBlock, "rationale =", "the national_debt statement does not set a rationale");
has(setBlock, "source_url = PLAW", "the national_debt statement does not re-source to the enacted text");
lacks(SQL, "INSERT INTO vr_measure_issues", "the pass adds a mapping — no new issue keys were in scope");
lacks(SQL, "DELETE FROM", "the pass deletes rows");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · one owner per provision — the shared anchors are noted, not duplicated");
// ═════════════════════════════════════════════════════════════════════════════
deep(REPORT.sharedAnchors.map((s) => s.provision).sort(), SHARED.map((s) => s.provision).sort(),
  "the set of provisions carrying a co-read note is not the set two keys actually claim");
for (const s of SHARED) {
  const got = REPORT.sharedAnchors.find((x) => x.provision === s.provision);
  ok(!!got, `${s.provision}: no co-read note recorded`);
  if (!got) continue;
  eq(got.owner, s.owner, `${s.provision}: owner moved`);
  eq(got.alsoReadBy, s.second, `${s.provision}: the co-read note does not resolve to the second claiming key`);
  eq(got.alsoReadLabel, LABELS[s.second],
    `${s.provision}: the co-read note is not written in the shipped taxonomy's own words`);
  eq(got.duplicateRowsCreated, 0, `${s.provision}: a duplicate row was created for the second key`);
  // The whole point: exactly one row in the corpus carries this operative text.
  const sameAnchor = REPORT.ownership.filter((o) => o.label === s.provision);
  eq(sameAnchor.length, 1, `${s.provision}: more than one provision row carries this label`);
}
// No key is claimed by an owned row AND a co-read note pointing at the same provision.
for (const o of REPORT.ownership) {
  if (!o.alsoReadUnder) continue;
  ok(LABELS[o.owner] !== o.alsoReadUnder, `${o.label}: the co-read note points back at its own owner`);
}
// Every co-read note resolves — a typo'd topic would be an uncitable claim in prose.
for (const o of REPORT.ownership) {
  if (!o.alsoReadUnder) continue;
  ok(Object.values(LABELS).includes(o.alsoReadUnder),
    `${o.label}: "Also read under: ${o.alsoReadUnder}" names no topic in the shipped taxonomy`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · nothing renamed, no owner moved — labels are load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
// vr_distributional_impacts resolves provision_id BY LABEL. A rename orphans an impact row.
const DIST = R("netlify/database/migrations/20260721210000_create_vr_distributional_impacts.sql");
const distLabels = [...DIST.matchAll(/vr_measure_provisions\s+WHERE[^;]*?label\s*=\s*'([^']+)'/g)].map((m) => m[1]);
ok(distLabels.length > 0, "the distributional-impact migration no longer resolves provisions by label — this guard needs revisiting");
const liveLabels = new Set(REPORT.ownership.map((o) => o.label));
for (const l of [...new Set(distLabels)]) {
  ok(liveLabels.has(l), `distributional impacts point at provision "${l}", which no longer exists — a label was renamed`);
}
lacks(SQL, "SET label", "the pass renames a provision label");
lacks(SQL, "label = 'SNAP food-aid changes',", "the pass renames the SNAP provision");
lacks(SQL, "ALTER TABLE", "the pass changes schema — this is a data/citation pass");
lacks(SQL, "DROP ", "the pass drops something");

// Owners are diffed row by row. The only permitted change is the one row that had no
// owner at all; the two new rows are additions, and everything else must be untouched.
const beforeOwners = new Map(REPORT.ownershipBefore.map((o) => [o.label, o.owner]));
const NEW_ROWS = ["Child tax credit increase", "Onshore oil and gas leasing"];
const movedOwners = REPORT.ownership
  .filter((o) => !NEW_ROWS.includes(o.label))
  .filter((o) => beforeOwners.get(o.label) !== o.owner)
  .map((o) => `${o.label}: ${JSON.stringify(beforeOwners.get(o.label))} -> ${JSON.stringify(o.owner)}`);
deep(movedOwners, ['SNAP food-aid changes: null -> "cut_spending"'],
  "an existing provision changed owner — only the ownerless SNAP row was allowed to gain one");
eq(beforeOwners.size, REPORT.after.provisions - NEW_ROWS.length,
  "the pass added or removed a provision row it did not declare");
for (const l of NEW_ROWS) ok(!beforeOwners.has(l), `${l} already existed before the pass`);

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no seed mirror is needed, and that condition is pinned");
// ═════════════════════════════════════════════════════════════════════════════
// applyCuratedIssueSeed() is upsert-only over db/vr-issue-seed.json. A (measure, issue)
// pair the seed does not name cannot be reverted by a re-ingest. national_debt is the
// only mapping this pass touches — so the protection holds only while the seed is silent
// about it. If a later pass adds it, the seed must carry this rationale too.
const seedHr1 = (SEED.measures || SEED || []).find
  ? (SEED.measures || []).find((m) => m.number === "H.R. 1" && m.congress === 119)
  : null;
const seedRaw = R("db/vr-issue-seed.json");
const hr1Block = (() => {
  const i = seedRaw.indexOf('"H.R. 1"');
  if (i < 0) return "";
  const j = seedRaw.indexOf('"number"', i + 1);
  return seedRaw.slice(i, j < 0 ? seedRaw.length : j);
})();
ok(hr1Block.length > 0, "H.R. 1 is no longer in db/vr-issue-seed.json — the mirror analysis needs redoing");
if (hr1Block.indexOf('"national_debt"') >= 0) {
  has(hr1Block, "Sec. 72001",
    "the seed now names H.R. 1's national_debt mapping, so a re-ingest will overwrite the new citation — mirror the rationale into db/vr-issue-seed.json");
} else {
  ok(true, "the seed is silent about national_debt, so a re-ingest cannot revert the citation");
}
// The five keys the seed DOES carry are untouched by this pass.
for (const k of ["lower_taxes", "cut_spending", "healthcare", "border_security", "lands_energy"]) {
  ok(hr1Block.indexOf(`"${k}"`) >= 0, `the seed no longer carries H.R. 1's ${k} mapping`);
  lacks(setBlock, `'${k}'`, `the pass writes to ${k}, which the curated seed owns`);
}
void seedHr1;

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no score can drift — the provisions table has no scoring reader");
// ═════════════════════════════════════════════════════════════════════════════
const consumers = readdirSync(join(ROOT, "netlify", "lib")).filter((f) => /\.(ts|mts|js)$/.test(f))
  .filter((f) => /vrMeasureProvisions|vr_measure_provisions/.test(R(`netlify/lib/${f}`)));
deep(consumers, ["vr-ingest.ts"], "a new netlify/lib module reads the provisions table — check it is not a scoring path");
const ingest = R("netlify/lib/vr-ingest.ts");
const provLines = ingest.split("\n").filter((l) => /vrMeasureProvisions/.test(l));
ok(provLines.every((l) => /^import|^\s+vrMeasureProvisions,|count\(/.test(l)),
  "vr-ingest.ts does more than import and row-count the provisions table");
has(R("netlify/functions/voting-record.mts"), "provisions: provisionRows.map",
  "the provisions read path moved — confirm it is still display-only");

// Every scoring field on every H.R. 1 mapping is identical before and after.
const drifted = REPORT.scoring.filter((s) => !s.unchanged);
deep(drifted, [], "an H.R. 1 mapping's weight / is_primary / support_meaning moved in a citation-only pass");
eq(REPORT.scoring.length, 14, "the drift check did not cover all fourteen mappings");
eq(REPORT.scoring.filter((s) => s.isPrimary).length, 1, "H.R. 1's primary count moved — no promotes were in scope");
const lt = REPORT.scoring.find((s) => s.issueKey === "lower_taxes");
eq(lt.weight, 100, "lower_taxes weight moved");
eq(lt.isPrimary, true, "lower_taxes is no longer H.R. 1's single primary");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the residual is recorded rather than papered over");
// ═════════════════════════════════════════════════════════════════════════════
eq(REPORT.residuals.length, 1, "the leasing over-claim residual is missing from the audit");
const res = REPORT.residuals[0];
deep(res.issueKeys, ["lands_energy", "energy_production"], "the residual names the wrong keys");
eq(res.status, "open", "the residual is marked closed without a provision citing offshore or coal leasing");
has(res.cited, "Sec. 50101", "the residual does not say what WAS cited");
// The new leasing row must claim only what was checked.
const lease = REPORT.ownership.find((o) => o.label === "Onshore oil and gas leasing");
lacks(String(SQL), "offshore oil, gas, and coal leasing, reopens",
  "the new leasing provision widened into the uncited offshore and coal claim");
eq(lease.anchor, "Sec. 50101", "the leasing row is not anchored to the section that was verified");
has(MIG, "THE RESIDUAL, STATED RATHER THAN PAPERED OVER",
  "the migration no longer states the residual up front");

// Idempotence, since the runner may replay.
eq((SQL.match(/WHERE NOT EXISTS/g) || []).length, 2, "the two INSERTs are not both NOT EXISTS-guarded");
has(SQL, "IF m_hr1 IS NULL THEN", "the migration is not guarded against H.R. 1 being absent");

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ H.R. 1 citation integrity: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✓ H.R. 1 citation integrity: ${passed} assertions passed\n`);
