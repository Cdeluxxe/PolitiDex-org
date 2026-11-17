#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// build-raw-ingest-direct-cited-2026-11.mjs
//
// The trusted inputs for the raw-ingest URL resolver's step 4 (own sites and
// directly tied sources — netlify/lib/raw-ingest-resolve.mjs resolveDirect),
// written to db/raw-ingest-direct-cited-2026-11.json so the cron never loads
// the multi-megabyte front-end data files.
//
//   · politicians — for each politician, the pages ALREADY CITED for them in
//     the curated stance data (politician-stances*.js and the state-senate
//     stance waves, `source.url`), spotlight items (spotlight-cards-data.js,
//     `source.url` / `media.url`) and accountability items
//     (acct-spotlight-data.js, `source.url`), kept only when recognizeDirect()
//     reads the page as their own campaign / personal site, a caucus page
//     naming them, their own YouTube channel or video, or an interview /
//     statement naming them. `keys` = the scored issue keys the site cites the
//     page for; `tags` / `interview` = the spotlight item's own markers.
//   · shared_hosts — hosts of kept own-site pages that the site cites (any
//     page) for more than one politician: never an own site.
//   · shared_urls — kept pages the site cites for more than one politician:
//     never attached.
//
// Identity (name, office) for the recognizer comes from the site roster
// (db/share-index.json) and, for board-seat holders with no entry there, from
// the full rotation roster (db/raw-ingest-full-roster-2026-11.json) — the same
// identities the engine matches on.
//
// Nothing is fetched and no URL is built: every entry is copied verbatim from
// a site file. The clean-match checks (same name elsewhere, shared host / URL,
// already on another row, retired) and the decision to attach happen in the
// engine.
//
// `--check` exits non-zero when the committed file is out of date.
//
//   node scripts/build-raw-ingest-direct-cited-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { identityOf, recognizeDirect, normUrl } from "../netlify/lib/raw-ingest-resolve.mjs";
import { hasRulesFor } from "../netlify/lib/stance-score-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "db/raw-ingest-direct-cited-2026-11.json");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const host = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };

const SHARE = read("db/share-index.json");
const people = { ...(SHARE.people || {}) };
for (const r of read("db/raw-ingest-full-roster-2026-11.json").politicians || []) {
  if (r.board_seat && !people[r.politician_id]) people[r.politician_id] = { n: r.name, o: r.office, s: r.state_listed || r.state };
}
const ALIAS = SHARE.personAliases || {};
const canon = (p) => ALIAS[p] || p;

const FILES = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js",
  ...fs.readdirSync(root).filter((f) => /^state-senate-stances(?:-w\d+)?\.js$/.test(f)).sort(),
  "spotlight-cards-data.js", "acct-spotlight-data.js"].filter((f) => fs.existsSync(path.join(root, f)));
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx);

// Every cited page per politician: normUrl → { url, label, keys, tags, interview }.
const citedBy = new Map();
const cite = (rawPid, url, label, key, item) => {
  if (!rawPid || !url || !/^https?:\/\//i.test(url)) return;
  const pid = canon(rawPid);
  const by = citedBy.get(pid) || citedBy.set(pid, new Map()).get(pid);
  const n = normUrl(url);
  const e = by.get(n) || by.set(n, { url, label: String(label || ""), keys: [], tags: [], interview: false }).get(n);
  if (key && hasRulesFor(key) && !e.keys.includes(key)) e.keys.push(key);
  for (const t of item?.tags || []) if (!e.tags.includes(t)) e.tags.push(t);
  if (item?.interview) e.interview = true;
};
for (const g of ["ISSUE_STANCE_DATA", "SPOTLIGHT_DATA", "ACCT_SPOTLIGHT"]) {
  for (const [pid, list] of Object.entries(ctx.window[g] || {})) for (const s of Array.isArray(list) ? list : []) {
    cite(pid, s?.source?.url, s?.source?.label, s?.issueKey, s);
    cite(pid, s?.media?.url, s?.media?.label, s?.issueKey, s);
  }
}

// Hosts and URLs cited (any page) for more than one politician.
const hostPids = new Map(), urlPids = new Map();
for (const [pid, by] of citedBy) for (const [n, e] of by) {
  const h = host(e.url);
  if (h) (hostPids.get(h) || hostPids.set(h, new Set()).get(h)).add(pid);
  (urlPids.get(n) || urlPids.set(n, new Set()).get(n)).add(pid);
}

const politicians = {};
const ownHosts = new Set();
const kept = [];
for (const pid of [...citedBy.keys()].sort()) {
  const id = identityOf(pid, people[pid]);
  if (!id) continue;
  const list = [...citedBy.get(pid).values()].map((e) => ({ e, rec: recognizeDirect(e, id) })).filter((x) => x.rec)
    .sort((a, b) => a.e.url.localeCompare(b.e.url));
  if (!list.length) continue;
  politicians[pid] = list.map(({ e }) => ({ url: e.url, ...(e.label ? { label: e.label } : {}), keys: e.keys,
    ...(e.tags.length ? { tags: e.tags } : {}), ...(e.interview ? { interview: true } : {}) }));
  for (const { e, rec } of list) { kept.push(e.url); if (rec.source_class === "own_site") ownHosts.add(host(e.url)); }
}
const shared_hosts = [...ownHosts].filter((h) => (hostPids.get(h)?.size || 0) > 1).sort();
const shared_urls = [...new Set(kept)].filter((u) => (urlPids.get(normUrl(u))?.size || 0) > 1).sort();

const doc = {
  _note: "Trusted inputs for the raw-ingest URL resolver's step 4 (netlify/lib/raw-ingest-resolve.mjs resolveDirect). Generated by scripts/build-raw-ingest-direct-cited-2026-11.mjs. `politicians`: pages already cited for each politician in the curated stance data, spotlight items and accountability items that recognizeDirect() reads as their own campaign / personal site, a caucus page naming them, their own YouTube channel or video, or an interview / statement naming them (`keys` = scored issue keys cited; `tags` / `interview` = the spotlight item's markers). `shared_hosts`: own-site hosts the site cites for more than one politician (never attached). `shared_urls`: those pages cited for more than one politician (never attached). Every URL is copied verbatim from a site file; nothing is fetched or built.",
  sources: FILES,
  summary: {
    politicians: Object.keys(politicians).length,
    pages: Object.values(politicians).reduce((n, l) => n + l.length, 0),
    shared_hosts: shared_hosts.length,
    shared_urls: shared_urls.length,
  },
  shared_hosts,
  shared_urls,
  politicians,
};
const text = JSON.stringify(doc, null, 1) + "\n";
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== text) { console.error(`${path.relative(root, OUT)} is out of date — run node scripts/build-raw-ingest-direct-cited-2026-11.mjs`); process.exit(1); }
  console.log(`${path.relative(root, OUT)} is current`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`direct cited pages: ${JSON.stringify(doc.summary)} → ${path.relative(root, OUT)}`);
}
