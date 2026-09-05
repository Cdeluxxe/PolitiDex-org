#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f10.mjs — the wave whose product was the measurement
// ─────────────────────────────────────────────────────────────────────────────
// F10 is the wave briefed as "F5: standalone PRIMARYs for the remaining chamber gap".
// It ships no mapping row, no measure, no roll call, no vote seed, no key, no floor and
// no migration — and unlike F5, which stopped after a census that found nothing to
// convert, F10 went on to sweep the corpus instrument by instrument and refuse all
// thirty-three candidates on their own enacted text. So this file has two jobs, and the
// second is the unusual one.
//
// JOB ONE: the ordinary no-write guarantees. Nothing was written; every "after" counter
// equals its "before"; the pool reconciles; every refusal carries a reason and a price.
//
// JOB TWO: pin the reason the brief's own success condition was unreachable, so that a
// later curator reading the brief and the seed side by side does not conclude the wave
// was lazy. The brief asked to rank keys by "rows that would become readable if this key
// gained a Senate-reachable PRIMARY". That number is ZERO on every key in the corpus,
// and it is zero for a reason that lives in stance-helpers.js rather than in the mapping
// table: _RD_MIN_PRIMARY gates nothing any more. Both of its consumers were removed by
// an earlier pass, the constant survives on two lines and both only word the pkgNote
// disclosure sentence, and test-characterise-every-act.mjs carries a brief forbidding
// its restoration. Section 6 asserts that state directly, because if a future pass puts
// the lock back, THIS WAVE'S CENTRAL FINDING BECOMES FALSE and the refusals below stop
// being refusals — they become forty measures somebody declined for a stale reason.
//
// The brief's mutation clause is answered by inversion, on purpose and in writing:
//
//   "Mutation: flipping one PRIMARY off must move the unread census."
//
// Against the shipped engine that assertion FAILS, because is_primary is a label. F5
// already measured all 28 promotable acts across 17 keys at +0 / -0, one at a time. So
// section 6 asserts the true property in both directions — the flag must not move a
// census row, and the seed must SAY it inverted the requirement and why. A test that
// asserted the brief's version verbatim would be a test that passes only on a broken
// engine.
//
// AND ONE THING THIS FILE DELIBERATELY DOES NOT DO. It does not assert that any of the
// thirty-three refused instruments is unmappable in principle. Two are explicitly marked
// revisitable in the seed — H.R. 8823, whose text holds up and which only this wave's
// chamber-gap charter excludes, and the seven Iran resolutions, which come back as one
// fifteen-instrument subject the day war_powers is given a pole. What is pinned is that
// the refusals were argued from text and priced, not that they are permanent.
//
//   node scripts/test-vr-federal-wave-f10.mjs
//
// Exit code is non-zero on the first failure so it can gate CI.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MIG_DIR = "netlify/database/migrations";
const DECIDE = "db/vr-federal-mapping-seed-f10.json";
const decide = J(DECIDE);
const MIGS = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql"));
const C = decide._counts || {};

