#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-proof-flow.mjs — one top-to-bottom reading order on the person
// page, with the proof (evidence and votes) tied to the claims it backs
// ─────────────────────────────────────────────────────────────────────────────
//   1. ORDER. Read the way the spine assembles the body (governing stage first,
//      source position inside a stage): the letterhead chips and the formal-record
//      summary, then ⚖️ Word vs Action ending on the ✒️ stated positions, then 🌳
//      All Issues by Topic, then 🔗 related issues (nothing mounted between the
//      tree and it), then the 🧩 Evidence section (Connected Evidence first, the
//      full Evidence Locker card under it), then the voting highlights, with the
//      bills sponsored and co-sponsored placed under them and ahead of the 🕳
//      gaps list, then everything else. The outline restates the same order.
//   2. STATED ROWS. Every row carries exactly one "See proof" control that opens
//      that row's own issue drawer ([data-pdxst-dos] for the row's key and person,
//      landing on the drawer's Quick proof), as a sibling of the row's overlay
//      link. A row whose issue has material in the Evidence section also carries
//      "Evidence ↓", aimed at that issue's card id — and that card is in the
//      Evidence section's markup. No other row carries one.
//   3. FORMAL-RECORD BARS. Every door row of "The formal record — what it looks
//      like" (strongest patterns and ran both ways) carries the same proof
//      control for its own key and person.
//   4. EVIDENCE GROUPED BY THE SAME ISSUES. One card per issue, id = the jump's
//      anchor, tinted with the issue's own colour, stated-position issues first
//      in the stated list's order.
//   5. THE DRAWER. Its 🧾 Quick proof sits directly under the Formal record head,
//      above the vote table; its vote lines are acts from that table (no bill
//      door, no ledger row classes) and its evidence links are links the drawer's
//      own Evidence block lists. Related issues, Where this conflicts and the
//      Evidence block keep their order after it. openGap understands focus
//      'proof'.
//   6. CHIPS. The Evidence chip still targets #pdxsec-evidence; the bills chip
//      reads "Bills Sponsored & Co-Sponsored · N sponsored + M co-sponsored".
//   7. SHELL. The service worker moved past v597.
//
//   node scripts/test-person-proof-flow.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else if (failures.length < 200) failures.push(msg); };

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js", "person-link.js",
  "pdx-issue-family.js", "issue-colors.js", "word-action.js", "stance-tree.js", "related-issues.js",
  "profile-spine.js", "profiles-full.js",
];
const win = makeSandbox();
const ctx = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) {
  try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { failures.push(`boot ${f}: ${e.message}`); }
}
win.PROFILES = win.CMP_DATA;
const corpus = buildCorpus(ROOT);
for (const [pid, recs] of corpus.byMember) {
  try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ }
}
const WA = win.PDXWordAction, CS = win.PDXConsistency, SPINE = win.PDXProfileSpine;

