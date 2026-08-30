#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-crawl-block.mjs — a person file is its own DOCUMENT, not just its
// own <title>
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG THIS EXISTS TO PREVENT, STATED AS THE SYMPTOM IT SHIPPED WITH
//
// Google indexes one URL on this site: the front page. /p/lee had already been
// given a unique title, a unique canonical and a unique card by the share-preview
// edge function — and it stayed unindexed, because a head is not a document. All
// 757 person addresses served the SAME ~2.2 MB app shell, byte for byte, with
// nothing in the body naming the person. A crawler comparing /p/lee to / saw two
// identical documents wearing different titles and kept one of them, which is the
// correct thing to do with a duplicate.
//
// So the edge now writes a short, unique, crawlable header into the body of a
// person address, before any script the shell loads. This file is the contract on
// that block, and it is a contract with three separate halves:
//
//   1. IT IS REALLY THERE, IN THE FIRST BYTES, WITHOUT JAVASCRIPT. The assertions
//      below run the actual edge function over the actual index.html and read the
//      HTML it returns. A block that only appears after the SPA boots would pass a
//      DOM test and fail the only reader that matters here.
//
//   2. IT NAMES ONE PERSON, BY THE CANONICAL ID. /p/mike_lee and /p/lee are one
//      senator; /p/scott_chew and /p/chew_h68 are one Utah representative. The app
//      has resolved both spellings for a while (person-file.js resolve()); the
//      edge could not, so an alias address kept the HOMEPAGE's canonical — a
//      second address for a person who already has one, declaring itself a
//      duplicate of "/". Both spellings must now produce one canonical, one og:url
//      and one h1. And an id that names nobody must mint NOBODY: an invented name
//      is worse than a duplicate page.
//
//   3. IT SAYS ONLY WHAT PHASE A IS ALLOWED TO SAY. Identity and a formal-record-
//      first framing. No Direction Match figure, no percentage, no "Accountability
//      Score", no "complete ballot", no with/against-party tally, no party letter
//      in body prose. The formal record is named before Word vs Action, because
//      that is the order the file itself keeps. The formal-pattern snapshot is
//      Phase B and this harness fails if it arrives early wearing Phase A's
//      clothes — and it fails if the scoring engines moved at all.
//
// And the fourth thing, which is not a copy rule: THE APP MUST STILL BOOT. The
// block is one insertion at one seam. Nothing else in the document may move, and
// person-file.js must still adopt a cold /p/<pid> arrival and hide the block once
// the live file is on screen.
//
//   node scripts/test-person-crawl-block.mjs
//
// Bundles netlify/edge-functions/share-preview.ts with esbuild and invokes it with
// a stubbed context.next() serving the real index.html. Loads person-file.js into a
// node:vm sandbox. No database, no network, no browser.

import { readFileSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++; else failures.push(`${m}\n    expected ${y}\n    got      ${x}`);
};
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const hasnt = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
// A harness that has gone stale must say so instead of passing. Every `must` here
// pins something this file reads BEFORE it can assert anything about behaviour.
const must = (c, m) => { if (c) return; console.error(`✗ crawl block: STALE HARNESS — ${m}`); process.exit(2); };

