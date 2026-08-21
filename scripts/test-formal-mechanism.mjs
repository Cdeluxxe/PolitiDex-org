#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// THE FORMAL FACE TEACHES THE BILL BEYOND THE ELECTION FAMILY
// ─────────────────────────────────────────────────────────────────────────────
// The election-security pass gave fifteen (measure, congress, issueKey) pairs a
// curator-written two-beat line and left everything else derived. Everything else
// was most of the traffic. This file covers the second pass: ten measures, twenty-
// three pairs, picked from live reach rather than from memory of what feels big.
//
// WHAT THIS FILE PINS, AND WHY EACH ONE CAN REGRESS
//
//   1 · SELECTION IS SOURCED, NOT FELT. Every measure curated in this pass has an
//       enacted-law or as-passed summary in db/vr-measure-identity.json. The rule
//       is text-on-file first, reach second — invert it and you get sentences that
//       read curated and are actually the mapping rationale handed back.
//
//   2 · THE PAIRS RENDER CURATED ON A REAL FACE. Not "the table has a key" —
//       _dosCountsBy has to come back 'curated' on a row a member actually holds,
//       with the identity note above the two beats and the ballot still on the head.
//
//   3 · PER-ISSUE, NOT PER-BILL. One bill on two chips gets two different pairs of
//       sentences. S. 2938 supports gun safety and narrows gun rights on the same
//       yea; H.R. 5376 pays for clean generation and mandates offshore leasing.
//       A per-bill blurb would have to pick one and lie about the other.
//
//   4 · THE PROSE AGREES WITH THE SCORE. Every curated `why` is checked against the
//       supportMeaning the seed carries for that exact key: yea_opposes must say
//       the vote counts against, yea_supports must not. Flip a supportMeaning in
//       the seed without rewriting the sentence and this fails.
//
//   5 · WHAT WAS SKIPPED STAYS VISIBLY DERIVED. The highest-reach pairs in the
//       corpus are 119th-Congress measures with no text on file. They keep ⌛ and
//       "How it was linked" — this pass does not get to claim the formal lane.
//
//   6 · NOTHING MOVED. Ballot path, verdicts, weights, overlay tokens: re-derived
//       from the shared model and compared to what the face prints.
//
//   node scripts/test-formal-mechanism.mjs
//
// Real shipped modules in one node:vm sandbox. The record lane is seeded from the
// WHOLE db/vr-*.json vote corpus — not one seed file — because these ten measures
// are spread across the phase, gun, defence and privacy seeds, and every fixture
// carries actionType exactly as voting-record.mts puts it on the wire.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const has = (hay, needle, m) => ok(String(hay).indexOf(needle) !== -1, m + `\n      missing: ${needle}`);
const hasnt = (hay, needle, m) => ok(String(hay).indexOf(needle) === -1, m + `\n      present: ${needle}`);

// ── the sandbox ──────────────────────────────────────────────────────────────
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "stance-tree.js",
];
const win = makeSandbox();
const sb = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sb, { filename: f });
win.PROFILES = win.CMP_DATA;
const CS = win.PDXConsistency;

