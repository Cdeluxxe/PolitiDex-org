#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-vocab-wave-v1.mjs — the three keys wave V1 added, and the promise it made
// ─────────────────────────────────────────────────────────────────────────────
// For four waves the Utah curator passes ran on one instruction: a bill with no
// home in the shipped vocabulary is written down as refused, in prose, and left
// out. That kept the vocabulary at 118 keys and left five ledgers of refusals long
// enough to show pattern — three subjects the Legislature returns to, with bills
// whose direction nobody disputes. Wave V1 added a key for each of those three and
// remapped nine bills onto them.
//
// Adding a key is the one change in this repo that cannot be undone quietly. A key
// is a public label on a real person's record: it appears on their alignment cards,
// in the compare surfaces, and in their issue list, and once a member's votes are
// counted under it, deleting it deletes their record of that subject. So the wave
// ran under six standing rules, and this harness is those rules as assertions:
//
//   1. RECURRING. Two or more real instruments, or one landmark with siblings. A
//      key with one bill may be describing a coincidence.
//   2. CLEAN POLARITY. A yea has to mean one thing a voter can say out loud. A
//      text that tightens and loosens the same rule is a refusal, not a mapping.
//   3. NOT A COUSIN. Every new key names, in writing, the shipped chips it is not,
//      and the reason filing the bill there would produce a false reading.
//   4. VOTER LANGUAGE. The chip is a sentence a reader recognises, not a committee
//      caption.
//   5. NO RESTUFFING. Only bills whose recorded refusal was "clear direction, no
//      key" moved. No existing mapping was re-keyed, re-weighted or re-argued.
//   6. NO PARTY LEAN, NO NEW SCORE. None of the three carries a `lean`, none
//      touches Direction Match, and no key was inferred from a bill title.
//
// Three further candidates were REFUSED, and a refusal is a decision that has to
// survive too: the keys must not exist, and the bills they would have carried must
// still be sitting in the ledgers' refusal arrays.
//
//   node scripts/test-vr-vocab-wave-v1.mjs
//
// Nothing here needs a database or a network.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A fixture that stopped offering a case is a silent pass.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ vr-vocab-wave-v1: ${msg}`);
  process.exit(1);
};

const ALIGN = R("alignment-tool.js");
const KEYS_JSON = J("db/issue-keys.json");
const KEYS = new Set(KEYS_JSON.keys);
const LIB = R("digital-library.js");
const RECEIPTS = R("receipt-cards.js");
const EXECUI = R("exec-record-ui.js");
const PROPOSALS = R("db/vr-issue-key-proposals.md");
const MIGRATION = "netlify/database/migrations/20261010000000_vr_vocab_wave_v1.sql";
const SQL = R(MIGRATION);

