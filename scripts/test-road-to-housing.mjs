#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-road-to-housing.mjs — H.R. 6644 (119th), the 21st Century ROAD to
// Housing Act (Public Law 119-101): its sponsors on file, its Title X row, and
// its Housing Affordability row left exactly as it was
// ─────────────────────────────────────────────────────────────────────────────
// 20261122000000_vr_road_to_housing_sponsors_and_corp_account.sql adds the
// sponsorship rows the official record names and one secondary
// econ_corp_account row. What must stay true:
//
//   1. NOTHING ALREADY FILED MOVED. Every issue row H.R. 6644 carried at HEAD —
//      housing (80, primary), housing_build (100, primary) and the rest — has the
//      same weight, primary flag, polarity and effect line; the migration
//      updates and deletes nothing; no issue key is added.
//   2. THE NEW ROW. econ_corp_account, weight 55, is_primary false, read from
//      Sec. 1001, with one effect line that passes the drawer's row rule.
//   3. THE SPONSORS ARE THE RECORD'S. The sponsorship rows are exactly the bill
//      page's roster-linked sponsors, which are db/bill-record.json's names less
//      the one who is not a roster file; each lists the bill on their file.
//   4. ON EVERY SPONSOR'S FILE. The sponsorship row, in the shape the live read
//      and the offline pack emit, sits under Housing Affordability with its
//      effect line and a Congress.gov door.
//   5. SEARCH. The eye answers "housing", "ROAD to Housing", "H.R. 6644" and
//      "6644" with the bill's page.
//
//   node scripts/test-road-to-housing.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { measureAddresses } from "./vr-measure-addresses.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ road to housing: STALE HARNESS — ${m}`); process.exit(2); };
const gitShow = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

