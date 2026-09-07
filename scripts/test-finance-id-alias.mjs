#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-finance-id-alias.mjs — one filing, whatever id the person file is open
// under
// ─────────────────────────────────────────────────────────────────────────────
// Two of the thirteen itemized filings are stored under a short key the rest of
// the product retired: `bking` is the filing for the person file `brian_king`,
// and `gleich` is the filing for `caroline_gleich`. Every pid-keyed finance
// reader dipped straight into the `_FTM_BY_ID` index, so BOTH surfaces on those
// two files — the letterhead 💰 chip and the 💰 Money & Funding section — said
// "No money file on hand" while the dollars sat one alias away. A site holding a
// filing and telling the reader it has none is the worst of the three possible
// states, on the surface whose whole job is to say which gaps are real.
//
// The fix is one table (FTM_ID_ALIAS) and one resolver (`_ftmRecord`) at the one
// shipped finance index, and this file is the fence around it:
//
//   1. THE TABLE IS A BRIDGE, NOT A CLAIM. Keys are ids the person file opens
//      under and are NOT themselves filing keys; values ARE filing keys. No
//      cycles, no id aliased twice, nothing invented about anybody.
//   2. THE CHIP AND THE SECTION CANNOT DISAGREE. The chip's door
//      (`_pdxFinanceFiling` → the lane) and the section's door
//      (`_pdxFinanceSignal`) are asked for the same person and must come back
//      with the same record and the SAME DOLLARS — the exact failure this lane
//      already shipped once.
//   3. THE SHORT KEY IS NOT A SECOND MONEY STORY. `bking` and `gleich` resolve
//      to the identical record object their canonical id resolves to, so no
//      address can grow a second, drifting figure.
//   4. COVERAGE COUNTS PEOPLE, NOT KEYS. Aliases resolve at lookup time and are
//      never written into the index, so the numerator stays 13 — not 15 — and
//      the coverage sentence still says 13.
//   5. NOTHING ELSE MOVED. Lee still reads on file, a Utah member with no filing
//      still reads as an absent file rather than a zero, and an unknown pid is
//      still null.
//   6. THE LANE'S OWN SECOND SEAM AGREES. With the published accessor absent
//      (a harness, or a boot that has not reached the index yet) the lane's raw
//      fallback resolves through the same table, so the answer cannot depend on
//      which files have loaded.
//   7. THE ALIAS IS FINANCE-ONLY. No scoring or ordering file may so much as
//      name the table — that is the wall NEVER_FEEDS declares.
//   8. IT IS A LOOKUP, NOT A ROUTING TABLE. /p/<id> resolves exactly as before;
//      a finance table that became an address book would be minting profiles.
//
//   node scripts/test-finance-id-alias.mjs
//
// The REAL shipped accessor block is lifted out of index.html and run in a
// node:vm sandbox with the REAL finance-lane.js and the REAL 1,120-person
// roster, because a fixture of this table would keep passing while the shipped
// filings broke — which is precisely how the gap got here.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const INDEX = R("index.html");
const LANE_SRC = R("finance-lane.js");

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
const visible = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const aria = (html) => (/aria-label="([^"]*)"/.exec(String(html)) || [])[1] || "";
const dollars = (html) => (visible(html).match(/\$[\d.,]+[KMB]?/g) || []);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ finance id alias: ${msg}`);
  process.exit(1);
};

// ── The REAL accessor block, lifted out of index.html ───────────────────────
// One contiguous slice from the FTM_DATA literal through the end of
// `window._pdxFunding`, so the seed, the index, the alias table, the resolver
// and all five pid-keyed accessors are the shipped ones rather than retyped.
// Everything in that span is a declaration; nothing in it touches the DOM at
// load time.
function liftAccessorBlock() {
  const at = INDEX.indexOf("    var FTM_DATA = [");
  must(at > 0, "FTM_DATA is no longer in index.html");
  const endMark = "    // Small escapers so the funding UI is safe";
  const end = INDEX.indexOf(endMark, at);
  must(end > at, "could not find the end of the finance accessor block");
  const src = INDEX.slice(at, end);
  for (const needed of [
    "var FTM_FUNDING = {", "FTM_DATA.forEach(function(p) { if (FTM_FUNDING[p.id])",
    "var FTM_AS_OF", "function _financeSignal(p)", "var _FTM_BY_ID = {}",
    "var FTM_ID_ALIAS = {", "function _ftmRecord(pid)",
    "window.PDX_FINANCE_ID_ALIAS", "window._pdxFinanceSignal",
    "window._pdxFinanceRecord", "window._pdxFinanceFiling",
    "window._pdxFinanceIds", "window._pdxFunding",
  ]) {
    must(src.indexOf(needed) >= 0, `the lifted block is missing ${needed}`);
  }
  return src;
}
const BLOCK_SRC = liftAccessorBlock();

function boot(strip) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
  vm.runInContext(BLOCK_SRC, ctx, { filename: "index.html#finance" });
  must(win.PDXFinanceLane, "finance-lane.js did not install PDXFinanceLane");
  must(typeof win._pdxFinanceFiling === "function", "the accessor block did not install _pdxFinanceFiling");
  must(win.CMP_DATA && Object.keys(win.CMP_DATA).length > 500, "cmp-data.js did not load a roster");
  // Globals a page script assigned have to be removed from INSIDE the context —
  // a delete on the sandbox object from out here does not reach them, which
  // would silently turn the seam checks below into no-ops.
  for (const name of strip || []) {
    vm.runInContext(`delete window.${name};`, ctx, { filename: "strip" });
    must(typeof win[name] === "undefined" ||
         vm.runInContext(`typeof window.${name}`, ctx) === "undefined",
      `could not remove window.${name} for the seam check`);
  }
  return win;
}
const W = boot();
const L = W.PDXFinanceLane;
const ROSTER = W.CMP_DATA;
const ALIAS = W.PDX_FINANCE_ID_ALIAS;
const BY_ID = W._FTM_BY_ID;

// The two people this pass is about, named because the request names them.
const PAIRS = [
  { pid: "brian_king", key: "bking" },
  { pid: "caroline_gleich", key: "gleich" },
];

console.log("finance id alias — one filing, whatever id the person file is open under\n");

// ── 1. The table is a bridge, not a claim ───────────────────────────────────
section("1. the alias table points at real filings, in one direction only");
ok(ALIAS && typeof ALIAS === "object", "PDX_FINANCE_ID_ALIAS is published for the lane to read");
const A_KEYS = Object.keys(ALIAS || {});
ok(A_KEYS.length >= 2, `the table carries the aliases this pass added (${A_KEYS.length})`);
for (const pid of A_KEYS) {
  const key = ALIAS[pid];
  ok(!!BY_ID[key], `${pid} → ${key}: the value is a real filing in the index`);
  ok(!BY_ID[pid], `${pid} is not itself a filing key — aliasing a key that exists would shadow a real file`);
  ok(!ALIAS[key], `${key} is not itself aliased — the table has no chains`);
  ok(typeof key === "string" && key !== pid, `${pid}: the alias is a distinct string key`);
}
// A pid on the left has to be an id a person file can actually be open under.
for (const { pid } of PAIRS) {
  eq(ALIAS[pid], PAIRS.find((p) => p.pid === pid).key, `${pid} is aliased to its filing`);
}
ok(ROSTER.brian_king, "brian_king is a live roster record, so the left side is a real address");
// The published mirror is a copy: a caller that mutates it cannot reach the
// index's own table.
ok(ALIAS !== W.FTM_ID_ALIAS, "the published table is a copy, not the live object");

// ── 2. The chip and the section cannot disagree ─────────────────────────────
section("2. both surfaces resolve one record and print the same dollars");
const TOTALS = {};
for (const { pid } of PAIRS) {
  const filing = W._pdxFinanceFiling(pid);   // the chip's door
  const sig = W._pdxFinanceSignal(pid);      // the section's door
  const funding = W._pdxFunding(pid);        // compare / card door
  const rec = W._pdxFinanceRecord(pid);
  ok(!!filing, `${pid}: the chip's door finds the filing`);
  ok(!!sig, `${pid}: the money section's door finds the filing`);
  ok(!!funding, `${pid}: the compact funding lookup finds the filing`);
  ok(!!rec, `${pid}: the record lookup finds the filing`);
  // The accessors hand back shallow COPIES on purpose (a display module must not
  // be able to mutate the shipped record), so the check is that they agree about
  // the filing, not that they share an object.
  eq(rec.id, filing.id, `${pid}: both accessors name one filing`);
  eq(funding.id, filing.id, `${pid}: the compact lookup names the same filing`);
  eq(rec.totalRaised, filing.totalRaised, `${pid}: both accessors report one total`);
  eq(sig.pid, filing.id, `${pid}: the section's composition is composed from that filing`);
  ok(filing !== BY_ID[filing.id], `${pid}: the accessor is a copy, not the shipped record`);

  const cr = L.chipRead(pid);
  eq(cr.state, "file", `${pid}: the letterhead chip reads as a file on hand`);
  const chip = L.letterheadChipHtml(pid);
  const entry = L.entryHtml(pid);
  const chipMoney = dollars(chip);
  const entryMoney = dollars(entry);
  ok(chipMoney.length > 0, `${pid}: the chip prints a dollar figure`);
  ok(entryMoney.length > 0, `${pid}: the section prints a dollar figure`);
  // The section leads with the largest reported source "$X of $TOTAL", so the
  // shared quantity is the total: the chip's one figure has to be a figure the
  // section prints, or the letterhead is promising dollars the lane below it
  // does not have.
  ok(entryMoney.indexOf(chipMoney[0]) >= 0,
    `${pid}: the chip's figure ${chipMoney[0]} is one the section prints (${entryMoney.join(" ")})`);
  eq(funding.raisedFmt, chipMoney[0], `${pid}: the formatted total matches the chip figure`);
  eq(chipMoney[0], W._fmtMoney ? W._fmtMoney(filing.totalRaised) : chipMoney[0],
    `${pid}: the chip figure is the filing's own total, formatted once`);
  lacks(visible(chip), "No money file on hand", `${pid}: the chip no longer claims an empty shelf`);
  lacks(visible(entry), "No money file on hand", `${pid}: the section no longer claims an empty shelf`);
  TOTALS[pid] = {
    chip: chipMoney[0],
    // The same total, read back out of the section's own markup rather than
    // recomputed here — that is the whole point of the pass.
    section: entryMoney.filter((m) => m === chipMoney[0])[0] || "(absent)",
    lead: entryMoney[0],
    raised: filing.totalRaised,
    cycle: (filing.funding || {}).cycle,
  };
}

