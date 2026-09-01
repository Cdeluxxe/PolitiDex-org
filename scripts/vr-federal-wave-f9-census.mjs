// ════════════════════════════════════════════════════════════════════════════
// Federal wave F9 — contested House amendment census
// ════════════════════════════════════════════════════════════════════════════
//
// F7 said it bridged 88 House amendment rolls to their amendment text, found 54
// contested, and left them unread on purpose. This file rebuilds that pool from
// the clerk's own vote indexes rather than inheriting F7's count — and the count
// does not survive the rebuild. The real figure is 51.
//
// The brief's first census step is "rebuild the 54 from F7's own seed / runbook
// list. Do not inherit a stale count." What follows is the rebuild and, because a
// disagreement with the shipped record has to be explainable rather than merely
// asserted, the reconciliation.
//
// TWO DEFECTS IN F7's OWN RECORD, FOUND BY THE REBUILD.
//
// 1. F7's "unbridged: 2 (2026/395 on H.R. 2988, 2026/427 on H.Res. 1014)" names
//    YEA TOTALS AS ROLL NUMBERS. There is no roll 395 or 427 in the 2026 index at
//    all. The two rolls F7 could not bridge are 2026/29 (H.Amdt. 152 on H.R. 2988,
//    395-22) and 2026/40 (H.Amdt. 154 on H.Res. 1014, 427-0) — the numbers 395 and
//    427 are the yea columns of those two tallies. Both bridge cleanly here once
//    'Roll no. NNN' is de-duplicated per <amendment> block (F7's other recorded
//    bug), and both then fail rule 11 anyway, so the bridge defect changed no
//    admission. It changed the count: 88 bridged becomes 90.
//
// 2. F7 counted 7 rule-11 failures inside its own 61 not-on-file rolls where 9
//    exist. The two it missed are 2026/145 (H.Amdt. 186, losing side 8.353% of the
//    yea+nay pool) and 2026/146 (H.Amdt. 191, 1.887%). Both are under the
//    one-tenth bar and neither is contested. That is the whole of the 54 → 51
//    gap once the two newly-bridged uncontested rolls are added on the other side.
//
// Reconciled: 90 listed amendment rolls − 28 already in vr_rollcalls = 62 not on
// file, − 11 failing rule 11 = 51 contested and unread. F7's 54 was 61 − 7.
//
// FIVE THINGS THIS FILE IS CAREFUL ABOUT.
//
// 1. THE INDEX IS PAGINATED AND index.asp LIES BY OMISSION. clerk.house.gov's
//    /evs/{year}/index.asp returns only the ~20 most recent rolls of the year. A
//    census built on it would have found four amendment rolls in 2025 and called
//    the pool empty. The authority is the ROLL_000.asp / ROLL_100.asp / … pages,
//    walked until one returns no rows.
//
// 2. THE TALLY IS THE CHAMBER'S, FROM <totals-by-vote>. Never a display string,
//    never the attributed subset. F6's recorded bug is that a display tally
//    "51-42" parses to 5142, which puts the losing side at zero and makes every
//    roll look unanimous — a filter that returns nothing then looks exactly like a
//    filter that correctly returns nothing.
//
// 3. THE BRIDGE DE-DUPLICATES ROLL NUMBERS PER BLOCK. 'Roll no. NNN' appears
//    twice inside one govinfo <amendment> block — once in <latestAction><text> and
//    again in <links><name> — so a naive scan makes every amendment ambiguous
//    against itself and bridges nothing. This is F7's own recorded finding and it
//    is honoured here rather than rediscovered.
//
// 4. ALREADY-ON-FILE IS ASKED OF vr_rollcalls, NOT OF THE SEEDS. The seeds cover
//    part of the corpus; the rest arrived by migration. Reading the seeds alone
//    would offer rolls the site has already published.
//
// 5. THE TEXT GATE IS THE BRIEF'S "ENROLLED AMEND", AND IT IS ASYMMETRIC. Every
//    other source the brief names was probed and none carries operative amendment
//    text: the clerk's <vote-desc> is empty on these rolls, api.congress.gov
//    returns textVersions: [] for House amendments of the 119th, BILLSTATUS and
//    the committee reports are descriptive, and the Rules Committee amendment PDFs
//    are encrypted with the PDF standard security handler (that protection was
//    left in place, not circumvented). What does work is the parent's ENGROSSED
//    text diffed against its AS-REPORTED text: an amendment that was AGREED TO is
//    in the engrossed bill and can be read section by section. An amendment that
//    FAILED left no trace in any published text, so its operative words cannot be
//    verified at all — and the brief's own instruction for that case is to refuse
//    the roll in writing rather than guess from the title. 39 of the 51 failed; one
//    of those 39 was already refused by the refusal-first gate, so 38 reach step 5.
//
// Usage: node scripts/vr-federal-wave-f9-census.mjs [--json]
//        F9_XML_DIR overrides the document cache (default /tmp/f9xml).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.env.F9_XML_DIR || "/tmp/f9xml";
const AS_JSON = process.argv.includes("--json");
const UA = { "user-agent": "PolitiDex/1.0 (federal wave F9 census)" };

