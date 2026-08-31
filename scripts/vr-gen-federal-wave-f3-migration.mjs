#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Federal wave F3 — standalone Senate PRIMARYs for the chamber gap F2 left
// ─────────────────────────────────────────────────────────────────────────────
// Folds db/vr-federal-wave-f3-vote-seed.json, db/vr-issue-seed.json and
// db/vr-federal-mapping-seed-f3.json into a forward-only migration.
//
// WHAT F3 IS FOR
// F2 admitted three Senate rolls on two keys and cut vehicle_only from 911 rows to
// 816. What it left standing was a WRITTEN CHAMBER GAP: a census rebuilt from
// vr_measure_issues × vr_measures found that of the 98 keys the formal index reports
// on, only 35 had a Senate-reachable PRIMARY instrument. Sixty-three had none. On
// those keys a senator's dossier row is written by the primary wall in
// stance-helpers.js rather than by their record — Lee and Curtis read House-shaped or
// package-shaped on keys they have a recorded floor vote on.
//
// The cure for that is never a heavier mapping and never a fifth secondary. It is a
// STANDALONE, CONTESTED, SINGLE-SUBJECT instrument the blocked senator personally has
// a recorded vote on. This wave supplies the two the 119th actually offers:
//
//   · broadband — zero PRIMARY instruments in EITHER chamber, and exactly one live row
//     corpus-wide (H.R. 3684 division F, w65, non-primary). 88 senator rows read
//     `incidental`. S.J.Res. 7 is a Congressional Review Act joint resolution
//     disapproving the FCC's "Addressing the Homework Gap Through the E-Rate Program"
//     rule — one operative sentence, no severable provision, 50-38 on the Senate
//     floor. It is the corpus's first broadband PRIMARY.
//   · lands_preserve — two House PRIMARYs, zero Senate. 90 senator rows read
//     `incidental`. H.J.Res. 140 disapproves Public Land Order No. 7917, the
//     withdrawal of 225,504 acres in the Boundary Waters watershed from mineral and
//     geothermal leasing. 50-49 in the Senate, 214-208 in the House, enacted as Public
//     Law 119-85.
//
// AND ONE MEASURE GETS BOTH OF ITS ROLLS, WHICH IS THE POINT
// H.J.Res. 140 is a HOUSE joint resolution. Admitting only its Senate roll would leave
// a House measure whose own chamber does not appear among its roll calls — the exact
// ingest gap runbook rule 30's second corollary names, manufactured inside the wave
// meant to close one. So the House passage roll (119/2 roll 38, from the Clerk's EVS
// XML) is admitted alongside the Senate roll. One measure, two acts, one mapping.
//
// THE SECONDARY THAT WAS ADMITTED AND THE TWO THAT WERE REFUSED
// This wave settled secondary rows as arithmetic rather than taste: a secondary is
// admitted when it gains more characterised rows than it costs, and refused when it
// does not. lands_energy w75 yea_supports is the mirror row H.J.Res. 131's own live
// rationale requires, and it measures +8 gained / −1 lost — admitted, with the one
// loss named. The two gov_regulation secondaries were drafted on four live CRA
// precedents and then MEASURED: +0 gained / −2 lost, because King and Luján each hold
// exactly three uniform non-primary gov_regulation nays and no primary, so a fourth
// judged act crosses _RD_MIN_JUDGED onto the branch where the primary wall fires and
// destroys the read. Both were refused in writing, and the divergence from precedent
// is argued rather than glossed.
//
// WHAT IT DELIBERATELY DOES NOT DO
//   · No key is added. Every remaining hole the census found is an ATTRIBUTION hole —
//     no instrument, or no recorded vote — not a vocabulary hole, so there is no
//     proposal to ship. H.R. 1069 stays unmapped and the verification block asserts it.
//   · No floor moves. _RD_MIN_PRIMARY stays 1, _RD_MIN_JUDGED stays 4; every row here
//     earns its read.
//   · No party score, no package percentage, no reserve fund, no messaging amendment,
//     no near-unanimous vehicle restuffed onto a chip. Seven candidate roll-call
//     entries were read and declined in writing.
//   · No retraction. Runbook rule 32 was walked — every live mapping on the two keys
//     was re-read against the new PRIMARYs — and nothing came out wrong.
//
// INVARIANTS THIS FILE HOLDS
//   · TWO MEASURES ARE NEW AND NEITHER IS LOOKED UP. Creation is guarded on
//     `IF m_id IS NULL`, because federal (measure_type, congress, chamber, number)
//     carries no unique index — a bare INSERT would duplicate on re-run.
//   · EVERY lookup keys on measure_type, congress, chamber AND number.
//   · ROLL CALLS insert ON CONFLICT (chamber, congress, session, roll_number) DO
//     NOTHING, then read the id back and RAISE if it is null.
//   · MEMBER VOTES insert ON CONFLICT (rollcall_id, politician_id) DO NOTHING.
//   · ISSUE ROWS come from db/vr-issue-seed.json — rationale plus an https source on
//     every one, which scripts/test-mapping-discipline.mjs requires — and insert ON
//     CONFLICT (measure_id, issue_key) DO NOTHING, so a re-emission can never rewrite
//     a live rationale (runbook rule 21).
//   · THE VERIFICATION BLOCK IS TUPLE-SCOPED to this pass's own rolls and measures.
//     That is the Utah committee lesson stated as code: a guard that counts rows the
//     mapping lane wrote and the seed lane wrote together will collide with the next
//     wave and then get relaxed until it means nothing. Scope the guard to the rows
//     THIS file writes. The only deliberately global assertions are the two chamber
//     walls this wave exists to clear, and they are floors (`<`), not equalities.
//
//   node scripts/vr-gen-federal-wave-f3-migration.mjs \
//     > netlify/database/migrations/20261017000000_vr_federal_wave_f3.sql
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-federal-wave-f3-vote-seed.json";
const DECISION_PATH = "db/vr-federal-mapping-seed-f3.json";
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
const LABEL = "Federal wave F3";