// ── 1. the census was rebuilt, and it reconciles against itself ─────────
// The brief's first instruction was "census first — do not reuse F4's leftover list".
// A rebuilt census is not provable from a JSON file, but an INTERNALLY CONSISTENT one
// is, and a fabricated one almost never is: the reason breakdown has to sum to the
// total, the suppressed-plus-absent-plus-missing decomposition has to sum to the same
// total, and the two chambers have to sum to the roster. Three independent sums over
// numbers that came out of three different fpi invocations.
{
  const cen = decide.census || {};
  const sen = cen.senate || {}, hou = cen.house || {}, ros = cen.roster || {};
  ok(/rebuilt/i.test(String(cen.rebuiltNotReused || "")) && /F4/.test(String(cen.rebuiltNotReused || "")),
    "the census block must state that it was rebuilt rather than inherited from F4, which is the brief's first instruction");

  const sumReasons = Object.values(ros.unreadByReason || {}).reduce((a, b) => a + b, 0);
  eq(sumReasons, (ros.unreadRows || {}).before, "the roster unread reason breakdown does not sum to the roster unread total");
  // The roster is WIDER than the two federal chambers: `--set all` publishes Utah state
  // legislators too, and they hold no congressional roll call, so 523 of the roster's
  // unread rows were never inside this wave's reach at all. The identity that has to
  // close is therefore three-way, and the seed has to name the third term rather than
  // let the roster total quietly exceed the sum of its chambers.
  eq((sen.unreadRows || {}).before + (hou.unreadRows || {}).before + C.stateLegislatureUnreadRows,
    (ros.unreadRows || {}).before,
    "Senate + House + state-legislature unread does not equal the roster unread total");
  eq(C.federalUnreadBefore, (sen.unreadRows || {}).before + (hou.unreadRows || {}).before,
    "the federal unread figure must be exactly the two chambers and nothing else — it is the only population a federal mapping can reach");
  ok(C.stateLegislatureUnreadRows > 0 && /no congressional roll|no federal roll/i.test(
      String((cen.whichPopulationEachNumberCounts || {}).stateLegislators || "")),
    "the state-legislature remainder must be named and explained, not absorbed into a federal number");
  const sumSen = Object.values(sen.unreadByReason || {}).reduce((a, b) => a + b, 0);
  eq(sumSen, (sen.unreadRows || {}).before, "the Senate unread reason breakdown does not sum to the Senate unread total");

  // Two figures, two methods, one wall — and they must not be added to each other.
  // The DERIVED figure comes off the reason column over the whole roster; the MEASURED
  // figure is what --reach simulated over the two federal chambers. The decomposition
  // of the roster uses the derived one; the measured one is checked against the keys it
  // was measured on.
  eq(C.structurallySuppressedRowsRoster + C.memberAbsenceRows + C.missingRollcallRows, C.rosterUnreadBefore,
    "suppressed + member-absence + missing-rollcall must account for EVERY unread row, or some unread row is unexplained");
  eq(C.structurallySuppressedRowsRoster, (ros.unreadByReason || {}).no_pole_read + (ros.unreadByReason || {}).no_side,
    "the roster suppression figure must be exactly no_pole_read + no_side — every row of both is muted before any wall");
  eq(C.federalRowsWithAMeasuredCeilingOfZero, (sen.rowsOnThoseTenKeys || 0) + (hou.rowsOnThoseElevenKeys || 0),
    "the measured zero-ceiling total does not equal the Senate ten-key plus House eleven-key volume");
  ok(C.federalRowsWithAMeasuredCeilingOfZero < C.structurallySuppressedRowsRoster,
    "the measured federal figure must be a strict subset of the derived roster figure — if it ever exceeds it, the two universes have been added together somewhere");
  ok(/same wall|narrower window|two independent methods/i.test(JSON.stringify(cen.theBriefsPremiseMeasured || []) + JSON.stringify(cen.whichPopulationEachNumberCounts || {})),
    "the seed must say that the derived and measured figures are one finding seen twice, or a reader will treat 3612 and 3164 as two separate walls");

  // Nothing moved, because nothing was written.
  for (const [label, blk] of [["senate", sen], ["house", hou], ["roster", ros]]) {
    eq((blk.unreadRows || {}).after, (blk.unreadRows || {}).before, `${label} unread moved in a wave that wrote no row`);
  }
  eq((sen.keysWithASenatePrimary || {}).after, (sen.keysWithASenatePrimary || {}).before,
    "the Senate PRIMARY key count moved in a wave that shipped no PRIMARY");
  eq(C.rosterUnreadAfter, C.rosterUnreadBefore, "_counts disagrees with itself about whether the census moved");
  eq(C.rowsConverted, 0, "a wave with an empty measures[] cannot have converted a row");
  eq(C.rowsThatStillCannotConvert, C.rosterUnreadAfter,
    "every unread row that survives the wave is a row that still cannot convert, and the two numbers must agree");

  // vehicle_only before/after, which the brief asks for by name, in both chambers.
  for (const [label, blk] of [["senate", sen], ["house", hou]]) {
    for (const reason of ["vehicle_only", "incidental", "mixed_thin"]) {
      const v = blk[reason] || {};
      eq(v.before, 0, `${label} ${reason} before — the brief asks for this number and the corpus no longer emits the reason`);
      eq(v.after, v.before, `${label} ${reason} moved`);
    }
  }
  ok((ros.reasonsTheCorpusNoLongerProduces || []).includes("vehicle_only"),
    "the roster block must record vehicle_only as a reason the corpus no longer produces — that is the finding, not an omission");

  // Reachable unread is the brief's own ranking metric and it is zero in both chambers.
  eq(C.reachableUnreadSenate, 0, "reachable unread, Senate");
  eq(C.reachableUnreadHouse, 0, "reachable unread, House");
  ok((cen.theBriefsPremiseMeasured || []).length >= 4,
    "the brief's premise was refuted by measurement and the measurements must be enumerated, not summarised");
  ok((cen.whatIsActuallyReachable || []).some((s) => /n=1 and n=2/i.test(s)),
    "the n=1 / n=2 identity is the finding that redirects the next wave and must be written down");
}

