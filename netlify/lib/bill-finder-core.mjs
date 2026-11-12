// ═══════════════════════════════════════════════════════════════════════════
// bill-finder-core.mjs — the shared bill finder (v1)
//
// Given one page of a politician's text (campaign page, press release, speech,
// bill text, roll-call line), returns the CANDIDATE BILLS the page refers to.
// It is key-agnostic: it says which bills a page points at, never what the
// page says about them. Mapping a found bill onto an issue key is a separate,
// per-key step (bill-key-patterns.mjs).
//
// Three kinds of reference are found:
//   · number       a federal bill number: H.R., S., H.Res., S.Res., H.J.Res.,
//                  S.J.Res., H.Con.Res., S.Con.Res., H.Amdt., S.Amdt. — with
//                  or without periods and spaces ("H R 8035", "SJRES 111").
//                  The page's own URL is read too (govinfo BILLS-… packages,
//                  congress.gov bill pages), so a bill-text page names its bill.
//                  State bill numbers (SB 2, HB 45, SJR 3) are returned as
//                  `state_number`, unresolved.
//   · short_title  a short title: every short title in the bill catalog
//                  (db/bill-docs.json) that appears in the text, plus any other
//                  capitalised "… Act" / "… Act of 2024" name (unresolved).
//   · phrase       a descriptive phrase that clearly points at ONE measure of
//                  a known family — "the resolution to disapprove the arms
//                  sale", "these resolutions", "my war powers resolution",
//                  "the Ukraine supplemental", "Providing for congressional
//                  disapproval of the proposed foreign military sale …".
//                  A phrase is resolved against the catalog by family + country
//                  named nearby + the source date (+ the politician as sponsor);
//                  the result can be one bill, several (ambiguous) or none.
//
// Pure: no I/O. The catalog is passed in (catalogFromBillDocs).
// Nothing here is wired into the site.
// ═══════════════════════════════════════════════════════════════════════════
import { extractSentenceBlocks } from "./stance-score-core.mjs";

export const FINDER_VERSION = "bill-finder-v1";

// ─── Bill numbers ───────────────────────────────────────────────────────────
// Single letters are upper-case only; the word parts (Con, Res, Amdt) match any
// case so "SJRES", "S.J.Res." and "S. J. Res." all read.
const ci = (w) => w.split("").map((c) => `[${c.toUpperCase()}${c.toLowerCase()}]`).join("");
const part = (p) => `${p}\\.?\\s?`;
const FEDERAL_TYPES = [
  // [canonical, pattern] — longest first so H.Con.Res. never reads as H. …
  ["H.Con.Res.", part("H") + part(ci("con")) + part(ci("res"))],
  ["S.Con.Res.", part("S") + part(ci("con")) + part(ci("res"))],
  ["H.J.Res.", part("H") + part("J") + part(ci("res"))],
  ["S.J.Res.", part("S") + part("J") + part(ci("res"))],
  ["H.Res.", part("H") + part(ci("res"))],
  ["S.Res.", part("S") + part(ci("res"))],
  ["H.Amdt.", part("H") + part(ci("amdt"))],
  ["S.Amdt.", part("S") + part(ci("amdt"))],
  ["H.R.", part("H") + part("R")],
  // A bare Senate bill needs its period ("S. 1655"), so "S 5" or a plural "s" never reads.
  ["S.", "S\\.\\s?"],
];
const FEDERAL_NUMBER = new RegExp(`(?<![\\w.])(?:${FEDERAL_TYPES.map(([, p], i) => `(?<t${i}>${p})`).join("|")})(?<n>\\d{1,5})\\b(?![.,]\\d)`, "g");
const STATE_NUMBER = /(?<![\w.])(?<t>S\.?\s?B|H\.?\s?B|S\.?\s?J\.?\s?R|H\.?\s?J\.?\s?R|S\.?\s?C\.?\s?R|H\.?\s?C\.?\s?R)\.?\s?(?<n>\d{1,4})\b(?![.,]\d)/g;

// URL forms of a bill identity.
const GOVINFO_TYPES = { hr: "H.R.", s: "S.", hres: "H.Res.", sres: "S.Res.", hjres: "H.J.Res.", sjres: "S.J.Res.", hconres: "H.Con.Res.", sconres: "S.Con.Res." };
const CONGRESS_GOV_TYPES = { "house-bill": "H.R.", "senate-bill": "S.", "house-resolution": "H.Res.", "senate-resolution": "S.Res.",
  "house-joint-resolution": "H.J.Res.", "senate-joint-resolution": "S.J.Res.", "house-concurrent-resolution": "H.Con.Res.",
  "senate-concurrent-resolution": "S.Con.Res.", "house-amendment": "H.Amdt.", "senate-amendment": "S.Amdt." };

