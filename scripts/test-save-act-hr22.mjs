#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-save-act-hr22.mjs — H.R. 22 (119th), the SAVE Act: its sponsors on
// file, its state-or-federal row, and its four elections rows left exactly as
// they were
// ─────────────────────────────────────────────────────────────────────────────
// 20261123000000_vr_save_act_hr22_sponsors_and_state_rule.sql adds the
// sponsorship rows the official record names and one secondary
// states_federal_power row. What must stay true:
//
//   1. NOTHING ALREADY FILED MOVED. election_integrity (100, primary),
//      election_security (100), voter_id (70) and voting_access (60,
//      yea_opposes) have the same weight, primary flag, polarity, rationale and
//      effect line as at HEAD; the migration updates and deletes nothing; no
//      issue key is added.
//   2. THE NEW ROW. states_federal_power, weight 45, is_primary false,
//      yea_opposes, read from the engrossed text, in the migration and the seed
//      alike, with one effect line that passes the drawer's row rule — the same
//      row H.R. 8281 (118th) carries on the same text.
//   3. THE SPONSORS ARE THE RECORD'S. The sponsorship rows are exactly the bill
//      page's roster-linked sponsors, which are db/bill-record.json's names less
//      the one who is not a roster file; each lists the bill on their file.
//   4. ON EVERY SPONSOR'S FILE. The sponsorship row, in the shape the live read
//      and the offline pack emit, sits under every mapped issue with that
//      issue's effect line and a Congress.gov door.
//   5. SEARCH. The eye answers "SAVE Act", "H.R. 22", "voter ID" and "proof of
//      citizenship" with the bill's page.
//
//   node scripts/test-save-act-hr22.mjs
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
const must = (c, m) => { if (c) return; console.error(`✗ save act: STALE HARNESS — ${m}`); process.exit(2); };
const gitShow = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