// ── 2. the pool reconciles, and every candidate has a verdict ───────────
// "Report must include: keys considered, admitted, blocked-on." A pool sweep is only
// auditable if the arithmetic closes: every measure that holds a roll call and no issue
// mapping is either an argued refusal or an argued exclusion, and the parts sum to the
// whole. Forty-one measures went in; forty-one have to come out.
{
  const drc = decide.declinedRollCalls || [];
  const dm = decide.declinedMappings || [];
  const nonInst = decide._nonInstrumentsExcluded || {};
  const countMeasures = (arr) => arr.reduce((n, e) => n + (Array.isArray(e.measures) ? e.measures.length : 1), 0);

  eq(countMeasures(drc), C.declinedRollCallMeasures, "the declinedRollCalls entries do not hold the number of measures _counts claims");
  eq(countMeasures(dm), C.declinedMappingMeasures, "the declinedMappings entries do not hold the number of measures _counts claims");
  eq(drc.length, C.declinedRollCallEntries, "declinedRollCalls entry count");
  eq(dm.length, C.declinedMappingEntries, "declinedMappings entry count");
  eq(C.declinedRollCallMeasures + C.declinedMappingMeasures + C.nonInstrumentsExcluded, C.measuresWithARollAndNoMapping,
    "the pool does not reconcile: Senate refusals + House refusals + non-instruments must equal the enumerated pool");
  eq(C.senateReachableInstrumentsConsidered, C.declinedRollCallMeasures, "Senate instruments considered vs refused");
  eq(C.houseReachableInstrumentsConsidered, C.declinedMappingMeasures, "House instruments considered vs refused");
  eq(nonInst.count, C.nonInstrumentsExcluded, "the non-instrument count disagrees with _counts");
  ok(/special rule|Speaker/i.test(String(nonInst.whatTheyAre || "")) && String(nonInst.whyExcluded || "").length > 80,
    "the non-instruments must be named and their exclusion argued, not dropped");

  // Every refusal names the keys it weighed and prices what the refusal cost.
  let argued = 0, keysNamed = 0;
  for (const e of [...drc, ...dm]) {
    const label = Array.isArray(e.measures) ? e.measures.join("/") : e.measure;
    const why = Array.isArray(e.declinedBecause) ? e.declinedBecause.join(" ") : String(e.declinedBecause || "");
    if (ok(why.length > 160, `${label}: the refusal is too short to be an argument (${why.length} chars)`)) argued++;
    if (ok(Array.isArray(e.keysConsidered) ? e.keysConsidered.length > 0 : /war_powers/.test(why),
      `${label}: a refusal must name the keys it weighed`)) keysNamed++;
    ok(String(e.measuredCost || "").length > 10, `${label}: the refusal is not priced — an unpriced refusal is unauditable`);
  }
  eq(argued, drc.length + dm.length, "every candidate must carry an argued refusal");
  eq(keysNamed, drc.length + dm.length, "every candidate must name the keys considered");
  ok(C.keysConsideredAcrossAllCandidates >= 40, "the wave weighed fewer keys than a real sweep would");

  // The four instruments whose SHORT TITLE points at the wrong key are the wave's most
  // reusable finding. If a later pass admits one of them off its title, this fails.
  const byNum = new Map(dm.filter((e) => e.measure).map((e) => [e.measure, e]));
  for (const [num, mustSay] of [["H.R. 3106", /exercise/i], ["H.R. 1676", /State Wildlife Action Plan/i],
                                ["H.R. 3424", /Shared Property|office space|federal office/i], ["H.R. 8897", /may establish|permissive|sunset/i]]) {
    const e = byNum.get(num);
    if (ok(!!e, `${num} must be in the swept pool — its short title is the trap`)) {
      const why = Array.isArray(e.declinedBecause) ? e.declinedBecause.join(" ") : String(e.declinedBecause);
      ok(mustSay.test(why), `${num}: the refusal must rest on what the text DOES, not on what the short title says`);
    }
  }

  // Blocked-on is the brief's third required output and each entry must be priced too.
  const bo = decide.blockedOn || [];
  eq(bo.length, C.blockedOnEntries, "blockedOn entry count");
  ok(bo.length >= 4, "unread volume that cannot convert is a written blocked-on, and there is more than one class of it");
  for (const b of bo) ok(String(b.blockedOn || "").length > 60, `a blocked-on entry states no blocker: ${JSON.stringify(b.what)}`);
  const supp = bo.find((b) => /suppress/i.test(JSON.stringify(b)));
  ok(!!supp, "the largest blocked-on class is the suppressed keys and it must be named with its size");
  if (supp) {
    eq(supp.roster, C.structurallySuppressedRowsRoster, "the suppressed blocked-on entry disagrees with _counts about its own size");
    eq(supp.senate + supp.house + (supp.stateLegislators || 0), supp.roster,
      "the suppressed blocked-on entry does not decompose into the populations it claims");
    eq(supp.senate + supp.house, C.federalRowsWithAMeasuredCeilingOfZero,
      "the federal part of the suppressed class must be exactly what --reach measured at a ceiling of zero");
    eq((supp.keys || []).length, supp.distinctKeys, "the suppressed key list does not hold the number of distinct keys the entry claims");
    ok(supp.keyChamberPairsMeasuredAtZero === (decide.census.senate.keysWithUnreadVolumeAndACeilingOfZero
      + decide.census.house.keysWithUnreadVolumeAndACeilingOfZero),
      "the 21 measured pairs must be the Senate ten plus the House eleven — distinct keys and key-chamber pairs are different counts and the entry must not swap them");
  }
  ok(bo.some((b) => /no_side_taken/.test(JSON.stringify(b))), "the member-absence class must be a written blocked-on");
}

