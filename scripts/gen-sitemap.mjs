#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-sitemap.mjs — publish an address for every record that earns one
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS WRITES
//
//   sitemap.xml   the front door, the Issue Spotlights, one /p/<pid> entry per
//                 person file that clears the publication floor, one
//                 /b/<sitting>/<number> entry per bill that has an address the
//                 app can actually open, and one /i/<key> entry per issue key
//                 that has something on file to read
//   robots.txt    points crawlers at that sitemap and at nothing else — one
//                 Sitemap: line, which is why the bills ride in this file rather
//                 than in a second one nothing links to
//
// WHY A GENERATOR AND NOT A HAND-WRITTEN FILE
//
// Because the floor has to be the app's floor. A sitemap written by hand — or
// generated from "every id in the roster" — would have advertised all 757
// records, including the 148 that carry no cited position at all, and the app
// would then have greeted those arrivals with the "still being built" notice
// profiles-full.js prints for a thin profile. An index entry that lands on
// "still being built" is the same silent lie as a /vote/ link that quietly
// shows the front page.
//
// So this script does not implement a floor. It LOADS the app's floor —
// publication-floor.js, the same file the person-file kicker reads in the
// browser — in a VM alongside the same three data sources the app reads, and asks
// it. If the floor changes, the sitemap changes with it, and there is no second
// copy of the rule to drift.
//
// THE BILLS, AND WHY THEY CAN BE LISTED NOW
//
// This file used to say that no measure page could be advertised, because the
// measure set lives in the database behind /api/voting-record rather than in a
// data file. That was half right. The rows are in the database — and every one of
// them got there through an `INSERT INTO vr_measures` in netlify/database/
// migrations/*.sql, which IS in the repo. scripts/vr-measure-addresses.mjs reads
// those migrations in applied order and rebuilds the identity half of the table,
// then keeps only the rows that can carry an address and open onto something:
// a printed number, a sitting, a citable source_url, and a real title, an issue
// mapping or a formal act on file. Same shape of promise the person floor makes,
// against the same kind of evidence.
//
// The address it publishes is /b/<sitting>/<number> with the number spelled
// exactly as the row prints it — /b/119/H.R.%206644, not /b/119/hr-6644. That is
// not a style preference: getMeasureRef() in netlify/functions/voting-record.mts
// matches `number` exactly, so a slug resolves to nothing, and a sitemap of
// slugs would be a file of addresses that answer 404 at the edge and post "that
// link didn’t resolve to a measure we could load" in the browser.
//
// WHAT IS DELIBERATELY NOT IN HERE
//
//   · No roll-call pages. /vote/<congress>/<chamber>/<roll> is a real,
//     server-visible address, and unlike a bill it cannot be enumerated from the
//     repo: the rolls the ingest cron pulls in arrive without a migration, so any
//     list of them would be a guess dressed as a promise. A roll call is also
//     reachable from the bill it belongs to, which IS now listed, so nothing in
//     the archive is left without a path in.
//   · No measure the migrations do not carry. Rows the live ingest added at
//     runtime are missing from the bill list, and that is the honest cost of not
//     reading the database at build time: it loses a crawl, not the truth.
//   · No /locker address. It resolves and it is one page, but it is a workspace,
//     not a record, and this file lists records.
//   · No lastmod dates. This script has no honest source for when a record last
//     changed — the roster carries no timestamp — and a lastmod that is really
//     "when the generator last ran" is a fabricated freshness signal.
//   · No priority or changefreq. Both are advisory, widely ignored, and would
//     amount to this repo ranking its own records, which is not a thing it does.
//
// USAGE
//   node scripts/gen-sitemap.mjs            # write sitemap.xml + robots.txt
//   node scripts/gen-sitemap.mjs --check    # exit 1 if either is stale
//   node scripts/gen-sitemap.mjs --report   # what cleared, what did not, why
//
// To confirm the bill addresses actually resolve against the live resolver, run
// scripts/vr-audit-bill-addresses.mjs. That check is a separate script on purpose:
// this generator must stay offline and deterministic so --check means "the
// committed file matches the repo" and nothing else.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import vm from "node:vm";
import { measureAddresses, billPath } from "./vr-measure-addresses.mjs";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const REPORT = process.argv.includes("--report");

