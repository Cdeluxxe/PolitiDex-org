#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-congress-changes.mjs — Phase 8: the committee, co-sponsorship and
// bill-status lanes of /changes
// ─────────────────────────────────────────────────────────────────────────────
//   1. Snapshot diffs (scripts/gen-congress-changes.mjs): a committee change,
//      a co-sponsorship change and a bill-status change are each logged, from
//      the committed files' own shapes, dated by their pull.
//   2. Each one reaches /changes and /api/changes as its own labelled lane.
//   3. The roster-seat lane is unaffected.
//   4. Registry, feed function, committed files.
//
//   node scripts/test-congress-changes.mjs   (no database, no network)
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const dir = mkdtempSync(join(tmpdir(), "cc8-"));
await esbuild.build({ entryPoints: [join(ROOT, "netlify/lib/coverage-pages.ts")], bundle: true, platform: "node", format: "esm", outfile: join(dir, "pages.mjs"), logLevel: "silent" });
const C = await import(pathToFileURL(join(dir, "pages.mjs")).href);
const G = await import(pathToFileURL(join(ROOT, "scripts/gen-congress-changes.mjs")).href);
const RC = await import(pathToFileURL(join(ROOT, "scripts/gen-roster-changes.mjs")).href);

// ── two pulls of the three committed files, in their real shapes ────────────
const committeesFile = (people, fetchedOn) => ({
  sources: { fetchedOn },
  committees: { AG00: ["Committee on Agriculture", "house"], AG15: ["Livestock", "house", "AG00"], SSFI00: ["Committee on Finance", "senate"] },
  people,
});
const BILLS = [
  ["H.R. 100", "A Farm Act", "2026-01-02", "Agriculture", "https://www.congress.gov/bill/119th-congress/house-bill/100", 1],
  ["H.R. 200", "A Road Act", "2026-02-03", "Transportation", "https://www.congress.gov/bill/119th-congress/house-bill/200", 0],
  ["S. 5", "A Tax Act", "2026-03-04", "Taxation", "https://www.congress.gov/bill/119th-congress/senate-bill/5", 0],
];
const cosFile = (people, fetchedOn, congress = 119) => ({ congress, fetchedOn, source: "x", bills: BILLS, people, names: { alpha: "Alpha Person", beta: "Beta Person" } });
const docsFile = (st, sl) => ({ docs: {
  "119|H.R. 100": { s: "119", n: "H.R. 100", t: "A Farm Act", st, sl, rs: "https://www.congress.gov/bill/119th-congress/house-bill/100" },
  "119|H.R. 300": { s: "119", n: "H.R. 300", t: "Steady Act", st: "pending", sl: "Introduced" },
  "2025GS|HB 1": { s: "2025GS", n: "HB 1", t: "Utah bill", st: st === "pending" ? "failed" : "enacted", sl: "x" },
} });
const shareIndex = { people: { alpha: { n: "Alpha Person" }, beta: { n: "Beta Person" } } };

const writeRoot = (name, f) => {
  const r = join(dir, name);
  mkdirSync(join(r, "db"), { recursive: true });
  for (const [p, v] of Object.entries(f)) writeFileSync(join(r, "db", p), JSON.stringify(v));
  return r;
};
const before = writeRoot("before", {
  "person-committees.json": committeesFile({ alpha: [["AG00", "Chairman"]], beta: [["SSFI00"]] }, "2026-11-19"),
  "cosponsorships.json": cosFile({ alpha: [0], beta: [1] }, "2026-11-19"),
  "bill-docs.json": docsFile("pending", "Introduced"),
  "bill-record.json": { fetchedOn: "2026-11-19", records: {} },
  "share-index.json": shareIndex,
});
const after = writeRoot("after", {
  // alpha: still on AG00 but now Ranking Member, and joined the Livestock subcommittee; beta left Finance.
  "person-committees.json": committeesFile({ alpha: [["AG00", "Ranking Member"], ["AG15"]] }, "2026-11-20"),
  // alpha picked up S. 5; beta dropped H.R. 200.
  "cosponsorships.json": cosFile({ alpha: [0, 2], beta: [] }, "2026-11-21"),
  "bill-docs.json": docsFile("passed_house", "Passed the House"),
  "bill-record.json": { fetchedOn: "2026-11-22", records: {} },
  "share-index.json": shareIndex,
});
const A = G.currentInputs(before), B = G.currentInputs(after);

section("1 · snapshot diffs");
eq(G.changesBetween(null, B, "2026-12-01"), { committees: [], cosponsorships: [], status: [] }, "no earlier snapshot: the lanes are baselined, nothing logged");
eq(G.changesBetween(A.snap, A, "2026-12-01"), { committees: [], cosponsorships: [], status: [] }, "identical pulls log nothing");
const ch = G.changesBetween(A.snap, B, "2026-12-01");
eq(ch.committees.map((c) => [c.pid, c.code, c.change, c.before ?? null, c.after ?? null]),
  [["alpha", "AG00", "title", "Chairman", "Ranking Member"], ["alpha", "AG15", "joined", null, null], ["beta", "SSFI00", "left", null, null]],
  "committee diff: a title change, a subcommittee joined, a committee left");
