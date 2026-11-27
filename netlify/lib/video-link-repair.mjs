// ─────────────────────────────────────────────────────────────────────────────
// video-link-repair.mjs — one pass over the Evidence Locker that corrects the
// video items written before two fixes:
//
//   1. TIMESTAMPS. Transcripts cached before time_format existed carry clock
//      digits as start times (11:47 → 1147), so a Locker item's
//      watch?v=ID&t=NNs link pointed at the wrong moment (&t=1147s, not 707s).
//      For each video item whose transcript is one of those
//      (hasClockDigitTimes), the cited excerpt is located again in the
//      decoded transcript and the link is rebuilt at the right second. When
//      the excerpt cannot be found, the stored second is decoded instead (only
//      when it is one of the transcript's own segment starts).
//   2. C-SPAN CHAMBER. C-SPAN clips were typed "official House proceedings
//      video (C-SPAN)" for everyone; a senator's (or governor's) item is
//      relabelled for their chamber.
//
// KEYS. A Locker key hashes the item's link, so an item whose link changes is
// MOVED to the key of its corrected link (written there, then the old key
// deleted). The writer derives the same corrected link when the video is
// scored again, so it finds the moved item ("already in locker") instead of
// writing a second copy. A flagged item (editor review), or one whose
// corrected key is already taken, is corrected in place.
//
// Nothing about the read, the position or the strength changes. Every
// corrected item carries `link_repair` ({ version, at, from_link?,
// from_source_type? }). Resumable: politicians in sorted order inside a time
// budget, cursor kept in LINK_REPAIR_STATE_KEY (transcript store); a finished
// pass at this version is a no-op. Politicians whose items changed are handed
// to `sync` (stated-position cards), and kept as pending until a sync works.

import { lockerKey, reviewFor } from "./evidence-locker-core.mjs";
import { readLockerDocs } from "./locker-read.mjs";
import { readTranscript, hasClockDigitTimes, clockDigitsToSeconds, buildVideoRecord, videoExcerptSecond } from "./video-transcripts.mjs";
import { relabelCspanSourceType } from "./raw-ingest-video.mjs";

export const LINK_REPAIR_VERSION = "video-links-v1";
export const LINK_REPAIR_STATE_KEY = "link-repair.json";
export const LINK_REPAIR_BUDGET_MS = 5 * 60_000;

const YT_LINK = /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})(?:&t=(\d+)s)?$/;

/** { videoId, t } of a Locker video link (t = the stored second, or null). */
export function parseVideoLink(link) {
  const m = YT_LINK.exec(String(link || ""));
  return m ? { videoId: m[1], t: m[2] === undefined ? null : Number(m[2]) } : null;
}

/**
 * The right second for a Locker item cut from a clock-digit transcript, or
 * null when it cannot be told. `doc` is the cached transcript.
 */
export function correctedSecond(item, doc) {
  const v = parseVideoLink(item?.link);
  if (!v || v.t === null || !hasClockDigitTimes(doc)) return null;
  const rec = buildVideoRecord({ src: { politician_id: item.politician_id, topic: item.topic, url: item.link }, videoId: v.videoId, doc, fetchedAt: "" });
  const excerpt = (Array.isArray(item.excerpts) && item.excerpts[0]) || item.excerpt;
  const found = rec ? videoExcerptSecond(rec, excerpt) : null;
  if (found !== null) return found;
  // The excerpt is not in the transcript text: decode the stored second, but
  // only when it is one of the transcript's raw (clock-digit) segment starts.
  return (doc.segments || []).some((s) => Number(s?.t) === v.t) ? clockDigitsToSeconds(v.t) : null;
}

/**
 * The corrected item, or null when nothing changes.
 * `chamberOf(pid)` → "house" | "senate" | null.
 */
export function repairVideoItem(item, doc, { chamberOf = () => null, at = new Date().toISOString() } = {}) {
  if (!item || !parseVideoLink(item.link)) return null;
  const repair = { version: LINK_REPAIR_VERSION, at };
  let next = item;
  const sec = correctedSecond(item, doc);
  const v = parseVideoLink(item.link);
  if (sec !== null && sec !== v.t) {
    const link = `https://www.youtube.com/watch?v=${v.videoId}&t=${sec}s`;
    repair.from_link = item.link;
    next = { ...next, link, ...(next.citation && typeof next.citation === "object" ? { citation: { ...next.citation, url: link } } : {}) };
  }
  const st = relabelCspanSourceType(item.source_type, chamberOf(item.politician_id));
  if (st) {
    repair.from_source_type = item.source_type;
    next = { ...next, source_type: st, ...(next.citation && typeof next.citation === "object" ? { citation: { ...next.citation, source_type: st } } : {}) };
  }
  if (next === item) return null;
  return { ...next, link_repair: repair };
}

