#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-internal-hops.mjs — links from indexed pages into the parked archive
// ─────────────────────────────────────────────────────────────────────────────
// Search Console reads most person files, bills and boards as "discovered, not
// indexed": they are in the sitemap and nothing Google already holds links to
// them. This pass added only the hops that were missing, and this file pins
// them, plus the walls each one keeps:
//
//   1. BOARD → MEMBER → BOARD. Every board in BOARDS names a sitting member,
//      and on person.html that member's kicker carries exactly one control, the
//      board's own route. The four UT-N boards resolve their holder through
//      _pdxUsHouseSeat(), which person.html does not load, so the control falls
//      back to seated-member.js's table. The table and the join are pinned equal
//      here for every usHouse row, and band 1 still never takes the fallback.
//   2. DRAWER → BILL PAGE. bill-pages.js is current, holds federal keys only,
//      and every key is a /b/ line already in sitemap.xml. The drawer puts one
//      "Bill page" anchor beside a Congress.gov number door for a measure on the
//      list, none for a measure off it, and none where the bill panel is loaded.
//
//   node scripts/test-internal-hops.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox, ENGINE_FILES } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { measureAddresses, billPath } from "./vr-measure-addresses.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ internal hops: STALE PROBE — ${m}`); process.exit(2); };

function boot(files, pre) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  if (pre) pre(win);
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
  return win;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every board's sitting member links back to that board, once");
// ═════════════════════════════════════════════════════════════════════════════
const PERSON = boot(["cmp-data.js", "profile-alias.js", "profile-evidence.js", "seated-member.js", "district-board.js"]);
const BOARDDOC = boot(["cmp-data.js", "profile-alias.js", "profile-evidence.js", "voter-hub-location.js", "district-board.js"]);
const VOICE = boot(["district-voice.js"]);
const BOARDS = PERSON.PDXDistrictBoard.BOARDS;
const ROUTES = VOICE.PDXVoice.BOARD_ROUTES;
must(Object.keys(BOARDS).length >= 88, "BOARDS shrank below the 88 rows this pass counted");
eq(Object.keys(ROUTES).sort().join(","), Object.keys(BOARDS).sort().join(","), "BOARDS and BOARD_ROUTES name the same seats");

