#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-il-contested-cycle.mjs — Illinois, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// il-ballot-2026.js holds the State Senate and State House races on
// Illinois's November 3, 2026 ballot that Illinois reporting names as
// competitive with a sitting member running, every name the State Board of
// Elections lists for each, and the formal acts on file for the people in
// them, each a recorded floor vote read from the roll call the General
// Assembly publishes on ilga.gov and linked to it. Every member it names is an
// existing thin shell; the roster does not move.
//
// What it pins:
//
//   1. AN ILLINOIS LOCATION IN A CONTESTED SEAT names the right sitting
//      members on Who Represents Me, with at least one formal act and its
//      effect line under the row, and the door to /ballot/il.
//   2. A VACANT OR UNCONTESTED SEAT: House 8 reads "District 8 — no member on
//      file yet"; Senate 2 (held, on the ballot, not one of the races) shows
//      its sitting member with no act block and no board; Senate 4 is
//      elected in 2028.
//   3. THE DATA: every act names a measure on file, a roll call on ilga.gov
//      and a person in one of the races; every incumbent is the member the
//      resolver seats; every race lists exactly the names the State Board of
//      Elections lists; every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with a record (Nabeela Syed) gets acts and a file; one with
//      no record gets "No formal act on file" and no file.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested
//      seats, each printing its race; no other Illinois legislative seat has
//      one, and the ten earlier states' boards are byte-identical.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the ten earlier contested
//      cycles included, and every Illinois seat outside the races; the
//      roster, resolver, shells and the earlier states' data are
//      byte-identical; the worker moved one version and precaches nothing
//      new; no migration.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-il-contested-cycle.mjs

