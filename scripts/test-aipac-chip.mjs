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
//   6. The shipped data invents no relationship: every scorecard row passes the
//      gate and names a roll call the archive's vote seeds carry (same chamber,
//      congress, session, roll number and bill), and no shipped donor row reads
//      as AIPAC-affiliated.
//   7. Three or more scored votes read from the scorecard and name Track AIPAC; fewer
//      stay on the empty state.
//   8. All four states, and none of them ever says "AIPAC scorecard".
//   9. The cutoffs, at their exact boundaries: >= 45% aligned is AIPAC-backed,
//      <= 12% is Not AIPAC-aligned, between is Mixed.
//  10. The shipped IMEU rows, read against the archive's own Senate votes:
//      three or more scored votes name IMEU, fewer stay empty.
//
//   node scripts/test-aipac-chip.mjs

import { readFileSync, readdirSync } from "node:fs";
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
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
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

// An archive vote item, the shape voting-record.mts emits, and the scorecard
// row that names the same roll call.
const vote = (roll, position, extra = {}) => ({
  kind: "vote", chamber: "house", congress: 119, session: 1, rollNumber: roll,
  number: "H.R. " + (100 + roll), position, ...extra,
});
// Synthetic rows go under the Track AIPAC reading (which ships with none), on
// House roll calls the shipped IMEU Senate rows never touch. credits "nay"
// makes "yea" the AIPAC-aligned vote, so a fixture's yeas are its aligned votes.
const row = (roll, credits = "nay") => ({
  reading: "trackaipac", chamber: "house", congress: 119, session: 1, rollNumber: roll,
  measure: "H.R. " + (100 + roll), credits, source: "https://www.trackaipac.com/",
});
const CARD = Array.from({ length: 25 }, (_, i) => row(i + 1));

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
  const recs = {
    s: [1, 2, 3, 4, 5].map((i) => vote(i, "yea")),
    m: [1, 2, 3, 4, 5].map((i) => vote(i, i % 2 ? "yea" : "nay")),
  };
  const w = boot({ filings: { a: BACKED, o: OLD, n: NONE }, records: recs });
  w.PDXAipac.SCORECARD.push(...CARD);
  for (const pid of ["a", "o", "n", "s", "m", "nobody"]) {
    const html = w.PDXAipac.chipMount(pid);
    const text = visible(html) + " " + aria(html);
    ok(!/\$|%|\bpercent\b|\d/i.test(text), `${pid}: the chip prints a figure: ${text}`);
  }
}

