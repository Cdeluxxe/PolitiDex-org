#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-document.mjs — a person file is a DOCUMENT, and so is the card on it
// ─────────────────────────────────────────────────────────────────────────────
// /p/<pid> has been rewritten to person.html for a while. That was never the
// problem. The problem was that every OTHER way of reaching a person ignored it.
//
// WHAT A READER ACTUALLY MET, before this pass:
//
//   · Tapping a name on the home page, in the Eye, on a Word-Record modal or on
//     a share card called window.openModal directly. openModal is the RENDERER —
//     it paints a person's file into #modal-content — and it never asked which
//     document it was painting into. So a senator's record arrived as an overlay
//     on index.html: the homepage's entire apparatus still loaded underneath,
//     none of person.html's own markup, sections or CSS, and '/' in the address
//     bar while one human being's file filled the screen.
//   · The issue dossier had no document at all. Its only address was a HASH on
//     the front page — #record=lee~tough_on_crime — put there with replaceState
//     and painted with no history entry. So Back did not close the card. Back
//     took the page away and left the sheet, or left the site.
//   · And the modules disagreed about all of it. person-file.js asked "does the
//     URL name a person?" (true on /?p=<pid>, which is index.html, so it
//     rendered). share-links.js converted ?record= to #record= and stripped the
//     query on EVERY document including the person file, where nothing reads the
//     hash. receipt-cards.js opened the hash wherever it found it. ballot.html
//     had already solved its own copy of the problem privately.
//
// The fix is the same move /ballot got: one document per person, reached by
// GOING there, with the card as an address on that document.
//
// WHAT MUST STAY TRUE — the six tests from the report, in order:
//
//   1. ONE FLAG, ONE OWNER. person.html declares window.__PDX_PERSON_DOC before
//      any module runs; PDXPerson.isPersonDoc() is the one reader. It is a fact
//      about the DOCUMENT, not about the address, which is the distinction the
//      whole defect came from.
//   2. A COLD /p/lee AND /p/mike_lee OPEN THE FILE, not the homepage — and the
//      alias replaceStates onto /p/lee only because it is already on a person
//      path.
//   3. OPENING A PERSON FROM ANYWHERE ELSE IS A NAVIGATION, with a push, so Back
//      returns to the list. Including from openModal itself, which is where the
//      dozen direct callers land.
//   4. ?issue= / ?record= OPEN THE CARD ON THAT DOCUMENT, Back closes the card
//      and stays on /p/lee, and a ?record= naming a different person opens
//      nothing at all.
//   5. #record= ON '/' IS A ONE-HOP REDIRECT, not a trapped overlay.
//   6. RETIRED IDS RESOLVE (scott_chew → chew_h68) and /p/null is never
//      published — the sentinel wall holds on the card form too.
//
//   node scripts/test-person-document.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const STRIP = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ person document: STALE HARNESS — ${m}`); process.exit(2); };

const PF_SRC = R("person-file.js");
const PERSON_HTML = R("person.html");
const TOML = R("netlify.toml");

// ─────────────────────────────────────────────────────────────────────────────
// The sandbox
// ─────────────────────────────────────────────────────────────────────────────
// A deliberately small browser. Two things it must model honestly, because both
// are the thing under test:
//
//   · THE THREE NAVIGATION SPELLINGS, APART. location.assign pushes an entry
//     (which is what makes Back mean "the list I came from"), location.replace
//     navigates and CONSUMES the entry (which is what a one-hop redirect needs,
//     and what a push must never be), and history.pushState/replaceState move
//     the bar without fetching anything. A harness that folded these together
//     could not tell a compliant redirect from the forward trap it replaced.
//   · A REAL HISTORY STACK, so "Back closes the card and stays on /p/lee" is
//     something that can be executed rather than merely asserted about.
function makeClock() {
  let now = 0, seq = 0;
  const q = [];
  return {
    setTimeout(f, ms) { const id = ++seq; q.push({ id, at: now + (Number(ms) || 0), f }); return id; },
    clearTimeout(id) { const i = q.findIndex((t) => t.id === id); if (i >= 0) q.splice(i, 1); },
    tick(ms) {
      const until = now + ms;
      for (let guard = 0; guard < 100000; guard++) {
        q.sort((a, b) => a.at - b.at || a.id - b.id);
        if (!q.length || q[0].at > until) break;
        const t = q.shift();
        now = t.at;
        try { t.f(); } catch (e) { /* the module swallows its own throws */ }
      }
      now = until;
    },
  };
}

const ROSTER = {
  lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah" },
  chew_h68: { name: "Scott Chew", office: "State Representative", state: "Utah" },
  maloy: { name: "Celeste Maloy", office: "U.S. Representative", state: "Utah" },
};
// The two alias tables the app really carries: a roster bridge (mike_lee → lee)
// and a voting-record retirement (scott_chew → chew_h68).
const ALIAS = { mike_lee: "lee", scott_chew: "chew_h68" };

