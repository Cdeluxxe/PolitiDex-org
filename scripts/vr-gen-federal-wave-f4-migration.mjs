#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Federal wave F4 — one primary-lane promote, and a wave that admits no roll call
// ─────────────────────────────────────────────────────────────────────────────
// Folds db/vr-federal-mapping-seed-f4.json and db/vr-federal-wave-f4-vote-seed.json
// into a forward-only migration.
//
// WHAT F4 IS FOR
// F3 closed two chamber gaps by INGESTING: two measures, three rolls, 303 attributed
// member votes. F4 rebuilt the census the same way — scripts/vr-federal-fpi.mjs
// --chambers, 99 senators, 98 keys — and found 37 keys with a Senate-reachable
// PRIMARY instrument and 3,358 unread senator rows. Then it went looking for the
// next instrument and did not find one.
//
// THE SWEEP THAT CAME BACK EMPTY, WHICH IS THE FIRST HALF OF THE FINDING
// All 890 Senate roll calls of the 119th Congress were read from the LIS XML and
// filtered on question form per runbook rule 12. Sixty-three are passage forms.
// Eighteen are already in the corpus. Every one of the remaining forty-five serves a
// key that ALREADY holds a Senate-reachable PRIMARY (the BLM, EPA, DOE, NPS, BOEM,
// OCC, CFPB and IRS disapprovals on lands_energy, lands_preserve, climate_action,
// energy_production, econ_corp_account, crypto and gov_regulation), or serves a
// `_RD_NO_POLE` key that can never be characterised (the tariff-emergency
// terminations on tariffs_authority, H.Con.Res. 86 on war_powers), or is an
// appropriations vehicle, or is an S.Res. authorising en bloc consideration of
// Executive Calendar nominations. The seven keys the brief held back were re-verified
// literally against those 890 rolls rather than carried on F3's word: S. 2683,
// S. 146, H.R. 3193, H.R. 5408 and S. 1101 each appear ZERO times. None jumped the
// queue. So this migration inserts no measure, no roll call and no member vote, and
// the vote seed is empty on purpose.
//
// THE SECOND HALF: A KEY CAN BE BLOCKED BY A FLAG RATHER THAN BY A MISSING BILL
// A second census was built for this wave and a new harness flag written for it.
// `--band` takes every key with no Senate-reachable PRIMARY, flips every
// Senate-reachable non-primary act on it to `is_primary` ONE AT A TIME, re-runs
// PDXConsistency.formalPatternIndex over all 99 senators and diffs the read set.
// Forty-one candidates across 27 keys, each measured rather than argued. Fifteen
// would each start characterising 88 or more senator rows and NONE would stop
// characterising a single one — so the constraint on this wave was never arithmetic.
// Almost every candidate moves a large number, because almost every candidate is a
// measure the whole Senate voted on. The constraint is entirely the instrument.
//
// THE ONE CANDIDATE WHOSE INSTRUMENT IS ITS OWN KEY
// Of the 41, exactly one is a measure whose subject IS the key being promoted.
// Every other mover promotes one title of a package: H.R. 4 (Rescissions Act, eight
// keys) for america_first, gov_waste, free_speech, audit_spending and
// america_first_fp; H.R. 1 for tax_middle_class and edu_college_cost; H.R. 1319 for
// child_care, econ_smallbiz, econ_workers, public_schools and cost_living; H.R. 3684
// for transit, water and disaster_resilience; H.R. 5376 for health_drug_prices;
// H.R. 4346 for econ_growth; H.R. 1968 — a continuing resolution — for health_rural.
// Promoting any of those is the package percentage the doctrine refuses by name, and
// all forty are refused in writing in the mapping seed with their measured arithmetic
// attached.
//
// H.R. 6644, the 21st Century ROAD to Housing Act, is not one of them. `housing`'s
// published chip in alignment-tool.js is "Make housing more affordable by boosting
// supply and lowering the cost to build and buy", and the enrolled text carries all
// three limbs as full titles: supply in Titles I, II and III; the cost to build in
// Sec. 211, captioned the Housing Affordability Act, which re-indexes the FHA
// multifamily per-unit caps at 12 U.S.C. 1713(c)(3)(A) and 1715e(b)(2) to the Census
// Bureau's multifamily construction price deflator and raises them roughly fourfold;
// and the cost to buy in Title IV (Accessing the American Dream — small-dollar
// mortgage origination, points and fees, appraisal standards, savings), Title IX
// (Strengthening Community Banks' Role in Housing) and Title X (Home-Ownership for
// Main Street America, which restricts large institutional-investor purchases of
// single-family homes). Eleven of the Act's twelve titles are housing titles. This is
// not an omnibus with a housing title in it; it is a housing act with one section
// about central bank digital currency.
//
// So `housing` has had its instrument all along and has been reading `incidental` on
// 97 senator rows because the row was filed in the wrong lane. Wrong flag, not wrong
// floor — the same finding, and the same fix, as
// 20260922000000_vr_hr6703_healthcare_primary_lane.
//
// THE COUSIN WALL, WHICH THE PROMOTE SHARPENS RATHER THAN BLURS
//   · housing_build keeps its w100 PRIMARY and its rationale is not rewritten. Its
//     chip is "Loosen zoning and permitting so more homes — including apartments —
//     can be built": that is Titles I, II and III, and it cannot carry Title IV,
//     Title IX or Title X. A small-dollar mortgage origination incentive loosens no
//     zoning and an appraisal standard permits no construction.
//   · housing_support gets NO row on this Act, and it is the temptation this wave's
//     own instrument created — the key holds no federal instrument at all, and
//     Secs. 404, 405, 212 and 501 are four real subsidy provisions. Refused three
//     ways: four sections of twelve titles is the same package percentage this wave
//     refuses everywhere else, its chip requires eviction limits and renter
//     protections of which the Act has none, and MEASURED, a lone non-primary row
//     gains zero characterised rows while adding 98 unread ones.
//   · disaster_resilience gets no row either, though Sec. 504 is the Reforming
//     Disaster Recovery Act and the key's chip reaches "speed up disaster recovery".
//     One section of twelve titles, whichever Act it is. A wave does not get to apply
//     a looser rule to its own instrument than to the ones it declines.
//
// WHAT MOVED, MEASURED BOTH CHAMBERS
// +193 rows started being characterised — 97 senators and 96 representatives — and
// ZERO stopped, checked set-wise on the row model's own `read` flag over all 327
// federal members rather than on shape counters that can net a loss against a gain.
// Senate keys with a PRIMARY instrument: 37 → 38. Unread senator rows: 3,358 →
// 3,261. The `incidental` bucket: 1,316 → 1,219. All 193 gains read at tier `thin`,
// which is the honest tier for a single judged act, and none of them is dressed as
// more than that.
//
// THE CAVEAT, STATED RATHER THAN OMITTED
// The Act's own long title is "To increase the supply of housing in America, and for
// other purposes" — supply, not affordability. That is why housing_build holds w100
// and why this row STAYS at w80: netlify/lib/vr-pack.ts sorts a measure's issues
// primary-first then weight-descending, so housing_build still outranks housing and
// the bill page's issue order is byte-identical before and after. The Act has no
// findings or purposes section — Sec. 1 is a short title and a table of contents,
// Secs. 1201 and 1202 are severability and a no-additional-funds clause — so the
// titles are the only text there is to read, and read on the titles the buy side is
// three of twelve rather than incidental.
//
// AND ONE CONTRADICTION SURFACED RATHER THAN QUIETLY FIXED (runbook rule 25)
// econ_trade was the top of the volume ranking, tied at 97 unread rows, and it is
// refused. The corpus presently codes tariff-IMPOSING Proclamations 11012, 11020 and
// 10896 and Executive Order 14257 as `yea_supports` on econ_trade, AND
// tariff-TERMINATING S.J.Res. 37 as `yea_supports` too. At most one of those can be
// the key's polarity. Fixing it means moving a support_meaning, which is a Direction
// Match input on every member holding the act, and this wave's doctrine walls DM off.
// So it is published in the seed under surfacedContradictions for a dedicated pass,
// and no number is moved on it here.
//
// WHAT THIS FILE DELIBERATELY DOES NOT TOUCH
//   · No key is added. keysAdded 0. The one vocabulary finding — america_first is a
//     bundle whose foreign-policy limb the August 2026 america_first_fp narrowing
//     already superseded, leaving 97 incidental rows and one Senate-reachable act —
//     fails the V1 bar in the direction that matters: there is nothing left to map it
//     to. It goes to db/vr-issue-key-proposals.md and nowhere else.
//   · No floor moves. _RD_MIN_PRIMARY stays 1, _RD_MIN_JUDGED stays 4, _RD_THIN_MIN
//     stays 2, _RD_MIN_STRENGTH stays 4, _RD_THIN_MIN_STRENGTH stays 0.6,
//     _RD_DOMINANCE stays 0.75, _RD_SPLIT_MIN_JUDGED stays 6, _RD_SPLIT_MIN_SIDE
//     stays 2, _PDX_RD_MEMBER_FLOOR stays 12.
//   · No support_meaning changes anywhere, no weight changes anywhere, no member vote
//     added, no mapping retracted. Direction Match and the Word-vs-Action score read
//     the same inputs after this migration as before it.
//
// INVARIANTS THIS FILE HOLDS
//   · THE PROMOTE IS FAIL-CLOSED ON THE PRE-STATE. It RAISES unless the live row is
//     exactly what this wave read: weight 80, is_primary FALSE, support_meaning
//     yea_supports, and the rationale still the "Secondary:" text F2's pack wrote. A
//     promote that overwrites a rationale somebody else has since rewritten is runbook
//     rule 21 violated by a migration, so it stops instead.
//   · IT IS IDEMPOTENT. A second run finds is_primary already TRUE, checks that the
//     weight and polarity are still 80 and yea_supports, and does nothing.
//   · THE VERIFICATION BLOCK IS SCOPED TO THE ONE ROW THIS FILE WRITES, plus the
//     specific (measure, key) pairs it refused. No global row count is asserted,
//     because a guard that counts rows other waves wrote collides with the next wave
//     and then gets relaxed until it means nothing.
//
//   node scripts/vr-gen-federal-wave-f4-migration.mjs \
//     > netlify/database/migrations/20261018000000_vr_federal_wave_f4.sql
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const DECISION_PATH = "db/vr-federal-mapping-seed-f4.json";
const SEED_PATH = "db/vr-federal-wave-f4-vote-seed.json";
const decision = J(DECISION_PATH);
const voteSeed = J(SEED_PATH);
const LABEL = "Federal wave F4";

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";

