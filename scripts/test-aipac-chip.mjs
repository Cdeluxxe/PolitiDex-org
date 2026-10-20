#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-aipac-chip.mjs — the AIPAC chip on the person-file letterhead
// ─────────────────────────────────────────────────────────────────────────────
//   1. A person with AIPAC receipts reads AIPAC-backed, and the accessible name
//      names the source.
//   2. A person with no AIPAC data reads "No AIPAC file on hand".
//   3. The chip never prints a dollar amount or a percentage, in any state.
//   4. The scorecard side only counts roll calls already in the archive.
//   5. No other letterhead chip changes: the two money mounts are untouched and
//      still adjacent, and the AIPAC mount sits after them, before the party.
//   6. The shipped scorecard table is empty and every shipped filing reads
//      "No AIPAC file on hand" — no relationship is invented.
//
//   node scripts/test-aipac-chip.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const SRC = R("pdx-aipac.js");
const PFF = R("profiles-full.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);
const visible = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const aria = (h) => ((/aria-label="([^"]*)"/.exec(String(h)) || [])[1] || "").replace(/&#39;/g, "'");

function boot({ filings = {}, records = {} } = {}) {
  const win = {
    setTimeout: () => 0,
    addEventListener: () => {},
    PDXFinance: { filing: (pid) => filings[pid] || null },
    PDXVotingRecord: { memberRecords: (pid) => records[pid] || null },
  };
  win.window = win;
  vm.runInNewContext(SRC, win, { filename: "pdx-aipac.js" });
  return win;
}

const BACKED = {
  topDonors: [
    { name: "Real Estate Industry", amount: 900000, type: "industry" },
    { name: "AIPAC PAC", amount: 412000, type: "pac" },
  ],
  funding: { cycle: "2024", receipts: 5000000 },
  source: "https://www.opensecrets.org/members-of-congress/example/summary?cid=N0",
};
const OLD = { ...BACKED, funding: { cycle: "2020" }, source: "https://www.fec.gov/data/" };
const NONE = { topDonors: [{ name: "Club for Growth", amount: 1200000, type: "pac" }], funding: { cycle: "2024" }, source: "https://www.opensecrets.org/" };

section("1 · AIPAC receipts → AIPAC-backed, source named");
{
  const w = boot({ filings: { a: BACKED } });
  const html = w.PDXAipac.chipHtml("a");
  ok(/data-pdx-aipac-state="backed"/.test(html), "a person with AIPAC receipts is not AIPAC-backed");
  ok(visible(html).includes("AIPAC-backed"), "the visible chip does not say AIPAC-backed");
  ok(/AIPAC-backed/.test(aria(html)) && /OpenSecrets/.test(aria(html)), `the accessible name does not name the relationship and OpenSecrets: ${aria(html)}`);
  ok(/class="pdx-mchip"/.test(html) && /pdx-mchip-ico/.test(html), "the chip is not in the money-token style");
  const fec = boot({ filings: { o: OLD } }).PDXAipac.chipHtml("o");
  ok(/data-pdx-aipac-state="mixed"/.test(fec), "AIPAC money outside the current cycle is not Mixed");
  ok(/FEC/.test(aria(fec)), "an FEC-sourced read does not name FEC");
  for (const n of ["United Democracy Project", "American Israel Public Affairs Cmte"]) {
    ok(boot().PDXAipac.isAffiliated(n), `${n} is not treated as AIPAC-affiliated`);
  }
  ok(!boot().PDXAipac.isAffiliated("Club for Growth"), "an unrelated PAC is treated as AIPAC-affiliated");
}

section("2 · no AIPAC data → No AIPAC file on hand");
{
  const w = boot({ filings: { n: NONE } });
  for (const pid of ["n", "nobody_at_all"]) {
    const html = w.PDXAipac.chipHtml(pid);
    ok(/data-pdx-aipac-state="empty"/.test(html), `${pid}: not empty`);
    ok(visible(html) === "💰 No AIPAC file on hand", `${pid}: visible text is "${visible(html)}"`);
    ok(/No AIPAC file on hand/.test(aria(html)), `${pid}: accessible name lacks the empty-state words`);
  }
}

section("3 · never a dollar amount or a percentage");
{
  const recs = { s: [1, 2, 3, 4, 5].map((i) => ({ rollcallId: "rc" + i, position: "yea" })) };
  const w = boot({ filings: { a: BACKED, o: OLD, n: NONE }, records: recs });
  w.PDXAipac.SCORECARD.push(...[1, 2, 3, 4, 5].map((i) => ({ rollcallId: "rc" + i, position: "yea", source: "https://www.aipac.org/" })));
  for (const pid of ["a", "o", "n", "s", "nobody"]) {
    const html = w.PDXAipac.chipMount(pid);
    const text = visible(html) + " " + aria(html);
    ok(!/\$|%|\bpercent\b|\d/i.test(text), `${pid}: the chip prints a figure: ${text}`);
  }
}

section("4 · the scorecard counts only formal acts already in the archive");
{
  const card = [1, 2, 3, 4, 5].map((i) => ({ rollcallId: "rc" + i, position: "yea", source: "https://www.aipac.org/" }));
  const mk = (positions) => positions.map((p, i) => ({ rollcallId: "rc" + (i + 1), position: p }));
  const w = boot({ records: {
    hi: mk(["yea", "yea", "yea", "yea", "nay"]),
    lo: mk(["yea", "nay", "nay", "yea", "nay"]),
    thin: mk(["yea", "yea"]),
    other: [{ rollcallId: "elsewhere", position: "yea" }],
  } });
  ok(w.PDXAipac.read("hi").state === "empty", "an empty shipped scorecard produced a read");
  w.PDXAipac.SCORECARD.push(...card);
  ok(w.PDXAipac.scorecardDefects(card).length === 0, "valid scorecard rows were flagged");
  ok(w.PDXAipac.scorecardDefects([{ rollcallId: "", position: "maybe" }]).length >= 2, "invalid scorecard rows passed");
  const hi = w.PDXAipac.chipHtml("hi");
  ok(w.PDXAipac.read("hi").state === "backed" && /AIPAC scorecard/.test(aria(hi)), "a matching record is not AIPAC-backed with the scorecard named");
  ok(/pdxsec-voting/.test(hi), "a scorecard-only chip does not open the voting record");
  ok(w.PDXAipac.read("lo").state === "mixed", "a mixed record is not Mixed");
  ok(w.PDXAipac.read("thin").state === "empty", "two votes made a voting record");
  ok(w.PDXAipac.read("other").state === "empty", "a vote outside the scorecard was counted");
}

section("5 · the letterhead: other chips untouched, AIPAC after the money, before the party");
{
  const M1 = "PDXFinanceLane.letterheadChipMount(id)";
  const M2 = "PDXFinanceLane.wealthLetterheadChipMount(id, p)";
  const MA = "PDXAipac.chipMount(id)";
  const a1 = PFF.indexOf(M1), a2 = PFF.indexOf(M2), aa = PFF.indexOf(MA);
  const party = PFF.indexOf('<span class="profile-party">', aa);
  ok(a1 > 0 && a2 > a1 && aa > a2 && party > aa, "the AIPAC chip is not between the money pills and the party");
  ok(!/Mount\(/.test(PFF.slice(a1 + M1.length, a2)), "something was slipped between the two money pills");
  ok(/typeof window\.PDXAipac\.chipMount === 'function'\) \? window\.PDXAipac\.chipMount\(id\) : ''/.test(PFF), "the mount is not guarded");
  const html = boot().PDXAipac.chipMount("x");
  ok(!/data-pdx-mchip-lane=|data-pdx-mchip=/.test(html), "the AIPAC chip claims to be a money lane");
  ok(!/_FTM_BY_ID|FTM_AS_OF|FTM_FUNDING|FTM_DATA/.test(SRC.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")), "pdx-aipac.js reaches into the filings index");
  ok(/'\/pdx-aipac\.js'/.test(R("sw.js")), "pdx-aipac.js is not precached");
  for (const doc of ["person.html", "index.html"]) {
    const s = R(doc);
    ok(s.indexOf('src="/pdx-aipac.js"') > s.indexOf('src="/finance-lane.js"') && s.indexOf('src="/finance-lane.js"') > 0, `${doc} does not load pdx-aipac.js after finance-lane.js`);
  }
}

section("6 · shipped data invents no relationship");
{
  const w = boot();
  ok(w.PDXAipac.SCORECARD.length === 0, "the shipped scorecard is not empty");
  // Every shipped donor name, run through the affiliation filter.
  const names = [...R("ftm-data.js").matchAll(/\{\s*name:'([^']+)',\s*amount:/g)].map((m) => m[1]);
  ok(names.length > 20, "the shipped donor rows were not found");
  const hits = names.filter((n) => w.PDXAipac.isAffiliated(n));
  ok(hits.length === 0, `shipped donor rows read as AIPAC-affiliated: ${hits.join(", ")}`);
}

console.log(`\n   ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`   ✗ ${f}`);
  process.exit(1);
}
