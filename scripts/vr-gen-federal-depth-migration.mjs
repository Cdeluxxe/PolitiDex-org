#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-federal-depth-migration.mjs
// ---------------------------------------------------------------------------
// Turns db/vr-federal-depth-vote-seed.json plus the matching rows in
// db/vr-issue-seed.json into a forward-only migration for wave F1: the 119th
// Congress's STANDALONE instruments on three issue axes the formal pattern index
// could not read for a single member of Utah's federal delegation.
//
//   node scripts/vr-gen-federal-depth-migration.mjs > netlify/database/migrations/<ts>_vr_federal_formal_depth_f1.sql
//
// WHY THESE FOUR, AND WHY A SENATE AMENDMENT IS ONE OF THEM
// --------------------------------------------------------
// scripts/vr-federal-fpi.mjs --set utah --why reported 27 unread formal-index rows
// across the seven rostered Utah federal members, and every one of them carried
// the same reason id: `vehicle_only`. That reason has a precise meaning in
// consistency.js — every instrument the member met on that key was a package, so
// the engine will not name a direction, because a vote on a package is not a vote
// on any one of its subjects. The answer to vehicle_only is not another omnibus
// and not a heavier mapping on an existing one: it is a STANDALONE contested
// instrument, in the chamber the blocked member actually sits in. That is why one
// of the four selections is a Senate amendment rather than a fourth House bill —
// congress_oversight was blocked for five of the seven, two of them senators, and
// the 119th Senate's only standalone floor test of inspector-general machinery is
// an amendment offered during vote-a-rama.
//
//   H.R. 5408  Faster Labor Contracts Act — econ_workers, blocked for 5 members
//   H.J.Res. 131  ANWR leasing ROD disapproval (P.L. 119-52) — lands_energy, 2
//   S.Amdt. 3535  Fed/CFPB inspector general confirmation — congress_oversight, 5
//   H.R. 1069  PROTECT Our Kids Act — already attributed, DELIBERATELY UNMAPPED
//
// THE FOURTH MEASURE ADDS NO MAPPING, ON PURPOSE
// ----------------------------------------------
// H.R. 1069 is in this migration for one field. Its roll (house 119/1/313) is
// already live with all 109 rostered member votes — re-fetched from the Clerk and
// checked row by row for this pass, agreeing on position AND on the party flag,
// with no rostered member missing — and its status reads 'pending' although the
// bill passed the House 247-164 and went to the Senate. That one field is
// corrected. Nine candidate issue keys were read and all nine refused, in writing,
// in db/vr-federal-mapping-seed-f1.json: the bill conditions a federal K-12 grant
// on not partnering with a PRC-funded institute, and the vocabulary has no key for
// foreign influence in domestic institutions. The refusal is not inherited from
// the earlier note either. Runbook rule 27 requires re-reading a refusal when the
// taxonomy moves, and the re-read REINFORCES it: alignment-tool.js's August 2026
// narrowing of america_first says in terms that cards about countering China were
// removed because "the chip never mentioned" it. The verification block asserts
// this measure carries ZERO mappings, so a later pass cannot quietly add one
// without also arguing with this file.
//
// SHAPE, AND WHY EACH PART IS SHAPED THAT WAY
// -------------------------------------------
//   · THREE MEASURES ARE NEW AND ONE MUST ALREADY EXIST. A measure marked
//     `mustExist` is LOOKED UP and never inserted; if it is gone the migration
//     RAISES rather than quietly creating a second description of the same bill.
//   · EVERY lookup keys on measure_type, congress, chamber AND number. Not
//     boilerplate: the corpus holds a 117th-Congress H.R. 1 and H.R. 4 whose
//     subjects are nothing like the 119th's, so number alone is not an identity.
//   · S.Amdt. 3535 CARRIES A parent_id. It is a second-degree amendment to the
//     FY2026 NDAA (S.Amdt. 3535 to S.Amdt. 3748 to S. 2296) and the pack renders
//     an amendment against its parent. The parent is looked up, never created, and
//     the migration raises if it is missing rather than filing an orphan.
//   · ROLL CALLS AND MEMBER VOTES are ON CONFLICT DO NOTHING on the tuples the
//     tables are unique on, so the one already-live roll keeps its own row and
//     wording and simply cannot be disturbed.
//   · ISSUE ROWS come verbatim from db/vr-issue-seed.json — rationale plus an
//     https primary source on every row, which scripts/test-mapping-discipline.mjs
//     requires — and their reasoning, including every refusal, lives in
//     db/vr-federal-mapping-seed-f1.json.
//   · THE STATUS FIX IS GUARDED ON THE OLD VALUE. `WHERE status = 'pending'`
//     means a re-run is a no-op and a later, better-informed status set by someone
//     else is not overwritten (runbook rule 21).
//
// ROW SCOPE IS STATED AS DATA, NOT INFERRED
// -----------------------------------------
// PASS_ROLLS below is the frozen list of the five rolls this migration published.
// A generator whose output silently widens over its own applied migration invites
// exactly the mistake the runbook forbids — regenerating a file the database has
// already run — so a later roll added to the seed is NOT picked up here and gets
// its own forward migration. The seed's narrative fields DO track the seed, so a
// re-run reflects a later correction to the prose while the row scope stays frozen.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-federal-depth-vote-seed.json";
const DECISION_PATH = "db/vr-federal-mapping-seed-f1.json";
const seedFile = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const decision = JSON.parse(fs.readFileSync(path.join(ROOT, DECISION_PATH), "utf8"));
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-member-map.json"), "utf8"));
// The orphan-cell verification below pins the roster this migration was reviewed against.
// Later roster waves admit more slugs, and regenerating against the grown map would rewrite
// the bytes of a file that has already run. So waves admitted AFTER this migration are
// excluded by name, the same way f2, f3 and f8 exclude theirs. Two of these (f6, f8) already
// post-dated this file; federal_roster_r1_sep2026 admits 315 sitting House members at once,
// because the House corpus held 7,298 recorded positions the fail-closed ingest had to skip
// for want of a roster slug. This list restores byte-for-byte reproducibility — it does not
// change the applied SQL, which is immutable.
const ROSTER_WAVES_ADMITTED_AFTER_THIS_MIGRATION = [
  "federal_wave_f6_aug2026",
  "federal_wave_f8_aug2026",
  "federal_roster_r1_sep2026",
];
const rosterAdmitted = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-roster-admitted.json"), "utf8"));
const excludedSlugs = new Set();
for (const wave of ROSTER_WAVES_ADMITTED_AFTER_THIS_MIGRATION) {
  const slugs = rosterAdmitted.waves?.[wave];
  if (!Array.isArray(slugs)) {
    throw new Error(`roster wave '${wave}' is named as post-dating this migration but is not an array in db/vr-roster-admitted.json.`);
  }
  slugs.forEach((x) => excludedSlugs.add(x));
}
const ROSTER = [...new Set(Object.values(memberMap.map || {}))].filter((x) => !excludedSlugs.has(x)).sort();

