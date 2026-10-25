#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-az-contested-cycle.mjs — Arizona Senate, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// az-ballot-2026.js holds the Arizona State Senate races on Arizona's
// November 3, 2026 ballot that Arizona reporting names as contested with a
// sitting member running, and the formal acts on file for the people in them,
// each a recorded floor vote from the bill's floor actions on apps.azleg.gov,
// linked to its bill page. Arizona's House seats are shared by two members:
// the roster holds no House rows and no House race is held here. Every
// incumbent is an existing thin shell; the roster does not move.
//
// What it pins:
//
//   1. AN ARIZONA LOCATION IN A CONTESTED SEAT names the right sitting
//      senator on Who Represents Me, with at least one formal act and its
//      effect line under the row, and the door to /ballot/az; the shared House
//      seat still reads "District N — no member on file yet".
//   2. AN UNCONTESTED SEAT: Senate 5 shows its sitting member with no act
//      block and no board, and the House row says nobody is on file.
//   3. THE DATA: every act names a measure on file and a person in one of the
//      races; every incumbent is the senator the resolver seats; every effect
//      line keeps CONTENT_STYLE.md; there is no House race.
//   4. THE BALLOT VIEW walks location → race → names, files, acts → board; a
//      challenger with a record and no roster row (Aaron Lieberman) gets acts
//      and no file; one with no record gets "No formal act on file".
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested
//      Senate seats, each printing its race; no other Arizona seat has one,
//      and the seven earlier states' boards are byte-identical.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the seven earlier contested
//      cycles included; the roster, resolver, existing shells and the earlier
//      states' data are byte-identical; the worker moved one version and
//      precaches nothing new; no migration was added.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-az-contested-cycle.mjs

