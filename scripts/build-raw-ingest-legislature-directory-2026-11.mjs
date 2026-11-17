#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// build-raw-ingest-legislature-directory-2026-11.mjs
//
// The state legislature member directories the raw-ingest URL resolver uses
// for its step 3 (netlify/lib/raw-ingest-resolve.mjs resolveLegislature).
// Writes db/raw-ingest-legislature-directory-2026-11.json.
//
// SCOPE. Only states that already have district boards for legislative seats
// on the site (SEAT_HOLDERS *-statehouse-* / *-statesenate-*), and only where
// the repo already holds the legislature's OWN member directory:
//
//   · UT — the Utah Legislature's member IDs, printed names and chambers as
//     le.utah.gov prints them on its bill pages (sponsors and floor sponsors in
//     db/bill-record.json, fetched from the official record). A member's
//     chamber is the one in their most recent session (members who moved from
//     the House to the Senate are Senate members).
//
// Other board states are reported as skipped with the reason: the repo holds
// their chamber rosters (names and districts) but no per-member page address.
//
// MEMBER PAGES. Each chamber's member-page address pattern is accepted only
// when the site ALREADY cites member pages on that pattern and every cited one
// names a member of that chamber in the directory (`confirmed_by`). A pattern
// with no cited example, or one that disagrees with the directory, is left
// out — so no address shape is invented here. Nothing is fetched.
//
// PORTRAIT CHECK. Where the site shows a politician's official legislature
// portrait (Utah: le.utah.gov/images/legislator/<ID>.jpg in cmp-data.js), its
// member ID is recorded (`portrait_ids`). The resolver refuses a match whose
// directory ID differs from it; it never resolves anyone from a portrait.
//
// `--check` exits non-zero when the committed file is out of date.
//
//   node scripts/build-raw-ingest-legislature-directory-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEAT_HOLDERS } from "../netlify/lib/seat-holders.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "db/raw-ingest-legislature-directory-2026-11.json");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));

// Site files that cite member pages (searched verbatim for the patterns below).
const CITING = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "spotlight-cards-data.js",
  "acct-spotlight-data.js", "cmp-data.js", "netlify/lib/raw-ingest-source-types.mjs"].filter((f) => fs.existsSync(path.join(root, f)));
const SITE_TEXT = CITING.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");

const boardStates = [...new Set(Object.keys(SEAT_HOLDERS).filter((k) => /-state(?:house|senate)-/.test(k)).map((k) => k.split("-")[0].toUpperCase()))].sort();

const SESSION_ORDER = (s) => Number(String(s).slice(0, 4)) || 0;

