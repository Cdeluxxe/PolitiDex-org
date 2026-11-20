#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-positions-chip-stated.mjs — the 🎯 Positions chip counts every stated
// position, and Word vs Action says how many are waiting on a formal record
// ─────────────────────────────────────────────────────────────────────────────
//   1. On a profile with curated AND pipeline stances, the Positions chip value
//      equals the number of rows in "✒️ Stated positions on file".
//   2. Pipeline stances raise the chip; the curated-only chip was smaller.
//   3. Word vs Action still only tests issues on the formal record index: no
//      tested issue is outside it, and the scored set is unchanged by the line.
//   4. The section prints "N of M stated positions … waiting on a formal record"
//      where N counts stated rows whose issue has no formal record.
//   5. Sweep: chip == list rows on every profile with a stated list.
//   6. MUTATIONS: the chip back on tagged key issues, the line dropped, and the
//      line counting formal-record issues must each fail.
//
//   node scripts/test-positions-chip-stated.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];
const PID = "schumer";
const corpus = buildCorpus(ROOT);

function boot(over = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(over[f] || R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}
const card = (k, side) => ({ topic: "Pipeline " + k, icon: "", pos: side, issueKey: k, issueStance: side,
  text: "“I will vote to change " + k.replace(/_/g, " ") + " policy.”", source: { label: "Source: campaign page", url: "https://pipe.example/" + k },
  provenance: "pipeline", pipeline: { strength: "strong", confidence: 0.9, strong: 1, weak: 0, items: 1 } });
const listRows = (h) => (String(h).match(/<li class="pdxwa-stated-row"/g) || []).length;
const chipNum = (c) => { const m = /^(\d+)\b/.exec((c && c.value) || ""); return m ? Number(m[1]) : null; };

function check(over = {}, sweep = true) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const W = boot(over);
  if (W.__err) return { faults: [`boot: ${W.__err}`], pass };
  const WA = W.PDXWordAction, CS = W.PDXConsistency;
  const chip0 = (W._pdxNavChips(PID, W.CMP_DATA[PID]) || {}).positions;
  const curatedN = listRows(WA.statedListHtml(PID));

  // Pipeline cards on gap issues: two with no curated card.
  const PM0 = W._polPositionMap(PID, W.CMP_DATA[PID]);
  const NO_POLE = W._PDX_RD_NO_POLE || {};
  const keys = Object.keys(W.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k) && !NO_POLE[k] && !PM0[k]);
  const FK = (CS.formalPatternIndex && CS.formalPatternIndex.rows(PID) || []).reduce((o, r) => (o[r.key] = 1, o), {});
  const gapNoRec = keys.find((k) => !FK[k]);
  const gapRec = keys.find((k) => FK[k]);
  ok(gapNoRec, "fixture: a gap issue with no formal record");
  W.PDXPipelineStances.ingest({ count: 2, cards: { [PID]: [card(gapNoRec, "support"), gapRec && card(gapRec, "oppose")].filter(Boolean) } });

  const list = WA.statedListHtml(PID);
  const rows = listRows(list);
  const pipeRows = (list.match(/data-pdx-stance-signal="pipeline"/g) || []).length;
  ok(pipeRows >= 1 && rows > pipeRows, `fixture: list holds curated and pipeline rows (${rows} rows, ${pipeRows} pipeline)`);
  const chip = (W._pdxNavChips(PID, W.CMP_DATA[PID]) || {}).positions;
  // 1 · chip equals the list
  ok(chipNum(chip) === rows, `Positions chip reads "${chip && chip.value}" but the list has ${rows} rows`);
  ok(WA.statedCount(PID) === rows, `statedCount ${WA.statedCount(PID)} ≠ ${rows} rows`);
  // 2 · pipeline rows raise it
  ok(rows > curatedN && chipNum(chip0) === curatedN, `chip before pipeline (${chip0 && chip0.value}) / after (${chip && chip.value}) / curated rows ${curatedN}`);

  // 3 · Word vs Action only tests formal-record issues
  let tested = [];
  try { tested = (WA.read(PID, W.CMP_DATA[PID]).items || []).filter((it) => it.test && it.test.state === "tested"); } catch { tested = []; }
  ok(tested.length > 0, "fixture: Word vs Action tested at least one issue");
  for (const it of tested) {
    if (it.issueKey) ok(FK[it.issueKey], `Word vs Action tested ${it.issueKey}, which has no formal record`);
  }
  ok(!tested.some((it) => it.issueKey === gapNoRec), "the waiting pipeline stance was tested");

  // 4 · the waiting line
  const pd = WA.statedPending(PID);
  const listedKeys = [...list.matchAll(/data-pdxwa-stated="([^"]+)"/g)].map((m) => m[1]);
  const want = listedKeys.filter((k) => !FK[k]).length;
  ok(pd && pd.stated === rows && pd.waiting === want, `statedPending ${JSON.stringify(pd && { s: pd.stated, w: pd.waiting })}, want ${rows}/${want}`);
  ok(pd && pd.keys.includes(gapNoRec) && !pd.keys.includes(gapRec), "the waiting set holds the no-record issue and not the recorded one");
  const sec = WA.sectionHtml(PID, W.CMP_DATA[PID]) || "";
  const lm = /data-pdxwa-pending="(\d+)"[^>]*>([^<]*)</.exec(sec);
  ok(lm && Number(lm[1]) === want, `the section's waiting line is ${lm ? lm[1] : "missing"}, want ${want}`);
  ok(lm && new RegExp(`^⏳ ${want} of ${rows} stated positions? (?:is|are) waiting on a formal record`).test(lm[2]), `waiting line wording: "${lm && lm[2]}"`);

  // 5 · sweep
  if (sweep) {
    let n = 0;
    for (const pid of Object.keys(W.CMP_DATA)) {
      const r = listRows(WA.statedListHtml(pid));
      if (!r) continue;
      n++;
      const c = (W._pdxNavChips(pid, W.CMP_DATA[pid]) || {}).positions;
      ok(chipNum(c) === r, `${pid}: chip "${c && c.value}" vs ${r} rows`);
      if (n > 400) break;
    }
  }
  return { faults, pass };
}

const live = check();
const WAJS = R("word-action.js"), PFJS = R("profiles-full.js");
const MUTANTS = [
  { name: "chip back on tagged key issues", f: "profiles-full.js",
    edit: (s) => s.replace("if (stN >= 0 && (stN || sig)) {", "if (false) {"), expect: /Positions chip reads/ },
  { name: "waiting line dropped", f: "word-action.js",
    edit: (s) => s.replace("      pendingLineHtml(pid, rows) +\n", ""), expect: /waiting line is missing/ },
  { name: "waiting line counts formal-record issues", f: "word-action.js",
    edit: (s) => s.replace("if (!keys[rows[i].key]) waiting.push", "if (keys[rows[i].key]) waiting.push"), expect: /statedPending|waiting set/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const base = m.f === "word-action.js" ? WAJS : PFJS;
  const src = m.edit(base);
  if (src === base) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check({ [m.f]: src }, false);
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}
const faults = [...live.faults, ...mutFaults];
for (const f of faults.slice(0, 40)) console.log("  ✗ " + f);
if (faults.length) { console.log(`✗ positions chip stated: ${faults.length} failure(s), ${live.pass} passed`); process.exit(1); }
console.log(`✓ positions chip stated: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
