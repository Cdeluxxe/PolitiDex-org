#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-venezuela-leaf.mjs — 🇻🇪 Venezuela, on the Iran, Ukraine and Yemen contract
// ─────────────────────────────────────────────────────────────────────────────
// One country leaf under Foreign Policy & National Security: a subject key with
// no pole, holding only the acts whose own subject is Venezuela, filed beside
// each act's existing rows. db/vr-venezuela-leaf.json records the four acts and
// the one effect line each carries. The fence:
//
//   1. ONE KEY. Declared once and identically in both ISSUE_MAP copies, under the
//      Foreign Policy core, in the generated allow-list (125 keys) and core map,
//      in the stored table, the scope notes and the sitemap; no key replaced.
//   2. NO POLE. In _RD_NO_POLE and _DOS_LEDGER_NO_SIDE; every Venezuela drawer
//      says "No side published on this subject", prints no for/against line and
//      no percentage, and its record read claims no side.
//   3. ONLY VENEZUELA'S ACTS, as secondary rows: S.J.Res. 90 and 98, Executive
//      Orders 14245 and 14373 — and not S.J.Res. 83, which names no theatre.
//   4. EFFECT LINES. Each mapped pair prints one line: one sentence, 140 or
//      fewer, the act as subject, no method word, naming Venezuela, from that
//      pair's own stored text, and no sibling leaf's line.
//   5. FIND-A-TOPIC. "venezuela" lists the leaf on a file with a mapped act, and
//      on a file without one prints the miss line, Diplomacy & Restraint or Peace
//      Through Strength on it notwithstanding. MUTATION: the alias put back on
//      either of those leaves paints Venezuela on that empty file, and is caught.
//   6. NOTHING ELSE MOVED. With the Venezuela mappings taken out of the records,
//      every drawer that is not a Venezuela drawer renders byte-identically
//      once the Venezuela chips are set aside, its tally and scoring summary are
//      byte-identical, and every Direction Match read is byte-identical.
//
//   node scripts/test-venezuela-leaf.mjs

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
  "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "stance-tree.js",
];
const VE = "venezuela_policy";
const MIG = "netlify/database/migrations/20261116000000_vr_venezuela_policy_issue_key.sql";
const LEDGER = JSON.parse(R("db/vr-venezuela-leaf.json"));
const METHOD = /\b(?:precedent|mirror|discriminator|primary|secondary|on-axis|off-axis|vocabulary|coded|coding|chip|mapped|mapping|filed|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|leaf|support_meaning|yea_supports)\b|PolitiDex|…|\.\.\./i;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const must = (c, m) => { if (c) { passed++; return; } console.error(`✗ venezuela leaf: ${m}`); process.exit(2); };
const section = (t) => console.log(`  · ${t}`);
const norm = (x) => String(x == null ? "" : x).replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const text = (h) => String(h).replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

const corpus = buildCorpus(ROOT);
// The records with every Venezuela mapping taken out: the vote rows lose the
// key, and so do the President's documents in the client mirror.
const noVe = new Map([...corpus.byMember].map(([pid, recs]) => [pid,
  recs.map((it) => ((it.issues || []).some((i) => i.issueKey === VE) ? { ...it, issues: it.issues.filter((i) => i.issueKey !== VE) } : it))]));
function boot(patch, { without = false } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = R(f);
    if (patch && patch[f]) src = patch[f](src);
    vm.runInContext(src, ctx, { filename: f });
    if (without && f === "exec-action-data.js") {
      for (const list of Object.values(win.EXEC_ACTIONS || {})) {
        for (const a of Array.isArray(list) ? list : []) if (Array.isArray(a.issues)) a.issues = a.issues.filter((i) => i.issueKey !== VE);
      }
    }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of (without ? noVe : corpus.byMember)) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}