/** Utah: member IDs from the le.utah.gov bill records. */
function utahMembers() {
  const rec = read("db/bill-record.json");
  const by = new Map();
  for (const [key, doc] of Object.entries(rec.records || {})) {
    const session = key.split("|")[0];
    if (!/^\d{4}GS$/.test(session)) continue; // Utah general sessions only (federal records are keyed by Congress)
    for (const sp of doc.sp || []) {
      if (!/^[A-Z]{3,9}$/.test(String(sp.id || "")) || !/^[HS]$/.test(sp.h)) continue;
      const cur = by.get(sp.id);
      if (!cur || SESSION_ORDER(session) > SESSION_ORDER(cur.session) || (session === cur.session && sp.n.length > cur.name.length)) {
        by.set(sp.id, { id: sp.id, name: sp.n, chamber: sp.h === "S" ? "senate" : "house", session });
      }
    }
  }
  return [...by.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const DIRECTORIES = {
  UT: {
    source: "db/bill-record.json — sponsors as le.utah.gov prints them on the official bill pages (fetched by scripts/fetch-bill-record.mjs)",
    members: utahMembers,
    // The site's own legislature portraits (cmp-data.js photo on le.utah.gov)
    // name a member ID per roster id: used only to REFUSE a match that names a
    // different ID, never to make one.
    portrait: /https:\/\/le\.utah\.gov\/images\/legislator\/([A-Z]{3,9})\.jpg/,
    member_page: {
      house: { template: "https://house.utleg.gov/rep/{id}/", re: /https:\/\/house\.utleg\.gov\/rep\/([A-Z]{3,9})\// },
      senate: { template: "https://senate.utah.gov/sen/{id}/", re: /https:\/\/senate\.utah\.gov\/sen\/([A-Z]{3,9})\// },
    },
  },
};

const states = {};
const skipped = {};
const problems = [];
for (const st of boardStates) {
  const cfg = DIRECTORIES[st];
  if (!cfg) { skipped[st] = "board seats exist, but the repo holds no official per-member page directory for this legislature"; continue; }
  const members = cfg.members();
  const byId = new Map(members.map((m) => [m.id, m]));
  const member_page = {}, confirmed_by = {};
  for (const [chamber, p] of Object.entries(cfg.member_page)) {
    const cited = [...new Set([...SITE_TEXT.matchAll(new RegExp(p.re.source, "g"))].map((m) => m[0]))].sort();
    const agree = cited.filter((u) => byId.get(p.re.exec(u)[1])?.chamber === chamber);
    const disagree = cited.filter((u) => !agree.includes(u));
    // A cited page whose ID is absent from the directory is a member the bill
    // sample does not reach; a cited page whose ID sits in the other chamber
    // contradicts the directory.
    const contradict = disagree.filter((u) => byId.has(p.re.exec(u)[1]));
    if (contradict.length) problems.push(`${st} ${chamber}: cited pages disagree with the directory chamber: ${contradict.join(", ")}`);
    if (!agree.length) { skipped[`${st} ${chamber}`] = "no cited member page on this pattern agrees with the directory"; continue; }
    member_page[chamber] = p.template;
    confirmed_by[chamber] = agree;
  }
  const portrait_ids = {};
  if (cfg.portrait) {
    const cmp = fs.readFileSync(path.join(root, "cmp-data.js"), "utf8");
    for (const m of cmp.matchAll(/^ "([a-z0-9_]+)": \{([\s\S]*?)^ \}/gm)) {
      const hit = cfg.portrait.exec(m[2]);
      if (hit) portrait_ids[m[1]] = hit[1];
    }
  }
  states[st] = { source: cfg.source, member_page, confirmed_by, ...(cfg.portrait ? { portrait_ids: Object.fromEntries(Object.entries(portrait_ids).sort()) } : {}), members };
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }

const doc = {
  _note: "State legislature member directories for the raw-ingest URL resolver's step 3 (netlify/lib/raw-ingest-resolve.mjs resolveLegislature). Generated by scripts/build-raw-ingest-legislature-directory-2026-11.mjs. Scope: states with legislative district boards on the site whose own member directory is already in the repo. `members` = the legislature's member ID, printed name and chamber (latest session). `member_page` = the chamber's member-page address, accepted only because the member pages in `confirmed_by` are already cited on the site and agree with the directory. `portrait_ids` = the member ID in each roster politician's official legislature portrait on the site, used only to refuse a match naming a different ID. `skipped` = board states (or chambers) with no usable directory, and why. Nothing is fetched.",
  board_states: boardStates,
  summary: Object.fromEntries(Object.entries(states).map(([st, d]) => [st, { members: d.members.length, house: d.members.filter((m) => m.chamber === "house").length, senate: d.members.filter((m) => m.chamber === "senate").length, chambers_with_pages: Object.keys(d.member_page) }])),
  skipped,
  states,
};
const text = JSON.stringify(doc, null, 1) + "\n";
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== text) { console.error(`${path.relative(root, OUT)} is out of date — run node scripts/build-raw-ingest-legislature-directory-2026-11.mjs`); process.exit(1); }
  console.log(`${path.relative(root, OUT)} is current`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`legislature directory: ${JSON.stringify(doc.summary)} · skipped ${Object.keys(skipped).length} → ${path.relative(root, OUT)}`);
}
