#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-full-candidate-lists.mjs — every name on the ballot, eight contested cycles
// ─────────────────────────────────────────────────────────────────────────────
// The contested seats held by pa-, ga-, nc-, mi-, oh-, wi-, fl- and
// az-ballot-2026.js now list every candidate on the November 3, 2026 ballot
// in that seat, read from the state's official list (or, where a state's
// site refuses every request, the reporting that named the race). FILED
// below is that list, spelled out, so a name cannot be added or dropped
// without this file saying so.
//
// What it pins:
//
//   1. EVERY SEAT'S RACE lists exactly the FILED names and parties, and its
//      /ballot view prints every one of them with their party; the seats are
//      HEAD's seats, no more and no fewer.
//   2. SITTING MEMBERS AND ANYONE WITH A RECORD keep their acts and effect
//      lines exactly as HEAD's file holds them, and every name HEAD listed is
//      listed the same way.
//   3. A NAME WITH NO RECORD reads "No formal act on file", has no file link
//      and no roster row.
//   4. NO NEW BOARD in these eight states: their boards are exactly the
//      contested seats, and each document moves only inside its printed race.
//   5. WHO REPRESENTS ME, AND EVERY OTHER STATE'S CARD, MATCH HEAD.
//   6. NO EQUITY LANGUAGE, NO MIGRATION, AND THE WORKER MOVES ONLY WHEN A
//      PRECACHED FILE CHANGES.
//
//   node scripts/test-full-candidate-lists.mjs

import { R, HEAD, boot, band, settled } from "./state-leg-harness.mjs";
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const STATES = [
  { code: "pa", name: "Pennsylvania", g: "PDXPaBallot" }, { code: "ga", name: "Georgia", g: "PDXGaBallot" },
  { code: "nc", name: "North Carolina", g: "PDXNcBallot" }, { code: "mi", name: "Michigan", g: "PDXMiBallot" },
  { code: "oh", name: "Ohio", g: "PDXOhBallot" }, { code: "wi", name: "Wisconsin", g: "PDXWiBallot" },
  { code: "fl", name: "Florida", g: "PDXFlBallot" }, { code: "az", name: "Arizona", g: "PDXAzBallot" },
];
const FILES = STATES.map((s) => `${s.code}-ballot-2026.js`);

