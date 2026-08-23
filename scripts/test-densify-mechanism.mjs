#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// THE SIX DENSIFY PAIRS GET THE SAME FACE THE SAVE CLUSTER GOT
// ─────────────────────────────────────────────────────────────────────────────
// 20260917000000_vr_identity_and_thin_key_densification.sql added six mappings and
// nothing that renders them. On the dossier they arrived as "Voted Yea on the
// question “On Motion to Recommit”" over "Counted on 🔐 Election Security & Ballot
// Safeguards because that is one of the subjects this measure was mapped to" —
// two true sentences that never say what the measure did. This file covers the
// pass that gave exactly those six a curator-written two-beat face, and nothing
// else: three chips on H.R. 8595 (119th), gov_regulation on H.J.Res. 44 (118th),
// and health_rural and immig_fentanyl on H.R. 1968 (119th).
//
// WHAT THIS FILE PINS, AND WHY EACH ONE CAN REGRESS
//
//   1 · THE MAPPINGS THIS PROSE DESCRIBES REALLY EXIST, AND WHERE. All six live in
//       the migration, NOT in db/vr-issue-seed.json — that file is a partial mirror
//       and does not carry them. The fixture below overlays them from the ledger
//       and the ledger is checked against the migration, so a curated line can
//       never outlive the mapping it explains.
//
//   2 · PER-ISSUE, AND ON H.R. 8595 THE ISSUES RUN OPPOSITE WAYS. One yea adds a
//       citizenship document at registration and a photo ID at the ballot box. On
//       the safeguards chip that is support; on the access chip it is the reverse.
//       A single per-bill blurb would have to suppress one to report the other, so
//       all three lines are required to differ and the access line is required to
//       say the vote counts against.
//
//   3 · THE DIVISION IS NAMED. Five of the six pairs hang off ONE division of a
//       much larger vehicle — Division B of an appropriations bill, Divisions B and
//       C of a full-year CR. A face that says "this bill did X" when the bill is
//       mostly not X is worse than the derived line it replaced.
//
//   4 · THE IDENTITY NOTE ANSWERS "WHICH MEASURE IS THIS". H.R. 8595 is on the
//       record under its appropriations title and carries the SAVE America Act as a
//       division, so a reader arriving from an elections chip sees an appropriations
//       bill and a reader arriving from gov_services sees an elections vote. The
//       note names the three other SAVE instruments it is not, and it renders above
//       "What it did".
//
//   5 · NOTHING MOVED. Ballot path, verdicts, weights, overlay tokens: the whole
//       corpus is scored twice, once with the prose table and once with it emptied,
//       and every scoring field on every row of every touched chip must match.
//
//   node scripts/test-densify-mechanism.mjs

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

// ── the six pairs, with the direction and weight each line was written against ──
const PAIRS = [
  ["H.R. 8595",   119, "election_security", 100, "yea_supports"],
  ["H.R. 8595",   119, "voter_id",           70, "yea_supports"],
  ["H.R. 8595",   119, "voting_access",      60, "yea_opposes"],
  ["H.J.Res. 44", 118, "gov_regulation",     60, "yea_supports"],
  ["H.R. 1968",   119, "health_rural",       45, "yea_supports"],
  ["H.R. 1968",   119, "immig_fentanyl",     30, "yea_supports"],
];
const MEASURES = [...new Set(PAIRS.map((p) => p[0] + "|" + p[1]))];

