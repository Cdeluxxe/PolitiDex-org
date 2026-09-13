#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-result-push.mjs — a result row PUSHES, so Back returns to the list
// ─────────────────────────────────────────────────────────────────────────────
// THE SCENARIO THIS FILE EXISTS FOR, walked end to end:
//
//   start at /, search "lee", click the row, press Back
//   → the reader is at / again, looking at index.html
//
// WHAT USED TO HAPPEN. Every surface that names a politician — the search rows,
// the Eye's people lane, the directory cards — opened the file by rendering it
// into index.html and then writing /p/<pid> into the address bar with
// history.replaceState. Two defects in one act:
//
//   · THE DOCUMENT WAS WRONG. /p/<pid> is served by person.html. Rendering the
//     file into index.html and relabelling the bar left the reader on one
//     document under another document's address — the same class of defect as
//     the close that left person.html on screen at '/', arrived at from the
//     other end.
//   · AND THE HISTORY WAS WRONG. replaceState overwrites the current entry
//     rather than adding one, so /p/<pid> did not go on top of '/' — it went in
//     PLACE of it. Back from a file opened out of a search skipped the list
//     entirely and landed on whatever the reader was on before the homepage.
//
// Both are answered by the same thing: going to a person is a NAVIGATION, and
// the navigation is a push. location.assign, never location.replace, and never
// a replaceState — the last two would each put the right address in the bar
// while still consuming the entry Back needs.
//
//   node scripts/test-result-push.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const ORIGIN = "https://www.politidex.fyi";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const has = (hay, needle, m) => ok(String(hay).includes(needle), `${m} — ${JSON.stringify(needle)} missing`);
const must = (c, m) => { if (c) return; console.error(`✗ result push: STALE HARNESS — ${m}`); process.exit(2); };

// ─────────────────────────────────────────────────────────────────────────────
// Which document does an address actually get? Read from netlify.toml.
// ─────────────────────────────────────────────────────────────────────────────
// The claim "Back returns to / WITH INDEX.HTML" is a claim about the deploy
// config, so it is read from the deploy config rather than restated here. Only
// 200 rewrites are collected: a 301 changes the address, and this is a question
// about which file answers an address that has stopped changing.
function rewrites() {
  const out = [];
  const src = R("netlify.toml");
  const re = /\[\[redirects\]\]([\s\S]*?)(?=\n\[\[|\n\[[^[]|$)/g;
  let m;
  while ((m = re.exec(src))) {
    const body = m[1];
    const from = /^\s*from\s*=\s*"([^"]+)"/m.exec(body);
    const to = /^\s*to\s*=\s*"([^"]+)"/m.exec(body);
    const status = /^\s*status\s*=\s*(\d+)/m.exec(body);
    if (!from || !to || !status || status[1] !== "200") continue;
    out.push({ from: from[1], to: to[1] });
  }
  return out;
}
const RULES = rewrites();
must(RULES.length > 4, `only ${RULES.length} 200-rewrites parsed out of netlify.toml — the harness is not reading the config`);

// First matching rule wins, which is Netlify's own order.
function documentFor(path) {
  for (const r of RULES) {
    if (r.from.endsWith("/*")) {
      const stem = r.from.slice(0, -1);
      if (path.startsWith(stem)) return r.to;
    } else if (r.from === path) return r.to;
  }
  return "/index.html";   // the site root, served as itself
}

must(documentFor("/p/lee") === "/person.html", `netlify.toml no longer sends /p/* to person.html (got ${documentFor("/p/lee")})`);
must(documentFor("/") === "/index.html", `netlify.toml no longer leaves / on index.html (got ${documentFor("/")})`);

