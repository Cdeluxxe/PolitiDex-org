#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-mn-contested-cycle.mjs — Minnesota, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// mn-ballot-2026.js holds the contested State Senate and State House races on
// Minnesota's November 3, 2026 ballot that Minnesota reporting names with a
// sitting member running, every name the Secretary of State lists for each,
// and the formal acts on file for the people in them, each a recorded floor
// vote read from the House roll call page on house.mn.gov or the Journal of
// the Senate on senate.mn and linked to it. cmp-data.js gains one block of
// identity-only shells for the sitting members in those races and nothing
// else; the resolver, its lettered-seat tables and every other row stay put.
//
// What it pins:
//
//   1. A MINNESOTA LOCATION IN A CONTESTED SEAT names the right sitting
//      members on Who Represents Me — a lettered House seat by its letter —
//      with at least one formal act and its effect line under each row, and
//      the door to /ballot/mn.
//   2. A VACANT OR UNCONTESTED SEAT: Senate 31 and House 59B read "District N
//      — no member on file yet"; Senate 59 (held, not contested) shows its
//      sitting member with no act block and no board; House 14A (held by a
//      member running for the Senate, an open race not on file) shows its
//      member and opens no board.
//   3. THE DATA: every race lists exactly the Secretary of State's names and
//      parties; every act names a measure on file, a page on the chamber's own
//      site and a person in one of the races; every incumbent is the member
//      the resolver seats; every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with no record gets "No formal act on file" and no file;
//      every contested seat's race prints every name with its party.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested
//      seats, each printing its race; no other Minnesota legislative seat has
//      one, and the eleven earlier states' boards are unchanged.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the eleven earlier contested
//      cycles included, and every Minnesota seat outside the races; the
//      roster outside its Minnesota block, the resolver and the earlier
//      states' data are byte-identical; the worker moved one version and
//      precaches nothing new; no migration.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-mn-contested-cycle.mjs

