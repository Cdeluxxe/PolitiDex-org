#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-stance-store-readers.mjs — the person-file "Said" list, Word vs Action
// and the issue drawer are pure readers of ONE stance store.
//
// Boots the real profile engines with profile-locker.js and feeds one fixture
// person Evidence Locker items:
//   · climate_action  — ONE weak support item     → a weak promoted stance;
//   · housing_build   — ONE strong support item   → a stronger promoted stance;
//   · voter_id        — a mention only            → no stance;
//   · tax_cuts        — nothing at all            → no stance;
// plus the person's own curated, cited stances (public_schools, school_choice).
//
//   1. THE STORE. PDXConsistency.statedStance answers each key, and
//      statedStances lists every entry once.
//   2. SAME SIDE, SIGNAL, SOURCE. For every stored stance, the person-file list
//      row, the Word vs Action row and the issue drawer's stance slot carry the
//      same data-pdx-stance-side / -signal / -note, and the note's words are
//      visible on each surface.
//   3. NO STANCE, NOWHERE. A key the store has no entry for is on none of the
//      three surfaces; the drawer prints no "Says:"/"Said:" for it and no vote
//      table for a formal record the row model does not hold.
//   4. TOPIC COLOURS. Every Word vs Action stance row wears the same topic
//      colour tokens as the person-file list row and the All Issues by Topic
//      leaf for the same key.
//   5. MUTATION. A drawer that reads positionStance directly again (dropping
//      the Locker half of the store) must fail check 2.
//
//   node scripts/test-stance-store-readers.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { toSpotlightEntry } from "../netlify/lib/evidence-locker-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const html = read("person.html");
const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => ({ attrs: m[1], body: m[2] }));
const ENGINE = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js", "consistency.js",
  "voting-record.js", "word-action.js", "profile-spine.js", "stance-tree.js", "related-issues.js",
  "profile-evidence.js", "profiles-full.js", "gaps.js", "profile-locker.js",
];
const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const PID = "james_talarico";
const PROMOTED = ["climate_action", "housing_build"];
const NONE = ["voter_id", "tax_cuts"];

let n = 0;
const raw = (topic, position, confidence, extra = {}) => ({
  politician_id: PID, topic, position, confidence, source_type: "campaign page",
  excerpt: `Locker excerpt ${++n} on ${topic}`, attribution: "Source: campaign page",
  link: `https://example.org/${topic}/${n}`, date: "2026-11-01", rules_version: "test", ...extra,
});
const ITEMS = [
  toSpotlightEntry(raw("climate_action", "support", 0.45)),
  toSpotlightEntry(raw("housing_build", "support", 0.92)),
  toSpotlightEntry(raw("voter_id", "mixed", 0.9, { excerpt: "They brought up voter ID at a forum." })),
];

function boot(src) {
  const win = makeSandbox();
  win.console = quiet;
  const sb = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of ENGINE) vm.runInContext(src.get(f), sb, { filename: f });
  for (const t of TAGS) {
    if (!/\bsrc\s*=/.test(t.attrs) && /window\.PDXStance\s*=/.test(t.body)) vm.runInContext(t.body, sb, { filename: "person.html PDXStance" });
  }
  win.PROFILES = win.CMP_DATA;
  win.PDXProfileLocker.onBody(JSON.parse(JSON.stringify({ items: { [PID]: ITEMS }, count: ITEMS.length })));
  return win;
}

