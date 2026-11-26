#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// sample-locker-strong-boebert-cole-2026-11.mjs — READ-ONLY error-rate sample
// ─────────────────────────────────────────────────────────────────────────────
// Pulls every STRONG Evidence Locker item currently stored for Lauren Boebert
// and Tom Cole from the live "evidence-locker" Blobs store, and writes a sample
// for a later human check of whether the scorer's read matches the source.
//
// Strong = storedStrength(doc) === "strong" (clear support / oppose at
// confidence ≥ 0.8), or an item the profile serves as strong after
// regradeStatedPosition. For each item: politician, issue key, position,
// confidence, source URL, the excerpt(s) scored, the locked ground-truth label
// for the pair (if any), whether the read contradicts it, and whether the
// public endpoint serves the item today (and why not, when it does not).
//
// Nothing is written to the Locker, the stance store or any ground-truth file.
// The only outputs are the two local report files below.
//
//   node scripts/sample-locker-strong-boebert-cole-2026-11.mjs            # live store
//   node scripts/sample-locker-strong-boebert-cole-2026-11.mjs raw.json   # a saved pull
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  LOCKER_STORE_NAME, storedStrength, regradeStatedPosition, readableWeakerItem,
  loadReviewFlags, reviewFor, collapseRestatedItems, ownEvidenceRows,
} from "../netlify/lib/evidence-locker-core.mjs";
import { LOCKED_GROUND_TRUTH_INDEX, lockedLabelFor, contradictsLockedLabel } from "../netlify/lib/locked-ground-truth.mjs";
import reviewFile from "../db/evidence-locker-review.json" with { type: "json" };

const PEOPLE = { boebert: "Lauren Boebert", tom_cole: "Tom Cole" };
const OUT_JSON = "db/locker-strong-sample-boebert-cole-2026-11.json";
const OUT_MD = "db/locker-strong-sample-boebert-cole-2026-11.md";
const REVIEW_TARGET = 50; // 40–60 items for the quick human check

async function pull() {
  if (process.argv[2]) return JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: LOCKER_STORE_NAME, siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_AUTH_TOKEN });
  const out = {};
  for (const pid of Object.keys(PEOPLE)) {
    const { blobs } = await store.list({ prefix: `${pid}/` });
    const docs = [];
    for (const b of blobs) docs.push({ key: b.key, doc: await store.get(b.key, { type: "json" }).catch(() => null) });
    out[pid] = docs;
  }
  return out;
}

// Same filter chain as GET /api/evidence-locker/items → served or the reason it is not.
function servedStatus(docs) {
  const flags = loadReviewFlags(reviewFile);
  const status = {};
  const rows = [];
  for (const { key, doc } of docs) {
    if (!doc || !doc.politician_id || !doc.link) { status[key] = "not served: unreadable blob"; continue; }
    const review = reviewFor(doc, key, flags);
    if (review?.status === "hidden") { status[key] = "not served: hidden by review flag"; continue; }
    const served = readableWeakerItem(regradeStatedPosition(doc));
    if (!served) { status[key] = "not served: no readable text"; continue; }
    const c = contradictsLockedLabel(LOCKED_GROUND_TRUTH_INDEX, served.politician_id, served.topic, served.position);
    if (c) { status[key] = `not served: contradicts locked label (${c.position})`; continue; }
    rows.push({ key, doc: served, review });
  }
  const collapsed = collapseRestatedItems(rows);
  const collapsedKeys = new Set(collapsed.map((r) => r.key));
  for (const r of rows) if (!collapsedKeys.has(r.key)) status[r.key] = "not served: same claim already served under another issue key";
  const { kept, reasons } = ownEvidenceRows(collapsed);
  const keptKeys = new Set(kept.map((r) => r.key));
  for (const r of collapsed) status[r.key] = keptKeys.has(r.key) ? "served" : `not served: ${reasons?.[r.key] || "own-evidence filter"}`;
  return status;
}

const h = (s) => createHash("sha256").update(String(s)).digest("hex");

