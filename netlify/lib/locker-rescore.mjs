// ─────────────────────────────────────────────────────────────────────────────
// locker-rescore.mjs — re-read Evidence Locker items under the current rules
// ─────────────────────────────────────────────────────────────────────────────
// The Locker used to keep a strong item forever (W4), so a read made under older,
// weaker scorer rules stayed live after the rules were fixed. This pass re-reads
// every clear item (strong or weak) written under an OLDER rules version against
// the page it came from (the latest stored capture in the "raw-ingest" store)
// and keeps the NEW read when it differs:
//
//   · same page still reads a position on the topic → the item is rewritten at
//     its own key with today's read (side, confidence, strength, excerpt) and
//     carries the read it replaced under `rescored.from` — whether it changed
//     or not, so it is never picked up again under the same rules;
//   · the page now reads only a mention → rewritten as a mention (never a stance);
//   · the page no longer yields a candidate on that topic at all (e.g. a
//     cross-topic read of a page that does not address the topic) → the item
//     is RETIRED: moved to the "evidence-locker-retired" store (kept for audit,
//     with the reason) and removed from the Locker, so no surface serves it.
//
// Never touched: items an editor flagged (reviewed / needs_edit / hidden — the
// editor's call stands), items already at the current rules version, mentions,
// and own-channel YouTube / video items (the video pipeline is out of scope).
// An item whose page has no stored capture is left as it is and counted.
//
// Scoring is exactly the cron's: scoreAllTopics on the stored page — under the
// item's own topic for an on-topic item, under its `page_topic` for a
// cross-topic item — then lockerDecision / buildLockerItem from
// evidence-locker-core.mjs (ground-truth pair, own-page and citation rules
// unchanged; the ground-truth file is read-only here too).
//
// After a politician's items are done, the politician's promoted stances are
// recomputed (syncPolitician), so a corrected read reaches the live card in the
// same pass. Curated rows and rows resting on reviewed evidence are never written.
//
// Resumable: politicians in sorted order, pages inside a politician in sorted
// order, inside a time budget; `state` (cursor + tallies) is persisted by the
// caller and passed back. A new RULES_VERSION starts a fresh pass.

import { RULES_VERSION, scoreAllTopics } from "./stance-score-core.mjs";
import { lockerDecision, buildLockerItem, storedStrength, reviewFor, withRescore, ownEvidenceRows, collapseRestatedItems, regradeStatedPosition } from "./evidence-locker-core.mjs";
import { itemOwnership, OWNERSHIP_VERSION } from "./page-ownership.mjs";
import { readLockerDocs, mapLimit } from "./locker-read.mjs";

// v2 (locker-own-v1): every item whose page is not the politician's own is
// retired, whatever its rules version or strength, and every politician whose
// served evidence loses foreign pages, site-menu text or repeated sentences has
// their promoted stances recomputed.
export const RESCORE_VERSION = "locker-rescore-v2";
export const RESCORE_STATE_KEY = "locker-rescore-state.json";
export const RETIRED_STORE_NAME = "evidence-locker-retired";
const RAW_READ_CONCURRENCY = 6;

const isVideoItem = (doc) => /(?:youtube\.com|youtu\.be)\//i.test(String(doc?.link || "")) || /\b(?:youtube|video)\b/i.test(String(doc?.source_type || ""));

/** Why an item is not re-scored, or null when it is. */
export function skipReason(doc, key, { flags = null, rulesVersion = RULES_VERSION } = {}) {
  if (!doc || !doc.politician_id || !doc.topic || !doc.link) return "unreadable";
  if (reviewFor(doc, key, flags)) return "flagged";
  const st = storedStrength(doc);
  if (st !== "strong" && st !== "weak") return "mention";
  if (String(doc.rules_version || "") === rulesVersion) return "current";
  if (isVideoItem(doc)) return "video";
  return null;
}

/** The page topic an item was scored under (its own topic, or `page_topic` for a cross-topic read). */
export const pageTopicOf = (doc) => doc.page_topic || doc.topic;

