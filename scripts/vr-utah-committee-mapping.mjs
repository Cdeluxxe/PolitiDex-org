#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// UTAH COMMITTEE MAPPING — data wave 4's curator bench and generator
// ─────────────────────────────────────────────────────────────────────────────
// Wave 3 shipped Utah committee votes and left one thing behind, named in the
// runbook as "the single largest available gain": 314 bills (173 in 2025GS, 141 in
// 2024GS) that had a CONTESTED pass-out-favorably vote in a standing committee and
// were refused for one reason only — nobody had reviewed an issue mapping for the
// parent bill. The acts were already extracted, already confirmed against the
// published PDF, already resolved to reviewed politician identities, and thrown away
// at the last fence.
//
// This is the tool for that pass. It is deliberately three separate things, because
// only the middle one is a judgement and the other two must not be able to fake it:
//
//   --worksheet  READS. For each bill in the bucket it prints the brief a curator
//                needs: the enrolled text's own long title and highlighted
//                provisions, the legislature's subject codes, the code sections
//                amended and enacted, the committee acts with their tallies, and
//                keyword candidates from the SHIPPED vocabulary with the keyword that
//                fired named. It proposes no direction, no weight and no primary.
//   (a human)    DECIDES, into db/vr-utah-committee-bills-<SESSION>.json — the same
//                shape as wave 1's db/vr-utah-bills.json, admitted bills under
//                `bills` and every other bill under `_refused` with prose saying why.
//   --seed/--sql WRITES. Reads that file, re-runs the committee ingest with those
//                mappings supplied as `extraLane`, and emits the seed and migration.
//                It cannot admit anything the decision file does not admit, and it
//                refuses to run at all if the decision file does not account for
//                every bill in the bucket.
//
// ── THE FENCES THIS PASS RUNS UNDER ─────────────────────────────────────────
//  1. NO NEW ISSUE KEYS. The default is refusal. A bill with no home among the 118
//     shipped keys is refused and the refusal says so; inventing a key to give a bill
//     somewhere to live would make the vocabulary a function of the corpus.
//  2. ONE PRIMARY KEY PER BILL, and a second key only when a DISTINCT provision
//     earns it. Weight is how squarely the bill is about the key — at or below
//     PDXExecRecordUI.NARROW_AT (45) the surfaces print it as a narrow link, which is
//     the honest label for a provision-level key.
//  3. NO CIRCULAR STANCES and no two-way bills. If a nay is honestly describable as
//     opposition to the key AND as support for it — S.B. 197's owner/renter split,
//     S.B. 327's own coordination clause — the bill is refused. Runbook rule 22 in
//     the wave-1 form: support_meaning scores the nay bloc just as hard as the yea
//     bloc, so a key that misreads either flank is disqualified.
//  4. THE TEXT IS THE BILL. Every decision is read out of the enrolled text, or the
//     last substitute where the bill never enrolled, fetched by
//     scripts/vr-utah-bill-text.mjs and cited by the version it came from. A bill
//     whose title and text disagree is decided on the text.
//  5. A CLOSE COMMITTEE MARGIN IS NOT EVIDENCE OF ANYTHING. It is why the bill is in
//     the bucket; it is not a reason to find a key for it.
//  6. NO FLOOR IS LOWERED. No floor action code is widened, the 10%-minority bar is
//     untouched, committee acts stay at the existing 0.60 `committee_vote` weight,
//     and no measure gets a rollcall row it did not earn.
//
// USAGE
//   node scripts/vr-utah-committee-mapping.mjs --worksheet --session 2025GS
//   node scripts/vr-utah-committee-mapping.mjs --worksheet --session 2025GS --bill HB0015
//   node scripts/vr-utah-committee-mapping.mjs --verify   --session 2025GS
//   node scripts/vr-utah-committee-mapping.mjs --dropped  --session 2024GS   # read-only
//   node scripts/vr-utah-committee-mapping.mjs --seed     --session 2025GS
//   node scripts/vr-utah-committee-mapping.mjs --sql      --session 2025GS --out DIR
//   node scripts/vr-utah-committee-mapping.mjs --sql      --session 2024GS --out DIR \
//        --bills HB0137,HB0267,HB0463 --name renamed_committee --reason "..."
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collect } from "./vr-utah-committee-ingest.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = (...a) => path.join(ROOT, ...a);
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const SESSION = val("--session", "2025GS");
const OUTDIR = val("--out", "/tmp/vr-utah-drafts");
const TEXTCACHE = val("--text-cache", "/tmp/vr-utah-bill-text");
const BUCKET = val("--bucket-file", `/tmp/bucket-${SESSION}.json`);
const AS_JSON = has("--json");

const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const decisionFile = (s) => P("db", `vr-utah-committee-bills-${s}.json`);
const mappingSeedFile = (s) => P("db", `vr-utah-committee-mapping-seed-${s}.json`);

const KEYS = readJson(P("db", "issue-keys.json"));
const ISSUE_KEYS = new Set(KEYS.keys);
const KEYWORDS = KEYS.keywords || {};
const MEANINGS = new Set(["yea_supports", "yea_opposes"]);
const NARROW_AT = 45;