function itemRow(pid, key, doc, status) {
  const shown = regradeStatedPosition(doc);
  const label = lockedLabelFor(LOCKED_GROUND_TRUTH_INDEX, pid, doc.topic);
  const contra = contradictsLockedLabel(LOCKED_GROUND_TRUTH_INDEX, pid, doc.topic, doc.position);
  const excerpts = Array.isArray(doc.excerpts) && doc.excerpts.length ? doc.excerpts : (doc.excerpt ? [doc.excerpt] : []);
  return {
    key,
    politician_id: pid,
    politician: PEOPLE[pid],
    issue_key: doc.topic,
    position: doc.position,
    confidence: doc.confidence,
    stored_strength: storedStrength(doc),
    served_strength: storedStrength(shown),
    kind: doc.formal_record ? "record" : "stance",
    primary_kind: doc.primary_kind || null,
    source_type: doc.source_type || null,
    url: doc.link,
    excerpt: doc.excerpt || null,
    scored_excerpts: excerpts,
    confidence_reason: doc.confidence_reason || null,
    page_topic: doc.page_topic || null,
    rules_version: doc.rules_version || null,
    stated_date: doc.stated_date || null,
    captured_at: doc.captured_at || null,
    locked_label_exists: !!label,
    locked_label: label ? { position: label.position, confidence: label.confidence ?? null } : null,
    contradicts_locked_label: !!contra,
    served_status: status[key] || "unknown",
  };
}

// Balanced pick: round-robin across keys (most items first), within a key the
// highest and lowest confidence alternately, ties broken by a stable hash.
function balancedPick(rows, n) {
  const byKey = new Map();
  for (const r of rows) (byKey.get(r.issue_key) || byKey.set(r.issue_key, []).get(r.issue_key)).push(r);
  const queues = [...byKey.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([, list]) => {
    const s = [...list].sort((a, b) => b.confidence - a.confidence || h(a.key).localeCompare(h(b.key)));
    const q = []; let lo = s.length - 1, hi = 0, top = true;
    while (hi <= lo) q.push(top ? s[hi++] : s[lo--]), (top = !top);
    return q;
  });
  const out = [];
  while (out.length < n && queues.some((q) => q.length)) for (const q of queues) { if (out.length >= n) break; if (q.length) out.push(q.shift()); }
  return out;
}

const raw = await pull();
const people = {};
const all = [];
for (const pid of Object.keys(PEOPLE)) {
  const docs = raw[pid] || [];
  const status = servedStatus(docs);
  const strength = { strong: 0, weak: 0, mention: 0 };
  const rows = [];
  for (const { key, doc } of docs) {
    if (!doc) continue;
    strength[storedStrength(doc)]++;
    if (storedStrength(doc) === "strong" || storedStrength(regradeStatedPosition(doc)) === "strong") rows.push(itemRow(pid, key, doc, status));
  }
  rows.sort((a, b) => a.issue_key.localeCompare(b.issue_key) || b.confidence - a.confidence || a.key.localeCompare(b.key));
  const byKey = {};
  for (const r of rows) (byKey[r.issue_key] ||= []).push(r);
  people[pid] = {
    politician: PEOPLE[pid],
    blobs_stored: docs.length,
    stored_by_strength: strength,
    strong_items: rows.length,
    strong_served: rows.filter((r) => r.served_status === "served").length,
    with_locked_label: rows.filter((r) => r.locked_label_exists).length,
    contradicts_locked_label: rows.filter((r) => r.contradicts_locked_label).length,
    keys: Object.fromEntries(Object.entries(byKey).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([k, list]) => [k, {
      count: list.length,
      support: list.filter((r) => r.position === "support").length,
      oppose: list.filter((r) => r.position === "oppose").length,
      locked_label: list[0].locked_label,
      contradicts_locked_label: list.filter((r) => r.contradicts_locked_label).length,
      items: list,
    }])),
  };
  all.push(...rows);
}

// 50 SERVED items (what users see), split by each person's share of served
// strong items, balanced across keys.
const total = all.length;
const servedAll = all.filter((r) => r.served_status === "served");
const review = [];
for (const pid of Object.keys(PEOPLE)) {
  const rows = servedAll.filter((r) => r.politician_id === pid);
  const n = Math.round((REVIEW_TARGET * rows.length) / servedAll.length);
  review.push(...balancedPick(rows, n).map((r) => ({
    key: r.key, politician: r.politician, issue_key: r.issue_key, position: r.position, confidence: r.confidence,
    url: r.url, scored_excerpts: r.scored_excerpts, locked_label: r.locked_label?.position ?? null,
    contradicts_locked_label: r.contradicts_locked_label, served_status: r.served_status,
    human_check: { scorer_read_matches_source: null, note: null },
  })));
}

