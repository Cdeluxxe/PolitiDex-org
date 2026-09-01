#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f6.mjs — the ingest wave, and the eight files it converts
// ─────────────────────────────────────────────────────────────────────────────
// F6 is the first wave in this sequence that WRITES roll calls. F1-F3 mapped measures
// the corpus already held, F4 promoted one row's lane, F5 wrote nothing at all. This
// one pulls eleven contested standalone House passage votes that were not in
// vr_rollcalls, on eleven measures that were not in vr_measures, attributes 1,284
// member votes and maps eleven PRIMARY issue rows on four keys that were already live.
//
// An ingest wave's failure modes are not a mapping wave's, and they are not a no-write
// wave's either. There are nine, and this file closes all nine.
//
//   1. ATTRIBUTE A VOTE TO THE WRONG PERSON. The clerk writes "Smith (NE)", "Lee (NV)"
//      and "Nunn (IA)" precisely because surnames collide, and three of the eight slugs
//      this wave adds to the roster are such collisions. Section 3 requires every one of
//      the 1,284 rows to resolve bioguide → db/vr-member-map.json → slug and nowhere
//      else, requires the map to agree with the seed in both directions, and requires
//      the ceiling to be disclosed rather than implied.
//   2. PUBLISH A TALLY THAT NEVER HAPPENED. The roster holds 117 serving House members
//      and the chamber has 435. Section 3 requires each roll's totals to be the full
//      chamber — every attributed position under its own printed count, and the
//      headcount at or above the attributed row count — so a 216-206 vote can never be
//      published as the roster's 60-57 slice of it.
//   3. INGEST A PROCEDURAL ROLL. Section 4 requires all eleven questions to be the
//      plainest decisive form ("On Passage"), requires the losing side to clear rule
//      11's one-tenth bar on each, and requires no rule "providing for consideration"
//      anywhere in the wave.
//   4. INVENT A KEY, OR RESTUFF ONE. Section 5 requires keys added = 0, requires the six
//      standing vocab rules to be walked with a verdict each, requires the refused
//      District of Columbia key to fail on rule 5 by name, and requires issue-scope.js
//      and alignment-tool.js to be BYTE-IDENTICAL to HEAD — a wave that adds no key has
//      no business editing a published scope note, and CACHE_VERSION must therefore
//      stay where it is.
//   5. REVERSE A STANDING REFUSAL QUIETLY. Section 6 re-checks the F2/F3/F5 assertion
//      the same way they check it — zero issue mappings on H.R. 1069 in any migration —
//      and holds the gov_regulation and public_schools walls. The brief allows this
//      assertion to be reopened only by a NEW key argued in this wave's writeup, and
//      since this wave adds none, the exemption cannot fire; that is asserted, not
//      assumed.
//   6. CARRY A MEMBER OVER THE PRIMARY WALL WITH A SECONDARY. Runbook rule 30: at four
//      judged acts a member leaves the thin branch for the deep one, where a row with no
//      PRIMARY prints as "Not about this issue". Section 7 requires every one of the
//      eleven rows to be is_primary = true and every key used to gain at least one.
//   7. MOVE A FLOOR INSTEAD OF EARNING THE READ. Section 8 reads the nine floor literals
//      out of stance-helpers.js and pins them.
//   8. HIDE THE COST. Adding honest acts can make a record read WORSE, and here it does:
//      ten rows move from a one-directional tier to Split. Section 9 requires that cost
//      to be named member by member in the seed, requires zero rows to have stopped
//      being characterised, and requires the arithmetic of the conversion (2 + 11 = 13
//      against a floor of 12) to be stated with its one-act margin.
//   9. LET THE ENGINE DRIFT UNDER COVER OF A DATA WAVE. Section 10 boots HEAD and the
//      working tree side by side and requires Direction Match, the scoped read and every
//      per-issue row to come out identical. Twelve of the thirteen booted files are also
//      byte-identical; the thirteenth is consistency.js, which gained eleven _DOS_MECH
//      entries because a judged act owes a written mechanism line, and section 10 pins
//      that change to appended prose inside the curated map with nothing above or below
//      it moved. That is also why the shell bumped one version — section 5 requires the
//      bump and the log entry explaining it. Section 11 requires no party word in any
//      string this wave publishes, on the face or in the record.
//
// WHAT THIS FILE DOES NOT DO. It does not assert that the 113 rolls left in the gated
// pool are unmappable, that the four measures refused on the study-and-report rule were
// refused correctly, or that a District of Columbia key can never exist. All three are
// reopenable by a later pass on their own terms. What is pinned is what THIS wave did,
// and that its own record of it is true.
//
//   node scripts/test-vr-federal-wave-f6.mjs
//
// Read-only. No database, no network.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { CJ_SEAMS, SH_SEAMS, carveSeams, assertConsistencySeams, assertStanceHelpersSeam }
  from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MIG_DIR = "netlify/database/migrations";
const MIGS = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
const MIGRATION = "20261022000000_vr_federal_wave_f6.sql";
const DECIDE = "db/vr-federal-mapping-seed-f6.json";
const VOTES_FILE = "db/vr-federal-wave-f6-vote-seed.json";

const KEYS = ["energy_production", "permitting_reform", "lands_energy", "climate_action"];
const THE_EIGHT = ["adrian_smith", "dina_titus", "gabe_vasquez", "melanie_stansbury",
  "russ_fulcher", "susie_lee", "teresa_leger_fernandez", "zach_nunn"];

// ── 1. the artifacts exist, and they agree with each other ──────────────
console.log("\n  F6 — eleven contested standalone House rolls, ingested and mapped\n");
for (const f of [DECIDE, VOTES_FILE, join(MIG_DIR, MIGRATION), "db/vr-issue-seed.json",
                 "db/vr-member-map.json", "db/vr-roster-admitted.json"])
  ok(existsSync(join(ROOT, f)), `${f} is missing — the wave's own artifact`);

const decide = J(DECIDE);
const votes = J(VOTES_FILE);
const sql = R(join(MIG_DIR, MIGRATION));
const issueSeed = J("db/vr-issue-seed.json");
const memberMap = J("db/vr-member-map.json");
const roster = J("db/vr-roster-admitted.json");

{
  const c = decide._counts, v = votes._counts;
  eq(c.measures, 11, "the seed does not admit eleven measures");
  eq(c.rollcalls, 11, "the seed does not admit eleven roll calls");
  eq(c.issueRows, 11, "the seed does not carry eleven issue rows");
  eq(c.newKeys, 0, "keys added");
  eq(c.memberVotes, v.attributedMemberVotes,
    "the decision seed and the vote seed disagree about how many member votes this wave attributes");
  eq(v.rolls, 11, "the vote seed does not hold eleven rolls");
  eq(votes.rollCallCount, votes.votes.length, "rollCallCount disagrees with the file");
  eq(votes.memberVoteCount, votes.votes.reduce((a, r) => a + r.memberVotes.length, 0),
    "memberVoteCount disagrees with the file");
  eq(decide.measures.length, 11, "the seed's measures array is not eleven long");
  // One instrument, one act (the brief's words). Eleven measures, eleven rows, and no
  // measure carrying two keys — a package vote is allowed on a file with existing
  // stowaway disclosure and this wave has none, so the check is exact.
  const rows = decide.measures.flatMap((m) => m.issues || []);
  eq(rows.length, 11, "eleven measures did not produce eleven issue rows — one instrument, one act");
  for (const m of decide.measures)
    eq((m.issues || []).length, 1, `${m.number} carries more than one issue row`);
}