section("4 · the scorecard counts only formal acts already in the archive");
{
  const mk = (positions) => positions.map((p, i) => vote(i + 1, p));
  const w = boot({ records: {
    hi: mk(["yea", "yea", "yea", "yea", "nay"]),
    lo: mk(["yea", "nay", "nay", "yea", "nay"]),
    none: mk(["nay", "nay", "nay", "nay", "nay"]),
    thin: mk(["yea", "yea"]),
    other: [vote(40, "yea"), vote(41, "yea"), vote(42, "yea")],
    // Same roll numbers, wrong bill / wrong congress / not a vote: not the act.
    wrongbill: [1, 2, 3].map((i) => vote(i, "yea", { number: "H.R. 9999" })),
    oldcong: [1, 2, 3].map((i) => vote(i, "yea", { congress: 118 })),
    cosponsor: [1, 2, 3].map((i) => vote(i, "yea", { kind: "position" })),
    // A motion to table: nay is the vote that backs the act.
    inverted: [1, 2, 3].map((i) => vote(i, "nay", { advanceInverted: true })),
  } });
  ok(w.PDXAipac.read("hi").state === "empty", "a House record was read off the Senate-only shipped rows");
  w.PDXAipac.SCORECARD.push(...CARD);
  ok(w.PDXAipac.scorecardDefects(CARD).length === 0, `valid scorecard rows were flagged: ${w.PDXAipac.scorecardDefects(CARD)}`);
  ok(w.PDXAipac.scorecardDefects([{ reading: "aipac", chamber: "joint", congress: 118, credits: "support" }]).length >= 6, "invalid scorecard rows passed");
  ok(w.PDXAipac.scorecardDefects([row(1), row(1)]).some((d) => /duplicate/.test(d)), "a duplicate roll call passed");
  for (const pid of ["wrongbill", "oldcong", "cosponsor"]) ok(w.PDXAipac.read(pid).state === "empty", `${pid}: counted as a scored formal act`);
  // The publisher names the vote itself, so the archive's inversion flag is
  // not applied on top of it: three nays against an aligned yea are not aligned.
  ok(w.PDXAipac.read("inverted").state === "notaligned", "a credited vote was flipped a second time");
  w.PDXAipac.SCORECARD.push(row(26, "yea"));
  ok(w.PDXAipac.read("hi").state === "backed", "an oppose row changed an unrelated read");
  const hi = w.PDXAipac.chipHtml("hi");
  ok(w.PDXAipac.read("hi").state === "backed" && /Track AIPAC reading/.test(aria(hi)), "a matching record is not AIPAC-backed with Track AIPAC named");
  ok(/pdxsec-voting/.test(hi), "a scorecard-only chip does not open the voting record");
  ok(w.PDXAipac.read("lo").state === "mixed", "a mixed record is not Mixed");
  const none = w.PDXAipac.chipHtml("none");
  ok(w.PDXAipac.read("none").state === "notaligned", "a record entirely against the aligned side is not Not AIPAC-aligned");
  ok(visible(none).includes("Not AIPAC-aligned") && visible(none).includes("Track AIPAC reading"), `not-aligned visible text: ${visible(none)}`);
  ok(/Not AIPAC-aligned/.test(aria(none)) && /Track AIPAC/.test(aria(none)) && /not AIPAC/.test(aria(none)), `not-aligned accessible name: ${aria(none)}`);
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
  const SHIPPED = w.PDXAipac.SCORECARD;
  ok(w.PDXAipac.scorecardDefects(SHIPPED).length === 0, `shipped scorecard rows fail the gate: ${w.PDXAipac.scorecardDefects(SHIPPED)}`);
  // Every shipped row is an existing formal act: a roll call one of the
  // archive's JSON vote seeds carries — same chamber, congress, session, roll
  // number AND bill. Deliberately the conservative half of the archive: a roll
  // call seeded only in SQL fails here until it is checked by hand, which is the
  // direction to fail in.
  const norm = (m) => String(m || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ARCHIVE = new Set();
  for (const f of readdirSync(join(ROOT, "db")).filter((f) => /vote-seed.*\.json$/.test(f))) {
    for (const v of JSON.parse(R("db/" + f)).votes || []) {
      ARCHIVE.add([v.chamber, v.congress, v.session, v.rollNumber, norm(v.measure && v.measure.number)].join("|"));
    }
  }
  ok(ARCHIVE.size > 100, "the archive's vote seeds were not read");
  // What IMEU's 119th-Congress Senate scorecard itself states
  // (imeupolicyproject.org/senate2025): "Senators receiving a positive score
  // voted for at least one of these resolutions", for the April 2025 pair and
  // the July 2025 pair. Transcribed here so a row cannot drift from it.
  const IMEU_STATES = new Map([
    ["senate|119|1|165|sjres33", "yea"], ["senate|119|1|166|sjres26", "yea"],
    ["senate|119|1|454|sjres41", "yea"], ["senate|119|1|455|sjres34", "yea"],
  ]);
  const imeuRows = SHIPPED.filter((r) => r.reading === "imeu");
  ok(imeuRows.length === IMEU_STATES.size, `IMEU rows: ${imeuRows.length}`);
  ok(SHIPPED.every((r) => r.reading === "imeu"), "the shipped table holds a row from a publisher other than IMEU");
  for (const r of imeuRows) {
    const k = [r.chamber, r.congress, r.session, r.rollNumber, norm(r.measure)].join("|");
    ok(IMEU_STATES.get(k) === r.credits, `${k}: not a roll call and side IMEU states`);
    ok(r.source === "https://www.imeupolicyproject.org/senate2025", `${k}: source is not IMEU's Senate scorecard`);
  }
  ok(w.PDXAipac.READINGS.trackaipac && !SHIPPED.some((r) => r.reading === "trackaipac"), "the Track AIPAC path is gone, or ships invented rows");
  for (const r of SHIPPED) {
    const k = [r.chamber, r.congress, r.session, r.rollNumber, norm(r.measure)].join("|");
    ok(ARCHIVE.has(k), `scorecard row ${k} is not a formal act in the archive`);
  }
  // Every shipped donor name, run through the affiliation filter.
  const names = [...R("ftm-data.js").matchAll(/\{\s*name:'([^']+)',\s*amount:/g)].map((m) => m[1]);
  ok(names.length > 20, "the shipped donor rows were not found");
  const hits = names.filter((n) => w.PDXAipac.isAffiliated(n));
  ok(hits.length === 0, `shipped donor rows read as AIPAC-affiliated: ${hits.join(", ")}`);
}

section("7 · three scored votes read from the scorecard, fewer stay empty");
{
  const w = boot({ records: {
    three: [1, 2, 3].map((i) => vote(i, "yea")),
    two: [1, 2].map((i) => vote(i, "yea")),
  } });
  w.PDXAipac.SCORECARD.push(...CARD);
  const three = w.PDXAipac.chipHtml("three");
  ok(!/data-pdx-aipac-state="empty"/.test(three), "three scored votes still read empty");
  ok(/Track AIPAC reading/.test(aria(three)) && /Track AIPAC reading/.test(visible(three)), "a reading does not name its publisher");
  const two = w.PDXAipac.chipHtml("two");
  ok(/data-pdx-aipac-state="empty"/.test(two), "two scored votes produced a read");
  // The empty-state wording, pinned word for word.
  eq(visible(two), "💰 No AIPAC file on hand", "empty-state visible text");
  eq(aria(two), "AIPAC relationship: No AIPAC file on hand. No AIPAC or AIPAC-affiliated PAC receipts in the OpenSecrets or FEC data on file, and fewer than three IMEU or Track AIPAC scored votes mapped to this archive. This is not a finding that there is no relationship.", "empty-state accessible name");
}

section("9 · the cutoffs: >= 45 backed, 12 < x < 45 mixed, <= 12 not aligned");
{
  // Exact boundaries over 20 and 25 scored votes.
  const mk = (n, yeas) => Array.from({ length: n }, (_, i) => vote(i + 1, i < yeas ? "yea" : "nay"));
  const w = boot({ records: {
    at45: mk(20, 9), under45: mk(20, 8), at12: mk(25, 3), over12: mk(25, 4), zero: mk(3, 0), three: mk(3, 3),
  } });
  w.PDXAipac.SCORECARD.push(...CARD);
  const st = (pid) => w.PDXAipac.read(pid).state;
  ok(st("at45") === "backed", `45% aligned is ${st("at45")}`);
  ok(st("under45") === "mixed", `40% aligned is ${st("under45")}`);
  ok(st("over12") === "mixed", `16% aligned is ${st("over12")}`);
  ok(st("at12") === "notaligned", `12% aligned is ${st("at12")}`);
  ok(st("zero") === "notaligned" && st("three") === "backed", "the ends of the range");
  eq(JSON.stringify(w.PDXAipac.CUTOFFS), JSON.stringify({ backed: 0.45, notAligned: 0.12, minScored: 3 }), "published cutoffs");
}

section("10 · the shipped IMEU rows, read against the archive's own senators");
{
  // Each senator's record on the four roll calls, exactly as the archive's
  // Israel vote seed attributes it.
  const seed = JSON.parse(R("db/vr-israel-vote-seed.json"));
  const records = {};
  for (const v of seed.votes) {
    if (v.congress !== 119 || v.chamber !== "senate") continue;
    for (const m of v.memberVotes || []) {
      (records[m.politicianId] ||= []).push({ kind: "vote", chamber: "senate", congress: 119, session: v.session,
        rollNumber: v.rollNumber, number: v.measure.number, position: m.position });
    }
  }
  const w = boot({ records });
  const st = (pid) => w.PDXAipac.read(pid).state;
  ok(Object.keys(records).length >= 30, "the archive's senators were not read");
  // barrasso: nay on all four → aligned 4/4. sanders: yea on all four → 0/4.
  // shaheen: nay, nay, yea, yea → 2/4. gallego: two yea/nay votes on file.
  ok(st("barrasso") === "backed", `barrasso is ${st("barrasso")}`);
  ok(st("sanders") === "notaligned", `sanders is ${st("sanders")}`);
  ok(st("shaheen") === "backed", `shaheen (half aligned) is ${st("shaheen")}`);
  ok(st("gallego") === "empty", `gallego (two scored) is ${st("gallego")}`);
  for (const pid of ["barrasso", "sanders", "shaheen"]) {
    const html = w.PDXAipac.chipHtml(pid);
    ok(visible(html).includes("IMEU reading"), `${pid}: visible text does not name IMEU: ${visible(html)}`);
    ok(/IMEU/.test(aria(html)) && /not AIPAC/.test(aria(html)), `${pid}: accessible name: ${aria(html)}`);
    ok(/pdxsec-voting/.test(html), `${pid}: a vote-only chip does not open the voting record`);
    ok(!/AIPAC scorecard/i.test(html) && !/\$|%|\d/.test(visible(html) + " " + aria(html)), `${pid}: figure or "AIPAC scorecard" on the chip`);
  }
  eq(visible(w.PDXAipac.chipHtml("gallego")), "💰 No AIPAC file on hand", "gallego empty text");
}

section("8 · the chip never says \"AIPAC scorecard\"");
{
  const card = CARD;
  const recs = {};
  for (const [pid, ps] of Object.entries({ b: "yyyyy", m: "yynnn", n: "nnnnn", t: "yy" })) {
    recs[pid] = [...ps].map((c, i) => vote(i + 1, c === "y" ? "yea" : "nay"));
  }
  const w = boot({ filings: { a: BACKED, o: OLD }, records: { ...recs, o: recs.n } });
  w.PDXAipac.SCORECARD.push(...card);
  const states = new Set();
  for (const pid of ["a", "o", "b", "m", "n", "t", "nobody"]) {
    const html = w.PDXAipac.chipMount(pid);
    states.add(w.PDXAipac.read(pid).state);
    ok(!/AIPAC scorecard/i.test(html), `${pid}: the chip says "AIPAC scorecard"`);
    ok(!/\$|%|\d/.test(visible(html) + " " + aria(html)), `${pid}: the chip prints a figure`);
  }
  ok(states.size === 4, `all four states were not exercised: ${[...states]}`);
  ok(w.PDXAipac.read("o").state === "mixed", "old AIPAC money beside a not-aligned record is not Mixed");
  ok(!/AIPAC scorecard/i.test(SRC.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")), "pdx-aipac.js code says \"AIPAC scorecard\"");
}

console.log(`\n   ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`   ✗ ${f}`);
  process.exit(1);
}