const win = boot();
const T = win.PDXStanceTree, CS = win.PDXConsistency;
must(!!T && typeof T.find === "function", "PDXStanceTree.find is not published");
must(!!CS && typeof CS.dossierItems === "function", "PDXConsistency.dossierItems is not published");
const leafCount = (html) => (String(html).match(/class="pdxtree-leaf/g) || []).length;
const keysOf = (d) => ((d && d.item && d.item.issues) || []).map((x) => x.issueKey);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · vocab, cores and key count");
// ═════════════════════════════════════════════════════════════════════════════
{
  const keys = JSON.parse(R("db/issue-keys.json"));
  eq(keys.count, 125, "db/issue-keys.json counts 125 keys");
  eq(keys.keys.length, 125, "db/issue-keys.json lists 125 keys");
  eq(keys.keys.filter((x) => x === VE).length, 1, "db/issue-keys.json carries venezuela_policy once");
  for (const k of ["iran_policy", "ukraine_policy", "yemen_policy", "restraint", "strong_defense", "war_powers", "tariffs_authority", "america_first_fp"]) {
    ok(keys.keys.includes(k) && !!win.ISSUE_MAP[k], `${k} is still a shipped leaf`);
  }
  const cores = JSON.parse(R("db/issue-core-categories.json"));
  eq(cores.count, 125, "db/issue-core-categories.json counts 125 keys");
  eq((cores.categoryOf || {})[VE], "foreign_policy_defense", "the core map files venezuela_policy under Foreign Policy");
  const decl = (f) => (R(f).match(new RegExp(`^\\s*${VE}:\\s*\\{[^\\n]*\\},?$`, "m")) || [""])[0].trim();
  for (const f of ["alignment-tool.js", "issue-map.js"]) {
    eq((R(f).match(new RegExp(`^\\s*${VE}:\\s*\\{\\s*label:`, "gm")) || []).length, 1, `${f} declares venezuela_policy exactly once`);
    ok(/'iran_policy','ukraine_policy','yemen_policy','venezuela_policy','veterans'/.test(R(f)), `${f}: the Foreign Policy core lists venezuela_policy`);
  }
  eq(decl("alignment-tool.js"), decl("issue-map.js"), "the two ISSUE_MAP copies declare venezuela_policy identically");
  const M = win.ISSUE_MAP[VE];
  must(!!M, "ISSUE_MAP has no venezuela_policy");
  eq(M.label, "🇻🇪 Venezuela", "the label is 🇻🇪 Venezuela");
  eq(M.cat, "foreign", "cat is foreign");
  ok(!("lean" in M), "the key carries no lean");
  eq(win.coreIssueForKey(VE) && win.coreIssueForKey(VE).key, "foreign_policy_defense", "core is 🦅 Foreign Policy & National Security");
  ok(/INSERT INTO "dd_issue_keys" \("issue_key"\) VALUES \('venezuela_policy'\)\s*ON CONFLICT DO NOTHING/.test(R(MIG)), "the migration adds venezuela_policy to dd_issue_keys");
  ok(R("sitemap.xml").includes(`/i/${VE}<`), "sitemap.xml lists /i/venezuela_policy");
  ok(/venezuela_policy: \{\s*inn:/.test(R("issue-scope.js")), "issue-scope.js carries the scope note");
  ok(/\(125 keys today\)/.test(R("db/schema.ts")), "db/schema.ts names 125 keys");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no pole");
// ═════════════════════════════════════════════════════════════════════════════
{
  const np = R("stance-helpers.js").split("var _RD_NO_POLE = {")[1].split("};")[0];
  ok(/\bvenezuela_policy:\s*1/.test(np), "venezuela_policy is in _RD_NO_POLE");
  ok(/var _DOS_LEDGER_NO_SIDE = \{[^}]*venezuela_policy: 1/.test(R("consistency.js")), "venezuela_policy is in _DOS_LEDGER_NO_SIDE");
  ok(/var BRANDING_SKIP = \{[^}]*venezuela_policy: 1/.test(R("word-action.js")), "a campaign tag never resolves to venezuela_policy");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · only Venezuela's acts, as secondary rows");
// ═════════════════════════════════════════════════════════════════════════════
const seed = JSON.parse(R("db/vr-issue-seed.json"));
const exec = JSON.parse(R("db/exec-action-seed.json")).actions.trump;
{
  const onVe = seed.measures.filter((m) => (m.issues || []).some((i) => i.issueKey === VE));
  eq(JSON.stringify(onVe.map((m) => `${m.number}|${m.congress}`).sort()), JSON.stringify(["S.J.Res. 90|119", "S.J.Res. 98|119"]), "the roll-call seed maps exactly S.J.Res. 90 and 98");
  for (const m of onVe) {
    const i = m.issues.find((x) => x.issueKey === VE);
    ok(/\bVenezuela\b/.test(i.rationale) && /Venezuela/.test(m.title || JSON.stringify(m)), `${m.number}: the rationale and the measure name Venezuela`);
    ok(i.isPrimary === false && m.issues.length >= 4, `${m.number}: secondary, beside its restraint, war-powers and defense rows`);
    ok(R(MIG).includes(`number = '${m.number}'`), `${m.number}: the migration carries the row`);
  }
  const s83 = seed.measures.find((m) => m.number === "S.J.Res. 83" && m.congress === 119);
  ok(!s83 || !s83.issues.some((i) => i.issueKey === VE), "S.J.Res. 83 names no theatre and carries no Venezuela row");
  const docs = exec.filter((x) => (x.issues || []).some((i) => i.issueKey === VE));
  eq(JSON.stringify(docs.map((x) => x.documentId).sort()), JSON.stringify(["Executive Order 14245", "Executive Order 14373"]), "the exec seed maps exactly Executive Orders 14245 and 14373");
  for (const x of docs) {
    const i = x.issues.find((y) => y.issueKey === VE);
    ok(/Venezuel/.test(x.title) && /Venezuel/.test(i.plain) && /Venezuel/.test(i.rationale), `${x.documentId}: the title, plain and rationale name Venezuela`);
    ok(i.isPrimary === false && x.issues.length >= 2, `${x.documentId}: secondary, beside its existing row`);
    ok(R("exec-action-data.js").includes(i.plain), `${x.documentId}: the client mirror carries the Venezuela row`);
    ok(R(MIG).includes(`number = '${x.documentId}'`), `${x.documentId}: the migration carries the row`);
  }
  for (const x of exec) if (/Proclamation 11015/.test(x.documentId)) ok(!x.issues.some((i) => i.issueKey === VE), "Proclamation 11015 (hemisphere-wide cartels) carries no Venezuela row");
  const mig = R(MIG).replace(/--.*$/gm, "");
  ok(!/UPDATE |DELETE /i.test(mig), "the migration updates or deletes nothing");
  eq((mig.match(/INSERT INTO vr_measure_issues/g) || []).length, 4, "the migration inserts four mappings");
  ok(!/is_primary\s*=\s*true|, true, 'yea/.test(mig), "every migrated row is secondary");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the drawers: no side, no for/against, no percentage");
// ═════════════════════════════════════════════════════════════════════════════
let veMember = null;
{
  for (const [pid] of corpus.byMember) if ((CS.dossierItems(pid, VE) || []).length) { veMember = pid; break; }
  must(!!veMember, "no member carries a mapped Venezuela vote");
  const tv = CS.dossierItems("trump", VE) || [];
  ok(tv.some((d) => /Executive Order 14245/.test(d.ident || "")) && tv.some((d) => /Executive Order 14373/.test(d.ident || "")), "Trump's Venezuela drawer holds both orders");
  for (const [pid, k] of [["trump", VE], [veMember, VE]]) {
    const items = CS.dossierItems(pid, k) || [];
    ok(items.length > 0 && items.every((d) => keysOf(d).includes(VE)), `${pid}: every Venezuela row is a Venezuela act`);
    ok(!items.some((d) => /S\.J\.Res\. 83\b/.test(d.ident || "")), `${pid}: S.J.Res. 83 is not in the Venezuela drawer`);
    const h = CS.gapViewHtml(pid, k) || "";
    must(h.length > 0, `${pid} × ${k}: no drawer rendered`);
    const t = text(h);
    ok(/No side published on this subject/.test(t), `${pid} × ${k}: the drawer does not say "No side published on this subject"`);
    ok(!h.includes('class="pdxlg-side"') && !/Acts: \d+ for · \d+ against/.test(t), `${pid} × ${k}: the ledger prints a for/against line`);
    ok(!/\d+\s*%/.test(t), `${pid} × ${k}: the drawer prints a percentage`);
    ok(!/\b\d+ items? (against|advanced)\b/.test(t), `${pid} × ${k}: the measure roll-up states a side`);
    ok(!/\b(supports|opposes) Venezuela\b/.test(t), `${pid} × ${k}: a pole is claimed`);
    ok(/On this issue: \d+ /.test(t), `${pid} × ${k}: the tally line still counts the acts`);
    const r = CS.dossierRead(pid, k);
    ok(!r || (!r.tier && !r.says && !r.label && !r.summary), `${pid} × ${k}: the record read claims a side (${r && r.tier})`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · effect lines");
// ═════════════════════════════════════════════════════════════════════════════
{
  const src = R("consistency.js");
  const pull = (name) => {
    const a = src.indexOf(`var ${name} = {`);
    return vm.runInNewContext("(" + src.slice(a + `var ${name} = `.length, src.indexOf("\n  };", a) + 4) + ")");
  };
  const E = pull("_DOS_EFFECT"), X = pull("_DOS_EXEC_EFFECT");
  const want = ["S.J.Res. 90|119|venezuela_policy", "S.J.Res. 98|119|venezuela_policy", "Executive Order 14245|venezuela_policy", "Executive Order 14373|venezuela_policy"];
  eq(JSON.stringify(LEDGER.rows.map((r) => r.key).sort()), JSON.stringify([...want].sort()), "the record covers every Venezuela pair");
  ok(!Object.keys(E).some((k) => k.endsWith("|" + VE) && /^(Executive Order|Proclamation)/.test(k)) && !Object.keys(X).some((k) => /\|\d+\|venezuela_policy$/.test(k)),
    "the vote and executive tables stay separate");
  for (const row of LEDGER.rows) {
    const T2 = row.table === "_DOS_EXEC_EFFECT" ? X : E;
    const s = norm(T2[row.key]);
    eq(s, norm(row.line), `${row.key}: the stored line is the record's`);
    ok(s.length > 0 && s.length <= 140, `${row.key}: ${s.length} characters`);
    ok(/[.!?]$/.test(s) && !/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${row.key}: not one sentence ending on its stop`);
    ok(!METHOD.test(s), `${row.key}: method word "${(s.match(METHOD) || [""])[0]}"`);
    ok(/^(?:Would (?:have )?[a-z]+|[A-Z][a-z]+ed)\b/.test(s), `${row.key}: the act is not the subject`);
    ok(/Venezuel/.test(s), `${row.key}: the line does not name Venezuela`);
    ok(low(row.source.text).includes(low(row.term)) && low(s).includes(low(row.term)), `${row.key}: the term "${row.term}" is not in both its own source and its line`);
    // From the pair's own stored text: the seed or the exec seed holds it verbatim.
    if (row.table === "_DOS_EFFECT") {
      const [n, c] = row.act.split("|");
      const m = seed.measures.find((x) => x.number === n && String(x.congress) === c);
      ok(!!m && m.issues.find((i) => i.issueKey === VE).rationale === row.source.text, `${row.key}: the quoted source is not the pair's stored rationale`);
      // Same tense and the same roll as the act's lines on its other leaves.
      const sib = Object.entries(E).filter(([k]) => k.startsWith(row.act + "|") && k !== row.key);
      ok(sib.length >= 3, `${row.key}: the act's other lines are missing`);
      for (const [k, v] of sib) {
        ok(v !== s, `${row.key}: borrowed from ${k}`);
        eq(v.split(";").pop(), s.split(";").pop(), `${row.key}: ends on the same roll as ${k}`);
        eq(/^Would have\b/.test(v), /^Would have\b/.test(s), `${row.key}: the tense differs from ${k}`);
      }
    } else {
      const x = exec.find((d) => d.documentId === row.act);
      const i = x && x.issues.find((y) => y.issueKey === VE);
      ok(!!i && i[row.source.field] === row.source.text, `${row.key}: the quoted source is not the pair's stored ${row.source.field}`);
      for (const [k, v] of Object.entries(X)) if (k !== row.key && k.startsWith(row.act + "|")) ok(v !== s && !low(v).includes(low(row.term)), `${row.key}: borrowed from ${k}`);
      for (const y of x.issues) if (y.issueKey !== VE) for (const f of ["plain", "rationale", "counts"]) ok(!low(y[f]).includes(low(s.replace(/[.!?]$/, ""))), `${row.key}: lifted from ${row.act}|${y.issueKey}'s ${f}`);
    }
  }
  // Rendered: each Venezuela row prints its line, and its chips exclude Venezuela.
  for (const [pid] of [["trump"], [veMember]]) {
    const items = CS.dossierItems(pid, VE) || [];
    const h = CS.dossierLedgerHtml(pid, VE) || "";
    for (const m of h.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
      const d = items[Number(m[1])];
      const eff = (h.match(new RegExp(`<tr class="pdxlg-effr" data-pdxlg-effr="${m[1]}"><td[^>]*>([^<]*)</td></tr>`)) || [])[1] || "";
      ok(!!eff, `${pid} × Venezuela: ${d && d.ident} prints no line`);
      const rel = (h.match(new RegExp(`<tr class="pdxlg-relr" data-pdxlg-relr="${m[1]}">([\\s\\S]*?)</tr>`)) || [])[1] || "";
      ok(!rel.includes(`data-pdxlg-rel-key="${VE}"`), `${pid} × Venezuela: ${d && d.ident} shows a chip for the issue being read`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · find-a-topic, and the mutation that would break it");
// ═════════════════════════════════════════════════════════════════════════════
const A = T.FIND_ALIASES;
ok((A[VE] || []).includes("venezuela"), "venezuela is an alias on the Venezuela leaf first");
for (const k of ["restraint", "strong_defense", "war_powers"]) ok(!(A[k] || []).some((w) => /venezuel/.test(w)), `venezuela is not a bare alias on ${k}`);
ok(!!T.FIND_SUBJECTS ? !!T.FIND_SUBJECTS[VE] : /FIND_SUBJECTS = \{[^}]*venezuela_policy: 1/.test(R("stance-tree.js")), "venezuela_policy is a find subject");
{
  const TL = T.leaves("trump");
  ok(T.find(TL, "venezuela").some((l) => l.key === VE), "Trump: venezuela lists the Venezuela leaf");
  const ls = T.leaves(veMember);
  for (const q of ["venezuela", "caracas"]) ok(T.find(ls, q).some((l) => l.key === VE), `${veMember}: ${q} finds the Venezuela leaf`);
}
function veEmptyFile(w) {
  const P = w.PROFILES || w.CMP_DATA || {};
  for (const pid of Object.keys(P)) {
    const ls = w.PDXStanceTree.leaves(pid);
    if (!ls.some((l) => l.key === "restraint") || !ls.some((l) => l.key === "strong_defense")) continue;
    if (ls.some((l) => l.key === VE)) continue;
    if ((w.PDXConsistency.dossierItems(pid, VE) || []).length) continue;
    return { pid, ls };
  }
  return null;
}
const paintsVe = (w, e) => w.PDXStanceTree.find(e.ls, "venezuela").length > 0 ||
  !w.PDXStanceTree.html(e.pid, { uid: "z", query: "venezuela" }).includes(w.PDXStanceTree.FIND_NONE);
{
  const E = veEmptyFile(win);
  must(!!E, "no file carries Restraint and Peace Through Strength without a Venezuela act to test against");
  ok(!paintsVe(win, E), `${E.pid}: venezuela finds nothing on a file with no Venezuela act`);
  const h = T.html(E.pid, { uid: "z", query: "venezuela" });
  eq(leafCount(h), 0, `${E.pid}: venezuela renders zero rows`);
  eq((h.match(/No topic on this file matches\./g) || []).length, 1, `${E.pid}: venezuela prints the miss line once`);
  for (const k of ["restraint", "strong_defense"]) {
    const bad = boot({
      "stance-tree.js": (s) => s.replace("venezuela_policy: ['venezuela', 'venezuelan', 'caracas']", `venezuela_policy: ['venezuela', 'venezuelan', 'caracas'],\n    ${k}: ['venezuela']`),
    });
    must(JSON.stringify(bad.PDXStanceTree.FIND_ALIASES[k] || []) === '["venezuela"]', `the ${k} mutation did not apply`);
    ok(paintsVe(bad, { pid: E.pid, ls: bad.PDXStanceTree.leaves(E.pid) }), `MUTATION: venezuela bare on ${k} paints Venezuela on a file with no Venezuela act, and is caught`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const base = boot(null, { without: true });
  const BCS = base.PDXConsistency, BWA = base.PDXWordAction, WA = win.PDXWordAction;
  const stripVe = (h) => String(h)
    .replace(new RegExp(`<a class="pdxlg-rel-c[^"]*" [^>]*data-pdxlg-rel-key="${VE}"[^>]*>[^<]*</a>`, "g"), "")
    .replace(/<tr class="pdxlg-relr" data-pdxlg-relr="\d+"><td colspan="5" class="pdxlg-rel" data-pdxlg-rel="1"><span class="pdxlg-rel-k">Also on<\/span><\/td><\/tr>/g, "");
  const pids = ["trump", ...corpus.byMember.keys()];
  let drawers = 0, moved = 0;
  for (const pid of pids) {
    if (!win.CMP_DATA[pid]) continue;
    const keys = new Set();
    for (const it of corpus.byMember.get(pid) || []) for (const i of it.issues || []) keys.add(i.issueKey);
    if (pid === "trump") for (const x of exec) for (const i of x.issues) keys.add(i.issueKey);
    keys.delete(VE);
    for (const k of keys) {
      let a = "", b = "", sa = "", sb = "", ta = "", tb = "";
      try { a = CS.dossierLedgerHtml(pid, k) || ""; b = BCS.dossierLedgerHtml(pid, k) || ""; } catch (e) { ok(false, `${pid} × ${k}: ${e.message}`); continue; }
      try { sa = CS.dossierSummaryHtml(pid, k) || ""; sb = BCS.dossierSummaryHtml(pid, k) || ""; } catch { /* no summary */ }
      const tj = (x) => JSON.stringify(x || null, (key, v) => (key === "d" ? undefined : v));
      try { ta = tj(CS.dossierTally(pid, k)); tb = tj(BCS.dossierTally(pid, k)); } catch { /* no tally */ }
      drawers++;
      if (stripVe(a) !== b || sa !== sb || ta !== tb) { moved++; if (moved <= 5) ok(false, `${pid} × ${k}: the drawer, tally or summary moved beyond the Venezuela chip`); }
    }
  }
  eq(moved, 0, `drawers that moved beyond the Venezuela chip (of ${drawers})`);
  must(drawers > 1000, `only ${drawers} drawers compared`);
  let reads = 0, readMoved = 0;
  const P = win.PROFILES;
  const all = Array.isArray(P) ? P.map((p) => [p && p.id, p]) : Object.entries(P || {});
  for (const [pid, p] of all) {
    if (!pid) continue;
    let ra = "", rb = "";
    try { ra = JSON.stringify(WA.read(pid, p, { termScope: "all_time" })); rb = JSON.stringify(BWA.read(pid, base.PROFILES[pid] || p, { termScope: "all_time" })); } catch { continue; }
    reads++;
    if (ra !== rb) { readMoved++; if (readMoved <= 3) ok(false, `${pid}: the Direction Match read moved`); }
  }
  eq(readMoved, 0, `Direction Match reads that moved (of ${reads})`);
  console.log(`    ${drawers} drawers and ${reads} Direction Match reads compared`);
}

if (failures.length) {
  for (const f of failures.slice(0, 40)) console.error("  ✗ " + f);
  console.error(`\n✗ venezuela leaf: ${failures.length} failure(s), ${passed} passed`);
  process.exit(1);
}
console.log(`✓ venezuela leaf: all ${passed} assertions passed`);
