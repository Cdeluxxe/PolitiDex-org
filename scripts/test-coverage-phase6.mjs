#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-coverage-phase6.mjs — the Phase 5 surfaces, connected
// ─────────────────────────────────────────────────────────────────────────────
//   1. Roll-call links: the bill page's "Roll calls on the record" and the
//      person file's "Recorded votes" link each roll call to
//      /vote/<congress>/<chamber>/<session>/<roll>, the same address
//      rollPagePath gives the roll-call page; attendance lists the missed
//      rolls, each linked to its page.
//   2. Committee pages: /committee/<code> renders from db/person-committees.json
//      (name, members linked to /p/, Clerk titles, subcommittees), unknown codes
//      are a noindex 404, the rewrite and function agree, the person file links
//      each committee to its page, and the sitemap lists every committee page.
//   3. Provenance dates: db/person-funding.json carries an as-of date the
//      generator writes, and Committee money, Bills co-sponsored and Committees
//      print "Data as of …".
//
//   node scripts/test-coverage-phase6.mjs   (no database, no network)
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const dir = mkdtempSync(join(tmpdir(), "cov6-"));
const build = async (entry, name) => {
  const out = join(dir, name + ".mjs");
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent" });
  return import(pathToFileURL(out).href);
};
const P = await build("netlify/lib/vote-actions-publish.ts", "pub");
const C = await build("netlify/lib/coverage-pages.ts", "pages");
const K = await import(pathToFileURL(join(ROOT, "netlify/lib/committee-index.mjs")).href);

const sandboxFor = (file) => {
  const sb = { document: { readyState: "complete", getElementById: () => null, querySelector: () => null, addEventListener() {} }, setTimeout, fetch: undefined, location: { pathname: "/" } };
  sb.window = sb;
  vm.runInNewContext(R(file), sb, { filename: file });
  return sb;
};

// ── 1 · roll-call links ─────────────────────────────────────────────────────
section("1 · roll-call links");
const roll = (n, extra = {}) => ({ chamber: "house", congress: 119, session: 2, roll: n, date: "2026-03-04T15:00:00.000Z", question: "On Passage", result: "Passed",
  procedural: false, sourceUrl: "https://clerk.house.gov/Votes/2026" + n, totals: { yes: 1, no: 0, present: 0, not_voting: 0 }, unlisted: 0,
  members: [{ pid: "maloy", name: "Maloy", party: "R", state: "UT", vote: "yes" }], ...extra });

const BR = sandboxFor("bill-roll-calls.js").PDXBillRollCalls;
for (const r of [roll(190), { ...roll(45), chamber: "senate", session: 1 }]) {
  eq(BR.rollPage(r), P.rollPagePath(r), `bill page: roll ${r.chamber} ${r.roll} uses the roll-call page's own address`);
}
const billHtml = BR.html({ billKey: "us-119-hr-5000", rolls: [roll(190)] });
ok(/<a href="\/vote\/119\/house\/2\/190" data-pdx-bill-roll-page>House roll 190<\/a>/.test(billHtml), "bill page: the roll label links to /vote/119/house/2/190");
ok(/<a href="\/vote\/119\/house\/2\/190">Roll-call page<\/a> · <a href="https:\/\/clerk\.house\.gov\/Votes\/2026190"/.test(billHtml), "bill page: a Roll-call page link sits beside the official record");
eq(BR.rollPage({ chamber: "house", congress: 119, session: null, roll: 3 }), "", "bill page: a row without all four parts gets no link");

const RV = sandboxFor("person-recorded-votes.js").PDXRecordedVotes;
const rvData = { billKeys: { "us-119-hr-5000": [{ ...roll(190), vote: "yes", voteRaw: "Yea" }, { ...roll(12, { chamber: "senate", session: 1 }), vote: "no", voteRaw: "Nay" }] },
  info: { "us-119-hr-5000": { number: "H.R. 5000", title: "A Test Act", page: "/b/119/H.R.%205000" } } };
const rvHtml = RV.html(RV.billsFrom(rvData));
ok(/<a href="\/vote\/119\/house\/2\/190" data-pdx-rv-page>House roll 190<\/a>/.test(rvHtml), "person file: a House roll links to its page");
ok(/<a href="\/vote\/119\/senate\/1\/12" data-pdx-rv-page>Senate roll 12<\/a>/.test(rvHtml), "person file: a Senate roll links to its page");
eq(RV.rollPage(roll(190)), P.rollPagePath(roll(190)), "person file: same address as rollPagePath");