import { R, HEAD, boot, levelOf, band } from "./state-leg-harness.mjs";
import { readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ az contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js", "wi-ballot-2026.js", "fl-ballot-2026.js"];
const BALLOTS = [...EARLIER, "az-ballot-2026.js"];
const AZL = "https://apps.azleg.gov/BillStatus/BillOverview/";

const at = (city, county, cd, ld) => ({ state: "Arizona", city, county, district: cd,
  stateSenateDistrict: ld, stateHouseDistrict: ld, mapSelected: true });
// The real card, with all eight ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootAZ = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const N = (() => { const w = {}; w.window = w; vm.runInContext(R("az-ballot-2026.js"), vm.createContext(w)); return w.PDXAzBallot; })();
must(N && N.RACES && N.RACES.length >= 3, "az-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · an Arizona location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Scottsdale: Legislative District 4, a contested Senate seat.
  const W = bootAZ(at("Scottsdale", "Maricopa County", "1", "4"));
  eq(levelOf(W, "statesenate").pid, "werner_az", "LD 4: the sitting senator");
  eq(levelOf(W, "statehouse").pid, null, "LD 4: the shared House seat names nobody");
  const out = band(W);
  has(out, "Carine Werner", "LD 4: the senator is on the card");
  has(out, "District 4 — no member on file yet", "LD 4: the House row says nobody is on file");
  const blocks = actBlocks(out);
  eq(blocks.length, 1, "the contested Senate seat carries a formal-record block");
  const b = blocks[0] || "";
  has(b, 'data-pdxaz-pid="werner_az"', "the block is the senator's");
  has(b, N.actsFor("werner_az")[0].effect, "the newest act's effect line is under the row");
  has(b, AZL, "the act links to the Legislature's bill status page");
  has(b, 'href="/ballot/az"', "the row opens the ballot view");
  // Every other contested seat seats its incumbent and carries its act.
  for (const r of N.RACES) {
    const Wr = bootAZ(at("", "", "1", String(r.district)));
    const inc = r.field.find((c) => c.incumbent);
    eq(levelOf(Wr, "statesenate").pid, inc.pid, `LD ${r.district}: the sitting senator`);
    has(band(Wr), N.actsFor(inc.pid)[0].effect, `LD ${r.district}: an effect line under the row`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · an uncontested seat, and the shared House seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const loc = at("Phoenix", "Maricopa County", "3", "5");
  const W = bootAZ(loc);
  eq(levelOf(W, "statesenate").pid, "alston_az", "LD 5: the sitting member");
  const out = band(W);
  has(out, W.CMP_DATA.alston_az.name, "LD 5: the sitting member is on the card");
  has(out, "District 5 — no member on file yet", "LD 5: the House row says nobody is on file");
  eq(actBlocks(out).length, 0, "a seat with no act on file carries no act block");
  const was = band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") }));
  eq(out, was, "LD 5: the card is HEAD's");
  const V = voice();
  eq(V.boardPath("az-statesenate-5"), "", "LD 5 Senate: no board");
  eq(V.boardPath("az-statehouse-5"), "", "LD 5 House: no board");
  ok(!N.race("statesenate", 5), "LD 5 is not one of the races on file");
  const page = W.PDXAzBallot.pageHtml(W.pdxRepsForMe());
  has(page, W.CMP_DATA.alston_az.name, "ballot view: an uncontested seat shows its sitting member");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a Senate seat with no race says so");
  has(page, "District 5 — no member on file yet", "ballot view: the House seat says nobody is on file");
  has(page, "PolitiDex does not hold Arizona House races.", "ballot view: the House row says why");
  lacks(page, "/district/az-", "ballot view: no board for an uncontested seat");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootAZ(at("Phoenix", "Maricopa County", "3", "5"));
const RO = W0.CMP_DATA;
const KEY_OFFICE = { "@lieberman": "Representative" };
{
  const inRace = new Set();
  for (const r of N.RACES) {
    eq(r.chamber, "statesenate", `${r.seat}: Arizona races here are Senate races`);
    ok(r.seat === `az-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Arizona", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^(?:[RDGLI])$/.test(c.party), `${r.seat} ${c.name}: party`);
      ok(!(c.pid && c.key), `${r.seat} ${c.name}: a pid or a name key, not both`);
      if (c.key) { ok(!RO[c.key] && !!KEY_OFFICE[c.key], `${c.key}: a name key is not a roster id`); ok(N.actsFor(c.key).length >= 1, `${c.name}: a keyed challenger has acts`); inRace.add(c.key); continue; }
      if (!c.pid) { eq(N.actsFor(c.name).length, 0, `${c.name}: a challenger with no record has no acts`); continue; }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Arizona", `${c.pid}: an Arizona roster record`);
      eq(RO[c.pid] && RO[c.pid].name, c.name, `${c.pid}: the roster name is the race's`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^(19|20)\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(m.indexOf("(" + date.slice(0, 4) + ")") > 0, `act ${m}: the vote is in the measure's own session year`);
    ok(/^(House|Senate) (?:third|final) reading$/.test(what), `act ${m}: the action names its chamber and reading`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (not voting and excused are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      if (/^Senate/.test(what)) ok(/Senator/.test(String((RO[who] || {}).office || "")), `act ${m}: ${who} voted in the Senate`);
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
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Signed (?:with line-item vetoes )?[A-Z][a-z]+ \d{1,2}, 20\d\d \(Laws 20\d\d, Chapter \d+\)$/.test(m.act), `${k}: a law reads as done and names its chapter`);
    else ok(false, `${k}: unknown status ${m.status}`);
    ok(/^https:\/\/apps\.azleg\.gov\/BillStatus\/BillOverview\/\d+\?SessionId=\d+$/.test(m.source), `${k}: the bill status page`);
    ok(/^Short title: “/.test(String(m.from || "")), `${k}: the line names the title it was written from`);
  }
  for (const who of inRace) {
    const d = N.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
    for (const a of N.actsFor(who)) ok(a.source.indexOf(AZL) === 0, `${who} ${a.measure}: links its bill status page`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → race → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootAZ(at("Scottsdale", "Maricopa County", "1", "4"));
  W.PDXVoice = voice();
  const page = W.PDXAzBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxaz-seat="az-statesenate-4"', "the Senate race is on the page");
  has(page, 'data-pdxaz-seat="az-statehouse-4"', "the House seat is on the page");
  for (const c of N.race("statesenate", 4).field) has(page, c.name, `${c.name} is named`);
  has(page, 'href="/p/werner_az"', "Carine Werner: the file is linked");
  const lOwn = (page.split('data-pdxaz-cand="@lieberman"')[1] || "").split('<li class="pdxpa-cand"')[0];
  has(lOwn, N.MEASURES["SB 1823 (2021)"].effect, "Aaron Lieberman: his House acts are listed");
  lacks(lOwn, "’s file", "Aaron Lieberman: no file is linked");
  lacks(page, 'href="/p/@', "no keyed challenger has a file address");
  const p9 = W.PDXAzBallot.raceHtml(N.race("statesenate", 9));
  has(p9, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  const fOwn = (p9.split('data-pdxaz-cand="Bridget Fitzgibbons"')[1] || "");
  lacks(fOwn, 'href="/p/', "Bridget Fitzgibbons: no file");
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/az-sd-4"', "the Senate seat's board is linked");
  lacks(page, "/district/az-hd-", "no House board is linked");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/az"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/az", "/ballot/az/", "/ballot/az.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-az.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-az.html")), "ballot-az.html is on disk");
  const doc = R("ballot-az.html");
  has(doc, 'id="pdx-az-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/az-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "North Carolina", "Michigan", "Ohio", "Wisconsin", "Florida"]) lacks(doc, st, `the Arizona ballot document says nothing about ${st}`);
  const idx = R("index.html");
  ok(idx.indexOf('src="/az-ballot-2026.js"') >= 0 && idx.indexOf('src="/az-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads az-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const azLeg = Object.keys(routes).filter((k) => /^az-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(azLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Arizona seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `az-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, false, `${alias}: read-only`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxaz-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/az"', `${doc}: links the Arizona ballot view`);
    has(h, `<h1 class="pdxdb-h1">Arizona Senate District ${r.district}</h1>`, `${doc}: names its chamber`);
    for (const c of r.field) has(h, c.name.replace(/'/g, "&#39;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, N.actsFor(inc.pid)[0].effect, `${doc}: prints an effect line`);
    if (r.issue) has(h, "Local issue:", `${doc}: names its local issue`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-az-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no Arizona legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!az-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxaz-seat=") >= 0) ok(false, `${f}: a board outside the races carries an Arizona race block`);
  }
  for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
    lacks(R(f), "az-hd-", `${f}: no Arizona composer row`);
    lacks(R(f), "az-sd-", `${f}: no Arizona composer row`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi|oh|wi|fl)-(?:hd|sd)-\d+\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  for (const f of readdirSync(ROOT).filter((f) => /^district-az-(?:cd-\d+|us-senate-.*)\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  ok(!Object.keys(routes).some((k) => /^az-statehouse-/.test(k)), "no Arizona House seat has a board");
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html",
    "ballot-nc.html", "ballot-mi.html", "ballot-oh.html", "ballot-wi.html", "ballot-fl.html", "db/roster-state-legislators-wa-az-ma-2026-oct.json"]) {
    eq(R(f), HEAD(f), `${f}: byte-identical to HEAD`);
  }
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  eq(ver(R("sw.js")), ver(HEAD("sw.js")) + 1, "sw.js: CACHE_VERSION moved exactly one step");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null, `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's seven earlier ballot files, against today's with all eight.
  const now = bootAZ({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in the seven earlier states, so their act rows are
  // compared too.
  const SEATS = { Pennsylvania: ["6", "16", "12", "18", "144", "160"], Georgia: ["37", "48", "44", "53", "99", "105", "151"],
    "North Carolina": ["7", "11", "18", "42", "25", "37", "98", "105"],
    Michigan: ["9", "35", "27", "28", "44", "46", "55", "61", "86", "109"],
    Ohio: ["29", "10", "17", "36", "60", "12", "89"],
    Wisconsin: ["17", "31", "26", "30", "51", "61", "85", "88", "89", "91", "92", "94", "27", "76"],
    Florida: ["10", "14", "38", "35", "65", "87", "89", "93", "101", "106", "4", "113"] };
  for (const st of STATES) {
    for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) {
      const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: d, stateHouseDistrict: d, mapSelected: true };
      now._currentVoterLocation = Object.assign({}, loc);
      was._currentVoterLocation = Object.assign({}, loc);
      eq(band(now), band(was), `${st} seat ${d}: the card changed`);
    }
  }
  // Arizona itself: every seat outside the races reads as HEAD's card did.
  const raced = new Set(N.RACES.map((r) => r.seat));
  for (const d of ["1", "5", "13", "17", "16", "30"]) {
    if (raced.has(`az-statesenate-${d}`)) continue;
    const loc = at("", "", "1", d);
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `Arizona seat ${d}: the card changed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["az-ballot-2026.js", "ballot-az.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "pa-ballot.css", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-az-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} az contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
