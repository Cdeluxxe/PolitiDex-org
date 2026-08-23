#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-race-share.mjs — a compared race and a filled slate leave as real artifacts
// ─────────────────────────────────────────────────────────────────────────────
// Two share controls were added and one was repaired. All three are the same
// promise: what leaves the device opens the thing it names, and says only what
// is true about it.
//
//   1. THE URL SHAPE. /?race=<seat>&cands=<ids>&rmode=<ruler>, root-anchored,
//      and /?team=<token>#my-politicians the same way. Neither is ever pasted
//      onto location.pathname, which is how a team shared from /vote/119/house/12
//      came back as a roll-call address carrying a team token.
//   2. THE CONTROL IS ON AN OPEN SHEET, AND ONLY THERE. No open seat, no field
//      to describe, no button — and pdxRaceSheetShare() called anyway fails
//      visibly rather than emitting a link to the front page.
//   3. THE LINK RESOLVES TO THE SAME SEAT. The query converts to a hash, the
//      hash opens that seatKey, and the sender's candidate ids are pinned back
//      into a field the recipient's own location would not have resolved.
//   4. THE MODE LABEL MATCHES THE RULER. record → "ranked by formal record vs my
//      positions", stated → "ranked by stated positions", and a sender with no
//      positions claims no ranking at all.
//   5. NO PARTY, NO PERCENTAGE, NO BLEND. Not in the composed text, not in the
//      URL, not on the arrival note.
//   6. PRIVACY. The sender's stance list does not travel and neither does their
//      computed order — `cands` is roster order, not rank order. The recipient
//      re-ranks locally, and with no stances gets the existing unranked state
//      plus one line saying the order is theirs.
//   7. THE TEAM SHARE. One pick per office, office labels, names, no slate-wide
//      figure; ≥1 resolvable pick required; replace and clear show up on the
//      next build; a pick the roster dropped is named, not silently omitted.
//   8. FAILURE IS HONEST. Native share is classified in one place, a cancel says
//      nothing, a refusal falls back to copy, and no success signal is printed
//      over a share that did not happen.
//   9. TARGETS AND DRIFT. 44px, and not one score moved.
//
//   node scripts/test-race-share.mjs
//
// Real shipped modules in a node:vm sandbox, real roster, real profile data.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
  "issue-colors.js",
  "my-stances.js",
  "voter-hub-location.js",
  "compare-hub.js",
  "ballot-breakdown.js",
  "who-represents-me.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const SHEET = R("race-sheet.js");
const LINKS = R("share-links.js");

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// Same shape as the race-sheet harness, plus the ids the team surfaces paint
// into. Elements are pre-created for ids the page ships statically, because a
// module that cannot find its host silently does nothing and a test that never
// noticed would pass for the wrong reason.
const STATIC_IDS = [
  "who-represents-me", "wrm-reps", "vh-district-strip",
  "myteam-import-banner", "myteam-import-title", "myteam-import-sub",
  "myteam-import-load", "myteam-import-merge",
  "myteam-share-btn", "myteam-sharetext-btn", "myteam-share-toast",
  "myteam-summary-box", "myteam-saved-badge",
];
function miniDom(win) {
  const byId = {};
  const el = (id) => ({
    id: id || "", className: "", innerHTML: "", textContent: "", value: "",
    style: {}, dataset: {}, children: [], parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(k, v) { this["attr_" + k] = v; }, getAttribute(k) { return this["attr_" + k] ?? null; },
    removeAttribute() {}, addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; c.parentNode = this; return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    insertAdjacentHTML() {}, remove() {}, focus() {}, click() {}, select() {},
    scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
  });
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  win.document.execCommand = () => win.__execCopyOk !== false;
  STATIC_IDS.forEach((id) => { byId[id] = el(id); });
  return byId;
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = opts.store || {};
  const sess = opts.session || {};
  win.__store = store;
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = [];

  // The URL surface. vm contexts do not carry Node's URL globals, so the two
  // this pipeline actually parses with are handed in explicitly.
  win.URLSearchParams = URLSearchParams;
  win.URL = URL;
  win.location = {
    href: "https://politidex.fyi/", origin: "https://politidex.fyi",
    pathname: opts.pathname || "/", search: opts.search || "", hash: opts.hash || "",
  };
  win.__replaced = [];
  win.history = {
    state: null,
    replaceState(st, t, url) {
      win.__replaced.push(url);
      // Model the browser: a replaceState moves the address bar, which is what
      // the next reader of location.hash/search will see.
      const m = String(url).match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
      if (m) {
        win.location.pathname = m[1] || win.location.pathname;
        win.location.search = m[2] || "";
        win.location.hash = m[3] || "";
      }
    },
  };
  win.__shared = [];
  win.__copied = [];
  win.navigator = {
    userAgent: "node",
    share: opts.share === false ? undefined : function (p) {
      win.__shared.push(p);
      if (opts.shareOutcome === "cancel") { const e = new Error("x"); e.name = "AbortError"; return Promise.reject(e); }
      if (opts.shareOutcome === "fail") { const e = new Error("x"); e.name = "NotAllowedError"; return Promise.reject(e); }
      return Promise.resolve();
    },
    clipboard: opts.clipboard === false ? undefined : {
      writeText(t) {
        win.__copied.push(t);
        return opts.clipboardFails ? Promise.reject(new Error("denied")) : Promise.resolve();
      },
    },
  };
  if (opts.share === false) delete win.navigator.share;
  if (opts.clipboard === false) delete win.navigator.clipboard;
  if (opts.execCopyOk === false) win.__execCopyOk = false;
  // The team token is base64url; the browser globals it is built from are not
  // in a vm context.
  win.btoa = (x) => Buffer.from(String(x), "binary").toString("base64");
  win.atob = (x) => Buffer.from(String(x), "base64").toString("binary");
  win.escape = globalThis.escape;
  win.unescape = globalThis.unescape;
  win.Buffer = Buffer;
  win.HashChangeEvent = class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } };
  win.Event = class { constructor(t) { this.type = t; } };

  miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  // Document order: share-links.js is deferred at the top of index.html, the
  // sync feature scripts run during parse, and race-sheet.js is the last defer.
  // Booting in a different order would test an arrival path the browser never
  // takes.
  try { vm.runInContext(LINKS, sandbox, { filename: "share-links.js" }); }
  catch (e) { win.__loadErrors.push("share-links.js: " + e.message); }
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, sandbox, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  if (!opts.withoutSheet) {
    try { vm.runInContext(SHEET, sandbox, { filename: "race-sheet.js" }); }
    catch (e) { win.__loadErrors.push("race-sheet.js: " + e.message); }
  }
  win.PROFILES = win.CMP_DATA;
  if (opts.located !== false) {
    win._hasUserLocation = true;
    win._currentVoterLocation = opts.location ||
      { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
  }
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) { return; }
  console.error(`✗ race share: HARNESS STALE — ${msg}`);
  process.exit(2);
};

