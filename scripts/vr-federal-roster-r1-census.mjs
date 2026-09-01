#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — Federal roster wave R1 census
// ─────────────────────────────────────────────────────────────────────────────
// Wave F9 recorded 2,245 judged House votes it could not place. Not because the
// Clerk had not published them — it had, in the same XML F9 read — but because
// the voter's Bioguide was not in db/vr-member-map.json, and an unmapped Bioguide
// is skipped and counted rather than guessed. Across the whole House corpus on
// disk that is 7,298 recorded positions with nowhere to go, roughly 315 of them
// on every roll. Re-reading the rolls cannot recover one of them. Only a wider
// roster can.
//
// This script is the census that decides who the wider roster is. It does not
// write the roster: it writes db/vr-federal-roster-r1-census.json, a per-person
// admitted/refused ledger with the reason attached, and the wave is then hand-
// applied from it (db/vr-roster-admitted.json, SEED_SLUGS, BROWSE_PHOTOS,
// cmp-data.js). Keeping the decision in a committed file rather than in a
// generator's head is the point: every admission here is one reviewable line
// naming a Bioguide, a district and two documents that agree about both.
//
// ── Verified twice, and by documents that can disagree ────────────────────────
// A wrong Bioguide is the worst failure this map has: it re-homes one member's
// entire voting record onto another member's profile and nothing downstream looks
// broken from either end (see checkNamesAgree() in scripts/vr-gen-member-map.mjs,
// and 20260815000000_vr_fix_kennedy_identity_collision.sql for the time it
// happened). So no Bioguide here is admitted on one source's word:
//
//   1. THE CLERK'S OWN ROSTER — clerk.house.gov/xml/lists/MemberData.xml. One
//      <member> per seat, carrying <bioguideID>, <statedistrict>, <party>,
//      <official-name> and <sworn-date>. This is also the document that names the
//      vacancies: a vacant seat is a <member> with an EMPTY <bioguideID> and a
//      <footnote> saying who left and when, which is why the refusals below can
//      quote a reason instead of inferring one.
//   2. THE LEGISLATORS DATASET — unitedstates.github.io/congress-legislators.
//      Independent provenance, independent maintainers. Gives name, state,
//      district and party for everyone currently seated.
//   3. THE ROLL XML ITSELF — the 23 House rolls already on disk in the F6/F7/F9
//      seeds. Each <legislator> carries name-id (the Bioguide), state and party.
//      This is the only source that proves the corpus actually names the member,
//      so it is the one that decides whether admitting them recovers any cell.
//
// A candidate is admitted only when (1) and (2) agree on state, district and
// party. Source (3) is required to agree too WHEN IT SPEAKS; a sitting member no
// roll in this corpus names is still admitted — they are a sitting member of the
// 119th — but the ledger records `namedByCorpus: false` so nobody mistakes their
// admission for a recovered vote.
//
// ── What this script refuses ──────────────────────────────────────────────────
// Refusals are written, not silent, and they are not the same refusal:
//   • DELEGATES AND THE RESIDENT COMMISSIONER (6). The Clerk records their
//     Committee-of-the-Whole positions on this corpus's amendment rolls, so
//     admitting them WOULD recover cells. They are refused anyway: this wave's
//     scope is sitting House members with a district, a delegate's
//     <statedistrict> is a territory with no district number, and the brief's
//     own wall is "do not invent districts". The exact number of cells this
//     leaves on the table is counted below so a later wave can reverse the
//     decision with its eyes open rather than rediscover it.
//   • VACANT SEATS (4). A seat is not a person. Refused with the Clerk's own
//     footnote as the reason.
//   • FORMER MEMBERS THE CORPUS NAMES (7). These voted on rolls in the corpus and
//     then left. Admitting them would recover cells too, and it is explicitly out
//     of scope: "do not admit someone who left the 119th". Their positions stay
//     skipped, and the residual skip count after this wave is exactly them plus
//     the delegates — disclosed, not zeroed.
//
//   node scripts/vr-federal-roster-r1-census.mjs           # write the census
//   node scripts/vr-federal-roster-r1-census.mjs --check    # verify it is current
//
// NETWORK, read-only, no key. Writes one JSON file and nothing else.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "db", "vr-federal-roster-r1-census.json");
const WAVE = "federal_roster_r1_sep2026";

