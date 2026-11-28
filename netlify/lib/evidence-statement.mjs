// ─────────────────────────────────────────────────────────────────────────────
// Evidence statements — when it was said, and whether it is the politician's
// own words. Applied by the Locker writer (evidence-locker-core.mjs
// maybeWriteLockerItem) to every scored candidate from a raw-ingest record
// (crawler pages, high-profile sources, videos, floor speeches, hearings).
// Neither check changes a score: the scorer's rules run first, untouched.
// ─────────────────────────────────────────────────────────────────────────────
//
// STATEMENT DATE — statementDateFor(raw) → { date, source, via }:
//   1. "source_metadata" — the record's own date from its source metadata (a
//      video's YouTube publish date, a floor speech's / hearing's date).
//   2. "page" — an explicit date on the page: the strict dated-document read
//      (statementDateOf: published meta / <time> / dateline / URL path on a
//      release, speech, statement …), else, on any page, an explicit
//      published-date meta tag or JSON-LD datePublished, else a /YYYY/MM/DD/
//      URL path. Modified / updated dates are never used.
//   3. "fetch_time" — the fetch timestamp, only when nothing above exists.
//   A page date after the fetch date is ignored (a typo or a future event).
//
// OWN-WORDS FILTER — ownWordsCheck(candidate, raw) → { ok, reason?, code? }.
// For a clear-position candidate (support / oppose), the statements the
// scorer counted for the winning side must include at least one in the
// politician's own voice. Filtered:
//   · quoted_other — every supporting line is a quote from someone else
//   · paraphrase   — a reporter's / outlet's paraphrase (news repost with no
//                    quote or first-person line, framing "reported", or a
//                    line relayed "according to …" / "the report said" with
//                    no quote and no first person)
//   · third_party  — a third party describing the politician's position
//                    (attributed to another actor, or a third-person line
//                    naming them on a page that is not their own)
//   · no_own_words — no supporting line at all, only the page headline, or
//                    only generic boilerplate (navigation, sign-up, donate …)
// Mentions ("no clear position" / "mixed") are not stances and pass through.
// A candidate without the scorer's statement detail (no statement text —
// older or hand-built shapes) passes.

import { statementDateOf } from "./evidence-locker-core.mjs";
import { isNewsRepost } from "./stance-score-core.mjs";

const isoOk = (y, m, d) => y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

function dayOf(v) {
  const m = ISO_DAY.exec(String(v || "").trim());
  return m && isoOk(+m[1], +m[2], +m[3]) ? iso(+m[1], +m[2], +m[3]) : null;
}

