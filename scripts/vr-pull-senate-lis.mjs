#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — Senate roll-call attribution pull (senate.gov LIS XML)
// ─────────────────────────────────────────────────────────────────────────────
// The Senate half of the coverage backfill. It reads the roll calls the database
// ALREADY holds, fetches the Secretary of the Senate's own XML for each one, and
// writes db/vr-senate-lis-backfill-seed.json listing the member × roll-call cells
// that are missing. It creates nothing: no measure, no roll call, no issue mapping,
// no stated position, no profile.
//
// WHY THE SENATE NEEDED ITS OWN PASS
// The House gap was seeding thinness — rolls arrived with a handful of hand-listed
// voters. The Senate gap has the same shape and a second cause: the ingest resolves a
// member only through db/vr-member-map.json, and that map is derived from the curated
// portrait shelf, which for a long time carried no photo for fifty-five sitting
// senators — including the chairs and ranking members of Appropriations, Armed
// Services, Agriculture, Commerce, Energy & Natural Resources, Environment & Public
// Works, Finance, HELP, Homeland Security, Intelligence and Veterans' Affairs. A
// senator with no face could not be attributed a vote at all, so those profiles read
// as though the member had barely voted while their colleagues showed a full record.
//
// IDENTITY, WHICH IS THE ONLY THING THAT MATTERS HERE
// senate.gov identifies a voter by <lis_member_id>, a stable Senate ID that is NOT a
// Bioguide. It is resolved through the authoritative congress-legislators datasets
// (current, and historical for members who have since left) to a Bioguide, and only
// then through the member map to a profile slug. Three hops, each one a published
// identifier — no name matching, no state-and-party guessing. An LIS ID that does not
// resolve is skipped and counted, never guessed, and a roll whose document disagrees
// with what we store about it on ANY axis below is dropped whole rather than
// partially trusted:
//
//   congress · session · vote_number · the measure the vote is on (or its parent)
//   · the document's own yea/nay/present/absent counts against the members it
//   actually lists · an LIS id on every member · a vote_cast vocabulary we recognise
//
// The last one is deliberate: an impeachment trial roll records "Guilty"/"Not Guilty",
// which our position vocabulary has no honest home for, so such a roll is refused
// rather than flattened into not_voting.
//
// WHAT IT DOES NOT DO
// It does not repair. Cells we already store are re-read against the document and any
// disagreement is written into the seed's `discrepancies` block for a human, because
// correcting a stored vote is a deliberate act with its own citation and does not
// belong in the quiet middle of a densification pass.
//
//   node scripts/vr-pull-senate-lis.mjs [--pulled-at=YYYY-MM-DD]
//
// Reads the database (NETLIFY_DB_URL) and the network. Writes one JSON seed.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "db", "vr-senate-lis-backfill-seed.json");
const CACHE = join(ROOT, ".netlify", "lis");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

// Pinned rather than read from the clock so re-running the pull produces a seed that
// differs only where the source did.
const PULLED_AT = (process.argv.find((a) => a.startsWith("--pulled-at=")) || "--pulled-at=2026-08-15").slice(12);

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

// The Senate's four dispositions. Anything else means this is not a roll our position
// vocabulary can carry honestly — see the header.
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

// ── LIS → Bioguide, from the authoritative datasets ──────────────────────────
async function legislators(file, url) {
  const local = join(ROOT, "scripts", file);
  if (existsSync(local)) return JSON.parse(readFileSync(local, "utf8"));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`could not load ${file}: ${r.status}`);
  return await r.json();
}

async function lisIndex(needHistorical) {
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
  if (needHistorical) {
    add(await legislators("legislators-historical.json", "https://unitedstates.github.io/congress-legislators/legislators-historical.json"));
  }
  return idx;
}