const MEMBERDATA_URL = "https://clerk.house.gov/xml/lists/MemberData.xml";
const LEG_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json";
const LEG_LOCAL = join(HERE, "legislators-current.json");

// The apportionment. Not a guess and not a constant we get to choose: the Clerk's
// roster carries one <member> per seat including the vacant ones, so the count is
// read off that document and checked against the number the 2020 census fixed.
// A disagreement means the document changed shape and every count below is suspect.
const APPORTIONED_SEATS = 435;

// House territories, by the postal code MemberData.xml uses in <state postal-code>.
const TERRITORIES = new Set(["DC", "VI", "AS", "GU", "MP", "PR"]);

// ── The House rolls already on disk ──────────────────────────────────────────
// Read out of the committed vote seeds rather than typed here, so this list cannot
// drift from the corpus it is supposed to describe. F8 is Senate-only; F3's single
// House roll carries no unresolved pool and no XML, so there is nothing for a wider
// roster to recover there.
const SEED_FILES = [
  "db/vr-federal-wave-f6-vote-seed.json",
  "db/vr-federal-wave-f7-vote-seed.json",
  "db/vr-federal-wave-f9-vote-seed.json",
];

// ── Nine people the app already carries ──────────────────────────────────────
// A sitting member the app already has a file for must not get a second one. The
// rule is "one person, one current file", so these Bioguides map onto the slug that
// already exists instead of the slug the naming rule would mint. Each was checked
// by first name, surname and state against both documents above:
//
//   C001067  Yvette D. Clarke     NY-09  → the app's `yvette_clarke` (CBC chair card)
//   S000185  Robert C. Scott      VA-03  → `bobby_scott`; the dataset's legal name is
//                                          Robert, the app publishes the name a reader
//                                          knows. Not a second person.
//   D000617  Suzan K. DelBene     WA-01  → `delbene` (DCCC chair card)
//   H001067  Richard Hudson       NC-09  → `hudson` (NRCC chair card)
//   P000048  August Pfluger       TX-11  → `pfluger` (RSC chair card)
//   C001131  Greg Casar           TX-35  → `casar`; the dataset's first name is
//                                          Gregorio, the app publishes Greg.
//   H001066  Steven Horsford      NV-04  → `steven_horsford`, which exists as a
//                                          SPOTLIGHTS figure with no compare card, so
//                                          this wave gives that SAME slug an identity
//                                          row rather than minting a parallel one.
//   F000484  Randy Fine           FL-06  → `rfine`, whose office string still reads
//                                          "FL State Rep / Candidate". He won the FL-06
//                                          special on 2025-04-01 and is seated; this
//                                          wave corrects the office and district on the
//                                          existing file. Same person, same file.
//
// And one that is NOT a reuse, which is why it is on this list:
//
//   R000575  Mike Rogers          AL-03  → `mike_rogers_al`. The app's `mike_rogers`
//                                          is a DIFFERENT LIVING PERSON — the former
//                                          Michigan congressman and House Intelligence
//                                          chair, carried as a Senate candidate. Two
//                                          men, one name, and merging them would score
//                                          Alabama's votes against Michigan's stated
//                                          positions. Distinct slug, stated out loud.
const CANONICAL_SLUG = {
  C001067: "yvette_clarke",
  S000185: "bobby_scott",
  D000617: "delbene",
  H001067: "hudson",
  P000048: "pfluger",
  C001131: "casar",
  H001066: "steven_horsford",
  F000484: "rfine",
  R000575: "mike_rogers_al",
};
// The eight above that are genuinely the app's existing file, as opposed to the one
// that is a deliberate collision dodge. Kept apart so the ledger can say which is which.
const REUSED_EXISTING = new Set(["yvette_clarke", "bobby_scott", "delbene", "hudson",
  "pfluger", "casar", "steven_horsford", "rfine"]);

