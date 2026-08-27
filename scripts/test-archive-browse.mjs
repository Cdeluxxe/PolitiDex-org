#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-archive-browse.mjs — the archive is browsable, and it is never a ballot
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex holds one roster and makes two different kinds of claim about it:
//
//   ARCHIVE   "here is the record of the people we track."  National. No seats.
//   BALLOT    "these people hold power over YOU."           Utah for district
//             seats; anywhere for the statewide ones.
//
// Before archive-browse.js a visitor outside Utah had no chamber-and-state door
// into the archive at all. The ballot could not help them — correctly, it does
// not know their district — so the product looked thinner than the archive
// actually is. This file adds that door, and every assertion here exists to stop
// the door from quietly becoming a ballot.
//
// What must stay true:
//
//   1. ONE CLASSIFIER, NOT TWO. The archive slices by chamber and state through
//      the SAME functions Door 1's browse tree groups by, so the two surfaces
//      can never disagree about who is in the U.S. Senate or in Ohio. Absent
//      those functions, the panel renders nothing rather than guessing.
//   2. IT LISTS A ROSTER SLICE, NEVER A SEAT. No "your", no "represents you",
//      no "ballot" anywhere in the module's reader-facing copy, and the heading
//      is chamber + state ("U.S. Senate · Ohio").
//   3. NO DISTRICT DIMENSION AT ALL. There is no code path from a state's House
//      delegation to one district for the reader, because district is not a
//      concept this file has.
//   4. NO INVENTED MEMBERS. Every row is a pid already in the bundled roster;
//      an empty slice renders empty, and a truncated one says it truncated.
//   5. NOT SORTED BY PARTY.
//   6. DISTRICT NUMBERS STAY UTAH-ONLY. compare-hub's two "your district"
//      producers go through the one districtsResolvable gate, so a visitor whose
//      city name collides with a Utah town is not handed a Utah district.
//   7. THE GROWTH LINE IS A DIRECTION, NOT A PROMISE. Federal-first, no dates,
//      no completeness claim, and no coverage percentage.
//   8. IT IS WIRED, AND IT IS NOT A NEW DOOR. Loaded from index.html on the
//      non-blocking path, mounted inside two surfaces that already exist, and
//      it adds no top-level nav.
//
//   node scripts/test-archive-browse.mjs

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/<!--[\s\S]*?-->/g, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ archive browse: STALE HARNESS — ${m}`); process.exit(2); };

const INDEX = R("index.html");
const AB = CODE("archive-browse.js");
const CH = CODE("compare-hub.js");

// ─────────────────────────────────────────────────────────────────────────────
// compare-hub's real chamber classifier, lifted out of the shipped file rather
// than paraphrased here. Section 9 uses it to compare the archive's buckets
// against the BALLOT's own senate/governor office tests over the whole roster;
// a paraphrase would only prove this file agrees with itself.
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_FROM_TEXT = (() => {
  const src = R("compare-hub.js");
  const start = src.indexOf("function _classifyBrowseType(pid)");
  must(start !== -1, "_classifyBrowseType is gone from compare-hub — this probe is stale");
  const end = src.indexOf("\n    }", src.indexOf("return 'other';", start));
  must(end > start, "_classifyBrowseType could not be sliced — this probe is stale");
  const body = src.slice(start, end + 6);
  const ctx = vm.createContext({});
  ctx.window = ctx;
  new vm.Script("var CMP_DATA = {};\n" + body +
                "\nthis.run = function (office) { CMP_DATA.probe = { office: office, state: '' }; " +
                "return _classifyBrowseType('probe'); };",
                { filename: "classify-browse-type" }).runInContext(ctx);
  must(typeof ctx.run === "function", "the lifted chamber classifier did not evaluate — this probe is stale");
  must(ctx.run("U.S. Senator") === "senator" && ctx.run("Governor") === "governor",
       "the lifted chamber classifier does not behave — this probe is stale");
  return ctx.run;
})();

must(existsSync(join(ROOT, "archive-browse.js")), "archive-browse.js is gone — this probe is stale");
must(existsSync(join(ROOT, "archive-browse.css")), "archive-browse.css is gone — this probe is stale");

// ─────────────────────────────────────────────────────────────────────────────
// A hand-rolled DOM, small enough that what the module touches is observable.
// The registry records every element created and appended, so "does it mount
// once and only once" is a question this sandbox can answer.
// ─────────────────────────────────────────────────────────────────────────────
function stubEl(tag) {
  const el = {
    tagName: (tag || "div").toUpperCase(),
    id: "", className: "", value: "", innerHTML: "", textContent: "",
    children: [], attrs: {}, listeners: {}, parentNode: null,
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return el.attrs[k] === undefined ? null : el.attrs[k]; },
    addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
    removeEventListener() {},
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
  };
  return el;
}

function sandbox(opts) {
  opts = opts || {};
  const made = [];
  const byId = {};
  const doc = {
    readyState: "complete",
    createElement(t) { const e = stubEl(t); made.push(e); return e; },
    getElementById(id) { return byId[id] || null; },
    querySelector(sel) { return (opts.hosts && opts.hosts[sel]) || null; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    head: stubEl(), body: stubEl(), documentElement: stubEl(),
  };
  const win = {
    document: doc,
    addEventListener() {}, removeEventListener() {},
    setTimeout(fn) { if (opts.runTimers && typeof fn === "function") { try { fn(); } catch (e) {} } return 0; },
    clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    console,
    CMP_DATA: opts.roster || null,
    _pdxBrowseType: opts.type,
    _pdxBrowseStateOf: opts.state,
    _pdxOfficeStatus: opts.status || function (d) {
      const o = String((d && d.office) || "").toLowerCase();
      if (o.indexOf("former") !== -1) return "former";
      if (o.indexOf("candidate") !== -1) return "candidate";
      return "office";
    },
    pdxRepsForMe: opts.reps ? function () { return opts.reps; } : undefined,
    PDXPerson: { open(pid) { win.__opened.push(pid); } },
    __opened: [],
  };
  win.window = win;
  win.self = win;
  // slot() looks the band up by id before creating it, so the registry has to
  // answer getElementById once the band has been appended — otherwise every
  // paint would look like a first paint and the idempotency check would pass
  // for the wrong reason.
  const realCreate = doc.createElement;
  doc.createElement = function (t) {
    const e = realCreate(t);
    const setId = Object.getOwnPropertyDescriptor(e, "id");
    void setId;
    return e;
  };
  const origAppend = stubEl().appendChild;
  void origAppend;
  win.__registerIds = () => made.forEach((e) => { if (e.id) byId[e.id] = e; });
  win.__made = made;
  win.__byId = byId;
  const ctx = vm.createContext(win);
  new vm.Script(R("archive-browse.js"), { filename: "archive-browse.js" }).runInContext(ctx);
  return win;
}

// A tiny fixture roster: two Ohio senators, three Utah House members, one Ohio
// governor, one former, one candidate.
const ROSTER = {
  oh_sen_a: { name: "Zed Ohio", office: "U.S. Senator", state: "Ohio" },
  oh_sen_b: { name: "Ada Ohio", office: "U.S. Senator", state: "Ohio" },
  ut_rep_a: { name: "Utah One", office: "U.S. Representative", state: "Utah" },
  ut_rep_b: { name: "Utah Two", office: "U.S. Representative", state: "Utah" },
  ut_rep_c: { name: "Utah Cand", office: "U.S. House Candidate", state: "Utah" },
  oh_gov:   { name: "Ohio Gov", office: "Governor", state: "Ohio" },
  oh_old:   { name: "Ohio Past", office: "Former U.S. Senator", state: "Ohio" },
};
const TYPE = (pid) => ({
  oh_sen_a: "senator", oh_sen_b: "senator", oh_old: "senator",
  ut_rep_a: "representative", ut_rep_b: "representative", ut_rep_c: "representative",
  oh_gov: "governor",
}[pid] || "other");
const STATE = (pid) => (ROSTER[pid] || {}).state || "";

// ─────────────────────────────────────────────────────────────────────────────
// 1 · One classifier, not two
// ─────────────────────────────────────────────────────────────────────────────
section("1 · the archive borrows Door 1's chamber and state classifiers");

has(CH, "window._pdxBrowseType = _classifyBrowseType",
    "compare-hub no longer exposes its chamber classifier, so the archive must be re-deriving chambers somewhere");
has(CH, "window._pdxBrowseStateOf = _getPoliticianState",
    "compare-hub no longer exposes its state resolver, so the archive must be re-deriving states somewhere");
has(AB, "window._pdxBrowseType",
    "archive-browse stopped reading the shared chamber classifier");
has(AB, "window._pdxBrowseStateOf",
    "archive-browse stopped reading the shared state resolver");

// No second doctrine: the module must not contain its own office-string ladder.
const OFFICE_SNIFF = /office[^\n]*\.(?:toLowerCase|indexOf|includes)|\.includes\(['"](?:u\.s\. sen|congress|governor|state rep)/i;
ok(!OFFICE_SNIFF.test(AB),
   "archive-browse.js appears to classify offices from their text itself — that is a second doctrine that will drift from compare-hub's");

// With the shared functions absent it renders nothing at all.
{
  const host = stubEl();
  const w = sandbox({ roster: ROSTER, type: undefined, state: undefined, hosts: { "#who-represents-me .wrm-inner": host } });
  eq(w.PDXArchiveBrowse.ready(), false, "the panel reported itself ready with no chamber classifier available");
  eq(host.children.length, 0, "the panel mounted a band with no classifier to slice the roster with — that is a guess");
  eq(w.PDXArchiveBrowse.roster("senator", "").length, 0, "the panel produced rows with no classifier");
}

// With them present it slices correctly, and it agrees with them by definition.
const HOST = stubEl();
const W = sandbox({ roster: ROSTER, type: TYPE, state: STATE, hosts: { "#who-represents-me .wrm-inner": HOST } });
const P = W.PDXArchiveBrowse;
must(P && typeof P.roster === "function", "window.PDXArchiveBrowse is not the shape this probe expects");
eq(P.ready(), true, "the panel refused to run with a roster and both classifiers present");
eq(P.roster("senator", "Ohio").map((r) => r.pid).sort().join(","), "oh_old,oh_sen_a,oh_sen_b",
   "the U.S. Senate · Ohio slice is not the Ohio senators in the roster");
eq(P.roster("representative", "Ohio").length, 0,
   "a chamber the roster has nobody from in that state produced rows anyway");
eq(P.states("senator").map((s) => s.state).join(","), "Ohio",
   "the state axis is not the states the chamber actually has people in");

// ─────────────────────────────────────────────────────────────────────────────
// 2 · A roster slice, never a seat
// ─────────────────────────────────────────────────────────────────────────────
section("2 · the listing is labelled archive, never ballot");

eq(P.label("senator", "Ohio"), "U.S. Senate · Ohio",
   "the heading is no longer chamber · state, which is the one true thing a roster slice can say");
eq(P.label("representative", "Utah"), "U.S. House · Utah",
   "the U.S. House heading is not chamber · state");
has(P.label("senator", ""), "all states",
   "with no state chosen the heading does not say so, which leaves the slice's scope unstated");

// The reader-facing strings in this module. Ballot language here would be the
// exact lie the two-scope doctrine exists to prevent.
const COPY = [P.KICKER, P.LEAD, P.SUB, P.GROWTH, P.ROWNOTE].join(" || ");
must(COPY.length > 120, "the module's copy constants could not be read — this probe is stale");
[
  ["your ballot", "the archive panel calls its listing a ballot"],
  ["your seat", "the archive panel claims a seat for the reader"],
  ["your representative", "the archive panel claims a representative for the reader"],
  ["represents you", "the archive panel claims to say who represents the reader"],
  ["on the ballot", "the archive panel puts its rows on a ballot"],
].forEach(([needle, msg]) => lacks(COPY.toLowerCase(), needle, msg));

has(COPY.toLowerCase(), "archive", "the archive panel never says the word archive");
has(COPY.toLowerCase(), "roster", "the archive panel never says the word roster");
has(COPY.toLowerCase(), "browse", "the archive panel never offers to browse");
has(COPY.toLowerCase(), "not a ballot", "the archive panel does not say what it is not");

// And the same, on the rendered markup — copy can leak in from templates too.
const HTML_OUT = P._html();
must(HTML_OUT.indexOf("ab-kicker") !== -1, "the panel's markup could not be rendered — this probe is stale");
["your ballot", "your seat", "your u.s.", "represents you", "your representative"].forEach((n) =>
  lacks(HTML_OUT.toLowerCase(), n, `the rendered archive panel says ${JSON.stringify(n)}`));
has(HTML_OUT, "U.S. Senate", "the rendered panel does not name a chamber");
has(HTML_OUT, "Roster listing", "the rendered listing is not marked as a roster listing");

// ─────────────────────────────────────────────────────────────────────────────
// 3 · No district dimension at all
// ─────────────────────────────────────────────────────────────────────────────
section("3 · the archive has no district concept to get wrong");

[
  "keyRacesRelevantData", "_pdxVoterBallot", "_pdxResolveVoter", "_ballotCandidates",
  "_currentVoterLocation", "_pdxHouseRedistrict", "KEY_RACES_BY_LOCATION",
  "districtsResolvable", "stateHouseDistrict", "stateSenateDistrict",
].forEach((n) => lacks(AB, n, `archive-browse.js reads ${n} — the archive must not touch ballot geometry`));

ok(!/District\s*\+|['"]District ['"]|district\s*[:=]\s*\d/.test(AB),
   "archive-browse.js appears to compose a district label, which a roster slice has no business doing");

// The one thing it is allowed to take from the resolver is a STATE, and only to
// pre-narrow a listing. Assert that is all it takes.
has(AB, "reps.state", "the archive panel no longer pre-narrows to the reader's state");
lacks(AB, "reps.levels", "the archive panel reads the resolver's seat levels — those are ballot claims");
lacks(AB, "reps.area", "the archive panel reads the resolver's curated area");

// A reader in a state with no district mapping still gets a full chamber list,
// and it is a state list under a STATE heading — not a district heading.
{
  const host = stubEl();
  const w = sandbox({
    roster: ROSTER, type: TYPE, state: STATE,
    reps: { located: true, state: "Ohio", districtsResolvable: false, levels: [] },
    hosts: { "#who-represents-me .wrm-inner": host },
  });
  const p = w.PDXArchiveBrowse;
  eq(p._sel().state, "Ohio", "an Ohio reader's listing did not pre-narrow to Ohio");
  const out = p._html();
  has(out, "U.S. Senate · Ohio", "the Ohio reader's listing is not headed by chamber and state");
  lacks(out, "District", "an unmapped-state reader's archive listing mentions a district");

  // Pre-narrowing follows the reader's state until they narrow it themselves.
  p.select("senator", "Utah", true);
  p.sync();
  eq(p._sel().state, "Utah", "the reader's own choice of state was overwritten by the resolver's");
}
{
  // A reader who moves is not left reading the state they left.
  const host = stubEl();
  let where = "Ohio";
  const w = sandbox({ roster: ROSTER, type: TYPE, state: STATE, hosts: { "#who-represents-me .wrm-inner": host } });
  w.pdxRepsForMe = () => ({ located: true, state: where, districtsResolvable: where === "Utah", levels: [] });
  w.PDXArchiveBrowse.sync();
  eq(w.PDXArchiveBrowse._sel().state, "Ohio", "an Ohio reader's listing did not narrow to Ohio");
  where = "Utah";
  w.PDXArchiveBrowse.select("representative", undefined);
  eq(w.PDXArchiveBrowse._sel().state, "Utah",
     "a reader whose location moved is still being shown the roster of the state they left");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · No invented members, no silent truncation
// ─────────────────────────────────────────────────────────────────────────────
section("4 · every row is a roster pid, and a cut list says it was cut");

P.roster("senator", "Ohio").forEach((r) =>
  ok(Object.prototype.hasOwnProperty.call(ROSTER, r.pid),
     `the listing produced ${r.pid}, which is not in the roster it was given`));
eq(P.roster("senator", "Nevada").length, 0, "a state with nobody in the roster produced rows");

// Click-through goes to the person file, by pid.
{
  const host = stubEl();
  const w = sandbox({ roster: ROSTER, type: TYPE, state: STATE, hosts: { "#who-represents-me .wrm-inner": host } });
  w.PDXArchiveBrowse.open("oh_sen_a");
  eq(w.__opened.join(","), "oh_sen_a", "a row click did not open the person file for that pid");
  has(AB, "window.PDXPerson", "archive-browse no longer opens rows through PDXPerson");
}

// The empty slice explains itself rather than rendering a blank box.
{
  P.select("representative", "Ohio");
  const out = P._html();
  has(out, "No one in the archive is filed under", "an empty archive slice rendered without saying why it is empty");
  P.select("senator", "Ohio");
}

// The cap is stated with the number withheld.
has(AB, "Showing the first", "the archive listing truncates without saying so");
has(AB, "more are in this listing", "the archive listing does not say how many rows it withheld");
ok(typeof P.CAP === "number" && P.CAP > 0, "the archive listing cap is not a stated number");

// ─────────────────────────────────────────────────────────────────────────────
// 5 · Not sorted by party
// ─────────────────────────────────────────────────────────────────────────────
section("5 · the archive does not lead with party");

lacks(AB, ".party", "archive-browse.js reads a party field — party is not a sort or a group here");
lacks(AB, "_pdxPartyChip", "archive-browse.js renders a party chip in its listing");
{
  const list = P.roster("representative", "Utah");
  eq(list.map((r) => r.pid).join(","), "ut_rep_a,ut_rep_b,ut_rep_c",
     "the listing is not officeholders-then-candidates, alphabetical inside each");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 · District numbers stay Utah-only, through one gate
// ─────────────────────────────────────────────────────────────────────────────
section("6 · 'your district' goes through the one districtsResolvable gate");

has(CH, "function _pdxDistrictsMine()",
    "compare-hub lost the single gate for 'may this reader be told a district is theirs'");
has(CH, "reps.districtsResolvable",
    "compare-hub's district gate no longer asks the resolver's districtsResolvable");

// Both producers of a reader-facing district number must ask the gate first.
["_myteamDistrictNum", "_myteamOwnDistricts"].forEach((fn) => {
  const i = CH.indexOf(`function ${fn}(`);
  must(i !== -1, `${fn} is gone from compare-hub — this probe is stale`);
  const body = CH.slice(i, i + 420);
  has(body, "_pdxDistrictsMine()",
      `${fn} produces a district number for the reader without asking the district gate — a visitor whose city name collides with a Utah town gets a Utah district`);
});

// The gate closes only on an explicit negative, so an un-located visitor is
// not newly broken by it.
{
  const gate = CH.slice(CH.indexOf("function _pdxDistrictsMine()"), CH.indexOf("function _myteamDistrictNum("));
  has(gate, "!reps.located", "the district gate no longer passes an un-located visitor through unchanged");
  has(gate, "return !!reps.districtsResolvable", "the district gate does not end on the resolver's own flag");
}

// ─────────────────────────────────────────────────────────────────────────────
// 7 · Federal-first is a direction, not a promise
// ─────────────────────────────────────────────────────────────────────────────
section("7 · the growth line commits to an order, not a date");

has(P.GROWTH, "federal depth first", "the growth line no longer states the federal-first order");
has(P.GROWTH, "then state chambers", "the growth line does not say what comes after federal");
ok(!/\b20\d\d\b|\bQ[1-4]\b|\bby (?:the )?(?:end|spring|summer|fall|winter)\b|\bsoon\b|\bcoming\b/i.test(P.GROWTH),
   "the growth line promises a date or an imminence");
ok(!/\b\d+\s*%|\bcomplete\b|\ball 50\b|\bevery state\b|\bfull coverage\b/i.test(P.GROWTH),
   "the growth line makes a completeness or coverage claim");
// A short chamber is explained as coverage, not as an empty office.
has(P.GROWTH, "not that the chamber is empty",
    "the growth line lets a thin chamber read as a vacant office");
has(INDEX, "not that nobody holds the seats",
    "Door 1's browse empty state lets an untracked chamber read as a vacant office");
has(INDEX, "building federal depth first",
    "Door 1's browse empty state does not state the federal-first order");

// No coverage percentage anywhere in the module, and no grade.
ok(!/\d+\s*%/.test(AB), "archive-browse.js prints a percentage — coverage is not a grade");

// ─────────────────────────────────────────────────────────────────────────────
// 8 · Wired, mounted inside existing surfaces, and not a new door
// ─────────────────────────────────────────────────────────────────────────────
section("8 · wired on the non-blocking path, no new top-level door");

has(INDEX, 'src="/archive-browse.js"', "index.html does not load archive-browse.js");
has(INDEX, 'href="/archive-browse.css" media="print"', "archive-browse.css is not on the non-blocking swap path");
has(INDEX, '<noscript><link rel="stylesheet" href="/archive-browse.css" /></noscript>',
    "archive-browse.css has no <noscript> fallback");
ok(INDEX.indexOf('src="/archive-browse.js"') > INDEX.indexOf('src="/compare-hub.js"'),
   "archive-browse.js loads before compare-hub.js, whose classifiers it borrows");

// It appends into two hosts that already exist in the document.
has(INDEX, 'id="who-represents-me"', "the Who Represents Me host is gone");
has(INDEX, 'class="wrm-inner"', "the .wrm-inner mount point is gone");
has(INDEX, 'id="browse-toolbar"', "the browse toolbar host is gone");
has(INDEX, 'class="browse-state-scope"', "the .browse-state-scope mount point is gone");
has(AB, "#who-represents-me .wrm-inner", "the archive band no longer mounts under the seat rows");
has(AB, "#browse-toolbar .browse-state-scope", "the archive lost its Door 1 chamber entry point");

// The Door 1 chips drive Door 1's OWN filter rather than rendering a second list.
has(AB, "myteam-browse-office", "the Door 1 chamber chips no longer drive Door 1's office filter");
has(AB, "window.myteamBrowseFilter", "the Door 1 chamber chips do not re-run Door 1's own browse filter");
// …and they carry Door 1's labels for Door 1's buckets. Door 1 files Governor
// with the other statewide executives, so a chip named "Governor" would
// misdescribe the list it produces.
has(INDEX, '<option value="governor">Statewide Exec</option>',
    "Door 1's statewide-executive filter option changed name — the archive chip label must follow it");
has(AB, "Statewide exec", "the archive's statewide-executive chip is not labelled the way Door 1's bucket actually behaves");
lacks(AB, "label: 'Governor'", "an archive chip is labelled Governor while the filter behind it returns every statewide executive");

// One global, appended chrome, no nav.
const GLOBALS = (AB.match(/window\.PDX[A-Za-z]+\s*=/g) || []);
eq(GLOBALS.length, 1, `archive-browse.js attaches ${GLOBALS.length} PDX globals; it owns exactly one`);
has(AB, "window.PDXArchiveBrowse =", "archive-browse.js does not attach window.PDXArchiveBrowse");
lacks(AB, "nav-pill", "archive-browse.js adds a nav pill — this phase adds no top-level door");
lacks(AB, "innerHTML = ''", "archive-browse.js blanks something it does not own");

// The band mounts once, no matter how many times it paints.
{
  const host = stubEl();
  host.appendChild = function (c) { c.parentNode = host; host.children.push(c); return c; };
  const w = sandbox({ roster: ROSTER, type: TYPE, state: STATE, hosts: { "#who-represents-me .wrm-inner": host } });
  const bands = () => host.children.filter((c) => c.id === "ab-wrm").length;
  must(bands() >= 1, "the archive band never mounted into .wrm-inner — this probe is stale");
  // Make the band findable by id, the way a real document would.
  w.__byId["ab-wrm"] = host.children.filter((c) => c.id === "ab-wrm")[0];
  w.PDXArchiveBrowse.sync();
  w.PDXArchiveBrowse.sync();
  eq(bands(), 1, "the archive band mounted more than once — repainting duplicates it");
}

// It states; it does not gate. No pick store, no roster of its own, no storage.
["localStorage", "sessionStorage", "PDXBallotWorkspace", "TEAM_POSITIONS", "ISSUE_STANCE_DATA", "fetch("]
  .forEach((n) => lacks(AB, n, `archive-browse.js touches ${n} — it is a listing, not an engine`));

// The Utah reference implementation is documented rather than half-extended.
must(existsSync(join(ROOT, "DISTRICT_MAPS.md")), "DISTRICT_MAPS.md is gone — this probe is stale");
const DOC = R("DISTRICT_MAPS.md");
has(DOC, "districtsResolvable", "the district-map doc does not name the single extension point");
has(DOC, "No half-mapped state", "the district-map doc does not state the no-half-mapped-state rule");
has(DOC, "_pdxDistrictsMine", "the district-map doc does not list the gate every surface goes through");

// ─────────────────────────────────────────────────────────────────────────────
// 9 · Nothing else in the shipped app calls a browse list a ballot
// ─────────────────────────────────────────────────────────────────────────────
section("9 · no shipped surface labels an archive listing as the reader's ballot");

const SHIPPED = readdirSync(ROOT).filter((f) => f.endsWith(".js") && f !== "sw.js");
must(SHIPPED.length > 10, "the shipped-module scan found almost nothing — this probe is stale");
SHIPPED.forEach((f) => {
  const src = CODE(f);
  ["your ballot seat", "on your ballot: browse", "browse your representatives"].forEach((n) =>
    lacks(src.toLowerCase(), n, `${f} labels a browse listing as the reader's ballot`));
});