export function freshRepairState() {
  return { version: LINK_REPAIR_VERSION, done: false, pid_after: null, pending_sync: [], tallies: { politicians: 0, items: 0, video_items: 0, links_fixed: 0, moved: 0, in_place: 0, source_types_fixed: 0 } };
}

/**
 * Run the pass for up to `budgetMs`. Returns the state to persist.
 * deps: { lockerStore, transcriptStore, flags, chamberOf, sync?, log, now }.
 */
export async function repairStep(state, { lockerStore, transcriptStore, flags = null, chamberOf = () => null, sync = null, budgetMs = LINK_REPAIR_BUDGET_MS, log = console.log, now = () => new Date() } = {}) {
  let st = state && state.version === LINK_REPAIR_VERSION ? { ...freshRepairState(), ...state, tallies: { ...freshRepairState().tallies, ...(state.tallies || {}) } } : freshRepairState();
  const pending = new Set(st.pending_sync || []);
  const started = Date.now();
  const flush = async () => {
    if (sync) {
      for (const pid of [...pending]) {
        try { await sync(pid); pending.delete(pid); }
        catch (e) { log(`video-link-repair: stated positions for ${pid} not recomputed yet — ${e?.message || e}`); break; }
      }
    }
    st.pending_sync = [...pending].sort();
  };
  if (st.done) { await flush(); return st; }
  const { directories = [] } = (await lockerStore.list({ directories: true })) || {};
  const pids = directories.map((d) => String(d).replace(/\/$/, "")).filter(Boolean).sort().filter((p) => !st.pid_after || p > st.pid_after);
  const docs = new Map();
  const transcriptOf = async (id) => {
    if (!docs.has(id)) docs.set(id, await readTranscript(transcriptStore, id));
    return docs.get(id);
  };
  let finished = true;
  for (const pid of pids) {
    if (Date.now() - started > budgetMs) { finished = false; break; }
    const { blobs = [] } = (await lockerStore.list({ prefix: `${pid}/` })) || {};
    const rows = await readLockerDocs(lockerStore, blobs.map((b) => b.key));
    let changed = false;
    for (const { key, doc } of rows) {
      st.tallies.items++;
      const v = doc && parseVideoLink(doc.link);
      if (!v) continue;
      st.tallies.video_items++;
      const next = repairVideoItem(doc, await transcriptOf(v.videoId), { chamberOf, at: now().toISOString() });
      if (!next) continue;
      changed = true;
      if (next.link_repair.from_source_type) st.tallies.source_types_fixed++;
      if (!next.link_repair.from_link) { await lockerStore.setJSON(key, next); continue; }
      st.tallies.links_fixed++;
      const target = lockerKey(next);
      let moved = false;
      if (target !== key && !reviewFor(doc, key, flags)) {
        const r = await lockerStore.setJSON(target, next, { onlyIfNew: true });
        moved = !(r && r.modified === false);
        if (moved) await lockerStore.delete(key);
      }
      if (!moved) await lockerStore.setJSON(key, next);
      st.tallies[moved ? "moved" : "in_place"]++;
      log(`video-link-repair: ${moved ? "MOVE" : "FIX"} ${key}${moved ? ` → ${target}` : ""} — ${next.link_repair.from_link} → ${next.link}`);
    }
    if (changed) pending.add(pid);
    st.tallies.politicians++;
    st.pid_after = pid;
  }
  st.done = finished;
  await flush();
  log(`video-link-repair: ${st.done ? "pass complete" : "paused (time budget)"} — ${st.tallies.politicians} politician(s), ${st.tallies.video_items} video item(s), ${st.tallies.links_fixed} timestamp link(s) fixed (${st.tallies.moved} moved to their corrected key, ${st.tallies.in_place} in place), ${st.tallies.source_types_fixed} C-SPAN source type(s) relabelled; ${st.pending_sync.length} politician(s) awaiting a stated-position resync`);
  return st;
}
