#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-primary-lane-promotes.mjs — three primary promotes, and nothing else
// ─────────────────────────────────────────────────────────────────────────────
// `is_primary` on a measure→issue mapping has exactly one consumer:
// _recordDirectionIndex() in stance-helpers.js. Past _RD_MIN_JUDGED it refuses to
// state what a member's record DID unless at least one judged item was primary-mapped
// (_RD_MIN_PRIMARY), because "an incidental omnibus brush is not a lean, it is a
// coincidence". The flag therefore means NOT-INCIDENTAL. Weight is what ranks axes.
//
// The August 2026 primary-lane audit found 298 (member, issue) reads refused for want
// of a primary across twelve issues, and found exactly three where an honest
// member-lane instrument's own subject IS the issue. This file guards that pack:
//
//   1. THE THREE ROWS MOVED, AND ONLY THE FLAG MOVED. Weight, support meaning and the
//      original rationale text survive on all three; the appended clause says why the
//      row is primary rather than restating the ranking.
//   2. THE SEED AND THE MIGRATION AGREE, CHARACTER FOR CHARACTER. The migration is what
//      the platform applies; the seed is what a re-ingest and every offline harness
//      read. If they disagree, the next ingest silently reverts the migration.
//   3. THE REFUSES WERE TOUCHED ZERO TIMES. voter_id (incl. H.R. 22 and H.R. 8595),
//      cost_living, energy_production's H.R. 26, and the national_debt omnibus/CBO
//      side-effects are all still non-primary. Some of them would unblock MORE members
//      than the three that shipped; that is exactly why they are pinned here.
//   4. THE FLOORS DID NOT MOVE. A data pass may not buy coverage by lowering a floor.
//   5. THE MECHANISM ACTUALLY DRIFTS THE WAY THE PACK CLAIMS. The shipped index is run
//      over items built from the real seed rows: four same-way judged items on each
//      issue read as a direction WITH the promoted instrument and are refused
//      'no_primary' without it. This is the offline half of the drift table; the
//      member-by-member half needs the live corpus and lives in
//      scripts/vr-audit-primary-lane-aug2026.mjs --simulate.
//   6. NOTHING THAT READS issues[0] MOVES. vr-pack.ts sorts a measure's issues
//      primary-first then weight-desc, and bill-detail.js takes the first primary as
//      the bill's issue. On all three measures the promoted row already sat directly
//      below the primary it now joins, so the order is unchanged.
//
//   node scripts/test-primary-lane-promotes.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEngine } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${String(needle).slice(0, 70)}…" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);

const SEED = JSON.parse(R("db/vr-issue-seed.json"));
const MIG_NAME = "20260921000000_vr_three_primary_lane_promotes";
const MIG = R(`netlify/database/migrations/${MIG_NAME}.sql`);

// number, congress, chamber, issueKey, weight, supportMeaning, the primary it joins
const PROMOTES = [
  ["S.J.Res. 18", 119, "senate", "econ_corp_account", 75, "yea_opposes", "gov_regulation"],
  ["S. 1383",     119, "senate", "voting_access",     80, "yea_opposes", "election_security"],
  ["H.Amdt. 235", 119, "house",  "israel_support",    95, "yea_opposes", "america_first_fp"],
];

const measureOf = (number, congress, chamber) =>
  (SEED.measures || []).find((m) => m.number === number && m.congress === congress && m.chamber === chamber);
const rowOf = (m, key) => ((m && m.issues) || []).find((i) => i.issueKey === key);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the three rows moved, and only the flag moved");
// ═════════════════════════════════════════════════════════════════════════════
for (const [number, congress, chamber, key, weight, meaning] of PROMOTES) {
  const m = measureOf(number, congress, chamber);
  ok(!!m, `${number} (${congress} ${chamber}) is no longer in the curated issue seed`);
  const row = rowOf(m, key);
  ok(!!row, `${number} no longer maps ${key}`);
  if (!row) continue;
  eq(row.isPrimary, true, `${number}'s ${key} mapping is not primary in the seed`);
  eq(row.weight, weight, `${number}/${key} weight moved — only the primary flag should have`);
  eq(row.supportMeaning, meaning, `${number}/${key} support meaning moved`);
  // The appended clause states the SUBJECT claim (what is_primary means) and keeps the
  // ranking claim as a statement about weight, which is the S. 2 wording discipline.
  has(row.rationale, "Primary:", `${number}/${key} does not say why it is primary`);
  has(row.rationale, "the weight is what ranks the two axes",
    `${number}/${key} does not keep the ranking claim on the weight where it belongs`);
}