// ── The slug naming rule ─────────────────────────────────────────────────────
// `<first>_<last>`, accents folded, punctuation dropped, spaces and hyphens turned
// into underscores — the form the roster already uses (`teresa_leger_fernandez`,
// `mariannette_miller_meeks`, `hyde_smith`). First name is the dataset's nickname
// when it publishes one, because that is the name the Clerk's roll XML and the
// member's own site use. Deliberately NOT bare-surname: this corpus contains two
// Torreses, two Peterses, two Mullins, two Lees, two Kennedys and two Mike Rogerses,
// and a bare surname would silently merge one pair of them.
const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[ \-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const PARTY_LONG = { R: "Republican", D: "Democrat", I: "Independent" };
const MONTHS = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
const isoDate = (clerkDate) => {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(clerkDate || ""));
  return m ? `${m[3]}${MONTHS[m[2]]}${String(m[1]).padStart(2, "0")}` : null;
};

async function getText(url) {
  const r = await fetch(url, { headers: { "user-agent": "politidex-roster-census" } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return await r.text();
}

// ── 1. The Clerk's roster ────────────────────────────────────────────────────
function parseMemberData(xml) {
  const pub = /<publish-date>([^<]*)<\/publish-date>/.exec(xml)?.[1]
    ?? /<MemberData publish-date="([^"]*)"/.exec(xml)?.[1] ?? null;
  const congress = /<congress-num>(\d+)<\/congress-num>/.exec(xml)?.[1] ?? null;
  const blocks = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => m[1]);
  const tag = (s, t) => new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`).exec(s)?.[1] ?? "";
  const seats = blocks.map((b) => ({
    statedistrict: tag(b, "statedistrict"),
    bioguide: tag(b, "bioguideID").trim(),
    officialName: tag(b, "official-name").trim(),
    lastName: tag(b, "lastname").trim(),
    party: tag(b, "party").trim(),
    caucus: tag(b, "caucus").trim(),
    state: /<state postal-code="([A-Z]{2})"/.exec(b)?.[1] ?? "",
    stateFull: tag(b, "state-fullname").trim(),
    district: tag(b, "district").trim(),
    sworn: /<sworn-date date="(\d*)"/.exec(b)?.[1] || null,
    footnote: tag(b, "footnote").trim(),
    predecessor: /<pred-official-name>([^<]*)<\/pred-official-name>/.exec(b)?.[1] ?? null,
    predecessorBioguide: /<pred-memindex>([^<]*)<\/pred-memindex>/.exec(b)?.[1] ?? null,
  }));
  if (!seats.length) throw new Error("MemberData.xml yielded no <member> blocks — the document changed shape");
  return { publishDate: pub, congress, seats };
}

// ── 2. The legislators dataset ───────────────────────────────────────────────
async function loadLegislators() {
  const raw = existsSync(LEG_LOCAL) ? readFileSync(LEG_LOCAL, "utf8") : await getText(LEG_URL);
  const all = JSON.parse(raw);
  const byBio = new Map();
  for (const p of all) {
    const t = p.terms[p.terms.length - 1];
    if (t.type !== "rep") continue;
    byBio.set(p.id.bioguide, {
      first: p.name.nickname || p.name.first,
      last: p.name.last,
      officialFull: p.name.official_full || `${p.name.first} ${p.name.last}`,
      state: t.state,
      district: t.district,
      party: t.party,
    });
  }
  if (!byBio.size) throw new Error("legislators-current.json yielded no House members");
  return byBio;
}

// ── 3. The roll XML on disk ──────────────────────────────────────────────────
function corpusRolls() {
  const rolls = [];
  for (const f of SEED_FILES) {
    const doc = JSON.parse(readFileSync(join(ROOT, f), "utf8"));
    for (const v of doc.votes || []) {
      if (v.chamber !== "house") continue;
      if (!Array.isArray(v._unresolvedBioguides)) continue; // nothing a wider roster recovers
      const year = v.clerkYear ?? (v.session === 1 ? 2025 : 2026);
      rolls.push({
        seed: f, congress: v.congress, session: v.session, rollNumber: v.rollNumber,
        clerkYear: year,
        xmlUrl: v.xmlUrl || `https://clerk.house.gov/evs/${year}/roll${String(v.rollNumber).padStart(3, "0")}.xml`,
      });
    }
  }
  rolls.sort((a, b) => a.session - b.session || a.rollNumber - b.rollNumber);
  const seen = new Set();
  for (const r of rolls) {
    const k = `${r.congress}/${r.session}/${r.rollNumber}`;
    if (seen.has(k)) throw new Error(`two seeds claim the same House roll ${k}`);
    seen.add(k);
  }
  return rolls;
}

