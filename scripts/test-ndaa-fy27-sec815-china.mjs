#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ndaa-fy27-sec815-china.mjs — FY2027 NDAA Section 815 and China tech
// ─────────────────────────────────────────────────────────────────────────────
// Section 815 of S. 4784 ("Limitations relating to capital distributions for
// defense contractors") is filed on the existing issue key econ_corp_account
// (🏦 Corporate Accountability); db/ndaa-fy27-sec-815-capital-distributions-
// stated-2026-11.json records the section, its history and the five senators
// with a sourced statement on it. The China / foreign-adversary technology
// sections of H.R. 8800 and S. 4784 are filed on the existing key
// strong_defense (🦅 Peace Through Strength); db/ndaa-fy27-china-tech-stated-
// 2026-11.json records four provisions and the one member (Pat Harrigan, on the
// optical-fiber ban) with a sourced statement on a specific one.
//
// WHAT THIS SUITE PROVES:
//   1. THE KEYS: both keys exist in both ISSUE_MAP copies, the stored key list
//      and the related-issues map, and no issue key was added.
//   2. THE DESCRIPTIONS: Section 815's heading, prohibition, June 15, 2027
//      start, investment-plan waiver, sunset, absence from H.R. 8800, committee
//      and floor history and status; the China provisions' section numbers and
//      headings in each bill, their excerpts and statuses.
//   3. THE CARDS: one Section 815 card per senator, first among their
//      econ_corp_account cards; Harrigan's optical-fiber card second on
//      strong_defense, right after his right-to-repair card; direct quotes,
//      https sources, sources[] in the locked schema; the stance map publishes
//      the side; no banned wording.
//   4. THE DRAWER: "Stated: Supports" in the header, the stated line cites the
//      first card's source, and Evidence lists the new card's links.
//   5. THE VOTES: no S. 4784 cell exists and none was invented; each senator
//      cites Senate Roll Call Vote 195 with the vote the Senate shows and says it
//      is not a vote on Section 815; Harrigan cites the House Clerk.
//   6. WHERE THIS CONFLICTS: a reader against the stated side gets a
//      conflicts line on a related issue's drawer; an agreeing reader gets none
//      read from the stated side.
//   7. NOTHING ELSE MOVED: every other card and person, the Section 219 and
//      right-to-repair cards, the issue keys, related-issues map, drawer code,
//      roster, routes and documents are byte-identical to the base; the pass is
//      declared; the shell moves one version with its precache list and worker
//      code unchanged; no migration.
//
//   node scripts/test-ndaa-fy27-sec815-china.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { DECLARED_STANCE_PASSES, swCodeOnly, withoutHeroCrawl, carveDeclaredAdmissions } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "ba365ec";
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

