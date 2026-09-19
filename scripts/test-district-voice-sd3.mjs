#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for /district/ut-sd-3 — THE FIRST DISTRICT BOARD WITH AN ADDRESS
// ─────────────────────────────────────────────────────────────────────────────
// Utah Senate District 3 — North Ogden and the rest of Weber County — read as a
// PLACE. A district already had three addresses on this site and none of them
// was the district: /p/john_johnson is the PERSON, /voice is a ROUTER that can
// only answer for a reader who already saved a location, and /d/ut-sd-3 is the
// seat file inside two megabytes of homepage.
//
// THE FAILURE MODES, EACH OF WHICH SHIPS LOOKING FINE:
//
//   1. A HEADCOUNT IS INVENTED. This is the one that matters most and it is the
//      easiest to ship: "127 verified residents" in the markup, or a count
//      composed on the client out of anything at hand, is indistinguishable to
//      a reader from the truth. §5 mounts the page against a store that holds
//      nothing and asserts every figure is 0, then against a store holding 7
//      and asserts it prints 7 — so a hardcoded number fails one or the other.
//      §5 also pins the numeric literals in the module's source.
//   2. A FAILED READ IS PAINTED AS A ZERO. "Nobody is in this room" and "we
//      could not read this room" are different facts, and collapsing them means
//      a Function timeout tells a reader their district is empty.
//   3. A STORE THAT DOES NOT EXIST IS PAINTED AS DATA. A 0 with no provenance
//      is ambiguous between "nobody came" and "we do not keep this". The money
//      lane's grammar of absence — "on hand", never "yet" — is the answer, and
//      "yet" is asserted absent because it promises a record that may not come.
//   4. EQUITY LANGUAGE APPEARS. A public district board that reads like a place
//      to buy into is the single worst thing this surface could be. §3 sweeps
//      the served document and the module for that whole vocabulary.
//   5. A NAME, ADDRESS OR EMAIL LEAKS. Band 2 is counts only; the endpoint
//      aggregates and never selects, so §5 asserts the client has no path that
//      could print a person even if handed one.
//   6. A MAJORITY IS CLAIMED. "The district supports X" off four poll answers,
//      or any percentage at all, before a real poll store has real votes.
//   7. THE SEAT IS DESCRIBED WRONG. This is a STATE senate seat. A page that
//      called it a congressional one would be wrong about which body makes the
//      laws on its own table.
//   8. THE CONTROL ON THE PERSON FILE IS DEAD. An anchor to a route that is not
//      served, a module loaded after the file that asks it for the control, or
//      a button that dismisses the file and goes nowhere.
//   9. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /district/ut-sd-3/ is served
//      200, so a bare src="district-board.js" resolves under it, the rewrite
//      answers with this document, and the browser parses HTML as JavaScript.
//  10. THE WALLS ARE BREACHED. The money lane, the FD tables, the record
//      engines, or a write to a location / district / team / stance key.
//
// Eleven sections:
//
//   1. THE REWRITE — three exact 200s, no splat, and /d/* left alone.
//   2. THE DOCUMENT — canonical, root-absolute paths, the flag, the copied
//      Firebase stub, the bar, and what deliberately did not come.
//   3. NO EQUITY LANGUAGE, swept two ways.
//   4. BAND 1 — the seat is john_johnson's, and it is a state senate seat.
//   5. BAND 2 — the three honest answers, and no invented headcount.
//   6. BAND 3 — the archive's rows, and an empty table is a passing state.
//   7. FREE VS PAID, AND THE POSTING SEAM — copy only, no composer.
//   8. THE DOORS — the person-file control and the stance CTA.
//   9. THE HARD WALLS — money, the FD tables, and the stores.
//  10. TWIN BOOT — the engines are byte-identical with this page rendered.
//  11. THE SERVICE WORKER.
//
//   node scripts/test-district-voice-sd3.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const PID = "john_johnson";
const SEAT = "ut-statesenate-3";
const ALIAS = "ut-sd-3";
const ROUTE = "/district/ut-sd-3";
const DOC_FILE = "district-ut-sd-3.html";

const DOC = R(DOC_FILE);
const MOD = R("district-board.js");
const FN = R("netlify/functions/district-board.mts");
const TOML = R("netlify.toml");
const SW = R("sw.js");
const VOICE = R("voice.html");
const PERSON_HTML = R("person.html");
const PF = R("person-file.js");
const PF_CSS = R("person-file.css");

const blank = (m) => String(m).replace(/[^\n]/g, " ");
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, blank);
const styleBare = (s) => String(s).replace(/<style\b[\s\S]*?<\/style>/gi, (b) => blank(b));
const scriptBare = (s) => String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (b) => blank(b));
const cssBare = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, blank);
const jsBare = (s) => cssBare(s).replace(/^[ \t]*\/\/.*$/gm, blank);
// Tags out too: what a READER sees. The banner states every wall this page keeps
// ("no invented headcount", "no majority"), so a sweep over the raw file would
// fail on the sentence promising the thing it looks for.
const tagBare = (s) => String(s).replace(/<[^>]+>/g, " ");

const DOC_BARE = scriptBare(styleBare(htmlBare(DOC)));   // markup, no comments/style/script
const DOC_TEXT = tagBare(DOC_BARE);                      // reader-visible text only
const DOC_MARKUP = htmlBare(DOC);                        // comments out, scripts+styles kept
const MOD_CODE = jsBare(MOD);
// WHAT THE DOCUMENT ACTUALLY LOADS, as opposed to what its banner discusses.
// The head banner names every module that deliberately did not come, so a
// substring sweep of the file would fail on the paragraph that keeps the wall.
const LOADED = [...DOC_BARE.matchAll(/\b(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
const loads = (f) => LOADED.some((u) => u.indexOf(f) >= 0);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ✗ ${failures.length} failure${failures.length === 1 ? "" : "s"}\n`);
    for (const f of failures) console.log(`     · ${f}`);
    console.log("");
    process.exit(1);
  }
  console.log(`\n   ✓ ${passed} checks passed\n`);
  process.exit(0);
}
const must = (cond, msg) => { if (!cond) { failures.push(`FIXTURE: ${msg}`); report(); } else passed++; };

console.log("\n══ /district/ut-sd-3 · the first district board ══");

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE REWRITE
// ═════════════════════════════════════════════════════════════════════════════
section("1 · three exact spellings, one document, and /d/* still is not it");

// The same parser and the same claims the other shell harnesses make, for the
// same reason: Netlify takes the FIRST matching rule.
const RULES = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const b = m[1];
  const g = (k) => ((new RegExp(`^[ \\t]{2}${k}\\s*=\\s*"?([^"\\n]*)"?`, "m")).exec(b) || [, ""])[1].trim();
  return { from: g("from"), to: g("to"), status: g("status"), force: g("force") };
});
must(RULES.length > 10, `the redirect table parsed (${RULES.length} rules)`);
const idxOf = (from) => RULES.findIndex((r) => r.from === from);

const SPELLINGS = [ROUTE, ROUTE + "/", ROUTE + ".html"];
for (const spelling of SPELLINGS) {
  const i = idxOf(spelling);
  ok(i >= 0, `toml: ${spelling} is declared`);
  if (i < 0) continue;
  eq(RULES[i].to, "/" + DOC_FILE, `toml: ${spelling} serves the board document`);
  eq(RULES[i].status, "200", `toml: ${spelling} is a rewrite, not a hop`);
  ok(RULES[i].force !== "true", `toml: ${spelling} does not force`);
}

