#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-current-bills.mjs — the bills moving now, mapped on every issue they touch
// ─────────────────────────────────────────────────────────────────────────────
// db/vr-current-bills.json records the anchor, H.R. 8352 (119th, passed both
// chambers and awaiting presentment), the six public laws signed in October 2026
// and Utah 2026GS H.B. 76 and H.B. 507. The rows are created by
// netlify/database/migrations/20261118000000_vr_current_bills_full_lens.sql and
// the effect lines sit in _DOS_EFFECT under the CURRENT BILLS SLICE 20 marker.
//
//   1. THE MIGRATION IS THE LEDGER: the same measures and the same mappings
//      (issue, weight, primary flag, polarity), every key allow-listed, exactly
//      one primary per mapped measure, every rationale and source from the
//      enrolled text, no row for a measure the ledger leaves unmapped, and no
//      roll call, member vote or position anywhere in the file.
//   2. EVERY MAPPING IS PINNED TO THE TEXT: verbatim quotes from the enrolled
//      text, and each `touches` phrase is in those quotes and tied to a word of
//      the issue's own label, chip or keywords — so a row cannot name an issue
//      the text does not touch.
//   3. EVERY LINE IS PINNED TO THE TEXT: one sentence, 140 characters, act as
//      subject, no method or sales words; terms in the quotes and the line; every
//      other content word in the quotes, title or a `plain` restatement; every
//      qualifier kept; "any", "all", "every" only where the bill says them; tense
//      from the recorded status; no two lines on one act sharing half their
//      content words. A silent pair and an unmapped measure each say why.
//   4. IT RENDERS, AND IT IS PUBLISHED: a fixture row for every mapped measure
//      prints each line once under its own row and nothing under a silent one;
//      each measure has its bill page, its issues and its lines in
//      db/bill-docs.json, and its address in sitemap.xml.
//   5. NOTHING SHIPPED MOVED: every _DOS_EFFECT line at HEAD byte-identical, the
//      other tables unchanged, consistency.js outside the block HEAD's, no other
//      migration added or edited, and the fixture's drawers outside their effect
//      rows rendered as at HEAD.
//   6. MUTATIONS: a line broader than its bill, a dropped qualifier, a method
//      word, a tense flip, a line duplicating a sibling, a line on an unmapped
//      measure, an invented issue row in the migration, an invented issue in the
//      ledger, a mapping whose polarity drifts from the ledger, and an edited
//      shipped line must each fail.
//
//   node scripts/test-current-bills.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const MARK = "// CURRENT BILLS SLICE 20 (v391).";
const MIG_NAME = "20261118000000_vr_current_bills_full_lens.sql";
const MIG_PATH = "netlify/database/migrations/" + MIG_NAME;
const LEDGER = JSON.parse(R("db/vr-current-bills.json"));
const ALLOWED = new Set(JSON.parse(R("db/issue-keys.json")).keys);
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|direction match|pole|defines? terms|technical (?:and conforming )?changes|this bill)\b|PolitiDex|…|\.\.\./i;
const SALES = /\bmembers?(?:hip)?\b|\bstocks?\b|\bpremium\b|\bequity\b|\bDEI\b/i;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ current bills: STALE HARNESS — ${m}`); process.exit(2); } };
const norm = (x) => String(x || "").replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const bare = (x) => low(String(x).replace(/\[\+|\+\]|\[-|-\]/g, " "));
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const HEAD_SRC = git(["show", "HEAD:consistency.js"]);

function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { text: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")") };
}
function blockOf(src) {
  const a = src.indexOf("    " + MARK);
  if (a < 0) return { text: "", keys: [] };
  const end = src.indexOf("\n  };", a);
  const next = src.slice(a + 4 + MARK.length, end).search(/\n {4}\/\/ [A-Z][A-Z -]* SLICE \d+ \(v\d+\)\./);
  const text = src.slice(a, next < 0 ? end + 1 : a + 4 + MARK.length + next + 1);
  return { text, keys: [...text.matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]) };
}
// The issue vocabulary: ISSUE_MAP from alignment-tool.js, label + chip + keywords.
const ISSUE_MAP = (() => {
  const src = R("alignment-tool.js"), a = src.indexOf("var ISSUE_MAP = {");
  let d = 0, i = src.indexOf("{", a); const s = i;
  for (; i < src.length; i++) { if (src[i] === "{") d++; else if (src[i] === "}") { d--; if (!d) break; } }
  return vm.runInNewContext("(" + src.slice(s, i + 1) + ")");
})();
const vocab = (k) => { const v = ISSUE_MAP[k]; return v ? low([v.label, v.chip, ...(v.keywords || [])].join(" | ")) : ""; };

// ── THE MIGRATION, READ BACK ────────────────────────────────────────────────
function readMigration(sql) {
  const out = [];
  for (const blk of sql.split(/\nDO \$\$\n/).slice(1)) {
    const body = blk.slice(0, blk.indexOf("END $$;"));
    const num = (/number = '((?:[^']|'')+)'/.exec(body) || [])[1];
    const sess = /utahSession' = '(\d{4}GS)'/.exec(body);
    const cong = /congress = (\d+)/.exec(body);
    const vals = /INSERT INTO vr_measures[\s\S]*?VALUES \('bill', (NULL|\d+), '([^']+)', '((?:[^']|'')+)', '((?:[^']|'')+)',\s*'(?:[^']|'')+', '(?:[^']|'')*', '([a-z_]+)',\s*'([^']+)'/.exec(body);
    const maps = [...body.matchAll(/VALUES \(m_id, '([a-z_]+)', (\d+), (true|false),\s*'(yea_supports|yea_opposes)', '((?:[^']|'')*)', '([^']*)'\)/g)]
      .map((m) => ({ issue: m[1], weight: Number(m[2]), isPrimary: m[3] === "true", supportMeaning: m[4], rationale: m[5].replace(/''/g, "'"), source: m[6] }));
    out.push({ number: num && num.replace(/''/g, "'"), sitting: sess ? sess[1] : cong ? cong[1] : null,
      chamber: vals && vals[2], title: vals && vals[4].replace(/''/g, "'"), status: vals && vals[5], sourceUrl: vals && vals[6], maps,
      issueInserts: (body.match(/INSERT INTO vr_measure_issues/g) || []).length });
  }
  return out;
}

// ── THE FIXTURE ─────────────────────────────────────────────────────────────
const PID = "adam_smith";
const MEAS = LEDGER.measures;
const FIXTURE = MEAS.filter((m) => m.mappings.length).map((m) => {
  const fed = m.lane === "federal";
  return {
    kind: "vote", measureId: `${m.number}|${m.sitting}`, measureType: "bill", number: m.number, title: m.title,
    chamber: m.chamber, status: m.status, date: fed ? "2026-10-01T00:00:00.000Z" : "2026-03-01T00:00:00.000Z",
    action: "On passage", actionType: "passage", position: "yea", result: "passed", isParty: "with_party", supports: true,
    isProcedural: false, advanceInverted: false, isAmendment: false, parentMeasureId: null, rollcallId: null,
    congress: fed ? 119 : null, session: fed ? 2 : 2026, rollNumber: null,
    measureIdent: fed ? null : { session: m.sitting, readFrom: null, readFromUrl: null, officialTitle: null, billUrl: null },
    issues: m.mappings.map((x) => ({ issueKey: x.issue, weight: x.weight, isPrimary: x.isPrimary, supportMeaning: x.supportMeaning, rationale: null })),
  };
});
const LEAVES = [...new Set(MEAS.flatMap((m) => m.mappings.map((x) => x.issue)))].sort();
function boot(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  try { win.PDXVotingRecord.noteMember(PID, FIXTURE); } catch (e) { win.__err = `noteMember: ${e.message}`; }
  return win;
}
const pairOf = (it, k) => `${norm(it.number)}|${typeof it.congress === "number" ? it.congress : (it.measureIdent && it.measureIdent.session) || ""}|${k}`;
function rendered(win, leaf) {
  const CS = win.PDXConsistency;
  let items = [], html = "";
  try { items = CS.dossierItems(PID, leaf) || []; } catch { return { rows: new Map(), html: "" }; }
  try { html = CS.dossierLedgerHtml(PID, leaf) || ""; } catch { html = ""; }
  const effs = new Map();
  for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) effs.set(Number(m[1]), (effs.get(Number(m[1])) || []).concat(dec(m[2])));
  const rows = new Map();
  for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
    const i = Number(m[1]), d = items[i], it = (d && d.item) || {};
    if (!d || d.lane === "exec" || !norm(it.number)) continue;
    const p = pairOf(it, leaf);
    rows.set(p, (rows.get(p) || []).concat([effs.get(i) || []]));
  }
  return { rows, html };
}
const sansEffect = (h) => String(h).replace(/<tr class="pdxlg-(?:effr|relr)"[\s\S]*?<\/tr>/g, "");

// ── ONE LINE AGAINST ITS OWN BILL TEXT ──────────────────────────────────────
const STOP = new Set(("a an the and or of to for in on by at as with from its it their them that this these those who which " +
  "when where may can before after into under over than more less some any each every one all part per is against utah not no " +
  "without also such other own has have be been being if whether while within between through about only until was").split(" "));
const VERBS = new Set(("would have had set let made gave created extended raised barred required imposed provided measured " +
  "restricted authorized give allowed banned prohibited repealed removed expanded increased reduced lowered limited exempted " +
  "established directed ended added applied enacted protected kept permitted struck changed moved shifted put cut capped " +
  "granted opened closed named tied sent held voided narrowed").split(" "));
const words = (x) => String(x).toLowerCase().replace(/[’']/g, "'").match(/[a-z0-9%$&]+(?:[-'.][a-z0-9]+)*/g) || [];
const stem = (w) => w.replace(/'s$/, "").replace(/ies$/, "y").replace(/(?:ing|ed|es|s)$/, "");
const content = (s) => new Set(words(s).filter((w) => !STOP.has(w) && !VERBS.has(w)).map(stem));
function dupOf(line, others) {
  const a = content(line);
  for (const [j, v] of Object.entries(others)) {
    const b = content(v), shared = [...a].filter((w) => b.has(w)).length;
    if (a.size && shared / a.size >= 0.5) return `${j} (${shared} of ${a.size} content words)`;
  }
  return "";
}
function lineFault(m, x, v, E) {
  const s = norm(v);
  if (!s) return "no line is stored";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  if (!/^[A-Z][a-z]+\b/.test(s) || /^(?:This|The bill|It)\b/.test(s)) return "the act is not the subject";
  const mw = s.match(METHOD); if (mw) return `method word: ${mw[0]}`;
  if (SALES.test(s)) return "sales word";
  if (low(s.replace(/[.!?]$/, "")) === low(m.title)) return "the line is the measure's title";
  const others = {};
  for (const [j, w] of Object.entries(E)) if (j !== x.key && j.startsWith(`${m.number}|${m.sitting}|`)) others[j] = w;
  const dup = dupOf(s, others);
  if (dup) return `duplicates a sibling line: ${dup}`;
  for (const [j, w] of Object.entries(E)) if (j !== x.key && norm(w) === s) return `borrowed from ${j}`;
  const Q = (x.sources || []).map((q) => q.quote);
  if (!Q.length) return "no quoted bill text";
  if (!(x.sources || []).every((q) => /^https:\/\/(?:www\.govinfo\.gov|le\.utah\.gov)\//.test(q.from))) return "a quote is not from GovInfo or the Legislature";
  if (m.lane === "utah" && !Q.some((q) => /\[\+[\s\S]*?\+\]|\[-[\s\S]*?-\]/.test(q))) return "no quote shows a change the bill makes";
  const quoted = bare(Q.join(" "));
  if (!(x.terms || []).length) return "no terms tie the line to its bill";
  for (const t of x.terms) {
    if (!quoted.includes(low(t))) return `the term "${t}" is not in this bill's quoted text`;
    if (!low(s).includes(low(t))) return `the line does not carry its bill's term "${t}"`;
  }
  for (const [w, src] of Object.entries(x.plain || {})) if (!quoted.includes(bare(src))) return `"${w}" restates "${src}", which this bill does not say`;
  const srcW = new Set(words([quoted, m.title].join(" ")).map(stem));
  const plain = new Set(Object.keys(x.plain || {}).flatMap((w) => words(w)).map(stem));
  const near = (w) => [...srcW].some((y) => y.length > 3 && w.length > 3 && (y.startsWith(w) || w.startsWith(y)));
  const extra = words(s).filter((w) => !STOP.has(w) && !STOP.has(stem(w)) && !VERBS.has(w) && !srcW.has(stem(w)) && !plain.has(stem(w)) && !near(stem(w)));
  if (extra.length) return `broader than the bill — words it does not support: ${extra.join(", ")}`;
  for (const b of x.bounds || []) if (!low(s).includes(b)) return `broader than the bill — the line drops its qualifier "${b}"`;
  for (const w of s.match(/\b(?:any|all|every)\b/gi) || []) if (!new RegExp("\\b" + w + "\\b", "i").test(Q.join(" "))) return `broader than the bill — "${w}" is the line's word, not the bill's`;
  if (m.status === "enacted" && /^(?:Would|Proposed)\b/.test(s)) return "an enacted act is written as though it did not take effect";
  if (m.status !== "enacted" && !/^Would\b/.test(s)) return "an act that is not law is written as though it took effect";
  if (m.lane === "utah" && m.status === "enacted" && !/^Governor Signed/.test(String(m.enactedPer))) return "read as law with no signature on the Legislature's record";
  if (m.lane === "federal" && m.status === "enacted" && !/^\d{3}-\d+$/.test(String(m.publicLaw))) return "read as law with no public law number";
  return "";
}
// THE REVIEWED PAIRS. Whether a bill's text touches an issue is a reading a
// person made, quote by quote; a test cannot make it. What a test can do is hold
// the pass to the pairs that were read: a pair added to the ledger or the
// migration beyond these — an issue nobody showed the text to touch — fails here
// before any other rule is applied.
const REVIEWED = new Set([
  "H.R. 8352|119|justice_balance", "H.R. 8352|119|privacy_rights",
  "S. 240|119|water_storage", "S. 240|119|infrastructure", "S. 240|119|enviro_energy",
  "S. 766|119|gov_waste", "S. 766|119|audit_spending",
  "H.R. 5345|119|social_security", "H.R. 5345|119|gov_services",
  "H.B. 76|2026GS|datacenter_water", "H.B. 76|2026GS|water",
  "H.B. 507|2026GS|dev_district_finance", "H.B. 507|2026GS|datacenter_growth", "H.B. 507|2026GS|datacenter_power",
  "H.B. 507|2026GS|gov_transparency", "H.B. 507|2026GS|enviro_energy", "H.B. 507|2026GS|lower_taxes",
]);
// A mapping must touch its issue: it is a reviewed pair, and each `touches`
// phrase is in the quoted text and names a word in the issue's own label, chip or
// keywords.
function mappingFault(m, x) {
  if (!ALLOWED.has(x.issue)) return `${x.issue} is not an allow-listed key`;
  if (!ISSUE_MAP[x.issue]) return `${x.issue} is not in ISSUE_MAP`;
  if (!REVIEWED.has(`${m.number}|${m.sitting}|${x.issue}`)) return `${m.number} × ${x.issue} is not a reviewed pair — the text was not shown to touch this issue`;
  const Q = (x.sources || []).map((q) => q.quote);
  if (!Q.length || !(x.sources || []).every((q) => /^https:\/\//.test(q.from))) return "no quoted, sourced text";
  const quoted = bare(Q.join(" ")), V = vocab(x.issue);
  const T = Object.entries(x.touches || {});
  if (!T.length) return "no phrase ties the text to the issue";
  for (const [phrase, word] of T) {
    if (!quoted.includes(low(phrase))) return `"${phrase}" is not in the quoted text`;
    if (!V.includes(low(word))) return `the text is tied to "${word}", which is not a word of ${x.issue}'s label, chip or keywords — the text does not touch this issue`;
  }
  if (norm(x.rationale).length < 60) return "no rationale";
  if (!/^yea_(?:supports|opposes)$/.test(x.supportMeaning)) return "no polarity";
  return "";
}

function check(src, sql, ledger) {
  const out = [];
  const need = (c, m) => { if (!c) out.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), X = mapOf(src, "_DOS_EXEC_EFFECT"), M = mapOf(src, "_DOS_MECH"), P = mapOf(src, "_DOS_POINTER");
  if (!E || !X || !M || !P) return ["effect maps not found in consistency.js"];
  const meas = ledger.measures;

  // 1 · the migration is the ledger
  const mig = readMigration(sql);
  need(mig.length === meas.length, `the migration holds ${mig.length} measures, the ledger ${meas.length}`);
  need(!/INSERT INTO (?:vr_rollcalls|vr_member_votes|vr_positions)/.test(sql), "the migration writes a roll call, vote or position");
  for (const m of meas) {
    const g = mig.find((x) => x.number === m.number && x.sitting === m.sitting);
    if (!g) { need(false, `${m.number} (${m.sitting}): not created by the migration`); continue; }
    need(g.chamber === m.chamber && g.title === m.title && g.status === m.status && g.sourceUrl === m.sourceUrl, `${m.number}: the migration's identity, title, status or source is not the ledger's`);
    need(g.issueInserts === m.mappings.length && g.maps.length === m.mappings.length, `${m.number}: the migration writes ${g.maps.length} issue rows, the ledger records ${m.mappings.length}`);
    if (!m.mappings.length) need(norm(m.noMappingWhy).length > 60, `${m.number}: unmapped with no reason`);
    else need(m.mappings.filter((x) => x.isPrimary).length === 1, `${m.number}: not exactly one primary row`);
    for (const r of g.maps) {
      const x = m.mappings.find((y) => y.issue === r.issue);
      need(!!x, `${m.number}: the migration maps ${r.issue}, which the ledger does not record — an issue the text was not shown to touch`);
      if (!x) continue;
      need(r.weight === x.weight && r.isPrimary === x.isPrimary && r.supportMeaning === x.supportMeaning, `${m.number} × ${r.issue}: weight, primary or polarity differs from the ledger`);
      need(norm(r.rationale) === norm(x.rationale) && r.source === m.textFrom, `${m.number} × ${r.issue}: rationale or source differs from the ledger`);
    }
  }
  // 2 · every mapping pinned to its text, and every pair decided
  const { keys: block } = blockOf(src);
  const lined = meas.flatMap((m) => m.mappings.filter((x) => x.decision === "line").map((x) => [m, x]));
  need(block.length === lined.length, `the CURRENT BILLS block holds ${block.length} lines, the ledger ${lined.length}`);
  for (const k of block) need(lined.some(([, x]) => x.key === k), `${k}: a block line the ledger does not record`);
  const pairs = meas.flatMap((m) => m.mappings.map((x) => `${m.number}|${m.sitting}|${x.issue}`)).sort();
  need(JSON.stringify(pairs) === JSON.stringify([...REVIEWED].sort()), `the ledger's ${pairs.length} pairs are not the ${REVIEWED.size} reviewed pairs`);
  for (const m of meas) {
    need(/^https:\/\/(?:www\.govinfo\.gov|le\.utah\.gov)\//.test(m.textFrom) && /^https:\/\//.test(m.statusFrom) && norm(m.statusPer).length > 30, `${m.number}: no enrolled text or status record`);
    for (const x of m.mappings) {
      need(x.key === `${m.number}|${m.sitting}|${x.issue}`, `${x.key}: the key does not spell its pair`);
      const f = mappingFault(m, x);
      need(f === "", `${x.key}: ${f}`);
      if (x.decision === "line") {
        need(norm(E.map[x.key]) === norm(x.line), `${x.key}: the stored line is not the ledger's`);
        const lf = lineFault(m, x, E.map[x.key], E.map);
        need(lf === "", `${x.key}: ${lf}`);
      } else {
        need(x.decision === "silent" && norm(x.why).length > 30, `${x.key}: silent with no reason`);
        need(!(x.key in E.map) && !(x.key in P.map), `${x.key}: a silent pair carries a line`);
      }
    }
    for (const k of Object.keys(E.map)) if (k.startsWith(`${m.number}|${m.sitting}|`)) need(m.mappings.some((x) => x.key === k && x.decision === "line"), `${k}: a line on a pair the ledger does not write`);
  }

  // 4 · it renders
  const win = boot(src);
  if (win.__err) return out.concat([`boot: ${win.__err}`]);
  const byKey = new Map(meas.flatMap((m) => m.mappings.map((x) => [x.key, x])));
  const seen = new Set();
  for (const leaf of LEAVES) {
    for (const [pair, lists] of rendered(win, leaf).rows) {
      const x = byKey.get(pair);
      if (!x) continue;
      seen.add(pair);
      for (const got of lists) {
        if (x.decision === "line") need(got.length === 1 && got[0] === norm(x.line), `${pair}: prints ${JSON.stringify(got)}, the ledger says ${JSON.stringify(x.line)}`);
        else need(!got.length, `${pair}: a silent pair prints ${JSON.stringify(got[0])}`);
      }
    }
  }
  for (const k of byKey.keys()) need(seen.has(k), `${k}: the fixture's row did not render`);

  // 5 · nothing shipped moved
  if (HEAD_SRC && HEAD_SRC !== src) {
    const hE = mapOf(HEAD_SRC, "_DOS_EFFECT"), hX = mapOf(HEAD_SRC, "_DOS_EXEC_EFFECT"), hM = mapOf(HEAD_SRC, "_DOS_MECH"), hP = mapOf(HEAD_SRC, "_DOS_POINTER");
    const headBlock = new Set(blockOf(HEAD_SRC).keys);
    for (const [k, v] of Object.entries(hE.map)) if (!headBlock.has(k)) need(E.map[k] === v, `${k}: a shipped line changed`);
    for (const k of Object.keys(E.map)) need(k in hE.map || block.includes(k), `${k}: a new line outside the CURRENT BILLS block`);
    need(X.text === hX.text, "_DOS_EXEC_EFFECT changed");
    need(M.text === hM.text, "_DOS_MECH changed");
    need(P.text === hP.text, "_DOS_POINTER changed");
    const cut = (x) => { const a = x.indexOf("    " + MARK); return a < 0 ? x : x.slice(0, a) + x.slice(x.indexOf("\n  };", a) + 1); };
    need(cut(src) === cut(HEAD_SRC), "consistency.js moved outside the CURRENT BILLS block");
    const hWin = boot(HEAD_SRC);
    if (!hWin.__err) for (const leaf of LEAVES) need(sansEffect(rendered(win, leaf).html) === sansEffect(rendered(hWin, leaf).html), `${leaf}: the ledger moved outside its effect rows`);
  }
  return out;
}

const SRC = R("consistency.js"), SQL = R(MIG_PATH);
section("the tree");
{
  const out = check(SRC, SQL, LEDGER);
  ok(out.length === 0, `the tree:\n      ${out.slice(0, 15).join("\n      ")}`);
  const lines = LEDGER.measures.flatMap((m) => m.mappings.filter((x) => x.decision === "line"));
  if (!out.length) console.log(`      ✓ ${LEDGER.measures.length} measures, ${LEDGER.measures.reduce((s, m) => s + m.mappings.length, 0)} mappings, ${lines.length} lines, nothing shipped moved`);
  // The record: the October public laws the ledger names are the six GovInfo
  // records; H.R. 8352 is not law and reads "Would".
  ok(JSON.stringify(LEDGER.octoberPublicLaws.slice().sort()) === JSON.stringify(LEDGER.measures.filter((m) => m.lane === "federal" && m.publicLaw).map((m) => m.number).sort()), "the October public laws are not the ledger's federal enactments");
  const anchor = LEDGER.measures.find((m) => m.number === "H.R. 8352");
  ok(anchor && anchor.status === "passed_senate" && !anchor.publicLaw && /Unanimous Consent/.test(anchor.statusPer), "the anchor is not recorded as passed both chambers and awaiting presentment");
  ok(LEDGER.notEnrolled.length === 3 && LEDGER.notEnrolled.every((n) => /filed/.test(n.lastAction)) && LEDGER.notEnrolled.every((n) => !LEDGER.measures.some((m) => m.number === n.number)), "a Utah data-center bill with no enrolled text was created");
  // Only this migration is new or changed.
  const st = git(["status", "--porcelain", "--", "netlify/database/migrations"]);
  // A later pass may ADD a migration after this one (v392 filed the three
  // notEnrolled bills as rows of their own); none may edit this one or any
  // earlier one, and none may map anything onto those three.
  const LATER = ["20261119000000_vr_utah_2026gs_failed_datacenter_bills.sql"];
  if (st != null) ok(st.trim().split("\n").filter(Boolean).every((l) => l === `?? ${MIG_PATH}` || LATER.some((f) => l === `?? netlify/database/migrations/${f}`)) || st.trim() === "", `another migration was added or edited:\n${st}`);
  ok(readdirSync(join(ROOT, "netlify/database/migrations")).filter((f) => f > MIG_NAME && !LATER.includes(f)).length === 0, "a migration sorts after this one");
  for (const f of LATER) {
    const src = readFileSync(join(ROOT, "netlify/database/migrations", f), "utf8").replace(/^--.*$/gm, "");
    ok(!/\b(vr_measure_issues|vr_rollcalls|vr_member_votes|vr_positions)\b/i.test(src), `${f} maps, votes or positions something`);
  }
  // Published: bill pages and sitemap.
  const docs = (() => { const d = JSON.parse(R("db/bill-docs.json")); return d.docs || d; })();
  const sitemap = R("sitemap.xml");
  for (const m of LEDGER.measures) {
    const d = docs[`${m.sitting}|${m.number}`];
    ok(!!d && d.t === m.title, `${m.number}: no bill page, or the wrong title`);
    for (const x of m.mappings) {
      const e = d && (d.m || []).find((y) => y.k === x.issue);
      ok(!!e && (x.decision === "line" ? e.l === x.line : !e.l), `${x.key}: the bill page does not carry the issue, or carries the wrong line`);
    }
    if (!m.mappings.length) ok(!d || !d.m, `${m.number}: an unmapped measure's bill page names issues`);
    ok(sitemap.includes(`/b/${m.sitting}/${encodeURIComponent(m.number)}<`), `${m.number}: not in the sitemap`);
  }
  const sw = R("sw.js");
  ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 391 && sw.includes("// v391 - CURRENT BILLS, FULL LENS."), "the shell moved to v391 or later, with the v391 note");
}

section("mutations");
{
  const clone = () => JSON.parse(JSON.stringify(LEDGER));
  const swapS = (from, to) => { must(SRC.includes(from), `anchor missing: ${from.slice(0, 60)}`); return SRC.split(from).join(to); };
  const swapQ = (from, to) => { must(SQL.includes(from), `sql anchor missing: ${from.slice(0, 60)}`); return SQL.split(from).join(to); };
  const L = (n, i) => LEDGER.measures.find((m) => m.number === n).mappings.find((x) => x.issue === i).line;
  const q = (s) => `'${s}'`;
  const WATER = L("H.B. 76", "datacenter_water"), GROW = L("H.B. 507", "datacenter_growth"), ANCHOR = L("H.R. 8352", "justice_balance");
  const SHIPPED = mapOf(SRC, "_DOS_EFFECT").map["S.B. 181|2025GS|housing"];
  const inj = (k, line) => swapS(`    'H.R. 8352|119|justice_balance':`, `    '${k}':\n      '${line}',\n    'H.R. 8352|119|justice_balance':`);
  const invent = clone(); invent.measures.find((m) => m.number === "H.R. 8352").mappings.push({ ...invent.measures.find((m) => m.number === "H.R. 8352").mappings[1], issue: "lgbtq_rights", key: "H.R. 8352|119|lgbtq_rights", touches: { "exchange such records and information": "transgender" } });
  const inventSql = swapQ("                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN", "                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN\n    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,\n      support_meaning, rationale, source_url)\n    VALUES (m_id, 'lgbtq_rights', 30, false,\n      'yea_supports', 'Invented.', 'https://example.org');\n  END IF;\n  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues\n                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN");
  const drift = swapQ("VALUES (m_id, 'datacenter_growth', 75, false,\n      'yea_opposes'", "VALUES (m_id, 'datacenter_growth', 75, false,\n      'yea_supports'");
  const muts = [
    ["a line broader than its bill", swapS(q(WATER), q(WATER.replace("new large data centers", "data centers")))],
    ["a dropped qualifier", swapS(q(GROW), q(GROW.replace(", with exceptions", "")))],
    ["a method word", swapS(q(ANCHOR), q(ANCHOR.replace(/^Would let/, "Would be coded to let")))],
    ["a tense flip", swapS(q(ANCHOR), q(ANCHOR.replace(/^Would let/, "Let")))],
    ["a line duplicating a sibling", inj("H.B. 507|2026GS|lower_taxes", "Let counties levy an energy excise tax of up to 6% on large load customers on unincorporated land.")],
    ["a line on an unmapped measure", inj("S. 283|119|econ_trade", "Required a standard method to identify the country of origin of seafood.")],
    ["an edited shipped line", swapS(q(SHIPPED), q(SHIPPED.replace("Barred", "Stopped")))],
  ];
  for (const [name, src] of muts) ok(check(src, SQL, LEDGER).length > 0, `mutation "${name}" was not caught`);
  ok(check(SRC, inventSql, LEDGER).length > 0, `mutation "an invented issue row in the migration" was not caught`);
  ok(check(SRC, SQL, invent).length > 0, `mutation "an invented issue in the ledger" was not caught`);
  ok(check(SRC, drift, LEDGER).length > 0, `mutation "a polarity drifting from the ledger" was not caught`);
  console.log(`      ✓ ${muts.length + 3} mutations run`);
}

section("the rules on their own");
{
  const E0 = mapOf(SRC, "_DOS_EFFECT").map;
  const m = (n) => LEDGER.measures.find((x) => x.number === n);
  const x = (n, i) => m(n).mappings.find((y) => y.issue === i);
  const W = x("H.B. 76", "datacenter_water"), G = x("H.B. 507", "datacenter_growth"), A = x("H.R. 8352", "justice_balance"), Y = x("S. 240", "enviro_energy");
  const cases = [
    [m("H.B. 76"), W, W.line.replace("new large data centers", "every data center"), /broader|qualifier|term/],
    [m("H.B. 507"), G, G.line.replace(", with exceptions", ""), /qualifier/],
    [m("H.R. 8352"), A, A.line.replace(/^Would let/, "Let"), /not law/],
    [m("H.R. 8352"), A, A.line.replace(/^Would let/, "Would be coded to let"), /method word/],
    [m("S. 240"), Y, Y.line.replace(" absent substantial construction", ""), /qualifier/],
    [m("S. 240"), Y, Y.line.replace("20 years", "30 years"), /term|broader/],
    [m("H.B. 507"), { ...x("H.B. 507", "lower_taxes"), line: "x" }, "Let counties levy an energy excise tax of up to 6% on large load customers on unincorporated land.", /duplicates/],
  ];
  for (const [mm, xx, line, want] of cases) {
    const f = lineFault(mm, { ...xx, line }, line, { ...E0, [xx.key]: line });
    ok(want.test(f), `lineFault let ${JSON.stringify(line.slice(0, 60))} through (said ${JSON.stringify(f)})`);
  }
  const mcases = [
    [{ ...A, issue: "lgbtq_rights", touches: { training: "transgender" } }, /not a reviewed pair/],
    [{ ...A, touches: { training: "nuclear" } }, /does not touch/],
    [{ ...A, touches: { "a phrase the bill never says": "training" } }, /not in the quoted text/],
    [{ ...A, issue: "not_a_key" }, /allow-listed/],
  ];
  for (const [xx, want] of mcases) {
    const f = mappingFault(m("H.R. 8352"), xx);
    ok(want.test(f), `mappingFault let ${xx.issue} through (said ${JSON.stringify(f)})`);
  }
  console.log(`      ✓ ${cases.length + mcases.length} bad lines and mappings refused by the rules alone`);
}

console.log(`\n${failures.length ? "✗" : "✓"} current bills: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
