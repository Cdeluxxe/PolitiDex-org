#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// build-raw-ingest-official-cited-2026-11.mjs
//
// The trusted inputs for the raw-ingest URL resolver's step 2 (and the
// Congress.gov URLs the site already cites for step 1), written to
// db/raw-ingest-official-cited-2026-11.json so the every-minute cron never has
// to load the multi-megabyte front-end data files.
//
//   · politicians — for each person on the site roster (db/share-index.json),
//     the pages ALREADY CITED for them in the curated stance data
//     (politician-stances*.js, `source.url`) and spotlight items
//     (spotlight-cards-data.js, `source.url` / `media.url`), kept only when
//     recognizeOfficial() (netlify/lib/raw-ingest-resolve.mjs) says the page is
//     clearly their own official or campaign page. `keys` = the scored issue keys
//     the site cites the page for.
//   · shared_hosts — hosts of those pages that the site cites for more than
//     one politician (a page there cannot be told apart, so it never resolves).
//     A state legislature host serves every member, so its pages are compared
//     by URL instead (shared_urls — a page cited for more than one politician).
//   · congress_member_urls — bioguide → the congress.gov/member URL the site
//     already cites for that member (cmp-data.js and the stance data), for the
//     Congress members in db/vr-member-map.json.
//
// Nothing is fetched and no URL is built here: every entry is copied verbatim
// from a site file. The matching, the clean-match checks and the decision to
// attach a page all happen in the engine (resolveRoster).
//
// `--check` exits non-zero when the committed file is out of date.
//
//   node scripts/build-raw-ingest-official-cited-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { identityOf, recognizeOfficial, bioguideOf, normUrl } from "../netlify/lib/raw-ingest-resolve.mjs";
import { hasRulesFor } from "../netlify/lib/stance-score-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "db/raw-ingest-official-cited-2026-11.json");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const host = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };

const people = read("db/share-index.json").people || {};
const members = read("db/vr-member-map.json").members || [];

const ctx = { window: {} };
vm.createContext(ctx);
const STANCE_FILES = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js"].filter((f) => fs.existsSync(path.join(root, f)));
for (const f of [...STANCE_FILES, "spotlight-cards-data.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx);
const STANCES = ctx.window.ISSUE_STANCE_DATA || {};
const SPOTLIGHT = ctx.window.SPOTLIGHT_DATA || {};

// Every cited page per politician: url → { url, label, keys }.
const citedBy = new Map();
const cite = (pid, url, label, key) => {
  if (!pid || !url || !/^https?:\/\//i.test(url)) return;
  const by = citedBy.get(pid) || citedBy.set(pid, new Map()).get(pid);
  const e = by.get(normUrl(url)) || by.set(normUrl(url), { url, label: String(label || ""), keys: [] }).get(normUrl(url));
  // Only issue keys the scorer has rules for (a page files under a scored key).
  if (key && hasRulesFor(key) && !e.keys.includes(key)) e.keys.push(key);
};
for (const [pid, list] of Object.entries(STANCES)) for (const s of Array.isArray(list) ? list : []) cite(pid, s?.source?.url, s?.source?.label, s?.issueKey);
for (const [pid, list] of Object.entries(SPOTLIGHT)) for (const s of Array.isArray(list) ? list : []) {
  cite(pid, s?.source?.url, s?.source?.label, s?.issueKey);
  cite(pid, s?.media?.url, s?.media?.label, s?.issueKey);
}

// Hosts cited for more than one politician (any page).
const hostPids = new Map();
for (const [pid, by] of citedBy) for (const e of by.values()) { const h = host(e.url); if (h) (hostPids.get(h) || hostPids.set(h, new Set()).get(h)).add(pid); }

// Pages cited for more than one politician (by URL).
const urlPids = new Map();
for (const [pid, by] of citedBy) for (const k of by.keys()) (urlPids.get(k) || urlPids.set(k, new Set()).get(k)).add(pid);

const politicians = {};
const recognizedHosts = new Set();
const perUrlHosts = new Set();
for (const pid of Object.keys(people).sort()) {
  const id = identityOf(pid, people[pid]);
  const list = [...(citedBy.get(pid)?.values() || [])].map((e) => ({ e, rec: recognizeOfficial(e.url, id) })).filter((x) => x.rec)
    .sort((a, b) => a.e.url.localeCompare(b.e.url));
  if (!list.length) continue;
  politicians[pid] = list.map(({ e }) => ({ url: e.url, ...(e.label ? { label: e.label } : {}), keys: e.keys }));
  // A legislature host serves every member (the page path names the person),
  // so those pages are told apart by URL; every other host by host.
  for (const { e, rec } of list) (rec.source_class === "state_legislature" ? perUrlHosts : recognizedHosts).add(host(e.url));
}
const shared_hosts = [...recognizedHosts].filter((h) => !perUrlHosts.has(h) && (hostPids.get(h)?.size || 0) > 1).sort();
const shared_urls = Object.values(politicians).flat().map((e) => e.url)
  .filter((u, i, a) => a.indexOf(u) === i && (urlPids.get(normUrl(u))?.size || 0) > 1).sort();

// Congress.gov member URLs the site already cites, by bioguide.
const bios = new Set(members.map((m) => m.bioguide));
const congress_member_urls = {};
const TEXT = ["cmp-data.js", ...STANCE_FILES].map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
for (const m of TEXT.matchAll(/https:\/\/(?:www\.)?congress\.gov\/member\/[a-z0-9-]+\/[A-Z]\d{6}/g)) {
  const b = bioguideOf(m[0]);
  if (b && bios.has(b) && !congress_member_urls[b]) congress_member_urls[b] = m[0];
}

const doc = {
  _note: "Trusted inputs for the raw-ingest URL resolver (netlify/lib/raw-ingest-resolve.mjs). Generated by scripts/build-raw-ingest-official-cited-2026-11.mjs. `politicians`: pages already cited for each site-roster politician in the curated stance data and spotlight items that recognizeOfficial() reads as clearly their own official / campaign page (`keys` = issue keys cited). `shared_hosts`: hosts of those pages cited for more than one politician (never resolved; legislature hosts, which serve every member, are compared by URL instead). `shared_urls`: those pages cited for more than one politician (never resolved). `congress_member_urls`: congress.gov/member URLs already cited on the site, by bioguide ID. Every URL is copied verbatim from a site file; nothing is fetched or built.",
  summary: {
    politicians: Object.keys(politicians).length,
    pages: Object.values(politicians).reduce((n, l) => n + l.length, 0),
    shared_hosts: shared_hosts.length,
    shared_urls: shared_urls.length,
    congress_member_urls: Object.keys(congress_member_urls).length,
  },
  shared_hosts,
  shared_urls,
  congress_member_urls: Object.fromEntries(Object.entries(congress_member_urls).sort(([a], [b]) => a.localeCompare(b))),
  politicians,
};
const text = JSON.stringify(doc, null, 1) + "\n";
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== text) { console.error(`${path.relative(root, OUT)} is out of date — run node scripts/build-raw-ingest-official-cited-2026-11.mjs`); process.exit(1); }
  console.log(`${path.relative(root, OUT)} is current`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`official cited pages: ${JSON.stringify(doc.summary)} → ${path.relative(root, OUT)}`);
}