function sandbox(opts) {
  opts = opts || {};
  const calls = {
    openModal: [], assign: [], locReplace: [], pushState: [], replaceState: [],
    openGap: [], closeGap: [], notice: [],
  };
  const clock = makeClock();
  const els = {};
  const el = (id) => {
    if (!els[id]) {
      const attrs = {};
      els[id] = {
        // consistency.js creates #pdxc-gap-back with hidden = true and flips it
        // on open. A harness that started it visible would tell person-file.js a
        // card is already up, and every card assertion below would pass by
        // doing nothing.
        id, hidden: id === "pdxc-gap-back", innerHTML: "", className: "", style: {},
        addEventListener() {}, setAttribute(k, v) { attrs[k] = String(v); },
        getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
        removeAttribute(k) { delete attrs[k]; },
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        querySelector() { return null; },
      };
    }
    return els[id];
  };
  const doc = {
    readyState: "complete",
    referrer: Object.prototype.hasOwnProperty.call(opts, "referrer") ? opts.referrer : "",
    _listeners: {},
    addEventListener(t, f) { (doc._listeners[t] = doc._listeners[t] || []).push(f); },
    getElementById: el,
    querySelector() { return null; },
    _el: el,
  };

  const start = opts.at || "/";
  const win = {
    document: doc,
    URL, URLSearchParams, encodeURIComponent, decodeURIComponent,
    CustomEvent: function (n, d) { return { type: n, detail: d && d.detail }; },
    Math, JSON, Object, String, Number, Array, RegExp, Date,
    _listeners: {},
    addEventListener(t, f) { (win._listeners[t] = win._listeners[t] || []).push(f); },
    dispatchEvent() { return true; },
    setTimeout: (f, ms) => clock.setTimeout(f, ms),
    clearTimeout: (id) => clock.clearTimeout(id),
    CMP_DATA: ROSTER,
    PROFILES: {},
    _pdxRosterState: "done",
    // The alias resolver the real app installs (PDXProfilePid), plus the
    // retirement table person-file.js reads directly.
    PDXProfilePid: (id) => ALIAS[id] || id,
    PDX_PROFILE_ALIAS: ALIAS,
    PDXPublicationFloor: { clears: () => true },
    PDXShareLinks: { notice(id, k, m) { calls.notice.push({ id, kicker: k, message: m }); return true; } },
    openModal(id) { calls.openModal.push(id); win._pdxCurrentProfileId = id; },
    // consistency.js's two functions, in the shape person-file.js wraps them in:
    // openGap returns TRUE for "a sheet is on screen with something in it", and
    // both drive #pdxc-gap-back's hidden flag, which is what cardOpenNow reads.
    PDXConsistency: {
      openGap(pid, key) {
        calls.openGap.push(pid + "~" + key);
        if (opts.gapFails) return false;
        doc._el("pdxc-gap-back").hidden = false;
        return true;
      },
      closeGap() { calls.closeGap.push(1); doc._el("pdxc-gap-back").hidden = true; },
    },
  };
  if (opts.personDoc) win.__PDX_PERSON_DOC = true;

  // ── The history stack, with a working Back ────────────────────────────────
  const stack = [start];
  let at = 0;
  const apply = (url) => {
    const u = new URL(url, "https://www.politidex.fyi");
    win.location.pathname = u.pathname;
    win.location.search = u.search;
    win.location.hash = u.hash;
  };
  win.location = {
    origin: "https://www.politidex.fyi", pathname: "/", search: "", hash: "",
    assign(u) { calls.assign.push(String(u)); },
    replace(u) { calls.locReplace.push(String(u)); },
    get href() { return this.origin + this.pathname + this.search + this.hash; },
    set href(u) { calls.assign.push(String(u)); },
  };
  apply(start);
  win.history = {
    get length() { return stack.length; },
    pushState(s, t, url) { calls.pushState.push(String(url)); stack.splice(at + 1); stack.push(String(url)); at = stack.length - 1; apply(url); },
    replaceState(s, t, url) { calls.replaceState.push(String(url)); stack[at] = String(url); apply(url); },
    back() { win.history.go(-1); },
    forward() { win.history.go(1); },
    go(n) {
      const want = at + (Number(n) || 0);
      if (want < 0 || want >= stack.length) { calls.assign.push("[left the site]"); return; }
      at = want;
      apply(stack[at]);
      (win._listeners.popstate || []).forEach((f) => { try { f({}); } catch (e) {} });
    },
  };
  win.window = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(PF_SRC, { filename: "person-file.js" }).runInContext(ctx);
  return {
    win, calls, clock, doc, P: win.PDXPerson,
    here: () => win.location.pathname + win.location.search,
    depth: () => stack.length,
  };
}

must(sandbox().P && typeof sandbox().P.isPersonDoc === "function",
  "PDXPerson.isPersonDoc is not exported — the whole pass hangs off that one question");