// ── the five rolls, and which of them this pass CREATED ──────────────────────
// `fresh: true` means the roll did not exist before this migration. It drives the
// header's idempotency paragraph and the orphan check in the verification block,
// which is scoped to fresh rolls only: the one pre-existing roll holds member
// votes an earlier attribution path wrote, and failing on those would be failing
// on somebody else's data.
const PASS_ROLLS = new Map([
  ["senate|119|1|563", { fresh: true, why: "On the Amendment S.Amdt. 3535, 53-43 against a three-fifths threshold — a majority position recorded as a defeat. NEW measure and NEW roll: the 119th Senate had no standalone instrument on congressional oversight in the record at all." }],
  ["house|119|1|295", { fresh: true, why: "On Passage of H.J.Res. 131, 217-209. NEW measure and NEW roll." }],
  ["house|119|1|313", { fresh: false, why: "On Passage of H.R. 1069, 247-164. ALREADY LIVE with all 109 rostered member votes, verified against the Clerk's XML for this pass and left exactly as it stands. Re-emitted so the top-up is a stated no-op rather than an omission." }],
  ["senate|119|1|632", { fresh: true, why: "On the Joint Resolution H.J.Res. 131, 49-45 — the Senate half of the CRA disapproval, and the reason lands_energy can be read for a senator at all. NEW roll." }],
  ["house|119|2|216", { fresh: true, why: "On Passage of H.R. 5408, 230-193 with the parties inverted (D 210-0, R 20-192). NEW measure and NEW roll." }],
  // The primary-wall repair. Both measures are ALREADY LIVE and ALREADY MAPPED
  // gov_regulation w100 PRIMARY; what was missing was the votes themselves.
  ["house|119|1|71", { fresh: true, why: "On Passage of H.J.Res. 25, 292-132. NEW roll on an EXISTING, already-mapped measure: this CRA disapproval became P.L. 119-5 and the record carried NO roll call for it at all, in either chamber." }],
  ["senate|119|1|151", { fresh: true, why: "On the Joint Resolution H.J.Res. 25, 70-28. NEW roll. Half of the reason a senator can hold a gov_regulation PRIMARY act at all — see the primary-wall note in the header." }],
  ["senate|119|1|153", { fresh: true, why: "On the Joint Resolution S.J.Res. 18, 52-48. NEW roll. The record held the HOUSE passage roll for a SENATE joint resolution and not the Senate's own; this is the sponsoring chamber's decisive vote, and it became P.L. 119-10." }],
]);
const rkey = (v) => `${v.chamber}|${v.congress}|${v.session}|${v.rollNumber}`;
const passVotes = (seedFile.votes || []).filter((v) => PASS_ROLLS.has(rkey(v)));
const seed = {
  ...seedFile,
  votes: passVotes,
  rollCallCount: passVotes.length,
  memberVoteCount: passVotes.reduce((n, v) => n + (v.memberVotes || []).length, 0),
};
if (passVotes.length !== PASS_ROLLS.size) {
  throw new Error(
    `${SEED_PATH} no longer carries all ${PASS_ROLLS.size} rolls this migration published `
    + `(found ${passVotes.length}) — the applied file cannot be reproduced from it.`
  );
}
const freshRolls = [...PASS_ROLLS.entries()].filter(([, m]) => m.fresh).map(([k]) => k.split("|"));
const liveRolls = [...PASS_ROLLS.entries()].filter(([, m]) => !m.fresh).map(([k]) => k.split("|"));

