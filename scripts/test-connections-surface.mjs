#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-connections-surface.mjs — what an act also touches, under its effect
// line, and the way to the other bills on the same issue
// ─────────────────────────────────────────────────────────────────────────────
// A vote or executive row that prints an effect line now carries one more row
// under it — "Also on" and a chip for each OTHER issue that same act is stored
// on — and every issue drawer ends on one link to the legislation archive
// filtered to its issue. Both are read from mappings the row already carries;
// neither scores, counts or sums anything.
//
//   1. THREE ISSUES, TWO CHIPS: a row whose act is stored on three issues shows
//      exactly the other two, never the issue being read, each the existing
//      issue chip and a door to that issue's drawer for the same file.
//   2. ONE ISSUE, NO CHIPS: a row whose act is stored on one issue prints no
//      chip row at all; neither does a row with no effect line.
//   3. NO STALE CHIP: remove one of an act's mappings and its chip is gone from
//      every other drawer, while the act's other chips stay.
//   4. EXECUTIVE ROWS: a document's row shows the document's other stored keys,
//      doors into the same file's drawers.
//   5. NOTHING ELSE MOVED: with the new chip rows and the archive link taken
//      out, every drawer renders byte-identically to the same source with the
//      two helpers switched off, and every effect line, tally and scoring
//      summary is byte-identical too.
//   6. MUTATIONS: a chip for the issue being read, a chip for an unmapped issue,
//      a chip under a row with no effect line, and a chip that survives its
//      mapping must each fail.
//
//   node scripts/test-connections-surface.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "issue-colors.js", "consistency.js",
  "voting-record.js", "word-action.js", "profile-spine.js", "profiles-full.js",
];
const PRES = "trump";
const ACTIONS = JSON.parse(R("db/exec-action-seed.json")).actions;

let passed = 0;
const must = (c, m) => { if (c) { passed++; return; } console.error(`✗ connections surface: ${m}`); process.exit(2); };
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

const corpus = buildCorpus(ROOT);
const CONS = R("consistency.js");
// The same source with the two new surfaces switched off: the baseline every
// drawer must match once the new rows are taken out.
const OFF = CONS
  .replace("function _dosRelRowHtml(pid, issueKey, d, idx) {", "function _dosRelRowHtml(pid, issueKey, d, idx) { return '';")
  .replace("function _dosOtherBillsHtml(issueKey) {", "function _dosOtherBillsHtml(issueKey) { return '';");
must(OFF !== CONS && OFF.split("return '';").length > CONS.split("return '';").length + 1, "the two helpers to switch off are not in consistency.js");

function boot(src, records) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of records) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}
const presLeaves = [...new Set((ACTIONS[PRES] || []).flatMap((x) => (x.issues || []).map((m) => m.issueKey)))];
const leavesOf = (pid, records) => {
  if (pid === PRES) return presLeaves;
  const s = new Set();
  for (const it of records.get(pid) || []) for (const i of it.issues || []) if (i && i.issueKey) s.add(i.issueKey);
  return [...s];
};

