#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-war-powers-same-text.mjs — the Iran withdrawal resolution, voted on
// eleven times, and H.Con.Res. 89: every topic mapped, every line short, every
// vote listed, and a senator's position counted once per text
// ─────────────────────────────────────────────────────────────────────────────
// 20261127000000_vr_iran_withdrawal_same_text_family.sql maps the seven repeat
// votes (S.J.Res. 118, 116, 123, 114, 172, 180, 181) to the four topics their
// counted siblings carry, with no primary. db/vr-text-families.json names the
// eleven as one text. What must stay true:
//
//   1. NOTHING ALREADY FILED MOVED. The counted siblings (S.J.Res. 104, 184,
//      163, 185) and H.Con.Res. 89 keep their seed rows; every shipped effect
//      line is as at HEAD; the migration writes only vr_measure_issues; no
//      issue key is added.
//   2. THE MAPPINGS. Each of the seven carries restraint 100, war_powers 70,
//      strong_defense 55 (a yea cuts against it) and iran_policy 100 — the
//      counted siblings' weights and polarities — with is_primary false on all
//      four, in the migration and the seed alike. H.Con.Res. 89 still carries
//      war_powers. The family is the F7 census's eleven, the counted four are
//      the ones F7 mapped.
//   3. THE LINE RULE, on the 29 new lines (seven × four, and H.Con.Res. 89 ×
//      Peace Through Strength): one sentence, ≤140 characters, the act as
//      subject in the failed act's tense, no method word, no ellipsis, never
//      the title, ending on the measure's own recorded tally, and worded as the
//      counted sibling words the same pair.
//   4. ONE POSITION PER TEXT. Every repeat vote in the corpus is held out of
//      the scored list (F7's diff: none records a new position), and every
//      senator's issue row on all four topics is exactly what it is without
//      the seven. A repeat that is a member's only record of a position counts,
//      once, and prints its line in the drawer.
//   5. THE BILL PAGES. All eight list their topics with the short line under
//      each chip and the right direction chip; each of the eleven family pages
//      carries History (every vote, this one marked, the rest linked) and
//      Related (not the same text, sharing two or more topics).
//   6. THE DRAWERS. Every senator who voted on the text sees, on each of the
//      four topics, the ledger rows they had (no extra rows) and a History
//      section listing all eleven votes with their own vote on each, and
//      Related. Every House voter on H.Con.Res. 89 sees its Peace Through
//      Strength line.
//   7. SEARCH. Each measure is found by its number and by its sponsor with the
//      topic; the topical queries return the family and H.Con.Res. 89; the
//      Legislation library carries all eight cards.
//   8. MUTATIONS. An over-long line, two sentences, a method word, a title
//      fallback, a flipped direction, a primary on a repeat, a changed weight,
//      the hold switched off, and History dropped from the drawer or the page
//      must each fail.
//
//   node scripts/test-war-powers-same-text.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
const must = (c, m) => { if (c) return; console.error(`✗ war powers same text: STALE HARNESS — ${m}`); process.exit(2); };
const gitShow = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

const REPEATS = [118, 116, 123, 114, 172, 180, 181].map((n) => `S.J.Res. ${n}`);
const COUNTED = [104, 184, 163, 185].map((n) => `S.J.Res. ${n}`);
const FAMILY = ["S.J.Res. 104", "S.J.Res. 118", "S.J.Res. 116", "S.J.Res. 123", "S.J.Res. 114", "S.J.Res. 184", "S.J.Res. 163", "S.J.Res. 185", "S.J.Res. 172", "S.J.Res. 180", "S.J.Res. 181"];
const HCR = "H.Con.Res. 89";
const EIGHT = [HCR, ...REPEATS];
const SHAPE = { restraint: [100, "yea_supports"], war_powers: [70, "yea_supports"], strong_defense: [55, "yea_opposes"], iran_policy: [100, "yea_supports"] };
const KEYS = Object.keys(SHAPE);
const FID = "iran-withdrawal-119";
const SPONSOR = { "S.J.Res. 114": "baldwin", "S.J.Res. 116": "murphy", "S.J.Res. 118": "booker", "S.J.Res. 123": "duckworth",
  "S.J.Res. 172": "warnock", "S.J.Res. 180": "van hollen", "S.J.Res. 181": "gillibrand", [HCR]: "jayapal" };
