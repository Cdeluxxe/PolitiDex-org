#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ndaa-fy27-right-to-repair.mjs — FY2027 NDAA military right to repair
// ─────────────────────────────────────────────────────────────────────────────
// Section 861 of H.R. 8800 ("Reform of technical data and software rights to
// support competition, sustainment, and readiness") and its Senate counterpart,
// Section 804 of S. 4784 ("Modifications to technical data rights"), are filed
// on the existing issue key strong_defense (🦅 Peace Through Strength), where
// H.R. 8800's House vote already lands as its primary issue.
// db/ndaa-fy27-right-to-repair-stated-2026-11.json records the provision, its
// House and Senate status and the members with a sourced statement on it;
// politician-stances.js (regenerated into both chunks) files one card each.
//
// WHAT THIS SUITE PROVES:
//   1. THE KEY: strong_defense exists in both ISSUE_MAP copies, the stored key
//      list and the related-issues map, and no issue key was added.
//   2. THE DESCRIPTION: the record quotes the engrossed House text's
//      default-rights clause and names the reported Senate section,
//      the House passage (216-212, Roll Call 278) agrees with the bill's own
//      stored history, H.R. 8800 is mapped to strong_defense as its primary,
//      and the Senate status (failed 50-46 cloture, no vote on Sec. 804) holds.
//   3. THE CARDS: every member in the record holds exactly one right-to-repair
//      card, on strong_defense, first among their strong_defense cards, with
//      a direct quote, an https source and sources[] in the locked schema; the
//      stance map publishes it; no banned wording.
//   4. THE DRAWER'S STATED LINE: the Peace Through Strength drawer prints
//      "Stated: Supports" for each member, cites the card's source, and lists
//      the card's links under Evidence.
//   5. THE VOTES: no member's Roll Call 278 cell is invented — the two House
//      members are unattributed in the stored record, so each card cites the
//      House Clerk with the vote the Clerk shows; senators cite the Senate
//      cloture roll and say it is not a vote on the section.
//   6. WHERE THIS CONFLICTS: on a related issue's drawer, a reader against
//      the member's stated side gets a conflicts line naming Peace Through
//      Strength; an agreeing reader gets none.
//   7. NOTHING ELSE MOVED: every other card and person, the Section 219
//      cards, the issue keys, the related-issues map, the drawer code, the
//      roster, routes and documents are byte-identical to the base; the pass
//      is declared; the shell moves one version for the precached core chunk
//      with its precache list unchanged; no migration.
//
//   node scripts/test-ndaa-fy27-right-to-repair.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { DECLARED_STANCE_PASSES, swCodeOnly, withoutHeroCrawl, carveDeclaredAdmissions, withoutDeclaredRelatedIssues } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "4ecd834";
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

const PASS = "ndaa_fy27_right_to_repair_stated_nov2026";
const KEY = "strong_defense";
const TOPIC = "Military Right to Repair · FY2027 NDAA";
const REC = JSON.parse(R("db/ndaa-fy27-right-to-repair-stated-2026-11.json"));
const SET = ["maggie_goodlander", "pat_harrigan", "warren", "sheehy"];
const NEW_LISTS = ["maggie_goodlander", "pat_harrigan"];
// What the House Clerk (Roll Call 278) and the Senate (Vote 195) show.
const CLERK_278 = { maggie_goodlander: "nay", pat_harrigan: "yea" };
const SENATE_195 = { warren: "nay", sheehy: "yea" };
const CLERK_URL = "https://clerk.house.gov/Votes/2026278";
const SENATE_URL = "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1192/vote_119_2_00195.htm";
const S219 = "Section 219 · U.S.–Israel Defense Tech";

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
const BANNED = /\bequity\b|utah[- ]first|party[- ]line|along party lines/i;

