// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-resolve.mjs — active official-URL resolution for the raw-ingest
// rotation
// ─────────────────────────────────────────────────────────────────────────────
// The full roster put every politician on the site into the rotation, but most
// tier-3 rows joined with no pages, so the planner skipped them. This module
// lets the engine look for official pages ON ITS OWN, from data the repo
// already trusts, and attach them to those rows. Nothing is fetched, searched,
// scraped or guessed here; the module is pure, and raw-ingest-core.mjs passes in
// the trusted data.
//
// WHO. Only a row that has no pages, or only weak ones (see needsResolution),
// on tier 3. A row that already has pages, and every tier-1 / tier-2 row, is
// left exactly as configured.
//
// ORDER. For each such row:
//   1. CONGRESS.GOV MEMBER PAGE. The politician's sitting federal office and
//      state (the site roster, db/share-index.json) are matched against the
//      committed Congress member roster (db/vr-member-map.json: bioguide, name,
//      chamber, state). Stored only on ONE clean match: same chamber, same
//      state, same surname, compatible first name, and the bioguide ID is not
//      claimed by another roster row or another page-less row. The URL is the
//      Congress.gov page the site already cites for that bioguide ID, or the
//      canonical congress.gov/member/<name>/<bioguide> address built from the
//      roster entry. A bioguide whose Congress.gov page was retired is skipped.
//   2. OTHER OFFICIAL SOURCES, only when step 1 found nothing. The pages
//      already cited for this politician on the site (curated stance sources
//      and spotlight items, collected by
//      scripts/build-raw-ingest-official-cited-2026-11.mjs) are kept only when
//      recognizeOfficial() says the page is clearly theirs: their own House /
//      Senate office host, a state legislature page naming them, a governor or
//      statewide office host for the office they hold, or a campaign host that
//      carries their surname. News, aggregators, archives, committee and clerk
//      hosts, retired URLs, hosts (or, on a legislature host, pages) cited for
//      more than one politician, and URLs already on another row are all
//      dropped. Links are never followed.
//   3. STATE LEGISLATURE MEMBER PAGE, only for rows still without pages after
//      steps 1 and 2. A sitting state legislator is matched against the
//      legislature's own member directory (state + chamber + surname +
//      compatible first name, one member only) and given that member's page on
//      the legislature's own site. See resolveLegislature below.
//   Anything without a clean match stays without pages and is still skipped.
//
// Resolved pages are ordinary roster pages: the planner, the pull path, the
// scorer and the Evidence Locker treat them like every other page, and none of
// those modules reads this file. Each carries `resolved_by` ("congress_gov",
// "cited_official" or "legislature_directory") so a resolved page can always
// be told apart.

export const RESOLVE_TIER = 3;
// Pages a row receives from step 2 at most (the planner's per-politician cap
// still applies on top).
export const MAX_RESOLVED_PAGES = 3;
export const DEFAULT_TOPIC = "cost_living";

const STATES = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI",
  minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "american samoa": "AS", guam: "GU", "northern mariana islands": "MP", "puerto rico": "PR",
  "virgin islands": "VI", "district of columbia": "DC",
};
const ABBRS = new Set(Object.values(STATES));

/** Two-letter state code from a site-roster state field ("Florida · FL-04", "Utah", "UT District 5"). */
export function stateCode(s) {
  const txt = String(s || "").trim();
  const code = /\b([A-Z]{2})-(?:\d{1,2}|AL)\b/.exec(txt) || /^([A-Z]{2})\b/.exec(txt);
  if (code && ABBRS.has(code[1])) return code[1];
  return STATES[txt.split("·")[0].trim().toLowerCase()] || null;
}

