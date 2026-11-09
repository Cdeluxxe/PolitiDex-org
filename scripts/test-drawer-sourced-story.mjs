#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-drawer-sourced-story.mjs — the issue drawer tells a sourced story
// ─────────────────────────────────────────────────────────────────────────────
// The drawer used to open on status chips and score context before the reader
// knew what the issue was, with a full-width "Share this" bar between the
// verdict and the record. It now runs, top to bottom:
//
//   1. HEADER ROW — issue title, stated position (the stance store's one entry,
//      with its chips) and the record verdict ("No pattern yet" when there is no
//      word to print) in one row. A small share icon sits in the corner.
//   2. THE ISSUE IN ONE SENTENCE — ISSUE_MAP[key].chip, word for word.
//   3. POSITION AND CONNECTIONS — the stance signal, the related-issues lines,
//      then Where this conflicts (unchanged, after the related lines).
//   4. EVIDENCE — one block per source behind the stance (the stance card's
//      sources, or a matching Evidence Locker item): summary, then link. Absent
//      when there is none; never a placeholder.
//   5. FORMAL RECORD — the existing record, vote table and notes.
//   6. SHARE — a quiet text button at the foot. The old bar is gone.
//
// Checked on the real corpus, under both vocabularies the four pages load
// (alignment-tool.js on the homepage and ballot page, issue-map.js on the
// person and issue pages), plus fixtures for sources, Locker items and the
// conflicts section, and the shell bump.
//
//   node scripts/test-drawer-sourced-story.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n      got:  ${JSON.stringify(a)}\n      want: ${JSON.stringify(b)}`);

const BASE = (vocab) => [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", vocab,
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
  "related-issues.js", "share-anywhere.js",
];
const corpus = buildCorpus(ROOT);

function boot(opts = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  const files = BASE(opts.vocab || "alignment-tool.js").concat(opts.locker ? ["profile-locker.js"] : []);
  for (const f of files) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { win.__err = (win.__err || "") + `${f}: ${e.message}; `; }
    if (f === "state-senate-stances.js" && opts.cards) opts.cards(win);
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ }
  }
  return win;
}

// Section markers, in the order the drawer must print them.
const M = {
  icon: 'data-pdxgap-share="icon"',
  header: 'data-pdxgap-sec="header"',
  sentence: 'data-pdxgap-sec="sentence"',
  signal: 'data-pdxgap-sec="connections"',
  related: 'class="pdxri pdxri-drawer"',
  conflicts: 'class="pdxri-conflicts"',
  evidence: 'data-pdxgap-sec="evidence"',
  record: 'data-pdxgap-sec="record"',
  text: 'data-pdxgap-share="text"',
};
const ORDER = ["header", "sentence", "signal", "related", "conflicts", "evidence", "record", "text"];
function orderFaults(h, tag) {
  const out = [];
  let last = -1, lastName = "";
  for (const k of ORDER) {
    const i = h.indexOf(M[k]);
    if (i < 0) continue;
    if (h.indexOf(M[k], i + 1) >= 0 && k !== "related") out.push(`${tag}: ${k} printed twice`);
    if (i < last) out.push(`${tag}: ${k} sits before ${lastName}`);
    last = i; lastName = k;
  }
  // The vote table and every formal-record part sit after the record marker.
  const rec = h.indexOf(M.record);
  for (const r of ['data-pdxlg-tally="1"', '<table class="pdxlg-t">', 'class="pdxgap-how"', 'class="pdxgap-sides']) {
    const i = h.indexOf(r);
    if (i >= 0 && i < rec) out.push(`${tag}: ${r} sits above the formal record`);
  }
  return out;
}
// The header block: from the start to the end of the identity strip.
const headOf = (h) => h.slice(0, Math.max(0, h.indexOf(M.sentence) >= 0 ? h.indexOf(M.sentence) : h.indexOf(M.record)));
const hrowOf = (h) => { const i = h.indexOf(M.header); const j = h.indexOf('<div class="pdxgap-id">', i); return i >= 0 ? h.slice(i, j > i ? j : undefined) : ""; };
const text = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const SAMPLE = ["lee", "schiff", "trump", "ryan_arbon", "warren", "cruz", "romney", "ocasio_cortez", "sanders", "mcconnell"];

