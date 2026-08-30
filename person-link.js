/* ═══════════════════════════════════════════════════════════════════════════
   person-link.js — ONE builder for the one person address, on every surface
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS BROKEN. Phase A/B gave the politician profile a real address
   (/p/<pid>) and made that address serve a document of its own. What it did not
   do was put the address on any of the surfaces that NAME a politician. Every
   card, row and cell that opened a person file opened it the same wrong way — a
   <div role="button">, a <button data-id>, an onclick — and not one of them is a
   link. Three consequences, all the same bug seen from different chairs:

     · A CRAWLER CANNOT WALK IN. No href to follow, so the only way Googlebot
       hears about /p/lee is the sitemap. The homepage names Mike Lee, the person
       file exists, and nothing in the markup connects the two.
     · MIDDLE-CLICK AND "OPEN IN NEW TAB" DO NOTHING. Both are browser features
       of <a href>, and none of those shapes is one. A reader who wants to keep
       the list open and read one file has no way to say so.
     · THERE IS NO ADDRESS IN VIEW-SOURCE. The URL exists only inside a click
       handler, so with JavaScript off — or before it runs — the page holds no
       statement of where the record lives.

   WHAT THIS FILE IS. The one place that turns a roster id into a link, and the
   one place that decides whether a click on that link belongs to the app or to
   the browser: pid(), href(), attrs(), anchor(), isBrowserNav(), open().

   It builds links and decides nothing else. No floor is read here, no record is
   looked up beyond the alias hop, no label is composed, nothing is ranked, and
   party is neither read nor printed. Whether a file is worth advertising as a
   citable address is PDXPublicationFloor's question, asked in person-file.js's
   kicker. A link is navigation, not a claim.

   THE CANONICAL PID, AND WHY IT IS NOT THE ROW'S OWN ID. A handful of roster ids
   are RETIRED: `scott_chew` is the display slug of the record filed under
   `chew_h68`, and the repo has already ruled they are one officeholder, not two
   (PDX_PROFILE_ALIAS, person-file's canonId, the /p/ arrival path,
   test-chew-identity.mjs). Those rulings fire on ARRIVAL, which is why clicking
   such a row always landed on the right person. An href is different: it is the
   address we ADVERTISE. Printing href="/p/scott_chew" would publish a second
   address for one seat and invite a crawler to index both — the one-person-two-
   files defect the arrival path was fixed to prevent, reintroduced from the
   other end. So every href goes through PDXProfilePid first, the same table
   person-file.js and the edge already read. One Chew, at /p/chew_h68.

   FAIL OPEN, NEVER FAIL WRONG. PDXProfilePid hops only when the target has a
   record of its own, and an id nobody has ruled on passes through untouched. If
   the table has not loaded yet the raw id is used, which is what every other
   consumer does — a link to the id the row already opens is right in every case
   but the retired handful, and those are in the table before any surface that
   can name them renders.

   CLICK: THE APP KEEPS THE PLAIN ONE, THE BROWSER KEEPS THE REST. One delegated
   listener, at the document, in the bubble phase — so it runs after each
   surface's own handler and can read what that handler did.

     · A MODIFIED CLICK IS THE BROWSER'S. ⌘/Ctrl/Shift/Alt, or any button but
       the primary one, means the reader asked for a new tab. Untouched, which is
       the whole point of having an href.
     · A CLICK A SURFACE ALREADY TOOK IS LEFT ALONE. defaultPrevented means some
       handler has opened the file already; doing it again opens it twice.
     · ANYTHING ELSE OPENS IN APP. preventDefault, then PDXPerson.open.
     · AND IF THE APP CANNOT OPEN IT, THE LINK IS LEFT TO WORK. preventDefault
       runs only after a successful open, so a missing module degrades to a real
       navigation to /p/<pid> rather than to a dead click — the one behaviour a
       click handler on a <div> could never offer.

   NO javascript:void(0), NO href="#". Both are the same lie: an address-shaped
   attribute that is not an address. The href in the markup is where the reader
   lands if every script on the page fails.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXPersonLink) return;

  // The path form person-file.js owns, spelled the same way. PREFIX is not
  // configurable on purpose: two spellings of the person address is how the app
  // ends up advertising one it does not serve.
  var PREFIX = '/p/';
  // The id shape the whole app pins — PDXPublicationFloor.PID_RE, person-file's
  // PATH_RE and the edge's PERSON_PATH all say the same thing. Anything outside
  // it is not a pid, and gets no link rather than an escaped guess at one.
  var PID_RE = /^[A-Za-z0-9_]+$/;

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  // ── The one id this file will advertise for `raw` ─────────────────────────
  // See the header: the alias hop runs FIRST and it runs through the app's own
  // table, so a retired id is never the published address. Returns '' for
  // anything that is not pid-shaped, which is a caller's cue to print a plain
  // label instead of a link.
  function pid(raw) {
    if (!raw) return '';
    var id = String(raw);
    try {
      if (typeof window.PDXProfilePid === 'function') {
        var a = window.PDXProfilePid(id);
        if (a) { a = String(a); if (a && a !== id) id = a; }
      }
    } catch (e) {}
    return PID_RE.test(id) ? id : '';
  }

  // Root-anchored, for the reason share-links.js and person-file.js both give at
  // length: the app answers on /, /issue/…, /vote/…, /p/… and /b/…, so a path
  // built relative to "wherever the reader happens to be" inherits an address
  // that means something else. encodeURIComponent is a no-op over PID_RE and is
  // kept so the one line that builds this path cannot become an injection site
  // if the id shape is ever widened.
  function href(raw) {
    var id = pid(raw);
    return id ? PREFIX + encodeURIComponent(id) : '';
  }

  // The attribute pair, without a leading space, for interpolation into an
  // existing tag. '' when there is no address to advertise — a caller that
  // interpolates '' gets a tag with no href, which is exactly what it should
  // render for an id this file cannot place.
  //
  // data-pdx-person-link carries the CANONICAL pid, not the row's raw id, so the
  // delegated listener below opens the same person the href points at. A surface
  // that needs the raw id for its own bookkeeping keeps its own attribute.
  function attrs(raw, opts) {
    var id = pid(raw);
    if (!id) return '';
    var o = opts || {};
    var out = 'href="' + esc(PREFIX + encodeURIComponent(id)) + '"' +
      ' data-pdx-person-link="' + esc(id) + '"';
    // A section is a scroll target inside the file, not a second address: the
    // href stays /p/<pid> so the advertised URL is one per person, and the app
    // uses this only when it opens the file itself. person-file.js owns the
    // vocabulary (SECTION_HASH).
    if (o.section) out += ' data-pdx-person-section="' + esc(String(o.section)) + '"';
    return out;
  }

  // The whole anchor, for the surfaces whose name cell is just a name. `label`
  // is escaped; pass opts.html instead when the caller has already built (and
  // escaped) rich inner markup, which is how the search rows keep their <mark>
  // query highlighting.
  //
  // Returns a NON-INTERACTIVE span when there is no address, so a surface never
  // silently loses its name cell and never paints an anchor with no href.
  function anchor(raw, label, opts) {
    var o = opts || {};
    var inner = (o.html != null) ? o.html : esc(label);
    var a = attrs(raw, o);
    var cls = o.cls ? ' class="' + esc(o.cls) + '"' : '';
    if (!a) return '<span' + cls + '>' + inner + '</span>';
    var extra = '';
    if (o.aria) extra += ' aria-label="' + esc(o.aria) + '"';
    if (o.title) extra += ' title="' + esc(o.title) + '"';
    if (o.extra) extra += ' ' + o.extra;
    return '<a' + cls + ' ' + a + extra + '>' + inner + '</a>';
  }

  // ── Whose click is it ────────────────────────────────────────────────────
  // True when the reader asked the BROWSER for this navigation. Exported because
  // every surface with its own row handler has to ask the same question, and a
  // second copy of it is how one of them ends up swallowing ⌘-click.
  function isBrowserNav(ev) {
    if (!ev) return false;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return true;
    // `click` fires with button 0 for the primary button. A middle click arrives
    // as button 1 here in older browsers and as `auxclick` in current ones;
    // either way, anything but 0 is not ours.
    if (typeof ev.button === 'number' && ev.button !== 0) return true;
    return false;
  }

  // The in-app open, through the app's ONE funnel. Returns false when nothing
  // could open it, which is the signal to let the href do its job.
  function open(raw, opts) {
    var id = pid(raw);
    if (!id) return false;
    var o = opts || {};
    try {
      if (window.PDXPerson && typeof window.PDXPerson.open === 'function') {
        if (window.PDXPerson.open(id, o.section ? { section: o.section } : undefined)) return true;
      }
    } catch (e) {}
    try {
      if (typeof window.showProfile === 'function') { window.showProfile(id); return true; }
    } catch (e) {}
    return false;
  }

  // Bubble phase, at the document: this is the LAST handler to see the click, so
  // a surface that already opened the file (and said so by preventing the
  // default) is never second-guessed, and a link with no handler of its own
  // still opens in app instead of reloading the whole document.
  function onClick(ev) {
    if (!ev || ev.defaultPrevented) return;
    var t = ev.target;
    var a = (t && t.closest) ? t.closest('a[data-pdx-person-link]') : null;
    if (!a) return;
    if (isBrowserNav(ev)) return;
    var tgt = a.getAttribute('target');
    if (tgt && tgt !== '_self') return;
    if (open(a.getAttribute('data-pdx-person-link'),
             { section: a.getAttribute('data-pdx-person-section') || '' })) {
      ev.preventDefault();
    }
  }
  try { document.addEventListener('click', onClick, false); } catch (e) {}

  window.PDXPersonLink = {
    PREFIX: PREFIX,
    PID_RE: PID_RE,
    pid: pid,
    href: href,
    attrs: attrs,
    anchor: anchor,
    isBrowserNav: isBrowserNav,
    open: open,
    _onClick: onClick
  };
})();
