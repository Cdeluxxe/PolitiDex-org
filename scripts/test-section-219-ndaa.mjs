#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-section-219-ndaa.mjs — Section 219 of the FY2027 NDAA, stated and voted
// ─────────────────────────────────────────────────────────────────────────────
// Section 219 of H.R. 8800 (formerly Section 224), the United States-Israel
// Defense Technology Cooperation Initiative, is filed on the existing issue key
// israel_support (🇮🇱 Support for Israel). db/section-219-ndaa-stated-2026-11.json
// records the provision, its House and Senate status and the members with a
// sourced statement on it; politician-stances.js (regenerated into both chunks)
// files one card per member.
//
// WHAT THIS SUITE PROVES:
//   1. THE KEY: israel_support exists in both ISSUE_MAP copies, the stored key
//      list and the related-issues map, and no issue key was added.
//   2. THE DESCRIPTION: the record quotes the engrossed text (executive agent,
//      ten domains, formerly 224), the House passage (216-212, Roll Call 278)
//      agrees with the bill's own history, the Senate twin is Section 1217 of
//      S. 4784 with its failed 50-46 cloture vote, and the bill's existing
//      israel_support effect line names the initiative.
//   3. THE CARDS: every member in the record holds exactly one Section 219
//      card, on israel_support, first among their israel_support cards, with
//      a quoted statement, an https source and sources[] in the locked schema;
//      the stance map publishes it; no banned wording.
//   4. THE DRAWER'S STATED LINE: the Support for Israel drawer prints
//      "Stated: Supports|Opposes" for each member, cites the card's source, and
//      lists the card's links under Evidence.
//   5. THE VOTING RECORD: every attributed House member's Roll Call 278 cell is
//      on file, mapped to israel_support, matches the record's yea/nay, and the
//      drawer's formal record lists H.R. 8800.
//   6. WHERE THIS CONFLICTS: on a related issue's drawer, a reader who stands
//      against the member's Section 219 side gets a conflicts line naming
//      Support for Israel, the member's stated side and the reader's; an
//      agreeing reader gets none.
//   7. NOTHING ELSE MOVED: every other person's stance entries, every other
//      card of the nine, the issue keys, the related-issues map, the drawer
//      code, the roster, routes and documents are byte-identical to the base;
//      the pass is declared; the shell moves one version for the precached
//      core chunk, with its precache list unchanged; no migration.
//
//   node scripts/test-section-219-ndaa.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { DECLARED_STANCE_PASSES, swCodeOnly, withoutHeroCrawl } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "06f5dcf";
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

const KEY = "israel_support";
const TOPIC = "Section 219 · U.S.–Israel Defense Tech";
const REC = JSON.parse(R("db/section-219-ndaa-stated-2026-11.json"));
// The defined set: at least these members carry a Section 219 card.
const SET = ["massie", "khanna", "aoc", "sanders", "don_davis", "gillibrand", "ted_budd", "ronny_jackson", "marlin_stutzman"];
const OPPOSE = ["massie", "khanna", "aoc", "sanders"];
// House members whose Roll Call 278 cell is attributed in the voting record.
const ATTRIBUTED = ["massie", "khanna", "aoc", "don_davis"];
// Members with no stance list before this pass.
const NEW_LISTS = ["ronny_jackson", "marlin_stutzman"];

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
const SAYS = { support: "Stated: Supports", oppose: "Stated: Opposes" }; // the drawer header chip (v542)
const OTHER = { support: "oppose", oppose: "support" };
const BANNED = /\bequity\b|utah[- ]first|party[- ]line|along party lines|pro-israel lobby/i;

