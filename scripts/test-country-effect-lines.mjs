#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-country-effect-lines.mjs — effect lines on the Iran, Ukraine and Yemen
// drawers
// ─────────────────────────────────────────────────────────────────────────────
// A row on a country leaf can show a date, a number and a kind and still not say
// what the act did to that country. The effect line is that sentence. This pass
// filled the one pair on the three keys that had none — H.Amdt. 252 × Ukraine,
// which the database maps and the shipped seed does not, so it reaches a member's
// drawer through the live record. The fence:
//
//   1. THE TABLE. Every stored line on the three keys is one sentence, 140
//      characters or fewer, the act as the subject, no method word, and names
//      its country. The Lands and Red Tape lines are byte-identical.
//   2. TRUMP. His Iran, Ukraine and Yemen drawers print a line only where one is
//      stored for that document on that key, and never a bill title instead.
//      Each eyebrow still reads "No side published on this subject".
//   3. H.AMDT. 252, LIVE-SHAPED. A member's Ukraine row for it prints the stored
//      line — the same line for a yea and a nay — and its other rows print none.
//   4. NOTHING ELSE MOVED. With the new line removed, every drawer on the three
//      keys renders byte-identically, except the Ukraine rows that gained it.
//   5. MUTATIONS. A line over 140 characters, a second sentence, a method word
//      and the Lands line borrowed onto an Iran row are each caught.
//
//   node scripts/test-country-effect-lines.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
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
const IR = "iran_policy", UK = "ukraine_policy", YE = "yemen_policy";
const KEYS = [IR, UK, YE];
const COUNTRY = { [IR]: /\bIran/, [UK]: /\bUkrain/, [YE]: /\bYemen/ };
const NO_SIDE = "No side published on this subject";
const HA252 = "H.Amdt. 252|119|ukraine_policy";
const HA252_URL = "https://www.congress.gov/amendment/119th-congress/house-amendment/252";
// sha256 over "key\tline" for every lands_preserve, lands_energy and
// gov_regulation entry in _DOS_EFFECT, newline-joined in table order, as it stood
// before this pass. A changed byte in any of them moves the hash.
const LANDS_RED_TAPE_SHA = "f92d64aca228f9879cefaa2b076ce02f8df67c0e225cd550637036cd9bafbd5f";
const LANDS_RED_TAPE_COUNT = 10;
// The method vocabulary a row line may not carry: _DOS_EFFECT_METHOD's words and
// the archive's own bookkeeping terms.
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|coded|chip|mapped|mapping|filed as|weight(?:ed)?|scor\w*|rationale|support_meaning|yea_supports|archive)\b/i;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const must = (c, m) => { if (c) { passed++; return; } console.error(`✗ country effect lines: ${m}`); process.exit(2); };
const section = (t) => console.log(`  · ${t}`);

const text = (h) => String(h).replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();

// The effect table, lifted from source text.
const pullFrom = (src, name) => {
  const a = src.indexOf(`var ${name} = {`);
  must(a !== -1, `${name} is not in consistency.js`);
  return vm.runInNewContext("(" + src.slice(a + `var ${name} = `.length, src.indexOf("\n  };", a) + 4) + ")");
};
const SRC = R("consistency.js");
const EFFECT = pullFrom(SRC, "_DOS_EFFECT");
const EXEC_EFFECT = pullFrom(SRC, "_DOS_EXEC_EFFECT");

