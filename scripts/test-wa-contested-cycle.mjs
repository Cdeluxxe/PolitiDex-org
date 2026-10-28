#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wa-contested-cycle.mjs — Washington, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// wa-ballot-2026.js holds the contested State Senate races and State House
// POSITIONS in the swing districts Washington reporting names, every seat there
// with a sitting member running, the two names the Secretary of State's
// primary results advance for each (the primary is top-two), and the formal
// acts on file for the people in them. A Washington House district elects two
// members, each to its own seat, so a House seat is keyed by district AND
// position (wa-statehouse-<n>-p<k>) and has its own board. cmp-data.js gains
// one block of identity-only House shells, each naming its position; the two
// Senate incumbents' rows are untouched.
//
// What it pins:
//
//   1. THE RESOLVER places a record that names a position on that position and
//      never on the district: the House level of a contested district names
//      nobody as `pid` and lists each position's member; a district with no
//      position on file reads exactly as before; no other state elects by
//      position.
//   2. A WASHINGTON LOCATION IN A CONTESTED DISTRICT prints one House row per
//      position on Who Represents Me, each with its member, an act and the
//      door to /ballot/wa, and the Senate row with its act.
//   3. THE DATA: every race lists exactly the advancing names and parties;
//      every act names a measure on file, a roll-call record on the
//      Legislature's own web service and a person in one of the races; every
//      incumbent is the member the resolver seats on that seat or position;
//      every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races (both positions) → names, files,
//      acts → board.
//   5. DISTRICT VOICE: a board opens for exactly the contested seats and
//      positions, each printing its race; no other Washington legislative seat
//      has one, and every earlier board is unchanged.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, and every Washington district
//      outside the races; the roster outside the one Washington block is HEAD's;
//      the worker moved one version and precaches nothing new; the one
//      migration is the declared seed.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-wa-contested-cycle.mjs

