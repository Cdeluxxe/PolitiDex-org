#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Federal wave F2 — standalone instruments for leftover vehicle_only holes
// ─────────────────────────────────────────────────────────────────────────────
// Folds db/vr-federal-wave-f2-vote-seed.json, db/vr-issue-seed.json and
// db/vr-federal-mapping-seed-f2.json into a forward-only migration.
//
// WHAT F2 IS FOR
// F1 attributed the 119th's rolls and cleared the gov_regulation primary wall for
// senators. What it left behind was a wall of `vehicle_only` and `incidental` rows:
// keys a member has only ever met as a provision inside somebody else's package, or
// as a pile of secondaries with no primary under them. The cure for vehicle_only is
// never a heavier mapping and never another omnibus. It is a STANDALONE, CONTESTED,
// SINGLE-SUBJECT instrument, in the chamber the blocked member actually sits in.
// This wave supplies three, and they are the only three the 119th offers:
//
//   · energy_production — senators were incidental, not vehicle_only, which is a
//     harder hole: they had four-plus secondary acts and no primary, so the wall in
//     stance-helpers.js printed "Not about this issue" on a key they had voted on
//     repeatedly. The fix is a Senate-reachable PRIMARY. S.J.Res. 10 and S.J.Res. 71
//     are it: privileged National Emergencies Act resolutions to terminate the
//     Executive Order 14156 energy emergency, one operative sentence each, 47-52 and
//     47-51 on the Senate floor.
//   · housing_build — 121 members met it only inside a vehicle. H.R. 6644 already
//     carries housing_build w100 PRIMARY and already has its House roll; what was
//     missing was the SENATE half of its own record. This migration adds no mapping
//     for it at all. It adds the roll: senate 119/2 roll 53, 89-10.
//
// AND ONE SUBTRACTION, WHICH IS THE HARDER HALF
// H.R. 1048 carries america_first w70 on a rationale about countering Chinese
// influence on U.S. campuses. In August 2026 the america_first chip was narrowed to
// one thing — what the United States funds and commits to abroad — and its scope note
// lists that exact ground in its OUT column by name. F1 queued this as follow-up 0e.
// A stale mapping keeps publishing while a stale refusal publishes nothing, so this
// migration DELETES the row, guarded on every field of the value it is removing, with
// its own argument attached (runbook rule 21: a change to a live reading needs an
// argument, not a silent rewrite).
//
// WHAT IT DELIBERATELY DOES NOT DO
//   · No key is added. H.R. 1069 stays unmapped and the verification block asserts it.
//   · No floor moves. _RD_MIN_PRIMARY stays 1; every row here earns its read.
//   · No package percentages, no reserve funds, no messaging amendments, no
//     near-unanimous theatre. 15 candidate roll calls were read and declined in
//     writing, including one — S.J.Res. 80, 52-45 — that would have been the fifth
//     non-primary row on energy_production and made the key measurably worse.
//
// INVARIANTS THIS FILE HOLDS
//   · TWO MEASURES ARE NEW, ONE MUST ALREADY EXIST. Creation is guarded on
//     `IF m_id IS NULL`, because federal (measure_type, congress, chamber, number)
//     carries no unique index — a bare INSERT would duplicate on re-run.
//   · EVERY lookup keys on measure_type, congress, chamber AND number.
//   · ROLL CALLS insert ON CONFLICT (chamber, congress, session, roll_number) DO
//     NOTHING, then read the id back and RAISE if it is null.
//   · MEMBER VOTES insert ON CONFLICT (rollcall_id, politician_id) DO NOTHING.
//   · ISSUE ROWS come from db/vr-issue-seed.json — rationale plus an https source on
//     every one, which scripts/test-mapping-discipline.mjs requires — and insert ON
//     CONFLICT (measure_id, issue_key) DO NOTHING, so a re-emission can never rewrite
//     a live rationale.
//   · THE DELETE is guarded on issue_key AND weight AND is_primary AND
//     support_meaning AND the exact rationale text. A re-run removes nothing. A later
//     pass that has rewritten the row keeps its work: this migration will not clobber
//     a reading it has not read.
//
//   node scripts/vr-gen-federal-wave-f2-migration.mjs \
//     > netlify/database/migrations/20261011000000_vr_federal_wave_f2.sql
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-federal-wave-f2-vote-seed.json";
const DECISION_PATH = "db/vr-federal-mapping-seed-f2.json";
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const seed = J(SEED_PATH);
const issueSeed = J("db/vr-issue-seed.json");
const decision = J(DECISION_PATH);
const memberMap = J("db/vr-member-map.json");
// THE APPLIED MIGRATION IS THE ARTIFACT, SO THIS GENERATOR HAS TO STAY REPRODUCIBLE.
// The roster list below is used for one thing: the verification block's NOT IN, which
// counts member votes on THIS wave's rolls that carry a politician_id outside the
// reviewed roster. It was frozen into the migration on the day it applied. Later ingest
// waves admit more slugs — F6 added eight House members who had no portrait to read a
// bioguide out of — and regenerating against the grown roster would rewrite the bytes of
// a file that has already run, which is why the wave harness compares the two. So waves
// admitted AFTER this migration are excluded by name. A later wave that adds roster
// slugs adds its wave key here; a key that is not in the roster file is a typo and
// throws rather than silently excluding nothing.
const ROSTER_WAVES_ADMITTED_AFTER_THIS_MIGRATION = ["federal_wave_f6_aug2026"];
const ROSTER = (() => {
  const waves = J("db/vr-roster-admitted.json").waves || {};
  const later = new Set();
  for (const key of ROSTER_WAVES_ADMITTED_AFTER_THIS_MIGRATION) {
    if (!Array.isArray(waves[key])) throw new Error(`no roster wave "${key}" in db/vr-roster-admitted.json`);
    for (const s of waves[key]) later.add(s);
  }
  return [...new Set(Object.values(memberMap.map || {}))].filter((s) => !later.has(s)).sort();
})();
const LABEL = "Federal wave F2";

