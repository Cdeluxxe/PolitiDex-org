#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-home-hygiene.mjs — the front page after the /library extract
// ─────────────────────────────────────────────────────────────────────────────
// Three defects were visible on Home at once, and all three were consequences of
// rooms leaving index.html rather than of anything a reader did:
//
//   1. RAW JAVASCRIPT UNDER THE FOOTER. Follow the Money's departure deleted a
//      leaderboard IIFE that shared one <script> block with
//      window.toggleFollowMoney. Removing the first half took the OPENING TAG
//      with it, so the browser parsed the second half as body text and painted
//      the function's source under the footer — and the name was never defined,
//      which made the 💰 button in the profile modal throw on click.
//
//   2. CURATOR CHROME ON AN ANONYMOUS FRONT PAGE. DATABASE EXPANSION / Bulk
//      Import / AI-Assisted Database Expansion and the Politician Manager stood
//      in the document for every visitor, hidden by one inline style and
//      revealed by one line of JavaScript. That is a reveal, not a gate.
//
//   3. THE LESSON BEHIND A DOOR. The H.R.1 teaching case lived only inside
//      #hr1-showcase, which starts display:none inside #pdx-door-work, so the
//      one thing most worth learning was the one thing a reader had to hunt for.
//
// What must stay true:
//
//   · Zero source text is visible in the body, and toggleFollowMoney is defined
//     inside a real script block that parses.
//   · The admin tools FAIL CLOSED. Anonymous and signed-in-non-admin get no
//     admin markup in the document at all — not hidden, absent — and the gate
//     removes it again when an admin signs out. The tools are gated, not gone.
//   · Home carries ONE compact H.R.1 card, outside #pdx-door-work, with 2–4
//     issue chips the measure actually maps to, one control to the bill's own
//     address, no percentage, no party and no second catalog.
//   · #hr1-showcase is still the deep read, still opened by the Door 1 chip.
//
//   node scripts/test-home-hygiene.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe whose target was renamed away is stale, not passing.
const must = (c, m) => { if (c) return; console.error(`✗ home hygiene: STALE HARNESS — ${m}`); process.exit(2); };

const INDEX = R("index.html");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing in the body is source text");
// ═════════════════════════════════════════════════════════════════════════════
// THE SCAN IS A TOKENIZER, NOT A REGEX, and it has to be: `<script` appears
// inside JS strings all over this document, and inside the HTML comment that
// explains this very repair, so counting tags or matching pairs with a regular
// expression reports nonsense. This walks the document the way the parser does —
// whichever of `<!--`, `<script` or `<style` comes first wins, and inside a
// script or style element EVERYTHING up to the matching close tag is that
// element's text, not markup.
const visibleText = (() => {
  let p = 0, out = [];
  for (;;) {
    const c = INDEX.indexOf("<!--", p);
    const s = INDEX.indexOf("<script", p);
    const y = INDEX.indexOf("<style", p);
    const next = [c, s, y].filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (next === undefined) { out.push(INDEX.slice(p)); break; }
    out.push(INDEX.slice(p, next));
    if (next === c) {
      const e = INDEX.indexOf("-->", next);
      p = e < 0 ? INDEX.length : e + 3;
    } else {
      const tag = next === s ? "</script>" : "</style>";
      const e = INDEX.indexOf(tag, next);
      p = e < 0 ? INDEX.length : e + tag.length;
    }
  }
  // Strip the remaining markup tags; what is left is what a reader can see.
  return out.join("\n").replace(/<[^>]*>/g, " ");
})();

ok(!visibleText.includes("toggleFollowMoney"),
  "the string toggleFollowMoney is visible as body text — the Follow the Money block lost its opening <script> tag again");
