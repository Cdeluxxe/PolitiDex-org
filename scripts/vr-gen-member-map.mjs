#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — regenerate the bioguide → roster-slug member map
// ─────────────────────────────────────────────────────────────────────────────
// The Phase-7 ingest (netlify/lib/vr-ingest.ts) attributes a Congress.gov roll-call
// vote to a roster figure ONLY when the voter's Bioguide ID resolves through this
// map — an unmapped member is skipped and counted, never guessed, because a wrong
// attribution is worse than a gap.
//
// This script rebuilds db/vr-member-map.json from two authoritative, in-repo
// sources plus (optionally) the public legislators dataset for annotation:
//
//   1. BROWSE_PHOTOS in index.html — every sitting member of Congress the app
//      profiles carries a curated, HTTP-200-verified portrait whose URL embeds the
//      member's Bioguide ID:
//        raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/<BIOGUIDE>.jpg
//      So slug → Bioguide is read straight out of that URL — no name-matching guess.
//
//   2. SEED_SLUGS below — the handful of federal roster figures whose profile photo
//      comes from Firestore rather than BROWSE_PHOTOS (so their Bioguide isn't in an
//      image URL). Each was confirmed by name+state against the authoritative dataset
//      at https://unitedstates.github.io/congress-legislators/legislators-current.json
//      These are the same slugs the curated seed migration uses.
//
// ── Admission is scoped, and that scoping is the point ────────────────────────
// Those two sources answer "whose Bioguide can we read?", which is a much larger set
// than "whom is the ingest scoped to attribute". There are currently 173 curated
// congressional portraits and the roster is 101. For a long time the difference was
// invisible drift: portraits kept being added, this script was not re-run, and the
// committed map silently fell 101 members behind its own generator — which is exactly
// why 37 members with stated positions could never receive a vote no matter how many
// roll calls were ingested.
//
// So the roster ceiling is now stated explicitly in db/vr-roster-admitted.json and
// enforced here in both directions:
//   • a slug admitted there but resolving to no Bioguide is a hard error, caught at
//     generation instead of surfacing later as a member who silently gets no votes;
//   • a portrait not admitted there is reported as unadmitted and attributes nothing.
// Widening the roster is then a reviewable one-line-per-member diff in that file, and
// never an accident of photo curation.
//
// ── And the portrait itself is cross-checked against the name the app publishes ──
// Reading the Bioguide out of a portrait URL removes the name-matching guess, but it
// makes the map exactly as right as the photo. See checkNamesAgree() below for the
// failure that motivates it.
//
// Annotation (name/chamber/state/party, "serving in the 119th") is best-effort: if
// legislators-current.json is present next to this script or fetchable, members[] is
// enriched for human review. The map itself never depends on it. A mapped member who
// is NOT in the current dataset — a former member whose votes are still in the window,
// like Michael Waltz — is looked up in legislators-historical.json so the review block
// shows a name rather than a row of nulls.
//
//   node scripts/vr-gen-member-map.mjs           # rebuild db/vr-member-map.json
//   node scripts/vr-gen-member-map.mjs --check   # verify on-disk file is up to date
//
// After regenerating, an operator may push the map into the vr-config Blobs store
// with scripts/vr-load-member-map.mjs to override the committed fallback at runtime.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "db", "vr-member-map.json");
const ADMITTED = join(ROOT, "db", "vr-roster-admitted.json");
const LEG_LOCAL = join(dirname(fileURLToPath(import.meta.url)), "legislators-current.json");
const LEG_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json";
const LEG_HIST_LOCAL = join(dirname(fileURLToPath(import.meta.url)), "legislators-historical.json");
const LEG_HIST_URL = "https://unitedstates.github.io/congress-legislators/legislators-historical.json";