const sheetHtml = (win) => {
  const ov = win.document.getElementById("pdx-racesheet-overlay");
  return ov ? String(ov.innerHTML) : "";
};

// ── The fixture seat ─────────────────────────────────────────────────────────
const probe = boot();
must(typeof probe.PDXShareLinks === "object",
  `share-links.js did not export — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe.pdxRaceSheetShare === "function", "pdxRaceSheetShare is not exposed");
must(typeof probe._ballotCandidates === "function", "the ballot roster is not loaded");

const SEAT = "senate";
const FIELD0 = probe.PDXRaceSheet._field(SEAT);
must(FIELD0.length >= 2, `the fixture seat "${SEAT}" no longer has a field of 2+ candidates`);
const FIELD_PIDS = FIELD0.map((c) => c.pid);
// A seat this build can name but has no field for under the Provo fixture —
// the case where a share control would describe an empty comparison.
const EMPTY_SEAT = ["house", "statesenate", "statehouse", "local"]
  .filter((k) => probe.PDXRaceSheet._seat(k) && probe.PDXRaceSheet._field(k).length === 0)[0];
must(EMPTY_SEAT, "no seat in the fixture resolves to an empty field any more");
// A pid nothing will ever resolve — the fail-closed case, on both surfaces.
const GHOST = "pdx-retired-nobody-000";
must(!probe.CMP_DATA[GHOST], "the ghost pid is somehow in the roster");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · The URL shape, root-anchored");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot();
  const SL = w.PDXShareLinks;

  eq(SL.race("senate", { cands: ["a", "b"], rmode: "record" }),
     "https://politidex.fyi/?race=senate&cands=a%2Cb&rmode=record",
     "race(): seat, field and ruler in one addressable query");
  eq(SL.race("senate", {}), "https://politidex.fyi/?race=senate",
     "race(): a bare seat is a valid link — cands and rmode are both optional");
  eq(SL.race("senate", { rmode: "all" }), "https://politidex.fyi/?race=senate",
     "race(): a ruler this sheet does not have is dropped rather than emitted");
  eq(SL.race(""), "https://politidex.fyi/", "race(): no seat, no claim");
  eq(SL.team("TOKEN123"), "https://politidex.fyi/?team=TOKEN123#my-politicians",
     "team(): the wire token is passed through untouched and lands on the slate");
  eq(SL.team(""), "", "team(): no token, no link");

  // The whole reason these live in share-links.js.
  const onVote = boot({ pathname: "/vote/119/house/12" });
  eq(onVote.PDXShareLinks.race("senate", {}), "https://politidex.fyi/?race=senate",
     "race(): a share taken from a /vote/ address does not inherit that path");
  has(onVote._ballotLoad ? "ok" : "ok", "ok", "ballot store present");
  const teamUrl = onVote.PDXShareLinks.team("TOK");
  lacks(teamUrl, "/vote/",
     "team(): the roll-call path is gone — this is the defect that put a 'we couldn't open that roll call' notice over a slate that had loaded fine");

  // Query → hash, with the two extra segments carried the way #issue= carries its own.
  // Read at call time from the live query — resolve() has already consumed and
  // stripped the real one by now, which is itself the contract.
  const h = boot();
  h.location.search = "?race=senate&cands=aa,bb&rmode=stated";
  eq(h.PDXShareLinks._hashFor("race", "senate"), "#race=senate&cands=aa%2Cbb&rmode=stated",
     "hashFor(): the seat is the address and the rest rides along");
  eq(h.PDXShareLinks._hashFor("race", ""), "", "hashFor(): an empty seat opens nothing");
  h.location.search = "?race=../etc";
  eq(h.PDXShareLinks._hashFor("race", "../etc"), "#race=etc",
     "hashFor(): a seat key is sanitised to the alphabet the alias table speaks");

  // resolve() strips what it consumed and leaves the rest of the query alone.
  const r = boot({ search: "?race=senate&cands=aa&rmode=record&utm=x" });
  has(r.location.hash, "#race=senate", "arrival: the query became the hash the app opens");
  has(r.location.search, "utm=x", "arrival: a param this pipeline does not own is left alone");
  lacks(r.location.search, "race=", "arrival: the consumed param is stripped from the address bar");
  lacks(r.location.search, "cands=", "arrival: cands is stripped with it");
  lacks(r.location.search, "rmode=", "arrival: rmode is stripped with it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · The control lives on an open sheet, and only there");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot();
  eq(w.PDXRaceSheet._shareBits(), null, "closed sheet: there is nothing to describe");
  lacks(sheetHtml(w), "rs-share-btn", "closed sheet: no share control painted");

  w.pdxOpenRaceSheet(SEAT);
  const open = sheetHtml(w);
  has(open, 'id="rs-share-btn"', "open sheet: the share control is present");
  has(open, "Share this race", "open sheet: it says what it does");
  has(open, "window.pdxRaceSheetShare()", "open sheet: it is wired to the composer");

  w.pdxRaceSheetClose();
  eq(w.PDXRaceSheet._shareBits(), null, "after close: nothing to describe again");

  // A seat with no field would emit a link to an empty comparison.
  const e = boot();
  e.pdxOpenRaceSheet(EMPTY_SEAT);
  const empty = sheetHtml(e);
  has(empty, "No candidates on file for this seat yet",
      "empty seat: the sheet still mounts and says so");
  lacks(empty, "rs-share-btn",
      "empty seat: no share control over a comparison with nobody in it");

  // Pressed with no sheet open: a visible failure, not a link to the front page.
  const f = boot();
  const p = f.pdxRaceSheetShare();
  ok(p && typeof p.then === "function", "share(): always returns a promise so a caller can react");
  eq(f.__shared.length, 0, "share() with no open sheet did not hand anything to the platform");
  eq(f.__copied.length, 0, "share() with no open sheet did not copy anything either");
  ok(f.document.getElementById("pdx-race-share-failed"),
     "share() with no open sheet put a visible notice up rather than failing silently");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The link opens the same seat, with the sender's field pinned back");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot();
  w.pdxOpenRaceSheet(SEAT);
  const bits = w.PDXRaceSheet._shareBits();
  must(bits && bits.url, "shareBits produced nothing for the fixture seat");
  has(bits.url, "?race=senate", "the link names the seat that is open");
  FIELD_PIDS.forEach((pid) => {
    has(decodeURIComponent(bits.url), pid, `the link carries candidate id ${pid}`);
  });

  // Round trip, in a second sandbox that never saw the sender.
  const q = bits.url.slice(bits.url.indexOf("?"));
  const r = boot({ search: q });
  const read = r.PDXRaceSheet._readRaceHash();
  must(read, "the shared query did not become a race hash on arrival");
  eq(read.seat, "senate", "arrival: the same seat key came back out");
  eq(read.pins.join(","), FIELD_PIDS.join(","), "arrival: the sender's field came back out intact");
  eq(sheetHtml(r).indexOf("rs-rankline") >= 0, true, "arrival: the race sheet actually mounted");
  has(sheetHtml(r), "Opened from a shared link", "arrival: the sheet says where it came from");

  // A recipient whose own ballot resolves NOTHING for this seat still sees the
  // race that was shared — that is what the pinned ids are for.
  const far = boot({ search: q, location: { state: "Texas", city: "Austin" } });
  const farHtml = sheetHtml(far);
  ok(farHtml.length > 0, "arrival out of state: a sheet mounted rather than nothing");
  FIELD_PIDS.forEach((pid) => {
    const nm = far.CMP_DATA[pid] && far.CMP_DATA[pid].name;
    if (nm) has(farHtml, nm, `arrival out of state: ${nm} is on the sheet because the link carried the id`);
  });

  // Pins are per-open. A sheet opened normally afterwards must not still be
  // showing somebody else's field.
  far.pdxRaceSheetClose();
  far.pdxOpenRaceSheet(SEAT);
  lacks(sheetHtml(far), "Opened from a shared link",
    "a later ordinary open does not inherit the shared-link state");

  // A pinned id nothing resolves is counted and named, never dropped in silence.
  const ghosted = boot({ search: "?race=senate&cands=" + encodeURIComponent(FIELD_PIDS[0] + "," + GHOST) });
  const gh = sheetHtml(ghosted);
  has(gh, "no longer on file", "arrival: an unresolvable id in the link is reported");
  eq(ghosted.PDXRaceSheet._missingPins([FIELD_PIDS[0], GHOST]).join(","), GHOST,
     "missingPins names exactly the ids the roster cannot answer for");

  // A seat key this sheet does not speak lands on the reader's own seats.
  const bad = boot({ search: "?race=notaseat" });
  eq(bad.PDXRaceSheet._seat("notaseat"), null, "the bogus seat is genuinely unknown");
  ok(bad.document.getElementById("pdx-race-unresolved"),
     "unknown seat: the reader is told the link did not resolve rather than shown the front page");
  lacks(sheetHtml(bad), "rs-rankline", "unknown seat: no sheet was mounted over nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · The mode label matches the ruler that was active");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ISS = Object.keys(probe.ISSUE_MAP || {}).slice(0, 3);
  const withStances = () => {
    const w = boot();
    ISS.forEach((k) => w.alignToggleIssue(k));
    return w;
  };

  const rec = withStances();
  eq(rec.pdxRaceSheetMatchMode(), "record", "record is still the default ruler on this surface");
  rec.pdxOpenRaceSheet(SEAT);
  const rb = rec.PDXRaceSheet._shareBits();
  has(rb.text, "Ranked by formal record vs my positions",
      "record mode: the share says which ruler ordered the field, and whose positions did it");
  has(rb.url, "rmode=record", "record mode: the ruler travels with the link");

  const sta = withStances();
  sta.pdxRaceSheetMode("stated");
  sta.pdxOpenRaceSheet(SEAT);
  const sb = sta.PDXRaceSheet._shareBits();
  has(sb.text, "Ranked by stated positions", "stated mode: the other ruler, named exactly");
  lacks(sb.text, "formal record", "stated mode: the record clause did not leak across");
  has(sb.url, "rmode=stated", "stated mode: the ruler travels with the link");

  // A sender with no positions ranked nothing, and the share must not imply they did.
  const bare = boot();
  bare.pdxOpenRaceSheet(SEAT);
  const bb = bare.PDXRaceSheet._shareBits();
  has(bb.text, "no positions set", "no stances: the share admits nothing was ranked");
  lacks(bb.text, "Ranked by", "no stances: no ruler is claimed");

  // And the ruler in the link is the ruler on arrival.
  const arrive = boot({ search: "?race=senate&rmode=stated" });
  eq(arrive.pdxRaceSheetMatchMode(), "stated", "arrival: the shared ruler is the active ruler");
  // …and it is still the ruler once the reader has positions of their own to
  // rank with. The link named a ruler, not a result.
  ISS.forEach((k) => arrive.alignToggleIssue(k));
  arrive.pdxOpenRaceSheet(SEAT);
  has(sheetHtml(arrive), "stated positions",
      "arrival: the sheet's own rank line names the ruler the link carried");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · No party, no percentage, no blend — on anything that leaves");
// ═════════════════════════════════════════════════════════════════════════════
const PARTY = [
  "Republican", "Democrat", "Democratic", "GOP", "(R)", "(D)", "R-", "D-",
  "party", "Party", "loyalty", "beats their", "across the aisle",
];
{
  const w = boot();
  Object.keys(w.ISSUE_MAP || {}).slice(0, 4).forEach((k) => w.alignToggleIssue(k));
  w.pdxOpenRaceSheet(SEAT);
  const b = w.PDXRaceSheet._shareBits();
  const composed = [b.title, b.text, b.url].join("\n");

  PARTY.forEach((p) => lacks(composed, p, `composed race share carries no "${p}"`));
  ok(!/\d+\s*%/.test(composed),
     "composed race share prints no percentage — there is no number in it to mistake for a match");
  ok(!/\bscore/i.test(composed),
     "composed race share never uses the word score, so it cannot promise every candidate has one");
  ok(!/\bevery candidate\b/i.test(composed) || /not/i.test(composed),
     "composed race share makes no blanket claim about the whole field");
  lacks(composed, "Direction Match",
     "composed race share does not export the per-person integrity read as if it ranked the field");

  // The arrival note the recipient reads.
  const q = b.url.slice(b.url.indexOf("?"));
  const arrivalHtml = sheetHtml(boot({ search: q }));
  PARTY.forEach((p) => lacks(arrivalHtml.split('data-rk')[0].slice(0, 4000), p,
     `the shared-arrival note carries no "${p}"`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · Privacy — positions do not travel, and neither does the order");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot();
  const ISS = Object.keys(w.ISSUE_MAP || {}).slice(0, 5);
  ISS.forEach((k) => w.alignToggleIssue(k));
  w.pdxOpenRaceSheet(SEAT);
  const b = w.PDXRaceSheet._shareBits();
  const url = decodeURIComponent(b.url);

  ISS.forEach((k) => lacks(url, k, `the sender's stance on ${k} is not in the URL`));
  lacks(url, "pdx_my_stances", "the stance store key is not in the URL");
  lacks(url, "stances", "nothing in the URL is named after the sender's positions");
  const params = url.slice(url.indexOf("?") + 1).split("&").map((s) => s.split("=")[0]).sort();
  eq(params.join(","), "cands,race,rmode",
     "the link carries exactly three things: the seat, the field and the ruler");

  // cands is ROSTER order, not the order the sender's positions produced. This
  // is the difference between sending someone a race and sending them a verdict.
  const ranked = w.PDXRaceSheet._rank(w.PDXRaceSheet._field(SEAT), "record", true);
  const rankOrder = ranked.ranked.concat(ranked.gap).map((c) => c.pid).join(",");
  eq(b.pids.join(","), FIELD_PIDS.join(","), "cands is the roster order the field resolves in");
  ok(b.pids.join(",") === FIELD_PIDS.join(","),
     "cands is not rebuilt from rank(), so the sender's computed order cannot ride along");
  if (rankOrder !== FIELD_PIDS.join(",")) {
    ok(b.pids.join(",") !== rankOrder,
       "and where the two differ, the link provably carries the roster order rather than the ranked one");
  } else { passed++; }

  // The recipient with no positions: the sheet opens honestly and claims nothing.
  const q = b.url.slice(b.url.indexOf("?"));
  const recip = boot({ search: q });
  eq(recip.PDXRaceSheet._axis().length, 0, "the recipient genuinely has no positions set");
  const rh = sheetHtml(recip);
  has(rh, "Nothing is ranking this field yet",
      "recipient with no stances: the existing unranked honesty is what they get");
  has(rh, "this order is yours, not theirs",
      "recipient with no stances: the sheet says the sender's positions did not come with the link");
  has(rh, "Set my positions", "recipient with no stances: the CTA is still the way forward");
  lacks(rh, "Your Match · record</span><span class=\"rs-pct\">",
      "recipient with no stances: no match figure was fabricated for them");
  ok(!/sender.s ranking/i.test(rh),
      "there is no 'sender's ranking at share time' snapshot to label, because none is sent");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · Share my team — offices, names, and every gap named");
// ═════════════════════════════════════════════════════════════════════════════
const TEAM_KEY = "politidex_my_team";
const team = (slots) => ({ [TEAM_KEY]: JSON.stringify(slots) });
const tok = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
{
  // The empty state. No picks, no link, no success signal.
  const none = boot({ store: {} });
  const r0 = none.ballotShareTeamLink();
  must(r0 && typeof r0.then === "function", "ballotShareTeamLink no longer returns a promise");
  eq(none.__shared.length, 0, "no picks: nothing was handed to the platform");
  eq(none.__copied.length, 0, "no picks: nothing was copied");
  has(none.document.getElementById("myteam-share-toast").textContent, "Add at least one pick",
      "no picks: an honest empty state instead of a link to an empty slate");

  // A slate of ids the roster cannot name is not a slate.
  const ghostOnly = boot({ store: team({ senate: GHOST }) });
  ghostOnly.ballotShareTeamLink();
  eq(ghostOnly.__shared.length, 0,
     "a team whose only pick is unresolvable does not travel as a slate of blanks");

  // Three picks, one per office.
  const picks = { senate: FIELD_PIDS[0], governor: "cox" };
  const w = boot({ store: team(picks) });
  must(w.CMP_DATA.cox, "the fixture governor pick left the roster");
  w.ballotShareTeamLink();
  eq(w.__shared.length, 1, "a filled slate goes to the platform once");
  const p = w.__shared[0];
  has(p.url, "?team=", "team share: the link carries the slate token");
  has(p.url, "#my-politicians", "team share: it lands on the slate, not the homepage");
  lacks(p.url, "/vote/", "team share: root-anchored");
  has(p.text, "U.S. Senate: " + w.CMP_DATA[FIELD_PIDS[0]].name,
      "team share: office label, then the name, one row per office");
  has(p.text, "Governor: Spencer Cox", "team share: the second office too");
  ok(!/\d+\s*%/.test(p.title + p.text),
     "team share: no slate-wide figure, because six picks against six fields do not average into one");
  PARTY.forEach((s) => lacks(p.title + "\n" + p.text + "\n" + p.url, s,
     `team share carries no "${s}"`));

  // Replace a pick — the next build says so.
  const w2 = boot({ store: team({ senate: FIELD_PIDS[1], governor: "cox" }) });
  w2.ballotShareTeamLink();
  has(w2.__shared[0].text, "U.S. Senate: " + w2.CMP_DATA[FIELD_PIDS[1]].name,
      "replacing a pick is reflected on the next share build");
  lacks(w2.__shared[0].text, "U.S. Senate: " + w2.CMP_DATA[FIELD_PIDS[0]].name,
      "and the replaced pick is gone from it — one pick per office, still");

  // Clear — back to the empty state.
  const w3 = boot({ store: team({}) });
  w3.ballotShareTeamLink();
  eq(w3.__shared.length, 0, "clearing the team returns the control to its empty state");

  // A stored pick the roster later dropped is NAMED, not omitted.
  const w4 = boot({ store: team({ senate: FIELD_PIDS[0], house: GHOST }) });
  w4.ballotShareTeamLink();
  has(w4.__shared[0].text, "U.S. House: pick no longer on file",
      "a dropped pick fails closed per seat rather than shrinking the slate in silence");
  has(w4.__shared[0].text, "U.S. Senate: " + w4.CMP_DATA[FIELD_PIDS[0]].name,
      "and the rest of the slate still travels");

  // The plain-text share carries the same link, not the front page.
  const w5 = boot({ store: team({ senate: FIELD_PIDS[0], house: GHOST }) });
  w5.ballotShareTeam();
  const copied = w5.__copied.join("\n");
  has(copied, "?team=", "copy-text share: the pasted text opens this exact team");
  has(copied, "pick no longer on file", "copy-text share: the dropped pick is named there too");
  ok(!/Build yours → https:\/\/politidex\.fyi #/.test(copied),
     "copy-text share: the generic homepage sign-off is gone");
}
{
  // ── Arrival ───────────────────────────────────────────────────────────────
  const t = tok({ v: 1, n: "Ann Team", s: { senate: FIELD_PIDS[0], house: GHOST, governor: "cox" } });
  const a = boot({ search: "?team=" + t });
  const banner = a.document.getElementById("myteam-import-banner");
  const sub = a.document.getElementById("myteam-import-sub");
  eq(banner.style.display, "", "arrival: the import banner is shown");
  has(a.document.getElementById("myteam-import-title").innerHTML, "Ann Team",
      "arrival: the slate is named");
  has(sub.innerHTML, "U.S. Senate", "arrival: office labels, from the ballot's own vocabulary");
  has(sub.innerHTML, a.CMP_DATA[FIELD_PIDS[0]].name, "arrival: the pick for that office");
  has(sub.innerHTML, "Governor", "arrival: every seat in the link gets a row");
  has(sub.innerHTML, "pick no longer on file",
      "arrival: the seat whose id is gone says so — it is not dropped out of the list");
  has(sub.innerHTML, "1 of 3 picks in this link is not on our roster any more",
      "arrival: and the shortfall is counted out loud");
  eq(a.document.getElementById("myteam-import-load").style.display, "",
     "arrival: with resolvable picks, the load action is offered");

  // Nothing resolvable: the news still arrives, the write action does not.
  const dead = boot({ search: "?team=" + tok({ v: 1, n: "Gone", s: { senate: GHOST } }) });
  eq(dead.document.getElementById("myteam-import-banner").style.display, "",
     "arrival with nothing resolvable: the reader is still told a link arrived");
  has(dead.document.getElementById("myteam-import-sub").innerHTML, "pick no longer on file",
      "arrival with nothing resolvable: and told why it is empty");
  eq(dead.document.getElementById("myteam-import-load").style.display, "none",
     "arrival with nothing resolvable: the action that would write an unreadable slate is withdrawn");
  eq(dead.document.getElementById("myteam-import-merge").style.display, "none",
     "…and so is merge");

  // A shared team must not silently overwrite the reader's own ballot.
  const mine = boot({ store: team({ senate: FIELD_PIDS[1] }), search: "?team=" + t });
  eq(JSON.parse(mine.__store[TEAM_KEY]).senate, FIELD_PIDS[1],
     "arrival: the reader's own ballot is untouched until they choose to load or merge");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · Failure honesty — nothing claims to have happened that did not");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Dismissing the share sheet is a choice. It is not a failure, and it is not
  // an invitation to put the link on the clipboard behind the reader's back.
  const c = boot({ shareOutcome: "cancel" });
  c.pdxOpenRaceSheet(SEAT);
  const rc = await c.pdxRaceSheetShare();
  eq(c.__shared.length, 1, "cancelled: the platform sheet was opened");
  eq(rc.outcome, "cancelled", "cancelled: reported as a cancellation, not a failure");
  eq(c.__copied.length, 0, "cancelled: nothing was copied instead");
  ok(!c.document.getElementById("pdx-race-share-failed"),
     "cancelled: no error notice — the reader did this on purpose");
  lacks(sheetHtml(c), "Shared", "cancelled: the button does not claim success");

  // A platform that refuses falls back to the clipboard, and says which happened.
  const f = boot({ shareOutcome: "fail" });
  f.pdxOpenRaceSheet(SEAT);
  const rf = await f.pdxRaceSheetShare();
  eq(f.__copied.length, 1, "refused share: falls back to the clipboard");
  has(f.__copied[0], "?race=senate", "refused share: and what lands there is the real link");
  eq(rf.ok, true, "refused share: the fallback is a success, and is reported as one");
  eq(rf.outcome, "copied", "refused share: reported as a copy, not as a share");

  // No share sheet at all: straight to the clipboard, no error.
  const n = boot({ share: false });
  n.pdxOpenRaceSheet(SEAT);
  const rn = await n.pdxRaceSheetShare();
  eq(n.__shared.length, 0, "no platform share: nothing was attempted there");
  eq(rn.outcome, "copied", "no platform share: the clipboard path is used");
  ok(!n.document.getElementById("pdx-race-share-failed"),
     "no platform share: a working fallback is not an error");

  // Nothing works. The link itself is put in front of the reader.
  const d = boot({ share: false, clipboard: false, execCopyOk: false });
  d.pdxOpenRaceSheet(SEAT);
  const rd = await d.pdxRaceSheetShare();
  eq(rd.ok, false, "no route at all: reported as a failure");
  const note = d.document.getElementById("pdx-race-share-failed");
  ok(note, "no route at all: a visible notice, not a silent no-op");
  has(String(note.innerHTML) + String(note.textContent), "?race=senate",
      "no route at all: the notice hands over the link itself so the reader can copy it by hand");
  lacks(sheetHtml(d), "Link copied", "no route at all: the button never claims a copy that failed");

  // notice() is idempotent by id, so a second failure must clear the first or
  // it is silent — which is the same defect wearing a notice.
  await d.pdxRaceSheetShare();
  ok(d.document.getElementById("pdx-race-share-failed"),
     "a second failed attempt is announced again rather than swallowed by the first notice");

  // The clipboard permission prompt being denied is a failure, not a success.
  const cd = boot({ share: false, clipboardFails: true, execCopyOk: false });
  cd.pdxOpenRaceSheet(SEAT);
  const rcd = await cd.pdxRaceSheetShare();
  eq(rcd.ok, false, "denied clipboard: not reported as copied");
  ok(cd.document.getElementById("pdx-race-share-failed"), "denied clipboard: said out loud");
}
{
  // Team side, same bar.
  const c = boot({ store: team({ senate: FIELD_PIDS[0] }), shareOutcome: "cancel" });
  const okc = await c.ballotShareTeamLink();
  eq(okc, false, "team share cancelled: not reported as done");
  eq(c.__copied.length, 0, "team share cancelled: nothing copied behind the reader's back");
  lacks(c.document.getElementById("myteam-share-toast").textContent, "shared",
        "team share cancelled: no success toast");

  const f = boot({ store: team({ senate: FIELD_PIDS[0] }), shareOutcome: "fail" });
  const okf = await f.ballotShareTeamLink();
  eq(okf, true, "team share refused by the platform: the clipboard fallback carries it");
  has(f.__copied[0], "?team=", "team share fallback: the link, not a summary of it");

  const d = boot({ store: team({ senate: FIELD_PIDS[0] }), share: false,
                   clipboard: false, execCopyOk: false });
  const okd = await d.ballotShareTeamLink();
  eq(okd, false, "team share with no route: reported as a failure");
  lacks(d.document.getElementById("myteam-share-toast").textContent, "copied",
        "team share with no route: no copy claimed");
}
{
  // ── Source sweep ──────────────────────────────────────────────────────────
  // The guards only hold if every new emitter goes through the one pipeline.
  const RS = R("race-sheet.js"), BB = R("ballot-breakdown.js");

  has(RS, "SL.native(", "race share routes through PDXShareLinks.native");
  has(BB, "SL.native(", "team share routes through PDXShareLinks.native");
  ok(!/navigator\s*\.\s*share\s*\(/.test(RS),
     "race-sheet.js never calls navigator.share() itself — one place owns outcome classification");
  ok(!/navigator\s*\.\s*share\s*\(/.test(BB),
     "ballot-breakdown.js never calls navigator.share() itself either");
  ok(!/\.catch\(\s*function\s*\(\s*\)\s*\{\s*\}\s*\)/.test(RS),
     "race-sheet.js has no swallowed share rejection");
  ok(!/location\.pathname/.test(BB.slice(BB.indexOf("function _teamShareUrl"),
                                         BB.indexOf("function _teamShareUrl") + 700)),
     "_teamShareUrl is root-anchored — the /vote/ rewrite defect is gone");

  // No image path is used, so there is no artifact that could be zero bytes.
  // Asserted rather than assumed: a later canvas card would have to opt into
  // the guards below, and this line is what would notice it had not.
  ok(!/new\s+File\s*\(|toBlob\(|toDataURL\(/.test(RS),
     "race-sheet.js: the share path is a link, not a generated image");
  ok(!/new\s+File\s*\(|toBlob\(|toDataURL\(/.test(BB.slice(BB.indexOf("function _teamRoster"))),
     "ballot-breakdown.js: the team share path is a link, not a generated image");

  // …and the artifact guards themselves still refuse an empty one, for the
  // surfaces that do render images.
  const g = boot();
  eq(g.PDXShareLinks.MIN_ARTIFACT_BYTES, 64, "MIN_ARTIFACT_BYTES unchanged");
  eq(g.PDXShareLinks.blobOk({ size: 0 }), false, "a zero-byte blob is still refused");
  eq(g.PDXShareLinks.blobOk({ size: 63 }), false, "and so is one below the floor");
  eq(g.PDXShareLinks.blobOk({ size: 64 }), true, "a real one is still accepted");
  eq(g.PDXShareLinks.dataUrlOk("data:image/png;base64,"), false,
     "an empty data URL is still refused");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · Targets, and nothing drifted");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CSS = R("race-sheet.css");
  const shareCss = CSS.slice(CSS.indexOf(".rs-share {"));
  has(shareCss, "min-height: 44px", "the share control has no 44px target");
  const narrow = CSS.slice(CSS.indexOf("@media (max-width: 420px) { .rs-share-txt"));
  has(narrow, "min-width: 44px",
      "on a narrow phone the label hides — the target must not shrink with it");
  has(CSS, ".rs-hd-acts", "the header actions row is styled");
  has(CSS, ".rs-shared", "the shared-arrival note is styled");

  // Share sits beside Add/Replace, never over it.
  const w = boot();
  w.pdxOpenRaceSheet(SEAT);
  const html = sheetHtml(w);
  has(html, "rs-share-btn", "share is on the open sheet");
  ok(/rs-team|Add to my team|Replace my pick|On my team/i.test(html),
     "the team control is still there — share did not take its place");
}
{
  // ── Drift ─────────────────────────────────────────────────────────────────
  // This pass adds an address and a composer. It touches no ruler. If a single
  // score moves with the share path loaded, something in it read where it
  // should only have described.
  const base = boot({ withoutSheet: true });
  const live = boot();
  const pids = Object.keys(base.CMP_DATA || {}).slice(0, 120);
  const keys = Object.keys(base.ISSUE_MAP || {}).slice(0, 6);
  keys.forEach((k) => { base.alignToggleIssue(k); live.alignToggleIssue(k); });

  let drift = 0, checked = 0;
  pids.forEach((pid) => {
    ["record", "stated"].forEach((mode) => {
      const a = base._calcAlignmentScore(pid, { mode: mode });
      const b = live._calcAlignmentScore(pid, { mode: mode });
      checked++;
      if (JSON.stringify(a) !== JSON.stringify(b)) drift++;
    });
    const da = base._pdxLedgerSlot ? base._pdxLedgerSlot(pid) : null;
    const db = live._pdxLedgerSlot ? live._pdxLedgerSlot(pid) : null;
    checked++;
    if (JSON.stringify(da) !== JSON.stringify(db)) drift++;
  });
  ok(checked >= 300, `drift sweep only checked ${checked} values`);
  eq(drift, 0, `${drift} of ${checked} scores moved with the share path loaded`);

  // Composing a share is a read. It must not write a store, and it must not
  // enter a pick on the reader's ballot as a side effect of describing one.
  const w = boot({ store: team({ senate: FIELD_PIDS[0] }) });
  w.pdxOpenRaceSheet(SEAT);
  const before = JSON.stringify(w.__store);
  w.PDXRaceSheet._shareBits();
  sheetHtml(w);
  eq(JSON.stringify(w.__store), before, "composing a race share wrote to storage");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ race share: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✓ race share: ${passed} assertions passed\n`);
