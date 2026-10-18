#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-stop-insider-trading.mjs — H.R. 7008 (119th), the Stop Insider Trading
// Act: its two rows, a short line on each, its bill page, its drawers, and the
// eye's answer to the words readers type for it
// ─────────────────────────────────────────────────────────────────────────────
// H.R. 7008 passed the House 232-198 (roll 280, 2026-07-22) and failed cloture
// on the motion to proceed in the Senate 53-47 (record vote 253, 2026-09-30).
// It is mapped by 20260724140000_seed_house_119_s2_voting_record and by no
// other migration:
//
//   stock_trading_ban  100 primary   yea_supports
//   gov_transparency    60 secondary yea_supports
//
// Both pairs already print a short line, so this pass adds no line, no row and
// no migration. Read against the vocabulary and NOT filed:
//
//   congress_oversight — its chip is "Make the executive branch answer
//     congressional subpoenas, document requests and testimony": a who-decides
//     key between Congress and the executive. Penalties and forced sales on a
//     Member's own trades are ethics rules on Congress itself, which is
//     gov_transparency's written IN ("toughen ethics rules"), already filed.
//   reform_balance — the practical-reform blend; gov_transparency's own scope
//     lists it OUT, and a blend key takes no single-mechanism vote.
//   term_limits, campaign_finance — the bill touches neither tenure nor
//     campaign money (gov_transparency's OUT list names both apart).
//   econ_corp_account — the ban binds Members and their households, not
//     corporations.
//
// What this pass ships is the Legislation library's curated card, so the eye
// answers "members of Congress", "ethics", "stocks", "stock ban" and
// "financial disclosure" with the bill. The Senate cloture vote is on the
// official record but not in the voting archive (no roll call or member
// positions are on file for it), so drawers carry the two House rolls only.
//
//   1. NOTHING MOVED: the seed's rows and every stored line are as at HEAD;
//      no migration names H.R. 7008 after its seed; no issue key is added.
//   2. THE MAPPINGS: exactly the two rows above, in the seed and the applied
//      migrations alike; the refused keys are real and unmapped.
//   3. THE LINE RULE on both lines: one sentence, ≤140 characters, opens
//      "Would" (not law), no method word, no ellipsis, no title, ends on the
//      House tally the record holds.
//   4. THE BILL PAGE: the document and bill-official.json carry each line;
//      the panel booted with bill.html's scripts prints it under each chip
//      with the right direction, the longer rationale behind a closed "More".
//   5. THE DRAWERS: every rostered yea or nay on roll 280 (and 279) sees the
//      vote under both topics with that topic's line and a Congress.gov door.
//   6. SEARCH: the eye returns the bill's page for the expected queries.
//   7. MUTATIONS: an over-long line, two sentences, a method word, a title
//      fallback, a flipped direction, a reweight and congress_oversight
//      slipped in each fail.
//
//   node scripts/test-stop-insider-trading.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
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
const must = (c, m) => { if (c) return; console.error(`✗ stop insider trading: STALE HARNESS — ${m}`); process.exit(2); };
const gitShow = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

const K = "119|H.R. 7008", NUM = "H.R. 7008", TITLE = "Stop Insider Trading Act";
const CG = "https://www.congress.gov/bill/119th-congress/house-bill/7008";
const SEED_MIG = "20260724140000_seed_house_119_s2_voting_record.sql";
const MAPPED = {
  stock_trading_ban: [100, true, "yea_supports"],
  gov_transparency: [60, false, "yea_supports"],
};
const KEYS = Object.keys(MAPPED);
const DECLINED = ["congress_oversight", "reform_balance", "term_limits", "campaign_finance", "econ_corp_account"];
const ROLLS = [280, 279];