// The single public origin: the www host, which is the one Google has indexed and
// the one the apex 301s to. The apex form is NOT a second address this file may
// emit — a sitemap listing a host that redirects hands every crawler a hop it did
// not need and invites the two forms to compete as duplicates of each other.
// Hardcoded rather than read from an env var: a sitemap is a published claim about
// one site, and a sitemap that changes hostname with the environment is a sitemap
// that can ship a preview URL to a search engine.
//
// ONE HOST, ONE FILE. This constant also builds the single `Sitemap:` line in
// robots.txt below, so the crawl entry point and the addresses inside it cannot
// drift onto different hosts, and there is still exactly one sitemap host.
export const ORIGIN = "https://www.politidex.fyi";

const SITEMAP = path.join(ROOT, "sitemap.xml");
const ROBOTS = path.join(ROOT, "robots.txt");

// ── The limits the sitemap protocol sets on one file ────────────────────────
// 50,000 URLs and 50 MB uncompressed. Today this file holds ~1,160 URLs in ~75
// KB, so it is two orders of magnitude clear on both counts and a single
// sitemap.xml is the honest shape: one file, one Sitemap: line in robots.txt,
// nothing indirected through an index that exists only in case.
//
// What happens at the limit is a decision, so it is written down rather than
// left to whoever hits it. Splitting into sitemap-people.xml + sitemap-bills.xml
// behind a sitemap index is the correct remedy, and it is not built yet, because
// untested split machinery that has never emitted a file is a worse guarantee
// than a build that stops and says which half to cut. So the generator refuses
// to write an over-limit file: an invalid sitemap is silently ignored by
// crawlers wholesale, which would cost every address in it, including the /p/
// entries that work today.
const MAX_URLS = 50000;
const MAX_BYTES = 50 * 1024 * 1024;

// ── Load the app's own modules and data, in a browser-shaped sandbox ─────────
// Same technique the audit scripts in this directory use. The sandbox is a bare
// `window` because that is all these five files touch: publication-floor.js is
// pure logic over three globals, and the data files are `Object.assign(window.X,
// {...})` blobs or a single IIFE that registers one.
//
// formal-index.js is in the list because the floor's third door reads it. Leave
// it out and this generator would silently publish a smaller sitemap than the
// app's own kicker believes in — the exact drift the shared-module arrangement
// exists to make impossible. It is generated by scripts/gen-formal-index.mjs and
// its own --check runs in the same suite, so a stale count fails loudly there
// rather than quietly here.
function loadApp() {
  const sandbox = { window: {}, console };
  sandbox.window.window = sandbox.window;
  const ctx = vm.createContext(sandbox);
  for (const f of [
    "cmp-data.js",
    "politician-stances-core.js",
    "politician-stances-ext.js",
    "formal-index.js",
    "publication-floor.js",
  ]) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) throw new Error(`gen-sitemap: missing ${f}`);
    new vm.Script(fs.readFileSync(p, "utf8"), { filename: f }).runInContext(ctx);
  }
  const F = sandbox.window.PDXPublicationFloor;
  if (!F) throw new Error("gen-sitemap: publication-floor.js did not export PDXPublicationFloor");
  return { floor: F, roster: sandbox.window.CMP_DATA || {}, stances: sandbox.window.ISSUE_STANCE_DATA || {} };
}

