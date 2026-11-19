// ─────────────────────────────────────────────────────────────────────────────
// generators.mjs — the registry of committed-output generators that have a
// `--check` mode and need nothing but the repo to run
// ─────────────────────────────────────────────────────────────────────────────
// scripts/check-generators.mjs walks this list. Each entry is an existing
// generator, run exactly as its own header documents:
//
//   node scripts/<script> --check   exit 0 = current, exit 1 = stale
//   node scripts/<script>           rewrite its committed output
//
// Nothing about a generator's logic lives here — only its name, so the runner
// can find it, and the ORDER it runs in. Order matters because some generators
// read another's output (gen-seat-holders reads the district-board plan,
// build-raw-ingest-full-roster reads seat-holders, gen-sitemap reads bill-docs
// and the board pages). Upstream first; the runner still loops until a whole
// pass is clean, so a missed edge costs one extra pass, not a wrong file.
//
// LEFT OUT ON PURPOSE (their --check needs input files that are not in the repo,
// e.g. FEC bulk downloads or a saved listing page):
//   gen-aipac-pac.mjs       --pas2 <itpas2.txt> --legislators <json>
//   gen-aipac-tracker.mjs   --listing <html> --as-of YYYY-MM-DD
//   gen-funding.mjs         --pas2 … --cm … --legislators … (the same FEC files)
//   vr-gen-member-map.mjs   has a --check, but it reads the congress-legislators
//                           dataset over the network when no local copy sits
//                           next to it, and without that dataset it skips the
//                           portrait identity cross-check. Run offline it would
//                           pass a map it never cross-checked, so it stays a
//                           by-hand step (db/vr-member-map.json is reviewed on
//                           purpose — a wrong bioguide mis-attributes votes).
// The pull stages of gen-committees.mjs and gen-cosponsorships.mjs (--fetch)
// read the network and are not run here; their derive stages ARE registered,
// because those read only committed files.
// And generators with no --check mode at all (gen-hero-*, gen-issue-keys, …):
// there is no way to ask them "stale?" without writing, so they are not run.
//
// Adding a generator: give it a --check that exits 1 when stale and is offline
// and deterministic, then add it here in dependency order.
// ─────────────────────────────────────────────────────────────────────────────

export const GENERATORS = [
  // Bill record → bill documents, pages, indexes.
  { script: "gen-bill-docs.mjs" },
  { script: "gen-bill-pages.mjs" },
  { script: "gen-formal-index.mjs" },
  { script: "gen-same-text.mjs" },
  { script: "gen-reader-rationale.mjs" },
  // Stance / person derived tables.
  { script: "gen-person-directional-keys.mjs" },
  // The share index (db/share-index.json) is read by the stance-name table,
  // the raw-ingest rotation builders and the share-preview edge, so it runs
  // ahead of all of them.
  { script: "gen-share-index.mjs" },
  { script: "gen-stance-person-names.mjs" },
  { script: "gen-spotlight-index.mjs" },
  { script: "gen-aipac-tracker-pages.mjs" },
  // Roster → seat files → boards → seat holders.
  { script: "gen-roster-seats.mjs" },
  // Logs what the seat files changed (the /changes feed's roster lane).
  { script: "gen-roster-changes.mjs" },
  { script: "gen-roster-names.mjs" },
  { script: "gen-district-boards.mjs" },
  { script: "gen-seat-holders.mjs" },
  { script: "gen-pdx-return.mjs" },
  // Person-file coverage tables (derive stages; read the roster and db/).
  { script: "gen-committees.mjs" },
  { script: "gen-cosponsorships.mjs" },
  // Raw-ingest rotation inputs (read seat-holders and the roster).
  { script: "build-raw-ingest-pool-expansion-2026-11.mjs" },
  { script: "build-raw-ingest-official-cited-2026-11.mjs" },
  { script: "build-raw-ingest-direct-cited-2026-11.mjs" },
  { script: "build-raw-ingest-legislature-directory-2026-11.mjs" },
  { script: "build-raw-ingest-full-roster-2026-11.mjs" },
  // Last: the sitemap reads the bill pages and the board pages above.
  { script: "gen-sitemap.mjs" },
];
