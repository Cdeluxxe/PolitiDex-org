#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-stance-coverage.mjs — stated stance or voting pattern, on every issue
// ─────────────────────────────────────────────────────────────────────────────
// PDXConsistency.stanceCoverage(pid, key) says which of three things PolitiDex
// holds on an issue, and every surface prints it:
//   stated  — a curated or pipeline stance (statedStance);
//             chip "Stated: …",          line "Stated stance on file"
//   pattern — the record baseline, with no stated stance;
//             chip "Voting pattern: …",  line "No stated stance · voting pattern used"
//   none    — no chip,                   line "No stance on file"
// Checked on the drawer header, the Key Issue Stances rows and every Word vs
// Action index row (all five buckets, including Not enough on file and Record
// only). A voting pattern is never worded "Stated" and is never in the scored
// set; every scored row is a stated one.
//
//   node scripts/test-stance-coverage.mjs
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

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "issue-map.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
  "related-issues.js", "share-anywhere.js",
];
const corpus = buildCorpus(ROOT);
const win = makeSandbox();
const ctx = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) {
  try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { failures.push(`boot ${f}: ${e.message}`); }
}
win.PROFILES = win.CMP_DATA;
for (const [pid, recs] of corpus.byMember) {
  try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ }
}
const CS = win.PDXConsistency, WA = win.PDXWordAction;
const LINE = {
  stated: "Stated stance on file",
  pattern: "No stated stance · voting pattern used",
  none: "No stance on file",
};
const LEAD = { stated: "Stated:", pattern: "Voting pattern:" };
const SIDES = /^(Supports|Opposes|Mixed)$/;
const SCORED = ["contradicts", "mixed", "consistent"];
const text = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const hrowOf = (h) => { const i = h.indexOf('data-pdxgap-sec="header"'); const j = h.indexOf('<div class="pdxgap-id">', i); return i >= 0 ? h.slice(i, j > i ? j : undefined) : ""; };

const SAMPLE = ["massie", "lee", "warren", "trump", "schiff", "cruz", "sanders", "romney"];
const seen = { stated: 0, pattern: 0, none: 0 };
let wvaRows = 0, inUnscored = 0;
for (const pid of SAMPLE) {
  if (!win.CMP_DATA[pid]) continue;
  const b = WA.outcomeBuckets(pid);
  const filed = {};
  for (const t of Object.keys(b.buckets || {})) for (const r of b.buckets[t] || []) filed[r.key] = t;
  // The Word vs Action index, rendered whole: every row carries its line.
  const idx = String(WA.sectionHtml(pid, win.CMP_DATA[pid]) || "");
  for (const r of CS.issueRows(pid) || []) {
    const tag = `${pid} × ${r.key}`;
    const c = CS.stanceCoverage(pid, r.key);
    ok(LINE[c.kind] === c.label, `${tag}: unknown coverage ${JSON.stringify(c)}`);
    seen[c.kind]++;
    const s = CS.statedStance(pid, r.key);
    if (c.kind === "stated") {
      ok(!!s, `${tag}: "stated" with no stated stance in the store`);
      ok(c.chip === `Stated: ${c.sideLabel}` && SIDES.test(c.sideLabel), `${tag}: stated chip reads ${c.chip}`);
    } else if (c.kind === "pattern") {
      ok(c.chip === `Voting pattern: ${c.sideLabel}` && SIDES.test(c.sideLabel), `${tag}: pattern chip reads ${c.chip}`);
      ok(!s, `${tag}: a stated (curated or pipeline) stance is labelled a voting pattern`);
      const bl = win._polBaselineStance(pid, r.key, win.CMP_DATA[pid]);
      ok(bl && bl.basis === "record" && bl.stance === c.side, `${tag}: pattern side is not the record baseline's`);
    } else {
      ok(!c.chip && !s && !win._polBaselineStance(pid, r.key, win.CMP_DATA[pid]), `${tag}: "none" while a stance or pattern is on file`);
    }
    // Scoring: a voting pattern is never scored as Word vs Action.
    if (SCORED.includes(filed[r.key])) ok(c.kind === "stated", `${tag}: filed under ${filed[r.key]} with coverage ${c.kind}`);
    if (c.kind !== "stated" && filed[r.key]) inUnscored++;

    // Drawer header.
    const h = CS.gapViewHtml(pid, r.key) || "";
    if (h) {
      const row = hrowOf(h), t = text(row);
      ok(row.includes(`data-pdx-cov="${c.kind}"`) && t.includes(c.label), `${tag}: drawer header lacks "${c.label}"`);
      if (c.kind === "stated") ok(/Stated: (Supports|Opposes|Mixed)/.test(t), `${tag}: drawer header lacks "Stated: …"`);
      if (c.kind === "pattern") {
        ok(t.includes(c.chip), `${tag}: drawer header lacks "${c.chip}"`);
        ok(!/Stated:/.test(t), `${tag}: drawer header says "Stated:" on a voting pattern`);
      }
      if (c.kind === "none") ok(!/Stated:|Voting pattern:/.test(t), `${tag}: drawer header prints a position with none on file`);
    }
    // Word vs Action index row, in whatever bucket it is filed.
    if (filed[r.key]) {
      const id = `id="pdxwa-oc-`;
      const at = idx.indexOf(`data-pdxwa-issue="${r.key}"`);
      if (at >= 0) {
        wvaRows++;
        const li = idx.slice(at, idx.indexOf("</li>", at));
        ok(li.includes(`data-pdx-cov="${c.kind}"`) && text(li).includes(c.label), `${tag}: Word vs Action row lacks "${c.label}" (${filed[r.key]})`);
        if (c.kind === "pattern") ok(!/Stated:/.test(text(li)) && text(li).includes(c.chip), `${tag}: Word vs Action row does not read "${c.chip}"`);
        if (c.kind === "stated") ok(text(li).includes(c.chip), `${tag}: Word vs Action row does not read "${c.chip}"`);
        void id;
      }
    }
  }
}
ok(seen.stated > 30 && seen.pattern > 30 && seen.none > 10, `too few of each state: ${JSON.stringify(seen)}`);
ok(inUnscored > 30, `only ${inUnscored} non-stated rows in Not enough on file / Record only`);

console.log(`   ${JSON.stringify(seen)} · ${wvaRows} Word vs Action rows · ${inUnscored} unscored rows labelled`);
if (failures.length) {
  console.log(`✗ stance coverage: ${failures.length} failure(s), ${passed} passed`);
  failures.slice(0, 30).forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log(`✓ stance coverage: ${passed} checks passed`);