const SOURCE_TELLS = [
  [/window\.[A-Za-z_$][\w$]*\s*=/, "a window.* assignment"],
  [/function\s*\([^)]*\)\s*\{/, "a function literal"],
  [/=>\s*\{/, "an arrow function"],
  [/\}\s*\)\s*;/, "an IIFE tail"],
  [/document\.getElementById\(/, "a getElementById call"],
];
for (const [re, what] of SOURCE_TELLS) {
  const m = visibleText.match(re);
  ok(!m, `index.html paints ${what} as visible body text — ${JSON.stringify(String(m && m[0]).slice(0, 60))}`);
}

// The repair was to restore the tag, not to delete the function: profiles-full.js
// still calls it by name from the profile modal's money button.
has(R("profiles-full.js"), "toggleFollowMoney(",
  "profiles-full.js no longer calls toggleFollowMoney — if the caller is gone the function should be too, and this pin is what says so");
{
  const at = INDEX.indexOf("window.toggleFollowMoney = function");
  must(at > 0, "index.html no longer defines window.toggleFollowMoney");
  const open = INDEX.lastIndexOf("<script>", at);
  const close = INDEX.indexOf("</script>", at);
  must(open > 0 && close > at, "the toggleFollowMoney block has no surrounding script tags at all");
  // Nothing may stand between the opening tag and the definition except
  // whitespace and comments: that gap is exactly where the deleted IIFE used to
  // be, and a second orphaned half would land here.
  const body = INDEX.slice(open + "<script>".length, close);
  ok(body.trim().startsWith("window.toggleFollowMoney = function"),
    "the restored block does not open on the definition — something else is sharing this block again");
  let parsed = true;
  try { new vm.Script(body, { filename: "index.html#toggleFollowMoney" }); }
  catch (e) { parsed = false; failures.push(`the restored toggleFollowMoney block does not parse — ${e.message}`); }
  if (parsed) passed++;
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the admin tools fail closed for everyone who is not the admin");
// ═════════════════════════════════════════════════════════════════════════════
const TPL_OPEN = '<template id="pdx-admin-tools">';
{
  const tplOpen = INDEX.indexOf(TPL_OPEN);
  must(tplOpen > 0, "index.html no longer wraps the admin tools in <template id=\"pdx-admin-tools\">");
  const tplClose = INDEX.indexOf("</template>", tplOpen);
  must(tplClose > tplOpen, "the admin template is never closed");
  for (const id of ["database-expansion", "politician-manager"]) {
    const at = INDEX.indexOf(`<section id="${id}"`);
    must(at > 0, `<section id="${id}"> was renamed — this suite no longer knows what it is guarding`);
    ok(at > tplOpen && at < tplClose,
      `#${id} is NOT inside <template id="pdx-admin-tools"> — it is in the document for every anonymous visitor`);
    // Second lock: the parser's own inline style, on the copy that gets cloned.
    const tag = INDEX.slice(at, INDEX.indexOf(">", at));
    ok(/style="[^"]*display:\s*none/.test(tag), `#${id} lost its inline display:none — the second of three locks`);
  }
  // Third lock, and the one that holds at first paint: a POSITIVE rule in <head>,
  // so the absence of the class hides rather than the presence of one revealing.
  const headEnd = INDEX.indexOf("</head>");
  const cssAt = INDEX.indexOf('<style id="pdx-admin-gate-css">');
  must(cssAt > 0, "the head CSS lock (#pdx-admin-gate-css) is gone");
  ok(cssAt < headEnd, "the admin CSS lock is not in <head> — a rule that arrives after first paint is a flash of curator chrome");
  const css = INDEX.slice(cssAt, INDEX.indexOf("</style>", cssAt));
  for (const sel of ["html:not(.pdx-admin) #database-expansion",
                     "html:not(.pdx-admin) #politician-manager",
                     "html:not(.pdx-admin) [data-admin-only]"]) {
    has(css, sel, "the CSS lock does not cover it");
  }
  has(css, "!important", "the CSS lock does not outrank an inline style, so clearing one reveals the tools");
  // The tools are GATED, NOT DELETED — the brief's own line.
  for (const marker of ["AI-Assisted Database Expansion", "Bulk Import", "id=\"politician-manager\""]) {
    has(INDEX, marker, "the admin tool itself was deleted rather than gated");
  }
}

