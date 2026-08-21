#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY IS NOT OPTIONAL, AND A MAPPING IS ONLY AS GOOD AS THE TEXT UNDER IT
// ─────────────────────────────────────────────────────────────────────────────
// The August 2026 densification pass had one rule above the others: if we map a
// measure or thicken it, we first write down what the bill IS. Eighteen 118th and
// 119th measures that were already carrying roll-call votes got an as-passed or
// as-enrolled summary in db/vr-measure-identity.json, read out of primary text on
// govinfo. Six new issue rows and six repair rows followed in
// netlify/database/migrations/20260917000000_vr_identity_and_thin_key_densification.sql.
//
// WHAT THIS FILE PINS, AND WHY EACH ONE CAN REGRESS
//
//   1 · THE IDENTITY ENTRIES SURVIVE. applyCuratedMeasureIdentity() only fills a
//       provisional title and an EMPTY summary, so an entry that quietly loses its
//       summary field does not error — the measure just goes back to being a bare
//       number on the ledger and nobody notices until a face pass has nothing to
//       teach from. Each of the eighteen is checked for a real summary, a named
//       summarySource, an identityTitleType, and a primary-source URL.
//
//   2 · NO FRAMING, NO BLOG. The brief forbade "supporters say"-style hedging and
//       forbade sourcing identity to commentary. Both are easy to reintroduce,
//       because both read as balance. The source host allowlist is govinfo,
//       congress.gov, GPO and the Federal Register; a summary that starts
//       narrating what anyone SAYS about the bill fails.
//
//   3 · THE SIX NEW ROWS KEEP THEIR DIRECTION AND WEIGHT. support_meaning is the
//       half of a mapping that inverts every member's score on the axis when it
//       flips, and nothing in the schema defends it. H.R. 8595 voting_access is
//       yea_opposes; the other five are yea_supports. All six are secondary.
//
//   4 · THE REPAIR ROWS STAY BYTE-IDENTICAL. Six rows in the July 2026 seeds sit
//       inside an `IF m_id IS NULL THEN` branch and may never have run. The new
//       migration re-asserts them unconditionally. Re-asserting them with DRIFTED
//       text would be new authorship wearing a repair's clothes — runbook rule 21
//       leaves the live rationale to the first writer — so each is compared
//       character for character against the migration that authored it. The one
//       documented exception is S. 331 health_mental, which takes the September
//       2026 framed-rationale rewrite instead, and that is compared too.
//
//   5 · THE DECLINES STAY DECLINED. election_integrity and checks_balances on
//       H.R. 8595, and power_of_purse on H.R. 4 (119th), were refused on the
//       record with reasons. The refuse ledger lives in the migration header,
//       which is a comment and therefore cannot fail a deploy. This can.
//
//   node scripts/test-identity-densification.mjs

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

// ── the eighteen measures this pass wrote identity for ───────────────────────
const TOUCHED = [
  ["H.R. 1", 119], ["S. 2", 119], ["H.R. 1181", 119], ["H.R. 8595", 119],
  ["H.R. 6955", 119], ["H.R. 8800", 119], ["H.R. 7008", 119], ["S. 331", 119],
  ["H.R. 4758", 119], ["H.R. 4405", 119], ["S. 5", 119], ["S. 2296", 119],
  ["H.R. 4", 119], ["H.R. 7148", 119], ["H.R. 1968", 119], ["S. 1582", 119],
  ["H.J.Res. 44", 118], ["H.R. 82", 118],
];

// ── 1 · the identity entries survive ─────────────────────────────────────────
const ident = JSON.parse(R("db/vr-measure-identity.json"));
ok(Array.isArray(ident.measures) && ident.measures.length >= 52,
  `db/vr-measure-identity.json should still carry at least the 52 measures this pass left it with (got ${ident.measures?.length})`);

const byKey = new Map(ident.measures.map((m) => [m.number + "|" + m.congress, m]));
const dupes = ident.measures.length - byKey.size;
eq(dupes, 0, "db/vr-measure-identity.json must not carry two entries for the same (number, congress) — the later one silently wins in applyCuratedMeasureIdentity()");

for (const [number, congress] of TOUCHED) {
  const k = number + "|" + congress;
  const e = byKey.get(k);
  ok(e, `${k} lost its db/vr-measure-identity.json entry — this pass wrote it precisely because the measure was carrying votes with no plain identity`);
  if (!e) continue;
  ok(typeof e.title === "string" && e.title.trim().length > 3,
    `${k} has no usable title`);
  ok(typeof e.summary === "string" && e.summary.trim().length >= 300,
    `${k} has no usable summary — the whole point of this pass was that every measure it touched says what it does (got ${(e.summary || "").length} chars)`);
  ok(typeof e.identityTitleType === "string" && e.identityTitleType.trim().length > 0,
    `${k} has no identityTitleType — runbook rule 6 wants the record to say WHICH title this is, because "as introduced" and "as enacted" are routinely different bills`);
  ok(typeof e.summarySource === "string" && e.summarySource.trim().length > 0,
    `${k} has no summarySource — a summary with no stated stage cannot be re-checked against the text that was voted`);
  ok(e.source && typeof e.source.url === "string",
    `${k} has no source.url`);
  ok(typeof e.chamber === "string" && (e.chamber === "house" || e.chamber === "senate"),
    `${k} has no readable chamber`);
}