/** "H.R." + "8035" → "H.R. 8035" */
export const billNumber = (type, n) => `${type} ${Number(n)}`;

/** The Congress sitting on a date ("2024-11-20" → 118). A Congress starts on 3 January of an odd year. */
export function congressForDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ""));
  if (!m) return null;
  let y = Number(m[1]);
  if (y % 2 === 1 && m[2] === "01" && Number(m[3]) < 3) y -= 1;
  return Math.floor((y - 1789) / 2) + 1;
}

/** The bill a URL itself identifies (bill text / bill page), or null. */
export function billFromUrl(url) {
  const u = String(url || "");
  let m = /BILLS-(\d{3})(hconres|sconres|hjres|sjres|hres|sres|hr|s)(\d+)[a-z]*/i.exec(u);
  if (m) return { congress: Number(m[1]), bill: billNumber(GOVINFO_TYPES[m[2].toLowerCase()], m[3]) };
  m = /congress\.gov\/bill\/(\d{3})(?:st|nd|rd|th)-congress\/([a-z-]+)\/(\d+)/i.exec(u);
  if (m && CONGRESS_GOV_TYPES[m[2].toLowerCase()]) return { congress: Number(m[1]), bill: billNumber(CONGRESS_GOV_TYPES[m[2].toLowerCase()], m[3]) };
  return null;
}

/** The Congress a page's URL places it in (roll-call and bill URLs), or null. */
export function congressFromUrl(url) {
  const u = String(url || "");
  const own = billFromUrl(u);
  if (own) return own.congress;
  let m = /vote_(\d{3})_\d_\d+/.exec(u);
  if (m) return Number(m[1]);
  m = /clerk\.house\.gov\/evs\/(\d{4})\//.exec(u);
  if (m) return congressForDate(`${m[1]}-06-01`);
  return null;
}

/** Headline words from a URL slug ("…/news-sanders-files-joint-resolutions-…/" → "news sanders files joint resolutions …"). */
export function urlSlugText(url) {
  try {
    const segs = new URL(String(url)).pathname.split("/").filter((s) => (s.match(/-/g) || []).length >= 3);
    return segs.map((s) => decodeURIComponent(s).replace(/\.\w{2,5}$/, "").replace(/[-_]+/g, " ").trim()).join(" · ") || "";
  } catch { return ""; }
}

// ─── Catalog ────────────────────────────────────────────────────────────────
// Long-title openers: these rows have no short title to look for in text.
const LONG_TITLE = /^(?:A |An |To |Providing|Directing|Making|Expressing|Requesting|Disapproving|Authorizing|Relating|Proposing|Condemning|Recognizing|Supporting|Calling|Raising|Amending|Establishing|Declaring|Honoring|Electing)/i;
const TITLE_YEAR = /,?\s+(?:of\s+)?(\d{4})$/;
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The finder's catalog from db/bill-docs.json: bills by id ("118|S.J.Res. 111"),
 * the short titles to look for, and each bill's dates and sponsors for
 * resolving descriptive phrases.
 */
export function catalogFromBillDocs(billDocs) {
  const rows = Object.entries(billDocs?.docs || {}).map(([id, d]) => ({
    id, congress: Number(d.s), bill: d.n, title: d.t || "", chamber: d.c || null, status: d.st || null,
    issue_keys: [...new Set((d.m || []).map((m) => m.k).filter(Boolean))],
    introduced: d.o?.d || null,
    action_dates: [...new Set((d.h || []).map((h) => h.d).filter(Boolean))],
    sponsors: [...(d.sp?.s || []), ...(d.sp?.f || [])], cosponsors: d.sp?.c || [],
    record: d.rs || null,
  }));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const groups = new Map();
  for (const r of rows) {
    const t = r.title.trim();
    if (!t || LONG_TITLE.test(t) || t.includes(" — ") || t.length > 120 || t.split(/\s+/).length < 2) continue;
    const ym = TITLE_YEAR.exec(t);
    const base = ym ? t.slice(0, ym.index) : t;
    if (base.split(/\s+/).length < 2) continue;
    const k = base.toLowerCase();
    if (!groups.has(k)) groups.set(k, { base, re: new RegExp(`(?<![\\w])${escRe(base).replace(/\\ |\s+/g, "\\s+")}(?:,?\\s+(?:of\\s+)?(\\d{4}))?(?![\\w])`, "i"), rows: [] });
    groups.get(k).rows.push({ ...r, year: ym ? ym[1] : null });
  }
  return { rows, byId, shortTitles: [...groups.values()] };
}

