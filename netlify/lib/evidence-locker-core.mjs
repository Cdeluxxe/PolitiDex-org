// ─────────────────────────────────────────────────────────────────────────────
// evidence-locker-core.mjs — scored candidates → Evidence Locker
// ─────────────────────────────────────────────────────────────────────────────
// After the scorer logs a candidate for a freshly stored raw record, this module
// decides whether that candidate becomes an Evidence Locker item, at which
// STRENGTH, and if so writes it to the "evidence-locker" Blobs store.
//
// STRENGTH (same thresholds the profile's strengthOf() reads):
//   strong   clear position (support/oppose) at confidence ≥ 0.8
//   weak     clear position at 0.3 ≤ confidence < 0.8 (incl. implication-driven)
//   mention  confidence < 0.3, or no clear position ("no clear position" /
//            "mixed"), when the source has topic mentions AND an excerpt
//   anything else writes nothing.
//
// WRITE RULES (all must hold):
//   W1  A strength above applies (see lockerStrength).
//   W2  An excerpt to show.
//   W3  Provenance:
//         · the ground-truth pair (james_talarico | cost_living) writes a
//           strong/weak item only when the candidate's position MATCHES the
//           ground-truth position (a mention carries no position, so it may);
//         · every other pair writes only when the source is a campaign or
//           official page (source type says "campaign"/"official", or the link
//           is on a .gov host).
//   W5  Never overwrite a manually flagged item (reviewed / needs_edit /
//       hidden — see "Manual review flags" below), whatever its strength.
//   W4  Under the SAME rules version, never overwrite a strong item; a weak or
//       mention item already at the key is only replaced by a STRONGER read of
//       the same page. An item written under an OLDER rules version is replaced
//       by the current read of the same page, whatever its strength — up,
//       down or onto the other side (phase9-v1: older, weaker rules must not
//       stay frozen in the Locker). The replaced read is kept on the item under
//       `rescored`. See also locker-rescore.mjs, which re-reads items whose
//       page the cron has not come back to.
//   W7  The page must be the politician's own (page-ownership.mjs,
//       locker-own-v1): their House / Senate office site, campaign site, state
//       legislature member page or office site. Committee, Clerk, White House,
//       agency and other members' pages are refused unless the quote is
//       attributed to the politician by name. Items already stored from such
//       pages are not served (ownEvidenceRows) and the re-score pass retires them.
//   W6  A WEAK cross-topic read (a candidate scored from a page filed under
//       another topic — `page_topic`) never writes a position that conflicts
//       with a stance the Locker already holds for that politician + topic
//       from a different page (heldConflict). A STRONG one is written: a
//       politician can say different things, and solid evidence on both sides
//       is kept and reported as a Mixed record (stanceConsistency), not
//       suppressed as an error (phase9-v1).
//
// CITATIONS. A clear-position item (support / oppose, strong or weak) must come
// from the politician's own page (isOwnPage) and quote at least one verbatim
// excerpt the scorer used (citationExcerpts); it is stored with `issue_key`,
// `excerpts`, `own_page` and a `citation` record (politician_id, issue_key,
// stated_position, confidence, source_type, source_date, url, excerpts,
// attribution, own_page). A "no clear position" / "mixed" read never carries a
// citation or a stance; it can only be the citation-free mention tier.
//
// STATED LAYER ONLY. Every item is what a politician SAID (layer "stated",
// formal_record false). An explicit claim on a primary source (scorer R8 —
// campaign/official pages, floor speeches, press releases, co-sponsor
// statements; primary_kind says which)
// carries stated_position: true and reads as a normal stated position; it is
// never a vote, bill or completed action until it is independently matched to
// an official record elsewhere. Items written under the older rules are
// re-read the same way when served (regradeStatedPosition), and one claim
// restated under several issue keys is served once (collapseRestatedItems).
//
// The ground-truth record is passed in read-only; this module never writes it.
// Pure and dependency-injected (store, log) so the test suite runs it without a
// Blobs environment.

import { createHash } from "node:crypto";
import { ISSUE_TOPIC_LABELS } from "./stance-topic-vocab.mjs";
import { statedSourceRule, namesBillOrOutcome, quotedSpeakerOf, KIND_LABELS, WEIGHTS as SCORE_WEIGHTS } from "./stance-score-core.mjs";
import { readLockerDocs } from "./locker-read.mjs";
import { pageOwnership, itemOwnership } from "./page-ownership.mjs";

export const LOCKER_STORE_NAME = "evidence-locker";
export const LOCKER_MIN_CONFIDENCE = 0.8;
export const LOCKER_WEAK_MIN_CONFIDENCE = 0.3;
export const LOCKER_ITEM_VERSION = "locker-v2";

const CLEAR_POSITIONS = new Set(["support", "oppose"]);
const EXCERPT_MAX = 280;
const STRENGTH_RANK = { mention: 1, weak: 2, strong: 3 };

export const TOPIC_LABELS = {
  cost_living: "the cost of living",
  healthcare_costs: "health care costs",
};

/**
 * Headline verb phrase for an item. The two cost topics keep their original
 * wording; every other issue key names the register position it bears on.
 */
export function headlinePhrase(topic, position) {
  if (TOPIC_LABELS[topic]) {
    return `${position === "support" ? "commits to lowering" : "opposes measures to lower"} ${TOPIC_LABELS[topic]}`;
  }
  const label = ISSUE_TOPIC_LABELS[topic] || String(topic).replace(/_/g, " ");
  if (position === "support") return `supports “${label}”`;
  if (position === "oppose") return `opposes “${label}”`;
  return `speaks to “${label}”`;
}

/** Is this a first-party campaign page or an official government page? */
export function isCampaignOrOfficial(sourceType, link) {
  if (/\b(campaign|official)\b/i.test(String(sourceType || ""))) return true;
  try {
    return /\.(gov|mil)$/i.test(new URL(link).hostname);
  } catch {
    return false;
  }
}

/** "Source: campaign page" style attribution line from the source type + link. */
export function attributionFor(sourceType, link) {
  const st = String(sourceType || "").toLowerCase();
  let host = "";
  try { host = new URL(link).hostname.toLowerCase(); } catch {}
  // A C-SPAN clip of the politician is named as C-SPAN, not as their channel.
  if (/\bc-span\b/.test(st)) return "Source: C-SPAN video";
  // A cited video from the politician's own channel (tier 2) is named as one.
  if (/(?:^|\.)(?:youtube\.com|youtu\.be)$/.test(host)) return `Source: ${/\bcampaign\b/.test(st) ? "campaign" : "official"} YouTube channel`;
  if (/\bofficial\b/.test(st) || /\.(gov|mil)$/.test(host)) {
    if (/senate/.test(st) || /\.senate\.gov$/.test(host)) return "Source: official Senate page";
    if (/house/.test(st) || /\.house\.gov$/.test(host)) return "Source: official House page";
    return "Source: official government page";
  }
  if (/\bcampaign\b/.test(st)) return "Source: campaign page";
  return `Source: ${sourceType || "public page"}`;
}