eq(ch.committees.map((c) => c.date), ["2026-11-20", "2026-11-20", "2026-11-20"], "committee changes are dated by their pull");
eq([ch.committees[1].committee, ch.committees[1].parent], ["Livestock", "Committee on Agriculture"], "a subcommittee names its parent");
eq(ch.cosponsorships.map((c) => [c.pid, c.change, c.count, c.bills.map((b) => b[0])]),
  [["alpha", "added", 1, ["S. 5"]], ["beta", "removed", 1, ["H.R. 200"]]], "co-sponsorship diff: one added, one removed, per member");
eq(ch.cosponsorships[0].date, "2026-11-21", "co-sponsorship changes are dated by their pull");
eq(ch.status.map((s) => [s.key, s.change, s.before?.st, s.after.st]), [["119|H.R. 100", "updated", "pending", "passed_house"]], "status diff: only the federal bill whose status moved (Utah rows are not in the Congress.gov pull)");
eq(ch.status[0].date, "2026-11-22", "status changes are dated by the bill-record pull");
eq(G.changesBetween(A.snap, B, "2026-12-01", "2026-12-05").status[0].date, "2026-12-05", "--date overrides the pull date");
const nextCongress = { ...B, snap: { ...B.snap, cosponsorships: { ...B.snap.cosponsorships, congress: 120 } } };
eq(G.changesBetween(A.snap, nextCongress, "2026-12-01").cosponsorships, [], "a new Congress re-baselines co-sponsorships instead of logging every measure dropped");
const tracked = G.diffStatus({}, { "119|H.R. 9": ["pending", "Introduced"] }, "2026-11-22", { docs: { "119|H.R. 9": { n: "H.R. 9", t: "New" } } });
eq(tracked.map((t) => t.change), ["tracked"], "a new federal bill page with a status is logged as tracked");
const many = G.diffCosponsorships({ congress: 119, bills: [], people: {} }, { congress: 119, bills: Array.from({ length: 40 }, (_, i) => `H.R. ${1000 + i}`), people: { alpha: Array.from({ length: 40 }, (_, i) => i) } }, "2026-11-21", {});
eq([many.length, many[0].count, many[0].bills.length], [1, 40, G.MAX_BILLS_PER_ENTRY], "a big batch is one entry per member, with the full count and a capped list");

section("2 · the lanes on /changes");
const log = { committees: ch.committees, cosponsorships: ch.cosponsorships, status: ch.status };
const committees = C.committeeItems(log), cosponsorships = C.cosponsorItems(log), statuses = C.statusItems(log);
eq(committees.map((i) => i.title), [
  "Alpha Person's title on the Committee on Agriculture changed",
  "Alpha Person joined the Livestock subcommittee (Committee on Agriculture)",
  "Beta Person left the Committee on Finance",
], "committee items say who, what and which committee");
eq(committees[0].detail, "Chairman → Ranking Member", "a title change shows before → after");
eq([committees[1].link, committees[2].link], ["/p/alpha", "/committee/SSFI00"], "links go to the person's file, or the committee page for someone who left");
eq(committees[2].source.url, "https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml", "a Senate committee change links the Senate file");
eq(cosponsorships.map((i) => i.title), ["Alpha Person added as a co-sponsor of S. 5 — A Tax Act", "Beta Person no longer listed as a co-sponsor of H.R. 200 — A Road Act"], "co-sponsorship items name the measure");
eq(cosponsorships[0].source.url, "https://www.congress.gov/bill/119th-congress/senate-bill/5", "a single-measure change links its Congress.gov page");
eq(C.cosponsorItems({ cosponsorships: [{ date: "2026-11-21", pid: "alpha", name: "Alpha Person", change: "added", congress: 119, count: 1, bills: [BILLS[0].slice(0, 1).concat([BILLS[0][1], BILLS[0][4], 1])] }] })[0].link, "/b/119/H.R.%20100", "a measure with a PolitiDex bill page links it");
eq(C.cosponsorItems({ cosponsorships: [many[0]] })[0].detail.endsWith(`and ${40 - G.MAX_BILLS_PER_ENTRY} more`), true, "a batch lists the measures it carries and counts the rest");
eq(statuses.map((i) => [i.title, i.detail, i.link]), [["H.R. 100 — A Farm Act: status changed (Passed the House)", "119th Congress · was: Introduced", "/b/119/H.R.%20100"]], "a status item shows the new status, the old one and the bill page");

