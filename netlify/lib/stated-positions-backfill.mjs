// ─────────────────────────────────────────────────────────────────────────────
// stated-positions-backfill.mjs — one-time pass: the whole Evidence Locker →
// pdx_stated_positions
// ─────────────────────────────────────────────────────────────────────────────
// The raw-ingest cron's promotion step only recomputes the politicians a run
// touches, so Locker items written before that step went live reach the stance
// store only as the rotation comes round to each person. This pass does every
// politician at once, with NOTHING of its own: the same read as the step
// (lockerEntriesFor — hidden items dropped, older items regraded, restatements
// collapsed), the same thresholds (promoteEntries / promoteIssue), the same
// sync (planSync, then the dbAdapter's upsert / withdraw — provenance
// 'pipeline', a withdrawn issue kept, never deleted). It writes only the
// pdx_stated_positions table; the curated cards are client data it cannot touch,
// and stance-helpers.js keeps letting a curated card win on its issue key.
//
// What it adds is the accounting the step does not keep: every Locker item is
// counted once under exactly one outcome — promoted (it is evidence for an
// active stance) or skipped with a reason — and every politician + issue pair
// is counted as new (no active row before), updated, unchanged or withdrawn.
//
// Resumable: politicians are done in sorted order inside a time budget; the
// caller persists `state` (done politicians + running tallies) and calls again
// until `complete`.

import { reviewFor, regradeStatedPosition, collapseRestatedItems, toSpotlightEntry } from "./evidence-locker-core.mjs";
import { promoteEntries, planSync, strengthOf } from "./stated-positions-core.mjs";

export const BACKFILL_VERSION = "stated-positions-backfill-v1";

export const SKIP_REASONS = {
  unreadable: "not readable as a Locker item (missing politician, link or JSON)",
  hidden: "hidden by a review flag",
  restated: "restates a claim already kept under another issue key",
  no_issue: "no issue key",
  no_link: "no source link",
  mention: "a mention, not a clear support/oppose read",
  even_split: "the issue is an even split between support and oppose",
  outweighed: "on the losing side of an issue that promoted the other way",
};

const isUrl = (u) => /^https?:\/\//.test(String(u || ""));

export function emptyTallies() {
  return {
    items_scanned: 0,
    items_promoted: 0,
    items_skipped: Object.fromEntries(Object.keys(SKIP_REASONS).map((k) => [k, 0])),
    politicians: 0,
    pairs_promoted: 0,
    pairs_new: 0,
    pairs_updated: 0,
    pairs_unchanged: 0,
    pairs_withdrawn: 0,
    by_strength: { strong: 0, weak: 0 },
    new_pairs: [],
    withdrawn_pairs: [],
    errors: [],
  };
}

/**
 * The whole Locker, grouped by politician: { [pid]: { entries, skipped } }.
 * `entries` are exactly lockerEntriesFor(store, pid, flags) (same filters, same
 * order); `skipped` counts what was dropped before promotion, by reason.
 */
export async function readLocker(store, flags = null, { concurrency = 25 } = {}) {
  const { blobs = [] } = (await store.list()) || {};
  const keys = blobs.map((b) => b.key);
  const docs = new Array(keys.length);
  for (let i = 0; i < keys.length; i += concurrency) {
    await Promise.all(keys.slice(i, i + concurrency).map(async (key, j) => {
      docs[i + j] = await store.get(key, { type: "json" }).catch(() => null);
    }));
  }
  const byPid = {};
  let unreadable = 0;
  keys.forEach((key, i) => {
    const pid = key.split("/")[0];
    const doc = docs[i];
    // lockerEntriesFor lists `<pid>/…` and keeps a doc only when it names that pid.
    if (!doc || doc.politician_id !== pid || !doc.link) { unreadable++; return; }
    const g = (byPid[pid] ||= { rows: [], hidden: 0 });
    const review = reviewFor(doc, key, flags);
    if (review?.status === "hidden") { g.hidden++; return; }
    g.rows.push({ key, doc: regradeStatedPosition(doc), review });
  });
  const out = {};
  for (const pid of Object.keys(byPid).sort()) {
    const g = byPid[pid];
    const kept = collapseRestatedItems(g.rows);
    out[pid] = {
      entries: kept.map(({ key, doc, review }) => toSpotlightEntry(doc, { key, review })),
      skipped: { hidden: g.hidden, restated: g.rows.length - kept.length },
    };
  }
  return { scanned: keys.length, unreadable, byPid: out };
}

/** Each entry's outcome against the promotions: 'promoted' or a skip reason. */
export function classifyEntries(entries, promotions) {
  const evidence = new Set(Object.values(promotions).flatMap((p) => p.evidence));
  return entries.map((it) => {
    if (!it.issueKey) return "no_issue";
    if (!isUrl(it.source && it.source.url)) return "no_link";
    const st = strengthOf(it);
    if (st !== "strong" && st !== "weak") return "mention";
    if (evidence.has(it.pipeline.key)) return "promoted";
    return promotions[it.issueKey] ? "outweighed" : "even_split";
  });
}

