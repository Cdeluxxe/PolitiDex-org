#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-epstein-files-act-ii.mjs — H.R. 9694 and S. 5005 (119th), the Epstein
// Files Transparency Act II, filed beside H.R. 4405 on Transparency &
// Anti-Corruption
// ─────────────────────────────────────────────────────────────────────────────
// 20261121000000_vr_epstein_files_transparency_act_ii.sql files both bills as
// secondary gov_transparency rows with the sponsors the Congress.gov record
// names. What must stay true:
//
//   1. THE ROWS. Each bill is one measure with one issue row, gov_transparency,
//      is_primary false, a congress.gov source, and the seed corpus holds the
//      same row. No issue key is added anywhere: ISSUE_MAP is unchanged and the
//      migration names no key but gov_transparency.
//   2. THE SPONSORS ARE THE RECORD'S. The migration's vr_positions rows are
//      exactly the bill page's roster-linked sponsors and co-sponsors, which are
//      exactly db/bill-record.json's names — nobody invented, nobody dropped —
//      and each of those people lists the bill on their file (Pending).
//   3. ON THE MEMBER'S FILE. A sponsorship row, in the shape the live read and
//      the offline pack emit, lands under Transparency & Anti-Corruption in the
//      issue drawer with its effect line (one sentence, ≤140 characters) and a
//      Congress.gov door — and the row carries its measure's congress, without
//      which neither would print.
//   4. SEARCH. The eye, booted on the bill-page index, answers "epstein" with
//      H.R. 4405, H.R. 9694 and S. 5005, and "epstein 2" and "transparency act"
//      with both new bills.
//   5. H.R. 4405 IS UNCHANGED: its migration, seed entry, effect line and bill
//      page are byte-identical to HEAD.
//
//   node scripts/test-epstein-files-act-ii.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ epstein files act II: STALE HARNESS — ${m}`); process.exit(2); };
const gitShow = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

const MIG = "netlify/database/migrations/20261121000000_vr_epstein_files_transparency_act_ii.sql";
const SQL = R(MIG);
const BILLS = [
  { n: "H.R. 9694", ch: "house", cg: "https://www.congress.gov/bill/119th-congress/house-bill/9694" },
  { n: "S. 5005", ch: "senate", cg: "https://www.congress.gov/bill/119th-congress/senate-bill/5005" },
];
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const RECORDS = JSON.parse(R("db/bill-record.json")).records;
const PB = JSON.parse(R("person-bills.json"));
const PEOPLE = JSON.parse(R("db/share-index.json")).people;
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures;
for (const b of BILLS) must(DOCS[`119|${b.n}`] && RECORDS[`119|${b.n}`], `${b.n} has a bill page and an official record`);