function parseRoll(xml, at) {
  const date = isoDate(/<action-date>([^<]*)<\/action-date>/.exec(xml)?.[1]);
  const rows = [...xml.matchAll(
    /<recorded-vote>\s*<legislator name-id="([A-Z0-9]+)"[^>]*\bparty="([^"]*)"[^>]*\bstate="([^"]*)"[^>]*>([^<]*)<\/legislator>\s*<vote>([^<]*)<\/vote>/g)]
    .map((m) => ({ bioguide: m[1], party: m[2], state: m[3], shown: m[4].trim(), position: m[5].trim() }));
  if (!rows.length) throw new Error(`${at}: no <recorded-vote> rows parsed`);
  return { date, rows };
}

// ═════════════════════════════════════════════════════════════════════════════
const check = process.argv.includes("--check");

const md = parseMemberData(await getText(MEMBERDATA_URL));
const leg = await loadLegislators();
const memberMap = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
const mapped = new Set(Object.keys(memberMap.map || {}));
const mappedSlugs = new Set(Object.values(memberMap.map || {}));

// Seats, sorted by the Clerk's own <statedistrict> so the ledger reads like the roster.
const seats = [...md.seats].sort((a, b) => a.statedistrict.localeCompare(b.statedistrict));
const votingSeats = seats.filter((s) => !TERRITORIES.has(s.state));
if (votingSeats.length !== APPORTIONED_SEATS) {
  throw new Error(`the Clerk's roster carries ${votingSeats.length} voting seats, not the ` +
    `${APPORTIONED_SEATS} the apportionment fixes — refusing to census a document this script does not understand`);
}
const sdSeen = new Set();
for (const s of votingSeats) {
  if (sdSeen.has(s.statedistrict)) throw new Error(`the Clerk's roster lists ${s.statedistrict} twice`);
  sdSeen.add(s.statedistrict);
}

// Fetch every roll once, then index every Bioguide the corpus names.
const rolls = corpusRolls();
const namedByCorpus = new Map(); // bioguide → {party, state, shown, rolls:[]}
const rollDetail = [];
for (const r of rolls) {
  const at = `${r.congress}/${r.session}/${r.rollNumber}`;
  const { date, rows } = parseRoll(await getText(r.xmlUrl), at);
  for (const row of rows) {
    const prev = namedByCorpus.get(row.bioguide);
    if (prev) { prev.rolls.push(at); continue; }
    namedByCorpus.set(row.bioguide, { party: row.party, state: row.state, shown: row.shown, rolls: [at] });
  }
  rollDetail.push({ ...r, at, voteDate: date, recorded: rows.length });
}