// Federal roster figures whose portrait is NOT a congress-images URL (Firestore
// photo), so their Bioguide can't be read from BROWSE_PHOTOS. Verified by name+state
// against legislators-current.json. Keep this list in sync when such a figure is added.
const SEED_SLUGS = {
  julie_fedorchak: "F000482", // Julie Fedorchak — Rep, ND-AL
  troy_downing: "D000634",    // Troy Downing — Rep, MT-02
  mike_simpson: "S001148",    // Michael K. Simpson — Rep, ID-02
  mike_flood: "F000474",      // Mike Flood — Rep, NE-01

  // ── The people who run the committees ──────────────────────────────────────
  // The twenty-four House chairs, ranking members and elected leaders the app
  // profiles were all missing from this map, because BROWSE_PHOTOS is a curated
  // shelf rather than a census and the committee gavels were never anyone's turn
  // to add. Twenty-two of them now carry an official congressional portrait there
  // and resolve the ordinary way. These two do not — maloy's curated photo is a
  // bioguide.congress.gov file and neguse's is a Commons upload, so neither URL
  // carries a readable Bioguide and both need naming here.
  maloy: "M001228",           // Celeste Maloy — Rep, UT-02
  neguse: "N000191",          // Joe Neguse — Rep, CO-02
  lujan: "L000570",           // Ben Ray Luján — Sen, NM (Commons portrait, no readable Bioguide)

  // ── The eight thin House files ─────────────────────────────────────────────
  // Federal wave F6 named these eight as the whole thin band of the House set:
  // five or six issues, two acts each, both acts on the same pair of Congressional
  // Review Act resolutions, and ten acts short of the member floor. Every roll in
  // the 119th that could have moved them was unattributable, because none of the
  // eight was in this map — they were SPOTLIGHTS figures with no BROWSE_PHOTOS
  // portrait, so there was no URL to read a Bioguide out of and nobody had named
  // them by hand. That is an attribution gap, not a vocabulary one, and it is the
  // reason a mapping-only wave could not reach them.
  //   The same wave gave all eight a portrait in BROWSE_PHOTOS, because a member who
  // attributes votes can be the subject of an Official Record share card and that card
  // must not open on initials. These entries stay anyway: they are the record of the
  // by-hand verification, and they keep attribution from depending on a curated photo
  // URL. buildMap() now errors if the two sources ever name different people.
  // Each Bioguide below was read from the clerk.house.gov roll XML `name-id`
  // attribute and then verified twice: against legislators-current.json by
  // name+state, and independently by unique surname+state on the same roll (the
  // clerk disambiguates the colliding surnames as "Smith (NE)", "Lee (NV)" and
  // "Nunn (IA)", which is what the second path matches). The state on each line
  // agrees with the district comment on the slug in politician-stances.js.
  adrian_smith: "S001172",           // Adrian Smith — Rep, NE-03
  dina_titus: "T000468",             // Dina Titus — Rep, NV-01
  gabe_vasquez: "V000136",           // Gabe Vasquez — Rep, NM-02
  melanie_stansbury: "S001218",      // Melanie A. Stansbury — Rep, NM-01
  russ_fulcher: "F000469",           // Russ Fulcher — Rep, ID-01
  susie_lee: "L000590",              // Susie Lee — Rep, NV-03
  teresa_leger_fernandez: "L000273",  // Teresa Leger Fernandez — Rep, NM-03
  zach_nunn: "N000193",              // Zachary Nunn — Rep, IA-03

  // ── The three senators no Senate roll could reach ──────────────────────────
  // Federal wave F7 ingested a Senate slice and recorded, rather than fixed, a
  // roster gap: three serving senators were absent from this map, so every Senate
  // roll in the corpus lost the same three rows — 37 unattributable rows per roll
  // once the alumni and the vacancies are counted. F8 admits them.
  //   Each Bioguide below was verified TWICE, and by two independent paths:
  //   1. name + state against legislators-current.json, which gives the Bioguide;
  //   2. the `<lis_member_id>` the Senate's own LIS roll XML records for that
  //      senator, matched against `id.lis` in the same dataset — S438, S395 and
  //      S440 respectively. Path 2 is the one that matters here, because the
  //      Senate resolver keys on (surname, state) off the roll XML and not on a
  //      Bioguide, so the LIS id is what actually connects a slug to a vote.
  //   The bioguides also agree with the ones waves F2 and F3 wrote into their own
  // `unmappedBioguide` arrays when they counted these three as losses.
  //   hyde_smith additionally carries a congress-images portrait, so BROWSE_PHOTOS
  // and this list name her independently and buildMap() cross-checks them. The
  // other two have Commons portraits with no readable Bioguide, which is why their
  // identity is cross-checked through SEED_NAMES below instead.
  jon_husted: "H001104",             // Jon Husted — Sen, OH (LIS S438; appointed 2025-01-21)
  hyde_smith: "H001079",             // Cindy Hyde-Smith — Sen, MS (LIS S395)
  alan_armstrong: "A000383",         // Alan Armstrong — Sen, OK (LIS S440; sworn 2026-03-24)
};

