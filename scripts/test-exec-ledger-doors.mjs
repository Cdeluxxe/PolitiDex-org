#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-exec-ledger-doors.mjs — executive rows take the same door and line
// ─────────────────────────────────────────────────────────────────────────────
// Lee's roll-call rows in the issue drawer link out and carry a short effect
// line. Trump's War Powers, Diplomacy and Iran drawers held S.J. Res. 7,
// S.J. Res. 68, Executive Order 14353 and Proclamation 11015 as dead text with no
// "what it did". Now every ledger row — vote, veto, order, proclamation — goes
// through the same table, the same door and the same effect-line rule:
//
//   1. DOORS. A vetoed resolution's number is an outbound Congress.gov anchor
//      when the bill panel is not on the page. An order or a proclamation links
//      the official address the archive stores for it (its sourceUrl, on the
//      Federal Register or the White House) or stays plain text. Nothing else.
//   2. EFFECT LINES. Stored per document × issue, one sentence, ≤140, the act as
//      subject, no method words, and only on a pair the exec seed already maps.
//   3. IRAN. S.J. Res. 68 carries an Iran line; S.J. Res. 7 is not in the drawer.
//   4. LEE. The lands drawer keeps its Congress.gov doors and its lands lines.
//   5. NO DEAD TAP. With no panel, no drawer prints a control that can only
//      answer "No bill page on file" — and a renderer that does is caught.
//
//   node scripts/test-exec-ledger-doors.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "stance-tree.js",
];

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const no = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const must = (c, m) => { if (c) { passed++; return; } console.error(`✗ exec ledger doors: ${m}`); process.exit(2); };
const section = (t) => console.log(`  · ${t}`);

const corpus = buildCorpus(ROOT);
function boot(patch) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = R(f);
    if (patch && patch[f]) src = patch[f](src);
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}
const win = boot();
const CS = win.PDXConsistency;
must(!!CS && typeof CS.gapViewHtml === "function", "PDXConsistency.gapViewHtml is not published");
must(!win.PDXBillDetail, "this harness is meant to boot without the bill panel");

const text = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const tables = (h) => (String(h).match(/<table class="pdxlg-t"[\s\S]*?<\/table>/g) || []).join("\n");
// One ledger row, by the number it prints: its measure cell and its effect line.
const rowOf = (h, n) => {
  const t = tables(h);
  const re = /<tr data-pdxlg-row="(\d+)">([\s\S]*?)<\/tr>(<tr class="pdxlg-effr" data-pdxlg-effr="\1"><td[^>]*>([\s\S]*?)<\/td><\/tr>)?/g;
  for (const m of t.matchAll(re)) {
    const cells = m[2].match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
    if (text(cells[1] || "").startsWith(n)) return { cell: cells[1] || "", cells, eff: text(m[4] || "") };
  }
  return null;
};
const anchorOf = (cell) => (/<a [^>]*>/.exec(String(cell)) || [""])[0];

// The four rows this pass is about, from the seed rather than from memory.
const SEED = JSON.parse(R("db/exec-action-seed.json"));
const TRUMP = SEED.actions.trump;
const doc = (id) => TRUMP.find((a) => a.documentId === id);
const SJ7 = "S.J. Res. 7 (116th Congress)", SJ68 = "S.J. Res. 68 (116th Congress)";
const EO = "Executive Order 14353", PROC = "Proclamation 11015";
for (const id of [SJ7, SJ68, EO, PROC]) must(!!doc(id), `${id} is not in the exec seed`);