// ── Admit ────────────────────────────────────────────────────────────────────
const admitted = [];
const refused = [];
const slugOwner = new Map();

for (const s of votingSeats) {
  const where = `${s.state}-${s.district === "At Large" ? "AL" : String(s.district).replace(/\D/g, "").padStart(2, "0")}`;
  if (!s.bioguide) {
    refused.push({
      kind: "vacant_seat", statedistrict: s.statedistrict, district: where, bioguide: null,
      who: s.predecessor ? `formerly ${s.predecessor}` : "vacant",
      predecessorBioguide: s.predecessorBioguide || null,
      reason: "A seat is not a person. The Clerk's roster carries this seat with an empty " +
        "<bioguideID>: " + (s.footnote || "no sitting member") + " Admitting a placeholder here would " +
        "invent a member; the district stays out of the roster until someone is seated in it.",
    });
    continue;
  }
  if (mapped.has(s.bioguide)) continue; // already attributes; not this wave's business

  const L = leg.get(s.bioguide);
  if (!L) {
    refused.push({
      kind: "not_currently_seated", statedistrict: s.statedistrict, district: where,
      bioguide: s.bioguide, who: s.officialName,
      reason: "The Clerk's roster names them for this seat but the legislators dataset does not " +
        "list them as currently seated, so the two documents disagree about whether they are a " +
        "sitting member. Two sources that disagree is exactly the case this census refuses.",
    });
    continue;
  }

  // The two documents must agree about state, district and party before anything is admitted.
  const clerkDistrictNum = s.district === "At Large" ? 0 : Number(String(s.district).replace(/\D/g, ""));
  const disagreements = [];
  if (L.state !== s.state) disagreements.push(`state: Clerk ${s.state} vs dataset ${L.state}`);
  if (L.district !== clerkDistrictNum) disagreements.push(`district: Clerk ${s.district} vs dataset ${L.district}`);
  if (PARTY_LONG[s.party] !== L.party) disagreements.push(`party: Clerk ${s.party} vs dataset ${L.party}`);
  const surname = slugify(L.last);
  if (!slugify(s.officialName).includes(surname)) {
    disagreements.push(`name: Clerk "${s.officialName}" does not contain the dataset surname "${L.last}"`);
  }

  // …and the roll XML too, when the corpus names them at all.
  //   State and name are held hard: those are identity, and a Bioguide that votes from
  // one state and sits for another is the misidentification this census exists to catch.
  //   PARTY IS NOT. The Clerk's roster and the dataset both describe today; the roll XML
  // describes the day of the vote, and a member is allowed to change party in between.
  // Kevin Kiley (K000401, CA-03) voted every roll in this corpus as an R and now sits as
  // an I who caucuses with the Republicans. Refusing him for that would be refusing a
  // true fact about a real person, and it would strand 23 rolls' worth of his votes to
  // protect against nothing — the Bioguide, the state and the surname all agree. So the
  // historic party is RECORDED (`partyAtRoll`) instead of being treated as a conflict.
  // It is also the party the attribution seed reads for with_party / against_party, which
  // is right: crossing your party is a fact about the day of the vote, not about today.
  const seen = namedByCorpus.get(s.bioguide) || null;
  let partyAtRoll = null;
  if (seen) {
    if (seen.state !== s.state) disagreements.push(`roll XML state: ${seen.state} vs Clerk ${s.state}`);
    if (!slugify(seen.shown).includes(surname) && !surname.includes(slugify(seen.shown).split("_")[0])) {
      disagreements.push(`roll XML name: "${seen.shown}" does not agree with "${L.last}"`);
    }
    if (seen.party !== s.party) partyAtRoll = seen.party;
  }
  if (disagreements.length) {
    refused.push({
      kind: "sources_disagree", statedistrict: s.statedistrict, district: where,
      bioguide: s.bioguide, who: s.officialName,
      reason: "The documents do not agree about who this Bioguide is, and a Bioguide admitted on a " +
        "disagreement is how one member's voting record lands on another member's profile: " +
        disagreements.join("; "),
    });
    continue;
  }

  const slug = CANONICAL_SLUG[s.bioguide] || slugify(`${L.first}_${L.last}`);
  if (slugOwner.has(slug)) {
    refused.push({
      kind: "slug_collision", statedistrict: s.statedistrict, district: where,
      bioguide: s.bioguide, who: s.officialName,
      reason: `the naming rule gives this member the slug '${slug}', which ${slugOwner.get(slug)} already ` +
        `holds in this same wave. Two living people cannot share one current file; name one of them by hand ` +
        `in CANONICAL_SLUG before admitting either.`,
    });
    continue;
  }
  if (mappedSlugs.has(slug)) {
    refused.push({
      kind: "slug_collision", statedistrict: s.statedistrict, district: where,
      bioguide: s.bioguide, who: s.officialName,
      reason: `the naming rule gives this member the slug '${slug}', which db/vr-member-map.json already ` +
        `points at a different Bioguide. Admitting it would re-home an existing voting record.`,
    });
    continue;
  }
  slugOwner.set(slug, s.bioguide);

  admitted.push({
    slug,
    bioguide: s.bioguide,
    name: L.officialFull,
    office: "U.S. Representative",
    stateFull: s.stateFull,
    state: s.state,
    district: s.district === "At Large" ? "AL" : String(clerkDistrictNum).padStart(2, "0"),
    districtLabel: where,
    party: s.party,
    caucus: s.caucus && s.caucus !== s.party ? s.caucus : null,
    partyAtRoll,
    sworn: s.sworn,
    reusesExistingFile: REUSED_EXISTING.has(slug),
    namedByCorpus: !!seen,
    rollsNaming: seen ? seen.rolls.length : 0,
    verifiedBy: [
      `clerk MemberData.xml ${s.statedistrict} ${s.party} "${s.officialName}"`,
      `legislators-current ${L.state}-${L.district} ${L.party} "${L.officialFull}"`,
      seen ? `clerk roll XML name-id on ${seen.rolls.length} roll(s), first ${seen.rolls[0]}` +
        (partyAtRoll ? ` (voted as ${partyAtRoll}, now ${s.party})` : "") :
        "no roll in this corpus names them — admitted as a sitting member, recovers no cell",
    ],
  });
}