// ── 1 · order on the real corpus, under both vocabularies ──────────────────
for (const [vocab, pages] of [["alignment-tool.js", "homepage, ballot"], ["issue-map.js", "person, issue"]]) {
  const win = boot({ vocab });
  if (win.__err) failures.push(`boot (${vocab}): ${win.__err}`);
  const CS = win.PDXConsistency;
  let sheets = 0, withEv = 0, ledger = 0;
  for (const pid of SAMPLE) {
    if (!win.CMP_DATA[pid]) continue;
    for (const r of CS.issueRows(pid) || []) {
      const h = CS.gapViewHtml(pid, r.key) || "";
      if (!h) continue;
      sheets++;
      const tag = `${pages} · ${pid} × ${r.key}`;
      orderFaults(h, tag).forEach((f) => failures.push(f));
      ok(h.indexOf(M.header) >= 0, `${tag}: no header row`);
      ok(h.indexOf(M.record) >= 0, `${tag}: no formal record section`);
      // Header row: title, then stance (if any), then the verdict — together.
      const row = hrowOf(h);
      ok(/class="pdxgap-title/.test(row), `${tag}: the title is not in the header row`);
      const s = CS.statedStance(pid, r.key);
      if (s) ok(row.indexOf(`data-pdx-stance="${r.key}"`) >= 0, `${tag}: the stated position is not in the header row`);
      ok(/class="pdxlg-find"|class="pdxgap-rel-hero"|class="pdxdv-rel"|data-pdxgap-nopat="1"/.test(row), `${tag}: no verdict (or No pattern yet) in the header row`);
      ok((h.match(/data-pdx-stance="/g) || []).length <= 1, `${tag}: the stance element is printed twice`);
      // The sentence is the register's line, word for word.
      const chip = win.ISSUE_MAP[r.key] && win.ISSUE_MAP[r.key].chip;
      if (chip) {
        const m = /<p class="pdxgap-sum" data-pdxgap-sec="sentence">([^<]*)<\/p>/.exec(h);
        eq(m && text(m[1]), text(chip.replace(/&/g, "&amp;")), `${tag}: the issue sentence is not the register's line`);
      } else ok(h.indexOf(M.sentence) < 0, `${tag}: a sentence printed for a key with no register line`);
      // Signal only with a stance.
      ok(!!s === (h.indexOf(M.signal) >= 0), `${tag}: the stance signal does not follow the stance store`);
      // Share: icon in the header, text at the foot, no old bar.
      ok(headOf(h).indexOf(M.icon) >= 0 && h.indexOf(M.icon) === h.lastIndexOf(M.icon), `${tag}: the share icon is not in the header, once`);
      ok(h.indexOf('<div class="pdxgap-h pdxgap-h2">') === 0, `${tag}: the drawer does not open on the header`);
      ok(h.lastIndexOf(M.text) > h.lastIndexOf('class="pdxgap-foot"'), `${tag}: the text share is not at the bottom`);
      ok(!/pdxsa-block|pdxsa-wrap-block|>Share this<|class="pdxsa-hint"/.test(h), `${tag}: the full-width Share this bar is still there`);
      if (h.indexOf(M.evidence) >= 0) withEv++;
      if (h.indexOf('data-pdxlg-tally="1"') >= 0) ledger++;
    }
  }
  ok(sheets > 50, `${vocab}: only ${sheets} drawers rendered`);
  ok(ledger > 5, `${vocab}: only ${ledger} ledger drawers — the formal-record order is untested`);
  ok(withEv > 5, `${vocab}: only ${withEv} drawers carried evidence`);
  console.log(`   ${vocab}: ${sheets} drawers · ${ledger} with a vote table · ${withEv} with evidence`);
}

// ── 1b · the four pages load the drawer and its readers ─────────────────────
for (const [page, vocab] of [["index.html", "alignment-tool.js"], ["person.html", "issue-map.js"], ["issue.html", "issue-map.js"], ["ballot.html", "alignment-tool.js"]]) {
  const doc = R(page).replace(/<!--[\s\S]*?-->/g, "");
  for (const f of ["consistency.js", "related-issues.js", vocab]) {
    ok(new RegExp(`<script[^>]+src="/?${f.replace(/\./g, "\\.")}`).test(doc), `${page} does not load ${f}`);
  }
}

// ── 2 · a stance with a sources array renders one block per source ──────────
{
  const PID = "ryan_arbon", KEY = "housing_build";
  const win = boot({
    cards: (w) => {
      w.ISSUE_STANCE_DATA[PID].push({
        topic: "Fixture", pos: "support", issueKey: KEY, issueStance: "support", text: "Fixture stance text.",
        source: { label: "Single source", url: "https://example.org/single" },
        sources: [
          { label: "First source", url: "https://example.org/one", excerpt: "First excerpt behind the stance." },
          { label: "Second source", url: "https://example.org/two", summary: "Second summary behind the stance." },
          { label: "Not a link", url: "javascript:alert(1)", excerpt: "never printed" },
        ],
      });
    },
  });
  const CS = win.PDXConsistency;
  const s = CS.statedStance(PID, KEY);
  ok(s && s.side === "support" && s.source === "curated", "fixture: the sources card is not the stated stance");
  const h = CS.gapViewHtml(PID, KEY) || "";
  orderFaults(h, "sources fixture").forEach((f) => failures.push(f));
  const ev = (/<section class="pdxgap-ev"[\s\S]*?<\/section>/.exec(h) || [""])[0];
  ok(ev, "a stance with a sources array prints no evidence section");
  const items = [...ev.matchAll(/<li class="pdxgap-ev-item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  eq(items.length, 2, "one block per linked source");
  ok(/First excerpt behind the stance\.[\s\S]*href="https:\/\/example\.org\/one"[\s\S]*First source ↗/.test(items[0] || ""), "the first block lacks its excerpt then link");
  ok(/Second summary behind the stance\.[\s\S]*href="https:\/\/example\.org\/two"[\s\S]*Second source ↗/.test(items[1] || ""), "the second block lacks its summary then link");
  ok(!/javascript:|never printed|example\.org\/single/.test(ev), "a non-link source, or the superseded single source, was printed");
  ok(h.indexOf(M.evidence) > h.indexOf(M.signal) && h.indexOf(M.evidence) < h.indexOf(M.record), "evidence is not between connections and the formal record");
}

// ── 3 · a promoted Locker stance, and a Locker item behind a curated one ─────
{
  const win = boot({ locker: true });
  const CS = win.PDXConsistency, L = win.PDXProfileLocker;
  ok(L && typeof L.ingest === "function", "profile-locker.js did not load");
  const rs = CS.statedStance("lee", "lands_preserve");
  ok(!rs, "fixture: Lee already has a stance on Protect Public Lands");
  const kp = CS.statedStance("lee", "lands_keep_public");
  L.ingest({ items: { lee: [
    { headline: "Lee backs protecting wild places", issueKey: "lands_preserve",
      source: { label: "Locker source A", url: "https://example.org/locker-a" },
      pipeline: { position: "support", confidence: 0.92, excerpt: "We should protect these wild places for our grandchildren." } },
    { headline: "Lee on keeping lands public", issueKey: "lands_keep_public",
      source: { label: "Locker source B", url: "https://example.org/locker-b" },
      pipeline: { position: kp && kp.side, confidence: 0.95, excerpt: "A statement on the same side as the card." } },
    { headline: "Lee on the other side", issueKey: "lands_keep_public",
      source: { label: "Locker source C", url: "https://example.org/locker-c" },
      pipeline: { position: kp && kp.side === "support" ? "oppose" : "support", confidence: 0.95, excerpt: "Other side." } },
  ] } });
  const ps = CS.statedStance("lee", "lands_preserve");
  ok(ps && ps.source === "pipeline", "the Locker item did not promote a stance");
  const h = CS.gapViewHtml("lee", "lands_preserve") || "";
  orderFaults(h, "locker fixture").forEach((f) => failures.push(f));
  ok(/Pipeline-sourced/.test(hrowOf(h)), "the header row lost the Pipeline-sourced chip");
  const ev = (/<section class="pdxgap-ev"[\s\S]*?<\/section>/.exec(h) || [""])[0];
  ok(/data-pdxgap-ev="locker"[\s\S]*We should protect these wild places[\s\S]*href="https:\/\/example\.org\/locker-a"/.test(ev),
    "the promoted Locker stance does not render its item's excerpt and link");
  // Curated stance + a Locker item on the same side: the item backs it; the other side does not.
  const h2 = CS.gapViewHtml("lee", "lands_keep_public") || "";
  const ev2 = (/<section class="pdxgap-ev"[\s\S]*?<\/section>/.exec(h2) || [""])[0];
  ok(/example\.org\/locker-b/.test(ev2) && /A statement on the same side/.test(ev2), "a matching Locker item does not back the curated stance");
  ok(!/example\.org\/locker-c/.test(ev2), "a Locker item stating the other side was printed as evidence");
}

// ── 4 · no sources → no evidence section, and no placeholder ───────────────
{
  const win = boot();
  const CS = win.PDXConsistency;
  const s = CS.statedStance("lee", "lands_keep_public");
  ok(s && !s.url, "fixture: Lee's Keep Public Lands Public stance now carries a link; pick another");
  const h = CS.gapViewHtml("lee", "lands_keep_public") || "";
  ok(h.indexOf(M.evidence) < 0 && !/pdxgap-ev/.test(h), "a stance with no sources printed an evidence section");
  ok(!/>Evidence</.test(h), "an evidence heading or placeholder printed with nothing behind it");
  const h2 = CS.gapViewHtml("lee", "lands_preserve") || "";
  ok(!CS.statedStance("lee", "lands_preserve") && h2.indexOf(M.evidence) < 0, "a drawer with no stance printed evidence");
  ok(h2.indexOf(M.signal) < 0, "a drawer with no stance printed a stance signal");
}

// ── 5 · Where this conflicts keeps its place ───────────────────────────────
{
  const win = boot();
  const CS = win.PDXConsistency;
  const pm = win._polPositionMap("lee", win.CMP_DATA.lee) || {};
  const kp = pm.lands_keep_public && pm.lands_keep_public.stance;
  win.PDXStanceSides = { list: () => [{ key: "lands_keep_public", position: kp === "support" ? "oppose" : "support", priority: "medium" }] };
  const h = CS.gapViewHtml("lee", "lands_preserve") || "";
  const c0 = h.indexOf(M.conflicts), at = h.indexOf(M.related);
  ok(c0 > 0, "the conflicts section did not print when the rules are met");
  ok(at >= 0 && c0 > at, "the conflicts section is not after the related-issues lines");
  ok(c0 < h.indexOf(M.record) && c0 < h.indexOf('data-pdxlg-tally="1"'), "the conflicts section is not before the record");
  orderFaults(h, "conflicts").forEach((f) => failures.push(f));
}

// ── 6 · wiring and the shell ───────────────────────────────────────────────
{
  const cs = R("consistency.js"), sw = R("sw.js");
  ok(!/text: 'Share this' \}/.test(cs), "the full-width Share this bar is still in consistency.js");
  ok(/_rcShareHtml\(pid, issueKey, \{ block: true \}\)/.test(cs), "the 🏛️ column lost its own share");
  ok(/v540 - [\s\S]*?MIGRATION COST: none/.test(sw), "the shell's v540 note is missing or does not say no migration");
  ok(Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) >= 540, "the shell did not move for the drawer");
  ok(sw.includes("  '/consistency.js',\n"), "consistency.js is not precached");
}

if (failures.length) {
  console.error(`✗ ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures.slice(0, 60)) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ issue drawer tells a sourced story — ${passed} checks passed`);