let linked = 0, usHouse = 0;
for (const [seat, row] of Object.entries(BOARDS)) {
  eq(ROUTES[seat], row.route, `${seat}: the control's route is BOARD_ROUTES' row`);
  const pid = row.pid || (row.usHouse ? BOARDDOC._pdxUsHouseSeat(row.usHouse.state, row.usHouse.district) : "");
  ok(!!pid, `${seat}: the board names no sitting member`);
  if (!pid) continue;
  const canon = PERSON.PDXProfilePid(pid) || pid;
  const html = PERSON.PDXDistrictBoard.personLinkHtml(canon);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  eq(hrefs.join(" "), row.route, `${seat}: ${canon}'s person file carries the board's own path, once`);
  if (hrefs.length === 1 && hrefs[0] === row.route) linked++;
  if (row.usHouse) {
    usHouse++;
    eq(PERSON.pdxSeatedMemberFor(seat), pid, `${seat}: seated-member.js's table and the _pdxUsHouseSeat() join name one person`);
  }
}
eq(linked, Object.keys(BOARDS).length, "every board's member links back");
eq(usHouse, 4, "four congressional boards ride the fallback");
// Band 1 never takes the fallback: without the join a UT-N board still names
// nobody, so pidOf() must not know the table exists.
{
  const DB = R("district-board.js");
  const pidOf = (/function pidOf\(b\) \{[\s\S]*?\n  \}/.exec(DB) || [""])[0];
  must(pidOf.length > 80, "pidOf() could not be located");
  ok(!/pdxSeatedMemberFor/.test(pidOf), "band 1's pidOf() reaches for the written-down table");
  // Nobody outside a board gets a control, and nobody gets two.
  eq(PERSON.PDXDistrictBoard.personLinkHtml("mitt_romney"), "", "a member with no board gets no control");
  eq(PERSON.PDXDistrictBoard.personLinkHtml(""), "", "an empty pid gets no control");
}
{
  const P = R("person.html");
  const sm = P.indexOf('<script defer src="/seated-member.js"></script>');
  const db = P.indexOf('<script defer src="/district-board.js"></script>');
  ok(sm > 0 && db > sm, "person.html loads seated-member.js ahead of district-board.js");
  ok(!/src="\/voter-hub-location\.js"/.test(P), "person.html does not load voter-hub-location.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · bill-pages.js is the sitemap's federal bill set, and nothing else");
// ═════════════════════════════════════════════════════════════════════════════
{
  let fresh = true;
  try { execFileSync("node", [join(ROOT, "scripts/gen-bill-pages.mjs"), "--check"], { stdio: "pipe" }); }
  catch { fresh = false; }
  ok(fresh, "bill-pages.js is stale — run node scripts/gen-bill-pages.mjs");
  const W = boot(["bill-pages.js"]);
  const keys = Object.keys(W.PDX_BILL_PAGES || {});
  const sitemap = new Set([...R("sitemap.xml").matchAll(/<loc>https:\/\/politidex\.fyi(\/b\/[^<]+)<\/loc>/g)].map((m) => m[1]));
  const fed = measureAddresses(ROOT).published.filter((a) => /^\d+$/.test(a.sitting));
  eq(keys.length, fed.length, "one key per federal bill page");
  ok(keys.length >= 200, `only ${keys.length} federal bill pages`);
  const off = keys.filter((k) => {
    const i = k.indexOf("/");
    return !sitemap.has(billPath({ sitting: k.slice(0, i), number: k.slice(i + 1) }));
  });
  eq(off.length, 0, `${off.length} key(s) name a bill page the sitemap does not list: ${off.slice(0, 3).join(" ")}`);
  ok(keys.every((k) => /^\d{2,3}\//.test(k)), "a non-federal sitting reached the list");
  ok(R("sw.js").includes("  '/bill-pages.js',\n"), "bill-pages.js is not in the shell beside consistency.js");
  const P = R("person.html");
  const bp = P.indexOf('<script defer src="/bill-pages.js"></script>');
  const cs = P.indexOf('<script defer src="/consistency.js"></script>');
  ok(bp > 0 && cs > bp, "person.html loads bill-pages.js ahead of consistency.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the drawer puts one Bill page door beside a Congress.gov door");
// ═════════════════════════════════════════════════════════════════════════════
const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 100, "the record corpus did not load");
const DRAWER = ["share-links.js", "pdx-issue-family.js", ...ENGINE_FILES, "person-link.js", "issue-scope.js", "issue-colors.js", "voting-record.js"];
function drawerWin(withPages, withPanel) {
  const w = boot(withPages ? ["bill-pages.js", ...DRAWER] : DRAWER, (x) => { x.PROFILES = {}; });
  w.PROFILES = w.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) { try { w.PDXVotingRecord.noteMember(pid, recs); } catch {} }
  if (withPanel) w.PDXBillDetail = { open() {} };
  return w;
}
const ON = drawerWin(true), BARE = drawerWin(false), PANEL = drawerWin(true, true);
const FED_PID = "curtis", FED_KEY = "housing", FED_PATH = "/b/119/H.R.%206644";
must(ON.PDX_BILL_PAGES["119/H.R. 6644"], "H.R. 6644 is no longer a bill page — pick another probe");
const html = ON.PDXConsistency.gapViewHtml(FED_PID, FED_KEY) || "";
must(html.length > 500, "curtis's housing drawer rendered nothing");
ok(html.includes(`<a class="pdxbill-page" href="${FED_PATH}"`), "H.R. 6644 has no in-site door beside its Congress.gov one");
ok(html.includes("congress.gov/bill/119th-congress/house-bill/6644"), "the Congress.gov door is gone");
eq((BARE.PDXConsistency.gapViewHtml(FED_PID, FED_KEY) || "").includes("pdxbill-page"), false,
  "without bill-pages.js the drawer builds a door anyway");
eq((PANEL.PDXConsistency.gapViewHtml(FED_PID, FED_KEY) || "").includes("pdxbill-page"), false,
  "with the bill panel loaded the number is already the in-site door");

// A sweep over a slice of the corpus: every in-site door sits right after a
// Congress.gov number door and goes to a listed page; every such door whose
// bill is listed has one.
{
  const pages = ON.PDX_BILL_PAGES;
  let doors = 0, wrong = 0, lonely = 0, missing = 0;
  const members = [...corpus.byMember.keys()].slice(0, 40);
  for (const pid of members) {
    const keys = new Set();
    for (const it of corpus.byMember.get(pid)) for (const g of (it.issues || [])) if (g && g.issueKey) keys.add(g.issueKey);
    for (const k of keys) {
      const h = ON.PDXConsistency.gapViewHtml(pid, k) || "";
      for (const m of h.matchAll(/<a class="pdxbill-page" href="\/b\/([^/"]+)\/([^"]+)"/g)) {
        doors++;
        if (!pages[decodeURIComponent(m[1]) + "/" + decodeURIComponent(m[2])]) wrong++;
      }
      const ext = /<a class="(?:pdxdos-rec-id|pdxlg-num) pdxbill-door pdxbill-ext"[^>]*>[\s\S]*?<\/a>/g;
      const extCount = (h.match(ext) || []).length;
      const pairCount = (h.match(/pdxbill-ext"[^>]*>[\s\S]*?<\/a><a class="pdxbill-page"/g) || []).length;
      const pageCount = (h.match(/<a class="pdxbill-page"/g) || []).length;
      if (pageCount !== pairCount) lonely += pageCount - pairCount;
      if (pageCount > extCount) missing++;
    }
  }
  ok(doors > 100, `the sweep found only ${doors} in-site doors`);
  eq(wrong, 0, "an in-site door points at a bill that has no page");
  eq(lonely, 0, "an in-site door is not beside a Congress.gov number door");
  eq(missing, 0, "a drawer printed more in-site doors than Congress.gov number doors");
}

console.log("");
if (failures.length) {
  for (const f of failures) console.error("   ✗ " + f);
  console.error(`\n✗ internal hops: ${failures.length} failure(s), ${passed} passed`);
  process.exit(1);
}
console.log(`✓ internal hops: all ${passed} assertions passed`);