// A SITTING federal office (candidates and former members never match).
const NOT_SITTING = /\b(?:candidate|former|nominee|elect)\b/i;
const HOUSE_OFFICE = /^(?:U\.S\. Representative|U\.S\. Delegate|Resident Commissioner|Speaker of the U\.S\. House|(?:U\.S\. )?House (?:Majority|Minority) (?:Leader|Whip)|Assistant House .*Leader|House .*(?:Chair|Ranking Member))\b/i;
const SENATE_OFFICE = /^(?:U\.S\. Senator|(?:U\.S\. )?Senate (?:Majority|Minority) (?:Leader|Whip)|Assistant Senate .*Leader|Senate .*(?:Chair|Ranking Member))\b/i;

/** "house" | "senate" | null for a site-roster office string. */
export function federalChamber(office) {
  const o = String(office || "").trim();
  if (!o || NOT_SITTING.test(o)) return null;
  if (HOUSE_OFFICE.test(o)) return "house";
  if (SENATE_OFFICE.test(o)) return "senate";
  return null;
}

// Statewide executive offices (sitting) and the host words that belong to each.
const STATEWIDE = [
  { re: /^(?:Lieutenant Governor|Lt\.? Governor)\b/i, kind: "lt_governor", hosts: /^(?:ltgov|ltgovernor|lg)\.|^[a-z]*ltgov(?:ernor)?\.gov$/ },
  { re: /^Governor\b/i, kind: "governor", hosts: /^(?:governor|gov)\.|^[a-z]{2,}governor\.gov$/ },
  { re: /^Attorney General\b/i, kind: "attorney_general", hosts: /^(?:ag|oag|doj|attorneygeneral)\.|^[a-z]*(?:attorneygeneral|ag)\.gov$/ },
  { re: /^Secretary of State\b/i, kind: "secretary_of_state", hosts: /^(?:sos|sec|secretaryofstate)\.|^[a-z]*sos\.gov$/ },
];
const STATE_LEGISLATOR = /\bState (?:Senator|Representative|Assembly ?(?:[Mm]ember|[Ww]oman|[Mm]an)|Delegate)\b|\b(?:Assembly ?(?:[Mm]ember|[Ww]oman|[Mm]an)|Delegate)\b|^UT State|\bState (?:House|Senate) (?:Speaker|President|Majority|Minority)\b|^Speaker of the [A-Z][a-z]+ House\b/;

/** The politician's identity from the site roster entry ({ n, o, s }). */
export function identityOf(pid, person) {
  if (!person) return null;
  const office = String(person.o || "").trim();
  const sitting = !NOT_SITTING.test(office);
  return {
    politician_id: pid,
    name: String(person.n || "").trim(),
    office,
    state: stateCode(person.s),
    chamber: federalChamber(office),
    statewide: sitting ? (STATEWIDE.find((x) => x.re.test(office))?.kind || null) : null,
    state_legislator: sitting && STATE_LEGISLATOR.test(office),
  };
}