// Every drawer: its html, and per row the act, its stored keys, the effect line
// and the chips under it.
function render(src, records, pids) {
  const win = boot(src, records);
  if (win.__err) return { err: win.__err };
  const CS = win.PDXConsistency;
  const out = new Map();
  for (const pid of pids) {
    if (!win.CMP_DATA[pid]) continue;
    for (const k of leavesOf(pid, records)) {
      let items = [], html = "", sum = "", tally = "";
      try { items = CS.dossierItems(pid, k) || []; } catch { continue; }
      if (!items.length) continue;
      try { html = CS.dossierLedgerHtml(pid, k) || ""; } catch { html = ""; }
      try { sum = CS.dossierSummaryHtml(pid, k) || ""; } catch { sum = ""; }
      try { tally = JSON.stringify(CS.dossierTally(pid, k) || null, (key, v) => (key === "d" ? undefined : v)); } catch { tally = ""; }
      const effs = new Map(), rels = new Map();
      for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) effs.set(Number(m[1]), dec(m[2]));
      for (const m of html.matchAll(/<tr class="pdxlg-relr" data-pdxlg-relr="(\d+)">([\s\S]*?)<\/tr>/g)) {
        rels.set(Number(m[1]), [...m[2].matchAll(/<a class="pdxlg-rel-c[^"]*" href="([^"]*)"[^>]*? data-pdxlg-rel-key="([^"]+)" data-pdxc-gap="([^"]+)" data-pdxc-gap-pid="([^"]+)"[^>]*>([^<]*)<\/a>/g)]
          .map((c) => ({ href: c[1].replace(/&amp;/g, "&"), key: c[2], gap: c[3], pid: c[4], label: dec(c[5]) })));
      }
      const rows = [];
      for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
        const i = Number(m[1]), d = items[i], it = (d && d.item) || {};
        if (!d) continue;
        rows.push({
          i, exec: d.lane === "exec", act: d.lane === "exec" ? String(it.documentId || "") : `${it.number}|${it.congress}`,
          keys: [...new Set((it.issues || []).map((x) => x && x.issueKey).filter(Boolean))],
          eff: effs.get(i) || "", rel: rels.get(i) || null,
        });
      }
      const other = [...html.matchAll(/<p class="pdxlg-other" data-pdxlg-other="1"><a class="pdxlg-other-a" href="([^"]*)">([^<]*)<\/a><\/p>/g)];
      out.set(`${pid}|${k}`, { pid, k, html, sum, tally, rows, rels, other, label: (kk) => win.ISSUE_MAP && win.ISSUE_MAP[kk] && win.ISSUE_MAP[kk].label });
    }
  }
  return { out, win };
}
const stripNew = (h) => h
  .replace(/<tr class="pdxlg-relr" data-pdxlg-relr="\d+">[\s\S]*?<\/tr>/g, "")
  .replace(/<p class="pdxlg-other" data-pdxlg-other="1">[\s\S]*?<\/p>/g, "");

// The checks, as a list of what is wrong — so a mutation can be shown to fail them.
function problems(view) {
  const bad = [];
  for (const [dk, v] of view.out) {
    const known = (kk) => { const lb = v.label(kk); return !!lb && lb !== kk; };
    for (const r of v.rows) {
      const want = r.keys.filter((kk) => kk !== v.k && /^[A-Za-z0-9_]+$/.test(kk) && known(kk));
      if (!r.eff) { if (r.rel) bad.push(`${dk}: ${r.act} has no effect line but prints a chip row`); continue; }
      if (!want.length) { if (r.rel) bad.push(`${dk}: ${r.act} is stored on no other issue but prints a chip row`); continue; }
      if (!r.rel) { bad.push(`${dk}: ${r.act} is stored on ${want.join(", ")} and prints no chip row`); continue; }
      const got = r.rel.map((c) => c.key);
      if (got.includes(v.k)) bad.push(`${dk}: ${r.act} shows a chip for the issue being read`);
      for (const kk of got) if (!r.keys.includes(kk)) bad.push(`${dk}: ${r.act} shows a chip for ${kk}, which the act is not stored on`);
      if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${dk}: ${r.act} shows ${JSON.stringify(got)}, stored ${JSON.stringify(want)}`);
      for (const c of r.rel) {
        if (c.gap !== c.key || c.pid !== v.pid) bad.push(`${dk}: ${r.act}'s ${c.key} chip opens another file or issue`);
        if (c.href !== `/p/${encodeURIComponent(v.pid)}?issue=${c.key}`) bad.push(`${dk}: ${r.act}'s ${c.key} chip addresses ${c.href}`);
        if (!c.label || /\d+\s*%|\bscore/i.test(c.label)) bad.push(`${dk}: ${r.act}'s ${c.key} chip carries ${JSON.stringify(c.label)}`);
      }
    }
    for (const i of v.rels.keys()) if (!v.rows.some((r) => r.i === i)) bad.push(`${dk}: a chip row with no act row`);
    if (v.other.length !== 1) bad.push(`${dk}: ${v.other.length} archive links, not one`);
    else if (v.other[0][1].replace(/&amp;/g, "&") !== `/library?mode=legislation&issue=${encodeURIComponent(v.k)}`) bad.push(`${dk}: the archive link goes to ${v.other[0][1]}`);
  }
  return bad;
}