const pidCheck = assertSeedPidsMatchMap(seed, memberMap, SEED_PATH);

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null || s === "" ? "NULL" : q(s));
const varName = (m) => `m_${m.congress}_${String(m.number).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
const ikey = (congress, chamber, number) => `${congress}|${chamber}|${number}`;

const issueIndex = new Map((issueSeed.measures || []).map((m) => [ikey(m.congress, m.chamber, m.number), m]));
const decisionIndex = new Map((decision.measures || []).map((m) => [ikey(m.congress, m.chamber, m.number), m]));
const decisionFor = (m) => decisionIndex.get(ikey(m.congress, m.chamber, m.number)) || null;

// PURE ATTRIBUTION. A measure whose decision entry declares liveMappedRowCount is one
// this wave attributes and deliberately does not map. db/vr-issue-seed.json holds curated
// rows for it from an EARLIER pass, and re-emitting them here would be wrong twice over:
// it would report the wave as adding mappings it did not decide, and it would put a
// second writer's INSERT on somebody else's rationale — harmless under ON CONFLICT DO
// NOTHING today, and exactly the habit runbook rule 21 exists to break. So the issue
// lookup returns nothing for these, and the verification block pins their row count
// instead of asserting rows landed.
const isPureAttribution = (m) => (decisionFor(m) || {}).liveMappedRowCount != null;
const issuesFor = (m) => {
  if (isPureAttribution(m)) return { issues: [], sourceUrl: null, note: null };
  const e = issueIndex.get(ikey(m.congress, m.chamber, m.number));
  return e ? { issues: e.issues || [], sourceUrl: e.sourceUrl || null, note: e._note || null } : { issues: [], sourceUrl: null, note: null };
};

// ── measures, lookups first then creates ────────────────────────────────────
const measures = [];
const seen = new Set();
for (const v of seed.votes) {
  const m = v.measure;
  const k = ikey(m.congress, m.chamber, m.number);
  if (seen.has(k)) continue;
  seen.add(k);
  measures.push({ ...m, var: varName(m) });
}
measures.sort((a, b) => Number(!!a.create) - Number(!!b.create));

// A retraction needs its measure resolved too, and it is not on any roll this pass
// carries — H.R. 1048's roll is already live. So it gets its own lookup, and it is
// NOT added to `measures`, because the aggregate mapping assertion counts rows this
// pass WRITES and this one only removes.
const RETRACTIONS = (decision.retractions || []).map((r) => ({
  ...r,
  measureType: r.measureType || "bill",
  chamber: r.chamber || "house",
  var: varName({ congress: r.congress, number: r.number }),
}));

const newMeasures = measures.filter((m) => m.create);
const existingMeasures = measures.filter((m) => !m.create);
const KEYS = [...new Set(measures.flatMap((m) => issuesFor(m).issues.map((i) => i.issueKey)))].sort();
const totalIssueRows = measures.reduce((n, m) => n + issuesFor(m).issues.length, 0);
const unmapped = measures.filter((m) => !issuesFor(m).issues.length);
const refusedRows = (decision.measures || []).reduce((n, m) => n + (m.issues || []).filter((i) => i.decision === "REFUSED").length, 0);

const out = [];
const w = (s = "") => out.push(s);
function wrapLocal(text, width = 84) {
  const lines = [];
  let line = "";
  for (const word of String(text).replace(/\s+/g, " ").trim().split(" ")) {
    if (line && (line + " " + word).length > width) { lines.push(line); line = word; } else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}
const wrapAll = (text, prefix = "-- ", cont = null) => {
  const ls = wrapLocal(text, 84);
  ls.forEach((line, i) => w((i === 0 ? prefix : (cont ?? prefix)) + line));
};
const bullet = (text) => wrapAll(text, "-- · ", "--   ");

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w(`-- ${LABEL} — ${measures.map((m) => m.number).join(", ")}`);
w("-- ---------------------------------------------------------------------------");
w(`-- Generated by scripts/vr-gen-federal-wave-f2-migration.mjs from`);
w(`-- ${SEED_PATH}, db/vr-issue-seed.json and ${DECISION_PATH}.`);
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${seed.votes.length} roll calls (all new) · ${seed.memberVoteCount} attributed member votes`);
w(`-- ${newMeasures.length} measures created · ${existingMeasures.length} looked up`);
w(`-- ${totalIssueRows} issue mapping(s) ADDED across ${KEYS.length} key(s): ${KEYS.join(", ")}`);
w(`-- ${RETRACTIONS.length} issue mapping(s) RETRACTED by guarded DELETE`);
w(`-- ${refusedRows} candidate mapping(s) READ AND REFUSED in writing · ${decision._counts.rollCallsDeclined} candidate roll call(s) declined across ${(decision.declinedRollCalls || []).length} written entries`);
w(`-- 0 keys added · 0 floors moved · _RD_MIN_PRIMARY untouched`);
w("--");
w("-- WHAT THIS PASS IS ANSWERING");
wrapAll("F1 cleared the gov_regulation primary wall and left a different wall standing. "
  + "scripts/vr-federal-fpi.mjs --set all --why reported 911 formal-index rows whose reason id was "
  + "`vehicle_only` — the member met the issue ONLY inside a package, so the engine refuses to name "
  + "a direction — and 3,084 reading `incidental`, which is the harder failure: four or more judged "
  + "acts on the key and not one of them a primary, so the wall in stance-helpers.js prints 'Not "
  + "about this issue' about a key the member has voted on repeatedly. Neither is curable by a "
  + "heavier mapping, and piling a fifth secondary on makes `incidental` worse rather than better. "
  + "The only cure is a standalone, contested, single-subject instrument in the chamber the blocked "
  + "member sits in. The 119th offers three and this migration lands all three.");