mkdirSync(CACHE, { recursive: true });
async function cached(file, url, { optional = false } = {}) {
  const p = join(CACHE, file);
  if (existsSync(p)) return readFileSync(p, "utf8");
  const r = await fetch(url, { headers: UA });
  if (!r.ok) {
    if (optional) return null;
    throw new Error(`${url} → HTTP ${r.status}`);
  }
  const b = await r.text();
  writeFileSync(p, b);
  return b;
}
const tag = (b, n) => {
  const m = String(b).match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
};
const clean = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// ── 1. THE PAGINATED CLERK INDEXES ──────────────────────────────────────────
// Walk ROLL_000, ROLL_100, … until a page yields no rows. See note 1.
async function yearRows(year) {
  const rows = [];
  for (let page = 0; page < 900; page += 100) {
    const p3 = String(page).padStart(3, "0");
    const html = await cached(`pg_${year}_${p3}.html`, `https://clerk.house.gov/evs/${year}/ROLL_${p3}.asp`, { optional: true });
    if (!html) break;
    const before = rows.length;
    for (const m of html.matchAll(/<TR><TD><A HREF="[^"]*rollnumber=(\d+)">\d+<\/A><\/TD>([\s\S]*?)<\/TR>/gi)) {
      const cells = [...m[2].matchAll(/<TD[^>]*>([\s\S]*?)<\/TD>/gi)].map((c) => clean(c[1]));
      rows.push({ year, roll: Number(m[1]), date: cells[0] || "", issue: cells[1] || "", question: cells[2] || "", result: cells[3] || "", title: cells[4] || "" });
    }
    if (rows.length === before) break;
  }
  if (!rows.length) throw new Error(`clerk index for ${year} yielded no rows — the page shape changed`);
  return rows;
}

// ── 2. THE AMENDMENT ROLLS, WITH THE CHAMBER'S OWN TALLY ────────────────────
async function amendmentRolls(indexRows) {
  const pool = indexRows.filter((r) => /^On Agreeing to the Amendment/i.test(r.question));
  const out = [];
  for (const r of pool) {
    const p3 = String(r.roll).padStart(3, "0");
    const x = await cached(`roll_${r.year}_${r.roll}.xml`, `https://clerk.house.gov/evs/${r.year}/roll${p3}.xml`);
    const tb = tag(x, "totals-by-vote");
    const yea = Number(tag(tb, "yea-total") || 0) + Number(tag(tb, "aye-total") || 0);
    const nay = Number(tag(tb, "nay-total") || 0) + Number(tag(tb, "no-total") || 0);
    if (!Number.isFinite(yea) || !Number.isFinite(nay) || yea + nay === 0)
      throw new Error(`house ${r.year}/${r.roll}: <totals-by-vote> has no readable yea/nay pool`);
    out.push({
      year: r.year, roll: r.roll, session: r.year === 2025 ? 1 : 2,
      date: tag(x, "action-date"), legis: tag(x, "legis-num"), question: tag(x, "vote-question"),
      amdNum: tag(x, "amendment-num"), amdAuthor: tag(x, "amendment-author"),
      result: tag(x, "vote-result"), voteDesc: tag(x, "vote-desc"),
      yea, nay, present: Number(tag(tb, "present-total") || 0), notVoting: Number(tag(tb, "not-voting-total") || 0),
    });
  }
  return out;
}

