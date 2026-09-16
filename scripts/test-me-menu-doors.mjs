/* ═══════════════════════════════════════════════════════════════════════════
   test-me-menu-doors.mjs — the account chip lands on /me, both widths
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS REPORTED

   /me existed and painted the desk — typing the address worked — but the
   account-menu items still opened the old overlay: "Your File" via the
   #your-file hash plus data-pdxyf-open, "My Views" via a <button> calling
   PDXStances.openViews(). The address was real and the menu did not use it.

   WHAT CHANGED AFTER THAT FIX, and why this suite's counts inverted. Pointing
   both labels at the address left FOUR controls — two widths × two labels —
   all landing on the same room, one of them under a name ("My Views") that was
   never a destination of its own. So the panel was removed: the account chip
   IS the control now, one anchor to /me per width, with the reader's own name
   and "My Account" on it. The contract this file guards did not change — the
   reader can still reach their file from the nav, at both widths, by an address
   rather than an overlay — but "two doors per width" became "exactly one", and
   "My Views is present" became "My Views is not a second name for this room".

   WHY A SEPARATE SUITE, when test-your-file.mjs already counts /me hrefs. It
   counts them across the whole signed-in branch and checks a label appears
   SOMEWHERE in it. That cannot tell the two widths apart: delete the mobile
   row, add a second desktop row, and the totals are unchanged. "BOTH WIDTHS"
   needs the desktop and mobile markup measured as two separate documents,
   which is what §1 and §2 do here.

   THE FIVE FAILURE MODES THIS EXISTS TO CATCH

     1. A door reverts to href="#your-file", or to a <button> with an onclick
        that calls open() / openViews() / travelToMe() as the PRIMARY
        navigation. An overlay is not an address: it cannot be bookmarked,
        shared, or backed out of, and it paints whatever document the reader
        happened to be standing on.
     2. A door keeps data-pdxyf-open while gaining href="/me". That attribute
        is your-file.js's capturing open hook, so the row would fire the
        module's location.replace AND its own href — two navigations for one
        tap.
     3. A door becomes href="me" instead of href="/me". On / that still works;
        from /p/lee it resolves to /p/me and from /ballot to /me, so the bug
        ships looking fine on the homepage and broken on the person document.
        §4 resolves the emitted href against all three bases for this reason.
     4. A door stops being an <a>, or gains a handler that preventDefaults
        unconditionally — which silently kills middle-click and cmd-click into
        a new tab, the one affordance readers use to keep their place.
     5. One width drifts from the other, or the chip stops naming the room at
        all — an avatar with no label is not a door a reader can find.
     6. The dropdown comes back, or a second control in the nav is pointed at
        /me. Either way the reader is being offered the same room twice, which
        is the confusion this pass removed.

   WHAT THIS SUITE DELIBERATELY DOES NOT ASSERT. It does not touch the desk's
   layout, the eight-issue editor's internals, the ballot snapshot, stars,
   saved evidence, or any figure — those are other suites' contracts, and the
   brief for this pass was the menu doors only.

     node scripts/test-me-menu-doors.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
// A STALE HARNESS IS NOT A PASS. If a probe stops matching the file it is
// pinned to, this suite must die loudly rather than report zero failures over
// markup it never found.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ me-menu-doors: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log('   ── ' + t);

// Comments explain what was REMOVED, so they legitimately name the hooks this
// suite bans. A ban has to be read against code, not prose — and for the HTML
// shells that means <!-- --> as well as the JS forms. me.html's own doctrine
// comment quotes the exact hazard `src="me-desk.js"` it exists to forbid, and
// index.html's note names data-pdxyf-open twice while shipping neither; a
// stripper that missed HTML comments would read both as live controls.
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
const stripHtml = (s) => stripJs(s.replace(/<!--[\s\S]*?-->/g, ''));
const strip = stripJs;

const HUB = read('compare-hub.js');
const HTML = read('index.html');
const YF = read('your-file.js');
const SW = read('sw.js');

/* Brace-balanced body of updateNavAuth, so the probes below can never drift
   into a neighbouring function that also prints anchors. */
function bodyOf(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return '';
  let depth = 0, j = src.indexOf('{', i);
  if (j < 0) return '';
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) return src.slice(i, j + 1); }
  }
  return '';
}

