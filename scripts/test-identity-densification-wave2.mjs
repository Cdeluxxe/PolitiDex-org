#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// WAVE 2 — THE BAND UNDERNEATH, AND THE ROWS A LATER PASS WILL WANT TO ADD BACK
// ─────────────────────────────────────────────────────────────────────────────
// scripts/test-identity-densification.mjs pins the September 17 pass. This file
// pins the one after it: thirteen more 118th/119th measures that were carrying
// real roll-call traffic on a title-only or single-key record got an as-passed or
// as-enrolled summary in db/vr-measure-identity.json (52 measures to 65), and
// eight new issue rows followed in
// netlify/database/migrations/20260918000000_vr_identity_densification_wave2.sql.
//
// WHAT THIS FILE PINS, AND WHY EACH ONE CAN REGRESS
//
//   1 · ALL THIRTEEN IDENTITIES SURVIVE, INCLUDING THE FIVE THAT GOT NO MAPPING.
//       Seven of the thirteen were identity-only: their existing mappings were
//       read against primary text and found correct. Those are the entries most
//       at risk, because nothing in SQL refers to them — if the JSON entry goes,
//       the measure silently reverts to a bare number and no test notices.
//
//   2 · THE THREE-WAY ISRAEL COLLISION STAYS DISAMBIGUATED. H.R. 6126, H.R. 7217
//       and H.R. 8034 in the 118th all carry the identical short title "Israel
//       Security Supplemental Appropriations Act, 2024" and each is a separate
//       roll call. The only thing keeping a member's dossier from showing three
//       indistinguishable rows is the disambiguation sentence in each summary,
//       so each of the three is checked for a reference to the other two.
//       H.Con.Res. 89 vs 108, and H.R. 6644's two short titles, are checked the
//       same way.
//
//   3 · THE EIGHT NEW ROWS KEEP THEIR DIRECTION, WEIGHT AND SECONDARY STATUS.
//       All eight are yea_supports and all eight are secondary; each cites a
//       section of the text it claims to read and carries a govinfo source_url.
//
//   4 · H.R. 9237's TWO ROWS SAY THAT THEIR BALLOT INVERTS. The corpus's only
//       roll on that bill is the motion to recommit of July 16, 2026, where a
//       yea BLOCKS the measure. yeaBlocksMeasure() in netlify/lib/vr-pack.ts
//       supplies the inversion, so the rows are coded in bill terms — but a
//       later reader who does not know that will "fix" them by flipping the
//       direction, which inverts every member twice. The rationales have to keep
//       saying so, and the helper has to keep existing.
//
//   5 · THE DECLINES STAY DECLINED. Eleven refusals were written into the
//       migration header with reasons. The header is a comment and cannot fail a
//       deploy. This can. The war_powers pair is the inverse case: those rows
//       were declined because 20260904000000 ALREADY wrote them, so the check is
//       that they are still present.
//
//   node scripts/test-identity-densification-wave2.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGDIR = join(ROOT, "netlify/database/migrations");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n      expected ${JSON.stringify(b)}\n      got      ${JSON.stringify(a)}`);

// ── the thirteen measures this pass wrote identity for ───────────────────────
const TOUCHED = [
  ["H.Con.Res. 89", 119], ["H.Con.Res. 108", 119], ["H.Con.Res. 113", 119],
  ["H.R. 1041", 119], ["H.R. 3486", 119], ["H.R. 6644", 119], ["H.R. 7757", 119],
  ["H.R. 9237", 119], ["H.R. 9770", 119], ["H.R. 8884", 119],
  ["H.R. 6126", 118], ["H.R. 7217", 118], ["H.R. 8034", 118],
];
// Seven of the thirteen got no new mapping. Named, so that "it has no row in the
// migration" is never mistaken for "it was not part of this pass".
const IDENTITY_ONLY = new Set([
  "H.Con.Res. 89|119", "H.Con.Res. 108|119", "H.R. 3486|119",
  "H.R. 9770|119", "H.R. 8884|119", "H.R. 8034|118", "H.R. 7217|118",
]);