// The effect table, lifted from the shipped source.
const EXEC_EFFECT = (() => {
  const src = R("consistency.js"), a = src.indexOf("var _DOS_EXEC_EFFECT = {");
  must(a !== -1, "_DOS_EXEC_EFFECT is not in consistency.js in the form this file reads");
  return vm.runInNewContext("(" + src.slice(a + "var _DOS_EXEC_EFFECT = ".length, src.indexOf("\n  };", a) + 4) + ")");
})();
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary (?:carries|has) no|coded|chip|mapped|filed as|weighted|isPrimary|on-axis)\b/i;
const lineFault = (s) => {
  if (!s) return "is empty";
  if (s.length > 140) return `is ${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "is more than one sentence";
  if (/…|\.\.\./.test(s)) return "is a clip";
  if (METHOD.test(s)) return "carries method vocabulary";
  if (/\b(?:PolitiDex|we|our|this issue|this chip)\b/i.test(s)) return "is about the archive, not the act";
  if (!/^(?:Vetoed|Committed|Made|Had|Signed|Issued|Would|Struck|Directed|Ordered)\b/.test(s)) return "does not open on the act";
  return "";
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the effect table: stored per document × issue, on mapped pairs only");
// ═════════════════════════════════════════════════════════════════════════════
{
  const MAPPED = new Set(TRUMP.flatMap((a) => (a.issues || []).map((i) => `${a.documentId}|${i.issueKey}`)));
  for (const [k, v] of Object.entries(EXEC_EFFECT)) {
    ok(MAPPED.has(k), `${k}: a line is stored for a pair the exec seed does not map`);
    eq(lineFault(v), "", `${k}: the stored line`);
  }
  // Exactly the pairs these four documents sit on — the Ukraine and Yemen pass
  // added one, S.J. Res. 7 × yemen_policy, and nothing else.
  const WANT = {
    [SJ7]: ["restraint", "war_powers", "yemen_policy"],
    [SJ68]: ["iran_policy", "restraint", "war_powers"],
    [EO]: ["america_first_fp", "restraint", "war_powers"],
    [PROC]: ["restraint", "war_powers"],
  };
  for (const [id, keys] of Object.entries(WANT)) {
    eq(doc(id).issues.map((i) => i.issueKey).sort().join(","), keys.join(","), `${id}: its mapped issues`);
    for (const k of keys) ok(!!EXEC_EFFECT[`${id}|${k}`], `${id} × ${k}: no effect line stored`);
  }
  // S.J. Res. 7 is Yemen, not Iran: no Iran line, and no Iran mapping to hang one on.
  ok(!EXEC_EFFECT[`${SJ7}|iran_policy`], "S.J. Res. 7 carries an Iran line");
  for (const k of ["yemen_policy", "war_powers", "restraint"]) ok(/Yemen/.test(EXEC_EFFECT[`${SJ7}|${k}`]), `S.J. Res. 7 × ${k}: the line does not name Yemen`);
  // And S.J. Res. 68 is Iran, not Yemen.
  ok(!EXEC_EFFECT[`${SJ68}|yemen_policy`], "S.J. Res. 68 carries a Yemen line");
  for (const k of ["iran_policy", "war_powers", "restraint"]) ok(/Iran/.test(EXEC_EFFECT[`${SJ68}|${k}`]), `S.J. Res. 68 × ${k}: the line does not name Iran`);
  // The override tallies are the ones the seed's own status note records.
  for (const [id, tally] of [[SJ7, "53-45"], [SJ68, "49-44"]]) {
    const note = doc(id).status.map((s) => s.note).join(" ");
    ok(note.includes(tally.replace("-", " to ")), `${id}: the seed's status note does not record ${tally}`);
    for (const [k, v] of Object.entries(EXEC_EFFECT)) if (k.startsWith(id + "|")) ok(v.endsWith(tally + "."), `${k}: does not end on the override tally ${tally}`);
  }
  // No pole on iran_policy: this pass writes lines, not directions.
  ok(/iran_policy:\s*1/.test(R("stance-helpers.js").split("_RD_NO_POLE")[1] || ""), "iran_policy left _RD_NO_POLE");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Trump × War Powers: vetoes leave for Congress.gov, EO and proclamation for their stored address");
