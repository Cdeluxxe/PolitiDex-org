// ─────────────────────────────────────────────────────────────────────────────
// stated-positions-core.mjs — Evidence Locker items → promoted stance records
// ─────────────────────────────────────────────────────────────────────────────
// The promotion step. The raw-ingest cron writes Evidence Locker items (what a
// politician SAID, read by the stance scorer); this module turns the items one
// politician holds into AT MOST ONE stance record per issue key, and syncs those
// records into the pdx_stated_positions table. GET /api/stated-positions serves
// them as stance cards in the ISSUE_STANCE_DATA shape, and stance-helpers.js
// merges them into _resolveStanceList / _polPositionMap — the one chokepoint
// every stance surface reads.
//
// THE THRESHOLDS ARE profile-locker.js promotedStance()'s, unchanged:
//   · an item's strength is strengthOf(): strong = clear support/oppose at
//     confidence ≥ 0.8 (or no confidence given), weak = clear at 0.3–0.79,
//     anything else is a mention and never a stance;
//   · per issue and side, level 2 = at least one strong item OR
//     PROMOTE_WEAK_N (3) weak items; level 1 = at least one weak item;
//   · the higher level wins; equal levels (nothing, or an even split) promote
//     nothing.
// The items read are exactly the ones the Locker endpoint serves: hidden items
// dropped, older items regraded, one claim restated under several keys served
// once (listLockerEntries in evidence-locker-items.mts).
//
// CURATED ALWAYS WINS — and is never written. This module writes only the
// pdx_stated_positions table. It cannot see the curated cards (they are
// committed client data), so the precedence rule is enforced where both meet:
// stance-helpers.js appends a pipeline card only for an issue key the person's
// curated list does not already carry.
//
// RECOMPUTE. syncPolitician() recomputes from the Locker every time it is
// called: an issue that qualifies is upserted (stance, text, counts, evidence
// refreshed); an active row whose issue no longer qualifies — an item hidden,
// a split appearing — is set to status 'withdrawn' (kept for audit, never
// served). The cron calls it for every politician with a Locker write in the run
// and for every politician it planned, so review-flag and regrade changes are
// picked up as the rotation reaches each person.
//
// Pure where it can be: promoteEntries / planSync / toCard take plain data; the
// database is reached only through the injected `db` adapter (dbAdapter below
// builds the production one).

import { toSpotlightEntry, reviewFor, regradeStatedPosition, collapseRestatedItems } from "./evidence-locker-core.mjs";

export const PROMOTE_WEAK_N = 3;
export const STRONG_MIN = 0.8;
export const WEAK_MIN = 0.3;
export const PROVENANCE = "pipeline";
export const STATED_POSITIONS_VERSION = "stated-positions-v1";
// A new Locker item on a politician + issue that is thin or empty puts that
// politician first in the run's recompute (never deferred by the run budget)
// when it is strong, or weak at this confidence or above.
export const PROMOTE_THIN_WEAK_MIN = 0.5;

/** Does this Locker write warrant an immediate recompute (see PROMOTE_THIN_WEAK_MIN)? */
export function promotableWrite(w) {
  if (!w) return false;
  if (w.strength === "strong") return true;
  return w.strength === "weak" && typeof w.confidence === "number" && w.confidence >= PROMOTE_THIN_WEAK_MIN;
}

const SIDES = ["support", "oppose"];
const isUrl = (u) => /^https?:\/\//.test(String(u || ""));
const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);

/** 'strong' | 'weak' | 'mention' | null — profile-locker.js strengthOf(), verbatim. */
export function strengthOf(entry) {
  const pl = (entry && entry.pipeline) || {};
  const clear = pl.position === "support" || pl.position === "oppose";
  const c = num(pl.confidence);
  if (clear && (c === null || c >= STRONG_MIN)) return "strong";
  if (clear && c >= WEAK_MIN) return "weak";
  return String(pl.excerpt || "").trim() ? "mention" : null;
}

