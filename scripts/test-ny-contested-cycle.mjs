#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ny-contested-cycle.mjs — New York, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// ny-ballot-2026.js holds the contested State Senate and State Assembly races
// on New York's November 3, 2026 ballot that New York reporting names with a
// sitting member running, and the formal acts on file for the people in them,
// each a recorded floor vote read from the bill's page on nysenate.gov or its
// Floor Votes page on nyassembly.gov and linked to it. Every incumbent is an
// existing thin shell; the roster does not move.
//
// What it pins:
//
//   1. A NEW YORK LOCATION IN A CONTESTED SEAT names the right sitting members
//      on Who Represents Me, with at least one formal act and its effect line
//      under each row, and the door to /ballot/ny.
//   2. A VACANT OR UNCONTESTED SEAT: Senate 12 (vacant) and Assembly 37 read
//      "District N — no member on file yet"; Senate 15 (held, not contested)
//      shows its sitting member with no act block and no board.
//   3. THE DATA: every act names a measure on file, a page on the chamber's
//      own site and a person in one of the races; every incumbent is the member
//      the resolver seats; every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with no record gets "No formal act on file" and no file.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested
//      seats, each printing its race; no other New York legislative seat has
//      one, and the eight earlier states' boards are byte-identical.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the eight earlier contested
//      cycles included, and every New York seat outside the races; the roster,
//      resolver, shells and the earlier states' data are byte-identical; the
//      worker moved one version and precaches nothing new; no migration.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-ny-contested-cycle.mjs

import { R, HEAD, boot, levelOf, band, settled } from "./state-leg-harness.mjs";
import { readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { contestedSeats } from "./gen-district-boards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ ny contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js",
  "wi-ballot-2026.js", "fl-ballot-2026.js", "az-ballot-2026.js"];
const BALLOTS = [...EARLIER, "ny-ballot-2026.js"];
const SEN = "https://www.nysenate.gov/legislation/bills/2025/";
const ASM = "https://nyassembly.gov/leg/?bn=";