// ── Names ───────────────────────────────────────────────────────────────────
const SUFFIX = new Set(["jr", "sr", "ii", "iii", "iv", "v", "md", "phd", "esq"]);
const NICK = [
  ["michael", "mike"], ["robert", "bob", "rob", "bobby"], ["william", "bill", "will", "billy"], ["james", "jim", "jimmy", "jamie"],
  ["thomas", "tom", "tommy"], ["daniel", "dan", "danny"], ["charles", "chuck", "charlie"], ["richard", "rick", "dick", "rich"],
  ["edward", "ed", "ted", "eddie"], ["joseph", "joe", "joey"], ["steven", "steve"], ["stephen", "steve"], ["christopher", "chris"],
  ["benjamin", "ben"], ["timothy", "tim"], ["nicholas", "nick"], ["gregory", "greg"], ["jeffrey", "jeff"], ["andrew", "andy", "drew"],
  ["abraham", "abe"], ["patrick", "pat"], ["ronald", "ron"], ["donald", "don"], ["samuel", "sam"], ["matthew", "matt"],
  ["jacob", "jake"], ["zachary", "zach"], ["katherine", "kate", "kathy", "katie"], ["kathleen", "kathy"], ["elizabeth", "liz", "beth", "betsy"],
  ["jennifer", "jen", "jenn"], ["peter", "pete"], ["anthony", "tony"], ["kenneth", "ken"], ["david", "dave"], ["lawrence", "larry"],
  ["gerald", "jerry"], ["randall", "randy"], ["frederick", "fred"], ["douglas", "doug"], ["raymond", "ray"], ["gerard", "gerry"],
  ["melvin", "mel"], ["deborah", "deb", "debbie"], ["susan", "sue"], ["margaret", "maggie", "peggy"], ["patricia", "pat", "patty"],
  ["christine", "chris"], ["christina", "chris"], ["alexander", "alex"], ["alexandria", "alex"], ["vincent", "vince"],
  ["leonard", "len"], ["harold", "hal"], ["henry", "hank"], ["eugene", "gene"], ["clifford", "cliff"], ["bradley", "brad"],
  ["gabriel", "gabe"], ["joshua", "josh"], ["nathaniel", "nate"], ["nathan", "nate"], ["jonathan", "jon"], ["kimberly", "kim"],
  ["cynthia", "cindy"], ["rebecca", "becca"], ["victoria", "tori"], ["theodore", "ted"], ["albert", "al"], ["alan", "al"],
  ["russell", "russ"], ["mitchell", "mitch"], ["valerie", "val"], ["terrance", "terry"], ["terence", "terry"], ["madeleine", "maddie"],
];
const NICKS = new Map();
for (const group of NICK) for (const a of group) for (const b of group) if (a !== b) (NICKS.get(a) || NICKS.set(a, new Set()).get(a)).add(b);

/** Lowercase name tokens: accents, quoted nicknames, punctuation, initials and suffixes removed. */
export function nameTokens(name) {
  return String(name || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/["“”][^"“”]*["“”]|\([^)]*\)/g, " ")
    .toLowerCase().replace(/[^a-z\s-]/g, " ").replace(/-/g, " ")
    .split(/\s+/).filter((t) => t.length > 1 && !SUFFIX.has(t));
}

const firstCompatible = (a, b) => a === b || NICKS.get(a)?.has(b) || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a)));

/** Same person by name: same surname (last token, or a shared multi-word surname) and a compatible first name. */
export function sameName(a, b) {
  const x = nameTokens(a), y = nameTokens(b);
  if (x.length < 2 || y.length < 2) return false;
  if (x[x.length - 1] !== y[y.length - 1]) return false;
  return firstCompatible(x[0], y[0]) || (x.length > 2 && firstCompatible(x[1], y[0])) || (y.length > 2 && firstCompatible(x[0], y[1]));
}

// ── Step 1: Congress.gov ────────────────────────────────────────────────────
const BIOGUIDE = /^[A-Z]\d{6}$/;
const CONGRESS_MEMBER_URL = /^https:\/\/(?:www\.)?congress\.gov\/member\/[a-z0-9-]+\/([A-Z]\d{6})\/?$/;

/** The bioguide ID in a Congress.gov member URL, or null. */
export const bioguideOf = (url) => CONGRESS_MEMBER_URL.exec(String(url || ""))?.[1] || null;

/** Canonical Congress.gov member address for a roster member ({ name, bioguide }). */
export function congressMemberUrl(member, cited = {}) {
  if (!member || !BIOGUIDE.test(String(member.bioguide || ""))) return null;
  if (cited[member.bioguide]) return cited[member.bioguide];
  const slug = nameTokens(member.name).join("-");
  return slug ? `https://www.congress.gov/member/${slug}/${member.bioguide}` : null;
}

/**
 * Step 1 for one identity. `members` = db/vr-member-map.json members;
 * `claimed` = bioguide → pid for rows that already carry that member
 * elsewhere (other roster ids, other page-less rows). Returns
 * { ok: true, member, url } or { ok: false, why }.
 */
