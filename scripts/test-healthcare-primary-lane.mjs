#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-healthcare-primary-lane.mjs — one healthcare promote, and nothing else
// ─────────────────────────────────────────────────────────────────────────────
// healthcare was the largest remaining primary-lane deficit in the corpus, and almost
// none of it looked like the deficits the August 2026 pack fixed. Only ONE member was
// refused outright with suppressed = 'no_primary'. The other 108 deep members were on
// record_split with their two counts WITHHELD — because the record_split_deep branch in
// stance-helpers.js gated the counts on out.primary >= _RD_MIN_PRIMARY too. Short of a
// primary, a deep mixed record was not merely uncharacterised; it was uncounted.
//
//   AND THEN BOTH GATES CAME OFF, LATER THE SAME MONTH. Package-borne acts are full
// votes: one instrument, one official Yea or Nay, and every issue mapped to it gets
// that vote at full strength, with the vehicle disclosed beside the finding rather
// than discounted from it. That does not retire this file — it sharpens it. The
// promote was justified on the subject claim, and the subject claim is still either
// true or false about H.R. 6703; what changed is that the flag no longer buys
// coverage, so sections 4 and 5 now assert the gates ABSENT and the reading
// IDENTICAL with and without the flag. A curation pass that cannot move a reading
// cannot be a way of moving a reading.
//
// The cause was structural: all four healthcare primaries were unreachable by a House
// member (one Senate confirmation, three executive orders), and all 109 deep members
// are House members. Six member-lane candidates were measured; one was promoted.
//
// This file guards that decision:
//
//   1. THE ROW MOVED, AND ONLY THE FLAG MOVED. The migration sets is_primary and a
//      rationale carrying the subject claim. It does not touch weight, support_meaning
//      or issue_key, and it is a single statement on a single table.
//   2. NO SEED MIRROR IS NEEDED — AND THAT CONDITION IS PINNED, NOT ASSUMED. H.R. 6703
//      is not in db/vr-issue-seed.json; its mappings came from a migration.
//      applyCuratedIssueSeed() is upsert-only, so a row the seed does not name cannot be
//      reverted by a re-ingest. If a later curation pass ADDS H.R. 6703 to the seed, that
//      protection evaporates — so this asserts the seed either omits the measure or
//      carries the flag. Silence stops being safe the moment the seed speaks.
//   3. THE FIVE REFUSED CANDIDATES WERE TOUCHED ZERO TIMES. H.R. 1 would have moved MORE
//      members than the one that shipped (109 vs 108); it is a fourteen-key reconciliation
//      act and is refused for exactly the reason the flag exists.
//   4. THE FLOORS DID NOT MOVE. Not _RD_MIN_PRIMARY, and not the split floors either —
//      the counts were opened by fixing the flag, not by lowering the bar to publish.
//   5. BOTH MECHANISMS DRIFT THE WAY THE PACK CLAIMS, driven through the shipped index:
//      the direction gate AND the split-counts gate, with and without the promoted item.
//   6. NOTHING THAT READS issues[0] MOVES. healthcare_costs (w100) still leads the bill.
//
//   node scripts/test-healthcare-primary-lane.mjs

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

const MIG_NAME = "20260922000000_vr_hr6703_healthcare_primary_lane";
const MIG = R(`netlify/database/migrations/${MIG_NAME}.sql`);
const SQL = MIG.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n").trim();
const SEED = JSON.parse(R("db/vr-issue-seed.json"));

// The promoted mapping, as it stands in the corpus. Weight and polarity are pinned here
// because the migration deliberately does not restate them — a promote may not move them,
// and an assertion is the only thing that says so.
const KEY = "healthcare";
const NUM = "H.R. 6703";
const WEIGHT = 70;
const MEANING = "yea_supports";
const LEADS = "healthcare_costs"; // the w100 primary this one joins, and must stay behind

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the row moved, and only the flag moved");
// ═════════════════════════════════════════════════════════════════════════════
has(SQL, `issue_key = '${KEY}'`, "the migration is not keyed on healthcare");
has(SQL, `number = '${NUM}' AND congress = 119 AND chamber = 'house'`,
  "the migration does not scope the promote to H.R. 6703 (119 house)");
has(SQL, "is_primary = TRUE", "the migration does not set the primary flag");
eq((SQL.match(/^UPDATE /gm) || []).length, 1, "the migration is not exactly one UPDATE");
eq((SQL.match(/^\s*(UPDATE|INSERT|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT)\b/gim) || []).length, 1,
  "the migration runs a statement that is not its one UPDATE");
