#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — Federal roster wave R2 census
// ─────────────────────────────────────────────────────────────────────────────
// R1 admitted 315 sitting House members and left a hole it had named but not
// filled. Its arithmetic was "candidates = sitting members MINUS the ones the map
// already carried", and `alreadyMappedSitting` was 116. Those 116 were skipped as
// already-solved, which was true of the MAP and not true of the ROSTER: twelve of
// them had a Bioguide in db/vr-member-map.json — so their votes attach, and have
// attached for waves — and no row in CMP_DATA at all.
//
// A pid in that state is the worst of both halves. The ingest resolves it, so the
// database holds real attributed roll-call cells against it; the roster does not
// carry it, so nothing in the app can name it. scripts/gen-crawl-record.mjs says
// so out loud on every run — "12 seeded pid(s) are on no roster record and were
// skipped" — and that line is this wave's entire reason to exist.
//
//   House   haley_stevens, adrian_smith, dina_titus, gabe_vasquez,
//           melanie_stansbury, russ_fulcher, susie_lee,
//           teresa_leger_fernandez, zach_nunn
//   Senate  hyde_smith, jon_husted, alan_armstrong
//
// This script does not write the roster. It writes db/vr-federal-roster-r2-census.json
// — a per-person admitted / already-had-a-row / refused ledger with the reason
// attached — and the wave is hand-applied from it, the same way R1 was. Keeping
// the decision in a committed file rather than in a generator's head is the point:
// every admission is one reviewable line naming a Bioguide, a seat, and two
// documents that agree about both.
//
// ── Verified twice, and by documents that can disagree ────────────────────────
// A wrong Bioguide is the worst failure this roster has: it re-homes one member's
// entire voting record onto another member's profile and nothing downstream looks
// broken from either end (checkNamesAgree() in scripts/vr-gen-member-map.mjs, and
// 20260815000000_vr_fix_kennedy_identity_collision.sql for the time it happened).
// So nobody here is admitted on one source's word:
//
//   1. THE CHAMBER'S OWN ROSTER.
//      House  — clerk.house.gov/xml/lists/MemberData.xml. One <member> per seat
//               carrying <bioguideID>, <statedistrict>, <party>, <official-name>,
//               <state-fullname> and <sworn-date>.
//      Senate — senate.gov/general/contact_information/senators_cfm.xml, the
//               Senate's own contact roster, carrying <bioguide_id>, <state>,
//               <party>, <class> and the member's name. This is the Senate LIS
//               side of the brief's "Clerk or Senate LIS" — the roll-call XML
//               keys on (surname, state) and carries no Bioguide at all, so the
//               contact roster is the Senate document that can actually contradict
//               a Bioguide claim.
//   2. THE LEGISLATORS DATASET — unitedstates.github.io/congress-legislators.
//      Independent provenance, independent maintainers.
//
// A person is admitted only when (1) and (2) agree on chamber, state, party and —
// in the House — district. The full state name is read out of the Clerk's own
// <state-fullname> for every postal code rather than typed here, so the row labels
// carry no hand-written geography.
//
// ── The third check, which is about the SLUG rather than the person ───────────
// Verifying that A000383 is Alan Armstrong does not verify that the app's
// `alan_armstrong` is pointed at A000383. Those are different claims and only the
// second one decides where a vote lands. So this script also holds the slug to the
// two places that already assert its Bioguide:
//
//   · db/vr-member-map.json — what the ingest actually resolves through;
//   · BROWSE_PHOTOS in compare-hub.js, when the portrait URL carries a readable
//     Bioguide (unitedstates/images and bioguide.congress.gov both do), plus
//     SEED_SLUGS in scripts/vr-gen-member-map.mjs, which is the hand-typed side.
//
// A disagreement between the hand-typed slug and the portrait's Bioguide is a hard
// error here and a hard error in the map generator. Two of the twelve — jon_husted
// and alan_armstrong — have Commons portraits whose URL carries no Bioguide, so
// their slug is asserted by hand and by nothing else. That is exactly the
// single-source position the Kennedy incident came out of, which is why this wave
// leaves their SEED_NAMES declarations standing and hardens the generator to keep
// checking them against the official record even now that the app publishes a name
// for them. A surname compare cannot tell Alan Armstrong (Sen, OK) from Kelly
// Armstrong (Gov, ND), and the app carries both.
//
// ── What this script refuses ──────────────────────────────────────────────────
// Refusals are written, not silent. This wave found no person it had to refuse —
// the twelve are twelve distinct living people and none of them is already on file
// under another slug — but it found four NEAR collisions, and a near collision
// that goes unrecorded is how the next wave merges two people. Each is named in
// `nonMerges` with the evidence that they are two people:
//
//   susie_lee (Rep, NV-03) is not `lee` (Mike Lee, Sen, UT), and not `susan_lee`
//   alan_armstrong (Sen, OK) is not `kelly_armstrong` (Gov, ND)
//   adrian_smith (Rep, NE-03) is not hyde_smith / tina_smith / jason_smith /
//     adam_smith / chris_smith / murrell_smith
//   dina_titus (Rep, NV-01) is not `robin_titus` (NV State Senator)
//
// This is the mike_rogers rule applied forward: R1 kept `mike_rogers_al` distinct
// from `mike_rogers` because they are two living men with one name, and no alias
// was written across them. No alias is written across anyone here either.
//
// ── The one label this wave corrects, and why it is not a merge ───────────────
// Admitting alan_armstrong to the OK Class II seat makes Oklahoma the only state
// with three U.S. Senator files, because `mullin` still reads "U.S. Senator ·
// Oklahoma". db/vr-member-map.json has recorded him as serving119: false since the
// handover; CMP_DATA had not caught up. legislators-historical.json ends his Senate
// term 2026-03-23 and the Senate's own roster now seats Armstrong in Class II.
//
// So his file gets an IDENTITY-ONLY office correction, on R1's own rfine precedent:
// R1 corrected Randy Fine's office and district in place rather than minting a
// parallel file, because a file that is about to receive roll calls must not be
// labelled as a candidate for the seat. Same move, opposite direction — a file that
// no longer holds the seat must not be labelled as holding it.
//
// THIS IS NOT A MERGE AND NOT A DELETION. Markwayne Mullin is a different person
// from Alan Armstrong; his file stays, his score stays, his issues, stances and
// every attributed vote stay exactly as they are, and NO alias is written between
// the two ids. What changes is the office string, the seat label and the termEnd
// that marks a former office — the same fields, in the same convention, that
// `gaetz` and `cstewart` already carry.
//
//   node scripts/vr-federal-roster-r2-census.mjs           # write the census
//   node scripts/vr-federal-roster-r2-census.mjs --check    # verify it is current
//
// NETWORK, read-only, no key. Writes one JSON file and nothing else.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "db", "vr-federal-roster-r2-census.json");
const WAVE = "federal_roster_r2_sep2026";