// ─── Descriptive phrases ────────────────────────────────────────────────────
// Each family names a kind of measure; a phrase points at ONE measure of that
// kind. `title` is how the catalog titles that kind (for resolution).
const COUNTRIES = ["Israel", "Iran", "Ukraine", "Venezuela", "Yemen", "Lebanon", "Syria", "Saudi Arabia", "Qatar", "United Arab Emirates", "Bahrain", "Turkey", "Egypt", "Taiwan", "Russia", "China", "Mexico"];
const COUNTRY_RE = new RegExp(`\\b(${COUNTRIES.join("|")})\\b`, "gi");
const COUNTRY_ALIAS = { "islamic republic": "Iran", tehran: "Iran", kyiv: "Ukraine", gaza: "Israel", idf: "Israel", "government of israel": "Israel" };
const ALIAS_RE = new RegExp(`\\b(${Object.keys(COUNTRY_ALIAS).join("|")})\\b`, "gi");

export const PHRASE_FAMILIES = [
  { family: "disapproval", label: "resolution of disapproval (arms sale / export / rule)",
    title: /congressional disapproval|disapproving/i,
    patterns: [
      /\b(?:joint |concurrent )?resolutions? (?:of|providing for(?: congressional)?) disapproval\b/i,
      /\bcongressional disapproval of the proposed (?:foreign military sale|(?:license amendment for the )?export|direct commercial sale)\b/i,
      /\bresolutions? to (?:disapprove|block|stop|halt|reject)\b[^.!?·]{0,80}?\b(?:sales?|transfers?|exports?|rule)\b/i,
      /\bvote to block\b[^.!?·]{0,60}?\b(?:arms|weapons?|weaponry|munitions)(?: sales?)?\b/i,
      /\bblock\w* the (?:proposed )?(?:sale|transfer) of \$[\d.,]+\s*(?:million|billion)\b/i,
    ],
    // "these resolutions" counts only when the sentence says what kind of measure it is.
    anaphora: /\b(?:these|those|the|my|our|both|two|three|four|five|six) (?:joint )?resolutions?\b/i,
    anaphoraNeeds: /\b(?:disapprov\w*|block\w*|arms|weapons?|weaponry|munitions|bombs|sales?)\b/i },
  { family: "war_powers", label: "war powers resolution (remove U.S. forces from hostilities)",
    title: /war powers resolution|removal of united states armed forces|remove united states armed forces/i,
    patterns: [
      // "section 5(c) of the War Powers Resolution" is the 1973 statute, not a bill.
      /(?<!\b(?:of|under|pursuant to|with|violat\w*) )\b(?:a|an|my|our|his|her|this|their|bipartisan|new|privileged|the)\s+(?:[A-Z][a-z]+\s+)?war powers resolution\b(?! of 1973)/i,
      /\bdirect(?:ing|s|ed)? the (?:president\b[^.!?·]{0,80}?\bto remove|removal of) united states armed forces from\b[^.!?·]{0,60}?\bhostilities\b/i,
      /\bresolutions? to (?:remove|withdraw|end|direct the removal of)\b[^.!?·]{0,60}?\b(?:forces|troops|hostilities|war)\b/i,
    ] },
  { family: "supplemental", label: "supplemental appropriations bill",
    title: /supplemental/i,
    patterns: [
      // Case-sensitive so the optional word is a name ("the Ukraine supplemental");
      // programs named "Supplemental …" (SNAP, SSI, Medigap) are not bills.
      /\b[Tt]he (?:[A-Z][a-z]+ )?(?:[Ss]ecurity |[Ee]mergency |[Ff]oreign [Aa]id )?[Ss]upplemental\b(?!\s+(?:[Nn]utrition|[Ss]ecurity [Ii]ncome|[Pp]overty|[Ii]nsurance|[Pp]lans?|[Cc]overage|[Bb]enefits?|[Ss]ecurity [Oo]pportunity))(?: appropriations(?: bill)?| aid package| package| bill)?/,
    ] },
];