// The evidence each promote rests on, in the rationale, so a later editor cannot quietly
// swap the instrument out from under the flag.
has(rowOf(measureOf("S.J.Res. 18", 119, "senate"), "econ_corp_account").rationale,
  "what the largest banks may charge",
  "S.J.Res. 18 no longer states the constraint it removes");
has(rowOf(measureOf("S. 1383", 119, "senate"), "voting_access").rationale,
  "registration and casting steps this facet measures",
  "S. 1383 no longer states that the substitute's provisions are the facet's own steps");
has(rowOf(measureOf("H.Amdt. 235", 119, "house"), "israel_support").rationale,
  "entire operative text is Israel funding",
  "H.Amdt. 235 no longer states that its whole text is the issue");

// A measure carrying two primaries is the deliberate exception, not the convention.
// Four measures may hold one; a fifth means the flag is drifting back into a ranking.
const multi = (SEED.measures || [])
  .filter((m) => (m.issues || []).filter((i) => i.isPrimary).length > 1)
  .map((m) => `${m.number} (${m.congress})`)
  .sort();
eq(multi.join(", "), "H.Amdt. 235 (119), S. 1383 (119), S. 2 (119), S.J.Res. 18 (119)",
  "the set of measures with two primaries changed — the flag is drifting back into a ranking");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the seed and the migration agree, character for character");