// ── The bucket and the texts ─────────────────────────────────────────────────
function bucket(session) {
  if (!fs.existsSync(BUCKET)) {
    throw new Error(
      `${BUCKET} does not exist — run:\n` +
      `  node scripts/vr-utah-committee-ingest.mjs --bucket --session ${session} --json > ${BUCKET}`);
  }
  const j = readJson(BUCKET);
  if (j.session !== session) throw new Error(`${BUCKET} is for ${j.session}, not ${session}`);
  return j;
}

function texts(session) {
  const f = path.join(TEXTCACHE, `${session}.bills.json`);
  if (!fs.existsSync(f)) {
    throw new Error(
      `${f} does not exist — run:\n` +
      `  node scripts/vr-utah-bill-text.mjs --from ${BUCKET} --session ${session}`);
  }
  const out = new Map();
  for (const b of readJson(f).bills || []) out.set(b.bill, b);
  return out;
}

const bodyOf = (rec) => {
  try { return rec && rec.textFile && fs.existsSync(rec.textFile) ? fs.readFileSync(rec.textFile, "utf8") : ""; }
  catch { return ""; }
};

// Keyword containment against the shipped vocabulary — the same containment
// scripts/vr-mapping-draft.mjs runs, and it is a READING AID, not a ranking of
// truth. A title hit is a claim about what the bill IS; a body hit is a claim that
// the bill mentions the word somewhere in forty thousand characters of code
// amendments, which on a Utah bill is very often an incidental cross-reference.
export function candidates(title, text, limit = 14) {
  const t = String(title || "").toLowerCase();
  const x = String(text || "").toLowerCase();
  const out = [];
  for (const key of Object.keys(KEYWORDS)) {
    if (!ISSUE_KEYS.has(key)) continue;
    const inTitle = [], inText = [];
    for (const kw of KEYWORDS[key] || []) {
      const k = String(kw || "").toLowerCase();
      if (!k) continue;
      if (t.includes(k)) inTitle.push(kw);
      else if (x && x.includes(k)) inText.push(kw);
    }
    if (!inTitle.length && !inText.length) continue;
    out.push({ issueKey: key, inTitle, inText, evidence: inTitle.length ? "title" : "text" });
  }
  out.sort((a, b) => {
    if (a.evidence !== b.evidence) return a.evidence === "title" ? -1 : 1;
    const an = a.inTitle.length + a.inText.length, bn = b.inTitle.length + b.inText.length;
    return bn - an || a.issueKey.localeCompare(b.issueKey);
  });
  return out.slice(0, limit);
}

// ── --worksheet ──────────────────────────────────────────────────────────────
function worksheet(session) {
  const bk = bucket(session);
  const tx = texts(session);
  const only = val("--bill", null);
  const rows = bk.bills.filter((b) => !only || b.bill === only);
  if (AS_JSON) {
    console.log(JSON.stringify(rows.map((b) => {
      const t = tx.get(b.bill) || {};
      return {
        bill: b.bill, number: t.number, title: t.title, chamber: t.chamber,
        textKind: t.textKind, textChars: t.textChars, textUrl: t.textUrl, billPage: t.billPage,
        lastAction: t.lastAction, moniesAppropriated: t.moniesAppropriated,
        generalProvisions: t.generalProvisions, highlightedProvisions: t.highlightedProvisions,
        subjects: t.subjects, sectionsAffected: t.sectionsAffected,
        acts: b.acts, candidates: candidates(t.title, bodyOf(t)),
      };
    }, null, 2), null, 2));
    return;
  }
  for (const b of rows) {
    const t = tx.get(b.bill) || {};
    console.log(`\n${"═".repeat(78)}\n${b.bill}  ${t.number || ""}  ${t.title || "(no title)"}`);
    console.log(`  text: ${t.textKind || "NONE"} ${t.textChars || 0} chars · last action: ${t.lastAction || "?"} · money: ${t.moniesAppropriated || "?"}`);
    console.log(`  subjects: ${(t.subjects || []).join("; ") || "-"}`);
    console.log(`  sections: ${(t.sectionsAffected || []).slice(0, 14).join(", ")}${(t.sectionsAffected || []).length > 14 ? " …" : ""}`);
    console.log(`  general: ${t.generalProvisions || "-"}`);
    console.log(`  highlighted:${t.highlightedProvisions ? "\n    " + t.highlightedProvisions.replace(/\n/g, "\n    ") : " -"}`);
    for (const a of b.acts) console.log(`  act: ${a.date} ${a.committee} ${a.yea}-${a.nay}-${a.absent}  "${a.motion}"`);
    console.log(`  candidates: ${candidates(t.title, bodyOf(t)).map((c) => `${c.issueKey}[${c.evidence}:${(c.inTitle.length ? c.inTitle : c.inText).slice(0, 3).join("/")}]`).join(" ")}`);
  }
  console.log(`\n${rows.length} bill(s)`);
}