// ── the H.Amdt. 252 record as /api/voting-record returns it ─────────────────
// The shipped seed carries the roll (house 119/2/264) but no mapping for the
// amendment, so the offline corpus drops it. The database maps it on five keys —
// four in 20260725000000_vr_multi_issue_mappings_wave2 and Ukraine in
// 20261106000000_vr_ukraine_yemen_policy_issue_keys — and this rebuilds that row
// for a member in the shape the pack carries.
const HA252_ISSUES = [
  { issueKey: "america_first_fp", weight: 100, isPrimary: true, supportMeaning: "yea_supports",
    rationale: "Cuts off U.S. security assistance to Ukraine, the clearest floor test of rethinking overseas commitments." },
  { issueKey: "restraint", weight: 80, isPrimary: false, supportMeaning: "yea_supports",
    rationale: "Ends U.S. military assistance to an ongoing foreign conflict; a yea limits U.S. involvement in it." },
  { issueKey: "foreign_balance", weight: 60, isPrimary: false, supportMeaning: "yea_opposes",
    rationale: "Withdraws the security assistance the United States coordinates with NATO partners; a yea cuts against leading through allied commitments." },
  { issueKey: "strong_defense", weight: 50, isPrimary: false, supportMeaning: "yea_opposes",
    rationale: "Opponents held that ending security assistance weakens deterrence against a hostile power; a yea cuts against that view. Same framing as the S.J.Res. 59 mapping already in the record." },
  { issueKey: UK, weight: 100, isPrimary: false, supportMeaning: "yea_supports",
    rationale: "Ukraine is the amendment's own subject: it prohibits funds for the Ukraine Security Assistance Initiative, except for U.S. embassy security in Ukraine. Filed here alongside its restraint, America First, alliance and defense rows, not in place of them; no side is read on this key." },
];
const seedS2 = JSON.parse(R("db/vr-house-seed-119-s2.json"));
const ha252Vote = (seedS2.votes || []).find((v) => v.measure && v.measure.number === "H.Amdt. 252" && v.rollNumber === 264);
must(!!ha252Vote, "house roll 119/2/264 (H.Amdt. 252) is not in db/vr-house-seed-119-s2.json");
must(ha252Vote.result === "failed", `H.Amdt. 252's roll result is ${ha252Vote.result}, not failed`);
const ha252Rec = (c) => ({
  kind: "vote", measureId: "H.Amdt. 252|119", measureType: "amendment",
  number: "H.Amdt. 252", title: ha252Vote.measure.title, chamber: "house", status: "failed",
  date: new Date(ha252Vote.voteDate).toISOString(), action: ha252Vote.question, actionType: ha252Vote.actionType || "amendment",
  position: c.position, result: ha252Vote.result, isParty: c.isParty || null, supports: null,
  isProcedural: false, advanceInverted: false, isAmendment: true, parentMeasureId: null,
  rollcallId: 264, congress: 119, session: 2, rollNumber: 264,
  issues: HA252_ISSUES.map((i) => ({ ...i })),
  source: { url: ha252Vote.sourceUrl, label: "U.S. House Clerk" },
});

const corpus = buildCorpus(ROOT);
// One yea and one nay, each a member the corpus already carries.
const pickVoter = (pos) => (ha252Vote.memberVotes || []).find((c) => c.position === pos && corpus.byMember.has(c.politicianId));
const YEA = pickVoter("yea"), NAY = pickVoter("nay");
must(!!YEA && !!NAY, "no yea and nay voter on H.Amdt. 252 with a corpus record");
const LIVE = [YEA.politicianId, NAY.politicianId];

function boot(patch, { live = true } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = R(f);
    if (patch && patch[f]) {
      const next = patch[f](src);
      must(next !== src, `patch on ${f} did not apply`);
      src = next;
    }
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    let list = recs;
    if (live) {
      const c = [YEA, NAY].find((x) => x.politicianId === pid);
      if (c) list = recs.concat([ha252Rec(c)]);
    }
    try { win.PDXVotingRecord.noteMember(pid, list); } catch { /* not a member surface */ }
  }
  return win;
}

// Every row of a drawer's ledger: the measure cell's text and the effect line
// under it, '' where the row has none.
function rows(html) {
  const out = [];
  const re = /<tr data-pdxlg-row="(\d+)">([\s\S]*?)<\/tr>(<tr class="pdxlg-effr" data-pdxlg-effr="\1"><td[^>]*>([\s\S]*?)<\/td><\/tr>)?/g;
  let m;
  while ((m = re.exec(String(html)))) {
    const cells = m[2].split(/<\/td>/).map((c) => text(c));
    out.push({ i: m[1], date: cells[0] || "", measure: cells[1] || "", eff: text(m[4] || "") });
  }
  return out;
}
const findLine = (h) => {
  const m = String(h).match(/<div class="pdxlg-find"[\s\S]*?<\/div>/);
  return m ? text(m[0]) : "";
};

// The stored line a dossier item should print on a key, from the SHIPPED tables
// — never the booted ones, so a mutation of the tables cannot move the answer.
function storedFor(d, key) {
  const it = d && d.item;
  if (!it) return "";
  if (d.lane === "exec") return it.documentId ? (EXEC_EFFECT[String(it.documentId).trim() + "|" + key] || "") : "";
  return EFFECT[String(it.number == null ? "" : it.number).trim() + "|" + it.congress + "|" + key] || "";
}

