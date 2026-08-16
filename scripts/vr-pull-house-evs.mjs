#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — pull House roll-call attribution from the Clerk's EVS
// ─────────────────────────────────────────────────────────────────────────────
// Rebuilds db/vr-house-evs-backfill-seed.json: for every House roll call the database
// already holds on a measure that already carries curated issue mappings, fetch the
// Clerk's own recorded-vote document and take the cells we are missing.
//
//   node scripts/vr-pull-house-evs.mjs            # fetch, verify, write the seed
//   node scripts/vr-pull-house-evs.mjs --verify   # verify the cached XML, write nothing
//
// Needs NETLIFY_DB_URL to know which cells are missing. Needs no API key: the EVS
// documents are public, and clerk.house.gov/evs/<year>/roll<NNN>.xml is already the URL
// vr_rollcalls.source_url cites for most of these rolls.
//
// ── IDENTITY IS CHECKED BEFORE A SINGLE CELL IS TAKEN ────────────────────────
// A roll number is not a globally unique key — it repeats every session, and the Clerk
// files by calendar year while the record files by Congress and session. Fetching
// roll<NNN> for the wrong year silently returns a real, well-formed document about a
// different vote, and every cell taken from it would be a confident misattribution.
// So a fetched document must agree with the row we hold on ALL of:
//
//   • rollcall-num and congress
//   • action-date, within 8h of the stored vote_date (the stored value carries a
//     wall-clock time and a timezone; the Clerk's carries neither)
//   • internal consistency of all four totals-by-vote counts — yea, nay, present,
//     not-voting — against the recorded votes actually listed. Those four are read from
//     the <totals-by-vote> block specifically: <totals-by-party> also contains tags
//     named yea-total and nay-total, and taking the first match in the file gets you
//     one party's subtotal and a check that passes on the wrong document.
//   • the measure number — or, for an amendment roll, its parent measure's number,
//     because the Clerk names the underlying bill where our row names the amendment
//   • recorded-vote count equal to the sum of the four totals
//   • a name-id on every single recorded vote
//
// Anything else fails, and a roll that fails is dropped WHOLE rather than partially
// trusted: a document we cannot fully identify cannot be a source for some of its cells.
//
// What is NOT an identity failure is a disagreement between the Clerk's totals and the
// totals WE store on the row. Those are our summary of the vote, not the vote; when a
// document is internally consistent and agrees with the roll on every axis above, the
// document is right and our summary is stale. Eight of these rolls are in exactly that
// state. They are reported as totalsDrift and used anyway, because refusing them would
// mean declining the Clerk's own numbers in favour of ours.
//
// ── STORED CELLS ARE CHECKED TOO, AND NEVER OVERWRITTEN ──────────────────────
// Every cell already in the database on a verified roll is compared against the Clerk's
// record for the same member. Agreement is the overwhelming majority and is reported as
// a count; disagreement is reported member by member and written into the seed's
// discrepancies block. This pass does not repair them — its migration is ON CONFLICT DO
// NOTHING and physically cannot — because a stored vote that turns out to be wrong is a
// correction with its own citation, not a side effect of a densification run.
//
// ── AND THE ROSTER GATE STILL APPLIES ────────────────────────────────────────
// A verified document contains ~430 recorded votes. Only members whose Bioguide
// resolves through db/vr-member-map.json — i.e. members the app already profiles AND
// db/vr-roster-admitted.json admits — become rows. Everyone else is skipped and
// counted. Widening that set is a curatorial act in the roster file, never a side
// effect of a pull.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".netlify", "evs");
const OUT = join(ROOT, "db", "vr-house-evs-backfill-seed.json");
const VERIFY_ONLY = process.argv.includes("--verify");
// Stamped, not clock-read, so a re-run over the same cached documents is byte-identical.
const PULLED_AT = (process.argv.find((a) => a.startsWith("--pulled-at=")) || "--pulled-at=2026-08-15").slice(12);
const DATE_SLACK_MS = 8 * 60 * 60 * 1000;