// ── 2. the census, and the ordering that makes it worth having ───────────
{
  const cen = decide.census;
  ok(/refusal record first/i.test(String(cen.ordering)),
    "the census must state the refusal-first ordering — F5's whole finding was that the order of the checks IS the census");
  const A = cen.questionA_refusalRecordFirst, B = cen.questionB_theFetchPool;
  ok(A.gateHolds > 40, `the refusal gate holds only ${A.gateHolds} named refusals`);
  const pre = A.appliedAsPrefilter;
  eq(pre.contestedRollsScreened - pre.alreadyRefusedByName, pre.survived,
    "the refusal pre-filter's arithmetic does not close");
  eq(pre.houseSurvived + pre.senateSurvived, pre.survived,
    "the surviving pool does not split into its two chambers");
  ok(pre.alreadyRefusedByName >= 50,
    `the refusal gate caught only ${pre.alreadyRefusedByName} contested rolls — F5's lesson is that this number is large`);

  // The funnel is a chain, so every step's `from` must be the previous step's `to`.
  // A funnel that does not close is a funnel someone wrote from memory.
  const f = B.funnel;
  ok(f.length >= 7, "the fetch-pool funnel has fewer than seven steps");
  for (let i = 1; i < f.length; i++)
    eq(f[i].from, f[i - 1].to, `funnel step "${f[i].step}" does not start where the previous step ended`);
  eq(f[f.length - 1].to, decide._counts.poolAdmitted, "the funnel does not end at the admitted count");
  eq(f[0].from, decide._counts.poolListed, "the funnel does not start at the listed count");
  // THE BRIEF'S STOP CONDITION. "If the fetch pool is empty after refusal-first, stop
  // and say so." It was not empty, and the seed has to say which it was.
  ok(/is not\b/i.test(String(B.poolIsNotEmpty)) && String(B.poolIsNotEmpty).length > 80,
    "the seed must record whether the pool was empty after the refusal gate — that was the brief's stop condition");
  ok(pre.survived > 11, "the pool did not exceed what the wave admitted, so nothing was left unread and the census claim is wrong");

  const C = cen.questionC_whichThinFilesAnewRollTouches;
  eq(C.memberFloor, 12, "the census quotes the wrong member floor");
  eq((C.theEightNamed || []).length, 8, "the census does not name eight thin files");
  for (const e of C.theEightNamed) {
    ok(THE_EIGHT.includes(e.pid), `the census names ${e.pid}, which is not one of the eight this wave converts`);
    eq(memberMap.map[e.bioguide], e.pid,
      `${e.pid}: the census's bioguide ${e.bioguide} does not resolve to this slug in db/vr-member-map.json`);
  }
  ok(/attribution, not vocabulary/i.test(String(C.theRealCause)),
    "the census must name the cause of the thin band as attribution rather than vocabulary — that is what decided the wave's shape");
  ok(/at least one issue mapping/i.test(String(C.floorCountsMappedRecords))
    && /_pdxRecordMappedCounts/.test(String(C.floorCountsMappedRecords)),
    "the census must trace, to the helper, that the member floor counts MAPPED records — that is why an "
    + "ingest-only wave converts nobody and why this one maps in the same pass");
}

// ── 3. attribution, and the ceiling ─────────────────────────────────────
{
  const SLUGS = new Set(Object.values(memberMap.map || {}));
  const POSITIONS = new Set(["yea", "nay", "present", "not_voting"]);
  let rows = 0;
  for (const v of votes.votes) {
    const at = `roll ${v.congress}/${v.session}/${v.rollNumber}`;
    const seen = new Set();
    const by = { yea: 0, nay: 0, present: 0, not_voting: 0 };
    for (const mv of v.memberVotes) {
      rows++;
      ok(!!mv.bioguideId, `${at}: a member vote carries no bioguideId`);
      eq(memberMap.map[mv.bioguideId], mv.politicianId,
        `${at} ${mv.bioguideId}: the roster map does not agree with the seed's slug`);
      ok(SLUGS.has(mv.politicianId), `${at}: "${mv.politicianId}" is not a roster slug`);
      ok(POSITIONS.has(mv.position), `${at}: position "${mv.position}" is outside the closed vocabulary`);
      ok(!seen.has(mv.politicianId), `${at}: ${mv.politicianId} appears twice on one roll`);
      seen.add(mv.politicianId);
      by[mv.position]++;
    }
    // THE ROSTER IS THE CEILING, NOT THE CHAMBER, checked per position: 50 attributed
    // yeas under a printed yea of 49 is impossible however the totals were assembled.
    const t = v.totals;
    const printed = { yea: t.yea, nay: t.nay, present: t.present, not_voting: t.notVoting };
    for (const pos of Object.keys(by))
      ok(by[pos] <= printed[pos],
        `${at}: ${by[pos]} attributed "${pos}" under a printed ${pos} of ${printed[pos]}`);
    const headcount = t.yea + t.nay + t.present + t.notVoting;
    ok(headcount >= v.memberVotes.length,
      `${at}: totals count ${headcount} members, fewer than the ${v.memberVotes.length} attributed`);
    ok(headcount >= 400,
      `${at}: totals count ${headcount} members — the House has 435 seats, so this is a roster subset, not a chamber tally`);
    eq(v._attributed, v.memberVotes.length, `${at}: the disclosed attributed count is wrong`);
    ok(v._unresolvedRecorded > 0,
      `${at}: the seed claims every recorded member resolved, which the 117-slug roster cannot do`);
    eq(v._fullChamberRecorded, v.memberVotes.length + v._unresolvedRecorded,
      `${at}: attributed + unresolved does not equal the recorded count`);
  }
  eq(rows, 1284, "the vote seed does not carry 1,284 attributed member votes");

  const ceiling = decide.attribution.ceiling;
  eq(ceiling.attributedPerRollMax, Math.max(...votes.votes.map((v) => v._attributed)),
    "the disclosed per-roll attribution ceiling is not the seed's own maximum");
  eq(ceiling.unresolvedRecordedTotal, votes.votes.reduce((a, v) => a + v._unresolvedRecorded, 0),
    "the disclosed unresolved total is not the seed's own sum");
  ok(/fail-closed/i.test(String(decide.attribution.rule)), "the attribution rule must be stated as fail-closed");
  ok(/surname/i.test(String(decide.attribution.whySurnameMatchingIsNotUsedAsAFallback)),
    "the seed must record why surname matching is not an attribution fallback");
  console.log(`      (attribution: ${rows} rows, ceiling ${ceiling.attributedPerRollMax}/roll, `
    + `${ceiling.unresolvedRecordedTotal} recorded members skipped as unresolved and counted)`);

  // THE EIGHT NEW SLUGS. The roster file is the ceiling on who may be attributed at
  // all, so a slug the wave votes must be admitted there as well as mapped.
  // The roster file keys its waves by the pass that admitted them, and the comment at
  // the top of it says never to re-home a slug — so the eight have to be in an F6 wave
  // of their own, not quietly folded into an older one.
  const waveLists = Object.entries(roster.waves || {}).filter(([, v]) => Array.isArray(v));
  const admitted = new Set(waveLists.flatMap(([, v]) => v));
  const f6Wave = waveLists.find(([k]) => /federal_wave_f6/i.test(k));
  ok(!!f6Wave, "db/vr-roster-admitted.json carries no federal_wave_f6 wave");
  if (f6Wave) {
    eq(f6Wave[1].length, 8, "the F6 roster wave does not admit eight slugs");
    eq(f6Wave[1].slice().sort().join(","), THE_EIGHT.slice().sort().join(","),
      "the F6 roster wave admits slugs other than the eight thin files the census named");
    for (const [k, v] of waveLists)
      if (k !== f6Wave[0])
        for (const pid of THE_EIGHT)
          ok(!v.includes(pid), `${pid} is also listed under ${k} — the wave is how a slug got here`);
  }
  for (const pid of THE_EIGHT) {
    ok(admitted.has(pid), `${pid} is not admitted in db/vr-roster-admitted.json`);
    ok(new Set(Object.values(memberMap.map)).has(pid), `${pid} does not resolve through db/vr-member-map.json`);
    const on = votes.votes.filter((v) => v.memberVotes.some((mv) => mv.politicianId === pid));
    eq(on.length, 11, `${pid} is not attributed on all eleven rolls, so the conversion arithmetic does not hold`);
    const sides = on.flatMap((v) => v.memberVotes.filter((mv) => mv.politicianId === pid).map((mv) => mv.position));
    eq(sides.filter((s) => s === "yea" || s === "nay").length, 11,
      `${pid} is recorded without a side on one of the eleven rolls — a not_voting still counts toward the floor but reads as no side`);
  }
  eq(roster.count, admitted.size,
    "db/vr-roster-admitted.json's count does not match the slugs it admits");
}