// Minnesota was boarded whole since (test-four-state-deepen.mjs): this suite
// boots the roster with that pass carved out, on both sides of every HEAD
// comparison, and holds its races to what it was written to hold.
import { R, HEAD, bootWithoutFourStateShells as boot, withoutFourStateShells, levelOf, band, settled, DECLARED_MIGRATIONS } from "./state-leg-harness.mjs";
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
const must = (c, m) => { if (!c) { console.error(`✗ mn contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js",
  "wi-ballot-2026.js", "fl-ballot-2026.js", "az-ballot-2026.js", "ny-ballot-2026.js", "tx-ballot-2026.js", "il-ballot-2026.js"];
const BALLOTS = [...EARLIER, "mn-ballot-2026.js"];
const SJ = "https://www.senate.mn/journals/gotopage?session=ls94&number=";
const HV = "https://www.house.mn.gov/votes/Details?BillNumber=";
const REVISOR = "https://www.revisor.mn.gov/bills/bill.php?b=House&f=";

// Every candidate on the November 3, 2026 general-election ballot in each
// contested seat, as the Secretary of State lists them (write-ins aside).
const FILED = {
  "mn-statesenate-3": [["Grant Hauschild", "DFL"], ["Andrea Zupancich", "R"]],
  "mn-statesenate-4": [["Rob Kupec", "DFL"], ["Austin Peterson", "R"]],
  "mn-statesenate-14": [["Aric Putnam", "DFL"], ["Bernie Perryman", "R"]],
  "mn-statesenate-32": [["Michael Kreun", "R"], ["Chris Ford", "DFL"]],
  "mn-statesenate-33": [["Karin Housley", "R"], ["Nat Smith", "DFL"]],
  "mn-statesenate-35": [["Jim Abeler", "R"], ["Angela Nelson", "DFL"]],
  "mn-statesenate-41": [["Judy Seeberger", "DFL"], ["Tom Dippel", "R"]],
  "mn-statesenate-48": [["Julia Coleman", "R"], ["Dan Kessler", "DFL"]],
  "3B": [["Natalie Zeleznikar", "R"], ["Aaron Schweiger", "DFL"]],
  "18A": [["Erica Schwartz", "R"], ["Leah Hanson", "DFL"]],
  "32A": [["Nolan West", "R"], ["Amanda Matchett", "DFL"]],
  "32B": [["Matt Norris", "DFL"], ["Leslie Larson", "R"]],
  "34A": [["Danny Nadeau", "R"], ["Jason Heaser", "DFL"]],
  "35A": [["Zack Stephenson", "DFL"], ["Josh Jungling", "R"]],
  "35B": [["Kari Rehrauer", "DFL"], ["Steve Pape", "R"]],
  "41A": [["Wayne A Johnson", "R"], ["Cole Birkeland", "DFL"]],
  "45A": [["Andrew Myers", "R"], ["Tracey Breazeale", "DFL"]],
  "48B": [["Lucille “Lucy” Rehm", "DFL"], ["Caleb Steffenhagen", "R"]],
  "54A": [["Brad Tabke", "DFL"], ["Aaron Paul", "R"]],
};

const N = (() => { const w = {}; w.window = w; vm.runInContext(R("mn-ballot-2026.js"), vm.createContext(w)); return w.PDXMnBallot; })();
must(N && N.RACES && N.RACES.length >= 4, "mn-ballot-2026.js published no races");
const HK = (label) => String(N.houseKey(label));
const at = (city, county, cd, sd, hd) => ({ state: "Minnesota", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
// The real card, with all twelve ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootMN = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };
const headCard = (loc) => {
  const W = boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": withoutFourStateShells(HEAD("cmp-data.js")) });
  for (const f of EARLIER) vm.runInContext(HEAD(f), W, { filename: f + "@HEAD" });
  return band(W);
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a Minnesota location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Coon Rapids: Senate 35 and House 35A, both contested.
  const W = bootMN(at("Coon Rapids", "Anoka County", "6", "35", HK("35A")));
  eq(levelOf(W, "statesenate").pid, "abeler_mn", "SD 35: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "stephenson_mn", "HD 35A: the sitting representative");
  eq(levelOf(W, "statehouse").distLabel, "State House · District 35A", "HD 35A: the row is headed by its lettered seat");
  const out = band(W);
  has(out, "Jim Abeler", "SD 35: the senator is on the card");
  has(out, "Zack Stephenson", "HD 35A: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const [pid, host] of [["abeler_mn", SJ], ["stephenson_mn", HV]]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxmn-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, esc(first.effect), `${pid}: the newest act's effect line is under the row`);
    has(b, esc(host), `${pid}: the act links to its chamber's own page`);
    has(b, 'href="/ballot/mn"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 35 — no member on file yet", "SD 35 is named");
  lacks(out, "District 35A — no member on file yet", "HD 35A is named");
  // Every contested seat, one at a time: the member the race names is seated,
  // and an act with its effect line sits under the row.
  for (const r of N.RACES) {
    const inc = r.field.find((c) => c.incumbent);
    const loc = r.chamber === "statesenate" ? at("", "", "1", String(r.district), "1") : at("", "", "1", "1", String(r.district));
    const Wr = bootMN(loc);
    eq(levelOf(Wr, r.chamber).pid, inc.pid, `${r.seat}: the sitting member`);
    const b = actBlocks(band(Wr)).find((x) => x.indexOf(`data-pdxmn-pid="${inc.pid}"`) >= 0) || "";
    has(b, esc(N.actsFor(inc.pid)[0].effect), `${r.seat}: an effect line under the row`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Senate 31 and House 59B: nobody on the roster claims either.
  const loc = at("Minneapolis", "Hennepin County", "5", "31", HK("59B"));
  const W = bootMN(loc);
  eq(levelOf(W, "statesenate").pid, null, "SD 31: no member is named");
  eq(levelOf(W, "statehouse").pid, null, "HD 59B: no member is named");
  const out = band(W);
  has(out, "District 31 — no member on file yet", "SD 31: the row says nobody is on file");
  has(out, "District 59B — no member on file yet", "HD 59B: the row says nobody is on file");
  eq(actBlocks(out).length, 0, "an empty seat carries no act block");
  eq(out, headCard(loc), "SD 31 / HD 59B: the card is HEAD's");
  // Downtown Minneapolis: SD 59, held and not one of the races.
  const loc2 = at("Minneapolis", "Hennepin County", "5", "59", HK("59B"));
  const W2 = bootMN(loc2);
  eq(levelOf(W2, "statesenate").pid, "bobby_joe_champion", "SD 59: the sitting member");
  const out2 = band(W2);
  has(out2, "Bobby Joe Champion", "SD 59: the sitting member is on the card");
  eq(actBlocks(out2).length, 0, "an uncontested seat carries no act block");
  eq(out2, headCard(loc2), "SD 59: the card is HEAD's");
  const V = voice();
  const BD = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const s of ["mn-statesenate-59", "mn-statesenate-31", "mn-statesenate-1", "mn-statesenate-24", "mn-statesenate-37", "mn-statesenate-54",
    `mn-statehouse-${HK("59B")}`, `mn-statehouse-${HK("14A")}`, `mn-statehouse-${HK("14B")}`, `mn-statehouse-${HK("41B")}`,
    `mn-statehouse-${HK("33A")}`, `mn-statehouse-${HK("36A")}`, `mn-statehouse-${HK("37A")}`]) {
    // A seat outside the races has only the read-only board the whole-state
    // opening gave it — no composer, no race block.
    const alias = V.boardPath(s).replace("/district/", "");
    eq((BD.board(alias) || {}).composer, false, `${s}: a seat with no race takes a voice`);
    if (alias) lacks(R(`district-${alias}.html`), "data-pdxmn-seat=", `${s}: a seat with no race prints a race`);
  }
  ok(!N.race("statesenate", 59), "SD 59 is not one of the races on file");
  // House 14A: Bernie Perryman holds it and is running for the Senate.
  const W3 = bootMN(at("St. Cloud", "Stearns County", "6", "14", HK("14A")));
  eq(levelOf(W3, "statehouse").pid, "perryman_mn", "HD 14A: the sitting member");
  ok(!N.race("statehouse", HK("14A")), "HD 14A is not one of the races on file");
  const page = W.PDXMnBallot.pageHtml({ located: true, state: "Minnesota", levels: [
    { key: "statesenate", district: "59", pid: "bobby_joe_champion" }, { key: "statehouse", district: HK("59B"), pid: null },
    { key: "statesenate", district: "31", pid: null }, { key: "statehouse", district: HK("14A"), pid: "perryman_mn" }] });
  has(page, "District 59B — no member on file yet", "ballot view: an empty House seat says nobody is on file, by its letter");
  has(page, "District 31 — no member on file yet", "ballot view: an empty Senate seat says nobody is on file");
  has(page, "Bobby Joe Champion", "ballot view: an uncontested seat shows its sitting member");
  has(page, "Bernie Perryman", "ballot view: House 14A shows its sitting member");
  has(page, "State House District 14A", "ballot view: a House seat is printed by its letter");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a seat with no race says so");
  lacks(page, "pdxpa-board", "ballot view: no board door for a seat with no race");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: names, acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootMN(at("Minneapolis", "Hennepin County", "5", "31", HK("59B")));
const RO = W0.CMP_DATA;
{
  const want = {};
  for (const k in FILED) want[/^mn-/.test(k) ? k : `mn-statehouse-${HK(k)}`] = FILED[k];
  eq(JSON.stringify(N.RACES.map((r) => r.seat).sort()), JSON.stringify(Object.keys(want).sort()), "the races are exactly the filed seats");
  const inRace = new Set();
  for (const r of N.RACES) {
    ok(r.seat === `mn-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    if (r.chamber === "statehouse") eq(N.houseKey(r.label), r.district, `${r.seat}: the key is the lettered seat's`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    eq(r.filed, "https://candidates.sos.mn.gov/", `${r.seat}: the Secretary of State's candidate list`);
    eq(JSON.stringify(r.field.map((c) => [c.name, c.party])), JSON.stringify(want[r.seat] || []), `${r.seat}: every name and party on the ballot`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Minnesota", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^(?:DFL|R)$/.test(c.party), `${r.seat} ${c.name}: party`);
      if (!c.pid) {
        eq(N.actsFor(c.name).length, 0, `${c.name}: a challenger with no record has no acts`);
        ok(!Object.values(RO).some((row) => row && row.name === c.name && row.state === "Minnesota"), `${c.name}: given a roster row`);
        continue;
      }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Minnesota" && RO[c.pid].candidate === false, `${c.pid}: a Minnesota roster record, in office`);
      const last = c.name.replace(/“[^”]*” /, "").split(" ").pop();
      ok(RO[c.pid] && RO[c.pid].name.indexOf(last) >= 0, `${c.pid}: the roster name is the race's`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  // The two challengers who sit in the House hold the seats their records name.
  eq(W0._pdxStateLegSeat("Minnesota", "statehouse", HK("14A")), "perryman_mn", "HD 14A: Bernie Perryman");
  eq(W0._pdxStateLegSeat("Minnesota", "statehouse", HK("41B")), "dippel_mn", "HD 41B: Tom Dippel");
  for (const [m, what, date, url, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^(House|Senate) /.test(what), `act ${m}: the action names its chamber`);
    const senate = /^Senate/.test(what);
    if (senate) ok(url.indexOf(SJ) === 0, `act ${m}: a Senate vote links its Journal page on senate.mn`);
    else ok(url.indexOf(HV) === 0, `act ${m}: a House vote links its roll call page on house.mn.gov`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (absent is not an act)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || "");
      if (senate) ok(office === "Minnesota State Senator", `act ${m}: ${who} voted in the Senate`);
      else ok(office === "Minnesota State Representative", `act ${m}: ${who} voted in the House`);
    }
  }
  const METHOD = /\b(?:precedent|mirror|primary|on-axis|coded|weighted|mapping|roll call|tally|voted|score)\b/i;
  for (const k in N.MEASURES) {
    const m = N.MEASURES[k];
    const e = m.effect;
    ok(e.length <= 140, `${k}: effect line is ${e.length} characters`);
    ok(/^[A-Z]/.test(e) && /\.$/.test(e) && e.slice(0, -1).indexOf(". ") < 0, `${k}: one sentence, ending on its stop`);
    ok(!METHOD.test(e), `${k}: no method words`);
    ok(!/\b\d{1,3}\s*[-–]\s*\d{1,3}\b/.test(e), `${k}: names no tally`);
    ok(!/\b(?:Republican|Democrat|DFL|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    if (m.status === "failed") ok(/^Would have /.test(e), `${k}: a failed act opens "Would have"`);
    else if (m.status === "passed") ok(/^Would (?!have)/.test(e), `${k}: an act that passed one chamber opens "Would"`);
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Signed [A-Z][a-z]+\.? \d{1,2}, 20\d\d \((?:2025 First Special Session, )?Chapter \d+\)$/.test(m.act), `${k}: a law reads as done and names its chapter`);
    else ok(false, `${k}: unknown status ${m.status}`);
    ok(m.source.indexOf(REVISOR) === 0, `${k}: the bill status page on revisor.mn.gov`);
    ok(String(m.from || "").indexOf("Title:") === 0, `${k}: the line names the session law title it was written from`);
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
  const W = bootMN(at("Coon Rapids", "Anoka County", "6", "35", HK("35A")));
  W.PDXVoice = voice();
  const page = W.PDXMnBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxmn-seat="mn-statesenate-35"', "the Senate race is on the page");
  has(page, `data-pdxmn-seat="mn-statehouse-${HK("35A")}"`, "the House race is on the page");
  has(page, "State House District 35A", "the House seat is printed by its letter");
  for (const c of [...N.race("statesenate", 35).field, ...N.race("statehouse", HK("35A")).field]) {
    has(page, esc(c.name), `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      for (const a of N.actsFor(c.pid)) has(page, esc(a.effect), `${c.name}: ${a.measure}'s effect line`);
    }
  }
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  for (const nm of ["Angela Nelson", "Josh Jungling"]) {
    const own = (page.split(`data-pdxmn-cand="${nm}"`)[1] || "").split('<li class="pdxpa-cand"')[0];
    ok(own.length > 0, `${nm}: listed`);
    lacks(own, 'href="/p/', `${nm}: no file`);
    has(own, "No formal act on file.", `${nm}: no formal act on file`);
  }
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/mn-sd-35"', "the Senate seat's board is linked");
  has(page, `href="/district/mn-hd-${HK("35A")}"`, "the House seat's board is linked");
  // A challenger who sits in the House keeps a file and her acts.
  const s14 = N.raceHtml(N.race("statesenate", 14));
  has(s14, 'href="/p/perryman_mn"', "SD 14: Bernie Perryman's file is linked");
  has(s14, esc(N.actsFor("perryman_mn")[0].effect), "SD 14: Bernie Perryman's acts are listed");
  // Every contested seat's race prints every name with its party.
  for (const r of N.RACES) {
    const h = N.raceHtml(r);
    for (const c of r.field) {
      has(h, esc(c.name), `${r.seat}: ${c.name} is listed`);
      has(h, `${esc(c.name)}${c.pid ? "</a>" : "</span>"} <span class="pdxpa-party">(${c.party})</span>`, `${r.seat}: ${c.name}'s party`);
    }
    has(h, 'href="https://candidates.sos.mn.gov/"', `${r.seat}: the official list is linked`);
  }
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/mn"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/mn", "/ballot/mn/", "/ballot/mn.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-mn.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-mn.html")), "ballot-mn.html is on disk");
  const doc = R("ballot-mn.html");
  has(doc, 'id="pdx-mn-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/mn-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "North Carolina", "Michigan", "Ohio", "Wisconsin", "Florida", "Arizona", "New York", "Texas", "Illinois"]) {
    lacks(doc, st, `the Minnesota ballot document says nothing about ${st}`);
  }
  const idx = R("index.html");
  ok(idx.indexOf('src="/mn-ballot-2026.js"') >= 0 && idx.indexOf('src="/mn-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads mn-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const mnLeg = Object.keys(routes).filter((k) => /^mn-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  for (const r of N.RACES) ok(mnLeg.includes(r.seat), `BOARD_ROUTES: contested ${r.seat} has no board`);
  eq(mnLeg.length, 201, "BOARD_ROUTES: every Minnesota seat, now that the state is opened whole");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co|nv|ca|wa|ne|sd|id|mt|ak|ri|me|ms|vt|tn)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const HVR = (() => { const w = {}; w.window = w; vm.runInContext(HEAD("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  for (const k of Object.keys(HVR)) eq(routes[k], HVR[k], `${k}: an earlier board moved`);
  const CONTESTED = contestedSeats();
  // Every board HEAD did not have is a contested seat some state's ballot
  // file holds a race for (contestedSeats() reads them from those files).
  for (const k of Object.keys(routes)) if (!HVR[k]) ok(CONTESTED.has(k), `${k}: a board with no race behind it`);
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `mn-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    // The contested-boards voice pass opened the composer and the poll here,
    // behind the gate every voiced board shares.
    eq((B.board(alias) || {}).composer, true, `${alias}: takes a voice`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxmn-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/mn"', `${doc}: links the Minnesota ballot view`);
    has(h, `<h1 class="pdxdb-h1">Minnesota ${r.chamber === "statesenate" ? "Senate" : "House"} District ${r.label}</h1>`, `${doc}: names its seat`);
    for (const c of r.field) has(h, esc(c.name), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, esc(N.actsFor(inc.pid)[0].effect), `${doc}: prints an effect line`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-mn-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, 201, "one Minnesota legislative board document per seat");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!mn-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxmn-seat=") >= 0) ok(false, `${f}: a board outside the races carries a Minnesota race block`);
  }
  // Exactly the contested seats are on the composer's three lists (the
  // contested-boards voice pass), and no other Minnesota legislative seat.
  {
    const want = N.RACES.map((r) => `mn-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`).sort();
    for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
      const got = [...new Set([...R(f).matchAll(/["'](mn-(?:hd|sd)-\d+)["']/g)].map((x) => x[1]))].sort();
      eq(JSON.stringify(got), JSON.stringify(want), `${f}: exactly the contested Minnesota seats take a voice`);
    }
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il)-(?:hd|sd)-\d+\.html$/.test(f))) ok(settled(f), `${f}: moved`);
  for (const f of readdirSync(ROOT).filter((f) => /^district-mn-(?:cd-\d+|us-senate-.*)\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(settled("cmp-data.js"), "cmp-data.js: HEAD's bytes outside the one Minnesota shell block");
  for (const f of ["voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html",
    "ballot-nc.html", "ballot-mi.html", "ballot-oh.html", "ballot-wi.html", "ballot-fl.html", "ballot-az.html",
    "ballot-ny.html", "ballot-tx.html", "ballot-il.html"]) {
    eq(R(f), HEAD(f), `${f}: byte-identical to HEAD`);
  }
  for (const f of readdirSync(join(ROOT, "db")).filter((f) => /^roster-/.test(f))) eq(R(`db/${f}`), HEAD(`db/${f}`), `db/${f}: byte-identical to HEAD`);
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  ok(ver(R("sw.js")) === ver(HEAD("sw.js")) + 1 || R("sw.js") === HEAD("sw.js"), "sw.js: CACHE_VERSION moved exactly one step, or the worker was not touched");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null || DECLARED_MIGRATIONS.includes(f), `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's roster and HEAD's eleven earlier ballot files,
  // against today's with all twelve.
  const now = bootMN({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": withoutFourStateShells(HEAD("cmp-data.js")) });
  for (const f of EARLIER) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in the eleven earlier states, read off their files,
  // so their act rows are compared too.
  const NAMES = { pa: "Pennsylvania", ga: "Georgia", nc: "North Carolina", mi: "Michigan", oh: "Ohio", wi: "Wisconsin",
    fl: "Florida", az: "Arizona", ny: "New York", tx: "Texas", il: "Illinois" };
  const SEATS = {};
  for (const f of EARLIER) {
    const code = f.slice(0, 2);
    const w = {}; w.window = w; vm.runInContext(R(f), vm.createContext(w));
    const M = w[`PDX${code[0].toUpperCase()}${code[1]}Ballot`];
    SEATS[NAMES[code]] = [...new Set(M.RACES.map((r) => String(r.district)))];
  }
  eq(Object.keys(SEATS).length, 11, "fixture: the eleven earlier contested states");
  const cmp = (st, sd, hd) => {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `${st} seat ${sd}/${hd}: the card changed`);
  };
  for (const st of STATES) for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) cmp(st, d, d);
  // Minnesota itself: every seat outside the races and their members reads as
  // HEAD's card did.
  for (const [sd, hd] of [["1", "1"], ["59", HK("59B")], ["31", HK("31A")], ["20", HK("20B")], ["67", HK("67B")], ["24", HK("24A")]]) cmp("Minnesota", sd, hd);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["mn-ballot-2026.js", "ballot-mn.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["cmp-data.js", "who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "sw.js", "scripts/gen-district-boards.mjs", "netlify/functions/district-board.mts"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-mn-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} mn contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