const pidCheck = assertSeedPidsMatchMap(seed, memberMap, SEED_PATH);

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null || s === "" ? "NULL" : q(s));
const varName = (m) => `m_${m.congress}_${String(m.number).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
const ikey = (congress, chamber, number) => `${congress}|${chamber}|${number}`;

const issueIndex = new Map((issueSeed.measures || []).map((m) => [ikey(m.congress, m.chamber, m.number), m]));
const decisionIndex = new Map((decision.measures || []).map((m) => [ikey(m.congress, m.chamber, m.number), m]));
const decisionFor = (m) => decisionIndex.get(ikey(m.congress, m.chamber, m.number)) || null;

// PURE ATTRIBUTION. Carried forward from F2 unchanged even though F3 has none: a measure
// whose decision entry declares liveMappedRowCount is one the wave attributes and
// deliberately does not map, so re-emitting its earlier rows here would report the wave
// as adding mappings it did not decide and would put a second writer's INSERT on
// somebody else's rationale. Both of this wave's measures are new and both are mapped
// here, so the branch is inert — kept because deleting it would invite the next wave to
// rediscover the rule the hard way.
const isPureAttribution = (m) => (decisionFor(m) || {}).liveMappedRowCount != null;
const issuesFor = (m) => {
  if (isPureAttribution(m)) return { issues: [], sourceUrl: null, note: null };
  const e = issueIndex.get(ikey(m.congress, m.chamber, m.number));
  return e ? { issues: e.issues || [], sourceUrl: e.sourceUrl || null, note: e._note || null } : { issues: [], sourceUrl: null, note: null };
};

// ── measures, lookups first then creates ────────────────────────────────────
// De-duplicated by (congress, chamber, number), which is what makes H.J.Res. 140's two
// passage rolls attach to ONE measure row and one mapping rather than to two.
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

// A retraction needs its measure resolved on its own, because it is not on any roll this
// pass carries. F3 retracts nothing — rule 32 was walked and no live mapping came out
// wrong in light of the two new PRIMARYs — so this is an empty list and the DELETE block
// is not emitted at all. It is not removed from the generator: the next wave that does
// need a guarded retraction should find the shape here rather than reinvent it.
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
// Refused keys, de-duplicated: gov_regulation and rural_ag are each refused on BOTH
// measures, and the verification block asserts they landed on neither. Each key carries
// its OWN refusal headline into its OWN exception message, taken from the head of the
// argument in the decision seed. That is not decoration. A generic message — "this key was
// refused, go read the file" — is what turns an assertion into a speed bump: the next
// curator reads the failure, not the seed, so the failure has to say which argument it is
// defending. Getting a `water` failure that explains gov_regulation's measurement would be
// worse than saying nothing.
//
// The head is a 220-character clamp on a word boundary, NOT a first-sentence split. Every
// argument in this seed cites bill numbers — "H.J.Res. 131", "89 Fed. Reg. 67303" — and a
// sentence splitter cuts them at the abbreviation dot and produces "REFUSED, and this is
// the cousin refusal that keeps H.J.Res." as the whole explanation. A clamp cannot be
// clever, which here is the requirement.
const clamp = (text, n = 220) => {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "refused in writing; see the seed.";
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  return (sp > 60 ? cut.slice(0, sp) : cut) + " […]";
};
const REFUSED = new Map();
for (const m of decision.measures || []) {
  for (const i of m.issues || []) {
    if (i.decision !== "REFUSED") continue;
    if (REFUSED.has(i.issueKey)) continue;
    REFUSED.set(i.issueKey, clamp(i.why));
  }
}
const REFUSED_KEYS = [...REFUSED.keys()].sort();

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
const pad = (s, n) => String(s).padEnd(n, " ");
const padL = (s, n) => String(s).padStart(n, " ");

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w(`-- ${LABEL} — ${measures.map((m) => m.number).join(", ")}`);
w("-- ---------------------------------------------------------------------------");
w(`-- Generated by scripts/vr-gen-federal-wave-f3-migration.mjs from`);
w(`-- ${SEED_PATH}, db/vr-issue-seed.json and ${DECISION_PATH}.`);
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${seed.votes.length} roll calls (all new) · ${seed.memberVoteCount} attributed member votes · ${seed.skippedVoteCount} skipped and counted`);
w(`-- ${newMeasures.length} measures created · ${existingMeasures.length} looked up`);
w(`-- ${totalIssueRows} issue mapping(s) ADDED across ${KEYS.length} key(s): ${KEYS.join(", ")}`);
w(`-- ${RETRACTIONS.length} issue mapping(s) RETRACTED by guarded DELETE`);
w(`-- ${refusedRows} candidate mapping(s) READ AND REFUSED in writing · ${decision._counts.rollCallsDeclined} candidate roll call(s) declined across ${(decision.declinedRollCalls || []).length} written entries`);
w(`-- 0 keys added · 0 floors moved · _RD_MIN_PRIMARY and _RD_MIN_JUDGED untouched`);
w("--");
w("-- WHAT THIS PASS IS ANSWERING");
wrapAll(decision.census.findingThatShapedTheWave);
w("--");
bullet("broadband, the emptiest key in the corpus. Zero PRIMARY instruments in either "
  + "chamber and exactly one live row anywhere — H.R. 3684 division F, w65, non-primary — so 88 "
  + "senator rows read `incidental`: four or more judged acts on the key and not one of them a "
  + "primary, which is the state where the wall prints 'Not about this issue' about a key the "
  + "member has voted on repeatedly. S.J.Res. 7 is a Congressional Review Act joint resolution "
  + "disapproving 89 FR 67303, the FCC's E-Rate off-premises Wi-Fi hotspot rule. One operative "
  + "sentence, no reserve fund, no severable provision, 50-38 on the Senate floor. Mapped "
  + "broadband w100 PRIMARY yea_opposes: the disapproved rule is a subsidy for connectivity, and "
  + "a yea withdraws it.");