// ── 3. the attribution ceiling is chamber headcount ─────────────────────
// The brief requires it, and --reach asserts it live on every simulated key: a synthetic
// instrument with every member voting Yea may attribute at most the chamber's headcount
// and never one more. Pinned here against the roster the engine actually boots, so the
// numbers in the seed cannot drift away from the people who exist.
{
  eq(C.attributionCeilingSenate, 102, "the Senate attribution ceiling must be the Senate headcount on the roster");
  eq(C.attributionCeilingHouse, 435, "the House attribution ceiling must be the House headcount");
  eq((decide.census.senate || {}).members, C.attributionCeilingSenate, "the census disagrees with the ceiling about how many senators exist");
  eq((decide.census.house || {}).members, C.attributionCeilingHouse, "the census disagrees with the ceiling about how many representatives exist");
  const reach = R("scripts/vr-federal-fpi.mjs");
  ok(/attribution ceiling holds at chamber headcount/.test(reach),
    "--reach must assert the ceiling in its own output, so the claim is measured on every run and not just recorded here");
  ok(/pids\.length/.test(reach) && /--reach/.test(reach), "--reach must exist in the fpi and be driven by the roster's own member list");
}

// ── 4. nothing was written ──────────────────────────────────────────────
// The failure mode a no-write wave actually has. One quiet row is worse than an
// admitted retreat, and an EMPTY migration written to satisfy the shape of the brief is
// worse still: it bumps the pack key for no mapping change, which is the one thing the
// runbook's no-write subsection tells a curator not to do.
{
  eq((decide.measures || []).length, 0, "measures[] must be empty");
  eq((decide.promotes || []).length, 0, "promotes[] must be empty — a promote moves a label");
  eq((decide.retractions || []).length, 0, "retractions[] must be empty — no standing PRIMARY was found stale");
  eq(C.rowsShipped, 0, "rowsShipped");
  eq(C.migrationsWritten, 0, "migrationsWritten");
  eq(C.voteSeedsWritten, 0, "voteSeedsWritten");
  eq(C.issueKeysAdded, 0, "issueKeysAdded");
  eq((decide.vocab || {}).keysAdded.length, 0, "vocab.keysAdded must be empty");

  const strays = MIGS.filter((f) => /f10|wave_f10|federal_wave_10/i.test(f));
  eq(strays.length, 0, `F10 wrote a migration (${strays.join(", ")}) — this wave ships no row, so a migration for it is a row nobody argued`);
  // The reserved stamp. F10's own seed says 20261028000000 is "recorded here and not
  // consumed, so the next wave takes it", so a file appearing there is the sentence coming
  // true and not a breach. What F10 still has to be able to say is that the file is not
  // F10's — that nothing was slipped in under a stamp F10 reserved and disowned. So the
  // check moved from "the stamp is empty" to "the stamp is empty, or it belongs to a wave
  // that declares it in its own seed". F11 consumed it.
  {
    const at28 = MIGS.filter((f) => f.startsWith("20261028"));
    ok(at28.length <= 1, `more than one migration at the reserved stamp (${at28.join(", ")})`);
    for (const f of at28) {
      ok(!/f10/i.test(f), `${f} sits at the stamp F10 reserved and carries F10's name — this wave ships no row`);
      const seeds = readdirSync(join(ROOT, "db")).filter((x) => /^vr-federal-mapping-seed-.*\.json$/.test(x));
      const owner = seeds.find((x) => R(join("db", x)).includes(f));
      ok(!!owner,
        `${f} consumed the prefix F10 reserved, and no db/vr-federal-mapping-seed-*.json declares it `
        + "— a migration at a reserved stamp that no wave owns is a row nobody argued");
      if (owner) ok(!/f10/.test(owner), `${f} is declared by ${owner}, which is F10's own seed`);
    }
  }
  ok(!existsSync(join(ROOT, "db/vr-federal-wave-f10-vote-seed.json")),
    "no vote seed: every candidate already held its roll call in the corpus, so there was nothing to ingest");

  const faces = decide.acceptanceFaces || {};
  ok(/no vote seed|none was needed/i.test(String(faces.noVoteSeedWasNeeded || "")),
    "the brief asks for a vote seed from chamber XML; the reason there is none must be stated rather than left as an omission");
  ok(/20261027000000|unchanged/i.test(String(faces.noMigration || "")), "the migration tail must be named as unchanged");
  ok(/govinfo|engrossed/i.test(String(faces.noVoteSeedWasNeeded || "")),
    "bill text must be sourced to the primary print, not to a tracker");
  ok(/SAME|same/.test(String(faces.packKeyUnmoved || "")),
    "a no-write wave records the mapping version it started and ended at and that they are the same");
  ok(C.migrationsWritten === 0 && /pack key/i.test(String(faces.noMigration || "") + String(faces.packKeyUnmoved || "")),
    "the pack-key consequence of not writing a migration must be stated");

  // The seed must be reachable by the census tool, or the record is a file nobody reads.
  const fpi = R("scripts/vr-federal-fpi.mjs");
  ok(/vr-federal-mapping-seed-f10\.json/.test(fpi), "f10 must be registered in the fpi WAVES map so the projection can be re-run");
}

