#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-coverage-phase5.mjs — the Phase 5 coverage surfaces
// ─────────────────────────────────────────────────────────────────────────────
//   1. Roll-call pages: only a roll call that passes the publish gate gets a
//      page; the page prints the bill, question, date, chamber, result and the
//      member votes linked to /p/ files; anything else is a 404 page. The
//      four-segment rewrite sits above /vote/* in netlify.toml.
//   2. Attendance: counted from published roll calls only, labelled as a count
//      of published roll calls and not an official score.
//   3. Co-sponsorships: the generator derives from its committed source, its
//      section is separate from "Bills sponsored", the bill page does not
//      repeat co-sponsors the Sponsors block already names.
//   4. Funding: FEC kinds, the AIPAC chip's generator still reads the shared
//      core, and the AIPAC chip file is not touched by the new section.
//   5. Committees: parsed from the official files' shapes; nothing invented.
//   6. The "what changed" feed: read-only, every item labelled with its source.
//   7. Registry, shells and the service worker.
//
//   node scripts/test-coverage-phase5.mjs   (no database, no network)
import { readFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const dir = mkdtempSync(join(tmpdir(), "cov5-"));
const build = async (entry, name) => {
  const out = join(dir, name + ".mjs");
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent" });
  return import(pathToFileURL(out).href);
};
const P = await build("netlify/lib/vote-actions-publish.ts", "pub");
const C = await build("netlify/lib/coverage-pages.ts", "pages");

// ── fake gate deps: one bill, two rolls, one of them held ────────────────────
const BILL = "us-119-hr-5000";
const goodStats = { billKey: BILL, measureType: "bill", tagCount: 2, rows: 3, unmappedRows: 1, unresolvedRows: 0, unknownKindRows: 0, missingRawRows: 0, proceduralRows: 0, rolls: 2 };
const rollStat = (roll, extra = {}) => ({ ...goodStats, chamber: "house", congress: 119, session: 1, rollNumber: roll, rolls: 1, ...extra });
const row = (roll, pid, vote, extra = {}) => ({
  billKey: BILL, chamber: "house", congress: 119, session: 1, rollNumber: roll, voteDate: `2025-03-0${roll % 9}T15:00:00Z`,
  vote, voteRaw: vote === "yes" ? "Yea" : vote === "no" ? "Nay" : "Not Voting", voteKind: "passage", isProcedural: false,
  question: "On Passage", result: "Passed", sourceUrl: `https://clerk.house.gov/Votes/2025${roll}`, sourceLabel: "Clerk of the House",
  politicianId: pid, memberName: pid ? pid.toUpperCase() : "Delegate", party: "R", state: "UT", rawRef: "x", ...extra,
});
const rows = [row(10, "maloy", "yes"), row(10, "lee", "no"), row(10, null, "yes"), row(11, "maloy", "not_voting"), row(11, "lee", "yes")];
const deps = {
  rowsForPolitician: async (pid) => rows.filter((r) => r.politicianId === pid),
  statsForBills: async () => [goodStats],
  statsForRolls: async () => [rollStat(10), rollStat(11, { missingRawRows: 1 })],
  rowsForBill: async () => rows,
  billInfo: async () => [{ billKey: BILL, congress: 119, measureType: "bill", number: "H.R. 5000", title: "A Test Act" }],
  billKeyForRoll: async (r) => (r.chamber === "house" && r.congress === 119 && r.session === 1 && (r.roll === 10 || r.roll === 11) ? BILL : null),
  recentRolls: async () => [11, 10].map((n) => ({ billKey: BILL, chamber: "house", congress: 119, session: 1, rollNumber: n, voteDate: `2025-03-0${n % 9}`, question: "On Passage", result: "Passed", sourceUrl: "https://clerk.house.gov/x", sourceLabel: "Clerk", procedural: false })),
};

section("1 · roll-call pages");
const pub = await P.publishedRollCall({ chamber: "house", congress: 119, session: 1, roll: 10 }, deps);
ok(pub && pub.roll && pub.roll.roll === 10, "a roll call that passes the gate is returned");
eq(pub && pub.page, "/vote/119/house/1/10", "its page address carries congress, chamber, session and roll");
eq(await P.publishedRollCall({ chamber: "house", congress: 119, session: 1, roll: 11 }, deps), null, "a held roll call (missing payload) gets no page");
eq(await P.publishedRollCall({ chamber: "house", congress: 119, session: 1, roll: 99 }, deps), null, "a roll call not on file gets no page");
const heldBill = { ...deps, statsForBills: async () => [{ ...goodStats, tagCount: 0 }] };
eq(await P.publishedRollCall({ chamber: "house", congress: 119, session: 1, roll: 10 }, heldBill), null, "a roll call on a bill that fails the bill rules gets no page");
const page = C.rollPageHtml(pub);
for (const [what, re] of [["bill link", /href="\/b\/119\/H\.R\.%205000"/], ["question", /data-pdx-roll-question>On Passage</], ["date", /data-pdx-roll-date>2025-03-01</],
  ["chamber", /data-pdx-roll-chamber>House · 119th Congress, session 1</], ["result", /data-pdx-roll-result>Passed</], ["member link", /href="\/p\/maloy" data-pdx-roll-member="maloy"/],
  ["canonical", /<link rel="canonical" href="https:\/\/politidex\.fyi\/vote\/119\/house\/1\/10"/], ["publish-check note", /passed PolitiDex's automatic publish checks/], ["unlisted count", /1 recorded vote by members without one is counted/]]) {
  ok(re.test(page), `roll-call page shows the ${what}`);
}
ok(!/data-pdx-roll-member=""/.test(page) && !/Delegate/.test(page), "a member with no PolitiDex file is not named");
eq(C.parseRollPath("/vote/119/senate/2/45"), { congress: 119, chamber: "senate", session: 2, roll: 45 }, "the four-segment path parses");
eq(C.parseRollPath("/vote/119/house/190"), null, "the older three-segment path is not this page's");
eq(C.parseRollPath("/vote/119/judiciary/1/4"), null, "an unknown chamber does not parse");
ok(/noindex/.test(C.rollNotFoundHtml({ congress: 119, chamber: "house", session: 1, roll: 11 })), "the not-published page is noindex");
const toml = R("netlify.toml");
const at4 = toml.indexOf('from = "/vote/:congress/:chamber/:session/:roll"');
const at3 = toml.indexOf('from = "/vote/*"');
ok(at4 > 0 && at3 > 0 && at4 < at3, "the roll-call page rewrite sits above the /vote/* rewrite");
ok(/to = "\/api\/vote-page\/:congress\/:chamber\/:session\/:roll"/.test(toml), "the rewrite targets the vote-page function");
ok(/path: "\/api\/vote-page\/:congress\/:chamber\/:session\/:roll"/.test(R("netlify/functions/vote-page.mts")), "the function answers that path");
ok(/publishedRollCall/.test(R("netlify/functions/vote-page.mts")), "the page reads only through the publish gate");

section("2 · attendance");
const att = P.attendanceFrom(await P.publishedForPolitician("maloy", deps));
eq({ rolls: att.rolls, notVoting: att.notVoting }, { rolls: 1, notVoting: 0 }, "a held roll call is not counted (maloy's not-voting roll is held)");
const att2 = P.attendanceFrom({ billKeys: { a: [{ chamber: "house", congress: 119, session: 1, roll: 1, vote: "yes", date: "2025-01-02" }, { chamber: "house", congress: 119, session: 1, roll: 2, vote: "not_voting", date: "2025-02-02" }, { chamber: "house", congress: 119, session: 1, roll: 3, vote: "present", date: "2025-03-02" }, { chamber: "house", congress: 119, session: 1, roll: 4, vote: "no", date: "2025-04-02" }] } });
eq(att2, { rolls: 4, voted: 3, notVoting: 1, present: 1, missedPct: 25, first: "2025-01-02", last: "2025-04-02",
  missed: [{ chamber: "house", congress: 119, session: 1, roll: 2, date: "2025-02-02", question: null, bill: null, page: "/vote/119/house/1/2" }] },
  "counts, the missed share, the date span and the missed rolls (with their pages)");
eq(P.attendanceFrom(null).rolls, 0, "no published roll calls → zero, and the section is not drawn");

// The person-file module, in a sandbox.
const sandbox = { document: { readyState: "complete", getElementById: () => null, querySelector: () => null, addEventListener() {} }, setTimeout, fetch: undefined };
sandbox.window = sandbox;
vm.runInNewContext(R("person-coverage.js"), sandbox, { filename: "person-coverage.js" });
const PC = sandbox.PDXPersonCoverage;
const attHtml = PC.attendanceHtml(att2);
ok(/count of the roll calls published on PolitiDex/.test(attHtml) && /not an official attendance score/.test(attHtml), "attendance is labelled as a count of published roll calls, not an official score");
ok(/Not voting on <strong>1<\/strong> of 4 published roll calls \(25%\)/.test(attHtml), "attendance line");
eq(PC.attendanceHtml(null), "", "no attendance → no section");

section("3 · co-sponsorships");
const G = await import(pathToFileURL(join(ROOT, "scripts/gen-cosponsorships.mjs")).href);
eq(G.rowOf({ congress: 119, type: "HJRES", number: "12", title: " A  title ", introducedDate: "2025-02-01", policyArea: { name: "Energy" } }, 119),
  ["119|H.J.Res. 12", ["A title", "2025-02-01", "Energy", "https://www.congress.gov/bill/119th-congress/house-joint-resolution/12"]], "a Congress.gov row → the citation the bill pages print");
eq(G.rowOf({ congress: 118, type: "HR", number: "1" }, 119), null, "another Congress is left out");
eq(G.rowOf({ congress: 119, amendmentNumber: "5" }, 119), null, "an amendment (no bill type) is left out");
const src = { congress: 119, fetchedOn: "2026-11-19", source: "s", bills: { "119|H.R. 1": ["One", "2025-01-03", "Taxation", "u1"], "119|S. 2": ["Two", "2025-02-03", "", "u2"] }, members: { A000001: ["119|H.R. 1", "119|S. 2"], B000002: ["119|S. 2"], C000003: ["119|H.R. 1"] } };
const der = G.derive(src, new Map([["A000001", "alpha"], ["B000002", "beta"]]), { pages: new Set(["119|H.R. 1"]), names: { alpha: "Alpha A", beta: "Beta B" } });
eq(der.bills.map((b) => b[0]), ["S. 2", "H.R. 1"], "bills newest introduced first");
eq(der.people, { alpha: [0, 1], beta: [0] }, "roster ids only; an unmapped bioguide is left out");
eq(der.bills[1][5], 1, "a bill with a PolitiDex page is marked");
const slice = C.cosponsorshipsFor("alpha", der);
eq(slice.bills.map((b) => b.page), [null, "/b/119/H.R.%201"], "the person slice links a /b/ page only where one exists");
eq(C.cosponsorshipsFor("gamma", der), null, "no rows → null");
eq(C.billCosponsorsFor("119|S. 2", der).cosponsors.map((c) => c.pid), ["alpha", "beta"], "the bill slice lists roster co-sponsors");
const cosHtml = PC.cosponsorshipsHtml(slice);
ok(/id="pdx-cosponsorships"/.test(cosHtml) && !/pdx-sponsored/.test(cosHtml), "its own section, not the sponsored-bills one");
ok(/separate from “Bills sponsored”/.test(cosHtml), "the section says it is separate from Bills sponsored");
ok(!/cosponsorships|api\/person-coverage/.test(R("person-bills.js")), "the Bills sponsored list reads none of the new data (it only loads the module)");
const BC = (() => { const s = { document: { readyState: "loading", addEventListener() {} }, location: { pathname: "/" } }; s.window = s; vm.runInNewContext(R("bill-cosponsors.js"), s); return s.PDXBillCosponsors; })();
eq(BC.keyFromPath("/b/119/H.R.%205000"), "119|H.R. 5000", "the bill page key from its path");
eq(BC.keyFromPath("/b/2025GS/H.B.%2076"), "", "a state sitting is not covered");
const bdata = { cosponsors: [{ pid: "alpha", name: "Alpha A" }, { pid: "beta", name: "Beta B" }], url: "https://www.congress.gov/x" };
ok(!/alpha/.test(BC.html(bdata, { alpha: 1 })) && /beta/.test(BC.html(bdata, { alpha: 1 })), "a co-sponsor the Sponsors block names is not repeated");
eq(BC.html(bdata, { alpha: 1, beta: 1 }), "", "every co-sponsor already named → no section");
if (existsSync(join(ROOT, "db/cosponsorship-source.json"))) {
  const r = spawnSync(process.execPath, [join(ROOT, "scripts/gen-cosponsorships.mjs"), "--check"], { cwd: ROOT, encoding: "utf8" });
  eq(r.status, 0, "db/cosponsorships.json is current with its committed source");
} else ok(false, "db/cosponsorship-source.json is committed");

section("4 · funding");
const F = await import(pathToFileURL(join(ROOT, "scripts/gen-funding.mjs")).href);
eq(["P", "D", "C", "L", "T"].map((x, i) => F.kindOf(i === 0 ? { designation: "P" } : i === 1 ? { designation: "D" } : { orgType: x })), ["candidate", "leadership", "corporate", "labor", "trade"], "committee kinds from FEC's codes");
eq(F.kindOf({ type: "Y" }), "party", "a party committee");
const people = new Map([["alpha", { fec: "H0UT01000", pacs: { C00000001: { 2024: 5000, 2026: 1000 }, C00000002: { 2026: 2500 } } }], ["gone", { fec: "H1", pacs: { C00000001: { 2026: 1 } } }]]);
const master = new Map([["C00000001", { name: "ACME PAC", orgType: "C" }], ["C00000002", { name: "UNION PAC", orgType: "L" }]]);
const fb = F.build(people, master, new Set(["alpha"]));
eq(fb.people.alpha, { fec: "H0UT01000", total: 8500, n: 2, kinds: { corporate: 6000, labor: 2500 }, top: [["C00000001", 6000], ["C00000002", 2500]] }, "totals, kinds and the largest committees");
ok(!fb.people.gone, "a person not on the roster is left out");
const fs = C.fundingFor("alpha", fb);
const fHtml = PC.fundingHtml(fs);
ok(/Committee money \(FEC\)/.test(fHtml) && /Separate from the AIPAC chip/.test(fHtml) && /Not individual donors/.test(fHtml), "a separate, clearly labelled section");
ok(/id="pdx-committee-money"/.test(fHtml) && !/pdx-atk|pdx-aipac/.test(fHtml), "it is not the AIPAC chip");
ok(/from "\.\/fec-core\.mjs"/.test(R("scripts/gen-aipac-pac.mjs")) && /from "\.\/fec-core\.mjs"/.test(R("scripts/gen-funding.mjs")), "the AIPAC generator and the funding generator share one FEC reader");
ok(!/person-funding|person-coverage/.test(R("pdx-aipac.js")), "the AIPAC chip does not read the new data");
const fundFile = JSON.parse(R("db/person-funding.json"));
ok(Object.keys(fundFile.people).length > 300, "the committed funding table covers the federal roster");
ok(Object.values(fundFile.people).every((p) => p.top.every(([id, n]) => fundFile.committees[id] && n > 0)), "every listed committee is named, with a net above zero");

section("5 · committees");
const K = await import(pathToFileURL(join(ROOT, "scripts/gen-committees.mjs")).href);
const hx = `<MemberData publish-date="Nov 3"><title-info><congress-num>119</congress-num></title-info><members><member><member-info><bioguideID>A000001</bioguideID></member-info><committee-assignments><committee comcode="AG00" rank="3" leadership="Chairman"/><subcommittee subcomcode="AG15" rank="2" leadership="Vice Chair"/><committee comcode="ZZ00" rank="1"/></committee-assignments></member></members><committees><committee type="standing" comcode="AG00"><committee-fullname>Committee on Agriculture</committee-fullname><subcommittee subcomcode="AG15"><subcommittee-fullname>Livestock</subcommittee-fullname></subcommittee></committee></committees></MemberData>`;
const sx = `<senators><lastUpdate><date>Today</date></lastUpdate><senator><bioguideId>B000002</bioguideId><committees><committee code="SSFI00">Committee on Finance</committee></committees></senator></senators>`;
const ksrc = K.sourceFrom(K.parseHouse(hx), K.parseSenate(sx), "2026-11-19");
const kd = K.derive(ksrc, new Map([["A000001", "alpha"], ["B000002", "beta"]]));
eq(kd.people.alpha, [["AG00", "Chairman"], ["AG15", "Vice Chair"]], "House assignments with the titles the file prints; a code with no name is dropped");
eq(kd.people.beta, [["SSFI00"]], "Senate assignments carry no title (the file has none)");
const cslice = C.committeesFor("alpha", kd);
eq(cslice.committees.map((c) => [c.name, c.title, c.subcommittees.map((s) => s.name)]), [["Committee on Agriculture", "Chairman", ["Livestock"]]], "subcommittees nest under their committee");
const kfile = JSON.parse(R("db/person-committees.json"));
const ksource = JSON.parse(R("db/committee-source.json"));
const bgOf = new Map(Object.entries(JSON.parse(R("db/vr-member-map.json")).map).map(([b, p]) => [p, b]));
let invented = 0;
for (const [pid, list] of Object.entries(kfile.people)) {
  const bg = bgOf.get(pid);
  const official = new Set([...(ksource.house.members[bg] || []), ...(ksource.senate.members[bg] || [])].map((r) => r[0]));
  for (const [code] of list) if (!official.has(code)) invented++;
}
eq(invented, 0, "every committed assignment is in the official file for that member");
eq(spawnSync(process.execPath, [join(ROOT, "scripts/gen-committees.mjs"), "--check"], { cwd: ROOT }).status, 0, "db/person-committees.json is current with its committed source");

section("6 · what changed");
const items = C.voteItems(await P.recentPublishedRolls(deps, 10));
eq(items.map((i) => i.link), ["/vote/119/house/1/10"], "only published roll calls reach the feed");
const pos = C.positionItems({ cards: { lee: [{ pos: "oppose", topic: "Tariffs", issueKey: "tariffs", text: "“No.”", source: { label: "Senate floor", url: "https://lee.senate.gov/x" }, pipeline: { updated_at: "2026-11-10T00:00:00Z" } }] } }, { lee: "Mike Lee" });
eq(pos[0].title, "Mike Lee opposes Tariffs", "a stated position item");
const seats = C.seatItems({ changes: [{ date: "2026-11-18", pid: "x", state: "ohio", stateName: "Ohio", change: "added", name: "X Y", office: "U.S. Representative", seat: "Ohio" }] });
const feed = C.feedBody({ votes: items, positions: pos, seats }, "2026-11-19T00:00:00Z");
ok(feed.readOnly === true && feed.items.length === 3, "the feed lists every lane");
ok(feed.items.every((i) => i.source && i.source.label), "every item names its source");
ok(/roster-seats\/ohio\.js/.test(seats[0].source.label), "a seat change names the seat file it came from");
const fp = C.changesPageHtml(feed);
ok(/Source: /.test(fp) && /read-only/.test(fp), "the page labels sources and says it is read-only");
const cf = R("netlify/functions/changes-feed.mts");
ok(/method: \["GET"\]/.test(cf) && !/\.insert\(|\.update\(|\.delete\(/.test(cf), "the feed function only reads");
ok(/cardsBody/.test(cf) && /hiddenKey/.test(cf), "positions are the same set /api/stated-positions serves (review flags applied)");
const RC = await import(pathToFileURL(join(ROOT, "scripts/gen-roster-changes.mjs")).href);
const d = RC.diff({ ohio: { a: { name: "A", office: "Rep" }, b: { name: "B", party: "R" } } }, { ohio: { b: { name: "B", party: "D" }, c: { name: "C" } } }, "2026-11-19");
eq(d.map((x) => [x.pid, x.change, x.fields || null]), [["a", "removed", null], ["b", "updated", ["party"]], ["c", "added", null]], "seat diff: removed, updated (field named), added");
eq(spawnSync(process.execPath, [join(ROOT, "scripts/gen-roster-changes.mjs"), "--check"], { cwd: ROOT }).status, 0, "the seat snapshot is current");

section("7 · registry, shells, service worker");
const reg = R("scripts/generators.mjs");
const iSeats = reg.indexOf('"gen-roster-seats.mjs"'), iChanges = reg.indexOf('"gen-roster-changes.mjs"'), iDocs = reg.indexOf('"gen-bill-docs.mjs"'), iCos = reg.indexOf('"gen-cosponsorships.mjs"');
ok(iSeats > 0 && iChanges > iSeats, "gen-roster-changes runs after gen-roster-seats");
ok(iDocs > 0 && iCos > iDocs, "gen-cosponsorships runs after gen-bill-docs (it reads the bill pages)");
ok(reg.includes('"gen-committees.mjs"'), "gen-committees is registered");
ok(!/\{ script: "gen-funding\.mjs" \}/.test(reg), "gen-funding is not registered (its inputs are not in the repo)");
ok(/loadScript\('\/person-coverage\.js'/.test(R("person-bills.js")) && !/person-coverage/.test(R("person.html")), "person-bills.js loads person-coverage.js as a companion; person.html is unchanged");
ok(/<script defer src="\/bill-cosponsors\.js"><\/script>/.test(R("bill.html")), "bill.html loads bill-cosponsors.js (root-absolute)");
ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(R("sw.js")) || [])[1]) >= 586, "the service worker moved a version (person-bills.js and bill.html are precached)");
ok(!/person-recorded-votes/.test(R("person-coverage.js").replace(/#pdx-recorded-votes|'#pdx-recorded-votes'/g, "")), "person-coverage.js does not load or change Recorded votes");

rmSync(dir, { recursive: true, force: true });
console.log(`\n${failures.length ? "✗" : "✓"} ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
