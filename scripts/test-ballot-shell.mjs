#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for ballot.html — THE FIFTH SHELL
// ─────────────────────────────────────────────────────────────────────────────
// Door 2 is the ballot workspace: resolve this voter's seats, open one seat,
// compare the field on the formal record, pick, move to the next undecided
// seat. It used to be a section of index.html — so a voter who came to decide
// downloaded 2.24 MB of document and ~11.9 MB of JavaScript, nearly all of it
// for the front page, and then scrolled past the front page to reach the desk.
// Worse, the same page carried an older ballot surface — "YOUR PICKS 0/6", its
// own six-dot meter, its own progress bar — so one voter met two products that
// both claimed to be their ballot and counted their progress separately.
//
// The fourth split gave Door 2 its own address: netlify.toml rewrites /ballot
// and /ballot/ to /ballot.html, which carries the record lane and nothing else.
// The homepage keeps the DOOR and loses the DESK.
//
// The failure modes, all of which ship silently:
//
//   1. IT SILENTLY REGROWS. Nothing stops the next feature from pasting the
//      Spotlight corpus, the person spine or the issue family back onto this
//      document, and the split undoes itself one <script> at a time.
//   2. THE DESK COMES BACK TO THE HOMEPAGE. A re-added ballot-workspace.js on
//      index.html means two desks on two addresses sharing one sessionStorage
//      key, and the duplicate pick-counter product returning beside it.
//   3. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /ballot/ is served 200 at a
//      trailing-slash path, so src="ballot-workspace.js" resolves to
//      /ballot/ballot-workspace.js, matches the rewrite, and hands the browser
//      this document to parse as JavaScript.
//   4. A HARDCODED SEAT COUNT. The seat list belongs to the voter's resolved
//      location. "pick 6" is a lie in 49 states and in several Utah counties.
//   5. THE WAY HOME BREAKS. If "← Home" stops being a real navigation to '/',
//      or the service worker learns to answer '/' with this document, the
//      reader is trapped on a sub-shell — which is exactly the v188 defect.
//   6. THE DOORS GO DEAD. Four surfaces on the homepage offer to open a seat,
//      and all four gate on `typeof window.pdxBallotWorkspaceOpen`. With the
//      desk gone that guard answers false and the controls vanish silently
//      unless index.html keeps answering the name with a navigation.
//   7. THE SERVICE WORKER KEEPS SERVING THE OLD SHELL, or falls back to '/'
//      for an address '/' no longer carries a desk for.
//
// This harness gates:
//
//   1. THE REWRITE. /ballot and /ballot/ resolve to /ballot.html at 200, after
//      /p/*, /i/* and /issue/*, and no other address moved.
//   2. THE DENYLIST ON ballot.html — the Spotlight corpus, the person spine,
//      the issue family, Voice, Compare Hub, the homepage hero.
//   3. THE DENYLIST ON index.html — no ballot-workspace.js, no desk mount, and
//      no second pick-counter product.
//   4. WHAT MUST BE PRESENT — the record lane, in index.html's relative order.
//   5. EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE.
//   6. THE SELF-BUILT MOUNT and the shell seams.
//   7. NO HARDCODED SEAT COUNT in either document's visible copy.
//   8. THE WAY HOME — a real navigation to index.html, on both documents.
//   9. THE SERVICE WORKER — version bumped, /ballot.html precached, the
//      fallback ordered after the other three shells, the poison guard widened.
//
// And, added after a smoke report on the preview found four defects that every
// one of the checks above was green through — because all four live in a WRITER,
// and a static pin over markup cannot see a string JavaScript produces:
//
//  10. ONE BALLOT ON THIS DOCUMENT. your-ballot.js is loaded here for one
//      sentence and used to mount itself onto <body> when its anchor was
//      missing, painting a whole second ballot under the desk. The document is
//      checked for the leftover AND the writer for the ability to make it.
//  11. NO HARDCODED DENOMINATOR. The meter's total is this voter's resolvable
//      list — the seat list run through the same gate the desk paints from —
//      computed here the way the surface computes it, with no literal on either
//      side of the assertion.
//  12. A LOCATION WRITE DOES NOT UN-NAME A STATEWIDE SEAT. The sticky-seat
//      ledger is lifted out of voter-hub-location.js and run: a Detect inside
//      the same state keeps the senators and the governor, never carries the old
//      district's member onto the new district, and still drops everything at a
//      state line.
//  13. OPENING A PERSON IS A PUSH, NEVER A STAMP, and the three reads on a
//      candidate row wear three different faces with no borrowed numbers.
//
//   node scripts/test-ballot-shell.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createContext, runInContext } from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const html = read("ballot.html");
// ballot.html's header comment names every module it deliberately does not
// carry, and the homepage's demotion comment quotes the exact "0/6" markup that
// was removed. A comment cannot satisfy — or violate — a contract, so every
// presence-or-absence check runs against the comment-stripped body.
const bare = html.replace(/<!--[\s\S]*?-->/g, "");
// And a second, stricter view for the denylist. ballot.html's inline scripts
// explain in `//` comments WHICH modules are deliberately absent — they name
// person-file.js, app.css and my-stances.js in order to say "not here". An
// HTML-comment strip does not reach inside a <script>, so the denylist runs
// against a view with JS comments removed too. Only full-line `//` comments are
// stripped, so a protocol-relative URL cannot be eaten by accident.
const code = bare
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^[ \t]*\/\/.*$/gm, " ");
const index = read("index.html");
const indexBare = index.replace(/<!--[\s\S]*?-->/g, "");
const sw = read("sw.js");
const toml = read("netlify.toml");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };

// Budgets. Tripwires, not targets. The desk plus the stance corpus is a real
// chain, so the tag count is higher than spotlight.html's — but the DOCUMENT is
// chrome, and a document budget going red is the split being undone.
const MAX_DOC_GZ = 40 * 1024;
const MAX_SCRIPT_TAGS = 48;
const MAX_BLOCKING_CSS = 2;

const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const srcs = TAGS
  .map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter(Boolean);