// ── 3. The short key is not a second money story ────────────────────────────
section("3. the short key reaches the same record, not a second one");
for (const { pid, key } of PAIRS) {
  const viaKey = W._pdxFinanceFiling(key);
  const viaPid = W._pdxFinanceFiling(pid);
  ok(!!viaKey, `${key}: the stored key still resolves (nothing was renamed out from under it)`);
  eq(JSON.stringify(viaKey), JSON.stringify(viaPid),
    `${key} and ${pid} read one filing — two addresses, not two money stories`);
  eq(viaKey.id, key, `${key}: the filing keeps its own id, so nothing was rewritten in the seed`);
  eq(dollars(L.letterheadChipHtml(key))[0], dollars(L.letterheadChipHtml(pid))[0],
    `${key} and ${pid} print one figure`);
  eq(L.chipRead(key).state, L.chipRead(pid).state, `${key} and ${pid} read the same state`);
  eq(W._pdxFunding(key).raised, W._pdxFunding(pid).raised, `${key} and ${pid} report one total raised`);
}

// ── 4. Coverage counts people, not keys ─────────────────────────────────────
section("4. the numerator did not move");
const IDS = W._pdxFinanceIds();
eq(IDS.length, 13, "13 itemized filings are on file — aliases add addresses, not filings");
for (const { pid } of PAIRS) {
  ok(IDS.indexOf(pid) < 0, `${pid} is not counted a second time in the filing list`);
}
for (const { key } of PAIRS) {
  ok(IDS.indexOf(key) >= 0, `${key} is counted once, as the filing it is`);
}
const cov = L.coverage();
eq(cov.onFile, 13, "the lane's coverage read counts 13 people on file");
eq(cov.roster, Object.keys(ROSTER).length, "the denominator is the whole roster");
const covSentence = cov.sentence || "";
has(covSentence, " 13 ", "the coverage sentence says 13");
lacks(covSentence, " 15 ", "the coverage sentence does not count keys as people");
lacks(covSentence, "%", "the coverage sentence prints no percentage");
for (const { pid } of PAIRS) {
  lacks(visible(L.letterheadChipHtml(pid)), "%", `${pid}: no percentage entered the chip chrome`);
  lacks(aria(L.letterheadChipHtml(pid)), "%", `${pid}: no percentage entered the accessible name`);
}