// ── The decision file ────────────────────────────────────────────────────────
// Loaded with every fence checked BEFORE anything downstream sees it, because a
// malformed mapping that reaches the seed becomes a sentence about a person.
export function loadDecisions(session, { require: needFile = true } = {}) {
  const f = decisionFile(session);
  if (!fs.existsSync(f)) {
    if (!needFile) return { bills: [], _refused: [] };
    throw new Error(`${path.relative(ROOT, f)} does not exist — run --worksheet, decide, commit it`);
  }
  const j = readJson(f);
  const errs = [];
  const seen = new Set();
  for (const b of j.bills || []) {
    if (seen.has(b.bill)) errs.push(`${b.bill}: appears twice under bills`);
    seen.add(b.bill);
    const issues = b.issues || [];
    if (!issues.length) { errs.push(`${b.bill}: admitted with no issue mapping`); continue; }
    let primaries = 0;
    const keys = new Set();
    for (const it of issues) {
      if (!ISSUE_KEYS.has(it.issueKey)) errs.push(`${b.bill}: "${it.issueKey}" is not a shipped issue key`);
      if (!MEANINGS.has(it.supportMeaning)) errs.push(`${b.bill}/${it.issueKey}: supportMeaning states no direction`);
      if (!Number.isInteger(it.weight) || it.weight <= 0 || it.weight > 100) errs.push(`${b.bill}/${it.issueKey}: weight is not 1–100`);
      if (typeof it.rationale !== "string" || it.rationale.trim().length < 80) errs.push(`${b.bill}/${it.issueKey}: rationale is not prose`);
      if (keys.has(it.issueKey)) errs.push(`${b.bill}: issue key ${it.issueKey} appears twice`);
      keys.add(it.issueKey);
      if (it.isPrimary) primaries++;
    }
    if (primaries !== 1) errs.push(`${b.bill}: has ${primaries} primary issues, not 1`);
  }
  for (const r of j._refused || []) {
    if (typeof r.why !== "string" || r.why.trim().length < 40) errs.push(`${r.bill}: refusal does not say why in prose`);
    if (seen.has(r.bill)) errs.push(`${r.bill}: both admitted and refused`);
  }
  if (errs.length) throw new Error(`${path.relative(ROOT, f)}:\n  ` + errs.join("\n  "));
  return j;
}

// Every bill in the bucket is accounted for, in one direction or the other. This is
// the check that makes "refused the rest in writing" mean something: a bill nobody
// looked at is neither admitted nor refused, and silence would read as a refusal
// without a reason.
export function accountability(session) {
  const bk = bucket(session);
  const dec = loadDecisions(session, { require: false });
  const inBucket = new Set(bk.bills.map((b) => b.bill));
  const admitted = new Set((dec.bills || []).map((b) => b.bill));
  const refused = new Set((dec._refused || []).map((r) => r.bill));
  // A BILL CAN LEAVE THIS BUCKET WITHOUT ANYONE HERE MOVING IT. The bucket is
  // "had a committee vote and has NO reviewed issue mapping", so the moment another
  // wave reviews a mapping for one of these bills it stops being this lane's
  // problem and becomes the formal lane's — the committee-vote ingest picks it up
  // under the keys that wave reviewed. That is a legitimate exit and it happened
  // to four bills when vocabulary wave V1 shipped. It is still a divergence between
  // a committed decision file and the bucket the tool recomputes, so it is not
  // waved through: the refusal has to say so with `leftTheBucket: true`, and a flag
  // on a bill that is still in the bucket is itself an error rather than a licence.
  const flagged = new Set((dec._refused || []).filter((r) => r.leftTheBucket).map((r) => r.bill));
  return {
    session,
    bucket: inBucket.size,
    admitted: admitted.size,
    refused: refused.size,
    unaccounted: [...inBucket].filter((b) => !admitted.has(b) && !refused.has(b)).sort(),
    strangers: [...admitted, ...refused].filter((b) => !inBucket.has(b) && !flagged.has(b)).sort(),
    leftBucket: [...flagged].filter((b) => !inBucket.has(b)).sort(),
    mislabelled: [...flagged].filter((b) => inBucket.has(b)).sort(),
  };
}