has(SQL, "UPDATE vr_measure_issues", "the UPDATE is not on vr_measure_issues");
// vr_measures appears once, read-only, in the WHERE subselect that resolves the number.
["DELETE ", "DROP ", "ALTER ", "INSERT ", "vr_member_votes", "vr_rollcalls", "vr_positions"]
  .forEach((frag) => lacks(SQL, frag, `the migration reaches past the mapping table: "${frag.trim()}"`));
eq((SQL.match(/vr_measures\b/g) || []).length, 1,
  "vr_measures appears more than once — the promote reads it to resolve the number and nothing else");
has(SQL, "SELECT id FROM vr_measures", "the number is not resolved by a read-only subselect");
{
  const set = SQL.slice(SQL.indexOf("SET ") + 4, SQL.indexOf("WHERE"));
  const cols = (set.match(/^\s*([a-z_]+)\s*=/gm) || []).map((c) => c.trim().replace(/\s*=$/, ""));
  eq(cols.join(","), "is_primary,rationale",
    "the UPDATE assigns columns beyond the flag and its rationale — weight and polarity are not the promote's to move");
}
// The subject claim, and the ranking claim kept where it belongs: on the weight.
has(SQL, "Primary: the coverage rules are the bill''s own operative text",
  "the rationale no longer states why the mapping is primary");
has(SQL, "every one of this measure''s four mappings is a health key",
  "the rationale no longer states the no-cargo evidence the promote rests on");
has(SQL, `Weighted ${WEIGHT} rather than 100 because ${LEADS} carries the larger share`,
  "the rationale no longer keeps the ranking claim on the weight");
// The original sentence survives; a promote annotates, it does not rewrite.
has(SQL, "A broad restructuring of individual and small-group health-coverage rules.",
  "the original rationale was rewritten rather than annotated");

// Append-only. Nothing already applied was edited to make room for this.
["20260920000000_vr_s2_border_security_primary_lane", "20260921000000_vr_three_primary_lane_promotes",
 "20260721160000_seed_legislation_deepdive3"].forEach((v) =>
  ok(MIG_NAME > v, `the new migration does not sort after ${v}`));
has(R("netlify/database/migrations/20260721160000_seed_legislation_deepdive3.sql"), "H.R. 6703",
  "the migration that authored H.R. 6703's mappings was edited — applied migrations are immutable");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no seed mirror is needed, and that condition is pinned");