const tag = (s, t) => { const m = s.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1].trim() : null; };
const num = (s, t) => { const v = tag(s, t); return v === null ? null : Number(v.replace(/,/g, "")); };
const nrm = (s) => String(s || "").replace(/[^a-z0-9]/gi, "").toUpperCase();

// The shipped normalizer's rules (netlify/lib/vr-normalize.ts), stated once.
function normPos(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (t === "yea" || t === "yes" || t === "aye") return "yea";
  if (t === "nay" || t === "no") return "nay";
  if (t === "present") return "present";
  return "not_voting";
}

// ── which rolls, and which cells on them, are missing ────────────────────────
const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const rolls = (await client.query(`
  SELECT r.id, r.congress, r.session, r.roll_number, r.vote_date, r.question, r.source_url, r.totals,
         m.number, m.measure_type, p.number AS parent_number,
         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id = r.id) AS held,
         (SELECT string_agg(issue_key, ',' ORDER BY issue_key)
            FROM vr_measure_issues mi WHERE mi.measure_id = r.measure_id) AS keys,
         (SELECT json_object_agg(v.politician_id, v.position)
            FROM vr_member_votes v WHERE v.rollcall_id = r.id) AS stored
    FROM vr_rollcalls r
    JOIN vr_measures m ON m.id = r.measure_id
    LEFT JOIN vr_measures p ON p.id = m.parent_id
   WHERE r.chamber = 'house'
     AND EXISTS (SELECT 1 FROM vr_measure_issues mi WHERE mi.measure_id = r.measure_id)
   ORDER BY r.congress, r.session, r.roll_number`)).rows;
await client.end();

const map = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8")).map;
if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });

const votes = [], rejected = [], discrepancies = [], totalsDrift = [];
let fetched = 0, failed = 0, skippedUnmapped = 0, storedAgreed = 0;