// ─────────────────────────────────────────────────────────────────────────────
// A history stack that behaves like one
// ─────────────────────────────────────────────────────────────────────────────
// The point of the whole change is the DIFFERENCE between push and replace, so
// a harness that records calls without modelling the stack cannot see it: the
// defect and the fix both end with /p/lee in the bar, and they differ only in
// what is underneath. This models entries and an index, so "Back returns to the
// list" is something the test can actually ask.
function makeBrowser(startPath) {
  const st = {
    entries: [startPath],
    i: 0,
    docs: [documentFor(startPath)],
    // Every address-changing act, in order, labelled by mechanism.
    log: [],
  };
  const here = () => st.entries[st.i];
  const go = (url, kind) => {
    const path = String(url);
    st.log.push({ kind, url: path });
    if (kind === "assign" || kind === "pushState") {
      // A push truncates anything ahead of the cursor, as a real one does.
      st.entries.length = st.i + 1;
      st.docs.length = st.i + 1;
      st.entries.push(path);
      st.docs.push(kind === "assign" ? documentFor(path.split("#")[0]) : st.docs[st.i]);
      st.i++;
    } else {
      st.entries[st.i] = path;
      // A location.replace loads a document; a replaceState does not.
      if (kind === "locReplace") st.docs[st.i] = documentFor(path.split("#")[0]);
    }
  };
  const loc = {
    origin: ORIGIN,
    assign(u) { go(u, "assign"); },
    replace(u) { go(u, "locReplace"); },
  };
  Object.defineProperty(loc, "pathname", { get: () => here().split("#")[0].split("?")[0], enumerable: true });
  Object.defineProperty(loc, "search", {
    get: () => { const q = here().split("#")[0].indexOf("?"); return q < 0 ? "" : here().split("#")[0].slice(q); },
    enumerable: true,
  });
  Object.defineProperty(loc, "hash", {
    get: () => { const h = here().indexOf("#"); return h < 0 ? "" : here().slice(h); },
    enumerable: true,
  });
  Object.defineProperty(loc, "href", {
    get: () => ORIGIN + here(),
    set: (u) => go(String(u).replace(ORIGIN, ""), "assign"),
    enumerable: true,
  });
  return {
    st,
    location: loc,
    history: {
      pushState(a, b, u) { go(u, "pushState"); },
      replaceState(a, b, u) { go(u, "replaceState"); },
    },
    here,
    doc: () => st.docs[st.i],
    back() { if (st.i > 0) st.i--; return here(); },
    forward() { if (st.i < st.entries.length - 1) st.i++; return here(); },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The two modules that decide where a click goes
// ─────────────────────────────────────────────────────────────────────────────
const ROSTER = {
  lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah" },
  celeste_maloy: { name: "Celeste Maloy", office: "U.S. Representative", state: "Utah" },
};

function boot(startPath, opts) {
  opts = opts || {};
  const b = makeBrowser(startPath);
  const rendered = [];
  const docListeners = {};
  const document = {
    readyState: "complete",
    addEventListener(t, f) { (docListeners[t] = docListeners[t] || []).push(f); },
    querySelector() { return null; },
    getElementById() { return null; },
    title: "",
  };
  const win = {
    document,
    location: b.location,
    history: b.history,
    URLSearchParams,
    encodeURIComponent,
    setTimeout(f) { return 0; },
    clearTimeout() {},
    addEventListener() {},
    CMP_DATA: ROSTER,
    PROFILES: {},
    _pdxRosterState: "done",
    openModal(id) { rendered.push(id); win._pdxCurrentProfileId = id; },
    PDXPublicationFloor: { clears: () => true },
    console,
  };
  if (opts.profilePid) win.PDXProfilePid = opts.profilePid;
  win.window = win;
  win.globalThis = win;
  win.self = win;
  const ctx = vm.createContext(win);
  new vm.Script(R("person-file.js"), { filename: "person-file.js" }).runInContext(ctx);
  new vm.Script(R("person-link.js"), { filename: "person-link.js" }).runInContext(ctx);
  must(win.PDXPerson, "person-file.js did not publish PDXPerson in this harness");
  must(win.PDXPersonLink, "person-link.js did not publish PDXPersonLink in this harness");
  return { b, win, rendered, docListeners, P: win.PDXPerson, L: win.PDXPersonLink };
}

// A result row, as the surfaces actually print it: an <a href="/p/<pid>"> that
// the delegated listener in person-link.js sees on a plain click.
function rowClick(env, pid, extraAttrs) {
  const attrs = Object.assign({ "data-pdx-person-link": pid }, extraAttrs || {});
  let prevented = false;
  const a = { getAttribute: (k) => (k in attrs ? attrs[k] : null) };
  const ev = {
    button: 0,
    defaultPrevented: false,
    target: { closest: (sel) => (sel.indexOf("data-pdx-person-link") >= 0 ? a : null) },
    preventDefault() { prevented = true; ev.defaultPrevented = true; },
  };
  env.L._onClick(ev);
  return prevented;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The scenario, exactly as written
// ─────────────────────────────────────────────────────────────────────────────
section("1 · start at /, click a result for lee, press Back");
{
  const env = boot("/");
  eq(env.b.here(), "/", "the harness did not start on the homepage");
  eq(env.b.doc(), "/index.html", "the homepage is not being served index.html");

  const prevented = rowClick(env, "lee");
  ok(prevented, "the delegated listener let the click fall through without taking responsibility for it");

  eq(env.b.here(), "/p/lee", `clicking the row did not land on the person address (log=${JSON.stringify(env.b.st.log)})`);
  eq(env.b.doc(), "/person.html", "the person address is not being served person.html");
  eq(env.rendered.length, 0,
     `the row rendered the file into index.html instead of going to its document (saw ${JSON.stringify(env.rendered)})`);

  // THE ENTRY UNDERNEATH IS THE WHOLE POINT.
  eq(env.b.st.entries.length, 2,
     `the click did not add a history entry — /p/lee went in place of / rather than on top of it (entries=${JSON.stringify(env.b.st.entries)})`);
  eq(env.b.st.entries[0], "/", "the homepage entry was consumed by the click");

  // …and the mechanism was the sanctioned one.
  const kinds = env.b.st.log.map((e) => e.kind);
  eq(kinds.join(","), "assign", `the row used the wrong mechanism (log=${JSON.stringify(env.b.st.log)})`);

  // BACK.
  eq(env.b.back(), "/", "Back did not return to the homepage");
  eq(env.b.doc(), "/index.html",
     "Back returned to / but not to index.html — the address and the document disagree, which is the defect seen from the other end");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · Every door the three surfaces use, not just the anchor
// ─────────────────────────────────────────────────────────────────────────────
// The search rows and the directory reach the funnel through showProfile, the
// Eye reaches it through PDXPersonLink.open (its keyboard path) and through the
// delegated anchor listener (its click path). All of them end at
// PDXPerson.open, which is why the fix lives there and not in three places.
section("2 · anchor click, PDXPersonLink.open and PDXPerson.open all push");

for (const [label, drive] of [
  ["the delegated anchor listener", (env) => rowClick(env, "lee")],
  ["PDXPersonLink.open (the Eye's keyboard path)", (env) => env.L.open("lee")],
  ["PDXPerson.open (showProfile's funnel)", (env) => env.P.open("lee")],
]) {
  const env = boot("/");
  drive(env);
  eq(env.b.here(), "/p/lee", `${label} did not reach the person address`);
  eq(env.b.st.entries.length, 2, `${label} did not leave / underneath`);
  eq(env.b.st.log.every((e) => e.kind === "assign"), true,
     `${label} used a mechanism other than a pushing navigation (log=${JSON.stringify(env.b.st.log)})`);
  eq(env.b.back(), "/", `${label}: Back did not return to the list`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Neither forbidden mechanism, anywhere on this path
// ─────────────────────────────────────────────────────────────────────────────
section("3 · no replaceState and no location.replace from / onto /p/<pid>");
{
  const env = boot("/");
  env.P.open("lee");
  const bad = env.b.st.log.filter((e) => e.kind !== "assign" && String(e.url).indexOf("/p/") === 0);
  eq(bad.length, 0, `a forbidden mechanism was used to reach the person address (${JSON.stringify(bad)})`);
}

// The same rule, asserted over the source rather than over one run: there is one
// place in the app that writes a person path into the bar without navigating,
// and it is the alias correction inside stamp(), which is guarded.
{
  const files = ["person-file.js", "person-link.js", "profiles-full.js", "all-seeing-eye.js"];
  for (const f of files) {
    const src = R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const hits = src.match(/location\.replace\(\s*['"]\/p\//g) || [];
    eq(hits.length, 0, `${f} navigates onto a person address with location.replace, which consumes the entry Back needs`);
  }
  const pf = R("person-file.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const stamps = pf.match(/history\.replaceState\([^)]*path\(/g) || [];
  eq(stamps.length, 1, `person-file.js has ${stamps.length} replaceState calls onto a person path; exactly one (the guarded alias correction in stamp()) is expected`);
  ok(/if \(!fromPath\(location\.pathname\)\) return;/.test(pf),
     "stamp() no longer refuses to run off a person path — the /'-onto-/p/<pid> replaceState is reachable again");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · The alias correction still works, and still does not push
// ─────────────────────────────────────────────────────────────────────────────
// Arriving on /p/scott_chew whose record is filed under chew_h68 has to end up
// with the canonical address in the bar — in place. A push there is a trap:
// Back would return to the uncorrected address, which would correct itself
// again and push the reader forward.
section("4 · an alias arrival corrects in place, without an entry");
{
  const env = boot("/p/scott_chew", { profilePid: (id) => (id === "scott_chew" ? "chew_h68" : id) });
  env.win.CMP_DATA.chew_h68 = { name: "Scott Chew", office: "State Representative", state: "Utah" };
  env.P.open("scott_chew");
  eq(env.rendered.length, 1, `the alias arrival did not render in place (rendered=${JSON.stringify(env.rendered)}, log=${JSON.stringify(env.b.st.log)})`);
  eq(env.b.here(), "/p/chew_h68", "the alias arrival did not end up on the canonical address");
  eq(env.b.st.entries.length, 1,
     `the alias correction added a history entry — Back now returns to an address that corrects itself again (entries=${JSON.stringify(env.b.st.entries)})`);
  eq(env.b.st.log.every((e) => e.kind === "replaceState"), true,
     `the alias correction navigated instead of correcting in place (log=${JSON.stringify(env.b.st.log)})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · X still leaves for the homepage
// ─────────────────────────────────────────────────────────────────────────────
section("5 · closing the file assigns /");
{
  const env = boot("/p/lee");
  env.P.restore();
  eq(env.b.here(), "/", "the close did not put the reader back on the homepage address");
  eq(env.b.doc(), "/index.html", "the close left the person document on screen at /");
  eq(env.b.st.log.length, 1, `the close took more than one act (log=${JSON.stringify(env.b.st.log)})`);
  eq(env.b.st.log[0].kind, "assign", `the close did not use location.assign (log=${JSON.stringify(env.b.st.log)})`);
  // A push, so Back still returns to the file that was just closed.
  eq(env.b.st.entries.length, 2, "the close consumed the person-file entry instead of pushing the homepage over it");
  eq(env.b.back(), "/p/lee", "Back no longer returns to the file that was closed");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 · every surface that opens a person goes through the funnel
// ─────────────────────────────────────────────────────────────────────────────
// The push lives in PDXPerson.open. A surface that calls index.html's renderer
// DIRECTLY gets the old behaviour — a modal painted over the homepage, no
// document fetched, no history entry — no matter what person-file.js does. So
// the property is not "open() pushes", it is "there is no second way in", and
// that is a source-level fact about every shipped file rather than something a
// sandbox can observe.
section("6 · no surface reaches the renderer without trying the funnel first");
{
  // Where a bare openModal(...) call is legitimate, and why:
  //   profiles-full.js  defines it, re-enters it once a cold record lands, and
  //                     calls it as showProfile's fallback for a page that never
  //                     loaded person-file.js.
  //   person-file.js    IS the funnel; calling the renderer is its job.
  //   compare-hub.js    openFullProfile tries PDXPerson.open first and falls back.
  //   index.html        wires the renderer up and names it in prose.
  //   compare-table.js  the Full Profile button, funnel-first with a fallback.
  const ALLOWED = new Set([
    "profiles-full.js", "person-file.js", "compare-hub.js", "index.html",
    "compare-table.js",
  ]);
  // Every file the site ships, read off disk rather than listed here, so a new
  // surface is caught by existing and not by being remembered.
  const shipped = readdirSync(ROOT)
    .filter((f) => /\.(js|html)$/.test(f))
    .filter((f) => !/^(sw|firebase-boot)\.js$/.test(f));
  must(shipped.length > 40, `only ${shipped.length} shipped files found — the scan is not looking at the site`);
  must(shipped.includes("all-seeing-eye.js") && shipped.includes("index.html"),
    "the scan missed the Eye or the homepage, so section 6 proves nothing");

  const offenders = [];
  for (const f of shipped) {
    if (ALLOWED.has(f)) continue;
    const src = R(f);
    // openMediumModal / _openModal / closeModal are other functions whose names
    // merely contain this one; the boundary keeps them out.
    const re = /(^|[^A-Za-z0-9_$.])openModal\s*\(/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const lineStart = src.lastIndexOf("\n", m.index) + 1;
      const before = src.slice(lineStart, m.index);
      // Prose, not a call: two files discuss the renderer by name in a comment.
      if (/(^|[^:])\/\/|^\s*\*/.test(before)) continue;
      const line = src.slice(0, m.index).split("\n").length;
      // A guarded fallback is the point, not the offence: if the funnel is tried
      // within the same statement, this call is the else-branch.
      const stmt = src.slice(Math.max(0, m.index - 400), m.index);
      if (/PDXPerson\s*(\.|\[)|showProfile/.test(stmt)) continue;
      offenders.push(`${f}:${line}`);
    }
  }
  eq(offenders.join(" "), "",
    "a surface opens a person by calling the renderer directly, so it paints a modal over the homepage " +
    "instead of going to the person's own document and leaves nothing for Back to return to");

  // NOT VACUOUS: the two that were fixed this pass are real call sites, and the
  // funnel is what they reach now.
  const chip = R("index.html");
  ok(/window\.showProfile\b[\s\S]{0,120}?openModal/.test(chip),
    "index.html's linked-person chip no longer tries the funnel before the renderer");
  const cmp = R("compare-table.js");
  ok(/cmp-btn-profile[\s\S]{0,300}?window\.showProfile/.test(cmp),
    "the compare table's Full Profile button no longer goes through the funnel");
  // And the funnel itself still ends in a navigation rather than a stamp.
  has(R("person-file.js"), "location.assign(to)",
    "the funnel stopped navigating, so nothing above it can push");
}

console.log("");
if (failures.length) {
  console.error(`✗ result push: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ result push: a result opens the person's document, and Back returns to the list — ${passed} assertions passed\n`);