w("--");
bullet("energy_production, the incidental hole. Six senators held four-plus secondary acts and no "
  + "primary. S.J.Res. 10 and S.J.Res. 71 are privileged National Emergencies Act resolutions to "
  + "terminate the Executive Order 14156 energy emergency — one operative sentence each, no reserve "
  + "fund, no severable provision, rejected 47-52 and 47-51 on the Senate floor. Mapped w90 PRIMARY "
  + "yea_opposes, because EO 14156 is already in this record at w100 PRIMARY yea_supports and "
  + "terminating it withdraws exactly those authorities. energy_production incidental: 41 → 10.");
bullet("housing_build, the vehicle_only hole, and NO MAPPING IS ADDED FOR IT. H.R. 6644 already "
  + "carries housing_build w100 PRIMARY and already has its House roll. What the record was missing "
  + "was the Senate half of the measure's own vote — senate 119/2 roll 53, 89-10. Attribution, not "
  + "curation. housing_build vehicle_only: 121 → 26.");
bullet("america_first, the retraction. H.R. 1048's w70 row rests on countering Chinese influence on "
  + "U.S. campuses, and the chip's August 2026 scope note lists that ground in its OUT column by "
  + "name. F1 queued it as follow-up 0e. Removed by guarded DELETE. The measure keeps its "
  + "gov_transparency w100 PRIMARY, its edu_balance w55 and its roll; what goes is one non-primary "
  + "row on a key the vocabulary disowned.");
