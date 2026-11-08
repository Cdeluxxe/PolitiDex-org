#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-person-locker-pledge.mjs — Evidence Locker items tied to pledges, and
// the stated-position rows at the top of the profile.
//
// Booted in a sandbox over the real engines (the same stack test-person-shell
// §11 boots, plus gaps.js, which prints the pledge rows). A fixture person gets
// three open pledges:
//   · public_schools — a STRONG Locker item on the same issue,
//   · healthcare     — only a WEAK Locker item,
//   · housing_build  — no Locker item at all.
// Then:
//   1. the strong pledge's row shows the excerpt and link in place of the
//      "Open gap / no sourced outcome" copy, and the item sits under the topic
//      leaf naming the pledge;
//   2. the weak pledge's row shows the item and keeps a light gap note;
//   3. the pledge with no match renders exactly as it did without the module;
//   4. Evidence tab and Word vs Action treat the item as the pledge's evidence;
//   5. the top of the profile shows at least 4 stated positions, with a visible
//      "See all positions" control directly under them.
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
const PLEDGES = [
  { title: "Fully fund every public school", detail: "Said he would fully fund public schools.", verdict: "pending", issueKey: "public_schools" },
  { title: "Lower what families pay for care", detail: "Said he would lower health costs.", verdict: "pending", issueKey: "healthcare" },
  { title: "Build more homes people can afford", detail: "Said he would expand housing supply.", verdict: "pending", issueKey: "housing_build" },
];
const [P_STRONG, P_WEAK, P_NONE] = PLEDGES;

const boot = (withLocker) => {
  const win = makeSandbox();
  win.console = quiet;
  const sb = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of ENGINE) {
    vm.runInContext(SRC.get(f), sb, { filename: f });
    if (f === "cmp-data.js") win.CMP_DATA[PID].promises = JSON.parse(JSON.stringify(PLEDGES));
  }
  for (const t of TAGS) {
    if (!/\bsrc\s*=/.test(t.attrs) && /window\.PDXStance\s*=/.test(t.body)) vm.runInContext(t.body, sb, { filename: "person.html PDXStance" });
  }
  if (withLocker) vm.runInContext(SRC.get("profile-locker.js"), sb, { filename: "profile-locker.js" });
  win.PROFILES = win.CMP_DATA;
  return win;
};

const raw = (topic, position, extra = {}) => ({
  politician_id: PID, topic, position, confidence: 0.91, source_type: "campaign page",
  excerpt: `Locker excerpt on ${topic}`, attribution: "Source: campaign page",
  link: `https://example.org/${topic}`, date: "2026-11-01", rules_version: "test", ...extra,
});
const STRONG = toSpotlightEntry(raw("public_schools", "support"));
const WEAK = toSpotlightEntry(raw("healthcare", "support",
  { confidence: 0.45, excerpt: "Weak excerpt on healthcare", link: "https://example.org/weak/healthcare" }));

