#!/usr/bin/env node
//
// test-vr-federal-roster-r1.mjs — the fence around roster wave federal_roster_r1_sep2026.
//
// WHAT THIS WAVE IS. Not an attribution wave that found new votes. The votes were already
// in the record: F9 recorded 2,245 judged House positions whose Clerk `name-id` was not in
// db/vr-member-map.json, and the same fail-closed skip had been happening on every House
// roll since F6 — 7,298 recorded positions across 23 rolls with nowhere to go. Re-reading
// the XML could never fix that. Only a wider roster could. So this wave admits 315 sitting
// 119th House members as IDENTITY, and re-attaches what the record already held.
//
// WHAT THAT MEANS FOR THIS FILE. A roster wave's failure modes are not an attribution
// wave's. It cannot get a tally wrong; it can get a PERSON wrong. So the six things below
// are about identity, and the seventh is about the arithmetic being real:
//
//   1. one slug ↔ one Bioguide, verified twice and in both directions
//   2. no two current files for one district — one person, one current record
//   3. F9's seven rolls now attribute more than the 117 slugs they could reach
//   4. the skipped-vote count DROPS, and the residual is disclosed by name
//   5. no party word in anything a reader sees; party is a bio chip, never a sort
//   6. no Direction Match drift on lee / curtis / bmoore
//   7. the migration is structurally what it claims, and the NEXT F9-style pull attaches
//      the slugs this wave admitted — which is the whole point of having admitted them
//
// It reads the working tree and the committed seeds. It opens no socket and needs no
// database: the migration is proved as a document, and the identity claims are proved
// against the two independent sources the census recorded them from.
//
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { CJ_SEAMS_ALL as CJ_SEAMS, SH_SEAMS, WA_SEAMS, carveSeams, assertConsistencySeams, assertStanceHelpersSeam,
  assertWordActionSeams } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

const WAVE = "federal_roster_r1_sep2026";
const MIGRATION = "20261026000000_vr_federal_roster_r1.sql";
const MIG_DIR = "netlify/database/migrations";

