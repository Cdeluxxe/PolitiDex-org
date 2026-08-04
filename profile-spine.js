// ───────────────────────────────────────
// PolitiDex — Profile Spine  ·  window.PDXProfileSpine
// ───────────────────────────────────────
// A politician profile on this site is not short of substance. It was short of
// SEQUENCE. Every accountability lens the app grew — promises, votes, stances,
// receipts, money, contracts, personal alignment — had been appended to one
// 1,200-line template in roughly the order it was built, so money surfaced five
// times, promises three times, and votes three times, at four different depths,
// interleaved with each other. A reader could not tell what to look at first,
// what mattered most, or what was worth sharing, because nothing in the page
// said so.
//
// This module supplies the missing spine. It does three things and deliberately
// no more:
//
//   1. STAGES — the canonical top-to-bottom order of a profile, declared once,
//      as data. Sections no longer sit in the order their renderer happens to be
//      called; they declare which stage they belong to and the assembler places
//      them. Adding a section is choosing a stage, not finding a line number.
//
//   2. drawer() — progressive disclosure for the deep record. The exhaustive
//      material (every vote, every promise row, the wealth chart, the full
//      finance report, every documented position) is preserved in full and moved
//      behind a labelled, closed-by-default drawer that states what is inside
//      and how much of it there is. Nothing is deleted; the first read is just no
//      longer buried under it.
//
//   3. briefHtml() — the first screen. Four questions a reader arrives with —
//      who is this, what defines them, where is the tension, what should I share
//      or inspect next — answered above the fold from data the profile already
//      renders further down, so the brief can never claim something the record
//      below does not support.
//
// TWO RULES THIS MODULE KEEPS
//
//   IT DERIVES, IT NEVER ASSERTS. Every figure and every verdict in the brief is
//   read back from the same accessors the full sections use (PDXConsistency for
//   record-vs-public-picture, the controversy gatherer for flashpoints,
//   _resolveStanceList / _issueEvidenceMap for positions). There is no separate
//   editorial layer here to drift out of agreement with the record, and no new
//   scoring. When an accessor has nothing, the brief says so in words rather
//   than guessing or hiding.
//
//   IT DOES NOT MOVE THE PAGE. The brief renders once, synchronously, from
//   cached reads, in the same pass as the rest of the modal body — it is not a
//   placeholder that fills in later. Drawers are closed on arrival and open only
//   on a tap, and they open with max-height:none rather than an animated height,
//   because animating a six-thousand-pixel reveal is how you reintroduce the
//   mobile jank the stability work removed.
// ───────────────────────────────────────
(function () {
  'use strict';
  if (window.PDXProfileSpine) return;

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function escAttr(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
  function jsStr(v) {
    // Safe inside a double-quoted HTML attribute holding single-quoted JS.
    return escAttr(String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
  }
  function clip(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n - 1).replace(/[\s,;:.—-]+$/, '') + '…' : s;
  }
  function firstName(p) {
    return (p && p.name) ? String(p.name).split(' ')[0] : 'this official';
  }

  // ── The spine ───────────────────────────────────────────────────────────────
  // Order is the product decision; everything else in this file serves it. Each
  // stage answers one question, and a section belongs to the stage whose question
  // it answers — which is why "Record vs. Public Picture" sits in `tension` and
  // not next to the record, and why personal-alignment blocks are collected into
  // one `you` stage instead of appearing at three different depths.
  //
  // The sequence below is an ACCOUNTABILITY PATH, not a catalogue of systems. Its
  // shape is four claims, in this order:
  //
  //   THE JUDGMENT COMES FIRST. `verdict` holds one thing — the Word vs Action
  //   read — and it is the first major surface after the letterhead and the brief.
  //   It used to be the opening block of `record`, which meant the primary finding
  //   arrived as the header of a system rather than as the site's answer. There is
  //   still exactly one score; giving it its own stage is what makes that legible.
  //
  //   THE ADVERSE FINDING COMES SECOND. `tension` now precedes `signature`.
  //   "Where does this person contradict themselves" is the question a reader came
  //   with; "what are they known for" is context that frames it. Leading with the
  //   flattering summary and burying the contradiction two stages down is how a
  //   dossier turns into a brochure.
  //
  //   FINDINGS BEFORE METHODS. Everything from `record` down is the apparatus that
  //   produced the verdict — the formal record, the receipts, the ledgers. It is
  //   all still here, in full, and none of it is the first thing a reader meets.
  //
  //   THE READER'S OWN STAKE BEFORE THE FOLLOW-THE-MONEY TAIL. `you` moved above
  //   `money`, so the profile ends on the deep record rather than on the reader,
  //   but the reader is met before the widest-context material.
  var STAGES = [
    { key: 'identity',  label: 'Identity',           ask: 'Who is this?' },
    { key: 'brief',     label: 'The short version',   ask: 'What should I look at first?' },
    { key: 'verdict',   label: 'The verdict',         ask: 'Do they stand by what they said?' },
    { key: 'tension',   label: 'Where it is contested', ask: 'Where is the tension?' },
    { key: 'signature', label: 'Signature issues',    ask: 'What defines them?' },
    { key: 'record',    label: 'Official record',     ask: 'What did they actually do?' },
    { key: 'receipts',  label: 'Receipts · say vs. do', ask: 'Where are the receipts?' },
    { key: 'you',       label: 'You and them',        ask: 'How does this map to my own positions?' },
    { key: 'money',     label: 'Money',               ask: 'Who funds them, and who does the record touch?' },
    { key: 'drawers',   label: 'The full record',     ask: 'Show me everything.' }
  ];
  var STAGE_KEYS = STAGES.map(function (s) { return s.key; });
  // Stages whose contents are pure navigation/identity chrome get no visible
  // rail — a heading over the hero would be noise. The rest get one, because the
  // rail is what makes the sequence legible while scrolling on a phone.
  var SILENT = { identity: 1, brief: 1 };

  function stageMeta(key) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === key) return STAGES[i];
    return null;
  }

  function railHtml(st, n) {
    return '<div class="pdxsp-rail" id="pdxsp-' + escAttr(st.key) + '">' +
        '<span class="pdxsp-rail-n" aria-hidden="true">' + n + '</span>' +
        '<span class="pdxsp-rail-lbl">' + esc(st.label) + '</span>' +
        '<span class="pdxsp-rail-ask">' + esc(st.ask) + '</span>' +
      '</div>';
  }

  // assemble(parts) — parts is a flat list of [stageKey, html]. Order of the list
  // is preserved WITHIN a stage and ignored BETWEEN stages, which is the whole
  // point: a renderer's position in the source template no longer decides where
  // the reader meets it. Empty and whitespace-only fragments are dropped, so a
  // stage with nothing to say emits no rail and no gap.
  function assemble(parts) {
    var bucket = {};
    STAGE_KEYS.forEach(function (k) { bucket[k] = []; });
    (parts || []).forEach(function (pr) {
      if (!pr) return;
      var k = pr[0], html = pr[1];
      if (!html || !String(html).trim()) return;
      if (!bucket[k]) k = 'drawers'; // unknown stage → deep end, never dropped
      bucket[k].push(html);
    });
    var out = '', n = 0;
    STAGES.forEach(function (st) {
      var list = bucket[st.key];
      if (!list.length) return;
      if (!SILENT[st.key]) { n++; out += railHtml(st, n); }
      out += '<div class="pdxsp-stage pdxsp-stage-' + st.key + '">' + list.join('\n') + '</div>';
    });
    return out;
  }

  // assembleTagged(body, opts) — the form the profile modal actually uses.
  //
  // Rearranging a 1,200-line template by hand means physically moving hundred-line
  // renderers past each other, which is how ordering bugs get introduced and how
  // review becomes impossible. So the template stays in the order it was written
  // and each block is annotated IN PLACE with a one-line sentinel comment naming
  // the stage it belongs to:
  //
  //   <!--PDXSP:record-->        → this chunk belongs to the Official record stage
  //   <!--PDXSP:dw:votes-->      → this chunk is content for the "votes" drawer
  //
  // This function splits on those sentinels and emits the chunks in spine order.
  // The text before the first sentinel is the letterhead, so it defaults to
  // `identity`. Sentinels are ASCII literals this codebase writes itself — they
  // are never derived from data — so the split is exact; a renderer may also emit
  // one mid-output when a single function produces content for two stages (the
  // voting block emits its highlights into the record stage and its full table
  // into a drawer that way).
  //
  // opts.drawers is an ordered list of drawer specs, {id, stage, ico, title, meta,
  // sub}. Every chunk tagged `dw:<id>` is concatenated in source order and wrapped
  // in one drawer, and the drawers appear in the order declared here rather than
  // the order their content happens to sit in the file. A spec with no matching
  // content emits nothing.
  var TAG_RE = /<!--PDXSP:([a-z0-9:_-]+)-->/g;

  function assembleTagged(body, opts) {
    opts = opts || {};
    body = String(body == null ? '' : body);
    var specs = opts.drawers || [];
    var parts = [];
    var dw = {};
    // One profile is being assembled, so any drawer body still stashed from the
    // last one is dead. Clearing here rather than on close means a profile can
    // never mount the previous profile's record, even if it was closed abruptly.
    resetDefer();
    // Lids are resolved before the body is split, so a renderer can mark a
    // digest/bulk seam without knowing which stage its output lands in.
    body = applyLids(body);
    specs.forEach(function (s) { if (s && s.id) dw[s.id] = []; });

    var last = 0, cur = 'identity', m;
    TAG_RE.lastIndex = 0;
    function push(tag, html) {
      if (!html || !html.trim()) return;
      if (tag.indexOf('dw:') === 0) {
        var did = tag.slice(3);
        if (dw[did]) { dw[did].push(html); return; }
        // A drawer tag with no spec must not vanish — park it at the deep end.
        parts.push(['drawers', html]);
        return;
      }
      parts.push([tag, html]);
    }
    while ((m = TAG_RE.exec(body)) !== null) {
      push(cur, body.slice(last, m.index));
      cur = m[1];
      last = m.index + m[0].length;
    }
    push(cur, body.slice(last));

    specs.forEach(function (s) {
      if (!s || !s.id) return;
      var list = dw[s.id] || [];
      if (!list.length) return;
      var html = drawer({
        id: 'pdxsp-dw-' + s.id, ico: s.ico, title: s.title, meta: s.meta, sub: s.sub,
        defer: !!s.defer,
        html: list.join('\n')
      });
      parts.push([s.stage || 'drawers', html]);
    });
    return assemble(parts);
  }

  // ── Deferred drawer inners ──────────────────────────────────────────────────
  // Collapsing a drawer hides its content; it does not stop the browser paying
  // for it. A closed .dd-body is still parsed out of the innerHTML string, still
  // becomes thousands of elements, still gets style resolved. On the deepest
  // profiles the drawers are the majority of the document, and all of that cost
  // lands on the tap that opens the profile — for material nobody has asked to
  // see yet.
  //
  // Deferred mode keeps the drawer's markup as a STRING until the drawer is first
  // needed, and emits an empty .dd-inner in its place. The lid, its title and its
  // count are unchanged, so the reader is told exactly what is inside and how much
  // of it there is before any of it exists as DOM.
  //
  // Three rules make that safe rather than merely faster:
  //
  //   ONE-SHOT AND SYNCHRONOUS. materialize() injects in the same task it is
  //   called in, before toggleDD flips the open class, so anything that measures,
  //   drains or hydrates after the open sees a fully mounted subtree. It is never
  //   an animation frame or a microtask behind. Injecting twice is impossible: the
  //   stash entry is removed as it is used.
  //
  //   NOTHING BECOMES UNREACHABLE. Deferred content still holds jump targets, and
  //   code elsewhere still looks those up by id. revealFor(elementId) materializes
  //   whichever drawer holds a given id, so a jump, a promise filter or a deep
  //   link resolves against content that has not been mounted yet. hasTarget()
  //   answers the same question without mounting, for callers that only need to
  //   know whether a destination exists at all.
  //
  //   THE STORE IS PER-RENDER. assembleTagged() clears it, so a profile can never
  //   inherit the previous profile's drawer bodies, and closing a profile without
  //   opening its drawers does not leak their markup.
  var DEFER = {};
  var LIDS = {};

  function resetDefer() { DEFER = {}; LIDS = {}; }

  // Which element ids live inside a stashed body. Built on demand and cached,
  // because the common case — the id is already in the document — never needs it,
  // and scanning a megabyte of markup to answer a question nobody asked would
  // hand back the cost this whole mechanism exists to avoid.
  function idIndex(rec) {
    if (rec.idx) return rec.idx;
    var idx = {}, re = /\sid="([^"]+)"/g, m;
    while ((m = re.exec(rec.html)) !== null) idx[m[1]] = 1;
    rec.idx = idx;
    return idx;
  }

  function deferredOwner(elId) {
    for (var id in DEFER) {
      if (!DEFER.hasOwnProperty(id)) continue;
      if (id === elId) return id;
      if (idIndex(DEFER[id])[elId]) return id;
    }
    return '';
  }

  // Which stashed body holds the CONTAINER of another stashed body — a lid inside a
  // deferred drawer. Unlike deferredOwner it never answers with the id it was asked
  // about, because "it is its own container" is not a mountable answer.
  function outerOwner(elId) {
    for (var id in DEFER) {
      if (!DEFER.hasOwnProperty(id)) continue;
      if (id === elId) continue;
      if (idIndex(DEFER[id])[elId]) return id;
    }
    return '';
  }

  // True when `elId` is either already in the document or is waiting inside a
  // deferred drawer. Callers use this to decide whether a destination is real
  // without forcing it to mount.
  function hasTarget(elId) {
    if (!elId) return false;
    try { if (document.getElementById(elId)) return true; } catch (e) {}
    return !!deferredOwner(elId);
  }

  // Mount one deferred drawer's body. Returns true only if markup was injected,
  // so callers can tell "I just mounted this" from "it was already there".
  function materialize(drawerId, _depth) {
    var rec = DEFER[drawerId];
    if (!rec) return false;
    var body, host = null;
    try { body = document.getElementById(drawerId); } catch (e) { body = null; }
    if (!body) {
      // The container is itself waiting inside another stashed body — a lid inside a
      // deferred drawer. Mount the outer one first, then try again. Depth-bounded, so
      // a cycle in the stash cannot spin.
      var outer = (_depth || 0) < 4 ? outerOwner(drawerId) : '';
      if (!outer || !materialize(outer, (_depth || 0) + 1)) return false;
      try { body = document.getElementById(drawerId); } catch (e) { body = null; }
      if (!body) return false;
    }
    var kids = body.children || [];
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].getAttribute && kids[i].getAttribute('data-pdxsp-defer') === drawerId) { host = kids[i]; break; }
    }
    if (!host) return false;
    host.innerHTML = rec.html;
    try { host.removeAttribute('data-pdxsp-defer'); } catch (e) {}
    delete DEFER[drawerId];
    // One seam back into the profile for everything that has to run against
    // freshly mounted nodes — the chart queue, a button whose stored state was
    // fetched while the canvas did not exist, the scroll-spy's target list. The
    // spine does not know what those are and must not grow to know.
    try {
      if (typeof window._pdxAfterDrawerReveal === 'function') window._pdxAfterDrawerReveal(drawerId, host);
    } catch (e) {}
    return true;
  }

  // Mount whichever deferred drawer holds `elId`. No-op when the id is already
  // live, which is the overwhelmingly common case and costs one getElementById.
  function revealFor(elId) {
    if (!elId) return false;
    try { if (document.getElementById(elId)) return false; } catch (e) {}
    var owner = deferredOwner(elId);
    return owner ? materialize(owner) : false;
  }

  // ── Lids ────────────────────────────────────────────────────────────────────
  // A drawer is a whole section behind one control. A LID is smaller and sits
  // inside a section that stays open: the digest above it keeps reading, and the
  // bulk below it folds away behind one line of copy that says what is in there.
  //
  // The reason it is a marker and not a function call is placement. The blocks that
  // needed folding are rendered by six different modules, some of which also render
  // into surfaces that are not a profile, and none of which knows which stage of the
  // spine its output will land in. A renderer therefore marks its own seam —
  //
  //   ...digest...  <!--PDXSP:lid id="or-rows" label="Show all 12 issues" defer-->
  //   ...bulk...    <!--PDXSP:/lid-->
  //
  // — and the spine builds the control while it assembles, using the same
  // .dd-toggle-btn / .dd-body / toggleDD contract as the drawers, so nothing new
  // opens or closes on this page. With `defer` the bulk goes into the same stash the
  // drawers use, which means a folded block is not merely hidden but unmounted, and
  // the whole reveal path — jump targets, promise filters, chart draining — already
  // works on it.
  //
  // Three fail-open rules, because a lid is a presentation choice and substance is
  // not. Unprocessed markers leave the content in place and fully visible; a region
  // holding a stage sentinel is left alone rather than risk relocating a section; a
  // duplicate id renders inline rather than mint a second element with the same id.
  var LID_RE = /<!--PDXSP:lid\s+([^>]*?)-->([\s\S]*?)<!--PDXSP:\/lid-->/g;
  var LID_ATTR_RE = /([a-z]+)="([^"]*)"/g;

  function lidAttrs(raw) {
    var a = { defer: /(^|\s)defer(\s|$)/.test(raw) }, m;
    LID_ATTR_RE.lastIndex = 0;
    while ((m = LID_ATTR_RE.exec(raw)) !== null) a[m[1]] = m[2];
    return a;
  }

  function applyLids(html, reclaim) {
    html = String(html == null ? '' : html);
    if (html.indexOf('<!--PDXSP:lid') === -1) return html;
    LID_RE.lastIndex = 0;
    return html.replace(LID_RE, function (whole, raw, bulk) {
      var a = lidAttrs(raw);
      if (!bulk || !bulk.trim()) return '';
      var key = String(a.id || '');
      if (!key) return bulk;
      // No lid over nothing, and none over a line or two either: a control that
      // costs a tap to reveal less than it takes to describe is worse than the
      // content it hides. Renderers already gate on their own counts; this is the
      // backstop for the profile whose "bulk" turned out to be one row.
      if (bulk.length < 240) return bulk;
      // Relocating a section is a real failure; hiding a fold is not. If a stage or
      // drawer sentinel — or a nested lid — is inside this region, leave it be.
      if (bulk.indexOf('<!--PDXSP:') !== -1) return bulk;
      var id = 'pdxsp-lid-' + key;
      // Two lids claiming one id would produce two nodes that one control opens, so
      // the second one renders inline instead. A caller that is REPLACING the section
      // that owned the id — the warm-refresh repaint, which rebuilds a section in
      // place once votes arrive — passes reclaim, because there the repeat is the
      // same lid being rebuilt, not a collision.
      if (LIDS[id] && !reclaim) return bulk;
      LIDS[id] = 1;
      var inner;
      if (a.defer) {
        DEFER[id] = { html: bulk, idx: null };
        inner = '<div class="dd-inner pdxsp-lid-inner" data-pdxsp-defer="' + escAttr(id) + '"></div>';
      } else {
        inner = '<div class="dd-inner pdxsp-lid-inner">' + bulk + '</div>';
      }
      return '<div class="pdxsp-lid">' +
          '<button class="dd-toggle-btn pdxsp-lid-btn" type="button" onclick="toggleDD(\'' + escAttr(id) + '\')" id="btn-' + escAttr(id) + '"' +
            ' aria-controls="' + escAttr(id) + '" aria-expanded="false">' +
            '<span class="pdxsp-lid-label">' + esc(a.label || 'Show the full detail') + '</span>' +
            '<svg class="dd-chevron w-4 h-4" fill="none" stroke="#7596c0" viewBox="0 0 24 24" aria-hidden="true">' +
              '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>' +
          '</button>' +
          '<div class="dd-body dd-free" id="' + escAttr(id) + '">' + inner + '</div>' +
        '</div>';
    });
  }

  // ── Drawers ─────────────────────────────────────────────────────────────────
  // Reuses the .dd-toggle-btn / .dd-body pair and the global toggleDD() already
  // in the profile, so no new open/close behaviour enters the page — only the
  // .dd-free modifier, which drops the max-height cap. That cap (2400px) exists
  // for short deep-dives; a full voting record or every documented position runs
  // well past it and would be silently clipped, which is a worse failure than no
  // drawer at all.
  //
  // opts.defer holds the inner markup back as a string (see above). The lid is
  // byte-identical either way: the drawer must not advertise itself differently
  // for being cheap.
  function drawer(opts) {
    opts = opts || {};
    var html = opts.html;
    if (!html || !String(html).trim()) return '';
    var id = String(opts.id || '');
    if (!id) return String(html);
    var meta = opts.meta
      ? '<span class="pdxsp-dw-meta">' + esc(opts.meta) + '</span>'
      : '';
    var sub = opts.sub ? '<p class="pdxsp-dw-sub">' + esc(opts.sub) + '</p>' : '';
    // The subtitle rides along with the deferred payload rather than staying
    // inline: it is one short paragraph, and keeping the .dd-inner an empty leaf
    // node means the deferred and inline forms have identical element structure
    // apart from what is inside that one box.
    var inner;
    if (opts.defer) {
      DEFER[id] = { html: sub + html, idx: null };
      inner = '<div class="dd-inner pdxsp-dw-inner" data-pdxsp-defer="' + escAttr(id) + '"></div>';
    } else {
      inner = '<div class="dd-inner pdxsp-dw-inner">' + sub + html + '</div>';
    }
    return '<div class="modal-section pdxsp-dw">' +
        '<button class="dd-toggle-btn pdxsp-dw-btn" type="button" onclick="toggleDD(\'' + escAttr(id) + '\')" id="btn-' + escAttr(id) + '"' +
          ' aria-controls="' + escAttr(id) + '" aria-expanded="false">' +
          '<span class="pdxsp-dw-head">' +
            '<span class="pdxsp-dw-ico" aria-hidden="true">' + esc(opts.ico || '🗂️') + '</span>' +
            '<span class="pdxsp-dw-title">' + esc(opts.title || 'Full record') + '</span>' +
            meta +
          '</span>' +
          '<svg class="dd-chevron w-4 h-4" fill="none" stroke="#7596c0" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>' +
        '</button>' +
        '<div class="dd-body dd-free" id="' + escAttr(id) + '">' +
          inner +
        '</div>' +
      '</div>';
  }

  // ── The brief ───────────────────────────────────────────────────────────────

  // Signature issues: the positions this person is most documented on, ranked by
  // how much of their own record is tied to each. The curated issue list is the
  // preferred answer and wins when present; otherwise the ranking is derived from
  // the same stance list and evidence map the Stance at a Glance index renders,
  // so the brief and the index can never disagree about what is on file.
  //
  // That list lives under `issues` on a roster record and under `keyIssues` on a
  // Firestore/admin-authored one. Reading only `keyIssues` here meant the brief
  // silently fell through to the derived ranking for every static roster record,
  // discarding the curated answer it says it prefers. _pdxKeyIssues() is the one
  // accessor for both spellings; the inline fallback keeps this module readable
  // on its own if profiles-full.js has not run yet.
  function signatureIssues(pid, p, max) {
    max = max || 3;
    var out = [];
    var curated = [];
    if (p) {
      curated = (typeof window._pdxKeyIssues === 'function')
        ? window._pdxKeyIssues(p)
        : (Array.isArray(p.issues) && p.issues.length ? p.issues
            : (Array.isArray(p.keyIssues) ? p.keyIssues : []));
      curated = curated.filter(Boolean);
    }
    if (curated.length) {
      curated.slice(0, max).forEach(function (k) {
        var lbl = k;
        try {
          if (typeof window._issueLabel === 'function') lbl = window._issueLabel(k) || k;
        } catch (e) {}
        out.push({ key: k, label: String(lbl), why: '' });
      });
      return out;
    }
    var stances = [];
    try {
      if (typeof window._resolveStanceList === 'function') stances = window._resolveStanceList(pid, p) || [];
    } catch (e) { stances = []; }
    var evMap = {};
    try {
      if (typeof window._issueEvidenceMap === 'function') evMap = window._issueEvidenceMap(pid, p) || {};
    } catch (e) { evMap = {}; }
    var ranked = stances.filter(function (s) { return s && s.topic; }).map(function (s) {
      var e = s.issueKey ? evMap[s.issueKey] : null;
      var c = (e && e.counts) || {};
      var tied = (e ? ((e.promises || []).length + (e.spotlight || []).length) : 0);
      return {
        key: s.issueKey || '',
        label: String(s.topic),
        tied: tied,
        weight: tied * 3 + (c.spotlightNegative || 0) + (c.promisesBroken || 0)
      };
    });
    ranked.sort(function (a, b) { return b.weight - a.weight; });
    ranked.slice(0, max).forEach(function (r) {
      out.push({
        key: r.key,
        label: r.label,
        why: r.tied ? (r.tied + ' linked item' + (r.tied === 1 ? '' : 's')) : 'position on file'
      });
    });
    return out;
  }

  // The single sharpest tension, chosen in a fixed order of evidentiary strength:
  // a measured Official-Record-vs-Say-vs-Do gap beats a flagged flashpoint,
  // because a gap is two independently scored feeds disagreeing rather than one
  // feed reporting something notable. Returns null when the record genuinely has
  // no contested point, and the caller says exactly that.
  function tension(pid, p) {
    var C = window.PDXConsistency;
    if (C && typeof C.divergence === 'function') {
      var d = null;
      try { d = C.divergence(pid); } catch (e) { d = null; }
      var both = (d && d.both) || [];
      // divergence() returns `both` sorted by absolute gap, biggest first.
      if (both.length && Math.abs(both[0].gap) > 15) {
        var t = both[0];
        var lbl = t.key;
        try { if (typeof window._issueLabel === 'function') lbl = window._issueLabel(t.key) || t.key; } catch (e) {}
        var higher = t.gap > 0 ? 'Their votes read better than their public record here.'
                               : 'Their public record reads better than their votes here.';
        return {
          kind: 'gap',
          issueKey: t.key,
          label: String(lbl),
          badge: Math.abs(t.gap) + ' pt gap',
          headline: 'Record and public picture disagree on ' + lbl,
          detail: higher + ' 🏛️ ' + t.off.score + '% vs 🧾 ' + t.say.score + '%.',
          cta: 'See what is behind the gap',
          open: 'gap'
        };
      }
    }
    var items = [];
    try {
      if (typeof window._pdxControversyItems === 'function') items = window._pdxControversyItems(pid, p) || [];
    } catch (e) { items = []; }
    if (items.length) {
      var it = items[0];
      return {
        kind: it.kind === 'receipt' ? 'receipt' : 'flag',
        issueKey: it.issueKey || '',
        label: (it.issue && it.issue.label) ? String(it.issue.label) : '',
        badge: (it.verdict && it.verdict.label) ? String(it.verdict.label) : 'On record',
        headline: String(it.title || 'Flagged on record'),
        detail: clip(String(it.summary || ''), 190),
        cta: it.kind === 'receipt' ? 'Open the full receipt' : 'See the flashpoints',
        open: it.kind === 'receipt' ? 'receipt' : 'jump'
      };
    }
    return null;
  }

  function tensionCard(pid, p, t) {
    var name = firstName(p);
    if (!t) {
      // The honest empty state. A profile with no contested point is a finding,
      // not a hole, and saying so beats leaving the reader to wonder whether the
      // check ran at all.
      return '<div class="pdxbr-tension pdxbr-tension-clear">' +
          '<div class="pdxbr-t-top"><span class="pdxbr-t-ico" aria-hidden="true">=</span>' +
            '<span class="pdxbr-t-badge">No documented gap</span></div>' +
          '<p class="pdxbr-t-line">Nothing on ' + esc(name) + '’s record currently contradicts itself: ' +
            'no scored gap between their votes and their public record, and no flagged flashpoint on file. ' +
            'That is what the record shows today, not a guarantee about the future.</p>' +
        '</div>';
    }
    var act = '';
    if (t.open === 'gap' && t.issueKey) {
      act = '<button type="button" class="pdxbr-t-act" onclick="if(window.PDXConsistency&&window.PDXConsistency.openGap)window.PDXConsistency.openGap(\'' +
        jsStr(pid) + '\',\'' + jsStr(t.issueKey) + '\');">' + esc(t.cta) + ' <span aria-hidden="true">→</span></button>';
    } else if (t.open === 'receipt' && t.issueKey) {
      act = '<button type="button" class="pdxbr-t-act" onclick="if(window.PDXReceipts&&window.PDXReceipts.open)window.PDXReceipts.open(\'' +
        jsStr(pid) + '\',\'' + jsStr(t.issueKey) + '\');">' + esc(t.cta) + ' <span aria-hidden="true">→</span></button>';
    } else {
      act = '<button type="button" class="pdxbr-t-act" onclick="if(window._pdxNavJump)window._pdxNavJump(\'pdxsec-controversies\');">' +
        esc(t.cta) + ' <span aria-hidden="true">↓</span></button>';
    }
    return '<div class="pdxbr-tension pdxbr-tension-' + escAttr(t.kind) + '">' +
        '<div class="pdxbr-t-top">' +
          '<span class="pdxbr-t-ico" aria-hidden="true">' + (t.kind === 'gap' ? '≠' : '⚠') + '</span>' +
          '<span class="pdxbr-t-badge">' + esc(t.badge) + '</span>' +
          (t.label ? '<span class="pdxbr-t-issue">' + esc(t.label) + '</span>' : '') +
        '</div>' +
        '<h4 class="pdxbr-t-head">' + esc(t.headline) + '</h4>' +
        (t.detail ? '<p class="pdxbr-t-line">' + esc(t.detail) + '</p>' : '') +
        act +
      '</div>';
  }

  // "What should I share or inspect next?" — the share control is the one from
  // share-anywhere.js, so it is already tier-aware: it offers the Official Record
  // card, else the Say-vs-Do receipt, else says plainly that no verdict-stamped
  // card is on file and shares the profile link. The brief does not decide what
  // is shareable; it just puts that decision where the reader can see it.
  function nextRow(pid, p, t) {
    var bits = [];
    var SA = window.PDXShareAnywhere;
    if (SA && typeof SA.buttonHtml === 'function') {
      try {
        bits.push(SA.buttonHtml({
          pid: pid,
          issueKey: (t && t.issueKey) ? t.issueKey : '',
          block: true, hint: true, text: 'Share the record'
        }));
      } catch (e) {}
    }
    // Targets are the stage rails, not individual section anchors. A rail exists
    // exactly when its stage has content, so a chip can be checked for a live
    // destination — see prune() — rather than silently scrolling nowhere the way
    // a chip aimed at a self-gating section's anchor would.
    var jumps = [
      { t: 'pdxsp-record',   ico: '🏛️', l: 'Official record' },
      { t: 'pdxsp-receipts', ico: '🧾', l: 'Say vs. do' },
      { t: 'pdxsp-money',    ico: '💰', l: 'Money' }
    ].map(function (j) {
      return '<button type="button" class="pdxbr-jump" data-pdxbr-to="' + escAttr(j.t) + '"' +
          ' onclick="if(window._pdxNavJump)window._pdxNavJump(\'' + jsStr(j.t) + '\');">' +
          '<span aria-hidden="true">' + j.ico + '</span> ' + esc(j.l) +
        '</button>';
    }).join('');
    return '<div class="pdxbr-next">' +
        '<div class="pdxbr-next-lbl">Share or inspect next</div>' +
        (bits.length ? '<div class="pdxbr-next-share">' + bits.join('') + '</div>' : '') +
        '<div class="pdxbr-jumps">' + jumps + '</div>' +
      '</div>';
  }

  // briefHtml — the first screen below the letterhead. Self-gating on substance:
  // with neither a signature issue nor a tension nor a share tier there is
  // nothing to brief, and the profile's own thin-record notice already handles
  // that case better than an empty card would.
  function briefHtml(pid, p) {
    if (!pid) return '';
    p = p || {};
    var sigs = [];
    try { sigs = signatureIssues(pid, p, 3); } catch (e) { sigs = []; }
    var t = null;
    try { t = tension(pid, p); } catch (e) { t = null; }
    if (!sigs.length && !t) return '';

    var name = firstName(p);
    var sigHtml = sigs.length
      ? '<div class="pdxbr-sigs">' + sigs.map(function (s) {
          var tap = s.key
            ? ' onclick="if(window.PDXIssueView&&window.PDXIssueView.open)window.PDXIssueView.open(\'' + jsStr(s.key) + '\');"'
            : '';
          return '<button type="button" class="pdxbr-sig"' + tap +
              ' title="' + escAttr('Where ' + name + ' stands on ' + s.label) + '">' +
              '<span class="pdxbr-sig-lbl">' + esc(s.label) + '</span>' +
              (s.why ? '<span class="pdxbr-sig-why">' + esc(s.why) + '</span>' : '') +
            '</button>';
        }).join('') + '</div>'
      : '<p class="pdxbr-none">No documented positions on file yet — the record below shows what is tracked so far.</p>';

    return '<section class="pdxbr" aria-label="' + escAttr('The short version of ' + (p.name || 'this profile')) + '">' +
        '<div class="pdxbr-grid">' +
          '<div class="pdxbr-col">' +
            '<div class="pdxbr-col-lbl">What defines them</div>' +
            sigHtml +
          '</div>' +
          '<div class="pdxbr-col">' +
            '<div class="pdxbr-col-lbl">Where the tension is</div>' +
            tensionCard(pid, p, t) +
          '</div>' +
        '</div>' +
        nextRow(pid, p, t) +
      '</section>';
  }

  // hydrate(root) — called SYNCHRONOUSLY by the caller in the same task that set
  // innerHTML, before the browser has had a chance to paint. That ordering is
  // deliberate: pruning a jump chip whose stage did not render removes a node,
  // and a node removed after paint is a layout shift. Removed in the same task,
  // it is invisible.
  //
  // Only the share control is left to settle asynchronously, and it is fail-open
  // and fixed-size by construction (see share-anywhere.js), so its hydration
  // swaps a glyph and a line of hint text without resizing anything.
  function prune(root) {
    var scope = root || document;
    var chips;
    try { chips = scope.querySelectorAll('.pdxbr-jump[data-pdxbr-to]'); } catch (e) { return; }
    for (var i = 0; i < chips.length; i++) {
      var to = chips[i].getAttribute('data-pdxbr-to');
      // hasTarget rather than getElementById: a chip aimed into a deferred drawer
      // has a real destination that simply has not been mounted yet, and deleting
      // it would turn a performance optimisation into a missing control. Today's
      // chips all target stage rails, which are never deferred, so this costs one
      // lookup per chip and changes nothing — it is here so that stops being a
      // load-bearing coincidence.
      if (to && !hasTarget(to) && chips[i].parentNode) {
        chips[i].parentNode.removeChild(chips[i]);
      }
    }
  }

  function hydrate(root) {
    try { prune(root); } catch (e) {}
    try {
      var SA = window.PDXShareAnywhere;
      if (SA && typeof SA.hydrateSoon === 'function') SA.hydrateSoon(root || document);
    } catch (e) {}
  }

  window.PDXProfileSpine = {
    STAGES: STAGES,
    STAGE_KEYS: STAGE_KEYS,
    stage: stageMeta,
    assemble: assemble,
    assembleTagged: assembleTagged,
    drawer: drawer,
    briefHtml: briefHtml,
    hydrate: hydrate,
    // Progressive disclosure inside an always-open section. Renderers mark a
    // digest/bulk seam with a comment pair and stay out of the DOM; assembleTagged
    // resolves them, and any surface that re-renders one section on its own —
    // rather than reassembling the profile — has to run this itself.
    applyLids: applyLids,
    // Deferred drawer inners. materialize() takes a drawer id, revealFor() takes
    // any element id inside one; hasTarget() answers "does this destination
    // exist" for both mounted and still-stashed content.
    materialize: materialize,
    revealFor: revealFor,
    hasTarget: hasTarget,
    _deferredIds: function () { return Object.keys(DEFER); },
    // Exposed for tests and for any surface that wants the same reads without
    // the markup — never for a second, divergent rendering of the brief.
    _signatureIssues: signatureIssues,
    _tension: tension
  };
})();