const MIG_NAME = "20261127000000_vr_iran_withdrawal_same_text_family.sql";
const SQL = R(`netlify/database/migrations/${MIG_NAME}`);
const stripComments = (s) => s.replace(/^\s*--.*$/gm, "");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const OFFICIAL = R("bill-official.json");
const OFF = JSON.parse(OFFICIAL);
const RECORDS = JSON.parse(R("db/bill-record.json")).records;
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures;
const FAMFILE = JSON.parse(R("db/vr-text-families.json"));
const seedOf = (n, seed = SEED) => seed.find((m) => m.number === n && m.congress === 119);
const tableOf = (src, name) => {
  const at = src.indexOf(`var ${name} = {`), end = src.indexOf("\n  };", at);
  return vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")");
};
const CONS = R("consistency.js"), VRJS = R("voting-record.js");
const E = tableOf(CONS, "_DOS_EFFECT");
const lineOf = (n, k) => E[`${n}|119|${k}`] || "";
const BLOCK = sliceBlocks(CONS, "_DOS_EFFECT").find((b) => b.version === 407);
must(BLOCK, "consistency.js carries the IRAN WITHDRAWAL SAME-TEXT SLICE 27 (v407) block");
const NEW_PAIRS = REPEATS.flatMap((n) => KEYS.map((k) => `${n}|119|${k}`));
// H.Con.Res. 89 × Peace Through Strength is a recorded silence (blank rows slice
// 10, and the body, coverage and distinct ledgers after it): its one effect is
// what the act's restraint and Iran lines already say. It stays silent.
const SILENT = [`${HCR}|119|strong_defense`];