// Explicit published-date markup on any page (never modified / updated dates).
const PUBLISHED_META = [
  ["article:published_time", /<meta[^>]+(?:property|name)=["']article:published_time["'][^>]*content=["']\s*(\d{4}-\d{2}-\d{2})/i],
  ["article:published_time", /<meta[^>]+content=["']\s*(\d{4}-\d{2}-\d{2})[^"']*["'][^>]*(?:property|name)=["']article:published_time["']/i],
  ["datePublished", /["']datePublished["']\s*:\s*["']\s*(\d{4}-\d{2}-\d{2})/i],
  ["itemprop datePublished", /itemprop=["']datePublished["'][^>]*(?:content|datetime)=["']\s*(\d{4}-\d{2}-\d{2})/i],
  ["publish date meta", /<meta[^>]+name=["'](?:publish[_-]?date|pubdate|date|dc\.date(?:\.issued)?|parsely-pub-date|sailthru\.date)["'][^>]*content=["']\s*(\d{4}-\d{2}-\d{2})/i],
];
const URL_DATE = /\/((?:19|20)\d{2})\/(\d{1,2})\/(\d{1,2})\//;

/** The best statement date for a raw record → { date, source, via }. */
export function statementDateFor(raw) {
  const fetched = dayOf(raw?.fetched_at);
  const notFuture = (d) => d && (!fetched || d <= fetched) ? d : null;
  // 1. The record's own source metadata (video publish date, speech date).
  const meta = notFuture(dayOf(raw?.date));
  if (meta && (raw?.type === "video" || raw?.type === "speech" || raw?.date)) {
    return { date: meta, source: "source_metadata", via: raw?.type === "video" ? "video publish date" : raw?.type === "speech" ? `${raw?.speech_kind || "speech"} date` : "record date" };
  }
  // 2. An explicit date on the page.
  const strict = notFuture(statementDateOf(raw));
  if (strict) return { date: strict, source: "page", via: "dated document (published / dateline / URL)" };
  const body = String(raw?.body || "").slice(0, 200_000);
  for (const [via, re] of PUBLISHED_META) {
    const m = re.exec(body);
    const d = m ? notFuture(dayOf(m[1])) : null;
    if (d) return { date: d, source: "page", via };
  }
  const u = URL_DATE.exec(String(raw?.final_url || raw?.url || ""));
  if (u && isoOk(+u[1], +u[2], +u[3])) {
    const d = notFuture(iso(+u[1], +u[2], +u[3]));
    if (d) return { date: d, source: "page", via: "URL path date" };
  }
  // 3. Last resort: when it was fetched.
  return fetched ? { date: fetched, source: "fetch_time", via: "fetch timestamp (no date on the page)" } : { date: null, source: "none", via: "no date available" };
}

/** One log line for a statement date. */
export function statementDateLine(id, d) {
  if (d.source === "fetch_time") return `evidence-date: FETCH FALLBACK ${id} — no date on the page or in its metadata; using fetch time ${d.date}`;
  if (d.source === "none") return `evidence-date: NONE ${id} — no page date and no fetch time`;
  return `evidence-date: ${d.source === "page" ? "PAGE" : "METADATA"} ${id} — ${d.date} (${d.via})`;
}

const CLEAR = (p) => p === "support" || p === "oppose";
const HAS_QUOTE = /[“”"]/;
const FIRST_PERSON = /\b(?:I|I['’](?:m|ve|ll|d)|we|we['’](?:re|ve|ll)|my|our|us)\b/;
const BOILERPLATE = /\b(?:sign up|subscribe|newsletter|donate|contribute|paid for by|privacy policy|terms of (?:use|service)|cookie|skip to (?:main )?content|all rights reserved|contact us|follow us|share (?:this|on)|click here|read more|learn more|get involved|volunteer|join (?:us|our team)|menu|search)\b/i;
const OUTLET_VIA = /\b(?:reporter|outlet|news|article|press coverage|media)\b/i;
// Reported speech: a line that says someone else relayed it.
const REPORTED_SPEECH = /\b(?:according to|reportedly|(?:the|a|his|her|their)\s+(?:report|article|story|outlet|reporter|newspaper|paper|aide|aides|spokesperson|spokesman|spokeswoman|office)\s+(?:said|says|noted|reported|wrote|told)|(?:aides|officials|sources|staff(?:ers)?)\s+(?:said|say)|told (?:reporters|the press)|(?:was|were|has been) quoted as)\b/i;
const words = (t) => String(t || "").trim().split(/\s+/).filter(Boolean).length;

/** Third-person reference to the politician (name or pronoun as subject). */
function thirdPersonAbout(text, raw) {
  const pid = String(raw?.politician_id || "");
  const last = pid.split("_").filter(Boolean).pop() || pid;
  const name = last.length > 2 ? new RegExp(`\\b${last.replace(/[^a-z]/gi, "")}\\b`, "i") : null;
  return (name && name.test(text)) || /^(?:he|she|they)\s+(?:has|have|is|are|was|were|supports?|opposes?|backs?|wants?|called|calls|said|says|believes?)\b/i.test(String(text || "").trim());
}

/**
 * Is a clear-position candidate's supporting text the politician's own words?
 * `ownPage` = the source is the politician's own page (isOwnPage); passed in so
 * this module does not re-derive the Locker's own-page rules.
 */
export function ownWordsCheck(candidate, raw, { ownPage = true } = {}) {
  if (!candidate || !CLEAR(candidate.position)) return { ok: true, reason: "not a clear position (mention) — not filtered" };
  const src = candidate.sources?.[0] || {};
  // The scorer records each statement's text and side; a list without any text
  // is an older / hand-built shape with nothing to judge, so it passes.
  if (!Array.isArray(src.statements) || !src.statements.some((s) => s && typeof s.text === "string")) return { ok: true, reason: "no statement detail (older candidate shape)" };
  const side = candidate.position;
  const supporting = src.statements.filter((s) => s && ((s.kind === "clear" || s.kind === "implication") && s.side === side || s.lean === side));
  if (!supporting.length) return { ok: false, code: "no_own_words", reason: "no clear own words — no line on the page states the position" };
  const quotedOther = (s) => s.quoted_speaker === "other";
  const reported = (s) => s.framing === "reported" || (s.attributed_to && OUTLET_VIA.test(String(s.attributed_via || "")))
    || (REPORTED_SPEECH.test(String(s.text || "")) && !HAS_QUOTE.test(String(s.text || "")) && !FIRST_PERSON.test(String(s.text || "")));
  const thirdParty = (s) => Boolean(s.attributed_to) && !reported(s);
  const voiced = supporting.filter((s) => !quotedOther(s) && !reported(s) && !thirdParty(s));
  if (!voiced.length) {
    const n = (f) => supporting.filter(f).length;
    const [code, what] = n(quotedOther) >= Math.max(n(reported), n(thirdParty))
      ? ["quoted_other", "every supporting line is a quote from someone else"]
      : n(reported) >= n(thirdParty)
        ? ["paraphrase", "reporter / outlet paraphrase only"]
        : ["third_party", `a third party describing the position (${[...new Set(supporting.filter(thirdParty).map((s) => s.attributed_via || s.attributed_to))].join(", ")})`];
    return { ok: false, code, reason: what };
  }
  // A news article reposted on their site: only a quote or first-person line is theirs.
  if (isNewsRepost(raw) && !voiced.some((s) => HAS_QUOTE.test(s.text) || FIRST_PERSON.test(s.text))) {
    return { ok: false, code: "paraphrase", reason: "reporter paraphrase only — news repost with no quote or first-person line from the politician" };
  }
  // A page that is not theirs: a third-person line naming them is a description, not a statement.
  if (!ownPage) {
    const own = voiced.filter((s) => HAS_QUOTE.test(s.text) || FIRST_PERSON.test(s.text) || !thirdPersonAbout(s.text, raw));
    if (!own.length) return { ok: false, code: "third_party", reason: "third-party description of the politician's position (third-person, no quote) on a page that is not theirs" };
  }
  const substantive = voiced.filter((s) => !s.headline && words(s.text) >= 4 && !(BOILERPLATE.test(s.text) && words(s.text) < 15));
  if (!substantive.length) {
    return { ok: false, code: "no_own_words", reason: voiced.every((s) => s.headline) ? "no clear own words — only the page headline states it" : "no clear own words — only generic page boilerplate" };
  }
  return { ok: true, reason: `${substantive.length} own-voice line(s)` };
}