const views = (win) => {
  const p = win.CMP_DATA[PID];
  const pe = (pr) => (typeof win._pdxPromiseEvidenceLink === "function" ? win._pdxPromiseEvidenceLink(PID, p, pr) || "" : "");
  return {
    gaps: win.PDXGaps.sectionHtml(PID, p) || "",
    panel: win.PDXGaps.panelHtml(PID, p) || "",
    conn: win._renderEvidenceConnections(PID, p) || "",
    tree: win.PDXStanceTree.sectionHtml(PID) || "",
    wa: win.PDXWordAction.sectionHtml(PID, p) || "",
    promStrong: pe(p.promises[0]), promWeak: pe(p.promises[1]), promNone: pe(p.promises[2]),
  };
};
// The <li> gap row whose label carries `title`.
const rowOf = (h, title) => {
  const at = h.indexOf(title);
  if (at === -1) return "";
  const start = h.lastIndexOf("<li", at);
  const end = h.indexOf("</li>", at);
  return start === -1 || end === -1 ? "" : h.slice(start, end + 5);
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

let before = null, empty = null, after = null, wL = null;
try {
  before = views(boot(false));
  empty = views(boot(true));
  wL = boot(true);
  const r = wL.PDXProfileLocker.onBody(JSON.parse(JSON.stringify({ items: { [PID]: [STRONG, WEAK] }, count: 2 })));
  ok(r && r.added === 2, `fixture: both Locker items are ingested (got ${r && r.added})`);
  after = views(wL);
} catch (e) {
  failures.push(`the sandboxed profile failed to boot or render — ${e && e.stack || e}`);
}

console.log("person: Evidence Locker items tied to pledges");
if (before && empty && after) {
  ok(rowOf(before.gaps, esc(P_STRONG.title)).includes("Open gap"),
    "fixture: without the Locker the strong pledge is an Open gap row (the test would pass for the wrong reason)");
  ok(/no sourced outcome/.test(rowOf(before.gaps, esc(P_STRONG.title))),
    "fixture: without the Locker the pledge row says it holds no sourced outcome");

  // ── No Locker items → every place exactly as before ───────────────────────
  for (const k of Object.keys(before)) {
    ok(empty[k] === before[k], `no items: the ${k} view is byte-identical with the module loaded and nothing ingested`);
  }

  // ── 1. Strong match: the pledge row shows the evidence ────────────────────
  {
    const row = rowOf(after.gaps, esc(P_STRONG.title));
    ok(row.includes("Locker excerpt on public_schools") && row.includes("https://example.org/public_schools") &&
       row.includes("Source: campaign page"),
      "strong: the pledge section's row shows the Locker excerpt, link and attribution");
    ok(/data-pdx-gap-locker="strong"/.test(row), "strong: the row is marked as carrying Locker evidence");
    ok(!/Open gap/.test(row) && !/no sourced outcome/.test(row) && !/pdxg-row-ask/.test(row),
      "strong: the standalone Open gap / no sourced outcome copy is gone from the row");
    ok(/Suggest a lead/.test(row), "strong: the row keeps its own lead button");
    const prow = rowOf(after.panel, esc(P_STRONG.title));
    ok(!after.panel || (prow.includes("Locker excerpt on public_schools") && !/Open gap/.test(prow)),
      "strong: the Word vs Action gap list shows the same evidence for the pledge");
    ok(after.promStrong.includes("Locker excerpt on public_schools") && after.promStrong.includes("https://example.org/public_schools"),
      "strong: the Promise Tracker row for the pledge carries the Locker excerpt and link");
    ok(after.promStrong.startsWith(before.promStrong), "strong: the Promise Tracker's own evidence chip is kept");

    // Under the topic leaf, naming the pledge.
    const leafAt = after.tree.indexOf('data-pdxtree-issue="public_schools"');
    const lineAt = after.tree.indexOf('data-pdxtree-locker-issue="public_schools"');
    const pledgeAt = after.tree.indexOf('data-pdxtree-locker-pledge="public_schools"');
    const nextLeaf = after.tree.indexOf('data-pdxtree-issue="', leafAt + 1);
    ok(leafAt !== -1 && lineAt > leafAt && (nextLeaf === -1 || lineAt < nextLeaf),
      "strong: the Locker excerpt sits under the pledge's topic leaf");
    ok(pledgeAt > lineAt && (nextLeaf === -1 || pledgeAt < nextLeaf) && after.tree.includes(esc(P_STRONG.title)),
      "strong: the leaf line names the pledge it is evidence for");
    ok(!/data-pdxtree-locker-grp="public_schools"/.test(after.tree),
      "strong: an issue with a leaf is not repeated in the bottom Locker group");
  }

  // ── 2. Weak-only match: the item, plus a light gap note ───────────────────
  {
    const row = rowOf(after.gaps, esc(P_WEAK.title));
    ok(row.includes("Weak excerpt on healthcare") && row.includes("https://example.org/weak/healthcare"),
      "weak: the pledge row still shows the weak Locker item with its link");
    ok(/Weak signal/.test(row) && /data-pdx-gap-locker="weak"/.test(row), "weak: the item carries the Weak signal badge");
    ok(/data-pdx-gap-note="1"/.test(row) && /no sourced outcome/.test(row),
      "weak: the row keeps a light gap note");
    ok(after.promWeak.includes("Weak excerpt on healthcare"), "weak: the Promise Tracker row shows the weak item");
    const leafAt = after.tree.indexOf('data-pdxtree-issue="healthcare"');
    const at = after.tree.indexOf("Weak excerpt on healthcare");
    const next = after.tree.indexOf('data-pdxtree-issue="', leafAt + 1);
    ok(leafAt === -1 || (at > leafAt && (next === -1 || at < next)),
      "weak: where the issue has a leaf, the weak item sits under it");
  }

  // ── 3. No match: the pledge is untouched ──────────────────────────────────
  {
    const was = rowOf(before.gaps, esc(P_NONE.title));
    ok(was && rowOf(after.gaps, esc(P_NONE.title)) === was,
      "none: a pledge with no matching Locker item renders exactly as before in the pledge section");
    ok(rowOf(after.panel, esc(P_NONE.title)) === rowOf(before.panel, esc(P_NONE.title)),
      "none: …and in the Word vs Action gap list");
    ok(after.promNone === before.promNone, "none: its Promise Tracker row is unchanged");
  }

  // ── 4. Evidence tab and Word vs Action: evidence for the pledge ───────────
  {
    const anchor = wL._pdxEvAnchor(PID, "public_schools");
    const cardAt = after.conn.indexOf(`id="${anchor}"`);
    const promAt = after.conn.indexOf(esc(P_STRONG.title), cardAt);
    const linkAt = after.conn.indexOf('data-evd-locker-pledge="public_schools"', cardAt);
    ok(cardAt !== -1 && promAt > cardAt && linkAt > promAt,
      "evidence tab: the Locker item sits under the pledge in its issue card");
    const hAnchor = wL._pdxEvAnchor(PID, "healthcare");
    const hAt = after.conn.indexOf(`id="${hAnchor}"`);
    if (hAt !== -1 && after.conn.indexOf(esc(P_WEAK.title), hAt) !== -1) {
      ok(after.conn.indexOf('data-evd-locker-pledge="healthcare"', hAt) !== -1,
        "evidence tab: the weak item sits under its pledge in the issue card");
      ok(!/data-evd-locker-grp="healthcare"/.test(after.conn),
        "evidence tab: the weak item is not repeated as a separate weaker-signals track");
    }
    ok(/data-pdxwa-locker-pledges="1"/.test(after.wa) && /data-pdxwa-locker-pledge="public_schools"/.test(after.wa) &&
       after.wa.includes(esc(P_STRONG.title)),
      "word vs action: the Locker item is listed as evidence for the pledge");
    const num = (h) => (h.match(/class="pdxwa-num-v">([^<]*)</) || [])[1];
    ok(num(after.wa) === num(before.wa), "word vs action: the figure is unchanged");
  }

  // Additive only: no Locker item is hidden.
  for (const needle of ["Locker excerpt on public_schools", "Weak excerpt on healthcare"]) {
    for (const k of ["conn", "tree", "wa"]) ok(after[k].includes(needle), `additive: ${needle} still shows in the ${k} view`);
  }
}

// ── 5. The top of the profile: stated positions and "See all" ──────────────
// Five stated positions: two cited on their own cards, two with no link of
// their own but a strong Locker item on the same issue and side, one cited
// nowhere (with a Locker item on the OTHER side, which must not cite it).
console.log("person: stated positions at the top");
{
  const w = boot(true);
  const WA = w.PDXWordAction;
  const st = (key, url) => ({ key, label: key === "support" ? "Supports" : "Opposes", source: url ? { url, label: "Card source" } : null });
  const ROWS = [
    { key: "public_schools", label: "Public schools", stance: st("support", "https://example.org/card/schools") },
    { key: "healthcare", label: "Healthcare", stance: st("support", "https://example.org/card/health") },
    { key: "housing_build", label: "Housing", stance: st("support", null) },
    { key: "gun_safety", label: "Gun safety", stance: st("oppose", null) },
    { key: "voter_id", label: "Voter ID", stance: st("oppose", null) },
  ];
  const realRows = w.PDXConsistency.issueRows;
  w.PDXConsistency.issueRows = (pid) => (pid === PID ? JSON.parse(JSON.stringify(ROWS)) : realRows.call(w.PDXConsistency, pid));
  w.PDXProfileLocker.onBody(JSON.parse(JSON.stringify({ items: { [PID]: [
    toSpotlightEntry(raw("housing_build", "support")),
    toSpotlightEntry(raw("gun_safety", "oppose")),
    toSpotlightEntry(raw("voter_id", "support")),          // other side: cites nothing
  ] }, count: 3 })));
  const set = WA.saidRowSet(PID, w.CMP_DATA[PID]);
  ok(set.stated === 5 && set.cited === 4, `top: a Locker item on the same issue and side cites a position (stated ${set.stated}, cited ${set.cited})`);
  ok(!set.rows.some((r) => r.key === "voter_id"), "top: a position cited nowhere is never a row, even with an opposite-side Locker item");
  ok(ROWS[2].stance.source === null, "top: the shared stance object is not mutated");
  const h = WA.saidBriefHtml(PID, w.CMP_DATA[PID], set) || "";
  const chips = (h.match(/class="pdxwa-shape-row pdxwa-said-row"/g) || []).length;
  ok(chips >= 4, `top: at least 4 stance chips show (got ${chips})`);
  ok(chips === set.rows.length, "top: every cited position fits under the cap and is shown");
  ok(/1 more stated position in the topic tree below/.test(h), "top: the uncited position is named as a count, not a row");
  const btn = h.indexOf("pdxwa-said-all");
  ok(btn !== -1 && /See all 5 positions/.test(h), "top: the See all positions control is present");
  ok(btn > h.lastIndexOf("</ul>") && btn < h.indexOf("pdxwa-said-note"),
    "top: the control sits directly under the visible chips");
  const btnTag = h.slice(h.lastIndexOf("<button", btn), h.indexOf(">", btn));
  ok(!/\shidden\b|display:\s*none|aria-hidden="true"/.test(btnTag), "top: the control is not hidden");
  const css = read("word-action.css");
  const rule = (css.match(/\n\.pdxwa-said-all\s*\{([^}]*)\}/) || [])[1] || "";
  ok(/color:\s*#f5d77a/.test(rule) && /border:\s*1px solid rgba\(245, 200, 66, 0\.6\)/.test(rule) && !/display:\s*none|visibility:\s*hidden|opacity:\s*0[;\s]/.test(rule),
    "top: the control has a strong-contrast style and nothing hides it");
  // Without Locker items the same file lists only its own cited cards.
  const w0 = boot(false);
  const real0 = w0.PDXConsistency.issueRows;
  w0.PDXConsistency.issueRows = (pid) => (pid === PID ? JSON.parse(JSON.stringify(ROWS)) : real0.call(w0.PDXConsistency, pid));
  ok(w0.PDXWordAction.saidRowSet(PID, w0.CMP_DATA[PID]).cited === 2, "top: with no Locker items only the cards' own citations count");
}

if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — Locker items read as pledge evidence; the top shows what is on file`);