// ── 1 · all thirteen identities survive ──────────────────────────────────────
const ident = JSON.parse(R("db/vr-measure-identity.json"));
ok(Array.isArray(ident.measures) && ident.measures.length >= 65,
  `db/vr-measure-identity.json should still carry at least the 65 measures this pass left it with (got ${ident.measures?.length})`);

const byKey = new Map(ident.measures.map((m) => [m.number + "|" + m.congress, m]));
eq(ident.measures.length - byKey.size, 0,
  "db/vr-measure-identity.json must not carry two entries for the same (number, congress) — applyCuratedMeasureIdentity() lets the later one silently win");

const FRAMING = [
  "supporters say", "supporters argue", "critics say", "critics argue",
  "opponents say", "opponents argue", "advocates argue", "detractors",
  "proponents say", "proponents argue", "some argue", "many believe",
];
const PRIMARY_HOSTS = ["govinfo.gov", "congress.gov", "gpo.gov", "federalregister.gov"];

for (const [number, congress] of TOUCHED) {
  const k = number + "|" + congress;
  const e = byKey.get(k);
  ok(e, `${k} lost its db/vr-measure-identity.json entry — this pass wrote it precisely because the measure was carrying votes with no plain identity`);
  if (!e) continue;
  eq(e.congress, congress, `${k} entry is filed under the wrong congress`);
  eq(e.chamber, "house", `${k} entry should be a House measure — every roll this pass verified is a House roll`);
  ok(typeof e.title === "string" && e.title.trim().length > 3, `${k} has no usable title`);
  ok(typeof e.officialTitle === "string" && e.officialTitle.trim().length > 10,
    `${k} has no officialTitle — for the three same-titled Israel bills the official title is the only field that differs, so it is not optional here`);
  ok(typeof e.summary === "string" && e.summary.trim().length >= 500,
    `${k} has no usable summary — the whole point of this pass was that every measure it touched says what it does (got ${(e.summary || "").length} chars)`);
  ok(typeof e.identityTitleType === "string" && e.identityTitleType.trim().length > 0,
    `${k} has no identityTitleType — runbook rule 6 wants the record to say WHICH title this is`);
  ok(typeof e.summarySource === "string" && e.summarySource.trim().length > 0,
    `${k} has no summarySource — a summary with no stated stage cannot be re-checked against the text that was voted`);
  ok(typeof e.introducedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.introducedAt),
    `${k} has no ISO introducedAt`);
  ok(typeof e.sponsorName === "string" && e.sponsorName.trim().length > 0, `${k} has no sponsorName`);
  ok(typeof e.policyArea === "string" && e.policyArea.trim().length > 0, `${k} has no policyArea`);
  const url = e.source?.url || "";
  ok(PRIMARY_HOSTS.some((h) => url.includes(h)),
    `${k}'s identity is sourced to ${url || "(nothing)"} — the brief allowed Congress.gov text, GPO enrolled text and the Federal Register, and excluded commentary`);
  const lower = (e.summary || "").toLowerCase();
  for (const f of FRAMING) {
    ok(lower.indexOf(f) === -1,
      `${k}'s identity summary contains "${f}" — identity states what the text does; who likes it belongs on a stance row, not here`);
  }
  ok(lower.indexOf("disambiguation:") !== -1,
    `${k}'s summary has no Disambiguation sentence — every measure in this pass shares a title, a vehicle type or a theatre with another measure in the corpus, which is part of why it was selected`);
}

// H.R. 6644 was enacted; the identity has to say which law it became, because the
// enrolled short title is not the title the House passed.
const hr6644 = byKey.get("H.R. 6644|119");
ok(hr6644?.laws?.some((l) => /119-101/.test(l)),
  "H.R. 6644's identity does not record Public Law 119-101 — the summary is written from the enrolled text and the reader needs to know that is a different document from the House-passed bill");
ok(/Housing for the 21st Century Act/.test(hr6644?.summary || ""),
  "H.R. 6644's summary no longer names the title it passed the House under; a member who voted on the House bill will not recognise the enacted name");

