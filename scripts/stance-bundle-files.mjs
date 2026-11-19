// ─────────────────────────────────────────────────────────────────────────────
// stance-bundle-files.mjs — the stance chunks every generator reads, in one list
// ─────────────────────────────────────────────────────────────────────────────
// The person file loads every chunk below (person.html and index.html, with
// `defer`), and each one only ADDS entries to window.ISSUE_STANCE_DATA. A
// generator that reads fewer chunks than the page loads sees fewer stances than
// a reader does: the sitemap used to read three of these eighteen, so the state
// senators whose cited positions live only in the wave files cleared the floor
// in the browser and were missing from sitemap.xml. One list, imported by
// gen-sitemap.mjs, gen-share-index.mjs and the sitemap floor test, so a crawler,
// a share card and a reader count the same stances.
//
// politician-stances.js is deliberately ABSENT: it is the retired ~1.1 MB
// monolith that scripts/split-stances.mjs divided into the first two chunks.
// gen-share-index.mjs checks this list against index.html's script tags.
export const STANCE_FILES = [
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  ...Array.from({ length: 15 }, (_, i) => `state-senate-stances-w${i + 2}.js`),
];