// ── --seed ───────────────────────────────────────────────────────────────────
// The measures the decision file admits, with the committee acts the ingest builds
// for them once their mappings are supplied as `extraLane`. Every fence in that file
// still runs: the contested bar, the PDF confirmation, the reviewed name map.
export function buildSeed(session) {
  const dec = loadDecisions(session);
  const acct = accountability(session);
  if (acct.unaccounted.length) {
    throw new Error(`${acct.unaccounted.length} bill(s) in the ${session} bucket are neither admitted nor refused: ` +
      acct.unaccounted.join(", "));
  }
  if (acct.mislabelled.length) {
    throw new Error(`${acct.mislabelled.length} refusal(s) in the ${session} decision file claim the bill left ` +
      `the bucket, but the bucket still holds it: ` + acct.mislabelled.join(", "));
  }
  const tx = texts(session);
  const extraLane = new Map();
  for (const b of dec.bills) {
    const t = tx.get(b.bill);
    if (!t) throw new Error(`${b.bill}: admitted but has no fetched bill text record`);
    if (!t.textOk) throw new Error(`${b.bill}: admitted but its text was never readable (${t.error || "?"})`);
    extraLane.set(b.bill, {
      session, utahBill: b.bill, number: t.number, title: t.title, chamber: t.chamber,
      measureType: "bill", status: statusOf(t.lastAction),
      sourceUrl: t.billPage, sourceLabel: "Utah State Legislature",
      primeSponsor: t.primeSponsor, floorSponsor: t.floorSponsor,
      generalProvisions: t.generalProvisions,
      textKind: t.textKind, textUrl: t.textUrl,
      issues: b.issues, rollcalls: [],
    });
  }
  const { rep, acts, kept, lane, floorVoters } = collect(session, { reviewedMapRequired: true, extraLane });

  const byBill = new Map();
  for (const [k, v] of kept) {
    const bill = k.split("|")[0];
    if (!extraLane.has(bill)) continue;      // wave 3's own measures are already shipped
    if (!byBill.has(bill)) byBill.set(bill, []);
    byBill.get(bill).push(v);
  }
  const measures = [];
  let actCount = 0, positions = 0, superseded = 0, fresh = 0;
  for (const bill of [...extraLane.keys()].sort()) {
    const m = extraLane.get(bill);
    const rows = byBill.get(bill) || [];
    if (!rows.length) continue;              // admitted, but no act survived the fences
    const byAct = new Map();
    for (const r of rows) {
      const a = r.act;
      const id = `${a.meeting}|${a.motion}`;
      if (!byAct.has(id)) byAct.set(id, { act: a, votes: [] });
      const sup = (floorVoters.get(bill) || new Set()).has(r.politicianId);
      if (sup) superseded++; else fresh++;
      byAct.get(id).votes.push({
        politicianId: r.politicianId, supports: r.supports, printedAs: r.printed,
        supersededByFloorVote: sup,
      });
      positions++;
    }
    const committeeActs = [...byAct.values()].map(({ act, votes }) => {
      actCount++;
      return {
        meetingId: act.meeting, committee: act.committee, committeeChamber: act.chamber,
        date: act.date, motion: act.motion, result: act.result,
        printedTotals: { yea: act.yea, nay: act.nay, absent: act.absent },
        sourceUrl: act.sourceUrl, minutesUrl: act.minutesUrl,
        votes: votes.sort((a, b) => a.politicianId.localeCompare(b.politicianId)),
      };
    }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : Number(a.meetingId) - Number(b.meetingId)));
    measures.push({
      session, utahBill: bill, number: m.number, title: m.title, chamber: m.chamber,
      measureType: "bill", status: m.status,
      sourceUrl: m.sourceUrl, sourceLabel: m.sourceLabel,
      primeSponsor: m.primeSponsor, floorSponsor: m.floorSponsor,
      generalProvisions: m.generalProvisions,
      textKind: m.textKind, textUrl: m.textUrl,
      issues: m.issues, committeeActs,
    });
  }
  const admittedNoAct = [...extraLane.keys()].filter((b) => !(byBill.get(b) || []).length).sort();
  const seed = {
    _comment:
      "Utah committee-mapping seed — data wave 4. Measures whose ONLY recorded positions are " +
      "standing-committee votes, mapped onto existing ISSUE_MAP keys by reading the enrolled " +
      "text. Generated by scripts/vr-utah-committee-mapping.mjs --seed from " +
      `db/vr-utah-committee-bills-${session}.json. Do not hand-edit.`,
    generatedBy: "scripts/vr-utah-committee-mapping.mjs",
    session,
    counts: {
      bucket: acct.bucket, admitted: acct.admitted, refused: acct.refused,
      measures: measures.length, issueMappings: measures.reduce((n, m) => n + m.issues.length, 0),
      committeeActs: actCount, positions,
      supersededByFloorVote: superseded, notOnAnyFloorRoll: fresh,
      admittedButNoActSurvived: admittedNoAct.length,
    },
    admittedButNoActSurvived: admittedNoAct,
    measures,
  };
  return { seed, rep, acts, lane };
}

// A Utah bill's status, from the legislature's own last action. Only the two states
// the client already prints are used; anything else stays "introduced" rather than
// inventing a vocabulary.
function statusOf(lastAction) {
  const s = String(lastAction || "").toLowerCase();
  if (/governor signed|filed without signature|veto override/.test(s)) return "enacted";
  if (/vetoed/.test(s)) return "vetoed";
  return "introduced";
}

// ── --sql ────────────────────────────────────────────────────────────────────
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qn = (s) => (s == null || s === "" ? "NULL" : q(s));

