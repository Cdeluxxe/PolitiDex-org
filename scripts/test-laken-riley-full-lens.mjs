#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-laken-riley-full-lens.mjs — S. 5 and H.R. 29 (119th), the Laken Riley
// Act: the four rows both vehicles share, a short line on every topic of
// both, H.R. 29's bill page, and nothing already filed moved
// ─────────────────────────────────────────────────────────────────────────────
// S. 5 is Public Law 119-1; H.R. 29 is its House companion, passed 264-159 and
// left on the Senate calendar. 20261126000000_vr_laken_riley_hr29_identity_and_
// lens.sql re-asserts H.R. 29's identity and its four rows, guarded so the live
// branch sees a no-op, because H.R. 29 was created inside the directory-form
// first migration the bill-page projection does not read. What must stay true:
//
//   1. NOTHING ALREADY FILED MOVED. The seed's rows for both vehicles, every
//      stored effect line, _DOS_MECH and _DOS_POINTER are as at HEAD; the
//      migration updates and deletes nothing and creates no roll call, vote or
//      sponsorship; no issue key is added.
//   2. THE MAPPINGS, AND THE TWO VEHICLES AGREE. Both carry exactly
//      deportations 100 primary, border_security 70, tough_on_crime 55 and
//      state_standing 40, all yea_supports; the migration re-asserts H.R. 29's
//      rows with the seed's own rationales and verifies both. No _balance key:
//      immig_balance and justice_balance are pairing chips and the Act has only
//      the enforcement half (runbook: "Pairing chips need both halves").
//   3. THE LINE RULE, on all eight pairs: one sentence, 140 characters or
//      fewer, the act as subject, no method word, no ellipsis, never the title.
//      H.R. 29's lines open "Would" and end on its House tally; S. 5's are in
//      the enacted past tense. The two new lines use their pair's own terms.
//   4. THE BILL PAGES. Both /b/ documents exist, are in the sitemap and the
//      drawer's page list, and print each topic's line; the panel booted with
//      bill.html's own scripts prints it by default under every topic chip,
//      the longer stored rationale behind a closed "More".
//   5. THE ISSUE DRAWERS. On every rostered member who voted yea or nay on
//      House roll 6 (H.R. 29), Senate roll 7 or House roll 23 (S. 5), the vote
//      sits under all four topics with that topic's line.
//   6. SEARCH. The eye answers Laken Riley, both numbers, immigration,
//      detention and the plain terms readers type with both pages; the
//      Legislation library's curated cards carry the four topics, H.R. 29 as
//      passed the House and S. 5 as enacted.
//   7. MUTATIONS. A line over 140 characters, a two-sentence line, a method
//      word, a title fallback, a flipped direction, a vehicle drifting from its
//      twin, and immig_balance or justice_balance slipped in must each fail.
//
//   node scripts/test-laken-riley-full-lens.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { measureAddresses } from "./vr-measure-addresses.mjs";
import { sliceBlocks } from "./vr-slice-blocks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ laken riley: STALE HARNESS — ${m}`); process.exit(2); };
const gitShow = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

const TITLE = "Laken Riley Act";
const VEHICLES = {
  "H.R. 29": { key: "119|H.R. 29", chamber: "house", status: "passed_house", tally: "264-159", rolls: [["house", 6]],
    cg: "https://www.congress.gov/bill/119th-congress/house-bill/29" },
  "S. 5": { key: "119|S. 5", chamber: "senate", status: "enacted", tally: null, rolls: [["senate", 7], ["house", 23]],
    cg: "https://www.congress.gov/bill/119th-congress/senate-bill/5" },
};
const NUMS = Object.keys(VEHICLES);
// The four rows both vehicles carry: [weight, primary, polarity].
const SHARED = {
  deportations: [100, true, "yea_supports"],
  border_security: [70, false, "yea_supports"],
  tough_on_crime: [55, false, "yea_supports"],
  state_standing: [40, false, "yea_supports"],
};
const KEYS = Object.keys(SHARED);
// The two pairs this pass writes a line for, and the stored terms each must use.
const NEW_LINES = {
  "H.R. 29|119|deportations": ["detention and removal proceedings", "covered unauthorized immigrants"],
  "H.R. 29|119|state_standing": ["attorney", "standing to sue", "Homeland Security", "violations"],
};
// Read and refused, each with its reason in the migration's header.
const DECLINED = ["immig_balance", "justice_balance", "back_police", "immig_fentanyl", "immigration_reform", "states_federal_power"];