// ═════════════════════════════════════════════════════════════════════════════
// applyCuratedIssueSeed() upserts and never deletes, so a mapping the seed does not name
// survives a re-ingest untouched. Assert that property at its source rather than trusting
// the summary of it above.
{
  const ING = R("netlify/lib/vr-ingest.ts");
  has(ING, "onConflictDoUpdate", "the curated-seed apply no longer upserts");
  const fn = ING.slice(ING.indexOf("export async function applyCuratedIssueSeed"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  lacks(body, ".delete(", "applyCuratedIssueSeed now deletes — a migration-only mapping is no longer safe from a re-ingest");
}
{
  const m = (SEED.measures || []).find((x) => x.number === NUM);
  if (!m) {
    ok(true, "H.R. 6703 is absent from the curated seed, so there is nothing to mirror");
    passed++; // the pair of conditions this branch stands in for
  } else {
    // The seed now speaks about this measure. Silence is no longer the protection, so the
    // flag has to be mirrored or the next ingest reverts the migration.
    const row = (m.issues || []).find((i) => i.issueKey === KEY);
    ok(!!row, "H.R. 6703 entered the curated seed without its healthcare mapping — the next ingest will not restore it");
    if (row) {
      eq(row.isPrimary, true,
        "H.R. 6703 entered the curated seed with isPrimary false — the next ingest silently reverts this migration");
      eq(row.weight, WEIGHT, "the seed and the corpus disagree about H.R. 6703's healthcare weight");
      eq(row.supportMeaning, MEANING, "the seed and the corpus disagree about H.R. 6703's healthcare polarity");
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the five refused candidates were touched zero times");
// ═════════════════════════════════════════════════════════════════════════════
const REFUSED = [
  ["H.R. 1",      "a 14-key reconciliation act; would have moved 109 — MORE than the promote — off Medicaid-spending cargo"],
  ["H.R. 2483",   "an honest health bill, but health_mental (w100) already carries its subject precisely, and it hauls immig_fentanyl"],
  ["H.Amdt. 255", "coverage is the MECHANISM of an lgbtq_rights vote, not its subject"],
  ["H.R. 21",     "downstream of pro_life, and it unblocks +0 directions"],
  ["S. 3373",     "the PACT Act's subject is veterans; it reaches only 87 of the 109"],
];
REFUSED.forEach(([num, why]) =>
  lacks(SQL, `'${num}'`, `the migration reaches a refused candidate: ${num} — ${why}`));
// Two of them are in the curated seed. Their healthcare reading must stay secondary there.
[["H.Amdt. 255", 119], ["S. 3373", 117]].forEach(([num, congress]) => {
  const m = (SEED.measures || []).find((x) => x.number === num && x.congress === congress);
  if (!m) { ok(false, `${num} left the curated seed — a refusal cannot be checked`); return; }
  const row = (m.issues || []).find((i) => i.issueKey === KEY);
  if (row) eq(row.isPrimary, false, `${num}'s healthcare mapping was promoted in the seed — the audit refused it`);
  else ok(true, `${num} carries no healthcare row in the curated seed, so there is nothing to promote there`);
});
// And the promote must not have quietly become a second healthcare pass on other keys.
["healthcare_costs", "healthcare_market", "health_drug_prices", "health_mental",
 "cost_living", "voter_id", "national_debt"].forEach((k) =>
  lacks(SQL, `issue_key = '${k}'`, `the migration reaches a key it has no business in: ${k}`));

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the floors did not move");
// ═════════════════════════════════════════════════════════════════════════════
// The split floors matter as much as the primary floor here: the counts were published by
// fixing the flag, not by lowering the bar at which a split is allowed to state itself.
const SH = R("stance-helpers.js");
[["_RD_MIN_JUDGED", "4"], ["_RD_MIN_PRIMARY", "1"], ["_RD_DOMINANCE", "0.75"],
 ["_RD_THIN_MIN", "2"], ["_RD_SPLIT_MIN_JUDGED", "6"], ["_RD_SPLIT_MIN_SIDE", "2"],
 ["_RD_MEMBER_FLOOR", "12"]].forEach(([name, val]) => {
  const m = SH.match(new RegExp("var " + name + "\\s*=\\s*([0-9.]+)"));
  eq(m && m[1], val, `${name} moved — a data pass may not buy coverage by lowering a floor`);
});
// ── AND THE TWO GATES THIS PACK ONCE DEPENDED ON ARE GONE ────────────────────
// Read off the source rather than remembered, and asserted ABSENT. August 2026:
// one instrument means one official Yea or Nay, and every issue mapped to that
// instrument gets that vote at full strength. How the act arrived is a label on the
// bill — printed beside the finding, never subtracted from it — so neither the
// direction branch nor the split-counts branch may consult it. What that makes of
// this pack is the point of section 5: the promote is now a no-op for the reading,
// which is the strongest form of "only the flag moved" there is.
lacks(SH, "return stop('record_thin', 'no_primary')",
  "the direction gate refuses for want of a primary again — that is a discount on a recorded vote");
lacks(SH, "out.primary >= _RD_MIN_PRIMARY",
  "the split-counts gate consults the primary flag again — a package-borne split withholds nothing a primary one publishes");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · both mechanisms drift the way the pack claims");
// ═════════════════════════════════════════════════════════════════════════════
const win = loadEngine(ROOT);
const rdIndex = win._recordDirectionIndex;
// The promoted item, and the incidental brushes that surround it in the real corpus.
const promoted = (isPrimary) => ({
  kind: "vote", measureId: 10, number: NUM, position: "yea", isProcedural: false,
  advanceInverted: false, date: "2025-12-17T00:00:00.000Z",
  issues: [{ issueKey: KEY, weight: WEIGHT, isPrimary, supportMeaning: MEANING }],
});
const brush = (n, position) => ({
  kind: "vote", measureId: 8000 + n, number: `Filler ${n}`, position, isProcedural: false,
  advanceInverted: false, date: `2025-0${n}-01T00:00:00.000Z`,
  issues: [{ issueKey: KEY, weight: 45, isPrimary: false, supportMeaning: MEANING }],
});

// 5a · the direction gate — the 1 member who was refused outright
{
  const items = [promoted(true), brush(1, "yea"), brush(2, "yea"), brush(3, "yea")];
  const withIt = rdIndex(KEY, items, { memberRecordCount: 999 });
  const without = rdIndex(KEY, [promoted(false), ...items.slice(1)], { memberRecordCount: 999 });
  eq(withIt.token, "record_direction", "four judged items including H.R. 6703 still do not read as a direction");
  eq(withIt.characterised, true, "the read with H.R. 6703 is not characterised");
  eq(withIt.primary, 1, "exactly one of the four items should be the primary one");
  // THE PROMOTE IS A NO-OP FOR THE READING, AND THAT IS THE DOCTRINE. This read used
  // to be refused outright without the flag (suppressed = 'no_primary') and to
  // characterise with it — so our own curation decided whether four recorded votes
  // could be read. It cannot any more. Four judged items, all one way, read as a
  // direction whether the measure was about the issue or carried it.
  eq(without.suppressed, null,
    "four judged healthcare items are refused for want of a primary — our flag is deciding what their votes say");
  eq(without.token, "record_direction", "…and the same four items read as a direction without it");
  eq(without.characterised, true, "…and are characterised, at full strength");
  eq(without.lead, withIt.lead, "…leaning exactly where the promoted read leans");
  eq(without.primary, 0, "…with the flag genuinely absent, so this is not a fixture accident");
}

// 5b · the split-counts gate — the 107 whose counts open. This is the bulk of the pack,
// and it is a DISCLOSURE, not a direction: `lead` must stay null through both branches.
{
  const items = [promoted(true), brush(1, "yea"), brush(2, "yea"), brush(3, "yea"),
                 brush(4, "nay"), brush(5, "nay")];
  const withIt = rdIndex(KEY, items, { memberRecordCount: 999 });
  const without = rdIndex(KEY, [promoted(false), ...items.slice(1)], { memberRecordCount: 999 });
  eq(withIt.token, "record_split_deep", "a deep mixed record with H.R. 6703 does not publish its counts");
  // AND THE SAME LEDGER WITHOUT THE FLAG PUBLISHES THE SAME TWO NUMBERS. Withholding
  // them was the quieter half of the same discount: short of a primary a deep mixed
  // record was not merely uncharacterised, it was uncounted. Six judged acts are six
  // judged acts.
  eq(without.token, "record_split_deep",
    "a deep mixed record withholds its counts for want of a primary — the arithmetic is the same arithmetic");
  eq(withIt.judged, 6, "the split fixture is not at _RD_SPLIT_MIN_JUDGED");
  eq(Math.min(withIt.advances, withIt.opposes), 2, "the split fixture's small side is not at _RD_SPLIT_MIN_SIDE");
  eq(withIt.lead, null, "opening the counts invented a direction — a split has no winner");
  eq(without.lead, null, "the withheld split has a direction — a split has no winner");
  const tiers = win._RD_TIERS || {};
  if (tiers.record_split_deep && tiers.record_split) {
    eq(tiers.record_split_deep.counted, true, "record_split_deep no longer states its counts");
    eq(tiers.record_split.counted, false, "record_split now states counts it has not earned");
    eq(tiers.record_split_deep.characterised, false, "record_split_deep now claims a character it does not have");
  }
}

// 5c · a promote cannot make a shallow record readable — the floors still do that work.
{
  const s = rdIndex(KEY, [promoted(true), brush(1, "yea"), brush(2, "yea")], { memberRecordCount: 999 });
  eq(s.judged, 3, "the shallow fixture is not below _RD_MIN_JUDGED");
  eq(s.suppressed, null, "a shallow record must not be refused for want of a primary");
  eq(s.token, "record_uniform_thin", "three same-way items should read as a uniform thin run, promote or not");
}

// 5d · the promote reaches only its own key. The index is computed per issue key; the
// live 93-key sweep lives in the audit harness, this is the unit-level half.
{
  const other = "cost_living";
  const items = [promoted(true), brush(1, "yea"), brush(2, "yea"), brush(3, "yea")];
  const o = rdIndex(other, items, { memberRecordCount: 999 });
  eq(o.judged, 0, "items mapped to healthcare were judged against another issue key");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing that reads issues[0] moves");
// ═════════════════════════════════════════════════════════════════════════════
// vr-pack.ts: list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight)
{
  has(R("netlify/lib/vr-pack.ts"), "Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight",
    "the pack's issue sort changed — the ordering proof below no longer describes it");
  const issues = [
    { issueKey: "healthcare_costs",  weight: 100, isPrimary: true },
    { issueKey: "healthcare",        weight: WEIGHT, isPrimary: true },
    { issueKey: "healthcare_market", weight: 60,  isPrimary: false },
    { issueKey: "health_drug_prices", weight: 45, isPrimary: false },
  ];
  const sortKeys = (list) => list.slice()
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight)
    .map((i) => i.issueKey).join(" > ");
  const after = sortKeys(issues);
  const before = sortKeys(issues.map((i) => (i.issueKey === KEY ? { ...i, isPrimary: false } : i)));
  eq(after, before, "promoting healthcare reordered H.R. 6703's issue list");
  eq(after.split(" > ")[0], LEADS, "H.R. 6703's headline issue is no longer healthcare_costs");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ healthcare primary lane: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✓ healthcare primary lane: ${passed} assertions passed\n`);