const report = {
  _readme: "READ-ONLY sample of every strong Evidence Locker item stored for Lauren Boebert and Tom Cole, pulled from the live evidence-locker Blobs store. Grouped by person and issue key. contradicts_locked_label = a support/oppose read that differs from a locked hand-reviewed label for the same pair (a locked 'mixed' label is contradicted by any single-side read). review_sample holds the balanced items for a later human check; human_check fields are left blank on purpose. Nothing in the Locker, the stance store or any ground-truth file was changed. Produced by scripts/sample-locker-strong-boebert-cole-2026-11.mjs.",
  pulled_at: new Date().toISOString(),
  totals: {
    strong_items: total,
    contradicts_locked_label: all.filter((r) => r.contradicts_locked_label).length,
    with_locked_label: all.filter((r) => r.locked_label_exists).length,
    served: all.filter((r) => r.served_status === "served").length,
  },
  people,
  review_sample: review,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");

// Markdown summary for people reading it in the repo.
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const md = [];
md.push("# Strong Evidence Locker items — Lauren Boebert and Tom Cole (sample)", "");
md.push(`Pulled ${report.pulled_at} from the live Evidence Locker. Read-only: nothing was changed. Full data: \`${OUT_JSON}\`.`, "");
md.push("| Person | Blobs stored | Strong items | Served today | On a locked-label pair | Contradict a locked label |", "|---|---|---|---|---|---|");
for (const p of Object.values(people)) md.push(`| ${p.politician} | ${p.blobs_stored} | ${p.strong_items} | ${p.strong_served} | ${p.with_locked_label} | ${p.contradicts_locked_label} |`);
md.push("");
for (const p of Object.values(people)) {
  md.push(`## ${p.politician}`, "", "| Issue key | Strong | Support | Oppose | Locked label | Contradict |", "|---|---|---|---|---|---|");
  for (const [k, g] of Object.entries(p.keys)) md.push(`| ${k} | ${g.count} | ${g.support} | ${g.oppose} | ${g.locked_label?.position ?? "—"} | ${g.contradicts_locked_label || ""} |`);
  md.push("");
  const contra = Object.values(p.keys).flatMap((g) => g.items).filter((r) => r.contradicts_locked_label);
  if (contra.length) {
    md.push(`### Contradicting a locked label (${contra.length})`, "", "| Issue key | Read | Conf. | Locked | Served | Source | Excerpt |", "|---|---|---|---|---|---|---|");
    for (const r of contra) md.push(`| ${r.issue_key} | ${r.position} | ${r.confidence} | ${r.locked_label.position} | ${r.served_status === "served" ? "yes" : "no"} | ${r.url} | ${esc(r.scored_excerpts[0]).slice(0, 300)} |`);
    md.push("");
  }
}
md.push(`## Review sample (${review.length} served items, balanced across keys)`, "", "Only items the public endpoint serves today. Scorer's read vs. the source, for a later human check. Leave the Match column blank until reviewed.", "");
md.push("| # | Person | Issue key | Read | Conf. | Locked | Source | Excerpt scored | Match? |", "|---|---|---|---|---|---|---|---|---|");
review.forEach((r, i) => md.push(`| ${i + 1} | ${r.politician} | ${r.issue_key} | ${r.position} | ${r.confidence} | ${r.locked_label ?? "—"}${r.contradicts_locked_label ? " ⚠" : ""} | ${r.url} | ${esc(r.scored_excerpts[0]).slice(0, 300)} | |`));
md.push("");
fs.writeFileSync(OUT_MD, md.join("\n"));

console.log(JSON.stringify({ totals: report.totals, people: Object.fromEntries(Object.entries(people).map(([k, p]) => [k, { strong: p.strong_items, served: p.strong_served, locked_pair: p.with_locked_label, contradicts: p.contradicts_locked_label, top_keys: Object.entries(p.keys).slice(0, 8).map(([kk, g]) => `${kk}:${g.count}`) }])), review: review.length }, null, 2));