// ── 2 · the three-way Israel collision stays disambiguated ───────────────────
const ISRAEL = ["H.R. 6126", "H.R. 7217", "H.R. 8034"];
for (const n of ISRAEL) {
  const e = byKey.get(n + "|118");
  if (!e) continue;
  eq(e.title, "Israel Security Supplemental Appropriations Act, 2024",
    `${n}'s short title changed — the collision these summaries exist to resolve is that all three carry this exact title`);
  for (const other of ISRAEL.filter((x) => x !== n)) {
    ok((e.summary || "").includes(other),
      `${n}'s summary does not name ${other} — three identically titled bills with three different roll calls are indistinguishable on a dossier without it`);
  }
}
ok(/14,300,000,000/.test(byKey.get("H.R. 6126|118")?.summary || ""),
  "H.R. 6126's summary no longer names the Sec. 306 IRS rescission — that offset is the single fact separating it from H.R. 7217, and it is why one carries cut_spending and the other does not");
ok(/5,655,000,000|Migration and Refugee Assistance/.test(byKey.get("H.R. 8034|118")?.summary || ""),
  "H.R. 8034's summary no longer names its humanitarian title — that is the fact separating it from the other two");
ok(/two-thirds|suspension/.test(byKey.get("H.R. 7217|118")?.summary || ""),
  "H.R. 7217's summary no longer says it failed under suspension — 250-180 reads as a win to anyone who does not know the threshold");

// The two war-powers resolutions must each name the other, and the theatre.
ok(/H.Con.Res. 108/.test(byKey.get("H.Con.Res. 89|119")?.summary || "") && /Iran/.test(byKey.get("H.Con.Res. 89|119")?.summary || ""),
  "H.Con.Res. 89's summary must name Iran and point at H.Con.Res. 108 — same section 5(c) mechanism, different theatre, different vote");
ok(/H.Con.Res. 89/.test(byKey.get("H.Con.Res. 108|119")?.summary || "") && /Lebanon/.test(byKey.get("H.Con.Res. 108|119")?.summary || ""),
  "H.Con.Res. 108's summary must name Lebanon and point at H.Con.Res. 89");

// ── quote-aware SQL tuple reader ─────────────────────────────────────────────
// Rationales contain commas, semicolons and '--'. A naive split truncates them and
// an under-reading guard is worse than none.
function stripComments(src) {
  let out = "", i = 0, q = false;
  while (i < src.length) {
    if (q) {
      if (src[i] === "'") { if (src[i + 1] === "'") { out += "''"; i += 2; continue; } q = false; }
      out += src[i++]; continue;
    }
    if (src[i] === "'") { q = true; out += src[i++]; continue; }
    if (src[i] === "-" && src[i + 1] === "-") { while (i < src.length && src[i] !== "\n") i++; continue; }
    out += src[i++];
  }
  return out;
}
function splitTop(t) {
  const f = []; let d = 0, s = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { s += c; if (c === "'") { if (t[i + 1] === "'") s += t[++i]; else q = false; } continue; }
    if (c === "'") { q = true; s += c; continue; }
    if (c === "(") d++;
    if (c === ")") d--;
    if (c === "," && d === 0) { f.push(s.trim()); s = ""; continue; }
    s += c;
  }
  f.push(s.trim());
  return f;
}
function tuples(txt, start) {
  const out = []; let depth = 0, cur = "", q = false;
  for (let i = start; i < txt.length; i++) {
    const c = txt[i];
    if (q) { cur += c; if (c === "'") { if (txt[i + 1] === "'") cur += txt[++i]; else q = false; } continue; }
    if (c === "'") { q = true; cur += c; continue; }
    if (c === "(") { depth++; if (depth === 1) { cur = ""; continue; } }
    if (c === ")") { depth--; if (depth === 0) { out.push(cur); continue; } if (depth < 0) break; }
    if (depth >= 1) cur += c;
  }
  return out.map(splitTop);
}
const unq = (s) => (s && s[0] === "'" ? s.slice(1, -1).replace(/''/g, "'") : null);

