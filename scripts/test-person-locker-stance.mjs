#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-person-locker-stance.mjs — Evidence Locker evidence promoted to a
// visible "Said: Supports/Opposes" stance on the person profile.
//
// Boots the real profile engines (the same stack as test-person-locker-pledge)
// and feeds profile-locker.js one fixture person with:
//   · climate_action  — ONE weak support item      → weak "Said" line;
//   · border_security — THREE weak oppose items    → stronger "Said" line;
//   · housing_build   — ONE strong support item    → stronger "Said" line;
//   · voter_id        — a mention only             → no stance;
//   · tax_cuts        — nothing at all             → no stance;
//   · healthcare      — a CURATED stance (support) plus a strong oppose Locker
//                       item → the curated stance is unchanged, nothing promoted.
// Each promoted line must appear in the top section ("Said" rows), All Issues
// by Topic, the Evidence tab and Word vs Action, marked pipeline-sourced.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { toSpotlightEntry } from "../netlify/lib/evidence-locker-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const failures = [];
let passed = 0;
const ok = (c, m) => { if (c) passed++; else failures.push(m); };

const html = read("person.html");
const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => ({ attrs: m[1], body: m[2] }));
const ENGINE = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js", "consistency.js",
  "voting-record.js", "word-action.js", "profile-spine.js", "stance-tree.js", "related-issues.js",
  "profile-evidence.js", "profiles-full.js", "gaps.js",
];
const SRC = new Map([...ENGINE, "profile-locker.js"].map((f) => [f, read(f)]));
const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const PID = "james_talarico";

const boot = (withLocker) => {
  const win = makeSandbox();
  win.console = quiet;
  const sb = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of ENGINE) vm.runInContext(SRC.get(f), sb, { filename: f });
  for (const t of TAGS) {
    if (!/\bsrc\s*=/.test(t.attrs) && /window\.PDXStance\s*=/.test(t.body)) vm.runInContext(t.body, sb, { filename: "person.html PDXStance" });
  }
  if (withLocker) vm.runInContext(SRC.get("profile-locker.js"), sb, { filename: "profile-locker.js" });
  win.PROFILES = win.CMP_DATA;
  return win;
};

let n = 0;
const raw = (topic, position, confidence, extra = {}) => ({
  politician_id: PID, topic, position, confidence, source_type: "campaign page",
  excerpt: `Locker excerpt ${++n} on ${topic}`, attribution: "Source: campaign page",
  link: `https://example.org/${topic}/${n}`, date: "2026-11-01", rules_version: "test", ...extra,
});
const ITEMS = [
  toSpotlightEntry(raw("climate_action", "support", 0.45)),
  toSpotlightEntry(raw("border_security", "oppose", 0.4)),
  toSpotlightEntry(raw("border_security", "oppose", 0.5)),
  toSpotlightEntry(raw("border_security", "oppose", 0.6)),
  toSpotlightEntry(raw("housing_build", "support", 0.92)),
  toSpotlightEntry(raw("voter_id", "mixed", 0.9, { excerpt: "They brought up voter ID at a forum." })),
  toSpotlightEntry(raw("healthcare", "oppose", 0.95)),
];

const views = (win) => {
  const p = win.CMP_DATA[PID];
  return {
    tree: win.PDXStanceTree.sectionHtml(PID) || "",
    conn: win._renderEvidenceConnections(PID, p) || "",
    wa: win.PDXWordAction.sectionHtml(PID, p) || "",
  };
};
// The single element carrying `data-pdx-locker-said="key"` (its opening tag up to its close).
const saidEl = (h, key) => {
  const at = h.indexOf(`data-pdx-locker-said="${key}"`);
  if (at === -1) return "";
  const open = h.lastIndexOf("<", at);
  const tag = (h.slice(open + 1).match(/^[a-z]+/) || [])[0];
  const end = h.indexOf(`</${tag}>`, at);
  return end === -1 ? "" : h.slice(open, end + tag.length + 3);
};

let before = null, after = null, w = null, w0 = null;
try {
  w0 = boot(false);
  before = views(w0);
  w = boot(true);
  const r = w.PDXProfileLocker.onBody(JSON.parse(JSON.stringify({ items: { [PID]: ITEMS }, count: ITEMS.length })));
  ok(r && r.added === ITEMS.length, `fixture: every Locker item is ingested (got ${r && r.added})`);
  after = views(w);
} catch (e) {
  failures.push(`the sandboxed profile failed to boot or render — ${e && e.stack || e}`);
}