// A wave that ships no roll must SAY so in the emitted SQL rather than merely omit
// the block. An empty INSERT section reads as an oversight; an asserted zero reads as
// a decision. The generator refuses to emit if the vote seed ever grows rolls,
// because everything below assumes there are none.
if ((voteSeed.votes || []).length || (voteSeed.newMeasures || []).length) {
  console.error(`${SEED_PATH} now carries rolls or measures. This generator emits a mapping-only migration and cannot fold them; use the F3 generator's shape instead.`);
  process.exit(1);
}

const promotes = decision.promotes || [];
if (promotes.length !== 1) {
  console.error(`${DECISION_PATH} carries ${promotes.length} promotes; this wave decided exactly one.`);
  process.exit(1);
}
const P = promotes[0];
const T = (decision.readLossDisclosure || {}).totals || {};
const C = decision._counts || {};
for (const k of ["gained", "lost", "membersChecked"]) {
  if (T[k] == null) { console.error(`readLossDisclosure.totals.${k} is not filled in; the header quotes the measured numbers and will not invent them`); process.exit(1); }
}
for (const k of ["congress", "chamber", "number", "issueKey", "from", "to", "rationale"]) {
  if (P[k] == null) { console.error(`promote is missing ${k}`); process.exit(1); }
}

// The refusals that become assertions. Only the ones with a live (measure, key) row
// this wave measured and declined — a refusal with nothing on file to check is prose,
// and prose belongs in the banner, not in a RAISE.
const REFUSED_ROWS = [
  { number: "H.R. 4",       congress: 119, chamber: "house",  key: "america_first",      note: "H.R. 4's primary is cut_spending w100; promoting a rescissions act's america_first line prints a spending vote as a foreign-policy record for 97 senators." },
  { number: "H.R. 4",       congress: 119, chamber: "house",  key: "gov_waste",          note: "gov_waste is 'cut duplicate programs and improper payments'. H.R. 4 cancels enacted unobligated balances, which is a funding choice and not a finding of waste." },
  { number: "H.R. 4",       congress: 119, chamber: "house",  key: "free_speech",        note: "the free_speech row on H.R. 4 exists because one rescission paragraph strikes the Corporation for Public Broadcasting appropriation. A w30 line item is not the standalone instrument S. 146's unanimous-consent passage left missing." },
  { number: "H.R. 4",       congress: 119, chamber: "house",  key: "audit_spending",     note: "'codifies cuts identified by DOGE' describes the cuts' provenance, not the Act's subject." },
  { number: "H.R. 4",       congress: 119, chamber: "house",  key: "america_first_fp",   note: "same eight-key rescissions act; the key's Aug-2026 scope note is what the United States funds and commits to abroad, and H.R. 4 is a domestic cancellation instrument." },
  { number: "H.R. 1",       congress: 119, chamber: "house",  key: "tax_middle_class",   note: "H.R. 1 is a reconciliation act carrying fourteen keys. Promoting its rate-and-credit title prints a reconciliation vote as a middle-class tax record for 98 senators." },
  { number: "H.R. 1968",    congress: 119, chamber: "house",  key: "health_rural",       note: "H.R. 1968 is a further continuing resolution for the fiscal year ending 2025-09-30. This is the exact 'do not manufacture a PRIMARY from a vehicle' case, and it was the largest number on the table at 98 rows." },
  { number: "H.R. 5376",    congress: 117, chamber: "house",  key: "health_drug_prices", note: "the Inflation Reduction Act's drug-pricing title is real, large and one title of a reconciliation act whose primary is climate_action w100." },
  { number: "H.R. 1319",    congress: 117, chamber: "house",  key: "child_care",         note: "Title II of the American Rescue Plan, an eight-key emergency package whose primary is family_support w100." },
  { number: "H.R. 3684",    congress: 117, chamber: "house",  key: "disaster_resilience",note: "Divisions D and J of the infrastructure act." },
  { number: "H.R. 3684",    congress: 117, chamber: "house",  key: "transit",            note: "a title of the infrastructure act; no standalone transit instrument exists in the 119th in either chamber." },
  { number: "H.R. 3684",    congress: 117, chamber: "house",  key: "water",              note: "a title of the infrastructure act. water's scope is demand-side conservation, which is also why H.J.Res. 20 — a rule on gas-fired instantaneous water heaters — was refused as a keyword collision." },
  { number: "H.R. 4346",    congress: 117, chamber: "house",  key: "econ_growth",        note: "Sec. 103 of CHIPS is an industrial-policy mechanism inside a research-and-fabrication act whose primary is tech_innovation w100." },
  { number: "S.J.Res. 37",  congress: 119, chamber: "senate", key: "econ_trade",         note: "refused on a surfaced polarity contradiction (rule 25): the corpus reads tariff-imposing proclamations AND this tariff-terminating resolution as both supporting econ_trade. Its own subject is the authority question, held correctly by tariffs_authority w100." },
  { number: "S. 2938",      congress: 117, chamber: "senate", key: "health_mental",      note: "the Bipartisan Safer Communities Act is a firearms act (gun_safety w100). A large mental-health title does not make it a mental-health instrument." },
  { number: "S. 331",       congress: 119, chamber: "senate", key: "health_mental",      note: "the HALT Fentanyl Act is a sentencing act (immig_fentanyl w100) and its health_mental slice is filed yea_opposes as a downstream consequence." },
];

