// ════════════════════════════════════════════════════════════════════════════
// Federal wave F7 — Senate census
// ════════════════════════════════════════════════════════════════════════════
//
// F6 read the House energy slice and left 113 gated rolls unread. Eighteen of
// them are Senate rolls that survived F6's refusal gate and were never opened.
// F6's census was not committed as a script, so "the 18" exists only as a count
// in db/vr-federal-mapping-seed-f6.json. This file re-derives the pool from the
// same sources F6 named, so the number can be checked rather than trusted, and
// prints the funnel it walked.
//
// THE ORDER IS THE BRIEF'S ORDER: refusal record first, pool second. A gap in
// vr_measure_issues is not evidence of a mappable measure (F5's lesson), and a
// survivor of the refusal gate is not evidence of one either (F6's warning).
//
// FOUR THINGS THIS FILE IS CAREFUL ABOUT.
//
// 1. THE TALLY COMES FROM <yeas>/<nays>, NEVER FROM <vote_tally>'s DISPLAY
//    STRING. F6 recorded the bug: "51-42" parsed as a number is 5142, which
//    reads as a 5142-vote pool with a losing side of zero — uncontested. Every
//    Senate roll then looked unanimous and the filter returned nothing, which
//    is indistinguishable from a filter that correctly returns nothing. Here
//    the two integers are read out of their own elements and a roll whose pool
//    does not parse is a hard failure, not a skip.
//
// 2. ALREADY-ON-FILE IS ASKED OF THE CORPUS, NOT OF THE SEEDS. The db/*-vote-seed
//    files cover 26 of the Senate's on-file 119th rolls; the rest arrived by
//    migration. Reading the seeds alone would offer a dozen rolls the site has
//    already published. The set is read from vr_rollcalls and written into the
//    artifact, so a later wave can diff it.
//
// 3. THE FORM GATE IS COPIED, NOT REWRITTEN. DECISIVE, PASSAGE_FORMS and
//    EXCEPTIONS are the same three lists scripts/test-vr-vote-seed.mjs enforces.
//    A census with a looser gate than the guard is a census that offers rolls the
//    guard will refuse.
//
// 4. THE REFUSAL GATE READS THE SHIPPED SEEDS. Refused measure numbers and
//    refused roll ids are extracted from the declinedRollCalls / declinedMappings
//    blocks of F2–F6 and from this wave's standing list. Extraction is from the
//    `measure` and `roll` fields only — scanning whole reason paragraphs for bill
//    numbers would refuse a measure merely because an earlier wave mentioned it.
//
// Usage: node scripts/vr-federal-wave-f7-census.mjs [--json]
//        F7_XML_DIR overrides the XML cache (default /tmp/f7xml).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.env.F7_XML_DIR || "/tmp/f7xml";
const AS_JSON = process.argv.includes("--json");

