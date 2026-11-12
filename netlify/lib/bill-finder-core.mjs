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
//
// v3 adds each mention's DOCUMENT IDEA (`doc`, see docIdeasFor): the same
// document scope, cut by measure rather than by subject, for keys whose
// subject the stance scorer's spans do not track (tariffs_china,
// border_security). The subject idea (`idea`) is unchanged.
// ═══════════════════════════════════════════════════════════════════════════
import { extractSentenceBlocks, subjectSpans, spanScopeFor, TRANSITION } from "./stance-score-core.mjs";

export const FINDER_VERSION = "bill-finder-v3";

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
const NAME_BREAK = /^.*\b(?:in the|through the|by the|via the|and the|Through|Via|Enacted|Passed|Signed)\s+/;
const LEAD_STOP = /^(?:(?:The|This|That|These|Those|A|An|Under|Our|His|Her|Their|My|Its|In|On|To|For|And|Of|With|By|Pass|Passed|Passing|Support|Supports|Supported|Supporting|Oppose|Opposes|Opposed|Backs|Cosponsor|Cosponsored|Sponsored|Introduced|Signed|Vote|Voted|Repeal|Protect|Through|From|Since|After|Before|When|While|If|As|At|But|So|Like|Including)\s+)+/;
// Spaced prefixes ("S. J. Res. 41", "H. Con. Res. 38") are closed up before the
// sentence splitter runs, which would otherwise end a sentence at "S." or "J.".
// "H.Amdt. 478" loses its space too: the splitter only knows the H.R./Res. forms.
const closeUp = (html) => String(html)
  .replace(/\b([HS])\.\s+(?:(J|Con)\.\s+)?(Res|Amdt)\.\s*(?=\d)/g, (_, c, m, r) => `${c}.${m ? `${m}.` : ""}${r}. `)
  .replace(/\b([HS])\.\s?Amdt\.\s+(?=\d)/g, "$1.Amdt.");
const bodyHtml = (page) => closeUp(page.body ?? `<p>${String(page.text || "").replace(/</g, "&lt;")}</p>`);

// ─── Idea scope (v2) ─────────────────────────────────────────────────────────
// A mention's evidence is its IDEA, not the sentences next to it. The finder
// reads the same subject spans the stance scorer reads (subjectSpans in
// stance-score-core.mjs), with the same scope rule: a speech, interview, press
// release, statement or bill text is ONE document scope; a campaign issue page
// or roll call keeps the paragraph scope. Inside a scope:
//   · the mention's idea is the subject span it sits in — across paragraphs,
//     until a clear change (another country, a transition, a heading, another
//     issue, a distinct new measure, or the safety-valve gap);
//   · a mention in a sentence with no subject (e.g. "Today I voted against
//     H.R. 8035.") joins the nearest span in the same scope — forward first —
//     unless another bill is named in between;
//   · another span in the same scope joins the idea when it names the same bill
//     again or refers back to it ("the bill", "this package", "it also …") and
//     names no other bill — so one package's Ukraine and Israel provisions
//     both belong to the package;
//   · on a bill-text page (the URL names the bill) the whole document is the
//     bill's idea.
// Every idea sentence keeps its own subject and facet, so a key reads only the
// part of the idea that is about it: distinct provisions (offensive vs.
// defensive arms, Ukraine aid vs. Israel aid) map independently.
const BACK_REFERENCE = /\b(?:(?:the|this|that) (?:bill|package|legislation|measure|act|supplemental|resolution|amendment)|it also|the same (?:bill|package|resolution))\b/i;