// ═════════════════════════════════════════════════════════════════════════════
// 1 · ONE FLAG, ONE OWNER
// ═════════════════════════════════════════════════════════════════════════════
section("1 · one document flag, declared once and read once");

// THE FLAG IS IN THE SHELL, AHEAD OF EVERY MODULE. share-links.js is
// NON-deferred in person.html's head and reads the flag synchronously, so a flag
// written after it — or written from a deferred script — would be read as absent
// on exactly the arrival it exists to fix.
ok(/window\.__PDX_PERSON_DOC\s*=\s*true/.test(PERSON_HTML),
  "person.html does not declare window.__PDX_PERSON_DOC — nothing downstream can tell which document it is on");
{
  const flagAt = PERSON_HTML.indexOf("__PDX_PERSON_DOC");
  const slAt = PERSON_HTML.indexOf("/share-links.js");
  ok(flagAt > -1 && slAt > -1 && flagAt < slAt,
    "the person-document flag is declared AFTER share-links.js, which reads it non-deferred on arrival");
}
// And nowhere else. Two documents claiming to be the person file is the same
// class of bug as none of them claiming it.
for (const shell of ["index.html", "ballot.html", "issue.html", "spotlight.html"]) {
  let src = "";
  try { src = R(shell); } catch (e) { continue; }
  ok(!/__PDX_PERSON_DOC\s*=\s*true/.test(src),
    `${shell} also declares __PDX_PERSON_DOC — only person.html may claim to be the person file`);
}

// THE READER IS A FACT ABOUT THE DOCUMENT. Not about the address: that
// conflation is the defect. /?p=<pid> names a person and is still index.html.
eq(sandbox({ at: "/", personDoc: false }).P.isPersonDoc(), false,
  "the homepage claims to be the person document");
eq(sandbox({ at: "/?p=mike_lee" }).P.isPersonDoc(), false,
  "the legacy /?p= form claims to be the person document — this is the exact conflation that painted modals on '/'");
eq(sandbox({ at: "/ballot" }).P.isPersonDoc(), false, "/ballot claims to be the person document");
eq(sandbox({ at: "/p/lee", personDoc: true }).P.isPersonDoc(), true,
  "person.html at a person path does not recognise itself");
// The server-side half: only the /p/* rewrite serves a document for a /p/ path,
// and it serves person.html — so a non-empty arrival path is the same claim,
// and it holds on a build served without the head block.
eq(sandbox({ at: "/p/lee", personDoc: false }).P.isPersonDoc(), true,
  "a document served FOR /p/<pid> does not recognise itself without the inline flag");

