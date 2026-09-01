#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Federal roster wave R1 — the attach the widened roster is owed
// ─────────────────────────────────────────────────────────────────────────────
// R1 ingests no new roll call. It admits 315 sitting members of the 119th House to
// the roster and then pays the debt that admission creates: every House roll call
// already in the record lost roughly 315 rows, on every roll, for the single reason
// that the voter's Bioguide resolved to no roster slug. Wave F9 measured that loss
// on its own seven rolls — 2,245 recorded positions skipped — and refused to guess
// at it. This is the script that goes back and reads them.
//
// WHAT IT WRITES, AND WHAT IT REFUSES TO WRITE
//
// Cells for the 315 slugs R1 admits, on the 23 House rolls whose clerk documents the
// F6, F7 and F9 vote seeds name. Nothing else:
//   • A cell for a slug outside this wave's 315 is counted under outOfScopeCells and
//     not written. Densifying the rest of the chamber is a different wave.
//   • A cell we already store is re-read against the document. Agreement is counted;
//     DISAGREEMENT is written into the seed for a human and the stored cell is left
//     exactly as it is. Correcting a stored vote is a deliberate act with its own
//     citation and does not belong in the quiet middle of a roster wave.
//   • The record holds 190 House rolls. The other 167 are refused here BY NAME, not
//     forgotten: the brief scopes the re-attach to the F6–F9 House seeds "and any
//     earlier House seed whose XML is still on disk", and no earlier House seed's XML
//     is on disk. Those rolls also reach back into the 117th and 118th Congresses,
//     where a sitting member's presence is a fact about a different chamber than the
//     one this wave's census read. deferredRolls counts what is left on the table
//     from vr_rollcalls' own stored totals, so the size of the next wave is a number
//     in this file rather than a surprise.
//
// IDENTITY RUNS THROUGH THE CLERK'S OWN IDENTIFIER
// The clerk stamps every <legislator> with name-id, which is a Bioguide, so the path
// is Bioguide → db/vr-member-map.json → roster slug and nothing else. No surname
// fallback, no (surname, state) key. A Bioguide the map does not carry is skipped and
// counted. Each of the 315 was verified twice before admission — clerk.house.gov's
// MemberData.xml and the congress-legislators dataset had to agree on state, district
// and party — and db/vr-federal-roster-r1-census.json is that ledger. This script
// re-asserts the map agrees with the census before it takes a single cell, so a stale
// map cannot quietly widen or narrow the wave.
//
// EVERY ROLL IS IDENTITY-VERIFIED BEFORE A CELL IS TAKEN FROM IT
// The document's <congress>, <session>, <rollcall-num>, <legis-num> and (on an
// amendment roll) <amendment-num> must match the seed that named it; its
// <totals-by-vote> must match what vr_rollcalls stores for that roll; every
// <recorded-vote> must carry a name-id and a position inside the closed vocabulary.
// A roll that disagrees on any axis is dropped whole rather than partially trusted.
//
// AND THE POOL HAS A CEILING, WHICH IS THE DOCUMENT'S OWN COUNT
// F8's pull rule, learned from senate 119/1 roll 7: if the judged rows we would hold
// after this pass — stored plus new — outnumber the document's own yea+nay, one of
// them is nobody's. The roll is refused whole and a repair is filed for it. There is
// no DELETE anywhere in this wave. Stored cells the document does not list at all are
// reported under strandedStoredCells: reported, never written, never removed.
//
//   node scripts/vr-gen-federal-roster-r1-attribution-seed.mjs [--pulled-at=YYYY-MM-DD]
//
// Reads the database (NETLIFY_DB_URL) and clerk.house.gov. Writes one JSON seed.
// R1_XML_DIR overrides the XML cache (default .netlify/clerk-r1).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "db", "vr-federal-roster-r1-attribution-seed.json");
const CACHE = process.env.R1_XML_DIR || join(ROOT, ".netlify", "clerk-r1");
const WAVE = "federal_roster_r1_sep2026";
const PULLED_AT = (process.argv.find((a) => a.startsWith("--pulled-at=")) || "--pulled-at=2026-09-01").slice(12);
const UA = "politidex-vr-ingest/1.0";

