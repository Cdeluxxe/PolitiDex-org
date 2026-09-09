#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// UTAH EXECUTIVE FORMAL LANE — wave E1 ingest (signed and vetoed acts)
// ─────────────────────────────────────────────────────────────────────────────
// Governor Cox showed "No formal pattern on file yet" because the pattern engine
// eats floor votes, committee votes and sponsorships, and a governor casts none of
// the three. The formal file for that office is the bills he signed and the bills
// he vetoed. This script fills that lane and does not invent a roll call to do it.
//
// WHAT AN ACT IS HERE. le.utah.gov publishes, in each bill's own action history, a
// dated gubernatorial action: "Governor Signed" (action code GSIGN) or "Governor
// Vetoed" (GVETO). Each becomes one vr_positions row with action_type gov_signed or
// gov_vetoed. Those two action types are NEW and deliberately distinct from the
// pre-existing presidential `signed` / `vetoed` / `issued` types, which stay out of
// the stance-helpers act table and continue to route a president to the separate
// ✒️ executive-enactment lane. Nothing federal changes class or label because of
// this wave.
//
// NEITHER IS A VOTE. gov_signed and gov_vetoed carry act weight 0.70 in
// stance-helpers.js — below a floor roll call (1.00), above a committee vote
// (0.60). They are offered to the record lane's depth arithmetic and to Word vs
// Action's tested set. They are NOT offered to Direction Match, and no surface
// labels either of them with a ballot verb: the labels are exactly "Signed" and
// "Vetoed".
//
// THE FOUR FENCES
//  1. OFFICE → ROSTER ID IS A HUMAN DECISION. A bill action never prints the
//     governor's name, so db/vr-utah-exec-map.json maps (session, office) → roster
//     id and this script only reads it. An act whose session has no officeholder
//     key is counted, reported as droppedNoOfficeholder and DISCARDED.
//  2. NO MAPPING, NO ACT. A signed bill with no reviewed issue mapping stays
//     unsigned to an issue. Its act is not ingested and it does not characterise
//     any row. The reviewed universe is the floor waves' bill lists, the committee
//     waves' bill lists, and db/vr-utah-exec-bills.json for the single bill this
//     wave reviewed itself. There are no LLM-final keys.
//  3. NO MEASURE, NO ACT. An act needs a vr_measures row to hang from. This wave
//     creates exactly one (H.B. 306, for the admitted veto); five other
//     reviewed-and-mapped bills whose governor act is on the record have no measure
//     row and are refused in writing rather than given a measure invented to hold a
//     signature.
//  4. GVETOLI AND GNOSIGN ARE REFUSED BY DESIGN. A line-item veto left the bill in
//     force; "Became Law w/o Governor Signature" is the absence of a gubernatorial
//     act. Neither is ingested, and the refusal is recorded, not silent.
//
// TWO JSON SHAPES. The 2025 session publishes `actionHistoryList` with an
// `actionCode`. Sessions before that publish `actionhistory` with free-text
// `action` and no code. The archive branch matches ANCHORED — /^Governor Signed$/i,
// /^Governor Vetoed$/i — because an unanchored match sweeps "Governor Vetoed Line
// Item" into the veto bucket. The first survey of this wave read only `actionCode`
// and found one 2024 act instead of 543.
//
// THE WAF. le.utah.gov rejects Node's fetch outright ("Request Rejected"). Every
// request shells out to curl with a browser user agent and Accept headers, exactly
// as scripts/vr-utah-ingest.mjs does. A rejection is a hard error, never an empty
// result — an empty result silently becomes a census of zero.
//
// USAGE
//   node scripts/vr-utah-exec-ingest.mjs --collect --session 2025GS   # fetch → cache
//   node scripts/vr-utah-exec-ingest.mjs --census                     # deliverable 1
//   node scripts/vr-utah-exec-ingest.mjs --census --json
//   node scripts/vr-utah-exec-ingest.mjs --seed                       # → db/vr-utah-exec-seed.json
//   node scripts/vr-utah-exec-ingest.mjs --sql --out /tmp/vr-utah-drafts
//   node scripts/vr-utah-exec-ingest.mjs --verify                     # read-only fences
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = (...a) => path.join(ROOT, ...a);
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const CACHE = val("--cache", "/tmp/vr-utah-cache");
const BILLDIR = path.join(CACHE, "bills");
const OUTDIR = val("--out", "/tmp/vr-utah-drafts");
const AS_JSON = has("--json");
const SESSIONS = ["2024GS", "2025GS"];