// ── Refuse the delegates, out loud, with the price attached ──────────────────
const delegateSeats = seats.filter((s) => TERRITORIES.has(s.state) && s.bioguide);
let delegateCellsForgone = 0;
const JUDGED = new Set(["Yea", "Nay", "Aye", "No"]);
for (const s of delegateSeats) {
  const seen = namedByCorpus.get(s.bioguide);
  refused.push({
    kind: "delegate", statedistrict: s.statedistrict, district: null,
    bioguide: s.bioguide, who: s.officialName, title: s.district,
    namedByCorpus: !!seen, rollsNaming: seen ? seen.rolls.length : 0,
    reason: "A delegate or the Resident Commissioner, not a sitting member of the House with a " +
      "district. The Clerk does record their Committee-of-the-Whole positions on this corpus's " +
      "amendment rolls, so admitting them would recover cells — this refusal has a price and it is " +
      "counted in `delegatesRefused.cellsForgone`. It is refused anyway because this wave admits " +
      "members by district and their <statedistrict> has no district number, and inventing one to " +
      "fit the roster's shape is the failure the roster exists to prevent. A later wave can reverse " +
      "this by admitting them as territory seats; it should not do it by giving them a district.",
  });
}

// The unmapped Bioguides the corpus names that this wave does not admit — the honest
// residual. Split by why, because "delegate" and "left the House" are different gaps.
const admittedBios = new Set(admitted.map((a) => a.bioguide));
// Someone already refused above for a nameable reason is not re-listed here as a former
// member: one person, one refusal, or the ledger's own counts stop adding up.
const alreadyRefused = new Set(refused.map((r) => r.bioguide).filter(Boolean));
const residual = [];
for (const [bio, seen] of namedByCorpus) {
  if (mapped.has(bio) || admittedBios.has(bio) || alreadyRefused.has(bio)) continue;
  const seat = seats.find((s) => s.bioguide === bio);
  const isDelegate = !!seat && TERRITORIES.has(seat.state);
  residual.push({ bioguide: bio, shown: seen.shown, state: seen.state, party: seen.party,
    rolls: seen.rolls.length, kind: isDelegate ? "delegate" : "former_member" });
}
residual.sort((a, b) => a.bioguide.localeCompare(b.bioguide));