const MIG = "netlify/database/migrations/20261126000000_vr_laken_riley_hr29_identity_and_lens.sql";
const SQL = R(MIG);
const stripComments = (s) => s.replace(/^\s*--.*$/gm, "");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const OFFICIAL = R("bill-official.json");
const EFFECTS = JSON.parse(OFFICIAL).effects || {};
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures;
const seedOf = (num) => SEED.find((m) => m.number === num && m.congress === 119);
for (const n of NUMS) must(seedOf(n), `${n} is in the seed`);
const tableOf = (src, name) => {
  const at = src.indexOf(`var ${name} = {`), end = src.indexOf("\n  };", at);
  return vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")");
};
const CONS = R("consistency.js");
const E = tableOf(CONS, "_DOS_EFFECT"), MECH = tableOf(CONS, "_DOS_MECH");
const RUNTIME_METHOD = (() => {
  const m = /var _DOS_EFFECT_METHOD = (\/.*\/i);/.exec(CONS);
  must(m, "consistency.js still declares _DOS_EFFECT_METHOD");
  return vm.runInNewContext(m[1]);
})();
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|direction match|pole|this bill)\b|PolitiDex|…|\.\.\./i;
// The line a pair prints: its stored entry, else its own did when that is short.
const lineOf = (num, k) => E[`${num}|119|${k}`] || (MECH[`${num}|119|${k}`] && MECH[`${num}|119|${k}`].did) || "";