const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const MAP = readJson(P("db", "vr-utah-exec-map.json"));
const DECISIONS = readJson(P("db", "vr-utah-exec-bills.json"));
const KEYS = readJson(P("db", "issue-keys.json"));
const ISSUE_KEYS = new Set(KEYS.keys);
const MEANINGS = new Set(["yea_supports", "yea_opposes"]);

// ── The WAF ──────────────────────────────────────────────────────────────────
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
function fetchText(url) {
  const body = execFileSync("curl", ["-sS", "--max-time", "40", "-A", UA,
    "-H", "Accept: */*", "-H", "Accept-Language: en-US,en;q=0.9", url], {
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
  if (/Request Rejected/i.test(body)) {
    throw new Error(`le.utah.gov WAF rejected ${url} — a rejection is a hard error, not an empty result`);
  }
  return body;
}

// ── Bill number forms ────────────────────────────────────────────────────────
// The cache and the site key on the padded form (HB0306); vr_measures stores the
// printed form (H.B. 306). Both are needed and they are not interchangeable.
const PREFIX = { HB: "H.B.", SB: "S.B.", HJR: "H.J.R.", SJR: "S.J.R.", HCR: "H.C.R.", SCR: "S.C.R.", HR: "H.R.", SR: "S.R." };
function printedNumber(padded) {
  const m = /^([A-Z]+)(\d+)$/.exec(padded);
  if (!m) return padded;
  return `${PREFIX[m[1]] || m[1]} ${parseInt(m[2], 10)}`;
}
const chamberOf = (padded) => (/^S/.test(padded) ? "utah senate" : "utah house");
const yearOf = (session) => String(session).slice(0, 4);
const billPage = (session, padded) => `https://le.utah.gov/~${yearOf(session)}/bills/static/${padded}.html`;

// A date arrives as "2024-03-13" (archive) or "3/27/2025 9:48 AM" (modern). The
// lane's existing Utah migrations stamp acts at midnight -07:00, so this follows
// them and keeps the printed clock time in the row's note rather than dropping it.
function normDate(raw) {
  const s = String(raw || "").trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(.*))?$/.exec(s);
  if (m) return { date: `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`, printed: s };
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (iso) return { date: iso[1], printed: s };
  return { date: null, printed: s };
}

// ── --collect ────────────────────────────────────────────────────────────────
// The bill list carries no status column and the site publishes no veto-list
// endpoint, so the only source of a gubernatorial act is each bill's own action
// history. That makes the census a full enumeration of the session, not a filter
// over the already-curated universe.
// The list must be the SESSION's list, not the curated universe's, and it must
// include the resolutions: Utah joint and concurrent resolutions go to the governor
// and can carry a GSIGN action. This wave's first enumeration read a bill-only list
// and silently left 45 resolutions of the 2025 session unexamined.
const billListUrl = (session) => `https://le.utah.gov/data/${session}/billlist.json`;
const billJsonUrl = (session, padded) => `https://le.utah.gov/data/${session}/${padded}.json`;

function collect(session) {
  fs.mkdirSync(BILLDIR, { recursive: true });
  const list = JSON.parse(fetchText(billListUrl(session)));
  const bills = (Array.isArray(list) ? list : list.bills || [])
    .map((b) => b.number || b.billNumber || b.bill || b).filter(Boolean);
  if (!bills.length) throw new Error(`${session}: bill list came back empty — refusing to census zero`);
  let fetched = 0, cached = 0, missing = [];
  for (const padded of bills) {
    const f = path.join(BILLDIR, `${session}-${padded}.json`);
    if (fs.existsSync(f) && fs.statSync(f).size > 0) { cached++; continue; }
    const body = fetchText(billJsonUrl(session, padded));
    // A 404 arrives as an HTML page, and an HTML page cached under a .json name is
    // a hole in the census that reads as a bill with no gubernatorial act. Refuse it.
    if (!/^\s*[[{]/.test(body)) { missing.push(padded); continue; }
    fs.writeFileSync(f, body);
    fetched++;
  }
  console.log(`${session}: ${bills.length} in list · ${fetched} fetched · ${cached} already cached` +
    (missing.length ? ` · ${missing.length} not published as JSON: ${missing.join(", ")}` : ""));
}

// ── Reading the acts out of the cache ────────────────────────────────────────
const SIGN = /^Governor Signed$/i;
const VETO = /^Governor Vetoed$/i;
const LINEITEM = /Line Item Veto/i;
const NOSIGN = /^Became Law w\/o Governor Signature$/i;

// Returns [{ act, code, printedText, date, printedDate }] for one bill record.
// `act` is one of gov_signed | gov_vetoed | line_item_veto | no_signature; the
// last two exist so they can be REFUSED out loud rather than never seen.
function actsOf(rec) {
  const out = [];
  const push = (act, code, text, raw) => {
    const d = normDate(raw);
    out.push({ act, code, printedText: text, date: d.date, printedDate: d.printed });
  };
  if (Array.isArray(rec.actionHistoryList)) {
    for (const a of rec.actionHistoryList) {
      const c = String(a.actionCode || "");
      if (c === "GSIGN") push("gov_signed", c, a.description, a.actionDate);
      else if (c === "GVETO") push("gov_vetoed", c, a.description, a.actionDate);
      else if (c === "GVETOLI") push("line_item_veto", c, a.description, a.actionDate);
      else if (c === "GNOSIGN") push("no_signature", c, a.description, a.actionDate);
    }
    return { shape: "modern", acts: out };
  }
  if (Array.isArray(rec.actionhistory)) {
    for (const a of rec.actionhistory) {
      const t = String(a.action || "");
      if (SIGN.test(t)) push("gov_signed", "", t, a.date);
      else if (VETO.test(t)) push("gov_vetoed", "", t, a.date);
      else if (LINEITEM.test(t)) push("line_item_veto", "", t, a.date);
      else if (NOSIGN.test(t)) push("no_signature", "", t, a.date);
    }
    return { shape: "archive", acts: out };
  }
  return { shape: "unknown", acts: out };
}

// ── The reviewed-mapping universe ────────────────────────────────────────────
// Fence 2. A bill is mapped when a HUMAN wrote a mapping for it in one of these
// curator files. Nothing here reads a title and guesses.
function reviewedUniverse() {
  const u = new Map(); // "SESSION|BILL" -> { issues, from }
  const add = (session, bills, from) => {
    for (const b of bills || []) {
      if (!b.bill || !(b.issues || []).length) continue;
      const k = `${session}|${b.bill}`;
      if (!u.has(k)) u.set(k, { issues: b.issues, from });
    }
  };
  const maybe = (f) => (fs.existsSync(P("db", f)) ? readJson(P("db", f)) : { bills: [] });
  add("2025GS", maybe("vr-utah-bills.json").bills, "floor-wave");
  add("2024GS", maybe("vr-utah-bills-2024GS.json").bills, "floor-wave");
  add("2025GS", maybe("vr-utah-committee-bills-2025GS.json").bills, "committee-wave");
  add("2024GS", maybe("vr-utah-committee-bills-2024GS.json").bills, "committee-wave");
  for (const b of DECISIONS.bills || []) add(b.session, [b], "exec-wave-E1");
  return u;
}

// ── The measure inventory ────────────────────────────────────────────────────
// Fence 3. An act needs somewhere to hang. Rather than trust a list, this reads
// the applied migrations and takes the (session, printed number) pairs they
// actually insert. `createdHere` is the one measure this wave's own migration
// creates, so an act on it is admissible even though no applied migration has it.
// WHICH FILES ARE SCANNED, AND WHY IT IS NOT THE ONES WITH "utah" IN THE NAME.
// The first cut of this function read only migrations matching /utah/, and it was
// wrong: 20261010000000_vr_vocab_wave_v1.sql creates five Utah measures — 2025GS
// H.B. 67, S.B. 26, S.B. 316, S.B. 336 and 2024GS H.B. 348 — because their issue
// keys were minted in the vocabulary wave rather than in a Utah data wave. Missing
// that file made fence 4 refuse five signed bills as "mapped but no measure row"
// when the row was there all along, which is the worst kind of refusal: it reads
// as reviewed. So the scan is every migration, and a segment counts only if it is
// unmistakably a Utah measure — a state chamber AND a utahSession stamp inside the
// same INSERT.
function measureInventory() {
  const dir = P("netlify", "database", "migrations");
  const have = new Set();
  // AND IT SKIPS THIS WAVE'S OWN FILE. Once the E1 migration is in the tree it
  // contains an INSERT INTO vr_measures for H.B. 306, so counting it would make
  // the generator decide the measure already exists and stop emitting the block
  // that creates it — a re-run would quietly drop the create and the mapping, and
  // the pack-generation line above it would then be describing a row nothing
  // writes. The inventory answers "what the REST of the tree already has".
  const SELF = /_vr_utah_exec_e1_signed_vetoed\.sql$/;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !SELF.test(x)).sort()) {
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    const re = /INSERT INTO vr_measures[\s\S]{0,1600}?;/g;
    let m;
    while ((m = re.exec(sql))) {
      const seg = m[0];
      if (!/'utah (?:house|senate)'/.test(seg)) continue;
      const num = /'((?:H|S)\.(?:B|J\.R|C\.R|R)\.\s*\d+)'/.exec(seg);
      const ses = /'utahSession',\s*'(\d{4}GS)'/.exec(seg) || /(\d{4}GS)/.exec(seg);
      if (num && ses) have.add(`${ses[1]}|${num[1]}`);
    }
  }
  return have;
}
const createdHere = () =>
  new Set((DECISIONS.bills || []).map((b) => `${b.session}|${b.number || printedNumber(b.bill)}`));

// ── The census / the admission pass ──────────────────────────────────────────
// One walk, because the census and the seed must not be able to disagree: the
// numbers reported in the runbook are the numbers the seed was built from.
function pass() {
  if (!fs.existsSync(BILLDIR)) {
    throw new Error(`${BILLDIR} does not exist — run --collect first`);
  }
  const universe = reviewedUniverse();
  const haveMeasure = measureInventory();
  const willCreate = createdHere();
  const bySession = {};
  const admitted = [];
  const refused = { unmappedBill: [], noMeasureRow: [], lineItemVeto: [], noSignature: [], noOfficeholder: [] };

  for (const f of fs.readdirSync(BILLDIR).sort()) {
    const m = /^(\d{4}GS)-(.+)\.json$/.exec(f);
    if (!m) continue;
    const [, session, padded] = m;
    if (!SESSIONS.includes(session)) continue;
    // A cache file that will not parse is a hole in the census, not a bill to skip.
    let rec;
    try { rec = readJson(path.join(BILLDIR, f)); }
    catch (e) { throw new Error(`${f} in ${BILLDIR} is not JSON (a cached 404 page?) — delete it and re-run --collect; skipping it would understate the census`); }
    const S = (bySession[session] ||= {
      billsEnumerated: 0, gov_signed: 0, gov_vetoed: 0, line_item_veto: 0, no_signature: 0,
      signedReviewedMapped: 0, vetoedReviewedMapped: 0,
    });
    S.billsEnumerated++;
    const { acts } = actsOf(rec);
    if (!acts.length) continue;

    const title = rec.shortTitle || rec.shorttitle || "";
    const number = printedNumber(padded);
    const key = `${session}|${padded}`;
    const mapped = universe.get(key) || null;
    const measureKey = `${session}|${number}`;
    const hasMeasure = haveMeasure.has(measureKey) || willCreate.has(measureKey);

    for (const a of acts) {
      S[a.act]++;
      if (a.act === "line_item_veto") { refused.lineItemVeto.push({ session, bill: padded, title, date: a.date }); continue; }
      if (a.act === "no_signature") { refused.noSignature.push({ session, bill: padded, title, date: a.date }); continue; }
      if (mapped && a.act === "gov_signed") S.signedReviewedMapped++;
      if (mapped && a.act === "gov_vetoed") S.vetoedReviewedMapped++;

      const officeholder = ((MAP.sessions || {})[session] || {}).governor;
      if (!officeholder) { refused.noOfficeholder.push({ session, bill: padded, act: a.act }); continue; }
      if (!mapped) { refused.unmappedBill.push({ session, bill: padded, title, act: a.act }); continue; }
      if (!hasMeasure) { refused.noMeasureRow.push({ session, bill: padded, number, title, act: a.act }); continue; }

      admitted.push({
        session, bill: padded, number, chamber: chamberOf(padded), title,
        politicianId: officeholder, actionType: a.act,
        supports: a.act === "gov_signed",
        actedAt: a.date, printedDate: a.printedDate,
        printedText: a.printedText, actionCode: a.code,
        sourceUrl: billPage(session, padded),
        mappingFrom: mapped.from, issues: mapped.issues,
        measureCreatedByThisWave: willCreate.has(measureKey) && !haveMeasure.has(measureKey),
      });
    }
  }
  admitted.sort((a, b) =>
    a.session.localeCompare(b.session) || a.bill.localeCompare(b.bill) || a.actionType.localeCompare(b.actionType));
  return { bySession, admitted, refused };
}

// ── --verify ─────────────────────────────────────────────────────────────────
// Every fence checked before anything downstream sees it, because a bad row here
// becomes a sentence about a person on a public page.
function verify() {
  const problems = [];
  for (const [session, row] of Object.entries(MAP.sessions || {})) {
    if (!SESSIONS.includes(session)) problems.push(`map names session ${session}, outside this wave's window`);
    if (!row.governor) problems.push(`map session ${session} has no governor id`);
  }
  for (const b of DECISIONS.bills || []) {
    if (!SESSIONS.includes(b.session)) problems.push(`${b.bill}: session ${b.session} outside window`);
    for (const i of b.issues || []) {
      if (!ISSUE_KEYS.has(i.issueKey)) problems.push(`${b.bill}: ${i.issueKey} is not a shipped issue key`);
      if (!MEANINGS.has(i.supportMeaning)) problems.push(`${b.bill}: bad supportMeaning ${i.supportMeaning}`);
      if (!(i.weight > 0 && i.weight <= 100)) problems.push(`${b.bill}: weight out of range`);
      if (!String(i.rationale || "").trim()) problems.push(`${b.bill}: ${i.issueKey} has no rationale`);
    }
  }
  const { admitted } = pass();
  for (const a of admitted) {
    if (a.actionType !== "gov_signed" && a.actionType !== "gov_vetoed") problems.push(`${a.bill}: action_type ${a.actionType} is not in this lane`);
    if (!a.actedAt) problems.push(`${a.bill}: act has no usable date`);
    if (!/^https:\/\/le\.utah\.gov\//.test(a.sourceUrl)) problems.push(`${a.bill}: source url is not le.utah.gov`);
    if (/\bvote[ds]?\b|\byea\b|\bnay\b/i.test(a.printedText)) problems.push(`${a.bill}: printed act text reads like a vote`);
  }
  if (problems.length) { for (const p of problems) console.log(`FAIL ${p}`); process.exitCode = 1; }
  else console.log(`OK — ${admitted.length} admitted act(s), every fence held`);
}

// ── --census ─────────────────────────────────────────────────────────────────
function census() {
  const { bySession, admitted, refused } = pass();
  const byType = admitted.reduce((o, a) => ((o[a.actionType] = (o[a.actionType] || 0) + 1), o), {});
  if (AS_JSON) {
    console.log(JSON.stringify({ bySession, admitted: byType, admittedTotal: admitted.length,
      refused: Object.fromEntries(Object.entries(refused).map(([k, v]) => [k, v.length])) }, null, 2));
    return;
  }
  for (const s of SESSIONS) {
    const r = bySession[s]; if (!r) continue;
    console.log(`\n── ${s} ── ${r.billsEnumerated} bill record(s) enumerated`);
    console.log(`  Governor Signed              ${String(r.gov_signed).padStart(4)}   of which reviewed-mapped: ${r.signedReviewedMapped}`);
    console.log(`  Governor Vetoed              ${String(r.gov_vetoed).padStart(4)}   of which reviewed-mapped: ${r.vetoedReviewedMapped}`);
    console.log(`  line item veto (refused)     ${String(r.line_item_veto).padStart(4)}`);
    console.log(`  became law w/o sig (refused) ${String(r.no_signature).padStart(4)}`);
  }
  console.log(`\nADMITTED  ${admitted.length} act(s): ${JSON.stringify(byType)}`);
  console.log(`REFUSED   ${refused.unmappedBill.length} on an unmapped bill · ${refused.noMeasureRow.length} mapped with no measure row · ` +
    `${refused.lineItemVeto.length} line item veto · ${refused.noSignature.length} became law w/o signature · ${refused.noOfficeholder.length} no officeholder`);
  for (const b of refused.noMeasureRow) console.log(`   no measure row: ${b.session} ${b.bill} (${b.number}) ${b.act} — ${b.title}`);
}

// ── --seed ───────────────────────────────────────────────────────────────────
function seed() {
  const { bySession, admitted, refused } = pass();
  const byType = admitted.reduce((o, a) => ((o[a.actionType] = (o[a.actionType] || 0) + 1), o), {});
  const byPid = admitted.reduce((o, a) => ((o[a.politicianId] = (o[a.politicianId] || 0) + 1), o), {});
  const doc = {
    _comment: "Utah executive formal lane seed — wave E1. Recorded gubernatorial acts (Governor Signed / Governor Vetoed) as vr_positions rows of action_type gov_signed / gov_vetoed. Generated by scripts/vr-utah-exec-ingest.mjs --seed from the le.utah.gov bill action histories, db/vr-utah-exec-map.json and db/vr-utah-exec-bills.json. Do not hand-edit.",
    generatedBy: "scripts/vr-utah-exec-ingest.mjs",
    sessions: SESSIONS,
    _notAVote: "gov_signed and gov_vetoed are acts, not ballots. Act weight 0.70 each — below a floor roll call, above a committee vote. Neither is offered to Direction Match and neither is ever labeled with a ballot verb.",
    counts: {
      bySession,
      admitted: byType,
      admittedTotal: admitted.length,
      byPolitician: byPid,
      refused: Object.fromEntries(Object.entries(refused).map(([k, v]) => [k, v.length])),
    },
    measuresCreatedByThisWave: admitted.filter((a) => a.measureCreatedByThisWave)
      .map((a) => ({ session: a.session, bill: a.bill, number: a.number, chamber: a.chamber, title: a.title })),
    acts: admitted.map((a) => ({
      session: a.session, bill: a.bill, number: a.number, chamber: a.chamber, title: a.title,
      politicianId: a.politicianId, actionType: a.actionType, supports: a.supports,
      actedAt: a.actedAt, printedDate: a.printedDate, printedText: a.printedText,
      actionCode: a.actionCode, sourceUrl: a.sourceUrl, mappingFrom: a.mappingFrom,
    })),
    refused: {
      _why: "Written refusals, per the wave brief. Prose for each bucket lives in db/vr-utah-exec-bills.json; these are the rows.",
      unmappedBill: refused.unmappedBill,
      noMeasureRow: refused.noMeasureRow,
      lineItemVeto: refused.lineItemVeto,
      noSignature: refused.noSignature,
      droppedNoOfficeholder: refused.noOfficeholder,
    },
  };
  fs.writeFileSync(P("db", "vr-utah-exec-seed.json"), JSON.stringify(doc, null, 1) + "\n");
  console.log(`wrote db/vr-utah-exec-seed.json — ${admitted.length} act(s) ${JSON.stringify(byType)} for ${JSON.stringify(byPid)}`);
}

// ── --sql ────────────────────────────────────────────────────────────────────
// Writes a .sql.draft. A human names it and moves it into
// netlify/database/migrations/ with a stamp AFTER the current tail; nothing here
// touches an applied migration, and nothing here generates a wall-clock stamp
// that could sort earlier than one already applied.
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

function sqlDraft() {
  const { admitted } = pass();
  const L = [];
  const byBill = new Map();
  for (const a of admitted) {
    const k = `${a.session}|${a.bill}`;
    if (!byBill.has(k)) byBill.set(k, []);
    byBill.get(k).push(a);
  }
  const mappingRows = (DECISIONS.bills || []).reduce((n, b) => n + (b.issues || []).length, 0);
  L.push("-- Utah executive formal lane — wave E1: recorded gubernatorial acts.");
  L.push(`-- ${admitted.length} act(s) across ${byBill.size} bill(s). Generated by scripts/vr-utah-exec-ingest.mjs --sql.`);
  L.push("-- gov_signed / gov_vetoed are acts, not ballots. Neither is a vote and neither is");
  L.push("-- offered to Direction Match. Every insert is idempotent.");
  // The offline pack's blob key fingerprints vr_measure_issues, so a wave that
  // writes even one mapping row retires every member's pack by making its key
  // unreachable. scripts/test-vr-mapping-migration-pack-step.mjs fails CI on a
  // mapping migration that ships without this line, and asserts this generator
  // still prints it.
  L.push("--");
  L.push(`-- pack-generation: derived — up to ${mappingRows} vr_measure_issues row(s) below, each`);
  L.push("--   guarded by NOT EXISTS so a re-state is a no-op. Every row that actually lands");
  L.push("--   moves mappingVersion() in netlify/lib/vr-pack.ts: both the row count and the");
  L.push("--   md5 over the ordered (measure_id, issue_key, weight, is_primary,");
  L.push("--   support_meaning, rationale) tuples change. The pack key");
  L.push("--   member:<pid>@m<count>-<hash> therefore bumps for every member, so no blob built");
  L.push("--   before this deploy can be served after it and the six-hour PACK_TTL_MS is not");
  L.push("--   what does the retiring. Confirm the version moved with");
  L.push("--   scripts/test-vr-pack-key-version.mjs once the migration lands.");
  L.push("--");
  L.push("");
  const decisionFor = (session, bill) => (DECISIONS.bills || []).find((b) => b.session === session && b.bill === bill);

  for (const [k, acts] of byBill) {
    const a = acts[0];
    const dec = a.measureCreatedByThisWave ? decisionFor(a.session, a.bill) : null;
    L.push(`-- ${a.bill} · ${a.number} · ${a.title} (mapping: ${a.mappingFrom})`);
    L.push("DO $$");
    L.push("DECLARE m_id integer;");
    L.push("BEGIN");
    L.push(`  SELECT id INTO m_id FROM vr_measures`);
    L.push(`   WHERE number = ${q(a.number)} AND chamber = ${q(a.chamber)}`);
    L.push(`     AND external_ids->>'utahSession' = ${q(a.session)} LIMIT 1;`);
    if (dec) {
      L.push("  IF m_id IS NULL THEN");
      L.push("    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,");
      L.push("      short_title, summary, status, source_url, source_label, external_ids)");
      L.push(`    VALUES ('bill', NULL, ${q(a.chamber)}, ${q(a.number)}, ${q(dec.title)},`);
      L.push(`      ${q(dec.title)}, ${q(dec.generalProvisions || "")}, ${q(dec.status || "vetoed")},`);
      L.push(`      ${q(dec.sourceUrl || a.sourceUrl)}, 'Utah State Legislature',`);
      L.push(`      jsonb_build_object('utahSession', ${q(a.session)}, 'utahBill', ${q(a.bill)},`);
      L.push(`        'primeSponsor', ${q(dec.primeSponsor || "")}, 'floorSponsor', ${q(dec.floorSponsor || "")},`);
      L.push(`        'mappingReadFrom', ${q(dec.textKind || "enrolled")}, 'mappingTextUrl', ${q(dec.textUrl || "")},`);
      L.push("        'execActOnly', true))");
      L.push("    RETURNING id INTO m_id;");
      L.push("  END IF;");
      for (const i of dec.issues || []) {
        L.push("  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues");
        L.push(`                  WHERE measure_id = m_id AND issue_key = ${q(i.issueKey)}) THEN`);
        L.push("    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,");
        L.push("      support_meaning, rationale, source_url)");
        L.push(`    VALUES (m_id, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"},`);
        L.push(`      ${q(i.supportMeaning)}, ${q(i.rationale)}, ${q(dec.textUrl || dec.sourceUrl)});`);
        L.push("  END IF;");
      }
    } else {
      L.push("  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act");
    }
    L.push("  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES");
    L.push(acts.map((x) =>
      `    (m_id, ${q(x.politicianId)}, ${q(x.actionType)}, ${x.supports}, ` +
      `${q(`${x.actedAt}T00:00:00-07:00`)}::timestamptz, ${q(x.sourceUrl)}, ` +
      `${q(`${x.printedText} · ${x.printedDate} · le.utah.gov bill status action history${x.actionCode ? ` · action code ${x.actionCode}` : ""}`)})`
    ).join(",\n"));
    L.push("  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;");
    L.push("END $$;");
    L.push("");
  }
  fs.mkdirSync(OUTDIR, { recursive: true });
  const out = path.join(OUTDIR, "vr_utah_exec_e1_signed_vetoed.sql.draft");
  fs.writeFileSync(out, L.join("\n"));
  console.log(`wrote ${out} — ${admitted.length} act(s), ${byBill.size} DO block(s)`);
}

// ── main ─────────────────────────────────────────────────────────────────────
if (has("--collect")) { for (const s of (val("--session", null) ? [val("--session")] : SESSIONS)) collect(s); }
else if (has("--verify")) verify();
else if (has("--seed")) seed();
else if (has("--sql")) sqlDraft();
else census();