// ═════════════════════════════════════════════════════════════════════════════
const DEAD = [];
{
  for (const key of ["war_powers", "restraint"]) {
    const h = CS.gapViewHtml("trump", key) || "";
    must(h.length > 2000, `trump × ${key} rendered nothing`);
    for (const [id, n] of [[SJ7, 7], [SJ68, 68]]) {
      const r = rowOf(h, id);
      ok(!!r, `trump × ${key}: ${id} is not a ledger row`);
      if (!r) continue;
      const a = anchorOf(r.cell);
      has(a, `href="https://www.congress.gov/bill/116th-congress/senate-joint-resolution/${n}"`, `trump × ${key}: ${id} is not a Congress.gov anchor`);
      has(a, 'target="_blank"', `trump × ${key}: ${id} does not open in a new tab`);
      has(a, 'rel="noopener noreferrer"', `trump × ${key}: ${id} carries no rel`);
      has(a, "leaves PolitiDex", `trump × ${key}: ${id} does not say it leaves the site`);
      no(a, "data-pdxbill-open", `trump × ${key}: ${id} is wired to a panel that is not there`);
      eq(text(r.cells[2]), "Veto", `trump × ${key}: ${id} kind`);
      eq(text(r.cells[3]), "Vetoed", `trump × ${key}: ${id} act`);
      eq(r.eff, EXEC_EFFECT[`${id}|${key}`], `trump × ${key}: ${id} effect line`);
    }
    for (const [id, kind, act] of [[EO, "Executive order", "Signed"], [PROC, "Proclamation", "Issued"]]) {
      const r = rowOf(h, id);
      ok(!!r, `trump × ${key}: ${id} is not a ledger row`);
      if (!r) continue;
      const a = anchorOf(r.cell), url = doc(id).sourceUrl;
      if (a) {
        // A link, and only to the address the archive already stores.
        has(a, `href="${url}"`, `trump × ${key}: ${id} links somewhere other than its stored sourceUrl`);
        ok(/^https:\/\/(?:www\.)?(?:federalregister\.gov|whitehouse\.gov)\//.test(url), `trump × ${key}: ${id}'s link is not an official address`);
        has(a, 'target="_blank"', `trump × ${key}: ${id} does not open in a new tab`);
        has(a, "leaves PolitiDex", `trump × ${key}: ${id} does not say it leaves the site`);
        no(a, "congress.gov", `trump × ${key}: ${id} was given a Congress.gov address`);
      } else {
        ok(/^<td><span class="pdxlg-num">/.test(r.cell), `trump × ${key}: ${id} is neither a stored link nor plain text`);
      }
      no(r.cell, "<button", `trump × ${key}: ${id} is a button`);
      no(r.cell, "data-pdxbill-open", `trump × ${key}: ${id} is a bill-file control with no bill file`);
      eq(text(r.cells[2]), kind, `trump × ${key}: ${id} kind`);
      eq(text(r.cells[3]), act, `trump × ${key}: ${id} act`);
      eq(r.eff, EXEC_EFFECT[`${id}|${key}`], `trump × ${key}: ${id} effect line`);
    }
    has(tables(h), "<th>Act</th>", `trump × ${key}: the executive group's column is not headed Act`);
    no(h, "No bill page on file", `trump × ${key}: the dead door is printed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · Iran drawer: S.J. Res. 68 with its Iran line, S.J. Res. 7 absent");
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = CS.gapViewHtml("trump", "iran_policy") || "";
  must(h.length > 1000, "trump × iran_policy rendered nothing");
  const r = rowOf(h, SJ68);
  ok(!!r, "trump × iran_policy: S.J. Res. 68 is not a ledger row");
  if (r) {
    eq(r.eff, EXEC_EFFECT[`${SJ68}|iran_policy`], "trump × iran_policy: S.J. Res. 68's Iran line");
    ok(r.eff !== EXEC_EFFECT[`${SJ68}|war_powers`], "trump × iran_policy: the War Powers line stood in for the Iran one");
    has(anchorOf(r.cell), 'href="https://www.congress.gov/bill/116th-congress/senate-joint-resolution/68"', "trump × iran_policy: S.J. Res. 68 is not a Congress.gov anchor");
  }
  no(h, "S.J. Res. 7 ", "trump × iran_policy: S.J. Res. 7 appears in the Iran drawer");
  // The previous/next-issue stepper names its neighbour, and Yemen now sits next
  // to Iran in the vocabulary — that button is navigation, not drawer content.
  no(h.replace(/<button type="button" class="pdxdos-stepb"[\s\S]*?<\/button>/g, ""), "Yemen",
    "trump × iran_policy: the Yemen resolution's text reached the Iran drawer");
  eq((tables(h).match(/data-pdxlg-row="/g) || []).length, 1, "trump × iran_policy: not exactly one act");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Lee × Protect Public Lands keeps its doors and its lands lines");
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = CS.gapViewHtml("lee", "lands_preserve") || "";
  const LINES = {
    "H.J.Res. 131": "Removed the conservation withdrawal from roughly 1.2 million acres inside the Arctic National Wildlife Refuge.",
    "H.J.Res. 140": "Struck the order closing about 225,504 acres of Minnesota national forest above the Boundary Waters to mineral and geothermal leasing.",
  };
  for (const [n, line] of Object.entries(LINES)) {
    const r = rowOf(h, n);
    ok(!!r, `lee × lands_preserve: ${n} is not a ledger row`);
    if (!r) continue;
    const a = anchorOf(r.cell);
    has(a, `href="https://www.congress.gov/bill/119th-congress/house-joint-resolution/${n.split(" ")[1]}"`, `lee: ${n} is not a Congress.gov door`);
    has(a, "pdxbill-ext", `lee: ${n} is not marked outbound`);
    eq(r.eff, line, `lee: ${n}'s lands line`);
    eq(text(r.cells[3]), "Yea", `lee: ${n}'s vote cell`);
  }
  no(h, "No bill page on file", "lee × lands_preserve: the dead door is printed");
  no(tables(h), "<th>Act</th>", "lee × lands_preserve: a roll-call table was headed Act");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no drawer offers a tap that can only say \"No bill page on file\"");
// ═════════════════════════════════════════════════════════════════════════════
// Without the panel a control carrying data-pdxbill-open can only ever answer
// "No bill page on file" (see _billOpen). So on this harness every one of them
// is a dead tap, wherever it is printed, and so is the refusal written out.
const deadTaps = (h) => {
  const out = [];
  for (const m of String(h).matchAll(/<(button|span|b|a)\b[^>]*\bdata-pdxbill-open\b[^>]*>/g)) out.push(m[0].slice(0, 120));
  if (String(h).includes("No bill page on file")) out.push("the refusal text");
  return out;
};
const sweep = (W) => {
  const C = W.PDXConsistency, bad = [];
  let drawers = 0;
  for (const pid of ["trump", "lee"]) {
    for (const r of C.issueRows(pid) || []) {
      const h = C.gapViewHtml(pid, r.key) || "";
      drawers++;
      for (const d of deadTaps(h)) bad.push(`${pid}/${r.key}: ${d}`);
    }
  }
  return { bad, drawers };
};
{
  const s = sweep(win);
  ok(s.drawers > 40, `only ${s.drawers} drawers swept`);
  eq(s.bad.slice(0, 3).join(" | "), "", "a drawer printed a dead bill-file tap");
  console.log(`      ${s.drawers} drawers (trump, lee) · no dead tap`);
  // And with the panel on the page the vetoes keep the in-site door.
  const P = boot();
  P.PDXBillDetail = { open: () => true };
  const ph = tables(P.PDXConsistency.gapViewHtml("trump", "war_powers") || "");
  has(ph, 'class="pdxlg-num pdxbill-door" data-pdxbill-open data-pdxbill-num="S.J. Res. 68" data-pdxbill-sit="116"',
    "with the panel on the page, S.J. Res. 68 does not open the in-site bill file");
  has(ph, `href="${doc(EO).sourceUrl}"`, "with the panel on the page, the order lost its stored address");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · mutation: the checks have teeth");
// ═════════════════════════════════════════════════════════════════════════════
{
  const src = R("consistency.js");
  // (a) The old door: no panel, no address, still a button.
  const textSeam = "    if (!on && !cg) return '<span class=\"' + cls + '\">' + inner + '</span>';\n";
  must(src.includes(textSeam), "the plain-text seam in _billDoor has moved");
  // …and an executive row that dresses its document name as a bill number, as a
  // pass that "gave every row a door" without a stored address would.
  const numSeam = "          billNum: it.measureNumber || '',\n";
  const urlSeam = "          docUrl: it.measureNumber ? '' : _dosOfficialUrl(it),\n";
  must(src.includes(numSeam) && src.includes(urlSeam), "the exec door seams in _dosItems have moved");
  const A = boot({ "consistency.js": (s) => s.replace(textSeam, "")
    .replace(numSeam, "          billNum: it.measureNumber || it.documentId || '',\n")
    .replace(urlSeam, "          docUrl: '',\n") });
  const a = sweep(A);
  ok(a.bad.length > 0, "a renderer that prints a bill-file button over an order with no bill file passed the sweep");
  ok(a.bad.some((x) => /trump\/war_powers: <button/.test(x)), "the mutated order row on trump/war_powers was not caught as a button");
  // (b) The refusal written straight into a row as a button.
  const rowSeam = "        var num = _dosDoor('pdxlg-num', d, esc(d.ident || d.billNum || 'Measure'));\n";
  must(src.includes(rowSeam), "the ledger row door seam has moved");
  // Fired on a row that has no stored address to fall back to.
  const Bn = boot({ "consistency.js": (s) => s.replace(urlSeam, "          docUrl: '',\n").replace(rowSeam, rowSeam +
    "        if (d.lane === 'exec' && !d.docUrl && !d.billNum) num = '<button type=\"button\" class=\"pdxlg-num\">' + esc(d.ident) + ' <span class=\"pdxbill-nofile\">No bill page on file</span></button>';\n") });
  const bn = sweep(Bn);
  ok(bn.bad.some((x) => /the refusal text/.test(x)), "a row printing \"No bill page on file\" as a button passed the sweep");
  // And the same row with no stored address, un-mutated otherwise, is plain text.
  const T = boot({ "consistency.js": (s) => s.replace(urlSeam, "          docUrl: '',\n") });
  const tr = rowOf(T.PDXConsistency.gapViewHtml("trump", "war_powers") || "", EO);
  ok(!!tr && /^<td><span class="pdxlg-num">Executive Order 14353<\/span><\/td>$/.test(tr.cell), "an order with no stored address is not left as plain text");
  // (c) An effect line keyed to the wrong issue is caught by the drawer check.
  const C = boot({ "consistency.js": (s) => s.replace("return _dosEffectOk(_DOS_EXEC_EFFECT[String(it.documentId).trim() + '|' + issueKey]);",
    "return _dosEffectOk(_DOS_EXEC_EFFECT[String(it.documentId).trim() + '|war_powers']);") });
  const cr = rowOf(C.PDXConsistency.gapViewHtml("trump", "iran_policy") || "", SJ68);
  ok(!!cr && cr.eff !== EXEC_EFFECT[`${SJ68}|iran_policy`], "a War Powers line printed on the Iran row passed as the Iran line");
}

// ── THE PERSON FILE'S OWN LOAD, WITH THE LIVE READ IN HAND ──────────────────
// The sections above read the exec pool. /p/trump does not stop there: it also
// fetches /api/voting-record/member/trump, which files the same 80 acts as
// record-lane POSITIONS (kind 'position', actionType = position = 'vetoed' |
// 'signed' | 'issued', congress null, the stored address under source.url). Once
// that read lands the drawer is built from it — and a pass that only fixed the
// exec pool shipped "Voted on the result", a Vote column, a dead S.J. Res. 68 and
// no lines to that page. So this boots person.html's own script list in its own
// order and hands it rows in the API's shape, built from the seed the API is
// loaded from (no network in a test).
section("the person file, after the live voting-record read");
{
  const PH = R("person.html");
  const PFILES = [...PH.matchAll(/<script[^>]*src="\/([^"]+\.js)"/g)].map((m) => m[1]).filter((f) => !/firebase/.test(f));
  must(PFILES.includes("consistency.js") && PFILES.includes("exec-action-data.js"), "person.html no longer loads the drawer and the exec seed");
  const live = TRUMP.map((a) => {
    const at = a.actionClass === "vetoed_law" ? "vetoed" : a.actionClass === "signed_law" ? "signed" : "issued";
    const num = a.measureNumber || a.documentId;
    const mt = a.measureNumber ? (/Res\./.test(num) ? "resolution" : "bill")
      : a.actionClass === "executive_order" ? "executive_order" : /^Proclamation/.test(num) ? "proclamation" : "memorandum";
    return { kind: "position", measureType: mt, number: num, title: a.title, chamber: a.chamber || "executive",
      date: a.actedAt + "T00:00:00.000Z", action: at, actionType: at, position: at, result: null,
      supports: at !== "vetoed", isProcedural: false, advanceInverted: false, isAmendment: false,
      rollcallId: null, congress: null, session: null, rollNumber: null, measureIdent: null,
      issues: (a.issues || []).map((i) => ({ issueKey: i.issueKey, weight: i.weight, supportMeaning: "yea_supports", rationale: i.counts || "" })),
      source: { url: a.sourceUrl, label: a.sourceLabel } };
  });
  const P = makeSandbox();
  const pctx = vm.createContext(P);
  P.PROFILES = P.CMP_DATA;
  for (const f of PFILES) { try { vm.runInContext(R(f), pctx, { filename: f }); } catch { /* a browser-only module */ } }
  must(!!(P.PDXConsistency && P.PDXVotingRecord), "the person file's drawer or voting record did not boot");
  const cold = P.PDXConsistency.gapViewHtml("trump", "war_powers") || "";
  P.PDXVotingRecord.noteMember("trump", live);
  const warm = P.PDXConsistency.gapViewHtml("trump", "war_powers") || "";
  for (const [lbl, h] of [["before the read", cold], ["after the read", warm]]) {
    has(h, "Signed, vetoed or issued", `person file ${lbl}: the acts are not in their own group`);
    no(h, "Voted on the result", `person file ${lbl}: a veto is filed as a vote on the result`);
    no(h, "No bill page on file", `person file ${lbl}: a refusal is printed`);
    ok(!/<th[^>]*>Vote<\/th>/.test(h), `person file ${lbl}: the table still has a Vote column`);
    for (const [n, want] of [["S.J. Res. 68", "https://www.congress.gov/bill/116th-congress/senate-joint-resolution/68"],
      ["S.J. Res. 7", "https://www.congress.gov/bill/116th-congress/senate-joint-resolution/7"],
      ["Executive Order 14353", doc(EO).sourceUrl], ["Proclamation 11015", doc(PROC).sourceUrl]]) {
      const r = rowOf(h, n);
      ok(!!r, `person file ${lbl}: ${n} has no ledger row`);
      if (!r) continue;
      eq((/href="([^"]+)"/.exec(anchorOf(r.cell)) || [])[1], want, `person file ${lbl}: ${n}'s door`);
      const key = { "S.J. Res. 68": SJ68, "S.J. Res. 7": SJ7 }[n] || n;
      eq(r.eff, EXEC_EFFECT[`${key}|war_powers`], `person file ${lbl}: ${n}'s War Powers line`);
    }
  }
  // Iran, as the preview's database holds it after the iran_policy migration.
  const liveIran = live.map((x) => x.number === "S.J. Res. 68"
    ? { ...x, issues: x.issues.concat([{ issueKey: "iran_policy", weight: 90, supportMeaning: "yea_supports", rationale: "" }]) } : x);
  P.PDXVotingRecord.noteMember("trump", liveIran);
  const ih = P.PDXConsistency.gapViewHtml("trump", "iran_policy") || "";
  const ir = rowOf(ih, "S.J. Res. 68");
  ok(!!ir, "person file: the Iran drawer has no S.J. Res. 68 row after the read");
  if (ir) {
    eq((/href="([^"]+)"/.exec(anchorOf(ir.cell)) || [])[1], "https://www.congress.gov/bill/116th-congress/senate-joint-resolution/68", "person file: S.J. Res. 68's door on Iran");
    eq(ir.eff, EXEC_EFFECT[`${SJ68}|iran_policy`], "person file: S.J. Res. 68's Iran line");
  }
  ok(!rowOf(ih, "S.J. Res. 7"), "person file: S.J. Res. 7 is on the Iran drawer");
  // A legislator's record takes none of this: Lee's lands rows are still votes.
  const lh = P.PDXConsistency.gapViewHtml("lee", "public_lands") || "";
  ok(!lh || !/Signed, vetoed or issued/.test(lh), "person file: a senator's drawer grew an executive group");
}

if (failures.length) {
  for (const f of failures.slice(0, 40)) console.error(`  ✗ ${f}`);
  console.error(`\n✗ exec ledger doors: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`\n✓ exec ledger doors: ${passed} passed, 0 failed`);
