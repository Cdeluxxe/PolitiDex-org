#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// DCPD STANDING — letters and memoranda published only in the Daily Compilation
// ─────────────────────────────────────────────────────────────────────────────
// NSPM-2 (DCPD-202500223) and the June 23, 2025 War Powers letter (DCPD-202500715)
// sat on Trump's Iran drawer with GovInfo links and effect lines, then fell out of
// the act count as "not scorable" because no standing basis reached a document
// that is never printed in the Federal Register. `published_dcpd` is that basis:
// it records that the document was officially published, nothing more.
//
//   1. Trump × Iran carries four ledger rows; NSPM-2 and the letter are acts, not
//      held, and each links the GovInfo package it stores.
//   2. The Iran eyebrow still reads "No side published on this subject".
//   3. Executive Order 14382 keeps its Federal Register standing.
//   4. The basis is gated: a row without a DCPD URL, a status citing a non-DCPD
//      URL, or an FR-cited row cannot claim it — each stays "not scorable".
//
//   node scripts/test-exec-dcpd-standing.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Same load order as test-issue-ledger.mjs.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];

const corpus = buildCorpus(ROOT);

// `mutate` runs on window.EXEC_ACTIONS right after the data file loads and before
// anything reads it.
function boot(mutate) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    vm.runInContext(R(f), ctx, { filename: f });
    if (f === "exec-action-data.js" && mutate) mutate(win.EXEC_ACTIONS);
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}

const text = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const tables = (h) => (String(h).match(/<table[\s\S]*?<\/table>/g) || []).join("");
const rowOf = (h, n) => {
  const re = /<tr data-pdxlg-row="(\d+)">([\s\S]*?)<\/tr>/g;
  for (const m of tables(h).matchAll(re)) {
    const cells = m[2].match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
    if (text(cells[1] || "").startsWith(n)) return cells[1] || "";
  }
  return null;
};

const NSPM2 = "NSPM-2";
const LETTER = "Presidential Letter, DCPD-202500715";
const URLS = {
  [NSPM2]: "https://www.govinfo.gov/content/pkg/DCPD-202500223/html/DCPD-202500223.htm",
  [LETTER]: "https://www.govinfo.gov/content/pkg/DCPD-202500715/html/DCPD-202500715.htm",
};
const NO_SIDE = "No side published on this subject";
const find = (acts, id) => (acts.trump || []).find((a) => a.documentId === id);

// Every check returns faults so the mutation pass can run the same code and demand
// that the right one fires.
function check(win) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const CS = win.PDXConsistency, EX = win.PDXExecRecord;
  const h = CS.gapViewHtml("trump", "iran_policy") || "";
  ok(h.length > 1000, "trump × iran_policy rendered nothing");
  const all = text(h);

  // 1 · four acts, the two DCPD rows among them, each on its GovInfo door
  const n = (tables(h).match(/data-pdxlg-row="/g) || []).length;
  ok(n === 4, `trump × iran_policy: ${n} ledger rows, want 4`);
  for (const id of [NSPM2, LETTER]) {
    const cell = rowOf(h, id);
    ok(!!cell, `${id}: not a ledger row on trump × iran_policy`);
    if (cell) ok(cell.includes(`href="${URLS[id]}"`), `${id}: the row does not link its stored GovInfo URL`);
    const a = find(win.EXEC_ACTIONS, id);
    ok(a && a.sourceUrl === URLS[id], `${id}: the stored source URL changed`);
    ok(a && EX.standingOf(a) === "published_dcpd", `${id}: standing is ${a && EX.standingOf(a)}, want published_dcpd`);
  }
  ok(!/not scorable/i.test(all), `trump × iran_policy: the drawer still says "not scorable"`);
  const t = CS.dossierTally("trump", "iran_policy");
  ok(t && t.acts === 4, `trump × iran_policy: tally counts ${t && t.acts} acts, want 4`);
  // The roll-up prints whatever the exec direction helper returns; it is read back
  // from the tally rather than pinned, so no one hand-writes a 3–1.
  // The sheet has one list (v325), and Iran is a subject with no for/against line,
  // so the drawer states the act count; any split it does print must be the tally's.
  if (t) {
    ok(all.includes(`${t.acts} formal acts`), `trump × iran_policy: the drawer does not state the ${t.acts} acts`);
    const m = /(\d+) advancing · (\d+) opposing/.exec(all);
    ok(!m || (Number(m[1]) === t.advances && Number(m[2]) === t.opposes),
      `trump × iran_policy: roll-up does not match the tally (${t.advances}–${t.opposes})`);
  }

  // 2 · the eyebrow still reads no side
  const r = CS.issueRow("trump", "iran_policy");
  const f = CS.dossierFinding(r, t);
  ok(f.word === NO_SIDE, `trump × iran_policy: eyebrow is ${JSON.stringify(f.word)}`);
  ok(!/Acts: \d+ for/.test(all), "trump × iran_policy: a for/against line reached the Iran drawer");

  // 3 · EO 14382 keeps its Federal Register standing
  const eo = find(win.EXEC_ACTIONS, "Executive Order 14382");
  ok(eo && EX.standingOf(eo) === "in_force", `Executive Order 14382: standing is ${eo && EX.standingOf(eo)}, want in_force`);
  ok(eo && eo.frCitation && /federalregister\.gov/.test(eo.sourceUrl), "Executive Order 14382 lost its Federal Register citation");
  const eoCell = rowOf(h, "Executive Order 14382");
  ok(!!eoCell && eoCell.includes('href="https://www.federalregister.gov/'), "Executive Order 14382 is not on its Federal Register door");

  // 4 · only the DCPD pair claim the basis anywhere in the archive
  for (const [pid, acts] of Object.entries(win.EXEC_ACTIONS)) {
    for (const a of acts) {
      if (EX.standingOf(a) !== "published_dcpd") continue;
      ok(a.documentId === NSPM2 || a.documentId === LETTER, `${pid} · ${a.documentId}: claims published_dcpd`);
    }
  }
  return { faults, pass };
}

const live = check(boot());

// ── Mutations: each must leave NSPM-2 held and the drawer "not scorable" ─────
const MUTANTS = [
  { name: "no DCPD URL and empty status",
    mutate: (A) => { const a = find(A, NSPM2); a.status = []; a.sourceUrl = "https://www.whitehouse.gov/presidential-actions/2025/02/nspm-2/"; } },
  { name: "published_dcpd citing a non-DCPD URL",
    mutate: (A) => { const a = find(A, NSPM2); a.status[0].sourceUrl = "https://www.whitehouse.gov/presidential-actions/2025/02/nspm-2/"; } },
  { name: "published_dcpd on a row that carries an FR citation",
    mutate: (A) => { const a = find(A, NSPM2); a.frCitation = "90 FR 1"; } },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const win = boot(m.mutate);
  const a = find(win.EXEC_ACTIONS, NSPM2);
  const res = check(win);
  const held = win.PDXExecRecord.standingOf(a) === null
    && res.faults.some((x) => /not scorable/.test(x))
    && res.faults.some((x) => /NSPM-2: not a ledger row/.test(x));
  console.log(`   mutation: ${m.name} → ${held ? "caught (NSPM-2 not scorable)" : "NOT CAUGHT"}`);
  if (!held) mutFaults.push(`mutation "${m.name}" survived: ${res.faults.slice(0, 3).join(" | ")}`);
}

const fails = live.faults.concat(mutFaults);
if (fails.length) {
  for (const f of fails) console.error("  ✗ " + f);
  console.error(`\n✗ exec DCPD standing: ${fails.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ exec DCPD standing: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
