#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-no-legacy-votes-api.mjs — /api/votes stays retired
// ─────────────────────────────────────────────────────────────────────────────
// Netlify's "top resources not found" report for Aug 12 – Sep 11 put /api/votes
// at 169,076 requests: the loudest dead path on the site by a wide margin, and
// not a politician page. There was never a Function behind it. The 404s were
// four client emitters calling an endpoint that had never been deployed:
//
//   · index.html      — the agenda card's up/down handler mirror-POSTed there
//                       after its Firestore write had already succeeded
//   · like-dislike.js — handleLike and handleDislike did the same
//   · like-dislike.js — a read fallback inside _startVotesListener GET-fetched
//                       it, once PER POLITICIAN in the roster, whenever a
//                       per-document Firestore listener errored. That fan-out is
//                       the shape of the number: one bad session, hundreds of
//                       404s.
//
// All four are gone. This file is the fence around that, and the fence has to
// hold two ways at once, because the tempting "fix" is worse than the bug:
//
//   IT MUST NOT COME BACK AS A CALL. No shipped JS, HTML or service worker may
//   name the path in a fetch, an XHR, a precache entry or an href.
//
//   IT MUST NOT COME BACK AS AN ENDPOINT. Standing a Function up at /api/votes
//   that returns record-shaped rows would make the site's formal record answer
//   at two addresses — a second record engine, which is the one thing this pass
//   is not allowed to build. The formal record is /api/voting-record, reached
//   only through PDXVotingRecord, and those URLs are pinned here byte-for-byte
//   so a "compatibility" refactor cannot quietly move them either.
//
// A COMMENT IS ALLOWED TO SAY THE PATH IS RETIRED. index.html, like-dislike.js
// and sw.js all explain the removal in prose, and that prose necessarily spells
// the path. So every probe below reads COMMENT-STRIPPED source, the same way
// scripts/test-person-file.mjs does, and a raw-source probe then confirms the
// surviving mentions really are all in comments.
//
// It also re-asserts the v179 guards this pass sits next to — the sitemap, the
// person-file address and the support route — because they are the neighbours
// most easily broken by a careless pass over index.html, and /p/null must not
// reopen.
//
//   node scripts/test-no-legacy-votes-api.mjs

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Comment-stripped source, and the anchoring is not cosmetic. Both comment
// patterns are matched ONLY at the start of a line:
//   · `//` because a mid-line "https://" is not a comment.
//   · `/*` because this codebase is full of route globs — "/api/voting-record/*",
//     "/api/threads/*" — and every one of them contains a `/*`. sw.js alone has
//     29 of those against 4 real closers, so an unanchored block-comment strip
//     swallows the entire precache manifest and every probe below it silently
//     passes against an empty string. A real block comment opens its own line.
// HTML comments are stripped outright; they cannot be confused with a path.
const CODE = (f) =>
  R(f)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "")
    .replace(/^\s*\/\/.*$/gm, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
// A stale harness must fail loudly rather than pass vacuously: if the file it
// reads no longer exists, or no longer contains the thing being fenced, the
// probe below would be asserting against nothing.
const must = (c, m) => { if (c) return; console.error(`✗ legacy votes api: STALE HARNESS — ${m}`); process.exit(2); };

const LEGACY = "/api/votes";

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The shipped client does not name the path in code
// ─────────────────────────────────────────────────────────────────────────────
section("1 · no shipped JS / HTML / SW calls the retired path");

// Every file the browser actually receives: the document, the service worker,
// and every root-level module. Not scripts/ (build + test tooling, never
// served) and not netlify/ (server side, checked separately in §2).
const SHIPPED = readdirSync(ROOT)
  .filter((f) => /\.(js|html)$/.test(f))
  .concat(["sw.js"])
  .filter((f, i, a) => a.indexOf(f) === i)
  .sort();

must(SHIPPED.includes("index.html"), "index.html is not in the shipped set — this probe is stale");
must(SHIPPED.includes("like-dislike.js"), "like-dislike.js is not in the shipped set — this probe is stale");
must(SHIPPED.includes("sw.js"), "sw.js is not in the shipped set — this probe is stale");
must(SHIPPED.length > 100, `only ${SHIPPED.length} shipped files found — this probe is stale`);

for (const f of SHIPPED) {
  const code = CODE(f);
  ok(!code.includes(LEGACY),
     `${f} names ${LEGACY} in code (not a comment) — the retired path is back`);
}

// The same check with the quoting the four dead emitters actually used, so a
// rebuilt call is caught even if it reaches the path by a different spelling.
for (const f of SHIPPED) {
  const code = CODE(f);
  ok(!/\bfetch\s*\(\s*['"`][^'"`]*\/api\/votes/.test(code),
     `${f} has a fetch() on ${LEGACY}`);
  ok(!/\bopen\s*\(\s*['"`](?:GET|POST|PUT|PATCH|DELETE)['"`]\s*,\s*['"`][^'"`]*\/api\/votes/i.test(code),
     `${f} has an XHR open() on ${LEGACY}`);
  ok(!/(?:href|src|action)\s*=\s*['"`]?[^'"` >]*\/api\/votes/.test(code),
     `${f} links or submits to ${LEGACY}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The service worker neither precaches nor falls back to it
// ─────────────────────────────────────────────────────────────────────────────
section("2 · the service worker does not carry the path");

const SW = R("sw.js");
const SW_CODE = CODE("sw.js");

must(/const\s+SHELL_ASSETS\s*=\s*\[/.test(SW_CODE), "sw.js no longer declares SHELL_ASSETS — this probe is stale");

// Read the precache manifest as data, not as a substring search: an entry could
// be added as '/api/votes' or as a bare 'api/votes' and both must be caught.
const shellList = SW_CODE.slice(SW_CODE.indexOf("const SHELL_ASSETS"));
const shellBody = shellList.slice(shellList.indexOf("["), shellList.indexOf("]") + 1);
const shellEntries = [...shellBody.matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
must(shellEntries.length > 50, `only ${shellEntries.length} precache entries parsed — this probe is stale`);
must(shellEntries.includes("/"), "the precache manifest no longer lists '/' — this probe is stale");
ok(!shellEntries.some((u) => /\/?api\/votes/.test(u)),
   "sw.js precaches the retired path");
ok(!shellEntries.some((u) => u.startsWith("/api/")),
   "sw.js precaches a dynamic /api/ endpoint — the manifest is for static shell assets only");

// No runtime rule, fallback, or cache key may reach for it either.
ok(!SW_CODE.includes(LEGACY), "sw.js names the retired path in code");
ok(!/api\/votes/.test(SW_CODE), "sw.js names the retired path in code (unslashed form)");

// The bump that evicts the stale emitters. index.html is precached as '/', and
// like-dislike.js is a runtime entry whose cache name carries CACHE_VERSION, so
// only a rename gets the old modules off a warm phone.
const ver = SW.match(/const\s+CACHE_VERSION\s*=\s*'(v\d+)'/);
must(ver, "sw.js no longer declares CACHE_VERSION — this probe is stale");
ok(Number(ver[1].slice(1)) >= 180,
   `CACHE_VERSION is ${ver[1]}; the /api/votes retirement needs >= v180, or a warm device keeps ` +
   `serving the v179 index.html and like-dislike.js that still call the path`);
has(SW, "v180 - /api/votes IS RETIRED",
    "sw.js has no v180 log entry naming the files the bump is for");
has(SW, "like-dislike.js", "the v180 bump note does not name like-dislike.js as a reason for the rename");

// ─────────────────────────────────────────────────────────────────────────────
// 3 · No Netlify Function is routed at /api/votes
// ─────────────────────────────────────────────────────────────────────────────
section("3 · no Function, edge function or redirect claims the path");

const FN_DIR = join(ROOT, "netlify/functions");
must(existsSync(FN_DIR), "netlify/functions is missing — this probe is stale");
const FNS = readdirSync(FN_DIR).filter((f) => /\.(m?[jt]s)$/.test(f));
must(FNS.length > 5, `only ${FNS.length} functions found — this probe is stale`);
must(FNS.includes("voting-record.mts"), "voting-record.mts is gone — this probe is stale");

for (const f of FNS) {
  const src = readFileSync(join(FN_DIR, f), "utf8");
  // Declared route paths only. A comment or a log string mentioning votes is
  // fine; a `path:` entry is the thing that makes the endpoint exist.
  const routes = [...src.matchAll(/\bpath\s*:\s*(\[[^\]]*\]|['"`][^'"`]*['"`])/g)]
    .flatMap((m) => [...m[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((q) => q[1]));
  ok(!routes.some((r) => /^\/api\/votes(\/\*)?$/.test(r)),
     `netlify/functions/${f} declares a route at ${LEGACY} — that is the second record engine this pass must not build`);
}

// No file named for the legacy endpoint should have appeared either.
ok(!FNS.some((f) => /^votes?\./.test(f)),
   "a netlify/functions/votes* file exists — nothing should have been created at that name");

const EDGE_DIR = join(ROOT, "netlify/edge-functions");
if (existsSync(EDGE_DIR)) {
  for (const f of readdirSync(EDGE_DIR).filter((x) => /\.(m?[jt]s)$/.test(x))) {
    const src = readFileSync(join(EDGE_DIR, f), "utf8");
    const routes = [...src.matchAll(/\bpath\s*:\s*(\[[^\]]*\]|['"`][^'"`]*['"`])/g)]
      .flatMap((m) => [...m[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((q) => q[1]));
    ok(!routes.some((r) => /^\/api\/votes(\/\*)?$/.test(r)),
       `netlify/edge-functions/${f} declares a route at ${LEGACY}`);
  }
}

// The edge answer. A rule here is OPTIONAL — Netlify's own 404 is already honest
// for a path that never existed — but if one is ever added it must be a 410 or a
// 301, never a 200 rewrite into the 2 MB app shell. That mistake has a name in
// this repo: /p/person-file.js.
const TOML = R("netlify.toml");
// Comment lines out first. netlify.toml in this repo is mostly prose — including
// the block that records WHY there is no rule here, which spells the very
// `from = "/api/votes"` line this parse is looking for. Reading the file raw
// makes that explanation indistinguishable from a live rule.
const TOML_CODE = TOML.replace(/^[ \t]*#.*$/gm, "");
const voteRules = [...TOML_CODE.matchAll(/\[\[redirects\]\][\s\S]*?(?=\n\[\[|\n\[[a-z]|$)/g)]
  .map((m) => m[0])
  .filter((b) => /from\s*=\s*"\/api\/votes/.test(b));
ok(voteRules.length <= 1, `netlify.toml has ${voteRules.length} rules for the retired path; at most one`);
for (const b of voteRules) {
  const st = b.match(/status\s*=\s*(\d+)/);
  ok(st && (st[1] === "410" || st[1] === "301"),
     `the ${LEGACY} rule in netlify.toml is status ${st ? st[1] : "unset"} — only 410 (Gone) or 301 is allowed`);
  ok(!/to\s*=\s*"\/(index\.html)?"/.test(b),
     `the ${LEGACY} rule rewrites into the app shell — a dead API path must not return 2 MB of HTML`);
}
// Whatever the decision was, it is written down where the next reader will look.
has(TOML, "/api/votes",
    "netlify.toml does not record the /api/votes decision — the next reader has no way to know it was deliberate");

// ─────────────────────────────────────────────────────────────────────────────
// 4 · The formal record still answers at exactly one address
// ─────────────────────────────────────────────────────────────────────────────
section("4 · PDXVotingRecord member / pack URLs unchanged");

const VR = R("voting-record.js");
const VR_CODE = CODE("voting-record.js");

has(VR_CODE, "var API_BASE = '/api/voting-record';",
    "voting-record.js no longer bases its reads on /api/voting-record");
has(VR_CODE, "API_BASE + '/member/' + encodeURIComponent(id) + qs",
    "the live member URL moved — /api/voting-record/member/<pid> is the one formal read");
has(VR_CODE, "API_BASE + '/member/' + encodeURIComponent(id) + '/pack'",
    "the offline pack URL moved — /api/voting-record/member/<pid>/pack is SW-cached under that exact key");
has(VR_CODE, "API_BASE + '/compare?members='",
    "the compare URL moved off /api/voting-record");
ok(typeof VR_CODE.match(/_query:\s*function/) === "object" && VR_CODE.includes("_query: function"),
   "PDXVotingRecord._query is gone — it is the helper a retargeted caller is supposed to reuse");
// The record function itself still owns the route.
const VR_FN = readFileSync(join(FN_DIR, "voting-record.mts"), "utf8");
has(VR_FN, '"/api/voting-record"', "netlify/functions/voting-record.mts no longer claims /api/voting-record");
ok(!VR_FN.includes(LEGACY), "voting-record.mts has grown a /api/votes alias — the record gets one address");

// And the like/dislike surface did NOT get retargeted at it. A like is an
// opinion about a person; a roll call is a fact about a vote. Pointing the
// popularity chips at the record API would be the same conflation the dead
// endpoint's name invited.
const LD_CODE = CODE("like-dislike.js");
must(LD_CODE.includes("function handleLike"), "like-dislike.js no longer defines handleLike — this probe is stale");
ok(!LD_CODE.includes("/api/voting-record"),
   "like-dislike.js now calls the formal record API — popularity counts must not read the roll-call record");
ok(!LD_CODE.includes("PDXVotingRecord"),
   "like-dislike.js now reaches into PDXVotingRecord — the like chips are not a record surface");
// Firestore is still the only store for a like, and the dead read fallback did
// not get replaced by an invented count.
has(LD_CODE, "db.collection('votes')",
    "like-dislike.js no longer writes the Firestore 'votes' collection — that is the only store a like has");
must(LD_CODE.includes("_startVotesListener"), "like-dislike.js no longer defines _startVotesListener — this probe is stale");

// ─────────────────────────────────────────────────────────────────────────────
// 5 · The surviving mentions really are comments
// ─────────────────────────────────────────────────────────────────────────────
section("5 · the path survives only as prose explaining its retirement");

// §1 passes if the string is absent OR only in comments. This distinguishes the
// two, so "we deleted the explanation" and "we deleted the call" don't look the
// same from the outside — the prose is the thing that stops the next pass from
// helpfully re-adding the endpoint.
for (const f of ["index.html", "like-dislike.js", "sw.js"]) {
  has(R(f), LEGACY, `${f} no longer explains that ${LEGACY} is retired — say so, or the next pass rebuilds it`);
}
has(R("like-dislike.js"), "169,076",
    "like-dislike.js no longer records what the dead fan-out cost — the number is why the fallback is a dead end now");

// ─────────────────────────────────────────────────────────────────────────────
// 6 · The v179 guards next door still hold
// ─────────────────────────────────────────────────────────────────────────────
section("6 · /p/null stays closed; the sitemap and support route are intact");

const PF_CODE = CODE("person-file.js");
has(PF_CODE, "realPid: realPid", "person-file.js no longer exports PDXPerson.realPid — the /p/null guard is gone");
has(PF_CODE, "PID_SENTINEL", "person-file.js no longer carries the null/undefined/nan sentinel test");
ok(/PID_SENTINEL\s*=\s*\/\^\(\?:null\|undefined\|nan\)\$\/i/.test(PF_CODE),
   "the pid sentinel pattern changed — null, undefined and nan must all still be refused");
has(PF_CODE, "scrubSentinelPath", "person-file.js no longer takes a sentinel address off the bar");

for (const f of ["share-links.js", "self-defection.js"]) {
  has(CODE(f), "realPid", `${f} stopped guarding its emitted /p/ URLs with realPid`);
}

const SITEMAP_GEN = CODE("scripts/gen-sitemap.mjs");
ok(/null\|undefined\|nan/.test(SITEMAP_GEN),
   "scripts/gen-sitemap.mjs no longer filters sentinel pids — /p/null could re-enter the sitemap");
const SITEMAP = R("sitemap.xml");
ok(!/\/p\/(?:null|undefined|nan)\b/i.test(SITEMAP), "sitemap.xml lists a sentinel person URL");
ok(!SITEMAP.includes(LEGACY), "sitemap.xml lists the retired API path");

const SUPPORT = CODE("support-route.js");
has(SUPPORT, "'support-politidex'", "support-route.js no longer owns the #support-politidex arrival");
const INDEX = R("index.html");
has(INDEX, 'id="support-politidex"', "the donate card lost its #support-politidex id");
ok((INDEX.match(/href="#support-politidex"/g) || []).length >= 3,
   "fewer than three surfaces now point at #support-politidex — the one-destination rule regressed");

console.log("");
if (failures.length) {
  console.error(`✗ legacy votes api: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ legacy votes api: /api/votes emits nothing, routes nowhere, and the record keeps one address — ${passed} assertions passed\n`);