const level = (s) => (s.strong || s.weak >= PROMOTE_WEAK_N ? 2 : s.weak ? 1 : 0);

/**
 * One issue's promotion from its entries, or null. `entries` are Locker entries
 * in the spotlight shape (toSpotlightEntry) for ONE politician and ONE issue.
 */
export function promoteIssue(entries) {
  const side = { support: { strong: 0, weak: 0, items: [] }, oppose: { strong: 0, weak: 0, items: [] } };
  for (const it of entries || []) {
    if (!it || !isUrl(it.source && it.source.url)) continue;
    if (it.review && it.review.status === "hidden") continue;
    const st = strengthOf(it);
    if (st !== "strong" && st !== "weak") continue; // a mention is never a stance
    const s = side[it.pipeline.position];
    if (!s) continue;
    s[st]++;
    s.items.push({ it, st });
  }
  const ls = level(side.support), lo = level(side.oppose);
  if (ls === lo) return null; // nothing, or an even split
  const pos = ls > lo ? "support" : "oppose";
  const s = side[pos];
  // The card quotes the best item on the winning side: strong before weak, then
  // higher confidence, then the newer capture, then the store key (deterministic).
  const best = s.items.slice().sort((a, b) =>
    (a.st === b.st ? 0 : a.st === "strong" ? -1 : 1)
    || ((num(b.it.pipeline.confidence) ?? 1) - (num(a.it.pipeline.confidence) ?? 1))
    || String(b.it.pipeline.captured || "").localeCompare(String(a.it.pipeline.captured || ""))
    || String(a.it.pipeline.key || "").localeCompare(String(b.it.pipeline.key || "")))[0].it;
  const confs = s.items.map((x) => num(x.it.pipeline.confidence)).filter((c) => c !== null);
  return {
    stance: pos,
    strength: Math.max(ls, lo) === 2 ? "strong" : "weak",
    strongCount: s.strong,
    weakCount: s.weak,
    text: String(best.pipeline.excerpt || "").trim(),
    sourceUrl: String(best.source.url),
    sourceLabel: String(best.source.label || best.pipeline.attribution || "Source"),
    confidence: confs.length ? Math.max(...confs) : null,
    rulesVersion: best.pipeline.rules_version || null,
    evidence: s.items.map((x) => x.it.pipeline.key).filter(Boolean).sort(),
  };
}

/**
 * One politician's Locker entries, read exactly as GET /api/evidence-locker/items
 * serves them (listLockerEntries): hidden items dropped, older items regraded,
 * restatements collapsed, spotlight shape. Lists only that politician's keys
 * (`<pid>/…`). `flags` = loadReviewFlags(db/evidence-locker-review.json).
 */
export async function lockerEntriesFor(store, pid, flags = null) {
  const { blobs = [] } = (await store.list({ prefix: `${pid}/` })) || {};
  const docs = await Promise.all(blobs.map(async (b) => ({ key: b.key, doc: await store.get(b.key, { type: "json" }).catch(() => null) })));
  const rows = [];
  for (const { key, doc } of docs) {
    if (!doc || doc.politician_id !== pid || !doc.link) continue;
    const review = reviewFor(doc, key, flags);
    if (review?.status === "hidden") continue;
    rows.push({ key, doc: regradeStatedPosition(doc), review });
  }
  return collapseRestatedItems(rows).map(({ key, doc, review }) => toSpotlightEntry(doc, { key, review }));
}

/** Every qualifying issue for one politician: { [issueKey]: promotion }. */
export function promoteEntries(entries) {
  const byIssue = {};
  for (const it of entries || []) {
    if (!it || !it.issueKey) continue;
    (byIssue[it.issueKey] ||= []).push(it);
  }
  const out = {};
  for (const k of Object.keys(byIssue).sort()) {
    const p = promoteIssue(byIssue[k]);
    if (p) out[k] = p;
  }
  return out;
}