import { R, HEAD, boot, levelOf, band, settled, DECLARED_MIGRATIONS } from "./state-leg-harness.mjs";
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
const must = (c, m) => { if (!c) { console.error(`✗ il contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js",
  "wi-ballot-2026.js", "fl-ballot-2026.js", "az-ballot-2026.js", "ny-ballot-2026.js", "tx-ballot-2026.js"];
const BALLOTS = [...EARLIER, "il-ballot-2026.js"];
const ROLL = "https://www.ilga.gov/Documents/legislation/votehistory/104/";
const BILL = "https://www.ilga.gov/Legislation/BillStatus?DocTypeID=";
const SBE = "https://www.elections.il.gov/ElectionOperations/CandidateFilingSearch.aspx?ID=sejIrI%2bQmww%3d";
// Every name the State Board of Elections lists as active for each contested
// seat on the November 3, 2026 ballot.
const CERTIFIED = {
  "il-statesenate-24": [["Seth Lewis", "R"], ["Benjamin “Ben” McAdams", "D"]],
  "il-statesenate-26": [["Darby A. Hills", "R"], ["Nabeela Syed", "D"]],
  "il-statesenate-36": [["Michael W. Halpin", "D"], ["Brad Beekman", "R"]],
  "il-statesenate-48": [["Doris Turner", "D"], ["Frank Lesko", "R"]],
  "il-statesenate-56": [["Erica Harriss", "R"], ["Marsia Geldert-Murphey", "D"]],
  "il-statesenate-57": [["Christopher Belt", "D"], ["Daniel Rhyne", "R"]],
  "il-statehouse-52": [["Martin McLaughlin", "R"], ["Maria Peterson", "D"]],
  "il-statehouse-65": [["Daniel J. Ugaste", "R"], ["Ricky Rivard", "D"]],
  "il-statehouse-70": [["Jeff Keicher", "R"], ["Veronica Garcia-Martinez", "D"]],
  "il-statehouse-76": [["Amy Briel", "D"], ["Liz Bishop", "R"]],
  "il-statehouse-97": [["Jessica Dixon Heitman", "D"], ["Gabby Shanahan", "R"]],
  "il-statehouse-104": [["Brandun Schweizer", "R"], ["Mary Catherine Roberson", "D"]],
  "il-statehouse-112": [["Katie Stuart", "D"], ["Jimmy Ford", "R"]],
  "il-statehouse-114": [["Kevin Schmidt", "R"], ["George McClellan Jr.", "D"]],
};
// Members seated after the General Assembly last met, so no act is on file.
const NO_ACT_YET = new Set(["heitman_il"]);

const at = (city, county, cd, sd, ad) => ({ state: "Illinois", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: ad, mapSelected: true });
// The real card, with all nine ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootIL = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const N = (() => { const w = {}; w.window = w; vm.runInContext(R("il-ballot-2026.js"), vm.createContext(w)); return w.PDXIlBallot; })();
must(N && N.RACES && N.RACES.length >= 4, "il-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · an Illinois location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Barrington: Senate 26 and House 52, both contested.
  const W = bootIL(at("Barrington", "Lake County", "8", "26", "52"));
  eq(levelOf(W, "statesenate").pid, "hills_il", "SD 26: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "mclaughlin_il", "HD 52: the sitting representative");
  const out = band(W);
  has(out, "Darby A. Hills", "SD 26: the senator is on the card");
  has(out, "Martin McLaughlin", "HD 52: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const [pid, chamber] of [["hills_il", "senate"], ["mclaughlin_il", "house"]]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxil-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, ROLL + chamber + "/", `${pid}: the act links to its chamber's roll call on ilga.gov`);
    has(b, 'href="/ballot/il"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 26 — no member on file yet", "SD 26 is named");
  lacks(out, "District 52 — no member on file yet", "HD 52 is named");
  // House 97: the sitting member was appointed after the House last met.
  const W97 = bootIL(at("Plainfield", "Will County", "11", "48", "97"));
  eq(levelOf(W97, "statehouse").pid, "heitman_il", "HD 97: the sitting representative");
  eq(N.actsFor("heitman_il").length, 0, "HD 97: appointed after the House last met, so no act is on file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const loc = at("Chicago", "Cook County", "7", "2", "8");
  const W = bootIL(loc);
  eq(levelOf(W, "statehouse").pid, null, "HD 8: no member is named");
  eq(levelOf(W, "statesenate").pid, "aquino_il", "SD 2: the sitting member");
  const out = band(W);
  has(out, "District 8 — no member on file yet", "HD 8: the row says nobody is on file");
  has(out, "Omar Aquino", "SD 2: the sitting member is on the card");
  eq(actBlocks(out).length, 0, "an empty or uncontested seat carries no act block");
  eq(out, band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") })), "SD 2 / HD 8: the card is HEAD's");
  const V = voice();
  for (const s of ["il-statesenate-2", "il-statesenate-4", "il-statehouse-8", "il-statesenate-33", "il-statehouse-47", "il-statehouse-51", "il-statehouse-118", "il-statehouse-48"]) {
    eq(V.boardPath(s), "", `${s}: no board`);
  }
  ok(!N.race("statesenate", 2), "SD 2 is not one of the races on file");
  const page = W.PDXIlBallot.pageHtml({ located: true, state: "Illinois", levels: [
    { key: "statesenate", district: "2", pid: "aquino_il" }, { key: "statehouse", district: "8", pid: null }] });
  has(page, "District 8 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Omar Aquino", "ballot view: an uncontested seat shows its sitting member");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a seat with no race says so");
  lacks(page, "pdxpa-board", "ballot view: no board door for a seat with no race");
  const p4 = W.PDXIlBallot.pageHtml({ located: true, state: "Illinois", levels: [{ key: "statesenate", district: "4", pid: "kimberly_lightford" }] });
  has(p4, "this Illinois Senate seat is elected in 2028", "ballot view: a Senate seat not up in 2026 says so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats, filed fields and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootIL(at("Chicago", "Cook County", "7", "2", "8"));
const RO = W0.CMP_DATA;
{
  const inRace = new Set();
  eq(JSON.stringify(N.RACES.map((r) => r.seat).sort()), JSON.stringify(Object.keys(CERTIFIED).sort()), "the races are the filed list's seats");
  for (const r of N.RACES) {
    ok(r.seat === `il-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    eq(r.filed, SBE, `${r.seat}: links the State Board of Elections list`);
    eq(JSON.stringify(r.field.map((c) => [c.name, c.party])), JSON.stringify(CERTIFIED[r.seat]), `${r.seat}: every filed name, and no other`);
    if (r.chamber === "statesenate") ok(N.onBallot2026("statesenate", r.district), `${r.seat}: a Senate seat on the 2026 ballot`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Illinois", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    for (const c of r.field) {
      ok(/^[RDGLI]$/.test(c.party), `${r.seat} ${c.name}: party`);
      if (!c.pid) { ok(!c.key && N.actsFor(c.name).length === 0, `${c.name}: a challenger with no record has no acts`); continue; }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Illinois", `${c.pid}: an Illinois roster record`);
      eq(RO[c.pid] && RO[c.pid].name, c.name, `${c.pid}: the roster name is the race's`);
      if (!NO_ACT_YET.has(c.pid)) ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, path, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^(House|Senate) /.test(what), `act ${m}: the action names its chamber`);
    const senate = /^Senate/.test(what);
    const mm = /^(house|senate)\/10400(HB|SB)0*(\d+)(?:[hs]am\d{3})?_(\d\d)(\d\d)(\d{4})_\d{6}[TC]\.pdf$/.exec(path);
    if (!ok(!!mm, `act ${m}: a roll call path (${path})`)) continue;
    eq(mm[1], senate ? "senate" : "house", `act ${m}: the roll call is the action's chamber`);
    eq(`${mm[2]} ${mm[3]}`, m, `act ${m}: the roll call is the measure's`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (excused and not voting are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || "");
      ok(senate ? /Senator$/.test(office) : /Representative$/.test(office), `act ${m}: ${who} voted in the ${senate ? "Senate" : "House"}`);
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
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Signed (?:with item and reduction vetoes )?[A-Z][a-z]+\.? \d{1,2}, 20\d\d \(Public Act 104-\d{4}\)$/.test(m.act), `${k}: a law reads as done and names its Public Act`);
    else ok(false, `${k}: unknown status ${m.status}`);
    const [t, n] = k.split(" ");
    eq(m.source, `${BILL}${t}&DocNum=${n}&GAID=18&SessionID=114`, `${k}: the bill status page on ilga.gov`);
    ok(String(m.from || "").indexOf("Synopsis:") === 0, `${k}: the line names the synopsis it was written from`);
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
  const W = bootIL(at("Barrington", "Lake County", "8", "26", "52"));
  W.PDXVoice = voice();
  const page = W.PDXIlBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxil-seat="il-statesenate-26"', "the Senate race is on the page");
  has(page, 'data-pdxil-seat="il-statehouse-52"', "the House race is on the page");
  has(page, "State House District 52", "the lower chamber is called the House");
  const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  for (const c of [...N.race("statesenate", 26).field, ...N.race("statehouse", 52).field]) {
    has(page, `>${esc(c.name)}</`, `${c.name} is named`);
    has(page, `(${c.party})`, `${c.name}: party`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      for (const a of N.actsFor(c.pid)) has(page, a.effect, `${c.name}: ${a.measure}'s effect line`);
    }
  }
  const sOwn = (page.split('data-pdxil-cand="syed_il"')[1] || "").split('<li class="pdxpa-cand"')[0];
  has(sOwn, "Challenger", "Nabeela Syed: a challenger");
  has(sOwn, "Nabeela Syed’s file", "Nabeela Syed: her file is linked");
  has(sOwn, N.MEASURES["HB 111"].effect, "Nabeela Syed: her House acts are listed");
  for (const r of N.RACES) {
    const html = N.raceHtml(r);
    for (const c of r.field) {
      const li = (html.split('<li class="pdxpa-cand"').slice(1).find((x) => x.indexOf(`>${esc(c.name)}</`) >= 0)) || "";
      ok(li.length > 0, `${r.seat} ${c.name}: listed`);
      has(li, `(${c.party})`, `${r.seat} ${c.name}: party`);
      if (!c.pid) {
        has(li, "No formal act on file.", `${r.seat} ${c.name}: no formal act on file`);
        lacks(li, 'href="/p/', `${r.seat} ${c.name}: no file`);
      }
    }
    has(html, `href="${esc(SBE)}"`, `${r.seat}: the official list is linked`);
  }
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/il-sd-26"', "the Senate seat's board is linked");
  has(page, 'href="/district/il-hd-52"', "the House seat's board is linked");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/il"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/il", "/ballot/il/", "/ballot/il.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-il.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-il.html")), "ballot-il.html is on disk");
  const doc = R("ballot-il.html");
  has(doc, 'id="pdx-il-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/il-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "North Carolina", "Michigan", "Ohio", "Wisconsin", "Florida", "Arizona", "New York", "Texas", "State Assembly"]) lacks(doc, st, `the Illinois ballot document says nothing about ${st}`);
  const idx = R("index.html");
  ok(idx.indexOf('src="/il-ballot-2026.js"') >= 0 && idx.indexOf('src="/il-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads il-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const ilLeg = Object.keys(routes).filter((k) => /^il-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(ilLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Illinois seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co|nv|ca|wa)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const HV = (() => { const w = {}; w.window = w; vm.runInContext(HEAD("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  for (const k of Object.keys(HV)) eq(routes[k], HV[k], `${k}: an earlier board moved`);
  const CONTESTED = contestedSeats();
  for (const k of Object.keys(routes)) if (!HV[k]) ok(CONTESTED.has(k), `${k}: a board with no race behind it`);
  for (const r of N.RACES) ok(!!routes[r.seat], `${r.seat}: the contested Illinois seat has a board`);
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `il-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    // The contested-boards voice pass opened the composer and the poll here,
    // behind the gate every voiced board shares.
    eq((B.board(alias) || {}).composer, true, `${alias}: takes a voice`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxil-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/il"', `${doc}: links the Illinois ballot view`);
    has(h, `<h1 class="pdxdb-h1">Illinois ${r.chamber === "statesenate" ? "Senate" : "House"} District ${r.district}</h1>`, `${doc}: names its chamber`);
    for (const c of r.field) has(h, c.name.replace(/'/g, "&#39;").replace(/"/g, "&quot;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    const first = N.actsFor(inc.pid)[0];
    if (first) has(h, first.effect, `${doc}: prints an effect line`);
    else has(h, "No formal act on file.", `${doc}: says the sitting member has no act on file`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-il-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no Illinois legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!il-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxil-seat=") >= 0) ok(false, `${f}: a board outside the races carries an Illinois race block`);
  }
  // Exactly the contested seats are on the composer's three lists (the
  // contested-boards voice pass), and no other Illinois legislative seat.
  {
    const want = N.RACES.map((r) => `il-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`).sort();
    for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
      const got = [...new Set([...R(f).matchAll(/["'](il-(?:hd|sd)-\d+)["']/g)].map((x) => x[1]))].sort();
      eq(JSON.stringify(got), JSON.stringify(want), `${f}: exactly the contested Illinois seats take a voice`);
    }
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi|oh|wi|fl|az|ny|tx)-(?:hd|sd)-\d+\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  for (const f of readdirSync(ROOT).filter((f) => /^district-il-(?:cd-\d+|us-senate-.*)\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html",
    "ballot-nc.html", "ballot-mi.html", "ballot-oh.html", "ballot-wi.html", "ballot-fl.html", "ballot-az.html",
    "ballot-ny.html", "ballot-tx.html"]) {
    ok(settled(f), `${f}: byte-identical to HEAD`);
  }
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  eq(ver(R("sw.js")), ver(HEAD("sw.js")) + 1, "sw.js: CACHE_VERSION moved exactly one step");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null || DECLARED_MIGRATIONS.includes(f), `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's ten earlier ballot files, against today's with all eleven.
  const now = bootIL({ state: "Utah" });
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
    Arizona: ["2", "4", "9", "23", "5", "13"],
    "New York": ["38", "39", "43", "44", "21", "46", "97", "107", "143", "12"],
    Texas: ["9", "19", "21", "34", "37", "52", "61", "67", "70", "74", "108", "112", "121", "138", "1"] };
  const cmp = (st, sd, hd) => {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `${st} seat ${sd}/${hd}: the card changed`);
  };
  for (const st of STATES) for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) cmp(st, d, d);
  // Illinois itself: every seat outside the races reads as HEAD's card did.
  for (const [sd, hd] of [["1", "1"], ["2", "8"], ["4", "7"], ["33", "47"], ["39", "118"], ["59", "50"]]) cmp("Illinois", sd, hd);
  // House 51: its sitting member is the Senate 26 challenger, so her newest
  // act is under her row, as for every sitting member in one of the races.
  now._currentVoterLocation = { state: "Illinois", city: "", county: "", district: "1", stateSenateDistrict: "59", stateHouseDistrict: "51", mapSelected: true };
  const c51 = band(now);
  has(c51, 'data-pdxil-pid="syed_il"', "HD 51: the sitting member's act block is under her row");
  has(c51, N.actsFor("syed_il")[0].effect, "HD 51: her newest act's effect line");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["il-ballot-2026.js", "ballot-il.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-il-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} il contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