// ── SOURCE ──────────────────────────────────────────────────────────────────
async function menu(session) {
  const local = join(CACHE, `s_119_${session}.xml`);
  if (existsSync(local)) return readFileSync(local, "utf8");
  const url = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_${session}.xml`;
  const res = await fetch(url, { headers: { "user-agent": "PolitiDex/1.0 (federal wave F7 census)" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = await res.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(local, body);
  return body;
}

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
};

function parseMenu(xml, session) {
  const out = [];
  for (const m of xml.matchAll(/<vote>([\s\S]*?)<\/vote>/g)) {
    const b = m[1];
    const roll = Number(tag(b, "vote_number"));
    // Rule: the pool is the two integers, never the display string. See note 1.
    const yea = Number(tag(b, "yeas"));
    const nay = Number(tag(b, "nays"));
    if (!Number.isInteger(roll) || roll <= 0) throw new Error(`session ${session}: unparseable vote_number "${tag(b, "vote_number")}"`);
    if (!Number.isInteger(yea) || !Number.isInteger(nay)) throw new Error(`senate 119/${session}/${roll}: unparseable tally (yeas "${tag(b, "yeas")}", nays "${tag(b, "nays")}")`);
    out.push({
      congress: 119, session, roll, chamber: "senate",
      date: tag(b, "vote_date"), issue: tag(b, "issue"), question: tag(b, "question"),
      result: tag(b, "result"), title: tag(b, "title"), yea, nay,
    });
  }
  return out;
}

// ── FORM GATE (copied from scripts/test-vr-vote-seed.mjs) ───────────────────
const DECISIVE = /^(on passage|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;
const PASSAGE_FORMS = [{ name: "joint resolution", question: /^on the joint resolution\b/i, number: /^(h|s)\.j\.\s*res\./i }];
const EXCEPTIONS = [
  { name: "amendment", question: /^on (agreeing to )?the amendment\b/i, number: /^(h|s)\.\s*amdt\./i },
  { name: "discharge", question: /^on the motion to discharge/i, number: /^(h|s)\.j\.\s*res\./i },
];
const MEASURE = /^(H\.R\.|S\.|H\.J\.\s?Res\.|S\.J\.\s?Res\.|H\.Res\.|S\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.\s?Amdt\.|S\.\s?Amdt\.)\s*\d+/i;

function formGate(v) {
  const q = v.question, n = v.issue;
  if (/^PN/i.test(n)) return { admitted: false, why: "nomination" };
  if (!MEASURE.test(n)) return { admitted: false, why: `issue "${n}" is not a measure number` };
  if (DECISIVE.test(q)) return { admitted: true, form: "decisive" };
  for (const f of PASSAGE_FORMS) if (f.question.test(q) && f.number.test(n)) return { admitted: true, form: `passage form: ${f.name}` };
  for (const e of EXCEPTIONS) if (e.question.test(q) && e.number.test(n)) return { admitted: true, form: `exception: ${e.name}` };
  return { admitted: false, why: `question "${q}" is not an admitted decisive form for ${n}` };
}

// ── REFUSAL RECORD ──────────────────────────────────────────────────────────
// Extracted from the `measure` and `roll` fields of the shipped seeds only.
const NUM_IN = /\b(H\.R\.|S\.|H\.J\.\s?Res\.|S\.J\.\s?Res\.|H\.Res\.|S\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.\s?Amdt\.|S\.\s?Amdt\.)\s*(\d+)\b/gi;
const norm = (s) => s.replace(/\s+/g, " ").replace(/\.\s?/g, ". ").replace(/\s+$/, "").toUpperCase();
const ROLL_IN = /senate\s+(\d+)\/(\d)\/(\d+)/gi;

function refusalRecord() {
  const measures = new Map();   // normalised number → first source that refused it
  const rolls = new Map();      // "119/1/599" → source
  const files = ["f1", "f2", "f3", "f4", "f5", "f6"].map((w) => `vr-federal-mapping-seed-${w}.json`);
  for (const f of files) {
    const p = join(ROOT, "db", f);
    if (!existsSync(p)) continue;
    const j = JSON.parse(readFileSync(p, "utf8"));
    for (const key of ["declinedRollCalls", "declinedMappings", "declinedPromotes"]) {
      for (const it of j[key] || []) {
        if (!it || typeof it !== "object") continue;
        for (const m of String(it.measure || "").matchAll(NUM_IN)) if (!measures.has(norm(m[0]))) measures.set(norm(m[0]), `${f}:${key}`);
        for (const m of String(it.roll || "").matchAll(ROLL_IN)) {
          const id = `${m[1]}/${m[2]}/${Number(m[3])}`;
          if (!rolls.has(id)) rolls.set(id, `${f}:${key}`);
        }
      }
    }
  }
  // The brief's standing list, kept by name whether or not a seed field carries it.
  for (const n of ["H.R. 1069", "H.R. 973", "S. 2503", "H.R. 5371", "H.R. 6500", "H.R. 3944", "H.R. 4553",
                   "H.R. 3015", "H.R. 3638", "H.R. 3109", "H.R. 3617", "H.R. 8800"])
    if (!measures.has(norm(n))) measures.set(norm(n), "F7 brief: refusal-first");
  return { measures, rolls };
}

// ── ALREADY ON FILE ─────────────────────────────────────────────────────────
async function onFile() {
  const require = createRequire(import.meta.url);           // pg ships CJS only
  const pg = require("pg");
  const c = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    "select session, roll_number from vr_rollcalls where chamber = 'senate' and congress = 119 and roll_number is not null",
  );
  await c.end();
  return new Set(r.rows.map((x) => `119/${x.session}/${x.roll_number}`));
}

// F6 admitted eleven House rolls that are not in vr_rollcalls yet (its migration is
// unapplied). None is a Senate roll, but the claim is asserted rather than assumed.
function f6Claimed() {
  const j = JSON.parse(readFileSync(join(ROOT, "db", "vr-federal-mapping-seed-f6.json"), "utf8"));
  return new Set((j.measures || []).map((m) => m.roll).filter(Boolean).map((r) => `119/${r.split("/").slice(1).join("/")}`));
}

// ── RUN ─────────────────────────────────────────────────────────────────────
const all = [...parseMenu(await menu(1), 1), ...parseMenu(await menu(2), 2)];
const ON_FILE = await onFile();
const CLAIMED = f6Claimed();
const REF = refusalRecord();

const funnel = [];
const step = (name, kept, dropped, note) => funnel.push({ step: name, from: kept.length + dropped.length, to: kept.length, note });

let pool = all;
const listed = pool.length;

const notOnFile = pool.filter((v) => !ON_FILE.has(`119/${v.session}/${v.roll}`) && !CLAIMED.has(`119/${v.session}/${v.roll}`));
step("1. not already in vr_rollcalls", notOnFile, pool.filter((v) => !notOnFile.includes(v)), `-${pool.length - notOnFile.length} already on file`);
pool = notOnFile;

const formed = [], formRejects = [];
for (const v of pool) { const g = formGate(v); (g.admitted ? formed : formRejects).push(Object.assign(v, { _gate: g })); }
const byForm = {};
for (const v of formed) byForm[v._gate.form] = (byForm[v._gate.form] || 0) + 1;
step("2. rule 8/12 decisive question form", formed, formRejects, `-${formRejects.length}. Admitted: ${Object.entries(byForm).map(([k, n]) => `${n} ${k}`).join(", ")}`);
pool = formed;

const notRule = pool.filter((v) => !/providing for consideration/i.test(v.title));
step("3. not a rule providing for consideration", notRule, pool.filter((v) => !notRule.includes(v)), "the form gate had already removed every one");
pool = notRule;

const contested = pool.filter((v) => { const p = v.yea + v.nay; const l = Math.min(v.yea, v.nay); return p > 0 && l >= p / 10; });
step("4. contested at rule 11's one-tenth bar", contested, pool.filter((v) => !contested.includes(v)), `-${pool.length - contested.length}`);
pool = contested;

const measureOf = (v) => norm((v.issue.match(MEASURE) || [v.issue])[0]);
const survived = [], refused = [];
for (const v of pool) {
  const byName = REF.measures.get(measureOf(v));
  const byRoll = REF.rolls.get(`119/${v.session}/${v.roll}`);
  if (byName || byRoll) refused.push(Object.assign(v, { _refusedBy: byRoll ? `roll named in ${byRoll}` : `measure named in ${byName}` }));
  else survived.push(v);
}
step("5. refusal-first gate", survived, refused, `-${refused.length} already refused by name`);

const report = {
  wave: "F7", chamber: "senate", generated: new Date().toISOString().slice(0, 10),
  sources: [
    "senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml",
    "senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_2.xml",
    "vr_rollcalls (chamber = 'senate', congress = 119) for the on-file set",
  ],
  listed: { total: listed, session1: all.filter((v) => v.session === 1).length, session2: all.filter((v) => v.session === 2).length },
  onFile: [...ON_FILE].sort(),
  funnel,
  survived: survived.map((v) => ({ roll: `119/${v.session}/${v.roll}`, measure: measureOf(v), issue: v.issue, question: v.question, tally: `${v.yea}-${v.nay}`, losingSharePct: +((Math.min(v.yea, v.nay) / (v.yea + v.nay)) * 100).toFixed(3), result: v.result, form: v._gate.form, title: v.title })),
  refused: refused.map((v) => ({ roll: `119/${v.session}/${v.roll}`, measure: measureOf(v), refusedBy: v._refusedBy, tally: `${v.yea}-${v.nay}` })),
};

if (AS_JSON) { console.log(JSON.stringify(report, null, 1)); }
else {
  console.log(`listed ${listed} (session 1: ${report.listed.session1}, session 2: ${report.listed.session2}); on file ${ON_FILE.size}`);
  for (const f of funnel) console.log(`  ${f.step.padEnd(40)} ${String(f.from).padStart(5)} → ${String(f.to).padStart(4)}   ${f.note}`);
  console.log(`\nSURVIVED THE GATE: ${survived.length}`);
  for (const v of report.survived) console.log(`  ${v.roll.padEnd(10)} ${v.measure.padEnd(14)} ${v.tally.padEnd(8)} ${String(v.losingSharePct).padStart(6)}%  ${v.form.padEnd(22)} ${v.question}`);
  console.log(`\nREFUSED BY THE STANDING RECORD: ${refused.length}`);
  for (const v of report.refused) console.log(`  ${v.roll.padEnd(10)} ${v.measure.padEnd(14)} ${v.tally.padEnd(8)} ${v.refusedBy}`);
}