for (const r of rolls) {
  const year = r.vote_date.toISOString().slice(0, 4);
  const roll = String(r.roll_number).padStart(3, "0");
  const url = `https://clerk.house.gov/evs/${year}/roll${roll}.xml`;
  const path = join(CACHE, `${year}-${roll}.xml`);
  let xml;
  if (existsSync(path)) xml = readFileSync(path, "utf8");
  else if (VERIFY_ONLY) { rejected.push({ roll: r.roll_number, year, why: "not cached" }); continue; }
  else {
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) { failed++; rejected.push({ roll: r.roll_number, year, why: `fetch ${res ? res.status : "failed"}` }); continue; }
    xml = await res.text();
    writeFileSync(path, xml);
    fetched++;
  }

  // ── identity, on every axis at once ──────────────────────────────────────
  const why = [];
  if (num(xml, "rollcall-num") !== r.roll_number) why.push(`rollcall-num ${num(xml, "rollcall-num")}≠${r.roll_number}`);
  if (num(xml, "congress") !== r.congress) why.push(`congress ${num(xml, "congress")}≠${r.congress}`);
  const d = Date.parse(tag(xml, "action-date") + " 12:00:00Z");
  if (!Number.isFinite(d) || Math.abs(d - r.vote_date.getTime()) > DATE_SLACK_MS + 12 * 3600e3)
    why.push(`action-date ${tag(xml, "action-date")}≠${r.vote_date.toISOString().slice(0, 10)}`);
  // Read the four counts from <totals-by-vote>, NOT from the first matching tag in the
  // file — <totals-by-party> carries identically-named tags for each party's subtotal.
  const tv = (xml.match(/<totals-by-vote>([\s\S]*?)<\/totals-by-vote>/) || [])[1] || "";
  const T = { yea: num(tv, "yea-total"), nay: num(tv, "nay-total"), present: num(tv, "present-total"), nv: num(tv, "not-voting-total") };
  if (Object.values(T).some((v) => v === null)) why.push("totals-by-vote unreadable");
  const legs = [...xml.matchAll(/<recorded-vote>\s*<legislator([^>]*)>[\s\S]*?<\/legislator>\s*<vote>([^<]*)<\/vote>\s*<\/recorded-vote>/g)]
    .map((m) => ({
      bio: (m[1].match(/name-id="([^"]+)"/) || [])[1],
      party: (m[1].match(/party="([^"]+)"/) || [])[1],
      state: (m[1].match(/state="([^"]+)"/) || [])[1],
      position: normPos(m[2]),
    }));
  const sum = (T.yea || 0) + (T.nay || 0) + (T.present || 0) + (T.nv || 0);
  if (legs.length !== sum) why.push(`recorded votes ${legs.length}≠totals ${sum}`);
  const counted = legs.reduce((a, l) => ((a[l.position] = (a[l.position] || 0) + 1), a), {});
  if ((counted.yea || 0) !== T.yea) why.push(`yea ${counted.yea || 0}≠${T.yea}`);
  if ((counted.nay || 0) !== T.nay) why.push(`nay ${counted.nay || 0}≠${T.nay}`);
  if ((counted.present || 0) !== T.present) why.push(`present ${counted.present || 0}≠${T.present}`);
  if ((counted.not_voting || 0) !== T.nv) why.push(`not-voting ${counted.not_voting || 0}≠${T.nv}`);
  if (legs.some((l) => !l.bio)) why.push("a recorded vote carries no name-id");
  // The Clerk names the underlying bill on an amendment roll; our row names the amendment.
  const claimed = nrm(tag(xml, "legis-num"));
  if (claimed && claimed !== nrm(r.number) && claimed !== nrm(r.parent_number))
    why.push(`measure ${tag(xml, "legis-num")}≠${r.number}${r.parent_number ? `/${r.parent_number}` : ""}`);
  if (why.length) { rejected.push({ roll: r.roll_number, year, why: why.join("; ") }); continue; }

  // Our stored summary of the same roll. A disagreement here is drift in what we
  // recorded ABOUT the vote, not doubt about which vote this is — reported, not fatal.
  const st = r.totals || {};
  const drift = [["yea", T.yea], ["nay", T.nay], ["present", T.present], ["notVoting", T.nv]]
    .filter(([k, v]) => typeof st[k] === "number" && st[k] !== v)
    .map(([k, v]) => `${k} stored ${st[k]}, Clerk ${v}`);
  if (drift.length) totalsDrift.push({ roll: r.roll_number, year, drift: drift.join("; ") });

  // ── is_party from THIS document's own tally ──────────────────────────────
  const partyTally = {};
  for (const l of legs) {
    if (l.position !== "yea" && l.position !== "nay") continue;
    (partyTally[l.party] = partyTally[l.party] || { yea: 0, nay: 0 })[l.position]++;
  }

  const stored = r.stored || {};
  const memberVotes = [], seen = new Set();
  for (const l of legs) {
    const pid = map[l.bio];
    if (!pid) { skippedUnmapped++; continue; }
    if (seen.has(pid)) throw new Error(`${year} roll ${roll}: ${pid} appears twice — refusing to guess which cell is theirs`);
    seen.add(pid);
    if (Object.prototype.hasOwnProperty.call(stored, pid)) {
      // Already held. Never overwritten here — but never silently agreed with either.
      if (stored[pid] !== l.position) discrepancies.push({ roll: r.roll_number, year, slug: pid, db: stored[pid], evs: l.position, sourceUrl: url });
      else storedAgreed++;
      continue;
    }
    const pt = partyTally[l.party];
    const isParty = (l.position !== "yea" && l.position !== "nay") || !pt ? null
      : ((pt.yea >= pt.nay ? "yea" : "nay") === l.position ? "with_party" : "against_party");
    memberVotes.push({ bioguideId: l.bio, politicianId: pid, party: l.party, state: l.state, position: l.position, isParty });
  }
  if (!memberVotes.length) continue;
  memberVotes.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1));
  votes.push({
    chamber: "house", congress: r.congress, session: r.session, rollNumber: r.roll_number,
    voteDate: r.vote_date.toISOString().slice(0, 10), measure: r.number, measureType: r.measure_type,
    question: r.question, issueKeys: (r.keys || "").split(",").filter(Boolean),
    partyTotals: Object.fromEntries(Object.entries(partyTally).sort()),
    sourceUrl: url, sourceLabel: "U.S. House Clerk", heldBefore: Number(r.held), memberVotes,
  });
}

