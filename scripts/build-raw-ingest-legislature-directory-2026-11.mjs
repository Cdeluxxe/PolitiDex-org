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
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { SEAT_HOLDERS } from "../netlify/lib/seat-holders.mjs";
import { sameName, directoryName } from "../netlify/lib/raw-ingest-resolve.mjs";
import { EXTRA_SOURCES, NEW_SOCIAL_ROSTER } from "../netlify/lib/raw-ingest-source-types.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "db/raw-ingest-legislature-directory-2026-11.json");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));

// Site files that cite member pages (searched verbatim for the patterns below).
const CITING = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "spotlight-cards-data.js",
  "acct-spotlight-data.js", "cmp-data.js", "netlify/lib/raw-ingest-source-types.mjs",
  // The state-senate stance waves (they extend window.ISSUE_STANCE_DATA).
  ...fs.readdirSync(root).filter((f) => /^state-senate-stances(?:-w\d+)?\.js$/.test(f)).sort()].filter((f) => fs.existsSync(path.join(root, f)));
const SITE_TEXT = CITING.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");

// Who each cited URL is cited FOR (roster ids), from the same site files read
// as data: a cited member page only confirms a pattern when the directory
// member at that address is the person the site cites it for.
const vctx = { window: {} };
vm.createContext(vctx);
for (const f of CITING.filter((x) => x.endsWith(".js"))) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), vctx);
const URL_RE = /https?:\/\/[^\s"'<>)\\]+/g;
const citedFor = new Map();
const cite = (pid, obj) => { for (const u of JSON.stringify(obj ?? "").match(URL_RE) || []) (citedFor.get(u) || citedFor.set(u, new Set()).get(u)).add(pid); };
for (const g of ["ISSUE_STANCE_DATA", "SPOTLIGHT_DATA", "ACCT_SPOTLIGHT", "CMP_DATA"]) for (const [pid, v] of Object.entries(vctx.window[g] || {})) cite(pid, v);
for (const x of EXTRA_SOURCES) cite(x.politician_id, x.url);
for (const x of NEW_SOCIAL_ROSTER) cite(x.politician_id, x.official?.url);
const CMP = vctx.window.CMP_DATA || {};
const SHARE_DOC = read("db/share-index.json");
const SHARE = SHARE_DOC.people || {};
const ALIAS = SHARE_DOC.personAliases || {};
// A cited item can be filed under an alias id; its name comes from the id it resolves to.
const personName = (pid) => CMP[pid]?.name || SHARE[pid]?.n || CMP[ALIAS[pid]]?.name || SHARE[ALIAS[pid]]?.n || "";

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

// Members read from the legislature's own listing (db/legislature-listings-2026-11.json,
// written by scripts/fetch-legislature-listings-2026-11.mjs).
const LISTINGS = fs.existsSync(path.join(root, "db/legislature-listings-2026-11.json")) ? read("db/legislature-listings-2026-11.json") : { listings: {} };
const listed = (st) => () => (LISTINGS.listings[st]?.members || []).map(({ id, name, chamber, url }) => ({ id, name, chamber, session: LISTINGS.fetched_on, ...(url ? { url } : {}) }));
const listedSource = (st) => `${(LISTINGS.listings[st]?.sources || []).join(", ")} — the legislature's own member listing, read ${LISTINGS.fetched_on} (db/legislature-listings-2026-11.json)`;

// Why a board state has no directory (recorded under `skipped`).
const NO_DIRECTORY = {
  TX: "the Texas House member listing (house.texas.gov/members) is rendered by script, so no member links can be read from it; no Texas Senate member page is cited on the site",
  NY_senate: "the New York Senate member listing (nysenate.gov) refuses automated requests (HTTP 403)",
  PA_house: "no Pennsylvania House member page is cited on the site",
  RI: "the Rhode Island Senate member listing (rilegislature.gov/senators) is rendered by script, so no member links can be read from it; no Rhode Island House member page is cited on the site",
};
const NOT_CITED = "board seats exist, but the site cites no member page on this legislature's own host, so no member-page pattern can be confirmed";

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
  VT: {
    source: listedSource("VT"),
    members: listed("VT"),
    // Member pages are /people/single/<biennium>/<PersonID>; the site cites a
    // 2024 page, the listing is the 2026 biennium, so addresses use 2026.
    member_page: {
      house: { template: "https://legislature.vermont.gov/people/single/2026/{id}", re: /https:\/\/legislature\.vermont\.gov\/people\/single\/\d{4}\/(\d+)(?=["'\s)\]]|$)/ },
      senate: { template: "https://legislature.vermont.gov/people/single/2026/{id}", re: /https:\/\/legislature\.vermont\.gov\/people\/single\/\d{4}\/(\d+)(?=["'\s)\]]|$)/ },
    },
  },
  NY: {
    source: listedSource("NY"),
    members: listed("NY"),
    member_page: {
      house: { template: "https://nyassembly.gov/mem/{id}", re: /https:\/\/nyassembly\.gov\/mem\/([A-Z][A-Za-z0-9-]+)(?=["'\s)\]\/]|$)/ },
    },
  },
  PA: {
    source: listedSource("PA"),
    members: listed("PA"),
    // The listing links each senator's own page (/senate/members/bio/<id>/<slug>);
    // the site cites one by the same ID with another slug. Addresses are the
    // listing's own (`url`), never built.
    member_page: {
      senate: { template: "{url}", re: /https:\/\/www\.palegis\.us\/senate\/members\/bio\/(\d+)\/[a-z0-9-]+/ },
    },
  },
  FL: {
    source: listedSource("FL"),
    members: listed("FL"),
    member_page: {
      senate: { template: "https://www.flsenate.gov/Senators/{id}", re: /https:\/\/www\.flsenate\.gov\/Senators\/(S\d+)(?=["'\s)\]]|$)/ },
    },
  },
};

const states = {};
const skipped = {};
const problems = [];
for (const st of boardStates) {
  const cfg = DIRECTORIES[st];
  if (!cfg) { skipped[st] = NO_DIRECTORY[st] || NOT_CITED; continue; }
  for (const ch of ["house", "senate"]) if (NO_DIRECTORY[`${st}_${ch}`]) skipped[`${st} ${ch}`] = NO_DIRECTORY[`${st}_${ch}`];
  const members = cfg.members();
  const byId = new Map(members.map((m) => [m.id, m]));
  const member_page = {}, confirmed_by = {};
  for (const [chamber, p] of Object.entries(cfg.member_page)) {
    const cited = [...new Set([...SITE_TEXT.matchAll(new RegExp(p.re.source, "g"))].map((m) => m[0]))].sort();
    // A cited page agrees when the directory member at its ID sits in this
    // chamber AND is the person the site cites the page for. A cited page whose
    // ID is absent from the directory is a member it does not reach (neutral).
    const idOf = (u) => p.re.exec(u)[1];
    const owners = (u) => [...(citedFor.get(u) || citedFor.get(u.replace(/\/$/, "")) || citedFor.get(u + "/") || [])];
    // Owners with no name on the site cannot be compared and are left out.
    const samePerson = (u) => { const m = byId.get(idOf(u)); return owners(u).map(personName).filter(Boolean).every((n) => sameName(directoryName(m.name), n)); };
    const agree = cited.filter((u) => byId.get(idOf(u))?.chamber === chamber && samePerson(u));
    const contradict = cited.filter((u) => byId.has(idOf(u)) && !agree.includes(u) && (byId.get(idOf(u)).chamber === chamber || !cfg.member_page[byId.get(idOf(u)).chamber]));
    if (contradict.length) {
      skipped[`${st} ${chamber}`] = `cited member page(s) disagree with the directory: ${contradict.map((u) => `${u} is cited for ${owners(u).join("/") || "?"} but the directory lists ${byId.get(idOf(u)).name} (${byId.get(idOf(u)).chamber})`).join("; ")}`;
      continue;
    }
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
  if (!Object.keys(member_page).length) { skipped[st] = skipped[st] || "no chamber's member-page pattern could be confirmed"; }
  states[st] = { source: cfg.source, member_page, confirmed_by, ...(cfg.portrait ? { portrait_ids: Object.fromEntries(Object.entries(portrait_ids).sort()) } : {}), members };
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }

const doc = {
  _note: "State legislature member directories for the raw-ingest URL resolver's step 3 (netlify/lib/raw-ingest-resolve.mjs resolveLegislature). Generated by scripts/build-raw-ingest-legislature-directory-2026-11.mjs. Scope: states with legislative district boards on the site whose own member directory is in the repo (Utah: the le.utah.gov bill records; others: the legislature's own member listing, db/legislature-listings-2026-11.json). `members` = the legislature's member ID, printed name and chamber (latest session). `member_page` = the chamber's member-page address, accepted only because the member pages in `confirmed_by` are already cited on the site and agree with the directory (same chamber, and the directory member is the person the site cites the page for). `portrait_ids` = the member ID in each roster politician's official legislature portrait on the site, used only to refuse a match naming a different ID. `skipped` = board states (or chambers) with no usable directory, and why. Nothing is fetched.",
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
