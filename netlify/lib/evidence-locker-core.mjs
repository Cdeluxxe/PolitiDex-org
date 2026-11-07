// ─────────────────────────────────────────────────────────────────────────────
// evidence-locker-core.mjs — Phase 6: high-confidence candidates → Evidence Locker
// ─────────────────────────────────────────────────────────────────────────────
// After the scorer logs a candidate for a freshly stored raw record, this module
// decides whether that candidate is good enough to become a FINISHED Evidence
// Locker item, and if so writes it once to the "evidence-locker" Blobs store.
//
// WRITE RULES (all must hold):
//   W1  The position is clear: "support" or "oppose" ("mixed" and "no clear
//       position" never write).
//   W2  Confidence ≥ LOCKER_MIN_CONFIDENCE (0.8).
//   W3  Provenance:
//         · the ground-truth pair (james_talarico | cost_living) writes only
//           when the candidate's position MATCHES the ground-truth position;
//         · every other pair writes only when the source is a campaign or
//           official page (source type says "campaign"/"official", or the link
//           is on a .gov host).
//   W4  Never overwrite: an item already at the key is left exactly as it is.
//
// The ground-truth record is passed in read-only; this module never writes it.
// Pure and dependency-injected (store, log) so the test suite runs it without a
// Blobs environment.

import { createHash } from "node:crypto";

export const LOCKER_STORE_NAME = "evidence-locker";
export const LOCKER_MIN_CONFIDENCE = 0.8;
export const LOCKER_ITEM_VERSION = "locker-v1";

const CLEAR_POSITIONS = new Set(["support", "oppose"]);
const EXCERPT_MAX = 280;

export const TOPIC_LABELS = {
  cost_living: "the cost of living",
  healthcare_costs: "health care costs",
};

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

/**
 * Should this candidate become a Locker item?
 * `gt` is the ground-truth record (or null). Returns { write, reason }.
 */
export function lockerDecision(candidate, raw, gt = null) {
  if (!candidate) return { write: false, reason: "no candidate" };
  if (!CLEAR_POSITIONS.has(candidate.position)) {
    return { write: false, reason: `position "${candidate.position}" is not clear` };
  }
  if (!(candidate.confidence >= LOCKER_MIN_CONFIDENCE)) {
    return { write: false, reason: `confidence ${candidate.confidence} < ${LOCKER_MIN_CONFIDENCE}` };
  }
  const src = candidate.sources?.[0] || {};
  if (!src.excerpt) return { write: false, reason: "no excerpt to show" };
  const isGtPair = gt && candidate.politician_id === gt.politician_id && candidate.topic === gt.topic;
  if (isGtPair) {
    return candidate.position === gt.position
      ? { write: true, reason: `matches ground-truth position (${gt.position})` }
      : { write: false, reason: `position ${candidate.position} does not match ground truth (${gt.position})` };
  }
  const link = raw?.final_url || raw?.url || src.link;
  if (!isCampaignOrOfficial(raw?.source_type ?? src.type, link)) {
    return { write: false, reason: `source "${raw?.source_type ?? src.type}" is not a campaign/official page` };
  }
  return { write: true, reason: `confidence ≥ ${LOCKER_MIN_CONFIDENCE} on a campaign/official page` };
}

/** The finished Locker item for a candidate + the raw record it came from. */
export function buildLockerItem(candidate, raw) {
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
    // Provenance — how this item was made, for audit.
    link_status: raw?.http_status ?? null,
    confidence_reason: candidate.confidence_reason,
    rules_version: candidate.rules_version,
    item_version: LOCKER_ITEM_VERSION,
    captured_at: raw?.fetched_at ?? null,
    ...(raw?.source_id ? { source_id: raw.source_id } : {}),
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
export function toSpotlightEntry(item) {
  const who = surnameOf(item.politician_id);
  const subject = TOPIC_LABELS[item.topic] || String(item.topic).replace(/_/g, " ");
  const verb = item.position === "support" ? "commits to lowering" : "opposes measures to lower";
  const page = /official/i.test(item.attribution) ? "official page" : "campaign page";
  return {
    // The page type rides in the headline so two pages on one topic stay two
    // receipts (the Locker de-duplicates by headline within a member).
    headline: `${who} ${verb} ${subject} (${item.source_type})`,
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
    },
  };
}

/**
 * Decide, build and write-once. Never throws, never overwrites.
 * Logs exactly one "evidence-locker:" line per call. Returns
 * { written, key?, item?, reason }.
 */
export async function maybeWriteLockerItem(candidate, raw, { store, gt = null, log = console.log } = {}) {
  const id = `${candidate?.politician_id}|${candidate?.topic}${raw?.source_id ? "|" + raw.source_id : ""}`;
  try {
    const d = lockerDecision(candidate, raw, gt);
    if (!d.write) {
      log(`evidence-locker: SKIP ${id} — ${d.reason}`);
      return { written: false, reason: d.reason };
    }
    const item = buildLockerItem(candidate, raw);
    const key = lockerKey(item);
    const existing = await store.get(key, { type: "json" });
    if (existing) {
      log(`evidence-locker: EXISTS ${id} → ${LOCKER_STORE_NAME}/${key} — left unchanged`);
      return { written: false, key, reason: "already in locker" };
    }
    // onlyIfNew guards the get→set race between overlapping runs.
    const res = await store.setJSON(key, item, { onlyIfNew: true });
    if (res && res.modified === false) {
      log(`evidence-locker: EXISTS ${id} → ${LOCKER_STORE_NAME}/${key} — left unchanged`);
      return { written: false, key, reason: "already in locker" };
    }
    log(`evidence-locker: WRITE ${id} → ${LOCKER_STORE_NAME}/${key} ${JSON.stringify({ position: item.position, confidence: item.confidence, link: item.link, attribution: item.attribution, reason: d.reason })}`);
    return { written: true, key, item, reason: d.reason };
  } catch (e) {
    log(`evidence-locker: ERROR ${id} — ${e?.message || e}`);
    return { written: false, reason: `error: ${e?.message || e}` };
  }
}