// THE GATE, RUN. Static shape is not the assertion that matters here; what
// matters is what the gate DOES for four states in the order a real session
// produces them: first paint with no user, an anonymous session, a signed-in
// non-admin, the admin, and then the admin signing out again.
{
  const at = INDEX.indexOf("var ADMIN_EMAILS");
  must(at > 0, "index.html no longer declares ADMIN_EMAILS — the gate moved or was renamed");
  const open = INDEX.lastIndexOf("<script>", at);
  const code = INDEX.slice(open + "<script>".length, INDEX.indexOf("</script>", at));

  const run = () => {
    const state = { mounted: 0, unmounted: [], cls: new Set(), injected: [], sections: {}, links: [{ style: {} }, { style: {} }] };
    const mkSection = (id) => ({
      id, style: { display: "none" },
      parentNode: { removeChild(el) { state.unmounted.push(el.id); delete state.sections[el.id]; } },
    });
    const tpl = {
      id: "pdx-admin-tools",
      content: { cloneNode: () => ({ nodeType: 11 }) },
      parentNode: {
        insertBefore() {
          state.mounted++;
          for (const id of ["database-expansion", "politician-manager"]) state.sections[id] = mkSection(id);
        },
      },
    };
    const document = {
      readyState: "complete",
      documentElement: { classList: { add: (c) => state.cls.add(c), remove: (c) => state.cls.delete(c), contains: (c) => state.cls.has(c) } },
      head: { appendChild(el) { state.injected.push(el.src); if (el.onload) el.onload(); } },
      body: { appendChild() {} },
      getElementById: (id) => (id === "pdx-admin-tools" ? tpl : state.sections[id] || null),
      querySelectorAll: (s) => (s === "[data-admin-only]" ? state.links : []),
      createElement: () => ({}),
      addEventListener() {}, removeEventListener() {},
    };
    const auth = { currentUser: null, onAuthStateChanged(cb) { state.fire = cb; } };
    const sandbox = { window: {}, document, auth, console: { warn() {}, log() {}, error() {} }, setTimeout, clearTimeout };
    sandbox.window.document = document;
    new vm.Script(code, { filename: "index.html#admin-gate" }).runInNewContext(sandbox);
    must(typeof state.fire === "function", "the gate never registered an auth listener, so this simulation proves nothing");
    return state;
  };

  const s = run();
  // First paint, no user at all.
  ok(s.mounted === 0, "first paint with no user MOUNTED the admin tools");
  ok(!s.cls.has("pdx-admin"), "first paint with no user put .pdx-admin on <html>");
  ok(s.injected.length === 0, "first paint with no user fetched the 451 KB admin pair");
  ok(s.links.every((l) => l.style.display === "none"), "the admin nav links are visible with no user signed in");

  // An anonymous session, then a signed-in non-admin. Neither is the admin.
  for (const [user, who] of [[{ isAnonymous: true, email: null }, "an anonymous session"],
                             [{ isAnonymous: false, email: "voter@example.com" }, "a signed-in non-admin"],
                             [{ isAnonymous: false, email: "CDELUXXE@GMAIL.COM.evil.test" }, "a lookalike address"]]) {
    s.fire(user);
    ok(s.mounted === 0, `${who} mounted the admin tools`);
    ok(!s.cls.has("pdx-admin"), `${who} got .pdx-admin on <html>`);
    ok(s.injected.length === 0, `${who} fetched the admin modules`);
    ok(s.sections["database-expansion"] === undefined,
      `${who} can reach #database-expansion with getElementById — the markup is in the document`);
  }

  // The admin, in both letter cases Firebase can hand back.
  for (const email of ["Cdeluxxe@gmail.com", "cdeluxxe@gmail.com"]) {
    const a = run();
    a.fire({ isAnonymous: false, email });
    ok(a.mounted === 1, `the admin (${email}) did not get the tools mounted exactly once (got ${a.mounted})`);
    ok(a.cls.has("pdx-admin"), `the admin (${email}) did not get .pdx-admin on <html>`);
    ok(a.links.every((l) => l.style.display === ""), `the admin (${email}) still has the admin nav links hidden`);
    ok(a.sections["database-expansion"] && a.sections["database-expansion"].style.display === "",
      `the admin (${email}) got the section mounted but still display:none`);
    ok(a.injected.join(",") === "/admin-politician-manager.js,/expansion-controller.js",
      `the admin (${email}) did not fetch both modules in order — got ${JSON.stringify(a.injected)}`);
    // Signing out must take the markup back out of the document.
    a.fire(null);
    ok(!a.cls.has("pdx-admin"), "signing out left .pdx-admin on <html>");
    ok(a.unmounted.sort().join(",") === "database-expansion,politician-manager",
      `signing out left admin markup standing — removed ${JSON.stringify(a.unmounted)}`);
    ok(a.sections["politician-manager"] === undefined,
      "signing out left #politician-manager reachable by getElementById");
    // And a second admin sign-in remounts rather than leaving a blank hole.
    a.fire({ isAnonymous: false, email });
    ok(a.mounted === 2, "a second admin sign-in did not remount the tools");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one compact H.R.1 card on Home, and the showcase still behind Door 1");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cardAt = INDEX.indexOf('<section id="pdx-hr1-card"');
  must(cardAt > 0, "the H.R.1 card (#pdx-hr1-card) is not on index.html");
  const cardEnd = INDEX.indexOf("</section>", INDEX.indexOf('<div class="phc-wrap">', cardAt));
  const card = INDEX.slice(cardAt, cardEnd);
  const doorAt = INDEX.indexOf('id="pdx-door-work"');
  const showcaseAt = INDEX.indexOf('<section id="hr1-showcase"');
  must(doorAt > 0 && showcaseAt > 0, "#pdx-door-work or #hr1-showcase was renamed");

  ok(cardEnd < doorAt, "the H.R.1 card is inside (or below) #pdx-door-work — it has to be readable without opening a door");
  ok(INDEX.indexOf('<section id="pdx-hr1-card"', cardAt + 1) < 0, "there are two H.R.1 cards on Home");
  ok(!/display:\s*none/.test(card) && !/\bhidden\b/.test(card.slice(0, card.indexOf(">"))),
    "the card ships hidden, which is the defect it was written to fix");

  // ONE CONTROL, AND IT IS THE BILL'S OWN ADDRESS.
  const anchors = card.match(/<a\b/g) || [];
  ok(anchors.length === 1, `the card has ${anchors.length} controls — the brief is one`);
  ok(/href="\/b\/119\/H\.R\.(%20|\s)1"/.test(card), "the control does not point at /b/119/H.R. 1, the bill's own shareable address");
  has(card, "PDXBillDetail", "the control does not hand off to the in-page bill panel when it is already loaded");
  ok(!/href="\/library/.test(card), "the card links into /library — Home is not getting a second catalog this pass");

  // 2–4 CHIPS, AND EVERY KEY IS ONE THE MEASURE ACTUALLY MAPS TO.
  const keys = [...card.matchAll(/data-issue="([a-z_]+)"/g)].map((m) => m[1]);
  ok(keys.length >= 2 && keys.length <= 4, `the card shows ${keys.length} issue chips — the brief is 2 to 4`);
  const HR1 = R("hr1-showcase.js");
  const omnibus = HR1.slice(HR1.indexOf("var OMNIBUS"), HR1.indexOf("var TIMELINE"));
  must(omnibus.length > 500, "hr1-showcase.js no longer declares OMNIBUS — the chip keys cannot be checked against the measure");
  const mapped = new Set();
  for (const m of omnibus.matchAll(/keys:\s*\[([^\]]*)\]/g)) {
    for (const k of m[1].matchAll(/'([a-z_]+)'/g)) mapped.add(k[1]);
  }
  must(mapped.size >= 5, `OMNIBUS parsed to ${mapped.size} keys, which is too few to be the real table`);
  for (const k of keys) {
    ok(mapped.has(k), `the chip "${k}" is not an issue H.R.1 maps to in hr1-showcase.js — Home would be teaching something the measure does not do`);
  }
  ok(new Set(keys).size === keys.length, "the card repeats an issue chip");

  // WHAT THE CARD MAY NOT SAY. No score, no party, no verdict.
  const text = card.replace(/<style>[\s\S]*?<\/style>/g, " ").replace(/<[^>]*>/g, " ");
  ok(!text.includes("%"), "the card prints a percentage — no figure here carries a depth marker or a denominator");
  for (const word of ["Republican", "Democrat", "GOP", "party", "R-", "D-"]) {
    ok(!text.includes(word), `the card says ${JSON.stringify(word)} — the chips name issues, not sides`);
  }
  for (const word of ["Direction Match", "kept", "broken", "score"]) {
    ok(!text.includes(word), `the card says ${JSON.stringify(word)} — a verdict belongs beside the member whose promise it was`);
  }
  // THE ONE SENTENCE IS THE CIVICS, and it does not claim a law is not a law.
  const lede = (card.match(/class="phc-lede"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "";
  ok(/not law by itself/.test(lede), "the card no longer teaches that a House-passed package is not law by itself");
  ok(/Senate/.test(lede) && /sign/.test(lede), "the sentence names the House but not what else it takes to become law");
  has(HR1, "Signed into law", "hr1-showcase.js no longer records the signature this sentence is careful about");

  // THE SHOWCASE IS STILL THE DEEP READ, AND THE CHIP STILL OPENS IT.
  has(INDEX, 'href="#hr1-showcase" class="pulse-chip"', "the Door 1 pulse chip for the showcase is gone");
  has(INDEX, "window.pdxOpenSurface = function", "index.html no longer publishes pdxOpenSurface, the one way in for an in-page jump");
  // The work-layer seam, taken from its own landmark: `window.pdxDoor` also
  // appears in five button onclicks ABOVE this block, so the slice has to start
  // at WORK_IDS and end at the close of the script that declares it.
  const seamAt = INDEX.indexOf("var WORK_IDS");
  must(seamAt > 0, "the Door 1 work-layer roster (WORK_IDS) was renamed");
  const door = INDEX.slice(seamAt, INDEX.indexOf("</script>", seamAt));
  has(door, "'hr1-showcase'", "hr1-showcase left the Door 1 work-layer roster");
  ok(/'hr1-showcase':\s*function\s*\(\)\s*\{[^}]*PDXHR1[^}]*mount/.test(door),
    "opening the showcase no longer paints it — the chip would open an empty layer, which is the bug the brief calls out");
  has(door, "openWork('hr1-showcase')", "pdxDoor no longer routes the bill lane to the showcase");
  has(R("door1-workspace.js"), "id: 'hr1-showcase'", "the workspace chip roster lost the showcase");
  // …and the showcase was NOT duplicated onto Home or folded into /library.
  // Counted with comments stripped: the note above hr1-showcase.js's include
  // quotes the tag it renders into, and a quotation is not a second room.
  const MARKUP = INDEX.replace(/<!--[\s\S]*?-->/g, "");
  ok((MARKUP.match(/<section id="hr1-showcase"/g) || []).length === 1,
    "there is more than one #hr1-showcase section on index.html — the showcase was duplicated rather than summarized");
  // /library may POINT at the showcase (its LANE table forwards the old hash
  // home), but it may not host it: folding the showcase into the archive is a
  // different decision, and not this pass's.
  const LIB = R("library.html");
  ok(!/<section id="hr1-showcase"/.test(LIB) && !LIB.includes("PDXHR1"),
    "the showcase was folded into /library — not this pass");
}

console.log("");
if (failures.length) {
  console.error(`✗ home hygiene: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ home hygiene: no source text in the body, the curator tools fail closed, one H.R.1 card in the open — ${passed} assertions passed\n`);