// ── 4. only decisive, only contested, and no rules ──────────────────────
{
  for (const v of votes.votes) {
    const at = `roll ${v.congress}/${v.session}/${v.rollNumber}`;
    ok(/^On Passage/i.test(v.question), `${at}: question "${v.question}" is not the passage form`);
    eq(v.admittedAs, "decisive", `${at}: not admitted as decisive`);
    eq(v.decisiveWhy, null, `${at}: carries a decisiveWhy, but "On Passage" needs no exception argued`);
    const pool = v.totals.yea + v.totals.nay;
    const losing = Math.min(v.totals.yea, v.totals.nay);
    ok(losing >= pool / 10, `${at}: the losing side is ${losing} of ${pool} — below rule 11's one-tenth bar`);
    eq(v._poolYeaNay, pool, `${at}: the disclosed yea+nay pool is wrong`);
    eq(v._losingSide, losing, `${at}: the disclosed losing side is wrong`);
    ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-0[45]:00$/.test(v.voteDate),
      `${at}: voteDate "${v.voteDate}" is not an ISO stamp with an Eastern offset`);
    ok(/^https:\/\/clerk\.house\.gov\/evs\//.test(v.sourceUrl), `${at}: the source is not the clerk's own XML`);
    // Every seeded roll must actually be written by the migration, on the tuple
    // vr_rollcalls is unique on, and looked back up so its id can carry the votes.
    ok(new RegExp(`VALUES \\([^)\\n]*,\\s*'house',\\s*${v.congress},\\s*${v.session},\\s*${v.rollNumber},`).test(sql),
      `${at}: the migration does not insert this roll`);
    ok(new RegExp(`chamber = 'house' AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber}\\b`).test(sql),
      `${at}: the migration does not read this roll back`);
  }
  const numbers = decide.measures.map((m) => m.number);
  eq(new Set(numbers).size, 11, "the eleven measures are not eleven distinct numbers");
  for (const n of numbers)
    ok(/^H\.R\. \d+$/.test(n), `${n} is not a standalone House bill — this wave admits no resolution and no rule`);
  ok(!/providing for consideration/i.test(sql),
    "the migration mentions a rule providing for consideration — floor procedure is not policy");
  // Contested is a measured property of the slice, not a claim: the seed publishes the
  // range and it has to be the range the vote seed actually holds.
  const shares = votes.votes.map((v) => v._losingSharePct);
  eq(votes._counts.losingShareRangePct[0], Math.min(...shares), "the disclosed minimum losing share is wrong");
  eq(votes._counts.losingShareRangePct[1], Math.max(...shares), "the disclosed maximum losing share is wrong");
  ok(Math.min(...shares) > 40,
    `the least contested roll in the slice is ${Math.min(...shares)}% — the wave claims a contested slice`);
}