const MEMBERDATA_URL = "https://clerk.house.gov/xml/lists/MemberData.xml";
const SENATE_URL = "https://www.senate.gov/general/contact_information/senators_cfm.xml";
const LEG_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json";
const LEG_HIST_URL = "https://unitedstates.github.io/congress-legislators/legislators-historical.json";
const LEG_LOCAL = join(HERE, "legislators-current.json");
const LEG_HIST_LOCAL = join(HERE, "legislators-historical.json");

// ── The twelve, and nothing else ──────────────────────────────────────────────
// Typed here because this wave's scope IS this list — it is the exact set
// scripts/gen-crawl-record.mjs reports as seeded-but-rosterless, and a census that
// derived its own scope could quietly grow one. The Bioguide is NOT typed here: it
// is read out of db/vr-member-map.json, because the map is what the ingest resolves
// through and therefore the thing whose claim has to be checked.
const SCOPE = [
  "haley_stevens", "adrian_smith", "dina_titus", "gabe_vasquez", "melanie_stansbury",
  "russ_fulcher", "susie_lee", "teresa_leger_fernandez", "zach_nunn",
  "hyde_smith", "jon_husted", "alan_armstrong",
];

// The office label each chamber's row carries. The roster has exactly one string for
// each and R1's 308 rows all use the House one; a second spelling would split every
// "who are the representatives" filter in the app.
const OFFICE = { house: "U.S. Representative", senate: "U.S. Senator" };

// ── The label correction, declared rather than inferred ──────────────────────
// A former-member label is a claim about a person, so it is declared here and then
// CHECKED against the historical dataset and the chamber roster below, exactly like
// an admission. It is not applied unless both agree that the seat changed hands.
const LABEL_FIX = {
  slug: "mullin",
  bioguide: "M001190",
  chamber: "senate",
  state: "OK",
  succeededBy: "alan_armstrong",
  precedent: "rfine (federal_roster_r1_sep2026)",
};

const PARTY_LETTER = { Republican: "R", Democrat: "D", Independent: "I" };