bullet("lands_preserve, the chamber gap in its plainest form. Two House PRIMARYs, zero Senate, 90 "
  + "senator rows reading `incidental`. H.J.Res. 140 disapproves Public Land Order No. 7917 — the "
  + "withdrawal of about 225,504 acres of National Forest System land in the Boundary Waters "
  + "watershed from mineral and geothermal leasing. Mapped lands_preserve w90 PRIMARY yea_opposes "
  + "and lands_energy w75 yea_supports. That is the reverse of H.J.Res. 131's assignment and the "
  + "reversal is argued, not accidental: 131's own live rationale states the discriminator — it "
  + "acts on a LEASING PROGRAMME decision, so preservation is the mirror; PLO 7917 is a "
  + "WITHDRAWAL FOR PROTECTION, so protection is the act and leasing is the mirror.");
bullet("Both of H.J.Res. 140's rolls, on purpose. It is a House joint resolution; filing only its "
  + "Senate passage vote would leave a House measure whose own chamber never appears among its "
  + "roll calls, which is precisely the ingest gap rule 30's second corollary tells a curator to "
  + "treat as a bug. The House roll (119/2 roll 38, 214-208, from the Clerk's EVS XML) is admitted "
  + "as the same measure's second act under rule 34. It adds no measure and no mapping.");
