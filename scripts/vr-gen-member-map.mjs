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
// Annotation (name/chamber/state/party, "serving in the 119th") is best-effort: if
// legislators-current.json is present next to this script or fetchable, members[] is
// enriched for human review. The map itself never depends on it.
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
const LEG_LOCAL = join(dirname(fileURLToPath(import.meta.url)), "legislators-current.json");
const LEG_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json";

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
function fromBrowsePhotos() {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  const open = html.indexOf("var BROWSE_PHOTOS = {");
  if (open === -1) throw new Error("BROWSE_PHOTOS map not found in index.html");
  const close = html.indexOf("\n    };", open);
  const body = html.slice(open, close === -1 ? undefined : close);
  const re =
    /([a-z0-9_]+):\s*'https:\/\/raw\.githubusercontent\.com\/unitedstates\/images\/gh-pages\/congress\/450x550\/([A-Z][0-9]+)\.jpg'/g;
  const out = {};
  let m;
  while ((m = re.exec(body))) out[m[1]] = m[2];
  return out;
}

// ── Optional annotation dataset ───────────────────────────────────────────────
async function loadLegislators() {
  try {
    if (existsSync(LEG_LOCAL)) return JSON.parse(readFileSync(LEG_LOCAL, "utf8"));
    const r = await fetch(LEG_URL);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function buildMap() {
  const slugToBio = { ...fromBrowsePhotos() };
  for (const [slug, bio] of Object.entries(SEED_SLUGS)) slugToBio[slug] = bio;

  // Invert to bioguide → slug, detecting any Bioguide claimed by two slugs.
  const map = {};
  const collisions = [];
  for (const [slug, bio] of Object.entries(slugToBio)) {
    if (map[bio] && map[bio] !== slug) collisions.push(`${bio}: ${map[bio]} vs ${slug}`);
    map[bio] = slug;
  }
  if (collisions.length) throw new Error("Bioguide collisions:\n  " + collisions.join("\n  "));
  return map;
}

async function annotate(map, leg) {
  const byBio = new Map();
  if (leg) {
    for (const p of leg) {
      const t = p.terms[p.terms.length - 1];
      byBio.set(p.id.bioguide, {
        name: p.name.official_full || `${p.name.first} ${p.name.last}`,
        chamber: t.type === "sen" ? "senate" : "house",
        state: t.state,
        party: t.party,
      });
    }
  }
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
        serving119: !!a, // present in legislators-current ⇒ currently seated
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const check = process.argv.includes("--check");
const map = buildMap();
const leg = await loadLegislators();
const members = await annotate(map, leg);
const serving = members.filter((m) => m.serving119).length;

const doc = {
  _comment:
    "bioguide -> roster slug for the Voting Record ingest. Regenerate with scripts/vr-gen-member-map.mjs. " +
    "The ingest reads `.map`; `members` is for human review only.",
  count: Object.keys(map).length,
  serving119: serving,
  annotated: !!leg,
  map,
  members,
};
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
}