const PIDS = [PRES, ...corpus.byMember.keys()];
const now = render(CONS, corpus.byMember, PIDS);
must(!now.err, `boot: ${now.err}`);
const off = render(OFF, corpus.byMember, PIDS);
must(!off.err, `boot with the helpers off: ${off.err}`);

// ── 1–4 · the rows, everywhere ──────────────────────────────────────────────
console.log("  · 1–4 · every chip row on every drawer");
const bad = problems(now);
for (const b of bad.slice(0, 20)) console.error("  ✗ " + b);
must(!bad.length, `${bad.length} drawer row(s) wrong`);
const allRows = [...now.out.values()].flatMap((v) => v.rows.map((r) => ({ v, r })));
const three = allRows.find(({ v, r }) => !r.exec && r.eff && r.keys.length === 3 && r.keys.every((kk) => v.label(kk) && v.label(kk) !== kk));
must(!!three, "no vote row with an effect line stored on exactly three labelled issues");
must(three.r.rel && three.r.rel.length === 2 && !three.r.rel.some((c) => c.key === three.v.k) &&
  three.r.rel.every((c) => three.r.keys.includes(c.key)), `${three.r.act} on ${three.v.k}: three issues stored, two chips, none for the issue read`);
const one = allRows.find(({ r }) => !r.exec && r.eff && r.keys.length === 1);
must(!!one, "no vote row with an effect line stored on one issue");
must(!one.r.rel && !one.v.html.includes(`data-pdxlg-relr="${one.r.i}"`), `${one.r.act}: one issue stored, no chip row`);
const ex = allRows.find(({ r }) => r.exec && r.eff && r.keys.length >= 2);
must(!!ex && ex.v.pid === PRES && !!ex.r.rel && ex.r.rel.every((c) => c.pid === PRES && ex.r.keys.includes(c.key)),
  "an executive row with an effect line shows its document's other stored keys, doors into the President's drawers");
const noEff = allRows.filter(({ r }) => !r.eff);
must(noEff.length > 0 && noEff.every(({ r }) => !r.rel), "no row without an effect line prints a chip row");
console.log(`    ${allRows.filter(({ r }) => r.rel).length} chip rows on ${now.out.size} drawers · ${three.r.act} on ${three.v.k} shows ${three.r.rel.map((c) => c.key).join(" and ")}`);

// ── 3 · remove a mapping, and its chip goes ─────────────────────────────────
console.log("  · 3 · a removed mapping takes its chip with it");
const [gone] = three.r.keys.filter((kk) => kk !== three.v.k);
const [kept] = three.r.keys.filter((kk) => kk !== three.v.k && kk !== gone);
const [nm, nc] = three.r.act.split("|");
const cut = new Map([...corpus.byMember].map(([pid, recs]) => [pid, recs.map((it) =>
  (it.number === nm && String(it.congress) === nc) ? { ...it, issues: it.issues.filter((x) => x.issueKey !== gone) } : it)]));
const holders = [...cut].filter(([, recs]) => recs.some((it) => it.number === nm && String(it.congress) === nc)).map(([p]) => p);
const after = render(CONS, cut, holders);
must(!after.err, `boot after the cut: ${after.err}`);
let seen = 0;
for (const [dk, v] of after.out) for (const r of v.rows) {
  if (r.act !== three.r.act || !r.rel) continue;
  seen++;
  must(!r.rel.some((c) => c.key === gone), `${dk}: ${r.act} still shows ${gone} after the mapping was removed`);
}
must(seen > 0, `${three.r.act} prints no chip row on any holder's drawer after the cut`);
for (const p of holders) must(!after.out.has(`${p}|${gone}`) || !after.out.get(`${p}|${gone}`).rows.some((r) => r.act === three.r.act),
  `${p}: ${three.r.act} still sits on ${gone}'s drawer after its mapping was removed`);