const VOCABS = ["alignment-tool.js", "issue-map.js"];
const wins = Object.fromEntries(VOCABS.map((v) => [v, boot(v)]));
for (const v of VOCABS) if (wins[v].__err) failures.push(`boot (${v}): ${wins[v].__err}`);
const win = wins["alignment-tool.js"];
const RI = win.PDXRelatedIssues, CS = win.PDXConsistency, MAP = RI && RI.MAP;
const S = win.ISSUE_STANCE_DATA;
const lbl = (k) => String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();
const s219 = (pid) => (S[pid] || []).filter((c) => c && c.topic === TOPIC);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the issue key exists, and no key was added");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(REC.issueKey, KEY, "the record names another key");
  for (const v of VOCABS) {
    const M = wins[v].ISSUE_MAP || {};
    ok(!!M[KEY], `${v}: ISSUE_MAP has no ${KEY}`);
    ok(/Israel/.test(String(M[KEY] && M[KEY].label)), `${v}: ${KEY} is not the Support for Israel key`);
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
section("2 · the Section 219 description matches the bill");
// ═════════════════════════════════════════════════════════════════════════════
{
  const P = REC.provision || {};
  eq(P.bill, "H.R. 8800", "provision bill");
  eq(P.congress, 119, "provision congress");
  eq(P.section, "Sec. 219", "provision section");
  eq(P.formerly, "Sec. 224", "former number");
  eq(P.heading, "United States-Israel Defense Technology Cooperation Initiative", "section heading");
  ok(/^https:\/\/www\.govinfo\.gov\/.*BILLS-119hr8800eh/.test(P.text && P.text.url || ""), "the text source is not the engrossed bill on GovInfo");
  const est = String(P.text && P.text.establishment || "");
  ok(/^The Secretary of Defense shall designate an executive agent/.test(est), "the establishment clause does not open on the executive agent");
  ok(/synchronizing cooperative efforts between the United States and Israel/.test(est), "the establishment clause lost 'synchronizing cooperative efforts'");
  ok(/expand and accelerate bilateral defense technology research, development, testing, evaluation, and industrial cooperation/.test(est), "the establishment clause lost its RDT&E and industrial scope");
  const D = (P.text && P.text.domains) || [];
  eq(D.length, 10, "the section names ten domains");
  for (const re of [/^Counter-Unmanned Systems/, /Missile and air defense/, /Artificial intelligence, quantum/, /Biotechnology/, /co-production/, /Anti-tunneling/])
    ok(D.some((d) => re.test(d)), `a domain is missing: ${re}`);
  ok(/FUTURES Act/.test(P.origin || "") && /H\.R\. 7540/.test(P.origin || "") && /S\. 3855/.test(P.origin || ""), "the origin does not name the FUTURES Act bills");
  // House action agrees with the bill's own stored history.
  const H = REC.house || {};
  ok(/not made in order/.test(H.strikeAmendment || "") && /Massie-Khanna/.test(H.strikeAmendment || ""), "the record does not say the Massie-Khanna strike got no floor vote");
  eq(H.passage && H.passage.result, "Passed 216-212", "House passage tally");
  eq(H.passage && H.passage.roll, 278, "House passage roll");
  eq(H.passage && H.passage.date, "2026-07-22", "House passage date");
  const docs = JSON.parse(R("db/bill-docs.json")).docs || {};
  const doc = docs["119|H.R. 8800"] || {};
  ok((doc.h || []).some((x) => /216 - 212 \(Roll no\. 278\)/.test(x.x || "") && x.d === "2026-07-22"), "the bill's stored history does not show 216-212, Roll 278 on July 22");
  ok((doc.m || []).some((m) => m.k === KEY && /defense technology initiative/.test(m.l || "")), "the bill's israel_support line does not name the initiative");
  ok(/'H\.R\. 8800\|119\|israel_support': \{\s*did: '[^']*U\.S\.–Israel defense technology initiative/.test(R("consistency.js")), "the H.R. 8800 israel_support effect line does not name the initiative");
  const Sn = REC.senate || {};
  eq(Sn.bill, "S. 4784", "Senate bill");
  eq(Sn.section, "Sec. 1217", "Senate section");
  eq(Sn.cloture && Sn.cloture.result, "Cloture on the motion to proceed rejected, 50-46", "Senate cloture result");
  eq(Sn.cloture && Sn.cloture.roll, 195, "Senate cloture roll");
  ok(/senate\.gov\/legislative\/LIS\/roll_call_votes\/vote1192\/vote_119_2_00195/.test(Sn.cloture && Sn.cloture.url || ""), "Senate cloture source");
  ok(/has not passed S\. 4784/.test(Sn.status || ""), "the Senate status is missing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one sourced Section 219 card per member, first on the key");
// ═════════════════════════════════════════════════════════════════════════════
{
  const recPids = (REC.members || []).map((m) => m.pid);
  for (const pid of SET) ok(recPids.includes(pid), `${pid} is not in the record`);
  ok(recPids.length >= SET.length, "the defined set shrank");
  const core = stanceData(R("politician-stances-core.js")), ext = stanceData(R("politician-stances-ext.js"));
  const src = stanceData(R("politician-stances.js"));
  for (const m of REC.members || []) {
    const pid = m.pid, list = S[pid] || [], cards = s219(pid);
    ok(!!win.CMP_DATA[pid], `${pid} is not on the roster`);
    ok(m.side === "support" || m.side === "oppose", `${pid}: side is not support/oppose`);
    eq(m.side, OPPOSE.includes(pid) ? "oppose" : "support", `${pid}: the record's side`);
    ok(/^https:\/\//.test(m.source || ""), `${pid}: the record has no source`);
    const chunk = pid in core ? core : ext;
    eq(JSON.stringify(chunk[pid]), JSON.stringify(src[pid]), `${pid}: the chunk is not regenerated from politician-stances.js`);
    if (!eq(cards.length, 1, `${pid}: Section 219 cards`)) continue;
    const c = cards[0];
    eq(c.issueKey, KEY, `${pid}: the card's key`);
    eq(c.issueStance, m.side, `${pid}: the card's issueStance`);
    eq(c.pos, m.side, `${pid}: the card's pos`);
    eq(c.position, m.side, `${pid}: the card's locked-schema position`);
    eq(c.status, "active", `${pid}: the card's status`);
    eq(list.find((x) => x.issueKey === KEY), c, `${pid}: the Section 219 card is not first on ${KEY}`);
    ok(/Section 219/.test(c.text), `${pid}: the card does not name Section 219`);
    ok(/FY2027 NDAA/.test(c.text), `${pid}: the card does not name the FY2027 NDAA`);
    ok(/"[^"]{12,}"/.test(c.text), `${pid}: the card has no direct quote`);
    ok(c.text.length <= 320, `${pid}: the card text is too long (${c.text.length})`);
    ok(c.source && /^https:\/\//.test(c.source.url || "") && c.source.label, `${pid}: the card has no source`);
    eq(c.source && c.source.url, m.source, `${pid}: the card's source is not the record's`);
    ok(Array.isArray(c.sources) && c.sources.length >= 1, `${pid}: no sources[]`);
    for (const x of c.sources || []) {
      ok(/^https:\/\//.test(x.link || "") && x.type && x.label && x.excerpt && /^20\d\d-\d\d-\d\d$/.test(x.date || "") && x.weight === "strong",
        `${pid}: a source is not in the locked schema — ${JSON.stringify(x).slice(0, 160)}`);
    }
    eq(c.sources[0].link, c.source.url, `${pid}: the first source is not the statement`);
    if (m.vote) ok((c.sources || []).some((x) => x.link === "https://clerk.house.gov/Votes/2026278" && x.type === "recorded vote"), `${pid}: the Roll Call 278 source is missing`);
    else ok(!(c.sources || []).some((x) => /clerk\.house\.gov/.test(x.link)), `${pid}: a senator carries a House roll call`);
    ok(!BANNED.test(`${c.topic} ${c.text} ${c.evidence} ${(c.sources || []).map((x) => x.excerpt).join(" ")}`), `${pid}: banned wording`);
    const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
    eq(pm[KEY] && pm[KEY].stance, m.side, `${pid}: the stance map does not publish the Section 219 side`);
    eq(pm[KEY] && pm[KEY].text, c.text, `${pid}: the stance map does not read the Section 219 card`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the drawer's stated line reads the Section 219 card");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const v of VOCABS) {
    const W = wins[v];
    for (const m of REC.members || []) {
      const c = (W.ISSUE_STANCE_DATA[m.pid] || []).find((x) => x.topic === TOPIC);
      if (!c) continue;
      const h = W.PDXConsistency.gapViewHtml(m.pid, KEY) || "";
      const hd = text(header(h));
      ok(hd.includes(SAYS[m.side]), `${v} · ${m.pid}: the drawer header does not print "${SAYS[m.side]}" — ${hd.slice(0, 160)}`);
      ok(hd.includes(`Source: ${c.source.label}`), `${v} · ${m.pid}: the stated line does not cite the Section 219 source`);
      ok(h.includes(`data-pdx-stance="${KEY}"`) && h.includes(`data-pdx-stance-side="${m.side}"`), `${v} · ${m.pid}: the stance marks are missing`);
      const ev = evidence(h);
      for (const x of c.sources) ok(ev.includes(`href="${x.link}"`), `${v} · ${m.pid}: Evidence does not link ${x.link}`);
      ok(text(ev).includes(text(c.sources[0].excerpt)), `${v} · ${m.pid}: Evidence does not print the statement's excerpt`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the voting record: Roll Call 278 on Support for Israel");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const m of REC.members || []) {
    const recs = (corpus.byMember.get(m.pid) || []).filter((r) => r.measureId === "H.R. 8800|119" && r.rollNumber === 278);
    if (!ATTRIBUTED.includes(m.pid)) {
      // Not attributed in the stored record: the card states the vote as text with
      // the Clerk link (House) or claims no vote (Senate); nothing is invented.
      if (m.chamber === "house") eq(m.voteAttributed, false, `${m.pid}: an unattributed vote is not marked so`);
      eq(recs.length, 0, `${m.pid}: a Roll Call 278 cell appeared without being declared`);
      continue;
    }
    if (!eq(recs.length, 1, `${m.pid}: Roll Call 278 cells`)) continue;
    const r = recs[0];
    eq(r.position, m.vote, `${m.pid}: the Roll Call 278 position`);
    ok((r.issues || []).some((i) => i.issueKey === KEY), `${m.pid}: Roll Call 278 is not mapped to ${KEY}`);
    const h = CS.gapViewHtml(m.pid, KEY) || "";
    const rec = (/data-pdxgap-sec="record"[\s\S]*/.exec(h) || [""])[0];
    ok(/H\.R\. 8800/.test(rec), `${m.pid}: the drawer's formal record does not list H.R. 8800`);
    // Two-way: the stated side and the vote point the same way.
    eq(m.vote === "yea" ? "support" : "oppose", m.side, `${m.pid}: the vote and the stated side disagree in the record`);
  }
  ok(ATTRIBUTED.every((p) => (REC.members || []).some((m) => m.pid === p)), "an attributed member left the record");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a reader against the Section 219 side gets a conflicts line");
// ═════════════════════════════════════════════════════════════════════════════
{
  let hits = 0;
  for (const m of REC.members || []) {
    const pid = m.pid;
    // A related issue whose own pairs include Support for Israel.
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
      eq((RI.conflictsFor(pid, win.CMP_DATA[pid], A) || []).filter((x) => x.bKey === KEY).length, 0, `${pid} × ${A}: an agreeing reader still gets a conflict`);
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
  const d = DECLARED_STANCE_PASSES.find((x) => x.pass === "section_219_ndaa_stated_nov2026");
  ok(!!d, "the pass is not declared in v103-chrome-seams.mjs");
  eq(d && d.pids.slice().sort().join(","), SET.slice().sort().join(","), "the declared pids are not the set");
  const base = BASE("politician-stances.js");
  if (base == null) {
    console.log("     (no git baseline — byte-identity checks skipped)");
  } else {
    const before = stanceData(base), after = stanceData(R("politician-stances.js"));
    for (const pid of NEW_LISTS) ok(!(pid in before), `${pid} already had stance entries at the base`);
    // A member a LATER declared stance pass gave another card is pinned, card
    // by card, by that pass's own suite; here only this pass's card is checked.
    const laterPids = new Set(DECLARED_STANCE_PASSES.slice(DECLARED_STANCE_PASSES.findIndex((x) => x.pass === "section_219_ndaa_stated_nov2026") + 1).flatMap((x) => x.pids));
    for (const pid of SET.filter((p) => !NEW_LISTS.includes(p))) {
      ok(pid in before, `${pid} had no stance entries at the base`);
      if (laterPids.has(pid)) { eq((before[pid] || []).filter((c) => c.topic === TOPIC).length, 0, `${pid}: a Section 219 card existed at the base`); continue; }
      const kept = (after[pid] || []).filter((c) => c.topic !== TOPIC);
      eq(JSON.stringify(kept), JSON.stringify(before[pid]), `${pid}: another card changed`);
      eq((before[pid] || []).filter((c) => c.topic === TOPIC).length, 0, `${pid}: a Section 219 card existed at the base`);
    }
    // People a LATER declared stance pass added or moved are that pass's
    // product, pinned by its own suite.
    const own = DECLARED_STANCE_PASSES.findIndex((x) => x.pass === "section_219_ndaa_stated_nov2026");
    const later = new Set(DECLARED_STANCE_PASSES.slice(own + 1).flatMap((x) => x.pids));
    const others = Object.keys(before).filter((pid) => !SET.includes(pid) && !later.has(pid));
    ok(others.every((pid) => JSON.stringify(before[pid]) === JSON.stringify(after[pid])), "another person's stance entries changed");
    eq(Object.keys(after).filter((pid) => !later.has(pid) && !(pid in before)).sort().join(","), NEW_LISTS.slice().sort().join(","), "a person other than the set was added");
    for (const f of ["related-issues.js", "consistency.js", "issue-map.js", "alignment-tool.js", "stance-helpers.js", "cmp-data.js",
      "cmp-data-detail.js", "db/issue-keys.json", "db/issue-core-categories.json", "db/vr-issue-seed.json", "db/bill-docs.json",
      "issue-scope.js", "stance-sides.js", "my-stances.js", "voting-record.js", "person.html", "index.html", "issue.html",
      "ballot.html", "netlify.toml", "_redirects"]) {
      const b = BASE(f);
      let now = null; try { now = R(f); } catch { /* absent */ }
      // index.html: the generated record strip follows stance coverage
      // (scripts/gen-hero-showcase.mjs); everything else stays byte-pinned.
      if (f === "index.html") { eq(withoutHeroCrawl(now), withoutHeroCrawl(b), `${f} changed outside the generated record strip`); continue; }
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
    for (const f of migs) ok(BASE(`netlify/database/migrations/${f}`) != null, `${f}: a migration this pass added`);
  }
  // The core chunk is precached and changed, so the shell moves one version;
  // the precache list and every line of worker code are unchanged.
  const sw = R("sw.js");
  const pre = (src) => (String(src).match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
  ok(pre(sw).includes("politician-stances-core.js"), "the core chunk is not precached");
  ok(!pre(sw).includes("politician-stances-ext.js"), "the ext chunk is precached");
  // A LATER declared stance pass may move the shell for its own precached
  // file; the v548 note stays, and worker code and precache list still compare.
  const _laterPass = DECLARED_STANCE_PASSES.findIndex((x) => x.pass === "section_219_ndaa_stated_nov2026") < DECLARED_STANCE_PASSES.length - 1;
  const _ver = Number((/^const CACHE_VERSION = 'v(\d+)';$/m.exec(sw) || [])[1]);
  ok(_laterPass ? _ver >= 548 : _ver === 548, `the shell is not at v548 (got v${_ver})`);
  ok(/v548 - SECTION 219 OF THE FY2027 NDAA[\s\S]*?MIGRATION COST: none\./.test(sw), "the v548 note is missing or does not say no migration");
  const baseSw = BASE("sw.js");
  if (baseSw != null) {
    ok(/^const CACHE_VERSION = 'v547';$/m.test(baseSw), "fixture: the base shell is v547");
    eq(pre(sw).join(","), pre(baseSw).join(","), "the precache list changed");
    eq(swCodeOnly(sw), swCodeOnly(baseSw), "worker code changed");
  }
}

if (failures.length) {
  console.error(`\n✗ section 219 ndaa: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ section 219 ndaa: all ${passed} assertions passed`);