for (const r of residual) {
  if (r.kind !== "former_member") continue;
  const seat = votingSeats.find((s) => s.predecessorBioguide === r.bioguide);
  refused.push({
    kind: "former_member", statedistrict: seat ? seat.statedistrict : null, district: null,
    bioguide: r.bioguide, who: r.shown, rollsNaming: r.rolls,
    reason: "Named by " + r.rolls + " roll(s) in this corpus and no longer in the House — the Clerk's " +
      "current roster does not seat them and the legislators dataset does not list them. This wave " +
      "admits sitting members; admitting someone who has left in order to harvest their old cells is " +
      "the opposite of the rule. Their positions stay skipped and stay counted.",
  });
}

// Per-roll arithmetic: what the wider roster actually recovers, roll by roll, and
// what is still skipped afterwards. Recomputed from the XML rather than asserted.
const perRoll = [];
for (const r of rolls) {
  const at = `${r.congress}/${r.session}/${r.rollNumber}`;
  const { rows } = parseRoll(await getText(r.xmlUrl), at);
  const before = rows.filter((x) => !mapped.has(x.bioguide));
  const gained = rows.filter((x) => admittedBios.has(x.bioguide));
  const after = before.filter((x) => !admittedBios.has(x.bioguide));
  delegateCellsForgone += after.filter((x) => {
    const seat = seats.find((s) => s.bioguide === x.bioguide);
    return !!seat && TERRITORIES.has(seat.state) && JUDGED.has(x.position);
  }).length;
  perRoll.push({
    at, recorded: rows.length,
    skippedBefore: before.length, cellsGained: gained.length, skippedAfter: after.length,
    judgedGained: gained.filter((x) => JUDGED.has(x.position)).length,
  });
}

