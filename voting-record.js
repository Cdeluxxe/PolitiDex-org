/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Voting Record (profile section)  ·  Phase 3
   ────────────────────────────────────────────────────────────────────────────
   The "what they actually DID" panel on a politician profile. Where the Key
   Issue Stances section shows what someone SAYS, this shows the receipts — the
   roll-call votes and non-vote actions (co-sponsorships, amicus briefs) pulled
   live from the /api/voting-record Function (the vr_* tables), keyed to the same
   ISSUE_MAP issueKeys the rest of the app uses.

   It is deliberately ADDITIVE and SELF-GATING: the section renders hidden and
   only reveals itself once a member is confirmed to have a record. A profile
   with no voting data looks exactly as it did before (no empty card, no flash),
   and a network/offline failure fails quietly — nothing else on the profile is
   affected.

   Data it leans on (all already global, loaded before this file):
     • window.ISSUE_MAP                 — issue labels/icons for chips + groups
     • window._polPositionMap(id, p)    — the member's stated stances by issueKey
     • window._voteEffectiveSupport     — Phase-2 engine (stance-vs-record)
     • window._stanceVoteVerdict        —   "
     • window._issueRecordSummary       —   "
     • window._polRecordMap             —   "  per-issue "say vs. do" rollup

   Styling reuses the Stance Library visual language (.sl-* look — dark navy
   panels, blue primary, gold active) via a small injected .vr-* stylesheet so
   the panel reads as a sibling of the Library and the Evidence Locker.

   Public surface:
     window.PDXVotingRecord.fetchMember(id, opts) -> Promise<data|null>  (cached)
     window._renderVotingRecord(id, p)            -> shell HTML string
     window._pdxInitVotingRecord()                -> hydrate after modal render
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API_BASE = '/api/voting-record';
  // One profile modal is open at a time, so a single module-level state is safe.
  var _state = null;
  // Guard so a stale fetch (user closed/opened another profile) can't paint.
  var _openToken = 0;

  // ── HTML escape — every dynamic string that lands in innerHTML goes through it ──
  function esc(v) {
    if (v === null || typeof v === 'undefined') return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // Safe attribute value (used inside single-quoted onclick handlers etc.).
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }

  // ── Styles (injected once) ──────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('pdx-vr-css')) return;
    var css = [
      '#pdx-voting-record .vr-sub{color:#9fb4d4;font-size:.82rem;line-height:1.5;margin:.15rem 0 .9rem;}',
      /* summary strip */
      '.vr-summary{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.85rem;}',
      '.vr-stat{flex:1 1 5.2rem;min-width:5.2rem;background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.07);border-radius:.7rem;padding:.55rem .5rem;text-align:center;}',
      '.vr-stat-v{font-family:"Bebas Neue","Barlow Condensed",sans-serif;font-size:1.5rem;line-height:1;color:#eef4ff;}',
      '.vr-stat-l{font-family:"Barlow Condensed",sans-serif;font-size:.56rem;letter-spacing:.08em;text-transform:uppercase;color:#7596c0;margin-top:.2rem;line-height:1.2;}',
      /* say-vs-do meter */
      '.vr-meter{background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.07);border-radius:.7rem;padding:.7rem .75rem;margin-bottom:.9rem;}',
      '.vr-meter-top{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem;margin-bottom:.5rem;}',
      '.vr-meter-title{font-family:"Barlow Condensed",sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#c4b5fd;}',
      '.vr-meter-sub{font-size:.7rem;color:#7596c0;}',
      '.vr-bar{display:flex;height:.5rem;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.06);}',
      '.vr-bar-seg{height:100%;}',
      '.vr-bar-consistent{background:#4ade80;}.vr-bar-contradicts{background:#f87171;}.vr-bar-mixed{background:#60a5fa;}',
      '.vr-legend{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.5rem;font-size:.72rem;color:#9fb4d4;}',
      '.vr-legend b{color:#eef4ff;font-weight:700;}',
      '.vr-dot{display:inline-block;width:.55rem;height:.55rem;border-radius:50%;margin-right:.3rem;vertical-align:middle;}',
      /* filters */
      '.vr-filters{margin-bottom:.9rem;}',
      '.vr-chips{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.35rem;-webkit-overflow-scrolling:touch;}',
      '.vr-chip{flex:none;cursor:pointer;background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.12);color:#c8d6ec;border-radius:999px;padding:.32rem .7rem;font-size:.78rem;white-space:nowrap;transition:all .15s;}',
      '.vr-chip:hover{border-color:rgba(96,165,250,.5);color:#eaf1ff;}',
      '.vr-chip.is-active{background:rgba(96,165,250,.16);border-color:rgba(96,165,250,.6);color:#dbeafe;font-weight:600;}',
      '.vr-chip-n{opacity:.6;margin-left:.28rem;font-size:.72rem;}',
      '.vr-controls{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.55rem;align-items:center;}',
      '.vr-select,.vr-date{background:rgba(10,15,30,.6);border:1px solid rgba(255,255,255,.12);color:#cbd9ec;border-radius:.55rem;padding:.35rem .5rem;font-size:.76rem;font-family:inherit;max-width:100%;}',
      '.vr-select:focus,.vr-date:focus{outline:none;border-color:rgba(96,165,250,.55);}',
      '.vr-toggle{display:inline-flex;align-items:center;gap:.35rem;cursor:pointer;background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.12);color:#c8d6ec;border-radius:.55rem;padding:.35rem .6rem;font-size:.76rem;user-select:none;}',
      '.vr-toggle.is-active{background:rgba(245,200,66,.14);border-color:rgba(245,200,66,.5);color:#f5c842;}',
      '.vr-toggle input{accent-color:#f5c842;}',
      /* groups + cards */
      '.vr-group{margin-bottom:1rem;}',
      '.vr-group-head{display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;flex-wrap:wrap;}',
      '.vr-group-title{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:.98rem;letter-spacing:.02em;color:#eef4ff;}',
      '.vr-group-n{font-size:.68rem;color:#7596c0;background:rgba(255,255,255,.06);border-radius:999px;padding:.06rem .45rem;}',
      '.vr-card{background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.07);border-radius:.75rem;padding:.65rem .75rem;margin-bottom:.5rem;}',
      '.vr-card-top{display:flex;align-items:center;gap:.5rem;justify-content:space-between;margin-bottom:.3rem;flex-wrap:wrap;}',
      '.vr-num{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:.8rem;letter-spacing:.04em;color:#93c5fd;}',
      '.vr-date-txt{font-size:.72rem;color:#7596c0;}',
      '.vr-card-title{font-size:.86rem;color:#e5ecf7;line-height:1.4;margin:.1rem 0 .4rem;}',
      '.vr-meta{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;}',
      '.vr-pill{font-family:"Barlow Condensed",sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:.12rem .5rem;white-space:nowrap;}',
      '.vr-pos-yea{background:rgba(74,222,128,.16);color:#6ee7a0;border:1px solid rgba(74,222,128,.35);}',
      '.vr-pos-nay{background:rgba(248,113,113,.16);color:#fca5a5;border:1px solid rgba(248,113,113,.35);}',
      '.vr-pos-neutral{background:rgba(159,180,212,.14);color:#9fb4d4;border:1px solid rgba(159,180,212,.3);}',
      '.vr-pos-action{background:rgba(124,58,237,.16);color:#c4b5fd;border:1px solid rgba(124,58,237,.35);}',
      '.vr-tag{font-size:.68rem;color:#8ea4c6;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:.1rem .45rem;}',
      '.vr-result-passed{color:#6ee7a0;}.vr-result-failed{color:#fca5a5;}',
      /* verdict badges */
      '.vr-verdict{font-family:"Barlow Condensed",sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;padding:.12rem .5rem;white-space:nowrap;}',
      '.vr-v-consistent{background:rgba(74,222,128,.16);color:#6ee7a0;border:1px solid rgba(74,222,128,.35);}',
      '.vr-v-contradicts{background:rgba(248,113,113,.18);color:#fca5a5;border:1px solid rgba(248,113,113,.4);}',
      '.vr-v-mixed{background:rgba(96,165,250,.16);color:#93c5fd;border:1px solid rgba(96,165,250,.35);}',
      '.vr-v-neutral{background:rgba(159,180,212,.12);color:#9fb4d4;border:1px solid rgba(159,180,212,.28);}',
      '.vr-src{display:inline-block;margin-top:.4rem;font-size:.74rem;color:#93c5fd;text-decoration:none;}',
      '.vr-src:hover{text-decoration:underline;}',
      '.vr-stance-note{font-size:.74rem;color:#9fb4d4;margin-top:.35rem;line-height:1.45;}',
      '.vr-stance-note b{color:#cbd9ec;}',
      /* amendments (collapsible) */
      '.vr-amends{margin:.1rem 0 .5rem .6rem;border-left:2px solid rgba(255,255,255,.08);padding-left:.6rem;}',
      '.vr-amends>summary{cursor:pointer;color:#8ea4c6;font-size:.75rem;padding:.15rem 0;list-style:none;}',
      '.vr-amends>summary::-webkit-details-marker{display:none;}',
      '.vr-amends>summary:before{content:"▸ ";color:#5f7aa8;}',
      '.vr-amends[open]>summary:before{content:"▾ ";}',
      /* misc states */
      '.vr-loading,.vr-empty{padding:1rem;text-align:center;color:#7596c0;font-size:.82rem;}',
      '.vr-empty-ico{font-size:1.6rem;display:block;margin-bottom:.4rem;opacity:.7;}',
      '.vr-more{width:100%;margin-top:.4rem;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.3);color:#bfdbfe;border-radius:.6rem;padding:.55rem;font-size:.78rem;font-weight:600;cursor:pointer;}',
      '.vr-more:hover{background:rgba(96,165,250,.2);}',
      '.vr-note{font-size:.66rem;color:#4e72a0;text-align:center;margin:.5rem 0 0;line-height:1.5;}',
      /* Phase 5 — consistency dots on comparison boards (seat board + compare table) */
      '.pdx-sib-vdot,.cmp-vdot{display:inline-block;margin-left:.18rem;font-size:.72rem;line-height:1;vertical-align:middle;font-weight:700;}',
      '.pdx-sib-vdot:empty,.cmp-vdot:empty{display:none;}',
      '.cmp-vdot{display:block;margin:.15rem auto 0;text-align:center;}',
      '.cmp-vdot:empty{display:none;}',
      '.vrdot-consistent{color:#6ee7a0;}',
      '.vrdot-contradicts{color:#f89b9b;}',
      '.vrdot-mixed{color:#93c5fd;}',
      '.vrdot-record{color:#9fb4d4;}',
      '.pdx-sib-lg-vdot{opacity:.85;}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'pdx-vr-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── Data layer: PDXVotingRecord.fetchMember(id, opts) with in-memory cache ────
  var PDXVotingRecord = {
    _cache: new Map(),

    // Build a stable query string from the filter opts (only non-empty params).
    _query: function (opts) {
      opts = opts || {};
      var p = new URLSearchParams();
      var pass = ['issue', 'chamber', 'actionType', 'position', 'result', 'q', 'from', 'to', 'sort', 'page', 'pageSize'];
      pass.forEach(function (k) {
        if (opts[k] !== undefined && opts[k] !== null && opts[k] !== '') p.set(k, opts[k]);
      });
      // hideProcedural maps to the API's procedural=0 flag.
      if (opts.hideProcedural) p.set('procedural', '0');
      var s = p.toString();
      return s ? ('?' + s) : '';
    },

    fetchMember: function (id, opts) {
      var qs = this._query(opts);
      var key = id + qs;
      if (this._cache.has(key)) return this._cache.get(key);
      var url = API_BASE + '/member/' + encodeURIComponent(id) + qs;
      var promise = fetch(url, { headers: { accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('voting-record ' + r.status);
          return r.json();
        })
        .catch(function (e) {
          // On failure, drop the cache entry so a later (online) retry re-fetches,
          // and resolve to null so callers degrade quietly instead of throwing.
          PDXVotingRecord._cache.delete(key);
          if (window.console && console.warn) console.warn('PDXVotingRecord.fetchMember:', e && e.message);
          return null;
        });
      this._cache.set(key, promise);
      return promise;
    },

    clearCache: function () { this._cache.clear(); this._compareCache.clear(); this._records = {}; },

    // ── Resolved per-member records (sync accessor) ─────────────────────────────
    // A member's full, unfiltered record items, cached the moment any surface loads
    // them (the profile section on open, or a /compare call). The Alignment Tool
    // reads this SYNCHRONOUSLY via _alignmentVotesAdapter — it never triggers its
    // own fetch, so there is no request storm when scoring a big field; it simply
    // uses whatever is already warm and falls back to the legacy source otherwise.
    _records: {},
    noteMember: function (id, items) { if (id && Array.isArray(items)) this._records[id] = items.slice(); },
    memberRecords: function (id) { return this._records[id] || null; },

    // ── Batched side-by-side fetch for the comparison surfaces ──────────────────
    // GET /api/voting-record/compare?members=a,b,c → { members, issue, matrix }.
    // Cached by the sorted member list; also seeds the per-member _records cache so
    // a later Alignment computation for any of these members is already warm.
    _compareCache: new Map(),
    fetchCompare: function (pids) {
      var members = (pids || []).filter(Boolean).slice().sort();
      if (!members.length) return Promise.resolve(null);
      var key = members.join(',');
      if (this._compareCache.has(key)) return this._compareCache.get(key);
      var self = this;
      var url = API_BASE + '/compare?members=' + encodeURIComponent(members.join(','));
      var promise = fetch(url, { headers: { accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('compare ' + r.status); return r.json(); })
        .then(function (data) {
          if (data && data.matrix) {
            Object.keys(data.matrix).forEach(function (pid) { self.noteMember(pid, data.matrix[pid]); });
          }
          return data;
        })
        .catch(function (e) {
          self._compareCache.delete(key);
          if (window.console && console.warn) console.warn('PDXVotingRecord.fetchCompare:', e && e.message);
          return null;
        });
      this._compareCache.set(key, promise);
      return promise;
    }
  };
  window.PDXVotingRecord = PDXVotingRecord;

  // ── Small formatting helpers ──────────────────────────────────────────────────
  function issueLabel(key) {
    var m = (window.ISSUE_MAP && window.ISSUE_MAP[key]) || null;
    return m && m.label ? m.label : key;
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return iso.slice(0, 10); }
  }
  function titleCase(s) {
    if (!s) return '';
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // Position pill (yea / nay / present / not voting, or a non-vote action label).
  function positionPill(item) {
    if (item.kind === 'position') {
      return '<span class="vr-pill vr-pos-action">' + esc(titleCase(item.position)) + '</span>';
    }
    var pos = item.position;
    var cls = pos === 'yea' ? 'vr-pos-yea' : pos === 'nay' ? 'vr-pos-nay' : 'vr-pos-neutral';
    var label = pos === 'yea' ? 'Voted Yea' : pos === 'nay' ? 'Voted Nay'
      : pos === 'present' ? 'Present' : pos === 'not_voting' ? 'Did Not Vote' : titleCase(pos);
    return '<span class="vr-pill ' + cls + '">' + esc(label) + '</span>';
  }

  // Stance-vs-record verdict for one item against its PRIMARY issue, using the
  // shared Phase-2 engine. Returns { cls, label } or null (nothing to show).
  function verdictBadge(item, positionMap) {
    var primary = (item.issues && item.issues[0]) || null;
    if (!primary) return null;
    var pm = positionMap[primary.issueKey];
    var stance = pm ? pm.stance : null;
    if (!stance) return null; // no stated stance on this issue → nothing to compare
    var eff = window._voteEffectiveSupport
      ? window._voteEffectiveSupport(item, primary.supportMeaning)
      : null;
    var verdict = window._stanceVoteVerdict
      ? window._stanceVoteVerdict(stance, eff)
      : null;
    switch (verdict) {
      case 'consistent':  return { cls: 'vr-v-consistent', label: '✓ Matches stance' };
      case 'contradicts': return { cls: 'vr-v-contradicts', label: '⚠ Against stance' };
      case 'mixed':       return { cls: 'vr-v-mixed', label: 'Mixed stance' };
      case 'no_position': return { cls: 'vr-v-neutral', label: 'No position taken' };
      default:            return null;
    }
  }

  // ── One vote / position card ──────────────────────────────────────────────────
  function cardHtml(item, positionMap) {
    var num = item.number ? '<span class="vr-num">' + esc(item.number) + '</span>' : '';
    var date = item.date ? '<span class="vr-date-txt">' + esc(fmtDate(item.date)) + '</span>' : '';
    var vb = verdictBadge(item, positionMap);
    var verdictHtml = vb ? '<span class="vr-verdict ' + vb.cls + '">' + esc(vb.label) + '</span>' : '';

    var meta = [];
    meta.push(positionPill(item));
    // A vote's `action` is the human-written roll-call question ("On Passage") —
    // show it verbatim; a position's `action` is an actionType slug — title-case it.
    if (item.action) {
      var actLabel = item.kind === 'position' ? titleCase(item.action) : item.action;
      meta.push('<span class="vr-tag">' + esc(actLabel) + '</span>');
    }
    if (item.chamber) meta.push('<span class="vr-tag">' + esc(titleCase(item.chamber)) + '</span>');
    if (item.result) {
      var rc = /pass|agree/.test(item.result) ? 'vr-result-passed' : /fail|reject/.test(item.result) ? 'vr-result-failed' : '';
      meta.push('<span class="vr-tag ' + rc + '">' + esc(titleCase(item.result)) + '</span>');
    }
    if (item.isAmendment) meta.push('<span class="vr-tag">Amendment</span>');
    if (item.isProcedural) meta.push('<span class="vr-tag">Procedural</span>');

    // A one-line "they said X, they did Y" note when we have both sides.
    var note = '';
    var primary = (item.issues && item.issues[0]) || null;
    if (primary && positionMap[primary.issueKey]) {
      var stance = positionMap[primary.issueKey].stance;
      var stanceWord = stance === 'support' ? 'supports' : stance === 'oppose' ? 'opposes' : 'is mixed on';
      note = '<div class="vr-stance-note">Stated stance: <b>' + esc(stanceWord) + '</b> ' +
        esc(issueLabel(primary.issueKey)) + '</div>';
    }

    var src = (item.source && item.source.url)
      ? '<a class="vr-src" href="' + escAttr(item.source.url) + '" target="_blank" rel="noopener">🔗 ' +
          esc(item.source.label || 'View the official record') + '</a>'
      : '';

    return '<div class="vr-card">' +
      '<div class="vr-card-top"><div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">' + num + date + '</div>' + verdictHtml + '</div>' +
      (item.title ? '<div class="vr-card-title">' + esc(item.title) + '</div>' : '') +
      '<div class="vr-meta">' + meta.join('') + '</div>' +
      note + src +
      '</div>';
  }

  // ── Group the loaded items by their primary issue, nesting amendments ──────────
  function renderGroups(items, positionMap) {
    if (!items.length) {
      return '<div class="vr-empty"><span class="vr-empty-ico">🔎</span>No records match these filters.</div>';
    }

    // Index by measureId so an amendment can find its parent card within a group.
    var byMeasure = {};
    items.forEach(function (it) { byMeasure[it.measureId] = it; });

    // Bucket by primary issueKey ('_none' for unmapped records).
    var groups = {};
    var order = [];
    items.forEach(function (it) {
      var key = (it.issues && it.issues[0] && it.issues[0].issueKey) || '_none';
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(it);
    });

    // Rank groups: those with a stance contradiction first (that's the story),
    // then by size, then alphabetically by label — always '_none' last.
    var recordMap = (window._polRecordMap ? window._polRecordMap(items, positionMap) : {}) || {};
    order.sort(function (a, b) {
      if (a === '_none') return 1;
      if (b === '_none') return -1;
      var ca = recordMap[a] && recordMap[a].hasContradiction ? 1 : 0;
      var cb = recordMap[b] && recordMap[b].hasContradiction ? 1 : 0;
      if (ca !== cb) return cb - ca;
      if (groups[b].length !== groups[a].length) return groups[b].length - groups[a].length;
      return issueLabel(a).localeCompare(issueLabel(b));
    });

    return order.map(function (key) {
      var list = groups[key];
      // Split into top-level cards and amendments that belong to an in-group parent.
      var childrenByParent = {};
      list.forEach(function (it) {
        if (it.isAmendment && it.parentMeasureId && byMeasure[it.parentMeasureId]) {
          (childrenByParent[it.parentMeasureId] = childrenByParent[it.parentMeasureId] || []).push(it);
        }
      });
      var nested = {};
      Object.keys(childrenByParent).forEach(function (pid) {
        childrenByParent[pid].forEach(function (c) { nested[c.measureId] = true; });
      });

      var summary = recordMap[key];
      var head = '<div class="vr-group-head">' +
        '<span class="vr-group-title">' + esc(key === '_none' ? '📄 Other records' : issueLabel(key)) + '</span>' +
        '<span class="vr-group-n">' + list.length + ' record' + (list.length === 1 ? '' : 's') + '</span>' +
        (summary && summary.hasStance && summary.label
          ? '<span class="vr-verdict ' +
              (summary.netVerdict === 'consistent' ? 'vr-v-consistent'
                : summary.netVerdict === 'contradicts' ? 'vr-v-contradicts'
                : summary.netVerdict === 'mixed' ? 'vr-v-mixed' : 'vr-v-neutral') +
              '">' + esc(summary.label) + '</span>'
          : '') +
        '</div>';

      var cards = list.filter(function (it) { return !nested[it.measureId]; }).map(function (it) {
        var html = cardHtml(it, positionMap);
        var kids = childrenByParent[it.measureId];
        if (kids && kids.length) {
          html += '<details class="vr-amends"><summary>' + kids.length + ' amendment vote' +
            (kids.length === 1 ? '' : 's') + '</summary>' +
            kids.map(function (k) { return cardHtml(k, positionMap); }).join('') +
            '</details>';
        }
        return html;
      }).join('');

      return '<div class="vr-group">' + head + cards + '</div>';
    }).join('');
  }

  // ── Summary strip (stats + "say vs. do" meter) ────────────────────────────────
  function renderSummary(data, positionMap) {
    var s = data.summary || {};
    var stat = function (v, l) {
      return '<div class="vr-stat"><div class="vr-stat-v">' + esc(v) + '</div><div class="vr-stat-l">' + esc(l) + '</div></div>';
    };
    var strip = '<div class="vr-summary">' +
      stat(s.totalRecords || 0, 'Records') +
      stat(s.votes || 0, 'Roll-call Votes') +
      (s.positions ? stat(s.positions, 'Other Actions') : '') +
      (s.withParty || s.againstParty ? stat(s.withParty + '/' + s.againstParty, 'With / Against Party') : '') +
      '</div>';

    // "Say vs. Do" — over issues where the member has BOTH a stance and a record.
    var recordMap = (window._polRecordMap ? window._polRecordMap(data.items || [], positionMap) : {}) || {};
    var consistent = 0, contradicts = 0, mixed = 0;
    Object.keys(recordMap).forEach(function (k) {
      var r = recordMap[k];
      if (!r.hasStance || r.total === 0) return;
      if (r.netVerdict === 'consistent') consistent++;
      else if (r.netVerdict === 'contradicts') contradicts++;
      else if (r.netVerdict === 'mixed') mixed++;
    });
    var totalJudged = consistent + contradicts + mixed;
    var meter = '';
    if (totalJudged > 0) {
      var pct = function (n) { return (n / totalJudged * 100).toFixed(1) + '%'; };
      meter = '<div class="vr-meter">' +
        '<div class="vr-meter-top"><span class="vr-meter-title">Say vs. Do</span>' +
          '<span class="vr-meter-sub">' + totalJudged + ' issue' + (totalJudged === 1 ? '' : 's') + ' with a stance &amp; a record</span></div>' +
        '<div class="vr-bar">' +
          (consistent ? '<div class="vr-bar-seg vr-bar-consistent" style="width:' + pct(consistent) + '"></div>' : '') +
          (contradicts ? '<div class="vr-bar-seg vr-bar-contradicts" style="width:' + pct(contradicts) + '"></div>' : '') +
          (mixed ? '<div class="vr-bar-seg vr-bar-mixed" style="width:' + pct(mixed) + '"></div>' : '') +
        '</div>' +
        '<div class="vr-legend">' +
          '<span><span class="vr-dot vr-bar-consistent"></span><b>' + consistent + '</b> back it up</span>' +
          '<span><span class="vr-dot vr-bar-contradicts"></span><b>' + contradicts + '</b> contradict</span>' +
          (mixed ? '<span><span class="vr-dot vr-bar-mixed"></span><b>' + mixed + '</b> mixed</span>' : '') +
        '</div></div>';
    }
    return strip + meter;
  }

  // ── Filter bar. Facets (issue/chamber/action/position options) are built ONCE
  //    from the unfiltered first load so they stay stable as the user narrows. ────
  function renderFilters() {
    var f = _state.filters, facets = _state.facets;

    var issueChips = '<button type="button" class="vr-chip' + (!f.issue ? ' is-active' : '') +
      '" data-vr-issue="">All issues</button>' +
      facets.issues.map(function (k) {
        return '<button type="button" class="vr-chip' + (f.issue === k ? ' is-active' : '') +
          '" data-vr-issue="' + escAttr(k) + '">' + esc(issueLabel(k)) + '</button>';
      }).join('');

    var opt = function (val, label, sel) {
      return '<option value="' + escAttr(val) + '"' + (sel === val ? ' selected' : '') + '>' + esc(label) + '</option>';
    };
    var chamberSel = '<select class="vr-select" data-vr-filter="chamber" aria-label="Chamber">' +
      opt('', 'Any chamber', f.chamber) +
      facets.chambers.map(function (c) { return opt(c, titleCase(c), f.chamber); }).join('') + '</select>';
    var actionSel = facets.actionTypes.length ? '<select class="vr-select" data-vr-filter="actionType" aria-label="Action type">' +
      opt('', 'Any action', f.actionType) +
      facets.actionTypes.map(function (c) { return opt(c, titleCase(c), f.actionType); }).join('') + '</select>' : '';
    var posSel = '<select class="vr-select" data-vr-filter="position" aria-label="Position">' +
      opt('', 'Any position', f.position) +
      ['yea', 'nay', 'present', 'not_voting'].map(function (c) { return opt(c, titleCase(c), f.position); }).join('') + '</select>';
    var sortSel = '<select class="vr-select" data-vr-filter="sort" aria-label="Sort">' +
      opt('', 'Group by issue', f.sort) +
      opt('date', 'Newest first', f.sort) +
      opt('date_asc', 'Oldest first', f.sort) +
      opt('bill', 'By bill number', f.sort) + '</select>';

    var dateInputs = '<input type="date" class="vr-date" data-vr-filter="from" value="' + escAttr(f.from || '') + '" aria-label="From date">' +
      '<input type="date" class="vr-date" data-vr-filter="to" value="' + escAttr(f.to || '') + '" aria-label="To date">';

    var procToggle = '<label class="vr-toggle' + (f.hideProcedural ? ' is-active' : '') + '">' +
      '<input type="checkbox" data-vr-filter="hideProcedural"' + (f.hideProcedural ? ' checked' : '') + '> Hide procedural</label>';

    return '<div class="vr-filters">' +
      '<div class="vr-chips">' + issueChips + '</div>' +
      '<div class="vr-controls">' + chamberSel + actionSel + posSel + sortSel + dateInputs + procToggle + '</div>' +
      '</div>';
  }

  // Render the body (summary + filters + list + load-more) into the section.
  function renderBody() {
    var data = _state.data, pm = _state.positionMap;
    var root = document.getElementById('pdx-vr-body');
    if (!root) return;

    // sort === '' means "group by issue" (client-side grouping). Any real sort
    // value means the server already sorted; render a flat list in that order.
    var listHtml;
    if (!_state.filters.sort) {
      listHtml = renderGroups(_state.items, pm);
    } else {
      listHtml = _state.items.length
        ? _state.items.map(function (it) { return cardHtml(it, pm); }).join('')
        : '<div class="vr-empty"><span class="vr-empty-ico">🔎</span>No records match these filters.</div>';
    }

    var more = (data && data.hasMore)
      ? '<button type="button" class="vr-more" data-vr-more>Load more records</button>'
      : '';

    root.innerHTML =
      renderSummary({ summary: data.summary, items: _state.items }, pm) +
      renderFilters() +
      '<div id="pdx-vr-list">' + listHtml + '</div>' +
      more +
      '<p class="vr-note">Every record links to the official roll call or filing. ' +
      'Stance comparisons weigh a stated position against the actual vote — see the source to judge for yourself.</p>';
  }

  // Re-fetch with the current filters (resets to page 1) and repaint the body.
  var _searchTimer = null;
  function applyFilters() {
    var id = _state.id, token = _openToken;
    _state.page = 1;
    var opts = buildOpts(1);
    var root = document.getElementById('pdx-vr-list');
    if (root) root.innerHTML = '<div class="vr-loading">Loading…</div>';
    PDXVotingRecord.fetchMember(id, opts).then(function (data) {
      if (token !== _openToken || !_state) return; // profile changed under us
      if (!data) { renderErrorInline(); return; }
      _state.data = data;
      _state.items = (data.items || []).slice();
      renderBody();
    });
  }

  function buildOpts(page) {
    var f = _state.filters;
    return {
      issue: f.issue, chamber: f.chamber, actionType: f.actionType,
      position: f.position, from: f.from, to: f.to,
      sort: f.sort || '', hideProcedural: f.hideProcedural,
      page: page, pageSize: 100
    };
  }

  function renderErrorInline() {
    var root = document.getElementById('pdx-vr-list');
    if (root) root.innerHTML = '<div class="vr-empty"><span class="vr-empty-ico">📡</span>Couldn’t load the voting record right now. Check your connection and try again.</div>';
  }

  // Load the next page and append (keeps grouping coherent by re-rendering).
  function loadMore() {
    var id = _state.id, token = _openToken;
    _state.page += 1;
    PDXVotingRecord.fetchMember(id, buildOpts(_state.page)).then(function (data) {
      if (token !== _openToken || !_state || !data) return;
      _state.data = data;
      _state.items = _state.items.concat(data.items || []);
      renderBody();
    });
  }

  // ── Event delegation on the section root (survives re-renders of the body) ─────
  function bindEvents(section) {
    if (section.__vrBound) return;
    section.__vrBound = true;

    section.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-vr-issue]');
      if (chip) { _state.filters.issue = chip.getAttribute('data-vr-issue') || ''; applyFilters(); return; }
      if (e.target.closest('[data-vr-more]')) { loadMore(); return; }
    });

    section.addEventListener('change', function (e) {
      var el = e.target.closest('[data-vr-filter]');
      if (!el) return;
      var name = el.getAttribute('data-vr-filter');
      if (name === 'hideProcedural') _state.filters.hideProcedural = el.checked;
      else _state.filters[name] = el.value;
      applyFilters();
    });
  }

  // ── Public: shell rendered synchronously into the modal (hidden until data) ────
  window._renderVotingRecord = function (id, p) {
    injectStyles();
    // Register the pending hydrate job; _pdxInitVotingRecord picks it up post-render.
    window.__pdxVotingPending = { id: id, p: p };
    return '' +
      '<span id="pdxsec-voting" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<section id="pdx-voting-record" class="modal-section" style="display:none;">' +
        '<div class="modal-section-title">🗳️ Voting Record</div>' +
        '<p class="vr-sub">What they actually did — roll-call votes and official actions, each checked against what they say. Filter by issue, chamber, action, or date.</p>' +
        '<div id="pdx-vr-body"><div class="vr-loading">Loading voting record…</div></div>' +
      '</section>';
  };

  // Add a "Votes" pill to the profile jump-nav once we know there's a record,
  // then re-init the scroll-spy so it tracks the new anchor. Self-gating: no
  // record → no pill.
  function injectNavPill(count) {
    try {
      var track = document.querySelector('#pdx-profile-nav .pdx-pnav-track');
      if (!track || track.querySelector('[data-target="pdxsec-voting"]')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pdx-pnav-pill';
      btn.setAttribute('data-target', 'pdxsec-voting');
      btn.setAttribute('aria-label', 'Voting Record: ' + count + ' records');
      btn.onclick = function () { if (window._pdxNavJump) window._pdxNavJump('pdxsec-voting', btn); };
      btn.innerHTML = '<span class="pdx-pnav-ico" aria-hidden="true">🗳️</span>' +
        '<span class="pdx-pnav-txt"><span class="pdx-pnav-label">Votes</span>' +
        '<span class="pdx-pnav-val" style="color:#7fb4ff;">' + count + ' Record' + (count === 1 ? '' : 's') + '</span></span>';
      track.appendChild(btn);
      if (window._pdxInitProfileNav) window._pdxInitProfileNav();
    } catch (e) { /* nav is a nicety; never let it break the section */ }
  }

  // ── Public: hydrate after the modal HTML is in the DOM ─────────────────────────
  window._pdxInitVotingRecord = function () {
    var job = window.__pdxVotingPending;
    window.__pdxVotingPending = null;
    if (!job) return;
    var section = document.getElementById('pdx-voting-record');
    if (!section) return;

    var token = ++_openToken;
    // A caller (e.g. the Stance Library "View votes" action) can request the
    // section open pre-filtered to one issue. Captured now (sync) so a later open
    // can't clobber it, applied after the section reveals below.
    var initIssue = window.__pdxVotingInitialIssue || '';
    window.__pdxVotingInitialIssue = null;
    var positionMap = (window._polPositionMap ? window._polPositionMap(job.id, job.p) : {}) || {};
    _state = {
      id: job.id, p: job.p, positionMap: positionMap,
      filters: { issue: '', chamber: '', actionType: '', position: '', from: '', to: '', sort: '', hideProcedural: false },
      facets: { issues: [], chambers: [], actionTypes: [] },
      data: null, items: [], page: 1
    };

    // First load is unfiltered — it both reveals the section and seeds the facets.
    PDXVotingRecord.fetchMember(job.id, { pageSize: 100 }).then(function (data) {
      if (token !== _openToken || !_state) return; // another profile opened
      if (!data || !data.summary || (data.summary.totalRecords || 0) === 0) {
        // No record (or offline with nothing cached): stay hidden, add no pill.
        return;
      }
      _state.data = data;
      _state.items = (data.items || []).slice();
      // Warm the sync record cache so the Alignment Tool (and its consistency line)
      // can read this member's votes without its own fetch.
      PDXVotingRecord.noteMember(job.id, _state.items);

      // Build stable facets from this unfiltered set.
      var issues = {}, chambers = {}, actions = {};
      _state.items.forEach(function (it) {
        (it.issues || []).forEach(function (m) { if (m.issueKey) issues[m.issueKey] = true; });
        if (it.chamber) chambers[it.chamber] = true;
        if (it.kind === 'vote' && it.actionType) actions[it.actionType] = true;
      });
      _state.facets.issues = Object.keys(issues).sort(function (a, b) { return issueLabel(a).localeCompare(issueLabel(b)); });
      _state.facets.chambers = Object.keys(chambers).sort();
      _state.facets.actionTypes = Object.keys(actions).sort();

      section.style.display = '';
      renderBody();
      bindEvents(section);
      injectNavPill(data.summary.totalRecords || _state.items.length);

      // Deep-link: if a caller asked to land on a specific issue and this member
      // actually has a record on it, pre-filter and scroll the section into view,
      // and reflect the shareable ?p=<id>#pdxsec-voting?issue=<key> URL.
      if (initIssue && _state.facets.issues.indexOf(initIssue) !== -1) {
        _state.filters.issue = initIssue;
        applyFilters();
        try {
          history.replaceState(null, '', location.pathname + location.search +
            '#pdxsec-voting?issue=' + encodeURIComponent(initIssue));
        } catch (e) {}
      }
      if (initIssue) {
        try {
          if (window._pdxNavJump) window._pdxNavJump('pdxsec-voting');
          else section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {}
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 5 — shared hooks for the Comparison boards and the Alignment Tool
  // ═══════════════════════════════════════════════════════════════════════════

  // Per-(member, issue) record summary from whatever is warm in the sync cache.
  // Returns the Phase-2 engine summary (total/consistent/contradicts/netVerdict/…)
  // or null when there's no cached record for that member. Pure + synchronous.
  window._pdxRecordIssueSummary = function (pid, issueKey) {
    var recs = PDXVotingRecord.memberRecords(pid);
    if (!recs || !window._issueRecordSummary) return null;
    // Records on this issue only.
    var on = recs.filter(function (it) {
      return it && it.issues && it.issues.some(function (m) { return m.issueKey === issueKey; });
    });
    if (!on.length) return null;
    var cmp = window.CMP_DATA && window.CMP_DATA[pid];
    var pm = (window._polPositionMap && cmp) ? (window._polPositionMap(pid, cmp) || {}) : {};
    var stance = pm[issueKey] ? pm[issueKey].stance : null;
    return window._issueRecordSummary(issueKey, stance, on);
  };

  // Legacy-shape voting adapter for the Alignment Tool. Returns the member's votes
  // as [{ bill, matter, alignment }] — the EXACT shape the tool already consumes —
  // sourced from the new voting record when it's warm in cache, else falling back
  // verbatim to the old PROFILES[].sections voting_record so behaviour is unchanged
  // until the richer data arrives. Synchronous by design (see _records note above).
  //   alignment mapping (per the record's primary issue's effective support):
  //     supports the issue → 'kept'   (+1.0 in the tool)
  //     opposes  the issue → 'broken' (+0.15)
  //     no clear position  → 'partial'(+0.6)
  window._alignmentVotesAdapter = function (pid) {
    var recs = PDXVotingRecord.memberRecords(pid);
    if (recs && recs.length) {
      var out = [];
      recs.forEach(function (it) {
        var primary = (it.issues && it.issues[0]) || null;
        var alignment = 'partial';
        if (primary && window._voteEffectiveSupport) {
          var eff = window._voteEffectiveSupport(it, primary.supportMeaning);
          alignment = eff === true ? 'kept' : eff === false ? 'broken' : 'partial';
        }
        // Fold issue labels into `matter` so the tool's keyword matcher still lights
        // up the right issue, exactly as it did with the curated matter text.
        var labels = (it.issues || []).map(function (m) { return issueLabel(m.issueKey); }).join(' ');
        out.push({ bill: it.number || '', matter: ((it.title || '') + ' ' + labels).trim(), alignment: alignment });
      });
      return out;
    }
    // Fallback: the original curated source, untouched.
    var legacy = [];
    var profile = window.PROFILES && window.PROFILES[pid];
    if (profile && profile.sections) {
      profile.sections.forEach(function (sec) {
        if (sec.type === 'voting_record' && sec.votes) {
          sec.votes.forEach(function (v) { legacy.push({ bill: v.bill, matter: v.matter, alignment: v.alignment }); });
        }
      });
    }
    return legacy;
  };

  // Fill any [data-vrdot="pid|issueKey"] placeholders a comparison board emitted
  // with a small consistency dot (stance vs. actual votes). Batched: one /compare
  // call for all members in scope. Idempotent (marks filled nodes) and safe — a
  // failure or empty result just leaves the placeholders blank. `scope` optional.
  var _DOT = {
    consistent:  { ch: '✓', cls: 'vrdot-consistent', tip: 'Votes back up the stated stance' },
    contradicts: { ch: '⚠', cls: 'vrdot-contradicts', tip: 'Votes run against the stated stance' },
    mixed:       { ch: '~', cls: 'vrdot-mixed', tip: 'Mixed voting record on this issue' },
    record:      { ch: '•', cls: 'vrdot-record', tip: 'Has votes on record for this issue' }
  };
  window._pdxHydrateVoteDots = function (scope) {
    if (!window._issueRecordSummary) return;
    var root = scope || document;
    var nodes = root.querySelectorAll('[data-vrdot]:not([data-vrdone])');
    if (!nodes.length) return;
    var pids = {}, want = [];
    for (var i = 0; i < nodes.length; i++) {
      var parts = (nodes[i].getAttribute('data-vrdot') || '').split('|');
      if (parts.length !== 2 || !parts[0] || !parts[1]) { nodes[i].setAttribute('data-vrdone', '1'); continue; }
      pids[parts[0]] = true;
      want.push({ el: nodes[i], pid: parts[0], key: parts[1] });
    }
    var pidList = Object.keys(pids);
    if (!pidList.length) return;
    PDXVotingRecord.fetchCompare(pidList).then(function () {
      want.forEach(function (w) {
        w.el.setAttribute('data-vrdone', '1');
        var s = window._pdxRecordIssueSummary(w.pid, w.key);
        if (!s || !s.total) return; // no record → leave blank
        var meta = _DOT[s.netVerdict] || _DOT.record;
        w.el.className = (w.el.className ? w.el.className + ' ' : '') + 'vrdot ' + meta.cls;
        w.el.textContent = meta.ch;
        w.el.setAttribute('title', meta.tip + ' · ' + s.total + ' vote' + (s.total === 1 ? '' : 's') + ' on record');
      });
    });
  };

  // Inject the stylesheet at load so the comparison-board consistency dots are
  // styled even when a board renders before any profile has been opened.
  try { injectStyles(); } catch (e) {}
})();
