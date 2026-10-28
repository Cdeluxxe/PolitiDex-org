#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-co-contested-cycle.mjs — Colorado, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// co-ballot-2026.js holds the contested State Senate and State House races on
// Colorado's November 3, 2026 ballot that Colorado reporting names with a
// sitting member running, every name the Secretary of State lists for each,
// and the formal acts on file for the people in them, each a recorded floor
// vote read from the vote record on leg.colorado.gov and linked to it.
// cmp-data.js gains one block of identity-only shells for the sitting members
// in those races and nothing else; the resolver and every other row stay put.
//
// What it pins:
//
//   1. A COLORADO LOCATION IN A CONTESTED SEAT names the right sitting members
//      on Who Represents Me, with at least one formal act and its effect line
//      under each row, and the door to /ballot/co.
//   2. A VACANT OR UNCONTESTED SEAT: Senate 31 and House 5 read "District N —
//      no member on file yet"; Senate 32 (held, not contested) shows its
//      sitting member with no act block and no board.
//   3. THE DATA: every race lists exactly the Secretary of State's names and
//      parties; every act names a measure on file, a vote record on the
//      General Assembly's own site and a person in one of the races; every
//      incumbent is the member the resolver seats; the one former member
//      running has his acts and no roster row; every effect line keeps
//      CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with no record gets "No formal act on file" and no file;
//      every contested seat's race prints every name with its party.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested
//      seats, each printing its race; no other Colorado legislative seat has
//      one, and the twelve earlier states' boards are unchanged.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the twelve earlier contested
//      cycles included, and every Colorado seat outside the races; the roster
//      outside its Colorado block, the resolver and the earlier states' data
//      are byte-identical; the worker moved one version and precaches nothing
//      new; no migration.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-co-contested-cycle.mjs