// ── the corpus, seated the way the live fetch seats it ───────────────────────
// Every db/vr-*.json that carries votes[]. Three different shapes are in the tree
// (nested measure object, bare measure string, flat number) — normalise, join to
// the issue seed, and hand each member its own item list.
const issueSeed = J("db/vr-issue-seed.json");
const measureBy = new Map(issueSeed.measures.map((m) => [m.number + "|" + m.congress, m]));
const seated = new Map();
for (const f of readdirSync(join(ROOT, "db")).filter((n) => /^vr-.*\.json$/.test(n))) {
  let j; try { j = J("db/" + f); } catch { continue; }
  if (!Array.isArray(j.votes)) continue;
  for (const v of j.votes) {
    let num, cong, title, status;
    if (v.measure && typeof v.measure === "object") {
      num = v.measure.number; cong = v.measure.congress ?? v.congress;
      title = v.measure.title || ""; status = v.measure.status || "";
    } else if (typeof v.measure === "string") {
      num = v.measure; cong = v.congress; title = v.voteDesc || ""; status = "";
    } else {
      num = v.number; cong = v.congress; title = v.voteDesc || ""; status = "";
    }
    if (!num || cong == null) continue;
    const m = measureBy.get(num + "|" + cong);
    if (!m) continue;
    for (const mv of v.memberVotes || []) {
      const pid = mv.politicianId;
      if (!pid) continue;
      if (!seated.has(pid)) seated.set(pid, []);
      seated.get(pid).push({
        kind: "vote", rollcallId: v.rollNumber, measureId: num + "-" + cong,
        number: num, title, chamber: v.chamber, status, date: v.voteDate,
        action: v.question,
        // As on the wire. Omit this and _orActionPhrase's old bug is invisible again.
        actionType: v.actionType,
        position: mv.position, result: v.result || null, isParty: mv.isParty || null,
        isProcedural: !!v.isProcedural, advanceInverted: !!v.advanceInverted,
        isAmendment: /^H\.Amdt|^S\.Amdt/.test(num),
        congress: cong, session: v.session, rollNumber: v.rollNumber,
        issues: m.issues,
        source: { url: v.sourceUrl, label: v.sourceLabel || "" },
      });
    }
  }
}
for (const [pid, items] of seated) win.PDXVotingRecord.noteMember(pid, items);
ok(seated.size > 100, `the whole roster is seated, not one seed file — ${seated.size} members`);

const rowsFor = (pid, key) => (CS.dossierItems(pid, key) || []).filter((d) => d.lane === "record");
const faceFor = (pid, key) => String(CS.dossierRecordsHtml(pid, key) || "");
// First member on the roster who holds this exact (measure, congress) row on this chip.
function holderOf(num, cong, key) {
  for (const pid of seated.keys()) {
    const row = rowsFor(pid, key).find((d) => d.item.number === num && String(d.item.congress) === String(cong));
    if (row) return { pid, row };
  }
  return null;
}

// ── this pass's twenty-two pairs, with the supportMeaning each one must agree with
const PAIRS = [
  ["H.R. 1319", 117, "family_support",     "yea_supports"],
  ["H.R. 1319", 117, "econ_workers",       "yea_supports"],
  ["H.R. 1319", 117, "national_debt",      "yea_opposes"],
  ["H.R. 5376", 117, "climate_action",     "yea_supports"],
  ["H.R. 5376", 117, "energy_production",  "yea_supports"],
  ["H.R. 5376", 117, "health_drug_prices", "yea_supports"],
  ["H.R. 5376", 117, "national_debt",      "yea_supports"],
  ["H.R. 3684", 117, "infrastructure",     "yea_supports"],
  ["H.R. 3684", 117, "national_debt",      "yea_opposes"],
  ["H.R. 3746", 118, "permitting_reform",  "yea_supports"],
  ["H.R. 3746", 118, "energy_production",  "yea_supports"],
  ["H.R. 4346", 117, "tech_innovation",    "yea_supports"],
  ["H.R. 4346", 117, "national_debt",      "yea_opposes"],
  ["H.R. 2670", 118, "strong_defense",     "yea_supports"],
  ["H.R. 2670", 118, "privacy_rights",     "yea_opposes"],
  ["S. 1071",   119, "strong_defense",     "yea_supports"],
  ["S. 1071",   119, "israel_support",     "yea_supports"],
  ["S. 2938",   117, "gun_safety",         "yea_supports"],
  ["S. 2938",   117, "gun_rights",         "yea_opposes"],
  ["H.R. 7888", 118, "privacy_rights",     "yea_opposes"],
  ["H.R. 7888", 118, "congress_oversight", "yea_supports"],
  ["H.R. 8404", 117, "lgbtq_rights",       "yea_supports"],
  ["H.R. 8404", 117, "states_federal_power", "yea_opposes"],
];
const MEASURES = [...new Set(PAIRS.map((p) => p[0] + "|" + p[1]))];