w("--");
w("-- THE COST, MEASURED AND NOT NETTED");
wrapAll("A densification wave owes one promise: no row the engine already characterised stops being "
  + "characterised. Checked directly on the row model's `read` flag over all 327 federal pids — not "
  + "on the shape counters, which can net out — this wave starts characterising 112 rows (7 strong, "
  + "24 mostly, 81 thin) and STOPS characterising 29. All 29 were the weakest tier and both causes "
  + "are named in " + DECISION_PATH + " under readLossDisclosure: 27 senators whose only "
  + "permitting_reform act was a nay on H.R. 3746 now hold one act each way and read `mixed_thin`, "
  + "and 2 representatives whose america_first record was carried by the retracted row. Neither is a "
  + "primary wall trip. The first is the engine declining to pretend a single vote was a "
  + "characterisation once a contradicting vote arrives, which is runbook rule 25 working as "
  + "intended; refusing to attribute a real 89-10 Senate passage vote so that 27 one-vote rows keep "
  + "looking read would be the aggregate dictating the text. The Utah seven lose nothing.");
w("--");
w("-- KEYS LEFT BLOCKED, ON PURPOSE");
for (const b of decision.blockedOn || []) {
  bullet(`${b.key} — ${b.state} ${b.evidence}`);
  if (b.whatWouldUnblockIt) wrapAll(`WOULD UNBLOCK IT: ${b.whatWouldUnblockIt}`, "--   ", "--   ");
}
w("--");
w("-- CANDIDATE ROLL CALLS READ AND DECLINED");
for (const d of decision.declinedRollCalls || []) {
  bullet(`${d.measure || "?"}${d.roll ? ` (${d.roll}${d.tally ? `, ${d.tally}` : ""})` : ""} — ${d.why}`);
}
for (const m of unmapped) {
  const d = decisionFor(m);
  if (!d) continue;
  w("--");
  wrapAll(`${m.number} CARRIES NO NEW MAPPING FROM THIS PASS, and that is the decision. ${d.outcome || ""}`);
}
w("-- ---------------------------------------------------------------------------");
w();

// ── body ────────────────────────────────────────────────────────────────────
w("DO $$");
w("DECLARE");
w("  rc integer;");
for (const m of measures) w(`  ${m.var} integer;`);
for (const r of RETRACTIONS) w(`  ${r.var} integer;`);
w("BEGIN");
w("  -- ── measures ──────────────────────────────────────────────────────────────");
w("  -- Every lookup keys on measure_type, congress, chamber AND number, and creation is");
w("  -- guarded on IF ... IS NULL: federal (measure_type, congress, chamber, number) has no");
w("  -- unique index, so a bare INSERT duplicates the measure on a second run and splits its");
w("  -- rolls across two ids.");
w();
for (const m of measures) {
  const c = m.create || null;
  w(`  -- ${m.number} (${m.congress}th ${m.chamber})${c ? " — NEW" : " — must already exist"}`);
  if (m.mustExist) for (const line of wrapLocal(m.mustExist)) w(`  --   ${line}`);
  if (c && c.status) w(`  --   status ${c.status}, introduced ${c.introducedAt}`);
  w(`  SELECT id INTO ${m.var} FROM vr_measures`);
  w(`   WHERE measure_type = ${q(m.measureType)} AND congress = ${m.congress}`);
  w(`     AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  if (c) {
    w(`  IF ${m.var} IS NULL THEN`);
    w("    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)");
    w(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(c.title)}, ${qOrNull(c.shortTitle)},`);
    w(`      ${qOrNull(c.summary)}, ${c.introducedAt ? `DATE ${q(c.introducedAt)}` : "NULL"}, ${q(c.status)},`);
    w(`      ${qOrNull(c.sourceUrl || m.sourceUrl)}, ${qOrNull(c.sourceLabel)}, ${q(JSON.stringify(c.externalIds || {}))}::jsonb)`);
    w(`    RETURNING id INTO ${m.var};`);
    w("  END IF;");
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`${LABEL}: ${m.number} could not be created or read back.`)};`);
    w("  END IF;");
  } else {
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`${LABEL}: ${m.number} (${m.congress}th ${m.chamber}) is not in vr_measures. `
      + "It is expected to exist and is never created here — this pass attributes its Senate roll, it does not introduce the bill.")};`);
    w("  END IF;");
  }
  w();
}

