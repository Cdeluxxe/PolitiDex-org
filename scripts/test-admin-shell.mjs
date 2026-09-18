#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-admin-shell.mjs — /admin is the only room the curator's tools stand in
// ─────────────────────────────────────────────────────────────────────────────
// The Bulk Import / Database Expansion tool and the Politician Manager were 650
// lines of markup on index.html for their whole life. A previous pass gated them
// three ways — an inert <template>, a positive html.pdx-admin CSS lock in the
// head, and a gate that cloned the template only for one hardcoded email — and
// all three locks worked. They were still three locks on a room built in the
// lobby: the markup shipped to every reader of the front page, and every
// mechanism that could go wrong (a stylesheet that 404s, a service worker
// holding a stale shell, an extension that walks <template> content, a hand edit
// that clears one inline style) was a way for an anonymous voter to end up
// looking at DATABASE EXPANSION.
//
// So the room moved. admin.html, served at /admin by an exact rewrite pair with
// no splat, carries the markup verbatim and the same three locks. index.html
// carries none of it — not the sections, not the template, not the allow-list,
// not the gate, not the four gated nav rows, not the head lock. That absence is
// scripts/test-home-hygiene.mjs's section 2. THIS file is the other end: that the
// room exists, that it is addressed correctly, that its locks are all three
// present, and that the gate still does the right thing for every session state
// — which is the behavioural simulation that used to live in that other suite,
// run against the document that now owns the code.
//
// What must stay true:
//
//   1. THE ADDRESS. netlify.toml declares /admin and /admin/ as 200 rewrites onto
//      /admin.html, and NO splat under the prefix — a /admin/* rule would answer
//      /admin/expansion-controller.js with this HTML and hand it to the browser
//      as JavaScript.
//   2. ROOT-ABSOLUTE, WITHOUT EXCEPTION. Every same-origin path in admin.html,
//      including the two the gate injects at runtime, begins with a slash.
//   3. NOT PUBLISHED. noindex in the document's own head, an X-Robots-Tag at the
//      edge, absent from the sitemap and from robots.txt, and absent from
//      sw.js's SHELL_ASSETS — no reader's phone should precache the curator's
//      door. Nothing on the site links to it.
//   4. THREE LOCKS, EACH FAILING CLOSED ALONE. The head CSS lock, the <template>
//      wrapper, and the allowed branch of the gate.
//   5. THE GATE, RUN. Six session states in the order a real session produces
//      them, including a lookalike address and a sign-out.
//   6. ONE OWNER OF THE ALLOW-LIST. ADMIN_EMAILS appears on this document and on
//      no other.
//
//   node scripts/test-admin-shell.mjs

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ admin shell: STALE HARNESS — ${m}`); process.exit(2); };

must(existsSync(join(ROOT, "admin.html")), "admin.html does not exist");
const DOC = R("admin.html");
const MARKUP = DOC.replace(/<!--[\s\S]*?-->/g, "");
const TOML = R("netlify.toml");
const SW = R("sw.js");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the address: an exact pair, no splat");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Parse the redirect table rather than grepping for strings, so a rule that
  // exists with the wrong status or the wrong target is a failure rather than a
  // pass. Same shape scripts/test-locker-door.mjs uses on this file.
  const RULES = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
    const body = m[1];
    const get = (k) => (body.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m")) || [])[1];
    return { from: get("from"), to: get("to"), status: get("status") };
  });
  must(RULES.length > 20, `the redirect table parsed (${RULES.length} rules)`);

  for (const path of ["/admin", "/admin/"]) {
    const r = RULES.filter((x) => x.from === path);
    eq(r.length, 1, `netlify.toml declares ${path} exactly once`);
    if (r.length === 1) {
      eq(r[0].to, "/admin.html", `${path} is served by the curator's document`);
      eq(r[0].status, "200", `${path} is a rewrite, not a redirect — a hop would publish a second address`);
    }
  }

  // NO SPLAT UNDER THE PREFIX. This is the assertion that keeps the gate's two
  // injected controllers fetchable: with a /admin/* rule, a request for
  // /admin/anything.js is answered with 90 KB of HTML and a 200, and the tool
  // fails with no error that names the cause.
  const splats = RULES.filter((x) => x.from && /^\/admin(\/\*|\*)/.test(x.from)).map((x) => x.from);
  eq(splats.join(","), "", "a splat under /admin would answer a JavaScript request with this HTML");

  // AND NOTHING EARLIER MAY SWALLOW IT. The invariant netlify.toml states in
  // prose: there is no catch-all in that file, and the day one appears these two
  // must precede it.
  const adminAt = RULES.findIndex((x) => x.from === "/admin");
  must(adminAt >= 0, "the /admin rule vanished between two assertions");
  const earlier = RULES.slice(0, adminAt).filter((x) => x.from === "/*" || x.from === "/**");
  eq(earlier.join(","), "", "a catch-all is declared before /admin and would eat it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every same-origin path is root-absolute");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The static ones, out of the markup.
  const rel = [];
  for (const m of MARKUP.matchAll(/\b(?:src|href|action)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(?:https?:)?\/\/|^\/|^#|^data:|^mailto:|^javascript:/.test(u)) continue;
    rel.push(u);
  }
  eq(rel.join(","), "", "admin.html carries a relative same-origin path — at /admin/ it resolves one level down and 404s");

  // …and the dynamic ones. The gate builds two script srcs at runtime; a bare
  // name there is the same defect with no tag to grep for.
  const mods = (DOC.match(/var ADMIN_MODULES = \[([^\]]*)\]/) || [])[1];
  must(mods, "the gate no longer declares ADMIN_MODULES — the injection list moved or was renamed");
  const paths = [...mods.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  eq(paths.join(","), "/admin-politician-manager.js,/expansion-controller.js",
    "the gate's injected modules are not the two root-absolute controller paths, in order");

  // The two sheets and the boot chain, by address, because a copy of any of them
  // under another name is a second owner of the same rules.
  for (const p of ["/css/tailwind.css", "/shell-chrome.css", "/data-hygiene.js",
                   "/firebase-config.js", "/firebase-boot.js", "/shell-account-chip.js",
                   "/manifest.json"]) {
    has(DOC, `"${p}"`, `admin.html does not link ${p}`);
  }
  // NO app.css. 987 KB for three selectors, which the document declares itself.
  ok(!/href="\/app\.css"/.test(DOC), "admin.html loads app.css — 987 KB for three rules it declares locally");
  for (const cls of [".animate-on-scroll", ".badge-live", ".btn-glow"]) {
    has(DOC, cls, `admin.html does not declare ${cls} locally, and it is not in /css/tailwind.css either`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the room is not published");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(DOC, '<meta name="robots" content="noindex, nofollow" />',
    "admin.html does not say noindex in its own head");
  // A canonical would publish the address, which is the opposite of the point.
  ok(!/rel="canonical"/.test(DOC), "admin.html declares a canonical — a canonical publishes an address");
  ok(!/property="og:/.test(DOC), "admin.html carries og:* tags — nothing here is shareable");

  // The edge says it too, on both live spellings, for a fetcher that reads
  // headers and skips the body.
  const HEADERS = [...TOML.matchAll(/^\[\[headers\]\]\s*\n((?:^[ \t]+\S.*\n)+)/gm)].map((m) => m[1]);
  for (const path of ["/admin", "/admin/"]) {
    const block = HEADERS.find((b) => new RegExp(`for\\s*=\\s*"${path.replace("/", "\\/")}"`).test(b));
    ok(block && /X-Robots-Tag\s*=\s*"noindex, nofollow"/.test(block),
      `netlify.toml sends no noindex X-Robots-Tag for ${path}`);
  }

  // Not in the crawl entry points. Both are generated by scripts/gen-sitemap.mjs
  // and neither generator names the path, so this is a regression pin rather
  // than a hand-maintained claim.
  // Anchored to the address, not the substring: /issue/administrative-state-...
  // is a legitimate teaching page and contains the same five characters.
  ok(!/<loc>[^<]*\/admin\/?<\/loc>/.test(R("sitemap.xml")), "the sitemap lists /admin");
  ok(!/^(?:Allow|Disallow):.*\/admin/m.test(R("robots.txt")), "robots.txt names /admin, which is an advertisement");

  // NOT PRECACHED. Every other shell is in SHELL_ASSETS on purpose; this one is
  // out of it on purpose, and the difference is the whole argument.
  ok(!SW.includes("'/admin.html'"), "admin.html is in SHELL_ASSETS — every reader's phone would precache the curator's door");
  ok(!SW.includes("'/admin'"), "sw.js precaches the /admin navigation");

  // AND NOTHING LINKS TO IT. Not the nav, not the drawer, not the footer, not
  // another shell. The curator types the address; that is the entry system.
  const SHELLS = readdirSync(ROOT).filter((f) => f.endsWith(".html") && f !== "admin.html");
  for (const f of SHELLS) {
    const src = R(f).replace(/<!--[\s\S]*?-->/g, "");
    ok(!/href="\/admin\/?"/.test(src), `${f} links to /admin — the curator's room is advertised`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · three locks, each failing closed alone");
// ═════════════════════════════════════════════════════════════════════════════
const TPL_OPEN = '<template id="pdx-admin-tools">';
{
  // LOCK 1 — the head CSS lock, and the one that holds at first paint. POSITIVE
  // rule: the absence of the class hides, rather than the presence of one
  // revealing, so a gate that never runs still hides.
  const headEnd = DOC.indexOf("</head>");
  const cssAt = DOC.indexOf('<style id="pdx-admin-gate-css">');
  must(cssAt > 0, "the head CSS lock (#pdx-admin-gate-css) is gone");
  ok(cssAt < headEnd, "the CSS lock is not in <head> — a rule that arrives after first paint is a flash of curator chrome");
  const css = DOC.slice(cssAt, DOC.indexOf("</style>", cssAt));
  for (const sel of ["html:not(.pdx-admin) #database-expansion",
                     "html:not(.pdx-admin) #politician-manager"]) {
    has(css, sel, "the CSS lock does not cover it");
  }
  has(css, "!important", "the CSS lock does not outrank an inline style, so clearing one reveals the tools");

  // LOCK 2 — the <template>. Parsed outside the document tree: not rendered, not
  // announced, not findable by find-in-page, unreachable by getElementById.
  // Measured on MARKUP, not DOC: the head note and index.html's strip comment
  // both write the opening tag in prose, and a document whose real template had
  // become a live <div> would otherwise match the prose copy and report the
  // wrong defect.
  const tplOpen = MARKUP.indexOf(TPL_OPEN);
  must(tplOpen >= 0, 'admin.html no longer wraps the tools in <template id="pdx-admin-tools">');
  const tplClose = MARKUP.indexOf("</template>", tplOpen);
  must(tplClose > tplOpen, "the admin template is never closed");
  for (const id of ["database-expansion", "politician-manager"]) {
    const at = MARKUP.indexOf(`<section id="${id}"`);
    must(at > 0, `<section id="${id}"> was renamed — this suite no longer knows what it is guarding`);
    ok(at > tplOpen && at < tplClose,
      `#${id} is NOT inside the template — it is in the document for anyone who types the address`);
    // The parser's own inline style, on the copy that gets cloned.
    const tag = MARKUP.slice(at, MARKUP.indexOf(">", at));
    ok(/style="[^"]*display:\s*none/.test(tag), `#${id} lost its inline display:none`);
  }
  // Exactly one template on this document, closed exactly once: a second copy
  // of the workspace is the duplicate-surface defect in a new room.
  const tplIds = [...MARKUP.matchAll(/<template\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]);
  eq(tplIds.join(","), "pdx-admin-tools", "admin.html carries a template no door has justified");
  eq((MARKUP.match(/<\/template>/g) || []).length, 1, "admin.html's template is not closed exactly once");

  // THE DOOR CARD, and the rule that takes it away for the curator. Everyone who
  // is not on the allow-list gets an explanation and a way home rather than a
  // blank document that reads as a broken deploy.
  has(MARKUP, 'id="pdx-curator-door"', "there is no door card — a non-admin gets a blank page");
  has(DOC, "html.pdx-admin #pdx-curator-door { display: none; }",
    "the door card is not hidden for the admin, who would scroll past a description of the room they are in");
  ok(/id="pdx-curator-door"[\s\S]{0,900}href="\/"/.test(MARKUP),
    "the door card offers no way to the front page");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the gate, run, across every session state");
// ═════════════════════════════════════════════════════════════════════════════
// Static shape is not the assertion that matters here; what matters is what the
// gate DOES, in the order a real session produces it: first paint with no user,
// an anonymous session, a signed-in non-admin, a lookalike address, the admin in
// both letter cases Firebase can hand back, and then the admin signing out.
{
  const at = DOC.indexOf("var ADMIN_EMAILS");
  must(at > 0, "admin.html no longer declares ADMIN_EMAILS — the gate moved or was renamed");
  const open = DOC.lastIndexOf("<script>", at);
  const code = DOC.slice(open + "<script>".length, DOC.indexOf("</script>", at));

  const run = () => {
    const state = { mounted: 0, unmounted: [], cls: new Set(), injected: [], sections: {} };
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
      querySelectorAll: () => [],
      createElement: () => ({}),
      addEventListener() {}, removeEventListener() {},
    };
    const auth = { currentUser: null, onAuthStateChanged(cb) { state.fire = cb; } };
    const sandbox = { window: {}, document, auth, console: { warn() {}, log() {}, error() {} }, setTimeout, clearTimeout };
    sandbox.window.document = document;
    new vm.Script(code, { filename: "admin.html#admin-gate" }).runInNewContext(sandbox);
    must(typeof state.fire === "function", "the gate never registered an auth listener, so this simulation proves nothing");
    return state;
  };

  const s = run();
  // First paint, no user at all. THE ADDRESS IS PUBLIC EVEN THOUGH THE ROOM IS
  // NOT: anyone may type /admin, and this is what they get.
  ok(s.mounted === 0, "first paint with no user MOUNTED the admin tools");
  ok(!s.cls.has("pdx-admin"), "first paint with no user put .pdx-admin on <html>");
  ok(s.injected.length === 0, "first paint with no user fetched the 451 KB admin pair");

  for (const [user, who] of [[{ isAnonymous: true, email: null }, "an anonymous session"],
                             [{ isAnonymous: false, email: "voter@example.com" }, "a signed-in non-admin"],
                             [{ isAnonymous: false, email: "CDELUXXE@GMAIL.COM.evil.test" }, "a lookalike address"],
                             [{ isAnonymous: false, email: "" }, "an empty email"],
                             [{ isAnonymous: false }, "a user object with no email at all"]]) {
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
section("6 · one owner of the allow-list, and the markup arrived intact");
// ═════════════════════════════════════════════════════════════════════════════
{
  const DOCS = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  const owners = DOCS.filter((f) => R(f).includes("ADMIN_EMAILS"));
  eq(owners.join(","), "admin.html", "the admin allow-list is declared on more than one document, or on the wrong one");

  // THE MOVE WAS A MOVE. The tool markup is what it was; a relocation that
  // rewrote the tool on the way is a redesign nobody reviewed. Spot-pinned on
  // the labels the brief named plus the two section shells, which is enough to
  // fail on a truncated paste.
  for (const marker of ["Bulk Import Mode", "AI-Assisted Database Expansion",
                        "Ready for Discovery Scan", 'id="database-expansion"',
                        'id="politician-manager"']) {
    has(DOC, marker, "admin.html is missing a piece of the relocated tool");
  }
  // The two controllers still exist to be injected. test-admin-not-on-critical-path
  // owns whether they parse; this is only that the paths are not dangling.
  for (const f of ["admin-politician-manager.js", "expansion-controller.js"]) {
    ok(existsSync(join(ROOT, f)), `${f} does not exist — the gate injects a 404`);
  }

  // The version had to move: index.html is precached, and a warm device holding
  // the old shell keeps serving the front page that still carries the tools.
  const v = (SW.match(/const CACHE_VERSION = '(v\d+)';/) || [])[1];
  must(v, "sw.js has no CACHE_VERSION");
  ok(Number(v.slice(1)) >= 216, `CACHE_VERSION is ${v} — the front page changed and the shell was not re-issued`);
  const entry = SW.slice(SW.indexOf(`// ${v} - `), SW.indexOf("const CACHE_VERSION"));
  has(entry, "curator", `the ${v} entry does not say the curator's tools left the front page`);
  has(entry, "/admin", `the ${v} entry does not name the address they moved to`);
}

console.log("");
if (failures.length) {
  console.error(`✗ admin shell: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ admin shell: one room, one address, one allow-list, three locks — ${passed} assertions passed\n`);