const NAV = bodyOf(HUB, 'function updateNavAuth');
must(NAV.length > 2000, 'updateNavAuth body probe matched nothing in compare-hub.js');

/* The signed-in branch of each width is the FIRST innerHTML assignment and the
   signed-out "JOIN THE PEOPLE" button is the LAST. Both are captured so §3 can
   prove the signed-out nav advertises no file at all.

   THERE ARE FOUR WRITES PER WIDTH, NOT TWO, and the two in the middle are
   neither state this file measures: the auth-restore pass gave the chrome a
   third state for "Firebase has not answered yet" — the reader's last-known
   chip, disabled, or a "Checking account…" pill when this device has never seen
   an account. Neither one carries a door (that is the point of them), so they
   are deliberately skipped rather than asserted over: a door in an unknown
   state is asserted absent in scripts/test-auth-restore.mjs instead. */
const dBlocks = NAV.match(/desktop\.innerHTML = `[\s\S]*?`;/g) || [];
const mBlocks = NAV.match(/mobile\.innerHTML = `[\s\S]*?`;/g) || [];
must(dBlocks.length === 4, `expected 4 desktop innerHTML writes, found ${dBlocks.length}`);
must(mBlocks.length === 4, `expected 4 mobile innerHTML writes, found ${mBlocks.length}`);

const WIDTHS = [
  { name: 'desktop chip', inMarkup: dBlocks[0], outMarkup: dBlocks[dBlocks.length - 1], signOut: false },
  { name: 'mobile drawer', inMarkup: mBlocks[0], outMarkup: mBlocks[mBlocks.length - 1], signOut: true },
];

/* Every anchor in a block, as { href, onclick, text }. */
function anchors(block) {
  const out = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(block))) {
    const attrs = m[1];
    const href = (attrs.match(/href="([^"]*)"/) || [, null])[1];
    const onclick = (attrs.match(/onclick="([^"]*)"/) || [, ''])[1];
    out.push({ attrs, href, onclick, text: m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() });
  }
  return out;
}

console.log('\n   test-me-menu-doors — the menu uses the address\n');

/* ── 1 · 2 · each width, measured on its own ───────────────────────────── */
section('1 · one door, both widths, one address');

const DOORS = [];

// THE BRIEF ALLOWED TWO SPELLINGS — /me or /me?tab=positions — but demanded one
// of them be used everywhere. So a door is recognised by where it LANDS (its
// resolved pathname), not by a literal, and the "pick one" rule is enforced
// once, below, over the whole menu. Filtering on the literal '/me' here would
// have made that rule a tautology: a door that drifted to the other spelling
// would silently drop out of the set the rule is computed from.
const LANDS_ON_ME = (href) => {
  try { return new URL(href, 'https://www.politidex.fyi/').pathname === '/me'; }
  catch (e) { return false; }
};

