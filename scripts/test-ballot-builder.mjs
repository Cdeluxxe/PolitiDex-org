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
  "profile-spine.js", "issue-colors.js", "my-stances.js", "voter-hub-location.js", "compare-hub.js",
  "seat-field.js", "ballot-breakdown.js", "who-represents-me.js", "person-link.js", "profiles-full.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const SHEET = R("race-sheet.js");
const MEAS = R("ballot-measures.js");
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
    return Promise.reject(new Error("no network: " + u));
  };
  if (opts.extra) Object.assign(win, opts.extra);
  const byId = miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, sandbox, { filename: f }); } catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  vm.runInContext(SHEET, sandbox, { filename: "race-sheet.js" });
  vm.runInContext(MEAS, sandbox, { filename: "ballot-measures.js" });
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
section("2b · Every seat lists everyone on file, and invents nobody");
{
  const w = boot();
  const r = w.pdxRepsForMe();
  const canon = (p) => w.PDXPersonLink.pid(p);
  let multi = 0, solo = 0;
  for (const s of SEATS) {
    if (w.PDXBallotWorkspace._gate(s, r) !== "ok") continue;
    w.pdxBallotWorkspaceOpen(s.key);
    const full = paint(w);
    const d = desk(full);
    const holders = w.PDXBallotWorkspace._holders(s, r).map(canon);
    const want = [...new Set(holders.concat(w.PDXRaceSheet._field(s.key).map((c) => canon(c.pid))))];
    const got = rosterOf(d);
    eq(JSON.stringify(got), JSON.stringify(want), `${s.key}: the seat lists exactly the holders and the field on file, holders first`);
    for (const p of got) has(d, `href="/p/${encodeURIComponent(p)}" data-pdx-person-link="${p}"`, `${s.key}: ${p} on the roster links to /p/`);
    const others = want.filter((p) => !holders.includes(p));
    if (want.length > 1 && others.length) {
      multi++;
      lacks(d, "data-bw-roster-none", `${s.key}: a seat with other people on file does not say there are none`);
      const g = glance(full, s.key);
      for (const p of want) has(g, `href="/p/${encodeURIComponent(p)}"`, `${s.key}: the at-a-glance row links ${p}`);
    }
    if (!others.length && holders.length) {
      solo++;
      has(d, "No other person on file for this seat.", `${s.key}: only the sitting member on file still says so`);
      has(glance(full, s.key), "No other person on file for this seat.", `${s.key}: …in the at-a-glance row too`);
      eq(got.length, holders.length, `${s.key}: no name is invented beside the sitting member`);
    }
  }
  ok(multi >= 1, "the Provo fixture has a seat with more than one person on file");
  ok(solo >= 1, "the Provo fixture has a seat with only the sitting member on file");
  // Every seat on the rail has an at-a-glance row.
  const full = paint(w);
  for (const s of SEATS) has(full, `data-bw-glance="${s.key}"`, `${s.key} has an at-a-glance row`);
  // An unmapped district names nobody, at a glance either.
  const oh = boot({ location: { state: "Ohio", city: "Columbus", county: "Franklin County" } });
  const ohHtml = paint(oh);
  const g = glance(ohHtml, "house");
  has(g, "District not mapped for your area.", "an Ohio reader's House row says the district is not mapped");
  lacks(g, 'href="/p/', "…and names nobody");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2c · Election timing: stored, or honestly absent");
{
  // Nothing on /ballot stores a date today: every seat says so, and prints no countdown.
  const w = boot({ extra: { __pdxToday: "2026-10-19" } });
  const full = paint(w);
  for (const s of SEATS) {
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
  has(list, "'/ballot-workspace.js'", "…beside the desk");
  const ver = (s) => (/const CACHE_VERSION = '(v\d+)'/.exec(s || "") || [])[1];
  const head = gitShow("sw.js");
  const changed = ["ballot.html", "ballot-workspace.js", "ballot-workspace.css", "ballot-measures.js"].some((f) => gitShow(f) !== R(f));
  if (head && changed) ok(ver(head) !== ver(SW), `precached ballot files changed and the shell version did not move (${ver(SW)})`);
  else passed++;
}

console.log(`\n${failures.length ? "✗" : "✓"} ballot builder: ${passed} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("   ✗ " + f)); process.exit(1); }
