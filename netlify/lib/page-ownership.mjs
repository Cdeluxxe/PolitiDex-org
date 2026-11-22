// ─────────────────────────────────────────────────────────────────────────────
// page-ownership.mjs — is this page the politician's OWN? (locker-own-v1)
// ─────────────────────────────────────────────────────────────────────────────
// Evidence is what a politician said on their own pages. This module decides,
// from a page's address (and, for a few kinds of site, the quote itself),
// whether a page belongs to the politician it is filed under. It is applied:
//   · when the cron is about to store a Locker item (lockerDecision);
//   · when the Locker is served and promoted (ownEvidenceRows) — so an item
//     already stored from a foreign page stops counting at once;
//   · by the re-score pass, which retires those items to the retired store.
//
// ACCEPTED (own: true)
//   member_site    a House / Senate office site whose name is the politician's
//                  (benniethompson.house.gov, blakemoore.house.gov,
//                  ocasio-cortez.house.gov, leaderarchive-hoyer.house.gov).
//   campaign_site  a non-government site whose address names the politician
//                  (jamestalarico.com, ginafortexas.com, flintformontana.com),
//                  or a site the curated data cites for this politician and no
//                  one else.
//   legislature_member_page  a state legislature page whose own address names
//                  the member (nyassembly.gov/mem/Jane-Doe/…), or a legislature
//                  host that names them.
//   office_site    a state executive office site (governor, attorney general,
//                  secretary of state, …) of the office this politician holds,
//                  in their state; whitehouse.gov for the President.
//   record         the politician's own turns in the Congressional Record or a
//                  GPO hearing transcript (the speech pipeline keeps only their
//                  own words), and Congress.gov pages of their own record.
//   video          own-channel video (the video pipeline is out of scope here
//                  and keeps its own rules).
//   named_speaker  a committee or agency site, accepted ONLY because the quote
//                  itself is attributed to this politician ("…,” said Rep. X).
//
// REJECTED (own: false) — never scored into, stored in or served from the Locker
//   clerk          clerk.house.gov (disclosure menus, not anyone's statement).
//   white_house    whitehouse.gov for anyone but the President (issue headings
//                  are the administration's, not a staff member's).
//   committee      a committee / caucus / leadership site, unless the quote is
//                  attributed to this politician (named_speaker above).
//   other_member   a House / Senate site that names someone else
//                  (mikethompson.house.gov for Bennie Thompson).
//   legislature_other  a legislature page that is not this member's own
//                  (bill pages, other members, chamber news).
//   agency         a federal agency site, unless the quote names them.
//   foreign_site   any other site that neither names the politician nor is on
//                  file as theirs.
//
// Pure apart from the read-only data imports below. Nothing here writes.

import SHARE_INDEX from "../../db/share-index.json" with { type: "json" };
import OFFICIAL_CITED from "../../db/raw-ingest-official-cited-2026-11.json" with { type: "json" };
import DIRECT_CITED from "../../db/raw-ingest-direct-cited-2026-11.json" with { type: "json" };
import { quotedSpeakerOf } from "./stance-score-core.mjs";

export const OWNERSHIP_VERSION = "locker-own-v1";

const PEOPLE = (SHARE_INDEX && SHARE_INDEX.people) || {};
// Roster aliases (alias → canonical id) both ways, so "celeste_maloy" / "maloy" find one name.
const ALIASES = (SHARE_INDEX && SHARE_INDEX.personAliases) || {};
const ALIAS_OF = Object.fromEntries(Object.entries(ALIASES).map(([a, c]) => [c, a]));

const hostOf = (link) => { try { return new URL(String(link)).hostname.toLowerCase().replace(/^www\d?\./, ""); } catch { return ""; } };
const pathOf = (link) => { try { return decodeURIComponent(new URL(String(link)).pathname).toLowerCase(); } catch { return ""; } };
const squash = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// ── Trusted citations: hosts the curated data already cites for ONE politician ──
function citedHosts() {
  const byPid = new Map();
  const pidsByHost = new Map();
  const add = (pid, url) => {
    const h = hostOf(url);
    if (!h) return;
    if (!byPid.has(pid)) byPid.set(pid, new Set());
    byPid.get(pid).add(h);
    if (!pidsByHost.has(h)) pidsByHost.set(h, new Set());
    pidsByHost.get(h).add(pid);
  };
  for (const src of [OFFICIAL_CITED, DIRECT_CITED]) {
    for (const [pid, list] of Object.entries((src && src.politicians) || {})) for (const x of list || []) add(pid, x.url);
  }
  const shared = new Set([...((OFFICIAL_CITED && OFFICIAL_CITED.shared_hosts) || []), ...((DIRECT_CITED && DIRECT_CITED.shared_hosts) || [])].map((h) => String(h).replace(/^www\./, "")));
  for (const [h, s] of pidsByHost) if (s.size > 1) shared.add(h);
  return { byPid, shared };
}
const CITED = citedHosts();
/** Is `host` cited in the curated data for this politician and nobody else? */
export const citedOnlyFor = (host, pid) => Boolean(CITED.byPid.get(pid)?.has(host)) && !CITED.shared.has(host);