// A MIGRATION THAT IS ALREADY APPLIED IS NOT EDITABLE, SO THE DELTA GETS ITS OWN
// FILE. The first run of this generator wrote one migration per session and it
// shipped. When a fence is later lifted — the renamed-committee door in
// vr-utah-committee-ingest.mjs was widened to match a committee name as a
// sequence of significant words rather than as one string, which recovered four
// acts and 67 positions in 2024GS — the seed grows and the applied file must
// not. `only` restricts the emitted DO blocks to the measures named, so the
// forward migration carries exactly the delta and nothing else.
//
// The blocks it emits are the SAME blocks, unmodified: every one of them selects
// its measure before inserting, guards each issue mapping with NOT EXISTS, and
// ends every position insert with ON CONFLICT DO NOTHING. Re-stating a measure
// that already exists is therefore a no-op, which is what makes a partial
// re-emission safe — a bill that gained three positions can ship its whole block
// and only the three new rows land.
// A one-paragraph --reason arrives as one long line; a migration header that runs
// off the side of the terminal is a header people stop reading.
function wrapComment(text, width) {
  const out = [];
  let line = "";
  for (const w of String(text).split(/\s+/)) {
    if (line && (line + " " + w).length > width) { out.push(line); line = w; }
    else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}

export function buildSql(session, opts) {
  const { seed } = buildSeed(session);
  const only = opts && opts.only && opts.only.length ? new Set(opts.only) : null;
  if (only) {
    const strangers = [...only].filter((b) => !seed.measures.some((m) => m.utahBill === b));
    if (strangers.length) {
      throw new Error(`--bills names ${strangers.length} bill(s) with no measure in the ${session} seed: ` +
        strangers.join(", "));
    }
    seed.measures = seed.measures.filter((m) => only.has(m.utahBill));
  }
  // The header states what THIS FILE does, so when the file is a delta the counts
  // are the delta's own — recounted off the emitted measures, not copied from the
  // whole-seed totals. A migration whose prose claims 64 bills while its body
  // carries 12 is a lie in the place a reader is most likely to trust.
  const c = only ? (function () {
    const acts = seed.measures.reduce((n, m) => n + m.committeeActs.length, 0);
    const votes = seed.measures.flatMap((m) => m.committeeActs.flatMap((a) => a.votes));
    const sup = votes.filter((v) => v.supersededByFloorVote).length;
    return Object.assign({}, seed.counts, {
      measures: seed.measures.length,
      issueMappings: seed.measures.reduce((n, m) => n + m.issues.length, 0),
      committeeActs: acts, positions: votes.length,
      supersededByFloorVote: sup, notOnAnyFloorRoll: votes.length - sup,
    });
  })() : seed.counts;
  const L = [];
  L.push(`-- ─────────────────────────────────────────────────────────────────────────────`);
  L.push(`-- vr_measures / vr_measure_issues / vr_positions — Utah ${session} committee-only measures`);
  L.push(`-- ─────────────────────────────────────────────────────────────────────────────`);
  L.push(only
    ? `-- WHAT THIS ADDS. ${c.measures} Utah bills whose committee rows changed after the earlier`
    : `-- WHAT THIS ADDS. ${c.measures} Utah bills that until now had no measure row at all,`);
  L.push(only
    ? `-- ${session} migration shipped, restated in full: ${c.issueMappings} reviewed issue mappings and`
    : `-- with ${c.issueMappings} reviewed issue mappings and ${c.positions} committee positions across`);
  L.push(only
    ? `-- ${c.positions} committee positions across ${c.committeeActs} standing-committee actions, of which whatever`
    : `-- ${c.committeeActs} standing-committee actions. Every one of these bills was already in the`);
  if (only) {
    L.push(`-- the database already holds is a no-op. Every one of these bills was already in the`);
  }
  L.push(`-- committee ingest's refusal bucket for ${session}: a CONTESTED pass-out-favorably vote,`);
  L.push(`-- confirmed against the published minutes PDF, with every voting name resolved through`);
  L.push(`-- the reviewed printed-name map — refused only because nobody had reviewed an issue`);
  L.push(`-- mapping for the parent bill. This pass read the bill text and reviewed them.`);
  L.push(`--`);
  L.push(`-- WHERE THE MAPPINGS CAME FROM. db/vr-utah-committee-bills-${session}.json, one entry per`);
  L.push(`-- bill, each carrying a direction, a weight, exactly one primary key and prose saying`);
  L.push(`-- what in the text supports it. ${c.bucket - c.admitted} of the ${c.bucket} bills in the bucket are REFUSED in the`);
  L.push(`-- same file, in writing. No issue key was added to the vocabulary for this pass.`);
  L.push(`--`);
  L.push(`-- NO FLOOR VOTES. These measures carry no vr_rollcalls row. A bill reaches this file`);
  L.push(`-- precisely because it has no admitted floor roll for ${session} — its floor votes were`);
  L.push(`-- near-unanimous under the shipped 10%-minority bar, or it never reached a floor vote,`);
  L.push(`-- or it died in the second chamber. No floor action code was widened and no margin bar`);
  L.push(`-- was lowered to manufacture one. The consequence is stated rather than hidden:`);
  L.push(`-- ${c.notOnAnyFloorRoll} of the ${c.positions} positions are the member's ONLY act on that bill and all of them`);
  L.push(`-- count, because there is no floor vote on these measures for stance-helpers to`);
  L.push(`-- supersede them with (${c.supersededByFloorVote} are superseded).`);
  L.push(`--`);
  L.push(`-- ACTION TYPE AND WEIGHT ARE UNCHANGED. 'committee_vote' at 0.60 in stance-helpers'`);
  L.push(`-- act table, printing as "Committee vote", exactly as 20261004000000 wrote it. This`);
  L.push(`-- file changes no weight, no label, no floor and no threshold.`);
  L.push(`--`);
  L.push(`-- THE TIME OF DAY IS NOT KNOWN. The minutes state the meeting's date and do not`);
  L.push(`-- timestamp the motion, so acted_at is that date at midnight Mountain Standard Time.`);
  L.push(`--`);
  L.push(`-- SOURCES. Every measure cites its bill page; every position cites the minutes PDF the`);
  L.push(`-- act was confirmed against. Each measure's external_ids records which document the`);
  L.push(`-- mapping was read out of — enrolled text, or the last substitute where the bill never`);
  L.push(`-- enrolled — so a reader can check the mapping against the same file the curator used.`);
  if (only) {
    L.push(`--`);
    L.push(`-- THIS IS A DELTA, NOT THE WHOLE SEED. The ${session} committee mapping already shipped`);
    L.push(`-- in an earlier migration and that file is applied, so it is not edited. This one`);
    L.push(`-- carries only the ${c.measures} bill(s) whose rows changed afterwards:`);
    for (const m of seed.measures) L.push(`--   ${m.utahBill} · ${m.number}`);
    if (opts && opts.reason) {
      L.push(`--`);
      L.push(`-- WHY THEY CHANGED.`);
      for (const line of wrapComment(opts.reason, 74)) L.push(`-- ${line}`);
      L.push(`--`);
    }
    L.push(`-- Each block below is the same generated block as before, unmodified: it selects the`);
    L.push(`-- measure before inserting, guards every issue mapping with NOT EXISTS, and ends every`);
    L.push(`-- position insert with ON CONFLICT DO NOTHING. Re-stating a bill that is already in`);
    L.push(`-- the database is a no-op; only rows that are genuinely new land.`);
  }
  L.push(`-- Generated by scripts/vr-utah-committee-mapping.mjs --sql --session ${session}` +
    (only ? ` --bills ${[...only].sort().join(",")}` : "") + `. Idempotent.`);
  L.push(`-- ─────────────────────────────────────────────────────────────────────────────`);
  L.push("");
  for (const m of seed.measures) {
    const namedTotal = m.committeeActs.reduce((n, a) => n + a.votes.length, 0);
    L.push(`-- ${m.utahBill} · ${m.number} · ${m.title}`);
    L.push(`--   mapping read from the ${m.textKind} text: ${m.textUrl}`);
    L.push(`--   ${m.issues.length} issue mapping(s), ${m.committeeActs.length} committee action(s), ${namedTotal} position(s)`);
    L.push(`DO $$`);
    L.push(`DECLARE m_id integer;`);
    L.push(`BEGIN`);
    L.push(`  SELECT id INTO m_id FROM vr_measures`);
    L.push(`   WHERE number = ${q(m.number)} AND chamber = ${q(m.chamber)}`);
    L.push(`     AND external_ids->>'utahSession' = ${q(session)} LIMIT 1;`);
    L.push(`  IF m_id IS NULL THEN`);
    L.push(`    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,`);
    L.push(`      short_title, summary, status, source_url, source_label, external_ids)`);
    L.push(`    VALUES ('bill', NULL, ${q(m.chamber)}, ${q(m.number)}, ${q(m.title)},`);
    L.push(`      ${q(m.title)}, ${qn(m.generalProvisions)}, ${q(m.status)},`);
    L.push(`      ${q(m.sourceUrl)}, ${q(m.sourceLabel)},`);
    L.push(`      jsonb_build_object('utahSession', ${q(session)}, 'utahBill', ${q(m.utahBill)},`);
    L.push(`        'primeSponsor', ${qn(m.primeSponsor)}, 'floorSponsor', ${qn(m.floorSponsor)},`);
    L.push(`        'mappingReadFrom', ${q(m.textKind)}, 'mappingTextUrl', ${q(m.textUrl)},`);
    L.push(`        'committeeOnly', true))`);
    L.push(`    RETURNING id INTO m_id;`);
    L.push(`  END IF;`);
    for (const it of m.issues) {
      L.push(`  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues`);
      L.push(`                  WHERE measure_id = m_id AND issue_key = ${q(it.issueKey)}) THEN`);
      L.push(`    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,`);
      L.push(`      support_meaning, rationale, source_url)`);
      L.push(`    VALUES (m_id, ${q(it.issueKey)}, ${it.weight}, ${it.isPrimary ? "true" : "false"},`);
      L.push(`      ${q(it.supportMeaning)}, ${q(it.rationale)}, ${q(m.textUrl)});`);
      L.push(`  END IF;`);
    }
    for (const a of m.committeeActs) {
      const note = `${a.committee} · meeting ${a.meetingId} · ${a.motion}`;
      L.push(`  -- ${a.date} · ${a.committee} · ${a.motion}`);
      L.push(`  --   printed tally ${a.printedTotals.yea}-${a.printedTotals.nay}-${a.printedTotals.absent} (yea-nay-absent); ${a.votes.length} named voter(s) on the PolitiDex roster`);
      L.push(`  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES`);
      const vals = a.votes.map((v) =>
        `    (m_id, ${q(v.politicianId)}, 'committee_vote', ${v.supports ? "true" : "false"}, ` +
        `${q(`${a.date}T00:00:00-07:00`)}::timestamptz, ${q(a.sourceUrl)}, ${q(note)})`);
      L.push(vals.join(",\n"));
      L.push(`  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;`);
    }
    L.push(`END $$;`);
    L.push("");
  }
  // ── VERIFICATION ───────────────────────────────────────────────────────────
  // Scoped to the rows THIS FILE writes and nothing else. The mapping lane is
  // identified by committeeOnly on the measure, which is the same predicate the
  // seed-lane migrations exclude — so the two guards partition the session's
  // committee_vote rows instead of both asserting a total against the whole
  // session. A delta narrows further, to the bills it restates.
  const lane = [
    `     AND m.external_ids->>'utahSession' = ${q(session)}`,
    `     AND (m.external_ids->>'committeeOnly') = 'true'`,
  ].concat(only ? [`     AND m.external_ids->>'utahBill' IN (${[...only].sort().map(q).join(", ")})`] : []);
  L.push(`-- \u2500\u2500 VERIFICATION `.padEnd(79, "\u2500"));
  L.push(`-- Fails loudly rather than leaving a half-written committee record behind. This`);
  L.push(`-- lane only: ${session} measures carrying committeeOnly. The seed-lane migration's`);
  L.push(`-- own guard excludes exactly these rows, so neither file asserts the other's total.`);
  L.push(`DO $$`);
  L.push(`DECLARE n_pos integer; n_measures integer; n_issues integer; n_floorish integer; n_nosrc integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO n_pos FROM vr_positions p`);
  L.push(`    JOIN vr_measures m ON m.id = p.measure_id`);
  L.push(`   WHERE p.action_type = 'committee_vote'`);
  for (const c2 of lane) L.push(c2);
  L.push(`  ;`);
  L.push(`  IF n_pos <> ${c.positions} THEN`);
  L.push(`    RAISE EXCEPTION 'expected ${c.positions} Utah ${session} mapping-lane committee_vote positions, found %', n_pos;`);
  L.push(`  END IF;`);
  L.push(`  SELECT count(DISTINCT p.measure_id) INTO n_measures FROM vr_positions p`);
  L.push(`    JOIN vr_measures m ON m.id = p.measure_id`);
  L.push(`   WHERE p.action_type = 'committee_vote'`);
  for (const c2 of lane) L.push(c2);
  L.push(`  ;`);
  L.push(`  IF n_measures <> ${c.measures} THEN`);
  L.push(`    RAISE EXCEPTION 'expected ${c.measures} bills with Utah ${session} mapping-lane committee votes, found %', n_measures;`);
  L.push(`  END IF;`);
  L.push(`  -- Every one of these measures exists only because a curator reviewed a mapping`);
  L.push(`  -- for it; a committee-only measure with no issue row would be a vote with no`);
  L.push(`  -- direction, which is the thing this lane refuses to publish.`);
  L.push(`  SELECT count(*) INTO n_issues FROM vr_measure_issues i`);
  L.push(`    JOIN vr_measures m ON m.id = i.measure_id`);
  L.push(`   WHERE true`);
  for (const c2 of lane) L.push(c2);
  L.push(`  ;`);
  L.push(`  IF n_issues <> ${c.issueMappings} THEN`);
  L.push(`    RAISE EXCEPTION 'expected ${c.issueMappings} reviewed issue mappings on Utah ${session} mapping-lane measures, found %', n_issues;`);
  L.push(`  END IF;`);
  L.push(`  -- A committee act must never have been written as a roll call.`);
  L.push(`  SELECT count(*) INTO n_floorish FROM vr_rollcalls r`);
  L.push(`    JOIN vr_measures m ON m.id = r.measure_id`);
  L.push(`   WHERE true`);
  for (const c2 of lane) L.push(c2);
  L.push(`  ;`);
  L.push(`  IF n_floorish > 0 THEN`);
  L.push(`    RAISE EXCEPTION 'a committee vote reached vr_rollcalls (% rows)', n_floorish;`);
  L.push(`  END IF;`);
  L.push(`  -- Every act carries the published minutes PDF it was confirmed against.`);
  L.push(`  SELECT count(*) INTO n_nosrc FROM vr_positions p`);
  L.push(`    JOIN vr_measures m ON m.id = p.measure_id`);
  L.push(`   WHERE p.action_type = 'committee_vote'`);
  for (const c2 of lane) L.push(c2);
  L.push(`     AND (p.source_url IS NULL OR p.source_url NOT LIKE 'https://le.utah.gov/%.pdf')`);
  L.push(`  ;`);
  L.push(`  IF n_nosrc > 0 THEN`);
  L.push(`    RAISE EXCEPTION '% committee votes without a minutes PDF citation', n_nosrc;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push("");
  return L.join("\n") + "\n";
}

// What the reviewed-map fence costs, printed the same way the ingest prints it: the
// number of DROPPED VOTES first, then the ranked printed forms behind it. Names and
// votes are two different numbers and only the second one is the record we are not
// publishing, so the summary line leads with votes and says how many names they sit
// on rather than the other way round.
function printDropped(rep, label) {
  const rank = Object.entries(rep.names.droppedByForm).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!rank.length && !rep.names.refusedPositions) {
    console.log(`  ${label}: no dropped votes — every printed name on every admitted act resolved`);
    return;
  }
  console.log(`  ${label}: dropped votes ${rep.names.droppedPositions} across ${rank.length} unmapped name(s)` +
    (rep.names.refusedPositions ? ` · ${rep.names.refusedPositions} on refused name(s)` : ""));
  for (const [form, n] of rank) console.log(`     ${String(n).padStart(3)}  ${form}`);
}

// ── main ─────────────────────────────────────────────────────────────────────
function main() {
  if (has("--worksheet")) { worksheet(SESSION); return; }
  if (has("--verify")) {
    const a = accountability(SESSION);
    try { loadDecisions(SESSION); } catch (e) { console.error(String(e.message)); process.exitCode = 1; }
    console.log(AS_JSON ? JSON.stringify(a, null, 2) :
      `${SESSION}: bucket ${a.bucket} · admitted ${a.admitted} · refused ${a.refused} · ` +
      `unaccounted ${a.unaccounted.length}${a.unaccounted.length ? " (" + a.unaccounted.slice(0, 20).join(", ") + ")" : ""}` +
      `${a.leftBucket.length ? " · LEFT THE BUCKET, IN WRITING: " + a.leftBucket.join(", ") : ""}` +
      `${a.strangers.length ? " · NOT IN BUCKET: " + a.strangers.join(", ") : ""}` +
      `${a.mislabelled.length ? " · FLAGGED BUT STILL IN BUCKET: " + a.mislabelled.join(", ") : ""}`);
    if (a.unaccounted.length || a.strangers.length || a.mislabelled.length) process.exitCode = 1;
    return;
  }
  if (has("--dropped")) {
    // The cost of the reviewed-map fence, in votes rather than in names. Read-only:
    // it builds the seed in memory and writes nothing. This is the command the
    // coverage ledger in db/vr-utah-committee-map-<session>.json is quoted from, so
    // that ledger can be re-derived after any fence change instead of hand-totalled.
    const { rep } = buildSeed(SESSION);
    if (AS_JSON) {
      console.log(JSON.stringify({
        session: SESSION, lane: "mapping",
        droppedPositions: rep.names.droppedPositions, droppedByForm: rep.names.droppedByForm,
        refusedPositions: rep.names.refusedPositions, refusedByForm: rep.names.refusedByForm,
        actsBuilt: rep.acts.built, rowsKept: rep.rows.kept,
      }, null, 2));
      return;
    }
    printDropped(rep, `${SESSION} mapping lane`);
    return;
  }
  if (has("--seed")) {
    const { seed, rep } = buildSeed(SESSION);
    const f = has("--out") ? path.join(OUTDIR, path.basename(mappingSeedFile(SESSION))) : mappingSeedFile(SESSION);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(seed, null, 2) + "\n");
    console.log(`${path.relative(ROOT, f)}  ${seed.counts.measures} measures · ${seed.counts.issueMappings} mappings · ` +
      `${seed.counts.committeeActs} acts · ${seed.counts.positions} positions ` +
      `(fresh ${seed.counts.notOnAnyFloorRoll}, superseded ${seed.counts.supersededByFloorVote})`);
    printDropped(rep, `${SESSION} mapping lane`);
    return;
  }
  if (has("--sql")) {
    fs.mkdirSync(OUTDIR, { recursive: true });
    const only = val("--bills", "").split(",").map((x) => x.trim()).filter(Boolean);
    const suffix = has("--name") ? `_${val("--name", "")}` : (only.length ? "_delta" : "");
    // --reason is prose, not a count: the tool cannot know why a seed grew, and a
    // delta whose header cannot say why it exists makes the next reader guess.
    const reason = val("--reason", null);
    const f = path.join(OUTDIR, `vr_utah_${SESSION.toLowerCase()}_committee_mapping${suffix}.sql`);
    fs.writeFileSync(f, buildSql(SESSION, { only, reason }));
    console.log(f);
    return;
  }
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8")
    .split("\n").filter((l) => l.startsWith("//")).join("\n"));
}
if (import.meta.url === `file://${process.argv[1]}`) main();
