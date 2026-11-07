/* ═══════════════════════════════════════════════════════════════════════════
   profile-locker.js — Evidence Locker items on the person profile
   ────────────────────────────────────────────────────────────────────────────
   The raw-ingest cron writes finished Evidence Locker items (clear position,
   confidence >= 0.8, campaign/official page) and /api/evidence-locker/items
   serves them, grouped by politician id, already in the SPOTLIGHT_DATA entry
   shape. The main Locker folds them in through spotlight-cards-data.js. The
   person document does not load that file, so until now a profile never saw
   them. This module is the person document's half of the same fold:

     · it fetches the endpoint ONCE,
     · folds each item into window.SPOTLIGHT_DATA under the profile id (never
       replacing a curated row with the same headline) — which is what
       _issueEvidenceMap already reads, so the Evidence tab, Connected Evidence,
       Key Issue Stances and In the Spotlight pick the items up with no change
       to how they read data,
     · and exposes the items per person and per issue so the two surfaces that
       do NOT read the evidence map — 🌳 All Issues by Topic (stance-tree.js)
       and ⚖️ Word vs Action (word-action.js) — can print them in their own line
       style.

   WHERE THIS CONFLICTS. Each of those three Locker lines (Evidence tab card,
   topic-tree leaf, Word vs Action list) gains one short line when the voting
   record on the item's issue — or on a related issue, when its own has no
   one-way record — runs the other way from the item's position: "On [issue],
   their record runs against this statement." No record, or an agreeing one,
   prints nothing. See conflictOf below.

   If the open profile gained items, the file is repainted in place (same
   renderer, scroll position kept), the way the cold-open document merge does it.

   THE RULES
   · ADDITIVE ONLY. Curated content is never removed or reordered; a person the
     endpoint returns nothing for renders byte-for-byte as before, because every
     hook below returns '' when items(pid) is empty.
   · NOT A SCORE INPUT. An automated stance read is a public statement. Nothing
     here enters Word vs Action's arithmetic, the record pattern, or any count
     that a percentage is built from.
   · FAILS CLOSED. A failed fetch, a 503, or a malformed body changes nothing.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXProfileLocker) return;

  var ENDPOINT = '/api/evidence-locker/items';
  var HEAD = '📂 From the Evidence Locker';
  var WA_NOTE = 'Public statements the Locker holds on issues they have taken a position on. ' +
    'Context only — they are not formal actions and are not part of the figure above.';
  var TREE_NOTE = 'Locker statements on issues not yet listed above.';
  var POS = { support: 'Supports', oppose: 'Opposes' };

  var byPid = {};      // profile id → [entry]
  var loading = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function canon(pid) {
    var id = String(pid == null ? '' : pid);
    try { if (id && typeof window.PDXProfilePid === 'function') return String(window.PDXProfilePid(id) || id); } catch (e) {}
    return id;
  }
  function hk(it) { return String((it && it.headline) || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function isEntry(it) {
    return !!(it && it.headline && it.issueKey && it.source && /^https?:\/\//.test(String(it.source.url || '')));
  }

  function pushUnique(list, it) {
    var h = hk(it);
    for (var i = 0; i < list.length; i++) if (hk(list[i]) === h) return false;
    list.push(it);
    return true;
  }

  // Fold one endpoint body. Returns how many new items landed, and the ids
  // that gained any.
  function ingest(body) {
    var out = { added: 0, pids: [] };
    var items = body && body.items;
    if (!items || typeof items !== 'object') return out;
    var SD = (window.SPOTLIGHT_DATA = window.SPOTLIGHT_DATA || {});
    Object.keys(items).forEach(function (raw) {
      var arr = items[raw];
      if (!Array.isArray(arr)) return;
      var id = canon(raw);
      var keys = (id && id !== raw) ? [id, raw] : [raw];
      var gained = false;
      arr.forEach(function (it) {
        if (!isEntry(it)) return;
        var mine = byPid[id] || (byPid[id] = []);
        if (!pushUnique(mine, it)) return;
        gained = true; out.added++;
        keys.forEach(function (k) {
          var list = Array.isArray(SD[k]) ? SD[k] : (SD[k] = []);
          pushUnique(list, it);
        });
      });
      if (gained) out.pids.push(id);
    });
    return out;
  }

  function items(pid) {
    if (!pid) return [];
    var id = canon(pid);
    return (byPid[id] || byPid[String(pid)] || []).slice();
  }
  function forIssue(pid, key) {
    return items(pid).filter(function (it) { return it.issueKey === key; });
  }

  function issueLabel(k) {
    var l = '';
    try { if (typeof window._issueLabel === 'function') l = window._issueLabel(k) || ''; } catch (e) {}
    if (!l) l = String(k || '').replace(/_/g, ' ');
    var parts = String(l).trim().split(/\s+/);
    if (parts.length > 1 && /[^\x00-\x7F]/.test(parts[0])) parts.shift();
    return parts.join(' ');
  }

  // The parts every surface prints: position, excerpt, attribution, date, link.
  function partsOf(it) {
    var pl = it.pipeline || {};
    return {
      pos: POS[pl.position] || '',
      excerpt: pl.excerpt || '',
      attribution: (it.source && it.source.label) || pl.attribution || 'Source',
      date: it.date || '',
      url: (it.source && it.source.url) || '',
      headline: it.headline || ''
    };
  }

  // ── Where this conflicts ─────────────────────────────────────────────────
  // A Locker item states a position (support / oppose). The person's voting
  // record on the same issue — or, where that issue has no one-way record, on
  // an issue PDXRelatedIssues lists as related — may run the other way. That is
  // the whole test, and it reads only what is already published:
  //   · the record's way, from PDXRelatedIssues.recordOf (the shared
  //     record-direction index: a characterised one-way read, 'with' or
  //     'against'; a split, thin, poleless or unloaded record is null);
  //   · the item's own position.
  // The item's own issue decides when it has a one-way record (agreeing → no
  // flag). Only when it has none are the related issues asked, and then a flag
  // needs at least one related record running the other way and none running
  // the same way. No record anywhere → no flag. Context only: nothing here is a
  // score input, and no verdict word is printed.
  var CONFLICT_RUNS = { support: 'against', oppose: 'with' };
  function recordWay(pid, key) {
    try {
      var RI = window.PDXRelatedIssues;
      if (!pid || !key || !RI || typeof RI.recordOf !== 'function') return null;
      var r = RI.recordOf(pid, key);
      return (r === 'with' || r === 'against') ? r : null;
    } catch (e) { return null; }
  }
  function conflictOf(pid, it) {
    var pos = it && it.pipeline && it.pipeline.position;
    var bad = CONFLICT_RUNS[pos];
    if (!bad || !it.issueKey) return null;
    var id = canon(pid);
    var own = recordWay(id, it.issueKey);
    if (own) return own === bad ? { key: it.issueKey, related: false } : null;
    var RI = window.PDXRelatedIssues, rel = [];
    try { rel = (RI && typeof RI.related === 'function') ? (RI.related(it.issueKey) || []) : []; } catch (e) { rel = []; }
    var hit = null;
    for (var i = 0; i < rel.length; i++) {
      var w = recordWay(id, rel[i]);
      if (!w) continue;
      if (w !== bad) return null;           // a related record agrees: no flag
      if (!hit) hit = { key: rel[i], related: true };
    }
    return hit;
  }
  function conflictText(c) {
    return c ? 'On ' + issueLabel(c.key) + ', their record runs against this statement.' : '';
  }
  // One short line, in whichever surface's box it is placed in.
  function conflictHtml(pid, it, tag, style) {
    var c = conflictOf(pid, it);
    if (!c) return '';
    return '<' + tag + ' class="pdx-locker-conflict" data-pdx-locker-conflict="' + esc(it.issueKey) + '"' +
      ' data-pdx-locker-conflict-on="' + esc(c.key) + '" style="' + style + '">' +
      '⚠️ <b style="color:#f5c842;">Where this conflicts:</b> ' + esc(conflictText(c)) +
      '</' + tag + '>';
  }
  var CONFLICT_STYLE = 'font-size:0.7rem;line-height:1.4;color:#f8b4b4;';

  // ── 🌳 All Issues by Topic ───────────────────────────────────────────────
  // One line under a leaf, in the leaf's own source-link style (.pdxtree-src).
  function treeLineHtml(it, pid) {
    var x = partsOf(it);
    if (!/^https?:\/\//.test(x.url)) return '';
    return '<div class="pdxtree-locker" data-pdxtree-locker="1" data-pdxtree-locker-issue="' + esc(it.issueKey) + '">' +
      '<a class="pdxtree-src" data-pdxtree-src="1" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' +
        '📂 ' + (x.pos ? '<b>' + esc(x.pos) + ':</b> ' : '') +
        (x.excerpt ? '“' + esc(x.excerpt) + '”' : esc(x.headline)) +
        ' — ' + esc(x.attribution) + (x.date ? ' · ' + esc(x.date) : '') + ' ↗</a>' +
        (pid ? conflictHtml(pid, it, 'div', 'margin:0.15rem 0 0;' + CONFLICT_STYLE) : '') +
      '</div>';
  }
  function treeLeafHtml(pid, key) {
    return forIssue(pid, key).map(function (it) { return treeLineHtml(it, pid); }).join('');
  }
  // Items whose issue has no leaf in the tree still belong in the topic
  // section: they are listed under it, grouped by issue, in the same line style.
  function treeFootHtml(pid, leafKeys) {
    var have = {};
    (leafKeys || []).forEach(function (k) { have[k] = 1; });
    var rest = items(pid).filter(function (it) { return !have[it.issueKey]; });
    if (!rest.length) return '';
    var byKey = {}, order = [];
    rest.forEach(function (it) {
      if (!byKey[it.issueKey]) { byKey[it.issueKey] = []; order.push(it.issueKey); }
      byKey[it.issueKey].push(it);
    });
    return '<div class="pdxtree-lockerfoot" data-pdxtree-lockerfoot="1">' +
      '<p class="pdxtree-note"><b>' + esc(HEAD) + '</b> · ' + esc(TREE_NOTE) + '</p>' +
      order.map(function (k) {
        return '<div class="pdxtree-lockergrp" data-pdxtree-locker-grp="' + esc(k) + '">' +
          '<span class="pdxtree-name">' + esc(issueLabel(k)) + '</span>' +
          byKey[k].map(function (it) { return treeLineHtml(it, pid); }).join('') +
        '</div>';
      }).join('') +
    '</div>';
  }

  // ── ⚖️ Word vs Action ────────────────────────────────────────────────────
  // Only items whose issue matches a stated position (any word-ledger entry)
  // or an issue related to one (PDXRelatedIssues). Listed, never scored.
  function waMatches(pid, p) {
    var mine = items(pid);
    if (!mine.length) return [];
    var keys = {};
    try {
      var WA = window.PDXWordAction;
      var led = (WA && typeof WA.wordLedger === 'function') ? (WA.wordLedger(pid, p) || []) : [];
      led.forEach(function (w) { if (w && w.issueKey) keys[w.issueKey] = 1; });
    } catch (e) {}
    var RI = window.PDXRelatedIssues;
    var out = [];
    mine.forEach(function (it) {
      var k = it.issueKey;
      if (keys[k]) { out.push({ item: it, via: k, direct: true }); return; }
      if (!RI || typeof RI.related !== 'function') return;
      for (var w in keys) {
        if (!Object.prototype.hasOwnProperty.call(keys, w)) continue;
        var rel = [];
        try { rel = RI.related(w) || []; } catch (e) { rel = []; }
        if (rel.indexOf(k) !== -1) { out.push({ item: it, via: w, direct: false }); return; }
      }
    });
    return out;
  }
  function waHtml(pid, p) {
    var m = waMatches(pid, p);
    if (!m.length) return '';
    return '<div class="modal-section pdxwa-locker" data-pdxwa-locker="1" style="margin-top:-0.4rem;padding-top:0.6rem;border-top:1px solid rgba(159,180,212,0.18);">' +
      '<div class="pdxwa-verdict" style="color:#f5c842;font-size:0.8rem;">' + esc(HEAD) + '</div>' +
      '<p class="pdxwa-line" style="font-size:0.72rem;color:#9fb4d4;">' + esc(WA_NOTE) + '</p>' +
      m.map(function (x) {
        var y = partsOf(x.item);
        var on = (x.direct ? 'On ' : 'Related to ') + issueLabel(x.via);
        return '<p class="pdxwa-line" data-pdxwa-locker-item="' + esc(x.item.issueKey) + '">' +
          '<b>' + esc(on) + (y.pos ? ' · ' + esc(y.pos) : '') + ':</b> ' +
          (y.excerpt ? '“' + esc(y.excerpt) + '”' : esc(y.headline)) + ' ' +
          (/^https?:\/\//.test(y.url)
            ? '<a href="' + esc(y.url) + '" target="_blank" rel="noopener noreferrer" style="color:#9fb4d4;">' + esc(y.attribution) + ' ↗</a>'
            : esc(y.attribution)) +
          (y.date ? ' <span style="color:#5f7da6;">· ' + esc(y.date) + '</span>' : '') +
        '</p>' +
        conflictHtml(pid, x.item, 'p', 'margin:-0.25rem 0 0.45rem;' + CONFLICT_STYLE);
      }).join('') +
    '</div>';
  }

  // ── 🧩 Connected Evidence (the Evidence tab) ────────────────────────────
  // The card already prints the item's headline, date and source link (the
  // item reaches it through SPOTLIGHT_DATA → _issueEvidenceMap). What the card
  // has no slot for is the quoted excerpt and the position, so they are added
  // under the headline of each Locker item's card — matched by the exact
  // escaped headline the card printed — and nowhere else.
  function evdExcerptHtml(it, pid) {
    var x = partsOf(it);
    var cf = pid ? conflictHtml(pid, it, 'p', 'margin:0.1rem 0 0.15rem 1.1rem;' + CONFLICT_STYLE) : '';
    // A conflict line carries the same marker so a second wrap never repeats it.
    if (cf) cf = cf.replace('class="pdx-locker-conflict"', 'class="pdx-locker-conflict" data-evd-locker="1"');
    if (!x.excerpt) return cf;
    return '<p class="evd-spot-excerpt" data-evd-locker="1" style="margin:0.2rem 0 0.15rem 1.1rem;font-size:0.72rem;line-height:1.45;color:#c9d6ea;">' +
      (x.pos ? '<b style="color:#f5c842;">' + esc(x.pos) + ':</b> ' : '') +
      '“' + esc(x.excerpt) + '”' +
      (x.attribution ? ' <span style="color:#5f7da6;">— ' + esc(x.attribution) + '</span>' : '') +
    '</p>' + cf;
  }
  function decorateEvidence(html, pid) {
    var mine = items(pid);
    if (!html || !mine.length) return html;
    mine.forEach(function (it) {
      var add = evdExcerptHtml(it, pid);
      if (!add) return;
      var needle = 'evd-spot-headline">' + esc(it.headline);
      var from = 0, at;
      while ((at = html.indexOf(needle, from)) !== -1) {
        var close = html.indexOf('</div>', at);          // end of .evd-spot-head
        if (close === -1) break;
        close += 6;
        // Already decorated (a wrapper applied twice) — leave it.
        if (html.slice(close, close + 60).indexOf('data-evd-locker="1"') === -1) {
          html = html.slice(0, close) + add + html.slice(close);
          close += add.length;
        }
        from = close;
      }
    });
    return html;
  }

  // ── The hooks into the two engines that are not edited for this ─────────
  // word-action.js and profiles-full.js are left byte-identical; their public
  // renderers are wrapped instead. Each wrapper returns the original output
  // untouched when the person has no Locker items.
  function wrap() {
    var WA = window.PDXWordAction;
    if (WA && typeof WA.sectionHtml === 'function' && !WA.sectionHtml.__pdxLocker) {
      var origWA = WA.sectionHtml;
      var w = function (pid, p) {
        var h = origWA.apply(this, arguments);
        if (!h) return h;
        var extra = '';
        try { extra = waHtml(pid, p) || ''; } catch (e) { extra = ''; }
        return extra ? h + extra : h;
      };
      w.__pdxLocker = true;
      WA.sectionHtml = w;
    }
    var RC = window._renderEvidenceConnections;
    if (typeof RC === 'function' && !RC.__pdxLocker) {
      var e = function (id) {
        var h = RC.apply(this, arguments);
        try { return decorateEvidence(h, id); } catch (er) { return h; }
      };
      e.__pdxLocker = true;
      window._renderEvidenceConnections = e;
    }
  }

  // ── The repaint ──────────────────────────────────────────────────────────
  function repaint(pid) {
    try {
      var cur = String(window._pdxCurrentProfileId || '');
      if (!cur || canon(cur) !== pid || typeof window.openModal !== 'function') return;
      // A full document still in flight will repaint the file itself when it
      // lands (and read these items then); repainting now would put the loading
      // shell back over a file the reader is already in.
      var F = window._pdxFullIds;
      if (F && typeof F.has === 'function' && !F.has(cur)) {
        var pend = window._pdxFullPending && window._pdxFullPending[cur];
        if (pend && typeof pend.then === 'function') pend.then(function () { repaint(pid); }, function () {});
        return;
      }
      var body = null, top = 0;
      try { body = document.getElementById('modal-body'); top = body ? body.scrollTop : 0; } catch (e) {}
      window.openModal(cur);
      try { if (body && top) body.scrollTop = top; } catch (e) {}
    } catch (e) {}
  }

  function onBody(body) {
    var r = ingest(body);
    if (!r.added) return r;
    try { if (typeof window.PDXDataChanged === 'function') window.PDXDataChanged(); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('pdx-spotlight-data-updated', { detail: { added: r.added } })); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('pdx-locker-items', { detail: { added: r.added, pids: r.pids } })); } catch (e) {}
    var cur = canon(window._pdxCurrentProfileId || '');
    if (cur && r.pids.indexOf(cur) !== -1) repaint(cur);
    return r;
  }

  function load() {
    if (loading) return loading;
    if (typeof fetch !== 'function') return (loading = Promise.resolve(null));
    loading = fetch(ENDPOINT, { headers: { accept: 'application/json' } })
      .then(function (res) { return res && res.ok ? res.json() : null; })
      .then(function (body) { return (body && body.count) ? onBody(body) : null; })
      .catch(function () { return null; });
    return loading;
  }

  window.PDXProfileLocker = {
    ENDPOINT: ENDPOINT, HEAD: HEAD, WA_NOTE: WA_NOTE, TREE_NOTE: TREE_NOTE, POS: POS,
    ingest: ingest, onBody: onBody, load: load,
    items: items, forIssue: forIssue,
    treeLeafHtml: treeLeafHtml, treeFootHtml: treeFootHtml, treeLineHtml: treeLineHtml,
    waMatches: waMatches, waHtml: waHtml,
    conflictOf: conflictOf, conflictText: conflictText, conflictHtml: conflictHtml,
    decorateEvidence: decorateEvidence, wrap: wrap,
    // Test seam: forget everything ingested (does not touch SPOTLIGHT_DATA).
    _reset: function () { byPid = {}; loading = null; }
  };

  // Person document only: index.html and the Locker page fold these items
  // through spotlight-cards-data.js already.
  wrap();
  try { document.addEventListener('DOMContentLoaded', wrap); } catch (e) {}
  if (window.__PDX_PERSON_DOC) load();
})();