function lineFault(s, num) {
  const v = VEHICLES[num];
  if (typeof s !== "string" || !s) return "no line";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on its stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  if (METHOD.test(s) || RUNTIME_METHOD.test(s)) return "a method word";
  if (s.toLowerCase().includes(TITLE.toLowerCase())) return "the bill's title";
  if (/^(?:This|The bill|The act|It)\b/.test(s)) return "the act is not the subject";
  if (v.status === "enacted") {
    if (/^(?:Would|Proposed)\b/.test(s) || !/^[A-Z][a-z]+ed\b|^(?:Let|Made|Put|Cut|Set)\b/.test(s)) return "not in the enacted past tense";
  } else {
    if (!/^Would\b/.test(s)) return "an unenacted act does not open \"Would\"";
    if (!s.endsWith(`the House passed it ${v.tally}.`)) return "not ending on the House tally";
  }
  return "";
}
// H.R. 29's rows as the migration writes them.
function rowsOf(sql) {
  const out = [];
  for (const m of stripComments(sql).matchAll(/\(m_id, '([a-z_]+)', (\d+), (true|false), '(yea_\w+)',\s*'((?:[^']|'')*)',\s*'([^']+)'\)/g)) {
    out.push({ k: m[1], w: +m[2], p: m[3] === "true", s: m[4], rat: m[5].replace(/''/g, "'"), src: m[6] });
  }
  return out;
}
// A balance key needs both halves; the Act carries only enforcement.
const balanceFault = (keys) => keys.filter((k) => /_balance$/.test(k)).map((k) => `${k}: a pairing chip, and the Act has only its enforcement half`);
function mappingFault(sql) {
  const body = stripComments(sql), rows = rowsOf(sql), out = [];
  if (/\bUPDATE\b|\bDELETE\b/i.test(body)) out.push("updates or deletes");
  if (/INSERT INTO vr_rollcalls|INSERT INTO vr_member_votes|INSERT INTO vr_positions|INSERT INTO vr_measure_provisions|INSERT INTO vr_measure_actions/i.test(body)) out.push("creates a roll call, vote, position, provision or action");
  if (!/IF m_id IS NULL THEN\s+INSERT INTO vr_measures/.test(body)) out.push("the measure insert is not guarded on absence");
  if (!/ON CONFLICT \(measure_id, issue_key\) DO NOTHING/.test(body) || /DO UPDATE/i.test(body)) out.push("the issue rows are not ON CONFLICT DO NOTHING");
  out.push(...balanceFault(rows.map((r) => r.k)));
  const seed = Object.fromEntries(seedOf("H.R. 29").issues.map((i) => [i.issueKey, i]));
  if (rows.length !== KEYS.length) out.push(`${rows.length} rows re-asserted`);
  for (const r of rows) {
    const want = SHARED[r.k];
    if (!want) { out.push(`${r.k} is not one of the four shared rows`); continue; }
    if (r.w !== want[0] || r.p !== want[1] || r.s !== want[2]) out.push(`${r.k} reads ${r.w} ${r.p} ${r.s}`);
    if (!seed[r.k] || seed[r.k].rationale !== r.rat) out.push(`${r.k}: its rationale is not the seed's`);
  }
  for (const [k, [w, p, s]] of Object.entries(SHARED)) {
    const re = new RegExp(`issue_key = '${k}'\\s+AND weight = ${w}\\s+AND ${p ? "" : "NOT "}is_primary\\s+AND support_meaning = '${s}'`);
    if (!re.test(body)) out.push(`the verification does not hold ${k} at ${w}, ${p ? "primary" : "secondary"}, ${s}`);
  }
  if (!/number = 'H\.R\. 29'\) OR \(chamber = 'senate' AND number = 'S\. 5'\)/.test(body)) out.push("the verification does not read both vehicles");
  return out;
}
// The two vehicles carry the same rows: same keys, weights, flags, polarities.
const shape = (issues) => JSON.stringify(issues.map((i) => [i.issueKey, i.weight, i.isPrimary, i.supportMeaning]).sort());
function twinFault(seed) {
  const a = seed.find((m) => m.number === "H.R. 29" && m.congress === 119), b = seed.find((m) => m.number === "S. 5" && m.congress === 119);
  const want = JSON.stringify(Object.entries(SHARED).map(([k, [w, p, s]]) => [k, w, p, s]).sort());
  const out = [];
  if (shape(a.issues) !== want) out.push(`H.R. 29 reads ${shape(a.issues)}`);
  if (shape(b.issues) !== want) out.push(`S. 5 reads ${shape(b.issues)}`);
  if (shape(a.issues) !== shape(b.issues)) out.push("the two vehicles disagree");
  for (const m of [a, b]) out.push(...balanceFault(m.issues.map((i) => i.issueKey)));
  return out;
}