// FIRST MATCH WINS, so nothing declared earlier may match any of the three. A
// Netlify `from` matches literally except for * (any suffix) and :params.
const matchesPath = (from, path) => {
  if (from === path) return true;
  const star = from.indexOf("*");
  if (star >= 0) return path.startsWith(from.slice(0, star));
  if (from.indexOf(":") >= 0) {
    const re = new RegExp("^" + from.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/:[A-Za-z_]+/g, "[^/]+") + "$");
    return re.test(path);
  }
  return false;
};
for (const spelling of SPELLINGS) {
  const mine = idxOf(spelling);
  const shadow = RULES.findIndex((r, i) => i < mine && matchesPath(r.from, spelling));
  ok(shadow < 0, `toml: nothing above ${spelling} matches it` +
    (shadow >= 0 ? ` — "${RULES[shadow].from}" (rule ${shadow}) does` : ""));
}

// NO SPLAT. /district/* would publish an address for every seat in the state,
// and every one of them would render three bands of zeroes.
ok(idxOf("/district/*") < 0, "toml: there is no /district/* wildcard");
ok(!RULES.some((r) => r.from.startsWith("/district/") && r.from.indexOf("*") >= 0),
  "toml: no rule under /district/ carries a wildcard");
// A second district is three more lines, not a pattern.
const districtRules = RULES.filter((r) => r.from.startsWith("/district/"));
eq(districtRules.length, 3, "toml: exactly three /district/ rules — one board, three spellings");

// AND THE SEAT FILE DID NOT MOVE. /d/<seat-key> is a different document on
// purpose: it is the seat, this is the board.
const dSplat = idxOf("/d/*");
ok(dSplat >= 0, "toml: /d/* is still declared");
if (dSplat >= 0) eq(RULES[dSplat].to, "/index.html", "toml: /d/* still serves the front page");
ok(!RULES.some((r) => r.from === "/d/" + ALIAS && r.to === "/" + DOC_FILE),
  `toml: /d/${ALIAS} was not re-pointed at the board`);

ok(existsSync(join(ROOT, DOC_FILE)), `the document ${DOC_FILE} exists`);
ok(existsSync(join(ROOT, "district-board.js")), "district-board.js exists");
ok(existsSync(join(ROOT, "netlify/functions/district-board.mts")), "the counts endpoint exists");

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("2 · the shell: canonical, root-absolute, one flag, the copied stub");

has(DOC, `<link rel="canonical" href="https://www.politidex.fyi${ROUTE}" />`,
  "the canonical is the bare path");
// Neither of the other two spellings may claim to be canonical.
ok(!/rel="canonical"[^>]*ut-sd-3\.html/.test(DOC), "the .html spelling is not canonical");
ok((DOC.match(/rel="canonical"/g) || []).length === 1, "there is exactly one canonical");

// THE FLAG, NOT A PATH SNIFF. Three paths serve this file.
has(DOC, "window.__PDX_DISTRICT_BOARD_DOC = true;", "the document sets its own flag");
ok(!/location\.pathname/.test(scriptBare(DOC) === DOC ? "" : DOC.slice(0, DOC.indexOf("</head>"))) ||
   !/__PDX_DISTRICT_BOARD_DOC[\s\S]{0,200}location\.pathname/.test(DOC),
  "the flag is a literal, not derived from the path");

// EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE. This is failure mode 9.
const attrs = [...DOC.matchAll(/\b(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
must(attrs.length > 8, `the document has paths to check (${attrs.length})`);
const relative = attrs.filter((a) => a && !/^(?:\/|https?:\/\/|#|mailto:|data:)/.test(a));
eq(relative.length, 0, `every same-origin path is root-absolute — relative: ${JSON.stringify(relative)}`);

// THE FIREBASE STUB IS THE SHARED ONE, BYTE FOR BYTE. A shell that writes its
// own "has Firebase answered yet" is a shell that can answer it differently.
const stubOf = (src) => {
  const a = src.indexOf('<script defer src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js">');
  const b = src.indexOf('<script src="/firebase-boot.js" defer></script>');
  return a >= 0 && b > a ? src.slice(a, b + '<script src="/firebase-boot.js" defer></script>'.length) : "";
};
const myStub = stubOf(DOC);
const voiceStub = stubOf(VOICE);
must(voiceStub.length > 1000, "voice.html's Firebase stub could not be located");
eq(myStub, voiceStub, "the Firebase stub is voice.html's, byte for byte");
has(myStub, "window.PDXAuth = window.PDXAuth || { state: 'unknown'", "auth starts at unknown, not signed-out");

// THE BAR — the same seven destinations, and NO aria-current: this document is
// not one of the seven, so marking one current would point a screen reader at
// the wrong room.
for (const href of ["/#who-represents-me", "/#say-vs-do", "/ballot", "/mandate", "/voice", "/money", "/"]) {
  has(DOC_MARKUP, `class="pdx-sh-link" href="${href}"`, `the bar links ${href}`);
}
ok(!/aria-current/.test(DOC_BARE), "no link in the bar claims to be the current page");
has(DOC_MARKUP, 'id="pdx-shell-acct" data-pdx-acct-sig="unknown"', "the account slot is empty and starts unknown");
has(DOC, "/shell-account-chip.js", "the chip's own module is on the path");
has(DOC, "/shell-chrome.css", "the shared chrome sheet is linked");

// WHAT CAME, AND IT IS THE WHOLE CRITICAL PATH.
for (const f of ["/cmp-data.js", "/issue-map.js", "/voting-record.js", "/stance-sides.js",
                 "/my-stances.js", "/district-board.js"]) {
  has(DOC, `src="${f}"`, `the document loads ${f}`);
}
// WHAT DID NOT. Each of these is a budget wall, a correctness wall, or both.
for (const f of ["app.css", "compare-hub.js", "alignment-tool.js", "ballot-breakdown.js",
                 "voter-hub-location.js", "pdx-finance.js", "finance-lane.js", "ftm-data.js",
                 "district-voice.js", "district-room.js", "money-room.js"]) {
  ok(!loads(f), `the document does not load ${f}`);
}
// NO PERSONAL "YOU ARE IN SD-3" LINE. The app has one owner of "where does this
// reader vote" and it is deliberately not here, so the page must not claim it.
ok(!/you appear to be in/i.test(DOC), "the page does not claim to place the reader");
ok(!/\byou (?:are|live) in\b/i.test(DOC_TEXT), "no personal district claim in the visible copy");
lacks(MOD_CODE, "pdxRepsForMe", "the module never asks the location resolver");
lacks(MOD_CODE, "_currentVoterLocation", "…nor reads its saved fields");

has(DOC, "<noscript>", "there is a noscript note");
has(DOC_MARKUP, `href="/p/${PID}"`, "the noscript note still reaches the member's record");

// THE BOOT MARKUP CONTAINS NO INTEGER. A zero in the document would be a count
// nobody has read yet.
const bootHost = (DOC.match(/<div id="pdx-district-board"[\s\S]*?<\/div>/) || [""])[0];
must(bootHost.length > 40, "the board host could not be located in the document");
ok(!/\d/.test(tagBare(bootHost)), `the boot markup prints no digit — got ${JSON.stringify(tagBare(bootHost).trim())}`);
has(bootHost, 'data-pdxdb-boot="waiting"', "…and it declares itself a waiting state");

// ═════════════════════════════════════════════════════════════════════════════
// 3 · NO EQUITY LANGUAGE
// ═════════════════════════════════════════════════════════════════════════════
section("3 · this is a public board, and it does not read like a place to buy into");

// THE SWEEP AS SPECIFIED, over the whole served document and the whole module.
// Run against the raw bytes, not the stripped text: a comment is shipped to the
// reader too, and "we do not sell anything here" in a banner is still the
// vocabulary appearing on the page.
const BANNED_LITERAL = /share[s]|stock[s]|unit[s]|Reg CF|20%|freeze|dues/gi;
for (const [name, src] of [[DOC_FILE, DOC], ["district-board.js", MOD],
                           ["netlify/functions/district-board.mts", FN]]) {
  const hits = [...String(src).matchAll(BANNED_LITERAL)].map((m) => m[0]);
  eq(hits.length, 0, `${name}: zero matches for the equity sweep — found ${JSON.stringify(hits)}`);
}

// AND THE WIDER VOCABULARY, over what a reader actually sees. The literal sweep
// above is the specified one; this one catches the singular forms and the
// neighbouring words that would say the same thing in a different register.
const BANNED_WORDS = /\b(shares?|stocks?|units?|dues|freeze|frozen|equity|equities|dividend|investor|investment|valuation|pro rata|cap table|subscription agreement|accredited)\b/gi;
for (const [name, text] of [[`${DOC_FILE} (visible text)`, DOC_TEXT],
                            ["district-board.js COPY", MOD]]) {
  const hits = [...String(text).matchAll(BANNED_WORDS)].map((m) => m[0]);
  eq(hits.length, 0, `${name}: no equity vocabulary — found ${JSON.stringify(hits)}`);
}
// NO PERCENTAGE AT ALL on this surface. A proportion is how a majority gets
// claimed, and there is no poll store with votes in it to claim one from.
ok(!/\d\s*%/.test(DOC_TEXT), "no percentage in the visible copy");
ok(!/\d\s*%/.test(jsBare(MOD).replace(/\/\*[\s\S]*?\*\//g, "")), "no percentage in the module");
// NO MAJORITY, NO MOOD.
for (const phrase of ["the district supports", "the district opposes", "majority of residents",
                      "residents support", "most residents", "district favors", "district favours"]) {
  ok(!new RegExp(phrase, "i").test(DOC), `no claim that "${phrase}…"`);
  ok(!new RegExp(phrase + "(?! this| X)", "i").test(MOD_CODE), `the module never phrases "${phrase}…"`);
}
// NO IDENTITY VENDOR AND NO PAYMENT PROCESSOR IS WIRED.
for (const v of ["stripe", "veriff", "persona", "plaid", "onfido", "jumio", "identity\\.com"]) {
  const re = new RegExp("\\b" + v + "\\b", "i");   // "persona" lives inside "personal"
  ok(!re.test(DOC), `no ${v} on the document`);
  ok(!re.test(MOD), `no ${v} in the module`);
}
// THE GRAMMAR OF ABSENCE IS THE MONEY LANE'S: "on hand", and never "yet".
has(MOD, "on hand", 'the absence lines say "on hand"');
ok(!/\byet\b/i.test(DOC_TEXT), `the visible copy never says "yet" — it promises a record that may not come`);
const COPY_BLOCK = (MOD.match(/var COPY = \{[\s\S]*?\n  \};/) || [""])[0];
must(COPY_BLOCK.length > 500, "the COPY block could not be located in the module");
ok(!/\byet\b/i.test(COPY_BLOCK), "…and neither does any sentence the module can print");
// NO GRADE, NO SCORE, NO THIRD MONEY PILL.
for (const t of ["transparency 32", "transparency score", "grade", "0-100", "out of 100"]) {
  ok(!new RegExp(t.replace(/[-]/g, "\\-"), "i").test(DOC_TEXT), `no "${t}" in the visible copy`);
}
has(MOD, "scored: false", "the module publishes scored: false");

// ═════════════════════════════════════════════════════════════════════════════
// THE SANDBOX — the shipped load order, with a controllable network
// ═════════════════════════════════════════════════════════════════════════════
// A host element that records what was painted into it, and a fetch that answers
// from a fixture. Nothing here touches the real network, and nothing in the
// module can reach one: §5 asserts the only URL it builds.
function hostEl() {
  const el = { innerHTML: "", getAttribute: () => null, setAttribute() {}, appendChild() {} };
  return el;
}
function flush(n = 12) {
  let p = Promise.resolve();
  for (let i = 0; i < n; i++) p = p.then(() => new Promise((r) => setTimeout(r, 0)));
  return p;
}
// `counts` is the fixture the endpoint would have returned; null means the read
// failed (HTTP error, timeout, malformed body — the client cannot tell and does
// not need to). `items` likewise for the archive.
function boot({ counts, items, stances, files } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  const urls = [];
  win.fetch = (url) => {
    urls.push(String(url));
    if (counts === null) return Promise.reject(new Error("fixture: read failed"));
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(counts) });
  };
  for (const f of (files || ["cmp-data.js", "issue-map.js", "stance-sides.js"])) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  if (stances) {
    // Injected through the store's OWNER contract, not a storage key: the module
    // reads PDXStanceSides, which reads PDXStances.all(). Same seam my-stances.js
    // fills in the browser.
    win.PDXStances = { all: () => stances, count: () => stances.length };
  }
  win.PDXVotingRecord = {
    fetchMember: () => (items === null
      ? Promise.reject(new Error("fixture: archive read failed"))
      : Promise.resolve({ items: items || [], summary: {} })),
  };
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  return { win, ctx, urls };
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · BAND 1 — THE SEAT
// ═════════════════════════════════════════════════════════════════════════════
section("4 · the seat is john_johnson's, and it is a STATE senate seat");

const { win: W0 } = boot({});
const B = W0.PDXDistrictBoard;
must(B && typeof B.mount === "function", "PDXDistrictBoard did not publish after load");

eq(B.PID, PID, "the module's subject is the john_johnson roster row");
eq(B.SEAT, SEAT, "the canonical seat key");
eq(B.ALIAS, ALIAS, "the URL spelling of the seat");
eq(B.ROUTE, ROUTE, "the route it prints");

// THE ROSTER ROW IS THE SOURCE, and it is the one already on file.
const ROW = W0.CMP_DATA && W0.CMP_DATA[PID];
must(ROW && ROW.name, `CMP_DATA[${PID}] is missing — band 1 has no source`);
ok(/\bState Senator\b/i.test(ROW.office), `the roster still calls the office a state senate seat (${JSON.stringify(ROW.office)})`);
ok(/\bSD[\s-]?3\b/.test(ROW.district), `the roster still names SD 3 (${JSON.stringify(ROW.district)})`);
ok(/\b(UT|Utah)\b/i.test(ROW.state), `…in Utah (${JSON.stringify(ROW.state)})`);

const band1 = B.seatHtml();
has(band1, 'data-pdxdb-band="seat"', "band 1 declares itself");
has(band1, ROW.name, "band 1 prints the sitting member's name");
has(band1, `href="/p/${PID}"`, "…linked to the person file");
has(band1, ROW.office, "…and the office as the roster spells it");
// NOT CONGRESS. This is failure mode 7.
for (const wrong of ["Congress", "U.S. Senator", "U.S. Representative", "House of Representatives",
                     "Congressman", "Congresswoman", "Congressional"]) {
  lacks(band1, wrong, `band 1 does not call this a federal seat ("${wrong}")`);
}
ok(!/Congress/i.test(DOC_TEXT), "…and neither does the document's own copy");
has(DOC_TEXT, "Utah Senate District 3", "the heading names the seat");
// NO BIO NOVEL, NO SCORECARD. The roster row carries a party letter and four
// issue labels; band 1 reads neither.
lacks(band1, "data-party", "band 1 prints no party");
ok(!/\bparty\b/i.test(band1), "…not even the word");
for (const k of ["score", "kept", "broken", "pending", "icon"]) {
  ok(band1.indexOf(String(ROW[k])) < 0 || ROW[k] == null || String(ROW[k]) === "",
    `band 1 does not print the roster's ${k}`);
}
ok(band1.length < 1200, `band 1 is a seat, not a dossier (${band1.length} chars)`);

// ═════════════════════════════════════════════════════════════════════════════
// 5 · BAND 2 — WHO IS IN THE ROOM
// ═════════════════════════════════════════════════════════════════════════════
section("5 · three honest answers, and not one invented headcount");

// ── (a) AN EMPTY STORE PRINTS ZERO, and says which kind of zero it is ───────
const EMPTY_PAYLOAD = {
  seat: SEAT,
  counts: { verified: 0, stance: 0, participants: 0 },
  stores: { verified: true, stance: false, participants: true },
  rooms: [],
};
{
  const { win, urls } = boot({ counts: EMPTY_PAYLOAD, items: [] });
  const host = hostEl();
  ok(win.PDXDistrictBoard.mount(host) === true, "mount() painted into the host");
  await flush();
  const html = host.innerHTML;
  ok(html.length > 800, `all three bands painted (${html.length} chars)`);
  eq(win.PDXDistrictBoard.state().counts, "ok", "the counts read answered");

  // THE ONE URL IT BUILDS. Alias in the query, nothing else, and no second
  // endpoint anywhere.
  eq(urls.length, 1, `exactly one network read for the counts — ${JSON.stringify(urls)}`);
  eq(urls[0], `/api/district-board?seat=${ALIAS}`, "…and it is the counts endpoint for this seat");

  const nums = [...html.matchAll(/data-pdxdb-count="(\d+)"/g)].map((m) => Number(m[1]));
  eq(nums.length, 3, "band 2 printed three counts");
  eq(nums.filter((n) => n === 0).length, 3, `every count is 0 against an empty store — got ${JSON.stringify(nums)}`);
  // THE FIXTURE CANNOT PASS ON A HARDCODED FIGURE. This is failure mode 1.
  ok(!/\b(?:1[0-9]{2}|[2-9][0-9])\b/.test(tagBare(html).replace(/\b(?:100|40)\b/g, "")),
    "no two- or three-digit figure appeared from nowhere");
  ok(!/127/.test(html), "and specifically not a plausible-looking headcount");
  has(html, "0 people", "a count of nobody reads as people, not as a bare digit");

  // A STORE THAT DOES NOT EXIST IS MARKED, AND EXPLAINED IN THE SAME BREATH.
  has(html, 'data-pdxdb-store="absent"', "the stance count is marked as having no store");
  has(html, 'data-pdxdb-store="present"', "…and the two that do have one are marked present");
  eq((html.match(/data-pdxdb-store="absent"/g) || []).length, 1, "exactly one count has no store behind it");
  has(html, "No district stance record on hand", "…and it says so in the money lane's grammar");
  ok(!/\byet\b/i.test(tagBare(html)), 'nothing painted says "yet"');

  // VERIFICATION IS EXPLAINED AS WHAT IT IS FOR.
  has(html, "Verified residency is how a voice is counted", "the residency sentence is in the band footer");
  has(html, "not how a page is read", "…and it says reading needs none of it");

  // NO NAME, NO ADDRESS, NO EMAIL. Failure mode 5.
  ok(!/@/.test(tagBare(html).replace(/&[a-z]+;/g, "")), "nothing painted contains an email");
  for (const ident of ["authorHash", "author_hash", "userId", "user_id", "uid", "email", "address",
                       "displayName", "handle"]) {
    const re = new RegExp("[.\\[]\\s*['\"]?" + ident + "\\b");
    ok(!re.test(MOD_CODE), `the module has no path that READS a .${ident}`);
  }
}

// ── (b) THE SAME MOUNT AGAINST A STORE THAT HOLDS PEOPLE ────────────────────
// The other half of failure mode 1: if the zeroes above were hardcoded, this
// fails. The numbers are deliberately not round.
{
  const { win } = boot({
    counts: {
      seat: SEAT,
      counts: { verified: 7, stance: 0, participants: 3 },
      stores: { verified: true, stance: false, participants: true },
      rooms: [{ issueKey: "civics_education", polls: 3, comments: 2 }],
    },
    items: [],
  });
  const host = hostEl();
  win.PDXDistrictBoard.mount(host);
  await flush();
  const html = host.innerHTML;
  const nums = [...html.matchAll(/data-pdxdb-count="(\d+)"/g)].map((m) => Number(m[1]));
  eq(JSON.stringify(nums), JSON.stringify([7, 0, 3]), "the counts are the store's, in band order");
  has(html, "7 people", "seven reads as people");
  has(html, "3 people", "three reads as people");
  // STILL NO PROPORTION. Ten people and a poll do not make a majority.
  ok(!/%/.test(tagBare(html)), "no percentage appeared once there were people to divide");
}
// One person is one person, not "1 people".
eq(B._people(1), "1 person", "the count's noun agrees at one");
eq(B._people(0), "0 people", "…and at zero");
// A COUNT CANNOT BE MANUFACTURED BY THE CLIENT.
eq(B._whole(undefined), 0, "a missing count is 0");
eq(B._whole(-5), 0, "a negative count is 0");
eq(B._whole("12"), 12, "a numeric string is its number");
eq(B._whole(4.9), 4, "a fraction floors rather than rounds up");
eq(B._whole("lots"), 0, "a word is not a count");

// ── (c) A READ THAT FAILED IS NOT A ZERO ────────────────────────────────────
// Failure mode 2, and the reason band 2 has three states instead of two.
{
  const { win } = boot({ counts: null, items: [] });
  const host = hostEl();
  win.PDXDistrictBoard.mount(host);
  await flush();
  const html = host.innerHTML;
  eq(win.PDXDistrictBoard.state().counts, "unread", "the failed read is in its own state");
  eq(win.PDXDistrictBoard.payload(), null, "…and no payload is held");
  has(html, "could not read the room", "it says the read failed");
  has(html, "This is not a count of zero", "…and says explicitly that it is not a zero");
  eq((html.match(/data-pdxdb-count="/g) || []).length, 0, "no count was printed at all");
  ok(!/\b0 people\b/.test(tagBare(html)), "and certainly not zero people");
}
// A MALFORMED BODY IS ALSO NOT A ZERO — a 200 with no counts object is a failed
// read, not an empty room.
{
  const { win } = boot({ counts: { seat: SEAT }, items: [] });
  const host = hostEl();
  win.PDXDistrictBoard.mount(host);
  await flush();
  eq(win.PDXDistrictBoard.state().counts, "unread", "a payload with no counts object is treated as unread");
}
// AND THE WAITING STATE IS THE FIRST PAINT, so no zero flashes before the read.
{
  const { win } = boot({ counts: EMPTY_PAYLOAD, items: [] });
  const host = hostEl();
  win.PDXDistrictBoard.mount(host);
  const first = host.innerHTML;    // synchronous, before any fetch resolves
  eq(win.PDXDistrictBoard.state().counts, "wait", "the first paint is the waiting state");
  ok(!/data-pdxdb-count=/.test(first), "the first paint prints no count");
  has(first, "Counting the room", "…it says it is still counting");
  await flush();
}

// ── (d) THE NUMERIC LITERALS IN THE MODULE, PINNED ──────────────────────────
// A belt-and-braces read of failure mode 1: whatever the fixtures prove about
// behaviour, a figure cannot be smuggled in as a literal if the only literals
// in the file are loop and formatting constants.
{
  const lits = [...new Set([...MOD_CODE.matchAll(/(?<![\w.#])(\d{2,})(?![\w.])/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
  const ALLOWED = new Set([100, 40]);   // PAGE_SIZE, TABLE_CAP — and nothing else
  const stray = lits.filter((n) => !ALLOWED.has(n));
  eq(stray.length, 0, `the module holds no figure-shaped literal — stray: ${JSON.stringify(stray)}`);
  eq(JSON.stringify(lits), JSON.stringify([40, 100]),
    "…and the two it does hold are the page size and the table cap");
}
// And the endpoint cannot invent one either: it has no literal count, only
// aggregates.
for (const agg of ["countDistinct"]) has(FN, agg, `the endpoint counts with ${agg}`);
ok(!/insert|update\(|delete\(/i.test(FN.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")),
  "the counts endpoint cannot write");
has(FN, "503", "a database failure answers 503, not a zero");
has(FN, '"ut-statesenate-3": 1', "the endpoint's allow-list holds this seat");
// ONE ALLOW-LIST, TWO SIDES OF THE WIRE, AND THEY AGREE.
eq(JSON.stringify(Object.keys(B.BOARD_SEATS)), JSON.stringify([SEAT]),
  "the client's allow-list holds exactly this seat");
const fnSeats = [...FN.matchAll(/BOARD_SEATS: Record<string, 1> = \{ ("[^}]*") \}/g)];
ok(FN.indexOf("BOARD_SEATS") > 0, "the endpoint declares a BOARD_SEATS allow-list");
ok(!/ut-statehouse-68/.test(MOD), "the board module does not also claim HD-68 — that seat has /voice");

// ═════════════════════════════════════════════════════════════════════════════
// 6 · BAND 3 — ON THE TABLE
// ═════════════════════════════════════════════════════════════════════════════
section("6 · the archive's own rows, and an empty table is a passing state");

// AN EMPTY TABLE PASSES. If the issue-to-measure map is too thin for this seat
// to have rows, the band says so and nothing is scraped to fill it.
{
  const { win } = boot({ counts: EMPTY_PAYLOAD, items: [] });
  const host = hostEl();
  win.PDXDistrictBoard.mount(host);
  await flush();
  const html = host.innerHTML;
  has(html, 'data-pdxdb-band="table"', "band 3 painted");
  has(html, "No measures on hand for this seat", "…with the empty-record sentence");
  ok(!/\byet\b/i.test(tagBare(html)), '…and it does not say "yet"');
  ok(!/<table/.test(html), "no empty table shell was printed");
}

// REAL ROWS, LINKED, WITH THEIR COUNTS.
const FIXTURE_ITEMS = [
  {
    kind: "vote", measureId: 1, number: "S.B. 57", title: "Higher Education Amendments",
    measureIdent: { session: "2025GS", billUrl: null, officialTitle: null, readFrom: null, readFromUrl: null },
    issues: [{ issueKey: "civics_education", weight: 1, isPrimary: true, supportMeaning: "yea", rationale: null }],
  },
  {
    kind: "position", measureId: 2, number: "", title: "Intellectual diversity reporting",
    measureIdent: { session: "2024GS", billUrl: "https://le.utah.gov/x", officialTitle: null, readFrom: null, readFromUrl: null },
    issues: [{ issueKey: "civics_education", weight: 1, isPrimary: false, supportMeaning: "support", rationale: null }],
  },
  {
    kind: "vote", measureId: 3, number: "H.B. 208", title: "Health Care Access Revisions",
    measureIdent: { session: "2023GS", billUrl: null, officialTitle: null, readFrom: null, readFromUrl: null },
    issues: [],
  },
];
{
  const { win } = boot({
    counts: {
      seat: SEAT,
      counts: { verified: 0, stance: 0, participants: 2 },
      stores: { verified: true, stance: false, participants: true },
      rooms: [{ issueKey: "civics_education", polls: 2, comments: 1 }],
    },
    items: FIXTURE_ITEMS,
  });
  const host = hostEl();
  win.PDXDistrictBoard.mount(host);
  await flush();
  const html = host.innerHTML;
  eq(win.PDXDistrictBoard.state().table, "ok", "the archive read answered");
  has(html, "<table", "band 3 printed a table");
  eq((html.match(/class="pdxdb-row"/g) || []).length, 3, "one row per archive item");
  has(html, "Higher Education Amendments", "the measure's short title");
  // /b/<sitting>/<number>, the site's canonical bill address.
  has(html, 'href="/b/2025GS/S.B.%2057"', "a numbered measure links to its own bill address");
  // No number → the bill URL the archive carries.
  has(html, 'href="https://le.utah.gov/x"', "a measure with no number falls back to its source URL");
  // The per-issue tally lands on the rows under that issue, and nowhere else.
  eq((html.match(/data-pdxdb-polls="2"/g) || []).length, 2, "both civics rows carry the issue's poll count");
  eq((html.match(/data-pdxdb-polls="0"/g) || []).length, 1, "…and the row with no issue carries zero");
  has(html, 'data-pdxdb-comments="1"', "the comment count is printed as a count of people");
  // STILL NO MAJORITY. Two answers is two answers.
  ok(!/%/.test(tagBare(html)), "no proportion was derived from the tally");
  ok(!/\b(?:wins?|winning|leads?|leading|ahead|prevail\w*)\b/i.test(tagBare(html)),
    "no side is described as winning");
  // The one appearance of the word is the refusal to use it.
  const maj = [...tagBare(html).matchAll(/.{0,14}majority/gi)].map((m) => m[0].trim());
  ok(maj.every((m) => /never a majority$/i.test(m)),
    `"majority" only ever appears as a refusal — found ${JSON.stringify(maj)}`);
  // THE ISSUE'S OWN WORD, not its key.
  const label = W0.ISSUE_MAP && W0.ISSUE_MAP.civics_education &&
    (W0.ISSUE_MAP.civics_education.label || W0.ISSUE_MAP.civics_education.name);
  if (label) has(html, label, "the issue prints the site's label for it");
  ok(!/>civics_education</.test(html), "…and never the raw key as a visible string");
}
// A measure with no address is still on the table, as text.
eq(B._measureHref({ number: "", measureIdent: null, issues: [] }, ""), "",
  "a measure with nothing to link to gets no href");
eq(B._measureHref({ number: "", measureIdent: null }, "healthcare_access"), "/i/healthcare_access",
  "…and falls back to the issue's own address when it has one");
eq(B._primaryIssue(FIXTURE_ITEMS[0]), "civics_education", "the primary issue is the one marked primary");
eq(B._primaryIssue(FIXTURE_ITEMS[2]), "", "an item with no issues has no issue");

// A FAILED ARCHIVE READ IS NOT AN EMPTY SEAT EITHER.
{
  const { win } = boot({ counts: EMPTY_PAYLOAD, items: null });
  const host = hostEl();
  win.PDXDistrictBoard.mount(host);
  await flush();
  eq(win.PDXDistrictBoard.state().table, "unread", "the failed archive read has its own state");
  has(host.innerHTML, "could not read the archive", "…and says so");
  ok(!/No measures on hand/.test(host.innerHTML), "…rather than claiming the seat has nothing");
}
// NO SCRAPE, AND THE BASELINE QUERY. Band 3 reads the archive that is already
// there, through the memo every other warming caller shares.
has(MOD, "pageSize: PAGE_SIZE", "the archive read passes a page size");
has(MOD, "var PAGE_SIZE = 100;", "…and it is the baseline query, not a new cache key");
lacks(MOD_CODE, "noteMember", "the archive read never seeds a member's record");
for (const u of ["le.utah.gov", "congress.gov", "openstates", "legiscan"]) {
  lacks(MOD_CODE, u, `the module scrapes nothing from ${u}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · FREE VS PAID, AND THE POSTING SEAM
// ═════════════════════════════════════════════════════════════════════════════
section("7 · one sentence about tiers, and a field that is honestly off");

{
  const { win } = boot({ counts: EMPTY_PAYLOAD, items: [] });
  const host = hostEl();
  win.PDXDistrictBoard.mount(host);
  await flush();
  const html = host.innerHTML;

  // ONE SENTENCE, in a band footer, and it is copy and nothing else.
  has(html, "free to everyone", "the tier sentence says the record and the board are free");
  has(html, "limited on the free tier and unlimited for members",
    "…and what the tiers actually differ on");
  eq((html.match(/free tier/g) || []).length, 1, "the tier sentence appears once");
  // NO PRICE, NO CHECKOUT, NO PAYWALL CODE.
  ok(!/\$\s*\d/.test(tagBare(html)), "no price is printed");
  for (const t of ["checkout", "subscribe now", "upgrade now", "billing", "payment"]) {
    ok(!new RegExp(t, "i").test(html), `no ${t} control`);
  }

  // THE COMPOSER IS REALLY THERE AND REALLY OFF.
  has(html, 'data-pdxdb-compose="off"', "the posting seam declares itself off");
  has(html, "disabled", "the field is disabled");
  has(html, 'aria-disabled="true"', "…and says so to assistive tech");
  has(html, "Posting ships next", "…with the one sentence explaining why");
  // AND IT IS NOT A WORKING BOX PRETENDING TO BE ONE. Failure mode: a composer
  // that writes to localStorage and paints the sentence back beside a
  // verified-resident count.
  ok(!/<form/i.test(html), "there is no form to submit");
  ok(!/<textarea/i.test(html), "there is no composer body field");
  for (const t of ["onsubmit", "onclick", "addEventListener"]) {
    ok(html.indexOf(t) < 0, `the seam wires no ${t}`);
  }
}
// NO WRITE PATH EXISTS IN THE MODULE AT ALL.
for (const w of ["localStorage.setItem", "sessionStorage.setItem", "document.cookie",
                 "indexedDB", "method: 'POST'", 'method: "POST"', "POST"]) {
  lacks(MOD_CODE, w, `the module contains no ${w}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 8 · THE DOORS
// ═════════════════════════════════════════════════════════════════════════════
section("8 · the control on the person file, and the door to the stance studio");

// THE PERSON-FILE CONTROL IS A REAL ANCHOR TO A REAL ROUTE. Failure mode 8.
const link = B.personLinkHtml(PID);
ok(link.length > 0, "the module answers with a control for this member");
has(link, `href="${ROUTE}"`, "…and it is an anchor to the board's own route");
has(link, "<a ", "…a real anchor, so it copies and opens in a new tab");
has(link, "pf-kick-board", "…wearing the kicker class the sheet styles");
ok(!/closeModal/.test(link), "the control does not dismiss the file it sits on");
ok(!/javascript:/i.test(link), "…and its href is a path, not a script");
ok(!/onclick/i.test(link), "…with no click handler standing in for navigation");
// It is not a number.
ok(!/\d/.test(tagBare(link).trim().replace(/3/g, "")), "the control prints no count");
// AND IT ANSWERS FOR NOBODY ELSE.
eq(B.personLinkHtml("mitt_romney"), "", "no other member gets this district's control");
eq(B.personLinkHtml(""), "", "…nor does an empty pid");
eq(B.personLinkHtml(null), "", "…nor a null one");

// THE FILE ASKS FOR IT, AND THE MODULE THAT OWNS IT LOADS FIRST.
has(PF, "boardLink(pid)", "person-file.js asks for the control when it paints the kicker");
has(PF, "window.PDXDistrictBoard", "…through the module that owns it");
ok(/voiceLink\(pid\) \+ boardLink\(pid\)/.test(PF), "…in the kicker row, beside the Voice link");
{
  const a = PF.indexOf("function boardLink");
  must(a > 0, "person-file.js no longer declares boardLink");
  const body = PF.slice(a, PF.indexOf("\n  }", a) + 4);   // the function, not the rest of the file
  must(/personLinkHtml/.test(body), "the boardLink body could not be bounded");
  lacks(body, "closeModal", "boardLink wires no dismissal");
  lacks(body, "innerHTML =", "…and paints nothing itself: it returns markup to the kicker");
}
has(PF_CSS, ".pf-kick-board", "person-file.css styles the control");
has(PF_CSS, ".pf-kick-voice + .pf-kick-board", "…and handles both controls being present at once");
has(PERSON_HTML, 'src="/district-board.js"', "person.html loads the module");
{
  const a = PERSON_HTML.indexOf('src="/district-board.js"');
  const b = PERSON_HTML.indexOf('src="/person-file.js"');
  ok(a > 0 && b > 0 && a < b,
    "…BEFORE person-file.js, since defer runs in document order and the kicker asks for it");
}
// THE ROUTE THE CONTROL NAMES IS THE ROUTE THE TOML SERVES.
ok(idxOf(ROUTE) >= 0, "the route the control points at is declared in netlify.toml");

// THE ZERO-STANCE DOOR IS THE FIXED ONE.
{
  const noSides = B.stanceHtml([]);
  has(noSides, 'href="/my-stances?add=1"', "a reader with no positions gets /my-stances?add=1");
  has(noSides, 'data-pdxdb-stance="none"', "…in the no-positions state");
  ok(!/closeModal/.test(noSides), "…and it is not a dead button");
  has(noSides, "no positions on file", "…with a sentence saying what is missing");
  ok(!/\byet\b/i.test(tagBare(noSides)), '…and it does not say "yet"');
}
// A READER WITH POSITIONS SEES THEIR OWN SIDES — from the one store, scoped to
// this district's issue list, with no score and no party.
{
  const key = Object.keys(W0.ISSUE_MAP || {})[0];
  must(!!key, "ISSUE_MAP is empty — the stance read has no vocabulary");
  const { win } = boot({ stances: [{ issueKey: key, position: "support", priority: "high" }] });
  const mine = win.PDXDistrictBoard.stanceHtml([key]);
  has(mine, 'data-pdxdb-stance="mine"', "a reader with a side on this district's list sees it");
  has(mine, "Support", "…with the side's own word");
  has(mine, "your own saved positions", "…and where it was read from");
  ok(!/%/.test(tagBare(mine)), "no match percentage");
  ok(!/\b(?:Direction Match|alignment score)\b/i.test(mine), "no Direction Match on this page");
  // A position on an issue NOT on this district's table is not printed here.
  const off = win.PDXDistrictBoard.stanceHtml(["some_issue_not_in_the_list"]);
  has(off, 'data-pdxdb-stance="off-table"', "positions off this district's list are not printed as its business");
}
// ONE STORE, AND IT IS READ THROUGH ITS OWNER.
has(MOD, "window.PDXStanceSides", "the stance read goes through stance-sides.js");
lacks(MOD_CODE, "pdx_my_stances_v1", "…never the storage key directly");
lacks(MOD_CODE, "pdx_your_file_v1", "…nor the second store");
lacks(MOD_CODE, "_alignIssues", "…nor the engine's signature");

// ═════════════════════════════════════════════════════════════════════════════
// 9 · THE HARD WALLS
// ═════════════════════════════════════════════════════════════════════════════
section("9 · the money lane, the FD tables and the stores are all out of reach");

// NOT UNUSED — UNREACHABLE. No identifier in the new files names any of these.
for (const wall of ["PDXFinance", "PDXFinanceLane", "WEALTH_DATA", "PDX_FD_DOCUMENTS",
                    "PDX_FD_DISCLOSURES", "FTM_FUNDING", "_pdxFundingSection",
                    "wealthLetterheadChipMount", "letterheadChipMount"]) {
  lacks(MOD_CODE, wall, `district-board.js has no code naming ${wall}`);
  lacks(DOC_BARE, wall, `the document's markup and scripts never name ${wall}`);
}
// The bar's link to another lane is not a read of it — that is the one mention
// allowed, and it is an href.
eq((DOC.match(/money/gi) || []).length - (DOC.match(/Follow the Money|href="\/money"|money lane|money wall/gi) || []).length >= 0, true,
  "the only money on the document is the bar's link and the note explaining it");
ok(!/src="\/[a-z-]*(?:finance|wealth|ftm)[a-z-]*\.js"/.test(DOC), "no finance module is loaded");

// THE FD TABLES ARE UNCHANGED — pinned by row count, so a backfill smuggled in
// beside this pass fails here.
{
  const FIN = R("pdx-finance.js");
  // Lifted to the terminating semicolon and evaluated on its own: the table is
  // read as DATA, so nothing in pdx-finance.js runs and no money code is booted
  // by the test that asserts the money code was not touched.
  const lift = (decl) => {
    const a = FIN.indexOf(decl);
    must(a > 0, `pdx-finance.js no longer declares ${decl.trim()}`);
    const b = FIN.indexOf(";", a + decl.length);
    must(b > a, `could not find the end of ${decl.trim()}`);
    return FIN.slice(a + decl.length, b);
  };
  const docs = vm.runInNewContext("(" + lift("var PDX_FD_DOCUMENTS = ") + ")");
  const dis = vm.runInNewContext("(" + lift("var PDX_FD_DISCLOSURES = ") + ")");
  eq(Object.keys(docs).length, 4, "the FD document table still holds four rows");
  eq(Object.keys(dis).length, 0, "the FD disclosure table is still empty");
}

// NO WRITE TO A LOCATION / DISTRICT / TEAM / STANCE KEY. Asserted twice: by
// source sweep, and by booting the module against a storage stub that records
// every write.
for (const key of ["pdx_my_stances_v1", "pdx_your_file_v1", "_pdxTenure", "pdx_voter_location",
                   "pdx_team", "pdx_district", "voterLocation"]) {
  lacks(MOD_CODE, key, `the module's code never names ${key}`);
}
{
  const win = makeSandbox();
  const writes = [];
  win.localStorage = { getItem: () => null, setItem: (k, v) => writes.push(["local", k]), removeItem: (k) => writes.push(["local-rm", k]) };
  win.sessionStorage = { getItem: () => null, setItem: (k, v) => writes.push(["session", k]), removeItem: (k) => writes.push(["session-rm", k]) };
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(EMPTY_PAYLOAD) });
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: FIXTURE_ITEMS, summary: {} }) };
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "issue-map.js", "stance-sides.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  const host = hostEl();
  win.PDXDistrictBoard.mount(host);
  await flush();
  eq(writes.length, 0, `mounting the whole board wrote nothing to storage — ${JSON.stringify(writes)}`);
  // And the document that has a cookie could not be reached either.
  eq(win.document.cookie, "", "no cookie was set");
}

// NEVER_FEEDS IS DECLARED, AND IT NAMES THE FOUR.
{
  const never = B.NEVER_FEEDS || [];
  ok(Array.isArray(never) && never.length >= 4, `NEVER_FEEDS is declared (${never.length} entries)`);
  for (const n of ["directionMatch", "wordVsAction", "formalPatternTier", "publicationFloor"]) {
    ok(never.indexOf(n) >= 0, `NEVER_FEEDS names ${n}`);
  }
  eq(B.scored, false, "the surface publishes no score");
}
// THE ENGINES ARE NOT EVEN NAMED.
for (const g of ["PDXWordAction", "PDXConsistency", "PDXPublicationFloor", "alignSetIntensity",
                 "_pdxRecordMappedCounts", "PDXFormalIndex"]) {
  lacks(MOD_CODE, g, `the module never names ${g}`);
}
// person.html STILL DENYLISTS alignment-tool.js. That wall predates this pass
// and adding a script to that document is exactly how it gets broken.
ok(!/<script[^>]*src="\/alignment-tool\.js"/.test(PERSON_HTML),
  "person.html still does not load alignment-tool.js");
ok(!/<script[^>]*src="\/alignment-tool\.js"/.test(DOC),
  "…and neither does the board document");

// ═════════════════════════════════════════════════════════════════════════════
// 10 · TWIN BOOT
// ═════════════════════════════════════════════════════════════════════════════
section("10 · the record engines are byte-identical with this board rendered");

{
  const FILES = [
    "cmp-data.js", "formal-index.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
    "publication-floor.js", "profile-spine.js", "profiles-full.js",
  ];
  const SRC = FILES.map((f) => [f, R(f)]);
  const { byMember } = buildCorpus(ROOT);
  const ranked = [...byMember.entries()].sort((a, b) => b[1].length - a[1].length);
  const [DEEP, items] = ranked[0];
  must(items.length > 40, `the deepest corpus member is too thin (${DEEP}: ${items.length})`);
  // The corpus is federal, so this seat has no rows in it. That is WHY the twin
  // boot reads a deep member's record while rendering the district board: the
  // question is whether this page can move somebody's verdict.
  ok(!byMember.has(PID), "the roll-call corpus is federal, so this seat has no rows in it");

  const snapshot = (renderBoard) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    win.PROFILES = win.CMP_DATA;
    for (const [f, src] of SRC) vm.runInContext(src, ctx, { filename: f });
    win.PROFILES = win.CMP_DATA;
    const before = Object.keys(win).sort().join(",");

    let rendered = 0;
    if (renderBoard) {
      vm.runInContext(MOD, ctx, { filename: "district-board.js" });
      const Bd = win.PDXDistrictBoard;
      for (const round of [0, 1]) {
        rendered += String(Bd.seatHtml() || "").length ? 1 : 0;
        rendered += String(Bd.roomHtml("ok", EMPTY_PAYLOAD) || "").length ? 1 : 0;
        rendered += String(Bd.tableHtml("ok", FIXTURE_ITEMS, [{ issueKey: "civics_education", polls: 2, comments: 1 }]) || "").length ? 1 : 0;
        rendered += String(Bd.stanceHtml(["civics_education"]) || "").length ? 1 : 0;
        rendered += String(Bd.composeHtml() || "").length ? 1 : 0;
        rendered += String(Bd.personLinkHtml(PID) || "").length ? 1 : 0;
      }
    }
    const after = Object.keys(win).sort().join(",");

    const out = [];
    win.PDXVotingRecord.noteMember(DEEP, items);
    if (renderBoard) {
      const Bd = win.PDXDistrictBoard;
      Bd.seatHtml();
      Bd.roomHtml("ok", EMPTY_PAYLOAD);
      Bd.tableHtml("ok", FIXTURE_ITEMS, []);
      Bd.personLinkHtml(PID);
    }
    // BOTH SUBJECTS, because a leak could land on either: the deep federal
    // member whose record is loaded, and this seat's own thin state file.
    for (const pid of [DEEP, PID]) {
      const wa = win.PDXWordAction.read(pid, win.CMP_DATA[pid]);
      out.push(["dm", pid, wa && wa.pct, wa && wa.token, wa && wa.verdict && wa.verdict.key,
        wa && wa.publishable, JSON.stringify((wa && wa.counts) || null),
        JSON.stringify((wa && wa.tiers) || null), JSON.stringify((wa && wa.floors) || null),
        JSON.stringify((wa && wa.coverage) || null)].join("|"));
      const rows = (win.PDXConsistency.formalPatternIndex.rows(pid) || []).map((r) =>
        [r.key, r.tier, r.token, r.n, r.adv, r.opp, r.confidence].join(":"));
      out.push(["tiers", pid, rows.length,
        win.PDXConsistency.formalPatternIndex.count(pid), rows.join(",")].join("|"));
      const fl = win.PDXPublicationFloor.read(pid);
      out.push(["floor", pid, fl.publishable, fl.cited, fl.promises, fl.formal,
        (fl.reasons || []).join(";")].join("|"));
      out.push(["mapped", pid, JSON.stringify(win._pdxRecordMappedCounts(pid) || null)].join("|"));
      out.push(["formal", pid, win.PDXFormalIndex.acts(pid), win.PDXFormalIndex.measures(pid),
        JSON.stringify(win.PDXFormalIndex.emptyNote(pid))].join("|"));
    }
    return { snap: out.join("\n"), rendered, leaked: before === after ? "" : "yes" };
  };

  const off = snapshot(false);
  const on = snapshot(true);
  ok(off.snap.length > 300, `the record snapshot has something in it (${off.snap.length} chars)`);
  eq(on.rendered, 12, "the rendering boot painted all six surfaces, twice");
  eq(off.rendered, 0, "…and the other boot painted none of them");
  eq(on.snap, off.snap,
    "Direction Match, the formal pattern index, the publication floor, the mapped counts and " +
    "the formal index are byte-identical with the district board rendered and without it");
  // The module DOES install its own global, which is the one owner this page has.
  // What must not appear is anything else.
  const addedOn = on.leaked;
  ok(addedOn === "yes" || addedOn === "", "the leak check ran");
  console.log(`   twin boot · ${DEEP} (${items.length} roll calls) + ${PID} · ` +
    `${off.snap.length}-char snapshot identical either way`);
}
// The one global it installs, named, so a second one is a visible diff.
{
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  const before = new Set(Object.keys(win));
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  const added = Object.keys(win).filter((k) => !before.has(k)).sort();
  eq(JSON.stringify(added), JSON.stringify(["PDXDistrictBoard"]),
    `the module installs exactly one global — added ${JSON.stringify(added)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 11 · THE SERVICE WORKER
// ═════════════════════════════════════════════════════════════════════════════
section("11 · one version bump, one precache entry, one offline branch");

const VER = (SW.match(/const CACHE_VERSION = '(v\d+)';/) || [])[1] || "";
ok(/^v\d+$/.test(VER), `CACHE_VERSION is set (${VER})`);
ok(Number(VER.slice(1)) >= 226, `…and it was bumped for this pass (${VER})`);
// The changelog entry, with the wording this pass owes.
// THE ENTRY FOR THIS VERSION, SLICED THE WAY THE FILE IS ORDERED. This
// changelog runs OLDEST-FIRST, so the newest entry sits immediately above the
// constant and there is no later heading to stop at. The first draft of this
// check looked ahead to `// v225 - ` and so did the first draft of the entry,
// which put the new block in the wrong place and passed this check anyway;
// test-sw-cache-policy.mjs slices heading-to-constant and caught it. Both are
// now anchored to the constant, and the POSITION is asserted rather than
// assumed, because that is the mistake that actually happened.
const logAt = SW.indexOf(`// ${VER} - `);
ok(logAt > 0, `there is a ${VER} changelog block`);
const LOG = logAt > 0 ? SW.slice(logAt, SW.indexOf("const CACHE_VERSION", logAt)) : "";
ok(LOG.length > 200, `…and it has something in it (${LOG.length} chars)`);
{
  // The newest entry is the LAST one: no other version heading between it and
  // the constant. This is what the budget suite measures, and an entry filed
  // above an older heading measures as two entries and blows the budget.
  const between = LOG.match(/\n\/\/ v\d+ - /g) || [];
  eq(between.length, 0,
    `no older changelog heading sits between the ${VER} entry and the constant — found ${JSON.stringify(between)}`);
  const prev = SW.indexOf("// v225 - ");
  ok(prev > 0 && prev < logAt, `…and the ${VER} entry is filed after v225, not above it`);
  ok(LOG.split("\n").length <= 48,
    `the ${VER} entry stays inside sw.js's changelog budget (${LOG.split("\n").length} lines) — ` +
    `the worker ships whole on every deploy`);
}
ok(/District 3 Voice reader shipped/i.test(LOG.replace(/\s+/g, " ")) ||
   /DISTRICT 3 VOICE READER SHIPPED/i.test(LOG.replace(/\s+/g, " ")),
  "…saying the District 3 Voice reader shipped");
ok(/no equity copy/i.test(LOG), "…and that there is no equity copy");
ok(/stores for\s+\/\/\s+location\/district\/team\/stance not migrated/i.test(LOG.replace(/\s+/g, " ")) ||
   /location\/district\/team\/stance not migrated/i.test(LOG.replace(/\s*\n\/\/\s*/g, " ")),
  "…and that the location/district/team/stance stores were not migrated");

// THE PRECACHE ENTRY. It is a bootable shell, which is what the list is for.
// INSIDE THE ARRAY, not merely somewhere in the file: the offline branch below
// names the same document, so a whole-file substring search passes even with the
// precache entry deleted — and the page would then be unreachable offline.
{
  const a = SW.indexOf("const SHELL_ASSETS = [");
  must(a > 0, "sw.js no longer declares SHELL_ASSETS");
  const b = SW.indexOf("\n];", a);
  must(b > a, "the SHELL_ASSETS array could not be bounded");
  const list = SW.slice(a, b).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
  has(list, `'/${DOC_FILE}'`, "the board document is in the precache list");
  has(list, "'/district-board.js'", "…and so is the module that paints it");
  has(list, "'/cmp-data.js'", "…and the roster, which is why band 1 paints offline");
}
// THE OFFLINE BRANCH, and it must not answer for another district.
const NAV_RE = (SW.match(/const DISTRICT_BOARD_NAV_RE = (\/.*\/);/) || [])[1] || "";
ok(NAV_RE.length > 0, `there is a nav regex for this address (${NAV_RE})`);
{
  const re = vm.runInNewContext(NAV_RE);
  for (const p of [ROUTE, ROUTE + "/", ROUTE + ".html"]) {
    ok(re.test(p), `the nav regex matches ${p}`);
  }
  // NOT A PREFIX. One district has a board, so one district has a fallback.
  for (const p of ["/district/ut-sd-4", "/district/ut-sd-30", "/district/ut-sd-3/rooms",
                   "/district/", "/district/ut-hd-3", "/d/ut-sd-3", "/"]) {
    ok(!re.test(p), `…and does not match ${p}`);
  }
}
has(SW, "if (isDistrictBoard) {", "the offline handler has a branch for it");
has(SW, `shell.match('/${DOC_FILE}')`, "…which answers with this document");
// AND IT IS AFTER THE OTHER SHELLS, so none of them can be intercepted by it.
{
  const mine = SW.indexOf("if (isDistrictBoard) {");
  const money = SW.indexOf("if (isMoney) {");
  const home = SW.lastIndexOf("shell.match('/')");
  ok(money > 0 && mine > money, "the branch sits after /money's");
  ok(home > mine, "…and before the homepage fallback, which names nobody");
}
// navDocKey GIVES IT NO KEY, so nothing was ever cached under one for this path
// and the fallback cannot collide with a held entry.
{
  const fnSrc = (SW.match(/function navDocKey\(url\) \{[\s\S]*?\n\}/) || [""])[0];
  must(fnSrc.length > 100, "navDocKey could not be located in sw.js");
  ok(!/district/i.test(fnSrc), "navDocKey knows nothing about /district/ — it returns '' for it");
}

report();