// The wave, declared once. Everything below is read against this table rather than
// against a string repeated in twelve assertions.
const ADDED = [
  {
    key: "sound_money", cat: "gov", label: "🥇 Gold & Sound Money",
    // The chips a reader could confuse this with, each declined by name in the
    // boundary comment because each would produce a specific false reading.
    notCousinOf: ["crypto_cbdc", "audit_spending", "lower_taxes", "national_debt"],
    // Bills, with the ledger each one lives in and whether it reached the database.
    bills: [
      { ledger: "db/vr-utah-bills-2024GS.json", bill: "HB0348", weight: 80, inDb: true },
      { ledger: "db/vr-utah-bills.json", bill: "HB0067", weight: 40, inDb: true },
      { ledger: "db/vr-utah-committee-bills-2025GS.json", bill: "HB0528", weight: 70, inDb: false },
    ],
  },
  {
    key: "tobacco_nicotine", cat: "health", label: "🚭 Tobacco & Vaping Rules",
    notCousinOf: ["medical_freedom", "health_mental", "healthcare", "healthcare_costs", "cannabis_reform"],
    bills: [
      { ledger: "db/vr-utah-committee-bills-2024GS.json", bill: "SB0061", weight: 80, inDb: false },
      { ledger: "db/vr-utah-committee-bills-2025GS.json", bill: "SB0186", weight: 80, inDb: false },
    ],
  },
  {
    key: "dev_district_finance", cat: "econ", label: "🏟 Development Districts & Public Financing",
    notCousinOf: ["econ_growth", "prop_tax", "property_tax", "housing_build", "housing_support", "infrastructure"],
    bills: [
      { ledger: "db/vr-utah-committee-bills-2024GS.json", bill: "HB0562", weight: 80, inDb: false },
      { ledger: "db/vr-utah-bills.json", bill: "SB0336", weight: 75, inDb: true },
      { ledger: "db/vr-utah-bills.json", bill: "SB0316", weight: 70, inDb: true },
      { ledger: "db/vr-utah-bills.json", bill: "SB0026", weight: 60, inDb: true },
    ],
  },
];
// Refused, and the bills that stay refused with them.
const REFUSED = [
  {
    key: "family_parental_rights", why: "recurrence",
    stillRefused: [
      { ledger: "db/vr-utah-committee-bills-2024GS.json", bill: "HB0198" },
      { ledger: "db/vr-utah-committee-bills-2024GS.json", bill: "HB0532" },
      { ledger: "db/vr-utah-committee-bills-2025GS.json", bill: "HB0129" },
    ],
  },
  {
    key: "disability_rights", why: "recurrence and polarity",
    stillRefused: [
      { ledger: "db/vr-utah-committee-bills-2024GS.json", bill: "SB0082" },
      { ledger: "db/vr-utah-committee-bills-2024GS.json", bill: "HB0197" },
      { ledger: "db/vr-utah-committee-bills-2025GS.json", bill: "HB0334" },
      { ledger: "db/vr-utah-committee-bills-2025GS.json", bill: "SB0199" },
    ],
  },
  {
    key: "road_safety_nonmotorized", why: "recurrence and boundary",
    stillRefused: [
      { ledger: "db/vr-utah-committee-bills-2024GS.json", bill: "HB0449" },
    ],
  },
];
const NEW_KEYS = ADDED.map((a) => a.key);
const LEDGERS = [...new Set(ADDED.concat(REFUSED).flatMap((a) =>
  (a.bills || a.stillRefused).map((b) => b.ledger)))];

must(KEYS.size > 100, "db/issue-keys.json did not load");
must(ALIGN.length > 10000, "alignment-tool.js did not load");

console.log("── Vocab wave V1 (sound_money, tobacco_nicotine, dev_district_finance)");

// ── 1. One source of truth ───────────────────────────────────────────────────
// ISSUE_MAP is the vocabulary; db/issue-keys.json is a build artefact of it, and
// four server modules and five scripts validate against the artefact. A key that
// exists in one and not the other is a key that the client will render and the API
// will reject, or the reverse.
section("One source of truth");
eq(KEYS_JSON.count, 121, "the generated allow-list holds 121 keys");
eq(KEYS_JSON.count, KEYS_JSON.keys.length, "the count is the length of the list it counts");
has(KEYS_JSON._generatedBy, "gen-issue-keys.mjs",
  "the allow-list says it is generated, not hand-written");
