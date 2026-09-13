#!/usr/bin/env node
/**
 * test-issue-back-path.mjs — the way back from an issue file to the person file
 * ─────────────────────────────────────────────────────────────────────────────
 * THE READER THIS PASS WAS BUILT FOR. Someone on Mike Lee's file, reading the
 * gap sheet on gun_safety. They tap "Issue File" to see what the key covers and
 * land on /i/gun_safety — which, since the second split, is its OWN document and
 * not the homepage with an overlay on top. Then they close it.
 *
 * Before this pass, closing it put them on the homepage: the issue shell's X and
 * its "← All politicians" control were the same target, because a cold /i/<key>
 * had no idea a person file existed. So the reader paid 578 KB of homepage to get
 * back to a 70 KB person file they had already loaded, and /p/lee felt slow for
 * the second time in one session. The fix is one query parameter and no new UI:
 * a door that leaves a person file carries that person, and the issue shell's bar
 * offers them back.
 *
 * WHAT THIS FILE PINS
 *
 *   1. ONE OWNER FOR THE WHOLE ADDRESS. PDXIssueFamily.profileUrl(key, pid)
 *      returns /i/<key>?pid=<canonical-pid>, with the pid canonicalised by
 *      person-link.js — so the query holds the same id /p/ is served at, and a
 *      pid the app will not advertise produces no query rather than a bad one.
 *   2. ALL SIX DOORS CARRY IT, measured on rendered output rather than on source:
 *      the gap sheet's Issue File title (consistency.js), the stance tree's leaf
 *      (stance-tree.js), the Word-vs-Action brief's row (word-action.js), the
 *      mandate chip's fallback (stance-helpers.js), the signature chip
 *      (profile-spine.js) and the Flashpoint card's Issue Spotlight action
 *      (controversies.js). The last three emit inline JS, so the JS is EXECUTED
 *      here and the address it would navigate to is read off the stub.
 *   3. NO DOOR SPELLS '/i/'. Scanned with comments stripped, because every one of
 *      these files explains the rule in prose that quotes it.
 *   4. THE BAR, RUN. issue.html's PDXIssueBack block is executed against a
 *      stubbed window across the shapes a real arrival has: with a pid and a
 *      matching referrer (history.back()), with a pid and a mismatched, absent,
 *      or off-origin referrer (explicit /p/<pid>), and with no usable pid at all
 *      (/). Legacy ?p= and #/p/ spellings too.
 *   5. X AND "ALL POLITICIANS" ARE DIFFERENT CONTROLS. Three nodes in the bar,
 *      and with a pid in hand the close path and the homepage path do not agree.
 *   6. THE OVERLAY IS STILL AN OVERLAY. restore() asks PDXIssueBack to leave
 *      only when PDXIssueBack exists, and only the issue shell publishes it — so
 *      the homepage's issue overlay and the person file's gap sheet still close
 *      in place, which is the wall this pass was explicitly not allowed to move.
 *   7. stamp() KEEPS THE QUERY and the canonical stays the bare /i/<key>.
 *
 * A NOTE ON THE TWO STUBS. window._pdxMandateForIssue is defined in the SHELLS
 * (index.html, person.html, issue.html), not in a module, so a module-only
 * sandbox cannot have it and the mandate chip throws without it. It is stubbed to
 * return nothing — the chip under test here is the TOPIC chip beside it, and the
 * stub's only job is to let the row finish rendering.
 *
 *   node scripts/test-issue-back-path.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox, ENGINE_FILES } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ back path: STALE HARNESS — ${msg}`);
  process.exit(2);
};

const PID = "lee";
const KEY = "gun_safety";
const ORIGIN = "https://www.politidex.fyi";
// Everything one of these doors is rendered by, in index.html's order, plus the
// two address owners. person-link.js is the one this suite exists to include:
// without it profileUrl has no canonicaliser and emits no query at all, which is
// exactly the state the sibling door suite runs in.
const FILES = [
  "person-link.js",
  "pdx-issue-family.js",
  "issue-map.js",
  ...ENGINE_FILES,
  "issue-scope.js",
  "issue-colors.js",
  "voting-record.js",
  "stance-tree.js",
  "profile-spine.js",
  "controversies.js",
];
for (const f of FILES) must(existsSync(join(ROOT, f)), `${f} is gone`);

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 300,
  "the record corpus did not load enough members");

function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  // Shell-provided, not module-provided. See the note in the head comment.
  win._pdxMandateForIssue = () => [];
  const errs = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); }
    catch (e) { errs.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  win.__errs = errs;
  return win;
}

const W = boot();
must(W.__errs.length === 0, `modules failed to boot: ${W.__errs.join(" | ")}`);
must(W.PDXPersonLink && typeof W.PDXPersonLink.href === "function", "PDXPersonLink.href is gone");
must(W.PDXIssueFamily && typeof W.PDXIssueFamily.profileUrl === "function", "PDXIssueFamily.profileUrl is gone");
must(W.PDXConsistency && typeof W.PDXConsistency.gapViewHtml === "function", "PDXConsistency.gapViewHtml is gone");
must(W.PDXStanceTree && typeof W.PDXStanceTree.sectionHtml === "function", "PDXStanceTree.sectionHtml is gone");
must(W.PDXWordAction && typeof W.PDXWordAction.briefHtml === "function", "PDXWordAction.briefHtml is gone");
must(W.PDXProfileSpine && typeof W.PDXProfileSpine.briefHtml === "function", "PDXProfileSpine.briefHtml is gone");
must(typeof W._pdxStanceConnectRow === "function", "window._pdxStanceConnectRow is gone");
must(typeof W._renderControversies === "function", "window._renderControversies is gone");
must(W.CMP_DATA[PID], `${PID} left the roster`);
must(W.ISSUE_MAP && W.ISSUE_MAP[KEY], `${KEY} is not in ISSUE_MAP any more`);

// The address each door is measured against. Built by the owner, not spelled
// here, so a rename of the prefix moves this file's expectations with the app.
const WANT = W.PDXIssueFamily.profileUrl(KEY, PID);
must(WANT === `/i/${KEY}?pid=${PID}`,
  `profileUrl(${KEY}, ${PID}) is ${JSON.stringify(WANT)} — not the address this suite was written against`);

const hrefs = (html) => [...String(html).matchAll(/href="(\/i\/[^"]*)"/g)].map((m) => m[1]);
const code = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const unent = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

// An emitted onclick is a door too. Three of the six navigate from inline JS
// rather than from an href, so the JS is run here — in a window where no in-page
// opener exists, which is the person-file case — and the address it reaches for
// is read back off the stub.
function navFromJs(js) {
  const win = {
    PDXIssueFamily: W.PDXIssueFamily,
    event: { stopPropagation() {}, preventDefault() {} },
    location: { set href(u) { win.__nav = u; }, get href() { return ORIGIN + "/p/" + PID; },
      assign(u) { win.__nav = u; } },
    __nav: "",
  };
  win.window = win;
  vm.runInNewContext(unent(js), win, { timeout: 2000 });
  return win.__nav;
}
const onclicks = (html) =>
  [...String(html).matchAll(/onclick="([^"]*profileUrl[^"]*)"/g)].map((m) => m[1]);

// The report table this pass owes: the exact href every door now emits.
const EMITTED = [];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one owner builds the whole address, query included");
{
  const F = W.PDXIssueFamily;
  const PL = W.PDXPersonLink;
  eq(F.profileUrl(KEY, PID), `/i/${KEY}?pid=${PID}`,
    "profileUrl(key, pid) returns /i/<key>?pid=<pid> — the citation plus the return address");
  eq(F.profileUrl(KEY), `/i/${KEY}`,
    "profileUrl(key) with no pid returns the bare file — a door with nobody to return to advertises nobody");
  eq(F.profileUrl(KEY, ""), `/i/${KEY}`, "an empty pid is no pid, not an empty query");
  // The pid in the query is the one /p/ is SERVED at, because person-link.js
  // canonicalises it. That is what lets the bar compare a referrer against the
  // query without either side having to know about alias spellings.
  const canon = PL.pid(PID);
  eq(canon, PID, `${PID} is its own canonical id, which is what the rest of this suite assumes`);
  // Canonical means "the id this app would serve at /p/", not "lowercased":
  // PID_RE is case-sensitive on purpose and person-link.js advertises the
  // spelling it was handed. What must hold is that the query and the href agree,
  // because the bar compares them.
  eq(F.profileUrl(KEY, PID).split("?pid=")[1], PL.pid(PID),
    "the query holds exactly the id PDXPersonLink would serve — the bar compares the two directly");
  // THE ALIAS HOP, which is the case where the two could have disagreed. A
  // retired id must reach the query as the current one, or a reader arriving from
  // /p/<retired> would be offered a different person's file back.
  {
    const mini = { PDXProfilePid: (id) => (id === "old_lee" ? PID : id) };
    mini.window = mini;
    const ctx = vm.createContext(mini);
    vm.runInContext(R("person-link.js"), ctx, { filename: "person-link.js" });
    vm.runInContext(R("pdx-issue-family.js"), ctx, { filename: "pdx-issue-family.js" });
    must(mini.PDXIssueFamily && typeof mini.PDXIssueFamily.profileUrl === "function",
      "pdx-issue-family.js will not boot without the engine — the alias probe cannot run");
    eq(mini.PDXIssueFamily.profileUrl(KEY, "old_lee"), `/i/${KEY}?pid=${PID}`,
      "a retired id runs the alias hop before it reaches the query, so the way back is the address /p/ serves");
  }
  // The sentinels person-link.js refuses. A stringified null in an address is
  // how a reader ends up on a file for nobody.
  for (const bad of ["null", "undefined", "nan", "NULL"]) {
    eq(F.profileUrl(KEY, bad), `/i/${KEY}`,
      `profileUrl drops the sentinel pid ${JSON.stringify(bad)} rather than advertising it`);
  }
  eq(F.profileUrl(KEY, "not a pid!"), `/i/${KEY}`,
    "a pid person-link.js will not advertise produces no query at all");
  eq(F.profileUrl("", PID), "", "no key is still no address, whatever pid is in hand");
  // The query is a QUERY. The key stays one path segment, so PATH_RE keeps
  // matching, stamp() keeps the search string and the canonical stays bare.
  ok(/^\/i\/[^/?]+\?pid=/.test(F.profileUrl(KEY, PID)),
    "the pid rides in the query string — the path is still one key, so the citation has one canonical form");
  // And the encoder is real, not hopeful.
  const odd = F.profileUrl(KEY, "a b");
  ok(odd === `/i/${KEY}` || odd.indexOf(" ") < 0,
    "a pid with a space is either refused or encoded — never pasted raw into an address");
  ok(typeof F.pidParam === "function", "pdx-issue-family.js publishes pidParam, the one canonicaliser for this query");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · all six doors carry the person");
{
  // DOOR 1 — the gap sheet's Issue File title (consistency.js). This is the
  // reader's own path: /p/lee, gun_safety, "Issue File".
  const gap = W.PDXConsistency.gapViewHtml(PID, KEY);
  const gapHrefs = hrefs(gap);
  ok(gapHrefs.length > 0, "door 1: the gap sheet still paints an Issue File door at all");
  eq(gapHrefs[0], WANT,
    `door 1: /p/${PID}'s ${KEY} gap sheet links to ${WANT} — the exact case live smoke found broken`);
  EMITTED.push(["consistency.js · gap sheet Issue File title", gapHrefs[0]]);
  for (const h of gapHrefs) {
    ok(h.indexOf(`?pid=${PID}`) > 0, `door 1: every issue door on the sheet carries ?pid=${PID} (${h})`);
  }

  // DOOR 2 — the stance tree's leaf row.
  const tree = W.PDXStanceTree.sectionHtml(PID);
  const treeHrefs = hrefs(tree);
  ok(treeHrefs.length > 0, "door 2: the stance tree still paints leaf file doors");
  ok(treeHrefs.every((h) => h.endsWith(`?pid=${PID}`)),
    `door 2: every stance-tree leaf carries ?pid=${PID} (first: ${treeHrefs[0]})`);
  EMITTED.push(["stance-tree.js · leaf sibling", treeHrefs[0]]);

  // DOOR 3 — the Word-vs-Action brief's row.
  const brief = W.PDXWordAction.briefHtml(PID);
  const briefHrefs = hrefs(brief);
  ok(briefHrefs.length > 0, "door 3: the Word-vs-Action brief still paints file doors");
  ok(briefHrefs.every((h) => h.endsWith(`?pid=${PID}`)),
    `door 3: every Word-vs-Action row carries ?pid=${PID} (first: ${briefHrefs[0]})`);
  EMITTED.push(["word-action.js · brief row sibling", briefHrefs[0]]);

  // DOOR 4 — the mandate chip's topic fallback (stance-helpers.js). Inline JS,
  // and until this pass the last hand-pasted '/i/' in the tree.
  const row = W._pdxStanceConnectRow(PID, W.CMP_DATA[PID], { issueKey: KEY, text: "x" });
  ok(String(row).length > 0, "door 4: the stance connect row still renders");
  const rowNav = [...String(row).matchAll(/location\.href='([^']*)'/g)].map((m) => m[1]);
  ok(rowNav.length > 0, "door 4: the topic chip still has a navigation fallback for a page with no desk");
  eq(rowNav[0], WANT, `door 4: the topic chip's fallback goes to ${WANT}`);
  EMITTED.push(["stance-helpers.js · connect-row topic fallback", rowNav[0]]);

  // DOOR 5 — the signature chip (profile-spine.js). Inline JS, run for real.
  const spine = W.PDXProfileSpine.briefHtml(PID);
  const spineJs = onclicks(spine);
  ok(spineJs.length > 0, "door 5: the signature chip still emits a keyIsReal-gated navigation");
  const spineNav = navFromJs(spineJs[0]);
  ok(/^\/i\/[^?]+\?pid=/.test(spineNav),
    `door 5: the signature chip navigates to /i/<key>?pid=<pid> (got ${JSON.stringify(spineNav)})`);
  eq(spineNav.split("?")[1], `pid=${PID}`, `door 5: the signature chip's query is pid=${PID}`);
  EMITTED.push(["profile-spine.js · signature chip (executed)", spineNav]);

  // DOOR 6 — the Flashpoint card's Issue Spotlight action (controversies.js).
  // Lee's card maps no issue key, so this door is measured on a person whose
  // flashpoints do — the door is the same code either way.
  const CTV_PID = ["trump", "maloy"].find((p) => {
    try { return onclicks(W._renderControversies(p, W.CMP_DATA[p])).length > 0; }
    catch { return false; }
  });
  must(CTV_PID, "no roster member's Flashpoint card emits an issue-file action any more");
  const ctvJs = onclicks(W._renderControversies(CTV_PID, W.CMP_DATA[CTV_PID]));
  const ctvNav = navFromJs(ctvJs[0]);
  ok(/^\/i\/[^?]+\?pid=/.test(ctvNav),
    `door 6: the Issue Spotlight action navigates to /i/<key>?pid=<pid> (got ${JSON.stringify(ctvNav)})`);
  eq(ctvNav.split("?")[1], `pid=${CTV_PID}`,
    `door 6: the Issue Spotlight action's query is pid=${CTV_PID} — the person whose card it is`);
  EMITTED.push([`controversies.js · Issue Spotlight action (executed, ${CTV_PID})`, ctvNav]);

  // And a door that has no person in hand must not invent one.
  eq(W.PDXIssueFamily.profileUrl(KEY, null), `/i/${KEY}`,
    "doors: a surface with no person — the homepage's own issue grid — still gets the bare file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no door spells the prefix, and none assembles the query itself");
{
  for (const f of ["consistency.js", "stance-tree.js", "word-action.js",
                   "stance-helpers.js", "profile-spine.js", "controversies.js"]) {
    const c = code(f);
    ok(!/["'`]\/i\//.test(c),
      `${f} never spells '/i/' as a string literal — the prefix has one owner`);
    ok(!/\?pid=/.test(c),
      `${f} never assembles ?pid= itself — it hands the pid to profileUrl, which owns the whole address`);
    ok(/profileUrl\(/.test(c), `${f} asks PDXIssueFamily.profileUrl for the address`);
  }
  // The gate the request names, still in front of every navigation that can only
  // be a navigation: a display label must never be widened into an address.
  for (const f of ["profile-spine.js", "controversies.js"]) {
    has(code(f), "keyIsReal", `${f} tests the key before it navigates`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the bar, run against a stubbed arrival");
{
  const HTML = R("issue.html");
  const blocks = [...HTML.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const BLOCK = blocks.find((b) => b.indexOf("PDXIssueBack") >= 0);
  must(BLOCK, "issue.html no longer has an inline block that publishes PDXIssueBack");
  const PERSON_LINK = R("person-link.js");

  function arrive(o) {
    const opts = o || {};
    const nav = [];
    const el = opts.anchor === false ? null : {
      attrs: {}, hidden: true,
      setAttribute(k, v) { this.attrs[k] = v; },
      removeAttribute(k) { if (k === "hidden") this.hidden = false; },
    };
    const win = {
      location: {
        origin: ORIGIN, protocol: "https:", host: "www.politidex.fyi",
        pathname: `/i/${KEY}`, search: opts.search || "", hash: opts.hash || "",
        assign(u) { nav.push(["assign", u]); },
        set href(u) { nav.push(["href", u]); }, get href() { return ORIGIN + `/i/${KEY}`; },
      },
      document: {
        referrer: opts.referrer || "",
        getElementById: (id) => (id === "pdx-issue-back" ? el : null),
      },
      history: {
        length: opts.histLen == null ? 2 : opts.histLen,
        back() { nav.push(["back"]); }, replaceState() {},
      },
    };
    win.window = win;
    const ctx = vm.createContext(win);
    if (opts.withLink !== false) vm.runInContext(PERSON_LINK, ctx, { filename: "person-link.js" });
    vm.runInContext(BLOCK, ctx, { filename: "issue.html#back" });
    return { B: win.PDXIssueBack, el, nav };
  }

  const P_HREF = W.PDXPersonLink.href(PID);
  must(P_HREF === `/p/${PID}`, `PDXPersonLink.href(${PID}) is ${P_HREF} — not the address this suite expects`);

  // THE WHOLE POINT, in one assertion: a pid in the query, a referrer from that
  // person's file. The reader came from /p/lee; closing this must go back there,
  // through the history entry that already holds the scroll position.
  {
    const a = arrive({ search: `?pid=${PID}`, referrer: `${ORIGIN}/p/${PID}` });
    must(a.B, "the block published no PDXIssueBack at all");
    eq(a.B.pid, PID, "bar: the query's pid is resolved and published");
    eq(a.B.href, P_HREF, "bar: the back href is PDXPersonLink.href(pid), never /");
    eq(a.B.target(), P_HREF, "bar: the X target with ?pid= is /p/<pid>");
    eq(a.B.fromPerson, true, "bar: a same-origin /p/<pid> referrer that matches the query is recognised");
    eq(a.el.attrs.href, P_HREF, "bar: the '← Person file' anchor is painted with that href");
    eq(a.el.hidden, false, "bar: the '← Person file' anchor is un-hidden once a pid resolves");
    a.B.leave();
    eq(JSON.stringify(a.nav), JSON.stringify([["back"]]),
      "bar: leave() prefers history.back() when the referrer is that same person's file");
  }
  // A matching referrer is not enough on its own: with no history to go back to,
  // back() would leave the tab where it is.
  {
    const a = arrive({ search: `?pid=${PID}`, referrer: `${ORIGIN}/p/${PID}`, histLen: 1 });
    a.B.leave();
    eq(JSON.stringify(a.nav), JSON.stringify([["assign", P_HREF]]),
      "bar: with no history entry behind it, leave() navigates explicitly instead of calling back()");
  }
  // The referrer's query and hash are not part of the identity.
  {
    const a = arrive({ search: `?pid=${PID}`, referrer: `${ORIGIN}/p/${PID}?x=1#y` });
    eq(a.B.fromPerson, true, "bar: a referrer with its own query and hash still matches the pid");
  }
  // A referrer for somebody ELSE'S file is not a way back to this pid.
  {
    const a = arrive({ search: `?pid=${PID}`, referrer: `${ORIGIN}/p/maloy` });
    eq(a.B.fromPerson, false, "bar: a referrer for a different person does not count as the way back");
    eq(a.B.target(), P_HREF, "bar: the target is still this query's person file");
    a.B.leave();
    eq(JSON.stringify(a.nav), JSON.stringify([["assign", P_HREF]]),
      "bar: a mismatched referrer takes the explicit /p/<pid> href");
  }
  // Shared links, and links from other sites, arrive with no referrer or a
  // foreign one. The query is still honoured; the history shortcut is not.
  for (const [label, ref] of [["no referrer", ""], ["an off-origin referrer", "https://evil.example/p/" + PID]]) {
    const a = arrive({ search: `?pid=${PID}`, referrer: ref });
    eq(a.B.fromPerson, false, `bar: ${label} is not treated as the way back`);
    a.B.leave();
    eq(JSON.stringify(a.nav), JSON.stringify([["assign", P_HREF]]),
      `bar: with ${label}, leave() navigates to the explicit /p/<pid> href`);
  }
  // NO PID — the cold /i/<key> live smoke described. X may go to /, and the
  // person-file control must not paint at all.
  for (const [label, opts] of [
    ["no query", {}],
    ["a sentinel pid", { search: "?pid=null" }],
    ["a pid the app will not advertise", { search: "?pid=not%20a%20pid!" }],
    ["person-link.js absent", { search: `?pid=${PID}`, withLink: false }],
  ]) {
    const a = arrive(opts);
    must(a.B, `the block published no PDXIssueBack with ${label}`);
    eq(a.B.href, "", `bar: ${label} resolves to no person href`);
    eq(a.B.target(), "/", `bar: the X target with ${label} is /`);
    eq(a.B.fromPerson, false, `bar: ${label} cannot be a way back`);
    if (a.el) eq(a.el.hidden, true, `bar: the '← Person file' anchor stays hidden with ${label}`);
    a.B.leave();
    eq(JSON.stringify(a.nav), JSON.stringify([["assign", "/"]]),
      `bar: with ${label}, leave() goes to the homepage — the one case where that is honest`);
  }
  // The legacy spellings the block documents. No door emits these, but a hand-
  // edited or older link might.
  for (const [label, opts] of [["?p=<pid>", { search: `?p=${PID}` }],
                               ["#/p/<pid>", { hash: `#/p/${PID}` }],
                               ["#p/<pid>", { hash: `#p/${PID}` }]]) {
    const a = arrive(opts);
    eq(a.B.target(), P_HREF, `bar: the legacy ${label} shape still resolves to /p/<pid>`);
  }
  // A missing anchor must cost the page nothing.
  {
    const a = arrive({ search: `?pid=${PID}`, anchor: false });
    eq(a.B.target(), P_HREF, "bar: the answer is published even when the anchor is not in the document");
  }
  // The block reads the query by hand, on purpose, and must not have grown a
  // dependency that would cost the page its boot on an old engine.
  no(BLOCK, "URLSearchParams", "bar: the block still parses the query by hand rather than through URLSearchParams");
  no(BLOCK, "'/p/", "bar: the block spells no person path — PDXPersonLink.PREFIX is how it recognises one");
  has(BLOCK, "PL.PREFIX", "bar: the referrer is recognised through PDXPersonLink.PREFIX");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · X and 'All politicians' are different controls");
{
  const HTML = R("issue.html");
  const bar = /<header class="pdx-issue-bar">([\s\S]*?)<\/header>/.exec(HTML);
  must(bar, "issue.html's one-row chrome header is gone");
  const links = [...bar[1].matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  eq(links.length, 3, "chrome: the bar has exactly three controls — wordmark, person file, all politicians");
  const back = links.find((a) => a.indexOf('id="pdx-issue-back"') >= 0);
  const home = links.find((a) => a.indexOf("pdx-issue-home") >= 0);
  const mark = links.find((a) => a.indexOf("pdx-issue-wordmark") >= 0);
  ok(back && home && mark, "chrome: all three controls are still identifiable");
  ok(back !== home, "chrome: the person-file control and 'All politicians' are two different nodes");
  has(back, "hidden", "chrome: the person-file control ships hidden and paints only when a pid resolves");
  has(home, 'href="/"', "chrome: '← All politicians' is a plain link to / and stays one");
  // With a pid in hand the two controls must not agree. Compared as the values
  // the bar actually uses: the painted href, and the literal '/'.
  const P_HREF = W.PDXPersonLink.href(PID);
  ok(P_HREF !== "/", `chrome: with ?pid=${PID} present, the person-file target (${P_HREF}) is not the homepage`);
  // The X itself lives in the file panel and closes through the address module,
  // which is section 6. What matters here is that it is not the homepage link.
  const panel = R("issue-file.js");
  has(panel, "pdxif-x", "chrome: the file panel still has its own close control");
  // The chain the ✕ actually walks: its own handler closes with no options, and
  // close() without keepAddress hands the address back to the module that took
  // it. That is the single seam through which the new behaviour arrives, so it
  // is pinned rather than assumed.
  has(panel, "x.addEventListener('click', function () { close(); })",
    "chrome: the ✕ closes through close() with no options — it does not write an address itself");
  ok(/if \(!opts\.keepAddress\)[\s\S]{0,160}A\.restore\(\)/.test(panel),
    "chrome: close() asks the address module to restore unless the caller kept the address");
  no(code("issue-file.js"), "pdx-issue-home",
    "chrome: the close control does not reach for the homepage link — it closes, and the address module decides where that lands");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · closing: a navigation on the issue shell, an overlay everywhere else");
{
  const ADDR = R("pdx-issue-profile.js");
  function addrWin(opts) {
    const o = opts || {};
    const rec = { replaced: [], left: 0 };
    const link = { attrs: { href: ORIGIN + "/" }, setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return this.attrs[k]; } };
    const win = {
      location: {
        origin: ORIGIN, protocol: "https:", host: "www.politidex.fyi",
        pathname: o.pathname || `/i/${KEY}`, search: o.search || "", hash: o.hash || "",
        assign() {}, href: ORIGIN + (o.pathname || `/i/${KEY}`),
      },
      document: {
        title: "PolitiDex", referrer: "",
        querySelector: (s) => (s.indexOf("canonical") >= 0 ? link : null),
        getElementById: () => null,
        addEventListener() {},
      },
      history: { length: 2, back() {}, replaceState(a, b, u) { rec.replaced.push(u); } },
      addEventListener() {},
      setTimeout: (f) => f && 0,
    };
    win.window = win;
    if (o.back) {
      win.PDXIssueBack = { pid: PID, href: `/p/${PID}`, fromPerson: true,
        target: () => `/p/${PID}`, leave: () => { rec.left++; return true; } };
    }
    const ctx = vm.createContext(win);
    vm.runInContext(ADDR, ctx, { filename: "pdx-issue-profile.js" });
    return { win, rec, link };
  }

  const A = addrWin({ back: true, search: `?pid=${PID}` });
  must(A.win.PDXIssueProfile && typeof A.win.PDXIssueProfile.restore === "function",
    "PDXIssueProfile.restore() is gone");
  must(typeof A.win.PDXIssueProfile.stamp === "function", "PDXIssueProfile.stamp() is gone");

  // ON THE ISSUE SHELL. PDXIssueBack exists, so closing LEAVES.
  A.win.PDXIssueProfile.restore();
  eq(A.rec.left, 1, "close: on the issue shell, restore() hands the way back to PDXIssueBack.leave()");
  eq(A.rec.replaced.length, 0,
    "close: it does not also rewrite the address — the page is navigating away, not pretending to");

  // EVERYWHERE ELSE. No PDXIssueBack, so closing is still a replaceState and the
  // document the reader was on stays the document they are on. This is the gap
  // sheet on /p/lee and the issue overlay on the homepage, unchanged.
  const B = addrWin({ back: false });
  B.win.PDXIssueProfile.stamp(KEY);
  B.win.PDXIssueProfile.restore();
  ok(B.rec.replaced.length > 0,
    "close: with no PDXIssueBack, restore() still rewrites the address in place — an overlay is not a navigation");

  // stamp() must keep the query, or the return address is lost the moment the
  // canonical re-stamp runs.
  const C = addrWin({ pathname: "/", search: `?pid=${PID}`, hash: "#x" });
  C.win.PDXIssueProfile.stamp(KEY);
  const stamped = C.rec.replaced[C.rec.replaced.length - 1];
  has(stamped, `?pid=${PID}`, "stamp: the re-stamped address keeps ?pid= — the way back survives the canonical stamp");
  has(stamped, `/i/${KEY}`, "stamp: the re-stamped path is the key's own file");
  eq(C.link.attrs.href, `${ORIGIN}/i/${KEY}`,
    "stamp: <link rel=canonical> is the BARE /i/<key> — a return address costs no canonical honesty");

  // Only the issue shell publishes the signal. If index.html or person.html ever
  // published one, their in-page overlays would start navigating.
  for (const shell of ["index.html", "person.html"]) {
    const src = R(shell);
    ok(!/window\.PDXIssueBack\s*=/.test(src),
      `${shell} does not publish PDXIssueBack — its in-page issue surfaces keep closing in place`);
  }
  has(R("issue.html"), "window.PDXIssueBack = {",
    "issue.html publishes PDXIssueBack — the one document where closing an issue file is a navigation");
  // And the module asks rather than assumes.
  has(code("pdx-issue-profile.js"), "window.PDXIssueBack",
    "pdx-issue-profile.js reads the signal off the window rather than sniffing the address");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the homepage stack still does not follow the reader onto /i/");
{
  // The second split's pins live in test-issue-shell.mjs; this is the one line
  // of it this pass could plausibly have broken, since the bar grew a script.
  const HTML = R("issue.html");
  for (const banned of ["compare-hub.js", "alignment-tool.js", "spotlights-data.js", "door2"]) {
    no(HTML, `src="/${banned}"`, `issue.html still does not load ${banned}`);
  }
  has(R("netlify.toml"), '"/issue/*"', "netlify.toml still routes /issue/* as it did — Spotlight is untouched");
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("\n   ── the address each door emits");
for (const [door, href] of EMITTED) console.log(`      ${door.padEnd(52)} ${href}`);
console.log(`      ${"issue.html X · with ?pid=".padEnd(52)} ${W.PDXPersonLink.href(PID)}`);
console.log(`      ${"issue.html X · without a usable pid".padEnd(52)} /`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s) in the person ↔ issue back path:\n`);
  for (const f of failures) console.error(`  FAIL: ${f}`);
  console.error(`\n  (${passed} assertions passed)`);
  process.exit(1);
}
console.log(`\n✓ ${passed} assertions passed — a door that leaves a person file carries the person, and the issue shell offers them back`);
