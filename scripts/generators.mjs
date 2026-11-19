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
  { script: "gen-stance-person-names.mjs" },
  { script: "gen-spotlight-index.mjs" },
  { script: "gen-aipac-tracker-pages.mjs" },
  // Roster → seat files → boards → seat holders.
  { script: "gen-roster-seats.mjs" },
  { script: "gen-roster-names.mjs" },
  { script: "gen-district-boards.mjs" },
  { script: "gen-seat-holders.mjs" },
  { script: "gen-pdx-return.mjs" },
  // Raw-ingest rotation inputs (read seat-holders and the roster).
  { script: "build-raw-ingest-pool-expansion-2026-11.mjs" },
  { script: "build-raw-ingest-official-cited-2026-11.mjs" },
  { script: "build-raw-ingest-direct-cited-2026-11.mjs" },
  { script: "build-raw-ingest-legislature-directory-2026-11.mjs" },
  { script: "build-raw-ingest-full-roster-2026-11.mjs" },
  // Last: the sitemap reads the bill pages and the board pages above.
  { script: "gen-sitemap.mjs" },
];