const at = (city, county, cd, sd, ad) => ({ state: "New York", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: ad, mapSelected: true });
// The real card, with all nine ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootNY = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const N = (() => { const w = {}; w.window = w; vm.runInContext(R("ny-ballot-2026.js"), vm.createContext(w)); return w.PDXNyBallot; })();
must(N && N.RACES && N.RACES.length >= 4, "ny-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a New York location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // East Greenbush: Senate 43 and Assembly 107, both contested.
  const W = bootNY(at("East Greenbush", "Rensselaer County", "20", "43", "107"));
  eq(levelOf(W, "statesenate").pid, "ashby_ny", "SD 43: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "bendett_ny", "AD 107: the sitting Assembly member");
  const out = band(W);
  has(out, "Jacob Ashby", "SD 43: the senator is on the card");
  has(out, "Scott Bendett", "AD 107: the Assembly member is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const [pid, host] of [["ashby_ny", SEN], ["bendett_ny", ASM]]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxny-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, host, `${pid}: the act links to its chamber's own page`);
    has(b, 'href="/ballot/ny"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 43 — no member on file yet", "SD 43 is named");
  lacks(out, "District 107 — no member on file yet", "AD 107 is named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Sunnyside, Queens: SD 12 is vacant, AD 37 has no member on the roster.
  const loc = at("Sunnyside", "Queens County", "7", "12", "37");
  const W = bootNY(loc);
  eq(levelOf(W, "statesenate").pid, null, "SD 12: no member is named");
  eq(levelOf(W, "statehouse").pid, null, "AD 37: no member is named");
  const out = band(W);
  has(out, "District 12 — no member on file yet", "SD 12: the row says nobody is on file");
  has(out, "District 37 — no member on file yet", "AD 37: the row says nobody is on file");
  eq(actBlocks(out).length, 0, "an empty seat carries no act block");
  eq(out, band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") })), "SD 12 / AD 37: the card is HEAD's");
  // Howard Beach: SD 15, held and not one of the races.
  const loc2 = at("Howard Beach", "Queens County", "8", "15", "37");
  const W2 = bootNY(loc2);
  eq(levelOf(W2, "statesenate").pid, "addabbo_ny", "SD 15: the sitting member");
  const out2 = band(W2);
  has(out2, "Joseph P. Addabbo Jr.", "SD 15: the sitting member is on the card");
  eq(actBlocks(out2).length, 0, "an uncontested seat carries no act block");
  eq(out2, band(boot(loc2, { "who-represents-me.js": HEAD("who-represents-me.js") })), "SD 15: the card is HEAD's");
  const V = voice();
  for (const s of ["ny-statesenate-15", "ny-statesenate-12", "ny-statehouse-37", "ny-statesenate-7", "ny-statehouse-16", "ny-statehouse-23"]) {
    eq(V.boardPath(s), "", `${s}: no board`);
  }
  ok(!N.race("statesenate", 15), "SD 15 is not one of the races on file");
  const page = W.PDXNyBallot.pageHtml({ located: true, state: "New York", levels: [
    { key: "statesenate", district: "15", pid: "addabbo_ny" }, { key: "statehouse", district: "37", pid: null }] });
  has(page, "District 37 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Joseph P. Addabbo Jr.", "ballot view: an uncontested seat shows its sitting member");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a seat with no race says so");
  lacks(page, "/district/ny-sd-15", "ballot view: no board for SD 15");
  lacks(page, "pdxpa-board", "ballot view: no board door for a seat with no race");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootNY(at("Sunnyside", "Queens County", "7", "12", "37"));
const RO = W0.CMP_DATA;
{
  const inRace = new Set();
  for (const r of N.RACES) {
    ok(r.seat === `ny-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("New York", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^(?:[RDGLI]|Conservative|Working Families)$/.test(c.party), `${r.seat} ${c.name}: party`);
      if (!c.pid) { eq(N.actsFor(c.name).length, 0, `${c.name}: a challenger with no record has no acts`); continue; }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "New York", `${c.pid}: a New York roster record`);
      const last = c.name.split(" ").pop();
      ok(RO[c.pid] && RO[c.pid].name.indexOf(last) >= 0, `${c.pid}: the roster name is the race's`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, url, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^(Assembly|Senate) /.test(what), `act ${m}: the action names its chamber`);
    const senate = /^Senate/.test(what);
    if (senate) ok(url.indexOf(SEN) === 0, `act ${m}: a Senate vote links nysenate.gov`);
    else ok(url.indexOf(ASM) === 0 && /&term=2025&Floor%26nbspVotes=Y$/.test(url), `act ${m}: an Assembly vote links its Floor Votes page on nyassembly.gov`);
    for (const who in votes) {
      if (senate) ok(votes[who] === "Aye" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (excused and absent are not acts)`);
      else ok(votes[who] === "Yes" || votes[who] === "No", `act ${m} ${who}: ${votes[who]} (excused and absent are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || "");
      if (senate) ok(/State Senator$/.test(office), `act ${m}: ${who} voted in the Senate`);
      else ok(/Assembly Member$/.test(office), `act ${m}: ${who} voted in the Assembly`);
    }
  }
  const METHOD = /\b(?:precedent|mirror|primary|on-axis|coded|weighted|mapping|roll call|tally|voted|score)\b/i;
  for (const k in N.MEASURES) {
    const m = N.MEASURES[k];
    const e = m.effect;
    ok(e.length <= 140, `${k}: effect line is ${e.length} characters`);
    ok(/^[A-Z]/.test(e) && /\.$/.test(e) && e.slice(0, -1).indexOf(". ") < 0, `${k}: one sentence, ending on its stop`);
    ok(!METHOD.test(e), `${k}: no method words`);
    ok(!/\b\d{1,3}\s*[-–]\s*\d{1,3}\b/.test(e.replace(/\b20\d\d–\d\d\b/g, "")), `${k}: names no tally`);
    ok(!/\b(?:Republican|Democrat|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    if (m.status === "failed") ok(/^Would have /.test(e), `${k}: a failed act opens "Would have"`);
    else if (m.status === "passed") ok(/^Would (?!have)/.test(e), `${k}: an act that passed one chamber opens "Would"`);
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Signed (?:with line-item vetoes )?[A-Z][a-z]+\.? \d{1,2}, 20\d\d \(Chapter \d+(?: of 20\d\d)?\)$/.test(m.act), `${k}: a law reads as done and names its chapter`);
    else ok(false, `${k}: unknown status ${m.status}`);
    eq(m.source, SEN + k.replace(/-[A-Z]$/, ""), `${k}: the bill page on nysenate.gov`);
    ok(String(m.from || "").indexOf("Summary:") === 0, `${k}: the line names the summary it was written from`);
  }
  for (const who of inRace) {
    const d = N.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootNY(at("East Greenbush", "Rensselaer County", "20", "43", "107"));
  W.PDXVoice = voice();
  const page = W.PDXNyBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxny-seat="ny-statesenate-43"', "the Senate race is on the page");
  has(page, 'data-pdxny-seat="ny-statehouse-107"', "the Assembly race is on the page");
  has(page, "State Assembly District 107", "the lower chamber is called the Assembly");
  for (const c of [...N.race("statesenate", 43).field, ...N.race("statehouse", 107).field]) {
    has(page, c.name, `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      for (const a of N.actsFor(c.pid)) has(page, a.effect, `${c.name}: ${a.measure}'s effect line`);
    }
  }
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  for (const nm of ["Devin Lander", "Chloe Pierce"]) {
    const own = (page.split(`data-pdxny-cand="${nm}"`)[1] || "").split('<li class="pdxpa-cand"')[0];
    ok(own.length > 0, `${nm}: listed`);
    lacks(own, 'href="/p/', `${nm}: no file`);
    has(own, "No formal act on file.", `${nm}: no formal act on file`);
  }
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/ny-sd-43"', "the Senate seat's board is linked");
  has(page, 'href="/district/ny-hd-107"', "the Assembly seat's board is linked");
  const three = N.raceHtml(N.race("statehouse", 97));
  has(three, "(Conservative)", "a third-party name keeps its party");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/ny"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/ny", "/ballot/ny/", "/ballot/ny.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-ny.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-ny.html")), "ballot-ny.html is on disk");
  const doc = R("ballot-ny.html");
  has(doc, 'id="pdx-ny-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/ny-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "North Carolina", "Michigan", "Ohio", "Wisconsin", "Florida", "Arizona"]) lacks(doc, st, `the New York ballot document says nothing about ${st}`);
  const idx = R("index.html");
  ok(idx.indexOf('src="/ny-ballot-2026.js"') >= 0 && idx.indexOf('src="/ny-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads ny-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const nyLeg = Object.keys(routes).filter((k) => /^ny-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(nyLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested New York seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const HV = (() => { const w = {}; w.window = w; vm.runInContext(HEAD("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  for (const k of Object.keys(HV)) eq(routes[k], HV[k], `${k}: an earlier board moved`);
  // Every board HEAD did not have is a contested seat some state's ballot
  // file holds a race for (contestedSeats() reads them from those files).
  const CONTESTED = contestedSeats();
  for (const k of Object.keys(routes)) if (!HV[k]) ok(CONTESTED.has(k), `${k}: a board with no race behind it`);
  for (const r of N.RACES) ok(!!routes[r.seat], `${r.seat}: the contested New York seat has a board`);
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `ny-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, false, `${alias}: read-only`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxny-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/ny"', `${doc}: links the New York ballot view`);
    has(h, `<h1 class="pdxdb-h1">New York ${r.chamber === "statesenate" ? "Senate" : "Assembly"} District ${r.district}</h1>`, `${doc}: names its chamber`);
    for (const c of r.field) has(h, c.name.replace(/'/g, "&#39;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, N.actsFor(inc.pid)[0].effect, `${doc}: prints an effect line`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-ny-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no New York legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!ny-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxny-seat=") >= 0) ok(false, `${f}: a board outside the races carries a New York race block`);
  }
  for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
    lacks(R(f), "ny-hd-", `${f}: no New York composer row`);
    lacks(R(f), "ny-sd-", `${f}: no New York composer row`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi|oh|wi|fl|az)-(?:hd|sd)-\d+\.html$/.test(f))) ok(settled(f), `${f}: moved`);
  for (const f of readdirSync(ROOT).filter((f) => /^district-ny-(?:cd-\d+|us-senate-.*)\.html$/.test(f))) ok(settled(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html",
    "ballot-nc.html", "ballot-mi.html", "ballot-oh.html", "ballot-wi.html", "ballot-fl.html", "ballot-az.html",
    "db/roster-state-legislators-ny-pa-il-2026-oct.json"]) {
    ok(settled(f), `${f}: byte-identical to HEAD`);
  }
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  ok(ver(R("sw.js")) === ver(HEAD("sw.js")) + 1 || R("sw.js") === HEAD("sw.js"), "sw.js: CACHE_VERSION moved exactly one step, or the worker was not touched");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null, `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's eight earlier ballot files, against today's with all nine.
  const now = bootNY({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in the eight earlier states, so their act rows are
  // compared too.
  const SEATS = { Pennsylvania: ["6", "16", "12", "18", "144", "160"], Georgia: ["37", "48", "44", "53", "99", "105", "151"],
    "North Carolina": ["7", "11", "18", "42", "25", "37", "98", "105"],
    Michigan: ["9", "35", "27", "28", "44", "46", "55", "61", "86", "109"],
    Ohio: ["29", "10", "17", "36", "60", "12", "89"],
    Wisconsin: ["17", "31", "26", "30", "51", "61", "85", "88", "89", "91", "92", "94", "27", "76"],
    Florida: ["10", "14", "38", "35", "65", "87", "89", "93", "101", "106", "4", "113"],
    Arizona: ["2", "4", "9", "23", "5", "13"] };
  const cmp = (st, sd, hd) => {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `${st} seat ${sd}/${hd}: the card changed`);
  };
  for (const st of STATES) for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) cmp(st, d, d);
  // New York itself: every seat outside the races reads as HEAD's card did.
  for (const [sd, ad] of [["1", "1"], ["12", "37"], ["15", "23"], ["59", "36"], ["7", "16"], ["63", "150"]]) cmp("New York", sd, ad);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["ny-ballot-2026.js", "ballot-ny.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-ny-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} ny contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