// Sync, both ways. Every generated key is a real ISSUE_MAP entry and vice versa —
// `disaster_resilience:{` ships without the space, hence the loose separator.
const entryRe = /^ {6}([a-z_0-9]+): *\{ label: '/gm;
const entryKeys = [...ALIGN.matchAll(entryRe)].map((m) => m[1]);
eq(entryKeys.length, KEYS_JSON.count, "ISSUE_MAP declares exactly as many entries as the allow-list holds");
const notInMap = KEYS_JSON.keys.filter((k) => entryKeys.indexOf(k) < 0);
eq(notInMap.length, 0, `every generated key is an ISSUE_MAP entry (${notInMap.join(", ")})`);
const notInJson = entryKeys.filter((k) => !KEYS.has(k));
eq(notInJson.length, 0, `every ISSUE_MAP entry reached the allow-list (${notInJson.join(", ")})`);
const dupEntries = entryKeys.filter((k, i) => entryKeys.indexOf(k) !== i);
eq(dupEntries.length, 0, `no key is declared twice (${dupEntries.join(", ")})`);
for (const a of ADDED) ok(KEYS.has(a.key), `the wave's key '${a.key}' is in the allow-list`);
// The keywords map is regenerated with the keys, so a new key with keywords that
// never reached the artefact is a half-applied change.
for (const a of ADDED)
  ok(Array.isArray(KEYS_JSON.keywords[a.key]) && KEYS_JSON.keywords[a.key].length >= 8,
    `'${a.key}' carries its keywords into the allow-list`);

// ── 2. Rule 6 — no party lean, and nothing else moved ────────────────────────
// `lean` is the one field on an ISSUE_MAP entry that makes a claim about a party
// rather than about a subject. All three of these subjects split a party in Utah,
// so all three ship without it, and that is asserted rather than assumed.
section("No party lean");
const entryLine = (k) => {
  const re = new RegExp(`^ {6}${k}: *\\{.*$`, "m");
  const m = re.exec(ALIGN);
  return m ? m[0] : "";
};
for (const a of ADDED) {
  const line = entryLine(a.key);
  must(line.length > 40, `could not read the ISSUE_MAP line for '${a.key}'`);
  lacks(line, "lean:", `'${a.key}' carries no party lean`);
  has(line, `label: '${a.label}'`, `'${a.key}' ships the reviewed label`);
  has(line, `cat: '${a.cat}'`, `'${a.key}' is filed under the reviewed category`);
  has(line, "stanceKeys: []",
    `'${a.key}' declares an EMPTY stance list rather than borrowing another key's words`);
  // Rule 4: the chip is the sentence a reader sees. It has to be a sentence about
  // what a vote does, not a caption, and it must not be a bare noun phrase.
  const chip = (/chip: '([^']*)'/.exec(line) || [])[1] || "";
  ok(chip.length >= 40, `'${a.key}' chip is a sentence, not a caption (${chip.length} chars)`);
  ok(/\b(let|tighten|create|hold|pay|finance|capture)\b/i.test(chip),
    `'${a.key}' chip says what a vote DOES: "${chip}"`);
  lacks(chip.toLowerCase(), "amendments", `'${a.key}' chip is not a bill caption`);
}
// Rule 6, second half: Direction Match and the characterisation floors are not part
// of a vocabulary change. If a wave ever needs to move one, it is a different pass.
for (const forbidden of ["DIRECTION_MATCH", "directionMatch"])
  lacks(SQL, forbidden, `the migration does not touch ${forbidden}`);

// ── 3. Rule 3 — not a cousin of a shipped key ────────────────────────────────
// The failure this prevents is specific and has happened: a bill filed under a
// nearby key moves a percentage the reader will read as being about something
// else — a gold-remittance statute under `crypto_cbdc` moves a Bitcoin number, a
// flavour ban under `medical_freedom` moves a vaccine-mandate number in the wrong
// direction, a tax-increment district under `prop_tax` reads as tax relief. So the
// boundary is prose above the entry, and it names every chip it declines.
section("Not a cousin of a shipped key");
for (const a of ADDED) {
  const at = ALIGN.indexOf(`\n      ${a.key}:`);
  must(at > 0, `could not locate '${a.key}' in ISSUE_MAP`);
  // The comment block immediately above the entry, back to the previous entry or
  // section marker.
  const before = ALIGN.slice(0, at);
  const prev = Math.max(before.lastIndexOf("\n      // SCOPE ("), before.lastIndexOf("\n      // ──"));
  const doc = ALIGN.slice(prev, at);
  ok(doc.length >= 900, `'${a.key}' carries a scope argument, not a one-liner (${doc.length} chars)`);
  has(doc, `SCOPE (${a.key})`, `'${a.key}' opens with its own scope sentence`);
  has(doc, "OUT of scope", `'${a.key}' says what it is not`);
  has(doc, "Deliberately carries NO `lean`",
    `'${a.key}' argues the absent lean rather than leaving it unexplained`);
  for (const cousin of a.notCousinOf)
    has(doc, cousin, `'${a.key}' declines '${cousin}' by name`);
  // Rule 1 is argued in the same place: the instruments that forced the key are
  // named in the comment, so a later reader can check the recurrence claim.
  for (const b of a.bills) {
    const num = b.bill.replace(/^([HS])B0*(\d+)$/, (_, c, d) => `${c}.B. ${d}`);
    has(doc, num, `'${a.key}' names ${num} as one of the instruments that forced it`);
  }
  ok(a.bills.length >= 2, `'${a.key}' was forced by ${a.bills.length} instruments, not one`);
}
// And no umbrella chips. A wave that ships "culture" or "woke" has stopped being a
// vocabulary and started being a mood.
for (const slop of ["culture", "woke", "anti_woke", "values", "patriotism", "common_sense"])
  lacks(ALIGN, `\n      ${slop}:`, `no umbrella chip '${slop}' was added`);