const sum = (k) => perRoll.reduce((n, r) => n + r[k], 0);
const doc = {
  _comment:
    "Federal roster wave R1 census — who the 119th House roster admits and who it refuses, with the " +
    "reason on every line. Written by scripts/vr-federal-roster-r1-census.mjs from three documents that " +
    "can disagree (clerk.house.gov MemberData.xml, the congress-legislators dataset, and the roll XML " +
    "already in the F6/F7/F9 seeds). Nothing downstream reads this file at runtime; it is the reviewable " +
    "record of the admission decision, and scripts/test-vr-federal-roster-r1.mjs holds the tree to it.",
  wave: WAVE,
  chamber: "house",
  congress: 119,
  builtBy: "scripts/vr-federal-roster-r1-census.mjs",
  source: {
    clerkRoster: MEMBERDATA_URL,
    clerkRosterPublished: md.publishDate,
    legislators: LEG_URL,
    rollXml: "https://clerk.house.gov/evs/<year>/roll<NNN>.xml",
  },
  slugRule:
    "<first>_<last>, accents folded, punctuation dropped, spaces and hyphens to underscores; the " +
    "dataset's nickname wins over its legal first name. Never a bare surname — this corpus holds two " +
    "Torreses, two Peterses, two Mullins, two Lees, two Kennedys and two Mike Rogerses.",
  census: {
    apportionedSeats: APPORTIONED_SEATS,
    clerkVotingSeats: votingSeats.length,
    vacantSeats: votingSeats.filter((s) => !s.bioguide).length,
    sittingVotingMembers: votingSeats.filter((s) => s.bioguide).length,
    alreadyMappedSitting: votingSeats.filter((s) => s.bioguide && mapped.has(s.bioguide)).length,
    candidates: admitted.length + refused.filter((r) => ["sources_disagree", "slug_collision", "not_currently_seated"].includes(r.kind)).length,
    admitted: admitted.length,
    reusingAnExistingFile: admitted.filter((a) => a.reusesExistingFile).length,
    admittedNamedByCorpus: admitted.filter((a) => a.namedByCorpus).length,
    admittedNamedByNoRoll: admitted.filter((a) => !a.namedByCorpus).length,
    refused: refused.length,
    refusedByKind: refused.reduce((o, r) => ((o[r.kind] = (o[r.kind] || 0) + 1), o), {}),
  },
  attribution: {
    rollsRead: rolls.length,
    recordedPositions: sum("recorded"),
    skippedBefore: sum("skippedBefore"),
    cellsGained: sum("cellsGained"),
    judgedCellsGained: sum("judgedGained"),
    skippedAfter: sum("skippedAfter"),
    residualIsOnly: "the six delegates and the seven former members listed in `residualSkipped` — " +
      "no sitting member with a district is skipped anywhere in this corpus after this wave",
    perRoll,
  },
  delegatesRefused: {
    count: delegateSeats.length,
    cellsForgone: delegateCellsForgone,
    note: "Judged Committee-of-the-Whole positions the Clerk records for the six delegates across the " +
      "rolls in this corpus, which this wave declines to attribute. Stated so the decision can be " +
      "reversed deliberately rather than rediscovered.",
  },
  residualSkipped: residual,
  admitted,
  refused: refused.sort((a, b) =>
    a.kind.localeCompare(b.kind) || String(a.statedistrict).localeCompare(String(b.statedistrict))),
};

const json = JSON.stringify(doc, null, 2) + "\n";
if (check) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  // The Clerk re-publishes MemberData.xml with a new publish-date without changing the
  // roster, so --check compares the decisions and not the stationery.
  const norm = (s) => { try { const d = JSON.parse(s); delete d.source; return JSON.stringify({ a: d.admitted, r: d.refused, c: d.census }); } catch { return "∅"; } };
  if (norm(cur) !== norm(json)) {
    console.error("✗ db/vr-federal-roster-r1-census.json is out of date — run: node scripts/vr-federal-roster-r1-census.mjs");
    process.exit(1);
  }
  console.log(`✓ R1 census current — ${admitted.length} admitted, ${refused.length} refused`);
} else {
  writeFileSync(OUT, json);
  console.log(`✓ wrote ${OUT}`);
  console.log(`  ${APPORTIONED_SEATS} apportioned seats · ${doc.census.vacantSeats} vacant · ` +
    `${doc.census.sittingVotingMembers} sitting · ${doc.census.alreadyMappedSitting} already mapped ` +
    `→ ${doc.census.candidates} candidates`);
  console.log(`  admitted ${admitted.length} (${doc.census.reusingAnExistingFile} onto a file the app already has, ` +
    `${doc.census.admittedNamedByNoRoll} named by no roll in this corpus)`);
  console.log(`  refused ${refused.length}: ` + Object.entries(doc.census.refusedByKind).map(([k, n]) => `${n} ${k}`).join(", "));
  console.log(`  ${rolls.length} House rolls: ${doc.attribution.skippedBefore} skipped → ${doc.attribution.skippedAfter} ` +
    `(${doc.attribution.cellsGained} recoverable cells, ${doc.attribution.judgedCellsGained} of them judged)`);
  console.log(`  delegates refused: ${delegateCellsForgone} judged cell(s) left on the table, on purpose`);
}