// ONE REWRITE, AND THE QUERY RIDES ON IT. ?issue= / ?record= need no rule of
// their own — a query does not participate in matching — which is the whole
// reason the card can live on this document.
ok(/from\s*=\s*"\/p\/\*"[\s\S]{0,120}?to\s*=\s*"\/person\.html"[\s\S]{0,80}?status\s*=\s*200/.test(TOML),
  "netlify.toml no longer rewrites /p/* to /person.html with a 200 — /p/<pid> would stop being a document");
{
  // First-match-wins: /ballot is exact and /p/* cannot claim it either way, but
  // the file must SAY so, because the next person to read it will wonder.
  const pAt = TOML.indexOf('from = "/p/*"');
  const bAt = TOML.indexOf('from = "/ballot"');
  ok(pAt > -1 && bAt > -1, "netlify.toml lost either the /p/* or the /ballot rule");
  ok(/first-match-wins/i.test(TOML.slice(Math.max(0, pAt - 2600), pAt)),
    "the /p/* rule is not documented against first-match-wins — the one thing a reader of this file will ask");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · A COLD /p/lee AND /p/mike_lee OPEN THE FILE
// ═════════════════════════════════════════════════════════════════════════════
section("2 · cold /p/lee and /p/mike_lee open the file, not the homepage");

for (const [asked, canon] of [["/p/lee", "lee"], ["/p/mike_lee", "lee"], ["/p/scott_chew", "chew_h68"]]) {
  const s = sandbox({ at: asked, personDoc: true });
  s.clock.tick(5000);
  eq(s.calls.openModal[0], canon,
    `a cold ${asked} did not open ${canon}'s file in place (saw openModal=${JSON.stringify(s.calls.openModal)}, assign=${JSON.stringify(s.calls.assign)})`);
  eq(s.calls.assign.length, 0,
    `a cold ${asked} navigated away from the document it was already served as (saw ${JSON.stringify(s.calls.assign)})`);
  // THE ALIAS CORRECTION, AND ITS ONE PRECONDITION. replaceState onto
  // /p/<canonical> is right here and forbidden from '/': it corrects an address
  // without changing which document is at it. stamp() gates on already being on
  // a person path for exactly that reason.
  eq(s.here(), "/p/" + canon,
    `${asked} did not settle on the canonical address (saw ${JSON.stringify(s.here())})`);
  ok(!s.calls.pushState.length,
    `${asked} gained a history entry correcting its own address — Back would re-resolve and correct again, which is a trap rather than a history`);
}
// …and the same correction is refused from the homepage, where it would leave
// index.html sitting under a person's address.
{
  const s = sandbox({ at: "/", personDoc: false });
  s.P.stamp("lee");
  ok(!s.calls.replaceState.some((u) => String(u).indexOf("/p/") === 0),
    `stamp() rewrote '/' onto a person path with replaceState (saw ${JSON.stringify(s.calls.replaceState)})`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · FROM ANYWHERE ELSE, OPENING A PERSON IS A NAVIGATION
// ═════════════════════════════════════════════════════════════════════════════
section("3 · a click from /ballot or / goes to /p/<pid>, and Back returns to the list");

for (const from of ["/", "/ballot", "/issue/box-elder-stratos-data-center", "/i/healthcare"]) {
  const s = sandbox({ at: from, personDoc: false });
  eq(s.P.open("mike_lee"), true, `open() reported failure from ${from}`);
  eq(s.calls.assign[s.calls.assign.length - 1], "/p/lee",
    `opening a person from ${from} did not go to their document (saw assign=${JSON.stringify(s.calls.assign)})`);
  eq(s.calls.openModal.length, 0,
    `opening a person from ${from} painted a modal on that document instead (saw ${JSON.stringify(s.calls.openModal)})`);
  // THE TWO MECHANISMS THAT WOULD LOSE THE LIST. Both put the right address in
  // the bar; neither leaves an entry behind, so Back would skip the surface the
  // reader was working through.
  eq(s.calls.locReplace.length, 0,
    `opening a person from ${from} used location.replace, which consumes the entry Back needs (saw ${JSON.stringify(s.calls.locReplace)})`);
  ok(!s.calls.replaceState.some((u) => String(u).indexOf("/p/") === 0),
    `opening a person from ${from} stamped the address with replaceState instead of navigating (saw ${JSON.stringify(s.calls.replaceState)})`);
}

// THE RENDERER ITSELF IS GUARDED, which is where the dozen direct callers land.
// Asserted on the source rather than by executing 593 KB of profiles-full.js:
// what matters is that openModal asks isPersonDoc BEFORE it paints, and that it
// cannot recurse into PDXPerson.open's own openModal fallback.
{
  const PFULL = R("profiles-full.js");
  const at = PFULL.indexOf("function openModal(id)");
  ok(at > -1, "profiles-full.js no longer declares openModal(id) — this check needs rewriting");
  const head = PFULL.slice(at, at + 4200);
  ok(/isPersonDoc\(\)/.test(head),
    "openModal does not ask PDXPerson.isPersonDoc() before painting — every direct caller is back to painting a person over the wrong document");
  const ask = head.indexOf("isPersonDoc()");
  const paint = head.indexOf("_pdxHoldAlign(true)");
  ok(ask > -1 && paint > -1 && ask < paint,
    "openModal asks which document it is on AFTER it starts painting — the guard has to come first or it is decoration");
  ok(/_pdxOpenModalNavTried/.test(head),
    "openModal's navigation guard has no re-entrancy latch — PDXPerson.open falls back to openModal, so this is mutual recursion, not a fallback");
}

// AND /ballot'S OWN OVERRIDE IS STILL THERE. It is the reference implementation
// of this move and predates it; the guard above must not have made it redundant
// in a way that tempts someone to delete it, because it also covers the case
// where person-file.js has not executed yet.
{
  const B = STRIP(R("ballot.html"));
  ok(/showProfile/.test(B) && /location\.assign/.test(B),
    "ballot.html no longer overrides showProfile with a navigation — the surface where losing your place costs the most");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · THE CARD IS AN ADDRESS ON THE PERSON'S DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("4 · ?issue= / ?record= open the card, and Back closes it without leaving");

// ── The address itself ────────────────────────────────────────────────────
{
  const s = sandbox({ at: "/p/lee", personDoc: true });
  eq(s.P.cardPath("lee", "tough_on_crime"), "/p/lee?issue=tough_on_crime",
    "the card's canonical address is not /p/<pid>?issue=<key>");
  eq(s.P.cardPath("mike_lee", "tough_on_crime"), "/p/lee?issue=tough_on_crime",
    "the card address does not canonicalise its pid — an alias would publish a second address for one card");
  eq(s.P.cardUrl("lee", "tough_on_crime"), "https://www.politidex.fyi/p/lee?issue=tough_on_crime",
    "the absolute form of the card address drifted from the path form");
  // ?issue= rather than ?record=<pid>~<key> for what the app WRITES: the pid is
  // already in the path, and two claims about who this is can disagree.
  ok(s.P.cardPath("lee", "tough_on_crime").indexOf("record=") === -1,
    "the app's own card address repeats the pid in the query, which is a second claim that can contradict the path");
}

// ── ?issue= on arrival ────────────────────────────────────────────────────
{
  const s = sandbox({ at: "/p/lee?issue=tough_on_crime", personDoc: true });
  s.clock.tick(8000);
  eq(s.calls.openModal[0], "lee", "the card arrival did not open the person's file first");
  eq(s.calls.openGap[0], "lee~tough_on_crime",
    `the card named in the address did not open (saw ${JSON.stringify(s.calls.openGap)})`);
  eq(s.here(), "/p/lee?issue=tough_on_crime",
    `the arrival moved the address the reader arrived at (saw ${JSON.stringify(s.here())})`);
  // A CARD THE READER ARRIVED ON HAS NOTHING OF OURS BEHIND IT, so it must not
  // push. Pushing here means the first Back puts the reader back on the card
  // they were already looking at.
  eq(s.calls.pushState.length, 0,
    `the arrival pushed a history entry for a card that was already in the address (saw ${JSON.stringify(s.calls.pushState)})`);
}

// ── ?record=<pid>~<issue> on arrival, which is what a shared card carries ──
{
  const s = sandbox({ at: "/p/lee?record=lee~tough_on_crime", personDoc: true });
  s.clock.tick(8000);
  eq(s.calls.openGap[0], "lee~tough_on_crime",
    `the published ?record= form did not open the card it names (saw ${JSON.stringify(s.calls.openGap)})`);
  eq(s.here(), "/p/lee?record=lee~tough_on_crime",
    "the ?record= query was stripped or rewritten on the document that owns it");
}
// An alias in the query still matches the path it resolves to.
{
  const s = sandbox({ at: "/p/lee?record=mike_lee~tough_on_crime", personDoc: true });
  s.clock.tick(8000);
  eq(s.calls.openGap[0], "lee~tough_on_crime",
    "a ?record= carrying an alias for the person in the path was refused");
}
// ── AND A CARD THAT NAMES SOMEBODY ELSE OPENS NOTHING ─────────────────────
// The path wins the document, and the mismatch wins nothing. A dossier about Lee
// must never appear on Maloy's file because a URL was hand-edited or truncated.
{
  const s = sandbox({ at: "/p/maloy?record=lee~tough_on_crime", personDoc: true });
  s.clock.tick(8000);
  eq(s.calls.openGap.length, 0,
    `a ?record= naming a different person than the path opened a card anyway (saw ${JSON.stringify(s.calls.openGap)})`);
  eq(s.calls.openModal[0], "maloy", "…and the file the PATH names must still open");
}
// A key that is not key-shaped is refused rather than escaped into a guess.
for (const bad of ["", "tough on crime", "../../etc", "a~b"]) {
  const s = sandbox({ at: "/p/lee?issue=" + encodeURIComponent(bad), personDoc: true });
  s.clock.tick(8000);
  eq(s.calls.openGap.length, 0, `?issue=${JSON.stringify(bad)} opened something`);
}

// ── BACK CLOSES THE CARD AND STAYS ON /p/lee ──────────────────────────────
// The whole point of the pass, executed rather than asserted about: open the
// card by a tap (which pushes), then go back, and check both halves — the sheet
// is down AND the reader is still on the person's file.
{
  const s = sandbox({ at: "/p/lee", personDoc: true });
  s.clock.tick(8000);                       // arrive, mount, install the openGap wrap
  const before = s.depth();
  s.win.PDXConsistency.openGap("lee", "tough_on_crime");
  eq(s.here(), "/p/lee?issue=tough_on_crime",
    `a tap on an issue did not put the card in the address (saw ${JSON.stringify(s.here())})`);
  eq(s.depth(), before + 1,
    "the card did not add a history entry — this is the trapped overlay: Back has nothing of the card to undo");
  eq(s.doc._el("pdxc-gap-back").hidden, false, "the sheet is not on screen after a tap");

  s.win.history.back();
  eq(s.here(), "/p/lee",
    `Back from the card did not stay on the person's file (saw ${JSON.stringify(s.here())})`);
  eq(s.doc._el("pdxc-gap-back").hidden, true,
    "Back left the sheet on screen — the address moved and the overlay did not, which is the live defect");
  ok(!s.calls.assign.includes("[left the site]"),
    "Back from the card left the site instead of closing the card");
  eq(s.calls.openModal.length, 1,
    `Back from the card re-opened the file underneath it (saw ${JSON.stringify(s.calls.openModal)})`);
}
// FORWARD PUTS IT BACK. A history that only works in one direction is not a
// history; and re-opening rather than assuming is what makes a Forward onto a
// DIFFERENT issue show that issue.
{
  const s = sandbox({ at: "/p/lee", personDoc: true });
  s.clock.tick(8000);
  s.win.PDXConsistency.openGap("lee", "tough_on_crime");
  s.win.history.back();
  s.win.history.forward();
  eq(s.here(), "/p/lee?issue=tough_on_crime", "Forward did not return to the card's address");
  eq(s.doc._el("pdxc-gap-back").hidden, false, "Forward left the sheet closed at the card's own address");
}
// THE SHEET'S OWN × AND THE BROWSER'S BACK ARE THE SAME GESTURE. closeGap is
// wrapped for exactly this: two ways out of one overlay that disagree is how a
// reader ends up with a card's address and no card.
{
  const s = sandbox({ at: "/p/lee", personDoc: true });
  s.clock.tick(8000);
  s.win.PDXConsistency.openGap("lee", "tough_on_crime");
  s.win.PDXConsistency.closeGap();
  eq(s.here(), "/p/lee", `closing the sheet left its address in the bar (saw ${JSON.stringify(s.here())})`);
}
// A SHEET THAT COULD NOT BE ASSEMBLED LEAVES NO ADDRESS. openGap returns false
// when there is nothing to show; writing the card's URL anyway would promise a
// card that is not there.
{
  const s = sandbox({ at: "/p/lee", personDoc: true, gapFails: true });
  s.clock.tick(8000);
  s.win.PDXConsistency.openGap("lee", "tough_on_crime");
  eq(s.here(), "/p/lee", "a sheet that refused to open still wrote its address");
}
// AND ON A DOCUMENT THAT IS NOT THE PERSON FILE, NOTHING IS WRAPPED — because a
// card has no address there. A person open on those pages is a navigation, and
// the card comes with the file.
{
  const s = sandbox({ at: "/", personDoc: false });
  s.clock.tick(8000);
  eq(s.P.hookGap(), false, "the openGap wrap was installed on a document that cannot address a card");
}

// ── ONE NAVIGATION, NOT TWO, FROM A CHIP ON ANOTHER DOCUMENT ──────────────
// The front page's issue chip used to write #record= into location.hash. It now
// goes to the card's own address, so Back means the page the chip was tapped on
// rather than two Backs to leave a card the reader never navigated to.
{
  const s = sandbox({ at: "/", personDoc: false });
  eq(s.P.goToCard("mike_lee", "tough_on_crime"), true, "goToCard reported failure for a resolvable pair");
  eq(s.calls.assign[s.calls.assign.length - 1], "/p/lee?issue=tough_on_crime",
    `goToCard did not push the card's address (saw ${JSON.stringify(s.calls.assign)})`);
  const s2 = sandbox({ at: "/", personDoc: false });
  s2.P.open("mike_lee", { issue: "tough_on_crime" });
  eq(s2.calls.assign[s2.calls.assign.length - 1], "/p/lee?issue=tough_on_crime",
    "open() with an issue took two hops to the card instead of one");
}
{
  const H = STRIP(R("hero-showcase.js"));
  const at = H.indexOf("function openIssue");
  ok(at > -1, "hero-showcase.js no longer declares openIssue — this check needs rewriting");
  ok(/goToCard/.test(H.slice(at, at + 700)),
    "hero-showcase.js's issue chip no longer routes through PDXPerson.goToCard — it is back to writing a hash on the front page");
}

// ── share-links.js LEAVES ?record= ALONE ON THIS DOCUMENT ─────────────────
// It used to convert ?record= to #record= and STRIP the query, on every document
// including this one — so a reader following a shared card arrived on the right
// person's file with the card's address erased and no hash router to act on it.
{
  const SL = R("share-links.js");
  ok(/__PDX_PERSON_DOC/.test(SL),
    "share-links.js does not ask which document it is on — it will strip the person file's own ?record= again");
  ok(/DOC_OWNED/.test(SL) && /docOwns\(/.test(SL),
    "share-links.js has no notion of a param the document owns, so the skip cannot be scoped to one");
  const cs = SL.indexOf("function cleanedSearch");
  ok(cs > -1 && /docOwns\(/.test(SL.slice(cs, cs + 900)),
    "cleanedSearch() still strips every param unconditionally — the person file's ?record= goes with it");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · #record= ON '/' IS A REDIRECT, NOT AN OVERLAY
// ═════════════════════════════════════════════════════════════════════════════
section("5 · no #record= handler on '/' paints a trapped overlay");

{
  const RC = R("receipt-cards.js");
  const at = RC.indexOf("function handleHash(retry)");
  ok(at > -1, "receipt-cards.js no longer declares handleHash(retry) — this check needs rewriting");
  const body = RC.slice(at, at + 3000);
  ok(/location\.replace\(/.test(body),
    "the #record= handler no longer redirects — it is back to painting a gap sheet over whatever document it found");
  // replace, not assign. The hash form is a WAYPOINT: leaving its entry behind
  // makes Back bounce the reader through an address that redirects them forwards
  // again, which is the classic redirect trap.
  ok(!/location\.assign\(/.test(body),
    "the #record= handler navigates with assign, which leaves the hash address in the history as a forward trap");
  ok(/recordPathFor/.test(body) && /isPersonDoc/.test(RC),
    "the #record= redirect does not check whether it is already on the person document — that is a redirect loop waiting for a module-list change");
  const hop = RC.indexOf("recordPathFor");
  const warmAt = body.indexOf("warm(pid)");
  ok(hop > -1 && (warmAt === -1 || body.indexOf("location.replace(") < warmAt),
    "the redirect happens after the retry/warm loop — the page fetches a record for a card it is not going to paint");
  // The hash still CONVERTS. Links carrying it are on images and in messages,
  // and a live link has to keep landing where it promised.
  ok(/SHARE_HASH\s*=\s*'record'/.test(RC),
    "receipt-cards.js dropped SHARE_HASH = 'record' — the hash form stopped being recognised at all, so old links go nowhere");
}
// The person document does not load the hash router, and must not start to: it
// is the share-IMAGE engine, and the dossier's address is now a query this file
// reads itself.
// Matched against a SCRIPT TAG, not against the file — person.html's own comment
// blocks name receipt-cards.js repeatedly, precisely to record that it is not
// loaded here, so a plain grep would fail on the documentation.
ok(!/<script[^>]*src="[^"]*receipt-cards\.js"/.test(PERSON_HTML),
  "person.html now loads receipt-cards.js — the person file does not need the share-image engine to show its own card");

// THE LEGACY /?p=<pid> FORM IS THE SAME MOVE. Not a render (that is the modal on
// '/'), and not a push (Back → /?p= → resolves → pushes forward again).
{
  const s = sandbox({ at: "/?p=mike_lee", personDoc: false });
  s.P.open("mike_lee");
  eq(s.calls.locReplace[s.calls.locReplace.length - 1], "/p/lee",
    `the legacy /?p= form did not redirect onto the person document (saw locReplace=${JSON.stringify(s.calls.locReplace)}, assign=${JSON.stringify(s.calls.assign)})`);
  eq(s.calls.openModal.length, 0, "the legacy /?p= form still painted a modal on '/'");
  eq(s.calls.assign.length, 0, "the legacy /?p= form pushed, which is the forward trap");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · RETIRED IDS RESOLVE, AND /p/null IS NEVER PUBLISHED
// ═════════════════════════════════════════════════════════════════════════════
section("6 · retired ids resolve, sentinels get no address at all");

{
  const s = sandbox({ at: "/p/lee", personDoc: true });
  eq(s.P.resolve("scott_chew"), "chew_h68", "the retirement table stopped resolving scott_chew");
  eq(s.P.path("scott_chew"), "/p/scott_chew",
    "path() started canonicalising, which would hide the alias arrival stamp() exists to correct");
  eq(s.P.cardPath("scott_chew", "lands_local"), "/p/chew_h68?issue=lands_local",
    "a card address for a retired id does not resolve to the record's own document");
  // THE SENTINEL WALL, ON THE CARD FORM TOO. encodeURIComponent(null) === 'null';
  // a missing pid does not vanish through String(), it turns into a word, and
  // /p/null was once the second most visited path in this app.
  for (const bad of ["null", "undefined", "NaN", "", null, undefined]) {
    eq(s.P.cardPath(bad, "tough_on_crime"), "",
      `cardPath(${JSON.stringify(bad)}) minted an address for a politician who does not exist`);
    eq(s.P.cardUrl(bad, "tough_on_crime"), "",
      `cardUrl(${JSON.stringify(bad)}) minted an absolute address for a politician who does not exist`);
  }
}
// And the same wall on the published record link, which is the one that travels.
{
  const SL = R("share-links.js");
  const at = SL.indexOf("record: function (pid, issueKey)");
  ok(at > -1, "share-links.js no longer declares API.record — this check needs rewriting");
  const body = SL.slice(at, at + 400);
  ok(/personRecord/.test(body),
    "API.record no longer delegates to personRecord — two spellers of one address is how the edge and the client drifted apart");
  ok(!/\/\?record=/.test(body),
    "API.record still publishes the homepage query form, so a shared card unfurls as PolitiDex-in-general");
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · BACK FROM /p/lee IS THE DOCUMENT YOU CAME FROM
// ═════════════════════════════════════════════════════════════════════════════
section("7 · Back — and the × — return to /ballot, or to '/' when there was no came-from");

// A cold deep link has nothing of ours behind it. back() there takes the reader
// off the site, so the close goes to the front door instead — which is the
// answer this has always given.
{
  const s = sandbox({ at: "/p/lee", personDoc: true, referrer: "" });
  s.P.restore();
  eq(s.calls.assign[s.calls.assign.length - 1], "/",
    `a cold deep link's close did not leave for the root (saw assign=${JSON.stringify(s.calls.assign)})`);
}
// An off-site referrer is not ours either. A link from a tweet or a search
// result must not turn the × into "go back to Twitter".
{
  const s = sandbox({ at: "/p/lee", personDoc: true, referrer: "https://t.co/abc" });
  s.P.restore();
  eq(s.calls.assign[s.calls.assign.length - 1], "/",
    "an off-site referrer was treated as a surface of ours to go back to");
}
// A SAME-ORIGIN REFERRER IS. This is the /ballot case, and it is the one where
// losing your place costs the most: the list the reader was working through is
// the whole reason they were on that page.
{
  // The fixture is the reported journey: the reader is on /ballot, taps a name,
  // and the click becomes a real entry for /p/lee. `at` is /ballot so the
  // referrer and the entry behind agree, which is what a click actually leaves.
  const s = sandbox({ at: "/ballot", personDoc: true, referrer: "https://www.politidex.fyi/ballot" });
  s.win.history.pushState(null, "", "/p/lee");
  const before = s.calls.assign.length;
  s.P.restore();
  eq(s.calls.assign.length, before,
    `the close navigated instead of going back, so the × and the Back button disagree (saw ${JSON.stringify(s.calls.assign)})`);
  eq(s.here(), "/ballot",
    `closing the file did not return to the ballot it was opened from (saw ${JSON.stringify(s.here())})`);
}
// A referrer that is THIS path is this document re-entered — a reload, a hash
// step — not a surface to return to.
{
  const s = sandbox({ at: "/p/lee", personDoc: true, referrer: "https://www.politidex.fyi/p/lee" });
  s.P.restore();
  eq(s.calls.assign[s.calls.assign.length - 1], "/",
    "a referrer pointing at this very file was treated as somewhere else to go back to");
}
// AND ON INDEX.HTML THE CLOSE IS STILL AN OVERLAY CLOSE. There genuinely is a
// page underneath the homepage's profile modal, so closing it must not navigate.
{
  const s = sandbox({ at: "/", personDoc: false });
  s.P.restore();
  eq(s.calls.assign.length, 0,
    `closing the homepage's own profile modal navigated away from the page underneath it (saw ${JSON.stringify(s.calls.assign)})`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 8 · AND NOTHING ON THE DO-NOT LIST MOVED
// ═════════════════════════════════════════════════════════════════════════════
section("8 · no new key, no second score, no new module on the shell");

// The critical path is "only what the person file needs". A card is an address
// and a sheet, not a reason to drag the homepage's stack onto this document.
// Read the TAGS, not the prose: person.html's comment blocks name these modules
// repeatedly, precisely to record that they are NOT here. A denylist that
// grepped the whole file would fail on its own documentation.
const TAG_SRCS = (() => {
  const out = [];
  const re = /<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = re.exec(PERSON_HTML))) out.push(m[1]);
  return out;
})();
must(TAG_SRCS.length > 20, `person.html yielded only ${TAG_SRCS.length} asset tags — the tag scan is broken, not the shell`);
for (const mod of ["compare-hub.js", "ballot-workspace.js", "door1-workspace.js", "receipt-cards.js"]) {
  ok(!TAG_SRCS.some((u) => u.endsWith("/" + mod) || u === mod),
    `person.html now loads ${mod} — the person document gained a layer it does not need to show a record`);
}
// Root-absolute assets. /p/<pid> is two segments deep and the rewrite returns
// 200 for anything under it, so a relative src would resolve to /p/<file>, match
// the rewrite, and hand the browser HTML to parse as JavaScript.
{
  const rel = TAG_SRCS.filter((u) => !/^(?:https?:|\/\/|\/|#|data:|mailto:)/.test(u));
  eq(rel.length, 0,
    `person.html carries a relative asset path (${JSON.stringify(rel.slice(0, 4))}) — from /p/lee that requests /p/<file> and gets this document back as text/html`);
}
// person-file.js is the one owner of the card's address, and it renders nothing.
{
  const PF = STRIP(PF_SRC);
  ok(/openGap/.test(PF), "person-file.js no longer references openGap — the card has no sheet to drive");
  ok(!/innerHTML/.test(PF.slice(PF.indexOf("function openCard"), PF.indexOf("function closeCard") + 400)),
    "person-file.js's card lane started rendering — consistency.js owns the sheet, this file owns the address");
  // No second score, no new key, no party read. The card is an address.
  for (const banned of ["partyMatch", "party_score", "directionScore", "secondScore"]) {
    ok(!new RegExp(banned).test(PF), `person-file.js gained ${banned} — no new metric was in scope`);
  }
}
// The service worker has to rename its shell cache, or a warm device serves the
// old person.html (no flag) against the new person-file.js (which reads it) —
// the one combination where every card address silently does nothing.
{
  const SW = R("sw.js");
  const m = SW.match(/const CACHE_VERSION = 'v(\d+)'/);
  ok(m && Number(m[1]) >= 193,
    `sw.js CACHE_VERSION is ${m ? "v" + m[1] : "unreadable"} — a warm device would serve the old shell against the new document`);
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ person document: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`\n✓ person document: one document per person, one address per card — ${passed} assertions passed`);
console.log("   /p/<pid> is the only way in · the card pushes and pops · Back closes the card, not the site\n");