const keptRow = [...after.out.values()].flatMap((v) => v.k === three.v.k ? v.rows : []).find((r) => r.act === three.r.act);
must(!keptRow || (keptRow.rel && keptRow.rel.some((c) => c.key === kept)), `${three.r.act}: the ${kept} chip went with the ${gone} mapping`);
must(!problems(after).length, "the drawers after the cut break a chip rule");

// ── 5 · nothing else moved ──────────────────────────────────────────────────
console.log("  · 5 · every drawer is the same drawer, less its new rows");
must(now.out.size === off.out.size, `${now.out.size} drawers render, ${off.out.size} with the helpers off`);
let moved = 0;
for (const [dk, v] of off.out) {
  const c = now.out.get(dk);
  if (!c || stripNew(c.html) !== v.html || c.sum !== v.sum || c.tally !== v.tally) { moved++; if (moved <= 5) console.error(`  ✗ ${dk}: moved beyond the new rows`); }
  else passed++;
  for (const r of v.rows) {
    const cr = c && c.rows.find((x) => x.i === r.i);
    if (!cr || cr.eff !== r.eff) { moved++; if (moved <= 5) console.error(`  ✗ ${dk}: row ${r.i}'s effect line moved`); }
  }
}
must(moved === 0, `${moved} drawer(s) or effect line(s) moved`);

// ── 6 · mutations ───────────────────────────────────────────────────────────
console.log("  · 6 · mutations");
const MUT = [
  { name: "a chip for the issue being read",
    edit: (s) => s.replace("if (!k || k === issueKey || seen[k] || !_DOS_REL_KEY.test(k)) continue;", "if (!k || seen[k] || !_DOS_REL_KEY.test(k)) continue;"),
    expect: /issue being read/ },
  { name: "a chip for an issue the act is not stored on",
    edit: (s) => s.replace("    return out;\n  }\n  function _dosRelHref", "    if (out.length && issueKey !== 'veterans') out.push('veterans');\n    return out;\n  }\n  function _dosRelHref"),
    expect: /not stored on|shows \[/ },
  { name: "a chip row under a row with no effect line",
    edit: (s) => s.replace("        } else if (d.ptrLine) {\n          // Not this leaf's line", "        } else if (d.ptrLine || true) {\n          out += _dosRelRowHtml(pid, issueKey, d, p.i);\n          if (!d.ptrLine) {} else\n          // Not this leaf's line"),
    expect: /no effect line but prints a chip row/ },
  { name: "a chip that survives its mapping",
    edit: (s) => s.replace("    var list = (d && d.item && d.item.issues) || [], seen = {}, out = [];",
      `    var list = ((d && d.item && d.item.issues) || []).concat([{ issueKey: ${JSON.stringify(gone)} }]), seen = {}, out = [];`),
    expect: /not stored on|shows \[|still shows/ },
];
for (const m of MUT) {
  const src = m.edit(CONS);
  must(src !== CONS, `mutation "${m.name}": anchor not found`);
  const res = render(src, cut, holders);
  const faults = res.err ? [res.err] : problems(res.out ? res : { out: new Map() });
  if (!res.err && m.name === "a chip that survives its mapping") {
    for (const [dk, v] of res.out) for (const r of v.rows) if (r.act === three.r.act && r.rel && r.rel.some((c) => c.key === gone)) faults.push(`${dk}: still shows ${gone}`);
  }
  const caught = faults.some((f) => m.expect.test(f));
  console.log(`    mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  must(caught, `mutation "${m.name}" survived`);
}

console.log(`✓ connections surface: all ${passed} assertions passed, ${MUT.length} mutations caught`);