async function getText(url) {
  const r = await fetch(url, { headers: { "user-agent": "politidex-roster-census" } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return await r.text();
}
async function getJSON(url, local) {
  if (local && existsSync(local)) return JSON.parse(readFileSync(local, "utf8"));
  return JSON.parse(await getText(url));
}

const tag = (s, t) =>
  (new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`).exec(s)?.[1] ?? "").trim();

// ── 1a. The Clerk's roster ───────────────────────────────────────────────────
function parseMemberData(xml) {
  const congress = /<congress-num>(\d+)<\/congress-num>/.exec(xml)?.[1] ?? null;
  const blocks = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => m[1]);
  const byBio = new Map();
  // Postal code → full state name, straight out of the Clerk's own document, so no
  // state name in this wave's row labels was typed by a person.
  const stateFull = new Map();
  for (const b of blocks) {
    const postal = /<state postal-code="([A-Z]{2})"/.exec(b)?.[1] ?? null;
    const full = tag(b, "state-fullname");
    if (postal && full && !stateFull.has(postal)) stateFull.set(postal, full);
    const bio = tag(b, "bioguideID");
    if (!bio) continue; // a vacant seat is a <member> with an empty bioguideID
    const sd = tag(b, "statedistrict");
    const m = /^([A-Z]{2})(\d{2})$/.exec(sd);
    byBio.set(bio, {
      bioguide: bio,
      name: tag(b, "official-name"),
      state: m ? m[1] : (postal || null),
      // The Clerk writes an at-large seat as 00; the roster prints it AL.
      district: m ? (m[2] === "00" ? "AL" : m[2]) : null,
      party: tag(b, "party") || null,
      sworn: (tag(b, "sworn-date") || "").replace(/\s+/g, " ").trim() || null,
      statedistrict: sd || null,
    });
  }
  return { congress, byBio, stateFull, seats: blocks.length };
}

// ── 1b. The Senate's own roster ──────────────────────────────────────────────
function parseSenateRoster(xml) {
  const blocks = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => m[1]);
  const byBio = new Map();
  for (const b of blocks) {
    const bio = tag(b, "bioguide_id");
    if (!bio) continue;
    byBio.set(bio, {
      bioguide: bio,
      name: `${tag(b, "first_name")} ${tag(b, "last_name")}`.trim(),
      last: tag(b, "last_name"),
      state: tag(b, "state") || null,
      party: tag(b, "party") || null,
      klass: tag(b, "class") || null,
      memberFull: tag(b, "member_full") || null,
    });
  }
  return { byBio, seats: blocks.length };
}

// ── 2. The legislators dataset ───────────────────────────────────────────────
function indexLegislators(list, serving) {
  const byBio = new Map();
  for (const p of list || []) {
    const bio = p?.id?.bioguide;
    if (!bio || byBio.has(bio)) continue;
    const t = p.terms[p.terms.length - 1];
    byBio.set(bio, {
      bioguide: bio,
      name: p.name.official_full || `${p.name.first} ${p.name.last}`,
      first: p.name.nickname || p.name.first,
      last: p.name.last || "",
      chamber: t.type === "sen" ? "senate" : "house",
      state: t.state,
      district: t.type === "sen" ? null : (Number(t.district) === 0 ? "AL" : String(t.district).padStart(2, "0")),
      party: t.party,
      start: t.start,
      end: t.end,
      serving,
    });
  }
  return byBio;
}

// ── 3. What the app already says: the map, the portraits, the hand-typed slugs ─
function memberMap() {
  const doc = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
  const bySlug = new Map();
  for (const [bio, slug] of Object.entries(doc.map || {})) {
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(bio);
  }
  return { doc, bySlug };
}

// BROWSE_PHOTOS, read the same two URL forms the map generator reads, so "the
// portrait's Bioguide" means the same thing in both files.
function portraitBioguides() {
  const src = readFileSync(join(ROOT, "compare-hub.js"), "utf8");
  const open = src.indexOf("var BROWSE_PHOTOS = {");
  if (open === -1) throw new Error("BROWSE_PHOTOS not found in compare-hub.js");
  const close = src.indexOf("\n    };", open);
  const body = src.slice(open, close === -1 ? undefined : close);
  const FORMS = [
    /([a-z0-9_]+):\s*'https:\/\/raw\.githubusercontent\.com\/unitedstates\/images\/gh-pages\/congress\/450x550\/([A-Z][0-9]+)\.jpg'/g,
    /([a-z0-9_]+):\s*'https:\/\/bioguide\.congress\.gov\/bioguide\/photo\/([A-Z])\/(\2[0-9]+)\.jpg'/g,
  ];
  const bio = {};
  for (const re of FORMS) { let m; while ((m = re.exec(body))) bio[m[1]] = m[m.length - 1]; }
  // Every portrait URL, Bioguide-bearing or not, so a photo's presence and its
  // host can be reported for a slug whose URL carries no id.
  const url = {};
  let m;
  const any = /([a-z0-9_]+):\s*'(https:\/\/[^']+)'/g;
  while ((m = any.exec(body))) url[m[1]] = m[2];
  return { bio, url };
}

function seedSlugs() {
  const src = readFileSync(join(ROOT, "scripts", "vr-gen-member-map.mjs"), "utf8");
  const open = src.indexOf("const SEED_SLUGS = {");
  const close = src.indexOf("\n};", open);
  const body = src.slice(open, close);
  const out = {};
  let m;
  const re = /([a-z0-9_]+):\s*"([A-Z][0-9]+)"/g;
  while ((m = re.exec(body))) out[m[1]] = m[2];
  return out;
}

// The roster as the app boots it. cmp-data.js and spotlights-data.js are pure
// Object.assign data modules, so they evaluate in a bare sandbox — the same way
// scripts/gen-share-index.mjs and the map generator read them.
//
// `read` decides WHICH roster. This census is a ledger of what the wave DID, so it
// has to answer "did this person have a row before the wave" against the roster as
// it stood BEFORE the wave — otherwise the first rerun after the rows land reports
// twelve people who "already had a row" and the record of the admission is gone,
// and the collision scan starts finding the wave's own new rows (adrian_smith
// colliding with hyde_smith, both of them added by this same block). So the
// classification reads HEAD and the working tree is only measured, never judged
// against. The twin-boot harnesses in scripts/test-vr-federal-*.mjs read HEAD the
// same way.
function appRoster(read) {
  const sandbox = { window: {}, document: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  for (const f of ["cmp-data.js", "spotlights-data.js"]) {
    vm.runInContext(read(f), sandbox, { filename: f });
  }
  const spotlightNames = new Map();
  const walk = (node) => {
    if (Array.isArray(node)) return void node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (typeof node.id === "string" && typeof node.name === "string" && !spotlightNames.has(node.id)) {
      spotlightNames.set(node.id, node.name);
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(sandbox.window.SPOTLIGHTS || {});
  return { cmp: sandbox.window.CMP_DATA || {}, spotlightNames };
}

const normName = (s) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[.,'’-]/g, " ").replace(/\s+/g, " ").trim();

// Does this name carry this surname, as whole words and in order? A plain token
// test cannot answer that for the two surnames in this wave that are not one word
// — "Leger Fernandez" and "Hyde-Smith" — and a plain substring test is worse than
// either, because "smith" is inside "Hyde-Smith" and inside six other members.
// Contiguous whole-token matching is the strict reading: every element of the
// surname, in order, with nothing spliced between them.
function carriesSurname(full, last) {
  const f = normName(full).split(" ").filter(Boolean);
  const l = normName(last).split(" ").filter(Boolean);
  if (!l.length || l.length > f.length) return false;
  for (let i = 0; i + l.length <= f.length; i++) {
    if (l.every((t, j) => f[i + j] === t)) return true;
  }
  return false;
}

// ── The collision scan ───────────────────────────────────────────────────────
// Does any record already on file hold THIS PERSON? Asked by surname against every
// roster record, because a merge is what happens when two people share one, and
// answered by hand-checkable evidence rather than by a name compare alone: a hit is
// only the same person if the office and the place agree too.
function collisions(person, cmp, slug) {
  // Deliberately the widest net: ANY element of the surname, so "Hyde-Smith" is
  // checked against every Smith on file and not just against an exact "Hyde-Smith".
  // A near-collision recorded in writing costs a line; one that goes unrecorded is
  // how a later wave folds two people into one file.
  const elements = new Set(normName(person.last).split(" ").filter(Boolean));
  const hits = [];
  for (const [pid, rec] of Object.entries(cmp)) {
    if (pid === slug || !rec || !rec.name) continue;
    const tokens = normName(rec.name).split(" ");
    if (![...elements].some((e) => tokens.includes(e))) continue;
    hits.push({
      pid,
      name: rec.name,
      office: rec.office || null,
      state: rec.state || null,
      // Same surname AND the same seat in the same place would be a real merge
      // candidate. Anything else is two people, and the reason is recorded.
      samePerson:
        normName(rec.name) === normName(person.name) &&
        String(rec.office || "") === OFFICE[person.chamber] &&
        String(rec.state || "").includes(person.stateFull),
    });
  }
  return hits;
}

async function main() {
  const check = process.argv.includes("--check");

  const [houseXml, senateXml, leg, hist] = await Promise.all([
    getText(MEMBERDATA_URL),
    getText(SENATE_URL),
    getJSON(LEG_URL, LEG_LOCAL),
    getJSON(LEG_HIST_URL, LEG_HIST_LOCAL),
  ]);

  const house = parseMemberData(houseXml);
  const senate = parseSenateRoster(senateXml);
  const legByBio = indexLegislators(leg, true);
  const histByBio = indexLegislators(hist, false);

  const { doc: mapDoc, bySlug } = memberMap();
  const portraits = portraitBioguides();
  const seeds = seedSlugs();
  // The roster before this wave, which is what an admission is measured against, and
  // the roster now, which is only reported.
  const readHead = (f) => {
    try {
      return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
    } catch {
      return null;
    }
  };
  const headOk = ["cmp-data.js", "spotlights-data.js"].every((f) => readHead(f) !== null);
  const preWave = appRoster(headOk ? readHead : ((f) => readFileSync(join(ROOT, f), "utf8")));
  const nowRoster = appRoster((f) => readFileSync(join(ROOT, f), "utf8"));
  const { cmp, spotlightNames } = preWave;
  if (!headOk) {
    console.warn(`  ! HEAD:cmp-data.js is unreadable — classifying against the working tree instead. ` +
      `Rows this wave has already written will read as "already had a row".`);
  }

  const fatal = [];
  const admitted = [];
  const alreadyHadARow = [];
  const refused = [];
  const nonMerges = [];

  for (const slug of SCOPE) {
    // ── the slug's own claim, from the file the ingest resolves through ───────
    const bios = bySlug.get(slug) || [];
    if (bios.length !== 1) {
      refused.push({
        slug, kind: "map_claim_not_unique",
        reason: `db/vr-member-map.json resolves ${slug} through ${bios.length} Bioguide(s) (${bios.join(", ") || "none"}). ` +
          `A slug with no Bioguide attributes nothing and a slug with two is two people wearing one file; neither gets a row.`,
      });
      continue;
    }
    const bioguide = bios[0];

    // ── the hand-typed slug against the portrait's Bioguide ──────────────────
    // This is the wall the brief asks for. It is checked here AND in the map
    // generator, because this script can be skipped and that one cannot.
    const fromPortrait = portraits.bio[slug] || null;
    const fromSeed = seeds[slug] || null;
    if (fromSeed && fromPortrait && fromSeed !== fromPortrait) {
      fatal.push(`${slug}: SEED_SLUGS says ${fromSeed}, its BROWSE_PHOTOS portrait says ${fromPortrait} — ` +
        `two sources naming two different people for one slug`);
    }
    for (const [where, claim] of [["BROWSE_PHOTOS portrait", fromPortrait], ["SEED_SLUGS", fromSeed]]) {
      if (claim && claim !== bioguide) {
        fatal.push(`${slug}: db/vr-member-map.json resolves ${bioguide}, ${where} says ${claim}`);
      }
    }

    // ── source 2: the legislators dataset ────────────────────────────────────
    const l = legByBio.get(bioguide);
    if (!l) {
      refused.push({
        slug, bioguide, kind: "not_currently_seated",
        reason: `${bioguide} is not in legislators-current.json, so this wave cannot verify a sitting member behind ` +
          `the slug. A former member is explicitly out of scope and is refused rather than guessed at.`,
      });
      continue;
    }

    // ── source 1: the chamber's own roster ───────────────────────────────────
    const chamber = l.chamber;
    const own = chamber === "house" ? house.byBio.get(bioguide) : senate.byBio.get(bioguide);
    const ownName = chamber === "house" ? "clerk MemberData.xml" : "senate.gov contact roster";
    if (!own) {
      refused.push({
        slug, bioguide, kind: "chamber_roster_silent",
        reason: `${bioguide} is in legislators-current.json but not in the ${ownName}. One source is not two, and ` +
          `an identity this wave cannot verify twice does not get a row.`,
      });
      continue;
    }

    // ── do the two documents agree? ──────────────────────────────────────────
    const disagreements = [];
    if (own.state !== l.state) disagreements.push(`state ${own.state} vs ${l.state}`);
    if (String(own.party || "") !== (PARTY_LETTER[l.party] || l.party)) {
      disagreements.push(`party ${own.party} vs ${l.party}`);
    }
    if (chamber === "house" && own.district !== l.district) {
      disagreements.push(`district ${own.district} vs ${l.district}`);
    }
    if (!carriesSurname(own.name, l.last)) {
      disagreements.push(`name "${own.name}" does not carry the surname "${l.last}"`);
    }
    if (disagreements.length) {
      refused.push({
        slug, bioguide, kind: "sources_disagree",
        reason: `the ${ownName} and legislators-current.json disagree about ${bioguide}: ${disagreements.join("; ")}. ` +
          `The whole reason two sources are read is that a disagreement stops the admission.`,
      });
      continue;
    }

    const stateFull = house.stateFull.get(l.state) || null;
    if (!stateFull) {
      refused.push({
        slug, bioguide, kind: "no_state_name",
        reason: `no <state-fullname> for ${l.state} in the Clerk's roster, and this wave does not type state names by hand.`,
      });
      continue;
    }

    const person = { name: l.name, last: l.last, chamber, stateFull };

    // ── one person, one current file ─────────────────────────────────────────
    const hits = collisions(person, cmp, slug);
    const same = hits.filter((h) => h.samePerson);
    if (same.length) {
      refused.push({
        slug, bioguide, kind: "already_on_file_elsewhere",
        reason: `${l.name} already has a current file under ${same.map((h) => `'${h.pid}'`).join(", ")}. One person gets ` +
          `one current file: this wave gives the EXISTING slug its row, or gives none, and never mints a parallel identity.`,
        collidesWith: same,
      });
      continue;
    }
    if (hits.length) {
      nonMerges.push({
        slug, bioguide, who: l.name,
        seat: chamber === "house" ? `${l.state}-${l.district}` : `${l.state} U.S. Senate`,
        notTheSamePersonAs: hits.map((h) => ({ pid: h.pid, name: h.name, office: h.office, state: h.state })),
        reason: `Shares a surname element with ${hits.length} record(s) already on file and is a different living person from ` +
          `every one of them — different seat, different place, verified by ${ownName} and legislators-current.json. ` +
          `Recorded so a later wave cannot mistake the shared surname for a duplicate: this is the mike_rogers rule ` +
          `(R1 kept mike_rogers_al distinct from mike_rogers), and NO alias is written across any of these ids.`,
      });
    }

    // ── the row this admission asks for ──────────────────────────────────────
    // The name is the one THE APP ALREADY PUBLISHES where it publishes one. Nine of
    // these twelve are SPOTLIGHTS figures with no compare card — the Horsford
    // position R1 named — and R1 gave Horsford a row under his SPOTLIGHTS name
    // rather than the dataset's legal one, on the doctrine it wrote down for
    // bobby_scott: the dataset publishes the legal name, the app publishes the name
    // a reader knows. Two labels for one person on two surfaces is a search failure,
    // so the existing label wins and the official record is kept beside it here.
    const published = spotlightNames.get(slug) || null;
    const record = {
      slug,
      bioguide,
      chamber,
      name: published || l.name,
      officialRecordName: l.name,
      nameSource: published ? "app (SPOTLIGHTS figure row)" : "official record",
      office: OFFICE[chamber],
      state: l.state,
      stateFull,
      district: chamber === "house" ? l.district : null,
      // The label the row's `state` field carries. The roster writes a House seat as
      // "<Full State> · <ST>-<NN>" (don_davis, trent_kelly, and all 308 R1 rows) and a
      // Senate seat as the bare state name (lee, curtis, tina_smith).
      stateLabel: chamber === "house" ? `${stateFull} · ${l.state}-${l.district}` : stateFull,
      party: PARTY_LETTER[l.party] || l.party,
      klass: chamber === "senate" ? (own.klass || null) : null,
      sworn: chamber === "house" ? (own.sworn || null) : (l.start || null),
      hadRosterRow: !!cmp[slug],
      photo: portraits.url[slug] ? { url: portraits.url[slug], host: new URL(portraits.url[slug]).host,
        carriesBioguide: !!portraits.bio[slug] } : null,
      handTypedBioguide: fromSeed,
      portraitBioguide: fromPortrait,
      verifiedBy: [
        chamber === "house"
          ? `clerk MemberData.xml ${own.statedistrict} ${own.party} "${own.name}"`
          : `senate.gov contact roster ${own.state} ${own.party} ${own.klass} "${own.memberFull}"`,
        `legislators-current ${l.state}${l.district ? `-${l.district}` : ""} ${l.party} "${l.name}"`,
        `db/vr-member-map.json resolves ${slug} → ${bioguide}`,
      ].concat(fromSeed ? [`SEED_SLUGS declares ${slug}: "${fromSeed}"`] : [])
        .concat(fromPortrait ? [`BROWSE_PHOTOS portrait URL carries ${fromPortrait}`] : []),
    };

    if (record.hadRosterRow) alreadyHadARow.push(record);
    else admitted.push(record);
  }

  // ── the wave against itself ────────────────────────────────────────────────
  // Everything above checks a slug against the roster and against the record. Two of
  // these twelve are Smiths and none of the checks so far would notice if the wave
  // pointed two of its own rows at one person, which is the one shape of duplicate a
  // simultaneous admission can create.
  {
    const bySlugSeen = new Map();
    const byBioSeen = new Map();
    for (const a of admitted.concat(alreadyHadARow)) {
      if (bySlugSeen.has(a.slug)) fatal.push(`this wave admits '${a.slug}' twice`);
      bySlugSeen.set(a.slug, a);
      const prior = byBioSeen.get(a.bioguide);
      if (prior) {
        fatal.push(`this wave points '${prior.slug}' and '${a.slug}' at the same person (${a.bioguide}) — ` +
          `one person gets one file`);
      }
      byBioSeen.set(a.bioguide, a);
    }
  }

  // ── the label correction, verified before it is written ────────────────────
  const fix = (() => {
    const h = histByBio.get(LABEL_FIX.bioguide);
    const stillCurrent = legByBio.get(LABEL_FIX.bioguide);
    const seatNow = [...senate.byBio.values()].filter((s) => s.state === LABEL_FIX.state);
    const successor = legByBio.get((bySlug.get(LABEL_FIX.succeededBy) || [])[0] || "");
    const rec = cmp[LABEL_FIX.slug] || null;     // pre-wave, so `from` stays the label we corrected
    const treeRec = nowRoster.cmp[LABEL_FIX.slug] || null;
    const problems = [];
    if (!h) problems.push(`${LABEL_FIX.bioguide} is not in legislators-historical.json`);
    if (stillCurrent) problems.push(`${LABEL_FIX.bioguide} is STILL in legislators-current.json — he has not left the seat`);
    if (!rec) problems.push(`there is no '${LABEL_FIX.slug}' record in CMP_DATA to correct`);
    if (seatNow.some((s) => s.bioguide === LABEL_FIX.bioguide)) {
      problems.push(`the Senate's own roster still seats ${LABEL_FIX.bioguide}`);
    }
    if (!successor) problems.push(`the declared successor '${LABEL_FIX.succeededBy}' is not a sitting senator`);
    if (problems.length) {
      fatal.push(`the ${LABEL_FIX.slug} label correction cannot be verified: ${problems.join("; ")}`);
      return null;
    }
    const term = h.end;                                  // 2026-03-23
    const endMonth = String(term).slice(0, 7);           // 2026-03
    return {
      ...LABEL_FIX,
      who: h.name,
      kind: "identity_label_correction",
      isMerge: false,
      isDeletion: false,
      aliasWritten: false,
      termStart: String(h.start).slice(0, 7),
      termEnd: endMonth,
      termEndedOn: term,
      klass: senate.byBio.get((bySlug.get(LABEL_FIX.succeededBy) || [])[0])?.klass || null,
      from: { office: rec.office, state: rec.state },
      // The seat label stays the BARE state name, the way gaetz reads "Florida", and the
      // Class II end date lives in termEnd rather than in the label. compare-hub.js's
      // _getBrowseLocation() groups a "·"-joined state label by its LAST segment, so
      // writing the class into `state` would move this published file out of Oklahoma
      // and into a browse group named after a date.
      to: {
        office: `Former ${OFFICE.senate}`,
        state: house.stateFull.get(LABEL_FIX.state),
        termStart: String(h.start).slice(0, 7),
        termEnd: endMonth,
        seatLabelNote: `Class II through ${term}; carried by termEnd, not by the state label, ` +
          `because compare-hub.js groups a "·"-joined state label by its last segment.`,
      },
      preserved: ["score", "kept", "broken", "pending", "issues", "icon", "party", "name",
        "every stance row", "every attributed vote"],
      applied: !!treeRec && treeRec.office === `Former ${OFFICE.senate}` && !!treeRec.termEnd,
      // Proof the correction changed only the label. Anything else moving here is the
      // one failure mode this whole entry exists to rule out.
      preservedInTree: !treeRec || !rec ? null : {
        score: treeRec.score === rec.score,
        issues: JSON.stringify(treeRec.issues) === JSON.stringify(rec.issues),
        name: treeRec.name === rec.name,
        party: treeRec.party === rec.party,
        icon: treeRec.icon === rec.icon,
        counters: treeRec.kept === rec.kept && treeRec.broken === rec.broken &&
          treeRec.pending === rec.pending,
      },
      currentSeatFlag:
        `termEnd marks a former office (voter-hub-location.js) and is the field ballot-breakdown.js reads for ` +
        `"is this an incumbent" (!!termStart && !termEnd). Adding it makes CMP_DATA agree with ` +
        `db/vr-member-map.json, which has recorded serving119: false since the handover.`,
      oklahomaCurrentSenateFiles: seatNow.map((s) => s.bioguide).sort(),
      reason:
        `Admitting ${LABEL_FIX.succeededBy} to the ${LABEL_FIX.state} Class II seat would otherwise leave Oklahoma the ` +
        `only state with three U.S. Senator files. ${h.name}'s Senate term ended ${term} (legislators-historical.json) ` +
        `and the Senate's own roster now seats his successor, so the "U.S. Senator · Oklahoma" label on his file is ` +
        `stale rather than contested. Corrected in place on R1's ${LABEL_FIX.precedent} precedent — R1 fixed an ` +
        `existing file's office rather than minting a parallel one. NOT a merge: two different living people, two ` +
        `files, no alias between them, and nothing judged is touched.`,
    };
  })();

  if (fatal.length) {
    console.error(`✗ ${fatal.length} identity claim(s) do not hold. Nothing was written.`);
    for (const f of fatal) console.error(`    ${f}`);
    process.exit(1);
  }

  const doc = {
    _comment:
      "Federal roster wave R2 census — the twelve slugs that were in db/vr-member-map.json (so their votes already " +
      "attached) and had no CMP_DATA row (so nothing in the app could name them, and gen-crawl-record.mjs reported " +
      "them as 'seeded pid on no roster record'). Identity only: name, office, seat, party chip. score is null " +
      "because nothing has been measured — a 0 is a claim and null is the absence of one. Regenerate with " +
      "scripts/vr-federal-roster-r2-census.mjs; scripts/test-vr-federal-roster-r2.mjs holds this file and the " +
      "working tree to each other. Every admission is verified twice by documents that can disagree, and the " +
      "written non-merges are the near-collisions this wave deliberately did NOT fold together.",
    wave: WAVE,
    congress: house.congress,
    builtBy: "scripts/vr-federal-roster-r2-census.mjs",
    source: {
      house: MEMBERDATA_URL,
      senate: SENATE_URL,
      legislators: LEG_URL,
      legislatorsHistorical: LEG_HIST_URL,
      appRoster: "cmp-data.js + spotlights-data.js",
      slugClaim: "db/vr-member-map.json + BROWSE_PHOTOS (compare-hub.js) + SEED_SLUGS (scripts/vr-gen-member-map.mjs)",
    },
    census: {
      scope: SCOPE.length,
      admitted: admitted.length,
      alreadyHadARow: alreadyHadARow.length,
      refused: refused.length,
      house: admitted.filter((a) => a.chamber === "house").length,
      senate: admitted.filter((a) => a.chamber === "senate").length,
      withPhoto: admitted.filter((a) => !!a.photo).length,
      photoCarriesBioguide: admitted.filter((a) => a.photo && a.photo.carriesBioguide).length,
      handTypedOnly: admitted.filter((a) => a.handTypedBioguide && !a.portraitBioguide).length,
      writtenNonMerges: nonMerges.length,
      labelCorrections: fix ? 1 : 0,
    },
    rosterSizeBefore: Object.keys(cmp).length,
    rosterSizeAfter: Object.keys(cmp).length + admitted.length,
    rosterSizeInTree: Object.keys(nowRoster.cmp).length,
    waveApplied: Object.keys(nowRoster.cmp).length === Object.keys(cmp).length + admitted.length &&
      admitted.every((a) => !!nowRoster.cmp[a.slug]),
    photoHosts: [...new Set(admitted.filter((a) => a.photo).map((a) => a.photo.host))].sort(),
    admitted,
    alreadyHadARow,
    refused,
    nonMerges,
    labelCorrection: fix,
  };

  const json = JSON.stringify(doc, null, 2) + "\n";

  if (check) {
    const have = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
    if (have !== json) {
      console.error(`✗ db/vr-federal-roster-r2-census.json is not what this script would write now.`);
      process.exit(1);
    }
    console.log(`✓ db/vr-federal-roster-r2-census.json is current (${admitted.length} admitted)`);
    return;
  }

  writeFileSync(OUT, json);
  console.log(`✓ db/vr-federal-roster-r2-census.json — ${admitted.length} admitted, ` +
    `${alreadyHadARow.length} already had a row, ${refused.length} refused`);
  console.log(`  house ${doc.census.house} · senate ${doc.census.senate} · ` +
    `photos ${doc.census.withPhoto}/${admitted.length} on ${doc.photoHosts.join(", ")}`);
  console.log(`  ${nonMerges.length} written non-merge(s): ` +
    nonMerges.map((n) => `${n.slug} ≠ ${n.notTheSamePersonAs.map((x) => x.pid).join("/")}`).join("; "));
  if (fix) console.log(`  1 label correction: ${fix.slug} → "${fix.to.office} · ${fix.to.state}" (not a merge)`);
  console.log(`  roster ${doc.rosterSizeBefore} → ${doc.rosterSizeAfter} · ` +
    `tree has ${doc.rosterSizeInTree} (${doc.waveApplied ? "wave applied" : "wave NOT yet applied"})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