// ── 2 · no framing, no blog ──────────────────────────────────────────────────
const FRAMING = [
  "supporters say", "supporters argue", "critics say", "critics argue",
  "opponents say", "opponents argue", "advocates argue", "detractors",
  "proponents say", "proponents argue", "some argue", "many believe",
];
const PRIMARY_HOSTS = ["govinfo.gov", "congress.gov", "gpo.gov", "federalregister.gov"];
for (const [number, congress] of TOUCHED) {
  const e = byKey.get(number + "|" + congress);
  if (!e) continue;
  const k = number + "|" + congress;
  const lower = (e.summary || "").toLowerCase();
  for (const f of FRAMING) {
    ok(lower.indexOf(f) === -1,
      `${k}'s identity summary contains "${f}" — identity states what the text does; who likes it belongs on a stance row, not here`);
  }
  const url = e.source?.url || "";
  ok(PRIMARY_HOSTS.some((h) => url.includes(h)),
    `${k}'s identity is sourced to ${url || "(nothing)"} — the brief allowed Congress.gov text, GPO enrolled text and the Federal Register, and excluded commentary`);
}

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

// Every vr_measure_issues row in one file, attributed to a measure number through
// the nearest preceding `FOR <v> IN … number = 'X'` or `SELECT id INTO <v> … number = 'X'`.
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

// ── 3 · the six new rows keep their direction and weight ─────────────────────
const MIG = "20260917000000_vr_identity_and_thin_key_densification.sql";
ok(readdirSync(MIGDIR).includes(MIG), `${MIG} is missing — this pass's mappings live nowhere else`);
const migRows = readIssueRows(R("netlify/database/migrations/" + MIG));

const NEW_ROWS = [
  ["H.R. 8595",   "election_security", 100, "yea_supports"],
  ["H.R. 8595",   "voter_id",           70, "yea_supports"],
  ["H.R. 8595",   "voting_access",      60, "yea_opposes"],
  ["H.J.Res. 44", "gov_regulation",     60, "yea_supports"],
  ["H.R. 1968",   "health_rural",       45, "yea_supports"],
  ["H.R. 1968",   "immig_fentanyl",     30, "yea_supports"],
];
for (const [number, key, weight, dir] of NEW_ROWS) {
  const r = migRows.find((x) => x.number === number && x.issue_key === key);
  ok(r, `${number} ${key} is not in ${MIG}`);
  if (!r) continue;
  eq(r.support_meaning, dir,
    `${number} ${key} direction changed — flipping support_meaning inverts every member's score on that axis, so it is pinned, not assumed`);
  eq(r.weight, weight, `${number} ${key} weight changed`);
  eq(r.is_primary, false,
    `${number} ${key} must stay secondary — each of these measures already has a primary, and two primaries on one measure is an ingest-visible contradiction`);
  ok(typeof r.rationale === "string" && r.rationale.length >= 200,
    `${number} ${key} has no substantive rationale — a mapping asserts what a member's vote meant and the rationale is the whole of the reasoning`);
  ok(/govinfo\.gov/.test(r.source_url || ""),
    `${number} ${key} is not sourced to the primary text it claims to read`);
  // The rationale must point at text, not gesture at the bill: either it cites a
  // section or division, or — for a one-sentence CRA disapproval, which has
  // neither — it quotes the operative clause verbatim.
  const cites = /\b(Sec\.|section|Division)\b/.test(r.rationale);
  const quotes = (r.rationale.match(/"([^"]{60,})"/) || [])[1];
  ok(cites || quotes,
    `${number} ${key}'s rationale neither cites a section or division nor quotes the operative text — "the bill does X" is a summary, not a citation`);
}
eq(migRows.filter((r) => r.source_url).length, 6,
  "the migration should carry exactly the six NEW sourced rows; the repair block deliberately re-emits without source_url so it matches the first writer's column list");

// ── 4 · the repair rows stay byte-identical ──────────────────────────────────
// The authored text, read back out of the migrations that wrote it rather than
// pasted here, so this cannot drift into agreeing with itself.
const authored = new Map();
for (const f of ["20260721170000_seed_legislation_expansion.sql", "20260721180000_seed_legislation_expansion2.sql"]) {
  for (const r of readIssueRows(R("netlify/database/migrations/" + f))) {
    authored.set(r.number + "|" + r.issue_key, r);
  }
}
// The one documented substitution: S. 331 health_mental was rewritten in
// September 2026 to drop "some public-health advocates argue" framing, so the
// repair carries the rewrite, not the original.
const rewrite = R("netlify/database/migrations/20260906000000_vr_rewrite_framed_mapping_rationales.sql");
const s331mental = rewrite.match(/SET rationale = '((?:[^']|'')*)'\s*\n\s*WHERE issue_key = 'health_mental'/);
ok(s331mental, "could not find the September 2026 rewrite of S. 331 health_mental — if it was removed, the repair row below is re-emitting text nobody has checked");
if (s331mental) authored.set("S. 331|health_mental", { ...authored.get("S. 331|health_mental"), rationale: s331mental[1].replace(/''/g, "'") });