import { R, HEAD, AT, PRE_CA_WA, PASS_WORKER, boot, levelOf, band, settled, DECLARED_MIGRATIONS } from "./state-leg-harness.mjs";
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
const must = (c, m) => { if (!c) { console.error(`✗ wa contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js",
  "wi-ballot-2026.js", "fl-ballot-2026.js", "az-ballot-2026.js", "ny-ballot-2026.js", "tx-ballot-2026.js", "il-ballot-2026.js",
  "mn-ballot-2026.js", "co-ballot-2026.js", "nv-ballot-2026.js", "ca-ballot-2026.js"];
const BALLOTS = [...EARLIER, "wa-ballot-2026.js"];
const ROLLS = "https://wslwebservices.leg.wa.gov/LegislationService.asmx/GetRollCalls?biennium=2025-26&billNumber=";
const SOS = "https://app.enhancedvoting.com/results/public/washington/elections/20260804";
const MIGRATION = "20261202000000_dd_districts_washington_contested_board_seats.sql";
// What THIS pass added is measured against the commit it was built on, so the
// check stays exact after the pass lands; "nothing else moved" stays on HEAD.
const BASE = AT(PRE_CA_WA);

// The two names the Secretary of State's official results for the August 4,
// 2026 primary advance in each contested seat, spelled as the results spell
// them, with party preference.
const FILED = {
  "wa-statesenate-26": [["Deborah Krishnadasan", "D"], ["Gary Parker", "R"]],
  "wa-statesenate-35": [["Drew C MacEwen", "R"], ["Carolina Mejia", "D"]],
  "wa-statehouse-10-p1": [["Clyde Shavers", "D"], ["Robert (Chili) Hicks", "R"]],
  "wa-statehouse-10-p2": [["Dave Paul", "D"], ["Tim Hazelo", "R"]],
  "wa-statehouse-17-p1": [["Kevin Waters", "R"], ["Ben Christly", "D"]],
  "wa-statehouse-17-p2": [["David Stuebe", "R"], ["Diana H. Perez", "D"]],
  "wa-statehouse-18-p1": [["Stephanie McClintock", "R"], ["Randi L. Knott", "D"]],
  "wa-statehouse-18-p2": [["John Ley", "R"], ["Deken Letinich", "D"]],
  "wa-statehouse-26-p1": [["Adison Richards", "D"], ["David Olson", "R"]],
};
const SHELLS = ["shavers_wa", "dave_paul_wa", "kevin_waters_wa", "stuebe_wa", "mcclintock_wa", "ley_wa", "adison_richards_wa"];

const M = (() => { const w = {}; w.window = w; vm.runInContext(R("wa-ballot-2026.js"), vm.createContext(w)); return w.PDXWaBallot; })();
must(M && M.RACES && M.RACES.length >= 4, "wa-ballot-2026.js published no races");
const at = (cd, sd, hd) => ({ state: "Washington", city: "", county: "", district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const bootWA = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };
const headCard = (loc) => {
  const W = boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": HEAD("cmp-data.js"),
    "voter-hub-location.js": HEAD("voter-hub-location.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), W, { filename: f + "@HEAD" });
  return band(W);
};
const posOf = (r) => r.position ? `, Position ${r.position}` : "";

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the resolver places a position, and only a position");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootWA(at("3", "18", "18"));
const RO = W0.CMP_DATA;
{
  eq(W0.pdxLegPositions("Washington", "statehouse"), 2, "Washington's House elects two positions per district");
  eq(W0.pdxLegPositions("Washington", "statesenate"), 0, "…its Senate one member per district");
  for (const st of ["Arizona", "Oregon", "California", "Utah", "New Jersey"]) eq(W0.pdxLegPositions(st, "statehouse"), 0, `${st}: no chamber elects by position`);
  for (const r of M.RACES.filter((x) => x.chamber === "statehouse")) {
    const inc = r.field.find((c) => c.incumbent);
    eq(W0._pdxStateLegPosition("Washington", "statehouse", r.district, r.position), inc.pid, `${r.seat}: the position's member`);
    eq(W0._pdxStateLegSeat("Washington", "statehouse", r.district), null, `${r.seat}: the district alone names nobody`);
    W0._currentVoterLocation = at("3", "1", String(r.district));
    const lv = levelOf(W0, "statehouse");
    eq(lv.pid, null, `${r.seat}: the House level carries no single pid`);
    const p = (lv.positions || []).find((x) => x.position === r.position) || {};
    eq(p.pid, inc.pid, `${r.seat}: the House level lists the position's member`);
  }
  eq(W0._pdxStateLegPosition("Washington", "statehouse", 26, 2), null, "House 26 Position 2 (open, no record) names nobody");
  eq(W0._pdxStateLegPosition("Washington", "statehouse", 18, 3), null, "a third position does not exist");
  eq(W0._pdxStateLegPosition("Oregon", "statehouse", 18, 1), null, "a state that does not elect by position answers null");
  W0._currentVoterLocation = at("3", "1", "1");
  eq(levelOf(W0, "statehouse").positions, undefined, "a district with no position on file carries no positions list");
  for (const pid of SHELLS) {
    const row = RO[pid];
    ok(row && row.state === "Washington" && row.office === "Washington State Representative" && (row.position === 1 || row.position === 2) &&
      /^LD \d+$/.test(row.district) && row.candidate === false, `${pid}: an identity row with its district and position`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a Washington location in a contested district: one row per position");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootWA(at("3", "18", "18"));
  const out = band(W);
  for (const [pos, pid, name] of [[1, "mcclintock_wa", "Stephanie McClintock"], [2, "ley_wa", "John Ley"]]) {
    has(out, `State House · District 18 · Position ${pos}`, `HD 18: Position ${pos} has its own row`);
    has(out, name, `HD 18 Position ${pos}: ${name} is on the card`);
    const b = actBlocks(out).find((x) => x.indexOf(`data-pdxwa-pid="${pid}"`) >= 0) || "";
    has(b, esc(M.actsFor(pid)[0].effect), `${pid}: the newest act's effect line is under the row`);
    has(b, esc(ROLLS), `${pid}: the act links the Legislature's roll-call record`);
    has(b, 'href="/ballot/wa"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 18 — no member on file yet", "HD 18 is named, position by position");
  has(out, "Adrian Cortes", "SD 18 (held, not contested) still names its senator");
  eq(actBlocks(out).length, 2, "the uncontested Senate seat carries no act block");
  for (const r of M.RACES) {
    const inc = r.field.find((c) => c.incumbent);
    const Wr = bootWA(r.chamber === "statesenate" ? at("3", String(r.district), "1") : at("3", "1", String(r.district)));
    const o = band(Wr);
    const b = actBlocks(o).find((x) => x.indexOf(`data-pdxwa-pid="${inc.pid}"`) >= 0) || "";
    has(b, esc(M.actsFor(inc.pid)[0].effect), `${r.seat}: an effect line under the row`);
    if (r.chamber === "statehouse") has(o, `State House · District ${r.district} · Position ${r.position}`, `${r.seat}: its position's row`);
  }
  // HD 26: Position 2 is open, so its row says nobody is on file.
  const W26 = bootWA(at("6", "26", "26"));
  const o26 = band(W26);
  has(o26, "State House · District 26 · Position 1", "HD 26: Position 1's row");
  has(o26, "Adison Richards", "HD 26 Position 1: the member");
  has(o26, "State House · District 26 · Position 2", "HD 26: Position 2's row");
  has(o26, "District 26 — no member on file yet", "HD 26 Position 2: nobody on file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: names, acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(JSON.stringify(M.RACES.map((r) => r.seat).sort()), JSON.stringify(Object.keys(FILED).sort()), "the races are exactly the filed seats");
  const inRace = new Set();
  for (const r of M.RACES) {
    const key = r.chamber === "statehouse" ? `wa-statehouse-${r.district}-p${r.position}` : `wa-statesenate-${r.district}`;
    eq(r.seat, key, `${r.seat}: seat key`);
    if (r.chamber === "statehouse") ok(r.position === 1 || r.position === 2, `${r.seat}: a House race names its position`);
    else ok(r.position == null, `${r.seat}: a Senate race names no position`);
    ok(M.onBallot2026(r.chamber, r.district), `${r.seat}: on the 2026 ballot`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    eq(r.filed, SOS, `${r.seat}: the Secretary of State's official primary results`);
    eq(JSON.stringify(r.field.map((c) => [c.name, c.party])), JSON.stringify(FILED[r.seat] || []), `${r.seat}: every name and party on the ballot`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    const seated = r.chamber === "statehouse"
      ? W0._pdxStateLegPosition("Washington", "statehouse", r.district, r.position)
      : W0._pdxStateLegSeat("Washington", "statesenate", r.district);
    eq(inc[0] && inc[0].pid, seated, `${r.seat}: the incumbent is the member the resolver seats`);
    for (const c of r.field) {
      ok(/^(?:D|R)$/.test(c.party), `${r.seat} ${c.name}: party`);
      if (!c.pid) { eq(M.actsFor(c.name).length, 0, `${c.name}: a challenger with no record has no acts`); continue; }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Washington", `${c.pid}: a Washington roster record`);
      ok(RO[c.pid] && RO[c.pid].name.indexOf(c.name.split(" ").pop()) >= 0, `${c.pid}: the roster name is the race's`);
      ok(M.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (r.chamber === "statehouse") eq(RO[c.pid].position, r.position, `${c.pid}: the roster row holds this position`);
    }
  }
  eq(JSON.stringify([...inRace].filter((p) => SHELLS.includes(p)).sort()), JSON.stringify([...SHELLS].sort()), "every new shell is a race incumbent");
  for (const [m, what, date, votes] of M.ACTS) {
    ok(!!M.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^(House|Senate) final passage$/.test(what), `act ${m}: the action names its chamber`);
    const senate = /^Senate/.test(what);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (absent and excused are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      eq(String((RO[who] || {}).office || ""), senate ? "Washington State Senator" : "Washington State Representative", `act ${m}: ${who} voted in that chamber`);
    }
  }
  const METHOD = /\b(?:precedent|mirror|primary|on-axis|coded|weighted|mapping|roll call|tally|voted|score)\b/i;
  for (const k in M.MEASURES) {
    const m = M.MEASURES[k];
    const e = m.effect;
    ok(e.length <= 140, `${k}: effect line is ${e.length} characters`);
    ok(/^[A-Z]/.test(e) && /\.$/.test(e) && e.slice(0, -1).indexOf(". ") < 0, `${k}: one sentence, ending on its stop`);
    ok(!METHOD.test(e), `${k}: no method words`);
    ok(!/\b(?:Republican|Democrat|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    eq(m.status, "law", `${k}: chaptered`);
    ok(!/^Would/.test(e), `${k}: a law reads as done`);
    ok(/^Signed [A-Z][a-z]+\.? \d{1,2}, 20\d\d(?:, with partial veto)? \(Chapter \d+\)$/.test(m.act), `${k}: names its chapter`);
    const n = (/(\d{4})/.exec(k) || [])[1];
    eq(m.source, `https://app.leg.wa.gov/billsummary/?BillNumber=${n}&Year=2025&Initiative=false`, `${k}: the bill's summary page`);
    eq(m.votes, ROLLS + n, `${k}: the bill's roll-call record`);
    ok(/^(?:Description|Title): /.test(String(m.from || "")), `${k}: the line names the text it was written from`);
  }
  for (const who of inRace) {
    const d = M.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → both positions → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootWA(at("3", "18", "18"));
  W.PDXVoice = voice();
  const page = W.PDXWaBallot.pageHtml(W.pdxRepsForMe());
  for (const s of ["wa-statehouse-18-p1", "wa-statehouse-18-p2"]) has(page, `data-pdxwa-seat="${s}"`, `${s}: its race is on the page`);
  has(page, 'data-pdxwa-seat="wa-statesenate-18"', "SD 18 (held, not contested) is on the page");
  has(page, "Not on the November 3, 2026 ballot: this Washington Senate seat is elected in 2028.", "SD 18 is not up this year");
  has(page, "State House District 18, Position 1", "the House race names its position");
  for (const r of [M.race("statehouse", 18, 1), M.race("statehouse", 18, 2)]) {
    for (const c of r.field) {
      has(page, esc(c.name), `${c.name} is named`);
      if (c.pid) has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      else {
        const own = (page.split(`data-pdxwa-cand="${c.name}"`)[1] || "").split('<li class="pdxpa-cand"')[0];
        has(own, "No formal act on file.", `${c.name}: no formal act on file`);
        lacks(own, 'href="/p/', `${c.name}: no file`);
      }
    }
  }
  has(page, 'href="/district/wa-hd-18-p1"', "Position 1's board is linked");
  has(page, 'href="/district/wa-hd-18-p2"', "Position 2's board is linked");
  const W1 = bootWA(at("1", "1", "1"));
  const p1 = W1.PDXWaBallot.pageHtml(W1.pdxRepsForMe());
  has(p1, "District 1, Position 1 — no member on file yet", "a district with no House member on file lists Position 1");
  has(p1, "District 1, Position 2 — no member on file yet", "…and Position 2");
  for (const r of M.RACES) {
    const h = M.raceHtml(r);
    has(h, esc(`State ${r.chamber === "statesenate" ? "Senate" : "House"} District ${r.district}${posOf(r)}`), `${r.seat}: its heading`);
    for (const c of r.field) has(h, `${esc(c.name)}${c.pid ? "</a>" : "</span>"} <span class="pdxpa-party">(${c.party})</span>`, `${r.seat}: ${c.name} and party`);
    has(h, `href="${esc(r.filed)}"`, `${r.seat}: the official results are linked`);
  }
  has(M.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/wa"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/wa", "/ballot/wa/", "/ballot/wa.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-wa.html"\n  status = 200`, `netlify.toml: ${f}`);
  const doc = R("ballot-wa.html");
  has(doc, 'id="pdx-wa-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/wa-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["California", "Nevada", "leginfo", "Assembly"]) lacks(doc, st, `the Washington ballot document says nothing about ${st}`);
  const idx = R("index.html");
  ok(idx.indexOf('src="/wa-ballot-2026.js"') >= 0 && idx.indexOf('src="/wa-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads wa-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and position, and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const V = voice();
  const routes = V.BOARD_ROUTES;
  const waLeg = Object.keys(routes).filter((k) => /^wa-(?:statehouse|statesenate)-\d+/.test(k)).sort();
  eq(JSON.stringify(waLeg), JSON.stringify(M.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Washington seats and positions");
  ok(!Object.keys(routes).some((k) => /^wa-statehouse-\d+$/.test(k)), "no House board covers a whole district");
  ok(!Object.keys(routes).some((k) => /^wa-gov/.test(k)), "no statewide Washington room");
  const HVR = (() => { const w = {}; w.window = w; vm.runInContext(HEAD("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  for (const k of Object.keys(HVR)) eq(routes[k], HVR[k], `${k}: an earlier board moved`);
  const BVR = (() => { const w = {}; w.window = w; vm.runInContext(BASE("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  eq(JSON.stringify(Object.keys(routes).filter((k) => !BVR[k] && /^wa-/.test(k)).sort()), JSON.stringify(waLeg), "the only new boards are Washington's contested seats");
  ok(Object.keys(routes).every((k) => HVR[k]), "BOARD_ROUTES holds no board beyond HEAD's");
  const CONTESTED = contestedSeats();
  for (const k of waLeg) ok(CONTESTED.has(k), `${k}: a board with no race behind it`);
  eq(V.boardPath("wa-hd-18-p2"), "/district/wa-hd-18-p2", "the position alias resolves to its board");
  eq(V.boardPath("wa-statehouse-18"), "", "the district without a position has no board");
  eq(V.boardPath("wa-hd-18-p3"), "", "a position that does not exist has no board");
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of M.RACES) {
    const alias = r.chamber === "statesenate" ? `wa-sd-${r.district}` : `wa-hd-${r.district}-p${r.position}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, true, `${alias}: takes a voice`);
    eq((B.board(r.seat) || {}).alias, alias, `${r.seat}: the canonical key finds the same board`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxwa-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/wa"', `${doc}: links the Washington ballot view`);
    has(h, `<h1 class="pdxdb-h1">Washington ${r.chamber === "statesenate" ? "Senate" : "House"} District ${r.district}${posOf(r)}</h1>`, `${doc}: names its chamber and position`);
    for (const c of r.field) has(h, esc(c.name), `${doc}: names ${c.name}`);
    const TOML = R("netlify.toml");
    for (const sfx of ["", "/", ".html"]) has(TOML, `from = "/district/${alias}${sfx}"\n  to = "/${doc}"\n  status = 200`, `netlify.toml: /district/${alias}${sfx}`);
  }
  eq(readdirSync(ROOT).filter((f) => /^district-wa-(?:hd|sd)-/.test(f)).length, M.RACES.length, "no Washington legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!wa-(?:hd|sd)-).*\.html$/.test(f))) ok(R(f) === HEAD(f), `${f}: an earlier board document moved`);
  ok(![...R("netlify.toml").matchAll(/from = "([^"]+)"/g)].some((m) => /^\/district\/.*\*/.test(m[1])), "no /district/* splat");
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Against the commit this pass was built on: with the one Washington block
  // lifted out, the roster is that commit's byte for byte, and the block holds
  // exactly the seven House incumbents. Against HEAD, nothing moved.
  const WA_BLOCK = /\/\/ ── Sitting Washington legislators in the contested 2026 races[\s\S]*?(?=\/\/ ── )/;
  const blockNow = (WA_BLOCK.exec(R("cmp-data.js")) || [""])[0];
  eq(R("cmp-data.js").replace(WA_BLOCK, ""), BASE("cmp-data.js"), "cmp-data.js: the pre-pass bytes outside the one Washington shell block");
  ok(settled("cmp-data.js"), "cmp-data.js: HEAD's bytes outside the contested-cycle shell blocks");
  eq(JSON.stringify([...blockNow.matchAll(/^ "([a-z0-9_]+)": \{$/gm)].map((m) => m[1]).sort()), JSON.stringify([...SHELLS].sort()), "the block is exactly the seven House incumbents");
  eq(R("voter-hub-location.js"), HEAD("voter-hub-location.js"), "voter-hub-location.js: byte-identical to HEAD");
  ok(BASE("voter-hub-location.js") !== R("voter-hub-location.js"), "the resolver carries this pass's position support, which the pre-pass commit did not");
  for (const f of ["seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ca.html", "ballot-nv.html", "ballot-co.html"]) eq(R(f), HEAD(f), `${f}: byte-identical to HEAD`);
  for (const f of readdirSync(join(ROOT, "db")).filter((f) => /^roster-/.test(f))) eq(R(`db/${f}`), HEAD(`db/${f}`), `db/${f}: byte-identical to HEAD`);
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  has(R("sw.js"), `// v${PASS_WORKER.wa} - WASHINGTON, ONE CONTESTED CYCLE, AND ITS BOARDS TAKE A VOICE.`, "sw.js: this pass's version entry");
  ok(ver(R("sw.js")) >= PASS_WORKER.wa && ver(R("sw.js")) <= ver(HEAD("sw.js")) + 1, "sw.js: CACHE_VERSION is at least this pass's, and at most one step past HEAD");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  eq(pre(R("sw.js")), pre(BASE("sw.js")), "sw.js: this pass precached nothing new");
  ok(DECLARED_MIGRATIONS.includes(MIGRATION), "the Washington seed is a declared migration");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null || HEAD(`netlify/database/migrations/${f}/migration.sql`) !== null || DECLARED_MIGRATIONS.includes(f), `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card — HEAD's roster, resolver, card and ballot files — against
  // today's. And the resolver before this pass (the commit it was built on:
  // its roster and its voter-hub-location.js) against today's, level by level,
  // so the position support is held to touching Washington's House alone.
  const now = bootWA({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": HEAD("cmp-data.js"),
    "voter-hub-location.js": HEAD("voter-hub-location.js") });
  const prePass = boot({ state: "Utah" }, { "cmp-data.js": BASE("cmp-data.js"), "voter-hub-location.js": BASE("voter-hub-location.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  const SEATS = {};
  const NAMES = { pa: "Pennsylvania", ga: "Georgia", nc: "North Carolina", mi: "Michigan", oh: "Ohio", wi: "Wisconsin", fl: "Florida",
    az: "Arizona", ny: "New York", tx: "Texas", il: "Illinois", mn: "Minnesota", co: "Colorado", nv: "Nevada", ca: "California" };
  for (const f of EARLIER) {
    const code = f.slice(0, 2);
    const w = {}; w.window = w; vm.runInContext(R(f), vm.createContext(w));
    SEATS[NAMES[code]] = [...new Set(w[`PDX${code[0].toUpperCase()}${code[1]}Ballot`].RACES.map((r) => String(r.district)))];
  }
  const cmp = (st, sd, hd) => {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `${st} seat ${sd}/${hd}: the card changed`);
    if (st === "Washington") return;
    prePass._currentVoterLocation = Object.assign({}, loc);
    eq(JSON.stringify(now.pdxRepsForMe().levels), JSON.stringify(prePass.pdxRepsForMe().levels), `${st} seat ${sd}/${hd}: this pass changed the resolver's levels`);
  };
  for (const st of STATES) for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) cmp(st, d, d);
  // Washington itself: every district outside the races reads as HEAD's card did.
  for (const [sd, hd] of [["1", "1"], ["2", "2"], ["7", "7"], ["42", "42"], ["43", "40"], ["49", "35"]]) cmp("Washington", sd, hd);
  // The level objects of every other state are HEAD's, position field and all.
  for (const st of ["Oregon", "California", "Arizona", "Utah"]) {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: "5", stateHouseDistrict: "5", mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc); was._currentVoterLocation = Object.assign({}, loc);
    eq(JSON.stringify(now.pdxRepsForMe().levels), JSON.stringify(was.pdxRepsForMe().levels), `${st}: the resolver's levels are HEAD's`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["wa-ballot-2026.js", "ballot-wa.html", `netlify/database/migrations/${MIGRATION}`]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["cmp-data.js", "voter-hub-location.js", "who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml",
    "district-voice.js", "district-board.js", "district-composer.js", "district-poll.js", "sw.js", "scripts/gen-district-boards.mjs",
    "netlify/functions/district-board.mts", "netlify/lib/district-board-voice-core.mjs", "netlify/lib/seat-holders.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-wa-(?:hd|sd)-/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} wa contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