function ideasFor(mentions, sentences, html, { own, scope }) {
  const spans = subjectSpans(sentences.map((x) => x.text), html, { scope });
  const ident = (m) => (m.kind === "number" || m.kind === "state_number" ? m.bill : m.match.toLowerCase());
  const billsAt = new Map(); // sentence → identities named there
  for (const m of mentions) if (m.span.sentence != null && m.kind !== "phrase") {
    if (!billsAt.has(m.span.sentence)) billsAt.set(m.span.sentence, new Set());
    billsAt.get(m.span.sentence).add(ident(m));
  }
  const entry = (k, i) => ({ id: k, text: sentences[k].text, sentence: k, subject: spans[k].subject, ...(spans[k].subjects ? { subjects: spans[k].subjects } : {}),
    ...(spans[k].facet ? { facet: spans[k].facet } : {}), ...(k === i ? { mention: true } : {}) });
  const whole = sentences.map((_, k) => entry(k, -1));
  const otherBill = (k, id) => [...(billsAt.get(k) || [])].some((x) => x !== id);
  for (const m of mentions) {
    const i = m.span.sentence;
    if (m.origin === "url_slug") { m.idea = [{ id: "slug", text: m.span.text, slug: true, mention: true }]; continue; }
    if (i == null || own) { m.idea = i == null ? whole : whole.map((e) => (e.sentence === i ? { ...e, mention: true } : e)); continue; }
    const sc = spans[i].scope, id = ident(m);
    const linked = new Set();
    if (spans[i].span) linked.add(spans[i].span);
    else {
      const look = (dir) => {
        for (let j = i + dir; j >= 0 && j < sentences.length && spans[j].scope === sc; j += dir) {
          if (otherBill(j, id)) return null;
          if (spans[j].span) return spans[j].span;
        }
        return null;
      };
      const near = look(1) ?? look(-1);
      if (near) linked.add(near);
    }
    // Spans that come back to this bill (re-named, or referred to) and name no other bill.
    const bySpan = new Map();
    for (let k = 0; k < sentences.length; k++) if (spans[k].scope === sc && spans[k].span && !linked.has(spans[k].span)) {
      if (!bySpan.has(spans[k].span)) bySpan.set(spans[k].span, []);
      bySpan.get(spans[k].span).push(k);
    }
    for (const [sp, ks] of bySpan) {
      if (ks.some((k) => otherBill(k, id))) continue;
      if (ks.some((k) => billsAt.get(k)?.has(id) || BACK_REFERENCE.test(sentences[k].text))) linked.add(sp);
    }
    m.idea = sentences.map((_, k) => k).filter((k) => k === i || (spans[k].scope === sc && linked.has(spans[k].span))).map((k) => entry(k, i));
  }
  return spans;
}