// ── The politician's name, as address-friendly tokens ──
const NAME_SUFFIX = new Set(["jr", "sr", "ii", "iii", "iv", "md", "phd", "esq"]);
const NICKNAMES = {
  robert: ["bob", "bobby", "rob", "robby"], william: ["bill", "billy", "will"], james: ["jim", "jimmy", "jamie"],
  richard: ["rick", "dick", "rich"], thomas: ["tom", "tommy"], michael: ["mike"], charles: ["chuck", "charlie"],
  joseph: ["joe"], john: ["jack", "johnny"], edward: ["ed", "ted", "eddie"], daniel: ["dan", "danny"],
  christopher: ["chris"], steven: ["steve"], stephen: ["steve"], timothy: ["tim"], gregory: ["greg"],
  benjamin: ["ben"], bennie: ["benny"], patrick: ["pat"], kenneth: ["ken"], ronald: ["ron"], donald: ["don"],
  anthony: ["tony"], andrew: ["andy", "drew"], jeffrey: ["jeff"], jonathan: ["jon"], nicholas: ["nick"],
  samuel: ["sam"], katherine: ["kate", "katie", "kathy"], catherine: ["cathy", "kate"], elizabeth: ["liz", "beth", "betsy"],
  margaret: ["maggie", "peggy"], patricia: ["pat", "patty"], deborah: ["deb", "debbie"], susan: ["sue", "susie"],
  rebecca: ["becky"], jennifer: ["jen", "jenny"], kimberly: ["kim"], alexandria: ["alex"], alexander: ["alex"],
  frederick: ["fred"], lawrence: ["larry"], raymond: ["ray"], gerald: ["jerry"], jerrold: ["jerry"], douglas: ["doug"],
  matthew: ["matt"], zachary: ["zach"], joshua: ["josh"], david: ["dave"], gabriel: ["gabe"], abigail: ["abby"],
};

