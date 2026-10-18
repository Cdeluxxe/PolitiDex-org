#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-hr1181-full-lens.mjs — H.R. 1181 (119th), the Protecting Privacy in
// Purchases Act: its payment-network row, every topic's short line, and the
// three rows already on file left exactly as they were
// ─────────────────────────────────────────────────────────────────────────────
// 20261125000000_vr_hr1181_payment_network_lens.sql adds one secondary
// econ_corp_account row. What must stay true:
//
//   1. NOTHING ALREADY FILED MOVED. gun_rights (100, primary), privacy_rights
//      and states_federal_power (40, yea_opposes) keep their weight, primary
//      flag and polarity (the migration verifies each); the seed, every stored
//      effect line and _DOS_MECH are as at HEAD; the migration updates and
//      deletes nothing; no issue key is added.
//   2. THE MAPPINGS. Exactly four keys: the three above plus econ_corp_account
//      at 30, secondary, yea_supports, read from Sec. 2(a)-(b) of the engrossed
//      text. gun_safety stays declined — by 20260818000000 and again here —
//      and so do the other keys this pass read and refused.
//   3. THE LINE RULE, on all four short lines: one sentence, 140 characters or
//      fewer, the act as subject ("Would", as it is not law), no method word,
//      no ellipsis, never the bill's title, ending on the House tally the
//      record holds.
//   4. THE BILL PAGE. db/bill-docs.json and bill-official.json carry each line
//      under its topic, and the panel booted with bill.html's own scripts
//      prints it by default under each topic chip, the longer stored rationale
//      behind a closed "More".
//   5. THE ISSUE DRAWER. On the file of every rostered member who voted yea or
//      nay on roll 240, the vote sits under each of the four topics carrying
//      that topic's short line, in the drawer's ledger, with its Congress.gov
//      door.
//   6. SEARCH. The eye answers the bill's number, title and the plain terms
//      readers type (gun, firearms, purchase, privacy, MCC, merchant category
//      code, payment network …) with the bill's page; the Legislation library's
//      curated card carries the four topics.
//   7. MUTATIONS. A line over 140 characters, a two-sentence line, a method
//      word, a title fallback, a flipped direction, gun_safety slipped in and a
//      moved existing row must each fail.
//
//   node scripts/test-hr1181-full-lens.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { measureAddresses } from "./vr-measure-addresses.mjs";
import { sliceBlocks, keysAfter } from "./vr-slice-blocks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ hr1181: STALE HARNESS — ${m}`); process.exit(2); };
const gitShow = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

const K = "119|H.R. 1181", NUM = "H.R. 1181", TITLE = "Protecting Privacy in Purchases Act";
const CG = "https://www.congress.gov/bill/119th-congress/house-bill/1181";
const EH = "https://www.govinfo.gov/content/pkg/BILLS-119hr1181eh/html/BILLS-119hr1181eh.htm";
const MIG = "netlify/database/migrations/20261125000000_vr_hr1181_payment_network_lens.sql";
const SQL = R(MIG);
const stripComments = (s) => s.replace(/^\s*--.*$/gm, "");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const OFFICIAL = R("bill-official.json");
const EFFECTS = JSON.parse(OFFICIAL).effects || {};
const RECORDS = JSON.parse(R("db/bill-record.json")).records;
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures;
const D = DOCS[K], REC = RECORDS[K];
must(D && REC, "H.R. 1181 has a bill page and an official record");
const tableOf = (src, name) => {
  const at = src.indexOf(`var ${name} = {`), end = src.indexOf("\n  };", at);
  return vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")");
};
const CONS = R("consistency.js");
const E = tableOf(CONS, "_DOS_EFFECT");
const mine = new Set((sliceBlocks(CONS, "_DOS_EFFECT").find((b) => b.version === 404) || { keys: [] }).keys);