const INDEX_HTML = R("index.html");
const IDX = JSON.parse(R("db/share-index.json"));
const PF_SRC = R("person-file.js");
const SP_SRC = R("netlify/edge-functions/share-preview.ts");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the alias table is derived from the app's own tables, not invented");
// ═════════════════════════════════════════════════════════════════════════════
{
  must(IDX.people && IDX.personAliases, "db/share-index.json has no personAliases table — re-run scripts/gen-share-index.mjs");

  const A = IDX.personAliases;
  ok(Object.keys(A).length > 100, `personAliases is populated (${Object.keys(A).length} entries)`);
  eq(A.mike_lee, "lee", "mike_lee → lee");
  eq(A.scott_chew, "chew_h68", "scott_chew → chew_h68 (the retirement the repo already asserted)");
  eq(A.ken_ivory, "ivory_h39", "a curated browse key resolves to the roster record");

  // The two invariants that keep this from becoming an identity table of its own:
  // every TARGET is a person the index actually holds, and no KEY is one — an
  // alias for an id that already means itself would be a second name for a live
  // record rather than a bridge to it.
  const danglingTargets = Object.entries(A).filter(([, v]) => !IDX.people[v]).map(([k]) => k);
  eq(danglingTargets, [], "every alias target is a person the index holds");
  const keysThatAreRecords = Object.keys(A).filter((k) => IDX.people[k]);
  eq(keysThatAreRecords, [], "no alias key is itself a roster record — resolve() would never reach it");
  const selfRefs = Object.entries(A).filter(([k, v]) => k === v).map(([k]) => k);
  eq(selfRefs, [], "no alias points at itself");

  // PARITY WITH THE APP'S TABLE. PDX_PROFILE_ALIAS is the repo's standing
  // assertion about who is one person; the index must carry every entry of it
  // whose target is a live record, or the edge and the browser disagree about an
  // address the browser already resolves.
  const src = R("profile-evidence.js");
  const at = src.indexOf("window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS || {");
  must(at > 0, "profile-evidence.js no longer declares PDX_PROFILE_ALIAS the way the generator reads it");
  const literal = src.slice(src.indexOf("{", at), src.indexOf("};", at) + 1);
  const table = new Function(`return (${literal});`)();
  must(Object.keys(table).length > 20, `the PDX_PROFILE_ALIAS literal parsed (${Object.keys(table).length} entries)`);
  const missing = Object.entries(table)
    .filter(([k, v]) => IDX.people[v] && A[k] !== v)
    .map(([k, v]) => `${k}→${v}`);
  eq(missing, [], "the index carries every live PDX_PROFILE_ALIAS bridge");

  // The generator reads that table rather than restating it, which is what stops
  // the two from drifting.
  const gen = R("scripts/gen-share-index.mjs");
  has(gen, "PDX_PROFILE_ALIAS", "the generator reads the app's alias table");
  has(gen, "profile-evidence.js", "…out of the file that owns it");
  hasnt(gen, "mike_lee:", "the generator does not hardcode an alias of its own");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the edge resolves an arriving pid the way person-file.js does");
// ═════════════════════════════════════════════════════════════════════════════
// Not "similarly". The same answer, over the whole alias table, for both
// implementations — one in TypeScript at the edge, one in the browser. Two
// resolvers that disagree about who /p/mike_lee is would put a crawler and a
// reader on different people at the same address.
const S = await (async () => {
  const out = join(mkdtempSync(join(tmpdir(), "crawl-target-")), "share-target.mjs");
  execFileSync(
    join(ROOT, "node_modules/.bin/esbuild"),
    [join(ROOT, "netlify/lib/share-target.ts"), "--bundle", "--platform=node", "--format=esm", `--outfile=${out}`],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
  return import(out);
})();
must(typeof S.canonicalPersonId === "function", "share-target.ts no longer exports canonicalPersonId");
must(typeof S.parseTarget === "function" && typeof S.canonicalPath === "function", "share-target.ts lost parseTarget/canonicalPath");

const canon = (u) => {
  const t = S.parseTarget(new URL(u, "https://www.politidex.fyi"));
  return t ? S.canonicalPath(t) : null;
};

// ── person-file.js, in a sandbox, with the real roster identity ──────────────
function personFile(opts) {
  opts = opts || {};
  const calls = { openModal: [], replace: [] };
  const els = {};
  const doc = {
    readyState: "complete", _listeners: {},
    addEventListener(t, f) { (doc._listeners[t] = doc._listeners[t] || []).push(f); },
    getElementById(id) {
      if (!Object.prototype.hasOwnProperty.call(els, id)) return opts.autoEl === false ? null : (els[id] = makeEl(id));
      return els[id];
    },
    querySelector() { return null; },
  };
  function makeEl(id) {
    const attrs = {};
    return {
      id, innerHTML: "", className: "", style: {}, attrs, hidden: false,
      addEventListener() {},
      setAttribute(k, v) { attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
      removeAttribute(k) { delete attrs[k]; },
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      querySelector() { return null; },
    };
  }
  const win = {
    document: doc,
    location: { origin: "https://www.politidex.fyi", pathname: opts.pathname || "/", search: "", hash: "", href: "https://www.politidex.fyi/" },
    history: { replaceState(a, b, url) { calls.replace.push(url); }, pushState() {} },
    _listeners: {},
    addEventListener(t, f) { (win._listeners[t] = win._listeners[t] || []).push(f); },
    setTimeout() { return 0; }, clearTimeout() {},
    URLSearchParams, encodeURIComponent, console,
    openModal(id) { calls.openModal.push(id); win._pdxCurrentProfileId = id; },
    CMP_DATA: opts.roster || {},
    PROFILES: opts.profiles || {},
    _pdxRosterState: "done",
    PDXPublicationFloor: { clears: () => true },
    PDX_PROFILE_ALIAS: opts.aliases || {},
    ACCT_ALIAS: {},
  };
  win.window = win; win.globalThis = win;
  const ctx = vm.createContext(win);
  // Wired the way the document wires it: profile-evidence.js owns PDXProfilePid
  // and person-file.js consults it through window. Reproduced here rather than
  // loaded, because profile-evidence.js is a DOM-coupled module — the ORDER is the
  // part under test (a bridge outranks a stray document under the retired key).
  win.PDXProfilePid = function (id) {
    if (!id) return id;
    const hasRec = (x) => !!(win.PROFILES[x] || win.CMP_DATA[x]);
    const direct = win.PDX_PROFILE_ALIAS[id];
    if (direct && direct !== id && hasRec(direct)) return direct;
    if (hasRec(id)) return id;
    return id;
  };
  new vm.Script(PF_SRC, { filename: "person-file.js" }).runInContext(ctx);
  return { win, calls, doc, els, P: win.PDXPerson };
}

{
  // The real roster identity, out of the same generated index the edge reads, so
  // the two resolvers are compared over the whole table rather than over a sample
  // someone chose.
  const roster = {};
  for (const [id, rec] of Object.entries(IDX.people)) roster[id] = { name: rec.n };
  const app = personFile({ roster, aliases: IDX.personAliases });
  must(app.P && typeof app.P.resolve === "function", "PDXPerson.resolve did not register in the sandbox");

  const disagree = [];
  for (const alias of Object.keys(IDX.personAliases)) {
    const edge = S.canonicalPersonId(alias);
    const browser = app.P.resolve(alias);
    if (edge !== browser) disagree.push(`${alias}: edge=${edge} app=${browser}`);
  }
  eq(disagree.slice(0, 8), [], `the edge and person-file.js resolve all ${Object.keys(IDX.personAliases).length} aliases identically`);

  // Both directions of the two cases the mission names by hand.
  eq(S.canonicalPersonId("mike_lee"), "lee", "edge: mike_lee → lee");
  eq(app.P.resolve("mike_lee"), "lee", "app: mike_lee → lee");
  eq(S.canonicalPersonId("scott_chew"), "chew_h68", "edge: scott_chew → chew_h68");
  eq(app.P.resolve("scott_chew"), "chew_h68", "app: scott_chew → chew_h68");

  // An id nobody carries resolves to NOTHING in the app and to ITSELF at the
  // edge — and those are the same answer differently spelled: neither invents a
  // person, and the edge then finds no record for it and writes no block.
  eq(S.canonicalPersonId("definitely_not_a_politician"), "definitely_not_a_politician",
    "edge: an unknown id passes through unchanged rather than being mapped onto somebody");
  eq(app.P.resolve("definitely_not_a_politician"), "", "app: an unknown id resolves to nobody");

  // canonicalPath follows the resolved id, which is the whole point: one record,
  // one address, whichever spelling arrived.
  eq(canon("/p/mike_lee"), "/p/lee", "an alias address canonicalises to the roster address");
  eq(canon("/p/mike_lee/"), "/p/lee", "…with or without a trailing slash");
  eq(canon("/?p=mike_lee"), "/p/lee", "…and from the ?p= form too");
  eq(canon("/p/lee"), "/p/lee", "the canonical address is its own canonical");
  eq(canon("/p/definitely_not_a_politician"), "/p/definitely_not_a_politician",
    "an unknown pid keeps the address it was cited at — it is not silently repointed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the served HTML carries the block, in the first bytes, without JS");
// ═════════════════════════════════════════════════════════════════════════════
const EDGE = await (async () => {
  const out = join(mkdtempSync(join(tmpdir(), "crawl-edge-")), "share-preview.mjs");
  execFileSync(
    join(ROOT, "node_modules/.bin/esbuild"),
    [join(ROOT, "netlify/edge-functions/share-preview.ts"), "--bundle", "--platform=node", "--format=esm", `--outfile=${out}`],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
  return import(out);
})();
must(typeof EDGE.default === "function", "share-preview.ts no longer default-exports a handler");

// context.next() is the origin: the real index.html, exactly as the CDN would
// hand it over. Nothing else is stubbed, and fetch is poisoned so a resolver that
// quietly grew a network call on the anonymous person path fails here.
const realFetch = globalThis.fetch;
let fetches = 0;
globalThis.fetch = async (...a) => { fetches++; return realFetch(...a); };
const ctxNext = {
  next: async () =>
    new Response(INDEX_HTML, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }),
};
async function serve(path) {
  const res = await EDGE.default(new Request("https://www.politidex.fyi" + path), ctxNext);
  if (!res) return null; // fail-open passthrough: the page, exactly as it was
  return { status: res.status, html: await res.text() };
}
const blockOf = (html) => {
  const m = html.match(/<header id="pdx-crawl-person"[\s\S]*?<\/header>/);
  return m ? m[0] : "";
};

const LEE = await serve("/p/lee");
must(LEE && LEE.html, "the edge returned nothing for /p/lee — it used to rewrite this path");
{
  const { html } = LEE;
  const block = blockOf(html);
  ok(!!block, "/p/lee ships a crawl block in the served HTML");

  // THE ASSERTION THE MISSION IS WRITTEN AROUND: an <h1> with the name, in the
  // fetched bytes, not after JavaScript.
  has(html, "<h1>Mike Lee</h1>", "/p/lee raw HTML contains an <h1> naming Mike Lee");
  has(html, '<link rel="canonical" href="https://www.politidex.fyi/p/lee"', "…and canonicalises to its own address");
  has(html, '<meta property="og:url" content="https://www.politidex.fyi/p/lee"', "…and unfurls on the same address");
  has(html, 'data-pid="lee"', "…and the block names the canonical pid");
  has(html, "<title>Mike Lee", "…and keeps the unique title the previous pass shipped");

  // FIRST BYTES. The block sits immediately after <body>, ahead of every script
  // the shell loads, so a crawler that reads the head of the document and stops
  // has still read who the page is about.
  const bodyAt = html.indexOf("<body");
  const blockAt = html.indexOf('<header id="pdx-crawl-person"');
  const firstScriptAt = html.indexOf("<script", bodyAt);
  ok(blockAt > bodyAt, "the block is inside <body>");
  ok(blockAt < firstScriptAt, "…before the first script in the body, so no JS is needed to reach it");
  ok(blockAt - bodyAt < 1400, `…within the first bytes of the body (${blockAt - bodyAt} chars in)`);
  ok(!/<script/.test(block), "the block itself carries no script");

  // The whole shape, spelled out. A single dropped element here is the difference
  // between a document a crawler can read and a title with nothing behind it.
  has(block, 'id="pdx-crawl-person"', "block: the id the app hides by");
  has(block, "<h1>", "block: an h1");
  has(block, "U.S. Senator", "block: the office");
  has(block, "Utah", "block: the state");
  has(block, "formal voting record on PolitiDex", "block: what the page is");
  has(block, "Person file. Formal record first.", "block: the framing line");
  has(block, 'href="https://www.politidex.fyi/p/lee"', "block: a link to the canonical address");
  has(block, "Open the full file", "block: …with words a reader can act on");

  // ONE INSERTION, NOTHING ELSE MOVED. Strip the block (and the style that
  // belongs to it) out of the served document and the body must be byte-identical
  // to index.html's. This is what keeps the SPA's boot sequence intact: the block
  // is a sibling of the shell, not a wrapper around it, and no app markup was
  // rewritten to make room for it.
  const styled = html.match(/<style>#pdx-crawl-person[\s\S]*?<\/header>/);
  must(!!styled, "the injected style+block pair is no longer recognisable to this harness");
  const bodyOf = (h) => h.slice(h.indexOf("<body"));
  eq(bodyOf(html).replace(styled[0], "") === bodyOf(INDEX_HTML), true,
    "the served body is index.html's body plus exactly one insertion — nothing in the app shell moved");

  // Exactly one h1 was added, so the document does not now have two headlines
  // arguing about what it is about.
  const count = (h, re) => (h.match(re) || []).length;
  eq(count(html, /<h1[\s>]/g), count(INDEX_HTML, /<h1[\s>]/g) + 1, "the block adds exactly one h1 to the document");

  eq(fetches, 0, "no network call was made on the anonymous person-file path");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · one person, one document — whichever spelling arrived");
// ═════════════════════════════════════════════════════════════════════════════
{
  const alias = await serve("/p/mike_lee");
  must(alias && alias.html, "/p/mike_lee returned no rewritten document — the alias hop is not reaching the edge");
  has(alias.html, '<link rel="canonical" href="https://www.politidex.fyi/p/lee"',
    "/p/mike_lee canonicalises to /p/lee in the tags");
  has(alias.html, '<meta property="og:url" content="https://www.politidex.fyi/p/lee"', "…including og:url");
  has(alias.html, "<h1>Mike Lee</h1>", "…and names the same person in the crawl block");
  has(alias.html, 'data-pid="lee"', "…under the canonical pid, not the one that was typed");
  hasnt(blockOf(alias.html), "mike_lee", "the block never advertises the alias as an address");

  // Same for the retirement case, which is the one where a stray document under
  // the retired key used to open as a second current file for one seat.
  const chew = await serve("/p/scott_chew");
  must(chew && chew.html, "/p/scott_chew returned no rewritten document");
  has(chew.html, '<link rel="canonical" href="https://www.politidex.fyi/p/chew_h68"',
    "/p/scott_chew canonicalises to /p/chew_h68");
  has(chew.html, "<h1>Scott Chew</h1>", "…and names one Scott Chew");
  has(chew.html, 'data-pid="chew_h68"', "…under the roster id that holds the formal file");

  // Two spellings, one document: the crawl blocks are identical strings.
  const a = blockOf(alias.html), b = blockOf(LEE.html);
  eq(a === b, true, "the alias address and the roster address serve the same crawl block, byte for byte");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the homepage is untouched, and an unknown pid mints nobody");
// ═════════════════════════════════════════════════════════════════════════════
{
  const home = await serve("/");
  eq(home, null, "/ is not a share target — the edge hands the page back exactly as it was");
  has(INDEX_HTML, "<title>PolitiDex | Bound by Truth</title>", "the homepage keeps its own title");
  hasnt(INDEX_HTML, 'id="pdx-crawl-person"', "the homepage document carries no person crawl block of its own");
  hasnt(INDEX_HTML, "<h1>Mike Lee", "…and no person h1");

  // /index.html is the same document by another name.
  eq(await serve("/index.html"), null, "/index.html is likewise handed back untouched");

  // AN ADDRESS THAT NAMES NOBODY. It must not mint a name, not borrow the
  // homepage's h1 as a person's, and not guess at the nearest roster id.
  const ghost = await serve("/p/definitely_not_a_politician");
  eq(ghost, null, "an unknown pid falls through to the page rather than being dressed up as a record");
  ok(!IDX.people.definitely_not_a_politician && !IDX.personAliases.definitely_not_a_politician,
    "…and nothing in the index answers to it");

  // The same, for an id that is one edit away from a real one. A fuzzy match here
  // would be the worst possible failure: a confident h1 with the wrong person's
  // name on someone else's address.
  for (const ghostly of ["/p/lee_", "/p/mike_leee", "/p/l"]) {
    const g = await serve(ghostly);
    ok(g === null || !blockOf(g.html), `${ghostly} produces no crawl block`);
    if (g) hasnt(g.html, "<h1>Mike Lee</h1>", `${ghostly} does not borrow a real person's name`);
  }

  // A profile opened ON TOP of another surface keeps that surface's document: the
  // head follows what is on screen (it always has), but two surfaces must not both
  // claim the same h1.
  const layered = await serve("/issue/box-elder-stratos-data-center?p=lee");
  if (layered) {
    eq(blockOf(layered.html), "", "a ?p= profile layered on a Spotlight path does not inject a person h1 into the Spotlight's document");
  } else {
    ok(true, "the layered form resolved to nothing and was passed through");
  }
  const queryForm = await serve("/?p=lee");
  if (queryForm) eq(blockOf(queryForm.html), "", "the ?p= form on the homepage document injects no h1 either");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the copy walls Phase A ships under");
// ═════════════════════════════════════════════════════════════════════════════
{
  const block = blockOf(LEE.html);
  must(!!block, "no block to check the copy of");

  // Nothing in this block may read as a grade, a score or a tally. Each of these
  // is a phrase the app is careful about elsewhere; a crawlable summary is exactly
  // where one would leak into print and be cached by a search engine.
  for (const banned of [
    "Accountability Score", "accountability score", "Direction Match", "direction match",
    "complete ballot", "with party", "against party", "with their party", "grade", "Grade",
    "score", "Score", "%", "verdict", "Verdict", "kept", "broken",
  ]) {
    hasnt(block, banned, `the block does not say ${JSON.stringify(banned)}`);
  }
  ok(!/\d+\s*(%|percent)/i.test(block), "the block prints no percentage");
  ok(!/\b\d+\s*(of|\/)\s*\d+\b/.test(block), "…and no tally");
  // A party letter is office identity in a card headline and reads as a grade in
  // body prose, so the card keeps "(R)" and the block does not get it.
  ok(!/\((R|D|I|L|G)\)/.test(block), "the block carries no party letter");
  has(LEE.html, "· (R) ·", "…while the card headline still carries party as office identity");

  // ORDER IS AN ARGUMENT. The formal record is named before Word vs Action,
  // because that is what the file leads with — and Word vs Action is described as
  // the narrow, conditional check it is rather than as a second score.
  const formalAt = block.indexOf("Formal record first");
  const waAt = block.indexOf("Word vs Action");
  ok(formalAt > 0 && waAt > 0, "the block names both the formal record and Word vs Action");
  ok(formalAt < waAt, "the formal record is named FIRST");
  has(block, "only where a stated position exists", "Word vs Action is scoped to where a stated position exists");

  // Phase A is identity and a unique document. The formal-pattern snapshot is
  // Phase B: if it lands early, it lands with its own tests, not smuggled in here.
  for (const phaseB of ["Voted ", "Co-sponsored", "roll call", "Roll call", "H.R.", "S.B.", "H.B."]) {
    hasnt(block, phaseB, `Phase A does not print formal-record content (${JSON.stringify(phaseB)})`);
  }

  // The same walls over a wide sample of real people, not just the one everybody
  // checks. Every 11th person in the index, plus the named cases.
  const ids = Object.keys(IDX.people);
  const sample = ids.filter((_, i) => i % 11 === 0);
  let checked = 0;
  const offenders = [];
  for (const pid of sample) {
    const res = await serve("/p/" + pid);
    if (!res) { offenders.push(`${pid}: no document`); continue; }
    const b = blockOf(res.html);
    if (!b) { offenders.push(`${pid}: no block`); continue; }
    checked++;
    if (/%|\bscore\b|Accountability|\((R|D|I|L|G)\)/i.test(b)) offenders.push(`${pid}: banned copy`);
    // A clipped district string must not reach an indexable sentence as a
    // mid-word fragment with an unclosed parenthesis.
    const line = (b.match(/<p>([^<]*)<\/p>/) || [])[1] || "";
    if (line.includes("…")) offenders.push(`${pid}: clipped place text (${line})`);
    const opens = (line.match(/\(/g) || []).length, closes = (line.match(/\)/g) || []).length;
    if (opens !== closes) offenders.push(`${pid}: unbalanced parenthesis (${line})`);
    if (!line.endsWith("formal voting record on PolitiDex")) offenders.push(`${pid}: meta line does not end on the formal line`);
  }
  ok(checked > 50, `the sample is real (${checked} people served a block)`);
  eq(offenders.slice(0, 8), [], "every sampled person's block keeps the copy walls");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the SPA still boots, and the block yields to the live file");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The two path patterns must agree, or the edge writes a block on an address the
  // app will not adopt (or the reverse).
  has(PF_SRC, "/^\\/p\\/([A-Za-z0-9_]+)\\/?$/", "person-file.js still matches /p/<pid> with the pinned pattern");
  has(SP_SRC, "/^\\/p\\/([A-Za-z0-9_]+)\\/?$/", "…and the edge scopes the block to the same pattern");

  const roster = { lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah" } };
  const app = personFile({ roster, aliases: IDX.personAliases, pathname: "/p/mike_lee" });

  // ADOPTION STILL WORKS. A cold arrival on the alias address opens the canonical
  // file and stamps the canonical address — the behaviour the block must not cost.
  const adopted = app.P.adopt();
  eq(adopted, "lee", "a cold /p/mike_lee arrival still adopts and opens the person file");
  eq(app.calls.openModal, ["lee"], "…through the one funnel, on the canonical id");
  ok(String(app.calls.replace[0] || "").endsWith("/p/lee"), `…and stamps the canonical address (got ${JSON.stringify(app.calls.replace[0])})`);

  // AND THE BLOCK GETS OUT OF THE WAY. Hidden, not removed: a rendering crawler
  // that reads the document after scripts run still finds it, and the reader sees
  // the file instead of a summary of the file sitting above the app.
  const node = app.els["pdx-crawl-person"];
  must(node, "person-file.js never looked for the crawl node — crawlDone() is not being called");
  eq(node.hidden, true, "opening the live file hides the crawl block");
  eq(node.style.display, "none", "…belt and braces, with an inline display the block's own style cannot beat");
  has(PF_SRC, "function crawlDone", "person-file.js owns the hide, in a named function");
  has(PF_SRC, "try { crawlDone(); } catch (e) {}", "…called in a guard, so it can never take an open down with it");

  // The block is not removed from the DOM, and the app does not depend on it: an
  // arrival with NO block present (every address except /p/<pid>) must behave
  // exactly the same.
  const bare = personFile({ roster, aliases: IDX.personAliases, pathname: "/p/lee", autoEl: false });
  eq(bare.P.adopt(), "lee", "an arrival with no crawl block in the document adopts just the same");

  // AN UNRESOLVED ARRIVAL KEEPS ITS BLOCK. There is no live file to supersede it,
  // so hiding it would leave the reader with the app shell and nothing that names
  // what they asked for. (The edge writes no block for an unknown pid at all; this
  // pins the app half — it hides only on a successful open.)
  const ghost = personFile({ roster, aliases: IDX.personAliases, pathname: "/p/definitely_not_a_politician" });
  eq(ghost.P.adopt(), "", "an unresolvable arrival opens nothing");
  eq(ghost.els["pdx-crawl-person"], undefined, "…and nothing hid a block it never opened over");

  // The style the block ships is scoped to the block. A rule that reached the app
  // would be a layout change smuggled in as an SEO fix.
  const styleBlock = LEE.html.match(/<style>(#pdx-crawl-person[\s\S]*?)<\/style>/);
  must(styleBlock, "the block's inline style is no longer recognisable to this harness");
  const selectors = styleBlock[1].split("}").map((s) => s.split("{")[0].trim()).filter(Boolean);
  eq(selectors.filter((s) => !s.startsWith("#pdx-crawl-person")), [],
    "every rule the block ships is scoped to #pdx-crawl-person");
  has(styleBlock[1], "#pdx-crawl-person[hidden]", "…including the rule that lets the app hide it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the engines did not move");
// ═════════════════════════════════════════════════════════════════════════════
// This pass is a document-shape change. It has no business anywhere near the
// arithmetic, so the arithmetic is pinned by content hash against HEAD rather than
// by argument. Direction Match, the formal-pattern engines, the packs, the mappings
// and the roster itself must be byte-identical.
//
// The baseline is read through `git show`; this file never reaches into the .git
// directory itself. If git is unavailable the section reports that rather than
// passing quietly.
{
  const ENGINES = [
    "alignment-tool.js", "consistency.js", "word-action.js", "voting-record.js",
    "say-vs-do.js", "exec-record.js", "stance-helpers.js", "formal-index.js",
    "publication-floor.js", "cmp-data.js", "issue-colors.js",
    "netlify/lib/vr-pack.ts", "netlify/lib/vr-normalize.ts", "db/issue-keys.json",
  ];
  const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
  let compared = 0;
  const moved = [];
  for (const f of ENGINES) {
    let head;
    try {
      head = execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    } catch { continue; }
    compared++;
    if (sha(head) !== sha(R(f))) moved.push(f);
  }
  if (!compared) {
    console.log("      (no git baseline available — engine byte-identity not checked in this environment)");
  } else {
    ok(compared >= 10, `the engine set was read from HEAD (${compared} files)`);
    eq(moved, [], "Direction Match, the formal-pattern engines, the packs and the roster are byte-identical to HEAD");
  }

  // And the pass touched no scoring vocabulary in the files it DID change. Read
  // with comments stripped: the edge function DISCUSSES the copy walls at length in
  // prose, and a rule that a comment cannot name the thing it forbids would push
  // that reasoning out of the file where it belongs.
  const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const spCode = code(SP_SRC);
  ok(spCode.includes("personCrawlBlock"), "the edge's block builder survived comment-stripping");
  hasnt(spCode, "Accountability", "the edge function names no score");
  hasnt(spCode, "directionMatch", "…and reads no match figure");
  ok(!/%\s*[+"`]|percent/i.test(spCode), "…and formats no percentage");
  const pf = PF_SRC.slice(PF_SRC.indexOf("function crawlDone"), PF_SRC.indexOf("function restore"));
  ok(!/%|score|pct/i.test(pf), "the app's hide helper computes nothing and prints nothing");
}

console.log("");
if (failures.length) {
  console.error(`✗ person crawl block: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ person crawl block: /p/<pid> is its own document, and it names one person — ${passed} assertions passed\n`);