// ── The official-record name for a slug the app publishes no name for ─────────
// checkNamesAgree() below is the wall that catches a portrait pointed at the wrong
// member's Bioguide. It can only fire when it has TWO names to compare: the one the
// authoritative dataset attaches to the Bioguide, and the one the app publishes for
// the slug. For a slug the app publishes no name for, the wall used to go quiet and
// the slug landed in a soft "could not be cross-checked" list — which is exactly the
// slug most likely to be wrong, because nobody has ever seen the name next to it.
//
// The three senators F8 admits are all in that position: they carry stance rows and
// a portrait but no compare card and no spotlight row, so the app publishes no name
// for them. Rather than invent a compare-card bio to satisfy a guard — a fabricated
// score and a fabricated issue list, to check a name — the name is declared here, on
// its own, read off the same official record the Bioguide came from.
//
// This is an identity string, not a profile: name only, no office, no party, no
// score, nothing a reader ever sees. And it is not circular. The wall's job is to
// catch a Bioguide that belongs to someone else, so if `hyde_smith`'s portrait is
// ever repointed at H001104, "Cindy Hyde-Smith" will not match "Husted" and
// generation fails — which is the failure the wall exists for, and which could not
// be detected for these slugs at all before.
//
// An app-published name always wins over an entry here; these are consulted only
// when the app has none. Delete a line the moment the app starts publishing that
// name, so there is one source and not two.
const SEED_NAMES = {
  jon_husted: "Jon Husted",
  hyde_smith: "Cindy Hyde-Smith",
  alan_armstrong: "Alan Armstrong",
};

// ── 1. slug → bioguide from BROWSE_PHOTOS congress portraits ──────────────────
// BROWSE_PHOTOS was declared in an inline <script> in index.html until the
// first-paint pass moved the large inline blocks into external files loaded from
// the same document positions; it now lives in compare-hub.js. Read the document
// TOGETHER WITH the local scripts it loads so the map is found either way — this
// must stay in step with scripts/audit-photo-coverage.mjs, which reads the same
// map the same way.
function fromBrowsePhotos() {
  const index = readFileSync(join(ROOT, "index.html"), "utf8");
  const html = [index, ...[...index.matchAll(/<script[^>]*\bsrc="\/?([^"/][^"]*\.js)"/g)]
    .map((m) => m[1])
    .filter((f, i, a) => a.indexOf(f) === i)
    .map((f) => { try { return readFileSync(join(ROOT, f), "utf8"); } catch { return ""; } })].join("\n");
  const open = html.indexOf("var BROWSE_PHOTOS = {");
  if (open === -1) throw new Error("BROWSE_PHOTOS map not found in index.html or the scripts it loads");
  const close = html.indexOf("\n    };", open);
  const body = html.slice(open, close === -1 ? undefined : close);
  const re =
    /([a-z0-9_]+):\s*'https:\/\/raw\.githubusercontent\.com\/unitedstates\/images\/gh-pages\/congress\/450x550\/([A-Z][0-9]+)\.jpg'/g;
  const out = {};
  let m;
  while ((m = re.exec(body))) out[m[1]] = m[2];
  return out;
}

// ── The admitted roster ───────────────────────────────────────────────────────
// Flattened from db/vr-roster-admitted.json's waves. The wave a slug sits in records
// which pass admitted it, so a slug is never re-homed and the file reads as a history.
function admittedSlugs() {
  const doc = JSON.parse(readFileSync(ADMITTED, "utf8"));
  const out = new Map();
  for (const [wave, slugs] of Object.entries(doc.waves || {})) {
    if (!Array.isArray(slugs)) continue; // `_note` and friends
    for (const s of slugs) {
      if (out.has(s)) throw new Error(`db/vr-roster-admitted.json lists '${s}' in two waves: ${out.get(s)} and ${wave}`);
      out.set(s, wave);
    }
  }
  if (!out.size) throw new Error("db/vr-roster-admitted.json admitted nobody — refusing to write an empty roster");
  return out;
}