// ── The issue keys, and which of them have an address worth advertising ─────
// /i/<key> is the issue file: what the key covers, and who has a formal record
// on it. Two independent things can put content on that page, and a key needs
// only one of them to be worth a crawl:
//
//   · A LOCKED BOUNDARY. issue-scope.js carries the scope the curators argued
//     out for the key — what is in, what is out, what a count on it means —
//     transcribed from the comment block over the key in alignment-tool.js. A
//     key with no argued boundary reads "No definition on file yet.", which is
//     an honest thing for a reader who arrived to see and a thin thing to invite
//     a crawler to. So `defined` is the test, not mere presence in the table.
//   · AT LEAST ONE FORMAL MAPPING. A key that some measure in the migrations is
//     mapped to has a record to show even with no boundary written yet, because
//     the page's second half is the roll of who advanced it and who cut against.
//
// AND THE KEY MUST RESOLVE. Both lists are filtered through the app's own test
// for a shipped issue — present in ISSUE_MAP with a label or a chip, which is
// exactly what door1-workspace.js's shippedIssue() asks before it will open one.
// Two keys the migrations map ('crypto', 'defense') are legacy spellings that no
// longer resolve, and publishing them would be this file recommending a page
// that greets the reader with nothing. Same rule as the person floor: the
// sitemap advertises what opens.
//
// THE ADDRESS IS ASKED, NOT SPELLED. pdx-issue-family.js owns the /i/ string for
// every module in the product, and this generator is not an exception to that —
// it loads the module and calls profileUrl(), so a change to the address shape
// cannot leave the sitemap behind pointing at the old one.
//
// A HEAVIER SANDBOX THAN loadApp()'s, AND ONLY HERE. alignment-tool.js is a UI
// module that touches `document` while it registers ISSUE_MAP, so this list
// borrows makeSandbox() — the same browser-shaped stub the test suite boots the
// app in — rather than teaching loadApp()'s bare `window` to fake a DOM. Still
// offline, still deterministic, still no network: --check keeps meaning "the
// committed file matches the repo".
const ISSUE_FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "pdx-issue-family.js",
  "issue-scope.js",
];
function loadIssueWorld() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ISSUE_FILES) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) throw new Error(`gen-sitemap: missing ${f}`);
    new vm.Script(fs.readFileSync(p, "utf8"), { filename: f }).runInContext(ctx);
  }
  const map = win.ISSUE_MAP;
  const scope = win.PDXIssueScope;
  const family = win.PDXIssueFamily;
  if (!map) throw new Error("gen-sitemap: alignment-tool.js did not register ISSUE_MAP");
  if (!scope) throw new Error("gen-sitemap: issue-scope.js did not export PDXIssueScope");
  if (!family || typeof family.profileUrl !== "function") {
    throw new Error("gen-sitemap: pdx-issue-family.js did not export profileUrl");
  }
  return { map, scope, family };
}
function issueAddresses(mappedKeys) {
  const { map, scope, family } = loadIssueWorld();
  const shipped = (k) => !!(map[k] && (map[k].label || map[k].chip));
  const scoped = Object.keys(scope.SCOPE || {})
    .filter((k) => { const r = scope.read(k); return !!(r && r.defined); });
  const mapped = (mappedKeys || []);
  const listed = [];
  const refused = [];
  for (const k of [...new Set([...scoped, ...mapped])].sort()) {
    if (!shipped(k)) { refused.push(k); continue; }
    listed.push({
      key: k,
      url: family.profileUrl(k),
      scope: scoped.indexOf(k) !== -1,
      formal: mapped.indexOf(k) !== -1,
    });
  }
  return { listed, refused, scoped: scoped.length, mapped: mapped.length };
}