/**
 * Run (or resume) the backfill. `db` = the stated-positions dbAdapter plus
 * activePoliticianIds() (every pid holding an active row, so a person whose
 * Locker items are all gone still has their promotions withdrawn).
 * Returns { state, complete }.
 */
export async function runBackfill({ store, db, flags = null, state = null, budgetMs = 20000, now = () => new Date(), log = console.log, clock = () => Date.now() }) {
  const started = clock();
  const st = state && state.version === BACKFILL_VERSION
    ? state
    : { version: BACKFILL_VERSION, started_at: now().toISOString(), done: [], tallies: emptyTallies() };
  const T = st.tallies;
  const done = new Set(st.done);
  const locker = await readLocker(store, flags);
  if (!st.done.length) {
    T.items_scanned = locker.scanned;
    T.items_skipped.unreadable = locker.unreadable;
  }
  const active = await db.activePoliticianIds();
  const pids = [...new Set([...Object.keys(locker.byPid), ...active])].sort();
  let deferred = 0;
  for (const pid of pids) {
    if (done.has(pid)) continue;
    if (clock() - started > budgetMs) { deferred++; continue; }
    const g = locker.byPid[pid] || { entries: [], skipped: { hidden: 0, restated: 0 } };
    try {
      const promotions = promoteEntries(g.entries);
      const before = await db.rowsFor(pid);
      const plan = planSync(promotions, before);
      const at = now();
      for (const rec of plan.upserts) await db.upsert(pid, rec, at);
      if (plan.withdraw.length) await db.withdraw(pid, plan.withdraw, at);
      // Tallies only once the writes landed, so a failed politician is retried whole.
      const wasActive = new Set(before.filter((r) => r.status === "active").map((r) => r.issueKey));
      T.items_skipped.hidden += g.skipped.hidden;
      T.items_skipped.restated += g.skipped.restated;
      for (const outcome of classifyEntries(g.entries, promotions)) {
        if (outcome === "promoted") T.items_promoted++;
        else T.items_skipped[outcome]++;
      }
      T.politicians += g.entries.length ? 1 : 0;
      for (const p of Object.values(promotions)) { T.pairs_promoted++; T.by_strength[p.strength]++; }
      for (const u of plan.upserts) {
        if (wasActive.has(u.issueKey)) T.pairs_updated++;
        else { T.pairs_new++; T.new_pairs.push(`${pid}|${u.issueKey}:${u.stance}/${u.strength}`); }
      }
      T.pairs_unchanged += plan.unchanged.length;
      T.pairs_withdrawn += plan.withdraw.length;
      for (const k of plan.withdraw) T.withdrawn_pairs.push(`${pid}|${k}`);
      if (plan.upserts.length || plan.withdraw.length) {
        log(`stated-positions-backfill: ${pid} — ${plan.upserts.length} promoted/updated (${plan.upserts.map((u) => `${u.issueKey}:${u.stance}/${u.strength}`).join(", ") || "none"}), ${plan.withdraw.length} withdrawn${plan.withdraw.length ? ` (${plan.withdraw.join(", ")})` : ""}, ${plan.unchanged.length} unchanged`);
      }
      done.add(pid);
    } catch (e) {
      const msg = `${pid}: ${e?.message || e}`;
      T.errors.push(msg);
      log(`stated-positions-backfill: ERROR ${msg}`);
    }
  }
  st.done = [...done].sort();
  const failed = pids.filter((p) => !done.has(p)).length - deferred;
  const complete = deferred === 0 && failed === 0;
  if (complete) st.completed_at = now().toISOString();
  else T.errors = T.errors.slice(-20);
  st.complete = complete;
  log(complete ? summaryLine(T) : `stated-positions-backfill: partial — ${st.done.length}/${pids.length} politician(s) done, ${deferred} deferred (time budget), ${failed} failed; resumes next run`);
  return { state: st, complete };
}

/** The closing summary. */
export function summaryLine(T) {
  const skipped = Object.values(T.items_skipped).reduce((a, b) => a + b, 0);
  const reasons = Object.entries(T.items_skipped).filter(([, n]) => n).map(([k, n]) => `${n} ${SKIP_REASONS[k]}`).join("; ");
  return `stated-positions-backfill: complete — ${T.items_scanned} Locker item(s) scanned · ${T.items_promoted} promoted (evidence for an active stance) · ${skipped} skipped${reasons ? ` (${reasons})` : ""}`
    + ` · ${T.pairs_promoted} politician + issue stance(s) qualify across ${T.politicians} politician(s) (${T.by_strength.strong} strong, ${T.by_strength.weak} weak)`
    + ` · ${T.pairs_new} pair(s) received a new pipeline stance, ${T.pairs_updated} updated, ${T.pairs_unchanged} already current, ${T.pairs_withdrawn} withdrawn (no longer qualify)`
    + `${T.errors.length ? ` · ${T.errors.length} error(s)` : ""}`;
}
