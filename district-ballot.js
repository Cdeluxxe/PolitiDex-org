/* ─────────────────────────────────────────────────────────────────────────────
   district-ballot.js — "This seat's ballot": the officials HD-68 answers to
   ─────────────────────────────────────────────────────────────────────────────
   WHO TALKS DOES NOT CHANGE. WHAT THEY CAN POINT AT DOES. District Voice is the
   belonging layer on /d/ut-statehouse-68 and it is keyed on the SEAT, never on a
   pid — a take is a neighbour's sentence about an issue, not a comment on a
   person. Nothing in this file touches that. What it adds is one short strip
   between the seat's live question and its issue rooms, naming the officials who
   actually touch this district as LINKS TO PERSON FILES THAT ALREADY EXIST.
   A reader who wants to check a name goes to that person's own file, which is
   where the record, the receipts and every refusal already live.

   WHY IT IS ITS OWN FILE. Two modules already own this page and neither one may
   hold this. district-voice.js carries NO POLITICIAN ID in any request it sends
   or any row it writes, and its suite asserts that byte for byte — putting six
   pids inside the .pdxv section would break the one promise that keeps a seat's
   takes from becoming a comment section about its member. district-file.js owns
   the rooms list and reaches exactly two API addresses, which its own suite
   pins. So the strip is a third block with its own namespace, mounted by the
   district file into its own container, and it fails soft in both directions: a
   boot without this file is the file that shipped before it, and this file
   renders nothing for a district that is not in its table.

   NOT A MINI-PROFILE, AND NOT A SCORECARD. A row is a name, the office that
   person's own roster row states, and — only if their file already has one — one
   record-first line. There is no percentage, no party letter, no party colour,
   no party sort, no score, no grade, no composite, no ranking, no bar, no fill
   and nothing that scales with a count. No "district vs Chew" tile and no
   "neighbours agree with X" tile: this strip compares nobody to anybody, and the
   district's answers are not evidence about a member.

   THE ONE-LINER IS THE PERSON FILE'S OWN, OR THERE IS NONE. lineFor() asks, in
   this order:
     1. PDXConsistency.recordStandout.pick(pid) — the strongest pattern the
        FORMAL record supports, printed in the app's own words through
        window._PDX_RD_SAYS_LEAD ("The record indicates"). Its floor is the
        pattern engine's, not a second one invented here.
     2. window._resolveStanceList(pid, row) — the SAID cards, labelled `Said:`
        exactly as every other surface labels them, because a stated position is
        their claim and not an act.
     3. Nothing. An empty line is the honest output for a thin file, and there is
        no placeholder row, no skeleton and no invented act. Lyman has SAID cards
        and no formal acts on file; he prints a Said: line and no record line, and
        that is the correct amount of text.
   The counts are deliberately left off the record line. They are printed in full
   on the person file this name links to, and a number on a one-line strip beside
   five other names is the first step toward a league table.

   THE ROSTER IDS ARE CURATED PER SEAT, AND NOBODY IS MINTED. There is no
   resolver that answers "who is the U.S. House member for state house district
   68" — pdxSeatedMemberFor answers a SEAT KEY, and the seat this file is on is
   the state house one, so that is the only office it resolves. The federal and
   statewide rows are named by pid in the table below, every pid is one the roster
   ALREADY carries, and a pid the roster does not carry is dropped rather than
   printed: this file creates no person, no office and no district.
     ONE KNOWN DISAGREEMENT, PRINTED HONESTLY. This district's geography is UT-3,
   and the roster files Celeste Maloy under "Utah · District 2" while its curated
   congressional incumbent table answers UT-3 with a different member. The brief
   this strip ships from names Maloy and Lyman "as the roster already files
   them", so those are the two pids here — and the strip asserts NO district
   number of its own about either of them. Each row prints that person's own
   roster office string, which is why Lyman's reads "U.S. House Candidate (UT-3)"
   and Maloy's does not claim a district at all. Writing "UT-3" beside Maloy here
   would mint a fact the roster does not hold, in the one file that is supposed to
   be pointing at files that already exist.

   ALPHABETICAL INSIDE AN OFFICE. Two people share the U.S. House row and two
   share the U.S. Senate row; both are sorted on the DISPLAYED name, which is the
   string the reader's eye runs down — Maloy before Lyman, Curtis before Lee. The
   offices themselves are in the fixed order of the table: the seat this file IS,
   then the stack outward from it. That is an address, not a ranking, and no
   attribute of a person can move a row.

   NO NETWORK, NO WRITE, NO STATE. There is no fetch in this file, no API
   address, no POST, no form, no textarea and no control that writes anything.
   Every fact it prints is already in the page — the roster, the stance cards and
   the pattern engine — so the strip is a projection recomputed on mount and can
   never go stale against them. The write path is District Voice's, it is
   untouched, and this file could not reach it if it wanted to.

   TAPPING. A name opens /p/<pid> through PDXPersonLink, the app's one funnel, so
   it opens the same way a person link opens everywhere else and a ⌘-click still
   works. Nothing in this file opens a room: the rooms are below, they keep their
   own /d/<district>/<issue> addresses, and a room row still opens the room.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.PDXDistrictBallot) return;

  // The seat-key vocabulary, in the same two shapes every district surface
  // spells it: the canonical key and the short alias a link may arrive on.
  var DISTRICT_KEY_RE = /^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/;
  var ALIAS_RE = /^([a-z]{2})-(hd|sd|cd)-([1-9][0-9]*)$/;
  var ALIAS_CHAMBERS = { hd: 'statehouse', sd: 'statesenate', cd: 'house' };

  // ── THE WHOLE TABLE ───────────────────────────────────────────────────────
  // One seat, four offices, and the offices render in this order. `seat: true`
  // means the office is THIS district's own seat and its member is resolved from
  // the seat key rather than named here, so no second copy of the incumbent
  // table lives in this file. Every other row is an explicit pid list; see the
  // header for why the federal rows are curated and what is not asserted about
  // them.
  var BALLOT_SEATS = {
    'ut-statehouse-68': [
      { key: 'statehouse', label: 'Utah State House', seat: true },
      { key: 'ushouse',    label: 'U.S. House',       pids: ['maloy', 'lyman'] },
      { key: 'ussenate',   label: 'U.S. Senate',      pids: ['lee', 'curtis'] },
      { key: 'governor',   label: 'Governor',         pids: ['cox'] }
    ]
  };

  var COPY = {
    kick: 'This seat’s ballot',
    // ONE SENTENCE, AND IT SAYS BOTH THINGS. What the names are (this district's
    // ballot and the federal / state stack above it) and what the page still is
    // (neighbours of HD-68, not a statewide thread). The second half is the point:
    // a strip full of senators on a page with a composer is an invitation to a
    // statewide comment pit unless the copy says out loud that it is not one.
    frame: 'These are the people on this district’s ballot and in its federal ' +
           'and state stack — tap a name for that person’s own file. Talking here ' +
           'is still neighbors of this district, not a statewide thread.',
    said: 'Said:'
  };

  function fn(x) { return typeof x === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function normalizeKey(raw) {
    var k = String(raw == null ? '' : raw).trim().toLowerCase();
    if (!k) return '';
    if (DISTRICT_KEY_RE.test(k)) return k;
    var m = ALIAS_RE.exec(k);
    if (!m) return '';
    var chamber = ALIAS_CHAMBERS[m[2]];
    if (!chamber) return '';
    var out = m[1] + '-' + chamber + '-' + m[3];
    return DISTRICT_KEY_RE.test(out) ? out : '';
  }

  // Does this district have a ballot strip? Asked by the mount before it paints,
  // and the honest answer for every other district is no.
  function shipped(districtKey) {
    var k = normalizeKey(districtKey);
    return !!k && Object.prototype.hasOwnProperty.call(BALLOT_SEATS, k);
  }

  // ── THE ROSTER, READ AND NEVER WRITTEN ────────────────────────────────────
  // Through the app's own person lookup, so a name or an office string on this
  // strip is the same name and office string every other surface prints. A pid
  // the roster has no row for answers null and is dropped by rows() — this file
  // does not invent a person to fill an office.
  function person(pid) {
    var id = String(pid == null ? '' : pid).trim();
    if (!id) return null;
    try {
      if (fn(window._pdxPersonById)) {
        var p = window._pdxPersonById(id);
        if (p && (p.name || p.office)) return p;
      }
    } catch (e) {}
    return null;
  }

  function nameOf(pid, p) {
    var row = p || person(pid);
    return (row && row.name) ? String(row.name) : '';
  }

  function officeOf(pid, p) {
    var row = p || person(pid);
    return (row && row.office) ? String(row.office) : '';
  }

  // The member who SITS in this district's own seat, from the one resolver that
  // answers a seat key. Null when the resolver is not on the page or cannot name
  // one, and a null prints no row: "we could not resolve the holder" is already
  // said once on this file's letterhead and does not need saying twice.
  function seatedPid(districtKey) {
    var k = normalizeKey(districtKey);
    if (!k) return '';
    try {
      if (!fn(window.pdxSeatedMemberFor)) return '';
      var pid = window.pdxSeatedMemberFor(k);
      return pid ? String(pid) : '';
    } catch (e) { return ''; }
  }

  // ── THE ONE-LINER ─────────────────────────────────────────────────────────
  // Record first, said second, nothing third. See the header. Returns
  // { kind: 'record' | 'said', text: '…' } or null, and never a sentence this
  // file composed an opinion into.
  function lineFor(pid) {
    var id = String(pid == null ? '' : pid).trim();
    if (!id) return null;
    var rec = recordLine(id);
    if (rec) return { kind: 'record', text: rec };
    var said = saidLine(id);
    if (said) return { kind: 'said', text: said };
    return null;
  }

  // THE STRONGEST PATTERN THE FORMAL RECORD SUPPORTS, in the engine's own words.
  // One-sided issues are asked for before conflicted ones because that is the
  // order recordStandout itself publishes them in; the floor, the selection and
  // the vocabulary are all its own. No counts (see the header), no tier colour,
  // no tone — a hue that means "strong" is a grade with the number filed off.
  function recordLine(pid) {
    try {
      var C = window.PDXConsistency;
      var so = C && C.recordStandout && fn(C.recordStandout.pick)
        ? C.recordStandout.pick(pid) : null;
      if (!so || !so.any) return '';
      var row = (so.consistent && so.consistent[0]) || (so.mixed && so.mixed[0]) || null;
      if (!row) return '';
      var word = String(row.saysLabel || row.patLabel || '').trim();
      var label = String(row.label || '').trim();
      if (!word || !label) return '';
      var lead = window._PDX_RD_SAYS_LEAD || 'The record indicates';
      return clean(label + ' — ' + lead + ': ' + word);
    } catch (e) { return ''; }
  }

  // THE SAID CARDS, LABELLED AS THEIRS. The first card the shared resolver hands
  // back, by its topic, which is the same collapse order every other SAID
  // surface reads. `Said:` is the app's existing label and is not reworded here,
  // because a stated position and an act are two different claims and the reader
  // has already learned which word means which.
  function saidLine(pid) {
    try {
      if (!fn(window._resolveStanceList)) return '';
      var list = window._resolveStanceList(pid, person(pid));
      if (!list || !list.length) return '';
      for (var i = 0; i < list.length; i++) {
        var topic = list[i] && list[i].topic ? String(list[i].topic).trim() : '';
        if (topic) return clean(COPY.said + ' ' + topic);
      }
      return '';
    } catch (e) { return ''; }
  }

  // THE LAST GATE ON EVERY LINE THIS FILE PRINTS. A percentage is the one string
  // that can turn a pointer into a grade, and the engines upstream are free to
  // grow one without knowing this strip reads them — so a line that arrives with
  // a '%' in it is dropped rather than trimmed, and the row prints no line at
  // all. Dropping is the honest failure: a mangled sentence would still be a
  // sentence, and nobody would know a character had been removed from it.
  function clean(s) {
    var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    if (!t || t.indexOf('%') !== -1) return '';
    return t;
  }

  // ── THE STRIP'S MODEL ─────────────────────────────────────────────────────
  // offices → people, in the table's order, alphabetical on the displayed name
  // inside an office. An office whose every pid is missing from the roster is
  // dropped whole, so the strip can shrink but can never print an empty heading.
  function rows(districtKey) {
    var k = normalizeKey(districtKey);
    var spec = k && BALLOT_SEATS[k];
    if (!spec) return [];
    var out = [];
    spec.forEach(function (office) {
      var pids = [];
      if (office.seat) {
        var sitting = seatedPid(k);
        if (sitting) pids.push(sitting);
      } else if (office.pids) {
        pids = office.pids.slice();
      }
      var people = [];
      pids.forEach(function (pid) {
        var p = person(pid);
        if (!p) return;
        var name = nameOf(pid, p);
        if (!name) return;
        if (people.some(function (q) { return q.pid === pid; })) return;
        people.push({ pid: pid, name: name, office: officeOf(pid, p), line: lineFor(pid) });
      });
      // Alphabetical on the name, and on nothing else. There is no party field
      // in this sort, no status rank, no record depth and no tie-break that
      // could smuggle one in — two names in one office are two names in one
      // office.
      people.sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (people.length) out.push({ key: office.key, label: office.label, people: people });
    });
    return out;
  }

  // ── MARKUP ────────────────────────────────────────────────────────────────
  // The name is an anchor built by PDXPersonLink so the in-app open and the real
  // href are the same ones every other person link on the page carries. If that
  // module is missing the anchor helper answers a <span> and the row is plain
  // text, which is a strip that cannot be tapped rather than a strip that lies
  // about where it goes.
  function nameHtml(pid, name) {
    try {
      var L = window.PDXPersonLink;
      if (L && fn(L.anchor)) return L.anchor(pid, name, { cls: 'pdxb-name' });
    } catch (e) {}
    return '<span class="pdxb-name">' + esc(name) + '</span>';
  }

  function personHtml(row) {
    var line = row.line;
    return '<li class="pdxb-person">' +
      nameHtml(row.pid, row.name) +
      (row.office ? '<span class="pdxb-role">' + esc(row.office) + '</span>' : '') +
      (line ? '<span class="pdxb-line" data-pdxb-line="' + esc(line.kind) + '">' +
        esc(line.text) + '</span>' : '') +
    '</li>';
  }

  function officeHtml(office) {
    return '<li class="pdxb-office">' +
      '<p class="pdxb-office-hd">' + esc(office.label) + '</p>' +
      '<ul class="pdxb-people">' +
        office.people.map(personHtml).join('') +
      '</ul>' +
    '</li>';
  }

  // A district with no ballot, or a page where the roster has not loaded, is an
  // EMPTY STRING and not an empty box. The district file's containers collapse
  // on :empty, so a strip with nothing to say leaves the page it was added to
  // exactly as it was.
  function html(districtKey) {
    var k = normalizeKey(districtKey);
    if (!shipped(k)) return '';
    var offices = rows(k);
    if (!offices.length) return '';
    return '<section class="pdxb" data-pdxb-seat="' + esc(k) + '">' +
      '<p class="pdxb-kick">' + esc(COPY.kick) + '</p>' +
      '<p class="pdxb-frame">' + esc(COPY.frame) + '</p>' +
      '<ul class="pdxb-offices">' + offices.map(officeHtml).join('') + '</ul>' +
    '</section>';
  }

  // Painted once per open, synchronously, because every fact is already in the
  // page and there is nothing to wait for. Returns false without touching the
  // host when there is nothing to paint, so the caller's container stays empty
  // rather than being cleared to an empty box.
  function mount(districtKey, mountId) {
    var markup = html(districtKey);
    if (!markup) return false;
    var host = el(String(mountId || ''));
    if (!host) return false;
    try { host.innerHTML = markup; } catch (e) { return false; }
    return true;
  }

  window.PDXDistrictBallot = {
    BALLOT_SEATS: BALLOT_SEATS,
    COPY: COPY,
    DISTRICT_KEY_RE: DISTRICT_KEY_RE,
    normalizeKey: normalizeKey,
    shipped: shipped,
    seatedPid: seatedPid,
    lineFor: lineFor,
    // Exposed for the suite: the model and the markup are asserted directly
    // rather than inferred from a painted page.
    rows: rows,
    html: html,
    mount: mount
  };
})();
