#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ndaa-fy27-multiyear-industrial-base.mjs — FY2027 NDAA multiyear
// procurement authorities and further China / industrial-base sections
// ─────────────────────────────────────────────────────────────────────────────
// db/ndaa-fy27-multiyear-industrial-base-stated-2026-11.json records the
// multiyear procurement authorities of H.R. 8800 and S. 4784 (F-35, F-15EX,
// Arleigh Burke destroyers, John Lewis oilers, E-2D, munitions) and three more
// China / industrial-base sections (the House humanoid-robot ban, the Senate
// consolidation of foreign-country procurement bans, and the Senate's
// circuit-board inputs section), all on the existing key strong_defense
// (🦅 Peace Through Strength). Three members carry a sourced card: Ted Budd
// (F-15EX), Jeanne Shaheen (F-35 and F-15EX) and Joe Courtney (destroyers and
// oilers).
//
// WHAT THIS SUITE PROVES:
//   1. THE KEY: strong_defense exists in both ISSUE_MAP copies, the stored key
//      list and the related-issues map, and no issue key was added.
//   2. THE DESCRIPTIONS: every section number and heading in each bill, the
//      certifications and limits the official texts set, the statuses, and the
//      provisions recorded without a statement.
//   3. THE CARDS: one card per member, first among their strong_defense cards;
//      direct quotes, https sources, sources[] in the locked schema; the stance
//      map publishes the side; no banned wording; nobody else holds one.
//   4. THE DRAWER: "Stated: Supports" in the header, the stated line cites the
//      new card's source, and Evidence lists the card's links.
//   5. THE VOTES: no S. 4784 cell and no undeclared Roll Call 278 cell; each
//      senator cites Senate Roll Call Vote 195 with the vote the Senate shows,
//      Courtney cites the House Clerk; each says it is not a vote on the section.
//   6. WHERE THIS CONFLICTS: a reader against the stated side gets a conflicts
//      line on a related issue's drawer; an agreeing reader gets none read from
//      the stated side.
//   7. NOTHING ELSE MOVED: every other card and person, the Section 219,
//      right-to-repair, Section 815 and China cards, the issue keys,
//      related-issues map, drawer code, roster, routes, gates and documents are
//      byte-identical to the base; the pass is declared; the precached core
//      chunk and the service worker are unchanged; no migration.
//
//   node scripts/test-ndaa-fy27-multiyear-industrial-base.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { DECLARED_STANCE_PASSES } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "f581574";
const BASE = (f) => {
  try { return execFileSync("git", ["show", `${BASE_REV}:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};
const BASE_LS = (dir) => {
  try { return execFileSync("git", ["ls-tree", "--name-only", dir ? `${BASE_REV}:${dir}` : BASE_REV], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean); }
  catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const PASS = "ndaa_fy27_multiyear_industrial_base_stated_nov2026";
const KEY = "strong_defense";
const TOPIC = "Multiyear Procurement · FY2027 NDAA";
const PRIOR = ["Section 219 · U.S.–Israel Defense Tech", "Military Right to Repair · FY2027 NDAA",
  "Defense Contractor Buybacks · FY2027 NDAA §815", "Chinese Optical Fiber Ban · FY2027 NDAA"];
const REC = JSON.parse(R("db/ndaa-fy27-multiyear-industrial-base-stated-2026-11.json"));
const SET = ["ted_budd", "shaheen", "joe_courtney"];
const NEW_LISTS = ["joe_courtney"];
// What the Senate shows for Roll Call Vote 195 (cloture on the motion to proceed
// to S. 4784, rejected 50-46) and the House Clerk for Roll Call 278.
const SENATE_195 = { ted_budd: "yea", shaheen: "nay" };
const CLERK_278 = { joe_courtney: "nay" };
const SENATE_URL = "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1192/vote_119_2_00195.htm";
const CLERK_URL = "https://clerk.house.gov/Votes/2026278";
const S_TEXT = "https://www.govinfo.gov/content/pkg/BILLS-119s4784rs/html/BILLS-119s4784rs.htm";
const H_TEXT = "https://www.govinfo.gov/content/pkg/BILLS-119hr8800eh/html/BILLS-119hr8800eh.htm";
// The sections each card must name.
const NAMES = {
  ted_budd: [/Section 133/, /Section 161/, /F-15EX/],
  shaheen: [/Sections 132 and 133/, /F-35/, /F-15EX/],
  joe_courtney: [/Sections 123 and 124/, /Arleigh Burke/, /John Lewis/],
};

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
  "related-issues.js",
];
const corpus = buildCorpus(ROOT);
function boot(vocab) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES.map((f) => (f === "alignment-tool.js" ? vocab : f))) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { win.__err = (win.__err || "") + `${f}: ${e.message}; `; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ }
  }
  return win;
}
const stanceData = (src) => { const w = {}; w.window = w; vm.runInContext(src, vm.createContext(w)); return w.ISSUE_STANCE_DATA || {}; };
const text = (h) => String(h || "").replace(/<span class="pdxri-ico"[^>]*>[^<]*<\/span> /g, "").replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const header = (h) => (/data-pdxgap-sec="header"[\s\S]*?data-pdxgap-sec="sentence"/.exec(h) || [""])[0];
const evidence = (h) => (/<section class="pdxgap-ev" data-pdxgap-sec="evidence"[\s\S]*?<\/section>/.exec(h) || [""])[0];
const SAYS = { support: "Stated: Supports", oppose: "Stated: Opposes" };
const OTHER = { support: "oppose", oppose: "support" };
const BANNED = /\bequity\b(?! securit)|utah[- ]first|party[- ]line|along party lines/i;

const VOCABS = ["alignment-tool.js", "issue-map.js"];
const wins = Object.fromEntries(VOCABS.map((v) => [v, boot(v)]));
for (const v of VOCABS) if (wins[v].__err) failures.push(`boot (${v}): ${wins[v].__err}`);
const win = wins["alignment-tool.js"];
const RI = win.PDXRelatedIssues, CS = win.PDXConsistency, MAP = RI && RI.MAP;
const S = win.ISSUE_STANCE_DATA;
const lbl = (k) => String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();
const cardsOf = (W, pid) => (W.ISSUE_STANCE_DATA[pid] || []).filter((c) => c && c.topic === TOPIC);
const memberRec = (pid) => (REC.members || []).find((m) => m.pid === pid);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the issue key exists, and no key was added");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(REC.issueKey, KEY, "the record names another key");
  for (const v of VOCABS) {
    const M = wins[v].ISSUE_MAP || {};
    ok(!!M[KEY] && /Peace Through Strength/.test(String(M[KEY].label)), `${v}: ${KEY} is not Peace Through Strength`);
  }
  eq(JSON.stringify(wins["alignment-tool.js"].ISSUE_MAP[KEY]), JSON.stringify(wins["issue-map.js"].ISSUE_MAP[KEY]), "the two ISSUE_MAP copies disagree");
  ok(R("db/issue-keys.json").includes(`"${KEY}"`), `db/issue-keys.json does not list ${KEY}`);
  ok(Array.isArray(MAP && MAP[KEY]) && MAP[KEY].length > 0, `the related-issues map has no pairs for ${KEY}`);
  for (const v of VOCABS) {
    const b = BASE(v);
    if (b == null) continue;
    const keysOf = (src) => { const w = makeSandbox(); const c = vm.createContext(w); try { vm.runInContext(src, c); } catch { /* partial */ } return Object.keys(w.ISSUE_MAP || {}).sort().join(","); };
    eq(keysOf(R(v)), keysOf(b), `${v}: the issue-key set changed`);
  }
  ok(/Cut Federal Spending & Reduce Debt was considered and not used/.test(REC._note || "") && /No new key and no related-issues pair is added/.test(REC._note || ""), "the record does not say why the key was chosen");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the descriptions match the official texts");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(REC.bills && REC.bills.house && REC.bills.house.url, H_TEXT, "the House text source");
  eq(REC.bills && REC.bills.senate && REC.bills.senate.url, S_TEXT, "the Senate text source");
  eq(REC.bills && REC.bills.house && REC.bills.house.passage && REC.bills.house.passage.roll, 278, "House passage roll");
  eq(REC.bills && REC.bills.house && REC.bills.house.passage && REC.bills.house.passage.result, "Passed 216-212", "House passage result");
  eq(REC.bills && REC.bills.senate && REC.bills.senate.cloture && REC.bills.senate.cloture.roll, 195, "Senate cloture roll");
  eq(REC.bills && REC.bills.senate && REC.bills.senate.cloture && REC.bills.senate.cloture.url, SENATE_URL, "Senate cloture source");

  const BOTH = /House-passed H\.R\. 8800 and the Senate-reported S\. 4784/;
  const want = {
    f35: { house: [["Sec. 162", "Multiyear procurement authority for F-35 aircraft"]], senate: [["Sec. 132", "Multiyear procurement authority for F-35 aircraft"]], status: BOTH, stmt: ["shaheen"] },
    f15ex: { house: [["Sec. 161", "Multiyear procurement authority for F-15EX aircraft"]], senate: [["Sec. 133", "Multiyear procurement authority for F-15EX aircraft"]], status: BOTH, stmt: ["ted_budd", "shaheen"] },
    ddg51: { house: [["Sec. 123", "Multiyear procurement authority for Arleigh Burke class destroyers"]], senate: [], status: /House-passed H\.R\. 8800 only; no Senate counterpart/, stmt: ["joe_courtney"] },
    john_lewis_oilers: { house: [["Sec. 124", "Multiyear procurement authority for John Lewis class Oilers"]], senate: [], status: /House-passed H\.R\. 8800 only; no Senate counterpart/, stmt: ["joe_courtney"] },
    e2d: { house: [["Sec. 127", "Multiyear procurement authority for E-2D Advanced Hawkeye aircraft"]], senate: [["Sec. 126", "Procurement authority for E-2D Advanced Hawkeye aircraft program"]], status: /block buy/, stmt: [] },
    munitions: { house: [["Sec. 1839", "Multiyear procurement authority for certain munitions"], ["Sec. 1840", "Multiyear procurement authority for platforms and components systems"]], senate: [["Sec. 801", "Multi-year procurement for certain munitions"]], status: BOTH, stmt: [] },
  };
  const wantIB = {
    humanoid_robots: { house: [["Sec. 163", "Prohibition on procurement and use of humanoid robotic systems produced, developed, or controlled by foreign adversaries"]], senate: [], status: /House-passed H\.R\. 8800 only; no Senate counterpart/ },
    consolidated_country_bans: { house: [], senate: [["Sec. 811", "Consolidation and rationalization of restrictions on procurement from certain foreign countries"]], status: /Senate-reported S\. 4784 only; no House counterpart/ },
    pcb_inputs: { house: [], senate: [["Sec. 844", "Amendments to requirements pertaining to printed circuit boards"]], status: /Senate-reported S\. 4784 only; no House counterpart/ },
  };
  const check = (list, W, label) => {
    eq(list.map((p) => p.id).join(","), Object.keys(W).join(","), `the ${label} provisions on file`);
    for (const p of list) {
      const w = W[p.id]; if (!w) continue;
      eq(JSON.stringify((p.house || []).map((x) => [x.section, x.heading])), JSON.stringify(w.house), `${p.id}: House sections and headings`);
      eq(JSON.stringify((p.senate || []).map((x) => [x.section, x.heading])), JSON.stringify(w.senate), `${p.id}: Senate sections and headings`);
      ok((p.description || "").length > 120 && (p.excerpt || "").length > 30, `${p.id}: no description or excerpt`);
      ok(w.status.test(p.status || "") && /not enacted\.$/.test(p.status || ""), `${p.id}: the status is wrong — ${p.status}`);
      ok(!BANNED.test(JSON.stringify(p)), `${p.id}: banned wording`);
      if ("stmt" in w) eq((p.statements || []).join(","), w.stmt.join(","), `${p.id}: statements on file`);
      else eq((p.statements || []).length, 0, `${p.id}: a statement is on file for a provision recorded without one`);
    }
  };
  const MY = REC.multiyear || [], IB = REC.industrialBase || [];
  check(MY, want, "multiyear");
  check(IB, wantIB, "industrial-base");
  const by = (list, id) => list.find((p) => p.id === id) || {};
  // F-35: House savings certification and readiness report; Senate F-35A/B/C.
  const f35 = by(MY, "f35");
  ok(/not less than 5 percent/.test(f35.description || "") && /Cost Assessment and Program Evaluation/.test(f35.description || "") && /readiness/.test(f35.description || ""), "the F-35 House limits are not described");
  ok(/F-35A, F-35B and F-35C/.test(f35.description || "") && /3501\(a\)/.test(f35.description || "") && /90 days/.test(f35.description || ""), "the F-35 Senate text is not described");
  ok(/^any multiyear contracts for the procurement of F-35 aircraft units will achieve savings of not less than 5 percent/.test(f35.excerpt || ""), "the F-35 savings certification is not quoted");
  // F-15EX: House spares / conformal tanks; Senate 268 by 2035.
  const f15 = by(MY, "f15ex");
  ok(/conformal fuel tanks/.test(f15.description || "") && /268 F-15EX aircraft by 2035/.test(f15.description || ""), "the F-15EX limits are not described");
  ok(/not less than 268 F-15EX aircraft by 2035$/.test(f15.excerpt || ""), "the F-15EX certification is not quoted");
  // Destroyers: up to 15 Flight III, prepriced option, 10 percent cap.
  const ddg = by(MY, "ddg51");
  ok(/up to 15 Arleigh Burke class Flight III/.test(ddg.description || "") && /prepriced option/.test(ddg.description || "") && /10 percent/.test(ddg.description || "") && /House only/.test(ddg.description || ""), "the destroyer limits are not described");
  ok(/up to 15 Arleigh Burke class Flight III guided missile destroyers$/.test(ddg.excerpt || ""), "the destroyer authority is not quoted");
  const ao = by(MY, "john_lewis_oilers");
  ok(/termination liability/.test(ao.description || "") && /continuous production/.test(ao.description || "") && /House only/.test(ao.description || ""), "the oiler terms are not described");
  const e2d = by(MY, "e2d");
  ok(/twelve E-2D/.test(e2d.description || "") && /block buy/.test(e2d.description || "") && /2027 through 2029/.test(e2d.description || ""), "the E-2D difference between the bills is not described");
  const mun = by(MY, "munitions");
  ok(/13 munitions/.test(mun.description || "") && /18 more systems/.test(mun.description || "") && /19 munitions/.test(mun.description || "") && /seven days before award/.test(mun.description || ""), "the munitions authorities are not described");
  ok(/not more than seven program years/.test(mun.excerpt || ""), "the munitions term limit is not quoted");
  // Humanoid robots.
  const hr = by(IB, "humanoid_robots");
  ok(/firmware, software, AI models or cloud services/.test(hr.description || "") && /10 U\.S\.C\. 4872/.test(hr.description || "") && /air-gapped/.test(hr.description || "") && /30 days/.test(hr.description || "") && /House only/.test(hr.description || ""), "the humanoid-robot ban is not described");
  ok(/^The Secretary of Defense may not procure, lease, or otherwise obtain a covered humanoid robotic system/.test(hr.excerpt || ""), "the humanoid-robot ban is not quoted");
  // Consolidation.
  const cb = by(IB, "consolidated_country_bans");
  ok(/chapter 390 of title 10/.test(cb.description || "") && /January 1, 2028/.test(cb.description || "") && /North Korea, China, Russia and Iran/.test(cb.description || "") && /any tier/.test(cb.description || "") && /supplier certifications/.test(cb.description || "") && /Senate only/.test(cb.description || ""), "the consolidation is not described");
  ok(/mined, refined, processed, manufactured, or assembled, in whole or in part, by a covered country or covered entity$/.test(cb.excerpt || ""), "the consolidated prohibition is not quoted");
  // Circuit boards.
  const pcb = by(IB, "pcb_inputs");
  ok(/10 U\.S\.C\. 4873/.test(pcb.description || "") && /copper clad laminate, copper foil and glass fiber/.test(pcb.description || "") && /January 1, 2029/.test(pcb.description || "") && /Section 827/.test(pcb.description || ""), "the circuit-board inputs are not described");
  // Nothing from the earlier China pass is carried again.
  const prior = JSON.parse(R("db/ndaa-fy27-china-tech-stated-2026-11.json"));
  const priorSecs = new Set((prior.provisions || []).flatMap((p) => [...(p.house || []), ...(p.senate || [])].map((x) => x.section)));
  for (const p of IB) for (const x of [...(p.house || []), ...(p.senate || [])]) ok(!priorSecs.has(x.section), `${p.id}: ${x.section} was already recorded by the China pass`);
  ok(/November 11, 2026/.test(REC.status || "") && /has not passed S\. 4784/.test(REC.status || "") && /no recorded vote in either chamber addresses any of these sections by itself/.test(REC.status || ""), "the status is missing");
  ok((REC.notCarried || []).some((n) => /Moolenaar/.test(n.name) && /GUARD Act/.test(n.why)), "the record does not say why Moolenaar is not carried");
  ok(!BANNED.test(JSON.stringify(REC)), "the record carries banned wording");
  // H.R. 8800 still lands on strong_defense as its primary.
  const seed = JSON.parse(R("db/vr-issue-seed.json"));
  const m = (function find(o) { if (!o || typeof o !== "object") return null; if (o.number === "H.R. 8800" && Array.isArray(o.issues)) return o; for (const v of Object.values(o)) { const r = find(v); if (r) return r; } return null; })(seed);
  ok(m && m.issues.some((i) => i.issueKey === KEY && i.isPrimary === true), "H.R. 8800 is not mapped to strong_defense as its primary");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one sourced card per member, first on the key");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq((REC.members || []).map((m) => m.pid).sort().join(","), SET.slice().sort().join(","), "the record's members");
  const core = stanceData(R("politician-stances-core.js")), ext = stanceData(R("politician-stances-ext.js"));
  const src = stanceData(R("politician-stances.js"));
  const provIds = new Set([...(REC.multiyear || []), ...(REC.industrialBase || [])].map((p) => p.id));
  for (const pid of SET) {
    const m = memberRec(pid), list = S[pid] || [], cards = cardsOf(win, pid);
    ok(!!win.CMP_DATA[pid], `${pid} is not on the roster`);
    eq(m.side, "support", `${pid}: the record's side`);
    eq(m.position, "first", `${pid}: the record's position`);
    ok(/^https:\/\//.test(m.source || ""), `${pid}: the record has no source`);
    ok((m.provisions || []).length > 0 && m.provisions.every((id) => provIds.has(id)), `${pid}: the record names an unknown provision`);
    for (const id of m.provisions || []) {
      const p = [...REC.multiyear, ...REC.industrialBase].find((x) => x.id === id);
      ok((p.statements || []).includes(pid), `${pid}: ${id} does not list the member's statement`);
    }
    const chunk = pid in core ? core : ext;
    eq(JSON.stringify(chunk[pid]), JSON.stringify(src[pid]), `${pid}: the chunk is not regenerated from politician-stances.js`);
    if (!eq(cards.length, 1, `${pid}: new cards`)) continue;
    const c = cards[0];
    eq(c.issueKey, KEY, `${pid}: the card's key`);
    eq(c.issueStance, m.side, `${pid}: the card's issueStance`);
    eq(c.pos, m.side, `${pid}: the card's pos`);
    eq(c.position, m.side, `${pid}: the card's locked-schema position`);
    eq(c.status, "active", `${pid}: the card's status`);
    const onKey = list.filter((x) => x.issueKey === KEY);
    eq(onKey[0], c, `${pid}: the multiyear card is not first on ${KEY}`);
    for (const re of NAMES[pid]) ok(re.test(c.text), `${pid}: the card does not name ${re}`);
    ok(/FY2027 NDAA/.test(c.text) && /multi-?year procurement/.test(c.text), `${pid}: the card does not name the authority and the bill`);
    ok(/"[^"]{12,}"/.test(c.text), `${pid}: the card has no direct quote`);
    ok(c.text.length <= 320, `${pid}: the card text is too long (${c.text.length})`);
    ok(c.source && /^https:\/\//.test(c.source.url || "") && c.source.label, `${pid}: the card has no source`);
    eq(c.source && c.source.url, m.source, `${pid}: the card's source is not the record's`);
    ok(Array.isArray(c.sources) && c.sources.length === 2, `${pid}: sources[] is not the statement and the vote`);
    for (const x of c.sources || []) {
      ok(/^https:\/\//.test(x.link || "") && x.type && x.label && x.excerpt && /^20\d\d-\d\d-\d\d$/.test(x.date || "") && x.weight === "strong",
        `${pid}: a source is not in the locked schema — ${JSON.stringify(x).slice(0, 160)}`);
    }
    eq(c.sources[0].link, c.source.url, `${pid}: the first source is not the statement`);
    ok(/^“[\s\S]{12,}”$/.test(c.sources[0].excerpt), `${pid}: the statement excerpt is not a quotation`);
    // The card's quote is taken from the statement's excerpt.
    const q = (/"([^"]{12,})"/.exec(c.text) || [])[1] || "";
    const norm = (t) => t.replace(/[’']/g, "'").replace(/[.,]$/, "").toLowerCase();
    ok(norm(c.sources[0].excerpt).includes(norm(q).replace(/\.$/, "")), `${pid}: the card's quote is not in the statement excerpt`);
    ok(!BANNED.test(`${c.topic} ${c.text} ${c.evidence} ${(c.sources || []).map((x) => x.excerpt).join(" ")}`), `${pid}: banned wording`);
    ok(!/Section 219|Israel|right to repair|buyback|optical fiber/i.test(`${c.text} ${c.evidence}`), `${pid}: the card leans on another provision`);
    const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
    eq(pm[KEY] && pm[KEY].stance, m.side, `${pid}: the stance map does not publish the stated side`);
    eq(pm[KEY] && pm[KEY].text, c.text, `${pid}: the stance map does not read the multiyear card`);
  }
  // Nobody else holds the card, and no card was written for a provision without a statement.
  const holders = Object.keys(S).filter((pid) => cardsOf(win, pid).length);
  eq(holders.sort().join(","), SET.slice().sort().join(","), "someone outside the set holds a multiyear card");
  const all = Object.values(S).flat().filter(Boolean);
  ok(!all.some((c) => /humanoid|Section 811|chapter 390|copper clad/i.test(`${c.topic} ${c.text}`)), "a card was written for a provision with no statement on file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the drawer's stated line and Evidence read the card");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const v of VOCABS) {
    const W = wins[v];
    for (const pid of SET) {
      const m = memberRec(pid);
      const c = cardsOf(W, pid)[0];
      if (!ok(!!c, `${v} · ${pid}: no card`)) continue;
      const first = (W.ISSUE_STANCE_DATA[pid] || []).find((x) => x.issueKey === KEY);
      eq(first, c, `${v} · ${pid}: the stated line does not read the multiyear card`);
      const h = W.PDXConsistency.gapViewHtml(pid, KEY) || "";
      const hd = text(header(h));
      ok(hd.includes(SAYS[m.side]), `${v} · ${pid}: the drawer header does not print "${SAYS[m.side]}" — ${hd.slice(0, 160)}`);
      ok(hd.includes(`Source: ${c.source.label}`), `${v} · ${pid}: the stated line does not cite the card's source`);
      ok(h.includes(`data-pdx-stance="${KEY}"`) && h.includes(`data-pdx-stance-side="${m.side}"`), `${v} · ${pid}: the stance marks are missing`);
      const ev = evidence(h);
      for (const x of c.sources) ok(ev.includes(`href="${x.link}"`), `${v} · ${pid}: Evidence does not link ${x.link}`);
      ok(text(ev).includes(text(c.sources[0].excerpt)), `${v} · ${pid}: Evidence does not print the statement's excerpt`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the votes: cited, never invented");
// ═════════════════════════════════════════════════════════════════════════════
{
  const all = [...corpus.byMember.values()].flat();
  eq(all.filter((r) => /^S\. 4784\|/.test(r.measureId || "")).length, 0, "an S. 4784 voting-record cell appeared");
  for (const pid of SET) {
    const m = memberRec(pid);
    const c = cardsOf(win, pid)[0];
    if (!c) continue;
    if (m.chamber === "senate") {
      eq(m.clotureVote, SENATE_195[pid], `${pid}: the cloture vote is not what the Senate shows`);
      const v = (c.sources || []).find((x) => x.link === SENATE_URL && x.type === "recorded vote");
      const word = m.clotureVote === "yea" ? "yes" : "no";
      ok(!!v && new RegExp(`^Voted ${word} on cloture on the motion to proceed to S\\. 4784`).test(v.excerpt) && /not a vote on Sections? [\d and]+ (itself|themselves)/.test(v.excerpt),
        `${pid}: the Senate cloture citation is missing, wrong or overclaims`);
      ok(new RegExp(`voted ${word} when cloture on taking up S\\. 4784 failed 50–46`).test(c.evidence), `${pid}: the evidence does not state the cloture vote`);
      ok(/No vote has addressed (it|them)/.test(c.evidence), `${pid}: the evidence does not say no vote addressed the section`);
      ok(!(c.sources || []).some((x) => /clerk\.house\.gov/.test(x.link)), `${pid}: a senator carries a House roll call`);
    } else {
      const recs = (corpus.byMember.get(pid) || []).filter((r) => r.measureId === "H.R. 8800|119" && r.rollNumber === 278);
      eq(recs.length, 0, `${pid}: a Roll Call 278 cell appeared without being declared`);
      eq(m.voteAttributed, false, `${pid}: an unattributed vote is not marked so`);
      eq(m.vote, CLERK_278[pid], `${pid}: the record's Roll Call 278 vote is not what the Clerk shows`);
      const v = (c.sources || []).find((x) => x.link === CLERK_URL && x.type === "recorded vote");
      ok(!!v && /^Voted no on passage of H\.R\. 8800/.test(v.excerpt) && /Sections 123 and 124/.test(v.excerpt), `${pid}: the House Clerk citation is missing or wrong`);
      ok(/voted no on final passage of H\.R\. 8800/.test(c.evidence) && /No separate vote/.test(c.evidence) && /Senate bill has no counterpart/.test(c.evidence), `${pid}: the evidence does not state the vote`);
      ok(!(c.sources || []).some((x) => /senate\.gov\/legislative/.test(x.link)), `${pid}: a House member carries a Senate roll`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a reader against the stated side gets a conflicts line");
// ═════════════════════════════════════════════════════════════════════════════
{
  let hits = 0;
  const rel = (MAP[KEY] || []).filter((k) => (MAP[k] || []).includes(KEY));
  ok(rel.length > 0, `${KEY}: no two-way related pair`);
  for (const pid of SET) {
    const m = memberRec(pid);
    let hit = false;
    for (const A of rel) {
      win.PDXStanceSides = { list: () => [{ key: KEY, position: OTHER[m.side], priority: "medium" }] };
      const c = (RI.conflictsFor(pid, win.CMP_DATA[pid], A) || []).find((x) => x.bKey === KEY);
      if (!c) continue;
      eq(RI.conflictText(c), `${lbl(A)} and ${lbl(KEY)}: on ${lbl(KEY)} they ${m.side}; you ${OTHER[m.side]}.`,
        `${pid} × ${A}: the line does not name both issues, the stated side and the reader's`);
      eq(c.sides[0].how, "stated", `${pid} × ${A}: the conflict is not read from the stated position`);
      const h = CS.gapViewHtml(pid, A) || "";
      ok(h.includes(`data-pdxri-cf="${KEY}"`), `${pid} × ${A}: the drawer does not print the conflicts line`);
      win.PDXStanceSides = { list: () => [{ key: KEY, position: m.side, priority: "medium" }] };
      const agree = (RI.conflictsFor(pid, win.CMP_DATA[pid], A) || []).filter((x) => x.bKey === KEY);
      eq(agree.filter((x) => (x.sides || []).some((s) => s.how === "stated")).length, 0, `${pid} × ${A}: an agreeing reader still gets a stated conflict`);
      ok(agree.every((x) => (x.sides || []).every((s) => s.how === "record")), `${pid} × ${A}: an agreeing reader gets a conflict not read from the voting record`);
      hit = true; hits++;
      break;
    }
    ok(hit, `${pid}: no related issue reached the conflicts check`);
  }
  delete win.PDXStanceSides;
  ok(hits >= SET.length, `too few conflicts lines (${hits})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · nothing else moved; declared; no shell bump; no migration");
// ═════════════════════════════════════════════════════════════════════════════
{
  const own = DECLARED_STANCE_PASSES.findIndex((x) => x.pass === PASS);
  const d = DECLARED_STANCE_PASSES[own];
  ok(!!d, "the pass is not declared in v103-chrome-seams.mjs");
  eq(d && d.pids.slice().sort().join(","), SET.slice().sort().join(","), "the declared pids are not the set");
  const later = new Set(DECLARED_STANCE_PASSES.slice(own + 1).flatMap((x) => x.pids));
  const base = BASE("politician-stances.js");
  if (base == null) {
    console.log("     (no git baseline — byte-identity checks skipped)");
  } else {
    const before = stanceData(base), after = stanceData(R("politician-stances.js"));
    for (const pid of NEW_LISTS) ok(!(pid in before), `${pid} already had stance entries at the base`);
    for (const pid of SET.filter((p) => !NEW_LISTS.includes(p))) {
      ok(pid in before, `${pid} had no stance entries at the base`);
      eq((before[pid] || []).filter((c) => c.topic === TOPIC).length, 0, `${pid}: the new card existed at the base`);
      if (later.has(pid)) continue;
      const kept = (after[pid] || []).filter((c) => c.topic !== TOPIC);
      eq(JSON.stringify(kept), JSON.stringify(before[pid]), `${pid}: another card changed`);
    }
    for (const pid of NEW_LISTS.filter((p) => !later.has(p))) eq((after[pid] || []).map((c) => c.topic).join("|"), TOPIC, `${pid}: the new list holds more than the multiyear card`);
    const others = Object.keys(before).filter((pid) => !SET.includes(pid) && !later.has(pid));
    ok(others.every((pid) => JSON.stringify(before[pid]) === JSON.stringify(after[pid])), "another person's stance entries changed");
    eq(Object.keys(after).filter((pid) => !later.has(pid) && !(pid in before)).sort().join(","), NEW_LISTS.filter((p) => !later.has(p)).sort().join(","), "a person other than the set was added");
    // The earlier FY2027 NDAA cards are untouched.
    for (const T of PRIOR) {
      const pick = (o) => JSON.stringify(Object.keys(o).sort().map((p) => [p, (o[p] || []).filter((c) => c.topic === T)]).filter((x) => x[1].length));
      eq(pick(after), pick(before), `a "${T}" card changed`);
    }
    for (const f of ["related-issues.js", "consistency.js", "issue-map.js", "alignment-tool.js", "stance-helpers.js", "cmp-data.js",
      "cmp-data-detail.js", "db/issue-keys.json", "db/issue-core-categories.json", "db/vr-issue-seed.json", "db/bill-docs.json",
      "db/section-219-ndaa-stated-2026-11.json", "db/ndaa-fy27-right-to-repair-stated-2026-11.json",
      "db/ndaa-fy27-sec-815-capital-distributions-stated-2026-11.json", "db/ndaa-fy27-china-tech-stated-2026-11.json",
      "issue-scope.js", "stance-sides.js", "my-stances.js", "voting-record.js",
      "person.html", "index.html", "issue.html", "ballot.html", "netlify.toml", "_redirects"]) {
      const b = BASE(f);
      let now = null; try { now = R(f); } catch { /* absent */ }
      eq(now, b, `${f} changed`);
    }
    {
      // sitemap.xml may move only for a person page a declared pass lifted over
      // the publication floor; this pass lifts none.
      const allowed = new Set([...later].map((p) => `  <url><loc>https://politidex.fyi/p/${p}</loc></url>`));
      const strip = (x) => String(x || "").split("\n").filter((l) => !allowed.has(l)).join("\n");
      eq(strip(R("sitemap.xml")).replace(/\(\d+ urls\)/g, ""), strip(BASE("sitemap.xml")).replace(/\(\d+ urls\)/g, ""), "sitemap.xml changed");
    }
    const ls = BASE_LS();
    if (ls) {
      const htmlNow = readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
      eq(htmlNow.join(","), ls.filter((f) => f.endsWith(".html")).sort().join(","), "a document was added or removed");
      let fnNow = []; try { fnNow = readdirSync(join(ROOT, "netlify/functions")); } catch { /* none */ }
      eq(fnNow.sort().join(","), (BASE_LS("netlify/functions") || []).sort().join(","), "a function (route) was added or removed");
      let edNow = []; try { edNow = readdirSync(join(ROOT, "netlify/edge-functions")); } catch { /* none */ }
      eq(edNow.sort().join(","), (BASE_LS("netlify/edge-functions") || []).sort().join(","), "an edge function (gate) was added or removed");
    }
    let migs = []; try { migs = readdirSync(join(ROOT, "netlify/database/migrations")); } catch { /* none */ }
    for (const f of migs) ok(BASE(`netlify/database/migrations/${f}`) != null, `${f}: a migration this pass added`);
    // Every member sits in the runtime-cached ext chunk, so the precached core
    // chunk is unchanged and the shell does not move.
    const core = stanceData(R("politician-stances-core.js"));
    ok(SET.every((p) => !(p in core)), "a member of the set is in the precached core chunk");
    if (!later.size) {
      eq(R("politician-stances-core.js"), BASE("politician-stances-core.js"), "the precached core chunk changed");
      eq(R("sw.js"), BASE("sw.js"), "sw.js changed although no precached file did");
    }
  }
  const sw = R("sw.js");
  const pre = (src) => (String(src).match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
  ok(pre(sw).includes("politician-stances-core.js") && !pre(sw).includes("politician-stances-ext.js"), "the precache split changed");
}

if (failures.length) {
  console.error(`\n✗ ndaa fy27 multiyear / industrial base: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ ndaa fy27 multiyear / industrial base: all ${passed} assertions passed`);