function readIssueRows(src) {
  const s = stripComments(src);
  const binds = [];
  for (const m of s.matchAll(/\bFOR\s+(\w+)\s+IN\s+SELECT\b[\s\S]{0,400}?\bFROM\s+vr_measures\b([\s\S]{0,400}?)\bLOOP\b/g)) {
    for (const n of m[2].matchAll(/\bnumber\s*=\s*'((?:[^']|'')*)'/g)) binds.push({ v: m[1], pos: m.index, num: n[1].replace(/''/g, "'") });
  }
  for (const m of s.matchAll(/\bINTO\s+(\w+)\s*\bFROM\s+vr_measures\b([^;]{0,600})/g)) {
    for (const n of m[2].matchAll(/\bnumber\s*=\s*'((?:[^']|'')*)'/g)) binds.push({ v: m[1], pos: m.index, num: n[1].replace(/''/g, "'") });
  }
  const bindFor = (v, pos) => {
    let best = null;
    for (const b of binds) if (b.v === v && b.pos < pos && (!best || b.pos > best.pos)) best = b;
    return best;
  };
  const rows = [];
  for (const m of s.matchAll(/INSERT INTO vr_measure_issues\s*\(([^)]*)\)\s*VALUES/g)) {
    const cols = m[1].split(",").map((x) => x.trim());
    let end = m.index + m[0].length, q = false;
    for (let i = end; i < s.length; i++) {
      if (q) { if (s[i] === "'") { if (s[i + 1] === "'") i++; else q = false; } continue; }
      if (s[i] === "'") { q = true; continue; }
      if (s[i] === ";") { end = i; break; }
    }
    let body = s.slice(m.index + m[0].length, end);
    const oc = body.search(/\bON\s+CONFLICT\b/i);
    if (oc >= 0) body = body.slice(0, oc);
    for (const row of tuples("(" + body.replace(/^\s*\(?/, ""), 0)) {
      const rec = {};
      cols.forEach((c, i) => { rec[c] = row[i]; });
      const v = String(rec.measure_id || "").replace(/\.id$/, "").trim();
      const b = /^\w+$/.test(v) ? bindFor(v, m.index) : null;
      if (!b) continue;
      rows.push({
        number: b.num,
        issue_key: unq(rec.issue_key),
        weight: Number(rec.weight),
        is_primary: String(rec.is_primary).trim() === "true",
        support_meaning: unq(rec.support_meaning),
        rationale: unq(rec.rationale),
        source_url: unq(rec.source_url),
      });
    }
  }
  return rows;
}

// ── 3 · the eight new rows keep direction, weight and secondary status ───────
const MIG = "20260918000000_vr_identity_densification_wave2.sql";
ok(readdirSync(MIGDIR).includes(MIG), `${MIG} is missing — this pass's mappings live nowhere else`);
const migRows = readIssueRows(R("netlify/database/migrations/" + MIG));

const NEW_ROWS = [
  ["H.Con.Res. 113", "strong_defense",    45, "yea_supports"],
  ["H.R. 1041",      "veterans",          55, "yea_supports"],
  ["H.R. 6644",      "permitting_reform", 60, "yea_supports"],
  ["H.R. 6644",      "crypto_cbdc",       40, "yea_supports"],
  ["H.R. 7757",      "privacy_rights",    65, "yea_supports"],
  ["H.R. 9237",      "health_mental",     55, "yea_supports"],
  ["H.R. 9237",      "health_rural",      35, "yea_supports"],
  ["H.R. 6126",      "strong_defense",    50, "yea_supports"],
];
eq(migRows.length, NEW_ROWS.length,
  `${MIG} should assert exactly the eight rows this pass authored — a row appearing here that is not in the ledger above was never text-checked`);