// The real roster, through the real classifiers: the archive's chamber buckets
// must agree with the BALLOT's own senate/governor tests over every person in
// the roster. Two surfaces disagreeing about who is a U.S. senator is the drift
// this whole file exists to prevent.
{
  const ctx = vm.createContext({});
  ctx.window = ctx;
  new vm.Script(R("cmp-data.js"), { filename: "cmp-data.js" }).runInContext(ctx);
  const DATA = ctx.CMP_DATA;
  must(DATA && Object.keys(DATA).length > 100, "cmp-data.js did not load — this probe is stale");

  // The ballot's own office tests, lifted from voter-hub-location.js by name so
  // this stays a comparison of the shipped logic rather than a copy of it.
  const VHL = R("voter-hub-location.js");
  const senSrc = VHL.slice(VHL.indexOf("function _pdxIsUsSenatorOffice"));
  const govSrc = VHL.slice(VHL.indexOf("function _pdxIsGovernorOffice"));
  must(senSrc.startsWith("function _pdxIsUsSenatorOffice") && govSrc.startsWith("function _pdxIsGovernorOffice"),
       "the ballot's senate/governor office tests could not be located — this probe is stale");
  const cut = (s) => s.slice(0, s.indexOf("\n  }") + 4);
  const probe = vm.createContext({});
  probe.window = probe;
  new vm.Script(cut(senSrc) + "\n" + cut(govSrc) +
                "\nthis.isSen = _pdxIsUsSenatorOffice; this.isGov = _pdxIsGovernorOffice;",
                { filename: "office-tests" }).runInContext(probe);
  must(typeof probe.isSen === "function" && typeof probe.isGov === "function",
       "the lifted office tests did not evaluate — this probe is stale");

  let sen = 0, gov = 0, senDisagree = [], govDisagree = [];
  Object.keys(DATA).forEach((pid) => {
    const office = DATA[pid].office || "";
    if (probe.isSen(office)) { sen++; if (TYPE_FROM_TEXT(office) !== "senator") senDisagree.push(pid + ":" + office); }
    if (probe.isGov(office)) { gov++; if (TYPE_FROM_TEXT(office) !== "governor") govDisagree.push(pid + ":" + office); }
  });
  must(sen > 20 && gov > 5, `the roster probe found only ${sen} senators / ${gov} governors — this probe is stale`);
  eq(senDisagree.length, 0,
     `the ballot calls these U.S. Senate offices but the archive files them elsewhere: ${senDisagree.slice(0, 4).join(" | ")}`);
  eq(govDisagree.length, 0,
     `the ballot calls these Governor offices but the archive files them elsewhere: ${govDisagree.slice(0, 4).join(" | ")}`);
}


console.log("");
if (failures.length) {
  console.error(`✗ archive browse: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ archive browse: the archive is browsable by chamber and state, and no listing claims a seat — ${passed} assertions passed\n`);