export function resolveCongressGov(id, { members = [], aliases = {}, rosterIds = new Set(), retiredBioguides = new Set(), citedMemberUrls = {}, contested = new Set() } = {}) {
  if (!id?.chamber) return { ok: false, why: "no sitting federal office on the site roster" };
  if (!id.state) return { ok: false, why: "no state on the site roster" };
  const hits = members.filter((m) => m.chamber === id.chamber && m.state === id.state && sameName(m.name, id.name));
  if (!hits.length) return { ok: false, why: `no ${id.chamber} member from ${id.state} named ${id.name}` };
  if (hits.length > 1) return { ok: false, why: `${hits.length} ${id.chamber} members from ${id.state} match ${id.name}` };
  const m = hits[0];
  // The roster slug the member map gives this bioguide must be this row (or an
  // alias of it); a slug that is another roster row means someone else holds it.
  const slug = aliases[m.slug] || m.slug;
  if (slug && slug !== id.politician_id && rosterIds.has(slug)) return { ok: false, why: `bioguide ${m.bioguide} belongs to roster row ${slug}` };
  if (contested.has(m.bioguide)) return { ok: false, why: `bioguide ${m.bioguide} matches more than one roster row` };
  if (retiredBioguides.has(m.bioguide)) return { ok: false, why: `Congress.gov page for ${m.bioguide} was retired` };
  const url = congressMemberUrl(m, citedMemberUrls);
  if (!url) return { ok: false, why: "no usable bioguide ID" };
  return { ok: true, member: m, url };
}