// ── 4. Every key-aware surface knows the id ──────────────────────────────────
// A key that ISSUE_MAP declares and digital-library.js has never heard of renders
// with no category chip; a key that lands on a deny-list is silently held back on
// the receipt surfaces. Both are silent, so both are pinned.
section("Every key-aware surface knows the id");
const catStart = LIB.indexOf("var ISSUE_CAT = {");
const catBlock = LIB.slice(catStart, LIB.indexOf("var ISSUE_CAT_ORDER"));
must(catStart > 0 && catBlock.indexOf("keys:") > 0,
  "could not isolate digital-library's ISSUE_CAT table");
for (const a of ADDED) {
  const hits = (catBlock.match(new RegExp(`'${a.key}'`, "g")) || []).length;
  eq(hits, 1, `'${a.key}' is categorised exactly once in the browse table`);
}
// The deny-lists are deny-lists: nothing from this wave belongs on one, and the
// entries that ARE on them belong to other passes and must not have moved.
for (const [src, file, name, held] of [
  [RECEIPTS, "receipt-cards.js", "BLOCKED_ISSUE_KEYS", "tariffs_authority"],
  [RECEIPTS, "receipt-cards.js", "WAVE1_HOLD_ISSUE_KEYS", "checks_balances"],
  [EXECUI, "exec-record-ui.js", "HELD_ISSUE_KEYS", "tariffs_authority"],
]) {
  const at = src.indexOf(`var ${name} = {`);
  must(at > 0, `could not locate ${name} in ${file}`);
  const block = src.slice(at, src.indexOf("\n  };", at));
  has(block, `${held}:`, `${file} ${name} still holds '${held}'`);
  eq((block.match(/^ {4}[a-z_0-9]+:/gm) || []).length, 1,
    `${file} ${name} holds exactly the one entry it held before the wave`);
  for (const a of ADDED)
    lacks(block, a.key, `${file} ${name} does not hold back '${a.key}'`);
}

// ── 4b. A keyword is also a claim about a slogan ─────────────────────────────
// The trap this wave nearly walked into. `keywords` was written as a hint for the
// optional ingest classifier — suggest an issue from a bill title — but
// word-action.js's brandingIssueKey() reads the SAME list and matches it against a
// member's campaign issue LABELS. So the keyword 'sound money' on a Utah treasury
// key linked Rep. Luna's "Spending & Sound Money" branding label, gave a Florida
// member a fifth scorable issue, and moved her depth caption's denominator — on a
// key with no federal instrument behind it, so the row could never be tested. A
// vocabulary pass is not allowed to move a score anywhere, least of all in another
// legislature. The keyword came out; this asserts that no keyword the wave added
// reaches any branding label on the roster, which is a guard the next wave gets for
// free.
section("A keyword is also a claim about a slogan");
const win = makeSandbox();
const ctx = vm.createContext(win);
for (const f of ["cmp-data.js", "alignment-tool.js"])
  vm.runInContext(R(f), ctx, { filename: f });
const CMP = win.CMP_DATA || {};
const IM = win.ISSUE_MAP || {};
must(Object.keys(CMP).length > 300, "CMP_DATA did not boot, so no label can be checked");
must(Object.keys(IM).length === KEYS_JSON.count, "ISSUE_MAP did not boot to the shipped size");
const brandLabels = new Set();
for (const p of Object.values(CMP))
  for (const l of [].concat(p.keyIssues || [], p.issues || [])) if (l) brandLabels.add(String(l));
must(brandLabels.size > 200, `only ${brandLabels.size} branding labels found — the probe is not reading the roster`);
// brandingIssueKey normalises to lower case and matches on a word boundary.
const collides = [];
for (const label of brandLabels) {
  const norm = label.toLowerCase().trim();
  if (norm.length < 4) continue;
  for (const a of ADDED) {
    for (const kw of IM[a.key].keywords || []) {
      const w = String(kw).toLowerCase();
      const re = new RegExp("(^|[^a-z])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z]|$)");
      if (norm === w || re.test(norm)) collides.push(`${a.key}/'${kw}' matches branding label "${label}"`);
    }
  }
}
eq(collides.length, 0, `no keyword the wave added reaches a campaign issue label (${collides.slice(0, 4).join("; ")})`);
// Named, so a later reader does not helpfully restore the obvious phrase.
for (const gone of ["sound money", "hard money"])
  ok((IM.sound_money.keywords || []).indexOf(gone) < 0,
    `'${gone}' is deliberately absent from sound_money's keywords`);
