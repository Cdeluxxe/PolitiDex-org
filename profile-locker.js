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

   STRENGTH. Every item is read at one of three strengths (strengthOf):
     · strong  — a clear support/oppose at confidence >= 0.8 (or no confidence
                 given, which is every item the cron has written so far). The
                 behaviour above, unchanged.
     · weak    — a clear support/oppose at 0.3–0.79. Same line or card in each
                 surface, plus a "Weak signal" badge. NOT folded into
                 SPOTLIGHT_DATA, so it never reaches Key Issue Stances, In the
                 Spotlight, the Evidence banner counts or any score.
     · mention — below 0.3, or no clear position (mixed / "no clear position")
                 with an excerpt to show. A "Mentions this topic" line — excerpt,
                 link, attribution — marked as not a stance. Its generated
                 headline (which names a direction) is never printed.
   An item with no clear position and no excerpt has nothing to show and is
   dropped.

   WHERE THIS CONFLICTS. Each of those three Locker lines (Evidence tab card,
   topic-tree leaf, Word vs Action list) gains one short line when the voting
   record on the item's issue — or on a related issue, when its own has no
   one-way record — runs the other way from the item's position: "On [issue],
   their record runs against this statement." No record, or an agreeing one,
   prints nothing. See conflictOf below.

   PLEDGES. A Locker item (strong or weak) on the same issue as a tracked
   pledge that has no outcome yet is that pledge's connected evidence, and every
   surface says so where the pledge is (pledgeMatches below):
     · the pledge row in "What the record can't test yet" and in Word vs
       Action's gap list prints the excerpt, link and attribution in place of
       the "Open gap / no sourced outcome" copy. A weak-only match keeps a light
       gap note under the item, because a weak read is not a firm stance;
     · the pledge's row in the Promise Tracker gains the same line;
     · the item's line under its topic leaf names the pledge;
     · in the Evidence tab the item sits under the pledge in that issue's card
       (a weak one moves there out of the separate weaker-signals block);
     · in Word vs Action it is listed first, as evidence for the pledge.
   It is context: no pledge is resolved by it and nothing is counted.

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
  var STRONG_MIN = 0.8, WEAK_MIN = 0.3;
  var WEAK_BADGE = 'Weak signal';
  var WEAK_TITLE = 'Limited evidence: the pipeline read this position at low confidence. It is not a firm stance.';
  var MENTION_LABEL = 'Mentions this topic';
  var MENTION_NOTE = 'not a stance';
  var EVD_HEAD = '📂 From the Evidence Locker: weaker signals';
  var EVD_NOTE = 'What the pipeline found that does not reach a firm stance. Weak signals are low-confidence reads; ' +
    'mentions only show the topic came up. Neither is counted anywhere on this profile.';

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

  // 'strong' | 'weak' | 'mention' | null (nothing to show).
  function strengthOf(it) {
    var pl = (it && it.pipeline) || {};
    var clear = pl.position === 'support' || pl.position === 'oppose';
    var c = (typeof pl.confidence === 'number' && isFinite(pl.confidence)) ? pl.confidence : null;
    if (clear && (c === null || c >= STRONG_MIN)) return 'strong';
    if (clear && c >= WEAK_MIN) return 'weak';
    return String(pl.excerpt || '').trim() ? 'mention' : null;
  }
  function isStrong(it) { return strengthOf(it) === 'strong'; }
  // Identity within a person's list. A strong item keeps the headline key it
  // always had; a weaker one is keyed by its link and issue, because a
  // mention's generated headline names a direction it does not have and could
  // collide with a real stance's.
  function ik(it) {
    return isStrong(it) ? hk(it)
      : 'u:' + String((it.source && it.source.url) || '') + '|' + String(it.issueKey || '');
  }
  function isEntry(it) {
    return !!(it && it.headline && it.issueKey && it.source && /^https?:\/\//.test(String(it.source.url || '')));
  }

  function pushUnique(list, it, key) {
    key = key || hk;
    var h = key(it);
    for (var i = 0; i < list.length; i++) if (key(list[i]) === h) return false;
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
        if (!isEntry(it) || !strengthOf(it)) return;
        var mine = byPid[id] || (byPid[id] = []);
        if (!pushUnique(mine, it, ik)) return;
        gained = true; out.added++;
        // Only a firm stance joins the evidence the rest of the profile reads.
        if (!isStrong(it)) return;
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
  function weaker(pid) {
    return items(pid).filter(function (it) { return !isStrong(it); });
  }

  // ── Pledges ──────────────────────────────────────────────────────────────
  function profileOf(pid, p) {
    if (p && typeof p === 'object') return p;
    var ids = [String(pid || ''), canon(pid)];
    for (var i = 0; i < ids.length; i++) {
      var k = ids[i];
      if (!k) continue;
      try { if (window.PROFILES && window.PROFILES[k]) return window.PROFILES[k]; } catch (e) {}
      try { if (window.CMP_DATA && window.CMP_DATA[k]) return window.CMP_DATA[k]; } catch (e) {}
    }
    return null;
  }
  // A tracked pledge with no sourced outcome: the same split Word vs Action's
  // ledger makes (anything that is not kept or broken is still open).
  function isOpenPledge(pr) {
    if (!pr || !pr.title || !pr.issueKey) return false;
    var v = String(pr.verdict == null ? '' : pr.verdict).toLowerCase();
    return v !== 'kept' && v !== 'broken';
  }
  // The Locker items that count as a pledge's evidence: a firm or weak stance on
  // the pledge's own issue. A mention is not evidence for a commitment.
  function pledgeItems(pid, key) {
    if (!key) return [];
    return forIssue(pid, key).filter(function (it) {
      var st = strengthOf(it);
      return st === 'strong' || st === 'weak';
    });
  }
  // [{ pledge, items, strong }] for every open pledge with at least one match.
  function pledgeMatches(pid, p) {
    if (!pid || !items(pid).length) return [];
    var d = profileOf(pid, p);
    var proms = (d && Array.isArray(d.promises)) ? d.promises : [];
    var out = [];
    proms.forEach(function (pr) {
      if (!isOpenPledge(pr)) return;
      var its = pledgeItems(pid, pr.issueKey);
      if (!its.length) return;
      out.push({ pledge: pr, items: its, strong: its.some(isStrong) });
    });
    return out;
  }
  // The open pledges on one issue that an item is evidence for.
  function pledgesFor(pid, it, p) {
    var st = strengthOf(it);
    if (st !== 'strong' && st !== 'weak') return [];
    return pledgeMatches(pid, p).filter(function (m) { return m.pledge.issueKey === it.issueKey; })
      .map(function (m) { return m.pledge; });
  }

  // One Locker line in a pledge's own box: badge, position, excerpt, link,
  // attribution, date. Shared by the gap row, the Promise Tracker row and the
  // Evidence tab, so the pledge reads the same wherever it is.
  function pledgeLineHtml(it, tag, cls, attr) {
    var x = partsOf(it);
    if (!/^https?:\/\//.test(x.url)) return '';
    var st = strengthOf(it);
    return '<' + tag + ' class="' + cls + '" ' + attr + '="' + esc(it.issueKey) + '"' +
      (st === 'weak' ? ' data-pdx-locker-strength="weak"' : '') +
      ' style="margin:0.25rem 0 0;font-size:0.74rem;line-height:1.45;color:#c9d6ea;">' +
      weakBadgeHtml(it) + '📂 ' +
      (x.pos ? '<b style="color:#f5c842;">' + esc(x.pos) + ':</b> ' : '') +
      (x.excerpt ? '“' + esc(x.excerpt) + '”' : esc(x.headline)) + ' ' +
      '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="color:#9fb4d4;">— ' +
        esc(x.attribution) + ' ↗</a>' +
      (x.date ? ' <span style="color:#5f7da6;">· ' + esc(x.date) + '</span>' : '') +
    '</' + tag + '>';
  }
  var PLEDGE_TAG = '📂 Locker evidence on file';
  var PLEDGE_TAG_WEAK = '📂 Locker item on file';
  var PLEDGE_NOTE = 'From the Evidence Locker, on this pledge’s issue. Context for the pledge, not a sourced outcome — it counts neither for nor against them.';
  var PLEDGE_GAP_NOTE = 'Open gap · no sourced outcome for this pledge yet. The Locker item above is a weak signal, not a firm stance.';

  // The badge a weak item carries in every surface; '' for any other strength.
  function weakBadgeHtml(it) {
    if (strengthOf(it) !== 'weak') return '';
    return '<span class="pdx-locker-weak" data-pdx-locker-weak="1" title="' + esc(WEAK_TITLE) + '" ' +
      'style="display:inline-block;margin-right:0.3rem;padding:0 0.35rem;border:1px dashed rgba(245,200,66,0.55);' +
      'border-radius:0.6rem;font-size:0.62rem;font-weight:700;letter-spacing:0.02em;color:#f5c842;vertical-align:1px;">' +
      '◔ ' + esc(WEAK_BADGE) + '</span>';
  }
  // The lead of a mention line: label + "not a stance", never a direction word.
  function mentionLeadHtml() {
    return '<span class="pdx-locker-mention-lb" style="color:#9fb4d4;font-weight:700;">💬 ' + esc(MENTION_LABEL) +
      '</span> <span style="color:#5f7da6;">(' + esc(MENTION_NOTE) + ')</span>';
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
    // A firm stance only: a weak read or a mention is not a statement a record
    // can be said to run against.
    if (!isStrong(it)) return null;
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
    var st = strengthOf(it);
    if (st === 'mention') {
      return '<div class="pdxtree-locker pdxtree-locker-mention" data-pdxtree-locker="1" data-pdx-locker-mention="1" data-pdxtree-locker-issue="' + esc(it.issueKey) + '">' +
        mentionLeadHtml() + ' ' +
        '<a class="pdxtree-src" data-pdxtree-src="1" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' +
          '“' + esc(x.excerpt) + '” — ' + esc(x.attribution) + (x.date ? ' · ' + esc(x.date) : '') + ' ↗</a>' +
      '</div>';
    }
    return '<div class="pdxtree-locker" data-pdxtree-locker="1"' + (st === 'weak' ? ' data-pdx-locker-strength="weak"' : '') +
      ' data-pdxtree-locker-issue="' + esc(it.issueKey) + '">' + weakBadgeHtml(it) +
      '<a class="pdxtree-src" data-pdxtree-src="1" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' +
        '📂 ' + (x.pos ? '<b>' + esc(x.pos) + ':</b> ' : '') +
        (x.excerpt ? '“' + esc(x.excerpt) + '”' : esc(x.headline)) +
        ' — ' + esc(x.attribution) + (x.date ? ' · ' + esc(x.date) : '') + ' ↗</a>' +
        (pid ? conflictHtml(pid, it, 'div', 'margin:0.15rem 0 0;' + CONFLICT_STYLE) : '') +
        (pid ? treePledgeHtml(pid, it) : '') +
      '</div>';
  }
  // Under the leaf, the item names the open pledge it is evidence for.
  function treePledgeHtml(pid, it) {
    var ps = pledgesFor(pid, it);
    if (!ps.length) return '';
    return ps.map(function (pr) {
      return '<div class="pdxtree-locker-pledge" data-pdxtree-locker-pledge="' + esc(it.issueKey) + '"' +
        ' style="margin:0.15rem 0 0;font-size:0.7rem;line-height:1.4;color:#9fb4d4;">' +
        '🤝 <b style="color:#cbd9ec;">Evidence for their pledge:</b> ' + esc(pr.title) + '</div>';
    }).join('');
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
    // An item on an open pledge's issue is that pledge's evidence: it is listed
    // first, under the pledge it belongs to, rather than as one more statement.
    var forPledge = [], rest = [];
    m.forEach(function (x) {
      var ps = x.direct ? pledgesFor(pid, x.item, p) : [];
      if (ps.length) { x.pledges = ps; forPledge.push(x); } else rest.push(x);
    });
    return '<div class="modal-section pdxwa-locker" data-pdxwa-locker="1" style="margin-top:-0.4rem;padding-top:0.6rem;border-top:1px solid rgba(159,180,212,0.18);">' +
      '<div class="pdxwa-verdict" style="color:#f5c842;font-size:0.8rem;">' + esc(HEAD) + '</div>' +
      '<p class="pdxwa-line" style="font-size:0.72rem;color:#9fb4d4;">' + esc(WA_NOTE) + '</p>' +
      (forPledge.length
        ? '<div class="pdxwa-locker-pledges" data-pdxwa-locker-pledges="1">' +
            '<p class="pdxwa-line" style="font-size:0.74rem;color:#cbd9ec;margin-bottom:0.2rem;"><b>🤝 Evidence for their open pledges</b></p>' +
            forPledge.map(function (x) { return waLineHtml(pid, x); }).join('') +
          '</div>'
        : '') +
      rest.map(function (x) { return waLineHtml(pid, x); }).join('') +
    '</div>';
  }
  function waLineHtml(pid, x) {
    var y = partsOf(x.item);
    var on = x.pledges
      ? 'Pledge: ' + x.pledges.map(function (pr) { return pr.title; }).join(' · ')
      : (x.direct ? 'On ' : 'Related to ') + issueLabel(x.via);
    var st = strengthOf(x.item);
    var mention = st === 'mention';
    return '<p class="pdxwa-line" data-pdxwa-locker-item="' + esc(x.item.issueKey) + '"' +
      (x.pledges ? ' data-pdxwa-locker-pledge="' + esc(x.item.issueKey) + '"' : '') +
      (mention ? ' data-pdx-locker-mention="1"' : st === 'weak' ? ' data-pdx-locker-strength="weak"' : '') + '>' +
      weakBadgeHtml(x.item) +
      (mention
        ? '<b>' + esc(on) + ':</b> ' + mentionLeadHtml() + ' “' + esc(y.excerpt) + '” '
        : '<b>' + esc(on) + (y.pos ? ' · ' + esc(y.pos) : '') + ':</b> ' +
          (y.excerpt ? '“' + esc(y.excerpt) + '”' : esc(y.headline)) + ' ') +
      (/^https?:\/\//.test(y.url)
        ? '<a href="' + esc(y.url) + '" target="_blank" rel="noopener noreferrer" style="color:#9fb4d4;">' + esc(y.attribution) + ' ↗</a>'
        : esc(y.attribution)) +
      (y.date ? ' <span style="color:#5f7da6;">· ' + esc(y.date) + '</span>' : '') +
    '</p>' +
      conflictHtml(pid, x.item, 'p', 'margin:-0.25rem 0 0.45rem;' + CONFLICT_STYLE);
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
  // Under an open pledge in its issue card's 🤝 Promises lane, the Locker items
  // that are its evidence. Returns the html and the items it placed, so a weak
  // item placed here is not listed a second time in the weaker-signals block.
  function decoratePledges(html, pid) {
    var placed = [];
    if (!html) return { html: html, placed: placed };
    pledgeMatches(pid).forEach(function (m) {
      var key = m.pledge.issueKey;
      var anchor = '';
      try { anchor = typeof window._pdxEvAnchor === 'function' ? window._pdxEvAnchor(pid, key) : ''; } catch (e) { anchor = ''; }
      if (!anchor) return;
      var start = html.indexOf('id="' + anchor + '"');
      if (start === -1) return;
      var tagEnd = html.indexOf('>', start);
      var stop = tagEnd === -1 ? -1 : html.indexOf('class="evd-card', tagEnd);
      if (stop === -1) stop = html.length;
      var needle = '<span>' + esc(m.pledge.title) + '<span class="evd-prom-verdict';
      var at = html.indexOf(needle, start);
      if (at === -1 || at > stop) return;
      var close = html.indexOf('</div>', at);
      if (close === -1 || close > stop) return;
      close += 6;
      if (html.slice(close, close + 80).indexOf('data-evd-locker-pledge=') !== -1) return;
      var add = '<div class="evd-prom-locker" data-evd-locker-pledge="' + esc(key) + '" style="margin:0 0 0.35rem 1rem;">' +
        m.items.map(function (it) {
          return pledgeLineHtml(it, 'p', 'evd-prom-locker-line', 'data-evd-locker-pledge-item');
        }).join('') +
      '</div>';
      html = html.slice(0, close) + add + html.slice(close);
      m.items.forEach(function (it) { placed.push(it); });
    });
    return { html: html, placed: placed };
  }
  function decorateEvidence(html, pid) {
    var mine = items(pid).filter(isStrong);
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

  // Weak signals and mentions are not in SPOTLIGHT_DATA, so Connected Evidence
  // never sees them. They get their own short section right after it, in the
  // same .evd-spot card markup, grouped by issue: a weak item as a card with
  // its badge, a mention as a "Mentions this topic" card with no headline.
  function evdWeakCardHtml(it) {
    var x = partsOf(it);
    var st = strengthOf(it);
    var date = x.date ? ' <span style="color:#5f7da6;font-weight:400;">· ' + esc(x.date) + '</span>' : '';
    var link = /^https?:\/\//.test(x.url)
      ? '<div class="evd-spot-links"><a href="' + esc(x.url) + '" target="_blank" rel="noopener" class="evd-src-link" title="' +
        esc(x.attribution) + '">🔗 ' + esc(x.attribution) + '</a></div>' : '';
    var head = st === 'mention'
      ? '<span class="evd-spot-headline">' + mentionLeadHtml() + date + '</span>'
      : '<span class="evd-spot-headline">' + weakBadgeHtml(it) + esc(x.headline) + date + '</span>';
    var body = x.excerpt
      ? '<p class="evd-spot-excerpt" style="margin:0.2rem 0 0.15rem 1.1rem;font-size:0.72rem;line-height:1.45;color:#c9d6ea;">' +
        (st === 'weak' && x.pos ? '<b style="color:#f5c842;">' + esc(x.pos) + ':</b> ' : '') +
        '“' + esc(x.excerpt) + '”' +
        ' <span style="color:#5f7da6;">— ' + esc(x.attribution) + '</span></p>' : '';
    return '<div class="evd-spot" data-evd-locker-weak="' + esc(st) + '" data-evd-locker-issue="' + esc(it.issueKey) + '"' +
      (st === 'mention' ? ' data-pdx-locker-mention="1"' : ' data-pdx-locker-strength="weak"') + '>' +
      '<div class="evd-spot-head"><span class="evd-spot-impact neutral" aria-hidden="true">•</span>' + head + '</div>' +
      body + link + '</div>';
  }
  function evdWeakHtml(pid, skip) {
    var rest = weaker(pid).filter(function (it) { return !skip || skip.indexOf(it) === -1; });
    if (!rest.length) return '';
    var byKey = {}, order = [];
    rest.forEach(function (it) {
      if (!byKey[it.issueKey]) { byKey[it.issueKey] = []; order.push(it.issueKey); }
      byKey[it.issueKey].push(it);
    });
    return '<div class="modal-section evd-locker-weak" data-evd-locker-weakblock="1">' +
      '<div class="modal-section-title">' + esc(EVD_HEAD) + '</div>' +
      '<p class="evd-foot-note" style="margin-top:0;">' + esc(EVD_NOTE) + '</p>' +
      order.map(function (k) {
        return '<div class="evd-card" data-evd-locker-grp="' + esc(k) + '">' +
          '<div class="evd-head"><span class="evd-head-label">' + esc(issueLabel(k)) + '</span></div>' +
          byKey[k].map(evdWeakCardHtml).join('') +
        '</div>';
      }).join('') +
    '</div>';
  }

  // ── 🤝 The pledge rows ───────────────────────────────────────────────────
  // gaps.js prints an open pledge as "Pledge still open — <title>" with an Open
  // gap pill, "no sourced outcome" copy and an ask. Where the Locker holds a
  // strong item on the pledge's issue, that row is replaced by the pledge and
  // its evidence: excerpt, link, attribution, and the row's own lead bar. A
  // weak-only match shows the item AND keeps a light gap note plus the ask.
  // Matched by the gap's own key, so nothing else in the list moves.
  function gapRowHtml(g, its, orig) {
    var strong = its.some(isStrong);
    var open = orig.slice(0, orig.indexOf('>') + 1);
    var ic = (open.match(/\sstyle="[^"]*"/) || [''])[0];
    var barAt = orig.indexOf('<div class="pdxg-row-bar">');
    var tail = barAt === -1 ? '' : orig.slice(barAt, orig.lastIndexOf('</li>'));
    var askAt = orig.indexOf('<p class="pdxg-row-ask">');
    var ask = (!strong && askAt !== -1) ? orig.slice(askAt, barAt === -1 ? orig.lastIndexOf('</li>') : barAt) : '';
    var title = g.label.replace(/^Pledge still open — /, '');
    return '<li class="pdxg-row pdxg-row-locker" data-pdx-gap="' + esc(g.key) + '"' +
        ' data-pdx-gap-locker="' + (strong ? 'strong' : 'weak') + '"' + ic + '>' +
        '<div class="pdxg-row-h">' +
          '<span class="pdxg-row-label">' + esc('Pledge — ' + title) + '</span>' +
          '<span class="pdxg-row-tag pdxg-row-tag-locker" style="color:#f5c842;border-color:rgba(245,200,66,0.45);">' +
            esc(strong ? PLEDGE_TAG : PLEDGE_TAG_WEAK) + '</span>' +
        '</div>' +
        its.map(function (it) { return pledgeLineHtml(it, 'p', 'pdxg-row-locker-line', 'data-pdx-gap-locker-item'); }).join('') +
        '<p class="pdxg-row-detail" style="font-size:0.7rem;color:#7596c0;">' + esc(PLEDGE_NOTE) + '</p>' +
        (strong ? '' :
          '<p class="pdxg-row-gapnote" data-pdx-gap-note="1" style="margin:0.2rem 0 0;font-size:0.66rem;line-height:1.4;color:#7596c0;opacity:0.85;">' +
            esc(PLEDGE_GAP_NOTE) + '</p>') +
        ask + tail +
      '</li>';
  }
  function decorateGaps(html, pid, p, pre) {
    if (!html || !pid || !items(pid).length) return html;
    var G = window.PDXGaps;
    if (!G || typeof G.forPolitician !== 'function') return html;
    var gaps = [];
    try { gaps = G.forPolitician(pid, p, pre) || []; } catch (e) { gaps = []; }
    gaps.forEach(function (g) {
      if (!g || g.type !== 'pending_pledge' || !g.issueKey) return;
      var its = pledgeItems(pid, g.issueKey);
      if (!its.length) return;
      var mark = 'data-pdx-gap="' + esc(g.key) + '"';
      var from = 0, at;
      while ((at = html.indexOf(mark, from)) !== -1) {
        var start = html.lastIndexOf('<li', at);
        var end = html.indexOf('</li>', at);
        if (start === -1 || end === -1) break;
        end += 5;
        var orig = html.slice(start, end);
        if (orig.indexOf('data-pdx-gap-locker=') !== -1) { from = end; continue; }
        var row = gapRowHtml(g, its, orig);
        html = html.slice(0, start) + row + html.slice(end);
        from = start + row.length;
      }
    });
    return html;
  }

  // The Promise Tracker row: the open pledge gains its Locker evidence under it.
  function promiseHtml(id, p, pr) {
    if (!isOpenPledge(pr)) return '';
    var its = pledgeItems(id, pr.issueKey);
    if (!its.length) return '';
    return '<div class="pdx-locker-pledge" data-pdx-locker-pledge="' + esc(pr.issueKey) + '" style="margin-top:0.4rem;">' +
      its.map(function (it) { return pledgeLineHtml(it, 'p', 'pdx-locker-pledge-line', 'data-pdx-locker-pledge-item'); }).join('') +
    '</div>';
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
        try { h = decorateEvidence(h, id); } catch (er) {}
        var placed = [];
        try { var d = decoratePledges(h, id); h = d.html; placed = d.placed; } catch (er) { placed = []; }
        var extra = '';
        try { extra = evdWeakHtml(id, placed) || ''; } catch (er) { extra = ''; }
        return extra ? (h || '') + extra : h;
      };
      e.__pdxLocker = true;
      window._renderEvidenceConnections = e;
    }
    var G = window.PDXGaps;
    ['panelHtml', 'sectionHtml'].forEach(function (name) {
      if (!G || typeof G[name] !== 'function' || G[name].__pdxLocker) return;
      var orig = G[name];
      var g = function (pid, p, pre) {
        var h = orig.apply(this, arguments);
        try { return decorateGaps(h, pid, p, pre); } catch (er) { return h; }
      };
      g.__pdxLocker = true;
      G[name] = g;
    });
    var PE = window._pdxPromiseEvidenceLink;
    if (typeof PE === 'function' && !PE.__pdxLocker) {
      var pe = function (id, p, pr) {
        var h = PE.apply(this, arguments);
        var extra = '';
        try { extra = promiseHtml(id, p, pr) || ''; } catch (er) { extra = ''; }
        return extra ? (h || '') + extra : h;
      };
      pe.__pdxLocker = true;
      window._pdxPromiseEvidenceLink = pe;
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
    try { wrap(); } catch (e) {}
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
    STRONG_MIN: STRONG_MIN, WEAK_MIN: WEAK_MIN, WEAK_BADGE: WEAK_BADGE, MENTION_LABEL: MENTION_LABEL,
    strengthOf: strengthOf, weaker: weaker, evdWeakHtml: evdWeakHtml,
    conflictOf: conflictOf, conflictText: conflictText, conflictHtml: conflictHtml,
    decorateEvidence: decorateEvidence, wrap: wrap,
    pledgeMatches: pledgeMatches, pledgesFor: pledgesFor, decorateGaps: decorateGaps,
    decoratePledges: decoratePledges, promiseHtml: promiseHtml,
    PLEDGE_NOTE: PLEDGE_NOTE, PLEDGE_GAP_NOTE: PLEDGE_GAP_NOTE,
    // Test seam: forget everything ingested (does not touch SPOTLIGHT_DATA).
    _reset: function () { byPid = {}; loading = null; }
  };

  // The word-first letterhead's citation hook (word-action.js): a strong item
  // on the same issue stating the same side is a sourced statement, and its
  // link cites a stated position whose card has none. Weak reads never cite.
  window._pdxSaidCitation = function (pid, key, side) {
    try {
      var its = forIssue(pid, key);
      for (var i = 0; i < its.length; i++) {
        var it = its[i];
        if (!isStrong(it) || !it.pipeline || it.pipeline.position !== side) continue;
        var src = it.source || {};
        if (/^https?:\/\//.test(String(src.url || ''))) return { url: src.url, label: src.label || 'Evidence Locker' };
      }
    } catch (e) {}
    return null;
  };

  // Person document only: index.html and the Locker page fold these items
  // through spotlight-cards-data.js already.
  wrap();
  try { document.addEventListener('DOMContentLoaded', wrap); } catch (e) {}
  if (window.__PDX_PERSON_DOC) load();
})();