/**
 * Today's read of `doc` from `raw` → { action, next?, reason, changed, from, to }.
 * action: 'rewrite' (next = the item to store) | 'retire'.
 * `scored` caches scoreAllTopics per page topic for this raw record.
 */
export function rescoreItem(doc, raw, { gt = null, scored = new Map(), at = new Date().toISOString() } = {}) {
  const pt = pageTopicOf(doc);
  let cands = scored.get(pt);
  if (!cands) { cands = scoreAllTopics({ ...raw, topic: pt }); scored.set(pt, cands); }
  const c = cands.find((x) => x.topic === doc.topic);
  const from = { position: doc.position, strength: storedStrength(doc), confidence: doc.confidence ?? null, rules_version: doc.rules_version ?? null };
  if (!c) return { action: "retire", reason: doc.page_topic ? `the ${doc.page_topic} page no longer reads a position on ${doc.topic} (cross-topic rules)` : "the page no longer yields a candidate on its topic", changed: true, from, to: null };
  const d = lockerDecision(c, raw, gt);
  if (!d.write) return { action: "retire", reason: `today's read is not admissible: ${d.reason}`, changed: true, from, to: { position: c.position, confidence: c.confidence } };
  const item = withRescore(buildLockerItem(c, raw, d.strength), doc, at);
  // The item stays at its own key even if the page now resolves to another URL.
  item.link = doc.link;
  const to = { position: item.position, strength: item.strength, confidence: item.confidence ?? null, rules_version: item.rules_version };
  const changed = to.position !== from.position || to.strength !== from.strength || to.confidence !== from.confidence;
  return { action: "rewrite", next: item, reason: d.reason, changed, from, to };
}

/** Kind of change, for the tallies. */
export function changeKind(r) {
  if (r.action === "retire") return "retired";
  if (!r.changed) return "unchanged";
  const clear = (p) => p === "support" || p === "oppose";
  if (clear(r.from.position) && clear(r.to.position) && r.from.position !== r.to.position) return "flipped";
  if (r.to.strength === "mention") return "to_mention";
  const rank = { mention: 1, weak: 2, strong: 3 };
  if (rank[r.to.strength] < rank[r.from.strength]) return "downgraded";
  if (rank[r.to.strength] > rank[r.from.strength]) return "upgraded";
  return "confidence";
}

export function freshState(rulesVersion = RULES_VERSION) {
  return {
    version: RESCORE_VERSION, rules_version: rulesVersion, pid_index: 0, page_index: 0, complete: false, started_at: null, updated_at: null,
    tallies: { examined: 0, eligible: { strong: 0, weak: 0 }, skipped: {}, no_raw: 0, outcomes: { strong: {}, weak: {} },
      ownership: { version: OWNERSHIP_VERSION, retired: { strong: 0, weak: 0, mention: 0 }, by_kind: {}, site_menu: 0, repeated: 0, politicians_recomputed: 0 } },
    pending_sync: [],
  };
}
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

/** Latest capture key per raw directory under `<pid>/` → { bySource: {source_id: key}, dirs: [latest keys] }. */
export async function rawIndexFor(rawStore, pid) {
  const { blobs = [] } = (await rawStore.list({ prefix: `${pid}/` })) || {};
  const latest = {};
  for (const { key } of blobs) {
    const dir = key.slice(0, key.lastIndexOf("/"));
    if (!latest[dir] || key > latest[dir]) latest[dir] = key;
  }
  const bySource = {};
  for (const [dir, key] of Object.entries(latest)) {
    const sid = dir.split("/")[2];
    if (sid && (!bySource[sid] || key > bySource[sid])) bySource[sid] = key;
  }
  return { bySource, dirs: Object.values(latest).sort() };
}

/**
 * One pass step. deps: { lockerStore, rawStore, retiredStore, flags, gt, budgetMs,
 * now, log, dry, sync(pid) }. Returns the next state. `dry` reads and scores but
 * writes nothing (a report of what the pass would do).
 */