// ── 1 · order ────────────────────────────────────────────────────────────────
{
  const PF = R("profiles-full.js");
  const BODY = PF.slice(PF.indexOf("const _profileBody = "));
  const K = SPINE.STAGE_KEYS;
  const at = (k) => K.indexOf(k);
  ok(at("standout") + 1 === at("verdict"), "Word vs Action's stage sits directly under the formal-record summary");
  ok(at("verdict") + 1 === at("explore"), "the topic tree's stage follows Word vs Action");
  ok(at("explore") + 1 === at("receipts"), "the Evidence stage follows the topic tree's stage");
  ok(at("receipts") + 1 === at("record"), "voting highlights and bills (record stage) follow the Evidence stage");
  for (const later of ["signature", "tension", "money", "you", "drawers"]) {
    ok(at(later) > at("record"), `${later} stays lower than the voting highlights and bills`);
  }
  const stageOf = (i) => {
    const tags = BODY.slice(0, i).match(/<!--PDXSP:([a-z0-9:_-]+)-->/g) || [];
    return tags.length ? tags[tags.length - 1].replace(/<!--PDXSP:|-->/g, "") : "identity";
  };
  const rank = (i) => (K.indexOf(stageOf(i)) < 0 ? K.length : K.indexOf(stageOf(i))) * 1e9 + i;
  const M = {
    chips: BODY.indexOf("${_navBar}"),
    hero: BODY.indexOf("${scoreRing}"),
    standout: BODY.indexOf("window.PDXConsistency && window.PDXConsistency.recordStandout"),
    wva: BODY.indexOf("window.PDXWordAction.sectionHtml(id, p)"),
    tree: BODY.indexOf("window.PDXStanceTree.sectionHtml(id)"),
    related: BODY.indexOf("window.PDXRelatedIssues.sectionHtml(id, p)"),
    evidence: BODY.indexOf("window._renderEvidenceConnections(id, p) : ''}"),
    locker: BODY.indexOf("window._renderEvidenceSummary(id, p) : ''}"),
    highlights: BODY.indexOf("const _vrHighlightsSection"),
    gaps: BODY.indexOf("window.PDXGaps.sectionHtml(id, p)"),
  };
  for (const [k, v] of Object.entries(M)) ok(v > 0, `mount not found: ${k}`);
  const ORDER = ["chips", "standout", "wva", "tree", "related", "evidence", "locker", "highlights", "gaps"];
  for (let i = 1; i < ORDER.length; i++) {
    ok(rank(M[ORDER[i - 1]]) < rank(M[ORDER[i]]), `order: ${ORDER[i - 1]} does not read before ${ORDER[i]}`);
  }
  ok(rank(M.chips) < rank(M.hero) || stageOf(M.hero) === "identity", "the formal-record hero is in the letterhead with the chips");
  ok(stageOf(M.wva) === "verdict" && stageOf(M.tree) === "explore" && stageOf(M.related) === "explore",
    "Word vs Action / tree / related issues are in the verdict / explore / explore stages");
  ok(stageOf(M.evidence) === "receipts" && stageOf(M.locker) === "receipts", "Evidence and the Locker card are in the Evidence stage");
  ok(stageOf(M.highlights) === "record" && stageOf(M.gaps) === "record", "highlights and gaps are in the record stage");
  ok(BODY.split("window.PDXRelatedIssues.sectionHtml(id, p)").length === 2, "related issues is mounted exactly once");
  const between = BODY.slice(M.tree, M.related).replace(/<!--[\s\S]*?-->/g, "");
  ok((between.match(/\$\{/g) || []).length === 1, "nothing is mounted between the topic tree and related issues");
  ok(/return html \+ statedListHtml\(pid\);/.test(R("word-action.js")), "Word vs Action's section still ends with the stated-positions list");
  // The spine's registry agrees: gaps ride at the foot of record.
  ok(SPINE.stageOfTarget ? SPINE.stageOfTarget("pdxsec-gaps") === "record" : /'pdxsec-gaps': 'record'/.test(R("profile-spine.js")),
    "the gaps anchor is registered in the record stage");
  // The bills section is placed under the highlights, ahead of the gaps list.
  const PB = R("person-bills.js");
  ok(/var gaps = gapsBlock\(stage\);\s*if \(gaps\) stage\.insertBefore\(host, gaps\); else stage\.appendChild\(host\);/.test(PB),
    "the bills section goes ahead of the gaps list in the record stage");
  for (const f of ["person-bills.js", "person-recorded-votes.js", "person-coverage.js"]) {
    ok(/var LATER = \['signature', 'tension', 'money', 'you', 'drawers'\];/.test(R(f)), `${f}: fallback stages are the ones after record`);
  }
  // The outline restates the order.
  const PO = R("person-outline.js");
  const mem = PO.slice(PO.indexOf("var MEMBER = ["), PO.indexOf("var JUDGE = ["));
  const keys = [...mem.matchAll(/\{ key: '([a-z]+)'/g)].map((m) => m[1]);
  ok(JSON.stringify(keys) === JSON.stringify(["identity", "brief", "verdict", "explore", "receipts", "tension", "money"]),
    `outline order is ${keys.join(" → ")}`);
}

// ── 2 · stated rows ─────────────────────────────────────────────────────────
const rowsOf = (h) => [...String(h).matchAll(/<li class="pdxwa-stated-row"[^>]*>[\s\S]*?<\/li>/g)].map((m) => m[0]);
let swept = 0, rowsSeen = 0, evJumps = 0;
for (const pid of Object.keys(win.CMP_DATA)) {
  let html = "";
  try { html = WA.statedListHtml(pid) || ""; } catch { html = ""; }
  if (!html) continue;
  swept++;
  let evSection = "";
  try { evSection = win._renderEvidenceConnections(pid, win.CMP_DATA[pid]) || ""; } catch { evSection = ""; }
  for (const li of rowsOf(html)) {
    rowsSeen++;
    const key = (/data-pdxwa-stated="([^"]+)"/.exec(li) || [])[1];
    const go = [...li.matchAll(/<button type="button" class="pdxwa-proof-go" data-pdxst-dos="([^"]+)" data-pdxst-pid="([^"]+)"[^>]*data-pdxst-focus="proof"[^>]*>([\s\S]*?)<\/button>/g)];
    ok(go.length === 1, `${pid}/${key}: row has ${go.length} "See proof" controls`);
    if (go.length) {
      ok(go[0][1] === key && go[0][2] === pid, `${pid}/${key}: "See proof" opens ${go[0][2]}/${go[0][1]}`);
      ok(/See proof/.test(go[0][3]), `${pid}/${key}: control does not read "See proof"`);
    }
    ok(!/<a class="pdxwa-stated-go"[^>]*>[^]*?pdxwa-proof[^]*?<\/a>/.test(li.replace(/<a class="pdxwa-stated-go"[^>]*><\/a>/, "")) ,
      `${pid}/${key}: proof control nested in a link`);
    const want = win._pdxEvHas(pid, key);
    const ev = /<button type="button" class="pdxwa-proof-ev" data-pdxev-jump="([^"]+)"/.exec(li);
    if (want) {
      evJumps++;
      ok(ev && ev[1] === want && want === win._pdxEvAnchor(pid, key), `${pid}/${key}: Evidence jump missing or aimed elsewhere`);
      ok(evSection.includes(`id="${want}"`), `${pid}/${key}: the Evidence jump's card is not in the Evidence section`);
    } else {
      ok(!ev, `${pid}/${key}: an Evidence jump is drawn where the Evidence section has nothing`);
    }
  }
}
ok(swept > 50 && rowsSeen > 300, `stated sweep too thin: ${swept} profiles, ${rowsSeen} rows`);
ok(evJumps > 5, `only ${evJumps} rows had an Evidence jump — the secondary path is vacuous`);
{
  const css = R("word-action.css");
  ok(/\.pdxwa-proof-go,\s*\.pdxwa-proof-ev \{[^}]*position: relative; z-index: 2;/.test(css), "proof controls sit above the row's overlay link");
}