const K = "119|H.R. 22", NUM = "H.R. 22";
const CG = "https://www.congress.gov/bill/119th-congress/house-bill/22";
const MIG = "netlify/database/migrations/20261123000000_vr_save_act_hr22_sponsors_and_state_rule.sql";
const SQL = R(MIG), BODY = SQL.replace(/^--.*$/gm, "");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const RECORDS = JSON.parse(R("db/bill-record.json")).records;
const PB = JSON.parse(R("person-bills.json"));
const PEOPLE = JSON.parse(R("db/share-index.json")).people;
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures;
const D = DOCS[K], REC = RECORDS[K];
must(D && REC, "H.R. 22 has a bill page and an official record");
const positions = [...SQL.matchAll(/\(m_id, '([a-z_]+)', '(sponsor|cosponsor)', true,/g)].map((m) => [m[2], m[1]]);
const tableOf = (src, name) => {
  const at = src.indexOf(`var ${name} = {`), end = src.indexOf("\n  };", at);
  return vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")");
};
const CONS = R("consistency.js");
const E = tableOf(CONS, "_DOS_EFFECT"), MECH = tableOf(CONS, "_DOS_MECH");
// The rows already filed, as they stood before this pass.
const WAS = {
  election_integrity: [100, true, "yea_supports"],
  election_security: [100, false, "yea_supports"],
  voter_id: [70, false, "yea_supports"],
  voting_access: [60, false, "yea_opposes"],
};
const KEYS = [...Object.keys(WAS), "states_federal_power"];
const seedOf = () => SEED.find((m) => m.number === NUM && m.congress === 119);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing already filed moved");
// ═════════════════════════════════════════════════════════════════════════════
ok(!/\bUPDATE\b|\bDELETE\b/i.test(BODY), "the migration updates and deletes nothing");
ok(!/INSERT INTO vr_measures\b|INSERT INTO vr_rollcalls|INSERT INTO vr_member_votes/i.test(BODY), "the migration creates no measure, roll call or vote");
ok(/RAISE EXCEPTION 'SAVE Act: H\.R\. 22 \(119, house\) is not in vr_measures/.test(SQL), "a missing measure RAISEs instead of being created");
for (const [k, [w, p, s]] of Object.entries(WAS)) {
  const re = new RegExp(`issue_key = '${k}'\\s+AND weight = ${w} AND ${p ? "" : "NOT "}is_primary AND support_meaning = '${s}'`);
  ok(re.test(BODY), `the migration verifies ${k} still reads ${w}, ${p ? "primary" : "secondary"}, ${s}`);
  const i = seedOf().issues.find((x) => x.issueKey === k);
  ok(i && i.weight === w && i.isPrimary === p && i.supportMeaning === s, `seed: ${k} is still ${w}, ${p ? "primary" : "secondary"}, ${s}`);
}
eq(seedOf().issues.filter((i) => i.isPrimary).map((i) => i.issueKey).join(","), "election_integrity", "election_integrity is still the one primary label");
{
  const head = gitShow("db/vr-issue-seed.json"), headCons = gitShow("consistency.js");
  if (head === null) console.log("      (no git baseline)");
  else {
    const was = JSON.parse(head).measures.find((m) => m.number === NUM && m.congress === 119);
    for (const i of was.issues) {
      const j = seedOf().issues.find((x) => x.issueKey === i.issueKey);
      ok(j && JSON.stringify(j) === JSON.stringify(i), `seed: ${NUM} ${i.issueKey} is byte-identical to HEAD`);
    }
    const HE = tableOf(headCons, "_DOS_EFFECT"), HM = tableOf(headCons, "_DOS_MECH");
    for (const [k, v] of Object.entries(HE)) if (k.startsWith(`${NUM}|119|`)) eq(E[k], v, `effect line ${k} is unchanged`);
    for (const [k, v] of Object.entries(HM)) if (k.startsWith(`${NUM}|119|`)) eq(JSON.stringify(MECH[k]), JSON.stringify(v), `did/why ${k} is unchanged`);
    ok(gitShow("issue-map.js") === R("issue-map.js"), "issue-map.js is unchanged: no new issue key");
  }
  const addr = measureAddresses(ROOT).published.find((a) => a.sitting === "119" && a.number === NUM);
  eq(JSON.stringify([...addr.issues].sort()), JSON.stringify([...KEYS].sort()), "the migrations map H.R. 22 to its four keys plus states_federal_power");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the new row");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ins = [...BODY.matchAll(/VALUES \(m_id, '([a-z_]+)', (\d+), (true|false),\s*'(yea_\w+)'/g)];
  eq(ins.length, 1, "one issue row is inserted");
  eq(ins[0] && ins[0].slice(1).join(" "), "states_federal_power 45 false yea_opposes", "it is states_federal_power, 45, secondary, yea_opposes");
  ok(/"Under any method of voter registration in a State/.test(SQL) && /BILLS-119hr22eh/.test(SQL), "its rationale quotes new NVRA section 4(b) from the engrossed text");
  const s = seedOf().issues.find((i) => i.issueKey === "states_federal_power");
  ok(s && s.weight === 45 && s.isPrimary === false && s.supportMeaning === "yea_opposes" && /BILLS-119hr22eh/.test(s.sourceUrl || ""), "the seed carries the same row");
  const twin = SEED.find((m) => m.number === "H.R. 8281" && m.congress === 118).issues.find((i) => i.issueKey === "states_federal_power");
  ok(twin && twin.weight === s.weight && twin.supportMeaning === s.supportMeaning, "…matching H.R. 8281's row on the same text");
  for (const k of KEYS) {
    const line = E[`${NUM}|119|${k}`] || "";
    ok(line.length > 0 && line.length <= 140 && /\.$/.test(line) && !/[.!?]\s+[A-Z]/.test(line), `${k}: its effect line is one sentence of ≤140 characters (${line.length})`);
    ok(/^Would /.test(line), `${k}: its effect line has the act as its subject`);
    ok(D.m.some((m) => m.k === k && m.l === line), `${k}: the bill page lists it with that line`);
  }
  ok(MECH[`${NUM}|119|states_federal_power`] && MECH[`${NUM}|119|states_federal_power`].did, "states_federal_power has its did/why");
  ok(D.rs === CG, "the bill page links its Congress.gov record");
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
  eq(positions.length, 110, "a sponsor and 109 roster co-sponsors");
  eq(positions.filter(([r]) => r === "sponsor").map(([, id]) => id).join(","), "chip_roy", "Chip Roy is the one sponsor");
  eq(new Set(positions.map(([, id]) => id)).size, positions.length, "nobody is filed twice");
  eq(Object.values(D.sp).flat().length + Object.values(D.su || {}).reduce((a, x) => a + x, 0), REC.sp.length, "everyone on the record is accounted for");
  const unrostered = REC.sp.filter((p) => !positions.some(([, id]) => fold(PEOPLE[id].n).includes(surname(p))));
  eq(JSON.stringify(unrostered.map((p) => p.n)), JSON.stringify(["Rep. Green, Mark E. [R-TN-7]"]), "the one record name with no row is the one with no roster file");
  for (const [r, id] of positions) {
    ok(PEOPLE[id], `${id} is a roster file`);
    ok(REC.sp.some((p) => p.r === r && fold(PEOPLE[id].n).includes(surname(p))), `${id} is a ${r} the record names`);
    const hit = ((PB.people || {})[id] || []).find(([i]) => PB.bills[i] && `${PB.bills[i][0]}|${PB.bills[i][1]}` === K);
    ok(hit && hit[1] === r[0] && PB.bills[hit[0]][3] === "passed_house", `${NUM} is on ${id}'s file as ${r}, as passed by the House`);
  }
  for (const [, , date] of SQL.matchAll(/\(m_id, '([a-z_]+)', '(?:sponsor|cosponsor)', true, TIMESTAMPTZ '(\d{4}-\d\d-\d\d)/g)) {
    ok(date >= REC.in && date <= "2025-04-10", `a sponsorship date (${date}) falls between introduction and House passage`);
  }
  for (const [, url] of SQL.matchAll(/TIMESTAMPTZ '[^']+',\s*'([^']+)'/g)) eq(url, `${CG}/cosponsors`, "each sponsorship row cites the Congress.gov co-sponsor list");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · on every sponsor's file, under every mapped issue");
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
const positionItem = (r) => ({
  kind: "position", measureId: 90022, measureType: "bill", number: NUM, title: "Safeguard American Voter Eligibility (SAVE) Act",
  chamber: "house", status: "passed_house", date: "2025-01-03T00:00:00.000Z", action: r, actionType: r, position: r,
  result: null, isParty: null, supports: true, isProcedural: false, advanceInverted: false, isAmendment: false,
  parentMeasureId: null, rollcallId: null, congress: 119, session: null, rollNumber: null, measureIdent: null,
  issues: seedOf().issues.map((i) => ({ issueKey: i.issueKey, weight: i.weight, supportMeaning: i.supportMeaning, rationale: i.rationale })),
  source: { url: `${CG}/cosponsors`, label: "Congress.gov" },
});
let missing = 0;
for (const [r, pid] of positions) {
  win.PDXVotingRecord.noteMember(pid, (corpus.byMember.get(pid) || []).concat([positionItem(r)]));
  for (const k of KEYS) {
    const rows = (CS.dossierItems(pid, k) || []).filter((it) => it.ident === NUM && /\/cosponsors$/.test(it.url || ""));
    if (rows.length !== 1) { missing++; ok(false, `${NUM} sits under ${k} on ${pid}'s file as ${r}`); continue; }
    passed++;
    const row = rows[0];
    eq(row.effLine, E[`${NUM}|119|${k}`], `${pid} · ${k}: the row carries its effect line`);
    eq(CS.congressGovUrl(row.billNum, row.billSit), CG, `${pid} · ${k}: the row's door is its Congress.gov page`);
  }
  if (r === "sponsor") {
    for (const k of KEYS) ok((CS.dossierLedgerHtml(pid, k) || "").includes(`href="${CG}"`), `${pid}: the ${k} ledger links ${NUM} to Congress.gov`);
  }
}
console.log(`      ${positions.length} files × ${KEYS.length} issues — ${positions.length * KEYS.length - missing} rows land`);

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
function bootEye(rows, inline) {
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
  w.PDX_BILLS_INDEX = inline || [];
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
const ROW = ROWS.find((r) => r[0] === "119" && r[1] === NUM);
ok(ROW && ROW[2] === "Safeguard American Voter Eligibility (SAVE) Act", "H.R. 22 is in the eye's bill index under its title");
eq(ROW && JSON.stringify([...ROW[5]].sort()), JSON.stringify([...KEYS].sort()), "the index row carries all five mapped topics");
const INLINE = (() => { const w = {}; vm.runInNewContext(R("bills-index.js"), { window: w }); return w.PDX_BILLS_INDEX; })();
const CARD = INLINE.find((b) => b.number === NUM && b.congress === 119);
ok(CARD && /proof of citizenship/.test(CARD.keywords) && /voter id/.test(CARD.keywords), "the curated index carries the plain-language terms readers type");
eq(CARD && JSON.stringify([...CARD.issueKeys].sort()), JSON.stringify([...KEYS].sort()), "the curated index card carries all five mapped topics");
eq(CARD && CARD.primaryIssue, "election_integrity", "the curated card's label is unchanged");
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const PAGE = `/b/119/${encodeURIComponent(NUM)}`;
// The eye asks for both files itself (ensureEyeBills); the page index can land
// first. The number and the short title must find the bill on the page index
// alone; the curated terms once the curated index is in.
const QUERIES = [["page index", bootEye(ROWS), ["SAVE Act", "H.R. 22", "voter ID"]],
  ["page + curated index", bootEye(ROWS, INLINE), ["SAVE Act", "H.R. 22", "voter ID", "proof of citizenship"]]];
for (const [label, search, qs] of QUERIES) {
  for (const q of qs) {
    const html = search(q), got = hrefs(html);
    ok(got.includes(PAGE), `${label}: "${q}" finds ${NUM}`);
    console.log(`      ${label}: "${q}" → ${NUM} at row ${got.indexOf(PAGE) + 1} of ${got.length}`);
    const a = String(html).split('<a role="option"').find((x) => x.includes(`href="${PAGE.replace(/&/g, "&amp;")}"`) || x.includes(`href="${PAGE}"`)) || "";
    ok(/Whose Rule Governs/.test(a) || /\+\d+ of 5 topics/.test(a), `${label}: "${q}" — the result names the bill's five topics`);
  }
}

console.log(`\n   ${failures.length ? "✗" : "✓"} save act: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log(`      ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