// The three House seeds whose rolls this pass re-reads. The roll addresses are taken
// out of the seeds themselves rather than retyped, so this list cannot drift from the
// corpus it claims to cover.
const SEED_FILES = [
  "db/vr-federal-wave-f6-vote-seed.json",
  "db/vr-federal-wave-f7-vote-seed.json",
  "db/vr-federal-wave-f9-vote-seed.json",
];

// ── The closed position vocabulary, copied from the F9 seed builder ──────────
// A position the chamber recorded and this script does not understand is a bug in
// this script, so it is a hard failure and never a flattening into not_voting.
const POS = { Yea: "yea", Aye: "yea", Nay: "nay", No: "nay", Present: "present", "Not Voting": "not_voting", Absent: "not_voting" };

const tag = (xml, t) => {
  const m = String(xml).match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`));
  return m ? m[1] : "";
};
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const flat = (s) => String(s).replace(/[^a-z0-9]/gi, "").toUpperCase();

// ── is_party, from THIS document's own party split ───────────────────────────
// Copied from scripts/vr-gen-federal-wave-f9-vote-seed.mjs so a re-attached cell is
// flagged on exactly the same rule as the cell beside it. It is computed over the
// FULL recorded chamber, never the attributed subset: with_party has to mean "with
// their own colleagues on this roll", and a majority computed from 116 of 431 rows
// would be a different claim wearing the same word. Party comes from the document,
// which is party AT THE ROLL — the right input here even for a member who has since
// changed caucus (Kevin Kiley voted these rolls as R and now sits as I).
function crossoverFlagger(all) {
  const byParty = {};
  for (const m of all) {
    if (!m.party || (m.position !== "yea" && m.position !== "nay")) continue;
    byParty[m.party] = byParty[m.party] || { yea: 0, nay: 0 };
    byParty[m.party][m.position]++;
  }
  const majority = {};
  for (const p of Object.keys(byParty)) majority[p] = byParty[p].yea >= byParty[p].nay ? "yea" : "nay";
  return (m) => {
    if (!m.party || (m.position !== "yea" && m.position !== "nay") || !majority[m.party]) return null;
    return m.position === majority[m.party] ? "with_party" : "against_party";
  };
}

// ── The scope, read off the roster ceiling ───────────────────────────────────
const admittedDoc = JSON.parse(readFileSync(join(ROOT, "db", "vr-roster-admitted.json"), "utf8"));
const waves = admittedDoc.waves || admittedDoc;
const R1_SLUGS = new Set(waves[WAVE] || []);
if (!R1_SLUGS.size) throw new Error(`db/vr-roster-admitted.json carries no wave '${WAVE}'`);

const census = JSON.parse(readFileSync(join(ROOT, "db", "vr-federal-roster-r1-census.json"), "utf8"));
const BY_SLUG = new Map();   // slug → census row
for (const a of census.admitted) {
  if (!R1_SLUGS.has(a.slug)) throw new Error(`census admits '${a.slug}' but the roster wave does not carry it`);
  BY_SLUG.set(a.slug, a);
}
if (BY_SLUG.size !== R1_SLUGS.size)
  throw new Error(`roster wave carries ${R1_SLUGS.size} slug(s), census names ${BY_SLUG.size} — they must be the same set`);

const memberMap = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8")).map || {};
// The map is the only attribution path, so a map that has drifted from the census is
// a map that would attribute these votes to a different set of people than the one
// this wave argued for. Checked in both directions before anything is read.
for (const [slug, row] of BY_SLUG) {
  if (memberMap[row.bioguide] !== slug)
    throw new Error(`db/vr-member-map.json resolves ${row.bioguide} to '${memberMap[row.bioguide] ?? "nothing"}', not '${slug}'. `
      + `Regenerate it (node scripts/vr-gen-member-map.mjs) before pulling this seed.`);
}
for (const [bio, slug] of Object.entries(memberMap)) {
  if (R1_SLUGS.has(slug) && (!BY_SLUG.has(slug) || BY_SLUG.get(slug).bioguide !== bio))
    throw new Error(`the map sends ${bio} to '${slug}', an R1 slug the census does not tie to that Bioguide`);
}

// ── The rolls, read out of the seeds that ingested them ──────────────────────
const scoped = new Map();   // "congress/session/roll" → seed expectation
for (const rel of SEED_FILES) {
  const seed = JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
  for (const v of seed.votes || []) {
    if (v.chamber !== "house") continue;
    const key = `${v.congress}/${v.session}/${v.rollNumber}`;
    if (scoped.has(key)) throw new Error(`${key} is named by two seeds — ${scoped.get(key).seed} and ${rel}`);
    const year = v.clerkYear ?? Number(String(v.voteDate).slice(0, 4));
    if (!Number.isFinite(year)) throw new Error(`${key}: no clerk year and no readable voteDate in ${rel}`);
    scoped.set(key, {
      // F6's seed carries no `wave` key, so the wave is read off the file name it came
      // from rather than left undefined in the emitted SQL comments.
      seed: rel, wave: seed.wave || (rel.match(/wave-(f\d+)-/i)?.[1] || "?").toUpperCase(),
      congress: v.congress, session: v.session, roll: v.rollNumber, year,
      measure: v.measure?.number, legisNum: v.measure?.clerkLegisNum, amendmentNum: v.measure?.clerkAmendmentNum,
      parent: v.measure?.parentNumber, totals: v.totals,
      skippedBefore: v._unresolvedRecorded ?? null, attributedBefore: v._attributed ?? null,
    });
  }
}

// ── The record ───────────────────────────────────────────────────────────────
const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const rolls = (await client.query(`
  SELECT r.id, r.congress, r.session, r.roll_number, r.vote_date, r.question, r.action_type, r.totals,
         m.number, m.measure_type, p.number AS parent_number,
         COALESCE((SELECT array_agg(mi.issue_key ORDER BY mi.issue_key) FROM vr_measure_issues mi WHERE mi.measure_id = m.id), '{}') AS issue_keys,
         COALESCE((SELECT array_agg(mi.issue_key ORDER BY mi.issue_key) FROM vr_measure_issues mi WHERE mi.measure_id = m.id AND mi.is_primary), '{}') AS primary_keys
    FROM vr_rollcalls r
    JOIN vr_measures m ON m.id = r.measure_id
    LEFT JOIN vr_measures p ON p.id = m.parent_id
   WHERE r.chamber = 'house'
   ORDER BY r.congress, r.session, r.roll_number`)).rows;

// The issue rows already sitting on the measures these rolls belong to. This wave
// argues about who voted, never about what the vote meant, so the number is read here
// and asserted unchanged by the migration's verification block.
const scopedPairs = [...scoped.values()].map((s) => `(${s.congress}, ${s.session}, ${s.roll})`).join(", ");
const issueRowsScoped = Number((await client.query(`
  SELECT count(*)::int AS n FROM vr_measure_issues i
   WHERE i.measure_id IN (
     SELECT measure_id FROM vr_rollcalls
      WHERE chamber = 'house' AND (congress, session, roll_number) IN (${scopedPairs}))`)).rows[0].n);

const stored = new Map();   // rollcall id → Map(slug → position)
for (const r of (await client.query(`
  SELECT v.rollcall_id, v.politician_id, v.position
    FROM vr_member_votes v JOIN vr_rollcalls r ON r.id = v.rollcall_id
   WHERE r.chamber = 'house'`)).rows) {
  if (!stored.has(r.rollcall_id)) stored.set(r.rollcall_id, new Map());
  stored.get(r.rollcall_id).set(r.politician_id, r.position);
}
await client.end();

const inScope = [];
const deferred = [];
for (const r of rolls) {
  const key = `${r.congress}/${r.session}/${r.roll_number}`;
  if (scoped.has(key)) inScope.push({ ...r, want: scoped.get(key) });
  else deferred.push(r);
}
if (inScope.length !== scoped.size) {
  const missing = [...scoped.keys()].filter((k) => !inScope.some((r) => `${r.congress}/${r.session}/${r.roll_number}` === k));
  throw new Error(`${missing.length} seeded roll(s) are not in vr_rollcalls: ${missing.join(", ")}`);
}
console.log(`house rolls in the record: ${rolls.length} · in scope: ${inScope.length} · deferred by name: ${deferred.length}`);
console.log(`scope: ${R1_SLUGS.size} newly admitted slugs`);

// ── Pull, verify, resolve ────────────────────────────────────────────────────
mkdirSync(CACHE, { recursive: true });
async function rollXml(year, roll) {
  const p3 = String(roll).padStart(3, "0");
  const url = `https://clerk.house.gov/evs/${year}/roll${p3}.xml`;
  const file = join(CACHE, `${year}-roll${p3}.xml`);
  if (existsSync(file)) return { xml: readFileSync(file, "utf8"), url, fresh: false };
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/xml,text/xml,*/*" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const xml = await res.text();
  writeFileSync(file, xml);
  return { xml, url, fresh: true };
}

const votes = [];
const rejected = [];
const discrepancies = [];
const stranded = [];
const repairs = [];
const outOfScope = new Map();     // slug → cells this wave declines to write
const unmappedBio = new Map();    // bioguide → cells still unattributable after R1
let fetched = 0, confirmed = 0, notListed = 0;

for (const r of inScope) {
  const at = `house ${r.congress}/${r.session}/${r.roll_number}`;
  let got;
  try { got = await rollXml(r.want.year, r.roll_number); } catch (e) {
    rejected.push({ at, measure: r.number, why: [String(e.message)] });
    continue;
  }
  const { xml, url } = got;
  if (got.fresh) fetched++;

  const why = [];
  if (Number(clean(tag(xml, "congress"))) !== Number(r.congress)) why.push(`document congress ${clean(tag(xml, "congress"))} ≠ ${r.congress}`);
  if (Number(clean(tag(xml, "rollcall-num"))) !== Number(r.roll_number)) why.push(`document rollcall-num ${clean(tag(xml, "rollcall-num"))} ≠ ${r.roll_number}`);
  // <session> is printed as "1st"/"2nd", so it is read as an ordinal rather than a number.
  const sess = clean(tag(xml, "session")).match(/^(\d+)/);
  if (!sess || Number(sess[1]) !== Number(r.session)) why.push(`document session "${clean(tag(xml, "session"))}" ≠ ${r.session}`);
  // On an amendment roll <legis-num> is the PARENT bill, so it is compared against the
  // parent when there is one. Getting this backwards is how a re-attach lands seven
  // amendments' worth of cells on the parent's passage roll.
  const legisNum = clean(tag(xml, "legis-num"));
  const claim = r.want.legisNum || legisNum;
  const expect = [r.number, r.parent_number, r.want.parent].filter(Boolean).map(flat);
  if (expect.length && !expect.includes(flat(legisNum)) && flat(legisNum) !== flat(claim))
    why.push(`document legis-num "${legisNum}" is neither the measure (${r.number}) nor its parent (${r.parent_number ?? r.want.parent ?? "none"})`);
  if (r.want.amendmentNum) {
    const an = clean(tag(xml, "amendment-num"));
    if (an !== String(r.want.amendmentNum)) why.push(`document amendment-num "${an}" ≠ the seed's ${r.want.amendmentNum}`);
  }

  // The tally authority is <totals-by-vote>, the full chamber — never a display string
  // and never the attributed subset. It has to agree with what vr_rollcalls stores, or
  // the row we hold is about a different vote than the document in front of us.
  const tb = tag(xml, "totals-by-vote");
  const doc = {
    yea: Number(clean(tag(tb, "yea-total"))), nay: Number(clean(tag(tb, "nay-total"))),
    present: Number(clean(tag(tb, "present-total"))), notVoting: Number(clean(tag(tb, "not-voting-total"))),
  };
  for (const [k, v] of Object.entries(doc)) if (!Number.isFinite(v)) why.push(`<totals-by-vote> has no readable ${k}`);
  const held0 = r.totals || {};
  for (const k of ["yea", "nay"]) {
    if (Number.isFinite(doc[k]) && Number(held0[k] ?? doc[k]) !== doc[k]) why.push(`stored ${k} total ${held0[k]} ≠ document's ${doc[k]}`);
  }

  const legs = [...xml.matchAll(/<recorded-vote>\s*<legislator ([^>]*)>[\s\S]*?<vote>([^<]*)<\/vote>/g)].map((m) => {
    const a = {}; for (const p of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) a[p[1]] = p[2];
    return { bioguideId: a["name-id"], state: a.state, party: a.party, vote: clean(m[2]) };
  });
  if (!legs.length) why.push("no <recorded-vote> rows parsed");
  const all = [];
  for (const l of legs) {
    if (!l.bioguideId) { why.push("a <legislator> row carries no name-id"); break; }
    const position = POS[l.vote];
    if (!position) { why.push(`position "${l.vote}" for ${l.bioguideId} is outside the closed vocabulary`); break; }
    all.push({ bioguideId: l.bioguideId, party: l.party, state: l.state, position });
  }
  // The document's own member rows must add up to the document's own totals.
  const tally = all.reduce((a, m) => ((a[m.position] = (a[m.position] || 0) + 1), a), {});
  for (const [k, t] of [["yea", "yea"], ["nay", "nay"], ["present", "present"], ["notVoting", "not_voting"]]) {
    if (Number.isFinite(doc[k]) && doc[k] !== (tally[t] || 0)) why.push(`document's own ${k} total ${doc[k]} ≠ ${tally[t] || 0} member rows`);
  }
  if (why.length) { rejected.push({ at, measure: r.number, why }); continue; }

  const flag = crossoverFlagger(all);
  const held = stored.get(r.id) || new Map();
  const memberVotes = [];
  const seen = new Set();
  for (const m of all) {
    const slug = memberMap[m.bioguideId];
    if (!slug) { unmappedBio.set(m.bioguideId, (unmappedBio.get(m.bioguideId) || 0) + 1); continue; }
    if (seen.has(slug)) throw new Error(`${at}: ${slug} appears twice — refusing to guess which cell is theirs`);
    seen.add(slug);
    if (held.has(slug)) {
      if (held.get(slug) === m.position) confirmed++;
      else discrepancies.push({ at, slug, bioguideId: m.bioguideId, db: held.get(slug), clerk: m.position, sourceUrl: url });
      continue;   // already stored — this pass fills gaps and repairs nothing
    }
    if (!R1_SLUGS.has(slug)) { outOfScope.set(slug, (outOfScope.get(slug) || 0) + 1); continue; }
    memberVotes.push({
      politicianId: slug, bioguideId: m.bioguideId, party: m.party, state: m.state,
      position: m.position, isParty: flag(m),
    });
  }

  // A stored cell for somebody the clerk's document does not list on this roll. The
  // walk above goes over the members the HOUSE names, so a row on our side with no
  // counterpart on theirs is the one shape of disagreement it structurally cannot see.
  // Named here and never touched — see the header of
  // 20261023120000_vr_repair_senate_roll7_over_attribution.sql for what one of these
  // looks like when it turns out to be real.
  for (const [slug, position] of held) {
    if (!seen.has(slug)) stranded.push({ at, slug, storedPosition: position, sourceUrl: url });
  }

  // The ceiling, and the refusal. Judged rows after this pass cannot outnumber the
  // document's own yea+nay: the attributed set is a subset of the chamber, and when it
  // cannot be, the roll needs a repair with its own citation rather than another cell.
  const judgedHeld = [...held.values()].filter((p) => p === "yea" || p === "nay").length;
  const judgedNew = memberVotes.filter((m) => m.position === "yea" || m.position === "nay").length;
  if (judgedHeld + judgedNew > doc.yea + doc.nay) {
    const line = `${judgedHeld} stored + ${judgedNew} new judged row(s) exceed the document's own yea+nay pool of ${doc.yea + doc.nay}`;
    rejected.push({ at, measure: r.number, why: [`${line} — this roll is refused whole and filed as a repair, not silently trimmed`] });
    repairs.push({
      at, measure: r.number, judgedStored: judgedHeld, judgedNew, documentPool: doc.yea + doc.nay,
      sourceUrl: url,
      whatIsNeeded: "a repair migration that names the stored cell which belongs to nobody the House lists, with its own citation. "
        + "No cell is written to this roll by wave R1 and no cell is deleted from it.",
    });
    continue;
  }

  const stillSkipped = all.length - seen.size;
  if (!memberVotes.length) {
    votes.push({ at, rollcallId: r.id, congress: r.congress, session: r.session, rollNumber: r.roll_number, nothingToFill: true, heldBefore: held.size, stillSkipped });
    continue;
  }
  memberVotes.sort((a, b) => a.politicianId.localeCompare(b.politicianId));
  votes.push({
    at,
    rollcallId: r.id,
    chamber: "house",
    congress: Number(r.congress), session: Number(r.session), rollNumber: Number(r.roll_number), clerkYear: r.want.year,
    voteDate: r.vote_date instanceof Date ? r.vote_date.toISOString().slice(0, 10) : String(r.vote_date).slice(0, 10),
    seededBy: r.want.seed, wave: r.want.wave,
    measure: r.number, measureType: r.measure_type, parentNumber: r.parent_number,
    question: r.question, actionType: r.action_type,
    issueKeys: r.issue_keys, primaryKeys: r.primary_keys,
    documentTotals: doc,
    sourceUrl: `https://clerk.house.gov/Votes/${r.want.year}${String(r.roll_number).padStart(3, "0")}`,
    xmlUrl: url,
    sourceLabel: "Office of the Clerk, U.S. House of Representatives",
    chamberRecorded: all.length,
    heldBefore: held.size,
    heldAfter: held.size + memberVotes.length,
    skippedBefore: r.want.skippedBefore,
    stillSkipped,
    memberVotes,
  });
}

// ── What the deferred rolls hold, from the record's own numbers ──────────────
// No document is fetched for these. recorded is the roll's own stored totals and
// held is what vr_member_votes carries, so the difference is the ceiling a later
// wave could reach — an upper bound, not a promise.
let deferredRecorded = 0, deferredHeld = 0;
const deferredRows = [];
for (const r of deferred) {
  const t = r.totals || {};
  const recorded = ["yea", "nay", "present", "notVoting"].reduce((a, k) => a + (Number(t[k]) || 0), 0);
  const held = (stored.get(r.id) || new Map()).size;
  deferredRecorded += recorded; deferredHeld += held;
  deferredRows.push({ at: `house ${r.congress}/${r.session}/${r.roll_number}`, measure: r.number, recorded, held, gap: Math.max(0, recorded - held) });
}

// Distinct slugs holding a cell on the in-scope rolls, before and after. The
// migration asserts the 'after' figure, so a typo in the slug list surfaces as a
// failed guard rather than as an orphan page nobody can reach.
const slugsBefore = new Set();
const slugsAfter = new Set();
for (const r of inScope) {
  for (const slug of (stored.get(r.id) || new Map()).keys()) { slugsBefore.add(slug); slugsAfter.add(slug); }
}
for (const v of votes) for (const m of v.memberVotes || []) slugsAfter.add(m.politicianId);

const written = votes.filter((v) => !v.nothingToFill);
const cells = written.reduce((a, v) => a + v.memberVotes.length, 0);
const judgedCells = written.reduce((a, v) => a + v.memberVotes.filter((m) => m.position === "yea" || m.position === "nay").length, 0);
const perSlug = {};
for (const v of written) for (const m of v.memberVotes) {
  const s = (perSlug[m.politicianId] ||= { cells: 0, judged: 0, onMappedMeasures: 0, keys: new Set() });
  s.cells++;
  if (m.position === "yea" || m.position === "nay") s.judged++;
  if (v.issueKeys.length) { s.onMappedMeasures++; v.issueKeys.forEach((k) => s.keys.add(k)); }
}
const perSlugOut = {};
for (const slug of Object.keys(perSlug).sort()) {
  const s = perSlug[slug], row = BY_SLUG.get(slug);
  perSlugOut[slug] = {
    name: row.name, bioguideId: row.bioguide, seat: row.stateDistrict ?? row.statedistrict ?? null,
    cells: s.cells, judgedCells: s.judged, cellsOnMappedMeasures: s.onMappedMeasures, issueKeysReached: [...s.keys].sort(),
  };
}
const slugsWithNoCell = [...R1_SLUGS].filter((s) => !perSlug[s]).sort();

const out = {
  _comment:
    "Federal roster wave R1 — the member × roll-call cells the 315 newly admitted House members are owed on "
    + "House roll calls the database ALREADY holds. Read from the Office of the Clerk's own roll-call XML; every "
    + "position here is a recorded vote in the cited document and nothing is inferred. No measure, roll call, "
    + "issue mapping or stated position is created by this seed, and no stored cell is touched. Regenerate with "
    + "scripts/vr-gen-federal-roster-r1-attribution-seed.mjs.",
  wave: "R1",
  rosterWave: WAVE,
  chamber: "house",
  source: "clerk.house.gov EVS roll-call XML",
  identityPath: "the clerk's own name-id (Bioguide) → db/vr-member-map.json → roster slug, and no other path",
  pulledAt: PULLED_AT,
  scope: {
    slugs: R1_SLUGS.size,
    seeds: SEED_FILES,
    rollsInScope: inScope.length,
    houseRollsInRecord: rolls.length,
    _comment: "The 23 House rolls the F6, F7 and F9 vote seeds ingested. Addresses read out of those seeds, not retyped.",
  },
  rollCalls: written.length,
  rollsWithNothingToFill: votes.length - written.length,
  distinctSlugsOnScopedRollsBefore: slugsBefore.size,
  distinctSlugsOnScopedRollsAfter: slugsAfter.size,
  issueRowsOnScopedMeasures: {
    _comment:
      "Issue rows already sitting on the measures THIS WAVE'S 23 rolls belong to, read before a cell was written. "
      + "The migration asserts this number is unchanged: a new mapping or a new key appearing on a measure "
      + "would be this wave arguing about what a vote meant, which is not its argument.",
    total: issueRowsScoped,
  },
  rollsRejected: rejected.length,
  cells,
  judgedCells,
  slugsAttributed: Object.keys(perSlugOut).length,
  perSlug: perSlugOut,
  issueKeysReached: [...new Set(written.flatMap((v) => v.issueKeys))].sort(),
  primaryIssueKeysReached: [...new Set(written.flatMap((v) => v.primaryKeys))].sort(),
  admittedSlugsWithNoCell: {
    _comment:
      "Slugs this wave admits that gain nothing here. Every one of them is a member the roster now carries "
      + "and whose votes the NEXT pull will attach; a slug with no cell in this corpus is not a failed "
      + "admission, it is a member none of these 23 rolls lists.",
    total: slugsWithNoCell.length,
    slugs: slugsWithNoCell,
  },
  storedCellsConfirmed: {
    _comment: "Cells we already stored that the clerk's document agrees with, re-read on the way past. Nothing was rewritten.",
    total: confirmed,
  },
  outOfScopeCells: {
    _comment:
      "Missing AND resolvable cells belonging to a slug this wave did not admit. Counted here and NOT written: "
      + "a densification pass over the rest of the roster is a different wave with a different argument, and a "
      + "wave that quietly widens its own scope cannot be reviewed.",
    total: [...outOfScope.values()].reduce((a, b) => a + b, 0),
    bySlug: Object.fromEntries([...outOfScope.entries()].sort((a, b) => b[1] - a[1])),
  },
  stillUnattributable: {
    _comment:
      "Recorded positions still skipped after R1, per Bioguide. These are the wave's written refusals doing "
      + "their job — the six delegates, who hold no district and are refused in "
      + "db/vr-federal-roster-r1-census.json, and members who have since left the 119th. Skipped and counted, "
      + "never guessed.",
    cells: [...unmappedBio.values()].reduce((a, b) => a + b, 0),
    byBioguide: Object.fromEntries([...unmappedBio.entries()].sort((a, b) => b[1] - a[1])),
  },
  strandedStoredCells: {
    _comment:
      "Cells we ALREADY store for a member the clerk's document does not list on that roll. Reported, never "
      + "written and never removed here: repairing a stored cell is its own migration with its own citation.",
    total: stranded.length,
    rows: stranded,
  },
  discrepancies: {
    _comment:
      "Cells we ALREADY store whose stored position disagrees with the clerk's document. This wave does not "
      + "touch them — the migration it feeds is ON CONFLICT DO NOTHING throughout, so a disagreement stays "
      + "visible and stays a decision rather than becoming a side effect of a roster wave.",
    total: discrepancies.length,
    rows: discrepancies,
  },
  repairsFiled: {
    _comment:
      "Rolls refused whole because the judged rows after this pass would outnumber the document's own yea+nay. "
      + "A repair with its own citation is owed on each; no cell is added and no cell is deleted by R1.",
    total: repairs.length,
    rows: repairs,
  },
  rejectedRolls: {
    _comment: "Rolls dropped whole because the clerk's document disagreed with what we store about them, or because it could not be read.",
    total: rejected.length,
    rows: rejected,
  },
  deferredRolls: {
    _comment:
      "House rolls in the record that this wave does NOT re-read, by name. The brief scopes the re-attach to "
      + "the F6–F9 House seeds and any earlier House seed whose XML is still on disk; no earlier House seed's "
      + "XML is on disk, and these rolls reach back into the 117th and 118th Congresses, where a sitting "
      + "member's presence is a fact about a chamber this wave's census did not read. 'gap' is recorded minus "
      + "held from the record's own numbers — an upper bound on what a later wave could recover, not a promise.",
    total: deferred.length,
    recordedPositions: deferredRecorded,
    storedCells: deferredHeld,
    gap: Math.max(0, deferredRecorded - deferredHeld),
    rows: deferredRows,
  },
  votes: written,
};

writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

console.log(`fetched ${fetched} document(s) · verified ${written.length + (votes.length - written.length)} · rejected whole ${rejected.length}`);
for (const x of rejected) console.log(`   ${x.at} · ${x.measure}: ${x.why.join("; ")}`);
console.log(`cells written: ${cells} (${judgedCells} judged) across ${written.length} roll(s), on ${Object.keys(perSlugOut).length} of ${R1_SLUGS.size} admitted slug(s)`);
for (const v of written)
  console.log(`   ${v.at} ${String(v.measure).padEnd(13)} held ${String(v.heldBefore).padStart(3)} → ${String(v.heldAfter).padStart(3)} (+${String(v.memberVotes.length).padStart(3)})  skipped ${String(v.skippedBefore).padStart(3)} → ${String(v.stillSkipped).padStart(3)}  pool ${v.documentTotals.yea}-${v.documentTotals.nay}`);
console.log(`stored cells confirmed: ${confirmed} · contradicted: ${discrepancies.length} · stranded: ${stranded.length} · repairs filed: ${repairs.length}`);
console.log(`out-of-scope cells declined: ${out.outOfScopeCells.total} · still unattributable: ${out.stillUnattributable.cells} across ${Object.keys(out.stillUnattributable.byBioguide).length} Bioguide(s)`);
console.log(`admitted slugs with no cell in this corpus: ${slugsWithNoCell.length}`);
console.log(`deferred by name: ${deferred.length} roll(s), ${out.deferredRolls.gap} recorded position(s) left on the table`);
console.log(`✓ wrote ${OUT}`);