const REPAIR_ROWS = [
  ["S. 331",  "immig_fentanyl", 100, true,  "yea_supports"],
  ["S. 331",  "tough_on_crime",  75, false, "yea_supports"],
  ["S. 331",  "health_mental",   45, false, "yea_opposes"],
  ["H.R. 82", "social_security",100, true,  "yea_supports"],
  ["H.R. 82", "cost_living",     60, false, "yea_supports"],
  ["H.R. 82", "national_debt",   55, false, "yea_opposes"],
];
for (const [number, key, weight, prim, dir] of REPAIR_ROWS) {
  const got = migRows.find((x) => x.number === number && x.issue_key === key);
  const want = authored.get(number + "|" + key);
  ok(got, `${number} ${key} repair row is missing from ${MIG}`);
  ok(want, `${number} ${key} was not found in the migration that authored it`);
  if (!got || !want) continue;
  eq(got.rationale, want.rationale,
    `${number} ${key}'s re-asserted rationale drifted from the authored text — a repair that rewrites is new authorship, and runbook rule 21 leaves the live rationale to the first writer`);
  eq(got.weight, weight, `${number} ${key} repair weight drifted`);
  eq(got.is_primary, prim, `${number} ${key} repair primary flag drifted`);
  eq(got.support_meaning, dir, `${number} ${key} repair direction drifted`);
  eq(got.source_url, null,
    `${number} ${key} repair row grew a source_url — it must match the authored INSERT's column list exactly, or ON CONFLICT DO NOTHING hides a row that differs from the live one`);
  ok(got.rationale.toLowerCase().indexOf("advocates argue") === -1,
    `${number} ${key} re-emitted framing that a later pass had already removed`);
}

// ── 5 · the declines stay declined ───────────────────────────────────────────
// Scanned across every migration, not just this one: the point of writing a
// refuse into the header is that the NEXT pass does not add the row.
const allRows = [];
for (const f of readdirSync(MIGDIR).filter((n) => /^\d{14}_.*\.sql$/.test(n))) {
  for (const r of readIssueRows(R("netlify/database/migrations/" + f))) allRows.push({ ...r, file: f });
}
const DECLINED = [
  ["H.R. 8595", "election_integrity", "election_security and voter_id already carry the same conviction on that measure (rule 22)"],
  ["H.R. 8595", "checks_balances", "rule 28 — the general key takes no roll-call mappings"],
  ["H.R. 4405", "checks_balances", "rule 28"],
  ["H.R. 1968", "checks_balances", "rule 28"],
  ["H.J.Res. 44", "checks_balances", "rule 28"],
];
for (const [number, key, why] of DECLINED) {
  const hit = allRows.find((r) => r.number === number && r.issue_key === key);
  ok(!hit, `${number} picked up ${key} in ${hit?.file} — this pass declined it: ${why}`);
}
// power_of_purse on H.R. 4 (119th) was declined as directionally unreadable: a
// rescission both exercises and relinquishes appropriated authority, and the nay
// bloc has two flanks. Scoped to the 119th because H.R. 4 exists in the 117th too.
const hr4 = allRows.filter((r) => r.number === "H.R. 4" && r.issue_key === "power_of_purse");
ok(hr4.length === 0,
  `H.R. 4 picked up a power_of_purse row in ${hr4[0]?.file} — this pass declined it as directionally unreadable under runbook rule 5; if a later pass added it deliberately, update the DECLINED ledger in ${MIG} and this check with it`);

// No measure this pass touched may end up with two primaries.
const primaries = new Map();
for (const r of allRows) {
  if (!r.is_primary) continue;
  const k = r.number + "|" + r.issue_key;
  if (primaries.has(k)) continue;               // same row re-asserted is not a second primary
  primaries.set(k, r);
}
for (const [number] of NEW_ROWS.concat(REPAIR_ROWS).map((x) => [x[0]])) {
  const keys = [...primaries.values()].filter((r) => r.number === number).map((r) => r.issue_key);
  ok(new Set(keys).size <= 1,
    `${number} carries more than one primary issue across the migration corpus (${[...new Set(keys)].join(", ")}) — the dossier picks one and the other silently loses its flag`);
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ identity densification: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ identity densification: all ${passed} assertions passed — ${TOUCHED.length} measures named from primary text, ${NEW_ROWS.length} new mappings sourced and directional, ${REPAIR_ROWS.length} conditional-branch rows re-asserted byte-identical, ${DECLINED.length + 1} refusals still refused`);
