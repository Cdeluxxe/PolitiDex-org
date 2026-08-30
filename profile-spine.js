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
  // The issue colour. Same module, same helper shape and same failure behaviour as
  // the bill letterhead chip, so the issue named at the top of a person file is the
  // colour that issue is everywhere else — including on the Word vs Action section
  // this card points down at.
  //   THE BADGE KEEPS ITS OWN VOCABULARY. "Contradiction On Record" is a verdict
  // word and stays verdict-amber; only the issue chip beside it takes the issue
  // colour. Two meanings, two colours, on purpose.
  function issueTint(key) {
    try {
      var IC = window.PDXIssueColors;
      if (!IC || typeof IC.styleFor !== 'function') return '';
      var st = IC.styleFor(key);
      return st ? ' data-ic="on" style="' + escAttr(st) + '"' : '';
    } catch (e) { return ''; }
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
  // it answers — which is why personal-alignment blocks are collected into one
  // `you` stage instead of appearing at three different depths.
  //
  // The sequence below is an ACCOUNTABILITY PATH, not a catalogue of systems. Its
  // shape is five claims, in this order:
  //
  //   THE RECORD COMES FIRST, AS A SUMMARY. `standout` is the formal ledger's own
  //   stage, and it holds the slot Word vs Action used to hold. That swap is the
  //   whole of this stage's reason to exist. Word vs Action needs a documented
  //   position on file before it can say anything, so on a profile with a deep
  //   roll-call ledger and a thin stance ledger it opened the page with "Not scored
  //   yet" — a fact about our coverage, printed above dozens of issues of their
  //   record. The record is what we hold most of, so the record leads. It is a
  //   selection, never a score: no percentage is published at this stage and none
  //   can be derived from it.
  //
  //   IT IS A SUMMARY AND NOT AN ATLAS, AND THAT IS NEW. This stage used to carry
  //   the standout strip AND the full issue-by-issue formal list beneath it — on a
  //   member with a deep ledger, fifty-odd rows between the reader and everything
  //   else on the page. The strip stays; the flat list moved down into `explore`,
  //   behind one closed control, because the topic tree is already an index of the
  //   same rows and a page does not need two. What is left here is counts plus a
  //   handful of chips.
  //
  //   THEN THE GATEWAY. `explore` is 🌳 All Issues by Topic and nothing that
  //   competes with it: the one surface a reader browses the record issue by issue
  //   from, sitting between the summary that says what the record points to and the
  //   score that tests it against their word. It is deliberately AHEAD of the
  //   verdict now. Word vs Action is a strong read and a narrow one — it can only
  //   speak where a stated position is on file — so putting the browse-everything
  //   surface behind it made the widest door the third one a reader met. The flat
  //   formal list rides in this stage too, collapsed, as the alternate view of the
  //   index rather than as a second one.
  //
  //   THEN THE JUDGMENT. `verdict` holds one thing — the Word vs Action read — and
  //   it is the first SCORED surface, immediately under the record it is scoring
  //   against. It used to be the opening block of `record`, which meant the primary
  //   finding arrived as the header of a system rather than as the site's answer.
  //   There is still exactly one score; giving it its own stage is what makes that
  //   legible, and demoting it one place is what stops the page reading as though
  //   an unscored issue were an empty one. Word vs Action is also the ONLY integrity
  //   section: the say-vs-do read and the record-vs-public-picture bridge that used
  //   to occupy stages of their own are inputs to its rows now, not neighbours of it.
  //
  //   WHAT THEY STAND FOR IS READ IN THE EXPLORE STAGE, NOT HERE. `signature` was
  //   🧭 Stances & Connections — a second, tension-ranked browser over the same
  //   person×issue set 🌳 All Issues by Topic already lists, mounted below it as a
  //   peer. One browse surface and one deep dive is the rule now: the tree is the
  //   browse (it carries a Topic | Tension order control for the ranking the flat
  //   list used to own) and the issue dossier is the depth. What is left in this
  //   stage is the deferred "every documented position" drawer, which is an archive
  //   of the full text rather than a second index of it.
  //
  //   THEN THE ACTIONS. `record` is one office-aware gateway — executive actions,
  //   roll-call votes, or both lanes for someone who has served in both kinds of
  //   office. One section, whatever the office.
  //
  //   THEN THE HEAT, THEN THE PROOF. `tension` is 🔥 Flashpoints and nothing else:
  //   the biggest contradictions and disputes, short and sourced. It is not a second
  //   scoring system and it is not the home for all the evidence — `receipts` is the
  //   shared proof layer every surface above links into.
  //
  //   THE READER'S OWN STAKE, THEN THE DRAWERS. `money` is a lens of its own and
  //   must not read as an integrity score, so it sits after the evidence and before
  //   the alignment tail; the collapsed full tables close the profile.
  // The order below IS the profile's reading order, and it answers one question
  // per stage.
  var STAGES = [
    { key: 'identity',  label: 'Identity',            ask: 'Who is this?' },
    { key: 'brief',     label: 'The short version',   ask: 'What should I look at first?' },
    { key: 'standout',  label: 'The record',          ask: 'What does their record point to?' },
    { key: 'explore',   label: 'Explore by topic',    ask: 'Where do they land, issue by issue?' },
    { key: 'verdict',   label: 'Word vs Action',      ask: 'Do they stand by what they said?' },
    { key: 'signature', label: 'Stances & connections', ask: 'What do they stand for?' },
    { key: 'record',    label: 'Official record',     ask: 'What did they actually do?' },
    { key: 'tension',   label: 'Flashpoints',         ask: 'Where is the heat?' },
    { key: 'receipts',  label: 'Evidence',            ask: 'Where are the receipts?' },
    { key: 'money',     label: 'Money',               ask: 'Who funds them, and who does the record touch?' },
    { key: 'you',       label: 'You and them',        ask: 'How does this map to my own positions?' },
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

  function stageRank(key) {
    var i = STAGE_KEYS.indexOf(key);
    return i === -1 ? STAGES.length : i;
  }

  // ── Anchors → stages ────────────────────────────────────────────────────────
  // Every id a jump-rail pill can aim at, and the stage that id lives in. This
  // registry is what lets the rail DERIVE its order rather than declare it.
  //
  // Until now the rail order was the order the pill-pushing code happened to run
  // in: a second, hand-maintained copy of a decision already recorded in STAGES,
  // free to drift from it in silence. It had drifted. The Record pill sat fifth of
  // ten while its destination lives inside the promises drawer at the foot of the
  // page, so tapping the middle of the rail threw the reader to the bottom. A rail
  // that disagrees with the page also makes the active pill walk BACKWARDS while
  // scrolling, because the spy indexes pills but measures sections.
  //
  // Grouped by stage rather than alphabetically, so this reads as the answer to
  // the question where does this pill send me. Four anchors are emitted by other
  // modules and are noted as such; the rest are literals in the profile template.
  // Anything absent resolves to the deep end, matching the unknown-stage rule in
  // assemble() — an unrecognised destination is demoted, never promoted.
  var TARGET_STAGE = {
    // verdict — the one primary score, and the only integrity section. Anchor
    // emitted by word-action.js.
    'pdxsec-wordaction': 'verdict',
    // explore — 🌳 All Issues by Topic, the browse gateway, now mounted ABOVE the
    // score rather than under it. Anchor emitted by stance-tree.js.
    // `pdxsec-glance` is its LEGACY ALIAS and lives in this stage for that reason:
    // the flat Stance at a Glance index it used to name is unmounted, and the tree
    // is the browse-all-stances surface every jump into "their stated positions"
    // should now land on.
    'pdxsec-stancetree': 'explore',
    'pdxsec-glance': 'explore',
    // …and so is `pdxsec-stances`, for exactly the same reason. 🧭 Stances &
    // Connections is unmounted — it was a second issue browser below the tree — and
    // the tree emits that id as an alias too, so a jump or a deep link naming it
    // resolves to the surface that actually holds those positions rather than being
    // demoted to a stage whose only remaining content is a closed drawer.
    'pdxsec-stances': 'explore',
    // 🏛 The flat formal atlas — every issue on the formal record, one row each.
    // IT IS IN `explore` AND NOT IN `standout`, WHICH IS THE POINT OF THIS PASS. It
    // spent a pass sitting between the standout strip and the score as an open
    // fifty-row wall: a second full inventory of exactly the rows the tree below it
    // was about to index again. It is now the tree's ALTERNATE VIEW — same stage,
    // directly under the tree, behind one closed control — so the anchor still
    // resolves for every existing deep link and the list is still one tap from the
    // page, but the default read is the gateway rather than the wall.
    'pdxsec-formalatlas': 'explore',
    // standout — the compact formal summary, ahead of the gateway: inventory
    // counts and a handful of strongest/split chips, each a door into the same
    // dossier the tree opens. Emitted by consistency.js.
    'pdxsec-standout': 'standout',
    // signature — the deferred archive of every documented position, in full text.
    'pdxsec-positions': 'signature',
    // record — the formal apparatus behind the verdict
    'pdxsec-exec-record': 'record',
    'pdxsec-official-record': 'record',
    'pdxsec-verify': 'record',
    // tension — Flashpoints, and only Flashpoints. Anchor emitted by
    // controversies.js. `pdxsec-divergence` used to live here; the section it
    // pointed at compared two per-issue verdict systems that are now one, so it no
    // longer mounts and no longer has a stage.
    'pdxsec-controversies': 'tension',
    // receipts — the shared proof layer every surface above links into.
    // `pdxsec-saydo` used to live here; the public record is an input to the issue
    // rows now rather than a section of its own.
    'pdxsec-evidence': 'receipts',
    // 🕳 What the record can't test yet — the citable gaps surface, emitted by
    // gaps.js. It is in `receipts` and not beside the score on purpose: it is a
    // statement about the archive's own coverage, which belongs with the proof
    // layer rather than in the stage where a finding is published. person-file.js
    // maps the short hash `#gaps` to this id.
    'pdxsec-gaps': 'receipts',
    // money — funding and who the record touches. Funding anchor lives in index.html.
    // A lens of its own, deliberately after the proof layer so it never reads as
    // part of the integrity argument.
    'pdxsec-funding': 'money',
    'pdxsec-impact': 'money',
    'pdxsec-contracts': 'money',
    // you — the reader’s own stake
    'pdxsec-match': 'you',
    'pdxsec-compare': 'you',
    // drawers — destinations that really do sit inside the full-record drawers, and
    // are therefore reached through a reveal rather than a plain scroll. Anchor for
    // the voting record is emitted by voting-record.js into the votes drawer. The
    // two pledge anchors joined them when the promise ledger stopped being a
    // section: promises feed the one score, so they are raw material, not a stage.
    'pdxsec-score': 'drawers',
    'pdxsec-promise-tracker': 'drawers',
    'pdxsec-record': 'drawers',
    'pdxsec-voting': 'drawers',
    'pdxsec-activity': 'drawers'
  };

  function stageOfTarget(t) {
    return TARGET_STAGE[String(t == null ? '' : t)] || null;
  }

  // railOrder(items) — sort jump-rail pills into spine order.
  //
  // Stable within a stage, so the order the pushes run in still decides ties and
  // the source keeps reading top to bottom. Two rules make it safe to hand this an
  // arbitrary list:
  //
  //   An item with no target — the Full Report pill opens an overlay instead of
  //   scrolling — has no stage of its own, so it INHERITS the rank of the item it
  //   follows. That is what keeps it attached to Positions without Positions
  //   needing to know it exists.
  //
  //   An item whose target is unregistered sorts to the deep end, so a new anchor
  //   that nobody remembered to register lands beside the drawers instead of
  //   ahead of the verdict.
  function railOrder(items) {
    // `inherit` starts at the deep end, not at 0. An action pill carries no anchor
    // of its own and takes the rank of the last anchored pill ahead of it — but if
    // there is no anchored pill ahead of it, it has declared no position at all, and
    // a pill with no declared position must sink for the same reason an unregistered
    // target does. Seeding at 0 floated it above the verdict instead, which is only
    // invisible because the one action pill we ship always follows Positions.
    var ranked = [], inherit = STAGES.length;
    (items || []).forEach(function (it, i) {
      if (!it) return;
      var r = it.target ? stageRank(stageOfTarget(it.target)) : inherit;
      if (it.target) inherit = r;
      ranked.push({ it: it, r: r, i: i });
    });
    ranked.sort(function (a, b) { return (a.r - b.r) || (a.i - b.i); });
    return ranked.map(function (x) { return x.it; });
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

  // The single sharpest tension: the top-ranked 🔥 Flashpoint, which is the
  // section this card is the trailer for. Returns null when the record genuinely
  // has no contested point, and the caller says exactly that.
  //
  // THE RECORD-VS-PUBLIC-PICTURE BRANCH IS GONE. It ran first and outranked every
  // flashpoint, on the theory that "two independently scored feeds disagreeing"
  // is stronger evidence than one feed reporting something notable. That theory
  // died when the public record became an INPUT to the issue row rather than a
  // rival feed: there is no second score left for the first to disagree with.
  // What survived was the display — 'Record and public picture disagree on X',
  // badged '100 pt gap', detailed '🏛️ 100% vs 🧾 0%' — a two-percentage
  // divergence panel mounted above the fold, on the one profile in the roster
  // whose thin curated feed still produced a gap over the threshold. That is the
  // exact surface the spine unmounted three sections lower down, and a reader met
  // it before they met the score it was arguing with.
  //
  // divergence() itself is untouched and still exported: the gap sheet, the
  // `#record=` deep link and the share card are legitimate callers. The brief is
  // not one, because the brief is above the fold.
  function tension(pid, p) {
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
    return recordTension(pid);
  }

  // ── The second source, and only when the first is empty ────────────────────
  // tension() read flashpoints alone. A profile with no curated flashpoint
  // therefore printed "no issue where what they said and what they did came out
  // against them" above the fold while the Word vs Action section below it
  // counted exactly those issues — 59 profiles in the current roster, 89 rows
  // between them. The brief was not empty there, it was wrong, and a reader who
  // never scrolled left with a clean bill of health the record does not support.
  //
  // NOTHING IS RE-DERIVED HERE. It reads the rows the one verdict system already
  // published, keeps that row's own verdict label, and lands on the section that
  // prints them. No percentage and no second score: the badge is the same heat
  // word controversies.js hands a contradicts-class item (see heatChip), and the
  // only number is a count of rows.
  //
  // FORMAL LANE ONLY. A row the reported record decided (basis 'public_record')
  // is not "what they said against what they did", and the public lane is not in
  // Direction Match — so it is not a tension this card may claim. The ranking is
  // the module's own rankIssueRows, so the issue named up here is the same one
  // that leads the list down there.
  function recordTension(pid) {
    var C = window.PDXConsistency;
    if (!C || typeof C.issueRows !== 'function') return null;
    var hits = [];
    try {
      hits = (C.issueRows(pid) || []).filter(function (r) {
        return r && r.verdict && r.verdict.token === 'contradicts' &&
               r.verdict.basis !== 'public_record';
      });
      if (typeof C.rankIssueRows === 'function') hits = C.rankIssueRows(hits) || hits;
    } catch (e) { return null; }
    if (!hits.length) return null;
    var top = hits[0];
    var label = String(top.label || 'this issue');
    var more = hits.length - 1;
    return {
      kind: 'flag',
      issueKey: top.key || '',
      label: label,
      badge: 'Contradiction On Record',
      headline: String((top.verdict && top.verdict.label) || 'Says one thing, does another'),
      detail: 'On ' + label + ' the formal record ran against the position on file' +
        (more ? ' — and on ' + more + ' other issue' + (more === 1 ? '' : 's') : '') +
        '. That is the Word vs Action result for ' + (more ? 'those rows' : 'that row') +
        ', not a second finding on top of it.',
      cta: 'See it in Word vs Action',
      open: 'wordaction'
    };
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
            'no issue where what they said and what they did came out against them, and no flagged flashpoint on file. ' +
            'That is what the record shows today, not a guarantee about the future.</p>' +
        '</div>';
    }
    var act = '';
    // No 'gap' arm. The brief no longer produces one — see tension() above — and an
    // unreachable route into the divergence sheet is how that surface comes back.
    if (t.open === 'wordaction') {
      // recordTension()'s rows are printed by the Word vs Action section, not by
      // the flashpoint list, so that is where its button lands. Same jump helper,
      // same mounted anchor the section nav already uses.
      act = '<button type="button" class="pdxbr-t-act" onclick="if(window._pdxNavJump)window._pdxNavJump(\'pdxsec-wordaction\');">' +
        esc(t.cta) + ' <span aria-hidden="true">↓</span></button>';
    } else if (t.open === 'receipt' && t.issueKey) {
      act = '<button type="button" class="pdxbr-t-act" onclick="if(window.PDXReceipts&&window.PDXReceipts.open)window.PDXReceipts.open(\'' +
        jsStr(pid) + '\',\'' + jsStr(t.issueKey) + '\');">' + esc(t.cta) + ' <span aria-hidden="true">→</span></button>';
    } else {
      act = '<button type="button" class="pdxbr-t-act" onclick="if(window._pdxNavJump)window._pdxNavJump(\'pdxsec-controversies\');">' +
        esc(t.cta) + ' <span aria-hidden="true">↓</span></button>';
    }
    return '<div class="pdxbr-tension pdxbr-tension-' + escAttr(t.kind) + '">' +
        '<div class="pdxbr-t-top">' +
          '<span class="pdxbr-t-ico" aria-hidden="true">⚠</span>' +
          '<span class="pdxbr-t-badge">' + esc(t.badge) + '</span>' +
          (t.label ? '<span class="pdxbr-t-issue"' + issueTint(t.issueKey) + '>' + esc(t.label) + '</span>' : '') +
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
    // Chip labels are the STAGE names, not the names of sections that used to sit
    // in them. This middle chip read "Say vs. do" — a retired peer product, named
    // above the fold, pointing at the shared evidence layer that replaced it.
    // 💰 MONEY IS THE ONE CHIP HERE THAT AIMS AT A SECTION RATHER THAN A STAGE,
    // AND IT AIMS AT THE SAME ONE THE LETTERHEAD CHIP DOES. It used to target
    // `pdxsp-money`, the money STAGE rail — which lands a reader on the stage
    // header above three sections (funding, impact, contracts) and leaves them to
    // find the filing. The letterhead 💰 chip, meanwhile, jumps to
    // `pdxsec-funding`. Two money controls on one page arriving at two different
    // places is two doors into what the page insists is one lane, and the reader
    // who taps both learns that the site is not sure where its money lives.
    //   So both go through PDXFinanceLane.openSection(), which owns the jump:
    // it reveals a deferred stage before measuring the scroll and focuses the
    // section on arrival. The `data-pdxbr-to` attribute carries the real
    // destination so prune() checks the section this chip actually opens, and
    // _pdxNavJump stays as the fallback for a page where the lane never loaded.
    var jumps = [
      { t: 'pdxsp-record',   ico: '🏛️', l: 'Official record' },
      { t: 'pdxsp-receipts', ico: '🧾', l: 'Evidence' },
      { t: 'pdxsec-funding', ico: '💰', l: 'Money', lane: true }
    ].map(function (j) {
      // Built raw and escaped once, on the way into the attribute — the ids are
      // literal constants above, but escAttr is what makes that a property of the
      // code rather than of the current contents of the array.
      var fall = "if(window._pdxNavJump){window._pdxNavJump('" + j.t + "');}";
      var act = j.lane
        ? "if(window.PDXFinanceLane&&window.PDXFinanceLane.openSection)" +
          "{window.PDXFinanceLane.openSection();}else " + fall
        : fall;
      return '<button type="button" class="pdxbr-jump" data-pdxbr-to="' + escAttr(j.t) + '"' +
          ' onclick="' + escAttr(act) + '">' +
          '<span aria-hidden="true">' + j.ico + '</span> ' + esc(j.l) +
        '</button>';
    }).join('');
    return '<div class="pdxbr-next">' +
        '<div class="pdxbr-next-lbl">Share or inspect next</div>' +
        (bits.length ? '<div class="pdxbr-next-share">' + bits.join('') + '</div>' : '') +
        '<div class="pdxbr-jumps">' + jumps + '</div>' +
      '</div>';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     twoJobsMount — the frame, before either surface makes a claim
     ───────────────────────────────────────────────────────────────────────
     WHAT IT FIXES. A profile publishes two different things and readers were
     collapsing them into one. 🏛 The formal record is an INVENTORY with a
     direction: every issue where votes or formal actions are on file, and which
     way those acts pointed. ⚖️ Word vs Action is a TEST, and it can only run
     where a stated position is also on file — so it speaks about a fraction of
     the issues the record covers. Read as one thing, the percentage becomes
     "the score for this person", and every issue the test could not reach reads
     as something withheld.

     WHY THE ASYMMETRY IS SAID OUT LOUD. It is the normal shape of the data, not
     a hole in it: most issues have a record and nothing quotable to test it
     against. A reader who is not told that will infer the worse explanation.
     Where both counts are known the note prints them, because "far more" is an
     argument and "43 · 12" is the thing itself.

     FOUR WALLS.

       IT COMPUTES NOTHING. Both numbers come from the accessors the two
       surfaces already publish — PDXConsistency.formalPatternIndex.count() and
       PDXWordAction.testedOf(read()), which is the same call that prints the
       depth caption beside the percentage — so the note cannot disagree with
       either surface, and there is no third figure on this page.

       IT JUDGES NOTHING. It names the mechanism of each read and states what
       the narrow one is not. No position, politician or party is characterised,
       and nothing here can be read as good or bad.

       IT LEAVES. PDXLearn.note() remembers the dismissal per visitor through
       PDXStore, so this module renders nothing at all on a later visit once the
       × has been tapped. A returning reader is not taxed with it again.

       IT FAILS CLOSED. No education layer, no note. No counts, no count line —
       the sentence that says the asymmetry in words still stands on its own.
       And if the tested count ever came back at or above the record count, the
       asymmetry the line describes is not there, so the line is dropped rather
       than printed backwards.

     MOUNTED, NOT INTERPOLATED, for exactly the reason the letterhead's score
     chip is: on a member profile the identity zone is built while the roll-call
     record is still in flight, so neither count is knowable at first paint. The
     prose renders immediately and never moves; the counts arrive into their own
     span on 'pdx-consistency-warm', the same seam every other cold-start figure
     on this page already uses.
     ═══════════════════════════════════════════════════════════════════════ */
  var TWO_JOBS_ID = 'profile-two-jobs';
  var _tjSeq = 0;

  // Read-only, from the two surfaces' own published accessors. Never derived here.
  function twoJobsCounts(pid, p) {
    var recorded = 0, tested = 0;
    try {
      var C = window.PDXConsistency;
      if (C && C.formalPatternIndex && typeof C.formalPatternIndex.count === 'function') {
        recorded = C.formalPatternIndex.count(pid) || 0;
      }
    } catch (e) { recorded = 0; }
    try {
      var W = window.PDXWordAction;
      if (W && typeof W.read === 'function' && typeof W.testedOf === 'function') {
        tested = W.testedOf(W.read(pid, p || {})) || 0;
      }
    } catch (e) { tested = 0; }
    return { recorded: recorded, tested: tested };
  }

  // The count line, or '' when the two numbers cannot honestly carry it.
  function twoJobsCountLine(pid, p) {
    var c = twoJobsCounts(pid, p);
    if (!c.recorded || !c.tested || c.tested >= c.recorded) return '';
    return 'Here: <b>' + c.recorded + '</b> issues with a formal record · <b>' + c.tested +
      '</b> with a position to test against it.';
  }

  function twoJobsNoteHtml(pid, p, uid) {
    var L = window.PDXLearn;
    // One door into the glossary, on the phrase that carries the whole point.
    var untestable = (typeof L.term === 'function')
      ? L.term('notscored', 'nothing quotable to test it against')
      : 'nothing quotable to test it against';
    return L.note(TWO_JOBS_ID, {
      icon: '🧭',
      title: 'This profile does two different jobs.',
      html:
        '<p>🏛 <b>The record</b> — the main view. Every issue where their votes or formal ' +
          'actions are on file, and which way those acts pointed.</p>' +
        '<p>⚖️ <b>Word vs Action</b> — the narrow one. It runs only where they also stated ' +
          'a position, and asks: did the formal record point the same way? An integrity ' +
          'check, not an approval rating or an overall grade.</p>' +
        '<p>Most issues have a record and ' + untestable + ', so the record covers far more ' +
          'ground than the percentage. That asymmetry is the honest shape of the data, not ' +
          'a finding about them.</p>' +
        '<p class="pdxsp-tj-counts" data-pdxsp-tj="' + escAttr(uid) + '">' +
          twoJobsCountLine(pid, p) + '</p>'
    });
  }

  // Warm seam. Self-removing: once the note has been dismissed its wrapper is gone
  // from the document, so the next warm event unbinds instead of resurrecting it.
  function bindTwoJobs(uid, pid, p) {
    if (!window.addEventListener) return;
    var handler = function (ev) {
      var host = null;
      try { host = document.querySelector('[data-pdxsp-tj="' + uid + '"]'); } catch (e) { host = null; }
      if (!host) { window.removeEventListener('pdx-consistency-warm', handler); return; }
      if (ev && ev.detail && ev.detail.pid && String(ev.detail.pid) !== String(pid)) return;
      try { host.innerHTML = twoJobsCountLine(pid, p); } catch (e) {}
    };
    window.addEventListener('pdx-consistency-warm', handler);
  }

  function twoJobsMount(pid, p) {
    try {
      if (!pid) return '';
      var L = window.PDXLearn;
      if (!L || typeof L.note !== 'function') return '';
      // Cheap pre-check so a returning visitor costs no uid, no listener and no
      // read of either engine. note() would return '' anyway; this is the wall
      // that keeps the dismissed case genuinely free.
      if (typeof L.noteDismissed === 'function' && L.noteDismissed(TWO_JOBS_ID)) return '';
      var uid = ('tj-' + String(pid) + '-' + (++_tjSeq)).replace(/[^A-Za-z0-9_-]/g, '');
      var html = twoJobsNoteHtml(pid, p || {}, uid);
      if (!html) return '';
      try { setTimeout(function () { bindTwoJobs(uid, pid, p || {}); }, 0); } catch (e) {}
      return '<div class="pdxsp-twojobs">' + html + '</div>';
    } catch (e) { return ''; }
  }

  // ── emptyFileNoteHtml — why this file is empty, said once, near the top ────
  // THE PROBLEM. An empty formal record looks the same from the outside whatever
  // put it there. A member seated after the last session PolitiDex holds, a
  // former member who left before the earliest one, a candidate never seated,
  // and a file we simply have not built yet all render as the same blank — and a
  // blank in a product about accountability reads as an accusation. It is not
  // one. It is a statement about our own coverage.
  //
  // THE FIX IS NOT A GUESS. This prints only the reviewed sentence that ships in
  // formal-index.js (from db/vr-utah-empty-file-notes.json), and only for a pid
  // the index agrees holds no formal act. With no reviewed note there is no
  // sentence: the surface stays as it was rather than inventing a reason, which
  // is the whole point of keeping the notes hand-written.
  //
  // WHERE IT SITS AND WHY. In the BRIEF stage, above the record — because on a
  // file with nothing on the formal record the pledge leftovers further down are
  // the only numbers on the page, and a reader who meets them first has been
  // told the opposite of the truth by ordering alone. It is one line, no chip,
  // no count and no colour: an empty file does not get a badge.
  //
  // IT IS NOT A VERDICT AND SAYS SO. The label is "Documentation status", not
  // "Record", and the sentence never characterises the person — see the note
  // file's own header for the five reason codes it is allowed to draw on.
  function emptyFileNoteHtml(pid, p) {
    if (!pid) return '';
    var note = null;
    try {
      var FX = window.PDXFormalIndex;
      if (FX && typeof FX.emptyNote === 'function') note = FX.emptyNote(pid);
    } catch (e) { note = null; }
    if (!note || !note.note) return '';
    // A live record beats a generated count. If the fetch has already landed and
    // it holds rows, the index is behind the database and this note would be the
    // stale half — so it stands down rather than contradict the record on screen.
    try {
      var VR = window.PDXVotingRecord;
      var recs = VR && typeof VR.memberRecords === 'function' ? VR.memberRecords(pid) : null;
      if (recs && recs.length) return '';
    } catch (e) {}
    p = p || {};
    return '<section class="pdxsp-emptywhy" aria-label="' +
        escAttr('Why PolitiDex holds no formal record for ' + (p.name || 'this person')) + '">' +
        '<div class="pdxsp-emptywhy-lbl">Documentation status</div>' +
        '<p class="pdxsp-emptywhy-p">' +
          '<b>PolitiDex holds no formal act for this file.</b> ' + esc(note.note) +
        '</p>' +
        '<p class="pdxsp-emptywhy-foot">This is a note about our coverage, not a finding about ' +
          esc(firstName(p)) + '. Nothing below has been tested against a vote.</p>' +
      '</section>';
  }

  // WHERE A SIGNATURE CHIP LANDS.
  // It used to go straight to PDXIssueView - the ranked overlay of PEOPLE on an
  // issue - which was the wrong destination twice over. A chip on a PERSON that
  // opens a league table of persons answers a question nobody asked; and the
  // curated `issues` list these chips are usually built from holds DISPLAY LABELS
  // ("Public Lands"), not vocabulary keys, so that overlay could not resolve them
  // and quietly widened them into whichever core issue happened to sort first -
  // an unrelated issue, opened silently.
  //   So: a chip whose key is a real vocabulary key opens that key's own page
  // (/issue/<key>, every measure mapped to it). Anything else keeps the old
  // behaviour, because a label is not a key and this file will not guess which
  // key a curator meant.
  function sigTapJs(key) {
    var k = jsStr(key);
    return "var K='" + k + "';" +
      "if(window.PDXIssuePage&&window.PDXIssuePage.has(K)){window.PDXIssuePage.open(K);}" +
      "else if(window.PDXIssueView&&window.PDXIssueView.open){window.PDXIssueView.open(K);}";
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
          var tap = s.key ? ' onclick="' + sigTapJs(s.key) + '"' : '';
          return '<button type="button" class="pdxbr-sig"' + tap +
              ' title="' + escAttr('Where ' + name + ' stands on ' + s.label) + '">' +
              '<span class="pdxbr-sig-lbl">' + esc(s.label) + '</span>' +
              (s.why ? '<span class="pdxbr-sig-why">' + esc(s.why) + '</span>' : '') +
            '</button>';
        }).join('') + '</div>'
      : '<p class="pdxbr-none">No documented positions on file yet — the record below shows what is tracked so far.</p>';

    // The closed-row gists. Both are drawn from what the body already prints —
    // the issue labels themselves, and the tension card's own badge — so the row
    // can never name something the block behind it does not contain.
    var sigGist = sigs.length
      ? sigs.map(function (s) { return s.label; }).join(' · ')
      : 'Nothing on file yet';
    var tGist = t ? (t.badge || 'Contested') : 'No documented gap';

    return '<section class="pdxbr" aria-label="' + escAttr('The short version of ' + (p.name || 'this profile')) + '">' +
        '<div class="pdxbr-grid">' +
          fold('What defines them', sigGist, sigHtml) +
          fold('Where the tension is', tGist, tensionCard(pid, p, t)) +
        '</div>' +
        nextRow(pid, p, t) +
      '</section>';
  }

  // fold(label, gist, body) — one compact row of the brief.
  //
  // These two blocks used to render open, side by side on a desktop and stacked
  // on a phone: three signature-issue buttons with a sentence of rationale each,
  // then a tension card with a badge, a headline, a paragraph and a control.
  // Between the letterhead and the Word-vs-Action graph that is most of a phone
  // screen, and it is context — worth having, not worth spending the first screen
  // on. Closed, each is a single row: the label, and a gist that already answers
  // the question at chip length ("Healthcare · Immigration · Guns", "Says one
  // thing, does another"). A reader who wants the reasoning taps the row.
  //
  // The gist is a SUMMARY OF THE BODY, never a second finding — it repeats words
  // the body prints in full and adds nothing the body does not say.
  function fold(label, gist, body) {
    return '<details class="pdxbr-fold">' +
        '<summary class="pdxbr-fold-s">' +
          '<span class="pdxbr-col-lbl">' + esc(label) + '</span>' +
          (gist ? '<span class="pdxbr-fold-g">' + esc(gist) + '</span>' : '') +
          '<span class="pdxbr-fold-x" aria-hidden="true"></span>' +
        '</summary>' +
        '<div class="pdxbr-col">' + body + '</div>' +
      '</details>';
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
    // The rail derives its order from the stage each destination lives in, so the
    // pill sequence and the page sequence cannot disagree. railOrder() sorts a list
    // of pill descriptors; targetStage() answers the same question for one id, and
    // is what the scroll-spy and the tests use to check themselves.
    railOrder: railOrder,
    targetStage: stageOfTarget,
    stageRank: stageRank,
    assemble: assemble,
    assembleTagged: assembleTagged,
    drawer: drawer,
    briefHtml: briefHtml,
    // One line, in the brief stage, on a file with nothing on the formal record
    // and a reviewed reason why. Reads formal-index.js and nothing else; returns
    // '' for every file that has a record or has no reviewed note.
    emptyFileNoteHtml: emptyFileNoteHtml,
    // 🧭 The two-jobs explainer, mounted in the identity zone above everything
    // that makes a claim. Dismissible and remembered per visitor by PDXLearn; it
    // computes nothing and reads both counts off the surfaces that publish them.
    twoJobsMount: twoJobsMount,
    TWO_JOBS_ID: TWO_JOBS_ID,
    _twoJobsCounts: twoJobsCounts,
    _twoJobsCountLine: twoJobsCountLine,
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