// Rows this wave refused to CREATE on its own instrument. Asserted as absent, because
// the temptation is specific and it is on the very measure this file writes to.
const REFUSED_NEW_ROWS = [
  { key: "housing_support",     note: "Secs. 404, 405, 212 and 501 are four subsidy provisions in a twelve-title Act; the chip requires eviction limits and renter protections the Act does not contain; and measured, a lone non-primary row gains 0 characterised rows and adds 98 unread ones." },
  { key: "disaster_resilience", note: "Sec. 504, the Reforming Disaster Recovery Act, is one section of twelve titles. A wave does not get to apply a looser package rule to its own instrument than to the ones it declines." },
];

const out = [];
const w = (s = "") => out.push(s);
const wrap = (text, width = 84, prefix = "-- ") => {
  const lines = [];
  let line = "";
  for (const word of String(text).replace(/\s+/g, " ").trim().split(" ")) {
    if (line && (line + " " + word).length > width) { lines.push(line); line = word; } else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  for (const l of lines) w(prefix + l);
};

const RULE = "-- " + "─".repeat(76);
w(RULE);
w(`-- ${LABEL} — H.R. 6644 housing: secondary → PRIMARY`);
w(RULE);
wrap(`Generated by scripts/vr-gen-federal-wave-f4-migration.mjs from ${DECISION_PATH} and ${SEED_PATH}. Do not hand-edit; regenerate.`);
w("--");
wrap("WHAT THIS WAVE ADMITS: nothing. No measure, no roll call, no member vote, no issue row, no key. All 890 Senate roll calls of the 119th Congress were swept and filtered on question form per runbook rule 12; 63 are passage forms, 18 are already in the corpus, and every one of the remaining 45 serves a key that already holds a Senate-reachable PRIMARY, or a `_RD_NO_POLE` key that can never be characterised, or is an appropriations vehicle, or is an Executive Calendar resolution. The seven keys held back by the brief were re-verified literally against those rolls: S. 2683, S. 146, H.R. 3193, H.R. 5408 and S. 1101 each appear ZERO times, so none jumped the queue and none was manufactured out of a vehicle, a unanimous-consent passage or a motion to proceed.");
w("--");
wrap("WHAT IT CHANGES: one boolean, one rationale and one source URL, on one row.");
w("--");
wrap(`${P.number} (${P.congress}), the 21st Century ROAD to Housing Act, Public Law 119-101 — already carries ${P.issueKey} at weight ${P.from.weight}, non-primary, ${P.from.supportMeaning}. The primary wall in stance-helpers.js reads a key with no primary act as 'incidental' and declines to characterise it, so 97 senators and 96 representatives with a recorded floor vote on this Act read as having no position on housing. The measure is House-origin and Senate-passed with rolls in both chambers already in the corpus, so nothing about admissibility is relitigated here.`);
w("--");
wrap("THE ARGUMENT, FROM THE ENROLLED TEXT AND AGAINST THE PUBLISHED CHIP");
wrap(P.rationale, 84, "--   ");
w("--");
wrap("THE COUSIN WALL");
wrap(P.cousinWall, 84, "--   ");
w("--");
wrap("THE CAVEAT");
wrap(P.theCaveat, 84, "--   ");
w("--");
wrap("MEASURED, BOTH CHAMBERS, SET-WISE ON THE ROW MODEL'S OWN read FLAG");
wrap(`+${T.gained} rows started being characterised — ${T.gainedByChamber.senate} senators, ${T.gainedByChamber.house} representatives — and ${T.lost} stopped, over all ${T.membersChecked} federal members. Senate keys with a PRIMARY instrument ${C.senateKeysWithPrimaryBefore} → ${C.senateKeysWithPrimaryAfter}; unread senator rows ${C.senateUnreadRowsBefore} → ${C.senateUnreadRowsAfter}; the incidental bucket ${C.senateIncidentalRowsBefore} → ${C.senateIncidentalRowsAfter}. All ${T.gained} gains read at tier \`thin\`, the honest tier for a single judged act, and none is dressed as more. Utah: all six federal members gain the key — Lee nay and Curtis yea on the same roll, so the promote hands each member their own position rather than the delegation a uniform one. Reproduce: node scripts/vr-federal-fpi.mjs --set all --waves f1,f2,f3,f4 (and --chambers, and --band).`, 84, "--   ");
w("--");
wrap("WHAT IT DOES NOT TOUCH");
wrap(`No weight moves: ${P.issueKey} stays at ${P.to.weight} and housing_build stays at 100, so netlify/lib/vr-pack.ts orders the measure's issues identically before and after. No support_meaning moves anywhere in this wave, so every Direction Match and Word-vs-Action input is the same object it was. No key is added — keysAdded 0. No floor moves: _RD_MIN_PRIMARY stays 1, _RD_MIN_JUDGED stays 4, _RD_THIN_MIN stays 2, _RD_MIN_STRENGTH stays 4, _RD_THIN_MIN_STRENGTH stays 0.6, _RD_DOMINANCE stays 0.75, _RD_SPLIT_MIN_JUDGED stays 6, _RD_SPLIT_MIN_SIDE stays 2, _PDX_RD_MEMBER_FLOOR stays 12. Wrong flag, not wrong floor.`, 84, "--   ");
w("--");
wrap(`WHAT WAS MEASURED AND REFUSED — ${(decision.declinedPromotes || []).length} entries in ${DECISION_PATH}, ${REFUSED_ROWS.length + REFUSED_NEW_ROWS.length} of them asserted below`);
for (const r of REFUSED_ROWS) wrap(`${r.number} (${r.congress}) ${r.key} — ${r.note}`, 82, "--   · ");
for (const r of REFUSED_NEW_ROWS) wrap(`${P.number} (${P.congress}) ${r.key} — refused as a NEW row: ${r.note}`, 82, "--   · ");
w("--");
wrap("Forward-only and idempotent. The promote is fail-closed on the pre-state: it RAISES unless the live row is exactly what this wave read, and a second run finds the flag already set and does nothing.");
w(RULE);
w();

// ── the promote ──────────────────────────────────────────────────────────────
w("DO $$");
w("DECLARE");
w("  m_id       INTEGER;");
w("  cur        vr_measure_issues;");
w("BEGIN");
w("  SELECT id INTO m_id FROM vr_measures");
w(`   WHERE congress = ${P.congress} AND chamber = ${q(P.chamber)} AND number = ${q(P.number)};`);
w("  IF m_id IS NULL THEN");
w(`    RAISE EXCEPTION '${LABEL}: ${P.number} (${P.congress}, ${P.chamber}) is not in vr_measures. This wave promotes an existing row and creates nothing, so a missing measure is a corpus problem and not something to insert around.';`);
w("  END IF;");
w("");
w("  SELECT * INTO cur FROM vr_measure_issues");
w(`   WHERE measure_id = m_id AND issue_key = ${q(P.issueKey)};`);
w("  IF NOT FOUND THEN");
w(`    RAISE EXCEPTION '${LABEL}: ${P.number} carries no ${P.issueKey} row to promote. The row this wave read was filed by an earlier pack at weight ${P.from.weight}, non-primary; if it has been retracted since, the promote is moot and this migration must be re-decided rather than made to insert one.';`);
w("  END IF;");
w("");
w("  -- Idempotent second run: the flag is already set. Check that nothing else moved");
w("  -- underneath it and stop. This is the branch a re-apply takes.");
w("  IF cur.is_primary THEN");
w(`    IF cur.weight <> ${P.to.weight} OR cur.support_meaning <> ${q(P.to.supportMeaning)} THEN`);
w(`      RAISE EXCEPTION '${LABEL}: ${P.number} ${P.issueKey} is already primary but now reads weight %, support_meaning % rather than ${P.to.weight} / ${P.to.supportMeaning}. Something else has rewritten this row; roll forward with a new migration rather than letting this one overwrite it.', cur.weight, cur.support_meaning;`);
w("    END IF;");
w(`    RAISE NOTICE '${LABEL}: ${P.number} ${P.issueKey} is already in the primary lane; nothing to do.';`);
w("    RETURN;");
w("  END IF;");
w("");
w("  -- FAIL-CLOSED ON THE PRE-STATE. Each of these three is a different way for the");
w("  -- row to have stopped being the row this wave argued about, and each stops rather");
w("  -- than adapts: the weight is what ranks housing below housing_build, the polarity");
w("  -- is what every member's read direction comes from, and the rationale is another");
w("  -- writer's text the moment it is not the one F2's pack wrote (runbook rule 21).");
w(`  IF cur.weight <> ${P.from.weight} THEN`);
w(`    RAISE EXCEPTION '${LABEL}: expected ${P.number} ${P.issueKey} at weight ${P.from.weight}, found %. The promote deliberately does not move the weight — ${P.from.weight} is what keeps housing ranked below housing_build''s 100 — so a different weight means a different decision is needed.', cur.weight;`);
w("  END IF;");
w(`  IF cur.support_meaning <> ${q(P.from.supportMeaning)} THEN`);
w(`    RAISE EXCEPTION '${LABEL}: expected ${P.number} ${P.issueKey} support_meaning ${P.from.supportMeaning}, found %. This wave changes no polarity anywhere; if the live polarity has flipped, the primary lane would publish 193 members'' positions in a direction this wave never read.', cur.support_meaning;`);
w("  END IF;");
w("  IF cur.rationale NOT LIKE 'Secondary:%' THEN");
w(`    RAISE EXCEPTION '${LABEL}: ${P.number} ${P.issueKey} no longer carries the "Secondary:" rationale this wave read (found: %). Overwriting a rationale a later writer has since replaced is runbook rule 21 violated by a migration, so this stops instead.', left(cur.rationale, 120);`);
w("  END IF;");
w("");
w("  UPDATE vr_measure_issues");
w("     SET is_primary = TRUE,");
w(`         rationale  = ${q(P.rationale)},`);
w(`         source_url = ${q(P.sourceUrlWritten)}`);
w("   WHERE id = cur.id;");
w("");
w(`  RAISE NOTICE '${LABEL}: ${P.number} ${P.issueKey} promoted to the primary lane at weight ${P.to.weight}.';`);
w("END $$;");
w();

// ── verification, scoped to the row this file writes ────────────────────────
w(RULE);
w("-- VERIFICATION — scoped to the one row this file writes and the rows it refused");
w(RULE);
w("DO $$");
w("DECLARE");
w("  m_id            INTEGER;");
w("  n_promoted      INTEGER;");
w("  n_rows          INTEGER;");
w("  n_build_primary INTEGER;");
w("  n_own_chamber   INTEGER;");
w("  n_sen_primary   INTEGER;");
w("  n_refused       INTEGER;");
w("BEGIN");
w("  SELECT id INTO m_id FROM vr_measures");
w(`   WHERE congress = ${P.congress} AND chamber = ${q(P.chamber)} AND number = ${q(P.number)};`);
w("");
w("  -- 1. The row landed, in the lane, at the weight and polarity it was filed at.");
w("  SELECT count(*) INTO n_promoted FROM vr_measure_issues");
w(`   WHERE measure_id = m_id AND issue_key = ${q(P.issueKey)}`);
w(`     AND is_primary AND weight = ${P.to.weight} AND support_meaning = ${q(P.to.supportMeaning)};`);
w("  IF n_promoted <> 1 THEN");
w(`    RAISE EXCEPTION '${LABEL}: the ${P.issueKey} w${P.to.weight} PRIMARY ${P.to.supportMeaning} row on ${P.number} (${P.congress}) did not land (found % row(s)). Without it the primary wall reopens and 97 senators plus 96 representatives read incidental on ${P.issueKey} again, which was the state this wave found.', n_promoted;`);
w("  END IF;");
w("");
w("  -- 2. NO ROW WAS ADDED OR REMOVED. The measure carried four mappings before this");
w("  --    migration and carries four after: housing_build 100, housing 80,");
w("  --    permitting_reform 60, crypto_cbdc 40. This is the assertion that catches a");
w("  --    promote that quietly became an ingest.");
w("  SELECT count(*) INTO n_rows FROM vr_measure_issues WHERE measure_id = m_id;");
w("  IF n_rows <> 4 THEN");
w(`    RAISE EXCEPTION '${LABEL}: ${P.number} now carries % issue row(s) rather than 4. This wave adds no mapping and removes none; housing_support and disaster_resilience were both read on this Act and refused in writing.', n_rows;`);
w("  END IF;");
w("");
w("  -- 3. THE COUSIN WALL, AS AN ASSERTION. housing_build keeps the w100 primary, so");
w("  --    vr-pack.ts still orders it above housing and the bill page's headline issue");
w("  --    is unchanged. A promote that displaced it would be a different decision.");
w("  SELECT count(*) INTO n_build_primary FROM vr_measure_issues");
w("   WHERE measure_id = m_id AND issue_key = 'housing_build' AND is_primary AND weight = 100;");
w("  IF n_build_primary <> 1 THEN");
w(`    RAISE EXCEPTION '${LABEL}: housing_build no longer holds the w100 primary on ${P.number} (found % row(s)). housing was promoted BESIDE it, not over it — the weight is what ranks the two axes and the supply limb is the one the Act''s own long title names.', n_build_primary;`);
w("  END IF;");
w("");
w("  -- 4. Runbook rule 30's second corollary, checked rather than trusted: a measure");
w("  --    whose own chamber does not appear among its rolls is almost always an ingest");
w("  --    gap, and this wave hangs a primary flag on a House-origin measure.");
w("  SELECT count(*) INTO n_own_chamber FROM vr_rollcalls");
w(`   WHERE measure_id = m_id AND chamber = ${q(P.chamber)};`);
w("  IF n_own_chamber < 1 THEN");
w(`    RAISE EXCEPTION '${LABEL}: ${P.number} is a ${P.chamber} measure and carries % roll call(s) in the ${P.chamber}. The 96 House gains this wave measured come from that roll; without it the promote serves one chamber and leaves a written gap in the other.', n_own_chamber;`);
w("  END IF;");
w("");
w("  -- 5. THE WAVE'S PURPOSE, STATED AS A FLOOR. At least one measure carrying");
w("  --    housing at is_primary must have a Senate roll, or the key is back to zero");
w("  --    Senate-reachable PRIMARYs and all 97 senator rows go unread again.");
w("  SELECT count(DISTINCT mi.measure_id) INTO n_sen_primary");
w("    FROM vr_measure_issues mi");
w("    JOIN vr_rollcalls rc ON rc.measure_id = mi.measure_id AND rc.chamber = 'senate'");
w(`   WHERE mi.issue_key = ${q(P.issueKey)} AND mi.is_primary;`);
w("  IF n_sen_primary < 1 THEN");
w(`    RAISE EXCEPTION '${LABEL}: ${P.issueKey} holds % Senate-reachable PRIMARY measure(s). Below 1 the primary wall in stance-helpers.js reopens; ${P.number}''s Senate passage roll (119/2 roll 53, On Passage of the Bill, 89-10) is the only instrument in the 119th that closes this key.', n_sen_primary;`);
w("  END IF;");
w("");
w("  -- 6. THE REFUSALS, EXECUTABLE. Each was simulated with --band, would have moved");
w("  --    a large number of rows, and was declined on its instrument. A later wave that");
w("  --    legitimately promotes one of these should roll forward with its own argument;");
w("  --    this assertion exists so that it has to write one.");
for (const r of REFUSED_ROWS) {
  w("  SELECT count(*) INTO n_refused FROM vr_measure_issues mi JOIN vr_measures m ON m.id = mi.measure_id");
  w(`   WHERE m.congress = ${r.congress} AND m.chamber = ${q(r.chamber)} AND m.number = ${q(r.number)}`);
  w(`     AND mi.issue_key = ${q(r.key)} AND mi.is_primary;`);
  w("  IF n_refused <> 0 THEN");
  w(`    RAISE EXCEPTION '${LABEL}: ${r.key} was MEASURED AND REFUSED as a primary-lane promote on ${r.number} (${r.congress}) and now reads primary. The argument it contradicts: ${String(r.note).replace(/'/g, "''")}';`);
  w("  END IF;");
}
for (const r of REFUSED_NEW_ROWS) {
  w("  SELECT count(*) INTO n_refused FROM vr_measure_issues");
  w(`   WHERE measure_id = m_id AND issue_key = ${q(r.key)};`);
  w("  IF n_refused <> 0 THEN");
  w(`    RAISE EXCEPTION '${LABEL}: ${r.key} was READ AND REFUSED as a new row on ${P.number} and now carries % row(s). The argument it contradicts: ${String(r.note).replace(/'/g, "''")}', n_refused;`);
  w("  END IF;");
}
w("END $$;");
w();

process.stdout.write(out.join("\n"));
