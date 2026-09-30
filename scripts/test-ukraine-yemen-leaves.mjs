#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ukraine-yemen-leaves.mjs — 🇺🇦 Ukraine and 🇾🇪 Yemen, on Iran's contract
// ─────────────────────────────────────────────────────────────────────────────
// Two country leaves under Foreign Policy & National Security, built the way
// iran_policy is: a subject key with no pole, holding only acts whose own subject
// is that country, filed beside the measure's existing rows. The fence:
//
//   1. ONE KEY EACH. Declared once in both ISSUE_MAP copies, under the Foreign
//      Policy core, in the generated allow-list and in the stored table.
//   2. NO POLE. Both sit in _RD_NO_POLE; the ledger prints no for/against.
//   3. ONLY THAT COUNTRY'S ACTS. S.J. Res. 7 (Yemen) is in Yemen and not Iran;
//      S.J. Res. 68 (Iran) is in Iran and not Yemen; the Israel supplementals
//      are not Ukraine.
//   4. HONEST EMPTY. A file with no Ukraine act gets the miss line for ukraine,
//      Diplomacy or Peace Through Strength on it notwithstanding.
//   5. MUTATION. "ukraine" bare on Restraint / Peace Through Strength paints
//      Ukraine on that empty file, and the checker below catches it.
//
//   node scripts/test-ukraine-yemen-leaves.mjs

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
const UK = "ukraine_policy", YE = "yemen_policy", IR = "iran_policy";
const MIG = "netlify/database/migrations/20261106000000_vr_ukraine_yemen_policy_issue_keys.sql";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const must = (c, m) => { if (c) { passed++; return; } console.error(`✗ ukraine/yemen leaves: ${m}`); process.exit(2); };
const section = (t) => console.log(`  · ${t}`);