// ── Issue Spotlight slugs ───────────────────────────────────────────────────
// These live in the repo, in spotlights-data.js, which is a single
// Object.assign of `'<slug>': { slug: '<slug>', … }` entries. Read by pattern
// rather than by executing the module: it is 1.2 MB and reaches for far more of
// the app than a sandbox should have to fake.
//
// A slug is only accepted when it appears BOTH as a `slug:` value and as a
// registry key — `'<slug>': {`. That double requirement is what keeps a nested
// `slug:` reference (one Spotlight citing another) from being published as an
// address of its own, which is the failure a single pattern would produce.
function spotlightSlugs() {
  const p = path.join(ROOT, "spotlights-data.js");
  if (!fs.existsSync(p)) return [];
  const src = fs.readFileSync(p, "utf8");
  const declared = new Set();
  for (const m of src.matchAll(/\bslug:\s*['"]([a-z0-9][a-z0-9-]{2,})['"]/g)) declared.add(m[1]);
  const keyed = new Set();
  for (const m of src.matchAll(/^\s*['"]([a-z0-9][a-z0-9-]{2,})['"]:\s*\{/gm)) keyed.add(m[1]);
  return [...declared].filter((s) => keyed.has(s)).sort();
}

function xmlEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// ── The document ────────────────────────────────────────────────────────────
function buildSitemap(urls) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<!-- Generated by scripts/gen-sitemap.mjs. Do not edit by hand — regenerate.",
    "     Person files appear here only if they clear PDXPublicationFloor: identity",
    "     (name, office, state) plus at least two positions carrying a source URL,",
    "     or one such position and a tracked promise, or two measures with a sourced",
    "     formal act on file (a roll call or a committee vote). A record below that floor has",
    "     an address that works and is deliberately not advertised, because the page",
    "     it opens says so itself: there is not yet enough cited content to arrive at.",
    "",
    "     Bill files appear as /b/<sitting>/<number>, the sitting being a Congress",
    "     (119) or a Utah session (2025GS), and the number spelled exactly as the",
    "     record prints it — the resolver behind /b/ matches it literally, so a",
    "     tidier slug would be an address that 404s. A bill is listed only if the",
    "     migrations that created it give it a number, a sitting, a citable source",
    "     and something to read: a real title, an issue mapping, or a formal act. -->",
    "",
    // A SECOND COMMENT, NOT A LONGER ONE. The paragraph above ended with the
    // closing marker, and moving that marker down to make room here would show up
    // as a REMOVED line in the generated document — which is what the federal
    // waves' sitemap check reads to prove a regeneration only ever adds addresses.
    // The floor below is a new thing to say, so it says it in its own comment.
    "<!-- Issue files appear as /i/<key> for every issue key that has either a",
    "     boundary on file — the scope the curators argued out for it, transcribed",
    "     into issue-scope.js — or at least one measure in the migrations mapped to",
    "     it. A key with neither would open onto a definition that does not exist",
    "     yet and a record of nobody, so it is not advertised. Keys are listed in",
    "     their canonical spelling only; an alias resolves to the same page and is",
    "     not a second address. -->",
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const u of urls) lines.push(`  <url><loc>${xmlEscape(ORIGIN + u)}</loc></url>`);
  lines.push("</urlset>");
  return lines.join("\n") + "\n";
}

function buildRobots() {
  return [
    "# PolitiDex — crawl rules.",
    "#",
    "# Everything public is allowed. The two exclusions below are not records and",
    "# have no reason to be indexed: /.netlify/ is the platform's own function and",
    "# image endpoints, and /api/ is JSON the app fetches for itself.",
    "#",
    "# Note what is NOT excluded and also not listed in the sitemap: person files",
    "# below the publication floor. Their /p/<pid> addresses resolve, and a reader",
    "# who has one may follow it. They are simply not advertised — the sitemap is a",
    "# recommendation, and recommending a record that opens onto \"still being",
    "# built\" is the thing the floor exists to prevent. Disallowing them would be a",
    "# different and wronger claim: that the record should not be read at all.",
    "#",
    "# Generated by scripts/gen-sitemap.mjs. Do not edit by hand — regenerate.",
    "User-agent: *",
    "Allow: /",
    "Disallow: /.netlify/",
    "Disallow: /api/",
    "",
    `Sitemap: ${ORIGIN}/sitemap.xml`,
    "",
  ].join("\n");
}

// ── Run ─────────────────────────────────────────────────────────────────────
const { floor, roster } = loadApp();
const ids = Object.keys(roster);
const publishable = floor.publishable();
const excluded = ids.filter((id) => !floor.clears(id));

const bills = measureAddresses(ROOT);
const issues = issueAddresses(bills.issueKeys);

// PERSON URLS ARE UNTOUCHED BY THIS. The issue entries are appended after the
// bills rather than interleaved anywhere, so adding them cannot move, rename or
// drop a single /p/<pid> line — the person half of this file is the same list in
// the same order it was before issue files had an address.
const urls = [
  "/",
  ...spotlightSlugs().map((s) => `/issue/${s}`),
  ...publishable.map((pid) => `/p/${pid}`),
  ...bills.published.map(billPath),
  ...issues.listed.map((i) => i.url),
];

// Two addresses reaching the same page would be this file recommending a record
// twice, and it would mean the enumerator had a collision it did not notice.
const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
if (dupes.length) throw new Error(`gen-sitemap: duplicate urls: ${[...new Set(dupes)].slice(0, 5).join(", ")}`);

const sitemap = buildSitemap(urls);
const robots = buildRobots();

if (urls.length > MAX_URLS || Buffer.byteLength(sitemap) > MAX_BYTES) {
  console.error(
    `gen-sitemap: ${urls.length} urls / ${Buffer.byteLength(sitemap)} bytes exceeds the ` +
    `single-sitemap limit (${MAX_URLS} urls / ${MAX_BYTES} bytes). A sitemap over the ` +
    `limit is discarded whole by crawlers, so nothing was written. Split into a ` +
    `sitemap index (sitemap-people.xml + sitemap-bills.xml) before adding more.`
  );
  process.exit(1);
}

if (REPORT) {
  const why = {};
  for (const id of excluded) {
    for (const r of floor.read(id).reasons) why[r] = (why[r] || 0) + 1;
  }
  console.log(`roster            ${ids.length}`);
  console.log(`publishable       ${publishable.length}`);
  console.log(`below the floor   ${excluded.length}  ${JSON.stringify(why)}`);
  console.log(`spotlights        ${spotlightSlugs().length}`);
  console.log(`sitemap entries   ${urls.length}`);
  console.log(`floor             >=${floor.MIN_CITED_POSITIONS} cited positions, or 1 + a tracked promise, or >=${floor.MIN_CITED_POSITIONS} measures with a sourced formal act`);
  const byFormal = publishable.filter((pid) => {
    const r = floor.read(pid);
    return r.formal >= floor.MIN_CITED_POSITIONS && r.cited < floor.MIN_CITED_POSITIONS &&
           !(r.cited >= 1 && r.promises > 0);
  });
  console.log(`  via formal only   ${byFormal.length}`);

  const bySitting = {};
  for (const a of bills.published) bySitting[a.sitting] = (bySitting[a.sitting] || 0) + 1;
  const byVia = {};
  for (const a of bills.published) byVia[a.via] = (byVia[a.via] || 0) + 1;
  const byReason = {};
  for (const r of bills.refused) for (const reason of r.reasons) byReason[reason] = (byReason[reason] || 0) + 1;
  console.log("");
  console.log(`bills listed      ${bills.published.length}  ${JSON.stringify(bySitting)}`);
  console.log(`  cleared via       ${JSON.stringify(byVia)}`);
  console.log(`bills refused     ${bills.refused.length}  ${JSON.stringify(byReason)}`);
  console.log(`migrations read   ${bills.stats.files} files, ${bills.stats.inserts} measure inserts, ${bills.stats.unparsed} unparsed`);
  console.log("");
  console.log(`issue files       ${issues.listed.length} listed`);
  console.log(`  boundary on file  ${issues.listed.filter((i) => i.scope).length}`);
  console.log(`  formal mapping    ${issues.listed.filter((i) => i.formal).length}`);
  console.log(`  both              ${issues.listed.filter((i) => i.scope && i.formal).length}`);
  console.log(`  keys refused      ${issues.refused.length}  ${JSON.stringify(issues.refused)}`);
  console.log(`limits            ${urls.length}/${MAX_URLS} urls, ${Buffer.byteLength(sitemap)}/${MAX_BYTES} bytes`);
}

if (CHECK) {
  const stale = [];
  if (!fs.existsSync(SITEMAP) || fs.readFileSync(SITEMAP, "utf8") !== sitemap) stale.push("sitemap.xml");
  if (!fs.existsSync(ROBOTS) || fs.readFileSync(ROBOTS, "utf8") !== robots) stale.push("robots.txt");
  if (stale.length) {
    console.error(`stale: ${stale.join(", ")} — run: node scripts/gen-sitemap.mjs`);
    process.exit(1);
  }
  console.log(`sitemap.xml and robots.txt are current (${urls.length} urls)`);
} else if (!REPORT) {
  fs.writeFileSync(SITEMAP, sitemap);
  fs.writeFileSync(ROBOTS, robots);
  console.log(`wrote sitemap.xml (${urls.length} urls) and robots.txt`);
}