// The opening tag of the first element on `h` carrying data-pdx-stance="key",
// and the element itself (open tag to its matching close, nesting-aware).
function stanceEl(h, key) {
  const at = h.indexOf(`data-pdx-stance="${key}"`);
  if (at === -1) return null;
  const open = h.lastIndexOf("<", at);
  const tag = (h.slice(open + 1).match(/^[a-z]+/) || [])[0];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, "g");
  re.lastIndex = open;
  let depth = 0, m, end = -1;
  while ((m = re.exec(h))) {
    if (m[0][1] === "/") { depth--; if (depth === 0) { end = re.lastIndex; break; } } else depth++;
  }
  const el = end === -1 ? h.slice(open) : h.slice(open, end);
  const head = h.slice(open, h.indexOf(">", open) + 1);
  const attr = (name) => (head.match(new RegExp(`${name}="([^"]*)"`)) || [])[1] || "";
  return { el, head, side: attr("data-pdx-stance-side"), signal: attr("data-pdx-stance-signal"), note: attr("data-pdx-stance-note") };
}
const text = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const icTokens = (head) => (head.match(/--pdx-ic:[^;"]+/) || [""])[0];

function surfaces(win) {
  const p = win.CMP_DATA[PID];
  const WA = win.PDXWordAction;
  const set = WA.saidRowSet(PID, p);
  return {
    "person-file list": WA.saidBriefHtml(PID, p, { ...set, shown: set.rows }) || "",
    "word vs action": WA.sectionHtml(PID, p) || "",
    drawer: (k) => win.PDXConsistency.gapViewHtml(PID, k) || "",
  };
}

function check(src) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  let win;
  try { win = boot(src); } catch (e) { return { faults: [`boot failed: ${e && e.stack || e}`], pass }; }
  const CS = win.PDXConsistency;
  ok(typeof CS.statedStance === "function" && typeof CS.statedStances === "function", "the store reader is published on PDXConsistency");
  if (typeof CS.statedStance !== "function") return { faults, pass };

  // ── 1 · the store ────────────────────────────────────────────────────────
  const all = CS.statedStances(PID) || [];
  const keys = all.map((s) => s.key);
  ok(new Set(keys).size === keys.length, "statedStances lists each issue once");
  const curated = all.filter((s) => s.source === "curated" && s.cited).map((s) => s.key);
  ok(curated.length >= 2, `fixture: the person carries cited curated stances (${curated.join(", ")})`);
  for (const k of PROMOTED) {
    const s = CS.statedStance(PID, k);
    ok(s && s.source === "pipeline" && s.side === "support", `store: ${k} is a promoted Supports stance`);
    ok(keys.includes(k), `store: ${k} is in statedStances`);
  }
  ok(CS.statedStance(PID, "climate_action")?.signal === "weak", "store: one weak item → weak signal");
  ok(CS.statedStance(PID, "housing_build")?.signal === "strong", "store: one strong item → stronger signal");
  for (const k of NONE) {
    ok(CS.statedStance(PID, k) === null, `store: ${k} has no stance`);
    ok(!keys.includes(k), `store: ${k} is not in statedStances`);
  }

  // ── 2 · the same side, signal and source on every surface ────────────────
  const S = surfaces(win);
  const present = [...curated.slice(0, 2), ...PROMOTED];
  for (const k of present) {
    const s = CS.statedStance(PID, k);
    const reads = {
      "person-file list": stanceEl(S["person-file list"], k),
      "word vs action": stanceEl(S["word vs action"], k),
      drawer: stanceEl(S.drawer(k), k),
    };
    for (const [name, r] of Object.entries(reads)) {
      ok(!!r, `${name}: ${k} shows the stored stance`);
      if (!r) continue;
      ok(r.side === s.side, `${name}: ${k} side is the store's (${r.side} vs ${s.side})`);
      ok(r.signal === s.signal, `${name}: ${k} signal is the store's (${r.signal} vs ${s.signal})`);
      ok(decode(r.note) === s.note, `${name}: ${k} source note is the store's (“${decode(r.note)}” vs “${s.note}”)`);
      const t = text(r.el);
      ok(t.includes(s.sideLabel), `${name}: ${k} prints the side “${s.sideLabel}”`);
      if (s.source === "pipeline") {
        ok(t.includes(s.signalLabel) && /Pipeline-sourced/.test(t) && t.includes(`from ${s.n} Locker item`),
          `${name}: ${k} prints the same signal and Locker source (“${t.slice(0, 160)}”)`);
      } else {
        ok(t.includes(s.note), `${name}: ${k} prints the source note “${s.note}”`);
      }
    }
  }

  // ── 3 · no stance → omitted everywhere, and no invented formal record ────
  for (const k of NONE) {
    ok(!S["person-file list"].includes(`data-pdx-stance="${k}"`) && !S["person-file list"].includes(`data-pdx-locker-said="${k}"`),
      `person-file list: ${k} shows no stance`);
    ok(!S["word vs action"].includes(`data-pdx-stance="${k}"`) && !S["word vs action"].includes(`data-pdx-locker-said="${k}"`),
      `word vs action: ${k} shows no stance`);
    const d = S.drawer(k);
    if (!d) { pass++; continue; }
    ok(!/data-pdx-stance=|class="pdxgap-stance"|data-pdx-locker-said=/.test(d), `drawer: ${k} carries no stance element`);
    ok(!/Says: (Supports|Opposes|Mixed)|Said:\s*<\/b>/.test(d), `drawer: ${k} claims no stated side`);
    let row = null;
    try { row = (CS.issueRows(PID, [k]) || [])[0] || null; } catch { row = null; }
    const held = !!(row && row.ov && ((row.ov.record && row.ov.record.total) || (row.ov.officialActions && row.ov.officialActions.total)));
    if (!held) ok(!/data-pdxlg-row=/.test(d), `drawer: ${k} prints no vote table for a formal record the store does not hold`);
  }

  // ── 4 · topic colours: Word vs Action rows match the person file ─────────
  const IC = win.PDXIssueColors;
  const tree = win.PDXStanceTree.sectionHtml(PID) || "";
  let tinted = 0;
  for (const k of present) {
    const wa = stanceEl(S["word vs action"], k), top = stanceEl(S["person-file list"], k);
    if (!wa || !top) continue;
    const core = IC && IC.isCore(k);
    if (!core) { ok(!/data-ic=/.test(wa.head), `word vs action: unresolved ${k} carries no tint`); continue; }
    tinted++;
    ok(/data-ic="on"/.test(wa.head), `word vs action: the ${k} row wears its topic colour`);
    ok(icTokens(wa.head) && icTokens(wa.head) === icTokens(top.head),
      `word vs action: the ${k} row colour matches the person-file list (${icTokens(wa.head)} vs ${icTokens(top.head)})`);
    ok(icTokens(wa.head) === (IC.styleFor(k).match(/--pdx-ic:[^;"]+/) || [""])[0], `word vs action: the ${k} colour is PDXIssueColors'`);
    const leaf = (tree.match(new RegExp(`<div class="pdxtree-leaf[^"]*"[^>]*data-pdxtree-issue="${k}"[^>]*>`)) || [])[0] || "";
    if (leaf && /--pdx-ic:/.test(leaf)) {
      ok(icTokens(leaf) === icTokens(wa.head), `word vs action: the ${k} colour matches its All Issues by Topic leaf`);
    }
  }
  ok(tinted >= 3, `at least three Word vs Action stance rows were colour-checked (${tinted})`);
  const lockerLines = [...S["word vs action"].matchAll(/<p class="pdxwa-line" data-pdxwa-locker-item="([^"]+)"([^>]*)>/g)];
  for (const m of lockerLines) {
    if (IC.isCore(m[1])) ok(/data-ic="on"/.test(m[2]), `word vs action: the Locker line on ${m[1]} wears its topic colour`);
  }
  return { faults, pass };
}

const SRC = new Map(ENGINE.map((f) => [f, read(f)]));
const live = check(SRC);

// ── 5 · mutation: the drawer reads positionStance directly again ───────────
const CJ = SRC.get("consistency.js");
const MUT_FROM = "var stance = _gapStanceHtml(pid, issueKey);";
const mutSrc = new Map(SRC);
mutSrc.set("consistency.js", CJ.replace(MUT_FROM, "var stance = _orStanceChip(pid, issueKey);"));
const mut = CJ.includes(MUT_FROM) ? check(mutSrc) : { faults: ["(anchor missing)"], pass: 0 };
const caught = mut.faults.some((f) => /^drawer: (climate_action|housing_build) shows the stored stance/.test(f));

console.log("stance store: the person-file list, Word vs Action and the issue drawer read one store");
if (!caught) live.faults.push("mutation: a drawer reading positionStance directly was NOT caught");
if (live.faults.length) {
  for (const f of live.faults.slice(0, 60)) console.log("  ✗ " + f);
  console.log(`\n✗ stance store readers: ${live.faults.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`✓ stance store readers: all ${live.pass} assertions passed, 1 mutation caught`);