// ── 5. the six vocab rules, and the two keys that did not ship ──────────
// "No new issue keys unless a bill is refused solely for a missing chip and it clears
// the six vocab rules." Two keys were proposed and both were refused. The refusals have
// to name the rule they failed, and the instruments they would have served have to be
// instruments this wave actually refused for a missing chip — otherwise a proposal is
// theatre attached to a decision made elsewhere.
{
  const v = decide.vocab || {};
  eq((v.refusedProposals || []).length, C.issueKeysProposedAndRefused, "refused key proposals");
  const refusedNums = new Set((decide.declinedMappings || []).flatMap((e) => Array.isArray(e.measures) ? e.measures : [e.measure]));
  for (const p of v.refusedProposals || []) {
    ok(/POLARITY|RECURRENCE|synonym/i.test(String(p.refusedOn || "")),
      `${p.proposed}: a key proposal must be refused against a named vocab rule`);
    ok(String(p.refusedOn || "").length > 120, `${p.proposed}: the refusal is too short to be an argument`);
    for (const served of p.wouldHaveServed || []) {
      const num = String(served).split(" ").slice(0, 2).join(" ");
      ok(refusedNums.has(num), `${p.proposed} claims to serve ${num}, which is not in this wave's refused pool`);
    }
  }
  // A key proposal may not be the way a wall gets walked around.
  ok(!/(_balance|no_pole)/.test((v.keysAdded || []).join(" ")), "keysAdded is empty, so it cannot contain a suppressed key");
  const taxo = R("CORE_NATIONAL_ISSUES.md");
  ok(!/human_rights_sanctions|daylight_saving/.test(taxo),
    "a refused key proposal must not appear in the published taxonomy — proposing and shipping are different acts");
}

// ── 6. the floors, and the mutation clause answered by inversion ────────
// The two halves of the wave's central finding. First the floors: byte-identical, as the
// brief requires, read out of the shipped file rather than trusted from the seed. Then
// the reason the brief's mutation clause could not be honoured as written.
{
  const sh = R("stance-helpers.js");
  const lit = (name, want) => {
    const m = sh.match(new RegExp(`${name}\\s*=\\s*([0-9.]+)`));
    if (ok(!!m, `${name} is not in stance-helpers.js`)) eq(m[1], want, `${name} moved`);
  };
  lit("_RD_MIN_PRIMARY", "1");
  lit("_RD_MIN_JUDGED", "4");
  lit("_RD_THIN_MIN", "2");
  lit("_RD_THIN_MIN_STRENGTH", "0.6");

  // _RD_NO_POLE decides 3164 of 3874 unread rows. Its membership is the wave's premise.
  // A membership map, not a Set — `var _RD_NO_POLE = { key: 1, … }` with a gloss comment
  // per line, which is why the keys are parsed off the left of each colon rather than
  // split on commas.
  const np = sh.match(/_RD_NO_POLE\s*=\s*\{([\s\S]*?)\n\s*\};/);
  if (ok(!!np, "_RD_NO_POLE is not in stance-helpers.js")) {
    const keys = [...np[1].matchAll(/^\s*([a-z_]+)\s*:/gm)].map((m) => m[1]);
    eq(keys.length, 13, "_RD_NO_POLE changed size — the suppressed volume this wave measured was measured against 13 keys");
    for (const k of ["war_powers", "guard_authority", "states_federal_power", "tariffs_authority", "state_standing",
                     "homeless", "crypto_cbdc", "tariffs_prices"]) {
      ok(keys.includes(k), `${k} left _RD_NO_POLE — a refusal in this seed was priced against its being in there`);
    }
  }
  ok(/_rdSuppressedKey/.test(sh) && /balance_key/.test(sh),
    "_rdSuppressedKey and the balance_key verdict are the mechanism 1215 unread rows rest on");

  // THE MUTATION CLAUSE, INVERTED. _RD_MIN_PRIMARY may appear in stance-helpers.js only
  // in the disclosure sentence. If a comparison against it reappears in a tier, band,
  // read or floor decision, the lock is back and this wave's finding is false.
  const primLines = sh.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => l.includes("_RD_MIN_PRIMARY") && !/^\s*(\/\/|\*)/.test(l));
  ok(primLines.length > 0, "_RD_MIN_PRIMARY vanished entirely — the seed's finding is about a decommissioned constant, not a deleted one");
  for (const [n, l] of primLines) {
    const isDecl = /_RD_MIN_PRIMARY\s*=/.test(l);
    const isDisclosure = /pkg|Note|disclos/i.test(l);
    ok(isDecl || isDisclosure,
      `stance-helpers.js:${n} reads _RD_MIN_PRIMARY outside the disclosure sentence — the primary lock is back, and F10's whole census `
      + `(3874 unread rows, all 33 refusals, reachable-unread zero) was measured on the premise that it is gone. `
      + `See the brief in scripts/test-characterise-every-act.mjs before changing this.`);
  }
  ok(existsSync(join(ROOT, "scripts/test-characterise-every-act.mjs")),
    "the suite that carries the do-not-restore brief must exist, because this section defers to it");

  // And the seed must SAY it inverted the brief's clause, with the reason. A silently
  // inverted requirement is indistinguishable from a skipped one.
  const inv = (decide.blockedOn || []).find((b) => /mutation/i.test(String(b.what || "")));
  ok(!!inv, "the seed must record that the brief's mutation clause was answered by inversion");
  if (inv) {
    ok(/flipping one PRIMARY off must move/.test(String(inv.spec || "")), "the inverted requirement must be quoted verbatim before it is answered");
    ok(/would fail against a correct engine|deliberately/i.test(JSON.stringify(inv)),
      "the inversion must state that the clause as written would fail against a correct engine");
    ok(/test-vr-federal-wave-f10/.test(String(inv.shippedInstead || "")), "the inversion must point at what shipped instead");
  }
}