// ═════════════════════════════════════════════════════════════════════════════
console.log("\n   ── 1 · every curated pair is a mapping the migration really wrote");
// ═════════════════════════════════════════════════════════════════════════════
{
  const mig = R("netlify/database/migrations/20260917000000_vr_identity_and_thin_key_densification.sql");
  for (const [num, cong, key, weight, dir] of PAIRS) {
    // The row as the migration emits it: (m.id, 'key', weight, false, 'dir',
    // inside a FOR loop bound to this number. Matching the tuple head is enough to
    // catch a weight or a direction being changed under the prose.
    const re = new RegExp("'" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "',\\s*" + weight + ",\\s*false,\\s*'" + dir + "'");
    ok(re.test(mig),
      `${num}|${cong}|${key} is not in the September densification migration at weight ${weight} / ${dir} — the curated line explains a mapping that no longer exists in that shape`);
  }
  // And the text the lines were written from is on file, which is the rule the
  // formal-face passes run under: text first, reach second.
  const ident = new Set(J("db/vr-measure-identity.json").measures.map((m) => m.number + "|" + m.congress));
  for (const mk of MEASURES) ok(ident.has(mk), `${mk} has an identity summary on file to write from`);
  ok(MEASURES.length === 3, `this pass touched three measures — found ${MEASURES.length}`);
  ok(PAIRS.length === 6, `this pass curated exactly the six densify pairs — found ${PAIRS.length}`);
}

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

