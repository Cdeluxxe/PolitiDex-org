/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Say vs. Do  ·  window.PDXReceipts
   ────────────────────────────────────────────────────────────────────────────
   Bet 1: make the contradiction the hero. A "receipt" is one checkable claim —
   what a politician SAID lined up against what they actually DID — stamped with
   a plain-language verdict and always carrying its source + date.

   NO NEW DATA. Every receipt is assembled from capabilities the app already
   ships, entirely client-side:

     • window.ACCT_SPOTLIGHT   the curated, sourced accountability layer. Each
                               item is a real, dated public-record event with an
                               `impact` ('negative' = reversal / inconsistency /
                               rhetoric-vs-reality, 'positive' = words matched
                               actions), a `category`, `tags`, `headline`,
                               `facts`, `why`, `date` and a `source {label,url}`.
                               This is the DID side (and the verdict).
     • window.ISSUE_STANCE_DATA the stated-position layer, keyed by the SAME
                               ISSUE_MAP issueKey. When a politician has a stated
                               stance on the very issue an accountability item
                               touches, we surface it as the SAID side — making
                               the contradiction explicit and undeniable.
     • window.ACCT_ALIAS / PROFILES / CMP_DATA / _getPhotoUrl / ISSUE_MAP
                               identity, photo and issue-label resolution — all
                               already global.

   The module exposes:
     PDXReceipts.collect()        → ranked array of receipt objects (cached)
     PDXReceipts.cardHTML(r,opts) → the full receipt card markup
     PDXReceipts.forPolitician(id)→ strongest receipt for one id (or null)
     PDXReceipts.rowBadge(id)     → tiny verdict chip for a search row
     PDXReceipts.mount()          → render + rotate the homepage hero band
     PDXReceipts.refresh()        → rebuild + re-render (roster grew, etc.)
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXReceipts) return; // idempotent

  // ── escape helpers ─────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }

  // ── identity / issue resolution (all sources may load async) ────────────────
  function alias(id) {
    try { if (window.ACCT_ALIAS && window.ACCT_ALIAS[id]) return window.ACCT_ALIAS[id]; } catch (e) {}
    return id;
  }
  function polRec(id) {
    var p = null;
    try { if (window.PROFILES && window.PROFILES[id]) p = window.PROFILES[id]; } catch (e) {}
    if (!p) { try { if (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) p = CMP_DATA[id]; } catch (e) {} }
    return p;
  }
  function prettyName(id) {
    return String(id || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function photoFor(id) {
    try { if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(id) || ''; } catch (e) {}
    return '';
  }
  function partyChip(raw) {
    var p = String(raw || '').trim().toUpperCase();
    if (!p) return null;
    var c = p.charAt(0);
    if (c === 'R') return { label: 'R', color: '#f87171' };
    if (c === 'D') return { label: 'D', color: '#60a5fa' };
    if (c === 'I') return { label: 'IND', color: '#a78bfa' };
    return { label: p.slice(0, 3), color: '#94a3b8' };
  }
  function issueMeta(key) {
    var im = (window.ISSUE_MAP) || {};
    var def = key && im[key];
    if (!def || !def.label) return null;
    var m = String(def.label).match(/^\s*(\p{Extended_Pictographic}(?:️)?)\s*(.*)$/u);
    return m ? { icon: m[1], label: m[2] || def.label } : { icon: '🎯', label: def.label };
  }
  // First stated stance a politician has on `issueKey` (the SAID side).
  function stanceFor(id, issueKey) {
    if (!issueKey) return null;
    var SD = window.ISSUE_STANCE_DATA || {};
    var pick = function (pid) {
      var list = SD[pid];
      if (!Array.isArray(list)) return null;
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        if (s && s.issueKey === issueKey && (s.text || s.topic)) return s;
      }
      return null;
    };
    var hit = pick(id) || pick(alias(id));
    if (hit) return hit;
    // Fall through to the shared resolver, which also tries STANCE_ALIASES and a
    // slug of the person's display name — the documented stance-key convention
    // (see db/vr-pid-aliases.json). Without this hop a sourced receipt renders as
    // a bare red flag even though the stance sits right there in the data, which
    // is the difference between "Red Flag On Record" and the real verdict,
    // "Says One Thing · Does Another".
    var rec = polRec(id) || polRec(alias(id));
    var list = (typeof window._resolveStanceList === 'function')
      ? window._resolveStanceList(id, rec) : null;
    if (!Array.isArray(list) && typeof window._resolveStanceList === 'function' && alias(id) !== id) {
      list = window._resolveStanceList(alias(id), rec);
    }
    if (Array.isArray(list)) {
      for (var j = 0; j < list.length; j++) {
        var c = list[j];
        if (c && c.issueKey === issueKey && (c.text || c.topic)) return c;
      }
    }
    return null;
  }
  function stanceWord(s) {
    var v = (s && (s.issueStance || s.pos)) || '';
    if (v === 'support') return 'Supports';
    if (v === 'oppose') return 'Opposes';
    if (v === 'mixed') return 'Mixed on';
    return 'On';
  }
  function yearOf(date) {
    var m = String(date || '').match(/(19|20)\d{2}/g);
    return m ? parseInt(m[m.length - 1], 10) : 0; // latest year mentioned
  }

  // ── verdict stamp (honest — never overclaims a contradiction) ───────────────
  //   positive + stance   → words matched actions
  //   positive            → backed it up
  //   negative + rhetoric  → says one thing, does another (the contradiction)
  //   negative transparency/legal/other → a red flag, framed precisely
  function verdictOf(item, hasStance) {
    var tags = item.tags || [];
    var isRhetoric = item.category === 'rhetoric' ||
      (tags.indexOf && tags.indexOf('Rhetoric vs Reality') !== -1);
    if (item.impact === 'positive') {
      return hasStance
        ? { key: 'consistent', cls: 'v-consistent', ico: '✓', label: 'Words Match Actions', rank: 2 }
        : { key: 'consistent', cls: 'v-consistent', ico: '✓', label: 'Backed It Up', rank: 2 };
    }
    // negative
    if (item.category === 'legal') {
      return { key: 'flag', cls: 'v-flag', ico: '⚖', label: 'Legal Red Flag', rank: 3 };
    }
    if (hasStance || isRhetoric) {
      return { key: 'contradicts', cls: 'v-contradicts', ico: '⚠', label: 'Says One Thing · Does Another', rank: 5 };
    }
    if (item.category === 'transparency') {
      return { key: 'flag', cls: 'v-flag', ico: '🔍', label: 'Transparency Red Flag', rank: 3 };
    }
    return { key: 'flag', cls: 'v-flag', ico: '⚑', label: 'Red Flag On Record', rank: 3 };
  }

  // ── build the receipt set ───────────────────────────────────────────────────
  var _cache = null, _cacheKey = '';
  function buildKey() {
    var acct = 0;
    try { acct = window.ACCT_SPOTLIGHT ? Object.keys(window.ACCT_SPOTLIGHT).length : 0; } catch (e) {}
    var prof = 0;
    try { prof = window.PROFILES ? Object.keys(window.PROFILES).length : 0; } catch (e) {}
    var sd = 0;
    try { sd = window.ISSUE_STANCE_DATA ? Object.keys(window.ISSUE_STANCE_DATA).length : 0; } catch (e) {}
    return acct + ':' + prof + ':' + sd;
  }

  // ── Phase 10 receipt issue-key backfill (Say-vs-Do side) ────────────────────
  // The sibling of consistency.js's OFFICIAL_ACTION_ISSUE_BACKFILL, applied to the
  // OTHER side: public-record receipts (non-'voting' items) that shipped WITHOUT an
  // issueKey and so silently dropped out of the by-stance view. Each entry was hand-
  // assigned only where the item has a clear, single-issue policy nexus and maps to a
  // live ISSUE_MAP key; conduct / character / electoral-biography items with no policy
  // stance stay ABSENT on purpose (they remain visible in the flashpoints/receipts
  // surfaces, they just can't be grouped under a stated stance). Keyed by
  // "<pid>||<normalized headline>". No double-counting risk: this only touches
  // non-'voting' receipts, and 'voting' items are dropped from collect() upstream, so
  // an item is never keyed on both the Official Record and Say-vs-Do sides.
  var SAYDO_RECEIPT_ISSUE_BACKFILL = {
    'bmoore||voted to certify the 2020 election breaking with most of his party': 'election_integrity',
    'owens||voted to object to pennsylvania s 2020 electoral votes': 'election_integrity',
    'dhenderson||knocked down 2020 election fraud claims as utah s chief election officer': 'election_integrity',
    'dhenderson||rebuked election deniers in her own party before the 2024 vote': 'election_integrity',
    'dhenderson||welcomed an independent audit of utah s elections': 'election_integrity',
    'cbramble||co authored the sb54 ballot access compromise and defended it': 'election_integrity',
    'cory_maloy_h52||drew a clear line on ballot return privacy': 'election_integrity',
    'lyman||contested the primary result with unverified claims': 'election_integrity',
    'maloy||touted broadband funds from a law she publicly criticized': 'broadband',
    'kennedy||a practicing physician who legislates on healthcare transparency': 'healthcare',
    'cox||residential water saving message vs industrial water power approvals': 'water',
    'bwilson||made the great salt lake rescue his signature cause as speaker': 'water'
  };
  function _normHead(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  // Resolve a receipt's issueKey: its own, else the Phase 10 backfill (validated
  // against the live ISSUE_MAP so a stale entry can never inject an invalid key).
  function _resolveReceiptIssue(pid, it) {
    if (it.issueKey) return it.issueKey;
    var ik = SAYDO_RECEIPT_ISSUE_BACKFILL[pid + '||' + _normHead(it.headline)] || '';
    if (!ik) return '';
    try { if (window.ISSUE_MAP && !window.ISSUE_MAP[ik]) return ''; } catch (e) {}
    return ik;
  }

  function collect() {
    var key = buildKey();
    if (_cache && key === _cacheKey) return _cache;
    _cacheKey = key;

    var ACCT = window.ACCT_SPOTLIGHT || {};
    var out = [];
    Object.keys(ACCT).forEach(function (pid) {
      var items = ACCT[pid];
      if (!Array.isArray(items)) return;
      var d = polRec(pid) || polRec(alias(pid));
      var name = (d && d.name) || prettyName(pid);
      var hasOffice = !!(d && (d.office || d.district));
      var sub = d
        ? [d.office, d.district, d.state].map(function (x) { return String(x == null ? '' : x).trim(); })
            .filter(Boolean).join(' · ')
        : '';
      var party = d ? partyChip(d.party) : null;
      var photo = photoFor(pid) || photoFor(alias(pid));

      items.forEach(function (it) {
        if (!it || (it.impact !== 'negative' && it.impact !== 'positive')) return;
        // Phase 3 boundary: 'voting' items are FORMAL LEGISLATIVE ACTIONS, migrated
        // to the Official Record (window.PDXConsistency.officialActions). They must
        // not appear on any Say-vs-Do surface — hero, profile feed, flashpoints,
        // search, or the gateway "strongest" routing — so we drop them here at the
        // single collect() chokepoint every Say-vs-Do surface reads from. No signal
        // is lost: it now feeds Official Record instead.
        if (String(it.category || '').toLowerCase() === 'voting') return;
        if (!it.headline || !it.source || !it.source.url) return; // must be checkable
        var resolvedKey = _resolveReceiptIssue(pid, it);          // own issueKey, else Phase 10 backfill
        var st = stanceFor(pid, resolvedKey);
        var verdict = verdictOf(it, !!st);
        var im = issueMeta(resolvedKey);

        // Ranking: contradictions first, prefer explicit say/do pairs, known
        // officeholders and recent, sourced events.
        var score = verdict.rank * 100;
        if (st) score += 120;                    // explicit SAID + DID
        if (hasOffice) score += 30;
        if (it.facts) score += 8;
        score += Math.max(0, yearOf(it.date) - 2000); // recency nudge

        out.push({
          pid: pid, name: name, sub: sub, party: party, photo: photo, hasOffice: hasOffice,
          issueKey: resolvedKey || '', issue: im,
          said: st ? { text: st.text || st.topic, word: stanceWord(st) } : null,
          headline: it.headline, facts: it.facts || it.body || '', why: it.why || '',
          date: it.date || '', source: it.source, category: it.category || '',
          impact: it.impact, verdict: verdict, score: score
        });
      });
    });

    out.sort(function (a, b) { return b.score - a.score; });
    _cache = out;
    return out;
  }

  // Only one strongest receipt per politician (used for the hero + search so the
  // same person doesn't dominate the rotation).
  function collectDistinct(filterFn) {
    var seen = {}, list = [];
    collect().forEach(function (r) {
      if (filterFn && !filterFn(r)) return;
      if (seen[r.pid]) return;
      seen[r.pid] = 1; list.push(r);
    });
    return list;
  }

  function forPolitician(id) {
    if (!id) return null;
    var all = collect(), best = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].pid === id || all[i].pid === alias(id) || alias(all[i].pid) === id) {
        if (!best || all[i].score > best.score) best = all[i];
      }
    }
    return best;
  }

  // ── card renderers ──────────────────────────────────────────────────────────
  function srcHTML(r) {
    var label = (r.source && r.source.label) || 'Source';
    return '<a class="svd-rc-src" href="' + escAttr(r.source.url) + '" target="_blank" rel="noopener" ' +
      'onclick="event.stopPropagation()" title="Open the source ↗">' +
      '<span aria-hidden="true">📎</span><span class="svd-src-label">' + esc(label) + '</span>' +
      '<span aria-hidden="true">↗</span></a>';
  }
  function photoHTML(r, cls) {
    if (r.photo) {
      return '<span class="' + cls + '"><img src="' + escAttr(r.photo) + '" alt="" loading="lazy" ' +
        'onerror="this.style.display=\'none\';this.parentNode.textContent=\'🏛\'"></span>';
    }
    return '<span class="' + cls + '">🏛</span>';
  }

  function cardHTML(r, opts) {
    opts = opts || {};
    var v = r.verdict;
    var party = r.party
      ? '<span class="svd-rc-party" style="color:' + r.party.color + ';background:' + r.party.color +
        '22;border:1px solid ' + r.party.color + '55;">' + esc(r.party.label) + '</span>'
      : '';
    var issue = r.issue
      ? '<div class="svd-rc-issue">' + esc(r.issue.icon) + ' ' + esc(r.issue.label) + '</div>'
      : '';

    var said = r.said
      ? '<div class="svd-line svd-said">' +
          '<span class="svd-line-tag" aria-hidden="true">💬</span>' +
          '<div class="svd-line-label">They said</div>' +
          '<div class="svd-line-text">' + esc(r.said.word) + ': "' + esc(r.said.text) + '"</div>' +
        '</div>'
      : '';

    var didLabel = r.impact === 'positive' ? 'And the record shows' : 'But the record shows';
    var detail = r.facts
      ? '<div class="svd-line-detail">' + esc(r.facts) + '</div>'
      : (r.why ? '<div class="svd-line-detail">' + esc(r.why) + '</div>' : '');
    var did =
      '<div class="svd-line svd-did">' +
        '<span class="svd-line-tag" aria-hidden="true">⚖</span>' +
        '<div class="svd-line-label">' + esc(didLabel) + '</div>' +
        '<div class="svd-line-text svd-line-headline">' + esc(r.headline) + '</div>' +
        detail +
      '</div>';

    // Next-action rail — a receipt is never a dead end. In the hero card we show
    // the compact icon rail; the lightbox passes opts.actions === false and renders
    // the full labelled rail itself (so it isn't shown twice).
    var foot;
    if (opts.actions !== false && window.PDXJourney && typeof window.PDXJourney.nextActionsHTML === 'function') {
      foot = '<div class="svd-rc-foot">' + srcHTML(r) +
        (r.date ? '<span class="svd-rc-date">' + esc(r.date) + '</span>' : '') + '</div>' +
        window.PDXJourney.nextActionsHTML(r, 'compact');
    } else {
      foot = '<div class="svd-rc-foot">' + srcHTML(r) +
        (r.date ? '<span class="svd-rc-date">' + esc(r.date) + '</span>' : '') +
        '<span class="svd-rc-actions">' +
          '<button type="button" class="svd-share-btn" data-pid="' + escAttr(r.pid) + '" ' +
            'aria-label="Share this receipt as an image">' +
            '<span class="svd-share-ico" aria-hidden="true">📤</span> Share</button>' +
          '<span class="svd-rc-more">Profile →</span>' +
        '</span>' +
      '</div>';
    }

    return '<div class="svd-receipt ' + v.cls + '" role="button" tabindex="0" ' +
        'data-pid="' + escAttr(r.pid) + '" aria-label="' + escAttr(r.name + ' — ' + v.label) + '. Open profile.">' +
        '<div class="svd-rc-head">' +
          photoHTML(r, 'svd-rc-photo') +
          '<div class="svd-rc-id">' +
            '<div class="svd-rc-name">' + esc(r.name) + party + '</div>' +
            (r.sub ? '<div class="svd-rc-sub">' + esc(r.sub) + '</div>' : '') +
          '</div>' +
          '<div class="svd-stamp"><div class="svd-stamp-ico" aria-hidden="true">' + v.ico + '</div>' +
            '<div class="svd-stamp-v">' + esc(v.label) + '</div></div>' +
        '</div>' +
        issue + said + did +
        foot +
      '</div>';
  }

  function miniHTML(r) {
    return '<div class="svd-mini ' + r.verdict.cls + '" role="button" tabindex="0" ' +
        'data-pid="' + escAttr(r.pid) + '" aria-label="' + escAttr(r.name + ' — ' + r.verdict.label) + '. Open profile.">' +
        '<button type="button" class="svd-mini-share svd-share-btn" data-pid="' + escAttr(r.pid) + '" ' +
          'title="Share this receipt" aria-label="Share this receipt as an image">📤</button>' +
        '<div class="svd-mini-top">' + photoHTML(r, 'svd-mini-photo') +
          '<div><div class="svd-mini-name">' + esc(r.name) + '</div>' +
          '<div class="svd-mini-verd">' + r.verdict.ico + ' ' + esc(r.verdict.label) + '</div></div>' +
        '</div>' +
        '<div class="svd-mini-head">' + esc(r.headline) + '</div>' +
        '<div class="svd-mini-foot"><span class="svd-mini-src">📎 ' +
          esc((r.source && r.source.label) || 'Source') + '</span>' +
          (r.date ? '<span>· ' + esc(r.date) + '</span>' : '') + '</div>' +
      '</div>';
  }

  // Tiny verdict chip for the All-Seeing Eye politician rows.
  function rowBadge(id) {
    var r = forPolitician(id);
    if (!r) return '';
    return '<span class="svd-eye-badge ' + r.verdict.cls + '" title="' + escAttr('Say vs. Do: ' + r.verdict.label) + '">' +
      r.verdict.ico + ' ' + esc(r.verdict.label) + '</span>';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHAREABLE RECEIPT IMAGE  ·  the credibility-proof, viral artifact
  // ──────────────────────────────────────────────────────────────────────────
  // The on-screen receipt is rendered to a real PNG (canvas 2D — no libraries,
  // no new data) so it can be shared as an image file: verdict-stamped, sourced,
  // dated, PolitiDex-watermarked. One tap uses the native share sheet (any app
  // on mobile) via navigator.share({files}); where that's unavailable a compact
  // menu offers save / copy-caption / X / Facebook. The politician avatar is a
  // drawn monogram (not a hotlinked photo) so the canvas is never tainted and
  // toBlob()/share always succeed, even offline.
  // ══════════════════════════════════════════════════════════════════════════
  var SHARE_URL = 'https://politidex.fyi/';
  // Ceiling for an Official Record post. tweetText() reserves both addresses out
  // of this before the headline is measured — see the comment there for why both
  // have to travel and why this is 280 rather than the old self-imposed 240.
  var RECORD_POST_MAX = 280;
  var IMG_W = 1080, IMG_H = 1350, PAD = 64;
  var ACCENT = { contradicts: '#f87171', consistent: '#4ade80', flag: '#f59e0b', omnibus: '#a78bfa' };
  function accentOf(r) { return ACCENT[r.verdict.key] || '#f87171'; }

  function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var wants = [
      '700 40px "Bebas Neue"', '700 40px "Barlow Condensed"', '800 40px "Barlow Condensed"',
      '600 40px "Barlow Condensed"', '400 40px "Barlow"', '600 40px "Barlow"', 'italic 400 40px "Barlow"'
    ];
    var loads = wants.map(function (f) { try { return document.fonts.load(f); } catch (e) { return Promise.resolve(); } });
    // Never block the share on a slow/failed font fetch — 1.2s cap, then draw.
    return Promise.race([
      Promise.all(loads).catch(function () {}),
      new Promise(function (res) { setTimeout(res, 1200); })
    ]);
  }

  function roundRect(ctx, x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  // Word-wrap `text` to `maxW`, at most `maxLines` (ellipsis on the last if cut).
  function wrapText(ctx, text, maxW, maxLines) {
    var words = String(text == null ? '' : text).trim().split(/\s+/).filter(Boolean);
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var probe = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(probe).width <= maxW || !cur) {
        cur = probe;
      } else {
        lines.push(cur); cur = words[i];
        if (maxLines && lines.length === maxLines) { cur = ''; break; }
      }
    }
    if (cur && (!maxLines || lines.length < maxLines)) lines.push(cur);
    // If we ran out of line budget mid-text, ellipsize the final line.
    if (maxLines && lines.length === maxLines) {
      var consumed = lines.join(' ').split(/\s+/).length;
      if (consumed < words.length) {
        var last = lines[maxLines - 1];
        while (last && ctx.measureText(last + '…').width > maxW) {
          last = last.replace(/\s*\S+$/, '');
          if (last.indexOf(' ') === -1 && ctx.measureText(last + '…').width > maxW) {
            while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
            break;
          }
        }
        lines[maxLines - 1] = (last || '') + '…';
      }
    }
    return lines;
  }
  function drawLines(ctx, lines, x, y, lh) {
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lh);
    return y + lines.length * lh;
  }

  // ── Issue lists: a truncated issue name is not an issue name ────────────────
  // The split rows on an omnibus card name the OTHER curated issues the same
  // cited vote moved. Wrapping that list with a one-line clamp ellipsized it
  // mid-label: the H.R. 1 card announced "THE SAME VOTE MOVED 14 MAPPED ISSUES"
  // and then printed "Cut Income & Business Taxes · Cut Federal Spending &
  // Reduce Debt · Middle-Class Tax…" — two real names out of ten, followed by a
  // fragment that reads like a third issue and is not one. A reader has no way
  // to tell which of those is a whole name, and no way to look up the fragment.
  //
  // So the list is packed by WHOLE label and the remainder is counted instead of
  // cut. "+8 more" is a true statement a reader can go and check; "Middle-Class
  // Tax…" is not a statement at all. Whole labels are dropped from the end, one
  // at a time, until the list plus its counter fits the line budget.
  function labelListLines(ctx, list, maxW, maxLines) {
    if (!list || !list.length || !(maxLines >= 1)) return [];
    for (var k = list.length; k >= 1; k--) {
      var txt = list.slice(0, k).join(' · ');
      if (k < list.length) txt += ' · +' + (list.length - k) + ' more';
      var lines = wrapText(ctx, txt, maxW, 0);
      var fits = lines.length <= maxLines;
      for (var i = 0; fits && i < lines.length; i++) {
        if (ctx.measureText(lines[i]).width > maxW) fits = false;
      }
      if (fits) return lines;
    }
    // Even a single label plus the counter overflows the budget. The bare count
    // is still true and still legible; a clipped name would be neither.
    return [String(list.length) + ' issues'];
  }

  // ── Facts block: drop a sentence, never a bill title ────────────────────────
  // The supporting block has a hard line budget, and the naive way to spend it is
  // to hand wrapText() one long joined string and let it ellipsize whatever falls
  // off the end. That is fine when the tail is a rationale clause and wrong when
  // it is the measure's name: a card reading "…the One Big Beautiful Bill Ac…"
  // has broken the one string a reader needs in order to go look the vote up, and
  // a receipt that cannot be checked is not a receipt.
  //
  // So when the card supplies `factParts` (see supportingParts in receipt-cards.js)
  // we spend the budget by SEGMENT instead. The first `factProtected` slots — what
  // a Yea did, and the title — always ship whole; the optional tail is dropped one
  // segment at a time, longest-lived last, until the block fits the budget.
  // Nothing is ever cut mid-phrase, and a dropped rationale is a sentence the
  // reader never sees rather than one that breaks off mid-word.
  //
  // Each surviving segment also starts on its OWN line and carries its own TIER.
  // Both are readability, and both are about the same failure: joined into one
  // run with a single colour, the block is an undifferentiated paragraph in which
  // the two clauses that carry the most weight — what a Yea did, and what the bill
  // is called — are indistinguishable from the curator's rationale and from
  // "House · Passed". Worse, a long effect sentence could leave the title starting
  // three words before a wrap, so the measure's name straddled a line break for no
  // reason but where the sentence in front of it happened to end. A reader
  // scanning a phone-sized image for the bill should find it at the start of a
  // line, in a weight that says it matters, every time.
  //
  // Every tier keeps the same 29px body size and 38px line height, so the budget
  // stays one number and nothing on the card gets smaller: the hierarchy is
  // carried by weight, colour and the line break, never by shrinking text toward
  // illegibility. `plain` is the pre-existing single-run styling and is what a
  // curated Say-vs-Do receipt still gets, unchanged.
  //
  // Ellipsis remains the fallback for the case the segments cannot fix: a title so
  // long the protected prefix alone overflows. Truncating there is still the right
  // call — the alternative is a blank block — but it is now rare and visible
  // rather than routine. Cards with no `factParts` keep the old behaviour exactly.
  var FACT_LH = 38;
  // Line height for a wrapped issue list in the split block. Tighter than the
  // fact block's 38 because these are list items, not sentences.
  var SPLIT_LH = 30;
  var FACT_TIERS = {
    effect: { font: '600 29px "Barlow", sans-serif', fill: '#f5c842' },
    title:  { font: '600 29px "Barlow", sans-serif', fill: '#e8eefc' },
    tail:   { font: '400 29px "Barlow", sans-serif', fill: '#9fb4d4' },
    plain:  { font: '400 29px "Barlow", sans-serif', fill: '#b7c6de' }
  };
  // [{ tier, text, lines }] in draw order, already fitted to `maxLines`.
  function factBlocks(ctx, r, maxW, maxLines) {
    if (!(maxLines >= 1)) return [];
    var parts = r && r.factParts;
    // Measuring has to happen under the tier's own font or the budget is spent in
    // the wrong units; the caller's font is put back so this stays a pure read.
    var wrapAs = function (tier, text, cap) {
      if (!text) return null;
      var save = ctx.font;
      ctx.font = FACT_TIERS[tier].font;
      var lines = wrapText(ctx, text, maxW, cap || 0);
      ctx.font = save;
      return lines.length ? { tier: tier, text: text, lines: lines } : null;
    };
    if (!parts || !parts.length) {
      var one = wrapAs('plain', (r && r.facts) || '', maxLines);
      return one ? [one] : [];
    }
    var prot = Math.max(0, Math.min(parts.length, r.factProtected == null ? 2 : r.factProtected));
    var head = [];
    if (prot >= 1 && parts[0]) head.push(['effect', String(parts[0])]);
    if (prot >= 2 && parts[1]) head.push(['title', String(parts[1])]);
    // Beyond the protected prefix the segments are all supporting detail, so they
    // share one tier and one run — the shedding order is what distinguishes them.
    var opt = parts.slice(prot).filter(Boolean);
    for (var n = opt.length; n >= 0; n--) {
      var blocks = [], used = 0, i, b;
      for (i = 0; i < head.length; i++) {
        b = wrapAs(head[i][0], head[i][1]);
        if (b) { blocks.push(b); used += b.lines.length; }
      }
      b = wrapAs('tail', opt.slice(0, n).join(' — '));
      if (b) { blocks.push(b); used += b.lines.length; }
      if (blocks.length && used <= maxLines) return blocks;
    }
    // Protected prefix alone still overflows. Spend the budget in order, keeping
    // a line in reserve for each protected segment still to come so that none of
    // them is silently dropped — a card that just stops naming the bill looks
    // like a card that had nothing to say about it. Whichever segment the budget
    // runs out inside is ellipsized, so the cut is visible where it happened.
    // Rare by construction, and the same clause the joined-string version would
    // have cut, so nothing became less visible by tiering the block.
    var out = [], left = maxLines, blk, cap;
    for (var h = 0; h < head.length && left > 0; h++) {
      cap = Math.max(1, left - (head.length - 1 - h));
      blk = wrapAs(head[h][0], head[h][1], cap);
      if (!blk) continue;
      out.push(blk); left -= blk.lines.length;
    }
    if (!out.length) { blk = wrapAs('plain', (r && r.facts) || '', maxLines); if (blk) out.push(blk); }
    return out;
  }
  // The same fitted block as flat text. Used by the tests, which assert on what
  // reaches the card rather than on how it is painted.
  function factLines(ctx, r, maxW, maxLines) {
    var out = [];
    factBlocks(ctx, r, maxW, maxLines).forEach(function (b) { out = out.concat(b.lines); });
    return out;
  }
  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '★';
    var a = parts[0][0] || '';
    var b = parts.length > 1 ? (parts[parts.length - 1][0] || '') : '';
    return (a + b).toUpperCase();
  }

  function renderCanvas(r) {
    return ensureFonts().then(function () {
      var c = document.createElement('canvas');
      c.width = IMG_W; c.height = IMG_H;
      var ctx = c.getContext('2d');
      var accent = accentOf(r);
      var x = PAD, right = IMG_W - PAD, contentW = right - x;

      // Background
      var bg = ctx.createLinearGradient(0, 0, 0, IMG_H);
      bg.addColorStop(0, '#0c1326'); bg.addColorStop(0.55, '#0b1120'); bg.addColorStop(1, '#080d1a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, IMG_W, IMG_H);
      // Accent glow, top
      var glow = ctx.createRadialGradient(IMG_W / 2, -80, 40, IMG_W / 2, -80, 720);
      glow.addColorStop(0, accent + '30'); glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, IMG_W, 420);

      // Faint tiled watermark — survives cropping/screenshots.
      ctx.save();
      ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.font = '700 64px "Bebas Neue", "Barlow Condensed", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.translate(IMG_W / 2, IMG_H / 2); ctx.rotate(-28 * Math.PI / 180);
      for (var wy = -IMG_H; wy < IMG_H; wy += 150) {
        for (var wx = -IMG_W; wx < IMG_W; wx += 520) {
          ctx.fillText('POLITIDEX', wx, wy);
        }
      }
      ctx.restore();

      // Left verdict rail + framed border
      ctx.fillStyle = accent; ctx.fillRect(0, 0, 12, IMG_H);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
      roundRect(ctx, 24, 24, IMG_W - 48, IMG_H - 48, 28); ctx.stroke();

      ctx.textBaseline = 'alphabetic';
      var y = PAD + 40;

      // ── Header: wordmark + tagline ──
      ctx.font = '700 58px "Bebas Neue", "Barlow Condensed", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff'; ctx.fillText('POLITI', x, y);
      var wI = ctx.measureText('POLITI').width;
      ctx.fillStyle = '#f0475f'; ctx.fillText('DEX', x + wI, y);
      ctx.font = '700 22px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#f5c842';
      ctx.fillText('B O U N D   B Y   T R U T H', x + 3, y + 62);

      // ── Verdict stamp (top-right, angled) ──
      ctx.save();
      ctx.font = '800 30px "Barlow Condensed", sans-serif';
      var vLines = wrapText(ctx, r.verdict.label.replace(' · ', ' '), 300, 2);
      var stampW = 0;
      vLines.forEach(function (l) { stampW = Math.max(stampW, ctx.measureText(l.toUpperCase()).width); });
      stampW = Math.min(Math.max(stampW + 44, 190), 340);
      var stampH = 58 + vLines.length * 34;
      var scx = right - stampW / 2 - 6, scy = y + 8 + stampH / 2;
      ctx.translate(scx, scy); ctx.rotate(-7 * Math.PI / 180);
      ctx.fillStyle = accent + '1f';
      ctx.strokeStyle = accent; ctx.lineWidth = 4;
      roundRect(ctx, -stampW / 2, -stampH / 2, stampW, stampH, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = '800 34px "Barlow Condensed", sans-serif';
      ctx.fillText(r.verdict.ico === '⚠' ? 'VERDICT' : 'VERDICT', 0, -stampH / 2 + 12);
      ctx.font = '800 30px "Barlow Condensed", sans-serif';
      for (var vi = 0; vi < vLines.length; vi++) {
        ctx.fillText(vLines[vi].toUpperCase(), 0, -stampH / 2 + 50 + vi * 34);
      }
      ctx.restore();
      ctx.textAlign = 'left';

      y += 118;
      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(right, y); ctx.stroke();
      y += 40;

      // ── Politician: monogram + name/office ──
      var av = 128, avx = x, avy = y;
      var pc = r.party;
      var ringCol = pc ? pc.color : '#7596c0';
      ctx.beginPath(); ctx.arc(avx + av / 2, avy + av / 2, av / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = ringCol; ctx.stroke();
      ctx.fillStyle = '#eef4ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 54px "Bebas Neue", "Barlow Condensed", sans-serif';
      ctx.fillText(initials(r.name), avx + av / 2, avy + av / 2 + 3);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';

      var nx = avx + av + 30, nw = right - nx;
      ctx.font = '700 62px "Bebas Neue", "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#ffffff';
      var nameLines = wrapText(ctx, r.name, nw, 2);
      var ny = avy + (nameLines.length === 1 ? 14 : 0);
      drawLines(ctx, nameLines, nx, ny, 58);
      if (r.sub) {
        ctx.font = '600 28px "Barlow Condensed", sans-serif';
        ctx.fillStyle = '#9fb4d4';
        var subLine = wrapText(ctx, r.sub, nw, 1);
        ctx.fillText(subLine[0] || '', nx, ny + nameLines.length * 58 + 6);
      }
      y = avy + av + 34;

      // ── Issue chip ──
      if (r.issue) {
        ctx.font = '700 24px "Barlow Condensed", sans-serif';
        var chipTxt = String(r.issue.label).toUpperCase();
        var cw = ctx.measureText(chipTxt).width + 40;
        ctx.fillStyle = 'rgba(139,92,246,0.16)'; ctx.strokeStyle = 'rgba(139,92,246,0.5)'; ctx.lineWidth = 2;
        roundRect(ctx, x, y, cw, 44, 22); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c4b5fd'; ctx.textBaseline = 'middle';
        ctx.fillText(chipTxt, x + 20, y + 24);
        ctx.textBaseline = 'top';
        y += 72;
      } else { y += 12; }

      // Footer geometry (reserve space so the body never collides with it).
      // A vote-derived card carries two extra footer lines — the citable source
      // URL and the visible method link — so the reserve grows to match rather
      // than the body being allowed to run into them.
      var extraFoot = (r.verifyUrl ? 30 : 0) + (r.method ? 28 : 0);
      var footTop = IMG_H - PAD - 96 - extraFoot;

      // ── SAID block ──
      if (r.said) {
        ctx.fillStyle = '#60a5fa'; ctx.fillRect(x, y + 4, 5, 26);
        ctx.font = '800 22px "Barlow Condensed", sans-serif';
        ctx.fillStyle = '#7ab0f0';
        // Vote-derived cards override this label. "THEY SAID" is past tense above
        // a dated vote, which reads as a sequence — and stance blocks carry no
        // date, so that sequence is not something the data knows.
        ctx.fillText(r.saidLabel || 'THEY SAID', x + 18, y);
        y += 36;
        ctx.font = 'italic 400 34px "Barlow", sans-serif';
        ctx.fillStyle = '#dbe6f7';
        var saidLines = wrapText(ctx, (r.said.word ? r.said.word + ': ' : '') + '“' + r.said.text + '”', contentW, 3);
        y = drawLines(ctx, saidLines, x, y, 44) + 8;
        // The disclosure that goes with the relabelled block: said outright on the
        // image, because the image is what travels. Only vote-derived cards set it.
        // Set two points larger than the footer's small print — it is a claim about
        // what the card does NOT assert, and a caveat nobody can read at thumbnail
        // size is a caveat the card may as well not be making.
        if (r.saidNote) {
          ctx.font = '600 23px "Barlow Condensed", sans-serif';
          ctx.fillStyle = '#7596c0';
          ctx.fillText(wrapText(ctx, String(r.saidNote), contentW, 1)[0] || '', x, y);
          y += 28;
        }
        y += 18;
      }

      // ── RECORD block ──
      ctx.fillStyle = accent; ctx.fillRect(x, y + 4, 5, 26);
      ctx.font = '800 22px "Barlow Condensed", sans-serif';
      ctx.fillStyle = accent;
      ctx.fillText(r.impact === 'positive' ? 'AND THE RECORD SHOWS' : 'BUT THE RECORD SHOWS', x + 18, y);
      y += 38;
      ctx.font = '700 42px "Barlow", sans-serif';
      ctx.fillStyle = '#ffffff';
      var headLines = wrapText(ctx, r.headline, contentW, 3);
      y = drawLines(ctx, headLines, x, y, 50) + 12;
      // ── Optional split block: one vote, two outcomes ───────────────────────
      // Only vote-derived omnibus cards set r.split. It names the other curated
      // issues the SAME cited vote moved, and the direction it moved each of
      // them, straight from the stored mapping — so a reader cannot mistake a
      // 14-issue package vote for a single-issue one. Curated receipts never set
      // it and are drawn exactly as before.
      if (r.split && (r.split.advances.length || r.split.opposes.length)) {
        ctx.font = '800 22px "Barlow Condensed", sans-serif';
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText('THE SAME VOTE MOVED ' + r.split.count + ' MAPPED ISSUES', x, y);
        y += 32;
        [['ADVANCES', r.split.advances, '#4ade80'], ['OPPOSES', r.split.opposes, '#f87171']]
          .forEach(function (row) {
            if (!row[1].length || y > footTop - 40) return;
            ctx.font = '700 24px "Barlow Condensed", sans-serif';
            var lbl = row[0] + ': ';
            var lw = ctx.measureText(lbl).width;
            // Up to two lines, and only as many as the space above the footer
            // actually allows. Two is enough to carry five or six whole issue
            // names; a third would start crowding out the bill title below.
            ctx.font = '400 24px "Barlow", sans-serif';
            var cap = Math.max(1, Math.min(2, Math.floor((footTop - 40 - y) / SPLIT_LH)));
            var lines = labelListLines(ctx, row[1], contentW - lw, cap);
            ctx.font = '700 24px "Barlow Condensed", sans-serif';
            ctx.fillStyle = row[2];
            ctx.fillText(lbl, x, y);
            ctx.font = '400 24px "Barlow", sans-serif';
            ctx.fillStyle = '#cdd9ec';
            // Continuation lines hang under the list, not under the label, so
            // the coloured ADVANCES/OPPOSES word stays the only thing in the
            // left gutter and the two rows remain scannable as two rows.
            for (var li = 0; li < lines.length; li++) {
              ctx.fillText(lines[li], x + lw, y + li * SPLIT_LH);
            }
            y += 32 + Math.max(0, lines.length - 1) * SPLIT_LH;
          });
        y += 6;
      }
      if (r.facts || (r.factParts && r.factParts.length)) {
        var maxFactLines = Math.max(0, Math.floor((footTop - y - 10) / FACT_LH));
        if (maxFactLines >= 1) {
          // One pass per tier. A curated receipt has no factParts, comes back as a
          // single `plain` block, and is painted in exactly the font and colour it
          // always was.
          var by = y;
          factBlocks(ctx, r, contentW, Math.min(maxFactLines, 7)).forEach(function (blk) {
            var tier = FACT_TIERS[blk.tier] || FACT_TIERS.plain;
            ctx.font = tier.font;
            ctx.fillStyle = tier.fill;
            by = drawLines(ctx, blk.lines, x, by, FACT_LH);
          });
        }
      }

      // ── Footer: source + date · watermark ──
      var fy = IMG_H - PAD - 70 - extraFoot;
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(right, fy); ctx.stroke();
      fy += 20;
      ctx.textBaseline = 'top';
      var srcLabel = (r.source && r.source.label) || 'Public record';
      ctx.font = '700 26px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#8fd0ff';
      var srcTxt = 'SOURCE: ' + srcLabel.toUpperCase() + (r.date ? '  ·  ' + String(r.date) : '');
      var srcClipped = wrapText(ctx, srcTxt, contentW, 1);
      ctx.fillText(srcClipped[0] || srcTxt, x, fy);
      var my = fy + 34;
      // The citable URL itself, printed so the receipt survives being screenshotted
      // out of the app: "check it yourself" is only true if the address travels
      // with the image. Vote-derived cards always set this.
      //
      // It sits DIRECTLY under the SOURCE label. The label says which record this
      // is; the address says where to go and read it. Anything set between them
      // makes a reader scan for the one line that makes the card checkable, and on
      // a phone that scan happens at thumbnail size.
      //
      // It is never wrapped and never ellipsized. A URL with a "…" in it is not
      // clickable, not typable, and quietly wrong — the reader has no way to know
      // what was removed. If the line is too wide it is SHRUNK to fit instead;
      // receipt-cards.js refuses any card whose address could not fit even so.
      if (r.verifyUrl) {
        // This row is now shared with the OFFICIAL RECORD / SAY vs. DO mark on the
        // right, which is painted after it and would otherwise overprint the end of
        // a long address. Measure the mark rather than guessing a margin, so the
        // clearance stays correct if that wording is ever changed.
        ctx.font = '700 20px "Barlow Condensed", sans-serif';
        var vMaxW = contentW - ctx.measureText(isRecordCard(r) ? 'OFFICIAL RECORD' : 'SAY vs. DO').width - 36;
        ctx.fillStyle = '#cfe0f7';
        var vTxt = 'VERIFY: ' + String(r.verifyUrl);
        for (var vSize = 22; vSize > 14; vSize--) {
          ctx.font = '600 ' + vSize + 'px "Barlow Condensed", sans-serif';
          if (ctx.measureText(vTxt).width <= vMaxW) break;
        }
        ctx.fillText(vTxt, x, my);
        my += 30;
      }
      ctx.font = '600 22px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#7596c0';
      ctx.fillText('Verdict based on public record — check it yourself.', x, my);
      // Method stays visible on the card, not just in the app.
      if (r.method) {
        my += 28;
        ctx.font = '600 21px "Barlow Condensed", sans-serif';
        ctx.fillStyle = '#7596c0';
        var mTxt = String(r.method);
        ctx.fillText(wrapText(ctx, mTxt, contentW, 1)[0] || mTxt, x, my);
      }
      // Right watermark
      ctx.textAlign = 'right';
      ctx.font = '700 30px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#f5c842';
      ctx.fillText('politidex.fyi', right, fy);
      ctx.font = '700 20px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#9fb4d4';
      // A vote-derived card is Official Record, not Say-vs-Do. The mark names
      // which system produced the verdict so the two are never conflated by
      // whoever sees the image.
      ctx.fillText(r.origin === 'official_record' ? 'OFFICIAL RECORD' : 'SAY vs. DO', right, fy + 36);
      ctx.textAlign = 'left';

      return c;
    });
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      try {
        if (canvas.toBlob) canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('toBlob null')); }, 'image/png');
        else {
          var dataUrl = canvas.toDataURL('image/png');
          var bin = atob(dataUrl.split(',')[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/png' }));
        }
      } catch (e) { reject(e); }
    });
  }

  function slugify(s) { return String(s || 'receipt').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'receipt'; }
  // A word-boundary trim, then one more cut: a clipped line that ends on a
  // function word reads as a transmission failure rather than an abbreviation.
  // "…to give Republicans a…" and "…aviation decarbonization, and…" both promise
  // a noun the reader never gets, and both were real short-post output. Dropping
  // the orphan costs three characters and buys a line that ends where a thought
  // pauses. Exactly one is dropped — chaining would eat real content.
  var TRIM_ORPHAN = /[\s,;:—–-]+(?:a|an|and|the|of|to|in|on|for|or|but|with|that|from|at|by|as|its|their|his|her|our|this|these|those|into|over|under|about|per|than|nor|so|if|it|is|are|was|were|be|been)$/i;
  function trimTo(s, n) {
    s = String(s || '');
    if (s.length <= n) return s;
    var cut = s.slice(0, n - 1).replace(/\s+\S*$/, '');
    var lean = cut.replace(TRIM_ORPHAN, '');
    if (lean.trim()) cut = lean;
    return cut.replace(/[\s,;:]+$/, '') + '…';
  }
  // The image carries its own provenance; the caption that travels beside it has to
  // agree with it. A vote-derived card is 🏛️ Official Record and leads with the bill,
  // and its source line prints the citable URL the card footer shows — a curated 🧾
  // Say-vs-Do receipt is unchanged.
  function isRecordCard(r) { return !!(r && r.origin === 'official_record'); }
  function sourceLine(r) {
    var lbl = (r.source && r.source.label) || (isRecordCard(r) ? 'the official record' : 'public record');
    // The card IMAGE prints r.verifyUrl — the same address with its scheme
    // stripped so it fits one footer line. Pasted text has no width limit, so it
    // carries the whole thing, https:// and all, ready to click.
    var full = (r.source && r.source.url) || r.verifyUrl || '';
    var url = isRecordCard(r) && full ? ' — ' + full : '';
    return lbl + (r.date ? ' (' + r.date + ')' : '') + url;
  }
  function issueName(r) { return (r && r.issue && r.issue.label) || ''; }

  // ── The card's fact tiers, named ────────────────────────────────────────────
  // receipt-cards.js builds factParts as a fixed four-slot array so the renderer
  // never has to guess which segment is which:
  //   [0] the "what a Yea did" sentence — present ONLY on a CRA / disapproval
  //       vote, empty on an ordinary bill
  //   [1] the measure's own title
  //   [2] the curated mapping rationale: in plain English, what this vote does to
  //       THIS issue
  //   [3] chamber · result
  // Captions used to print [0] and nothing else. On 192 of the 212 core public
  // cards [0] is empty, so the pasted text named a bill number, a procedural
  // question and a verdict — and never once said what the measure was about.
  // [1] and [2] are already on the card, already sanitised, already sourced.
  // They are the plain-English half of the share, and they belong in the text.
  function factPart(r, i) {
    var p = r && r.factParts;
    return (p && p[i]) ? String(p[i]).replace(/\s+/g, ' ').trim() : '';
  }
  function measureTitle(r) { return factPart(r, 1); }
  // "Voted Yea" / "Voted Nay", read off the headline the card already built —
  // not re-derived from the vote, so it cannot disagree with the image.
  function votedSeg(r) {
    var seg = String((r && r.headline) || '').split(' · ');
    var last = seg[seg.length - 1] || '';
    return /^Voted\b/i.test(last) ? last : '';
  }
  // A stated position is quoted prose that very often contains its own quotation
  // marks. Nesting them inside the caption's curly pair reads as a typo, and a
  // trim landing inside one leaves it unbalanced. Inner doubles become singles so
  // the outer pair stays unambiguous; trimTo() already breaks on a word boundary.
  function quoted(s, max) {
    var t = String(s || '').replace(/\s+/g, ' ').trim().replace(/[“”"]/g, "'");
    return t ? '“' + trimTo(t, max) + '”' : '';
  }
  // ── Official Record caption ─────────────────────────────────────────────────
  // ONE shape for all three record verdicts — contradiction, consistency and the
  // H.R. 1 omnibus split. The old caption varied its record-line prefix by
  // r.impact, which meant the same underlying fact ("here is the vote") was
  // introduced three different ways depending on which verdict had been reached,
  // and on an omnibus card that prefix was inherited from the say-vs-do verdict
  // underneath the split — so the wording moved for a reason no reader could see.
  // Nothing about the vote changes with the verdict, so neither does the line
  // that reports it. The VERDICT is stated once, in the lead, where it belongs.
  //
  // Every record caption carries, in this order and always:
  //   · the origin badge, spelled out, so the caption is unmistakably not a
  //     curated Say-vs-Do receipt even when the image is not visible
  //   · the issue, which the old caption never named at all — a reader landing on
  //     a quoted position and a bill number had no idea what the pair was about
  //   · the stated position and its undated disclosure, verbatim from the card
  //   · the record line, then the measure's own title, then — on a CRA or
  //     disapproval vote — the plain-English effect sentence, and then the
  //     curated mapping rationale. Those last three are the only things standing
  //     between "voted Yea on S.J.Res.11" and a reader who has no idea what a Yea
  //     on a resolution of disapproval does; they must travel with the text, not
  //     only with the pixels
  //   · on a split card, the mapped issues BY NAME rather than by count — "14
  //     issues, advances 9, opposes 5" is a statistic, and the point of the card
  //     is which ones — one labelled line per side, because fourteen names in a
  //     single paragraph is not a thing anyone reads on a phone
  //   · the full source URL, the method path, and the deep link back to this same
  //     receipt. All three, every time, scheme included so they are clickable.
  //
  // A curated 🧾 Say-vs-Do receipt takes the original path, unchanged.
  function recordCaption(r) {
    var lines = [];
    var iss = issueName(r);
    // Two lines, not one. Every platform truncates a caption somewhere, and the
    // half that has to survive is WHO and WHAT ISSUE — a verdict with no subject
    // is a slogan. So the badge, the name and the issue lead, and the verdict
    // follows on its own labelled line. Labelling it also keeps it readable as a
    // finding rather than as a headline the account is asserting.
    lines.push('🏛️ OFFICIAL RECORD — ' + r.name + (iss ? ' on ' + iss : ''));
    lines.push('Verdict: ' + r.verdict.label);
    if (r.said && r.said.text) {
      // The image prints the stance word ahead of the quote — Opposes: “…” —
      // because the verdict is computed against that word, not against the
      // prose. A caption that drops it asks a reader to accept "Says One Thing ·
      // Voted Another" with the one thing left out, and on a position whose
      // plain reading runs the other way it leaves the card looking arbitrary
      // when it is really disagreeing with a recorded stance. Same claim in the
      // text half as in the pixels, or the two halves are not the same share.
      lines.push('Their stated position: ' + (r.said.word ? r.said.word + ' — ' : '') +
        quoted(r.said.text, 150));
      if (r.saidNote) lines.push(r.saidNote);
    }
    lines.push('The record: ' + trimHeadline(r.headline, 150));
    // The three fact tiers, each with the label its provenance earns. [0] is the
    // disapproval effect and says what a Yea DID; [2] is the curated mapping
    // rationale and says why the vote counts on THIS issue. Different sources,
    // different claims, so they are never merged under one label — and the title
    // sits between them so the reader knows which measure both are about.
    var title = measureTitle(r);
    if (title) lines.push('The measure: ' + trimTo(title, 200));
    var didEffect = factPart(r, 0);
    if (didEffect) lines.push('What a Yea did: ' + trimTo(didEffect, 200));
    var why = factPart(r, 2);
    // 300, not 220. The long caption is the one artefact with no platform limit,
    // and the rationale is the sentence that answers "why does a defence vote
    // count on THIS issue" — the question a sceptical reader asks first. At 220
    // it cut 21 of the 212 core cards mid-sentence ("This NDAA also…"), which
    // reads as a claim withheld. 300 clears the longest rationale in the ledger.
    if (why) lines.push('Why it counts on ' + (iss || 'this issue') + ': ' + trimTo(why, 300));
    if (r.split && (r.split.advances.length || r.split.opposes.length)) {
      // One 400-character paragraph naming fourteen issues is not readable on a
      // phone. The count leads, then each side gets its own labelled line — the
      // same names, in the same order, nothing dropped and nothing summarised
      // into a statistic.
      lines.push('The same vote moved ' + r.split.count + ' mapped issues.');
      if (r.split.advances.length) lines.push('Advances: ' + r.split.advances.join(', '));
      if (r.split.opposes.length) lines.push('Opposes: ' + r.split.opposes.join(', '));
      // On a fourteen-issue package that list is long enough that a reader has to
      // hunt through it for the one issue the card is actually judging — and on
      // H.R. 1 two of the names ("Cut Federal Spending & Reduce Debt" and "Tackle
      // the National Debt") land on OPPOSITE sides, which reads as a mistake
      // until you know which one the card means. The image puts the focus issue
      // first in its own coloured row; a pasted caption has no colour, so it says
      // outright which side that issue came down on. Read off the stored mapping
      // the row above was built from — nothing new is asserted.
      var fx = r.split.focusEffect;
      if ((fx === 'advances' || fx === 'opposes') && iss) {
        lines.push('On ' + iss + ' — the issue this card is about — the vote came down on the ' + fx + ' side.');
      }
    }
    lines.push('Source: ' + sourceLine(r));
    if (r.method) lines.push(r.method.replace(/^HOW THIS IS JUDGED:\s*/i, 'How this is judged: '));
    lines.push('Check it yourself: ' + (receiptLink(r, '', { canonical: true }) || SHARE_URL));
    return lines.join('\n');
  }
  function caption(r) {
    if (isRecordCard(r)) return recordCaption(r);
    var lines = [];
    lines.push('🧾 ' + r.name + ' — ' + r.verdict.label.replace(' · ', ': '));
    if (r.said) lines.push('Said: “' + trimTo(r.said.text, 150) + '”');
    lines.push((r.impact === 'positive' ? 'Record: ' : 'But the record: ') + trimTo(r.headline, 150));
    lines.push('Source: ' + sourceLine(r));
    // Link straight back to THIS receipt, not just the homepage, so a share is
    // verifiable in one tap by whoever receives it.
    lines.push('Checked on PolitiDex · ' + (receiptLink(r, '', { canonical: true }) || SHARE_URL).replace(/^https?:\/\//, ''));
    return lines.join('\n');
  }
  // A record headline is "<measure> · <question> · Voted Yea". Three segments,
  // and trimTo() eats them from the right — so the very first thing a too-long
  // headline loses is WHICH WAY THEY VOTED, leaving a post that states a verdict
  // and then declines to say what the member did. On a Senate citation, where the
  // URL alone is ~86 characters, that is not a rare case: it is most of them.
  //
  // So the two ends are reserved and the QUESTION in the middle gives way, which
  // is the segment a reader can recover from either link. Anything that is not
  // this three-part shape (a curated receipt, a two-segment headline) falls
  // through to the ordinary trim untouched.
  function trimHeadline(h, max) {
    var s = String(h || '');
    if (s.length <= max) return s;
    var seg = s.split(' · ');
    if (seg.length < 3 || !/^Voted\b/i.test(seg[seg.length - 1])) return trimTo(s, max);
    var head = seg[0], tail = seg[seg.length - 1];
    var room = max - head.length - tail.length - 6;   // two ' · ' joiners
    // A middle segment clipped to a stub — "H.J.Res. 89 · On the… · Voted Yea" —
    // is worse than no middle segment at all: it reads as a broken string rather
    // than as an abbreviation, and the question is precisely the part a reader
    // can recover from either link. Below a width that can carry a recognisable
    // fragment, drop it outright.
    if (room < 16) return trimTo(head + ' · ' + tail, max);
    return head + ' · ' + trimTo(seg.slice(1, -1).join(' · '), room) + ' · ' + tail;
  }

  // ── The short post ──────────────────────────────────────────────────────────
  // What a stranger sees in a group chat before they decide whether to tap. The
  // old build was head + trimmed headline + two links, and it was missing the
  // half that makes the card a claim at all: the STATED POSITION. "Says One Thing
  // · Voted Another. H.Amdt. 232 · On Agreeing to the Amendment · Voted Nay" names
  // no thing said, and no thing the amendment would have done. It is a verdict
  // with both of its terms left out.
  //
  // So the short post is built from a required list rather than from whatever
  // survives a trim:
  //   🏛️ marker · name · issue      the origin, unmistakably not a curated receipt
  //   verdict                        stated, not implied
  //   Said:                          the position the verdict is computed against
  //   Did:                           which way they voted, on what, in plain words
  //   politidex.fyi deep link        reopens THIS receipt
  //   full chamber URL               the government's own record
  // and the method path only if it fits.
  //
  // ON LENGTH. Those elements do not fit in 280 characters, and on a Senate
  // citation they are not close: the two addresses cost ~157 there and the header
  // another ~95, leaving under 30 for both content lines. Rather than drop a
  // required element to protect a number inherited from one platform, the builder
  // spends whatever is left on Said and Did, gives each a floor it will not go
  // below, and lets the post run past 280 when the floors demand it. A post that
  // fits X but cannot say what was said is not a shorter post; it is a different,
  // weaker claim. The floors are what bound the overrun — nothing else grows, and
  // the method line is dropped entirely rather than allowed to push it further.
  // Measured across the 212 core public cards: 310–433 characters.
  //
  // ON THE SAID FLOOR. It was 50, and 50 is not a claim. Mike Simpson's post read
  // `Said: “Says he is 'troubled by the United States’…”` — a fragment that ends
  // inside a nested quote and states nothing at all, attached to a verdict of
  // "Says One Thing · Voted Another" that the reader is now asked to take on
  // faith. If the post cannot carry the position, it cannot carry the accusation.
  // 75 is the width at which the stated positions in this corpus reach a verb.
  var RECORD_POST_SAID_FLOOR = 75;
  var RECORD_POST_DID_FLOOR = 95;

  // "Voted Nay on H.Amdt. 232 (Boebert) to H.R. 8595 — eliminate funding for the
  // Fulbright Program": the direction, the measure, and what the measure was, in
  // that order. Falls back to the card's own headline when the pieces are not all
  // present.
  function recordDidLine(r, max) {
    var voted = votedSeg(r);
    var num = r.measureNumber || String((r && r.headline) || '').split(' · ')[0] || '';
    var lead = voted && num ? voted + ' on ' + num : (voted || num);
    if (!lead) return trimHeadline(r.headline, max);
    // Preference order is legibility: the disapproval sentence when there is one
    // (it is always plain English and always short), then the measure's own
    // title, then the curated mapping rationale.
    var effect = factPart(r, 0);
    var what = effect || measureTitle(r) || factPart(r, 2);
    // The effect sentence is a SENTENCE ABOUT THE MEASURE — "A yea rolls back a
    // major state climate rule." — not a description of this member's vote. Hung
    // off an em dash it silently becomes one: "Voted Nay on H.J.Res. 88 — A yea
    // rolls back a major state climate rule" tells a scrolling reader that Rick
    // Larsen's NAY rolled back the rule, which is the opposite of what happened.
    // A full stop keeps the two claims apart: what they did, then what a yea
    // does. Title and rationale are noun phrases and still take the em dash.
    var join = effect ? '. ' : ' — ';
    // Several stored titles already OPEN with the measure number — "H.R. 1 — One
    // Big Beautiful Bill Act", "H.Amdt. 232 (Boebert) to H.R. 8595 — …". Printing
    // one of those after "Voted Yea on H.R. 1" says the number twice, and cutting
    // the number off the front of the title leaves "(Boebert) to H.R. 8595 — …"
    // hanging. So when the title already names the measure, the title IS the
    // object of the sentence and the lead does not name it again.
    if (!effect && num && what &&
        what.slice(0, String(num).length).toUpperCase() === String(num).toUpperCase()) {
      lead = voted ? voted + ' on' : 'On';
      var joined = lead + ' ' + what;
      return joined.length <= max ? joined : lead + ' ' + trimTo(what, max - lead.length - 1);
    }
    // Only pair it on if a usable amount survives; a two-word stub after an em
    // dash is noise.
    if (what && max - lead.length - join.length >= 20) {
      return lead + join + trimTo(what, max - lead.length - join.length);
    }
    return trimTo(lead, max);
  }

  function tweetText(r) {
    var v = r.verdict.label.replace(' · ', ': ');
    if (!isRecordCard(r)) {
      return trimTo('🧾 ' + r.name + ' — ' + v + '. ' + r.headline +
        ' (source: ' + sourceLine(r) + ')', 240);
    }
    // Both addresses are reserved whole, before any content gets a budget. The
    // chamber URL is where the vote is read off the government's own record; the
    // politidex.fyi record link is where the judging is shown and this same
    // receipt reopens. A post carrying only the first is a claim footnoted to a
    // page that never mentions us; one carrying only the second asks a reader to
    // take our word for the vote. Neither is enough alone.
    var head = '🏛️ OFFICIAL RECORD — ' + r.name + (issueName(r) ? ' on ' + issueName(r) : '') +
      '\n' + r.verdict.label;
    var deep = receiptLink(r, '', { canonical: true }) || SHARE_URL;
    var src = (r.source && r.source.url) || r.verifyUrl || '';
    // Both links are LABELLED. Two bare URLs stacked at the foot of a post give a
    // cold reader no way to tell which one is the government's record and which
    // one reopens the receipt — and "Check:" is the invitation the whole share is
    // making. Fifteen characters is a cheap price for that.
    var tail = '\nCheck: ' + deep + (src ? '\nSource: ' + src : '');
    var said = (r.said && r.said.text) ? String(r.said.text) : '';
    // Newlines for "\nSaid: " and "\nDid: " are part of the fixed cost.
    var fixed = head.length + tail.length + (said ? 7 : 0) + 6;
    var room = RECORD_POST_MAX - fixed;
    var didBudget = Math.max(RECORD_POST_DID_FLOOR, Math.min(130, Math.round(room * 0.5)));
    var did = recordDidLine(r, didBudget);
    var saidBudget = said ? Math.max(RECORD_POST_SAID_FLOOR, Math.min(110, room - did.length)) : 0;
    var out = head +
      (said ? '\nSaid: ' + quoted(said, saidBudget) : '') +
      '\nDid: ' + did + tail;
    // The method path is the one optional element — it goes in only if the post
    // is still inside the target after everything required is in.
    var m = r.method ? String(r.method).replace(/^HOW THIS IS JUDGED:\s*/i, '') : '';
    if (m && out.length + m.length + 10 <= RECORD_POST_MAX) out += '\nMethod: ' + m;
    return out;
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'svd-toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-in'); });
    setTimeout(function () { t.classList.remove('is-in'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320); }, 2800);
  }
  function download(dataUrl, name) {
    var a = document.createElement('a');
    a.href = dataUrl; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 60);
  }
  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).catch(function () {});
    try { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch (e) {}
    return Promise.resolve();
  }

  // Desktop / no-file-share fallback: a compact menu of destinations. The image
  // is auto-saved so the user can attach it to a post (X/FB web can't upload a
  // remote image via an intent URL).
  var _menuEl = null;
  function closeMenu() { if (_menuEl && _menuEl.parentNode) _menuEl.parentNode.removeChild(_menuEl); _menuEl = null; document.removeEventListener('click', onDocClick, true); }
  function onDocClick(e) { if (_menuEl && !_menuEl.contains(e.target)) closeMenu(); }
  function openFallbackMenu(r, dataUrl, fileName, btn) {
    closeMenu();
    var cap = caption(r);
    download(dataUrl, fileName); // ready to attach
    var m = document.createElement('div');
    m.className = 'svd-share-menu';
    m.innerHTML =
      '<div class="svd-sm-head">Share this receipt</div>' +
      '<div class="svd-sm-note">✅ Image saved to your device — attach it to your post.</div>' +
      '<button type="button" data-act="save">📥 Save image again</button>' +
      '<button type="button" data-act="copy">🔗 Copy caption</button>' +
      '<button type="button" data-act="x">𝕏  Post on X</button>' +
      '<button type="button" data-act="fb">📘 Share on Facebook</button>';
    document.body.appendChild(m);
    _menuEl = m;
    // Position near the button, clamped to viewport. The anchor is optional: this
    // menu is now also reached from surfaces that close themselves before sharing
    // (the All-Seeing Eye's share action), so there may be no button left to measure
    // — and a detached one measures as a 0×0 box in the top-left corner, which puts
    // the menu somewhere the reader is not looking. With no usable anchor it is
    // centred instead. Desktop behaviour with a live anchor is unchanged.
    var rect = null;
    try { if (btn && btn.getBoundingClientRect) rect = btn.getBoundingClientRect(); } catch (e) { rect = null; }
    var mw = 240;
    var anchored = !!(rect && (rect.width || rect.height) && btn.isConnected !== false);
    var left, top;
    if (anchored) {
      left = Math.min(Math.max(8, rect.left), window.innerWidth - mw - 8);
      top = rect.bottom + 8;
      if (top + 230 > window.innerHeight) top = Math.max(8, rect.top - 238);
    } else {
      left = Math.max(8, Math.round((window.innerWidth - mw) / 2));
      top = Math.max(8, Math.round((window.innerHeight - 230) / 2));
    }
    m.style.left = left + 'px'; m.style.top = top + 'px';
    m.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'save') download(dataUrl, fileName);
      else if (act === 'copy') copyText(cap).then(function () { toast('Caption copied'); });
      else if (act === 'x') window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText(r)) + '&url=' + encodeURIComponent(receiptLink(r, '', { canonical: true }) || SHARE_URL), '_blank', 'noopener');
      else if (act === 'fb') window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(receiptLink(r, '', { canonical: true }) || SHARE_URL) + '&quote=' + encodeURIComponent(caption(r)), '_blank', 'noopener');
      if (act !== 'copy') closeMenu();
    });
    setTimeout(function () { document.addEventListener('click', onDocClick, true); }, 0);
  }

  var _sharing = false;
  function setBusy(btn, busy) {
    if (!btn) return;
    if (busy) {
      if (btn.getAttribute('data-label') == null) btn.setAttribute('data-label', btn.innerHTML);
      btn.classList.add('is-busy'); btn.disabled = true;
      btn.innerHTML = btn.classList.contains('svd-mini-share') ? '…' : '<span class="svd-share-ico">⏳</span> Building…';
    } else {
      btn.classList.remove('is-busy'); btn.disabled = false;
      var orig = btn.getAttribute('data-label'); if (orig != null) btn.innerHTML = orig;
    }
  }

  // One-tap share. `idOrReceipt` may be a pid or a receipt object.
  function share(idOrReceipt, btn) {
    if (_sharing) return;
    var r = (idOrReceipt && idOrReceipt.verdict) ? idOrReceipt : forPolitician(idOrReceipt);
    if (!r) { toast('No receipt to share yet'); return; }
    _sharing = true; setBusy(btn, true);
    var fileName = 'politidex-receipt-' + slugify(r.name) + '.png';
    var done = function () { _sharing = false; setBusy(btn, false); };

    renderCanvas(r).then(function (canvas) {
      return canvasToBlob(canvas).then(function (blob) {
        var file = null;
        try { file = new File([blob], fileName, { type: 'image/png' }); } catch (e) {}
        var payload = { text: caption(r) };
        if (file) payload.files = [file];
        // Preferred path: native share sheet WITH the image file.
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          return navigator.share(payload).catch(function (e) {
            if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return; // user cancelled
            openFallbackMenu(r, canvas.toDataURL('image/png'), fileName, btn);
          });
        }
        // No file-share support → destination menu (image auto-saved).
        openFallbackMenu(r, canvas.toDataURL('image/png'), fileName, btn);
      });
    }).catch(function (e) {
      try { toast('Could not build the image on this device'); } catch (_e) {}
    }).then(done, done);
  }

  // ── homepage hero band ──────────────────────────────────────────────────────
  var _rot = null, _idx = 0, _featured = [];
  function stopRotation() { if (_rot) { clearInterval(_rot); _rot = null; } }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function paintFeatured() {
    var stage = document.getElementById('svd-stage');
    if (!stage || !_featured.length) return;
    _idx = ((_idx % _featured.length) + _featured.length) % _featured.length;
    stage.innerHTML = cardHTML(_featured[_idx]);
    var dots = document.querySelectorAll('#say-vs-do .svd-dot');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('is-active', i === _idx);
    var cnt = document.getElementById('svd-count');
    if (cnt) cnt.textContent = (_idx + 1) + ' / ' + _featured.length;
  }
  function go(delta) { _idx += delta; paintFeatured(); }

  function mount() {
    var host = document.getElementById('say-vs-do');
    if (!host) return;

    // Featured = strongest contradictions, one per politician. Strip = a wider
    // mix (contradictions + a couple of "backed it up" for a fair, nonpartisan
    // read). Hide the whole band if there is genuinely nothing to show.
    var contradictions = collectDistinct(function (r) { return r.verdict.key === 'contradicts'; });
    var backed = collectDistinct(function (r) { return r.verdict.key === 'consistent'; });

    if (!contradictions.length && !backed.length) { host.hidden = true; return; }
    host.hidden = false;

    _featured = (contradictions.length ? contradictions : backed).slice(0, 8);

    // Strip: the next contradictions, plus up to 2 "backed it up" receipts so the
    // hero can't read as one-sided. Exclude whoever is already featured first.
    var featuredPids = {};
    _featured.forEach(function (r) { featuredPids[r.pid] = 1; });
    var stripPool = contradictions.filter(function (r) { return !featuredPids[r.pid]; });
    var strip = stripPool.slice(0, 4).concat(backed.filter(function (r) { return !featuredPids[r.pid]; }).slice(0, 2));
    strip = strip.slice(0, 6);

    var total = collectDistinct().length;
    var stampCount = contradictions.length;

    var stripHTML = strip.length
      ? '<div class="svd-strip-h">More receipts — every claim links to its source</div>' +
        '<div class="svd-strip">' + strip.map(miniHTML).join('') + '</div>'
      : '';

    host.innerHTML =
      '<div class="svd-inner">' +
        '<div class="svd-head">' +
          '<div class="svd-eyebrow">🧾 The Receipts</div>' +
          '<h2 class="svd-title"><span class="svd-say">Say</span><span class="svd-vs">vs.</span>' +
            '<span class="svd-do">Do</span></h2>' +
          '<p class="svd-lead">The fastest way to know a politician: put <strong>what they said</strong> ' +
            'next to <strong>what they actually did</strong>. Every card below is a real, dated, ' +
            'sourced receipt — verdict stamped. This is the difference.</p>' +
        '</div>' +
        '<div class="svd-stage" id="svd-stage"></div>' +
        (_featured.length > 1
          ? '<div class="svd-controls">' +
              '<button type="button" class="svd-nav" id="svd-prev" aria-label="Previous receipt">‹</button>' +
              '<div class="svd-dots" id="svd-dots">' +
                _featured.map(function (_, i) {
                  return '<button type="button" class="svd-dot' + (i === 0 ? ' is-active' : '') +
                    '" data-i="' + i + '" aria-label="Receipt ' + (i + 1) + '"></button>';
                }).join('') +
              '</div>' +
              '<span class="svd-count" id="svd-count">1 / ' + _featured.length + '</span>' +
              '<button type="button" class="svd-nav" id="svd-next" aria-label="Next receipt">›</button>' +
            '</div>'
          : '') +
        stripHTML +
        '<div class="svd-cta">' +
          '<a class="svd-cta-btn" href="#myteam-browse-panel">🔎 Check anyone on your ballot</a>' +
          '<div class="svd-cta-note">' + (stampCount ? stampCount + ' contradictions on record · ' : '') +
            total + ' sourced receipts and counting · nonpartisan</div>' +
          '<div class="svd-cta-note">Coverage grows daily — thin records are marked ' +
            '<b style="color:#cbb58a;">“not yet documented,”</b> never hidden.</div>' +
        '</div>' +
      '</div>';

    _idx = 0;
    paintFeatured();

    // ── interactions ─────────────────────────────────────────────────────────
    var prev = document.getElementById('svd-prev');
    var next = document.getElementById('svd-next');
    if (prev) prev.addEventListener('click', function () { go(-1); restart(); });
    if (next) next.addEventListener('click', function () { go(1); restart(); });
    var dots = document.getElementById('svd-dots');
    if (dots) dots.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.svd-dot');
      if (!b) return; _idx = parseInt(b.getAttribute('data-i'), 10) || 0; paintFeatured(); restart();
    });

    // Open a profile from any receipt (featured card or a strip mini). Bound
    // once per host element so repeated refresh()/mount() calls (e.g. when the
    // live roster loads) can't stack duplicate handlers.
    if (!host._svdBound) {
      host._svdBound = true;
      host.addEventListener('click', function (e) {
        // Share buttons handle themselves (global delegate below) — don't also
        // open the profile.
        if (e.target.closest && e.target.closest('.svd-share-btn')) return;
        var el = e.target.closest && e.target.closest('[data-pid]');
        if (!el || (e.target.closest && e.target.closest('a'))) return;
        var pid = el.getAttribute('data-pid');
        if (pid && typeof window.showProfile === 'function') window.showProfile(pid);
      });
      host.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest && e.target.closest('.svd-share-btn')) return; // its own click fires
        var el = e.target.closest && e.target.closest('[data-pid]');
        if (!el) return;
        e.preventDefault();
        var pid = el.getAttribute('data-pid');
        if (pid && typeof window.showProfile === 'function') window.showProfile(pid);
      });
    }

    // Auto-rotate the featured receipt (paused on hover / when off-screen).
    restart();
    var stage = document.getElementById('svd-stage');
    if (stage) {
      stage.addEventListener('mouseenter', stopRotation);
      stage.addEventListener('mouseleave', restart);
    }
  }

  function restart() {
    stopRotation();
    if (reducedMotion() || _featured.length < 2) return;
    _rot = setInterval(function () { go(1); }, 7000);
  }

  function refresh() { _cache = null; _cacheKey = ''; mount(); }

  // Global one-tap share delegate — bound once, so any receipt card (hero, strip,
  // or anywhere cardHTML/miniHTML is reused later) shares with a single tap.
  if (!window._svdShareBound) {
    window._svdShareBound = true;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.svd-share-btn');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      var pid = btn.getAttribute('data-pid');
      if (pid) share(pid, btn);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEARCH  ·  make every receipt reachable from the one global search box
  // ──────────────────────────────────────────────────────────────────────────
  // The global search is the universal answer-finder: a voter types a name, an
  // issue, or both ("lee guns", "broken promise on taxes") and lands directly on
  // the exact say-vs-do receipt. These helpers give the search box a fast,
  // pre-indexed view of the receipt set without duplicating any ranking logic.
  // ══════════════════════════════════════════════════════════════════════════

  function norm(s) { return String(s == null ? '' : s).toLowerCase(); }

  // Per-receipt search haystacks, memoized against the same key collect() uses so
  // they rebuild exactly once when the roster / accountability layer grows.
  var _searchIdx = null, _searchIdxKey = '';
  function searchIndex() {
    var key = buildKey();
    if (_searchIdx && key === _searchIdxKey) return _searchIdx;
    _searchIdxKey = key;
    _searchIdx = collect().map(function (r) {
      var nameTokens = norm(r.name).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
      var topic = r.issue ? norm(r.issue.label) : '';
      var hay = [
        r.name, topic, r.issueKey, r.headline, r.facts, r.why,
        r.verdict && r.verdict.label, r.category,
        r.said ? (r.said.word + ' ' + r.said.text) : ''
      ].map(norm).join(' ');
      return { r: r, nameTokens: nameTokens, topic: topic, hay: hay };
    });
    return _searchIdx;
  }

  // Ranked receipt matches for a free-form query. A term counts as a NAME hit
  // when it prefixes a name token ("lee" → Mike Lee), a TOPIC hit when it lands
  // in the issue label, or a TEXT hit anywhere in the receipt. "name + issue"
  // queries ("lee guns") score highest because both a name term and a topic/text
  // term land — which is exactly the "jump straight to the receipt" case. Returns
  // at most one receipt per (person + issue) so the list stays diverse.
  function search(query, limit) {
    var q = norm(query).trim();
    if (q.length < 2) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    var idx = searchIndex();
    var scored = [];
    for (var i = 0; i < idx.length; i++) {
      var e = idx[i], ok = true, s = 0, nameHits = 0, topicHits = 0;
      for (var t = 0; t < terms.length; t++) {
        var term = terms[t], hit = false;
        for (var n = 0; n < e.nameTokens.length; n++) {
          if (e.nameTokens[n].indexOf(term) === 0) { hit = true; nameHits++; s += 40; break; }
        }
        if (!hit && e.topic && e.topic.indexOf(term) !== -1) { hit = true; topicHits++; s += 24; }
        if (!hit && e.hay.indexOf(term) !== -1) { hit = true; s += 8; }
        if (!hit) { ok = false; break; }
      }
      if (!ok) continue;
      // The money case: a name term AND a topic/text term both landed → this is
      // the precise "who said one thing and did another on X" receipt.
      if (nameHits > 0 && (topicHits > 0 || terms.length > nameHits)) s += 60;
      s += (e.r.score || 0) / 20; // fold in the intrinsic contradiction ranking
      scored.push({ r: e.r, s: s });
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    var out = [], seen = {};
    for (var k = 0; k < scored.length; k++) {
      var r = scored[k].r, dk = r.pid + '::' + (r.issueKey || r.headline);
      if (seen[dk]) continue;
      seen[dk] = 1; out.push(r);
      if (out.length >= (limit || 6)) break;
    }
    return out;
  }

  // Compact, inline verdict chip for a search suggestion row. Accepts a pid, an
  // alias, or a receipt object; returns '' when there is no receipt on record so
  // callers can render nothing rather than an empty badge. The label is shortened
  // to fit a tight dropdown row; the full verdict stays in the tooltip.
  var _shortVerdict = { contradicts: 'Contradiction', consistent: 'Kept word', flag: 'Red flag' };
  function verdictBadge(idOrReceipt) {
    var r = (idOrReceipt && idOrReceipt.verdict) ? idOrReceipt : forPolitician(idOrReceipt);
    if (!r) return '';
    var short = _shortVerdict[r.verdict.key] || r.verdict.label;
    return '<span class="svd-badge ' + r.verdict.cls + '" title="' +
      escAttr('Say vs. Do: ' + r.verdict.label) + '">' + r.verdict.ico +
      ' ' + esc(short) + '</span>';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RECEIPT LIGHTBOX  ·  the surface search lands on
  // ──────────────────────────────────────────────────────────────────────────
  // A focused, dismissible overlay that shows one exact receipt — say vs. do,
  // verdict stamped, sourced — with one tap through to the full profile. This is
  // what "name + issue jumps straight to the receipt" opens. Keyboard-navigable
  // (Escape / backdrop to close, focus moved in and restored on close) and
  // mobile-friendly (full-width sheet, scrollable).
  // ══════════════════════════════════════════════════════════════════════════

  // Resolve the single best receipt for a pid, honouring an optional issueKey so
  // "Mike Lee · guns" opens the guns receipt rather than his top-ranked one.
  function bestReceipt(pidOrReceipt, issueKey) {
    if (pidOrReceipt && pidOrReceipt.verdict) return pidOrReceipt;
    var pid = pidOrReceipt, all = collect();
    var mine = all.filter(function (r) {
      return r.pid === pid || alias(r.pid) === pid || r.pid === alias(pid);
    });
    if (issueKey) {
      for (var i = 0; i < mine.length; i++) { if (mine[i].issueKey === issueKey) return mine[i]; }
    }
    return mine[0] || forPolitician(pid);
  }

  var _lbLastFocus = null;
  function closeLightbox() {
    var ov = document.getElementById('svd-lightbox');
    if (!ov) return;
    ov.parentNode && ov.parentNode.removeChild(ov);
    document.body.style.overflow = '';
    if (_lbLastFocus && _lbLastFocus.focus) { try { _lbLastFocus.focus(); } catch (e) {} }
    _lbLastFocus = null;
  }

  function openReceipt(pidOrReceipt, issueKey) {
    var r = bestReceipt(pidOrReceipt, issueKey);
    if (!r) { toast('No receipt on record yet'); return; }
    closeLightbox();
    _lbLastFocus = document.activeElement;

    // Record this stop on the guided spine so the voter can always see — and walk
    // back — where they are in their investigation.
    try {
      if (window.PDXJourney && typeof window.PDXJourney.record === 'function') {
        window.PDXJourney.record('receipt', {
          label: r.name, icon: '🧾',
          nav: { type: 'receipt', pid: r.pid, issue: r.issueKey || '', key: r.pid + '|' + (r.issueKey || '') }
        });
      }
    } catch (e) {}

    // The next-action rail — a clear, consistent set of forward moves so a receipt
    // is never a dead end. Falls back to a plain profile link if the spine module
    // hasn't loaded.
    var actions = (window.PDXJourney && typeof window.PDXJourney.nextActionsHTML === 'function')
      ? window.PDXJourney.nextActionsHTML(r, 'full')
      : '<button type="button" class="svd-lb-profile" data-pid="' + escAttr(r.pid) + '">View full profile →</button>';

    var ov = document.createElement('div');
    ov.id = 'svd-lightbox';
    ov.className = 'svd-lightbox';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', r.name + ' — ' + r.verdict.label);
    ov.innerHTML =
      '<div class="svd-lb-panel" role="document">' +
        '<div class="svd-lb-bar">' +
          '<span class="svd-lb-eyebrow">🧾 The Receipt</span>' +
          '<button type="button" class="svd-lb-close" aria-label="Close receipt">✕</button>' +
        '</div>' +
        cardHTML(r, { actions: false }) +
        '<div class="svd-lb-actions">' + actions + '</div>' +
      '</div>';
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';

    // Dismissal: backdrop tap, ✕, or Escape. The card's own click handler
    // (below) opens the profile; the "View full profile" button does the same.
    ov.addEventListener('click', function (e) {
      if (e.target === ov || (e.target.closest && e.target.closest('.svd-lb-close'))) {
        closeLightbox(); return;
      }
      if (e.target.closest && e.target.closest('.svd-share-btn')) return; // share handles itself
      var prof = e.target.closest && e.target.closest('.svd-lb-profile, [data-pid]');
      if (prof && !(e.target.closest && e.target.closest('a'))) {
        var pid = prof.getAttribute('data-pid') || r.pid;
        closeLightbox();
        if (pid && typeof window.showProfile === 'function') window.showProfile(pid);
      }
    });
    ov.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); return; }
      // Enter / Space on the focused receipt card opens the full profile, matching
      // the card's role="button" contract elsewhere in the app.
      if ((e.key === 'Enter' || e.key === ' ')) {
        var card = e.target.closest && e.target.closest('.svd-receipt');
        if (card && !(e.target.closest && e.target.closest('.svd-share-btn, a'))) {
          e.preventDefault();
          closeLightbox();
          if (typeof window.showProfile === 'function') window.showProfile(r.pid);
        }
      }
    });
    var closeBtn = ov.querySelector('.svd-lb-close');
    if (closeBtn) { try { closeBtn.focus(); } catch (e) {} }
  }

  // ── deep links ───────────────────────────────────────────────────────────────
  // #receipt=<pid>[~<issueKey>] lands a reader directly on one receipt. The pid and
  // issue are exactly what openReceipt() already takes, so a link is just the two
  // arguments a tap would have supplied. Receipts are built from data that arrives
  // asynchronously, so an unresolved link retries briefly rather than flashing
  // "no receipt on record".
  function receiptLink(pidOrReceipt, issueKey, opts) {
    var r = (pidOrReceipt && pidOrReceipt.verdict) ? pidOrReceipt : null;
    var pid = r ? r.pid : pidOrReceipt;
    var iss = r ? (r.issueKey || '') : (issueKey || '');
    if (!pid) return '';
    // A card may carry its own deep link. Vote-derived cards do: they resolve to
    // `#record=…`, which lands on the Official Record gap view rather than the
    // Say-vs-Do receipt lightbox — a formal legislative action must not open on a
    // Say-vs-Do surface. Curated receipts carry no hash and keep `#receipt=…`.
    var h = (r && r.hash) ? String(r.hash)
      : '#receipt=' + encodeURIComponent(pid) + (iss ? '~' + encodeURIComponent(iss) : '');
    // Which surface this link lands on — the Official Record gap view or the
    // Say-vs-Do lightbox — is decided above and must survive the trip.
    var kind = /^#record=/.test(h) ? 'record' : 'receipt';
    // A hash is invisible to a server, so a pasted receipt link could only ever
    // unfurl as the generic site card. The query form carries the same (member,
    // issue) pair somewhere the edge can read it, and share-links.js turns it back
    // into exactly the hash above on arrival — every existing hash link still works.
    var links = null;
    try { links = window.PDXShareLinks; } catch (e) {}
    if (links && links[kind]) {
      var canonicalUrl = links[kind](pid, iss);
      if (opts && opts.canonical) return links.on(SHARE_URL, canonicalUrl);
      return canonicalUrl;
    }
    // `canonical` builds the link on the public share domain, for anything leaving
    // the device; otherwise stay on whatever origin the reader is already on.
    if (opts && opts.canonical) return SHARE_URL.replace(/\/$/, '/') + h;
    try { return location.origin + location.pathname + h; } catch (e) { return h; }
  }

  var _hashTries = 0;
  function handleHash(retry) {
    var m = (location.hash || '').match(/^#receipt=([^~&]+)(?:~([^&]+))?/);
    if (!m) { _hashTries = 0; return; }
    var pid = '', iss = '';
    try { pid = decodeURIComponent(m[1]); } catch (e) { pid = m[1]; }
    try { iss = m[2] ? decodeURIComponent(m[2]) : ''; } catch (e) { iss = m[2] || ''; }
    if (!retry) _hashTries = 0;
    if (bestReceipt(pid, iss)) { _hashTries = 0; openReceipt(pid, iss); return; }
    // Data may still be loading — try again for a few seconds, then give up quietly.
    if (_hashTries++ < 10) setTimeout(function () { handleHash(true); }, 700);
  }

  window.PDXReceipts = {
    collect: collect,
    forPolitician: forPolitician,
    cardHTML: cardHTML,
    rowBadge: rowBadge,
    verdictBadge: verdictBadge,
    search: search,
    open: openReceipt,
    close: closeLightbox,
    find: bestReceipt,
    linkFor: receiptLink,
    mount: mount,
    refresh: refresh,
    share: share,
    renderImage: function (idOrReceipt) {
      var r = (idOrReceipt && idOrReceipt.verdict) ? idOrReceipt : forPolitician(idOrReceipt);
      return r ? renderCanvas(r).then(canvasToBlob) : Promise.reject(new Error('no receipt'));
    },
    // Exposed for scripts/test-receipt-cards.mjs. The promise that a bill title
    // never ships broken mid-word is only worth as much as the test that holds
    // it, and that test needs to measure real wrapped output rather than grep
    // the call site. Callers outside the tests have no reason to use these.
    _wrapText: wrapText,
    _labelListLines: labelListLines,
    _factLines: factLines,
    _factBlocks: factBlocks,
    _factTiers: FACT_TIERS,
    // The caption is the half of a share that arrives as TEXT — in a paste, a
    // quote-tweet, a group chat where the image is collapsed. It carries the
    // source URL and the disclosures, so it is asserted on its output rather
    // than by grepping this file for the strings that build it.
    _caption: caption,
    _tweetText: tweetText,
    _trimHeadline: trimHeadline
  };

  // Initial mount + one delayed refresh so names/photos fill in once the live
  // roster (PROFILES) resolves. Cheap and idempotent.
  function boot() {
    try { mount(); } catch (e) {}
    try { handleHash(); } catch (e) {}
    window.addEventListener('hashchange', function () { try { handleHash(); } catch (e) {} });
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var k = buildKey();
      if (k !== _cacheKey) { try { refresh(); } catch (e) {} }
      if (tries >= 8) clearInterval(t);
    }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Run 3 perf: ACCT_SPOTLIGHT now loads on demand (pdx-lazy-data.js). Rebuild the
  // receipts once it arrives, covering a load that lands after the poll window.
  document.addEventListener('pdx:data:acctSpotlight', function () { try { refresh(); } catch (e) {} });
})();