// ── 5. the vocabulary: nothing added, nothing restuffed ─────────────────
{
  const vd = decide.vocabDecision;
  ok(/REFUSED/.test(String(vd.outcome)), "the new-key decision is not recorded as a refusal");
  eq((vd.sixRules || []).length, 6, "the six standing vocab rules were not all walked");
  const byRule = {};
  for (const r of vd.sixRules) {
    ok(/^\d\./.test(String(r.rule)), `a vocab rule is unnumbered: ${r.rule}`);
    ok(String(r.note || "").length >= 40, `vocab rule "${r.rule}" carries no argument`);
    ok(!!r.verdict, `vocab rule "${r.rule}" carries no verdict`);
    byRule[String(r.rule)[0]] = r;
  }
  // Rule 5 is the one that refuses this key, and the refusal has to be ON rule 5 —
  // a key refused only on "we did not get to it" is a key the next wave will add.
  ok(/FAIL/.test(String(byRule["5"].verdict)),
    "the District of Columbia key must fail vocab rule 5 (subject not vehicle) — that is the stated refusal");
  ok(/jurisdiction|venue/i.test(String(byRule["5"].note)),
    "rule 5's note must say that the jurisdiction is the venue and not the subject");
  ok(/FAIL/.test(String(byRule["6"].verdict)), "vocab rule 6 must be answered, not left open");

  // A key this wave uses must already exist, already be poled, and already be in the
  // published topic tree. NO RESTUFFING: not a *_balance key, not a no-pole key, and
  // not gov_regulation or public_schools standing in for a subject they do not cover.
  const align = R("alignment-tool.js");
  const scope = R("issue-scope.js");
  const scopeNoted = {};
  for (const k of KEYS) {
    ok(new RegExp(`^\\s*['"]?${k}['"]?\\s*:\\s*\\{`, "m").test(align),
      `${k} is not a key in alignment-tool.js's ISSUE_MAP — this wave adds none, so every key it uses was already published`);
    // issue-scope.js carries written scope for 47 of the live keys, not all of them:
    // three of the four this wave uses are noted there, lands_energy is not, and its
    // boundary lives in its ISSUE_MAP label and chip. That is a pre-existing state of
    // the vocabulary, so it is recorded rather than asserted away — what IS asserted is
    // that this wave did not edit either file (byte identity, below).
    scopeNoted[k] = new RegExp(`^\\s*${k}:\\s*\\{`, "m").test(scope);
    ok(!/_balance$/.test(k), `${k} is a *_balance key — _rdSuppressedKey() returns balance_key and the row never reads`);
  }
  eq(decide._counts.keysUsed.slice().sort().join(","), KEYS.slice().sort().join(","),
    "the keys the seed says it used are not the four this test knows about");
  const used = new Set(decide.measures.flatMap((m) => m.issues.map((i) => i.issueKey)));
  eq([...used].sort().join(","), KEYS.slice().sort().join(","), "the measures use keys the seed does not declare");
  for (const bad of ["gov_regulation", "public_schools", "states_federal_power", "enviro_balance"])
    ok(!used.has(bad), `${bad} was used to park a bill — the wave's own refusals say it was not`);

  // NO NEW KEY MEANS NO PUBLISHED BOUNDARY MOVED. Byte identity against HEAD is the
  // strongest available form of that, and it is what lets CACHE_VERSION stay put.
  const head = (f) => { try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return null; } };
  for (const f of ["issue-scope.js", "alignment-tool.js"]) {
    const h = head(f);
    if (ok(h !== null, `could not read HEAD:${f}`)) eq(R(f), h, `${f} changed, but this wave adds no key, so no published boundary moved`);
  }
  // AND THE SHELL BUMPED BY EXACTLY ONE, for a reason that is not the SQL. The rows
  // this wave writes are database-side and bump nothing. What is client-side is the
  // curated mechanism pair every judged act owes — eleven entries in _DOS_MECH in
  // consistency.js, a precached asset — so a warm device holding the old copy would
  // take the eleven new mappings and render all of them in the derived voice. That is
  // a shell asset change, and the rule for a shell asset change is a bump.
  //
  // COMMIT-INVARIANT ON PURPOSE. `git show HEAD:` reads the last commit, so a check
  // written as "the version is one higher than HEAD's" passes in this working tree and
  // fails the moment the change is committed and HEAD carries it too. Every assertion
  // here that can be made against the shipped file alone is made that way, and the
  // HEAD comparison is used only for the direction of travel, only when the two differ.
  //
  // AND PINNED TO F6'S OWN VERSION, not to whatever is newest. This block read the
  // CURRENT CACHE_VERSION's note while F6 was the newest thing in the tree, and that was
  // the same file either way. It stops being the same file the moment a LATER wave bumps
  // the shell for its own reasons: federal wave F7 ships twenty-eight more mechanism
  // pairs and moves the shell to v98, whose note is about war-powers rows that print no
  // direction and says nothing about eight congressional portraits — because F7 shipped
  // none. Reading the newest note would have failed F6's assertions on a tree where
  // everything F6 asserted is still true. So F6 reads the v97 entry it wrote, by number,
  // and the only thing it asks of the CURRENT version is that it is not BELOW v97 — a
  // later bump is somebody else's story, a rollback would be F6's problem.
  const F6_VERSION = 97;
  const swNow = R("sw.js");
  const cv = swNow.match(/CACHE_VERSION\s*=\s*'v(\d+)'/);
  const hv = (head("sw.js") || "").match(/CACHE_VERSION\s*=\s*'v(\d+)'/);
  if (ok(!!cv, "CACHE_VERSION is not readable in sw.js")) {
    if (hv && hv[1] !== cv[1]) eq(+cv[1], +hv[1] + 1, "CACHE_VERSION did not move by exactly one version");
    ok(+cv[1] >= F6_VERSION, `the shell is at v${cv[1]}, below the v${F6_VERSION} F6 shipped — F6's mechanism prose would reach nobody`);
    const noteAt = swNow.indexOf(`// v${F6_VERSION} `);
    ok(noteAt !== -1, `sw.js has no v${F6_VERSION} entry in the version log — the log is how the next reader knows what F6's bump was for`);
    // The whole entry, to wherever the previous version's entry starts — reading a
    // fixed number of bytes would silently stop checking the moment the note grew.
    const nextAt = swNow.indexOf(`// v${F6_VERSION - 1} `, noteAt);
    const note = swNow.slice(noteAt, nextAt === -1 ? noteAt + 4000 : nextAt);
    ok(/consistency\.js/.test(note), "F6's version note does not name the asset that changed");
    ok(/compare-hub\.js/.test(note), "F6's version note does not name the second shipped file — the portrait map moved too");
    ok(/monogram|initials/i.test(note), "F6's version note does not say what a warm device missing the new portraits would draw");
    ok(/derived/i.test(note), "F6's version note does not say what a warm device holding the old copy would show");
    ok(swNow.includes("'/consistency.js'"), "consistency.js is no longer a precached shell asset, which is what made this a bump at all");
  }
  ok(scope.length > 1000, "issue-scope.js did not load");
  eq(scopeNoted.energy_production, true, "energy_production lost its written scope note");
  eq(scopeNoted.permitting_reform, true, "permitting_reform lost its written scope note");
  eq(scopeNoted.climate_action, true, "climate_action lost its written scope note");
  eq(scopeNoted.lands_energy, false,
    "lands_energy gained a scope note — welcome, but this wave did not write it, so something else edited a published boundary in this tree");
}

// ── 6. the walls, and the F2/F3/F5 assertion they rest on ───────────────
{
  // Checked the same way F5 checks it: find the plpgsql variable that holds H.R. 1069's
  // measure id in each migration, then look for that variable inside any
  // INSERT INTO vr_measure_issues in the same file.
  // HOW A WALLED MEASURE COULD GAIN A ROW, and therefore what has to be scanned. A
  // migration reaches a measure id in one of three ways, and plpgsql spells two of them
  // with the variable on opposite sides of the keyword:
  //
  //     m_hr1069 := (SELECT id FROM vr_measures WHERE number = 'H.R. 1069');
  //     SELECT id INTO m_h_r_1069 FROM vr_measures WHERE number = 'H.R. 1069';
  //     INSERT INTO vr_measure_issues VALUES (74, 'public_schools', …)   -- the live id, inline
  //
  // The version of this scan the F5 harness shipped read `(\w+)\s*(?::=|INTO)`, which
  // captures the word BEFORE the keyword — right for `:=` and wrong for `INTO`, where it
  // captures "id" and the tripwire silently cannot fire. Both orders are read here, plus
  // the inline literal id, and the same correction is made in the F5 harness.
  // The scan runs on SQL with its comments removed, the way the F2 and F3 harnesses do
  // it: a commented-out INSERT is not a row, and a header sentence that reaffirms a wall
  // is not a violation of it.
  const stripSqlComments = (src) => {
    let out = "", i = 0, q = false;
    while (i < src.length) {
      if (q) { if (src[i] === "'") { if (src[i + 1] === "'") { out += "''"; i += 2; continue; } q = false; } out += src[i++]; continue; }
      if (src[i] === "'") { q = true; out += src[i++]; continue; }
      if (src[i] === "-" && src[i + 1] === "-") { while (i < src.length && src[i] !== "\n") i++; continue; }
      out += src[i++];
    }
    return out;
  };
  const LIVE_IDS = { "H.R. 1069": 74 };
  const mappedRowsFor = (number) => {
    const hits = [];
    const lit = number.replace(/\./g, "\\.");
    for (const f of MIGS) {
      const src = stripSqlComments(R(join(MIG_DIR, f)));
      if (!src.includes(number)) continue;
      const vars = new Set();
      for (const m of src.matchAll(new RegExp(`(\\w+)\\s*:=\\s*[\\s\\S]{0,200}?'${lit}'`, "g"))) vars.add(m[1]);
      for (const m of src.matchAll(new RegExp(`\\bINTO\\s+(\\w+)\\b[\\s\\S]{0,200}?'${lit}'`, "g"))) vars.add(m[1]);
      const id = LIVE_IDS[number];
      for (const m of src.matchAll(/INSERT INTO vr_measure_issues[\s\S]*?;/g)) {
        for (const v of vars) if (new RegExp(`\\(\\s*${v}\\s*,`).test(m[0])) hits.push(`${f} (${v})`);
        if (id != null && new RegExp(`\\(\\s*${id}\\s*,\\s*'`).test(m[0])) hits.push(`${f} (id ${id} inline)`);
        if (new RegExp(`SELECT id FROM vr_measures[^;]*'${lit}'`).test(m[0])) hits.push(`${f} (inline subquery)`);
      }
    }
    return [...new Set(hits)];
  };
  const mapped1069 = mappedRowsFor("H.R. 1069");
  eq(mapped1069.length, 0,
    `H.R. 1069 carries an issue mapping in a migration (${mapped1069.join(", ")}) — F1, F2 and F3 assert zero and F6 does not reverse it`);
  // The brief's one exemption: this assertion may be reopened only by a NEW key argued
  // in this wave's writeup, and not by public_schools. Since the wave adds no key, the
  // exemption cannot fire — asserted here rather than assumed, because the assertion
  // above is the one that would have to change first.
  eq(decide._counts.newKeys, 0,
    "this wave added a key, so the H.R. 1069 assertion above needs the vocab writeup read against the brief's exemption");
  // The wall is on the ROWS, not on the prose: this migration names public_schools twice
  // on purpose — once in its header to say the chip stands, once in the exception message
  // that fires if a later pass writes the row — and a check that banned the word would
  // punish the disclosure and miss the mapping.
  for (const ins of sql.matchAll(/INSERT INTO vr_measure_issues[\s\S]*?;/g))
    ok(!/public_schools/.test(ins[0]),
      "the migration writes a public_schools row — it remains a funding-level chip until a separate vocab decision says otherwise");
  const mapped973 = mappedRowsFor("H.R. 973");
  eq(mapped973.length, 0,
    `H.R. 973 carries an issue mapping in a migration (${mapped973.join(", ")}) — runbook rule 3 walls gov_regulation as the regulatory question rather than every mandate, and F5 re-refused it`);
  ok(!/'gov_regulation'/.test(sql), "the migration writes a gov_regulation row — eight of these eleven are permitting_reform's subject, not the rulebook's size");
  const walls = decide.vocabDecision.wallsReaffirmed || [];
  ok(walls.length >= 4, "fewer than four walls reaffirmed");
  const wallText = walls.map((w) => JSON.stringify(w)).join(" ");
  for (const needle of ["public_schools", "gov_regulation", "no_pole"])
    ok(wallText.includes(needle), `the walls do not name ${needle}`);
}

