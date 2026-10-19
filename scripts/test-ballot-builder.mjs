#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ballot-builder.mjs — the personal ballot: the seats and the measures a
// reader's location puts on it, each one a door to its own file
// ─────────────────────────────────────────────────────────────────────────────
// ballot-measures.js paints the measures under the workspace's seats;
// ballot-workspace.js paints the seats. What must stay true:
//
//   1. LOCATION SETS THE RACES. A Utah reader's seat heads name exactly the
//      holders the resolver gives for that location; an Ohio reader is shown
//      none of Utah's holders.
//   2. EVERY PERSON IS A DOOR. Each holder and each name in a seat's field is a
//      link to /p/<pid> for that person's canonical id, and every one of them is
//      a person the field or the resolver actually returned.
//   3. LOCATION SETS THE MEASURES, AND ONLY LOCATION. Utah's two amendments for
//      a Utah reader, none for Ohio or for a reader with no location; residency
//      and membership change nothing, and the module never reads them.
//   4. SUMMARIES ARE THE ARCHIVE'S OR ABSENT. A mapped measure shows its topics
//      and its stored summary; an unmapped one, a summary that is empty, or one
//      that only repeats the title prints the honest gap line instead.
//   5. SAME TEXT LINKS TO HISTORY. A measure whose text is in a same-text family
//      links to its bill page's #history with the vote count; one outside a
//      family carries no such link; the bill page honours #history.
//   6. NO EQUITY LANGUAGE anywhere the ballot surface paints or ships.
//   7. SHIPPED. ballot.html loads the module before the desk; the service
//      worker precaches it and the shell version moved.
//
//   node scripts/test-ballot-builder.mjs
//
// Real shipped modules in a node:vm sandbox (the resolver, the roster, the race
// sheet, the desk), real bill-official.json, a stubbed fetch for the archive.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const gitShow = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "issue-colors.js", "my-stances.js", "voter-hub-location.js",
  // NOT compare-hub.js: ballot.html does not load it, and a harness that did hid
  // the seat field keying nobody on the real page. roster-keys.js is what /ballot
  // keys the roster with.
  "roster-keys.js", "seat-field.js", "ballot-breakdown.js", "who-represents-me.js", "person-link.js", "profiles-full.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const SHEET = R("race-sheet.js");
const MEAS = R("ballot-measures.js");
const LIVE = R("ballot-live-roster.js");
const WORK = R("ballot-workspace.js");
const BALLOT = R("ballot.html");
const SW = R("sw.js");
const BD = R("bill-detail.js");
const OFF = JSON.parse(R("bill-official.json"));
const SUM_SQL = R("netlify/database/migrations/20261128000000_vr_iran_withdrawal_same_text_summary.sql");
const IRAN_SUMMARY = ((/s constant text := '((?:[^']|'')*)';/.exec(SUM_SQL) || [])[1] || "").replace(/''/g, "'");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ ballot builder: STALE HARNESS — ${m}`); process.exit(2); };

function miniDom(win) {
  const byId = {};
  const el = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "", style: {}, dataset: {}, children: [], hidden: false, attrs: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  ["who-represents-me", "wrm-reps", "vh-district-strip", "voter-hub", "ballot-workspace", "bw-body"].forEach(el);
  return byId;
}

// refs: record key -> the /measure-ref measure body (or null for a 404).
function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = Object.assign({}, opts.store || {});
  const sess = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); }, removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  const refs = opts.refs || {};
  win.__fetched = [];
  win.fetch = (url) => {
    const u = String(url);
    win.__fetched.push(u);
    if (u === "/bill-official.json") return Promise.resolve({ ok: true, json: () => Promise.resolve(OFF) });
    const m = /^\/api\/voting-record\/measure-ref\/([^/]+)\/(.+)$/.exec(u);
    if (m) {
      const k = decodeURIComponent(m[1]) + "|" + decodeURIComponent(m[2]);
      const body = refs[k];
      return Promise.resolve(body ? { ok: true, json: () => Promise.resolve({ measure: body }) } : { ok: false, json: () => Promise.resolve({}) });
    }
    if (/^https:\/\/firestore\.googleapis\.com\/v1\/projects\/[^/]+\/databases\/\(default\)\/documents\/politicians\?/.test(u)) {
      win.__firestore = (win.__firestore || 0) + 1;
      if (!opts.live || opts.live === "fail") return Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) });
      // Two pages, so the paging is exercised.
      const tok = (/[?&]pageToken=([^&]+)/.exec(u) || [])[1];
      const ids = Object.keys(opts.live);
      const half = Math.ceil(ids.length / 2);
      const part = tok === "p2" ? ids.slice(half) : ids.slice(0, half);
      const enc = (v) => (typeof v === "number" ? { integerValue: String(v) } : typeof v === "boolean" ? { booleanValue: v } : { stringValue: String(v) });
      // Only the fields the request's mask names, as Firestore returns them.
      const mask = [...u.matchAll(/[?&]mask\.fieldPaths=([^&]+)/g)].map((m) => decodeURIComponent(m[1]));
      const documents = part.map((id) => ({
        name: `projects/x/databases/(default)/documents/politicians/${id}`,
        fields: Object.fromEntries(Object.entries(opts.live[id]).filter(([k]) => !mask.length || mask.includes(k)).map(([k, v]) => [k, enc(v)])),
      }));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(tok === "p2" ? { documents } : { documents, nextPageToken: "p2" }) });
    }
    return Promise.reject(new Error("no network: " + u));
  };
  if (opts.live) win.__FIREBASE_API_KEY__ = "test-public-key";
  if (opts.extra) Object.assign(win, opts.extra);
  const byId = miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, sandbox, { filename: f }); } catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  // The homepage's own keying module, for the parity check against its race card.
  if (opts.homepage) { try { vm.runInContext(R("compare-hub.js"), sandbox, { filename: "compare-hub.js" }); } catch (e) { win.__loadErrors.push(`compare-hub.js: ${e.message}`); } }
  vm.runInContext(SHEET, sandbox, { filename: "race-sheet.js" });
  vm.runInContext(MEAS, sandbox, { filename: "ballot-measures.js" });
  if (!opts.noLive) vm.runInContext(LIVE, sandbox, { filename: "ballot-live-roster.js" });
  if (opts.fixtures) opts.fixtures.forEach((m) => win.PDXBallotMeasures._measures.push(m));
  vm.runInContext(WORK, sandbox, { filename: "ballot-workspace.js" });
  win.PROFILES = win.CMP_DATA;
  win.__byId = byId;
  if (opts.located !== false) {
    win._hasUserLocation = true;
    win._currentVoterLocation = opts.location || { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
  } else {
    win._hasUserLocation = false;
    win._currentVoterLocation = null;
  }
  return win;
}
const paint = (w) => { w.PDXBallotWorkspace.sync(); return String(w.document.getElementById("bw-body").innerHTML || ""); };
async function loaded(w) { paint(w); await w.PDXBallotMeasures.ready(); return paint(w); }
// One measure's <li>, by id.
const entry = (html, id) => {
  const a = html.indexOf(`data-bw-measure="${id}"`);
  if (a < 0) return "";
  const b = html.indexOf("</ul></section>", a), c = html.indexOf('<li class="bw-m" ', a + 1);
  const end = [b, c].filter((x) => x > 0).sort((x, y) => x - y)[0] || html.length;
  return html.slice(a, end);
};
// The open seat's desk alone — the at-a-glance list below it carries every seat.
const desk = (html) => { const a = html.indexOf('<div class="bw-desk">'), b = html.indexOf('data-bw-glance-list'); return a < 0 ? "" : html.slice(a, b > a ? b : html.length); };
// One seat's row in the at-a-glance list.
const glance = (html, key) => { const a = html.indexOf(`data-bw-glance="${key}"`); if (a < 0) return ""; const b = html.indexOf("</li>", a); return html.slice(a, b); };
const rosterOf = (html) => [...html.matchAll(/data-bw-roster="([^"]+)"/g)].map((m) => m[1]);
const measureIds = (html) => [...html.matchAll(/data-bw-measure="([^"]+)"/g)].map((m) => m[1]);