const corpus = buildCorpus(ROOT);
function boot(patch) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = R(f);
    if (patch && patch[f]) src = patch[f](src);
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
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
const text = (h) => String(h).replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const isSJ = (n) => (d) => new RegExp(`S\\.J\\. ?Res\\. ${n}\\b`).test(d.ident || "");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · vocab, cores and key count");
// ═════════════════════════════════════════════════════════════════════════════
{
  const keys = JSON.parse(R("db/issue-keys.json"));
  const list = Array.isArray(keys) ? keys : (keys.keys || []);
  eq(list.length, 124, "db/issue-keys.json carries 124 keys");
  const cores = JSON.parse(R("db/issue-core-categories.json"));
  const mig = R(MIG);
  for (const [k, name] of [[UK, "Ukraine"], [YE, "Yemen"]]) {
    for (const f of ["alignment-tool.js", "issue-map.js"]) {
      eq((R(f).match(new RegExp(`^\\s*${k}:\\s*\\{\\s*label:`, "gm")) || []).length, 1, `${f} declares ${k} exactly once`);
    }
    const M = win.ISSUE_MAP[k];
    must(!!M, `ISSUE_MAP has no ${k}`);
    eq(M.label.replace(/[^A-Za-z ]/g, "").trim(), name, `${k}: the label is ${name}`);
    eq(M.cat, "foreign", `${k}: cat is foreign`);
    eq(win.coreIssueForKey(k) && win.coreIssueForKey(k).key, "foreign_policy_defense", `${k}: core is Foreign Policy & National Security`);
    eq(list.filter((x) => x === k).length, 1, `db/issue-keys.json carries ${k} once`);
    eq((cores.categoryOf || {})[k], "foreign_policy_defense", `db/issue-core-categories.json files ${k} under Foreign Policy`);
    ok(new RegExp(`INSERT INTO "dd_issue_keys" \\("issue_key"\\) VALUES \\('${k}'\\)\\s*ON CONFLICT DO NOTHING`).test(mig),
      `the migration adds ${k} to dd_issue_keys`);
    ok(R("sitemap.xml").includes(`/i/${k}<`), `sitemap.xml lists /i/${k}`);
  }
  // On-axis, replacing none of them.
  for (const k of ["restraint", "war_powers", "strong_defense", IR]) ok(!!win.ISSUE_MAP[k], `${k} is still a leaf`);
  // No Houthi alias: no Houthi-Yemen act exists in the archive.
  ok(!JSON.stringify(T.FIND_ALIASES).includes("houthi"), "no houthi alias ships without a Houthi act");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no pole");
// ═════════════════════════════════════════════════════════════════════════════
{
  const np = R("stance-helpers.js").split("var _RD_NO_POLE = {")[1].split("};")[0];
  for (const k of [UK, YE]) ok(new RegExp(`\\b${k}:\\s*1`).test(np), `${k} is in _RD_NO_POLE`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · only that country's acts, as secondary rows");
// ═════════════════════════════════════════════════════════════════════════════
const seed = JSON.parse(R("db/vr-issue-seed.json"));
{
  const onUk = seed.measures.filter((m) => (m.issues || []).some((i) => i.issueKey === UK));
  must(onUk.length > 0, "no measure in db/vr-issue-seed.json is mapped to ukraine_policy");
  for (const m of onUk) {
    const i = m.issues.find((x) => x.issueKey === UK);
    ok(/\bUkrain/.test(i.rationale), `${m.number}: the rationale names Ukraine`);
    ok(i.isPrimary === false, `${m.number}: filed alongside its existing rows`);
    ok(m.issues.length > 1, `${m.number}: keeps its other leaves`);
  }
  for (const n of ["H.R. 7217", "H.R. 8034"]) ok(!onUk.some((m) => m.number === n), `${n} (Israel) is not mapped to Ukraine`);
  ok(!seed.measures.some((m) => (m.issues || []).some((i) => i.issueKey === YE) && !/Yemen/.test(JSON.stringify(m))),
    "every roll-call Yemen row is a Yemen-named measure");

  const exec = JSON.parse(R("db/exec-action-seed.json")).actions.trump;
  const sj7 = exec.find((x) => x.documentId === "S.J. Res. 7 (116th Congress)");
  const sj68 = exec.find((x) => x.documentId === "S.J. Res. 68 (116th Congress)");
  must(!!sj7 && !!sj68, "S.J. Res. 7 / 68 are not in the exec seed");
  const y = sj7.issues.find((i) => i.issueKey === YE);
  must(!!y, "S.J. Res. 7 has no yemen_policy row");
  ok(y.isPrimary === false && /Yemen/.test(y.plain), "S.J. Res. 7 × Yemen is secondary and names Yemen");
  ok(!sj7.issues.some((i) => i.issueKey === IR), "S.J. Res. 7 carries no Iran row");
  ok(!sj68.issues.some((i) => i.issueKey === YE), "S.J. Res. 68 carries no Yemen row");
  ok(R("exec-action-data.js").includes(y.plain), "the client mirror carries the Yemen row");
  const mig = R(MIG).replace(/--.*$/gm, "");
  ok(!/S\.J\. ?Res\. 68/.test(mig), "the migration touches nothing on S.J. Res. 68");
  ok(!/iran_policy/.test(mig), "the migration maps nothing to Iran");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Trump: yemen and iran drawers, and the find box");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ye = CS.dossierItems("trump", YE) || [];
  const ir = CS.dossierItems("trump", IR) || [];
  ok(ye.some(isSJ(7)), "S.J. Res. 7 is in Trump's Yemen drawer");
  ok(!ye.some(isSJ(68)), "S.J. Res. 68 is not in Trump's Yemen drawer");
  ok(ir.some(isSJ(68)), "S.J. Res. 68 is in Trump's Iran drawer");
  ok(!ir.some(isSJ(7)), "S.J. Res. 7 is not in Trump's Iran drawer");
  ok(ye.every((d) => keysOf(d).includes(YE)), "every Yemen row carries the Yemen key");
  ok(ir.every((d) => keysOf(d).includes(IR)), "every Iran row carries the Iran key");

  const TL = T.leaves("trump");
  ok(T.find(TL, "yemen").some((l) => l.key === YE), "Trump: yemen lists the Yemen leaf");
  ok(!T.find(TL, "yemen").some((l) => l.key === IR), "Trump: yemen does not list Iran");
  ok(!T.find(TL, "iran").some((l) => l.key === YE), "Trump: iran does not list Yemen");
  // Ukraine lists the leaf when mapped, and otherwise prints the miss line.
  const ukMapped = (CS.dossierItems("trump", UK) || []).length > 0;
  for (const q of ["ukraine", "kyiv", "zelensky"]) {
    eq(T.find(TL, q).some((l) => l.key === UK), ukMapped, `Trump: ${q} lists the Ukraine leaf iff one is mapped`);
    if (!ukMapped) {
      const h = T.html("trump", { uid: "u", query: q });
      eq(leafCount(h), 0, `Trump: ${q} renders zero rows with no Ukraine act`);
      eq((h.match(/No topic on this file matches\./g) || []).length, 1, `Trump: ${q} prints the miss line once`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a member with a Ukraine vote gets the leaf through every alias");
// ═════════════════════════════════════════════════════════════════════════════
let ukMember = null;
{
  for (const [pid] of corpus.byMember) {
    if ((CS.dossierItems(pid, UK) || []).length && T.leaves(pid).some((l) => l.key === UK)) { ukMember = pid; break; }
  }
  must(!!ukMember, "no member carries a mapped Ukraine vote");
  const ls = T.leaves(ukMember);
  for (const q of ["ukraine", "kyiv", "zelensky"]) ok(T.find(ls, q).some((l) => l.key === UK), `${ukMember}: ${q} finds the Ukraine leaf`);
  const items = CS.dossierItems(ukMember, UK);
  ok(items.every((d) => keysOf(d).includes(UK)), `${ukMember}: every Ukraine row is a Ukraine act`);
  ok(!items.some((d) => /H\.R\. (7217|8034)\b/.test(d.ident || "")), `${ukMember}: no Israel supplemental in the Ukraine drawer`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · honest empty, and the mutation that would break it");
// ═════════════════════════════════════════════════════════════════════════════
function ukEmptyFile(w) {
  const P = w.PROFILES || w.CMP_DATA || {};
  for (const pid of Object.keys(P)) {
    const ls = w.PDXStanceTree.leaves(pid);
    if (!ls.some((l) => l.key === "restraint" || l.key === "strong_defense")) continue;
    if (ls.some((l) => l.key === UK)) continue;
    if ((w.PDXConsistency.dossierItems(pid, UK) || []).length) continue;
    return { pid, ls };
  }
  return null;
}
const paintsUkraine = (w, e) => w.PDXStanceTree.find(e.ls, "ukraine").length > 0 ||
  !w.PDXStanceTree.html(e.pid, { uid: "z", query: "ukraine" }).includes(w.PDXStanceTree.FIND_NONE);
{
  const E = ukEmptyFile(win);
  must(!!E, "no file carries Restraint or Peace Through Strength without a Ukraine act to test against");
  ok(!paintsUkraine(win, E), `${E.pid}: ukraine finds nothing on a file with no Ukraine map`);
  const h = T.html(E.pid, { uid: "z", query: "ukraine" });
  eq(leafCount(h), 0, `${E.pid}: ukraine renders zero rows`);
  eq((h.match(/No topic on this file matches\./g) || []).length, 1, `${E.pid}: ukraine prints the miss line once`);

  const bad = boot({
    "stance-tree.js": (s) => s.replace("yemen_policy: ['yemen']", "yemen_policy: ['yemen'],\n    restraint: ['ukraine'],\n    strong_defense: ['ukraine']"),
  });
  must(JSON.stringify(bad.PDXStanceTree.FIND_ALIASES.restraint || []) === '["ukraine"]', "the mutation did not apply");
  const BE = { pid: E.pid, ls: bad.PDXStanceTree.leaves(E.pid) };
  ok(paintsUkraine(bad, BE), "MUTATION: an alias that paints Ukraine on a file with zero Ukraine maps is caught by the checker");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · ledger: no pole and no for/against on the new drawers");
// ═════════════════════════════════════════════════════════════════════════════
{
  const drawers = [["trump", YE], [ukMember, UK]];
  for (const [pid, k] of drawers) {
    const h = CS.gapViewHtml(pid, k) || "";
    must(h.length > 0, `${pid} × ${k}: no drawer rendered`);
    const t = text(h);
    ok(!h.includes('class="pdxlg-side"'), `${pid} × ${k}: the ledger prints a for/against line`);
    ok(!/Acts: \d+ for · \d+ against/.test(t), `${pid} × ${k}: "Acts: n for · n against" is on the drawer`);
    ok(!/\b\d+ items? (against|advanced)\b/.test(t), `${pid} × ${k}: the measure roll-up states a side`);
    ok(/On this issue: \d+ /.test(t), `${pid} × ${k}: the tally line still counts the acts`);
    ok(/No side published on this subject|Thin read — this subject has no side|No side to read on this issue/.test(t),
      `${pid} × ${k}: the record read does not say the subject has no side`);
    ok(!/\b(supports|opposes) (Ukraine|Yemen)\b/.test(t), `${pid} × ${k}: a pole is claimed`);
    const r = CS.dossierRead(pid, k);
    ok(!r || (!r.tier && !r.says && !r.label && !r.summary), `${pid} × ${k}: the record read claims a side (${r && r.tier})`);
    ok(!r || /no_pole|no_side|no_pole_read/.test((r.why && r.why.id) || ""), `${pid} × ${k}: the read's reason is ${r && r.why && r.why.id}, not the no-pole refusal`);
  }
  // Iran kept its line through this pass and dropped it in the next, when its
  // drawer took the second-term instruments and joined _DOS_LEDGER_NO_SIDE (see
  // test-trump-iran-instruments.mjs). The tally line still counts its acts.
  {
    const t = text(CS.gapViewHtml("trump", IR) || "");
    ok(!/Acts: \d+ for · \d+ against/.test(t), "Iran's ledger prints no for/against line either");
    ok(/On this issue: \d+ /.test(t), "Iran's tally line still counts the acts");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · effect lines: short, the act as subject, no method words");
// ═════════════════════════════════════════════════════════════════════════════
{
  const src = R("consistency.js");
  const pull = (name) => {
    const a = src.indexOf(`var ${name} = {`);
    must(a !== -1, `${name} is not in consistency.js`);
    return vm.runInNewContext("(" + src.slice(a + `var ${name} = `.length, src.indexOf("\n  };", a) + 4) + ")");
  };
  const lines = Object.entries({ ...pull("_DOS_EFFECT"), ...pull("_DOS_EXEC_EFFECT") })
    .filter(([k]) => k.endsWith(`|${UK}`) || k.endsWith(`|${YE}`));
  must(lines.length >= 3, "fewer effect lines than mapped pairs");
  for (const [k, v] of lines) {
    ok(v.length <= 140, `${k}: ${v.length} characters`);
    ok(/^[A-Z][a-z]+ed\b/.test(v), `${k}: does not open on what the act did`);
    ok(!/\b(mapped|mapping|coded|scor|rationale|weight|support_meaning|yea_supports|archive)/i.test(v), `${k}: method words`);
    ok(new RegExp(k.endsWith(UK) ? "Ukraine" : "Yemen").test(v), `${k}: does not name its country`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · no Direction Match item: a campaign tag does not resolve to a country leaf");
// ═════════════════════════════════════════════════════════════════════════════
{
  const WA = win.PDXWordAction;
  must(!!WA && typeof WA.read === "function", "PDXWordAction.read is not published");
  const P = win.PROFILES;
  const all = Array.isArray(P) ? P.map((p) => [p && p.id, p]) : Object.entries(P || {});
  let tagged = 0;
  for (const [pid, p] of all) {
    const br = Array.isArray(p && p.keyIssues) ? p.keyIssues : (Array.isArray(p && p.issues) ? p.issues : []);
    if (!br.some((l) => typeof l === "string" && /ukrain|yemen/i.test(l))) continue;
    tagged++;
    const r = WA.read(pid, p, { termScope: "all_time" });
    const bad = ((r && r.items) || []).filter((x) => x.kind === "branding" && (x.issueKey === UK || x.issueKey === YE));
    ok(!bad.length, `${pid}: the branding tag "${bad[0] && bad[0].label}" became a ${bad[0] && bad[0].issueKey} Direction Match item`);
  }
  ok(tagged > 0, "no profile carries a Ukraine or Yemen branding tag to test against");
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