w("--");
w("-- CENSUS BEFORE ANY CANDIDATE WAS LOOKED AT");
wrapAll(decision.census._how);
w("--");
wrapAll(decision.census._tableNote);
w("--");
w(`-- ${pad("key", 22)}${padL("SenP", 5)}${padL("HouP", 5)}   ${pad("Senate unread (veh/inc/oth)", 30)}outcome`);
w(`-- ${"-".repeat(22)}${padL("----", 5)}${padL("----", 5)}   ${pad("-".repeat(28), 30)}${"-".repeat(30)}`);
for (const r of decision.census.beforeTable) {
  const u = r.senateUnread;
  const cell = `${u.vehicle_only}/${u.incidental}/${u.other} = ${u.total}`;
  w(`-- ${pad(r.key, 22)}${padL(r.senatePrimaryBefore, 5)}${padL(r.housePrimary, 5)}   ${pad(cell, 30)}${r.outcome}`);
}
const tb = decision.census.totalsBefore;
w("--");
w(`-- TOTALS BEFORE: ${tb.keysReported} keys reported · ${tb.keysWithSenatePrimary} with a Senate-reachable PRIMARY · ${tb.keysWithoutSenatePrimary} with none`);
w(`-- ${tb.senateUnreadRows} unread senator rows: ` + Object.entries(tb.byReason).map(([k, n]) => `${k} ${n}`).join(", "));
w(`-- AFTER THIS MIGRATION: ${decision._counts.senateKeysWithPrimaryAfter} keys with a Senate-reachable PRIMARY (+${decision._counts.senateKeysWithPrimaryAfter - decision._counts.senateKeysWithPrimaryBefore})`);
w(`-- ${decision._counts.senateUnreadRowsAfter} unread senator rows (${decision._counts.senateUnreadRowsAfter - decision._counts.senateUnreadRowsBefore})`);
w("--");
w("-- THE COST, MEASURED AND NOT NETTED");
const rl = decision.readLossDisclosure;
wrapAll(rl._comment);
w("--");
wrapAll(`Counted set-wise on the read flag: ${rl.totals.gained} rows start being characterised `
  + `(${Object.entries(rl.totals.gainedTiers).map(([t, n]) => `${n} ${t}`).join(", ")}; by key `
  + `${Object.entries(rl.totals.gainedByKey).map(([k, n]) => `${k} ${n}`).join(", ")}) and `
  + `${rl.totals.lost} stops (${Object.entries(rl.totals.lostTiers).map(([t, n]) => `${n} ${t}`).join(", ")}). `
  + `The one loss is named in ${DECISION_PATH} under readLossDisclosure.causes and is not netted `
  + `against the gains. Utah: ${rl.utahSeven.gained} gained, ${rl.utahSeven.lost} lost.`);