const surnameOf = (pid) => {
  const parts = String(pid || "").split("_").filter(Boolean);
  const last = parts[parts.length - 1] || String(pid || "");
  return last.charAt(0).toUpperCase() + last.slice(1);
};

function trimExcerpt(s) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > EXCERPT_MAX ? t.slice(0, EXCERPT_MAX - 1).trimEnd() + "…" : t;
}

// ── Readable-text gate for weaker signals and mentions ──────────────────
// A page the pipeline fetched can be a PDF or other binary read as text, and
// the excerpt it scored is then stream data ("stream x\u009c…endstream",
// "/FlateDecode", "12 0 obj") or replacement glyphs, not words. This keeps
// only clean readable text: PDF structure and control / replacement / private
// characters are cut, and every word that is not a plausible word is dropped.
// Where junk was cut, only runs of at least four consecutive clean words
// survive, so no stray fragments of a stream are left behind. Returns '' when
// nothing readable is left — the caller drops the item. Strong stances never
// pass through here. Kept identical in profile-locker.js and
// netlify/lib/evidence-locker-core.mjs.
var RT_ALLOWED = /^[\p{L}\p{M}\p{N}_'’\-–.,\/&%$@:#+]+$/u;
var RT_EDGE = /^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu;
// Control, C1, replacement, BOM, zero-width, line-separator, private-use and
// lone-surrogate code units, tested by number so no literal of them sits here.
function rtBadUnit(c, next, prev) {
  if (c < 32) return c !== 9 && c !== 10 && c !== 13;
  if (c >= 0x7F && c <= 0x9F) return true;
  if (c === 0xFFFD || c === 0xFFFE || c === 0xFFFF || c === 0xFEFF) return true;
  if (c >= 0x200B && c <= 0x200F) return true;
  if (c === 0x2028 || c === 0x2029) return true;
  if (c >= 0xE000 && c <= 0xF8FF) return true;
  if (c >= 0xD800 && c <= 0xDBFF) return !(next >= 0xDC00 && next <= 0xDFFF);
  if (c >= 0xDC00 && c <= 0xDFFF) return !(prev >= 0xD800 && prev <= 0xDBFF);
  return false;
}
function rtStripBad(t) {
  var out = '';
  for (var i = 0; i < t.length; i++) {
    var c = t.charCodeAt(i);
    out += rtBadUnit(c, t.charCodeAt(i + 1), t.charCodeAt(i - 1)) ? ' ' : t.charAt(i);
  }
  return out;
}
function rtWordOk(w, cut) {
  if (/^(?:https?:\/\/|www\.)\S+$/i.test(w) && w.length <= 200) return true;
  var core = w.replace(RT_EDGE, '');
  if (!core) return w.length <= 3 && /^[—–\-&+=…"'“”‘’()]+$/.test(w);
  if (core.length > 30) return false;
  // In text that had junk cut out, a lone letter is a stream fragment.
  if (cut && core.length === 1 && /\p{L}/u.test(core) && !/^[aAI]$/.test(core)) return false;
  if (!RT_ALLOWED.test(core)) return false;
  var letters = core.match(/\p{L}/gu) || [];
  var ext = core.match(/[^\x00-\x7F]/g) || [];
  if (letters.length && ext.length * 2 > core.length && /[A-Za-z]/.test(core)) return false;
  // Bytes read as Latin-1 ("ÿØÿà", a lone "ÿ"): real words in Latin-script
  // languages always carry plain ASCII letters alongside their accents.
  if (/^[\u00A0-\u00FF]+$/.test(core)) return false;
  if (letters.length >= 6 && letters.length === core.length && !/[aeiouyAEIOUYÀ-ɏ]/.test(core)) return false;
  if ((core.match(/[a-z][A-Z]/g) || []).length > 1) return false;
  if ((core.match(/[A-Za-z]\d|\d[A-Za-z]/g) || []).length > 2) return false;
  return true;
}
export function cleanReadableText(s) {
  var raw = String(s == null ? '' : s);
  if (!raw) return '';
  var t = rtStripBad(raw);
  // Two or more junk code units means the text was not clean to begin with.
  var cut = (t.match(/ /g) || []).length - (raw.match(/ /g) || []).length >= 2;
  var before = t;
  t = t
    .replace(/\bstream\b[\s\S]*?\bendstream\b/g, ' ')
    .replace(/<<[\s\S]*?>>/g, ' ')
    .replace(/%PDF-\d(?:\.\d)?|%%EOF/g, ' ')
    .replace(/\b\d+\s+\d+\s+(?:obj|R)\b/g, ' ')
    .replace(/\b(?:endobj|endstream|startxref|xref|trailer)\b/g, ' ')
    .replace(/(^|\s)\/[A-Za-z][A-Za-z0-9#]*/g, '$1 ');
  if (t !== before) cut = true;
  var words = t.split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  var keep = words.map(function (w) { return rtWordOk(w, cut); });
  var dropped = cut || keep.some(function (k) { return !k; });
  var runs = [], cur = [];
  for (var i = 0; i <= words.length; i++) {
    if (i < words.length && keep[i]) { cur.push(words[i]); continue; }
    if (cur.length && (!dropped || cur.length >= 4)) runs.push(cur.join(' '));
    cur = [];
  }
  var out = runs.join(' … ').trim();
  var real = (out.match(/\p{L}{2,}/gu) || []).filter(function (x) { return /[aeiouyAEIOUYÀ-ɏ]/.test(x); });
  if (real.length < 2) return '';
  var lettersN = (out.match(/\p{L}/gu) || []).length;
  if (lettersN < out.replace(/\s/g, '').length * 0.5) return '';
  return out;
}

/** Stable, link-derived key: one Locker item per politician · topic · page. */
export function lockerKey({ politician_id, topic, link }) {
  const h = createHash("sha256").update(String(link)).digest("hex").slice(0, 16);
  return `${politician_id}/${topic}/${h}.json`;
}

const numOr = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
const isClear = (position) => CLEAR_POSITIONS.has(position);

/** Number of topic statements the scorer recorded for the candidate's source. */
export function topicMentionCount(candidate) {
  const src = candidate?.sources?.[0] || {};
  return Array.isArray(src.statements) ? src.statements.length : 0;
}

/**
 * The strength a candidate would be stored at, or null with a reason.
 * Returns { strength: 'strong'|'weak'|'mention'|null, reason }.
 */
export function lockerStrength(candidate) {
  const c = numOr(candidate?.confidence, 0);
  const clear = isClear(candidate?.position);
  if (clear && c >= LOCKER_MIN_CONFIDENCE) return { strength: "strong", reason: `clear ${candidate.position} at confidence ${c} ≥ ${LOCKER_MIN_CONFIDENCE}` };
  if (clear && c >= LOCKER_WEAK_MIN_CONFIDENCE) {
    const raw = String(candidate?.sources?.[0]?.excerpt || "").trim();
    if (raw && !cleanReadableText(raw)) return { strength: null, reason: `clear ${candidate.position} at confidence ${c}, but the excerpt has no readable text (binary / PDF data)` };
    return { strength: "weak", reason: `clear ${candidate.position} at confidence ${c} (${LOCKER_WEAK_MIN_CONFIDENCE}–${LOCKER_MIN_CONFIDENCE})` };
  }
  const why = clear ? `confidence ${c} < ${LOCKER_WEAK_MIN_CONFIDENCE}` : `position "${candidate?.position}" is not clear`;
  const mentions = topicMentionCount(candidate);
  const excerpt = String(candidate?.sources?.[0]?.excerpt || "").trim();
  if (!mentions) return { strength: null, reason: `${why} and no topic mentions` };
  if (!excerpt) return { strength: null, reason: `${why} and no excerpt to show` };
  if (!cleanReadableText(excerpt)) return { strength: null, reason: `${why} and the excerpt has no readable text (binary / PDF data)` };
  return { strength: "mention", reason: `${why}; ${mentions} topic mention(s) with an excerpt` };
}

/** Strength of an item already in the Locker (older items carry no field). */
export function storedStrength(item) {
  if (!item) return null;
  if (STRENGTH_RANK[item.strength]) return item.strength;
  const clear = isClear(item.position);
  const c = numOr(item.confidence, null);
  if (clear && (c === null || c >= LOCKER_MIN_CONFIDENCE)) return "strong";
  if (clear && c >= LOCKER_WEAK_MIN_CONFIDENCE) return "weak";
  return "mention";
}

/**
 * Is the candidate's source the politician's OWN page? A campaign or official
 * page (W3), or a first-party primary source the scorer read as the
 * candidate's own stated position (R8 floor speech / release / co-sponsor
 * statement).
 */
export function isOwnPage(candidate, raw) {
  const src = candidate?.sources?.[0] || {};
  const link = raw?.final_url || raw?.url || src.link;
  if (candidate?.stated_position === true && Boolean(KIND_LABELS[candidate?.primary_kind])) return true;
  return isCampaignOrOfficial(raw?.source_type ?? src.type, link);
}

const CITATION_EXCERPTS_MAX = 3;

/**
 * The verbatim excerpts the scorer used for a clear-position read: the
 * candidate's own explicit statements for the winning side first, then its
 * implications for that side, then the scorer's single excerpt. Text is kept
 * exactly as the scorer recorded it (no re-trim); excerpts with no readable
 * text (binary / PDF data) and quotes of other speakers are left out. At most
 * CITATION_EXCERPTS_MAX, de-duplicated, in page order within each kind.
 */
export function citationExcerpts(candidate) {
  const src = candidate?.sources?.[0] || {};
  const side = candidate?.position;
  const st = Array.isArray(src.statements) ? src.statements : [];
  const own = (s) => s && s.side === side && s.quoted_speaker !== "other" && typeof s.text === "string";
  const picked = [
    ...st.filter((s) => s.kind === "clear" && own(s)).map((s) => s.text),
    ...st.filter((s) => s.kind === "implication" && own(s)).map((s) => s.text),
    ...(typeof src.excerpt === "string" ? [src.excerpt] : []),
  ];
  const out = [];
  for (const t of picked) {
    if (!t.trim() || !cleanReadableText(t) || out.includes(t)) continue;
    out.push(t);
    if (out.length >= CITATION_EXCERPTS_MAX) break;
  }
  return out;
}

/**
 * Should this candidate become a Locker item?
 * `gt` is the ground-truth record (or null). Returns { write, strength?, reason }.
 */
export function lockerDecision(candidate, raw, gt = null) {
  if (!candidate) return { write: false, reason: "no candidate" };
  const { strength, reason } = lockerStrength(candidate);
  if (!strength) return { write: false, reason };
  const src = candidate.sources?.[0] || {};
  if (!String(src.excerpt || "").trim()) return { write: false, reason: "no excerpt to show" };
  // W7 (locker-own-v1): only the politician's OWN page is evidence for them —
  // not a committee, Clerk, White House or agency page, another member's site,
  // or any site that is not theirs (page-ownership.mjs). A committee / agency
  // page counts only when the quote the item rests on is attributed to them.
  const owner = pageOwnership({
    link: raw?.final_url || raw?.url || src.link,
    politicianId: candidate.politician_id,
    sourceType: raw?.source_type ?? src.type,
    quotes: [...citationExcerpts(candidate), src.excerpt].filter(Boolean),
  });
  if (!owner.own) return { write: false, reason: `not the politician's own page: ${owner.reason}`, ownership: owner.kind };
  const isGtPair = gt && candidate.politician_id === gt.politician_id && candidate.topic === gt.topic;
  if (isGtPair) {
    if (strength === "mention") return { write: true, strength, reason: `${reason}; ground-truth pair, mention carries no position` };
    if (candidate.position !== gt.position) return { write: false, reason: `position ${candidate.position} does not match ground truth (${gt.position})` };
    if (!isOwnPage(candidate, raw)) return { write: false, reason: `source "${raw?.source_type ?? src.type}" is not the politician's own campaign/official page` };
    if (!citationExcerpts(candidate).length) return { write: false, reason: "no verbatim excerpt to cite" };
    return { write: true, strength, reason: `${reason}; matches ground-truth position (${gt.position})` };
  }
  // A floor speech, press release or co-sponsor statement that the scorer read
  // as a stated position (R8, phase8-v2) is the candidate's own first-party
  // words too; any other read from those sources stays out, as before.
  if (!isOwnPage(candidate, raw)) {
    return { write: false, reason: `source "${raw?.source_type ?? src.type}" is not a campaign/official page` };
  }
  // A clear-position item is a citation: it needs at least one verbatim
  // excerpt the scorer used.
  if (strength !== "mention" && !citationExcerpts(candidate).length) return { write: false, reason: "no verbatim excerpt to cite" };
  return { write: true, strength, reason: `${reason} on a campaign/official page` };
}

/** Evidence tier of a raw record / item: 2 when tagged so, else 1 (older items carry no field). */
export const sourceTierOf = (x) => (Number(x?.source_tier) === 2 ? 2 : 1);
export const SOURCE_TIER_LABELS = { 1: "tier 1 · first-party page", 2: "tier 2 · official government source / own YouTube channel" };

/**
 * Serve-time gate for a stored item: a weak signal or mention whose excerpt
 * is binary / PDF junk is cleaned to its readable text, or dropped (null) when
 * none is left. Strong items are returned untouched, as stored.
 */
export function readableWeakerItem(doc) {
  if (!doc || storedStrength(doc) === "strong") return doc;
  const raw = String(doc.excerpt || "");
  if (!raw.trim()) return doc;
  const clean = cleanReadableText(raw);
  if (!clean) return null;
  return clean === raw ? doc : { ...doc, excerpt: trimExcerpt(clean) };
}

/** The finished Locker item for a candidate + the raw record it came from. */
export function buildLockerItem(candidate, raw, strength = lockerStrength(candidate).strength) {
  const src = candidate.sources?.[0] || {};
  const link = raw?.final_url || raw?.url || src.link;
  const source_type = raw?.source_type ?? src.type;
  const date = String(raw?.fetched_at ?? candidate.raw_fetched_at ?? "").slice(0, 10);
  return {
    politician_id: candidate.politician_id,
    topic: candidate.topic,
    position: candidate.position,
    confidence: candidate.confidence,
    source_type,
    link,
    // A weak signal or mention keeps only its clean readable text; a strong
    // stance's excerpt is stored exactly as before.
    excerpt: strength === "strong" ? trimExcerpt(src.excerpt) : trimExcerpt(cleanReadableText(src.excerpt)),
    // phase9-v2 R18(b): the excerpt is the page's own headline, not a sentence they said.
    ...(src.excerpt_kind === "headline" ? { excerpt_kind: "headline" } : {}),
    date,
    attribution: attributionFor(source_type, link),
    strength,
    ...(numOr(src.implication_count, 0) > 0 ? { implication_count: src.implication_count } : {}),
    // Provenance — how this item was made, for audit.
    link_status: raw?.http_status ?? null,
    confidence_reason: candidate.confidence_reason,
    rules_version: candidate.rules_version,
    ...(candidate.stated_position ? { stated_position: true } : {}),
    ...(candidate.stated_position && candidate.primary_kind ? { primary_kind: candidate.primary_kind } : {}),
    layer: "stated",
    formal_record: false,
    item_version: LOCKER_ITEM_VERSION,
    captured_at: raw?.fetched_at ?? null,
    // When the page says it was published (statementDateOf), if it says.
    ...(statementDateOf(raw) ? { stated_date: statementDateOf(raw) } : {}),
    ...(raw?.source_id ? { source_id: raw.source_id } : {}),
    // Evidence tier of the page the item came from (pool v2): 1 = first-party
    // campaign / official page (every untagged page), 2 = official government
    // source or the politician's own YouTube channel. Provenance only — the
    // strength, thresholds and write rules above are the same for both.
    source_tier: sourceTierOf(raw),
    // Scored from a page filed under another topic (multi-topic pass).
    ...(candidate.page_topic && candidate.page_topic !== candidate.topic ? { page_topic: candidate.page_topic } : {}),
    // Clear-position items (support / oppose) carry a full citation record.
    // Mentions ("no clear position" / "mixed" / low confidence) do not.
    ...(isClear(candidate.position) ? citationFields(candidate, raw, { link, source_type, date }) : {}),
  };
}

/**
 * Citation record for a clear-position item: who, which issue, what stance at
 * what scorer confidence, the source (type, date, direct URL), the verbatim
 * excerpts the scorer used, and that the source is the politician's own page.
 */
function citationFields(candidate, raw, { link, source_type, date }) {
  return {
    issue_key: candidate.topic,
    excerpts: citationExcerpts(candidate),
    own_page: isOwnPage(candidate, raw),
    citation: {
      politician_id: candidate.politician_id,
      issue_key: candidate.topic,
      stated_position: candidate.position,
      confidence: candidate.confidence,
      source_type,
      source_date: date,
      url: link,
      excerpts: citationExcerpts(candidate),
      attribution: `${attributionFor(source_type, link)} — the politician's own page`,
      own_page: isOwnPage(candidate, raw),
    },
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function displayDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : String(iso || "");
}

/**
 * Locker item → the spotlight-entry shape the existing Evidence Locker
 * components already render (headline / facts / date / issueKey / source).
 * The pipeline fields ride along under `pipeline` for transparency.
 */
export function toSpotlightEntry(item, { key = null, review = null } = {}) {
  const who = surnameOf(item.politician_id);
  // A floor speech, release or co-sponsor statement is named as what it is.
  const page = KIND_LABELS[item.primary_kind] || (/YouTube channel/.test(item.attribution) ? "own YouTube channel" : /official/i.test(item.attribution) ? "official page" : "campaign page");
  return {
    // The page type rides in the headline so two pages on one topic stay two
    // receipts (the Locker de-duplicates by headline within a member).
    headline: `${who} ${headlinePhrase(item.topic, item.position)} (${item.source_type})`,
    facts: `${KIND_LABELS[item.primary_kind] ? "In" : "On"} ${who}'s ${page}, ${who} stated: “${item.excerpt}” ${item.attribution}. Captured ${displayDate(item.date)}.`,
    date: displayDate(item.date),
    issueKey: item.topic,
    impact: "neutral",
    category: "statement",
    sourceType: "statement",
    tags: ["Public Statements", "Automated stance read"],
    source: { label: item.attribution, url: item.link },
    pipeline: {
      position: item.position,
      confidence: item.confidence,
      source_type: item.source_type,
      excerpt: item.excerpt,
      ...(item.excerpt_kind ? { excerpt_kind: item.excerpt_kind } : {}),
      attribution: item.attribution,
      rules_version: item.rules_version,
      captured: item.date,
      ...(item.strength ? { strength: item.strength } : {}),
      ...(item.stated_position ? { stated_position: true } : {}),
      ...(item.primary_kind ? { primary_kind: item.primary_kind } : {}),
      // What the candidate said, never a formal record or completed action.
      layer: "stated",
      formal_record: false,
      ...(item.regraded_from ? { regraded_from: item.regraded_from } : {}),
      ...(item.page_topic && item.page_topic !== item.topic ? { page_topic: item.page_topic } : {}),
      ...(item.stated_date ? { stated_date: item.stated_date } : {}),
      ...(item.rescored ? { rescored: item.rescored } : {}),
      ...(item.implication_count ? { implication_count: item.implication_count } : {}),
      source_tier: sourceTierOf(item),
      ...(key ? { key } : {}),
    },
    ...(review ? { review: { status: review.status, ...(review.note ? { note: review.note } : {}), ...(review.date ? { date: review.date } : {}) } } : {}),
  };
}

/**
 * Decide, build and write-once. Never throws, never overwrites.
 * Logs exactly one "evidence-locker:" line per call. Returns
 * { written, key?, item?, reason }.
 */
export async function maybeWriteLockerItem(candidate, raw, { store, gt = null, log = console.log, flags = null } = {}) {
  const id = `${candidate?.politician_id}|${candidate?.topic}${raw?.source_id ? "|" + raw.source_id : ""}`;
  try {
    const d = lockerDecision(candidate, raw, gt);
    if (!d.write) {
      log(`evidence-locker: SKIP ${id} — ${d.reason}`);
      return { written: false, reason: d.reason };
    }
    const item = buildLockerItem(candidate, raw, d.strength);
    const key = lockerKey(item);
    const existing = await store.get(key, { type: "json" });
    // A manually flagged item (override file or the item's own review field) is
    // an editor's call: the cron never writes over it, upgrade or not.
    const flag = reviewFor(existing || item, key, flags);
    if (flag) {
      log(`evidence-locker: FLAGGED ${id} → ${LOCKER_STORE_NAME}/${key} — manually flagged "${flag.status}", left unchanged`);
      return { written: false, key, reason: `manually flagged (${flag.status})`, flagged: flag.status };
    }
    const conflict = await heldConflict(candidate, key, { store, flags });
    if (conflict) {
      const why = `cross-topic ${candidate.position} read (from a ${candidate.page_topic} page) conflicts with the held ${conflict.position} stance from ${conflict.link || conflict.key}`;
      log(`evidence-locker: HELD ${id} → ${LOCKER_STORE_NAME}/${key} — ${why}; not written`);
      return { written: false, key, reason: why, held: conflict.key };
    }
    const fields = () => JSON.stringify({ strength: item.strength, position: item.position, confidence: item.confidence, ...(item.implication_count ? { implication_count: item.implication_count } : {}), link: item.link, attribution: item.attribution, source_tier: item.source_tier, reason: d.reason });
    if (existing && isOlderRules(existing, item)) {
      // W4 (phase9-v1): a read under older rules is replaced by today's read.
      const next = withRescore(item, existing);
      await store.setJSON(key, next);
      log(`evidence-locker: RESCORE ${id} → ${LOCKER_STORE_NAME}/${key} (${existing.rules_version || "unversioned"} ${storedStrength(existing)} ${existing.position} → ${item.rules_version} ${item.strength} ${item.position}) ${fields()}`);
      return { written: true, key, item: next, reason: d.reason, rescored_from: next.rescored };
    }
    if (existing) {
      const was = storedStrength(existing);
      if (STRENGTH_RANK[item.strength] <= STRENGTH_RANK[was]) {
        log(`evidence-locker: EXISTS ${id} → ${LOCKER_STORE_NAME}/${key} — ${was} item left unchanged (new read is ${item.strength})`);
        return { written: false, key, reason: "already in locker" };
      }
      // A weaker item is upgraded to a stronger read of the same page; a strong
      // item never reaches here.
      await store.setJSON(key, item);
      log(`evidence-locker: WRITE ${id} → ${LOCKER_STORE_NAME}/${key} (upgrade ${was} → ${item.strength}) ${fields()}`);
      return { written: true, key, item, reason: d.reason, upgraded_from: was };
    }
    // onlyIfNew guards the get→set race between overlapping runs.
    const res = await store.setJSON(key, item, { onlyIfNew: true });
    if (res && res.modified === false) {
      log(`evidence-locker: EXISTS ${id} → ${LOCKER_STORE_NAME}/${key} — left unchanged`);
      return { written: false, key, reason: "already in locker" };
    }
    log(`evidence-locker: WRITE ${id} → ${LOCKER_STORE_NAME}/${key} ${fields()}`);
    return { written: true, key, item, reason: d.reason };
  } catch (e) {
    log(`evidence-locker: ERROR ${id} — ${e?.message || e}`);
    return { written: false, reason: `error: ${e?.message || e}` };
  }
}

/** Was `existing` written under an older scorer rules version than `item`? */
export function isOlderRules(existing, item) {
  if (!existing || !item?.rules_version) return false;
  return String(existing.rules_version || "") !== String(item.rules_version);
}

/** `item` carrying the read it replaced (audit): `rescored: { at, from }`. */
export function withRescore(item, existing, at = new Date().toISOString()) {
  return {
    ...item,
    rescored: {
      at,
      from: {
        position: existing?.position ?? null,
        confidence: existing?.confidence ?? null,
        strength: storedStrength(existing),
        rules_version: existing?.rules_version ?? null,
        excerpt: existing?.excerpt ?? null,
      },
    },
  };
}

// ── STATEMENT DATE (phase9-v1) ──────────────────────────────────────────────
// When the politician SAID it, read from the page itself — never the capture
// date. Used only to tell a change of position over time (stanceConsistency).
// Sources, most specific first: article:published_time / datePublished /
// <time datetime>, a "Month D, YYYY" dateline near the top, a /YYYY/MM/(DD)/
// URL path. Nothing found → null (the item is simply undated).
const MONTH_N = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const isoOk = (y, m, d) => y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
// Living pages (issue / priority / platform pages, homepages, member pages) are
// edited in place and carry a site-wide date, not a statement date: undated.
const DATED_DOCUMENT = /\b(?:release|statement|speech|remarks|floor|op-?ed|letter|transcript|hearing|congressional record|interview|newsletter|column|testimony)\b/i;
const LIVING_PAGE = /\b(?:issues?|priorit\w*|platform|homepage|home page|member page|about|biography|newsroom)\b/i;
export function statementDateOf(raw) {
  const type = String(raw?.source_type || "");
  if (!DATED_DOCUMENT.test(type) || (LIVING_PAGE.test(type) && !/\b(?:release|statement)\b/i.test(type))) return null;
  const body = String(raw?.body || "").slice(0, 200_000);
  const meta = /(?:article:published_time|datePublished|date_published|publish(?:ed)?[_-]?date|dc\.date)["']?\s*(?:content|:)\s*=?\s*["']\s*(\d{4})-(\d{2})-(\d{2})/i.exec(body)
    || /<time[^>]*\bdatetime=["'](\d{4})-(\d{2})-(\d{2})/i.exec(body);
  if (meta && isoOk(+meta[1], +meta[2], +meta[3])) return iso(+meta[1], +meta[2], +meta[3]);
  const text = body.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").slice(0, 6000);
  const dl = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),\s+(\d{4})\b/.exec(text);
  if (dl) { const m = MONTH_N[dl[1].slice(0, 4).toLowerCase()] || MONTH_N[dl[1].slice(0, 3).toLowerCase()]; if (isoOk(+dl[3], m, +dl[2])) return iso(+dl[3], m, +dl[2]); }
  const u = /\/((?:19|20)\d{2})\/(\d{1,2})(?:\/(\d{1,2}))?\//.exec(String(raw?.final_url || raw?.url || ""));
  if (u && isoOk(+u[1], +u[2], +(u[3] || 1))) return iso(+u[1], +u[2], +(u[3] || 1));
  return null;
}

/**
 * W6: for a cross-topic candidate with a clear position, the first item the
 * Locker holds for the same politician + topic from a different page whose
 * clear position runs the other way ({ key, position, link }), or null. Hidden
 * items do not count. On-topic candidates, and stores that cannot be listed,
 * never conflict.
 */
export async function heldConflict(candidate, key, { store, flags = null } = {}) {
  if (!candidate?.page_topic || candidate.page_topic === candidate.topic || !isClear(candidate.position)) return null;
  // phase9-v1: strong evidence on the other side is kept (Mixed), never held back.
  if (lockerStrength(candidate).strength === "strong") return null;
  if (!store || typeof store.list !== "function") return null;
  const prefix = `${candidate.politician_id}/${candidate.topic}/`;
  let blobs = [];
  try { ({ blobs = [] } = (await store.list({ prefix })) || {}); } catch { return null; }
  for (const k of blobs.map((b) => b.key).filter((k) => String(k).startsWith(prefix) && k !== key)) {
    let doc = await store.get(k, { type: "json" }).catch(() => null);
    if (typeof doc === "string") { try { doc = JSON.parse(doc); } catch { doc = null; } }
    if (!doc || reviewFor(doc, k, flags)?.status === "hidden") continue;
    if (isClear(doc.position) && doc.position !== candidate.position) return { key: k, position: doc.position, link: doc.link ?? null };
  }
  return null;
}

// ── Manual review flags ─────────────────────────────────────────────────────
// An editor can flag any Locker item in db/evidence-locker-review.json:
//
//   { "items": [ { "key": "<politician_id>/<topic>/<hash>.json",   ← or:
//                  "politician_id": "…", "link": "https://…", "topic": "…",
//                  "status": "reviewed" | "needs_edit" | "hidden",
//                  "note": "optional", "by": "optional", "date": "YYYY-MM-DD" } ] }
//
// A flag matches by the item's store key (every served entry carries it under
// pipeline.key) or by politician + link (+ topic when given). A flag can also
// be stored on the Blobs item itself as `review: { status, … }`; the file wins
// when both exist.
//   · hidden      — the item is never served, so no profile shows it.
//   · reviewed    — served with review.status, and profiles print a small
//                   "Reviewed" note on its line.
//   · needs_edit  — served as before (status visible in the API for audit).
// The cron NEVER writes over a flagged item (see maybeWriteLockerItem).
export const REVIEW_STATUSES = ["reviewed", "needs_edit", "hidden"];

const normLink = (u) => {
  try { const x = new URL(u); x.hash = ""; return (x.origin + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase(); }
  catch { return String(u || "").toLowerCase(); }
};

/** Validate the override file into a lookup. Bad rows are dropped, never thrown. */
export function loadReviewFlags(doc) {
  const rows = Array.isArray(doc) ? doc : Array.isArray(doc?.items) ? doc.items : [];
  const byKey = new Map(), byLink = new Map();
  for (const r of rows) {
    if (!r || !REVIEW_STATUSES.includes(r.status)) continue;
    const flag = { status: r.status, ...(r.note ? { note: String(r.note) } : {}), ...(r.by ? { by: String(r.by) } : {}), ...(r.date ? { date: String(r.date) } : {}) };
    if (r.key) byKey.set(String(r.key), flag);
    if (r.politician_id && r.link) {
      byLink.set(`${r.politician_id}|${normLink(r.link)}`, [...(byLink.get(`${r.politician_id}|${normLink(r.link)}`) || []), { topic: r.topic || null, flag }]);
    }
  }
  return { byKey, byLink };
}

/** The manual flag for one item (file first, then the item's own), or null. */
export function reviewFor(item, key, flags) {
  if (flags) {
    const k = key || (item && item.politician_id && item.topic && item.link ? lockerKey(item) : null);
    if (k && flags.byKey?.has(k)) return flags.byKey.get(k);
    const hits = flags.byLink?.get(`${item?.politician_id}|${normLink(item?.link)}`) || [];
    const hit = hits.find((h) => !h.topic || h.topic === item?.topic);
    if (hit) return hit.flag;
  }
  const own = item?.review;
  return own && REVIEW_STATUSES.includes(own.status) ? own : null;
}

/**
 * Strong and weak Locker items per politician + issue (the per-issue baseline
 * count): { "pid|topic": { strong, weak } }. Mentions and hidden items are left
 * out. `pids` limits the count to those politicians. Read-only; returns {} when
 * the store cannot be listed.
 */
export async function lockerBaselineCounts(store, { flags = null, pids = null, log = console.log } = {}) {
  const counts = {};
  if (!store || typeof store.list !== "function") return counts;
  const want = pids ? new Set(pids) : null;
  try {
    const { blobs = [] } = (await store.list()) || {};
    const keys = blobs.map((b) => b.key).filter((k) => !want || want.has(String(k).split("/")[0]));
    const docs = await readLockerDocs(store, keys);
    for (const { key, doc } of docs) {
      if (!doc || !doc.politician_id || !doc.topic) continue;
      if (want && !want.has(doc.politician_id)) continue;
      if (reviewFor(doc, key, flags)?.status === "hidden") continue;
      const s = storedStrength(regradeStatedPosition(doc));
      if (s !== "strong" && s !== "weak") continue;
      const c = (counts[`${doc.politician_id}|${doc.topic}`] ||= { strong: 0, weak: 0 });
      c[s] += 1;
    }
  } catch (e) {
    log(`evidence-locker: baseline count unavailable — ${e?.message || e}`);
  }
  return counts;
}

// ── Cached baseline counts (the every-minute raw-ingest run) ───────────────
// lockerBaselineCounts reads EVERY Locker item. With the whole roster in scope
// (8,000+ politicians, 33,000+ items) that read alone took ~40 s, so every
// every-minute run hit the function timeout before it reached promotion, the
// seen ledger, the transcriber wake or the run log. The scheduled run instead
// reads one cached doc and refreshes it from the Locker at most every
// BASELINE_CACHE_TTL_MS. The counts only order the rotation and mark pairs
// "filled", so a few minutes of staleness changes priority, never a write.
export const BASELINE_CACHE_KEY = "baseline-counts.json";
export const BASELINE_CACHE_TTL_MS = 30 * 60_000;
export const BASELINE_REFRESH_CLAIM_MS = 3 * 60_000;

const onlyPids = (counts, pids) => {
  if (!pids) return { ...counts };
  const want = new Set(pids);
  return Object.fromEntries(Object.entries(counts || {}).filter(([k]) => want.has(k.split("|")[0])));
};

/**
 * Baseline counts from the cache doc in `cacheStore`, refreshed from the
 * Locker when older than `ttlMs`. Returns { counts, source, ms } where source
 * is "cache" | "stale" (another run is refreshing) | "refreshed" | "live" (no
 * usable cache store: the plain lockerBaselineCounts read, as before).
 */
export async function cachedBaselineCounts(lockerStore, cacheStore, { flags = null, pids = null, log = console.log, now = () => new Date(), ttlMs = BASELINE_CACHE_TTL_MS } = {}) {
  const t0 = Date.now();
  const live = async () => ({ counts: await lockerBaselineCounts(lockerStore, { flags, pids, log }), source: "live", ms: Date.now() - t0 });
  if (!cacheStore || typeof cacheStore.get !== "function" || typeof cacheStore.setJSON !== "function") return live();
  let doc = null;
  try {
    doc = await cacheStore.get(BASELINE_CACHE_KEY, { type: "json" });
    if (typeof doc === "string") doc = JSON.parse(doc);
  } catch { doc = null; }
  const nowMs = now().getTime();
  const has = doc && doc.counts && typeof doc.counts === "object";
  const age = has ? nowMs - Date.parse(doc.computed_at || 0) : Infinity;
  if (has && age >= 0 && age < ttlMs) return { counts: onlyPids(doc.counts, pids), source: "cache", ms: Date.now() - t0, age_ms: age };
  if (has && Number(doc.refreshing_until) > nowMs) return { counts: onlyPids(doc.counts, pids), source: "stale", ms: Date.now() - t0, age_ms: age };
  try { await cacheStore.setJSON(BASELINE_CACHE_KEY, { ...(doc || {}), refreshing_until: nowMs + BASELINE_REFRESH_CLAIM_MS }); } catch { /* best effort */ }
  const all = await lockerBaselineCounts(lockerStore, { flags, log });
  try { await cacheStore.setJSON(BASELINE_CACHE_KEY, { computed_at: now().toISOString(), pairs: Object.keys(all).length, counts: all }); }
  catch (e) { log(`evidence-locker: baseline cache not saved — ${e?.message || e}`); }
  return { counts: onlyPids(all, pids), source: "refreshed", ms: Date.now() - t0 };
}

/** counts + this run's Locker writes (strong / weak only), without re-reading the Locker. */
export function bumpBaselineCounts(counts, writes = []) {
  const out = {};
  for (const [k, c] of Object.entries(counts || {})) out[k] = { strong: Number(c?.strong) || 0, weak: Number(c?.weak) || 0 };
  for (const w of writes || []) {
    if (!w?.politician_id || !w?.topic || (w.strength !== "strong" && w.strength !== "weak")) continue;
    const c = (out[`${w.politician_id}|${w.topic}`] ||= { strong: 0, weak: 0 });
    c[w.strength] += 1;
  }
  return out;
}

// ── Stated positions written under the older rules ─────────────────────────
// Before scorer R8, one or two explicit claims on a campaign/official page
// scored 0.70 and were stored as "weak". The stored confidence_reason says
// exactly what the read rested on, so an item is re-read as R8 would score it
// when (all hold): a clear position, stored below the strong bar, from a
// primary source, resting on at least one explicit statement for that side,
// with no outliers and no reversal. Implication-only reads stay as they are.
// Pure: returns the item unchanged, or a new object.
const EXPLICIT_FOR = /\b([1-9]\d*) clear (?:medium|high)-weight statement\(s\) for (support|oppose)\b/;
export function regradeStatedPosition(item) {
  if (!item || !isClear(item.position)) return item;
  const c = numOr(item.confidence, null);
  if (c === null || c >= LOCKER_MIN_CONFIDENCE || c < LOCKER_WEAK_MIN_CONFIDENCE) return item;
  if (item.strength && item.strength !== "weak") return item;
  const reason = String(item.confidence_reason || "");
  const m = EXPLICIT_FOR.exec(reason);
  if (!m || m[2] !== item.position || /outlier|reversal|R5\b/i.test(reason)) return item;
  const rule = statedSourceRule(item.source_type, item.link);
  if (!rule) return item;
  // The stored excerpt is the claim the read rests on: it must be the
  // candidate's own words, and a non-official release must name a bill or outcome.
  if (quotedSpeakerOf(item.excerpt, item.politician_id) === "other") return item;
  if (rule.needsSpecific && !namesBillOrOutcome(item.excerpt)) return item;
  const floor = SCORE_WEIGHTS.statedPositionConfidence;
  const label = KIND_LABELS[rule.kind];
  return {
    ...item,
    confidence: floor,
    strength: floor >= LOCKER_MIN_CONFIDENCE ? "strong" : "weak",
    stated_position: true,
    primary_kind: rule.kind,
    confidence_reason: `${reason}; explicit claim on a primary source${label ? ` (${label})` : ""} reads as a stated position (R8, re-read when served)`,
    regraded_from: { confidence: c, rules_version: item.rules_version ?? null },
  };
}

const normClaim = (t) => String(t || "").toLowerCase().replace(/[“”"‘’'…]/g, "").replace(/\s+/g, " ").trim();
const REVIEW_RANK = { reviewed: 2, needs_edit: 1 };

/**
 * One claim, one issue. Items for ONE politician that quote the same excerpt
 * from the same page under different issue keys restate one claim: only one
 * is kept. Preference: an editor-reviewed item, then the page's own topic (no
 * page_topic), then the stronger read, then higher confidence, then first seen.
 * `rows` is [{ key, doc, review }]; returns the survivors in input order.
 */
export function collapseRestatedItems(rows) {
  const groups = new Map();
  rows.forEach((r, i) => {
    const d = r.doc || {};
    const ex = normClaim(d.excerpt);
    const g = ex ? `${d.politician_id}|${normLink(d.link)}|${ex}` : `#${i}`;
    (groups.get(g) || groups.set(g, []).get(g)).push({ r, i });
  });
  const keep = new Set();
  for (const list of groups.values()) {
    list.sort((a, b) =>
      (REVIEW_RANK[b.r.review?.status] || 0) - (REVIEW_RANK[a.r.review?.status] || 0) ||
      (a.r.doc.page_topic ? 1 : 0) - (b.r.doc.page_topic ? 1 : 0) ||
      (STRENGTH_RANK[storedStrength(b.r.doc)] || 0) - (STRENGTH_RANK[storedStrength(a.r.doc)] || 0) ||
      numOr(b.r.doc.confidence, 0) - numOr(a.r.doc.confidence, 0) ||
      a.i - b.i);
    keep.add(list[0].i);
  }
  return rows.filter((_, i) => keep.has(i));
}

// ── Own evidence only, each sentence once (locker-own-v1) ───────────────────
// Applied wherever Locker items are served or promoted, after
// collapseRestatedItems:
//   1. FOREIGN PAGE — an item whose page is not the politician's own
//      (itemOwnership) is dropped. An editor-reviewed item stays (their call).
//   2. SITE MENU — a sentence that one politician's items quote from
//      MENU_MIN_PAGES (a heading / label) or SENTENCE_MENU_MIN_PAGES (a full
//      sentence) or more different ARTICLE pages of the SAME site (listing
//      pages — newsroom, homepage, release index — repeat every lead sentence
//      and do not count, isIndexPage) is site text
//      (a menu, sidebar, footer or repeated heading — "Help for Veterans",
//      "Supporting Law Enforcement"), not a statement: every copy is dropped.
//   3. REPEATED SENTENCE — the same sentence quoted from two pages on the same
//      issue is one statement: it is served once, so it counts once toward
//      Steady and every promotion threshold. The kept copy is the editor-
//      reviewed one, then the page's own topic, then the stronger read, then
//      higher confidence, then the first in input order.
export const MENU_MIN_PAGES = 3;
// A full sentence (12+ words, closing punctuation) repeated on a few pages is
// usually one statement shown again in a "related news" sidebar: it counts
// once (rule 3). Only on SENTENCE_MENU_MIN_PAGES or more pages is it site text.
export const SENTENCE_MENU_MIN_PAGES = 6;
const FULL_SENTENCE_WORDS = 12;
/** Is this excerpt a full sentence, as opposed to a heading / label / fragment? */
export const isFullSentence = (t) => String(t || "").trim().split(/\s+/).length >= FULL_SENTENCE_WORDS && /[.!?]["”’)]?$/.test(String(t || "").trim());
export const OWN_EVIDENCE_VERSION = "locker-own-v1";

// A listing page (newsroom, homepage, press-release index, page 2 …) repeats the
// lead sentence of every release it lists. Those copies are not "the same text
// on many pages": only article pages count toward the site-menu test.
const INDEX_TYPE = /\b(?:newsroom|homepage|home page|index|in the news|press releases page|existing page)\b/i;
const INDEX_PATH = /^\/?(?:index\.\w+)?$|\/(?:press-releases?|news|media|newsroom|statements|press|blog|updates|releases|in-the-news|media-center)\/?$/i;
export function isIndexPage(doc) {
  if (INDEX_TYPE.test(String(doc?.source_type || ""))) return true;
  try { const u = new URL(String(doc?.link || "")); return INDEX_PATH.test(u.pathname) || /[?&](?:page|p|pg)=\d/.test(u.search); } catch { return false; }
}
const siteOf = (link) => { try { return new URL(String(link)).hostname.toLowerCase().replace(/^www\d?\./, ""); } catch { return ""; } };
/** A sentence, normalised for "is this the same text?" (case, quotes, punctuation, spacing). */
export const sameTextKey = (t) => String(t || "").toLowerCase().normalize("NFKC").replace(/[“”"‘’'…•●▪·|]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * rows [{ key, doc, review }] → { kept, dropped: { foreign, menu, repeated },
 * reasons: { [key]: reason } }. Pure; works on one or many politicians.
 */
export function ownEvidenceRows(rows, { menuMinPages = MENU_MIN_PAGES, sentenceMenuMinPages = SENTENCE_MENU_MIN_PAGES } = {}) {
  const dropped = { foreign: 0, menu: 0, repeated: 0 };
  const reasons = {};
  const reviewed = (r) => r.review?.status === "reviewed";
  // 1. Foreign pages.
  const own = [];
  for (const r of rows || []) {
    const o = reviewed(r) ? { own: true } : itemOwnership(r.doc);
    if (o.own) own.push(r);
    else { dropped.foreign++; reasons[r.key] = `not their own page (${o.kind}): ${o.reason}`; }
  }
  // 2. Site menus: the same sentence on many pages of one site, per politician.
  const pages = new Map();
  for (const r of own) {
    const t = sameTextKey(r.doc?.excerpt);
    if (!t) continue;
    const g = `${r.doc.politician_id}|${siteOf(r.doc.link)}|${t}`;
    if (!pages.has(g)) pages.set(g, new Set());
    if (!isIndexPage(r.doc)) pages.get(g).add(String(r.doc.link));
  }
  const menuGroup = (r) => { const t = sameTextKey(r.doc?.excerpt); return t ? pages.get(`${r.doc.politician_id}|${siteOf(r.doc.link)}|${t}`) : null; };
  const notMenu = [];
  for (const r of own) {
    const g = menuGroup(r);
    if (g && g.size >= (isFullSentence(r.doc.excerpt) ? sentenceMenuMinPages : menuMinPages) && !reviewed(r)) { dropped.menu++; reasons[r.key] = `site menu or repeated heading: the same text is on ${g.size} article pages of ${siteOf(r.doc.link)}`; }
    else notMenu.push(r);
  }
  // 3. One sentence, one statement: the same text on one issue counts once.
  const groups = new Map();
  notMenu.forEach((r, i) => {
    const t = sameTextKey(r.doc?.excerpt);
    const g = t ? `${r.doc.politician_id}|${r.doc.topic}|${t}` : `#${i}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ r, i });
  });
  const keep = new Set();
  for (const list of groups.values()) {
    list.sort((a, b) =>
      (reviewed(b.r) ? 1 : 0) - (reviewed(a.r) ? 1 : 0) ||
      (a.r.doc.page_topic ? 1 : 0) - (b.r.doc.page_topic ? 1 : 0) ||
      (STRENGTH_RANK[storedStrength(b.r.doc)] || 0) - (STRENGTH_RANK[storedStrength(a.r.doc)] || 0) ||
      numOr(b.r.doc.confidence, 0) - numOr(a.r.doc.confidence, 0) ||
      a.i - b.i);
    keep.add(list[0].i);
    for (const x of list.slice(1)) { dropped.repeated++; reasons[x.r.key] = `the same sentence is already counted from ${list[0].r.doc.link}`; }
  }
  return { kept: notMenu.filter((_, i) => keep.has(i)), dropped, reasons };
}