// ── 7. no party anywhere, in any reason ─────────────────────────────────
// Party-line as a reason is banned by the brief. Nothing here reaches a reader — no row
// shipped, so there is no reader-facing rationale at all — but the refusals are the
// record a later curator inherits, and a party string in a refusal is a party string in
// the reasoning. The one place a tally appears is the Iran entry, which is required to
// mark it as having played no part.
{
  const PARTY = /\b(Republican|Democrat|Democratic|GOP|left-wing|right-wing|liberal|the right|the left)\b/;
  const scan = (blob, where) => {
    const s = JSON.stringify(blob);
    const m = s.match(PARTY);
    ok(!m, `${where} contains a party string (${m && m[0]}) — party-line as a reason is banned`);
  };
  for (const e of decide.declinedRollCalls || []) scan(e, `declinedRollCalls/${(e.measures || [e.measure]).join(",")}`);
  for (const e of decide.declinedMappings || []) scan(e, `declinedMappings/${(e.measures || [e.measure]).join(",")}`);
  scan(decide.blockedOn, "blockedOn");
  scan(decide.vocab, "vocab");

  // "Would help the pattern look fuller" is not a reason, and no refusal may read as
  // its inverse either — an admit justified by the size of the coverage gain.
  const iran = (decide.declinedRollCalls || [])[0] || {};
  ok(/played no part/i.test(String(iran.notRefusedFor || "")),
    "the one entry that records roll tallies must state that they played no part in the decision");
  // "Would help the pattern look fuller" is not a reason — but a refusal is allowed to
  // QUOTE that sentence while obeying it, and one here does: H.R. 8823's text holds up
  // and it is refused precisely because admitting it would be densification wearing a
  // gap-closing label. So the sweep is per sentence, and a sentence carrying the phrase
  // clears only if it also carries the mark of a refusal. A bare affirmative use — the
  // phrase with nothing rejecting it — still fails.
  const HUNGER = /would help|look fuller|needed the coverage|for the coverage/i;
  const REJECTS = /\bnot a reason\b|refuses|refused|banned|forbid|which the brief|would be densification|is not why/i;
  const hungry = [];
  for (const e of decide.declinedMappings || []) {
    const why = Array.isArray(e.declinedBecause) ? e.declinedBecause.join(" ") : String(e.declinedBecause || "");
    for (const sent of why.split(/(?<=[.;])\s+/)) {
      if (HUNGER.test(sent) && !REJECTS.test(sent)) hungry.push(`${e.measure || (e.measures || []).join("/")}: "${sent.trim()}"`);
    }
  }
  eq(hungry.length, 0, `a refusal reasoned from how the pattern would look is not a reason — ${hungry.join(" | ")}`);
  const quoting = (decide.declinedMappings || []).filter((e) => HUNGER.test(JSON.stringify(e.declinedBecause || "")));
  ok(quoting.length > 0,
    "at least one refusal should be resting on the coverage-hunger clause rather than leaving the brief's hardest sentence unused");
  ok((decide.acceptanceFaces || {}).noPartyAnywhere && /no reader-facing rationale/i.test(String(decide.acceptanceFaces.noPartyAnywhere)),
    "the seed must state that no reader-facing rationale was written, because that is why the party sweep is trivially clean");
}