for (const [number, key, weight, dir] of NEW_ROWS) {
  const r = migRows.find((x) => x.number === number && x.issue_key === key);
  ok(r, `${number} ${key} is not in ${MIG}`);
  if (!r) continue;
  eq(r.support_meaning, dir,
    `${number} ${key} direction changed — flipping support_meaning inverts every member's score on that axis, so it is pinned, not assumed`);
  eq(r.weight, weight, `${number} ${key} weight changed`);
  eq(r.is_primary, false,
    `${number} ${key} must stay secondary — each of these measures already has a primary, and two primaries on one measure is an ingest-visible contradiction`);
  ok(typeof r.rationale === "string" && r.rationale.length >= 300,
    `${number} ${key} has no substantive rationale — a mapping asserts what a member's vote meant and the rationale is the whole of the reasoning`);
  ok(/govinfo\.gov/.test(r.source_url || ""),
    `${number} ${key} is not sourced to the primary text it claims to read`);
  // Note the anchoring: /Sec\.\b/ never matches, because "." and " " are both
  // non-word characters and there is no boundary between them.
  const cites = /\bSec\.\s|\bsection\b|\bTitle\s+[IVX]|\bDivision\s+[A-Z]/.test(r.rationale);
  const quotes = (r.rationale.match(/"([^"]{40,})"/) || [])[1];
  ok(cites || quotes,
    `${number} ${key}'s rationale neither cites a section, title or division nor quotes the operative text — "the bill does X" is a summary, not a citation`);
  const rl = r.rationale.toLowerCase();
  for (const f of FRAMING) {
    ok(rl.indexOf(f) === -1, `${number} ${key}'s rationale contains "${f}" — a mapping rationale reads the text, it does not referee the debate`);
  }
}
eq(migRows.filter((r) => r.source_url).length, NEW_ROWS.length,
  "every row in this migration is new authorship off primary text, so every row must carry the URL it was read from");

// Weight parity with the rows these were matched to. Stated as a check because
// "same reading, same weight" is the reason two of them have the numbers they do.
const isr7217 = [];
for (const f of readdirSync(MIGDIR).filter((n) => /^\d{14}_.*\.sql$/.test(n))) {
  for (const r of readIssueRows(R("netlify/database/migrations/" + f))) {
    if (r.number === "H.R. 7217" && r.issue_key === "strong_defense") isr7217.push({ ...r, file: f });
  }
}
if (isr7217.length) {
  eq(migRows.find((r) => r.number === "H.R. 6126" && r.issue_key === "strong_defense")?.weight, isr7217[0].weight,
    `H.R. 6126 strong_defense must carry the same weight as H.R. 7217's row in ${isr7217[0].file} — the two bills fund the same Title I accounts, and identical readings must not produce different weights on one axis`);
}

// ── 4 · H.R. 9237's two rows say that their ballot inverts ───────────────────
const pack = R("netlify/lib/vr-pack.ts");
ok(/function yeaBlocksMeasure/.test(pack) && /recommit/.test(pack),
  "yeaBlocksMeasure() no longer exists or no longer matches 'recommit' in netlify/lib/vr-pack.ts — H.R. 9237's only ballot is a motion to recommit, and without the inversion both of its new rows score every member backwards");