// The migration, one DO block per bill.
const blocks = SQL.split(/^DO \$\$/m).slice(1);
must(blocks.length === 2, "the migration has one block per bill");
const blockOf = (n) => blocks.find((b) => b.includes(`number = '${n}'`));
const positionsOf = (blk) => [...blk.matchAll(/\(m_id, '([a-z_]+)', '(sponsor|cosponsor)', true,/g)].map((m) => [m[2], m[1]]);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the rows");
// ═════════════════════════════════════════════════════════════════════════════
for (const b of BILLS) {
  const blk = blockOf(b.n);
  must(blk, `${b.n} has a block`);
  ok(blk.includes(`VALUES ('bill', 119, '${b.ch}', '${b.n}', 'Epstein Files Transparency Act II',`), `${b.n} is a 119th ${b.ch} bill titled Epstein Files Transparency Act II`);
  ok(blk.includes(`'${b.cg}', 'Congress.gov',`), `${b.n}'s source is its Congress.gov page`);
  ok(blk.includes(`'congressGovUrl', '${b.cg}'`), `${b.n} carries its Congress.gov page as the bill door`);
  const issues = [...blk.matchAll(/VALUES \(m_id, '([a-z_]+)', (\d+), (true|false),/g)];
  eq(issues.length, 1, `${b.n} has one issue row`);
  eq(issues[0] && issues[0][1], "gov_transparency", `${b.n}'s row is gov_transparency`);
  eq(issues[0] && issues[0][3], "false", `${b.n}'s row is not primary`);
  const seed = SEED.filter((m) => m.number === b.n && m.congress === 119);
  eq(seed.length, 1, `${b.n} has one seed entry`);
  ok(seed[0] && seed[0].chamber === b.ch && seed[0].issues.length === 1 && seed[0].issues[0].issueKey === "gov_transparency" &&
    seed[0].issues[0].isPrimary === false && seed[0].issues[0].weight === Number(issues[0] && issues[0][2]),
    `${b.n}'s seed entry is the migration's row`);
  const d = DOCS[`119|${b.n}`];
  ok(d.m && d.m.length === 1 && d.m[0].k === "gov_transparency" && d.m[0].i === "Transparency & Anti-Corruption",
    `${b.n}'s bill page lists Transparency & Anti-Corruption and nothing else`);
  ok(d.rs === b.cg, `${b.n}'s bill page links its Congress.gov record`);
}
ok(!/INSERT INTO vr_rollcalls|INSERT INTO vr_member_votes|UPDATE |DELETE /i.test(SQL), "the migration adds no roll call or vote and changes no existing row");
eq(new Set([...SQL.matchAll(/issue_key = '([a-z_]+)'/g)].map((m) => m[1])).size, 1, "the migration names one issue key");
{
  const head = gitShow("issue-map.js");
  if (head === null) console.log("      (no git baseline for issue-map.js)");
  else ok(head === R("issue-map.js"), "issue-map.js is unchanged: no new issue key");
  ok(/\bgov_transparency:\s*\{ label: '🔍 Transparency & Anti-Corruption'/.test(R("issue-map.js")), "gov_transparency is the existing Transparency & Anti-Corruption leaf");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the sponsors are the record's");
// ═════════════════════════════════════════════════════════════════════════════
const ROLE = { s: "sponsor", c: "cosponsor" };
const surname = (p) => (/^(?:Rep\.|Sen\.)\s*([^,]+),/.exec(p.n) || [, ""])[1].toLowerCase();
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
for (const b of BILLS) {
  const k = `119|${b.n}`, d = DOCS[k], rec = RECORDS[k];
  const pageSet = Object.entries(d.sp || {}).flatMap(([r, ids]) => ids.map((id) => `${ROLE[r]}:${id}`)).sort();
  const migSet = positionsOf(blockOf(b.n)).map(([r, id]) => `${r}:${id}`).sort();
  eq(JSON.stringify(migSet), JSON.stringify(pageSet), `${b.n}: the sponsorship rows are the page's sponsors`);
  eq(Object.values(d.sp || {}).flat().length + Object.values(d.su || {}).reduce((a, x) => a + x, 0), rec.sp.length,
    `${b.n}: everyone on the record is accounted for`);
  for (const [r, id] of positionsOf(blockOf(b.n))) {
    ok(PEOPLE[id], `${id} is a roster file`);
    ok(rec.sp.some((p) => p.r === r && PEOPLE[id] && fold(PEOPLE[id].n).includes(fold(surname(p)))), `${b.n}: ${id} is a ${r} the record names`);
    const refs = (PB.people || {})[id] || [];
    const hit = refs.find(([i]) => PB.bills[i] && `${PB.bills[i][0]}|${PB.bills[i][1]}` === k);
    ok(hit && hit[1] === r[0] && PB.bills[hit[0]][4] === "pending", `${b.n} is on ${id}'s file as ${r}, under Pending`);
  }
}
eq(positionsOf(blockOf("H.R. 9694")).length, 8, "H.R. 9694 has its sponsor and seven co-sponsors");
eq(positionsOf(blockOf("S. 5005")).length, 2, "S. 5005 has its sponsor and one co-sponsor");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · on the member's file");
// ═════════════════════════════════════════════════════════════════════════════
for (const f of ["netlify/functions/voting-record.mts", "netlify/lib/vr-pack.ts"]) {
  const src = R(f);
  const pos = src.slice(src.indexOf('kind: "position"'));
  ok(/congress: p\.congress \?\? null,/.test(pos.slice(0, 2000)), `${f}: a position row carries its measure's congress`);
  ok(/congress: vrMeasures\.congress,/.test(src), `${f}: the position read selects vr_measures.congress`);
}
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
// A sponsorship row exactly as the live read / offline pack shape it.
function positionItem(b, r, congress) {
  const seed = SEED.find((m) => m.number === b.n && m.congress === 119);
  return {
    kind: "position", measureId: 90000 + Number(b.n.replace(/\D/g, "")), measureType: "bill", number: b.n,
    title: "Epstein Files Transparency Act II", chamber: b.ch, status: "introduced",
    date: "2026-07-15T00:00:00.000Z", action: r, actionType: r, position: r, result: null, isParty: null,
    supports: true, isProcedural: false, advanceInverted: false, isAmendment: false, parentMeasureId: null,
    rollcallId: null, congress, session: null, rollNumber: null,
    measureIdent: { session: null, readFrom: "introduced", readFromUrl: seed.issues[0].sourceUrl, officialTitle: null, billUrl: b.cg },
    issues: seed.issues.map((i) => ({ issueKey: i.issueKey, weight: i.weight, isPrimary: i.isPrimary, supportMeaning: i.supportMeaning, rationale: i.rationale })),
    source: { url: `${b.cg}/cosponsors`, label: "Congress.gov" },
  };
}
const rowFor = (pid, num) => (CS.dossierItems(pid, "gov_transparency") || []).find((it) => it.ident === num);
for (const b of BILLS) {
  for (const [r, pid] of positionsOf(blockOf(b.n))) {
    win.PDXVotingRecord.noteMember(pid, (corpus.byMember.get(pid) || []).concat([positionItem(b, r, 119)]));
    const row = rowFor(pid, b.n);
    ok(row, `${b.n} is under Transparency & Anti-Corruption on ${pid}'s file`);
    if (!row) continue;
    ok(row.effLine && row.effLine.length <= 140 && /^Would /.test(row.effLine) && /\.$/.test(row.effLine), `${b.n} has its effect line on ${pid}'s file`);
    eq(row.billSit, "119", `${b.n}'s row on ${pid}'s file knows its congress`);
    eq(row.billNum, b.n, `${b.n}'s row on ${pid}'s file keeps its number as a door`);
    eq(CS.congressGovUrl(row.billNum, row.billSit), b.cg, `${b.n}'s door on ${pid}'s file is its Congress.gov page`);
    ok(/^https:\/\/www\.congress\.gov\//.test(row.url) && row.srcLabel === "Congress.gov", `${b.n}'s source on ${pid}'s file is Congress.gov`);
    const html = CS.dossierLedgerHtml(pid, "gov_transparency") || "";
    ok(html.includes(`href="${b.cg}"`), `${pid}'s Transparency & Anti-Corruption ledger links ${b.n} to Congress.gov`);
  }
}
{
  // Without its congress — the shape position rows had before — the same row
  // has no sitting, so it prints no effect line and no door. This is the fix.
  const b = BILLS[0];
  win.PDXVotingRecord.noteMember("massie", (corpus.byMember.get("massie") || []).concat([positionItem(b, "sponsor", null)]));
  const row = rowFor("massie", b.n);
  ok(row && !row.effLine && !row.billSit, "a sponsorship row with no congress has no effect line and no sitting");
  win.PDXVotingRecord.noteMember("massie", (corpus.byMember.get("massie") || []).concat([positionItem(b, "sponsor", 119)]));
}
{
  // H.R. 4405 still reads its own line on Massie's file.
  const row = rowFor("massie", "H.R. 4405");
  ok(row && /Epstein investigation records/.test(row.effLine || ""), "H.R. 4405 still carries its own effect line on massie's file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · search");
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
for (const b of BILLS) ok(ROWS.some((r) => r[0] === "119" && r[1] === b.n && r[2] === "Epstein Files Transparency Act II"), `${b.n} is in the eye's bill index under its title`);
const search = bootEye(ROWS);
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const page = (n) => `/b/119/${encodeURIComponent(n)}`;
const want = {
  "epstein": ["H.R. 4405", "H.R. 9694", "S. 5005"],
  "epstein 2": ["H.R. 9694", "S. 5005"],
  "transparency act": ["H.R. 9694", "S. 5005"],
};
for (const [q, nums] of Object.entries(want)) {
  const got = hrefs(search(q));
  for (const n of nums) ok(got.includes(page(n)), `"${q}" finds ${n}`);
  console.log(`      "${q}" → ${got.filter((h) => /4405|9694|5005/.test(h)).map(decodeURIComponent).join(", ")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · H.R. 4405 is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headSeed = gitShow("db/vr-issue-seed.json"), headDocs = gitShow("db/bill-docs.json"), headCons = gitShow("consistency.js");
  if (headSeed === null) console.log("      (no git baseline)");
  else {
    const pick = (ms) => JSON.stringify(ms.filter((m) => m.number === "H.R. 4405"));
    eq(pick(SEED), pick(JSON.parse(headSeed).measures), "H.R. 4405's seed entry");
    eq(JSON.stringify(DOCS["119|H.R. 4405"]), JSON.stringify(JSON.parse(headDocs).docs["119|H.R. 4405"]), "H.R. 4405's bill page");
    const lines = (src) => (src.match(/'H\.R\. 4405\|119\|[a-z_]+':\s*(?:\{[\s\S]*?\n    \}|\n?\s*'[^']*')/g) || []).join("\n");
    ok(lines(R("consistency.js")) && lines(R("consistency.js")) === lines(headCons), "H.R. 4405's effect line and mechanism");
    const headMig = gitShow("netlify/database/migrations/20260820000000_vr_landmark_enacted_law_rollcalls.sql");
    ok(headMig === R("netlify/database/migrations/20260820000000_vr_landmark_enacted_law_rollcalls.sql"), "H.R. 4405's migration");
  }
  ok(!/'H\.R\. 4405'/.test(SQL.replace(/^--.*$/gm, "")), "the new migration's SQL does not touch H.R. 4405");
}

console.log(`\n   ${failures.length ? "✗" : "✓"} epstein files act II: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`      ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