for (const c of rl.causes || []) {
  w("--");
  bullet(`${c.cause} — ${c.mechanism}`);
  if (c.whyTheRowWasKeptAnyway) wrapAll(`DECISION: ${c.whyTheRowWasKeptAnyway}`, "--   ", "--   ");
}
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
w("--");
w("-- CHAMBER-GAP SWEEP ON THIS WAVE'S OWN OUTPUT");
wrapAll(decision.chamberGapSweep._why);
wrapAll(decision.chamberGapSweep._result, "--   ", "--   ");
wrapAll(decision.chamberGapSweep.checkedAfter, "--   ", "--   ");
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
w("  -- rolls across two ids. H.J.Res. 140 is declared once here and carries two rolls.");
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
      + "It is expected to exist and is never created here — this pass attributes its roll, it does not introduce the measure.")};`);
    w("  END IF;");
  }
  w();
}

w("  -- ── roll calls and member votes ───────────────────────────────────────────");
w("  -- Chamber XML is the vote. congress.gov actions were used only to find the roll numbers;");
w("  -- every tally, party split and member position below was read out of the chamber's own");
w("  -- roll-call document — senate.gov LIS for the two Senate rolls, the House Clerk's EVS XML");
w("  -- for the House roll — and re-verified field by field by the seed builder, which refuses");
w("  -- to write a partial seed. Attribution is fail-closed and asymmetric by chamber, because");
w("  -- the two documents publish different identifiers:");
w("  --   SENATE: lis_member_id → bioguide → roster slug, AND independently (surname, state) →");
w("  --   roster slug against OUR roster, with the two keys required to agree. A surname+state");
w("  --   pair that matches no roster senator, matches two, or disagrees with the bioguide is");
w("  --   skipped and counted under its own heading — three different facts, never merged.");
w("  --   HOUSE: the Clerk publishes bioguide directly on every recorded-vote row, so the");
w("  --   bioguide IS the key and no second key exists to cross-check it against.");
w("  -- A member who does not resolve is skipped and counted. None is ever guessed.");
w();
for (const v of seed.votes) {
  const mv = varName(v.measure);
  const pt = Object.entries(v.partyTotals || {}).map(([p, t]) => `${p} ${t.yea}-${t.nay}`).join(", ");
  w(`  -- ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} · ${v.measure.number} · ${v.question}`);
  w(`  --   ${v.totals.yea}-${v.totals.nay}${v.totals.present ? `, ${v.totals.present} present` : ""}${v.totals.notVoting ? `, ${v.totals.notVoting} not voting` : ""} (${pt}) · ${v.result}`);
  w(`  --   losing side is ${(v.marginShare * 100).toFixed(3)}% of the yea+nay pool — rule 11's one-tenth bar is ${v.marginShare >= 0.1 ? "cleared" : "NOT cleared"}`);
  const res = v.resolution || {};
  // The skip ledger. Printed as counts plus, when the list is short enough to be useful,
  // the names — and as counts ALONE when it is not. The House roll skips 323 of 431
  // recorded members, which is not an attribution failure: db/vr-member-map.json covers
  // the reviewed roster, not the whole chamber. Pasting 323 bioguides into a migration
  // comment would bury that sentence rather than support it.
  const um = res.unmappedBioguide || [];
  w(`  --   ${v.memberVotes.length} of ${res.listed} recorded members resolve to a roster slug; ${res.skipped} skipped`);
  if (um.length && um.length <= 8) {
    w(`  --   skipped as unmapped bioguide: ${um.join(", ")}`);
  } else if (um.length) {
    w(`  --   ${um.length} skipped as unmapped bioguide — db/vr-member-map.json is the REVIEWED roster,`);
    w("  --   not the whole chamber, so most of the House is legitimately absent from it. Fail-closed:");
    w("  --   a bioguide with no roster slug is dropped and counted, never matched by name.");
  }
  // The second-key ledger is Senate-only, and printing three zeroes under a House roll
  // would be a claim the document cannot support: the Clerk's EVS XML has no surname+state
  // key to cross-check, so "0 ambiguous" there would mean "not checked", not "checked and
  // clean". Say which it is.
  if (v.chamber === "senate") {
    for (const [label, list] of [["surname+state matched no roster senator", res.noRosterNameState],
      ["surname+state ambiguous across two roster senators", res.ambiguousNameState],
      ["bioguide and surname+state disagreed", res.keyDisagreement]]) {
      w(`  --   ${(list || []).length} ${label}${(list || []).length ? `: ${(list || []).join("; ")}` : ""}`);
    }
  } else {
    w("  --   no second-key ledger: the Clerk publishes bioguide on every recorded-vote row and");
    w("  --   there is no surname+state key to cross-check it against, so this roll is attributed");
    w("  --   on one key. Not a weaker check — a different document.");
  }
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
w("  -- which also records every refusal and the measurement behind it. ON CONFLICT");
w("  -- (measure_id, issue_key) DO NOTHING, so a re-emission cannot rewrite a rationale");
w("  -- (runbook rule 21).");
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
    if (d.bothChambersWhy) for (const line of wrapLocal(`BOTH CHAMBERS: ${d.bothChambersWhy}`)) w(`  --   ${line}`);
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