/** { first: [..], middle: [..], last: [..], surname, full } for a politician id, or null. */
export function nameTokens(pid, people = PEOPLE) {
  const rec = people[pid] || people[ALIASES[pid]] || people[ALIAS_OF[pid]];
  const raw = rec && rec.n ? String(rec.n) : String(pid || "").split("_").join(" ");
  const words = raw.replace(/\([^)]*\)|["“”]/g, " ").split(/[\s,]+/).map((w) => w.replace(/\.$/, "")).filter(Boolean);
  const clean = words.filter((w) => !NAME_SUFFIX.has(w.toLowerCase().replace(/\./g, "")));
  if (!clean.length) return null;
  const lastWord = clean[clean.length - 1];
  const lastParts = lastWord.split(/[-’']/).map(squash).filter((x) => x.length > 1);
  const surname = squash(lastWord);
  const first = clean.length > 1 ? squash(clean[0]) : "";
  const middle = clean.slice(1, -1).map(squash).filter((x) => x.length > 0);
  const firsts = new Set([first, ...(NICKNAMES[first] || [])].filter(Boolean));
  for (const [full, nicks] of Object.entries(NICKNAMES)) if (nicks.includes(first)) firsts.add(full);
  if (first) firsts.add(first[0]);
  // Two-word surnames ("Blunt Rochester", "Van Hollen", "Cortez Masto", "Miller-Meeks").
  const surnames = new Set([surname, ...lastParts]);
  // No roster name: every part of the id may be the surname ("david_spencer_utco").
  if (!(rec && rec.n)) for (const w of clean.map(squash)) if (w.length >= 3) surnames.add(w);
  if (clean.length >= 3) surnames.add(squash(clean.slice(-2).join("")));
  return { known: Boolean(rec && rec.n), first: [...firsts], middle, surnames: [...surnames].filter((x) => x.length > 1), surname, full: squash(clean.join("")), office: String(rec?.o || ""), state: String(rec?.s || "") };
}

// ── Kinds of host ──
const CHAMBER_HOST = /\.(house|senate)\.gov$/;
const COMMITTEE_WORD = /^(?:democrats|republicans|dems|gop|majority|minority|committee|caucus|budget|rules|judiciary|homeland|oversight|appropriations|approps|energycommerce|energy|commerce|financialservices|banking|finance|foreign|foreignaffairs|armedservices|armed|edworkforce|edlabor|help|naturalresources|transportation|waysandmeans|science|agriculture|ag|veterans|vets|smallbusiness|sbc|intelligence|ethics|cha|epw|hsgac|indian|aging|rpc|dpcc|dpc|jec|cecc|leader|majorityleader|democraticleader|republicanleader|speaker|whip|majoritywhip|republicanwhip|democraticwhip|clerk|docs|bioguide|history|kids|chaplain|cao|oig|crs|library|disclosures|lobbyingdisclosure|efd|ecfr|sergeantatarms|uscp|aoc)(?:$|-)/;
const MEMBER_PREFIX = new Set(["rep", "sen", "senator", "congressman", "congresswoman", "leaderarchive", "leader", "whip"]);
// The politician's own turns in an official record (speech pipeline) — not a shared page voice.
const RECORD_TYPE = /\b(?:congressional record|hearing transcript|floor speech|extension of remarks)\b/i;
const RECORD_HOST = /^(?:govinfo\.gov|congress\.gov|bioguide\.congress\.gov)$/;
const VIDEO_HOST = /(?:^|\.)(?:youtube\.com|youtu\.be)$/;
const LEGISLATURE_HOST = /(?:^|\.)(?:legis|legislature|leg|assembly|nyassembly|nysenate|capitol|palegis|le|house\.utleg|senate\.utleg|ilga|mgaleg|malegislature|wisleg|azleg|leg\.wa|cga|njleg|flsenate|myfloridahouse|house\.mo|senate\.mo|ncleg|scstatehouse|tn|lis\.virginia|virginiageneralassembly|kslegislature|akleg|capitol\.hawaii|legislature\.mi|house\.mi|senate\.michigan|mnsenate|house\.mn|oregonlegislature|nmlegis|iowalegislature|legis\.iowa|ohiohouse|ohiosenate|indianahousedemocrats|indianasenaterepublicans|kyleg|legislature\.ky|alison|ga|house\.ga|senate\.ga|txhouse|house\.texas|senate\.texas|capitol\.texas)\b/;
const STATE_GOV = /\.(?:gov|us)$/;
const FEDERAL_AGENCY = /^(?:[a-z0-9-]+\.)*(?:cms|hhs|dhs|doj|justice|state|defense|war|treasury|energy|epa|usda|commerce|labor|dol|ed|hud|va|dot|transportation|interior|doi|nasa|sba|ftc|fcc|sec|fda|cdc|nih|opm|gsa|ustr|usaid|fema|ice|cbp|uscis|irs|ssa|nlrb|eeoc|fec|osc|oge|whitehouse|omb)\.gov$/;

const STATE_ABBR = { alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca", colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga", hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia", kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md", massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms", missouri: "mo", montana: "mt", nebraska: "ne", nevada: "nv", newhampshire: "nh", newjersey: "nj", newmexico: "nm", newyork: "ny", northcarolina: "nc", northdakota: "nd", ohio: "oh", oklahoma: "ok", oregon: "or", pennsylvania: "pa", rhodeisland: "ri", southcarolina: "sc", southdakota: "sd", tennessee: "tn", texas: "tx", utah: "ut", vermont: "vt", virginia: "va", washington: "wa", westvirginia: "wv", wisconsin: "wi", wyoming: "wy" };
const EXEC_OFFICE = [
  { office: /\bgovernor\b/i, not: /\blieutenant|\blt\.?\s/i, host: /(?:^|\.)(?:gov|governor|[a-z]{2}gov|gov[a-z]{2})\./ },
  { office: /\blieutenant governor|\blt\.? gov/i, host: /(?:^|\.)(?:ltgov|lg|ltg|ltgovernor|lieutenantgovernor)\./ },
  { office: /\battorney general\b/i, host: /(?:^|\.)(?:[a-z]{0,12}(?:ag|oag|ago|attorneygeneral|doj)|atg|law|myfloridalegal|texasattorneygeneral)\./ },
  { office: /\bsecretary of state\b/i, host: /(?:^|\.)(?:sos|sec\.state|secretaryofstate|elections)\b/ },
  { office: /\btreasurer\b/i, host: /(?:^|\.)(?:treasurer|treasury|tre)\b/ },
  { office: /\b(?:auditor|comptroller|controller)\b/i, host: /(?:^|\.)(?:auditor|comptroller|controller|sao)\b/ },
  { office: /\bsuperintendent\b/i, host: /(?:^|\.)(?:schools|education|doe|ode|tea|sde|k12)\b/ },
];

/** The site label (squashed) left of the TLD that carries a name, for a chamber host. */
const chamberLabel = (host) => host.replace(CHAMBER_HOST, "").split(".").pop();

/**
 * Does a site label name this politician? Returns "self", "other" or null:
 *   "self"  — the label is their surname (+ only their own first name /
 *             initials / a member prefix), or their full name;
 *   "other" — the label carries their surname plus SOMEONE ELSE's first name
 *             (mikethompson for Bennie Thompson);
 *   null    — the label does not carry their surname at all.
 */
export function labelNames(label, t) {
  const L = squash(label);
  if (!t || !L) return null;
  if (t.full && L.includes(t.full)) return "self";
  for (const sn of t.surnames.slice().sort((a, b) => b.length - a.length)) {
    if (sn.length < 3 || !L.includes(sn)) continue;
    let rest = L.replace(sn, "");
    // Everything left over must be the politician's own: first name or
    // nickname, middle names / initials, or a member prefix.
    const parts = [...MEMBER_PREFIX, ...t.first, ...t.middle, ...t.middle.map((m) => m[0])].filter(Boolean).sort((a, b) => b.length - a.length);
    let changed = true;
    while (rest && changed) {
      changed = false;
      for (const p of parts) if (rest.startsWith(p) || rest.endsWith(p)) { rest = rest.startsWith(p) ? rest.slice(p.length) : rest.slice(0, -p.length); changed = true; break; }
    }
    if (!rest || /^\d+$/.test(rest)) return "self";
    return "other";
  }
  return null;
}

/** Does a non-chamber host name the politician (surname, full name, or a distinctive first name)? */
function hostNames(host, t) {
  const labels = host.split(".").slice(0, -1).map(squash).join("");
  if (!t) return false;
  if (t.full && labels.includes(t.full)) return true;
  if (t.surnames.some((s) => s.length >= 4 && labels.includes(s))) return true;
  // Campaign addresses often use the first name ("ginafortexas.com") — only a
  // distinctive one (5+ letters) with a campaign word, so "johnforcongress" for
  // any John does not pass on the first name alone.
  // Campaign addresses often use a first name or a short surname
  // ("ginafortexas.com", "zach4texas.com", "joinadrian.com", "coyforohio.com"):
  // the name must sit right before "for" / "4", or right after "join" / "vote" /
  // "elect" / "team" / "friendsof", or be a 4+ letter first name beside the
  // state's name — never a first name on its own.
  const host1 = host.split(".").slice(-2, -1)[0] || "";
  const names = [...new Set([...t.first, ...t.surnames, ...t.first.filter((f) => f.length >= 5).map((f) => f.slice(0, 4))].filter((x) => x.length >= 2))];
  const st = t.state ? squash(String(t.state).split(/[·,]/)[0]) : "";
  const sc = stateCode(t.state);
  for (const nm of names) {
    const i = host1.indexOf(nm);
    if (i < 0) continue;
    const after = host1.slice(i + nm.length).replace(/^[a-z]{0,2}(?=for|4)/, "");
    const before = host1.slice(0, i);
    if (/^(?:for|4)/.test(after)) return true;
    if (/(?:join|vote|elect|reelect|team|friendsof|meet|go|choose|with)(?:4|for)?$/.test(before)) return true;
    if (nm.length >= 4 && st && (after.startsWith(st) || before.endsWith(st) || (sc && after === sc))) return true;
  }
  return false;
}

/** Is a quote attributed, in its own words, to this politician ("…,” said Sen. X)? */
export function namedSpeakerQuote(texts, pid) {
  return (texts || []).some((t) => typeof t === "string" && quotedSpeakerOf(t, pid) === "self");
}

const stateCode = (state) => {
  const s = String(state || "").split(/[·,]/)[0].trim();
  return STATE_ABBR[squash(s)] || (/^[A-Z]{2}$/.test(s) ? s.toLowerCase() : "");
};

/**
 * A state or local executive office site of the office this politician holds:
 * governor / AG / secretary of state … sites in their state, or the city /
 * county site of a mayor or county official. Returns true or false.
 */
function execOfficeSite(host, t) {
  const office = t.office || "";
  const sc = stateCode(t.state);
  const stateName = Object.keys(STATE_ABBR).find((k) => STATE_ABBR[k] === sc) || "";
  const labels = host.split(".");
  const inState = Boolean(sc) && (labels.includes(sc) || (stateName && squash(host).includes(stateName)) || labels.slice(0, -1).some((l) => l.startsWith(sc) || l.endsWith(sc)));
  if (inState && EXEC_OFFICE.some((e) => e.office.test(office) && !(e.not && e.not.test(office)) && e.host.test(host + "."))) return true;
  // Mayor of Phoenix → phoenix.gov; "Mayor, West Jordan" → westjordan.utah.gov;
  // "Carbon County Commission" → carbon.utah.gov / carboncounty…
  const place = /\bmayor(?: of|,)\s+([A-Za-z .'-]+)/i.exec(office) || /\b([A-Z][A-Za-z .'-]+?)\s+(?:County|City|Town)\b/.exec(office);
  if (place) {
    const p = squash(place[1]);
    if (p.length >= 3 && squash(labels.slice(0, -1).join("")).startsWith(p)) return true;
  }
  return false;
}

/**
 * Who owns the page? → { own: boolean, kind, reason }.
 * `page`: { link, politicianId, sourceType?, quotes? } — `quotes` are the
 * verbatim excerpts the item rests on (for the named-speaker exception).
 */
export function pageOwnership({ link, politicianId, sourceType = "", quotes = [] } = {}, { people = PEOPLE } = {}) {
  const host = hostOf(link);
  const pid = String(politicianId || "");
  if (!host) return { own: false, kind: "foreign_site", reason: "the page has no readable address" };
  const t = nameTokens(pid, people);
  const st = String(sourceType || "");
  const named = () => namedSpeakerQuote(quotes, pid);

  if (VIDEO_HOST.test(host)) return { own: true, kind: "video", reason: "own-channel video (video pipeline rules)" };
  if (host === "clerk.house.gov") return { own: false, kind: "clerk", reason: "clerk.house.gov is the House Clerk's site, not the member's" };
  if (host === "whitehouse.gov" || host.endsWith(".whitehouse.gov")) {
    if (/\bpresident\b/i.test(t?.office || "") && !/\bvice\b/i.test(t?.office || "")) return { own: true, kind: "office_site", reason: "whitehouse.gov is the President's office site" };
    if (named()) return { own: true, kind: "named_speaker", reason: "White House page, but the quote is attributed to them" };
    return { own: false, kind: "white_house", reason: "a White House page speaks for the administration, not for an individual staff member" };
  }
  if (RECORD_HOST.test(host)) {
    if (RECORD_TYPE.test(st) || host !== "govinfo.gov") return { own: true, kind: "record", reason: "their own turns in an official record" };
    return { own: false, kind: "foreign_site", reason: "a GovInfo page that is not their own record" };
  }
  if (CHAMBER_HOST.test(host)) {
    const label = chamberLabel(host);
    const n = labelNames(label, t);
    if (n === "self") return { own: true, kind: "member_site", reason: `${host} is their own office site` };
    if (COMMITTEE_WORD.test(label) || label.includes("-")) {
      if (named()) return { own: true, kind: "named_speaker", reason: `committee site ${host}, but the quote is attributed to them` };
      return { own: false, kind: "committee", reason: `${host} is a committee / leadership site, and the quote is not attributed to them` };
    }
    if (n === "other") return { own: false, kind: "other_member", reason: `${host} is another member's office site` };
    if (named()) return { own: true, kind: "named_speaker", reason: `${host} is not their site, but the quote is attributed to them` };
    return { own: false, kind: "other_member", reason: `${host} is not their office site` };
  }
  if (FEDERAL_AGENCY.test(host)) {
    if (named()) return { own: true, kind: "named_speaker", reason: `agency site ${host}, but the quote is attributed to them` };
    return { own: false, kind: "agency", reason: `${host} speaks for the agency, not for them personally` };
  }
  // Without a roster name (and office) a government page cannot be matched to
  // the person: only the hard rules above apply to it, and it is kept as
  // configured. A non-government site still has to name them (from the id) or
  // be on file as theirs — the campaign rules below.
  if ((!t || !t.known) && (STATE_GOV.test(host) || LEGISLATURE_HOST.test(host))) return { own: true, kind: "unverified_name", reason: "no roster name on file to check this government address against; kept as configured" };
  const execOffice = t && t.known ? execOfficeSite(host, t) : false;
  if (execOffice) return { own: true, kind: "office_site", reason: `${host} is the ${t.office} office site` };
  if (STATE_GOV.test(host) || LEGISLATURE_HOST.test(host)) {
    const path = squash(pathOf(link));
    if (hostNames(host, t)) return { own: true, kind: /legis|assembly|senate|house|capitol/.test(host) ? "legislature_member_page" : "office_site", reason: `${host} names them` };
    const isLeg = LEGISLATURE_HOST.test(host) || /\b(?:legislat\w*|assembly|senate|house)\b/i.test(st) || /\.(?:senate|assembly)\.[a-z]{2}\.gov$/.test(host);
    if (isLeg) {
      if (t.surnames.some((s) => s.length >= 3 && path.includes(s))) return { own: true, kind: "legislature_member_page", reason: "a legislature page whose address names the member" };
      // California-style district sites (sd05.senate.ca.gov, a27.asmdc.org):
      // the district number must be theirs.
      const dm = /^(?:s[dr]|ad?|hd)0*(\d{1,3})\./.exec(host);
      const seat = /(?:\b(?:SD|HD|AD|District)[-\s]*0*)(\d{1,3})\b/i.exec(`${t.state} ${t.office}`);
      if (dm && seat && dm[1] === seat[1]) return { own: true, kind: "legislature_member_page", reason: `${host} is their district office site` };
      // The legislature's own directory resolved this district site for them.
      if (dm && /member page/i.test(st)) return { own: true, kind: "legislature_member_page", reason: `${host} is their district office site (legislature directory)` };
      if (citedOnlyFor(host, pid)) return { own: true, kind: "legislature_member_page", reason: `${host} is on file as their own legislature site` };
      // A member page the legislature's own directory resolved for them
      // (legislature.vermont.gov/people/single/2026/37410) — never a bill page.
      if (/member page/i.test(st) && /\/(?:people|members?|legislators?|senators?|representatives?|mem)\b/i.test(pathOf(link)) && !/\/(?:bills?|legislation|statute)/i.test(pathOf(link))) {
        return { own: true, kind: "legislature_member_page", reason: "their member page in the legislature's own directory" };
      }
      if (named()) return { own: true, kind: "named_speaker", reason: "legislature page, but the quote is attributed to them" };
      return { own: false, kind: "legislature_other", reason: `a ${host} page that is not the member's own page (bill, chamber, caucus or another member)` };
    }
    if (citedOnlyFor(host, pid)) return { own: true, kind: "office_site", reason: `${host} is on file as their own office site` };
    if (named()) return { own: true, kind: "named_speaker", reason: `${host} is not their site, but the quote is attributed to them` };
    return { own: false, kind: "foreign_site", reason: `${host} is not their office site` };
  }
  // Campaign / personal site.
  if (hostNames(host, t)) return { own: true, kind: "campaign_site", reason: `${host} names them` };
  if (citedOnlyFor(host, pid)) return { own: true, kind: "campaign_site", reason: `${host} is on file as their own site` };
  if (/\bcampaign\b.*\b(?:own|the politician's own)\b|\(the politician's own\)/i.test(st)) return { own: true, kind: "campaign_site", reason: `${host} was verified as their own campaign site when it was added` };
  if (named()) return { own: true, kind: "named_speaker", reason: `${host} is not their site, but the quote is attributed to them` };
  return { own: false, kind: "foreign_site", reason: `${host} neither names them nor is on file as their site` };
}

/** pageOwnership for a stored Locker item (or a spotlight-shape entry). */
export function itemOwnership(doc) {
  const d = doc || {};
  const pl = d.pipeline || {};
  return pageOwnership({
    link: d.link || d.source?.url,
    politicianId: d.politician_id || pl.politician_id,
    sourceType: d.source_type || pl.source_type,
    quotes: [...(Array.isArray(d.excerpts) ? d.excerpts : []), d.excerpt || pl.excerpt].filter(Boolean),
  });
}