const K = "119|H.R. 6644", NUM = "H.R. 6644";
const CG = "https://www.congress.gov/bill/119th-congress/house-bill/6644";
const MIG = "netlify/database/migrations/20261122000000_vr_road_to_housing_sponsors_and_corp_account.sql";
const SQL = R(MIG), BODY = SQL.replace(/^--.*$/gm, "");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const RECORDS = JSON.parse(R("db/bill-record.json")).records;
const PB = JSON.parse(R("person-bills.json"));
const PEOPLE = JSON.parse(R("db/share-index.json")).people;
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures;
const D = DOCS[K], REC = RECORDS[K];
must(D && REC, "H.R. 6644 has a bill page and an official record");
const positions = [...SQL.matchAll(/\(m_id, '([a-z_]+)', '(sponsor|cosponsor)', true,/g)].map((m) => [m[2], m[1]]);
const effectMap = (src) => {
  const at = src.indexOf("var _DOS_EFFECT = {"), end = src.indexOf("\n  };", at);
  return vm.runInNewContext("(" + src.slice(at + "var _DOS_EFFECT = ".length, end + 4) + ")");
};
const E = effectMap(R("consistency.js"));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing already filed moved");
// ═════════════════════════════════════════════════════════════════════════════
ok(!/\bUPDATE\b|\bDELETE\b/i.test(BODY), "the migration updates and deletes nothing");
ok(!/INSERT INTO vr_measures\b|INSERT INTO vr_rollcalls|INSERT INTO vr_member_votes/i.test(BODY), "the migration creates no measure, roll call or vote");
ok(/RAISE EXCEPTION 'ROAD to Housing: H\.R\. 6644 \(119, house\) is not in vr_measures/.test(SQL), "a missing measure RAISEs instead of being created");
ok(/issue_key = 'housing'\s+AND weight = 80 AND is_primary AND support_meaning = 'yea_supports'/.test(BODY), "the migration verifies housing still reads 80, primary, yea_supports");
ok(/issue_key = 'housing_build'\s+AND weight = 100 AND is_primary/.test(BODY), "…and housing_build still reads 100, primary");
{
  const head = gitShow("db/vr-issue-seed.json"), headCons = gitShow("consistency.js"), headDocs = gitShow("db/bill-docs.json");
  if (head === null) console.log("      (no git baseline)");
  else {
    const was = JSON.parse(head).measures.find((m) => m.number === NUM && m.congress === 119);
    const now = SEED.find((m) => m.number === NUM && m.congress === 119);
    for (const i of was.issues) {
      const j = now.issues.find((x) => x.issueKey === i.issueKey);
      ok(j && JSON.stringify(j) === JSON.stringify(i), `seed: ${NUM} ${i.issueKey} is unchanged`);
    }
    const housing = now.issues.find((x) => x.issueKey === "housing");
    ok(housing && housing.weight === 80 && housing.isPrimary === true, "seed: housing is still weight 80, primary");
    const HE = effectMap(headCons);
    for (const [k, v] of Object.entries(HE)) if (k.startsWith(`${NUM}|119|`)) eq(E[k], v, `effect line ${k} is unchanged`);
    for (const m of JSON.parse(headDocs).docs[K].m) {
      const n = D.m.find((x) => x.k === m.k);
      ok(n && n.l === m.l && n.i === m.i, `bill page: ${m.k} reads as it did`);
    }
    ok(gitShow("issue-map.js") === R("issue-map.js"), "issue-map.js is unchanged: no new issue key");
  }
  const addr = measureAddresses(ROOT).published.find((a) => a.sitting === "119" && a.number === NUM);
  eq(JSON.stringify([...addr.issues].sort()), JSON.stringify(["crypto_cbdc", "econ_corp_account", "housing", "housing_build", "housing_support", "permitting_reform"]),
    "the applied migrations map H.R. 6644 to its five keys plus econ_corp_account");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the new row");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ins = [...BODY.matchAll(/VALUES \(m_id, '([a-z_]+)', (\d+), (true|false),\s*'(yea_\w+)'/g)];
  eq(ins.length, 1, "one issue row is inserted");
  eq(ins[0] && ins[0].slice(1).join(" "), "econ_corp_account 55 false yea_supports", "it is econ_corp_account, 55, secondary, yea_supports");
  ok(/"No large institutional investor may purchase/.test(SQL) && /PLAW-119publ101/.test(SQL), "its rationale quotes Sec. 1001 of the public law");
  const line = E[`${NUM}|119|econ_corp_account`] || "";
  ok(line.length > 0 && line.length <= 140 && /\.$/.test(line) && !/[.!?]\s+[A-Z]/.test(line), `its effect line is one sentence of ≤140 characters (${line.length})`);
  ok(D.m.some((m) => m.k === "econ_corp_account" && m.i === "Corporate Accountability" && m.l === line), "the bill page lists Corporate Accountability with that line");
  // Filed like this Act's other secondary rows: in the migration only. The seed
  // keeps H.R. 6644 at its two housing axes, which the pack fixtures pin.
  const seedKeys = SEED.find((m) => m.number === NUM && m.congress === 119).issues.map((i) => i.issueKey).sort().join(",");
  eq(seedKeys, "housing,housing_build", "the seed corpus still holds H.R. 6644 at its two housing axes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the sponsors are the record's");
// ═════════════════════════════════════════════════════════════════════════════
const ROLE = { s: "sponsor", c: "cosponsor" };
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const surname = (p) => fold((/^(?:Rep\.|Sen\.)\s*([^,]+),/.exec(p.n) || [, ""])[1]);
{
  const pageSet = Object.entries(D.sp).flatMap(([r, ids]) => ids.map((id) => `${ROLE[r]}:${id}`)).sort();
  eq(JSON.stringify(positions.map(([r, id]) => `${r}:${id}`).sort()), JSON.stringify(pageSet), "the sponsorship rows are the bill page's sponsors");
  eq(positions.length, 31, "a sponsor and 30 roster co-sponsors");
  eq(Object.values(D.sp).flat().length + Object.values(D.su || {}).reduce((a, x) => a + x, 0), REC.sp.length, "everyone on the record is accounted for");
  const unrostered = REC.sp.filter((p) => !positions.some(([, id]) => fold(PEOPLE[id].n).includes(surname(p))));
  eq(JSON.stringify(unrostered.map((p) => p.n)), JSON.stringify(["Rep. Scott, David [D-GA-13]"]), "the one record name with no row is the one with no roster file");
  for (const [r, id] of positions) {
    ok(REC.sp.some((p) => p.r === r && fold(PEOPLE[id].n).includes(surname(p))), `${id} is a ${r} the record names`);
    const hit = ((PB.people || {})[id] || []).find(([i]) => PB.bills[i] && `${PB.bills[i][0]}|${PB.bills[i][1]}` === K);
    ok(hit && hit[1] === r[0] && PB.bills[hit[0]][4] === "enacted", `${NUM} is on ${id}'s file as ${r}, under Enacted`);
  }
  for (const [, , date] of SQL.matchAll(/\(m_id, '([a-z_]+)', '(?:sponsor|cosponsor)', true, TIMESTAMPTZ '(\d{4}-\d\d-\d\d)/g)) ok(date >= REC.in, `a sponsorship date (${date}) is on or after introduction`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · on every sponsor's file");
// ═════════════════════════════════════════════════════════════════════════════
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const corpus = buildCorpus(ROOT);
const win = makeSandbox();
{
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { must(false, `${f} boots: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
}
const CS = win.PDXConsistency;
must(CS && typeof CS.dossierItems === "function", "PDXConsistency.dossierItems is exported");
const seedIssues = SEED.find((m) => m.number === NUM && m.congress === 119).issues;
const positionItem = (r) => ({
  kind: "position", measureId: 96644, measureType: "bill", number: NUM, title: "21st Century ROAD to Housing Act",
  chamber: "house", status: "enacted", date: "2025-12-11T00:00:00.000Z", action: r, actionType: r, position: r,
  result: null, isParty: null, supports: true, isProcedural: false, advanceInverted: false, isAmendment: false,
  parentMeasureId: null, rollcallId: null, congress: 119, session: null, rollNumber: null, measureIdent: null,
  issues: seedIssues.map((i) => ({ issueKey: i.issueKey, weight: i.weight, isPrimary: i.isPrimary, supportMeaning: i.supportMeaning, rationale: i.rationale })),
  source: { url: `${CG}/cosponsors`, label: "Congress.gov" },
});
const housingLine = E[`${NUM}|119|housing`];
for (const [r, pid] of positions) {
  win.PDXVotingRecord.noteMember(pid, (corpus.byMember.get(pid) || []).concat([positionItem(r)]));
  const rows = (CS.dossierItems(pid, "housing") || []).filter((it) => it.ident === NUM && /\/cosponsors$/.test(it.url || ""));
  ok(rows.length === 1, `${NUM} sits under Housing Affordability on ${pid}'s file as ${r}`);
  const row = rows[0];
  if (!row) continue;
  eq(row.effLine, housingLine, `${pid}: the row carries the Housing Affordability effect line`);
  eq(CS.congressGovUrl(row.billNum, row.billSit), CG, `${pid}: the row's door is its Congress.gov page`);
  ok((CS.dossierLedgerHtml(pid, "housing") || "").includes(`href="${CG}"`), `${pid}: the Housing Affordability ledger links ${NUM} to Congress.gov`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · search");
// ═════════════════════════════════════════════════════════════════════════════
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false, _attrs: {}, _li: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c),
      toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (on ? set.add(c) : set.delete(c))),
    },
    setAttribute(k, v) { n._attrs[k] = String(v); }, getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {},
    addEventListener(t, f) { (n._li[t] = n._li[t] || []).push(f); }, removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null, contains: () => true, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 360, height: 400, bottom: 400, right: 360 }),
  };
  return n;
}
function bootEye(rows) {
  const w = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  w.document.getElementById = (id) => ids[id] || null;
  w.history = { replaceState() {}, pushState() {} };
  const store = {};
  w.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  w.addEventListener = () => {};
  const ctx = vm.createContext(w);
  for (const f of [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js"]) vm.runInContext(R(f), ctx, { filename: f });
  w.PROFILES = w.CMP_DATA;
  w.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  w.PDX_BILLS_INDEX = [];
  w._issueLabel = (k) => (w.ISSUE_MAP && w.ISSUE_MAP[k] && w.ISSUE_MAP[k].label) || "";
  w.PDXSaved = { list: () => [], has: () => false };
  w.PDXBills = { open: () => true };
  vm.runInContext(R("all-seeing-eye.js"), ctx, { filename: "all-seeing-eye.js" });
  must(w.PDXEye && typeof w.PDXEye.render === "function", "PDXEye.render is unavailable");
  w.PDX_BILL_SEARCH = rows; w.PDXEye.rebuild();
  eye.classList.add("is-open");
  return (q) => { input.value = q; w.PDXEye.render(q); return panel.innerHTML || ""; };
}
const ROWS = (() => { const w = {}; vm.runInNewContext(R("bill-search-index.js"), { window: w }); return w.PDX_BILL_SEARCH; })();
ok(ROWS.some((r) => r[0] === "119" && r[1] === NUM && r[2] === "21st Century ROAD to Housing Act"), "H.R. 6644 is in the eye's bill index under its title");
const search = bootEye(ROWS);
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const PAGE = `/b/119/${encodeURIComponent(NUM)}`;
for (const q of ["housing", "ROAD to Housing", "H.R. 6644", "6644"]) {
  const got = hrefs(search(q));
  ok(got.includes(PAGE), `"${q}" finds ${NUM}`);
  console.log(`      "${q}" → ${NUM} at row ${got.indexOf(PAGE) + 1} of ${got.length}`);
}

console.log(`\n   ${failures.length ? "✗" : "✓"} road to housing: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`      ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
