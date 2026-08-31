#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Federal wave F8 — vote seed: the three senators' Senate record
// ─────────────────────────────────────────────────────────────────────────────
// F8 ingests no new roll call. It admits three serving senators to the roster and
// then pays the debt that admission creates: every Senate roll call already in the
// record lost the same three rows, on every roll, because the ingest resolves a
// member only through db/vr-member-map.json and none of the three was in it.
//
// Wave F7 measured that loss and refused to guess at it — "37 unattributable rows
// per Senate roll … named rather than fixed, because adding a roster slug is a
// roster wave with its own argument". This is that wave, and this script is the
// part of it that reads the votes.
//
// WHAT IT WRITES AND WHAT IT REFUSES TO WRITE
// Only cells for the three slugs F8 admits. A Senate roll typically lists a hundred
// members and most of their cells are already stored; a densification pass over all
// of them is a different wave with a different argument, so any OTHER newly-fillable
// cell this pull happens to find is counted and named in the seed, never written.
//
// IDENTITY RUNS THROUGH PUBLISHED IDENTIFIERS, NOT NAMES
// The Senate identifies a voter by <lis_member_id>, which is not a Bioguide. Three
// hops, each a published identifier: <lis_member_id> → Bioguide (congress-legislators,
// current and historical) → profile slug (db/vr-member-map.json). No name matching and
// no (surname, state) key — the earlier federal waves' Senate resolver folded names
// because the rolls they ingested were new; here the roll is already ours and the
// document carries the LIS id, so the stronger key is available and is used.
//
// An LIS id that resolves to a Bioguide the map does not carry is skipped and counted.
// An LIS id in neither legislators dataset is skipped and counted. Nothing is guessed.
//
// EVERY ROLL IS IDENTITY-VERIFIED BEFORE A CELL IS TAKEN FROM IT
// congress · session · vote_number · the measure the document says it is about (or its
// parent, or — for a nomination filed under a human label — the nominee's surname AND
// the office our title says they were confirmed to) · the document's own
// yea/nay/present/absent counts against the members it actually lists · an LIS id on
// every member row · a vote_cast inside the Senate's four dispositions. A roll that
// disagrees on any axis is dropped whole rather than partially trusted.
//
// IT REPAIRS NOTHING
// A cell we already store is re-read against the document and any disagreement is
// written into the seed for a human. Correcting a stored vote is a deliberate act with
// its own citation; it does not belong in the quiet middle of a roster wave.
//
// AND IT COUNTS THE ROOM LEFT IN THE ROLL BEFORE IT FILLS IT
// Comparing our cells against the document's members can only ever find the members the
// document HAS. A stored row for somebody it does not list is never reached by that
// walk, so two rules stand beside it, both learned from senate 119/1 roll 7 — where a
// party-bloc insert had given a yea to a senator seated the day after the vote, three
// document reads walked past it, and wave F8's deploy-time verification found it:
//   • Stored cells with no counterpart in the document are reported under
//     strandedStoredCells. Reported, never written and never deleted.
//   • A roll whose judged rows — stored plus the ones this pass would add — would
//     outnumber the document's own yea+nay count is refused whole. The attributed set is
//     a subset of the chamber; when it cannot be, the roll needs a repair with its own
//     citation, not another cell. (The roll-7 repair is
//     20261023120000_vr_repair_senate_roll7_over_attribution.sql, and the seed committed
//     to this tree predates both rules.)
//
//   node scripts/vr-gen-federal-wave-f8-attribution-seed.mjs [--pulled-at=YYYY-MM-DD]
//
// Reads the database (NETLIFY_DB_URL) and senate.gov. Writes one JSON seed.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "db", "vr-federal-wave-f8-attribution-seed.json");
const CACHE = join(ROOT, ".netlify", "lis");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

// Pinned rather than read from the clock, so re-running the pull produces a seed that
// differs only where the source did.
const PULLED_AT = (process.argv.find((a) => a.startsWith("--pulled-at=")) || "--pulled-at=2026-08-31").slice(12);

// The whole scope of this wave's writes. Each was admitted to the roster in the same
// pass (db/vr-roster-admitted.json → federal_wave_f8_aug2026) and each was verified
// twice before admission: name+state → Bioguide in legislators-current.json, and the
// LIS id the Senate's own roll XML records for them → id.lis in the same dataset.
const F8_SLUGS = {
  jon_husted: { bioguide: "H001104", lis: "S438", name: "Jon Husted", state: "OH" },
  hyde_smith: { bioguide: "H001079", lis: "S395", name: "Cindy Hyde-Smith", state: "MS" },
  alan_armstrong: { bioguide: "A000383", lis: "S440", name: "Alan Armstrong", state: "OK" },
};

