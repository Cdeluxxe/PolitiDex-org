#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-obbba-hr1.mjs — H.R. 1 (119th), the One Big Beautiful Bill Act (Public
// Law 119-21): its sponsor on file, the eleven topics its enacted text touches
// that were not, and its fourteen rows left exactly as they were
// ─────────────────────────────────────────────────────────────────────────────
// 20261124000000_vr_obbba_hr1_full_lens.sql adds the sponsorship row the
// official record names, eleven secondary issue rows and one provision row per
// new topic. What must stay true:
//
//   1. NOTHING ALREADY FILED MOVED. The fourteen rows keep their weight,
//      primary flag and polarity (the migration verifies each); the seed's five
//      H.R. 1 rows, every stored effect line and _DOS_MECH are as at HEAD; the
//      migration updates and deletes nothing; no issue key is added.
//   2. THE NEW ROWS. Eleven, every one secondary, at the weight and polarity
//      written here; each quotes its section of the public law, owns a
//      provision row naming it, and has one effect line that passes the row
//      rule. Every one of the twenty-five topics rests on a provision row or a
//      co-read note (the 20260923000000 citation standard).
//   3. THE SPONSOR IS THE RECORD'S. One row, Rep. Arrington; the record lists no
//      co-sponsors, and the bill page names nobody else.
//   4. ON THE SPONSOR'S FILE. The sponsorship row, in the shape the live read
//      and the offline pack emit, sits under all twenty-five topics with that
//      topic's effect line and a Congress.gov door.
//   5. SEARCH. The eye answers "One Big Beautiful Bill", "H.R. 1", "OBBB" and
//      the act's headline topics with the bill's page, naming its topics.
//
//   node scripts/test-obbba-hr1.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { measureAddresses } from "./vr-measure-addresses.mjs";
import { hr1CorpusCitations } from "./vr-audit-hr1-citations.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ obbba: STALE HARNESS — ${m}`); process.exit(2); };
const gitShowAt = (rev, f) => {
  try { return execFileSync("git", ["show", `${rev}:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};
const gitShow = (f) => gitShowAt("HEAD", f);
// THE COMMIT THIS PASS WAS BUILT ON (the parent of 5f25a93, which added
// 20261124000000_vr_obbba_hr1_full_lens.sql). "No line was stored before this
// pass" is a claim about THAT tree; once the pass landed, HEAD holds the lines.
const PRE_PASS = "1122b00";

const K = "119|H.R. 1", NUM = "H.R. 1";
const CG = "https://www.congress.gov/bill/119th-congress/house-bill/1";
const PLAW = "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm";
const MIG = "netlify/database/migrations/20261124000000_vr_obbba_hr1_full_lens.sql";
const SQL = R(MIG), BODY = SQL.replace(/^\s*--.*$/gm, "");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const RECORDS = JSON.parse(R("db/bill-record.json")).records;
const PB = JSON.parse(R("person-bills.json"));
const PEOPLE = JSON.parse(R("db/share-index.json")).people;
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures;
const D = DOCS[K], REC = RECORDS[K];
must(D && REC, "H.R. 1 has a bill page and an official record");
const tableOf = (src, name) => {
  const at = src.indexOf(`var ${name} = {`), end = src.indexOf("\n  };", at);
  return vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")");
};
const CONS = R("consistency.js");
const E = tableOf(CONS, "_DOS_EFFECT"), MECH = tableOf(CONS, "_DOS_MECH");
// The fourteen rows already filed, as they stood before this pass.
const WAS = {
  lower_taxes: [100, true, "yea_supports"], cut_spending: [70, false, "yea_supports"],
  national_debt: [65, false, "yea_opposes"], tax_middle_class: [60, false, "yea_supports"],
  healthcare: [60, false, "yea_opposes"], border_security: [55, false, "yea_supports"],
  climate_action: [55, false, "yea_opposes"], deportations: [50, false, "yea_supports"],
  energy_production: [45, false, "yea_supports"], strong_defense: [45, false, "yea_supports"],
  family_support: [45, false, "yea_supports"], edu_college_cost: [40, false, "yea_opposes"],
  lands_energy: [40, false, "yea_supports"], school_choice: [35, false, "yea_supports"],
};
// The eleven this pass adds: [weight, polarity, the section its rationale must quote,
// and — where it differs — the section its provision row is anchored to].
const NEW = {
  gov_services: [50, "yea_opposes", "Sec. 71119", "Sec. 10105"], rural_ag: [40, "yea_supports", "Sec. 10301"],
  lands_preserve: [30, "yea_opposes", "Sec. 50104"], child_care: [30, "yea_supports", "Sec. 70404"],
  health_drug_prices: [25, "yea_opposes", "Sec. 71203"], pro_life: [25, "yea_supports", "Sec. 71113"],
  housing_support: [25, "yea_supports", "Sec. 70422"], econ_corp_account: [20, "yea_opposes", "Sec. 30001"],
  econ_smallbiz: [20, "yea_supports", "Sec. 70433"], permitting_reform: [20, "yea_supports", "Sec. 60026"],
  water_storage: [15, "yea_supports", "Sec. 50501"],
};
const KEYS = [...Object.keys(WAS), ...Object.keys(NEW)];
// Three of the fourteen print a vote row's line from their stored did, which the
// fiscal pass recorded and pins. _dosMechFor gives a sponsorship row no mechanism
// (it describes a ballot), so on the sponsor's file these three print no line.
const DID_ONLY = ["border_security", "healthcare", "lands_energy"];
const lineOf = (k) => E[`${NUM}|119|${k}`] || (MECH[`${NUM}|119|${k}`] && MECH[`${NUM}|119|${k}`].did) || "";
const rowRule = (s) => s.length > 0 && s.length <= 140 && /[.!?]$/.test(s) && !/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing already filed moved");
// ═════════════════════════════════════════════════════════════════════════════
ok(!/\bUPDATE\b|\bDELETE\b/i.test(BODY), "the migration updates and deletes nothing");
ok(!/INSERT INTO vr_measures\b|INSERT INTO vr_rollcalls|INSERT INTO vr_member_votes/i.test(BODY), "the migration creates no measure, roll call or vote");
ok(/RAISE EXCEPTION 'OBBBA: H\.R\. 1 \(119, house\) is not in vr_measures/.test(SQL), "a missing measure RAISEs instead of being created");
for (const [k, [w, p, s]] of Object.entries(WAS)) {
  const re = new RegExp(`issue_key = '${k}'\\s+AND weight = ${w} AND ${p ? "" : "NOT "}is_primary AND support_meaning = '${s}'`);
  ok(re.test(BODY), `the migration verifies ${k} still reads ${w}, ${p ? "primary" : "secondary"}, ${s}`);
  ok(rowRule(lineOf(k)), `${k}: it already prints an effect line on a member's file (${lineOf(k).length})`);
  if (DID_ONLY.includes(k)) {
    ok(!(`${NUM}|119|${k}` in E), `${k}: still prints from its own did — db/vr-fiscal-effect-lines.json records it so, and no line is stored over it`);
  }
}
ok(/WHERE measure_id = m_id AND is_primary;\s*IF n <> 1/.test(BODY), "the migration verifies lower_taxes is still the one primary label");
{
  const seedNow = SEED.find((m) => m.number === NUM && m.congress === 119);
  eq(seedNow.issues.map((i) => i.issueKey).join(","), "lower_taxes,cut_spending,healthcare,border_security,lands_energy", "the seed still carries H.R. 1's five rows and no new one");
  eq(seedNow.issues.filter((i) => i.isPrimary).map((i) => i.issueKey).join(","), "lower_taxes", "lower_taxes is the seed's one primary label");
  const head = gitShow("db/vr-issue-seed.json"), headCons = gitShow("consistency.js");
  if (head === null) console.log("      (no git baseline)");
  else {
    const was = JSON.parse(head).measures.find((m) => m.number === NUM && m.congress === 119);
    eq(JSON.stringify(seedNow), JSON.stringify(was), "seed: H.R. 1 is byte-identical to HEAD");
    const HE = tableOf(headCons, "_DOS_EFFECT");
    for (const [k, v] of Object.entries(HE)) if (k.startsWith(`${NUM}|119|`)) eq(E[k], v, `effect line ${k} is unchanged`);
    const preCons = gitShowAt(PRE_PASS, "consistency.js");
    must(preCons !== null, `the pre-pass commit ${PRE_PASS} is unreadable, so "before this pass" could not be checked`);
    const PE = tableOf(preCons, "_DOS_EFFECT");
    for (const k of Object.keys(NEW)) ok(!(`${NUM}|119|${k}` in PE), `${k}: no line was stored before this pass`);
    ok(JSON.stringify(MECH) === JSON.stringify(tableOf(headCons, "_DOS_MECH")), "_DOS_MECH is unchanged");
    for (const k of Object.keys(NEW)) ok(!(`${NUM}|119|${k}` in MECH), `${k}: no did is stored for it — its line is in _DOS_EFFECT`);
    ok(gitShow("issue-map.js") === R("issue-map.js"), "issue-map.js is unchanged: no new issue key");
  }
  const addr = measureAddresses(ROOT).published.find((a) => a.sitting === "119" && a.number === NUM);
  eq(JSON.stringify([...addr.issues].sort()), JSON.stringify([...KEYS].sort()), "the migrations map H.R. 1 to its fourteen keys plus the eleven new ones");
  const VALID = new Set(JSON.parse(R("db/issue-keys.json")).keys);
  for (const k of Object.keys(NEW)) ok(VALID.has(k), `${k} is an existing issue key`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the new rows");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ins = [...BODY.matchAll(/\(m_id, '([a-z_]+)', (\d+), (true|false), '(yea_\w+)',\s*'((?:[^']|'')*)',\s*'([^']+)'\)/g)];
  eq(ins.length, Object.keys(NEW).length, "eleven issue rows are inserted");
  for (const [, k, w, p, s, rat, src] of ins) {
    const want = NEW[k];
    ok(want, `${k} is one of the eleven this pass declares`);
    if (!want) continue;
    eq(`${w} ${p} ${s}`, `${want[0]} false ${want[1]}`, `${k}: weight ${want[0]}, secondary, ${want[1]}`);
    ok(rat.includes(want[2]), `${k}: its rationale quotes ${want[2]}`);
    eq(src, PLAW, `${k}: its source is the public law's text`);
    ok(!(k in WAS), `${k} is not already on file`);
  }
  const C = hr1CorpusCitations();
  eq(C.mappings.size, KEYS.length, "the corpus holds twenty-five H.R. 1 mappings");
  for (const k of Object.keys(NEW)) {
    ok(C.owned.has(k), `${k}: a provision row names its section`);
    const prov = [...C.provisions.values()].find((p) => p.issue_key === k && p.firstSeenIn === MIG.split("/").pop());
    ok(prov && prov.support_meaning === NEW[k][1] && prov.source_url === PLAW && prov.description.includes(NEW[k][3] || NEW[k][2]), `${k}: its provision row cites ${NEW[k][3] || NEW[k][2]} with the row's polarity`);
    const line = E[`${NUM}|119|${k}`] || "";
    ok(rowRule(line), `${k}: its effect line is one sentence of ≤140 characters (${line.length})`);
    ok(/^(?:Permanently )?(?:[A-Z][a-z]+ed|[a-z]+ed|Cut|Let)\b/.test(line) && !/^(?:Would|Proposed)\b/.test(line), `${k}: its effect line has the enacted act as its subject, in the past tense`);
    ok(D.m.some((m) => m.k === k && m.l === line), `${k}: the bill page lists it with that line`);
  }
  for (const k of Object.keys(WAS)) ok(C.owned.has(k) || /Also read under:/.test([...C.provisions.values()].map((p) => p.description).join(" ")), `${k}: still cited`);
  const sorts = [...BODY.matchAll(/VALUES \(m_id, '[^']+', '(?:[^']|'')*', '[a-z_]+', 'yea_\w+', '[^']+', (\d+)\);/g)].map((m) => +m[1]);
  eq(sorts.length, Object.keys(NEW).length, "eleven provision rows are inserted");
  ok(sorts.every((n) => n >= 120), "the new provisions take unused sort orders, so no existing row is renumbered");
  eq(D.m.length, KEYS.length, "the bill page lists all twenty-five topics");
  ok(D.rs === CG, "the bill page links its Congress.gov record");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the sponsor is the record's");
// ═════════════════════════════════════════════════════════════════════════════
const positions = [...SQL.matchAll(/\(m_id, '([a-z_]+)', '(sponsor|cosponsor)', true,/g)].map((m) => [m[2], m[1]]);
{
  eq(JSON.stringify(REC.sp.map((p) => [p.r, p.n])), JSON.stringify([["sponsor", "Rep. Arrington, Jodey C. [R-TX-19]"]]), "the official record lists one sponsor and no co-sponsors");
  eq(JSON.stringify(D.sp), JSON.stringify({ s: ["arrington"] }), "the bill page names Arrington and nobody else");
  eq(JSON.stringify(positions), JSON.stringify([["sponsor", "arrington"]]), "the migration files one sponsorship row, Arrington's");
  ok(PEOPLE.arrington && /Arrington/.test(PEOPLE.arrington.n), "arrington is a roster file");
  ok(/TIMESTAMPTZ '2025-05-20T00:00:00Z'/.test(SQL) && REC.in === "2025-05-20", "the row is dated the day the measure was reported");
  const hit = ((PB.people || {}).arrington || []).find(([i]) => PB.bills[i] && `${PB.bills[i][0]}|${PB.bills[i][1]}` === K);
  ok(hit && hit[1] === "s" && PB.bills[hit[0]][3] === "enacted", `${NUM} is on Arrington's file as sponsor, under Enacted`);
  ok(/Became Public Law No: 119-21\./.test(REC.a.map((a) => a.x).join(" ")), "the record reads Public Law 119-21");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · on the sponsor's file, under every mapped topic");
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
const ISSUES = [
  ...Object.entries(WAS).map(([k, [w, , s]]) => ({ issueKey: k, weight: w, supportMeaning: s })),
  ...Object.entries(NEW).map(([k, [w, s]]) => ({ issueKey: k, weight: w, supportMeaning: s })),
];
const positionItem = {
  kind: "position", measureId: 90001, measureType: "bill", number: NUM, title: "One Big Beautiful Bill Act",
  chamber: "house", status: "enacted", date: "2025-05-20T00:00:00.000Z", action: "sponsor", actionType: "sponsor", position: "sponsor",
  result: null, isParty: null, supports: true, isProcedural: false, advanceInverted: false, isAmendment: false,
  parentMeasureId: null, rollcallId: null, congress: 119, session: null, rollNumber: null, measureIdent: null,
  issues: ISSUES, source: { url: `${CG}/cosponsors`, label: "Congress.gov" },
};
win.PDXVotingRecord.noteMember("arrington", (corpus.byMember.get("arrington") || []).concat([positionItem]));
for (const k of KEYS) {
  const rows = (CS.dossierItems("arrington", k) || []).filter((it) => it.ident === NUM && /\/cosponsors$/.test(it.url || ""));
  ok(rows.length === 1, `${NUM} sits under ${k} on Arrington's file as sponsor`);
  const row = rows[0];
  if (!row) continue;
  if (DID_ONLY.includes(k)) eq(row.effLine || "", "", `${k}: the sponsorship row prints no line — its line lives in the did a vote row reads`);
  else {
    eq(row.effLine, lineOf(k), `${k}: the row carries its effect line`);
    ok(rowRule(row.effLine || ""), `${k}: the line passes the row rule`);
  }
  eq(CS.congressGovUrl(row.billNum, row.billSit), CG, `${k}: the row's door is its Congress.gov page`);
  ok((CS.dossierLedgerHtml("arrington", k) || "").includes(`href="${CG}"`), `${k}: the ledger links ${NUM} to Congress.gov`);
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
ok(ROW && /One Big Beautiful Bill Act/.test(ROW[2]), "H.R. 1 is in the eye's bill index under its title");
eq(ROW && JSON.stringify([...ROW[5]].sort()), JSON.stringify([...KEYS].sort()), "the index row carries all twenty-five topics");
const INLINE = (() => { const w = {}; vm.runInNewContext(R("bills-index.js"), { window: w }); return w.PDX_BILLS_INDEX; })();
const CARD = INLINE.find((b) => b.number === NUM && b.congress === 119);
ok(CARD && /\bobbb\b/.test(CARD.keywords) && /\bobbba\b/.test(CARD.keywords), "the curated index carries the OBBB and OBBBA shorthand");
eq(CARD && JSON.stringify([...CARD.issueKeys].sort()), JSON.stringify([...KEYS].sort()), "the curated card carries all twenty-five topics");
eq(CARD && CARD.primaryIssue, "lower_taxes", "the curated card's label is unchanged");
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const PAGE = `/b/119/${encodeURIComponent(NUM)}`;
// The act's own topic labels, as a reader picks them off the bill page, and the
// plain terms readers type for its headline provisions. One label is left out on
// purpose: "Peace Through Strength" ranks six defense-only bills (the NDAAs) above
// a twenty-five-topic act, which is the right order, and no keyword is added to
// beat them.
const TOPICS = [
  "Cut Income & Business Taxes", "Cut Federal Spending & Reduce Debt", "Tackle the National Debt",
  "Middle-Class Tax Relief", "Expand Healthcare Access", "Strong Border & Enforcement",
  "Climate Action & Clean Energy", "Mass Deportations & Border Security", "Expand Domestic Energy Production",
  "Help Families with Kids", "Lower College & Trade Costs", "Energy & Resource Development",
  "School Choice & Education Freedom",
  "tax cuts", "child tax credit", "no tax on tips", "Medicaid", "SNAP", "debt limit", "border", "clean energy",
];
const QUERIES = [["page index", bootEye(ROWS), ["One Big Beautiful Bill", "H.R. 1"]],
  ["page + curated index", bootEye(ROWS, INLINE), ["One Big Beautiful Bill", "H.R. 1", "OBBB", "OBBBA", ...TOPICS]]];
for (const [label, search, qs] of QUERIES) {
  for (const q of qs) {
    const html = search(q), got = hrefs(html);
    ok(got.includes(PAGE), `${label}: "${q}" finds ${NUM}`);
    console.log(`      ${label}: "${q}" → ${NUM} at row ${got.indexOf(PAGE) + 1} of ${got.length}`);
    const a = String(html).split('<a role="option"').find((x) => x.includes(`href="${PAGE}"`)) || "";
    ok(/\+\d+ of 25 topics/.test(a), `${label}: "${q}" — the result counts the bill's twenty-five topics`);
  }
}

console.log(`\n   ${failures.length ? "✗" : "✓"} obbba: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log(`      ✗ ${f.slice(0, 300)}`);
process.exit(failures.length ? 1 : 0);
