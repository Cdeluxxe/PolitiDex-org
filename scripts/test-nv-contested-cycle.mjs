#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-nv-contested-cycle.mjs — Nevada, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// nv-ballot-2026.js holds the contested State Senate and State Assembly races
// on Nevada's November 3, 2026 ballot that Nevada reporting names with a
// sitting member running, every name the county election offices list for
// each, and the formal acts on file for the people in them, each a
// final-passage vote read from the bill's Votes page on NELIS and linked to
// it. cmp-data.js gains one block of identity-only shells for the sitting
// members who had no row; Marilyn Dondero Loop's existing row is untouched.
//
// What it pins:
//
//   1. A NEVADA LOCATION IN A CONTESTED SEAT names the right sitting members
//      on Who Represents Me, with at least one formal act and its effect line
//      under each row, and the door to /ballot/nv.
//   2. A VACANT OR UNCONTESTED SEAT: Senate 1 and Assembly 9 read "District N
//      — no member on file yet"; Senate 17 (held, not contested) shows its
//      sitting member with no act block and no board.
//   3. THE DATA: every race lists exactly the county's names and parties;
//      every act names a measure on file, a Votes page on NELIS and a person
//      in one of the races; every incumbent is the member the resolver seats;
//      every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with no record gets "No formal act on file" and no file;
//      every contested seat's race prints every name with its party.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested
//      seats, each printing its race; no other Nevada legislative seat has
//      one, and the thirteen earlier states' boards are unchanged.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the thirteen earlier contested
//      cycles included, and every Nevada seat outside the races; the roster
//      outside its Nevada block, the resolver and the earlier states' data
//      are byte-identical; the worker moved one version and precaches nothing
//      new; no migration.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-nv-contested-cycle.mjs

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
const must = (c, m) => { if (!c) { console.error(`✗ nv contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js",
  "wi-ballot-2026.js", "fl-ballot-2026.js", "az-ballot-2026.js", "ny-ballot-2026.js", "tx-ballot-2026.js", "il-ballot-2026.js",
  "mn-ballot-2026.js", "co-ballot-2026.js"];
const BALLOTS = [...EARLIER, "nv-ballot-2026.js"];
const NELIS = "https://www.leg.state.nv.us/App/NELIS/REL/";
const CLARK = "https://www.clarkcountynv.gov/adobe/assets/urn:aaid:aem:1db09a57-4c1b-47e1-94d9-e7782c442571/original/as/officesup-26g.pdf";
const WASHOE = "https://www.washoecounty.gov/voters/files/Washoe%20General%20Sample%20Ballot%20Booklet%20English.pdf";

// Every candidate on the November 3, 2026 general-election ballot in each
// contested seat, as the county election office lists them (Clark County's
// contest list; Washoe County's sample ballot for Assembly 25).
const FILED = {
  "nv-statesenate-8": [["Marilyn Dondero Loop", "D"], ["George E. Harris", "R"]],
  "nv-statesenate-9": [["Melanie Scheible", "D"], ["Maria Thompson", "R"]],
  "nv-statesenate-12": [["Julie Ann Pazina", "D"], ["Rafael Arroyo", "R"]],
  "nv-statehouse-4": [["Lisa Cole", "R"], ["Eileen Eady", "D"]],
  "nv-statehouse-21": [["Elaine Marzola", "D"], ["Patsy A. Carvalho", "R"], ["Tighe Galvin", "Libertarian"]],
  "nv-statehouse-25": [["Selena La Rue Hatch", "D"], ["Michael A. Ginsburg", "R"]],
  "nv-statehouse-35": [["Rebecca Edgeworth", "R"], ["Joe Spica", "D"]],
  "nv-statehouse-37": [["Shea M. Backus", "D"], ["Jill M. Douglass", "R"]],
};

const N = (() => { const w = {}; w.window = w; vm.runInContext(R("nv-ballot-2026.js"), vm.createContext(w)); return w.PDXNvBallot; })();
must(N && N.RACES && N.RACES.length >= 4, "nv-ballot-2026.js published no races");
const at = (city, county, cd, sd, ad) => ({ state: "Nevada", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: ad, mapSelected: true });
// The real card, with all fourteen ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootNV = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };
const headCard = (loc) => {
  const W = boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": HEAD("cmp-data.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), W, { filename: f + "@HEAD" });
  return band(W);
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a Nevada location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Southwest Las Vegas Valley: Senate 9 and Assembly 35, both contested.
  const W = bootNV(at("Las Vegas", "Clark County", "3", "9", "35"));
  eq(levelOf(W, "statesenate").pid, "scheible_nv", "SD 9: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "edgeworth_nv", "AD 35: the sitting Assembly member");
  const out = band(W);
  has(out, "Melanie Scheible", "SD 9: the senator is on the card");
  has(out, "Rebecca Edgeworth", "AD 35: the Assembly member is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["scheible_nv", "edgeworth_nv"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxnv-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, esc(first.effect), `${pid}: the newest act's effect line is under the row`);
    has(b, NELIS, `${pid}: the act links to the Legislature's own site`);
    has(b, 'href="/ballot/nv"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 9 — no member on file yet", "SD 9 is named");
  lacks(out, "District 35 — no member on file yet", "AD 35 is named");
  // Every contested seat, one at a time.
  for (const r of N.RACES) {
    const inc = r.field.find((c) => c.incumbent);
    const loc = r.chamber === "statesenate" ? at("", "", "1", String(r.district), "9") : at("", "", "1", "1", String(r.district));
    const Wr = bootNV(loc);
    eq(levelOf(Wr, r.chamber).pid, inc.pid, `${r.seat}: the sitting member`);
    const b = actBlocks(band(Wr)).find((x) => x.indexOf(`data-pdxnv-pid="${inc.pid}"`) >= 0) || "";
    has(b, esc(N.actsFor(inc.pid)[0].effect), `${r.seat}: an effect line under the row`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Senate 1 and Assembly 9: nobody on the roster claims either.
  const loc = at("Las Vegas", "Clark County", "1", "1", "9");
  const W = bootNV(loc);
  eq(levelOf(W, "statesenate").pid, null, "SD 1: no member is named");
  eq(levelOf(W, "statehouse").pid, null, "AD 9: no member is named");
  const out = band(W);
  has(out, "District 1 — no member on file yet", "SD 1: the row says nobody is on file");
  has(out, "District 9 — no member on file yet", "AD 9: the row says nobody is on file");
  eq(actBlocks(out).length, 0, "an empty seat carries no act block");
  eq(out, headCard(loc), "SD 1 / AD 9: the card is HEAD's");
  // Senate 17: held, and not one of the races.
  const loc2 = at("Minden", "Douglas County", "2", "17", "9");
  const W2 = bootNV(loc2);
  eq(levelOf(W2, "statesenate").pid, "robin_titus", "SD 17: the sitting member");
  const out2 = band(W2);
  has(out2, "Robin Titus", "SD 17: the sitting member is on the card");
  eq(actBlocks(out2).length, 0, "an uncontested seat carries no act block");
  eq(out2, headCard(loc2), "SD 17: the card is HEAD's");
  const V = voice();
  for (const s of ["nv-statesenate-17", "nv-statesenate-1", "nv-statesenate-2", "nv-statehouse-9", "nv-statehouse-2", "nv-statehouse-1"]) {
    eq(V.boardPath(s), "", `${s}: no board`);
  }
  ok(!N.race("statesenate", 17), "SD 17 is not one of the races on file");
  const page = W.PDXNvBallot.pageHtml({ located: true, state: "Nevada", levels: [
    { key: "statesenate", district: "17", pid: "robin_titus" }, { key: "statehouse", district: "9", pid: null },
    { key: "statesenate", district: "1", pid: null }] });
  has(page, "District 9 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Robin Titus", "ballot view: an uncontested seat shows its sitting member");
  has(page, "State Assembly District 9", "ballot view: the lower chamber is called the Assembly");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a seat with no race says so");
  has(page, "this Nevada Senate seat is elected in 2028", "ballot view: a Senate seat not up this year says so");
  lacks(page, "pdxpa-board", "ballot view: no board door for a seat with no race");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: names, acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootNV(at("Las Vegas", "Clark County", "1", "1", "9"));
const RO = W0.CMP_DATA;
{
  eq(JSON.stringify(N.RACES.map((r) => r.seat).sort()), JSON.stringify(Object.keys(FILED).sort()), "the races are exactly the filed seats");
  const inRace = new Set();
  for (const r of N.RACES) {
    ok(r.seat === `nv-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(N.onBallot2026(r.chamber, r.district), `${r.seat}: on the 2026 ballot`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    eq(r.filed, r.seat === "nv-statehouse-25" ? WASHOE : CLARK, `${r.seat}: the county's official list`);
    eq(JSON.stringify(r.field.map((c) => [c.name, c.party])), JSON.stringify(FILED[r.seat] || []), `${r.seat}: every name and party on the ballot`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Nevada", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    for (const c of r.field) {
      ok(/^(?:D|R|Libertarian)$/.test(c.party), `${r.seat} ${c.name}: party`);
      if (!c.pid) {
        ok(!c.key, `${c.name}: no challenger here has a record`);
        eq(N.actsFor(c.name).length, 0, `${c.name}: a challenger with no record has no acts`);
        ok(!Object.values(RO).some((row) => row && row.state === "Nevada" && row.name === c.name), `${c.name}: given a roster row`);
        continue;
      }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Nevada", `${c.pid}: a Nevada roster record`);
      const last = c.name.split(" ").pop();
      ok(RO[c.pid] && RO[c.pid].name.indexOf(last) >= 0, `${c.pid}: the roster name is the race's`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  // Marilyn Dondero Loop's roster row is HEAD's, untouched.
  const HR = (() => { const w = {}; w.window = w; vm.runInContext(HEAD("cmp-data.js"), vm.createContext(w)); return w.CMP_DATA; })();
  eq(JSON.stringify(RO.marilyn_dondero_loop), JSON.stringify(HR.marilyn_dondero_loop), "SD 8: the existing roster row did not move");
  for (const [m, what, date, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^(Assembly|Senate) final passage$/.test(what), `act ${m}: the action names its chamber`);
    const senate = /^Senate/.test(what);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (excused and not voting are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || "");
      if (senate) ok(office === "Nevada State Senator", `act ${m}: ${who} voted in the Senate`);
      else ok(office === "Nevada State Assembly Member", `act ${m}: ${who} voted in the Assembly`);
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
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Approved [A-Z][a-z]+\.? \d{1,2}, 20\d\d \(Chapter \d+\)$/.test(m.act), `${k}: a law reads as done and names its chapter`);
    else ok(false, `${k}: unknown status ${m.status}`);
    ok(/^https:\/\/www\.leg\.state\.nv\.us\/App\/NELIS\/REL\/(?:83rd2025|36th2025Special)\/Bill\/\d+\/Overview$/.test(m.source), `${k}: the bill's Overview page on NELIS`);
    eq(m.votes, m.source.replace(/\/Overview$/, "/Votes"), `${k}: the bill's Votes page on NELIS`);
    ok(String(m.from || "").indexOf("Title:") === 0, `${k}: the line names the bill title it was written from`);
  }
  for (const who of inRace) {
    const d = N.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
    for (const a of N.actsFor(who)) ok(/\/Votes$/.test(a.source), `${who} ${a.measure}: the act links its Votes page`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootNV(at("Las Vegas", "Clark County", "3", "9", "35"));
  W.PDXVoice = voice();
  const page = W.PDXNvBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxnv-seat="nv-statesenate-9"', "the Senate race is on the page");
  has(page, 'data-pdxnv-seat="nv-statehouse-35"', "the Assembly race is on the page");
  has(page, "State Assembly District 35", "the lower chamber is called the Assembly");
  for (const c of [...N.race("statesenate", 9).field, ...N.race("statehouse", 35).field]) {
    has(page, esc(c.name), `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      for (const a of N.actsFor(c.pid)) has(page, esc(a.effect), `${c.name}: ${a.measure}'s effect line`);
    }
  }
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  for (const nm of ["Maria Thompson", "Joe Spica"]) {
    const own = (page.split(`data-pdxnv-cand="${nm}"`)[1] || "").split('<li class="pdxpa-cand"')[0];
    ok(own.length > 0, `${nm}: listed`);
    lacks(own, 'href="/p/', `${nm}: no file`);
    has(own, "No formal act on file.", `${nm}: no formal act on file`);
  }
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/nv-sd-9"', "the Senate seat's board is linked");
  has(page, 'href="/district/nv-hd-35"', "the Assembly seat's board is linked");
  // Every contested seat's race prints every name with its party.
  for (const r of N.RACES) {
    const h = N.raceHtml(r);
    for (const c of r.field) {
      has(h, `${esc(c.name)}${c.pid ? "</a>" : "</span>"} <span class="pdxpa-party">(${c.party})</span>`, `${r.seat}: ${c.name} and party`);
    }
    has(h, `href="${esc(r.filed)}"`, `${r.seat}: the official list is linked`);
  }
  has(N.raceHtml(N.race("statehouse", 21)), "(Libertarian)", "a third-party name keeps its party");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/nv"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/nv", "/ballot/nv/", "/ballot/nv.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-nv.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-nv.html")), "ballot-nv.html is on disk");
  const doc = R("ballot-nv.html");
  has(doc, 'id="pdx-nv-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/nv-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "North Carolina", "Michigan", "Ohio", "Wisconsin", "Florida", "Arizona", "New York", "Texas", "Illinois", "Minnesota", "Colorado"]) {
    lacks(doc, st, `the Nevada ballot document says nothing about ${st}`);
  }
  const idx = R("index.html");
  ok(idx.indexOf('src="/nv-ballot-2026.js"') >= 0 && idx.indexOf('src="/nv-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads nv-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const nvLeg = Object.keys(routes).filter((k) => /^nv-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(nvLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Nevada seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co|nv)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const HVR = (() => { const w = {}; w.window = w; vm.runInContext(HEAD("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  for (const k of Object.keys(HVR)) eq(routes[k], HVR[k], `${k}: an earlier board moved`);
  const CONTESTED = contestedSeats();
  for (const k of Object.keys(routes)) if (!HVR[k]) ok(CONTESTED.has(k), `${k}: a board with no race behind it`);
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `nv-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, false, `${alias}: read-only`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxnv-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/nv"', `${doc}: links the Nevada ballot view`);
    has(h, `<h1 class="pdxdb-h1">Nevada ${r.chamber === "statesenate" ? "Senate" : "Assembly"} District ${r.district}</h1>`, `${doc}: names its chamber`);
    for (const c of r.field) has(h, esc(c.name), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, esc(N.actsFor(inc.pid)[0].effect), `${doc}: prints an effect line`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-nv-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no Nevada legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!nv-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxnv-seat=") >= 0) ok(false, `${f}: a board outside the races carries a Nevada race block`);
  }
  for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
    lacks(R(f), "nv-hd-", `${f}: no Nevada composer row`);
    lacks(R(f), "nv-sd-", `${f}: no Nevada composer row`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co)-(?:hd|sd)-\d+\.html$/.test(f))) ok(settled(f), `${f}: moved`);
  for (const f of readdirSync(ROOT).filter((f) => /^district-nv-(?:cd-\d+|us-senate-.*)\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(settled("cmp-data.js"), "cmp-data.js: HEAD's bytes outside the one Nevada shell block");
  for (const f of ["voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html",
    "ballot-nc.html", "ballot-mi.html", "ballot-oh.html", "ballot-wi.html", "ballot-fl.html", "ballot-az.html",
    "ballot-ny.html", "ballot-tx.html", "ballot-il.html", "ballot-mn.html", "ballot-co.html"]) {
    eq(R(f), HEAD(f), `${f}: byte-identical to HEAD`);
  }
  for (const f of readdirSync(join(ROOT, "db")).filter((f) => /^roster-/.test(f))) eq(R(`db/${f}`), HEAD(`db/${f}`), `db/${f}: byte-identical to HEAD`);
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  ok(ver(R("sw.js")) === ver(HEAD("sw.js")) + 1 || R("sw.js") === HEAD("sw.js"), "sw.js: CACHE_VERSION moved exactly one step, or the worker was not touched");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null, `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's roster and HEAD's thirteen earlier ballot files,
  // against today's with all fourteen.
  const now = bootNV({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": HEAD("cmp-data.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in the thirteen earlier states, read off their files,
  // so their act rows are compared too.
  const NAMES = { pa: "Pennsylvania", ga: "Georgia", nc: "North Carolina", mi: "Michigan", oh: "Ohio", wi: "Wisconsin",
    fl: "Florida", az: "Arizona", ny: "New York", tx: "Texas", il: "Illinois", mn: "Minnesota", co: "Colorado" };
  const SEATS = {};
  for (const f of EARLIER) {
    const code = f.slice(0, 2);
    const w = {}; w.window = w; vm.runInContext(R(f), vm.createContext(w));
    const M = w[`PDX${code[0].toUpperCase()}${code[1]}Ballot`];
    SEATS[NAMES[code]] = [...new Set(M.RACES.map((r) => String(r.district)))];
  }
  eq(Object.keys(SEATS).length, 13, "fixture: the thirteen earlier contested states");
  const cmp = (st, sd, hd) => {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `${st} seat ${sd}/${hd}: the card changed`);
  };
  for (const st of STATES) for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) cmp(st, d, d);
  // Nevada itself: every seat outside the races reads as HEAD's card did.
  for (const [sd, ad] of [["1", "1"], ["17", "9"], ["2", "2"], ["10", "16"], ["21", "40"], ["13", "42"]]) cmp("Nevada", sd, ad);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["nv-ballot-2026.js", "ballot-nv.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["cmp-data.js", "who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "sw.js", "scripts/gen-district-boards.mjs", "netlify/functions/district-board.mts"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-nv-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} nv contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
