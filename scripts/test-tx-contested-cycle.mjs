#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-tx-contested-cycle.mjs — Texas, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// tx-ballot-2026.js holds the State Senate and State House races on Texas's
// November 3, 2026 ballot that Texas reporting names as competitive with a
// sitting member running, every name the Secretary of State certifies for
// each, and the formal acts on file for the people in them, each a recorded
// vote read from the House or Senate Journal and linked to it. Every
// incumbent is an existing thin shell; the roster does not move.
//
// What it pins:
//
//   1. A TEXAS LOCATION IN A CONTESTED SEAT names the right sitting members on
//      Who Represents Me, with at least one formal act and its effect line
//      under the row, and the door to /ballot/tx.
//   2. A VACANT OR UNCONTESTED SEAT: Senate 11 and House 93 read "District N —
//      no member on file yet"; Senate 1 (held, on the ballot, not one of the
//      races) shows its sitting member with no act block and no board; Senate
//      12 is elected in 2028.
//   3. THE DATA: every act names a measure on file, a journal page on the
//      Legislature's site and a person in one of the races; every incumbent is
//      the member the resolver seats; every race lists exactly the names the
//      Secretary of State certifies; every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with no record gets "No formal act on file" and no file.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested
//      seats, each printing its race; no other Texas legislative seat has one,
//      and the nine earlier states' boards are byte-identical.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the nine earlier contested
//      cycles included, and every Texas seat outside the races; the roster,
//      resolver, shells and the earlier states' data are byte-identical; the
//      worker moved one version and precaches nothing new; no migration.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-tx-contested-cycle.mjs

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
const must = (c, m) => { if (!c) { console.error(`✗ tx contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js",
  "wi-ballot-2026.js", "fl-ballot-2026.js", "az-ballot-2026.js", "ny-ballot-2026.js"];
const BALLOTS = [...EARLIER, "tx-ballot-2026.js"];
const SJ = "https://journals.senate.texas.gov/sjrnl/89r/html/";
const HJ = "https://journals.house.texas.gov/hjrnl/89r/html/";
const TLO = "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=";
const CERT = "https://www.sos.texas.gov/elections/forms/2026-ballot-cert.pdf";
// Every name the Secretary of State's 2026 Ballot Certification Report
// certifies for each contested seat (no certified write-in in any of them).
const CERTIFIED = {
  "tx-statesenate-9": [["Taylor Rehmet", "D"], ["Leigh Wambsganss", "R"]],
  "tx-statesenate-19": [["Roland Gutiérrez", "D"], ["Marcus Cardenas", "R"]],
  "tx-statesenate-21": [["Judith Zaffirini", "D"], ["Julie Dahlberg", "R"]],
  "tx-statehouse-34": [["Denise Villalobos", "R"], ["Stephanie Guerrero Sáenz", "D"]],
  "tx-statehouse-37": [["Janie Lopez", "R"], ["Oziel “Ozzie” Ochoa Jr.", "D"]],
  "tx-statehouse-52": [["Caroline Harris Davila", "R"], ["Chris Jimenez", "D"]],
  "tx-statehouse-61": [["Keresa Richardson", "R"], ["Brittany Black", "D"], ["Anissa Chilmeran", "G"]],
  "tx-statehouse-67": [["Jeff Leach", "R"], ["Jordan Wheatley", "D"]],
  "tx-statehouse-70": [["Mihaela Plesa", "D"], ["George Flint", "R"]],
  "tx-statehouse-74": [["Eddie Morales", "D"], ["Robert Garza", "R"]],
  "tx-statehouse-108": [["Morgan Meyer", "R"], ["Allison Mitchell", "D"]],
  "tx-statehouse-112": [["Angie Chen Button", "R"], ["Zach Herbert", "D"]],
  "tx-statehouse-121": [["Marc LaHood", "R"], ["Zack Dunn", "D"]],
  "tx-statehouse-138": [["Lacey Hull", "R"], ["Tyler Smith", "D"]],
};

const at = (city, county, cd, sd, ad) => ({ state: "Texas", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: ad, mapSelected: true });
// The real card, with all nine ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootTX = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const N = (() => { const w = {}; w.window = w; vm.runInContext(R("tx-ballot-2026.js"), vm.createContext(w)); return w.PDXTxBallot; })();
must(N && N.RACES && N.RACES.length >= 4, "tx-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a Texas location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Corpus Christi: House 34 is contested; Senate 21 is contested.
  const W = bootTX(at("Corpus Christi", "Nueces County", "27", "21", "34"));
  eq(levelOf(W, "statesenate").pid, "zaffirini_tx", "SD 21: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "villalobos_tx", "HD 34: the sitting representative");
  const out = band(W);
  has(out, "Judith Zaffirini", "SD 21: the senator is on the card");
  has(out, "Denise Villalobos", "HD 34: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const [pid, host] of [["zaffirini_tx", SJ], ["villalobos_tx", HJ]]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxtx-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, host, `${pid}: the act links to its chamber's journal`);
    has(b, 'href="/ballot/tx"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 21 — no member on file yet", "SD 21 is named");
  lacks(out, "District 34 — no member on file yet", "HD 34 is named");
  // Senate 9: the sitting senator has no recorded vote yet, so no act block.
  const W9 = bootTX(at("Fort Worth", "Tarrant County", "12", "9", "34"));
  eq(levelOf(W9, "statesenate").pid, "rehmet_tx", "SD 9: the sitting senator");
  eq(N.actsFor("rehmet_tx").length, 0, "SD 9: seated after the 89th Legislature last met, so no act is on file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const loc = at("Fort Worth", "Tarrant County", "12", "11", "93");
  const W = bootTX(loc);
  eq(levelOf(W, "statesenate").pid, null, "SD 11: no member is named");
  eq(levelOf(W, "statehouse").pid, null, "HD 93: no member is named");
  const out = band(W);
  has(out, "District 11 — no member on file yet", "SD 11: the row says nobody is on file");
  has(out, "District 93 — no member on file yet", "HD 93: the row says nobody is on file");
  eq(actBlocks(out).length, 0, "an empty seat carries no act block");
  eq(out, band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") })), "SD 11 / HD 93: the card is HEAD's");
  const loc2 = at("Tyler", "Smith County", "1", "1", "93");
  const W2 = bootTX(loc2);
  eq(levelOf(W2, "statesenate").pid, "bryan_hughes", "SD 1: the sitting member");
  const out2 = band(W2);
  has(out2, "Bryan Hughes", "SD 1: the sitting member is on the card");
  eq(actBlocks(out2).length, 0, "an uncontested seat carries no act block");
  eq(out2, band(boot(loc2, { "who-represents-me.js": HEAD("who-represents-me.js") })), "SD 1: the card is HEAD's");
  const V = voice();
  for (const s of ["tx-statesenate-1", "tx-statesenate-11", "tx-statesenate-12", "tx-statehouse-93", "tx-statehouse-118", "tx-statehouse-94", "tx-statehouse-41"]) {
    eq(V.boardPath(s), "", `${s}: no board`);
  }
  ok(!N.race("statesenate", 1), "SD 1 is not one of the races on file");
  const page = W.PDXTxBallot.pageHtml({ located: true, state: "Texas", levels: [
    { key: "statesenate", district: "1", pid: "bryan_hughes" }, { key: "statehouse", district: "93", pid: null }] });
  has(page, "District 93 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Bryan Hughes", "ballot view: an uncontested seat shows its sitting member");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a seat with no race says so");
  lacks(page, "pdxpa-board", "ballot view: no board door for a seat with no race");
  const p12 = W.PDXTxBallot.pageHtml({ located: true, state: "Texas", levels: [{ key: "statesenate", district: "12", pid: "parker_tx" }] });
  has(p12, "this Texas Senate seat is elected in 2028", "ballot view: a Senate seat not up in 2026 says so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats, certified fields and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootTX(at("Fort Worth", "Tarrant County", "12", "11", "93"));
const RO = W0.CMP_DATA;
{
  const inRace = new Set();
  eq(JSON.stringify(N.RACES.map((r) => r.seat).sort()), JSON.stringify(Object.keys(CERTIFIED).sort()), "the races are the certified list's seats");
  for (const r of N.RACES) {
    ok(r.seat === `tx-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    eq(r.filed, CERT, `${r.seat}: links the Secretary of State's certification`);
    eq(JSON.stringify(r.field.map((c) => [c.name, c.party])), JSON.stringify(CERTIFIED[r.seat]), `${r.seat}: every certified name, and no other`);
    if (r.chamber === "statesenate") ok(N.onBallot2026("statesenate", r.district), `${r.seat}: a Senate seat on the 2026 ballot`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Texas", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    for (const c of r.field) {
      ok(/^[RDGLI]$/.test(c.party), `${r.seat} ${c.name}: party`);
      if (!c.pid) { ok(!c.key && N.actsFor(c.name).length === 0, `${c.name}: a challenger with no record has no acts`); continue; }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Texas", `${c.pid}: a Texas roster record`);
      eq(RO[c.pid] && RO[c.pid].name, c.name, `${c.pid}: the roster name is the race's`);
      if (c.pid !== "rehmet_tx") ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, url, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^(House|Senate) /.test(what), `act ${m}: the action names its chamber`);
    const senate = /^Senate/.test(what);
    ok(url.indexOf(senate ? SJ : HJ) === 0 && /\.HTM$/.test(url), `act ${m}: links the ${senate ? "Senate" : "House"} Journal day`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (absent and present, not voting are not acts)`);
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
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Signed (?:with line-item vetoes )?[A-Z][a-z]+ \d{1,2}, 20\d\d$/.test(m.act), `${k}: a law reads as done and names its signing`);
    else ok(false, `${k}: unknown status ${m.status}`);
    eq(m.source, TLO + k.replace(" ", ""), `${k}: the bill history on capitol.texas.gov`);
    ok(String(m.from || "").indexOf("Caption:") === 0, `${k}: the line names the caption it was written from`);
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
  const W = bootTX(at("Corpus Christi", "Nueces County", "27", "21", "34"));
  W.PDXVoice = voice();
  const page = W.PDXTxBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxtx-seat="tx-statesenate-21"', "the Senate race is on the page");
  has(page, 'data-pdxtx-seat="tx-statehouse-34"', "the House race is on the page");
  has(page, "State House District 34", "the lower chamber is called the House");
  const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  for (const c of [...N.race("statesenate", 21).field, ...N.race("statehouse", 34).field]) {
    has(page, `>${esc(c.name)}</`, `${c.name} is named`);
    has(page, `(${c.party})`, `${c.name}: party`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      for (const a of N.actsFor(c.pid)) has(page, a.effect, `${c.name}: ${a.measure}'s effect line`);
    }
  }
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
    has(html, `href="${CERT}"`, `${r.seat}: the official list is linked`);
  }
  has(N.raceHtml(N.race("statehouse", 61)), "(G)", "a third-party name keeps its party");
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/tx-sd-21"', "the Senate seat's board is linked");
  has(page, 'href="/district/tx-hd-34"', "the House seat's board is linked");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/tx"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/tx", "/ballot/tx/", "/ballot/tx.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-tx.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-tx.html")), "ballot-tx.html is on disk");
  const doc = R("ballot-tx.html");
  has(doc, 'id="pdx-tx-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/tx-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "North Carolina", "Michigan", "Ohio", "Wisconsin", "Florida", "Arizona", "New York", "Assembly"]) lacks(doc, st, `the Texas ballot document says nothing about ${st}`);
  const idx = R("index.html");
  ok(idx.indexOf('src="/tx-ballot-2026.js"') >= 0 && idx.indexOf('src="/tx-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads tx-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const txLeg = Object.keys(routes).filter((k) => /^tx-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(txLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Texas seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co|nv|ca|wa|ne|sd|id|mt|ak|ri)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const HV = (() => { const w = {}; w.window = w; vm.runInContext(HEAD("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  for (const k of Object.keys(HV)) eq(routes[k], HV[k], `${k}: an earlier board moved`);
  // Every board HEAD did not have is a contested seat some state's ballot
  // file holds a race for (contestedSeats() reads them from those files).
  const CONTESTED = contestedSeats();
  for (const k of Object.keys(routes)) if (!HV[k]) ok(CONTESTED.has(k), `${k}: a board with no race behind it`);
  for (const r of N.RACES) ok(!!routes[r.seat], `${r.seat}: the contested Texas seat has a board`);
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `tx-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    // The contested-boards voice pass opened the composer and the poll here,
    // behind the gate every voiced board shares.
    eq((B.board(alias) || {}).composer, true, `${alias}: takes a voice`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxtx-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/tx"', `${doc}: links the Texas ballot view`);
    has(h, `<h1 class="pdxdb-h1">Texas ${r.chamber === "statesenate" ? "Senate" : "House"} District ${r.district}</h1>`, `${doc}: names its chamber`);
    for (const c of r.field) has(h, c.name.replace(/'/g, "&#39;").replace(/"/g, "&quot;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    const first = N.actsFor(inc.pid)[0];
    if (first) has(h, first.effect, `${doc}: prints an effect line`);
    else has(h, "No formal act on file.", `${doc}: says the sitting member has no act on file`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-tx-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no Texas legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!tx-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxtx-seat=") >= 0) ok(false, `${f}: a board outside the races carries a Texas race block`);
  }
  // Exactly the contested seats are on the composer's three lists (the
  // contested-boards voice pass), and no other Texas legislative seat.
  {
    const want = N.RACES.map((r) => `tx-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`).sort();
    for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
      const got = [...new Set([...R(f).matchAll(/["'](tx-(?:hd|sd)-\d+)["']/g)].map((x) => x[1]))].sort();
      eq(JSON.stringify(got), JSON.stringify(want), `${f}: exactly the contested Texas seats take a voice`);
    }
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi|oh|wi|fl|az|ny)-(?:hd|sd)-\d+\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  for (const f of readdirSync(ROOT).filter((f) => /^district-tx-(?:cd-\d+|us-senate-.*)\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html",
    "ballot-nc.html", "ballot-mi.html", "ballot-oh.html", "ballot-wi.html", "ballot-fl.html", "ballot-az.html",
    "ballot-ny.html"]) {
    ok(settled(f), `${f}: byte-identical to HEAD`);
  }
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  ok(ver(R("sw.js")) === ver(HEAD("sw.js")) + 1 || R("sw.js") === HEAD("sw.js"), "sw.js: CACHE_VERSION moved exactly one step, or the worker was not touched");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null || DECLARED_MIGRATIONS.includes(f), `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's nine earlier ballot files, against today's with all ten.
  const now = bootTX({ state: "Utah" });
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
    "New York": ["38", "39", "43", "44", "21", "46", "97", "107", "143", "12"] };
  const cmp = (st, sd, hd) => {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `${st} seat ${sd}/${hd}: the card changed`);
  };
  for (const st of STATES) for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) cmp(st, d, d);
  // Texas itself: every seat outside the races reads as HEAD's card did.
  for (const [sd, hd] of [["1", "1"], ["11", "93"], ["12", "118"], ["15", "23"], ["26", "41"], ["31", "150"]]) cmp("Texas", sd, hd);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["tx-ballot-2026.js", "ballot-tx.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-tx-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} tx contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