// ── the corpus ───────────────────────────────────────────────────────────────
// db/vr-issue-seed.json is a PARTIAL mirror of the curated mappings: the six rows
// this pass describes reach the database through the migration and were never
// added to it. Overlaying them here is what makes the pairs reachable at all — and
// section 1 above is what stops the overlay from drifting away from the migration.
const issueSeed = J("db/vr-issue-seed.json");
const measureBy = new Map(issueSeed.measures.map((m) => [m.number + "|" + m.congress, m]));
let overlaid = 0;
for (const [num, cong, key, weight, dir] of PAIRS) {
  const k = num + "|" + cong;
  let m = measureBy.get(k);
  if (!m) { m = { number: num, congress: cong, title: "", issues: [] }; measureBy.set(k, m); }
  if (!m.issues.some((i) => i.issueKey === key)) {
    m.issues.push({ issueKey: key, weight, isPrimary: false, supportMeaning: dir });
    overlaid++;
  }
}
ok(overlaid === 6,
  `all six mappings came from the migration overlay — ${overlaid} of 6. If this drops, db/vr-issue-seed.json has grown its own copy and the two can now disagree silently`);

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
        action: v.question, actionType: v.actionType,
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
function holderOf(num, cong, key) {
  for (const pid of seated.keys()) {
    const row = rowsFor(pid, key).find((d) => d.item.number === num && String(d.item.congress) === String(cong));
    if (row) return { pid, row };
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 2 · each pair renders curated on a face a member really holds");
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
    hasnt(m.counts, "one of the subjects this measure was mapped to",
      `${num}|${cong}|${key}: "Why it counts here" is not the derived mapping restatement`);
    ok(m.did && m.did.length > 60, `${num}|${cong}|${key}: "What it did" is a real sentence`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 3 · per issue — and on H.R. 8595 the three chips disagree");
// ═════════════════════════════════════════════════════════════════════════════
{
  const say = (num, cong, key) => {
    const hit = held.get(num + "|" + cong + "|" + key);
    return hit ? CS.dossierMechanism(hit.row, key, null, false) : null;
  };
  const divergent = [
    ["H.R. 8595", 119, "election_security", "voter_id"],
    ["H.R. 8595", 119, "election_security", "voting_access"],
    ["H.R. 8595", 119, "voter_id", "voting_access"],
    ["H.R. 1968", 119, "health_rural", "immig_fentanyl"],
  ];
  for (const [num, cong, a, b] of divergent) {
    const ma = say(num, cong, a), mb = say(num, cong, b);
    ok(ma && mb, `${num}|${cong} renders on both ${a} and ${b}`);
    if (!ma || !mb) continue;
    ok(ma.did !== mb.did, `${num}|${cong}: "What it did" differs between ${a} and ${b} — a per-bill blurb would not`);
    ok(ma.counts !== mb.counts, `${num}|${cong}: "Why it counts here" differs between ${a} and ${b}`);
  }
  // The direction split is the whole reason the two election facets are scored
  // separately, so it is asserted as text and not left to the reader to infer.
  const acc = say("H.R. 8595", 119, "voting_access");
  const sec = say("H.R. 8595", 119, "election_security");
  if (acc && sec) {
    has(acc.counts, "counts against", "H.R. 8595 voting_access says the yea counts AGAINST access");
    hasnt(sec.counts, "counts against", "H.R. 8595 election_security does not tell the reader the same yea counts against");
    has(acc.counts, "safeguards", "the access line points at the safeguards row it disagrees with, so the reader sees the split rather than a contradiction");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 4 · the prose agrees with the direction it sits on");
// ═════════════════════════════════════════════════════════════════════════════
{
  const AGAINST = /counts against/i;
  const SUPPORT = /counts as support|is a vote to|is a vote for|a yea enacts/i;
  for (const [num, cong, key, , want] of PAIRS) {
    const hit = held.get(num + "|" + cong + "|" + key);
    if (!hit) continue;
    const why = String(CS.dossierMechanism(hit.row, key, null, false).counts || "");
    if (want === "yea_opposes") {
      ok(AGAINST.test(why), `${num}|${cong}|${key}: yea_opposes, so the line must say the vote counts against`);
    } else {
      ok(SUPPORT.test(why), `${num}|${cong}|${key}: yea_supports, so the line must say the vote counts as support`);
      ok(!AGAINST.test(why), `${num}|${cong}|${key}: yea_supports, so the line must not tell the reader the vote counts against`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 5 · copy discipline, and the division is named");
// ═════════════════════════════════════════════════════════════════════════════
{
  const FRAMING = /\b(supporters?|opponents?|critics?|proponents?|detractors?|advocates?|backers?)\b/i;
  const sentences = (s) => String(s).split(/(?<=[.!?])\s+(?=[A-Z"“(])/).filter(Boolean).length;
  for (const [num, cong, key] of PAIRS) {
    const hit = held.get(num + "|" + cong + "|" + key);
    if (!hit) continue;
    const m = CS.dossierMechanism(hit.row, key, null, false);
    ok(sentences(m.did) <= 2, `${num}|${cong}|${key}: "What it did" is at most two sentences — got ${sentences(m.did)}`);
    ok(!FRAMING.test(m.did), `${num}|${cong}|${key}: "What it did" carries no framing-led copy`);
    ok(!FRAMING.test(m.counts), `${num}|${cong}|${key}: "Why it counts here" carries no framing-led copy`);
    // Every one of these lines cites the text it was read from. The migration
    // rationales carry section numbers; a face that drops them is a face that
    // cannot be checked.
    ok(/\bSec\.\s*\d|\bsection\s+\d|\bsection\s+303A|\bchapter\s+8\b/i.test(m.did + " " + m.counts),
      `${num}|${cong}|${key}: neither beat cites a section — the whole difference between this and the derived line is that this one can be checked`);
  }
  // Five of the six read one division of a much bigger vehicle. Say so.
  const DIVISION = [
    ["H.R. 8595", 119, "election_security", "Division B"],
    ["H.R. 8595", 119, "voter_id", "Division B"],
    ["H.R. 8595", 119, "voting_access", "Division B"],
    ["H.R. 1968", 119, "health_rural", "Division B"],
    ["H.R. 1968", 119, "immig_fentanyl", "Division C"],
  ];
  for (const [num, cong, key, div] of DIVISION) {
    const hit = held.get(num + "|" + cong + "|" + key);
    if (!hit) continue;
    has(CS.dossierMechanism(hit.row, key, null, false).did, div,
      `${num}|${cong}|${key} names the division it is reading rather than claiming the whole vehicle did it`);
  }
  // And where the mapping is deliberately narrow, the confound is on the face.
  for (const key of ["health_rural", "immig_fentanyl"]) {
    const hit = held.get("H.R. 1968|119|" + key);
    if (!hit) continue;
    has(CS.dossierMechanism(hit.row, key, null, false).counts, "narrow",
      `H.R. 1968 ${key} says out loud that the link is a narrow one instead of rounding the confound away`);
  }
  // H.J.Res. 44 is the one pair with no division to name — it is one sentence of
  // operative text — so it is required to quote that sentence instead.
  const cra = held.get("H.J.Res. 44|118|gov_regulation");
  if (cra) {
    const m = CS.dossierMechanism(cra.row, "gov_regulation", null, false);
    has(m.did, "no force or effect", "the CRA line quotes the operative clause, which is the whole resolution");
    has(m.counts, "gun chips", "the CRA line says the firearms merits live on the gun chips, so the reader is not told this row is about braces");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 6 · the identity note answers “which measure is this”");
// ═════════════════════════════════════════════════════════════════════════════
{
  const hit = held.get("H.R. 8595|119|election_security");
  ok(hit, "H.R. 8595 is on a face so its identity note can be seen");
  if (hit) {
    const face = faceFor(hit.pid, "election_security");
    has(face, "Which measure this is:", "H.R. 8595: the identity line is rendered");
    has(face, "appropriations title", "H.R. 8595: the note says the record files it under an appropriations title");
    has(face, "Safeguard American Voter Eligibility Act", "H.R. 8595: the note names what Division B actually is");
    for (const sib of ["H.R. 8281", "H.R. 22", "S. 1383"]) {
      has(face, sib, `H.R. 8595's note names ${sib} as one of the SAVE instruments it is not`);
    }
    const i = face.indexOf("appropriations title"), j = face.indexOf("What it did:", i);
    ok(i !== -1 && j !== -1 && i < j, "H.R. 8595: identity comes before “What it did”");
  }
  // The note is a fact about the document, so it rides every chip on that measure —
  // including the appropriations rows this pass deliberately left derived.
  const gs = holderOf("H.R. 8595", 119, "gov_services");
  if (gs) {
    has(faceFor(gs.pid, "gov_services"), "Safeguard American Voter Eligibility Act",
      "the identity note also reaches the gov_services row, where a reader would otherwise never learn the vehicle carries an elections division");
    ok(CS.dossierMechanism(gs.row, "gov_services", null, false).countsBy === "curated",
      "gov_services on H.R. 8595 was outside this pass's six and has since been curated by the existing-inventory pass");
  }
  // The claim that block is really making — an identity note is not a curated
  // mechanism — used to be pinned on H.R. 8281|118|states_federal_power, a row that
  // carried a note and had no entry in _DOS_MECH. The roll-call mechanism pass wrote
  // that entry (it is a judged act on a Contradicted row), and the comment here
  // already predicted the problem: an example chosen for being uncurated stops being
  // an example the moment somebody curates it. So the claim is now made structurally
  // instead of by example. Blank the prose table and leave the note table standing:
  // if a note were doing a mechanism's job, the row would still read curated.
  {
    const noteOnly = R("consistency.js").replace(/var _DOS_MECH = \{[\s\S]*?\n  \};/, "var _DOS_MECH = {};");
    ok(noteOnly.indexOf("var _DOS_MECH = {};") !== -1 && /var _DOS_IDENT_NOTE = \{\s*\n/.test(noteOnly),
      "the note-only control really empties the prose table and really keeps the note table");
    const nwin = makeSandbox();
    const nsb = vm.createContext(nwin);
    nwin.PROFILES = nwin.CMP_DATA;
    for (const f of FILES) vm.runInContext(f === "consistency.js" ? noteOnly : R(f), nsb, { filename: f });
    nwin.PROFILES = nwin.CMP_DATA;
    for (const [pid, items] of seated) nwin.PDXVotingRecord.noteMember(pid, items);
    const NC = nwin.PDXConsistency;
    const h = held.get("H.R. 8595|119|election_security");
    if (h) {
      const nrow = (NC.dossierItems(h.pid, "election_security") || [])
        .filter((d) => d.lane === "record")
        .find((d) => d.item.number === "H.R. 8595" && String(d.item.congress) === "119");
      ok(nrow, "the note-only control still seats H.R. 8595 on the election_security row");
      if (nrow) {
        const nm = NC.dossierMechanism(nrow, "election_security", null, false);
        has(String(NC.dossierRecordsHtml(h.pid, "election_security") || ""),
          "Safeguard American Voter Eligibility Act",
          "with the prose table emptied the identity note is still on the face");
        ok(nm.countsBy === "derived",
          "a row can carry an identity note and still render derived — a note is not a mechanism");
        ok(String(nm.ident || "").length > 0,
          "the derived row is the one carrying the note, not a neighbour of it");
      }
    }
  }
  // H.J.Res. 44 and H.R. 1968 collide with nothing, so neither got a note.
  for (const [num, cong, key] of [["H.J.Res. 44", 118, "gov_regulation"], ["H.R. 1968", 119, "health_rural"]]) {
    const h = held.get(num + "|" + cong + "|" + key);
    if (!h) continue;
    ok(!CS.dossierMechanism(h.row, key, null, false).ident,
      `${num} carries no invented identity note — the table is not decoration`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 7 · the pairs outside this pass are untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The brief was six pairs, and these five were the ones deliberately left out of
  // it. The existing-inventory pass has since written all five — which is the point
  // of that pass and not a regression here — so the assertion inverts rather than
  // disappears: what one pass declared out of scope, a later pass closed, and the
  // list stays in the file as the record of that.
  const CLOSED_LATER = [
    ["H.R. 8595", 119, "strong_defense"],
    ["H.R. 8595", 119, "israel_support"],
    ["H.R. 8595", 119, "pro_life"],
    ["H.J.Res. 44", 118, "gun_rights"],
    ["H.J.Res. 44", 118, "gun_safety"],
  ];
  for (const [num, cong, key] of CLOSED_LATER) {
    const h = holderOf(num, cong, key);
    if (!h) continue;
    ok(CS.dossierMechanism(h.row, key, null, false).countsBy === "curated",
      `${num}|${cong}|${key} was outside this pass's six and has since been curated by the existing-inventory pass`);
  }
  // The derived rendering itself still has to exist and still has to be reachable,
  // or "everything is curated now" would pass this file by deleting the distinction
  // instead of earning it. These pairs carry no measure text in the repo and must
  // stay visibly derived until one arrives.
  // The roll-call mechanism pass closed these three. Each is a judged act on a
  // Contradicted or Mixed member row, and each was written from the mapping's own
  // rationale in db/vr-issue-seed.json rather than from an identity summary — which
  // is why they read as having "no text on file" when this list was drawn up, and
  // why they are no longer derived now. Same inversion as CLOSED_LATER above.
  const CLOSED_BY_ROLLCALL_PASS = [
    ["H.R. 8369", 118, "israel_support"],
    ["H.R. 8281", 118, "states_federal_power"],
    ["H.R. 29", 119, "border_security"],
  ];
  for (const [num, cong, key] of CLOSED_BY_ROLLCALL_PASS) {
    const h = holderOf(num, cong, key);
    if (!h) continue;
    ok(CS.dossierMechanism(h.row, key, null, false).countsBy === "curated",
      `${num}|${cong}|${key} is a judged act on a Contradicted or Mixed row and the roll-call mechanism pass wrote it`);
  }
  // Replacements, drawn from what is still derived after that pass: acts that sit
  // only on Limited or Consistent rows, which the roll-call pass deliberately left
  // alone rather than blocking itself on perfecting every agreeing row. When one of
  // these is written too, invert it into a list above — do not delete the check.
  const STILL_DERIVED = [
    ["H.R. 8369", 118, "power_of_purse"],
    ["H.Amdt. 253", 119, "gun_rights"],
    ["H.Amdt. 234", 119, "climate_action"],
    ["H.R. 1808", 117, "gun_safety"],
  ];
  let stillN = 0;
  for (const [num, cong, key] of STILL_DERIVED) {
    const h = holderOf(num, cong, key);
    if (!h) continue;
    stillN++;
    ok(CS.dossierMechanism(h.row, key, null, false).countsBy === "derived",
      `${num}|${cong}|${key} has no text on file and must still be visibly derived`);
  }
  ok(stillN >= 2,
    `the derived rendering is still exercised by real rows — ${stillN} of ${STILL_DERIVED.length} reachable. ` +
    "If this falls to zero the distinction between a written line and a derived one has stopped being tested, " +
    "which is not the same as it having stopped mattering");
  // The count is pinned too: this pass added six entries and one note, no more.
  const src = R("consistency.js");
  const mechBody = (src.match(/var _DOS_MECH = \{[\s\S]*?\n  \};/) || [""])[0];
  const keys = [...mechBody.matchAll(/^\s{4}'([^']+)':\s*\{/gm)].map((m) => m[1]);
  for (const [num, cong, key] of PAIRS) {
    ok(keys.includes(`${num}|${cong}|${key}`), `${num}|${cong}|${key} is a key in _DOS_MECH`);
  }
  ok(new Set(keys).size === keys.length,
    "no _DOS_MECH key is written twice — the second one silently wins and the first is dead prose");
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 8 · the ballot path did not regress");
// ═════════════════════════════════════════════════════════════════════════════
{
  let yeas = 0, nays = 0, checked = 0;
  for (const [num, cong, key] of PAIRS) {
    const target = num + "|" + cong;
    for (const pid of seated.keys()) {
      const row = rowsFor(pid, key).find((d) => d.item.number + "|" + d.item.congress === target);
      if (!row) continue;
      checked++;
      const p = row.item.position;
      if (p === "yea") { yeas++; ok(row.act === "Voted Yea", `${pid} ${target}: a yea reads "Voted Yea" — got "${row.act}"`); }
      else if (p === "nay") { nays++; ok(row.act === "Voted Nay", `${pid} ${target}: a nay reads "Voted Nay" — got "${row.act}"`); }
      ok(!row.item.actionType || (row.act !== row.item.actionType && !/^Passage$/i.test(row.act)),
        `${pid} ${target}: the actionType is not printed where the ballot goes — got "${row.act}"`);
      ok(!row.act || /^(Voted Yea|Voted Nay|Did not vote|Voted Present)$/.test(row.act),
        `${pid} ${target}: the ballot line stays on the fixed path — got "${row.act}"`);
      if (checked > 400) break;
    }
  }
  ok(yeas > 0 && nays > 0, `both ballot states appear across the six pairs — ${yeas} yea / ${nays} nay`);
  ok(checked > 100, `enough rows were checked to mean something — ${checked}`);
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 9 · the same corpus with the prose table emptied scores identically");
// ═════════════════════════════════════════════════════════════════════════════
{
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
  ok(compared > 200, `enough rows were diffed to mean something — ${compared}`);
  ok(curatedSeen >= 4, `the diff covered the curated pairs themselves — ${curatedSeen}`);

  ok((src.match(/_dosMechFor\(/g) || []).length === 2,
    "_dosMechFor is still defined once and called once — the table has not grown a second consumer");
  ok(!/_DOS_MECH\[[^\]]*\]\s*\.\s*(weight|support|direction|verdict)/.test(src),
    "no weight, direction, supportMeaning or verdict is read out of the prose table");
}

// ── report ───────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n✗ densify face: ${fails.length} failure(s), ${pass} passed\n`);
  for (const f of fails) console.error("  • " + f);
  process.exit(1);
}
console.log(`\n✓ densify face: all ${pass} assertions passed — ${PAIRS.length} curated pairs across ${MEASURES.length} measures, per-issue, division named, no score moved`);