// The seed's politician_id is a cached map lookup, not a source. Refuse to
// generate from a seed whose (bioguideId → politicianId) pairs the map contradicts.
const pidCheck = assertSeedPidsMatchMap(seed, memberMap, SEED_PATH);

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null || s === "" ? "NULL" : q(s));
const num = (n) => n.toLocaleString("en-US");
const varName = (m) => `m_${m.congress}_${String(m.number).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
const ikey = (congress, chamber, number) =>
  `${congress}|${chamber}|${String(number || "").toLowerCase().replace(/[.\s]/g, "")}`;

const issueIndex = new Map((issueSeed.measures || []).map((m) => [ikey(m.congress, m.chamber, m.number), m]));
const issuesFor = (m) => {
  const e = issueIndex.get(ikey(m.congress, m.chamber, m.number));
  return e ? { issues: e.issues || [], sourceUrl: e.sourceUrl || null, note: e._note || null } : { issues: [], sourceUrl: null, note: null };
};
const decisionIndex = new Map((decision.measures || []).map((m) => [ikey(m.congress, m.chamber, m.number), m]));
const decisionFor = (m) => decisionIndex.get(ikey(m.congress, m.chamber, m.number)) || null;

// ── measures in emission order: the parent first, then lookups, then creates ──
// The parent is not a selection and has no roll in this pass; it exists here only
// so S.Amdt. 3535 can be filed against it.
const measures = [];
const seenMeasure = new Set();
for (const v of seed.votes) {
  const m = v.measure;
  const k = ikey(m.congress, m.chamber, m.number);
  if (seenMeasure.has(k)) continue;
  seenMeasure.add(k);
  measures.push({ ...m, var: varName(m) });
}
measures.sort((a, b) => Number(!!a.create) - Number(!!b.create));
const PARENTS = [];
for (const m of measures) {
  const p = m.create && m.create.parent ? m.create.parent : null;
  if (!p) continue;
  const k = ikey(p.congress, p.chamber, p.number);
  if (seenMeasure.has(k)) continue;
  seenMeasure.add(k);
  PARENTS.push({ ...p, var: varName(p), forChild: m.number });
}

// ── the one field correction this pass makes ─────────────────────────────────
// Stated as data so the header, the UPDATE and the verification block cannot
// drift apart, and guarded on the old value so a re-run writes nothing.
const STATUS_FIXES = [{
  number: "H.R. 1069", from: "pending", to: "passed_house",
  why: "The bill passed the House 247-164 on 2025-12-04 and was received in the Senate and "
     + "referred to the HELP Committee the same day. This record spells that posture "
     + "'passed_house' — H.R. 1048 is filed that way for exactly the same posture — and "
     + "'pending' reads on a profile as though the House never voted, on a bill whose roll is "
     + "already live with 109 attributed members.",
}, {
  number: "S.J.Res. 18", from: "pending", to: "enacted",
  why: "The row contradicts itself: status reads 'pending' while external_ids on the same row "
     + "already records laws ['Public Law 119-10'], and Congress.gov's latest action for the "
     + "measure is 'Became Public Law No: 119-10.' dated 2025-05-09. This record spells that "
     + "posture 'enacted' — H.J.Res. 25 and H.J.Res. 131 are both filed that way — and the "
     + "resolution is now gaining its Senate passage roll in the same migration, so leaving the "
     + "status behind would publish a profile that shows a member voting to pass a measure the "
     + "record still calls pending.",
}];

const out = [];
const w = (s = "") => out.push(s);
const wrap = (text, prefix = "-- ", cont = null) => {
  const contPrefix = cont == null ? prefix : cont;
  let line = "";
  let first = true;
  for (const word of String(text).replace(/\s+/g, " ").trim().split(" ")) {
    if (line && (line + " " + word).length > 86) {
      w((first ? prefix : contPrefix) + line);
      first = false;
      line = word;
    } else line = line ? line + " " + word : word;
  }
  if (line) w((first ? prefix : contPrefix) + line);
};
const wrapBullet = (text) => wrap("· " + text, "-- ", "--   ");

const KEYS = [...new Set(measures.flatMap((m) => issuesFor(m).issues.map((i) => i.issueKey)))].sort();
const keyRows = (key) => measures.reduce((n, m) => n + issuesFor(m).issues.filter((i) => i.issueKey === key).length, 0);
const totalIssueRows = measures.reduce((n, m) => n + issuesFor(m).issues.length, 0);
// Split so the header can say what this pass WROTE versus what it merely re-states.
const newIssueRows = () => measures.reduce((n, m) => n + (alreadyLive(m) ? 0 : issuesFor(m).issues.length), 0);
const liveIssueRows = () => totalIssueRows - newIssueRows();
const newMeasures = measures.filter((m) => m.create);
const existingMeasures = measures.filter((m) => !m.create);
const unmapped = measures.filter((m) => !issuesFor(m).issues.length);
const sVar = (number) => "s_" + String(number).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
// Measures whose mappings were already live before this pass. They are re-emitted under
// ON CONFLICT DO NOTHING so the migration states them, and they are NOT counted as rows
// this pass added — the header would otherwise claim credit for somebody else's writing.
const MAPPINGS_ALREADY_LIVE = new Set(["H.J.Res. 25", "S.J.Res. 18"]);
const alreadyLive = (m) => MAPPINGS_ALREADY_LIVE.has(m.number);
const refusedRows = (decision.measures || []).reduce((n, m) => n + (m.issues || []).filter((i) => i.decision === "REFUSED").length, 0);

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Federal formal depth, wave F1 — H.R. 5408, H.J.Res. 131, S.Amdt. 3535, H.R. 1069,");
w("--   H.J.Res. 25, S.J.Res. 18");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-federal-depth-migration.mjs from");
w(`-- ${SEED_PATH}, db/vr-issue-seed.json and ${DECISION_PATH}.`);
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${num(seed.votes.length)} roll calls (${freshRolls.length} new, ${liveRolls.length} already live) · ${num(seed.memberVoteCount)} attributed member votes`);
w(`-- ${newMeasures.length} measures created · ${existingMeasures.length} looked up · ${PARENTS.length} parent looked up for an amendment`);
w(`-- ${newIssueRows()} issue mapping(s) ADDED across ${KEYS.length} key(s): ${KEYS.join(", ")}`);
w(`-- ${liveIssueRows()} mapping(s) on this pass's measures were ALREADY LIVE and are re-stated, never rewritten`);
w(`-- ${refusedRows} candidate mapping(s) READ AND REFUSED in writing — see ${DECISION_PATH}`);
w(`-- ${STATUS_FIXES.length} field correction · 0 rationale rewritten · 0 existing row re-described`);
w("--");
w("-- WHAT THIS PASS IS ANSWERING");
wrap("scripts/vr-federal-fpi.mjs --set utah --why reported 27 unread formal-index rows across "
  + "the seven rostered Utah federal members, and every single one carried the same reason id: "
  + "`vehicle_only`. In consistency.js that means the member met the issue ONLY inside a "
  + "package, so the engine refuses to name a direction — a vote on an omnibus is not a vote "
  + "on any one of its subjects. The fix for vehicle_only is not a heavier mapping on an "
  + "existing bill and not another omnibus: it is a standalone contested instrument, in the "
  + "chamber the blocked member sits in. The three heaviest blocked keys were "
  + "congress_oversight (5 of 7 members), econ_workers (5) and lands_energy (2), and the three "
  + "mapped measures below answer them one for one. congress_oversight is why one selection is "
  + "a Senate amendment: two of its five blocked members are senators, and the 119th Senate's "
  + "only standalone floor test of inspector-general machinery is an amendment offered during "
  + "vote-a-rama.");