// [name as listed, party] for every candidate on the November 3, 2026 ballot.
const FILED = {
  "pa-statesenate-6": [["Frank A. Farry","R"], ["Eileen Hartnett Albillar","D"]],
  "pa-statesenate-16": [["Jarrett Coleman","R"], ["Mark Pinsley","D"]],
  "pa-statesenate-24": [["Tracy Pennycuick","R"], ["Chris Thomas","D"], ["Mike Schonewolf","G"]],
  "pa-statesenate-36": [["James Andrew Malone","D"], ["Tom Jones","R"]],
  "pa-statesenate-40": [["Rosemary M. Brown","R"], ["Brian Wrightson","D"]],
  "pa-statehouse-12": [["Brandon Dukes","D"], ["Scott Timko","R"]],
  "pa-statehouse-18": [["Kathleen C. Tomlinson","R"], ["Bryan Allen","D"]],
  "pa-statehouse-72": [["Frank Burns","D"], ["Phil Rice","R"]],
  "pa-statehouse-137": [["Joe Emrick","R"], ["Jeff Warren","D"]],
  "pa-statehouse-142": [["Joe Hogan","R"], ["Kristin Egan","D"]],
  "pa-statehouse-144": [["Brian Munroe","D"], ["Mike Murphy","R"]],
  "pa-statehouse-160": [["Craig Williams","R"], ["Elizabeth Moro","D"]],
  "ga-statesenate-37": [["Ed Setzler","R"], ["Darcy Castro","D"]],
  "ga-statesenate-48": [["Shawn Still","R"], ["Laura Murvartian","D"]],
  "ga-statehouse-44": [["Don Parsons","R"], ["Danielle Bell","D"]],
  "ga-statehouse-48": [["Scott Hilton","R"], ["Adam Cleveland","D"]],
  "ga-statehouse-53": [["Deborah Silcox","R"], ["Beth Fuller","D"]],
  "ga-statehouse-99": [["Matt Reeves","R"], ["Michelle Kang","D"]],
  "ga-statehouse-105": [["Sandy Donatucci","R"], ["Farooq Mughal","D"]],
  "ga-statehouse-151": [["Mike Cheokas","R"], ["Ethan Wolfe","D"], ["Travis Lockhart","I"]],
  "ga-statehouse-154": [["Gerald Greene","R"], ["Harry James","D"]],
  "nc-statesenate-7": [["Michael Lee","R"], ["Jessica Bichler","D"]],
  "nc-statesenate-11": [["Lisa S. Barnes","R"], ["James Gailliard","D"], ["Gavin Bell","L"]],
  "nc-statesenate-18": [["Haseeb Fatmi","D"], ["Chris Stock","R"], ["Brad Hessel","L"]],
  "nc-statesenate-42": [["Woodson Bradley","D"], ["Stacie McGinn","R"]],
  "nc-statehouse-25": [["Allen Chesser","R"], ["Lorenza Wilkins","D"], ["Nick Taylor","L"]],
  "nc-statehouse-37": [["Erin Paré","R"], ["Winn Decker","D"]],
  "nc-statehouse-98": [["Beth Helfrich","D"], ["John Rhodes","R"]],
  "nc-statehouse-105": [["Tricia Ann Cotham","R"], ["Ken McCool","D"]],
  "mi-statesenate-9": [["Michael Webber","R"], ["Theresa Brooks","D"], ["Jacob R. Schodowski","Working Class"], ["Philippe M. Cicchini","No Party Affiliation"]],
  "mi-statesenate-35": [["Chedrick Greene","D"], ["Jason Tunney","R"], ["Laurie Atwood","U.S. Taxpayers"]],
  "mi-statehouse-27": [["Rylee Linting","R"], ["Jaime Churches","D"]],
  "mi-statehouse-28": [["Jamie Thompson","R"], ["Sherry Berecz","D"]],
  "mi-statehouse-44": [["Steve Frisbie","R"], ["Jim Haadsma","D"]],
  "mi-statehouse-46": [["Kathy Schmaltz","R"], ["Jan Maino","D"]],
  "mi-statehouse-55": [["Mark A Tisdel","R"], ["Alex Hawkins","D"]],
  "mi-statehouse-61": [["Denise Mentzer","D"], ["Robert Wojtowicz","R"]],
  "mi-statehouse-86": [["Nancy DeBoer","R"], ["Joseph McClusky","D"]],
  "mi-statehouse-109": [["Karl Bohnak","R"], ["Anna Aho Rink","D"]],
  "oh-statesenate-29": [["Jane M. Timken","R"], ["Thomas West","D"]],
  "oh-statehouse-10": [["Mark Sigrist","D"], ["Denise D’Angelo","R"]],
  "oh-statehouse-17": [["Michael D. Dovilla","R"], ["Megan Coy","D"]],
  "oh-statehouse-36": [["Andrea White","R"], ["Rose Lounsbury","D"], ["Chuck Horn","I"]],
  "oh-statehouse-60": [["Brian Lorenz","R"], ["Shelby Kimball","D"]],
  "wi-statesenate-17": [["Howard Marklein","R"], ["Jenna Jacobson","D"]],
  "wi-statesenate-31": [["Jeff Smith","D"], ["Michele Magadance Skinner","R"]],
  "wi-statehouse-26": [["Joe Sheehan","D"], ["John Belanger","R"]],
  "wi-statehouse-30": [["Shannon Zimmerman","R"], ["Kevin Knoke","D"]],
  "wi-statehouse-51": [["Todd Novak","R"], ["Ben Gruber","D"], ["Nathan Tataje","American Solidarity"]],
  "wi-statehouse-61": [["Bob Donovan","R"], ["Ben Brist","D"]],
  "wi-statehouse-85": [["Patrick Snyder","R"], ["John Kroll","D"]],
  "wi-statehouse-88": [["Benjamin Franklin","R"], ["Brandy Tollefson","D"]],
  "wi-statehouse-89": [["Ryan Spaude","D"], ["Bobby Lindsey","R"]],
  "wi-statehouse-91": [["Jodi Emerson","D"], ["Bruce Stabenow","R"]],
  "wi-statehouse-92": [["Clint Moses","R"], ["Jeremiah Fredrickson","D"]],
  "wi-statehouse-94": [["Steve Doyle","D"], ["Keith Purnell","R"]],
  "fl-statesenate-10": [["Jason Brodeur","R"], ["John Lowndes","D"]],
  "fl-statesenate-14": [["Brian Nathan","D"], ["Josie Tomkow","R"]],
  "fl-statesenate-38": [["Alexis Calatayud","R"], ["Richard Lamondin Jr.","D"], ["Jeffrey “Doc” Solomon","NPA"]],
  "fl-statehouse-35": [["Erika Booth","R"], ["Eric Gray","D"]],
  "fl-statehouse-65": [["Karen Gonzalez Pittman","R"], ["Ben Braver","D"]],
  "fl-statehouse-87": [["Emily Gregory","D"], ["Jon Maples","R"]],
  "fl-statehouse-89": [["Debra Tendrich","D"], ["Cathy Higgins","R"]],
  "fl-statehouse-93": [["Anne Gerwig","R"], ["August Mangeney","D"]],
  "fl-statehouse-101": [["Hillary Cassel","R"], ["Todd Delmay","D"]],
  "fl-statehouse-106": [["Fabián Basabe","R"], ["Lucia Báez-Geller","D"]],
  "az-statesenate-2": [["Shawnna Bolick","R"], ["Amelia Gallitano","D"]],
  "az-statesenate-4": [["Carine Werner","R"], ["Aaron Lieberman","D"]],
  "az-statesenate-9": [["Kiana Sears","D"], ["Bridget Fitzgibbons","R"]],
  "az-statesenate-23": [["Brian Fernandez","D"], ["Michelle Altherr","R"]],
};
// The names this pass added, each from the official list the race's `filed`
// link opens.
const ADDED = {
  "nc-statesenate-11": ["Gavin Bell"], "nc-statesenate-18": ["Brad Hessel"],
  "mi-statesenate-9": ["Jacob R. Schodowski", "Philippe M. Cicchini"], "mi-statesenate-35": ["Laurie Atwood"],
  "oh-statehouse-36": ["Chuck Horn"],
};