export async function rescoreStep(state, deps) {
  const { lockerStore, rawStore, retiredStore = null, flags = null, gt = null, log = console.log, dry = false, sync = null } = deps;
  const now = deps.now || (() => new Date());
  const t0 = Date.now();
  const budget = deps.budgetMs ?? 20_000;
  const over = () => Date.now() - t0 > budget;
  let st = state && state.rules_version === RULES_VERSION && state.version === RESCORE_VERSION ? state : freshState();
  if (st !== state && state) log(`locker-rescore: rules ${state.rules_version || "?"} → ${RULES_VERSION} — starting a fresh pass`);
  if (st.complete) return st;
  st = { ...st, started_at: st.started_at || now().toISOString() };
  const T = st.tallies;

  // Politicians whose recompute was deferred by the budget go first.
  while (st.pending_sync.length && !over() && sync && !dry) {
    const pid = st.pending_sync[0];
    try { await sync(pid); } catch (e) { log(`locker-rescore: recompute for ${pid} deferred — ${e?.message || e}`); break; }
    st.pending_sync = st.pending_sync.slice(1);
  }

  const { directories = [] } = (await lockerStore.list({ directories: true })) || {};
  const pids = directories.map((d) => String(d).replace(/\/$/, "")).filter(Boolean).sort();
  while (st.pid_index < pids.length && !over()) {
    const pid = pids[st.pid_index];
    const { blobs = [] } = (await lockerStore.list({ prefix: `${pid}/` })) || {};
    const allDocs = await readLockerDocs(lockerStore, blobs.map((b) => b.key).sort());
    let touched = false;
    // locker-own-v1: an item from a page that is not the politician's own is
    // retired (kept in the retired store with the reason), whatever its rules
    // version or strength. Editor-flagged items are left to the editor.
    const OW = (T.ownership ||= { version: OWNERSHIP_VERSION, retired: { strong: 0, weak: 0, mention: 0 }, by_kind: {}, site_menu: 0, repeated: 0, politicians_recomputed: 0 });
    const docs = [];
    for (const row of allDocs) {
      const { key, doc } = row;
      if (doc && doc.politician_id && doc.link && !reviewFor(doc, key, flags)) {
        const o = itemOwnership(doc);
        if (!o.own) {
          const was = storedStrength(doc) || "mention";
          OW.retired[was] = (OW.retired[was] || 0) + 1;
          bump(OW.by_kind, o.kind);
          log(`locker-rescore: NOT OWN PAGE ${key} — ${doc.position}/${was} — ${o.reason}`);
          if (!dry) {
            if (retiredStore) await retiredStore.setJSON(key, { ...doc, retired: { at: now().toISOString(), reason: `not the politician's own page (${o.kind}): ${o.reason}`, ownership_version: OWNERSHIP_VERSION } });
            await lockerStore.delete(key);
          }
          touched = true;
          continue;
        }
      }
      docs.push(row);
    }
    // Site menus and repeated sentences are not stored differently — they are
    // dropped when served (ownEvidenceRows) — but the politician's stances must
    // be recomputed for the drop to reach the live cards.
    if (st.page_index === 0) {
      const served = docs.filter(({ key, doc }) => doc && doc.politician_id === pid && doc.link && reviewFor(doc, key, flags)?.status !== "hidden")
        .map(({ key, doc }) => ({ key, doc: regradeStatedPosition(doc), review: reviewFor(doc, key, flags) }));
      const { dropped } = ownEvidenceRows(collapseRestatedItems(served));
      OW.site_menu += dropped.menu;
      OW.repeated += dropped.repeated;
      if (dropped.menu || dropped.repeated) touched = true;
    }
    // Group eligible items by the page they came from.
    const groups = new Map();
    for (const { key, doc } of docs) {
      if (st.page_index === 0) T.examined++;
      const why = skipReason(doc, key, { flags });
      if (why) { if (st.page_index === 0) bump(T.skipped, why); continue; }
      const gk = doc.source_id ? `sid:${doc.source_id}` : `url:${doc.link}`;
      if (!groups.has(gk)) groups.set(gk, []);
      groups.get(gk).push({ key, doc });
    }
    const order = [...groups.keys()].sort();
    if (st.page_index === 0) for (const g of order) for (const { doc } of groups.get(g)) T.eligible[storedStrength(doc)]++;
    let idx = null;
    while (st.page_index < order.length && !over()) {
      const group = groups.get(order[st.page_index]);
      idx = idx || (await rawIndexFor(rawStore, pid));
      const first = group[0].doc;
      let raw = null;
      if (first.source_id && idx.bySource[first.source_id]) raw = await rawStore.get(idx.bySource[first.source_id], { type: "json" }).catch(() => null);
      if (!raw) {
        // Older items carry no source_id: find the page by its address.
        const found = await mapLimit(idx.dirs.slice(0, 60), RAW_READ_CONCURRENCY, async (k) => {
          const r = await rawStore.get(k, { type: "json" }).catch(() => null);
          return r && (r.url === first.link || r.final_url === first.link) ? r : null;
        });
        raw = found.find(Boolean) || null;
      }
      if (!raw || typeof raw.body !== "string") {
        T.no_raw += group.length;
        log(`locker-rescore: NO PAGE ${pid} ${first.link} — ${group.length} item(s) left as they are (no stored capture)`);
        st.page_index++;
        continue;
      }
      const scored = new Map();
      for (const { key, doc } of group) {
        const was = storedStrength(doc);
        let r;
        try { r = rescoreItem(doc, raw, { gt, scored, at: now().toISOString() }); }
        catch (e) { log(`locker-rescore: ERROR ${key} — ${e?.message || e}`); bump(T.skipped, "error"); continue; }
        const kind = changeKind(r);
        bump(T.outcomes[was], kind);
        if (kind !== "unchanged") log(`locker-rescore: ${kind.toUpperCase()} ${key} — ${r.from.position}/${r.from.strength}@${r.from.confidence} (${r.from.rules_version || "unversioned"}) → ${r.to ? `${r.to.position}/${r.to.strength || "-"}@${r.to.confidence}` : "retired"} — ${r.reason}`);
        if (dry) continue;
        if (r.action === "rewrite") await lockerStore.setJSON(key, r.next);
        else {
          if (retiredStore) await retiredStore.setJSON(key, { ...doc, retired: { at: now().toISOString(), reason: r.reason, rules_version: RULES_VERSION } });
          await lockerStore.delete(key);
        }
        touched = true;
      }
      st.page_index++;
    }
    // A politician whose pass is split across runs keeps the "touched" mark.
    if (touched) st.touched_pid = pid;
    if (st.page_index < order.length) break; // budget ran out inside this politician
    if (st.touched_pid === pid) { touched = true; st.touched_pid = null; }
    if (touched && sync && !dry) {
      let synced = false;
      if (!over()) {
        try { await sync(pid); synced = true; }
        catch (e) { log(`locker-rescore: recompute for ${pid} deferred — ${e?.message || e}`); }
      }
      if (!synced) st.pending_sync = [...st.pending_sync, pid];
      else OW.politicians_recomputed++;
    }
    st.pid_index++;
    st.page_index = 0;
  }
  st.complete = st.pid_index >= pids.length && !st.pending_sync.length;
  st.updated_at = now().toISOString();
  return st;
}

/** One summary line for the run log. */
export function rescoreSummaryLine(st) {
  const T = st.tallies;
  const o = (s) => Object.entries(T.outcomes[s] || {}).map(([k, n]) => `${k} ${n}`).join(", ") || "none yet";
  return `locker-rescore: ${st.complete ? "COMPLETE" : "in progress"} under ${st.rules_version} — politician ${st.pid_index}` +
    ` · examined ${T.examined} · eligible strong ${T.eligible.strong}, weak ${T.eligible.weak}` +
    ` · strong: ${o("strong")} · weak: ${o("weak")} · no stored page ${T.no_raw}` +
    ` · skipped ${Object.entries(T.skipped).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}` +
    (T.ownership ? ` · not own page retired: strong ${T.ownership.retired.strong}, weak ${T.ownership.retired.weak}, mention ${T.ownership.retired.mention}` +
      ` · site menu ${T.ownership.site_menu} · repeated ${T.ownership.repeated} · recomputed ${T.ownership.politicians_recomputed}` : "");
}