const sameRow = (row, p) =>
  row.status === "active" && row.stance === p.stance && row.strength === p.strength
  && row.text === p.text && row.sourceUrl === p.sourceUrl && row.sourceLabel === p.sourceLabel
  && Number(row.strongCount) === p.strongCount && Number(row.weakCount) === p.weakCount
  && (num(Number(row.confidence)) ?? null) === (p.confidence ?? null)
  && (row.rulesVersion || null) === (p.rulesVersion || null)
  && JSON.stringify(row.evidence || []) === JSON.stringify(p.evidence);

/**
 * A row the promoter must leave exactly as it is: a curated (non-pipeline)
 * row, or an active pipeline row resting on a Locker item an editor marked
 * "reviewed". Returns the reason, or null.
 */
export function heldRowReason(row, reviewedKeys = new Set()) {
  if (!row) return null;
  if (row.provenance && row.provenance !== PROVENANCE) return `curated (${row.provenance})`;
  if (row.status === "active" && (Array.isArray(row.evidence) ? row.evidence : []).some((k) => reviewedKeys.has(k))) return "rests on reviewed evidence";
  return null;
}

/**
 * What to do for one politician: { upserts: [{ issueKey, ...promotion }],
 * withdraw: [issueKey], unchanged: [issueKey], held: [{ issueKey, reason }] }.
 * `rows` are that politician's existing pdx_stated_positions rows (any
 * status). Curated and reviewed rows (heldRowReason) are never upserted or
 * withdrawn.
 */
export function planSync(promotions, rows, { reviewedKeys = new Set() } = {}) {
  const have = new Map((rows || []).map((r) => [r.issueKey, r]));
  const upserts = [], withdraw = [], unchanged = [], held = [];
  for (const [issueKey, p] of Object.entries(promotions || {})) {
    const row = have.get(issueKey);
    const why = heldRowReason(row, reviewedKeys);
    if (why) held.push({ issueKey, reason: why });
    else if (row && sameRow(row, p)) unchanged.push(issueKey);
    else upserts.push({ issueKey, ...p });
  }
  for (const [issueKey, row] of have) {
    if (row.status !== "active" || issueKey in (promotions || {})) continue;
    const why = heldRowReason(row, reviewedKeys);
    if (why) held.push({ issueKey, reason: why });
    else withdraw.push(issueKey);
  }
  return { upserts, withdraw, unchanged, held };
}

/** Store keys of entries an editor marked "reviewed". */
export const reviewedKeysOf = (entries) => new Set((entries || [])
  .filter((e) => e?.review?.status === "reviewed" && e.pipeline?.key).map((e) => e.pipeline.key));

/**
 * Recompute and sync one politician. `entries` = that politician's Locker
 * entries (spotlight shape). `db` = { rowsFor(pid), upsert(pid, rec, now),
 * withdraw(pid, issueKeys, now) }. Never throws; logs one line.
 */
export async function syncPolitician(pid, entries, { db, now = () => new Date(), log = console.log } = {}) {
  try {
    const promotions = promoteEntries(entries);
    const rows = await db.rowsFor(pid);
    const plan = planSync(promotions, rows, { reviewedKeys: reviewedKeysOf(entries) });
    const at = now();
    for (const rec of plan.upserts) await db.upsert(pid, rec, at);
    if (plan.withdraw.length) await db.withdraw(pid, plan.withdraw, at);
    if (plan.upserts.length || plan.withdraw.length) {
      log(`stated-positions: ${pid} — ${plan.upserts.length} promoted/updated (${plan.upserts.map((u) => `${u.issueKey}:${u.stance}/${u.strength}`).join(", ") || "none"}), ${plan.withdraw.length} withdrawn${plan.withdraw.length ? ` (${plan.withdraw.join(", ")})` : ""}, ${plan.unchanged.length} unchanged`);
    }
    if (plan.held.length) log(`stated-positions: ${pid} — ${plan.held.length} row(s) left as they are: ${plan.held.map((h) => `${h.issueKey} (${h.reason})`).join(", ")}`);
    return { pid, ...plan };
  } catch (e) {
    log(`stated-positions: ERROR ${pid} — ${e?.message || e}`);
    return { pid, upserts: [], withdraw: [], unchanged: [], held: [], error: String(e?.message || e) };
  }
}