const load = (src, g) => { const w = {}; w.window = w; vm.runInContext(src, vm.createContext(w)); return w[g]; };
const NOW = {}, WAS = {};
for (const s of STATES) { NOW[s.code] = load(R(`${s.code}-ballot-2026.js`), s.g); WAS[s.code] = load(HEAD(`${s.code}-ballot-2026.js`), s.g); }
const RO = (() => { const w = {}; w.window = w; vm.runInContext(R("cmp-data.js"), vm.createContext(w)); return w.CMP_DATA; })();
const who = (c) => c.pid || c.key || "";
const candLi = (html, c) => {
  const parts = html.split('<li class="pdxpa-cand"').slice(1);
  return parts.find((p) => p.indexOf(`>${esc(c.name)}</`) >= 0) || "";
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every seat lists every filed name, and the ballot view prints it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const seats = [];
  for (const s of STATES) {
    const N = NOW[s.code], H = WAS[s.code];
    eq(JSON.stringify(N.RACES.map((r) => r.seat).sort()), JSON.stringify(H.RACES.map((r) => r.seat).sort()), `${s.code}: the contested seats are HEAD's`);
    for (const r of N.RACES) {
      seats.push(r.seat);
      const want = FILED[r.seat];
      if (!ok(!!want, `${r.seat}: no filed list on record`)) continue;
      eq(JSON.stringify(r.field.map((c) => [c.name, c.party])), JSON.stringify(want), `${r.seat}: the field is the filed list`);
      if (ADDED[r.seat]) ok(/^https:\/\//.test(r.filed || ""), `${r.seat}: links the official list the added names come from`);
      for (const n of ADDED[r.seat] || []) ok(r.field.some((c) => c.name === n), `${r.seat}: ${n} is listed`);
      const page = N.pageHtml({ located: true, state: s.name, levels: [{ key: r.chamber, district: String(r.district), pid: (r.field.find((c) => c.incumbent) || {}).pid || null }] });
      for (const c of r.field) {
        has(page, `>${esc(c.name)}</`, `/ballot/${s.code} ${r.seat}: ${c.name} is named`);
        has(candLi(page, c), `(${esc(c.party)})`, `/ballot/${s.code} ${r.seat}: ${c.name}'s party`);
      }
      if (r.filed) has(page, `href="${esc(r.filed)}"`, `/ballot/${s.code} ${r.seat}: the official list is linked`);
    }
  }
  eq(JSON.stringify(seats.sort()), JSON.stringify(Object.keys(FILED).sort()), "FILED holds exactly the contested seats");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · sitting members and anyone with a record keep their acts");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const s of STATES) {
    const N = NOW[s.code], H = WAS[s.code];
    eq(JSON.stringify(N.MEASURES), JSON.stringify(H.MEASURES), `${s.code}: the measures and effect lines are HEAD's`);
    eq(JSON.stringify(N.ACTS), JSON.stringify(H.ACTS), `${s.code}: the acts are HEAD's`);
    for (const hr of H.RACES) {
      const r = N.race(hr.chamber, hr.district);
      const html = N.raceHtml(r);
      for (const hc of hr.field) {
        const c = r.field.find((x) => x.name === hc.name);
        if (!ok(!!c, `${hr.seat}: ${hc.name} dropped`)) continue;
        eq(JSON.stringify(c), JSON.stringify(hc), `${hr.seat}: ${hc.name} is listed as HEAD listed them`);
        const acts = who(c) ? N.actsFor(who(c)) : [];
        eq(JSON.stringify(acts), JSON.stringify(who(c) ? H.actsFor(who(c)) : []), `${hr.seat}: ${c.name}'s acts are HEAD's`);
        for (const a of acts) has(candLi(html, c), esc(a.effect), `${hr.seat}: ${c.name} shows ${a.measure}'s effect line`);
        if (c.incumbent) ok(acts.length >= 1, `${hr.seat}: the sitting member ${c.name} has an act`);
      }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a name with no record: no formal act, no file, no roster row");
// ═════════════════════════════════════════════════════════════════════════════
{
  let n = 0;
  for (const s of STATES) {
    const N = NOW[s.code];
    for (const r of N.RACES) {
      const html = N.raceHtml(r);
      for (const c of r.field) {
        if (who(c) && N.actsFor(who(c)).length) continue;
        n++;
        ok(!c.pid && !c.key, `${r.seat} ${c.name}: no pid and no record key`);
        const li = candLi(html, c);
        has(li, "No formal act on file.", `${r.seat} ${c.name}: says no formal act on file`);
        lacks(li, 'href="/p/', `${r.seat} ${c.name}: has no file link`);
        lacks(li, "pdxpa-act", `${r.seat} ${c.name}: lists no act`);
      }
    }
  }
  for (const seat in ADDED) for (const nm of ADDED[seat]) {
    ok(!Object.values(RO).some((row) => row && row.name === nm), `${nm}: given a roster row`);
  }
  ok(n > 40, `fixture: ${n} names with no record`);
  ok(settled("cmp-data.js"), "cmp-data.js: byte-identical to HEAD, outside the Minnesota pass’s own shells");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no new board");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A state legislative board outside Utah opens only for a seat some
  // contested file holds a race for, and these eight states' seats are HEAD's.
  const V = (src) => { const w = {}; w.window = w; vm.runInContext(src, vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; };
  const routes = V(R("district-voice.js")), was = V(HEAD("district-voice.js"));
  const LEG = /^([a-z]{2})-(?:statehouse|statesenate)-\d+$/;
  const mine = (k) => STATES.some((s) => k.indexOf(s.code + "-") === 0);
  eq(JSON.stringify(Object.keys(routes).filter((k) => LEG.test(k) && mine(k)).sort()),
    JSON.stringify(Object.keys(was).filter((k) => LEG.test(k) && mine(k)).sort()), "the eight states' boards are HEAD's");
  eq(JSON.stringify(Object.keys(routes).filter((k) => LEG.test(k) && mine(k)).sort()), JSON.stringify(Object.keys(FILED).sort()),
    "the eight states' boards are exactly the contested seats");
  for (const k of Object.keys(was)) eq(routes[k], was[k], `${k}: a board moved`);
  const docs = readdirSync(ROOT).filter((f) => STATES.some((s) => new RegExp(`^district-${s.code}-(?:hd|sd)-\\d+\\.html$`).test(f)));
  eq(docs.length, Object.keys(FILED).length, "one board document per contested seat in the eight states");
  for (const f of docs) ok(settled(f), `${f}: moved outside its printed race`);
  for (const seat in ADDED) {
    const [st, ch, d] = seat.split("-");
    const f = `district-${st}-${ch === "statesenate" ? "sd" : "hd"}-${d}.html`;
    for (const nm of ADDED[seat]) has(R(f), esc(nm), `${f}: prints ${nm}`);
  }
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Who Represents Me and every other state's card match HEAD");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const s of STATES) {
    const N = NOW[s.code], H = WAS[s.code];
    for (const r of H.RACES) for (const c of r.field) if (c.pid) {
      const lv = { key: r.chamber, district: String(r.district) };
      eq(N.seatActHtml(c.pid, lv), H.seatActHtml(c.pid, lv), `${r.seat} ${c.pid}: the Who Represents Me act block`);
    }
  }
  const ALL = ["pa", "ga", "nc", "mi", "oh", "wi", "fl", "az", "ny", "tx"].map((c) => `${c}-ballot-2026.js`).filter((f) => HEAD(f) !== null);
  const now = boot({ state: "Utah" });
  for (const f of ALL) vm.runInContext(R(f), now, { filename: f });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js") });
  for (const f of ALL) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  const ST = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(ST.length, 50, "fixture: 50 states");
  const seatsOf = {};
  for (const s of STATES) seatsOf[s.name] = [...new Set(NOW[s.code].RACES.map((r) => String(r.district)).concat(["1", "40"]))];
  for (const st of ST) for (const d of seatsOf[st] || ["1", "2", "7", "16", "40"]) {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: d, stateHouseDistrict: d, mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `${st} seat ${d}: the card changed`);
  }
  for (const f of ["voter-hub-location.js", "seated-member.js"]) eq(R(f), HEAD(f), `${f}: byte-identical to HEAD`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no equity language, no migration, the worker did not move");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of [...FILES, ...readdirSync(ROOT).filter((f) => /^district-.*\.html$/.test(f) && R(f) !== HEAD(f))]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null, `${f}: a migration this pass added`);
  }
  // The worker moves exactly one step when a precached file changed, and not
  // at all when none did.
  const pre = (R("sw.js").match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
  ok(pre.length > 100, "fixture: the precache list");
  const moved = pre.some((f) => (f === "" ? R("index.html") !== HEAD("index.html") : !f.endsWith("/") && R(f) !== HEAD(f)));
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  eq(ver(R("sw.js")), ver(HEAD("sw.js")) + (moved ? 1 : 0), "sw.js: the worker moves one step exactly when a precached file changed");
}

console.log(`\n${failures.length ? "✗" : "✓"} full candidate lists: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