const published = { billKeys: {
  "us-119-hr-5000": [{ ...roll(190), vote: "not_voting", date: "2026-03-04T15:00:00.000Z" }, { ...roll(191), vote: "yes" }],
  "us-119-s-9": [{ ...roll(12, { chamber: "senate", session: 1 }), vote: "not_voting", date: "2025-05-06T15:00:00.000Z", question: "On the Motion" }],
}, info: { "us-119-hr-5000": { number: "H.R. 5000" }, "us-119-s-9": { number: "S. 9" } } };
const att = P.attendanceFrom(published);
eq(att.notVoting, 2, "attendance: count unchanged");
eq(att.missed.map((m) => [m.page, m.bill, m.date]), [["/vote/119/house/2/190", "H.R. 5000", "2026-03-04"], ["/vote/119/senate/1/12", "S. 9", "2025-05-06"]], "attendance: missed rolls, newest first, with page and bill");
const PC = sandboxFor("person-coverage.js").PDXPersonCoverage;
const attHtml = PC.attendanceHtml(att);
ok(/Not voting on <strong>2<\/strong> of 3 published roll calls/.test(attHtml), "attendance: the count line is unchanged");
ok(/data-pdx-att-missed-list="2"/.test(attHtml), "attendance: the missed rolls are listed");
ok(/<a href="\/vote\/119\/house\/2\/190">House roll 190<\/a> · H\.R\. 5000 · 2026-03-04/.test(attHtml), "attendance: each missed roll links to its roll-call page");
ok(/<a href="\/vote\/119\/senate\/1\/12">Senate roll 12<\/a>/.test(attHtml), "attendance: Senate rolls too");
ok(!/href="javascript/.test(PC.missedHtml([{ chamber: "house", congress: 1, session: 1, roll: 1, page: "javascript:alert(1)" }])), "attendance: a page that is not a roll-call address is not linked");
const many = Array.from({ length: 14 }, (_, i) => ({ chamber: "house", congress: 119, session: 1, roll: i + 1, page: `/vote/119/house/1/${i + 1}` }));
ok(/<details class="pdx-cov-more"><summary>Show all 14<\/summary>/.test(PC.missedHtml(many)), "attendance: a long list folds after ten");
ok(/missed: \[\] as MissedRoll\[\]/.test(R("netlify/lib/vote-actions-publish.ts")) && /rollPagePath\(r\)/.test(R("netlify/lib/vote-actions-publish.ts")), "attendance: the server builds each page with rollPagePath");

// ── 2 · committee pages ─────────────────────────────────────────────────────
section("2 · committee pages");
const kfile = JSON.parse(R("db/person-committees.json"));
const people = JSON.parse(R("db/share-index.json")).people;
eq(K.parseCommitteePath("/committee/AG00"), "AG00", "the path parses");
eq(K.parseCommitteePath("/committee/ssfi00/"), "SSFI00", "case-insensitive, trailing slash ok");
eq(K.parseCommitteePath("/committee/../x"), null, "a non-code does not parse");
eq(K.committeeData("ZZ99", kfile, people), null, "an unknown code has no data");

// A House committee with a titled member and subcommittees.
const withSubs = Object.keys(kfile.committees).find((c) => !kfile.committees[c][2] && kfile.committees[c][1] === "house" &&
  Object.values(kfile.committees).some((v) => v[2] === c) && Object.values(kfile.people).some((rows) => rows.some(([x, t]) => x === c && t)));
ok(!!withSubs, `a House committee with subcommittees and a titled member exists (${withSubs})`);
const kd = K.committeeData(withSubs, kfile, people);
const kHtml = C.committeePageHtml(kd);
ok(kHtml.includes(`<h1>${kfile.committees[withSubs][0].replace(/&/g, "&amp;")}</h1>`), "the page shows the committee name");
const expectMembers = Object.entries(kfile.people).filter(([, rows]) => rows.some(([x]) => x === withSubs)).map(([pid]) => pid);
eq(kd.members.map((m) => m.pid).sort(), expectMembers.sort(), "every member the file lists is on the page, nobody else");
ok(expectMembers.every((pid) => kHtml.includes(`<a href="/p/${encodeURIComponent(pid)}">`)), "each member links to their /p/ file");
const titled = kd.members.filter((m) => m.title);
ok(titled.length > 0 && titled.every((m) => kHtml.includes(`data-pdx-cmte-member="${m.pid}"`)) && /data-pdx-cmte-title>(Chair|Chairman|Chairwoman|Vice Chair)/.test(kHtml), "Clerk titles are shown where present");
ok(kd.members.findIndex((m) => !m.title) === -1 || kd.members.slice(kd.members.findIndex((m) => !m.title)).every((m) => !m.title), "titled members are listed first");
const subs = Object.entries(kfile.committees).filter(([, v]) => v[2] === withSubs).map(([c]) => c);
ok(subs.every((c) => kHtml.includes(`<a href="/committee/${c}">`)), "each subcommittee links to its own page");
ok(kHtml.includes(`<link rel="canonical" href="https://politidex.fyi/committee/${withSubs}"`), "canonical address");
ok(/Data as of <span data-pdx-asof>\d{4}-\d{2}-\d{2}<\/span>/.test(kHtml), "the page prints its as-of date");
const subHtml = C.committeePageHtml(K.committeeData(subs[0], kfile, people));
ok(subHtml.includes(`data-pdx-cmte-parent="${withSubs}"`) && subHtml.includes(`href="/committee/${withSubs}"`), "a subcommittee page links back to its committee");
const senate = Object.keys(kfile.committees).find((c) => kfile.committees[c][1] === "senate" && !kfile.committees[c][2]);
ok(/Senate committee assignments/.test(C.committeePageHtml(K.committeeData(senate, kfile, people))), "a Senate committee cites the Senate file");
ok(/noindex/.test(C.committeeNotFoundHtml("ZZ99")) && /noindex/.test(C.committeeNotFoundHtml(null)), "the not-on-file page is noindex");

const toml = R("netlify.toml");
ok(/from = "\/committee\/:code"\s+to = "\/api\/committee-page\/:code"\s+status = 200\s+force = true/.test(toml), "netlify.toml rewrites /committee/<code> to the function");
const fn = R("netlify/functions/committee-page.mts");
ok(/path: "\/api\/committee-page\/:code"/.test(fn), "the function answers that path");
ok(/db\/person-committees\.json/.test(fn) && !/vote-actions-db|getDatabase|fetch\(/.test(fn), "the function reads only committed files (no database, no network)");

// Person file: each committee name links to its page.
const cslice = C.committeesFor(Object.keys(kfile.people).find((pid) => kfile.people[pid].some(([c]) => kfile.committees[c]?.[2])), kfile);
const cHtml = PC.committeesHtml(cslice);
ok(cslice.committees.every((x) => cHtml.includes(`<a href="/committee/${x.code}" class="pdx-cov-name" data-pdx-cmte-link>`)), "person file: each committee name links to /committee/<code>");
ok(cslice.committees.flatMap((x) => x.subcommittees).every((y) => cHtml.includes(`<a href="/committee/${y.code}" data-pdx-cmte-link>`)), "person file: each subcommittee links to its page");
ok(cslice.committees.every((x) => x.page === `/committee/${x.code}`), "the coverage slice carries each page address");

// Sitemap.
const codes = K.committeeCodes(kfile);
eq(codes.length, Object.keys(kfile.committees).length, "every committee on file has a member, so every one has a page");
const sm = R("sitemap.xml");
ok(codes.every((c) => sm.includes(`<loc>https://politidex.fyi/committee/${c}</loc>`)), "the sitemap lists every committee page");
ok(sm.lastIndexOf("/committee/") > sm.lastIndexOf("/ballot/ut-amendment-b"), "committee entries are appended after every earlier line");

// ── 3 · provenance dates ────────────────────────────────────────────────────
section("3 · provenance dates");
const fund = JSON.parse(R("db/person-funding.json"));
ok(/^\d{4}-\d{2}-\d{2}$/.test(fund.asOf || ""), `db/person-funding.json carries an as-of date (${fund.asOf})`);
const F = await import(pathToFileURL(join(ROOT, "scripts/gen-funding.mjs")).href);
const built = F.build(new Map([["alpha", { fec: "H0XX00001", pacs: { C00000001: { 2024: 500 } } }]]), new Map([["C00000001", { name: "A PAC", orgType: "C" }]]), null, "2026-11-19");
eq(built.asOf, "2026-11-19", "gen-funding writes the as-of date it is given");
eq(Object.keys(built).slice(0, 6), ["_comment", "cycles", "kinds", "source", "asOf", "committees"], "and in the committed file's key order");
eq(F.build(new Map(), new Map(), null).asOf, undefined, "no date given → no field (never an invented one)");
eq(Object.keys(fund), ["_comment", "cycles", "kinds", "source", "asOf", "committees", "people"], "the committed file has the generator's key order");
ok(R("db/person-funding.json") === JSON.stringify(fund) + "\n", "the committed file is the generator's serialisation");
const pid = Object.keys(fund.people)[0];
const fHtml = PC.fundingHtml(C.fundingFor(pid, fund));
ok(fHtml.includes(`Data as of <span data-pdx-asof>${fund.asOf}</span>`), "Committee money prints its as-of date");
const cos = JSON.parse(R("db/cosponsorships.json"));
const cpid = Object.keys(cos.people)[0];
ok(PC.cosponsorshipsHtml(C.cosponsorshipsFor(cpid, cos)).includes(`Data as of <span data-pdx-asof>${cos.fetchedOn}</span>`), "Bills co-sponsored prints its as-of date");
ok(cHtml.includes(`Data as of <span data-pdx-asof>${kfile.sources.fetchedOn}</span>`), "Committees prints its as-of date");
eq(PC.fundingHtml({ ...C.fundingFor(pid, fund), asOf: null }).includes("Data as of"), false, "no date on file → no line");

// The service worker: none of the changed modules is precached.
const sw = R("sw.js");
for (const f of ["/bill-roll-calls.js", "/person-recorded-votes.js", "/person-coverage.js", "/sitemap.xml"]) ok(!sw.includes(`'${f}'`), `${f} is not a precached entry (no CACHE_VERSION bump needed)`);

rmSync(dir, { recursive: true, force: true });
console.log(`\n${failures.length ? "✗" : "✓"} ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