// ── 8. twin boot: formal tiers and Direction Match against pre-F10 ──────
// F10 edits no shipped file at all — its whole footprint is db/ and scripts/ — so the
// strongest available form of this check is the strict one: boot HEAD and the working
// tree side by side and require every Direction Match read, every scoped read and every
// per-issue row to come out identical. A later wave's shipped-file change would surface
// here as a stray, which is correct: it means the comparison is no longer about F10 and
// the waiver has to be written down before it is granted.
{
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
  const touched = FILES.filter((f) => { const h = headSrc(f); return h !== null && h !== nowSrc(f); });
  // WHOSE EDIT THIS IS, AND WHY IT DOES NOT DISSOLVE THE CHECK. The sentence above
  // is about F10: a wave whose product is a measurement has no business editing the
  // thing it measured, and if F10's own diff reached one of these files the audit
  // would be marking its own homework. But this suite runs in whatever tree it finds
  // itself in, and later work legitimately edits renderers. The issue-file doors pass
  // (v133) put a link on the issue title and made a one-measure dossier teach its
  // measure, which touches three of these files and moves no figure.
  //
  // So the three renderers are named, and every other file in FILES is still pinned
  // byte for byte. Naming them is not a waiver of the comparison — the comparison is
  // the whole rest of this section, and it reads FIGURES: every Direction Match
  // field, every issue-row state, metric, percentage and verdict token, on every
  // profile in the roster, out of both trees. A renderer that quietly changed one
  // would fail there and the reason would be legible. What the byte pin bought over
  // and above that was the guarantee that F10 shipped no renderer change at all; a
  // pass that adds itself to the list below has to say so in writing, here, which is
  // the same price and the same paper trail.
  const MAY_RENDER = ["consistency.js", "word-action.js", "alignment-tool.js"];
  const stray = touched.filter((f) => MAY_RENDER.indexOf(f) < 0);
  eq(stray.length, 0,
    `F10 changed a booted engine file (${stray.join(", ")}) — a wave whose product is a measurement has no business editing the thing it measured`);

  // THESE AUDITS ARE NOT SAFE TO RUN CONCURRENTLY WITH EACH OTHER, and this is where you
  // find out. scripts/test-vr-federal-wave-f8.mjs proves its identity walls by MUTATING
  // SHIPPED FILES IN PLACE: its wall 2 rewrites cmp-data.js on disk to rename
  // "alan_armstrong" to "alan_armstrong_ROW_ABSENT_FOR_THIS_MUTATION", runs a generator
  // against it, and restores the bytes in a finally. That is correct in isolation and F8
  // guards the restore with its own git-status check. But every twin-boot suite in this
  // tree reads the working copy FROM DISK, so a suite booting during F8's mutation window
  // sees a roster with one person renamed and reports "a profile HEAD had is gone" —
  // naming the record for a fault that belongs to a test harness three processes away.
  //
  // That is what happened here, and it cost a wrong diagnosis before it cost a right one.
  // This suite passed twice alone and failed the moment it was launched alongside F8; F5's
  // audit fails the same way for the same reason, and reproduces at HEAD because the cause
  // was never in the tree. The first guess was memory pressure truncating a boot, which
  // the error message below was widened to test — and it immediately refuted itself by
  // reporting 1120 of 1120 profiles loaded and zero exceptions thrown on both sides. The
  // key was not missing; it had been RENAMED underneath the read.
  //
  // So two guards, and the exceptions are kept rather than swallowed. The sibling suites
  // write `catch (e) { /* same handling in both trees */ }` here; a bare swallow means a
  // half-booted sandbox is indistinguishable from a real regression. Both trees are
  // allowed to throw — a sandbox is not a browser and some of these files reach for chrome
  // that is not there — but they must throw the SAME things.
  function boot(get, label) {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    const errs = [];
    for (const f of FILES) {
      const src = get(f);
      if (src === null) return null;
      try { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); }
      catch (e) { errs.push(`${f}: ${e && e.message}`); }
    }
    win.__bootErrs = errs;
    return win;
  }
  // GUARD ONE: refuse to compare against a tree another suite is holding open. The marker
  // only ever exists inside F8's mutation window, so its presence is never a real tree
  // state and every comparison below it would be measuring the wrong thing.
  const MUTATION_MARKER = "_FOR_THIS_MUTATION";
  const midMutation = FILES.filter((f) => nowSrc(f).includes(MUTATION_MARKER));
  ok(midMutation.length === 0,
    `${midMutation.join(", ")} carries a test harness's mutation marker (${MUTATION_MARKER}), so another audit is `
    + `mid-flight and has the working copy rewritten on disk right now — scripts/test-vr-federal-wave-f8.mjs `
    + `renames a roster row for its identity walls and restores it in a finally. Nothing below this line would be `
    + `a comparison. RUN THE WAVE AUDITS SEQUENTIALLY, not in parallel.`);

  const head = boot(headSrc, "HEAD"), work = boot(nowSrc, "now");
  if (head && work) {
    const he = (head.__bootErrs || []).join("\n"), we = (work.__bootErrs || []).join("\n");
    ok(he === we,
      `the two trees did not boot the same way, so nothing compared below is a comparison. `
      + `This is usually resource pressure from running several audits at once rather than a real `
      + `divergence — rerun this suite on its own before believing it.\n      HEAD threw: ${he || "(nothing)"}`
      + `\n      working threw: ${we || "(nothing)"}`);
  }
  if (!ok(!!head && !!work, "the twin boot could not load both trees")) {
    // fall through to the report
  } else {
    const PIDS = Object.keys(head.CMP_DATA || {});
    const NOW_PIDS = Object.keys(work.CMP_DATA || {});
    ok(PIDS.length > 100, `the booted roster is wide enough to mean something (${PIDS.length} profiles)`);
    // A partial boot shows up here first, and it must be named as a partial boot rather
    // than as a person who disappeared. F10 ships no roster change of any kind, so the
    // two counts are equal or something upstream of this comparison went wrong.
    const missing = PIDS.filter((p) => !work.CMP_DATA[p]);
    // GUARD TWO: if a profile really is absent, say enough for the reader to tell the two
    // causes apart without re-deriving what this wave had to. A renamed key shows up as
    // equal counts with a matching arrival in the working tree; a truncated boot shows up
    // as unequal counts or unequal exception sets.
    const arrivals = NOW_PIDS.filter((p) => !head.CMP_DATA[p]);
    ok(missing.length === 0,
      `${missing.length} profile(s) HEAD had are absent from the working tree's boot (${missing.slice(0, 5).join(", ")}) — `
      + `and F10 touches no file the roster is built from, so this is almost certainly not a roster regression. `
      + `HEAD booted ${PIDS.length} profiles with ${(head.__bootErrs || []).length} exception(s); the working tree booted `
      + `${NOW_PIDS.length} with ${(work.__bootErrs || []).length}. Keys present only in the working tree: `
      + `${arrivals.length ? arrivals.slice(0, 5).join(", ") : "(none)"}. If the counts match and a renamed twin of the `
      + `missing slug appears in that list, another audit rewrote the file on disk while this one read it — rerun this `
      + `suite on its own. If the counts differ, a boot did not finish.`);

    let dm = 0, dmBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.read(pid); } catch (e) { continue; }
      try { b = work.PDXWordAction.read(pid); } catch (e) { b = null; }
      if (!a) continue;
      if (!b) { dmBad++; failures.push(`${pid}: Direction Match stopped returning`); continue; }
      dm++;
      for (const k of ["pct", "publishable", "word", "testedWeight"]) {
        if (b[k] !== a[k]) { dmBad++; failures.push(`${pid}: DM ${k} moved — ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`); }
      }
    }
    ok(dm > 100, `the Direction Match sweep was wide enough to mean something (${dm} profiles)`);
    eq(dmBad, 0, "Direction Match drifted — F10 writes no row and changes no support_meaning, so every DM input is the same object it was");

    let rows = 0, rowBad = 0, tiers = new Map();
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
        if (sa.state) tiers.set(sa.state, (tiers.get(sa.state) || 0) + 1);
      }
    }
    ok(rows > 500, `the issue-row sweep was wide enough to mean something (${rows} rows)`);
    eq(rowBad, 0, "a formal pattern tier drifted");
    ok(tiers.size >= 2, "the tier sweep saw more than one tier, or it was not actually reading tiers");
    console.log(`      (twin boot: ${dm} DM reads, ${rows} issue rows, ${tiers.size} distinct tiers — all identical to HEAD)`);
  }
}