const countriesIn = (text) => {
  const out = new Set();
  for (const m of String(text).matchAll(COUNTRY_RE)) out.add(COUNTRIES.find((c) => c.toLowerCase() === m[1].toLowerCase()));
  for (const m of String(text).matchAll(ALIAS_RE)) out.add(COUNTRY_ALIAS[m[1].toLowerCase()]);
  return [...out];
};
const days = (a, b) => (Date.parse(a) - Date.parse(b)) / 86_400_000;

// Resolution window: a phrase on a dated page points at a measure introduced
// from 3 days before to 21 days after the page (filing announcements precede
// formal introduction), or with any recorded action within 3 days of it.
export const RESOLVE_INTRO_WINDOW = [-3, 21];
export const RESOLVE_ACTION_WINDOW = 3;

/** Catalog bills a descriptive phrase can be (family + country + date [+ sponsor]). */
export function resolvePhrase({ family, countries, date, politician_id }, catalog) {
  const fam = PHRASE_FAMILIES.find((f) => f.family === family);
  if (!fam || !catalog || !countries.length || !date) return { resolves_to: [], why: !countries.length ? "no country named near the phrase" : !date ? "source has no date" : "unknown family" };
  const near = catalog.rows.filter((r) => fam.title.test(r.title) && countries.some((c) => r.title.toLowerCase().includes(c.toLowerCase()))).flatMap((r) => {
    const intro = r.introduced ? days(r.introduced, date) : null;
    if (intro !== null && intro >= RESOLVE_INTRO_WINDOW[0] && intro <= RESOLVE_INTRO_WINDOW[1]) return [{ r, why: `introduced ${r.introduced} (${intro >= 0 ? "+" : ""}${Math.round(intro)} days)` }];
    const act = r.action_dates.find((d) => Math.abs(days(d, date)) <= RESOLVE_ACTION_WINDOW);
    return act ? [{ r, why: `action on ${act}` }] : [];
  });
  const own = politician_id ? near.filter(({ r }) => r.sponsors.includes(politician_id) || r.cosponsors.includes(politician_id)) : [];
  const pick = own.length ? own : near;
  return {
    resolves_to: pick.map(({ r, why }) => ({ id: r.id, bill: r.bill, congress: r.congress, title: r.title,
      why: `${fam.label}; names ${countries.filter((c) => r.title.toLowerCase().includes(c.toLowerCase())).join(", ")}; ${why}${own.length ? "; politician is a sponsor" : ""}` })),
    why: pick.length ? null : "no catalog measure of that family and country near the source date",
  };
}