// ─── Page-local titles (v3) ──────────────────────────────────────────────────
// A page that writes a bill's number and its title together ("H.R. 2811- the
// Limit, Save, Grow Act of 2023", "the Secure the Border Act (H.R. 2)") has
// told us the title's bill. Every later use of that title on the page is that
// bill, even when the catalog lacks it or the generic "… Act" reader cannot
// read it (a name with commas).
const AFTER_NUMBER = /^\s*(?:[-–—:,]\s*)?(?:the\s+)?((?:[A-Z][\w'’-]*,?\s+(?:(?:of|for|and|the|to|in|on|&)\s+)*){1,10}Act)\b(?:,?\s+(?:of\s+)?\d{4})?/;
const BEFORE_NUMBER = /((?:[A-Z][\w'’-]*,?\s+(?:(?:of|for|and|the|to|in|on|&)\s+)*){1,10}Act)\b(?:,?\s+(?:of\s+)?\d{4})?\s*\(\s*$/;
function pageAliases(mentions, sentences) {
  const aliases = new Map();
  for (const m of mentions) {
    if (m.kind !== "number" || m.origin !== "text") continue;
    const text = m.span.text, at = text.indexOf(m.match);
    if (at < 0) continue;
    const after = AFTER_NUMBER.exec(text.slice(at + m.match.length));
    const before = BEFORE_NUMBER.exec(text.slice(0, at));
    const name = ((after && after[1]) || (before && before[1]) || "").replace(LEAD_STOP, "").replace(/,$/, "");
    if (name.split(/\s+/).length < 3 || !/^[A-Z]/.test(name)) continue;
    if (!aliases.has(name)) aliases.set(name, { bill: m.bill, congress: m.congress, congress_from: m.congress_from });
  }
  for (const [name, own] of aliases) {
    const re = new RegExp(`(?<![\\w])${escRe(name).replace(/,?\\ |,?\s+/g, ",?\\s+")}(?:,?\\s+(?:of\\s+)?\\d{4})?(?![\\w])`);
    for (const s of sentences) {
      const hit = re.exec(s.text);
      if (!hit) continue;
      const same = mentions.find((x) => x.kind === "short_title" && x.span.sentence === s.sentence && (x.match.includes(name) || name.includes(x.match.replace(/,?\s+(?:of\s+)?\d{4}$/, ""))));
      if (same) { same.alias_of = own; continue; }
      mentions.push({ kind: "short_title", origin: "text", match: hit[0], title_rows: [], alias_of: own, span: { text: s.text, block: s.block, sentence: s.sentence } });
    }
  }
}

// ─── Document idea (v3) ──────────────────────────────────────────────────────
// Key-agnostic: the stretch of the page a mention belongs to, cut by MEASURE,
// not by subject. Same scope rule as the subject idea: a speech, interview,
// press release, statement or bill text is one document scope (spanScopeFor);
// a campaign issue page or roll call keeps the paragraph scope. Inside a
// document the idea runs until a clear break — a page heading, an explicit
// transition, or a DISTINCT NEW MEASURE (a sentence naming only bills — by
// number or short title — the stretch has not named, once it has named one). On a bill-text page the
// whole document is the bill's idea; in paragraph scope the idea is the
// mention's paragraph. Every entry keeps the scorer subject of its sentence
// (`subject` / `subjects`, null when none), so a key with no scorer subject can
// leave out the sentences that belong to the Israel / Ukraine / Iran keys.
function headingTexts(html) {
  const out = new Set();
  for (const m of String(html || "").matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)) for (const b of extractSentenceBlocks(`<p>${m[1]}</p>`)) out.add(b.text);
  return out;
}
function docIdeasFor(mentions, sentences, html, spans, { own, scope }) {
  const heads = headingTexts(html);
  // A measure is a bill number or a short title, by catalog identity where it
  // has one, so "H.R. 2" and "the Secure the Border Act of 2023" are one measure.
  const measure = (m) => (m.kind === "number" ? `${m.congress}|${m.bill}` : m.alias_of ? `${m.alias_of.congress}|${m.alias_of.bill}`
    : m.title_rows?.length === 1 ? m.title_rows[0] : `title|${m.match.toLowerCase()}`);
  const numbersAt = new Map();
  for (const m of mentions) if ((m.kind === "number" || m.kind === "short_title") && m.span.sentence != null) {
    if (!numbersAt.has(m.span.sentence)) numbersAt.set(m.span.sentence, new Set());
    numbersAt.get(m.span.sentence).add(measure(m));
  }
  const seg = [];
  let n = 1, named = new Set(), used = false;
  const cut = () => { if (used) { n++; named = new Set(); used = false; } };
  for (let k = 0; k < sentences.length; k++) {
    const s = sentences[k];
    if (own) { seg.push(1); continue; }
    if (scope !== "document") { seg.push(s.block); continue; }
    const bills = [...(numbersAt.get(k) || [])];
    if (heads.has(s.text) || TRANSITION.test(s.text)) cut();
    else if (bills.length && named.size && !bills.some((b) => named.has(b))) cut();
    for (const b of bills) named.add(b);
    seg.push(n); used = true;
  }
  // The measures each sentence names, in the order it names them (`measures`;
  // v6 keys give a sentence to one measure, see bill-key-patterns.mjs). A title
  // folded into the one number in its sentence (a roll-call line) is the same
  // measure.
  const firstAt = new Map();
  const bySentence = new Map();
  for (const m of mentions) if ((m.kind === "number" || m.kind === "short_title") && m.span.sentence != null) {
    if (!bySentence.has(m.span.sentence)) bySentence.set(m.span.sentence, []);
    bySentence.get(m.span.sentence).push(m);
  }
  for (const [k, ms] of bySentence) {
    const nums = new Set(ms.filter((m) => m.kind === "number").map(measure));
    const ids = new Map();
    for (const m of ms) {
      const id = m.kind === "short_title" && !m.title_rows?.length && nums.size === 1 ? [...nums][0] : measure(m);
      const at = sentences[k].text.indexOf(m.match);
      if (!ids.has(id) || at < ids.get(id)) ids.set(id, at < 0 ? Infinity : at);
    }
    firstAt.set(k, [...ids].sort((a, b) => a[1] - b[1]).map(([id]) => id));
  }
  // Lead-in sentences (before the page first names a measure) on a page that
  // names more than one measure: no measure owns them (`lead`).
  const pageMeasures = new Set([...firstAt.values()].flat());
  const firstNamed = firstAt.size ? Math.min(...firstAt.keys()) : Infinity;
  const lead = (k) => pageMeasures.size > 1 && k < firstNamed;
  const entry = (k, i) => ({ id: k, ...(lead(k) ? { lead: true } : {}), text: sentences[k].text, sentence: k, subject: spans[k]?.subject ?? null,
    ...(spans[k]?.subjects ? { subjects: spans[k].subjects } : {}), ...(firstAt.has(k) ? { measures: firstAt.get(k) } : {}), ...(k === i ? { mention: true } : {}) });
  for (const m of mentions) {
    const i = m.span.sentence;
    if (m.origin === "url_slug") { m.doc = [{ id: "slug", text: m.span.text, slug: true, mention: true, subject: null }]; continue; }
    m.doc = sentences.map((_, k) => k).filter((k) => i == null || seg[k] === seg[i]).map((k) => entry(k, i));
  }
}

/**
 * findBills(page, { catalog }) → { candidates, sentences, scope }
 *   page: { body (HTML) | text, url, date (YYYY-MM-DD), politician_id, source_type }
 * Each candidate: { id, bill, congress, kind, origin, in_catalog, catalog, mentions[], resolves_to? }
 *   mentions[]: { kind, origin, match, span: { text, block, sentence }, idea: [entry…], window: [idea text…] }
 *   idea entry: { text, sentence, subject, subjects?, facet?, mention? } (see ideasFor)
 *   doc: [entry…] — the mention's document idea, cut by measure (see docIdeasFor)
 */
export function findBills(page, { catalog = null } = {}) {
  const html = bodyHtml(page);
  const blocks = extractSentenceBlocks(html);
  const sentences = blocks.map((b, i) => ({ text: b.text, block: b.block, sentence: i }));
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
    span: { text: page.url, block: null, sentence: null } });

  const scan = (s, origin) => {
    const text = s.text;
    const taken = [];
    const overlaps = (a, b) => taken.some(([x, y]) => a < y && b > x);
    const base = { origin, span: { text, block: s.block, sentence: s.sentence } };
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
      push({ ...base, kind: "phrase", family: fam.family, match: hit[0] });
    }
  };
  for (const s of sentences) scan(s, "text");
  pageAliases(mentions, sentences);
  const slug = urlSlugText(page.url);
  if (slug) scan({ text: slug, block: null, sentence: null }, "url_slug");

  const scope = own ? "document" : spanScopeFor(page.source_type);
  const spans = ideasFor(mentions, sentences, html, { own, scope });
  docIdeasFor(mentions, sentences, html, spans, { own, scope });
  for (const m of mentions) {
    m.window = m.idea.map((e) => e.text);
    if (m.kind === "phrase") m.countries = countriesIn(m.window.join(" "));
  }
  return { candidates: groupMentions(mentions, page, catalog, own), sentences: sentences.length, scope };
}

const keyOf = (congress, bill) => (congress ? `${congress}|${bill}` : `?|${bill}`);

function groupMentions(mentions, page, catalog, own) {
  const byKey = new Map();
  const add = (k, seed, m) => {
    if (!byKey.has(k)) byKey.set(k, { ...seed, mentions: [] });
    byKey.get(k).mentions.push(strip(m));
  };
  const strip = ({ kind, origin, match, span, window, idea, doc, family, countries, congress_from }) => ({ kind, origin, match, span, window, idea, doc, ...(congress_from ? { congress_from } : {}), ...(family ? { family, countries } : {}) });
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
    if (m.alias_of) { add(keyOf(m.alias_of.congress, m.alias_of.bill), seedFor(m.alias_of.congress, m.alias_of.bill, "number"), m); continue; }
    const rows = (m.title_rows || []).map((id) => catalog.byId.get(id));
    const sameNumber = rows.find((r) => byKey.has(r.id));
    if (sameNumber || rows.length === 1) { const r = sameNumber || rows[0]; add(r.id, seedFor(r.congress, r.bill, "short_title"), m); continue; }
    // An uncatalogued title in the same sentence as exactly one federal number
    // names that bill ("H R 7691 · On Passage · Additional Ukraine Supplemental …").
    if (!rows.length && m.span.sentence != null) {
      const same = [...new Set(mentions.filter((x) => x.kind === "number" && x.span.sentence === m.span.sentence).map((x) => keyOf(x.congress, x.bill)))];
      if (same.length === 1) { add(same[0], null, m); continue; }
    }
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