// ═════════════════════════════════════════════════════════════════════════════
console.log("\n   ── 1 · selection is sourced: text on file first, reach second");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ident = new Set(J("db/vr-measure-identity.json").measures.map((m) => m.number + "|" + m.congress));
  for (const mk of MEASURES) {
    ok(ident.has(mk),
      `${mk} was curated in this pass, so its text must be on file in db/vr-measure-identity.json`);
  }
  ok(MEASURES.length === 10, `this pass curated ten measures — found ${MEASURES.length}`);
  ok(PAIRS.length >= 12 && PAIRS.length <= 25,
    `the pass stays inside the 12–25 pair cap the brief set — ${PAIRS.length}`);
  // Every pair has to be a mapping that actually exists, or the entry is dead weight
  // that will never render and no test would notice.
  for (const [num, cong, key] of PAIRS) {
    const m = measureBy.get(num + "|" + cong);
    ok(m && m.issues.some((i) => i.issueKey === key),
      `${num}|${cong} is really mapped to ${key} in the issue seed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 2 · every pair renders curated on a face a member really holds");
// ═════════════════════════════════════════════════════════════════════════════
const held = new Map();
{
  for (const [num, cong, key] of PAIRS) {
    const hit = holderOf(num, cong, key);
    ok(hit, `some roster member holds ${num}|${cong} on ${key} — otherwise the entry is unreachable`);
    if (!hit) continue;
    held.set(num + "|" + cong + "|" + key, hit);
    const m = CS.dossierMechanism(hit.row, key, null, false);
    ok(m.countsBy === "curated",
      `${num}|${cong}|${key} renders curated, not derived — got "${m.countsBy}" on ${hit.pid}`);
    hasnt(m.did, "Voted", `${num}|${cong}|${key}: "What it did" is the bill, not the ballot`);
    hasnt(m.counts, "primary subject of this measure",
      `${num}|${cong}|${key}: "Why it counts here" is not the derived mapping restatement`);
    ok(m.did && m.did.length > 40, `${num}|${cong}|${key}: "What it did" is a real sentence`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 3 · one bill, two chips, two different explanations");
// ═════════════════════════════════════════════════════════════════════════════
{
  const say = (num, cong, key) => {
    const hit = held.get(num + "|" + cong + "|" + key);
    if (!hit) return null;
    return CS.dossierMechanism(hit.row, key, null, false);
  };
  const divergent = [
    ["S. 2938", 117, "gun_safety", "gun_rights"],
    ["H.R. 5376", 117, "climate_action", "energy_production"],
    ["H.R. 5376", 117, "climate_action", "national_debt"],
    ["H.R. 8404", 117, "lgbtq_rights", "states_federal_power"],
    ["H.R. 7888", 118, "privacy_rights", "congress_oversight"],
    ["H.R. 2670", 118, "strong_defense", "privacy_rights"],
    ["H.R. 3746", 118, "permitting_reform", "energy_production"],
    ["H.R. 1319", 117, "family_support", "national_debt"],
    ["H.R. 3684", 117, "infrastructure", "national_debt"],
    ["H.R. 4346", 117, "tech_innovation", "national_debt"],
    ["S. 1071", 119, "strong_defense", "israel_support"],
  ];
  for (const [num, cong, a, b] of divergent) {
    const ma = say(num, cong, a), mb = say(num, cong, b);
    ok(ma && mb, `${num}|${cong} renders on both ${a} and ${b}`);
    if (!ma || !mb) continue;
    ok(ma.did !== mb.did,
      `${num}|${cong}: "What it did" differs between ${a} and ${b} — a per-bill blurb would not`);
    ok(ma.counts !== mb.counts,
      `${num}|${cong}: "Why it counts here" differs between ${a} and ${b}`);
  }
  // The same national_debt chip carries three different acts. Each one says what
  // that act did, not a shared boilerplate about unoffset spending.
  const debts = [["H.R. 1319", 117], ["H.R. 3684", 117], ["H.R. 4346", 117], ["H.R. 5376", 117]]
    .map(([n, c]) => say(n, c, "national_debt")).filter(Boolean);
  ok(debts.length === 4, "four acts carry the national-debt chip in this pass");
  ok(new Set(debts.map((m) => m.did)).size === 4,
    "the four national-debt rows each describe their own act");
  // Three of those four read yea_opposes and the fourth reads yea_supports. The
  // curated lines have to split the same way, or one of them is arguing with its
  // own mapping.
  ok(/counts as support/.test(String(debts[3].counts)) && !/counts against/.test(String(debts[3].counts)),
    "the IRA's deficit-reduction subtitle reads as support on the debt chip, unlike the other three");
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 4 · the prose agrees with the supportMeaning it sits on");
// ═════════════════════════════════════════════════════════════════════════════
{
  const AGAINST = /counts against/i;
  const SUPPORT = /counts as support|is a vote to|is a vote for|a yea enacts/i;
  for (const [num, cong, key, want] of PAIRS) {
    const m = measureBy.get(num + "|" + cong);
    const mapping = m.issues.find((i) => i.issueKey === key);
    ok(mapping && mapping.supportMeaning === want,
      `${num}|${cong}|${key} still reads ${want} in the seed — the curated line was written for that direction`);
    const hit = held.get(num + "|" + cong + "|" + key);
    if (!hit) continue;
    const why = String(CS.dossierMechanism(hit.row, key, null, false).counts || "");
    if (want === "yea_opposes") {
      ok(AGAINST.test(why), `${num}|${cong}|${key}: yea_opposes, so the line must say the vote counts against`);
    } else {
      ok(SUPPORT.test(why), `${num}|${cong}|${key}: yea_supports, so the line must say the vote counts as support`);
      ok(!AGAINST.test(why),
        `${num}|${cong}|${key}: yea_supports, so the line must not tell the reader the vote counts against`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 5 · copy discipline: two sentences, no framing, confounds named");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Same bar the election pass set. "Supporters say" is how a summary stops being a
  // summary; two sentences is the budget that keeps a row readable at L3.
  const FRAMING = /\b(supporters?|opponents?|critics?|proponents?|detractors?|advocates?|backers?)\b/i;
  const sentences = (s) => String(s).split(/(?<=[.!?])\s+(?=[A-Z"“(])/).filter(Boolean).length;
  for (const [num, cong, key] of PAIRS) {
    const hit = held.get(num + "|" + cong + "|" + key);
    if (!hit) continue;
    const m = CS.dossierMechanism(hit.row, key, null, false);
    ok(sentences(m.did) <= 2, `${num}|${cong}|${key}: "What it did" is at most two sentences — got ${sentences(m.did)}`);
    ok(!FRAMING.test(m.did), `${num}|${cong}|${key}: "What it did" carries no framing-led copy`);
    ok(!FRAMING.test(m.counts), `${num}|${cong}|${key}: "Why it counts here" carries no framing-led copy`);
  }
  // Where the mapping is deliberately held below 100 or hangs off one section of a
  // much larger vehicle, the line has to say so rather than round it off.
  const confounds = [
    ["H.R. 7888", 118, "privacy_rights", "85"],
    ["S. 1071", 119, "strong_defense", "80"],
    ["S. 1071", 119, "israel_support", "35"],
    ["H.R. 7888", 118, "congress_oversight", "45"],
    ["H.R. 5376", 117, "national_debt", "45"],
  ];
  for (const [num, cong, key, weight] of confounds) {
    const hit = held.get(num + "|" + cong + "|" + key);
    if (!hit) continue;
    has(CS.dossierMechanism(hit.row, key, null, false).counts, weight,
      `${num}|${cong}|${key} names the weight it is held at instead of smoothing the confound away`);
  }
  has(String(held.get("H.R. 3746|118|energy_production") ? CS.dossierMechanism(held.get("H.R. 3746|118|energy_production").row, "energy_production", null, false).counts : ""),
    "debt-limit deal",
    "the pipeline row says out loud that it rides on a debt-limit deal");
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 6 · identity notes fire only where the confusion is real");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Six new notes: two shell vehicles, two reconciliation titles that name a budget
  // resolution rather than the act, and two NDAAs out of six on the same list.
  const NOTES = [
    ["H.R. 4346", 117, "tech_innovation", "Legislative Branch Appropriations"],
    ["S. 2938", 117, "gun_safety", "courthouse"],
    ["H.R. 1319", 117, "family_support", "S. Con. Res. 5"],
    ["H.R. 5376", 117, "climate_action", "Build Back Better"],
    ["H.R. 2670", 118, "strong_defense", "fiscal year 2024"],
    ["S. 1071", 119, "strong_defense", "fiscal year 2026"],
  ];
  for (const [num, cong, key, needle] of NOTES) {
    const hit = held.get(num + "|" + cong + "|" + key);
    ok(hit, `${num}|${cong} is on a face so its identity note can be seen`);
    if (!hit) continue;
    const face = faceFor(hit.pid, key);
    has(face, "Which measure this is:", `${num}|${cong}: the identity line is rendered`);
    has(face, needle, `${num}|${cong}: the identity note says what makes this measure confusable`);
    // Order matters: you cannot read "what it did" until you know which bill it is.
    const i = face.indexOf(needle), j = face.indexOf("What it did:", i);
    ok(i !== -1 && j !== -1 && i < j, `${num}|${cong}: identity comes before "What it did"`);
  }
  // The NDAA note names the siblings it is not, or it is not doing its job.
  const nd = held.get("H.R. 2670|118|strong_defense");
  if (nd) {
    const face = faceFor(nd.pid, "strong_defense");
    for (const sib of ["S. 1605", "H.R. 7776", "H.R. 5009", "S. 1071"]) {
      has(face, sib, `the FY2024 NDAA note names ${sib} as one of the acts it is not`);
    }
  }
  // And a measure with no collision gets no note — the table is not decoration.
  const plain = held.get("H.R. 3684|117|infrastructure");
  if (plain) {
    ok(!/Which measure this is:[\s\S]{0,400}Infrastructure Investment and Jobs Act is not/.test(faceFor(plain.pid, "infrastructure")),
      "the IIJA, which nothing collides with, carries no invented identity note");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 7 · what this pass skipped is still visibly derived");
// ═════════════════════════════════════════════════════════════════════════════
{
  // These were the highest-reach derived pairs when this pass ran, skipped then
  // because they were out of its scope. Every one of them now has measure text on
  // file and has been written by the existing-inventory pass, so they are asserted
  // closed rather than dropped — the list is the audit trail of the boundary moving.
  const CLOSED_LATER = [
    ["H.R. 1", 119, "cut_spending"],
    ["H.R. 4758", 119, "cut_spending"],
    ["H.R. 6955", 119, "gov_regulation"],
    ["H.R. 8595", 119, "pro_life"],
    ["H.R. 8800", 119, "strong_defense"],
  ];
  for (const [num, cong, key] of CLOSED_LATER) {
    const hit = holderOf(num, cong, key);
    if (!hit) continue;
    ok(CS.dossierMechanism(hit.row, key, null, false).countsBy === "curated",
      `${num}|${cong}|${key} was skipped by this pass and has since been curated`);
  }
  // What is still skipped, and why: the repo holds no summary text for these, so
  // there is nothing a curator could write from and the face must keep saying so.
  // The derived treatment is asserted on these rather than on the list above, so
  // the check cannot be satisfied by curating everything in sight.
  const SKIPPED = [
    ["H.R. 8369", 118, "israel_support"],
    ["H.R. 8369", 118, "power_of_purse"],
    ["H.R. 8281", 118, "states_federal_power"],
    ["H.R. 29", 119, "border_security"],
    ["H.Amdt. 478", 118, "israel_support"],
    ["H.Amdt. 248", 119, "strong_defense"],
  ];
  let checked = 0;
  for (const [num, cong, key] of SKIPPED) {
    const hit = holderOf(num, cong, key);
    if (!hit) continue;
    checked++;
    const m = CS.dossierMechanism(hit.row, key, null, false);
    ok(m.countsBy === "derived",
      `${num}|${cong}|${key} is not curated by this pass and still renders derived`);
    const face = faceFor(hit.pid, key);
    has(face, "How it was linked:", `${num}|${cong}|${key}: the derived label is on the face`);
    // Derived rows are drawn as derived — dim italic under a dashed rule — not
    // dressed up to look like the curated ones above them.
    has(face, "pdxdos-rec-derived", `${num}|${cong}|${key}: the derived row keeps its derived treatment`);
    has(face, "pdxdos-rec-wk-d", `${num}|${cong}|${key}: the derived label keeps its own weight`);
  }
  ok(checked >= 3, `enough skipped pairs were checked to mean something — ${checked}`);
  // A curated row does NOT carry the derived treatment, or the distinction is cosmetic.
  const cur = held.get("H.R. 7888|118|privacy_rights");
  if (cur) {
    const face = faceFor(cur.pid, "privacy_rights");
    has(face, "Why it counts here:", "the curated row is labelled as curated");
    // Scoped to this row's own span, because the same face carries derived rows too.
    const why = CS.dossierMechanism(cur.row, "privacy_rights", null, false).counts;
    const at = face.indexOf(String(why).slice(0, 40).replace(/&/g, "&amp;"));
    const before = at === -1 ? "" : face.slice(Math.max(0, at - 200), at);
    ok(at !== -1, "the curated sentence itself is on the rendered face");
    has(before, "Why it counts here:", "the curated sentence sits under the curated label");
    hasnt(before, "pdxdos-rec-derived", "the curated row does not carry the derived treatment");
  }
  // The pass must not have quietly emptied — or quietly grown — the curator-debt
  // queue. The record lane is deliberately outside it, which is why none of the
  // twenty-two entries above moves a debt count.
  const src = R("consistency.js");
  ok(/_DOS_CURATABLE\s*=\s*\{\s*exec:\s*1,\s*formal:\s*1\s*\}/.test(src),
    "the curator-debt queue still covers exec and formal and still excludes the record lane");
  ok(/_dosCountsBy\(d\) === 'derived' && !!\(d && _DOS_CURATABLE\[d\.lane\]\)/.test(src),
    "the not-yet-explained mark is still gated on the lane being curatable");
  for (const [num, cong, key] of SKIPPED) {
    const hit = holderOf(num, cong, key);
    if (!hit) continue;
    ok(CS.dossierMechanism(hit.row, key, null, false).needsCurator === false,
      `${num}|${cong}|${key}: a record-lane row still raises no curator debt — this pass did not enlarge the queue`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 8 · the ballot path did not regress, and no score moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  let yeas = 0, nays = 0, absent = 0, checked = 0;
  for (const [num, cong, key] of PAIRS) {
    const target = num + "|" + cong;
    for (const pid of seated.keys()) {
      const row = rowsFor(pid, key).find((d) => d.item.number + "|" + d.item.congress === target);
      if (!row) continue;
      checked++;
      const p = row.item.position;
      if (p === "yea") { yeas++; ok(row.act === "Voted Yea", `${pid} ${target}: a yea reads "Voted Yea" — got "${row.act}"`); }
      else if (p === "nay") { nays++; ok(row.act === "Voted Nay", `${pid} ${target}: a nay reads "Voted Nay" — got "${row.act}"`); }
      else if (p === "not_voting") { absent++; ok(row.act === "Did not vote", `${pid} ${target}: an absence reads "Did not vote" — got "${row.act}"`); }
      // The bug this whole line of work started from: actionType winning the slot
      // the ballot belongs in. Only some of the hand-written seeds carry the field,
      // so it is asserted where it is present and forced below where it is not.
      ok(!row.item.actionType || (row.act !== row.item.actionType && !/^Passage$/i.test(row.act)),
        `${pid} ${target}: the actionType is not printed where the ballot goes — got "${row.act}"`);
      ok(!row.act || /^(Voted Yea|Voted Nay|Did not vote|Voted Present)$/.test(row.act),
        `${pid} ${target}: the ballot line stays on the fixed path — got "${row.act}"`);
      if (checked > 600) break;
    }
  }
  ok(yeas > 0 && nays > 0 && absent > 0,
    `all three ballot states appear across the new pairs — ${yeas} yea / ${nays} nay / ${absent} absent`);
  ok(checked > 150, `enough rows were checked to mean something — ${checked}`);

  // THE WIRE-SHAPED PROBE. vrRollcalls.actionType is non-null in the database and
  // voting-record.mts passes it through on every row, but several of the hand-written
  // seeds predate the field. The corpus above is therefore not enough on its own to
  // keep the old bug caught: rebuild one synthetic member per ballot out of the ten
  // curated measures with actionType set the way the function sends it, and require
  // the ballot to survive. Drop the field back into _orActionPhrase's old precedence
  // and these three fail.
  const wire = { yea: [], nay: [], not_voting: [] };
  for (const [num, cong] of MEASURES.map((m) => m.split("|"))) {
    const m = measureBy.get(num + "|" + cong);
    for (const ballot of Object.keys(wire)) {
      wire[ballot].push({
        kind: "vote", rollcallId: 1, measureId: num + "-" + cong, number: num,
        title: m.title || "", chamber: "house", status: "", date: "2024-01-01",
        action: "On Passage", actionType: "passage", position: ballot,
        result: "Passed", isParty: null, isProcedural: false, advanceInverted: false,
        isAmendment: false, congress: Number(cong), session: 1, rollNumber: 1,
        issues: m.issues, source: { url: "https://clerk.house.gov/", label: "U.S. House Clerk" },
      });
    }
  }
  for (const ballot of Object.keys(wire)) win.PDXVotingRecord.noteMember("__wire_" + ballot, wire[ballot]);
  const WANT = { yea: "Voted Yea", nay: "Voted Nay", not_voting: "Did not vote" };
  for (const ballot of Object.keys(wire)) {
    const rows = rowsFor("__wire_" + ballot, "national_debt")
      .concat(rowsFor("__wire_" + ballot, "strong_defense"));
    ok(rows.length > 0, `the wire-shaped ${ballot} probe produced rows`);
    for (const r of rows) {
      ok(r.act === WANT[ballot],
        `wire-shaped ${ballot} on ${r.ident}: reads "${WANT[ballot]}" — got "${r.act}"`);
      hasnt(String(CS.dossierMechanism(r, "national_debt", null, false).dir || ""), "they passage",
        `wire-shaped ${ballot} on ${r.ident}: the direction sentence does not end in the actionType`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 9 · the same corpus with the prose table emptied scores identically");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The only way to prove prose did not move a number is to run the model without
  // the prose. This boots a second sandbox from the same sources with _DOS_MECH
  // and _DOS_IDENT_NOTE stripped to empty objects, seats the identical corpus, and
  // requires every scoring field on every row of every curated chip to match. If
  // an entry ever reaches a weight, a supportMeaning or a verdict, this diverges.
  const src = R("consistency.js");
  const blanked = src
    .replace(/var _DOS_MECH = \{[\s\S]*?\n  \};/, "var _DOS_MECH = {};")
    .replace(/var _DOS_IDENT_NOTE = \{[\s\S]*?\n  \};/, "var _DOS_IDENT_NOTE = {};");
  ok(blanked !== src && blanked.indexOf("var _DOS_MECH = {};") !== -1,
    "the control build really has an empty prose table");

  const cwin = makeSandbox();
  const csb = vm.createContext(cwin);
  cwin.PROFILES = cwin.CMP_DATA;
  for (const f of FILES) vm.runInContext(f === "consistency.js" ? blanked : R(f), csb, { filename: f });
  cwin.PROFILES = cwin.CMP_DATA;
  for (const [pid, items] of seated) cwin.PDXVotingRecord.noteMember(pid, items);
  const CC = cwin.PDXConsistency;

  const KEYS = [...new Set(PAIRS.map((p) => p[2]))];
  let compared = 0, drift = 0, curatedSeen = 0;
  for (const pid of seated.keys()) {
    for (const key of KEYS) {
      const a = CS.officialRecord(pid, key), b = CC.officialRecord(pid, key);
      if (!a || !b) continue;
      if (a.token !== b.token) { drift++; fails.push(`${pid}/${key}: overlay token drifted "${b.token}" → "${a.token}"`); }
      const ra = rowsFor(pid, key);
      const rb = (CC.dossierItems(pid, key, b) || []).filter((d) => d.lane === "record");
      if (ra.length !== rb.length) { drift++; fails.push(`${pid}/${key}: row count drifted ${rb.length} → ${ra.length}`); continue; }
      for (let i = 0; i < ra.length; i++) {
        compared++;
        for (const field of ["verdict", "support", "act", "ident", "effect", "standing",
                             "power", "stance", "primary", "narrow", "held"]) {
          if (ra[i][field] !== rb[i][field]) {
            drift++;
            fails.push(`${pid}/${key}[${ra[i].ident}]: ${field} drifted "${rb[i][field]}" → "${ra[i][field]}"`);
          }
        }
        // And the prose really is the only thing that changed: on a curated pair the
        // control still renders derived while the shipped build renders curated.
        const kk = ra[i].item.number + "|" + ra[i].item.congress + "|" + key;
        if (held.has(kk) && held.get(kk).pid === pid) {
          curatedSeen++;
          ok(CC.dossierMechanism(rb[i], key, null, false).countsBy === "derived",
            `${kk}: without the table this row falls back to derived, so the table is what is doing the work`);
        }
      }
    }
  }
  ok(drift === 0, `no scoring field moved when the prose table was emptied — ${drift} drift(s) over ${compared} rows`);
  ok(compared > 500, `enough rows were diffed to mean something — ${compared}`);
  ok(curatedSeen >= 15, `the diff covered the curated pairs themselves — ${curatedSeen}`);

  ok((src.match(/_dosMechFor\(/g) || []).length === 2,
    "_dosMechFor is still defined once and called once — the table has not grown a second consumer");
  ok(!/_DOS_MECH\[[^\]]*\]\s*\.\s*(weight|support|direction|verdict)/.test(src),
    "no weight, direction, supportMeaning or verdict is read out of the prose table");
}

// ── report ───────────────────────────────────────────────────────────────────
if (fails.length) {
  console.log(`\n✗ formal mechanism: ${fails.length} failure(s), ${pass} passed\n`);
  for (const f of fails) console.log("  • " + f);
  process.exit(1);
}
console.log(`\n✓ formal face beyond the election family: all ${pass} assertions passed — ` +
  `${PAIRS.length} curated pairs across ${MEASURES.length} sourced measures, per-issue, agreeing with the score, ` +
  `skips still derived`);