has(ALIGN, "Do not\n      // restore them just because they read like the key's name",
  "the absent keywords are argued in place, not just missing");

// ── 5. Rule 5 — nothing was restuffed ────────────────────────────────────────
// The rule the wave could most easily have broken quietly: rather than admit a
// bill, re-key one that already had a home so the new chip looks busy. Checked
// against HEAD, which is the state before the wave, so it is a fact and not a
// claim. Every mapping that existed still has the same key, weight, primary flag
// and direction; the only difference in any ledger is bills that MOVED OUT of the
// refusal array.
section("Nothing was restuffed");
let churned = 0, appeared = [], unrefused = [];
for (const f of LEDGERS) {
  let head;
  try { head = JSON.parse(execSync(`git show HEAD:${f}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })); }
  catch { must(false, `could not read HEAD:${f} — the before-state is unavailable`); }
  const now = J(f);
  const sig = (b) => (b.issues || [])
    .map((i) => `${i.issueKey}/${i.weight}/${i.isPrimary ? "P" : "-"}/${i.supportMeaning}`)
    .sort().join(",");
  const wasMapped = new Map((head.bills || []).map((b) => [b.bill, b]));
  const nowMapped = new Map((now.bills || []).map((b) => [b.bill, b]));
  for (const [bill, was] of wasMapped) {
    const is = nowMapped.get(bill);
    ok(!!is, `${f}: ${bill} was mapped before the wave and still is`);
    if (is && sig(was) !== sig(is)) {
      churned++;
      failures.push(`${f}: ${bill} was re-keyed — before ${sig(was)} / after ${sig(is)}`);
    } else if (is) passed++;
  }
  for (const [bill] of nowMapped) if (!wasMapped.has(bill)) appeared.push(`${f}|${bill}`);
  const wasRefused = new Set((head._refused || []).map((r) => r.bill));
  const nowRefused = new Set((now._refused || []).map((r) => r.bill));
  for (const b of wasRefused) if (!nowRefused.has(b)) unrefused.push(`${f}|${b}`);
  for (const b of nowRefused)
    ok(wasRefused.has(b), `${f}: ${b} was already a refusal — the wave invented none`);
  // A wave key on a bill that already had a home is the restuffing this forbids.
  for (const [bill, is] of nowMapped)
    if (wasMapped.has(bill))
      ok(!(is.issues || []).some((i) => NEW_KEYS.indexOf(i.issueKey) >= 0),
        `${f}: the pre-existing mapping of ${bill} did not acquire a wave key`);
}
eq(churned, 0, "no existing mapping changed key, weight, primary flag or direction");
const expectedMoved = ADDED.flatMap((a) => a.bills.map((b) => `${b.ledger}|${b.bill}`)).sort();
eq(JSON.stringify(appeared.sort()), JSON.stringify(expectedMoved),
  "exactly the wave's nine bills appeared in a ledger");
eq(JSON.stringify(unrefused.sort()), JSON.stringify(expectedMoved),
  "every bill that appeared came out of a refusal array, and no other refusal was dropped");

// ── 6. Rules 1 and 2 — the nine mappings are arguable ────────────────────────
// A mapping is a public claim about what a bill did and which way a yea points.
// Weight, direction, a rationale that names the provisions it read, and one primary
// key per bill — the same floor the record harness holds the older waves to.
section("The nine mappings are arguable");
const MEANINGS = new Set(["yea_supports", "yea_opposes"]);
let mapped = 0;
for (const a of ADDED) {
  for (const b of a.bills) {
    const led = J(b.ledger);
    const row = (led.bills || []).find((x) => x.bill === b.bill);
    must(!!row, `${b.ledger}: ${b.bill} is not in the ledger at all`);
    ok(!(led._refused || []).some((r) => r.bill === b.bill),
      `${b.bill} is not both mapped and refused`);
    const it = (row.issues || []).find((i) => i.issueKey === a.key);
    must(!!it, `${b.bill} carries no '${a.key}' mapping`);
    mapped++;
    eq((row.issues || []).length, 1,
      `${b.bill} was admitted on the one key the wave gave it, not bundled`);
    eq(it.weight, b.weight, `${b.bill}/${a.key}: weight is the reviewed one`);
    eq(it.isPrimary, true, `${b.bill}/${a.key}: the new key is the bill's primary subject`);
    // Rule 2. Every one of these nine bills widens or tightens; not one of them is
    // admitted on a text that does both.
    eq(it.supportMeaning, "yea_supports",
      `${b.bill}/${a.key}: a yea points the way the chip reads`);
    ok(String(it.rationale || "").length >= 200,
      `${b.bill}/${a.key}: the rationale is argued, not asserted (${String(it.rationale || "").length} chars)`);
    // Rule 6's last clause: no key inferred from a title. The rationale has to name
    // the text it was read from.
    ok(/enrolled text|enrolled bill|the bill's text|highlighted provisions/i.test(it.rationale || ""),
      `${b.bill}/${a.key}: the rationale names the text it was read from`);
    lacks(it.rationale, "the title", `${b.bill}/${a.key}: the rationale did not read the title`);
  }
}
eq(mapped, 9, "nine bills were remapped");

// ── 7. The honest holes are stated, not hidden ───────────────────────────────
// Four of the nine bills are committee-only. Their curator mappings exist and their
// database rows do not, because the committee pipeline needs a minutes roster that
// has not been produced, and attributing a committee vote without it means guessing
// who was in the room. A hole that is disclosed is a coverage gap; the same hole
// undisclosed is a false claim, so the disclosure is asserted.
section("The honest holes are stated");
const inDb = ADDED.flatMap((a) => a.bills.filter((b) => b.inDb).map((b) => b.bill));
const notInDb = ADDED.flatMap((a) => a.bills.filter((b) => !b.inDb).map((b) => b.bill));
eq(inDb.length, 5, "five of the nine bills reached the database");
eq(notInDb.length, 4, "four are committee-only and reached the ledgers alone");
for (const bill of inDb) has(SQL, `'utahBill', '${bill}'`, `${bill} is in the migration`);
for (const bill of notInDb) {
  lacks(SQL, `'utahBill', '${bill}'`,
    `${bill} has no database rows while its votes are committee-only`);
  const num = bill.replace(/^([HS])B0*(\d+)$/, (_, c, d) => `${c}.B. ${d}`);
  has(SQL, num, `the migration names ${num} as a bill it deliberately left out`);
}
has(SQL, "guessing who was in the room",
  "the migration says why the committee-only bills got no rows");
// tobacco_nicotine is the sharpest version of the hole: a key with a chip, a
// category and no act behind it anywhere in the database.
lacks(SQL, "'tobacco_nicotine',", "tobacco_nicotine writes no rows in this wave");

// ── 8. A refusal is a decision too ───────────────────────────────────────────
// The three keys the wave declined must not exist anywhere a key can exist, and
// the bills that would have moved must still be refused, with their prose intact.
section("A refusal is a decision too");
for (const r of REFUSED) {
  ok(!KEYS.has(r.key), `the refused key '${r.key}' is not in the allow-list`);
  lacks(ALIGN, `\n      ${r.key}:`, `the refused key '${r.key}' is not an ISSUE_MAP entry`);
  lacks(LIB, `'${r.key}'`, `the refused key '${r.key}' was not categorised in the browse table`);
  lacks(SQL, `'${r.key}'`, `the refused key '${r.key}' writes nothing`);
  for (const b of r.stillRefused) {
    const led = J(b.ledger);
    const row = (led._refused || []).find((x) => x.bill === b.bill);
    must(!!row, `${b.ledger}: ${b.bill} is no longer in the refusal array at all`);
    ok(!(led.bills || []).some((x) => x.bill === b.bill),
      `${b.bill} stayed refused when '${r.key}' was declined`);
    ok(String(row.why || "").length >= 200,
      `${b.bill}: the refusal is still argued, not a stub`);
  }
}
// One bill was refused even though the wave's own key would have carried a
// provision in it. That is rule 2 winning over coverage, and the ledger has to say
// so in as many words rather than leaving the reader to notice the gap.
const G25 = J("db/vr-utah-committee-bills-2025GS.json");
const sb337 = (G25._refused || []).find((r) => r.bill === "SB0337");
must(!!sb337, "SB0337 is not in the 2025GS committee refusal array");
has(sb337.why, "STILL REFUSED after vocab wave V1",
  "SB0337's refusal is dated to the wave that could have carried it");
has(sb337.why, "dev_district_finance",
  "SB0337's refusal names the key that exists and still does not fit");
ok(!(G25.bills || []).some((b) => b.bill === "SB0337"), "SB0337 was not admitted anyway");
// And the boundary case, which is the more instructive one: S.B. 306 is S.B. 26
// with the reinvestment zone removed. S.B. 26 was admitted, S.B. 306 was not, and
// the difference is the whole scope of the key — the district, not the money spent
// near it. Both ledgers that refused it had to be re-argued, because the older note
// said "no key carries it" and that has stopped being the reason.
for (const f of ["db/vr-utah-bills.json", "db/vr-utah-committee-bills-2025GS.json"]) {
  const led = J(f);
  const row = (led._refused || []).find((r) => r.bill === "SB0306");
  must(!!row, `${f}: SB0306 is not in the refusal array`);
  ok(!(led.bills || []).some((b) => b.bill === "SB0306"),
    `${f}: SB0306 was not admitted on a key it sits outside`);
  has(row.why, "STILL REFUSED after vocab wave V1",
    `${f}: SB0306's refusal is dated to the wave that re-read it`);
  has(row.why, "dev_district_finance",
    `${f}: SB0306's refusal names the key it was measured against`);
  has(row.why, "S.B. 26", `${f}: SB0306's refusal names the bill it is the boundary against`);
  lacks(row.why, "no key carries it",
    `${f}: SB0306's refusal no longer claims the vocabulary is empty here`);
}

// ── 9. The proposal file records what happened ───────────────────────────────
// The file that opened these six questions is the only place a later reader will
// look to find out how they were answered, so leaving it saying "nothing here is
// applied" would be the most expensive kind of stale.
section("The proposal file records what happened");
lacks(PROPOSALS, "Status: PROPOSAL. Nothing here is applied.",
  "the proposal file no longer claims nothing was applied");
has(PROPOSALS, "**Status: DECIDED.", "the proposal file states that the six were decided");
has(PROPOSALS, "Still proposed: **nothing.**",
  "the proposal file says there is no leftover proposal list");
eq((PROPOSALS.match(/\*\*Decision: /g) || []).length, 6,
  "all six proposals carry a decision");
eq((PROPOSALS.match(/\*\*Decision: APPLIED/g) || []).length, 3, "three proposals say APPLIED");
eq((PROPOSALS.match(/\*\*Decision: REFUSED/g) || []).length, 3, "three proposals say REFUSED");
for (const a of ADDED) has(PROPOSALS, `\`${a.key}\` | **APPLIED**`,
  `the decision table marks '${a.key}' applied`);
for (const r of REFUSED) has(PROPOSALS, `\`${r.key}\` | **REFUSED** — ${r.why}`,
  `the decision table marks '${r.key}' refused, with the rule it failed`);
has(PROPOSALS, "118 → 121", "the proposal file reports the key count before and after");
has(PROPOSALS, MIGRATION.replace("netlify/database/migrations/", "").replace(".sql", ""),
  "the proposal file points at the migration that applied the wave");
// The one refusal a reader is most likely to challenge, because a second bill does
// exist: it is refused on the ground that the second bill already has a home.
has(PROPOSALS, "mapped to `transit` at weight 50, primary**",
  "the road-safety refusal names the shipped key that already carries its sibling");
const hb290 = (J("db/vr-utah-vote-seed.json").measures || [])
  .find((m) => m.utahBill === "HB0290");
must(!!hb290, "HB0290 is not in the 2025GS seed, so the road-safety refusal is unverifiable");
eq((hb290.issues || [])[0].issueKey, "transit",
  "HB0290 is still mapped to transit — the refusal's premise holds");
eq((hb290.issues || [])[0].weight, 50, "HB0290's transit weight was not touched by the wave");

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ vr-vocab-wave-v1: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`   • ${f}`);
  process.exit(1);
}
console.log(`   ${passed} checks passed`);
console.log("✓ vr-vocab-wave-v1: three keys added on argued boundaries, nine bills homed, nothing restuffed");