// ── 7. rule 30: every row is a PRIMARY, on purpose ──────────────────────
{
  const rows = decide.measures.flatMap((m) => m.issues.map((i) => ({ number: m.number, ...i })));
  for (const r of rows) {
    ok(r.isPrimary === true, `${r.number}/${r.issueKey} is not primary — at four judged acts a member with no PRIMARY prints "Not about this issue" (runbook rule 30)`);
    ok(r.weight >= 45 && r.weight <= 100, `${r.number}/${r.issueKey} carries weight ${r.weight}, outside the conventions`);
    ok(["yea_supports", "yea_opposes"].includes(r.supportMeaning), `${r.number}/${r.issueKey} has no readable polarity`);
    ok(String(r.rationale || "").length >= 200, `${r.number}/${r.issueKey}'s rationale is too short to be an argument`);
    // A rationale has to cite the text it read, not the bill's name.
    ok(/SEC\.|Sec\.|section \d|§/.test(r.rationale), `${r.number}/${r.issueKey}'s rationale cites no section of the text`);
  }
  for (const k of KEYS)
    ok(rows.some((r) => r.issueKey === k && r.isPrimary), `${k} gains no PRIMARY act this wave`);
  eq(rows.filter((r) => !r.isPrimary).length, 0, "a non-primary row shipped");
  // The migration must agree with the seed, row for row, and must carry the
  // pack-generation line the brief requires, flush left and exactly as written.
  ok(/^[ \t]*-- pack-generation: derived — the fingerprint moves with these rows; every\n[ \t]*--   affected member's pack retires and rebuilds on the next read\.$/m.test(sql),
    "the migration is missing the required two-line pack-generation comment, verbatim (leading indentation aside — it sits inside the DO block with the rows it describes)");
  const inserted = [...sql.matchAll(/\(m_[a-z0-9_]+, '([a-z_]+)', (\d+), (true|false), '(yea_[a-z]+)'/g)]
    .map((m) => ({ key: m[1], weight: +m[2], primary: m[3] === "true", polarity: m[4] }));
  eq(inserted.length, 11, "the migration does not write eleven issue rows");
  eq(inserted.filter((r) => !r.primary).length, 0, "the migration writes a non-primary row");
  for (const r of rows) {
    const hit = inserted.find((x) => x.key === r.issueKey && x.weight === r.weight && x.polarity === r.supportMeaning);
    ok(!!hit, `${r.number}/${r.issueKey} w${r.weight} ${r.supportMeaning} is in the seed but not in the migration`);
  }
  // And the curated mirror in db/vr-issue-seed.json, which is what
  // scripts/test-vr-vote-seed.mjs resolves a seeded roll's measure against.
  for (const m of decide.measures) {
    const mir = (issueSeed.measures || []).find((x) => x.congress === 119 && x.number === m.number);
    if (!ok(!!mir, `${m.number} is not mirrored in db/vr-issue-seed.json — its rolls would rank nothing`)) continue;
    eq((mir.issues || []).length, m.issues.length, `${m.number}: the mirror carries a different number of rows`);
    for (const i of m.issues) {
      const mi = (mir.issues || []).find((x) => x.issueKey === i.issueKey);
      if (!ok(!!mi, `${m.number}/${i.issueKey} is missing from the mirror`)) continue;
      eq(mi.weight, i.weight, `${m.number}/${i.issueKey}: the mirror's weight disagrees`);
      eq(mi.isPrimary, i.isPrimary, `${m.number}/${i.issueKey}: the mirror's lane disagrees`);
      eq(mi.supportMeaning, i.supportMeaning, `${m.number}/${i.issueKey}: the mirror's polarity disagrees`);
      eq(mi.rationale, i.rationale, `${m.number}/${i.issueKey}: the mirror's rationale is not the shipped one`);
    }
  }
  // DATA ONLY, AND NOT ONE OBJECT DECLARED. No schema change, and nothing existing
  // rewritten: an ingest wave that UPDATEs or DELETEs a live mapping is a promote or a
  // retraction wearing an insert. The ban covers temporary tables too, and it is not
  // pedantry — this migration sorts after the newest drizzle snapshot, so the next
  // `generate` diffs against a snapshot that predates it and re-emits any DDL it finds
  // (scripts/test-vr-corrections.mjs is the guard that says so, and it reads a temp
  // table as a declaration like any other). The eleven roll ids the wave-scoped checks
  // need are held in a plpgsql array instead, which declares nothing.
  for (const bad of [/\bALTER TABLE\b/i, /\bCREATE (TEMP(ORARY)?\s+)?TABLE\b/i, /\bDROP TABLE\b/i,
                     /\bCREATE (OR REPLACE )?(FUNCTION|VIEW|TYPE|SEQUENCE|TRIGGER|SCHEMA)\b/i,
                     /\bUPDATE vr_/i, /\bDELETE FROM vr_/i, /\bTRUNCATE\b/i, /\bCREATE INDEX\b/i])
    ok(!bad.test(sql), `the migration matches ${bad} — this wave is data-only and declares no object`);
  ok(/roll_ids integer\[\]/.test(sql) && /= ANY\(roll_ids\)/.test(sql),
    "the wave-scoped verification no longer holds its eleven roll ids in a local array — if it went back to a temp table, the snapshot guard fires");
}

// ── 8. the floors, unmoved ──────────────────────────────────────────────
{
  const sh = R("stance-helpers.js");
  const FLOORS = { _RD_MIN_JUDGED: "4", _RD_MIN_PRIMARY: "1", _RD_THIN_MIN: "2", _RD_MIN_STRENGTH: "4",
    _RD_SPLIT_MIN_JUDGED: "6", _RD_SPLIT_MIN_SIDE: "2" };
  for (const [name, want] of Object.entries(FLOORS)) {
    const m = sh.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
    if (ok(!!m, `the ${name} literal is not in stance-helpers.js`)) eq(m[1], want, `${name} moved`);
  }
  const dom = sh.match(/_RD_DOMINANCE\s*=\s*([\d.]+)/);
  if (ok(!!dom, "the _RD_DOMINANCE literal is not in stance-helpers.js")) eq(dom[1], "0.75", "_RD_DOMINANCE moved");
  const mf = sh.match(/_RD_MEMBER_FLOOR\s*=\s*(\d+)/);
  if (ok(!!mf, "the member floor literal is not in stance-helpers.js")) eq(mf[1], "12", "the member floor moved");
  ok(/_PDX_RD_MEMBER_FLOOR/.test(sh), "the member floor is no longer re-exported on window, so the harnesses cannot read it");
}

// ── 9. the cost, published ──────────────────────────────────────────────
{
  const rd = decide.readDisclosure;
  eq(rd.promotes, 0, "this wave promotes a row");
  eq(rd.retractions, 0, "this wave retracts a row");
  eq(rd.weightChanges, 0, "this wave changes an existing weight");
  eq(rd.polarityChanges, 0, "this wave changes an existing polarity");
  const me = rd.measuredEffect;
  ok(!!me, "the wave publishes no measured read effect — a densification wave has to measure its own cost");
  ok(/vr-federal-fpi\.mjs/.test(String(me.harness)), "the measured effect names no harness that reproduces it");
  eq(me.rowsThatStoppedBeingCharacterised, 0,
    "a row stopped being characterised — the no-loss promise is the one an ingest wave must keep");
  ok(/`?read`? flag/i.test(String(me.howThatWasChecked)) && /rule 36/i.test(String(me.howThatWasChecked)),
    "the no-loss check must be stated as being on the row model's own read flag over every pid (runbook rule 36), not on shape counters");
  ok(me.rowsThatStartedBeingCharacterised > 0, "the wave gained no readings at all, so nothing converted");
  const dir = me.theTenRowsThatChangedDIRECTION;
  ok(!!dir, "the ten rows that change direction are not disclosed");
  ok((dir.rows || []).length >= 10, `only ${(dir.rows || []).length} direction changes are named — each is a member whose published label moves`);
  for (const r of dir.rows || [])
    ok(/^[a-z_]+ [a-z_]+ (mostly|strong|thin) → split$/.test(r), `"${r}" is not a named row in pid key from → to form`);
  ok(/H\.R\. 3746/.test(String(dir.theCause)),
    "the cause of the direction changes must name the pre-existing act that now sits on the other side");
  ok(/aguilar/.test(String(dir.workedExample)) && /judged=8/.test(String(dir.workedExample)),
    "the disclosure must carry one worked example with the row model's own counters, or it cannot be checked");
  ok(/_RD_DOMINANCE/.test(String(dir.noFloorWasMoved)),
    "the disclosure must name the floor a wave could have moved to make the splits disappear");
  const conv = me.theEightConverted;
  ok(/13/.test(String(conv.after)), "the conversion arithmetic is not stated");
  ok(/[Oo]ne act/.test(String(conv.marginOverTheFloor)), "the one-act margin over the floor is not disclosed");
  eq(decide._counts.actsAfterWave, decide._counts.actsGainedPerThinMember + 2,
    "acts after the wave is not the two existing acts plus what this wave attributes");
  ok(decide._counts.actsAfterWave > decide._counts.memberFloor,
    "the converted members do not clear the member floor, so the wave does not do what it says");
  ok(String(rd.primaryWallChecked || "").includes("rule 30"), "the primary wall was not checked against rule 30 by name");
  console.log(`      (read effect: ${me.bandBefore} → ${me.bandAfter}, `
    + `${me.rowsThatStartedBeingCharacterised} rows gained, 0 lost, ${(dir.rows || []).length} changed direction)`);
}

// ── 9b. the eight it converts can be shared without losing their face ───
// ────────────────────────────────────────────────────────────────────────
// This is the obligation an ATTRIBUTION wave takes on and a mapping-only wave
// does not. The eight were absent from db/vr-member-map.json, so no roll call
// could name them and no vote-derived Official Record card could exist for them.
// After this wave each of the eight attributes 13 acts, which means each can be
// the subject of a share card — an image with a real face on it, whose #record=
// link paints before or entirely without a Firestore round trip. A member who
// attributes votes with no BUNDLED portrait shows a face on the card and a
// party-tinted monogram on the page it opens: same person, two faces, one of
// them no face at all. So the portrait is checked here, against the SAME
// Bioguide the ingest attributes through, because a portrait keyed to the wrong
// member is the King-Hinds collision with the halves swapped — right votes,
// someone else's face, and nothing that looks wrong from either end.
{
  const src = R("compare-hub.js");
  const open = src.indexOf("var BROWSE_PHOTOS = {");
  const map = open === -1 ? "" : src.slice(open, src.indexOf("\n    };", open));
  ok(open !== -1, "BROWSE_PHOTOS is not in compare-hub.js, so the bundled photo tier cannot be checked");
  const photos = {};
  for (const m of map.matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*'([^']+)'/gm)) photos[m[1]] = m[2];
  const bios = JSON.parse(R("db/vr-member-map.json")).map || {};
  const slugToBio = {};
  for (const [bio, slug] of Object.entries(bios)) slugToBio[slug] = bio;
  // The hosts the share card can actually proxy: netlify.toml's remote_images is
  // the second copy of this list, and a portrait outside it draws a monogram.
  const toml = R("netlify.toml");
  // The entries are REGEXES in a TOML basic string, so the dots arrive escaped
  // twice over; compare hosts, which is what the CDN resolves on.
  const allowed = [...(/remote_images\s*=\s*\[([\s\S]*?)\n\s*\]/.exec(toml) || ["", ""])[1]
    .matchAll(/"([^"]+)"/g)]
    .map((m) => m[1].replace(/\\+/g, "").replace(/^\^?https?:\/\//i, "").split("/")[0].toLowerCase())
    .filter(Boolean);
  for (const pid of THE_EIGHT) {
    const url = photos[pid];
    if (!ok(!!url, `${pid} attributes ${decide._counts.actsAfterWave} acts after this wave and has no bundled portrait — a shared card of theirs opens on initials`)) continue;
    ok(/^https:\/\//.test(url), `${pid}: the portrait is not an https URL`);
    const host = (url.split("/")[2] || "").toLowerCase();
    ok(allowed.includes(host),
      `${pid}: the portrait host ${host} is not in netlify.toml's remote_images, so the share card cannot proxy it and draws a monogram`);
    const inUrl = (/\/([A-Z]\d{6})\.(?:jpg|jpeg|png)$/.exec(url) || [])[1];
    ok(!!inUrl, `${pid}: the portrait URL carries no readable Bioguide, so nothing can check whose face it is`);
    if (inUrl) eq(inUrl, slugToBio[pid],
      `${pid}: the portrait is keyed to ${inUrl} but the ingest attributes this slug's votes through ${slugToBio[pid]} — right votes, another member's face`);
  }
  console.log(`      (share pool: ${THE_EIGHT.length}/${THE_EIGHT.length} converted members carry a bundled portrait keyed to their own Bioguide)`);
}

// ── 10. the twin boot ───────────────────────────────────────────────────
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "consistency.js", "voting-record.js", "word-action.js",
];
const nowSrc = (f) => readFileSync(join(ROOT, f), "utf8");
const headSrc = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { return null; }
};
function boot(get, label) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of FILES) {
    const src = get(f);
    if (src === null) return null;
    try { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); } catch (e) { /* same handling in both trees */ }
  }
  return win;
}
{
  // ONE BOOTED FILE MOVED, AND IT HAD TO. consistency.js gained eleven _DOS_MECH
  // entries because scripts/test-mechanism-completeness.mjs gates every judged
  // roll-call act on carrying a written mechanism line — an ingest wave that creates
  // judged acts takes on that debt at the moment it writes the rows, and the honest
  // place to pay it is the same pass. So the waiver is named, it is exactly one file,
  // and what is asserted about it is that the change is additive prose inside the
  // curated map: no engine constant, no branch and no arithmetic. Every other booted
  // file is still byte-identical, and the three sweeps below then require the outputs
  // to be identical too — which is the property the byte check was standing in for.
  // The waiver is a ceiling, not a floor: once this wave is committed HEAD carries the
  // same consistency.js and the diff is empty, so what is asserted is that NOTHING
  // OUTSIDE the waiver moved, and the shape of the change is checked only while there
  // is a change to read. The eleven entries themselves are asserted below against the
  // shipped file, which holds either way.
  // cmp-data.js joins the waiver because a ROSTER wave's whole product is new identity rows
  // in it: federal_roster_r1_sep2026 admits 315 sitting House members, because the House
  // corpus held 7,298 recorded positions the fail-closed ingest had to skip for want of a
  // roster slug. Forbidding the file outright forbids the only legal way to admit anyone.
  // The additive price is paid in scripts/test-person-crawl-block.mjs section 9, which pins
  // the roster row by row against HEAD — nobody dropped, HEAD's order kept, no existing
  // row's judged surface moved — and the Direction Match sweep below still holds every
  // profile HEAD had bit-for-bit.
  // stance-helpers.js joins the waiver for the person-file chrome pass (v103), and it
  // is a SEAM, not a licence: the file is still compared byte for byte everywhere
  // outside _pdxStanceRecordStats, and what changed inside that span is argued below
  // rather than excused. The span used to count formal ISSUE ROWS out of an index
  // that is empty until the roll-call cache warms, which is how the mid-page card
  // came to call a record "still being built" underneath a letterhead counting 23
  // acts. It now also reports the act count and whether the lane has answered.
  // No wave input is in there — no floor, no mapping, no weight, no score.
  const WAIVED = ["consistency.js", "cmp-data.js", "stance-helpers.js"];
  // The seam arguments below want a substring assertion; these suites carry ok/eq only.
  const has = (s, n, m) => ok(String(s).includes(n), `${m} — missing ${JSON.stringify(n)}`);
  const touched = FILES.filter((f) => { const h = headSrc(f); return h !== null && h !== nowSrc(f); });
  const stray = touched.filter((f) => !WAIVED.includes(f));
  eq(stray.join(", "), "",
    `F6 changed a booted file outside its declared waiver (${stray.join(", ")}) — a data wave has no business editing the engine`);

  if (touched.includes("stance-helpers.js")) {
    const sa = carveSeams(headSrc("stance-helpers.js"), SH_SEAMS, "HEAD", "stance-helpers.js", ok);
    const sb = carveSeams(nowSrc("stance-helpers.js"), SH_SEAMS, "now", "stance-helpers.js", ok);
    eq(sb.pinned, sa.pinned,
      "stance-helpers.js changed outside the record-CTA stats seam — the stance resolver this " +
      "whole profile is built from is not a chrome pass's to touch");
    assertStanceHelpersSeam(sb.bodies, { has, ok });
  }
  if (touched.includes("consistency.js")) {
    const a = headSrc("consistency.js"), b = nowSrc("consistency.js");
    const mech = (src) => {
      const i = src.indexOf("var _DOS_MECH = {");
      const j = src.indexOf("\n  };", i);
      return i === -1 || j === -1 ? null : { before: src.slice(0, i), map: src.slice(i, j), after: src.slice(j) };
    };
    const ma = mech(a), mb = mech(b);
    if (ok(!!ma && !!mb, "_DOS_MECH is not locatable in consistency.js on both sides")) {
      // ABOVE _DOS_MECH, WITH TWO NAMED SEAMS. The person-file chrome pass (v103)
      // edited the official scope's empty COPY and the token ladder that chooses it,
      // both of which sit above the mechanism map. A flat byte compare here would
      // forbid a copy fix this suite has no stake in, so the two spans are cut by
      // anchors unique on both sides, the remainder is compared byte for byte, and
      // what is inside the spans is argued: no floor, no band, no weight, no score.
      const ca = carveSeams(ma.before, CJ_SEAMS, "HEAD", "consistency.js", ok);
      const cb = carveSeams(mb.before, CJ_SEAMS, "now", "consistency.js", ok);
      eq(cb.pinned, ca.pinned, "consistency.js changed above _DOS_MECH outside the two named v103 copy seams — the waiver is for curated prose, not for the engine");
      assertConsistencySeams(cb.bodies, { has, ok });
      eq(mb.after, ma.after, "consistency.js changed below _DOS_MECH — the waiver is for curated prose, not for the renderer");
      ok(mb.map.startsWith(ma.map),
        "an existing _DOS_MECH entry was edited — this wave only appends, because rule 21 leaves a live rationale with its first writer");
      // WHOSE APPEND IS IT? While F6 was the newest wave the appended entries were F6's
      // eleven, and counting them here was the same as reading F6's diff. Once F6 is
      // committed the delta against HEAD belongs to whoever came next — F7 appends
      // twenty-eight — so a count of eleven would be an assertion about a later wave's
      // size, made by the wrong harness. What F6 can still say about an append it did not
      // write is the part that is about F6: no later entry may key on a measure F6 read
      // and REFUSED, because a mechanism line exists to explain a live judged mapping and
      // one naming these numbers would mean a wall F6 argued was quietly taken. F6's own
      // eleven pairs are asserted against the shipped file in the block below, which
      // holds whether the diff is empty or not.
      const appended = mb.map.slice(ma.map.length);
      const F6_REFUSED = ["H.R. 3015", "H.R. 3638", "H.R. 3109", "H.R. 3617", "H.R. 4553", "H.R. 1834"];
      for (const num of F6_REFUSED)
        ok(!appended.includes(`'${num}|`),
          `a later wave appended mechanism prose for ${num}, which F6 read and refused — a study-and-report bill does not become a policy vote by being explained`);
    }
  }
  {
    // AND THE ELEVEN PAIRS ARE IN THE SHIPPED FILE, checked without reference to HEAD:
    // sourced from the text rather than from the short title (four of these titles name a
    // virtue, not a mechanism), and carrying no party word on the face.
    const src = nowSrc("consistency.js");
    const i = src.indexOf("var _DOS_MECH = {");
    const map = i === -1 ? "" : src.slice(i, src.indexOf("\n  };", i));
    const PARTY_IN_MECH = /\b(Republicans?|Democrats?|Democratic|GOP|partisan|bipartisan)\b/i;
    for (const m of decide.measures) {
      const key = `'${m.number}|119|${m.issues[0].issueKey}': {`;
      const at = map.indexOf(key);
      if (!ok(at !== -1, `${m.number}/${m.issues[0].issueKey} is a judged act this wave creates and it carries no mechanism pair — it would render in the derived voice`)) continue;
      const entry = map.slice(at, map.indexOf("\n    },", at) + 1) || map.slice(at, at + 2000);
      const did = /did: '((?:[^'\\]|\\.)*)'/.exec(entry);
      const why = /why: '((?:[^'\\]|\\.)*)'/.exec(entry);
      if (!ok(!!did && !!why, `${m.number}: the mechanism pair is missing one of its two slots`)) continue;
      ok(did[1].trim().length > 60, `${m.number}: "what it did" is too short to say what the text does`);
      ok(why[1].trim().length > 60 && why[1].length <= 340, `${m.number}: "why it counts here" is outside the face's length rules`);
      ok(did[1].trim() !== m.shortTitle,
        `${m.number}: the "what it did" line is the short title — this wave has four titles that name a virtue rather than a mechanism`);
      ok(!PARTY_IN_MECH.test(entry),
        `${m.number}: the mechanism pair names a party — the party split stays in the roll's totals, off the face`);
      ok(!/§/.test(did[1] + why[1]) && !/\bU\.S\.C\.\s*\d/.test(did[1] + why[1]),
        `${m.number}: a statute citation is on the row face`);
    }
  }

  const head = boot(headSrc, "HEAD");
  const work = boot(nowSrc, "working");
  if (ok(!!(head && head.PDXWordAction && head.PDXWordAction.read), "the pre-wave engine booted from HEAD")
    && ok(!!(work && work.PDXWordAction && work.PDXWordAction.read), "the current engine booted")) {
    const PIDS = Object.keys(head.CMP_DATA || {});
    ok(PIDS.length > 100, `the roster booted (${PIDS.length} profiles)`);
    // The roster GREW, and that is a later roster wave's product rather than this wave's
    // drift: everyone HEAD had is still here (checked next), and every one of their Direction
    // Match figures is held bit-for-bit below, which is what this equality was protecting.
    // Pinning the count instead would forbid every future admission.
    ok(Object.keys(work.CMP_DATA || {}).length >= PIDS.length, "the roster shrank");
    eq(PIDS.filter((p) => !work.CMP_DATA[p]).length, 0, "a profile HEAD had is gone from the roster");

    const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
    const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked", "notIssueLinked", "recordDerived", "warming"];
    let dm = 0, dmBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.read(pid); } catch (e) { continue; }
      try { b = work.PDXWordAction.read(pid); } catch (e) { b = null; }
      if (!a) continue;
      if (!b) { dmBad++; failures.push(`${pid}: Direction Match stopped returning`); continue; }
      dm++;
      for (const k of READ_KEYS) if (b[k] !== a[k]) { dmBad++; failures.push(`${pid}: DM ${k} moved — ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`); }
      const ca = a.coverage || {}, cb = b.coverage || {};
      for (const k of COV_KEYS) if (cb[k] !== ca[k]) { dmBad++; failures.push(`${pid}: DM coverage.${k} moved`); }
    }
    ok(dm > 100, `the Direction Match sweep was wide enough to mean something (${dm} profiles)`);
    eq(dmBad, 0, "Direction Match drifted — F6 writes roll calls and mappings to the database, and no score, no stance and no support_meaning of any existing row");

    let scoped = 0, scopedBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.scopedRead(pid, head.CMP_DATA[pid]); } catch (e) { continue; }
      try { b = work.PDXWordAction.scopedRead(pid, work.CMP_DATA[pid]); } catch (e) { b = null; }
      if (!a) continue;
      if (!b) { scopedBad++; failures.push(`${pid}: the scoped read stopped returning`); continue; }
      scoped++;
      if (JSON.stringify(b.delta) !== JSON.stringify(a.delta)) { scopedBad++; failures.push(`${pid}: the all-time/term delta moved`); }
      for (const slice of ["main", "current"]) {
        const sa = a[slice], sb = b[slice];
        if (!!sa !== !!sb) { scopedBad++; failures.push(`${pid}: the ${slice} slice appeared or vanished`); continue; }
        if (!sa || !sb) continue;
        if (sb.pct !== sa.pct) { scopedBad++; failures.push(`${pid}: ${slice}.pct moved — ${sa.pct} → ${sb.pct}`); }
        if (sb.publishable !== sa.publishable) { scopedBad++; failures.push(`${pid}: ${slice}.publishable moved`); }
      }
    }
    ok(scoped > 100, `the scoped-read sweep was wide enough to mean something (${scoped} profiles)`);
    eq(scopedBad, 0, "the current-term slice drifted");

    let rows = 0, rowBad = 0;
    for (const pid of PIDS) {
      let ra = [], rb = [];
      try { ra = head.PDXConsistency.issueRows(pid) || []; } catch (e) { continue; }
      try { rb = work.PDXConsistency.issueRows(pid) || []; } catch (e) { rb = []; }
      if (rb.map((r) => r.key).join("|") !== ra.map((r) => r.key).join("|")) { rowBad++; failures.push(`${pid}: the issue-row list changed`); }
      const byKey = {};
      for (const r of rb) byKey[r.key] = r;
      for (const r of ra) {
        const q = byKey[r.key];
        if (!q) continue;
        rows++;
        let sa = null, sb = null;
        try { sa = head.PDXConsistency.rowResult(r); } catch (e) { sa = { __err: 1 }; }
        try { sb = work.PDXConsistency.rowResult(q); } catch (e) { sb = { __err: 1 }; }
        if (!sa || !sb) continue;
        for (const k of ["state", "metric", "pct"]) if (sb[k] !== sa[k]) { rowBad++; failures.push(`${pid}/${r.key}: row ${k} moved`); }
        if ((q.verdict || {}).token !== (r.verdict || {}).token) { rowBad++; failures.push(`${pid}/${r.key}: the verdict moved`); }
      }
    }
    ok(rows > 500, `the issue-row sweep was wide enough to mean something (${rows} rows)`);
    eq(rowBad, 0, "a per-issue row drifted");
    console.log(`      (twin boot: ${dm} DM reads, ${scoped} scoped reads, ${rows} issue rows — all identical)`);
  }
}