console.log("person: Locker evidence promoted to visible stances");
if (before && after) {
  const L = w.PDXProfileLocker;
  const curatedKeys = (w._resolveStanceList(PID, w.CMP_DATA[PID]) || []).map((s) => s.issueKey);
  ok(curatedKeys.includes("healthcare"), "fixture: healthcare carries a curated stance");
  for (const k of ["climate_action", "border_security", "housing_build", "voter_id", "tax_cuts"]) {
    ok(!curatedKeys.includes(k), `fixture: ${k} has no curated stance`);
  }

  // ── The read ──────────────────────────────────────────────────────────────
  const weak = L.promotedStance(PID, "climate_action");
  ok(weak && weak.side === "support" && weak.strength === "weak" && weak.source === "pipeline",
    "1 weak item → a weak Supports stance, pipeline-sourced");
  const three = L.promotedStance(PID, "border_security");
  ok(three && three.side === "oppose" && three.strength === "strong",
    "3 weak items → a stronger Opposes stance");
  const one = L.promotedStance(PID, "housing_build");
  ok(one && one.side === "support" && one.strength === "strong",
    "1 strong item → a stronger Supports stance");
  ok(L.promotedStance(PID, "voter_id") === null, "mention only → no stance");
  ok(L.promotedStance(PID, "tax_cuts") === null, "nothing on file → no stance");
  ok(L.promotedStance(PID, "healthcare") === null, "curated issue → nothing promoted over it");

  // ── Every surface ─────────────────────────────────────────────────────────
  const WA = w.PDXWordAction;
  const set = WA.saidRowSet(PID, w.CMP_DATA[PID]);
  const top = WA.saidBriefHtml(PID, w.CMP_DATA[PID], { ...set, shown: set.rows }) || "";
  const surfaces = { top, tree: after.tree, evidence: after.conn, "word vs action": after.wa };

  for (const [name, h] of Object.entries(surfaces)) {
    const wl = saidEl(h, "climate_action");
    ok(wl && /data-pdx-locker-said-strength="weak"/.test(wl) && /Weak signal/.test(wl),
      `${name}: 1 weak item shows a "Said" line labelled Weak signal`);
    ok(/Supports/.test(wl) && /data-pdx-stance-source="pipeline"/.test(wl) && /said/i.test(wl),
      `${name}: the weak line says Supports and is marked pipeline-sourced`);
    for (const k of ["border_security", "housing_build"]) {
      const sl = saidEl(h, k);
      ok(sl && /data-pdx-locker-said-strength="strong"/.test(sl) && /Stronger signal/.test(sl) && !/Weak signal/.test(sl),
        `${name}: ${k} shows a stronger "Said" line with no weak badge`);
      ok(/data-pdx-stance-source="pipeline"/.test(sl), `${name}: the ${k} line is marked pipeline-sourced`);
    }
    ok(/Opposes/.test(saidEl(h, "border_security")), `${name}: the 3-weak line says Opposes`);
    for (const k of ["voter_id", "tax_cuts", "healthcare"]) {
      ok(!h.includes(`data-pdx-locker-said="${k}"`), `${name}: ${k} shows no promoted stance`);
    }
  }
  ok(/Said:/.test(after.tree) && /Said:/.test(after.conn) && /Said:/.test(after.wa), "the lines read “Said:”");
  ok(/SAID · PIPELINE/.test(top), "top: the promoted rows carry the pipeline lane tag");

  // ── Evidence tab: the strong issue fills its card's Stated stance slot ────
  {
    const anchor = w._pdxEvAnchor(PID, "housing_build");
    const cardAt = after.conn.indexOf(`id="${anchor}"`);
    if (cardAt !== -1) {
      const laneAt = after.conn.indexOf("📌 Stated stance", cardAt);
      const saidAt = after.conn.indexOf('data-pdx-locker-said="housing_build"', cardAt);
      const nextLane = after.conn.indexOf('class="evd-lane-h"', laneAt + 1);
      ok(laneAt !== -1 && saidAt > laneAt && saidAt < nextLane,
        "evidence: the promoted line sits in the issue card's Stated stance lane");
    }
  }

  // ── Curated stances are unchanged ─────────────────────────────────────────
  {
    const leaf = (h) => (h.match(/data-pdxtree-issue="healthcare"[^>]*data-pdxtree-said="([^"]*)"/) || [])[1];
    ok(leaf(after.tree) === leaf(before.tree) && leaf(after.tree) === "support",
      "curated: the healthcare leaf still reads its curated side");
    const resolvedBefore = JSON.stringify((w0._resolveStanceList(PID, w0.CMP_DATA[PID]) || []).map((s) => [s.issueKey, s.pos, s.issueStance, s.text]));
    const resolvedAfter = JSON.stringify((w._resolveStanceList(PID, w.CMP_DATA[PID]) || []).map((s) => [s.issueKey, s.pos, s.issueStance, s.text]));
    ok(resolvedAfter === resolvedBefore, "curated: the stance list is byte-identical");
    const row = set.rows.find((r) => r.key === "healthcare");
    const set0 = w0.PDXWordAction.saidRowSet(PID, w0.CMP_DATA[PID]);
    const row0 = set0.rows.find((r) => r.key === "healthcare");
    ok(!row0 || (row && !row.locker && row.side === row0.side), "curated: the top section's healthcare row is the curated one");
    const lane = (h) => {
      const a = h.indexOf(`id="${w._pdxEvAnchor(PID, "healthcare")}"`);
      if (a === -1) return null;
      const s = h.indexOf("📌 Stated stance", a);
      return h.slice(s, h.indexOf('class="evd-lane-h"', s + 1));
    };
    // The card may only exist once a Locker item lands, so the lane is checked
    // against the curated card itself rather than against the empty render.
    const cur = (w._resolveStanceList(PID, w.CMP_DATA[PID]) || []).find((s) => s.issueKey === "healthcare");
    const ln = lane(after.conn);
    const escHtml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    ok(ln === null || (ln === lane(before.conn)) ||
       (/evd-stance-badge stance-support/.test(ln) && ln.includes(escHtml(cur.text || cur.topic)) && !/data-pdx-locker-said/.test(ln)),
      "curated: the healthcare Stated stance lane still prints the curated card, not a promoted line");
    const num = (h) => (h.match(/class="pdxwa-num-v">([^<]*)</) || [])[1];
    ok(num(after.wa) === num(before.wa), "word vs action: the figure is unchanged");
  }
}

if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — directional Locker evidence fills the Stated stance slot, labelled by strength`);