// Colorado was boarded whole since (test-four-state-deepen.mjs): this suite
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
const must = (c, m) => { if (!c) { console.error(`✗ co contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js",
  "wi-ballot-2026.js", "fl-ballot-2026.js", "az-ballot-2026.js", "ny-ballot-2026.js", "tx-ballot-2026.js", "il-ballot-2026.js",
  "mn-ballot-2026.js"];
const BALLOTS = [...EARLIER, "co-ballot-2026.js"];
const VOTE = "https://leg.colorado.gov/bill_votes/";
const BILL = "https://leg.colorado.gov/bills/";

// Every candidate on the November 3, 2026 general-election ballot in each
// contested seat, as the Secretary of State's official candidate list names
// them.
const FILED = {
  "co-statesenate-11": [["Tony Exum Sr", "D"], ["Levon Stilson", "R"], ["Janet Turner", "Libertarian"]],
  "co-statesenate-15": [["Janice Marchman", "D"], ["Rob Woodward", "R"]],
  "co-statesenate-21": [["Adrienne Benavidez", "D"], ["Frederick Alfred Jr", "R"]],
  "co-statesenate-30": [["John Carson", "R"], ["Kevin Leung", "D"]],
  "co-statehouse-19": [["Dan Woog", "R"], ["Jillaire McMillan", "D"]],
  "co-statehouse-25": [["Tammy Story", "D"], ["Mark Herzfeld", "R"]],
  "co-statehouse-33": [["Kenny Van Nguyen", "D"], ["Nate Jorgensen", "R"]],
  "co-statehouse-43": [["Robert “Bob” Marshall", "D"], ["Nate Marsh", "R"]],
  "co-statehouse-46": [["Tisha Mauro", "D"], ["Jonathan Post", "R"]],
  "co-statehouse-50": [["Ryan Gonzalez", "R"], ["Tommy Butler", "D"]],
  "co-statehouse-59": [["Katie Stewart", "D"], ["Naomi Riess", "R"]],
};

const N = (() => { const w = {}; w.window = w; vm.runInContext(R("co-ballot-2026.js"), vm.createContext(w)); return w.PDXCoBallot; })();
must(N && N.RACES && N.RACES.length >= 4, "co-ballot-2026.js published no races");
const at = (city, county, cd, sd, hd) => ({ state: "Colorado", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
// The real card, with all thirteen ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootCO = (loc, over) => {
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
section("1 · a Colorado location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Highlands Ranch: Senate 30 and House 43, both contested.
  const W = bootCO(at("Highlands Ranch", "Douglas County", "4", "30", "43"));
  eq(levelOf(W, "statesenate").pid, "carson_co", "SD 30: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "bob_marshall_co", "HD 43: the sitting representative");
  const out = band(W);
  has(out, "John Carson", "SD 30: the senator is on the card");
  has(out, "Bob Marshall", "HD 43: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["carson_co", "bob_marshall_co"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxco-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, esc(first.effect), `${pid}: the newest act's effect line is under the row`);
    has(b, VOTE, `${pid}: the act links to the General Assembly's own vote record`);
    has(b, 'href="/ballot/co"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 30 — no member on file yet", "SD 30 is named");
  lacks(out, "District 43 — no member on file yet", "HD 43 is named");
  // Every contested seat, one at a time.
  for (const r of N.RACES) {
    const inc = r.field.find((c) => c.incumbent);
    const loc = r.chamber === "statesenate" ? at("", "", "1", String(r.district), "5") : at("", "", "1", "31", String(r.district));
    const Wr = bootCO(loc);
    eq(levelOf(Wr, r.chamber).pid, inc.pid, `${r.seat}: the sitting member`);
    const b = actBlocks(band(Wr)).find((x) => x.indexOf(`data-pdxco-pid="${inc.pid}"`) >= 0) || "";
    has(b, esc(N.actsFor(inc.pid)[0].effect), `${r.seat}: an effect line under the row`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Denver: Senate 31 and House 5, which nobody on the roster claims.
  const loc = at("Denver", "Denver County", "1", "31", "5");
  const W = bootCO(loc);
  eq(levelOf(W, "statesenate").pid, null, "SD 31: no member is named");
  eq(levelOf(W, "statehouse").pid, null, "HD 5: no member is named");
  const out = band(W);
  has(out, "District 31 — no member on file yet", "SD 31: the row says nobody is on file");
  has(out, "District 5 — no member on file yet", "HD 5: the row says nobody is on file");
  eq(actBlocks(out).length, 0, "an empty seat carries no act block");
  eq(out, headCard(loc), "SD 31 / HD 5: the card is HEAD's");
  // Senate 32: held, and not one of the races.
  const loc2 = at("Denver", "Denver County", "1", "32", "5");
  const W2 = bootCO(loc2);
  eq(levelOf(W2, "statesenate").pid, "robert_rodriguez_co", "SD 32: the sitting member");
  const out2 = band(W2);
  has(out2, "Robert Rodriguez", "SD 32: the sitting member is on the card");
  eq(actBlocks(out2).length, 0, "an uncontested seat carries no act block");
  eq(out2, headCard(loc2), "SD 32: the card is HEAD's");
  // A seat outside the races has only the read-only board the whole-state
  // opening gave it — no composer, no race block.
  const V = voice();
  const BD = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const s of ["co-statesenate-32", "co-statesenate-31", "co-statesenate-6", "co-statesenate-3", "co-statehouse-5",
    "co-statehouse-16", "co-statehouse-51", "co-statehouse-1"]) {
    const alias = V.boardPath(s).replace("/district/", "");
    eq((BD.board(alias) || {}).composer, false, `${s}: a seat with no race takes a voice`);
    if (alias) lacks(R(`district-${alias}.html`), "data-pdxco-seat=", `${s}: a seat with no race prints a race`);
  }
  ok(!N.race("statesenate", 32), "SD 32 is not one of the races on file");
  const page = W.PDXCoBallot.pageHtml({ located: true, state: "Colorado", levels: [
    { key: "statesenate", district: "32", pid: "robert_rodriguez_co" }, { key: "statehouse", district: "5", pid: null },
    { key: "statesenate", district: "6", pid: "cleave_simpson" }] });
  has(page, "District 5 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Robert Rodriguez", "ballot view: an uncontested seat shows its sitting member");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a seat with no race says so");
  has(page, "this Colorado Senate seat is elected in 2028", "ballot view: a Senate seat not up this year says so");
  lacks(page, "pdxpa-board", "ballot view: no board door for a seat with no race");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: names, acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootCO(at("Denver", "Denver County", "1", "31", "5"));
const RO = W0.CMP_DATA;
{
  eq(JSON.stringify(N.RACES.map((r) => r.seat).sort()), JSON.stringify(Object.keys(FILED).sort()), "the races are exactly the filed seats");
  const inRace = new Set();
  for (const r of N.RACES) {
    ok(r.seat === `co-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(N.onBallot2026(r.chamber, r.district), `${r.seat}: on the 2026 ballot`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    eq(r.filed, "https://www.coloradosos.gov/pubs/elections/vote/generalCandidates.html", `${r.seat}: the Secretary of State's candidate list`);
    eq(JSON.stringify(r.field.map((c) => [c.name, c.party])), JSON.stringify(FILED[r.seat] || []), `${r.seat}: every name and party on the ballot`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Colorado", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    for (const c of r.field) {
      ok(/^(?:D|R|Libertarian)$/.test(c.party), `${r.seat} ${c.name}: party`);
      if (!c.pid) {
        ok(!Object.values(RO).some((row) => row && row.state === "Colorado" && row.name === c.name), `${c.name}: given a roster row`);
        if (!c.key) eq(N.actsFor(c.name).length, 0, `${c.name}: a challenger with no record has no acts`);
        continue;
      }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Colorado" && RO[c.pid].candidate === false, `${c.pid}: a Colorado roster record, in office`);
      const last = c.name.replace(/“[^”]*” /, "").replace(/ Sr$/, "").split(" ").pop();
      ok(RO[c.pid] && RO[c.pid].name.indexOf(last) >= 0, `${c.pid}: the roster name is the race's`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  // The one former member running: acts under his key, no file.
  const wood = N.race("statesenate", 15).field.find((c) => c.name === "Rob Woodward");
  eq(wood && wood.key, "@woodward", "Rob Woodward: acts are filed under his key");
  ok(N.actsFor("@woodward").length >= 1, "Rob Woodward: at least one formal act on file");
  for (const [m, what, date, id, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^(House|Senate) /.test(what), `act ${m}: the action names its chamber`);
    ok(/^\d+$/.test(id), `act ${m}: a vote record number on leg.colorado.gov`);
    const senate = /^Senate/.test(what);
    for (const who in votes) {
      ok(votes[who] === "Yes" || votes[who] === "No", `act ${m} ${who}: ${votes[who]} (excused and absent are not acts)`);
      if (who === "@woodward") { ok(senate, `act ${m}: Rob Woodward voted in the Senate`); continue; }
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || "");
      if (senate) ok(office === "Colorado State Senator", `act ${m}: ${who} voted in the Senate`);
      else ok(office === "Colorado State Representative", `act ${m}: ${who} voted in the House`);
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
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Signed [A-Z][a-z]+ \d{1,2}, 20\d\d$/.test(m.act), `${k}: a law reads as done and names its signing`);
    else ok(false, `${k}: unknown status ${m.status}`);
    eq(m.source, BILL + k, `${k}: the bill page on leg.colorado.gov`);
    ok(String(m.from || "").indexOf("Title:") === 0, `${k}: the line names the bill title it was written from`);
  }
  for (const who of [...inRace, "@woodward"]) {
    const d = N.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
    for (const a of N.actsFor(who)) ok(a.source.indexOf(VOTE) === 0, `${who} ${a.measure}: the act links its vote record`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootCO(at("Highlands Ranch", "Douglas County", "4", "30", "43"));
  W.PDXVoice = voice();
  const page = W.PDXCoBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxco-seat="co-statesenate-30"', "the Senate race is on the page");
  has(page, 'data-pdxco-seat="co-statehouse-43"', "the House race is on the page");
  has(page, "State House District 43", "the lower chamber is called the House");
  for (const c of [...N.race("statesenate", 30).field, ...N.race("statehouse", 43).field]) {
    has(page, esc(c.name), `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      for (const a of N.actsFor(c.pid)) has(page, esc(a.effect), `${c.name}: ${a.measure}'s effect line`);
    }
  }
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  for (const nm of ["Kevin Leung", "Nate Marsh"]) {
    const own = (page.split(`data-pdxco-cand="${nm}"`)[1] || "").split('<li class="pdxpa-cand"')[0];
    ok(own.length > 0, `${nm}: listed`);
    lacks(own, 'href="/p/', `${nm}: no file`);
    has(own, "No formal act on file.", `${nm}: no formal act on file`);
  }
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/co-sd-30"', "the Senate seat's board is linked");
  has(page, 'href="/district/co-hd-43"', "the House seat's board is linked");
  // The former member: his acts, and no file.
  const s15 = N.raceHtml(N.race("statesenate", 15));
  const wood = (s15.split('data-pdxco-cand="@woodward"')[1] || "").split('<li class="pdxpa-cand"')[0];
  ok(wood.length > 0, "SD 15: Rob Woodward is listed");
  has(wood, esc(N.MEASURES["HB22-1329"].effect), "SD 15: Rob Woodward's act and effect line");
  lacks(wood, 'href="/p/', "SD 15: Rob Woodward gets no file");
  lacks(wood, "No formal act on file", "SD 15: Rob Woodward has an act on file");
  // Every contested seat's race prints every name with its party.
  for (const r of N.RACES) {
    const h = N.raceHtml(r);
    for (const c of r.field) {
      has(h, `${esc(c.name)}${c.pid ? "</a>" : "</span>"} <span class="pdxpa-party">(${c.party})</span>`, `${r.seat}: ${c.name} and party`);
    }
    has(h, 'href="https://www.coloradosos.gov/pubs/elections/vote/generalCandidates.html"', `${r.seat}: the official list is linked`);
  }
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/co"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/co", "/ballot/co/", "/ballot/co.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-co.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-co.html")), "ballot-co.html is on disk");
  const doc = R("ballot-co.html");
  has(doc, 'id="pdx-co-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/co-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "North Carolina", "Michigan", "Ohio", "Wisconsin", "Florida", "Arizona", "New York", "Texas", "Illinois", "Minnesota"]) {
    lacks(doc, st, `the Colorado ballot document says nothing about ${st}`);
  }
  const idx = R("index.html");
  ok(idx.indexOf('src="/co-ballot-2026.js"') >= 0 && idx.indexOf('src="/co-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads co-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const coLeg = Object.keys(routes).filter((k) => /^co-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  for (const r of N.RACES) ok(coLeg.includes(r.seat), `BOARD_ROUTES: contested ${r.seat} has no board`);
  eq(coLeg.length, 100, "BOARD_ROUTES: every Colorado seat, now that the state is opened whole");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co|nv|ca|wa|ne|sd|id|mt|ak|ri|me|ms|vt|tn)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const HVR = (() => { const w = {}; w.window = w; vm.runInContext(HEAD("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  for (const k of Object.keys(HVR)) eq(routes[k], HVR[k], `${k}: an earlier board moved`);
  const CONTESTED = contestedSeats();
  for (const k of Object.keys(routes)) if (!HVR[k]) ok(CONTESTED.has(k), `${k}: a board with no race behind it`);
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `co-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    // The contested-boards voice pass opened the composer and the poll here,
    // behind the gate every voiced board shares.
    eq((B.board(alias) || {}).composer, true, `${alias}: takes a voice`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxco-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/co"', `${doc}: links the Colorado ballot view`);
    has(h, `<h1 class="pdxdb-h1">Colorado ${r.chamber === "statesenate" ? "Senate" : "House"} District ${r.district}</h1>`, `${doc}: names its seat`);
    for (const c of r.field) has(h, esc(c.name), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, esc(N.actsFor(inc.pid)[0].effect), `${doc}: prints an effect line`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-co-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, 100, "one Colorado legislative board document per seat");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!co-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxco-seat=") >= 0) ok(false, `${f}: a board outside the races carries a Colorado race block`);
  }
  // Exactly the contested seats are on the composer's three lists (the
  // contested-boards voice pass), and no other Colorado legislative seat.
  {
    const want = N.RACES.map((r) => `co-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`).sort();
    for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
      const got = [...new Set([...R(f).matchAll(/["'](co-(?:hd|sd)-\d+)["']/g)].map((x) => x[1]))].sort();
      eq(JSON.stringify(got), JSON.stringify(want), `${f}: exactly the contested Colorado seats take a voice`);
    }
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn)-(?:hd|sd)-\d+\.html$/.test(f))) ok(settled(f), `${f}: moved`);
  for (const f of readdirSync(ROOT).filter((f) => /^district-co-(?:cd-\d+|us-senate-.*)\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(settled("cmp-data.js"), "cmp-data.js: HEAD's bytes outside the one Colorado shell block");
  for (const f of ["voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html",
    "ballot-nc.html", "ballot-mi.html", "ballot-oh.html", "ballot-wi.html", "ballot-fl.html", "ballot-az.html",
    "ballot-ny.html", "ballot-tx.html", "ballot-il.html", "ballot-mn.html"]) {
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
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's roster and HEAD's twelve earlier ballot files,
  // against today's with all thirteen.
  const now = bootCO({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": withoutFourStateShells(HEAD("cmp-data.js")) });
  for (const f of EARLIER) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in the twelve earlier states, read off their files,
  // so their act rows are compared too. Minnesota's House seats are keyed by
  // the resolver's plain number, which RACES carries as `district`.
  const NAMES = { pa: "Pennsylvania", ga: "Georgia", nc: "North Carolina", mi: "Michigan", oh: "Ohio", wi: "Wisconsin",
    fl: "Florida", az: "Arizona", ny: "New York", tx: "Texas", il: "Illinois", mn: "Minnesota" };
  const SEATS = {};
  for (const f of EARLIER) {
    const code = f.slice(0, 2);
    const w = {}; w.window = w; vm.runInContext(R(f), vm.createContext(w));
    const M = w[`PDX${code[0].toUpperCase()}${code[1]}Ballot`];
    SEATS[NAMES[code]] = [...new Set(M.RACES.map((r) => String(r.district)))];
  }
  eq(Object.keys(SEATS).length, 12, "fixture: the twelve earlier contested states");
  const cmp = (st, sd, hd) => {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `${st} seat ${sd}/${hd}: the card changed`);
  };
  for (const st of STATES) for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) cmp(st, d, d);
  // Colorado itself: every seat outside the races reads as HEAD's card did.
  for (const [sd, hd] of [["1", "1"], ["31", "5"], ["32", "16"], ["6", "51"], ["3", "40"], ["35", "65"]]) cmp("Colorado", sd, hd);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["co-ballot-2026.js", "ballot-co.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["cmp-data.js", "who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "sw.js", "scripts/gen-district-boards.mjs", "netlify/functions/district-board.mts"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-co-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} co contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