// ── 3. BRIDGE THE ROLL TO ITS H.Amdt. ───────────────────────────────────────
const bsUrl = (legis) => {
  const m = String(legis).match(/^H\s+(R|RES|J RES|CON RES)\s+(\d+)$/i);
  if (!m) return null;
  const t = { R: "hr", RES: "hres", "J RES": "hjres", "CON RES": "hconres" }[m[1].toUpperCase()];
  return [`https://www.govinfo.gov/bulkdata/BILLSTATUS/119/${t}/BILLSTATUS-119${t}${m[2]}.xml`, `bs_${t}${m[2]}.xml`];
};
async function bridge(pool) {
  const byParent = {};
  for (const parent of [...new Set(pool.map((v) => v.legis))]) {
    const u = bsUrl(parent);
    const x = u ? await cached(u[1], u[0], { optional: true }) : null;
    const list = [];
    for (const m of String(x || "").matchAll(/<amendment>([\s\S]*?)<\/amendment>/g)) {
      const b = m[1];
      // See note 3: de-duplicate, or every amendment collides with itself.
      const rolls = [...new Set([...b.matchAll(/Roll\s+no\.\s+(\d+)/gi)].map((r) => Number(r[1])))];
      list.push({
        number: tag(b, "number"), type: tag(b, "type"), description: tag(b, "description"),
        purpose: tag(b, "purpose"), actionDate: tag(b, "actionDate"), actionText: tag(b, "text"),
        sponsor: tag(b, "fullName"), bioguide: tag(b, "bioguideId"), rolls,
      });
    }
    byParent[parent] = list;
  }
  for (const v of pool) {
    const hit = (byParent[v.legis] || []).filter((a) => a.rolls.includes(v.roll));
    if (hit.length === 1) { v.hamdt = `H.Amdt. ${hit[0].number}`; v.amendment = hit[0]; }
    else v.bridgeFail = hit.length === 0 ? "no <amendment> block cites this roll" : `${hit.length} blocks cite this roll`;
  }
  return pool;
}

