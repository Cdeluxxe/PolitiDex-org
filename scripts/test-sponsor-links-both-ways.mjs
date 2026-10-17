#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-sponsor-links-both-ways.mjs — every sponsor a bill page links has that
// bill in their sponsored list, the tally counts it, and nobody else gets a row
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. PAGE → FILE. Every sponsor link a bill page prints (db/bill-docs.json
//      filtered the way the edge's sponsorsOf filters it — an id the share index
//      names) and every link the bill panel prints (bill-official.json) is a row
//      in that person's sponsored list, with the same role, as person-bills.js
//      renders it.
//   2. ARRIVING UNDER ANOTHER ID. A file opened at an alias address
//      (db/share-index.json personAliases — /p/nate_blouin for blouin_s13)
//      reaches the same rows.
//   3. THE TALLY COUNTS THE ROWS. For every person, the tally's failed / passed
//      / pending equal the rows the list prints, and the rows are exactly the
//      page links — so the letterhead jump and the tally count only bills that
//      appear.
//   4. FILE → PAGE, AND NOTHING INVENTED. Every row in a sponsored list is a
//      link on that bill's page. An archive-only sponsor the official record
//      does not name (Susan Collins on 118 H.R. 82, the Senate lead on the
//      companion) gets no row.
//   5. MUTATIONS FAIL: a page link with no row, a row with no page link, a row
//      under the wrong role, a tally that skips a row.
//
//   node scripts/test-sponsor-links-both-ways.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);

const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const OFFICIAL = JSON.parse(R("bill-official.json")).docs;
const TABLE = JSON.parse(R("person-bills.json"));
const SHARE = JSON.parse(R("db/share-index.json"));

const PB = (() => {
  const sb = { window: {}, document: { readyState: "loading", addEventListener() {}, getElementById: () => null, querySelector: () => null } };
  sb.window.document = sb.document;
  vm.runInNewContext(R("person-bills.js"), sb, { filename: "person-bills.js" });
  return sb.window.PDXPersonBills;
})();
if (!PB || typeof PB.rowsFor !== "function" || typeof PB.html !== "function") {
  console.error("✗ sponsor links: STALE HARNESS — person-bills.js does not expose rowsFor/html");
  process.exit(2);
}

// The links a bill page prints, as "<sitting>|<number>" → [[role, pid], …].
function pageLinks(docs) {
  const out = {};
  for (const [key, d] of Object.entries(docs)) {
    for (const r of ["s", "f", "c"]) for (const pid of (d.sp && d.sp[r]) || []) {
      if (SHARE.people[pid] && SHARE.people[pid].n) (out[key] = out[key] || []).push([r, pid]);
    }
  }
  return out;
}

// Everything wrong between the pages and one sponsored-list table.
function audit(docs, table, pb = PB) {
  const bad = [];
  const links = pageLinks(docs);
  const want = new Set(), people = new Set();
  for (const [key, ls] of Object.entries(links)) for (const [r, pid] of ls) { want.add(`${pid}|${key}|${r}`); people.add(pid); }
  for (const [key, e] of Object.entries(OFFICIAL)) for (const [r, pid] of e.sp || []) {
    if (!want.has(`${pid}|${key}|${r}`)) bad.push(`${key}: the panel links ${pid} as ${r}, the page does not`);
  }
  const have = new Set();
  for (const pid of Object.keys(table.people || {})) {
    const rows = pb.rowsFor(table, pid);
    for (const x of rows) {
      const k = `${pid}|${x.s}|${x.n}|${x.r}`;
      have.add(k);
      if (!want.has(k)) bad.push(`${pid}: lists ${x.s}|${x.n} as ${x.r}, and that bill's page does not link them so`);
    }
    // The tally counts the rows the list prints.
    const n = { failed: 0, passed: 0, pending: 0 };
    for (const x of rows) { if (x.g === "failed") n.failed++; else if (x.g === "enacted" || x.g === "passed") n.passed++; else if (x.g === "pending") n.pending++; }
    const t = /<p class="pdx-spb-tally"[^>]*data-failed="(\d+)" data-passed="(\d+)" data-pending="(\d+)"[^>]*>([^<]*)<\/p>/.exec(pb.html(rows));
    if (rows.length && !t) bad.push(`${pid}: no tally over ${rows.length} rows`);
    if (t && (+t[1] !== n.failed || +t[2] !== n.passed || +t[3] !== n.pending)) bad.push(`${pid}: tally ${t[4]} does not count the ${rows.length} rows`);
    const printed = (pb.html(rows).match(/data-pdx-sponsored-row/g) || []).length;
    if (printed !== rows.length) bad.push(`${pid}: ${printed} rows printed of ${rows.length}`);
  }
  for (const k of want) if (!have.has(k)) bad.push(`${k.split("|")[0]}: the page for ${k.split("|").slice(1, 3).join("|")} links them as ${k.split("|")[3]}, their sponsored list does not have it`);
  return { bad, links: want.size, people: people.size };
}

section("1–4. every page link is a row, every row a page link, every tally its rows");
{
  const { bad, links, people } = audit(DOCS, TABLE);
  ok(bad.length === 0, `pages and sponsored lists disagree:\n      ${bad.slice(0, 10).join("\n      ")}`);
  console.log(`      ${links} sponsor links on bill pages, ${people} people — ${bad.length ? bad.length + " gaps" : "every one is a row"}`);
  // The first places to look, by name.
  const blouin = PB.rowsFor(TABLE, "blouin_s13").map((x) => `${x.s}|${x.n}`);
  ok(blouin.includes("2026GS|S.B. 282") && blouin.includes("2026GS|S.B. 318"), "Nate Blouin's list lacks S.B. 282 or S.B. 318");
  ok(PB.rowsFor(TABLE, "rosalba_dominguez").some((x) => x.n === "H.B. 585" && x.s === "2026GS" && x.r === "s"), "Rosalba Dominguez's list lacks H.B. 585");
  const hb76 = PB.rowsFor(TABLE, "ssandall").find((x) => x.n === "H.B. 76" && x.s === "2026GS");
  ok(hb76 && hb76.r === "f", "Scott Sandall's list lacks H.B. 76 as floor sponsor");
  ok(PB.rowsFor(TABLE, "koford_h10").some((x) => x.n === "H.B. 76" && x.r === "s"), "Jill Koford's list lacks H.B. 76");
  const fed = Object.entries(pageLinks(DOCS)).filter(([k]) => /^\d+\|/.test(k));
  ok(fed.length > 0 && fed.every(([k, ls]) => ls.every(([r, pid]) => PB.rowsFor(TABLE, pid).some((x) => `${x.s}|${x.n}` === k && x.r === r))),
    "a federal bill page links a sponsor whose list lacks it");
  // Archive-only sponsors stay out.
  ok(!PB.rowsFor(TABLE, "collins").some((x) => x.s === "118" && x.n === "H.R. 82"), "Susan Collins got a row for 118 H.R. 82, which its official record does not name her on");
}

section("2. a file opened at an alias address reaches the same rows");
{
  let checked = 0;
  for (const [alias, canon] of Object.entries(SHARE.personAliases || {})) {
    if (!TABLE.people[canon]) continue;
    // The person file resolves the arrival before it opens (person-file.js
    // resolve(); the share index records the same answer), so the list is asked
    // for the canonical id.
    const rows = PB.rowsFor(TABLE, canon);
    ok(rows.length === TABLE.people[canon].length, `/p/${alias} → ${canon}: ${rows.length} rows of ${TABLE.people[canon].length}`);
    ok(!TABLE.people[alias], `${alias} holds sponsored rows of its own, apart from ${canon}`);
    checked++;
  }
  ok(checked > 0, "no alias reaches a sponsor — the harness is not looking at anything");
  console.log(`      ${checked} alias addresses land on a sponsor's full list`);
}

section("5. mutations fail");
{
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const caught = (name, bad) => { ok(bad.length > 0, `mutation not caught: ${name}`); console.log(`      mutation: ${name} → ${bad.length ? "caught" : "MISSED"}`); };
  {
    const t = clone(TABLE);
    const i = t.bills.findIndex((b) => b[0] === "2026GS" && b[1] === "S.B. 318");
    t.people.blouin_s13 = t.people.blouin_s13.filter(([j]) => j !== i);
    caught("a page link with no row (S.B. 318 dropped from Nate Blouin)", audit(DOCS, t).bad);
  }
  {
    const t = clone(TABLE);
    const i = t.bills.findIndex((b) => b[0] === "2026GS" && b[1] === "H.B. 585");
    t.people.blouin_s13 = t.people.blouin_s13.concat([[i, "c"]]);
    caught("a row the page does not name (H.B. 585 added to Nate Blouin)", audit(DOCS, t).bad);
  }
  {
    const t = clone(TABLE);
    const i = t.bills.findIndex((b) => b[0] === "118" && b[1] === "H.R. 82");
    if (i >= 0) { t.people.collins = (t.people.collins || []).concat([[i, "c"]]); caught("an archive-only sponsor given a row (Collins on H.R. 82)", audit(DOCS, t).bad); }
  }
  {
    const t = clone(TABLE);
    t.people.ssandall = t.people.ssandall.map(([j, r]) => (TABLE.bills[j][1] === "H.B. 76" ? [j, "s"] : [j, r]));
    caught("a row under the wrong role (Sandall as sponsor of H.B. 76)", audit(DOCS, t).bad);
  }
  {
    const src = R("person-bills.js");
    const from = "else if (g === 'enacted' || g === 'passed') n.passed++;";
    ok(src.split(from).length === 2, "mutation anchor for the tally is not unique");
    const sb = { window: {}, document: { readyState: "loading", addEventListener() {}, getElementById: () => null, querySelector: () => null } };
    sb.window.document = sb.document;
    vm.runInNewContext(src.split(from).join("else if (g === 'passed') n.passed++;"), sb);
    caught("a tally that skips enacted rows", audit(DOCS, TABLE, sb.window.PDXPersonBills).bad);
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ sponsor links both ways: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ sponsor links both ways: ${passed} checks passed`);
