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
// congressional portraits and the roster is 100. For a long time the difference was
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
  const slugToBio = { ...fromBrowsePhotos() };
  for (const [slug, bio] of Object.entries(SEED_SLUGS)) slugToBio[slug] = bio;

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
  return { map, admitted, unadmitted };
}

async function annotate(map, leg, hist) {
  const byBio = new Map();
  const index = (list, serving) => {
    for (const p of list || []) {
      const t = p.terms[p.terms.length - 1];
      if (byBio.has(p.id.bioguide)) continue; // current wins over historical
      byBio.set(p.id.bioguide, {
        name: p.name.official_full || `${p.name.first} ${p.name.last}`,
        chamber: t.type === "sen" ? "senate" : "house",
        state: t.state,
        party: t.party,
        serving,
      });
    }
  };
  index(leg, true);
  index(hist, false);
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

const check = process.argv.includes("--check");
const { map, admitted, unadmitted } = buildMap();
const leg = await loadLegislators();
// Historical is only needed when a mapped member has left Congress, and it is a 13 MB
// file — so it is fetched only if the current dataset left someone unannotated.
const needHist = !!leg && Object.keys(map).some((b) => !leg.some((p) => p.id.bioguide === b));
const hist = needHist ? await loadLegislators(LEG_HIST_LOCAL, LEG_HIST_URL) : null;
const members = await annotate(map, leg, hist);
const serving = members.filter((m) => m.serving119).length;

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