w("--");
w("-- THE FOURTH MEASURE ADDS NO MAPPING, ON PURPOSE");
wrap("H.R. 1069 is here for one field. Nine candidate keys were read and nine refused, in "
  + "writing: the bill conditions a federal K-12 grant on not partnering with a PRC-funded "
  + "institute, and this vocabulary has no key for foreign influence in domestic institutions. "
  + "The refusal is not inherited — runbook rule 27 requires re-reading a refusal when the "
  + "taxonomy moves, and the re-read REINFORCES it, because alignment-tool.js's August 2026 "
  + "narrowing of america_first states that cards about countering China were removed since "
  + "'the chip never mentioned' it. The verification block asserts this measure carries ZERO "
  + "mappings, so a later pass cannot quietly add one without arguing with this file first.");
for (const m of unmapped) {
  const d = decisionFor(m);
  if (!d) continue;
  for (const i of (d.issues || []).filter((x) => x.decision === "REFUSED")) wrapBullet(`${m.number} — ${i.issueKey} NOT mapped: ${i.why}`);
}
w("--");
w("-- THE PRIMARY WALL — WHY TWO ALREADY-MAPPED MEASURES ARE IN A DEPTH PASS");
wrap(seed.primaryWallFinding || "");
wrap("So H.J.Res. 25 and S.J.Res. 18 are here for their VOTES and for nothing else. Neither "
  + "gains a mapping, neither loses one, and neither has a rationale touched. H.J.Res. 25 gains "
  + "both of its decisive rolls (House 119/1/71, 292-132 and Senate 119/1/151, 70-28), because "
  + "an enacted law with no attributed vote anywhere in the record is a hole on its face. "
  + "S.J.Res. 18 gains the one its own chamber took (Senate 119/1/153, 52-48) and gains a status "
  + "correction, because the record held the HOUSE passage roll for a SENATE joint resolution "
  + "and called a public law pending. The verification block turns the whole argument into a "
  + "number: it counts the Senate roll calls sitting on a gov_regulation PRIMARY measure and "
  + "fails below two. Before this migration that count was ZERO, which is the entire reason a "
  + "fourth honest secondary could make 76 senators read as though the issue were not theirs.");
w("--");
w("-- THE ENACTED-LAW TIER");
wrap(seed.enactedLawFinding);
w("--");
w("-- WHAT WAS SCANNED");
wrap(seed.scanCoverage);
w("--");
w("-- WHERE A ROLL'S OWN ARITHMETIC LIMITS WHAT IT CAN TEST");
for (const c of seed.marginCaveats || []) wrapBullet(`${c.roll} — ${c.caveat}`);
w("--");
w("-- ISSUE AXES DECLINED, AND WHY");
wrap("A mapping attaches to the MEASURE, so every axis added here is applied at full strength "
  + "to each of that measure's rolls and to every attributed member. That is the test each "
  + `candidate axis had to survive, and it is why ${measures.length} measures yield only `
  + `${newIssueRows()} new rows and ${refusedRows} written refusals. The drafting bench `
  + "(scripts/vr-mapping-draft.mjs) decided NOTHING: it emitted six UNDECIDED candidates with "
  + "null in all three judgement fields, of which one was accepted, and it REFUSED to draft two "
  + "of the mapped measures at all — the resolution family by runbook rule 2 and the amendment "
  + "family by rule 4 — so both were read by hand against the text they act on. H.J.Res. 25 and "
  + "S.J.Res. 18 were never put to the bench: they arrive already mapped by an earlier pass, "
  + "this one re-read those mappings and left them alone, and the axes below are the ones "
  + "declined on the measures this pass actually mapped. These did not survive:");
for (const d of seed.declinedFacets || []) {
  wrapBullet(`${d.measure}${d.facet ? ` — ${d.facet} NOT mapped: ` : " — "}${d.why}`);
}
w("--");
w("-- ROLL CALLS CONSIDERED AND DECLINED");
for (const d of seed.declinedRollCalls || []) {
  const where = [d.chamber, d.congress && d.session ? `${d.congress}/${d.session}` : null, d.roll ? `roll ${d.roll}` : null]
    .filter(Boolean).join(" ");
  wrapBullet(`${d.number}${where ? ` ${where}` : ""} (${d.totals}) — ${d.why}`);
}
w("--");
w("-- ATTRIBUTION IS FAIL-CLOSED");
wrap("House rolls attribute on the bioguide id in the Clerk's XML against db/vr-member-map.json "
  + "— a direct lookup, and an unmapped member is skipped and counted, never guessed. Senate "
  + "XML carries no bioguide id, so a senator resolves on (surname, state) against the roster "
  + "and only a UNIQUE hit is accepted; an ambiguous match is counted and skipped, and this "
  + "pass had none. totals is the FULL chamber tally and is_party is computed from the full "
  + "recorded vote BEFORE the roster filter, so a partial roster cannot invent a margin or a "
  + "party crossover. Every roll is re-verified against the chamber's own document before "
  + "ingest: <legis-num> for the House, document_type plus document_number for a Senate bill or "
  + "joint resolution, and amendment_number plus amendment_to_document_number plus a NON-EMPTY "
  + "amendment_purpose for a Senate amendment roll — that last one because senate.gov leaves "
  + "<document_number> empty on an amendment vote, so the citation has to be read from the "
  + "amendment fields or not at all. House verification deliberately IGNORES <vote-desc>, which "
  + "the Clerk abbreviates freely, and the House grand total is read from the LAST "
  + "<totals-by-vote> block because the Clerk emits one per party first.");