// ── The roll calls we already hold ───────────────────────────────────────────
const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const rolls = (await client.query(`
  SELECT r.id, r.congress, r.session, r.roll_number, r.vote_date, r.question, r.action_type, r.totals, r.source_url,
         m.number, m.measure_type, m.title, p.number AS parent_number,
         COALESCE((SELECT array_agg(mi.issue_key ORDER BY mi.issue_key) FROM vr_measure_issues mi WHERE mi.measure_id = m.id), '{}') AS issue_keys
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

const mapped = rolls.filter((r) => (r.issue_keys || []).length > 0);
console.log(`senate rolls in the record: ${rolls.length} · on measures that already carry issue mappings: ${mapped.length}`);

const memberMap = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8")).map || {};
const LIS = await lisIndex(true);
console.log(`LIS → Bioguide index: ${LIS.size} senators (current + historical)`);

// ── Pull, verify, resolve ────────────────────────────────────────────────────
if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });

const votes = [];
const rejected = [];
const discrepancies = [];
const unresolvedLis = new Map();
let fetched = 0, confirmed = 0, skippedUnmapped = 0, alreadyComplete = 0;

for (const r of mapped) {
  // A roll with no roll number has no LIS document to be checked against: the rows we
  // hold for it cite the session's vote menu, not a vote. There is nothing here to
  // fill safely, so it is refused by name rather than fetched at a guessed URL.
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
      rejected.push({ congress: r.congress, session: r.session, roll: r.roll_number, why: [String(e.message)] });
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

  // The measure the document says it is about, against the measure we filed the roll
  // under — or its parent, for an amendment whose roll cites the underlying bill.
  const docName = `${tag(xml, "document_type")} ${tag(xml, "document_number")}`.trim() || tag(xml, "document_name");
  const amdt = tag(xml, "amendment_number");
  const claimed = [docName, tag(xml, "vote_title"), amdt].map(nrm).filter(Boolean);
  const ours = nrm(r.number);
  const parent = nrm(r.parent_number);
  if (claimed.length && !claimed.some((c) => c.includes(ours) || (parent && c.includes(parent)))) {
    // A nomination is the one measure shape whose number we do not always store as the
    // Senate prints it: some rows are filed under a human label ("Bondi — AG") rather
    // than the PN number, so the number axis cannot speak for them. Two other facts in
    // the document can, and both must hold — the nominee's surname AND the office our
    // title says they were confirmed to. Name alone would let a second Kennedy or a
    // second Kelly through, and office alone would match every nominee to that post.
    const nomOk = (() => {
      if (r.measure_type !== "nomination") return false;
      const text = nrm(`${tag(xml, "vote_document_text")} ${tag(xml, "vote_title")}`);
      const surname = nrm(String(r.number).split(/[—–-]/)[0]);
      const office = nrm((String(r.title).match(/\bto be\s+(.+)$/i) || [])[1] || "");
      return !!surname && !!office && text.includes(surname) && text.includes(office);
    })();
    if (!nomOk) why.push(`document says '${docName || tag(xml, "vote_title")}', we filed it under '${r.number}'`);
  }

  // The members the document actually lists, and its own summary of them.
  const rows = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => m[1]);
  if (!rows.length) why.push("no member rows");
  const lines = [];
  for (const block of rows) {
    const lis = tag(block, "lis_member_id");
    const pos = normPos(tag(block, "vote_cast"));
    if (!lis) { why.push("a member row carries no lis_member_id"); break; }
    if (!pos) { why.push(`vote_cast '${tag(block, "vote_cast")}' is outside the Senate's four dispositions`); break; }
    lines.push({ lis, party: tag(block, "party"), state: tag(block, "state"), position: pos });
  }
  const tally = lines.reduce((a, l) => ((a[l.position] = (a[l.position] || 0) + 1), a), {});
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

  if (why.length) { rejected.push({ congress: r.congress, session: r.session, roll: r.roll_number, why }); continue; }

  // Party tally from THIS document, for is_party. It describes where a member stood
  // among their own colleagues on this vote and nothing else.
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
    if (!ent) { unresolvedLis.set(l.lis, (unresolvedLis.get(l.lis) || 0) + 1); skippedUnmapped++; continue; }
    const slug = memberMap[ent.bio];
    if (!slug) { skippedUnmapped++; continue; }
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
    const pt = partyTotals[l.party];
    const isParty = (l.position !== "yea" && l.position !== "nay") || !pt
      ? null
      : ((pt.yea >= pt.nay ? "yea" : "nay") === l.position ? "with_party" : "against_party");
    memberVotes.push({ lisMemberId: l.lis, bioguideId: ent.bio, politicianId: slug, party: l.party, state: l.state, position: l.position, isParty });
  }

  // Verified, but nothing to fill: every member the document lists is already stored.
  // Counted rather than dropped, so kept + refused + complete closes on the number of
  // rolls considered and coverage claims cannot quietly shrink their denominator.
  if (!memberVotes.length) { alreadyComplete++; continue; }
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
    issueKeys: r.issue_keys,
    partyTotals,
    sourceUrl: url,
    sourceLabel: `U.S. Senate roll call ${r.congress}-${r.session}-${r.roll_number}`,
    pageUrl: htmUrl(r.congress, r.session, r.roll_number),
    heldBefore: held.size,
    memberVotes,
  });
}

const cells = votes.reduce((a, v) => a + v.memberVotes.length, 0);
const members = new Set(votes.flatMap((v) => v.memberVotes.map((m) => m.politicianId)));

writeFileSync(OUT, JSON.stringify({
  _comment:
    "Missing member × roll-call cells for Senate roll calls the database already holds, read from the " +
    "Secretary of the Senate's own LIS XML. Every position here is a recorded vote in the cited document; " +
    "nothing is inferred. Cells we already store are excluded — this seed fills gaps and repairs nothing. " +
    "Regenerate with scripts/vr-pull-senate-lis.mjs.",
  chamber: "senate",
  source: "senate.gov roll-call XML (LIS)",
  pulledAt: PULLED_AT,
  rollsConsidered: mapped.length,
  rollsRejected: rejected.length,
  rollsAlreadyComplete: alreadyComplete,
  rollCalls: votes.length,
  cells,
  members: members.size,
  storedCellsConfirmed: confirmed,
  discrepancies: {
    _comment:
      "Cells we ALREADY store whose stored position disagrees with the Senate's document. This pass does " +
      "not touch them: the migration it feeds is ON CONFLICT DO NOTHING throughout, so a disagreement stays " +
      "visible and stays a decision rather than becoming a silent side effect of a densification pass.",
    rows: discrepancies,
  },
  rejectedRolls: {
    _comment: "Roll calls dropped whole because the document disagreed with what we store about them.",
    rows: rejected,
  },
  votes,
}, null, 2) + "\n");

console.log(`identity-verified: ${mapped.length - rejected.length} · rejected whole: ${rejected.length}`);
for (const r of rejected) console.log(`   ${r.congress}/${r.session} roll ${r.roll}: ${r.why.join("; ")}`);
console.log(`fillable cells: ${cells} across ${votes.length} rolls · ${members.size} profiled members`);
console.log(`rolls already complete (nothing to fill): ${alreadyComplete}`);
console.log(`recorded votes skipped as unmapped: ${skippedUnmapped}`);
if (unresolvedLis.size) console.log(`   LIS ids with no Bioguide in either dataset: ${unresolvedLis.size}`);
console.log(`stored cells confirmed by the Senate's document: ${confirmed} · contradicted: ${discrepancies.length}`);
for (const d of discrepancies) console.log(`   ${d.congress}/${d.session} roll ${d.roll}: ${d.slug} stored '${d.db}', document says '${d.lis}'`);
console.log(`✓ wrote ${OUT}`);