for (const w of WIDTHS) {
  const a = anchors(w.inMarkup);
  const me = a.filter((x) => LANDS_ON_ME(x.href));
  // EXACTLY ONE. Zero strands the file behind no nav control; two is the menu
  // this pass removed, whatever the second one is labelled.
  eq(me.length, 1, `the ${w.name} does not carry exactly one door onto /me`);
  if (me[0]) DOORS.push({ width: w.name, ...me[0] });

  // THE DOOR HAS TO SAY WHERE IT GOES. An avatar alone is a picture; the chip
  // names the room in words at both widths, which is what makes it findable by
  // a reader who has never hovered it.
  ok(/My Account/i.test(w.inMarkup),
    `the ${w.name} no longer names the room — an avatar with no label is not a door readers can find`);

  // MY VIEWS IS NOT A DESTINATION. It was a second name for this same room, and
  // a menu offering one room under two names teaches the reader there are two.
  ok(!/My Views/i.test(w.inMarkup),
    `the ${w.name} carries a "My Views" label again — it is not a separate destination`);
  // AND THERE IS NO PANEL BEHIND THE CHIP. The dropdown was a group/group-hover
  // wrapper in this markup; if it returns, the counts above go back to two.
  ok(!/group-hover/.test(w.inMarkup),
    `the ${w.name} has a hover panel again, which is the four-doors-one-room menu returning`);

  // The hook, the hash and the overlay call are all gone from the ROW markup.
  ok(!/data-pdxyf-open/.test(w.inMarkup),
    `the ${w.name} still carries data-pdxyf-open — that row would navigate twice for one tap`);
  ok(!/href="#your-file"/.test(w.inMarkup),
    `the ${w.name} still points a door at the #your-file hash instead of the address`);
  ok(!/openViews/.test(w.inMarkup),
    `the ${w.name} still calls PDXStances.openViews() — My Views is an address now`);
  ok(!/travelToMe/.test(w.inMarkup),
    `the ${w.name} calls travelToMe() from markup; the href IS the navigation`);
  // LOG OUT MOVED TO /me, AND ONE OVERFLOW KEPT IT. The desktop chip has no
  // panel to hold a second control, so sign-out lives on the desk itself —
  // region a, beside the reader's name. The mobile sheet is an existing
  // overflow, not the chip, so its Logout row stays: a reader who signed in on
  // a phone has to be able to sign out on one without loading another document.
  if (w.signOut) {
    ok(/auth\.signOut/.test(w.inMarkup),
      `the ${w.name} lost Log Out — that sheet is the one overflow permitted to keep it`);
  } else {
    ok(!/signOut/.test(w.inMarkup),
      `the ${w.name} carries a sign-out control again, which means it is a menu again rather than one link`);
  }

  // §3 · the signed-out reader is offered no file.
  ok(!/href="\/me[?"]/.test(w.outMarkup),
    `the signed-out ${w.name} advertises the reader's file`);
  ok(!/#your-file/.test(w.outMarkup),
    `the signed-out ${w.name} advertises Your file`);
}

/* ── 2 · the doors are real links, so the browser's own gestures work ──── */
section('2 · anchors, not handlers — middle-click and cmd-click survive');

