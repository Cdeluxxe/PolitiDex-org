// ─────────────────────────────────────────────────────────────────────────────
// stance-check.mjs — new Evidence Locker items against an existing curated stance
// ─────────────────────────────────────────────────────────────────────────────
// READ-ONLY. After a rotation run writes Locker items, every politician + issue
// pair that got a new STRONG item this run is checked against the curated stance
// already on file for that pair (the committed ISSUE_STANCE_DATA cards). When the
// strong evidence on that issue runs predominantly the other way, one line is
// logged:
//
//   stance-check: OPPOSING — <pid>, <issue>, curated: support, evidence: oppose (N strong items)
//
// and the run closes with "raw-ingest: opposing evidence — N cases".
//
// It changes nothing. No curated card, no Locker item, no stance row, no
// scoring or promotion rule, no status or flag: it reads, compares and logs.
//
// THE RULES
//   · Evidence counted: Locker items read exactly as the Locker serves them
//     (lockerEntriesFor — hidden items dropped, older items regraded,
//     restatements collapsed), and of those only STRONG ones (strengthOf, the
//     promoter's own grading) with a clear support / oppose read. Weak items,
//     mentions, mixed and no-clear-position reads are ignored; a hidden item is
//     skipped again here in case a caller hands raw entries in.
//   · Curated side: the person's curated cards on that issue key (issueStance,
//     else pos). Only a clear side counts: a mixed card, or cards that disagree
//     with each other, is no curated side and the pair is not checked.
//   · Predominantly opposite: strictly more strong items on the opposite side
//     than on the curated side — i.e. a strict majority of the strong, clear
//     items on that issue. An even split is not a case.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { lockerEntriesFor, strengthOf } from "./stated-positions-core.mjs";

const SIDES = new Set(["support", "oppose"]);
const flip = (s) => (s === "support" ? "oppose" : "support");

// The curated stance data files, as person.html loads them.
export const CURATED_FILE = /^(politician-stances-(core|ext)|state-senate-stances(-w\d+)?)\.js$/;

/** The one clear curated side for this issue key, or null (none / mixed / conflicting). */
export function curatedSideOf(cards, issueKey) {
  let side = null;
  for (const c of Array.isArray(cards) ? cards : []) {
    if (!c || c.issueKey !== issueKey) continue;
    const s = String(c.issueStance || c.pos || "").toLowerCase();
    if (!SIDES.has(s)) return null;
    if (side && side !== s) return null;
    side = s;
  }
  return side;
}

/** Strong, not-hidden, clear items on one issue: { support, oppose }. */
export function strongTally(entries, issueKey) {
  const t = { support: 0, oppose: 0 };
  for (const it of entries || []) {
    if (!it || it.issueKey !== issueKey) continue;
    if (it.review && it.review.status === "hidden") continue;
    if (strengthOf(it) !== "strong") continue;
    const p = it.pipeline && it.pipeline.position;
    if (SIDES.has(p)) t[p]++;
  }
  return t;
}

/** One pair's verdict: a case { curated, evidence, n } or null. */
export function opposingCase(curated, tally) {
  if (!SIDES.has(curated) || !tally) return null;
  const opp = flip(curated);
  const n = tally[opp] || 0;
  if (n > 0 && n > (tally[curated] || 0)) return { curated, evidence: opp, n };
  return null;
}

export const opposingLine = (c) =>
  `stance-check: OPPOSING — ${c.politician_id}, ${c.issue}, curated: ${c.curated}, evidence: ${c.evidence} (${c.n} strong item${c.n === 1 ? "" : "s"})`;
export const opposingSummaryLine = (n) => `raw-ingest: opposing evidence — ${n} case${n === 1 ? "" : "s"}`;

/**
 * Check every politician + issue pair that got a new strong item this run.
 * `writes` = the run's Locker writes ({ politician_id, topic, strength }),
 * `curated` = { pid: [card…] }. Reads the Locker; never writes. Never throws.
 * Returns the cases, in pid / issue order.
 */
export async function checkOpposingEvidence({ writes, curated, lockerStore, flags = null, log = console.log }) {
  const pairs = new Map();
  for (const w of writes || []) {
    if (!w || w.strength !== "strong" || !w.politician_id || !w.topic) continue;
    const cards = curated && curated[w.politician_id];
    if (!cards) continue;
    (pairs.get(w.politician_id) || pairs.set(w.politician_id, new Set()).get(w.politician_id)).add(w.topic);
  }
  const cases = [];
  for (const pid of [...pairs.keys()].sort()) {
    const topics = [...pairs.get(pid)].sort().filter((t) => curatedSideOf(curated[pid], t));
    if (!topics.length) continue;
    let entries;
    try { entries = await lockerEntriesFor(lockerStore, pid, flags); }
    catch (e) { log(`stance-check: ${pid} — Locker unreadable, not checked (${e?.message || e})`); continue; }
    for (const issue of topics) {
      const c = opposingCase(curatedSideOf(curated[pid], issue), strongTally(entries, issue));
      if (!c) continue;
      const row = { politician_id: pid, issue, ...c };
      cases.push(row);
      log(opposingLine(row));
    }
  }
  return cases;
}

// ── The curated cards, read from the committed stance data files ──────────────
// Evaluated in an empty sandbox (they only assign window.ISSUE_STANCE_DATA) and
// cached for the life of the function instance.
let _curated = null;
function findRoot() {
  const starts = [process.env.LAMBDA_TASK_ROOT, process.cwd()];
  try { starts.push(dirname(fileURLToPath(import.meta.url))); } catch {}
  for (const s of starts.filter(Boolean)) {
    let d = s;
    for (let i = 0; i < 7; i++) {
      if (existsSync(join(d, "politician-stances-core.js"))) return d;
      const up = dirname(d);
      if (up === d) break;
      d = up;
    }
  }
  return null;
}
export function loadCuratedStances({ root } = {}) {
  if (_curated && !root) return _curated;
  const dir = root || findRoot();
  if (!dir) throw new Error("curated stance files not found");
  const files = readdirSync(dir).filter((f) => CURATED_FILE.test(f)).sort((a, b) =>
    (a.startsWith("politician") ? 0 : 1) - (b.startsWith("politician") ? 0 : 1) || a.localeCompare(b, "en", { numeric: true }));
  const w = {};
  w.window = w;
  const ctx = vm.createContext(w);
  for (const f of files) vm.runInContext(readFileSync(join(dir, f), "utf8"), ctx, { filename: f });
  const data = w.ISSUE_STANCE_DATA || {};
  // Plain copies, so nothing downstream can reach back into the sandbox.
  const out = JSON.parse(JSON.stringify(data));
  if (!root) _curated = out;
  return out;
}