w("--");
w("-- IDEMPOTENCY, STATED PER ROLL");
wrap(`Every write is guarded and a re-run is a no-op. ${liveRolls.length} of the ${PASS_ROLLS.size} rolls is already `
  + "live, and ON CONFLICT DO NOTHING on (chamber, congress, session, roll_number) means its "
  + "existing row — including its question text — is untouched while its member votes are "
  + "topped up through ON CONFLICT DO NOTHING on (rollcall_id, politician_id). The one field "
  + "correction is guarded on the old value, so it writes once and never fights a later, "
  + "better-informed status.");
for (const [k, meta] of PASS_ROLLS) {
  const [ch, c, s, r] = k.split("|");
  wrapBullet(`${ch} ${c}/${s} roll ${r} — ${meta.fresh ? "NEW" : "already live"}. ${meta.why}`);
}
w("-- ---------------------------------------------------------------------------");
w();
w("DO $$");
w("DECLARE");
for (const m of [...PARENTS, ...measures]) w(`  ${m.var} integer;`);
w("  rc integer;");
w("BEGIN");
w();

// ── measures ────────────────────────────────────────────────────────────────
w("  -- ── measures ──────────────────────────────────────────────────────────────");
w("  -- Every lookup keys on measure_type, congress, chamber AND number: the corpus also holds");
w("  -- a 117th-Congress H.R. 1 and H.R. 4 whose subjects are nothing like the 119th's, so a");
w("  -- number alone is not an identity.");
w();
for (const p of PARENTS) {
  w(`  -- ${p.number} (${p.congress}th ${p.chamber}) — parent of ${p.forChild}, looked up and NEVER created.`);
  for (const line of wrapLocal("An amendment is rendered against its parent, so parent_id has to resolve. "
    + "If the parent is missing the migration raises rather than filing an orphan amendment: "
    + "inventing a replacement parent would put a second description of the FY2026 NDAA in the "
    + "record, and the pack would render the amendment against the wrong bill.")) w(`  --   ${line}`);
  w(`  SELECT id INTO ${p.var} FROM vr_measures`);
  w(`   WHERE measure_type = ${q(p.measureType)} AND congress = ${p.congress}`);
  w(`     AND chamber = ${q(p.chamber)} AND number = ${q(p.number)} LIMIT 1;`);
  w(`  IF ${p.var} IS NULL THEN`);
  w(`    RAISE EXCEPTION ${q(`Federal depth F1: parent measure ${p.number} (${p.congress}th ${p.chamber}) is not in `
    + `vr_measures, so ${p.forChild} cannot be filed against it. It is never created here.`)};`);
  w("  END IF;");
  w();
}
for (const m of measures) {
  const c = m.create || null;
  const title = (c && c.title) || m.title;
  w(`  -- ${m.number} (${m.congress}th ${m.chamber})${title ? " — " + title : ""}`);
  if (m.mustExist) for (const line of wrapLocal(m.mustExist)) w(`  --   ${line}`);
  if (c && c.parent) for (const line of wrapLocal(`Filed with parent_id = ${c.parent.number}, resolved above.`)) w(`  --   ${line}`);
  w(`  SELECT id INTO ${m.var} FROM vr_measures`);
  w(`   WHERE measure_type = ${q(m.measureType)} AND congress = ${m.congress}`);
  w(`     AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  if (c) {
    const pv = c.parent ? varName(c.parent) : null;
    w(`  IF ${m.var} IS NULL THEN`);
    w("    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, parent_id, introduced_at, status, source_url, source_label, external_ids)");
    w(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(c.title)}, ${qOrNull(c.shortTitle)},`);
    w(`      ${q(c.summary)},`);
    w(`      ${pv || "NULL"}, ${c.introducedAt ? `DATE ${q(c.introducedAt)}` : "NULL"}, ${q(c.status)}, ${q(c.sourceUrl)}, ${q(c.sourceLabel)}, ${q(JSON.stringify(c.externalIds))}::jsonb)`);
    w(`    RETURNING id INTO ${m.var};`);
    w("  END IF;");
  } else {
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`Federal depth F1: ${m.number} (${m.congress}th ${m.chamber}) is not in `
      + "vr_measures — it is expected to exist and is never created here.")};`);
    w("  END IF;");
  }
  const fix = STATUS_FIXES.find((f) => f.number === m.number);
  if (fix) {
    w();
    w(`  -- FIELD CORRECTION — status ${q(fix.from)} → ${q(fix.to)}`);
    for (const line of wrapLocal(fix.why)) w(`  --   ${line}`);
    for (const line of wrapLocal(`Guarded on the old value, so a re-run writes nothing and a later, better-informed `
      + `status set by someone else is not overwritten (runbook rule 21). Nothing else on this row is touched: `
      + `not the title, not the summary, not the source, and no mapping is added.`)) w(`  --   ${line}`);
    w(`  UPDATE vr_measures SET status = ${q(fix.to)}`);
    w(`   WHERE id = ${m.var} AND status = ${q(fix.from)};`);
  }
  w();
}

// ── roll calls and member votes ─────────────────────────────────────────────
w("  -- ── roll calls and member votes ───────────────────────────────────────────");
for (const v of seed.votes) {
  const mv = varName(v.measure);
  const meta = PASS_ROLLS.get(rkey(v));
  const pt = Object.entries(v.partyTotals || {}).map(([p, t]) => `${p} ${t.yea}-${t.nay}`).join(", ");
  w(`  -- ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} · ${v.measure.number} · ${v.question}`);
  w(`  --   ${v.totals.yea}-${v.totals.nay}${v.totals.present ? `, ${v.totals.present} present` : ""}${v.totals.notVoting ? `, ${v.totals.notVoting} not voting` : ""} (${pt}) · ${v.result}${v.requiredMajority && v.requiredMajority !== "simple" ? ` · ${v.requiredMajority} threshold` : ""}`);
  w(`  --   ${v.memberVotes.length} of ${v.chamberVoting} recorded members are on the roster; ${v.rosterSkipped} skipped as unmapped`
    + `${v.rosterAmbiguous ? `, ${v.rosterAmbiguous} skipped as an ambiguous surname match` : ""}`);
  w(`  --   ${meta.fresh ? "NEW roll." : "Already live — the roll's own row is left alone and its member votes are topped up."}`);
  if (v.admittedAs && v.decisiveWhy) {
    for (const line of wrapLocal(`ADMITTED AS ${v.admittedAs}: ${v.decisiveWhy}`)) w(`  --   ${line}`);
  }
  if (v.voteDesc && v.voteDesc !== v.measure.title) w(`  --   chamber vote description reads "${v.voteDesc}"`);
  w(`  --   ${v.xmlUrl}`);
  w("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
  w(`  VALUES (${mv}, ${q(v.chamber)}, ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${q(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)},`);
  w(`    ${q(JSON.stringify({ yea: v.totals.yea, nay: v.totals.nay, present: v.totals.present, notVoting: v.totals.notVoting, byParty: v.partyTotals }))}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  w("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
  w("  SELECT id INTO rc FROM vr_rollcalls");
  w(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  w("  IF rc IS NULL THEN");
  w(`    RAISE EXCEPTION ${q(`Federal depth F1: ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} could not be read back after insert.`)};`);
  w("  END IF;");
  w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  w(v.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}

// ── issue mappings ──────────────────────────────────────────────────────────
w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json, with the rationale and a primary source on every row");
w("  -- — scripts/test-mapping-discipline.mjs requires both — and argued in");
w(`  -- ${DECISION_PATH}, which also records every refusal. ON CONFLICT`);
w("  -- (measure_id, issue_key) DO NOTHING, so a re-emission cannot rewrite a rationale.");
w();
let mappedRows = 0;
for (const m of measures) {
  const { issues, sourceUrl, note } = issuesFor(m);
  const d = decisionFor(m);
  if (!issues.length) {
    w(`  -- ${m.number} (${m.congress}th): NO MAPPING, and that is the decision rather than a gap.`);
    if (d) for (const line of wrapLocal(d.outcome || "")) w(`  --   ${line}`);
    for (const line of wrapLocal(`Every candidate key is refused in writing in ${DECISION_PATH}, and the `
      + "verification block below asserts this measure carries zero mapped rows. A mapping is never "
      + "invented at generation time, and a measure the record has decided to leave unmapped is not "
      + "quietly mapped by the next pass that touches it.")) w(`  --   ${line}`);
    w();
    continue;
  }
  const facets = issues.map((i) => `${i.issueKey} ${i.supportMeaning} w${i.weight}${i.isPrimary ? " PRIMARY" : ""}`).join(", ");
  w(`  -- ${m.number} (${m.congress}th) — ${facets}`);
  if (alreadyLive(m)) {
    for (const line of wrapLocal("ALREADY LIVE. This pass adds no mapping to this measure and changes none: "
      + "the rows below are the ones already on the row, re-stated so the migration is a complete "
      + "description of what the measure carries once its roll calls land. ON CONFLICT DO NOTHING "
      + "means every one is a no-op, and the live rationale stays the first writer's (runbook rule "
      + "21). What this pass gives the measure is the votes, not the reading.")) w(`  --   ${line}`);
  }
  if (note) for (const line of wrapLocal(note)) w(`  --   ${line}`);
  if (d) {
    const refused = (d.issues || []).filter((i) => i.decision === "REFUSED").map((i) => i.issueKey);
    if (refused.length) for (const line of wrapLocal(`Read and refused on this measure: ${refused.join(", ")}. The argument against each is in ${DECISION_PATH}.`)) w(`  --   ${line}`);
    for (const i of (d.issues || []).filter((x) => x.decision === "ACCEPTED" && x.backwardsRead)) {
      for (const line of wrapLocal(`BACKWARDS READ (rule 22), ${i.issueKey}: ${i.backwardsRead}`)) w(`  --   ${line}`);
    }
  }
  const rows = issues.map((i) => {
    mappedRows++;
    return `    (${m.var}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n`
      + `      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || sourceUrl)})`;
  });
  w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
  w(rows.join(",\n"));
  w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  w();
}
w("END $$;");
w();

// ── verification ────────────────────────────────────────────────────────────
const rollTuples = seed.votes.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);
const topUps = seed.votes.filter((v) => !PASS_ROLLS.get(rkey(v)).fresh).map((v) => ({ v, floor: v.memberVotes.length }));
// The four directions asserted by name. Each is a PRIMARY that answers one of the
// blocked keys, plus the amendment's parent link and the zero-mapping assertion.
const PRIMARIES = [];
for (const m of measures) {
  for (const i of issuesFor(m).issues) {
    // Assert only the PRIMARY rows this pass actually writes. A row that was already live
    // is verified by the aggregate count, not by a named assertion claiming this migration
    // landed it. gov_regulation is PRIMARY on two measures here, so the variable name has
    // to carry the measure too.
    if (i.isPrimary && !alreadyLive(m)) PRIMARIES.push({ m, i, v: `n_${i.issueKey}_${m.var}` });
  }
}

w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrap("Read-only, and scoped by tuple to exactly this pass's roll calls and measures so it can "
  + "only ever fail on data this migration is responsible for. A global count would drag in "
  + "every labour, lands and oversight mapping earlier passes wrote and stop meaning anything.");
w("--");
wrap("Counts assert >= for member votes, because the one already-live roll holds votes an "
  + "earlier attribution path wrote, some of them possibly for members this roster does not "
  + "carry. The orphan check is therefore scoped to the "
  + `${freshRolls.length} rolls this pass CREATED.`);
w("--");
wrap("Five assertions are specific rather than aggregate, because they are the five things this "
  + "pass exists to do. Three name a PRIMARY mapping and its direction, one per blocked key, so "
  + "a row that landed on the wrong measure or with the wrong polarity is caught rather than "
  + "averaged into a total. The fourth asserts S.Amdt. 3535's parent_id actually points at the "
  + "FY2026 NDAA, since an amendment with a null parent renders against nothing. The fifth "
  + "asserts H.R. 1069 carries EXACTLY ZERO mapped rows — the only way to make a deliberate "
  + "refusal testable, and a tripwire for any later pass that maps it without argument.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_issues integer;");
w("  n_unmapped integer;");
w("  n_parent integer;");
for (const f of STATUS_FIXES) w(`  ${sVar(f.number)} text;`);
w("  n_gr_senate integer;");
for (const p of PRIMARIES) w(`  ${p.v} integer;`);
for (const t of topUps) w(`  n_${t.v.chamber}${t.v.rollNumber} integer;`);
w("BEGIN");
w("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
w("    " + rollTuples.join(",\n    "));
w("  ), roll_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN want w");
w("      ON r.chamber = w.chamber AND r.congress = w.congress");
w("     AND r.session = w.session AND r.roll_number = w.roll_number");
w("  ), fresh (chamber, congress, session, roll_number) AS (VALUES");
w("    " + freshRolls.map(([ch, c, s, r]) => `('${ch}'::text, ${c}::integer, ${s}::integer, ${r}::integer)`).join(",\n    "));
w("  ), fresh_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN fresh f");
w("      ON r.chamber = f.chamber AND r.congress = f.congress");
w("     AND r.session = f.session AND r.roll_number = f.roll_number");
w("  ), mine (measure_type, congress, chamber, number) AS (VALUES");
w("    " + measures.map((m) => `(${q(m.measureType)}::text, ${m.congress}::integer, ${q(m.chamber)}::text, ${q(m.number)}::text)`).join(",\n    "));
w("  ), measure_ids AS (");
w("    SELECT m.id FROM vr_measures m JOIN mine k");
w("      ON m.measure_type = k.measure_type AND m.congress = k.congress");
w("     AND m.chamber = k.chamber AND m.number = k.number");
w("  )");
w("  SELECT (SELECT count(*) FROM roll_ids),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM fresh_ids)");
w("            AND v.politician_id NOT IN (");
w("              " + ROSTER.map((s) => q(s)).join(", "));
w("            )),");
w("         (SELECT count(*) FROM vr_measure_issues i WHERE i.measure_id IN (SELECT id FROM measure_ids)");
w(`            AND i.issue_key IN (${KEYS.map((k) => q(k)).join(", ")}))`);
w("    INTO n_rolls, n_votes, n_orphan, n_issues;");
w();
for (const p of PRIMARIES) {
  w(`  SELECT count(*) INTO ${p.v} FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id`);
  w(`   WHERE m.measure_type = ${q(p.m.measureType)} AND m.congress = ${p.m.congress} AND m.chamber = ${q(p.m.chamber)}`);
  w(`     AND m.number = ${q(p.m.number)} AND i.issue_key = ${q(p.i.issueKey)}`);
  w(`     AND i.is_primary AND i.support_meaning = ${q(p.i.supportMeaning)};`);
}
for (const m of unmapped) {
  w(`  SELECT count(*) INTO n_unmapped FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id`);
  w(`   WHERE m.measure_type = ${q(m.measureType)} AND m.congress = ${m.congress} AND m.chamber = ${q(m.chamber)} AND m.number = ${q(m.number)};`);
}
for (const f of STATUS_FIXES) {
  const m = measures.find((x) => x.number === f.number);
  w(`  SELECT status INTO ${sVar(f.number)} FROM vr_measures`);
  w(`   WHERE measure_type = ${q(m.measureType)} AND congress = ${m.congress} AND chamber = ${q(m.chamber)} AND number = ${q(m.number)};`);
}
// The primary wall, asserted as a number. Before this migration the answer was ZERO:
// gov_regulation's PRIMARY instruments were a House bill, a resolution with no roll at
// all, and a Senate joint resolution carrying only its House roll — so no senator could
// hold a PRIMARY act on the key, and a fourth secondary read as "Not about this issue".
w("  SELECT count(*) INTO n_gr_senate FROM vr_rollcalls r");
w("    JOIN vr_measure_issues i ON i.measure_id = r.measure_id");
w("   WHERE r.chamber = 'senate' AND i.issue_key = 'gov_regulation' AND i.is_primary;");
for (const p of PARENTS) {
  w(`  SELECT count(*) INTO n_parent FROM vr_measures child JOIN vr_measures par ON par.id = child.parent_id`);
  w(`   WHERE child.measure_type = 'amendment' AND child.congress = ${p.congress} AND child.number = ${q(p.forChild)}`);
  w(`     AND par.measure_type = ${q(p.measureType)} AND par.congress = ${p.congress} AND par.number = ${q(p.number)};`);
}
for (const t of topUps) {
  w(`  SELECT count(*) INTO n_${t.v.chamber}${t.v.rollNumber} FROM vr_member_votes v`);
  w("    JOIN vr_rollcalls r ON r.id = v.rollcall_id");
  w(`   WHERE r.chamber = ${q(t.v.chamber)} AND r.congress = ${t.v.congress} AND r.session = ${t.v.session}`);
  w(`     AND r.roll_number = ${t.v.rollNumber};`);
}
w();
w("  RAISE NOTICE 'Federal depth F1: % roll calls, % member votes, % issue mappings', n_rolls, n_votes, n_issues;");
for (const m of unmapped) w(`  RAISE NOTICE 'Federal depth F1: ${m.number} carries % mapped issue row(s)', n_unmapped;`);
for (const f of STATUS_FIXES) w(`  RAISE NOTICE 'Federal depth F1: ${f.number} status reads ''%''', ${sVar(f.number)};`);
w("  RAISE NOTICE 'Federal depth F1: % senate roll call(s) now sit on a measure carrying a gov_regulation PRIMARY mapping', n_gr_senate;");
for (const t of topUps) w(`  RAISE NOTICE 'Federal depth F1: ${t.v.chamber} ${t.v.congress}/${t.v.session} roll ${t.v.rollNumber} (${t.v.measure.number}) carries % attributed member votes', n_${t.v.chamber}${t.v.rollNumber};`);
w();
w(`  IF n_rolls <> ${seed.votes.length} THEN`);
w(`    RAISE EXCEPTION 'Federal depth F1: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
w("  END IF;");
w(`  IF n_votes < ${seed.memberVoteCount} THEN`);
w(`    RAISE EXCEPTION 'Federal depth F1: expected at least ${seed.memberVoteCount} member votes on these roll calls, found %', n_votes;`);
w("  END IF;");
w("  IF n_orphan > 0 THEN");
w("    RAISE EXCEPTION 'Federal depth F1: % member vote(s) on the rolls this pass created carry a politician_id outside db/vr-member-map.json', n_orphan;");
w("  END IF;");
w(`  IF n_issues < ${totalIssueRows} THEN`);
w(`    RAISE EXCEPTION 'Federal depth F1: expected at least ${totalIssueRows} issue mappings on this pass''s measures, found %', n_issues;`);
w("  END IF;");
for (const p of PRIMARIES) {
  w(`  IF ${p.v} <> 1 THEN`);
  w(`    RAISE EXCEPTION 'Federal depth F1: the ${p.i.issueKey} PRIMARY ${p.i.supportMeaning} row on ${p.m.number} (${p.m.congress}th) did not land (found % row(s))', ${p.v};`);
  w("  END IF;");
}
for (const p of PARENTS) {
  w("  IF n_parent <> 1 THEN");
  w(`    RAISE EXCEPTION 'Federal depth F1: ${p.forChild} is not filed against ${p.number} — parent_id does not resolve to the parent bill (found % row(s))', n_parent;`);
  w("  END IF;");
}
for (const m of unmapped) {
  w("  IF n_unmapped <> 0 THEN");
  w(`    RAISE EXCEPTION 'Federal depth F1: ${m.number} is deliberately unmapped and now carries % issue row(s). See ${DECISION_PATH} before adding one.', n_unmapped;`);
  w("  END IF;");
}
for (const f of STATUS_FIXES) {
  w(`  IF ${sVar(f.number)} <> ${q(f.to)} THEN`);
  w(`    RAISE EXCEPTION 'Federal depth F1: ${f.number} status is ''%'', expected ''${f.to}''', ${sVar(f.number)};`);
  w("  END IF;");
}
w("  IF n_gr_senate < 2 THEN");
w("    RAISE EXCEPTION 'Federal depth F1: the Senate holds only % decisive roll(s) on a gov_regulation PRIMARY measure. Below 2 the primary wall in stance-helpers.js reopens and 76 senators read as not-about-this-issue on a key they have voted four times.', n_gr_senate;");
w("  END IF;");
for (const t of topUps) {
  w(`  IF n_${t.v.chamber}${t.v.rollNumber} < ${t.floor} THEN`);
  w(`    RAISE EXCEPTION '${t.v.chamber} ${t.v.congress}/${t.v.session} roll ${t.v.rollNumber} (${t.v.measure.number}) lost member votes — only % on file, expected at least ${t.floor}', n_${t.v.chamber}${t.v.rollNumber};`);
  w("  END IF;");
}
w("END $$;");

// Local prose wrapper used inside the DO block, where the prefix is already indented.
function wrapLocal(text, width = 84) {
  const lines = [];
  let line = "";
  for (const word of String(text).replace(/\s+/g, " ").trim().split(" ")) {
    if (line && (line + " " + word).length > width) { lines.push(line); line = word; }
    else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

process.stdout.write(out.join("\n") + "\n");
process.stderr.write(
  `${seed.votes.length} rolls (${freshRolls.length} new, ${liveRolls.length} already live) · ${seed.memberVoteCount} member votes · `
  + `${measures.length} measures (${newMeasures.length} created, ${existingMeasures.length} looked up, ${PARENTS.length} parent) · `
  + `${newIssueRows()} issue rows added (+${liveIssueRows()} already live) across ${KEYS.length} keys (${KEYS.map((k) => `${k}:${keyRows(k)}`).join(", ")}) · `
  + `${refusedRows} refusals recorded · ${STATUS_FIXES.length} field correction · `
  + `${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