// ── 5. Nothing else moved ───────────────────────────────────────────────────
section("5. the files that were right stay right");
ok(!!W._pdxFinanceFiling("lee"), "lee still reads as on file");
eq(L.chipRead("lee").state, "file", "lee's chip still reads as a file on hand");
// A Utah member with no filing, found rather than typed: a hard-coded pid rots
// the first time the roster is edited, the shape of the question does not.
const THIN_UTAH = Object.keys(ROSTER).filter((id) => {
  const p = ROSTER[id] || {};
  const st = String(p.state || p.stateCode || "");
  return (st === "UT" || st === "Utah") && !W._pdxFinanceFiling(id);
})[0];
must(THIN_UTAH, "could not find a Utah member with no filing");
eq(L.chipRead(THIN_UTAH).state, "empty", `${THIN_UTAH}: a member with no filing still reads as empty`);
has(visible(L.letterheadChipHtml(THIN_UTAH)), "No money file on hand",
  `${THIN_UTAH}: an absent file says the shelf is empty`);
ok(!/\$|\b0\b/.test(visible(L.letterheadChipHtml(THIN_UTAH)).replace(/of the \d+/g, "").replace(/for \d+/g, "")),
  `${THIN_UTAH}: an absent file is not printed as a zero`);
eq(W._pdxFinanceFiling("no_such_person_at_all"), null, "an unknown pid is still null");
eq(W._pdxFinanceFiling(""), null, "an empty pid is still null");
eq(W._pdxFinanceFiling(null), null, "a null pid is still null");
eq(W._pdxFinanceSignal("no_such_person_at_all"), null, "an unknown pid has no signal");