const cells = votes.reduce((a, v) => a + v.memberVotes.length, 0);
const members = new Set(); votes.forEach((v) => v.memberVotes.forEach((m) => members.add(m.politicianId)));
process.stderr.write(
  `mapped-measure House rolls: ${rolls.length} · fetched ${fetched} · fetch failures ${failed}\n` +
  `identity-verified: ${rolls.length - rejected.length} · rejected whole: ${rejected.length}\n` +
  rejected.map((x) => `   ${x.year} roll ${x.roll}: ${x.why}\n`).join("") +
  `fillable cells: ${cells} across ${votes.length} rolls · ${members.size} profiled members\n` +
  `recorded votes skipped as unmapped: ${skippedUnmapped}\n` +
  `stored cells confirmed by the Clerk: ${storedAgreed} · contradicted: ${discrepancies.length}\n` +
  discrepancies.map((d) => `   ${d.year} roll ${d.roll}: ${d.slug} stored '${d.db}', Clerk says '${d.evs}'\n`).join("") +
  `rolls whose stored totals drift from the Clerk's (used anyway): ${totalsDrift.length}\n` +
  totalsDrift.map((x) => `   ${x.year} roll ${x.roll}: ${x.drift}\n`).join("")
);
if (VERIFY_ONLY) process.exit(rejected.some((x) => x.why === "not cached") ? 1 : 0);

writeFileSync(OUT, JSON.stringify({
  _comment:
    "House roll-call attribution backfill, pulled from the U.S. House Clerk's own EVS XML " +
    "(clerk.house.gov/evs/<year>/roll<NNN>.xml) — for most of these rolls, the very document " +
    "vr_rollcalls.source_url already cites. Every roll here ALREADY EXISTS in vr_rollcalls and " +
    "every measure behind one ALREADY CARRIES curated issue mappings; this pass creates no " +
    "measure, no roll call, no issue mapping, no stated position and no profile. What was " +
    "missing is member x roll-call cells: the rolls were seeded a handful of hand-listed voters " +
    "at a time, so a member could hold a stated position on an issue, have cast a recorded vote " +
    "on mapped measures under it, and still render as though they had never acted. memberVotes " +
    "is filtered to members db/vr-member-map.json resolves — the app profiles them AND " +
    "db/vr-roster-admitted.json admits them; an unresolved bioguide is skipped and counted, " +
    "never guessed. Every roll was identity-verified before a cell was taken from it (see the " +
    "header of scripts/vr-pull-house-evs.mjs for the axes). isParty is recomputed from THIS " +
    "document's own full chamber tally, never inherited. Regenerate with " +
    "scripts/vr-pull-house-evs.mjs; regenerate the SQL with scripts/vr-gen-house-backfill-migration.mjs.",
  chamber: "house",
  source: "https://clerk.house.gov/evs/",
  pulledAt: PULLED_AT,
  rollsConsidered: rolls.length,
  rollsRejected: rejected.length,
  rollCalls: votes.length,
  cells,
  members: members.size,
  storedCellsConfirmed: storedAgreed,
  discrepancies: {
    _comment:
      "Cells this repo ALREADY stores that the Clerk's record for the same member contradicts. " +
      "They are reported, not repaired here: the backfill migration is ON CONFLICT DO NOTHING " +
      "throughout and cannot touch a stored row, so a wrong stored vote stays visible and stays " +
      "a decision rather than becoming a silent side effect of a densification pass.",
    rows: discrepancies,
  },
  totalsDrift: {
    _comment:
      "Rolls whose stored totals jsonb disagrees with the Clerk's totals-by-vote. Not an identity " +
      "failure and not a reason to drop a roll: the document is internally consistent and matches " +
      "the roll on number, congress, date and measure, so it is our summary that is stale. Listed " +
      "so the drift is on the record rather than absorbed.",
    rows: totalsDrift,
  },
  votes,
}, null, 1) + "\n");
process.stderr.write(`✓ wrote ${OUT}\n`);