// ── Optional annotation dataset ───────────────────────────────────────────────
async function loadLegislators(local = LEG_LOCAL, url = LEG_URL) {
  try {
    if (existsSync(local)) return JSON.parse(readFileSync(local, "utf8"));
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function buildMap() {
  const fromPhotos = fromBrowsePhotos();
  const slugToBio = { ...fromPhotos };
  for (const [slug, bio] of Object.entries(SEED_SLUGS)) slugToBio[slug] = bio;

  // A SEED_SLUGS entry OVERRIDES a portrait, so a slug named in both places has two
  // claims about who it is and only one of them reaches the ingest. That is the
  // King-Hinds failure with the halves swapped: the map would attribute the votes
  // correctly while the share card drew someone else's face, and neither end would
  // look wrong. Federal wave F6 created the first eight overlaps (hand-named for
  // attribution, then given portraits so their share cards do not open on initials),
  // so the two sources are made to agree out loud rather than silently.
  const disagree = Object.entries(SEED_SLUGS)
    .filter(([slug, bio]) => fromPhotos[slug] && fromPhotos[slug] !== bio)
    .map(([slug, bio]) => `${slug}: SEED_SLUGS says ${bio}, its BROWSE_PHOTOS portrait is ${fromPhotos[slug]}`);
  if (disagree.length) {
    throw new Error(
      `${disagree.length} slug(s) are claimed by two different Bioguides. SEED_SLUGS wins for the ingest, ` +
      `so the votes would attribute one way and the face on the share card would be another member:\n  ` +
      disagree.join("\n  "));
  }

  // Scope to the admitted roster, failing on an admitted slug we cannot resolve rather
  // than shipping a member the ingest will silently never attribute a vote to.
  const admitted = admittedSlugs();
  const unresolved = [...admitted.keys()].filter((s) => !slugToBio[s]);
  if (unresolved.length) {
    throw new Error(
      `db/vr-roster-admitted.json admits ${unresolved.length} slug(s) with no readable Bioguide — ` +
      `add a congressional portrait to BROWSE_PHOTOS or an entry to SEED_SLUGS:\n  ` + unresolved.join("\n  "));
  }
  const unadmitted = Object.keys(slugToBio).filter((s) => !admitted.has(s)).sort();

  // Invert to bioguide → slug, detecting any Bioguide claimed by two slugs.
  const map = {};
  const collisions = [];
  for (const [slug, bio] of Object.entries(slugToBio)) {
    if (!admitted.has(slug)) continue;
    if (map[bio] && map[bio] !== slug) collisions.push(`${bio}: ${map[bio]} vs ${slug}`);
    map[bio] = slug;
  }
  if (collisions.length) throw new Error("Bioguide collisions:\n  " + collisions.join("\n  "));
  return { map, admitted, unadmitted, slugToBio };
}

// Bioguide → authoritative identity, current dataset winning over historical. Used both
// to annotate the human-review block and to cross-check the portraits below, so the two
// can never disagree about who a Bioguide is.
function indexByBio(leg, hist) {
  const byBio = new Map();
  const index = (list, serving) => {
    for (const p of list || []) {
      const t = p.terms[p.terms.length - 1];
      if (byBio.has(p.id.bioguide)) continue; // current wins over historical
      byBio.set(p.id.bioguide, {
        name: p.name.official_full || `${p.name.first} ${p.name.last}`,
        last: p.name.last || "",
        chamber: t.type === "sen" ? "senate" : "house",
        state: t.state,
        party: t.party,
        serving,
      });
    }
  };
  index(leg, true);
  index(hist, false);
  return byBio;
}

function annotate(map, byBio) {
  return Object.entries(map)
    .map(([bioguide, slug]) => {
      const a = byBio.get(bioguide);
      return {
        bioguide,
        slug,
        name: a?.name ?? null,
        chamber: a?.chamber ?? null,
        state: a?.state ?? null,
        party: a?.party ?? null,
        serving119: !!a?.serving, // present in legislators-current ⇒ currently seated
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

// ── The name the app itself publishes for a slug ──────────────────────────────
// cmp-data.js and spotlights-data.js are pure `Object.assign(window.X, {…})` data
// modules — no DOM, no side effects — so they evaluate in a bare sandbox, the same way
// scripts/gen-share-index.mjs reads them. CMP_DATA covers the compare roster; the
// SPOTLIGHTS figure rows are walked afterwards because a member can carry a portrait
// and a stance block without a compare card (haley_stevens today), and dropping those
// would leave exactly the kind of unchecked slug this guard exists to catch.
function rosterNames() {
  try {
    const sandbox = { window: {}, document: {}, console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sandbox);
    for (const f of ["cmp-data.js", "spotlights-data.js"]) {
      vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
    }
    const names = new Map();
    for (const [slug, p] of Object.entries(sandbox.window.CMP_DATA || {})) {
      if (p && typeof p.name === "string") names.set(slug, p.name);
    }
    const walk = (node) => {
      if (Array.isArray(node)) return void node.forEach(walk);
      if (!node || typeof node !== "object") return;
      if (typeof node.id === "string" && typeof node.name === "string" && !names.has(node.id)) {
        names.set(node.id, node.name);
      }
      for (const v of Object.values(node)) walk(v);
    };
    walk(sandbox.window.SPOTLIGHTS || {});
    return names.size ? names : null;
  } catch {
    return null;
  }
}

// ── Does each portrait's Bioguide name the person the app profiles? ───────────
// Deriving the map from a portrait URL removes the name-matching guess, but it makes the
// map only as right as the photo. Point one slug's portrait at another member's file and
// that member's entire voting record silently re-homes onto the wrong profile — and
// nothing downstream looks wrong from either end: the profile has a full stance block,
// the votes have a real source URL, they simply belong to different people. That is how
// 27 of Del. Kimberlyn King-Hinds's (K000404) House votes came to be attributed to Rep.
// Mike Kennedy (K000403) and scored against his stated positions on four issues, undone
// in netlify/database/migrations/20260815000000_vr_fix_kennedy_identity_collision.sql.
// The generator had even printed her name into the review block while writing his slug —
// the map was wrong while its own annotation was right, which is the whole tell.
//
// So the authoritative surname for a mapped Bioguide must appear in the name the app
// publishes for that slug. A disagreement on an ADMITTED slug is a hard error: that is a
// live cross-person attribution. On an unadmitted portrait it is a warning, because those
// attribute nothing yet — and admitting one turns this same check into the error.
//
// Best-effort in the same way annotation is: with no legislators dataset there is nothing
// authoritative to compare against, so the check says it was skipped rather than passing
// quietly, and it reports admitted slugs it could not cross-check for the same reason.
const normName = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function checkNamesAgree(slugToBio, admitted, byBio, names) {
  if (!byBio.size || !names) {
    const why = !byBio.size ? "legislators dataset unavailable" : "app roster names unreadable";
    console.warn(`⚠ portrait identity cross-check SKIPPED (${why}) — the map was written without`);
    console.warn("  verifying that each portrait's Bioguide names the person the app profiles");
    return;
  }
  const errors = [];
  const warnings = [];
  const unverified = [];
  const unnamed = [];
  let checked = 0;
  let declared = 0;
  for (const [slug, bio] of Object.entries(slugToBio)) {
    const auth = byBio.get(bio);
    // The app's published name wins; SEED_NAMES is consulted only for a slug the app
    // publishes no name for, so the wall has two names to compare instead of going
    // quiet on exactly the slug nobody has ever seen a name next to.
    const app = names.get(slug) || SEED_NAMES[slug];
    if (app && !names.has(slug)) declared++;
    if (!app && admitted.has(slug)) {
      unnamed.push(`${slug} → ${bio}`);
      continue;
    }
    if (!auth || !app) {
      if (admitted.has(slug)) {
        unverified.push(`${slug} (${bio} not in either legislators dataset)`);
      }
      continue;
    }
    checked++;
    // An app-published name is held to its surname, because the app publishes the name
    // a reader would recognise and the dataset publishes the legal one — "Mike Simpson"
    // against "Michael K. Simpson" is agreement, not a mismatch.
    //   A SEED_NAMES entry is held to the whole name, because it was typed by hand off
    // this same official record and has no reason to differ from it. That strictness is
    // the point: a surname-only compare cannot tell Alan Armstrong (Sen, OK) from Kelly
    // Armstrong (Gov, ND), and those two slugs both exist in this app.
    if (!names.has(slug)) {
      if (normName(app) === normName(auth.name)) continue;
      errors.push(`${slug} → ${bio} is ${auth.name} (${auth.chamber}, ${auth.state}), but SEED_NAMES `
        + `declares "${app}" — a hand-declared name must match the official record exactly`);
      continue;
    }
    if (auth.last && normName(app).includes(normName(auth.last))) continue;
    const row = `${slug} → ${bio} is ${auth.name} (${auth.chamber}, ${auth.state}), but the app profiles "${app}"`;
    (admitted.has(slug) ? errors : warnings).push(row);
  }
  // An admitted slug with no name from either source cannot be cross-checked at all,
  // and an unchecked admitted slug is the one that misattributes a whole voting record
  // in silence. Declare it in SEED_NAMES (identity only) or do not admit it.
  if (unnamed.length) {
    throw new Error(
      `${unnamed.length} admitted slug(s) have no published name and no SEED_NAMES entry, so their ` +
      `portrait Bioguide could not be checked against any name. Add the official-record name to ` +
      `SEED_NAMES in this file before admitting them:\n  ` + unnamed.join("\n  "));
  }
  if (errors.length) {
    throw new Error(
      `${errors.length} admitted slug(s) resolve to a Bioguide belonging to someone else — the ingest ` +
      `would attribute one member's votes to another. Repoint the portrait in BROWSE_PHOTOS (or the ` +
      `SEED_SLUGS entry) at the right Bioguide before regenerating:\n  ` + errors.join("\n  "));
  }
  console.log(`✓ portrait identity cross-check — ${checked} slug(s) agree with their Bioguide`
    + (declared ? ` (${declared} named by SEED_NAMES, the app publishes no name for them)` : ""));
  if (warnings.length) {
    console.warn(`⚠ ${warnings.length} UNADMITTED portrait(s) name a different member. Nothing is attributed`);
    console.warn("  through them today, but admitting one as-is would misattribute that member's votes:");
    for (const w of warnings) console.warn(`    ${w}`);
  }
  if (unverified.length) {
    console.log(`  ${unverified.length} admitted slug(s) could not be cross-checked:`);
    for (const u of unverified) console.log(`    ${u}`);
  }
}

const check = process.argv.includes("--check");
const { map, admitted, unadmitted, slugToBio } = buildMap();
const leg = await loadLegislators();
// Historical is only needed when a mapped member has left Congress, and it is a 13 MB
// file — so it is fetched only if the current dataset left someone unannotated.
const needHist = !!leg && Object.keys(map).some((b) => !leg.some((p) => p.id.bioguide === b));
const hist = needHist ? await loadLegislators(LEG_HIST_LOCAL, LEG_HIST_URL) : null;
const byBio = indexByBio(leg, hist);
const members = annotate(map, byBio);
const serving = members.filter((m) => m.serving119).length;

// Run before anything is written or compared: a map that names the wrong person should
// never reach the file, and --check should fail on one that already has.
checkNamesAgree(slugToBio, admitted, byBio, rosterNames());

// Provenance blocks in the previous file are carried forward: they record how earlier
// waves were staged and reviewed, and regenerating the map is not a reason to lose that.
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

const doc = {
  _comment:
    "bioguide -> roster slug for the Voting Record ingest. Regenerate with scripts/vr-gen-member-map.mjs. " +
    "The ingest reads `map`; `members` is for human review only. Roster scope is db/vr-roster-admitted.json.",
  count: Object.keys(map).length,
  serving119: serving,
  annotated: !!leg,
  unadmittedPortraits: unadmitted.length,
  map,
  members,
};
if (prev._phase12_staged) doc._phase12_staged = prev._phase12_staged;
// Stable, human-diffable output (sorted keys in `map`).
doc.map = Object.fromEntries(Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])));
const json = JSON.stringify(doc, null, 2) + "\n";

if (check) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  // Compare ignoring the (dataset-dependent) annotation so --check is deterministic offline.
  const norm = (s) => JSON.stringify(JSON.parse(s || "{}").map || {});
  if (norm(cur) !== norm(json)) {
    console.error("✗ db/vr-member-map.json is out of date — run: node scripts/vr-gen-member-map.mjs");
    process.exit(1);
  }
  console.log(`✓ member map up to date — ${doc.count} entries (${serving} currently serving)`);
} else {
  writeFileSync(OUT, json);
  console.log(`✓ wrote ${OUT}`);
  console.log(`  ${doc.count} bioguide→slug entries, ${serving} currently serving${leg ? "" : " (annotation dataset unavailable)"}`);
  console.log(`  ${unadmitted.length} curated congressional portrait(s) are NOT admitted to the roster and attribute nothing`);
}