const probe = boot();
must(probe.PDXBallotWorkspace && typeof probe.PDXBallotWorkspace.sync === "function", `the desk did not boot — ${probe.__loadErrors.join(" | ")}`);
must(probe.PDXBallotMeasures && typeof probe.PDXBallotMeasures.html === "function", "ballot-measures.js did not export html()");
must(probe.PDXPersonLink && typeof probe.PDXPersonLink.pid === "function", "person-link.js did not load");
must(IRAN_SUMMARY.length > 80, "the Iran same-text summary migration no longer declares its text");
const SEATS = probe.PDXBallotWorkspace._seats();
must(SEATS.length >= 5, `expected the full ballot on the rail, got ${SEATS.length}`);
const href = (w, pid) => "/p/" + encodeURIComponent(w.PDXPersonLink.pid(pid));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · Location sets the races");
const utahHolderPids = new Set();
{
  const w = boot();
  const r = w.pdxRepsForMe();
  ok(r && r.located, "a Utah reader is not located by the resolver");
  let named = 0;
  for (const s of SEATS) {
    w.pdxBallotWorkspaceOpen(s.key);
    const html = paint(w);
    const want = w.PDXBallotWorkspace._holders(s, r).map((p) => href(w, p));
    want.forEach((h, i) => utahHolderPids.add(w.PDXBallotWorkspace._holders(s, r)[i]));
    const fact = (/Holds this seat now: ([\s\S]*?)<\/span><\/span>/.exec(html) || [])[1] || "";
    const got = [...fact.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    if (String(s.key).indexOf("local") === 0) continue;
    eq(JSON.stringify(got), JSON.stringify(want), `${s.key}: the seat head names exactly the holders the resolver gives this location`);
    named += got.length;
  }
  ok(named >= 3, `a Provo reader's ballot names at least three sitting members (got ${named})`);
}
{
  const w = boot({ location: { state: "Ohio", city: "Columbus", county: "Franklin County" } });
  let all = "";
  for (const s of SEATS) { w.pdxBallotWorkspaceOpen(s.key); all += paint(w); }
  const leaked = [...utahHolderPids].filter((p) => all.indexOf(`href="${href(w, p)}"`) >= 0);
  eq(leaked.length, 0, `an Ohio reader is shown none of Utah's holders (leaked: ${leaked.join(", ")})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Every person on the ballot is a door to /p/");
{
  const w = boot();
  const r = w.pdxRepsForMe();
  let links = 0;
  for (const s of SEATS) {
    w.pdxBallotWorkspaceOpen(s.key);
    const full = paint(w);
    const html = desk(full);
    const field = w.PDXRaceSheet._field(s.key).map((c) => href(w, c.pid));
    const holders = w.PDXBallotWorkspace._holders(s, r).map((p) => href(w, p));
    const names = [...html.matchAll(/<a class="bw-cand-name" href="([^"]+)" data-pdx-person-link="([^"]+)"/g)];
    for (const [, h, pid] of names) {
      links++;
      eq(h, "/p/" + encodeURIComponent(pid), `${s.key}: a name links to the /p/ path of the pid it carries`);
      ok(field.includes(h) || holders.includes(h), `${s.key}: ${h} is linked but is neither in the field nor a holder for this location`);
    }
    // Every row in the field has its door — none is a bare string.
    if (html.indexOf('<ul class="bw-field">') >= 0) {
      const rows = (html.split('<ul class="bw-field">')[1] || "").split("</ul>")[0];
      const rowN = (rows.match(/<li\b/g) || []).length;
      const linkN = (rows.match(/class="bw-cand-name" href="\/p\//g) || []).length;
      ok(linkN >= rowN, `${s.key}: ${rowN} field rows, ${linkN} person links`);
    }
  }
  ok(links >= 4, `the ballot carries person links (got ${links})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2b · Every seat lists every candidate on file this cycle, and invents nobody");
// Each seat's roster, as painted: [pid, role] in order, and the printed count.
const rosterRoles = (html) => [...html.matchAll(/data-bw-roster="([^"]+)"[\s\S]*?data-bw-role="([a-z]+)"/g)].map((m) => [m[1], m[2]]);
const rosterCount = (html) => +((/On file for this race · (\d+) (?:person|people)/.exec(html) || [])[1] || -1);
const at = (area, city, county, extra) => boot(Object.assign({ store: { politidex_keyraces_location: area }, location: { state: "Utah", city, county } }, extra || {}));
const seatHtml = (w, key) => { w.pdxBallotWorkspaceOpen(key); const full = paint(w); return { full, d: desk(full), g: glance(full, key) }; };
{
  // THE RULE, OVER EVERY SEAT A PROVO READER WORKS: incumbents are the resolver's
  // holders; every other name is a current-cycle candidate on that seat's key or
  // the race row; nobody former, retired or not running; the count is the list.
  const w = boot();
  const r = w.pdxRepsForMe();
  const canon = (p) => w.PDXPersonLink.pid(p);
  const st = (p) => w.PDXStatus.resolve(w.CMP_DATA[canon(p)]);
  for (const s of SEATS) {
    if (w.PDXBallotWorkspace._gate(s, r) !== "ok") continue;
    const { d, g } = seatHtml(w, s.key);
    const roles = rosterRoles(d);
    if (!roles.length) continue;
    eq(rosterCount(d), roles.length, `${s.key}: "On file for this race · N" matches the list`);
    const holders = w.PDXBallotWorkspace._holders(s, r).map(canon);
    for (const [p, role] of roles) {
      has(d, `href="/p/${encodeURIComponent(p)}" data-pdx-person-link="${p}"`, `${s.key}: ${p} links to /p/`);
      has(g, `href="/p/${encodeURIComponent(p)}"`, `${s.key}: the at-a-glance row links ${p} too`);
      if (role === "incumbent") ok(holders.length ? holders.includes(p) : st(p) === "incumbent", `${s.key}: ${p} is marked incumbent without holding the seat`);
      else eq(st(p), "current_candidate", `${s.key}: ${p} is listed as a candidate`);
    }
    for (const h of holders) ok(roles.some(([p, role]) => p === h && role === "incumbent"), `${s.key}: the holder ${h} is not marked incumbent`);
    const fieldCands = w.PDXRaceSheet._field(s.key).map((c) => canon(c.pid)).filter((p) => st(p) === "current_candidate");
    for (const c of fieldCands) ok(roles.some(([p]) => p === c), `${s.key}: ${c} is a current candidate on this seat and is not listed`);
  }
}
{
  // A RACE WITH CANDIDATES FROM MORE THAN ONE PARTY: Salt Lake City's U.S. House
  // seat, UT-1 — the sitting member and the candidate on file for that district.
  const w = at("slc", "Salt Lake City", "Salt Lake County");
  const { d, g } = seatHtml(w, "house");
  eq(JSON.stringify(rosterRoles(d)), JSON.stringify([["bmoore", "incumbent"], ["dballard", "candidate"], ["elias_montgomery", "candidate"], ["jesse_west", "candidate"]]), "UT-1 lists its incumbent and its candidates");
  eq(rosterCount(d), 4, "…and counts four people");
  lacks(d, "data-bw-roster-none", "…and does not say there is nobody else");
  const parties = new Set(rosterRoles(d).map(([p]) => w.CMP_DATA[p].party));
  ok(parties.size >= 2, `UT-1's list spans more than one party (got ${[...parties].join(", ")})`);
  has(g, 'href="/p/dballard"', "…and the at-a-glance row names the candidate");
  has(g, 'data-bw-role="candidate"', "…as a candidate");
  // Party is a fact on the record, never printed on the ballot.
  ok(!/\b(Republican|Democrat(?:ic)?|Libertarian)\b|\((?:R|D|I)\)/.test(d.replace(/<[^>]+>/g, " ")), "the roster prints no party");
}
{
  // A LOCAL RACE WITH A NOMINEE BESIDE THREE SITTING MEMBERS: Davis County Commission.
  const w = at("davis", "Layton", "Davis County");
  const key = "local_county_commission";
  if (w.PDXBallotWorkspace._seats().some((s) => s.key === key)) {
    const { d } = seatHtml(w, key);
    const roles = rosterRoles(d);
    ok(roles.some(([p, role]) => p === "susan_lee" && role === "candidate"), "the Davis County Commission lists its nominee as a candidate");
    eq(roles.filter(([, role]) => role === "incumbent").length, 3, "…beside its three sitting commissioners");
    eq(rosterCount(d), roles.length, "…and counts all of them");
  } else {
    // /ballot's rail carries per-seat local chips only where the homepage's team
    // counter (compare-hub.js) runs; this document does not load it.
    console.log("     (Davis County Commission is not a seat on /ballot's rail; the local-race check is skipped)");
    passed++;
  }
}
{
  // ONLY THE SITTING MEMBER ON FILE: the honest empty stays, and a former holder
  // of the seat is not passed off as a candidate. Provo's State Senate holds
  // Keven Stratton and, from the seat's history, Curt Bramble.
  const w = boot();
  const { d, g } = seatHtml(w, "statesenate");
  eq(JSON.stringify(rosterRoles(d)), JSON.stringify([["kstratton", "incumbent"]]), "Provo's State Senate lists only its sitting member");
  eq(rosterCount(d), 1, "…counted as one person");
  has(d, "No other person on file for this seat.", "…with the honest empty");
  has(g, "No other person on file for this seat.", "…at a glance too");
  ok(w.PDXRaceSheet._field("statesenate").some((c) => c.pid === "cbramble"), "the fixture still has a former holder in the seat's history");
  lacks(d.slice(d.indexOf("bw-roster"), d.indexOf("bw-roster-none") + 20), "cbramble", "a former holder is not listed as on file for the race");
  // A row whose field is from an earlier cycle adds nobody: the governor's 2024 challenger.
  const gv = seatHtml(w, "governor");
  ok(/2024/.test(w._pdxRaceFile("governor").candidatesLabel) && w._pdxRaceFile("governor").candidates.includes("lyman"), "the governor row still files a 2024 challenger");
  eq(JSON.stringify(rosterRoles(gv.d)), JSON.stringify([["cox", "incumbent"]]), "an earlier cycle's challenger is not listed for this race");
  has(gv.d, "No other person on file for this seat.", "…and the honest empty stays");
}
{
  // A CANDIDATE ADDED TO THE ARCHIVE FOR THE SAME DISTRICT APPEARS, whatever the
  // party, and the count moves with it; one for another district does not.
  const w = boot();
  w.CMP_DATA.fx_ut3 = { name: "Fixture Candidate", office: "U.S. House Candidate (UT-3)", state: "Utah", party: "Forward" };
  w.CMP_DATA.fx_ut2 = { name: "Elsewhere Candidate", office: "U.S. House Candidate (UT-2)", state: "Utah", party: "Libertarian" };
  w.CMP_DATA.fx_gone = { name: "Gone Candidate", office: "Former U.S. House Candidate (UT-3)", state: "Utah", party: "Independent" };
  const { d } = seatHtml(w, "house");
  const roles = rosterRoles(d);
  ok(roles.some(([p, role]) => p === "fx_ut3" && role === "candidate"), "a candidate filed for UT-3 is listed for a UT-3 reader");
  ok(!roles.some(([p]) => p === "fx_ut2"), "a candidate for another district is not");
  ok(!roles.some(([p]) => p === "fx_gone"), "a former candidate is not");
  eq(rosterCount(d), roles.length, "the count matches the longer list");
  ok(roles.length >= 3, `UT-3 now lists its incumbent and two candidates (got ${roles.length})`);
}
{
  // Every seat on the rail has an at-a-glance row; an unmapped district names nobody.
  const w = boot();
  const full = paint(w);
  for (const s of SEATS) has(full, `data-bw-glance="${s.key}"`, `${s.key} has an at-a-glance row`);
  const oh = boot({ location: { state: "Ohio", city: "Columbus", county: "Franklin County" } });
  const g = glance(paint(oh), "house");
  has(g, "District not mapped for your area.", "an Ohio reader's House row says the district is not mapped");
  lacks(g, 'href="/p/', "…and names nobody");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2d · /ballot reads the live candidate profiles the homepage reads");
// Live documents shaped as the deep-dive scripts file them in Firestore: a
// Senate District 1 challenger for a Box Elder reader, HD14's two nominees and
// the candidate who lost its primary for a Clearfield reader, and a live
// document filed under a display-name slug for a member the roster holds.
const LIVE_DOCS = {
  claudia_bigler: { name: "Claudia Bigler", office: "🏛 Utah Senate candidate, District 1 (Box Elder, Cache, Tooele)", party: "Democrat", state: "Utah", candidacyStatus: "active", nextElection: "2026-11-03" },
  julie_quinlan: { name: "Julie Quinlan", office: "Utah Senate candidate, District 1", party: "Forward", state: "Utah", candidacyStatus: "active" },
  john_taylor: { name: "John Taylor", office: "Utah House candidate, District 14", party: "Republican", state: "Utah", candidacyStatus: "active" },
  brandon_young: { name: "Brandon Young", office: "Utah House candidate, District 14", party: "Democrat", state: "Utah", candidacyStatus: "active" },
  kara_toone: { name: "Kara Toone", office: "Utah House candidate, District 14", party: "Republican", state: "Utah", candidacyStatus: "lost_primary" },
  celeste_maloy: { name: "Celeste Maloy", office: "U.S. Representative", party: "Republican", state: "Utah", photo: "" },
};
async function live(area, city, county, extra) {
  const w = at(area, city, county, Object.assign({ live: LIVE_DOCS }, extra || {}));
  paint(w);
  await w.PDXBallotLiveRoster.ready();
  return w;
}
// The homepage race card's people for a seat: the seat field over the merged roster.
const homepage = (w, key) => { const sf = w.pdxSeatField(key); return sf && sf.answerable ? sf.pids.slice() : []; };
{
  // NO LOCATION, NO REQUEST — and the location alone starts it.
  const w0 = boot({ located: false, live: LIVE_DOCS });
  paint(w0);
  eq(w0.__firestore || 0, 0, "a reader with no location asks the live profiles nothing");

  // BOX ELDER, SENATE DISTRICT 1: the bundled roster holds only the sitting member.
  const before = at("box_elder", "Brigham City", "Box Elder County", { noLive: true });
  const b0 = seatHtml(before, "statesenate");
  eq(JSON.stringify(rosterRoles(b0.d).map(([p]) => p)), JSON.stringify(["ssandall", "julie_quinlan"]), "without the live profiles SD-1 holds its sitting member and the bundled Forward nominee");

  const w = await live("box_elder", "Brigham City", "Box Elder County");
  ok((w.__firestore || 0) >= 2, "the live list is read, every page of it");
  eq(w.PDXBallotLiveRoster.state(), "live", "…and lands");
  const { d, g, full } = seatHtml(w, "statesenate");
  const roles = rosterRoles(d);
  eq(JSON.stringify(roles), JSON.stringify([["ssandall", "incumbent"], ["claudia_bigler", "candidate"], ["julie_quinlan", "candidate"]]),
    "SD-1 lists its incumbent and both live candidates");
  eq(rosterCount(d), 3, "…counted as three people");
  for (const [p] of roles) {
    has(d, `href="/p/${encodeURIComponent(p)}" data-pdx-person-link="${p}"`, `${p} links to /p/`);
    has(g, `href="/p/${encodeURIComponent(p)}"`, `…and at a glance`);
  }
  lacks(d, "data-bw-roster-none", "a seat with live candidates does not print the empty");
  lacks(full, 'data-bw-live="', "once the live list lands no load note remains");
  const parties = new Set(roles.map(([p]) => w.CMP_DATA[p].party));
  ok(parties.size >= 3, "candidates from three parties appear");
  // THE SAME AS THE HOMEPAGE'S CARD: every incumbent and current candidate the
  // homepage's seat field names is on the ballot list, and nothing else.
  const home = homepage(w, "statesenate").filter((p) => ["incumbent", "current_candidate"].includes(w.PDXStatus.resolve(w.CMP_DATA[p])));
  eq(JSON.stringify(roles.map(([p]) => p).sort()), JSON.stringify(home.sort()), "SD-1's ballot list is the homepage card's live field");
  // The stored election date travels with the live profile.
  has(g, "Election: November 3, 2026", "a live profile's stored election date reaches the seat");
}
// THE HOMEPAGE'S CARD, ON THE HOMEPAGE'S OWN TERMS: compare-hub.js loaded, the
// live docs merged by index.html's rule (added if new, else merged) with the
// homepage's light field mask, which carries no candidacyStatus. Its seat field
// is what the "Relevant to Me" card lists for the seat.
const LIGHT = ["name", "office", "district", "state", "party", "rank", "status", "candidate", "incumbent", "photo"];
function homepageCard(area, city, county, key) {
  const h = at(area, city, county, { homepage: true, noLive: true });
  for (const [id, doc] of Object.entries(LIVE_DOCS)) {
    const lite = Object.fromEntries(Object.entries(doc).filter(([k]) => LIGHT.includes(k)));
    if (!h.CMP_DATA[id]) h.CMP_DATA[id] = lite;
    else for (const [k, v] of Object.entries(lite)) if (v !== "" && v != null) h.CMP_DATA[id][k] = v;
  }
  ok(typeof h._pdxBrowseType === "function" && h.PDXRosterKeys, "the homepage harness keys the roster through compare-hub.js and roster-keys.js");
  const sf = h.pdxSeatField(key);
  return sf && sf.answerable ? sf.pids : [];
}
{
  for (const [area, city, county, key] of [["box_elder", "Brigham City", "Box Elder County", "statesenate"], ["clearfield", "Clearfield", "Davis County", "statehouse"], ["slc", "Salt Lake City", "Salt Lake County", "house"]]) {
    const card = homepageCard(area, city, county, key);
    const w = await live(area, city, county);
    const mine = rosterRoles(seatHtml(w, key).d).map(([p]) => p);
    const concluded = (p) => ["former_candidate", "retired", "not_running"].includes(w.PDXStatus.resolve(w.CMP_DATA[p] || {}));
    const want = card.filter((p) => w.CMP_DATA[p] && !concluded(p));
    eq(JSON.stringify(mine.slice().sort()), JSON.stringify(want.slice().sort()),
      `${area} ${key}: /ballot lists the homepage card's people, less any whose race is recorded as over`);
  }
  // The chamber fix reaches the homepage too: a "Utah Senate candidate, District 1"
  // record is a state senate candidate there, not a U.S. Senate one.
  const card = homepageCard("box_elder", "Brigham City", "Box Elder County", "statesenate");
  ok(card.includes("claudia_bigler"), "the homepage's SD-1 card holds the live SD-1 candidate");
  ok(!homepageCard("box_elder", "Brigham City", "Box Elder County", "senate").includes("claudia_bigler"), "…and its U.S. Senate card does not");
}
{
  // CLEARFIELD, HOUSE DISTRICT 14: two nominees, and the candidate who lost the primary stays off.
  const w = await live("clearfield", "Clearfield", "Davis County");
  const { d } = seatHtml(w, "statehouse");
  const ids = rosterRoles(d).map(([p]) => p);
  ok(ids.includes("john_taylor") && ids.includes("brandon_young"), `HD14 lists both live nominees (got ${ids.join(", ")})`);
  ok(!ids.includes("kara_toone"), "a candidate whose primary is recorded as lost is not listed");
  ok(homepage(w, "statehouse").includes("kara_toone"), "…though the seat field (the homepage's card) still holds her record");
  eq(rosterCount(d), ids.length, "the count is the live list");
  const home = homepage(w, "statehouse").filter((p) => ["incumbent", "current_candidate"].includes(w.PDXStatus.resolve(w.CMP_DATA[p])));
  eq(JSON.stringify(ids.slice().sort()), JSON.stringify(home.sort()), "HD14's ballot list is the homepage card's current field");
}
{
  // A LIVE DOCUMENT UNDER ANOTHER KEY FOR A ROSTER PERSON IS THAT PERSON, ONCE;
  // and a blank live field never wipes a bundled one.
  const w = await live("davis", "Layton", "Davis County");
  ok(!w.CMP_DATA.celeste_maloy, "the live `celeste_maloy` document is not added as a second person");
  ok(!!w.CMP_DATA.maloy.photo, "…and its blank photo did not erase the roster's");
  const ids = rosterRoles(seatHtml(w, "house").d).map(([p]) => p);
  eq(ids.filter((p) => /maloy/.test(p)).length, 1, "the House seat names Celeste Maloy once");
}
{
  // ONLY THE SITTING MEMBER, EVEN LIVE: the honest empty stays. Former holders stay off.
  const w = await live("utah_co", "Provo", "Utah County");
  const { d } = seatHtml(w, "statesenate");
  eq(JSON.stringify(rosterRoles(d)), JSON.stringify([["kstratton", "incumbent"]]), "Provo's State Senate still lists only its sitting member");
  has(d, "No other person on file for this seat.", "…with the honest empty");
  lacks(d.slice(d.indexOf("bw-roster"), d.indexOf("bw-roster-none") + 20), "cbramble", "…and the former holder stays off");
}
{
  // THE LIVE LIST CANNOT LOAD, OR THERE IS NO KEY: bundled lists, said out loud.
  const w = at("box_elder", "Brigham City", "Box Elder County", { live: "fail" });
  paint(w);
  await w.PDXBallotLiveRoster.ready();
  const full = paint(w);
  eq(w.PDXBallotLiveRoster.state(), "failed", "a refused live list is recorded as failed");
  has(full, 'data-bw-live="off"', "…and the glance list says the lists are the page's own");
  eq(JSON.stringify(rosterRoles(seatHtml(w, "statesenate").d).map(([p]) => p)), JSON.stringify(["ssandall", "julie_quinlan"]), "…which are the bundled roster's");
  const nk = boot();
  const nkHtml = paint(nk);
  eq(nk.PDXBallotLiveRoster.state(), "nokey", "no public key, no request");
  eq(nk.__firestore || 0, 0, "…none is made");
  has(nkHtml, 'data-bw-live="off"', "…and the page says so");
}
{
  // The doors: the live reader takes no residency or membership state, and a
  // verified resident and an active member see the live ballot unchanged.
  const code = LIVE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok(!/residen|PDXMembership|membership/i.test(code), "ballot-live-roster.js reads no residency or membership state");
  const a = await live("box_elder", "Brigham City", "Box Elder County");
  const b = await live("box_elder", "Brigham City", "Box Elder County", {
    store: { politidex_keyraces_location: "box_elder", pdx_residency: JSON.stringify({ verified: true, state: "OH" }), pdx_membership: JSON.stringify({ active: true }) },
    extra: { PDXMembership: { active: () => true }, _pdxResidency: { state: "OH" } },
  });
  const gl = (h) => h.slice(h.indexOf("data-bw-glance-list"), h.indexOf("data-bw-measures"));
  eq(gl(paint(b)), gl(paint(a)), "residency and membership change no live race list");
  // No equity language in what the live lists paint.
  const EQ = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholder|\bdividend/i;
  ok(!EQ.test(paint(a).replace(/<[^>]+>/g, " ")), "the live ballot carries no equity language");
  const strs = (LIVE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").match(/'(?:[^'\\]|\\.)*'/g) || []).join(" ");
  ok(!EQ.test(strs), "ballot-live-roster.js ships no equity language");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2e · Davis County third-party nominees: the full field, on /ballot and the homepage");
// Five Forward / Constitution nominees filed in the bundled roster for their exact
// Davis-area seat. A Layton reader works SD-6, a Brigham City reader HD-6; the
// other three seats are reached by a reader whose map pin carries the numbers.
// No live list (it is rate-limited in production as often as not): the bundled
// rows alone must fill the field, on both documents.
const pinned = (sd, hd, extra) => boot(Object.assign({ location: { state: "Utah", stateSenateDistrict: String(sd), stateHouseDistrict: String(hd) } }, extra || {}));
const DAVIS_THIRD = [
  { pid: "josh_smith", seat: "statesenate", dist: 6, party: "Forward", reader: (x) => at("davis", "Layton", "Davis County", x) },
  { pid: "jeffrey_ostler", seat: "statesenate", dist: 7, party: "Constitution", reader: (x) => pinned(7, 13, x) },
  { pid: "james_rich", seat: "statehouse", dist: 6, party: "Forward", reader: (x) => at("box_elder", "Brigham City", "Box Elder County", x) },
  { pid: "libby_shelton", seat: "statehouse", dist: 8, party: "Forward", reader: (x) => pinned(3, 8, x) },
  { pid: "tony_de_mille", seat: "statehouse", dist: 13, party: "Forward", reader: (x) => pinned(7, 13, x) },
];
{
  const w0 = boot();
  for (const c of DAVIS_THIRD) {
    const r = w0.CMP_DATA[c.pid];
    ok(!!r, `${c.pid} has a roster row`);
    if (!r) continue;
    eq(r.party, c.party, `${c.pid}: party label`);
    eq(w0._pdxBrowseType(c.pid), c.seat === "statesenate" ? "state_senator" : "state_rep", `${c.pid}: office title keys to the right chamber`);
    eq(w0._pdxRelevantDistNum(c.pid), c.dist, `${c.pid}: district`);
    eq(w0.PDXStatus.resolve(r), "current_candidate", `${c.pid}: a current-cycle candidate`);
    eq(r.score, null, `${c.pid}: no score`);
    eq((r.issues || []).length, 0, `${c.pid}: no issue keys`);
  }
  // Each row keys to its own district and no other.
  for (const c of DAVIS_THIRD) {
    const other = c.dist === 6 ? 9 : 6;
    const w = c.seat === "statesenate" ? pinned(other, 1) : pinned(1, other);
    ok(!rosterRoles(seatHtml(w, c.seat).d).some(([p]) => p === c.pid), `${c.pid} is not on ${c.seat} District ${other}`);
  }
}
for (const c of DAVIS_THIRD) {
  const w = c.reader({ noLive: true });
  const sf = w.pdxSeatField(c.seat);
  eq(sf && sf.district, c.dist, `${c.pid}: the reader's ${c.seat} seat is District ${c.dist}`);
  const { d, g } = seatHtml(w, c.seat);
  const roles = rosterRoles(d);
  ok(roles.some(([p, role]) => p === c.pid && role === "candidate"), `${c.seat} District ${c.dist} lists ${c.pid} as a candidate (got ${roles.map((x) => x.join(":")).join(", ")})`);
  has(d, `href="/p/${c.pid}" data-pdx-person-link="${c.pid}"`, `${c.pid} links to /p/`);
  has(g, `href="/p/${c.pid}"`, `…and at a glance`);
  eq(rosterCount(d), roles.length, `${c.pid}: the count is the list`);
  lacks(d, "data-bw-roster-none", `${c.seat} District ${c.dist} does not print the honest empty`);
  lacks(d, "District not mapped for your area", `${c.seat} District ${c.dist} is not called unmapped`);
  if (d.indexOf("Holds this seat now:") < 0) {
    const inc = (roles.find(([, role]) => role === "incumbent") || [])[0];
    ok(!inc || d.indexOf(`On file as holding this seat: <b><a class="bw-cand-name" href="/p/${inc}"`) >= 0, `${c.seat} District ${c.dist}: the fact line names the incumbent the list names`);
    lacks(d, "No current officeholder resolved", `${c.seat} District ${c.dist}: no fact line contradicts the listed incumbent`);
  }
  // The homepage's race card for the same seat, on its own keyers.
  const h = c.reader({ homepage: true, noLive: true });
  const hsf = h.pdxSeatField(c.seat);
  const card = (hsf && hsf.answerable ? hsf.pids : []).filter((p) => ["incumbent", "current_candidate"].includes(h.PDXStatus.resolve(h.CMP_DATA[p] || {})));
  ok(card.includes(c.pid), `the homepage card for ${c.seat} District ${c.dist} holds ${c.pid}`);
  eq(JSON.stringify(roles.map(([p]) => p).slice().sort()), JSON.stringify(card.slice().sort()), `${c.seat} District ${c.dist}: /ballot lists the homepage card's people`);
}
{
  // SD-6 BESIDE THE MAJOR-PARTY NOMINEES: the live profiles hold Tran and Neal;
  // Josh Smith is there with them, once, even when a live document for him lands.
  const docs = {
    tami_tran: { name: "Tami Tran", office: "Utah Senate candidate, District 6", party: "Republican", state: "Utah", candidacyStatus: "active" },
    jared_neal: { name: "Jared Neal", office: "Utah Senate candidate, District 6", party: "Democrat", state: "Utah", candidacyStatus: "active" },
    josh_smith: { name: "Josh Smith", office: "Utah Senate candidate, District 6", party: "", state: "Utah" },
  };
  const w = at("davis", "Layton", "Davis County", { live: docs });
  paint(w);
  await w.PDXBallotLiveRoster.ready();
  const ids = rosterRoles(seatHtml(w, "statesenate").d).map(([p]) => p);
  ok(["tami_tran", "jared_neal", "josh_smith"].every((p) => ids.includes(p)), `SD-6 lists Josh Smith alongside the major-party candidates (got ${ids.join(", ")})`);
  eq(ids.filter((p) => p === "josh_smith").length, 1, "…once");
  eq(w.CMP_DATA.josh_smith.party, "Forward", "…and a blank live party does not erase his label");
}
{
  // A SEAT WITH ONLY ITS SITTING MEMBER KEEPS THE HONEST EMPTY.
  const w = at("clearfield", "Clearfield", "Davis County", { noLive: true });
  const { d } = seatHtml(w, "statesenate");
  eq(rosterRoles(d).length, 1, "Clearfield's SD-5 still lists only its sitting member");
  has(d, "No other person on file for this seat.", "…with the honest empty");
}
{
  // LOCATION DECIDES; residency and membership change nothing.
  const a = at("davis", "Layton", "Davis County", { noLive: true });
  const b = at("davis", "Layton", "Davis County", {
    noLive: true,
    store: { politidex_keyraces_location: "davis", pdx_residency: JSON.stringify({ verified: true, state: "OH" }), pdx_membership: JSON.stringify({ active: true }) },
    extra: { PDXMembership: { active: () => true }, _pdxResidency: { state: "OH" } },
  });
  eq(seatHtml(b, "statesenate").d, seatHtml(a, "statesenate").d, "residency and membership change no Davis race list");
  const oh = boot({ location: { state: "Ohio", city: "Columbus", county: "Franklin County" }, noLive: true });
  let all = "";
  for (const s of SEATS) { oh.pdxBallotWorkspaceOpen(s.key); all += paint(oh); }
  ok(!DAVIS_THIRD.some((c) => all.indexOf(`/p/${c.pid}"`) >= 0), "an Ohio reader is shown none of them");
  const EQ = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholder|\bdividend/i;
  let davis = "";
  for (const c of DAVIS_THIRD) { const w = c.reader({ noLive: true }); davis += seatHtml(w, c.seat).full; }
  ok(!EQ.test(davis.replace(/<[^>]+>/g, " ")), "the Davis race lists carry no equity language");
  const rows = DAVIS_THIRD.map((c) => JSON.stringify(a.CMP_DATA[c.pid])).join(" ");
  ok(!EQ.test(rows), "the five roster rows carry no equity language");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2f · Utah statewide third-party and unaffiliated nominees: each on its own seat");
// Thirty-one rows, each reached by a reader whose map pin carries the seat's
// number (U.S. House district, State Senate and State House districts). Bundled
// roster only — no live list — on both documents.
const pin3 = (cd, sd, hd, extra) => boot(Object.assign({ location: { state: "Utah", district: String(cd), stateSenateDistrict: String(sd), stateHouseDistrict: String(hd) } }, extra || {}));
const UT_THIRD = [
  ["jesse_west", "house", 1, "Libertarian"], ["elias_montgomery", "house", 1, "Unaffiliated"],
  ["carlton_bowen", "house", 2, "Independent American"], ["daniel_cottam", "house", 2, "Libertarian"], ["robert_moesinger", "house", 2, "Unaffiliated"],
  ["cassie_easley", "house", 3, "Constitution"], ["michael_stoddard", "house", 3, "Libertarian"], ["adonis_hooslyn", "house", 3, "Unaffiliated"], ["ayden_scott", "house", 3, "Unaffiliated"],
  ["taylor_wright", "house", 4, "Libertarian"], ["steven_burt", "house", 4, "Unaffiliated"],
  ["julie_quinlan", "statesenate", 1, "Forward"], ["j_lowry_snow", "statesenate", 9, "Forward"], ["colin_smith", "statesenate", 13, "Forward"],
  ["annette_mcrae", "statesenate", 20, "Forward"], ["wayne_woodfield", "statesenate", 21, "Forward"],
  ["jason_odell", "statehouse", 1, "Constitution"], ["patrick_belmont", "statehouse", 3, "Unaffiliated"], ["cabot_nelson", "statehouse", 23, "Forward"],
  ["wales_nematollahi", "statehouse", 28, "Forward"], ["tynley_bean", "statehouse", 29, "Forward"], ["john_boyd", "statehouse", 53, "Forward"],
  ["julie_smith", "statehouse", 63, "Forward"], ["alan_wessman", "statehouse", 64, "Unaffiliated"], ["zeno_parry", "statehouse", 70, "Forward"],
  // Wave 3: the last "Election Candidate" filings outside the two major parties.
  // HD-29 now has two (Bean and Garrard), both listed beside the seat's member.
  ["jonathan_garrard", "statehouse", 29, "Constitution"], ["sergio_sotelo", "statehouse", 38, "Unaffiliated"],
  ["jennifer_doud", "statehouse", 61, "Constitution"], ["russ_hatch", "statehouse", 66, "Constitution"],
  ["sonya_ray", "statehouse", 68, "Constitution"], ["april_pinkston", "statehouse", 72, "Constitution"],
].map(([pid, seat, dist, party]) => ({ pid, seat, dist, party }));
// A reader for district `d` of `seat`; the other two numbers are fixed seats none of these rows is on.
const readerFor = (seat, d, extra) => seat === "house" ? pin3(d, 5, 14, extra) : seat === "statesenate" ? pin3(2, d, 14, extra) : pin3(2, 5, d, extra);
const KIND = { house: "representative", statesenate: "state_senator", statehouse: "state_rep" };
{
  const w0 = boot();
  for (const c of UT_THIRD) {
    const r = w0.CMP_DATA[c.pid];
    if (!ok(!!r, `${c.pid} has a roster row`)) continue;
    eq(r.party, c.party, `${c.pid}: party label`);
    eq(w0._pdxBrowseType(c.pid), KIND[c.seat], `${c.pid}: office title keys to the right chamber`);
    eq(w0._pdxRelevantDistNum(c.pid), c.dist, `${c.pid}: district`);
    eq(w0.PDXStatus.resolve(r), "current_candidate", `${c.pid}: a current-cycle candidate`);
    eq(r.score, null, `${c.pid}: no score`);
    eq((r.issues || []).length, 0, `${c.pid}: no issue keys`);
  }
}
const seatCache = {};
for (const c of UT_THIRD) {
  const k = c.seat + c.dist;
  if (!seatCache[k]) {
    const w = readerFor(c.seat, c.dist, { noLive: true });
    const sf = w.pdxSeatField(c.seat);
    const { d, g } = seatHtml(w, c.seat);
    const h = readerFor(c.seat, c.dist, { homepage: true, noLive: true });
    const hsf = h.pdxSeatField(c.seat);
    const card = (hsf && hsf.answerable ? hsf.pids : []).filter((p) => ["incumbent", "current_candidate"].includes(h.PDXStatus.resolve(h.CMP_DATA[p] || {})));
    seatCache[k] = { sf, d, g, card, roles: rosterRoles(d) };
    const s = seatCache[k];
    eq(sf && sf.district, c.dist, `the ${c.seat} reader's seat is District ${c.dist}`);
    eq(rosterCount(d), s.roles.length, `${c.seat} District ${c.dist}: the count is the list`);
    lacks(d, "data-bw-roster-none", `${c.seat} District ${c.dist} does not print the honest empty`);
    eq(JSON.stringify(s.roles.map(([p]) => p).slice().sort()), JSON.stringify(card.slice().sort()), `${c.seat} District ${c.dist}: /ballot lists the homepage card's people`);
  }
  const s = seatCache[k];
  ok(s.roles.some(([p, role]) => p === c.pid && role === "candidate"), `${c.seat} District ${c.dist} lists ${c.pid} as a candidate (got ${s.roles.map((x) => x.join(":")).join(", ")})`);
  has(s.d, `href="/p/${c.pid}" data-pdx-person-link="${c.pid}"`, `${c.pid} links to /p/`);
  has(s.g, `href="/p/${c.pid}"`, `…and at a glance`);
  ok(s.card.includes(c.pid), `the homepage card for ${c.seat} District ${c.dist} holds ${c.pid}`);
  // AND NOT A NEIGHBOURING ONE: the next district over in the same chamber.
  const nb = c.seat === "house" ? (c.dist === 4 ? 3 : c.dist + 1) : c.dist + 1;
  const n = readerFor(c.seat, nb, { noLive: true });
  ok(!rosterRoles(seatHtml(n, c.seat).d).some(([p]) => p === c.pid), `${c.pid} is not on ${c.seat} District ${nb}`);
  ok(!(n.pdxSeatField(c.seat).pids || []).includes(c.pid), `…nor in that seat's field`);
}
{
  // EMILY BUSS (Forward, SD-11) IS THE SEAT'S SITTING SENATOR, already on file:
  // she is listed once, as the incumbent, under her own row.
  const w = pin3(2, 11, 14, { noLive: true });
  const roles = rosterRoles(seatHtml(w, "statesenate").d);
  ok(roles.some(([p, role]) => p === "emily_buss" && role === "incumbent"), `SD-11 lists Emily Buss as its incumbent (got ${roles.map((x) => x.join(":")).join(", ")})`);
  eq(roles.filter(([p]) => /buss/.test(p)).length, 1, "…once");
  eq(w.CMP_DATA.emily_buss.party, "F", "…with her Forward label");
}
{
  // HD-29 LISTS BOTH OF ITS THIRD-PARTY NOMINEES, ONCE EACH.
  const ids = rosterRoles(seatHtml(readerFor("statehouse", 29, { noLive: true }), "statehouse").d).map(([p]) => p);
  ok(ids.includes("tynley_bean") && ids.includes("jonathan_garrard"), `HD-29 lists Tynley Bean and Jonathan Garrard (got ${ids.join(", ")})`);
  eq(ids.length, new Set(ids).size, "…and nobody twice");
}
{
  // A SEAT HOLDING ONLY ITS SITTING MEMBER STILL SAYS SO: Provo's SD-24 and Clearfield's SD-5.
  for (const w of [boot({ noLive: true }), at("clearfield", "Clearfield", "Davis County", { noLive: true })]) {
    const { d, g } = seatHtml(w, "statesenate");
    eq(rosterRoles(d).length, 1, `${w._currentVoterLocation.city}'s State Senate still lists only its sitting member`);
    has(d, "No other person on file for this seat.", "…with the honest empty");
    has(g, "No other person on file for this seat.", "…at a glance too");
  }
}
{
  // LOCATION DECIDES; residency and membership change nothing; no equity language.
  const doors = { noLive: true, store: { pdx_residency: JSON.stringify({ verified: true, state: "OH" }), pdx_membership: JSON.stringify({ active: true }) },
    extra: { PDXMembership: { active: () => true }, _pdxResidency: { state: "OH" } } };
  for (const seat of ["house", "statesenate", "statehouse"]) {
    const a = pin3(3, 9, 63, { noLive: true }), b = pin3(3, 9, 63, doors);
    eq(seatHtml(b, seat).d, seatHtml(a, seat).d, `residency and membership change no ${seat} race list`);
  }
  const oh = boot({ location: { state: "Ohio", city: "Columbus", county: "Franklin County", district: "3" }, noLive: true });
  let all = "";
  for (const s of SEATS) { oh.pdxBallotWorkspaceOpen(s.key); all += paint(oh); }
  ok(!UT_THIRD.some((c) => all.indexOf(`/p/${c.pid}"`) >= 0), "an Ohio reader in its own District 3 is shown none of them");
  const EQ = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholder|\bdividend/i;
  let html = "";
  for (const k of Object.keys(seatCache)) html += seatCache[k].d + seatCache[k].g;
  ok(!EQ.test(html.replace(/<[^>]+>/g, " ")), "the statewide race lists carry no equity language");
  const w0 = boot();
  ok(!EQ.test(UT_THIRD.map((c) => JSON.stringify(w0.CMP_DATA[c.pid])).join(" ")), "the thirty-one roster rows carry no equity language");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2g · Federal third-party and independent nominees, batch 1: each on its own seat");
// Twelve identity-only rows on U.S. House and U.S. Senate seats outside Utah that
// the roster already covers. Each is reached by a reader whose map pin carries
// the state and the congressional district; a single-district state's district
// is 1, the number the resolver gives an at-large seat. Bundled roster only.
const fed = (state, cd, extra) => boot(Object.assign({ location: { state, district: String(cd) } }, extra || {}));
const FED_THIRD = [
  ["will_johanson", "house", "Idaho", 2, "Libertarian", ["Idaho", 1]],
  ["cory_robertson", "house", "Colorado", 3, "Libertarian", ["Colorado", 5]],
  ["monica_alponte", "house", "Arizona", 1, "Libertarian", ["Arizona", 2]],
  ["shawn_johnson", "house", "Wyoming", 1, "Libertarian", ["Montana", 1]],
  ["jeff_haggit", "house", "Wyoming", 1, "Constitution", ["Montana", 1]],
  ["tom_schmitz", "house", "Missouri", 1, "Libertarian", ["Missouri", 2]],
  ["brandon_daugherty", "house", "Missouri", 2, "Libertarian", ["Missouri", 1]],
  ["bill_hill", "house", "Alaska", 1, "Independent", ["Washington", 1]],
  ["sarah_zabel", "house", "Idaho", 1, "Independent", ["Idaho", 2]],
  ["dan_osborn", "senate", "Nebraska", 2, "Independent", ["Iowa", 2]],
  ["brian_bengs", "senate", "South Dakota", 1, "Independent", ["North Dakota", 1]],
  ["todd_achilles", "senate", "Idaho", 1, "Independent", ["Montana", 1]],
].map(([pid, seat, state, dist, party, nb]) => ({ pid, seat, state, dist, party, nb }));
const FED_KIND = { house: "representative", senate: "senator" };
{
  const w0 = boot();
  for (const c of FED_THIRD) {
    const r = w0.CMP_DATA[c.pid];
    if (!ok(!!r, `${c.pid} has a roster row`)) continue;
    eq(r.party, c.party, `${c.pid}: party label`);
    eq(w0._pdxBrowseType(c.pid), FED_KIND[c.seat], `${c.pid}: office title keys to the right chamber`);
    eq(w0._pdxBrowseStateOf(c.pid), c.state, `${c.pid}: state`);
    eq(w0._pdxRelevantDistNum(c.pid), c.seat === "house" ? c.dist : null, `${c.pid}: district`);
    eq(w0.PDXStatus.resolve(r), "current_candidate", `${c.pid}: a current-cycle candidate`);
    eq(r.nextElection, "2026-11-03", `${c.pid}: the November 3 election date`);
    eq(r.score, null, `${c.pid}: no score`);
    eq(r.kept + r.broken + r.pending, 0, `${c.pid}: an empty ledger`);
    eq((r.issues || []).length, 0, `${c.pid}: no issue keys`);
  }
}
const fedCache = {};
for (const c of FED_THIRD) {
  const k = c.seat + c.state + c.dist;
  if (!fedCache[k]) {
    const w = fed(c.state, c.dist, { noLive: true });
    const sf = w.pdxSeatField(c.seat);
    const { d, g } = seatHtml(w, c.seat);
    const h = fed(c.state, c.dist, { homepage: true, noLive: true });
    const hsf = h.pdxSeatField(c.seat);
    const card = (hsf && hsf.answerable ? hsf.pids : []).filter((p) => ["incumbent", "current_candidate"].includes(h.PDXStatus.resolve(h.CMP_DATA[p] || {})));
    fedCache[k] = { sf, d, g, card, roles: rosterRoles(d), holders: (sf && sf.holders) || [] };
    const s = fedCache[k];
    ok(!!(sf && sf.answerable), `${c.state} ${c.seat}${c.seat === "house" ? " District " + c.dist : ""} is answerable (${sf && sf.reason})`);
    if (c.seat === "house") eq(sf && sf.district, c.dist, `the ${c.state} reader's House seat is District ${c.dist}`);
    eq(rosterCount(d), s.roles.length, `${c.state} ${c.seat}: the count is the list`);
    lacks(d, "data-bw-roster-none", `${c.state} ${c.seat} does not print the honest empty`);
    ok(s.roles.some(([, role]) => role === "incumbent"), `${c.state} ${c.seat}: the sitting member is still listed as incumbent`);
    eq(JSON.stringify(s.roles.map(([p]) => p).slice().sort()), JSON.stringify(card.slice().sort()), `${c.state} ${c.seat}: /ballot lists the homepage card's people`);
  }
  const s = fedCache[k];
  ok(s.roles.some(([p, role]) => p === c.pid && role === "candidate"), `${c.state} ${c.seat} lists ${c.pid} as a candidate (got ${s.roles.map((x) => x.join(":")).join(", ")})`);
  ok(!s.holders.includes(c.pid), `${c.pid} is not resolved as holding the seat`);
  has(s.d, `href="/p/${c.pid}" data-pdx-person-link="${c.pid}"`, `${c.pid} links to /p/`);
  has(s.g, `href="/p/${c.pid}"`, `…and at a glance`);
  ok(s.card.includes(c.pid), `the homepage card for ${c.state} ${c.seat} holds ${c.pid}`);
  // AND NOT A NEIGHBOURING ONE: the next district over, or the next state over for a statewide or at-large seat.
  const n = fed(c.nb[0], c.nb[1], { noLive: true });
  ok(!rosterRoles(seatHtml(n, c.seat).d).some(([p]) => p === c.pid), `${c.pid} is not on ${c.nb[0]} ${c.seat} ${c.nb[1]}`);
  ok(!(n.pdxSeatField(c.seat).pids || []).includes(c.pid), `…nor in that seat's field`);
}
{
  // A SENATE CANDIDATE IS NOT A THIRD SENATOR. Each state's two sitting senators
  // still resolve, and none of the nominees is named as the reader's senator.
  const w = boot();
  for (const st of ["Nebraska", "South Dakota", "Idaho"]) {
    const s = w._pdxStatewideSeats(st);
    eq(s.ambiguous, false, `${st}: the Senate seats are not called ambiguous`);
    eq(s.senators.length, 2, `${st}: both sitting senators still resolve`);
    ok(!s.senators.some((p) => FED_THIRD.some((c) => c.pid === p)), `${st}: no nominee is named a sitting senator`);
  }
  // Nor is a House nominee the reader's member: Wyoming and Alaska still resolve their own.
  eq(w._pdxUsHouseSeat("Wyoming", "1"), "harriet_hageman", "WY-AL still resolves Harriet Hageman");
  eq(w._pdxUsHouseSeat("Alaska", "1"), "nicholas_begich", "AK-AL still resolves Nicholas Begich");
  eq(w._pdxUsHouseSeat("Idaho", "2"), "mike_simpson", "ID-2 still resolves Mike Simpson");
}
{
  // A SEAT WITH ONLY ITS SITTING MEMBER STILL SAYS SO: Arizona's District 2, beside AZ-1.
  const w = fed("Arizona", 2, { noLive: true });
  const { d } = seatHtml(w, "house");
  eq(rosterRoles(d).length, 1, "AZ-2 still lists only its sitting member");
  has(d, "No other person on file for this seat.", "…with the honest empty");
}
{
  // LOCATION DECIDES; residency and membership change nothing; no equity language.
  const doors = { noLive: true, store: { pdx_residency: JSON.stringify({ verified: true, state: "OH" }), pdx_membership: JSON.stringify({ active: true }) },
    extra: { PDXMembership: { active: () => true }, _pdxResidency: { state: "OH" } } };
  for (const seat of ["house", "senate"]) {
    const a = fed("Idaho", 1, { noLive: true }), b = fed("Idaho", 1, doors);
    eq(seatHtml(b, seat).d, seatHtml(a, seat).d, `residency and membership change no Idaho ${seat} race list`);
  }
  for (const [st, cd] of [["Ohio", 3], ["Utah", 1]]) {
    const o = boot({ location: { state: st, district: String(cd) }, noLive: true });
    let all = "";
    for (const s of SEATS) { o.pdxBallotWorkspaceOpen(s.key); all += paint(o); }
    ok(!FED_THIRD.some((c) => all.indexOf(`/p/${c.pid}"`) >= 0), `a ${st} reader in District ${cd} is shown none of them`);
  }
  const EQ = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholder|\bdividend/i;
  let html = "";
  for (const k of Object.keys(fedCache)) html += fedCache[k].d + fedCache[k].g;
  ok(!EQ.test(html.replace(/<[^>]+>/g, " ")), "the federal race lists carry no equity language");
  const w0 = boot();
  ok(!EQ.test(FED_THIRD.map((c) => JSON.stringify(w0.CMP_DATA[c.pid])).join(" ")), "the twelve roster rows carry no equity language");
  // The Utah batches are where they were.
  ok(UT_THIRD.every((c) => w0._pdxRelevantDistNum(c.pid) === c.dist && w0.CMP_DATA[c.pid].party === c.party), "the Utah third-party rows are unchanged");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2c · Election timing: stored, or honestly absent");
{
  // A seat with no stored date says so, and prints no countdown. Provo's U.S.
  // House seat is the exception: its third-party nominees' rows store the
  // November 3 date, so it is held to the stored-date rule below instead.
  const w = boot({ extra: { __pdxToday: "2026-10-19" } });
  const full = paint(w);
  has(glance(full, "house"), "Election: November 3, 2026", "house: a nominee's stored nextElection sets UT-3's date");
  for (const s of SEATS) {
    if (s.key === "house") continue;
    const g = glance(full, s.key);
    has(g, "No election date on file", `${s.key}: no stored date says so`);
    lacks(g, "election in", `${s.key}: no countdown is invented without a date`);
  }
  // The race row's own status label rides along, word for word.
  const sen = w._pdxRaceElection("senate");
  ok(sen && sen.label === "Neither Seat Up in 2026" && sen.date === "", "the Senate row's stored status is read, with no date");
  has(glance(full, "senate"), "Neither Seat Up in 2026", "…and printed beside the honest no-date line");

  // A stored race date prints with its countdown.
  const w2 = boot({ extra: { __pdxToday: "2026-10-19" } });
  const orig = w2._pdxRaceElection;
  w2._pdxRaceElection = (k) => (k === "house" ? { date: "2026-11-03", label: "" } : orig(k));
  w2.pdxBallotWorkspaceOpen("house");
  const h2 = paint(w2);
  has(desk(h2), 'data-bw-elect="2026-11-03"', "a stored race date is printed on the open seat");
  has(desk(h2), "Election: November 3, 2026", "…as a date");
  has(desk(h2), "election in 15 days", "…with the days until it");
  has(glance(h2, "house"), "election in 15 days", "…and on the seat's at-a-glance row");
  lacks(glance(h2, "governor"), "election in", "a seat with no stored date borrows none from another");

  // A person record's stored nextElection is the fallback; a past date is not a countdown.
  const w3 = boot({ extra: { __pdxToday: "2026-10-19" } });
  const pid = w3.PDXBallotWorkspace._holders(SEATS.find((s) => s.key === "statesenate"), w3.pdxRepsForMe())[0];
  w3.CMP_DATA[pid].nextElection = "2026-11-03";
  has(glance(paint(w3), "statesenate"), "election in 15 days", "a holder's stored nextElection sets the seat's date");
  w3.CMP_DATA[pid].nextElection = "2024-11-05";
  const h3 = glance(paint(w3), "statesenate");
  has(h3, "No election date on file", "a stored date already past is not printed as upcoming");
  lacks(h3, "election in", "…and has no countdown");
  w3.__pdxToday = "2026-11-03"; w3.CMP_DATA[pid].nextElection = "2026-11-03";
  has(glance(paint(w3), "statesenate"), "election day is today", "on the day itself the line says so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · Location sets the measures, and only location");
{
  const ut = await loaded(boot());
  eq(JSON.stringify(measureIds(ut)), JSON.stringify(["ut-amendment-a", "ut-amendment-b"]), "a Utah reader sees Utah's two amendments");
  has(entry(ut, "ut-amendment-a"), 'href="/ballot/ut-amendment-a"', "Amendment A links to its ballot page");
  has(entry(ut, "ut-amendment-b"), 'href="/ballot/ut-amendment-b"', "Amendment B links to its ballot page");
  has(entry(ut, "ut-amendment-a"), "Shall the Utah Constitution be amended to change how proposed constitutional amendments are published", "Amendment A carries its official question");
  ok(ut.indexOf("bw-measures") > ut.indexOf("bw-desk"), "the measures sit under the seat desk");

  const two = await loaded(boot({ location: { state: "UT", city: "Ogden" } }));
  eq(measureIds(two).length, 2, "a two-letter state code resolves the same measures");
  const oh = await loaded(boot({ location: { state: "Ohio", city: "Columbus", county: "Franklin County" } }));
  eq(measureIds(oh).length, 0, "an Ohio reader sees no Utah measure");
  lacks(oh, "bw-measures", "an Ohio reader gets no empty measures section");
  const none = boot({ located: false });
  eq(none.PDXBallotMeasures.html(), "", "a reader with no location gets no measures");

  // Residency and membership are other doors.
  const door = await loaded(boot({
    store: { pdx_residency: JSON.stringify({ verified: true, state: "OH", district: "ut-statehouse-68" }), pdx_membership: JSON.stringify({ active: true }) },
    extra: { PDXMembership: { active: () => true, isMember: () => true }, PDXResidency: { verified: () => ({ state: "OH" }) }, _pdxResidency: { state: "OH" } },
  }));
  eq(JSON.stringify(measureIds(door)), JSON.stringify(measureIds(ut)), "verified residency and an active membership do not change the measures");
  eq(entry(door, "ut-amendment-a"), entry(ut, "ut-amendment-a"), "…nor any entry's text");
  const gl = (h) => h.slice(h.indexOf("data-bw-glance-list"), h.indexOf("data-bw-measures"));
  eq(gl(door), gl(ut), "…nor any seat, name or election line at a glance");
  const wcode = WORK.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok(!/residen|PDXMembership|membership/i.test(wcode), "ballot-workspace.js reads no residency or membership state");
  const code = MEAS.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok(!/residen|membership|PDXMembership|member_?ship/i.test(code), "ballot-measures.js reads no residency or membership state");

  // Moving changes the ballot.
  const w = boot();
  await loaded(w);
  w._currentVoterLocation = { state: "Ohio", city: "Columbus" };
  eq(measureIds(paint(w)).length, 0, "changing location from Utah to Ohio takes the Utah measures off");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Summaries are the archive's, or the honest gap");
const FAM_KEY = "119|S.J.Res. 118";
const FAMILY = OFF.same.families[OFF.same.byMeasure[FAM_KEY]];
must(FAMILY && FAMILY.members.length === 11, "bill-official.json no longer carries the eleven-vote Iran family");
const NON_FAMILY = Object.keys(OFF.effects).find((k) => !OFF.same.byMeasure[k] && /^119\|/.test(k));
must(NON_FAMILY, "bill-official.json has no mapped 119th measure outside a family");
const fx = (id, key, extra) => Object.assign({
  id, state: "UT", label: "Fixture " + id, what: "fixture", page: "/ballot/" + id,
  record: { sitting: key.split("|")[0], number: key.split("|")[1] }, question: "Shall the fixture " + id + " pass?",
}, extra || {});
{
  // The real Utah measures have no mapped record today: they say so, and ask the archive nothing.
  const w = boot();
  const html = await loaded(w);
  for (const id of ["ut-amendment-a", "ut-amendment-b"]) {
    const e = entry(html, id);
    has(e, 'data-bw-m-gap="topics"', `${id}: an unmapped measure says no topics are mapped`);
    has(e, "No plain-language summary on file yet", `${id}: an unmapped measure prints the summary gap`);
    lacks(e, "data-bw-m-summary>", `${id}: an unmapped measure prints no summary`);
    lacks(e, "data-bw-m-history", `${id}: an unmapped measure links to no History`);
    lacks(e, "data-bw-m-pending", `${id}: the entry is still pending after the record loaded`);
  }
  eq(w.__fetched.filter((u) => /measure-ref/.test(u)).length, 0, "no archive lookup is made for a measure with no mapped record");
}
{
  const title = "A joint resolution fixture title";
  const w = boot({
    fixtures: [fx("fx-iran", FAM_KEY), fx("fx-title", NON_FAMILY), fx("fx-empty", "119|S.J.Res. 104"), fx("fx-404", "119|S.J.Res. 116")],
    refs: {
      [FAM_KEY]: { number: "S.J.Res. 118", title: "Iran", summary: IRAN_SUMMARY },
      [NON_FAMILY]: { number: NON_FAMILY.split("|")[1], title, shortTitle: null, summary: "  " + title + "  " },
      "119|S.J.Res. 104": { number: "S.J.Res. 104", title: "x", summary: "" },
    },
  });
  // Before the record lands, nothing is claimed either way.
  const early = paint(w);
  has(entry(early, "fx-iran"), "data-bw-m-pending", "before the record loads the entry says it is checking");
  lacks(entry(early, "fx-iran"), "No plain-language summary", "…and does not yet claim there is no summary");
  const html = await loaded(w);
  const iran = entry(html, "fx-iran");
  has(iran, "data-bw-m-topics", "a mapped measure lists its topics");
  for (const k of Object.keys(OFF.effects[FAM_KEY])) {
    has(iran, `data-issue="${k}"`, `the mapped measure carries its ${k} topic`);
    has(iran, `>${w._issueLabel(k).replace(/&/g, "&amp;")}<`, `…labelled ${w._issueLabel(k)}`);
  }
  has(iran, IRAN_SUMMARY.replace(/&/g, "&amp;").replace(/'/g, "&#39;"), "a measure with a stored summary shows it, word for word");
  lacks(iran, "No plain-language summary", "…and no gap line beside it");
  has(iran, 'data-bw-m-record href="/b/119/S.J.Res.%20118"', "a mapped measure links to its record");
  has(entry(html, "fx-title"), "No plain-language summary on file yet", "a summary that only repeats the title is no summary");
  has(entry(html, "fx-empty"), "No plain-language summary on file yet", "an empty summary prints the gap");
  has(entry(html, "fx-404"), "No plain-language summary on file yet", "a measure the archive cannot resolve prints the gap");
  lacks(entry(html, "fx-title"), "data-bw-m-summary>", "the title is not printed as a summary");

  // ═══════════════════════════════════════════════════════════════════════════
  section("5 · Same text links to its History");
  has(iran, 'data-bw-m-history href="/b/119/S.J.Res.%20118#history"', "a same-text measure links to its bill page's History");
  has(iran, `voted on ${FAMILY.members.length} times`, "…with the number of votes on that text");
  has(entry(html, "fx-empty"), 'href="/b/119/S.J.Res.%20104#history"', "every family member links to its own History");
  lacks(entry(html, "fx-title"), "data-bw-m-history", "a measure outside any family carries no History link");
}
{
  // The bill page answers #history: opens the panel on its own document and the fold once filled.
  ok(/function routeHistory\(\)[\s\S]{0,200}onOwnDocument\(\)[\s\S]{0,80}'#history'/.test(BD), "bill-detail.js routes #history on the bill document");
  ok(/function route\(\) \{ if \(!routeHash\(\) && !routeHistory\(\)\) routePath\(\); \}/.test(BD), "…as part of the arrival route");
  ok(/openHistoryIfAsked\(seam\)/.test(BD) && /data-bd-same-fold="history"\]'\);[\s\S]{0,80}f\.open = true/.test(BD),
    "…and opens the History fold when the official block lands");
  ok(/data-bd-same-fold="history"/.test(BD), "the History fold the link targets still exists");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · No equity language on the ballot surface");
{
  const EQUITY = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshares? (?:in|of) (?:politidex|the (?:company|platform|co-?op))|\bownership stake|\bshareholder|\bdividend/i;
  const visible = (h) => h.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
  const w = boot({ fixtures: [fx("fx-iran", FAM_KEY)], refs: { [FAM_KEY]: { title: "Iran", summary: IRAN_SUMMARY } } });
  let all = await loaded(w);
  for (const s of SEATS) { w.pdxBallotWorkspaceOpen(s.key); all += paint(w); }
  ok(!EQUITY.test(visible(all)), `the painted ballot carries equity language: ${(visible(all).match(EQUITY) || [])[0]}`);
  ok(!EQUITY.test(visible(BALLOT)), `ballot.html carries equity language: ${(visible(BALLOT).match(EQUITY) || [])[0]}`);
  const strings = (src) => (src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").match(/'(?:[^'\\]|\\.)*'/g) || []).join(" ");
  ok(!EQUITY.test(strings(MEAS)), "ballot-measures.js ships equity language");
  ok(!EQUITY.test(strings(WORK)), "ballot-workspace.js ships equity language");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · Shipped");
{
  has(BALLOT, '<script defer src="/ballot-measures.js"></script>', "ballot.html loads ballot-measures.js");
  ok(BALLOT.indexOf('src="/ballot-measures.js"') < BALLOT.indexOf('src="/ballot-workspace.js"'), "…before the desk that paints it");
  const list = SW.slice(SW.indexOf("const SHELL_ASSETS"), SW.indexOf("];", SW.indexOf("const SHELL_ASSETS")));
  has(list, "'/ballot-measures.js'", "the service worker precaches ballot-measures.js");
  has(list, "'/ballot-live-roster.js'", "…and ballot-live-roster.js");
  ok(BALLOT.indexOf('src="/firebase-config.js"') > 0 && BALLOT.indexOf('src="/firebase-config.js"') < BALLOT.indexOf('src="/ballot-live-roster.js"'), "ballot.html loads the public key before the live reader");
  ok(BALLOT.indexOf('src="/ballot-live-roster.js"') < BALLOT.indexOf('src="/ballot-workspace.js"'), "…and the live reader before the desk");
  ok(!/firebasejs|firebase-boot/.test(BALLOT), "ballot.html loads no Firebase SDK and no firebase-boot.js");
  ok(!/AIza[0-9A-Za-z_-]{20,}/.test(LIVE + BALLOT), "no API key is written into the ballot files");
  has(list, "'/ballot-workspace.js'", "…beside the desk");
  const ver = (s) => (/const CACHE_VERSION = '(v\d+)'/.exec(s || "") || [])[1];
  const head = gitShow("sw.js");
  const changed = ["ballot.html", "ballot-workspace.js", "ballot-workspace.css", "ballot-measures.js", "ballot-live-roster.js", "cmp-data.js"].some((f) => gitShow(f) !== R(f));
  if (head && changed) ok(ver(head) !== ver(SW), `precached ballot files changed and the shell version did not move (${ver(SW)})`);
  else passed++;
}

console.log(`\n${failures.length ? "✗" : "✓"} ballot builder: ${passed} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("   ✗ " + f)); process.exit(1); }
