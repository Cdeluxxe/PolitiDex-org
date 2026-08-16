#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — verify the stored cells that disagree with the record
// ─────────────────────────────────────────────────────────────────────────────
// The Slice 2 backfill was additive on purpose: ON CONFLICT DO NOTHING throughout, so a
// densification pass could not quietly rewrite a stored vote. Re-reading the official
// documents while filling gaps turned up 18 cells we already hold whose stored position
// disagrees with what the Clerk of the House and the Secretary of the Senate published.
// Those were reported, not repaired. This script is the repair's first half: it re-checks
// every one of them, from scratch, and writes db/vr-vote-corrections-seed.json.
//
// A correction is a stronger claim than a fill. A fill only has to be right; a correction
// has to be right AND has to be sure the thing it is replacing is the thing it thinks it
// is replacing. So each row must clear all of this or it is refused and left alone:
//
//   • The roll call resolves to exactly ONE row in vr_rollcalls. House discrepancies were
//     recorded by year and roll number (that is how the Clerk files them), so the year is
//     matched against vote_date and the result must be unique — no "first match wins".
//   • The document is the document. Its own roll-call number and date, or congress,
//     session and vote number, are read back and must agree with the roll we are about
//     to touch.
//   • The member is found in it by published identifier — Bioguide via name-id for the
//     House, LIS member id for the Senate — never by name. The Senate hop is confirmed
//     twice: through congress-legislators, and against the LIS id the Slice 2 seed
//     already resolved for that member on other rolls. Both must agree.
//   • The document still says what the seed says it says. A fresh parse must reproduce
//     the official position exactly; if the seed and the document have drifted, the
//     seed is not evidence any more.
//   • The database still holds what the seed says it holds. If the stored value has
//     moved since the pull, this is no longer the cell that was examined, and correcting
//     it would be correcting something nobody looked at.
//   • The correction actually changes something. A row where stored and official agree
//     has no business in a correction migration.
//
// is_party is recomputed from the same document, by the same rule the backfill used: the
// member's own party's yea/nay split on that roll. A member who did not cast a recorded
// vote — present or not voting — has no side to be with or against, so their is_party
// becomes NULL. Nothing here reads or writes a stance, a mapping or a measure.
//
//   node scripts/vr-verify-vote-corrections.mjs
//
// Needs NETLIFY_DB_URL. Reads the cached documents under .netlify/{evs,lis} and fetches
// only what is missing.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "PolitiDex/1.0 (voting-record correction verification)";
const OUT = join(ROOT, "db", "vr-vote-corrections-seed.json");
const EVS_CACHE = join(ROOT, ".netlify", "evs");
const LIS_CACHE = join(ROOT, ".netlify", "lis");
const CHECKED_AT = (process.argv.find((a) => a.startsWith("--checked-at=")) || "--checked-at=2026-08-16").slice(13);

const pad3 = (n) => String(n).padStart(3, "0");
const pad5 = (n) => String(n).padStart(5, "0");
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : "";
};