// ── the checks, as functions, so section 8 can feed them bad input ──────────
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|direction match|pole|this bill|this resolution)\b|PolitiDex|…|\.\.\./i;
const RUNTIME_METHOD = (() => {
  const m = /var _DOS_EFFECT_METHOD = (\/.*\/i);/.exec(CONS);
  must(m, "consistency.js still declares _DOS_EFFECT_METHOD");
  return vm.runInNewContext(m[1]);
})();
// The tally the record holds for the measure's own floor vote.
function recordedEnding(n) {
  const acts = (RECORDS[`119|${n}`] || { a: [] }).a.map((a) => a.x).join(" ");
  if (n === HCR) {
    const m = /Agreed to by the Yeas and Nays: (\d+) - (\d+) \(Roll no\. 282\)/.exec(acts);
    return m ? `the House agreed to it ${m[1]}-${m[2]}.` : null;
  }
  const m = /Motion to discharge .*? rejected by Yea-Nay Vote\. (\d+) - (\d+)\./.exec(acts);
  return m ? `the Senate refused to discharge it ${m[1]}-${m[2]}.` : null;
}
function lineFault(s, n) {
  if (typeof s !== "string" || !s) return "no line";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on its stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  if (METHOD.test(s) || RUNTIME_METHOD.test(s)) return "a method word";
  const title = (DOCS[`119|${n}`] || {}).t || "";
  if (title && s.toLowerCase().includes(title.toLowerCase().replace(/\.$/, ""))) return "the measure's title";
  if (/^(?:This|The (?:bill|resolution)|It)\b/.test(s)) return "the act is not the subject";
  if (!/^Would\b/.test(s)) return "a failed act does not open \"Would\"";
  const end = recordedEnding(n);
  if (!end || !s.endsWith(end)) return "not ending on the measure's recorded tally";
  return "";
}
// The seven's rows as the migration writes them.
function migrationRows(sql) {
  const out = [];
  const body = stripComments(sql);
  for (const blk of body.split(/\nDO \$\$/).slice(1)) {
    const num = (/AND number = '(S\.J\.Res\. \d+)'\s+LIMIT 1;/.exec(blk) || [])[1];
    if (!num) continue;
    for (const m of blk.matchAll(/\(m_id, '([a-z_]+)', (\d+), (true|false), '(yea_\w+)',/g)) out.push({ num, k: m[1], w: +m[2], p: m[3] === "true", s: m[4] });
  }
  return out;
}
function mappingFault(sql, seed = SEED) {
  const out = [], body = stripComments(sql), rows = migrationRows(sql);
  if (/\bUPDATE\b|\bDELETE\b/i.test(body)) out.push("updates or deletes");
  if (/INSERT INTO vr_(?:measures|rollcalls|member_votes|positions|measure_provisions|measure_actions)\b/i.test(body)) out.push("writes a table other than vr_measure_issues");
  if ((body.match(/ON CONFLICT \(measure_id, issue_key\) DO NOTHING;/g) || []).length !== REPEATS.length || /DO UPDATE/i.test(body)) out.push("the rows are not each ON CONFLICT DO NOTHING");
  for (const n of REPEATS) {
    const mine = rows.filter((r) => r.num === n);
    if (mine.length !== KEYS.length) out.push(`${n}: ${mine.length} rows`);
    for (const r of mine) {
      const want = SHAPE[r.k];
      if (!want) { out.push(`${n}: ${r.k} is not one of the four topics`); continue; }
      if (r.w !== want[0] || r.s !== want[1]) out.push(`${n} ${r.k} reads ${r.w} ${r.s}`);
      if (r.p) out.push(`${n} ${r.k} is a primary; a repeat names none`);
    }
    // Migration-only, as H.R. 6644's and H.R. 1's later rows are: the seed
    // corpus keeps the seven unmapped, which the pack fixtures and every suite
    // that boots HEAD's engine against it pin.
    if (seedOf(n, seed)) out.push(`${n}: the seed carries it; its rows are the migration's`);
  }
  // The same weight and polarity as every counted sibling.
  for (const n of COUNTED) for (const i of seedOf(n, seed).issues) {
    const want = SHAPE[i.issueKey];
    if (!want || want[0] !== i.weight || want[1] !== i.supportMeaning) out.push(`${n} ${i.issueKey}: the counted sibling reads ${i.weight} ${i.supportMeaning}`);
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing already filed moved");
// ═════════════════════════════════════════════════════════════════════════════
ok(/^-- pack-generation: derived\b/m.test(SQL), "the migration declares its pack step");
{
  const head = gitShow("db/vr-issue-seed.json"), headCons = gitShow("consistency.js");
  if (head === null || headCons === null) console.log("      (no git baseline)");
  else {
    const HS = JSON.parse(head).measures;
    for (const n of [...COUNTED, HCR, "S.J.Res. 59"]) eq(JSON.stringify(seedOf(n)), JSON.stringify(seedOf(n, HS)), `seed: ${n} is byte-identical to HEAD`);
    const HE = tableOf(headCons, "_DOS_EFFECT");
    for (const [k, v] of Object.entries(HE)) if (E[k] !== v) ok(false, `effect line ${k} changed`);
    ok(gitShow("issue-map.js") === R("issue-map.js"), "issue-map.js is unchanged: no new issue key");
    ok(gitShow("db/issue-keys.json") === R("db/issue-keys.json"), "db/issue-keys.json is unchanged");
    ok(JSON.stringify(tableOf(CONS, "_DOS_MECH")) === JSON.stringify(tableOf(headCons, "_DOS_MECH")), "_DOS_MECH is unchanged");
  }
  eq(JSON.stringify([...BLOCK.keys].sort()), JSON.stringify([...NEW_PAIRS].sort()), "the slice block holds exactly the 28 new lines");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the mappings");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(JSON.stringify(mappingFault(SQL)), "[]", "the seven carry the four topics at the counted siblings' weights and polarities, none primary, in the migration (and not in the seed)");
  const A = measureAddresses(ROOT).published;
  for (const n of [...REPEATS, ...COUNTED]) {
    const a = A.find((x) => x.sitting === "119" && x.number === n);
    eq(a && JSON.stringify([...a.issues].sort()), JSON.stringify([...KEYS].sort()), `${n}: the applied migrations resolve to the four topics`);
  }
  const h = A.find((x) => x.sitting === "119" && x.number === HCR);
  ok(h && h.issues.has("war_powers"), "H.Con.Res. 89: its war_powers mapping is on file");
  eq(h && JSON.stringify([...h.issues].sort()), JSON.stringify([...KEYS].sort()), "H.Con.Res. 89: the same four topics");
  for (const n of COUNTED) eq(seedOf(n).issues.filter((i) => i.isPrimary).map((i) => i.issueKey).join(","), "restraint", `${n}: its primary is still restraint`);
  // The family is the F7 census, and the counted four are the ones F7 mapped.
  const f7 = JSON.parse(R("db/vr-federal-mapping-seed-f7.json"));
  const census = [];
  (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === "object") { if (o.roll && o.decision && /S\.J\.Res\./.test(o.measure || "")) census.push(o); Object.values(o).forEach(walk); } })(f7);
  const iran = census.filter((c) => FAMILY.includes(c.measure));
  eq(iran.length, FAMILY.length, "the F7 census lists all eleven votes on the text");
  const fam = FAMFILE.families.find((x) => x.id === FID);
  eq(JSON.stringify(fam.members.map((m) => m.number)), JSON.stringify(FAMILY), "db/vr-text-families.json lists the eleven, in vote order");
  for (const m of fam.members) {
    const c = iran.find((x) => x.measure === m.number);
    eq(m.counted, /^MAPPED/.test(c.decision), `${m.number}: counted is ${m.counted}, as F7 decided`);
  }
  for (const n of REPEATS) ok(iran.find((c) => c.measure === n).newJudgedPairs === 0, `${n}: F7 recorded no new position on it`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the line rule, on the 28 new lines");
// ═════════════════════════════════════════════════════════════════════════════
for (const pair of NEW_PAIRS) {
  const [n, , k] = pair.split("|");
  eq(lineFault(E[pair], n), "", `${pair}: "${E[pair]}" (${(E[pair] || "").length})`);
  if (n !== HCR) eq(E[pair].replace(/ \d+-\d+\.$/, ""), lineOf("S.J.Res. 104", k).replace(/ \d+-\d+\.$/, ""), `${pair}: worded as S.J.Res. 104 words the same pair`);
}
{
  for (const p of SILENT) {
    ok(!(p in E), `${p}: stays silent, as the ledgers record`);
    const ledgers = ["db/vr-blank-rows-slice10.json", "db/vr-effect-distinct-lines.json"].filter((f) => R(f).includes(p));
    eq(ledgers.length, 2, `${p}: the silence is still recorded in the ledgers`);
  }
  for (const k of ["restraint", "war_powers", "iran_policy"]) ok(lineOf(HCR, k).length > 0 && lineOf(HCR, k).length <= 140, `H.Con.Res. 89 ${k}: prints its short line`);
  ok(/War Powers Resolution/.test(lineOf(HCR, "war_powers")), "H.Con.Res. 89 war_powers: its line is the War Powers Resolution line");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · one position per text");
// ═════════════════════════════════════════════════════════════════════════════
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const onText = (it, list) => it && it.kind === "vote" && it.congress === 119 && list.includes(it.number);
const corpus = (() => {
  // The seven's rows are migration-only, so the seed corpus drops their votes
  // (no mapping, no issue row). The API's join is replayed instead: the corpus
  // is built over a db/ view whose issue seed adds the rows the migration writes.
  const dir = mkdtempSync(join(tmpdir(), "wp-same-text-"));
  mkdirSync(join(dir, "db"));
  for (const f of readdirSync(join(ROOT, "db"))) if (f !== "vr-issue-seed.json") symlinkSync(join(ROOT, "db", f), join(dir, "db", f));
  const seed = JSON.parse(R("db/vr-issue-seed.json"));
  const rows = migrationRows(SQL);
  for (const n of REPEATS) seed.measures.push({ measureType: "resolution", congress: 119, chamber: "senate", number: n,
    issues: rows.filter((r) => r.num === n).map((r) => ({ issueKey: r.k, weight: r.w, isPrimary: r.p, supportMeaning: r.s, rationale: "" })) });
  writeFileSync(join(dir, "db", "vr-issue-seed.json"), JSON.stringify(seed));
  return buildCorpus(dir);
})();
function bootFiles({ cons = CONS, vr = VRJS } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? cons : f === "voting-record.js" ? vr : R(f), ctx, { filename: f }); }
    catch (e) { must(false, `${f} boots: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  must(win.PDXConsistency && win.PDXVotingRecord && typeof win.PDXVotingRecord.memberRepeats === "function", "the record client exposes memberRepeats");
  return win;
}
const VOTERS = [...corpus.byMember].filter(([, items]) => items.some((it) => onText(it, REPEATS))).map(([pid]) => pid);
must(VOTERS.length >= 90, `the corpus holds the senators who voted on the repeats (${VOTERS.length})`);
{
  const nRep = VOTERS.reduce((a, p) => a + corpus.byMember.get(p).filter((it) => onText(it, REPEATS)).length, 0);
  must(nRep >= 600, `the corpus carries the repeat votes with their topics (${nRep})`);
}
// The row model, reduced to what a score is made of.
const sig = (win, pid, k) => {
  let r = null; try { r = win.PDXConsistency.issueRow(pid, k); } catch (e) { r = { err: String(e) }; }
  return JSON.stringify(r, (key, v) => (typeof v === "function" ? undefined : v));
};
function scoreFaults(winNow, winBase, pids, keys = KEYS) {
  const out = [];
  for (const pid of pids) {
    const items = corpus.byMember.get(pid);
    winNow.PDXVotingRecord.noteMember(pid, items);
    winBase.PDXVotingRecord.noteMember(pid, items.filter((it) => !onText(it, REPEATS)));
    for (const k of keys) if (sig(winNow, pid, k) !== sig(winBase, pid, k)) out.push(`${pid} ${k}: the issue row moved`);
    // And the whole profile: every issue row and the overall verdict.
    const whole = (w) => { try { return JSON.stringify([w.PDXConsistency.issueRows(pid), w.PDXConsistency.overallVerdict(pid)], (kk, v) => (typeof v === "function" ? undefined : v)); } catch (e) { return String(e); } };
    if (whole(winNow) !== whole(winBase)) out.push(`${pid}: the profile's issue rows or overall verdict moved`);
  }
  return out;
}
const NOW = bootFiles(), BASE = bootFiles();
{
  let held = 0, kept = 0;
  for (const pid of VOTERS) {
    NOW.PDXVotingRecord.noteMember(pid, corpus.byMember.get(pid));
    held += NOW.PDXVotingRecord.memberRepeats(pid).filter((it) => onText(it, REPEATS)).length;
    kept += NOW.PDXVotingRecord.memberRecords(pid).filter((it) => onText(it, REPEATS)).length;
  }
  eq(kept, 0, "no repeat vote in the corpus reaches a scored list — none records a new position");
  ok(held >= 600, `every repeat vote is held for the History section (${held})`);
  eq(JSON.stringify(scoreFaults(NOW, BASE, VOTERS).slice(0, 5)), "[]", `on all ${VOTERS.length} senators and all four topics, the issue row is exactly what it is without the seven`);
}
// A repeat that is a member's only record of a position counts — once.
const LONE = (() => {
  const pid = VOTERS.find((p) => { const it = corpus.byMember.get(p); return it.filter((x) => onText(x, COUNTED)).every((x) => x.position === "nay") && it.some((x) => onText(x, REPEATS) && x.position === "nay"); });
  must(pid, "a senator who voted nay on every counted vote");
  const items = corpus.byMember.get(pid).map((x) => ({ ...x }));
  const flips = items.filter((x) => onText(x, REPEATS) && x.position === "nay").slice(0, 2);
  for (const x of flips) x.position = "yea";
  return { pid, items, first: flips[0].number, second: flips[1] && flips[1].number };
})();
{
  NOW.PDXVotingRecord.noteMember(LONE.pid, LONE.items);
  const kept = NOW.PDXVotingRecord.memberRecords(LONE.pid).filter((it) => onText(it, REPEATS));
  eq(JSON.stringify(kept.map((x) => x.number + ":" + x.position)), JSON.stringify([`${LONE.first}:yea`]), "a repeat that is the only record of a yea counts, and only the first such vote");
  const rows = (NOW.PDXConsistency.dossierItems(LONE.pid, "restraint") || []).filter((r) => r.ident === LONE.first);
  ok(rows.length === 1 && rows[0].effLine === lineOf(LONE.first, "restraint"), `${LONE.first}: the counted repeat prints its own short line in the drawer`);
  NOW.PDXVotingRecord.noteMember(LONE.pid, corpus.byMember.get(LONE.pid));
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the bill pages");
// ═════════════════════════════════════════════════════════════════════════════
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
{
  for (const f of ["gen-bill-docs.mjs", "gen-same-text.mjs", "gen-bill-pages.mjs"]) {
    let fresh = true;
    try { execFileSync(process.execPath, [join(ROOT, "scripts", f), "--check"], { stdio: "pipe" }); } catch { fresh = false; }
    ok(fresh, `${f} output is current`);
  }
  for (const n of EIGHT) {
    const D = DOCS[`119|${n}`];
    ok(!!D, `${n} has a bill document`);
    if (!D) continue;
    eq(JSON.stringify(D.m.map((m) => m.k).sort()), JSON.stringify([...KEYS].sort()), `${n}: the page lists the four topics`);
    for (const k of KEYS) {
      if (SILENT.includes(`${n}|119|${k}`)) { ok(D.m.some((m) => m.k === k && !m.l), `${n} ${k}: the page lists the topic with no line`); continue; }
      ok(D.m.some((m) => m.k === k && m.l === lineOf(n, k)), `${n} ${k}: the page prints its short line`);
      eq((OFF.effects[`119|${n}`] || {})[k] || "", lineOf(n, k), `${n} ${k}: bill-official.json carries the same line`);
    }
    eq(D.st, "failed", `${n}: the page says it failed`);
  }
  const fam = OFF.same.families[FID];
  ok(fam && JSON.stringify(fam.members.map((m) => m.number)) === JSON.stringify(FAMILY), "bill-official.json's `same` lists the eleven");
  for (const m of fam.members) {
    ok(m.votes.length > 0 && m.votes.every((v) => RECORDS[m.key].a.some((a) => a.d === v.date && a.x.includes(v.tally.replace("-", " - ")))), `${m.number}: each History vote is the record's own date and tally`);
    eq(m.href, `/b/119/${encodeURIComponent(m.number)}`, `${m.number}: its door is its bill page`);
  }
  for (const r of fam.related) {
    ok(!FAMILY.includes(r.number) && r.shared.length >= 2, `Related ${r.number}: not the same text, shares ${r.shared.length} topics`);
    ok(!!DOCS[r.key], `Related ${r.number}: has a bill page`);
  }
  ok(fam.related.some((r) => r.number === HCR) && fam.related.some((r) => r.number === "S.J.Res. 59"), "Related names H.Con.Res. 89 and S.J.Res. 59");
}
const BILL_HTML = R("bill.html"), BD_SRC = R("bill-detail.js");
const DOC_SCRIPTS = [...BILL_HTML.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
const ORIGIN = "https://politidex.fyi";
async function panel(n, { official = OFFICIAL, bd = BD_SRC } = {}) {
  const win = makeSandbox();
  win.__PDX_BILL_DOC = true;
  const p = "/b/119/" + encodeURIComponent(n);
  win.location = { href: ORIGIN + p, pathname: p, search: "", hash: "", origin: ORIGIN };
  const capture = { innerHTML: "", scrollTop: 0 };
  // The seam host scripts/test-bill-official-panel.mjs uses: the panel fills
  // [data-bd-official-seam] inside the scroll once bill-official.json lands.
  capture.querySelector = (sel) => (sel === "[data-bd-official-seam]" && /data-bd-official-seam/.test(capture.innerHTML) ? {} : null);
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.document.querySelector = (sel) => {
    if (sel !== "#pdx-bd-scroll [data-bd-official-seam]") return null;
    const m = /<div class="bd-official-seam" data-bd-official-seam><\/div>/.exec(capture.innerHTML);
    return m ? { childNodes: [], querySelectorAll: () => [],
      set innerHTML(h) { capture.innerHTML = capture.innerHTML.replace(m[0], `<div class="bd-official-seam" data-bd-official-seam>${h}</div>`); } } : null;
  };
  win.history = { replaceState() {}, pushState() {} };
  win.fetch = (u) => String(u) === "/bill-official.json"
    ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(official)) })
    : Promise.reject(new Error("offline"));
  const ctx = vm.createContext(win);
  for (const f of DOC_SCRIPTS) vm.runInContext(f === "bill-detail.js" ? bd : R(f), ctx, { filename: f });
  const issues = (seedOf(n) || { issues: [] }).issues.length === KEYS.length ? seedOf(n).issues
    : KEYS.map((k) => ({ issueKey: k, supportMeaning: SHAPE[k][1], rationale: "" }));
  const data = {
    measure: { id: 50000 + Number(n.replace(/\D/g, "")), number: n, congress: 119, chamber: n === HCR ? "house" : "senate", status: "failed", title: DOCS[`119|${n}`].t },
    issues: issues.map((i) => ({ issueKey: i.issueKey, supportMeaning: i.supportMeaning, rationale: i.rationale })),
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
function panelFaults(html, n) {
  const out = [], rows = panelRows(html);
  if (rows.length !== KEYS.length) out.push(`${rows.length} topic rows`);
  for (const r of rows) {
    const k = (/data-issue="([^"]+)"/.exec(r) || [])[1];
    const eff = unescape((/<div class="bd-omni-eff" data-bd-eff-for="[^"]+">([^<]*)<\/div>/.exec(r) || [])[1] || "");
    if (eff !== lineOf(n, k)) out.push(`${k}: the default text under the chip is not its short line`);
    if (NEW_PAIRS.includes(`${n}|119|${k}`) && lineFault(eff, n)) out.push(`${k}: the default text breaks the line rule (${lineFault(eff, n)})`);
    const opp = /A Yea cuts against this/.test(r), adv = /A Yea advances this/.test(r);
    if ((SHAPE[k][1] === "yea_opposes") !== opp || opp === adv) out.push(`${k}: the direction chip is wrong`);
    const shut = r.replace(/<details\b(?![^>]*\bopen\b)[^>]*>[\s\S]*?<\/details>/g, "");
    if (/bd-omni-why/.test(shut)) out.push(`${k}: the longer text is visible by default`);
  }
  if (FAMILY.includes(n)) {
    const hist = (/<ol class="bd-off-steps" data-bd-same-history>([\s\S]*?)<\/ol>/.exec(html) || [])[1] || "";
    const items = [...hist.matchAll(/<li data-bd-same-m="119\|([^"]+)"( data-self="1")?>([\s\S]*?)<\/li>/g)];
    if (items.length !== FAMILY.length) out.push(`History lists ${items.length} votes`);
    for (const [, num, self, body] of items) {
      if ((num === n) !== !!self) out.push(`History: ${num} self-mark is wrong`);
      if (num !== n && !body.includes(`href="/b/119/${encodeURIComponent(num)}"`)) out.push(`History: ${num} has no door`);
      if (!/\(failed\)/.test(body)) out.push(`History: ${num} has no outcome`);
    }
    if (!/data-bd-same-related/.test(html) || /data-bd-same-r="119\|S\.J\.Res\. (?:104|1[0-9]{2})"/.test(html.replace(/data-bd-same-r="119\|S\.J\.Res\. 59"/, ""))) {
      if (!/data-bd-same-related/.test(html)) out.push("no Related section");
    }
    for (const fm of FAMILY) if (new RegExp(`data-bd-same-r="119\\|${fm.replace(/\./g, "\\.")}"`).test(html)) out.push(`Related lists ${fm}, which is the same text`);
  } else if (/data-bd-same/.test(html)) out.push("a measure in no family prints a same-text section");
  return out;
}
const PANELS = {};
for (const n of [...EIGHT, ...COUNTED]) {
  PANELS[n] = await panel(n);
  must(PANELS[n].includes(n), `the ${n} panel rendered`);
  eq(JSON.stringify(panelFaults(PANELS[n], n)), "[]", `${n}: every topic chip carries its short line and direction${FAMILY.includes(n) ? ", with History and Related" : ""}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the drawers");
// ═════════════════════════════════════════════════════════════════════════════
const POS = { yea: "Voted Yea", nay: "Voted Nay", not_voting: "Did not vote", present: "Voted Present" };
function drawerFaults(win, pids, keys = KEYS) {
  const CS = win.PDXConsistency, out = [];
  for (const pid of pids) {
    const items = corpus.byMember.get(pid);
    win.PDXVotingRecord.noteMember(pid, items);
    const mine = {};
    for (const it of items) if (onText(it, FAMILY)) mine[it.number] = it.position;
    for (const k of keys) {
      const rows = (CS.dossierItems(pid, k) || []).filter((r) => FAMILY.includes(r.ident));
      if (rows.some((r) => REPEATS.includes(r.ident))) out.push(`${pid} ${k}: a repeat vote is a ledger row`);
      const html = CS.gapViewHtml(pid, k) || "";
      const sec = (/<div class="pdxst" data-pdxst="iran-withdrawal-119">([\s\S]*?)<\/ul><\/div>/.exec(html) || [])[1] || "";
      if (!sec) { out.push(`${pid} ${k}: no History section`); continue; }
      const hist = (/<ul data-pdxst-history="1">([\s\S]*?)<\/ul>/.exec(sec) || [])[1] || "";
      for (const fm of FAMILY) {
        const li = (new RegExp(`<li data-pdxst-m="119\\|${fm.replace(/\./g, "\\.")}">([\\s\\S]*?)</li>`).exec(hist) || [])[1];
        if (!li) { out.push(`${pid} ${k}: History lacks ${fm}`); continue; }
        if (!li.includes(`href="/b/119/${encodeURIComponent(fm)}"`)) out.push(`${pid} ${k}: ${fm} has no door`);
        if (mine[fm] && !li.includes(POS[mine[fm]])) out.push(`${pid} ${k}: ${fm} does not show their vote`);
      }
      if (!/data-pdxst-related="1"/.test(sec) || !/data-pdxst-r="119\|H\.Con\.Res\. 89"/.test(sec)) out.push(`${pid} ${k}: no Related section naming H.Con.Res. 89`);
    }
  }
  return out;
}
{
  eq(JSON.stringify(drawerFaults(NOW, VOTERS).slice(0, 6)), "[]", `on all ${VOTERS.length} senators' four topic drawers: no extra rows, every vote in History with their own, and Related`);
  const off = [...corpus.byMember.keys()].find((p) => !corpus.byMember.get(p).some((it) => onText(it, FAMILY)) && corpus.byMember.get(p).some((it) => (it.issues || []).some((i) => i.issueKey === "restraint")));
  NOW.PDXVotingRecord.noteMember(off, corpus.byMember.get(off));
  ok(!/data-pdxst=/.test(NOW.PDXConsistency.gapViewHtml(off, "restraint") || ""), `${off}, who never voted on the text, sees no History section`);
  const house = [...corpus.byMember].filter(([, items]) => items.some((it) => it.number === HCR && it.congress === 119 && /^(?:yea|nay)$/.test(it.position))).map(([p]) => p);
  must(house.length >= 50, `the corpus holds H.Con.Res. 89's House voters (${house.length})`);
  const bad = [];
  for (const pid of house) {
    NOW.PDXVotingRecord.noteMember(pid, corpus.byMember.get(pid));
    const rows = (NOW.PDXConsistency.dossierItems(pid, "restraint") || []).filter((r) => r.ident === HCR);
    if (!rows.length || rows.some((r) => r.effLine !== lineOf(HCR, "restraint"))) bad.push(pid);
  }
  eq(JSON.stringify(bad.slice(0, 5)), "[]", `on all ${house.length} House voters' Diplomacy & Restraint drawers, H.Con.Res. 89 prints its Diplomacy & Restraint line`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · search");
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
for (const n of EIGHT) {
  const row = ROWS.find((r) => r[0] === "119" && r[1] === n);
  eq(row && JSON.stringify([...row[5]].sort()), JSON.stringify([...KEYS].sort()), `${n}: the eye's index row carries the four topics`);
  const card = INLINE.find((b) => b.number === n && b.congress === 119);
  ok(card && card.status === "failed" && card.source.url === RECORDS[`119|${n}`].src, `${n}: the Legislation library's curated card, with its record door`);
  eq(card && JSON.stringify([...card.issueKeys].sort()), JSON.stringify([...KEYS].sort()), `${n}: the curated card carries the four topics`);
  eq(card && card.primaryIssue, n === HCR ? "restraint" : null, `${n}: the curated card's label is ${n === HCR ? "restraint" : "none — a repeat names no primary"}`);
}
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => decodeURIComponent(m[1]));
const PAGE = (n) => `/b/119/${n}`;
const search = bootEye(ROWS, INLINE), plain = bootEye(ROWS);
for (const n of EIGHT) {
  for (const [label, s] of [["page index", plain], ["page + curated index", search]]) {
    const got = hrefs(s(n));
    eq(got[0], PAGE(n), `${label}: "${n}" opens on ${n}`);
  }
  for (const q of [`${SPONSOR[n]} iran`, `${SPONSOR[n]} war powers`]) ok(hrefs(search(q)).includes(PAGE(n)), `"${q}" finds ${n}`);
}
// Six bill rows is the eye's cap, so a topical query shows part of the text's
// eleven votes; each row's page carries the History that links the rest.
for (const q of ["war powers", "Iran", "Iran war powers", "use of force", "Iran hostilities", "war powers resolution", "remove armed forces"]) {
  const got = hrefs(search(q));
  const fam = got.filter((h) => FAMILY.some((n) => h === PAGE(n)));
  ok(fam.length >= 1 && got.every((h) => h !== undefined), `"${q}" returns the text (${fam.length} of its votes in ${got.length} rows)`);
  console.log(`      "${q}" → ${got.map((h) => h.replace("/b/119/", "")).join(" | ")}`);
}
for (const q of ["war powers", "use of force", "remove armed forces", "Iran war powers"]) ok(hrefs(search(q)).includes(PAGE(HCR)), `"${q}" finds H.Con.Res. 89`);

// ═════════════════════════════════════════════════════════════════════════════
section("8 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
{
  const pair = "S.J.Res. 114|119|war_powers", good = E[pair];
  const LINE_MUTANTS = {
    "a line over 140 characters": good.replace("against Iran;", "within or against the Islamic Republic of Iran, save self-defense;"),
    "a two-sentence line": good.replace("; the Senate refused", ". The Senate refused"),
    "a method word": good.replace("Would have used", "Mapped here, would have used"),
    "a method word, mid-line": good.replace("hostilities against Iran", "hostilities against Iran, weighted 70"),
    "a title fallback": `Would have done what ${DOCS["119|S.J.Res. 114"].t.replace(/\.$/, "")} says; the Senate refused to discharge it 46-51.`,
    "an ellipsis clip": good.replace("; the Senate", "…; the Senate"),
    "the resolution as subject": good.replace("Would have used", "The resolution used"),
    "another measure's tally": good.replace("46-51", "47-53"),
  };
  for (const [what, bad] of Object.entries(LINE_MUTANTS)) {
    must(bad !== good, `the "${what}" mutation found its target`);
    ok(lineFault(bad, "S.J.Res. 114") !== "", `${what} fails the line rule`);
  }
  const flip = SQL.replace("(m_id, 'strong_defense', 55, false, 'yea_opposes',", "(m_id, 'strong_defense', 55, false, 'yea_supports',");
  must(flip !== SQL, "the flipped-direction mutation found its target");
  ok(mappingFault(flip).length > 0, "an incorrect direction on strong_defense fails the mapping check");
  ok(mappingFault(SQL.replace("(m_id, 'restraint', 100, false,", "(m_id, 'restraint', 100, true,")).length > 0, "a primary on a repeat fails");
  ok(mappingFault(SQL.replace("(m_id, 'war_powers', 70, false,", "(m_id, 'war_powers', 100, false,")).length > 0, "a changed weight fails");
  const seedFlip = JSON.parse(JSON.stringify(SEED));
  seedFlip.push({ measureType: "resolution", congress: 119, chamber: "senate", number: "S.J.Res. 181", issues: [] });
  ok(mappingFault(SQL, seedFlip).length > 0, "a second copy of the rows in the seed fails");
  // The hold switched off: the repeats score again and the rows move.
  const noHold = VRJS.replace("var split = _holdRepeats(items);", "var split = { kept: items.slice(), held: [] };");
  must(noHold !== VRJS, "the hold mutation found its target");
  const W = bootFiles({ vr: noHold });
  ok(scoreFaults(W, BASE, VOTERS.slice(0, 6)).length > 0 || drawerFaults(W, VOTERS.slice(0, 3), ["restraint"]).length > 0, "counting every repeat fails the one-position-per-text check");
  const noHist = CONS.replace("_dosVrLinkHtml(pid, issueKey, off) + '</div>' + _dosSameTextHtml(pid, issueKey) +", "_dosVrLinkHtml(pid, issueKey, off) + '</div>' +");
  must(noHist !== CONS, "the drawer History mutation found its target");
  ok(drawerFaults(bootFiles({ cons: noHist }), VOTERS.slice(0, 2), ["restraint"]).length > 0, "History dropped from the drawer fails");
  const noPage = BD_SRC.replace("    out += sameTextHtml(String(sitting) + '|' + number);\n", "");
  must(noPage !== BD_SRC, "the page History mutation found its target");
  ok(panelFaults(await panel("S.J.Res. 114", { bd: noPage }), "S.J.Res. 114").length > 0, "History dropped from the bill page fails");
  const off = JSON.parse(OFFICIAL);
  off.effects["119|S.J.Res. 172"].restraint = LINE_MUTANTS["a method word"];
  ok(panelFaults(await panel("S.J.Res. 172", { official: JSON.stringify(off) }), "S.J.Res. 172").length > 0, "a method word on the bill page fails the panel check");
  const wrongChip = PANELS["S.J.Res. 180"].replace(/(data-issue="strong_defense"[\s\S]*?)A Yea cuts against this/, "$1A Yea advances this");
  must(wrongChip !== PANELS["S.J.Res. 180"], "the bill-page direction mutation found its target");
  ok(panelFaults(wrongChip, "S.J.Res. 180").length > 0, "an incorrect direction chip on the bill page fails");
}

console.log(`\n   ${failures.length ? "✗" : "✓"} war powers same text: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log(`      ✗ ${f.slice(0, 300)}`);
process.exit(failures.length ? 1 : 0);