// ─── The finder ─────────────────────────────────────────────────────────────
// No commas inside a name (a list ends it); an ordinal may lead ("21st Century Cures Act").
const GENERIC_ACT = /(?:\b\d{1,3}(?:st|nd|rd|th)\s+)?\b(?:[A-Z][\w'’-]*\s+(?:(?:of|for|and|the|to|in|on|&)\s+)*){1,10}Act\b(?:,?\s+(?:of\s+)?\d{4})?/g;
// A sentence run into a name ("… Trump in the Working Families Tax Cut Act",
// "… Made Possible Through Cornyn-Supported …"): keep what follows the break.
const NAME_BREAK = /^.*\b(?:in the|through the|by the|via the|Through|Via|Enacted|Passed|Signed)\s+/;
const LEAD_STOP = /^(?:(?:The|This|That|These|Those|A|An|Under|Our|His|Her|Their|My|Its|In|On|To|For|And|Of|With|By|Pass|Passed|Passing|Support|Supported|Supporting|Oppose|Opposed|Cosponsor|Cosponsored|Sponsored|Introduced|Signed|Vote|Voted|Repeal|Protect|Through|From|Since|After|Before|When|While|If|As|At|But|So|Like|Including)\s+)+/;
// Spaced prefixes ("S. J. Res. 41", "H. Con. Res. 38") are closed up before the
// sentence splitter runs, which would otherwise end a sentence at "S." or "J.".
// "H.Amdt. 478" loses its space too: the splitter only knows the H.R./Res. forms.
const closeUp = (html) => String(html)
  .replace(/\b([HS])\.\s+(?:(J|Con)\.\s+)?(Res|Amdt)\.\s*(?=\d)/g, (_, c, m, r) => `${c}.${m ? `${m}.` : ""}${r}. `)
  .replace(/\b([HS])\.\s?Amdt\.\s+(?=\d)/g, "$1.Amdt.");
const bodyHtml = (page) => closeUp(page.body ?? `<p>${String(page.text || "").replace(/</g, "&lt;")}</p>`);

/**
 * findBills(page, { catalog }) → { candidates, sentences }
 *   page: { body (HTML) | text, url, date (YYYY-MM-DD), politician_id, source_type }
 * Each candidate: { id, bill, congress, kind, origin, in_catalog, catalog, mentions[], resolves_to? }
 *   mentions[]: { kind, origin, match, span: { text, block, sentence }, window: [sentence…] }
 */
export function findBills(page, { catalog = null } = {}) {
  const blocks = extractSentenceBlocks(bodyHtml(page));
  const sentences = blocks.map((b, i) => ({ text: b.text, block: b.block, sentence: i }));
  const windowOf = (i) => sentences.filter((s) => Math.abs(s.sentence - i) <= 1 && s.block === sentences[i].block).map((s) => s.text);
  const urlCongress = congressFromUrl(page.url);
  const hint = urlCongress ?? congressForDate(page.date);
  // Where a number's Congress came from. "date" is a guess: an older bill, or a
  // state bill numbered like a federal one (Vermont's "S.60"), can sit on the page.
  const hintFrom = urlCongress ? "url" : hint ? "date" : null;
  const congressIn = (text) => { const m = /\b(\d{3})(?:st|nd|rd|th) Congress\b/i.exec(text); return m ? Number(m[1]) : null; };
  const mentions = [];
  const push = (m) => mentions.push(m);

  // The page's own URL: a bill-text or bill page names its bill.
  const own = billFromUrl(page.url);
  if (own) push({ kind: "number", origin: "url", bill: own.bill, congress: own.congress, congress_from: "url", match: page.url,
    span: { text: page.url, block: null, sentence: null }, window: sentences.slice(0, 6).map((s) => s.text) });

  const scan = (s, origin) => {
    const text = s.text;
    const taken = [];
    const overlaps = (a, b) => taken.some(([x, y]) => a < y && b > x);
    const base = { origin, span: { text, block: s.block, sentence: s.sentence }, window: s.sentence == null ? [text] : windowOf(s.sentence) };
    if (origin === "text") {
      for (const m of text.matchAll(FEDERAL_NUMBER)) {
        const i = Object.keys(m.groups).find((k) => k.startsWith("t") && m.groups[k] !== undefined);
        const type = FEDERAL_TYPES[Number(i.slice(1))][0];
        taken.push([m.index, m.index + m[0].length]);
        const inText = congressIn(text);
        push({ ...base, kind: "number", bill: billNumber(type, m.groups.n), congress: inText ?? hint, congress_from: inText ? "text" : hintFrom, match: m[0] });
      }
      for (const m of text.matchAll(STATE_NUMBER)) {
        if (overlaps(m.index, m.index + m[0].length)) continue;
        taken.push([m.index, m.index + m[0].length]);
        push({ ...base, kind: "state_number", bill: `${m.groups.t.replace(/[.\s]/g, "")} ${Number(m.groups.n)}`, congress: null, match: m[0] });
      }
    }
    // Catalog short titles (case-insensitive, so URL slugs read too).
    if (catalog) {
      const low = text.toLowerCase();
      for (const g of catalog.shortTitles) {
        if (!low.includes(g.base.toLowerCase().split(/\s+/)[0])) continue;
        const m = g.re.exec(text);
        if (!m) continue;
        const rows = m[1] ? g.rows.filter((r) => r.year === m[1]) : g.rows;
        if (!rows.length) continue;
        taken.push([m.index, m.index + m[0].length]);
        push({ ...base, kind: "short_title", match: m[0], title_rows: rows.map((r) => r.id) });
      }
    }
    // Other "… Act" names, not in the catalog.
    if (origin === "text") {
      for (const m of text.matchAll(GENERIC_ACT)) {
        const name = m[0].replace(NAME_BREAK, "").replace(LEAD_STOP, "");
        const start = m.index + (m[0].length - name.length);
        if (overlaps(start, m.index + m[0].length) || name.split(/\s+/).length < 3 || !/^[A-Z]/.test(name)) continue;
        taken.push([start, m.index + m[0].length]);
        push({ ...base, kind: "short_title", match: name, title_rows: [] });
      }
    }
    // Descriptive phrases.
    for (const fam of PHRASE_FAMILIES) {
      let hit = null;
      for (const re of fam.patterns) { const m = re.exec(text); if (m) { hit = m; break; } }
      if (!hit && fam.anaphora && fam.anaphora.test(text) && fam.anaphoraNeeds.test(text)) hit = fam.anaphora.exec(text);
      if (!hit || overlaps(hit.index, hit.index + hit[0].length)) continue;
      push({ ...base, kind: "phrase", family: fam.family, match: hit[0], countries: countriesIn(base.window.join(" ")) });
    }
  };
  for (const s of sentences) scan(s, "text");
  const slug = urlSlugText(page.url);
  if (slug) scan({ text: slug, block: null, sentence: null }, "url_slug");

  return { candidates: groupMentions(mentions, page, catalog, own), sentences: sentences.length };
}

const keyOf = (congress, bill) => (congress ? `${congress}|${bill}` : `?|${bill}`);

function groupMentions(mentions, page, catalog, own) {
  const byKey = new Map();
  const add = (k, seed, m) => {
    if (!byKey.has(k)) byKey.set(k, { ...seed, mentions: [] });
    byKey.get(k).mentions.push(strip(m));
  };
  const strip = ({ kind, origin, match, span, window, family, countries, congress_from }) => ({ kind, origin, match, span, window, ...(congress_from ? { congress_from } : {}), ...(family ? { family, countries } : {}) });
  const seedFor = (congress, bill, kind) => {
    const row = catalog && congress ? catalog.byId.get(keyOf(congress, bill)) : null;
    return { id: row ? row.id : keyOf(congress, bill), bill, congress, kind, in_catalog: !!row, catalog: row ? brief(row) : null };
  };
  // 1. Numbers.
  for (const m of mentions.filter((x) => x.kind === "number" || x.kind === "state_number"))
    add(m.kind === "state_number" ? `state|${m.bill}` : keyOf(m.congress, m.bill), m.kind === "state_number"
      ? { id: `state|${m.bill}`, bill: m.bill, congress: null, kind: "state_number", in_catalog: false, catalog: null } : seedFor(m.congress, m.bill, "number"), m);
  // 2. Short titles: one catalog row → that bill; several → ambiguous; none → unresolved name.
  for (const m of mentions.filter((x) => x.kind === "short_title")) {
    const rows = (m.title_rows || []).map((id) => catalog.byId.get(id));
    const sameNumber = rows.find((r) => byKey.has(r.id));
    if (sameNumber || rows.length === 1) { const r = sameNumber || rows[0]; add(r.id, seedFor(r.congress, r.bill, "short_title"), m); continue; }
    const k = `title|${m.match.toLowerCase()}`;
    add(k, { id: null, bill: null, congress: null, kind: "short_title", in_catalog: rows.length > 0, catalog: null, name: m.match,
      ...(rows.length ? { resolves_to: rows.map((r) => ({ id: r.id, bill: r.bill, congress: r.congress, title: r.title, why: "same short title" })) } : {}) }, m);
  }
  // 3. Phrases. On a page that is itself a bill's text (URL-identified), every
  // phrase is that bill describing itself. Otherwise resolve against the catalog;
  // a phrase that resolves to a bill already named on the page folds into it.
  for (const m of mentions.filter((x) => x.kind === "phrase")) {
    if (own) { add(keyOf(own.congress, own.bill), seedFor(own.congress, own.bill, "number"), m); continue; }
    const res = resolvePhrase({ family: m.family, countries: m.countries, date: page.date, politician_id: page.politician_id }, catalog);
    const named = res.resolves_to.filter((r) => byKey.has(r.id));
    if (named.length === 1) { add(named[0].id, null, m); continue; }
    if (res.resolves_to.length === 1) { const r = catalog.byId.get(res.resolves_to[0].id); add(r.id, { ...seedFor(r.congress, r.bill, "phrase"), resolved_by: res.resolves_to[0].why }, m); continue; }
    const k = `phrase|${m.family}|${res.resolves_to.map((r) => r.id).join(",") || m.countries.join(",")}`;
    add(k, { id: null, bill: null, congress: null, kind: "phrase", family: m.family, in_catalog: false, catalog: null,
      resolves_to: res.resolves_to, ...(res.why ? { unresolved: res.why } : {}) }, m);
  }
  return [...byKey.values()];
}

const brief = (r) => ({ title: r.title, issue_keys: r.issue_keys, introduced: r.introduced, status: r.status, sponsors: r.sponsors, record: r.record });