// ── report ────────────────────────────────────────────────────────────
console.log(`\n  test-vr-federal-wave-f10 — ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
  if (failures.length > 60) console.log(`   … and ${failures.length - 60} more`);
  console.log("");
  process.exit(1);
}
console.log(`  F10: THE MEASUREMENT WAS THE PRODUCT · ${C.measuresWithARollAndNoMapping} measures with a roll and no mapping enumerated `
  + `(${C.senateReachableInstrumentsConsidered} Senate-reachable, ${C.houseReachableInstrumentsConsidered} House-reachable, `
  + `${C.nonInstrumentsExcluded} non-instruments) · ${C.engrossedTextsReadFromGovinfo} engrossed texts read · `
  + `${C.keysConsideredAcrossAllCandidates} keys weighed, ${C.keysAdmitted} admitted · reachable unread measured at 0/0 · `
  + `${C.rosterUnreadAfter} unread rows still unread (${C.federalUnreadAfter} federal), `
  + `${C.structurallySuppressedRowsRoster} suppressed before any wall and ${C.federalRowsWithAMeasuredCeilingOfZero} measured at a ceiling of zero · `
  + `${C.issueKeysProposedAndRefused} keys proposed and refused · rows ${C.rowsShipped}, migrations ${C.migrationsWritten}, `
  + `vote seeds ${C.voteSeedsWritten} · floors and _RD_NO_POLE byte-identical · the primary lock is still decommissioned\n`);