const VOCABS = ["alignment-tool.js", "issue-map.js"];
const wins = Object.fromEntries(VOCABS.map((v) => [v, boot(v)]));
for (const v of VOCABS) if (wins[v].__err) failures.push(`boot (${v}): ${wins[v].__err}`);
const win = wins["alignment-tool.js"];
const RI = win.PDXRelatedIssues, CS = win.PDXConsistency, MAP = RI && RI.MAP;
const S = win.ISSUE_STANCE_DATA;
const lbl = (k) => String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();
const r2r = (pid) => (S[pid] || []).filter((c) => c && c.topic === TOPIC);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the issue key exists, and no key was added");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(REC.issueKey, KEY, "the record names another key");
  for (const v of VOCABS) {
    const M = wins[v].ISSUE_MAP || {};
    ok(!!M[KEY], `${v}: ISSUE_MAP has no ${KEY}`);
    ok(/Peace Through Strength/.test(String(M[KEY] && M[KEY].label)), `${v}: ${KEY} is not the Peace Through Strength key`);
  }
  eq(JSON.stringify(wins["alignment-tool.js"].ISSUE_MAP[KEY]), JSON.stringify(wins["issue-map.js"].ISSUE_MAP[KEY]), "the two ISSUE_MAP copies disagree on the key");
  ok(R("db/issue-keys.json").includes(`"${KEY}"`), "db/issue-keys.json does not list the key");
  ok(Array.isArray(MAP && MAP[KEY]) && MAP[KEY].length > 0, "the related-issues map has no pairs for the key");
  for (const v of VOCABS) {
    const b = BASE(v);
    if (b == null) continue;
    const keysOf = (src) => { const w = makeSandbox(); const c = vm.createContext(w); try { vm.runInContext(src, c); } catch { /* partial */ } return Object.keys(w.ISSUE_MAP || {}).sort().join(","); };
    eq(keysOf(R(v)), keysOf(b), `${v}: the issue-key set changed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the description matches the House and Senate bills");
// ═════════════════════════════════════════════════════════════════════════════
{
  const P = REC.provision || {}, T = P.text || {};
  eq(P.bill, "H.R. 8800", "provision bill");
  eq(P.congress, 119, "provision congress");
  eq(P.title, "National Defense Authorization Act for Fiscal Year 2027", "bill title");
  eq(P.section, "Sec. 861", "House section");
  eq(P.heading, "Reform of technical data and software rights to support competition, sustainment, and readiness", "House section heading");
  ok(/^https:\/\/www\.govinfo\.gov\/.*BILLS-119hr8800eh/.test(T.url || ""), "the House text source is not the engrossed bill on GovInfo");
  ok(/shall be provided with government purpose rights unless the contractor establishes, through clear and convincing evidence, entitlement to more restrictive rights$/.test(T.defaultRights || ""),
    "the default-rights clause is not quoted");
  ok(/^any technical data, computer software, or computer software documentation delivered under a contract/.test(T.defaultRights || ""), "the default-rights clause does not open on its deliverables");
  ok(/3776/.test(T.newSection || ""), "the new 10 U.S.C. 3776 is not named");
  ok(/wartime or contingency operations/.test(T.wartimeRepair || "") && /3771\(b\)/.test(T.wartimeRepair || ""), "the wartime-repair release is not described");
  ok(/excess payments/.test(T.clawbackReport || "") && /180 days/.test(T.clawbackReport || ""), "the House clawback is not described as a report");
  ok(/after enactment/.test(T.applicability || ""), "applicability to future awards is missing");
  ok((P.related || []).some((x) => x.section === "Sec. 862" && /ombudsman/i.test(x.heading)), "the mediation alternative (Sec. 862) is not recorded");
  ok(/Goodlander/.test(P.origin || "") && /Harrigan/.test(P.origin || "") && /voice vote/.test(P.origin || "") && /Warrior Right to Repair Act/.test(P.origin || ""), "the origin is incomplete");
  // House action agrees with the bill's stored history and issue mapping.
  const H = REC.house || {};
  ok(/voice vote/.test(H.committee || "") && /June 4, 2026/.test(H.committee || ""), "the committee adoption is not recorded");
  ok(/no separate vote/.test(H.floor || ""), "the record does not say the House cast no separate vote on the section");
  eq(H.passage && H.passage.result, "Passed 216-212", "House passage tally");
  eq(H.passage && H.passage.roll, 278, "House passage roll");
  eq(H.passage && H.passage.date, "2026-07-22", "House passage date");
  eq(H.passage && H.passage.url, CLERK_URL, "House Clerk link");
  const docs = JSON.parse(R("db/bill-docs.json")).docs || {};
  const doc = docs["119|H.R. 8800"] || {};
  ok((doc.h || []).some((x) => /216 - 212 \(Roll no\. 278\)/.test(x.x || "") && x.d === "2026-07-22"), "the bill's stored history does not show 216-212, Roll 278 on July 22");
  const seed = JSON.parse(R("db/vr-issue-seed.json"));
  const all = JSON.stringify(seed);
  ok(all.includes('"number":"H.R. 8800"'), "H.R. 8800 is not in the issue seed");
  const m = (function find(o) { if (!o || typeof o !== "object") return null; if (o.number === "H.R. 8800" && Array.isArray(o.issues)) return o; for (const v of Object.values(o)) { const r = find(v); if (r) return r; } return null; })(seed);
  ok(m && m.issues.some((i) => i.issueKey === KEY && i.isPrimary === true && i.supportMeaning === "yea_supports"), "H.R. 8800 is not mapped to strong_defense as its primary");
  // The Senate.
  const Sn = REC.senate || {};
  eq(Sn.bill, "S. 4784", "Senate bill");
  eq(Sn.section, "Sec. 804", "Senate section");
  eq(Sn.heading, "Modifications to technical data rights", "Senate section heading");
  ok(/BILLS-119s4784rs/.test(Sn.text && Sn.text.url || ""), "the Senate text source is not the reported bill");
  ok(/27-0/.test(Sn.committeeVote || ""), "the committee 27-0 vote is missing");
  ok(/noncommercial/.test(Sn.differences || "") && /clawback/.test(Sn.differences || ""), "the House-Senate differences are missing");
  eq(Sn.cloture && Sn.cloture.result, "Cloture on the motion to proceed rejected, 50-46", "Senate cloture result");
  eq(Sn.cloture && Sn.cloture.roll, 195, "Senate cloture roll");
  eq(Sn.cloture && Sn.cloture.url, SENATE_URL, "Senate cloture source");
  ok(/has not passed S\. 4784/.test(Sn.status || "") && /no recorded Senate vote addresses Section 804/.test(Sn.status || ""), "the Senate status is missing");
  ok(!BANNED.test(JSON.stringify(REC)), "the record carries banned wording");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one sourced right-to-repair card per member, first on the key");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq((REC.members || []).map((m) => m.pid).sort().join(","), SET.slice().sort().join(","), "the record's members are not the set");
  const core = stanceData(R("politician-stances-core.js")), ext = stanceData(R("politician-stances-ext.js"));
  const src = stanceData(R("politician-stances.js"));
  for (const m of REC.members || []) {
    const pid = m.pid, list = S[pid] || [], cards = r2r(pid);
    ok(!!win.CMP_DATA[pid], `${pid} is not on the roster`);
    eq(m.side, "support", `${pid}: the record's side`);
    ok(/^https:\/\//.test(m.source || ""), `${pid}: the record has no source`);
    const chunk = pid in core ? core : ext;
    eq(JSON.stringify(chunk[pid]), JSON.stringify(src[pid]), `${pid}: the chunk is not regenerated from politician-stances.js`);
    if (!eq(cards.length, 1, `${pid}: right-to-repair cards`)) continue;
    const c = cards[0];
    eq(c.issueKey, KEY, `${pid}: the card's key`);
    eq(c.issueStance, m.side, `${pid}: the card's issueStance`);
    eq(c.pos, m.side, `${pid}: the card's pos`);
    eq(c.position, m.side, `${pid}: the card's locked-schema position`);
    eq(c.status, "active", `${pid}: the card's status`);
    eq(list.find((x) => x.issueKey === KEY), c, `${pid}: the card is not first on ${KEY}`);
    ok(m.chamber === "house" ? /Section 861/.test(c.text) : /Section 804/.test(c.text) && /Section 861/.test(c.text), `${pid}: the card does not name the section`);
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
    ok(!BANNED.test(`${c.topic} ${c.text} ${c.evidence} ${(c.sources || []).map((x) => x.excerpt).join(" ")}`), `${pid}: banned wording`);
    ok(!/Section 219|Israel/.test(`${c.text} ${c.evidence}`), `${pid}: the card leans on Section 219`);
    const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
    eq(pm[KEY] && pm[KEY].stance, m.side, `${pid}: the stance map does not publish the stated side`);
    eq(pm[KEY] && pm[KEY].text, c.text, `${pid}: the stance map does not read the right-to-repair card`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the drawer's stated line and Evidence read the card");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const v of VOCABS) {
    const W = wins[v];
    for (const m of REC.members || []) {
      const c = (W.ISSUE_STANCE_DATA[m.pid] || []).find((x) => x.topic === TOPIC);
      if (!ok(!!c, `${v} · ${m.pid}: no card`)) continue;
      const h = W.PDXConsistency.gapViewHtml(m.pid, KEY) || "";
      const hd = text(header(h));
      ok(hd.includes(SAYS[m.side]), `${v} · ${m.pid}: the drawer header does not print "${SAYS[m.side]}" — ${hd.slice(0, 160)}`);
      ok(hd.includes(`Source: ${c.source.label}`), `${v} · ${m.pid}: the stated line does not cite the card's source`);
      ok(h.includes(`data-pdx-stance="${KEY}"`) && h.includes(`data-pdx-stance-side="${m.side}"`), `${v} · ${m.pid}: the stance marks are missing`);
      const ev = evidence(h);
      for (const x of c.sources) ok(ev.includes(`href="${x.link}"`), `${v} · ${m.pid}: Evidence does not link ${x.link}`);
      ok(text(ev).includes(text(c.sources[0].excerpt)), `${v} · ${m.pid}: Evidence does not print the statement's excerpt`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the votes: cited, never invented");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const m of REC.members || []) {
    const c = r2r(m.pid)[0];
    if (!c) continue;
    const recs = (corpus.byMember.get(m.pid) || []).filter((r) => r.measureId === "H.R. 8800|119" && r.rollNumber === 278);
    eq(recs.length, 0, `${m.pid}: a Roll Call 278 cell appeared without being declared`);
    if (m.chamber === "house") {
      eq(m.voteAttributed, false, `${m.pid}: an unattributed vote is not marked so`);
      eq(m.vote, CLERK_278[m.pid], `${m.pid}: the record's Roll Call 278 vote is not what the Clerk shows`);
      const v = (c.sources || []).find((x) => x.link === CLERK_URL && x.type === "recorded vote");
      ok(!!v, `${m.pid}: the House Clerk citation is missing`);
      const word = m.vote === "yea" ? "yes" : "no";
      ok(v && new RegExp(`^Voted ${word} on passage of H\\.R\\. 8800`).test(v.excerpt), `${m.pid}: the Clerk citation does not state the vote`);
      ok(new RegExp(`voted ${word} on final passage of H\\.R\\. 8800`).test(c.evidence), `${m.pid}: the evidence does not state the vote`);
      ok(!(c.sources || []).some((x) => /senate\.gov\/legislative/.test(x.link)), `${m.pid}: a House member carries a Senate roll`);
    } else {
      eq(m.vote, null, `${m.pid}: a senator is recorded with a vote on the section`);
      eq(m.clotureVote, SENATE_195[m.pid], `${m.pid}: the cloture vote is not what the Senate shows`);
      const v = (c.sources || []).find((x) => x.link === SENATE_URL && x.type === "recorded vote");
      ok(!!v && /not a vote on Section 804 itself/.test(v.excerpt), `${m.pid}: the Senate cloture citation is missing or overclaims`);
      ok(/no vote on Section 804 itself/.test(c.evidence), `${m.pid}: the evidence does not say there was no vote on the section`);
      ok(!(c.sources || []).some((x) => /clerk\.house\.gov/.test(x.link)), `${m.pid}: a senator carries a House roll call`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a reader against the stated side gets a conflicts line");
// ═════════════════════════════════════════════════════════════════════════════
{
  let hits = 0;
  for (const m of REC.members || []) {
    const pid = m.pid;
    const rel = (MAP[KEY] || []).filter((k) => (MAP[k] || []).includes(KEY));
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
      // An agreeing reader gets no conflict from the stated side. A member whose
      // stored voting record on the key runs the other way (Warren) still gets
      // the existing record-based line; that is the record, not this card.
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
    for (const pid of NEW_LISTS) ok(!(pid in before), `${pid} already had stance entries at the base`);
    for (const pid of SET.filter((p) => !NEW_LISTS.includes(p))) {
      ok(pid in before, `${pid} had no stance entries at the base`);
      if (later.has(pid)) continue;
      const kept = (after[pid] || []).filter((c) => c.topic !== TOPIC);
      eq(JSON.stringify(kept), JSON.stringify(before[pid]), `${pid}: another card changed`);
      eq((before[pid] || []).filter((c) => c.topic === TOPIC).length, 0, `${pid}: a right-to-repair card existed at the base`);
    }
    const others = Object.keys(before).filter((pid) => !SET.includes(pid) && !later.has(pid));
    ok(others.every((pid) => JSON.stringify(before[pid]) === JSON.stringify(after[pid])), "another person's stance entries changed");
    // A person this pass added whom a LATER declared pass also touched is
    // filtered on both sides; that pass's own suite pins its cards.
    eq(Object.keys(after).filter((pid) => !later.has(pid) && !(pid in before)).sort().join(","), NEW_LISTS.filter((p) => !later.has(p)).sort().join(","), "a person other than the set was added");
    // Section 219 cards are untouched.
    const s219 = (o) => JSON.stringify(Object.keys(o).sort().map((p) => [p, (o[p] || []).filter((c) => c.topic === S219)]).filter((x) => x[1].length));
    eq(s219(after), s219(before), "a Section 219 card changed");
    for (const f of ["related-issues.js", "consistency.js", "issue-map.js", "alignment-tool.js", "stance-helpers.js", "cmp-data.js",
      "cmp-data-detail.js", "db/issue-keys.json", "db/issue-core-categories.json", "db/vr-issue-seed.json", "db/bill-docs.json",
      "db/section-219-ndaa-stated-2026-11.json", "issue-scope.js", "stance-sides.js", "my-stances.js", "voting-record.js",
      "person.html", "index.html", "issue.html", "ballot.html", "netlify.toml", "_redirects"]) {
      const b = BASE(f);
      let now = null; try { now = R(f); } catch { /* absent */ }
      // index.html: the generated record strip follows stance coverage
      // (scripts/gen-hero-showcase.mjs); everything else stays byte-pinned.
      if (f === "index.html") { eq(withoutHeroCrawl(now), withoutHeroCrawl(b), `${f} changed outside the generated record strip`); continue; }
      // cmp-data.js: a later declared roster admission (the seventh newly elected
      // wave's block, v103-chrome-seams.mjs) is that pass's product.
      if (f === "cmp-data.js") { eq(carveDeclaredAdmissions(now), carveDeclaredAdmissions(b), `${f} changed outside a declared admission`); continue; }
      // related-issues.js: the Trump–Massie pass's declared edits (v103-chrome-seams.mjs) are that pass's product.
      if (f === "related-issues.js") { eq(withoutDeclaredRelatedIssues(now), b, `${f} changed`); continue; }
      eq(now, b, `${f} changed`);
    }
    {
      // sitemap.xml advertises the person pages that clear the publication
      // floor. A declared stance pass can lift one of its own members over it;
      // that page's line is the only thing allowed to move.
      const allowed = new Set([...later].map((p) => `  <url><loc>https://politidex.fyi/p/${p}</loc></url>`));
      const strip = (x) => String(x || "").split("\n").filter((l) => !allowed.has(l)).join("\n");
      const smNow = R("sitemap.xml"), smBase = BASE("sitemap.xml");
      eq(strip(smNow).replace(/\(\d+ urls\)/g, ""), strip(smBase).replace(/\(\d+ urls\)/g, ""), "sitemap.xml changed beyond a declared pass's person pages");
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
    for (const f of migs) ok(BASE(`netlify/database/migrations/${f}`) != null || f === "20261205000000_seed_exec_actions_wave14.sql" /* the later Trump–Massie pass, gated by test-exec-seed.mjs */, `${f}: a migration this pass added`);
  }
  // Warren's card is in the precached core chunk, so the shell moves one version;
  // the precache list and every line of worker code are unchanged.
  const sw = R("sw.js");
  const pre = (src) => (String(src).match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
  ok(pre(sw).includes("politician-stances-core.js"), "the core chunk is not precached");
  ok(!pre(sw).includes("politician-stances-ext.js"), "the ext chunk is precached");
  const core = stanceData(R("politician-stances-core.js"));
  ok("warren" in core, "Warren is not in the precached core chunk");
  ok(/v549 - FY2027 NDAA MILITARY RIGHT TO REPAIR[\s\S]*?MIGRATION COST: none\./.test(sw), "the v549 note is missing or does not say no migration");
  const ver = (src) => Number((/^const CACHE_VERSION = 'v(\d+)';$/m.exec(String(src)) || [])[1]);
  const baseSw = BASE("sw.js");
  if (baseSw != null) {
    eq(ver(baseSw), 548, "fixture: the base shell is v548");
    ok(later.size ? ver(sw) >= 549 : ver(sw) === 549, `the shell is not at v549 (got v${ver(sw)})`);
    eq(pre(sw).join(","), pre(baseSw).join(","), "the precache list changed");
    eq(swCodeOnly(sw), swCodeOnly(baseSw), "worker code changed");
  }
}

if (failures.length) {
  console.error(`\n✗ ndaa fy27 right to repair: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ ndaa fy27 right to repair: all ${passed} assertions passed`);