// ── Step 2: other official sources ─────────────────────────────────────────
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
export const normUrl = (u) => {
  try { const x = new URL(u); x.hash = ""; return (x.origin + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase(); }
  catch { return String(u || "").toLowerCase(); }
};
// Hosts that are never the politician's own page (same allowlist spirit as the
// pool builder: news, reference, aggregators, archives, social, chamber tools).
const THIRD_PARTY = /(?:^|\.)(?:ballotpedia\.org|wikipedia\.org|vote411\.org|votesmart\.org|opensecrets\.org|followthemoney\.org|govtrack\.us|youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|medium\.com|substack\.com|apnews\.com|reuters\.com|npr\.org|pbs\.org|c-span\.org|archive\.org|google\.com|bit\.ly|linktr\.ee)$|news|times|post|tribune|herald|gazette|journal|daily|politico|axios|thehill|cnn|foxnews|nbc|cbs|abc|msnbc|bloomberg|wsj|guardian|courier|observer|chronicle|sentinel|register|examiner|patch\.com|kff|brookings|heritage|cato|voterguide|guide|messenger|press|radio|tv\b|online|kuer|kpcw|ksl|kutv|fox\d|deseret|sltrib|standard\.net|dispatch|insider|advance|examiner|independent/;
const NOT_OWN_GOV = /^(?:clerk|budget|appropriations|judiciary|finance|foreign|armed-?services|energy|commerce|help|rules|oversight|homeland|intelligence|democrats|republicans|gop|dems|majorityleader|minorityleader|democraticleader|republicanleader|speaker|whip|history|bioguide|crsreports|www|docs|live|media|library)\./;
const GENERAL_GOV = /(?:^|\.)(?:congress\.gov|govinfo\.gov|federalregister\.gov|archives\.gov|loc\.gov|usa\.gov|whitehouse\.gov|state\.gov|defense\.gov|hhs\.gov|medicare\.gov|senate\.gov|house\.gov)$/;
const MEMBER_OFFICE_HOST = /^([a-z0-9-]+)\.(house|senate)\.gov$/;
const STATE_LEGIS_HOST = /(?:^|\.)(?:[a-z]*leg[a-z]*|legislature|house|senate|assembly|nyassembly|nysenate)\.(?:state\.)?(?:[a-z]{2}\.us|[a-z]+\.gov)$|^(?:[a-z]+\.)?(?:le|leg|legis|legislature)\.[a-z]+\.gov$|^(?:house|senate)\.[a-z]+\.gov$|^[a-z]*(?:legislature|leg|assembly|senate|house)\.gov$|^(?:house|senate)\.utleg\.gov$/;
const GOV_HOST = /\.(?:gov|mil)$|\.state\.[a-z]{2}\.us$/;
const CAMPAIGN_WORD = /(?:for|elect|vote|campaign|team|friends|20\d\d)/;

/** Surname fragments used to tie a host or path to the politician (≥ 4 letters). */
function surnameKeys(name) {
  const t = nameTokens(name);
  if (t.length < 2) return [];
  const last = t[t.length - 1];
  const keys = new Set([last]);
  if (t.length > 2) keys.add(t[t.length - 2] + last);
  if (last.length >= 6) keys.add(last.slice(0, 5));
  return [...keys].filter((k) => k.length >= 4);
}
const letters = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * Is `url` clearly this politician's own official (or campaign) page?
 * Returns { source_class, source_type } or null. Pure; no fetch.
 */
export function recognizeOfficial(url, id) {
  if (!id || !/^https?:\/\//i.test(String(url || ""))) return null;
  const h = hostOf(url);
  if (!h || THIRD_PARTY.test(h)) return null;
  let path = "";
  try { path = new URL(url).pathname; } catch { return null; }
  const keys = surnameKeys(id.name);
  if (!keys.length) return null;
  const tied = (s) => keys.some((k) => letters(s).includes(k));
  // Their own House / Senate office host (not a committee, leadership or clerk host).
  const mo = MEMBER_OFFICE_HOST.exec(h);
  if (mo) {
    if (NOT_OWN_GOV.test(h) || !tied(mo[1])) return null;
    if (!id.chamber || id.chamber !== mo[2]) return null;
    return { source_class: "congress_member", source_type: `official ${mo[2] === "house" ? "House" : "Senate"} member page` };
  }
  if (GENERAL_GOV.test(h) || NOT_OWN_GOV.test(h)) return null;
  // A state legislature page below the site root that names them.
  if (STATE_LEGIS_HOST.test(h)) {
    if (!id.state_legislator || !path.replace(/\/+$/, "") || !tied(path + new URL(url).search)) return null;
    return { source_class: "state_legislature", source_type: "official state legislature member page" };
  }
  // A governor / statewide office host for the office they hold.
  if (GOV_HOST.test(h)) {
    const sw = STATEWIDE.find((x) => x.kind === id.statewide);
    if (!sw || !sw.hosts.test(h)) return null;
    return { source_class: "statewide_official", source_type: "official statewide office page" };
  }
  // A campaign host carrying their surname (a campaign word alone is not enough).
  const site = h.split(".").slice(0, -1).join(".");
  if (tied(site) && (CAMPAIGN_WORD.test(site) || keys.some((k) => letters(site).startsWith(k) || letters(site).endsWith(k)))) {
    return { source_class: "campaign_issues", source_type: "campaign page" };
  }
  return null;
}

// ── Step 3: state legislature member directories ───────────────────────────
// Only for rows still without pages after steps 1 and 2. The directory
// (db/raw-ingest-legislature-directory-2026-11.json, built by
// scripts/build-raw-ingest-legislature-directory-2026-11.mjs) holds, per state,
// the legislature's own member IDs with the printed name and chamber the
// legislature gives them, plus the member-page address pattern per chamber —
// a pattern the build only accepts when member pages on it are already cited
// on the site and agree with the directory. Same clean-match rule as step 1:
// same state, same chamber, same surname, compatible first name, exactly one
// member, and the member's page not already on (or matched by) another row.
// Where the site shows the politician's official legislature portrait, its
// member ID must agree with the directory match (portrait_ids).

/** "house" | "senate" | null for a sitting state legislator's office. */
export function legislativeChamber(office) {
  const o = String(office || "");
  if (!o || NOT_SITTING.test(o) || !STATE_LEGISLATOR.test(o)) return null;
  if (/\bSenat/i.test(o)) return "senate";
  if (/\b(?:Representative|Assembly|Delegate|House)\b/i.test(o)) return "house";
  return null;
}

/** "Carl R. Albrecht" from a legislature's printed "Rep. Albrecht, Carl R.". */
export function directoryName(printed) {
  const t = String(printed || "").replace(/^\s*(?:Rep|Sen|Del|Asm|Assemblymember|Senator|Representative)\.?\s+/i, "").replace(/\[[^\]]*\]/g, "").trim();
  const [last, first] = t.split(",").map((x) => x.trim());
  return first ? `${first} ${last}` : last || "";
}

/** The member page for a directory entry, from its state's chamber pattern. */
export function legislatureMemberUrl(entry, stateDir) {
  const tpl = stateDir?.member_page?.[entry?.chamber];
  if (!tpl || !/^[A-Za-z0-9_-]+$/.test(String(entry?.id || ""))) return null;
  return tpl.replace("{id}", entry.id);
}

/**
 * Step 3 for one identity. Returns { ok: true, entry, url } or { ok: false, why }.
 * `contested` = member IDs matched by more than one page-less row.
 */
export function resolveLegislature(id, { directory = {}, retired = new Set(), contested = new Set() } = {}) {
  const chamber = legislativeChamber(id?.office);
  if (!chamber) return { ok: false, why: "no sitting state legislative office on the site roster" };
  if (!id.state) return { ok: false, why: "no state on the site roster" };
  const dir = directory.states?.[id.state];
  if (!dir) return { ok: false, why: `no ${id.state} legislature directory` };
  const named = (dir.members || []).filter((m) => sameName(directoryName(m.name), id.name));
  const hits = named.filter((m) => m.chamber === chamber);
  if (!hits.length) return { ok: false, why: named.length ? `${id.name} is listed in the ${id.state} ${named[0].chamber}, not the ${chamber}` : `no ${id.state} ${chamber} member named ${id.name}` };
  if (hits.length > 1) return { ok: false, why: `${hits.length} ${id.state} ${chamber} members match ${id.name}` };
  const m = hits[0];
  if (contested.has(`${id.state}|${m.id}`)) return { ok: false, why: `${id.state} member ${m.id} matches more than one roster row` };
  const portrait = dir.portrait_ids?.[id.politician_id];
  if (portrait && portrait !== m.id) return { ok: false, why: `the site's official portrait for ${id.politician_id} names member ${portrait}, the directory match is ${m.id}` };
  const url = legislatureMemberUrl(m, dir);
  if (!url) return { ok: false, why: `no ${chamber} member-page pattern for ${id.state}` };
  if (retired.has(normUrl(url))) return { ok: false, why: `${url} was retired` };
  return { ok: true, entry: m, url, chamber };
}

// ── The roster pass ─────────────────────────────────────────────────────────
const WEAK = new Set(["youtube"]);
/** Pages the planner can pull for this row other than weak ones (social feeds, retired URLs). */
export function strongPages(row, retired = new Set()) {
  return [...(row?.sources || []), ...(row?.official ? [row.official] : [])]
    .filter((s) => s && !WEAK.has(s.source_class) && !retired.has(normUrl(s.url)));
}
/** A tier-3 row with no pages, or only weak ones. */
export function needsResolution(row, retired = new Set()) {
  return !!row && Number(row.tier) === RESOLVE_TIER && !strongPages(row, retired).length;
}

const slugOf = (url) => { try { const u = new URL(url); return ((u.hostname.replace(/^www\./, "") + u.pathname).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "home").slice(0, 60); } catch { return "page"; } };

/**
 * Resolve official pages for every row that needs them (mutates those rows
 * only). `data`:
 *   people         — site roster (share-index `people`: pid → { n, o, s })
 *   aliases        — share-index personAliases (old slug → canonical id)
 *   members        — Congress member roster (vr-member-map `members`)
 *   cited          — { politicians: { pid: [{ url, label, keys }] }, shared_hosts: [], shared_urls: [], congress_member_urls: { bioguide: url } }
 *   retired        — retired source URLs (raw-ingest-retired.mjs)
 *   scored         — scored issue keys (pages keep a cited key only when scored)
 *   legislature    — state legislature directories ({ states: { XX: { member_page, members } } }); step 3
 * Returns { resolved: [{ politician_id, via, url, … }], unresolved: [{ politician_id, why }], eligible }.
 */
export function resolveRoster(roster, data = {}) {
  const { people = {}, aliases = {}, members = [], cited = {}, retired = [], scored = null, legislature = null } = data;
  const retiredSet = new Set(retired.map(normUrl));
  const retiredBioguides = new Set(retired.map(bioguideOf).filter(Boolean));
  const rosterIds = new Set(roster.map((r) => r.politician_id));
  const known = new Map();
  for (const r of roster) for (const s of [...(r.sources || []), ...(r.official ? [r.official] : [])]) if (s?.url) known.set(normUrl(s.url), r.politician_id);
  const hostRows = new Map();
  for (const r of roster) for (const s of [...(r.sources || []), ...(r.official ? [r.official] : [])]) {
    const h = hostOf(s?.url); if (h) (hostRows.get(h) || hostRows.set(h, new Set()).get(h)).add(r.politician_id);
  }
  const sharedCited = new Set(cited.shared_hosts || []);
  const sharedUrls = new Set((cited.shared_urls || []).map(normUrl));
  const isScored = (k) => (scored ? scored.has(k) : true);
  const eligible = roster.filter((r) => needsResolution(r, retiredSet));
  // Step 1 first pass: which bioguide does each page-less row match? A bioguide
  // matched by two rows is contested and resolves for neither.
  const ids = new Map(eligible.map((r) => [r.politician_id, identityOf(r.politician_id, people[r.politician_id])]));
  const firstPass = new Map();
  const byBioguide = new Map();
  for (const r of eligible) {
    const id = ids.get(r.politician_id);
    if (!id) continue;
    const res = resolveCongressGov(id, { members, aliases, rosterIds, retiredBioguides, citedMemberUrls: cited.congress_member_urls || {} });
    firstPass.set(r.politician_id, res);
    if (res.ok) byBioguide.set(res.member.bioguide, (byBioguide.get(res.member.bioguide) || 0) + 1);
  }
  const contested = new Set([...byBioguide].filter(([, n]) => n > 1).map(([b]) => b));
  const resolved = [], unresolved = [];
  for (const r of eligible) {
    const pid = r.politician_id;
    const id = ids.get(pid);
    if (!id) { unresolved.push({ politician_id: pid, why: "not on the site roster" }); continue; }
    let res = firstPass.get(pid);
    if (res?.ok && contested.has(res.member.bioguide)) res = { ok: false, why: `bioguide ${res.member.bioguide} matches more than one roster row` };
    if (res?.ok && known.has(normUrl(res.url)) && known.get(normUrl(res.url)) !== pid) res = { ok: false, why: `${res.url} is already on ${known.get(normUrl(res.url))}'s row` };
    if (res?.ok) {
      const page = { politician_id: pid, topic: DEFAULT_TOPIC, source_type: "official Congress.gov member page",
        source_class: "congress_gov", source_tier: 2, source_id: "official-resolved-congress-gov", url: res.url,
        resolved_by: "congress_gov", bioguide: res.member.bioguide };
      r.sources = [...(r.sources || []), page];
      known.set(normUrl(res.url), pid);
      resolved.push({ politician_id: pid, via: "congress_gov", url: res.url, bioguide: res.member.bioguide, chamber: id.chamber, state: id.state });
      continue;
    }
    // Step 2: pages already cited for them that are clearly their own official page.
    const pages = [];
    const why = [];
    for (const c of (cited.politicians || {})[pid] || []) {
      const n = normUrl(c.url), h = hostOf(c.url);
      const rec = recognizeOfficial(c.url, id);
      if (!rec) continue;
      if (retiredSet.has(n)) { why.push(`${c.url} retired`); continue; }
      if (known.has(n) && known.get(n) !== pid) { why.push(`${c.url} on another row`); continue; }
      if (sharedUrls.has(n)) { why.push(`${c.url} is cited for another politician`); continue; }
      // A legislature host serves every member (the path names the person), so
      // it is told apart by URL; any other host must not belong to anyone else.
      if (rec.source_class !== "state_legislature" && (sharedCited.has(h) || [...(hostRows.get(h) || [])].some((p) => p !== pid))) { why.push(`${h} is shared with another politician`); continue; }
      if (pages.some((p) => normUrl(p.url) === n)) continue;
      const keys = (c.keys || []).filter(isScored);
      pages.push({ politician_id: pid, topic: keys[0] || DEFAULT_TOPIC, source_type: rec.source_type, source_class: rec.source_class,
        source_tier: 1, source_id: `${keys.length ? "" : "official-"}resolved-${slugOf(c.url)}`, url: c.url, resolved_by: "cited_official",
        ...(keys.length > 1 ? { issue_pairs: keys.slice(1) } : {}) });
      if (pages.length >= MAX_RESOLVED_PAGES) break;
    }
    if (pages.length) {
      r.sources = [...(r.sources || []), ...pages];
      for (const p of pages) known.set(normUrl(p.url), pid);
      resolved.push({ politician_id: pid, via: "cited_official", url: pages[0].url, urls: pages.map((p) => p.url), classes: [...new Set(pages.map((p) => p.source_class))] });
      continue;
    }
    unresolved.push({ politician_id: pid, why: [res?.why, ...why.slice(0, 2)].filter(Boolean).join("; ") || "no clean official match" });
  }
  // Step 3: state legislature member directories, for rows still page-less.
  // Runs after steps 1 and 2 so it can never change what they resolved.
  if (legislature?.states) {
    const tries = unresolved.filter((u) => ids.get(u.politician_id)).map((u) => ({ u, id: ids.get(u.politician_id) }));
    const first = new Map(tries.map(({ u, id }) => [u.politician_id, resolveLegislature(id, { directory: legislature, retired: retiredSet })]));
    const count = new Map();
    for (const { u, id } of tries) { const r = first.get(u.politician_id); if (r.ok) { const k = `${id.state}|${r.entry.id}`; count.set(k, (count.get(k) || 0) + 1); } }
    const contested = new Set([...count].filter(([, n]) => n > 1).map(([k]) => k));
    for (const { u, id } of tries) {
      let r = first.get(u.politician_id);
      if (r.ok && contested.size) r = resolveLegislature(id, { directory: legislature, retired: retiredSet, contested });
      if (r.ok && known.has(normUrl(r.url)) && known.get(normUrl(r.url)) !== u.politician_id) r = { ok: false, why: `${r.url} is already on ${known.get(normUrl(r.url))}'s row` };
      if (!r.ok) { if (id.state_legislator) u.why = `${u.why}; legislature directory: ${r.why}`; continue; }
      const row = roster.find((x) => x.politician_id === u.politician_id);
      row.sources = [...(row.sources || []), { politician_id: u.politician_id, topic: DEFAULT_TOPIC,
        source_type: "official state legislature member page", source_class: "state_legislature", source_tier: 1,
        source_id: "official-resolved-legislature", url: r.url, resolved_by: "legislature_directory", member_id: r.entry.id }];
      known.set(normUrl(r.url), u.politician_id);
      resolved.push({ politician_id: u.politician_id, via: "legislature_directory", url: r.url, member_id: r.entry.id, chamber: r.chamber, state: id.state });
      u.resolved = true;
    }
    for (let i = unresolved.length - 1; i >= 0; i--) if (unresolved[i].resolved) unresolved.splice(i, 1);
  }
  return { eligible: eligible.length, resolved, unresolved };
}

/** One run-log line for a resolution report. */
export function resolutionLine(rep) {
  if (!rep) return "raw-ingest: url resolution — not run";
  const by = (v) => rep.resolved.filter((x) => x.via === v).length;
  return `raw-ingest: url resolution — ${rep.eligible} tier-3 row(s) without pages checked · ${rep.resolved.length} resolved (${by("congress_gov")} Congress.gov member page(s), ${by("cited_official")} other official / campaign page(s), ${by("legislature_directory")} state legislature member page(s)) · ${rep.unresolved.length} left without a page (no clean official match)`;
}