// ── 6. The lane's own fallback seam reads the same table ────────────────────
section("6. the lane's raw-index seam resolves through the published table");
{
  // The published accessor removed: this is the harness / pre-index boot order,
  // and it is the seam that used to answer differently from the first one.
  const win = boot(["_pdxFinanceFiling"]);
  for (const { pid, key } of PAIRS) {
    const cr = win.PDXFinanceLane.chipRead(pid);
    eq(cr.state, "file", `${pid}: the lane's raw fallback still finds the filing via the alias`);
    eq(cr.composition.pid, key, `${pid}: the fallback resolved through the table to ${key}`);
    eq(JSON.stringify(win.PDXFinanceLane.read(pid)), JSON.stringify(win.PDXFinanceLane.read(key)),
      `${pid}: the fallback composes exactly the filing ${key} composes`);
    eq(dollars(win.PDXFinanceLane.letterheadChipHtml(pid))[0], TOTALS[pid].chip,
      `${pid}: the fallback seam prints the same dollars as the accessor seam`);
  }
  // No table published at all (an older index blob served out of a warm shell):
  // the lane has to degrade to a calm gap rather than throw on the letterhead.
  const noTable = boot(["_pdxFinanceFiling", "PDX_FINANCE_ID_ALIAS"]);
  eq(noTable.PDXFinanceLane.chipRead("brian_king").state, "empty",
    "with no table published the lane degrades to a calm gap rather than throwing");
  eq(noTable.PDXFinanceLane.chipRead("lee").state, "file",
    "and a filing stored under its own id is unaffected by the table's absence");
}

// ── 7. The alias is finance-only ────────────────────────────────────────────
section("7. no scoring or ordering file knows the table exists");
const NAMES = /FTM_ID_ALIAS|PDX_FINANCE_ID_ALIAS|_ftmRecord/;
for (const f of [
  "word-action.js", "consistency.js", "profiles-full.js", "person-file.js",
  "profile-evidence.js", "cmp-data.js",
]) {
  let src = "";
  try { src = R(f); } catch (e) { continue; }
  ok(!NAMES.test(src), `${f} does not name the finance alias table`);
}
// It is also not a general identity door: the product's own identity tables are
// untouched, so nothing outside finance changed address.
ok(!/caroline_gleich/.test(R("profile-evidence.js")),
  "PDX_PROFILE_ALIAS was not made the door (test-identity-integrity §11 holds its values to live roster records)");
has(R("finance-lane.js"), "PDX_FINANCE_ID_ALIAS", "the lane reads the published table rather than a copy of its own");
ok((L.NEVER_FEEDS || []).length > 0, "the wall is still declared");
eq(L.scored, false, "the lane is still unscored");

// ── 8. It is a finance lookup, not a routing table ──────────────────────────
// The identity lane has to answer /p/<id> exactly as it did before. A finance
// table that quietly became an address book would be minting profiles, which is
// the one thing this pass was told not to do.
section("8. no new person-file address was minted");
{
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "profile-evidence.js", "person-file.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  const P = win.PDXPerson;
  must(P && typeof P.resolve === "function", "PDXPerson.resolve is unavailable");
  eq(P.resolve("brian_king"), "brian_king", "/p/brian_king still opens the roster file it always opened");
  eq(P.resolve("lee"), "lee", "/p/lee is untouched");
  for (const { key } of PAIRS) {
    eq(P.resolve(key), "", `/p/${key} is not an address the identity lane invents — the filing key stayed a filing key`);
    eq(win.PDXProfilePid(key), key, `${key} was not written into the app's alias tables`);
  }
}

// ── The two totals, printed so a human can see they match ───────────────────
section("resolved totals");
for (const { pid, key } of PAIRS) {
  const t = TOTALS[pid];
  console.log(`   ${pid} (filed as ${key}): chip ${t.chip} · section ${t.section} · ` +
    `${t.cycle || "?"} cycle receipts $${t.raised.toLocaleString("en-US")} ` +
    `(section lead: largest reported source ${t.lead} of ${t.section})`);
}

console.log("");
if (failures.length) {
  console.error(`✗ finance id alias: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`✓ finance id alias: ${passed} checks passed — one filing, whatever id the person file is open under\n`);