const BLOCK = sliceBlocks(CONS, "_DOS_EFFECT").find((b) => b.version === 405);
must(BLOCK, "consistency.js carries the LAKEN RILEY ACT SLICE 26 (v405) block");
const mine = new Set(BLOCK.keys);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing already filed moved");
// ═════════════════════════════════════════════════════════════════════════════
ok(/^-- pack-generation: derived\b/m.test(SQL), "the migration declares its pack step");
{
  const head = gitShow("db/vr-issue-seed.json"), headCons = gitShow("consistency.js");
  if (head === null || headCons === null) console.log("      (no git baseline)");
  else {
    for (const n of NUMS) {
      const was = JSON.parse(head).measures.find((m) => m.number === n && m.congress === 119);
      eq(JSON.stringify(seedOf(n)), JSON.stringify(was), `seed: ${n} is byte-identical to HEAD`);
    }
    const HE = tableOf(headCons, "_DOS_EFFECT");
    for (const [k, v] of Object.entries(HE)) eq(E[k], v, `effect line ${k} is unchanged`);
    for (const k of Object.keys(NEW_LINES)) ok(!(k in HE) || mine.has(k), `${k}: written in this pass's block`);
    ok(JSON.stringify(MECH) === JSON.stringify(tableOf(headCons, "_DOS_MECH")), "_DOS_MECH is unchanged");
    ok(JSON.stringify(tableOf(CONS, "_DOS_POINTER")) === JSON.stringify(tableOf(headCons, "_DOS_POINTER")), "_DOS_POINTER is unchanged");
    ok(gitShow("issue-map.js") === R("issue-map.js"), "issue-map.js is unchanged: no new issue key");
    ok(gitShow("db/issue-keys.json") === R("db/issue-keys.json"), "db/issue-keys.json is unchanged");
  }
}
{
  eq(JSON.stringify([...mine].sort()), JSON.stringify(Object.keys(NEW_LINES).sort()), "the slice block holds exactly the two H.R. 29 lines");
  for (const k of KEYS) ok(`S. 5|119|${k}` in E || (MECH[`S. 5|119|${k}`] || {}).did, `S. 5 ${k}: already printed a line before this pass`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the mappings, and the two vehicles agree");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(JSON.stringify(mappingFault(SQL)), "[]", "the migration re-asserts exactly H.R. 29's four seed rows and verifies both vehicles");
  eq(JSON.stringify(twinFault(SEED)), "[]", "the seed holds both vehicles at the same four rows");
  const A = measureAddresses(ROOT).published;
  for (const n of NUMS) {
    const a = A.find((x) => x.sitting === "119" && x.number === n);
    ok(!!a, `${n} has a published /b/ address`);
    if (a) {
      eq(JSON.stringify([...a.issues].sort()), JSON.stringify([...KEYS].sort()), `${n}: the applied migrations resolve to the four shared keys`);
      eq(a.chamber, VEHICLES[n].chamber, `${n}: its chamber`);
      eq(a.source, VEHICLES[n].cg, `${n}: its Congress.gov record`);
    }
  }
  const VALID = new Set(JSON.parse(R("db/issue-keys.json")).keys);
  for (const k of KEYS) ok(VALID.has(k), `${k} is an existing issue key`);
  for (const k of DECLINED) {
    ok(VALID.has(k), `${k} is a real key that was read`);
    ok(new RegExp(`^--\\s+${k} — `, "m").test(SQL), `${k}: the migration records why it is declined`);
    for (const n of NUMS) ok(!seedOf(n).issues.some((i) => i.issueKey === k), `${n}: ${k} is not mapped`);
  }
  ok(/Pairing chips need both halves/.test(R("db/vr-ingest-runbook.md")), "the balance-key rule is still the runbook's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the line rule, on all eight pairs");
// ═════════════════════════════════════════════════════════════════════════════
for (const n of NUMS) for (const k of KEYS) {
  const l = lineOf(n, k);
  eq(lineFault(l, n), "", `${n} ${k}: "${l}" (${l.length})`);
}
for (const [pair, terms] of Object.entries(NEW_LINES)) {
  const [num, , k] = pair.split("|");
  const l = E[pair] || "", rat = seedOf(num).issues.find((i) => i.issueKey === k).rationale;
  for (const t of terms) ok(l.includes(t) && rat.includes(t), `${pair}: "${t}" is in both the line and its pair's stored rationale`);
  for (const other of KEYS) if (other !== k) ok(l !== lineOf(num, other), `${pair}: its line is its own, not ${other}'s`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the bill pages");
// ═════════════════════════════════════════════════════════════════════════════
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
{
  for (const [f, args] of [["gen-bill-docs.mjs", ["--check"]], ["gen-bill-pages.mjs", ["--check"]]]) {
    let fresh = true;
    try { execFileSync(process.execPath, [join(ROOT, "scripts", f), ...args], { stdio: "pipe" }); } catch { fresh = false; }
    ok(fresh, `${f} output is current`);
  }
  const SITEMAP = R("sitemap.xml"), PAGES = R("bill-pages.js");
  for (const n of NUMS) {
    const D = DOCS[VEHICLES[n].key];
    ok(!!D, `${n} has a bill document`);
    if (!D) continue;
    eq(D.t, TITLE, `${n}: its page is titled ${TITLE}`);
    eq(JSON.stringify(D.m.map((m) => m.k).sort()), JSON.stringify([...KEYS].sort()), `${n}: the page lists the four topics`);
    for (const k of KEYS) {
      ok(D.m.some((m) => m.k === k && m.l === lineOf(n, k)), `${n} ${k}: the page prints its short line`);
      eq((EFFECTS[VEHICLES[n].key] || {})[k], lineOf(n, k), `${n} ${k}: bill-official.json's effects carry the same line`);
    }
    ok(SITEMAP.includes(`/b/119/${encodeURIComponent(n)}<`), `${n}: its page is in the sitemap`);
    ok(PAGES.includes(`"119/${n}": 1`), `${n}: the drawer knows its page exists`);
    eq(D.st, VEHICLES[n].status, `${n}: the page's status is derived from its official record`);
    eq(D.rs, VEHICLES[n].cg, `${n}: the page names its official record`);
  }
  {
    // H.R. 29's record: the facts 20260804000000 cited from BILLSTATUS-119hr29.
    const REC = JSON.parse(R("db/bill-record.json")).records["119|H.R. 29"] || { sp: [], a: [] };
    eq(REC.in, "2025-01-03", "H.R. 29: introduced 2025-01-03");
    ok(REC.sp.some((p) => p.r === "sponsor" && p.id === "C001129"), "H.R. 29: Rep. Mike Collins is the sponsor");
    ok(REC.a.some((x) => /264 - 159 \(Roll no\. 6\)/.test(x.x)) && !REC.a.some((x) => x.s === "law"), "H.R. 29: passed the House on roll 6 and never became law");
    const PB = JSON.parse(R("person-bills.json"));
    const hit = (PB.people.mike_collins || []).find(([i]) => PB.bills[i] && `${PB.bills[i][0]}|${PB.bills[i][1]}` === "119|H.R. 29");
    ok(hit && hit[1] === "s", "H.R. 29 is on Rep. Collins's file as sponsor");
  }
}
const BILL_HTML = R("bill.html"), BD_SRC = R("bill-detail.js");
const DOC_SCRIPTS = [...BILL_HTML.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
const ORIGIN = "https://politidex.fyi";
async function panel(num, official = OFFICIAL) {
  const win = makeSandbox();
  win.__PDX_BILL_DOC = true;
  const p = "/b/119/" + encodeURIComponent(num);
  win.location = { href: ORIGIN + p, pathname: p, search: "", hash: "", origin: ORIGIN };
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  win.fetch = (u) => String(u) === "/bill-official.json"
    ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(official)) })
    : Promise.reject(new Error("offline"));
  const ctx = vm.createContext(win);
  for (const f of DOC_SCRIPTS) vm.runInContext(f === "bill-detail.js" ? BD_SRC : R(f), ctx, { filename: f });
  const v = VEHICLES[num];
  const data = {
    measure: { id: num === "S. 5" ? 1005 : 1029, number: num, congress: 119, chamber: v.chamber, status: v.status, title: TITLE },
    issues: seedOf(num).issues.map((i) => ({ issueKey: i.issueKey, supportMeaning: i.supportMeaning, rationale: i.rationale })),
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
function panelFaults(html, num) {
  const out = [], rows = panelRows(html);
  if (rows.length !== KEYS.length) out.push(`${rows.length} topic rows for ${KEYS.length} keys`);
  for (const r of rows) {
    const k = (/data-issue="([^"]+)"/.exec(r) || [])[1];
    const eff = unescape((/<div class="bd-omni-eff" data-bd-eff-for="[^"]+">([^<]*)<\/div>/.exec(r) || [])[1] || "");
    if (eff !== lineOf(num, k)) out.push(`${k}: the default text under the chip is not its short line`);
    if (lineFault(eff, num)) out.push(`${k}: the default text breaks the line rule (${lineFault(eff, num)})`);
    const opp = /A Yea cuts against this/.test(r), adv = /A Yea advances this/.test(r);
    if (((SHARED[k] || [])[2] === "yea_opposes") !== opp || opp === adv) out.push(`${k}: the direction chip is wrong`);
    const shut = r.replace(/<details\b(?![^>]*\bopen\b)[^>]*>[\s\S]*?<\/details>/g, "");
    if (/bd-omni-why/.test(shut)) out.push(`${k}: the longer text is visible by default`);
  }
  return out;
}
const PANELS = {};
for (const n of NUMS) {
  PANELS[n] = await panel(n);
  must(PANELS[n].includes(n), `the ${n} panel rendered`);
  eq(JSON.stringify(panelFaults(PANELS[n], n)), "[]", `${n}: booted with bill.html's own scripts, every topic chip carries its short line and direction`);
  ok(!/<details[^>]*\bopen\b/.test(PANELS[n]), `${n}: no More is open on arrival`);
}
{
  const row = panelRows(PANELS["H.R. 29"]).find((r) => /data-issue="state_standing"/.test(r)) || "";
  ok(/<details class="bd-omni-more" data-bd-more><summary class="bd-omni-more-sum">More<\/summary>/.test(row), "H.R. 29 state_standing: the longer stored rationale sits behind a closed More");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the issue drawers, on every voter's file");
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
const votedOn = (items, num, roll) => items.some((it) => it.number === num && it.congress === 119 && it.rollNumber === roll && /^(?:yea|nay)$/.test(it.position));
const VOTERS = [];
for (const n of NUMS) for (const [, roll] of VEHICLES[n].rolls) {
  const pids = [...corpus.byMember].filter(([, items]) => votedOn(items, n, roll)).map(([pid]) => pid);
  must(pids.length >= 20, `the corpus holds ${n} roll ${roll}'s voters (${pids.length})`);
  for (const pid of pids) VOTERS.push([pid, n, roll]);
}
function drawerFaults(win, list, keys = KEYS, lines = lineOf) {
  const CS = win.PDXConsistency, out = [], noted = new Set();
  for (const [pid, num, roll] of list) {
    if (!noted.has(pid)) { win.PDXVotingRecord.noteMember(pid, corpus.byMember.get(pid)); noted.add(pid); }
    for (const k of keys) {
      const rows = (CS.dossierItems(pid, k) || []).filter((it) => it.ident === num && it.item && it.item.rollNumber === roll);
      // The offline corpus can hold House roll 23 twice for one member (two seeds
      // carry it under different measure-chamber fields); the live table keys a
      // vote once per roll call. Every row present must carry the line.
      if (!rows.length) { out.push(`${pid} ${num} roll ${roll} ${k}: no row`); continue; }
      for (const row of rows) {
        if (row.effLine !== lines(num, k)) out.push(`${pid} ${num} ${k}: the row carries ${JSON.stringify(row.effLine)}`);
        if (row.ptrLine) out.push(`${pid} ${num} ${k}: the row still prints a pointer`);
      }
      const html = CS.dossierLedgerHtml(pid, k) || "";
      const esc = lines(num, k).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      if (!html.includes(esc) && !html.includes(lines(num, k))) out.push(`${pid} ${num} ${k}: the drawer ledger does not print the short line`);
      if (!html.includes(`href="${VEHICLES[num].cg}"`)) out.push(`${pid} ${num} ${k}: the drawer ledger does not link ${num} to Congress.gov`);
    }
  }
  return out;
}
{
  const faults = drawerFaults(bootFiles(), VOTERS);
  eq(JSON.stringify(faults.slice(0, 8)), "[]", `on all ${VOTERS.length} voter rows, each vehicle sits under its four topics with its short line`);
  for (const n of NUMS) for (const [, roll] of VEHICLES[n].rolls) {
    const on = VOTERS.filter(([, x, r]) => x === n && r === roll).map(([p]) => p);
    const yea = on.filter((p) => corpus.byMember.get(p).some((it) => it.number === n && it.rollNumber === roll && it.position === "yea"));
    ok(yea.length > 0 && yea.length < on.length, `${n} roll ${roll}: both sides are in the sample (${yea.length} yea, ${on.length - yea.length} nay)`);
  }
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
const INLINE = (() => { const w = {}; vm.runInNewContext(R("bills-index.js"), { window: w }); return w.PDX_BILLS_INDEX; })();
for (const n of NUMS) {
  const row = ROWS.find((r) => r[0] === "119" && r[1] === n);
  const idxStatus = VEHICLES[n].status;
  ok(row && row[2] === TITLE && row[3] === idxStatus, `${n} is in the eye's bill index under its title, status ${JSON.stringify(idxStatus)}`);
  eq(row && JSON.stringify([...row[5]].sort()), JSON.stringify([...KEYS].sort()), `${n}: the index row carries the four topics`);
  const card = INLINE.find((b) => b.number === n && b.congress === 119);
  ok(card && card.title === TITLE && card.chamber === VEHICLES[n].chamber && card.source.url === VEHICLES[n].cg, `${n}: the Legislation library's curated card, with its record door`);
  eq(card && card.status, VEHICLES[n].status, `${n}: the curated card's status is the record's`);
  eq(card && JSON.stringify([...card.issueKeys].sort()), JSON.stringify([...KEYS].sort()), `${n}: the curated card carries the four topics`);
  eq(card && card.primaryIssue, "deportations", `${n}: the curated card's label is the primary row's`);
}
{
  const a = INLINE.find((b) => b.number === "H.R. 29"), b = INLINE.find((x) => x.number === "S. 5");
  ok(a && b && a.isOmnibus === b.isOmnibus, "the two curated cards agree on their omnibus flag");
}
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const PAGE = (n) => `/b/119/${encodeURIComponent(n)}`;
// Bare "ICE" is left out on purpose: three letters sit inside "Office" and
// "Service" in six disapproval resolutions' titles, and a title hit outranks a
// keyword, which is the right order. "ICE detention" lands both.
const BOTH = ["Laken Riley", TITLE, "immigration", "ICE detention", "detention", "immigration detention", "mandatory detention",
  "deportation", "detainer", "immigrant crime", "shoplifting", "border"];
const QUERIES = [
  ["page index", bootEye(ROWS), [["Laken Riley", NUMS], [TITLE, NUMS], ["H.R. 29", ["H.R. 29"]], ["S. 5", ["S. 5"]]]],
  ["page + curated index", bootEye(ROWS, INLINE), [...BOTH.map((q) => [q, NUMS]), ["H.R. 29", ["H.R. 29"]], ["S. 5", ["S. 5"]], ["Public Law 119-1", ["S. 5"]]]],
];
for (const [label, search, qs] of QUERIES) {
  for (const [q, want] of qs) {
    const got = hrefs(search(q));
    for (const n of want) ok(got.includes(PAGE(n)), `${label}: "${q}" finds ${n}`);
    console.log(`      ${label}: "${q}" → ${want.map((n) => `${n} at row ${got.indexOf(PAGE(n)) + 1}`).join(", ")} of ${got.length}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
{
  const good = E["H.R. 29|119|state_standing"];
  const LINE_MUTANTS = {
    "a line over 140 characters": good.replace("violations;", "violations that harm the State or its residents;"),
    "a two-sentence line": good.replace("; the House passed it", ". The House passed it"),
    "a method word": good.replace("Would give", "Weighted 40, would give"),
    "a method word, mid-line": good.replace("Homeland Security", "Homeland Security, as mapped"),
    "a title fallback": `Would enact the ${TITLE}; the House passed it 264-159.`,
    "an ellipsis clip": good.replace("; the House passed it", "…; the House passed it"),
    "the bill as subject": good.replace("Would give", "This bill gives"),
    "an unenacted act written as done": good.replace("Would give", "Gave"),
  };
  for (const [what, bad] of Object.entries(LINE_MUTANTS)) {
    must(bad !== good, `the "${what}" mutation found its target`);
    ok(lineFault(bad, "H.R. 29") !== "", `${what} fails the line rule`);
  }
  ok(lineFault("Would require detention of non-citizens charged with theft; the House cleared it 263-156.", "S. 5") !== "", "an enacted act written as \"Would\" fails");
  // The drawer's runtime rule prints nothing for a line it refuses, and the
  // drawer check notices the row went quiet.
  const sample = VOTERS.filter(([, n]) => n === "H.R. 29").slice(0, 2);
  for (const what of ["a line over 140 characters", "a two-sentence line", "a method word"]) {
    const cons = CONS.replace(good, LINE_MUTANTS[what]);
    must(cons !== CONS, `the drawer "${what}" mutation found its target`);
    ok(drawerFaults(bootFiles(cons), sample, ["state_standing"]).length > 0, `${what} stored fails the drawer check`);
  }
  const off = JSON.parse(OFFICIAL);
  off.effects["119|H.R. 29"].deportations = LINE_MUTANTS["a method word"];
  ok(panelFaults(await panel("H.R. 29", JSON.stringify(off)), "H.R. 29").length > 0, "a method word on the bill page fails the panel check");

  const flip = SQL.replace("(m_id, 'state_standing', 40, false, 'yea_supports',", "(m_id, 'state_standing', 40, false, 'yea_opposes',");
  must(flip !== SQL, "the flipped-direction mutation found its target");
  ok(mappingFault(flip).length > 0, "an incorrect direction on state_standing fails the mapping check");
  ok(mappingFault(SQL.replace("(m_id, 'tough_on_crime', 55, false,", "(m_id, 'tough_on_crime', 70, false,")).length > 0, "a changed weight fails");
  ok(mappingFault(SQL.replace("(m_id, 'border_security', 70, false,", "(m_id, 'border_security', 70, true,")).length > 0, "a second primary fails");
  ok(mappingFault(SQL.replace("AND weight = 40  AND NOT is_primary AND support_meaning = 'yea_supports'", "AND weight = 40  AND NOT is_primary AND support_meaning = 'yea_opposes'")).length > 0, "a verification that stops holding state_standing's direction fails");
  ok(mappingFault(SQL.replaceAll("ON CONFLICT (measure_id, issue_key) DO NOTHING", "ON CONFLICT (measure_id, issue_key) DO UPDATE SET weight = EXCLUDED.weight")).length > 0, "a re-assertion that overwrites the live rows fails");
  const addKey = (k) => SQL.replace("      'https://www.congress.gov/bill/119th-congress/house-bill/29')\n  ON CONFLICT",
    `      'https://www.congress.gov/bill/119th-congress/house-bill/29'),\n    (m_id, '${k}', 30, false, 'yea_supports',\n      'Pairs enforcement with fairness.',\n      'https://www.congress.gov/bill/119th-congress/house-bill/29')\n  ON CONFLICT`);
  for (const k of ["immig_balance", "justice_balance"]) {
    const bad = addKey(k);
    must(bad !== SQL, `the ${k} mutation found its target`);
    ok(mappingFault(bad).some((f) => f.startsWith(`${k}: a pairing chip`)), `${k} slipped into the migration fails the balance-key rule`);
    const seed = JSON.parse(JSON.stringify(SEED));
    seed.find((m) => m.number === "S. 5" && m.congress === 119).issues.push({ issueKey: k, weight: 30, isPrimary: false, supportMeaning: "yea_supports", rationale: "x" });
    ok(twinFault(seed).some((f) => f.startsWith(`${k}: a pairing chip`)), `${k} added to S. 5's seed fails the balance-key rule`);
  }
  const drift = JSON.parse(JSON.stringify(SEED));
  drift.find((m) => m.number === "S. 5" && m.congress === 119).issues.find((i) => i.issueKey === "tough_on_crime").supportMeaning = "yea_opposes";
  ok(twinFault(drift).includes("the two vehicles disagree"), "S. 5 drifting from H.R. 29 fails the twin check");
  const wrongChip = PANELS["S. 5"].replace(/(data-issue="state_standing"[\s\S]*?)A Yea advances this/, "$1A Yea cuts against this");
  must(wrongChip !== PANELS["S. 5"], "the bill-page direction mutation found its target");
  ok(panelFaults(wrongChip, "S. 5").length > 0, "an incorrect direction chip on the bill page fails");
}

console.log(`\n   ${failures.length ? "✗" : "✓"} laken riley: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log(`      ✗ ${f.slice(0, 300)}`);
process.exit(failures.length ? 1 : 0);