w("  -- ── roll calls and member votes ───────────────────────────────────────────");
w("  -- Chamber XML is the vote. congress.gov actions were used only to find the roll numbers;");
w("  -- every tally, party split and member position below was read out of the Senate's own");
w("  -- roll-call document and re-verified field by field by the seed builder, which refuses to");
w("  -- write a partial seed. Attribution is fail-closed: lis_member_id → bioguide → roster slug,");
w("  -- and a member who does not resolve is skipped and counted, never guessed.");
w();
for (const v of seed.votes) {
  const mv = varName(v.measure);
  const pt = Object.entries(v.partyTotals || {}).map(([p, t]) => `${p} ${t.yea}-${t.nay}`).join(", ");
  w(`  -- ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} · ${v.measure.number} · ${v.question}`);
  w(`  --   ${v.totals.yea}-${v.totals.nay}${v.totals.present ? `, ${v.totals.present} present` : ""}${v.totals.notVoting ? `, ${v.totals.notVoting} not voting` : ""} (${pt}) · ${v.result}`);
  w(`  --   losing side is ${(v.marginShare * 100).toFixed(3)}% of the yea+nay pool — rule 11's one-tenth bar is ${v.marginShare >= 0.1 ? "cleared" : "NOT cleared"}`);
  const res = v.resolution || {};
  w(`  --   ${v.memberVotes.length} of ${res.listed} recorded members resolve to a roster slug`
    + `${(res.unmappedBioguide || []).length ? `; ${(res.unmappedBioguide || []).length} skipped as unmapped: ${(res.unmappedBioguide || []).join(", ")}` : ""}`
    + `${(res.unresolvedLis || []).length ? `; ${(res.unresolvedLis || []).length} lis_member_id did not resolve to a bioguide` : ""}`);
  // Why this roll and not one of the other eight on the same measure. Sourced from the
  // measure's own recorded decisiveQuestion check rather than asserted generically here:
  // "On the Joint Resolution" is admitted on the form alone under rule 12, while "On
  // Passage of the Bill" is admitted under rule 8 as the chamber's one decisive act, and
  // stating the wrong rule would make a real argument look like boilerplate.
  const dq = ((decisionFor(v.measure) || {}).checks || {}).decisiveQuestion;
  w(`  --   admitted as ${v.admittedAs}${v.decisiveWhy ? "" : ", and decisiveWhy is null because the question form carries the argument"}`);
  for (const line of wrapLocal(v.decisiveWhy || dq || "")) if (line) w(`  --   ${line}`);
  if (v.voteDesc) for (const line of wrapLocal(`chamber vote description reads "${v.voteDesc}"`)) w(`  --   ${line}`);
  w("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
  w(`  VALUES (${mv}, ${q(v.chamber)}, ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${q(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)},`);
  w(`    ${q(JSON.stringify({ yea: v.totals.yea, nay: v.totals.nay, present: v.totals.present, notVoting: v.totals.notVoting, byParty: v.partyTotals }))}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  w("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
  w("  SELECT id INTO rc FROM vr_rollcalls");
  w(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  w("  IF rc IS NULL THEN");
  w(`    RAISE EXCEPTION ${q(`${LABEL}: ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} could not be read back after insert.`)};`);
  w("  END IF;");
  w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  w(v.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}

w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json with a rationale and an https primary source on every");
w(`  -- row — scripts/test-mapping-discipline.mjs requires both — and argued in ${DECISION_PATH},`);
w("  -- which also records every refusal. ON CONFLICT (measure_id, issue_key) DO NOTHING, so a");
w("  -- re-emission cannot rewrite a rationale (runbook rule 21).");
w();
for (const m of measures) {
  const { issues, sourceUrl, note } = issuesFor(m);
  const d = decisionFor(m);
  if (!issues.length) {
    w(`  -- ${m.number} (${m.congress}th): NO MAPPING FROM THIS PASS, and that is the decision.`);
    for (const line of wrapLocal(d && d.outcome ? d.outcome
      : "The measure already carries its own curated rows from an earlier pass and this migration does not "
        + "touch one of them. What it gives the measure is the missing half of its own vote. The verification "
        + "block asserts the mapped-row count on it is UNCHANGED, so a pass that wanted coverage could not "
        + "quietly re-stuff it while landing an attribution.")) w(`  --   ${line}`);
    w();
    continue;
  }
  const facets = issues.map((i) => `${i.issueKey} ${i.supportMeaning} w${i.weight}${i.isPrimary ? " PRIMARY" : ""}`).join(", ");
  w(`  -- ${m.number} (${m.congress}th) — ${facets}`);
  if (note) for (const line of wrapLocal(note)) w(`  --   ${line}`);
  if (d) {
    const refused = (d.issues || []).filter((i) => i.decision === "REFUSED").map((i) => i.issueKey);
    if (refused.length) for (const line of wrapLocal(`Read and refused on this measure: ${refused.join(", ")}. The argument against each is in ${DECISION_PATH}.`)) w(`  --   ${line}`);
    for (const [name, text] of Object.entries(d.checks || {})) {
      for (const line of wrapLocal(`${name}: ${text}`)) w(`  --   ${line}`);
    }
  }
  w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
  w(issues.map((i) => `    (${m.var}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n`
    + `      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || sourceUrl)})`).join(",\n"));
  w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  w();
}

// ── the retraction ──────────────────────────────────────────────────────────
if (RETRACTIONS.length) {
  w("  -- ── retraction ────────────────────────────────────────────────────────────");
  w("  -- The only DELETE in this migration, and the only place it removes a live reading.");
  w("  -- Guarded on issue_key AND weight AND is_primary AND support_meaning AND the exact");
  w("  -- rationale string. Three consequences, all wanted: a re-run removes nothing; a pass");
  w("  -- that has already rewritten this row keeps its work rather than being clobbered by a");
  w("  -- migration that has not read it; and if the live row is not what this file believes it");
  w("  -- is, the DELETE is a silent no-op instead of a wrong removal — which the verification");
  w("  -- block then catches by asserting the row is gone.");
  w();
  for (const r of RETRACTIONS) {
    w(`  -- ${r.number} (${r.congress}th) — RETRACT ${r.issueKey} w${r.was.weight} ${r.was.isPrimary ? "PRIMARY " : ""}${r.was.supportMeaning}`);
    for (const line of wrapLocal(`WHY: ${r.why}`)) w(`  --   ${line}`);
    for (const line of wrapLocal(`WHY IT IS SAFE: ${r.whyItIsSafeToRemove}`)) w(`  --   ${line}`);
    for (const line of wrapLocal(`COST: ${r.costDisclosed}`)) w(`  --   ${line}`);
    w(`  SELECT id INTO ${r.var} FROM vr_measures`);
    w(`   WHERE measure_type = ${q(r.measureType)} AND congress = ${r.congress}`);
    w(`     AND chamber = ${q(r.chamber)} AND number = ${q(r.number)} LIMIT 1;`);
    w(`  IF ${r.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`${LABEL}: ${r.number} (${r.congress}th ${r.chamber}) is not in vr_measures, `
      + `so its ${r.issueKey} row cannot be retracted. This measure is never created here.`)};`);
    w("  END IF;");
    w("  DELETE FROM vr_measure_issues");
    w(`   WHERE measure_id = ${r.var} AND issue_key = ${q(r.issueKey)}`);
    w(`     AND weight = ${r.was.weight} AND is_primary = ${r.was.isPrimary ? "true" : "false"}`);
    w(`     AND support_meaning = ${q(r.was.supportMeaning)}`);
    w(`     AND rationale = ${q(r.was.rationale)};`);
    w();
  }
}
w("END $$;");
w();
// A drizzle-style split point. To plain postgres it is a comment and changes nothing; to
// a runner that honours it, the verification block becomes its own statement, so a failed
// assertion reports against the verification rather than against the 850-line write.
w("--> statement-breakpoint");
w();

// ── verification ────────────────────────────────────────────────────────────
const rollTuples = seed.votes.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);
const PRIMARIES = [];
for (const m of measures) for (const i of issuesFor(m).issues) if (i.isPrimary) PRIMARIES.push({ m, i, v: `n_${i.issueKey}_${m.var}` });
// A measure this pass attributes but deliberately does NOT map gets its live mapped-row
// count pinned, so a later pass cannot re-stuff it while landing an attribution. The
// count is declared in the decision seed rather than read from the database here: a
// generator that queries for the number it is about to assert is asserting nothing.
const UNCHANGED = unmapped
  .map((m) => ({ m, n: (decisionFor(m) || {}).liveMappedRowCount ?? null, v: `n_rows_${m.var}` }))
  .filter((x) => x.n != null);

w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrapAll("Read-only, and scoped by tuple to exactly this pass's roll calls and measures so it can only "
  + "ever fail on data this migration is responsible for. A global count would drag in every mapping "
  + "earlier passes wrote and stop meaning anything.");
w("--");
wrapAll("Member-vote counts assert >=, because ON CONFLICT DO NOTHING means an earlier attribution path "
  + "may already hold rows on a roll this pass touches. The orphan check is exact: a politician_id on "
  + "one of these rolls that is not in db/vr-member-map.json is an attribution failure, not a "
  + "rounding difference, and fail-closed attribution means there should be none.");
w("--");
wrapAll("The specific assertions are the things this pass exists to do. Each new PRIMARY is named with "
  + "its polarity, so a row that landed with yea_supports instead of yea_opposes is caught rather "
  + "than averaged into a total. H.R. 1069 is asserted to carry EXACTLY ZERO mapped rows — the only "
  + "way to make a deliberate refusal testable, restated here because F2 was explicitly told not to "
  + "invent a key for it. And the retracted row is asserted GONE, because a guarded DELETE that "
  + "matched nothing is indistinguishable from a successful one without this check.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_issues integer;");
w("  n_unmapped integer;");
w("  n_ep_senate integer;");
w("  n_hb_senate integer;");
for (const p of PRIMARIES) w(`  ${p.v} integer;`);
for (const u of UNCHANGED) w(`  ${u.v} integer;`);
for (const r of RETRACTIONS) w(`  n_retracted_${r.var} integer;`);
w("BEGIN");
w("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
w("    " + rollTuples.join(",\n    "));
w("  ), roll_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN want w");
w("      ON r.chamber = w.chamber AND r.congress = w.congress");
w("     AND r.session = w.session AND r.roll_number = w.roll_number");
w("  ), mine (measure_type, congress, chamber, number) AS (VALUES");
w("    " + measures.map((m) => `(${q(m.measureType)}::text, ${m.congress}::integer, ${q(m.chamber)}::text, ${q(m.number)}::text)`).join(",\n    "));
w("  ), measure_ids AS (");
w("    SELECT m.id FROM vr_measures m JOIN mine k");
w("      ON m.measure_type = k.measure_type AND m.congress = k.congress");
w("     AND m.chamber = k.chamber AND m.number = k.number");
w("  )");
w("  SELECT (SELECT count(*) FROM roll_ids),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)");
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
  w(`     AND i.is_primary AND i.weight = ${p.i.weight} AND i.support_meaning = ${q(p.i.supportMeaning)};`);
}
for (const u of UNCHANGED) {
  w(`  SELECT count(*) INTO ${u.v} FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id`);
  w(`   WHERE m.measure_type = ${q(u.m.measureType)} AND m.congress = ${u.m.congress} AND m.chamber = ${q(u.m.chamber)} AND m.number = ${q(u.m.number)};`);
}
for (const r of RETRACTIONS) {
  w(`  SELECT count(*) INTO n_retracted_${r.var} FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id`);
  w(`   WHERE m.measure_type = ${q(r.measureType)} AND m.congress = ${r.congress} AND m.chamber = ${q(r.chamber)}`);
  w(`     AND m.number = ${q(r.number)} AND i.issue_key = ${q(r.issueKey)};`);
}
// H.R. 1069 stays unmapped — restated from F1 because F2 was told in as many words not to
// invent a key for the 1069-class vocabulary gap unless the V1 standing rules all pass.
// They do not: the bill conditions a domestic K-12 grant on not partnering with a
// PRC-funded institute, and the vocabulary has no key for foreign influence in domestic
// institutions. Zero keys were added by this wave.
w("  SELECT count(*) INTO n_unmapped FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id");
w("   WHERE m.measure_type = 'bill' AND m.congress = 119 AND m.chamber = 'house' AND m.number = 'H.R. 1069';");
// The two walls this wave is measured against, each as a number.
w("  SELECT count(*) INTO n_ep_senate FROM vr_rollcalls r");
w("    JOIN vr_measure_issues i ON i.measure_id = r.measure_id");
w("   WHERE r.chamber = 'senate' AND i.issue_key = 'energy_production' AND i.is_primary;");
w("  SELECT count(*) INTO n_hb_senate FROM vr_rollcalls r");
w("    JOIN vr_measure_issues i ON i.measure_id = r.measure_id");
w("   WHERE r.chamber = 'senate' AND i.issue_key = 'housing_build' AND i.is_primary;");
w();
w(`  RAISE NOTICE '${LABEL}: % roll calls, % member votes, % issue mappings', n_rolls, n_votes, n_issues;`);
w(`  RAISE NOTICE '${LABEL}: H.R. 1069 carries % mapped issue row(s)', n_unmapped;`);
w(`  RAISE NOTICE '${LABEL}: % senate roll(s) now sit on an energy_production PRIMARY measure, % on a housing_build PRIMARY measure', n_ep_senate, n_hb_senate;`);
for (const r of RETRACTIONS) w(`  RAISE NOTICE '${LABEL}: ${r.number} carries % ${r.issueKey} row(s) after the retraction', n_retracted_${r.var};`);
for (const u of UNCHANGED) w(`  RAISE NOTICE '${LABEL}: ${u.m.number} carries % mapped issue row(s)', ${u.v};`);
w();
w(`  IF n_rolls <> ${seed.votes.length} THEN`);
w(`    RAISE EXCEPTION '${LABEL}: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
w("  END IF;");
w(`  IF n_votes < ${seed.memberVoteCount} THEN`);
w(`    RAISE EXCEPTION '${LABEL}: expected at least ${seed.memberVoteCount} member votes on these roll calls, found %', n_votes;`);
w("  END IF;");
w("  IF n_orphan > 0 THEN");
w(`    RAISE EXCEPTION '${LABEL}: % member vote(s) on these rolls carry a politician_id outside db/vr-member-map.json. Attribution here is fail-closed, so this is a bug, not a roster gap.', n_orphan;`);
w("  END IF;");
w(`  IF n_issues < ${totalIssueRows} THEN`);
w(`    RAISE EXCEPTION '${LABEL}: expected at least ${totalIssueRows} issue mappings on this pass''s measures, found %', n_issues;`);
w("  END IF;");
for (const p of PRIMARIES) {
  w(`  IF ${p.v} <> 1 THEN`);
  w(`    RAISE EXCEPTION '${LABEL}: the ${p.i.issueKey} w${p.i.weight} PRIMARY ${p.i.supportMeaning} row on ${p.m.number} (${p.m.congress}th) did not land (found % row(s)). Polarity matters here: EO 14156 carries this key yea_supports, and these resolutions terminate it.', ${p.v};`);
  w("  END IF;");
}
for (const r of RETRACTIONS) {
  w(`  IF n_retracted_${r.var} <> 0 THEN`);
  w(`    RAISE EXCEPTION '${LABEL}: ${r.number} still carries % ${r.issueKey} row(s). The guarded DELETE matched nothing, which means the live row is not the value this migration read. Re-read it before forcing the removal — see ${DECISION_PATH}.', n_retracted_${r.var};`);
  w("  END IF;");
}
for (const u of UNCHANGED) {
  w(`  IF ${u.v} <> ${u.n} THEN`);
  w(`    RAISE EXCEPTION '${LABEL}: ${u.m.number} carries % mapped issue row(s), expected exactly ${u.n}. This pass adds an attribution to this measure and deliberately adds NO mapping; a changed count means somebody re-stuffed the measure to feed coverage.', ${u.v};`);
  w("  END IF;");
}
w("  IF n_unmapped <> 0 THEN");
w(`    RAISE EXCEPTION '${LABEL}: H.R. 1069 is deliberately unmapped and now carries % issue row(s). F1 refused nine candidate keys in writing and F2 re-refused them; see db/vr-federal-mapping-seed-f1.json before adding one.', n_unmapped;`);
w("  END IF;");
w("  IF n_ep_senate < 2 THEN");
w(`    RAISE EXCEPTION '${LABEL}: the Senate holds only % decisive roll(s) on an energy_production PRIMARY measure. Below 2 the primary wall in stance-helpers.js reopens and senators read as not-about-this-issue on a key they have voted on repeatedly.', n_ep_senate;`);
w("  END IF;");
w("  IF n_hb_senate < 1 THEN");
w(`    RAISE EXCEPTION '${LABEL}: the Senate holds only % decisive roll(s) on a housing_build PRIMARY measure, so housing_build is back to vehicle_only for the whole Senate caucus. H.R. 6644''s Senate roll is the only instrument in the 119th that closes it.', n_hb_senate;`);
w("  END IF;");
w("END $$;");

process.stdout.write(out.join("\n") + "\n");
process.stderr.write(
  `${seed.votes.length} rolls (all new) · ${seed.memberVoteCount} member votes · `
  + `${measures.length} measures (${newMeasures.length} created, ${existingMeasures.length} looked up) · `
  + `${totalIssueRows} issue rows across ${KEYS.length} keys (${KEYS.join(", ")}) · `
  + `${RETRACTIONS.length} guarded retraction · ${refusedRows} refusals and ${decision._counts.rollCallsDeclined} declined rolls recorded · `
  + `0 keys added · 0 floors moved · ${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