const pad5 = (n) => String(n).padStart(5, "0");
const xmlUrl = (c, s, roll) =>
  `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${c}${s}/vote_${c}_${s}_${pad5(roll)}.xml`;
const htmUrl = (c, s, roll) =>
  `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${c}${s}/vote_${c}_${s}_${pad5(roll)}.htm`;

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : "";
};
const nrm = (s) => String(s || "").toLowerCase().replace(/[.\s]/g, "");

// The Senate's four dispositions. Anything else — an impeachment trial's
// "Guilty"/"Not Guilty", say — means this is not a roll our position vocabulary can
// carry honestly, and the roll is refused rather than flattened into not_voting.
function normPos(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (t === "yea") return "yea";
  if (t === "nay") return "nay";
  if (t === "present") return "present";
  if (t === "not voting") return "not_voting";
  return null;
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/xml,text/xml,*/*" } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return await r.text();
}

async function legislators(file, url) {
  const local = join(ROOT, "scripts", file);
  if (existsSync(local)) return JSON.parse(readFileSync(local, "utf8"));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`could not load ${file}: ${r.status}`);
  return await r.json();
}

async function lisIndex() {
  const idx = new Map();
  const add = (rows) => {
    for (const p of rows) {
      const lis = p.id && p.id.lis;
      const bio = p.id && p.id.bioguide;
      if (!lis || !bio) continue;
      // Current wins: a re-used LIS id would otherwise resolve to whoever left first.
      if (!idx.has(lis)) idx.set(lis, { bio, name: (p.name && (p.name.official_full || `${p.name.first} ${p.name.last}`)) || bio });
    }
  };
  add(await legislators("legislators-current.json", "https://unitedstates.github.io/congress-legislators/legislators-current.json"));
  add(await legislators("legislators-historical.json", "https://unitedstates.github.io/congress-legislators/legislators-historical.json"));
  return idx;
}

// ── The roll calls we already hold ───────────────────────────────────────────
// All of them, not only the ones whose measure carries issue mappings. A cell on an
// unmapped measure is still a recorded vote on the member's own record even though it
// produces no issue act, and the seed reports the split so the difference between
// "gains a row" and "gains an act" stays visible.
const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const rolls = (await client.query(`
  SELECT r.id, r.congress, r.session, r.roll_number, r.vote_date, r.question, r.action_type,
         m.number, m.measure_type, m.title, p.number AS parent_number,
         COALESCE((SELECT array_agg(mi.issue_key ORDER BY mi.issue_key) FROM vr_measure_issues mi WHERE mi.measure_id = m.id), '{}') AS issue_keys,
         COALESCE((SELECT array_agg(mi.issue_key ORDER BY mi.issue_key) FROM vr_measure_issues mi WHERE mi.measure_id = m.id AND mi.is_primary), '{}') AS primary_keys
    FROM vr_rollcalls r
    JOIN vr_measures m ON m.id = r.measure_id
    LEFT JOIN vr_measures p ON p.id = m.parent_id
   WHERE r.chamber = 'senate'
   ORDER BY r.congress, r.session, r.roll_number`)).rows;

const stored = new Map(); // rollcall id → Map(slug → position)
for (const r of (await client.query(`
  SELECT v.rollcall_id, v.politician_id, v.position
    FROM vr_member_votes v JOIN vr_rollcalls r ON r.id = v.rollcall_id
   WHERE r.chamber = 'senate'`)).rows) {
  if (!stored.has(r.rollcall_id)) stored.set(r.rollcall_id, new Map());
  stored.get(r.rollcall_id).set(r.politician_id, r.position);
}
await client.end();

const memberMap = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8")).map || {};
for (const [slug, who] of Object.entries(F8_SLUGS)) {
  if (memberMap[who.bioguide] !== slug) {
    throw new Error(`db/vr-member-map.json resolves ${who.bioguide} to '${memberMap[who.bioguide] ?? "nothing"}', not '${slug}'. `
      + `Regenerate the map (node scripts/vr-gen-member-map.mjs) before pulling this seed.`);
  }
}
const LIS = await lisIndex();
for (const [slug, who] of Object.entries(F8_SLUGS)) {
  const ent = LIS.get(who.lis);
  if (!ent || ent.bio !== who.bioguide) {
    throw new Error(`LIS id ${who.lis} resolves to '${ent ? ent.bio : "nothing"}', not ${who.bioguide} (${slug}). `
      + `The second of the two verification paths for this slug no longer holds.`);
  }
}
console.log(`senate rolls in the record: ${rolls.length} · LIS → Bioguide index: ${LIS.size} senators`);
console.log(`scope: ${Object.keys(F8_SLUGS).length} slugs — ${Object.keys(F8_SLUGS).join(", ")}`);

// ── Pull, verify, resolve ────────────────────────────────────────────────────
if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });

const votes = [];
const rejected = [];
const discrepancies = [];
const outOfScope = new Map();   // slug → count of cells this wave declines to write
const notServing = [];          // roll addresses where a scoped senator is simply not listed
const stranded = [];            // stored cells for members the document does not list at all
let fetched = 0, confirmed = 0, unresolvedLisCells = 0, unmappedBioCells = 0, nothingToFill = 0;

for (const r of rolls) {
  // A roll with no roll number has no LIS document to be checked against: the rows we
  // hold for it cite the session's vote menu, not a vote. There is nothing here to fill
  // safely, so it is refused by name rather than fetched at a guessed URL.
  if (r.roll_number == null) {
    rejected.push({
      congress: r.congress, session: r.session, roll: null, measure: r.number,
      why: ["no roll number stored, so there is no LIS document to verify against"],
    });
    continue;
  }
  const url = xmlUrl(r.congress, r.session, r.roll_number);
  const cached = join(CACHE, `${r.congress}-${r.session}-${pad5(r.roll_number)}.xml`);
  let xml;
  if (existsSync(cached)) xml = readFileSync(cached, "utf8");
  else {
    try { xml = await fetchText(url); } catch (e) {
      rejected.push({ congress: r.congress, session: r.session, roll: r.roll_number, measure: r.number, why: [String(e.message)] });
      continue;
    }
    writeFileSync(cached, xml);
    fetched++;
  }

  const where = `${r.congress}/${r.session} roll ${r.roll_number}`;
  const why = [];
  if (Number(tag(xml, "congress")) !== Number(r.congress)) why.push(`congress ${tag(xml, "congress")} ≠ ${r.congress}`);
  if (Number(tag(xml, "session")) !== Number(r.session)) why.push(`session ${tag(xml, "session")} ≠ ${r.session}`);
  if (Number(tag(xml, "vote_number")) !== Number(r.roll_number)) why.push(`vote_number ${tag(xml, "vote_number")} ≠ ${r.roll_number}`);

  const docName = `${tag(xml, "document_type")} ${tag(xml, "document_number")}`.trim() || tag(xml, "document_name");
  const amdt = tag(xml, "amendment_number");
  const claimed = [docName, tag(xml, "vote_title"), amdt].map(nrm).filter(Boolean);
  const ours = nrm(r.number);
  const parent = nrm(r.parent_number);
  if (claimed.length && !claimed.some((c) => c.includes(ours) || (parent && c.includes(parent)))) {
    // A nomination is the one measure shape whose number we do not always store as the
    // Senate prints it: some rows are filed under a human label ("Bondi — AG") rather
    // than a PN number, so the number axis cannot speak for them. Two other facts in the
    // document can, and both must hold — the nominee's surname AND the office our title
    // says they were confirmed to. Name alone would let a second Kennedy through, and
    // office alone would match every nominee to that post.
    const nomOk = (() => {
      if (r.measure_type !== "nomination") return false;
      const text = nrm(`${tag(xml, "vote_document_text")} ${tag(xml, "vote_title")}`);
      const surname = nrm(String(r.number).split(/[—–-]/)[0]);
      const office = nrm((String(r.title).match(/\bto be\s+(.+)$/i) || [])[1] || "");
      return !!surname && !!office && text.includes(surname) && text.includes(office);
    })();
    if (!nomOk) why.push(`document says '${docName || tag(xml, "vote_title")}', we filed it under '${r.number}'`);
  }

  const blocks = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => m[1]);
  if (!blocks.length) why.push("no member rows");
  const lines = [];
  for (const block of blocks) {
    const lis = tag(block, "lis_member_id");
    const pos = normPos(tag(block, "vote_cast"));
    if (!lis) { why.push("a member row carries no lis_member_id"); break; }
    if (!pos) { why.push(`vote_cast '${tag(block, "vote_cast")}' is outside the Senate's four dispositions`); break; }
    lines.push({ lis, party: tag(block, "party"), state: tag(block, "state"), position: pos });
  }
  const tally = lines.reduce((a, l) => ((a[l.position] = (a[l.position] || 0) + 1), a), {});
  // The document's own <count> block. Never <vote_tally>, whose value is a display
  // string — "51-42" parses as 5142 and would pass a numeric comparison against nothing.
  const cnt = (xml.match(/<count>([\s\S]*?)<\/count>/) || [])[1] || "";
  const claim = {
    yea: Number(tag(cnt, "yeas") || tag(cnt, "yea") || 0),
    nay: Number(tag(cnt, "nays") || tag(cnt, "nay") || 0),
    present: Number(tag(cnt, "present") || 0),
    not_voting: Number(tag(cnt, "absent") || tag(cnt, "not_voting") || 0),
  };
  for (const k of ["yea", "nay", "present", "not_voting"]) {
    if (claim[k] !== (tally[k] || 0)) why.push(`document's own ${k} count ${claim[k]} ≠ ${tally[k] || 0} member rows`);
  }

  if (why.length) { rejected.push({ congress: r.congress, session: r.session, roll: r.roll_number, measure: r.number, why }); continue; }

  // Party tally from THIS document, for is_party. It describes where a member stood
  // among their own colleagues on this vote and nothing else — a stored fact about the
  // roll, not a score, and nothing in the product ranks on it.
  const partyTotals = {};
  for (const l of lines) {
    if (l.position !== "yea" && l.position !== "nay") continue;
    const p = (partyTotals[l.party] ||= { yea: 0, nay: 0 });
    p[l.position]++;
  }

  const held = stored.get(r.id) || new Map();
  const memberVotes = [];
  const seen = new Set();
  for (const l of lines) {
    const ent = LIS.get(l.lis);
    if (!ent) { unresolvedLisCells++; continue; }
    const slug = memberMap[ent.bio];
    if (!slug) { unmappedBioCells++; continue; }
    if (seen.has(slug)) throw new Error(`${where}: ${slug} appears twice — refusing to guess which cell is theirs`);
    seen.add(slug);
    if (held.has(slug)) {
      if (held.get(slug) === l.position) confirmed++;
      else discrepancies.push({
        congress: r.congress, session: r.session, roll: r.roll_number, slug,
        db: held.get(slug), lis: l.position, sourceUrl: url,
      });
      continue; // already stored — this pass fills gaps and repairs nothing
    }
    // Missing, and resolvable. Is it this wave's to write?
    if (!F8_SLUGS[slug]) { outOfScope.set(slug, (outOfScope.get(slug) || 0) + 1); continue; }
    const pt = partyTotals[l.party];
    const isParty = (l.position !== "yea" && l.position !== "nay") || !pt
      ? null
      : ((pt.yea >= pt.nay ? "yea" : "nay") === l.position ? "with_party" : "against_party");
    memberVotes.push({ lisMemberId: l.lis, bioguideId: ent.bio, politicianId: slug, party: l.party, state: l.state, position: l.position, isParty });
  }

  // A STORED cell for somebody the document does not list at all. The loop above walks
  // the members the SENATE names and compares each against what we hold, so a row on our
  // side with no counterpart on theirs is never reached by it — the one shape of
  // disagreement that this direction of comparison structurally cannot see.
  //
  // Senate 119/1 roll 7 is why this is here. An early wave completed that roll's
  // Republican side from a CURRENT roster array, which handed a yea to ashley_moody —
  // seated 2025-01-21, the day after the vote. Three separate reads of the Senate's own
  // document walked past it, and the deploy found it a year of migrations later, when
  // wave F8's verification block noticed the roll had a hundred judged rows and
  // ninety-nine votes. Repaired in 20261023120000_vr_repair_senate_roll7_over_attribution.sql.
  //
  // Named here and never touched: repairing a stored cell is its own migration with its
  // own citation. And named rather than refused, because a stored slug can also fall
  // outside `seen` innocently — a document member whose LIS id is in neither legislators
  // dataset resolves to no slug here, so their real cell would look stranded to this
  // check if it had been seeded by hand. The refusal below is the one that is unambiguous.
  for (const slug of held.keys()) {
    if (!seen.has(slug)) {
      stranded.push({ congress: r.congress, session: r.session, roll: r.roll_number, slug, storedPosition: held.get(slug), sourceUrl: url });
    }
  }

  // THE POOL HAS A CEILING, AND IT IS THE DOCUMENT'S OWN COUNT.
  // Attributed rows are a subset of the chamber, so the judged rows we would hold after
  // this pass cannot outnumber the document's yea+nay. If they do, one of them is not
  // anybody's, and writing this wave's cell on top would bake the contradiction into a
  // migration whose verification block then refuses to apply — which is exactly how roll
  // 7 surfaced, at deploy time rather than here with the document still open. Refuse the
  // roll whole and say why, on the same terms as every other identity failure above.
  const judgedHeld = [...held.values()].filter((p) => p === "yea" || p === "nay").length;
  const judgedNew = memberVotes.filter((mv) => mv.position === "yea" || mv.position === "nay").length;
  if (judgedHeld + judgedNew > claim.yea + claim.nay) {
    rejected.push({
      congress: r.congress, session: r.session, roll: r.roll_number, measure: r.number,
      why: [`${judgedHeld} stored + ${judgedNew} new judged row(s) exceed the document's own `
        + `yea+nay pool of ${claim.yea + claim.nay} — a stored cell on this roll belongs to nobody the `
        + `Senate lists, and it needs its own repair before a cell can be added here`],
    });
    continue;
  }

  // A scoped senator the document does not list was not in the Senate on that date —
  // Husted was appointed 2025-01-21 and Armstrong sworn 2026-03-24, so most of the
  // corpus predates them. Recorded rather than passed over, so the per-slug totals
  // below can be read against a term rather than against a mystery.
  for (const slug of Object.keys(F8_SLUGS)) {
    if (!seen.has(slug)) notServing.push({ congress: r.congress, session: r.session, roll: r.roll_number, slug });
  }

  if (!memberVotes.length) { nothingToFill++; continue; }
  memberVotes.sort((a, b) => a.politicianId.localeCompare(b.politicianId));
  votes.push({
    chamber: "senate",
    congress: Number(r.congress),
    session: Number(r.session),
    rollNumber: Number(r.roll_number),
    voteDate: r.vote_date instanceof Date ? r.vote_date.toISOString().slice(0, 10) : String(r.vote_date).slice(0, 10),
    measure: r.number,
    measureType: r.measure_type,
    question: r.question,
    actionType: r.action_type,
    issueKeys: r.issue_keys,
    primaryKeys: r.primary_keys,
    partyTotals,
    sourceUrl: url,
    sourceLabel: `U.S. Senate roll call ${r.congress}-${r.session}-${r.roll_number}`,
    pageUrl: htmUrl(r.congress, r.session, r.roll_number),
    heldBefore: held.size,
    memberVotes,
  });
}

const cells = votes.reduce((a, v) => a + v.memberVotes.length, 0);
const perSlug = {};
for (const v of votes) for (const mv of v.memberVotes) {
  const s = (perSlug[mv.politicianId] ||= { cells: 0, rolls: 0, onMappedMeasures: 0, keys: new Set(), primaryKeys: new Set() });
  s.cells++; s.rolls++;
  if (v.issueKeys.length) s.onMappedMeasures++;
  v.issueKeys.forEach((k) => s.keys.add(k));
  v.primaryKeys.forEach((k) => s.primaryKeys.add(k));
}
const perSlugOut = {};
for (const [slug, s] of Object.entries(perSlug)) {
  perSlugOut[slug] = {
    name: F8_SLUGS[slug].name, bioguideId: F8_SLUGS[slug].bioguide, lisMemberId: F8_SLUGS[slug].lis,
    cells: s.cells, rollsAppearedOn: s.rolls, cellsOnMappedMeasures: s.onMappedMeasures,
    issueKeysReached: [...s.keys].sort(), primaryIssueKeysReached: [...s.primaryKeys].sort(),
  };
}
const keysTouched = [...new Set(votes.flatMap((v) => v.issueKeys))].sort();
const primaryTouched = [...new Set(votes.flatMap((v) => v.primaryKeys))].sort();

writeFileSync(OUT, JSON.stringify({
  _comment:
    "Federal wave F8 — the member × roll-call cells the three senators F8 admits are owed on Senate roll " +
    "calls the database ALREADY holds. Read from the Secretary of the Senate's own LIS XML; every position " +
    "here is a recorded vote in the cited document and nothing is inferred. No measure, roll call, issue " +
    "mapping or stated position is created by this seed, and no stored cell is touched. Cells for slugs " +
    "outside this wave's three are counted under outOfScopeCells and deliberately not written. Regenerate " +
    "with scripts/vr-gen-federal-wave-f8-attribution-seed.mjs.",
  wave: "F8",
  chamber: "senate",
  source: "senate.gov roll-call XML (LIS)",
  identityPath: "<lis_member_id> → Bioguide (congress-legislators current + historical) → profile slug (db/vr-member-map.json)",
  pulledAt: PULLED_AT,
  scopedSlugs: F8_SLUGS,
  rollsConsidered: rolls.length,
  rollsRejected: rejected.length,
  rollsWithNothingToFill: nothingToFill,
  rollCalls: votes.length,
  cells,
  perSlug: perSlugOut,
  issueKeysReached: keysTouched,
  primaryIssueKeysReached: primaryTouched,
  storedCellsConfirmed: confirmed,
  outOfScopeCells: {
    _comment:
      "Cells that are missing AND resolvable but belong to a slug this wave did not admit. Counted here " +
      "and NOT written: a densification pass over the rest of the chamber is a different wave with a " +
      "different argument, and a wave that quietly widens its own scope cannot be reviewed.",
    total: [...outOfScope.values()].reduce((a, b) => a + b, 0),
    bySlug: Object.fromEntries([...outOfScope.entries()].sort((a, b) => b[1] - a[1])),
  },
  notServing: {
    _comment:
      "Roll calls where a scoped senator is absent from the Senate's own member list, because they were " +
      "not yet serving. Husted was appointed 2025-01-21, Armstrong sworn 2026-03-24; Hyde-Smith has served " +
      "since 2018 and is listed on every verified roll. No cell is written for an absence.",
    total: notServing.length,
    bySlug: Object.fromEntries(Object.keys(F8_SLUGS).map((s) => [s, notServing.filter((n) => n.slug === s).length])),
  },
  unresolvedCells: {
    _comment: "Recorded votes skipped, never guessed: an LIS id in neither legislators dataset, or one whose Bioguide the member map does not carry.",
    lisIdUnresolvable: unresolvedLisCells,
    bioguideNotInMemberMap: unmappedBioCells,
  },
  strandedStoredCells: {
    _comment:
      "Cells we ALREADY store for a member the Senate's document does not list on that roll. Reported, " +
      "never written and never removed here — see the header of " +
      "netlify/database/migrations/20261023120000_vr_repair_senate_roll7_over_attribution.sql for what one " +
      "of these looks like and how it is repaired. A stored slug can also land here innocently, when a " +
      "document member's LIS id resolves in neither legislators dataset, so each row is a reading task and " +
      "not a verdict.",
    total: stranded.length,
    rows: stranded,
  },
  discrepancies: {
    _comment:
      "Cells we ALREADY store whose stored position disagrees with the Senate's document. This wave does " +
      "not touch them: the migration it feeds is ON CONFLICT DO NOTHING throughout, so a disagreement stays " +
      "visible and stays a decision rather than becoming a side effect of a roster wave.",
    rows: discrepancies,
  },
  rejectedRolls: {
    _comment: "Roll calls dropped whole because the document disagreed with what we store about them, or because there is no document to check.",
    rows: rejected,
  },
  votes,
}, null, 2) + "\n");

console.log(`fetched ${fetched} document(s) · identity-verified ${rolls.length - rejected.length} · rejected whole ${rejected.length}`);
for (const r of rejected) console.log(`   ${r.congress}/${r.session} roll ${r.roll ?? "(none stored)"} · ${r.measure}: ${r.why.join("; ")}`);
console.log(`cells written: ${cells} across ${votes.length} rolls`);
for (const [slug, s] of Object.entries(perSlugOut)) {
  console.log(`   ${slug}: ${s.cells} cells, ${s.cellsOnMappedMeasures} on mapped measures, keys reached: ${s.issueKeysReached.length}`);
}
console.log(`rolls with nothing to fill: ${nothingToFill} · out-of-scope cells declined: ${[...outOfScope.values()].reduce((a, b) => a + b, 0)}`);
console.log(`stored cells confirmed by the Senate's document: ${confirmed} · contradicted: ${discrepancies.length} · stored for a member the document does not list: ${stranded.length}`);
for (const t of stranded) console.log(`   ${t.congress}/${t.session} roll ${t.roll}: ${t.slug} stored '${t.storedPosition}', the document does not list them`);
for (const d of discrepancies) console.log(`   ${d.congress}/${d.session} roll ${d.roll}: ${d.slug} stored '${d.db}', document says '${d.lis}'`);
console.log(`✓ wrote ${OUT}`);