// ═════════════════════════════════════════════════════════════════════════════
for (const [number, congress, chamber, key] of PROMOTES) {
  const row = rowOf(measureOf(number, congress, chamber), key);
  has(MIG, `issue_key = '${key}'`, `the migration is not keyed on ${key}`);
  has(MIG, `number = '${number.replace(/'/g, "''")}' AND congress = ${congress} AND chamber = '${chamber}'`,
    `the migration does not scope ${key} to ${number} (${congress} ${chamber})`);
  if (row) {
    has(MIG, row.rationale.replace(/'/g, "''"),
      `${number}/${key}: the migration's rationale and the seed's rationale have diverged`);
  }
}

// Three statements, one table, one operation. A migration that also DELETEs, or reaches
// vr_member_votes, is not the mapping correction it says it is.
const SQL = MIG.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n").trim();
eq((SQL.match(/^UPDATE /gm) || []).length, 3, "the migration is not exactly three UPDATEs");
// Semicolons inside a rationale literal are not statement ends, so count statement
// KEYWORDS at the start of a line instead of splitting on ";".
eq((SQL.match(/^\s*(UPDATE|INSERT|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT)\b/gim) || []).length, 3,
  "the migration runs a statement that is not one of its three UPDATEs");
ok(SQL.split(/^UPDATE /gm).slice(1).every((s) => /^vr_measure_issues\b/.test(s)),
  "an UPDATE in the migration is not on vr_measure_issues");
eq((SQL.match(/is_primary = TRUE/g) || []).length, 3, "the migration does not set three primary flags");
["DELETE ", "DROP ", "ALTER ", "INSERT ", "vr_member_votes", "vr_rollcalls", "vr_positions"]
  .forEach((frag) => lacks(SQL, frag, `the migration reaches past the mapping table: "${frag}"`));
// Each SET clause may assign the flag and the rationale, and nothing else. Weight and
// support meaning are the ranking and the polarity; a promote does not get to move them.
SQL.split(/^UPDATE /gm).slice(1).forEach((stmt, n) => {
  const set = stmt.slice(stmt.indexOf("SET ") + 4, stmt.indexOf("WHERE"));
  const cols = (set.match(/^\s*([a-z_]+)\s*=/gm) || []).map((c) => c.trim().replace(/\s*=$/, ""));
  eq(cols.join(","), "is_primary,rationale",
    `UPDATE #${n + 1} assigns columns beyond the flag and its rationale`);
});

// Append-only: this migration sorts after every applied one, and no applied migration
// was edited to make room for it.
const S2 = "netlify/database/migrations/20260920000000_vr_s2_border_security_primary_lane.sql";
has(R(S2), "issue_key = 'border_security'", "the S. 2 migration was edited — applied migrations are immutable");
ok(MIG_NAME > "20260920000000_vr_s2_border_security_primary_lane",
  "the new migration does not sort after the S. 2 migration");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the refuses were touched zero times");
// ═════════════════════════════════════════════════════════════════════════════
// Each of these was measured and declined. H.R. 22 in particular would unblock 101
// members — more than all three promotes combined — and is refused because it is a
// citizenship-documentation bill whose own subject is registration eligibility, already
// carried by its election_integrity primary. Pinned so a later "coverage" pass has to
// argue with the audit rather than flip a flag in silence.
const REFUSED = [
  ["H.R. 22",   119, "house",  "voter_id",          "citizenship documentation, not photo ID: +101 members and still refused"],
  ["S. 129",    119, "senate", "cost_living",       "a price-gouging bill; the cost axis is downstream of its subject"],
  ["H.R. 1319", 117, "house",  "cost_living",       "an 8-key relief omnibus — the incidental brush the floor exists to catch"],
  ["H.R. 1319", 117, "house",  "national_debt",     "the same omnibus, by its CBO score"],
  ["H.R. 5376", 117, "house",  "national_debt",     "CBO side-effect of a 7-key reconciliation act"],
  ["H.R. 5376", 117, "house",  "energy_production", "one title of that same omnibus"],
  ["H.R. 4",    119, "house",  "national_debt",     "a rescissions package scored for debt, not about it"],
  ["H.R. 3746", 118, "house",  "energy_production", "permitting reform riding a debt-ceiling deal"],
  ["H.R. 3486", 119, "house",  "border_security",   "a sentencing bill, refused by name in the S. 2 migration"],
  ["S. 5",      119, "senate", "border_security",   "a detention mandate, refused by name in the S. 2 migration"],
];
for (const [number, congress, chamber, key, why] of REFUSED) {
  const m = measureOf(number, congress, chamber);
  if (!m) { ok(false, `${number} (${congress} ${chamber}) left the seed — a refusal cannot be checked`); continue; }
  const row = rowOf(m, key);
  if (!row) { ok(false, `${number} no longer maps ${key} — a refusal cannot be checked`); continue; }
  eq(row.isPrimary, false, `${number}/${key} was promoted — the audit refused it: ${why}`);
}
// Refuses that live only in the ingested corpus, not in the curated seed. The migration
// is the only thing in this pack that touches the database, so pinning it by measure
// number is what "touched zero times" means for them.
["H.R. 26", "H.R. 1'", "H.R. 82", "H.R. 8595", "H.R. 3746", "H.R. 3486", "S. 5'"].forEach((n) =>
  lacks(MIG.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n"), `'${n}`,
    `the migration reaches a refused measure: ${n.replace(/'$/, "")}`));

// And the migration must not name any of them.
["voter_id", "cost_living", "energy_production", "national_debt"].forEach((k) =>
  lacks(SQL, `issue_key = '${k}'`, `the migration reaches a refused issue: ${k}`));

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the floors did not move");
// ═════════════════════════════════════════════════════════════════════════════
const SH = R("stance-helpers.js");
[["_RD_MIN_JUDGED", "4"], ["_RD_MIN_PRIMARY", "1"], ["_RD_DOMINANCE", "0.75"],
 ["_RD_THIN_MIN", "2"], ["_RD_SPLIT_MIN_JUDGED", "6"], ["_RD_SPLIT_MIN_SIDE", "2"],
 ["_RD_MEMBER_FLOOR", "12"]].forEach(([name, val]) => {
  const m = SH.match(new RegExp("var " + name + "\\s*=\\s*([0-9.]+)"));
  eq(m && m[1], val, `${name} moved — a data pass may not buy coverage by lowering a floor`);
});

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the mechanism drifts the way the pack claims");
// ═════════════════════════════════════════════════════════════════════════════
// The shipped index, run over items carrying the REAL seed mappings. Four same-way
// judged items is _RD_MIN_JUDGED exactly: deep enough for the primary rule to apply,
// which is the whole population the pack unblocks.
const win = loadEngine(ROOT);
const rdIndex = win._recordDirectionIndex;
const item = (number, congress, chamber, key, n) => {
  const row = rowOf(measureOf(number, congress, chamber), key);
  return {
    kind: "vote", measureId: 9000 + n, number, position: "yea", isProcedural: false,
    advanceInverted: false, date: `2026-0${n + 1}-01T00:00:00.000Z`,
    issues: [{ issueKey: key, weight: row.weight, isPrimary: row.isPrimary, supportMeaning: row.supportMeaning }],
  };
};
// A filler item on the same issue that is deliberately NOT primary: an incidental
// omnibus brush, which is what the corpus is full of and what the floor exists to catch.
const filler = (key, n) => ({
  kind: "vote", measureId: 8000 + n, number: `Filler ${n}`, position: "yea", isProcedural: false,
  advanceInverted: false, date: `2025-0${n + 1}-01T00:00:00.000Z`,
  issues: [{ issueKey: key, weight: 45, isPrimary: false, supportMeaning: "yea_supports" }],
});

for (const [number, congress, chamber, key] of PROMOTES) {
  const withIt = [item(number, congress, chamber, key, 0), filler(key, 1), filler(key, 2), filler(key, 3)];
  const without = withIt.map((it, i) => (i ? it : {
    ...it, issues: it.issues.map((m) => ({ ...m, isPrimary: false })),
  }));
  const a = rdIndex(key, withIt, { memberRecordCount: 999 });
  const b = rdIndex(key, without, { memberRecordCount: 999 });
  eq(b.suppressed, "no_primary",
    `${key}: four judged items without the promoted instrument are not refused for want of a primary — the floor moved`);
  eq(a.token, "record_direction",
    `${key}: four judged items WITH ${number} still do not read as a direction`);
  eq(a.characterised, true, `${key}: the read with ${number} is not characterised`);
  eq(a.judged, 4, `${key}: the item count changed`);
  // Direction is decided on act counts, not on the promoted row's weight: LEDGER-FIRST.
  eq(a.primary, 1, `${key}: exactly one of the four items should be the primary one`);
}

// Below _RD_MIN_JUDGED the primary rule does not apply at all — so a promote cannot be
// what is making a shallow record readable.
{
  const [number, congress, chamber, key] = PROMOTES[0];
  const shallow = [filler(key, 1), filler(key, 2), filler(key, 3)];
  const s = rdIndex(key, shallow, { memberRecordCount: 999 });
  eq(s.token, "record_uniform_thin", "three unmapped-primary items should still read as a uniform thin run");
  eq(s.suppressed, null, "a shallow record must not be refused for want of a primary");
  ok(number && congress && chamber, "fixture guard");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing that reads issues[0] moves");
// ═════════════════════════════════════════════════════════════════════════════
// vr-pack.ts: list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight)
const packSort = (issues) => issues.slice()
  .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight)
  .map((i) => i.issueKey);
for (const [number, congress, chamber, key, , , joins] of PROMOTES) {
  const m = measureOf(number, congress, chamber);
  const after = packSort(m.issues);
  const before = packSort(m.issues.map((i) => (i.issueKey === key ? { ...i, isPrimary: false } : i)));
  eq(after.join(" > "), before.join(" > "),
    `${number}: promoting ${key} reordered the issue list — bill-detail.js reads the first primary as the bill's issue`);
  eq(after[0], joins, `${number}: the measure's leading issue is no longer ${joins}`);
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ primary-lane promotes: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✓ primary-lane promotes: ${passed} assertions passed\n`);