ok(/advanceInverted:\s*yeaBlocksMeasure\(/.test(pack),
  "vr-pack.ts no longer wires yeaBlocksMeasure() into advanceInverted — the helper existing is not the same as it being applied");
for (const key of ["health_mental", "health_rural"]) {
  const r = migRows.find((x) => x.number === "H.R. 9237" && x.issue_key === key);
  if (!r) continue;
  ok(/recommit/i.test(r.rationale),
    `H.R. 9237 ${key}'s rationale no longer warns that the only ballot on this measure is a motion to recommit — the next reader will "fix" the direction and invert every member twice`);
}

// ── 5 · the declines stay declined ───────────────────────────────────────────
const allRows = [];
for (const f of readdirSync(MIGDIR).filter((n) => /^\d{14}_.*\.sql$/.test(n))) {
  for (const r of readIssueRows(R("netlify/database/migrations/" + f))) allRows.push({ ...r, file: f });
}
const DECLINED = [
  ["H.R. 3486", "deportations", "border_security already carries that conviction on this measure, and its own chip text says 'deport people here illegally' (rule 22)"],
  ["H.R. 1041", "health_mental", "Sec. 4's new 38 U.S.C. 5501D is a firearms-eligibility rule, not mental health care (rule 25)"],
  ["H.R. 7217", "america_first_fp", "the 180 nays were Democrats objecting to a defense-only package with no humanitarian title, not America-First nays (rule 23)"],
  ["H.R. 6126", "america_first_fp", "the 196 nays were Democrats objecting to the Sec. 306 IRS rescission offset, not America-First nays (rule 23)"],
  ["H.R. 7217", "cut_spending", "H.R. 7217 carries no offset provision; that key belongs to H.R. 6126 (rule 25)"],
  ["H.R. 6644", "homeless", "Sec. 503 is a single McKinney-Vento funding-cap waiver and lands below_floor"],
  ["H.R. 7757", "immig_fentanyl", "Title V Secs. 513-519 are study-and-report only and land below_floor"],
  ["H.R. 9770", "disaster_resilience", "continuing NFIP and the Disaster Relief Fund at FY2026 levels enacts no policy on the axis (rule 25)"],
  ["H.Con.Res. 113", "power_of_purse", "a budget resolution sets levels, appropriates nothing and is never presented to the President; the direction is unreadable"],
];
for (const [number, key, why] of DECLINED) {
  const hit = allRows.find((r) => r.number === number && r.issue_key === key);
  ok(!hit, `${number} picked up ${key} in ${hit?.file} — this pass declined it: ${why}`);
}
// Rule 28, across every measure this pass looked at.
for (const [number] of TOUCHED) {
  const hit = allRows.find((r) => r.number === number && r.issue_key === "checks_balances");
  ok(!hit, `${number} picked up checks_balances in ${hit?.file} — rule 28: the general key takes no roll-call mappings`);
}
// H.R. 8034's america_first_fp row is the counterexample and must stay: that is
// the vehicle whose nay bloc actually splits on the foreign-commitment axis, and
// the other two were declined by comparison with it.
ok(allRows.some((r) => r.number === "H.R. 8034" && r.issue_key === "america_first_fp"),
  "H.R. 8034 lost its america_first_fp row — the refusals on H.R. 7217 and H.R. 6126 were reasoned against it, so if it is gone the ledger's comparison no longer holds");

// The inverse decline: war_powers on the two resolutions was refused because
// 20260904000000 already wrote it. Rule 21 leaves the live rationale to the first
// writer, which only works if the first writer's row is still there.
for (const n of ["H.Con.Res. 89", "H.Con.Res. 108"]) {
  ok(allRows.some((r) => r.number === n && r.issue_key === "war_powers") ||
     /war_powers/.test(R("netlify/database/migrations/20260904000000_vr_split_umbrella_issue_keys.sql")),
    `${n} has no war_powers mapping anywhere in the migration corpus — this pass declined to author one because 20260904000000 re-keyed it from checks_balances at weight 75; if that was rolled back the axis is now unmapped`);
}

// No measure this pass touched may end up with two primaries.
const primaries = new Map();
for (const r of allRows) {
  if (!r.is_primary) continue;
  primaries.set(r.number + "|" + r.issue_key, r);
}
for (const [number] of TOUCHED) {
  const keys = [...new Set([...primaries.values()].filter((r) => r.number === number).map((r) => r.issue_key))];
  ok(keys.length <= 1,
    `${number} carries more than one primary issue across the migration corpus (${keys.join(", ")}) — the dossier picks one and the other silently loses its flag`);
}

// The seven identity-only measures got no row in this migration, deliberately.
for (const k of IDENTITY_ONLY) {
  const [number] = k.split("|");
  ok(!migRows.some((r) => r.number === number),
    `${number} grew a mapping row in ${MIG} but is on the identity-only list — either the ledger in the migration header is stale or the row was never text-checked`);
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ identity densification wave 2: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ identity densification wave 2: all ${passed} assertions passed — ${TOUCHED.length} measures named from primary text (${IDENTITY_ONLY.size} identity-only), ${NEW_ROWS.length} new mappings sourced and directional, ${DECLINED.length} refusals still refused`);