// The drawer check, as one function, so the mutation pass runs exactly it.
function checkDrawer(win, pid, key) {
  const faults = [];
  const CS = win.PDXConsistency;
  const items = CS.dossierItems(pid, key) || [];
  const html = CS.gapViewHtml(pid, key) || "";
  const rs = rows(html);
  if (items.length !== rs.length) faults.push(`${pid} × ${key}: ${items.length} items but ${rs.length} ledger rows`);
  const titles = new Set(items.flatMap((d) => [d.title, d.item && d.item.title, d.item && d.item.shortTitle, d.ident]
    .filter(Boolean).map((s) => text(s))));
  const want = new Map(); // item → stored line, matched by its effLine on the item
  for (const d of items) {
    const s = storedFor(d, key);
    if (String(d.effLine || "") !== s) faults.push(`${pid} × ${key}: ${d.ident} carries ${JSON.stringify(d.effLine || "")}, stored ${JSON.stringify(s)}`);
    if (s) want.set(text(s), (want.get(text(s)) || 0) + 1);
  }
  const printed = new Map();
  for (const r of rs) {
    if (!r.eff) continue;
    printed.set(r.eff, (printed.get(r.eff) || 0) + 1);
    if (titles.has(r.eff)) faults.push(`${pid} × ${key}: a title stands in for the line on ${r.measure}`);
    if (COUNTRY[key] && !COUNTRY[key].test(r.eff)) faults.push(`${pid} × ${key}: the line on ${r.measure} does not name its country: ${JSON.stringify(r.eff)}`);
    if (r.eff.length > 140) faults.push(`${pid} × ${key}: the line on ${r.measure} runs ${r.eff.length} characters`);
    if (METHOD.test(r.eff)) faults.push(`${pid} × ${key}: the line on ${r.measure} carries a method word`);
  }
  for (const [s, n] of want) if (printed.get(s) !== n) faults.push(`${pid} × ${key}: stored line printed ${printed.get(s) || 0}× not ${n}×: ${JSON.stringify(s)}`);
  for (const [s, n] of printed) if (want.get(s) !== n) faults.push(`${pid} × ${key}: a line nothing stored was printed: ${JSON.stringify(s)}`);
  return { faults, rows: rs, html, items };
}

const win = boot();
const CS = win.PDXConsistency;
must(!!CS && typeof CS.gapViewHtml === "function" && typeof CS.dossierItems === "function", "PDXConsistency drawer API is not published");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the table: one short sentence per pair, Lands and Red Tape untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  const country = Object.entries({ ...EFFECT, ...EXEC_EFFECT }).filter(([k]) => KEYS.some((x) => k.endsWith("|" + x)));
  must(country.length > 0, "no effect line on the three keys");
  for (const [k, v] of country) {
    const key = KEYS.find((x) => k.endsWith("|" + x));
    ok(v.length <= 140, `${k}: ${v.length} characters`);
    ok(/[.!?]$/.test(v), `${k}: does not end on its stop`);
    ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(v.replace(/\bU\.S\./g, "US")), `${k}: more than one sentence`);
    ok(!METHOD.test(v), `${k}: method words`);
    ok(COUNTRY[key].test(v), `${k}: does not name its country`);
    ok(/^[A-Z][a-z]+(ed|s)\b|^Would\b/.test(v), `${k}: does not open on the act's verb`);
    ok(!/…|\.\.\.$/.test(v), `${k}: clipped with an ellipsis`);
  }
  const ha = EFFECT[HA252];
  must(!!ha, `${HA252}: no line stored`);
  ok(/Ukraine Security Assistance/.test(ha), `${HA252}: does not name the act by its stored title`);
  ok(/\b76-350\b/.test(ha) && /House rejected/.test(ha), `${HA252}: does not carry the failed House tally on file`);
  const y = ha252Vote.totals || ha252Vote.tally || null;
  if (y && typeof y.yea === "number") ok(ha.includes(`${y.yea}-${y.nay}`), `${HA252}: tally ${y.yea}-${y.nay} on file`);
  ok(!/^(Prohibited|Barred|Cut)\b/.test(ha), `${HA252}: a failed amendment is written as though it took effect`);

  // The ten as they stood before this pass; the search-leaves pass (v316) added
  // two later lands_energy lines of its own, held by its own test, and they are
  // not part of the shipped set this hash pins.
  // Wave 1 (v317) added a Red Tape line for H.R. 6955, likewise held by its own test.
  // The rider rows (v320) added a Red Tape line for H.R. 6329, held by
  // scripts/test-rider-effect-lines.mjs. Wave 3 (v322) added Red Tape lines for
  // H.R. 2965, H.R. 4305 and H.J.Res. 78, held by scripts/test-wave3-effect-lines.mjs.
  const LATER = new Set(["H.R. 4090|119|lands_energy", "H.R. 1366|119|lands_energy", "H.R. 6955|119|gov_regulation",
    "H.R. 6329|119|gov_regulation", "H.R. 2965|119|gov_regulation", "H.R. 4305|119|gov_regulation",
    "H.J.Res. 78|119|gov_regulation"]);
  const lrt = Object.keys(EFFECT).filter((k) => /\|(lands_preserve|lands_energy|gov_regulation)$/.test(k) && !LATER.has(k));
  eq(lrt.length, LANDS_RED_TAPE_COUNT, "Lands and Red Tape line count");
  const sha = createHash("sha256").update(lrt.map((k) => k + "\t" + EFFECT[k]).join("\n")).digest("hex");
  eq(sha, LANDS_RED_TAPE_SHA, "Lands and Red Tape lines are byte-identical");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Trump: a line only where one was stored, no title in its place");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const key of KEYS) {
    const { faults, rows: rs, html, items } = checkDrawer(win, "trump", key);
    for (const f of faults) ok(false, f);
    ok(faults.length === 0, `trump × ${key}: drawer check`);
    if (items.length) {
      ok(findLine(html).includes(NO_SIDE), `trump × ${key}: eyebrow is ${JSON.stringify(findLine(html))}`);
      ok(!/Acts: \d+ for · \d+ against/.test(text(html)), `trump × ${key}: a for/against line on a no-pole key`);
    } else {
      eq(rs.length, 0, `trump × ${key}: an empty drawer prints rows`);
      ok(!html.includes('data-pdxlg-eff="1"'), `trump × ${key}: an empty drawer prints an effect line`);
    }
  }
  const ir = rows(CS.gapViewHtml("trump", IR));
  ok(ir.length >= 4 && ir.every((r) => r.eff), "trump × iran_policy: every stored Iran document prints its line");
  ok(!ir.some((r) => r.eff === EXEC_EFFECT["S.J. Res. 68 (116th Congress)|war_powers"]), "trump × iran_policy: the War Powers line stands in for the Iran one");
  const ye = rows(CS.gapViewHtml("trump", YE));
  ok(ye.length === 1 && ye[0].eff === EXEC_EFFECT["S.J. Res. 7 (116th Congress)|yemen_policy"], "trump × yemen_policy: S.J. Res. 7 prints its Yemen line");
  eq((CS.dossierItems("trump", UK) || []).length, 0, "trump × ukraine_policy: no Ukraine act is on Trump's file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · H.Amdt. 252 on the live record: one line on the pair, for every voter");