// ── retractions ─────────────────────────────────────────────────────────────
// Not emitted by this wave: decision.retractions is empty. Rule 32 was walked — every
// live mapping on broadband, lands_preserve and lands_energy was re-read against the two
// new PRIMARYs — and nothing came out wrong, so there is nothing to remove. The block
// stays in the generator for the wave that does need it.
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
// assertion reports against the verification rather than against the write.
w("--> statement-breakpoint");
w();

// ── verification ────────────────────────────────────────────────────────────
const rollTuples = seed.votes.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);
// Every accepted row is asserted individually with its weight and its polarity — not just
// the primaries. lands_energy w75 yea_supports is the mirror row, and a mirror row that
// landed yea_opposes would be worse than a missing row: it would publish the resolution as
// a vote AGAINST mineral leasing, which is the opposite of what it does. An aggregate
// count cannot see that; a per-row assertion can.
const ROWS = [];
for (const m of measures) for (const i of issuesFor(m).issues) {
  ROWS.push({ m, i, v: `n_${i.issueKey}_${m.var}` });
}
// A measure this pass attributes but deliberately does NOT map gets its live mapped-row
// count pinned, so a later pass cannot re-stuff it while landing an attribution. The
// count is declared in the decision seed rather than read from the database here: a
// generator that queries for the number it is about to assert is asserting nothing.
const UNCHANGED = unmapped
  .map((m) => ({ m, n: (decisionFor(m) || {}).liveMappedRowCount ?? null, v: `n_rows_${m.var}` }))
  .filter((x) => x.n != null);
// The chamber-gap sweep, as an assertion instead of a promise. chamberGapSweep.checkedAfter
// says both new measures have at least one roll call in their own chamber; this counts it.
const CHAMBER = measures.map((m) => ({ m, v: `n_own_${m.var}` }));

w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrapAll("Read-only, and scoped by tuple to exactly this pass's roll calls and measures so it can only "
  + "ever fail on data this migration is responsible for. That scoping is the point rather than a "
  + "detail: a guard written as a global count over vr_measure_issues sums what the mapping lane "
  + "wrote and what the seed lane wrote, collides with the next wave that touches either, and then "
  + "gets relaxed until it asserts nothing. Scope the guard to the rows THIS file writes.");
w("--");
wrapAll("Member-vote counts assert >=, because ON CONFLICT DO NOTHING means an earlier attribution path "
  + "may already hold rows on a roll this pass touches. The orphan check is exact: a politician_id on "
  + "one of these rolls that is not in db/vr-member-map.json is an attribution failure, not a "
  + "rounding difference, and fail-closed attribution means there should be none. Note that the "
  + "converse is NOT asserted anywhere and must not be: 323 of the House roll's 431 recorded members "
  + "have no roster slug, which is the roster being a reviewed subset of the chamber, not a bug.");
w("--");
wrapAll("The specific assertions are the things this pass exists to do. Every accepted row is named "
  + "with its weight, its primacy and its polarity, because this wave's whole argument is about "
  + "direction: broadband yea_opposes because the disapproved rule funds connectivity, "
  + "lands_preserve yea_opposes and lands_energy yea_supports because the disapproved order "
  + "protects land from leasing. A row that landed with the polarity flipped would publish each "
  + "senator's vote backwards, and a total would average it away.");
w("--");
wrapAll(`All ${REFUSED_KEYS.length} refused keys are asserted as ZEROES, because a refusal nobody can `
  + "test is a note, not a decision, and each one carries its own argument into its own failure "
  + "message rather than a shared pointer to the seed file. gov_regulation is the one worth naming "
  + "here: it must land on NEITHER measure, it was drafted on four live CRA precedents that all "
  + "carry it, and it was then MEASURED at zero rows gained and two rows lost. A later pass that "
  + "adds it back because the precedents have it should fail on this assertion and go read the "
  + "measurement. And H.R. 1069 stays at exactly zero mapped rows, restated from F1 and F2 because "
  + "every wave since has been told not to invent a key for it.");