// The three rows on file before this pass, as the live branch holds them
// (privacy_rights' weight is left to the earlier migrations that wrote it).
const WAS = {
  gun_rights: [100, true, "yea_supports"],
  privacy_rights: [null, false, "yea_supports"],
  states_federal_power: [40, false, "yea_opposes"],
};
// What this pass adds.
const NEW = { econ_corp_account: [30, false, "yea_supports"] };
const KEYS = [...Object.keys(WAS), ...Object.keys(NEW)];
// Read and refused, each with its reason in the migration's header.
const DECLINED = ["gun_safety", "gov_regulation", "tech_balance", "econ_smallbiz", "gun_balance"];

// ── the checks, as functions, so section 7 can feed them bad input ──────────
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|direction match|pole|this bill)\b|PolitiDex|…|\.\.\./i;
const RUNTIME_METHOD = (() => {
  const m = /var _DOS_EFFECT_METHOD = (\/.*\/i);/.exec(CONS);
  must(m, "consistency.js still declares _DOS_EFFECT_METHOD");
  return vm.runInNewContext(m[1]);
})();
const TALLY = (() => {
  const m = /Passed by the Yeas and Nays: (\d+) - (\d+) \(Roll no\. 240\)/.exec(REC.a.map((a) => a.x).join(" "));
  must(m, "the record holds the House passage tally");
  return `${m[1]}-${m[2]}`;
})();
function lineFault(s) {
  if (typeof s !== "string" || !s) return "no line";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on its stop";
  if (/[.!?;]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")) && /[.!?]\s/.test(s)) return "more than one sentence";
  if (METHOD.test(s) || RUNTIME_METHOD.test(s)) return "a method word";
  if (s.toLowerCase().includes(TITLE.toLowerCase())) return "the bill's title";
  if (!/^(?:Would|Proposed)\b/.test(s) || /^(?:This|The bill|It)\b/.test(s)) return "the act is not the subject, in the unenacted tense";
  if (!s.endsWith(`the House passed it ${TALLY}.`)) return "not ending on the House tally";
  return "";
}
// The issue rows the migrations write for H.R. 1181, read from SQL text.
function rowsOf(sql) {
  const body = stripComments(sql), out = [];
  for (const m of body.matchAll(/VALUES \(m_id, '([a-z_]+)', (\d+), (true|false),\s*'(yea_\w+)',\s*'((?:[^']|'')*)',\s*'([^']+)'\)/g)) {
    out.push({ k: m[1], w: +m[2], p: m[3] === "true", s: m[4], rat: m[5].replace(/''/g, "'"), src: m[6] });
  }
  return out;
}
function mappingFault(sql) {
  const rows = rowsOf(sql), body = stripComments(sql), out = [];
  if (/\bUPDATE\b|\bDELETE\b/i.test(body)) out.push("updates or deletes");
  if (/INSERT INTO vr_measures\b|INSERT INTO vr_rollcalls|INSERT INTO vr_member_votes/i.test(body)) out.push("creates a measure, roll call or vote");
  if (rows.length !== Object.keys(NEW).length) out.push(`${rows.length} rows inserted`);
  for (const r of rows) {
    const want = NEW[r.k];
    if (!want) { out.push(`${r.k} is not a row this pass declares`); continue; }
    if (r.w !== want[0] || r.p !== want[1] || r.s !== want[2]) out.push(`${r.k} reads ${r.w} ${r.p} ${r.s}`);
    if (r.src !== EH) out.push(`${r.k}: source is not the engrossed text`);
    if (!/Sec\. 2\(a\)/.test(r.rat) || !/Sec\. 2\(b\)/.test(r.rat)) out.push(`${r.k}: the rationale does not read Sec. 2(a)-(b)`);
  }
  for (const [k, [w, p, s]] of Object.entries(WAS)) {
    const re = new RegExp(`issue_key = '${k}'\\s+${w == null ? "" : `AND weight = ${w} `}AND ${p ? "" : "NOT "}is_primary AND support_meaning = '${s}'`);
    if (!re.test(body)) out.push(`does not verify ${k} still reads ${w == null ? "" : w + ", "}${p ? "primary" : "secondary"}, ${s}`);
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing already filed moved");
// ═════════════════════════════════════════════════════════════════════════════
ok(/RAISE EXCEPTION 'H\.R\. 1181: H\.R\. 1181 \(119, house\) is not in vr_measures/.test(SQL), "a missing measure RAISEs instead of being created");
ok(/^-- pack-generation: derived\b/m.test(SQL), "the migration declares its pack step");
{
  const seedNow = SEED.find((m) => m.number === NUM && m.congress === 119);
  eq(seedNow.issues.map((i) => i.issueKey).join(","), "gun_rights,privacy_rights,states_federal_power", "the seed still carries H.R. 1181's three rows and no new one");
  const head = gitShow("db/vr-issue-seed.json"), headCons = gitShow("consistency.js");
  if (head === null) console.log("      (no git baseline)");
  else {
    const was = JSON.parse(head).measures.find((m) => m.number === NUM && m.congress === 119);
    eq(JSON.stringify(seedNow), JSON.stringify(was), "seed: H.R. 1181 is byte-identical to HEAD");
    const HE = tableOf(headCons, "_DOS_EFFECT");
    for (const [k, v] of Object.entries(HE)) eq(E[k], v, `effect line ${k} is unchanged`);
    // Read from the marked blocks, not from HEAD's count, so the check holds
    // once this pass is committed and after later passes add blocks of their own.
    const later = keysAfter(CONS, "_DOS_EFFECT", 404);
    for (const k of Object.keys(E)) ok(k in HE || later.has(k) || mine.has(k), `${k}: a new line outside any marked block`);
    for (const k of Object.keys(NEW)) ok(mine.has(`${NUM}|119|${k}`), `${k}: its line is stored in this pass's block`);
    eq(JSON.stringify([...mine]), JSON.stringify(Object.keys(NEW).map((k) => `${NUM}|119|${k}`)), "this pass's block holds exactly its new line");
    ok(JSON.stringify(tableOf(CONS, "_DOS_MECH")) === JSON.stringify(tableOf(headCons, "_DOS_MECH")), "_DOS_MECH is unchanged");
    ok(gitShow("issue-map.js") === R("issue-map.js"), "issue-map.js is unchanged: no new issue key");
    ok(gitShow("db/issue-keys.json") === R("db/issue-keys.json"), "db/issue-keys.json is unchanged");
  }
  for (const k of Object.keys(WAS)) eq(lineFault(E[`${NUM}|119|${k}`]), "", `${k}: it already prints a short line`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the mappings");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(JSON.stringify(mappingFault(SQL)), "[]", "the migration writes exactly the declared row and verifies the three on file");
  const addr = measureAddresses(ROOT).published.find((a) => a.sitting === "119" && a.number === NUM);
  eq(JSON.stringify([...new Set(addr.issueKeys)].sort()), JSON.stringify([...KEYS].sort()), "the applied migrations map H.R. 1181 to its three keys plus econ_corp_account");
  const VALID = new Set(JSON.parse(R("db/issue-keys.json")).keys);
  for (const k of KEYS) ok(VALID.has(k), `${k} is an existing issue key`);
  for (const k of DECLINED) {
    ok(!addr.issueKeys.includes(k), `${k} is not mapped`);
    ok(new RegExp(`^--\\s+${k} — `, "m").test(SQL), `${k}: the migration records why it is declined`);
  }
  const gunSeed = JSON.parse(R("db/vr-gun-vote-seed.json"));
  ok((gunSeed.declinedFacets || []).some((d) => d.measure === "H.R. 1181 (119th)" && d.facet === "gun_safety"), "gun_safety: the firearms pass's own decline is still on file");
  const [row] = rowsOf(SQL);
  ok(row && /"?yea supports it"?/.test(row.rat) && /Counter-reading/.test(row.rat), "econ_corp_account: its rationale says which way a yea cuts and what reads against it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the line rule, on every topic");
// ═════════════════════════════════════════════════════════════════════════════
const lineOf = (k) => E[`${NUM}|119|${k}`] || "";
for (const k of KEYS) {
  const l = lineOf(k);
  eq(lineFault(l), "", `${k}: "${l}" (${l.length})`);
}
{
  const l = lineOf("econ_corp_account");
  ok(/Attorney General/.test(l) && /payment card networks?/.test(l) && /merchant category code/.test(l), "econ_corp_account: its terms are the ones its mapping row reads from Sec. 2(a)-(b)");
  const siblings = Object.keys(WAS).map(lineOf);
  ok(!siblings.includes(l), "econ_corp_account: its line is its own, not a sibling's");
  ok(/PROTECTING PRIVACY IN PURCHASES ACT SLICE 25 \(v404\)\./.test(CONS), "the line sits in its own marked block");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the bill page");
// ═════════════════════════════════════════════════════════════════════════════
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
{
  let fresh = true;
  try { execFileSync(process.execPath, [join(ROOT, "scripts/gen-bill-docs.mjs"), "--check"], { stdio: "pipe" }); }
  catch { fresh = false; }
  ok(fresh, "db/bill-docs.json, bill-search-index.js and bill-official.json are current with their generator");
  eq(JSON.stringify(D.m.map((m) => m.k).sort()), JSON.stringify([...KEYS].sort()), "the bill page lists the four topics");
  for (const k of KEYS) {
    ok(D.m.some((m) => m.k === k && m.l === lineOf(k)), `${k}: the bill page prints its short line`);
    eq((EFFECTS[K] || {})[k], lineOf(k), `${k}: bill-official.json's effects carry the same line`);
  }
  eq(D.m.find((m) => m.k === "econ_corp_account").i, "Corporate Accountability", "econ_corp_account is labelled Corporate Accountability");
  eq(D.rs, CG, "the bill page links its Congress.gov record");
}
const BILL_HTML = R("bill.html"), BD_SRC = R("bill-detail.js");
const DOC_SCRIPTS = [...BILL_HTML.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
const RATIONALE = (() => {
  const out = {};
  for (const i of SEED.find((m) => m.number === NUM && m.congress === 119).issues) out[i.issueKey] = i.rationale;
  for (const r of rowsOf(SQL)) out[r.k] = r.rat;
  return out;
})();
const ORIGIN = "https://politidex.fyi";
async function panel(official = OFFICIAL) {
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
    measure: { id: 1181, number: NUM, congress: 119, chamber: "house", status: "passed_house", title: TITLE },
    issues: KEYS.map((k) => ({ issueKey: k, supportMeaning: (WAS[k] || NEW[k])[2], rationale: RATIONALE[k] })),
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
    if (((WAS[k] || NEW[k])[2] === "yea_opposes") !== opp || opp === adv) out.push(`${k}: the direction chip is wrong`);
    const shut = r.replace(/<details\b(?![^>]*\bopen\b)[^>]*>[\s\S]*?<\/details>/g, "");
    if (/bd-omni-why/.test(shut)) out.push(`${k}: the longer text is visible by default`);
  }
  return out;
}
const PANEL = await panel();
must(PANEL.includes(NUM), "the bill panel rendered");
eq(JSON.stringify(panelFaults(PANEL)), "[]", "booted with bill.html's own scripts, every topic chip carries its short line and direction");
{
  const row = panelRows(PANEL).find((r) => /data-issue="econ_corp_account"/.test(r)) || "";
  ok(/<details class="bd-omni-more" data-bd-more><summary class="bd-omni-more-sum">More<\/summary>/.test(row), "econ_corp_account: the longer stored rationale sits behind a closed More");
  ok(!/<details[^>]*\bopen\b/.test(PANEL), "no More is open on arrival");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the issue drawer, on every roll-240 voter's file");
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
// The live read returns the measure with every row the database holds, the new
// one included; the offline corpus holds the seed's three, so the new row is
// added to the item the way the API delivers it.
const withNew = (it) => (it.number === NUM && it.congress === 119)
  ? { ...it, issues: it.issues.concat(Object.entries(NEW).map(([k, [w, p, s]]) => ({ issueKey: k, weight: w, isPrimary: p, supportMeaning: s, rationale: RATIONALE[k] }))) }
  : it;
const VOTERS = [...corpus.byMember].filter(([, items]) => items.some((it) => it.number === NUM && it.congress === 119 && it.rollNumber === 240 && /^(?:yea|nay)$/.test(it.position))).map(([pid]) => pid);
must(VOTERS.length >= 100, `the corpus holds the roll-240 voters (${VOTERS.length})`);
function drawerFaults(win, pids, keys = KEYS) {
  const CS = win.PDXConsistency, out = [];
  for (const pid of pids) {
    win.PDXVotingRecord.noteMember(pid, corpus.byMember.get(pid).map(withNew));
    for (const k of keys) {
      const rows = (CS.dossierItems(pid, k) || []).filter((it) => it.ident === NUM && it.item && it.item.rollNumber === 240);
      if (rows.length !== 1) { out.push(`${pid} ${k}: ${rows.length} roll-240 rows`); continue; }
      if (rows[0].effLine !== lineOf(k)) out.push(`${pid} ${k}: the row carries ${JSON.stringify(rows[0].effLine)}`);
      const html = CS.dossierLedgerHtml(pid, k) || "";
      const esc = lineOf(k).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      if (!html.includes(esc) && !html.includes(lineOf(k))) out.push(`${pid} ${k}: the drawer ledger does not print the short line`);
      if (!html.includes(`href="${CG}"`)) out.push(`${pid} ${k}: the drawer ledger does not link ${NUM} to Congress.gov`);
    }
  }
  return out;
}
const FILE_WIN = bootFiles();
{
  const faults = drawerFaults(FILE_WIN, VOTERS);
  eq(JSON.stringify(faults.slice(0, 8)), "[]", `on all ${VOTERS.length} voters' files, ${NUM} sits under each of the four topics with its short line`);
  const yea = VOTERS.filter((p) => corpus.byMember.get(p).some((it) => it.number === NUM && it.rollNumber === 240 && it.position === "yea"));
  ok(yea.length > 0 && yea.length < VOTERS.length, `both sides of roll 240 are in the sample (${yea.length} yea, ${VOTERS.length - yea.length} nay)`);
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
ok(ROW && ROW[2] === TITLE, "H.R. 1181 is in the eye's bill index under its title");
eq(ROW && JSON.stringify([...ROW[5]].sort()), JSON.stringify([...KEYS].sort()), "the index row carries the four topics");
const INLINE = (() => { const w = {}; vm.runInNewContext(R("bills-index.js"), { window: w }); return w.PDX_BILLS_INDEX; })();
const CARD = INLINE.find((b) => b.number === NUM && b.congress === 119);
ok(CARD && CARD.title === TITLE && CARD.status === "passed_house" && CARD.source.url === CG, "the Legislation library's curated index carries H.R. 1181 with its record door");
eq(CARD && JSON.stringify([...CARD.issueKeys].sort()), JSON.stringify([...KEYS].sort()), "the curated card carries the four topics");
eq(CARD && CARD.primaryIssue, "gun_rights", "the curated card's label is the primary row's");
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const PAGE = `/b/119/${encodeURIComponent(NUM)}`;
// Bare "firearm" is left out on purpose: six Utah bills whose titles open
// "Firearm …" outrank a keyword hit, which is the right order, and no keyword
// is added to beat them. "firearms", "firearm purchase" and "firearm privacy"
// all land.
const QUERIES = [
  ["page index", bootEye(ROWS), ["H.R. 1181", "1181", TITLE, "Protect Gun Rights"]],
  ["page + curated index", bootEye(ROWS, INLINE), [
    "H.R. 1181", "1181", TITLE, "Protecting Privacy in Purchases", "gun", "guns", "firearms", "firearm purchase", "firearm privacy",
    "gun store", "gun purchase", "purchase", "privacy", "purchase privacy", "MCC", "merchant category code", "payment network",
    "payment card", "card network", "credit card", "Protect Gun Rights",
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
  const good = lineOf("econ_corp_account");
  const LINE_MUTANTS = {
    "a line over 140 characters": good.replace("; the House", ", through complaints, investigations and injunctions; the House"),
    "a two-sentence line": good.replace("; the House passed it", ". The House passed it"),
    "a method word": good.replace("Would let", "Weighted low, would let"),
    "a method word, mid-line": good.replace("payment card networks", "the payment card networks this row is mapped to"),
    "a title fallback": `Would enact the ${TITLE}; the House passed it ${TALLY}.`,
    "an ellipsis clip": good.replace("; the House passed it", "…; the House passed it"),
    "the bill as subject": good.replace("Would let", "This bill lets"),
  };
  for (const [what, bad] of Object.entries(LINE_MUTANTS)) {
    must(bad !== good, `the "${what}" mutation found its target`);
    ok(lineFault(bad) !== "", `${what} fails the line rule`);
  }
  // The drawer's own runtime rule prints nothing for a line it would refuse, so
  // a bad line can never reach a member's file — and the drawer check notices.
  const longCons = CONS.replace(good, LINE_MUTANTS["a line over 140 characters"]);
  must(longCons !== CONS, "the over-long drawer mutation found its target");
  ok(drawerFaults(bootFiles(longCons), VOTERS.slice(0, 2), ["econ_corp_account"]).length > 0, "an over-long stored line fails the drawer check");
  const twoCons = CONS.replace(good, LINE_MUTANTS["a two-sentence line"]);
  ok(drawerFaults(bootFiles(twoCons), VOTERS.slice(0, 2), ["econ_corp_account"]).length > 0, "a two-sentence stored line fails the drawer check");
  // A bill page out of step with the table fails.
  const off = JSON.parse(OFFICIAL);
  off.effects[K].econ_corp_account = LINE_MUTANTS["a method word"];
  ok(panelFaults(await panel(JSON.stringify(off))).length > 0, "a method word on the bill page fails the panel check");

  const flip = SQL.replace("VALUES (m_id, 'econ_corp_account', 30, false,\n      'yea_supports'", "VALUES (m_id, 'econ_corp_account', 30, false,\n      'yea_opposes'");
  must(flip !== SQL, "the flipped-direction mutation found its target");
  ok(mappingFault(flip).length > 0, "an incorrect direction on econ_corp_account fails the mapping check");
  ok(mappingFault(SQL.replace("'econ_corp_account', 30, false", "'econ_corp_account', 30, true")).length > 0, "econ_corp_account promoted to primary fails");
  ok(mappingFault(SQL.replace("'econ_corp_account', 30, false", "'econ_corp_account', 55, false")).length > 0, "a changed weight fails");
  const gunSafety = SQL.replace("  END IF;\nEND $$;", "  END IF;\n  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)\n    VALUES (m_id, 'gun_safety', 30, false, 'yea_opposes', 'Sec. 2(a) and Sec. 2(b).', '" + EH + "');\nEND $$;");
  must(gunSafety !== SQL, "the gun_safety mutation found its target");
  ok(mappingFault(gunSafety).length > 0, "gun_safety slipped in fails");
  ok(mappingFault(SQL.replace("AND weight = 40 AND NOT is_primary AND support_meaning = 'yea_opposes'", "AND weight = 40 AND NOT is_primary AND support_meaning = 'yea_supports'")).length > 0, "a migration that stops verifying states_federal_power's direction fails");
  ok(mappingFault(SQL.replace("INSERT INTO vr_measure_issues", "UPDATE vr_measure_issues SET weight = 50 WHERE measure_id = m_id AND issue_key = 'gun_rights';\n    INSERT INTO vr_measure_issues")).length > 0, "a migration that moves an existing row fails");
  const wrongChip = PANEL.replace(/(data-issue="econ_corp_account"[\s\S]*?)A Yea advances this/, "$1A Yea cuts against this");
  must(wrongChip !== PANEL, "the bill-page direction mutation found its target");
  ok(panelFaults(wrongChip).length > 0, "an incorrect direction chip on the bill page fails");
}

console.log(`\n   ${failures.length ? "✗" : "✓"} hr1181: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log(`      ✗ ${f.slice(0, 300)}`);
process.exit(failures.length ? 1 : 0);