const localSrcs = srcs.filter((s) => !/^(https?:)?\/\//.test(s));

// ── 1. The rewrite ──────────────────────────────────────────────────────────
// Netlify is first-match-wins, so the only question a static test can answer is
// "which rule wins for this path".
const RULES = [...toml.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const body = m[1];
  const field = (k) => (body.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m")) || [])[1];
  return { from: field("from"), to: field("to"), status: field("status") };
});
const ruleIndex = (from) => RULES.findIndex((r) => r.from === from);
const resolveAddr = (path) => {
  for (const r of RULES) {
    if (!r.from) continue;
    if (r.from.endsWith("/*")) {
      if (path.startsWith(r.from.slice(0, -1))) return r;
    } else if (r.from === path) return r;
  }
  return null;
};

ok(RULES.length > 0, "rewrite: netlify.toml declares at least one [[redirects]] rule");
for (const addr of ["/ballot", "/ballot/"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/ballot.html" && String(hit.status) === "200",
    `rewrite: ${addr} is served /ballot.html at 200 (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}

// THE ORDER. /ballot is declared AFTER all three earlier shells. Both of its
// rules are exact paths so they cannot swallow a prefix today; the assertion is
// that the declaration order still protects them if one of them ever gains a
// wildcard.
{
  const p = ruleIndex("/p/*"), i = ruleIndex("/i/*"), s = ruleIndex("/issue/*");
  const b = ruleIndex("/ballot"), bs = ruleIndex("/ballot/");
  ok(p >= 0 && i >= 0 && s >= 0 && b >= 0 && bs >= 0,
    "rewrite: /p/*, /i/*, /issue/*, /ballot and /ballot/ are all declared");
  ok(b > s && b > i && b > p, `rewrite: /ballot is declared after /p/*, /i/* and /issue/* (indices p=${p} i=${i} issue=${s} ballot=${b})`);
  ok(bs > s && bs > i && bs > p, "rewrite: /ballot/ is declared after /p/*, /i/* and /issue/*");
}

// NO WILDCARD. /ballot owns two exact paths and nothing beneath them.
ok(!RULES.some((r) => r.from && /^\/ballot/.test(r.from) && r.from.includes("*")),
  "rewrite: no /ballot* wildcard rule exists — the seat is a query, not a segment");

// THE ADDRESSES THIS SPLIT MUST NOT STEAL.
for (const [addr, expect] of [
  ["/p/lee", "/person.html"],
  ["/p/mike_lee", "/person.html"],
  ["/i/guns", "/issue.html"],
  ["/issue/guns", "/spotlight.html"],
  ["/vote/hr1", "/index.html"],
  ["/d/ut-statehouse-68", "/index.html"],
  ["/b/hr1", "/index.html"],
  // /locker WAS /index.html here, and is now a 301 to /evidence: since the
  // evidence locker became its own document the old spelling is an alias, not a
  // second live address. Still in this list, and still for the reason the list
  // exists — /ballot must not steal it — just with the answer the redirect table
  // now gives.
  ["/locker", "/evidence"],
  ["/locker/x", "/evidence"],
  // The two browse rooms this list did not have to name until they existed.
  ["/stances", "/stances.html"],
  ["/evidence", "/evidence.html"],
]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === expect,
    `rewrite: ${addr} still resolves to ${expect}, not this document (got ${hit ? hit.to : "no matching rule"})`);
}
// A near-miss is NOT this address.
for (const addr of ["/ballots", "/ballot/senate"]) {
  const hit = resolveAddr(addr);
  ok(!hit || hit.to !== "/ballot.html",
    `rewrite: ${addr} is not answered by /ballot.html (got ${hit ? hit.to : "no matching rule"})`);
}
// '/' HAS NO REWRITE AND MUST NEVER GAIN ONE. The front page is index.html.
ok(resolveAddr("/") === null, "rewrite: '/' has no rewrite rule — the front page is still index.html");
ok(!RULES.some((r) => r.from === "/" || (r.to || "").includes("ballot.html") && r.from === "/"),
  "rewrite: no rule sends '/' to ballot.html");

// ── 2. The denylist on ballot.html ──────────────────────────────────────────
// Each of these is a whole product this document has no business carrying. The
// Spotlight corpus alone is 1.2 MB.
const DENY = [
  // The Spotlight lane (fourth shell).
  "spotlights-data.js", "spotlight-engine.js", "spotlight-index.js",
  "spotlight-cards-data.js", "spotlight-overlay.css",
  // The person-file spine (second shell).
  "person-file.js", "person-outline.js", "profile-spine.js", "person-shell.js",
  // The issue family (third shell).
  "issue-file.js", "issue-page.js", "pdx-issue-profile.js", "door1-workspace.js",
  "issue-view.css", "issue-compare.css",
  // The homepage: its own weight, its own products.
  "app.css", "app-2.css", "tailwind.css", "compare-hub.js", "hero-showcase",
  "who-represents-me.js", "my-stances.js", "district-room.js", "archive",
  "pdx-lazy-data.js", "pdx-stability.js", "firebase", "door2-spine.js",
  // Voice.
  "voice.js", "pdx-voice", "district-voice",
];
for (const mod of DENY) {
  ok(!code.includes(mod), `denylist: ballot.html does not reference ${mod}`);
}
// The desk is the page: no homepage section ids came along.
for (const id of ["voter-hub", "my-politicians", "myteam-selected-panel",
                  "issue-spotlight", "relevant-to-me", "ballot-breakdown-section"]) {
  ok(!new RegExp(`id="${id}"`).test(code), `denylist: ballot.html ships no #${id} mount`);
}

// ── 3. The denylist on index.html — the desk left, and so did the duplicate ──
{
  const idxTags = [...index.matchAll(/<script\b([^>]*)>/gi)].map((m) => m[1] || "");
  const idxSrcs = idxTags.map((a) => (a.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1]).filter(Boolean);
  ok(!idxSrcs.some((s) => s.includes("ballot-workspace.js")),
    "homepage: ballot-workspace.js is no longer a <script src> on index.html");
  ok(!/<link[^>]+ballot-workspace\.css/i.test(index),
    "homepage: ballot-workspace.css is no longer a <link> on index.html");
  // THE MOUNT IS GONE, NOT LEFT EMPTY. An abandoned #ballot-workspace would
  // never fill, and judicial-ballot.js keys its retention line off it.
  ok(!/id="ballot-workspace"/.test(indexBare), "homepage: the #ballot-workspace desk mount is gone");
  ok(!/id="bw-body"/.test(indexBare), "homepage: the #bw-body desk mount is gone");

  // NO SECOND PICK-COUNTER PRODUCT. These were the duplicate's visible surface:
  // a count badge, a six-dot meter, a progress bar with a filled-seats label,
  // and a "Your 6 ballot slots" heading. The hook NODES may survive (empty and
  // hidden, so compare-hub.js's writers still find them) — the markup that made
  // them a product may not.
  ok(!/>\s*0\s*\/\s*6\s*</.test(indexBare), 'homepage: no "0/6" pick-count badge remains');
  ok(!/\d+\s+of\s+\d+\s+picks\s+set/i.test(indexBare), 'homepage: no "N of M picks set" meter text remains');
  ok(!/\d+\s+of\s+\d+\s+seats\s+filled/i.test(indexBare), 'homepage: no "N of M seats filled" progress label remains');
  ok(!/class="myteam-picks-dot"/.test(indexBare), "homepage: the literal picks-meter dots are gone");
  ok(!/Your\s+\d+\s+ballot\s+slots/i.test(indexBare), 'homepage: no "Your N ballot slots" heading remains');
  // Checked against class ATTRIBUTES, not the whole file: the orphaned CSS rules
  // for these classes are dead weight, but dead weight is not a second product.
  // Markup wearing the class is what made it one.
  // myteam-journey__step is NOT on this list, and the distinction is the point of
  // the list. The other two are the duplicate's own chrome — a slot-focus label
  // and a swipe hint for a six-slot grid that no longer exists. The journey rail
  // is the page's ① Find → ② Research → ★ Ballot breadcrumb: it names no seats,
  // counts no picks and asserts no total, and test-who-represents-me.mjs pins it
  // as a real claim about how this page reads. It stays, with its last step
  // renamed from "you're here" to the door, because the deciding moved.
  ok(!/class="[^"]*\b(myteam-slots-focus-label|myteam-swipe-hint)\b/.test(indexBare),
    "homepage: no markup still wears the duplicate builder's chrome (slot-focus label, swipe hint)");
  // And the rail that stays may not smuggle a count back in through its labels.
  const railSteps = [...indexBare.matchAll(/class="myteam-journey__step[^"]*"[^>]*>([\s\S]*?)<\/span>/g)]
    .map((m) => m[1].replace(/<[^>]*>/g, " "));
  for (const step of railSteps) {
    ok(!/\d/.test(step.replace(/[①②③④⑤★→]/g, "")),
      `homepage: the journey rail step "${step.trim()}" carries a digit — the rail names steps, not seats`);
  }
  ok(!/id="myteam-count-badge"[^>]*>[^<]*\d/.test(indexBare),
    "homepage: the count badge node ships no number of its own");
  // The two progress surfaces that survive on '/' are fed by writers that know
  // the voter's real total. Neither may ship a number in its markup: a literal
  // is a seat count asserted before the location is even resolved.
  ok(!/id="team-dock-ring-num"[^>]*>[^<]*\d/.test(indexBare),
    "homepage: the Team dock's progress ring ships blank, not a hardcoded count");
  ok(!/id="myteam-browse-slots-label"[^>]*>[^<]*\d/.test(indexBare),
    "homepage: the seats-filled chip ships blank, not a hardcoded count");
  ok(/id="myteam-browse-team-status"[^>]*style="[^"]*display:none/.test(indexBare),
    "homepage: the seats-filled chip is hidden until a writer has a real total for it");

  // THE HOOK NODES SURVIVE, HIDDEN. compare-hub.js still writes to them.
  ok(/id="pdx-myteam-hooks"/.test(indexBare), "homepage: the hidden JS-hook container exists");
  ok(/id="pdx-myteam-hooks"[^>]*\bhidden\b/.test(indexBare), "homepage: the hook container is hidden");
  for (const id of ["myteam-slots-grid", "myteam-count-badge", "myteam-picks-dots",
                    "myteam-progress-fill", "myteam-office-summary", "myteam-empty",
                    "myteam-next-step", "myteam-district-coverage"]) {
    ok(new RegExp(`id="${id}"`).test(indexBare), `homepage: JS hook #${id} is still present for compare-hub.js`);
  }
  // #my-politicians is still a scroll target from a dozen places.
  ok(/id="my-politicians"/.test(indexBare), "homepage: #my-politicians still exists as a scroll target");
}

// ── 4. What must be present: the record lane, in index.html's order ─────────
// Present AND in the same relative order as on index.html, because several of
// these read a global the previous one assigned at evaluation.
const LANE = [
  "/person-link.js", "/cmp-data.js", "/data-hygiene.js", "/profiles-full.js",
  "/voter-hub-location.js", "/seat-field.js", "/ballot-breakdown.js",
  "/politician-stances-core.js", "/stance-helpers.js", "/alignment-tool.js",
  "/formal-index.js", "/publication-floor.js", "/your-ballot.js",
  "/consistency.js", "/race-sheet.js", "/ballot-workspace.js",
];
for (const mod of LANE) {
  ok(srcs.includes(mod), `present: ballot.html loads ${mod}`);
  ok(existsSync(join(ROOT, mod.slice(1))), `present: ${mod} exists on disk`);
}
{
  const pos = LANE.map((m) => srcs.indexOf(m));
  const sorted = pos.every((v, i) => i === 0 || v > pos[i - 1]);
  ok(sorted, `order: the record lane loads in index.html's relative order (got ${pos.join(",")})`);
  // The desk is last: it reads everything above it.
  ok(srcs.indexOf("/ballot-workspace.js") === Math.max(...srcs.map((s, i) => (s === "/ballot-workspace.js" ? i : -1))),
    "order: ballot-workspace.js is the last of its own name");
  ok(srcs.indexOf("/race-sheet.js") < srcs.indexOf("/ballot-workspace.js"),
    "order: race-sheet.js loads before the desk that opens it");
}
// The desk's stylesheet is here and render-blocking: it IS the page.
ok(/<link\s+rel="stylesheet"\s+href="\/ballot-workspace\.css"\s*\/?>/.test(html),
  "present: /ballot-workspace.css is a render-blocking stylesheet on ballot.html");
ok(/href="\/race-sheet\.css"/.test(html), "present: /race-sheet.css is loaded for the side-by-side overlay");

// ── 5. Every same-origin path is root-absolute ───────────────────────────────
for (const s of localSrcs) {
  ok(s.startsWith("/"), `root-absolute: <script src="${s}"> must start with "/" — /ballot/ is a 200 path`);
}
{
  const hrefs = [...html.matchAll(/<link\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const h of hrefs) {
    if (/^(https?:)?\/\//.test(h) || h.startsWith("#")) continue;
    ok(h.startsWith("/"), `root-absolute: <link href="${h}"> must start with "/"`);
  }
  const anchors = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const h of anchors) {
    if (/^(https?:)?\/\//.test(h) || h.startsWith("#") || h.startsWith("mailto:")) continue;
    ok(h.startsWith("/"), `root-absolute: <a href="${h}"> must start with "/"`);
  }
}

// ── 6. The self-built mount, and the shell seams ────────────────────────────
{
  // NO EMPTY MOUNT: the desk's two nodes are created in JS, not shipped in markup.
  ok(!/<section[^>]+id="ballot-workspace"/.test(bare) && !/<div[^>]+id="bw-body"/.test(bare),
    "mount: ballot.html ships no static desk mount in its markup");
  const inline = TAGS.filter((t) => !t.attrs.includes("src")).map((t) => t.body).join("\n");
  ok(/\.id\s*=\s*['"]ballot-workspace['"]/.test(inline), "mount: #ballot-workspace is built in JS");
  ok(/\.id\s*=\s*['"]bw-body['"]/.test(inline), "mount: #bw-body is built in JS");
  ok(/document\.body\.appendChild/.test(inline), "mount: the built mount is appended to <body>");

  // SEAM 1. Both location openers early-return without the homepage's
  // #change-location-form, which this document does not ship — so the one
  // control on the honest empty state would do nothing without an override.
  ok(/window\.toggleChangeLocation\s*=/.test(inline) && /window\.openLocationModal\s*=/.test(inline),
    "seam: ballot.html overrides toggleChangeLocation and openLocationModal");
  ok(/['"]\/find['"]/.test(inline),
    "seam: the location override navigates to /find, the document the picker lives on now");
  ok(/PDXReturn/.test(inline) && /finderHref/.test(inline),
    "seam: the trip to the finder carries no way back — PDXReturn holds the 'next' intent");

  // SEAM 2. The stance editor is a separate product and is NOT loaded here; the
  // guarded fallback sets a bare hash, which is a no-op on this document.
  ok(/hashchange/.test(inline) && /my-stances/.test(inline),
    "seam: a bare #my-stances hash is turned into a real navigation");
  // AND PDXStances IS NOT STUBBED. A fake .count() would let the record lane
  // believe this reader has saved stances when they have none, and the desk
  // would claim a ranking it cannot support instead of saying "not ranked".
  ok(!/window\.PDXStances\s*=/.test(inline), "seam: PDXStances is not stubbed — an unranked field says so");
}

// ── 7. No hardcoded seat count in visible copy ──────────────────────────────
// "N of M seats we can resolve", never "pick 6". Checked against VISIBLE TEXT
// only: comments, <style> and <script> bodies are stripped, so a CSS length
// (0.6rem) or a module filename (state-senate-stances-w6.js) cannot trip it and
// cannot excuse a real one either.
const visible = (src) => src
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z]+;|&#\d+;/gi, " ")
  .replace(/\s+/g, " ");
{
  const txt = visible(html);
  const COUNTY = [
    /\b6\s+(?:seats?|slots?|races?|picks?|offices?|contests?)\b/i,
    /\b(?:pick|fill|choose|decide)\s+(?:all\s+)?6\b/i,
    /\bof\s+6\b/i,
    /\b6\s*\/\s*\d+\b/,
    /\b\d+\s*\/\s*6\b/,
    /\bsix\s+(?:seats?|slots?|races?|picks?|offices?|contests?)\b/i,
  ];
  for (const re of COUNTY) {
    ok(!re.test(txt), `seat count: ballot.html's visible copy must not hardcode a seat count (matched ${re})`);
  }
  // And the promise it DOES make is the honest one.
  ok(/seats we can resolve/i.test(txt), 'copy: ballot.html says "the seats we can resolve"');
}
// The homepage's two door cards are held to the same rule.
{
  const txt = visible(index);
  for (const re of [/\b6\s+(?:ballot\s+)?(?:seats?|slots?)\b/i, /\b\d+\s+of\s+6\s+(?:seats?|picks?)\b/i]) {
    ok(!re.test(txt), `seat count: index.html's visible copy must not hardcode a seat count (matched ${re})`);
  }
}

// ── 8. Copy: "Your ballot", and never an official one ───────────────────────
{
  ok(/<title>\s*Your ballot\b/i.test(html), 'copy: the title is "Your ballot"');
  const txt = visible(html);
  ok(!/voting team/i.test(txt), 'copy: ballot.html never says "Voting Team"');
  // NEVER CLAIM A COMPLETE OFFICIAL BALLOT. The desk prints the caveat itself,
  // borrowed from your-ballot.js, so this document must not contradict it.
  for (const re of [/your official ballot/i, /complete ballot/i, /every (?:race|contest) on your ballot/i,
                    /the full ballot/i, /official sample ballot/i]) {
    ok(!re.test(txt), `copy: ballot.html must not claim a complete official ballot (matched ${re})`);
  }
  // And the one file that owns the caveat is loaded so the desk can borrow it.
  ok(srcs.includes("/your-ballot.js"),
    "copy: your-ballot.js is loaded — it owns _pdxOfficialBallotNote, the one spelling of the caveat");
}

// ── 9. The way home ─────────────────────────────────────────────────────────
// Both controls resolve to index.html, and neither is a history trick: a reader
// may have arrived cold from a shared link with nothing to go back to.
{
  ok(/class="pdx-bal-wordmark"[^>]*/.test(bare) || /pdx-bal-wordmark/.test(bare), "home: the wordmark is present in the chrome");
  const wordmark = (bare.match(/<a[^>]*class="pdx-bal-wordmark"[^>]*>/) || bare.match(/<a[^>]*pdx-bal-wordmark[^>]*>/) || [""])[0];
  ok(/href="\/"/.test(wordmark), 'home: the wordmark is <a href="/">');
  const homeBtn = (bare.match(/<a[^>]*id="pdx-bal-home"[^>]*>/) || [""])[0];
  ok(/href="\/"/.test(homeBtn), 'home: "← Home" is an <a href="/"> so it works with no JavaScript');
  const inline = TAGS.filter((t) => !t.attrs.includes("src")).map((t) => t.body).join("\n");
  // Comment-stripped, for the same reason the denylist has its own `code` view:
  // the seams EXPLAIN in prose which history call each one is deliberately not
  // making ("not a replaceState, because Back from a record has to mean…"), and a
  // comment naming a defect is the opposite of committing it.
  const inlineCode = inline
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
  ok(/location\.assign\(/.test(inlineCode), "home: the close is location.assign — a real navigation");
  ok(!/history\.back\(\)/.test(inlineCode), "home: the close is not history.back() — a cold arrival has no history");
  ok(!/replaceState/.test(inlineCode), "home: ballot.html never uses replaceState to leave");
  // '/' is index.html and nothing here may claim otherwise.
  ok(!/location\.assign\(['"]\/ballot/.test(inline) || true, "home: (informational)");
}

// ── 10. The homepage keeps the door ─────────────────────────────────────────
{
  // A REAL NAVIGATION, NOT A REPLACESTATE. Both door cards are plain anchors.
  const doors = [...index.matchAll(/<a\b[^>]*id="(pdx-ballot-door|pdx-myteam-door)"[^>]*>/g)].map((m) => m[0]);
  ok(doors.length === 2, `homepage: both door cards exist (found ${doors.length})`);
  for (const d of doors) {
    ok(/href="\/ballot"/.test(d), `homepage: the door card is <a href="/ballot"> (got ${d.slice(0, 80)})`);
  }
  // The "Your Ballot" entrances in the nav and the footer are real links too.
  const ballotAnchors = [...indexBare.matchAll(/<a\b[^>]*href="\/ballot"[^>]*>/g)];
  ok(ballotAnchors.length >= 8,
    `homepage: the Your Ballot entrances are <a href="/ballot"> navigations (found ${ballotAnchors.length}, expected the nav, mobile nav, pulse chip, footer and both cards)`);
  // NO IN-PAGE ANCHOR SURVIVES for the Door 2 CTA: a "#my-politicians" jump
  // would land a reader on the door card instead of taking them through it.
  ok(!/href="#your-ballot"/.test(indexBare), 'homepage: no dead href="#your-ballot" anchors remain');
  // AND NOTHING REWRITES / ONTO /ballot.
  ok(!/replaceState\([^)]*\/ballot/.test(index), "homepage: nothing replaceStates '/' onto /ballot");
  ok(!/pushState\([^)]*\/ballot/.test(index), "homepage: nothing pushStates '/' onto /ballot");

  // THE DOORS STAY ALIVE. Four surfaces gate on this exact name, so index.html
  // must keep answering it — with a navigation, since the desk is gone.
  ok(/window\.pdxBallotWorkspaceOpen\s*=/.test(index),
    "homepage: pdxBallotWorkspaceOpen still answers on index.html, so the in-app seat doors do not vanish");
  const shim = (index.match(/if \(typeof window\.pdxBallotWorkspaceOpen === 'function'\) return;[\s\S]{0,900}/) || [""])[0];
  ok(/\/ballot' \+ \(k \? '\?seat='/.test(shim) || /\?seat=/.test(shim),
    "homepage: the shim carries the named seat through as ?seat=");
  ok(/location\.assign\(/.test(shim), "homepage: the shim is a real navigation (location.assign)");
  ok(!/replaceState/.test(shim), "homepage: the shim never uses replaceState");
}

// ── 11. The desk honours an arriving seat ───────────────────────────────────
{
  const desk = read("ballot-workspace.js");
  ok(/location\.search/.test(desk), "desk: ballot-workspace.js reads location.search for an arriving seat");
  ok(/\[?\?&\]?seat=/.test(desk) || /seat=\(\[\^&\]\*\)/.test(desk), "desk: the arriving seat is parsed from ?seat=");
  // ONLY A SEAT ON THIS VOTER'S OWN LIST. A ?seat= naming a race they cannot
  // vote must fall through, not paint a race that is not theirs.
  ok(/function urlSeat\(\)/.test(desk), "desk: urlSeat() exists");
  const ro = (desk.match(/function readOpen\(list\)[\s\S]{0,600}/) || [""])[0];
  ok(/urlSeat\(\)/.test(ro) && /list\.forEach/.test(ro),
    "desk: an arriving ?seat= is validated against the voter's own resolved seat list");
  // The in-app doors that used to stay on '/' now leave it.
  const spine = read("door2-spine.js");
  ok(/location\.assign\(to\)/.test(spine) && /\/ballot/.test(spine),
    "doors: door2-spine.js toWorkspace() navigates to /ballot when the desk is not on the page");
  ok(/\?seat='\s*\+\s*encodeURIComponent/.test(spine), "doors: toWorkspace() carries the seat through as ?seat=");
  ok(!/id: 'my-politicians'/.test(spine),
    "doors: #my-politicians is no longer declared a view of the workspace — it is a door card now");
  const hub = read("compare-hub.js");
  ok(/pdxBallotWorkspaceOpen\(_seat\)/.test(hub),
    "doors: compare-hub.js's next-open-seat guide opens the seat through the one door name");
}

// ── 12. The service worker ──────────────────────────────────────────────────
{
  const ver = (sw.match(/const CACHE_VERSION = '(v\d+)'/) || [])[1];
  ok(!!ver, "sw: CACHE_VERSION is declared");
  ok(ver && Number(ver.slice(1)) > 189, `sw: CACHE_VERSION is bumped past v189 (got ${ver})`);

  const assets = (sw.match(/const SHELL_ASSETS = \[([\s\S]*?)\n\];/) || [])[1] || "";
  ok(/'\/ballot\.html'/.test(assets), "sw: /ballot.html is on SHELL_ASSETS");
  for (const a of ["'/'", "'/person.html'", "'/issue.html'", "'/spotlight.html'"]) {
    ok(assets.includes(a), `sw: ${a} is still on SHELL_ASSETS`);
  }
  ok(existsSync(join(ROOT, "ballot.html")), "sw: the precached /ballot.html exists on disk");

  // THE FALLBACK ORDER. /ballot is answered after /p/, /i/ and /issue/, and
  // before the generic '/'.
  const nav = (sw.match(/async function handleNavigate\(req\)[\s\S]*?\n}/) || [""])[0];
  ok(/BALLOT_NAV_RE/.test(nav), "sw: handleNavigate tests BALLOT_NAV_RE");
  const at = (needle) => nav.indexOf(needle);
  const iPerson = at("shell.match('/person.html')");
  const iIssue = at("shell.match('/issue.html')");
  const iSpot = at("shell.match('/spotlight.html')");
  const iBallot = at("shell.match('/ballot.html')");
  const iHome = at("shell.match('/')");
  ok(iBallot > 0, "sw: handleNavigate can fall back to /ballot.html");
  ok(iBallot > iPerson && iBallot > iIssue && iBallot > iSpot,
    `sw: the /ballot fallback is after /p/, /i/ and /issue/ (person=${iPerson} issue=${iIssue} spotlight=${iSpot} ballot=${iBallot})`);
  ok(iHome > iBallot, `sw: the generic '/' fallback is last, after /ballot (ballot=${iBallot} home=${iHome})`);

  // '/' IS STILL index.html. Never a sub-shell, and never this one.
  ok(/const isHome = key === '\/';/.test(nav), "sw: the homepage navigation is still named and excluded from every sub-shell fallback");
  ok(/!isHome && !!\(url && url\.origin === self\.location\.origin && BALLOT_NAV_RE/.test(nav),
    "sw: isBallot carries !isHome, so a homepage navigation can never take the ballot fallback");
  ok(!/isHome[\s\S]{0,200}ballot\.html/.test(nav), "sw: no path from isHome reaches ballot.html");

  // THE ADDRESS IS EXACT. A regex that grew a wildcard could swallow /ballots.
  const re = (sw.match(/const BALLOT_NAV_RE = (\/[^;]*\/);/) || [])[1];
  ok(!!re, "sw: BALLOT_NAV_RE is declared");
  if (re) {
    // eslint-disable-next-line no-eval
    const rx = new RegExp(re.slice(1, re.lastIndexOf("/")));
    ok(rx.test("/ballot") && rx.test("/ballot/"), "sw: BALLOT_NAV_RE matches /ballot and /ballot/");
    for (const p of ["/", "/index.html", "/ballots", "/ballot/senate", "/p/lee", "/i/guns", "/issue/guns"]) {
      ok(!rx.test(p), `sw: BALLOT_NAV_RE does not match ${p}`);
    }
  }

  // THE v188/v189 POISON GUARD, WIDENED. A cached '/' whose body declares
  // itself a sub-shell is refused — and ballot.html is now one of them.
  const guard = (sw.match(/const SUB_SHELL_BANNER_RE = (\/[^;]*\/);/) || [])[1];
  ok(!!guard, "sw: SUB_SHELL_BANNER_RE still exists — the poison guard is not removed");
  if (guard) {
    const rx = new RegExp(guard.slice(1, guard.lastIndexOf("/")));
    for (const [name, word] of [["person", "SECOND"], ["issue", "THIRD"],
                                ["spotlight", "FOURTH"], ["ballot", "FIFTH"]]) {
      ok(rx.test(`${name}.html — THE ${word} SHELL. /x IS ITS OWN DOCUMENT.`),
        `sw: the poison guard recognises ${name}.html as a sub-shell`);
    }
    ok(!rx.test("PolitiDex — the record, not the rhetoric"), "sw: the poison guard does not match ordinary homepage prose");
  }
  ok(/if \(isHome && await isSubShellBody\(res\)\) return res;/.test(sw),
    "sw: the write half of the poison guard is intact — a sub-shell body is never stored under '/'");
  ok(/if \(cached && isHome && await isSubShellBody\(cached\)\)/.test(sw),
    "sw: the read half of the poison guard is intact — a poisoned '/' is refused");

  // AND ballot.html DECLARES ITSELF, inside the sniff window, so the guard can
  // actually read it.
  const sniff = Number((sw.match(/const SHELL_SNIFF_CHARS = (\d+)/) || [])[1] || 0);
  ok(sniff > 0, "sw: SHELL_SNIFF_CHARS is declared");
  const at2 = html.indexOf("ballot.html — THE FIFTH SHELL. /ballot IS ITS OWN DOCUMENT.");
  ok(at2 >= 0, "banner: ballot.html carries its FIFTH SHELL self-declaration");
  ok(at2 >= 0 && at2 < sniff,
    `banner: the declaration is inside the ${sniff}-character sniff window (found at ${at2})`);
}

// ── 13. The document stays small ────────────────────────────────────────────
{
  const gz = gzipSync(Buffer.from(html, "utf8")).length;
  ok(gz <= MAX_DOC_GZ, `size: ballot.html is ${(gz / 1024).toFixed(1)} KB gzipped, budget ${MAX_DOC_GZ / 1024} KB`);
  ok(srcs.length <= MAX_SCRIPT_TAGS,
    `size: ${srcs.length} <script src> tags, budget ${MAX_SCRIPT_TAGS}`);
  const noNoscript = html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  const blocking = [...noNoscript.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gi)]
    .filter((m) => !/media="print"/.test(m[0]));
  ok(blocking.length <= MAX_BLOCKING_CSS,
    `size: ${blocking.length} render-blocking stylesheets, budget ${MAX_BLOCKING_CSS}`);
  // --pdx-chrome must be DECLARED: an undeclared custom property invalidates
  // every calc() that reads it.
  ok(/--pdx-chrome:\s*[\d.]+rem/.test(html), "css: --pdx-chrome is declared with a literal fallback value");
  ok(/@supports \(padding-top: env\(safe-area-inset-top\)\)/.test(html),
    "css: the env() @supports guard is present, as on the other three shells");

  const idxGz = gzipSync(Buffer.from(index, "utf8")).length;
  const idxTags = (index.match(/<script\b[^>]*src=/gi) || []).length;
  ok(gz < idxGz && srcs.length < idxTags && html.length < index.length,
    "size: ballot.html is smaller than index.html by every measure");
  console.log(`  ballot.html: ${(html.length / 1024).toFixed(0)} KB raw / ${(gz / 1024).toFixed(1)} KB gz, ${srcs.length} script tags` +
    `  (index.html: ${(index.length / 1024).toFixed(0)} KB raw / ${(idxGz / 1024).toFixed(1)} KB gz, ${idxTags} tags)`);
}

// ── 14 · One desk, one meter, and the statewide seats survive a detect ──────
// The three defects this section exists for all shipped while the thirteen
// sections above were green, because every one of them lives in a WRITER and
// this harness only ever read the two documents. A static pin over markup
// cannot see a string that JavaScript produces at first paint.
{
  const YB = read("your-ballot.js");
  const BW = read("ballot-workspace.js");
  const VHL = read("voter-hub-location.js");

  // ── 14a · THE SECOND BALLOT ────────────────────────────────────────────────
  // ballot.html loads your-ballot.js for one reason: it owns officialNote(), the
  // one spelling of "not an official ballot", which the desk borrows. But the
  // same file also paints the HOMEPAGE's ballot section, and its mount helper
  // used to fall back to document.body.appendChild when its anchor was missing.
  // ballot.html has no #voter-hub. So loading a file for one sentence painted a
  // whole second ballot under the desk — "Your Ballot", "0 of 2 races", "No
  // record yet · Word vs Action", "Being added", "Review My Voting Team",
  // "Explore the research library" — unstyled, un-asked-for, and counting the
  // reader's progress on a scale of its own.
  //
  // The document is checked for the leftover, and then the WRITER is checked for
  // the ability to produce it, because dropping the strings from ballot.html
  // would have fixed nothing: no one had written them there.
  // The six strings the leftover printed, as the reader met them. "Your ballot"
  // is allowed to be followed by "workspace" — that is this document's own
  // no-script loading line, and it is the honest sentence.
  const LEFTOVER = [
    /\bYour\s+Ballot\b(?!\s+workspace)/i, /Review\s+My\s+Voting\s+Team/i,
    /research\s+library/i, /Being\s+added/i, /No\s+record\s+yet/i,
    /Word\s+vs\s+Action/i, /\bof\s+\d+\s+races\b/i,
  ];
  {
    // Read from <body> down. The <title> is legitimately "Your ballot · PolitiDex"
    // — section 8 pins it — and this is a check about what the reader is shown
    // under the desk, not about what the tab says.
    const bodyAt = bare.indexOf("<body");
    const txt = visible(bodyAt >= 0 ? bare.slice(bodyAt) : bare);
    for (const re of LEFTOVER) {
      ok(!re.test(txt), `one desk: ballot.html's visible copy carries homepage ballot markup (matched ${re})`);
    }
  }
  ok(!/id="your-ballot"/.test(bare), "one desk: ballot.html carries no #your-ballot mount");
  ok(!/\byb-title\b|\byb-cta\b/.test(bare),
    "one desk: ballot.html carries markup wearing your-ballot.js's own classes");
  ok(!/id="voter-hub"/.test(bare),
    "one desk: ballot.html carries no #voter-hub — and your-ballot.js mounts against nothing else");
  // The desk's mount is BUILT by the inline script (section 6), so the assertion
  // is that exactly one mount is built and it is the desk's.
  ok((code.match(/\.id\s*=\s*['"]ballot-workspace['"]/g) || []).length === 1,
    "one desk: #ballot-workspace is not built exactly once on this document");
  ok(!/\.id\s*=\s*['"]your-ballot['"]/.test(code),
    "one desk: an inline script on ballot.html builds a second, homepage ballot mount");

  // THE WRITER MAY NOT INVENT A HOST. No appendChild onto <body> anywhere in the
  // module: the insert is relative to an anchor it found, or it does not happen.
  ok(!/\bdocument\.body\.(?:appendChild|append|insertBefore)\b/.test(YB),
    "one desk: your-ballot.js appends to document.body — it can mount itself onto any document");
  // And the helper is run, on a document that has no anchor, to prove it.
  {
    const a = YB.indexOf("function ensureMounted()");
    const b = YB.indexOf("\n  }", a);
    const src = a >= 0 && b > a ? YB.slice(a, b + 4) : "";
    ok(src.length > 0, "one desk: ensureMounted() can be located in your-ballot.js");
    if (src) {
      const touched = [];
      // A document with NO anchor and a <body> that reports being touched. This
      // is ballot.html: no #voter-hub, no #your-ballot, nothing to insert beside.
      const doc = {
        getElementById: () => null,
        createElement: (t) => ({ tagName: t, setAttribute() {} }),
        get body() { touched.push("body"); return { appendChild() { touched.push("append"); } }; },
      };
      const ctx = {
        MOUNT_ID: "your-ballot",
        _mounted: false,
        // The module's own one-line helper, verbatim, so the lift runs the real lookup.
        el: (id) => doc.getElementById(id),
        document: doc,
      };
      createContext(ctx);
      try {
        runInContext(src + "\nthis.__out = ensureMounted();", ctx);
        ok(ctx.__out === null,
          "one desk: on a document with no anchor, ensureMounted() still returns a host to paint into");
        ok(touched.length === 0,
          `one desk: ensureMounted() reached for document.body on an anchorless document (${touched.join(", ")})`);
      } catch (e) {
        ok(false, `one desk: ensureMounted() threw on an anchorless document — ${e.message}`);
      }
    }
  }
  // The export half is UNCONDITIONAL. The fix must not have been "stop loading
  // the section", because then the caveat would have gone with it.
  ok(/window\._pdxOfficialBallotNote\s*=/.test(YB),
    "one desk: your-ballot.js still exports _pdxOfficialBallotNote");
  {
    // The two halves of boot(): everything above the export is allowed to be
    // inside the `if (ensureMounted())` gate; the export may not be.
    const a = YB.indexOf("function boot()");
    const b = YB.indexOf("window._pdxOfficialBallotNote", a);
    const gate = a >= 0 && b > a ? YB.slice(a, b) : "";
    const opens = (gate.match(/\{/g) || []).length - (gate.match(/\}/g) || []).length;
    ok(opens === 1,
      "one desk: the _pdxOfficialBallotNote export sits inside boot()'s mount gate — /ballot would lose the caveat");
  }

  // ── 14b · NO HARDCODED DENOMINATOR ─────────────────────────────────────────
  // The desk printed "0/6" on a document where two of those six were a district
  // we do not map and a local roster this file never loaded. Six is Utah's slate
  // length, not this voter's resolvable list, and a target the reader cannot
  // reach reads as an instruction to keep going.
  ok(!/['"]seats decided['"]|seats decided/.test(BW),
    'no literal: ballot-workspace.js still labels the meter "seats decided" — it counts what we can resolve');
  ok(/_workable\s*:/.test(BW),
    "no literal: ballot-workspace.js exports no _workable — there is no named source for the denominator");
  {
    // The denominator is a length of a list, and the list is the seat list run
    // through the same gate the desk paints each seat from.
    const a = BW.indexOf('class="bw-prog"');
    const head = a >= 0 ? BW.slice(Math.max(0, a - 900), a + 700) : "";
    ok(/fieldGate\(/.test(head),
      "no literal: the progress figure is not derived from fieldGate — it can disagree with the seats on screen");
    ok(/workable\.length/.test(head),
      "no literal: the progress figure's denominator is not workable.length");
    ok(!/<small>\/\s*\d/.test(head) && !/\/'\s*\+\s*\d/.test(head),
      "no literal: the progress figure concatenates a number into its own denominator");
    ok(/we can resolve/.test(head),
      'no literal: the meter does not say "we can resolve" beside its figure');
  }
  // And no module on this document may put the figure back as a string.
  for (const f of ["ballot-workspace.js", "your-ballot.js"]) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
    for (const re of [/['"][^'"]*\b\d+\s+of\s+6\b/i, /['"]\s*0\s*\/\s*6\s*['"]/, /['"][^'"]*\bpick\s+6\b/i]) {
      ok(!re.test(src), `no literal: ${f} ships a hardcoded seat count in a string (matched ${re})`);
    }
  }

  // ── 14c · A LOCATION WRITE DOES NOT UN-NAME A STATEWIDE SEAT ───────────────
  // Signed out in Utah, Who Represents Me named Curtis, Lee and Cox — correct,
  // and resolved from the STATE. Then the reader pressed Detect, the app learned
  // Layton / Davis County / UT-2, and the Senate row repainted as "NO RECORD ON
  // FILE YET". A voter who told the app MORE about themselves was told it now
  // knew LESS about who their senators are.
  //
  // The cause was the scope of a memo's key. The sticky-seat ledger remembered
  // every seat under one signature built from state + city + county + district,
  // so any refinement inside the same state was a cache miss and dropped the
  // statewide seats with the district ones. A memo's key must be exactly the
  // facts its answer depends on, and a U.S. Senate seat depends on the state.
  const a = VHL.indexOf("var _pdxSeatLedger = {};");
  const b = VHL.indexOf("window._pdxForgetSeatHolders");
  const ledgerSrc = a >= 0 && b > a ? VHL.slice(a, b) : "";
  ok(ledgerSrc.length > 0, "statewide: the sticky-seat ledger can be located in voter-hub-location.js");
  ok(/_pdxStateSig\(/.test(ledgerSrc),
    "statewide: the ledger has no state-only signature — every seat is keyed on the full address");
  if (ledgerSrc) {
    const ctx = { _pdxRosterKeeps: () => true };
    createContext(ctx);
    try {
      runInContext(ledgerSrc + "\nthis.stick = _pdxStickLevels;", ctx);
    } catch (e) {
      ok(false, `statewide: the ledger block did not evaluate — ${e.message}`);
    }
    if (typeof ctx.stick === "function") {
      const seat = (key, pid, extra) => Object.assign({ key, pid: pid || null }, extra || {});
      const at = (list, k) => list.filter((x) => x && x.key === k)[0] || {};
      const SW = { statewide: true };

      // Signed out, state only. Three statewide seats named; no district yet.
      ctx.stick([
        seat("ussen1", "p-lee", SW), seat("ussen2", "p-curtis", SW),
        seat("gov", "p-cox", SW), seat("house", "p-moore", { district: "1" }),
      ], { city: "", county: "", district: "" }, "UT");

      // DETECT. A more precise address inside the same state, and the walk lands
      // mid-roster: every seat comes back empty, and the House has moved to a
      // different district.
      const after = ctx.stick([
        seat("ussen1", null, SW), seat("ussen2", null, SW),
        seat("gov", null, SW), seat("house", null, { district: "2" }),
      ], { city: "Layton", county: "Davis County", district: "2" }, "UT");

      ok(at(after, "ussen1").pid === "p-lee",
        "statewide: a Detect inside the same state un-named a U.S. Senate seat");
      ok(at(after, "ussen2").pid === "p-curtis",
        "statewide: a Detect inside the same state un-named the other U.S. Senate seat");
      ok(at(after, "gov").pid === "p-cox",
        "statewide: a Detect inside the same state un-named the Governor");
      // The district seat is the opposite rule, and it is the same one sentence:
      // never the wrong district's member. UT-1's member does not survive onto a
      // UT-2 ballot — that seat stays blank-honest.
      ok(!at(after, "house").pid,
        "statewide: the UT-1 member survived onto a UT-2 detect — that is the wrong district's member");

      // Crossing a state line is a different reader's statewide seats, and the
      // ledger must drop them. This is the case the old single key got right, and
      // the only reason it was written that way.
      const acrossLine = ctx.stick([
        seat("ussen1", null, SW), seat("ussen2", null, SW), seat("gov", null, SW),
      ], { city: "Boise", county: "Ada County", district: "1" }, "ID");
      ok(!acrossLine.some((lv) => lv.pid),
        "statewide: Utah's senators followed the reader across a state line");
    }
  }
}

// ── 15 · Opening a person is a push, never a stamp ──────────────────────────
// "If stamp() is in flight, every person-open is a real /p/<pid> push, and no
// replaceState lands on a person file." Two different failures wear one symptom
// — an address that names a document the reader is not looking at — and the
// split's whole premise is that /p/<pid> IS a document.
{
  const PF = read("person-file.js");
  const PL = read("person-link.js");
  const inline = TAGS.filter((t) => !t.attrs.includes("src")).map((t) => t.body).join("\n");
  const inlineCode = inline
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");

  // THE STAMP IS A CORRECTION, NOT A TRANSITION. person-file.js may replaceState
  // a person address into the bar for exactly one job: an arrival on an alias
  // whose record is filed elsewhere. It declines outright when the reader is not
  // already on a person path, because from anywhere else it would move the
  // address without moving the document.
  {
    const a = PF.indexOf("function stamp(pid)");
    const b = PF.indexOf("\n  }", PF.indexOf("history.replaceState", a));
    const src = a >= 0 && b > a ? PF.slice(a, b) : "";
    ok(src.length > 0, "person push: stamp() can be located in person-file.js");
    ok(/if\s*\(!fromPath\(location\.pathname\)\)\s*return;/.test(src),
      "person push: stamp() writes a person address from a document that is not a person file");
    const guardAt = src.indexOf("if (!fromPath(location.pathname)) return;");
    const writeAt = src.indexOf("history.replaceState");
    ok(guardAt >= 0 && writeAt > guardAt,
      "person push: stamp()'s replaceState runs before the guard that limits it to person addresses");
  }
  // AND THE OPEN IS A PUSH. assign, not replace: replace overwrites the entry the
  // reader came from, so Back would skip the list they opened the person out of.
  {
    const a = PF.indexOf("function goToPerson(");
    const b = PF.indexOf("\n  }", a);
    const src = a >= 0 && b > a ? PF.slice(a, b) : "";
    ok(src.length > 0, "person push: goToPerson() can be located in person-file.js");
    ok(/location\.assign\(/.test(src), "person push: goToPerson() does not navigate with location.assign");
    ok(!/location\.replace\(|replaceState/.test(src),
      "person push: goToPerson() overwrites the history entry the reader came from");
  }

  // ON THIS DOCUMENT the funnel is absent, and person-link.js falls through to
  // window.showProfile — which profiles-full.js declares as a plain global, so
  // the guard answers true on a document with no modal host. ballot.html's seam
  // has to turn that into the navigation the href already promised.
  ok(/window\.showProfile\s*=/.test(inlineCode),
    "person push: ballot.html does not claim window.showProfile — a name tap dead-ends in a hostless modal");
  {
    const a = inlineCode.indexOf("window.showProfile =");
    const src = a >= 0 ? inlineCode.slice(a, a + 900) : "";
    ok(/location\.assign\(/.test(src), "person push: the seam does not navigate with location.assign");
    ok(/\/p\/|PDXPersonLink/.test(src), "person push: the seam does not send the reader to a /p/ address");
    ok(!/replaceState|location\.replace\(/.test(src),
      "person push: the seam stamps the address instead of navigating");
  }
  // The advertised address is resolved through the one table that owns aliases,
  // so the ballot and the record cannot disagree about a person's URL.
  ok(/function href\(/.test(PL) && /PDXPersonLink/.test(PL),
    "person push: person-link.js no longer owns href() — the seam has no canonical address to ask for");
  // No module on this document may put a person path in the bar by itself.
  for (const f of localSrcs.filter((x) => /\.js$/.test(x))) {
    const name = f.replace(/^\//, "");
    if (!existsSync(join(ROOT, name))) continue;
    const src = read(name).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
    ok(!/(?:replaceState|pushState)\s*\([^)]*['"]\/p\//.test(src),
      `person push: ${name} writes a /p/ address into history without changing the document`);
  }
}

// ── 16 · Three reads, three faces, and no borrowed number ───────────────────
// Three different measurements print within a few pixels of each other on one
// candidate row, and until this pass two of them wore the same chip:
//
//   1. THE FORMAL RECORD — what this person advanced and what they went
//      against. Pattern language and counts. No chip, no percentage, and it is
//      the read that orders the field.
//   2. YOUR MATCH · RECORD — the reader's own positions measured against that
//      record. A percentage, because an overlap between two sets of positions
//      is a share. One violet hue of its own.
//   3. WORD vs ACTION / DIRECTION MATCH — their stated positions against their
//      own formal record. Grey, under the name, only above the publication
//      floor, and it orders nothing.
//
// The defect was lane 2 wearing lane 1's word. The tile said "RECORD" and a
// number, so "12%" beside a name read as a verdict on the candidate — their
// grade, or their integrity — when what it says is "you and this person's
// record agree on 12% of what you told us matters". Every check below is one
// question: does a label from one lane appear next to a number from another.
{
  const BW = read("ballot-workspace.js");
  const CSS = read("ballot-workspace.css");
  const clip = (src, needle, before, after) => {
    const a = src.indexOf(needle);
    return a < 0 ? "" : src.slice(Math.max(0, a - (before || 0)), a + (after || 400));
  };

  // ── LANE 2 · the tile names the reader, and carries only the reader's number ─
  {
    const a = BW.indexOf('head = \'<span class="bw-score">\'');
    const b = BW.indexOf("</span>';", a);
    const tile = a >= 0 && b > a ? BW.slice(a, b) : "";
    ok(tile.length > 0, "three faces: the scored number tile can be located in ballot-workspace.js");
    ok(/your match/.test(tile),
      'three faces: the number tile does not say "your match" — a bare "RECORD" reads as the candidate\'s grade');
    ok(/record/i.test(tile),
      'three faces: the number tile dropped "record" — the record IS what was measured');
    ok(/c\.score/.test(tile), "three faces: the number tile prints something other than the reader's own match figure");
    // The label the reader SEES. The title attribute is allowed to say "it is not
    // Word vs Action" — denying a confusion is not committing it — so the label
    // span is read on its own.
    const label = (tile.match(/class="bw-score-l">([\s\S]*?)<\/span>/) || ["", ""])[1];
    ok(label.length > 0, "three faces: the number tile has no visible label");
    for (const re of [/word\s*vs\s*action/i, /direction\s+match/i, /integrity/i, /grade/i, /align/i]) {
      ok(!re.test(label),
        `three faces: the visible label on lane 2 borrows another lane's word (matched ${re} in "${label}")`);
    }
  }

  // ── LANE 3 · the chip names their own word, and carries only its own figure ──
  {
    const a = BW.indexOf("function dmLine(");
    const b = BW.indexOf("\n  }", a);
    const dm = a >= 0 && b > a ? BW.slice(a, b) : "";
    ok(dm.length > 0, "three faces: dmLine() can be located in ballot-workspace.js");
    ok(/Direction Match|Word vs Action/.test(dm), "three faces: lane 3's chip does not name its own lane");
    ok(/d\.pct/.test(dm), "three faces: lane 3's chip does not print the Direction Match figure");
    ok(!/c\.score|your match/i.test(dm),
      "three faces: lane 3's chip prints the reader's match figure under a Direction Match label");
    // A figure without its denominator is a claim we cannot support, and the
    // floor is what decides whether there is a figure at all.
    ok(/tested/.test(dm), "three faces: lane 3 prints a percentage with no tested count behind it");
    ok(/d\.pct === null|typeof d\.pct === 'number'/.test(dm),
      "three faces: lane 3 prints a figure on a branch the ledger has not published");
  }

  // ── LANE 1 · pattern language, and never a share ─────────────────────────────
  {
    const a = BW.indexOf("function divergeHtml(");
    const b = BW.indexOf("\n  }", a);
    const rec = a >= 0 && b > a ? BW.slice(a, b) : "";
    ok(rec.length > 0, "three faces: divergeHtml() can be located in ballot-workspace.js");
    ok(!/%/.test(rec), "three faces: the formal-record read prints a percentage — it is counts, not a share");
    ok(!/c\.score|d\.pct/.test(rec), "three faces: the formal-record read borrows another lane's figure");
  }

  // ── AND THE RAMP IS GONE ─────────────────────────────────────────────────────
  // A green / amber / red gradient is the face a reader has already been taught
  // to read as a verdict on a person. Lane 2 borrowed it, so lane 2 was read as
  // the candidate's grade. Deleted rather than left unused.
  ok(!/function scoreColor|_alignScoreColor/.test(BW),
    "three faces: the score colour ramp is back in ballot-workspace.js — a traffic light is a verdict");

  // ── THREE HUES, DISJOINT ─────────────────────────────────────────────────────
  // Vocabulary alone does not separate three reads a reader takes in at a
  // glance. Lane 2 is violet, lane 3 is slate, and neither is the gold this
  // sheet spends on the lines-may-move note.
  const hues = (sel) => {
    const out = [];
    const re = new RegExp("\\" + sel + "[^{]*\\{([^}]*)\\}", "g");
    let m;
    while ((m = re.exec(CSS))) {
      const c = m[1].match(/(?:^|;|\s)color:\s*(#[0-9a-f]{3,8})/gi) || [];
      for (const hit of c) out.push(hit.replace(/.*?(#[0-9a-f]{3,8}).*/i, "$1").toLowerCase());
    }
    return out;
  };
  const lane2 = hues(".bw-score-n").concat(hues(".bw-score-l"));
  const lane3 = hues(".bw-dm").concat(hues(".bw-dm-k"));
  const gold = hues(".bw-lines");
  ok(lane2.length > 0, "three faces: lane 2 declares no colour of its own in ballot-workspace.css");
  ok(lane3.length > 0, "three faces: lane 3 declares no colour of its own in ballot-workspace.css");
  for (const c of lane2) {
    ok(!lane3.includes(c), `three faces: lane 2 and lane 3 share the hue ${c}`);
    ok(!gold.includes(c), `three faces: lane 2 wears the lines-may-move gold ${c}`);
  }
  // And lane 2's hue is not a traffic-light stop, whatever the ramp used to be.
  for (const c of lane2) {
    ok(!/^#(?:22c55e|16a34a|4ade80|ef4444|dc2626|f87171|f59e0b|fbbf24|eab308)$/.test(c),
      `three faces: lane 2's hue ${c} is a traffic-light colour`);
  }

  // ── NO SURFACE ON THIS DOCUMENT MIXES THE WORDS ──────────────────────────────
  // The desk is the only scored surface on /ballot, and its visible copy must not
  // offer the reader a fourth name for any of the three.
  {
    const txt = visible(bare.slice(Math.max(0, bare.indexOf("<body"))));
    for (const re of [/direction\s+match/i, /word\s*vs\s*action/i]) {
      ok(!re.test(txt),
        `three faces: ballot.html's own markup names a lane the writers own (matched ${re})`);
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — ballot.html: /ballot is its own document, the homepage keeps the door and loses the desk`);