w("--");
wrapAll("Two assertions are deliberately GLOBAL rather than tuple-scoped, and both are floors, not "
  + "equalities: the number of Senate rolls sitting on a broadband PRIMARY measure and on a "
  + "lands_preserve PRIMARY measure. Those are the walls this wave exists to clear. A floor cannot "
  + "collide with a later wave's rows — more is fine — but it does catch the one thing worth "
  + "catching, which is somebody removing the instrument and reopening the wall.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_issues integer;");
w("  n_unmapped integer;");
w("  n_bb_senate integer;");
w("  n_lp_senate integer;");
for (const p of ROWS) w(`  ${p.v} integer;`);
for (const c of CHAMBER) w(`  ${c.v} integer;`);
for (const k of REFUSED_KEYS) w(`  n_refused_${k} integer;`);
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
for (const p of ROWS) {
  w(`  SELECT count(*) INTO ${p.v} FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id`);
  w(`   WHERE m.measure_type = ${q(p.m.measureType)} AND m.congress = ${p.m.congress} AND m.chamber = ${q(p.m.chamber)}`);
  w(`     AND m.number = ${q(p.m.number)} AND i.issue_key = ${q(p.i.issueKey)}`);
  w(`     AND i.is_primary ${p.i.isPrimary ? "IS TRUE" : "IS FALSE"} AND i.weight = ${p.i.weight} AND i.support_meaning = ${q(p.i.supportMeaning)};`);
}
// The chamber-gap sweep, per measure, against the measure's OWN chamber. This is the
// assertion form of rule 30's second corollary, applied to the wave's own output.
for (const c of CHAMBER) {
  w(`  SELECT count(*) INTO ${c.v} FROM vr_rollcalls r JOIN vr_measures m ON m.id = r.measure_id`);
  w(`   WHERE m.measure_type = ${q(c.m.measureType)} AND m.congress = ${c.m.congress} AND m.chamber = ${q(c.m.chamber)}`);
  w(`     AND m.number = ${q(c.m.number)} AND r.chamber = ${q(c.m.chamber)};`);
}
// Refused keys, counted across BOTH of this pass's measures at once, because
// gov_regulation was refused on both for one measured reason and either one landing is
// the same mistake.
for (const k of REFUSED_KEYS) {
  w(`  SELECT count(*) INTO n_refused_${k} FROM vr_measure_issues i`);
  w("   WHERE i.measure_id IN (SELECT m.id FROM vr_measures m WHERE");
  w("     " + measures.map((m) => `(m.measure_type = ${q(m.measureType)} AND m.congress = ${m.congress} AND m.chamber = ${q(m.chamber)} AND m.number = ${q(m.number)})`).join("\n     OR "));
  w(`   ) AND i.issue_key = ${q(k)};`);
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
// H.R. 1069 stays unmapped — restated from F1 and F2 because every wave since has been
// told in as many words not to invent a key for the 1069-class vocabulary gap unless the
// V1 standing rules all pass. They do not: the bill conditions a domestic K-12 grant on
// not partnering with a PRC-funded institute, and the vocabulary has no key for foreign
// influence in domestic institutions. F3 added zero keys.
w("  SELECT count(*) INTO n_unmapped FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id");
w("   WHERE m.measure_type = 'bill' AND m.congress = 119 AND m.chamber = 'house' AND m.number = 'H.R. 1069';");
// The two walls this wave is measured against, each as a number.
w("  SELECT count(*) INTO n_bb_senate FROM vr_rollcalls r");
w("    JOIN vr_measure_issues i ON i.measure_id = r.measure_id");
w("   WHERE r.chamber = 'senate' AND i.issue_key = 'broadband' AND i.is_primary;");
w("  SELECT count(*) INTO n_lp_senate FROM vr_rollcalls r");
w("    JOIN vr_measure_issues i ON i.measure_id = r.measure_id");
w("   WHERE r.chamber = 'senate' AND i.issue_key = 'lands_preserve' AND i.is_primary;");
w();
w(`  RAISE NOTICE '${LABEL}: % roll calls, % member votes, % issue mappings', n_rolls, n_votes, n_issues;`);
w(`  RAISE NOTICE '${LABEL}: H.R. 1069 carries % mapped issue row(s)', n_unmapped;`);
w(`  RAISE NOTICE '${LABEL}: % senate roll(s) now sit on a broadband PRIMARY measure, % on a lands_preserve PRIMARY measure', n_bb_senate, n_lp_senate;`);
for (const c of CHAMBER) w(`  RAISE NOTICE '${LABEL}: ${c.m.number} carries % roll call(s) in its own chamber (${c.m.chamber})', ${c.v};`);
for (const k of REFUSED_KEYS) w(`  RAISE NOTICE '${LABEL}: this pass''s measures carry % ${k} row(s) — READ AND REFUSED, so this must be 0', n_refused_${k};`);
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
for (const p of ROWS) {
  const dir = p.i.supportMeaning === "yea_opposes" ? "a yea withdraws it" : "a yea advances it";
  w(`  IF ${p.v} <> 1 THEN`);
  w(`    RAISE EXCEPTION '${LABEL}: the ${p.i.issueKey} w${p.i.weight} ${p.i.isPrimary ? "PRIMARY " : "secondary "}${p.i.supportMeaning} row on ${p.m.number} (${p.m.congress}th) did not land (found % row(s)). Polarity is load-bearing here: the resolution disapproves an agency document, so ${dir}, and a flipped row would publish every senator''s vote backwards.', ${p.v};`);
  w("  END IF;");
}
for (const c of CHAMBER) {
  w(`  IF ${c.v} < 1 THEN`);
  w(`    RAISE EXCEPTION '${LABEL}: ${c.m.number} is a ${c.m.chamber} measure and carries % roll call(s) in the ${c.m.chamber}. Runbook rule 30''s second corollary: a measure whose own chamber does not appear among its rolls is almost always an ingest gap, and creating one inside the wave meant to close one is the specific failure this assertion exists to catch.', ${c.v};`);
  w("  END IF;");
}
for (const k of REFUSED_KEYS) {
  w(`  IF n_refused_${k} <> 0 THEN`);
  w(`    RAISE EXCEPTION ${q(`${LABEL}: ${k} was READ AND REFUSED on this pass's measures and now carries % row(s). `
    + `The argument it contradicts, in full in ${DECISION_PATH}: ${REFUSED.get(k)}`)}, n_refused_${k};`);
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
w(`    RAISE EXCEPTION '${LABEL}: H.R. 1069 is deliberately unmapped and now carries % issue row(s). F1 refused nine candidate keys in writing, F2 re-refused them and F3 was told again not to invent one; see db/vr-federal-mapping-seed-f1.json before adding a row.', n_unmapped;`);
w("  END IF;");
w("  IF n_bb_senate < 1 THEN");
w(`    RAISE EXCEPTION '${LABEL}: the Senate holds only % decisive roll(s) on a broadband PRIMARY measure. Below 1 the primary wall in stance-helpers.js reopens and every senator reads incidental on broadband again — which was the state this wave found, with 88 rows unread and one non-primary row in the whole corpus. S.J.Res. 7 is the only instrument in the 119th that closes it.', n_bb_senate;`);
w("  END IF;");
w("  IF n_lp_senate < 1 THEN");
w(`    RAISE EXCEPTION '${LABEL}: the Senate holds only % decisive roll(s) on a lands_preserve PRIMARY measure, so lands_preserve is back to a House-only key and 90 senator rows go unread. H.J.Res. 140''s Senate passage roll is the only instrument in the 119th that closes it.', n_lp_senate;`);
w("  END IF;");
w("END $$;");

process.stdout.write(out.join("\n") + "\n");
process.stderr.write(
  `${seed.votes.length} rolls (all new) · ${seed.memberVoteCount} member votes attributed, ${seed.skippedVoteCount} skipped and counted · `
  + `${measures.length} measures (${newMeasures.length} created, ${existingMeasures.length} looked up) · `
  + `${totalIssueRows} issue rows across ${KEYS.length} keys (${KEYS.join(", ")}) · `
  + `${RETRACTIONS.length} retractions · ${refusedRows} refusals across ${REFUSED_KEYS.length} keys and ${decision._counts.rollCallsDeclined} declined rolls recorded · `
  + `${(decision.blockedOn || []).length} keys left blocked with a named instrument · `
  + `0 keys added · 0 floors moved · ${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