// ── 4. ALREADY ON FILE, ASKED OF THE CORPUS ─────────────────────────────────
async function onFile() {
  const require = createRequire(import.meta.url);           // pg ships CJS only
  const pg = require("pg");
  const c = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    select rc.session, rc.roll_number, m.id mid, m.number, m.measure_type,
           (select count(*) from vr_measure_issues i where i.measure_id = m.id)::int nmap
      from vr_rollcalls rc join vr_measures m on m.id = rc.measure_id
     where rc.chamber = 'house' and rc.congress = 119 and rc.roll_number is not null`);
  await c.end();
  return new Map(r.rows.map((x) => [`${x.session}/${x.roll_number}`, x]));
}

// ── 5. THE REFUSAL RECORD, FROM THE `measure` AND `roll` FIELDS ONLY ────────
const NUM_IN = /\b(H\.R\.|S\.|H\.J\.\s?Res\.|S\.J\.\s?Res\.|H\.Res\.|S\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.\s?Amdt\.|S\.\s?Amdt\.)\s*(\d+)\b/gi;
const norm = (s) => String(s).replace(/\s+/g, " ").replace(/\.\s?/g, ". ").replace(/\s+$/, "").toUpperCase();
function refusalRecord() {
  const measures = new Map();
  for (const w of ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"]) {
    const p = join(ROOT, "db", `vr-federal-mapping-seed-${w}.json`);
    if (!existsSync(p)) continue;
    const j = JSON.parse(readFileSync(p, "utf8"));
    for (const key of ["declinedRollCalls", "declinedMappings", "declinedPromotes", "refusedThisWave"]) {
      const block = j[key];
      for (const it of Array.isArray(block) ? block : []) {
        if (!it || typeof it !== "object") continue;
        for (const m of String(it.measure || "").matchAll(NUM_IN))
          if (!measures.has(norm(m[0]))) measures.set(norm(m[0]), `${w}:${key}`);
      }
    }
  }
  // The F9 brief's standing list, kept by name whether or not a seed field carries it.
  for (const n of ["H.R. 1069", "H.R. 973", "S. 2503"])
    if (!measures.has(norm(n))) measures.set(norm(n), "F9 brief: refusal-first");
  return measures;
}

// A parent that is a named appropriations vehicle, or a resolution providing for
// consideration, is refused BEFORE the text gate — those two live on the brief's
// standing list and no amendment to them earns a reading on that parent's back.
const APPROPRIATIONS_PARENT = /appropriations|continuing appropriations|further consolidated/i;
const PARENT_TITLES = {
  "H R 3944": "Continuing Appropriations, Agriculture, Legislative Branch, Military Construction and Veterans Affairs, and Extensions Act, 2026",
  "H RES 566": "Providing for consideration of the Senate amendment to H.R. 1 (rule for consideration)",
  "H RES 1014": "Providing for consideration (rule for consideration)",
  "H RES 1175": "Providing for consideration of H.R. 8035 (rule for consideration)",
};
function refusalFirst(v) {
  if (/^H RES/i.test(v.legis) && /providing for consideration/i.test(PARENT_TITLES[v.legis] || v.legis + " " + (v.amendment?.description || "")))
    return "parent is a resolution providing for consideration — rules-for-consideration is on the standing refusal list";
  if (APPROPRIATIONS_PARENT.test(PARENT_TITLES[v.legis] || ""))
    return "parent is a named appropriations vehicle — on the standing refusal list";
  if (/en bloc/i.test(v.amdAuthor || "") || /en bloc/i.test(v.amendment?.description || ""))
    return "an en bloc amendment is several instruments disposed of by one vote — 'one instrument, one act' refuses it";
  return null;
}

// ── 6. THE TEXT GATE ────────────────────────────────────────────────────────
// See note 5. An agreed amendment is readable in the parent's engrossed text; a
// failed one is readable nowhere, and is refused in writing rather than guessed.
const AGREED = /^agreed/i;
const TEXT_SOURCES_PROBED = [
  { source: "clerk EVS <vote-desc>", result: "empty on all 90 amendment rolls in this pool" },
  { source: "api.congress.gov v3 /amendment/119/hamdt/{n}/text", result: "textVersions: [] for every H.Amdt. of the 119th" },
  { source: "congress.gov amendment page", result: "HTTP 403 to a script" },
  { source: "govinfo BILLSTATUS <amendment><description>", result: "descriptive, not operative — 'never guess from the title' covers it" },
  { source: "govinfo CRPT-119hrpt* committee reports", result: "descriptive; the amendment texts are in the Rules print, not the report" },
  { source: "Rules Committee amendment PDFs", result: "encrypted with the PDF standard security handler; the protection was left in place, not circumvented" },
  { source: "govinfo CREC granules for the debate day", result: "granule ids do not resolve — every fetch lands on a 44,165-byte landing page" },
  { source: "govinfo BILLS-119hr{n}eh diffed against BILLS-119hr{n}rh", result: "WORKS for agreed amendments; this is the brief's 'enrolled amend' and it is the only path that carries operative words" },
];

// ── RUN ─────────────────────────────────────────────────────────────────────
const index2025 = await yearRows(2025);
const index2026 = await yearRows(2026);
const indexRows = [...index2025, ...index2026];
const pool = await bridge(await amendmentRolls(indexRows));
const ON_FILE = await onFile();
const REF = refusalRecord();

const funnel = [];
const step = (label, to, from, note) => funnel.push({ step: label, from, to, note });

const listedAll = indexRows.length;
const listed = pool.length;
step("0. clerk amendment rolls in the 119th (2025 + 2026 indexes)", listed, listedAll,
  `-${listedAll - listed} rolls whose question is not 'On Agreeing to the Amendment'`);

const bridged = pool.filter((v) => v.hamdt);
const unbridged = pool.filter((v) => !v.hamdt);
step("1. bridged to a unique H.Amdt. with sponsor and purpose", bridged.length, listed,
  unbridged.length ? `-${unbridged.length}: ${unbridged.map((v) => `${v.year}/${v.roll} (${v.bridgeFail})`).join("; ")}`
    : "-0. F7 reported 2 unbridged and mislabeled them by yea total; both bridge here");

const notOnFileRolls = bridged.filter((v) => !ON_FILE.has(`${v.session}/${v.roll}`));
const already = bridged.filter((v) => ON_FILE.has(`${v.session}/${v.roll}`));
const alreadyZero = already.filter((v) => ON_FILE.get(`${v.session}/${v.roll}`).nmap === 0);
step("2. not already in vr_rollcalls", notOnFileRolls.length, bridged.length,
  `-${already.length} on file (${already.length - alreadyZero.length} mapped, ${alreadyZero.length} with zero issue mappings: ${alreadyZero.map((v) => v.hamdt).join(", ") || "none"})`);

const rule11 = (v) => { const p = v.yea + v.nay, l = Math.min(v.yea, v.nay); return p > 0 && l >= p / 10; };
const sharePct = (v) => +((Math.min(v.yea, v.nay) / (v.yea + v.nay)) * 100).toFixed(3);
const contested = notOnFileRolls.filter(rule11);
const uncontested = notOnFileRolls.filter((v) => !rule11(v));
step("3. contested at rule 11's one-tenth bar", contested.length, notOnFileRolls.length,
  `-${uncontested.length}: ${uncontested.map((v) => `${v.hamdt} ${sharePct(v)}%`).join(", ")}`);

const afterRefusal = [], refusedFirst = [];
for (const v of contested) {
  const byName = REF.get(norm(v.legis.replace(/^H\s+R\s+/i, "H.R. ").replace(/^H\s+RES\s+/i, "H.Res. ")));
  const why = refusalFirst(v) || (byName ? `parent named in the refusal record (${byName})` : null);
  if (why) refusedFirst.push(Object.assign(v, { _refusedBy: why })); else afterRefusal.push(v);
}
step("4. refusal-first gate on the parent and the instrument", afterRefusal.length, contested.length,
  `-${refusedFirst.length}: ${refusedFirst.map((v) => `${v.hamdt} (${v.year}/${v.roll})`).join(", ")}`);

const textOk = afterRefusal.filter((v) => AGREED.test(v.result));
const textLost = afterRefusal.filter((v) => !AGREED.test(v.result));
step("5. operative text verifiable (see note 5)", textOk.length, afterRefusal.length,
  `-${textLost.length} failed amendments: no published text carries the words they would have inserted, so the roll is refused in writing`);

// The mapping decision itself is not re-derived here — it lives in
// db/vr-federal-mapping-seed-f9.json, where each admitted roll cites the section of
// the engrossed bill that was read and each refusal states its reason. This census
// stops at the pool it hands over.
const ADMITTED = new Set(["H.Amdt. 86", "H.Amdt. 88", "H.Amdt. 89", "H.Amdt. 79", "H.Amdt. 81", "H.Amdt. 196", "H.Amdt. 207"]);
const NO_KEY = {
  "H.Amdt. 90": "the operative text repeals a limit on which flags a commander may display. No key on any existing tree has that as its subject, and a new key for it fails vocab rule 1 (RECURRING) and rule 3 (NOT A COUSIN).",
  "H.Amdt. 96": "the operative text bars the Department from rating news sources for factual accuracy. free_speech is a one-line ISSUE_MAP entry with no argued-out scope note in issue-scope.js, so its boundary cannot be stated to a reader — F7's own rule refuses the mapping rather than inventing the boundary here.",
  "H.Amdt. 202": "the operative text widens an agricultural research authority to cover precision agriculture. rural_ag has no argued-out scope note either, and climate_action's written boundary is emissions, which this text does not touch.",
};

const report = {
  wave: "F9", chamber: "house", subject: "contested House amendment rolls F7 left unread",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    "clerk.house.gov/evs/2025/ROLL_{000..600}.asp and /evs/2026/ROLL_{000..600}.asp — the paginated indexes, not index.asp",
    "clerk.house.gov/evs/{year}/roll{NNN}.xml — one document per amendment roll, for <totals-by-vote>",
    "govinfo BULKDATA BILLSTATUS-119{type}{n}.xml — the roll → H.Amdt. bridge",
    "govinfo BILLS-119hr{n}eh and BILLS-119hr{n}rh — the operative-text diff",
    "vr_rollcalls (chamber = 'house', congress = 119) — the on-file set",
  ],
  listed: { indexRowsTotal: listedAll, amendmentRolls: listed, y2025: pool.filter((v) => v.year === 2025).length, y2026: pool.filter((v) => v.year === 2026).length },
  funnel,
  f7Reconciliation: {
    f7Claimed: { bridged: 88, unbridged: 2, alreadyOnFile: 28, notOnFile: 61, failingRule11: 7, contestedAndUnread: 54 },
    f9Rebuilt: { bridged: bridged.length, unbridged: unbridged.length, alreadyOnFile: already.length, notOnFile: notOnFileRolls.length, failingRule11: uncontested.length, contestedAndUnread: contested.length },
    defects: [
      "F7's unbridged pair is named by yea total, not roll number: '2026/395 on H.R. 2988' is roll 2026/29 (H.Amdt. 152, 395-22) and '2026/427 on H.Res. 1014' is roll 2026/40 (H.Amdt. 154, 427-0). Both bridge here; both fail rule 11.",
      "F7 found 7 rule-11 failures in its 61 where 9 exist: it missed 2026/145 (H.Amdt. 186, 8.353%) and 2026/146 (H.Amdt. 191, 1.887%).",
    ],
    net: "54 → 51. Two rolls join the pool by being bridged and immediately leave it by failing rule 11; two more that F7 carried as contested are not.",
  },
  textGate: { rule: "operative text or refusal, never the title", probed: TEXT_SOURCES_PROBED },
  admitted: textOk.filter((v) => ADMITTED.has(v.hamdt)).map((v) => ({
    roll: `house 119/${v.session}/${v.roll}`, clerkYear: v.year, hamdt: v.hamdt, parent: v.legis, date: v.date,
    tally: `${v.yea}-${v.nay}`, losingSharePct: sharePct(v), result: v.result,
    sponsor: v.amendment.sponsor, bioguide: v.amendment.bioguide,
  })),
  refusedInWriting: [
    ...refusedFirst.map((v) => ({ roll: `house 119/${v.session}/${v.roll}`, hamdt: v.hamdt, tally: `${v.yea}-${v.nay}`, gate: "refusal-first", reason: v._refusedBy })),
    ...textLost.map((v) => ({ roll: `house 119/${v.session}/${v.roll}`, hamdt: v.hamdt, parent: v.legis, tally: `${v.yea}-${v.nay}`, gate: "text not verifiable",
      reason: `the amendment FAILED, so its words are in no published text: not in the engrossed bill, not in api.congress.gov (textVersions: []), not in the clerk's empty <vote-desc>, and the Rules Committee print is encrypted. Guessing the operative effect from the clerk's amendment-author line or the BILLSTATUS description is the one thing the brief forbids.` })),
    ...textOk.filter((v) => !ADMITTED.has(v.hamdt)).map((v) => ({ roll: `house 119/${v.session}/${v.roll}`, hamdt: v.hamdt, parent: v.legis, tally: `${v.yea}-${v.nay}`, gate: "text read, no key earned", reason: NO_KEY[v.hamdt] || "no key on an existing tree has this text as its subject" })),
  ],
  poolHandedOn: {
    contestedAndUnread: contested.length,
    admitted: textOk.filter((v) => ADMITTED.has(v.hamdt)).length,
    refused: refusedFirst.length + textLost.length + textOk.filter((v) => !ADMITTED.has(v.hamdt)).length,
    stillUnreadableUntilAFailedAmendmentTextSourceExists: textLost.length,
  },
};

if (report.poolHandedOn.admitted + report.poolHandedOn.refused !== contested.length)
  throw new Error(`census does not balance: ${report.poolHandedOn.admitted} admitted + ${report.poolHandedOn.refused} refused ≠ ${contested.length} contested`);

if (AS_JSON) console.log(JSON.stringify(report, null, 1));
else {
  console.log(`clerk index rows: ${listedAll}; amendment rolls: ${listed} (2025: ${report.listed.y2025}, 2026: ${report.listed.y2026}); house 119 rolls on file: ${ON_FILE.size}`);
  for (const f of funnel) console.log(`  ${f.step.padEnd(56)} ${String(f.from).padStart(5)} → ${String(f.to).padStart(4)}   ${f.note}`);
  console.log(`\nF7 SAID 54. THE REBUILD SAYS ${contested.length}.`);
  for (const d of report.f7Reconciliation.defects) console.log(`  · ${d}`);
  console.log(`  ${report.f7Reconciliation.net}`);
  console.log(`\nADMITTED: ${report.admitted.length}`);
  for (const a of report.admitted) console.log(`  ${a.roll.padEnd(16)} ${a.hamdt.padEnd(12)} on ${a.parent.padEnd(10)} ${a.tally.padEnd(8)} ${String(a.losingSharePct).padStart(6)}%  ${a.sponsor}`);
  console.log(`\nREFUSED IN WRITING: ${report.refusedInWriting.length}`);
  const byGate = {};
  for (const r of report.refusedInWriting) (byGate[r.gate] = byGate[r.gate] || []).push(r);
  for (const [g, rs] of Object.entries(byGate)) {
    console.log(`  ${g} — ${rs.length}`);
    for (const r of rs) console.log(`    ${r.roll.padEnd(16)} ${String(r.hamdt).padEnd(12)} ${r.tally.padEnd(8)} ${r.reason.slice(0, 96)}`);
  }
}