const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const OFFICIAL = R("bill-official.json");
const EFFECTS = JSON.parse(OFFICIAL).effects || {};
const REC = JSON.parse(R("db/bill-record.json")).records[K];
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures;
const D = DOCS[K];
must(D && REC, "H.R. 7008 has a bill page and an official record");
const seedOf = (seed = SEED) => seed.find((m) => m.number === NUM && m.congress === 119);
must(seedOf(), "H.R. 7008 is in the seed");
const tableOf = (src, name) => {
  const at = src.indexOf(`var ${name} = {`), end = src.indexOf("\n  };", at);
  return vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")");
};
const CONS = R("consistency.js");
const E = tableOf(CONS, "_DOS_EFFECT");
const lineOf = (k) => E[`${NUM}|119|${k}`] || "";

// ── the checks, as functions, so section 7 can feed them bad input ──────────
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|direction match|pole|this bill)\b|PolitiDex|…|\.\.\./i;
const RUNTIME_METHOD = (() => {
  const m = /var _DOS_EFFECT_METHOD = (\/.*\/i);/.exec(CONS);
  must(m, "consistency.js still declares _DOS_EFFECT_METHOD");
  return vm.runInNewContext(m[1]);
})();
const TALLY = (() => {
  const m = /Passed by the Yeas and Nays: (\d+) - (\d+) \(Roll no\. 280\)/.exec(REC.a.map((a) => a.x).join(" "));
  must(m, "the record holds the House passage tally");
  return `${m[1]}-${m[2]}`;
})();
function lineFault(s) {
  if (typeof s !== "string" || !s) return "no line";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on its stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  if (METHOD.test(s) || RUNTIME_METHOD.test(s)) return "a method word";
  if (s.toLowerCase().includes(TITLE.toLowerCase())) return "the bill's title";
  if (/^(?:This|The bill|It)\b/.test(s) || !/^Would\b/.test(s)) return "the act is not the subject, in the unenacted tense";
  if (!s.endsWith(`the House passed it ${TALLY}.`)) return "not ending on the House tally";
  return "";
}
// The rows the migrations write for H.R. 7008, read from SQL text.
function migrationRows(files) {
  const out = [];
  for (const [f, src] of files) {
    for (const m of src.replace(/^\s*--.*$/gm, "").matchAll(/VALUES \(m_h_r_7008, '([a-z_]+)', (\d+), (true|false), '(yea_\w+)'/g)) out.push({ f, k: m[1], w: +m[2], p: m[3] === "true", s: m[4] });
  }
  return out;
}
function mappingFault(issues, rows) {
  const out = [];
  const shape = (k, w, p, s) => `${k} ${w} ${p} ${s}`;
  const want = Object.entries(MAPPED).map(([k, [w, p, s]]) => shape(k, w, p, s)).sort().join(" | ");
  const fromSeed = issues.map((i) => shape(i.issueKey, i.weight, i.isPrimary, i.supportMeaning)).sort().join(" | ");
  const fromSql = rows.map((r) => shape(r.k, r.w, r.p, r.s)).sort().join(" | ");
  if (fromSeed !== want) out.push(`seed reads ${fromSeed}`);
  if (fromSql !== want) out.push(`migrations read ${fromSql}`);
  for (const k of DECLINED) if (issues.some((i) => i.issueKey === k) || rows.some((r) => r.k === k)) out.push(`${k} is mapped`);
  return out;
}
const MIG_DIR = join(ROOT, "netlify/database/migrations");
const SQLS = readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort().map((f) => [f, readFileSync(join(MIG_DIR, f), "utf8")]);
const ROWS_SQL = migrationRows(SQLS);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const naming = SQLS.filter(([, s]) => /'H\.R\. 7008'|m_h_r_7008/.test(s)).map(([f]) => f);
  eq(JSON.stringify(naming), JSON.stringify([SEED_MIG]), "one migration names H.R. 7008, its seed; no later pass rewrites it");
  const head = gitShow("db/vr-issue-seed.json"), headCons = gitShow("consistency.js");
  if (head === null || headCons === null) console.log("      (no git baseline)");
  else {
    eq(JSON.stringify(seedOf()), JSON.stringify(seedOf(JSON.parse(head).measures)), "seed: H.R. 7008 is byte-identical to HEAD");
    const HE = tableOf(headCons, "_DOS_EFFECT");
    for (const k of KEYS) eq(lineOf(k), HE[`${NUM}|119|${k}`], `${k}: its line is the one already shipped`);
    ok(gitShow("issue-map.js") === R("issue-map.js"), "issue-map.js is unchanged: no new issue key");
    ok(gitShow("db/issue-keys.json") === R("db/issue-keys.json"), "db/issue-keys.json is unchanged");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the mappings");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(JSON.stringify(mappingFault(seedOf().issues, ROWS_SQL)), "[]", "the seed and the migrations hold exactly stock_trading_ban 100 primary and gov_transparency 60, both yea_supports");
  const addr = measureAddresses(ROOT).published.find((a) => a.sitting === "119" && a.number === NUM);
  eq(JSON.stringify([...addr.issues].sort()), JSON.stringify([...KEYS].sort()), "the applied migrations resolve to the two keys");
  const VALID = new Set(JSON.parse(R("db/issue-keys.json")).keys);
  for (const k of [...KEYS, ...DECLINED]) ok(VALID.has(k), `${k} is an existing issue key`);
  const IM = R("issue-map.js");
  ok(/congress_oversight:\s*\{[^}]*chip: 'Make the executive branch answer congressional subpoenas/.test(IM), "congress_oversight is still the executive-answers-to-Congress key it was refused as");
  ok(/gov_transparency:\s*\{[^}]*toughen ethics rules/.test(IM), "gov_transparency still carries member ethics rules, where the bill's penalties sit");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the line rule, on both topics");
// ═════════════════════════════════════════════════════════════════════════════
for (const k of KEYS) eq(lineFault(lineOf(k)), "", `${k}: "${lineOf(k)}" (${lineOf(k).length})`);
ok(lineOf("stock_trading_ban") !== lineOf("gov_transparency"), "each topic's line is its own");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the bill page");
// ═════════════════════════════════════════════════════════════════════════════
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
{
  let fresh = true;
  try { execFileSync(process.execPath, [join(ROOT, "scripts/gen-bill-docs.mjs"), "--check"], { stdio: "pipe" }); } catch { fresh = false; }
  ok(fresh, "db/bill-docs.json, bill-search-index.js and bill-official.json are current with their generator");
  eq(JSON.stringify(D.m.map((m) => m.k).sort()), JSON.stringify([...KEYS].sort()), "the bill page lists the two topics");
  for (const k of KEYS) {
    ok(D.m.some((m) => m.k === k && m.l === lineOf(k)), `${k}: the bill page prints its short line`);
    eq((EFFECTS[K] || {})[k], lineOf(k), `${k}: bill-official.json's effects carry the same line`);
  }
  eq(D.st, "passed_house", "the page's status is the record's");
  eq(D.rs, CG, "the bill page links its Congress.gov record");
  ok(R("sitemap.xml").includes(`/b/119/${encodeURIComponent(NUM)}<`) && R("bill-pages.js").includes(`"119/${NUM}": 1`), "the page is in the sitemap and the drawer's page list");
}
const BILL_HTML = R("bill.html"), BD_SRC = R("bill-detail.js");
const DOC_SCRIPTS = [...BILL_HTML.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
const ORIGIN = "https://politidex.fyi";
async function panel(official = OFFICIAL, issues = seedOf().issues) {
  const win = makeSandbox();
  win.__PDX_BILL_DOC = true;
  const p = "/b/119/" + encodeURIComponent(NUM);
  win.location = { href: ORIGIN + p, pathname: p, search: "", hash: "", origin: ORIGIN };
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  win.fetch = (u) => String(u) === "/bill-official.json"
    ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(official)) })
    : Promise.reject(new Error("offline"));
  const ctx = vm.createContext(win);
  for (const f of DOC_SCRIPTS) vm.runInContext(f === "bill-detail.js" ? BD_SRC : R(f), ctx, { filename: f });
  const data = {
    measure: { id: 7008, number: NUM, congress: 119, chamber: "house", status: "passed_house", title: TITLE },
    issues: issues.map((i) => ({ issueKey: i.issueKey, supportMeaning: i.supportMeaning, rationale: i.rationale })),
    rollcalls: [], positions: [], provisions: [], actions: [],
  };
  win.PDXBills = { get: () => Promise.resolve(data), list: () => Promise.resolve({ items: [] }), listSync: () => ({ items: [] }), isFollowed: () => false };
  for (let pass = 0; pass < 2; pass++) {
    win.PDXBillDetail.open(data.measure.id);
    for (let i = 0; i < 40; i++) await Promise.resolve();
  }
  return capture.innerHTML;
}
const panelRows = (h) => [...h.matchAll(/<div class="bd-omni-row[^"]*"[^>]*>([\s\S]*?)(?=<div class="bd-omni-row|<\/div><\/div><\/section>)/g)].map((m) => m[1]);
function panelFaults(html) {
  const out = [], rows = panelRows(html);
  if (rows.length !== KEYS.length) out.push(`${rows.length} topic rows for ${KEYS.length} keys`);
  for (const r of rows) {
    const k = (/data-issue="([^"]+)"/.exec(r) || [])[1];
    const eff = unescape((/<div class="bd-omni-eff" data-bd-eff-for="[^"]+">([^<]*)<\/div>/.exec(r) || [])[1] || "");
    if (eff !== lineOf(k)) out.push(`${k}: the default text under the chip is not its short line`);
    if (lineFault(eff)) out.push(`${k}: the default text breaks the line rule (${lineFault(eff)})`);
    const opp = /A Yea cuts against this/.test(r), adv = /A Yea advances this/.test(r);
    if (((MAPPED[k] || [])[2] === "yea_opposes") !== opp || opp === adv) out.push(`${k}: the direction chip is wrong`);
    const shut = r.replace(/<details\b(?![^>]*\bopen\b)[^>]*>[\s\S]*?<\/details>/g, "");
    if (/bd-omni-why/.test(shut)) out.push(`${k}: the longer text is visible by default`);
  }
  return out;
}
const PANEL = await panel();
must(PANEL.includes(NUM), "the bill panel rendered");
eq(JSON.stringify(panelFaults(PANEL)), "[]", "booted with bill.html's own scripts, every topic chip carries its short line and direction");
{
  const row = panelRows(PANEL).find((r) => /data-issue="gov_transparency"/.test(r)) || "";
  ok(/<details class="bd-omni-more" data-bd-more><summary class="bd-omni-more-sum">More<\/summary>/.test(row), "gov_transparency: the longer stored rationale sits behind a closed More");
  ok(!/<details[^>]*\bopen\b/.test(PANEL), "no More is open on arrival");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the issue drawers, on every House voter's file");
// ═════════════════════════════════════════════════════════════════════════════
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const corpus = buildCorpus(ROOT);
function bootFiles(cons = CONS) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? cons : R(f), ctx, { filename: f }); } catch (e) { must(false, `${f} boots: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  must(win.PDXConsistency && typeof win.PDXConsistency.dossierItems === "function", "PDXConsistency.dossierItems is exported");
  return win;
}
const VOTERS = [];
for (const roll of ROLLS) {
  const pids = [...corpus.byMember].filter(([, items]) => items.some((it) => it.number === NUM && it.congress === 119 && it.rollNumber === roll && /^(?:yea|nay)$/.test(it.position))).map(([pid]) => pid);
  must(pids.length >= 50, `the corpus holds roll ${roll}'s voters (${pids.length})`);
  for (const pid of pids) VOTERS.push([pid, roll]);
}
function drawerFaults(win, list, keys = KEYS) {
  const CS = win.PDXConsistency, out = [], noted = new Set();
  for (const [pid, roll] of list) {
    if (!noted.has(pid)) { win.PDXVotingRecord.noteMember(pid, corpus.byMember.get(pid)); noted.add(pid); }
    for (const k of keys) {
      const rows = (CS.dossierItems(pid, k) || []).filter((it) => it.ident === NUM && it.item && it.item.rollNumber === roll);
      if (!rows.length) { out.push(`${pid} roll ${roll} ${k}: no row`); continue; }
      for (const row of rows) if (row.effLine !== lineOf(k)) out.push(`${pid} roll ${roll} ${k}: the row carries ${JSON.stringify(row.effLine)}`);
      const html = CS.dossierLedgerHtml(pid, k) || "";
      const esc = lineOf(k).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      if (!html.includes(esc) && !html.includes(lineOf(k))) out.push(`${pid} ${k}: the drawer ledger does not print the short line`);
      if (!html.includes(`href="${CG}"`)) out.push(`${pid} ${k}: the drawer ledger does not link ${NUM} to Congress.gov`);
    }
  }
  return out;
}
{
  const faults = drawerFaults(bootFiles(), VOTERS);
  eq(JSON.stringify(faults.slice(0, 8)), "[]", `on all ${VOTERS.length} voter rows (rolls ${ROLLS.join(" and ")}), ${NUM} sits under both topics with its short line`);
  for (const roll of ROLLS) {
    const on = VOTERS.filter(([, r]) => r === roll).map(([p]) => p);
    const yea = on.filter((p) => corpus.byMember.get(p).some((it) => it.number === NUM && it.rollNumber === roll && it.position === "yea"));
    ok(yea.length > 0 && yea.length < on.length, `roll ${roll}: both sides are in the sample (${yea.length} yea, ${on.length - yea.length} nay)`);
  }
  ok(/Record Vote Number: 253/.test(REC.a.map((a) => a.x).join(" ")), "the Senate cloture vote is on the official record");
  ok(![...corpus.byMember.values()].some((items) => items.some((it) => it.number === NUM && it.chamber === "senate")), "no Senate roll for H.R. 7008 is in the voting archive (none is invented)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · search");
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
  const panelNode = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panelNode, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
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
  return (q) => { input.value = q; w.PDXEye.render(q); return panelNode.innerHTML || ""; };
}
const ROWS = (() => { const w = {}; vm.runInNewContext(R("bill-search-index.js"), { window: w }); return w.PDX_BILL_SEARCH; })();
const ROW = ROWS.find((r) => r[0] === "119" && r[1] === NUM);
ok(ROW && ROW[2] === TITLE, "H.R. 7008 is in the eye's bill index under its title");
eq(ROW && JSON.stringify([...ROW[5]].sort()), JSON.stringify([...KEYS].sort()), "the index row carries the two topics");
const INLINE = (() => { const w = {}; vm.runInNewContext(R("bills-index.js"), { window: w }); return w.PDX_BILLS_INDEX; })();
const CARD = INLINE.find((b) => b.number === NUM && b.congress === 119);
ok(CARD && CARD.title === TITLE && CARD.status === "passed_house" && CARD.source.url === CG, "the Legislation library's curated index carries H.R. 7008 with its record door");
eq(CARD && JSON.stringify([...CARD.issueKeys].sort()), JSON.stringify([...KEYS].sort()), "the curated card carries the two topics");
eq(CARD && CARD.primaryIssue, "stock_trading_ban", "the curated card's label is the primary row's");
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const PAGE = `/b/119/${encodeURIComponent(NUM)}`;
const QUERIES = [
  ["page index", bootEye(ROWS), ["H.R. 7008", "7008", TITLE, "insider trading", "stock trading"]],
  ["page + curated index", bootEye(ROWS, INLINE), [
    "H.R. 7008", "7008", TITLE, "insider trading", "stock trading", "stock trading ban", "congressional stock trading",
    "Ban Congressional Stock Trading", "stock ban", "stocks", "congress stocks", "members of Congress", "ethics",
    "congressional ethics", "financial disclosure", "STOCK Act", "Transparency & Anti-Corruption",
  ]],
];
for (const [label, search, qs] of QUERIES) {
  for (const q of qs) {
    const got = hrefs(search(q));
    ok(got.includes(PAGE), `${label}: "${q}" finds ${NUM}`);
    console.log(`      ${label}: "${q}" → ${NUM} at row ${got.indexOf(PAGE) + 1} of ${got.length}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
{
  const good = lineOf("stock_trading_ban");
  const LINE_MUTANTS = {
    "a line over 140 characters": good.replace("individual stocks;", "individual stocks, with a penalty of at least $2,000 or 10% of the trade;"),
    "a two-sentence line": good.replace("; the House passed it", ". The House passed it"),
    "a method word": good.replace("Would bar", "Weighted 100, would bar"),
    "a method word, mid-line": good.replace("individual stocks", "individual stocks, as mapped"),
    "a title fallback": `Would enact the ${TITLE}; the House passed it ${TALLY}.`,
    "an ellipsis clip": good.replace("; the House passed it", "…; the House passed it"),
    "the bill as subject": good.replace("Would bar", "This bill bars"),
    "an unenacted act written as done": good.replace("Would bar", "Barred"),
  };
  for (const [what, bad] of Object.entries(LINE_MUTANTS)) {
    must(bad !== good, `the "${what}" mutation found its target`);
    ok(lineFault(bad) !== "", `${what} fails the line rule`);
  }
  const sample = VOTERS.slice(0, 2);
  for (const what of ["a line over 140 characters", "a two-sentence line", "a method word"]) {
    const cons = CONS.replace(good, LINE_MUTANTS[what]);
    must(cons !== CONS, `the drawer "${what}" mutation found its target`);
    ok(drawerFaults(bootFiles(cons), sample, ["stock_trading_ban"]).length > 0, `${what} stored fails the drawer check`);
  }
  const off = JSON.parse(OFFICIAL);
  off.effects[K].gov_transparency = LINE_MUTANTS["a method word"];
  ok(panelFaults(await panel(JSON.stringify(off))).length > 0, "a method word on the bill page fails the panel check");

  const seedWith = (fn) => { const s = JSON.parse(JSON.stringify(seedOf().issues)); fn(s); return s; };
  ok(mappingFault(seedWith((s) => { s.find((i) => i.issueKey === "gov_transparency").supportMeaning = "yea_opposes"; }), ROWS_SQL).length > 0, "an incorrect direction in the seed fails the mapping check");
  ok(mappingFault(seedWith((s) => { s.find((i) => i.issueKey === "gov_transparency").weight = 80; }), ROWS_SQL).length > 0, "a changed weight fails");
  ok(mappingFault(seedWith((s) => { s.push({ issueKey: "congress_oversight", weight: 30, isPrimary: false, supportMeaning: "yea_supports" }); }), ROWS_SQL).length > 0, "congress_oversight slipped in fails");
  const flipSql = SQLS.map(([f, s]) => [f, f === SEED_MIG ? s.replace("VALUES (m_h_r_7008, 'stock_trading_ban', 100, true, 'yea_supports'", "VALUES (m_h_r_7008, 'stock_trading_ban', 100, true, 'yea_opposes'") : s]);
  must(flipSql.some(([f, s], i) => s !== SQLS[i][1]), "the flipped-migration mutation found its target");
  ok(mappingFault(seedOf().issues, migrationRows(flipSql)).length > 0, "an incorrect direction in the migration fails the mapping check");
  const wrongChip = PANEL.replace(/(data-issue="stock_trading_ban"[\s\S]*?)A Yea advances this/, "$1A Yea cuts against this");
  must(wrongChip !== PANEL, "the bill-page direction mutation found its target");
  ok(panelFaults(wrongChip).length > 0, "an incorrect direction chip on the bill page fails");
}

console.log(`\n   ${failures.length ? "✗" : "✓"} stop insider trading: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log(`      ✗ ${f.slice(0, 300)}`);
process.exit(failures.length ? 1 : 0);