// ── 3 · formal-record bars ───────────────────────────────────────────────────
let bars = 0, shaped = 0;
for (const pid of Object.keys(win.CMP_DATA)) {
  let h = "";
  try { h = WA.shapeHtml(pid, win.CMP_DATA[pid]) || ""; } catch { h = ""; }
  if (!h || !/The formal record — what it looks like/.test(h)) continue;
  shaped++;
  for (const m of h.matchAll(/<li class="pdxwa-shape-row"[^>]*>[\s\S]*?<\/li>/g)) {
    const li = m[0];
    const door = /<span class="pdxwa-shape-door" data-pdxst-dos="([^"]+)" data-pdxst-pid="([^"]+)"/.exec(li);
    if (!door) continue;
    bars++;
    const pr = [...li.matchAll(/class="pdxwa-proof-go" data-pdxst-dos="([^"]+)" data-pdxst-pid="([^"]+)"[^>]*data-pdxst-focus="proof"/g)];
    ok(pr.length === 1 && pr[0][1] === door[1] && pr[0][2] === door[2], `${pid}/${door[1]}: bar lacks its own proof control`);
  }
}
ok(shaped > 3 && bars > 15, `bar sweep too thin: ${shaped} formal-record blocks, ${bars} bars`);

// ── 3b · topic-tree cards open the same drawers ─────────────────────────────
{
  let leaves = 0;
  for (const pid of ["lee", "trump", "massie", "warren"]) {
    if (!win.CMP_DATA[pid]) continue;
    let h = "";
    try { h = win.PDXStanceTree.sectionHtml(pid) || ""; } catch { h = ""; }
    for (const m of h.matchAll(/data-pdxtree-dos="([^"]+)"[^>]*data-pdxtree-pid="([^"]+)"/g)) {
      leaves++;
      ok(m[2] === pid, `${pid}/${m[1]}: tree card opens another person's drawer`);
      ok(!!CS.gapViewHtml(pid, m[1]), `${pid}/${m[1]}: tree card's drawer renders nothing`);
    }
  }
  ok(leaves > 20, `tree sweep too thin: ${leaves} cards`);
  ok(/CS\.openGap\(dos\.getAttribute\('data-pdxtree-pid'\)/.test(R("stance-tree.js")), "tree cards open the drawer through openGap");
}

// ── 4 · evidence grouped by the same issues ─────────────────────────────────
let cards = 0, tinted = 0, ordered = 0;
for (const pid of Object.keys(win.CMP_DATA)) {
  let h = "";
  try { h = win._renderEvidenceConnections(pid, win.CMP_DATA[pid]) || ""; } catch { h = ""; }
  if (!h) continue;
  const list = [...h.matchAll(/<div id="([^"]+)" class="evd-card [^"]*" data-pdx-ev-issue="([^"]+)"([^>]*)>/g)];
  const stated = (CS.statedStances(pid) || []).map((s) => s.key);
  const seen = new Set();
  for (const [, id, key, rest] of list) {
    cards++;
    ok(id === win._pdxEvAnchor(pid, key), `${pid}/${key}: card id is not the jump anchor`);
    ok(!seen.has(key), `${pid}/${key}: two evidence cards for one issue`);
    seen.add(key);
    if (win.PDXIssueColors.isCore(key)) {
      tinted++;
      ok(rest.includes(`data-ic="on"`) && rest.includes(win.PDXIssueColors.styleFor(key)), `${pid}/${key}: card is not in its issue colour`);
    }
  }
  // Inside the open lead (before any lid) the stated issues come first, in order.
  const lead = h.split("<!--PDXSP:lid")[0];
  const leadKeys = [...lead.matchAll(/data-pdx-ev-issue="([^"]+)"/g)].map((m) => m[1]);
  const pos = leadKeys.map((k) => (stated.indexOf(k) < 0 ? Infinity : stated.indexOf(k)));
  const sorted = pos.every((v, i) => i === 0 || pos[i - 1] <= v);
  ok(sorted, `${pid}: open evidence cards are not in stated-position order (${leadKeys.join(", ")})`);
  if (leadKeys.length > 1) ordered++;
}
ok(cards > 20 && tinted > 10, `evidence sweep too thin: ${cards} cards, ${tinted} tinted`);
ok(/\.evd-card\[data-ic\] \{ border-left-color: var\(--pdx-ic/.test(R("app.css")), "the card's rail takes the issue colour");

// ── 5 · the drawer ──────────────────────────────────────────────────────────
{
  const SAMPLE = ["lee", "trump", "massie", "john_curtis", "celeste_maloy", "warren", "cruz", "schiff"];
  let drawers = 0, withVotes = 0, withEv = 0;
  for (const pid of SAMPLE) {
    if (!win.CMP_DATA[pid]) continue;
    for (const r of CS.issueRows(pid) || []) {
      const h = CS.gapViewHtml(pid, r.key) || "";
      const qp = h.indexOf('<section class="pdxgap-qp"');
      if (qp < 0) continue;
      drawers++;
      const tag = `${pid} × ${r.key}`;
      const end = h.indexOf("<!--/pdxgap-qp-->", qp);
      const block = h.slice(qp, end);
      const rec = h.indexOf('data-pdxgap-sec="record"');
      ok(rec >= 0 && rec < qp, `${tag}: quick proof is not under the Formal record head`);
      const between = h.slice(h.indexOf(">", rec) + 1, qp).replace(/<\/div>/, "");
      ok(!/<(div|section|details|ul|table)\b/.test(between), `${tag}: something sits between the Formal record head and quick proof`);
      const table = h.indexOf('<table class="pdxlg-t"');
      if (table >= 0) ok(table > end, `${tag}: quick proof is not above the vote table`);
      ok(!/pdxlg-num|pdxdos-rec-id|<tr\b|pdxbill-door/.test(block), `${tag}: quick proof prints a ledger row or a bill door`);
      // Votes stay in the formal record table: Quick proof prints no vote line,
      // only a door down to the table when the drawer has one.
      ok(!/data-pdxgap-qp-vote=|data-pdxgap-qp-g="votes"/.test(block), `${tag}: quick proof prints vote lines`);
      if (table >= 0) {
        withVotes++;
        ok(/data-pdxgap-qp-to="record"/.test(block), `${tag}: quick proof has no door down to the vote table`);
      }
      const evs = [...block.matchAll(/<a class="pdxgap-qp-src" href="([^"]+)"/g)].map((m) => m[1]);
      if (evs.length) {
        withEv++;
        const evBlock = h.slice(h.indexOf('data-pdxgap-sec="evidence"'));
        for (const u of evs) ok(evBlock.includes(`href="${u}"`), `${tag}: quick-proof source ${u} is not in the drawer's Evidence block`);
      }
      const after = (m) => h.indexOf(m);
      for (const m of ['class="pdxri pdxri-drawer"', 'class="pdxri-conflicts"', 'data-pdxgap-sec="evidence"']) {
        if (after(m) >= 0) ok(after(m) > end, `${tag}: ${m} moved above quick proof`);
      }
      const ri = after('class="pdxri pdxri-drawer"'), ev = after('data-pdxgap-sec="evidence"');
      if (ri >= 0 && ev >= 0) ok(ri < ev, `${tag}: related issues no longer precede the Evidence block`);
    }
  }
  ok(drawers > 100 && withVotes > 50 && withEv > 5, `drawer sweep too thin: ${drawers} drawers, ${withVotes} with votes, ${withEv} with evidence`);
  const src = R("consistency.js");
  ok(/opts\.focus === 'proof'\) \{\s*_gapFocusSel\(sheet, body, '\[data-pdxgap-qp\]'\);/.test(src), "openGap lands focus 'proof' on Quick proof");
  ok(/closest\('\[data-pdxev-jump\]'\)/.test(src) && /_pdxJumpEvidence\(evj\.getAttribute\('data-pdxev-jump'\)/.test(src),
    "the Evidence jump is handled and routed through _pdxJumpEvidence");
}

// ── 6 · chips ───────────────────────────────────────────────────────────────
{
  ok(/_navItems\.push\(\{ target: 'pdxsec-evidence', icon: '🔗', label: 'Evidence'/.test(R("profiles-full.js")),
    "the Evidence chip still targets #pdxsec-evidence");
  ok(R("profiles-full.js").includes('<span id="pdxsec-evidence" class="pdx-nav-anchor"'), "the Evidence anchor is on the page");
  const swin = makeSandbox();
  swin.document.readyState = "complete";
  const sctx = vm.createContext(swin);
  try { vm.runInContext(R("person-bills.js"), sctx, { filename: "person-bills.js" }); } catch (e) { failures.push(`person-bills boot: ${e.message}`); }
  const PB = swin.PDXPersonBills;
  ok(PB && typeof PB.jumpHtml === "function" && typeof PB.roleCounts === "function", "person-bills publishes jumpHtml and roleCounts");
  if (PB) {
    const t = PB.roleCounts([{ r: "s" }, { r: "f" }, { r: "c" }, { r: "c" }, { r: "c" }]);
    ok(t.sponsored === 2 && t.cosponsored === 3, "sponsor and floor sponsor count as sponsored, co-sponsor as co-sponsored");
    const on = PB.jumpHtml("lee", "on", { sponsored: 12, cosponsored: 13 });
    const txt = on.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    ok(txt === "Bills Sponsored & Co-Sponsored · 12 sponsored + 13 co-sponsored", `bills chip reads "${txt}"`);
    ok(/data-pdx-sponsored-jump="pdx-sponsored"/.test(on) && !/disabled/.test(on), "the bills chip jumps to the bills section");
    const wait = PB.jumpHtml("lee", "wait", null).replace(/<[^>]+>/g, "").trim();
    ok(wait === "Bills Sponsored & Co-Sponsored", "no tally before the table answers");
  }
}

// ── 7 · shell ───────────────────────────────────────────────────────────────
{
  const v = Number((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]);
  ok(v > 597, "service worker shell version bumped past v597");
}

if (failures.length) {
  console.error(`\n✗ person proof flow: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ person proof flow: all ${passed} assertions passed (${swept} stated lists, ${bars} bars, ${cards} evidence cards)`);