// ═════════════════════════════════════════════════════════════════════════════
{
  const lines = [];
  for (const pid of LIVE) {
    const { faults, rows: rs, html } = checkDrawer(win, pid, UK);
    for (const f of faults) ok(false, f);
    const r = rs.find((x) => /H\.Amdt\. 252\b/.test(x.measure));
    must(!!r, `${pid} × ukraine_policy: no H.Amdt. 252 row (the live mapping did not reach the drawer)`);
    eq(r.eff, EFFECT[HA252], `${pid} × ukraine_policy: H.Amdt. 252's line`);
    lines.push(r.eff);
    ok(findLine(html).includes(NO_SIDE), `${pid} × ukraine_policy: eyebrow is ${JSON.stringify(findLine(html))}`);
    // Its other rows read their own keys, and nothing is stored for them.
    for (const k of ["america_first_fp", "restraint", "foreign_balance", "strong_defense"]) {
      const o = rows(CS.gapViewHtml(pid, k) || "").find((x) => /H\.Amdt\. 252\b/.test(x.measure));
      if (!o) continue;
      ok(o.eff !== EFFECT[HA252], `${pid} × ${k}: the Ukraine line is borrowed onto H.Amdt. 252's ${k} row`);
      eq(o.eff, "", `${pid} × ${k}: H.Amdt. 252 prints a line nothing stored for ${k}`);
    }
  }
  eq(lines[0], lines[1], "the yea and the nay on H.Amdt. 252 read the same line");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · nothing else moved: drawers that gained no line are byte-identical");
// ═════════════════════════════════════════════════════════════════════════════
const DROP = { "consistency.js": (s) => s.replace(/\n {4}'H\.Amdt\. 252\|119\|ukraine_policy':\n {6}'[^\n]*',/, "") };
{
  const before = boot(DROP);
  const BCS = before.PDXConsistency;
  must(!pullFrom(DROP["consistency.js"](SRC), "_DOS_EFFECT")[HA252], "the drop patch left the H.Amdt. 252 line in place");
  const pids = new Set(["trump", ...corpus.byMember.keys()]);
  let same = 0, gained = 0;
  for (const pid of pids) {
    for (const key of KEYS) {
      let a = "", b = "";
      try { a = CS.gapViewHtml(pid, key) || ""; b = BCS.gapViewHtml(pid, key) || ""; } catch (e) { ok(false, `${pid} × ${key}: ${e.message}`); continue; }
      const gains = key === UK && LIVE.includes(pid);
      if (!gains) { if (a === b) same++; else ok(false, `${pid} × ${key}: drawer changed with no line gained`); continue; }
      // The one difference is the effect row under H.Amdt. 252.
      const row = rows(a).find((x) => /H\.Amdt\. 252\b/.test(x.measure));
      const strip = a.replace(new RegExp(`<tr class="pdxlg-effr" data-pdxlg-effr="${row && row.i}">[\\s\\S]*?</tr>`), "");
      ok(strip === b, `${pid} × ${key}: more than the H.Amdt. 252 line changed`);
      ok(a !== b, `${pid} × ${key}: gained no line`);
      gained++;
    }
    // H.Amdt. 252's own other drawers, on the two live voters, moved not at all.
    if (LIVE.includes(pid)) {
      for (const k of ["america_first_fp", "restraint", "foreign_balance", "strong_defense", "lands_preserve", "gov_regulation"]) {
        ok((CS.gapViewHtml(pid, k) || "") === (BCS.gapViewHtml(pid, k) || ""), `${pid} × ${k}: drawer changed`);
      }
    }
  }
  ok(same > 0, "no drawer compared");
  eq(gained, 2, "drawers that gained a line");
  // Lee's Lands and Red Tape drawers, the rows the existing lines were written for.
  for (const k of ["lands_preserve", "lands_energy", "gov_regulation"]) {
    ok((CS.gapViewHtml("mike_lee", k) || "") === (BCS.gapViewHtml("mike_lee", k) || ""), `mike_lee × ${k}: drawer changed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · mutations: each bad line is caught");
// ═════════════════════════════════════════════════════════════════════════════
{
  const lineRe = (k) => new RegExp(`(\\n {4}'${k.replace(/[.|]/g, "\\$&")}':\\n {6}')[^\\n]*(',)`);
  const swap = (k, v) => ({ "consistency.js": (s) => s.replace(lineRe(k), (_, a, b) => a + v.replace(/'/g, "\\'") + b) });
  const caught = (w, pid, key, what) => {
    const { faults } = checkDrawer(w, pid, key);
    ok(faults.length > 0, `MUTATION: ${what} on ${pid} × ${key} passed the drawer check`);
  };
  const voter = LIVE[0];

  // (a) Over 140 characters — the renderer drops it and the stored line goes missing.
  const long = EFFECT[HA252].replace("; the House", ", leaving the rest of the security assistance account untouched by the bar; the House");
  must(long.length > 140, "the long mutation is not over 140 characters");
  caught(boot(swap(HA252, long)), voter, UK, "a line over 140 characters");
  // (b) A second sentence.
  caught(boot(swap(HA252, "Proposed prohibiting funds for Ukraine Security Assistance. The House rejected it 76-350.")), voter, UK, "a second sentence");
  // (c) A method word.
  caught(boot(swap(HA252, "Proposed prohibiting Ukraine Security Assistance funds; coded here as the Ukraine row, it failed 76-350.")), voter, UK, "a method word");
  // (d) The Lands line borrowed onto an Iran row — in the table, and in the lookup.
  const lands = EFFECT["H.J.Res. 131|119|lands_preserve"];
  const irVoter = [...corpus.byMember.keys()].find((p) => (CS.dossierItems(p, IR) || []).some((d) => d.item && d.item.number === "H.Con.Res. 89"));
  must(!!irVoter, "no member carries an H.Con.Res. 89 Iran row");
  caught(boot(swap("H.Con.Res. 89|119|iran_policy", lands)), irVoter, IR, "the Lands line in the Iran slot");
  caught(boot({ "consistency.js": (s) => s.replace(
    "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
    "return _dosEffectOk((issueKey === 'iran_policy' ? _DOS_EFFECT['H.J.Res. 131|119|lands_preserve'] : _DOS_EFFECT[k]) || (mech && mech.did) || '');") }),
    irVoter, IR, "the Lands line read for an Iran row");
  // (e) A bill title standing in where no line is stored.
  caught(boot({ "consistency.js": (s) => s.replace(
    "effLine: _dosEffectLine(p.item, issueKey, mech),",
    "effLine: _dosEffectLine(p.item, issueKey, mech) || String(p.item.title || ''),") }),
    voter, "america_first_fp", "a bill title standing in for a line");
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