/**
 * A stored row → a stance card in the ISSUE_STANCE_DATA shape, tagged
 * provenance 'pipeline'. `labels` maps issue key → reader label. The icon is
 * left for the client to fill from ISSUE_MAP (the server has no emoji table).
 */
export function toCard(row, labels = {}) {
  const key = row.issueKey;
  const text = String(row.text || "").trim();
  return {
    topic: labels[key] || String(key).replace(/_/g, " "),
    icon: "",
    pos: row.stance,
    issueKey: key,
    issueStance: row.stance,
    // The politician's own words, quoted: the excerpt the Locker item holds.
    text: text ? `“${text.replace(/^[“"]+|[”"]+$/g, "")}”` : "",
    source: { label: row.sourceLabel || "Source", url: row.sourceUrl },
    provenance: PROVENANCE,
    pipeline: {
      strength: row.strength,
      confidence: row.confidence == null ? null : Number(row.confidence),
      strong: Number(row.strongCount) || 0,
      weak: Number(row.weakCount) || 0,
      items: Array.isArray(row.evidence) ? row.evidence.length : 0,
      rules_version: row.rulesVersion || null,
      promoted_at: row.promotedAt ? new Date(row.promotedAt).toISOString() : null,
      updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    },
  };
}

/** Rows → { cards: { pid: [card] }, count }. Only active, sourced rows. */
export function cardsBody(rows, labels = {}, { hiddenKey = () => false } = {}) {
  const cards = {};
  let count = 0;
  for (const r of rows || []) {
    if (!r || r.status !== "active" || r.provenance !== PROVENANCE || !isUrl(r.sourceUrl)) continue;
    if (r.stance !== "support" && r.stance !== "oppose" && r.stance !== "mixed") continue;
    // A promotion whose every piece of evidence has since been hidden is not served.
    const ev = Array.isArray(r.evidence) ? r.evidence : [];
    if (ev.length && ev.every((k) => hiddenKey(k))) continue;
    (cards[r.politicianId] ||= []).push(toCard(r, labels));
    count++;
  }
  for (const pid of Object.keys(cards)) cards[pid].sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  return { cards, count, version: STATED_POSITIONS_VERSION };
}

/** The production adapter over drizzle (db + table passed in). */
export function dbAdapter(db, table, { eq, and, inArray }) {
  return {
    async rowsFor(pid) {
      return db.select().from(table).where(eq(table.politicianId, pid));
    },
    async upsert(pid, rec, at) {
      const values = {
        politicianId: pid, issueKey: rec.issueKey, stance: rec.stance, text: rec.text,
        sourceUrl: rec.sourceUrl, sourceLabel: rec.sourceLabel, confidence: rec.confidence,
        strength: rec.strength, strongCount: rec.strongCount, weakCount: rec.weakCount,
        rulesVersion: rec.rulesVersion, status: "active", provenance: PROVENANCE,
        evidence: rec.evidence, updatedAt: at,
      };
      const { politicianId, issueKey, ...set } = values;
      // A curated (non-pipeline) row on the same key is never overwritten.
      await db.insert(table).values({ ...values, promotedAt: at, createdAt: at })
        .onConflictDoUpdate({ target: [table.politicianId, table.issueKey], set, setWhere: eq(table.provenance, PROVENANCE) });
    },
    async withdraw(pid, issueKeys, at) {
      await db.update(table).set({ status: "withdrawn", updatedAt: at })
        .where(and(eq(table.politicianId, pid), inArray(table.issueKey, issueKeys), eq(table.provenance, PROVENANCE)));
    },
  };
}
