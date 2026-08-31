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
//   3. IT SAYS ONLY WHAT IT IS ALLOWED TO SAY. Identity, a formal-record-first
//      framing, and the record's own pattern lines. No Direction Match figure, no
//      percentage, no "Accountability Score", no "complete ballot", no
//      with/against-party tally, no party letter in body prose, and no measure
//      citations. The formal record is named before Word vs Action, because that
//      is the order the file itself keeps. And this harness fails if the scoring
//      engines moved at all.
//
//   4. THE RECORD LINES ARE THE PROFILE BRIEF'S OWN ROWS. This is the assertion
//      that keeps the block honest as the data moves. The lines are baked at build
//      time (db/share-index.json's personRecord, from
//      scripts/gen-crawl-record.mjs) precisely so the edge never fetches the
//      voting-record API on an anonymous first byte — and a baked string is a
//      string that can go stale, or be wrong, and still render beautifully. So the
//      section below BOOTS THE REAL ENGINES, renders the real
//      PDXWordAction.briefHtml() for the same person, and requires every served
//      <li> to be a row that brief actually prints. A hand-written fixture, a
//      second pattern engine, or a snapshot regenerated against changed seeds all
//      fail here.
//
// And the fourth thing, which is not a copy rule: THE APP MUST STILL BOOT. The
// block is one insertion at one seam. Nothing else in the document may move, and
// person-file.js must still adopt a cold /p/<pid> arrival and hide the block once
// the live file is on screen.
//
//   node scripts/test-person-crawl-block.mjs
//
// Bundles netlify/edge-functions/share-preview.ts with esbuild and invokes it with
// a stubbed context.next() serving the real index.html. Loads person-file.js, and
// the whole record/consistency engine stack, into node:vm sandboxes. No database,
// no network, no browser.

import { readFileSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

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
  has(block, "<section data-pdx-crawl-record>", "block: the formal-record section");
  has(block, "<h2>Formal record</h2>", "block: …named as a record, not as a score");

  // ORDER INSIDE THE BLOCK. The framing sentence says what the file is before the
  // record lines say what is in it, and the link out comes last — so a crawler
  // that truncates the block still gets the framing with the lines it keeps.
  const framedAt = block.indexOf("Person file. Formal record first.");
  const recAt = block.indexOf("<section data-pdx-crawl-record>");
  const outAt = block.indexOf("Open the full file");
  ok(framedAt > 0 && recAt > framedAt, "the record section follows the framing line");
  ok(recAt < outAt, "…and precedes the link out");

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
  has(alias.html, 'data-pdx-crawl-for="/p/mike_lee"',
    "…and stamps the ADDRESS it was generated at, which is the alias the reader arrived on");
  hasnt(blockOf(alias.html), 'href="https://www.politidex.fyi/p/mike_lee"',
    "the block never advertises the alias as an address to open");

  // Same for the retirement case, which is the one where a stray document under
  // the retired key used to open as a second current file for one seat.
  const chew = await serve("/p/scott_chew");
  must(chew && chew.html, "/p/scott_chew returned no rewritten document");
  has(chew.html, '<link rel="canonical" href="https://www.politidex.fyi/p/chew_h68"',
    "/p/scott_chew canonicalises to /p/chew_h68");
  has(chew.html, "<h1>Scott Chew</h1>", "…and names one Scott Chew");
  has(chew.html, 'data-pid="chew_h68"', "…under the roster id that holds the formal file");

  // Two spellings, one record: the crawl blocks are identical strings apart from
  // the ADDRESS STAMP, which is by design the one thing that must differ. data-pid
  // says who the block is about (`lee`, both times); data-pdx-crawl-for says which
  // URL it was written for, and it is what lets a client prove the document it
  // received belongs to the address in its own bar without needing the alias table
  // the browser has not loaded yet. Everything a reader or a crawler sees — the
  // h1, the office line, the framing, the record rows, the canonical link — is
  // byte-identical.
  const destamp = (h) => h.replace(/ data-pdx-crawl-for="[^"]*"/g, "");
  const a = blockOf(alias.html), b = blockOf(LEE.html);
  ok(a !== b, "the two addresses stamp themselves differently…");
  eq(destamp(a) === destamp(b), true,
    "…and are otherwise the same crawl block, byte for byte: one person, one document");
  has(b, 'data-pdx-crawl-for="/p/lee"', "the roster address stamps itself too");

  // Spelled out for the record section specifically, because that is the half
  // that is looked up in a table: the snapshot is keyed on the CANONICAL id, so
  // an alias address cannot miss its own record (an alias-keyed lookup would
  // return nothing here and quietly serve a thinner page under a second URL).
  const recordOf = (html) => (html.match(/<section data-pdx-crawl-record>[\s\S]*?<\/section>/) || [""])[0];
  const ar = recordOf(alias.html), br = recordOf(LEE.html);
  ok(!!br, "/p/lee serves a formal-record section at all");
  eq(ar === br, true, "/p/mike_lee serves a byte-identical formal-record section");
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
  hasnt(INDEX_HTML, "data-pdx-crawl-record", "…and no formal-record section: / is not about a person");

  // /index.html is the same document by another name.
  eq(await serve("/index.html"), null, "/index.html is likewise handed back untouched");

  // The record section is scoped to a PERSON address, not written wherever the
  // edge happens to run. Every other path the config matches must be free of it.
  for (const other of ["/", "/index.html", "/issue/box-elder-stratos-data-center", "/b/utah", "/vote/119/house/1"]) {
    const res = await serve(other);
    hasnt(res ? res.html : INDEX_HTML, "data-pdx-crawl-record", `${other} carries no formal-record section`);
  }

  // AN ADDRESS THAT NAMES NOBODY. It must not mint a name, not borrow the
  // homepage's h1 as a person's, and not guess at the nearest roster id — and it
  // must not leave the crawl seam EMPTY either, because an empty seam at the top of
  // a /p/ document is a seam some cache layer fills with the last person file it
  // held. So it gets the GENERIC block: a person file with no name, no office, no
  // state, and zero issue rows.
  const ghost = await serve("/p/definitely_not_a_politician");
  must(ghost && ghost.html, "an unknown pid served no document at all");
  const ghostBlock = blockOf(ghost.html);
  ok(!!ghostBlock, "an unknown pid gets a block of its own rather than an empty seam");
  has(ghostBlock, "data-pdx-crawl-generic", "…marked as the generic one");
  has(ghostBlock, "<h1>Person file</h1>", "…headed as a person file and nobody in particular");
  has(ghostBlock, "record still loading", "…saying what the reader is actually looking at");
  hasnt(ghostBlock, "data-pdx-crawl-record", "…with NO formal-record section");
  hasnt(ghostBlock, "<li>", "…and not one issue row");
  hasnt(ghostBlock, "<ul>", "…not even an empty list");
  hasnt(ghostBlock, 'data-pid="', "…and no pid, because it is about nobody");
  ok(!IDX.people.definitely_not_a_politician && !IDX.personAliases.definitely_not_a_politician,
    "…and nothing in the index answers to it");
  // The head is untouched: there is no record to title or canonicalise, and
  // index.html's own canonical pointing at "/" is the right answer for an address
  // that names nothing.
  has(ghost.html, "<title>PolitiDex | Bound by Truth</title>",
    "an unknown pid keeps the shell's own title — nothing was invented for it");

  // The same, for an id that is one edit away from a real one. A fuzzy match here
  // would be the worst possible failure: a confident h1 with the wrong person's
  // name on someone else's address.
  for (const ghostly of ["/p/lee_", "/p/mike_leee", "/p/l", "/p/khann", "/p/not_a_real_pid"]) {
    const g = await serve(ghostly);
    must(g && g.html, `${ghostly} served no document`);
    const gb = blockOf(g.html);
    has(gb, "data-pdx-crawl-generic", `${ghostly} produces only the generic block`);
    hasnt(g.html, "<h1>Mike Lee</h1>", `${ghostly} does not borrow a real person's name`);
    hasnt(g.html, "<h1>Ro Khanna</h1>", `${ghostly} does not borrow another real person's name`);
    hasnt(gb, "data-pdx-crawl-record", `${ghostly} carries no formal-record section`);
    hasnt(gb, "<li>", `${ghostly} carries no other member's issue list`);
    hasnt(gb, "U.S. Senator · Utah", `${ghostly} prints no office it cannot vouch for`);
    hasnt(gb, "U.S. Representative · California", `${ghostly} prints no other office either`);
    hasnt(g.html, "Peace Through Strength", `${ghostly} prints nobody's lead issue`);
    has(gb, `data-pdx-crawl-for="${ghostly}"`, `${ghostly} stamps the address it was served at`);
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
section("6 · the copy walls the block ships under");
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

  // THE RECORD LINES ARE PATTERNS, NOT CITATIONS. The block prints the shape of
  // the record — a tier, an issue, the two side counts — and never an individual
  // act. A measure number or a "Voted yes on…" in a crawlable block is a specific
  // claim about a specific ballot, cached by a search engine, with no source link
  // next to it and no way for a correction to reach it. The full file, one click
  // away, carries every act with its citation; this block carries none.
  for (const citation of ["Voted ", "Co-sponsored", "roll call", "Roll call", "H.R.", "S.B.", "H.B."]) {
    hasnt(block, citation, `the block cites no individual measure (${JSON.stringify(citation)})`);
  }

  // The heading names a RECORD. "Formal record" is a description of what the lines
  // are; anything in the register of a rating would turn six ordinal facts into a
  // verdict the page never issued.
  has(block, "<h2>Formal record</h2>", "the section is headed as a record");
  for (const notARecord of ["Rating", "rating", "Report card", "report card", "Overall", "Summary score"]) {
    hasnt(block, notARecord, `the record section is not framed as a rating (${JSON.stringify(notARecord)})`);
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
    // "Accountability Score" is the banned phrase, and it must be matched as the
    // phrase: two of the app's own shipped issue labels are "🏦 Corporate
    // Accountability" and "🔒 Privacy & Big-Tech Accountability", and a bare
    // /Accountability/i here would flag a legitimate record line as banned copy —
    // failing the test for printing the issue vocabulary correctly.
    if (/%|\bscore\b|accountability score|\((R|D|I|L|G)\)/i.test(b)) offenders.push(`${pid}: banned copy`);

    // THE RECORD LINES, ACROSS THE SAMPLE. Two rules, and the second is the one
    // that matters: a person with nothing readable gets no section at all.
    const rec = (b.match(/<section data-pdx-crawl-record>[\s\S]*?<\/section>/) || [""])[0];
    const items = rec ? rec.match(/<li>[\s\S]*?<\/li>/g) || [] : [];
    if (rec) {
      if (!items.length) offenders.push(`${pid}: an empty record section was printed`);
      if (items.length > 6) offenders.push(`${pid}: ${items.length} record lines (cap is 6)`);
      for (const li of items) {
        const t = li.replace(/<[^>]*>/g, "");
        // Vocabulary, not free text: the tier words the record lane publishes.
        if (!/^(Strongly (supports|opposes)|Mostly (supports|opposes)|Split) · /.test(t)) {
          offenders.push(`${pid}: record line is not a published pattern label (${t})`);
        }
        // A tally is two side counts in the engine's own phrase, or it is absent.
        // Never a ratio, never a denominator, never a percentage.
        const tail = t.split(" · ").slice(2).join(" · ");
        if (tail && !/^\d+ (advanced|actions advanced|actions against)( · \d+ against)?$/.test(tail)) {
          offenders.push(`${pid}: record line tally is not a side count (${tail})`);
        }
      }
      if (!IDX.personRecord || !IDX.personRecord[pid]) offenders.push(`${pid}: printed lines the snapshot does not hold`);
    } else if (IDX.personRecord && IDX.personRecord[pid]) {
      offenders.push(`${pid}: the snapshot holds lines that were not printed`);
    }
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
section("7 · the record lines are the profile brief's own rows");
// ═════════════════════════════════════════════════════════════════════════════
// THE FAILURE THIS SECTION EXISTS TO CATCH. The record lines are baked into
// db/share-index.json at build time, because the alternative is fetching
// /api/voting-record on the anonymous first byte of every crawl of every person
// address. That is the right call and it has a cost: a baked string renders just
// as beautifully when it is stale, when it came from a hand-written fixture, or
// when someone stood up a second pattern engine to produce it. None of those
// failures are visible in the HTML.
//
// So this section does not check the block against the snapshot — it checks the
// block against THE LIVE BRIEF. The real consistency.js, word-action.js and
// voting-record.js are booted in a sandbox, the record lane is seeded from the
// shipped seeds, PDXWordAction.briefHtml() renders the same person's brief, and
// every served <li> must be a row that brief actually prints, tier and counts and
// all. The brief is the page a reader reaches by clicking "Open the full file";
// if the block and that page disagree about somebody's record, one of them is
// lying to a search engine.
{
  const ENGINE_STACK = [
    "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
    ...Array.from({ length: 15 }, (_, i) => `state-senate-stances-w${i + 2}.js`),
    "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js",
    "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "consistency.js",
    "voting-record.js", "word-action.js",
  ];
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ENGINE_STACK) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA; // profiles-full.js is not in the sandbox; the roster stands in, as elsewhere
  must(win.PDXWordAction && typeof win.PDXWordAction.briefHtml === "function",
    "PDXWordAction.briefHtml is no longer the brief renderer — this cross-check cannot run");
  must(win.PDXVotingRecord && typeof win.PDXVotingRecord.noteMember === "function",
    "PDXVotingRecord.noteMember is gone — the record lane cannot be seeded offline");

  // The federal lane, from the shipped seeds. This is the same projection
  // scripts/gen-crawl-record.mjs feeds the engines, read here through a SEPARATE
  // boot: agreement between the two is agreement about the engines' output, not a
  // shared cache.
  const corpus = buildCorpus(ROOT);
  must(corpus.byMember.size > 100, `the offline record corpus is real (${corpus.byMember.size} members)`);
  for (const [pid, items] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, items); } catch { /* one member's pack is not the run */ }
  }

  // Brief text, flattened the way a reader sees it. The brief prints a row as
  // "<issue> › 🏛 Record <tier> · <counts>", so a served line's three parts must
  // appear there in that arrangement.
  const briefText = (pid) => {
    let html = "";
    try { html = win.PDXWordAction.briefHtml(pid, win.CMP_DATA[pid]) || ""; } catch { html = ""; }
    return html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  };
  const linesOf = (html) => {
    const rec = (html.match(/<section data-pdx-crawl-record>[\s\S]*?<\/section>/) || [""])[0];
    return (rec.match(/<li>[\s\S]*?<\/li>/g) || []).map((li) =>
      li.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim()
    );
  };

  // ── the mission's named subject, line by line ──────────────────────────────
  const leeLines = linesOf(LEE.html);
  ok(leeLines.length >= 3 && leeLines.length <= 6, `/p/lee prints ${leeLines.length} record lines (3–6 expected)`);
  const leeBrief = briefText("lee");
  must(leeBrief.includes("The formal record"), "the brief did not render for lee — the sandbox is not seeded");

  const orphans = [];
  for (const line of leeLines) {
    const parts = line.split(" · ");
    const tier = parts[0], issue = parts[1], counts = parts.slice(2).join(" · ");
    // The brief's own arrangement, quoted. Requiring the ORDER (issue, then the
    // Record eyebrow, then the tier and counts) is what makes this a match against
    // a real row rather than a word search over a long page: the tier and the
    // counts have to belong to that issue.
    const want = `${issue} › 🏛 Record ${tier}${counts ? ` · ${counts}` : ""}`;
    if (!leeBrief.includes(want)) orphans.push(want);
  }
  eq(orphans, [], "every record line /p/lee serves is a row the live brief prints for Mike Lee");
  ok(leeLines.some((l) => /^(Strongly|Mostly) (supports|opposes) · /.test(l)),
    "…including at least one one-sided pattern");

  // ORDER IS THE BRIEF'S ORDER. The brief lists its strongest one-sided reads
  // first and then the rows that ran both ways; the block must not reshuffle them
  // into something that reads like a ranking of its own.
  const firstSplit = leeLines.findIndex((l) => l.startsWith("Split · "));
  const lastSided = leeLines.reduce((acc, l, i) => (l.startsWith("Split · ") ? acc : i), -1);
  ok(firstSplit === -1 || firstSplit > lastSided, "one-sided patterns come before the splits, as in the brief");

  // ── the executive lane reads its own surface ───────────────────────────────
  // consistency.js's roll-call shape returns "0 read" for a president by design,
  // so a block built off the wrong lane would print nothing for the most-crawled
  // person on the site. The brief asks the exec lane first; so must the snapshot.
  const trump = await serve("/p/trump");
  if (trump) {
    const tLines = linesOf(trump.html);
    ok(tLines.length > 0, `/p/trump prints its executive record (${tLines.length} lines)`);
    const tBrief = briefText("trump");
    const tOrphans = tLines.filter((line) => {
      const parts = line.split(" · ");
      const want = `${parts[1]} › 🏛 Record ${parts[0]}${parts.slice(2).length ? ` · ${parts.slice(2).join(" · ")}` : ""}`;
      return !tBrief.includes(want);
    });
    eq(tOrphans, [], "every record line /p/trump serves is a row the live exec brief prints");
  } else {
    ok(false, "/p/trump served no document — the most-crawled person on the site lost its block");
  }

  // ── A THIN FILE PRINTS NOTHING, AND SAYS NOTHING ABOUT IT ──────────────────
  // 472 of the 800 roster records are offices with no roll-call lane (attorneys
  // general, sheriffs, school boards) or files nobody has reviewed yet. Their
  // pages keep their name and their office. What they must never carry is a line
  // announcing the absence: "no pattern on file" reads as a finding about the
  // person, and it is a fact about our curation queue.
  const empties = Object.keys(IDX.people).filter((pid) => !IDX.personRecord[pid]);
  ok(empties.length > 50, `the index really holds unreviewed files (${empties.length})`);
  const thin = await serve("/p/" + empties[0]);
  must(thin && thin.html, `/p/${empties[0]} served no document`);
  const thinBlock = blockOf(thin.html);
  ok(!!thinBlock, `an unreviewed file still gets its identity block (${empties[0]})`);
  has(thinBlock, "<h1>", "…with a name");
  hasnt(thinBlock, "data-pdx-crawl-record", "…and no formal-record section at all");
  hasnt(thinBlock, "<ul>", "…not an empty list");
  for (const excuse of ["No pattern", "no pattern", "Not enough", "not enough", "No record", "no record", "unreviewed", "Thin"]) {
    hasnt(thinBlock, excuse, `…and no note about the absence (${JSON.stringify(excuse)})`);
  }

  // Also true of the engine's own answer: a pid the engines read nothing for must
  // be ABSENT from the snapshot rather than present with an empty list, because
  // that difference is what tells the edge to omit the section.
  const emptyLists = Object.entries(IDX.personRecord).filter(([, v]) => !Array.isArray(v) || !v.length).map(([k]) => k);
  eq(emptyLists, [], "the snapshot holds no empty entries — absence is expressed by absence");

  // ── the snapshot is a census, not a demo ──────────────────────────────────
  // One hand-checked senator would pass every assertion above. These pin the
  // SCALE: both lanes present, at scale, keyed the way the edge looks them up.
  const snap = IDX.personRecord;
  ok(Object.keys(snap).length > 250, `the snapshot covers the reviewed roster (${Object.keys(snap).length} people)`);
  const total = Object.values(snap).reduce((n, v) => n + v.length, 0);
  ok(total > 1200, `…with real depth (${total} lines)`);
  ok(Object.values(snap).every((v) => v.length <= 6), "no person carries more than 6 lines");
  // The Utah legislature is a SEPARATE lane in the generator (the three shipped
  // Utah floor/committee feeders, assembled the way scripts/vr-utah-fpi.mjs
  // assembles them). A federal-only snapshot would still pass everything above, so
  // the state seats are counted on their own: 82 of the 88 Utah legislators on the
  // roster carry lines, and a collapse to zero means a feeder stopped being read.
  const utah = Object.keys(snap).filter((pid) => /Utah State (Representative|Senator)/.test(IDX.people[pid]?.o || ""));
  ok(utah.length > 50, `the Utah lane is in the snapshot (${utah.length} state legislators) — its seeds are read, not skipped`);
  const aliasKeyed = Object.keys(snap).filter((pid) => IDX.personAliases[pid]);
  eq(aliasKeyed, [], "every snapshot key is a canonical roster id, never an alias");
  const strays = Object.keys(snap).filter((pid) => !IDX.people[pid]);
  eq(strays, [], "…and every snapshot key is a person the index holds");

  // The vocabulary, over the WHOLE table rather than over a sample: the labels are
  // the record lane's published tiers, and nothing here is a percentage or a total.
  const tiers = new Set();
  const badTally = [];
  for (const [pid, rows] of Object.entries(snap)) {
    for (const row of rows) {
      tiers.add(row.p);
      if (row.c && !/^\d+ (advanced|actions advanced|actions against)( · \d+ against)?$/.test(row.c)) {
        badTally.push(`${pid}: ${row.c}`);
      }
      if (/%|percent|\bscore\b/i.test(`${row.p} ${row.i} ${row.c || ""}`)) badTally.push(`${pid}: scored copy`);
    }
  }
  eq([...tiers].sort(), ["Mostly opposes", "Mostly supports", "Split", "Strongly opposes", "Strongly supports"],
    "the snapshot speaks only the record lane's published tiers");
  eq(badTally.slice(0, 6), [], "every tally in the snapshot is a side count, and nothing is scored");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the SPA still boots, and the block yields to the live file");
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
  // what they asked for. The edge now writes a GENERIC block on that address (see
  // section 5), which is exactly the thing worth keeping: it says what the page is
  // and names nobody. This pins the app half — it hides only on a successful open.
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
section("8b · /p/<pid> is THAT person in the first HTML — never another member's");
// ═════════════════════════════════════════════════════════════════════════════
// THE LIVE DEFECT THIS SECTION IS THE CONTRACT ON (Colt, 2026-08-30).
//
// https://www.politidex.fyi/p/khanna printed, in its FIRST HTML, before any script
// finished:
//
//     U.S. Senator · Utah
//     Strongly opposes · Peace Through Strength · 0 advanced · 7 against
//     Strongly supports · Tough on Crime …
//
// That is Mike Lee's formal record on Ro Khanna's address. After the roster loaded
// the modal corrected itself to Ro Khanna (CA House) — which is the worst shape a
// bug of this kind can take: a crawler and a slow phone both read the wrong person
// and never see the correction.
//
// Section 3 already proved /p/lee is Lee's. That is not the same claim as this one.
// This section is about the pairs: two addresses, served independently, must not
// share an office line, a lead issue, or a single record row that belongs to only
// one of them. It is written as fixtures over the rendered first HTML — the same
// bytes the reporter read with view-source — because every layer that got this
// wrong (a shell cache serving one body for all 800 URLs) was invisible to a test
// that only ever asked for one address.
{
  const KHANNA = await serve("/p/khanna");
  must(KHANNA && KHANNA.html, "/p/khanna served no document");

  const officeLine = (html) => {
    const b = blockOf(html);
    return (b.match(/<p>([^<]*formal voting record on PolitiDex)<\/p>/) || [])[1] || "";
  };
  const rowsOf = (html) => {
    const rec = (html.match(/<section data-pdx-crawl-record>[\s\S]*?<\/section>/) || [""])[0];
    return (rec.match(/<li>[\s\S]*?<\/li>/g) || []).map((li) =>
      li.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim()
    );
  };
  // The count of a needle in index.html is the BASELINE: the shell carries its own
  // inline seed data (the finance showcase names two Utah senators by office), so
  // "the document does not contain this string" is the wrong question. "The document
  // contains no MORE of this string than the shell already did" is the right one —
  // it is exactly the assertion that the injection added it.
  const count = (h, n) => h.split(n).length - 1;
  const addedNone = (html, needle, m) =>
    eq(count(html, needle), count(INDEX_HTML, needle), `${m} (baseline ${count(INDEX_HTML, needle)})`);

  // ── /p/khanna is Ro Khanna ────────────────────────────────────────────────
  has(KHANNA.html, "<h1>Ro Khanna</h1>", "/p/khanna's first HTML names Ro Khanna");
  eq(officeLine(KHANNA.html), "U.S. Representative · California · formal voting record on PolitiDex",
    "…with Khanna's own office line");
  has(KHANNA.html, 'data-pid="khanna"', "…under Khanna's pid");
  has(KHANNA.html, 'data-pdx-crawl-for="/p/khanna"', "…stamped with the address it was generated at");

  // The reported sentence, verbatim, and the rows that came with it.
  const kBlock = blockOf(KHANNA.html);
  hasnt(kBlock, "U.S. Senator · Utah", "/p/khanna's block does not say “U.S. Senator · Utah”");
  hasnt(kBlock, "Mike Lee", "…and does not name Mike Lee");
  addedNone(KHANNA.html, "Peace Through Strength", "/p/khanna's document adds no “Peace Through Strength”");
  addedNone(KHANNA.html, "0 advanced · 7 against", "…and none of Lee's lead tally");
  const kRows = rowsOf(KHANNA.html);
  ok(kRows.length >= 3, `/p/khanna prints its own record rows (${kRows.length})`);
  eq(kRows.filter((r) => /Peace Through Strength|Tough on Crime|Mass Deportations/.test(r)), [],
    "…and not one row off Mike Lee's record");

  // ── /p/lee is Mike Lee, and only Mike Lee ─────────────────────────────────
  has(LEE.html, "<h1>Mike Lee</h1>", "/p/lee's first HTML names Mike Lee");
  eq(officeLine(LEE.html), "U.S. Senator · Utah · formal voting record on PolitiDex",
    "…with Lee's own office line");
  const lBlock = blockOf(LEE.html);
  has(lBlock, "Peace Through Strength", "/p/lee's block leads on Lee's actual strongest row");
  has(lBlock, "0 advanced · 7 against", "…with its own tally");
  hasnt(lBlock, "Ro Khanna", "/p/lee's block does not name Ro Khanna");
  hasnt(lBlock, "U.S. Representative · California", "…and does not print Khanna's office");
  const lRows = rowsOf(LEE.html);
  eq(lRows.filter((r) => /Expand Voting Access|Stronger Gun Safety Laws|Protect Gun Rights/.test(r)), [],
    "…and not one row off Ro Khanna's record");

  // ── THE PAIR, STATED AS THE UNIQUENESS RULE ───────────────────────────────
  // Two pids → two different office lines and two different lead issues. This is
  // the assertion the defect would have failed at any layer: one body served under
  // two URLs makes both of these equal.
  ok(officeLine(LEE.html) !== officeLine(KHANNA.html), "two pids, two different office lines");
  const leadOf = (rows) => (rows[0] || "").split(" · ")[1] || "";
  ok(leadOf(lRows) && leadOf(kRows) && leadOf(lRows) !== leadOf(kRows),
    `two pids, two different lead issues (${leadOf(lRows)} vs ${leadOf(kRows)})`);
  eq(kBlock === lBlock, false, "…and two different crawl blocks");

  // ── ALIAS: /p/mike_lee IS LEE'S, SAME AS /p/lee ───────────────────────────
  const mikeLee = await serve("/p/mike_lee");
  must(mikeLee && mikeLee.html, "/p/mike_lee served no document");
  has(mikeLee.html, "<h1>Mike Lee</h1>", "/p/mike_lee's first HTML is Mike Lee's");
  eq(officeLine(mikeLee.html), officeLine(LEE.html), "…the same office line /p/lee serves");
  eq(rowsOf(mikeLee.html), lRows, "…and the same record rows, row for row");
  hasnt(blockOf(mikeLee.html), "Ro Khanna", "…and it is not somebody else's file under an alias");

  // ── WIDER THAN TWO. Uniqueness across a real slice of the roster, because a
  // fixture pair can be made to pass by two hardcoded strings. Every person with a
  // record in the snapshot in this sample must serve an office line and a lead
  // issue that belong to THEM, and the set of (office line, lead issue) pairs must
  // not collapse onto one value.
  const withRecord = Object.keys(IDX.personRecord).filter((_, i) => i % 23 === 0).slice(0, 14);
  ok(withRecord.length >= 8, `the uniqueness sample is real (${withRecord.length} people)`);
  const seen = [];
  const wrong = [];
  for (const pid of withRecord) {
    const res = await serve("/p/" + pid);
    if (!res) { wrong.push(`${pid}: no document`); continue; }
    const b = blockOf(res.html);
    if (!b.includes(`data-pid="${pid}"`)) wrong.push(`${pid}: block is not stamped with this pid`);
    if (!b.includes(`data-pdx-crawl-for="/p/${pid}"`)) wrong.push(`${pid}: block is not stamped with this address`);
    if (!b.includes(`<h1>${IDX.people[pid].n.replace(/&/g, "&amp;")}</h1>`)) wrong.push(`${pid}: h1 is not this person`);
    // The rows served are the rows the snapshot holds for THIS pid, and no other
    // person's. Compared as a set against the snapshot, which is keyed canonically.
    const want = IDX.personRecord[pid].map((r) => [r.p, r.i, r.c].filter(Boolean).join(" · "));
    const got = rowsOf(res.html);
    if (JSON.stringify(got) !== JSON.stringify(want)) wrong.push(`${pid}: rows are not this person's`);
    seen.push(`${officeLine(res.html)}||${leadOf(got)}`);
  }
  eq(wrong.slice(0, 6), [], "every sampled address serves its own person's identity and its own person's rows");
  ok(new Set(seen).size > 1, `the sample's (office, lead issue) pairs are not one repeated value (${new Set(seen).size} distinct)`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8c · no cache layer may serve one person's document at another's address");
// ═════════════════════════════════════════════════════════════════════════════
// WHERE THE LIVE DEFECT ACTUALLY LIVED. Section 8b proves the edge builds the right
// document; it always did. The wrong document was served by sw.js, whose navigation
// handler wrote EVERY document to the single '/' shell key and read that key for
// every address:
//
//     const cached = (await cache.match(req)) || (await cache.match('/'));
//     if (res && res.ok) cache.put('/', res.clone());
//
// So a visit to /p/lee turned the '/' entry into Lee's document, and the next
// /p/khanna navigation was served it — Lee's office, Lee's record rows, on Khanna's
// address — until the roster loaded and the modal corrected itself. The homepage
// got Lee's header too.
//
// This section pins the two halves of the repair: the SERVICE WORKER keys a cached
// document by the address it was generated at, and the DOCUMENT proves its own
// identity before it is believed (index.html's inline guard, run before the first
// paint). Read as source, because the alternative is a browser.
{
  const SW = R("sw.js");

  // ── the worker keys a document by its address ─────────────────────────────
  const nav = SW.slice(SW.indexOf("async function handleNavigate"), SW.indexOf("async function handleStatic"));
  must(nav.includes("cache.match"), "sw.js's handleNavigate is no longer recognisable to this harness");

  has(SW, "function navDocKey", "sw.js derives a cache key from the navigation's address");
  has(SW, "const PERSON_NAV_RE = /^\\/p\\/([A-Za-z0-9_]+)\\/?$/",
    "…recognising a person address with the same pattern the edge and the app use");
  ok(/return '\/p\/' \+ person\[1\]/.test(SW), "…and giving a person address a key of its own");

  // THE REGRESSION, NAMED. Neither of the two lines that caused it may come back.
  ok(!/cache\.put\('\/', res/.test(nav),
    "handleNavigate never writes a navigation's document to the '/' key — that is what poisoned the shell");
  ok(!/cache\.match\(req\)/.test(nav),
    "…and no longer reads a document by the raw request while falling back to '/' for every miss");

  // The '/' key is written by the homepage document and by nothing else.
  ok(/url\.pathname === '\/' \|\| url\.pathname === '\/index\.html'/.test(SW),
    "only / and /index.html map to the '/' key");
  ok(/&& !url\.search/.test(SW),
    "…and only without a query, so an address whose head the edge rewrites cannot become the homepage entry");

  // A person address with no entry of its own must reach the NETWORK, not borrow
  // '/'. The fallback to the shell exists, and it is after the network.
  const netAt = nav.indexOf("const res = await network");
  const shellAt = nav.indexOf("cache.match('/')");
  ok(netAt > 0 && shellAt > netAt,
    "a cold person address goes to the network first, and only falls back to the shell when that fails");
  ok(nav.indexOf("const cached = key ? await cache.match(key) : null") > 0,
    "…and a cached document is only ever read from this address's own key");

  // The shell is dropped outright on this deploy, because the poisoned '/' entry
  // is already on devices and neither fix can reach into it.
  const ver = (SW.match(/const CACHE_VERSION = '(v\d+)'/) || [])[1];
  must(ver, "sw.js no longer declares CACHE_VERSION");
  ok(Number(ver.slice(1)) >= 94,
    `sw: CACHE_VERSION is ${ver} — the v93 shell holds a person document under the '/' key on every ` +
    `device that ever opened a /p/ link, and only a rename deletes it`);

  // Person documents are the whole app shell each, so they are capped rather than
  // accumulated. Correctness is the KEY; this is the storage manners.
  has(SW, "PERSON_DOC_LIMIT", "sw.js caps how many person documents it keeps");
  has(SW, "async function prunePersonDocs", "…with a prune that only ever deletes person-document keys");

  // ── the document proves its own identity, before the first paint ──────────
  const bodyAt = INDEX_HTML.indexOf("<body");
  const guardAt = INDEX_HTML.indexOf("data-pdx-crawl-for", bodyAt);
  ok(guardAt > bodyAt, "index.html carries a crawl-header guard inside <body>");
  const firstFileScript = INDEX_HTML.indexOf("<script src=", bodyAt);
  ok(guardAt < firstFileScript,
    "…inline and ahead of every script FILE the shell loads, so it runs before the header can paint");
  const guard = INDEX_HTML.slice(INDEX_HTML.lastIndexOf("<script>", guardAt), INDEX_HTML.indexOf("</script>", guardAt));
  has(guard, "getElementById('pdx-crawl-person')", "the guard reads the crawl header the edge injected");
  has(guard, "stamp===here", "…compares its stamp to the address in the bar");
  has(guard, "data-pdx-crawl-generic", "…and marks what is left as generic");
  has(guard, "removeAttribute('data-pid')", "…dropping the pid it can no longer vouch for");
  has(guard, "<h1>Person file</h1>", "…replacing the whole header with the generic wording");
  ok(!/<li>|<ul>/.test(guard), "…which contains no issue row and no list");
  has(guard, "catch(e){}", "…and fails silent, so it cannot cost the page its boot");
  // The guard replaces the header WHOLESALE (innerHTML), which is what guarantees
  // the record section goes with it — there is no selective removal to get wrong.
  has(guard, "el.innerHTML=", "the guard replaces the header's contents outright");

  // The guard's escape hatch is the stamp, and the stamp comes from the edge. Both
  // halves have to exist or the guard would wipe every correct block it sees.
  has(SP_SRC, "data-pdx-crawl-for", "the edge stamps the address it generated the block at");
  has(LEE.html, 'data-pdx-crawl-for="/p/lee"', "…on a real person's document");

  // And the app half is unchanged in the one way that matters: person-file.js still
  // hides the block on a successful open, and still leaves it alone otherwise.
  has(PF_SRC, "function crawlDone", "person-file.js still owns the hide");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the engines did not move");
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
    "alignment-tool.js", "consistency.js",
    "say-vs-do.js", "exec-record.js", "stance-helpers.js",
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

  // ── voting-record.js: PINNED EVERYWHERE EXCEPT THE ONE LINE THE ARRIVAL GOES
  // THROUGH. It was in the list above until the seed brief had to learn when to
  // stand down, and the fix is a single dispatch inside noteMember(): the one
  // place every path that puts a member's rows in memory arrives at, and
  // therefore the only place that can announce it for all of them. Nothing else
  // in the file may move — the request path, the pack, the drain queue and the
  // counts are what the whole record surface is built on — so the method is cut
  // out on both sides at its own boundaries and everything around it is compared
  // byte for byte, which is stricter than the blanket hash was for the other 99%
  // of the file.
  {
    const VR_NOW = R("voting-record.js");
    let headVR = null;
    try {
      headVR = execFileSync("git", ["show", "HEAD:voting-record.js"], { cwd: ROOT, encoding: "utf8" });
    } catch { /* no baseline here */ }
    if (!headVR) {
      console.log("      (no git baseline available — voting-record.js shape not checked in this environment)");
    } else {
      const cut = (src) => {
        const a = src.indexOf("    noteMember: function (id, items) {");
        const b = src.indexOf("\n    memberRecords: function (id)", a);
        must(a !== -1 && b > a, "voting-record.js's noteMember/memberRecords pair no longer reads as written");
        return { before: src.slice(0, a), body: src.slice(a, b), after: src.slice(b) };
      };
      const ha = cut(headVR), hb = cut(VR_NOW);
      eq(sha(ha.before), sha(hb.before),
        "everything in voting-record.js above noteMember() is byte-identical to HEAD");
      eq(sha(ha.after), sha(hb.after),
        "…and everything below it — the batch fetch, the pack, the drain queue, the counts — as well");
      // And inside the method: everything it did at HEAD it still does, named one
      // claim at a time rather than compared line by line — the cache write now
      // goes through a local `key` so the previous answer can be read for the
      // transition test, which is a different line for the same store.
      const code = hb.body.replace(/^\s*\/\/.*$/gm, "").replace(/\n\s*\n/g, "\n");
      has(code, "if (!id || !Array.isArray(items)) return;",
        "noteMember() no longer refuses a non-array payload");
      has(code, "canonPid(id)", "…or no longer canonicalises the id it stores under");
      has(code, "= items.slice()", "…or no longer copies the rows instead of holding the caller's array");
      has(code, "window.PDXDataChanged()", "…or no longer bumps the derivation epoch every cached read keys on");
      // The store is written exactly once, under the canonical key and nowhere else.
      const writes = (code.match(/this\._records\[[^\]]+\] =/g) || []);
      eq(writes.length, 1, "noteMember() writes the record store more than once");
      has(writes[0], "key", "…and the one write is not through the canonicalised key");
      has(code, "var key = canonPid(id);", "…which is where that key comes from");
      has(code, "'pdx-record-noted'", "noteMember() does not announce the arrival it just took");
      has(code, "had.length < items.length",
        "…and it announces on every call rather than on a transition, which is ~950 repaints per homepage render");
      ok(!/fetch|_state|queue|pack/i.test(code),
        "noteMember() grew a request, a queue or a pack — it is a cache write and an announcement, nothing else");
    }
  }

  // formal-index.js is deliberately NOT in that list, and the distinction matters.
  // Every other file there is written by hand, so a byte for byte match against HEAD is
  // exactly the right guard. formal-index.js is generator output: it is a committed count
  // of the sourced acts in the shipped Utah seeds, so any pass that admits an act MUST
  // regenerate it, and pinning it to HEAD would make this document-shape harness fail on
  // every future data wave for the one file that is supposed to change. What actually
  // needs protecting is the pair of properties a stale or hand edited index would break:
  //
  //   1. the file is exactly what its generator produces from the shipped seeds, and
  //   2. the READER LOGIC around the generated tables has not moved — because that logic
  //      is the publication floor's contract, and a data regeneration must not be cover
  //      for quietly changing what `acts`, `measures`, `has` or `emptyNote` return.
  //
  // Both are checked instead. Per-member movement in the counts themselves is proved
  // where it belongs, in scripts/test-vr-utah-name-admit.mjs, which boots the engine
  // before and after and shows every untouched member identical.
  {
    const gen = spawnSync("node", [join(ROOT, "scripts/gen-formal-index.mjs"), "--check"],
      { cwd: ROOT, encoding: "utf8" });
    eq(gen.status, 0, "formal-index.js is exactly its generator's output for the shipped seeds");
    // Strip the two generated tables and compare what is left. The tables are delimited by
    // their own declarations, so this reads the hand-written scaffolding on both sides.
    const logic = (src) => src.replace(/var (?:COUNTS|EMPTY) = \{[\s\S]*?\n  \};/g, "var $1 = {/* generated */};");
    let headFI = null;
    try {
      headFI = execFileSync("git", ["show", "HEAD:formal-index.js"], { cwd: ROOT, encoding: "utf8" });
    } catch { /* no baseline in this environment; the generator check still ran */ }
    if (headFI) {
      const a = logic(headFI), b = logic(R("formal-index.js"));
      ok(a.length < headFI.length, "the generated tables were located and set aside");
      eq(sha(a), sha(b), "formal-index.js's reader logic is byte-identical to HEAD — only counts moved");
    }
  }

  // word-action.js is the second deliberate exclusion, for the same reason and by the
  // same method as formal-index.js above: this pass had to change it. The cold /p/<pid>
  // brief is rendered here, and the whole point of the pass was that a cold arrival must
  // stop printing "No formal pattern on file yet" over a record the header above it had
  // already listed. Pinning the file to HEAD would say the change is forbidden, which is
  // false; deleting the pin would say nothing in the file matters, which is worse — the
  // Direction Match arithmetic, the copy FRAME, the floors and the repaint list all live
  // in this file, inches from the lines that moved.
  //
  // So the pin is narrowed to a shape rather than a hash, and the shape is strict: the
  // file's top-level functions are lifted out on both sides and compared one by one, and
  // everything that is NOT inside a top-level function — every constant, the FRAME copy
  // table, SHAPE_MIN, HERO_REPAINT — is compared as a whole. A change is allowed only if
  // it is one of the named brief-path functions this pass owns. Anything else moving,
  // anywhere in eighty-odd kilobytes, fails here.
  {
    // A brace scanner that also knows about regex literals. word-action.js contains
    // /data-pdxwa="([^"]+)"/ inside sectionHtml(), and a scanner that reads that
    // double-quote as a string opener swallows the rest of the file in silence — which
    // looks exactly like "one enormous function, unchanged".
    const RE_OK = "(,=:[!&|?{};+-~*%^<>\n\t ";
    const scanFn = (src, head) => {
      let i = src.indexOf("{", head), depth = 0, prev = "";
      for (; i < src.length; i++) {
        const c = src[i], n = src[i + 1];
        if (c === "/" && n === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
        if (c === "/" && n === "*") { i = src.indexOf("*/", i) + 1; continue; }
        if (c === "/" && RE_OK.includes(prev)) {
          let j = i + 1, cls = false;
          for (; j < src.length; j++) {
            const d = src[j];
            if (d === "\\") { j++; continue; }
            if (d === "[") cls = true;
            else if (d === "]") cls = false;
            else if (d === "/" && !cls) break;
            else if (d === "\n") { j = -1; break; }
          }
          if (j > 0) { i = j; prev = "/"; continue; }
        }
        if (c === "'" || c === '"' || c === "`") {
          let j = i + 1;
          for (; j < src.length; j++) { const d = src[j]; if (d === "\\") { j++; continue; } if (d === c) break; }
          i = j; prev = c; continue;
        }
        if (c === "{") depth++;
        else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
        if (!/\s/.test(c)) prev = c;
      }
      return { text: src.slice(head, i), end: i, depth };
    };
    // Top level means exactly two spaces of indent: word-action.js is one IIFE, and
    // anything deeper is a closure inside a function this scan already captured whole.
    const fnMap = (src, side) => {
      const fns = new Map(), spans = [], torn = [];
      const re = /\n  function ([A-Za-z0-9_$]+)\s*\(/g;
      let m;
      while ((m = re.exec(src))) {
        const head = m.index + 1;
        const f = scanFn(src, head);
        if (f.depth !== 0) { torn.push(m[1]); continue; }
        fns.set(m[1], f.text);
        spans.push([head, f.end]);
        re.lastIndex = f.end;
      }
      // A torn scan is not a soft failure: it would silently hide every function after
      // the tear inside one oversized body, and two torn sides compare as equal.
      eq(torn, [], `word-action.js (${side}) brace-scanned end to end`);
      if (torn.length) return null;
      let rest = "", at = 0;
      for (const [a, b] of spans) { rest += src.slice(at, a); at = b; }
      return { fns, rest: rest + src.slice(at) };
    };

    let headWA = null;
    try {
      headWA = execFileSync("git", ["show", "HEAD:word-action.js"], { cwd: ROOT, encoding: "utf8" });
    } catch { /* no baseline here; the shape checks below need one, so they are skipped */ }
    if (!headWA) {
      console.log("      (no git baseline available — word-action.js shape not checked in this environment)");
    } else {
      const A = fnMap(headWA, "HEAD"), B = fnMap(R("word-action.js"), "working copy");
      if (A && B) {
        ok(A.fns.size > 100, `word-action.js's top-level functions were located (${A.fns.size} at HEAD)`);

        // The three functions the crawl-seed pass owned. Each one is a sentence about
        // an absent record, and each one had to learn that "absent" and "not read
        // yet" are different states:
        //   armBriefDeadline   the timeout can now be armed by the index acquiring
        //                      rows, not only by a warm read resolving
        //   briefAbsenceCopy   the empty sentence is last, behind the record checks
        //   briefHeroHtml      an empty shape falls back to the seed rows first
        //
        // …AND THE SECOND ROUND, which is the pass that made the seed stand down.
        // The seed brief printed for the life of the document — the header stays in
        // the DOM (hidden) and a payload the index reads no issue off leaves the
        // shape empty — so the licence was moved from "the engine has nothing" to
        // "there is no payload":
        //   briefSeedHtml      refuses outright once memberRecords(pid) is non-empty
        //   briefHeroHtml      asks that same question at the decision
        //   briefAbsenceCopy   releases the wait on the payload, not on a settle
        //                      that never comes for a file with no stance ledger
        //   briefLiveN         stamps the clock the 2s release reads
        //   briefRecordOnHand  asks formalHasRecord instead of re-deriving 'deep'
        //   formalKnown        four answers, not three — 'thin' joins 'deep'
        //   bindHero           listens for the arrival, tolerates an aliased id, and
        //                      does not go deaf on a host that has not landed yet
        //   shapeMatchHtml     the SAME two sentences, asked by name; see the note
        //                      over the byte-identity list below
        const TOUCHED = ["armBriefDeadline", "briefAbsenceCopy", "briefHeroHtml",
          "briefSeedHtml", "briefLiveN", "briefRecordOnHand", "formalKnown",
          "bindHero", "shapeMatchHtml"];
        // …and the readers the two passes added. Every one is a pure read of state
        // that already existed in the tab — the live member payload, the crawl
        // header's rows, the static formal index, the pattern index's shape, the
        // settle flag, the wall clock — or, in armPayloadDeadline's case, the one
        // timer that stops the arriving sentence from being the last word.
        const ADDED = ["briefLiveN", "briefSeedRows", "briefRecordOnHand",
          "briefShaped", "briefSettled", "briefSeedHtml",
          "formalHasRecord", "nowMs", "stampLive", "liveHeldMs",
          "armPayloadDeadline", "evForPid"];

        const changed = [], added = [], removed = [];
        for (const [k, v] of A.fns) {
          if (!B.fns.has(k)) removed.push(k);
          else if (sha(v) !== sha(B.fns.get(k))) changed.push(k);
        }
        for (const k of B.fns.keys()) if (!A.fns.has(k)) added.push(k);

        eq(removed, [], "word-action.js lost no function — nothing was deleted to make room");
        eq(changed.filter((f) => !TOUCHED.includes(f)).sort(), [],
          "…and the only function bodies that moved are the three brief-path functions this pass owns");
        eq(added.filter((f) => !ADDED.includes(f)).sort(), [],
          "…and the only functions it gained are the six named record readers");
        // Named individually as well as covered by the set above, because these are the
        // ones the brief said not to touch and a reader of this file should be able to
        // see them checked by name.
        // shapeMatchHtml IS NO LONGER IN THIS LIST, and the reason is worth stating
        // where the exception is taken. Its two loading sentences split on whether
        // the shipped index holds a record for this person, and they asked for that
        // by testing `formalKnown(pid) === 'deep'`. formalKnown gained a fourth
        // answer in this pass ('thin', for a file the index counts acts for across
        // fewer than eight distinct measures), so leaving that literal in place
        // would have CHANGED Direction Match's copy on those files — the opposite of
        // what the brief asked for. Both sites now put the question by its own name,
        // formalHasRecord(), which is 'deep' or 'thin'. The bytes moved so the
        // behaviour would not, and the behaviour is proved rather than asserted:
        // scripts/test-seed-yields-to-record.mjs boots HEAD's word-action.js beside
        // the working copy and compares the rendered Direction Match block for every
        // roster member whose read is warming — the only state these lines are
        // reachable in.
        for (const f of ["read", "scopedRead", "issueRead", "heroRead", "ringDash",
          "shapeRead", "recordDepth", "mappedUnits", "judgedOf"]) {
          if (!A.fns.has(f)) { ok(false, `word-action.js still defines ${f}()`); continue; }
          eq(sha(A.fns.get(f)), sha(B.fns.get(f) || ""),
            `${f}() is byte-identical to HEAD — Direction Match and the floors did not move`);
        }

        // Everything outside a function: the FRAME copy table that names the metric, the
        // tier weights, SHAPE_MIN / SHAPE_MIN_READ, HERO_REPAINT. Comments are stripped
        // because this pass wrote a long one explaining the defect, and the declarations
        // the two passes ADDED are set aside by name — each one listed here, so a value
        // that appears without being named in this test still fails.
        //
        //   SEED_NOTE          the seed brief's disclosure line
        //   FORMAL_DEEP_MIN    the measure count that tells 'deep' from 'thin'
        //   PAYLOAD_GRACE_MS   how long a landed payload may still be "arriving"
        //   _liveAt/_liveTimer the payload clock and its one timer
        //   MAPPED_GAP_COPY    the mapping-gap sentence, quoted once
        //   HERO_REPAINT       gained 'pdx-record-noted' — the arrival announcing
        //                      itself, which is the event that ends the seed. The
        //                      three it already carried are asserted unchanged
        //                      beside it rather than being waved through.
        const REPAINT_RE = /\n\s*var HERO_REPAINT = \[[\s\S]*?\];\n/;
        for (const src of [A.rest, B.rest]) {
          const m = src.match(REPAINT_RE);
          must(m, "word-action.js no longer declares HERO_REPAINT as a literal list");
          for (const ev of ["pdx-consistency-warm", "pdx-voting-warm", "pdx-brief-timeout"]) {
            has(m[0], ev, `HERO_REPAINT lost ${ev} — a surface that used to repaint no longer does`);
          }
        }
        has(B.rest.match(REPAINT_RE)[0], "pdx-record-noted",
          "HERO_REPAINT does not listen for the arrival itself, so a payload that lands " +
          "without a lane event repaints nothing");
        const bare = (src) => src
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "")
          .replace(/\n\s*var SEED_NOTE = [\s\S]*?';\n/g, "\n")
          .replace(/\n\s*var MAPPED_GAP_COPY = [\s\S]*?';\n/g, "\n")
          .replace(/\n\s*var FORMAL_DEEP_MIN = [^\n]*\n/g, "\n")
          .replace(/\n\s*var PAYLOAD_GRACE_MS = [^\n]*\n/g, "\n")
          .replace(/\n\s*var _liveAt = [^\n]*\n/g, "\n")
          .replace(REPAINT_RE, "\n")
          .replace(/\n\s*\n/g, "\n").trim();
        const xa = bare(A.rest), xb = bare(B.rest);
        ok(xa.length > 3000, "the file's top-level constants were isolated from its functions");
        eq(sha(xa), sha(xb),
          "every constant in word-action.js — FRAME, the tier weights, the shape gate, the repaint list — is byte-identical to HEAD");
      }
    }
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
