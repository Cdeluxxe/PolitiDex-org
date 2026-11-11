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
//   W4  Never overwrite a strong item. A weak or mention item already at the
//       key is only replaced by a STRONGER read of the same page; same or
//       weaker reads leave it exactly as it is.
//
// STATED LAYER ONLY. Every item is what a politician SAID (layer "stated",
// formal_record false). An explicit claim on a primary source (scorer R8)
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
import { isPrimarySource, WEIGHTS as SCORE_WEIGHTS } from "./stance-score-core.mjs";

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
  if (clear && c >= LOCKER_WEAK_MIN_CONFIDENCE) return { strength: "weak", reason: `clear ${candidate.position} at confidence ${c} (${LOCKER_WEAK_MIN_CONFIDENCE}–${LOCKER_MIN_CONFIDENCE})` };
  const why = clear ? `confidence ${c} < ${LOCKER_WEAK_MIN_CONFIDENCE}` : `position "${candidate?.position}" is not clear`;
  const mentions = topicMentionCount(candidate);
  const excerpt = String(candidate?.sources?.[0]?.excerpt || "").trim();
  if (!mentions) return { strength: null, reason: `${why} and no topic mentions` };
  if (!excerpt) return { strength: null, reason: `${why} and no excerpt to show` };
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
 * Should this candidate become a Locker item?
 * `gt` is the ground-truth record (or null). Returns { write, strength?, reason }.
 */
export function lockerDecision(candidate, raw, gt = null) {
  if (!candidate) return { write: false, reason: "no candidate" };
  const { strength, reason } = lockerStrength(candidate);
  if (!strength) return { write: false, reason };
  const src = candidate.sources?.[0] || {};
  if (!String(src.excerpt || "").trim()) return { write: false, reason: "no excerpt to show" };
  const isGtPair = gt && candidate.politician_id === gt.politician_id && candidate.topic === gt.topic;
  if (isGtPair) {
    if (strength === "mention") return { write: true, strength, reason: `${reason}; ground-truth pair, mention carries no position` };
    return candidate.position === gt.position
      ? { write: true, strength, reason: `${reason}; matches ground-truth position (${gt.position})` }
      : { write: false, reason: `position ${candidate.position} does not match ground truth (${gt.position})` };
  }
  const link = raw?.final_url || raw?.url || src.link;
  if (!isCampaignOrOfficial(raw?.source_type ?? src.type, link)) {
    return { write: false, reason: `source "${raw?.source_type ?? src.type}" is not a campaign/official page` };
  }
  return { write: true, strength, reason: `${reason} on a campaign/official page` };
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
    excerpt: trimExcerpt(src.excerpt),
    date,
    attribution: attributionFor(source_type, link),
    strength,
    ...(numOr(src.implication_count, 0) > 0 ? { implication_count: src.implication_count } : {}),
    // Provenance — how this item was made, for audit.
    link_status: raw?.http_status ?? null,
    confidence_reason: candidate.confidence_reason,
    rules_version: candidate.rules_version,
    ...(candidate.stated_position ? { stated_position: true } : {}),
    layer: "stated",
    formal_record: false,
    item_version: LOCKER_ITEM_VERSION,
    captured_at: raw?.fetched_at ?? null,
    ...(raw?.source_id ? { source_id: raw.source_id } : {}),
    // Scored from a page filed under another topic (multi-topic pass).
    ...(candidate.page_topic && candidate.page_topic !== candidate.topic ? { page_topic: candidate.page_topic } : {}),
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
  const page = /official/i.test(item.attribution) ? "official page" : "campaign page";
  return {
    // The page type rides in the headline so two pages on one topic stay two
    // receipts (the Locker de-duplicates by headline within a member).
    headline: `${who} ${headlinePhrase(item.topic, item.position)} (${item.source_type})`,
    facts: `On ${who}'s ${page}, ${who} stated: “${item.excerpt}” ${item.attribution}. Captured ${displayDate(item.date)}.`,
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
      attribution: item.attribution,
      rules_version: item.rules_version,
      captured: item.date,
      ...(item.strength ? { strength: item.strength } : {}),
      ...(item.stated_position ? { stated_position: true } : {}),
      // What the candidate said, never a formal record or completed action.
      layer: "stated",
      formal_record: false,
      ...(item.regraded_from ? { regraded_from: item.regraded_from } : {}),
      ...(item.implication_count ? { implication_count: item.implication_count } : {}),
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
    const fields = () => JSON.stringify({ strength: item.strength, position: item.position, confidence: item.confidence, ...(item.implication_count ? { implication_count: item.implication_count } : {}), link: item.link, attribution: item.attribution, reason: d.reason });
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
    const docs = await Promise.all(keys.map(async (key) => ({ key, doc: await store.get(key, { type: "json" }).catch(() => null) })));
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
  if (!isPrimarySource(item.source_type, item.link)) return item;
  const floor = SCORE_WEIGHTS.statedPositionConfidence;
  return {
    ...item,
    confidence: floor,
    strength: floor >= LOCKER_MIN_CONFIDENCE ? "strong" : "weak",
    stated_position: true,
    confidence_reason: `${reason}; explicit claim on a primary source reads as a stated position (R8, re-read when served)`,
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