const seats = C.seatItems({ changes: [{ date: "2026-11-18", pid: "x", state: "ohio", stateName: "Ohio", change: "added", name: "X Y", office: "U.S. Representative", seat: "Ohio" }] });
const feed = C.feedBody({ votes: [], positions: [], seats, committees, cosponsorships, statuses }, "2026-11-23T00:00:00Z");
eq(feed.counts, { votes: 0, positions: 0, seats: 1, committees: 3, cosponsorships: 2, statuses: 1 }, "/api/changes counts every lane");
eq(feed.items.map((i) => i.kind), ["status", "cosponsor", "cosponsor", "committee", "committee", "committee", "seat"], "the lanes merge newest first");
ok(feed.items.every((i) => i.source && i.source.label), "every item names its source");
for (const k of ["committee", "cosponsor", "status"]) ok(feed.sources[k] && /previous pull/.test(feed.sources[k]), `the ${k} lane's source says it is a comparison with the previous pull`);
const html = C.changesPageHtml(feed);
for (const [kind, word] of [["committee", "Committee"], ["cosponsor", "Co-sponsorship"], ["status", "Bill status"], ["seat", "Roster seat"]]) {
  ok(new RegExp(`<li data-pdx-change="${kind}">\\n<span class="k">${word}</span>`).test(html), `/changes labels the ${kind} lane "${word}"`);
}
ok(/Alpha Person joined the Livestock subcommittee/.test(html) && /added as a co-sponsor of S\. 5/.test(html) && /status changed \(Passed the House\)/.test(html), "/changes prints a committee, a co-sponsorship and a bill-status change");

section("3 · the roster-seat lane is unaffected");
const onlySeats = C.feedBody({ votes: [], positions: [], seats }, "2026-11-23T00:00:00Z");
eq(onlySeats.items, feed.items.filter((i) => i.kind === "seat"), "the seat items are the same with or without the new lanes");
eq([onlySeats.counts.seats, onlySeats.counts.committees, onlySeats.counts.cosponsorships, onlySeats.counts.statuses], [1, 0, 0, 0], "callers that pass only the original lanes still work");
eq(seats[0].title, "X Y added to the Ohio seat roster", "a seat item reads as before");
ok(/roster-seats\/ohio\.js/.test(seats[0].source.label), "a seat item still names its seat file");
const rd = RC.diff({ ohio: { a: { name: "A" } } }, { ohio: { a: { name: "A", party: "D" } } }, "2026-11-19");
eq(rd.map((x) => [x.pid, x.change, x.fields]), [["a", "updated", ["party"]]], "the seat diff is unchanged");
eq(spawnSync(process.execPath, [join(ROOT, "scripts/gen-roster-changes.mjs"), "--check"], { cwd: ROOT }).status, 0, "the seat snapshot is current");
const realSeats = C.seatItems(JSON.parse(R("db/roster-changes.json")), 30);
ok(realSeats.length > 0 && realSeats.every((i) => i.kind === "seat"), "the committed roster log still renders as the seat lane");

section("4 · registry, feed function, committed files");
const reg = R("scripts/generators.mjs");
const at = (s) => reg.indexOf(`"${s}"`);
ok(at("gen-congress-changes.mjs") > at("gen-committees.mjs") && at("gen-congress-changes.mjs") > at("gen-cosponsorships.mjs") && at("gen-congress-changes.mjs") > at("gen-bill-docs.mjs") && at("gen-committees.mjs") > 0, "gen-congress-changes runs after the files it diffs");
ok(at("gen-roster-changes.mjs") > at("gen-roster-seats.mjs"), "gen-roster-changes is still registered after gen-roster-seats");
const cf = R("netlify/functions/changes-feed.mts");
ok(/db\/congress-changes\.json/.test(cf) && /committeeItems/.test(cf) && /cosponsorItems/.test(cf) && /statusItems/.test(cf), "the feed function serves the three new lanes");
ok(/seatItems\(rosterChanges/.test(cf) && /path: \["\/changes", "\/api\/changes"\]/.test(cf) && /method: \["GET"\]/.test(cf), "the roster lane, routes and method are unchanged");
ok(!/\.insert\(|\.update\(|\.delete\(/.test(cf), "the feed function only reads");
const committed = JSON.parse(R("db/congress-changes.json"));
ok(G.LANES.every((l) => Array.isArray(committed[l]) && committed[l].length <= G.MAX_ENTRIES), "db/congress-changes.json carries every lane, capped");
eq(spawnSync(process.execPath, [join(ROOT, "scripts/gen-congress-changes.mjs"), "--check"], { cwd: ROOT }).status, 0, "the congress change snapshot is current");

rmSync(dir, { recursive: true, force: true });
console.log(`\n${failures.length ? "✗" : "✓"} ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