// ── 11. no party word in anything a reader sees ─────────────────────────
{
  // The party split IS measured — it is in each roll's totals, where the model already
  // carries it — and it is never a reason. So the check is on the prose that reaches a
  // reader: the rationales the migration writes, their mirror in the curated seed, and
  // the refusals the seed publishes.
  const PARTY = /\b(Republican|Democrat|Democratic|GOP|partisan|bipartisan|left-wing|right-wing|conservative|liberal)\b/i;
  let scanned = 0;
  const scan = (text, where) => { scanned++; const m = PARTY.exec(String(text || "")); ok(!m, `${where} names a party ("${m && m[0]}") — the record is the formal record`); };
  for (const m of decide.measures) {
    for (const i of m.issues) { scan(i.rationale, `${m.number}/${i.issueKey} rationale`); scan(m.purpose, `${m.number} purpose`); }
    for (const d of m.declinedKeys || []) scan(d.why, `${m.number} declined ${d.issueKey}`);
  }
  for (const m of (issueSeed.measures || []).filter((x) => /Federal wave F6/.test(String(x._comment || ""))))
    for (const i of m.issues || []) scan(i.rationale, `db/vr-issue-seed.json ${m.number}/${i.issueKey}`);
  for (const m of sql.matchAll(/'(yea_[a-z]+)', '((?:[^']|'')+)'\)/g)) scan(m[2].replace(/''/g, "'"), "a migration rationale");
  ok(scanned >= 40, `only ${scanned} strings were scanned for party language`);
  // The measurement itself must still be there — a wave that deleted the party split to
  // pass this check would have thrown away a chamber measurement.
  for (const v of votes.votes)
    ok(v.partyTotals && Object.keys(v.partyTotals).length >= 2,
      `roll ${v.rollNumber}: the chamber's party split is not recorded — it is a measurement off the source, kept out of the reasoning, not deleted`);
}

if (failures.length) {
  console.error(`\n  ✗ F6: ${failures.length} failure(s) of ${passed + failures.length} checks\n`);
  for (const f of failures.slice(0, 40)) console.error(`    - ${f}`);
  if (failures.length > 40) console.error(`    … ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\n  ✓ F6: all ${passed} checks passed`);
console.log(`    11 measures · 11 passage rolls · ${votes.memberVoteCount} attributed member votes · 11 PRIMARY rows on 4 live keys`);
console.log(`    0 keys added · 0 floors moved · 0 rows unread · 8 members thin → readable\n`);