eq(DOORS.length, 2, 'the file is not reachable from the nav at both widths');
for (const d of DOORS) {
  // An <a href> IS the navigation. Anything that navigates from the handler
  // instead is what breaks cmd-click, JS-off, and the Back entry.
  ok(!/\bopen\s*\(|openViews|travelToMe|location\.(assign|replace|href)/.test(d.onclick),
    `the ${d.width} door navigates from onclick rather than its href`);
  ok(!/preventDefault|return\s+false/.test(d.onclick),
    `the ${d.width} door cancels its own default — cmd-click would not open a tab`);
  // The mobile row legitimately closes the drawer behind it; that is the only
  // thing its handler may do.
  if (d.onclick) {
    ok(/mobileMenu/.test(d.onclick),
      `the ${d.width} door has an onclick that does something other than close the drawer: ${d.onclick}`);
  }
}

/* your-file.js's capturing hook is the only global click path that can cancel
   one of these taps, and it is doubly safe: it requires the attribute (which
   no shipped row now has) and it bails on every modifier and non-primary
   button before it would ever preventDefault. */
const WIRE = bodyOf(YF, 'function wire');
must(WIRE.length > 200, 'your-file.js wire() probe matched nothing');
ok(/closest\(\s*'\[data-pdxyf-open\]'\s*\)/.test(WIRE),
  'the global open hook no longer requires data-pdxyf-open — it could now swallow unrelated clicks');
ok(/ev\.button\s*>\s*0/.test(WIRE) && /metaKey/.test(WIRE) && /ctrlKey/.test(WIRE)
  && /shiftKey/.test(WIRE) && /altKey/.test(WIRE),
  'the global open hook stopped bailing on modifier keys and middle-click');

/* ── 3 · the click contract, resolved from every document that paints it ─ */
section('3 · the assign lands on /me from /, /p/lee and /ballot');

// This is failure mode 3. A root-absolute href resolves to the same document
// from every address; a bare "me" does not, and the difference is invisible on
// the homepage — which is where it would be eyeballed.
const BASES = [
  ['/', 'https://www.politidex.fyi/'],
  ['/p/lee', 'https://www.politidex.fyi/p/lee'],
  ['/ballot', 'https://www.politidex.fyi/ballot'],
];

for (const d of DOORS) {
  ok(d.href.startsWith('/'),
    `the ${d.width} door href is not root-absolute (${d.href}) — it would resolve per-document`);
  for (const [where, base] of BASES) {
    const landed = new URL(d.href, base);
    eq(landed.pathname, '/me',
      `from ${where}, the ${d.width} door lands on ${landed.pathname}`);
    eq(landed.origin, 'https://www.politidex.fyi',
      `from ${where}, the ${d.width} door leaves the origin`);
  }
}

/* One address, used everywhere. The brief allowed /me or /me?tab=positions —
   either, but not one of each, because the two widths are the same door. */
const TARGETS = new Set(DOORS.map((d) => d.href));
eq(TARGETS.size, 1,
  `the menu uses more than one spelling of the address — pick one and use it everywhere: ${[...TARGETS].sort().join(' , ')}`);
ok(['/me', '/me?tab=positions'].includes([...TARGETS][0]),
  `the menu's single spelling is not one the brief allows: ${[...TARGETS][0]}`);

/* ── 4 · no leftover overlay doors anywhere a reader can tap ───────────── */
section('4 · the old mechanisms are gone from shipped controls');

// Read against code, not comments: the notes in these files NAME the hook they
// removed, and a comment is not a control.
for (const [name, src, clean] of [['index.html', HTML, stripHtml], ['compare-hub.js', HUB, stripJs],
  ['who-represents-me.js', read('who-represents-me.js'), stripJs]]) {
  eq((clean(src).match(/data-pdxyf-open/g) || []).length, 0,
    `${name} still ships a data-pdxyf-open control`);
}
// my-stances.js may still DEFINE openViews (other callers of the collection
// exist); what must not exist is a menu row invoking it.
eq((strip(HUB).match(/openViews/g) || []).length, 0,
  'compare-hub.js still calls openViews from the nav');

// Requirement 4 of the brief: clicking the menu must not remount the
// eight-issue overlay on /. The only hook that can do that is the attribute,
// and it is absent above — so the tap is a navigation and nothing else.
ok(!/data-pdxyf-open/.test(strip(NAV)),
  'updateNavAuth can still remount the eight-issue overlay on the homepage');

/* ── 5 · /me itself still paints ────────────────────────────────────────── */
section('5 · the desk the doors lead to is still a document');

const ME = read('me.html');
ok(/__PDX_ME_DOC/.test(ME), 'me.html no longer declares the per-document flag');
ok(/src="\/me-desk\.js"/.test(ME), 'me.html no longer loads /me-desk.js root-absolutely');
// A relative src on this shell is the blank-desk bug: /me/ rewrites to the same
// file, so "me-desk.js" would be answered with the HTML document.
const srcs = [...stripHtml(ME).matchAll(/\ssrc="([^"]+)"/g)].map((m) => m[1]);
const relative = srcs.filter((s) => !/^(https?:)?\/\//.test(s) && !s.startsWith('/') && !s.startsWith('data:'));
eq(relative.length, 0, `me.html has relative script src(s): ${relative.join(' , ')}`);
ok(fs.existsSync(path.join(ROOT, 'me-desk.js')), 'me-desk.js is missing — the doors lead to a blank desk');

/* ── 6 · the bump rule ──────────────────────────────────────────────────── */
section('6 · CACHE_VERSION moves only for a precached menu painter');

const shellList = (SW.match(/const SHELL_ASSETS = \[([\s\S]*?)\n\];/) || [, ''])[1];
must(shellList.length > 500, 'SHELL_ASSETS probe matched nothing in sw.js');
ok(/'\/me\.html'/.test(shellList), '/me.html is not precached — the desk would not boot offline');
// The menu painter is a stale-while-revalidate RUNTIME entry, not a precached
// one. That is why this pass requires no bump: no precached file that paints
// the menu changed. It is ALSO why a warm device can serve yesterday's menu for
// one more visit — recorded here so the next reader of this suite knows the
// bump rule and the staleness window are the same fact seen from two sides.
ok(!/'\/compare-hub\.js'/.test(shellList),
  'compare-hub.js is now precached — adding a 741 KB file to the install payload needs its own argument');

/* ── report ─────────────────────────────────────────────────────────────── */
if (failures.length) {
  console.error(`\n✗ me-menu-doors: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error('  · ' + f);
  console.error('');
  process.exit(1);
}
console.log(`\n✓ me-menu-doors: the menu uses the address — ${passed} assertions passed\n`);