// One vocabulary, spelled the two ways the two chambers spell it.
function normPos(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (t === "yea" || t === "aye" || t === "yes") return "yea";
  if (t === "nay" || t === "no") return "nay";
  if (t === "present") return "present";
  if (t === "not voting") return "not_voting";
  return null;
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/xml,text/xml,*/*" } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return await r.text();
}
async function cachedText(path, url) {
  if (existsSync(path)) return readFileSync(path, "utf8");
  const t = await fetchText(url);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, t);
  return t;
}

// ── the two seeds that reported the disagreements ────────────────────────────
const houseSeed = JSON.parse(readFileSync(join(ROOT, "db", "vr-house-evs-backfill-seed.json"), "utf8"));
const senateSeed = JSON.parse(readFileSync(join(ROOT, "db", "vr-senate-lis-backfill-seed.json"), "utf8"));
const reported = [
  ...houseSeed.discrepancies.rows.map((d) => ({ chamber: "house", ...d, official: d.evs })),
  ...senateSeed.discrepancies.rows.map((d) => ({ chamber: "senate", ...d, official: d.lis })),
];

const memberMap = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8")).map || {};
const SLUG_TO_BIO = new Map(Object.entries(memberMap).map(([bio, slug]) => [slug, bio]));
// The LIS ids Slice 2 already resolved for each senator, kept as a second opinion on the
// identity hop rather than as its only source.
const SEED_LIS = new Map();
for (const v of senateSeed.votes) {
  for (const r of v.memberVotes) {
    if (SEED_LIS.has(r.politicianId) && SEED_LIS.get(r.politicianId) !== r.lisMemberId) {
      throw new Error(`${r.politicianId} appears under two LIS ids in the Senate seed — the identity hop is not a function`);
    }
    SEED_LIS.set(r.politicianId, r.lisMemberId);
  }
}

// ── what the database holds right now ────────────────────────────────────────
const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const rolls = (await client.query(`
  SELECT r.id, r.chamber, r.congress, r.session, r.roll_number, r.vote_date, r.question, r.source_url, m.number, m.title
    FROM vr_rollcalls r JOIN vr_measures m ON m.id = r.measure_id`)).rows;
const cells = new Map();
for (const r of (await client.query(`SELECT rollcall_id, politician_id, position, is_party FROM vr_member_votes`)).rows) {
  cells.set(`${r.rollcall_id}|${r.politician_id}`, r);
}
await client.end();

const year = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d)).slice(0, 4);
const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

// ── LIS → Bioguide, the same hop the Senate pull uses ────────────────────────
let LIS = null;
async function lisIndex() {
  if (LIS) return LIS;
  const local = join(ROOT, "scripts", "legislators-current.json");
  const rows = existsSync(local)
    ? JSON.parse(readFileSync(local, "utf8"))
    : await (await fetch("https://unitedstates.github.io/congress-legislators/legislators-current.json")).json();
  LIS = new Map();
  for (const p of rows) {
    const lis = p.id && p.id.lis, bio = p.id && p.id.bioguide;
    if (lis && bio && !LIS.has(lis)) LIS.set(lis, bio);
  }
  return LIS;
}

const corrections = [];
const refused = [];
const refuse = (d, why) => refused.push({ chamber: d.chamber, roll: d.roll, year: d.year || null, congress: d.congress || null, slug: d.slug, why });

for (const d of reported) {
  // ── 1. the roll call, resolved to exactly one stored row ───────────────────
  const candidates = d.chamber === "house"
    ? rolls.filter((r) => r.chamber === "house" && r.roll_number === d.roll && year(r.vote_date) === String(d.year))
    : rolls.filter((r) => r.chamber === "senate" && r.congress === d.congress && r.session === d.session && r.roll_number === d.roll);
  if (candidates.length !== 1) {
    refuse(d, `${candidates.length} roll call(s) in vr_rollcalls match this identity — a correction needs exactly one`);
    continue;
  }
  const rc = candidates[0];
  const bio = SLUG_TO_BIO.get(d.slug);
  if (!bio) { refuse(d, `${d.slug} has no bioguide in db/vr-member-map.json`); continue; }

  // ── 2. the document, and the member inside it ──────────────────────────────
  let official = null, partyOf = null, tally = null, sourceUrl = null, sourceLabel = null, lisId = null;
  try {
    if (d.chamber === "house") {
      sourceUrl = `https://clerk.house.gov/evs/${d.year}/roll${pad3(d.roll)}.xml`;
      sourceLabel = `U.S. House roll call ${d.year}-${d.roll}`;
      const xml = await cachedText(join(EVS_CACHE, `${d.year}-${pad3(d.roll)}.xml`), sourceUrl);
      // The document has to be the one we think it is before anything is read out of it.
      if (Number(tag(xml, "rollcall-num")) !== Number(d.roll)) throw new Error("the document's rollcall-num is not this roll");
      const actionYear = (tag(xml, "action-date").match(/\d{4}/) || [])[0];
      if (actionYear && actionYear !== String(d.year)) throw new Error(`the document's action-date is ${actionYear}, not ${d.year}`);
      if (iso(rc.vote_date) && actionYear && year(rc.vote_date) !== actionYear) throw new Error("the stored vote_date and the document disagree on the year");
      const legs = [...xml.matchAll(/<recorded-vote>\s*<legislator([^>]*)>[\s\S]*?<\/legislator>\s*<vote>([^<]*)<\/vote>\s*<\/recorded-vote>/g)]
        .map((m) => ({
          bio: (m[1].match(/name-id="([^"]+)"/) || [])[1],
          party: (m[1].match(/party="([^"]+)"/) || [])[1],
          position: normPos(m[2]),
        }));
      if (legs.some((l) => !l.bio || !l.position)) throw new Error("a recorded vote in the document has no name-id or an unreadable position");
      const mine = legs.filter((l) => l.bio === bio);
      if (mine.length !== 1) throw new Error(`${bio} appears ${mine.length} time(s) in the document — refusing to guess which cell is theirs`);
      official = mine[0].position;
      partyOf = mine[0].party;
      tally = legs;
    } else {
      sourceUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${d.congress}${d.session}/vote_${d.congress}_${d.session}_${pad5(d.roll)}.xml`;
      sourceLabel = `U.S. Senate roll call ${d.congress}-${d.session}-${d.roll}`;
      const xml = await cachedText(join(LIS_CACHE, `${d.congress}-${d.session}-${pad5(d.roll)}.xml`), sourceUrl);
      if (Number(tag(xml, "congress")) !== Number(d.congress) || Number(tag(xml, "session")) !== Number(d.session) ||
          Number(tag(xml, "vote_number")) !== Number(d.roll)) {
        throw new Error("the document's congress/session/vote_number is not this roll");
      }
      const idx = await lisIndex();
      const members = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => ({
        lis: tag(m[1], "lis_member_id"),
        party: tag(m[1], "party"),
        position: normPos(tag(m[1], "vote_cast")),
      }));
      if (members.some((l) => !l.lis || !l.position)) throw new Error("a member block in the document has no LIS id or an unreadable vote_cast");
      const mine = members.filter((l) => idx.get(l.lis) === bio);
      if (mine.length !== 1) throw new Error(`${bio} resolves to ${mine.length} member block(s) in the document — refusing to guess`);
      lisId = mine[0].lis;
      // Second opinion: Slice 2 resolved this senator's LIS id independently, on other
      // rolls. If the two hops disagree, the identity is not settled and nothing is fixed.
      const seedLis = SEED_LIS.get(d.slug);
      if (seedLis && seedLis !== lisId) throw new Error(`LIS id ${lisId} from congress-legislators disagrees with ${seedLis} resolved in the Slice 2 seed`);
      official = mine[0].position;
      partyOf = mine[0].party;
      tally = members;
    }
  } catch (e) {
    refuse(d, String(e.message));
    continue;
  }

  // ── 3. the fresh read must reproduce what was reported ─────────────────────
  if (official !== d.official) {
    refuse(d, `the document now reads '${official}' but the Slice 2 seed reported '${d.official}' — the evidence has drifted`);
    continue;
  }

  // ── 4. the stored cell must still be the cell that was examined ────────────
  const stored = cells.get(`${rc.id}|${d.slug}`);
  if (!stored) { refuse(d, "there is no stored cell here to correct"); continue; }
  if (stored.position !== d.db) {
    refuse(d, `the database now holds '${stored.position}' but the Slice 2 seed examined '${d.db}' — this is not the same cell any more`);
    continue;
  }
  if (stored.position === official) { refuse(d, "stored and official agree — nothing to correct"); continue; }

  // ── 5. is_party, recomputed from this document by the backfill's own rule ──
  const pt = tally.reduce((a, l) => {
    if (l.party && (l.position === "yea" || l.position === "nay")) (a[l.party] = a[l.party] || { yea: 0, nay: 0 })[l.position]++;
    return a;
  }, {});
  const mineTally = pt[partyOf];
  const officialIsParty = (official !== "yea" && official !== "nay") || !mineTally
    ? null
    : ((mineTally.yea >= mineTally.nay ? "yea" : "nay") === official ? "with_party" : "against_party");

  corrections.push({
    chamber: rc.chamber,
    congress: rc.congress,
    session: rc.session,
    rollNumber: rc.roll_number,
    voteDate: iso(rc.vote_date),
    measure: rc.number,
    question: rc.question,
    bioguideId: bio,
    lisMemberId: lisId,
    politicianId: d.slug,
    storedPosition: stored.position,
    storedIsParty: stored.is_party,
    officialPosition: official,
    officialIsParty,
    sourceUrl,
    sourceLabel,
  });
}

corrections.sort((a, b) =>
  a.chamber.localeCompare(b.chamber) || a.congress - b.congress || a.session - b.session ||
  a.rollNumber - b.rollNumber || a.politicianId.localeCompare(b.politicianId));

writeFileSync(OUT, JSON.stringify({
  _comment:
    "Stored member votes whose position disagrees with the official document, each re-verified from " +
    "scratch against that document before being listed here. This seed feeds an explicit, cell-by-cell " +
    "correction migration; it enumerates every cell that migration is allowed to touch and nothing else. " +
    "Regenerate with scripts/vr-verify-vote-corrections.mjs.",
  source: "clerk.house.gov/evs (House) · senate.gov roll-call XML / LIS (Senate)",
  checkedAt: CHECKED_AT,
  reported: reported.length,
  corrected: corrections.length,
  refusedCount: refused.length,
  refused: {
    _comment:
      "Reported disagreements this pass would not correct. A correction that cannot name exactly which " +
      "cell it is replacing, and prove the replacement from the document, is a guess wearing a citation.",
    rows: refused,
  },
  corrections,
}, null, 2) + "\n");

console.log(`reported disagreements: ${reported.length}`);
console.log(`verified and correctable: ${corrections.length}`);
for (const c of corrections) {
  console.log(`   ${c.chamber} ${c.congress}/${c.session} roll ${c.rollNumber} · ${c.politicianId}: '${c.storedPosition}' → '${c.officialPosition}'`);
}
if (refused.length) {
  console.log(`left uncorrected: ${refused.length}`);
  refused.forEach((r) => console.log(`   ${r.chamber} roll ${r.roll} · ${r.slug}: ${r.why}`));
}
console.log(`✓ wrote ${OUT}`);
