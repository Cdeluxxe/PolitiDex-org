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
//   4. OWN SITES AND DIRECTLY TIED SOURCES, only for rows still without pages
//      after steps 1–3: a page already cited for that one politician that is
//      their own campaign / personal site, a caucus page naming them, their own
//      YouTube channel or video, or an interview / statement naming them. See
//      recognizeDirect and resolveDirect below.
//   5. DISCOVERED SOURCES, only for rows still without pages after steps 1–4:
//      pages an OFFLINE job found (FEC filings, Open States, search) and
//      verified, committed with the reasons each was accepted. See
//      resolveDiscovered below; the rules are in raw-ingest-discovery.mjs.
//   Anything without a clean match stays without pages and is still skipped.
//
// Resolved pages are ordinary roster pages: the planner, the pull path, the
// scorer and the Evidence Locker treat them like every other page, and none of
// those modules reads this file. Each carries `resolved_by` ("congress_gov",
// "cited_official", "legislature_directory", "direct_source" or "discovered") so a resolved page can always
// be told apart.

export const RESOLVE_TIER = 3;
// Pages a row receives from step 2 at most (the planner's per-politician cap
// still applies on top).
export const MAX_RESOLVED_PAGES = 3;
export const DEFAULT_TOPIC = "cost_living";

export const STATES = {
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
export const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
export const normUrl = (u) => {
  try { const x = new URL(u); x.hash = ""; return (x.origin + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase(); }
  catch { return String(u || "").toLowerCase(); }
};
// Hosts that are never the politician's own page (same allowlist spirit as the
// pool builder: news, reference, aggregators, archives, social, chamber tools).
export const THIRD_PARTY = /(?:^|\.)(?:ballotpedia\.org|wikipedia\.org|vote411\.org|votesmart\.org|opensecrets\.org|followthemoney\.org|govtrack\.us|youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|medium\.com|substack\.com|apnews\.com|reuters\.com|npr\.org|pbs\.org|c-span\.org|archive\.org|google\.com|bit\.ly|linktr\.ee)$|news|times|post|tribune|herald|gazette|journal|daily|politico|axios|thehill|cnn|foxnews|nbc|cbs|abc|msnbc|bloomberg|wsj|guardian|courier|observer|chronicle|sentinel|register|examiner|patch\.com|kff|brookings|heritage|cato|voterguide|guide|messenger|press|radio|tv\b|online|kuer|kpcw|ksl|kutv|fox\d|deseret|sltrib|standard\.net|dispatch|insider|advance|examiner|independent/;
const NOT_OWN_GOV = /^(?:clerk|budget|appropriations|judiciary|finance|foreign|armed-?services|energy|commerce|help|rules|oversight|homeland|intelligence|democrats|republicans|gop|dems|majorityleader|minorityleader|democraticleader|republicanleader|speaker|whip|history|bioguide|crsreports|www|docs|live|media|library)\./;
export const GENERAL_GOV = /(?:^|\.)(?:congress\.gov|govinfo\.gov|federalregister\.gov|archives\.gov|loc\.gov|usa\.gov|whitehouse\.gov|state\.gov|defense\.gov|hhs\.gov|medicare\.gov|senate\.gov|house\.gov)$/;
export const MEMBER_OFFICE_HOST = /^([a-z0-9-]+)\.(house|senate)\.gov$/;
export const STATE_LEGIS_HOST = /(?:^|\.)(?:[a-z]*leg[a-z]*|legislature|house|senate|assembly|nyassembly|nysenate)\.(?:state\.)?(?:[a-z]{2}\.us|[a-z]+\.gov)$|^(?:[a-z]+\.)?(?:le|leg|legis|legislature)\.[a-z]+\.gov$|^(?:house|senate)\.[a-z]+\.gov$|^[a-z]*(?:legislature|leg|assembly|senate|house)\.gov$|^(?:house|senate)\.utleg\.gov$/;
export const GOV_HOST = /\.(?:gov|mil)$|\.state\.[a-z]{2}\.us$/;
export const CAMPAIGN_WORD = /(?:for|elect|vote|campaign|team|friends|20\d\d)/;

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
export const letters = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

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
// `member_page[chamber]` is either an address pattern with `{id}` or "{url}":
// the member's own address exactly as the legislature's listing links it
// (entry.url), accepted only on the host of the chamber's confirmed pages.
export function legislatureMemberUrl(entry, stateDir) {
  const tpl = stateDir?.member_page?.[entry?.chamber];
  if (!tpl || !/^[A-Za-z0-9_-]+$/.test(String(entry?.id || ""))) return null;
  if (tpl === "{url}") {
    const confirmed = (stateDir.confirmed_by?.[entry.chamber] || []).map(hostOf);
    const u = String(entry.url || "");
    return /^https:\/\/[^\s]+$/.test(u) && confirmed.length && confirmed.every((h) => h === hostOf(u)) ? u : null;
  }
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

// ── Step 4: the politician's own sites and directly tied sources ───────────
// Only for rows still without pages after steps 1–3. The inputs are pages the
// site ALREADY cites for that one politician (curated stance sources, spotlight
// items and accountability items, collected by
// scripts/build-raw-ingest-direct-cited-2026-11.mjs into
// db/raw-ingest-direct-cited-2026-11.json). Nothing is fetched, searched or
// built: a domain is never guessed and a channel never looked up. The repo
// holds no uncited site or channel for anyone, so a politician with nothing
// cited gets nothing here.
//
// A cited page is attached only when recognizeDirect() reads it as one of:
//   own_site         their own campaign or personal site — the host (or, on a
//                    blog platform, the subdomain) carries their surname, full
//                    name, or the nickname the roster prints in quotes, in a
//                    campaign shape ("garydye2020", "senatorbarcy"). Hosts that
//                    serve many candidates (goodparty.org, ActBlue …) never.
//   caucus_member    a legislative caucus page that names a sitting state
//                    legislator in its path (senatedemocrats.wa.gov/pedersen/).
//   youtube_video    a video cited from their OWN channel (label names the
//                    channel as theirs). Watch URL only. Interviews on other
//                    channels are refused.
//   youtube          a /channel/UC… address cited as their own channel (the
//                    channel ID is in the cited URL; @handles are refused).
//   direct_statement an interview, Q&A, candidate questionnaire, candidate
//                    statement, op-ed or podcast whose URL names them.
// and every clean-match check passes: no other politician on the site shares
// their name; the URL (and, for an own site, the host) is cited for no other
// politician and is not on another row; no office word in the address or
// label contradicts their office; the URL is not retired; debates, forums,
// panels and pieces with several authors are refused. At most
// MAX_RESOLVED_PAGES pages, own sites first.

export const DIRECT_CLASSES = {
  own_site: "the politician's own campaign or personal site (host carries their name)",
  caucus_member: "legislative caucus page naming the member (member page or caucus statement)",
  youtube_video: "video from the politician's own YouTube channel",
  youtube: "the politician's own YouTube channel (channel ID in the cited URL)",
  direct_statement: "interview, Q&A, candidate questionnaire, candidate statement, op-ed or podcast that names them",
};
// Reference, aggregator and social hosts: never a direct source.
export const REFERENCE = /(?:^|\.)(?:wikipedia\.org|ballotpedia\.org|vote411\.org|votesmart\.org|opensecrets\.org|followthemoney\.org|govtrack\.us|fec\.gov|archive\.org|google\.com|bit\.ly|linktr\.ee|x\.com|twitter\.com|facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|threads\.net|bsky\.app|ballotready\.org|politifact\.com|realclearpolling\.com|termlimits\.com|isidewith\.com|yahoo\.com|aol\.com|msn\.com)$/;
// Hosts that serve many candidates: an address there is never someone's own site.
export const PLATFORM = /(?:^|\.)(?:goodparty\.org|actblue\.com|winred\.com|nationbuilder\.com|crowdpac\.com|candidate\.vote|ballotready\.org)$/;
// Blog / site-builder platforms where the subdomain is the site.
export const BLOG_PLATFORM = /^([a-z0-9-]+)\.(?:wordpress\.com|blogspot\.com|wixsite\.com|weebly\.com|godaddysites\.com)$/;
export const CAUCUS_HOST = /(?:senate|house|assembly)(?:gop|dems?|democrats?|republicans?)|(?:gop|dems?|democrats?|republicans?)(?:senate|house|assembly)/;
const CAUCUS_LABEL = /\b(?:Senate|House|Assembly)\s+(?:Democrats|Republicans|GOP|Democratic Caucus|Republican Caucus)\b/;
const DIRECT_KIND = /\binterview\b|\bq\s*&\s*a\b|(?:^|[\/-])q-?a(?:[\/-]|$)|questionnaire|candidate statement|\bpodcast\b|\bop-?ed\b|why-you-should-vote-for-me|in-(?:his|her|their)-own-words/i;
export const MULTI = /\bdebates?\b|\bforums?\b|\bpanels?\b|roundtable|town[\s-]?hall|\bcandidates\b|\d+-others|\band-others\b|\bvs\.?\b|versus|\bfaces\b|\bchallenges?\b|\bsurvey\b|meet-the-candidates/i;
// Address words that mark a piece about several people ("shaheen-and-budd-pen …").
const MULTI_PATH = /-and-|-with-[a-z]+-[a-z]+-/i;
export const NOT_OWN_CHANNEL = /\b(?:interview|debate|panel|podcast|featuring|news|pbs|c-span|radio|tv|media|report)\b|\b(?:senate|house|legislature|assembly|council|commission|chamber)(?:['’]s)?\s+(?:own\s+)?(?:official\s+)?channel\b/i;
const YT_VIDEO = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const YT_CHANNEL = /^https?:\/\/(?:www\.)?youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})\/?(?:videos\/?)?$/;
const YT_HOST = /(?:^|\.)(?:youtube\.com|youtu\.be)$/;

/** Name keys a host, path or label can carry: { sur, full, nick } (lowercase letters). */
export function directKeys(name) {
  const t = nameTokens(name);
  if (t.length < 2) return { sur: [], full: [], nick: [] };
  const last = t[t.length - 1];
  const sur = [last, ...(t.length > 2 ? [t[t.length - 2] + last] : [])].filter((k) => k.length >= 4);
  const firsts = [t[0], ...(NICKS.get(t[0]) || [])];
  const full = firsts.map((f) => f + last);
  const nick = [...String(name).matchAll(/["“”]([^"“”]+)["“”]/g)].map((m) => letters(m[1])).filter((k) => k.length >= 4);
  return { sur, full, nick };
}

// Office words an address or label can carry, and whether they fit the office.
export function officeConflict(text, office) {
  const s = letters(text), o = String(office || "");
  const federal = /\bU\.S\.|\bCongress|\bFederal\b/i.test(o), state = /\bState\b|\bAssembly|\bDelegate\b/i.test(o) && !federal;
  const senate = /\bSenat/i.test(o), house = /\bHouse\b|\bRepresentative|\bAssembly|\bDelegate\b|\bCongressman|\bCongresswoman/i.test(o);
  if (s.includes("congress") && (state || /\b(?:Governor|Mayor|Sheriff|Council|Commission|Judge|Attorney General|Secretary of State)\b/i.test(o)) && !federal) return "congress";
  if (/senat/.test(s) && house && !senate) return "senate";
  if (/(?:for|4)(?:house|assembly|delegate)|assembly/.test(s) && senate && !house) return "house";
  for (const w of ["governor", "mayor", "sheriff", "council", "judge"]) if (s.includes(w) && !o.toLowerCase().includes(w)) return w;
  return null;
}

/**
 * Is this cited page one of the politician's own sites or a source directly
 * tied to them? `c` = { url, label, tags?, interview? } as collected for them.
 * Returns { kind, source_class, source_type, source_tier, url, channel_id? } or
 * null. Pure; no fetch. Clean-match checks across the roster are in resolveDirect.
 */
export function recognizeDirect(c, id) {
  const url = String(c?.url || "");
  if (!id || !/^https?:\/\//i.test(url)) return null;
  const h = hostOf(url);
  if (!h || REFERENCE.test(h)) return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  const label = String(c.label || "");
  const keys = directKeys(id.name);
  if (!keys.sur.length && !keys.full.length) return null;
  const pathL = letters(decodeURIComponent(u.pathname + u.search));
  const has = (s, list) => list.some((k) => s.includes(k));
  const labelL = letters(label);
  const fullInLabel = has(labelL, keys.full) || keys.nick.some((n) => labelL.includes(n + keys.sur[0]));
  const interviewish = DIRECT_KIND.test(label) || DIRECT_KIND.test(u.pathname) || (c.tags || []).includes("Long-Form Interview") || !!c.interview;

  // YouTube: own-channel video, interview with them alone, or own channel.
  if (YT_HOST.test(h)) {
    const v = YT_VIDEO.exec(url)?.[1];
    if (v) {
      const watch = `https://www.youtube.com/watch?v=${v}`;
      const poss = /([A-Za-z'’-]+?)['’]s\s+(?:own\s+)?(?:official\s+)?(?:campaign\s+)?(?:YouTube\s+)?channel\b/i.exec(label);
      const own = !NOT_OWN_CHANNEL.test(label) && ((poss && keys.sur.includes(letters(poss[1]))) || /\b(?:his|her|their)\s+own\s+(?:official\s+)?(?:campaign\s+)?(?:YouTube\s+)?channel\b/i.test(label));
      if (own) return { kind: "own_channel_video", source_class: "youtube_video", source_type: "official YouTube video (own channel)", source_tier: 2, url: watch };
      // An interview on someone else's channel is not their channel: the
      // youtube_video class (and the Locker's "own YouTube channel" credit) is
      // for their own uploads only.
      return null;
    }
    const ch = YT_CHANNEL.exec(url)?.[1];
    const ownCh = /\b(?:official|campaign|own)\b[^.]*\bchannel\b|\bchannel\b[^.]*\b(?:official|own)\b/i.test(label) && !NOT_OWN_CHANNEL.test(label) && (fullInLabel || has(labelL, keys.sur));
    if (ch && ownCh) return { kind: "own_channel", source_class: "youtube", source_type: "official YouTube channel", source_tier: 2, url: `https://www.youtube.com/feeds/videos.xml?channel_id=${ch}`, channel_id: ch };
    return null; // @handles, /c/ and /user/ addresses would need a lookup
  }

  // Their own campaign or personal site.
  if (!PLATFORM.test(h)) {
    const blog = BLOG_PLATFORM.exec(h);
    const site = letters(blog ? blog[1] : h.split(".").slice(0, -1).join("."));
    const tied = has(site, keys.full) || has(site, keys.nick) || has(site, keys.sur);
    const shaped = CAMPAIGN_WORD.test(site) || /senator|rep|4|for|elect/.test(site)
      || [...keys.sur, ...keys.nick, ...keys.full].some((k) => site.startsWith(k) || site.endsWith(k));
    if (tied && shaped && !CAUCUS_HOST.test(site) && !STATE_LEGIS_HOST.test(h) && !GOV_HOST.test(h) && !THIRD_PARTY.test(blog ? blog[1] : h)) {
      if (officeConflict(`${site} ${label}`, id.office)) return null;
      const campaign = /campaign|for|elect|vote|20\d\d|4/.test(`${site} ${label.toLowerCase()}`);
      return { kind: campaign ? "campaign_site" : "personal_site", source_class: "own_site",
        source_type: campaign ? "campaign site (the politician's own)" : "the politician's own personal site", source_tier: 1, url };
    }
  }

  // A legislative caucus page naming a sitting state legislator.
  const hostLabel = letters(h.split(".").slice(0, -1).join("."));
  if ((CAUCUS_HOST.test(hostLabel) || CAUCUS_LABEL.test(label)) && !THIRD_PARTY.test(h)) {
    if (!id.state_legislator || !u.pathname.replace(/\/+$/, "") || !has(pathL, keys.sur)) return null;
    if (officeConflict(hostLabel, id.office)) return null;
    return { kind: "caucus_page", source_class: "caucus_member", source_type: "legislative caucus page naming the member", source_tier: 1, url };
  }

  // An interview, Q&A, questionnaire, candidate statement, op-ed or podcast that names them.
  // Government, legislature and member-office hosts are steps 1–2's to judge.
  if (GOV_HOST.test(h) || STATE_LEGIS_HOST.test(h) || MEMBER_OFFICE_HOST.test(h) || GENERAL_GOV.test(h)) return null;
  if (interviewish && !PLATFORM.test(h) && u.pathname.replace(/\/+$/, "") && (has(pathL, keys.sur) || has(pathL, keys.full))) {
    if (MULTI.test(label) || MULTI.test(u.pathname) || MULTI_PATH.test(u.pathname)) return null;
    if (officeConflict(label, id.office)) return null;
    return { kind: "statement", source_class: "direct_statement", source_type: "interview / candidate statement cited for the politician", source_tier: 2, url };
  }
  return null;
}

const DIRECT_ORDER = ["own_site", "caucus_member", "youtube", "youtube_video", "direct_statement"];

/**
 * Step 4 for one identity: the cited pages that pass recognizeDirect and every
 * clean-match check. Returns { pages: [{ url, rec, keys }], why: [] }.
 */
export function resolveDirect(id, entries = [], { retired = new Set(), sharedHosts = new Set(), sharedUrls = new Set(), known = new Map(), hostRows = new Map(), homonym = null, surnames = new Set() } = {}) {
  const own = new Set(nameTokens(id?.name));
  const why = [];
  if (!id) return { pages: [], why: ["not on the site roster"] };
  const recs = [];
  for (const c of entries) {
    const rec = recognizeDirect(c, id);
    if (!rec) continue;
    const n = normUrl(rec.url), h = hostOf(rec.url);
    if (homonym) { why.push(`${rec.url}: ${homonym} shares the name ${id.name}`); continue; }
    // A statement whose address names another politician on the site is about several people.
    if (rec.source_class === "direct_statement") {
      let path = "";
      try { path = decodeURIComponent(new URL(rec.url).pathname).toLowerCase(); } catch { /* unreadable → no tokens */ }
      const other = path.split(/[^a-z]+/).find((t) => t.length >= 4 && !own.has(t) && surnames.has(t));
      if (other) { why.push(`${rec.url} also names "${other}", another politician's surname`); continue; }
    }
    if (retired.has(n) || retired.has(normUrl(c.url))) { why.push(`${c.url} retired`); continue; }
    if (sharedUrls.has(normUrl(c.url))) { why.push(`${c.url} is cited for another politician`); continue; }
    if (known.has(n) && known.get(n) !== id.politician_id) { why.push(`${rec.url} is on ${known.get(n)}'s row`); continue; }
    // An own site is told apart by host; every other kind by URL.
    if (rec.source_class === "own_site" && (sharedHosts.has(h) || [...(hostRows.get(h) || [])].some((p) => p !== id.politician_id))) { why.push(`${h} is shared with another politician`); continue; }
    if (recs.some((x) => normUrl(x.rec.url) === n)) continue;
    recs.push({ url: rec.url, rec, keys: c.keys || [] });
  }
  recs.sort((a, b) => DIRECT_ORDER.indexOf(a.rec.source_class) - DIRECT_ORDER.indexOf(b.rec.source_class));
  return { pages: recs.slice(0, MAX_RESOLVED_PAGES), why };
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
 *   direct         — pages cited for each politician that may be their own site or a directly tied
 *                    source ({ politicians: { pid: [{ url, label, keys }] }, shared_hosts, shared_urls }); step 4
 *   discovered     — sources the offline discovery job found and verified
 *                    ({ politicians: { pid: { urls: [{ url, source_class, source_type, accepted_because, … }] } } }); step 5
 * Returns { resolved: [{ politician_id, via, url, … }], unresolved: [{ politician_id, why }], eligible }.
 */
export function resolveRoster(roster, data = {}) {
  const { people = {}, aliases = {}, members = [], cited = {}, retired = [], scored = null, legislature = null, direct = null, discovered = null } = data;
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
  // Step 4: their own sites and directly tied sources, for rows still page-less.
  // Runs after steps 1–3 so it can never change what they resolved.
  if (direct?.politicians) {
    const sharedHosts = new Set(direct.shared_hosts || []);
    const sharedDirect = new Set([...(direct.shared_urls || []), ...(cited.shared_urls || [])].map(normUrl));
    // Another politician on the site with the same name makes any name tie ambiguous.
    const canon = (p) => aliases[p] || p;
    const byLast = new Map();
    for (const [p, v] of Object.entries(people)) { const t = nameTokens(v?.n); if (t.length >= 2) (byLast.get(t[t.length - 1]) || byLast.set(t[t.length - 1], []).get(t[t.length - 1])).push([p, v.n]); }
    const homonymOf = (id) => { const t = nameTokens(id.name); return (byLast.get(t[t.length - 1]) || []).find(([p, n]) => canon(p) !== canon(id.politician_id) && sameName(n, id.name))?.[0] || null; };
    const tries = unresolved.filter((u) => ids.get(u.politician_id) && (direct.politicians[u.politician_id] || []).length);
    const first = new Map(tries.map((u) => { const id = ids.get(u.politician_id);
      return [u.politician_id, resolveDirect(id, direct.politicians[u.politician_id], { retired: retiredSet, sharedHosts, sharedUrls: sharedDirect, known, hostRows, homonym: homonymOf(id), surnames: new Set(byLast.keys()) })]; }));
    // A URL (or own-site host) picked for two rows resolves for neither.
    const count = new Map();
    const tag = (p) => (p.rec.source_class === "own_site" ? `host ${hostOf(p.url)}` : normUrl(p.url));
    for (const r of first.values()) for (const p of r.pages) count.set(tag(p), (count.get(tag(p)) || 0) + 1);
    for (const u of tries) {
      const pid = u.politician_id;
      const r = first.get(pid);
      const pages = r.pages.filter((p) => count.get(tag(p)) === 1 && !(known.has(normUrl(p.url)) && known.get(normUrl(p.url)) !== pid));
      if (!pages.length) { const w = [...r.why, ...r.pages.map((p) => `${p.url} matches more than one roster row`)]; if (w.length) u.why = `${u.why}; own / direct sources: ${w.slice(0, 2).join("; ")}`; continue; }
      const row = roster.find((x) => x.politician_id === pid);
      const added = pages.map((p) => {
        const keys = (p.keys || []).filter(isScored);
        return { politician_id: pid, topic: keys[0] || DEFAULT_TOPIC, source_type: p.rec.source_type, source_class: p.rec.source_class,
          source_tier: p.rec.source_tier, source_id: `resolved-direct-${slugOf(p.url)}`, url: p.url, resolved_by: "direct_source", direct_kind: p.rec.kind,
          ...(p.rec.channel_id ? { channel_id: p.rec.channel_id } : {}), ...(keys.length > 1 ? { issue_pairs: keys.slice(1) } : {}) };
      });
      row.sources = [...(row.sources || []), ...added];
      for (const p of added) known.set(normUrl(p.url), pid);
      resolved.push({ politician_id: pid, via: "direct_source", url: added[0].url, urls: added.map((p) => p.url), kinds: added.map((p) => p.direct_kind), classes: [...new Set(added.map((p) => p.source_class))] });
      u.resolved = true;
    }
    for (let i = unresolved.length - 1; i >= 0; i--) if (unresolved[i].resolved) unresolved.splice(i, 1);
  }
  // Step 5: sources DISCOVERED by the offline job, for rows still page-less.
  // Runs after steps 1–4 so it can never change what they resolved.
  if (discovered?.politicians) resolveDiscovered({ roster, unresolved, resolved, ids, people, aliases, known, hostRows, retiredSet, discovered,
    shared: new Set([...(direct?.shared_urls || []), ...(cited.shared_urls || [])].map(normUrl)) });
  return { eligible: eligible.length, resolved, unresolved };
}

// ── Step 5: discovered sources ──────────────────────────────────────────────
// The offline job (scripts/discover-raw-ingest-sources-2026-11.mjs, rules in
// netlify/lib/raw-ingest-discovery.mjs) found and verified these pages and
// committed them to db/raw-ingest-discovered-2026-11.json with the reasons
// each was accepted. On roster build the engine re-checks what can change
// since: the row is still page-less; nobody else on the site shares the name;
// the URL (or, for an own site, the host) is not on another row, not shared,
// not retired and not claimed for two rows; the class is a discovery class;
// at most MAX_RESOLVED_PAGES pages, own site first. Nothing is fetched here.
// Short stable hash so two long addresses on one host never share a source id.
const shortHash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h.toString(36); };
export const DISCOVERED_CLASSES = ["own_site", "youtube", "youtube_video", "direct_statement"];
function resolveDiscovered({ roster, unresolved, resolved, ids, people, aliases, known, hostRows, retiredSet, discovered, shared }) {
  const canon = (p) => aliases[p] || p;
  const byLast = new Map();
  for (const [p, v] of Object.entries(people)) { const t = nameTokens(v?.n); if (t.length >= 2) (byLast.get(t[t.length - 1]) || byLast.set(t[t.length - 1], []).get(t[t.length - 1])).push([p, v.n]); }
  const homonymOf = (id) => { const t = nameTokens(id.name); return (byLast.get(t[t.length - 1]) || []).find(([p, n]) => canon(p) !== canon(id.politician_id) && sameName(n, id.name))?.[0] || null; };
  const tag = (e) => (e.source_class === "own_site" ? `host ${hostOf(e.url)}` : normUrl(e.url));
  const first = new Map();
  for (const u of unresolved) {
    const pid = u.politician_id, id = ids.get(pid), rec = discovered.politicians[pid];
    if (!id || !rec?.urls?.length) continue;
    const why = [];
    const homonym = homonymOf(id);
    if (homonym) { first.set(pid, { pages: [], why: [`${homonym} shares the name ${id.name}`] }); continue; }
    const pages = [];
    for (const e of rec.urls) {
      const n = normUrl(e.url), h = hostOf(e.url);
      if (!DISCOVERED_CLASSES.includes(e.source_class) || !/^https?:\/\//.test(String(e.url)) || !(e.accepted_because || []).length || !e.source_type) { why.push(`${e.url}: not a reviewable discovery entry`); continue; }
      if (retiredSet.has(n)) { why.push(`${e.url} retired`); continue; }
      if (shared.has(n)) { why.push(`${e.url} is cited for another politician`); continue; }
      if (known.has(n) && known.get(n) !== pid) { why.push(`${e.url} is on ${known.get(n)}'s row`); continue; }
      if (e.source_class === "own_site" && [...(hostRows.get(h) || [])].some((p) => p !== pid)) { why.push(`${h} is on another politician's row`); continue; }
      if (pages.some((p) => normUrl(p.url) === n)) continue;
      pages.push(e);
    }
    pages.sort((a, b) => DISCOVERED_CLASSES.indexOf(a.source_class) - DISCOVERED_CLASSES.indexOf(b.source_class));
    first.set(pid, { pages: pages.slice(0, MAX_RESOLVED_PAGES), why });
  }
  // A URL (or own-site host) discovered for two rows resolves for neither.
  // (Counted by row: one person's home page and issues page share a host.)
  const owners = new Map();
  for (const [pid, r] of first) for (const e of r.pages) (owners.get(tag(e)) || owners.set(tag(e), new Set()).get(tag(e))).add(pid);
  const count = new Map([...owners].map(([k, v]) => [k, v.size]));
  for (const u of unresolved) {
    const pid = u.politician_id, r = first.get(pid);
    if (!r) continue;
    const pages = r.pages.filter((e) => count.get(tag(e)) === 1);
    if (!pages.length) { const w = [...r.why, ...r.pages.map((e) => `${e.url} was discovered for more than one row`)]; if (w.length) u.why = `${u.why}; discovered: ${w.slice(0, 2).join("; ")}`; continue; }
    const row = roster.find((x) => x.politician_id === pid);
    const added = pages.map((e) => ({ politician_id: pid, topic: DEFAULT_TOPIC, source_type: e.source_type, source_class: e.source_class,
      source_tier: Number(e.source_tier) === 2 ? 2 : 1, source_id: `discovered-${slugOf(e.channel_url || e.url)}-${shortHash(e.url)}`, url: e.url, resolved_by: "discovered",
      discovered_kind: e.kind, found_by: e.found_by, accepted_because: e.accepted_because, discovered_on: e.checked?.fetched_on || discovered.run_on,
      ...(e.channel_id ? { channel_id: e.channel_id } : {}) }));
    row.sources = [...(row.sources || []), ...added];
    for (const p of added) known.set(normUrl(p.url), pid);
    resolved.push({ politician_id: pid, via: "discovered", url: added[0].url, urls: added.map((p) => p.url), classes: [...new Set(added.map((p) => p.source_class))], found_by: [...new Set(added.map((p) => p.found_by))] });
    u.resolved = true;
  }
  for (let i = unresolved.length - 1; i >= 0; i--) if (unresolved[i].resolved) unresolved.splice(i, 1);
}

/** One run-log line for a resolution report. */
export function resolutionLine(rep) {
  if (!rep) return "raw-ingest: url resolution — not run";
  const by = (v) => rep.resolved.filter((x) => x.via === v).length;
  return `raw-ingest: url resolution — ${rep.eligible} tier-3 row(s) without pages checked · ${rep.resolved.length} resolved (${by("congress_gov")} Congress.gov member page(s), ${by("cited_official")} other official / campaign page(s), ${by("legislature_directory")} state legislature member page(s), ${by("direct_source")} own-site / direct source(s), ${by("discovered")} discovered) · ${rep.unresolved.length} left without a page (no clean official match)`;
}
