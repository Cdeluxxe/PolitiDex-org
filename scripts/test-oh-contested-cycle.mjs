#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-oh-contested-cycle.mjs — Ohio, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// oh-ballot-2026.js holds the contested Ohio House and Ohio Senate races on
// Ohio's November 3, 2026 ballot that have a sitting member running, and the
// formal acts on file for the people in them, each a recorded floor vote read
// from the bill's Votes page on legislature.ohio.gov and linked to it.
//
// What it pins:
//
//   1. AN OHIO LOCATION IN A CONTESTED SEAT names the right sitting member on
//      Who Represents Me, with at least one formal act and its effect line
//      under the row, and the door to /ballot/oh.
//   2. A VACANT OR UNCONTESTED SEAT: House 89 (no member on the roster) reads
//      "District 89 — no member on file yet"; Senate 12 (held, even-numbered,
//      not on the 2026 ballot) shows its sitting member with no act block and
//      no board, and the ballot view says the seat is elected in 2028.
//   3. THE DATA: every act names a measure on file, the bill's Votes page and a
//      person in one of the races; every incumbent is the member the resolver
//      seats; every Senate race is an odd-numbered seat; every effect line
//      keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with a record and no roster row (Thomas West) gets acts and
//      no file; one with no record gets "No formal act on file" and no file.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested seats,
//      each printing its race; no other Ohio legislative seat has one, and the
//      four earlier states' boards are byte-identical.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the four earlier contested cycles
//      included; the roster, resolver, existing shells and the earlier states'
//      data are byte-identical; the worker moved one version and precaches
//      nothing new; no migration was added.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-oh-contested-cycle.mjs

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
const must = (c, m) => { if (!c) { console.error(`✗ oh contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const BALLOTS = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js"];

const at = (city, county, cd, sd, hd) => ({ state: "Ohio", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
// The real card, with all five ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootOH = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const N = (() => { const w = {}; w.window = w; vm.runInContext(R("oh-ballot-2026.js"), vm.createContext(w)); return w.PDXOhBallot; })();
must(N && N.RACES && N.RACES.length >= 4, "oh-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · an Ohio location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A location placed in Senate 29 and House 36, both contested.
  const W = bootOH(at("Kettering", "Montgomery County", "10", "29", "36"));
  eq(levelOf(W, "statesenate").pid, "timken_oh", "SD 29: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "andrea_white_oh", "HD 36: the sitting representative");
  const out = band(W);
  has(out, "Jane M. Timken", "SD 29: the senator is on the card");
  has(out, "Andrea White", "HD 36: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["timken_oh", "andrea_white_oh"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxoh-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, "https://www.legislature.ohio.gov/legislation/", `${pid}: the act links to the General Assembly`);
    has(b, "/votes", `${pid}: the act links to the bill's Votes page`);
    has(b, 'href="/ballot/oh"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 29 — no member on file yet", "SD 29 is named");
  lacks(out, "District 36 — no member on file yet", "HD 36 is named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const loc = at("Columbus", "Franklin County", "3", "12", "89");
  const W = bootOH(loc);
  eq(levelOf(W, "statesenate").pid, "manchester_oh", "SD 12: the sitting member");
  eq(levelOf(W, "statehouse").pid, null, "HD 89: no member is named");
  const out = band(W);
  has(out, "District 89 — no member on file yet", "HD 89: the row says nobody is on file");
  has(out, "Susan Manchester", "SD 12: the sitting member is on the card");
  eq(actBlocks(out).length, 0, "a seat with no act on file carries no act block");
  const was = band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") }));
  eq(out, was, "SD 12 / HD 89: the card is HEAD's");
  const V = voice();
  eq(V.boardPath("oh-statesenate-12"), "", "SD 12: no board");
  eq(V.boardPath("oh-statehouse-89"), "", "HD 89: no board");
  ok(!N.race("statesenate", 12), "SD 12 is not one of the races on file");
  const page = N.pageHtml({ located: true, state: "Ohio", levels: [
    { key: "statesenate", district: "12", pid: "manchester_oh" }, { key: "statehouse", district: "89", pid: null }] });
  has(page, "District 89 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a House seat with no race says so");
  has(page, "Ohio elects this Senate seat in 2028.", "ballot view: an even-numbered Senate seat is not on the 2026 ballot");
  lacks(page, "/district/oh-sd-12", "ballot view: no board for SD 12");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootOH(at("Columbus", "Franklin County", "3", "12", "89"));
const RO = W0.CMP_DATA;
const KEY_OFFICE = { "@west": "Representative" };
{
  const inRace = new Set();
  for (const r of N.RACES) {
    ok(r.seat === `oh-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    if (r.chamber === "statesenate") ok(r.district % 2 === 1, `${r.seat}: Ohio elects even-numbered Senate seats in 2028, not 2026`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Ohio", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^[RDGLI]$/.test(c.party), `${r.seat} ${c.name}: party letter`);
      ok(!(c.pid && c.key), `${r.seat} ${c.name}: a pid or a name key, not both`);
      if (c.key) { ok(!RO[c.key] && !!KEY_OFFICE[c.key], `${c.key}: a name key is not a roster id`); ok(N.actsFor(c.key).length >= 1, `${c.name}: a keyed challenger has acts`); inRace.add(c.key); }
      if (!c.pid) continue;
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Ohio", `${c.pid}: an Ohio roster record`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, path, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^(19|20)\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    if (!ok(/^13\d\/[hs]b\d+$/.test(path), `act ${m}: a bill's Votes path`)) continue;
    ok(N.MEASURES[m].source.endsWith("/" + path), `act ${m}: the Votes page is the measure's own`);
    ok(/^(House|Senate) /.test(what), `act ${m}: the action names its chamber`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (excused and not voting are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || KEY_OFFICE[who] || "");
      if (/^House/.test(what) && path.indexOf("136/") === 0) ok(/Representative/.test(office), `act ${m}: ${who} voted in the House`);
      if (/^Senate/.test(what)) ok(/Senator/.test(office), `act ${m}: ${who} voted in the Senate`);
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
    ok(!/\b(?:Republican|Democrat|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    if (m.status === "failed") ok(/^Would have /.test(e), `${k}: a failed act opens "Would have"`);
    else if (m.status === "passed") ok(/^Would (?!have)/.test(e), `${k}: an act that passed one chamber opens "Would"`);
    else if (m.status === "law") ok(!/^Would/.test(e) && /^(?:Signed|Enacted over the governor’s veto,) [A-Z][a-z]+ \d{1,2}, (?:19|20)\d\d$/.test(m.act), `${k}: a law reads as done and names how it became law`);
    else ok(false, `${k}: unknown status ${m.status}`);
    ok(/^https:\/\/www\.legislature\.ohio\.gov\/legislation\/13\d\/[hs]b\d+$/.test(m.source), `${k}: the bill page`);
    ok(String(m.from || "").length > 20, `${k}: the line names what it was written from`);
  }
  for (const who of inRace) {
    const d = N.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
    for (const a of N.actsFor(who)) {
      ok(a.source === a.billSource + "/votes", `${who} ${a.measure}: links its bill's Votes page`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootOH(at("Canton", "Stark County", "13", "29", "60"));
  W.PDXVoice = voice();
  const page = W.PDXOhBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxoh-seat="oh-statesenate-29"', "the Senate race is on the page");
  has(page, 'data-pdxoh-seat="oh-statehouse-60"', "the House race is on the page");
  for (const c of [...N.race("statesenate", 29).field, ...N.race("statehouse", 60).field]) {
    has(page, c.name, `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      has(page, N.actsFor(c.pid)[0].effect, `${c.name}: an effect line`);
    }
  }
  const wOwn = (page.split('data-pdxoh-cand="@west"')[1] || "").split('<li class="pdxpa-cand"')[0];
  has(wOwn, N.MEASURES["HB 6"].effect, "Thomas West: his 2019 act is listed");
  has(wOwn, N.MEASURES["SB 22"].effect, "Thomas West: his 2021 acts are listed");
  lacks(wOwn, "’s file", "Thomas West: no file is linked");
  lacks(page, 'href="/p/@', "no keyed challenger has a file address");
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/oh-sd-29"', "the Senate seat's board is linked");
  has(page, 'href="/district/oh-hd-60"', "the House seat's board is linked");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/oh"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/oh", "/ballot/oh/", "/ballot/oh.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-oh.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-oh.html")), "ballot-oh.html is on disk");
  const doc = R("ballot-oh.html");
  has(doc, 'id="pdx-oh-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/oh-ballot-2026.js"', "the ballot document loads the data");
  lacks(doc, "Pennsylvania", "the Ohio ballot document says nothing about Pennsylvania");
  lacks(doc, "Georgia", "the Ohio ballot document says nothing about Georgia");
  lacks(doc, "North Carolina", "the Ohio ballot document says nothing about North Carolina");
  lacks(doc, "Michigan", "the Ohio ballot document says nothing about Michigan");
  const idx = R("index.html");
  ok(idx.indexOf('src="/oh-ballot-2026.js"') >= 0 && idx.indexOf('src="/oh-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads oh-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const ohLeg = Object.keys(routes).filter((k) => /^oh-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(ohLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Ohio seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `oh-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, false, `${alias}: read-only`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxoh-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/oh"', `${doc}: links the Ohio ballot view`);
    for (const c of r.field) has(h, c.name.replace(/'/g, "&#39;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, N.actsFor(inc.pid)[0].effect, `${doc}: prints an effect line`);
    if (r.issue) has(h, "Local issue:", `${doc}: names its local issue`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-oh-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no Ohio legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!oh-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxoh-seat=") >= 0) ok(false, `${f}: a board outside the races carries an Ohio race block`);
  }
  for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
    lacks(R(f), "oh-hd-", `${f}: no Ohio composer row`);
    lacks(R(f), "oh-sd-", `${f}: no Ohio composer row`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi)-(?:hd|sd)-\d+\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", "pa-ballot-2026.js", "ga-ballot-2026.js",
    "nc-ballot-2026.js", "mi-ballot-2026.js", "ballot-pa.html", "ballot-ga.html", "ballot-nc.html", "ballot-mi.html", "db/roster-state-legislators-oh-ga-nc-2026-oct.json"]) {
    eq(R(f), HEAD(f), `${f}: byte-identical to HEAD`);
  }
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  eq(ver(R("sw.js")), ver(HEAD("sw.js")) + 1, "sw.js: CACHE_VERSION moved exactly one step");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null, `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's Pennsylvania, Georgia, North Carolina and
  // Michigan files, against today's with all five.
  const now = bootOH({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js") });
  for (const f of ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js"]) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in the four earlier states, so their act rows are
  // compared too.
  const SEATS = { Pennsylvania: ["6", "16", "12", "18", "144", "160"], Georgia: ["37", "48", "44", "53", "99", "105", "151"],
    "North Carolina": ["7", "11", "18", "42", "25", "37", "98", "105"],
    Michigan: ["9", "35", "27", "28", "44", "46", "55", "61", "86", "109"] };
  for (const st of STATES) {
    for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) {
      const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: d, stateHouseDistrict: d, mapSelected: true };
      now._currentVoterLocation = Object.assign({}, loc);
      was._currentVoterLocation = Object.assign({}, loc);
      eq(band(now), band(was), `${st} seat ${d}: the card changed`);
    }
  }
  const ctx = (src) => { const w = {}; w.window = w; vm.createContext(w); vm.runInContext(src, w); return w.CMP_DATA; };
  const B = ctx(HEAD("cmp-data.js"));
  for (const k of Object.keys(B)) if (String(B[k].state) === "Ohio") eq(JSON.stringify(RO[k]), JSON.stringify(B[k]), `${k}: shell moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["oh-ballot-2026.js", "ballot-oh.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "pa-ballot.css", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-oh-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} oh contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