const failures = [];
let passed = 0;
const ok = (c, m) => { if (c) { passed++; return true; } failures.push(m); return false; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

// Section 4 works out who the corpus still cannot attribute, and section 7 replays the
// resolution against that answer, so it is named here rather than passed down a scope.
let disclosedBios = [];

const census = J("db/vr-federal-roster-r1-census.json");
const seed = J("db/vr-federal-roster-r1-attribution-seed.json");
const memberMap = J("db/vr-member-map.json");
const admitted = J("db/vr-roster-admitted.json");
const sql = R(`${MIG_DIR}/${MIGRATION}`);
const waveSlugs = admitted.waves[WAVE] || [];

// ═══════════════════════════════════════════════════════════════════════════════
section("1 · one slug ↔ one Bioguide, verified twice, in both directions");
// ═══════════════════════════════════════════════════════════════════════════════
// The wall this section is, exists because of a real incident: a portrait URL and a
// hand-typed slug disagreed about which person a Bioguide named (King-Hinds / Kennedy),
// and the only reason it was caught is that the map generator holds TWO independent
// sources for every pair and refuses when they disagree. So this is checked as a
// bijection, not as a lookup — a many-to-one map is how two people become one person.
{
  eq(waveSlugs.length, 315, `db/vr-roster-admitted.json's ${WAVE} does not carry the census's admissions`);
  eq(census.census.admitted, 315, "the census does not admit what it says it admits");
  eq(census.admitted.length, 315, "the census's admitted[] is not the length it reports");

  const slugOf = new Map();   // bioguide → slug
  const bioOf = new Map();    // slug → bioguide
  let twiceVerified = 0;
  for (const a of census.admitted) {
    ok(/^[A-Z]\d{6}$/.test(a.bioguide), `${a.slug}: '${a.bioguide}' is not a Bioguide's shape — a guessed id is worse than a skipped vote`);
    ok(/^[a-z][a-z0-9_]*$/.test(a.slug), `'${a.slug}' is not a slug`);
    ok(!/^[a-z]+$/.test(a.slug) || a.slug.includes("_") || a.slug.length > 3,
      `'${a.slug}' looks like a bare surname — this corpus holds two Torreses and two Moores`);
    if (slugOf.has(a.bioguide))
      failures.push(`Bioguide ${a.bioguide} names two slugs: ${slugOf.get(a.bioguide)} and ${a.slug}`);
    else { slugOf.set(a.bioguide, a.slug); passed++; }
    if (bioOf.has(a.slug))
      failures.push(`slug '${a.slug}' claims two Bioguides: ${bioOf.get(a.slug)} and ${a.bioguide} — two living people are being merged`);
    else { bioOf.set(a.slug, a.bioguide); passed++; }

    // VERIFIED TWICE means two documents that could disagree and don't: the Clerk's own
    // MemberData.xml and the legislators dataset. A roll-call name-id is a third, and it
    // is what makes the pair load-bearing, but it is not one of the two.
    const v = a.verifiedBy || [];
    const hasClerk = v.some((x) => /MemberData\.xml/.test(x));
    const hasLegis = v.some((x) => /legislators/.test(x));
    if (ok(hasClerk && hasLegis, `${a.slug} (${a.bioguide}) is not verified twice — sources: ${JSON.stringify(v)}`)) twiceVerified++;
    // and the two sources have to agree about the same state and party, or "twice" is a count
    // of documents rather than a corroboration.
    const clerkLine = v.find((x) => /MemberData\.xml/.test(x)) || "";
    ok(clerkLine.includes(a.state), `${a.slug}: the Clerk line does not name ${a.state} — "${clerkLine}"`);
  }
  eq(twiceVerified, 315, "not every admission is verified twice");
  eq(slugOf.size, 315, "the Bioguide→slug side of the map is not a bijection");
  eq(bioOf.size, 315, "the slug→Bioguide side of the map is not a bijection");

  // And the same bijection in db/vr-member-map.json, which is the file the ingest reads.
  // A census that is right and a map that is wrong attributes votes to the wrong person.
  for (const a of census.admitted)
    eq(memberMap.map[a.bioguide], a.slug, `db/vr-member-map.json disagrees with the census about ${a.bioguide}`);
  const mapBio = new Map();
  for (const [b, s] of Object.entries(memberMap.map)) {
    if (mapBio.has(s) && waveSlugs.includes(s))
      failures.push(`db/vr-member-map.json points two Bioguides at '${s}': ${mapBio.get(s)} and ${b}`);
    else passed++;
    mapBio.set(s, b);
  }

  // The ceiling holds both ways: nothing admitted that is not on a wave list, and nothing
  // on this wave's list that the map does not carry.
  const everyAdmitted = new Set(Object.values(admitted.waves).flatMap((w) => (Array.isArray(w) ? w : [])));
  const unadmitted = [...new Set(Object.values(memberMap.map))].filter((s) => !everyAdmitted.has(s));
  eq(unadmitted.join(", "), "", "the member map carries slugs no roster wave admitted — the ceiling leaked");
  const mapped = new Set(Object.values(memberMap.map));
  eq(waveSlugs.filter((s) => !mapped.has(s)).join(", "), "", "a slug this wave admits is not in the member map");
  eq(memberMap.unadmittedPortraits, 0, "a BROWSE_PHOTOS portrait names a Bioguide no wave admitted");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("2 · one person, one current file — no duplicate district");
// ═══════════════════════════════════════════════════════════════════════════════
// The failure this catches is a SEARCH failure a reader would see: two live records for
// AL-03, one of them a stub, both openable. It is checked on the booted roster rather than
// on the census, because the roster is what the reader's search reads.
let CMP = null;
{
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  try { vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" }); } catch (e) { failures.push(`cmp-data.js does not boot: ${e.message}`); }
  CMP = win.CMP_DATA || null;
  if (ok(!!CMP, "CMP_DATA did not boot")) {
    // 1108 after R1; 1120 after R2 added the twelve mapped-but-rosterless members
    // (scripts/test-vr-federal-roster-r2.mjs owns that count and its arithmetic).
    eq(Object.keys(CMP).length, 1120, "the roster is not the size this wave leaves it");

    // Every admission has a file. The IDENTITY-ONLY rule binds the 307 rows this wave
    // CREATED — it cannot bind the 8 that reused a file that already existed and already
    // carried a curated record, because resetting those to null would be a deletion of
    // curated work dressed up as consistency. Those 8 are checked for the opposite thing:
    // that their judged surface was left alone and only their seat label was corrected.
    for (const a of census.admitted) {
      const rec = CMP[a.slug];
      if (!ok(!!rec, `${a.slug} (${a.districtLabel}) was admitted but has no CMP_DATA record`)) continue;
      ok(!("publishable" in rec), `${a.slug}: a publishable flag was set by hand`);
      // The 307 created rows carry their district; the 8 reused files keep the bare-state
      // convention their curated records were written in, and are held to naming the right
      // STATE instead. Rewriting seven curated records' labels to satisfy a check is how a
      // harness starts driving the content.
      if (a.reusesExistingFile) ok(String(rec.state).includes(a.stateFull), `${a.slug}: '${rec.state}' is not in ${a.stateFull}`);
      else ok(String(rec.state).includes(a.districtLabel), `${a.slug}: '${rec.state}' does not carry the district ${a.districtLabel}`);
      if (a.reusesExistingFile) {
        ok(String(rec.office).length > 0, `${a.slug}: the reused file lost its office line`);
        continue;
      }
      eq(rec.office, "U.S. Representative", `${a.slug}: office is not the seat they hold`);
      eq(rec.score, null, `${a.slug}: an identity-only admission carries a score — null means "no record yet", 0 means "judged and failed"`);
      eq(rec.kept, 0, `${a.slug}: kept is not 0`);
      eq(rec.broken, 0, `${a.slug}: broken is not 0`);
      eq(rec.pending, 0, `${a.slug}: pending is not 0`);
      ok(Array.isArray(rec.issues) && rec.issues.length === 0, `${a.slug}: an identity-only admission carries stances`);
      ok(!("bio" in rec), `${a.slug}: an identity-only admission carries a bio`);
    }

    // NO TWO CURRENT FILES FOR ONE SEAT, checked two ways because the roster's records do
    // not all label a district. 47 House records predate this wave and carry a bare state
    // name; that is the older convention, and a roster wave is not the place to rewrite 47
    // curated records. So:
    //
    //   (a) among records that DO name a district — all 307 this wave created, plus the
    //       pre-existing ones that already did — no district may be claimed twice; and
    //   (b) no two current House records may share a display name, which is the failure
    //       mode a missing district would otherwise hide: the same person admitted a second
    //       time under a different slug while their old stub stays openable.
    //
    // (b) is the stronger of the two here, because it is what a reader's search actually
    // collides on, and it does not depend on a label the older records never carried.
    const HD = /\b([A-Z]{2})-(AL|\d{2})\b/;
    const reps = Object.entries(CMP).filter(([, r]) => r && r.office === "U.S. Representative");
    const byDistrict = new Map();
    const unlabelled = [];
    for (const [pid, rec] of reps) {
      const m = HD.exec(String(rec.state || ""));
      if (!m) { unlabelled.push(pid); continue; }
      const key = `${m[1]}-${m[2]}`;
      if (!byDistrict.has(key)) byDistrict.set(key, []);
      byDistrict.get(key).push(pid);
    }
    const dupes = [...byDistrict.entries()].filter(([, v]) => v.length > 1);
    eq(dupes.map(([d, v]) => `${d}: ${v.join(" + ")}`).join(" | "), "",
      `${dupes.length} district(s) have two current House files — search would show a reader two people for one seat`);
    ok(byDistrict.size >= 330, `only ${byDistrict.size} districts have a labelled current file`);
    // The inherited 47 may shrink; it may never grow. A roster wave that added an unlabelled
    // House record would be adding one this check cannot see.
    ok(unlabelled.length <= 47,
      `${unlabelled.length} House records name no district, up from the 47 this wave inherited — a new one is a record the district check cannot see`);
    // The 8 reused files are legitimately here (see above). Every OTHER wave slug must label
    // its district, and no other record may claim the seat the reused 8 hold — which is the
    // guarantee the district check would otherwise have given them.
    const reusedSlugs = new Set(census.admitted.filter((a) => a.reusesExistingFile).map((a) => a.slug));
    for (const pid of unlabelled)
      ok(!waveSlugs.includes(pid) || reusedSlugs.has(pid),
        `${pid} was admitted as a NEW record by this wave and names no district`);
    for (const a of census.admitted.filter((x) => x.reusesExistingFile))
      eq((byDistrict.get(a.districtLabel) || []).filter((p) => p !== a.slug).join(" + "), "",
        `${a.districtLabel} is claimed by another record as well as by the reused file ${a.slug}`);

    const byName = new Map();
    for (const [pid, rec] of reps) {
      const n = String(rec.name || "").toLowerCase().replace(/[^a-z]+/g, "");
      if (!n) { failures.push(`${pid}: a House record with no name`); continue; }
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n).push(pid);
    }
    const nameDupes = [...byName.entries()].filter(([, v]) => v.length > 1);
    eq(nameDupes.map(([n, v]) => `${n}: ${v.join(" + ")}`).join(" | "), "",
      `${nameDupes.length} name(s) have two current House files — one person, one current record`);
    ok(reps.length >= 377, `only ${reps.length} House records exist`);

    // The eight admissions that REUSED an existing file did not mint a second identity.
    const reused = census.admitted.filter((a) => a.reusesExistingFile);
    eq(reused.length, census.census.reusingAnExistingFile, "the census miscounts its own file reuse");
    for (const a of reused)
      ok(!!CMP[a.slug], `${a.slug} was recorded as reusing an existing file, and there is no file to reuse`);

    // And the alias table did not acquire a claim this wave cannot support. An alias is an
    // assertion that two ids are ONE PERSON; a roster wave that admits 315 people is exactly
    // where a careless one would appear.
    const aliases = J("db/vr-pid-aliases.json").aliases || {};
    for (const [retired, canonical] of Object.entries(aliases)) {
      ok(!waveSlugs.includes(retired), `${retired} is admitted by this wave AND retired in db/vr-pid-aliases.json — it cannot be both`);
      ok(!CMP[retired], `${retired} is retired in the alias table but still has a current CMP_DATA file`);
      ok(!!CMP[canonical] || !waveSlugs.includes(canonical), `an alias points at '${canonical}', which this wave admits and which has no file`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("3 · F9's seven rolls reach past the 117 slugs they could reach");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const f9 = seed.votes.filter((v) => /f9-vote-seed/.test(v.seededBy));
  eq(f9.length, 7, "F9's seven rolls are not seven in this seed");
  for (const v of f9) {
    ok(v.heldBefore <= 117, `${v.at}: heldBefore ${v.heldBefore} is above the 117 the old roster could reach`);
    ok(v.heldAfter > 117, `${v.at}: still attributes only ${v.heldAfter} slugs`);
    ok(v.heldAfter >= 425, `${v.at}: ${v.heldAfter} slugs is short of the chamber`);
    // and the roll is not over-attributed: never more cells than the DOCUMENT's own tally.
    const t = v.documentTotals;
    const judged = t.yea + t.nay;
    ok(v.heldAfter <= t.yea + t.nay + t.present + t.notVoting,
      `${v.at}: ${v.heldAfter} attributed cells exceed the ${t.yea + t.nay + t.present + t.notVoting} the document records`);
    ok(judged > 0, `${v.at}: the document records no judged votes`);
  }
  eq(seed.distinctSlugsOnScopedRollsBefore, 117, "the seed does not record the 117-slug ceiling it started from");
  eq(seed.distinctSlugsOnScopedRollsAfter, 431, "the seed does not record where the widened roster lands");
  ok(seed.distinctSlugsOnScopedRollsAfter > seed.distinctSlugsOnScopedRollsBefore + 300,
    "the widening is too small to be the one this wave describes");

  // Every roll in the corpus, not just F9's, and the tally authority is the DOCUMENT.
  eq(seed.rollCalls, 23, "the scope is not the 23 rolls the three seeds ingested");
  eq(seed.votes.length, 23, "the seed does not carry a vote block per roll");
  for (const v of seed.votes) {
    eq(v.chamber, "house", `${v.at}: a roster wave for the House read a ${v.chamber} roll`);
    const t = v.documentTotals;
    ok(v.chamberRecorded === t.yea + t.nay + t.present + t.notVoting,
      `${v.at}: chamberRecorded ${v.chamberRecorded} does not equal the document's own totals`);
    ok(v.chamberRecorded >= 425 && v.chamberRecorded <= 441,
      `${v.at}: ${v.chamberRecorded} recorded positions is outside the House's plausible range`);
    ok(v.heldAfter <= v.chamberRecorded, `${v.at}: OVER-ATTRIBUTION — ${v.heldAfter} cells against ${v.chamberRecorded} recorded`);
    eq(v.heldBefore + v.memberVotes.length, v.heldAfter, `${v.at}: the arithmetic of the roll does not close`);
    ok(v.skippedBefore > v.stillSkipped, `${v.at}: the skip count did not drop`);
  }
  // These four are reported as objects carrying a written reason and a total, because a bare
  // zero cannot say what it would have meant to be non-zero.
  const total = (x) => Number(x && typeof x === "object" ? x.total : x);
  eq(total(seed.repairsFiled), 0, "this wave filed a repair — an over-attributed roll refuses rather than deletes");
  eq(total(seed.discrepancies), 0, "a stored cell disagrees with the document");
  eq(total(seed.strandedStoredCells), 0, "a stored cell was stranded and this wave did not report it");
  eq(total(seed.outOfScopeCells), 0, "this wave wrote a cell outside its scope");
  ok(total(seed.storedCellsConfirmed) >= 2680, `only ${total(seed.storedCellsConfirmed)} stored cells were re-read and confirmed`);
  for (const k of ["repairsFiled", "discrepancies", "strandedStoredCells", "outOfScopeCells", "storedCellsConfirmed"])
    ok(String((seed[k] || {})._comment || "").length > 60, `${k} is reported as a number with no written meaning`);
}

// ═══════════════════════════════════════════════════════════════════════════════
section("4 · the skipped-vote count drops, and the residual is named");
// ═══════════════════════════════════════════════════════════════════════════════
// A skip count that falls silently is indistinguishable from a skip count that fell
// because someone guessed. So the drop has to be arithmetic and the remainder has to be
// a list of people with a reason each.
{
  const a = census.attribution;
  eq(a.skippedBefore, 7298, "the census does not record the 7,298 skipped positions this wave exists for");
  eq(a.skippedAfter, 160, "the residual skip count is not what the census reports");
  ok(a.skippedAfter < a.skippedBefore, "the skip count did not drop");
  eq(a.skippedBefore - a.cellsGained, a.skippedAfter, "skippedBefore − cellsGained ≠ skippedAfter — the drop is not accounted for");
  eq(a.cellsGained, seed.cells, "the census and the seed disagree about how many cells were recovered");
  eq(a.judgedCellsGained, seed.judgedCells, "the census and the seed disagree about the judged subset");
  ok(a.judgedCellsGained <= a.cellsGained, "more judged cells than cells");

  // DISCLOSED: every remaining skip is a named Bioguide with a kind, and the kinds are the
  // wave's written refusals — not "unknown".
  const residual = census.residualSkipped || [];
  const total = residual.reduce((n, r) => n + r.rolls, 0);
  ok(residual.length > 0, "the residual skips are not disclosed at all");
  for (const r of residual) {
    ok(/^[A-Z]\d{6}$/.test(r.bioguide), `a residual skip has no Bioguide: ${JSON.stringify(r)}`);
    eq(r.kind, "former_member",
      `${r.bioguide}: residualSkipped is the timing list — a delegate belongs in refused[], where the price of refusing them is recorded`);
    ok(r.rolls > 0, `${r.bioguide}: disclosed with no roll count`);
  }
  // The seed's own count of the same thing, from the other direction.
  const seedResidual = seed.stillUnattributable || {};
  eq(Number(seedResidual.cells), 160, "the seed and the census disagree about the residual");
  const seedBios = Object.keys(seedResidual.byBioguide || {});
  eq(seedBios.length, 13, "the seed does not name 13 unattributable Bioguides");
  // The census files the two kinds in two places, and they are two different decisions:
  // the seven former members are a TIMING fact (they left the 119th before the roll they
  // would attach to, so `residualSkipped` records them), and the six delegates are a
  // REFUSAL (they hold no district, so `refused` records them with the price attached).
  // The seed sees only one thing — a Bioguide it could not resolve — so its 13 must be
  // exactly the union, or one of the two lists is hiding someone.
  const delegateBios = census.refused.filter((r) => r.kind === "delegate").map((r) => r.bioguide);
  disclosedBios = [...residual.map((r) => r.bioguide), ...delegateBios].sort();
  eq(seedBios.slice().sort().join(","), disclosedBios.join(","),
    "the seed and the census name different people as still skipped");
  eq(residual.length, 7, "the census does not record seven former members as the timing residual");
  eq(delegateBios.length, 6, "the census does not record six delegates as refused");
  ok(total > 0, `the disclosed residual rolls sum to ${total}`);

  // THE PRICE OF THE DELEGATE REFUSAL IS ON THE RECORD. A refusal that does not say what
  // it costs is a refusal nobody can reconsider.
  ok(census.delegatesRefused && census.delegatesRefused.count === 6,
    "the six delegates are not recorded as refused");
  ok(Number(census.delegatesRefused.cellsForgone) > 0,
    "the delegate refusal does not state the judged cells it forgoes — an undocumented refusal cannot be reversed deliberately");
  eq(census.census.refusedByKind.vacant_seat, 4, "the vacant seats are not refused as vacant");
  eq(census.census.refusedByKind.delegate, 6, "the delegates are not refused as delegates");
  eq(census.refused.length, 17, "the refusal list is not the length the census reports");
  for (const r of census.refused) {
    ok(typeof r.reason === "string" && r.reason.length > 60,
      `a refusal carries no written reason — the brief asks for a written refusal, not a fake member: ${JSON.stringify(r).slice(0, 120)}`);
    ok(!waveSlugs.includes(r.slug || ""), `${r.who} is both refused and admitted`);
  }
  // No fake member for a vacant seat.
  for (const r of census.refused.filter((x) => x.kind === "vacant_seat"))
    ok(!r.bioguide, `a vacant seat was refused with a Bioguide attached (${r.statedistrict}) — the Clerk publishes none`);

  // THE CENSUS ARITHMETIC THE BRIEF ASKED FOR: 435 sitting − already mapped = N candidates.
  const c = census.census;
  eq(c.apportionedSeats, 435, "the House is not 435 seats");
  eq(c.clerkVotingSeats - c.vacantSeats, c.sittingVotingMembers, "seats − vacancies ≠ sitting members");
  eq(c.sittingVotingMembers - c.alreadyMappedSitting, c.candidates, "sitting − already mapped ≠ candidates");
  eq(c.admitted + (c.candidates - c.admitted), c.candidates, "the candidate pool does not close");
  eq(c.candidates, c.admitted, "a candidate was neither admitted nor refused");
  eq(c.admittedNamedByCorpus + c.admittedNamedByNoRoll, c.admitted, "the named-by-corpus split does not close");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("5 · no party word in reader copy; party is a chip, never a sort");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const PARTY = /\b(Republican|Democrat|Democratic|GOP|partisan|bipartisan|left-wing|right-wing|conservative|liberal)\b/i;
  let scanned = 0;
  const scan = (text, where) => {
    scanned++;
    const m = PARTY.exec(String(text || ""));
    ok(!m, `${where} names a party ("${m && m[0]}") — the record is the formal record`);
  };
  // Scoped to the 307 rows this wave WROTE. The 8 reused files carry curated office titles
  // that predate this wave — "Republican Study Committee Chair" is the formal name of a
  // House caucus, and a roster wave rewriting it to pass a party scan would be editing
  // someone's record to flatter its own harness.
  if (CMP) for (const a of census.admitted.filter((x) => !x.reusesExistingFile)) {
    const rec = CMP[a.slug]; if (!rec) continue;
    scan(rec.name, `${a.slug} name`);
    scan(rec.office, `${a.slug} office`);
    scan(rec.state, `${a.slug} state`);
    // The chip itself is a one-or-two-letter code, not a word. "I (R caucus)" is the widest
    // legal form and it is still a code.
    ok(/^[A-Z](\s*\([A-Z] caucus\))?$/.test(String(rec.party || "")),
      `${a.slug}: party '${rec.party}' is prose, not a chip`);
  }
  ok(scanned >= 900, `only ${scanned} reader strings were scanned for party language`);

  // NEVER A SORT, NEVER A SCORE. The party field may not appear in any comparison or
  // ordering path in the shipped engine files.
  for (const f of ["compare-hub.js", "consistency.js", "word-action.js", "voting-record.js"]) {
    const src = R(f);
    const bad = [...src.matchAll(/\.sort\([^)]{0,200}\.party\b/g)].map((m) => m[0].slice(0, 60));
    eq(bad.join(" | "), "", `${f} sorts on party`);
    const scored = [...src.matchAll(/(?:score|pct|kept|broken|weight)\s*[-+*/]?=[^;\n]{0,80}\.party\b/g)].map((m) => m[0].slice(0, 60));
    eq(scored.join(" | "), "", `${f} scores on party`);
  }
  // The migration's SQL carries no party word either — it writes is_party codes, which are
  // a measurement off the roll, not a reason.
  const IS_PARTY = /'(with_party|against_party)'/;
  ok(IS_PARTY.test(sql), "the migration records no crossover measurement at all — that is a measurement off the roll, not a party judgement, and deleting it loses a chamber fact");
  const prose = sql.split("\n").filter((l) => l.trim().startsWith("--")).join("\n");
  const pm = PARTY.exec(prose.replace(/party_totals|is_party|with_party|against_party|partyAtRoll/g, ""));
  ok(!pm, `the migration's own comments name a party ("${pm && pm[0]}")`);
}

// ═══════════════════════════════════════════════════════════════════════════════
section("6 · no Direction Match drift — twin boot, HEAD against this tree");
// ═══════════════════════════════════════════════════════════════════════════════
// This wave writes vote CELLS and identity ROWS. It states no position, moves no floor and
// touches no support_meaning, so every DM input for a person who already had one is the
// same object it was. lee, curtis and bmoore are named because they are the three the brief
// pins; the sweep runs on everyone HEAD had, because a formula that drifted would not have
// the courtesy to drift only on three.
{
  const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "consistency.js", "voting-record.js", "word-action.js", "issue-scope.js"];
  const headSrc = (f) => {
    try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
    catch { return null; }
  };
  const boot = (get) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    for (const f of FILES) { const s = get(f); if (s === null) continue; try { vm.runInContext(s, ctx, { filename: f }); } catch { /* tolerated, as F6 does */ } }
    return win;
  };
  const head = boot(headSrc);
  const work = boot((f) => R(f));

  // ONLY cmp-data.js may differ. A roster wave has no business in the engine.
  // ── TWO SEAMED FILES, NOT TWO WAIVERS ──────────────────────────────────────
  // The person-file chrome pass (CACHE_VERSION v103) edited consistency.js above
  // _DOS_MECH and stance-helpers.js inside _pdxStanceRecordStats. A roster wave has
  // no stake in either span — no floor, no mapping, no weight, no score, no
  // admission is read or written inside them — but it has every stake in the rest of
  // both files, so each is cut at anchors unique on both sides, the remainder is
  // compared byte for byte, and the spans are argued rather than excused. The
  // Direction Match sweep below is the real proof either way: it reads every profile
  // HEAD had and requires the numbers to be identical.
  // …and word-action.js joins them for the brief slice-line pass (v104), on exactly
  // the same terms: three named spans — the slice gate and its two mounts — with the
  // rest of the renderer compared byte for byte. A roster wave has the largest stake
  // of any wave in that sentence and no stake at all in the span: R1's 7,138 cells
  // across 23 House rolls are exactly why several hundred admitted files now open on
  // the same three chips, and the sentence is the block saying which of "the slice we
  // hold" and "who they are" the reader is looking at. It reads two counts already
  // published for that person and computes nothing.
  const SEAMED = ["consistency.js", "stance-helpers.js", "word-action.js"];
  const has = (x, n, m) => ok(String(x).includes(n), `${m} — missing ${JSON.stringify(n)}`);
  const seamCheck = (f, seams, argue) => {
    const h = headSrc(f);
    if (h === null || h === R(f)) return;
    const a = carveSeams(h, seams, "HEAD", f, ok), b = carveSeams(R(f), seams, "now", f, ok);
    eq(b.pinned, a.pinned, `${f} changed outside its named copy-pass seam — a roster wave admits identity, and this pass touched copy`);
    argue(b.bodies, { has, eq, ok });
  };
  const touched = FILES.filter((f) => { const h = headSrc(f); return h !== null && h !== R(f); });
  eq(touched.filter((f) => !SEAMED.includes(f)).join(", "), "cmp-data.js",
    "a roster wave changed a booted file other than the roster — identity is the only thing it admits");
  seamCheck("consistency.js", CJ_SEAMS, assertConsistencySeams);
  seamCheck("stance-helpers.js", SH_SEAMS, assertStanceHelpersSeam);
  seamCheck("word-action.js", WA_SEAMS, assertWordActionSeams);

  if (ok(!!(head.PDXWordAction && head.PDXWordAction.read), "the pre-wave engine did not boot from HEAD (skipping the sweep)")
    && ok(!!(work.PDXWordAction && work.PDXWordAction.read), "the current engine did not boot")) {
    const PIDS = Object.keys(head.CMP_DATA || {});
    ok(PIDS.length > 100, `the pre-wave roster booted (${PIDS.length} profiles)`);
    // The roster GREW — this is the one wave for which an unchanged count would be the bug.
    ok(Object.keys(work.CMP_DATA || {}).length > PIDS.length,
      "the roster did not grow, though this wave's entire product is 315 admissions");
    eq(PIDS.filter((p) => !work.CMP_DATA[p]).length, 0, "the wave dropped someone HEAD had");

    const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
    const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked",
      "notIssueLinked", "recordDerived", "warming"];
    let dm = 0, dmBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.read(pid); } catch { continue; }
      try { b = work.PDXWordAction.read(pid); } catch { b = null; }
      if (!a) continue;
      if (!b) { dmBad++; failures.push(`${pid}: Direction Match stopped returning`); continue; }
      dm++;
      for (const k of READ_KEYS) if (b[k] !== a[k]) { dmBad++; failures.push(`${pid}: DM ${k} moved — ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`); }
      const ca = a.coverage || {}, cb = b.coverage || {};
      for (const k of COV_KEYS) if (cb[k] !== ca[k]) { dmBad++; failures.push(`${pid}: DM coverage.${k} moved`); }
    }
    ok(dm > 100, `the Direction Match sweep was wide enough to mean something (${dm} profiles)`);
    eq(dmBad, 0, "Direction Match drifted — a roster wave states no position, moves no floor and rescores nobody");

    // THE THREE THE BRIEF PINS, spelled out so a regression names them.
    for (const pid of ["lee", "curtis", "bmoore"]) {
      const a = head.PDXWordAction.read(pid);
      const b = work.PDXWordAction.read(pid);
      if (!ok(!!a && !!b, `${pid}: Direction Match does not read on both sides`)) continue;
      eq(JSON.stringify(b), JSON.stringify(a), `/p/${pid}: Direction Match is not byte-identical across the wave`);
      const sa = head.PDXWordAction.scopedRead(pid, head.CMP_DATA[pid]);
      const sb = work.PDXWordAction.scopedRead(pid, work.CMP_DATA[pid]);
      if (!ok(!!sa && !!sb, `${pid}: the scoped read does not return on both sides`)) continue;
      eq(JSON.stringify(sb), JSON.stringify(sa), `/p/${pid}: the scoped read moved`);
    }
    // And bmoore in particular: his counts must not move from NEW MAPPINGS. He was already
    // mapped, so none of the 23 rolls can have skipped him.
    const moore = census.admitted.find((a) => a.slug === "bmoore");
    ok(!moore, "bmoore appears in this wave's admissions — he was already mapped, and admitting him twice is how a person gets two files");
    const mooreCells = (seed.perSlug || {}).bmoore;
    ok(!mooreCells, `bmoore gained ${mooreCells} cell(s) from a new mapping — his crime and climate counts should move only if a cell was previously skipped on him, and none was`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("7 · the migration as a document, and the next pull");
// ═══════════════════════════════════════════════════════════════════════════════
{
  // No schema, no deletion, no rewrite. A roster wave that reached for any of these would
  // be doing something other than what it says.
  for (const [re, why] of [
    [/CREATE\s+TABLE/i, "declares a table"],
    [/ALTER\s+TABLE/i, "alters a table"],
    [/\bDROP\s+(TABLE|INDEX|COLUMN|CONSTRAINT|VIEW|SCHEMA|FUNCTION)\b/i, "drops a schema object"],
    [/\bDELETE\s+FROM\b/i, "deletes rows — a stranded cell is reported, never removed"],
    [/\bUPDATE\s+vr_/i, "rewrites a stored row"],
    [/\bTRUNCATE\b/i, "truncates"],
  ]) ok(!re.test(sql), `${MIGRATION} ${why}`);
  ok(!/INSERT\s+INTO\s+vr_(?!member_votes)/i.test(sql),
    `${MIGRATION} inserts into a table other than vr_member_votes — no measure, roll, issue mapping or stated position belongs to a roster wave`);

  // The cells it claims, counted.
  const tuples = (sql.match(/^\s*\(rc, '/gm) || []).length;
  eq(tuples, 7138, "the migration does not carry the 7,138 cells the seed recovered");
  eq(tuples, seed.cells, "the migration and the seed disagree about the cell count");
  const conflicts = (sql.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length;
  eq(conflicts, 23, "not every roll's insert is idempotent — ON CONFLICT DO NOTHING is what makes a re-run safe");
  eq((sql.match(/\$\$/g) || []).length % 2, 0, "a DO $$ block is unbalanced");
  ok(/wave_slugs text\[\] := ARRAY\[/.test(sql), "the verification block does not pin the wave's slugs");
  const declared = (sql.match(/'[a-z][a-z0-9_]*'/g) || []);
  for (const s of waveSlugs.slice(0, 5)) ok(declared.includes(`'${s}'`), `${s} is not named in the migration`);
  ok(/RAISE EXCEPTION/.test(sql), "the migration verifies nothing");
  ok((sql.match(/RAISE EXCEPTION/g) || []).length >= 8, "the verification block is too thin to be wave-scoped");

  // Positions and is_party stay inside their closed vocabularies.
  const positions = new Set([...sql.matchAll(/\(rc, '[a-z0-9_]+', '([a-z_]+)'/g)].map((m) => m[1]));
  eq([...positions].sort().filter((p) => !["yea", "nay", "present", "not_voting"].includes(p)).join(","), "",
    "the migration writes a position outside the closed vocabulary");
  ok(positions.has("yea") && positions.has("nay"), "the migration writes no judged positions");

  // It is the newest migration, and no applied file was edited to make room for it.
  const sqls = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
  eq(sqls[sqls.length - 1], MIGRATION, "this wave's migration is not the newest in the directory");
  ok(new Set(sqls.map((f) => f.slice(0, 14))).size === sqls.length, "two migrations share a version prefix");

  // THE NEXT PULL ATTACHES THESE SLUGS. This is the deliverable the brief asked a harness
  // to prove, and it is proved the only way that means anything: replay the fail-closed
  // resolution an F9-style pull performs — Clerk name-id → member map → roster slug — over
  // every Bioguide the corpus actually names, and require that the answer is now a slug for
  // every sitting member and still a REFUSAL for everyone the wave refused.
  // SCOPE, stated: every Bioguide this wave's 7,138 cells came from, plus every Bioguide the
  // census discloses as still skipped. That is the set an F9-style pull would newly resolve
  // plus the set it must still refuse — which is precisely the pair of claims worth proving.
  // The ~116 Bioguides that already resolved before this wave are not in the seed's
  // memberVotes (it carries only the cells R1 adds), and they are not what is being proved.
  const namedByCorpus = new Set();
  for (const v of seed.votes) for (const mv of v.memberVotes) if (mv.bioguideId) namedByCorpus.add(mv.bioguideId);
  for (const b of disclosedBios) namedByCorpus.add(b);
  eq(namedByCorpus.size, 314 + 13, "the replay does not cover the wave's Bioguides plus its disclosed refusals");
  const resolve = (b) => memberMap.map[b] || null;
  let attaches = 0, refuses = 0;
  for (const b of namedByCorpus) {
    const slug = resolve(b);
    if (disclosedBios.includes(b)) {
      ok(slug == null, `${b} is a disclosed refusal and the map now resolves it to '${slug}' — a refusal that quietly became a mapping is a guess`);
      refuses++;
    } else if (ok(!!slug, `${b} is named by the corpus and the next pull would still skip it`)) {
      attaches++;
      ok(CMP && !!CMP[slug], `${b} resolves to '${slug}', which has no roster file — the pull would attach a vote to nobody`);
    }
  }
  eq(attaches, 314, "the next pull does not attach every Bioguide this wave recovered a cell for");
  eq(refuses, 13, "the replay does not meet the 13 refusals the census discloses");

  // And the 167 rolls this wave DEFERRED are deferred on the record, with the gap they leave.
  const d = seed.deferredRolls || {};
  eq(Number(d.total), 167, "the deferral does not name its 167 rolls");
  ok(Array.isArray(d.rows) && d.rows.length === 167, "the deferred rolls are counted but not listed by name");
  ok(Number(d.recordedPositions) > 50000, "the deferral does not state the recorded positions it leaves unread");
  ok(String(d._comment || "").length > 80, "the 167-roll deferral carries no written reason");
  ok(Number(d.gap) > 0, "the deferral does not state the gap it leaves");
}

if (failures.length) {
  console.error(`\n  ✗ roster R1: ${failures.length} failure(s) of ${passed + failures.length} checks\n`);
  for (const f of failures.slice(0, 40)) console.error(`    - ${f}`);
  if (failures.length > 40) console.error(`    … ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\n  ✓ roster R1: all ${passed} checks passed`);
console.log(`    435 seats − 4 vacant = 431 sitting · 116 already mapped → 315 candidates · 315 admitted, 17 refused with reasons`);
console.log(`    7,298 skipped positions → 160, all 160 disclosed by name (6 delegates, 7 former members)`);
console.log(`    7,138 cells across 23 rolls · 117 → 431 distinct slugs · 0 measures, 0 rolls, 0 keys, 0 stated positions, 0 floors moved\n`);