const PASS = "ndaa_fy27_sec815_china_tech_stated_nov2026";
const K815 = "econ_corp_account";
const KCN = "strong_defense";
const T815 = "Defense Contractor Buybacks · FY2027 NDAA §815";
const TCN = "Chinese Optical Fiber Ban · FY2027 NDAA";
const R2R = "Military Right to Repair · FY2027 NDAA";
const S219 = "Section 219 · U.S.–Israel Defense Tech";
const REC = JSON.parse(R("db/ndaa-fy27-sec-815-capital-distributions-stated-2026-11.json"));
const CN = JSON.parse(R("db/ndaa-fy27-china-tech-stated-2026-11.json"));
const SET815 = ["warren", "hawley", "lee", "reed", "rick_scott"];
const SETCN = ["pat_harrigan"];
const SET = [...SET815, ...SETCN];
// What the Senate shows for Roll Call Vote 195 (cloture on the motion to proceed
// to S. 4784, rejected 50-46) and the House Clerk for Roll Call 278.
const SENATE_195 = { warren: "nay", hawley: "yea", lee: "yea", reed: "nay", rick_scott: "yea" };
const CLERK_278 = { pat_harrigan: "yea" };
const SENATE_URL = "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1192/vote_119_2_00195.htm";
const CLERK_URL = "https://clerk.house.gov/Votes/2026278";
const S_TEXT = "https://www.govinfo.gov/content/pkg/BILLS-119s4784rs/html/BILLS-119s4784rs.htm";
const H_TEXT = "https://www.govinfo.gov/content/pkg/BILLS-119hr8800eh/html/BILLS-119hr8800eh.htm";

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
const cardsOf = (W, pid, topic) => (W.ISSUE_STANCE_DATA[pid] || []).filter((c) => c && c.topic === topic);
// Each member's new card: [topic, key].
const NEW = Object.fromEntries([...SET815.map((p) => [p, [T815, K815]]), ...SETCN.map((p) => [p, [TCN, KCN]])]);
const memberRec = (pid) => (REC.members || []).find((m) => m.pid === pid) || (CN.members || []).find((m) => m.pid === pid);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the issue keys exist, and no key was added");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(REC.issueKey, K815, "the Section 815 record names another key");
  eq(CN.issueKey, KCN, "the China record names another key");
  for (const [KEY, re] of [[K815, /Corporate Accountability/], [KCN, /Peace Through Strength/]]) {
    for (const v of VOCABS) {
      const M = wins[v].ISSUE_MAP || {};
      ok(!!M[KEY], `${v}: ISSUE_MAP has no ${KEY}`);
      ok(re.test(String(M[KEY] && M[KEY].label)), `${v}: ${KEY} is not the expected key`);
    }
    eq(JSON.stringify(wins["alignment-tool.js"].ISSUE_MAP[KEY]), JSON.stringify(wins["issue-map.js"].ISSUE_MAP[KEY]), `the two ISSUE_MAP copies disagree on ${KEY}`);
    ok(R("db/issue-keys.json").includes(`"${KEY}"`), `db/issue-keys.json does not list ${KEY}`);
    ok(Array.isArray(MAP && MAP[KEY]) && MAP[KEY].length > 0, `the related-issues map has no pairs for ${KEY}`);
  }
  for (const v of VOCABS) {
    const b = BASE(v);
    if (b == null) continue;
    const keysOf = (src) => { const w = makeSandbox(); const c = vm.createContext(w); try { vm.runInContext(src, c); } catch { /* partial */ } return Object.keys(w.ISSUE_MAP || {}).sort().join(","); };
    eq(keysOf(R(v)), keysOf(b), `${v}: the issue-key set changed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the descriptions match the official texts");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Section 815.
  const P = REC.provision || {}, T = P.text || {};
  eq(P.bill, "S. 4784", "Section 815 bill");
  eq(P.congress, 119, "Section 815 congress");
  eq(P.title, "National Defense Authorization Act for Fiscal Year 2027", "bill title");
  eq(P.section, "Sec. 815", "Senate section");
  eq(P.heading, "Limitations relating to capital distributions for defense contractors", "Senate section heading");
  eq(T.url, S_TEXT, "the Senate text source is not the reported bill on GovInfo");
  ok(/^beginning on June 15, 2027, the Secretary of Defense may not enter into a contract for the procurement of goods or services, unless the contractor agrees in writing/.test(T.prohibition || ""), "the prohibition does not open on the contract condition");
  ok(/purchase an equity security of such entity, or any parent entity of such entity, that is listed on a national securities exchange/.test(T.prohibition || ""), "the buyback limb is not quoted");
  ok(/pay dividends or make any other capital distribution with respect to the equity securities of the entity$/.test(T.prohibition || ""), "the dividend / capital distribution limb is not quoted");
  eq(T.effectiveDate, "2027-06-15", "the effective date");
  ok(/may waive the limitation in subsection \(a\) for the purpose of rewarding contractors that agree to a qualifying defense investment plan that is approved by the Secretary/.test(T.waiver || ""), "the waiver is not quoted");
  ok(/facilities, tooling, non-reimbursable research and development, workforce training or stockpiling/.test(T.qualifyingInvestment || "") && /allowable or reimbursable/.test(T.qualifyingInvestment || ""), "the qualifying defense investment is not described");
  ok(/30 days/.test(T.enforcement || "") && /15-day/.test(T.enforcement || "") && /suspending payment/.test(T.enforcement || "") && /3804/.test(T.enforcement || ""), "the enforcement is not described");
  ok(/January 1, 2031/.test(T.sunset || ""), "the sunset is missing");
  ok(/Warren/.test(P.origin || "") && /Hawley/.test(P.origin || "") && /Prioritizing the Warfighter in Defense Contracting Act/.test(P.origin || ""), "the origin is incomplete");
  const H = REC.house || {};
  eq(H.inHouseBill, false, "the record does not say the House bill has no counterpart");
  ok(/never uses "capital distribution" or "repurchase"/.test(H.note || "") && /Sec\. 3643/.test(H.note || ""), "the House note does not explain the absence and the shipbuilding clause");
  eq(H.text && H.text.url, H_TEXT, "the House text source");
  ok(/not made in order/.test(H.floor || "") && /not a vote on Section 815/.test(H.floor || ""), "the House floor history is incomplete");
  const Sn = REC.senate || {};
  ok(/no separate vote on Section 815/.test(Sn.committee || "") && /18-9/.test(Sn.committee || ""), "the committee history is incomplete");
  eq(Sn.committeeReportVote && Sn.committeeReportVote.result, "Ordered reported 18-9", "committee report vote");
  ok(/not on Section 815/.test(Sn.committeeReportVote && Sn.committeeReportVote.note || ""), "the 18-9 vote is not marked as a vote on the whole bill");
  eq(Sn.cloture && Sn.cloture.result, "Cloture on the motion to proceed rejected, 50-46", "Senate cloture result");
  eq(Sn.cloture && Sn.cloture.roll, 195, "Senate cloture roll");
  eq(Sn.cloture && Sn.cloture.date, "2026-07-14", "Senate cloture date");
  eq(Sn.cloture && Sn.cloture.url, SENATE_URL, "Senate cloture source");
  ok(/November 10, 2026/.test(Sn.status || "") && /has not passed S\. 4784/.test(Sn.status || "") && /no recorded vote in either chamber addresses Section 815 itself/.test(Sn.status || ""), "the Senate status is missing");
  ok(/S\. Rept\. 119-127/.test(P.committeeReport || ""), "the committee report is not named");
  ok(!BANNED.test(JSON.stringify(REC)), "the Section 815 record carries banned wording");

  // The China provisions.
  const want = {
    cmc_list_1260h: { house: ["Sec. 1243", "Sec. 1244"], senate: ["Sec. 849", "Sec. 843"], both: true, stmt: [] },
    fasc_exclusion_orders: { house: ["Sec. 1812"], senate: [], both: false, stmt: [] },
    optical_fiber_ban: { house: ["Sec. 1814"], senate: ["Sec. 846"], both: true, stmt: ["pat_harrigan"] },
    it_vulnerability_sharing: { house: ["Sec. 1526"], senate: ["Sec. 1635"], both: true, stmt: [] },
  };
  const provs = CN.provisions || [];
  eq(provs.map((p) => p.id).join(","), Object.keys(want).join(","), "the China provisions on file");
  eq(CN.bills && CN.bills.house && CN.bills.house.url, H_TEXT, "the House text source (China)");
  eq(CN.bills && CN.bills.senate && CN.bills.senate.url, S_TEXT, "the Senate text source (China)");
  eq(CN.bills && CN.bills.house && CN.bills.house.passage && CN.bills.house.passage.roll, 278, "House passage roll (China)");
  for (const p of provs) {
    const w = want[p.id]; if (!w) continue;
    eq((p.house || []).map((x) => x.section).join(","), w.house.join(","), `${p.id}: House sections`);
    eq((p.senate || []).map((x) => x.section).join(","), w.senate.join(","), `${p.id}: Senate sections`);
    ok([...(p.house || []), ...(p.senate || [])].every((x) => x.heading && x.heading.length > 20), `${p.id}: a section has no heading`);
    ok((p.description || "").length > 80 && (p.excerpt || "").length > 20, `${p.id}: no description or excerpt`);
    ok(w.both ? /House-passed H\.R\. 8800 and the Senate-reported S\. 4784; not enacted/.test(p.status) : /House-passed H\.R\. 8800 only/.test(p.status), `${p.id}: the status is wrong`);
    eq((p.statements || []).join(","), w.stmt.join(","), `${p.id}: statements on file`);
  }
  const P1 = provs.find((p) => p.id === "cmc_list_1260h") || {};
  ok(/2030 to 2035/.test(P1.description || "") && /Single Champion/.test(P1.description || "") && /operate in the United States/.test(P1.description || ""), "the 1260H description is incomplete");
  const P2 = provs.find((p) => p.id === "fasc_exclusion_orders") || {};
  ok(/Federal Acquisition Security Council/.test(P2.description || "") && /90 days/.test(P2.description || "") && /House only/.test(P2.description || ""), "the exclusion-order description is incomplete");
  const P3 = provs.find((p) => p.id === "optical_fiber_ban") || {};
  eq((P3.house || [])[0] && P3.house[0].heading, "Prohibition on the use of Chinese-manufactured optical fiber by the Department of Defense", "the optical-fiber House heading");
  eq((P3.senate || [])[0] && P3.senate[0].heading, (P3.house || [])[0] && P3.house[0].heading, "the optical-fiber headings differ");
  ok(/^The Secretary of Defense may not procure or obtain optical fiber and optical fiber cable produced, manufactured, or assembled by an entity that is owned by, controlled by, or subject to the jurisdiction or direction of the People's Republic of China/.test(P3.excerpt || ""), "the optical-fiber House text is not quoted");
  ok(/contractors and subcontractors at any tier/.test(P3.description || ""), "the Senate's contractor reach is not described");
  const P4 = provs.find((p) => p.id === "it_vulnerability_sharing") || {};
  ok(/270 days/.test(P4.description || "") && /country of concern/.test(P4.excerpt || ""), "the IT-vulnerability description is incomplete");
  ok(/AUKUS/.test(CN._note || "") && /International Trade Commission/.test(CN._note || ""), "the record does not say why AUKUS and ITC items are not carried");
  ok(/has not passed S\. 4784/.test(CN.status || "") && /November 10, 2026/.test(CN.status || ""), "the China status is missing");
  ok(!BANNED.test(JSON.stringify(CN)), "the China record carries banned wording");
  // H.R. 8800 still lands on strong_defense as its primary, so the China card sits on the bill's own key.
  const seed = JSON.parse(R("db/vr-issue-seed.json"));
  const m = (function find(o) { if (!o || typeof o !== "object") return null; if (o.number === "H.R. 8800" && Array.isArray(o.issues)) return o; for (const v of Object.values(o)) { const r = find(v); if (r) return r; } return null; })(seed);
  ok(m && m.issues.some((i) => i.issueKey === KCN && i.isPrimary === true), "H.R. 8800 is not mapped to strong_defense as its primary");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one sourced card per member, in its position on the key");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq((REC.members || []).map((m) => m.pid).sort().join(","), SET815.slice().sort().join(","), "the Section 815 record's members");
  eq((CN.members || []).map((m) => m.pid).sort().join(","), SETCN.slice().sort().join(","), "the China record's members");
  const core = stanceData(R("politician-stances-core.js")), ext = stanceData(R("politician-stances-ext.js"));
  const src = stanceData(R("politician-stances.js"));
  for (const pid of SET) {
    const m = memberRec(pid), [TOPIC, KEY] = NEW[pid], list = S[pid] || [], cards = cardsOf(win, pid, TOPIC);
    ok(!!win.CMP_DATA[pid], `${pid} is not on the roster`);
    eq(m.side, "support", `${pid}: the record's side`);
    ok(/^https:\/\//.test(m.source || ""), `${pid}: the record has no source`);
    const chunk = pid in core ? core : ext;
    eq(JSON.stringify(chunk[pid]), JSON.stringify(src[pid]), `${pid}: the chunk is not regenerated from politician-stances.js`);
    // No member holds the other pass's card.
    const otherTopic = TOPIC === T815 ? TCN : T815;
    eq(cardsOf(win, pid, otherTopic).length, 0, `${pid}: holds a card it has no statement for`);
    if (!eq(cards.length, 1, `${pid}: new cards`)) continue;
    const c = cards[0];
    eq(c.issueKey, KEY, `${pid}: the card's key`);
    eq(c.issueStance, m.side, `${pid}: the card's issueStance`);
    eq(c.pos, m.side, `${pid}: the card's pos`);
    eq(c.position, m.side, `${pid}: the card's locked-schema position`);
    eq(c.status, "active", `${pid}: the card's status`);
    const onKey = list.filter((x) => x.issueKey === KEY);
    if (TOPIC === T815) {
      eq(onKey[0], c, `${pid}: the Section 815 card is not first on ${KEY}`);
      ok(/Section 815/.test(c.text) && /S\. 4784/.test(c.text), `${pid}: the card does not name the section and bill`);
      ok(/buybacks?/.test(c.text) && /dividends/.test(c.text), `${pid}: the card does not say what the section limits`);
      ok(/no counterpart/.test(c.evidence) || /no separate vote on Section 815/.test(c.evidence) || /executive order/.test(c.evidence), `${pid}: the evidence gives no context`);
    } else {
      eq(onKey[0] && onKey[0].topic, R2R, `${pid}: the right-to-repair card is no longer first on ${KEY}`);
      eq(onKey[1], c, `${pid}: the optical-fiber card is not second on ${KEY}`);
      eq(list.indexOf(c), list.indexOf(onKey[0]) + 1, `${pid}: the optical-fiber card does not follow the right-to-repair card`);
      ok(/Section 1814/.test(c.text) && /Section 846/.test(c.text) && /optical fiber/.test(c.text), `${pid}: the card does not name both sections`);
      eq(m.provision, "optical_fiber_ban", `${pid}: the record's provision`);
    }
    ok(/FY2027 NDAA/.test(c.text), `${pid}: the card does not name the FY2027 NDAA`);
    ok(/"[^"]{12,}"/.test(c.text), `${pid}: the card has no direct quote`);
    ok(c.text.length <= 320, `${pid}: the card text is too long (${c.text.length})`);
    ok(c.source && /^https:\/\//.test(c.source.url || "") && c.source.label, `${pid}: the card has no source`);
    eq(c.source && c.source.url, m.source, `${pid}: the card's source is not the record's`);
    ok(Array.isArray(c.sources) && c.sources.length >= 2, `${pid}: sources[] lacks the statement and the vote`);
    for (const x of c.sources || []) {
      ok(/^https:\/\//.test(x.link || "") && x.type && x.label && x.excerpt && /^20\d\d-\d\d-\d\d$/.test(x.date || "") && x.weight === "strong",
        `${pid}: a source is not in the locked schema — ${JSON.stringify(x).slice(0, 160)}`);
    }
    eq(c.sources[0].link, c.source.url, `${pid}: the first source is not the statement`);
    ok(/^“[\s\S]{12,}”$/.test(c.sources[0].excerpt), `${pid}: the statement excerpt is not a quotation`);
    ok(!BANNED.test(`${c.topic} ${c.text} ${c.evidence} ${(c.sources || []).map((x) => x.excerpt).join(" ")}`), `${pid}: banned wording`);
    ok(!/Section 219|Israel|right to repair/i.test(`${c.text} ${c.evidence}`), `${pid}: the card leans on another provision`);
    const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
    eq(pm[KEY] && pm[KEY].stance, m.side, `${pid}: the stance map does not publish the stated side`);
    if (TOPIC === T815) eq(pm[KEY] && pm[KEY].text, c.text, `${pid}: the stance map does not read the Section 815 card`);
    else eq(pm[KEY] && pm[KEY].topic, R2R, `${pid}: the stance map no longer reads the right-to-repair card first`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the drawer's stated line and Evidence read the card");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const v of VOCABS) {
    const W = wins[v];
    for (const pid of SET) {
      const m = memberRec(pid), [TOPIC, KEY] = NEW[pid];
      const c = cardsOf(W, pid, TOPIC)[0];
      if (!ok(!!c, `${v} · ${pid}: no card`)) continue;
      const first = (W.ISSUE_STANCE_DATA[pid] || []).find((x) => x.issueKey === KEY);
      const h = W.PDXConsistency.gapViewHtml(pid, KEY) || "";
      const hd = text(header(h));
      ok(hd.includes(SAYS[m.side]), `${v} · ${pid}: the drawer header does not print "${SAYS[m.side]}" — ${hd.slice(0, 160)}`);
      ok(hd.includes(`Source: ${first.source.label}`), `${v} · ${pid}: the stated line does not cite the first card's source`);
      if (TOPIC === T815) eq(first, c, `${v} · ${pid}: the stated line does not read the Section 815 card`);
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
    const m = memberRec(pid), [TOPIC] = NEW[pid];
    const c = cardsOf(win, pid, TOPIC)[0];
    if (!c) continue;
    if (m.chamber === "senate") {
      eq(m.clotureVote, SENATE_195[pid], `${pid}: the cloture vote is not what the Senate shows`);
      const v = (c.sources || []).find((x) => x.link === SENATE_URL && x.type === "recorded vote");
      const word = m.clotureVote === "yea" ? "yes" : "no";
      ok(!!v && new RegExp(`^Voted ${word} on cloture on the motion to proceed to S\\. 4784`).test(v.excerpt) && /not a vote on Section 815 itself/.test(v.excerpt),
        `${pid}: the Senate cloture citation is missing, wrong or overclaims`);
      ok(new RegExp(`voted ${word} when cloture on taking up S\\. 4784 failed 50–46`).test(c.evidence), `${pid}: the evidence does not state the cloture vote`);
      ok(/No (floor )?vote has addressed (Section 815 itself|it)/.test(c.evidence), `${pid}: the evidence does not say no vote addressed the section`);
      ok(!(c.sources || []).some((x) => /clerk\.house\.gov/.test(x.link)), `${pid}: a senator carries a House roll call`);
    } else {
      const recs = (corpus.byMember.get(pid) || []).filter((r) => r.measureId === "H.R. 8800|119" && r.rollNumber === 278);
      eq(recs.length, 0, `${pid}: a Roll Call 278 cell appeared without being declared`);
      eq(m.voteAttributed, false, `${pid}: an unattributed vote is not marked so`);
      eq(m.vote, CLERK_278[pid], `${pid}: the record's Roll Call 278 vote is not what the Clerk shows`);
      const v = (c.sources || []).find((x) => x.link === CLERK_URL && x.type === "recorded vote");
      ok(!!v && /^Voted yes on passage of H\.R\. 8800/.test(v.excerpt) && /Section 1814/.test(v.excerpt), `${pid}: the House Clerk citation is missing`);
      ok(/voted yes on final passage of H\.R\. 8800/.test(c.evidence) && /No separate vote/.test(c.evidence), `${pid}: the evidence does not state the vote`);
      ok(!(c.sources || []).some((x) => /senate\.gov\/legislative/.test(x.link)), `${pid}: a House member carries a Senate roll`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a reader against the stated side gets a conflicts line");
// ═════════════════════════════════════════════════════════════════════════════
{
  let hits = 0;
  for (const pid of SET) {
    const m = memberRec(pid), [, KEY] = NEW[pid];
    const rel = (MAP[KEY] || []).filter((k) => (MAP[k] || []).includes(KEY));
    ok(rel.length > 0, `${KEY}: no two-way related pair`);
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
section("7 · nothing else moved; declared; one shell version; no migration");
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
    for (const pid of SET) {
      ok(pid in before, `${pid} had no stance entries at the base`);
      if (later.has(pid)) continue;
      const [TOPIC] = NEW[pid];
      const kept = (after[pid] || []).filter((c) => c.topic !== TOPIC);
      eq(JSON.stringify(kept), JSON.stringify(before[pid]), `${pid}: another card changed`);
      eq((before[pid] || []).filter((c) => c.topic === TOPIC).length, 0, `${pid}: the new card existed at the base`);
    }
    const others = Object.keys(before).filter((pid) => !SET.includes(pid) && !later.has(pid));
    ok(others.every((pid) => JSON.stringify(before[pid]) === JSON.stringify(after[pid])), "another person's stance entries changed");
    eq(Object.keys(after).filter((pid) => !later.has(pid) && !(pid in before)).join(","), "", "a person was added");
    // Section 219 and right-to-repair cards are untouched.
    for (const T of [S219, R2R]) {
      const pick = (o) => JSON.stringify(Object.keys(o).sort().map((p) => [p, (o[p] || []).filter((c) => c.topic === T)]).filter((x) => x[1].length));
      eq(pick(after), pick(before), `a "${T}" card changed`);
    }
    for (const f of ["related-issues.js", "consistency.js", "issue-map.js", "alignment-tool.js", "stance-helpers.js", "cmp-data.js",
      "cmp-data-detail.js", "db/issue-keys.json", "db/issue-core-categories.json", "db/vr-issue-seed.json", "db/bill-docs.json",
      "db/section-219-ndaa-stated-2026-11.json", "db/ndaa-fy27-right-to-repair-stated-2026-11.json",
      "issue-scope.js", "stance-sides.js", "my-stances.js", "voting-record.js",
      "person.html", "index.html", "issue.html", "ballot.html", "netlify.toml", "_redirects"]) {
      const b = BASE(f);
      let now = null; try { now = R(f); } catch { /* absent */ }
      // index.html: the generated record strip follows stance coverage
      // (scripts/gen-hero-showcase.mjs); everything else stays byte-pinned.
      if (f === "index.html") { eq(withoutHeroCrawl(now), withoutHeroCrawl(b), `${f} changed outside the generated record strip`); continue; }
      // cmp-data.js: a later declared roster admission (the seventh newly elected
      // wave's block, v103-chrome-seams.mjs) is that pass's product.
      if (f === "cmp-data.js") { eq(carveDeclaredAdmissions(now), carveDeclaredAdmissions(b), `${f} changed outside a declared admission`); continue; }
      eq(now, b, `${f} changed`);
    }
    {
      // sitemap.xml advertises the person pages that clear the publication
      // floor. A declared stance pass can lift one of its own members over it;
      // that page's line is the only thing allowed to move.
      const allowed = new Set([...new Set([...SET, ...later])].map((p) => `  <url><loc>https://politidex.fyi/p/${p}</loc></url>`));
      const strip = (x) => String(x || "").split("\n").filter((l) => !allowed.has(l)).join("\n");
      const smNow = R("sitemap.xml"), smBase = BASE("sitemap.xml");
      eq(strip(smNow).replace(/\(\d+ urls\)/g, ""), strip(smBase).replace(/\(\d+ urls\)/g, ""), "sitemap.xml changed beyond a declared pass's person pages");
      // Harrigan's second sourced card lifts his person page over the floor.
      const hl = "  <url><loc>https://politidex.fyi/p/pat_harrigan</loc></url>";
      ok(smNow.split("\n").includes(hl) && !smBase.split("\n").includes(hl), "the sitemap does not newly advertise /p/pat_harrigan");
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
  }
  // Warren, Hawley, Lee and Rick Scott are in the precached core chunk, so the
  // shell moves one version; the precache list and worker code are unchanged.
  const sw = R("sw.js");
  const pre = (src) => (String(src).match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
  ok(pre(sw).includes("politician-stances-core.js"), "the core chunk is not precached");
  ok(!pre(sw).includes("politician-stances-ext.js"), "the ext chunk is precached");
  const core = stanceData(R("politician-stances-core.js"));
  ok(SET815.filter((p) => p !== "reed").every((p) => p in core), "a Section 815 senator is not in the precached core chunk");
  ok(/v550 - FY2027 NDAA SECTION 815 AND CHINA TECHNOLOGY[\s\S]*?MIGRATION COST: none\./.test(sw), "the v550 note is missing or does not say no migration");
  const ver = (src) => Number((/^const CACHE_VERSION = 'v(\d+)';$/m.exec(String(src)) || [])[1]);
  const baseSw = BASE("sw.js");
  if (baseSw != null) {
    eq(ver(baseSw), 549, "fixture: the base shell is v549");
    ok(later.size ? ver(sw) >= 550 : ver(sw) === 550, `the shell is not at v550 (got v${ver(sw)})`);
    eq(pre(sw).join(","), pre(baseSw).join(","), "the precache list changed");
    eq(swCodeOnly(sw), swCodeOnly(baseSw), "worker code changed");
  }
}

if (failures.length) {
  console.error(`\n✗ ndaa fy27 sec 815 / china tech: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ ndaa fy27 sec 815 / china tech: all ${passed} assertions passed`);
